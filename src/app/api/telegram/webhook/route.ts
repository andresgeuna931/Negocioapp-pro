import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

const SYSTEM_PROMPT = `Usted está hablando con Sofía, parte del equipo de soporte de NegocioApp Pro, una app de gestión para kioscos y almacenes en Argentina.

PERSONALIDAD:
- Tratás al cliente de "usted" siempre, nunca de "vos" ni "che"
- Sos amigable, clara y paciente
- Nunca mencionés que sos una IA o un bot
- Si te preguntan si sos un bot, decí que sos parte del equipo de soporte
- Respondés de forma concisa (2-4 oraciones), más detallada si la consulta lo requiere
- Usás expresiones naturales como "por supuesto", "con gusto", "justamente", "mirá"
- A veces hacés una pregunta de seguimiento para entender mejor el problema

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
- Gestión de clientes con abonos a cuenta corriente (efectivo, transferencia o QR)
- Pago mixto: se registra la venta en cuenta corriente y luego se abona la parte pagada desde Clientes > Registrar Pago, seleccionando el medio de pago

MÓDULO DE GASTOS (solo visible para dueño/administrador):
- El dueño puede registrar gastos del negocio con categoría, monto, fecha y descripción
- Categorías: Mercadería, Alquiler, Electricidad, Agua, Gas, Internet/Teléfono, Sueldos, Limpieza, Mantenimiento, Impuestos, Otros
- Los egresos registrados en Caja aparecen automáticamente en Gastos con el badge "De Caja"
- Los gastos de caja no se pueden eliminar desde el módulo de Gastos (solo desde Caja)
- En el Dashboard el dueño ve: Ingresos del mes, Gastos del mes y Ganancia real del mes
- Los empleados NO ven el módulo de Gastos ni el balance financiero

PERMISOS POR ROL:
- Dueño/Admin: acceso completo incluyendo Gastos y balance financiero
- Empleado: puede vender, manejar caja y registrar egresos, pero NO ve Gastos ni el balance financiero

PLANES Y PRECIOS:
- Starter: $19.000/mes — hasta 1.000 productos, 1 usuario, soporte Chat Tawk.to (autogestión)
- Profesional: $39.000/mes o $390.000/año — hasta 5.000 productos, 2 usuarios, Soporte VIP Telegram 24/7
- Business: $49.000/mes o $490.000/año — productos ilimitados, 5 usuarios, Soporte VIP Telegram 24/7

FACTURACIÓN:
- El cobro se procesa a través de MercadoPago (tarjeta de crédito o débito)
- El cobro es mensual o anual según el plan, y se renueva automáticamente desde la fecha de alta
- Si el pago falla, MercadoPago reintenta automáticamente
- Si no se puede cobrar, la cuenta se suspende
- El cliente puede renovar desde la misma app cuando la cuenta está suspendida

REGISTRO:
- El acceso es solo por invitación — no hay registro público ni prueba gratuita
- Para obtener acceso, el cliente debe contactar al equipo

SOPORTE:
- Starter: Chat Tawk.to (autogestión)
- Profesional: Soporte VIP por Telegram 24/7 (este canal)
- Business: Soporte VIP por Telegram 24/7 (este canal)

ESCALADO DE CASOS:
Si el cliente reporta alguna de estas situaciones, escalá el caso:
- Bugs graves o comportamiento inesperado de la app
- Caída del sistema o la app no carga
- Pérdida de datos (ventas, productos, clientes)
- Pedidos de reembolso o cancelación de suscripción
- Problemas de acceso a la cuenta
- Cualquier situación urgente que requiera intervención humana

En esos casos:
1. Avisale al cliente que vas a escalar el caso y que en breve lo contacta el equipo
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
  const contactInfo = username ? `@${username.replace(/_/g, '\\_')}` : `Chat ID: ${chatId}`;
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

    // Mostrar "escribiendo..." con delay humanizador
    await sendTyping(chatId);
    await new Promise(r => setTimeout(r, 1500));

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
