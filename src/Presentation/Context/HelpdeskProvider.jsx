import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createHelpdeskService } from '../../Application/helpdeskService.js';
import { readableError } from '../format.js';
import { HelpdeskContext } from './HelpdeskContext.js';
const EMPTY = { tickets: [], profiles: [], categories: [], comments: [], activities: [] };
export function HelpdeskProvider({ repository, children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [data, setData] = useState(EMPTY);
  const [dataOwner, setDataOwner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const request = useRef(0);
  const service = useMemo(() => createHelpdeskService(repository), [repository]);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const sync = async () => {
      const current = ++revision;
      try {
        const profile = await repository.getSession();
        if (active && current === revision) {
          setUser(profile);
          setAuthError('');
        }
      } catch (failure) {
        if (active && current === revision) setAuthError(readableError(failure));
      } finally {
        if (active && current === revision) setAuthLoading(false);
      }
    };
    void sync();
    const unsubscribe = repository.subscribe(sync);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repository]);
  const readWorkspace = useCallback(() => {
    const current = ++request.current;
    if (!user) return Promise.resolve();
    return repository
      .load(user)
      .then((next) => {
        if (current !== request.current) return;
        setData(next);
        setDataOwner(user.id);
        setError('');
      })
      .catch((failure) => {
        if (current === request.current) setError(readableError(failure));
      })
      .finally(() => {
        if (current === request.current) setLoading(false);
      });
  }, [repository, user]);
  const reload = useCallback(() => {
    setLoading(true);
    return readWorkspace();
  }, [readWorkspace]);
  // La sesión inicia una lectura externa; el estado cambia al recibir su resultado.
  useEffect(() => {
    void readWorkspace();
    return () => {
      request.current += 1;
    };
  }, [readWorkspace]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  // Las pantallas reciben un resultado explícito: solo cierran formularios si la escritura terminó bien.
  const execute = async (action, message = 'Cambios guardados') => {
    setSaving(true);
    try {
      const value = await action();
      await reload();
      setToast({ message, tone: 'success' });
      return { ok: true, value };
    } catch (failure) {
      setToast({ message: readableError(failure), tone: 'error' });
      return { ok: false };
    } finally {
      setSaving(false);
    }
  };
  const signOut = async () => {
    try {
      await repository.signOut();
      request.current += 1;
      setUser(null);
      setData(EMPTY);
      setLoading(false);
      setError('');
    } catch (failure) {
      setToast({ message: readableError(failure), tone: 'error' });
    }
  };
  return (
    <HelpdeskContext.Provider
      value={{
        repository,
        service,
        user,
        setUser,
        data,
        loading: loading || Boolean(user && dataOwner !== user.id),
        error,
        authError,
        authLoading,
        saving,
        execute,
        reload,
        signOut,
      }}
    >
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className={`toast ${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
            {toast.message}
            <button aria-label="Cerrar aviso" onClick={() => setToast(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </HelpdeskContext.Provider>
  );
}
