import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';

const TRANSLATIONS = {
  FR: {
    loading: 'Chargement...',
    edit_event: "Modifier l'événement",
    new_event: "Nouvel événement",
    title: 'Titre',
    title_ph: 'Ex: Réunion de synchronisation',
    icon: 'Icône (optionnel)',
    start_date: 'Date de début',
    start_time: 'Heure de début',
    end_date: 'Date de fin',
    end_time: 'Heure de fin',
    target: 'Cible',
    everyone: 'Tout le monde',
    specific_team: 'Équipe spécifique',
    select_team: 'Sélectionnez une équipe...',
    desc: 'Description',
    desc_ph: "Détails de l'événement (optionnel)...",
    cancel: 'Annuler',
    save: 'Enregistrer',
    confirm_del: "Voulez-vous vraiment supprimer cet événement ?",
    unknown_team: 'Équipe inconnue',
    team_cal: "Calendrier d'équipe",
    planning: 'Planning',
    upcoming: 'Événements à venir',
    no_upcoming: 'Aucun événement à venir',
    no_events_day: 'Aucun événement ce jour',
    add_event: 'Ajouter un événement',
    month_names: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    day_names: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    day_names_full: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  },
  EN: {
    loading: 'Loading...',
    edit_event: 'Edit event',
    new_event: 'New event',
    title: 'Title',
    title_ph: 'Ex: Sync meeting',
    icon: 'Icon (optional)',
    start_date: 'Start date',
    start_time: 'Start time',
    end_date: 'End date',
    end_time: 'End time',
    target: 'Target',
    everyone: 'Everyone',
    specific_team: 'Specific team',
    select_team: 'Select a team...',
    desc: 'Description',
    desc_ph: 'Event details (optional)...',
    cancel: 'Cancel',
    save: 'Save',
    confirm_del: 'Are you sure you want to delete this event?',
    unknown_team: 'Unknown team',
    team_cal: 'Team calendar',
    planning: 'Planning',
    upcoming: 'Upcoming events',
    no_upcoming: 'No upcoming events',
    no_events_day: 'No events this day',
    add_event: 'Add an event',
    month_names: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    day_names: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    day_names_full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  }
};

/* ─── Event Form Modal ─────────────────────────────────────── */
function EventModal({ isOpen, onClose, event = null, onSave, t, prefillDate = null }) {
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
      const base = prefillDate ? new Date(prefillDate + 'T09:00:00') : new Date();
      setStartDate(base.toISOString().split('T')[0]);
      setStartTime('09:00');
      const later = new Date(base.getTime() + 60 * 60 * 1000);
      setEndDate(later.toISOString().split('T')[0]);
      setEndTime('10:00');
      setTargetType('all');
      setTargetTeamId('');
    }
  }, [event, isOpen, prefillDate]);

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
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {event ? t.edit_event : t.new_event}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.title}</label>
            <input
              required
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder={t.title_ph}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.icon}</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.start_date}</label>
              <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.start_time}</label>
              <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.end_date}</label>
              <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.end_time}</label>
              <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.target}</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input type="radio" value="all" checked={targetType === 'all'} onChange={() => setTargetType('all')} className="text-blue-600 focus:ring-blue-500" />
                {t.everyone}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input type="radio" value="team" checked={targetType === 'team'} onChange={() => setTargetType('team')} className="text-blue-600 focus:ring-blue-500" />
                {t.specific_team}
              </label>
            </div>
            {targetType === 'team' && (
              <select
                required
                value={targetTeamId}
                onChange={e => setTargetTeamId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">{t.select_team}</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.nom}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.desc}</label>
            <textarea
              rows="3"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
              placeholder={t.desc_ph}
            />
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              {t.cancel}
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm">
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Day Detail Panel ─────────────────────────────────────── */
function DayDetailPanel({ selectedDay, events, isAdmin, onAddEvent, onEditEvent, onDeleteEvent, onClose, t }) {
  const dayName = t.day_names_full[selectedDay.getDay()];
  const dayNum = selectedDay.getDate();
  const monthName = t.month_names[selectedDay.getMonth()];

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const sorted = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return (
    <div className="lg:col-span-1 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-blue-50/60 dark:bg-blue-900/10">
        <div>
          <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider">{dayName}</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{dayNum} {monthName}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400">{t.no_events_day}</p>
          </div>
        ) : (
          sorted.map(ev => {
            const isAll = ev.target_type === 'all';
            return (
              <div
                key={ev.id}
                onClick={() => onEditEvent(ev)}
                className="group relative pl-3 pr-2 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer"
              >
                <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${isAll ? 'bg-blue-500' : 'bg-purple-500'}`} />
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 mb-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 inline" />
                      {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                    </p>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                      {ev.icon && <span className="text-base">{ev.icon}</span>}
                      {ev.title}
                    </h4>
                    {ev.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{ev.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); onEditEvent(ev); }}
                        className="p-1 text-gray-400 hover:text-blue-500 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteEvent(ev.id); }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add button */}
      {isAdmin && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => onAddEvent(selectedDay.toISOString().split('T')[0])}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t.add_event}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══ Main Planning Page ════════════════════════════════════════ */
export default function Planning() {
  const { currentUser, planningEvents, teams, createPlanningEvent, updatePlanningEvent, deletePlanningEvent, fetchPlanningEvents, language } = useGlobalStore();
  const t = TRANSLATIONS[language === 'EN' ? 'EN' : 'FR'];

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">{t.loading}</div>;
  }

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [prefillDate, setPrefillDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

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
    setPrefillDate(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t.confirm_del)) {
      await deletePlanningEvent(id);
    }
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setPrefillDate(null);
    setIsModalOpen(true);
  };

  const openNewForDate = (dateStr) => {
    setEditingEvent(null);
    setPrefillDate(dateStr);
    setIsModalOpen(true);
  };

  const getEventsForDay = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return planningEvents.filter(ev => ev.start_time?.startsWith(dateStr));
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) =>
    selectedDay && date.toDateString() === selectedDay.toDateString();

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday is 0, Sunday is 6
    const daysInMonth = lastDay.getDate();

    const days = [];
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthDays - i), isPrevMonth: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isPrevMonth: false });
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const sortedEvents = [...planningEvents].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const upcomingEvents = sortedEvents.filter(ev => new Date(ev.start_time) >= new Date()).slice(0, 10);

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString(language === 'EN' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });

  const getTeamName = (teamId) =>
    teams.find(team => team.id === teamId)?.nom || t.unknown_team;

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <section id="planning" className="scroll-mt-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold mb-2 tracking-wide uppercase">
            {t.team_cal}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t.planning}</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => openNewForDate(new Date().toISOString().split('T')[0])}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.new_event}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar — 3/4 */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
              {t.month_names[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {t.day_names.map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((dayObj, index) => {
                const day = dayObj.date;
                const isPrevMonth = dayObj.isPrevMonth;
                const dayEvents = getEventsForDay(day);
                const todayCell = isToday(day);
                const selectedCell = isSelected(day);

                return (
                  <div
                    key={index}
                    onClick={() => !isPrevMonth && setSelectedDay(day)}
                    className={`
                      min-h-[48px] sm:min-h-[80px] p-1 sm:p-1.5 rounded-xl border transition-all flex flex-col
                      ${isPrevMonth
                        ? 'opacity-25 cursor-default bg-transparent border-transparent'
                        : selectedCell
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 cursor-pointer ring-2 ring-blue-300/40'
                          : todayCell
                            ? 'border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/40 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    {/* Day number */}
                    <div className={`text-xs font-bold mb-1 ${
                      selectedCell ? 'text-blue-600 dark:text-blue-400' :
                      todayCell && !isPrevMonth ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-700 dark:text-gray-200'
                    }`}>
                      {todayCell && !isPrevMonth ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px]">
                          {day.getDate()}
                        </span>
                      ) : (
                        day.getDate()
                      )}
                    </div>

                    {/* Event pills */}
                    {!isPrevMonth && dayEvents.length > 0 && (
                      <div className="flex-1 flex flex-col justify-end md:justify-start">
                        {/* Mobile dots indicators */}
                        <div className="flex md:hidden gap-1 flex-wrap mt-0.5 justify-center">
                          {dayEvents.slice(0, 3).map(ev => (
                            <span
                              key={ev.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                ev.target_type === 'all' ? 'bg-blue-500' : 'bg-purple-500'
                              }`}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="w-1 h-1 rounded-full bg-gray-400" />
                          )}
                        </div>

                        {/* Desktop text pills */}
                        <div className="hidden md:flex flex-col gap-0.5">
                          {dayEvents.slice(0, 3).map(ev => (
                            <div
                              key={ev.id}
                              onClick={e => { e.stopPropagation(); openEdit(ev); }}
                              title={ev.title}
                              className={`
                                text-[10px] font-medium px-1 py-[2px] rounded truncate leading-tight cursor-pointer transition-opacity hover:opacity-80
                                ${ev.target_type === 'all'
                                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                  : 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                                }
                              `}
                            >
                              {ev.icon && <span className="mr-0.5">{ev.icon}</span>}
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                              +{dayEvents.length - 3} autres
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel — day detail OR upcoming events */}
        {selectedDay ? (
          <DayDetailPanel
            selectedDay={selectedDay}
            events={selectedDayEvents}
            isAdmin={isAdmin}
            onAddEvent={openNewForDate}
            onEditEvent={openEdit}
            onDeleteEvent={handleDelete}
            onClose={() => setSelectedDay(null)}
            t={t}
          />
        ) : (
          <div className="lg:col-span-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.upcoming}</h3>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t.no_upcoming}</p>
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{ev.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        {isAll ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                            {t.everyone}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            {getTeamName(ev.target_team_id)}
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); openEdit(ev); }} className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(ev.id); }} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
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
        )}
      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEvent(null); setPrefillDate(null); }}
        event={editingEvent}
        onSave={handleSaveEvent}
        t={t}
        prefillDate={prefillDate}
      />
    </section>
  );
}
