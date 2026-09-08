# Conectar con Supabase

La demo funciona sin este paso. Para autenticación y datos reales, configura un proyecto de Supabase. No se han realizado cambios en tu cuenta durante la preparación de esta entrega.

## 1. Crear el esquema

Se recomienda un proyecto nuevo para separar las pruebas de los datos anteriores. Si utilizas tu proyecto actual, realiza una copia de seguridad primero.

1. Abre el SQL Editor de tu proyecto.
2. Copia el contenido completo de `supabase/migrations/001_helpdesk.sql` y ejecútalo **una sola vez**.
3. Comprueba que existen `hd_profiles`, `hd_categories`, `hd_tickets`, `hd_comments` y `hd_activities`.

La migración es transaccional: ante un error PostgreSQL revierte el conjunto. No está diseñada para ejecutarse repetidamente sobre un esquema ya instalado. Los cambios futuros deben ir en migraciones numeradas nuevas.

Las tablas y funciones usan el prefijo `hd_`. No se elimina ni modifica `usuarios`, `handle_new_user()` o el trigger que existían en tu proyecto original. Un trigger anterior que falle puede impedir registros nuevos: revisa los logs de Auth antes de modificarlo y conserva sus datos.

Las cuentas existentes en `auth.users` reciben un perfil nuevo de solicitante en `hd_profiles`. No se heredan privilegios de otras tablas.

## 2. Configurar variables locales

Copia `.env.example` como `.env.local` en la raíz del proyecto. En PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Edita los valores:

```dotenv
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

Utiliza únicamente la clave **publishable** de la aplicación cliente (o la clave pública `anon` heredada). **Nunca uses `service_role`, una clave secreta o una contraseña de PostgreSQL en variables `VITE_*`.** Vite las incorpora al código público del navegador.

Reinicia `npm run dev` después de cambiar las variables. Para alojamiento estático, define estas mismas variables en su configuración de compilación y vuelve a generar `dist/`.

## 3. Configurar Auth

En Authentication → URL Configuration:

- Define la **Site URL** con tu dirección de desarrollo o tu dominio final.
- Autoriza las direcciones de retorno exactas `/login` y `/reset-password`.
- Ejemplo de desarrollo: `http://localhost:5173/login` y `http://localhost:5173/reset-password`. Si Vite utiliza otro puerto, autoriza ese puerto también.
- Añade las dos direcciones equivalentes para el dominio donde publiques el proyecto.

Habilita el proveedor Email y la confirmación por correo según tu configuración. Para usuarios reales configura un proveedor SMTP y revisa sus límites de envío. La aplicación no incluye credenciales de correo.

El restablecimiento usa un enlace enviado por Supabase. No pruebes esta función escribiendo `/reset-password` sin una sesión válida de recuperación: Supabase debe validar primero el enlace.

## 4. Crear el primer administrador

1. En la aplicación, registra tu correo y confirma la cuenta.
2. Desde el SQL Editor de Supabase, reemplaza el correo del siguiente ejemplo por **tu propia cuenta verificada**:

```sql
update public.hd_profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'tu-correo@ejemplo.com'
    and email_confirmed_at is not null
);
```

3. Comprueba que se actualizó exactamente una fila.
4. Cierra e inicia sesión para cargar el rol.
5. Las siguientes cuentas se crean desde el registro. Asigna roles de soporte desde **Equipo → Cambiar rol**.

La pantalla no permite cambiar tu propio rol. Esto evita dejar el sistema sin un administrador mediante un cambio accidental.

## 5. Verificación en tu instalación

Usa cuentas de prueba diferentes, preferiblemente en perfiles de navegador separados:

- Un solicitante crea un ticket y ve únicamente sus solicitudes.
- Otro solicitante no puede consultar el ticket anterior ni entrando por su URL.
- Un agente lo asigna, comenta y cambia su estado.
- Un agente no puede cambiar roles ni crear categorías.
- Un administrador archiva una categoría; los tickets anteriores la conservan.
- Al reabrir un ticket se elimina su fecha de resolución.
- Al cerrar un ticket se bloquean comentarios nuevos.
- La recuperación de contraseña llega al correo, abre la ruta correcta y permite volver a entrar.

Las pruebas `npm run test:db` comprueban la migración y las políticas en PostgreSQL embebido; no sustituyen comprobar la configuración de correo, las redirecciones ni el despliegue de tu proyecto real.

## Problemas comunes

| Síntoma                                 | Qué revisar                                                              |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Sigue apareciendo la demo               | `VITE_DATA_MODE=supabase`, ubicación de `.env.local` y reinicio de Vite  |
| No existen tablas o perfil              | Migración completa y proyecto al que apunta la URL                       |
| El registro falla al guardar usuario    | Logs de Auth y triggers anteriores sobre `auth.users`                    |
| Correo sin confirmar                    | Completar la confirmación antes de entrar                                |
| No llega el correo                      | Configuración SMTP, límites del proveedor y carpeta de spam              |
| El enlace vuelve a otra página          | Site URL y lista de Redirect URLs                                        |
| Pantalla 404 al recargar `/tickets/...` | Redirección del alojamiento hacia `index.html`                           |
| El ticket cambió antes de guardar       | Actualizar datos, revisar los cambios del otro agente y volver a guardar |

No desactives RLS para resolver un error de acceso. Identifica primero el usuario, su rol y la política que corresponde.
