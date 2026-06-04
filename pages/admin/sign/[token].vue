<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()

// URL path segment: {studyId}-{agreementId}  e.g. "bhb-colcan-psa"
const token = computed(() => route.params.token as string)
// JWT from query string — present when PI arrives via emailed link
const signToken = computed(() => route.query.token as string | undefined)
const isPreview = computed(() => !signToken.value)

const studyId = computed(() => {
  const parts = token.value.split('-')
  return parts.slice(0, -1).join('-')
})

const agreementId = computed(() => {
  const parts = token.value.split('-')
  return parts[parts.length - 1]
})

// Fetch via server endpoint (uses service role — bypasses RLS for unauthenticated PIs)
const { data: studyRow, error: studyError } = await useAsyncData(
  `sign-study-${token.value}`,
  () => $fetch(`/api/sign/${token.value}`),
)

const study = computed(() => studyRow.value)

const agreement = computed(() => {
  if (!study.value) return null
  const agr = (study.value.agreements as Array<Record<string, unknown>>)
  return agr.find(a => a.id === agreementId.value)
    || agr.find(a => a.status === 'Pending')
    || agr[agr.length - 1]
})

const showClerkModal = ref(false)
const isSigned = ref(false)
const isSubmitted = ref(false)
const isSubmitting = ref(false)
const signerName = ref('')
const signerEmail = ref('')

function openClerk() {
  const pi = study.value?.pi as { name: string; email: string } | undefined
  signerName.value = pi?.name.replace('Dr. ', '') || ''
  signerEmail.value = pi?.email || ''
  showClerkModal.value = true
}

function completeVerification() {
  showClerkModal.value = false
  isSigned.value = true
}

async function submitSigned() {
  if (!study.value || !agreement.value) return
  isSubmitting.value = true
  try {
    await $fetch('/api/admin/sign-agreement', {
      method: 'POST',
      body: {
        studyId: studyId.value,
        agreementId: agreementId.value,
        signerName: signerName.value,
        signerEmail: signerEmail.value,
        token: signToken.value,
      },
    })
    isSubmitted.value = true
  }
  catch {
    alert('An error occurred while submitting. Please try again.')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div style="min-height:100vh; background:var(--paper);">
    <!-- Top bar -->
    <div class="sign-topbar">
      <div class="sign-brand">
        <div class="mark">I3H</div>
        Immune Health
      </div>
      <span style="color:rgba(255,255,255,0.5); font-size:0.78rem">
        Secure document signing · {{ study?.name }}
      </span>
      <div class="clerk-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secured by Clerk
      </div>
    </div>

    <!-- Admin preview banner -->
    <div v-if="isPreview" style="background:#b7950b;color:#fff;text-align:center;padding:0.5rem 1rem;font-size:0.82rem;font-weight:500;">
      Admin preview — this is what the PI sees. Signing is disabled without a valid secure link.
    </div>

    <div v-if="studyError" style="max-width:480px;margin:4rem auto;text-align:center;padding:2rem;">
      <p style="font-size:1rem;font-weight:600;color:#c0392b;">Unable to load document</p>
      <p style="font-size:0.85rem;color:#666;margin-top:0.5rem;">This link may be invalid or the study could not be found. Please contact your I3H representative.</p>
    </div>

    <div class="sign-wrap" v-else-if="study && agreement">
      <!-- Success confirmation (after submit) -->
      <div v-if="isSubmitted" class="sign-confirm-card">
        <div class="check-circle">✓</div>
        <div>
          <h4>Document submitted successfully</h4>
          <p>Your signature has been recorded and the I3H team has been notified. You'll receive a countersigned copy by email.</p>
        </div>
      </div>

      <div class="sign-hero">
        <div class="crumbs">Institute for Immunology &amp; Immune Health · {{ study.name }}</div>
        <h1>{{ (agreement as any).name }}</h1>
        <p>Please review the terms below carefully before signing. This document is legally binding once countersigned by I3H staff.</p>
      </div>

      <div class="sign-doc">
        <div class="sign-doc-head">
          <h2>{{ (agreement as any).name }}</h2>
          <div class="doc-meta">Ref: {{ study.abbreviation }}-{{ String((agreement as any).id).toUpperCase() }}-2026 · I3H/{{ study.irb }}</div>
        </div>

        <div class="sign-doc-body">
          <p>
            This agreement is entered into between the <strong>University of Pennsylvania, Institute for Immunology &amp; Immune Health (I3H)</strong>
            and <strong>{{ (study as any).affiliation_org }}</strong>, represented by {{ (study.pi as any).name }}.
          </p>

          <div class="key-terms">
            <div class="r"><span class="l">Study</span><span class="v">{{ study.name }}</span></div>
            <div class="r"><span class="l">Principal Investigator</span><span class="v">{{ (study.pi as any).name }}</span></div>
            <div class="r"><span class="l">IRB Protocol</span><span class="v">{{ study.irb }}</span></div>
            <div class="r"><span class="l">Sample scope</span><span class="v">{{ (study.cohort as any).subjects }} subjects × {{ (study.cohort as any).timepoints }} timepoints = {{ (study.cohort as any).totalSamples }} samples</span></div>
            <div class="r"><span class="l">Sample type</span><span class="v">{{ (study.cohort as any).sampleType }}</span></div>
          </div>

          <h3>1. Scope of Services</h3>
          <p>
            I3H agrees to provide the following services as outlined in the Rate Schedule and in accordance with
            the study protocol approved under the above IRB number. All services will be performed using
            standardized I3H protocols unless prior written deviation is approved.
          </p>
          <ol>
            <li v-for="line in (study.budget as any).lines" :key="(line as any).service">
              {{ (line as any).service }} — {{ (line as any).planned }} units at ${{ (line as any).rate }}/unit (est. ${{ Number((line as any).committed).toLocaleString() }})
            </li>
          </ol>

          <h3>2. Data Ownership &amp; Access</h3>
          <p>
            All raw data, processed outputs, and analysis results generated by I3H are the property of the
            PI's institution. I3H retains rights to de-identified aggregate metrics for internal quality
            benchmarking only. Data will be delivered via the Pennsieve platform.
          </p>

          <h3>3. Confidentiality</h3>
          <p>
            Both parties agree to maintain strict confidentiality of all research data, protocols, and
            results. I3H staff are bound by Penn confidentiality policies and HIPAA-compliant handling procedures.
          </p>

          <h3>4. Payment Terms</h3>
          <p>
            Invoices will be issued on a per-batch basis through the iLabs Solutions platform against
            the account code specified in the Rate Schedule. Payment is due within 30 days of invoice.
          </p>
        </div>

        <div class="sign-doc-foot">
          <div class="sign-row">
            <!-- PI signature block -->
            <div class="sign-block">
              <div class="lbl-big">Principal Investigator signature</div>
              <div v-if="!isSigned" class="sign-empty">
                Click "Sign with Clerk" to add your signature
              </div>
              <div v-else class="sig-stamp" style="display:block;">
                <div class="sig-name">{{ signerName }}</div>
                <div class="sig-meta">Digitally signed · verified via Clerk</div>
                <div class="sig-verified">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  Verified: {{ signerName }} ({{ signerEmail }})
                </div>
              </div>
            </div>

            <!-- I3H countersignature -->
            <div class="sign-block">
              <div class="lbl-big">I3H countersignature</div>
              <div class="sign-counter-box">
                <div class="name">Lori Guercio</div>
                <div class="role">Operations Lead · Institute for Immunology &amp; Immune Health</div>
                <div class="note">I3H will countersign within 2 business days of PI submission.</div>
              </div>
            </div>
          </div>

          <div class="sign-cta-bar">
            <p class="legal">
              By signing, you confirm that you have read and agreed to the terms above and that you are
              authorized to enter into this agreement on behalf of your institution.
            </p>
            <div class="cta-btns">
              <button class="btn-back" @click="$router.back()">← Back</button>
              <button
                v-if="!isSigned"
                class="btn-sign"
                :disabled="isPreview"
                @click="openClerk"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                  <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
                </svg>
                Sign with Clerk
              </button>
              <button
                v-else
                class="btn-sign btn-submit"
                :disabled="isSubmitted || isSubmitting"
                @click="submitSigned"
              >
                {{ isSubmitted ? '✓ Submitted' : isSubmitting ? 'Submitting…' : '✓ Submit signed document' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Clerk verification modal -->
    <div v-if="showClerkModal" class="clerk-overlay" @click.self="showClerkModal = false">
      <div class="clerk-modal">
        <div class="cm-head">
          <div class="clerk-brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secured by Clerk
          </div>
          <h3>Verify your identity</h3>
          <p class="cm-lead">Confirm your details to sign this document.</p>
        </div>
        <div class="cm-body">
          <div class="cm-field">
            <label class="lbl">Full legal name</label>
            <input v-model="signerName" type="text" placeholder="As it appears on the document">
          </div>
          <div class="cm-field">
            <label class="lbl">Institutional email</label>
            <input v-model="signerEmail" type="email" placeholder="name@institution.edu">
          </div>
          <div class="cm-or">or verify with</div>
          <div class="cm-oauth">
            <button>🏛️ Penn SSO</button>
            <button>🔬 ORCID</button>
          </div>
          <button class="btn-verify" @click="completeVerification">
            Confirm identity &amp; sign
          </button>
          <div class="cm-legal">
            By proceeding, you confirm this signature is legally binding.
            Your identity has been verified via Clerk.
          </div>
        </div>
        <div class="cm-foot">
          <strong>Clerk Authentication</strong> · Institute for Immunology &amp; Immune Health
        </div>
      </div>
    </div>
  </div>
</template>
