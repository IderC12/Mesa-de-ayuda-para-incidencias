/** Único módulo que conoce tablas y consultas SQL remotas. RLS es la autoridad de acceso. */
export function createSupabaseRepository(client) {
  const unwrap = ({ data, error }) => {
    if (error) throw error;
    return data;
  };
  const profile = async (id) =>
    unwrap(await client.from('hd_profiles').select('*').eq('id', id).single());
  // Evita truncar datos silenciosamente por el límite predeterminado de PostgREST.
  const readAll = async (table, order = 'id') => {
    const rows = [];
    const size = 500;
    for (let offset = 0; ; offset += size) {
      const page = unwrap(
        await client
          .from(table)
          .select('*')
          .order(order)
          .range(offset, offset + size - 1),
      );
      rows.push(...page);
      if (page.length < size) return rows;
    }
  };
  return {
    mode: 'supabase',
    async getSession() {
      const { session } = unwrap(await client.auth.getSession());
      return session ? profile(session.user.id) : null;
    },
    subscribe(callback) {
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange(() => {
        queueMicrotask(callback);
      });
      return () => subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { user } = unwrap(await client.auth.signInWithPassword({ email, password }));
      return profile(user.id);
    },
    async signUp(name, email, password) {
      return unwrap(
        await client.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: `${window.location.origin}/login` },
        }),
      );
    },
    async signOut() {
      unwrap(await client.auth.signOut());
    },
    async resetPassword(email) {
      unwrap(
        await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      );
    },
    async updatePassword(password) {
      unwrap(await client.auth.updateUser({ password }));
    },
    async load() {
      const [profiles, categories, tickets, comments, activities] = await Promise.all([
        readAll('hd_profiles'),
        readAll('hd_categories'),
        readAll('hd_tickets', 'number'),
        readAll('hd_comments'),
        readAll('hd_activities'),
      ]);
      return {
        profiles,
        categories,
        tickets: tickets.sort((a, b) => b.created_at.localeCompare(a.created_at)),
        comments,
        activities,
      };
    },
    async createTicket(input, user) {
      return unwrap(
        await client
          .from('hd_tickets')
          .insert({ ...input, requester_id: user.id })
          .select()
          .single(),
      );
    },
    async updateTicket(ticket, patch) {
      const data = unwrap(
        await client
          .from('hd_tickets')
          .update(patch)
          .eq('id', ticket.id)
          .eq('updated_at', ticket.updated_at)
          .select(),
      );
      if (!data.length)
        throw new Error(
          'El ticket cambió o no tienes acceso. Actualiza los datos antes de guardar.',
        );
    },
    async addComment(ticketId, body, user) {
      unwrap(
        await client.from('hd_comments').insert({ ticket_id: ticketId, body, author_id: user.id }),
      );
    },
    async saveCategory(input) {
      if (input.id) {
        const { id, ...patch } = input;
        unwrap(await client.from('hd_categories').update(patch).eq('id', id));
      } else unwrap(await client.from('hd_categories').insert(input));
    },
    async setRole(id, role) {
      unwrap(await client.rpc('hd_set_role', { target_id: id, new_role: role }));
    },
    async updateProfile(user, name) {
      return unwrap(
        await client.from('hd_profiles').update({ name }).eq('id', user.id).select().single(),
      );
    },
  };
}
