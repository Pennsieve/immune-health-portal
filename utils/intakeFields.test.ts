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
    expect(fieldOptionValues('bloodVolumePerVisit')).toEqual([])
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
    expect(intakeDisplayValue('bloodVolumePerVisit', undefined)).toBe('')
    expect(intakeDisplayValue('bloodVolumePerVisit', {})).toBe('')
    expect(intakeDisplayValue('bloodVolumePerVisit', { bloodVolumePerVisit: '' })).toBe('')
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

})

describe('intakeDetailRows', () => {
  it('returns only non-empty rows, preserving field order', () => {
    const details = {
      irbStatus: 'approved',
      bloodVolumePerVisit: '20 mL',
      // enrollmentPeriod intentionally omitted → should not appear
    }
    const rows = intakeDetailRows(details)
    expect(rows).toEqual([
      { label: 'IRB Status', value: 'Approved' },
      { label: 'Target Blood Volume per Visit', value: '20 mL' },
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
      bloodVolumePerVisit: '20 mL',
      firstSampleDate: '',
      collectionSites: [],
      enrollmentPeriod: undefined,
    })
    expect(out).toEqual({ bloodVolumePerVisit: '20 mL' })
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

})

describe('INTAKE_DETAIL_KEYS', () => {
  it('includes field keys plus their companion keys, no duplicates missing', () => {
    expect(INTAKE_DETAIL_KEYS).toContain('irbStatus')
    expect(INTAKE_DETAIL_KEYS).toContain('irbTimeline') // detailKey companion
    expect(INTAKE_DETAIL_KEYS).toContain('collectionSiteOther') // otherKey companion
  })
})
