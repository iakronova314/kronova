# Infraestructura, secretos y recuperación

## Controles HTTP

La aplicación aplica CSP, HSTS, `nosniff`, anti-framing, política de referentes, permisos mínimos y aislamiento de contexto. Las escrituras `/api` rechazan navegadores cross-site y orígenes distintos a `NEXT_PUBLIC_SITE_URL`. No se publica `Access-Control-Allow-Origin`; las API privadas son same-origin. Webhooks y crons sin `Origin` conservan su autenticación criptográfica o Bearer.

La CSP sin nonce mantiene generación estática y permite `unsafe-inline` únicamente para compatibilidad con el runtime actual de Next.js. La evolución recomendada es CSP con nonce cuando el producto acepte renderizado dinámico global.

## Secretos por ambiente

- Solo variables `NEXT_PUBLIC_*` pueden llegar al navegador y ninguna contiene secretos.
- Producción valida URL HTTPS, claves Supabase, service role, secreto de cron y clave de cifrado ReviewSync al iniciar.
- Desarrollo, preview y producción deben usar proyectos, claves y buckets separados.
- Rotar inmediatamente ante exposición; rotación trimestral para secretos de aplicación y anual para claves maestras, o antes según riesgo.
- No reutilizar `CRON_SECRET`, claves Stripe, Gemini, Google, Resend o Supabase entre ambientes.

## Dependencias

`npm audit --audit-level=high` bloquea CI. La revisión de 2026-08-09 encontró 0 vulnerabilidades conocidas. Dependabot/Renovate debe habilitarse en el repositorio y toda actualización mayor requiere pruebas completas.

## Backup y recuperación

El workflow semanal `backup-recovery.yml` produce un `pg_dump` y copia el bucket `documents`, cifra el paquete con AES-256/PBKDF2, lo almacena off-site con KMS y ejecuta una restauración aislada. Los secretos de origen y destino deben pertenecer a cuentas diferentes y con mínimo privilegio.

Objetivos iniciales: RPO 24 horas y RTO 4 horas. Para producción de pago, habilitar backups diarios administrados y PITR de Supabase para reducir RPO. Los backups de base de datos no incluyen objetos Storage, por eso el workflow respalda ambos por separado.

Cada trimestre debe realizarse un ejercicio manual: restaurar a un proyecto aislado, rotar credenciales, verificar RLS, contar organizaciones/documentos, descargar una muestra autorizada desde Storage y documentar duración y desviaciones. Nunca restaurar sobre producción como prueba.

Secretos requeridos por el workflow: `BACKUP_DATABASE_URL`, `BACKUP_ENCRYPTION_PASSWORD`, credenciales S3 de Supabase, `BACKUP_AWS_ROLE_ARN`, región, bucket off-site y clave KMS.
