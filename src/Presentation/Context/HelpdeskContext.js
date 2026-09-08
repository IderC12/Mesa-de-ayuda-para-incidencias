import { createContext, useContext } from 'react';
export const HelpdeskContext = createContext(null);
export function useHelpdesk() {
  const context = useContext(HelpdeskContext);
  if (!context) throw new Error('HelpdeskProvider no está disponible.');
  return context;
}
