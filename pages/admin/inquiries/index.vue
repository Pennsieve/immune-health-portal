<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'

definePageMeta({ layout: 'admin' })

const adminStore = useAdminStore()
const activeFilter = ref('New')
const searchQuery = ref('')

const filters = [
  { label: 'New', count: 4 },
  { label: 'In Review', count: 2 },
  { label: 'Approved', count: 8 },
  { label: 'Declined', count: 1 },
  { label: 'All', count: 15 },
]

const affiliationLabel = (aff: string) => {
  if (aff === 'Internal') return 'b-internal'
  if (aff === 'External') return 'b-external'
  return 'b-industry'
}

const statusLabel = (status: string) => {
  if (status === 'Stale') return 'b-warn'
  return 'b-review'
}

const displayedInquiries = computed(() => {
  let list = adminStore.inquiries
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(i =>
      i.studyName.toLowerCase().includes(q) ||
      i.pi.name.toLowerCase().includes(q) ||
      i.irb.toLowerCase().includes(q)
    )
  }
  return list
})
</script>

<template>
  <div>
    <div class="page-hd">
      <div>
        <h1>Intake inquiries</h1>
        <div class="sub">New study requests submitted via the public intake form. Review feasibility, then approve to begin the agreement package.</div>
      </div>
      <div class="hd-actions">
        <button class="btn btn-secondary btn-sm">Export CSV</button>
      </div>
    </div>

    <div class="toolbar">
      <div class="chip-group">
        <button
          v-for="f in filters"
          :key="f.label"
          class="chip"
          :class="{ active: activeFilter === f.label }"
          @click="activeFilter = f.label"
        >
          {{ f.label }} <span class="chip-count">{{ f.count }}</span>
        </button>
      </div>
      <div class="toolbar-search">
        <input v-model="searchQuery" type="search" placeholder="Search by PI, study, or IRB…">
      </div>
      <div class="toolbar-spacer" />
      <button class="btn btn-ghost btn-sm">Sort: Newest ↓</button>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Study</th>
            <th>Principal Investigator</th>
            <th>Affiliation</th>
            <th>Scope</th>
            <th>Services requested</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="inquiry in displayedInquiries"
            :key="inquiry.id"
            @click="navigateTo('/admin/inquiries/' + inquiry.id)"
          >
            <td>
              <div class="mono" style="font-size:0.78rem">{{ inquiry.submittedDate }}</div>
              <div class="study-pi" :style="inquiry.isStale ? 'color:var(--warm)' : ''">
                {{ inquiry.submittedRelative }}
              </div>
            </td>
            <td>
              <div class="study-name">{{ inquiry.studyName }}</div>
              <div class="study-pi">{{ inquiry.objectives.substring(0, 50) }}… · IRB {{ inquiry.irb }}</div>
            </td>
            <td>
              <div>{{ inquiry.pi.name }}</div>
              <div class="study-pi">{{ inquiry.pi.email }}</div>
            </td>
            <td>
              <span class="adm-badge" :class="affiliationLabel(inquiry.affiliation)">
                <span class="dot" /> {{ inquiry.affiliation }}
              </span>
            </td>
            <td class="mono" style="font-size:0.82rem">
              {{ inquiry.cohortSubjects }} × {{ inquiry.cohortTimepoints }} = {{ inquiry.cohortSubjects * inquiry.cohortTimepoints }}
            </td>
            <td style="font-size:0.78rem; color:var(--muted)">{{ inquiry.services }}</td>
            <td>
              <span class="adm-badge" :class="statusLabel(inquiry.status)">
                <span class="dot" /> {{ inquiry.status === 'New' ? 'Awaiting Review' : inquiry.status }}
              </span>
            </td>
            <td style="text-align:right">
              <span class="mono" style="color:var(--muted)">→</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <span>Showing {{ displayedInquiries.length }} of {{ displayedInquiries.length }} new inquiries</span>
        <div class="pag-controls">
          <button>‹</button>
          <button class="active">1</button>
          <button>›</button>
        </div>
      </div>
    </div>
  </div>
</template>
