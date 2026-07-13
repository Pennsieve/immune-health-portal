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
// User Agreement requires the PI to confirm they've reviewed pricing before signing
const pricingAcknowledged = ref(false)
const canSign = computed(() => agreementId.value !== 'ua' || pricingAcknowledged.value)
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
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
        Secure signing link
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
          <h4>Acknowledgment submitted successfully</h4>
          <p>Your signature has been recorded and the I3H team has been notified. You'll receive a copy for your records, and I3H will follow up to formalize the agreement.</p>
        </div>
      </div>

      <div class="sign-hero">
        <div class="crumbs">Institute for Immunology &amp; Immune Health · {{ study.name }}</div>
        <h1>{{ (agreement as any).name }}</h1>
        <p>Please review the terms below carefully. Your signature records your acknowledgment of these terms and your intent to proceed. This is not a final contract — I3H will follow up to formalize the agreement through your institution's contracting process before work begins.</p>
      </div>

      <div class="sign-doc">
        <div class="sign-doc-head">
          <h2>{{ (agreement as any).name }}</h2>
          <div class="doc-meta">Ref: {{ study.abbreviation }}-{{ String((agreement as any).id).toUpperCase() }}-{{ new Date().getFullYear() }} · I3H/{{ study.irb }}</div>
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

          <!-- User Agreement -->
          <template v-if="agreementId === 'ua'">
            <h3>1. Scope of Services</h3>
            <p>
              I3H agrees to provide the following services in accordance with the study protocol approved
              under the above IRB number. All services will be performed using standardized I3H protocols
              unless prior written deviation is approved.
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

            <h3>4. Pricing &amp; Payment Terms</h3>
            <p>
              Services are billed at the rates published on the I3H services page. Invoices are issued on a
              per-batch basis through the iLabs Solutions platform against the account code on file. Payment
              is due within 30 days of invoice.
            </p>

            <div class="pricing-ack" :class="{ unchecked: !pricingAcknowledged }">
              <label>
                <input v-model="pricingAcknowledged" type="checkbox">
                <span>
                  I have reviewed and am aware of the pricing outlined on the
                  <a href="/services" target="_blank" rel="noopener">I3H services page</a>.
                  <span class="req-mark">*</span>
                </span>
              </label>
            </div>
          </template>

          <!-- LabVantage Sample Intake Form -->
          <template v-else-if="agreementId === 'lv'">
            <h3>1. Sample Registration &amp; Identification</h3>
            <p>
              This form authorizes I3H to register the study's biospecimens in the LabVantage LIMS and to
              assign unique, immutable sample identifiers under the project ID <strong>{{ study.abbreviation }}</strong>.
              Parent and child sample IDs are generated at accession and cannot be altered after assignment.
            </p>

            <h3>2. Chain of Custody</h3>
            <p>
              All samples are logged at receipt with date, time, condition, and originating site. Custody
              transfers between collection, processing, and storage are recorded in LabVantage to maintain a
              complete audit trail across the sample scope above.
            </p>

            <h3>3. Handling &amp; Storage</h3>
            <p>
              Samples are processed and stored under standardized I3H protocols appropriate to the declared
              sample type. Any special handling requirements provided at intake are attached to the sample
              records and honored where feasible.
            </p>
          </template>

          <!-- Pennsieve Data Sharing Agreement -->
          <template v-else>
            <h3>1. Data Hosting &amp; Workspace</h3>
            <p>
              Final datasets generated for this study are delivered to a dedicated Pennsieve workspace
              provisioned for <strong>{{ (study as any).affiliation_org }}</strong>. The PI's institution is
              the data owner of record.
            </p>

            <h3>2. Access Controls</h3>
            <p>
              Access to the workspace is granted only to individuals designated by the PI. I3H administers the
              workspace on the PI's behalf and may retain access solely for delivery, support, and
              de-identified quality benchmarking.
            </p>

            <h3>3. Data Retention &amp; Deletion</h3>
            <p>
              Data remains available in the Pennsieve workspace for the duration of the study and any agreed
              retention period. Upon written request, I3H will transfer ownership or remove I3H administrative
              access.
            </p>

            <h3>4. Compliance</h3>
            <p>
              Data hosting and sharing are conducted in accordance with Penn data governance policies and
              applicable HIPAA de-identification standards. Both parties agree to promptly report any suspected
              data incident.
            </p>
          </template>
        </div>

        <div class="sign-doc-foot">
          <div class="sign-row">
            <!-- PI signature block -->
            <div class="sign-block">
              <div class="lbl-big">Principal Investigator signature</div>
              <div v-if="!isSigned" class="sign-empty">
                Click "Sign this document" to add your signature
              </div>
              <div v-else class="sig-stamp" style="display:block;">
                <div class="sig-name">{{ signerName }}</div>
                <div class="sig-meta">Signed electronically</div>
                <div class="sig-verified">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  Signed by: {{ signerName }} ({{ signerEmail }})
                </div>
              </div>
            </div>

            <!-- I3H countersignature -->
            <div class="sign-block">
              <div class="lbl-big">I3H countersignature</div>
              <div class="sign-counter-box">
                <div class="name">Institute for Immunology &amp; Immune Health</div>
                <div class="note">I3H will review your submission and follow up to formalize this agreement.</div>
              </div>
            </div>
          </div>

          <div class="sign-cta-bar">
            <p class="legal">
              By signing, you confirm that you have read these terms and intend to proceed. This
              acknowledgment is not a final contract — I3H will formalize the agreement through your
              institution's contracting process before work begins.
              <template v-if="agreementId === 'ua' && !pricingAcknowledged && !isSigned">
                <br><strong style="color:#b7950b;">Please confirm the pricing acknowledgment above before signing.</strong>
              </template>
            </p>
            <div class="cta-btns">
              <button class="btn-back" @click="$router.back()">← Back</button>
              <button
                v-if="!isSigned"
                class="btn-sign"
                :disabled="isPreview || !canSign"
                @click="openClerk"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                  <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
                </svg>
                Sign this document
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

    <!-- Signature details modal -->
    <div v-if="showClerkModal" class="clerk-overlay" @click.self="showClerkModal = false">
      <div class="clerk-modal">
        <div class="cm-head">
          <div class="clerk-brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secure signing link
          </div>
          <h3>Confirm your details</h3>
          <p class="cm-lead">Confirm your name and email to sign this document.</p>
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
          <button class="btn-verify" @click="completeVerification">
            Confirm &amp; sign
          </button>
          <div class="cm-legal">
            By proceeding, you confirm that the details above are yours and that you intend to sign
            this document electronically. I3H will formalize the agreement through your institution's
            contracting process.
          </div>
        </div>
        <div class="cm-foot">
          Institute for Immunology &amp; Immune Health
        </div>
      </div>
    </div>
  </div>
</template>
