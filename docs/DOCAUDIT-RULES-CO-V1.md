# Reglas deterministas de DocAudit Colombia v1

**Paquete:** `docaudit-co`  
**Versión:** `1.0.0`  
**Vigente desde:** 7 de agosto de 2026  
**Referencia técnica:** Anexo Técnico DIAN 1.9

## Alcance

El paquete se ejecuta sobre los hechos extraídos antes de cualquier explicación generada por IA. Sus hallazgos se conservan en `deterministicAudit` y cada uno registra código, versión, severidad, evidencia, valor observado y valor esperado.

Incluye:

- recomposición de líneas a partir de cantidad y precio unitario;
- suma de líneas y comparación con subtotal;
- descuentos, cargos y total antes de impuestos;
- cálculo de impuesto o retención desde base y tarifa;
- suma separada de impuestos y retenciones;
- total con impuestos y total pagadero;
- campos obligatorios generales y por línea;
- fechas ISO, secuencia emisión/vencimiento y hora;
- moneda, número documental, CUFE/CUDE e identificaciones;
- dígito de verificación para identificaciones tipo NIT (`31`);
- duplicidad por organización, jurisdicción, emisor y número fiscal.

## Precisión

Todos los cálculos usan enteros escalados con `BigInt`; no interviene coma flotante. La tolerancia técnica de comparación es `0.01`. Esta tolerancia sirve para detectar diferencias de representación y no constituye todavía una política tributaria de redondeo aprobada.

## Duplicidad

El hash del archivo y la identidad fiscal son controles distintos. La identidad normalizada se guarda en `documents.fiscal_supplier_tax_id` y `documents.fiscal_document_number`. Un índice permite buscar la misma combinación dentro del tenant sin impedir que el sistema persista el segundo documento y emita el hallazgo crítico correspondiente.

## Límites regulatorios

Hasta resolver PD-008, el paquete comprueba coherencia matemática de impuestos y retenciones informados, pero no decide por sí solo qué tributos o tarifas debieron aplicarse a una operación. El hallazgo de total pagadero usa severidad `warning` porque anticipos, redondeos y casos regulatorios pueden requerir reglas adicionales.

Cambiar tolerancias, fórmulas, códigos o semántica exige una nueva versión del paquete y pruebas que preserven los resultados históricos.
