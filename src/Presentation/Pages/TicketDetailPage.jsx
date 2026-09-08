import { Link, useParams } from 'react-router-dom';
import { isStaff, PRIORITIES, STATUSES, ticketCode, TRANSITIONS } from '../../Domain/tickets.js';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { dateTime, initials } from '../format.js';
import { Badge, EmptyState, Field, PageHeader } from '../Components/UI.jsx';
export default function TicketDetailPage() {
  const { id } = useParams();
  const { data, user, service, saving, execute } = useHelpdesk();
  const ticket = data.tickets.find((t) => t.id === id);
  if (!ticket)
    return (
      <EmptyState
        title="Ticket no disponible"
        description="No existe o no tienes permiso para consultarlo."
        action={
          <Link className="button primary" to="/tickets">
            Volver a tickets
          </Link>
        }
      />
    );
  const comments = data.comments
    .filter((c) => c.ticket_id === id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const activities = data.activities
    .filter((a) => a.ticket_id === id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const submitComment = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form).get('body');
    const result = await execute(
      () => service.addComment(ticket, body, user),
      'Comentario enviado',
    );
    if (result.ok && form.isConnected) form.reset();
  };
  const update = async (event) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    input.assignee_id ||= null;
    await execute(() => service.updateTicket(ticket, input, user, data.profiles));
  };
  return (
    <>
      <Link className="back-link" to="/tickets">
        ← Volver a tickets
      </Link>
      <PageHeader
        eyebrow={ticketCode(ticket)}
        title={ticket.title}
        description={`Creado el ${dateTime(ticket.created_at)}`}
      >
        <Badge tone={STATUSES[ticket.status].tone}>{STATUSES[ticket.status].label}</Badge>
      </PageHeader>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel padded">
            <h2>Descripción</h2>
            <p className="prose pre-wrap">{ticket.description}</p>
            <div className="ticket-author">
              <span className="avatar small">{initials(ticket.requester_name)}</span>
              <span>
                Solicitado por <strong>{ticket.requester_name}</strong>
              </span>
            </div>
          </section>
          <section className="panel padded">
            <h2>
              Conversación <span className="count-label">{comments.length}</span>
            </h2>
            <div className="comments">
              {comments.length ? (
                comments.map((comment) => (
                  <article className="comment" key={comment.id}>
                    <span className="avatar small">{initials(comment.author_name)}</span>
                    <div>
                      <div className="comment-meta">
                        <strong>{comment.author_name}</strong>
                        <time dateTime={comment.created_at}>{dateTime(comment.created_at)}</time>
                      </div>
                      <p className="pre-wrap">{comment.body}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted">
                  Aún no hay comentarios. Añade información para ayudar a resolver la solicitud.
                </p>
              )}
            </div>
            {ticket.status !== 'closed' ? (
              <form className="form-stack comment-form" onSubmit={submitComment}>
                <Field id="body" label="Añadir comentario">
                  <textarea
                    id="body"
                    name="body"
                    rows={3}
                    required
                    maxLength={2000}
                    placeholder="Escribe una actualización o describe la solución…"
                  />
                </Field>
                <div className="form-actions">
                  <button className="button primary" disabled={saving}>
                    {saving ? 'Enviando…' : 'Enviar comentario'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="inline-message">
                Este ticket está cerrado. Soporte puede reabrirlo si necesitas continuar.
              </p>
            )}
          </section>
        </div>
        <aside className="detail-aside">
          <section className="panel padded">
            <h2>Detalles del ticket</h2>
            {isStaff(user) ? (
              <form key={ticket.updated_at} className="form-stack" onSubmit={update}>
                <Field id="status" label="Estado">
                  <select id="status" name="status" defaultValue={ticket.status}>
                    {[ticket.status, ...TRANSITIONS[ticket.status]].map((status) => (
                      <option key={status} value={status}>
                        {STATUSES[status].label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="assignee_id" label="Responsable">
                  <select
                    id="assignee_id"
                    name="assignee_id"
                    defaultValue={ticket.assignee_id || ''}
                  >
                    <option value="">Sin asignar</option>
                    {data.profiles.filter(isStaff).map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="priority" label="Prioridad">
                  <select id="priority" name="priority" defaultValue={ticket.priority}>
                    {Object.entries(PRIORITIES).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <button className="button primary full" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </form>
            ) : (
              <dl className="detail-list">
                <div>
                  <dt>Prioridad</dt>
                  <dd>
                    <Badge tone={PRIORITIES[ticket.priority].tone}>
                      {PRIORITIES[ticket.priority].label}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt>Atención</dt>
                  <dd>{ticket.assignee_id ? 'Asignado a soporte' : 'Pendiente de asignación'}</dd>
                </div>
              </dl>
            )}
            <dl className="detail-list">
              <div>
                <dt>Categoría</dt>
                <dd>{data.categories.find((c) => c.id === ticket.category_id)?.name}</dd>
              </div>
              <div>
                <dt>Última actualización</dt>
                <dd>{dateTime(ticket.updated_at)}</dd>
              </div>
              {ticket.resolved_at && (
                <div>
                  <dt>Resuelto el</dt>
                  <dd>{dateTime(ticket.resolved_at)}</dd>
                </div>
              )}
            </dl>
          </section>
          <section className="panel padded">
            <h2>Actividad</h2>
            <ol className="activity-list">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <strong>{activity.actor_name}</strong>
                  <p>
                    {Object.entries(STATUSES).reduce(
                      (text, [key, meta]) =>
                        text.replace(`a ${key}`, `a ${meta.label.toLowerCase()}`),
                      activity.detail,
                    )}
                  </p>
                  <time dateTime={activity.created_at}>{dateTime(activity.created_at)}</time>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
