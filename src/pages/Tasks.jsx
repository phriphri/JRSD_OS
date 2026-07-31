import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useGlobalStore } from '../store/globalStore';
import { api } from '../services/api';

const TRANSLATIONS = {
  FR: {
    status: { a_faire: 'À faire', en_cours: 'En cours', bloque: 'Bloqué', termine: 'Terminé' },
    loading: 'Chargement...', no_tasks: 'Aucune tâche assignée.', overdue: 'En retard',
    desc: 'Descriptif', project: 'Projet :', deadline: 'Deadline :', status_lbl: 'Statut',
    desc_evo: 'Descriptif & évolution', desc_ph: 'Décrivez votre avancement, blocages, prochaines étapes…',
    sync_msg: 'Le statut est synchronisé avec le serveur MySQL.', cancel: 'Annuler',
    save: 'Enregistrer', saving: 'Enregistrement…', new_task: 'Nouvelle Tâche',
    proj: 'Projet', sel_proj: 'Sélectionner un projet', assign: 'Assigner à (tous les utilisateurs)',
    collab: 'Collaborateur du projet', sel_user: 'Choisir un utilisateur', sel_collab: 'Choisir un collaborateur',
    title: 'Titre', desc_opt: 'Description (optionnel)', create: 'Créer', creating: 'Création…',
    op_mgmt: 'Gestion opérationnelle', my_tasks: 'Mes Tâches', tasks_assigned: 'assignée', tasks_assigned_plur: 'assignées',
    task_word: 'tâche', task_word_plur: 'tâches'
  },
  EN: {
    status: { a_faire: 'To do', en_cours: 'In progress', bloque: 'Blocked', termine: 'Done' },
    loading: 'Loading...', no_tasks: 'No tasks assigned.', overdue: 'Overdue',
    desc: 'Description', project: 'Project :', deadline: 'Deadline :', status_lbl: 'Status',
    desc_evo: 'Description & progress', desc_ph: 'Describe your progress, blockers, next steps…',
    sync_msg: 'Status is synchronized with the MySQL server.', cancel: 'Cancel',
    save: 'Save', saving: 'Saving…', new_task: 'New Task',
    proj: 'Project', sel_proj: 'Select a project', assign: 'Assign to (all users)',
    collab: 'Project collaborator', sel_user: 'Choose a user', sel_collab: 'Choose a collaborator',
    title: 'Title', desc_opt: 'Description (optional)', create: 'Create', creating: 'Creating…',
    op_mgmt: 'Operational Management', my_tasks: 'My Tasks', tasks_assigned: 'assigned', tasks_assigned_plur: 'assigned',
    task_word: 'task', task_word_plur: 'tasks'
  }
};

const STATUS_STYLES = {
  a_faire: { classes: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  en_cours: { classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  bloque: { classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
  termine: { classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

function isOverdue(task) {
  const d = task.deadline || task.dueDate;
  if (!d || task.statut === 'termine') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(d);
  deadline.setHours(0, 0, 0, 0);
  return deadline < today;
}

const emptyForm = () => ({ project_id: '', assignee_id: '', titre: '', description: '', deadline: '' });

export default function Tasks() {
  const { currentUser, taskList, projects, users, fetchMyTaskList, fetchProjects, fetchUsers, updateTaskStatus, createTask, language } = useGlobalStore();

  if (!currentUser) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  const t = TRANSLATIONS[language === 'EN' ? 'EN' : 'FR'];
  const role = currentUser?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const canCreate = isAdmin || isManager;

  const STATUS_OPTIONS = [
    { id: 'a_faire', label: t.status.a_faire },
    { id: 'en_cours', label: t.status.en_cours },
    { id: 'bloque', label: t.status.bloque },
    { id: 'termine', label: t.status.termine },
  ];

  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [panelStatut, setPanelStatut] = useState('a_faire');
  const [panelEvolution, setPanelEvolution] = useState('');
  const [panelSaving, setPanelSaving] = useState(false);
  const [panelError, setPanelError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [collaborators, setCollaborators] = useState([]);
  const [loadingCollab, setLoadingCollab] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchMyTaskList();
      if (canCreate) {
        await fetchProjects();
        if (isAdmin) await fetchUsers();
      }
      setLoading(false);
    };
    load();
  }, [fetchMyTaskList, fetchProjects, fetchUsers, canCreate, isAdmin]);

  const managedProjects = isAdmin ? projects : projects.filter((p) => Number(p.managerId) === Number(currentUser?.id));
  const assigneeOptions = isAdmin ? users : collaborators;

  const openPanel = (task) => {
    setSelectedTask(task);
    setPanelStatut(task.statut);
    setPanelEvolution(task.description || '');
    setPanelError('');
  };

  const closePanel = () => {
    setSelectedTask(null);
    setPanelError('');
  };

  const savePanel = async () => {
    if (!selectedTask) return;
    setPanelSaving(true);
    setPanelError('');
    const result = await updateTaskStatus(selectedTask.id, panelStatut);
    setPanelSaving(false);
    if (!result.success) {
      setPanelError(result.message || 'Error');
      return;
    }
    closePanel();
  };

  const openCreate = () => {
    setForm(emptyForm());
    setCollaborators([]);
    setFormError('');
    setModalOpen(true);
  };

  const onProjectChange = async (projectId) => {
    setForm((prev) => ({ ...prev, project_id: projectId, assignee_id: '' }));
    if (!isManager || !projectId) {
      setCollaborators([]);
      return;
    }
    setLoadingCollab(true);
    try {
      const res = await api.projects.getOne(projectId);
      setCollaborators(res.project?.collaborators || []);
    } catch {
      setCollaborators([]);
    } finally {
      setLoadingCollab(false);
    }
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.project_id || !form.assignee_id || !form.titre.trim()) {
      setFormError('Error');
      return;
    }
    setFormLoading(true);
    const result = await createTask({
      project_id: Number(form.project_id),
      assignee_id: Number(form.assignee_id),
      titre: form.titre.trim(),
      description: form.description?.trim() || '',
      deadline: form.deadline || null,
    });
    setFormLoading(false);
    if (!result.success) {
      setFormError(result.message || 'Error');
      return;
    }
    setModalOpen(false);
    await fetchMyTaskList();
  };

  return (
    <section id="tasks" className="scroll-mt-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">{t.op_mgmt}</p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t.my_tasks}</h2>
          <p className="text-slate-500 text-sm mt-1">
            {taskList.length} {taskList.length !== 1 ? t.task_word_plur : t.task_word} {taskList.length !== 1 ? t.tasks_assigned_plur : t.tasks_assigned}
          </p>
        </div>
        {canCreate && (
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shrink-0">
            <Plus className="w-4 h-4" />
            {t.new_task}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-slate-500 text-sm">{t.loading}</p>
        ) : taskList.length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">{t.no_tasks}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
                  <th className="text-left font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">{t.title}</th>
                  <th className="text-left font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">{t.proj}</th>
                  <th className="text-left font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">{t.deadline}</th>
                  <th className="text-left font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">{t.status_lbl}</th>
                  <th className="text-right font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {taskList.map((task) => {
                  const sStyle = STATUS_STYLES[task.statut] || STATUS_STYLES.a_faire;
                  const overdue = isOverdue(task);
                  const deadline = task.deadline || task.dueDate;
                  return (
                    <tr key={task.id} onClick={() => openPanel(task)} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{task.title}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{task.projectName || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {deadline || '—'}
                        {overdue && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400">
                            {t.overdue}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${sStyle.classes}`}>
                          {t.status[task.statut] || t.status.a_faire}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={(e) => { e.stopPropagation(); openPanel(task); }} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                          {t.desc}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closePanel} aria-label="Fermer" />
          <aside className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white pr-4">{selectedTask.title}</h3>
              <button type="button" onClick={closePanel} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-xs text-slate-500">
                <span className="font-semibold">{t.project}</span> {selectedTask.projectName || '—'}
              </p>
              <p className="text-xs text-slate-500">
                <span className="font-semibold">{t.deadline}</span> {selectedTask.deadline || selectedTask.dueDate || '—'}
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t.status_lbl}</label>
                <select value={panelStatut} onChange={(e) => setPanelStatut(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                  {STATUS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t.desc_evo}</label>
                <textarea rows={8} value={panelEvolution} onChange={(e) => setPanelEvolution(e.target.value)} placeholder={t.desc_ph} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none" />
                <p className="text-[11px] text-slate-400 mt-1">{t.sync_msg}</p>
              </div>
              {panelError && <p className="text-sm text-red-500">{panelError}</p>}
            </div>
            <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-end">
              <button type="button" onClick={closePanel} className="px-4 py-2 rounded-xl border text-sm">{t.cancel}</button>
              <button type="button" onClick={savePanel} disabled={panelSaving} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                {panelSaving ? t.saving : t.save}
              </button>
            </div>
          </aside>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{t.new_task}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onCreate} className="p-4 sm:p-5 space-y-4 flex-1">
              {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{formError}</p>}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.proj}</label>
                <select value={form.project_id} onChange={(e) => onProjectChange(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" required>
                  <option value="">{t.sel_proj}</option>
                  {managedProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{isAdmin ? t.assign : t.collab}</label>
                <select value={form.assignee_id} onChange={(e) => setForm((prev) => ({ ...prev, assignee_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" required disabled={isManager && (!form.project_id || loadingCollab)}>
                  <option value="">{isAdmin ? t.sel_user : loadingCollab ? t.loading : t.sel_collab}</option>
                  {assigneeOptions.map((person) => <option key={person.id} value={person.id}>{person.nom_prenom || person.fullName || person.name}{person.email ? ` (${person.email})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.title}</label>
                <input value={form.titre} onChange={(e) => setForm((prev) => ({ ...prev, titre: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.desc_opt}</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.deadline}</label>
                <input type="date" value={form.deadline} onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border text-sm">{t.cancel}</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                  {formLoading ? t.creating : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
