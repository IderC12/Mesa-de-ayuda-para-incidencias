import { createDemoData } from './demoSeed.js';
const DATA_KEY = 'helpdesk.demo.v1';
const SESSION_KEY = 'helpdesk.demo.session.v1';
/** Adaptador exclusivo de demostración. Nunca guarda contraseñas ni sustituye la seguridad de Supabase. */
export function createDemoRepository(storage = window.localStorage) {
  const read = () => {
    const raw = storage.getItem(DATA_KEY);
    if (!raw) {
      const seed = createDemoData();
      storage.setItem(DATA_KEY, JSON.stringify(seed));
      return seed;
    }
    try {
      const data = JSON.parse(raw);
      if (
        data.version !== 1 ||
        !['profiles', 'categories', 'tickets', 'comments', 'activities'].every((key) =>
          Array.isArray(data[key]),
        )
      )
        throw new Error();
      return data;
    } catch {
      throw new Error(
        'La demo guardada no se puede leer. Restablece sus datos desde la pantalla de acceso.',
      );
    }
  };
  const save = (data) => {
    try {
      storage.setItem(DATA_KEY, JSON.stringify(data));
    } catch {
      throw new Error(
        'No se pudieron guardar los cambios. Revisa el espacio y los permisos de almacenamiento del navegador.',
      );
    }
  };
  const activity = (data, ticketId, user, detail) =>
    data.activities.push({
      id: crypto.randomUUID(),
      ticket_id: ticketId,
      actor_name: user.name,
      detail,
      created_at: new Date().toISOString(),
    });
  return {
    mode: 'demo',
    async getSession() {
      const userId = storage.getItem(SESSION_KEY);
      return read().profiles.find((u) => u.id === userId) ?? null;
    },
    subscribe() {
      return () => {};
    },
    async signInDemo(role) {
      const user = read().profiles.find((u) => u.role === role);
      if (!user) throw new Error('No hay un usuario con este rol. Restablece la demo.');
      storage.setItem(SESSION_KEY, user.id);
      return user;
    },
    async signOut() {
      storage.removeItem(SESSION_KEY);
    },
    async load(user) {
      const data = read();
      const tickets =
        user.role === 'requester'
          ? data.tickets.filter((t) => t.requester_id === user.id)
          : data.tickets;
      const ids = new Set(tickets.map((t) => t.id));
      return {
        ...data,
        profiles:
          user.role === 'requester' ? data.profiles.filter((p) => p.id === user.id) : data.profiles,
        tickets: tickets.sort((a, b) => b.created_at.localeCompare(a.created_at)),
        comments: data.comments.filter((c) => ids.has(c.ticket_id)),
        activities: data.activities.filter((a) => ids.has(a.ticket_id)),
      };
    },
    async createTicket(input, user) {
      const data = read();
      const now = new Date().toISOString();
      const ticket = {
        ...input,
        id: crypto.randomUUID(),
        number: Math.max(1000, ...data.tickets.map((t) => t.number)) + 1,
        status: 'open',
        requester_id: user.id,
        requester_name: user.name,
        assignee_id: null,
        created_at: now,
        updated_at: now,
        resolved_at: null,
      };
      data.tickets.push(ticket);
      activity(data, ticket.id, user, 'Creó el ticket');
      save(data);
      return ticket;
    },
    async updateTicket(ticket, patch, user) {
      const data = read();
      const existing = data.tickets.find((t) => t.id === ticket.id);
      if (!existing || existing.updated_at !== ticket.updated_at)
        throw new Error('El ticket cambió. Actualiza la página antes de guardar.');
      Object.assign(existing, patch, { updated_at: new Date().toISOString() });
      if (patch.status && patch.status !== ticket.status) {
        existing.resolved_at = ['resolved', 'closed'].includes(patch.status)
          ? (existing.resolved_at ?? existing.updated_at)
          : null;
        activity(data, ticket.id, user, `Cambió el estado a ${patch.status}`);
      }
      if (Object.hasOwn(patch, 'assignee_id') && patch.assignee_id !== ticket.assignee_id)
        activity(data, ticket.id, user, 'Actualizó la asignación');
      if (patch.priority && patch.priority !== ticket.priority)
        activity(data, ticket.id, user, 'Actualizó la prioridad');
      save(data);
    },
    async addComment(ticketId, body, user) {
      const data = read();
      data.comments.push({
        id: crypto.randomUUID(),
        ticket_id: ticketId,
        author_id: user.id,
        author_name: user.name,
        body,
        created_at: new Date().toISOString(),
      });
      save(data);
    },
    async saveCategory(input) {
      const data = read();
      if (
        data.categories.some(
          (c) => c.id !== input.id && c.name.toLowerCase() === input.name.toLowerCase(),
        )
      )
        throw new Error('Ya existe una categoría con ese nombre.');
      const existing = data.categories.find((c) => c.id === input.id);
      if (existing) Object.assign(existing, input);
      else data.categories.push({ ...input, id: crypto.randomUUID(), active: true });
      save(data);
    },
    async setRole(id, role) {
      const data = read();
      data.profiles.find((p) => p.id === id).role = role;
      if (role === 'requester')
        data.tickets
          .filter((t) => t.assignee_id === id && ['open', 'in_progress'].includes(t.status))
          .forEach((t) => {
            t.assignee_id = null;
            t.updated_at = new Date().toISOString();
            activity(data, t.id, { name: 'Administración' }, 'Actualizó la asignación');
          });
      save(data);
    },
    async updateProfile(user, name) {
      const data = read();
      const profile = data.profiles.find((p) => p.id === user.id);
      profile.name = name;
      save(data);
      return profile;
    },
    async reset() {
      storage.removeItem(SESSION_KEY);
      save(createDemoData());
    },
  };
}
