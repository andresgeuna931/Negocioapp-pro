-- Agrega 'account' al enum payment_method para ventas fiadas
-- Ejecutado en: Supabase SQL Editor (producción)

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'account';
