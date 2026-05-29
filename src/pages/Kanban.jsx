import React, { useEffect, useState } from 'react';
import { useGlobalStore } from '../store/globalStore';

export const TASK_COLUMNS = [
  { id: 'a_faire', title: 'À faire', dot: 'bg-slate-400 dark:bg-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/50' },
  { id: 'en_cours', title: 'En cours', dot: 'bg-indigo-500', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10' },
  { id: 'bloque', title: 'Bloqué', dot: 'bg-red-500', bg: 'bg-red-50/50 dark:bg-red-900/10' },
  { id: 'termine', title: 'Terminé', dot: 'bg-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
];

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
  const { kanbanBoard, fetchKanbanBoard, moveTask, currentUser } = useGlobalStore();
  const [activeDragId, setActiveDragId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const tasksByStatus = TASK_COLUMNS.reduce((acc, col) => {
    acc[col.id] = kanbanBoard
      .filter((t) => (t.statut || t.status) === col.id)
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
    const task = kanbanBoard.find((t) => t.id === taskId);
    if (!task || (task.statut || task.status) === newStatus) return;
    setUpdatingId(taskId);
    await moveTask(taskId, newStatus);
    setUpdatingId(null);
  };

  const handleStatusClick = async (task, newStatus) => {
    if ((task.statut || task.status) === newStatus) return;
    setUpdatingId(task.id);
    await moveTask(task.id, newStatus);
    setUpdatingId(null);
  };

  const role = currentUser?.role?.toLowerCase();
  const subtitle = role === 'admin'
    ? 'Vue globale — toutes les tâches'
    : role === 'manager'
      ? 'Vue équipe — projets gérés'
      : 'Vos tâches en colonnes';

  return (
    <section id="kanban" className="scroll-mt-8 mb-12">
      <div className="mb-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{subtitle}</p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Tableau Kanban</h2>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-12 text-center">Chargement du tableau…</p>
      ) : (
      <div className="flex overflow-x-auto whitespace-nowrap scrollbar-thin pb-6 gap-4 snap-x w-full">
        {TASK_COLUMNS.map((col) => {
          const colTasks = tasksByStatus[col.id];
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDrop={(e) => onDrop(e, col.id)}
              onDragOver={(e) => onDragOver(e, col.id)}
              onDragLeave={(e) => onDragLeave(e, col.id)}
              className={`flex flex-col min-w-[280px] max-w-[320px] flex-1 snap-start shrink-0 rounded-2xl transition-all duration-200 ${
                isOver
                  ? 'bg-indigo-50/50 dark:bg-indigo-900/10 ring-2 ring-indigo-500/30'
                  : `${col.bg} border border-gray-200 dark:border-gray-700`
              }`}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{col.title}</h3>
                </div>
                <span className="text-xs font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 rounded-full shadow-sm">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex-1 p-3 space-y-3 min-h-[320px] overflow-y-auto hide-scrollbar">
                {colTasks.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">Aucune tâche</p>
                )}
                {colTasks.map((task) => {
                  const overdue = isOverdue(task);
                  const isDragging = activeDragId === task.id;
                  const isUpdating = updatingId === task.id;
                  const isDraggable = !isUpdating && (
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
                      className={`group relative bg-white dark:bg-gray-800 border rounded-xl p-4 transition-all duration-200 ${
                        isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'
                      } ${
                        isDragging
                          ? 'opacity-40 scale-95 shadow-none border-indigo-500/50'
                          : 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
                      } ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 truncate ${
                        task.projectName 
                          ? 'text-indigo-600 dark:text-indigo-400' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {task.projectName || 'Hors Projet'}
                      </p>

                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight mb-1.5">
                        {task.title}
                      </h4>

                      {task.assigneeName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Assigné à : {task.assigneeName}
                        </p>
                      )}

                      {task.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-auto">
                        {(task.deadline || task.dueDate) && (
                          <span className={`text-[11px] font-medium ${
                            overdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {formatDeadline(task)}
                          </span>
                        )}
                        {overdue && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                            En retard
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 md:hidden">
                        {TASK_COLUMNS.filter((c) => c.id !== (task.statut || task.status)).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleStatusClick(task, c.id)}
                            className="flex-1 text-[9px] font-semibold py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                          >
                            → {c.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}
