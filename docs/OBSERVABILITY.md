# Observabilidad operativa

Kronova emite logs JSON y guarda eventos técnicos mínimos en Supabase. El encabezado `x-trace-id` permite correlacionar una respuesta con el trabajo, el evento y la alerta asociados.

## Política de datos

Solo se admiten identificadores técnicos, códigos de error, estados, contadores, duraciones y una lista cerrada de atributos. No se registran cuerpos HTTP, cabeceras, nombres o contenido de documentos, texto extraído, prompts, respuestas de IA, correos, IP, claves ni secretos. `observability.ts` descarta atributos que no estén expresamente permitidos.

## Fuentes y métricas

- `instrumentation.ts`: inicio del servidor y errores no controlados por Next.js.
- `document_worker`: inicio, finalización, reintento, fallo terminal, duración y unidades procesadas.
- `/api/operations/overview`: ventana de 24 horas con trabajos, fallos, tasa de error, duración media, p95, alertas y errores recientes. Solo owner/admin.
- `operational_alerts`: alerta crítica deduplicada cuando un trabajo agota sus reintentos.

## Investigación

1. Copiar `x-trace-id` de la respuesta o el `trace_id` de una alerta.
2. Consultar `observability_events` por `trace_id`, `job_id` o `document_id`.
3. Revisar cronología, `error_code`, intento y duración.
4. Corregir la causa y marcar la alerta como resuelta mediante operación administrativa controlada.

La migración `20260809000600_create_observability.sql` debe aplicarse antes del despliegue. La retención recomendada es 30 días para eventos y 180 días para alertas; debe configurarse como tarea de mantenimiento en la infraestructura elegida.
