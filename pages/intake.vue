<script setup lang="ts">
/**
 * Lead Inquiry Page (public)
 *
 * A short first-contact form for new leads. The detailed study intake
 * is only sent later, via a tokenized link emailed by I3H staff after
 * the introductory conversation (see /full-intake/[inquiryId]).
 * All copy here is static; the Contentful intakePage content belongs
 * to the full intake form.
 */
import type { LeadFormData, AffiliationType } from '~/types/index'

const form = reactive<LeadFormData>({
  name: '',
  email: '',
  role: '',
  affiliation: 'internal',
  organization: '',
  referralSource: '',
  referralSourceOther: '',
  callPurpose: '',
  researchSummary: '',
})

const setAffiliation = (affiliation: AffiliationType) => {
  form.affiliation = affiliation
  if (affiliation === 'internal') form.organization = ''
}

const submitMessage = ref('')
const submitSuccess = ref(false)
const isSubmitting = ref(false)

const submitForm = async () => {
  if (!form.name || !form.email) {
    submitMessage.value = '⚠ Please fill in your name and email.'
    submitSuccess.value = false
    return
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.email)) {
    submitMessage.value = '⚠ Please enter a valid email address.'
    submitSuccess.value = false
    return
  }

  isSubmitting.value = true
  submitMessage.value = 'Sending inquiry...'

  try {
    await $fetch('/api/submit-lead', {
      method: 'POST',
      body: {
        form,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    })
    submitMessage.value = ''
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

// All copy on this page is lead-specific and hard-coded — the Contentful
// intakePage content (title, description, sidebar cards) belongs to the
// full intake form at /full-intake/[inquiryId].
const sidebarCards = [
  {
    title: 'Who we are',
    body: 'The Institute for Immunology & Immune Health (I3H) at Penn Medicine provides end-to-end immune profiling for research studies — sample collection and processing, CyTOF and custom assays, and analysis-ready data delivery.',
    variant: 'default',
  },
  {
    title: 'What happens next',
    body: '<strong>1.</strong> We review your inquiry and reach out within 3 business days.<br><strong>2.</strong> We schedule an introductory call to discuss your research and our services.<br><strong>3.</strong> If we’re a good fit, we send you our full study intake form to begin feasibility review.',
    variant: 'default',
  },
  {
    title: 'Prefer email?',
    body: 'Not ready for a form? Reach the I3H team directly at <a href="mailto:support@immunehealth.science"><strong>support@immunehealth.science</strong></a> and we’ll take it from there.',
    variant: 'partnership',
  },
]
</script>

<template>
  <div class="intake-page">
    <div class="form-page">
      <h1>Connect with Immune Health</h1>
      <p>Tell us a little about yourself and what you'd like to discuss. A member of the I3H team will reach out to schedule an introductory conversation.</p>

      <div class="form-layout">
        <div class="form-card">
          <!-- Success state replaces the form -->
          <div v-if="submitSuccess" class="lead-success">
            <h3>✓ Thanks, {{ form.name }} — we've received your inquiry.</h3>
            <p>Check your email for a confirmation. A member of the I3H team will reach out within <strong>3 business days</strong> to schedule a conversation.</p>
          </div>

          <template v-else>
            <div class="form-section-label">
              About you
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Name <span class="req">*</span></label>
                <input v-model="form.name" type="text" placeholder="First Last">
              </div>
              <div class="form-group">
                <label>Email <span class="req">*</span></label>
                <input v-model="form.email" type="email" placeholder="name@institution.edu">
              </div>
            </div>

            <div class="form-group">
              <label>Role</label>
              <input v-model="form.role" type="text" placeholder="e.g. Principal Investigator, Study Coordinator, Industry Scientist">
            </div>

            <div class="form-group">
              <label>Affiliation</label>
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
              <input
                v-if="form.affiliation !== 'internal'"
                v-model="form.organization"
                type="text"
                class="mt-sm"
                placeholder="Organization / institution name"
              >
            </div>

            <div class="form-divider" />

            <div class="form-section-label">
              Your inquiry
            </div>

            <div class="form-group">
              <label>How did you hear about us?</label>
              <select v-model="form.referralSource">
                <option value="">
                  Select...
                </option>
                <option v-for="opt in REFERRAL_SOURCE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <input
                v-if="form.referralSource === 'other'"
                v-model="form.referralSourceOther"
                type="text"
                class="mt-sm"
                placeholder="How did you find us?"
              >
            </div>

            <div class="form-group">
              <label>What would you like to discuss?</label>
              <input v-model="form.callPurpose" type="text" placeholder="e.g. New study inquiry, pricing questions, learning about your services">
            </div>

            <div class="form-group">
              <label>Tell us some about your research, idea, or any questions</label>
              <textarea v-model="form.researchSummary" rows="4" placeholder="A few sentences about your research, the idea you're exploring, or anything you'd like to ask" />
            </div>

            <div class="submit-section">
              <button class="btn btn-primary" :disabled="isSubmitting" @click="submitForm">
                {{ isSubmitting ? 'Submitting...' : 'Submit Inquiry' }}
              </button>
              <span
                v-if="submitMessage"
                class="submit-msg"
                :class="{ success: submitSuccess, error: !submitSuccess }"
              >
                {{ submitMessage }}
              </span>
            </div>
          </template>
        </div>

        <!-- Sidebar -->
        <div class="sidebar-info">
          <div
            v-for="card in sidebarCards"
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

.mt-sm {
  margin-top: 0.6rem;
}

.lead-success {
  h3 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.3rem;
    font-weight: 400;
    color: var(--green, #1a7a4c);
    margin-bottom: 0.8rem;
  }

  p {
    color: var(--muted);
    font-weight: 300;
    font-size: 0.92rem;
    line-height: 1.7;

    strong {
      color: var(--ink);
      font-weight: 600;
    }
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

      :deep(a) {
        color: #fff;
        text-decoration: underline;
      }
    }
  }
}
</style>
