import { createContext, useContext, useEffect, useState } from 'react';
import { fetchUiPrefs, saveUiPrefs } from '../lib/api';

const UiPrefsContext = createContext(null);

export function UiPrefsProvider({ children }) {
  const [collapsed, setCollapsed] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchUiPrefs()
      .then((r) => setCollapsed(r.collapsed_sections || {}))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function toggle(key, defaultCollapsed = false) {
    setCollapsed((c) => {
      const current = key in c ? c[key] : defaultCollapsed;
      const next = { ...c, [key]: !current };
      saveUiPrefs(next).catch(() => {});
      return next;
    });
  }

  const value = {
    loaded,
    isCollapsed: (key, defaultCollapsed = false) => (key in collapsed ? collapsed[key] : defaultCollapsed),
    toggle,
  };

  return <UiPrefsContext.Provider value={value}>{children}</UiPrefsContext.Provider>;
}

export function useUiPrefs() {
  const ctx = useContext(UiPrefsContext);
  if (!ctx) throw new Error('useUiPrefs must be used within a UiPrefsProvider');
  return ctx;
}
