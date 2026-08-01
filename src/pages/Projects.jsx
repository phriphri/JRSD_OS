import React, { useEffect, useState, useMemo } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { api } from '../services/api';
import {
  Plus, X, User, FolderKanban, Sparkles, MoreVertical, Search, Filter, Pencil, Trash2
} from 'lucide-react';

const TRANSLATIONS = {
  FR: {
    loading: 'Chargement...',
    projects: 'Projets',
    tracking: 'Suivi & pilotage',
    new_project: 'Nouveau Projet',
    no_projects: 'Aucun projet trouvé.',
    create_first: 'Créer le premier projet',
    no_desc: 'Aucune description',
    progress: 'Progression',
    not_assigned: 'Non assigné',
    edit_project: 'Modifier le projet',
    name: 'Nom *',
    desc: 'Description',
    start_date: 'Date début',
    end_date: 'Date fin',
    status: 'Statut',
    manager: 'Chef de Projet',
    select: '— Sélectionner —',
    collaborators: 'Collaborateurs',
    photo: 'Photo du projet',
    saving: 'Enregistrement…',
    update: 'Mettre à jour',
    create: 'Créer le projet',
    edit: 'Modifier',
    delete: 'Supprimer',
    delete_confirm: 'Supprimer ce projet définitivement ?',
    name_req: 'Le nom du projet est obligatoire.',
    err_save: 'Erreur lors de la sauvegarde.',
    search_placeholder: 'Rechercher un projet...',
    filter_all_status: 'Tous les statuts',
    load_more: 'Voir plus',
    showing: 'Affichage de',
    on: 'sur',
    statuses: {
      en_attente: 'En attente',
      en_cours: 'En cours',
      termine: 'Terminé'
    }
  },
  EN: {
    loading: 'Loading...',
    projects: 'Projects',
    tracking: 'Tracking & Management',
    new_project: 'New Project',
    no_projects: 'No projects found.',
    create_first: 'Create the first project',
    no_desc: 'No description',
    progress: 'Progress',
    not_assigned: 'Not assigned',
    edit_project: 'Edit Project',
    name: 'Name *',
    desc: 'Description',
    start_date: 'Start Date',
    end_date: 'End Date',
    status: 'Status',
    manager: 'Project Manager',
    select: '— Select —',
    collaborators: 'Collaborators',
    photo: 'Project Photo',
    saving: 'Saving…',
    update: 'Update',
    create: 'Create project',
    edit: 'Edit',
    delete: 'Delete',
    delete_confirm: 'Permanently delete this project?',
    name_req: 'Project name is required.',
    err_save: 'Error saving.',
    search_placeholder: 'Search a project...',
    filter_all_status: 'All statuses',
    load_more: 'Load more',
    showing: 'Showing',
    on: 'of',
    statuses: {
      en_attente: 'Pending',
      en_cours: 'In progress',
      termine: 'Done'
    }
  }
};

const STATUS_STYLES = {
  'En attente': 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25',
  'En cours': 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25',
  'Terminé': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25',
  'Pending': 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25',
  'In progress': 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25',
  'Done': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25',
};

function ProgressBar({ value }) {
  return (
    <div className="w-full h-1.5 bg-blue-100/80 dark:bg-white/5 rounded-full overflow-hidden ring-1 ring-inset ring-blue-200/50 dark:ring-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function ProjectImage({ src, alt }) {
  const [hasError, setHasError] = useState(!src);

  useEffect(() => {
    setHasError(!src);
  }, [src]);

  if (hasError || !src) {
    return (
      <div className="h-28 w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
        <FolderKanban className="w-8 h-8 opacity-40" />
      </div>
    );
  }

  return (
    <div className="h-28 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
      <img
        src={src}
        alt={alt || ''}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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

function buildFormData(form) {
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
    language
  } = useGlobalStore();

  const t = TRANSLATIONS[language === 'EN' ? 'EN' : 'FR'];

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const employes = users.filter((u) => u.role === 'employe');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(8);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const STATUT_OPTIONS = [
    { value: 'en_attente', label: t.statuses.en_attente },
    { value: 'en_cours', label: t.statuses.en_cours },
    { value: 'termine', label: t.statuses.termine },
  ];

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const getTranslatedStatus = (originalStatus) => {
    if (originalStatus === 'En attente' || originalStatus === 'en_attente') return t.statuses.en_attente;
    if (originalStatus === 'En cours' || originalStatus === 'en_cours') return t.statuses.en_cours;
    if (originalStatus === 'Terminé' || originalStatus === 'termine') return t.statuses.termine;
    return originalStatus;
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
        (p.managerName && p.managerName.toLowerCase().includes(search.toLowerCase()));

      const pStatus = p.statut || p.status;
      const matchesStatus =
        statusFilter === 'all' ||
        pStatus === statusFilter ||
        getTranslatedStatus(p.status) === getTranslatedStatus(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter, language]);

  const displayedProjects = filteredProjects.slice(0, visibleCount);

  const openCreate = async () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    if (isAdmin) await fetchManagers();
    setModalOpen(true);
  };

  const openEdit = async (proj, e) => {
    e?.stopPropagation();
    setActiveMenuId(null);
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
      setError(t.name_req);
      return;
    }
    setLoading(true);
    setError('');
    const fd = buildFormData(form);
    const result = editing
      ? await updateProject(editing.id, fd)
      : await createProject(fd);
    setLoading(false);
    if (result.success) {
      setModalOpen(false);
      setForm(emptyForm());
    } else {
      setError(result.message || t.err_save);
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    setActiveMenuId(null);
    if (!window.confirm(t.delete_confirm)) return;
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

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">{t.loading}</div>;
  }

  return (
    <section id="projects" className="scroll-mt-8 pb-12">
      {/* En-tête compact */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-blue-600/80 dark:text-cyan-300/80 text-xs mb-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {t.tracking}
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t.projects}</h2>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> {t.new_project}
          </button>
        )}
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(8); }}
            placeholder={t.search_placeholder}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setVisibleCount(8); }}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t.filter_all_status}</option>
            <option value="en_attente">{t.statuses.en_attente}</option>
            <option value="en_cours">{t.statuses.en_cours}</option>
            <option value="termine">{t.statuses.termine}</option>
          </select>
        </div>
      </div>

      {/* Grille de cartes compactes */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <FolderKanban className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-slate-500 dark:text-slate-400 text-xs">{t.no_projects}</p>
          {isAdmin && (
            <button type="button" onClick={openCreate} className="mt-3 text-blue-600 dark:text-cyan-400 text-xs font-semibold hover:underline">
              {t.create_first}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedProjects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => openDetail(proj)}
                className="group relative text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/40 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Image 120px max avec fallback image cassée */}
                  <ProjectImage src={proj.imageUrl} alt={proj.name} />

                  <div className="p-3.5 space-y-2.5">
                    {/* Header carte : Titre & Menu contextuel */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-slate-900 dark:text-white font-semibold text-sm leading-tight truncate flex-1" title={proj.name}>
                        {proj.name}
                      </h3>

                      {isAdmin && (
                        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === proj.id ? null : proj.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === proj.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 py-1 text-xs">
                                <button
                                  type="button"
                                  onClick={(e) => openEdit(proj, e)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-left font-medium"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> {t.edit}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(proj.id, e)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> {t.delete}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Statut pill */}
                    <div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[getTranslatedStatus(proj.status)] || STATUS_STYLES['En attente']}`}>
                        {getTranslatedStatus(proj.status)}
                      </span>
                    </div>

                    {/* Description 2 lignes max */}
                    <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-snug">
                      {proj.description || <span className="italic text-slate-400">{t.no_desc}</span>}
                    </p>

                    {/* Bar de progression */}
                    <div className="pt-1">
                      <div className="flex justify-between mb-1 text-[11px]">
                        <span className="text-slate-500 font-medium">{t.progress}</span>
                        <span className="text-blue-600 dark:text-cyan-400 font-bold">{proj.progress}%</span>
                      </div>
                      <ProgressBar value={proj.progress} />
                    </div>
                  </div>
                </div>

                {/* Chef de projet Footer */}
                <div className="px-3.5 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 truncate font-medium">
                    {proj.managerName || t.not_assigned}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bouton Voir plus / Pagination */}
          {visibleCount < filteredProjects.length && (
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400 mb-2">
                {t.showing} {displayedProjects.length} {t.on} {filteredProjects.length} {t.projects.toLowerCase()}
              </p>
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 8)}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                {t.load_more}
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal formulaire (inchangé) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editing ? t.edit_project : t.new_project}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.desc}</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t.start_date}</label>
                  <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t.end_date}</label>
                  <input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.status}</label>
                <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                  {STATUT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t.manager}</label>
                  <select value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                    <option value="">{t.select}</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName || m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {employes.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t.collaborators}</label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/50">
                    {employes.map((emp) => (
                      <label key={emp.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={form.collaborator_ids.includes(emp.id)}
                          onChange={() => toggleCollaborator(emp.id)}
                          className="rounded text-blue-600"
                        />
                        <span>{emp.fullName || emp.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.photo}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm({ ...form, image: e.target.files[0] || null })}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-slate-300"
                />
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold">
                  {t.cancel}
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50">
                  {loading ? t.saving : editing ? t.update : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal détail projet (inchangé) */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate pr-2">{detail.name}</h3>
              <button type="button" onClick={() => setDetail(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-300">{detail.description || t.no_desc}</p>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">{t.overall_prog}</p>
                <ProgressBar value={detail.progress} />
                <p className="text-[11px] text-slate-400 mt-1">{detail.taskDone || 0} / {detail.taskTotal || 0} {t.tasks_done}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">{t.manager_resp}</p>
                <p className="text-xs text-slate-800 dark:text-slate-200">{detail.managerName || t.not_assigned}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">{t.collaborators}</p>
                {detail.collaborators && detail.collaborators.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {detail.collaborators.map((c) => (
                      <span key={c.id} className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                        {c.nom_prenom || c.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">{t.no_collab}</p>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-3 p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button type="button" onClick={() => openEdit(detail)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                  {t.edit}
                </button>
                <button type="button" onClick={() => handleDelete(detail.id)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold">
                  {t.delete}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
