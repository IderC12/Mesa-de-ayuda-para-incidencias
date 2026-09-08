import { useState } from 'react';
import { ROLES } from '../../Domain/tickets.js';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { initials } from '../format.js';
import { Badge, Field, Modal, PageHeader } from '../Components/UI.jsx';
export default function UsersPage() {
  const { data, user, service, execute, saving } = useHelpdesk();
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const profiles = data.profiles.filter((p) =>
    `${p.name} ${p.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  const submit = async (event) => {
    event.preventDefault();
    const role = new FormData(event.currentTarget).get('role');
    const result = await execute(() => service.setRole(editing.id, role, user), 'Rol actualizado');
    if (result.ok) setEditing(null);
  };
  return (
    <>
      <PageHeader
        eyebrow="PERSONAS"
        title="Equipo y usuarios"
        description="Conoce quién solicita ayuda y quién está para resolver."
      />
      <section className="panel">
        <div className="panel-heading">
          <h2>{data.profiles.length} usuarios registrados</h2>
          <input
            className="team-search"
            aria-label="Buscar usuarios"
            placeholder="Buscar por nombre o correo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Rol</th>
                <th scope="col">Tickets asignados</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <div className="person-inline">
                      <span className="avatar">{initials(profile.name)}</span>
                      <div>
                        <strong>
                          {profile.name}
                          {profile.id === user.id ? ' (tú)' : ''}
                        </strong>
                        <span className="table-meta">{profile.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge
                      tone={
                        profile.role === 'admin'
                          ? 'violet'
                          : profile.role === 'agent'
                            ? 'blue'
                            : 'gray'
                      }
                    >
                      {ROLES[profile.role]}
                    </Badge>
                  </td>
                  <td>
                    {
                      data.tickets.filter(
                        (t) =>
                          t.assignee_id === profile.id &&
                          ['open', 'in_progress'].includes(t.status),
                      ).length
                    }{' '}
                    activos
                  </td>
                  <td>
                    {user.role === 'admin' && profile.id !== user.id ? (
                      <button className="text-button" onClick={() => setEditing(profile)}>
                        Cambiar rol
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!profiles.length && (
                <tr>
                  <td colSpan={4}>No se encontraron usuarios.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="panel-footnote">
          Los nuevos usuarios se registran como solicitantes. Un administrador puede darles acceso
          de soporte.
        </p>
      </section>
      {editing && (
        <Modal title={`Rol de ${editing.name}`} onClose={() => setEditing(null)} busy={saving}>
          <form className="form-stack" onSubmit={submit}>
            <Field id="role" label="Rol">
              <select id="role" name="role" defaultValue={editing.role}>
                {Object.entries(ROLES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <p className="muted">
              Soporte puede atender todos los tickets. Los administradores también gestionan roles y
              categorías. Al pasar a solicitante, sus tickets activos quedan sin asignar.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={saving}>
                Confirmar cambio
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
