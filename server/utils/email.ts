// Transactional email via MailerSend — with a dev bypass.
//
// Set DISABLE_EMAILS=true in .env to skip MailerSend entirely and log each
// message (recipients, subject, and any links it contains) to the server
// console instead. Useful in development: MailerSend trial accounts cap the
// number of unique recipient addresses, and test runs burn through it —
// the logged links let you click through tokenized flows without real email.

export interface EmailRecipient {
  email: string
  name?: string
}

export interface EmailMessage {
  to: EmailRecipient[]
  subject: string
  html: string
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const config = useRuntimeConfig()

  if (config.emailsDisabled) {
    const links = [...new Set(
      [...message.html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]),
    )]
    console.log(
      `[emails disabled] Would send "${message.subject}" to ${message.to.map(r => r.email).join(', ')}`
      + (links.length ? `\n  links:\n${links.map(l => `    ${l}`).join('\n')}` : ''),
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
