// Shared shape for the CC-selection confirmation modal: turns a study/inquiry's
// study_lead + key_personnel into a flat, de-duplicated list of people an admin
// can choose to CC on an outbound email. Used by both admin detail pages and
// components/admin/CcSelector.vue.

export interface CcPerson {
  name?: string
  email?: string
  role?: string
}

export interface CcCandidate {
  name?: string
  email: string
  role?: string
}

// Matches the "Point of contact / Project lead" label used for this same
// field on the edit-study/edit-inquiry forms (see the `em-label` next to
// `editForm.studyLeadName`), so the role shown here doesn't drift from it.
const LEAD_ROLE = 'Point of contact / Project lead'

export function ccCandidates(lead?: CcPerson | null, keyPersonnel?: CcPerson[] | null): CcCandidate[] {
  const seen = new Set<string>()
  const result: CcCandidate[] = []

  const add = (p?: CcPerson | null, role?: string) => {
    const email = (p?.email || '').trim()
    if (!email || seen.has(email.toLowerCase())) return
    seen.add(email.toLowerCase())
    result.push({ email, name: p?.name, role: p?.role || role })
  }

  add(lead, LEAD_ROLE)
  for (const p of keyPersonnel || []) add(p)

  return result
}
