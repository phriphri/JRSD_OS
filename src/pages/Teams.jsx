import React, { useEffect, useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import {
  Plus, X, Users, Pencil, Trash2, UserPlus, Building2, UserMinus,
} from 'lucide-react';
import { api } from '../services/api';

const ROLE_LABELS = {
  admin: 'Administrateur',
  manager: 'Manager',
  employe: 'Employé',
};

function MemberCard({ member, onRemove, canRemove }) {
  const initials = member.nom_prenom
    ? member.nom_prenom.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : '??';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
      <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{member.nom_prenom}</p>
        <p className="text-xs text-blue-600 dark:text-cyan-400 font-medium truncate">
          {member.fonction || '—'}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">{ROLE_LABELS[member.role] || member.role}</p>
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
          title="Retirer de l'équipe"
        >
          <UserMinus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function Teams() {
  const {
    teams,
    teamMembers,
    activeTeam,
    currentUser,
    users,
    fetchTeams,
    fetchUsers,
    fetchTeamMembers,
    addTeamMember,
    removeTeamMember,
    createTeam,
    updateTeam,
    deleteTeam,
  } = useGlobalStore();

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  }

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const [modalOpen, setModalOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', description: '', memberIds: [] });
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const openCreate = async () => {
    setEditing(null);
    setForm({ nom: '', description: '', memberIds: [] });
    setError('');
    await fetchUsers();
    setModalOpen(true);
  };

  const openEdit = async () => {
    if (!activeTeam) return;
    setEditing(activeTeam);
    setError('');
    await fetchUsers();
    const res = await fetchTeamMembers(activeTeam.id);
    const ids = res?.success
      ? useGlobalStore.getState().teamMembers.map((m) => m.id)
      : [];
    setForm({
      nom: activeTeam.nom,
      description: activeTeam.description || '',
      memberIds: ids,
    });
    setModalOpen(true);
  };

  const toggleFormMember = (userId) => {
    const id = Number(userId);
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id)
        ? f.memberIds.filter((x) => x !== id)
        : [...f.memberIds, id],
    }));
  };

  const loadAvailableUsers = async (teamId) => {
    if (!isAdmin) return;
    try {
      const res = await api.teams.getAvailableUsers(teamId);
      if (res.success) setAvailableUsers(res.users);
    } catch {
      setAvailableUsers([]);
    }
  };

  const openTeam = async (team) => {
    setPanelOpen(true);
    setSelectedUserId('');
    setLoadingMembers(true);
    await fetchTeamMembers(team.id);
    await loadAvailableUsers(team.id);
    setLoadingMembers(false);
  };

  const handleAddMember = async () => {
    if (!activeTeam || !selectedUserId) return;
    setAddingMember(true);
    const result = await addTeamMember(activeTeam.id, Number(selectedUserId));
    setAddingMember(false);
    if (result.success) {
      setSelectedUserId('');
      await loadAvailableUsers(activeTeam.id);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!activeTeam) return;
    const result = await removeTeamMember(activeTeam.id, userId);
    if (result.success) await loadAvailableUsers(activeTeam.id);
  };

  const closePanel = () => {
    setPanelOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) {
      setError('Le nom de l\'équipe est obligatoire.');
      return;
    }
    setLoading(true);
    setError('');
    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim(),
      member_ids: form.memberIds,
    };
    const result = editing
      ? await updateTeam(editing.id, payload)
      : await createTeam(payload);
    setLoading(false);
    if (result.success) {
      setModalOpen(false);
      if (panelOpen && (editing || result.team)) {
        await fetchTeamMembers(editing?.id || result.team.id);
      }
    } else {
      setError(result.message || 'Erreur lors de la sauvegarde.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette équipe ? Les membres seront détachés.')) return;
    const result = await deleteTeam(id);
    if (result.success) setPanelOpen(false);
  };

  return (
    <section id="teams" className="scroll-mt-8 pb-16">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-blue-600/80 dark:text-cyan-300/80 text-sm mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Organisation
          </p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Équipes</h2>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Créer une équipe
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-blue-200 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/5">
          <Users className="w-12 h-12 mx-auto text-blue-300 dark:text-cyan-400/50 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Aucune équipe configurée.</p>
          {isAdmin && (
            <button type="button" onClick={openCreate} className="mt-4 text-blue-600 dark:text-cyan-300 text-sm font-semibold hover:underline">
              Créer la première équipe
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => openTeam(team)}
              className={`text-left bg-white dark:bg-[#0A0A0A] border rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                activeTeam?.id === team.id && panelOpen
                  ? 'border-blue-400 dark:border-cyan-500/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200/80 dark:border-blue-500/15 hover:border-blue-300 dark:hover:border-cyan-500/35'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-cyan-300 border border-blue-200/60 dark:border-blue-500/25">
                  {team.memberCount} membre{team.memberCount !== 1 ? 's' : ''}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{team.nom}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {team.description || 'Aucune description.'}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Panneau latéral — détail équipe */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={closePanel} aria-hidden />
          <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-blue-100 dark:border-blue-500/20 shadow-2xl flex flex-col animate-[slideIn_0.25s_ease-out]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Détail de l&apos;équipe</h3>
              <button type="button" onClick={closePanel} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {activeTeam ? (
                <>
                  <div>
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{activeTeam.nom}</h4>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeTeam.description || 'Aucune description renseignée.'}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Ajouter un membre</p>
                      <div className="flex gap-2">
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                        >
                          <option value="">— Choisir un utilisateur —</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nom_prenom}{u.team_id ? ' (autre équipe)' : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddMember}
                          disabled={!selectedUserId || addingMember}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 shrink-0"
                        >
                          {addingMember ? '…' : 'Ajouter'}
                        </button>
                      </div>
                      {availableUsers.length === 0 && (
                        <p className="text-[11px] text-slate-400 mt-2">Tous les utilisateurs sont déjà dans cette équipe.</p>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-blue-500" />
                      Membres ({teamMembers.length})
                    </p>
                    {loadingMembers ? (
                      <p className="text-sm text-slate-400">Chargement…</p>
                    ) : teamMembers.length === 0 ? (
                      <p className="text-sm text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-dashed border-slate-200 dark:border-slate-700">
                        Aucun membre rattaché à cette équipe pour le moment.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {teamMembers.map((m) => (
                          <MemberCard
                            key={m.id}
                            member={m}
                            canRemove={isAdmin}
                            onRemove={handleRemoveMember}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-slate-400 text-sm">Sélectionnez une équipe.</p>
              )}
            </div>

            {isAdmin && activeTeam && (
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <button type="button" onClick={openEdit}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 dark:border-blue-500/30 text-sm font-semibold text-blue-600 dark:text-cyan-300 hover:bg-blue-50 dark:hover:bg-blue-500/10">
                  <Pencil className="w-4 h-4" /> Modifier
                </button>
                <button type="button" onClick={() => handleDelete(activeTeam.id)}
                  className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </aside>
        </>
      )}

      {/* Modal création / édition */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-blue-100 dark:border-blue-500/20 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-blue-100 dark:border-white/10 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Modifier l\'équipe' : 'Nouvelle équipe'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 flex-1">
              {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nom *</label>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex: Équipe Dev"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mission et périmètre de l'équipe…"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Membres de l&apos;équipe</label>
                {users.length === 0 ? (
                  <p className="text-xs text-slate-400">Chargement des utilisateurs…</p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleFormMember(u.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          form.memberIds.includes(u.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                        }`}
                      >
                        {u.fullName || u.name || u.email}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {form.memberIds.length} membre{form.memberIds.length !== 1 ? 's' : ''} sélectionné{form.memberIds.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold text-sm disabled:opacity-50 shrink-0">
                {loading ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer l\'équipe'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
