export const dateTime = (date) =>
  new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(date),
  );
export const shortDate = (date) =>
  new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(new Date(date));
export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
export function readableError(error) {
  if (error?.code === '23505') return 'Ya existe un registro con esos datos.';
  if (['42501', 'PGRST301'].includes(error?.code))
    return 'No tienes permiso para realizar esta acción. Vuelve a iniciar sesión.';
  if (error?.code === '42P01' || error?.code === 'PGRST205')
    return 'Falta instalar las tablas del proyecto en Supabase. Sigue docs/SUPABASE.md.';
  if (error?.message === 'Invalid login credentials') return 'Correo o contraseña incorrectos.';
  if (error?.message === 'Email not confirmed')
    return 'Confirma tu correo antes de iniciar sesión.';
  if (/fetch|network/i.test(error?.message ?? ''))
    return 'No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo.';
  return error?.message || 'Ocurrió un problema. Inténtalo de nuevo.';
}
