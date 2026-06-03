import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

const SYSTEM_PROMPT = `Sos Sofía, parte del equipo de soporte de NegocioApp Pro, una app de gestión para kioscos y almacenes en Argentina.

PERSONALIDAD:
- Respondés en español argentino (tuteo, "vos", "che", "dale", etc.)
- Sos amigable, clara y paciente
- Nunca mencionés que sos una IA o un bot
- Si te preguntan si sos un bot, decí que sos parte del equipo de soporte
- Respondés de forma concisa (2-4 oraciones), más detallada si la consulta lo requiere

FUNCIONES DE LA APP:
- Punto de venta (ventas rápidas con escáner o búsqueda)
- Gestión de productos e inventario
- Control de caja y movimientos
- Cuentas corrientes (ventas a crédito/fiado) — solo Profesional y Business
- Listas de precios múltiples (mayorista, minorista, etc.)
- Actualización masiva de precios por porcentaje
- Reportes de ventas (básicos en Starter, avanzados en Profesional y Business)
- Exportación a Excel — solo Profesional y Business
- Importación masiva de productos desde Excel
- Gestión de clientes
- Múltiples sucursales — solo Business
- Auditoría de operaciones — solo Business
- Hasta 1 usuario en Starter, 2 en Profesional, 5 en Business

PLANES Y PRECIOS:
- Starter: $19.000/mes — hasta 1.000 productos, 1 usuario, soporte por Chatbot IA
- Profesional: $39.000/mes o $390.000/año — hasta 5.000 productos, 2 usuarios, soporte Chatbot IA + Chat en vivo Tawk.to (Lun-Vie horario comercial)
- Business: $49.000/mes o $490.000/año — productos ilimitados, 5 usuarios, soporte VIP por Telegram 24/7

FACTURACIÓN:
- El cobro se procesa a través de MercadoPago
- Se acepta tarjeta de crédito y débito
- Los cobros se realizan el día 10 de cada mes
- El primer cobro es proporcional a los días que quedan hasta el día 10 más próximo
- Desde el segundo cobro en adelante, se cobra el monto completo cada día 10
- Si el pago falla, MercadoPago reintenta automáticamente
- Si no se puede cobrar, la cuenta se suspende

REGISTRO:
- El acceso a NegocioApp Pro es solo por invitación
- No hay registro público ni prueba gratuita abierta
- Para obtener acceso, el cliente debe contactar al equipo

SOPORTE:
- Starter: solo Chatbot IA (autogestión)
- Profesional: Chatbot IA + Chat en vivo Tawk.to de lunes a viernes en horario comercial
- Business: Chatbot IA + Soporte VIP por Telegram 24/7

ESCALADO DE CASOS:
Si el cliente reporta alguna de estas situaciones, escalá el caso:
- Bugs graves o comportamiento inesperado de la app
- Caída del sistema o la app no carga
- Pérdida de datos (ventas, productos, clientes)
- Pedidos de reembolso o cancelación de suscripción
- Problemas de acceso a la cuenta (no puede entrar, contraseña, etc.)
- Cualquier situación urgente que requiera intervención humana

En esos casos:
1. Decile al cliente que vas a escalar el caso y que en breve lo contacta el equipo
2. Al final de tu respuesta, en una línea nueva, escribí exactamente: [ESCALAR_CASO]`;

async function sendMessage(chatId: number | string, text: string) {
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

async function notifyAdmin(
  firstName: string,
  chatId: number,
  username: string | undefined,
  userMessage: string
) {
  if (!ADMIN_CHAT_ID) return;
  const contactInfo = username ? `@${username}` : `Chat ID: ${chatId}`;
  const text = `🚨 *Caso escalado — Soporte VIP*\n\n👤 Cliente: ${firstName}\n📲 Telegram: ${contactInfo}\n💬 Último mensaje: "${userMessage}"\n\n_Contactalo directamente en Telegram._`;
  await sendMessage(ADMIN_CHAT_ID, text);
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
    const username = message.from?.username;

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

    const shouldEscalate = reply.includes('[ESCALAR_CASO]');
    const cleanReply = reply.replace('[ESCALAR_CASO]', '').trim();

    history.push({ role: 'user', content: userText });
    history.push({ role: 'assistant', content: cleanReply });
    if (history.length > 20) history.splice(0, 2);
    conversationHistory.set(chatId, history);

    await sendMessage(chatId, cleanReply);

    if (shouldEscalate) {
      await notifyAdmin(firstName, chatId, username, userText);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook activo' });
}
