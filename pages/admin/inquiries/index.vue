<script setup lang="ts">
import { useAdminStore, type Inquiry } from '~/stores/admin'

definePageMeta({ layout: 'admin' })

// True projected sample total from the cohort matrix (sample_schedule).
const scopeDisplay = (inquiry: Inquiry) => {
  const groups = inquiry.collectionGroups || []
  const total = groups.reduce(
    (sum, g) => sum + (Number(g.subjects) || 0)
      * Object.values(g.samples || {}).reduce((a, b) => a + (Number(b) || 0), 0),
    0,
  )
  return `${inquiry.cohortSubjects} subj · ${total.toLocaleString()} samples`
}

const { relativeTime } = useRelativeTime()

const adminStore = useAdminStore()
const activeFilter = ref('New')
const searchQuery = ref('')

// `value` is the underlying inquiry status; `label` is what the tab displays.
const filters = computed(() => [
  { value: 'New',      label: 'Awaiting review', count: adminStore.inquiries.filter(i => i.status === 'New').length },
  { value: 'Approved', label: 'Approved',        count: adminStore.inquiries.filter(i => i.status === 'Approved').length },
  { value: 'Declined', label: 'Declined',        count: adminStore.inquiries.filter(i => i.status === 'Declined').length },
  { value: 'All',      label: 'All',             count: adminStore.inquiries.length },
])

const affiliationLabel = (aff: string) => {
  if (aff === 'Internal') return 'b-internal'
  if (aff === 'External') return 'b-external'
  return 'b-industry'
}

const statusLabel = (status: string) => {
  if (status === 'Approved') return 'b-complete'
  if (status === 'Declined') return 'b-declined'
  return 'b-review'
}

const displayedInquiries = computed(() => {
  let list = adminStore.inquiries
  if (activeFilter.value !== 'All') {
    list = list.filter(i => i.status === activeFilter.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(i =>
      i.studyName.toLowerCase().includes(q) ||
      i.pi.name.toLowerCase().includes(q) ||
      i.irb.toLowerCase().includes(q),
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
    </div>

    <div class="toolbar">
      <div class="chip-group">
        <button
          v-for="f in filters"
          :key="f.value"
          class="chip"
          :class="{ active: activeFilter === f.value }"
          @click="activeFilter = f.value"
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
              <div class="study-pi">
                {{ relativeTime(inquiry.createdAt) }}
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
              {{ scopeDisplay(inquiry) }}
            </td>
            <td style="font-size:0.78rem; color:var(--muted)">{{ inquiry.services }}</td>
            <td>
              <span class="adm-badge" :class="statusLabel(inquiry.status)">
                <span class="dot" /> {{ inquiry.status === 'New' ? 'Awaiting review' : inquiry.status }}
              </span>
            </td>
            <td style="text-align:right">
              <span class="mono" style="color:var(--muted)">→</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <span>Showing {{ displayedInquiries.length }} of {{ adminStore.inquiries.length }} inquiries</span>
        <div class="pag-controls">
          <button>‹</button>
          <button class="active">1</button>
          <button>›</button>
        </div>
      </div>
    </div>
  </div>
</template>
