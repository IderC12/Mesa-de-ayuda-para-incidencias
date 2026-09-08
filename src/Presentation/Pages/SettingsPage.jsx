import { useState } from 'react';
import { ROLES } from '../../Domain/tickets.js';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { initials } from '../format.js';
import { Field, Modal, PageHeader } from '../Components/UI.jsx';
export default function SettingsPage() {
  const { user, setUser, repository, service, execute, saving, signOut } = useHelpdesk();
  const [resetOpen, setResetOpen] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get('name');
    const result = await execute(() => service.updateProfile(user, name));
    if (result.ok) setUser(result.value);
  };
  const reset = async () => {
    const result = await execute(() => repository.reset(), 'Demo restablecida');
    if (result.ok) {
      setResetOpen(false);
      await signOut();
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="TU ESPACIO"
        title="Configuración"
        description="Administra tu perfil y tus preferencias de acceso."
      />
      <div className="settings-layout">
        <section className="panel padded">
          <h2>Mi perfil</h2>
          <div className="profile-header">
            <span className="avatar large">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <p className="muted">{ROLES[user.role]}</p>
            </div>
          </div>
          <form className="form-stack" onSubmit={submit}>
            <Field id="profile-name" label="Nombre completo">
              <input
                id="profile-name"
                name="name"
                defaultValue={user.name}
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
            </Field>
            <Field id="profile-email" label="Correo electrónico">
              <input id="profile-email" type="email" readOnly value={user.email} />
            </Field>
            <div className="form-actions">
              <button className="button primary" disabled={saving}>
                Guardar perfil
              </button>
            </div>
          </form>
        </section>
        <div>
          <section className="panel padded">
            <h2>Sesión</h2>
            <p className="muted">Si utilizas un equipo compartido, cierra la sesión al terminar.</p>
            <button className="button secondary" onClick={signOut}>
              Cerrar sesión
            </button>
          </section>
          {repository.mode === 'demo' && (
            <section className="panel padded demo-settings">
              <h2>Datos de demostración</h2>
              <p className="muted">
                Los cambios se guardan en este navegador. Puedes volver a los ejemplos iniciales o
                cerrar sesión para probar otro perfil.
              </p>
              <button className="button danger-outline" onClick={() => setResetOpen(true)}>
                Restablecer demo
              </button>
            </section>
          )}
        </div>
      </div>
      {resetOpen && (
        <Modal title="¿Restablecer la demo?" onClose={() => setResetOpen(false)} busy={saving}>
          <p>
            Se eliminarán los tickets, comentarios y cambios de perfiles creados en esta demo.
            Volverás a la pantalla de acceso.
          </p>
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={saving}
              onClick={() => setResetOpen(false)}
            >
              Cancelar
            </button>
            <button className="button danger" disabled={saving} onClick={reset}>
              Restablecer
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
