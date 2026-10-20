# Helpdesk System

Mesa de ayuda TI construida con **React, JavaScript, React Router, Vite y Supabase**. Permite registrar incidencias, atenderlas por prioridad, conversar sobre una solución y consultar reportes.

El proyecto incluye una **demo funcional** con tres roles y datos ficticios. Está pensada para compartir el trabajo con reclutadores sin entregar credenciales de una base de datos.

![Escritorio de soporte TI](public/support-workspace.webp)

## Empezar en tu PC

Requiere **Node.js 22.12 o superior**. Abre esta carpeta en VS Code y ejecuta en su terminal:

```bash
npm ci
npm run dev
```

Abre la dirección que muestra Vite. En la pantalla de acceso elige **Administrador**, **Agente de soporte** o **Solicitante**. No necesitas configurar variables ni una cuenta de Supabase para probar la demo.

Los datos se guardan en este navegador. Puedes reiniciarlos desde **Configuración → Restablecer demo**. La demo no sincroniza datos entre equipos y sus perfiles no son cuentas reales.

> Este proyecto se inicia con Vite. No abras `index.html` directamente ni utilices Live Server.

## Funcionalidades

- **Acceso real con Supabase:** registro, confirmación por correo, inicio y cierre de sesión, recuperación y cambio de contraseña.
- **Rutas protegidas y permisos por rol:** solicitante, agente y administrador.
- **Tickets:** creación, búsqueda, filtros combinables, paginación, prioridades, asignación y transiciones de estado.
- **Seguimiento:** conversación e historial de cambios generados por el servidor en modo Supabase.
- **Categorías:** creación, edición y archivo sin eliminar los tickets históricos.
- **Usuarios:** consulta del equipo, cambio de roles por un administrador y edición del perfil propio.
- **Reportes:** conteos reales, distribución, porcentaje de resolución, tiempo medio y exportación CSV.
- **Interfaz adaptable:** navegación móvil, etiquetas accesibles, diálogos con foco nativo, estados de carga/error/vacío e imagen local optimizada.

## Dos formas de ejecutarlo

| Modalidad               | Autenticación                         | Datos                     | Uso previsto                                   |
| ----------------------- | ------------------------------------- | ------------------------- | ---------------------------------------------- |
| `demo` (predeterminada) | Selección de perfiles ficticios       | `localStorage` versionado | Demostraciones y revisión de la interfaz       |
| `supabase`              | Correo y contraseña con Supabase Auth | PostgreSQL con RLS        | Usuarios reales de una instalación configurada |

Para conectar tu base de datos, sigue **[docs/SUPABASE.md](docs/SUPABASE.md)**. La entrega no contiene tus variables de entorno originales. La migración usa tablas `hd_*` y no modifica tu tabla `usuarios` anterior.

## Organización del código

```text
src/
  Domain/                 Reglas y validaciones independientes del framework
  Application/            Casos de uso y permisos compartidos
  Infrastructure/
    Repositories/         Adaptadores de demo y Supabase
    repository.js         Selección explícita del adaptador
  Presentation/
    Components/           Tabla, layout, iconos y controles compartidos
    Context/              Sesión, carga y operaciones del espacio
    Pages/                Pantallas de cada flujo
    Styles/               Tokens, componentes y reglas responsivas
  App.jsx                 Rutas y composición de dependencias
  main.jsx                Punto de entrada
supabase/migrations/      Esquema, índices, permisos, triggers y políticas RLS
tests/                    Pruebas del negocio, demo y PostgreSQL
docs/                     Instalación, arquitectura, manual y presentación
```

React no consulta las tablas desde las páginas. Las páginas utilizan servicios; los servicios delegan en repositorios intercambiables. El diseño evita crear capas vacías o abstracciones sin una responsabilidad real.

Más información: **[Arquitectura](docs/ARQUITECTURA.md)** · **[Manual de uso](docs/MANUAL.md)** ·.

## Comandos

| Comando                | Función                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run dev`          | Desarrollo local                                                      |
| `npm run build`        | Compila la aplicación en `dist/`                                      |
| `npm run preview`      | Sirve la compilación para revisión local                              |
| `npm run lint`         | Analiza el código con ESLint y reglas de React                        |
| `npm test`             | Comprueba reglas del negocio y flujos de la demo                      |
| `npm run test:db`      | Ejecuta la migración real en PostgreSQL embebido y comprueba permisos |
| `npm run check`        | Ejecuta lint, pruebas y compilación                                   |
| `npm run format`       | Aplica formato consistente con Prettier                               |
| `npm run format:check` | Comprueba el formato sin modificar archivos                           |

Las pruebas de base de datos usan PGlite únicamente como dependencia de desarrollo. No necesitan credenciales ni se conectan a tu Supabase. El frontend no incluye PGlite en su paquete de producción.

## Compartir una demo

1. Mantén `VITE_DATA_MODE=demo`.
2. Ejecuta `npm ci` y `npm run build`.
3. Publica la carpeta `dist/` en un alojamiento de sitios estáticos.
4. Configura la redirección de rutas a `index.html`. Se incluyen `public/_redirects` para alojamientos compatibles y `vercel.json` para Vercel.


## Alcance y validación

Esta entrega completa un MVP de help desk. No incluye adjuntos, notificaciones por correo de tickets, integración con directorios corporativos, SLA por calendario laboral ni múltiples organizaciones. Son extensiones posibles, no funciones simuladas.

Se comprueban automáticamente reglas, persistencia de demo, políticas RLS y compilación. La validación de SQL se realiza en PostgreSQL embebido con `auth.uid()` simulado. La entrega no ha ejecutado la migración en tu cuenta de Supabase ni probado envío real de correos o recorridos de navegador; completa las comprobaciones manuales de `docs/MANUAL.md` antes de usar usuarios reales.

