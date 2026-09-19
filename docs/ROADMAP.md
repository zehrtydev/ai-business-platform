# ROADMAP.md

## Estado

Roadmap inicial de **ia-business-platform**.

Este documento organiza el desarrollo por fases y milestones. Su propósito es definir el orden de ejecución y evitar que funcionalidades futuras entren prematuramente al MVP.

El alcance funcional del MVP se define en `MVP.md`.

La arquitectura candidata se define en `ARCHITECTURE.md`.

Las decisiones técnicas definitivas deberán registrarse en `DECISIONS.md`.

---

# 1. Principio del roadmap

El desarrollo seguirá una secuencia basada en riesgo y dependencia.

La prioridad será validar primero el flujo central:

    mensaje
    → contacto
    → conversación
    → IA
    → disponibilidad
    → cita
    → confirmación
    → seguimiento

Las funcionalidades que no ayuden directamente a validar este recorrido deberán esperar.

---

# 2. Objetivo general

Llegar a un piloto real donde un negocio pueda:

1. recibir un lead por WhatsApp;
2. identificarlo automáticamente;
3. registrar la conversación;
4. responder mediante IA;
5. consultar disponibilidad;
6. agendar una cita;
7. confirmar la cita;
8. programar un recordatorio;
9. permitir intervención humana;
10. visualizar todo desde el panel.

---

# 3. Milestones principales

    M0  Fundación del proyecto
    M1  Base técnica
    M2  Dominio y persistencia
    M3  Dashboard administrativo
    M4  CRM + Inbox
    M5  Agenda
    M6  Integración de mensajería
    M7  Agente de IA
    M8  Flujo end-to-end
    M9  Automatizaciones y recordatorios
    M10 Observabilidad y hardening
    M11 Piloto odontológico
    M12 Validación del producto

---

# 4. M0 — Fundación del proyecto

## Objetivo

Establecer documentación, alcance, estructura y reglas antes de desarrollar funcionalidades.

## Entregables

- `PROJECT.md`
- `PRODUCT.md`
- `MVP.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `STATUS.md`
- `DECISIONS.md`
- `AGENTS.md`
- `README.md`

## Estado esperado

    Visión definida
    Alcance definido
    Arquitectura candidata definida
    Roadmap definido
    Decisiones pendientes identificadas

## Criterio de salida

El proyecto puede iniciar implementación sin ambigüedad importante sobre qué se está construyendo.

---

# 5. M1 — Base técnica

## Objetivo

Inicializar el monorepo y asegurar que los componentes básicos pueden desarrollarse, probarse y ejecutarse.

## Tareas

### Monorepo

Crear estructura inicial:

    apps/
    ├── web/
    ├── api/
    └── worker/

    packages/
    ├── database/
    ├── contracts/
    ├── ai/
    ├── messaging/
    ├── config/
    └── shared/

### Tooling

Definir:

- package manager;
- gestor de monorepo;
- TypeScript;
- lint;
- formatter;
- testing;
- variables de entorno;
- scripts comunes.

### Aplicaciones

Inicializar:

    Next.js
    NestJS + Fastify
    Worker Node.js

### Infraestructura local

Configurar inicialmente:

    Redis
    Docker Compose

### Health checks

Agregar:

    /health/live
    /health/ready

## Validaciones

    install
    lint
    typecheck
    tests
    build

deberán ejecutarse correctamente.

## Criterio de salida

Las tres aplicaciones pueden ejecutarse y existe un quality gate mínimo.

---

# 6. M2 — Dominio y persistencia

## Objetivo

Crear el modelo de datos mínimo y las reglas multiempresa.

## Decisiones previas

Resolver:

- ORM/query builder;
- estrategia de migraciones;
- proyecto Supabase de desarrollo;
- esquema de autenticación;
- modelo inicial de memberships.

## Entidades iniciales

    Business
    User / AuthUser mapping
    BusinessMembership

    Service
    StaffMember
    StaffService
    AvailabilityRule

    Contact
    Lead

    Pipeline
    PipelineStage

    Conversation
    Message

    Appointment

## Requisitos

- todas las entidades operativas deberán pertenecer a un negocio;
- el backend resolverá el tenant;
- no se confiará en `business_id` enviado libremente por el frontend;
- migraciones versionadas;
- constraints básicos;
- timestamps consistentes;
- soporte para identificadores externos donde corresponda.

## Testing prioritario

- aislamiento entre tenants;
- creación de business;
- memberships;
- contactos;
- citas;
- relaciones principales.

## Criterio de salida

El dominio central puede persistirse de forma consistente y segura.

---

# 7. M3 — Dashboard administrativo

## Objetivo

Crear la base de la aplicación utilizada por el negocio.

## Pantallas iniciales

    /login

    /dashboard

    /contacts

    /conversations

    /appointments

    /services

    /staff

    /settings

## Funciones

### Autenticación

- login;
- logout;
- protección de rutas;
- sesión.

### Navegación

Crear layout principal con acceso a los módulos.

### Dashboard inicial

Mostrar métricas simples, aunque inicialmente puedan provenir de datos de prueba o datos reales básicos.

## Criterio de salida

Un usuario autorizado puede entrar y navegar por la aplicación privada.

---

# 8. M4 — CRM + Inbox

## Objetivo

Tener una operación humana funcional incluso antes de incorporar IA.

## CRM

Implementar:

- lista de contactos;
- detalle de contacto;
- lead asociado;
- pipeline stage;
- servicio de interés;
- última interacción.

## Inbox

Implementar:

- lista de conversaciones;
- detalle de conversación;
- mensajes;
- estado;
- canal;
- control IA/humano;
- indicador de handoff.

## Mensajería interna

Antes de conectar WhatsApp, deberá poder simularse o crear mensajes de desarrollo para validar la experiencia.

## Human handoff

Implementar comportamiento base:

    AI
    ↓
    HUMAN_REQUIRED
    ↓
    HUMAN
    ↓
    AI

## Criterio de salida

El dashboard puede representar una conversación completa y permitir intervención manual.

---

# 9. M5 — Agenda

## Objetivo

Construir la fuente interna de verdad para disponibilidad y citas.

## Servicios

CRUD mínimo:

- crear;
- editar;
- activar/desactivar;
- duración;
- precio opcional.

## Staff

CRUD mínimo:

- crear;
- editar;
- activar/desactivar;
- asignar servicios.

## Disponibilidad

Configurar:

- día de semana;
- inicio;
- fin;
- profesional;
- servicio cuando aplique.

## Appointments

Implementar:

- crear;
- listar;
- consultar;
- cancelar;
- marcar completada;
- marcar no-show.

## Motor de disponibilidad

Debe considerar:

    horarios
    +
    duración
    +
    citas existentes
    +
    estado del profesional

## Concurrencia

Antes de crear una cita se deberá volver a comprobar disponibilidad.

## Criterio de salida

El backend puede responder de forma confiable:

    ¿Qué horarios reales existen para este servicio y profesional?

y puede reservar uno evitando conflictos básicos.

---

# 10. M6 — Investigación e integración de WhatsApp

## Objetivo

Seleccionar e integrar el primer proveedor de mensajería.

## Fase de investigación

Comparar al menos:

    Meta Cloud API
    Evolution API
    BSPs relevantes
    otras opciones viables

## Criterios de comparación

- costo;
- requisitos de onboarding;
- estabilidad;
- legalidad y cumplimiento;
- uso para pymes;
- facilidad de conexión;
- soporte para números existentes;
- webhooks;
- multimedia;
- plantillas;
- límites;
- riesgo de bloqueo;
- operación en Colombia;
- escalabilidad;
- experiencia de soporte.

## Entregable

Registrar decisión formal en:

    docs/DECISIONS.md

## Implementación

Crear primer `MessagingProvider`.

El adaptador deberá:

- recibir webhook;
- normalizar mensaje;
- deduplicar;
- crear/identificar contacto;
- crear/recuperar conversación;
- persistir mensaje;
- encolar procesamiento;
- enviar mensajes salientes.

## Criterio de salida

Un teléfono real puede enviar un mensaje y este aparece correctamente en el Inbox.

---

# 11. M7 — Agente de IA

## Objetivo

Agregar atención conversacional automática sin dar control directo del sistema al modelo.

## Decisiones

Seleccionar inicialmente:

- proveedor;
- modelo;
- estrategia de prompts;
- tool calling;
- persistencia de contexto;
- política de errores;
- política de handoff.

La selección deberá poder cambiar posteriormente.

## Business context

El agente deberá conocer:

- negocio;
- servicios;
- precios;
- profesionales;
- horarios;
- preguntas frecuentes;
- reglas básicas.

## Tools iniciales

    get_business_information
    get_services
    get_available_slots
    create_appointment
    get_contact
    update_contact
    update_lead
    request_human_handoff

## Reglas

- no inventar disponibilidad;
- no inventar precios;
- no crear citas sin herramienta;
- no responder si control = HUMAN;
- escalar cuando corresponda.

## Evaluación

Crear un conjunto de conversaciones de prueba.

Casos mínimos:

    pregunta de precio
    pregunta de horario
    servicio desconocido
    intención de agendar
    selección de horario
    solicitud de humano
    información insuficiente
    mensaje ambiguo

## Criterio de salida

El agente puede responder correctamente a casos básicos y utilizar herramientas controladas.

---

# 12. M8 — Flujo end-to-end

## Objetivo

Conectar todos los componentes.

## Escenario objetivo

    Paciente
       ↓
    WhatsApp
       ↓
    Webhook
       ↓
    Contacto
       ↓
    Conversación
       ↓
    Mensaje persistido
       ↓
    Queue
       ↓
    Worker
       ↓
    Agente IA
       ↓
    get_available_slots
       ↓
    Paciente selecciona
       ↓
    create_appointment
       ↓
    Appointment
       ↓
    Pipeline
       ↓
    Confirmación WhatsApp
       ↓
    Dashboard

## Pruebas

Probar con teléfonos reales.

Validar:

- mensaje único;
- mensajes consecutivos;
- duplicados de webhook;
- respuesta tardía del proveedor;
- caída temporal del proveedor IA;
- horario ocupado durante la conversación;
- intervención humana;
- reanudación de IA.

## Criterio de salida

El escenario completo funciona de forma repetible sin intervención técnica.

Este milestone representa el primer núcleo funcional del producto.

---

# 13. M9 — Automatizaciones y recordatorios

## Objetivo

Agregar seguimiento mínimo alrededor de la cita.

## Automatización inicial

    appointment.created
            ↓
    crear job
            ↓
    24 horas antes
            ↓
    enviar recordatorio

## Requisitos

- jobs persistentes;
- reintentos;
- cancelación si la cita ya no aplica;
- no enviar recordatorio de cita cancelada;
- trazabilidad;
- idempotencia.

## Automatizaciones adicionales opcionales del MVP

Solo si no retrasan el piloto:

    confirmación inmediata
    recordatorio adicional configurable
    notificación de handoff

## Criterio de salida

Una cita genera automáticamente al menos un recordatorio válido.

---

# 14. M10 — Observabilidad y hardening

## Objetivo

Preparar el sistema para operación real.

## Observabilidad

Implementar:

- logs estructurados;
- request IDs;
- job IDs;
- correlation IDs;
- errores de proveedor;
- jobs fallidos;
- health checks;
- readiness checks.

## Seguridad

Revisar:

- auth;
- tenant isolation;
- secrets;
- webhooks;
- rate limiting;
- validación;
- permisos;
- logs sensibles.

## Resiliencia

Validar:

- timeouts;
- retries;
- backoff;
- idempotencia;
- dead-letter strategy o equivalente;
- fallos de Redis;
- fallos de IA;
- fallos de mensajería.

## CI

Quality gate mínimo:

    lint
    typecheck
    unit tests
    integration tests
    build
    migration validation

## Criterio de salida

El sistema puede fallar de forma controlada y permite investigar incidentes.

---

# 15. M11 — Piloto odontológico

## Objetivo

Ejecutar ia-business-platform con el primer negocio real.

## Preparación

Configurar:

- negocio;
- servicios;
- profesionales;
- disponibilidad;
- información comercial;
- preguntas frecuentes;
- reglas del agente;
- mensajería;
- usuario administrador.

## Fase 1 — Shadow mode

Cuando sea conveniente:

    IA genera respuesta
    pero humano valida antes de enviar

Esto podrá utilizarse temporalmente para evaluar comportamiento.

## Fase 2 — Automatización controlada

Permitir respuestas automáticas en escenarios definidos.

## Fase 3 — Operación normal

Automatizar flujo principal manteniendo handoff disponible.

## Métricas

Medir:

- leads;
- conversaciones;
- tiempo de primera respuesta;
- citas;
- conversión;
- handoffs;
- errores;
- intervenciones manuales;
- mensajes corregidos por humanos.

## Criterio de salida

El negocio utiliza el sistema en operación real y existe evidencia suficiente para evaluar su valor.

---

# 16. M12 — Validación del producto

## Objetivo

Determinar qué debe ocurrir después del piloto.

## Preguntas

    ¿La plataforma redujo trabajo manual?

    ¿Mejoró el tiempo de respuesta?

    ¿Se perdieron menos leads?

    ¿La IA resolvió correctamente las consultas básicas?

    ¿Qué porcentaje requirió humano?

    ¿El agendamiento fue confiable?

    ¿Qué funcionalidades pidió realmente el negocio?

    ¿Qué partes fueron innecesarias?

    ¿Cuánto cuesta operar por conversación/lead/cita?

    ¿El canal elegido es viable para otras pymes?

    ¿El producto puede replicarse en otro vertical?

## Resultado

Decidir entre:

    iterar MVP
    expandir odontología
    incorporar segundo negocio
    probar segundo vertical
    cambiar integración
    cambiar modelo
    mejorar onboarding

---

# 17. Post-MVP — Prioridades candidatas

No existe un orden definitivo todavía.

Las siguientes funciones solo deberán priorizarse después del piloto.

## Follow-up comercial

    lead sin cita
    ↓
    esperar
    ↓
    seguimiento

---

## Google Calendar

Sincronización bidireccional o controlada según necesidades reales.

---

## Pipelines configurables

Permitir crear etapas propias.

---

## Custom fields

Adaptar información por vertical.

---

## Knowledge base avanzada

Fuentes como:

    documentos
    PDF
    web
    FAQs
    catálogos

---

## Instagram

Agregar segundo canal.

---

## Webchat

Widget para páginas web.

---

## Campañas

Mensajería segmentada y compliant.

---

## Recall

Reactivar clientes según reglas temporales.

---

## Cumpleaños

Mensajes programados y promociones opcionales.

---

## Voice Agent

    Lead
    ↓
    llamada IA
    ↓
    conversación
    ↓
    agenda

---

## Pagos

Anticipos o reservas cuando exista necesidad real.

---

## Onboarding autoservicio

Permitir que nuevos negocios configuren la plataforma sin acompañamiento técnico.

---

## Billing SaaS

Planes, suscripciones y límites.

---

## Vertical presets

Ejemplos:

    Odontología
    Estética
    Veterinaria
    Inmobiliaria
    Academia

---

# 18. Funcionalidades explícitamente diferidas

No deberán entrar durante el MVP salvo cambio formal de alcance.

    app móvil nativa
    microservicios
    Kubernetes
    Kafka
    multi-región
    white-label completo
    marketplace de integraciones
    ERP
    facturación
    historia clínica
    diagnóstico médico
    data warehouse
    BI avanzado
    LLMs alojados por nosotros en producción
    constructor no-code universal

---

# 19. Estrategia de ramas y cambios

Inicialmente se recomienda:

    main

como rama estable.

Cada unidad de trabajo significativa deberá realizarse mediante ramas cortas.

Ejemplos:

    feat/bootstrap-monorepo
    feat/business-domain
    feat/inbox
    feat/appointments
    feat/whatsapp-provider
    feat/ai-agent
    fix/appointment-idempotency

Los cambios deberán ser pequeños y revisables.

---

# 20. Convención de commits

Convención candidata:

    feat:
    fix:
    docs:
    refactor:
    test:
    chore:
    perf:
    ci:

Ejemplos:

    feat: add business membership model

    feat: implement appointment availability

    fix: prevent duplicate inbound messages

    docs: document WhatsApp provider decision

    test: add tenant isolation coverage

---

# 21. Documentación durante el desarrollo

Los documentos deberán actualizarse junto con el código.

### `STATUS.md`

Qué existe actualmente.

### `DECISIONS.md`

Por qué se eligieron tecnologías o enfoques.

### `ROADMAP.md`

Qué viene después.

### `ARCHITECTURE.md`

Cómo está estructurado el sistema.

### `MVP.md`

Qué pertenece o no a la primera versión.

La documentación desactualizada deberá considerarse un defecto del proyecto.

---

# 22. Definition of Done

Una tarea no se considerará terminada únicamente porque funcione localmente.

Cuando aplique deberá incluir:

    implementación
    tests
    manejo de errores
    tipado
    documentación
    migración
    observabilidad
    validación manual

No todas las tareas requerirán todos los elementos, pero deberán evaluarse.

---

# 23. Orden inmediato de ejecución

Después de completar la documentación fundacional:

    1. Completar STATUS.md
    2. Crear DECISIONS.md
    3. Completar AGENTS.md
    4. Completar README.md
    5. Resolver decisiones técnicas previas al bootstrap
    6. Inicializar monorepo
    7. Configurar CI
    8. Implementar dominio multi-tenant

---

# 24. Próximas decisiones antes de programar

Las primeras decisiones formales deberán cubrir:

    ADR-001 Monorepo y package manager
    ADR-002 Backend framework
    ADR-003 Database access / ORM
    ADR-004 Supabase responsibilities
    ADR-005 Queue system
    ADR-006 Multi-tenancy strategy
    ADR-007 WhatsApp provider evaluation process
    ADR-008 AI provider abstraction

No todas necesitan resolverse el mismo día.

Las decisiones con impacto inmediato deberán cerrarse antes de implementar el componente afectado.

---

# 25. Regla para modificar el roadmap

Una fase puede cambiar cuando exista nueva evidencia.

No deberá modificarse únicamente porque aparezca una tecnología atractiva o una idea nueva.

Cada cambio relevante deberá responder:

    ¿Qué problema resuelve?

    ¿Es necesario ahora?

    ¿Qué milestone bloquea?

    ¿Qué costo agrega?

    ¿Puede esperar hasta después del piloto?

---

# 26. Meta inmediata

La meta actual no es construir todas las capacidades de la visión.

La meta inmediata es avanzar desde:

    repositorio documentado

hasta:

    mensaje real
    → cita real
    → dashboard real

de la forma más simple, mantenible y confiable posible.
