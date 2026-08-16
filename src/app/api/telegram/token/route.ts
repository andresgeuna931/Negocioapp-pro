import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME!;

export async function POST() {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Verificar que el usuario está activo
        const admin = createAdminClient();
        const { data: profile } = await admin
            .from('profiles')
            .select('is_active')
            .eq('id', user.id)
            .single();

        if (!profile?.is_active) {
            return NextResponse.json({ error: 'Tu cuenta está desactivada' }, { status: 403 });
        }

        // Generar token único de un solo uso
        const token = randomUUID().replace(/-/g, '');

        await admin.from('telegram_tokens').insert({
            token,
            user_id: user.id,
            used: false,
        });

        const deepLink = `https://t.me/${BOT_USERNAME}?start=${token}`;

        return NextResponse.json({ url: deepLink });
    } catch (error) {
        console.error('Error generando token de Telegram:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
