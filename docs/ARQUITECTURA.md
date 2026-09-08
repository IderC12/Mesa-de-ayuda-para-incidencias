# Arquitectura y decisiones

## Responsabilidades

| Capa           | Qué hace                                                     | Qué no debe conocer             |
| -------------- | ------------------------------------------------------------ | ------------------------------- |
| Domain         | Valida tickets, transiciones, permisos de lectura y métricas | React, DOM, HTTP, Supabase      |
| Application    | Ejecuta los casos de uso y valida quién puede solicitarlos   | Tablas, consultas y componentes |
| Infrastructure | Implementa persistencia y autenticación                      | Diseño de pantallas             |
| Presentation   | Muestra datos, captura formularios y coordina interacción    | SQL y claves del servicio       |

Las páginas llaman a `createHelpdeskService(repository)`. La inyección del repositorio se realiza en la composición de `App.jsx`. Cambiar entre demo y Supabase no modifica las reglas del negocio.

Los objetos de tickets utilizan los mismos nombres `snake_case` del esquema. Para un proyecto de este tamaño evita mapeadores repetitivos. Si aparece otra API con contratos distintos, el adaptador será el lugar para traducirlos.

## Estado y errores

`HelpdeskProvider` conserva la sesión y la instantánea de datos visibles. Sus operaciones devuelven `{ ok, value }`: un formulario solo se cierra o navega cuando su escritura fue confirmada. Los fallos se muestran mediante mensajes accesibles.

Un contador de solicitudes descarta respuestas de lecturas anteriores, evitando que una respuesta lenta sobrescriba una sesión posterior. El cambio de usuario y el desmontaje invalidan las lecturas pendientes. No se implementan actualizaciones optimistas: se prioriza mostrar datos confirmados.

La aplicación no promete sincronización en tiempo real. El botón de actualización vuelve a consultar el repositorio. En Supabase una actualización de ticket utiliza `id` y `updated_at` para detectar escrituras desactualizadas.

## Permisos

| Acción                               | Solicitante | Agente | Administrador |
| ------------------------------------ | ----------- | ------ | ------------- |
| Crear tickets propios                | Sí          | Sí     | Sí            |
| Ver tickets                          | Propios     | Todos  | Todos         |
| Comentar tickets no cerrados         | Propios     | Todos  | Todos         |
| Asignar y cambiar prioridad/estado   | No          | Sí     | Sí            |
| Consultar categorías                 | Sí          | Sí     | Sí            |
| Crear, editar y archivar categorías  | No          | No     | Sí            |
| Consultar equipo y reportes globales | No          | Sí     | Sí            |
| Cambiar rol de otra persona          | No          | No     | Sí            |
| Editar nombre propio                 | Sí          | Sí     | Sí            |

Los permisos del frontend mejoran la experiencia. La seguridad real está en RLS, privilegios por columna y funciones del servidor. Una persona no puede elevar su rol mediante `user_metadata` ni actualizando su perfil. Al registrar una cuenta se le asigna siempre `requester`. La primera cuenta administradora se configura mediante SQL de instalación, nunca desde un registro público.

Las tablas de comentarios e historial no conceden permisos de edición o eliminación al cliente. Las actualizaciones de estado, prioridad y asignación generan actividad en la misma transacción. Los registros conservan el nombre visible al momento de la acción.

La demo utiliza almacenamiento del navegador y perfiles libremente seleccionables. Es un entorno de demostración, no una barrera de seguridad. No se deben introducir datos reales en ella.

## Ciclo de vida

- Abierto → En proceso o Resuelto.
- En proceso → Abierto o Resuelto.
- Resuelto → En proceso o Cerrado.
- Cerrado → Abierto.

Cada transición se valida tanto en dominio como en un trigger PostgreSQL. La fecha de resolución se establece en el servidor. Reabrir elimina esa fecha; una nueva resolución mide el tiempo desde la creación original. No es un indicador de SLA ni excluye fines de semana.

## Cómo extenderlo

1. **Adjuntos:** añadir un repositorio de archivos, almacenamiento privado y políticas de acceso vinculadas al ticket. No guardar archivos base64 en las filas de tickets.
2. **Notificaciones:** publicar eventos del servidor tras confirmar la transacción y procesarlos de forma idempotente.
3. **Más volumen:** reemplazar `load()` por consultas paginadas y filtradas en servidor; calcular reportes con vistas/RPC agregadas. El adaptador actual recupera lotes de 500 para evitar truncamientos, pero carga todos los datos visibles en memoria.
4. **Organizaciones:** añadir `organization_id`, membresías y políticas RLS por organización antes de compartir una base entre varias empresas.
5. **API propia:** implementar el mismo contrato de repositorio y mantener las reglas de Domain/Application.

Separar carpetas no garantiza por sí mismo escalabilidad. La estructura facilita estas extensiones; el siguiente paso para grandes instalaciones es cambiar el patrón de consulta y distribución de estado.

## Convenciones

- Componentes y páginas en `PascalCase`; funciones y variables en `camelCase`.
- CSS centralizado en una carpeta propia, dividido mediante comentarios por responsabilidad y tokens comunes.
- Comentarios para decisiones, permisos y casos no evidentes; evitar comentar cada línea.
- Prettier para formato y ESLint para errores y reglas de hooks.
- Pruebas del comportamiento y de los límites de confianza, sin acoplarlas al HTML exacto.
- No capturar errores para ocultarlos ni registrar sesiones o contraseñas en consola.
