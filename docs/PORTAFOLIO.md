# Presentar el proyecto en tu CV

## Descripción sugerida

**Helpdesk System — Aplicación web de gestión de incidencias TI**  
React · JavaScript · Supabase · PostgreSQL · React Router · Vite

Aplicación para registrar, priorizar y dar seguimiento a tickets de soporte. Implementa acceso por roles, comentarios, historial de cambios y reportes con exportación CSV. Organizada por capas, con validaciones del negocio, políticas de seguridad RLS y pruebas automatizadas.

Ajusta la descripción a lo que hayas comprendido, configurado y probado personalmente. No incluyas usuarios atendidos, porcentajes de mejora ni despliegues en una organización si todavía no los has realizado.

## Demostración de 3 a 5 minutos

1. **Problema:** las solicitudes dispersas pierden seguimiento y responsable.
2. **Solicitante:** crear una incidencia concreta, mostrar su código y añadir un comentario.
3. **Soporte:** buscarla, asignarla, actualizar estado y registrar la solución.
4. **Administrador:** mostrar categorías, roles y un reporte descargable.
5. **Código:** explicar el recorrido `Page → Service → Repository` y una prueba de permisos.
6. **Seguridad:** explicar por qué ocultar un botón no basta y cómo RLS valida la operación.

## Preguntas que deberías poder responder

- ¿Por qué separaste las reglas de negocio de los componentes?
- ¿Qué cambia entre la demo y Supabase?
- ¿Cómo evitas que un solicitante consulte el ticket de otra persona?
- ¿Por qué el usuario no puede modificar directamente su rol?
- ¿Qué sucede si dos agentes actualizan el mismo ticket?
- ¿Cómo se calcula el tiempo medio de resolución?
- ¿Por qué archivas categorías en vez de eliminarlas?
- ¿Qué cambiarías si el sistema tuviera cien mil tickets?

## Siguientes pasos personales

- Ejecuta toda la aplicación y recorre cada rol.
- Configura tu propio Supabase y verifica correos y permisos.
- Publica la demo y agrega el enlace al README y a tu CV.
- Sustituye este texto por una explicación con tus propias palabras.
- Añade una mejora que puedas defender, por ejemplo adjuntos privados o notificaciones, con sus pruebas.
- Si publicas el código, elige una licencia y añade tus datos de autor conscientemente. Esta entrega no impone una licencia sobre tu proyecto original.
