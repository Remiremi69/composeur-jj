// Envoi d'emails via l'API Resend.

export interface SendEmailInput {
  apiKey: string
  from: string
  to: string | string[]
  replyTo?: string
  subject: string
  html: string
  pdfBase64?: string | null
  headers?: Record<string, string> // ex : List-Unsubscribe
}

// Renvoie true si Resend a accepté l'envoi.
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const body: Record<string, unknown> = {
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  }
  if (input.replyTo) body.reply_to = input.replyTo
  if (input.pdfBase64) {
    body.attachments = [{ filename: 'menu-de-mariage.pdf', content: input.pdfBase64 }]
  }
  if (input.headers && Object.keys(input.headers).length > 0) body.headers = input.headers
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error(`[emails] Resend a refusé l'envoi (${res.status}) : ${await res.text()}`)
    return false
  }
  return true
}
