import React, { useEffect, useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { api } from '../services/api';
import {
  Plus, X, Calendar, User, Users, Pencil, Trash2, FolderKanban, Sparkles,
} from 'lucide-react';

const STATUT_OPTIONS = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
];

const STATUS_STYLES = {
  'En attente': 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25',
  'En cours': 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25',
  'Terminé': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25',
};

function ProgressBar({ value, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 120 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div className="w-full h-2 bg-blue-100/80 dark:bg-white/5 rounded-full overflow-hidden ring-1 ring-inset ring-blue-200/50 dark:ring-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 transition-all duration-1000 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

const emptyForm = () => ({
  nom: '',
  description: '',
  date_debut: '',
  date_fin: '',
  statut: 'en_attente',
  manager_id: '',
  collaborator_ids: [],
  image: null,
});

function buildFormData(form, isEdit = false) {
  const fd = new FormData();
  fd.append('nom', form.nom);
  fd.append('description', form.description);
  if (form.date_debut) fd.append('date_debut', form.date_debut);
  if (form.date_fin) fd.append('date_fin', form.date_fin);
  fd.append('statut', form.statut);
  if (form.manager_id) fd.append('manager_id', String(form.manager_id));
  fd.append('collaborator_ids', JSON.stringify(form.collaborator_ids));
  if (form.image) fd.append('image', form.image);
  return fd;
}

export default function Projects() {
  const {
    projects,
    users,
    managers,
    currentUser,
    fetchProjects,
    fetchManagers,
    createProject,
    updateProject,
    deleteProject,
  } = useGlobalStore();

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const employes = users.filter((u) => u.role === 'employe');

  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openCreate = async () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    if (isAdmin) await fetchManagers();
    setModalOpen(true);
  };

  const openEdit = async (proj) => {
    setEditing(proj);
    setForm({
      nom: proj.name,
      description: proj.description || '',
      date_debut: proj.startDate || '',
      date_fin: proj.endDate || '',
      statut: proj.statut || 'en_attente',
      manager_id: proj.managerId || '',
      collaborator_ids: (proj.collaborators || []).map((c) => c.id),
      image: null,
    });
    setError('');
    if (isAdmin) await fetchManagers();
    setModalOpen(true);
    setDetail(null);
  };

  const openDetail = async (proj) => {
    try {
      const res = await api.projects.getOne(proj.id);
      if (res.success) setDetail(res.project);
    } catch {
      setDetail(proj);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) {
      setError('Le nom du projet est obligatoire.');
      return;
    }
    setLoading(true);
    setError('');
    const fd = buildFormData(form, !!editing);
    const result = editing
      ? await updateProject(editing.id, fd)
      : await createProject(fd);
    setLoading(false);
    if (result.success) {
      setModalOpen(false);
      setForm(emptyForm());
    } else {
      setError(result.message || 'Erreur lors de la sauvegarde.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce projet définitivement ?')) return;
    const result = await deleteProject(id);
    if (result.success) setDetail(null);
  };

  const toggleCollaborator = (userId) => {
    setForm((f) => ({
      ...f,
      collaborator_ids: f.collaborator_ids.includes(userId)
        ? f.collaborator_ids.filter((id) => id !== userId)
        : [...f.collaborator_ids, userId],
    }));
  };

  return (
    <section id="projects" className="scroll-mt-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-blue-600/80 dark:text-cyan-300/80 text-sm mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Suivi & pilotage
          </p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Projets</h2>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Nouveau Projet
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-blue-200 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/5">
          <FolderKanban className="w-12 h-12 mx-auto text-blue-300 dark:text-cyan-400/50 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Aucun projet pour le moment.</p>
          {isAdmin && (
            <button type="button" onClick={openCreate} className="mt-4 text-blue-600 dark:text-cyan-300 text-sm font-semibold hover:underline">
              Créer le premier projet
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((proj, i) => (
            <button
              key={proj.id}
              type="button"
              onClick={() => openDetail(proj)}
              className="text-left bg-white dark:bg-[#0A0A0A] border border-blue-100/80 dark:border-blue-500/15 hover:border-blue-300 dark:hover:border-cyan-500/35 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 group"
            >
              {proj.imageUrl && (
                <div className="h-36 w-full overflow-hidden bg-blue-50 dark:bg-slate-900">
                  <img src={proj.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-5 md:p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-slate-900 dark:text-white font-semibold text-lg leading-tight">{proj.name}</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${STATUS_STYLES[proj.status] || STATUS_STYLES['En attente']}`}>
                    {proj.status}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{proj.description || <span className="italic text-slate-400">Aucune description fournie</span>}</p>
                <div>
                  <div className="flex justify-between mb-2 text-xs">
                    <span className="text-slate-500 font-medium">Progression</span>
                    <span className="text-blue-600 dark:text-cyan-300 font-bold">{proj.progress}%</span>
                  </div>
                  <ProgressBar value={proj.progress} delay={i * 80} />
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-blue-100/60 dark:border-white/10">
                  <User className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                    {proj.managerName || 'Non assigné'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal formulaire */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-blue-100 dark:border-blue-500/20">
            <div className="flex items-center justify-between p-5 border-b border-blue-100 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Modifier le projet' : 'Nouveau Projet'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nom *</label>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Date début</label>
                  <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Date fin</label>
                  <input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Statut</label>
                <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                  {STATUT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Chef de Projet</label>
                <select value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                  <option value="">— Sélectionner —</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName || m.nom_prenom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Collaborateurs</label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  {employes.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleCollaborator(u.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.collaborator_ids.includes(u.id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {u.fullName || u.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Photo du projet</label>
                <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })}
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold text-sm disabled:opacity-50">
                {loading ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer le projet'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Vue détail */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-blue-100 dark:border-blue-500/20">
            {detail.imageUrl && (
              <div className="h-48 w-full overflow-hidden rounded-t-2xl">
                <img src={detail.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border mb-2 ${STATUS_STYLES[detail.status]}`}>
                    {detail.status}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{detail.name}</h3>
                </div>
                <button type="button" onClick={() => setDetail(null)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/5">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-6">
                <p className="text-xs font-semibold text-slate-500 mb-2">Progression globale</p>
                <ProgressBar value={detail.progress} />
                <p className="text-right text-sm font-bold text-blue-600 dark:text-cyan-300 mt-1">{detail.progress}%</p>
                <p className="text-xs text-slate-400 mt-1">{detail.taskDone || 0} / {detail.taskTotal || 0} tâches terminées</p>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">{detail.description || <span className="italic text-slate-400">Aucune description fournie</span>}</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>Début : {detail.startDate || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span>Fin : {detail.endDate || '—'}</span>
                </div>
              </div>
              <div className="mb-6 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/15">
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Manager responsable</p>
                <p className="font-semibold text-slate-900 dark:text-white">{detail.managerName || 'Non assigné'}</p>
                {detail.managerEmail && <p className="text-xs text-slate-500">{detail.managerEmail}</p>}
              </div>
              <div className="mb-6">
                <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Collaborateurs</p>
                {(detail.collaborators || []).length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun collaborateur assigné.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detail.collaborators.map((c) => (
                      <span key={c.id} className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-emerald-500/20 text-slate-700 dark:text-slate-200">
                        {c.nom_prenom}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-3 pt-4 border-t border-blue-100 dark:border-white/10">
                  <button type="button" onClick={() => openEdit(detail)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 dark:border-blue-500/30 text-sm font-semibold text-blue-600 dark:text-cyan-300 hover:bg-blue-50 dark:hover:bg-blue-500/10">
                    <Pencil className="w-4 h-4" /> Modifier
                  </button>
                  <button type="button" onClick={() => handleDelete(detail.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 text-sm font-semibold hover:bg-red-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
