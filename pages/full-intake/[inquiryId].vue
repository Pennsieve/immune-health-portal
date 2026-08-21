<script setup lang="ts">
/**
 * Full Intake Form Page (token-gated)
 *
 * The rest of the study intake is captured internally by the I3H team; this
 * page only lets the PI review and submit Funding & Affiliation (billing)
 * details. /api/submit-intake only accepts and writes these billing fields —
 * no other inquiry data can be changed from here.
 */
import { useContentful } from '~/composables/useContentful'
import type { AffiliationType, IntakePageContent } from '~/types/index'

const { fetchSingleton } = useContentful()

const route = useRoute()
const inquiryId = route.params.inquiryId as string
const intakeToken = (route.query.token as string) || ''

interface BillingForm {
  affiliation: AffiliationType
  budgetCode: string
  fundingName: string
  baName: string
  baEmail: string
  ilabsId: string
  externalInstitution: string
  externalContact: string
}

const form = reactive<BillingForm>({
  affiliation: 'internal',
  budgetCode: '',
  fundingName: '',
  baName: '',
  baEmail: '',
  ilabsId: '',
  externalInstitution: '',
  externalContact: '',
})

const submitMessage = ref('')
const submitSuccess = ref(false)
const isSubmitting = ref(false)

// Affiliation handling — the only section the PI can still edit
const setAffiliation = (affiliation: AffiliationType) => {
  form.affiliation = affiliation
}

// Form submission — the server only accepts and writes these billing fields.
const submitForm = async () => {
  if (form.affiliation !== 'internal' && !form.externalInstitution.trim()) {
    submitMessage.value = '⚠ Please enter your institution name.'
    submitSuccess.value = false
    return
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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
    await $fetch('/api/submit-intake', {
      method: 'POST',
      body: {
        inquiryId,
        token: intakeToken,
        ...form,
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

// Verify the emailed token and pre-fill whatever billing info the admin
// already captured, so the PI isn't starting from a blank form.
interface IntakePrefill {
  affiliation: AffiliationType
  organization: string
  budgetCode: string
  fundingName: string
  baName: string
  baEmail: string
  contractingContact: string
  ilabsId: string
}

function hydrateForm(p: IntakePrefill) {
  form.affiliation = p.affiliation
  if (p.affiliation !== 'internal' && p.organization) form.externalInstitution = p.organization
  if (p.budgetCode) form.budgetCode = p.budgetCode
  if (p.fundingName) form.fundingName = p.fundingName
  if (p.baName) form.baName = p.baName
  if (p.baEmail) form.baEmail = p.baEmail
  if (p.contractingContact) form.externalContact = p.contractingContact
  if (p.ilabsId) form.ilabsId = p.ilabsId
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
  hydrateForm(prefill.value)
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
      <h1>Complete Your Funding &amp; Billing Details</h1>
      <p>The rest of your study intake was captured by the I3H team during your intake conversation. This page is just for finishing up funding &amp; billing information before we send your agreement package.</p>

      <div class="form-layout">
        <div class="form-card">
          <!-- Funding & Affiliation (the only section shown here) -->
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

          <div class="submit-section">
            <button class="btn btn-primary" :disabled="isSubmitting || submitSuccess" @click="submitForm">
              {{ isSubmitting ? 'Submitting...' : (submitSuccess ? 'Submitted ✓' : 'Submit') }}
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
