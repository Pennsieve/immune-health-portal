import { serverSupabaseServiceRole } from '#supabase/server'
import { createStatusToken } from '~/server/utils/signing'
import { diffStudyDetails, type StudyChange, type StudyDetailSnapshot } from '~/utils/studyChanges'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { studyId, timezone, name, abbreviation, pi, studyLead, affiliation, affiliationOrg, irb, stage, additionalNotes, cohort, budget, intakeDetails, keyPersonnel, changeNote } = await readBody(event)

  if (!studyId || !name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing studyId or name' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: study, error: fetchErr } = await supabase
    .from('studies')
    .select('activity, lifecycle, name, abbreviation, pi, study_lead, affiliation, affiliation_org, irb, additional_notes, cohort, budget, intake_details, key_personnel, status_token_version')
    .eq('id', studyId)
    .single()

  if (fetchErr || !study) {
    console.error('[update-study] fetch error:', fetchErr)
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const now = new Date()
  const tz = timezone || DEFAULT_TIMEZONE
  const dateStr = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

  const newItem = {
    dotClass: '',
    title: 'Study record updated',
    date: dateStr,
    ts: Date.now(),
    ...(changeNote ? { note: changeNote } : {}),
  }

  const updatedActivity = [newItem, ...((study.activity as unknown[]) || [])]

  const dateOnly = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
  type LifecycleStep = { label: string; date: string; status: 'done' | 'active' | 'pending' }
  const base = ((study.lifecycle as LifecycleStep[]) || []).map((step) => {
    if (step.label === 'Processing') {
      if (stage === 'Complete') return { ...step, status: 'done' as const, date: (step.date === '—' || step.date === 'in progress') ? dateOnly : step.date }
      if (stage === 'Processing') return { ...step, status: 'active' as const, date: 'in progress' }
    }
    if (step.label === 'Complete') {
      if (stage === 'Complete') return { ...step, status: 'done' as const, date: dateOnly }
      if (stage === 'Processing') return { ...step, status: 'pending' as const, date: '—' }
    }
    return step
  })
  // Normalize: if any later step is done, earlier steps must also be done
  const updatedLifecycle = base.map((step, i) => {
    if (step.status !== 'done' && base.slice(i + 1).some(s => s.status === 'done')) {
      return { ...step, status: 'done' as const, date: step.date === '—' || step.date === 'in progress' ? dateOnly : step.date }
    }
    return step
  })

  let updateErr: unknown
  try {
    const result = await supabase
      .from('studies')
      .update({
        name: name.trim(),
        abbreviation: abbreviation?.trim() ?? null,
        pi,
        study_lead: studyLead ?? null,
        affiliation,
        affiliation_org: affiliationOrg,
        irb,
        stage,
        additional_notes: additionalNotes || null,
        cohort,
        budget,
        ...(intakeDetails !== undefined ? { intake_details: intakeDetails } : {}),
        ...(keyPersonnel !== undefined ? { key_personnel: keyPersonnel } : {}),
        activity: updatedActivity,
        lifecycle: updatedLifecycle,
      })
      .eq('id', studyId)
    updateErr = result.error
  }
  catch (e) {
    console.error('[update-study] unexpected exception during update:', e)
    throw createError({ statusCode: 500, statusMessage: `Unexpected error: ${String(e)}` })
  }

  if (updateErr) {
    console.error('[update-study] Supabase error:', JSON.stringify(updateErr))
    throw createError({ statusCode: 500, statusMessage: (updateErr as { message: string }).message })
  }

  // The study's agreement package was emailed to the PI when the study was
  // created, so any later edit to the study record is something the PI needs
  // to know about. Diff the old row against the new values and, if anything
  // PI-facing changed, email them the specific list with a link to their
  // status page. A failure here must not fail the (already committed) update.
  let notified = false
  const piEmail = ((pi as { email?: string } | null)?.email || '').trim()
  if (piEmail) {
    const before: StudyDetailSnapshot = {
      name: study.name as string,
      abbreviation: study.abbreviation as string,
      pi: study.pi as StudyDetailSnapshot['pi'],
      studyLead: study.study_lead as StudyDetailSnapshot['studyLead'],
      affiliation: study.affiliation as string,
      affiliationOrg: study.affiliation_org as string,
      irb: study.irb as string,
      additionalNotes: study.additional_notes as string,
      cohort: study.cohort as StudyDetailSnapshot['cohort'],
      budget: study.budget as StudyDetailSnapshot['budget'],
      intakeDetails: intakeDetails !== undefined ? ((study.intake_details as Record<string, unknown>) || {}) : undefined,
      keyPersonnel: keyPersonnel !== undefined ? ((study.key_personnel as unknown[]) || []) : undefined,
    }
    const after: StudyDetailSnapshot = {
      name, abbreviation, pi, studyLead, affiliation, affiliationOrg, irb, additionalNotes, cohort, budget,
      intakeDetails: intakeDetails !== undefined ? intakeDetails : undefined,
      keyPersonnel: keyPersonnel !== undefined ? keyPersonnel : undefined,
    }
    const changes = diffStudyDetails(before, after)

    if (changes.length > 0) {
      try {
        const ver = (study.status_token_version as number) ?? 1
        const token = createStatusToken(studyId, piEmail, ver, config.signingSecret)
        const statusUrl = `${config.siteUrl}/status/${studyId}?token=${token}`

        await sendEmail({
          to: piRecipients(
            { email: piEmail, name: (pi as { name?: string }).name || 'Principal Investigator' },
            studyLead as { name?: string; email?: string } | null,
          ),
          subject: `Study details updated — ${name.trim()}`,
          html: buildStudyUpdateEmail((pi as { name?: string }).name || '', name.trim(), changes, statusUrl),
        })
        notified = true
      }
      catch (err) {
        console.error('[update-study] change-notification email failed:', err)
      }
    }
  }

  return { success: true, activityItem: newItem, lifecycle: updatedLifecycle, notified }
})

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildStudyUpdateEmail(piName: string, studyName: string, changes: StudyChange[], statusUrl: string): string {
  const rows = changes.map((c) => {
    const detail = (c.from !== undefined || c.to !== undefined)
      ? `<span style="color:#999;">${esc(c.from ?? '—')}</span>`
        + ` <span style="color:#bbb;">&rarr;</span> `
        + `<strong style="color:#1a1a2e;">${esc(c.to ?? '—')}</strong>`
      : `<span style="color:#1a1a2e;">updated</span>`
    return `<tr>
      <td style="padding:9px 14px 9px 0;border-bottom:1px solid #eee;font-weight:600;color:#011F5B;vertical-align:top;white-space:nowrap;">${esc(c.label)}</td>
      <td style="padding:9px 0;border-bottom:1px solid #eee;font-size:0.88rem;line-height:1.5;">${detail}</td>
    </tr>`
  }).join('')

  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
  <div style="background:#011F5B;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Study Details Updated · I3H</h1>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>Dear ${esc(piName)},</p>
    <p>The I3H team has updated the following ${changes.length === 1 ? 'detail' : `${changes.length} details`} for your study <strong>${esc(studyName)}</strong>:</p>
    <table style="width:100%;border-collapse:collapse;margin:22px 0;">
      ${rows}
    </table>
    <p>Please review the current details on your study status page. If anything looks wrong, reply to this email or contact your I3H representative.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${statusUrl}"
         style="background:#1a7a4c;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
        View Study Status &rarr;
      </a>
    </div>
    <p style="font-size:0.82rem;color:#888;">If the button doesn't work, copy this link into your browser:<br>
      <a href="${statusUrl}" style="color:#011F5B;word-break:break-all;">${statusUrl}</a>
    </p>
    <p>Best regards,<br>The I3H Operations Team</p>
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#aaa;">
    <p>You're receiving this because you're listed as the PI or study lead for this study.</p>
    <p>&copy; ${new Date().getFullYear()} Penn Institute for Immunology &amp; Immune Health</p>
  </div>
</div>`
}
