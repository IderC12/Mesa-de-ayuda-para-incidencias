import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canReadTicket,
  filterTickets,
  summarizeTickets,
  validateComment,
  validateTicket,
  validateTransition,
} from '../src/Domain/tickets.js';
import { csvCell } from '../src/Domain/csv.js';
import { createHelpdeskService } from '../src/Application/helpdeskService.js';
import { createDemoRepository } from '../src/Infrastructure/Repositories/demoRepository.js';
function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
test('rechaza tickets vacíos y limpia espacios sin alterar el texto', () => {
  assert.throws(() => validateTicket({}), /asunto/);
  assert.throws(
    () =>
      validateTicket({
        title: 'Problema de red',
        description: 'Breve',
        priority: 'medium',
        category_id: 'x',
      }),
    /Describe/,
  );
  assert.deepEqual(
    validateTicket({
      title: '  Problema de red  ',
      description: '  No funciona la red desde ayer.  ',
      priority: 'high',
      category_id: 'red',
    }),
    {
      title: 'Problema de red',
      description: 'No funciona la red desde ayer.',
      priority: 'high',
      category_id: 'red',
    },
  );
});
test('bloquea saltos de estado y comentarios vacíos', () => {
  assert.throws(() => validateTransition('open', 'closed'));
  assert.throws(() => validateTransition('closed', 'resolved'));
  assert.doesNotThrow(() => validateTransition('resolved', 'closed'));
  assert.doesNotThrow(() => validateTransition('closed', 'open'));
  assert.throws(() => validateComment('  '));
  assert.throws(() => validateComment('x'.repeat(2001)));
});
test('un solicitante no puede leer el ticket de otra persona', () => {
  assert.equal(canReadTicket({ id: '1', role: 'requester' }, { requester_id: '2' }), false);
  assert.equal(canReadTicket({ id: '1', role: 'agent' }, { requester_id: '2' }), true);
  assert.equal(canReadTicket(null, { requester_id: '1' }), false);
});
test('los indicadores manejan conjuntos vacíos y duraciones conocidas', () => {
  assert.equal(summarizeTickets([]).averageHours, null);
  assert.equal(summarizeTickets([]).resolutionRate, 0);
  const summary = summarizeTickets([
    { status: 'resolved', created_at: '2026-01-01T10:00:00Z', resolved_at: '2026-01-01T12:00:00Z' },
    { status: 'open' },
  ]);
  assert.equal(summary.resolutionRate, 50);
  assert.equal(summary.averageHours, 2);
  assert.equal(summary.open, 1);
});
test('combina filtros y busca sin distinguir mayúsculas', () => {
  const tickets = [
    {
      number: 1001,
      title: 'RED DE OFICINA',
      description: 'Sin internet',
      status: 'open',
      priority: 'high',
    },
    {
      number: 1002,
      title: 'Red de oficina',
      description: 'Ya funciona',
      status: 'closed',
      priority: 'low',
    },
  ];
  assert.equal(
    filterTickets(tickets, { search: 'red', status: 'open', priority: 'high' }).length,
    1,
  );
  assert.equal(filterTickets(tickets, { search: 'HD-1002' })[0].status, 'closed');
});
test('CSV escapa comillas y neutraliza fórmulas con espacios iniciales', () => {
  assert.equal(csvCell('Hola "equipo"'), '"Hola ""equipo"""');
  assert.equal(csvCell(' =SUM(A1:A2)'), '"\' =SUM(A1:A2)"');
  assert.equal(csvCell('@comando'), '"\'@comando"');
});
test('flujo demo: crear, persistir, asignar, comentar, resolver y reabrir', async () => {
  const memory = storage();
  const repo = createDemoRepository(memory);
  const service = createHelpdeskService(repo);
  const requester = await repo.signInDemo('requester');
  const workspace = await repo.load(requester);
  assert.ok(workspace.tickets.every((ticket) => ticket.requester_id === requester.id));
  const ticket = await service.createTicket(
    {
      title: 'Mi equipo no enciende',
      description: 'Al pulsar el botón de encendido no ocurre nada.',
      priority: 'high',
      category_id: workspace.categories[0].id,
    },
    requester,
    workspace.categories,
  );
  const reopened = createDemoRepository(memory);
  assert.equal((await reopened.getSession()).id, requester.id);
  assert.ok((await reopened.load(requester)).tickets.some((t) => t.id === ticket.id));
  await assert.rejects(
    () => service.updateTicket(ticket, { status: 'resolved' }, requester, []),
    /Solo soporte/,
  );
  await service.addComment(ticket, 'Probé en otra toma de corriente y no enciende.', requester);
  const admin = await repo.signInDemo('admin');
  const all = await repo.load(admin);
  await service.updateTicket(
    ticket,
    { status: 'in_progress', assignee_id: admin.id },
    admin,
    all.profiles,
  );
  const current = (await repo.load(admin)).tickets.find((t) => t.id === ticket.id);
  await service.updateTicket(current, { status: 'resolved' }, admin, all.profiles);
  const resolved = (await repo.load(admin)).tickets.find((t) => t.id === ticket.id);
  assert.ok(resolved.resolved_at);
  await service.updateTicket(resolved, { status: 'in_progress' }, admin, all.profiles);
  const final = (await repo.load(admin)).tickets.find((t) => t.id === ticket.id);
  assert.equal(final.resolved_at, null);
  assert.equal(
    (await repo.load(admin)).comments.filter((c) => c.ticket_id === ticket.id).length,
    1,
  );
});
test('protege categorías, roles y escrituras con una versión desactualizada', async () => {
  const repo = createDemoRepository(storage());
  const service = createHelpdeskService(repo);
  const user = await repo.signInDemo('requester');
  await assert.rejects(
    () => service.saveCategory({ name: 'Nueva', description: '' }, user),
    /administrador/,
  );
  const admin = await repo.signInDemo('admin');
  const data = await repo.load(admin);
  await assert.rejects(() => service.setRole(admin.id, 'requester', admin), /propio rol/);
  await assert.rejects(
    () =>
      service.updateTicket(
        { ...data.tickets[0], updated_at: 'stale' },
        { priority: 'low' },
        admin,
        data.profiles,
      ),
    /cambió/,
  );
  await service.saveCategory({ ...data.categories[0], active: false }, admin);
  const categories = (await repo.load(admin)).categories;
  await assert.rejects(
    () =>
      service.createTicket(
        {
          title: 'Nuevo ticket de prueba',
          description: 'Esta categoría se encuentra archivada.',
          priority: 'low',
          category_id: categories[0].id,
        },
        admin,
        categories,
      ),
    /no está disponible/,
  );
  await repo.reset();
  assert.equal(await repo.getSession(), null);
});
