'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function sendPasswordRecoveryEmail(email: string) {
    try {
        // Validate env vars
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return { error: 'Error de configuración: faltan credenciales de Supabase' };
        }

        if (!process.env.BREVO_API_KEY) {
            return { error: 'Error de configuración: falta BREVO_API_KEY' };
        }

        // 1. Generate recovery link via Supabase Admin
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://negocioapp-pro.vercel.app'}/reset-password`,
            },
        });

        if (linkError) {
            console.error('Error generating recovery link:', linkError);
            return { error: `Error Supabase: ${linkError.message}` };
        }

        if (!linkData) {
            return { error: 'Supabase no retornó datos para el link' };
        }

        // The link contains the token
        const actionLink = linkData.properties?.action_link;
        if (!actionLink) {
            console.error('linkData structure:', JSON.stringify(linkData, null, 2));
            return { error: 'No se encontró action_link en la respuesta' };
        }

        // 2. Send email via Brevo (Sendinblue) HTTP API
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: 'NegocioApp Pro', email: 'no-reply@negocioapp.pro' },
                to: [{ email }],
                subject: 'Recuperar contraseña - NegocioApp Pro',
                htmlContent: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
                        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #34d399, #14b8a6); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
                                    <span style="font-size: 28px;">🛒</span>
                                </div>
                                <h1 style="color: #0f172a; font-size: 22px; margin: 16px 0 4px;">NegocioApp Pro</h1>
                            </div>
                            
                            <h2 style="color: #334155; font-size: 18px; text-align: center; margin-bottom: 16px;">
                                Recuperar contraseña
                            </h2>
                            
                            <p style="color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
                                Recibimos una solicitud para restablecer tu contraseña. 
                                Hacé click en el botón para crear una nueva.
                            </p>
                            
                            <div style="text-align: center; margin: 28px 0;">
                                <a href="${actionLink}" 
                                   style="display: inline-block; background: linear-gradient(135deg, #34d399, #14b8a6); color: white; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 12px; text-decoration: none;">
                                    Restablecer contraseña
                                </a>
                            </div>
                            
                            <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
                                Si no solicitaste este cambio, ignorá este email.
                                <br>El link expira en 24 horas.
                            </p>
                        </div>
                        
                        <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin-top: 16px;">
                            © ${new Date().getFullYear()} NegocioApp Pro
                        </p>
                    </div>
                `,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Brevo API error:', errorData);
            return { error: `Error Brevo: ${errorData?.message || errorData?.code || response.status}` };
        }

        return { success: true };
    } catch (err) {
        console.error('Password recovery error:', err);
        return { error: `Error inesperado: ${err instanceof Error ? err.message : 'desconocido'}` };
    }
}
