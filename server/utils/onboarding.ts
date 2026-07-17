// Checklist for a fresh lead, before the full intake form has been sent.
// Both items must be checked before the admin can send the full intake form.
// Replaced by ONBOARDING_CHECKLIST when the full intake is submitted.
export const LEAD_CHECKLIST = [
  'Schedule introductory meeting',
  'Introductory meeting complete',
] as const

export const ONBOARDING_CHECKLIST = [
  'Intake form received',
  'IRB approval for project (if applicable)',
  'Executed contract or budget account number (active) in CAMS & IH core approved to spend',
  'Is PI registered in iLab? If yes, set up service request for PI/study and obtain service request ID# for iLab and LabVantage invoicing requirments. If no, get investigator account with iLab.',
  'Does PI have a dedicated clinical research coordinator? Do they have a LabVantage account? Do they have a PMACS account? If no, set up account and training with the individual that will be entering visits and/or delivering samples. iLab service request ID will be required to set up study in LabVantage (IRB # is preferred as well).',
  'Metadata collection plan obtained (requirement for CyTOF data analysis).',
  'Pennsieve access authorization form signed (this may be incorporated into user agreement)',
  'User agreement signed',
  'Sample drop off SOP & 1-pager need to be sent to CRC and they should be added to our crc-ihpu slack channel for communication with our processing team.',
  'Do they have a REDCap account for access to TRU sample drop off survey form',
  'Is there a way to check to see if CyTOF and other reports promised to PIs are delivered within the prescribed timeframe?',
] as const
