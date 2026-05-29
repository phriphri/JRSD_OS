import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Copy, KeyRound, Search, UserPlus, ShieldCheck, Clock } from 'lucide-react';
import { useGlobalStore } from '../store/globalStore';

function initialsFromName(nom_prenom) {
  const parts = String(nom_prenom || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] || '';
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) || '';
  return (first + last).toUpperCase();
}

function AgentAvatar({ nom_prenom }) {
  return (
    <div className="w-10 h-10 rounded-full shrink-0 bg-blue-600 flex items-center justify-center shadow-sm">
      <span className="text-xs font-bold text-white tracking-wide">{initialsFromName(nom_prenom)}</span>
    </div>
  );
}

function labelRole(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Manager';
  return 'Employé';
}

function roleBadgeClasses(role) {
  if (role === 'admin') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25';
  if (role === 'manager') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25';
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
}

function ProjectBadges({ projects }) {
  if (!projects?.length) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 max-w-full">
      {projects.map((p) => (
        <span
          key={p.id}
          className="inline-flex max-w-full truncate px-2 py-0.5 rounded-md border border-blue-200/70 dark:border-blue-500/25 bg-blue-50/60 dark:bg-blue-500/10 text-[11px] font-semibold text-blue-700 dark:text-cyan-300"
          title={p.nom}
        >
          {p.nom}
        </span>
      ))}
    </div>
  );
}

/* ─── Tab Button ─────────────────────────────────────────────── */
function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200 rounded-t-lg
        ${active
          ? 'text-white bg-white/[0.06] border-b-2 border-blue-500'
          : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent hover:border-slate-600'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export default function Agents() {
  const {
    currentUser,
    adminUsers,
    adminInvitationKey,
    fetchAdminUsers,
    updateUserStatusOrRole,
    generateInvitationKey,
  } = useGlobalStore();

  const isAdminOnly = currentUser?.role?.toLowerCase() === 'admin';

  const [activeTab, setActiveTab] = useState('collaborateurs');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (isAdminOnly) fetchAdminUsers();
  }, [isAdminOnly, fetchAdminUsers]);

  useEffect(() => {
    const close = () => setRoleMenuOpen(null);
    if (roleMenuOpen != null) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
    return undefined;
  }, [roleMenuOpen]);

  const rawKey = adminInvitationKey?.code || '';

  const registerUrl = useMemo(() => `${window.location.origin}/register`, []);

  /* ── Filtered agents based on search ── */
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return adminUsers;
    const q = searchQuery.toLowerCase();
    return adminUsers.filter((agent) => {
      const name = (agent.nom_prenom || '').toLowerCase();
      const email = (agent.email || '').toLowerCase();
      const fonction = (agent.fonction || '').toLowerCase();
      return name.includes(q) || email.includes(q) || fonction.includes(q);
    });
  }, [adminUsers, searchQuery]);

  const handleGenerate = async () => {
    setError('');
    setCopiedKey(false);
    setCopiedLink(false);
    const res = await generateInvitationKey();
    if (!res?.success) setError(res.message || 'Erreur lors de la génération.');
  };

  const handleCopyKey = async () => {
    if (!rawKey) return;
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 1500);
    } catch {
      setCopiedKey(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registerUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {
      setCopiedLink(false);
    }
  };

  const applyRole = async (id, role) => {
    setBusyId(id);
    setRoleMenuOpen(null);
    await updateUserStatusOrRole(id, { role });
    setBusyId(null);
  };

  const toggleStatus = async (agent) => {
    const next = agent.statut === 'actif' ? 'suspendu' : 'actif';
    setBusyId(agent.id);
    await updateUserStatusOrRole(agent.id, { statut: next });
    setBusyId(null);
  };

  if (!isAdminOnly) return null;

  return (
    <section id="agents" className="scroll-mt-8 pb-16">
      {/* ─── PAGE HEADER ─────────────────────────────────────── */}
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Agents</h2>
        <p className="text-slate-500 text-sm mt-1">
          {adminUsers.length} collaborateur{adminUsers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ─── TABS BAR ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-200/30 dark:border-slate-800/60 mb-6">
        <TabButton
          active={activeTab === 'collaborateurs'}
          icon={Search}
          label="Liste des collaborateurs"
          onClick={() => setActiveTab('collaborateurs')}
        />
        <TabButton
          active={activeTab === 'invitations'}
          icon={KeyRound}
          label="Invitations & Clés d'accès"
          onClick={() => setActiveTab('invitations')}
        />
      </div>

      {/* ─── ERROR BANNER ────────────────────────────────────── */}
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 1 — Liste des collaborateurs                       */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'collaborateurs' && (
        <>
          {/* ── Toolbar: Search + Invite button ── */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-1/4 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un agent..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('invitations')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/5 dark:bg-slate-800/50 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              + Inviter un agent
            </button>
          </div>

          {/* ── Agents Table ── */}
          <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200/70 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] table-fixed text-sm">
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-white/[0.03] border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 text-xs uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="text-left font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 text-xs uppercase tracking-wider">
                      Fonction
                    </th>
                    <th className="text-left font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 text-xs uppercase tracking-wider">
                      Équipe
                    </th>
                    <th className="text-left font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 text-xs uppercase tracking-wider">
                      Projets actifs
                    </th>
                    <th className="text-left font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 text-xs uppercase tracking-wider">
                      Rôle actuel
                    </th>
                    <th className="text-right font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-sm">
                        {searchQuery.trim()
                          ? 'Aucun agent ne correspond à votre recherche.'
                          : 'Aucun agent enregistré.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((agent) => {
                      const isBusy = busyId === agent.id;
                      const teamName = agent.team?.nom || '—';
                      const photoUrl = agent.avatar_url || agent.avatarUrl || null;

                      return (
                        <tr
                          key={agent.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors ${
                            agent.statut === 'suspendu' ? 'opacity-75' : ''
                          }`}
                        >
                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-3 min-w-0">
                              <AgentAvatar photoUrl={photoUrl} nom_prenom={agent.nom_prenom} />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900 dark:text-white truncate" title={agent.nom_prenom}>
                                  {agent.nom_prenom}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={agent.email}>
                                  {agent.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <p className="text-slate-700 dark:text-slate-200 truncate" title={agent.fonction || ''}>
                              {agent.fonction || '—'}
                            </p>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <p className="text-slate-700 dark:text-slate-200 truncate" title={teamName}>
                              {teamName}
                            </p>
                          </td>

                          <td className="px-4 py-4 align-middle overflow-hidden">
                            <ProjectBadges projects={agent.activeProjects} />
                          </td>

                          <td className="px-4 py-4 align-middle overflow-hidden">
                            <span
                              className={`inline-flex max-w-full px-2.5 py-1 rounded-lg border text-[11px] font-bold truncate ${roleBadgeClasses(agent.role)}`}
                            >
                              {labelRole(agent.role)}
                            </span>
                          </td>

                          <td className="px-3 py-4 align-middle overflow-visible">
                            <div className="flex flex-col items-stretch gap-1.5 w-full max-w-[200px] ml-auto">
                              <div className="relative w-full">
                                <button
                                  type="button"
                                  disabled={isBusy || agent.id === currentUser?.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRoleMenuOpen((prev) => (prev === agent.id ? null : agent.id));
                                  }}
                                  className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Changer le rôle
                                  <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
                                </button>
                                {roleMenuOpen === agent.id && (
                                  <div
                                    className="absolute right-0 top-full mt-1 z-30 w-full min-w-[148px] py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {['employe', 'manager', 'admin'].map((r) => (
                                      <button
                                        key={r}
                                        type="button"
                                        disabled={r === agent.role}
                                        onClick={() => applyRole(agent.id, r)}
                                        className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                          r === agent.role ? 'text-slate-400 cursor-default' : 'text-slate-700 dark:text-slate-200'
                                        }`}
                                      >
                                        {labelRole(r)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                disabled={isBusy || agent.id === currentUser?.id}
                                onClick={() => toggleStatus(agent)}
                                className={`w-full px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-40 ${
                                  agent.statut === 'actif'
                                    ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20'
                                    : 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                                }`}
                              >
                                {agent.statut === 'actif' ? 'Suspendre' : 'Réactiver'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 2 — Invitations & Clés d'accès                     */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'invitations' && (
        <div className="max-w-3xl mx-auto">
          {/* ── Options d'invitation ── */}
          <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200/70 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Options d&apos;invitation</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Utilisez un lien d&apos;invitation ou générez une clé unique pour permettre à un nouveau collaborateur de s&apos;inscrire.
            </p>

            {/* Zone 1 — Lien d'invitation */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Lien d&apos;invitation
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={registerUrl}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 text-sm font-mono text-slate-700 dark:text-slate-200 truncate cursor-default focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copiedLink ? 'Copié !' : "Copier le lien"}
                </button>
              </div>
            </div>

            {/* Zone 2 — Clé d'activation */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Clé d&apos;activation
              </label>
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20"
              >
                <KeyRound className="w-4 h-4" />
                Générer une clé d&apos;activation
              </button>

              {/* Affichage de la clé brute */}
              <div className="mt-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 p-4 min-h-[80px] flex items-center">
                {rawKey ? (
                  <div className="flex items-center gap-3 w-full">
                    <code className="flex-1 text-sm font-mono font-semibold text-slate-800 dark:text-emerald-300 break-all">
                      {rawKey}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedKey ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic w-full text-center">
                    Cliquez sur le bouton pour générer une clé unique d&apos;inscription.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
