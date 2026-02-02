<script setup lang="ts">
/**
 * Intake Form Page
 *
 * Form for submitting new immune profiling projects.
 * Requires authentication.
 */
import { useServicesStore } from '~/stores/services'
import type { IntakeFormData, ServiceRequest, AffiliationType, SampleType, PhlebotomyOption } from '~/types'

const servicesStore = useServicesStore()

// Form data
const form = reactive<IntakeFormData>({
  projectName: '',
  acronym: '',
  principalInvestigator: '',
  piEmail: '',
  projectLead: '',
  leadEmail: '',
  irbNumber: '',
  objectives: '',
  subjectCount: 0,
  timepointCount: 0,
  sampleType: 'fresh-blood',
  phlebotomyNeeds: 'ih-campus',
  services: [],
  affiliation: 'internal',
  budgetCode: '',
  fundingName: '',
  baName: '',
  baEmail: '',
  externalInstitution: '',
  externalContact: '',
  metadataPlan: '',
  notes: '',
})

const submitMessage = ref('')
const submitSuccess = ref(false)

// Computed values
const totalSamples = computed(() => form.subjectCount * form.timepointCount)

const estimatedTotal = computed(() => {
  return servicesStore.calculateTotal(form.services)
})

// Service selection handling
const selectedServices = ref<Set<string>>(new Set())
const serviceQuantities = ref<Record<string, number>>({})

const toggleService = (serviceId: string) => {
  if (selectedServices.value.has(serviceId)) {
    selectedServices.value.delete(serviceId)
    delete serviceQuantities.value[serviceId]
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

// Form submission
const submitForm = () => {
  // Validate required fields
  if (!form.projectName || !form.principalInvestigator || !form.piEmail ||
      !form.projectLead || !form.leadEmail || !form.objectives ||
      !form.subjectCount || !form.timepointCount || form.services.length === 0) {
    submitMessage.value = '⚠ Please fill in all required fields.'
    submitSuccess.value = false
    return
  }

  // Build email body
  const fields: Record<string, string> = {
    'Project Name': form.projectName,
    'Acronym': form.acronym || 'N/A',
    'Principal Investigator': form.principalInvestigator,
    'PI Email': form.piEmail,
    'Project Lead': form.projectLead,
    'Lead Email': form.leadEmail,
    'IRB Number': form.irbNumber || 'N/A',
    'Objectives': form.objectives,
    'Subjects': String(form.subjectCount),
    'Timepoints': String(form.timepointCount),
    'Total Samples': String(totalSamples.value),
    'Sample Type': form.sampleType,
    'Phlebotomy': form.phlebotomyNeeds,
    'Affiliation': form.affiliation,
    'Budget Code': form.budgetCode || 'N/A',
    'Metadata Plan': form.metadataPlan || 'N/A',
    'Notes': form.notes || 'N/A',
  }

  // Add services
  const servicesText = form.services.map((req) => {
    const service = servicesStore.services.find(s => s.id === req.serviceId)
    return `${service?.name || req.serviceId} (qty: ${req.quantity})`
  }).join(', ')
  fields.Services = servicesText

  let body = 'NEW IMMUNE HEALTH PROJECT INQUIRY\n' + '='.repeat(40) + '\n\n'
  for (const [key, value] of Object.entries(fields)) {
    if (value) body += `${key}: ${value}\n`
  }
  body += `\nEstimated Cost: $${estimatedTotal.value.toLocaleString()}`
  body += '\n\n' + '='.repeat(40) + `\nSubmitted: ${new Date().toLocaleString()}`

  // Open email client
  const subject = encodeURIComponent(`New IH Project Inquiry: ${form.projectName}`)
  const encodedBody = encodeURIComponent(body)
  window.open(
    `mailto:khas@pennmedicine.upenn.edu?cc=Allie.Greenplate@pennmedicine.upenn.edu,Amy.Baxter@pennmedicine.upenn.edu&subject=${subject}&body=${encodedBody}`,
    '_blank',
  )

  submitMessage.value = '✓ Email drafted – please send from your mail client.'
  submitSuccess.value = true
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
</script>

<template>
  <div class="intake-page">
    <div class="form-page">
      <h1>Start a New Immune Profiling Project</h1>
      <p>Complete this form to initiate a study with Immune Health. Our team will review your submission and reach out to discuss scope, timelines, and a formal User Agreement.</p>

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
            <input v-model="form.acronym" type="text" placeholder="e.g. BHB ColCan">
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
            <label>IRB Number</label>
            <div class="hint">
              If already approved
            </div>
            <input v-model="form.irbNumber" type="text" placeholder="e.g. 850567">
          </div>

          <div class="form-group">
            <label>Study Objectives <span class="req">*</span></label>
            <div class="hint">
              Describe your primary and secondary objectives
            </div>
            <textarea v-model="form.objectives" rows="4" placeholder="What are you trying to learn? What comparisons matter most?" />
          </div>

          <div class="form-divider" />

          <!-- Scope -->
          <div class="form-section-label">
            Scope of Work
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Estimated Unique Subjects <span class="req">*</span></label>
              <input v-model.number="form.subjectCount" type="number" placeholder="20">
            </div>
            <div class="form-group">
              <label>Time Points per Subject <span class="req">*</span></label>
              <input v-model.number="form.timepointCount" type="number" placeholder="3">
            </div>
          </div>

          <div class="form-group">
            <label>Total Estimated Samples</label>
            <div class="hint">
              Auto-calculated from subjects × time points
            </div>
            <input :value="totalSamples || '—'" type="text" readonly disabled>
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

            <div v-if="form.affiliation === 'internal'" class="affil-info">
              Billed through iLabs using your 26-digit Penn budget account number. Monthly invoicing. No contract required.
            </div>
            <div v-else-if="form.affiliation === 'external'" class="affil-info">
              External academic collaborations are processed via institutional contract. Monthly invoices issued after contract execution. Academic external rates apply.
            </div>
            <div v-else class="affil-info">
              Industry and corporate partnerships are handled through our Strategy & Business team. Pricing is customized and requires a formal partnership agreement. Contact <strong>Leonardo Guercio</strong> at <strong>lguercio@pennmedicine.upenn.edu</strong> to begin discussions.
            </div>
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

          <div class="form-divider" />

          <!-- Additional -->
          <div class="form-section-label">
            Additional Notes
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
            <label>Additional Notes or Questions</label>
            <textarea v-model="form.notes" rows="4" placeholder="Anything else we should know – special requirements, timeline constraints, etc." />
          </div>

          <div class="submit-section">
            <button class="btn btn-teal" @click="submitForm">
              Submit Inquiry
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
          <div class="sidebar-card">
            <h4>What Happens Next?</h4>
            <p>After submission, the Immune Health team reviews your request and contacts you within <strong>5 business days</strong> to discuss scope, feasibility, and pricing. A formal User Agreement is drafted after our initial meeting.</p>
          </div>

          <div class="sidebar-card">
            <h4>Required Before Work Begins</h4>
            <p>✓ Signed User Agreement<br>✓ Budget account or executed contract<br>✓ IRB approval (if applicable)<br>✓ Metadata collection plan<br>✓ Pennsieve access authorization</p>
          </div>

          <div class="sidebar-card">
            <h4>Typical Timelines</h4>
            <p>CyTOF batched in ≥10 samples. Raw data + QC within <strong>30 days</strong> after run. Final data transfer within <strong>4 weeks</strong> of acquisition.</p>
          </div>

          <div class="sidebar-card">
            <h4>Billing Contact</h4>
            <p>
              <strong>Kenneth Hassinger</strong><br>
              Director of Finance, I3H<br>
              khas@pennmedicine.upenn.edu<br><br>
              Penn internal: iLabs monthly invoicing<br>
              External: Monthly invoices via contract
            </p>
          </div>

          <div class="sidebar-card partnership">
            <h4>Partnership Opportunities</h4>
            <p>
              Exploring a deeper collaboration? We're open to strategic partnerships that leverage our standardized pipeline and cross-cohort dataset.<br><br>
              <strong>Leonardo Guercio</strong><br>
              lguercio@pennmedicine.upenn.edu
            </p>
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

.form-page {
  padding: 5rem 2rem 4rem;
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
  border-radius: 8px;
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
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border-left: 3px solid var(--accent);

  strong {
    font-weight: 600;
    color: var(--ink);
  }
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
      background: var(--teal);
      cursor: pointer;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    }
  }

  .qty-num {
    width: 60px;
    padding: 0.3rem 0.5rem;
    border: 1.5px solid var(--line);
    border-radius: 5px;
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
    background: linear-gradient(135deg, #1a3a5c, #1a5276);
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
