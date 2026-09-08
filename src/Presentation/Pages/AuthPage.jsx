import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useHelpdesk } from '../Context/HelpdeskContext.js';
import { readableError } from '../format.js';
import { Icon } from '../Components/Icon.jsx';
import { Field, Loading, Modal } from '../Components/UI.jsx';
const titles = {
  login: 'Qué bueno verte de nuevo.',
  register: 'Tu soporte empieza aquí.',
  forgot: 'Recupera tu acceso.',
  reset: 'Una nueva contraseña.',
};
export default function AuthPage({ mode = 'login' }) {
  const { repository, user, setUser, authLoading, authError } = useHelpdesk();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const demo = repository.mode === 'demo';
  const task = async (action) => {
    setPending(true);
    setError('');
    setSuccess('');
    try {
      await action();
    } catch (failure) {
      setError(readableError(failure));
    } finally {
      setPending(false);
    }
  };
  if (authLoading) return <Loading />;
  if (user && mode !== 'reset') return <Navigate to="/dashboard" replace />;
  const submit = (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void task(async () => {
      if (demo) throw new Error('Utiliza uno de los perfiles de demostración.');
      if (mode === 'login') setUser(await repository.signIn(values.email.trim(), values.password));
      if (mode === 'register') {
        if (values.name.trim().length < 2)
          throw new Error('Escribe un nombre de al menos 2 caracteres.');
        if (values.password !== values.confirmPassword)
          throw new Error('Las contraseñas no coinciden.');
        const result = await repository.signUp(
          values.name.trim(),
          values.email.trim(),
          values.password,
        );
        if (result.session) setUser(await repository.getSession());
        else
          setSuccess(
            'Solicitud recibida. Revisa tu correo para confirmar la cuenta; si ya tienes una, inicia sesión.',
          );
      }
      if (mode === 'forgot') {
        await repository.resetPassword(values.email.trim());
        setSuccess('Si existe una cuenta con ese correo, recibirás un enlace de recuperación.');
      }
      if (mode === 'reset') {
        if (values.password !== values.confirmPassword)
          throw new Error('Las contraseñas no coinciden.');
        await repository.updatePassword(values.password);
        await repository.signOut();
        setUser(null);
        navigate('/login');
      }
    });
  };
  return (
    <main className="auth-layout">
      <section className="auth-form-side">
        <Link to="/login" className="brand">
          <span className="brand-symbol">
            <Icon name="headset" size={25} />
          </span>
          <span>
            helpdesk<span className="brand-period">.</span>
          </span>
        </Link>
        <div className="auth-content">
          <span className="eyebrow">TU MESA DE AYUDA TI</span>
          <h1>{titles[mode]}</h1>
          <p className="muted">
            {mode === 'login'
              ? 'Ingresa a tu espacio y continúa donde lo dejaste.'
              : mode === 'register'
                ? 'Crea una cuenta para enviar y seguir tus solicitudes.'
                : mode === 'forgot'
                  ? 'Te enviaremos un enlace para restablecer tu contraseña.'
                  : 'Elige una contraseña de al menos 8 caracteres.'}
          </p>
          {(error || authError) && (
            <div className="inline-message error" role="alert">
              {error || authError}
            </div>
          )}
          {success && (
            <div className="inline-message success" role="status">
              {success}
            </div>
          )}
          {demo ? (
            <div className="demo-access">
              <div className="demo-heading">
                <Icon name="shield" />
                <div>
                  <strong>Explora la demo</strong>
                  <p>Elige un perfil. No necesitas una cuenta.</p>
                </div>
              </div>
              {[
                ['admin', 'Administrador', 'Gestiona tickets, equipo y categorías'],
                ['agent', 'Agente de soporte', 'Atiende incidencias y registra soluciones'],
                ['requester', 'Solicitante', 'Crea solicitudes y consulta su avance'],
              ].map(([role, label, description]) => (
                <button
                  key={role}
                  disabled={pending}
                  className="demo-profile"
                  onClick={() => task(async () => setUser(await repository.signInDemo(role)))}
                >
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <Icon name="arrow" />
                </button>
              ))}
              <p className="auth-note">
                Datos de ejemplo. Los cambios se conservan solo en este navegador.
              </p>
              <button className="text-button" onClick={() => setResetOpen(true)}>
                Restablecer datos de ejemplo
              </button>
            </div>
          ) : (
            <>
              <form className="form-stack" onSubmit={submit}>
                {mode === 'register' && (
                  <Field id="name" label="Nombre completo">
                    <input
                      id="name"
                      name="name"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      placeholder="Tu nombre"
                    />
                  </Field>
                )}
                {mode !== 'reset' && (
                  <Field id="email" label="Correo electrónico">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      placeholder="nombre@empresa.com"
                    />
                  </Field>
                )}
                {mode !== 'forgot' && (
                  <Field id="password" label="Contraseña">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      minLength={mode === 'login' ? 1 : 8}
                      maxLength={128}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      placeholder="Tu contraseña"
                    />
                  </Field>
                )}
                {['register', 'reset'].includes(mode) && (
                  <Field id="confirmPassword" label="Confirmar contraseña">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  </Field>
                )}
                {mode === 'login' && (
                  <Link className="forgot-link" to="/forgot-password">
                    ¿Olvidaste tu contraseña?
                  </Link>
                )}
                <button className="button primary full" disabled={pending}>
                  {pending
                    ? 'Un momento…'
                    : {
                        login: 'Iniciar sesión',
                        register: 'Crear cuenta',
                        forgot: 'Enviar enlace',
                        reset: 'Guardar contraseña',
                      }[mode]}
                  <Icon name="arrow" size={18} />
                </button>
              </form>
              <p className="auth-note">
                {mode === 'login' ? (
                  <>
                    ¿Aún no tienes cuenta? <Link to="/register">Regístrate</Link>
                  </>
                ) : (
                  <Link to="/login">Volver a iniciar sesión</Link>
                )}
              </p>
            </>
          )}
        </div>
        <p className="auth-footer">Helpdesk System · Un espacio para resolver.</p>
      </section>
      <aside className="auth-visual">
        <img
          src="/support-workspace.webp"
          alt="Escritorio de soporte TI con monitor y auriculares"
          width="1536"
          height="1024"
        />
        <div className="auth-visual-copy">
          <span className="visual-pill">MENOS FRICCIÓN. MÁS SOLUCIONES.</span>
          <h2>
            El buen soporte
            <br />
            empieza con orden.
          </h2>
          <p>
            Conecta a tu equipo, da seguimiento a cada incidencia y mantén el trabajo en movimiento.
          </p>
          <div className="visual-bottom">
            <Icon name="ticket" />
            <span>Una solicitud. Un seguimiento claro.</span>
          </div>
        </div>
      </aside>
      {resetOpen && (
        <Modal title="Restablecer la demo" onClose={() => setResetOpen(false)} busy={pending}>
          <p>Se eliminarán los cambios locales de la demo y se restaurarán los ejemplos.</p>
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={pending}
              onClick={() => setResetOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={() =>
                task(async () => {
                  await repository.reset();
                  setResetOpen(false);
                  setSuccess('Demo restablecida. Ya puedes elegir un perfil.');
                })
              }
            >
              Restablecer
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
