# KRONOVA — Registro de decisiones pendientes

**Versión:** 1.0

**Fecha:** 1 de agosto de 2026

**Estado:** Activo

## Propósito

Este documento reúne decisiones comerciales, legales y técnicas que todavía no deben bloquear el desarrollo, pero que deben resolverse antes de la tarea indicada. Cuando se tome una decisión, se debe registrar la fecha, responsable, opción elegida y justificación.

## Estados

- `PENDIENTE`: todavía no se ha elegido una opción.
- `EN ANÁLISIS`: se están recopilando datos o haciendo pruebas.
- `DECIDIDA`: existe una decisión aprobada y documentada.
- `DESCARTADA`: dejó de ser necesaria, indicando el motivo.

## Prioridades

- `CRÍTICA`: bloquea una tarea próxima o el lanzamiento.
- `ALTA`: afecta costos, seguridad o experiencia principal.
- `MEDIA`: puede resolverse después del MVP técnico.
- `BAJA`: corresponde a expansión o mejora futura.

---

## 1. Facturación y pagos

### PD-001 — Elegibilidad de la cuenta Stripe

- **Estado:** DECIDIDA
- **Prioridad:** CRÍTICA
- **Resolver antes de:** implementar Stripe en producción.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Contexto confirmado:** la empresa se constituirá en Colombia, todavía no está constituida, no existe una cuenta Stripe empresarial y la cuenta bancaria de liquidación será colombiana.
- **Motivo:** Stripe no admite actualmente la apertura directa de cuentas de pagos para entidades locales colombianas.
- **Evidencia:** página oficial de disponibilidad global de Stripe consultada el 9 de agosto de 2026; Colombia no figura como país admitido para Stripe Payments.
- **Opciones:**
  1. Usar Stripe con una entidad legítima de un país soportado.
  2. Reservar Stripe para una expansión internacional posterior.
  3. No utilizar Stripe para el lanzamiento colombiano.
- **Decisión:** no utilizar Stripe como proveedor de pagos para el lanzamiento con entidad colombiana. No constituir una entidad extranjera únicamente para obtener acceso a Stripe. La opción internacional solo se reconsiderará si existe una necesidad comercial independiente y después de revisión legal, contable y tributaria.
- **Impacto:** `PD-002` deberá seleccionar un proveedor compatible con una entidad y cuenta bancaria colombianas. La integración Stripe permanecerá desactivada y no se solicitarán claves live.

### PD-002 — Proveedor principal para Colombia

- **Estado:** DECIDIDA — CONFIGURACIÓN EXTERNA PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** Tarea 20 — Completar facturación.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Decisión:** Mercado Pago será el proveedor principal de suscripciones para el lanzamiento en Colombia.
- **Justificación:** ofrece gestión nativa de suscripciones, cobros recurrentes, reintentos automáticos, pausas, cancelaciones, reactivaciones, periodos de prueba y webhooks. Esto reduce la complejidad operativa frente a implementar el ciclo recurrente directamente sobre fuentes de pago.
- **Alternativa futura:** Wompi podrá evaluarse para pagos individuales, medios locales o reducción de costos cuando exista volumen real.
- **Pruebas necesarias:** checkout, webhooks, reintentos, cancelación, reembolsos, sandbox, conciliación y comportamiento de pagos recurrentes.
- **Configuración externa pendiente:** crear y verificar la cuenta empresarial de Mercado Pago Colombia después de constituir la entidad, crear la aplicación de KRONOVA, obtener credenciales de prueba y producción, y confirmar las tarifas y capacidades habilitadas para la cuenta.
- **Regla:** no solicitar credenciales productivas ni activar cobros reales antes de completar la constitución y verificación de la entidad vendedora.
- **Impacto:** reemplazar o adaptar la integración Stripe existente a Mercado Pago antes de habilitar facturación en producción.

### PD-003 — Uso de PSE, Nequi y Efecty

- **Estado:** DECIDIDA — VALIDACIÓN EXTERNA PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** diseñar el checkout definitivo.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Decisión:** las tarjetas y el saldo de Mercado Pago serán los medios principales para suscripciones y renovaciones automáticas. PSE se ofrecerá cuando esté habilitado para la cuenta y se tratará como un medio que puede requerir intervención del cliente. Efecty será una alternativa de pago manual, sin prometer continuidad automática. Nequi no se ofrecerá inicialmente hasta que Mercado Pago confirme su disponibilidad y comportamiento dentro del producto de Suscripciones contratado.
- **Paquetes adicionales:** no se ofrecerán en el lanzamiento; primero se validará el límite documental y la demanda real.
- **Política de acceso:** el servicio continuará automáticamente únicamente cuando el medio admita el cobro recurrente. Si requiere una nueva autorización, el cliente deberá completar la renovación antes del vencimiento.
- **Validación externa pendiente:** confirmar en la cuenta empresarial de Mercado Pago qué medios están habilitados para Suscripciones en Colombia y probar cada uno en el ambiente disponible antes de anunciarlo públicamente.
- **Regla:** la interfaz mostrará únicamente los medios devueltos o confirmados por Mercado Pago; no se prometerá recurrencia para PSE, Efecty o Nequi sin evidencia de la cuenta productiva.

### PD-004 — Precios finales en pesos colombianos

- **Estado:** DECIDIDA
- **Prioridad:** ALTA
- **Resolver antes de:** publicar checkout en producción.
- **Base existente:** Starter USD 29 y Growth USD 59 como referencias del alcance.
- **Fecha de decisión parcial:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Decisión aprobada:** los precios serán fijos en pesos colombianos (COP) y no se realizará conversión diaria automática desde USD.
- **Decisión aprobada sobre impuestos:** el precio publicado mostrará el valor total que pagará el cliente e incluirá el IVA cuando legalmente corresponda; la factura discriminará la base y el impuesto.
- **Precios mensuales aprobados:** DocAudit Starter tendrá un precio final de `$119.900 COP/mes` y DocAudit Growth tendrá un precio final de `$239.900 COP/mes`.
- **Facturación anual:** no se ofrecerá en el lanzamiento inicial; se evaluará después de validar demanda, costos y comportamiento de renovación.
- **Regla:** la factura electrónica se emitirá en COP y discriminará los impuestos legalmente aplicables.
- **Impacto técnico pendiente:** actualizar el catálogo, la interfaz y la futura integración de Mercado Pago para usar COP y los valores aprobados antes de habilitar el checkout.

### PD-005 — Facturación electrónica de las ventas de KRONOVA

- **Estado:** EN ANÁLISIS — TRÁMITES EXTERNOS PENDIENTES
- **Prioridad:** CRÍTICA
- **Resolver antes de:** recibir el primer pago real.
- **Fecha de decisión parcial:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Estructura aprobada:** la entidad vendedora será una S.A.S. colombiana cuyo nombre legal todavía está por definir. KRONOVA será la marca y el producto SaaS propiedad de esa S.A.S.; no será una filial ni una sucursal.
- **Titularidad:** la S.A.S. será titular de la marca, el software, el dominio, los contratos y demás propiedad intelectual de KRONOVA, sujeto a formalizar las cesiones o aportes que correspondan al constituirla.
- **Sistema de facturación aprobado:** utilizar la Facturación Gratuita DIAN durante el lanzamiento inicial. Se evaluará un proveedor tecnológico integrado cuando el volumen operativo lo justifique.
- **Pendiente:** definir el nombre legal y los accionistas, constituir la S.A.S., obtener RUT y NIT, consultar y solicitar la marca KRONOVA ante la SIC, habilitar la Facturación Gratuita DIAN y determinar con un contador el tratamiento de IVA, retenciones, régimen y demás impuestos aplicables.
- **Participantes:** fundador, contador colombiano y asesor legal/tributario cuando corresponda.
- **Regla:** la S.A.S. aparecerá como vendedor y emisor en contratos, checkout y facturas; KRONOVA se presentará como su marca comercial.
- **Decisión:** Parcialmente definida; no puede cerrarse hasta completar la constitución y la validación tributaria documentada.

### PD-006 — Política de excesos de consumo

- **Estado:** DECIDIDA — AJUSTES TÉCNICOS PENDIENTES
- **Prioridad:** MEDIA
- **Resolver antes de:** Tarea 19 — Medición de consumo.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Decisión:** bloquear nuevas cargas al alcanzar la cuota y restablecerla al comenzar el siguiente periodo. Los documentos y reportes existentes continuarán disponibles.
- **Cambio de plan:** el cliente podrá solicitar o ejecutar un cambio manual a Growth; KRONOVA no cambiará planes ni generará cobros automáticamente.
- **Excesos:** no se cobrarán excedentes automáticos ni se venderán paquetes adicionales durante el lanzamiento inicial.
- **Unidad de consumo:** un documento consume una unidad cuando es aceptado para procesamiento. Los reintentos del mismo documento no consumen unidades adicionales.
- **Créditos operativos:** cuando un fallo sea atribuible a KRONOVA, soporte podrá devolver manualmente la unidad dejando trazabilidad e idempotencia.
- **Avisos:** mostrar advertencias al alcanzar 80 %, 90 % y 100 % de la cuota.
- **Base técnica existente:** el bloqueo transaccional, la idempotencia, el medidor y el rechazo al superar la cuota ya están implementados.
- **Ajustes técnicos pendientes:** añadir el aviso diferenciado del 90 % y un mecanismo administrativo auditado para devolver unidades.

---

## 2. Producto y normativa

### PD-007 — Segmento inicial de clientes en Colombia

- **Estado:** DECIDIDA — VALIDACIÓN COMERCIAL PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** finalizar las reglas de DocAudit.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Decisión:** el segmento inicial serán firmas contables pequeñas y contadores independientes que administran facturas electrónicas de pymes colombianas de servicios profesionales.
- **Empresas atendidas inicialmente:** consultoría, agencias, tecnología, servicios administrativos y otros servicios profesionales que utilicen facturas electrónicas estándar UBL 2.1.
- **Comprador principal:** contador independiente, propietario o administrador de una firma contable pequeña.
- **Usuarios principales:** contadores, auxiliares contables, analistas y administradores.
- **Exclusiones iniciales:** salud, aduanas, nómina electrónica, POS, RADIAN y sectores con anexos documentales especializados.
- **Impacto:** tipos de factura, volumen, reglas, mensajes y canal comercial.
- **Validación pendiente:** entrevistar y probar el producto con usuarios del segmento, y confirmar cómo una firma administrará varias empresas cliente dentro del modelo de organizaciones y planes.

### PD-008 — Cobertura tributaria exacta de DocAudit v1

- **Estado:** EN ANÁLISIS — VALIDACIÓN CONTABLE PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** Tarea 14 — Esquema de DocAudit.
- **Fecha de decisión provisional:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Alcance provisional aprobado:** factura electrónica de venta, nota crédito y nota débito UBL 2.1 conforme al Anexo Técnico DIAN 1.9, para operaciones nacionales expresadas en COP.
- **Impuestos incluidos:** extraer y recalcular IVA, INC y retenciones únicamente cuando estén declarados en el documento. Validar bases, porcentajes informados, sumas, retenciones y totales sin determinar automáticamente si el impuesto o la retención eran legalmente aplicables.
- **Tolerancia propuesta:** diferencias aritméticas de hasta `$1 COP`; requiere validación del contador y ajuste técnico porque el paquete de reglas actual usa `0.01`.
- **Exclusiones:** moneda extranjera y TRM, reglas territoriales de ICA, determinación de retefuente, reteIVA o reteICA aplicable, impuestos saludables o sectoriales, operaciones aduaneras y consulta en línea con DIAN.
- **Descargo:** el reporte será una validación documental y aritmética y no un concepto tributario definitivo.
- **Pendiente:** obtener aprobación escrita de un contador sobre impuestos incluidos, límites, tolerancia y redacción del descargo antes de considerar estable la cobertura regulatoria.
- **Requiere:** revisión de contador o especialista tributario colombiano.
- **Decisión:** alcance provisional aprobado; cierre condicionado a validación profesional.

### PD-009 — Verificación en línea con DIAN

- **Estado:** DECIDIDA
- **Prioridad:** MEDIA
- **Resolver antes de:** cerrar el alcance técnico de DocAudit v1.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Decisión:** DocAudit v1 no consultará automáticamente la DIAN. Validará los artefactos suministrados por el cliente y permitirá la verificación manual mediante CUFE o UUID en el portal oficial.
- **Evidencia admitida:** `ApplicationResponse`, `AttachedDocument` u otra respuesta DIAN incluida en el paquete documental cargado.
- **Regla de reporte:** si no existe evidencia explícita, el resultado indicará `Validación DIAN no comprobada` y nunca afirmará aceptación o validación en tiempo real.
- **Prohibiciones:** no automatizar el portal, resolver CAPTCHA, hacer scraping ni utilizar endpoints no documentados o no autorizados.
- **Evolución futura:** una consulta automática solo podrá incorporarse mediante un servicio oficial de la DIAN o un proveedor autorizado, con contrato, permisos y documentación vigente.

### PD-010 — Archivo legal extendido

- **Estado:** DECIDIDA — AJUSTE TÉCNICO Y REVISIÓN LEGAL PENDIENTES
- **Prioridad:** MEDIA
- **Resolver antes de:** ofrecer retención superior a la estándar.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Decisión:** KRONOVA no ofrecerá archivo legal de 5 o 10 años durante el lanzamiento y no se presentará como repositorio contable oficial.
- **Retención estándar:** archivos originales durante 30 días; resultados estructurados y reportes durante 12 meses; registros mínimos de consumo y auditoría durante 24 meses.
- **Derechos del cliente:** permitir eliminación anticipada y exportación antes del vencimiento, sujeto a bloqueos legales o contractuales documentados.
- **Archivo extendido:** fuera del MVP; solo podrá evaluarse después de analizar requisitos legales, integridad probatoria, costos, backups y recuperación.
- **Contradicción corregida:** la referencia anterior de 90 días para originales queda reemplazada por 30 días.
- **Ajuste técnico pendiente:** separar la eliminación del archivo original de la conservación del resultado. El proceso actual elimina el registro documental al vencer y puede borrar en cascada el reporte antes de completar 12 meses.
- **Revisión pendiente:** validar la política completa con asesoría legal antes de producción.

### PD-011 — País siguiente después de Colombia

- **Estado:** PENDIENTE
- **Prioridad:** BAJA
- **Resolver antes de:** iniciar expansión regulatoria.
- **Revisado:** 9 de agosto de 2026.
- **Decisión actual:** mantener el pendiente abierto y no seleccionar todavía el siguiente país.
- **Condiciones para retomarlo:** operación estable en Colombia, clientes pagos, demanda repetida desde un mismo país, especialista regulatorio local y presupuesto de implementación y mantenimiento.
- **Opciones preliminares:** México, Brasil, Chile, Perú u otro mercado según clientes y complejidad técnica.
- **Decisión:** Por definir.

---

## 3. Idiomas y localización

### PD-012 — Idioma predeterminado

- **Estado:** DECIDIDA — AJUSTES TÉCNICOS PENDIENTES
- **Prioridad:** MEDIA
- **Resolver antes de:** implementar i18n.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Decisión:** español de Colombia (`es-CO`) será el idioma predeterminado de la interfaz, reportes y comunicaciones del lanzamiento.
- **Formato regional:** fechas, moneda y números utilizarán convenciones colombianas. Los términos DIAN conservarán sus denominaciones oficiales en español.
- **Inglés:** podrá añadirse como selección manual futura para interfaz y explicaciones; no cambiará la jurisdicción ni traducirá códigos o evidencia regulatoria.
- **Detección automática:** no se cambiará el idioma según el navegador durante el lanzamiento. Una preferencia futura deberá ser elegida explícitamente y persistida por usuario u organización.
- **Ajustes técnicos pendientes:** traducir las secciones públicas que aún están en inglés, cambiar el atributo raíz HTML de `es` a `es-CO` y comprobar consistencia de todos los formatos regionales.

### PD-013 — Orden de nuevos idiomas

- **Estado:** PENDIENTE
- **Prioridad:** BAJA
- **Resolver antes de:** expansión internacional.
- **Revisado:** 9 de agosto de 2026.
- **Base aprobada:** español de Colombia durante el lanzamiento e inglés como segundo idioma cuando exista demanda comercial.
- **Política provisional:** el tercer idioma se decidirá según el país aprobado en `PD-011`; portugués correspondería a Brasil y una variante regional del español a México, Chile o Perú. Francés, alemán e italiano quedan fuera de las primeras expansiones.
- **Regla:** añadir un idioma no habilita ni promete soporte fiscal o regulatorio para los países que lo utilizan.
- **Pendiente:** ordenar y aprobar los idiomas posteriores al inglés cuando se seleccione el siguiente mercado. No comenzar traducciones adicionales hasta que la interfaz `es-CO` esté completa y estable.
- **Decisión:** Por definir.

### PD-014 — Traducción de reportes regulatorios

- **Estado:** DECIDIDA — IMPLEMENTACIÓN FUTURA
- **Prioridad:** MEDIA
- **Resolver antes de:** ofrecer reportes bilingües en producción.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Decisión:** la evidencia original, los códigos de reglas y las denominaciones oficiales DIAN, CUFE, CUDE, IVA, NIT y UBL no se traducirán ni modificarán. Podrán traducirse el resumen, la descripción de hallazgos, las recomendaciones y el descargo profesional.
- **Integridad:** valores y cálculos permanecerán invariables; solo podrá cambiar su presentación regional. Cada reporte registrará el idioma y las versiones de plantilla, prompt y reglas usadas.
- **Descargo:** la versión traducida acompañará una versión oficial en español cuando sea necesario.
- **Regla regulatoria:** traducir un reporte no habilita ni implica soporte normativo para otro país.
- **Control de traducción:** no se aplicará traducción automática libre sobre reportes terminados; cada idioma utilizará plantillas y prompts versionados y probados.
- **Lanzamiento:** únicamente se generarán reportes `es-CO`. La implementación bilingüe queda condicionada a la activación futura del inglés.

---

## 4. Infraestructura y operación

### PD-015 — Planes contratados de Supabase, Vercel y Cloudflare

- **Estado:** DECIDIDA — CONTRATACIÓN EXTERNA PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** staging con procesamiento real.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Fundador de KRONOVA.
- **Decisión Supabase:** contratar el plan Pro y mantener proyectos independientes para staging y producción, inicialmente con cómputo Micro. Usar los backups diarios administrados y el backup externo previsto por KRONOVA. No contratar PITR inicialmente; reevaluarlo con clientes y volumen reales.
- **Decisión Vercel:** contratar el plan Pro y crear proyectos independientes para staging y producción bajo una sola cuenta o equipo inicial. El plan Pro es necesario para ejecutar los cron jobs con frecuencia de minutos.
- **Decisión Cloudflare:** no contratar Workers/Queues durante el lanzamiento. El procesamiento actual continuará con PostgreSQL y Vercel Cron; Cloudflare se evaluará únicamente si las métricas de duración, concurrencia o backlog demuestran que es necesario.
- **Costo orientativo:** Supabase inicia aproximadamente en USD 35 mensuales para dos proyectos Micro dentro de una organización Pro, sujeto al cálculo vigente del panel. El costo de Vercel debe confirmarse al contratar según usuarios y créditos vigentes.
- **Contratación pendiente:** crear las cuentas o equipos, registrar medio de pago, crear los proyectos, confirmar límites y presupuesto final en los paneles oficiales.
- **Impacto:** tamaño máximo, concurrencia, retención, recuperación y SLA interno.

### PD-016 — Región principal y residencia de datos

- **Estado:** DECIDIDA — VALIDACIÓN EN STAGING PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** crear Supabase de producción.
- **Fecha:** 9 de agosto de 2026.
- **Decisión:** usar `us-east-1` (Norte de Virginia) como región principal de Supabase para staging y producción. Vercel y los servicios dependientes deberán configurarse lo más cerca posible para reducir latencia.
- **Justificación:** es una región disponible en Supabase, adecuada para el mercado colombiano y compatible con la arquitectura actual. Mantener ambos ambientes en la misma región simplifica pruebas sin compartir proyectos ni datos.
- **Validación pendiente:** medir latencia y transferencia en staging y documentar las transmisiones internacionales de datos antes de procesar documentos reales.
- **Regla:** producción y staging no compartirán proyecto ni datos.
- **Decisión futura:** un cambio de región exigirá migración planificada; no se hará automáticamente por expansión comercial.

### PD-017 — Proveedor de OCR

- **Estado:** DECIDIDA — IMPLEMENTACIÓN Y PRUEBAS PENDIENTES
- **Prioridad:** ALTA
- **Resolver antes de:** Tarea 11 — Extracción de texto.
- **Fecha:** 9 de agosto de 2026.
- **Decisión:** usar Gemini multimodal mediante un proyecto con facturación activa como OCR inicial para PDF escaneado. El parser determinista seguirá siendo prioritario para XML y PDF con texto; OCR solo se invocará cuando la extracción local resulte insuficiente.
- **Fallback futuro:** evaluar un proveedor OCR especializado únicamente si las pruebas muestran precisión, costo o latencia insuficientes.
- **Pruebas necesarias:** precisión en facturas colombianas, tablas, costos, latencia y tratamiento de datos.
- **Pendiente técnico:** implementar el flujo OCR, salida estructurada, límites de páginas/tamaño y pruebas. Actualmente estos documentos terminan con `OCR_REQUIRED`.

### PD-018 — Monitoreo y gestión de errores

- **Estado:** DECIDIDA — DESPLIEGUE PENDIENTE
- **Prioridad:** MEDIA
- **Resolver antes de:** Tarea 28 — Observabilidad.
- **Fecha:** 9 de agosto de 2026.
- **Decisión:** usar logging estructurado propio, eventos técnicos en Supabase, identificadores de trazabilidad y métricas de Vercel. No contratar Sentry ni Cloudflare Analytics durante el lanzamiento.
- **Evidencia técnica:** observabilidad, alertas operativas, panel de métricas, RLS y documentación ya están implementados.
- **Regla:** nunca enviar texto documental o secretos a logs de terceros.
- **Pendiente:** desplegar la migración de observabilidad, configurar limpieza y validar alertas en staging.

### PD-019 — Proveedor de correo transaccional

- **Estado:** DECIDIDA — CONFIGURACIÓN EXTERNA PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** probar autenticación en staging y permitir registros de clientes reales.
- **Fecha:** 9 de agosto de 2026.
- **Decisión:** usar Resend como proveedor de correo transaccional y SMTP durante el lanzamiento.
- **Pendiente externo:** crear la cuenta, verificar el dominio, configurar SPF, DKIM y DMARC, crear claves separadas por ambiente y registrar SMTP en Supabase Auth.
- **Pruebas necesarias:** confirmación de cuenta, recuperación, invitación, expiración, reenvío, dominio, SPF, DKIM, DMARC, entregabilidad y costos.
- **Regla:** el servicio de correo predeterminado de Supabase solo se usará durante desarrollo; producción requiere SMTP controlado por KRONOVA.
- **Evidencia técnica:** alertas de LeaseReader, reintentos e idempotencia ya usan el adaptador Resend.

### PD-020 — Proveedor de WhatsApp

- **Estado:** PENDIENTE
- **Prioridad:** BAJA
- **Resolver antes de:** alertas WhatsApp de LeaseReader.
- **Opciones:** Meta WhatsApp Cloud API, Twilio u otro BSP aprobado.
- **Revisado:** 9 de agosto de 2026.
- **Decisión actual:** mantener pendiente y fuera del lanzamiento. No evaluar proveedor hasta estabilizar entregabilidad, rebotes, reintentos y monitoreo de email.
- **Decisión:** Por definir.

---

### PD-027 — Desplegar y validar las migraciones en Supabase staging

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver después de:** Tareas 06 y 07, ya implementadas localmente.
- **Resolver antes de:** aplicar migraciones en producción o permitir acceso a clientes reales.
- **Pendiente:** crear un proyecto Supabase independiente para staging, configurar sus variables de entorno y aplicar las migraciones `001` a `010`.
- **Pruebas requeridas:** registro, confirmación de correo, recuperación de contraseña, creación de organización, invitaciones, aceptación por usuarios nuevos y existentes, cambio de organización, roles, carga de documentos, operaciones de la aplicación e intentos de acceso cruzado entre dos empresas.
- **Criterio de aprobación:** todas las migraciones se ejecutan sin errores y las pruebas RLS confirman que ningún usuario puede leer o modificar datos de otra organización.
- **Paso posterior:** respaldar producción, aplicar las migraciones aprobadas y realizar una prueba rápida con cuentas controladas.
- **Regla:** staging y producción no compartirán proyecto, credenciales ni datos de clientes.
- **Decisión:** Por ejecutar.

### PD-028 — Configurar URLs y plantillas de Supabase Auth

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver durante:** despliegue de `PD-027` en staging.
- **Resolver antes de:** probar confirmaciones, recuperación de contraseña e invitaciones por correo.
- **Pendiente:** registrar `NEXT_PUBLIC_SITE_URL`, Site URL y Redirect URLs separadas para desarrollo, staging y producción en Supabase Authentication.
- **Rutas requeridas:** `/auth/callback`, `/auth/confirm`, `/auth/update-password` y `/dashboard` bajo los dominios autorizados.
- **Pendiente adicional:** revisar y personalizar las plantillas de confirmación, recuperación e invitación con textos de KRONOVA y enlaces compatibles con PKCE/SSR.
- **Pruebas requeridas:** enlace válido, enlace vencido, enlace reutilizado, dominio incorrecto y redirección segura sin destinos externos.
- **Regla:** no usar comodines amplios en las URLs de producción y no mezclar dominios de staging con producción.
- **Decisión:** Por configurar.

### PD-029 — Ajustar límites de consumo y estrategia perimetral

- **Estado:** PENDIENTE
- **Prioridad:** ALTA
- **Resolver durante:** pruebas de carga en staging y antes de producción.
- **Base provisional implementada:** 10 solicitudes por usuario, 60 por organización y 30 por IP cada minuto, con contadores atómicos en PostgreSQL.
- **Pendiente:** ajustar límites por plan, definir excepciones para integraciones B2B y decidir si Cloudflare Rate Limiting complementará la protección de aplicación.
- **Pruebas requeridas:** concurrencia, múltiples instancias serverless, NAT empresarial, IPv4/IPv6, abuso distribuido, respuestas `429` y efecto sobre costos de Gemini.
- **Pendiente operativo:** programar limpieza periódica y monitoreo de la tabla privada de contadores.
- **Regla:** ningún cambio podrá eliminar los límites por usuario y organización ni depender exclusivamente de memoria local.
- **Decisión:** Por validar con tráfico de staging.

---

### PD-030 — Limpiar cargas documentales abandonadas

- **Estado:** PENDIENTE
- **Prioridad:** MEDIA
- **Resolver antes de:** producción con carga documental.
- **Pendiente:** programar un trabajo que elimine objetos y registros `pending_upload` o `failed` que superen el tiempo de tolerancia definido.
- **Criterio provisional:** revisar cargas pendientes con más de 24 horas sin afectar trabajos activos.
- **Pruebas requeridas:** carga interrumpida, token firmado vencido, reintento, objeto ausente y eliminación idempotente.
- **Decisión:** Por implementar junto con los trabajos programados de mantenimiento.

### PD-031 — Resolver avisos de seguridad en dependencias de Next.js

- **Estado:** DECIDIDA — RESUELTA
- **Prioridad:** ALTA
- **Resolver antes de:** lanzamiento a producción.
- **Fecha de cierre:** 9 de agosto de 2026.
- **Hallazgo original:** `npm audit` reportó avisos altos heredados por dependencias de Next.js.
- **Regla:** no ejecutar `npm audit fix --force`; actualmente propone degradar Next.js a 9.3.3 y rompería la aplicación.
- **Evidencia de cierre:** `npm audit --audit-level=high` devuelve `0 vulnerabilities` con el árbol de dependencias actual.
- **Decisión:** cerrar el hallazgo y mantener `npm audit --audit-level=high` como puerta obligatoria de CI. Las futuras actualizaciones continuarán siendo controladas y probadas.

### PD-032 — Validar ejecución y capacidad del worker asíncrono

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver durante:** despliegue en staging.
- **Pendiente:** configurar `CRON_SECRET`, activar Vercel Cron y confirmar frecuencia, duración máxima, concurrencia y costos del plan contratado.
- **Pruebas requeridas:** caída durante procesamiento, lease vencido, reintentos, backoff, dos workers concurrentes, Gemini `429`, documentos grandes y backlog sostenido.
- **Decisión futura:** mantener el worker en Vercel o trasladarlo a Cloudflare Workers/Queues según duración y volumen reales.
- **Regla:** el endpoint interno nunca será público ni funcionará sin secreto; aumentar concurrencia requiere conservar el claim atómico.
- **Decisión:** Por validar en staging.

---

## 5. Seguridad, privacidad y legal

### PD-021 — Responsable del tratamiento de datos

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** captar clientes reales.
- **Pendiente:** definir entidad responsable, datos de contacto, encargados y procedimiento para consultas o eliminación.
- **Revisado:** 9 de agosto de 2026.
- **Bloqueo real:** la S.A.S. todavía no está constituida ni tiene nombre legal, NIT, domicilio o correo de privacidad. No es posible cerrar este punto sin esos datos.
- **Decisión:** Por definir.

### PD-022 — Uso de documentos por proveedores de IA

- **Estado:** EN ANÁLISIS — CONFIGURACIÓN Y REVISIÓN LEGAL PENDIENTES
- **Prioridad:** CRÍTICA
- **Resolver antes de:** procesar documentos reales de clientes.
- **Fecha de política provisional:** 9 de agosto de 2026.
- **Decisión provisional:** usar únicamente Gemini API como servicio pago mediante un proyecto de Google Cloud con facturación activa. No enviar documentos empresariales mediante cuota o servicios no pagados.
- **Motivo:** los términos de Gemini indican que el servicio pago no usa prompts, archivos o respuestas para mejorar productos, mientras que el servicio no pagado puede utilizarlos y someterlos a revisión humana.
- **Controles:** minimizar el contenido enviado, no usar tuning ni Grounding con Google Search, no prometer retención cero sin verificar elegibilidad/configuración y registrar modelo, proyecto y versión.
- **Pendiente:** aceptar y archivar los términos/DPA aplicables, verificar retención y regiones efectivas de la cuenta, configurar facturación y obtener revisión legal sobre transmisiones internacionales.
- **Resultado requerido:** configuración y política comunicable al cliente.
- **Decisión:** Por definir.

### PD-023 — Condiciones de uso y descargo profesional

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** lanzamiento.
- **Pendiente:** aprobar términos que aclaren que KRONOVA asiste y no sustituye DIAN, contabilidad o asesoría legal.
- **Revisado:** 9 de agosto de 2026.
- **Evidencia existente:** hay borradores de términos, privacidad y descargos dentro de la aplicación.
- **Bloqueo real:** faltan la entidad legal y la revisión/aprobación de un abogado; los borradores no se consideran documentos definitivos.
- **Decisión:** Por definir.

### PD-024 — Respuesta a incidentes y backups

- **Estado:** EN ANÁLISIS — CONFIGURACIÓN Y SIMULACRO PENDIENTES
- **Prioridad:** ALTA
- **Resolver antes de:** producción.
- **Fecha de política provisional:** 9 de agosto de 2026.
- **Decisión provisional:** el fundador será responsable operativo e incident commander inicial hasta designar un suplente. Los objetivos iniciales serán RPO de 24 horas y RTO de 4 horas.
- **Procedimiento aprobado:** contener el incidente, preservar evidencia técnica, rotar secretos afectados, restaurar en un entorno aislado, verificar RLS e integridad, reconciliar eventos externos y comunicar a clientes afectados conforme a la evaluación legal.
- **Backups:** backups administrados diarios de Supabase y copia externa cifrada semanal que incluya Postgres y Storage; simulacro de restauración trimestral.
- **Pendiente:** definir suplente y canales de contacto, configurar credenciales/destino externo, ejecutar el primer backup y demostrar una restauración dentro de RPO/RTO.
- **Decisión:** política definida; cierre condicionado a evidencia operativa.

---

## 6. Módulos futuros

### PD-025 — Alcance comercial de LeaseReader

- **Estado:** DECIDIDA — LANZAMIENTO FUTURO
- **Prioridad:** BAJA
- **Resolver antes de:** Tarea 22.
- **Fecha:** 9 de agosto de 2026.
- **Decisión:** LeaseReader no formará parte del lanzamiento comercial inicial. DocAudit Colombia se estabilizará primero.
- **Alcance técnico existente:** contratos inmobiliarios en Colombia, extracción de partes, inmueble, fechas, canon, depósito, incrementos, renovación, preaviso, penalizaciones y terminación; revisión humana y alertas por email mediante Resend.
- **Regla:** no afirmar incumplimiento legal automático; mantener el descargo de herramienta de apoyo hasta contar con reglas revisadas por un abogado colombiano.
- **Pendiente futuro:** validación jurídica, pruebas con contratos reales autorizados y definición de precio antes de activar comercialmente el módulo.

### PD-026 — Primera plataforma de ReviewSync

- **Estado:** DECIDIDA
- **Prioridad:** BAJA
- **Resolver antes de:** Tarea 25.
- **Fecha:** 9 de agosto de 2026.
- **Responsable:** Producto y arquitectura KRONOVA.
- **Decisión:** Google Business Profile será la única plataforma de v1. OAuth 2.0 usará `business.manage`; la sincronización será cada 15 minutos y las respuestas serán borradores asistidos con aprobación humana individual obligatoria. No habrá publicación automática ni masiva.
- **Gate externo:** no iniciar el conector productivo hasta obtener acceso básico de Business Profile API y cuota mayor que cero.
- **Detalle:** `docs/REVIEWSYNC-MVP-SCOPE.md`.

---

## 7. Plantilla para cerrar una decisión

```text
ID:
Fecha:
Responsable:
Estado: DECIDIDA
Opción elegida:
Justificación:
Alternativas descartadas:
Impacto en arquitectura o alcance:
Tareas que deben actualizarse:
Fecha de revisión futura:
```

## 8. Próximas decisiones críticas

Los bloqueadores reales que permanecen abiertos, antes de iniciar despliegue, son:

1. `PD-005` y `PD-021` — constituir la S.A.S., obtener sus datos legales y recibir el concepto tributario del contador.
2. `PD-002` y `PD-004` — adaptar la integración Stripe existente a Mercado Pago y actualizar catálogo/interfaz con los precios aprobados en COP.
3. `PD-008` — obtener validación contable del alcance tributario provisional de DocAudit.
4. `PD-022` y `PD-023` — configurar Gemini como servicio pago y completar revisión legal de proveedores, privacidad y términos.
5. `PD-017` y `PD-030` — implementar OCR para documentos escaneados y limpieza de cargas abandonadas.
6. `PD-027`, `PD-028`, `PD-029` y `PD-032` — crear staging, desplegar migraciones, configurar Auth y validar límites/worker con tráfico real.
7. `PD-019` y `PD-024` — configurar Resend/SMTP y demostrar backup, restauración y respuesta operativa.

`PD-011`, `PD-013` y `PD-020` permanecen pendientes de baja prioridad y no bloquean el lanzamiento: expansión internacional, idiomas posteriores y WhatsApp.
