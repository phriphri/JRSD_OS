import React, { useEffect, useRef, useState } from 'react';
import { useGlobalStore } from '../store/globalStore';

export default function Notifications() {
  const {
    notifications,
    userNotifications,
    unreadUserNotifCount,
    currentUser,
    markNotificationAsRead,
    markUserNotifAsRead,
    markAllUserNotifsAsRead,
    createNotification,
    fetchUserNotifications,
  } = useGlobalStore();

  const [activeTab, setActiveTab] = useState('activity'); // 'activity' | 'announcements'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  }

  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = userRole === 'admin';

  // Charger les auto-notifs au montage
  useEffect(() => {
    fetchUserNotifications();
  }, [fetchUserNotifications]);

  // Mark all unread official notifications as read once on mount for announcements tab (non-admin)
  const markedRef = useRef(false);
  useEffect(() => {
    if (!isAdmin && !markedRef.current && notifications.length > 0) {
      markedRef.current = true;
      notifications
        .filter((n) => n.is_read === false)
        .forEach((n) => markNotificationAsRead(n.id));
    }
  }, [notifications, isAdmin, markNotificationAsRead]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;
    const res = await createNotification({ title: newTitle, message: newMessage });
    if (res.success) {
      setIsModalOpen(false);
      setNewTitle('');
      setNewMessage('');
    }
  };

  const getNotifIcon = (type) => {
    if (!type) return '📌';
    if (type.startsWith('task')) return '📋';
    if (type.startsWith('project')) return '📁';
    if (type.startsWith('planning')) return '📅';
    if (type === 'new_message') return '💬';
    return '🔔';
  };

  return (
    <section id="notifications" className="scroll-mt-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-zinc-500 text-sm mb-1">Centre de Notifications</p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Notifications</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors self-start sm:self-auto"
          >
            Créer une annonce
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'activity'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            Activité & Mises à jour
            {unreadUserNotifCount > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadUserNotifCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'announcements'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            Annonces Officielles
          </button>
        </div>

        {activeTab === 'activity' && unreadUserNotifCount > 0 && (
          <button
            onClick={markAllUserNotifsAsRead}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium mb-2"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Contenu de l'onglet Activité (Auto-notifications) */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          {userNotifications.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-slate-500 dark:text-zinc-500">Aucune activité récente.</p>
            </div>
          ) : (
            userNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.is_read && markUserNotifAsRead(notif.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  !notif.is_read
                    ? 'bg-white dark:bg-zinc-900 border-blue-200 dark:border-zinc-700 shadow-sm'
                    : 'bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 opacity-70'
                }`}
              >
                <div className="pt-0.5 text-lg">
                  {getNotifIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-sm font-semibold ${!notif.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-300'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 shrink-0 ml-2">
                      {new Date(notif.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {notif.body && (
                    <p className={`text-xs ${!notif.is_read ? 'text-slate-600 dark:text-zinc-400' : 'text-slate-500 dark:text-zinc-500'}`}>
                      {notif.body}
                    </p>
                  )}
                </div>
                {!notif.is_read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 block shrink-0 mt-1" />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Contenu de l'onglet Annonces Officielles (existant) */}
      {activeTab === 'announcements' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-slate-500 dark:text-zinc-500">Aucune annonce officielle pour le moment.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isRead = isAdmin ? true : notif.is_read;
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    !isRead
                      ? 'bg-white dark:bg-zinc-900 border-blue-200 dark:border-zinc-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 opacity-70'
                  }`}
                >
                  <div className="pt-1">
                    {!isRead ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block animate-pulse" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700 block" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-sm font-semibold ${!isRead ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-300'}`}>
                        {notif.title}
                      </h3>
                      <div className="flex items-center gap-3">
                        {isAdmin && (
                          <span className="text-[10px] bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-2 py-1 rounded-full flex items-center gap-1">
                            👁️ Vu par {notif.views_count || 0} personne(s)
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500">
                          {new Date(notif.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <p className={`text-xs ${!isRead ? 'text-slate-600 dark:text-zinc-400' : 'text-slate-500 dark:text-zinc-500'}`}>
                      {notif.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal création annonce admin */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Nouvelle notification</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">Titre</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Titre de l'annonce"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                  placeholder="Contenu de la notification..."
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-semibold"
                >
                  Publier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
