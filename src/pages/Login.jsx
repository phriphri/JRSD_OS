import React, { useEffect, useState } from 'react';
import { useGlobalStore } from '../store/globalStore';

const USERS = [
  { name: 'Phrasia Mosengo', role: 'admin', email: 'mosengophrasia1@gmail.com', initials: 'PM', badge: 'Admin', badgeColor: '#ef4444' }
];

export default function Login() {
  const { login, register } = useGlobalStore();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    nom_prenom: '',
    email: '',
    password: '',
    fonction: '',
    cle_activation: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');

  // Pré-remplissage de la clé via URL : /register?key=JRSD-XXXX
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const key = params.get('key');
      const wantsRegister = window.location.pathname === '/register' || params.get('register') === '1';
      if (wantsRegister) setIsRegister(true);
      if (key) {
        setIsRegister(true);
        setFormData((prev) => ({ ...prev, cle_activation: key }));
      }
    } catch {
      // no-op
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    
    if (isRegister) {
      if (!formData.nom_prenom || !formData.email || !formData.password || !formData.fonction || !formData.cle_activation) {
         setError('Veuillez remplir tous les champs.');
         setLoading(false);
         return;
      }
      const res = await register({
         nom_prenom: formData.nom_prenom,
         email: formData.email,
         password: formData.password,
         fonction: formData.fonction,
         cle_activation: formData.cle_activation,
         role: 'employe'
      });
      if (!res.success) setError(res.message);
    } else {
      if (!formData.email || !formData.password) {
         setError('Veuillez remplir email et mot de passe.');
         setLoading(false);
         return;
      }
      const res = await login(formData.email, formData.password);
      if (!res.success) setError(res.message);
    }
    setLoading(false);
  };

  const handleQuick = (u) => {
    setIsRegister(false);
    setFormData({
       ...formData,
       email: u.email,
       password: '000'
    });
    setError('');
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --border:        #e2e8f0;
          --input-bg:      #f8fafc;
          --card-bg:       #ffffff;
          --text-primary:  #0f172a;
          --text-secondary:#64748b;
          --text-muted:    #94a3b8;
        }
        .dark {
          --border:        #1e293b;
          --input-bg:      #1e293b;
          --card-bg:       #0f172a;
          --text-primary:  #f1f5f9;
          --text-secondary:#94a3b8;
          --text-muted:    #475569;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-root {
          display: flex;
          height: 100vh;
          width: 100%;
          overflow: hidden;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        }

        .login-left {
          flex: 0 0 48%;
          position: relative;
          background: linear-gradient(145deg, #020817 0%, #0a1628 40%, #0f1f3d 70%, #071525 100%);
          overflow: hidden;
          display: flex;
          align-items: center;
        }
        .login-left-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }
        .login-left-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
        }
        .login-left-inner {
          position: relative;
          z-index: 1;
          padding: 3rem 3.5rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both;
          width: 100%;
        }

        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-y: auto;
          padding: 2.5rem 2rem;
          background: var(--card-bg, #ffffff);
          transition: background 0.3s;
        }
        .login-form-card {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
          animation: fadeUp 0.65s 0.1s cubic-bezier(0.16,1,0.3,1) both;
          padding: 0.5rem 0;
        }

        .login-logo { width: 180px; height: auto; filter: drop-shadow(0 0 24px rgba(37,99,235,0.5)); }

        .login-tagline {
          font-size: 2rem; font-weight: 800; color: #f1f5f9;
          line-height: 1.2; letter-spacing: -0.02em;
        }
        .login-tagline-accent {
          background: linear-gradient(90deg, #60a5fa, #38bdf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-tagline-sub {
          color: #94a3b8; font-size: 0.88rem; line-height: 1.65;
          max-width: 340px; margin-top: 0.75rem;
        }

        .login-pills { display: flex; flex-direction: column; gap: 0.65rem; }
        .login-pill {
          display: flex; align-items: center; gap: 0.6rem;
          color: #cbd5e1; font-size: 0.85rem; font-weight: 500;
        }

        .login-version {
          display: flex; align-items: center; gap: 0.5rem;
          color: #475569; font-size: 0.75rem;
        }
        .login-version-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #22c55e; box-shadow: 0 0 6px #22c55e;
          flex-shrink: 0;
        }

        .login-form-header {
          display: flex; align-items: center; gap: 1rem;
        }
        .login-form-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: rgba(37,99,235,0.1); border: 1px solid rgba(37,99,235,0.2);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .login-form-title {
          font-size: 1.6rem; font-weight: 800;
          color: var(--text-primary, #0f172a); letter-spacing: -0.02em;
        }
        .login-form-sub { color: var(--text-secondary, #64748b); font-size: 0.85rem; margin-top: 0.15rem; cursor: pointer; color: #2563eb; }

        .login-field { display: flex; flex-direction: column; gap: 0.45rem; }
        .login-label { font-size: 0.82rem; font-weight: 600; color: var(--text-primary, #0f172a); }
        .login-input-wrap { position: relative; }
        .login-input-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          pointer-events: none; display: flex; align-items: center;
        }
        .login-input {
          width: 100%; padding: 0.75rem 1rem 0.75rem 2.75rem;
          border-radius: 10px; border: 1.5px solid var(--border, #e2e8f0);
          background: var(--input-bg, #f8fafc); color: var(--text-primary, #0f172a);
          font-size: 0.9rem; outline: none; font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .login-input::placeholder { color: #94a3b8; }
        .login-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
        }
        .login-error {
          display: flex; align-items: center; gap: 0.4rem;
          color: #ef4444; font-size: 0.78rem; font-weight: 500;
        }

        .login-btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          width: 100%; padding: 0.85rem 1.5rem;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
          color: white; font-weight: 700; font-size: 0.95rem;
          border: none; border-radius: 10px; cursor: pointer;
          box-shadow: 0 4px 20px rgba(37,99,235,0.35);
          transition: transform 0.18s, box-shadow 0.18s, opacity 0.2s;
          font-family: inherit; letter-spacing: 0.01em;
        }
        .login-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(37,99,235,0.5);
        }
        .login-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .login-btn-primary:disabled { opacity: 0.75; cursor: not-allowed; }

        .login-spinner { animation: spin 0.8s linear infinite; display: block; }

        .login-divider { display: flex; align-items: center; gap: 0.75rem; }
        .login-divider-line { flex: 1; height: 1px; background: var(--border, #e2e8f0); }
        .login-divider-text {
          color: var(--text-muted, #94a3b8); font-size: 0.73rem;
          font-weight: 600; white-space: nowrap;
          text-transform: uppercase; letter-spacing: 0.08em;
        }

        .login-profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        .login-profile-card {
          display: flex; align-items: center; gap: 0.65rem;
          padding: 0.7rem 0.85rem; border-radius: 10px;
          border: 1.5px solid var(--border, #e2e8f0);
          background: var(--input-bg, #f8fafc);
          text-align: left; cursor: pointer; font-family: inherit;
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .login-profile-card:hover:not(:disabled) {
          border-color: #2563eb;
          background: rgba(37,99,235,0.06);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(37,99,235,0.12);
        }
        .login-profile-card:disabled { opacity: 0.55; cursor: not-allowed; }
        .login-avatar-wrap { position: relative; width: 36px; height: 36px; flex-shrink: 0; }
        .login-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: #e2e8f0; }
        .login-profile-info { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; flex: 1; }
        .login-profile-name {
          font-size: 0.8rem; font-weight: 600; color: var(--text-primary, #0f172a);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .login-profile-badge {
          display: inline-block; font-size: 0.68rem; font-weight: 700;
          padding: 0.15rem 0.45rem; border-radius: 4px;
          letter-spacing: 0.03em; width: fit-content;
        }

        .login-footer { text-align: center; color: var(--text-muted, #94a3b8); font-size: 0.73rem; }

        @media (min-width: 768px) and (max-width: 1023px) {
          .login-left { flex: 0 0 40%; }
          .login-left-inner { padding: 2.5rem 2rem; gap: 2rem; }
          .login-logo { width: 140px; }
          .login-tagline { font-size: 1.5rem; }
        }

        @media (max-width: 767px) {
          .login-root { height: auto; min-height: 100vh; overflow: visible; }
          .login-left  { display: none; }
          .login-right {
            overflow-y: visible;
            align-items: flex-start;
            padding: 2rem 1.25rem 3rem;
          }
          .login-form-card { padding: 0; max-width: 100%; }
          .login-profile-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="login-root">

        {/* PANNEAU GAUCHE */}
        <div id="login-left-panel" className="login-left">
          <div className="login-left-grid" />
          <div className="login-left-orb" style={{ top: '-80px', left: '-80px', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(37,99,235,0.45) 0%, transparent 70%)' }} />
          <div className="login-left-orb" style={{ bottom: '-60px', right: '-60px', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)' }} />

          <div className="login-left-inner">
            <img id="login-logo" src="/logo.png" alt="J-RSD Logo" className="login-logo" />

            <div>
              <h2 className="login-tagline">
                Bienvenue sur<br />
                <span className="login-tagline-accent">J-RSD OS</span>
              </h2>
              <p className="login-tagline-sub">
                Votre système opérationnel intégré pour la gestion de projets, d'équipes et de ressources.
              </p>
            </div>

            <div className="login-pills">
              {['Gestion de projets', 'Collaboration temps réel', 'Tableaux de bord avancés', 'Contrôle des accès'].map((f) => (
                <div key={f} className="login-pill">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div className="login-version">
              <span className="login-version-dot" />
              J-RSD OS v2.0
            </div>
          </div>
        </div>

        {/* PANNEAU DROIT */}
        <div id="login-right-panel" className="login-right">
          <div className="login-form-card">

            <div className="login-form-header">
              <div className="login-form-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </div>
              <div>
                <h1 className="login-form-title">{isRegister ? "Inscription" : "Connexion"}</h1>
                <p className="login-form-sub" onClick={() => setIsRegister(!isRegister)}>
                  {isRegister ? "Déjà un compte ? Se connecter" : "Pas de compte ? Créer un compte"}
                </p>
              </div>
            </div>

            {isRegister && (
               <div className="login-field">
                 <label className="login-label" htmlFor="login-nom_prenom">Nom & Prénom</label>
                 <div className="login-input-wrap">
                   <span className="login-input-icon">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                       <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                     </svg>
                   </span>
                   <input
                     id="login-nom_prenom"
                     name="nom_prenom"
                     value={formData.nom_prenom}
                     onChange={handleChange}
                     placeholder="John Doe"
                     className="login-input"
                   />
                 </div>
               </div>
            )}

            <div className="login-field">
              <label className="login-label" htmlFor="login-email">Adresse e-mail</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focused === 'email' ? '#2563eb' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="votre@email.com"
                  className="login-input"
                  style={error && !formData.email ? { borderColor: '#ef4444' } : {}}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Mot de passe</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focused === 'password' ? '#2563eb' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="••••••••"
                  className="login-input"
                  style={error && !formData.password ? { borderColor: '#ef4444' } : {}}
                />
              </div>
            </div>

            {isRegister && (
               <>
                 <div className="login-field">
                   <label className="login-label" htmlFor="login-fonction">Fonction</label>
                   <div className="login-input-wrap">
                     <span className="login-input-icon">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                       </svg>
                     </span>
                     <input
                       id="login-fonction"
                       name="fonction"
                       value={formData.fonction}
                       onChange={handleChange}
                       placeholder="Développeur, Manager..."
                       className="login-input"
                     />
                   </div>
                 </div>

                 <div className="login-field">
                   <label className="login-label" htmlFor="login-cle_activation">Clé d'activation</label>
                 <div className="login-input-wrap">
                   <span className="login-input-icon">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                       <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                     </svg>
                   </span>
                   <input
                     id="login-cle_activation"
                     name="cle_activation"
                     value={formData.cle_activation}
                     onChange={handleChange}
                     placeholder="J-RSD-2026"
                     className="login-input"
                   />
                 </div>
                 </div>
               </>
            )}

            {error && (
              <div className="login-error">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button
              id="btn-login-submit"
              className="login-btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="login-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  {isRegister ? "Inscription en cours…" : "Connexion en cours…"}
                </>
              ) : (
                <>
                  {isRegister ? "S'inscrire" : "Se connecter"}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            {!isRegister && (
              <>
                <div className="login-divider">
                  <div className="login-divider-line" />
                  <span className="login-divider-text">Pré-remplissage rapide</span>
                  <div className="login-divider-line" />
                </div>

                <div className="login-profile-grid">
                  {USERS.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      className="login-profile-card"
                      onClick={() => handleQuick(u)}
                    >
                      <div className="login-avatar-wrap">
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.03em'
                        }}>{u.initials}</div>
                      </div>
                      <div className="login-profile-info">
                        <p className="login-profile-name">{u.name}</p>
                        <span
                          className="login-profile-badge"
                          style={{ background: u.badgeColor + '22', color: u.badgeColor, border: `1px solid ${u.badgeColor}44` }}
                        >
                          {u.badge}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>

      </div>
    </>
  );
}
