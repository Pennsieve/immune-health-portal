// Checklist for a fresh lead, before the full intake form has been sent.
// Both items must be checked before the admin can send the full intake form.
// Replaced by ONBOARDING_CHECKLIST when the full intake is submitted.
export const LEAD_CHECKLIST = [
  'Schedule introductory meeting',
  'Introductory meeting complete',
] as const

export const ONBOARDING_CHECKLIST = [
  'Completed intake form received',
  'IRB is approved and IRB# has been provided (if applicable)',
  'Contract or active budget account number is executed in CAMS; IH core approved to spend',
  'iLabs service request ID# received',
  'Investigator team member responsible for entering visits and delivering samples has account access and completed training',
  'Sample chain-of-custody plan from blood draw to lab drop off established and approved by Immune Health and investigator’s team',
  'Sample drop off SOP & 1 pager sent to investigator’s team',
  'Investigator team member added to crc-ihpu slack channel',
  'Investigator team member has REDcap access',
  'Metadata collection plan obtained',
  'User agreement signed',
] as const
