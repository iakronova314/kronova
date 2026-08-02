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

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** implementar Stripe en producción.
- **Pendiente:** confirmar país de registro, entidad legal, cuenta bancaria de liquidación, monedas y capacidades activas de la cuenta Stripe existente.
- **Motivo:** Stripe no admite actualmente la apertura directa de cuentas de pagos para entidades locales colombianas.
- **Evidencia requerida:** información legal del Dashboard y confirmación de Stripe si existe alguna ambigüedad.
- **Opciones:**
  1. Usar Stripe con una entidad legítima de un país soportado.
  2. Reservar Stripe para una expansión internacional posterior.
  3. No utilizar Stripe para el lanzamiento colombiano.
- **Decisión:** Por definir.

### PD-002 — Proveedor principal para Colombia

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** Tarea 20 — Completar facturación.
- **Pendiente:** elegir entre Mercado Pago, Wompi u otro proveedor colombiano para el lanzamiento.
- **Recomendación actual:** evaluar primero Mercado Pago por su producto documentado de suscripciones; evaluar Wompi para pagos locales y paquetes.
- **Pruebas necesarias:** checkout, webhooks, reintentos, cancelación, reembolsos, sandbox, conciliación y comportamiento de pagos recurrentes.
- **Decisión:** Por definir.

### PD-003 — Uso de PSE, Nequi y Efecty

- **Estado:** PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** diseñar el checkout definitivo.
- **Pendiente:** definir si estos medios se usarán para suscripción, renovación manual o compra de paquetes adicionales.
- **Regla provisional:** no considerarlos recurrentes hasta confirmación contractual y pruebas del proveedor.
- **Decisión:** Por definir.

### PD-004 — Precios finales en pesos colombianos

- **Estado:** PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** publicar checkout en producción.
- **Base existente:** Starter USD 29 y Growth USD 59 como referencias del alcance.
- **Pendiente:** establecer precio fijo en COP, impuestos incluidos o separados, redondeo y frecuencia anual futura.
- **Regla provisional:** no realizar conversión diaria automática desde USD.
- **Decisión:** Por definir.

### PD-005 — Facturación electrónica de las ventas de KRONOVA

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** recibir el primer pago real.
- **Pendiente:** definir la entidad vendedora, responsabilidades tributarias, proveedor tecnológico de facturación y tratamiento de IVA/impuestos aplicables.
- **Participantes:** fundador, contador colombiano y asesor legal/tributario cuando corresponda.
- **Decisión:** Por definir.

### PD-006 — Política de excesos de consumo

- **Estado:** PENDIENTE
- **Prioridad:** MEDIA
- **Resolver antes de:** Tarea 19 — Medición de consumo.
- **Pendiente:** elegir entre bloqueo al alcanzar la cuota, paquetes adicionales o cambio automático/manual de plan.
- **Regla aprobada actualmente:** no ofrecer documentos ilimitados y no cobrar dos veces un reintento técnico.
- **Decisión:** Por definir.

---

## 2. Producto y normativa

### PD-007 — Segmento inicial de clientes en Colombia

- **Estado:** PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** finalizar las reglas de DocAudit.
- **Pendiente:** escoger el primer segmento: comercio, servicios profesionales, inmobiliarias, contadores/BPO u otro.
- **Impacto:** tipos de factura, volumen, reglas, mensajes y canal comercial.
- **Decisión:** Por definir.

### PD-008 — Cobertura tributaria exacta de DocAudit v1

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** Tarea 14 — Esquema de DocAudit.
- **Pendiente:** aprobar impuestos, retenciones, tolerancias de redondeo, monedas y casos especiales incluidos.
- **Requiere:** revisión de contador o especialista tributario colombiano.
- **Decisión:** Por definir.

### PD-009 — Verificación en línea con DIAN

- **Estado:** PENDIENTE
- **Prioridad:** MEDIA
- **Resolver antes de:** cerrar el alcance técnico de DocAudit v1.
- **Pendiente:** decidir si el MVP consultará activamente la DIAN mediante mecanismos permitidos o solo validará los artefactos suministrados por el cliente.
- **Regla provisional:** no prometer verificación en tiempo real.
- **Decisión:** Por definir.

### PD-010 — Archivo legal extendido

- **Estado:** PENDIENTE
- **Prioridad:** MEDIA
- **Resolver antes de:** ofrecer retención superior a la estándar.
- **Pendiente:** decidir si se ofrecerán planes de archivo por 5 o 10 años.
- **Requiere:** análisis legal, integridad probatoria, costos, backups y recuperación.
- **Regla vigente del MVP:** originales 90 días, resultados 12 meses y registros operativos 24 meses.
- **Decisión:** Por definir.

### PD-011 — País siguiente después de Colombia

- **Estado:** PENDIENTE
- **Prioridad:** BAJA
- **Resolver antes de:** iniciar expansión regulatoria.
- **Opciones preliminares:** México, Brasil, Chile, Perú u otro mercado según clientes y complejidad técnica.
- **Decisión:** Por definir.

---

## 3. Idiomas y localización

### PD-012 — Idioma predeterminado

- **Estado:** PENDIENTE
- **Prioridad:** MEDIA
- **Resolver antes de:** implementar i18n.
- **Opciones:** español global, español de Colombia o detección por navegador con español de Colombia como fallback.
- **Recomendación actual:** español de Colombia para organizaciones colombianas y detección controlada para visitantes.
- **Decisión:** Por definir.

### PD-013 — Orden de nuevos idiomas

- **Estado:** PENDIENTE
- **Prioridad:** BAJA
- **Resolver antes de:** expansión internacional.
- **Base aprobada:** español e inglés primero; portugués, francés, alemán e italiano después.
- **Pendiente:** ordenar idiomas según el siguiente país y demanda real.
- **Decisión:** Por definir.

### PD-014 — Traducción de reportes regulatorios

- **Estado:** PENDIENTE
- **Prioridad:** MEDIA
- **Resolver antes de:** ofrecer reportes bilingües en producción.
- **Pendiente:** definir si evidencia, nombres oficiales de campos y reglas DIAN permanecen en español mientras explicación y recomendaciones se traducen.
- **Recomendación actual:** conservar términos regulatorios originales y traducir la explicación.
- **Decisión:** Por definir.

---

## 4. Infraestructura y operación

### PD-015 — Planes contratados de Supabase, Vercel y Cloudflare

- **Estado:** PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** staging con procesamiento real.
- **Pendiente:** confirmar planes actuales, regiones disponibles, límites, backups, logs y presupuesto mensual.
- **Impacto:** tamaño máximo, concurrencia, retención, recuperación y SLA interno.
- **Decisión:** Por definir.

### PD-016 — Región principal y residencia de datos

- **Estado:** PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** crear Supabase de producción.
- **Pendiente:** escoger región considerando usuarios colombianos, latencia, contratos y expansión futura.
- **Regla:** producción y staging no compartirán proyecto ni datos.
- **Decisión:** Por definir.

### PD-017 — Proveedor de OCR

- **Estado:** PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** Tarea 11 — Extracción de texto.
- **Opciones:** capacidades multimodales de Gemini, proveedor OCR especializado o combinación con fallback.
- **Pruebas necesarias:** precisión en facturas colombianas, tablas, costos, latencia y tratamiento de datos.
- **Decisión:** Por definir.

### PD-018 — Monitoreo y gestión de errores

- **Estado:** PENDIENTE
- **Prioridad:** MEDIA
- **Resolver antes de:** Tarea 28 — Observabilidad.
- **Opciones:** Sentry, plataforma de Vercel, Cloudflare Analytics y logging estructurado propio.
- **Regla:** nunca enviar texto documental o secretos a logs de terceros.
- **Decisión:** Por definir.

### PD-019 — Proveedor de correo transaccional

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** probar autenticación en staging y permitir registros de clientes reales.
- **Pendiente inmediato:** configurar SMTP personalizado en Supabase Auth para confirmación de correo, recuperación de contraseña e invitaciones de miembros.
- **Opciones:** Resend, Postmark, SendGrid, Amazon SES u otro.
- **Pruebas necesarias:** confirmación de cuenta, recuperación, invitación, expiración, reenvío, dominio, SPF, DKIM, DMARC, entregabilidad y costos.
- **Regla:** el servicio de correo predeterminado de Supabase solo se usará durante desarrollo; producción requiere SMTP controlado por KRONOVA.
- **Decisión:** Por definir.

### PD-020 — Proveedor de WhatsApp

- **Estado:** PENDIENTE
- **Prioridad:** BAJA
- **Resolver antes de:** alertas WhatsApp de LeaseReader.
- **Opciones:** Meta WhatsApp Cloud API, Twilio u otro BSP aprobado.
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

- **Estado:** PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** lanzamiento a producción.
- **Hallazgo:** `npm audit` reporta avisos altos heredados por Next.js 16.2.12 en `postcss` y `sharp`.
- **Regla:** no ejecutar `npm audit fix --force`; actualmente propone degradar Next.js a 9.3.3 y rompería la aplicación.
- **Pendiente:** actualizar a una versión corregida y compatible de Next.js cuando esté disponible, revisar sus notas de migración y repetir build, pruebas documentales y auditoría.
- **Decisión:** Monitorear y actualizar de forma controlada.

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
- **Decisión:** Por definir.

### PD-022 — Uso de documentos por proveedores de IA

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** procesar documentos reales de clientes.
- **Pendiente:** revisar términos, retención, región, entrenamiento y controles disponibles en Gemini para la modalidad contratada.
- **Resultado requerido:** configuración y política comunicable al cliente.
- **Decisión:** Por definir.

### PD-023 — Condiciones de uso y descargo profesional

- **Estado:** PENDIENTE
- **Prioridad:** CRÍTICA
- **Resolver antes de:** lanzamiento.
- **Pendiente:** aprobar términos que aclaren que KRONOVA asiste y no sustituye DIAN, contabilidad o asesoría legal.
- **Decisión:** Por definir.

### PD-024 — Respuesta a incidentes y backups

- **Estado:** PENDIENTE
- **Prioridad:** ALTA
- **Resolver antes de:** producción.
- **Pendiente:** responsables, tiempos, canales, rotación de secretos, restauración y comunicación a clientes.
- **Decisión:** Por definir.

---

## 6. Módulos futuros

### PD-025 — Alcance comercial de LeaseReader

- **Estado:** PENDIENTE
- **Prioridad:** BAJA
- **Resolver antes de:** Tarea 22.
- **Pendiente:** tipo de contrato, jurisdicción, proveedor de alertas y modelo de precios.
- **Decisión:** Por definir.

### PD-026 — Primera plataforma de ReviewSync

- **Estado:** PENDIENTE
- **Prioridad:** BAJA
- **Resolver antes de:** Tarea 25.
- **Pendiente:** elegir Google Business Profile, Facebook u otra plataforma y definir aprobación antes de publicar respuestas.
- **Decisión:** Por definir.

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

Las decisiones más cercanas en el roadmap son:

1. `PD-027` — desplegar migraciones `001–010` y probarlas en Supabase staging.
2. `PD-028` — configurar dominios, redirecciones y plantillas de Supabase Auth.
3. `PD-019` — elegir y configurar SMTP para los correos de autenticación e invitaciones.
4. `PD-029` — validar límites de consumo y protección perimetral en staging.
5. `PD-016` — región del proyecto Supabase de producción.
6. `PD-007` y `PD-008` — segmento inicial y cobertura tributaria exacta.
7. `PD-022` — condiciones de tratamiento de documentos por Gemini.
8. `PD-001` y `PD-002` — elegibilidad de Stripe y proveedor colombiano, antes de implementar pagos.

La creación del esquema de Supabase puede comenzar sin cerrar pagos, porque la arquitectura aprobada almacena un estado de facturación normalizado y admite múltiples proveedores.
