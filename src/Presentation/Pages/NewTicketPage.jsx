import { Link, useNavigate } from 'react-router-dom';
import { PRIORITIES } from '../../Domain/tickets.js';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { Field, PageHeader } from '../Components/UI.jsx';
import { Icon } from '../Components/Icon.jsx';
export default function NewTicketPage() {
  const { service, data, user, saving, execute } = useHelpdesk();
  const navigate = useNavigate();
  const categories = data.categories.filter((c) => c.active);
  const submit = async (event) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    const result = await execute(
      () => service.createTicket(input, user, data.categories),
      'Ticket creado. Ya puedes seguir su avance.',
    );
    if (result.ok) navigate(`/tickets/${result.value.id}`);
  };
  return (
    <>
      <Link to="/tickets" className="back-link">
        ← Volver a tickets
      </Link>
      <PageHeader
        eyebrow="NUEVA SOLICITUD"
        title="¿En qué podemos ayudarte?"
        description="Cuéntanos el problema para que soporte pueda revisarlo."
      />
      <div className="form-layout">
        <form className="panel padded form-stack" onSubmit={submit}>
          <Field id="title" label="Asunto">
            <input
              id="title"
              name="title"
              placeholder="Ej. No puedo conectarme al Wi-Fi"
              required
              minLength={5}
              maxLength={120}
            />
          </Field>
          <div className="form-row">
            <Field id="category_id" label="Categoría">
              <select id="category_id" name="category_id" required defaultValue="">
                <option value="" disabled>
                  Selecciona una categoría
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="priority" label="Prioridad">
              <select id="priority" name="priority" defaultValue="medium">
                {Object.entries(PRIORITIES).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            id="description"
            label="Descripción del problema"
            hint="Incluye el equipo o aplicación, lo que ocurrió y los pasos que ya intentaste."
          >
            <textarea
              id="description"
              aria-describedby="description-hint"
              name="description"
              rows={8}
              placeholder="Describe aquí tu incidencia…"
              required
              minLength={15}
              maxLength={5000}
            />
          </Field>
          {!categories.length && (
            <p role="alert" className="inline-message error">
              No hay categorías activas. Un administrador debe crear una antes de enviar tickets.
            </p>
          )}
          <div className="form-actions">
            <Link to="/tickets" className="button secondary">
              Cancelar
            </Link>
            <button className="button primary" disabled={saving || !categories.length}>
              {saving ? 'Creando…' : 'Crear ticket'}
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </form>
        <aside className="form-advice">
          <span className="stat-icon blue">
            <Icon name="message" size={24} />
          </span>
          <h2>Una solicitud fácil de atender</h2>
          <p>Usa un asunto concreto y describe qué resultado esperabas.</p>
          <ul>
            <li>Indica desde cuándo sucede.</li>
            <li>Menciona si afecta a otras personas.</li>
            <li>Evita incluir contraseñas o información privada.</li>
          </ul>
          <p>Podrás añadir más detalles en los comentarios de tu ticket.</p>
        </aside>
      </div>
    </>
  );
}
