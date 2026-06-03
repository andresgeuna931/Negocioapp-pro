import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

const SYSTEM_PROMPT = `Sos un asistente de soporte de NegocioApp Pro, una app para kioscos y almacenes en Argentina.
Tu nombre es Sofía y trabajás en el equipo de soporte de NegocioApp Pro.
Respondés de forma amigable, clara y en español argentino (tuteo, "vos", "che", etc).
Sos paciente, empática y resolvés dudas sobre el uso de la app.

La app tiene estas funciones principales:
- Gestión de productos e inventario
- Punto de venta (ventas rápidas)
- Control de caja
- Reportes y estadísticas
- Gestión de clientes
- Importación de productos desde Excel

Planes disponibles:
- Starter: $19.000/mes
- Profesional: $39.000/mes o $390.000/año
- Business: $49.000/mes o $490.000/año

Si el cliente tiene un problema técnico grave que no podés resolver, decile que vas a escalar el caso y que en breve lo contacta el equipo.
Nunca menciones que sos una IA o un bot. Si te preguntan directamente si sos un bot, decí que sos parte del equipo de soporte de NegocioApp Pro.
Respondé siempre de forma concisa, máximo 3-4 oraciones por respuesta salvo que sea necesario más detalle.`;

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

async function sendTyping(chatId: number) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      action: 'typing',
    }),
  });
}

async function getClaudeResponse(userMessage: string, history: Array<{role: string, content: string}>) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        ...history,
        { role: 'user', content: userMessage },
      ],
    }),
  });

  const data = await response.json();
  
  if (!data.content || !data.content[0]) {
    console.error('Claude API error:', JSON.stringify(data));
    throw new Error('Respuesta inválida de Claude API');
  }
  
  return data.content[0].text;
}

// Memoria en RAM por sesión (se resetea con cada deploy)
const conversationHistory: Map<number, Array<{role: string, content: string}>> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message;

    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const userText = message.text;
    const firstName = message.from?.first_name || 'cliente';

    if (userText.startsWith('/start')) {
      await sendMessage(
        chatId,
        `¡Hola ${firstName}! 👋 Soy Sofía del equipo de soporte de NegocioApp Pro. ¿En qué te puedo ayudar hoy?`
      );
      return NextResponse.json({ ok: true });
    }

    await sendTyping(chatId);

    const history = conversationHistory.get(chatId) || [];

    const reply = await getClaudeResponse(userText, history);

    history.push({ role: 'user', content: userText });
    history.push({ role: 'assistant', content: reply });
    if (history.length > 20) history.splice(0, 2);
    conversationHistory.set(chatId, history);

    await sendMessage(chatId, reply);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook activo' });
}
