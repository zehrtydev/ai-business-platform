# PROJECT.md

## Nombre temporal

**ia-business-platform**

El nombre es temporal y se utiliza para identificar el proyecto durante sus primeras fases de diseño y desarrollo.

---

## Descripción

**ia-business-platform** es una plataforma SaaS multiempresa orientada a automatizar la atención, conversión, agendamiento y seguimiento de leads mediante canales de mensajería e inteligencia artificial.

El sistema busca centralizar las conversaciones comerciales de un negocio, atender automáticamente a los usuarios, identificar sus necesidades, guiarlos hacia una acción de conversión y mantener seguimiento durante todo su ciclo como lead o cliente.

La plataforma no estará ligada a una industria específica.

El primer caso de uso será un consultorio odontológico, pero el núcleo del producto deberá poder adaptarse posteriormente a otros negocios de servicios como:

- clínicas y centros médicos;
- centros estéticos;
- veterinarias;
- psicología;
- fisioterapia;
- inmobiliarias;
- academias;
- talleres;
- barberías y salones;
- otros negocios basados en citas, leads o atención comercial.

---

## Problema

Muchos negocios reciben potenciales clientes mediante canales como WhatsApp, Instagram o formularios web.

La gestión suele realizarse manualmente y presenta problemas como:

- respuestas tardías;
- leads sin atender;
- conversaciones dispersas;
- pérdida de información;
- citas gestionadas manualmente;
- falta de seguimiento;
- dependencia permanente del teléfono;
- ausencia de métricas de conversión;
- dificultad para conocer el estado de cada oportunidad.

Como resultado, el negocio puede perder clientes simplemente por no responder o hacer seguimiento a tiempo.

---

## Propuesta de valor

ia-business-platform busca convertir la atención comercial en un proceso continuo y automatizado.

Cada lead podrá ser:

1. recibido;
2. identificado;
3. atendido;
4. calificado;
5. informado;
6. guiado hacia una acción;
7. agendado cuando corresponda;
8. registrado en el CRM;
9. seguido automáticamente;
10. escalado a una persona cuando sea necesario.

El objetivo no es simplemente responder mensajes mediante IA.

El objetivo es ayudar al negocio a convertir conversaciones en resultados medibles.

---

## Flujo conceptual

    Lead
      ↓
    Canal de comunicación
      ↓
    Conversación
      ↓
    Agente de IA
      ↓
    Identificación de necesidad
      ↓
    Resolución de preguntas
      ↓
    Calificación
      ↓
    Conversión
      ↓
    Agenda / acción comercial
      ↓
    Seguimiento
      ↓
    Cliente

---

## Principios del producto

### 1. Multiempresa desde el origen

La plataforma deberá soportar múltiples negocios de forma aislada.

Cada negocio tendrá sus propios:

- usuarios;
- contactos;
- leads;
- conversaciones;
- servicios;
- profesionales;
- citas;
- pipelines;
- configuraciones;
- automatizaciones;
- integraciones.

---

### 2. Núcleo independiente de la industria

El dominio principal deberá utilizar conceptos generales.

Ejemplos:

- Business
- Contact
- Lead
- Conversation
- Message
- Service
- StaffMember
- Appointment
- Pipeline
- Automation

Los conceptos específicos de odontología u otras industrias deberán implementarse como configuración o extensiones del núcleo cuando sea posible.

---

### 3. IA como agente, no como fuente de verdad

La inteligencia artificial será responsable principalmente de:

- comprender mensajes;
- conversar;
- interpretar intención;
- recopilar información;
- seleccionar herramientas;
- generar respuestas.

Las operaciones críticas deberán ser ejecutadas y validadas por el backend.

Ejemplos:

- disponibilidad;
- creación de citas;
- modificación de datos;
- estado del lead;
- permisos;
- automatizaciones.

---

### 4. Intervención humana siempre disponible

La plataforma deberá permitir que una persona tome el control de una conversación.

El sistema nunca asumirá que la IA puede resolver todos los casos.

---

### 5. Proveedores desacoplados

El producto no deberá depender directamente de un único proveedor externo.

Esto aplica especialmente a:

- mensajería;
- inteligencia artificial;
- correo;
- calendarios;
- telefonía;
- almacenamiento;
- integraciones externas.

Los proveedores deberán conectarse mediante adaptadores o interfaces.

---

### 6. Automatización basada en eventos

Las acciones internas importantes podrán generar eventos.

Ejemplos:

    lead.created
    message.received
    appointment.created
    appointment.cancelled
    lead.stage_changed
    conversation.handoff_requested

Estos eventos podrán activar:

- notificaciones;
- tareas;
- seguimientos;
- integraciones;
- procesos asíncronos;
- analytics.

---

## Primer caso de uso

El primer entorno real será un consultorio odontológico.

El problema principal identificado es:

> Gran parte del tiempo del profesional se pierde respondiendo mensajes de WhatsApp y coordinando citas manualmente.

La primera implementación deberá permitir que un paciente pueda iniciar una conversación, resolver dudas y terminar con una cita agendada sin intervención humana cuando el caso lo permita.

---

## Objetivo inicial

El primer gran objetivo funcional es completar el flujo:

    WhatsApp
       ↓
    Mensaje recibido
       ↓
    Contacto identificado
       ↓
    Conversación registrada
       ↓
    IA responde
       ↓
    Paciente desea agendar
       ↓
    Sistema consulta disponibilidad
       ↓
    Paciente selecciona horario
       ↓
    Cita creada
       ↓
    Pipeline actualizado
       ↓
    Confirmación enviada

Cuando este flujo funcione de extremo a extremo con un usuario real, se considerará validado el núcleo inicial del producto.

---

## Alcance futuro

La plataforma podrá evolucionar hacia funcionalidades como:

- múltiples canales;
- Instagram;
- formularios web;
- agentes de voz;
- campañas;
- recordatorios;
- recuperación de leads;
- postventa;
- reactivación de clientes;
- promociones;
- pagos;
- integraciones con CRM;
- múltiples sedes;
- analítica avanzada;
- automatizaciones configurables;
- verticales especializados.

Estas funcionalidades no forman necesariamente parte del MVP.

---

## Visión

ia-business-platform busca convertirse en una infraestructura de atención y conversión para negocios de servicios.

La visión a largo plazo es que una empresa pueda configurar su operación, conectar sus canales y permitir que agentes de IA gestionen gran parte del ciclo comercial manteniendo supervisión humana y control total sobre sus datos y procesos.
