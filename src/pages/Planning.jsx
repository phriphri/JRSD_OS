import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Clock, Users, X, ChevronLeft, ChevronRight } from 'lucide-react';

function EventModal({ isOpen, onClose, event = null, onSave }) {
  const { teams } = useGlobalStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetTeamId, setTargetTeamId] = useState('');
  const [icon, setIcon] = useState('');

  const EMOJI_OPTIONS = [
    '💻', '🚀', '📢', '☕', '🎯', '📅', '🤝', '🎉', 
    '📊', '💡', '🔧', '📈', '🎨', '🔥', '⭐', '📝',
    '🏆', '🎁', '🌟', '💼', '📋', '✅', '❌', '⚠️'
  ];

  useEffect(() => {
    if (event) {
      const sDate = new Date(event.start_time);
      const eDate = new Date(event.end_time);
      
      setTitle(event.title || '');
      setDescription(event.description || '');
      setStartDate(sDate.toISOString().split('T')[0]);
      setStartTime(sDate.toTimeString().slice(0, 5));
      setEndDate(eDate.toISOString().split('T')[0]);
      setEndTime(eDate.toTimeString().slice(0, 5));
      setTargetType(event.target_type || 'all');
      setTargetTeamId(event.target_team_id || '');
      setIcon(event.icon || '');
    } else {
      setTitle('');
      setDescription('');
      setIcon('');
      const now = new Date();
      setStartDate(now.toISOString().split('T')[0]);
      setStartTime(now.toTimeString().slice(0, 5));
      const later = new Date(now.getTime() + 60 * 60 * 1000);
      setEndDate(later.toISOString().split('T')[0]);
      setEndTime(later.toTimeString().slice(0, 5));
      setTargetType('all');
      setTargetTeamId('');
    }
  }, [event, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: event?.id,
      title,
      description,
      start_time: `${startDate}T${startTime}:00`,
      end_time: `${endDate}T${endTime}:00`,
      target_type: targetType,
      target_team_id: targetType === 'team' ? targetTeamId : null,
      icon,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {event ? "Modifier l'événement" : "Nouvel événement"}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre</label>
            <input
              required
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Ex: Réunion de synchronisation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icône (optionnel)</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIcon('')}
                className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg transition-all ${!icon ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                -
              </button>
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg transition-all ${icon === emoji ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de début</label>
              <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Heure de début</label>
              <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de fin</label>
              <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Heure de fin</label>
              <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cible</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input type="radio" value="all" checked={targetType === 'all'} onChange={() => setTargetType('all')} className="text-blue-600 focus:ring-blue-500" />
                Tout le monde
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input type="radio" value="team" checked={targetType === 'team'} onChange={() => setTargetType('team')} className="text-blue-600 focus:ring-blue-500" />
                Équipe spécifique
              </label>
            </div>
            {targetType === 'team' && (
              <select
                required
                value={targetTeamId}
                onChange={e => setTargetTeamId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Sélectionnez une équipe...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.nom}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              rows="3"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
              placeholder="Détails de l'événement (optionnel)..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Planning() {
  const { currentUser, planningEvents, teams, createPlanningEvent, updatePlanningEvent, deletePlanningEvent, fetchPlanningEvents } = useGlobalStore();
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchPlanningEvents();
  }, [fetchPlanningEvents]);

  const handleSaveEvent = async (eventData) => {
    if (eventData.id) {
      await updatePlanningEvent(eventData.id, eventData);
    } else {
      await createPlanningEvent(eventData);
    }
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer cet événement ?")) {
      await deletePlanningEvent(id);
    }
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const sortedEvents = [...planningEvents].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const upcomingEvents = sortedEvents.filter(ev => new Date(ev.start_time) >= new Date()).slice(0, 10);

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getTeamName = (teamId) => {
    return teams.find(t => t.id === teamId)?.nom || 'Équipe inconnue';
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    // Fill with previous month days
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthDays - i), isPrevMonth: true });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isPrevMonth: false });
    }
    return days;
  };

  const getEventsForDay = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return planningEvents.filter(ev => ev.start_time.startsWith(dateStr));
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDayClick = (day) => {
    if (!isAdmin || !day) return;
    setEditingEvent(null);
    setIsModalOpen(true);
    // Pre-fill the date in the modal
    setTimeout(() => {
      const dateStr = day.toISOString().split('T')[0];
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        dateInput.value = dateStr;
      }
    }, 0);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const days = getDaysInMonth(currentMonth);

  return (
    <section id="planning" className="scroll-mt-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold mb-2 tracking-wide uppercase">
            Calendrier d'équipe
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Planning</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar View - 70% */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((dayObj, index) => {
                const day = dayObj.date;
                const isPrevMonth = dayObj.isPrevMonth;
                const dayEvents = getEventsForDay(day);
                const hasEvents = dayEvents.length > 0;
                
                return (
                  <div
                    key={index}
                    onClick={() => handleDayClick(day)}
                    className={`
                      h-12 p-1 rounded-lg border transition-all
                      ${isAdmin && !isPrevMonth ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'cursor-default'}
                      ${isPrevMonth
                        ? 'bg-transparent border-transparent opacity-40'
                        : isToday(day)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800'
                      }
                    `}
                  >
                    <div className={`text-xs font-medium ${isToday(day) && !isPrevMonth ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                      {day.getDate()}
                    </div>
                    {hasEvents && !isPrevMonth && (
                      <div className="flex gap-0.5 mt-0.5 justify-center">
                        {dayEvents.slice(0, 3).map(ev => (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(ev);
                            }}
                            className={`
                              w-1.5 h-1.5 rounded-full cursor-pointer flex items-center justify-center
                              ${ev.target_type === 'all'
                                ? 'bg-blue-500'
                                : 'bg-purple-500'
                              }
                            `}
                            title={ev.icon ? `${ev.icon} ${ev.title}` : ev.title}
                          >
                            {ev.icon && <span className="text-[8px]">{ev.icon}</span>}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" title={`+${dayEvents.length - 3} événements`} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar - 30% */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Événements à venir</h3>
          </div>

          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun événement à venir</p>
              </div>
            ) : (
              upcomingEvents.map(ev => {
                const isAll = ev.target_type === 'all';
                return (
                  <div
                    key={ev.id}
                    className="group relative pl-3 pr-2 py-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer"
                    onClick={() => openEdit(ev)}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l ${isAll ? 'bg-blue-500' : 'bg-purple-500'}`} />
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(ev.start_time)} - {formatTime(ev.end_time)}</span>
                    </div>
                    
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate flex items-center gap-1">
                      {ev.icon && <span className="text-base">{ev.icon}</span>}
                      {ev.title}
                    </h4>
                    
                    {ev.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                        {ev.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {isAll ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                          Tout le monde
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {getTeamName(ev.target_team_id)}
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(ev);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ev.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} event={editingEvent} onSave={handleSaveEvent} />
    </section>
  );
}
