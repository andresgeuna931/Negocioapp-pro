// src/lib/brevo.ts
// Utilidad para enviar emails transaccionales via Brevo API

interface SendEmailParams {
    to: { email: string; name?: string };
    subject: string;
    htmlContent: string;
}

export async function sendEmail({ to, subject, htmlContent }: SendEmailParams) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": process.env.BREVO_API_KEY!,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sender: {
                name: "NegocioApp Pro",
                email: process.env.BREVO_SENDER_EMAIL || "no-reply@negocioapp-pro.vercel.app",
            },
            to: [to],
            subject,
            htmlContent,
        }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.message || "Error al enviar email via Brevo");
    }

    return res.json();
}

export function referralEmailHtml(sellerName: string, referralLink: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
    <div style="background:#10b981;padding:24px;text-align:center;">
      <span style="color:white;font-size:28px;font-weight:900;">N</span>
      <span style="color:white;font-size:20px;font-weight:700;margin-left:8px;">NegocioApp Pro</span>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#f1f5f9;margin:0 0 12px;">¡Hola, ${sellerName}! 👋</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;">
        Tu cuenta de vendedor en <strong style="color:#10b981;">NegocioApp Pro</strong> ya está activa.
        Este es tu link de referido personal — compartilo con los negocios que quieras sumar y vas a recibir comisiones por cada suscripción activa.
      </p>
      <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin-bottom:24px;word-break:break-all;">
        <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">Tu link de referido</p>
        <a href="${referralLink}" style="color:#10b981;font-size:14px;font-weight:600;text-decoration:none;">${referralLink}</a>
      </div>
      <a href="${referralLink}" style="display:block;background:#10b981;color:white;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;">
        Copiar y compartir mi link →
      </a>
      <p style="color:#475569;font-size:12px;text-align:center;margin:24px 0 0;">
        Ante cualquier consulta respondé este mail o escribinos por Telegram.
      </p>
    </div>
  </div>
</body>
</html>`;
}
