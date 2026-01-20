# Sistema Kiosco Barrial

Sistema SaaS multi-tenant para gestión de kioscos de barrio en Argentina.

## 🚀 Características

- ✅ **Multi-tenant**: Cada negocio con login propio y datos aislados
- ✅ **Ventas rápidas**: Escaneo de códigos de barras con cámara del celular
- ✅ **Gestión de stock**: Alertas automáticas de stock bajo
- ✅ **Reportes**: Ventas del día/mes, productos más vendidos
- ✅ **PWA**: Instalable en celular como app nativa
- ✅ **Suscripciones**: Control de acceso por estado de pago

## 📱 Tecnologías

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **Scanner**: html5-qrcode

## 🛠️ Instalación Local

### 1. Clonar y configurar

```bash
cd app
npm install
```

### 2. Configurar Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Copiar `env.example` a `.env.local`:

```bash
cp env.example .env.local
```

3. Completar las variables con los datos de tu proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Ejecutar SQL en Supabase

En el SQL Editor de Supabase, ejecutar en orden:

1. `supabase/schema.sql` - Crea tablas, tipos y funciones
2. `supabase/rls_policies.sql` - Aplica políticas de seguridad
3. `supabase/seed.sql` (opcional) - Datos de prueba

### 4. Crear usuario admin

1. En Supabase Dashboard > Authentication > Users, crear un usuario
2. Ejecutar en SQL Editor:

```sql
-- Crear un tenant
INSERT INTO tenants (id, name, slug, status)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Mi Kiosco',
    'mi-kiosco',
    'active'
);

-- Crear suscripción
INSERT INTO subscriptions (tenant_id, plan, status, current_period_end)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'basic',
    'active',
    NOW() + INTERVAL '30 days'
);

-- Vincular usuario (reemplazar USER_ID con el UUID del usuario creado)
SELECT link_user_to_tenant(
    'TU-USER-ID-AQUI',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Tu Nombre',
    'tu@email.com',
    'owner'
);
```

### 5. Iniciar desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## 📦 Deploy a Vercel

1. Push del código a GitHub
2. Ir a [Vercel](https://vercel.com), importar el repositorio
3. Configurar las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## 🔐 Seguridad (RLS)

- Cada tabla tiene `tenant_id`
- Las políticas RLS aseguran que cada usuario solo vea datos de su tenant
- Operaciones de escritura bloqueadas si la suscripción está suspendida

## 📊 Estructura de la Base de Datos

| Tabla | Descripción |
|-------|-------------|
| `tenants` | Negocios/kioscos |
| `profiles` | Usuarios (extiende auth.users) |
| `products` | Productos con stock |
| `sales` | Ventas |
| `sale_items` | Items de cada venta |
| `inventory_movements` | Movimientos de stock |
| `subscriptions` | Estado de suscripción |

## 🧪 Testing

### Casos críticos a probar:

1. **Aislamiento multi-tenant**: Usuario de tenant A no ve datos de tenant B
2. **Stock negativo**: No se permite vender más de lo disponible
3. **Suscripción suspendida**: Bloquea ventas y edición de productos
4. **Scanner**: Funciona en dispositivo móvil real

## 📄 Licencia

MIT
