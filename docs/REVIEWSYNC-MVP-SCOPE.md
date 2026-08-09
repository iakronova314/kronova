# ReviewSync MVP — alcance cerrado

**Versión:** 1.0.0  
**Fecha:** 9 de agosto de 2026  
**Estado:** aprobado para diseñar el conector

## Decisión

ReviewSync v1 integrará exclusivamente **Google Business Profile**. Sincronizará reseñas de ubicaciones verificadas que el usuario conectado pueda administrar, clasificará sentimiento y prioridad, generará un borrador y exigirá aprobación humana individual antes de publicarlo.

Facebook, Instagram, TripAdvisor, Yelp, Trustpilot, marketplaces, scraping, CSV y agregadores quedan fuera. Una segunda plataforma requiere datos de adopción, nuevo análisis de políticas y una nueva versión del alcance.

## OAuth

- Google Cloud project separado por ambiente, Business Profile APIs habilitadas y acceso básico aprobado.
- OAuth 2.0 Authorization Code con PKCE, `state` y nonce de un solo uso.
- Scope único `https://www.googleapis.com/auth/business.manage`; no se solicitará el scope legado.
- Acceso offline; refresh tokens cifrados con una clave externa a la base de datos.
- Conexión separada del login de KRONOVA. Solo `owner` y `admin` conectan, reconectan o revocan.
- El usuario selecciona cuentas y ubicaciones verificadas explícitamente. KRONOVA no se agrega como propietario.
- Desconectar revoca el token cuando sea posible, elimina secretos locales y detiene sincronización y publicación.

La aprobación de Google es un gate externo obligatorio. Una cuota igual a cero significa que el proyecto todavía no tiene acceso.

## Sincronización

- Importación inicial paginada mediante `ListReviews` para ubicaciones seleccionadas.
- Persistencia de identificadores, estrellas, comentario, autor visible, fechas, respuesta existente y estado.
- Contenido de Google temporal, seguro y con retención máxima de 30 días.
- Polling incremental cada 15 minutos por `update_time desc`, más actualización manual con rate limit.
- Upsert idempotente por `(provider, location_id, review_id)` y cursor por ubicación.
- Backoff para `429` y errores transitorios; `401` o `invalid_grant` exige reautorización.
- Contenido eliminado se marca no disponible y se purga; no se crea un archivo histórico permanente.
- Notificaciones en tiempo real quedan para una iteración posterior tras medir polling y cuotas.

## IA, aprobación y publicación

La IA puede clasificar sentimiento y urgencia, señalar escalamiento y proponer un borrador en el idioma de la reseña siguiendo el tono configurado. No puede publicar, borrar ni modificar respuestas.

Flujo obligatorio:

`synced → draft_generated → edited_optional → approved → publishing → published | failed`

- Cada aprobación corresponde a una reseña y versión exacta del texto.
- No hay aprobación masiva ni consentimiento permanente para autopublicar.
- El aprobador ve reseña, estrellas, ubicación, borrador y advertencias.
- `owner`, `admin` y `analyst` editan y aprueban; `viewer` solo consulta.
- La publicación usa `UpdateReviewReply`, idempotencia local y auditoría de actor, texto, fecha, respuesta y error.
- Si Google rechaza una respuesta, vuelve a revisión; la IA no la reescribe ni reintenta automáticamente.

**Decisión v1:** respuestas manuales asistidas, nunca automáticas. Una automatización futura necesita otra decisión, revisión de políticas vigentes y consentimiento específico; no se habilitará con una opción global.

## Modelo mínimo previsto

- `review_connections`: organización, proveedor, identidad, scopes, estado, expiración y referencia al secreto cifrado.
- `review_locations`: cuenta, ubicación, zona horaria, estado y cursor.
- `reviews`: identidad externa, estrellas, texto, autor visible, fechas, respuesta, sentimiento, prioridad y expiración.
- `review_reply_drafts`: versión, modelo, prompt, editor, aprobación y hash.
- `review_publications`: intento, idempotencia, actor, estado, respuesta externa y error.
- `review_sync_runs`: cursor, conteos, cuota, duración y error sin tokens.

Todas serán multiempresa con RLS. Tokens y secretos nunca estarán disponibles en el navegador ni en logs.

## Fuera de alcance

- Respuestas automáticas o masivas.
- Gestión de ficha, dirección, horarios, fotos, posts, Q&A o verificaciones.
- Creación o reclamación de ubicaciones.
- Analítica histórica superior a la retención permitida.
- Scraping, credenciales compartidas, moderación o eliminación de reseñas.
- CRM, campañas, cupones o solicitudes de reseñas.

## Gates para iniciar el conector

1. Acceso básico aprobado y cuota mayor que cero.
2. Consent screen y dominios verificados en desarrollo y staging.
3. Ubicación real autorizada para pruebas controladas y mocks para CI.
4. Política de privacidad actualizada y retención máxima de 30 días.
5. Diseño aprobado de cifrado, rotación y revocación de refresh tokens.
6. Pruebas de revocación, `invalid_grant`, paginación, duplicados, `429`, eliminación y rechazo de respuestas.

## Referencias

- Google Business Profile APIs: OAuth overview e implementación OAuth.
- Google My Business API v4.9: Reviews (`ListReviews`, `GetReview`, `UpdateReviewReply`).
- Google Business Profile APIs policies y límites de uso.
