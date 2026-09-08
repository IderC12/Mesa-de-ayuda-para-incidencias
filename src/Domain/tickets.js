/** Reglas del negocio: este módulo no depende de React, Supabase ni del navegador. */
export const STATUSES = {
  open: { label: 'Abierto', tone: 'blue' },
  in_progress: { label: 'En proceso', tone: 'amber' },
  resolved: { label: 'Resuelto', tone: 'green' },
  closed: { label: 'Cerrado', tone: 'gray' },
};
export const PRIORITIES = {
  low: { label: 'Baja', tone: 'gray' },
  medium: { label: 'Media', tone: 'blue' },
  high: { label: 'Alta', tone: 'amber' },
  urgent: { label: 'Urgente', tone: 'red' },
};
export const ROLES = {
  admin: 'Administrador',
  agent: 'Agente de soporte',
  requester: 'Solicitante',
};
export const TRANSITIONS = {
  open: ['in_progress', 'resolved'],
  in_progress: ['open', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: ['open'],
};
export const isStaff = (user) => ['admin', 'agent'].includes(user?.role);
export const canReadTicket = (user, ticket) =>
  Boolean(user && (isStaff(user) || ticket.requester_id === user.id));
export const ticketCode = (ticket) => `HD-${String(ticket.number).padStart(4, '0')}`;

export function validateTicket(input) {
  const title = String(input.title ?? '').trim();
  const description = String(input.description ?? '').trim();
  if (title.length < 5 || title.length > 120)
    throw new Error('El asunto debe tener entre 5 y 120 caracteres.');
  if (description.length < 15 || description.length > 5000)
    throw new Error('Describe el problema en 15 a 5000 caracteres.');
  if (!Object.hasOwn(PRIORITIES, input.priority))
    throw new Error('Selecciona una prioridad válida.');
  if (!input.category_id) throw new Error('Selecciona una categoría.');
  return { title, description, priority: input.priority, category_id: input.category_id };
}
export function validateTransition(from, to) {
  if (from !== to && !TRANSITIONS[from]?.includes(to))
    throw new Error('Este cambio de estado no está permitido.');
}
export function validateComment(text) {
  const body = String(text ?? '').trim();
  if (!body || body.length > 2000)
    throw new Error('El comentario debe tener entre 1 y 2000 caracteres.');
  return body;
}
export function summarizeTickets(tickets) {
  const counts = Object.fromEntries(Object.keys(STATUSES).map((status) => [status, 0]));
  let hours = 0;
  let resolvedCount = 0;
  tickets.forEach((ticket) => {
    counts[ticket.status] += 1;
    if (ticket.resolved_at) {
      hours += Math.max(
        0,
        (Date.parse(ticket.resolved_at) - Date.parse(ticket.created_at)) / 3600000,
      );
      resolvedCount += 1;
    }
  });
  return {
    ...counts,
    total: tickets.length,
    resolutionRate: tickets.length
      ? Math.round(((counts.resolved + counts.closed) / tickets.length) * 100)
      : 0,
    averageHours: resolvedCount ? hours / resolvedCount : null,
  };
}
export function filterTickets(
  tickets,
  { search = '', status = '', priority = '', category = '', assignee = '' } = {},
) {
  const query = search.trim().toLocaleLowerCase('es');
  return tickets.filter(
    (ticket) =>
      (!query ||
        `${ticketCode(ticket)} ${ticket.title} ${ticket.description}`
          .toLocaleLowerCase('es')
          .includes(query)) &&
      (!status || ticket.status === status) &&
      (!priority || ticket.priority === priority) &&
      (!category || ticket.category_id === category) &&
      (!assignee || ticket.assignee_id === assignee),
  );
}
