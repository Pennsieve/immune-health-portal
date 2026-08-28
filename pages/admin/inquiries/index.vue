<script setup lang="ts">
import { useAdminStore, type Inquiry } from '~/stores/admin'

definePageMeta({ layout: 'admin' })

// True projected sample total from the cohort matrix (sample_schedule).
// Leads have no cohort yet — show a dash instead of "0 subj · 0 samples".
const scopeDisplay = (inquiry: Inquiry) => {
  const groups = inquiry.collectionGroups || []
  if (!groups.length && !inquiry.cohortSubjects) return '—'
  const total = groups.reduce(
    (sum, g) => sum + (Number(g.subjects) || 0)
      * Object.values(g.samples || {}).reduce((a, b) => a + (Number(b) || 0), 0),
    0,
  )
  return `${inquiry.cohortSubjects} subj · ${total.toLocaleString()} samples`
}

// Row title / subtitle — leads have no study name yet
const rowTitle = (inquiry: Inquiry) =>
  inquiry.studyName || `${inquiry.pi.name} (lead)`

const rowSubtitle = (inquiry: Inquiry) => {
  const lead = inquiry.leadDetails || {}
  const purpose = (lead.callPurpose as string) || (lead.researchSummary as string) || ''
  return purpose ? `${purpose.substring(0, 60)}${purpose.length > 60 ? '…' : ''}` : ''
}

const { relativeTime } = useRelativeTime()

const adminStore = useAdminStore()

// Allow deep-linking to a tab, e.g. /admin/inquiries?filter=Lead
const route = useRoute()
const FILTER_VALUES = ['Lead', 'Billing Sent', 'On Hold', 'New', 'Approved', 'Declined', 'All']

// Follow-up reminder for paused ('On Hold') leads. A lead whose follow-up date
// has arrived is flagged so it "pops back up" for the admin to act on.
const todayIso = new Date().toISOString().slice(0, 10)
const dueForFollowUp = (inquiry: Inquiry) =>
  inquiry.status === 'On Hold' && !!inquiry.holdUntil && inquiry.holdUntil <= todayIso
const formatHoldDate = (iso?: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const explicitFilter = typeof route.query.filter === 'string' && FILTER_VALUES.includes(route.query.filter)
  ? route.query.filter
  : null

const activeFilter = ref(explicitFilter ?? 'New')
const userPickedTab = ref(false)

function selectFilter(value: string) {
  userPickedTab.value = true
  activeFilter.value = value
}

// Without a deep link, open on the New leads tab when any leads are waiting
// (otherwise stay on In review). On a hard page load the store fills
// after mount, so re-derive the default once the data arrives — unless the
// user has already picked a tab themselves.
watch(
  () => adminStore.isInitialized,
  (ready) => {
    if (ready && !explicitFilter && !userPickedTab.value
      && adminStore.inquiries.some(i => i.status === 'Lead')) {
      activeFilter.value = 'Lead'
    }
  },
  { immediate: true },
)

const searchQuery = ref('')

// `value` is the underlying inquiry status; `label` is what the tab displays.
const filters = computed(() => [
  { value: 'Lead',        label: 'New leads',       count: adminStore.inquiries.filter(i => i.status === 'Lead').length },
  { value: 'Billing Sent', label: 'Billing sent',   count: adminStore.inquiries.filter(i => i.status === 'Billing Sent').length },
  { value: 'On Hold',     label: 'On hold',         count: adminStore.inquiries.filter(i => i.status === 'On Hold').length },
  { value: 'New',         label: 'In review',       count: adminStore.inquiries.filter(i => i.status === 'New').length },
  { value: 'Approved',    label: 'Approved',        count: adminStore.inquiries.filter(i => i.status === 'Approved').length },
  { value: 'Declined',    label: 'Declined',        count: adminStore.inquiries.filter(i => i.status === 'Declined').length },
  { value: 'All',         label: 'All',             count: adminStore.inquiries.length },
])

const affiliationLabel = (aff: string) => {
  if (aff === 'Internal') return 'b-internal'
  if (aff === 'External') return 'b-external'
  return 'b-industry'
}

const statusLabel = (status: string) => {
  if (status === 'Approved') return 'b-complete'
  if (status === 'Declined') return 'b-declined'
  if (status === 'Lead') return 'b-lead'
  if (status === 'Billing Sent') return 'b-agreement'
  if (status === 'On Hold') return 'b-hold'
  return 'b-review'
}

const statusText = (status: string) => {
  if (status === 'New') return 'In review'
  if (status === 'Lead') return 'New lead'
  if (status === 'Billing Sent') return 'Billing sent'
  if (status === 'On Hold') return 'On hold'
  return status
}

const displayedInquiries = computed(() => {
  let list = adminStore.inquiries
  if (activeFilter.value !== 'All') {
    list = list.filter(i => i.status === activeFilter.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(i =>
      (i.studyName || '').toLowerCase().includes(q) ||
      i.pi.name.toLowerCase().includes(q) ||
      (i.irb || '').toLowerCase().includes(q),
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
        <div class="sub">Leads from the public inquiry form and full intake submissions. Talk with the lead, send the full intake form, review feasibility, then approve to begin the agreement package.</div>
      </div>
    </div>

    <div class="toolbar">
      <div class="chip-group">
        <button
          v-for="f in filters"
          :key="f.value"
          class="chip"
          :class="{ active: activeFilter === f.value }"
          @click="selectFilter(f.value)"
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
            <th>Study / Lead</th>
            <th>Contact</th>
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
              <div class="study-name">{{ rowTitle(inquiry) }}</div>
              <div class="study-pi">{{ rowSubtitle(inquiry) }}</div>
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
                <span class="dot" /> {{ statusText(inquiry.status) }}
              </span>
              <div v-if="inquiry.status === 'On Hold' && inquiry.holdUntil" class="follow-up" :class="{ due: dueForFollowUp(inquiry) }">
                {{ dueForFollowUp(inquiry) ? 'Follow-up due' : 'Follow up' }} {{ formatHoldDate(inquiry.holdUntil) }}
              </div>
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

<style scoped lang="scss">
.follow-up {
  margin-top: 0.3rem;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--muted);

  &.due { color: var(--warm); font-weight: 700; }
}
</style>
