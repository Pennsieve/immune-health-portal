import { describe, it, expect } from 'vitest'
import {
  LEAD_DETAIL_KEYS,
  leadDisplayValue,
  leadDetailRows,
  cleanLeadDetails,
} from './leadFields'

describe('leadDisplayValue', () => {
  it('returns empty string for missing/empty values', () => {
    expect(leadDisplayValue('role', undefined)).toBe('')
    expect(leadDisplayValue('role', {})).toBe('')
    expect(leadDisplayValue('role', { role: '' })).toBe('')
  })

  it('returns free text as-is for a text field', () => {
    expect(leadDisplayValue('role', { role: 'Principal Investigator' }))
      .toBe('Principal Investigator')
  })

  it('maps a select value to its label', () => {
    expect(leadDisplayValue('referralSource', { referralSource: 'conference' }))
      .toBe('Conference / event')
  })

  it('appends the "other" companion text when "other" is selected', () => {
    const details = { referralSource: 'other', referralSourceOther: 'A friend' }
    expect(leadDisplayValue('referralSource', details)).toBe('Other (A friend)')
  })

  it('does not append companion text when a non-other option is selected', () => {
    const details = { referralSource: 'web-search', referralSourceOther: 'ignored' }
    expect(leadDisplayValue('referralSource', details)).toBe('Web search')
  })

  it('falls back to the raw value for an unknown option', () => {
    expect(leadDisplayValue('referralSource', { referralSource: 'tiktok' })).toBe('tiktok')
  })

  it('joins a multiselect array of raw values', () => {
    const details = { servicesInterested: ['CyTOF', 'Blood processing'] }
    expect(leadDisplayValue('servicesInterested', details)).toBe('CyTOF, Blood processing')
  })

  it('treats an empty multiselect array as empty', () => {
    expect(leadDisplayValue('servicesInterested', { servicesInterested: [] })).toBe('')
  })
})

describe('leadDetailRows', () => {
  it('returns only non-empty rows in field order', () => {
    const details = {
      role: 'Coordinator',
      referralSource: 'publication',
      // callPurpose + researchSummary omitted
    }
    expect(leadDetailRows(details)).toEqual([
      { label: 'Role', value: 'Coordinator' },
      { label: 'How did you hear about us?', value: 'Publication' },
    ])
  })

  it('returns an empty array for no details', () => {
    expect(leadDetailRows(undefined)).toEqual([])
    expect(leadDetailRows({})).toEqual([])
  })
})

describe('cleanLeadDetails', () => {
  it('drops empty values', () => {
    const out = cleanLeadDetails({
      role: 'PI',
      callPurpose: '',
      researchSummary: undefined,
    })
    expect(out).toEqual({ role: 'PI' })
  })

  it('keeps a non-empty multiselect array and drops an empty one', () => {
    expect(cleanLeadDetails({ servicesInterested: ['CyTOF'] }))
      .toEqual({ servicesInterested: ['CyTOF'] })
    expect(cleanLeadDetails({ servicesInterested: [] })).toEqual({})
  })

  it('keeps the "other" companion only when "other" is selected', () => {
    const selected = cleanLeadDetails({
      referralSource: 'other',
      referralSourceOther: 'A colleague at HUP',
    })
    expect(selected).toEqual({
      referralSource: 'other',
      referralSourceOther: 'A colleague at HUP',
    })

    const notSelected = cleanLeadDetails({
      referralSource: 'web-search',
      referralSourceOther: 'orphaned', // dropped
    })
    expect(notSelected).toEqual({ referralSource: 'web-search' })
  })
})

describe('LEAD_DETAIL_KEYS', () => {
  it('includes field keys plus the referral "other" companion', () => {
    expect(LEAD_DETAIL_KEYS).toEqual(
      expect.arrayContaining(['role', 'referralSource', 'referralSourceOther', 'callPurpose', 'researchSummary']),
    )
  })
})
