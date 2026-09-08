import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// PostgreSQL embebido: ejecuta la migración real sin conectarse a datos del usuario.
// auth.uid() simula exclusivamente el identificador que Supabase extrae de un JWT validado.
test('migración PostgreSQL: permisos, auditoría y reglas del ciclo de tickets', async (t) => {
  const db = new PGlite();
  const ids = {
    admin: '11111111-1111-4111-8111-111111111111',
    agent: '22222222-2222-4222-8222-222222222222',
    requester: '33333333-3333-4333-8333-333333333333',
    other: '44444444-4444-4444-8444-444444444444',
  };
  const asUser = async (role) => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [ids[role] || '']);
    await db.exec(`set role ${role === 'anon' ? 'anon' : 'authenticated'}`);
  };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;`);
    await db.exec(
      await readFile(new URL('../supabase/migrations/001_helpdesk.sql', import.meta.url), 'utf8'),
    );
    for (const [role, id] of Object.entries(ids))
      await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
        id,
        `${role}@example.com`,
        JSON.stringify({ name: `Perfil ${role}`, role: 'admin' }),
      ]);
    await db.query("update hd_profiles set role='admin' where id=$1", [ids.admin]);
    await db.query("update hd_profiles set role='agent' where id=$1", [ids.agent]);
    let category;
    let ticketId;
    await t.test('metadata no puede elevar roles y usuarios anónimos no leen tablas', async () => {
      const { rows } = await db.query('select role from hd_profiles where id=$1', [ids.requester]);
      assert.equal(rows[0].role, 'requester');
      await asUser('anon');
      await assert.rejects(() => db.query('select * from hd_tickets'), /permission denied/);
    });
    await t.test('solicitante crea y solo ve su propio ticket', async () => {
      await asUser('requester');
      category = (await db.query('select id from hd_categories order by name limit 1')).rows[0].id;
      ticketId = (
        await db.query(
          "insert into hd_tickets(title,description,category_id,priority,requester_id) values('Problema de acceso','No puedo acceder al sistema desde esta mañana.',$1,'high',$2) returning id",
          [category, ids.requester],
        )
      ).rows[0].id;
      assert.equal((await db.query('select * from hd_tickets')).rows.length, 1);
      assert.equal((await db.query('select * from hd_activities')).rows.length, 1);
      await asUser('other');
      assert.equal((await db.query('select * from hd_tickets')).rows.length, 0);
      await assert.rejects(
        () =>
          db.query('insert into hd_comments(ticket_id,author_id,body) values($1,$2,$3)', [
            ticketId,
            ids.other,
            'Comentario sin permiso',
          ]),
        /acceso/,
      );
    });
    await t.test('no permite autoascenso ni cambios de estado por un solicitante', async () => {
      await asUser('requester');
      await assert.rejects(
        () => db.query("update hd_profiles set role='admin' where id=$1", [ids.requester]),
        /permission denied/,
      );
      assert.equal(
        (
          await db.query("update hd_tickets set status='resolved' where id=$1 returning id", [
            ticketId,
          ])
        ).rows.length,
        0,
      );
      await assert.rejects(
        () => db.query("select hd_set_role($1,'admin')", [ids.requester]),
        /administradores/,
      );
      await db.query('insert into hd_comments(ticket_id,author_id,body) values($1,$2,$3)', [
        ticketId,
        ids.requester,
        'El problema sigue ocurriendo.',
      ]);
      assert.equal(
        (await db.query('select * from hd_comments')).rows[0].author_name,
        'Perfil requester',
      );
    });
    await t.test(
      'soporte atiende, verifica transiciones y evita asignar a solicitantes',
      async () => {
        await asUser('agent');
        await assert.rejects(
          () => db.query("update hd_tickets set status='closed' where id=$1", [ticketId]),
          /estado/,
        );
        await assert.rejects(
          () =>
            db.query('update hd_tickets set assignee_id=$1 where id=$2', [ids.requester, ticketId]),
          /soporte/,
        );
        await db.query("update hd_tickets set status='in_progress',assignee_id=$1 where id=$2", [
          ids.agent,
          ticketId,
        ]);
        const version = (
          await db.query('select updated_at::text as version from hd_tickets where id=$1', [
            ticketId,
          ])
        ).rows[0].version;
        await db.query("update hd_tickets set status='resolved' where id=$1", [ticketId]);
        assert.equal(
          (await db.query('select resolved_at from hd_tickets where id=$1', [ticketId])).rows[0]
            .resolved_at !== null,
          true,
        );
        assert.equal(
          (
            await db.query(
              "update hd_tickets set priority='low' where id=$1 and updated_at=$2 returning id",
              [ticketId, version],
            )
          ).rows.length,
          0,
        );
        await db.query("update hd_tickets set status='closed' where id=$1", [ticketId]);
        await assert.rejects(
          () =>
            db.query('insert into hd_comments(ticket_id,author_id,body) values($1,$2,$3)', [
              ticketId,
              ids.agent,
              'Comentario posterior al cierre',
            ]),
          /cerrado/,
        );
        await db.query("update hd_tickets set status='open' where id=$1", [ticketId]);
        assert.equal(
          (await db.query('select resolved_at from hd_tickets where id=$1', [ticketId])).rows[0]
            .resolved_at,
          null,
        );
        await assert.rejects(
          () => db.query("insert into hd_categories(name) values('No autorizada')"),
          /row-level security/,
        );
      },
    );
    await t.test(
      'administración archiva sin borrar historial y reasigna al quitar soporte',
      async () => {
        await asUser('admin');
        await assert.rejects(
          () => db.query("select hd_set_role($1,'requester')", [ids.admin]),
          /propio rol/,
        );
        await db.query("select hd_set_role($1,'requester')", [ids.agent]);
        assert.equal(
          (await db.query('select assignee_id from hd_tickets where id=$1', [ticketId])).rows[0]
            .assignee_id,
          null,
        );
        await db.query('update hd_categories set active=false where id=$1', [category]);
        await assert.rejects(
          () =>
            db.query(
              "insert into hd_tickets(title,description,category_id,requester_id) values('Problema nuevo','No funciona desde el día de ayer.',$1,$2)",
              [category, ids.admin],
            ),
          /categoría/,
        );
        assert.equal((await db.query('select * from hd_tickets')).rows.length, 1);
        assert.ok((await db.query('select * from hd_activities')).rows.length >= 5);
        await assert.rejects(
          () =>
            db.query(
              "insert into hd_activities(ticket_id,actor_name,detail) values($1,'Falso','Registro falso')",
              [ticketId],
            ),
          /permission denied/,
        );
      },
    );
  } finally {
    await db.close();
  }
});
