export const mockUsers = [
  {
    id: "u1",
    name: "Alexandre Dupont",
    email: "alexandre.dupont@company.com",
    role: "Admin",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Alexandre",
  },
  {
    id: "u2",
    name: "Marie Laurent",
    email: "marie.laurent@company.com",
    role: "Manager",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Marie",
  },
  {
    id: "u3",
    name: "Lucas Martin",
    email: "lucas.martin@company.com",
    role: "Employé",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas",
  },
  {
    id: "u4",
    name: "Sophie Dubois",
    email: "sophie.dubois@company.com",
    role: "Employé",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sophie",
  }
];

export const mockProjects = [
  {
    id: "p1",
    name: "Plateforme E-Commerce v2",
    description: "Refonte complète de l'expérience d'achat en ligne avec intégration de Stripe et amélioration des performances SEO.",
    status: "En cours",
    startDate: "2026-01-15",
    endDate: "2026-06-30",
    managerId: "u2",
    budget: "45,000 €",
    progress: 65,
  },
  {
    id: "p2",
    name: "Application Mobile Client",
    description: "Développement d'une application mobile native iOS/Android pour la fidélisation client et le suivi des commandes.",
    status: "En cours",
    startDate: "2026-03-01",
    endDate: "2026-08-15",
    managerId: "u2",
    budget: "60,000 €",
    progress: 30,
  },
  {
    id: "p3",
    name: "Campagne Marketing Printemps",
    description: "Lancement des nouveaux produits de printemps à travers les réseaux sociaux et l'emailing.",
    status: "Terminé",
    startDate: "2026-02-01",
    endDate: "2026-05-15",
    managerId: "u1",
    budget: "15,000 €",
    progress: 100,
  },
  {
    id: "p4",
    name: "Audit de Sécurité Cloud",
    description: "Évaluation complète de la sécurité de notre infrastructure AWS et mise en conformité RGPD.",
    status: "En attente",
    startDate: "2026-06-01",
    endDate: "2026-07-15",
    managerId: "u1",
    budget: "20,000 €",
    progress: 0,
  }
];

export const mockTasks = [
  {
    id: "t1",
    projectId: "p1",
    title: "Intégration de l'API Stripe",
    description: "Développer le workflow de paiement complet incluant les remboursements et la gestion des abonnements.",
    status: "In Progress", // Todo, In Progress, Review, Blocked, Done
    priority: "Haute", // Haute, Moyenne, Basse
    assigneeId: "u3",
    dueDate: "2026-05-30",
  },
  {
    id: "t2",
    projectId: "p1",
    title: "Optimisation SEO Mobile",
    description: "Améliorer les scores Core Web Vitals sur mobile pour atteindre au moins 90 sur Lighthouse.",
    status: "Todo",
    priority: "Moyenne",
    assigneeId: "u4",
    dueDate: "2026-06-10",
  },
  {
    id: "t3",
    projectId: "p2",
    title: "Maquettes UI/UX",
    description: "Finaliser les designs Figma pour les écrans de checkout et le profil utilisateur.",
    status: "Done",
    priority: "Haute",
    assigneeId: "u4",
    dueDate: "2026-04-15",
  },
  {
    id: "t4",
    projectId: "p2",
    title: "Configuration de React Native",
    description: "Initialiser le dépôt et configurer les environnements de build iOS et Android (Fastlane).",
    status: "In Progress",
    priority: "Haute",
    assigneeId: "u3",
    dueDate: "2026-05-25",
  },
  {
    id: "t5",
    projectId: "p3",
    title: "Création des visuels publicitaires",
    description: "Conception graphique des bannières pour Facebook et Instagram Ads.",
    status: "Done",
    priority: "Basse",
    assigneeId: "u3",
    dueDate: "2026-04-01",
  },
  {
    id: "t6",
    projectId: "p1",
    title: "Validation des workflows de checkout",
    description: "Réaliser les tests de bout en bout sur l'environnement de staging avec des cartes de test Stripe.",
    status: "Review",
    priority: "Haute",
    assigneeId: "u3",
    dueDate: "2026-05-24",
  },
  {
    id: "t7",
    projectId: "p2",
    title: "Résolution des conflits de merge Git",
    description: "Résoudre les conflits complexes sur la branche principale liés aux modules de notifications push.",
    status: "Blocked",
    priority: "Haute",
    assigneeId: "u4",
    dueDate: "2026-05-23",
  }
];

export const mockSystemLogs = [
  {
    id: "l1",
    userId: "u1",
    action: "Modification des rôles globaux",
    timestamp: "2026-05-22T10:15:00Z",
  },
  {
    id: "l2",
    userId: "u2",
    action: "Création du projet 'Audit de Sécurité Cloud'",
    timestamp: "2026-05-21T14:30:00Z",
  },
  {
    id: "l3",
    userId: "u3",
    action: "Tâche 'Maquettes UI/UX' marquée comme terminée",
    timestamp: "2026-05-20T17:45:00Z",
  }
];

export const mockDocuments = [
  {
    id: "d1",
    name: "Spécifications Techniques",
    type: "pdf",
    size: "2.4 MB",
    uploadedBy: "u2",
    date: "2026-05-18",
    projectId: "p1"
  },
  {
    id: "d2",
    name: "Budget Prévisionnel",
    type: "xls",
    size: "845 KB",
    uploadedBy: "u1",
    date: "2026-05-20",
    projectId: "p1"
  },
  {
    id: "d3",
    name: "Maquettes V1",
    type: "fig",
    size: "15.2 MB",
    uploadedBy: "u4",
    date: "2026-05-21",
    projectId: "p2"
  },
  {
    id: "d4",
    name: "Contrat Prestataire",
    type: "doc",
    size: "1.1 MB",
    uploadedBy: "u1",
    date: "2026-05-15",
    projectId: "p4"
  }
];

export const mockEvents = [
  {
    id: "e1",
    title: "Point de synchronisation Hebdo",
    date: "2026-05-23",
    time: "10:00",
    type: "meeting",
    attendees: ["u1", "u2", "u3", "u4"]
  },
  {
    id: "e2",
    title: "Revue de design E-commerce",
    date: "2026-05-24",
    time: "14:30",
    type: "review",
    attendees: ["u2", "u4"]
  },
  {
    id: "e3",
    title: "Lancement Audit Sécurité",
    date: "2026-05-26",
    time: "11:00",
    type: "milestone",
    attendees: ["u1"]
  },
  {
    id: "e4",
    title: "Démonstration client",
    date: "2026-05-28",
    time: "16:00",
    type: "meeting",
    attendees: ["u2", "u3"]
  }
];

export const mockNotifications = [
  {
    id: "n1",
    userId: "u3",
    title: "Tâche assignée",
    message: "Alexandre Dupont vous a assigné la tâche 'Intégration de l'API Stripe'",
    read: false,
    date: "2026-05-22T08:30:00Z"
  },
  {
    id: "n2",
    userId: "u2",
    title: "Projet en retard",
    message: "Le projet 'Application Mobile Client' prend du retard.",
    read: false,
    date: "2026-05-21T14:15:00Z"
  },
  {
    id: "n3",
    userId: "u1",
    title: "Nouveau document",
    message: "Marie a uploadé 'Maquettes V1' sur le projet 'Application Mobile'.",
    read: true,
    date: "2026-05-21T09:00:00Z"
  },
  {
    id: "n4",
    userId: "u4",
    title: "Commentaire",
    message: "Lucas a commenté votre tâche 'Optimisation SEO'.",
    read: false,
    date: "2026-05-22T11:45:00Z"
  }
];

export const mockDirectMessages = [
  {
    id: "m1",
    senderId: "u2",
    receiverId: "u3",
    content: "Bonjour Lucas, où en est-on sur le dashboard ?",
    timestamp: "2026-05-23T09:00:00Z"
  },
  {
    id: "m2",
    senderId: "u3",
    receiverId: "u2",
    content: "Presque fini, il nous manquait juste la messagerie interne.",
    timestamp: "2026-05-23T09:15:00Z"
  },
  {
    id: "m3",
    senderId: "u4",
    receiverId: "u3",
    content: "J'ai préparé les assets graphiques si besoin pour l'intégration.",
    timestamp: "2026-05-23T09:30:00Z"
  },
  {
    id: "m4",
    senderId: "u1",
    receiverId: "u3",
    content: "Peux-tu valider le budget prévisionnel de ce mois ?",
    timestamp: "2026-05-22T14:20:00Z"
  }
];