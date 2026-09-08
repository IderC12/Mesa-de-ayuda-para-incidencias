import {
  canReadTicket,
  isStaff,
  PRIORITIES,
  ROLES,
  validateComment,
  validateTicket,
  validateTransition,
} from '../Domain/tickets.js';
/** Casos de uso compartidos por los adaptadores demo y Supabase. */
export function createHelpdeskService(repository) {
  const requireAdmin = (user) => {
    if (user?.role !== 'admin') throw new Error('Esta acción requiere un administrador.');
  };
  return {
    async createTicket(input, user, categories) {
      const valid = validateTicket(input);
      if (!user) throw new Error('Inicia sesión para continuar.');
      if (!categories.some((c) => c.id === valid.category_id && c.active))
        throw new Error('La categoría ya no está disponible.');
      return repository.createTicket(valid, user);
    },
    async updateTicket(ticket, patch, user, profiles) {
      if (!isStaff(user)) throw new Error('Solo soporte puede gestionar tickets.');
      const allowed = ['status', 'priority', 'assignee_id'];
      if (Object.keys(patch).some((key) => !allowed.includes(key)))
        throw new Error('Campo de actualización no permitido.');
      if (patch.status) validateTransition(ticket.status, patch.status);
      if (patch.priority && !Object.hasOwn(PRIORITIES, patch.priority))
        throw new Error('Prioridad inválida.');
      if (patch.assignee_id && !profiles.some((p) => p.id === patch.assignee_id && isStaff(p)))
        throw new Error('Selecciona un agente de soporte.');
      return repository.updateTicket(ticket, patch, user);
    },
    async addComment(ticket, body, user) {
      if (!canReadTicket(user, ticket)) throw new Error('No tienes acceso a este ticket.');
      if (ticket.status === 'closed')
        throw new Error('El ticket está cerrado. Soporte debe reabrirlo para continuar.');
      return repository.addComment(ticket.id, validateComment(body), user);
    },
    async saveCategory(input, user) {
      requireAdmin(user);
      const name = input.name.trim();
      const description = input.description.trim();
      if (name.length < 2 || name.length > 60 || description.length > 200)
        throw new Error('Usa un nombre de 2 a 60 caracteres y una descripción de hasta 200.');
      return repository.saveCategory({ ...input, name, description });
    },
    async setRole(id, role, user) {
      requireAdmin(user);
      if (id === user.id) throw new Error('No puedes cambiar tu propio rol.');
      if (!Object.hasOwn(ROLES, role)) throw new Error('Rol no válido.');
      return repository.setRole(id, role);
    },
    async updateProfile(user, name) {
      const valid = name.trim();
      if (valid.length < 2 || valid.length > 80)
        throw new Error('El nombre debe tener entre 2 y 80 caracteres.');
      return repository.updateProfile(user, valid);
    },
  };
}
