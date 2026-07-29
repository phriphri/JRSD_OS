import React, { useState, useRef, useEffect } from 'react';
import { useGlobalStore } from '../store/globalStore';
import {
  Send, MessageCircle, MoreVertical, Pencil, Trash2, X, Check, CheckCheck,
} from 'lucide-react';

function ReadReceipt({ isRead, recipientOnline }) {
  if (isRead) {
    return <CheckCheck className="w-4 h-4 text-[#53bdeb] shrink-0" strokeWidth={2.5} />;
  }
  if (recipientOnline) {
    return <CheckCheck className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2.5} />;
  }
  return <Check className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2.5} />;
}

function avatarUrl(email) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email || 'user')}&backgroundColor=e2e8f0`;
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatConvDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTime(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function MessageBubble({ msg, isMe, contact, recipientOnline, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);

  const saveEdit = async () => {
    if (!editText.trim() || msg.isDeleted) return;
    await onEdit(msg.id, editText.trim());
    setEditing(false);
    setMenuOpen(false);
  };

  return (
    <div
      className={`group flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseLeave={() => setMenuOpen(false)}
    >
      {!isMe && contact && (
        <div className="relative shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {getInitials(contact.name)}
          </div>
          {recipientOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
          )}
        </div>
      )}
      <div className={`relative max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {isMe && !msg.isDeleted && !editing && (
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="opacity-0 group-hover:opacity-100 absolute -left-8 top-1 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
        {menuOpen && isMe && (
          <div className="absolute -left-32 top-0 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 text-sm">
            <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }}
              className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
              <Pencil className="w-3.5 h-3.5" /> Modifier
            </button>
            <button type="button" onClick={() => { onDelete(msg.id); setMenuOpen(false); }}
              className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>
        )}
        {editing ? (
          <div className={`flex gap-2 items-center ${isMe ? 'flex-row-reverse' : ''}`}>
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm min-w-[200px]"
              autoFocus
            />
            <button type="button" onClick={saveEdit} className="p-2 bg-indigo-600 text-white rounded-lg">
              <Check className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setEditing(false)} className="p-2 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className={`px-3 py-2 text-sm shadow-sm min-w-[120px] ${
              msg.isDeleted
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 italic border border-slate-200 dark:border-slate-700 rounded-2xl'
                : isMe
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm border border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex flex-wrap items-end gap-x-2 gap-y-0.5">
              <span className="break-words flex-1 min-w-0">
                {msg.content}
                {msg.isModified && !msg.isDeleted && (
                  <span className="text-[10px] text-slate-400 ml-1">(modifié)</span>
                )}
              </span>
              {isMe && !msg.isDeleted && (
                <span className="inline-flex items-center gap-0.5 shrink-0 self-end">
                  <span className="text-[10px] text-indigo-200 leading-none">{formatTime(msg.createdAt)}</span>
                  <ReadReceipt isRead={msg.isRead} recipientOnline={recipientOnline} />
                </span>
              )}
            </div>
          </div>
        )}
        {!isMe || msg.isDeleted ? (
          <span className="text-[10px] text-slate-400 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
        ) : null}
      </div>
    </div>
  );
}

export default function Messages() {
  const {
    currentUser,
    users,
    conversations,
    activeChatMessages,
    activeContactId,
    onlineUsers,
    fetchConversations,
    fetchChatHistory,
    sendMessage,
    updateMessage,
    deleteMessage,
    connectSocket,
  } = useGlobalStore();

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  }

  const [inputText, setInputText] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef(null);

  const employes = users.filter((u) => u.id !== currentUser?.id);

  const activeContact =
    conversations.find((c) => c.contactId === activeContactId) ||
    employes.find((u) => u.id === activeContactId);

  const contactDisplay = activeContact
    ? {
        id: activeContact.contactId ?? activeContact.id,
        name: activeContact.nomPrenom || activeContact.fullName || activeContact.name,
        email: activeContact.email,
        role: activeContact.role,
      }
    : null;

  useEffect(() => {
    connectSocket();
    fetchConversations();
  }, [connectSocket, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages]);

  const selectContact = async (contactId) => {
    await fetchChatHistory(contactId);
    setMobileShowChat(true);
    setNewChatOpen(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContactId) return;
    const result = await sendMessage(activeContactId, inputText.trim());
    if (result.success) setInputText('');
  };

  const startNewChat = (userId) => {
    selectContact(userId);
  };

  const isOnline = (id) => onlineUsers.includes(id) || onlineUsers.includes(Number(id));

  return (
    <div className="flex h-full min-h-0 w-full bg-gray-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-xl font-sans">
      {/* Sidebar conversations */}
      <div className={`${mobileShowChat ? 'hidden' : 'flex'} md:flex w-full md:w-[340px] flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800`}>
        <div className="h-14 px-4 flex items-center justify-between bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <h3 className="font-bold text-gray-800 dark:text-white">Discussions</h3>
          <div className="relative">
            <button
              type="button"
              onClick={() => setNewChatOpen((o) => !o)}
              className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors"
              title="Nouvelle conversation"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            {newChatOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNewChatOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 max-h-72 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-2">
                  <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Nouvelle conversation</p>
                  {employes.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => startNewChat(u.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-left"
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {getInitials(u.fullName || u.name)}
                        </div>
                        {isOnline(u.id) && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.fullName || u.name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.fonction || u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 text-center">
              Aucune conversation. Lancez un nouveau tchat avec le bouton.
            </p>
          ) : (
            conversations.map((conv) => {
              return (
                <button
                  key={conv.contactId}
                  type="button"
                  onClick={() => selectContact(conv.contactId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${
                    activeContactId === conv.contactId ? 'bg-gray-100 dark:bg-slate-800' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {getInitials(conv.nomPrenom)}
                    </div>
                    {isOnline(conv.contactId) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{conv.nomPrenom}</span>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">{formatConvDate(conv.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {Number(conv.lastSenderId) === Number(currentUser?.id) ? 'Vous: ' : ''}{conv.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Zone chat */}
      <div className={`${mobileShowChat ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white dark:bg-slate-900 relative`}>
        {!activeContactId || !contactDisplay ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-slate-900/50">
            <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-6">
              <MessageCircle className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-200 mb-2">J-RSD Messagerie</h3>
            <p className="text-gray-500 dark:text-slate-400 max-w-sm text-sm leading-relaxed">
              Sélectionnez un collaborateur pour démarrer une discussion, ou créez une nouvelle conversation.
            </p>
          </div>
        ) : (
          <>
            <div className="h-14 px-4 flex items-center gap-3 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shrink-0">
              <button type="button" className="md:hidden p-2 -ml-2" onClick={() => setMobileShowChat(false)}>
                <X className="w-5 h-5" />
              </button>
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {getInitials(contactDisplay.name)}
                </div>
                {isOnline(contactDisplay.id) && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white truncate">{contactDisplay.name}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  {isOnline(contactDisplay.id) ? (
                    <>
                      <span className="w-2 h-2 bg-green-500 rounded-full" /> En ligne
                    </>
                  ) : (
                    'Hors ligne'
                  )}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
              {activeChatMessages.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">Envoyez le premier message.</p>
              ) : (
                activeChatMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMe={Number(msg.senderId) === Number(currentUser.id)}
                    contact={contactDisplay}
                    recipientOnline={isOnline(contactDisplay.id)}
                    onEdit={updateMessage}
                    onDelete={deleteMessage}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-full px-4 py-2 shadow-sm border border-gray-200/60 dark:border-slate-700">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Écrivez un message"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
