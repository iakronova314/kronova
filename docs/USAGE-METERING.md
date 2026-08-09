# Medición de consumo documental

## Unidad y límite

Una unidad corresponde a un documento aceptado para procesamiento. `DocAudit Starter` tiene un límite de 300 unidades por periodo; Trial y Growth toman sus límites del catálogo `plans`.

El periodo proviene de la suscripción activa (`current_period_start` y `current_period_end`). Mientras no exista una suscripción normalizada, las organizaciones Starter usan el mes calendario como periodo provisional.

## Flujo transaccional

`create_analysis_job_with_quota` ejecuta bajo un bloqueo transaccional por tenant:

1. Resuelve plan, periodo y límite.
2. Busca un job con la misma clave idempotente.
3. Calcula documentos únicos reservados o procesados en el periodo.
4. Reutiliza el job existente sin consumir otra unidad, o bloquea si no queda cuota.
5. Crea atómicamente el job y el evento `document_reserved`.

El worker añade `document_processed` con una segunda clave idempotente cuando el reporte está listo. El consumo cuenta `document_id` distintos entre ambos tipos, por lo que reserva y finalización representan una sola unidad.

Los reintentos automáticos y manuales reutilizan el mismo job y las mismas claves. No generan unidades adicionales.

## Control de excesos

La API comprueba el saldo antes de emitir una URL firmada de carga para una respuesta rápida. Esa comprobación no es la autoridad porque puede haber concurrencia. La función transaccional vuelve a comprobar la cuota al crear el job; el documento 301 recibe `DOCUMENT_QUOTA_EXCEEDED` y no entra a la cola.

## Dashboard

`GET /api/billing/usage` devuelve plan, periodo, uso, límite, saldo, porcentaje y estado de bloqueo. El dashboard actualiza el medidor cada 30 segundos y después de reservar un documento.
