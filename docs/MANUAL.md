# Manual de uso y comprobación

## Probar la demo

Ejecuta `npm ci` y `npm run dev`. Abre la URL de Vite y elige un perfil.

### Solicitante

1. Pulsa **Nuevo ticket**.
2. Escribe un asunto, categoría, prioridad y descripción.
3. Envía la solicitud y conserva su código `HD-…`.
4. Abre el ticket y añade un comentario con información adicional.
5. Vuelve a Tickets para buscar por código o filtrar por estado.

### Agente

1. Cierra sesión y entra con el perfil **Agente de soporte**.
2. Abre el ticket que acabas de crear.
3. Selecciona un responsable y el estado **En proceso**; guarda los cambios.
4. Escribe cómo solucionaste el problema en un comentario.
5. Marca el ticket como **Resuelto**; al finalizar el seguimiento, **Cerrado**.
6. Comprueba que un ticket cerrado no acepta comentarios.
7. Abre **Reportes**, cambia el periodo y exporta CSV.

### Administrador

1. Entra como **Administrador**.
2. En Categorías, crea una categoría y modifica su descripción.
3. Desactiva su disponibilidad para archivarla; los tickets previos no se borran.
4. En Equipo cambia el rol de otra persona. No puedes cambiar tu propio rol.
5. En Configuración edita tu nombre.
6. Restablece la demo cuando quieras volver a los datos iniciales.

## Comprobaciones antes de presentar

| Escenario                                       | Resultado esperado                                              |
| ----------------------------------------------- | --------------------------------------------------------------- |
| Recargar la página tras crear un ticket         | El ticket permanece en ese navegador                            |
| Entrar como solicitante                         | Solo aparecen sus tickets                                       |
| Buscar texto inexistente                        | Se muestra un estado vacío y se pueden limpiar filtros          |
| Combinar estado y prioridad                     | Solo aparecen tickets que cumplen ambos filtros                 |
| Crear descripción demasiado corta               | El formulario impide enviarla                                   |
| Abrir un identificador inexistente              | Aparece un mensaje de ticket no disponible                      |
| Intentar entrar a una ruta protegida sin sesión | Redirige al acceso                                              |
| Abrir una ruta desconocida con sesión           | Aparece la pantalla de página no encontrada                     |
| Reducir la ventana o usar el móvil              | Aparece el botón del menú y los formularios siguen utilizables  |
| Usar teclado en un diálogo                      | El foco queda dentro; Escape cierra cuando no se está guardando |
| Exportar un asunto que comienza con `=`         | Excel lo recibe como texto y no como fórmula                    |
| Cerrar sesión                                   | Vuelve al acceso y se limpia la instantánea en memoria          |

La demo es local: los cambios no aparecen en otro equipo. Cierra sesión para cambiar de perfil. Para recibir cambios de otra pestaña usa el botón de actualización. Para uso concurrente real, utiliza Supabase.

## Reportes

Los periodos seleccionan tickets por **fecha de creación**. Los conteos muestran su estado actual. El porcentaje de resolución suma Resueltos y Cerrados y lo divide entre todos los tickets del periodo.

El tiempo medio utiliza únicamente tickets con fecha de resolución. Incluye noches y fines de semana. Reabrir elimina la resolución registrada hasta resolver nuevamente. La gráfica muestra los últimos siete días dentro del periodo seleccionado; el CSV contiene todos los tickets del periodo que puedes consultar.
