// Minimal CSV serialization — no external dependency needed for the handful
// of bulk-export buttons in the admin portal.

// Quotes any field containing a comma, quote, or newline, doubling embedded
// quotes, per RFC 4180.
function toCsvField(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map(row => row.map(toCsvField).join(',')).join('\r\n')
}

// Triggers a browser download of the given CSV text. Client-only — call
// from a click handler, never during SSR render.
export function downloadCsv(filename: string, csv: string) {
  // A leading BOM so Excel opens the file as UTF-8 instead of guessing wrong.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
