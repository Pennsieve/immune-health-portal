<script setup lang="ts">
import { buildAgreementFields, TBD, type AgreementFields } from '~/utils/agreementFields'

definePageMeta({ layout: false })

const UA_TITLE = 'Immune Health Project User Agreement'
const UA_SUBTITLE = 'Onboarding for New Cohort Study'

const route = useRoute()

// URL path segment: {studyId}-{agreementId}  e.g. "bhb-colcan-ua"
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

// The document's field values are frozen onto the agreement's `snapshot` at
// generation time (see server/api/admin/approve-inquiry.post.ts) so a signed
// document stays a true record even if the study's live values (budget,
// cohort size, etc.) change afterward. Older agreements that predate the
// snapshot column fall back to resolving the fields live from the study.
const fields = computed<AgreementFields | null>(() => {
  if (!study.value) return null
  const snapshot = (agreement.value as { snapshot?: AgreementFields } | null)?.snapshot
  return snapshot || buildAgreementFields(study.value as never)
})

const showClerkModal = ref(false)
const isSigned = ref(false)
const isSubmitted = ref(false)
const isSubmitting = ref(false)
const signerName = ref('')
const signerEmail = ref('')

function openClerk() {
  // Prefill from the study's current PI (not the frozen document snapshot) —
  // this is about who is signing right now, not a term of the document.
  const pi = study.value?.pi as { name: string; email: string } | undefined
  signerName.value = pi?.name || ''
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

    <div class="sign-wrap" v-else-if="study && agreement && fields">
      <!-- Success confirmation (after submit) -->
      <div v-if="isSubmitted" class="sign-confirm-card">
        <div class="check-circle">✓</div>
        <div>
          <h4>Acknowledgment submitted successfully</h4>
          <p>Your signature has been recorded and the I3H team has been notified. You'll receive a copy for your records, and I3H will follow up to formalize the agreement.</p>
        </div>
      </div>

      <div class="sign-hero">
        <div class="crumbs">Institute for Immunology &amp; Immune Health · {{ fields.studyName }}</div>
        <h1>{{ UA_TITLE }}</h1>
        <p>Please review the terms below carefully. Your signature records your acknowledgment of these terms and your intent to proceed. This is not a final contract — I3H will follow up to formalize the agreement through your institution's contracting process before work begins.</p>
      </div>

      <div class="sign-doc">
        <div class="sign-doc-head">
          <h2>{{ UA_TITLE }}</h2>
          <div class="doc-meta">Ref: {{ fields.abbreviation }}-{{ String((agreement as any).id).toUpperCase() }}-{{ new Date().getFullYear() }} · I3H/{{ fields.irb }}</div>
        </div>

        <div class="sign-doc-body">
          <p class="subtitle">{{ UA_SUBTITLE }}</p>

          <p>
            This agreement is entered into between the <strong>University of Pennsylvania, Institute for Immunology &amp; Immune Health (I3H)</strong>
            and <strong><AgreementValue :value="fields.affiliationOrg" /></strong>, represented by <AgreementValue :value="fields.piName" />.
          </p>

          <div class="key-terms">
            <div class="r"><span class="l">Study</span><span class="v">{{ fields.studyName }}</span></div>
            <div class="r"><span class="l">Principal Investigator</span><span class="v"><AgreementValue :value="fields.piName" /></span></div>
            <div class="r"><span class="l">Project Lead</span><span class="v">{{ fields.projectLeadName || '—' }}</span></div>
            <div class="r"><span class="l">IRB Protocol</span><span class="v"><AgreementValue :value="fields.irb" /></span></div>
            <div class="r"><span class="l">Sample scope</span><span class="v"><AgreementValue :value="fields.subjectCount" /> subjects · {{ fields.cohortCount }} cohorts · <AgreementValue :value="fields.totalSamples" /> samples</span></div>
          </div>

          <h3>Pre-Launch Action Items</h3>
          <p>
            Please carefully read all items on this document and have it also read by any study member involved
            in it, as this pertains to ensuring the study agreement is clear and includes everyone involved in
            the study. Inter-team coordination and communication, sample collection, management, tracking, and
            reporting need to be discussed and established prior to any sample drop-off.
          </p>
          <p>
            Agreement of research and clinical data generation, acquisition, and transfer need also to be
            achieved pre-launch.
          </p>

          <h3>Statement of Work</h3>
          <p>
            <strong>Study title:</strong> {{ fields.studyName }}<span v-if="fields.abbreviation"> ({{ fields.abbreviation }})</span><br>
            <strong>Investigator:</strong> {{ fields.piName }} &lt;{{ fields.piEmail }}&gt;<br>
            <strong>Points of contact / project staff:</strong> <AgreementValue :value="fields.pointOfContactLine" /><br>
            <strong>Date:</strong> {{ fields.generatedOn }}
          </p>
          <h3>Study Synopsis</h3>
          <p><AgreementValue :value="fields.studySynopsis" /></p>
          <h3>Scope of Work</h3>
          <ol>
            <li>
              The number of subjects, timepoints, and total samples:
              <ol type="a">
                <!-- Reads naturally whether the underlying data is fully filled in
                     (dynamic numbers) or still incomplete, instead of gluing a TBD
                     placeholder into a number's position, e.g. "35 subjects
                     recruited (enrollment period <to be finalized ... >)" rather
                     than "35 subjects recruited over <to be finalized ... >". -->
                <li v-if="fields.enrollmentPeriod === TBD">
                  <AgreementValue :value="fields.subjectCount" /> subjects recruited (enrollment period <AgreementValue :value="fields.enrollmentPeriod" />)
                </li>
                <li v-else>
                  <AgreementValue :value="fields.subjectCount" /> subjects recruited over {{ fields.enrollmentPeriod }}
                </li>
                <li v-if="fields.visitCount === TBD">
                  Visit schedule <AgreementValue :value="fields.visitCount" />
                </li>
                <li v-else>{{ fields.visitCount }} visits</li>
                <li><AgreementValue :value="fields.totalSamples" /> total samples</li>
              </ol>
            </li>
            <li>
              <template v-if="fields.tubeType === TBD">
                Collection tube type <AgreementValue :value="fields.tubeType" />.
              </template>
              <template v-else>
                Fresh whole blood in {{ fields.tubeType }}<template v-if="fields.tubesPerVisit">, {{ fields.tubesPerVisit }} tube(s) per visit</template>.
              </template>
            </li>
            <li v-if="fields.budgetLines.length">
              Selected services:
              <ol type="a">
                <li v-for="line in fields.budgetLines" :key="line.service">
                  {{ line.service }} for {{ line.planned }} sample{{ line.planned === 1 ? '' : 's' }}
                </li>
              </ol>
            </li>
          </ol>

          <h3>Project Management</h3>
          <p>
            Project Management is a joint task between the Investigator and Immune Health. {{ fields.projectLeadName || 'The person listed above as Points of contact / project staff' }}
            will serve as the Project Manager of the Investigator's team (Investigator Project Manager). Immune
            Health's Pillar Leaders will serve as Project Managers for each stage of the project (IH Project
            Manager).
          </p>
          <p>The Investigator project manager will be responsible for the following:</p>
          <ul>
            <li>Ensuring that responses are provided to emails in an appropriate time frame.</li>
            <li>Identifying key scientific comparisons and communicating them to the IH team.</li>
            <li>Writing and submitting any abstracts or manuscripts arising from data collected.</li>
            <li>Designing and generating figures beyond the scope of agreed upon report generation.</li>
            <li>Executing bespoke data analysis beyond the scope of agreed upon data analysis provided by IH.</li>
          </ul>
          <p>The IH project manager(s) will be responsible for the following:</p>
          <ul>
            <li>Clear and timely communication.</li>
            <li>Routine status updates for all stages of the project.</li>
            <li>Ensuring that the study is progressing in a timely manner.</li>
            <li>Ensuring that all research is conducted under the ethical guidelines of the University of Pennsylvania.</li>
            <li>Alerting the Investigator and/or Lead Contact to any unexpected delays or roadblocks.</li>
            <li>Ensuring that all deliverables are of high quality.</li>
          </ul>

          <h3>Platform/Assay QC Policy</h3>
          <p>
            <strong>Sample batching:</strong> Samples will be acquired in batches as required according to
            investigator-defined experiment and cohort design. Validated and standardized reference control
            samples will be run with each sample batch. This reference control will be compared across batches
            for a given study to monitor assay performance over time. Deviations of &gt;20% from expected values
            will be reported. For cytometry-based assays, the coefficients of variance (CV) for select gated
            immune populations will be determined. Populations with CV &gt;25% will be flagged and investigated.
          </p>
          <p>
            <strong>Instrument set up:</strong> For Platform assays run in house, cytometry instruments will be
            set up by experienced personnel following manufacturer's protocols. Instrument-appropriate
            calibration will be performed daily, and all calibration reports will be saved. All instruments must
            pass manufacturer's QC before acquisition will proceed. For CyTOF assays, EQ4 standardization beads
            will be added to samples prior to acquisition for signal normalization. For flow cytometry assays,
            compensation/spectral unmixing will be performed prior to sample acquisition using standardized
            single-color controls.
          </p>
          <p>
            <strong>Data quality control:</strong> Following acquisition, analyte/marker intensity and/or
            distribution will be inspected for each sample. Divergence metrics will be computed for all samples
            within a batch. Samples with divergence &gt; 2 x standard deviation compared to the average
            divergence will be flagged as outliers and manually reviewed for technical or biological causes.
          </p>
          <p>
            Attempts will be made to normalize batch/sample deviations attributed to technical, not biological,
            causes. Refunds will be issued for any samples that fail QC due to operator error or non-adherence
            to established Immune Health SOPs. Samples failing QC due to poor sample quality or other causes
            outside of operator control will not be refunded.
          </p>

          <h3>Data Management and Confidentiality</h3>
          <p>
            All data generated by Immune Health will be provided to the Principal Investigators in raw file
            formats. Immune Health will also provide periodical study analysis reports and a final analysis
            report. Such reports include detailed summaries of each pipeline and QC analysis. Our policy
            emphasizes transparency and accessibility, ensuring that data generated by each team is readily
            available to all study members while safeguarding intellectual property rights. Our guidelines for
            data formatting, storage, and retrieval facilitate integration and interoperability among diverse
            datasets. If any funding agency for this study requires the raw data to be shared publicly in a
            repository or any other form, it is the PI's responsibility to build and upload such repository(ies)
            in the appropriate manner and timeframe.
          </p>
          <p>
            Immune Health has been working to build a database (Pennsieve) for longitudinal immunology studies.
            Pennsieve will allow us to easily organize and search multiple data modalities across multiple
            cohorts, subjects, and timepoints. To streamline workflows and reduce errors, Pennsieve will
            populate based on our LIMS system, LabVantage. Data populated from LabVantage includes metadata
            associated with sample processing. More information about the data released from LabVantage can be
            found in the Pennsieve section below. It is therefore a pre-requisite that at least one member from
            the PI's team has access and is trained in using LabVantage prior to starting any study with Immune
            Health.
          </p>
          <p>
            Collection of the clinical metadata must be discussed and agreed upon before the study starts,
            together with an established plan for transfer of such data to Immune Health. All clinical metadata
            will be shared and stored only in UPHS-approved devices and storage methods that are approved to
            manage and protect anything considered patients' health information (PHI). Metadata should be
            collected and recorded using REDCap, and in case that is not possible, a feasible and reliable
            alternative method needs to be agreed upon.
            Ideally, the metadata will include:
          </p>
          <ul>
            <li>Participant_ID (LabVantage)</li>
            <li>Study name (LabVantage)</li>
            <li>Visit date (LabVantage)</li>
            <li>Age</li>
            <li>Sex</li>
            <li>Race/Ethnicity</li>
            <li>Primary Diagnosis</li>
            <li>Primary Treatment</li>
            <li>Optional: Other active medications (list, free text)</li>
            <li>Optional: Other diagnoses (list, free text)</li>
          </ul>
          <p>
            Additionally, Pennsieve will be used to store experimental data generated by Immune Health. Data
            will be accessible to the Immune Health team and anyone else designated by the Investigator. For any
            analysis, publication, and licensure all direct identifiable personal health information (PHI) will
            be removed. This use by IH is supported under IRB 26-6364. Upon publication, the Investigator may
            choose to (but is not required to) make data public on this platform. By working with Immune Health,
            the Investigator agrees to authorize the release of LabVantage data to Pennsieve and to have
            IH-generated data uploaded to the Pennsieve platform.
          </p>

          <h3>Informed Consent Language</h3>
          <p>
            Since Immune Health will process samples for this study, the following language should be added to
            the study's informed consent form to cover the I3H database (Pennsieve) and other future work that
            could result from the use of the collected samples and generated data.
          </p>
          <p class="quote-block">
            "Samples from this study may be processed at the Institute for Immunology and Immune Health (I3H).
            Immune Health (IH) may partner with other entities (academic collaborators and commercial partners).
            For any analysis (which may include profiling/sequencing or proteomics testing), publication,
            disclosure, or licensure to third parties, your direct identifiable personal health information
            (PHI) will be removed. The PHI is being collected and used internally at Penn to link you to your
            EMR data and potential participation in other research studies that have used or will use I3H
            immune health processing. Your data may become part of a long-term storage database that correlates
            disease state to medical management. I3H maintains the data in systems such as REDCap, Pennsieve,
            LabVantage, and other Penn-based approved secure storage systems. The de-identified data in the
            database may one day be accessed by researchers around the world who may analyze this information
            to develop new methods for evaluating the human immune system. This includes the potential of
            training an AI model and development of commercial products. You accept the use of your samples and
            data for this potential future use by signing this consent. This work with the data from this study
            is approved under a separate IRB at Penn Medicine IRB#26-6364. For more questions about I3H please
            contact IHCRCMP@pennmedicine.upenn.edu."
          </p>
          <p v-if="fields.hasBloodDrawService">
            Mobile Phlebotomy:<br>
            <p class="quote-block">
              "Getting your blood drawn in considered a minimal risk event. The most common risks with a blood draw
              are brief pain and/or bruising. There are other minimal risks of inflammation or infection of the
              vein, decreased blood pressure, dizziness, or fainting that can occur during or after your sample is
              drawn.<br><br>
              In this study you will have blood draws either on campus at the hospital or off campus with Immune
              Health’s mobile phlebotomy unit. This means a trained phlebotomist or clinician may travel to you to
              do a blood draw.  This service is optional and being provided as a convenience due to the time
              constrains for blood collection after starting treatment in this study. You can always choose to
              return to campus for all blood draws. Having blood drawn at a remote location does not increase your
              risk in this study, but you acknowledge that if you have an adverse event, the risks of which are
              minimal, you will not be in a hospital setting and you may need to get to a hospital for further
              care. In signing this consent and agreeing to having visits outside of the hospital, you acknowledge
              that risk.<br><br>
              You should notify the study staff of any illness or adverse effects that occur during this study as
              soon as possible."
            </p>
          </p>

          <h3>Data Sharing and Authorship</h3>
          <p>
            Data generated in this study might be used by Immune Health to generate new analytical tools to
            interrogate the immune system's phenotype and function. Raw data generated by Immune Health services
            will not be shared with third parties unless a specific NDA is signed by IH and the involved parties
            (academic collaborators and commercial alliances). Analytical tools and uses thereof using data from
            studies enrolled with IH constitute the intellectual property of Immune Health. Additionally, in
            compliance with NIH's Data Management and Sharing Policy (<a href="https://grants.nih.gov/grants/guide/notice-files/NOT-OD-21-013.html" target="_blank" rel="noopener">NOT-OD-21-013</a>), we are committed to the
            responsible sharing of scientific data to advance research and enhance transparency. Some of the
            data generated from this project might be shared and made accessible to the public unless restricted
            by ethical or legal concerns. For that type of publicly available shared data, data will be stored
            in NIH-approved repositories and made available following FAIR principles (Findable, Accessible,
            Interoperable, and Reusable). If using such data results in a publication, these data will be shared
            no later than the publication of the main findings.
          </p>
          <p>
            Intellectual property (IP) arising from and authorship in scientific publications of any type that
            involves data generated by Immune Health will be discussed before the signing of this user
            agreement. In brief, all parties involved must explicitly discuss and disclose their policies and
            preferences regarding authorship. IH and investigators agree to open dialogue about authorship and
            IP. IH might generate articles that use this study as a data source for high-dimensional
            systems-level characterization and description of immune phenotypes and functions that integrate
            different IH-enrolled studies.
          </p>

          <h3>Timelines</h3>
          <ul>
            <li v-if="fields.hasCytofService">
              <em>CyTOF is generally performed in batches of at least 10 samples. Raw data and QC data can be
              expected within 30 days after the run is complete.</em>
            </li>
            <li>
              The estimated timeline for the project is as follows:
              <ul>
                <li>
                  Estimated enrollment date of first subject: <AgreementValue :value="fields.firstSampleDate" />.
                </li>
                <li>
                  After approximately <AgreementValue :value="fields.subjectCount" /> subjects and <AgreementValue :value="fields.visitCount" />
                  timepoints/subject, the project is completed and will depend on participant retention and
                  available funds.
                </li>
              </ul>
            </li>
          </ul>

          <h3>Budget</h3>
          <p>
            The total budget for the project is <strong><AgreementValue :value="fields.totalBudget" /></strong>. A budget code is
            required to begin any work. No services will be provided, including phlebotomy or sample processing,
            without a budget code.
          </p>
          <p>
            I3H agrees to provide the following services in accordance with the study protocol approved
            under the above IRB number. All services will be performed using standardized I3H protocols
            unless prior written deviation is approved.
          </p>
          <ol>
            <li v-for="line in fields.budgetLines" :key="line.service">
              {{ line.service }} — {{ line.planned }} units at ${{ line.rate }}/unit (est. ${{ line.committed.toLocaleString() }})
            </li>
          </ol>
          <p><strong>Estimated grand total: <AgreementValue :value="fields.totalBudget" /></strong></p>
          <p>
            <strong>Funding Support</strong> — budget account number(s) to be billed in support of the project:
          </p>
          <div v-if="fields.isInternal" class="key-terms">
            <div class="r"><span class="l">Account / budget code</span><span class="v"><AgreementValue :value="fields.fundingAccount" /></span></div>
            <div class="r"><span class="l">Funding source (CAMS)</span><span class="v"><AgreementValue :value="fields.fundingName" /></span></div>
            <div class="r"><span class="l">Business Administrator</span><span class="v"><AgreementValue :value="fields.baName" /></span></div>
            <div class="r"><span class="l">BA contact</span><span class="v"><AgreementValue :value="fields.baEmail" /></span></div>
          </div>
          <div v-else class="key-terms">
            <div class="r"><span class="l">Contracting / grants office contact</span><span class="v"><AgreementValue :value="fields.contractingContact" /></span></div>
          </div>
          <p>
            <strong>Payment Terms:</strong> Monthly invoices will be billed through iLabs. Note that the rates
            are reevaluated at the start of each new fiscal year to account for increases in staff salary and
            consumable costs. Any questions regarding billing or rates can be directed to Kenneth Hassinger
            &lt;khas@pennmedicine.upenn.edu&gt;.
          </p>

          <h3>Pennsieve</h3>
          <p>
            The Institute for Immunology and Immune Health (I3H) at the University of Pennsylvania's Perelman
            School of Medicine supports human immune profiling for impact across medical disciplines.
          </p>
          <p>
            I3H uses the LabVantage LIMS software platform to track and store sample information for samples
            that they process. The LabVantage platform is used widely at the University and at the School of
            Medicine.
          </p>
          <p>
            An integration exists which allows data to be extracted from LabVantage LIMS and loaded into the
            Pennsieve Data Management Platform (app.pennsieve.io), which provides a scalable cloud-based
            solution for managing, analyzing, and sharing scientific datasets. Pennsieve supports meaningful
            curation of data in context and is used to publish high-quality, citable datasets to the larger
            scientific community.
          </p>
          <p>The integration requires sending the data listed below from LabVantage to Pennsieve:</p>
          <ul>
            <li>Study ID (Name of Study)</li>
            <li>External Participant ID (ID for participant in Study)</li>
            <li>Creation date (Date participant created in LabVantage)</li>
            <li>Participant Event ID (Internal LabVantage ID for a visit)</li>
            <li>Participant ID (Internal LabVantage ID for a participant)</li>
            <li>Cohort ID (Cohort name, typically "Participant" if the study does not use cohorts)</li>
            <li>Visit Type (Type of Visit – Collection, Dosing, Follow-up, etc. – LabVantage annotation)</li>
            <li>Event date (Date of visit)</li>
            <li>Event status (Status of visit – Pending, Complete, Late, etc. – LabVantage annotation)</li>
            <li>Event name (Name of visit which maps to the name of the visit in the protocol)</li>
            <li>Sample ID (Internal LabVantage sample ID on sample barcode – e.g., S-220720-00001)</li>
            <li>Sample Type (Whole Blood, Saliva, Urine, etc.)</li>
            <li>Specimen Type (Sample container – e.g., Green Top Tube)</li>
            <li>Storage Status (LabVantage sample status – Allocated, In Circulation, Disposed, etc.)</li>
            <li>Sample Name (Human-readable name for the sample, e.g., V1WB1 for Visit 1 Whole Blood 1)</li>
            <li>Test Name (Name of an assay applied to the sample)</li>
          </ul>
          <p>
            The LabVantage LIMS team takes data stewardship seriously and does not release data from the system
            to anyone other than the owning group without permission from the data owner.
          </p>
          <p>
            The I3H analytics team supports collaborative research through data sharing using Pennsieve. Data
            can be shared within your group, with internal collaborators at Penn, or with external groups.
          </p>

          <h3>Informed Consent</h3>
          <p>
            All new protocols sending samples to Immune Health (IH) should have Penn template ICF language for
            Collection of Identifiable Specimens and Future Use of Data and Specimens:
          </p>
          <p class="quote-block">
            "Your samples may be used to create products, including some that may be sold and/or make money for
            others. If this happens, there are no plans to tell you, or to pay you, or to give any compensation
            to you or your family."
          </p>
          <p class="quote-block">
            "Whole genome sequencing (WGS) may be conducted on your samples. Whole genome sequencing involves
            analyzing your entire personal genetic code. WGS can be conducted to determine changes and mutations
            in DNA. The significance of these results may not be well defined. Not all genetic variations affect
            one's health."
          </p>
          <p class="quote-block">
            "Your coded or identifiable information and samples will be stored for future research purposes.
            Future researchers may receive information that could identify you. This can be done without again
            seeking your consent in the future, as permitted by law. The future use of your information and
            samples only applies to the information and samples collected on this study."
          </p>
          <p>Finish following the Common Rule future use requirement language. Along with adding the following recommended consent language:</p>
          <p class="quote-block">
            "Samples from this study may be processed at the Institute for Immunology and Immune Health (I3H).
            Immune Health (IH) may partner with other entities (academic collaborators and commercial partners).
            For any analysis (which may include profiling/sequencing or proteomics testing), publication,
            disclosure, or licensure to third parties, your direct identifiable personal health information
            (PHI) will be removed. The PHI is being collected and used internally at Penn to link you to your
            EMR data and potential participation in other research studies that have used or will use I3H
            immune health processing. Your data may become part of a long-term storage database that correlates
            disease state to medical management. I3H maintains the data in systems such as REDCap, Pennsieve,
            LabVantage, and other Penn-based approved secure storage systems. The de-identified data in the
            database may one day be accessed by researchers around the world who may analyze this information
            to develop new methods for evaluating the human immune system. This includes the potential of
            training an AI model and development of commercial products. You accept the use of your samples and
            data for this potential future use by signing this consent. This is work with the data from this
            study is approved under a separate IRB at Penn Medicine IRB#26-6364. For more questions about I3H
            please contact IHCRCMP@pennmedicine.upenn.edu."
          </p>
          <p>
            In the eIRB system, go to "Connected Projects" and "IRB Protocol Connections" then click "+ Connect
            IRB Protocol", add PI: Wherry, E.J and IRB Protocol #: 26-6364. The IH team will add your IRB number
            to the connected projects in the 26-6364 application after the agreement has been signed.
          </p>

          <h3>Contacts</h3>
          <ul class="contact-list">
            <li><strong>Director of Immune Health</strong> — Allie Greenplate, PhD · <a href="mailto:Allie.Greenplate@pennmedicine.upenn.edu">Allie.Greenplate@pennmedicine.upenn.edu</a></li>
            <li><strong>Regulatory</strong> — Julia Vresilovic · <a href="mailto:Julia.Vresilovic@pennmedicine.upenn.edu">Julia.Vresilovic@pennmedicine.upenn.edu</a></li>
            <li><strong>Platforms</strong> — Michelle McKeague, PhD · <a href="mailto:Michelle.Mckeague@pennmedicine.upenn.edu">Michelle.Mckeague@pennmedicine.upenn.edu</a></li>
            <li><strong>Processing Unit</strong> — Sharon Adamski, MS · <a href="mailto:sadamski@pennmedicine.upenn.edu">sadamski@pennmedicine.upenn.edu</a></li>
            <li><strong>Finance</strong> — Ken Hassinger · <a href="mailto:khas@pennmedicine.upenn.edu">khas@pennmedicine.upenn.edu</a></li>
            <li><strong>Data Storage &amp; Management</strong> — Joost Wagenaar, PhD · <a href="mailto:joostw@seas.upenn.edu">joostw@seas.upenn.edu</a></li>
            <li><strong>Data Analytics</strong> — Dokyoon Kim, PhD · <a href="mailto:Dokyoon.Kim@pennmedicine.upenn.edu">Dokyoon.Kim@pennmedicine.upenn.edu</a></li>
          </ul>

          <h3>Acceptance</h3>
          <p>
            Please sign below acknowledging that you have reviewed and approved the study proposal and can
            cover the costs outlined above. Should any changes be made to the scope or design of this study,
            all parties must be notified within 5 business days, and an addendum will be added to this user
            agreement.
          </p>
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
