# Contrato de datos de LeaseReader Colombia

**Versión:** 1.0.0  
**Jurisdicción:** Colombia (`CO`)  
**Estado:** estable para frontend y backend

## Artefactos canónicos

- `src/modules/leasereader/colombia/schemas/v1/leasereader-result.schema.json`: JSON Schema 2020-12 para validar fronteras.
- `src/modules/leasereader/colombia/schemas/v1/types.ts`: contrato TypeScript completo.
- `src/modules/leasereader/colombia/schemas/v1/required-fields.ts`: grupos estables y hechos mínimos.

`analysis_jobs.schema_version` y `analysis_results.schema_version` guardan `1.0.0`. La versión del paquete legal, las reglas, el extractor y el prompt se registran de manera independiente.

## Separación de información

`facts` contiene únicamente texto observado o valores derivados: partes, inmueble, vigencia, canon, depósito, incrementos, renovación, preaviso, penalizaciones, terminación y cláusulas. Un dato ausente se conserva como `value: null`, `method: not_observed`, confianza `0` y evidencia vacía; nunca se elimina la propiedad.

`risks` contiene evaluaciones explicables y versionadas. `conclusion` solo resume esos riesgos. Ninguna conclusión modifica el texto contractual extraído.

## Evidencia y confianza

Cada hecho y riesgo referencia elementos de `evidence`. La evidencia identifica artefacto, página base 1, localizador, fragmento y, cuando existe, región PDF normalizada `[x, y, width, height]`. Para cálculos o respuestas externas la página puede ser `null`.

La confianza está entre 0 y 1 y expresa fiabilidad de extracción o evaluación, no validez jurídica. Riesgos con evidencia insuficiente deben requerir revisión manual.

## Representación

- Importes y porcentajes usan cadenas decimales para evitar errores binarios.
- Monedas usan ISO 4217.
- Fechas usan `YYYY-MM-DD`; instantes usan RFC 3339.
- Duraciones, preavisos y periodos de subsanación usan días o meses enteros explícitos.
- Partes, penalizaciones, terminaciones, incrementos y cláusulas tienen identificadores estables para referencias cruzadas.

## Riesgos

Las severidades son `info`, `low`, `medium`, `high` y `critical`. Cada riesgo incluye código estable `CO-LEASE-*`, categoría, evidencia, hechos y cláusulas relacionadas, observado/esperado, recomendación, regla y versión, referencia legal opcional y necesidad de revisión profesional.

La versión 1.0.0 modela el alcance necesario, pero no afirma todavía que una cláusula incumple la legislación colombiana. Esa conclusión requiere un paquete de reglas separado, efectivo y revisado profesionalmente.

## Versionado

Se usa SemVer: `patch` para aclaraciones compatibles, `minor` para adiciones opcionales compatibles y `major` para cambios de nombre, tipo, unidad o significado. Backend y frontend deben rechazar versiones mayores desconocidas y conservar resultados históricos con su versión original.

## Límite de uso

El reporte incluye siempre `SUPPORT_TOOL_NOT_LEGAL_ADVICE`. LeaseReader es una herramienta de apoyo y no sustituye revisión de un abogado, estudio de títulos, inspección del inmueble ni verificación registral.
