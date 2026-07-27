import { create } from 'zustand';
import { api } from '../services/api';
import { mockUsers, mockSystemLogs, mockDocuments, mockEvents, mockNotifications } from '../mocks/data';
import { connectMessagingSocket, disconnectMessagingSocket } from '../services/socket';

// Helper pour adapter le User de l'API (MySQL) au format attendu par les composants frontend actuels
const mapApiUserToFrontend = (user) => {
  if (!user) return null;
  let mappedRole = 'employe';
  if (user.role === 'admin') mappedRole = 'admin';
  else if (user.role === 'manager') mappedRole = 'manager';

  // Le format en base est "Nom Prénom" (ex: "Mosengo Phrasia")
  // Si l'utilisateur saisit "Phrasia Mosengo", le premier mot est le prénom.
  const parts = user.nom_prenom.split(' ');
  const prenom = parts[0];
  const nom = parts.slice(1).join(' ') || '';
  const firstName = prenom;
  const fullName = nom ? `${prenom} ${nom}` : prenom;

  // Initiales : première lettre du prénom + première lettre du nom
  const initials = nom
    ? (prenom[0] + nom[0]).toUpperCase()
    : prenom.substring(0, 2).toUpperCase();

  return {
    ...user,
    name: firstName,
    fullName: fullName,
    role: mappedRole,
    avatar: user.avatar || user.avatar_url || null, // null par défaut, URL si l'utilisateur a uploadé une photo
    initials,                        // "PM" pour Phrasia Mosengo
  };
};

export const useGlobalStore = create((set, get) => ({
  // Data state
  users: mockUsers,
  projects: [],
  managers: [],
  teams: [],
  teamMembers: [],
  activeTeam: null,
  tasks: [],
  taskList: [],
  kanbanBoard: [],
  systemLogs: mockSystemLogs,
  documents: mockDocuments,
  events: mockEvents,
  notifications: [],
  conversations: [],
  activeChatMessages: [],
  activeContactId: null,
  onlineUsers: [],
  unreadMessagesCount: 0,
  adminUsers: [],
  adminInvitationKey: null,
  planningEvents: [],
  
  // Auth state: starts as Lucas Martin (Employé) for demo ease, or null. Let's start with u3 (Lucas Martin) by default
  // so the layout has a default state if not logged in, but let's make it fully customisable.
  currentUser: null, // Pas d'utilisateur connecté → affiche l'écran de login
  setCurrentUser: (user) => set(state => ({
    currentUser: typeof user === 'function' ? user(state.currentUser) : user
  })),
  refreshCurrentUser: async () => {
    try {
      const res = await api.auth.getMe();
      set({ currentUser: mapApiUserToFrontend(res.user) });
    } catch (err) {
      console.error('[refreshCurrentUser]', err.message);
    }
  },
  
  darkMode: false,
  toggleTheme: () => set(state => {
    const newMode = !state.darkMode;
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { darkMode: newMode };
  }),
  
  // Language state
  language: localStorage.getItem('jrsd_language') || 'FR',
  setLanguage: (lang) => {
    localStorage.setItem('jrsd_language', lang);
    set({ language: lang });
  },
  
  // Actions
  initAuth: async () => {
    const token = localStorage.getItem('jrsd_token');
    if (!token) return;

    try {
      const res = await api.auth.getMe();
      set({ currentUser: mapApiUserToFrontend(res.user) });
      get().fetchUsers();
      get().fetchProjects();
      get().fetchMyTasks();
      get().connectSocket();
      get().fetchConversations();
      get().fetchUnreadCount();
      get().fetchNotifications();
      get().fetchPlanningEvents();
      get().fetchDocuments();
    } catch (err) {
      console.error("Échec de la récupération de la session :", err);
      localStorage.removeItem('jrsd_token');
      set({ currentUser: null });
    }
  },
  
  login: async (email, password) => {
    try {
      const res = await api.auth.login(email, password);
      localStorage.setItem('jrsd_token', res.token);
      const frontendUser = mapApiUserToFrontend(res.user);
      set({ currentUser: frontendUser });
      get().addLog(`Connexion réussie de ${frontendUser.name}`);
      get().fetchUsers();
      get().fetchProjects();
      get().fetchMyTasks();
      get().connectSocket();
      get().fetchConversations();
      get().fetchNotifications();
      get().fetchPlanningEvents();
      get().fetchDocuments();
      return { success: true, user: frontendUser };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
  
  register: async (userData) => {
    try {
      const res = await api.auth.register(userData);
      localStorage.setItem('jrsd_token', res.token);
      const frontendUser = mapApiUserToFrontend(res.user);
      set({ currentUser: frontendUser });
      get().addLog(`Inscription réussie de ${frontendUser.name}`);
      get().fetchUsers();
      get().fetchProjects();
      get().fetchMyTasks();
      get().connectSocket();
      get().fetchConversations();
      get().fetchNotifications();
      get().fetchPlanningEvents();
      get().fetchDocuments();
      return { success: true, user: frontendUser };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
  
  forgotPassword: async (email) => {
    try {
      const res = await api.auth.forgotPassword(email);
      return { success: true, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
  
  resetPassword: async (token, password) => {
    try {
      const res = await api.auth.resetPassword(token, password);
      return { success: true, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
  
  logout: () => {
    const user = get().currentUser;
    if (user) {
      get().addLog(`Déconnexion de ${user.name}`);
    }
    disconnectMessagingSocket();
    localStorage.removeItem('jrsd_token');
    set({
      currentUser: null,
      users: mockUsers,
      projects: [],
      managers: [],
      tasks: [],
      taskList: [],
      kanbanBoard: [],
      teams: [],
      teamMembers: [],
      activeTeam: null,
      adminUsers: [],
      adminInvitationKey: null,
      conversations: [],
      activeChatMessages: [],
      activeContactId: null,
      onlineUsers: [],
      unreadMessagesCount: 0,
      notifications: [],
      planningEvents: [],
    });
  },
  
  fetchUsers: async () => {
    try {
      const res = await api.users.getAll();
      if (res.success) {
        const mappedUsers = res.users.map(mapApiUserToFrontend);
        set({ users: mappedUsers });
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des utilisateurs:", err);
    }
  },

  updateUserRole: async (userId, newRole) => {
    try {
      const res = await api.users.updateRole(userId, newRole);
      if (res.success) {
        set((state) => ({
          users: state.users.map(u => u.id === userId ? { ...u, role: newRole } : u)
        }));
        get().addLog(`Le rôle de l'utilisateur a été mis à jour vers ${newRole}`);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
  
  // Dynamically change the role of the logged-in user
  changeRole: (newRole) => {
    const { currentUser } = get();
    if (currentUser) {
      const updatedUser = { ...currentUser, role: newRole };
      set({ currentUser: updatedUser });
      get().addLog(`Rôle de ${currentUser.name} simulé en : ${newRole}`);
    }
  },
  
  fetchProjects: async () => {
    try {
      const res = await api.projects.getAll();
      if (res.success) {
        set({ projects: res.projects });
      }
    } catch (err) {
      console.error('Erreur fetchProjects:', err);
    }
  },

  fetchManagers: async () => {
    try {
      const res = await api.users.getManagers();
      if (res.success) {
        const mapped = res.managers.map(mapApiUserToFrontend);
        set({ managers: mapped });
      }
    } catch (err) {
      console.error('Erreur fetchManagers:', err);
    }
  },

  createProject: async (formData) => {
    try {
      const res = await api.projects.create(formData);
      if (res.success) {
        set((state) => ({ projects: [res.project, ...state.projects] }));
        get().addLog(`Projet '${res.project.name}' créé`);
        return { success: true, project: res.project };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  updateProject: async (id, formData) => {
    try {
      const res = await api.projects.update(id, formData);
      if (res.success) {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? res.project : p)),
        }));
        get().addLog(`Projet '${res.project.name}' mis à jour`);
        return { success: true, project: res.project };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  fetchTeams: async () => {
    try {
      const res = await api.teams.getAll();
      if (res.success) set({ teams: res.teams });
    } catch (err) {
      console.error('Erreur fetchTeams:', err);
    }
  },

  fetchTeamMembers: async (teamId) => {
    try {
      const res = await api.teams.getMembers(teamId);
      if (res.success) {
        set({
          activeTeam: res.team,
          teamMembers: res.members.map((m) => ({
            ...m,
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.email)}`,
          })),
        });
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error('Erreur fetchTeamMembers:', err);
      return { success: false, message: err.message };
    }
  },

  addTeamMember: async (teamId, userId) => {
    try {
      const res = await api.teams.addMember(teamId, userId);
      if (res.success) {
        set({
          teamMembers: res.members.map((m) => ({
            ...m,
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.email)}`,
          })),
          teams: get().teams.map((t) =>
            t.id === teamId ? { ...t, memberCount: res.memberCount } : t
          ),
        });
        get().addLog('Membre ajouté à l\'équipe');
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  removeTeamMember: async (teamId, userId) => {
    try {
      const res = await api.teams.removeMember(teamId, userId);
      if (res.success) {
        set({
          teamMembers: res.members.map((m) => ({
            ...m,
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.email)}`,
          })),
          teams: get().teams.map((t) =>
            t.id === teamId ? { ...t, memberCount: res.memberCount } : t
          ),
        });
        get().addLog('Membre retiré de l\'équipe');
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  createTeam: async (data) => {
    try {
      const res = await api.teams.create(data);
      if (res.success) {
        set((state) => ({ teams: [...state.teams, res.team].sort((a, b) => a.nom.localeCompare(b.nom)) }));
        get().addLog(`Équipe '${res.team.nom}' créée`);
        return { success: true, team: res.team };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  updateTeam: async (id, data) => {
    try {
      const res = await api.teams.update(id, data);
      if (res.success) {
        set((state) => ({
          teams: state.teams.map((t) => (t.id === id ? res.team : t)),
          activeTeam: state.activeTeam?.id === id ? { ...state.activeTeam, nom: res.team.nom, description: res.team.description } : state.activeTeam,
        }));
        get().addLog(`Équipe '${res.team.nom}' mise à jour`);
        return { success: true, team: res.team };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  deleteTeam: async (id) => {
    try {
      const team = get().teams.find((t) => t.id === id);
      const res = await api.teams.delete(id);
      if (res.success) {
        set((state) => ({
          teams: state.teams.filter((t) => t.id !== id),
          activeTeam: state.activeTeam?.id === id ? null : state.activeTeam,
          teamMembers: state.activeTeam?.id === id ? [] : state.teamMembers,
        }));
        if (team) get().addLog(`Équipe '${team.nom}' supprimée`);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  deleteProject: async (projectId) => {
    try {
      const project = get().projects.find((p) => p.id === projectId);
      const res = await api.projects.delete(projectId);
      if (res.success) {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
        }));
        if (project) get().addLog(`Projet '${project.name}' supprimé`);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
  
  // Manage Tasks — liste (onglet Tâches) vs kanban (onglet Kanban)
  fetchMyTaskList: async () => {
    try {
      const res = await api.tasks.getMyList();
      if (res.success) {
        const list = res.tasks || [];
        set({ taskList: list, tasks: list });
      }
    } catch (err) {
      console.error('[fetchMyTaskList]', err.message);
    }
  },

  fetchMyTasks: async () => get().fetchMyTaskList(),

  fetchKanbanBoard: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    const role = currentUser.role?.toLowerCase();
    try {
      let res;
      if (role === 'admin') {
        res = await api.tasks.getKanbanGlobal();
      } else if (role === 'manager') {
        res = await api.tasks.getKanbanTeam();
      } else {
        res = await api.tasks.getMyList();
      }
      if (res.success) {
        set({ kanbanBoard: res.tasks || [] });
      }
    } catch (err) {
      console.error('[fetchKanbanBoard]', err.message);
    }
  },

  createTask: async (data) => {
    try {
      const res = await api.tasks.create(data);
      if (res.success) {
        const { currentUser } = get();
        if (Number(res.task.assigneeId) === Number(currentUser?.id)) {
          set((state) => ({
            taskList: [res.task, ...state.taskList],
            tasks: [res.task, ...state.tasks],
          }));
        }
        get().addLog(`Tâche '${res.task.title}' créée`);
        return { success: true, task: res.task };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  updateTaskStatus: async (taskId, statut) => {
    try {
      const res = await api.tasks.updateStatus(taskId, statut);
      if (res.success) {
        const patch = (list) => list.map((t) => (t.id === taskId ? res.task : t));
        set((state) => ({
          tasks: patch(state.tasks),
          taskList: patch(state.taskList),
          kanbanBoard: patch(state.kanbanBoard),
        }));
        get().addLog(`Tâche '${res.task.title}' → ${statut}`);
        return { success: true, task: res.task };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  moveTask: async (taskId, newStatus) => {
    const result = await get().updateTaskStatus(taskId, newStatus);
    return result;
  },
  
  // Log helper
  addLog: (action) => {
    const { currentUser } = get();
    const newLog = {
      id: `l${get().systemLogs.length + 1}`,
      userId: currentUser ? currentUser.id : "system",
      action,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ systemLogs: [newLog, ...state.systemLogs] }));
  },

  // Notifications
  fetchNotifications: async () => {
    try {
      const res = await api.notifications.getAll();
      if (res.success) {
        set({ notifications: res.notifications });
      }
    } catch (err) {
      console.error('Erreur fetchNotifications:', err);
    }
  },

  createNotification: async (data) => {
    try {
      const res = await api.notifications.create(data);
      if (res.success) {
        get().addLog(`Notification créée`);
        get().fetchNotifications();
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  markNotificationAsRead: async (notificationId) => {
    try {
      const res = await api.notifications.markAsRead(notificationId);
      if (res.success) {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        }));
      }
    } catch (err) {
      console.error('Erreur markNotificationAsRead:', err);
    }
  },

  updateNotification: async (notificationId, data) => {
    try {
      const res = await api.notifications.update(notificationId, data);
      if (res.success) {
        get().addLog(`Notification modifiée`);
        get().fetchNotifications();
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      const res = await api.notifications.delete(notificationId);
      if (res.success) {
        get().addLog(`Notification supprimée`);
        get().fetchNotifications();
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  setActiveContactId: (contactId) => set({ activeContactId: contactId }),

  connectSocket: () => {
    const token = localStorage.getItem('jrsd_token');
    const { currentUser } = get();
    if (!token || !currentUser) return;

    connectMessagingSocket(token, currentUser.id, {
      onNewMessage: ({ message }) => {
        get().upsertChatMessage(message);
        // Refresh unread count when receiving a new message
        if (Number(message.receiverId) === Number(currentUser.id)) {
          get().fetchUnreadCount();
        }
      },
      onMessageUpdated: ({ message }) => get().upsertChatMessage(message),
      onMessageDeleted: ({ message }) => get().upsertChatMessage(message),
      onPresence: ({ onlineUsers }) => set({ onlineUsers }),
      onMessagesRead: ({ contactId, messageIds }) => {
        get().markMessagesRead(contactId, messageIds);
        // Refresh unread count when messages are marked as read
        get().fetchUnreadCount();
      },
    });
  },

  markMessagesRead: (_readerId, messageIds) => {
    const ids = new Set(messageIds.map(Number));
    set((state) => ({
      activeChatMessages: state.activeChatMessages.map((m) =>
        ids.has(Number(m.id)) ? { ...m, isRead: true } : m
      ),
    }));
  },

  markChatAsRead: async (contactId) => {
    try {
      await api.messages.markRead(contactId);
    } catch (err) {
      console.error('markChatAsRead:', err);
    }
  },

  upsertChatMessage: (message) => {
    const { currentUser, activeContactId } = get();
    if (!currentUser) return;

    const contactId =
      message.senderId === currentUser.id ? message.receiverId : message.senderId;

    const inActiveChat =
      activeContactId != null &&
      (Number(contactId) === Number(activeContactId));

    // Message reçu pendant que le chat est ouvert → marquer lu
    if (
      inActiveChat &&
      Number(message.senderId) === Number(activeContactId) &&
      !message.isRead
    ) {
      get().markChatAsRead(activeContactId);
    }

    let needsConvRefresh = false;

    set((state) => {
      let activeChatMessages = state.activeChatMessages;
      if (inActiveChat) {
        const idx = activeChatMessages.findIndex((m) => m.id === message.id);
        activeChatMessages =
          idx >= 0
            ? activeChatMessages.map((m) => (m.id === message.id ? message : m))
            : [...activeChatMessages, message];
      }

      const convIdx = state.conversations.findIndex(
        (c) => Number(c.contactId) === Number(contactId)
      );

      let conversations = [...state.conversations];
      if (convIdx >= 0) {
        const prev = conversations[convIdx];
        conversations[convIdx] = {
          ...prev,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
          lastSenderId: message.senderId,
        };
        conversations.sort(
          (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );
      } else {
        needsConvRefresh = true;
      }

      return { activeChatMessages, conversations };
    });

    if (needsConvRefresh) get().fetchConversations();
  },

  fetchConversations: async () => {
    try {
      const res = await api.messages.getConversations();
      if (res.success) {
        set({
          conversations: res.conversations,
          onlineUsers: res.onlineUsers || [],
        });
      }
    } catch (err) {
      console.error('Erreur fetchConversations:', err);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await api.messages.getUnreadCount();
      if (res.success) {
        set({ unreadMessagesCount: res.totalUnread });
      }
    } catch (err) {
      console.error('Erreur fetchUnreadCount:', err);
    }
  },

  fetchChatHistory: async (contactId) => {
    try {
      const res = await api.messages.getHistory(contactId);
      if (res.success) {
        set({
          activeChatMessages: res.messages,
          activeContactId: contactId,
          onlineUsers: res.onlineUsers || get().onlineUsers,
        });
        // Refresh unread count since backend marks messages as read
        get().fetchUnreadCount();
      }
    } catch (err) {
      console.error('Erreur fetchChatHistory:', err);
    }
  },

  sendMessage: async (receiverId, content) => {
    try {
      const res = await api.messages.send(receiverId, content);
      if (res.success) {
        get().upsertChatMessage(res.message);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  updateMessage: async (messageId, content) => {
    try {
      const res = await api.messages.update(messageId, content);
      if (res.success) {
        get().upsertChatMessage(res.message);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const res = await api.messages.delete(messageId);
      if (res.success) {
        get().upsertChatMessage(res.message);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Admin — Agents (RH + invitations)
  // ─────────────────────────────────────────────────────────────
  fetchAdminUsers: async () => {
    try {
      const res = await api.admin.getUsers();
      if (res.success) set({ adminUsers: res.users });
    } catch (err) {
      console.error('Erreur fetchAdminUsers:', err);
    }
  },

  updateUserStatusOrRole: async (id, data) => {
    try {
      const res = await api.admin.updateUserStatusOrRole(id, data);
      if (res.success) {
        set((state) => ({
          adminUsers: state.adminUsers.map((u) => (u.id === id ? { ...u, ...res.user } : u)),
        }));
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  generateInvitationKey: async () => {
    try {
      const res = await api.admin.generateInvitationKey();
      if (res.success) {
        set({ adminInvitationKey: { code: res.code, expires_at: res.expires_at } });
        return { success: true, code: res.code, expires_at: res.expires_at };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Planning
  // ─────────────────────────────────────────────────────────────
  fetchPlanningEvents: async () => {
    try {
      const res = await api.planning.getMySchedule();
      if (res.success) {
        set({ planningEvents: res.events });
      }
    } catch (err) {
      console.error('Erreur fetchPlanningEvents:', err);
    }
  },

  createPlanningEvent: async (data) => {
    try {
      const res = await api.planning.create(data);
      if (res.success) {
        get().addLog(`Événement planning ajouté : ${data.title}`);
        get().fetchPlanningEvents();
        return { success: true, event: res.event };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  updatePlanningEvent: async (id, data) => {
    try {
      const res = await api.planning.update(id, data);
      if (res.success) {
        get().addLog(`Événement planning modifié : ${data.title}`);
        get().fetchPlanningEvents();
        return { success: true, event: res.event };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  deletePlanningEvent: async (id) => {
    try {
      const res = await api.planning.delete(id);
      if (res.success) {
        get().addLog(`Événement planning supprimé`);
        get().fetchPlanningEvents();
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Documents
  // ─────────────────────────────────────────────────────────────
  fetchDocuments: async () => {
    try {
      const res = await api.documents.getAll();
      if (res.success) {
        set({ documents: res.documents });
      }
    } catch (err) {
      console.error('Erreur fetchDocuments:', err);
    }
  },

  uploadDocument: async (formData) => {
    try {
      const res = await api.documents.upload(formData);
      if (res.success) {
        get().addLog(`Document '${res.document.name}' téléversé`);
        get().fetchDocuments();
        return { success: true, document: res.document };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  deleteDocument: async (id) => {
    try {
      const res = await api.documents.delete(id);
      if (res.success) {
        get().addLog(`Document supprimé`);
        get().fetchDocuments();
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
}));

