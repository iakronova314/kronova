# Dashboard con datos reales

El dashboard no mantiene cifras, empresas ni actividades de demostración. Cada bloque se alimenta con datos aislados por organización y protegidos por RLS.

| Superficie | Fuente |
| --- | --- |
| KPI y actividad | `/api/dashboard/overview`, documentos, vencimientos, reseñas, miembros y alertas |
| Consumo y límite | `/api/billing/usage`, eventos de uso y suscripción efectiva |
| Historial | `/api/documents` |
| Búsqueda global | `/api/search`, documentos, texto extraído y reseñas |
| Notificaciones | Alertas reales programadas o fallidas |
| Plan visible | Suscripción activa o en prueba, unida al catálogo de planes |

Configuración y facturación usan los permisos de la organización. Las claves API se guardan únicamente como SHA-256; el secreto completo se entrega una sola vez al crearlo. La migración `20260809000500_create_api_keys.sql` debe estar aplicada antes de usar esa pantalla.
