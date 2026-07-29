import React, { useEffect, useState } from 'react';
import { useGlobalStore } from '../store/globalStore';

const MODE_CONTENT = {
  login: {
    title: 'Connexion',
    switchText: 'Pas de compte ? Créer un compte',
  },
  register: {
    title: 'Inscription',
    switchText: 'Déjà un compte ? Se connecter',
  },
  forgot: {
    title: 'Récupération',
    switchText: 'Retour à la connexion',
  },
  reset: {
    title: 'Nouveau mot de passe',
    switchText: 'Retour à la connexion',
  },
};

function Icon({ name, size = 18, strokeWidth = 2 }) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  const paths = {
    login: (
      <>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <path d="m10 17 5-5-5-5" />
        <path d="M15 12H3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 9-9" />
        <path d="m15 8 3 3" />
        <path d="m17 6 2 2" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a17.3 17.3 0 0 1-2.1 2.8" />
        <path d="M6.6 6.6C3.6 8.4 2 12 2 12s3.5 6 10 6a10.5 10.5 0 0 0 5.4-1.4" />
      </>
    ),
    moon: (
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    alert: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
  };

  return <svg {...commonProps}>{paths[name]}</svg>;
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';

  const savedTheme = window.localStorage.getItem('jrsd-auth-theme');
  if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;

  return window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export default function Login() {
  const { login, register, forgotPassword, resetPassword, currentUser } = useGlobalStore();

  // Si déjà connecté, ne rien afficher (App.jsx affichera Layout)
  if (currentUser) {
    return null;
  }

  const [mode, setMode] = useState('login');
  const [theme, setTheme] = useState(getInitialTheme);
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    nom_prenom: '',
    email: '',
    password: '',
    fonction: '',
    cle_activation: '',
  });

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const key = params.get('key');
      const token = params.get('token');
      const wantsRegister =
        window.location.pathname === '/register' ||
        params.get('register') === '1';
      const wantsReset =
        window.location.pathname === '/reset-password' ||
        Boolean(token);

      if (wantsReset) {
        setMode('reset');
        if (token) setResetToken(token);
      } else if (wantsRegister) {
        setMode('register');
      }

      if (key) {
        setMode('register');
        setFormData((current) => ({
          ...current,
          cle_activation: key,
        }));
      }
    } catch {
      // L'application reste en mode connexion si l'URL est indisponible.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('jrsd-auth-theme', theme);
  }, [theme]);

  const clearFeedback = () => {
    setError('');
    setSuccessMessage('');
  };

  const changeMode = (nextMode) => {
    clearFeedback();
    setShowPassword(false);
    setMode(nextMode);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    clearFeedback();
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    clearFeedback();

    if (mode === 'login' && (!formData.email || !formData.password)) {
      setError('Veuillez remplir l’adresse e-mail et le mot de passe.');
      return;
    }

    if (
      mode === 'register' &&
      (!formData.nom_prenom ||
        !formData.email ||
        !formData.password ||
        !formData.fonction ||
        !formData.cle_activation)
    ) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (mode === 'forgot' && !formData.email) {
      setError('Veuillez saisir votre adresse e-mail.');
      return;
    }

    if (mode === 'reset' && !resetToken) {
      setError('Ce lien de réinitialisation est invalide ou incomplet.');
      return;
    }

    if (mode === 'reset' && !formData.password) {
      setError('Veuillez saisir votre nouveau mot de passe.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const response = await login(formData.email, formData.password);
        if (response?.success) {
          // Login réussi - App.jsx détectera automatiquement currentUser et affichera Layout
          setLoading(false);
          return;
        }
        setError(response?.message || 'Connexion impossible.');
      }

      if (mode === 'register') {
        const response = await register({
          nom_prenom: formData.nom_prenom,
          email: formData.email,
          password: formData.password,
          fonction: formData.fonction,
          cle_activation: formData.cle_activation,
          role: 'employe',
        });

        if (!response?.success) {
          setError(response?.message || 'Inscription impossible.');
        } else if (response?.message) {
          setSuccessMessage(response.message);
        }
      }

      if (mode === 'forgot') {
        const response = await forgotPassword(formData.email);
        if (response?.success) {
          setSuccessMessage(
            response.message ||
            'Un lien de récupération a été envoyé à votre adresse e-mail.',
          );
        } else {
          setError(response?.message || 'Envoi du lien impossible.');
        }
      }

      if (mode === 'reset') {
        const response = await resetPassword(
          resetToken,
          formData.password,
        );

        if (response?.success) {
          setSuccessMessage(
            response.message || 'Votre mot de passe a été modifié.',
          );

          window.setTimeout(() => {
            setMode('login');
            setSuccessMessage('');
            setShowPassword(false);
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname,
            );
          }, 4000);
        } else {
          setError(
            response?.message || 'Réinitialisation du mot de passe impossible.',
          );
        }
      }
    } catch (requestError) {
      setError(
        requestError?.message ||
        'Une erreur est survenue. Vérifiez votre connexion et réessayez.',
      );
    } finally {
      setLoading(false);
    }
  };

  const currentMode = MODE_CONTENT[mode];

  return (
    <>
      <style>{`
        *, *::before, *::after {
          box-sizing: border-box;
        }

        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(18px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes authSpin {
          to { transform: rotate(360deg); }
        }

        .auth-page {
          --page-bg: #07152d;
          --text-main: #f8fbff;
          --text-soft: #8ea5c7;
          --input-bg: #0b1d3b;
          --input-border: rgba(132, 164, 206, .36);
          --input-hover: rgba(98, 167, 255, .58);
          --line: rgba(128, 169, 221, .24);
          --switch-bg: #0b1d3b;
          --danger-bg: rgba(239, 68, 68, .1);
          --success-bg: rgba(16, 185, 129, .1);

          position: relative;
          min-height: 100vh;
          min-height: 100svh;
          width: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          display: grid;
          place-items: center;
          padding: clamp(14px, 2.4vh, 26px) 18px;
          color: var(--text-main);
          background: var(--page-bg);
          font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif;
          transition: background .35s ease, color .25s ease;
        }

        .auth-page[data-theme="light"] {
          --page-bg: #ffffff;
          --text-main: #10213d;
          --text-soft: #667c9c;
          --input-bg: #f7faff;
          --input-border: rgba(125, 151, 187, .38);
          --input-hover: rgba(37, 99, 235, .55);
          --line: rgba(80, 119, 172, .2);
          --switch-bg: #f7faff;
          --danger-bg: rgba(239, 68, 68, .07);
          --success-bg: rgba(16, 185, 129, .07);
        }

        .auth-card {
          position: relative;
          z-index: 1;
          width: min(100%, 610px);
          padding: clamp(12px, 2vh, 24px) 36px 12px;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          animation: authFadeUp .65s cubic-bezier(.16, 1, .3, 1) both;
        }

        .auth-theme-toggle {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid var(--input-border);
          border-radius: 12px;
          color: var(--text-soft);
          background: var(--switch-bg);
          cursor: pointer;
          transition: color .2s, border-color .2s, transform .2s, background .2s;
        }

        .auth-theme-toggle:hover {
          color: #2788ff;
          border-color: #2788ff;
          transform: translateY(-2px);
        }

        .auth-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0 58px;
        }

        .auth-logo {
          width: clamp(100px, 15vh, 126px);
          max-height: 70px;
          object-fit: contain;
          filter: drop-shadow(0 7px 20px rgba(0, 126, 255, .28));
        }

        .auth-product {
          margin: 7px 0 0;
          color: var(--text-main);
          font-size: clamp(1.55rem, 3.4vw, 1.9rem);
          font-weight: 850;
          line-height: 1;
          letter-spacing: -.035em;
        }

        .auth-product span {
          color: #35aaff;
        }

        .auth-byline {
          margin: 6px 0 0;
          color: var(--text-soft);
          font-size: .84rem;
          letter-spacing: .035em;
        }

        .auth-separator {
          width: 100%;
          height: 1px;
          margin: clamp(13px, 2vh, 18px) 0;
          background: linear-gradient(90deg, transparent, var(--line) 18%, var(--line) 82%, transparent);
        }

        .auth-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: clamp(14px, 2vh, 18px);
        }

        .auth-heading-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(53, 150, 255, .52);
          border-radius: 14px;
          color: #328cff;
          background: rgba(30, 111, 255, .1);
          box-shadow: inset 0 0 20px rgba(34, 119, 255, .06);
        }

        .auth-heading-copy {
          min-width: 0;
        }

        .auth-title {
          margin: 0;
          color: var(--text-main);
          font-size: clamp(1.35rem, 3.5vw, 1.65rem);
          line-height: 1.15;
          letter-spacing: -.025em;
        }

        .auth-mode-switch {
          margin: 5px 0 0;
          padding: 0;
          border: 0;
          color: #338dff;
          background: transparent;
          font: inherit;
          font-size: .86rem;
          cursor: pointer;
          text-align: left;
        }

        .auth-mode-switch:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 1.8vh, 15px);
        }

        .auth-register-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .auth-field-full {
          grid-column: 1 / -1;
        }

        .auth-label {
          color: var(--text-main);
          font-size: .82rem;
          font-weight: 650;
        }

        .auth-input-shell {
          position: relative;
        }

        .auth-input-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          translate: 0 -50%;
          display: grid;
          place-items: center;
          color: var(--text-soft);
          pointer-events: none;
          transition: color .2s;
        }

        .auth-input-shell:focus-within .auth-input-icon {
          color: #338dff;
        }

        .auth-input {
          width: 100%;
          height: 48px;
          padding: 0 46px;
          border: 1px solid var(--input-border);
          border-radius: 13px;
          outline: none;
          color: var(--text-main);
          background: var(--input-bg);
          font: inherit;
          font-size: .9rem;
          caret-color: #338dff;
          transition: border-color .2s, box-shadow .2s, background .2s;
        }

        .auth-input::placeholder {
          color: var(--text-soft);
          opacity: .78;
        }

        .auth-input:hover {
          border-color: var(--input-hover);
        }

        .auth-input:focus {
          border-color: #328cff;
          box-shadow: 0 0 0 3px rgba(50, 140, 255, .14);
        }

        .auth-input[aria-invalid="true"] {
          border-color: #ef4444;
        }

        .auth-password-toggle {
          position: absolute;
          top: 50%;
          right: 10px;
          translate: 0 -50%;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 9px;
          color: var(--text-soft);
          background: transparent;
          cursor: pointer;
        }

        .auth-password-toggle:hover {
          color: #338dff;
          background: rgba(51, 141, 255, .08);
        }

        .auth-forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -7px;
        }

        .auth-text-button {
          padding: 0;
          border: 0;
          color: #338dff;
          background: transparent;
          font: inherit;
          font-size: .8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .auth-text-button:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .auth-feedback {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 13px;
          border: 1px solid;
          border-radius: 11px;
          font-size: .8rem;
          line-height: 1.45;
        }

        .auth-feedback svg {
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .auth-feedback-error {
          color: #ff6b72;
          border-color: rgba(239, 68, 68, .28);
          background: var(--danger-bg);
        }

        .auth-feedback-success {
          color: #14b881;
          border-color: rgba(16, 185, 129, .28);
          background: var(--success-bg);
        }

        .auth-submit {
          width: 100%;
          min-height: 49px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 13px 20px;
          border: 0;
          border-radius: 13px;
          color: #fff;
          background: linear-gradient(135deg, #1557e7 0%, #2482ff 55%, #35a3ff 100%);
          box-shadow: 0 12px 30px rgba(30, 111, 255, .3);
          font: inherit;
          font-size: .95rem;
          font-weight: 760;
          cursor: pointer;
          transition: transform .2s, box-shadow .2s, opacity .2s;
        }

        .auth-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 36px rgba(30, 111, 255, .42);
        }

        .auth-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .auth-submit:disabled {
          opacity: .7;
          cursor: wait;
        }

        .auth-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255, 255, 255, .32);
          border-top-color: #fff;
          border-radius: 50%;
          animation: authSpin .75s linear infinite;
        }

        .auth-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 16px;
          color: var(--text-soft);
          font-size: .72rem;
        }

        .auth-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #18c781;
          box-shadow: 0 0 9px #18c781;
        }

        @media (max-width: 640px) {
          .auth-page {
            place-items: start center;
            padding: 14px 16px 22px;
          }

          .auth-card {
            width: 100%;
            min-height: auto;
            padding: 14px 0 8px;
          }

          .auth-theme-toggle {
            top: 6px;
            right: 0;
          }

          .auth-brand {
            padding: 0 46px;
          }

          .auth-logo {
            width: 105px;
            max-height: 62px;
          }

          .auth-separator {
            margin: 14px 0;
          }

          .auth-heading {
            margin-bottom: 15px;
          }

          .auth-register-grid {
            grid-template-columns: 1fr;
          }

          .auth-field-full {
            grid-column: auto;
          }
        }

        @media (max-height: 760px) and (min-width: 641px) {
          .auth-card {
            padding-top: 8px;
          }

          .auth-logo {
            width: 92px;
            max-height: 54px;
          }

          .auth-product {
            font-size: 1.45rem;
          }

          .auth-byline {
            margin-top: 6px;
          }

          .auth-separator {
            margin: 11px 0;
          }

          .auth-heading {
            margin-bottom: 12px;
          }

          .auth-form {
            gap: 11px;
          }

          .auth-input {
            height: 45px;
          }

          .auth-submit {
            min-height: 46px;
          }

          .auth-footer {
            margin-top: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-card,
          .auth-spinner {
            animation: none;
          }
        }
      `}</style>

      <div className="auth-page" data-theme={theme}>
        <main className="auth-card" aria-labelledby="auth-title">
          <button
            type="button"
            className="auth-theme-toggle"
            onClick={() =>
              setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
            }
            aria-label={
              theme === 'dark'
                ? 'Activer le thème clair'
                : 'Activer le thème sombre'
            }
            title={
              theme === 'dark'
                ? 'Activer le thème clair'
                : 'Activer le thème sombre'
            }
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
          </button>

          <header className="auth-brand">
            <img
              src="/logo.png"
              alt="Logo J-RSD"
              className="auth-logo"
            />
            <h1 className="auth-product">
              J-RSD <span>OS</span>
            </h1>
            <p className="auth-byline">by J-RSD</p>
          </header>

          <div className="auth-separator" />

          <section>
            <div className="auth-heading">
              <div className="auth-heading-icon">
                <Icon name="login" size={23} />
              </div>
              <div className="auth-heading-copy">
                <h2 id="auth-title" className="auth-title">
                  {currentMode.title}
                </h2>
                <button
                  type="button"
                  className="auth-mode-switch"
                  onClick={() =>
                    changeMode(mode === 'login' ? 'register' : 'login')
                  }
                >
                  {currentMode.switchText}
                </button>
              </div>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {mode === 'register' ? (
                <div className="auth-register-grid">
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-nom-prenom">
                      Nom et prénom
                    </label>
                    <div className="auth-input-shell">
                      <span className="auth-input-icon">
                        <Icon name="user" size={17} />
                      </span>
                      <input
                        id="auth-nom-prenom"
                        name="nom_prenom"
                        type="text"
                        value={formData.nom_prenom}
                        onChange={handleChange}
                        className="auth-input"
                        placeholder="John Doe"
                        autoComplete="name"
                        aria-invalid={Boolean(error && !formData.nom_prenom)}
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-fonction">
                      Fonction
                    </label>
                    <div className="auth-input-shell">
                      <span className="auth-input-icon">
                        <Icon name="briefcase" size={17} />
                      </span>
                      <input
                        id="auth-fonction"
                        name="fonction"
                        type="text"
                        value={formData.fonction}
                        onChange={handleChange}
                        className="auth-input"
                        placeholder="Développeur, manager…"
                        autoComplete="organization-title"
                        aria-invalid={Boolean(error && !formData.fonction)}
                      />
                    </div>
                  </div>

                  <EmailField
                    value={formData.email}
                    onChange={handleChange}
                    focused={focused}
                    setFocused={setFocused}
                    invalid={Boolean(error && !formData.email)}
                  />

                  <PasswordField
                    label="Mot de passe"
                    value={formData.password}
                    onChange={handleChange}
                    focused={focused}
                    setFocused={setFocused}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    invalid={Boolean(error && !formData.password)}
                    autoComplete="new-password"
                  />

                  <div className="auth-field auth-field-full">
                    <label className="auth-label" htmlFor="auth-key">
                      Clé d’activation
                    </label>
                    <div className="auth-input-shell">
                      <span className="auth-input-icon">
                        <Icon name="key" size={17} />
                      </span>
                      <input
                        id="auth-key"
                        name="cle_activation"
                        type="text"
                        value={formData.cle_activation}
                        onChange={handleChange}
                        className="auth-input"
                        placeholder="J-RSD-2026"
                        autoComplete="off"
                        aria-invalid={Boolean(
                          error && !formData.cle_activation,
                        )}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {(mode === 'login' || mode === 'forgot') && (
                    <EmailField
                      value={formData.email}
                      onChange={handleChange}
                      focused={focused}
                      setFocused={setFocused}
                      invalid={Boolean(error && !formData.email)}
                    />
                  )}

                  {(mode === 'login' || mode === 'reset') && (
                    <PasswordField
                      label={
                        mode === 'reset'
                          ? 'Nouveau mot de passe'
                          : 'Mot de passe'
                      }
                      value={formData.password}
                      onChange={handleChange}
                      focused={focused}
                      setFocused={setFocused}
                      showPassword={showPassword}
                      setShowPassword={setShowPassword}
                      invalid={Boolean(error && !formData.password)}
                      autoComplete={
                        mode === 'reset'
                          ? 'new-password'
                          : 'current-password'
                      }
                    />
                  )}

                  {mode === 'login' && (
                    <div className="auth-forgot-row">
                      <button
                        type="button"
                        className="auth-text-button"
                        onClick={() => changeMode('forgot')}
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  )}
                </>
              )}

              {successMessage && (
                <div
                  className="auth-feedback auth-feedback-success"
                  role="status"
                >
                  <Icon name="check" size={16} strokeWidth={2.3} />
                  <span>{successMessage}</span>
                </div>
              )}

              {error && (
                <div
                  className="auth-feedback auth-feedback-error"
                  role="alert"
                >
                  <Icon name="alert" size={16} strokeWidth={2.3} />
                  <span>{error}</span>
                </div>
              )}

              <button
                id="btn-login-submit"
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    <span>{getLoadingLabel(mode)}</span>
                  </>
                ) : (
                  <>
                    <span>{getSubmitLabel(mode)}</span>
                    <Icon name="arrow" size={17} strokeWidth={2.4} />
                  </>
                )}
              </button>
            </form>
          </section>
        </main>
      </div>
    </>
  );
}

function EmailField({
  value,
  onChange,
  focused,
  setFocused,
  invalid,
}) {
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor="auth-email">
        Adresse e-mail
      </label>
      <div className="auth-input-shell">
        <span className="auth-input-icon">
          <Icon name="mail" size={17} />
        </span>
        <input
          id="auth-email"
          name="email"
          type="email"
          value={value}
          onChange={onChange}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused('')}
          className="auth-input"
          placeholder="votre@email.com"
          autoComplete="email"
          inputMode="email"
          aria-invalid={invalid}
          data-focused={focused === 'email'}
        />
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  focused,
  setFocused,
  showPassword,
  setShowPassword,
  invalid,
  autoComplete,
}) {
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor="auth-password">
        {label}
      </label>
      <div className="auth-input-shell">
        <span className="auth-input-icon">
          <Icon name="lock" size={17} />
        </span>
        <input
          id="auth-password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused('password')}
          onBlur={() => setFocused('')}
          className="auth-input"
          placeholder="••••••••"
          autoComplete={autoComplete}
          aria-invalid={invalid}
          data-focused={focused === 'password'}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={
            showPassword
              ? 'Masquer le mot de passe'
              : 'Afficher le mot de passe'
          }
          title={
            showPassword
              ? 'Masquer le mot de passe'
              : 'Afficher le mot de passe'
          }
        >
          <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
    </div>
  );
}

function getSubmitLabel(mode) {
  if (mode === 'register') return 'S’inscrire';
  if (mode === 'forgot') return 'Envoyer le lien';
  if (mode === 'reset') return 'Enregistrer le mot de passe';
  return 'Se connecter';
}

function getLoadingLabel(mode) {
  if (mode === 'register') return 'Inscription en cours…';
  if (mode === 'forgot') return 'Demande en cours…';
  if (mode === 'reset') return 'Réinitialisation…';
  return 'Connexion en cours…';
}
