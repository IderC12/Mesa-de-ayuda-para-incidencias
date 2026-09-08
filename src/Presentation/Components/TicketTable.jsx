import { Link } from 'react-router-dom';
import { PRIORITIES, STATUSES, ticketCode } from '../../Domain/tickets.js';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { initials, shortDate } from '../format.js';
import { Badge, EmptyState } from './UI.jsx';
export function TicketTable({ tickets, compact = false }) {
  const { data } = useHelpdesk();
  if (!tickets.length)
    return (
      <EmptyState
        title="No hay tickets por aquí"
        description="Las solicitudes que coincidan con esta vista aparecerán aquí."
      />
    );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">Tickets de soporte</caption>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Estado</th>
            <th scope="col">Prioridad</th>
            {!compact && <th scope="col">Responsable</th>}
            <th scope="col">Creado</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const agent = data.profiles.find((p) => p.id === ticket.assignee_id);
            return (
              <tr key={ticket.id}>
                <td>
                  <Link className="ticket-title" to={`/tickets/${ticket.id}`}>
                    <span className="ticket-code">{ticketCode(ticket)}</span>
                    <strong>{ticket.title}</strong>
                  </Link>
                  <span className="table-meta">
                    {data.categories.find((c) => c.id === ticket.category_id)?.name ??
                      'Sin categoría'}
                  </span>
                </td>
                <td>
                  <Badge tone={STATUSES[ticket.status].tone}>{STATUSES[ticket.status].label}</Badge>
                </td>
                <td>
                  <Badge tone={PRIORITIES[ticket.priority].tone}>
                    {PRIORITIES[ticket.priority].label}
                  </Badge>
                </td>
                {!compact && (
                  <td>
                    {agent ? (
                      <span className="person-inline">
                        <span className="avatar small">{initials(agent.name)}</span>
                        {agent.name}
                      </span>
                    ) : (
                      <span className="muted">Sin asignar</span>
                    )}
                  </td>
                )}
                <td className="date-cell">{shortDate(ticket.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
