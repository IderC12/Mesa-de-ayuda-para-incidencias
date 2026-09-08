import { Link, useSearchParams } from 'react-router-dom';
import { filterTickets, PRIORITIES, STATUSES } from '../../Domain/tickets.js';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { TicketTable } from '../Components/TicketTable.jsx';
import { Icon } from '../Components/Icon.jsx';
import { PageHeader } from '../Components/UI.jsx';
export default function TicketsPage() {
  const { data, user } = useHelpdesk();
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(params);
  const filtered = filterTickets(data.tickets, filters);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(params.get('page'), 10) || 1));
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  return (
    <>
      <PageHeader
        eyebrow="CENTRO DE SOPORTE"
        title="Tickets"
        description="Organiza, prioriza y sigue cada solicitud."
      >
        <Link className="button primary" to="/tickets/new">
          <Icon name="plus" size={18} />
          Nuevo ticket
        </Link>
      </PageHeader>
      <section className="panel">
        <div className="tickets-tabs">
          <button
            className={!filters.assignee ? 'selected' : ''}
            onClick={() => change('assignee', '')}
          >
            Todos los tickets <span>{data.tickets.length}</span>
          </button>
          {user.role !== 'requester' && (
            <button
              className={filters.assignee ? 'selected' : ''}
              onClick={() => change('assignee', user.id)}
            >
              Asignados a mí
            </button>
          )}
        </div>
        <div className="filters">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Buscar tickets"
              placeholder="Buscar por código, asunto o descripción…"
              value={filters.search || ''}
              onChange={(e) => change('search', e.target.value)}
            />
          </div>
          <select
            aria-label="Filtrar por estado"
            value={filters.status || ''}
            onChange={(e) => change('status', e.target.value)}
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUSES).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por prioridad"
            value={filters.priority || ''}
            onChange={(e) => change('priority', e.target.value)}
          >
            <option value="">Todas las prioridades</option>
            {Object.entries(PRIORITIES).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por categoría"
            value={filters.category || ''}
            onChange={(e) => change('category', e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {params.size > 0 && (
          <div className="filter-summary">
            <span>{filtered.length} resultados</span>
            <button className="text-button" onClick={() => setParams({})}>
              Limpiar filtros
            </button>
          </div>
        )}
        <TicketTable tickets={filtered.slice((page - 1) * 8, page * 8)} />
        <div className="pagination">
          <span>
            {filtered.length
              ? `${(page - 1) * 8 + 1}–${Math.min(page * 8, filtered.length)} de ${filtered.length} tickets`
              : '0 tickets'}
          </span>
          <div>
            <button
              className="button secondary small-button"
              disabled={page <= 1}
              onClick={() => change('page', String(page - 1))}
            >
              Anterior
            </button>
            <span aria-live="polite">
              {page} / {pageCount}
            </span>
            <button
              className="button secondary small-button"
              disabled={page >= pageCount}
              onClick={() => change('page', String(page + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
