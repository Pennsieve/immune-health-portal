import { describe, it, expect } from 'vitest'
import {
  INTAKE_DETAIL_KEYS,
  detailApplies,
  fieldOptionValues,
  fieldOptionLabel,
  intakeDisplayValue,
  intakeDetailRows,
  cleanIntakeDetails,
} from './intakeFields'

describe('detailApplies', () => {
  it('is false when no condition is defined', () => {
    expect(detailApplies(undefined, 'anything')).toBe(false)
  })

  it('is always true for the __always__ sentinel', () => {
    expect(detailApplies('__always__', '')).toBe(true)
    expect(detailApplies('__always__', undefined)).toBe(true)
  })

  it('matches a single expected value', () => {
    expect(detailApplies('yes', 'yes')).toBe(true)
    expect(detailApplies('yes', 'no')).toBe(false)
  })

  it('matches any value in a list', () => {
    expect(detailApplies(['pending', 'not-submitted'], 'pending')).toBe(true)
    expect(detailApplies(['pending', 'not-submitted'], 'approved')).toBe(false)
  })
})

describe('fieldOptionValues / fieldOptionLabel', () => {
  it('returns option values for a known select field', () => {
    expect(fieldOptionValues('irbStatus')).toEqual(['approved', 'pending', 'not-submitted'])
  })

  it('returns an empty array for an unknown or option-less field', () => {
    expect(fieldOptionValues('nope')).toEqual([])
    expect(fieldOptionValues('clinicalQuestion')).toEqual([])
  })

  it('maps a raw value to its label', () => {
    expect(fieldOptionLabel('irbStatus', 'pending')).toBe('Submitted / pending')
  })

  it('falls back to the raw value when no matching option exists', () => {
    expect(fieldOptionLabel('irbStatus', 'mystery')).toBe('mystery')
    expect(fieldOptionLabel('unknownField', 'x')).toBe('x')
  })
})

describe('intakeDisplayValue', () => {
  it('returns empty string for missing/empty values', () => {
    expect(intakeDisplayValue('clinicalQuestion', undefined)).toBe('')
    expect(intakeDisplayValue('clinicalQuestion', {})).toBe('')
    expect(intakeDisplayValue('clinicalQuestion', { clinicalQuestion: '' })).toBe('')
    expect(intakeDisplayValue('collectionSites', { collectionSites: [] })).toBe('')
  })

  it('maps a select value to its label', () => {
    expect(intakeDisplayValue('irbStatus', { irbStatus: 'approved' })).toBe('Approved')
  })

  it('appends "months" for a months field', () => {
    expect(intakeDisplayValue('enrollmentPeriod', { enrollmentPeriod: 18 })).toBe('18 months')
  })

  it('joins multiselect labels', () => {
    expect(intakeDisplayValue('collectionSites', { collectionSites: ['HUP', 'CHOP'] }))
      .toBe('HUP, CHOP')
  })

  it('appends the "other" companion text for the matching multiselect option', () => {
    const details = {
      collectionSites: ['HUP', 'Remote / off-site'],
      collectionSiteOther: 'Somewhere else',
    }
    expect(intakeDisplayValue('collectionSites', details))
      .toBe('HUP, Remote / off-site (Somewhere else)')
  })

  it('appends conditional detail text with an em dash', () => {
    const details = { irbStatus: 'pending', irbTimeline: 'Q3 2027' }
    expect(intakeDisplayValue('irbStatus', details)).toBe('Submitted / pending — Q3 2027')
  })

  it('shows __always__ companion text even when the parent field is empty', () => {
    const details = { specialHandlingNotes: 'Keep on ice' }
    expect(intakeDisplayValue('specialHandling', details)).toBe('Keep on ice')
  })
})

describe('intakeDetailRows', () => {
  it('returns only non-empty rows, preserving field order', () => {
    const details = {
      clinicalQuestion: 'Does X work?',
      irbStatus: 'approved',
      // enrollmentPeriod intentionally omitted → should not appear
    }
    const rows = intakeDetailRows(details)
    expect(rows).toEqual([
      { label: 'Clinical Question', value: 'Does X work?' },
      { label: 'IRB Status', value: 'Approved' },
    ])
  })

  it('returns an empty array for no details', () => {
    expect(intakeDetailRows(undefined)).toEqual([])
    expect(intakeDetailRows({})).toEqual([])
  })
})

describe('cleanIntakeDetails', () => {
  it('drops empty values', () => {
    const out = cleanIntakeDetails({
      clinicalQuestion: 'Q',
      participantNaming: '',
      collectionSites: [],
      cohortCount: undefined,
    })
    expect(out).toEqual({ clinicalQuestion: 'Q' })
  })

  it('keeps the "other" companion only when its option is selected', () => {
    const selected = cleanIntakeDetails({
      collectionSites: ['Remote / off-site'],
      collectionSiteOther: 'Field site',
    })
    expect(selected).toEqual({
      collectionSites: ['Remote / off-site'],
      collectionSiteOther: 'Field site',
    })

    const notSelected = cleanIntakeDetails({
      collectionSites: ['HUP'],
      collectionSiteOther: 'Field site', // orphaned → dropped
    })
    expect(notSelected).toEqual({ collectionSites: ['HUP'] })
  })

  it('keeps a conditional detail only when its condition applies', () => {
    const applies = cleanIntakeDetails({ irbStatus: 'pending', irbTimeline: 'soon' })
    expect(applies).toEqual({ irbStatus: 'pending', irbTimeline: 'soon' })

    const doesNot = cleanIntakeDetails({ irbStatus: 'approved', irbTimeline: 'soon' })
    expect(doesNot).toEqual({ irbStatus: 'approved' })
  })

  it('keeps an __always__ companion even without a parent selection', () => {
    const out = cleanIntakeDetails({ specialHandlingNotes: 'Note' })
    expect(out).toEqual({ specialHandlingNotes: 'Note' })
  })
})

describe('INTAKE_DETAIL_KEYS', () => {
  it('includes field keys plus their companion keys, no duplicates missing', () => {
    expect(INTAKE_DETAIL_KEYS).toContain('irbStatus')
    expect(INTAKE_DETAIL_KEYS).toContain('irbTimeline') // detailKey companion
    expect(INTAKE_DETAIL_KEYS).toContain('collectionSiteOther') // otherKey companion
  })
})
