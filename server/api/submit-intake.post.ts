import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  if (!config.mailersendApiKey) {
    console.error('MAILERSEND_API_KEY is not configured')
    throw createError({
      statusCode: 500,
      statusMessage: 'Email service configuration error',
    })
  }

  const { form, estimatedTotal, totalSamples, servicesText } = body

  if (!form || !form.piEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required form data',
    })
  }

  const mailersendUrl = 'https://api.mailersend.com/v1/email'
  const commonHeaders = {
    Authorization: `Bearer ${config.mailersendApiKey}`,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }

  // 1. Send confirmation email to user (PI and Project Lead)
  const confirmationHtml = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="background-color: #011F5B; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Project Inquiry Received</h1>
      </div>
      <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
        <p>Dear ${form.principalInvestigator},</p>
        <p>Thank you for submitting your inquiry for the project: <strong>${form.projectName}</strong>.</p>
        <p>Our team at the Institute for Immunology & Immune Health (I3H) has received your request and will review it shortly. We will contact you at <strong>${form.leadEmail}</strong> if we have any questions or to discuss the next steps.</p>

        <h3 style="color: #011F5B; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px;">Inquiry Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Project Name:</td>
            <td style="padding: 8px 0;">${form.projectName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">PI:</td>
            <td style="padding: 8px 0;">${form.principalInvestigator}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Total Samples:</td>
            <td style="padding: 8px 0;">${totalSamples}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Services:</td>
            <td style="padding: 8px 0;">${servicesText}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Estimated Cost:</td>
            <td style="padding: 8px 0;">$${estimatedTotal.toLocaleString()}</td>
          </tr>
        </table>

        <p style="margin-top: 30px;">Best regards,<br>The Immune Health Team</p>
      </div>
      <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>&copy; ${new Date().getFullYear()} Penn Institute for Immunology & Immune Health</p>
      </div>
    </div>
  `

  try {
    // Send to PI and Lead
    const recipients = [
      { email: form.piEmail, name: form.principalInvestigator },
    ]
    if (form.leadEmail && form.leadEmail !== form.piEmail) {
      recipients.push({ email: form.leadEmail, name: form.projectLead })
    }

    await $fetch(mailersendUrl, {
      method: 'POST',
      headers: commonHeaders,
      body: {
        from: { email: config.mailersendFromEmail, name: config.mailersendFromName },
        to: recipients,
        subject: `Inquiry Received: ${form.projectName}`,
        html: confirmationHtml,
      },
    })

    // 2. Send submission email to Admin in JSON
    const adminEmail = config.adminEmail
    const submissionData = {
      form,
      totalSamples,
      estimatedTotal,
      submittedAt: new Date().toISOString(),
    }

    await $fetch(mailersendUrl, {
      method: 'POST',
      headers: commonHeaders,
      body: {
        from: { email: config.mailersendFromEmail, name: config.mailersendFromName },
        to: [{ email: adminEmail, name: 'Immune Health Admin' }],
        subject: `[SUBMISSION] ${form.projectName}`,
        text: JSON.stringify(submissionData, null, 2),
      },
    })

    return { success: true }
  }
  catch (error: unknown) {
    const err = error as { data?: unknown; message?: string }
    console.error('Error sending email via MailerSend:', err.data || err.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send emails',
    })
  }
})
