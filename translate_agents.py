import re

with open('src/pages/Agents.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Insert translations block right after imports
import_end = content.find('\n/* ─── helpers')
if import_end != -1:
    translations_code = """
const TRANSLATIONS = {
  FR: {
    loading: 'Chargement...',
    roles: { admin: 'Admin', manager: 'Manager', employe: 'Employé' },
    no_func: 'Sans fonction',
    status: { actif: 'Actif', suspendu: 'Suspendu' },
    projects: 'projets',
    tasks: 'tâches',
    see_profile: 'Voir profil',
    change_role: 'Changer le rôle',
    suspend: 'Suspendre',
    reactivate: 'Réactiver',
    agents: 'Agents',
    subtitle: 'Gérez votre équipe, les rôles et les accès de votre workspace',
    stats: { total: 'Collaborateurs', actifs: 'Agents actifs', managers: 'Managers', admins: 'Admins' },
    search: 'Rechercher un collaborateur par nom, équipe, rôle...',
    tabs: { collab: 'Collaborateurs', invites: 'Invitations' },
    invite_title: 'Invitez de nouveaux membres',
    invite_subtitle: 'Générez une clé pour permettre à vos collaborateurs de rejoindre l\\'organisation.',
    gen_key: 'Générer une nouvelle clé',
    copy: 'Copier',
    copied: 'Copié',
    registration_link: 'Lien d\\'inscription',
    send_link: 'Envoyez ce lien ainsi que la clé de sécurité pour l\\'inscription.',
    copy_link: 'Copier le lien',
    no_agents: 'Aucun collaborateur trouvé',
    all_collab: 'Tous les collaborateurs',
    err_gen: 'Erreur lors de la génération.',
    cant_download_cv: 'Impossible de télécharger le CV.',
    cant_load_cv: 'Impossible de charger le CV.'
  },
  EN: {
    loading: 'Loading...',
    roles: { admin: 'Admin', manager: 'Manager', employe: 'Employee' },
    no_func: 'No function',
    status: { actif: 'Active', suspendu: 'Suspended' },
    projects: 'projects',
    tasks: 'tasks',
    see_profile: 'See profile',
    change_role: 'Change role',
    suspend: 'Suspend',
    reactivate: 'Reactivate',
    agents: 'Agents',
    subtitle: 'Manage your team, roles and workspace access',
    stats: { total: 'Collaborators', actifs: 'Active agents', managers: 'Managers', admins: 'Admins' },
    search: 'Search a collaborator by name, team, role...',
    tabs: { collab: 'Collaborators', invites: 'Invitations' },
    invite_title: 'Invite new members',
    invite_subtitle: 'Generate a key to allow your collaborators to join the organization.',
    gen_key: 'Generate a new key',
    copy: 'Copy',
    copied: 'Copied',
    registration_link: 'Registration link',
    send_link: 'Send this link along with the security key for registration.',
    copy_link: 'Copy link',
    no_agents: 'No collaborator found',
    all_collab: 'All collaborators',
    err_gen: 'Error generating.',
    cant_download_cv: 'Cannot download CV.',
    cant_load_cv: 'Cannot load CV.'
  }
};
"""
    content = content[:import_end] + translations_code + content[import_end:]

# Replace static texts
replacements = [
    (r"const rc = roleConfig\(agent\.role\);", r"const rc = roleConfig(agent.role);\n  const { language } = useGlobalStore();\n  const t = TRANSLATIONS[language === 'EN' ? 'EN' : 'FR'];"),
    (r"function roleConfig\(role\) \{", r"function roleConfig(role) {\n  const { language } = useGlobalStore.getState();\n  const t = TRANSLATIONS[language === 'EN' ? 'EN' : 'FR'];"),
    (r"if \(role === 'admin'\)\s+return \{ label: 'Admin'", r"if (role === 'admin')   return { label: t.roles.admin"),
    (r"if \(role === 'manager'\)\s+return \{ label: 'Manager'", r"if (role === 'manager') return { label: t.roles.manager"),
    (r"return\s+\{ label: 'Employé'", r"return                         { label: t.roles.employe"),
    
    (r"\{agent\.fonction \|\| 'Sans fonction'\}", r"{agent.fonction || t.no_func}"),
    (r"agent\.statut === 'actif' \? 'Actif' : 'Suspendu'", r"agent.statut === 'actif' ? t.status.actif : t.status.suspendu"),
    (r">projets<", r">{t.projects}<"),
    (r">tâches<", r">{t.tasks}<"),
    
    (r"label: 'Voir profil'", r"label: t.see_profile"),
    (r">Changer le rôle<", r">{t.change_role}<"),
    (r">Suspendre<", r">{t.suspend}<"),
    (r">Réactiver<", r">{t.reactivate}<"),
    
    # In AgentModal
    (r"function AgentModal\(.*?\) \{", r"\g<0>\n  const { language } = useGlobalStore();\n  const t = TRANSLATIONS[language === 'EN' ? 'EN' : 'FR'];"),
    (r"value: projectCount > 0 \? `\$\{projectCount\} projet\$\{projectCount > 1 \? 's' : ''\}` : 'Aucun'", r"value: projectCount > 0 ? `${projectCount} ${t.projects}` : '0'"),
    (r"alert\('Impossible de télécharger le CV\.'\)", r"alert(t.cant_download_cv)"),
    
    # In Agents
    (r"export default function Agents\(\) \{", r"\g<0>\n  const { language } = useGlobalStore();\n  const t = TRANSLATIONS[language === 'EN' ? 'EN' : 'FR'];"),
    (r">Chargement\.\.\.<", r">{t.loading}<"),
    (r">Agents<", r">{t.agents}<"),
    (r">Gérez votre équipe, les rôles et les accès de votre workspace<", r">{t.subtitle}<"),
    (r"label: 'Collaborateurs'", r"label: t.stats.total"),
    (r"label: 'Agents actifs'", r"label: t.stats.actifs"),
    (r"label: 'Managers'", r"label: t.stats.managers"),
    (r"label: 'Admins'", r"label: t.stats.admins"),
    
    (r"placeholder=\"Rechercher un collaborateur par nom, équipe, rôle\.\.\.\"", r"placeholder={t.search}"),
    (r"label: 'Invitations'", r"label: t.tabs.invites"),
    (r">Invitez de nouveaux membres<", r">{t.invite_title}<"),
    (r">Générez une clé pour permettre à vos collaborateurs de rejoindre l\\'organisation\.<", r">{t.invite_subtitle}<"),
    (r">Générer une nouvelle clé<", r">{t.gen_key}<"),
    (r"copiedKey \? 'Copié' : 'Copier'", r"copiedKey ? t.copied : t.copy"),
    (r"copiedLink \? 'Copié' : 'Copier le lien'", r"copiedLink ? t.copied : t.copy_link"),
    (r">Lien d\\'inscription<", r">{t.registration_link}<"),
    (r">Envoyez ce lien ainsi que la clé de sécurité pour l\\'inscription\.<", r">{t.send_link}<"),
    (r">Aucun collaborateur trouvé<", r">{t.no_agents}<"),
    (r">Tous les collaborateurs<", r">{t.all_collab}<"),
    (r"'Erreur lors de la génération\.'", r"t.err_gen"),
    (r"alert\('Impossible de charger le CV\.'\)", r"alert(t.cant_load_cv)"),
]

for p, r in replacements:
    content = re.sub(p, r, content)

with open('src/pages/Agents.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Agents translated')
