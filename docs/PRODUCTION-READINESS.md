# Checklist formal de producción

Estado actual: **NO-GO condicionado**. La aplicación y las pruebas locales están sanas, pero la aprobación requiere evidencia del entorno real.

Evidencia local 2026-08-09: build productivo, 500 solicitudes con concurrencia 20, 0% de errores, 141.12 req/s, p50 131 ms, p95 208 ms y p99 260 ms. Esta medición no sustituye la prueba sobre staging/producción. La configuración local también fue bloqueada correctamente porque `NEXT_PUBLIC_SUPABASE_URL` contiene `/rest/v1`; debe corregirse al origen antes de cualquier despliegue.

## Puertas automáticas

- [x] TypeScript, ESLint y build local.
- [x] Unitarias de cálculos, reglas, Stripe, seguridad y recuperación.
- [x] Contratos SQL para RLS, cuotas, idempotencia y aislamiento.
- [x] Dependencias sin vulnerabilidades conocidas.
- [ ] CI completo en staging con Supabase real, integración API y E2E.
- [ ] Smoke sobre el deployment productivo staged y dominio final.
- [ ] Carga controlada: 500 solicitudes, concurrencia 20, error ≤1%, p95 ≤2 s.
- [ ] Contrato productivo read-only confirma RLS y funciones atómicas de cuota.

## Pagos reales

- [ ] Dos precios live activos y recurrentes.
- [ ] Webhook live habilitado con todos los eventos requeridos.
- [ ] Compra de importe controlado mediante Checkout con tarjeta real autorizada.
- [ ] Suscripción reflejada en Supabase y permisos actualizados.
- [ ] Portal accesible; cancelación y renovación verificadas.
- [ ] Reembolso/cancelación del cargo de prueba y evidencia Stripe registrada.

Nunca automatizar un cargo real desde CI. La prueba debe realizarla un propietario autorizado y registrar IDs de Checkout, pago, cliente, suscripción y evento sin copiar secretos ni datos completos de tarjeta.

## Recuperación

- [ ] Backup cifrado reciente de base y Storage.
- [ ] Restore drill exitoso en infraestructura aislada.
- [ ] RLS y conteos reconciliados tras restaurar.
- [ ] RPO/RTO medidos y dentro de 24 h/4 h.
- [ ] Rotación de credenciales ensayada.

## Aprobación

El workflow `Formal production validation` exige el SHA exacto, aprobación explícita de carga y referencias de pago/restore. Solo genera `status=APPROVED` cuando pasan todas las puertas. El environment `production-validation` debe requerir dos aprobadores y no debe compartir aprobadores con quien ejecutó el pago real.
