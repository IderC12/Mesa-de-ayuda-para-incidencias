import { useState } from 'react';
import { PRIORITIES, STATUSES, summarizeTickets, ticketCode } from '../../Domain/tickets.js';
import { toCsv } from '../../Domain/csv.js';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { shortDate } from '../format.js';
import { Icon } from '../Components/Icon.jsx';
import { PageHeader } from '../Components/UI.jsx';
export default function ReportsPage() {
  const { data } = useHelpdesk();
  const [period, setPeriod] = useState('30');
  const now = new Date();
  const tickets = data.tickets.filter(
    (ticket) =>
      !period || Date.parse(ticket.created_at) >= now.getTime() - Number(period) * 86400000,
  );
  const summary = summarizeTickets(tickets);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - 6 + index);
    date.setHours(0, 0, 0, 0);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    return {
      date,
      count: tickets.filter(
        (t) =>
          Date.parse(t.created_at) >= date.getTime() && Date.parse(t.created_at) < next.getTime(),
      ).length,
    };
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  const exportCsv = () => {
    const rows = [
      [
        'Código',
        'Asunto',
        'Estado',
        'Prioridad',
        'Categoría',
        'Solicitante',
        'Responsable',
        'Creado (UTC)',
        'Resuelto (UTC)',
      ],
      ...tickets.map((t) => [
        ticketCode(t),
        t.title,
        STATUSES[t.status].label,
        PRIORITIES[t.priority].label,
        data.categories.find((c) => c.id === t.category_id)?.name,
        t.requester_name,
        data.profiles.find((p) => p.id === t.assignee_id)?.name || 'Sin asignar',
        t.created_at,
        t.resolved_at,
      ]),
    ];
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `helpdesk-tickets-${now.toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <PageHeader
        eyebrow="DATOS PARA DECIDIR"
        title="Reportes"
        description="Métricas calculadas con los tickets que puedes consultar."
      >
        <select
          aria-label="Periodo del reporte"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="">Todo el historial</option>
        </select>
        <button className="button primary" onClick={exportCsv}>
          <Icon name="download" size={18} />
          Exportar CSV
        </button>
      </PageHeader>
      <p className="report-context">
        Periodo según la fecha de creación. Estados actuales de esos tickets.
      </p>
      <section className="stats-grid report-stats">
        {[
          ['Tickets recibidos', summary.total],
          ['Resueltos o cerrados', summary.resolutionRate + '%'],
          [
            'Tiempo medio hasta resolver',
            summary.averageHours === null ? '—' : summary.averageHours.toFixed(1) + ' h',
          ],
          ['Pendientes', summary.open + summary.in_progress],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <p>{label}</p>
            <strong className="stat-value">{value}</strong>
          </div>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel padded">
          <h2>Solicitudes en los últimos 7 días</h2>
          <p className="muted">Tickets creados por día dentro del periodo seleccionado.</p>
          <div className="bar-chart">
            {days.map(({ date, count }) => (
              <div className="bar-column" key={date.toISOString()}>
                <span className="bar-value">{count}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${(count / max) * 100}%` }} />
                </div>
                <span className="bar-label">{shortDate(date)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel padded">
          <h2>Por categoría</h2>
          <div className="category-report">
            {data.categories.map((category) => {
              const count = tickets.filter((t) => t.category_id === category.id).length;
              return (
                <div key={category.id}>
                  <div className="report-row">
                    <span>{category.name}</span>
                    <strong>{count}</strong>
                  </div>
                  <progress
                    value={count}
                    max={Math.max(1, tickets.length)}
                    aria-label={`${category.name}: ${count} tickets`}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <section className="panel padded report-explanation">
        <Icon name="clock" />
        <p>
          El tiempo medio se calcula desde la creación hasta la resolución registrada. Incluye horas
          no laborables; al reabrir un ticket, se excluye hasta volver a resolverlo.
        </p>
      </section>
    </>
  );
}
