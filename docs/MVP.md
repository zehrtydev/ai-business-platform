# MVP.md

## Estado

Draft inicial.

Este documento define el alcance funcional mínimo de la primera versión utilizable de **ia-business-platform**.

El nombre del proyecto es temporal.

---

## Objetivo del MVP

El MVP debe demostrar que la plataforma puede gestionar de extremo a extremo el proceso:

    Lead
      ↓
    Mensaje
      ↓
    Atención automática
      ↓
    Identificación de necesidad
      ↓
    Conversación
      ↓
    Intención de agendar
      ↓
    Consulta de disponibilidad
      ↓
    Selección de horario
      ↓
    Creación de cita
      ↓
    Confirmación

El objetivo principal no es demostrar que una IA puede responder mensajes.

El objetivo es demostrar que un negocio puede recibir un lead mediante un canal de mensajería y convertirlo en una cita registrada dentro de la plataforma, con mínima o ninguna intervención humana.

---

## 1. Caso de uso inicial

El primer entorno real será un consultorio odontológico.

El problema principal identificado es:

> El negocio pierde tiempo respondiendo mensajes y coordinando citas manualmente, mientras algunos potenciales pacientes pueden quedar sin respuesta o sin seguimiento.

El MVP deberá permitir que un paciente pueda:

1. escribir al consultorio;
2. recibir respuesta automática;
3. consultar información básica;
4. expresar su intención de agendar;
5. conocer horarios disponibles;
6. seleccionar un horario;
7. confirmar sus datos;
8. terminar con una cita registrada.

---

## 2. Alcance del MVP

El MVP estará compuesto por los siguientes módulos.

### 2.1 Autenticación

El sistema deberá permitir que usuarios autorizados ingresen al panel administrativo.

Funciones mínimas:

- iniciar sesión;
- cerrar sesión;
- mantener sesión autenticada;
- proteger las rutas privadas.

No se requiere registro público para el MVP.

### 2.2 Business

La plataforma deberá soportar al menos una organización o negocio.

Aunque el piloto utilice un solo negocio, el modelo de datos deberá estar preparado para múltiples negocios.

Cada negocio deberá disponer como mínimo de:

- nombre;
- información general;
- zona horaria;
- configuración básica;
- estado activo/inactivo.

Las entidades operativas deberán asociarse al negocio mediante un identificador como:

    business_id

### 2.3 Usuarios

Un negocio podrá tener usuarios autorizados para acceder al sistema.

Para el MVP no se requiere un sistema avanzado de permisos.

Será suficiente diferenciar inicialmente entre:

    OWNER
    MEMBER

El diseño deberá permitir ampliar posteriormente los roles.

---

## 3. Servicios

El negocio deberá poder registrar los servicios que ofrece.

Cada servicio deberá soportar como mínimo:

    name
    description
    duration
    price opcional
    active
    business_id

Ejemplo inicial:

    Valoración odontológica
    Duración: 30 minutos
    Precio: $X

La IA podrá consultar estos servicios para responder preguntas y conducir el proceso de agendamiento.

---

## 4. Profesionales

El negocio deberá poder registrar las personas que prestan servicios.

Cada profesional deberá disponer como mínimo de:

    name
    active
    business_id

El profesional podrá estar relacionado con uno o varios servicios.

Ejemplo:

    Dra. Laura Pérez

    Servicios:
    - Valoración
    - Limpieza
    - Ortodoncia

---

## 5. Disponibilidad

El sistema deberá conocer cuándo puede atender cada profesional.

Para el MVP se necesita soportar:

- días de atención;
- hora de inicio;
- hora de finalización;
- relación profesional-servicio;
- duración del servicio;
- citas existentes.

El backend deberá ser responsable de determinar la disponibilidad real.

La IA nunca deberá inventar horarios.

Ejemplo:

    Profesional:
    Dra. Laura

    Servicio:
    Valoración

    Disponibilidad:
    Lunes 08:00 - 12:00
    Martes 14:00 - 18:00

---

## 6. Contactos

Toda persona que interactúe con el negocio deberá representarse mediante un contacto.

Un contacto deberá poder almacenar como mínimo:

    id
    business_id
    name
    phone
    email opcional
    source
    created_at
    updated_at

Un mensaje proveniente de un número conocido deberá asociarse al contacto existente.

Un mensaje proveniente de un número desconocido deberá permitir crear automáticamente un nuevo contacto.

---

## 7. Leads

Un contacto podrá convertirse en lead cuando exista una oportunidad comercial.

El lead deberá almacenar como mínimo:

    contact_id
    business_id
    pipeline_stage
    service_interest opcional
    source
    status
    created_at
    updated_at

Contacto y lead no serán conceptos equivalentes.

    Contact
       ↓
    puede convertirse en
       ↓
    Lead

Esto permitirá que una persona exista en la plataforma incluso sin una oportunidad comercial activa.

---

## 8. Pipeline

El MVP deberá permitir conocer el estado comercial de cada lead.

Inicialmente se podrá utilizar un pipeline sencillo:

    NEW
      ↓
    CONTACTED
      ↓
    INTERESTED
      ↓
    APPOINTMENT_PROPOSED
      ↓
    APPOINTMENT_SCHEDULED
      ↓
    COMPLETED

Los estados deberán pertenecer al negocio.

La arquitectura deberá permitir pipelines configurables posteriormente.

No es necesario construir un editor visual de pipelines en el MVP.

---

## 9. Conversaciones

Cada interacción con un contacto deberá agruparse en una conversación.

Una conversación deberá registrar como mínimo:

    business_id
    contact_id
    channel
    status
    assigned_to opcional
    ai_enabled
    created_at
    updated_at

Estados iniciales posibles:

    OPEN
    HUMAN_REQUIRED
    CLOSED

La conversación deberá conservar todo su historial.

---

## 10. Mensajes

Todos los mensajes entrantes y salientes deberán persistirse.

Cada mensaje deberá registrar como mínimo:

    conversation_id
    direction
    sender
    content
    message_type
    provider_message_id
    created_at

Direcciones:

    INBOUND
    OUTBOUND

Tipos mínimos:

    TEXT

La arquitectura deberá permitir posteriormente:

    IMAGE
    AUDIO
    VIDEO
    DOCUMENT
    LOCATION

sin que todos tengan que implementarse durante el MVP.

---

## 11. Inbox

El panel deberá disponer de una bandeja de conversaciones.

El usuario deberá poder:

- consultar conversaciones;
- abrir una conversación;
- visualizar mensajes;
- identificar el contacto;
- ver el estado del lead;
- enviar mensajes manualmente;
- tomar control de la conversación;
- devolver posteriormente el control a la IA.

No es necesario replicar toda la experiencia visual de WhatsApp.

El objetivo es permitir supervisión y operación humana.

---

## 12. Human Handoff

El sistema deberá soportar intervención humana.

La IA podrá solicitar ayuda cuando:

- no pueda responder;
- detecte una solicitud sensible;
- el usuario solicite hablar con una persona;
- ocurra un error;
- exista una regla configurada para hacerlo.

Flujo esperado:

    IA activa
       ↓
    handoff solicitado
       ↓
    IA pausada
       ↓
    conversación marcada
       ↓
    humano interviene

Posteriormente:

    humano finaliza
       ↓
    IA puede reactivarse

La IA no deberá continuar enviando mensajes mientras el control humano esté activo.

---

## 13. Integración de mensajería

El MVP deberá soportar al menos un canal de mensajería basado en WhatsApp.

El proveedor definitivo permanece pendiente de investigación.

La aplicación no deberá depender directamente de una implementación específica.

Se utilizará una abstracción conceptual similar a:

    MessagingProvider

con responsabilidades como:

    sendText
    receiveMessage
    markAsRead
    getMedia

Posibles proveedores podrán incluir:

    Meta Cloud API
    Evolution API
    BSP
    otros proveedores

La elección definitiva se documentará en `DECISIONS.md`.

---

## 14. Agente de IA

El sistema deberá incorporar un agente capaz de conversar con el lead.

El agente tendrá acceso al contexto del negocio.

Como mínimo deberá conocer:

- nombre del negocio;
- servicios;
- precios configurados;
- profesionales;
- horarios;
- preguntas frecuentes;
- políticas básicas;
- información comercial relevante.

El agente deberá poder identificar:

- intención;
- interés en servicios;
- intención de agendar;
- solicitud de intervención humana.

---

## 15. Herramientas del agente

La IA no deberá modificar directamente el estado del sistema.

La plataforma deberá exponer herramientas controladas por el backend.

Ejemplos conceptuales:

    get_business_information()

    get_services()

    get_available_slots()

    create_appointment()

    get_contact()

    update_contact()

    update_lead()

    request_human_handoff()

El LLM podrá decidir solicitar una herramienta.

El backend deberá:

1. validar los parámetros;
2. comprobar permisos;
3. ejecutar la operación;
4. persistir los cambios;
5. devolver el resultado.

---

## 16. Proveedores de IA

El MVP no deberá quedar acoplado a un único modelo o proveedor.

Se utilizará una abstracción equivalente a:

    AIProvider

El proveedor seleccionado inicialmente deberá poder sustituirse sin modificar la lógica de negocio.

La selección concreta del modelo se decidirá durante la implementación y podrá variar según la tarea.

---

## 17. Agenda

El sistema deberá disponer de una representación interna de las citas.

Una cita deberá almacenar como mínimo:

    business_id
    contact_id
    service_id
    staff_member_id
    start_at
    end_at
    status
    source
    created_at
    updated_at

Estados mínimos:

    SCHEDULED
    CANCELLED
    COMPLETED
    NO_SHOW

El backend deberá impedir conflictos de disponibilidad.

---

## 18. Flujo de agendamiento

El flujo mínimo deberá funcionar así:

    Paciente
      ↓
    Quiero una valoración
      ↓
    IA identifica servicio
      ↓
    Backend consulta disponibilidad
      ↓
    IA presenta horarios
      ↓
    Paciente selecciona horario
      ↓
    Backend valida nuevamente
      ↓
    Backend crea cita
      ↓
    Pipeline actualizado
      ↓
    IA confirma la cita

La disponibilidad deberá comprobarse nuevamente antes de crear la cita.

Esto evita reservar un horario que haya dejado de estar disponible durante la conversación.

---

## 19. Dashboard

El MVP deberá incluir un dashboard operativo.

No se requiere analítica avanzada.

Como mínimo deberá mostrar:

    Leads recibidos
    Conversaciones abiertas
    Citas agendadas
    Conversaciones que requieren humano

Podrá incluir una métrica básica de conversión:

    citas agendadas / leads recibidos

Las métricas deberán definirse de forma consistente antes de implementarse.

---

## 20. CRM básico

El usuario deberá poder consultar los contactos y leads registrados.

Como mínimo deberá poder visualizar:

    nombre
    teléfono
    fuente
    estado
    servicio de interés
    última interacción
    cita asociada

No se requiere un CRM completo comparable con plataformas especializadas.

El objetivo es tener suficiente información para gestionar el flujo comercial inicial.

---

## 21. Recordatorios

El MVP deberá soportar al menos recordatorios básicos de citas.

Ejemplo:

    appointment.created
            ↓
    programar recordatorio
            ↓
    24 horas antes
            ↓
    enviar mensaje

La ejecución deberá realizarse mediante procesamiento asíncrono.

No deberá depender de que un usuario tenga abierta la aplicación.

---

## 22. Procesamiento asíncrono

Las operaciones que no requieran respuesta HTTP inmediata deberán poder ejecutarse en background.

Casos iniciales:

    procesamiento de mensajes
    respuesta mediante IA
    envío de mensajes
    recordatorios
    reintentos
    eventos

La arquitectura candidata utilizará:

    Redis
    BullMQ
    Workers

La decisión definitiva quedará registrada en `DECISIONS.md`.

---

## 23. Eventos

El sistema deberá poder generar eventos internos relevantes.

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

No es necesario implementar una plataforma completa de event streaming.

El objetivo es desacoplar progresivamente las acciones secundarias de las operaciones principales.

---

## 24. Realtime

El dashboard deberá reflejar los cambios importantes sin requerir recarga manual constante.

Casos prioritarios:

    nuevo mensaje
    nueva conversación
    handoff solicitado
    cita creada

La implementación podrá apoyarse inicialmente en Supabase Realtime.

---

## 25. Integraciones externas

El MVP podrá integrar un calendario externo si es necesario para el piloto.

Google Calendar será el primer candidato.

Sin embargo, la cita deberá existir también dentro de la plataforma.

El calendario externo no deberá ser la única fuente de verdad.

Conceptualmente:

    Appointment interno
           ↓
    sincronización
           ↓
    Google Calendar

---

## 26. Automatización

El MVP no necesita un constructor visual de automatizaciones.

Las primeras automatizaciones podrán existir como reglas internas del sistema.

Ejemplo:

    appointment.created
            ↓
    crear recordatorio

Posteriormente estas reglas podrán convertirse en automatizaciones configurables.

---

## 27. Seguridad y aislamiento

Aunque exista un solo cliente inicial, el MVP deberá respetar aislamiento multiempresa.

Un usuario perteneciente a:

    Business A

no deberá poder acceder a datos pertenecientes a:

    Business B

El `business_id` nunca deberá depender exclusivamente de información enviada por el frontend.

El backend deberá determinar y validar el tenant correspondiente.

---

## 28. Auditoría básica

Las acciones relevantes deberán poder rastrearse.

Como mínimo debe ser posible determinar:

    qué ocurrió
    cuándo ocurrió
    qué entidad estuvo involucrada
    qué actor originó la acción

No se requiere todavía un sistema avanzado de auditoría visible para el usuario.

---

## 29. Observabilidad

La aplicación deberá disponer como mínimo de:

- logs estructurados;
- health check;
- readiness check;
- registro de errores;
- identificación de jobs fallidos;
- visibilidad de errores de integraciones externas.

Los fallos de servicios externos no deberán desaparecer silenciosamente.

---

## 30. Fuera del alcance del MVP

Las siguientes funcionalidades quedan explícitamente fuera del MVP inicial:

    Instagram
    Facebook Messenger
    agentes de voz
    llamadas telefónicas automáticas
    pagos
    facturación
    historias clínicas
    historias odontológicas
    prescripciones
    diagnóstico médico
    campañas masivas
    marketing automation avanzado
    promociones automáticas
    cumpleaños
    recall semestral
    constructor visual de workflows
    constructor visual de pipelines
    app móvil nativa
    white-label
    marketplace de integraciones
    múltiples idiomas avanzados
    analítica avanzada
    data warehouse
    BI
    multi-región
    microservicios
    Kubernetes
    modelos de IA alojados por nosotros

Estas funcionalidades podrán formar parte del roadmap futuro.

---

## 31. Criterios de aceptación del MVP

El MVP se considerará funcional cuando pueda completarse de extremo a extremo el siguiente escenario:

    1. Existe un negocio configurado.

    2. Existe al menos un servicio.

    3. Existe al menos un profesional.

    4. Existe disponibilidad configurada.

    5. Un usuario externo envía un mensaje real mediante WhatsApp.

    6. El sistema recibe el mensaje.

    7. El contacto es creado o identificado.

    8. La conversación queda registrada.

    9. El mensaje aparece en el Inbox.

    10. El agente responde automáticamente.

    11. El usuario solicita información sobre un servicio.

    12. La IA responde utilizando información configurada del negocio.

    13. El usuario manifiesta intención de agendar.

    14. La IA consulta disponibilidad mediante una herramienta.

    15. El backend devuelve horarios válidos.

    16. La IA presenta las opciones.

    17. El usuario selecciona un horario.

    18. El backend valida nuevamente la disponibilidad.

    19. Se crea la cita.

    20. El lead cambia de estado.

    21. La confirmación es enviada por WhatsApp.

    22. La cita aparece en el dashboard.

    23. El contacto aparece en el CRM.

    24. La conversación permanece disponible en el historial.

    25. Se programa al menos un recordatorio.

    26. Un humano puede tomar el control de la conversación.

    27. La IA deja de responder mientras existe control humano.

Si este escenario funciona consistentemente, el núcleo inicial del producto se considerará validado.

---

## 32. Criterios no funcionales

El MVP deberá priorizar:

### Confiabilidad

Los mensajes y citas no deberán depender exclusivamente de memoria temporal.

Los datos relevantes deberán persistirse.

### Idempotencia

Webhooks, mensajes y jobs podrán llegar más de una vez.

El sistema deberá evitar duplicar operaciones críticas.

Especialmente:

    mensajes
    contactos
    citas
    eventos externos

### Reintentos

Los fallos temporales de proveedores externos deberán poder reintentarse cuando sea seguro hacerlo.

### Seguridad

Los secretos y credenciales nunca deberán almacenarse en el repositorio.

### Trazabilidad

Debe ser posible investigar por qué falló una conversación, un mensaje o un agendamiento.

### Escalabilidad progresiva

La arquitectura deberá permitir aumentar capacidad sin requerir reescribir el producto completo.

No se requiere diseñar infraestructura para millones de usuarios durante el MVP.

---

## 33. Métricas iniciales

Durante el piloto se deberán observar como mínimo:

    leads recibidos
    conversaciones atendidas
    citas agendadas
    handoffs humanos
    errores de mensajería
    errores del agente
    tiempo hasta primera respuesta

Estas métricas permitirán determinar si la automatización realmente está resolviendo el problema del negocio.

---

## 34. Hipótesis a validar

El MVP deberá ayudar a responder las siguientes preguntas:

    ¿La IA puede atender correctamente las consultas frecuentes?

    ¿Los usuarios están dispuestos a agendar mediante conversación automatizada?

    ¿El sistema reduce trabajo manual?

    ¿El negocio confía en dejar conversaciones básicas en manos de la IA?

    ¿El human handoff funciona adecuadamente?

    ¿La agenda puede mantenerse consistente?

    ¿El canal de WhatsApp elegido es suficientemente estable y viable económicamente?

    ¿El modelo puede reutilizarse en otros negocios de servicios?

---

## 35. Decisiones pendientes

Las siguientes decisiones deberán investigarse antes o durante la implementación:

    Proveedor de WhatsApp
    Proveedor/modelo inicial de IA
    ORM o capa de acceso a datos
    Estrategia exacta de sincronización con calendarios
    Política de retención de conversaciones
    Proveedor de correo
    Proveedor de observabilidad
    Infraestructura definitiva de producción

Las decisiones importantes deberán registrarse en:

    docs/DECISIONS.md

---

## 36. Principio de alcance

Durante el desarrollo del MVP se aplicará la siguiente regla:

> Una nueva funcionalidad no entra automáticamente al MVP porque sea útil o atractiva.

Para incorporarse deberá demostrar que es necesaria para validar el flujo principal:

    mensaje
    → conversación
    → intención
    → disponibilidad
    → cita
    → seguimiento

Todo lo demás podrá incorporarse al roadmap.
