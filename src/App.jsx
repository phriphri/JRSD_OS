import React, { useEffect, useState } from 'react';
import { useGlobalStore } from './store/globalStore';
import Login from './pages/Login';
import Layout from './components/Layout';

export default function App() {
  const { currentUser, darkMode, initAuth } = useGlobalStore();
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const checkAuth = async () => {
      await initAuth();
      setLoadingAuth(false);
    };
    checkAuth();
  }, [initAuth]);

  if (loadingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--card-bg)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="3" opacity="0.2" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // Route Guard / Protected Route :
  // Démonte complètement Layout, TopBar, SideBar et Dashboard du DOM si non authentifié.
  if (!currentUser) {
    return <Login />;
  }

  return <Layout />;
}
