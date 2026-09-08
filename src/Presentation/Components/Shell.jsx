import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ROLES, isStaff } from '../../Domain/tickets.js';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { initials } from '../format.js';
import { Icon } from './Icon.jsx';
import { Loading } from './UI.jsx';
const links = [
  ['/dashboard', 'dashboard', 'Resumen'],
  ['/tickets', 'ticket', 'Tickets'],
  ['/users', 'users', 'Equipo'],
  ['/categories', 'folder', 'Categorías'],
  ['/reports', 'chart', 'Reportes'],
];
export function Shell() {
  const { user, data, repository, signOut, loading, error, reload } = useHelpdesk();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const visible = links.filter(([url]) => isStaff(user) || !['/users', '/reports'].includes(url));
  const openCount = data.tickets.filter((t) => t.status === 'open').length;
  const section =
    [...links, ['/settings', '', 'Configuración']].find(([url]) =>
      location.pathname.startsWith(url),
    )?.[2] || 'Mi espacio';
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      {mobileOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside id="main-navigation" className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <NavLink to="/dashboard" className="brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-symbol">
            <Icon name="headset" size={25} />
          </span>
          <span>
            helpdesk<span className="brand-period">.</span>
            <small>WORKSPACE</small>
          </span>
        </NavLink>
        <p className="nav-label">ESPACIO DE TRABAJO</p>
        <nav aria-label="Navegación principal">
          {visible.map(([url, icon, label]) => (
            <NavLink
              key={url}
              to={url}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {url === '/tickets' && openCount > 0 && (
                <span className="nav-count">{openCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card">
            <Icon name="shield" />
            <strong>Todo bajo control</strong>
            <p>Cada solicitud, en su lugar.</p>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon name="settings" />
            Configuración
          </NavLink>
          <button className="nav-item logout" onClick={signOut}>
            <Icon name="logout" />
            Cerrar sesión
          </button>
          <div className="sidebar-user">
            <span className="avatar">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{ROLES[user.role]}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
              aria-controls="main-navigation"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <span className="crumb-divider">/</span>
            <strong>{section}</strong>
          </div>
          <div className="topbar-right">
            <span className="today">
              {new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date())}
            </span>
            <button
              className="icon-button"
              aria-label="Actualizar datos"
              title="Actualizar datos"
              disabled={loading}
              onClick={reload}
            >
              <Icon name="refresh" />
            </button>
            <NavLink to="/settings" className="avatar" aria-label="Mi perfil">
              {initials(user.name)}
            </NavLink>
          </div>
        </header>
        {repository.mode === 'demo' && (
          <div className="demo-banner">
            <span>
              <strong>Demo interactiva</strong> · Datos ficticios guardados en este navegador.
            </span>
            <NavLink to="/settings">
              Gestionar demo <Icon name="arrow" size={15} />
            </NavLink>
          </div>
        )}
        <main id="main-content" className="main-content">
          {error ? (
            <div className="error-panel" role="alert">
              <h2>No pudimos cargar los datos</h2>
              <p>{error}</p>
              <button className="button secondary" onClick={reload}>
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <Loading />
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="app-footer">
          <span>Helpdesk System</span>
          <span>Soporte TI, conectado.</span>
        </footer>
      </div>
    </div>
  );
}
