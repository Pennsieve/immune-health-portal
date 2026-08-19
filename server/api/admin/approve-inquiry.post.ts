import { serverSupabaseServiceRole } from '#supabase/server'
import { createSignToken, createStatusToken } from '~/server/utils/signing'
import { AGREEMENTS } from '~/utils/agreements'
import { buildAgreementFields } from '~/utils/agreementFields'

function parseRate(rateVal: string | number): number {
  if (typeof rateVal === 'number') return rateVal
  const match = rateVal.match(/\$?([\d,]+)/)
  return match ? parseInt(match[1].replace(/,/g, '')) : 0
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { inquiryId, timezone } = await readBody(event)

  if (!inquiryId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing inquiryId' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: inquiry, error: fetchErr } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .single()

  if (fetchErr || !inquiry) {
    throw createError({ statusCode: 404, statusMessage: 'Inquiry not found' })
  }
  if (inquiry.status === 'Approved' || inquiry.status === 'Declined') {
    throw createError({ statusCode: 409, statusMessage: 'Inquiry already processed' })
  }
  // Leads can't be approved — the study record is built from the full intake
  if (inquiry.status !== 'New') {
    throw createError({ statusCode: 409, statusMessage: 'The full intake form has not been submitted yet' })
  }

  const tz = timezone || DEFAULT_TIMEZONE
  const approvedDate = new Date().toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })

  // Generate a unique study ID from the abbreviation
  const abbr = ((inquiry.abbreviation as string) || (inquiry.study_name as string))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const studyId = `${abbr}-${Math.random().toString(36).slice(2, 6)}`

  // Build budget lines from services_detail
  const servicesDetail = (inquiry.services_detail as Array<{ name: string; qty: number; rate: string | number }>) || []
  const lines = servicesDetail.map(svc => {
    const rate = parseRate(svc.rate)
    return {
      service: svc.name,
      rate,
      planned: svc.qty,
      completed: 0,
      committed: rate * svc.qty,
      invoiced: 0,
    }
  })
  const committed = lines.reduce((sum, l) => sum + l.committed, 0)

  // True projected sample total from the cohort matrix (sample_schedule).
  const TIMEPOINT_KEYS = ['base', 'w24', 'w52', 'w104']
  const sampleSchedule = (inquiry.sample_schedule as Array<{ name?: string; subjects?: number; samples?: Record<string, number> }>) || []
  const cohortGroups = sampleSchedule.map(g => ({
    name: g.name || '',
    subjects: Number(g.subjects) || 0,
    samples: Object.fromEntries(TIMEPOINT_KEYS.map(k => [k, Number(g.samples?.[k]) || 0])),
  }))
  const matrixTotal = cohortGroups.reduce(
    (sum, g) => sum + g.subjects * Object.values(g.samples).reduce((a, b) => a + b, 0),
    0,
  )
  const totalSamples = matrixTotal

  const cohort = {
    subjects: inquiry.cohort_subjects,
    totalSamples,
    processedSamples: 0,
    sampleType: inquiry.sample_type || 'TBD',
    groups: cohortGroups,
  }
  const budget = {
    committed,
    invoiced: 0,
    remaining: committed,
    pctInvoiced: 0,
    accountCode: (inquiry.budget_code as string) || null,
    fundingName: (inquiry.funding_name as string) || null,
    baName: (inquiry.ba_name as string) || null,
    baEmail: (inquiry.ba_email as string) || null,
    contractingContact: (inquiry.contracting_contact as string) || null,
    lines,
  }

  // 1. Create study
  const { error: studyErr } = await supabase.from('studies').insert({
    id: studyId,
    name: inquiry.study_name,
    abbreviation: inquiry.abbreviation,
    pi: inquiry.pi,
    study_lead: inquiry.study_lead,
    affiliation: inquiry.affiliation,
    affiliation_org: inquiry.affiliation_org,
    irb: inquiry.irb,
    stage: 'Awaiting Signature',
    is_locked: true,
    cohort,
    budget,
    integrations: {},
    intake_details: inquiry.intake_details || {},
    objectives: inquiry.objectives,
    additional_notes: inquiry.additional_notes || null,
    phlebotomy: inquiry.phlebotomy,
    metadata_desc: inquiry.metadata,
    lifecycle: [
      { label: 'Inquiry',    date: inquiry.submitted_date, status: 'done' },
      { label: 'Review',     date: approvedDate,           status: 'done' },
      { label: 'Approved',   date: approvedDate,           status: 'done' },
      { label: 'Agreements', date: 'in progress',          status: 'active' },
      { label: 'Activated',  date: '—',                    status: 'pending' },
      { label: 'Processing', date: '—',                    status: 'pending' },
      { label: 'Complete',   date: '—',                    status: 'pending' },
    ],
    updated_relative: 'just now',
    activity: [
      { dotClass: '', title: 'Agreement package sent to PI', date: `${approvedDate} · MailerSend` },
      { dotClass: '', title: 'Intake approved',              date: approvedDate },
      { dotClass: '', title: 'Intake submitted',             date: `${inquiry.submitted_date as string} · via public intake form` },
    ],
  })

  if (studyErr) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create study record' })
  }

  // 2. Create all agreements — the document's field values are resolved and
  // frozen onto `snapshot` now, so the signed document stays a true record
  // even if the study's live values (budget, cohort size, etc.) change later.
  const agreementSnapshot = buildAgreementFields({
    name: inquiry.study_name as string,
    abbreviation: inquiry.abbreviation as string,
    irb: inquiry.irb as string,
    affiliation_org: inquiry.affiliation_org as string,
    pi: inquiry.pi as { name: string; email: string },
    study_lead: inquiry.study_lead as { name: string; email: string } | null,
    cohort,
    budget,
    objectives: inquiry.objectives as string,
    phlebotomy: inquiry.phlebotomy as string,
    metadata_desc: inquiry.metadata as string,
    intake_details: inquiry.intake_details as Record<string, unknown>,
  }, approvedDate)

  const { error: agrErr } = await supabase.from('agreements').insert(
    AGREEMENTS.map(a => ({
      id: a.id,
      study_id: studyId,
      name: a.name,
      description: a.description,
      status: 'Pending',
      sent_date: approvedDate,
      snapshot: agreementSnapshot,
    })),
  )

  if (agrErr) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create agreement records' })
  }

  // 3. Generate signing links for all agreements
  const pi = inquiry.pi as { name: string; email: string }
  const origin = config.siteUrl

  const links = AGREEMENTS.map(a => ({
    ...a,
    url: `${origin}/admin/sign/${studyId}-${a.id}?token=${createSignToken(studyId, a.id, pi.email, config.signingSecret)}`,
  }))

  const statusToken = createStatusToken(studyId, pi.email, 1, config.signingSecret)
  const statusUrl = `${origin}/status/${studyId}?token=${statusToken}`

  // 4. Email the PI
  await sendEmail({
    to: [{ email: pi.email, name: pi.name }],
    subject: `Action required: Agreement package for ${inquiry.study_name as string}`,
    html: buildApprovalEmail(pi.name, inquiry.study_name as string, inquiry.abbreviation as string, links, statusUrl),
  })

  // 5. Update inquiry status + log the approval in its activity
  const approvedActivity = [
    { dotClass: 'g', title: 'Inquiry approved — study created', date: approvedDate, ts: Date.now() },
    ...((inquiry.activity as unknown[]) || []),
  ]
  await supabase.from('inquiries').update({ status: 'Approved', activity: approvedActivity }).eq('id', inquiryId)

  return { success: true, studyId }
})

function buildApprovalEmail(
  piName: string,
  studyName: string,
  abbr: string,
  links: Array<{ id: string; name: string; description: string; url: string }>,
  statusUrl: string,
): string {
  const linkRows = links.map(l => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eee;">
        <div style="font-weight:600;color:#011F5B;margin-bottom:2px;">${l.name}</div>
        <div style="font-size:0.82rem;color:#888;margin-bottom:8px;">${l.description}</div>
        <a href="${l.url}" style="background:#011F5B;color:#fff;padding:8px 18px;border-radius:4px;text-decoration:none;font-size:0.85rem;font-weight:600;">
          Review &amp; Sign →
        </a>
      </td>
    </tr>`).join('')

  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
  <div style="background:#011F5B;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Agreement Package · I3H</h1>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>Dear ${piName},</p>
    <p>Your inquiry for <strong>${studyName} (${abbr?.toUpperCase() ?? ''})</strong> has been reviewed and approved by the I3H team.</p>
    <p>To proceed, please review and sign each of the following documents. Each link is unique to you and expires in <strong>48 hours</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      ${linkRows}
    </table>
    <p style="font-size:0.82rem;color:#888;">Links expire in 48 hours. If any expire before you finish, you can request a new link from your I3H contact.</p>
    <div style="margin:28px 0;padding:20px;background:#f5f4f0;border-radius:8px;text-align:center;">
      <p style="margin:0 0 12px;font-size:0.88rem;color:#555;">
        You can check your study's current stage, agreement status, and sample processing progress at any time:
      </p>
      <a href="${statusUrl}"
         style="background:#1a7a4c;color:#fff;padding:11px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:0.88rem;">
        View Study Status →
      </a>
    </div>
    <p>Best regards,<br>The I3H Operations Team</p>
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#aaa;">
    <p>Signing links are unique to you and expire in 48 hours. Do not forward this email.</p>
    <p>&copy; ${new Date().getFullYear()} Penn Institute for Immunology &amp; Immune Health</p>
  </div>
</div>`
}
