<script setup lang="ts">
/**
 * Sample Details Form (token-gated)
 *
 * Emailed to the PI/study lead once a study's agreement package is fully
 * countersigned (see the `allSigned` branch of
 * server/api/admin/sign-agreement.post.ts). Covers the handful of site
 * logistics questions that actually need a study-specific answer; the rest
 * of the original site-initiation checklist is sent as informational copy
 * in that same email instead of being asked here.
 */
import { SAMPLE_DETAILS_FIELDS, SAMPLE_DETAILS_SCALAR_FIELDS, normalizeContacts, type SampleDetailsContact } from '~/utils/sampleDetailsFields'

definePageMeta({ layout: false })

const route = useRoute()
const studyId = route.params.studyId as string
const token = (route.query.token as string) || ''

interface Prefill {
  studyName: string
  abbreviation: string
  piName: string
  answers: Record<string, unknown>
}

const tokenError = ref('')
const { data: prefill, error: prefillError } = await useAsyncData(
  `sample-details-${studyId}`,
  () => $fetch<Prefill>(`/api/sample-details/${studyId}`, { query: { token } }),
)
if (prefillError.value) {
  const err = prefillError.value as { data?: { statusMessage?: string } }
  tokenError.value = err.data?.statusMessage || 'This link is invalid'
}

const answers = reactive<Record<string, string>>({})
for (const field of SAMPLE_DETAILS_SCALAR_FIELDS) {
  answers[field.key] = (prefill.value?.answers?.[field.key] as string) || ''
}

// Stored in the same shape as the study's key_personnel field (see
// utils/sampleDetailsFields.ts), in case this list gets folded into that one
// later. Start with one blank row so the table isn't empty on first load.
const prefilledContacts = prefill.value?.answers?.operationalContacts as SampleDetailsContact[] | undefined
const contacts = reactive<SampleDetailsContact[]>(
  prefilledContacts?.length ? prefilledContacts.map(c => ({ ...c })) : [{ name: '', email: '', role: '' }],
)
function addContact() {
  contacts.push({ name: '', email: '', role: '' })
}
function removeContact(i: number) {
  contacts.splice(i, 1)
}

const submitMessage = ref('')
const submitSuccess = ref(false)
const isSubmitting = ref(false)

async function submitForm() {
  isSubmitting.value = true
  submitMessage.value = ''
  try {
    await $fetch('/api/submit-sample-details', {
      method: 'POST',
      body: {
        studyId,
        token,
        answers: { ...answers, operationalContacts: normalizeContacts(contacts) },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    })
    submitSuccess.value = true
    submitMessage.value = '✓ Thanks — your answers have been sent to the I3H team.'
  }
  catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    submitMessage.value = `❌ ${err.data?.statusMessage || 'Failed to submit. Please try again or contact us directly.'}`
    submitSuccess.value = false
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="intake-page">
    <!-- Invalid / expired link -->
    <div v-if="tokenError" class="form-page">
      <div class="token-error-card">
        <h1>This link isn't available</h1>
        <p>{{ tokenError }}.</p>
        <p>If your link has expired or you believe this is a mistake, reply to the email you received from the I3H team and we'll send you a fresh one.</p>
      </div>
    </div>

    <div v-else class="form-page">
      <h1>Sample Details Form</h1>
      <p v-if="prefill">
        A few operational questions for <strong>{{ prefill.studyName }}</strong> now that the study is
        activated — this helps the I3H team coordinate sample drop-off and processing with your team.
      </p>

      <div class="form-card">
        <div v-for="field in SAMPLE_DETAILS_FIELDS" :key="field.key" class="form-group">
          <label>{{ field.question }}</label>
          <div v-if="field.hint" class="hint">{{ field.hint }}</div>

          <div v-if="field.type === 'contacts'" class="contacts-table-wrap">
            <table class="contacts-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="(c, i) in contacts" :key="i">
                  <td><input v-model="c.name" type="text" placeholder="Full name"></td>
                  <td><input v-model="c.role" type="text" placeholder="e.g. Study coordinator"></td>
                  <td><input v-model="c.email" type="email" placeholder="name@example.edu"></td>
                  <td><button class="contacts-remove" type="button" title="Remove" @click="removeContact(i)">✕</button></td>
                </tr>
              </tbody>
            </table>
            <button class="contacts-add" type="button" @click="addContact">+ Add another contact</button>
          </div>

          <select v-else-if="field.type === 'select'" v-model="answers[field.key]">
            <option value="" disabled>Select one…</option>
            <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <textarea
            v-else-if="field.type === 'textarea'"
            v-model="answers[field.key]"
            rows="3"
            :placeholder="field.placeholder"
          />
          <input
            v-else
            v-model="answers[field.key]"
            type="text"
            :placeholder="field.placeholder"
          >
        </div>

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
  max-width: 720px;
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

.form-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 2.5rem;
  box-shadow: var(--card-shadow);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.form-group {
  margin-bottom: 1.6rem;

  label {
    display: block;
    font-size: 0.88rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
    color: var(--ink);
  }

  select, textarea, input {
    width: 100%;
    font-family: inherit;
    font-size: 0.9rem;
    padding: 0.6rem 0.75rem;
    border: 1.5px solid var(--line);
    border-radius: 4px;
    background: #fff;
    color: var(--ink);
  }

  textarea {
    resize: vertical;
  }
}

.contacts-table-wrap {
  overflow-x: auto;
}

.contacts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  th {
    text-align: left;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 600;
    padding: 0 0.4rem 0.4rem;
  }

  td {
    padding: 0.3rem 0.4rem 0.3rem 0;
    vertical-align: middle;
  }

  input {
    padding: 0.45rem 0.6rem;
    font-size: 0.85rem;
  }
}

.contacts-remove {
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.3rem 0.5rem;

  &:hover {
    color: var(--warm);
  }
}

.contacts-add {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0;
  font-family: inherit;
}

.hint {
  font-size: 0.8rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
  line-height: 1.5;
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
</style>
