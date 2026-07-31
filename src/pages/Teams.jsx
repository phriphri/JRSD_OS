import React, { useEffect, useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import {
  Plus, X, Users, Pencil, Trash2, UserPlus, Building2, UserMinus,
} from 'lucide-react';
import { api } from '../services/api';

const TRANSLATIONS = {
  FR: {
    loading: 'Chargement...',
    roles: { admin: 'Administrateur', manager: 'Manager', employe: 'Employé' },
    remove_team: "Retirer de l'équipe",
    organization: 'Organisation',
    teams: 'Équipes',
    create_team: 'Créer une équipe',
    no_teams: 'Aucune équipe configurée.',
    create_first_team: 'Créer la première équipe',
    member: 'membre',
    members: 'membres',
    no_desc: 'Aucune description.',
    no_desc_prov: 'Aucune description renseignée.',
    team_detail: "Détail de l'équipe",
    add_member: 'Ajouter un membre',
    choose_user: '— Choisir un utilisateur —',
    other_team: ' (autre équipe)',
    add: 'Ajouter',
    all_users_in_team: 'Tous les utilisateurs sont déjà dans cette équipe.',
    no_members_attached: 'Aucun membre rattaché à cette équipe pour le moment.',
    select_team: 'Sélectionnez une équipe.',
    edit: 'Modifier',
    delete_confirm: 'Supprimer cette équipe ? Les membres seront détachés.',
    edit_team: "Modifier l'équipe",
    new_team: 'Nouvelle équipe',
    name: 'Nom *',
    name_ph: 'Ex: Équipe Dev',
    desc: 'Description',
    desc_ph: 'Mission et périmètre de l\'équipe…',
    team_members_label: 'Membres de l\'équipe',
    loading_users: 'Chargement des utilisateurs…',
    selected: 'sélectionné',
    selected_plur: 'sélectionnés',
    saving: 'Enregistrement…',
    update: 'Mettre à jour',
    create: 'Créer l\'équipe',
    name_req: 'Le nom de l\'équipe est obligatoire.',
    err_save: 'Erreur lors de la sauvegarde.'
  },
  EN: {
    loading: 'Loading...',
    roles: { admin: 'Administrator', manager: 'Manager', employe: 'Employee' },
    remove_team: 'Remove from team',
    organization: 'Organization',
    teams: 'Teams',
    create_team: 'Create a team',
    no_teams: 'No teams configured.',
    create_first_team: 'Create the first team',
    member: 'member',
    members: 'members',
    no_desc: 'No description.',
    no_desc_prov: 'No description provided.',
    team_detail: 'Team Detail',
    add_member: 'Add a member',
    choose_user: '— Choose a user —',
    other_team: ' (other team)',
    add: 'Add',
    all_users_in_team: 'All users are already in this team.',
    no_members_attached: 'No members attached to this team yet.',
    select_team: 'Select a team.',
    edit: 'Edit',
    delete_confirm: 'Delete this team? Members will be detached.',
    edit_team: 'Edit team',
    new_team: 'New team',
    name: 'Name *',
    name_ph: 'Ex: Dev Team',
    desc: 'Description',
    desc_ph: 'Team mission and scope…',
    team_members_label: 'Team Members',
    loading_users: 'Loading users…',
    selected: 'selected',
    selected_plur: 'selected',
    saving: 'Saving…',
    update: 'Update',
    create: 'Create team',
    name_req: 'Team name is required.',
    err_save: 'Error saving.'
  }
};

function MemberCard({ member, onRemove, canRemove, t }) {
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
        <p className="text-[10px] text-slate-400 mt-0.5">{t.roles[member.role] || member.role}</p>
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
          title={t.remove_team}
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
    language
  } = useGlobalStore();

  const t = TRANSLATIONS[language === 'EN' ? 'EN' : 'FR'];

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">{t.loading}</div>;
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
      setError(t.name_req);
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
      setError(result.message || t.err_save);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.delete_confirm)) return;
    const result = await deleteTeam(id);
    if (result.success) setPanelOpen(false);
  };

  return (
    <section id="teams" className="scroll-mt-8 pb-16">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-blue-600/80 dark:text-cyan-300/80 text-sm mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> {t.organization}
          </p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t.teams}</h2>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> {t.create_team}
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-blue-200 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/5">
          <Users className="w-12 h-12 mx-auto text-blue-300 dark:text-cyan-400/50 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t.no_teams}</p>
          {isAdmin && (
            <button type="button" onClick={openCreate} className="mt-4 text-blue-600 dark:text-cyan-300 text-sm font-semibold hover:underline">
              {t.create_first_team}
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
                  {team.memberCount} {team.memberCount !== 1 ? t.members : t.member}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{team.nom}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {team.description || t.no_desc}
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.team_detail}</h3>
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
                      {activeTeam.description || t.no_desc_prov}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">{t.add_member}</p>
                      <div className="flex gap-2">
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                        >
                          <option value="">{t.choose_user}</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nom_prenom}{u.team_id ? t.other_team : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddMember}
                          disabled={!selectedUserId || addingMember}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 shrink-0"
                        >
                          {addingMember ? '…' : t.add}
                        </button>
                      </div>
                      {availableUsers.length === 0 && (
                        <p className="text-[11px] text-slate-400 mt-2">{t.all_users_in_team}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-blue-500" />
                      {t.team_members_label} ({teamMembers.length})
                    </p>
                    {loadingMembers ? (
                      <p className="text-sm text-slate-400">{t.loading}</p>
                    ) : teamMembers.length === 0 ? (
                      <p className="text-sm text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-dashed border-slate-200 dark:border-slate-700">
                        {t.no_members_attached}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {teamMembers.map((m) => (
                          <MemberCard
                            key={m.id}
                            member={m}
                            canRemove={isAdmin}
                            onRemove={handleRemoveMember}
                            t={t}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-slate-400 text-sm">{t.select_team}</p>
              )}
            </div>

            {isAdmin && activeTeam && (
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <button type="button" onClick={openEdit}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 dark:border-blue-500/30 text-sm font-semibold text-blue-600 dark:text-cyan-300 hover:bg-blue-50 dark:hover:bg-blue-500/10">
                  <Pencil className="w-4 h-4" /> {t.edit}
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
                {editing ? t.edit_team : t.new_team}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 flex-1">
              {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.name}</label>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder={t.name_ph}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.desc}</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t.desc_ph}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">{t.team_members_label}</label>
                {users.length === 0 ? (
                  <p className="text-xs text-slate-400">{t.loading_users}</p>
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
                  {form.memberIds.length} {form.memberIds.length !== 1 ? t.selected_plur : t.selected}
                </p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold text-sm disabled:opacity-50 shrink-0">
                {loading ? t.saving : editing ? t.update : t.create}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
