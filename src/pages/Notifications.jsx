import React, { useEffect, useRef, useState } from 'react';
import { useGlobalStore } from '../store/globalStore';

export default function Notifications() {
  const { notifications, currentUser, markNotificationAsRead, createNotification } = useGlobalStore();

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  }

  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = userRole === 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Mark all unread as read once on mount (non-admin only)
  // Using a ref to avoid re-triggering when the store updates, preventing infinite loops
  const markedRef = useRef(false);
  useEffect(() => {
    if (!isAdmin && !markedRef.current && notifications.length > 0) {
      markedRef.current = true;
      notifications
        .filter(n => n.is_read === false)
        .forEach(n => markNotificationAsRead(n.id));
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

  return (
    <section id="notifications" className="scroll-mt-8 pb-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-zinc-500 text-sm mb-1">Annonces Officielles</p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Notifications</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
          >
            Créer une notification
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-slate-500 dark:text-zinc-500">Aucune notification pour le moment.</p>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Nouvelle notification</h3>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
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
              </div>
              <div className="flex gap-3 mt-6">
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
