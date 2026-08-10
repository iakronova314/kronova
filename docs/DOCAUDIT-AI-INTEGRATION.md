# Integración de IA de DocAudit

**Prompt:** `invoice-report-es-CO@1.0.0`  
**Modelo solicitado:** `gemini-3.5-flash`  
**Semilla:** `1701`  
**Temperatura:** `0`

## Responsabilidad

La IA redacta el resumen ejecutivo y explicaciones complementarias de hallazgos que ya produjo el motor determinista. No calcula importes, no crea reglas, no cambia códigos o severidades y no decide cumplimiento tributario definitivo.

El reporte conserva por separado versiones de esquema, parser, reglas, prompt, modelo solicitado y versión real devuelta por el proveedor.

## Protección frente a instrucciones documentales

El modelo no recibe el texto completo del archivo. Recibe hechos normalizados y una vista limitada de hallazgos deterministas, marcados como datos no confiables. Los valores documentales:

- se serializan como JSON de usuario, nunca como instrucciones del sistema;
- tienen controles de profundidad, cantidad y longitud;
- pierden caracteres de control;
- no pueden seleccionar herramientas ni producir acciones;
- no pueden sobrescribir hallazgos durante la combinación.

El prompt del sistema ordena ignorar instrucciones, roles, enlaces o código encontrados dentro de esos valores. Esta defensa reduce la superficie de prompt injection; no se presenta como garantía absoluta.

## Salida y combinación

Gemini debe responder con JSON restringido por `responseJsonSchema`: resumen, una explicación por `findingId` autorizado y notas de revisión. La aplicación vuelve a validar:

- forma y tipos;
- longitud y texto plano;
- ausencia de identificadores desconocidos o repetidos;
- presencia de todos los identificadores enviados.

Una respuesta inválida produce un error normalizado y entra en el mecanismo existente de reintentos. Al combinar, la IA solo añade explicación y orientación; código, categoría, severidad, evidencia, observado, esperado, regla y confianza proceden del motor determinista.

Para limitar tamaño y exposición se envían como máximo 200 hallazgos, priorizados `critical`, `error`, `warning`, `info`.

## Reproducibilidad

Temperatura y semilla fijas reducen variación, pero un proveedor puede actualizar internamente un modelo. Por ello se registra `model_name`, `model_version`, `prompt_version`, `rules_version`, tokens y la salida final persistida. Los resultados históricos nunca se regeneran silenciosamente.
