// Transactional email via MailerSend — with a dev bypass.
//
// Set DISABLE_EMAILS=true in .env to skip MailerSend entirely and log each
// message (recipients, subject, and any links it contains) to the server
// console instead. Useful in development: MailerSend trial accounts cap the
// number of unique recipient addresses, and test runs burn through it —
// the logged links let you click through tokenized flows without real email.
// The full rendered HTML is also saved to .email-previews/ (gitignored) so
// you can open the actual email in a browser instead of just seeing links.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface EmailRecipient {
  email: string
  name?: string
}

export interface EmailMessage {
  to: EmailRecipient[]
  subject: string
  html: string
}

export interface StudyLeadContact {
  name?: string
  email?: string
}

// Every PI-facing email also CCs the study's point of contact / project lead
// (`study_lead`) when one is on file with a different address, so admins never
// have to remember to loop them in by hand. The lead is only added when its
// email is present and differs from the PI's, so a shared contact never gets
// two copies of the same message.
export function piRecipients(pi: EmailRecipient, studyLead?: StudyLeadContact | null): EmailRecipient[] {
  const piEmail = pi.email.trim()
  const recipients: EmailRecipient[] = [{ email: piEmail, name: pi.name }]
  const leadEmail = (studyLead?.email || '').trim()
  if (leadEmail && leadEmail !== piEmail) {
    recipients.push({ email: leadEmail, name: studyLead?.name })
  }
  return recipients
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const config = useRuntimeConfig()

  if (config.emailsDisabled) {
    const links = [...new Set(
      [...message.html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]),
    )]

    let previewPath = ''
    try {
      const dir = join(process.cwd(), '.email-previews')
      mkdirSync(dir, { recursive: true })
      const slug = message.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
      previewPath = join(dir, `${Date.now()}-${slug || 'email'}.html`)
      writeFileSync(previewPath, message.html, 'utf8')
    }
    catch (err) {
      console.error('[emails disabled] failed to write preview file:', err)
    }

    console.log(
      `[emails disabled] Would send "${message.subject}" to ${message.to.map(r => r.email).join(', ')}`
      + (links.length ? `\n  links:\n${links.map(l => `    ${l}`).join('\n')}` : '')
      + (previewPath ? `\n  preview: ${previewPath}` : ''),
    )
    return
  }

  if (!config.mailersendApiKey) {
    console.error('MAILERSEND_API_TOKEN is not configured')
    throw createError({ statusCode: 500, statusMessage: 'Email service configuration error' })
  }

  await $fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.mailersendApiKey}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: {
      from: { email: config.mailersendFromEmail, name: config.mailersendFromName },
      to: message.to,
      subject: message.subject,
      html: message.html,
    },
  })
}
