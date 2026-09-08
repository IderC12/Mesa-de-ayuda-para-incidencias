import { Link } from 'react-router-dom';
import { STATUSES, summarizeTickets } from '../../Domain/tickets.js';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { Icon } from '../Components/Icon.jsx';
import { PageHeader } from '../Components/UI.jsx';
import { TicketTable } from '../Components/TicketTable.jsx';
export default function DashboardPage() {
  const { user, data } = useHelpdesk();
  const summary = summarizeTickets(data.tickets);
  const cards = [
    ['open', 'Tickets abiertos', 'Por atender', 'ticket', 'blue'],
    ['in_progress', 'En proceso', 'En manos del equipo', 'clock', 'amber'],
    ['resolved', 'Resueltos', 'Solución registrada', 'check', 'green'],
    ['closed', 'Cerrados', 'Seguimiento finalizado', 'folder', 'violet'],
  ];
  return (
    <>
      <PageHeader
        eyebrow="VISTA GENERAL"
        title={`Hola, ${user.name.split(' ')[0]}`}
        description="Esto es lo que está pasando con tus solicitudes."
      >
        <Link className="button primary" to="/tickets/new">
          <Icon name="plus" size={18} />
          Nuevo ticket
        </Link>
      </PageHeader>
      <section className="stats-grid" aria-label="Resumen de tickets">
        {cards.map(([status, label, caption, icon, tone]) => (
          <Link key={status} to={`/tickets?status=${status}`} className="stat-card">
            <div className="stat-top">
              <span>{label}</span>
              <span className={`stat-icon ${tone}`}>
                <Icon name={icon} />
              </span>
            </div>
            <strong className="stat-value">{summary[status]}</strong>
            <span className="stat-caption">
              {caption}
              <Icon name="arrow" size={16} />
            </span>
          </Link>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Tickets recientes</h2>
              <p className="muted">Las últimas solicitudes de tu espacio</p>
            </div>
            <Link className="text-link" to="/tickets">
              Ver todos <Icon name="arrow" size={16} />
            </Link>
          </div>
          <TicketTable tickets={data.tickets.slice(0, 5)} compact />
        </section>
        <section className="panel overview-panel">
          <div className="panel-heading">
            <div>
              <h2>Estado del servicio</h2>
              <p className="muted">Distribución de tus tickets</p>
            </div>
          </div>
          <div className="resolution-number">
            <strong>
              {summary.resolutionRate}
              <span>%</span>
            </strong>
            <p>resueltos o cerrados</p>
          </div>
          <div className="status-stack" aria-hidden="true">
            {Object.entries(STATUSES).map(([status, meta]) => (
              <span key={status} className={meta.tone} style={{ flex: summary[status] }} />
            ))}
          </div>
          <div className="status-legend">
            {Object.entries(STATUSES).map(([status, meta]) => (
              <div key={status}>
                <span>
                  <i className={`legend-dot ${meta.tone}`} />
                  {meta.label}
                </span>
                <strong>{summary[status]}</strong>
              </div>
            ))}
          </div>
          <div className="overview-total">
            <span>Total de tickets</span>
            <strong>{summary.total}</strong>
          </div>
        </section>
      </div>
      <section className="workspace-note">
        <img
          src="/support-workspace.webp"
          alt="Equipo de trabajo de soporte técnico"
          width="1536"
          height="1024"
          loading="lazy"
        />
        <div>
          <span className="eyebrow">CADA DETALLE AYUDA</span>
          <h2>Una descripción clara, una solución más cerca.</h2>
          <p>Al crear un ticket, indica qué ocurrió, desde cuándo y qué intentaste.</p>
        </div>
        <Link className="button secondary" to="/tickets/new">
          Crear solicitud
          <Icon name="arrow" size={16} />
        </Link>
      </section>
    </>
  );
}
