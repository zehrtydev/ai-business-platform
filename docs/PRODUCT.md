# PRODUCT.md

## Estado

Draft inicial.

Este documento define el producto desde la perspectiva funcional: quién lo usa, qué problemas resuelve, qué módulos existen y cómo deben comportarse.

Las decisiones técnicas pertenecen principalmente a `ARCHITECTURE.md`.El alcance mínimo de la primera versión pertenece a `MVP.md`.

---

## 1. Producto

**ia-business-platform** es una plataforma SaaS multiempresa para centralizar, automatizar y supervisar la atención comercial de negocios de servicios.

Su función principal es ayudar a convertir conversaciones entrantes en resultados medibles, especialmente:

- citas;
- oportunidades;
- seguimientos;
- intervenciones humanas;
- clientes.

El producto combina:

    Canales
      +
    CRM
      +
    Agenda
      +
    IA
      +
    Automatizaciones
      +
    Analítica

en una sola operación.

---

## 2. Problema que resuelve

Muchos negocios reciben leads por mensajería, pero los gestionan de forma manual y fragmentada.

Problemas frecuentes:

- respuestas tardías;
- conversaciones perdidas;
- leads que se enfrían;
- citas coordinadas manualmente;
- información distribuida entre chats;
- poca visibilidad del estado comercial;
- seguimiento inconsistente;
- dependencia de una persona para responder;
- ausencia de métricas;
- falta de continuidad cuando cambia el encargado.

ia-business-platform busca reducir estas pérdidas mediante una operación centralizada y asistida por IA.

---

## 3. Cliente objetivo inicial

El primer cliente será un consultorio odontológico.

Sin embargo, el producto no se diseñará exclusivamente para odontología.

El cliente objetivo general es:

> Negocio de servicios que recibe leads por canales digitales y necesita atender, calificar, agendar o hacer seguimiento de forma repetitiva.

Ejemplos potenciales:

- odontología;
- medicina estética;
- fisioterapia;
- psicología;
- veterinaria;
- barberías y salones;
- inmobiliarias;
- academias;
- talleres;
- servicios profesionales;
- otros negocios con procesos de atención y agenda.

---

## 4. Usuario final externo

El usuario externo es la persona que contacta al negocio.

Dependiendo del vertical podrá llamarse:

    paciente
    cliente
    lead
    prospecto
    interesado
    usuario

Dentro del núcleo del producto será representado principalmente como:

    Contact

y, cuando exista una oportunidad comercial:

    Lead

---

## 5. Usuarios internos

### 5.1 Owner

Responsable principal del negocio dentro de la plataforma.

Puede:

- configurar el negocio;
- administrar usuarios;
- administrar servicios;
- administrar profesionales;
- configurar horarios;
- configurar integraciones;
- configurar IA;
- revisar conversaciones;
- gestionar leads;
- revisar citas;
- revisar métricas.

---

### 5.2 Member

Usuario operativo.

Puede, según permisos futuros:

- revisar conversaciones;
- responder manualmente;
- gestionar leads;
- consultar agenda;
- atender handoffs;
- consultar contactos.

Durante el MVP los permisos serán simples.

---

## 6. Principio central de experiencia

El negocio no debería tener que aprender conceptos de IA para usar el sistema.

La configuración deberá expresarse en términos del negocio.

Preferencia:

    Servicios
    Horarios
    Profesionales
    Preguntas frecuentes
    Objetivo de conversación
    Políticas

No:

    temperature
    top_p
    system tokens
    function schemas
    vector indexes

Los detalles técnicos deberán permanecer ocultos salvo en áreas avanzadas futuras.

---

# 7. Módulos del producto

## 7.1 Dashboard

Objetivo:

Dar una vista rápida del estado comercial y operativo.

Información inicial:

- leads recibidos;
- conversaciones activas;
- citas agendadas;
- conversaciones que requieren humano;
- conversión básica;
- actividad reciente.

El dashboard debe responder rápidamente:

    ¿Qué está pasando?
    ¿Qué requiere atención?
    ¿Cuántas oportunidades estamos convirtiendo?

No debe convertirse en un panel saturado de métricas durante el MVP.

---

## 7.2 Inbox

Objetivo:

Centralizar las conversaciones del negocio.

La bandeja deberá permitir:

- listar conversaciones;
- identificar canal;
- ver contacto;
- ver último mensaje;
- conocer estado;
- conocer si responde IA o humano;
- identificar conversaciones que requieren atención;
- abrir historial completo;
- responder manualmente.

Ejemplo conceptual:

    Inbox

    [●] Carlos Pérez
        "Quisiera una valoración mañana"
        WhatsApp · IA activa · Hace 2 min

    [!] Laura Gómez
        "Necesito hablar con alguien"
        WhatsApp · Requiere humano · Hace 5 min

---

## 7.3 Conversación

La vista de conversación deberá combinar:

    mensajes
    +
    información del contacto
    +
    estado comercial
    +
    acciones operativas

Acciones mínimas:

- enviar mensaje;
- tomar control;
- devolver control a IA;
- ver servicio de interés;
- ver estado del lead;
- consultar cita;
- acceder al contacto.

---

## 7.4 Human handoff

El negocio siempre podrá intervenir.

Estados conceptuales:

    AI_CONTROLLED
    HUMAN_CONTROLLED
    HUMAN_REQUIRED

Casos de handoff:

- el usuario solicita una persona;
- la IA no tiene suficiente información;
- existe una excepción;
- la conversación contiene una situación que requiere revisión;
- un operador decide intervenir.

Regla:

> Mientras la conversación esté bajo control humano, la IA no deberá responder automáticamente.

---

## 7.5 CRM

Objetivo:

Dar contexto comercial sobre cada persona.

El CRM inicial deberá incluir:

    Contactos
    Leads
    Estado
    Fuente
    Servicio de interés
    Última interacción
    Citas

No se pretende competir inicialmente con un CRM empresarial completo.

---

## 7.6 Contactos

Cada persona identificable será un contacto.

Información mínima:

- nombre;
- teléfono;
- email opcional;
- fuente;
- fecha de creación;
- última interacción.

Posteriormente podrá incluir:

- etiquetas;
- notas;
- campos personalizados;
- historial completo;
- múltiples canales;
- consentimiento;
- preferencias.

---

## 7.7 Leads

Un lead representa una oportunidad comercial asociada a un contacto.

Un mismo contacto podrá tener diferentes oportunidades a lo largo del tiempo.

Ejemplo futuro:

    Contacto:
    Ana Gómez

    Lead 1:
    Valoración odontológica
    Cerrado

    Lead 2:
    Ortodoncia
    Activo

Durante el MVP podrá utilizarse un modelo más simple, pero el diseño no deberá impedir esta evolución.

---

## 7.8 Pipeline

Objetivo:

Mostrar en qué etapa comercial se encuentra cada lead.

Pipeline inicial:

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

La plataforma deberá evolucionar hacia pipelines configurables por negocio.

El pipeline no deberá depender del sector odontológico.

---

## 7.9 Servicios

Cada negocio podrá configurar lo que ofrece.

Información candidata:

    Nombre
    Descripción
    Duración
    Precio
    Estado
    Profesionales asociados
    Instrucciones

Ejemplos:

    Valoración
    Limpieza
    Ortodoncia
    Consulta psicológica
    Visita inmobiliaria
    Diagnóstico técnico

---

## 7.10 Profesionales / Staff

Representan personas que prestan servicios o reciben citas.

Información básica:

- nombre;
- estado;
- servicios;
- horarios;
- citas.

No todo negocio requerirá profesionales individuales.

La arquitectura deberá permitir posteriormente recursos alternativos como:

    salas
    equipos
    vehículos
    espacios

sin incorporarlos al MVP.

---

## 7.11 Agenda

Objetivo:

Gestionar disponibilidad y citas.

Funciones:

- consultar agenda;
- configurar disponibilidad;
- crear cita;
- cancelar cita;
- cambiar estado;
- evitar conflictos;
- relacionar cita con contacto, servicio y profesional.

Vista inicial candidata:

    Día
    Semana
    Lista

Durante el MVP basta con una experiencia funcional.

---

## 7.12 Citas

Una cita deberá tener ciclo de vida.

Estados iniciales:

    SCHEDULED
    CANCELLED
    COMPLETED
    NO_SHOW

Posteriormente podrán añadirse:

    RESCHEDULED
    CONFIRMED
    PENDING_CONFIRMATION

La cita interna será la fuente principal de verdad.

---

## 7.13 AI Agent

El agente es responsable de atender conversaciones automáticamente.

Debe ser capaz de:

- entender intención;
- responder preguntas;
- utilizar información del negocio;
- identificar servicio de interés;
- recopilar datos faltantes;
- consultar disponibilidad;
- proponer horarios;
- crear citas mediante herramientas;
- actualizar contexto comercial;
- solicitar handoff.

No deberá:

- inventar precios;
- inventar disponibilidad;
- modificar directamente la base de datos;
- realizar acciones sin validación del backend;
- continuar respondiendo durante un handoff humano.

---

## 7.14 Business Knowledge

Cada negocio deberá poder proporcionar conocimiento al agente.

Información inicial:

- descripción del negocio;
- servicios;
- precios;
- horarios;
- dirección;
- profesionales;
- preguntas frecuentes;
- políticas;
- información comercial relevante.

Posteriormente podrá ampliarse a:

- documentos;
- páginas web;
- catálogos;
- archivos;
- instrucciones por servicio.

---

## 7.15 Configuración de IA

La configuración visible para el negocio deberá mantenerse simple.

Ejemplos:

    Nombre del asistente
    Tono
    Objetivo principal
    Saludo
    Cuándo escalar a humano
    Información permitida
    Información restringida

La selección técnica de modelos podrá permanecer bajo control de la plataforma.

---

## 7.16 Messaging

La mensajería será una capacidad común del producto.

Canal inicial:

    WhatsApp

Canales futuros:

    Instagram
    Facebook Messenger
    Webchat
    SMS
    Email
    Voice

El producto no deberá asumir que toda conversación proviene de WhatsApp.

---

## 7.17 Integraciones

El negocio podrá conectar servicios externos.

Candidatos:

    WhatsApp providers
    Google Calendar
    Outlook Calendar
    Gmail
    CRMs
    n8n
    webhooks

Las integraciones deberán estar aisladas de la lógica central del producto.

---

## 7.18 Automatizaciones

Objetivo:

Ejecutar acciones cuando ocurre algo.

Ejemplo:

    appointment.created
          ↓
    programar recordatorio

Otro ejemplo futuro:

    lead.created
          ↓
    esperar 2 horas
          ↓
    si no tiene cita
          ↓
    enviar seguimiento

Durante el MVP las reglas podrán estar definidas por el sistema.

Más adelante podrán ser configurables por el negocio.

---

## 7.19 Analytics

El sistema debe medir resultados reales.

Métricas iniciales:

- leads recibidos;
- conversaciones;
- citas;
- conversión;
- handoffs;
- tiempo de primera respuesta;
- errores.

Métricas futuras:

- conversión por canal;
- conversión por servicio;
- conversión por campaña;
- conversión por agente;
- no-show rate;
- recuperación de leads;
- ingresos atribuidos;
- tiempo promedio de cierre.

---

# 8. Flujo principal del producto

## 8.1 Entrada

    Usuario externo
          ↓
    Canal
          ↓
    Mensaje

---

## 8.2 Identificación

    Mensaje
       ↓
    ¿Existe contacto?
       ├── Sí → utilizar contacto
       └── No → crear contacto

---

## 8.3 Conversación

    Contacto
       ↓
    Crear/recuperar conversación
       ↓
    Persistir mensaje

---

## 8.4 Atención

    ¿Control humano?
       ├── Sí → no ejecutar agente
       └── No
            ↓
          agente IA

---

## 8.5 Conversión

    IA identifica intención
            ↓
    Servicio
            ↓
    Disponibilidad
            ↓
    Opciones
            ↓
    Selección
            ↓
    Validación
            ↓
    Cita

---

## 8.6 Confirmación

    Appointment created
            ↓
    Lead updated
            ↓
    Mensaje de confirmación
            ↓
    Recordatorio programado

---

# 9. Journey inicial del negocio

## 9.1 Onboarding

El negocio deberá completar progresivamente:

    Crear cuenta
       ↓
    Crear/configurar negocio
       ↓
    Registrar servicios
       ↓
    Registrar profesionales
       ↓
    Configurar disponibilidad
       ↓
    Agregar conocimiento
       ↓
    Conectar mensajería
       ↓
    Probar agente
       ↓
    Activar

Durante el piloto este proceso podrá ser acompañado manualmente.

No se requiere onboarding completamente autoservicio para el MVP.

---

## 9.2 Operación diaria

Una vez configurado:

    Entrar al dashboard
            ↓
    Revisar actividad
            ↓
    Atender handoffs
            ↓
    Consultar citas
            ↓
    Revisar conversaciones si es necesario

La meta del producto es reducir, no aumentar, la carga operativa.

---

# 10. Journey inicial del lead

Ejemplo odontológico:

    Paciente:
    Hola, quisiera saber cuánto cuesta una limpieza.

    IA:
    Responde con información válida.

    Paciente:
    ¿Tienen disponibilidad mañana?

    IA:
    Consulta disponibilidad real.

    Sistema:
    Devuelve horarios.

    IA:
    Presenta opciones.

    Paciente:
    A las 11:30.

    Sistema:
    Valida horario.

    Sistema:
    Crea cita.

    IA:
    Confirma.

    Sistema:
    Programa recordatorio.

Este flujo representa la experiencia central del MVP.

---

# 11. Principios de UX

## 11.1 Claridad

El usuario interno deberá entender rápidamente qué está ocurriendo.

Priorizar:

    estado
    acción pendiente
    responsable
    resultado

---

## 11.2 Supervisión

La automatización nunca deberá sentirse invisible para el negocio.

El usuario podrá revisar:

- qué respondió la IA;
- qué acciones ejecutó;
- qué citas creó;
- qué conversaciones escaló.

---

## 11.3 Control

El negocio podrá intervenir cuando lo considere necesario.

Automatización no significa pérdida de control.

---

## 11.4 Configuración progresiva

El sistema deberá funcionar con una configuración inicial razonablemente pequeña.

No exigir decenas de pantallas antes de obtener valor.

---

## 11.5 Mobile-friendly

El dashboard será web, pero deberá funcionar correctamente desde dispositivos móviles.

No se requiere app nativa para el MVP.

---

# 12. Reglas del producto

## 12.1 La IA no inventa datos operativos

No inventar:

    precios
    horarios
    disponibilidad
    profesionales
    citas
    políticas

Si la información no existe:

    preguntar
    escalar
    o reconocer que no está disponible

---

## 12.2 La cita debe confirmarse en backend

Una respuesta del modelo diciendo:

> Tu cita quedó agendada.

solo podrá enviarse después de que el backend haya confirmado la creación real.

---

## 12.3 El humano tiene prioridad

Si un humano toma control:

    automatización conversacional pausada

---

## 12.4 Los mensajes se registran

Los mensajes relevantes del flujo deberán persistirse para:

- historial;
- soporte;
- auditoría;
- contexto;
- analytics.

---

## 12.5 El tenant siempre está definido

Toda acción operativa debe ejecutarse dentro del contexto de un negocio.

---

# 13. Estados importantes

## Conversación

    OPEN
    HUMAN_REQUIRED
    CLOSED

Control:

    AI
    HUMAN

---

## Appointment

    SCHEDULED
    CANCELLED
    COMPLETED
    NO_SHOW

---

## Lead

Estado comercial inicial:

    NEW
    CONTACTED
    INTERESTED
    APPOINTMENT_PROPOSED
    APPOINTMENT_SCHEDULED
    COMPLETED

---

# 14. Notificaciones

Durante el MVP las notificaciones estarán centradas en eventos de alto valor.

Ejemplos:

- handoff requerido;
- error crítico de integración;
- cita creada;
- job agotó reintentos.

No se requiere un centro completo de notificaciones inicialmente.

---

# 15. Acciones del operador

Desde el panel, un usuario podrá progresivamente:

    ver
    crear
    editar
    responder
    tomar control
    cerrar
    cancelar
    reagendar
    consultar

Las acciones concretas dependerán del módulo.

---

# 16. Configuración del negocio

Área candidata:

    Settings
    ├── Business
    ├── Users
    ├── Services
    ├── Staff
    ├── Availability
    ├── AI Agent
    ├── Integrations
    └── Messaging

La configuración avanzada podrá aparecer posteriormente.

---

# 17. Diseño multiindustria

El producto deberá evitar nombres específicos de odontología en el núcleo.

Preferir:

    Service

en lugar de:

    DentalTreatment

Preferir:

    StaffMember

en lugar de:

    Dentist

Preferir:

    Appointment

en lugar de:

    DentalAppointment

La especialización deberá llegar mediante configuración o módulos verticales.

---

# 18. Verticales

Un vertical podrá aportar:

- presets;
- terminología;
- automatizaciones;
- campos;
- plantillas;
- conocimiento;
- integraciones específicas.

Ejemplo futuro:

    Vertical: Odontología

    Preset:
    - valoración
    - limpieza
    - ortodoncia
    - recordatorio de control

Esto no deberá cambiar el núcleo.

---

# 19. Funciones futuras importantes

No forman parte necesariamente del MVP, pero forman parte de la visión.

### Omnicanal

    WhatsApp
    Instagram
    Web
    Email
    Voice

en una sola bandeja.

### Follow-up comercial

Recuperar automáticamente leads que no convirtieron.

### Postventa

Mantener contacto después de la cita o venta.

### Recall

Contactar clientes después de períodos configurables.

### Campañas

Segmentar y contactar grupos de usuarios bajo reglas y consentimiento.

### Voice Agent

Realizar o recibir llamadas mediante IA.

### Payments

Permitir anticipos o pagos relacionados con servicios.

### Advanced Analytics

Medir atribución, rendimiento y retorno.

---

# 20. Diferenciador esperado

El producto no busca diferenciarse únicamente por:

> Tener un chatbot con IA.

La combinación deseada es:

    conversación
    +
    contexto del negocio
    +
    acciones reales
    +
    CRM
    +
    agenda
    +
    seguimiento
    +
    supervisión humana
    +
    métricas

La IA debe ser una parte del sistema, no el producto completo.

---

# 21. Indicadores de valor

El producto será valioso si logra mejorar variables como:

    menor tiempo de respuesta
    menos leads sin atender
    más citas agendadas
    menos trabajo manual
    mayor seguimiento
    mayor visibilidad comercial

Estas métricas deberán medirse durante los pilotos.

---

# 22. Métrica principal candidata

La métrica de producto principal durante el piloto será:

    Leads que terminan en cita agendada
    -----------------------------------
              Leads recibidos

Esta métrica no deberá interpretarse sola.

También deberán observarse:

- volumen;
- calidad de lead;
- handoffs;
- no-shows;
- errores;
- tiempo de respuesta.

---

# 23. Riesgos de producto

## Sobreautomatización

Intentar que la IA resuelva situaciones donde debería intervenir una persona.

Mitigación:

    handoff claro
    políticas
    herramientas limitadas
    supervisión

---

## Mala configuración

Una IA solo puede trabajar correctamente si el negocio proporciona información válida.

Mitigación:

- onboarding;
- validaciones;
- pruebas antes de activar;
- configuración guiada.

---

## Dependencia de canales

Cambios en WhatsApp u otros proveedores pueden afectar la operación.

Mitigación:

    MessagingProvider + adaptadores

---

## Respuestas incorrectas

El modelo puede interpretar mal o generar información no deseada.

Mitigación:

- grounding;
- tools;
- restricciones;
- trazabilidad;
- handoff;
- pruebas.

---

## Complejidad excesiva

Intentar construir demasiadas capacidades antes de validar el flujo central.

Mitigación:

    MVP.md
    +
    ROADMAP.md
    +
    criterios explícitos de alcance

---

# 24. No objetivos actuales

ia-business-platform no pretende ser inicialmente:

- software clínico;
- historia clínica;
- ERP;
- software contable;
- pasarela de pagos;
- sistema de facturación;
- call center completo;
- CRM empresarial generalista;
- constructor no-code universal;
- plataforma de marketing completa.

Puede integrarse con productos de estas categorías en el futuro.

---

# 25. Definición de éxito del producto inicial

La primera versión será considerada exitosa si un negocio piloto puede:

1. configurar su operación;
2. conectar un canal real;
3. recibir leads;
4. dejar que la IA atienda conversaciones básicas;
5. agendar citas automáticamente;
6. intervenir manualmente cuando sea necesario;
7. consultar contactos, conversaciones y citas;
8. recibir recordatorios;
9. medir resultados básicos;
10. utilizar el sistema de forma estable en operación real.

---

## 26. Principio rector

> El producto debe automatizar trabajo repetitivo sin quitarle al negocio visibilidad ni control.

Cada nueva funcionalidad deberá evaluarse según si mejora al menos una de estas dimensiones:

    conversión
    eficiencia
    seguimiento
    control
    experiencia del cliente
    visibilidad
