import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
- Gráfico de dona en Resultado económico (solo visible para el dueño): muestra el destino de cada peso — verde es ganancia neta, azul es costo de mercadería y rojo son gastos. El número del centro es el margen neto: qué porcentaje de las ventas totales quedó como ganancia real
- Importación masiva de productos desde Excel
- Gestión de clientes con abonos a cuenta corriente (efectivo, transferencia o QR)
- Pago mixto: se registra la venta en cuenta corriente y luego se abona la parte pagada desde Clientes > Registrar Pago, seleccionando el medio de pago
- Saldo de clientes: "Debe $X" en rojo significa que el cliente tiene deuda pendiente; "A favor $X" en verde significa que el cliente pagó más de lo que debía o tiene crédito disponible; $0 significa que está al día

VENTA RÁPIDA — LISTAS DE PRECIOS:
- En la pantalla de Venta Rápida hay un selector de lista de precios (aparece solo si el tenant tiene listas configuradas)
- El dueño siempre puede elegir cualquier lista al vender
- Los empleados pueden elegir lista solo si el dueño habilitó la opción "Listas de precios para empleados" en Configuración
- Al cambiar la lista, los precios del carrito se recalculan automáticamente
- La opción "— Precio de lista —" usa el precio base del producto sin ajuste

MÓDULO DE CAJA:
- Para vender con efectivo, QR o transferencia, la caja debe estar abierta
- El dueño o empleado abre la caja indicando el monto inicial
- Durante la sesión se registran todas las ventas y movimientos
- El cierre de caja muestra el resumen: efectivo esperado, ventas por método, egresos
- Los retiros de caja tienen selector de método: Efectivo (descuenta el físico) o Transferencia (no afecta el efectivo físico)
- "Cuenta corriente" reemplaza al label "Otros" en el desglose por método

ANULACIÓN DE VENTAS:
- Desde Caja > Ventas de esta sesión, el dueño puede anular ventas de la sesión activa
- Al anular: se restaura el stock, se revierte el fiado si aplica, y se ajusta el total de caja
- Las ventas anuladas quedan registradas pero excluidas del desglose y totales
- Solo se pueden anular ventas de la sesión actual

HISTORIAL DE CIERRES:
- En Caja se pueden ver los últimos 60 cierres
- Cada cierre es expandible y muestra el desglose por método de pago y la lista de ventas
- Las ventas dentro del historial también son expandibles para ver el detalle de productos

MÓDULO DE GASTOS (solo visible para dueño):
- El dueño puede registrar gastos del negocio con categoría, monto, fecha y descripción
- Categorías: Mercadería, Alquiler, Electricidad, Agua, Gas, Internet/Teléfono, Sueldos, Limpieza, Mantenimiento, Impuestos, Otros
- Los egresos registrados en Caja aparecen automáticamente en Gastos con el badge "De Caja"
- Los gastos de caja no se pueden eliminar desde el módulo de Gastos (solo desde Caja)
- En el Dashboard el dueño ve: Ingresos del mes, Gastos del mes y Ganancia real del mes
- Los empleados NO ven el módulo de Gastos ni el balance financiero

PERMISOS POR ROL:
- Dueño: acceso completo incluyendo Gastos, balance financiero, configuración, listas de precios, anulación de ventas e historial completo. También puede ver el gráfico de dona con el margen neto en Reportes.
- Empleado: puede vender, manejar caja y ver sus propios cierres; NO ve Gastos ni el balance financiero ni el gráfico económico; puede usar listas de precios solo si el dueño lo habilitó en Configuración

GESTIÓN DE EQUIPO:
- El dueño puede invitar empleados desde Configuración > Equipo tocando "Invitar"
- Se elige el rol (Empleado o Dueño), se genera un link y se manda por WhatsApp
- El empleado abre el link, completa nombre, email y contraseña, y queda vinculado al negocio sin necesidad de confirmar email
- El link de invitación vence en 7 días
- Límites de usuarios adicionales activos por plan:
  · Starter: solo el dueño (sin usuarios adicionales)
  · Profesional: hasta 2 usuarios adicionales activos
  · Business: hasta 3 usuarios adicionales activos
- Si se llega al límite, hay que desactivar uno antes de activar otro o mejorar el plan
- El dueño puede desactivar/reactivar empleados desde Configuración > Equipo (menú de tres puntos)
- Un empleado desactivado pierde el acceso inmediatamente: al intentar entrar ve una pantalla de "Cuenta desactivada" con indicación de contactar al dueño

CONFIGURACIÓN:
- Recargos por método de pago: el dueño configura % de recargo para débito, crédito 1 cuota y crédito 3 cuotas
- Alertas de stock: umbral por defecto configurable; también se puede configurar por producto
- Listas de precios: se crean desde Configuración > Listas de Precios; se puede definir ajuste por % o monto fijo
- Listas de precios para empleados: toggle en Configuración que habilita/deshabilita el selector de lista para empleados al vender

MÓDULO DE AYUDA:
- Dentro de la app hay una sección de Ayuda con 9 secciones y más de 40 preguntas frecuentes
- Cubre: primeros pasos, ventas, caja, productos, clientes, reportes, gastos, configuración y cuenta
- Accesible desde el menú lateral para todos los roles

USUARIOS DEMO:
- Existe una cuenta de demostración para que potenciales clientes prueben la app
- Demo Dueño: demo-dueno@negocioapp.pro
- Demo Empleado: demo-empleado@negocioapp.pro
- Las cuentas demo pueden estar habilitadas o deshabilitadas según lo decida el equipo

PLANES Y PRECIOS:
- Starter: $19.000/mes — hasta 1.000 productos, solo el dueño (sin empleados), soporte Chat Tawk.to (autogestión)
- Profesional: $39.000/mes o $390.000/año — hasta 5.000 productos, hasta 2 empleados activos, Soporte VIP Telegram 24/7
- Business: $49.000/mes o $490.000/año — productos ilimitados, hasta 3 empleados activos, Soporte VIP Telegram 24/7

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
Siempre intentá resolver el problema primero antes de escalar. No escalés solo porque el cliente pida hablar con un humano — intentá ayudarlo igual.

Escalá el caso únicamente si se cumple alguna de estas condiciones:
(a) Ya probaste 3 o más soluciones distintas en la conversación y el cliente sigue sin resolverlo
(b) El cliente reporta pérdida de datos (ventas, productos, clientes)
(c) El cliente quiere cancelar la suscripción o pedir reembolso
(d) Hay una caída total confirmada del sistema

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
  // Validar secreto del webhook de Telegram
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!secret || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

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

    const admin = createAdminClient();

    if (userText.startsWith('/start')) {
      const token = userText.split(' ')[1]?.trim();

      if (!token) {
        await sendMessage(chatId, 'Para acceder al soporte, ingresá desde el botón "Soporte VIP" dentro de la app.');
        return NextResponse.json({ ok: true });
      }

      // Consumir token atómicamente — UPDATE WHERE used=false RETURNING evita doble uso
      const { data: telegramToken } = await admin
        .from('telegram_tokens')
        .update({ used: true })
        .eq('token', token)
        .eq('used', false)
        .select('user_id')
        .single();

      if (!telegramToken) {
        await sendMessage(chatId, 'Este link ya fue usado o no es válido. Generá uno nuevo desde la app.');
        return NextResponse.json({ ok: true });
      }

      // Vincular chat_id con user_id
      await admin.from('telegram_users').upsert({ user_id: telegramToken.user_id, chat_id: chatId }, { onConflict: 'user_id' });

      await sendMessage(chatId, `¡Hola ${firstName}! 👋 Soy Sofía del equipo de soporte de NegocioApp Pro. ¿En qué te puedo ayudar hoy?`);
      return NextResponse.json({ ok: true });
    }

    // Verificar que el chat_id está registrado y el usuario sigue activo
    const { data: telegramUser } = await admin
      .from('telegram_users')
      .select('user_id')
      .eq('chat_id', chatId)
      .single();

    if (!telegramUser) {
      await sendMessage(chatId, 'Para acceder al soporte, ingresá desde el botón "Soporte VIP" dentro de la app.');
      return NextResponse.json({ ok: true });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('is_active')
      .eq('id', telegramUser.user_id)
      .single();

    if (!profile?.is_active) {
      await sendMessage(chatId, 'Tu acceso fue revocado. Contactá al dueño del negocio.');
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
