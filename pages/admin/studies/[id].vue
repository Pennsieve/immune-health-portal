<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const adminStore = useAdminStore()

const study = computed(() => adminStore.studies.find(s => s.id === route.params.id))

if (!study.value) {
  navigateTo('/admin/studies')
}

const activeTab = ref('overview')

const signedCount = computed(() =>
  study.value ? study.value.agreements.filter(a => a.status === 'Signed').length : 0
)

function openAgreementsTab() {
  activeTab.value = 'agreements'
}

const sendingLink = ref<string | null>(null)
const sentLink = ref<Set<string>>(new Set())

async function sendSignLink(studyId: string, agreementId: string) {
  const key = `${studyId}-${agreementId}`
  sendingLink.value = key
  try {
    await $fetch('/api/admin/send-sign-link', {
      method: 'POST',
      body: { studyId, agreementId },
    })
    sentLink.value = new Set([...sentLink.value, key])
  }
  catch {
    alert('Failed to send signing link. Please try again.')
  }
  finally {
    sendingLink.value = null
  }
}

const stageClass = computed(() => {
  if (!study.value) return ''
  if (study.value.stage === 'Complete') return 'b-complete'
  if (study.value.stage === 'Processing') return 'b-processing'
  if (study.value.stage === 'Awaiting Signature' || study.value.stage === 'Agreement') return 'b-agreement'
  return 'b-review'
})

const affiliationClass = computed(() => {
  if (!study.value) return ''
  if (study.value.affiliation === 'Internal') return 'b-internal'
  if (study.value.affiliation === 'External') return 'b-external'
  return 'b-industry'
})
</script>

<template>
  <div v-if="study">
    <div class="crumbs">
      <NuxtLink to="/admin/studies" class="crumb-link">Studies</NuxtLink>
      <span class="sep">›</span>
      <span>{{ study.name }}</span>
    </div>

    <!-- Hero -->
    <div class="detail-hero">
      <div>
        <h2>
          {{ study.name }}
          <span class="acronym">{{ study.abbreviation }}</span>
          <span class="adm-badge" :class="affiliationClass">
            <span class="dot" /> Penn {{ study.affiliation }}
          </span>
          <span class="adm-badge" :class="stageClass">
            <span class="dot" /> {{ study.stage }}
          </span>
        </h2>
        <div class="pi-line">
          <strong>{{ study.pi.name }}</strong> · {{ study.affiliationOrg }} ·
          <span class="mono">{{ study.pi.email }}</span>
        </div>
        <div class="meta-strip">
          <div v-if="study.studyLead" class="meta-item">
            <span class="meta-label">Study lead</span>
            <span class="meta-val">{{ study.studyLead.name }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">IRB</span>
            <span class="meta-val">{{ study.irb }}</span>
          </div>
          <div v-if="study.startedDate" class="meta-item">
            <span class="meta-label">Started</span>
            <span class="meta-val">{{ study.startedDate }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Cohort</span>
            <span class="meta-val">{{ study.cohort.subjects }} × {{ study.cohort.timepoints }} = {{ study.cohort.totalSamples }} samples</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Sample type</span>
            <span class="meta-val">{{ study.cohort.sampleType }}</span>
          </div>
        </div>
      </div>
      <div class="hero-actions">
        <template v-if="study.isLocked">
          <div class="status-strip">
            <span class="dot" />
            <span class="txt">Agreements pending · {{ study.agreements.filter(a => a.status === 'Pending').length }} outstanding</span>
          </div>
          <button class="btn btn-secondary btn-sm">Resend agreement reminder</button>
        </template>
        <button class="btn btn-ghost btn-sm">Edit study record</button>
      </div>
    </div>

    <!-- Locked banner -->
    <div v-if="study.isLocked" class="locked-banner">
      <div class="lock-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div class="lock-body">
        <h4>Sample processing locked until all agreements are signed</h4>
        <p>
          <span class="frac">{{ signedCount }} of {{ study.agreements.length }}</span>
          agreements countersigned. The
          {{ study.agreements.find(a => a.status === 'Pending')?.name }}
          is still awaiting Dr. {{ study.pi.name.replace('Dr. ', '') }}'s signature.
          Study activation, sample drop-off, and processing are blocked until then.
        </p>
      </div>
      <div class="lock-actions">
        <button class="btn btn-secondary btn-sm">Resend reminder</button>
        <button class="btn btn-primary btn-sm" @click="openAgreementsTab">Open agreements →</button>
      </div>
    </div>

    <!-- Lifecycle -->
    <div class="lifecycle-section">
      <h3>Lifecycle</h3>
      <div class="sub">From intake to data delivery — every step time-stamped by the platform.</div>
      <div class="life-timeline">
        <div
          v-for="step in study.lifecycle"
          :key="step.label"
          class="life-step"
          :class="step.status"
        >
          <div class="life-dot" />
          <div class="life-label">{{ step.label }}</div>
          <div class="life-when">{{ step.date }}</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">Overview</button>
      <button class="tab-btn" :class="{ active: activeTab === 'agreements' }" @click="activeTab = 'agreements'">
        Agreements
        <span class="tab-count">{{ signedCount }}/{{ study.agreements.length }}</span>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'cohort' }" @click="activeTab = 'cohort'">
        Cohort &amp; samples
        <span v-if="study.isLocked" class="tab-count" style="background:rgba(183,149,11,0.12); color:var(--gold)">Locked</span>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'budget' }" @click="activeTab = 'budget'">Budget</button>
      <button class="tab-btn" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">Notes &amp; activity</button>
    </div>

    <!-- OVERVIEW -->
    <div v-if="activeTab === 'overview'" class="dt-grid">
      <div class="panel">
        <div class="panel-head"><h3>Study summary</h3></div>
        <div class="study-info-grid">
          <div class="info-lbl">Objectives</div>
          <div>{{ study.objectives }}</div>

          <div class="info-lbl">PI / Lead</div>
          <div>
            {{ study.pi.name }} (PI)
            <template v-if="study.studyLead"> · {{ study.studyLead.name }} (lead) · <span class="mono">{{ study.studyLead.email }}</span></template>
          </div>

          <div v-if="study.department" class="info-lbl">Department</div>
          <div v-if="study.department">{{ study.department }}</div>

          <div v-if="study.phlebotomy" class="info-lbl">Phlebotomy</div>
          <div v-if="study.phlebotomy">{{ study.phlebotomy }}</div>

          <div v-if="study.metadata" class="info-lbl">Metadata</div>
          <div v-if="study.metadata">{{ study.metadata }}</div>

          <div class="info-lbl">Services</div>
          <div>
            <div v-for="line in study.budget.lines" :key="line.service">
              {{ line.service }} · <span class="mono">${{ line.rate }} × {{ line.planned }}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="panel" style="margin-bottom:1.2rem;">
          <div class="panel-head"><h3>Integrations</h3></div>
          <div class="integ-grid">
            <div v-if="study.integrations.redcap" class="integ-card linked">
              <div class="integ-head">REDCap <span style="color:var(--green)">●</span></div>
              <div class="integ-val">{{ study.integrations.redcap }}</div>
              <button class="integ-act">Open project →</button>
            </div>
            <div v-if="study.integrations.labvantage" class="integ-card linked">
              <div class="integ-head">LabVantage <span style="color:var(--green)">●</span></div>
              <div class="integ-val">{{ study.integrations.labvantage }}</div>
              <button class="integ-act">View samples →</button>
            </div>
            <div v-if="study.integrations.pennsieve" class="integ-card linked">
              <div class="integ-head">Pennsieve <span style="color:var(--green)">●</span></div>
              <div class="integ-val" style="font-size:0.72rem">{{ study.integrations.pennsieve }}</div>
              <button class="integ-act">Open dataset →</button>
            </div>
            <div v-if="!study.integrations.labvantage" class="integ-card pending">
              <div class="integ-head">LabVantage <span style="color:var(--gold)">●</span></div>
              <div class="integ-val" style="color:var(--muted)">Not yet assigned</div>
            </div>
            <div v-if="!study.integrations.pennsieve" class="integ-card pending">
              <div class="integ-head">Pennsieve <span style="color:var(--gold)">●</span></div>
              <div class="integ-val" style="color:var(--muted)">Not yet provisioned</div>
            </div>
          </div>
        </div>

        <div v-if="study.quickStats" class="panel">
          <div class="panel-head"><h3>Quick stats</h3></div>
          <div class="quick-stats">
            <div class="qs-card">
              <div class="qs-lbl">Samples received</div>
              <div class="qs-val" style="color:var(--green)">{{ study.quickStats.samplesReceived }} / {{ study.quickStats.samplesTotal }}</div>
            </div>
            <div class="qs-card">
              <div class="qs-lbl">CyTOF acquired</div>
              <div class="qs-val" style="color:var(--gold)">{{ study.quickStats.cytofAcquired }} / {{ study.quickStats.cytofTotal }}</div>
            </div>
            <div class="qs-card">
              <div class="qs-lbl">QC passed</div>
              <div class="qs-val" style="color:var(--accent)">{{ study.quickStats.qcPassed }} / {{ study.quickStats.qcTotal }}</div>
            </div>
            <div class="qs-card">
              <div class="qs-lbl">Invoiced YTD</div>
              <div class="qs-val" style="color:var(--warm)">${{ study.quickStats.invoicedYtd.toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AGREEMENTS -->
    <div v-if="activeTab === 'agreements'">
      <div class="panel">
        <div class="panel-head">
          <h3>Agreement package</h3>
          <span class="ctx">{{ signedCount }} of {{ study.agreements.length }} signed · secured link via email</span>
        </div>

        <div v-for="agreement in study.agreements" :key="agreement.id" class="agree-item" :class="{ 'pending-bg': agreement.status === 'Pending' }">
          <div class="agree-check" :class="agreement.status === 'Signed' ? 'signed' : 'pending'">
            {{ agreement.status === 'Signed' ? '✓' : '!' }}
          </div>
          <div>
            <div class="agree-name">{{ agreement.name }}</div>
            <div class="agree-desc">{{ agreement.description }}</div>
          </div>

          <template v-if="agreement.status === 'Signed'">
            <div class="sig-stamp">
              <div class="sig-name">{{ agreement.signedBy }}</div>
              <div class="sig-meta">Digitally signed {{ agreement.signedDate }}</div>
              <div class="sig-verified">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                Verified: {{ agreement.signedBy }} ({{ agreement.signedEmail }})
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" @click="alert('Opens signed PDF in Pennsieve')">View document</button>
          </template>

          <template v-else>
            <div class="sig-pending">
              <span class="sig-pend-ttl">⌛ Awaiting PI signature</span>
              <span class="sig-pend-sub">Secure sign link sent {{ agreement.sentDate }}<template v-if="agreement.reminderDate"> · reminder {{ agreement.reminderDate }}</template></span>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.4rem; align-items:flex-end;">
              <NuxtLink :to="'/admin/sign/' + study.id + '-' + agreement.id" class="btn btn-primary btn-sm">
                Preview PI sign view →
              </NuxtLink>
              <button
                class="btn btn-ghost btn-sm"
                :disabled="sendingLink === study.id + '-' + agreement.id"
                @click="sendSignLink(study.id, agreement.id)"
              >
                {{ sentLink.has(study.id + '-' + agreement.id) ? '✓ Link sent' : sendingLink === study.id + '-' + agreement.id ? 'Sending…' : 'Resend secure link' }}
              </button>
            </div>
          </template>
        </div>

        <div class="panel-foot">
          <span class="ctx">Signatures captured via secure email link · stored to Pennsieve</span>
          <div style="display:flex; gap:0.5rem">
            <button class="btn btn-secondary btn-sm">Download package</button>
            <button class="btn btn-ghost btn-sm">Mark signed manually</button>
          </div>
        </div>
      </div>

      <!-- Document history -->
      <div class="panel" style="margin-top:1.2rem;">
        <div class="panel-head"><h3>Document history</h3></div>
        <div class="activity-timeline">
          <div v-for="(item, i) in study.activity.slice(0, 5)" :key="i" class="t-item">
            <div class="t-dot" :class="item.dotClass" />
            <div class="t-body">
              <div class="t-title">{{ item.title }}</div>
              <div class="t-meta">{{ item.date }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- COHORT -->
    <div v-if="activeTab === 'cohort'">
      <div v-if="study.isLocked" class="locked-empty">
        <div class="ico-big">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3>Cohort &amp; sample tracking unlocks at activation</h3>
        <p>
          Sample drop-off, processing events, QC, and the per-sample table all become available
          once the full agreement package is countersigned and a LabVantage study ID is assigned.
          <strong style="color:var(--ink)">{{ signedCount }} of {{ study.agreements.length }} agreements</strong> are complete.
        </p>
        <div style="display:flex; gap:0.6rem; justify-content:center;">
          <button class="btn btn-secondary btn-sm" @click="activeTab = 'agreements'">Open agreements</button>
          <NuxtLink :to="'/admin/sign/' + study.id + '-psa'" class="btn btn-primary btn-sm">
            Preview PI sign view →
          </NuxtLink>
        </div>

        <div style="margin-top:1.8rem; padding-top:1.4rem; border-top:1px solid rgba(0,0,0,0.06); max-width:520px; margin-left:auto; margin-right:auto;">
          <div style="font-size:0.66rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600; margin-bottom:0.6rem">Planned scope at activation</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; text-align:left;">
            <div style="padding:0.7rem 0.9rem; background:var(--cream); border-radius:var(--radius);">
              <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600">Subjects</div>
              <div class="mono" style="font-size:1.1rem; font-weight:500">{{ study.cohort.subjects }}</div>
            </div>
            <div style="padding:0.7rem 0.9rem; background:var(--cream); border-radius:var(--radius);">
              <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600">Timepoints / subject</div>
              <div class="mono" style="font-size:1.1rem; font-weight:500">{{ study.cohort.timepoints }}</div>
            </div>
            <div style="padding:0.7rem 0.9rem; background:var(--cream); border-radius:var(--radius);">
              <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600">Total samples</div>
              <div class="mono" style="font-size:1.1rem; font-weight:500">{{ study.cohort.totalSamples }}</div>
            </div>
            <div style="padding:0.7rem 0.9rem; background:var(--cream); border-radius:var(--radius);">
              <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600">Sample type</div>
              <div style="font-size:0.88rem; font-weight:500">{{ study.cohort.sampleType }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="panel">
        <div class="panel-head">
          <h3>Cohort progress</h3>
          <span class="ctx">{{ study.cohort.processedSamples }} / {{ study.cohort.totalSamples }} samples processed</span>
        </div>
        <div style="padding:1.4rem; text-align:center; color:var(--muted); font-size:0.88rem; font-weight:300">
          Full per-sample table and processing events will appear here once samples begin arriving.<br>
          <strong style="color:var(--ink)">Phase 1 placeholder</strong> — build out with LabVantage integration.
        </div>
      </div>
    </div>

    <!-- BUDGET -->
    <div v-if="activeTab === 'budget'">
      <div class="panel">
        <div class="panel-head">
          <h3>Budget vs. actuals</h3>
          <span v-if="study.budget.accountCode" class="ctx">Account: {{ study.budget.accountCode }} · billed via iLabs</span>
        </div>
        <div class="budget-grid">
          <div class="budget-card">
            <div class="lbl">Committed</div>
            <div class="val">${{ study.budget.committed.toLocaleString() }}</div>
          </div>
          <div class="budget-card">
            <div class="lbl">Invoiced</div>
            <div class="val" style="color:var(--warm)">${{ study.budget.invoiced.toLocaleString() }}</div>
          </div>
          <div class="budget-card">
            <div class="lbl">Remaining</div>
            <div class="val" style="color:var(--green)">${{ study.budget.remaining.toLocaleString() }}</div>
          </div>
        </div>
        <div class="budget-prog"><div :style="{ width: study.budget.pctInvoiced + '%' }" /></div>
        <div style="padding:0.6rem 1.4rem 0; font-size:0.78rem; color:var(--muted)">
          {{ study.budget.pctInvoiced }}% of committed budget invoiced
        </div>

        <table class="budget-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Rate</th>
              <th>Planned</th>
              <th>Completed</th>
              <th>Committed</th>
              <th>Invoiced</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in study.budget.lines" :key="line.service">
              <td>{{ line.service }}</td>
              <td class="mono">${{ line.rate }}</td>
              <td class="mono">{{ line.planned }}</td>
              <td class="mono">{{ line.completed }}</td>
              <td class="mono">${{ line.committed.toLocaleString() }}</td>
              <td class="mono">${{ line.invoiced.toLocaleString() }}</td>
            </tr>
            <tr style="background:rgba(0,0,0,0.02)">
              <td colspan="4" style="text-align:right; font-weight:600">Totals</td>
              <td class="mono" style="font-weight:600; color:var(--accent)">${{ study.budget.committed.toLocaleString() }}</td>
              <td class="mono" style="font-weight:600; color:var(--warm)">${{ study.budget.invoiced.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>

        <div class="panel-foot">
          <span class="ctx">Billing contact: {{ study.budget.billingContact }}</span>
          <div style="display:flex; gap:0.5rem">
            <button class="btn btn-secondary btn-sm">Export invoice CSV</button>
            <button class="btn btn-primary btn-sm">Mark invoice sent</button>
          </div>
        </div>
      </div>
    </div>

    <!-- NOTES & ACTIVITY -->
    <div v-if="activeTab === 'notes'">
      <div class="panel">
        <div class="panel-head">
          <h3>Notes &amp; activity</h3>
          <span class="ctx">Combined audit log · internal staff only</span>
        </div>
        <div class="activity-timeline">
          <div v-for="(item, i) in study.activity" :key="i" class="t-item">
            <div class="t-dot" :class="item.dotClass" />
            <div class="t-body">
              <div class="t-title">{{ item.title }}</div>
              <div class="t-meta">{{ item.date }}</div>
              <div v-if="item.note" class="t-note">{{ item.note }}</div>
            </div>
          </div>
        </div>
        <div class="note-composer">
          <textarea placeholder="Add an internal note (visible only to I3H staff)…" />
          <div class="composer-actions">
            <button class="btn btn-secondary btn-sm">Cancel</button>
            <button class="btn btn-primary btn-sm">Post note</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
