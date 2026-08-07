import React, { useEffect, useState, useMemo } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { Search, Filter, ChevronDown, Check } from 'lucide-react';

export const TASK_COLUMNS = [
  { id: 'a_faire', dot: 'bg-slate-400 dark:bg-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/50' },
  { id: 'en_cours', dot: 'bg-indigo-500', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10' },
  { id: 'bloque', dot: 'bg-red-500', bg: 'bg-red-50/50 dark:bg-red-900/10' },
  { id: 'termine', dot: 'bg-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
];

const TRANSLATIONS = {
  FR: {
    title: "Tableau Kanban",
    subtitleAdmin: "Vue globale — toutes les tâches",
    subtitleManager: "Vue équipe — projets gérés",
    subtitleUser: "Vos tâches en colonnes",
    loading: "Chargement du tableau…",
    empty: "Aucune tâche",
    overdue: "RETARD",
    noProject: "Hors Projet",
    searchPlaceholder: "Rechercher une tâche…",
    allProjects: "Tous les projets",
    moveTaskTo: "Déplacer vers",
    columns: {
      a_faire: "À faire",
      en_cours: "En cours",
      bloque: "Bloqué",
      termine: "Terminé"
    }
  },
  EN: {
    title: "Kanban Board",
    subtitleAdmin: "Global view — all tasks",
    subtitleManager: "Team view — managed projects",
    subtitleUser: "Your tasks in columns",
    loading: "Loading board…",
    empty: "No tasks",
    overdue: "OVERDUE",
    noProject: "No Project",
    searchPlaceholder: "Search a task…",
    allProjects: "All projects",
    moveTaskTo: "Move to",
    columns: {
      a_faire: "To Do",
      en_cours: "In Progress",
      bloque: "Blocked",
      termine: "Done"
    }
  }
};

function isOverdue(task) {
  if (!task.deadline && !task.dueDate) return false;
  if (task.statut === 'termine' || task.status === 'termine') return false;
  const deadline = new Date(task.deadline || task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return deadline < today;
}

function formatDeadline(task) {
  const dateStr = task.deadline || task.dueDate;
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function Kanban() {
  const { kanbanBoard, fetchKanbanBoard, moveTask, currentUser, language } = useGlobalStore();
  const [activeDragId, setActiveDragId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTouch] = useState(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

  // Mobile state
  const [selectedMobileTab, setSelectedMobileTab] = useState('a_faire');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [openMoveMenuId, setOpenMoveMenuId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchKanbanBoard();
      setLoading(false);
    };
    load();
  }, [fetchKanbanBoard]);

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  }

  const t = TRANSLATIONS[language === 'EN' ? 'EN' : 'FR'];

  // List of unique project names for filter dropdown
  const projectList = useMemo(() => {
    const names = new Set();
    kanbanBoard.forEach((task) => {
      if (task.projectName) names.add(task.projectName);
    });
    return Array.from(names);
  }, [kanbanBoard]);

  // Filtered tasks by search query & project filter
  const filteredTasks = useMemo(() => {
    return kanbanBoard.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(search.toLowerCase()));

      const matchesProject =
        projectFilter === 'all' ||
        (projectFilter === 'none' && !task.projectName) ||
        task.projectName === projectFilter;

      return matchesSearch && matchesProject;
    });
  }, [kanbanBoard, search, projectFilter]);

  const tasksByStatus = useMemo(() => {
    return TASK_COLUMNS.reduce((acc, col) => {
      acc[col.id] = filteredTasks
        .filter((task) => (task.statut || task.status) === col.id)
        .sort((a, b) => {
          const da = a.deadline || a.dueDate;
          const db = b.deadline || b.dueDate;
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return new Date(da) - new Date(db);
        });
      return acc;
    }, {});
  }, [filteredTasks]);

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', String(taskId));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => setActiveDragId(taskId), 0);
  };

  const onDragEnd = () => {
    setActiveDragId(null);
    setDragOverCol(null);
  };

  const onDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) setDragOverCol(colId);
  };

  const onDragLeave = (_e, colId) => {
    if (dragOverCol === colId) setDragOverCol(null);
  };

  const onDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData('text/plain'));
    setDragOverCol(null);
    setActiveDragId(null);
    const task = kanbanBoard.find((task) => task.id === taskId);
    if (!task || (task.statut || task.status) === newStatus) return;
    setUpdatingId(taskId);
    await moveTask(taskId, newStatus);
    setUpdatingId(null);
  };

  const handleStatusClick = async (task, newStatus) => {
    setOpenMoveMenuId(null);
    if ((task.statut || task.status) === newStatus) return;
    setUpdatingId(task.id);
    await moveTask(task.id, newStatus);
    setUpdatingId(null);
  };

  const role = currentUser?.role?.toLowerCase();
  const subtitle = role === 'admin'
    ? t.subtitleAdmin
    : role === 'manager'
      ? t.subtitleManager
      : t.subtitleUser;

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <section id="kanban" className="scroll-mt-8 mb-12">
      {/* Header */}
      <div className="mb-4">
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">{subtitle}</p>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t.title}</h2>
      </div>

      {/* Search & Project Filter */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {projectList.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t.allProjects}</option>
              <option value="none">{t.noProject}</option>
              {projectList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-500 py-12 text-center">{t.loading}</p>
      ) : (
        <>
          {/* ── MOBILE KANBAN (single column tab view) ── */}
          <div className="block md:hidden">
            {/* 4 Status Tabs at the top */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl mb-4">
              {TASK_COLUMNS.map((col) => {
                const count = (tasksByStatus[col.id] || []).length;
                const active = selectedMobileTab === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedMobileTab(col.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all text-center ${
                      active
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm font-semibold'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className="text-[11px] truncate">{t.columns[col.id]}</span>
                    </div>
                    <span className={`text-[10px] font-bold mt-0.5 px-1.5 rounded-full ${
                      active ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Task List for Selected Tab */}
            <div className="space-y-2.5">
              {(tasksByStatus[selectedMobileTab] || []).length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t.empty}</p>
                </div>
              ) : (
                tasksByStatus[selectedMobileTab].map((task) => {
                  const overdue = isOverdue(task);
                  const isUpdating = updatingId === task.id;
                  const currentStatus = task.statut || task.status;

                  return (
                    <div
                      key={task.id}
                      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-sm ${
                        isUpdating ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          task.projectName
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {task.projectName || t.noProject}
                        </span>

                        {/* Menu unique "Déplacer vers" */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMoveMenuId(openMoveMenuId === task.id ? null : task.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                          >
                            <span>{t.moveTaskTo}</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {openMoveMenuId === task.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMoveMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 py-1 text-xs">
                                {TASK_COLUMNS.map((col) => {
                                  const isCurrent = col.id === currentStatus;
                                  return (
                                    <button
                                      key={col.id}
                                      type="button"
                                      onClick={() => handleStatusClick(task, col.id)}
                                      disabled={isCurrent}
                                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] ${
                                        isCurrent
                                          ? 'opacity-40 font-semibold'
                                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                                        <span>{t.columns[col.id]}</span>
                                      </div>
                                      {isCurrent && <Check className="w-3 h-3" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Title & 2-line description max */}
                      <h4 className="text-xs font-semibold text-gray-800 dark:text-white leading-snug line-clamp-2" title={task.title}>
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-2 mt-1 leading-snug">
                          {task.description}
                        </p>
                      )}

                      {/* Footer assigné & deadline */}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                        <div className="flex items-center gap-1.5">
                          {(task.deadline || task.dueDate) && (
                            <span className={`text-[10px] font-medium flex items-center gap-1 ${
                              overdue ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-gray-500'
                            }`}>
                              🕒 {formatDeadline(task)}
                            </span>
                          )}
                          {overdue && (
                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-red-500/10 text-red-500 border border-red-500/20 rounded">
                              {t.overdue}
                            </span>
                          )}
                        </div>

                        {task.assigneeName && (
                          <div className="flex items-center gap-1" title={`Assigné à : ${task.assigneeName}`}>
                            <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold flex items-center justify-center shrink-0">
                              {getInitials(task.assigneeName)}
                            </div>
                            <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{task.assigneeName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── DESKTOP KANBAN (Classic Columns view) ── */}
          <div className="hidden md:flex overflow-x-auto overscroll-x-contain scrollbar-thin pb-6 gap-4 w-full text-left" style={{ WebkitOverflowScrolling: 'touch' }}>
            {TASK_COLUMNS.map((col) => {
              const colTasks = tasksByStatus[col.id] || [];
              const isOver = dragOverCol === col.id;

              return (
                <div
                  key={col.id}
                  onDrop={(e) => onDrop(e, col.id)}
                  onDragOver={(e) => onDragOver(e, col.id)}
                  onDragLeave={(e) => onDragLeave(e, col.id)}
                  className={`flex flex-col whitespace-normal min-w-[260px] sm:min-w-[280px] max-w-[300px] sm:max-w-[320px] flex-1 shrink-0 rounded-2xl transition-all duration-200 ${
                    isOver
                      ? 'bg-indigo-50/50 dark:bg-indigo-900/10 ring-2 ring-indigo-500/30'
                      : `${col.bg} border border-gray-200 dark:border-gray-700`
                  }`}
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t.columns[col.id]}</h3>
                    </div>
                    <span className="text-xs font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 rounded-full shadow-sm">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 p-3 space-y-3 min-h-[320px] overflow-y-auto hide-scrollbar">
                    {colTasks.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">{t.empty}</p>
                    )}
                    {colTasks.map((task) => {
                      const overdue = isOverdue(task);
                      const isDragging = activeDragId === task.id;
                      const isUpdating = updatingId === task.id;
                      const isDraggable = !isTouch && !isUpdating && (
                        role === 'admin' ||
                        role === 'manager' ||
                        Number(task.assigneeId) === Number(currentUser?.id)
                      );

                      return (
                        <div
                          key={task.id}
                          draggable={isDraggable}
                          onDragStart={(e) => isDraggable && onDragStart(e, task.id)}
                          onDragEnd={onDragEnd}
                          className={`group relative bg-white dark:bg-gray-800 border rounded-lg p-3 transition-all duration-200 ${
                            isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                          } ${
                            isDragging
                              ? 'opacity-40 scale-95 shadow-none border-indigo-500/50'
                              : 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
                          } ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              task.projectName
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}>
                              {task.projectName || t.noProject}
                            </span>
                          </div>

                          <h4 className="text-xs font-semibold text-gray-800 dark:text-white leading-snug line-clamp-2" title={task.title}>
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-2 mt-1 leading-snug">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60">
                            <div className="flex items-center gap-1.5">
                              {(task.deadline || task.dueDate) && (
                                <span className={`text-[10px] font-medium flex items-center gap-1 ${
                                  overdue ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                  🕒 {formatDeadline(task)}
                                </span>
                              )}
                              {overdue && (
                                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-red-500/10 text-red-500 border border-red-500/20 rounded">
                                  {t.overdue}
                                </span>
                              )}
                            </div>

                            {task.assigneeName && (
                              <div className="flex items-center" title={`Assigné à : ${task.assigneeName}`}>
                                <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold flex items-center justify-center shrink-0">
                                  {getInitials(task.assigneeName)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
