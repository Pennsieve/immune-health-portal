<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'
import type { StudyStage, Affiliation } from '~/stores/admin'
import { toCsv, downloadCsv } from '~/utils/csv'

definePageMeta({ layout: 'admin' })

const { relativeTime } = useRelativeTime()

const adminStore = useAdminStore()

// Allow deep-linking to a stage tab, e.g. /admin/studies?stage=Processing
const route = useRoute()
const STAGE_TAB_VALUES = ['All', 'Awaiting Signature', 'Processing', 'Complete']
const stageFilter = ref<StudyStage | 'All'>(
  typeof route.query.stage === 'string' && STAGE_TAB_VALUES.includes(route.query.stage)
    ? route.query.stage as StudyStage | 'All'
    : 'All',
)
const affiliationFilter = ref<Affiliation | 'All affiliations'>('All affiliations')
const searchQuery = ref('')

type SortOption = 'updated-desc' | 'updated-asc' | 'name-asc' | 'name-desc'
const sortBy = ref<SortOption>('updated-desc')
const sortCycle: SortOption[] = ['updated-desc', 'updated-asc', 'name-asc', 'name-desc']
const sortLabels: Record<SortOption, string> = {
  'updated-desc': 'Updated ↓',
  'updated-asc':  'Updated ↑',
  'name-asc':     'Name A→Z',
  'name-desc':    'Name Z→A',
}
function cycleSort() {
  const idx = sortCycle.indexOf(sortBy.value)
  sortBy.value = sortCycle[(idx + 1) % sortCycle.length]
}

const stageFilters: Array<{ label: string; value: StudyStage | 'All'; count: number }> = [
  { label: 'All', value: 'All', count: adminStore.studies.length },
  { label: 'Awaiting Signature', value: 'Awaiting Signature', count: adminStore.studies.filter(s => s.stage === 'Awaiting Signature').length },
  { label: 'Processing', value: 'Processing', count: adminStore.studies.filter(s => s.stage === 'Processing').length },
  { label: 'Complete', value: 'Complete', count: adminStore.studies.filter(s => s.stage === 'Complete').length },
]

const affiliationFilters = ['All affiliations', 'Internal', 'External', 'Industry']

const stageClass = (stage: StudyStage) => {
  if (stage === 'Complete') return 'b-complete'
  if (stage === 'Processing') return 'b-processing'
  if (stage === 'Awaiting Signature') return 'b-agreement'
  return 'b-review'
}

const affiliationClass = (aff: Affiliation) => {
  if (aff === 'Internal') return 'b-internal'
  if (aff === 'External') return 'b-external'
  return 'b-industry'
}

const displayedStudies = computed(() => {
  let list = adminStore.studies
  if (stageFilter.value !== 'All') {
    list = list.filter(s => s.stage === stageFilter.value)
  }
  if (affiliationFilter.value !== 'All affiliations') {
    list = list.filter(s => s.affiliation === affiliationFilter.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.pi.name.toLowerCase().includes(q) ||
      s.irb.toLowerCase().includes(q)
    )
  }
  list = [...list]
  if (sortBy.value === 'updated-desc') list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  else if (sortBy.value === 'updated-asc') list.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
  else if (sortBy.value === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name))
  else if (sortBy.value === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name))
  return list
})

const signedCount = (study: typeof adminStore.studies[0]) =>
  study.agreements.filter(a => a.status === 'Signed').length

// Estimated total (rate × planned) — computed live rather than tracked,
// since there's no real invoicing system behind this app.
const estimatedBudget = (study: typeof adminStore.studies[0]) =>
  study.budget.lines.reduce((sum, l) => sum + l.rate * l.planned, 0)

// Bulk billing export — selection is independent of the current filters, so
// a study picked before narrowing the list stays selected.
const selectedIds = ref<Set<string>>(new Set())

const allDisplayedSelected = computed(() =>
  displayedStudies.value.length > 0 && displayedStudies.value.every(s => selectedIds.value.has(s.id)),
)
const someDisplayedSelected = computed(() =>
  displayedStudies.value.some(s => selectedIds.value.has(s.id)),
)

function toggleRow(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleSelectAllDisplayed() {
  const next = new Set(selectedIds.value)
  if (allDisplayedSelected.value) {
    displayedStudies.value.forEach(s => next.delete(s.id))
  }
  else {
    displayedStudies.value.forEach(s => next.add(s.id))
  }
  selectedIds.value = next
}

// v-bind can't set the indeterminate DOM property directly, so it's applied
// via a ref callback whenever the header checkbox (re)renders.
function setHeaderCheckboxState(el: unknown) {
  if (el instanceof HTMLInputElement) {
    el.indeterminate = someDisplayedSelected.value && !allDisplayedSelected.value
  }
}

const CSV_HEADERS = [
  'Study', 'Abbreviation', 'PI Name', 'PI Email', 'IRB', 'Affiliation', 'Stage',
  'Account Code', 'Funding Source', 'BA Name', 'BA Email', 'Contracting Contact', 'Estimated Total',
]

function exportSelectedCsv() {
  const selected = adminStore.studies
    .filter(s => selectedIds.value.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const rows = selected.map(s => [
    s.name,
    s.abbreviation,
    s.pi.name,
    s.pi.email,
    s.irb,
    s.affiliation,
    s.stage,
    s.budget.accountCode ?? '',
    s.budget.fundingName ?? '',
    s.budget.baName ?? '',
    s.budget.baEmail ?? '',
    s.budget.contractingContact ?? '',
    estimatedBudget(s).toFixed(2),
  ])

  const csv = toCsv(CSV_HEADERS, rows)
  const today = new Date().toISOString().slice(0, 10)
  downloadCsv(`billing-export-${today}.csv`, csv)
}
</script>

<template>
  <div>
    <div class="page-hd">
      <div>
        <h1>Studies</h1>
        <div class="sub">All active and historical studies. Click a row to open its lifecycle.</div>
      </div>
    </div>

    <div class="toolbar">
      <div class="chip-group">
        <button
          v-for="f in stageFilters"
          :key="f.value"
          class="chip"
          :class="{ active: stageFilter === f.value }"
          @click="stageFilter = f.value"
        >
          {{ f.label }} <span class="chip-count">{{ f.count }}</span>
        </button>
      </div>
      <div class="chip-group">
        <button
          v-for="aff in affiliationFilters"
          :key="aff"
          class="chip"
          :class="{ active: affiliationFilter === aff }"
          @click="affiliationFilter = aff as Affiliation | 'All affiliations'"
        >
          {{ aff }}
        </button>
      </div>
      <div class="toolbar-search">
        <input v-model="searchQuery" type="search" placeholder="Search study, PI, IRB…">
      </div>
      <div class="toolbar-spacer" />
      <button
        class="btn btn-secondary btn-sm"
        :disabled="selectedIds.size === 0"
        :title="selectedIds.size === 0 ? 'Select one or more studies to export' : ''"
        @click="exportSelectedCsv"
      >
        Export billing CSV{{ selectedIds.size > 0 ? ` (${selectedIds.size})` : '' }}
      </button>
      <button class="btn btn-ghost btn-sm" @click="cycleSort">Sort: {{ sortLabels[sortBy] }}</button>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-check">
              <input
                :ref="setHeaderCheckboxState"
                type="checkbox"
                :checked="allDisplayedSelected"
                :disabled="displayedStudies.length === 0"
                @click.stop="toggleSelectAllDisplayed"
              >
            </th>
            <th>Study</th>
            <th>PI</th>
            <th>Affil.</th>
            <th>IRB</th>
            <th>Stage</th>
            <th>Agreements</th>
            <th>Cohort progress</th>
            <th>Budget</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="study in displayedStudies"
            :key="study.id"
            @click="navigateTo('/admin/studies/' + study.id)"
          >
            <td class="col-check" @click.stop>
              <input
                type="checkbox"
                :checked="selectedIds.has(study.id)"
                @click.stop="toggleRow(study.id)"
              >
            </td>
            <td>
              <div class="study-name">{{ study.name }}</div>
              <div class="study-pi">{{ study.abbreviation }} · IRB {{ study.irb }}</div>
            </td>
            <td>
              <div>{{ study.pi.name }}</div>
              <div class="study-pi mono" style="font-size:0.7rem">{{ study.pi.email.split('@')[0] }}@…</div>
            </td>
            <td>
              <span class="adm-badge" :class="affiliationClass(study.affiliation)">{{ study.affiliation }}</span>
            </td>
            <td class="mono" style="font-size:0.78rem">{{ study.irb }}</td>
            <td>
              <span class="adm-badge" :class="stageClass(study.stage)">
                <span class="dot" /> {{ study.stage }}
              </span>
            </td>
            <td>
              <div class="cell-progress">
                <div class="prog-bar" :class="signedCount(study) < study.agreements.length ? 'gold' : ''">
                  <div :style="{ width: (signedCount(study) / study.agreements.length * 100) + '%' }" />
                </div>
                <div class="prog-frac" :style="study.isLocked ? 'color:var(--warm)' : ''">
                  {{ study.isLocked ? 'locked' : signedCount(study) + '/' + study.agreements.length }}
                </div>
              </div>
            </td>
            <td>
              <div class="cell-progress">
                <div class="prog-bar" :class="study.cohort.processedSamples === 0 ? 'accent' : ''">
                  <div :style="{ width: (study.cohort.processedSamples / study.cohort.totalSamples * 100) + '%' }" />
                </div>
                <div class="prog-frac">{{ study.cohort.processedSamples }}/{{ study.cohort.totalSamples }}</div>
              </div>
            </td>
            <td>
              <div class="mono" style="font-size:0.82rem">
                {{ estimatedBudget(study) > 0 ? '$' + (estimatedBudget(study) / 1000).toFixed(1) + 'K' : '—' }}
              </div>
              <div class="study-pi" style="font-size:0.7rem">est.</div>
            </td>
            <td class="mono" style="font-size:0.78rem; color:var(--muted)">{{ relativeTime(study.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <span>Showing {{ displayedStudies.length }} of {{ adminStore.studies.length }} studies</span>
        <div class="pag-controls">
          <button>‹</button>
          <button class="active">1</button>
          <button>›</button>
        </div>
      </div>
    </div>
  </div>
</template>
