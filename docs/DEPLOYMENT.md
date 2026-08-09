# Despliegue repetible y rollback

## Entornos aislados

| Entorno | Rama | Aplicación | Datos | `APP_ENV` |
| --- | --- | --- | --- | --- |
| Desarrollo | feature | Next.js y Supabase CLI locales | Datos sintéticos | `development` |
| Staging | `develop` | Proyecto Vercel exclusivo y dominio `staging.<dominio>` | Proyecto Supabase exclusivo | `staging` |
| Producción | SHA promovido manualmente | Proyecto Vercel exclusivo y dominio principal | Proyecto Supabase exclusivo con backups/PITR | `production` |

Nunca se copian documentos ni usuarios reales hacia desarrollo o staging. Cada ambiente usa Stripe, Google, Gemini, Resend, cifrado y cron con credenciales diferentes.

## Preparación única

1. Crear proyectos separados en Supabase y Vercel para staging y producción.
2. En Vercel configurar todas las variables de `.env.example` por ambiente. `NEXT_PUBLIC_SITE_URL`, callbacks OAuth/Stripe y URLs de Auth deben coincidir exactamente con el dominio correspondiente.
3. Crear los entornos protegidos `staging` y `production` en GitHub. Producción debe exigir aprobación humana y restringirse a mantenedores.
4. Registrar variables GitHub indicadas en los workflows: IDs de organización/proyecto Vercel, referencias Supabase y URLs públicas.
5. Registrar secretos: tokens Vercel/Supabase, contraseñas de base, URL directa de staging, claves Stripe de prueba y bypass de automatización.
6. En Vercel desactivar la asignación automática del dominio de producción. El pipeline usa `--skip-domain` y promoción explícita.
7. Asociar dominios y verificar DNS/SSL con `vercel domains inspect`. Mantener staging protegido y fuera de indexación.

## Flujo

1. PR: CI local ejecuta migraciones limpias, RLS, unitarias, integración, build y E2E.
2. `develop`: aplica migraciones a staging, ejecuta pruebas SQL/RLS, despliega y corre smoke, API y E2E.
3. Producción: un mantenedor introduce el SHA exacto probado en staging y aprueba el environment.
4. Se crea un deployment productivo sin dominio, se aplican migraciones compatibles hacia adelante, se prueba el deployment y solo entonces se promueve.
5. El manifiesto conserva SHA, URL y fecha durante 90 días.

## Política de migraciones

Toda migración de producción debe ser expand/contract: primero añadir estructuras compatibles, desplegar código que migre su uso y eliminar estructuras antiguas en una entrega posterior. No renombrar, eliminar columnas ni cambiar semántica en la misma entrega. `supabase db push` se ejecuta únicamente desde CI/CD.

## Rollback

Ante un fallo de aplicación, ejecutar `Rollback production application` con una URL anteriormente saludable y la referencia del incidente. Vercel reasigna el dominio sin reconstruir y luego ejecuta smoke tests.

El rollback de aplicación no revierte la base. Para una migración compatible se aplica una corrección hacia adelante. Una restauración PITR se reserva para pérdida o corrupción, exige declarar incidente, detener escrituras, capturar el punto temporal, aprobación de dos personas y seguir `INFRASTRUCTURE-SECURITY.md`. Después se rotan credenciales y se reconcilian Stripe, Storage y eventos ocurridos durante la ventana.

## Checklist posterior

- `/`, `/login`, `/privacy` y `/terms` responden 200 con CSP.
- API protegida responde 401 sin sesión y nunca expone secretos.
- Registro, carga, worker, alertas y webhooks usan el ambiente correcto.
- Migraciones y RLS están aplicadas; observabilidad no muestra aumento de fallos.
- Dominio tiene HTTPS, HSTS y callbacks exactos.
