<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'
import type { StudyStage, Affiliation } from '~/stores/admin'

definePageMeta({ layout: 'admin' })

const { relativeTime } = useRelativeTime()

const adminStore = useAdminStore()
const stageFilter = ref<StudyStage | 'All'>('All')
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
  { label: 'Agreement', value: 'Agreement', count: adminStore.studies.filter(s => s.stage === 'Agreement' || s.stage === 'Awaiting Signature').length },
  { label: 'Processing', value: 'Processing', count: adminStore.studies.filter(s => s.stage === 'Processing').length },
  { label: 'Complete', value: 'Complete', count: adminStore.studies.filter(s => s.stage === 'Complete').length },
]

const affiliationFilters = ['All affiliations', 'Internal', 'External', 'Industry']

const stageClass = (stage: StudyStage) => {
  if (stage === 'Complete') return 'b-complete'
  if (stage === 'Processing') return 'b-processing'
  if (stage === 'Agreement' || stage === 'Awaiting Signature') return 'b-agreement'
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
    list = list.filter(s =>
      stageFilter.value === 'Agreement'
        ? (s.stage === 'Agreement' || s.stage === 'Awaiting Signature')
        : s.stage === stageFilter.value
    )
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
      <button class="btn btn-ghost btn-sm" @click="cycleSort">Sort: {{ sortLabels[sortBy] }}</button>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
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
                {{ study.budget.invoiced > 0 ? '$' + (study.budget.invoiced / 1000).toFixed(1) + 'K' : '—' }}
              </div>
              <div class="study-pi" style="font-size:0.7rem">
                {{ study.stage === 'Complete' ? 'final' : 'est. $' + (study.budget.committed / 1000).toFixed(0) + 'K' }}
              </div>
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
