import { useState } from 'react';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { Icon } from '../Components/Icon.jsx';
import { Badge, EmptyState, Field, Modal, PageHeader } from '../Components/UI.jsx';
export default function CategoriesPage() {
  const { data, user, service, execute, saving } = useHelpdesk();
  const [editing, setEditing] = useState(null);
  const admin = user.role === 'admin';
  const save = async (event) => {
    event.preventDefault();
    const input = { ...editing, ...Object.fromEntries(new FormData(event.currentTarget)) };
    const result = await execute(() => service.saveCategory(input, user), 'Categoría guardada');
    if (result.ok) setEditing(null);
  };
  return (
    <>
      <PageHeader
        eyebrow="ORGANIZACIÓN"
        title="Categorías"
        description="Un lugar para cada tipo de solicitud."
      >
        {admin && (
          <button
            className="button primary"
            onClick={() => setEditing({ name: '', description: '', active: true })}
          >
            <Icon name="plus" size={18} />
            Nueva categoría
          </button>
        )}
      </PageHeader>
      <div className="category-grid">
        {data.categories.map((category) => (
          <article className="panel category-card" key={category.id}>
            <div className="category-top">
              <span className="stat-icon blue">
                <Icon name="folder" size={24} />
              </span>
              <Badge tone={category.active ? 'green' : 'gray'}>
                {category.active ? 'Activa' : 'Archivada'}
              </Badge>
            </div>
            <h2>{category.name}</h2>
            <p className="muted">{category.description || 'Sin descripción'}</p>
            <div className="category-bottom">
              <span>
                {data.tickets.filter((t) => t.category_id === category.id).length} tickets
              </span>
              {admin && (
                <button className="text-button" onClick={() => setEditing(category)}>
                  Editar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!data.categories.length && (
        <EmptyState
          title="Aún no hay categorías"
          description={
            admin
              ? 'Crea la primera categoría para recibir tickets.'
              : 'Un administrador puede crear categorías.'
          }
        />
      )}
      {editing && (
        <Modal
          title={editing.id ? 'Editar categoría' : 'Nueva categoría'}
          onClose={() => setEditing(null)}
          busy={saving}
        >
          <form className="form-stack" onSubmit={save}>
            <Field id="category-name" label="Nombre">
              <input
                id="category-name"
                name="name"
                required
                minLength={2}
                maxLength={60}
                defaultValue={editing.name}
              />
            </Field>
            <Field id="category-description" label="Descripción">
              <textarea
                id="category-description"
                name="description"
                rows={3}
                maxLength={200}
                defaultValue={editing.description}
              />
            </Field>
            {editing.id && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                Disponible para nuevos tickets
              </label>
            )}
            <p className="muted">Archivar una categoría conserva el historial de sus tickets.</p>
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
                {saving ? 'Guardando…' : 'Guardar categoría'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
