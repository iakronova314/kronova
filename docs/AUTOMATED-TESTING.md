# Suite automática

La verificación se ejecuta en cada pull request y cada cambio a `main` mediante `.github/workflows/quality.yml`.

## Capas

- `npm run test:unit`: cálculos, reglas, validadores, esquemas y seguridad de prompts.
- `npm run test:integration`: contratos HTTP y límites del webhook.
- `supabase/tests/*.sql`: esquema, aislamiento multi-tenant, RLS, cuotas, idempotencia y observabilidad contra PostgreSQL real.
- `tests/unit/stripe-webhook.test.mjs`: firma exacta, rechazo de alteraciones, límite e inbox idempotente de Stripe.
- `npm run test:e2e`: Chromium recorre registro, inicio de prueba, Checkout simulado en frontera externa, carga firmada y resultado del análisis.

El E2E sustituye solamente Stripe, Storage y el procesador asíncrono en sus fronteras HTTP. El registro, sesión, organización, páginas y navegación usan la aplicación y Supabase locales reales. La sincronización del webhook y sus efectos de base de datos quedan cubiertos por las pruebas de integración/SQL para evitar contactar servicios externos desde CI.

## Ejecución local

1. `supabase start`
2. Exportar las credenciales mostradas por `supabase status -o env` a las variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
3. `npm test`
4. `npx playwright install chromium` la primera vez.
5. `npm run test:e2e`

Las pruebas que requieren una aplicación activa se omiten localmente si `TEST_BASE_URL` no está definido; en CI esta variable siempre está presente, por lo que no pueden omitirse allí.
