# ARCHITECTURE.md

## Estado

Draft inicial.

Este documento describe la arquitectura candidata de **ia-business-platform** para el MVP y establece los límites principales entre componentes.

Las decisiones marcadas como candidatas podrán cambiar durante la implementación. Las decisiones definitivas deberán registrarse en `docs/DECISIONS.md`.

---

## 1. Objetivos de arquitectura

La arquitectura deberá permitir:

- construir el MVP rápidamente;
- mantener separación clara entre frontend, backend y procesamiento asíncrono;
- soportar múltiples negocios desde el inicio;
- desacoplar proveedores de mensajería e inteligencia artificial;
- procesar webhooks de forma segura e idempotente;
- ejecutar tareas en background;
- mantener una fuente de verdad central para citas, contactos y conversaciones;
- incorporar nuevos canales y proveedores sin reescribir el núcleo;
- crecer progresivamente sin adoptar microservicios prematuramente;
- desplegar inicialmente en infraestructura económica y sencilla.

---

## 2. Principio principal

La arquitectura inicial será un:

> **Monolito modular con workers asíncronos.**

No se utilizarán microservicios durante el MVP.

Esto significa que la lógica de negocio permanecerá dentro de una aplicación backend organizada por dominios, mientras los trabajos que no requieran respuesta inmediata serán ejecutados por uno o más workers.

---

## 3. Vista general

                             USUARIOS

                        Navegador / Dashboard
                                  │
                                  ▼
                           ┌─────────────┐
                           │   Next.js   │
                           │     Web     │
                           └──────┬──────┘
                                  │ HTTPS
                                  ▼
                           ┌─────────────┐
                           │   NestJS    │
                           │   Fastify   │
                           │     API     │
                           └──────┬──────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
          ┌───────────┐     ┌───────────┐     ┌────────────┐
          │PostgreSQL │     │   Redis   │     │ AI Layer   │
          │ Supabase  │     │  BullMQ   │     │ Providers  │
          └─────┬─────┘     └─────┬─────┘     └────────────┘
                │                 │
                │                 ▼
                │           ┌───────────┐
                │           │  Worker   │
                │           └─────┬─────┘
                │                 │
                ▼                 ▼
          Supabase Realtime   Integraciones
                                  │
               ┌──────────────────┼──────────────────┐
               │                  │                  │
               ▼                  ▼                  ▼
           WhatsApp         Google Calendar         n8n
           Provider            futuro             opcional

---

## 4. Componentes principales

### 4.1 `apps/web`

Frontend administrativo.

Tecnología candidata:

    Next.js
    TypeScript

Responsabilidades:

- autenticación del usuario;
- dashboard;
- inbox;
- CRM;
- agenda;
- servicios;
- profesionales;
- configuración del negocio;
- visualización de métricas;
- human handoff;
- interacción con la API.

El frontend no deberá contener lógica de negocio crítica.

No será responsable de determinar:

- disponibilidad real;
- permisos efectivos;
- aislamiento multiempresa;
- creación definitiva de citas;
- ejecución de automatizaciones;
- llamadas directas a proveedores externos con secretos.

---

### 4.2 `apps/api`

Backend principal.

Tecnología candidata:

    NestJS
    Fastify
    TypeScript

Responsabilidades:

- reglas de negocio;
- autorización;
- resolución del tenant;
- contactos;
- leads;
- conversaciones;
- mensajes;
- servicios;
- profesionales;
- disponibilidad;
- citas;
- pipelines;
- integración con proveedores;
- herramientas disponibles para los agentes de IA;
- recepción de webhooks;
- generación de eventos;
- creación de jobs;
- endpoints de health/readiness.

El backend será la autoridad principal sobre el estado operativo del producto.

---

### 4.3 `apps/worker`

Procesamiento asíncrono.

Tecnología candidata:

    Node.js
    BullMQ
    Redis

Responsabilidades iniciales:

- procesamiento diferido de mensajes;
- ejecución de respuestas mediante IA;
- envío de mensajes;
- recordatorios;
- reintentos;
- sincronizaciones externas;
- trabajos programados;
- procesamiento de eventos secundarios.

El worker podrá compartir paquetes de dominio con `apps/api`, pero no deberá depender del frontend.

---

## 5. Base de datos

Motor principal:

    PostgreSQL

Proveedor candidato para el MVP:

    Supabase

Supabase será utilizado principalmente como infraestructura administrada para:

- PostgreSQL;
- autenticación;
- almacenamiento cuando sea necesario;
- realtime cuando sea útil.

Supabase no reemplazará la capa de negocio del backend.

---

## 6. Fuente de verdad

La base de datos de ia-business-platform será la fuente de verdad para las entidades principales.

Ejemplos:

    Business
    Contact
    Lead
    Conversation
    Message
    Service
    StaffMember
    Availability
    Appointment
    Pipeline
    PipelineStage
    Integration

Sistemas externos como Google Calendar no deberán ser la única fuente de verdad.

Ejemplo:

    Appointment interno
           ↓
    sincronización
           ↓
    Google Calendar

---

## 7. Multi-tenancy

La aplicación será multiempresa desde el inicio.

La unidad principal de aislamiento será:

    business_id

Toda entidad perteneciente a un negocio deberá poder asociarse de forma inequívoca a ese tenant.

Ejemplos:

    services.business_id
    contacts.business_id
    conversations.business_id
    appointments.business_id
    pipelines.business_id
    integrations.business_id

### Regla de seguridad

El backend nunca deberá confiar únicamente en un `business_id` enviado por el frontend.

El tenant deberá resolverse a partir de la identidad autenticada y sus memberships.

Conceptualmente:

    User
      ↓
    BusinessMembership
      ↓
    Business

---

## 8. Modelo de dominio inicial

Dominios previstos:

    auth
    businesses
    users
    memberships
    contacts
    leads
    pipelines
    conversations
    messages
    services
    staff
    availability
    appointments
    integrations
    ai
    automations
    analytics
    audit

Estos dominios existirán como módulos dentro del monolito.

No implican microservicios separados.

---

## 9. Comunicación síncrona y asíncrona

### Síncrona

Se utilizará cuando el usuario o proveedor requiera una respuesta inmediata.

Ejemplos:

    GET /services
    GET /appointments
    POST /appointments
    POST /auth/login

### Asíncrona

Se utilizará cuando una operación:

- pueda tardar;
- dependa de un proveedor externo;
- necesite reintentos;
- deba ejecutarse en el futuro;
- no deba bloquear un webhook.

Ejemplos:

    procesar mensaje recibido
    consultar IA
    enviar respuesta
    programar recordatorio
    sincronizar calendario
    generar analytics

---

## 10. Webhooks

Los webhooks deberán procesarse bajo el principio:

> recibir → validar → persistir/deduplicar → encolar → responder.

Ejemplo:

    Proveedor WhatsApp
           ↓
    Webhook
           ↓
    API
           ↓
    Validar firma/origen
           ↓
    Verificar idempotencia
           ↓
    Persistir evento mínimo
           ↓
    Crear job
           ↓
    HTTP 200
           ↓
    Worker procesa

No se deberán ejecutar cadenas largas de IA e integraciones antes de responder al webhook cuando no sea necesario.

---

## 11. Idempotencia

Los sistemas externos pueden reenviar eventos.

La plataforma deberá asumir que un mismo evento puede llegar más de una vez.

Se utilizarán identificadores externos y/o claves de idempotencia para evitar duplicados.

Casos críticos:

    mensajes
    webhooks
    appointments
    jobs
    sincronizaciones

Ejemplo:

    provider_message_id

deberá poder utilizarse para detectar mensajes previamente procesados.

---

## 12. Redis y colas

Tecnologías candidatas:

    Redis
    BullMQ

Redis no será la fuente de verdad de datos críticos.

Se utilizará principalmente para:

- colas;
- locks cuando corresponda;
- coordinación de workers;
- jobs retrasados;
- reintentos;
- estados efímeros.

Los datos cuya pérdida afecte el negocio deberán persistirse en PostgreSQL.

---

## 13. Eventos internos

El sistema utilizará eventos de dominio para desacoplar acciones secundarias.

Ejemplos:

    contact.created
    lead.created
    message.received
    message.sent
    lead.stage_changed
    appointment.created
    appointment.cancelled
    conversation.handoff_requested
    conversation.handoff_resolved

Durante el MVP estos eventos podrán implementarse dentro del propio monolito y las colas existentes.

No se requiere Kafka, RabbitMQ ni una plataforma de streaming distribuida.

---

## 14. Mensajería

La lógica de negocio no deberá depender de un proveedor concreto de WhatsApp.

Se definirá una abstracción equivalente a:

    interface MessagingProvider {
      sendText(...)
      sendMedia(...)
      markAsRead(...)
      normalizeInboundMessage(...)
      getMedia(...)
    }

Implementaciones futuras podrán incluir:

    Meta Cloud API
    Evolution API
    BSP
    otros proveedores

La selección inicial permanece pendiente de investigación.

---

## 15. Normalización de mensajes

Cada proveedor utiliza formatos diferentes.

Los adaptadores deberán convertir mensajes externos a un formato interno común.

Ejemplo conceptual:

    type NormalizedInboundMessage = {
      externalMessageId: string
      channel: string
      senderExternalId: string
      type: string
      text?: string
      media?: unknown
      receivedAt: Date
    }

El resto del sistema deberá trabajar con el formato interno, no con el payload específico del proveedor.

---

## 16. Inteligencia artificial

La IA será tratada como una capacidad externa al dominio principal.

Se definirá una abstracción equivalente a:

    interface AIProvider {
      generate(...)
      stream(...)
      executeWithTools(...)
    }

El objetivo es poder sustituir modelos o proveedores sin modificar la lógica de CRM, conversaciones o agenda.

---

## 17. Agent layer

El agente deberá combinar:

    System/Business Context
            +
    Conversation Context
            +
    Available Tools
            +
    Policies
            ↓
           LLM

El modelo podrá proponer el uso de herramientas, pero el backend será quien las ejecute.

Ejemplo:

    Paciente:
    "Quiero una cita mañana"

            ↓

    LLM solicita:
    get_available_slots(...)

            ↓

    Backend valida y ejecuta

            ↓

    Resultado:
    09:00
    11:30
    15:00

            ↓

    LLM genera respuesta

---

## 18. Tool execution

Las herramientas de IA serán funciones controladas por la aplicación.

Ejemplos:

    get_business_information
    get_services
    get_available_slots
    create_appointment
    update_contact
    update_lead
    request_human_handoff

Cada ejecución deberá:

1. validar el tenant;
2. validar parámetros;
3. comprobar autorización;
4. ejecutar reglas de negocio;
5. persistir cambios;
6. generar eventos cuando corresponda;
7. devolver únicamente la información necesaria al agente.

La IA nunca tendrá acceso directo a SQL ni a secretos del sistema.

---

## 19. Human handoff

La conversación deberá conocer quién tiene el control.

Ejemplo conceptual:

    AI
    HUMAN

Cuando el modo sea humano:

    AI responses = disabled

El worker deberá comprobar este estado antes de producir una respuesta automática.

Esto evita respuestas simultáneas del operador y la IA.

---

## 20. Agenda y concurrencia

La disponibilidad deberá calcularse en el backend.

La creación de una cita deberá volver a validar que el horario siga disponible.

Flujo:

    consultar horarios
          ↓
    mostrar opciones
          ↓
    usuario selecciona
          ↓
    validar nuevamente
          ↓
    crear cita

La base de datos deberá ayudar a impedir reservas incompatibles.

La estrategia exacta de constraints/locking se definirá al diseñar el esquema.

---

## 21. Realtime

Casos candidatos:

    nuevo mensaje
    conversación actualizada
    handoff solicitado
    cita creada

Tecnología candidata:

    Supabase Realtime

Realtime será una mejora de experiencia del dashboard.

No reemplazará la persistencia ni las APIs normales.

---

## 22. n8n

n8n podrá utilizarse como herramienta complementaria de integración.

Ejemplos:

    ia-business-platform
            ↓
          evento
            ↓
           n8n
       ↙     ↓     ↘
    Sheets  Gmail   CRM externo

n8n no será:

- la fuente de verdad;
- el backend principal;
- el lugar donde viva la lógica crítica de citas;
- el único almacenamiento del estado del negocio.

El producto deberá continuar siendo funcional aunque una automatización externa de n8n falle.

---

## 23. Monorepo

Estructura candidata:

    ia-business-platform/
    ├── apps/
    │   ├── web/
    │   ├── api/
    │   └── worker/
    │
    ├── packages/
    │   ├── database/
    │   ├── contracts/
    │   ├── ai/
    │   ├── messaging/
    │   ├── config/
    │   └── shared/
    │
    ├── docs/
    │   ├── PROJECT.md
    │   ├── PRODUCT.md
    │   ├── MVP.md
    │   ├── ARCHITECTURE.md
    │   ├── ROADMAP.md
    │   ├── STATUS.md
    │   └── DECISIONS.md
    │
    ├── infra/
    ├── AGENTS.md
    ├── README.md
    └── package.json

La herramienta concreta para gestionar el monorepo se decidirá antes de inicializar las aplicaciones.

---

## 24. Contratos compartidos

`packages/contracts` podrá contener tipos y contratos que necesiten compartir web, API y worker.

No deberá convertirse en un paquete genérico donde se coloque código sin dominio claro.

Ejemplos adecuados:

    DTOs compartidos
    event contracts
    enums públicos
    schemas de validación compartidos

---

## 25. Capa de acceso a datos

La herramienta ORM o query builder permanece pendiente de decisión.

Candidatos deberán evaluarse según:

- soporte PostgreSQL;
- migraciones;
- TypeScript;
- transacciones;
- control sobre SQL;
- mantenibilidad;
- compatibilidad con Supabase;
- testing.

La elección se registrará en `docs/DECISIONS.md`.

---

## 26. Autenticación

Proveedor candidato:

    Supabase Auth

La autenticación identifica al usuario.

La autorización seguirá siendo responsabilidad del backend.

Conceptualmente:

    Supabase Auth
          ↓
    user identity
          ↓
    Backend
          ↓
    membership + permissions + business

Tener un token válido no será suficiente para acceder a cualquier tenant.

---

## 27. Seguridad

Principios iniciales:

- secretos solo mediante variables de entorno o secret management;
- ningún secreto en Git;
- validación de inputs;
- aislamiento por tenant;
- verificación de webhooks;
- mínimos privilegios;
- protección de endpoints administrativos;
- rate limiting donde sea necesario;
- auditoría de operaciones sensibles.

Los datos sensibles de cada vertical deberán analizarse antes de incorporarlos.

El MVP odontológico no incluirá historia clínica.

---

## 28. Logs y observabilidad

Cada componente deberá producir logs estructurados.

Campos útiles:

    timestamp
    level
    service
    business_id
    request_id
    job_id
    conversation_id
    external_event_id
    message
    error

Los logs no deberán incluir secretos ni datos sensibles innecesarios.

Endpoints mínimos:

    /health/live
    /health/ready

También deberá existir visibilidad de:

- jobs fallidos;
- errores de proveedores;
- webhooks rechazados;
- errores de IA;
- reintentos agotados.

---

## 29. Correlation IDs

Cuando sea posible, una operación deberá poder seguirse entre componentes.

Ejemplo:

    Webhook
      ↓
    request_id
      ↓
    job
      ↓
    AI call
      ↓
    send message

Esto permitirá investigar errores sin depender exclusivamente de timestamps.

---

## 30. Manejo de errores externos

Todo proveedor externo puede fallar.

Ejemplos:

    WhatsApp
    AI provider
    Supabase
    Google Calendar
    email

La arquitectura deberá distinguir entre:

- errores permanentes;
- errores temporales;
- errores reintentables;
- errores que requieren intervención humana.

No todos los fallos deberán reintentarse automáticamente.

---

## 31. Deployment inicial

Infraestructura candidata:

    VPS
    4 vCPU
    8 GB RAM
    100 GB SSD

El VPS podrá alojar inicialmente:

    Caddy
    Next.js
    NestJS API
    Worker
    Redis
    monitoring

Supabase permanecerá como servicio externo administrado.

La IA se consumirá mediante APIs externas durante el MVP.

No se ejecutarán modelos LLM pesados dentro del VPS.

---

## 32. Reverse proxy

Tecnología candidata:

    Caddy

Responsabilidades:

- TLS;
- routing por dominio/subdominio;
- reverse proxy;
- renovación automática de certificados.

---

## 33. Ambientes

Se deberán distinguir como mínimo:

    development
    production

Idealmente se añadirá:

    staging

antes del piloto real.

Cada entorno deberá tener sus propias credenciales e integraciones cuando sea viable.

No se deberán utilizar datos reales de clientes para pruebas locales rutinarias.

---

## 34. Desarrollo local

El entorno local deberá poder levantar los componentes necesarios con una experiencia sencilla.

Objetivo conceptual:

    docker compose up -d
    pnpm dev

o equivalente.

Servicios locales candidatos:

    Redis
    dependencias auxiliares

La base administrada podrá utilizar un proyecto de desarrollo independiente o una instancia local según la decisión posterior.

---

## 35. CI

La integración continua deberá validar progresivamente:

    lint
    typecheck
    unit tests
    integration tests
    build
    migration validation

Ningún PR deberá depender únicamente de una revisión manual.

---

## 36. Estrategia de testing

Se utilizarán varios niveles.

### Unit tests

Reglas de negocio aisladas.

Ejemplos:

    calcular disponibilidad
    cambiar pipeline stage
    validar handoff
    normalizar mensajes

### Integration tests

Interacción entre módulos, base de datos y adaptadores.

### E2E

Flujos críticos.

Primer flujo prioritario:

    mensaje
    → agente
    → disponibilidad
    → cita
    → confirmación

---

## 37. Adaptadores externos

Los proveedores externos deberán vivir detrás de puertos/interfaces del dominio.

Ejemplo conceptual:

    Domain
       │
       ▼
    MessagingPort
       │
       ├── MetaAdapter
       ├── EvolutionAdapter
       └── FutureAdapter

Este principio se aplicará también a:

    AI
    Calendar
    Email
    Storage
    Voice

---

## 38. Principio de dependencia

La lógica central del negocio no deberá importar directamente SDKs específicos de proveedores cuando pueda evitarse.

Preferencia:

    Domain
      ↓
    Interface
      ↓
    Adapter
      ↓
    External SDK/API

No:

    Domain
      ↓
    SDK externo

Esto facilita reemplazos, pruebas y evolución.

---

## 39. Escalabilidad

El MVP no se diseñará para millones de usuarios desde el primer día.

Sí deberá permitir crecimiento progresivo.

Ruta prevista:

    1 API + 1 worker
            ↓
    más workers
            ↓
    separar web/api
            ↓
    VPS exclusivo
            ↓
    servicios administrados adicionales
            ↓
    separación de componentes solo si existe necesidad real

No se adoptará Kubernetes ni microservicios por anticipación.

---

## 40. Backup y recuperación

La infraestructura deberá considerar desde el inicio:

- backups de base de datos;
- recuperación de configuración;
- variables de entorno respaldadas de forma segura;
- backups de volúmenes críticos;
- posibilidad de reconstruir servidores desde documentación e infraestructura versionada.

El código permanecerá en Git.

Los datos persistentes no deberán depender únicamente del disco del VPS.

---

## 41. Decisiones pendientes

Antes o durante las primeras fases deberán resolverse:

    Proveedor inicial de WhatsApp
    ORM/query builder
    gestor de monorepo
    package manager definitivo
    modelo/proveedor inicial de IA
    estrategia exacta de embeddings si llegan a ser necesarios
    Google Calendar dentro o después del MVP
    proveedor de observabilidad
    estrategia de deployment CI/CD
    política de backups

Cada decisión significativa deberá documentarse en `docs/DECISIONS.md`.

---

## 42. Restricciones actuales

Durante el MVP se evitarán deliberadamente:

    microservicios
    Kubernetes
    Kafka
    arquitecturas multi-región
    LLMs self-hosted en producción
    data warehouse
    event sourcing completo
    CQRS complejo
    service mesh
    infraestructura innecesariamente distribuida

Podrán evaluarse posteriormente si existe un problema real que las justifique.

---

## 43. Principio rector

La arquitectura deberá ser suficientemente sólida para evolucionar, pero suficientemente simple para que un equipo pequeño pueda entenderla, desplegarla, depurarla y modificarla.

> La complejidad deberá introducirse únicamente cuando resuelva un problema real y medible.
