<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'

definePageMeta({ layout: 'admin' })

const adminStore = useAdminStore()

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

const firstName = computed(() => adminStore.user.name.split(' ')[0].replace(/^Dr\.\s*/i, ''))

const today = computed(() =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
)

// KPIs
const activeStudiesCount = computed(() => adminStore.studies.length)
const pendingInquiriesCount = computed(() => adminStore.newInquiriesCount)
const newLeadsCount = computed(() => adminStore.inquiries.filter(i => i.status === 'Lead').length)
const awaitingSignatureStudiesCount = computed(() =>
  adminStore.studies.filter(s => s.agreements.some(a => a.status === 'Pending')).length,
)

// Studies by stage
const intakeReviewCount = computed(() =>
  adminStore.inquiries.filter(i => i.status === 'New').length,
)
const agreementsOutCount = computed(() =>
  adminStore.studies.filter(s => s.stage === 'Awaiting Signature').length,
)
const processingCount = computed(() => adminStore.studies.filter(s => s.stage === 'Processing').length)
const completeCount = computed(() => adminStore.studies.filter(s => s.stage === 'Complete').length)

// Alerts — studies with at least one pending agreement that has a sent date
const pendingSignatureStudies = computed(() =>
  adminStore.studies.filter(s => s.agreements.some(a => a.status === 'Pending' && a.sentDate)),
)

const activityPage = ref(0)
const ACTIVITY_PAGE_SIZE = 4

// Recent activity — inquiry submissions + study activity events, newest first
const recentActivity = computed(() => {
  const sessionEvents = adminStore.sessionEvents.map(e => ({
    ...e,
    studyName: '',
    studyAbbr: '',
    studyId: '',
    isInquiry: false,
  }))

  const inquiryEvents = adminStore.inquiries
    .filter(i => i.status !== 'Approved' && i.status !== 'Declined')
    .map(i => ({
      title: 'New intake submitted',
      date: i.submittedDate,
      studyName: i.studyName,
      studyAbbr: i.abbreviation || i.studyName,
      studyId: i.id,
      isInquiry: true,
      status: i.status,
    }))

  const studyEvents = adminStore.studies.flatMap(s =>
    s.activity.map(a => ({
      ...a,
      studyName: s.name,
      studyAbbr: s.abbreviation,
      studyId: s.id,
      isInquiry: false,
    })),
  )

  const combined = [...sessionEvents, ...inquiryEvents, ...studyEvents]
  return combined.sort((a, b) => {
    if (a.ts && b.ts) return b.ts - a.ts
    if (a.ts) return -1
    if (b.ts) return 1
    return 0
  })
})

const activityPageCount = computed(() => Math.ceil(recentActivity.value.length / ACTIVITY_PAGE_SIZE))
const pagedActivity = computed(() => {
  const start = activityPage.value * ACTIVITY_PAGE_SIZE
  return recentActivity.value.slice(start, start + ACTIVITY_PAGE_SIZE)
})
</script>

<template>
  <div>
    <div class="page-hd">
      <div>
        <h1>{{ greeting }}, {{ firstName }}.</h1>
        <div class="sub">{{ today }} · {{ activeStudiesCount }} active studies across the platform</div>
      </div>
      <div class="hd-actions">
        <button class="btn btn-secondary btn-sm" @click="adminStore.loadAll()">↻ Refresh</button>
        <NuxtLink to="/admin/inquiries" class="btn btn-primary btn-sm">
          Review {{ pendingInquiriesCount }} inquiries →
        </NuxtLink>
      </div>
    </div>

    <!-- KPI tiles -->
    <div class="kpi-grid">
      <div class="kpi-card" :class="{ warn: newLeadsCount > 0 }">
        <div class="kpi-lbl">New leads</div>
        <div class="kpi-val">{{ newLeadsCount }}</div>
        <div class="kpi-ctx">
          <NuxtLink to="/admin/inquiries?filter=Lead" class="alert-act" style="font-size:0.74rem; color:var(--penn-blue); font-weight:600; text-decoration:none;">Awaiting contact</NuxtLink>
        </div>
      </div>
      <div class="kpi-card" :class="{ warn: intakeReviewCount > 0 }">
        <div class="kpi-lbl">In review</div>
        <div class="kpi-val">{{ intakeReviewCount }}</div>
        <div class="kpi-ctx">
          <NuxtLink to="/admin/inquiries" class="alert-act" style="font-size:0.74rem; color:var(--penn-blue); font-weight:600; text-decoration:none;">Review queue</NuxtLink>
        </div>
      </div>
      <div class="kpi-card" :class="{ warn: awaitingSignatureStudiesCount > 0 }">
        <div class="kpi-lbl">Awaiting signature</div>
        <div class="kpi-val">{{ awaitingSignatureStudiesCount }}</div>
        <div class="kpi-ctx">
          <NuxtLink to="/admin/studies?stage=Awaiting%20Signature" class="alert-act" style="font-size:0.74rem; color:var(--penn-blue); font-weight:600; text-decoration:none;">Studies</NuxtLink>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Active studies</div>
        <div class="kpi-val">{{ activeStudiesCount }}</div>
        <div class="kpi-ctx">
          <NuxtLink to="/admin/studies" class="alert-act" style="font-size:0.74rem; color:var(--penn-blue); font-weight:600; text-decoration:none;">Across all pipeline stages</NuxtLink>
        </div>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="pendingSignatureStudies.length > 0 || pendingInquiriesCount > 0" class="alerts-strip">
      <div
        v-for="study in pendingSignatureStudies"
        :key="study.id"
        class="alert-row error"
      >
        <span class="adm-badge b-warn"><span class="dot" /> Awaiting Signature</span>
        <span><strong>{{ study.abbreviation }}</strong> — {{ study.agreements.filter(a => a.status === 'Pending').length }} agreement(s) pending PI signature.</span>
        <span class="alert-meta">{{ study.agreements.find(a => a.status === 'Pending')?.sentDate || '' }}</span>
        <NuxtLink :to="'/admin/studies/' + study.id" class="alert-act">Open study →</NuxtLink>
      </div>
      <div v-if="intakeReviewCount > 0" class="alert-row">
        <span class="adm-badge b-review"><span class="dot" /> Needs Action</span>
        <span>{{ intakeReviewCount }} intake {{ intakeReviewCount === 1 ? 'submission' : 'submissions' }} awaiting feasibility review.</span>
        <span class="alert-meta">today</span>
        <NuxtLink to="/admin/inquiries" class="alert-act">Open queue →</NuxtLink>
      </div>
      <div v-if="newLeadsCount > 0" class="alert-row">
        <span class="adm-badge b-lead"><span class="dot" /> New Lead</span>
        <span>{{ newLeadsCount }} new {{ newLeadsCount === 1 ? 'lead' : 'leads' }} awaiting contact.</span>
        <span class="alert-meta">today</span>
        <NuxtLink to="/admin/inquiries?filter=Lead" class="alert-act">Open queue →</NuxtLink>
      </div>
    </div>

    <!-- Two-column -->
    <div class="dash-cols">
      <!-- Recent activity -->
      <div class="panel">
        <div class="panel-head">
          <h3>Recent activity</h3>
          <span class="ctx">All studies</span>
        </div>
        <div class="panel-body">
          <div v-if="recentActivity.length === 0" style="padding:1.2rem; color:var(--muted); font-size:0.85rem;">
            No activity yet.
          </div>
          <div v-for="(item, i) in pagedActivity" :key="i" class="panel-row">
            <div>
              <div class="row-pri">{{ item.title }}</div>
              <div class="row-sec">{{ item.studyAbbr }}<template v-if="item.author"> · {{ item.author }}</template></div>
            </div>
            <div class="row-right">
              <span v-if="item.isInquiry" class="adm-badge b-review"><span class="dot" /> {{ item.status }}</span>
              <span class="row-when">{{ item.date }}</span>
            </div>
          </div>
        </div>
        <div v-if="activityPageCount > 1" class="pagination">
          <span>Page {{ activityPage + 1 }} of {{ activityPageCount }}</span>
          <div class="pag-controls">
            <button :disabled="activityPage === 0" @click="activityPage--">‹</button>
            <button class="active">{{ activityPage + 1 }}</button>
            <button :disabled="activityPage >= activityPageCount - 1" @click="activityPage++">›</button>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div style="display:flex; flex-direction:column; gap:1.2rem;">
        <div class="panel">
          <div class="panel-head"><h3>Studies by stage</h3></div>
          <div class="panel-body">
            <div class="panel-row">
              <div><div class="row-pri">Intake review</div><div class="row-sec">awaiting feasibility</div></div>
              <div class="row-right">
                <span class="mono" style="font-size:1.1rem; font-weight:500; color:var(--gold)">{{ intakeReviewCount }}</span>
              </div>
            </div>
            <div class="panel-row">
              <div><div class="row-pri">Agreements out</div><div class="row-sec">awaiting PI signature</div></div>
              <div class="row-right">
                <span class="mono" style="font-size:1.1rem; font-weight:500; color:var(--teal)">{{ agreementsOutCount }}</span>
              </div>
            </div>
            <div class="panel-row">
              <div><div class="row-pri">Active processing</div><div class="row-sec">samples being run</div></div>
              <div class="row-right">
                <span class="mono" style="font-size:1.1rem; font-weight:500; color:var(--accent)">{{ processingCount }}</span>
              </div>
            </div>
            <div class="panel-row">
              <div><div class="row-pri">Data delivery</div><div class="row-sec">on Pennsieve, complete</div></div>
              <div class="row-right">
                <span class="mono" style="font-size:1.1rem; font-weight:500; color:var(--green)">{{ completeCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
