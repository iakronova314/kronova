# Contrato de datos de DocAudit Colombia

**Versión:** 1.0.0  
**Jurisdicción:** Colombia (`CO`)  
**Alcance:** UBL 2.1 y Anexo Técnico DIAN 1.9  
**Estado:** estable para frontend y backend

## Artefactos canónicos

- `src/modules/docaudit/colombia/schemas/v1/docaudit-result.schema.json`: JSON Schema 2020-12 para validar fronteras.
- `src/modules/docaudit/colombia/schemas/v1/types.ts`: contrato TypeScript detallado.
- `src/modules/docaudit/colombia/schemas/v1/required-fields.ts`: obligatoriedad por tipo documental y capacidades por fuente.

`analysis_jobs.schema_version` y `analysis_results.schema_version` deben guardar `1.0.0`. El paquete regulatorio y las reglas tienen versiones independientes; cambiar una regla no cambia automáticamente el contrato de transporte.

## Hechos y conclusiones

`facts` contiene solamente valores observados o derivados. Cada valor incluye método, confianza y referencias a `evidence`. `findings` contiene inconsistencias producidas por reglas. `conclusion` agrega los hallazgos para presentación, pero no reemplaza los hechos.

Todos los grupos normalizados se emiten siempre. Si un valor no puede observarse, se usa `value: null`, `method: not_observed` y, si la matriz lo exige, un hallazgo `completeness`. Esto mantiene una forma estable entre XML, ZIP y PDF.

Un PDF aislado debe declarar sus limitaciones y nunca afirmar validación de XML, firma o DIAN. `ApplicationResponse` y `AttachedDocument` se registran como fuente o evidencia, no como la factura auditada.

## Representación

- Importes y cantidades usan cadenas decimales, nunca coma flotante binaria.
- Monedas usan ISO 4217.
- Instantes usan RFC 3339.
- Confianza está entre 0 y 1 y mide fiabilidad, no probabilidad de cumplimiento.
- Evidencia identifica artefacto y localizador (XPath, región de PDF, cálculo o respuesta externa).

## Inconsistencias

Cada `finding` incluye código estable `CO-*`, categoría, severidad, regla y versión, evidencia, observado/esperado, confianza, recomendación y necesidad de revisión profesional.

| Severidad | Significado |
| --- | --- |
| `info` | Contexto sin acción necesaria. |
| `warning` | Dato dudoso o diferencia a revisar. |
| `error` | Regla incumplida o inconsistencia material. |
| `critical` | No permite confiar en identidad, integridad o resultado. |

Los códigos no se reutilizan con otro significado. La redacción puede localizarse; código, evidencia y versión de regla son invariantes.

## Obligatoriedad para Colombia v1

Factura, nota crédito y nota débito requieren identificación y fecha del documento, moneda, CUFE/CUDE, emisor, adquirente, líneas, totales y presencia de firma. Las notas requieren además referencias al documento afectado. La respuesta DIAN y la validación criptográfica son condicionales a que la fuente permita comprobarlas.

Impuestos, retenciones, monedas admitidas, tolerancias y casos especiales permanecen condicionales hasta aprobar PD-008 con un especialista tributario colombiano. El modelo ya los representa sin exigir una migración futura.

## Versionado

SemVer gobierna el contrato:

- `patch`: aclaraciones o restricciones equivalentes;
- `minor`: adiciones compatibles;
- `major`: eliminación, renombre, cambio de tipo, unidad o semántica.

El productor valida antes de persistir. El backend rechaza versiones mayores desconocidas y el frontend elige renderer por versión mayor. Resultados históricos conservan versiones de contrato, parser, reglas, prompt y modelo.

## Límite de uso

El resultado es apoyo preventivo, no certificación tributaria, jurídica ni contable. Toda conclusión contiene `SUPPORT_TOOL_NOT_PROFESSIONAL_ADVICE`. Solo se declara validación DIAN cuando exista evidencia explícita de una respuesta suministrada o una consulta externa autorizada.

## Referencias oficiales

- DIAN, documentación técnica y Anexo Técnico de Factura Electrónica de Venta 1.9.
- DIAN, Resolución 000165 de 2023 compilada y modificada.
- DIAN, modelo de validación previa, `ApplicationResponse` y `AttachedDocument`.
