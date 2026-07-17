<script setup lang="ts">
/**
 * Full Intake Form Page (token-gated)
 *
 * The detailed study questionnaire for new immune profiling projects.
 * Only reachable via the tokenized link that I3H staff email to a lead
 * after the introductory conversation (see /api/admin/send-intake-link).
 * Submission upgrades the lead's inquiry row in place.
 * Sidebar and page copy fetched from Contentful (with static fallbacks).
 */
import { useContentful } from '~/composables/useContentful'
import { COLLECTION_TIMEPOINTS } from '~/types/index'
import type { IntakeFormData, AffiliationType, IntakePageContent, CollectionGroup } from '~/types/index'

// Build an empty per-timepoint samples map for a new cohort row
const emptySamples = (): Record<string, number> =>
  Object.fromEntries(COLLECTION_TIMEPOINTS.map(tp => [tp.key, tp.key === 'base' ? 1 : 0]))

const newGroup = (name = ''): CollectionGroup => ({ name, subjects: 0, samples: emptySamples() })

const servicesStore = await useServicesData()
const { fetchSingleton } = useContentful()

const route = useRoute()
const inquiryId = route.params.inquiryId as string
const intakeToken = (route.query.token as string) || ''

// Form data
const form = reactive<IntakeFormData>({
  projectName: '',
  acronym: '',
  principalInvestigator: '',
  piEmail: '',
  projectLead: '',
  leadEmail: '',
  collaborators: '',
  collectionSites: [],
  collectionSiteOther: '',
  participantNaming: '',
  cohortCount: undefined,
  cohortNames: '',
  clinicalQuestion: '',
  irbStatus: 'not-submitted',
  irbNumber: '',
  irbTimeline: '',
  pilotData: 'no',
  pilotDataDetail: '',
  objectives: '',
  subjectCount: 0,
  enrollmentPeriod: undefined,
  firstSampleDate: '',
  collectionGroups: [newGroup()],
  statisticalJustification: '',
  sampleType: 'fresh-blood',
  tubeTypes: [],
  tubeTypeOther: '',
  phlebotomyNeeds: 'ih-campus',
  specialHandling: [],
  specialHandlingNotes: '',
  services: [],
  customAssays: '',
  clinicalVariables: [],
  clinicalVariableOther: '',
  affiliation: 'internal',
  budgetCode: '',
  fundingName: '',
  baName: '',
  baEmail: '',
  ilabsId: '',
  externalInstitution: '',
  externalContact: '',
  pennsieveStatus: 'unsure',
  dataSharing: 'no',
  dataSharingNotes: '',
  metadataPlan: '',
  hardDeadlines: '',
  sampleArrival: 'rolling',
  notes: '',
})

// Multi-select option lists come from the shared intake schema (single source of
// truth) so the form's choices can never drift from the admin edit modals.
const COLLECTION_SITE_OPTIONS = fieldOptionValues('collectionSites')
const TUBE_TYPE_OPTIONS = fieldOptionValues('tubeTypes')
const SPECIAL_HANDLING_OPTIONS = fieldOptionValues('specialHandling')
const CLINICAL_VARIABLE_OPTIONS = fieldOptionValues('clinicalVariables')

// Toggle a value within one of the checkbox-array fields
const toggleInArray = (field: 'collectionSites' | 'tubeTypes' | 'specialHandling' | 'clinicalVariables', value: string) => {
  const arr = form[field]
  const i = arr.indexOf(value)
  if (i === -1) arr.push(value)
  else arr.splice(i, 1)
}

// Cohort sample matrix (per-group estimator) helpers
const TIMEPOINTS = COLLECTION_TIMEPOINTS

const addGroup = () => {
  form.collectionGroups.push(newGroup())
}

const removeGroup = (index: number) => {
  form.collectionGroups.splice(index, 1)
}

// Earliest selectable month for "First Samples Expected" — the current month (no past dates)
const currentMonth = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

// Latest selectable month — 10 years out, to block absurd years entered via arrow keys
const maxMonth = computed(() => {
  const now = new Date()
  return `${now.getFullYear() + 10}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

// First samples expected: clamp to the [current month, +10 years] window.
// Snaps past dates up and absurd future years (entered via arrow keys) down.
const onFirstSampleInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  if (el.value && el.value < currentMonth.value) {
    el.value = currentMonth.value
  }
  else if (el.value && el.value > maxMonth.value) {
    el.value = maxMonth.value
  }
  form.firstSampleDate = el.value
}

// Enrollment period: non-negative integers only, capped at 3 digits.
// Strip every non-digit so "e", "-", ".", etc. can't be entered.
const onEnrollmentInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, 3)
  el.value = digits
  form.enrollmentPeriod = digits === '' ? undefined : Number(digits)
}

// Samples contributed by a single cohort row = subjects × tubes across all timepoints
const groupTotal = (g: CollectionGroup) =>
  (Number(g.subjects) || 0) * TIMEPOINTS.reduce((sum, tp) => sum + (Number(g.samples[tp.key]) || 0), 0)

const submitMessage = ref('')
const submitSuccess = ref(false)
const isSubmitting = ref(false)

// Total unique subjects across all cohort rows
const totalSubjects = computed(() =>
  form.collectionGroups.reduce((sum, g) => sum + (Number(g.subjects) || 0), 0),
)

// Per-timepoint sample totals (one bar per fixed column), with projected dates
const timepointTotals = computed(() =>
  TIMEPOINTS.map((tp) => {
    let dateLabel = ''
    if (form.firstSampleDate) {
      // Parse the "YYYY-MM" value in local time (new Date("YYYY-MM") is UTC and
      // shifts a month earlier once rendered in a timezone behind UTC)
      const [year, month] = form.firstSampleDate.split('-').map(Number)
      const d = new Date(year, (month || 1) - 1, 1)
      if (!Number.isNaN(d.getTime())) {
        d.setDate(d.getDate() + tp.weekOffset * 7)
        dateLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }
    }
    const total = form.collectionGroups.reduce(
      (sum, g) => sum + (Number(g.subjects) || 0) * (Number(g.samples[tp.key]) || 0),
      0,
    )
    return { ...tp, dateLabel, total }
  }),
)

// Computed values — total samples derives from the whole matrix
const totalSamples = computed(() =>
  form.collectionGroups.reduce((sum, g) => sum + groupTotal(g), 0),
)

const estimatedTotal = computed(() => {
  return servicesStore.calculateTotal(form.services)
})

// Service selection handling
const selectedServices = ref<Set<string>>(new Set())
const serviceQuantities = ref<Record<string, number>>({})

const toggleService = (serviceId: string) => {
  if (selectedServices.value.has(serviceId)) {
    selectedServices.value.delete(serviceId)
    const { [serviceId]: _, ...remaining } = serviceQuantities.value
    serviceQuantities.value = remaining
  }
  else {
    selectedServices.value.add(serviceId)
    serviceQuantities.value[serviceId] = totalSamples.value || 1
  }
  updateServiceRequests()
}

const updateServiceQuantity = (serviceId: string, quantity: number) => {
  serviceQuantities.value[serviceId] = quantity
  updateServiceRequests()
}

const updateServiceRequests = () => {
  form.services = Array.from(selectedServices.value).map(serviceId => ({
    serviceId,
    quantity: serviceQuantities.value[serviceId] || 0,
  }))
}

// Update service quantities when total samples changes
watch(totalSamples, (newTotal) => {
  selectedServices.value.forEach((serviceId) => {
    serviceQuantities.value[serviceId] = newTotal
  })
  updateServiceRequests()
})

// Affiliation handling
const setAffiliation = (affiliation: AffiliationType) => {
  form.affiliation = affiliation
  servicesStore.setRateView(affiliation === 'internal' ? 'internal' : 'external')
}

// IRB status handling — only "approved" studies have an IRB number; the
// pre-approval states capture an expected timeline instead. Clear whichever
// field no longer applies so stale values aren't submitted.
const setIrbStatus = (status: 'approved' | 'pending' | 'not-submitted') => {
  form.irbStatus = status
  if (status === 'approved') form.irbTimeline = ''
  else form.irbNumber = ''
}

// Form submission
const submitForm = async () => {
  // Sync the subject count (used downstream) from the matrix
  form.subjectCount = totalSubjects.value

  // Validate required fields
  if (!form.projectName || !form.principalInvestigator || !form.piEmail ||
      !form.projectLead || !form.leadEmail || !form.objectives ||
      !totalSubjects.value || !totalSamples.value || form.services.length === 0) {
    submitMessage.value = '⚠ Please fill in all required fields.'
    submitSuccess.value = false
    return
  }


  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.piEmail)) {
    submitMessage.value = '⚠ Please enter a valid PI email address.'
    submitSuccess.value = false
    return
  }
  if (!emailRegex.test(form.leadEmail)) {
    submitMessage.value = '⚠ Please enter a valid lead email address.'
    submitSuccess.value = false
    return
  }
  if (form.baEmail && !emailRegex.test(form.baEmail)) {
    submitMessage.value = '⚠ Please enter a valid Business Administrator email address.'
    submitSuccess.value = false
    return
  }
  if (form.externalContact && !emailRegex.test(form.externalContact)) {
    submitMessage.value = '⚠ Please enter a valid Contracting / Grants Office email address.'
    submitSuccess.value = false
    return
  }

  isSubmitting.value = true
  submitMessage.value = 'Sending inquiry...'

  try {
    const servicesText = form.services.map((req) => {
      const service = servicesStore.services.find(s => s.id === req.serviceId)
      return `${service?.name || req.serviceId} (qty: ${req.quantity})`
    }).join(', ')

    const servicesDetail = form.services.map((req) => {
      const service = servicesStore.services.find(s => s.id === req.serviceId)
      return {
        name: service?.name || req.serviceId,
        qty: req.quantity,
        rate: servicesStore.getServiceRate(req.serviceId),
      }
    })

    await $fetch('/api/submit-intake', {
      method: 'POST',
      body: {
        inquiryId,
        token: intakeToken,
        form,
        estimatedTotal: estimatedTotal.value,
        totalSamples: totalSamples.value,
        servicesText,
        servicesDetail,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    })

    submitMessage.value = '✓ Inquiry submitted! Check your email for confirmation.'
    submitSuccess.value = true
  }
  catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    const reason = err.data?.statusMessage || 'Failed to submit. Please try again or contact us directly.'
    submitMessage.value = `❌ ${reason}`
    submitSuccess.value = false
  }
  finally {
    isSubmitting.value = false
  }
}

// Get rate display for a service
const getServiceRate = (serviceId: string): string => {
  const rate = servicesStore.getServiceRate(serviceId)
  if (rate === 0) return 'Contact'
  return `$${rate}/ea`
}

const getServiceSubtotal = (serviceId: string): string => {
  const rate = servicesStore.getServiceRate(serviceId)
  const qty = serviceQuantities.value[serviceId] || 0
  if (rate === 0) return 'Contact'
  return `= $${(rate * qty).toLocaleString()}`
}

// Verify the emailed token and pre-fill the lead's contact details.
// An invalid/expired/used link renders a friendly error state instead of the form.
interface IntakePrefill {
  lead: { name: string; email: string }
  affiliation: AffiliationType
  organization: string
  researchSummary: string
}
const tokenError = ref('')
const { data: prefill, error: prefillError } = await useAsyncData(
  `intake-prefill-${inquiryId}`,
  () => $fetch<IntakePrefill>(`/api/intake-prefill/${inquiryId}`, { query: { token: intakeToken } }),
)
if (prefillError.value) {
  const err = prefillError.value as { data?: { statusMessage?: string } }
  tokenError.value = err.data?.statusMessage || 'This intake link is invalid'
}
else if (prefill.value) {
  form.projectLead = prefill.value.lead.name
  form.leadEmail = prefill.value.lead.email
  setAffiliation(prefill.value.affiliation)
  if (prefill.value.affiliation !== 'internal' && prefill.value.organization) {
    form.externalInstitution = prefill.value.organization
  }
}

const { data: intakePageData } = await useAsyncData('intakePage', () =>
    fetchSingleton<IntakePageContent>('intakePage'),
)

// Static fallback so the page renders even when Contentful is unconfigured
const FALLBACK_INTAKE_PAGE: IntakePageContent = {
  title: 'Study Intake Form',
  description: 'Tell us about your study — design, samples, assays, and logistics. The I3H team uses this to review feasibility and prepare your estimate.',
  affiliationInfoInternal: '',
  affiliationInfoExternal: '',
  affiliationInfoIndustry: '',
  sidebarCards: [],
}
const intakePage = computed(() => intakePageData.value ?? FALLBACK_INTAKE_PAGE)

</script>

<template>
  <div class="intake-page">
    <!-- Invalid / expired / already-used link -->
    <div v-if="tokenError" class="form-page">
      <div class="token-error-card">
        <h1>This link isn't available</h1>
        <p>{{ tokenError }}.</p>
        <p>If your link has expired or you believe this is a mistake, reply to the email you received from the I3H team and we'll send you a fresh one.</p>
      </div>
    </div>

    <div v-else class="form-page">
      <h1>{{ intakePage.title }}</h1>
      <p>{{ intakePage.description }}</p>

      <div class="form-layout">
        <div class="form-card">
          <!-- Study Info -->
          <div class="form-section-label">
            Study Information
          </div>

          <div class="form-group">
            <label>Cohort Study / Project Name <span class="req">*</span></label>
            <input v-model="form.projectName" type="text" placeholder="e.g. Investigation of BHB supplementation in CRC prevention">
          </div>

          <div class="form-group">
            <label>Project Acronym / ID</label>
            <div class="hint">
              Must be limited to 20 characters for LIMS
            </div>
            <input v-model="form.acronym" type="text" maxlength="20" placeholder="e.g. BHB ColCan">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Principal Investigator <span class="req">*</span></label>
              <input v-model="form.principalInvestigator" type="text" placeholder="Dr. First Last">
            </div>
            <div class="form-group">
              <label>PI Email <span class="req">*</span></label>
              <input v-model="form.piEmail" type="email" placeholder="name@pennmedicine.upenn.edu">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Point of Contact / Project Lead <span class="req">*</span></label>
              <input v-model="form.projectLead" type="text" placeholder="Full name">
            </div>
            <div class="form-group">
              <label>Lead Email <span class="req">*</span></label>
              <input v-model="form.leadEmail" type="email" placeholder="name@pennmedicine.upenn.edu">
            </div>
          </div>

          <div class="form-group">
            <label>Other Study Staff & Collaborators</label>
            <div class="hint">
              CRC, PM, tech, or other contacts who'll interact with our team; academic or corporate partners
            </div>
            <textarea v-model="form.collaborators" rows="2" placeholder="Name — role (e.g. Jane Doe — CRC; Acme Bio — corporate partner)" />
          </div>

          <div class="form-group">
            <label>Collection Site(s)</label>
            <div class="hint">
              Where will samples be drawn or sent from? Select all that apply.
            </div>
            <div class="chip-group">
              <label
                v-for="site in COLLECTION_SITE_OPTIONS"
                :key="site"
                class="chip"
                :class="{ active: form.collectionSites.includes(site) }"
              >
                <input
                  type="checkbox"
                  :checked="form.collectionSites.includes(site)"
                  @change="toggleInArray('collectionSites', site)"
                >
                {{ site }}
              </label>
            </div>
            <input
              v-if="form.collectionSites.includes('Remote / off-site')"
              v-model="form.collectionSiteOther"
              type="text"
              class="mt-sm"
              placeholder="Which remote / off-site locations?"
            >
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Participant Naming Convention</label>
              <input v-model="form.participantNaming" type="text" placeholder="e.g. SLE001">
            </div>
            <div class="form-group">
              <label>Number of Cohorts</label>
              <input v-model.number="form.cohortCount" type="number" min="0" placeholder="e.g. 3">
            </div>
          </div>

          <div class="form-group">
            <label>Cohort Names</label>
            <div class="hint">
              Define each cohort (e.g. SLE, SSc, irAE, Healthy control)
            </div>
            <input v-model="form.cohortNames" type="text" placeholder="e.g. SLE, SSc, irAE">
          </div>

          <div class="form-group">
            <label>Study Objectives <span class="req">*</span></label>
            <div class="hint">
              Describe your primary and secondary objectives
            </div>
            <textarea v-model="form.objectives" rows="4" placeholder="What are you trying to learn? What comparisons matter most?" />
          </div>

          <div class="form-group">
            <label>Clinical Question</label>
            <div class="hint">
              The specific clinical question you're trying to answer
            </div>
            <textarea v-model="form.clinicalQuestion" rows="2" placeholder="e.g. Does treatment X restore immune cell populations in irAE patients?" />
          </div>

          <div class="form-group">
            <label>IRB Status</label>
            <div class="seg-toggle">
              <button
                type="button"
                :class="{ active: form.irbStatus === 'approved' }"
                @click="setIrbStatus('approved')"
              >
                Approved
              </button>
              <button
                type="button"
                :class="{ active: form.irbStatus === 'pending' }"
                @click="setIrbStatus('pending')"
              >
                Submitted / pending
              </button>
              <button
                type="button"
                :class="{ active: form.irbStatus === 'not-submitted' }"
                @click="setIrbStatus('not-submitted')"
              >
                Not yet submitted
              </button>
            </div>
            <input
              v-if="form.irbStatus === 'approved'"
              v-model="form.irbNumber"
              type="text"
              class="mt-sm"
              placeholder="Protocol / IRB number (e.g. 850567). Add UPCC number if applicable."
            >
            <input
              v-else-if="form.irbStatus === 'pending'"
              v-model="form.irbTimeline"
              type="text"
              class="mt-sm"
              placeholder="Expected timeline for approval"
            >
            <input
              v-else-if="form.irbStatus === 'not-submitted'"
              v-model="form.irbTimeline"
              type="text"
              class="mt-sm"
              placeholder="Expected timeline for submission"
            >
          </div>

          <div class="form-group">
            <label>Preliminary / Pilot Data</label>
            <div class="seg-toggle">
              <button
                type="button"
                :class="{ active: form.pilotData === 'yes' }"
                @click="form.pilotData = 'yes'"
              >
                Yes
              </button>
              <button
                type="button"
                :class="{ active: form.pilotData === 'no' }"
                @click="form.pilotData = 'no'"
              >
                No
              </button>
            </div>
            <textarea
              v-if="form.pilotData === 'yes'"
              v-model="form.pilotDataDetail"
              rows="2"
              class="mt-sm"
              placeholder="What platform was used and what did you learn?"
            />
          </div>

          <div class="form-divider" />

          <!-- Scope -->
          <div class="form-section-label">
            Scope of Work
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Enrollment Period</label>
              <div class="hint">
                Over what timeframe?
              </div>
              <div class="num-suffix">
                <input :value="form.enrollmentPeriod" type="text" inputmode="numeric" placeholder="e.g. 18" @input="onEnrollmentInput">
                <span class="suffix">months</span>
              </div>
            </div>
            <div class="form-group">
              <label>First Samples Expected</label>
              <div class="hint">
                Drives the projected dates below
              </div>
              <input :value="form.firstSampleDate" type="month" :min="currentMonth" :max="maxMonth" @input="onFirstSampleInput" @change="onFirstSampleInput">
            </div>
          </div>

          <!-- Cohort sample matrix -->
          <div class="form-group">
            <label>Cohort Sample Matrix <span class="req">*</span></label>
            <div class="hint">
              Add a row per cohort/group. Enter the number of tubes collected <em>per subject</em> at each timepoint (0 = not collected).
            </div>

            <div class="matrix-scroll">
              <table class="matrix">
                <thead>
                  <tr>
                    <th class="m-group">Cohort / Group</th>
                    <th class="m-subs">Subjects</th>
                    <th v-for="tp in TIMEPOINTS" :key="tp.key" class="m-tp">{{ tp.short }}</th>
                    <th class="m-total">Samples</th>
                    <th class="m-x" />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(g, i) in form.collectionGroups" :key="i">
                    <td class="m-group">
                      <input v-model="g.name" type="text" placeholder="e.g. Active">
                    </td>
                    <td class="m-subs">
                      <input v-model.number="g.subjects" type="number" min="0">
                    </td>
                    <td v-for="tp in TIMEPOINTS" :key="tp.key" class="m-tp">
                      <input v-model.number="g.samples[tp.key]" type="number" min="0">
                    </td>
                    <td class="m-total mono">{{ groupTotal(g).toLocaleString() }}</td>
                    <td class="m-x">
                      <button
                        type="button"
                        class="sched-remove"
                        :disabled="form.collectionGroups.length === 1"
                        title="Remove cohort"
                        @click="removeGroup(i)"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td class="m-group">Total</td>
                    <td class="m-subs mono">{{ totalSubjects.toLocaleString() }}</td>
                    <td v-for="tp in timepointTotals" :key="tp.key" class="m-tp mono">{{ tp.total.toLocaleString() }}</td>
                    <td class="m-total mono">{{ totalSamples.toLocaleString() }}</td>
                    <td class="m-x" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <button type="button" class="sched-add" @click="addGroup">
              + Add cohort
            </button>
          </div>

          <!-- Estimator summary -->
          <div v-if="totalSubjects > 0 && totalSamples > 0" class="estimator">
            <div class="est-head">
              <span>Projected sample volume</span>
              <span class="est-total">{{ totalSamples.toLocaleString() }} samples</span>
            </div>
            <div class="est-sub">
              {{ totalSubjects.toLocaleString() }} subjects across {{ form.collectionGroups.length }} cohort{{ form.collectionGroups.length === 1 ? '' : 's' }}
            </div>
            <div class="est-bars">
              <div
                v-for="tp in timepointTotals"
                :key="tp.key"
                class="est-bar-row"
              >
                <span class="est-bar-label">
                  {{ tp.label }}<span v-if="tp.dateLabel" class="est-bar-date"> · {{ tp.dateLabel }}</span>
                </span>
                <div class="est-bar-track">
                  <div
                    class="est-bar-fill"
                    :style="{ width: `${totalSamples ? Math.max(2, (tp.total / totalSamples) * 100) : 0}%` }"
                  />
                </div>
                <span class="est-bar-val">{{ tp.total.toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Sample Type</label>
            <select v-model="form.sampleType">
              <option value="">
                Select sample type...
              </option>
              <option value="fresh-blood">
                Fresh whole blood
              </option>
              <option value="stored-pbmc">
                Stored PBMCs (cryopreserved)
              </option>
              <option value="tissue">
                Tissue
              </option>
              <option value="other">
                Other (describe in notes)
              </option>
            </select>
          </div>

          <div v-if="form.sampleType === 'fresh-blood'" class="form-group">
            <label>Collection Tube Type(s)</label>
            <div class="hint">
              CBC with differential provided with PBMC processing services requires a small EDTA collection tube. CyTOF requires heparin collection tubes. Minimum 4 mL sodium heparin tube if only requesting CyTOF services; otherwise, 300 microliters of whole blood can be taken for CyTOF prior to processing heparin PBMCs.
            </div>
            <div class="chip-group">
              <label
                v-for="tube in TUBE_TYPE_OPTIONS"
                :key="tube"
                class="chip"
                :class="{ active: form.tubeTypes.includes(tube) }"
              >
                <input
                  type="checkbox"
                  :checked="form.tubeTypes.includes(tube)"
                  @change="toggleInArray('tubeTypes', tube)"
                >
                {{ tube }}
              </label>
            </div>
            <input
              v-if="form.tubeTypes.includes('Other')"
              v-model="form.tubeTypeOther"
              type="text"
              class="mt-sm"
              placeholder="Please specify the other tube type"
            >
          </div>

          <div class="form-group">
            <label>Phlebotomy Needs</label>
            <select v-model="form.phlebotomyNeeds">
              <option value="">
                Select...
              </option>
              <option value="ih-campus">
                IH phlebotomist on campus
              </option>
              <option value="remote">
                Remote phlebotomy needed
              </option>
              <option value="self-collect">
                Study team will collect and transfer
              </option>
              <option value="stored">
                N/A – using stored samples
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Special Handling Requirements</label>
            <div class="hint">
              Select any that apply.
            </div>
            <div class="chip-group">
              <label
                v-for="opt in SPECIAL_HANDLING_OPTIONS"
                :key="opt"
                class="chip"
                :class="{ active: form.specialHandling.includes(opt) }"
              >
                <input
                  type="checkbox"
                  :checked="form.specialHandling.includes(opt)"
                  @change="toggleInArray('specialHandling', opt)"
                >
                {{ opt }}
              </label>
            </div>
            <input
              v-model="form.specialHandlingNotes"
              type="text"
              class="mt-sm"
              placeholder="Any other special handling details"
            >
          </div>

          <div class="form-group">
            <label>Statistical Justification</label>
            <div class="hint">
              Power calculation or other basis for your subject / sample numbers, if available
            </div>
            <textarea v-model="form.statisticalJustification" rows="2" placeholder="e.g. Powered to detect a 20% difference in CD8 frequency at 80% power, alpha 0.05" />
          </div>

          <!-- Services Selection -->
          <div class="form-group">
            <label>Services Requested <span class="req">*</span></label>
            <div class="hint">
              Check services to add them. Adjust the quantity slider for each – not every sample needs every service.
            </div>

            <div class="srv-list">
              <div
                v-for="service in servicesStore.activeServices"
                :key="service.id"
                class="srv-item"
                :class="{ active: selectedServices.has(service.id) }"
              >
                <label class="srv-check">
                  <input
                    type="checkbox"
                    :checked="selectedServices.has(service.id)"
                    @change="toggleService(service.id)"
                  >
                  {{ service.name }}
                  <span class="srv-price">{{ getServiceRate(service.id) }}</span>
                </label>

                <div v-if="selectedServices.has(service.id)" class="srv-qty-row">
                  <span class="qty-label">Qty:</span>
                  <input
                    type="range"
                    min="1"
                    :max="Math.max(200, totalSamples + 50)"
                    :value="serviceQuantities[service.id] || 0"
                    class="qty-slider"
                    @input="updateServiceQuantity(service.id, Number(($event.target as HTMLInputElement).value))"
                  >
                  <input
                    type="number"
                    min="0"
                    :value="serviceQuantities[service.id] || 0"
                    class="qty-num"
                    @input="updateServiceQuantity(service.id, Number(($event.target as HTMLInputElement).value))"
                  >
                  <span class="qty-subtotal">{{ getServiceSubtotal(service.id) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Cost Estimator -->
          <div v-if="form.services.length > 0" class="cost-estimator">
            <h4>Estimated Cost</h4>

            <div
              v-for="req in form.services"
              :key="req.serviceId"
              class="cost-line"
            >
              <span class="cost-label">{{ servicesStore.services.find(s => s.id === req.serviceId)?.name }}</span>
              <span class="cost-val">
                {{ servicesStore.getServiceRate(req.serviceId) === 0 ? 'Contact' : `$${servicesStore.getServiceRate(req.serviceId)} × ${req.quantity} = $${(servicesStore.getServiceRate(req.serviceId) * req.quantity).toLocaleString()}` }}
              </span>
            </div>

            <div class="cost-total">
              <span>Estimated Total</span>
              <span class="cost-val">${{ estimatedTotal.toLocaleString() }}</span>
            </div>

            <div class="cost-note">
              Based on {{ form.affiliation === 'internal' ? 'Penn internal' : 'academic external' }} rates. Consultation fee ($250) added separately. Final pricing confirmed in User Agreement.
            </div>
          </div>

          <div class="form-group">
            <label>Custom Panels or Assays</label>
            <div class="hint">
              Anything beyond our standard menu you're interested in?
            </div>
            <input v-model="form.customAssays" type="text" placeholder="e.g. custom CyTOF panel, spectral flow">
          </div>

          <div class="form-group">
            <label>Clinical Variables Tracked</label>
            <div class="hint">
              What clinical data will you track alongside the immune data? Select all that apply.
            </div>
            <div class="chip-group">
              <label
                v-for="v in CLINICAL_VARIABLE_OPTIONS"
                :key="v"
                class="chip"
                :class="{ active: form.clinicalVariables.includes(v) }"
              >
                <input
                  type="checkbox"
                  :checked="form.clinicalVariables.includes(v)"
                  @change="toggleInArray('clinicalVariables', v)"
                >
                {{ v }}
              </label>
            </div>
            <input
              v-if="form.clinicalVariables.includes('Other')"
              v-model="form.clinicalVariableOther"
              type="text"
              class="mt-sm"
              placeholder="Please specify the other clinical variable(s)"
            >
          </div>

          <div class="form-divider" />

          <!-- Funding & Affiliation -->
          <div class="form-section-label">
            Funding & Affiliation
          </div>

          <div class="form-group">
            <label>Institutional Affiliation <span class="req">*</span></label>
            <div class="affil-toggle">
              <button
                :class="{ active: form.affiliation === 'internal' }"
                @click="setAffiliation('internal')"
              >
                Penn Internal
              </button>
              <button
                :class="{ active: form.affiliation === 'external' }"
                @click="setAffiliation('external')"
              >
                External Academic
              </button>
              <button
                :class="{ active: form.affiliation === 'industry' }"
                @click="setAffiliation('industry')"
              >
                Industry / Corporate
              </button>
            </div>

            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="form.affiliation === 'internal' && intakePage.affiliationInfoInternal" class="affil-info" v-html="intakePage.affiliationInfoInternal" />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-else-if="form.affiliation === 'external' && intakePage.affiliationInfoExternal" class="affil-info" v-html="intakePage.affiliationInfoExternal" />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-else-if="form.affiliation === 'industry' && intakePage.affiliationInfoIndustry" class="affil-info" v-html="intakePage.affiliationInfoIndustry" />
          </div>

          <!-- Internal funding fields -->
          <template v-if="form.affiliation === 'internal'">
            <div class="form-group">
              <label>26-Digit Budget Account Number</label>
              <div class="hint">
                Required before work begins. Format: 400-XXXX-X-XXXXXX-XXXX-XXXX-XXXX
              </div>
              <input v-model="form.budgetCode" type="text" placeholder="400-____-_-______-____-____-____">
            </div>

            <div class="form-group">
              <label>Funding Source Name (in CAMS)</label>
              <input v-model="form.fundingName" type="text" placeholder="Project title as listed in CAMS">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Business Administrator Name</label>
                <input v-model="form.baName" type="text" placeholder="Full name">
              </div>
              <div class="form-group">
                <label>BA Contact Email</label>
                <input v-model="form.baEmail" type="email" placeholder="name@pennmedicine.upenn.edu">
              </div>
            </div>

            <div class="form-group">
              <label>iLabs Service Request ID</label>
              <div class="hint">
                If you already have one
              </div>
              <input v-model="form.ilabsId" type="text" placeholder="e.g. IH-1234">
            </div>
          </template>

          <!-- External funding fields -->
          <template v-else>
            <div class="form-group">
              <label>Institution Name <span class="req">*</span></label>
              <input v-model="form.externalInstitution" type="text" placeholder="e.g. Johns Hopkins University">
            </div>

            <div class="form-group">
              <label>Contracting / Grants Office Contact</label>
              <input v-model="form.externalContact" type="email" placeholder="contracts@institution.edu">
            </div>
          </template>

          <div class="form-group">
            <label>Pennsieve Account</label>
            <div class="hint">
              All final data is delivered through Pennsieve.
            </div>
            <div class="seg-toggle">
              <button
                type="button"
                :class="{ active: form.pennsieveStatus === 'has-account' }"
                @click="form.pennsieveStatus = 'has-account'"
              >
                Have an account
              </button>
              <button
                type="button"
                :class="{ active: form.pennsieveStatus === 'need-setup' }"
                @click="form.pennsieveStatus = 'need-setup'"
              >
                Need setup
              </button>
              <button
                type="button"
                :class="{ active: form.pennsieveStatus === 'unsure' }"
                @click="form.pennsieveStatus = 'unsure'"
              >
                Not sure
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Data Sharing Restrictions or Embargo</label>
            <div class="seg-toggle">
              <button
                type="button"
                :class="{ active: form.dataSharing === 'yes' }"
                @click="form.dataSharing = 'yes'"
              >
                Yes
              </button>
              <button
                type="button"
                :class="{ active: form.dataSharing === 'no' }"
                @click="form.dataSharing = 'no'"
              >
                No
              </button>
            </div>
            <input
              v-if="form.dataSharing === 'yes'"
              v-model="form.dataSharingNotes"
              type="text"
              class="mt-sm"
              placeholder="Describe the restriction or embargo"
            >
          </div>

          <div class="form-divider" />

          <!-- Timeline & Additional -->
          <div class="form-section-label">
            Timeline & Additional Notes
          </div>

          <div class="form-group">
            <label>Clinical Metadata Plans</label>
            <div class="hint">
              How will you collect metadata? REDCap preferred.
            </div>
            <select v-model="form.metadataPlan">
              <option value="">
                Select...
              </option>
              <option value="redcap">
                REDCap
              </option>
              <option value="other">
                Other system (describe below)
              </option>
              <option value="tbd">
                To be discussed
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Sample Arrival</label>
            <div class="seg-toggle">
              <button
                type="button"
                :class="{ active: form.sampleArrival === 'single-batch' }"
                @click="form.sampleArrival = 'single-batch'"
              >
                Single batch
              </button>
              <button
                type="button"
                :class="{ active: form.sampleArrival === 'rolling' }"
                @click="form.sampleArrival = 'rolling'"
              >
                Rolling basis
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Hard Deadlines</label>
            <div class="hint">
              Grant milestones, publication timelines, conference presentations, etc.
            </div>
            <input v-model="form.hardDeadlines" type="text" placeholder="e.g. Grant renewal Sept 2026">
          </div>

          <div class="form-group">
            <label>Additional Notes or Questions</label>
            <textarea v-model="form.notes" rows="4" placeholder="Anything else we should know – special requirements, feasibility concerns, questions about our pipeline / pricing, etc." />
          </div>

          <div class="submit-section">
            <button class="btn btn-primary" :disabled="isSubmitting || submitSuccess" @click="submitForm">
              {{ isSubmitting ? 'Submitting...' : (submitSuccess ? 'Submitted ✓' : 'Submit Intake Form') }}
            </button>
            <span
              v-if="submitMessage"
              class="submit-msg"
              :class="{ success: submitSuccess, error: !submitSuccess }"
            >
              {{ submitMessage }}
            </span>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="sidebar-info">
          <div
            v-for="card in intakePage.sidebarCards"
            :key="card.title"
            class="sidebar-card"
            :class="{ partnership: card.variant === 'partnership' }"
          >
            <h4>{{ card.title }}</h4>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p v-html="card.body" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.intake-page {
  padding-bottom: 4rem;
}

.token-error-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 2.5rem;
  box-shadow: var(--card-shadow);
  border: 1px solid rgba(0, 0, 0, 0.03);
  max-width: 560px;

  h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    font-weight: 400;
    margin-bottom: 0.8rem;
  }

  p {
    color: var(--muted);
    font-weight: 300;
    font-size: 0.92rem;
    line-height: 1.7;
    margin-bottom: 0.6rem;
  }
}

.form-page {
  padding: 3rem 2rem 4rem;
  max-width: 1080px;
  margin: 0 auto;

  h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 2rem;
    font-weight: 400;
    margin-bottom: 0.5rem;
  }

  > p {
    color: var(--muted);
    font-weight: 300;
    margin-bottom: 2.5rem;
    font-size: 0.95rem;
  }
}

.form-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 3rem;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.form-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 2.5rem;
  box-shadow: var(--card-shadow);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.form-section-label {
  font-family: 'DM Serif Display', serif;
  font-size: 1.1rem;
  font-weight: 400;
  margin-bottom: 1.2rem;
  color: var(--accent);
}

.form-divider {
  height: 1px;
  background: var(--line);
  margin: 2rem 0;
  opacity: 0.5;
}

.affil-toggle {
  display: flex;
  gap: 0;
  border: 1.5px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;

  button {
    flex: 1;
    padding: 0.6rem 1rem;
    font-size: 0.82rem;
    font-weight: 600;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    color: var(--muted);
    transition: all 0.2s;
    text-align: center;

    &.active {
      background: var(--accent);
      color: #fff;
    }
  }
}

.affil-info {
  font-size: 0.82rem;
  color: #555;
  font-weight: 300;
  line-height: 1.6;
  padding: 0.8rem 1rem;
  background: rgba(26, 82, 118, 0.04);
  border-radius: 4px;
  margin-bottom: 1.5rem;
  border-left: 3px solid var(--accent);

  strong {
    font-weight: 600;
    color: var(--ink);
  }
}

.mt-sm {
  margin-top: 0.6rem;
}

// Structured multi-select chips
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.4rem;
  border: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: 1.5px solid var(--line);
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--card);
  color: var(--ink);
  user-select: none;

  input[type="checkbox"] {
    width: 14px;
    height: 14px;
    margin: 0;
  }

  &:hover {
    border-color: var(--accent);
  }

  &.active {
    background: rgba(26, 82, 118, 0.08);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 500;
  }
}

// Numeric input with a static unit suffix (e.g. "months")
.num-suffix {
  display: flex;
  align-items: stretch;
  width: 50%;

  input {
    flex: 1;
    min-width: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;

    // Hide the number spinner arrows — they crowd out the digits in this narrow field
    -moz-appearance: textfield;
    appearance: textfield;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }

  .suffix {
    display: flex;
    align-items: center;
    padding: 0 0.8rem 0 0;
    border: 1.5px solid var(--line);
    border-left: none;
    border-radius: 0 4px 4px 0;
    background: var(--cream);
    color: var(--muted);
    font-size: 0.85rem;
    white-space: nowrap;
    transition: border 0.2s;
  }

  // Keep the suffix border in step with the input's focus highlight
  &:focus-within .suffix {
    border-color: var(--penn-blue);
  }
}

// Segmented yes/no & status toggles
.seg-toggle {
  display: inline-flex;
  border: 1.5px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.2rem;

  button {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    font-weight: 500;
    border: none;
    border-right: 1.5px solid var(--line);
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    color: var(--muted);
    transition: all 0.2s;

    &:last-child {
      border-right: none;
    }

    &.active {
      background: var(--accent);
      color: #fff;
    }
  }
}

// Cohort sample matrix estimator
.matrix-scroll {
  margin-top: 0.5rem;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--cream);
}

.matrix {
  border-collapse: collapse;
  width: 100%;
  min-width: 480px;

  th {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    font-weight: 600;
    text-align: center;
    padding: 0.55rem 0.4rem 0.4rem;
    white-space: nowrap;
  }

  th.m-group {
    text-align: left;
    padding-left: 0.7rem;
  }

  td {
    padding: 0.25rem 0.35rem;
    text-align: center;
  }

  td.m-group {
    padding-left: 0.7rem;
  }

  input {
    padding: 0.35rem 0.4rem;
    font-size: 0.82rem;
    border: 1.5px solid var(--line);
    border-radius: 4px;
    background: var(--card);
    color: var(--ink);
    width: 100%;
    text-align: center;
  }

  .m-group input {
    text-align: left;
  }

  .m-subs input,
  .m-tp input {
    font-family: 'JetBrains Mono', monospace;
  }

  .mono {
    font-family: 'JetBrains Mono', monospace;
  }

  .m-subs { width: 74px; }
  .m-tp { width: 62px; }

  .m-total {
    font-weight: 600;
    color: var(--accent);
    white-space: nowrap;
    padding-right: 0.6rem;
  }

  .m-x { width: 28px; }

  tfoot td {
    border-top: 1.5px solid var(--line);
    font-weight: 600;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  tfoot .m-group {
    text-align: left;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
}

.sched-remove {
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.2rem;
  border-radius: 4px;

  &:hover:not(:disabled) {
    color: var(--warm);
    background: rgba(0, 0, 0, 0.04);
  }

  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }
}

.sched-add {
  margin-top: 0.5rem;
  border: 1px dashed var(--line);
  background: transparent;
  color: var(--accent);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.45rem 0.9rem;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: rgba(26, 82, 118, 0.05);
    border-color: var(--accent);
  }
}

// Estimator summary
.estimator {
  margin-top: 1rem;
  margin-bottom: 1.75rem;
  background: rgba(26, 82, 118, 0.04);
  border: 1px solid rgba(26, 82, 118, 0.12);
  border-radius: 6px;
  padding: 1rem 1.2rem;
}

.est-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;

  span:first-child {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    color: var(--muted);
  }

  .est-total {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--accent);
  }
}

.est-sub {
  font-size: 0.78rem;
  color: var(--muted);
  margin: 0.2rem 0 0.8rem;
}

.est-bars {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.est-bar-row {
  display: grid;
  grid-template-columns: 130px 1fr 52px;
  gap: 0.6rem;
  align-items: center;
  font-size: 0.78rem;
}

.est-bar-label {
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .est-bar-date {
    color: var(--muted);
  }
}

.est-bar-track {
  height: 8px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.est-bar-fill {
  height: 100%;
  background: var(--penn-blue, var(--accent));
  border-radius: 4px;
  transition: width 0.25s;
}

.est-bar-val {
  font-family: 'JetBrains Mono', monospace;
  text-align: right;
  color: var(--accent);
  font-weight: 500;
}

.srv-list {
  margin-top: 0.5rem;
}

.srv-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  padding: 0.6rem 0;

  &:last-child {
    border-bottom: none;
  }
}

.srv-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;

  input[type="checkbox"] {
    flex-shrink: 0;
  }

  .srv-price {
    margin-left: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--muted);
    font-weight: 500;
    white-space: nowrap;
  }
}

.srv-qty-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 0 0.2rem 1.6rem;
  flex-wrap: wrap;

  .qty-label {
    font-size: 0.75rem;
    color: var(--muted);
    font-weight: 500;
    white-space: nowrap;
  }

  .qty-slider {
    flex: 1;
    min-width: 100px;
    max-width: 220px;
    height: 4px;
    appearance: none;
    background: var(--line);
    border-radius: 2px;
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--penn-blue);
      cursor: pointer;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    }
  }

  .qty-num {
    width: 60px;
    padding: 0.3rem 0.5rem;
    border: 1.5px solid var(--line);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    text-align: center;
    background: var(--cream);
    color: var(--ink);
  }

  .qty-subtotal {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--accent);
    white-space: nowrap;
    min-width: 80px;
    text-align: right;
  }
}

.cost-estimator {
  background: var(--ink);
  border-radius: var(--radius);
  padding: 1.5rem 1.8rem;
  color: #fff;
  margin-top: 1rem;
  margin-bottom: 1.5rem;

  h4 {
    font-size: 0.72rem;
    font-weight: 600;
    margin-bottom: 0.8rem;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .cost-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0;
    font-size: 0.85rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    &:last-of-type {
      border-bottom: none;
    }

    .cost-label {
      color: rgba(255, 255, 255, 0.6);
      font-weight: 300;
    }

    .cost-val {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
    }
  }

  .cost-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.8rem;
    margin-top: 0.5rem;
    border-top: 2px solid rgba(255, 255, 255, 0.15);
    font-weight: 600;

    .cost-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.3rem;
      color: var(--green-light);
    }
  }

  .cost-note {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 300;
    margin-top: 0.6rem;
  }
}

.submit-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;

  .submit-msg {
    font-size: 0.85rem;
    font-weight: 500;

    &.success {
      color: var(--green);
    }

    &.error {
      color: var(--warm);
    }
  }
}

.sidebar-info {
  position: sticky;
  top: calc(var(--nav-h) + 2rem);
}

.sidebar-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 1.8rem;
  box-shadow: var(--card-shadow);
  border: 1px solid rgba(0, 0, 0, 0.03);
  margin-bottom: 1.2rem;

  h4 {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.6rem;
  }

  p {
    font-size: 0.82rem;
    color: var(--muted);
    font-weight: 300;
    line-height: 1.6;

    strong {
      color: var(--ink);
      font-weight: 600;
    }
  }

  &.partnership {
    background: linear-gradient(135deg, #011F5B, #1a5276);
    color: #fff;
    border: none;

    h4 {
      color: rgba(255, 255, 255, 0.85);
    }

    p {
      color: rgba(255, 255, 255, 0.65);

      strong {
        color: #fff;
      }
    }
  }
}
</style>
