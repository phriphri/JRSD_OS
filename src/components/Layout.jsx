import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGlobalStore } from '../store/globalStore';
import Dashboard from '../pages/Dashboard';
import Kanban from '../pages/Kanban';
import Tasks from '../pages/Tasks';
import Projects from '../pages/Projects';
import Teams from '../pages/Teams';
import Agents from '../pages/Agents';
import Documents from '../pages/Documents';
import Planning from '../pages/Planning';
import Messages from '../pages/Messages';
import Notifications from '../pages/Notifications';
import ProfileModal from './ProfileModal';
import {
  LayoutDashboard,
  CheckSquare,
  KanbanSquare,
  MessageSquare,
  Folder,
  FileText,
  Calendar,
  Bell,
  Users,
  Settings,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Globe,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'kanban', label: 'Kanban', icon: <KanbanSquare className="w-5 h-5" /> },
  { id: 'tasks', label: 'Tâches', icon: <CheckSquare className="w-5 h-5" /> },
  { id: 'projects', label: 'Projets', icon: <Folder className="w-5 h-5" /> },
  { id: 'teams', label: 'Équipes', adminOnly: true, icon: <Users className="w-5 h-5" /> },
  { id: 'agents', label: 'Agents', adminOnly: true, adminRoleOnly: true, icon: <Users className="w-5 h-5" /> },
  { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5" /> },
  { id: 'planning', label: 'Planning', icon: <Calendar className="w-5 h-5" /> },
  { id: 'messages', label: 'Messagerie', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
];

const translations = {
  FR: { dashboard: "Tableau de bord", kanban: "Kanban", tasks: "Tâches", projects: "Projets", teams: "Équipes", agents: "Agents", documents: "Documents", planning: "Planning", messages: "Messagerie", notifications: "Notifications", greeting: "Bonjour", dynamic: "Vue Organisation", total_prog: "PROGRESSION GLOBALE" },
  EN: { dashboard: "Dashboard", kanban: "Kanban Board", tasks: "Tasks", projects: "Projects", teams: "Teams", agents: "Agents", documents: "Documents", planning: "Planning", messages: "Messages", notifications: "Notifications", greeting: "Hello", dynamic: "Organization View", total_prog: "GLOBAL PROGRESSION" }
};

const ROLE_COLORS = {
  admin: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  manager: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  employe: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

export default function Layout() {
  const { currentUser, logout, notifications, darkMode, toggleTheme, language, setLanguage, unreadMessagesCount } = useGlobalStore();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const scrollRef = useRef(null);
  const lastScrollTime = useRef(0);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    const fetchUnread = useGlobalStore.getState().fetchUnreadCount;
    fetchUnread();
    const interval = setInterval(fetchUnread, 4000);
    return () => clearInterval(interval);
  }, []);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    if (isRightSwipe && !mobileMenuOpen && touchStart < 40) {
      setMobileMenuOpen(true);
    }
  };

  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'manager';
  const unreadCount = notifications?.filter((n) => n.is_read === false).length || 0;

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.adminRoleOnly && userRole !== 'admin') return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  }).map(item => ({
    ...item,
    label: translations[language === 'EN' ? 'EN' : 'FR'][item.id] || item.label
  }));

  const activeTitle = visibleNav.find((i) => i.id === activeSection)?.label || translations[language === 'EN' ? 'EN' : 'FR']['dashboard'];

  const navigateToSection = useCallback((id) => {
    const allowed = visibleNav.some((item) => item.id === id);
    if (!allowed) return;
    setActiveSection(id);
    setMobileMenuOpen(false);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [visibleNav]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 15) {
      const now = Date.now();
      if (now - lastScrollTime.current > 1500) {
        lastScrollTime.current = now;
        const currentIndex = visibleNav.findIndex((item) => item.id === activeSection);
        if (currentIndex !== -1) {
          let nextIndex = (currentIndex + 1) % visibleNav.length;
          while (visibleNav[nextIndex].id === 'messages' && nextIndex !== currentIndex) {
            nextIndex = (nextIndex + 1) % visibleNav.length;
          }
          if (visibleNav[nextIndex].id !== 'messages') {
            navigateToSection(visibleNav[nextIndex].id);
          }
        }
      }
    }
  };

  const renderActivePage = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'kanban':
        return <Kanban />;
      case 'tasks':
        return <Tasks />;
      case 'projects':
        return <Projects />;
      case 'teams':
        return <Teams />;
      case 'agents':
        return <Agents />;
      case 'documents':
        return <Documents />;
      case 'planning':
        return <Planning />;
      case 'messages':
        return <Messages />;
      case 'notifications':
        return <Notifications />;
      default:
        return <Dashboard />;
    }
  };

  const rColors = ROLE_COLORS[userRole] || ROLE_COLORS.employe;

  if (!currentUser) return null;

  return (
    <div
      className="flex min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-300"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
    >
      {/* ── SIDEBAR (Desktop) ─────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full transition-colors duration-300 z-50">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 shadow-sm">
            <span className="text-white font-black text-base">J</span>
          </div>
          <div>
            <span className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">J-RSD OS</span>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold">Workspace</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto hide-scrollbar">
          {visibleNav.map(({ id, label, icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                id={`nav-${id}`}
                onClick={() => navigateToSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-left ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <span className={active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-600'}>
                  {icon}
                </span>
                {label}
                {id === 'notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
                {id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── MAIN WRAPPER ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-slate-900 dark:text-white font-bold text-base tracking-tight truncate">
              {activeTitle}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => { setSettingsOpen((o) => !o); setProfileMenuOpen(false); }}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              >
                <Settings className="w-5 h-5" />
              </button>
              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-20">
                  <button
                    onClick={toggleTheme}
                    className="flex items-center w-full px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    {darkMode ? <Moon className="w-4 h-4 mr-3" /> : <Sun className="w-4 h-4 mr-3" />}
                    Mode {darkMode ? 'Sombre' : 'Clair'}
                  </button>
                  <div className="flex items-center px-4 py-3 border-t border-slate-100 dark:border-slate-700/50">
                    <Globe className="w-4 h-4 mr-3 text-slate-500 dark:text-slate-400" />
                    <div className="flex items-center gap-2">
                      {['FR', 'EN'].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
                            language === lang
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => { setProfileMenuOpen((o) => !o); setSettingsOpen(false); }}
                className="flex items-center gap-2 text-sm focus:outline-none p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {currentUser.avatar ? (
                  <img src={`http://localhost:3001${currentUser.avatar}`} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {currentUser.initials}
                  </div>
                )}
                <span className="text-slate-900 dark:text-white font-medium">{currentUser.fullName}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-20 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{currentUser.fullName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50"
                  >
                    👤 Modifier mon profil
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <header className="flex md:hidden items-center justify-between px-5 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shrink-0 z-30 transition-colors duration-300">
          <div className="flex items-center min-w-0">
            <h2 className="text-slate-900 dark:text-white font-bold text-sm truncate">{activeTitle}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setMobileMenuOpen((o) => !o)}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <div
          className={`md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        <aside
          className={`md:hidden fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-[#0A0A0A] border-r border-slate-200/60 dark:border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white font-black text-base">J</span>
              </div>
              <span className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">J-RSD OS</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {visibleNav.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => navigateToSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors text-left ${
                  activeSection === id
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <span className={activeSection === id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>{icon}</span>
                {label}
                {id === 'notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
                {id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
            <div className="flex items-center gap-3">
              {currentUser.avatar ? (
                <img src={`http://localhost:3001${currentUser.avatar}`} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-slate-900" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white dark:ring-slate-900 shrink-0">
                  {currentUser.initials}
                </div>
              )}
              <div>
                <p className="text-slate-900 dark:text-white text-sm font-semibold">{currentUser.fullName}</p>
                <p className={`text-[10px] font-bold ${rColors.text}`}>{currentUser.role || 'User'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </aside>

        <main ref={scrollRef} className="flex-1 overflow-auto scroll-smooth relative overscroll-contain flex flex-col bg-slate-50 dark:bg-slate-950">
          <div className={`max-w-6xl w-full mx-auto px-4 md:px-8 py-8 flex-1 ${activeSection === 'messages' ? 'h-full' : ''}`}>
            {renderActivePage()}
          </div>

          <footer className="w-full py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 mt-auto bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shrink-0 pb-20 md:pb-4">
            © J-RSD 2026 — Tous droits réservés.
          </footer>

          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-md border-t border-slate-200/60 dark:border-white/10 flex z-30 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
            {visibleNav.slice(0, 5).map(({ id, label, icon }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => navigateToSection(id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 transition-all active:scale-95 ${
                    active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300'
                  }`}
                >
                  <div className="relative">
                    {icon}
                    {id === 'notifications' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#0A0A0A]" />
                    )}
                    {id === 'messages' && unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#0A0A0A]" />
                    )}
                  </div>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${active ? 'opacity-100' : 'opacity-70'}`}>
                    {label}
                  </span>
                  {active && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />}
                </button>
              );
            })}
          </div>
          <div className="h-20 md:hidden" />
        </main>
      </div>

      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
}
