# KRONOVA — Alcance funcional del MVP para Colombia

**Versión:** 1.0

**Fecha:** 1 de agosto de 2026

**Estado:** Aprobado como línea base de producto

**Mercado inicial:** Colombia

## 1. Objetivo

Construir una plataforma SaaS B2B multiempresa que permita a pymes colombianas cargar facturas electrónicas, detectar inconsistencias técnicas, aritméticas y documentales, y obtener un reporte explicable antes de contabilizarlas.

KRONOVA será una herramienta de apoyo y control preventivo. No sustituirá a la DIAN, a un proveedor tecnológico, a un contador ni a un asesor legal, y no certificará por sí sola el cumplimiento tributario definitivo.

## 2. Estrategia geográfica

El producto se diseñará con un núcleo común y paquetes regulatorios independientes por país:

1. Colombia.
2. Otros países de América Latina, seleccionados según demanda.
3. Estados Unidos.
4. Europa.

Las reglas fiscales nunca se compartirán automáticamente entre países. Cada paquete tendrá jurisdicción, versión normativa, fecha de vigencia y pruebas propias.

## 3. Idiomas

### MVP

- Interfaz: español e inglés.
- Documentos analizados: documentos fiscales colombianos en español.
- Reportes: español o inglés, elegible por organización o usuario.
- Fechas, moneda y números: formateados según configuración regional.

### Expansión

1. Portugués de Brasil.
2. Francés.
3. Alemán.
4. Italiano.
5. Otros idiomas según el país habilitado y la demanda comercial.

La arquitectura utilizará claves de traducción y locales estándar. No se prometerá soporte regulatorio para un país únicamente porque su idioma esté disponible.

## 4. Módulos del producto

Los tres módulos confirmados son:

1. **DocAudit:** auditoría de facturación y cumplimiento documental.
2. **LeaseReader:** extracción, resumen y alertas de contratos inmobiliarios.
3. **ReviewSync:** gestión y respuesta asistida de reseñas.

El lanzamiento inicial incluirá únicamente **DocAudit Colombia**. LeaseReader se desarrollará después de estabilizar el pipeline documental. ReviewSync será la tercera fase, ya que requiere conectores y una arquitectura distinta.

## 5. Documentos admitidos por DocAudit Colombia

### Incluidos en el MVP

- Factura electrónica de venta en XML conforme a UBL 2.1 y al Anexo Técnico DIAN vigente para la versión implementada, inicialmente versión 1.9.
- Nota crédito electrónica relacionada con una factura.
- Nota débito electrónica relacionada con una factura.
- Contenedor electrónico `AttachedDocument` cuando incluya los documentos necesarios para la auditoría.
- Respuesta de validación DIAN `ApplicationResponse` cuando esté incluida en el paquete cargado.
- Archivo ZIP que contenga XML y representación gráfica PDF de una misma factura.
- PDF digital o escaneado como entrada auxiliar, sujeto a extracción de texto u OCR.

### Tratamiento de PDF

Un PDF aislado permitirá realizar extracción, cálculos y advertencias, pero el reporte indicará que no fue posible validar integralmente la estructura XML, la firma electrónica ni todos los datos técnicos de DIAN.

### Excluidos del MVP

- Documento equivalente electrónico y POS.
- Documento soporte en adquisiciones a sujetos no obligados a facturar.
- Nómina electrónica y notas de ajuste de nómina.
- Factura electrónica como título valor y eventos RADIAN.
- Facturas de salud y anexos sectoriales especializados.
- Documentos aduaneros.
- Emisión, firma o transmisión de facturas a DIAN.
- Sustitución de un proveedor tecnológico autorizado.

Estos documentos se incorporarán mediante paquetes separados después del MVP.

## 6. Validaciones incluidas

### Técnicas y estructurales

- Tipo real del archivo, tamaño, integridad y contenido esperado.
- Estructura XML y namespaces esperados.
- Presencia de los componentes UBL/DIAN requeridos para el alcance implementado.
- Existencia y coherencia básica de CUFE o CUDE.
- Presencia de firma electrónica y datos de validación disponibles.
- Correspondencia entre XML, PDF y documentos contenidos en el ZIP.
- Detección de archivos duplicados mediante hash.

### Datos principales

- Emisor y adquirente.
- NIT, dígito de verificación y tipo de identificación cuando aplique.
- Número, prefijo, fecha y hora.
- Moneda.
- Líneas de productos o servicios.
- Cantidades, precios, descuentos y cargos.
- Subtotal, impuestos, retenciones y total.
- Referencias entre factura, nota crédito y nota débito.

### Aritméticas

- Suma de líneas.
- Aplicación de descuentos y cargos.
- Bases gravables y tarifas informadas.
- Suma de impuestos y retenciones.
- Coherencia entre subtotal, anticipos y total pagadero.
- Tolerancias de redondeo configurables y registradas.

### Resultado

Cada hallazgo incluirá:

- Código estable.
- Severidad: informativo, advertencia, error o crítico.
- Descripción.
- Regla y versión aplicadas.
- Valor encontrado y valor esperado cuando corresponda.
- Evidencia: campo XML o página del PDF.
- Nivel de confianza cuando intervenga IA.
- Recomendación de revisión.

## 7. Validaciones no prometidas en el MVP

- Concepto legal o tributario definitivo.
- Garantía de aceptación contable o fiscal.
- Confirmación en tiempo real contra todos los sistemas de DIAN.
- Determinación automática de fraude.
- Interpretación definitiva de operaciones tributarias ambiguas.
- Actualización normativa sin revisión, versionado y pruebas.

Los reportes deberán mostrar una advertencia de revisión profesional cuando el hallazgo dependa de interpretación normativa.

## 8. Flujo funcional

1. El usuario se registra y crea una organización.
2. Selecciona DocAudit Colombia.
3. Carga XML, ZIP o PDF.
4. KRONOVA valida seguridad, tipo y tamaño.
5. El archivo se almacena de forma privada.
6. Se crea un trabajo asíncrono.
7. Se extraen y normalizan los datos.
8. Se ejecutan reglas deterministas.
9. La IA clasifica, resume y explica los hallazgos permitidos.
10. El usuario revisa un reporte con evidencia.
11. El resultado puede exportarse y queda en el historial según la política de retención.

## 9. Roles

- **Propietario:** administra organización, plan, miembros y datos.
- **Administrador:** administra documentos, reglas disponibles y miembros, excepto propiedad y facturación restringida.
- **Analista:** carga, consulta y revisa documentos.
- **Lector:** consulta reportes sin cargar ni modificar.

## 10. Planes, precios y límites de lanzamiento

Los precios se expresan inicialmente en USD; antes del lanzamiento se evaluará cobro localizado en COP e impuestos aplicables.

### Prueba gratuita

- 14 días.
- 20 documentos.
- 1 organización.
- 2 usuarios.
- Sin API pública.

### DocAudit Starter — USD 29/mes

- Hasta 300 documentos por periodo mensual.
- 1 organización.
- Hasta 3 usuarios.
- XML, ZIP y PDF.
- Historial y exportación de reportes.
- Soporte por correo.

### DocAudit Growth — USD 59/mes

- Hasta 1.000 documentos por periodo mensual.
- 1 organización.
- Hasta 10 usuarios.
- Todo lo incluido en Starter.
- API y webhooks con límites.
- Soporte prioritario.

### Exceso y Enterprise

- No habrá documentos ilimitados.
- Al alcanzar la cuota se bloquearán nuevos procesos hasta contratar un paquete adicional o cambiar de plan.
- Enterprise tendrá precio, volumen, retención y SLA personalizados.
- Los documentos fallidos antes de iniciar extracción no consumirán cuota.
- Los reintentos técnicos automáticos de un mismo trabajo no consumirán una segunda unidad.

LeaseReader y ReviewSync no se incluirán comercialmente hasta que estén implementados y probados.

## 11. Retención y eliminación

KRONOVA no será presentado en el MVP como sistema legal de archivo o repositorio contable definitivo.

- Archivos originales: 90 días desde su carga.
- Texto extraído y resultados detallados: 12 meses desde el análisis.
- Registros mínimos de consumo, seguridad y auditoría: 24 meses.
- Elementos eliminados y copias operativas: purga máxima en 30 días, salvo obligación legal o incidente abierto.
- El usuario podrá eliminar anticipadamente archivos y resultados si sus permisos lo permiten.
- Antes de eliminar, el usuario podrá exportar el original y el reporte.

La plataforma informará que las empresas colombianas pueden tener obligaciones propias de conservación superiores a la retención operativa de KRONOVA. La legislación tributaria contempla un mínimo de cinco años para determinados soportes, mientras que la conservación de libros y papeles del comerciante puede alcanzar diez años. El cliente seguirá siendo responsable de su archivo legal.

En una fase posterior podrá ofrecerse archivo extendido de 5 o 10 años como servicio separado, después de validar requisitos legales, costos, integridad y recuperación.

## 12. Seguridad y privacidad mínimas

- Autenticación obligatoria.
- Aislamiento por organización mediante RLS.
- Almacenamiento privado y URLs firmadas.
- Cifrado en tránsito y el cifrado disponible del proveedor en reposo.
- Rate limiting y cuotas por organización.
- Registro de accesos y acciones críticas.
- Eliminación controlada.
- Prohibición de registrar contenido documental en logs.
- Política de tratamiento de datos conforme al régimen aplicable en Colombia.
- Contratos y configuración de proveedores que contemplen el tratamiento de información empresarial y datos personales.

## 13. Métricas de aceptación del MVP

- Ningún usuario puede acceder a documentos de otra organización.
- El 100 % de los trabajos tiene estado y trazabilidad.
- Los cálculos deterministas tienen pruebas automatizadas.
- Todo hallazgo muestra evidencia y versión de regla.
- Ningún endpoint de IA funciona sin autenticación y cuota.
- Stripe activa y desactiva correctamente los permisos del plan.
- XML, ZIP y PDF se prueban con archivos válidos, inválidos, manipulados y duplicados.
- Las pruebas críticas, TypeScript, lint y build pasan antes del despliegue.

## 14. Criterios de finalización

El MVP estará funcionalmente terminado cuando una pyme pueda registrarse, pagar, cargar una factura colombiana admitida, recibir un reporte trazable, consultar su historial, controlar su consumo y eliminar o exportar su información sin intervención manual del equipo de KRONOVA.

## 15. Fuentes normativas y técnicas de referencia

- DIAN, documentación técnica del Sistema de Facturación Electrónica y Anexo Técnico de Factura Electrónica de Venta 1.9: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/
- DIAN, modelo de operación y uso de XML basado en UBL 2.1: https://factura-electronica.dian.gov.co/modelo-operacion-19.html
- DIAN, Resolución 000165 de 2023 y modificaciones compiladas: https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0165_2023.htm
- DIAN, documento soporte en adquisiciones a no obligados: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/marco-normativo-y-documentacion-tecnica-del-doc-sopor-adqui-no-obligados/
- DIAN, documento equivalente electrónico: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/marco-normativo-y-documentacion-tecnica-del-doc-equivalente-electronico/
- DIAN, conservación tributaria de facturas y documentos: https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_13759_2024.htm
- Ley 962 de 2005, artículo 28, conservación de libros y papeles del comerciante: https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F1671809
- SIC, Ley Estatutaria 1581 de 2012 sobre protección de datos personales: https://sedeelectronica.sic.gov.co/transparencia/normativa/ley-estatutaria-1581-de-2012

## 16. Aprobación

Este documento se adopta como línea base funcional de la primera versión de KRONOVA. Cualquier ampliación de tipos documentales, jurisdicciones, retención o promesas regulatorias deberá registrarse como una nueva versión del alcance.

**Decisiones aprobadas:**

- País inicial: Colombia.
- Primer módulo comercial: DocAudit.
- Otros módulos confirmados: LeaseReader y ReviewSync.
- Formatos iniciales: XML DIAN, ZIP documental y PDF auxiliar.
- Idiomas iniciales: español e inglés.
- Plan inicial: USD 29 por hasta 300 documentos mensuales.
- Retención estándar del archivo original: 90 días.
- KRONOVA es una herramienta de apoyo, no una certificación legal o tributaria.
