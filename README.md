# NegocioApp Pro

Sistema SaaS multi-tenant para gestión de negocios en Argentina. Diseñado para kioscos, almacenes, ferreterías, veterinarias, verdulerías, carnicerías, dietéticas, viveros, imprentas y más.

🌐 **Demo en vivo**: [negocioapp-pro.vercel.app](https://negocioapp-pro.vercel.app)

---

## ✨ Características Principales

### 🏪 Multi-tenant
- Cada negocio tiene su propio login, datos completamente aislados y panel personalizado
- Soporte para múltiples usuarios por negocio (dueño + empleados)
- Roles diferenciados: **Dueño** (acceso total) y **Empleado** (solo operaciones)

### 💰 Ventas
- Venta rápida con escaneo de código de barras desde la cámara del celular
- Carrito de compras con múltiples productos
- Métodos de pago: efectivo, débito, crédito, transferencia
- Historial completo de ventas

### 📦 Productos e Inventario
- Alta, edición y baja de productos
- Categorías por tipo de negocio (cargadas automáticamente al registrarse)
- Gestión de categorías: el dueño puede agregar, editar y eliminar categorías
- Control de stock en tiempo real
- Alertas automáticas de stock bajo
- Importación masiva de productos por Excel
- Actualización masiva de precios por porcentaje
- Múltiples listas de precios (mayorista, minorista, efectivo, tarjeta, etc.)

### 📊 Reportes
- Resumen de ventas del día y del mes
- Top productos más vendidos
- Movimientos de inventario
- Exportación a Excel (plan Profesional y Business)

### 💳 Suscripciones con Mercado Pago
- Trial gratuito de 14 días al registrarse
- Planes: Starter, Profesional y Business
- Cobro automático mensual vía Mercado Pago (auto_recurring)
- Webhook para activación automática al pagar
- Banner de trial que desaparece automáticamente al suscribirse
- Página de precios con plan actual bloqueado

### 🔐 Seguridad
- Row Level Security (RLS) en todas las tablas de Supabase
- Cada tenant solo ve sus propios datos
- Operaciones de escritura bloqueadas si la suscripción está suspendida
- Middleware de autenticación en todas las rutas del dashboard

---

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|-----------|-----|
| Next.js 16 (App Router) | Frontend + API Routes |
| TypeScript | Tipado estático |
| Tailwind CSS | Estilos |
| Supabase | Base de datos PostgreSQL + Auth + RLS |
| Mercado Pago | Pagos y suscripciones |
| Vercel | Deploy y hosting |
| html5-qrcode | Escáner de códigos de barras |

---

## 📊 Estructura de la Base de Datos

| Tabla | Descripción |
|-------|-------------|
| `tenants` | Negocios registrados |
| `profiles` | Usuarios (extiende auth.users de Supabase) |
| `products` | Productos con stock |
| `categories` | Categorías de productos por tenant |
| `sales` | Ventas realizadas |
| `sale_items` | Ítems de cada venta |
| `inventory_movements` | Movimientos de stock |
| `subscriptions` | Estado de suscripción por tenant |
| `price_lists` | Listas de precios |
| `product_prices` | Precios por lista |
| `customers` | Clientes (cuentas corrientes) |
| `customer_accounts` | Movimientos de cuenta corriente |
| `cash_sessions` | Sesiones de caja |
| `cash_movements` | Movimientos de caja |
| `team_invitations` | Invitaciones a empleados |

---

## 💼 Planes y Precios

| Característica | Starter | Profesional | Business |
|---------------|---------|-------------|----------|
| Productos | 1.000 | 5.000 | Ilimitados |
| Usuarios | 1 | 2 | 5 |
| Cuentas Corrientes | ❌ | ✅ | ✅ |
| Listas de precios | ✅ | ✅ | ✅ |
| Reportes | Básicos | Avanzados | Avanzados |
| Exportar Excel | ❌ | ✅ | ✅ |
| Soporte | Chatbot | WhatsApp | WhatsApp VIP |
| Precio/mes | $18.000 ARS | $20 USD | $49.990 ARS |

---

## 🚀 Instalación Local

### Requisitos
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)

### 1. Clonar el repositorio

```bash
git clone https://github.com/andresgeuna931/Negocioapp-pro.git
cd Negocioapp-pro
npm install
```

### 2. Configurar variables de entorno

```bash
cp env.example .env.local
```

Completar `.env.local` con:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-tu-access-token
NEXT_PUBLIC_MP_PLAN_STARTER=tu-plan-id-starter
NEXT_PUBLIC_MP_PLAN_PROFESSIONAL=tu-plan-id-professional
NEXT_PUBLIC_MP_PLAN_BUSINESS=tu-plan-id-business

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Configurar Supabase

En el SQL Editor de Supabase, ejecutar en este orden:

1. `supabase/schema.sql` — Crea tablas, tipos y funciones
2. `supabase/rls_policies.sql` — Aplica políticas de seguridad RLS
3. Ejecutar el SQL de la tabla de categorías:

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_category_per_tenant UNIQUE (tenant_id, name)
);
CREATE INDEX idx_categories_tenant ON categories(tenant_id);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_members_can_view_categories"
ON categories FOR SELECT
USING (tenant_id = get_current_tenant_id());
CREATE POLICY "owners_can_manage_categories"
ON categories FOR ALL
USING (tenant_id = get_current_tenant_id() AND is_owner());
```

### 4. Iniciar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy en Vercel

1. Push del código a GitHub
2. Importar el repositorio en [Vercel](https://vercel.com)
3. Configurar todas las variables de entorno del paso anterior
4. Deploy automático en cada push a `main`

### Variables de entorno requeridas en Vercel
