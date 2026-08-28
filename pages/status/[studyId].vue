<script setup lang="ts">
import type { CollectionVisit } from '~/types/index'
import { INTAKE_FIELDS, intakeDisplayValue } from '~/utils/intakeFields'

definePageMeta({ layout: false })

const route = useRoute()
const studyId = route.params.studyId as string
const token = route.query.token as string | undefined

interface Agreement {
  id: string
  name: string
  status: string
  signedBy?: string
  signedDate?: string
  signUrl: string | null
}

interface Cohort {
  subjects: number
  totalSamples: number
  processedSamples: number
  groups?: Array<{ name: string; description?: string; subjects: number; samples: Record<string, number> }>
  visits?: CollectionVisit[]
}

interface LifecycleStep {
  label: string
  date: string
  status: 'done' | 'active' | 'pending'
}

interface BudgetLine {
  service: string
  rate: number
  planned: number
}

interface BudgetSummary {
  accountCode: string | null
  fundingName: string | null
  baName: string | null
  baEmail: string | null
  contractingContact: string | null
  lines: BudgetLine[]
}

interface StudyStatus {
  name: string
  abbreviation: string
  irb: string
  piName: string
  piEmail: string
  studyLead: { name: string; email: string } | null
  affiliation: string
  affiliationOrg: string
  stage: string
  cohort: Cohort
  budget: BudgetSummary | null
  lifecycle: LifecycleStep[]
  additionalNotes: string
  intakeDetails: Record<string, unknown>
  keyPersonnel: Array<{ name: string; email: string; role: string }>
  agreements: Agreement[]
}

const { data: study, error } = await useAsyncData(
  `status-${studyId}`,
  () => $fetch<StudyStatus>(`/api/status/${studyId}`, { query: { token } }),
)

const signedCount = computed(() => study.value?.agreements.filter(a => a.status === 'Signed').length ?? 0)
const pendingAgreements = computed(() => study.value?.agreements.filter(a => a.status === 'Pending') ?? [])
const isActivated = computed(() => study.value?.stage === 'Processing' || study.value?.stage === 'Complete')

const pctProcessed = computed(() => {
  const c = study.value?.cohort
  if (!c?.totalSamples) return 0
  return Math.round((c.processedSamples / c.totalSamples) * 100)
})

const stageLabel = computed(() => {
  switch (study.value?.stage) {
    case 'Awaiting Signature': return 'Awaiting your signature'
    case 'Processing': return 'Sample processing underway'
    case 'Complete': return 'Complete'
    default: return study.value?.stage ?? ''
  }
})

const stageColor = computed(() => {
  switch (study.value?.stage) {
    case 'Processing':
    case 'Complete': return '#1a7a4c'
    case 'Awaiting Signature': return '#b7950b'
    default: return '#011F5B'
  }
})

const affiliationLabel = computed(() => {
  const s = study.value
  if (!s?.affiliation) return ''
  return s.affiliationOrg ? `${s.affiliation} · ${s.affiliationOrg}` : s.affiliation
})

// Funding & Affiliation — what the PI submitted via the billing form
const isInternal = computed(() => study.value?.affiliation === 'Internal')
const ilabsId = computed(() => (study.value?.intakeDetails?.ilabsId as string) || '')

// Study-defined visit columns for the cohort sample matrix
const visits = computed(() => study.value?.cohort.visits ?? [])
const cohortGroups = computed(() => study.value?.cohort.groups ?? [])
const groupTotal = (g: { subjects: number; samples: Record<string, number> }, visitList: CollectionVisit[]) =>
  (Number(g.subjects) || 0) * visitList.reduce((s, v) => s + (Number(g.samples?.[v.id]) || 0), 0)
const matrixSubjectsTotal = computed(() =>
  cohortGroups.value.reduce((s, g) => s + (Number(g.subjects) || 0), 0),
)
const visitTotal = (visitId: string) =>
  cohortGroups.value.reduce((s, g) => s + (Number(g.subjects) || 0) * (Number(g.samples?.[visitId]) || 0), 0)

const keyPersonnel = computed(() => study.value?.keyPersonnel ?? [])

// Regulatory / Blood Collection / Logistics groupings mirror the admin
// edit-inquiry / edit-study forms exactly (utils/intakeFields.ts), so the
// order and grouping of fields here matches that form section-for-section.
function fieldRows(fields: typeof INTAKE_FIELDS) {
  const details = study.value?.intakeDetails
  return fields
    .map(f => ({ label: f.label, value: intakeDisplayValue(f.key, details) }))
    .filter(r => r.value !== '')
}
const collectionSitesValue = computed(() => intakeDisplayValue('collectionSites', study.value?.intakeDetails))
const studySynopsisValue = computed(() => intakeDisplayValue('studySynopsis', study.value?.intakeDetails))
const regulatoryRows = computed(() => fieldRows(INTAKE_FIELDS.filter(f => f.section === 'Regulatory' && f.key === 'irbStatus')))
const bloodCollectionRows = computed(() => fieldRows([
  ...INTAKE_FIELDS.filter(f => f.section === 'Regulatory' && f.key !== 'irbStatus'),
  ...INTAKE_FIELDS.filter(f => f.section === 'Samples'),
]))
const logisticsRows = computed(() => fieldRows(INTAKE_FIELDS.filter(f => f.section === 'Scope')))

// Services requested and their planned quantities (PI-facing cost summary)
const budgetLines = computed(() => study.value?.budget?.lines ?? [])
const servicesGrandTotal = computed(() =>
  budgetLines.value.reduce((s, l) => s + l.rate * l.planned, 0),
)
const currency = (n: number) => `$${(n || 0).toLocaleString()}`
</script>

<template>
  <div class="status-shell">
    <!-- Topbar -->
    <div class="sign-topbar">
      <div class="sign-brand">
        <div class="mark">I3H</div>
        Immune Health
      </div>
      <span style="color:rgba(255,255,255,0.5);font-size:0.78rem;">Study status portal</span>
      <div style="width:120px" />
    </div>

    <!-- Error -->
    <div v-if="error" class="status-error">
      <div style="font-size:2.2rem;margin-bottom:1rem;">⚠</div>
      <p class="status-error-title">Unable to load study status</p>
      <p class="status-error-body">This link may be invalid or expired. Contact your I3H representative for a new link.</p>
    </div>

    <!-- Content -->
    <div v-else-if="study" class="status-wrap">

      <!-- Hero -->
      <div class="status-hero">
        <div class="status-hero-inner">
          <div>
            <div class="status-overline">Study status</div>
            <h1 class="status-title">{{ study.name }}</h1>
            <div class="status-meta">
              <span class="status-abbr">{{ study.abbreviation }}</span>
              <span class="status-sep">·</span>
              <span>IRB {{ study.irb }}</span>
              <span class="status-sep">·</span>
              <span>PI: {{ study.piName }}</span>
            </div>
          </div>
          <div
            class="status-stage-badge"
            :style="{ background: stageColor + '18', color: stageColor, borderColor: stageColor + '40' }"
          >
            <span class="status-stage-dot" :style="{ background: stageColor }" />
            {{ stageLabel }}
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="status-body">

        <!-- Timeline -->
        <div class="status-card">
          <div class="status-card-head">
            <h2>Study timeline</h2>
          </div>
          <div style="padding:1.4rem 1.8rem 1.6rem;">
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
        </div>

        <!-- Agreements -->
        <div class="status-card">
          <div class="status-card-head">
            <h2>Agreement package</h2>
            <span class="status-card-ctx">{{ signedCount }} of {{ study.agreements.length }} signed</span>
          </div>

          <div v-if="pendingAgreements.length > 0" class="status-banner status-banner-warn">
            <span>⚠</span>
            <span>
              {{ pendingAgreements.length }} agreement{{ pendingAgreements.length > 1 ? 's' : '' }}
              still require{{ pendingAgreements.length === 1 ? 's' : '' }} your signature.
              Sample processing cannot begin until all agreements are countersigned.
            </span>
          </div>
          <div v-else class="status-banner status-banner-ok">
            <span>✓</span>
            <span>All agreements signed — thank you. The I3H team will countersign and begin processing.</span>
          </div>

          <div class="status-agr-list">
            <div v-for="agr in study.agreements" :key="agr.id" class="status-agr-row">
              <div class="status-agr-check" :class="agr.status === 'Signed' ? 'signed' : 'pending'">
                {{ agr.status === 'Signed' ? '✓' : '!' }}
              </div>
              <div class="status-agr-body">
                <div class="status-agr-name">{{ agr.name }}</div>
                <div class="status-agr-meta">
                  {{ agr.status === 'Signed' ? `Signed by ${agr.signedBy} · ${agr.signedDate}` : 'Awaiting your signature' }}
                </div>
              </div>
              <a v-if="agr.signUrl" :href="agr.signUrl" class="status-sign-btn">Review &amp; Sign →</a>
            </div>
          </div>
        </div>

        <!-- Sample processing (activated studies only) -->
        <div v-if="isActivated" class="status-card">
          <div class="status-card-head">
            <h2>Sample processing</h2>
            <span class="status-card-ctx">{{ study.cohort.processedSamples }} of {{ study.cohort.totalSamples }} processed</span>
          </div>
          <div class="status-samples">
            <div class="status-prog-track">
              <div class="status-prog-fill" :style="{ width: Math.max(pctProcessed, pctProcessed > 0 ? 2 : 0) + '%' }" />
            </div>
            <div class="status-prog-label">{{ pctProcessed }}% complete</div>
            <div class="status-cohort-grid">
              <div class="status-cohort-card">
                <div class="status-cohort-lbl">Subjects</div>
                <div class="status-cohort-val">{{ study.cohort.subjects }}</div>
              </div>
              <div class="status-cohort-card">
                <div class="status-cohort-lbl">Cohorts</div>
                <div class="status-cohort-val">{{ study.cohort.groups?.length ?? 0 }}</div>
              </div>
              <div class="status-cohort-card">
                <div class="status-cohort-lbl">Total samples</div>
                <div class="status-cohort-val">{{ study.cohort.totalSamples }}</div>
              </div>
              <div class="status-cohort-card">
                <div class="status-cohort-lbl">Processed</div>
                <div class="status-cohort-val" style="color:#1a7a4c">{{ study.cohort.processedSamples }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Study info -->
        <div class="status-card">
          <div class="status-card-head">
            <h2>Study info</h2>
          </div>
          <div class="status-details-grid">
            <div>
              <div class="status-detail-lbl">Study name</div>
              <div class="status-detail-val">{{ study.name }}</div>
            </div>
            <div v-if="studySynopsisValue">
              <div class="status-detail-lbl">Study synopsis</div>
              <div class="status-detail-val">{{ studySynopsisValue }}</div>
            </div>
            <div v-if="study.abbreviation">
              <div class="status-detail-lbl">Project Acronym / ID</div>
              <div class="status-detail-val">{{ study.abbreviation }}</div>
            </div>
            <div>
              <div class="status-detail-lbl">Principal Investigator</div>
              <div class="status-detail-val">{{ study.piName }}<template v-if="study.piEmail"> · {{ study.piEmail }}</template></div>
            </div>
            <div v-if="study.studyLead">
              <div class="status-detail-lbl">Study lead</div>
              <div class="status-detail-val">{{ study.studyLead.name }}<template v-if="study.studyLead.email"> · {{ study.studyLead.email }}</template></div>
            </div>
          </div>
          <div v-if="keyPersonnel.length" class="status-table-wrap" style="margin-top:0.4rem;">
            <div class="status-detail-lbl" style="margin-bottom:0.5rem;">Key personnel</div>
            <table class="status-matrix">
              <thead>
                <tr>
                  <th style="text-align:left;">Name</th>
                  <th style="text-align:left;">Role</th>
                  <th style="text-align:left;">Email</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in keyPersonnel" :key="i">
                  <td style="text-align:left;">{{ p.name || '—' }}</td>
                  <td style="text-align:left;">{{ p.role || '—' }}</td>
                  <td style="text-align:left;">{{ p.email || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="collectionSitesValue" class="status-details-grid" style="padding-top:1.2rem;">
            <div>
              <div class="status-detail-lbl">Collection Site(s)</div>
              <div class="status-detail-val">{{ collectionSitesValue }}</div>
            </div>
          </div>
        </div>

        <!-- Cohort sample matrix -->
        <div v-if="cohortGroups.length" class="status-card">
          <div class="status-card-head">
            <h2>Cohort sample matrix</h2>
            <span class="status-card-ctx">{{ study.cohort.totalSamples }} total samples</span>
          </div>
          <div class="status-table-wrap">
            <table class="status-matrix">
              <thead>
                <tr>
                  <th style="text-align:left;">Cohort / Group</th>
                  <th>Subjects</th>
                  <th v-for="v in visits" :key="v.id">{{ v.label }}</th>
                  <th>Samples</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(g, i) in cohortGroups" :key="i">
                  <td style="text-align:left;">{{ g.name || `Cohort ${i + 1}` }}</td>
                  <td>{{ g.subjects }}</td>
                  <td v-for="v in visits" :key="v.id">{{ g.samples?.[v.id] || 0 }}</td>
                  <td class="status-matrix-total">{{ groupTotal(g, visits).toLocaleString() }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td style="text-align:left;">Total</td>
                  <td>{{ matrixSubjectsTotal.toLocaleString() }}</td>
                  <td v-for="v in visits" :key="v.id">{{ visitTotal(v.id).toLocaleString() }}</td>
                  <td class="status-matrix-total">{{ study.cohort.totalSamples.toLocaleString() }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Services & estimated cost -->
        <div v-if="budgetLines.length || study.additionalNotes" class="status-card">
          <div class="status-card-head">
            <h2>Services &amp; estimated cost</h2>
            <span v-if="budgetLines.length" class="status-card-ctx">{{ currency(servicesGrandTotal) }} estimated</span>
          </div>
          <div v-if="budgetLines.length" class="status-table-wrap">
            <table class="status-matrix">
              <thead>
                <tr>
                  <th style="text-align:left;">Service</th>
                  <th>Cost</th>
                  <th>Number</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(l, i) in budgetLines" :key="i">
                  <td style="text-align:left;">{{ l.service }}</td>
                  <td>{{ currency(l.rate) }}</td>
                  <td>{{ l.planned }}</td>
                  <td>{{ currency(l.rate * l.planned) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td style="text-align:left;">Total</td>
                  <td />
                  <td />
                  <td class="status-matrix-total">{{ currency(servicesGrandTotal) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-if="study.additionalNotes" class="status-details-grid" style="padding-top:1.2rem;">
            <div>
              <div class="status-detail-lbl">Additional notes</div>
              <div class="status-detail-val">{{ study.additionalNotes }}</div>
            </div>
          </div>
        </div>

        <!-- Regulatory -->
        <div class="status-card">
          <div class="status-card-head">
            <h2>Regulatory</h2>
          </div>
          <div class="status-details-grid">
            <div>
              <div class="status-detail-lbl">IRB protocol</div>
              <div class="status-detail-val">{{ study.irb || '—' }}</div>
            </div>
            <div v-for="row in regulatoryRows" :key="row.label">
              <div class="status-detail-lbl">{{ row.label }}</div>
              <div class="status-detail-val">{{ row.value }}</div>
            </div>
          </div>
        </div>

        <!-- Blood Collection -->
        <div v-if="bloodCollectionRows.length" class="status-card">
          <div class="status-card-head">
            <h2>Blood Collection</h2>
          </div>
          <div class="status-details-grid">
            <div v-for="row in bloodCollectionRows" :key="row.label">
              <div class="status-detail-lbl">{{ row.label }}</div>
              <div class="status-detail-val">{{ row.value }}</div>
            </div>
          </div>
        </div>

        <!-- Logistics -->
        <div v-if="logisticsRows.length" class="status-card">
          <div class="status-card-head">
            <h2>Logistics</h2>
          </div>
          <div class="status-details-grid">
            <div v-for="row in logisticsRows" :key="row.label">
              <div class="status-detail-lbl">{{ row.label }}</div>
              <div class="status-detail-val">{{ row.value }}</div>
            </div>
          </div>
        </div>

        <!-- Funding & Affiliation — as submitted via the billing form -->
        <div v-if="affiliationLabel" class="status-card">
          <div class="status-card-head">
            <h2>Funding &amp; Affiliation</h2>
          </div>
          <div class="status-details-grid">
            <div>
              <div class="status-detail-lbl">Affiliation</div>
              <div class="status-detail-val">{{ affiliationLabel }}</div>
            </div>
            <template v-if="isInternal">
              <div v-if="study.budget?.accountCode">
                <div class="status-detail-lbl">Budget Account Number</div>
                <div class="status-detail-val">{{ study.budget.accountCode }}</div>
              </div>
              <div v-if="study.budget?.fundingName">
                <div class="status-detail-lbl">Funding Source (CAMS)</div>
                <div class="status-detail-val">{{ study.budget.fundingName }}</div>
              </div>
              <div v-if="study.budget?.baName || study.budget?.baEmail">
                <div class="status-detail-lbl">Business Administrator</div>
                <div class="status-detail-val">{{ study.budget?.baName }}<template v-if="study.budget?.baEmail"> · {{ study.budget.baEmail }}</template></div>
              </div>
              <div v-if="ilabsId">
                <div class="status-detail-lbl">iLab Service Request ID</div>
                <div class="status-detail-val">{{ ilabsId }}</div>
              </div>
            </template>
            <template v-else>
              <div v-if="study.budget?.contractingContact">
                <div class="status-detail-lbl">Contracting / Grants Office Contact</div>
                <div class="status-detail-val">{{ study.budget.contractingContact }}</div>
              </div>
            </template>
          </div>
        </div>

        <!-- Footer -->
        <div class="status-footer">
          <div class="status-footer-brand">
            <div class="mark" style="font-size:0.75rem;padding:4px 7px;">I3H</div>
            Institute for Immunology &amp; Immune Health · Penn Medicine
          </div>
          <p>Questions about your study? Reply to your approval email or contact your I3H representative.</p>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.status-shell {
  min-height: 100vh;
  background: #f5f4f0;
}

/* ── Wrap ── */
.status-wrap {
  max-width: 740px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

/* ── Error ── */
.status-error {
  max-width: 480px;
  margin: 5rem auto;
  text-align: center;
  padding: 2rem;
}
.status-error-title {
  font-size: 1rem;
  font-weight: 600;
  color: #c0392b;
  margin: 0 0 0.5rem;
}
.status-error-body {
  font-size: 0.85rem;
  color: #666;
}

/* ── Hero ── */
.status-hero {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  padding: 1.8rem 2rem;
  margin-bottom: 1.2rem;
}
.status-hero-inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.2rem;
  flex-wrap: wrap;
}
.status-overline {
  font-size: 0.67rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #999;
  font-weight: 600;
  margin-bottom: 0.3rem;
}
.status-title {
  font-size: 1.45rem;
  font-weight: 700;
  color: #011F5B;
  margin: 0 0 0.5rem;
  line-height: 1.2;
}
.status-meta {
  font-size: 0.83rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}
.status-abbr {
  font-family: monospace;
  background: rgba(1,31,91,0.07);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 0.77rem;
  letter-spacing: 0.04em;
}
.status-sep { color: #ccc; }
.status-stage-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.95rem;
  border-radius: 20px;
  border: 1px solid;
  font-size: 0.79rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.status-stage-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Body ── */
.status-body {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

/* ── Card ── */
.status-card {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  overflow: hidden;
}
.status-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.6rem;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.status-card-head h2 {
  font-size: 0.72rem;
  font-weight: 700;
  color: #011F5B;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.status-card-ctx {
  font-size: 0.78rem;
  color: #999;
}

/* ── Banners ── */
.status-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin: 0.9rem 1.6rem 0;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.83rem;
  line-height: 1.5;
}
.status-banner-warn {
  background: rgba(183,149,11,0.09);
  color: #7d6608;
  border: 1px solid rgba(183,149,11,0.22);
}
.status-banner-ok {
  background: rgba(26,122,76,0.08);
  color: #155736;
  border: 1px solid rgba(26,122,76,0.18);
}

/* ── Agreements ── */
.status-agr-list {
  padding: 0.9rem 1.6rem 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.status-agr-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.8rem 1rem;
  border: 1px solid rgba(0,0,0,0.07);
  border-radius: 7px;
  background: #fafaf8;
}
.status-agr-check {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.77rem;
  font-weight: 700;
  flex-shrink: 0;
}
.status-agr-check.signed {
  background: #1a7a4c;
  color: #fff;
}
.status-agr-check.pending {
  background: rgba(183,149,11,0.14);
  color: #7d6608;
  border: 1.5px solid rgba(183,149,11,0.35);
}
.status-agr-body { flex: 1; min-width: 0; }
.status-agr-name {
  font-size: 0.86rem;
  font-weight: 600;
  color: #1a1a2e;
}
.status-agr-meta {
  font-size: 0.75rem;
  color: #999;
  margin-top: 1px;
}
.status-sign-btn {
  background: #011F5B;
  color: #fff;
  padding: 0.45rem 1rem;
  border-radius: 5px;
  text-decoration: none;
  font-size: 0.78rem;
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
  transition: background 0.15s;
}
.status-sign-btn:hover { background: #1a3a8c; }

/* ── Samples ── */
.status-samples { padding: 1.3rem 1.6rem; }
.status-prog-track {
  height: 9px;
  background: rgba(0,0,0,0.08);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.45rem;
}
.status-prog-fill {
  height: 100%;
  background: #1a7a4c;
  border-radius: 6px;
  transition: width 0.5s ease;
}
.status-prog-label {
  font-size: 0.8rem;
  color: #1a7a4c;
  font-weight: 600;
  margin-bottom: 1.2rem;
}
.status-cohort-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}
.status-cohort-card {
  background: #f5f4f0;
  border-radius: 7px;
  padding: 0.8rem 0.9rem;
}
.status-cohort-lbl {
  font-size: 0.63rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #999;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.status-cohort-val {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a2e;
  font-family: monospace;
}

/* ── Details ── */
.status-details-grid {
  padding: 1.2rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.status-detail-lbl {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #999;
  font-weight: 600;
  margin-bottom: 0.22rem;
}
.status-detail-val {
  font-size: 0.87rem;
  color: #2b3a4a;
  line-height: 1.55;
}

/* ── Tables (matrix / services) ── */
.status-table-wrap {
  padding: 0.6rem 1.6rem 0.4rem;
  overflow-x: auto;
}
.status-matrix {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.status-matrix th {
  text-align: center;
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #999;
  font-weight: 600;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  white-space: nowrap;
}
.status-matrix td {
  text-align: center;
  padding: 0.55rem 0.6rem;
  color: #2b3a4a;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  font-variant-numeric: tabular-nums;
}
.status-matrix tbody tr:last-child td { border-bottom: none; }
.status-matrix tfoot td {
  font-weight: 600;
  border-top: 1px solid rgba(0,0,0,0.1);
  border-bottom: none;
}
.status-matrix-total { font-weight: 600; color: #011F5B; }

/* ── Footer ── */
.status-footer {
  text-align: center;
  padding: 2rem 0 0.5rem;
  color: #aaa;
  font-size: 0.77rem;
  line-height: 1.6;
}
.status-footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #888;
  font-size: 0.8rem;
}
</style>
