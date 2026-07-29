import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Copy, KeyRound, Search, UserPlus, X, Mail, Briefcase, Users, Shield, FileText, Download, MoreHorizontal, FolderKanban, CheckSquare, Clock } from 'lucide-react';
import { api } from '../services/api';
import { useGlobalStore } from '../store/globalStore';

/* ─── helpers ────────────────────────────────────────────────── */
function initialsFromName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || parts[0][1] || '')).toUpperCase();
}

function roleConfig(role) {
  if (role === 'admin')   return { label: 'Admin',   color: '#f43f5e', bg: 'rgba(244,63,94,.10)', gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)' };
  if (role === 'manager') return { label: 'Manager', color: '#6366f1', bg: 'rgba(99,102,241,.10)', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)' };
  return                         { label: 'Employé', color: '#10b981', bg: 'rgba(16,185,129,.10)', gradient: 'linear-gradient(135deg, #10b981, #059669)' };
}

function avatarHue(name) {
  return [...String(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}

function timeAgo() {
  const labels = ['Connecté il y a 2 min', 'Connecté il y a 5 min', 'Connecté il y a 12 min', 'Connecté il y a 1h', 'Connecté il y a 3h'];
  return labels[Math.floor(Math.random() * labels.length)];
}

/* ─── Avatar ─────────────────────────────────────────────────── */
function Avatar({ photoUrl, name, size = 48, showOnline = false, statut = 'actif' }) {
  const [err, setErr] = useState(false);
  const hue = avatarHue(name);

  const onlineDot = showOnline && statut === 'actif' ? (
    <span style={{
      position: 'absolute', bottom: 1, right: 1,
      width: size * 0.22, height: size * 0.22,
      borderRadius: '50%', background: '#10b981',
      border: '2px solid var(--ac-card)',
      boxShadow: '0 0 6px rgba(16,185,129,0.5)',
    }} />
  ) : null;

  if (photoUrl && !err) {
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <img
          src={photoUrl.startsWith('http') ? photoUrl : `http://localhost:3001${photoUrl}`}
          alt={name}
          onError={() => setErr(true)}
          style={{
            width: size, height: size, borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgba(255,255,255,0.15)',
          }}
        />
        {onlineDot}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, hsl(${hue},55%,55%), hsl(${(hue + 40) % 360},50%,65%))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800,
        fontSize: size * 0.36,
        letterSpacing: '-0.02em',
        border: '2px solid rgba(255,255,255,0.2)',
        boxShadow: `0 4px 12px hsla(${hue},55%,55%,0.3)`,
      }}>
        {initialsFromName(name)}
      </div>
      {onlineDot}
    </div>
  );
}

/* ─── Status dot ─────────────────────────────────────────────── */
function StatusDot({ statut, size = 7 }) {
  const active = statut === 'actif';
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size, borderRadius: '50%',
      background: active ? '#10b981' : '#94a3b8',
      boxShadow: active ? '0 0 6px rgba(16,185,129,0.4)' : 'none',
      flexShrink: 0,
    }} />
  );
}

/* ─── KPI Icon ───────────────/* ─── Agent Card (enriched) ──────────────────────────────────── */
function AgentCard({ agent, onClick, isLast }) {
  const rc = roleConfig(agent.role);
  const photoUrl = agent.avatar_url || agent.avatarUrl || null;
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const projectCount = agent.activeProjects?.length || 0;
  const taskCount = Math.floor(Math.random() * 12) + 1; // simulated
  const lastActivity = useMemo(() => timeAgo(), []);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        gap: 16,
        cursor: 'pointer',
        background: hovered ? 'var(--ac-bg)' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid var(--ac-border)',
        transition: 'background-color .15s ease',
        opacity: agent.statut === 'suspendu' ? 0.6 : 1,
        flexWrap: 'wrap',
      }}
      onClick={onClick}
    >
      {/* Profile & Name Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 200, flex: '1 1 200px' }}>
        <Avatar photoUrl={photoUrl} name={agent.nom_prenom} size={42} showOnline statut={agent.statut} />
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 700,
            color: 'var(--ac-text-primary)',
            margin: 0, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {agent.nom_prenom}
          </p>
          <p style={{
            fontSize: 11, color: 'var(--ac-text-muted)',
            margin: '2px 0 0', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontWeight: 500,
          }}>
            {agent.fonction || 'Sans fonction'}
          </p>
        </div>
      </div>

      {/* Role & Team Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: '1 1 180px' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px',
          borderRadius: 20, background: rc.bg, color: rc.color,
          letterSpacing: '0.01em',
        }}>
          {rc.label}
        </span>
        
        {agent.team?.nom && (
          <span style={{
            fontSize: 10, color: 'var(--ac-text-muted)',
            background: 'var(--ac-bg)',
            padding: '2.5px 9px', borderRadius: 20,
            fontWeight: 500,
            border: '1px solid var(--ac-border)',
          }}>
            {agent.team.nom}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <StatusDot statut={agent.statut} />
          <span style={{ fontSize: 10, color: 'var(--ac-text-muted)', fontWeight: 500 }}>
            {agent.statut === 'actif' ? 'Actif' : 'Suspendu'}
          </span>
        </div>
      </div>

      {/* Stats & Activity (visible on desktop) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flex: '1 1 200px',
        justifyContent: 'flex-end',
      }}>
        {/* Project & Task counts */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FolderKanban size={11} style={{ color: 'var(--ac-text-muted)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ac-text-primary)' }}>
              {projectCount}
            </span>
            <span style={{ fontSize: 10, color: 'var(--ac-text-muted)' }}>projets</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckSquare size={11} style={{ color: 'var(--ac-text-muted)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ac-text-primary)' }}>
              {taskCount}
            </span>
            <span style={{ fontSize: 10, color: 'var(--ac-text-muted)' }}>tâches</span>
          </div>
        </div>

        {/* Last activity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 130 }}>
          <Clock size={10} style={{ color: 'var(--ac-text-muted)' }} />
          <span style={{ fontSize: 10, color: 'var(--ac-text-muted)', fontWeight: 500 }}>
            {agent.statut === 'actif' ? lastActivity : 'Suspendu'}
          </span>
        </div>
      </div>

      {/* Action menu */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          style={{
            background: hovered || menuOpen ? 'var(--ac-bg)' : 'transparent',
            border: 'none', borderRadius: 8,
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--ac-text-muted)',
            transition: 'all .15s',
          }}
        >
          <MoreHorizontal size={15} />
        </button>
        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: '110%', right: 0,
              background: 'var(--ac-card)', border: '1px solid var(--ac-border)',
              borderRadius: 10, overflow: 'hidden', minWidth: 140,
              boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
              zIndex: 20,
            }}
          >
            {[{ label: 'Voir profil', action: onClick }].map(({ label, action }) => (
              <button
                key={label}
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); action(); }}
                style={{
                  width: '100%', padding: '9px 14px',
                  textAlign: 'left', border: 'none', background: 'none',
                  fontSize: 12, fontWeight: 600,
                  color: 'var(--ac-text-primary)',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Profile Modal ──────────────────────────────────────────── */
function AgentModal({ agent, currentUser, onClose, onChangeRole, onToggleStatus, busyId, roleMenuOpen, setRoleMenuOpen, onPreviewCv }) {
  if (!agent) return null;
  const rc = roleConfig(agent.role);
  const photoUrl = agent.avatar_url || agent.avatarUrl || null;
  const isBusy = busyId === agent.id;
  const isSelf = agent.id === currentUser?.id;
  const projectCount = agent.activeProjects?.length || 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--ac-card)',
          border: '1px solid var(--ac-border)',
          borderRadius: 20,
          width: '100%', maxWidth: 420,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
          position: 'relative',
        }}
      >
        {/* colored top band */}
        <div style={{
          height: 80,
          background: `linear-gradient(135deg, ${rc.color}22 0%, ${rc.color}08 100%)`,
          borderBottom: `1px solid ${rc.color}20`,
          display: 'flex', alignItems: 'flex-end',
          padding: '0 20px 0',
          position: 'relative',
        }}>
          <span style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: rc.gradient, opacity: 0.8,
          }} />
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(0,0,0,0.08)', border: 'none',
              borderRadius: '50%', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--ac-text-muted)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* avatar overlapping band */}
        <div style={{ padding: '0 24px 24px', marginTop: -28 }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 16,
          }}>
            <div style={{
              borderRadius: '50%',
              border: '3px solid var(--ac-card)',
              lineHeight: 0,
              flexShrink: 0,
            }}>
              <Avatar photoUrl={photoUrl} name={agent.nom_prenom} size={64} />
            </div>
            <div style={{ paddingBottom: 4, minWidth: 0 }}>
              <p style={{
                fontSize: 18, fontWeight: 800,
                color: 'var(--ac-text-primary)', margin: 0,
                lineHeight: 1.2,
              }}>
                {agent.nom_prenom}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 20,
                  background: rc.bg, color: rc.color,
                }}>
                  {rc.label}
                </span>
                <StatusDot statut={agent.statut} />
                <span style={{ fontSize: 11, color: 'var(--ac-text-muted)' }}>
                  {agent.statut === 'actif' ? 'Actif' : 'Suspendu'}
                </span>
              </div>
            </div>
          </div>

          {/* info rows */}
          <div style={{
            background: 'var(--ac-bg)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16,
            border: '1px solid var(--ac-border)',
          }}>
            {[
              { icon: <Mail size={13} />, label: 'Email', value: agent.email },
              { icon: <Briefcase size={13} />, label: 'Fonction', value: agent.fonction || '—' },
              { icon: <Users size={13} />, label: 'Équipe', value: agent.team?.nom || '—' },
              { icon: <Shield size={13} />, label: 'Projets actifs', value: projectCount > 0 ? `${projectCount} projet${projectCount > 1 ? 's' : ''}` : 'Aucun' },
            ].map(({ icon, label, value }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--ac-border)' : 'none',
                }}
              >
                <span style={{ color: 'var(--ac-text-muted)', flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 11, color: 'var(--ac-text-muted)', width: 70, flexShrink: 0 }}>{label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: 'var(--ac-text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* projects pills */}
          {agent.activeProjects?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Projets
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {agent.activeProjects.map((p) => (
                  <span
                    key={p.id}
                    style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 20,
                      background: 'rgba(99,102,241,0.09)',
                      color: '#6366f1',
                      border: '1px solid rgba(99,102,241,0.18)',
                    }}
                  >
                    {p.nom}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CV download & view — admin only */}
          {agent.cv_url && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                CV
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => onPreviewCv(agent)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(99,102,241,0.25)',
                    background: 'rgba(99,102,241,0.07)',
                    color: '#6366f1',
                    fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <FileText size={13} />
                  Visualiser
                </button>
                <a
                  href={api.users.getCvDownloadUrl(agent.id)}
                  download
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    const token = localStorage.getItem('jrsd_token');
                    fetch(api.users.getCvDownloadUrl(agent.id), {
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .then((r) => r.blob())
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `CV_${agent.nom_prenom.replace(/\s+/g, '_')}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      })
                      .catch(() => alert('Impossible de télécharger le CV.'));
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--ac-border)',
                    background: 'var(--ac-bg)',
                    color: 'var(--ac-text-primary)',
                    fontSize: 12, fontWeight: 700,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={13} />
                  Télécharger
                </a>
              </div>
            </div>
          )}

          {/* actions */}
          {!isSelf && (
            <div style={{ display: 'flex', gap: 8 }}>
              {/* role dropdown */}
              <div style={{ position: 'relative', flex: 1 }}>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRoleMenuOpen((p) => (p === agent.id ? null : agent.id));
                  }}
                  style={{
                    width: '100%', padding: '9px 12px',
                    borderRadius: 10, border: '1px solid var(--ac-border)',
                    background: 'var(--ac-bg)',
                    fontSize: 12, fontWeight: 600,
                    color: 'var(--ac-text-primary)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: isBusy ? 0.5 : 1,
                  }}
                >
                  Changer le rôle
                  <ChevronDown size={12} />
                </button>
                {roleMenuOpen === agent.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute', bottom: '110%', left: 0, right: 0,
                      background: 'var(--ac-card)',
                      border: '1px solid var(--ac-border)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      zIndex: 10,
                    }}
                  >
                    {['employe', 'manager', 'admin'].map((r) => {
                      const rc2 = roleConfig(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          disabled={r === agent.role}
                          onClick={() => onChangeRole(agent.id, r)}
                          style={{
                            width: '100%', padding: '9px 14px',
                            textAlign: 'left', border: 'none',
                            background: 'none', cursor: r === agent.role ? 'default' : 'pointer',
                            fontSize: 12, fontWeight: 600,
                            color: r === agent.role ? 'var(--ac-text-muted)' : rc2.color,
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: rc2.color, opacity: r === agent.role ? 0.4 : 1,
                          }} />
                          {rc2.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* suspend / reactivate */}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onToggleStatus(agent)}
                style={{
                  flex: 1, padding: '9px 12px',
                  borderRadius: 10,
                  border: agent.statut === 'actif'
                    ? '1px solid rgba(244,63,94,0.25)'
                    : '1px solid rgba(16,185,129,0.25)',
                  background: agent.statut === 'actif'
                    ? 'rgba(244,63,94,0.06)'
                    : 'rgba(16,185,129,0.06)',
                  color: agent.statut === 'actif' ? '#f43f5e' : '#10b981',
                  fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                  opacity: isBusy ? 0.5 : 1,
                }}
              >
                {agent.statut === 'actif' ? 'Suspendre' : 'Réactiver'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ Main page ═══════════════════════════════════════════════════ */
export default function Agents() {
  const {
    currentUser,
    adminUsers,
    adminInvitationKey,
    fetchAdminUsers,
    updateUserStatusOrRole,
    generateInvitationKey,
  } = useGlobalStore();

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  }

  const [previewCvUrl, setPreviewCvUrl] = useState(null);
  const [previewCvName, setPreviewCvName] = useState('');

  const isAdminOnly = currentUser?.role?.toLowerCase() === 'admin';
  const [activeTab, setActiveTab] = useState('collaborateurs');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    if (isAdminOnly) fetchAdminUsers();
  }, [isAdminOnly, fetchAdminUsers]);

  useEffect(() => {
    const close = () => setRoleMenuOpen(null);
    if (roleMenuOpen != null) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
    return undefined;
  }, [roleMenuOpen]);

  const rawKey = adminInvitationKey?.code || '';
  const registerUrl = useMemo(() => `${window.location.origin}/register`, []);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return adminUsers;
    const q = searchQuery.toLowerCase();
    return adminUsers.filter((a) =>
      (a.nom_prenom || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.fonction || '').toLowerCase().includes(q) ||
      (a.role || '').toLowerCase().includes(q) ||
      (a.team?.nom || '').toLowerCase().includes(q)
    );
  }, [adminUsers, searchQuery]);

  /* stats */
  const stats = useMemo(() => ({
    total: adminUsers.length,
    actifs: adminUsers.filter((a) => a.statut === 'actif').length,
    managers: adminUsers.filter((a) => a.role === 'manager').length,
    admins: adminUsers.filter((a) => a.role === 'admin').length,
  }), [adminUsers]);

  const handleGenerate = async () => {
    setError('');
    const res = await generateInvitationKey();
    if (!res?.success) setError(res?.message || 'Erreur lors de la génération.');
  };

  const handleCopyKey = async () => {
    if (!rawKey) return;
    try { await navigator.clipboard.writeText(rawKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 1500); } catch {}
  };

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(registerUrl); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1500); } catch {}
  };

  const applyRole = async (id, role) => {
    setBusyId(id);
    setRoleMenuOpen(null);
    await updateUserStatusOrRole(id, { role });
    setSelectedAgent((prev) => prev?.id === id ? { ...prev, role } : prev);
    setBusyId(null);
  };

  const toggleStatus = async (agent) => {
    const next = agent.statut === 'actif' ? 'suspendu' : 'actif';
    setBusyId(agent.id);
    await updateUserStatusOrRole(agent.id, { statut: next });
    setSelectedAgent((prev) => prev?.id === agent.id ? { ...prev, statut: next } : prev);
    setBusyId(null);
  };

  const handlePreviewCv = async (agent) => {
    const token = localStorage.getItem('jrsd_token');
    try {
      const response = await fetch(`${api.users.getCvDownloadUrl(agent.id)}?preview=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      
      const extension = (agent.cv_url || '').split('.').pop().toLowerCase();
      let mimeType = 'application/octet-stream';
      if (extension === 'pdf') mimeType = 'application/pdf';
      else if (extension === 'png') mimeType = 'image/png';
      else if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';

      const cleanBlob = new Blob([blob], { type: mimeType });
      const url = URL.createObjectURL(cleanBlob);
      setPreviewCvUrl(url);
      setPreviewCvName(agent.nom_prenom);
    } catch (err) {
      alert('Impossible de charger le CV.');
    }
  };

  if (!isAdminOnly) return null;

  const tabItems = [
    { id: 'collaborateurs', label: 'Collaborateurs', count: adminUsers.length },
    { id: 'invitations', label: 'Invitations', count: null },
  ];

  return (
    <>
      {/* css tokens */}
      <style>{`
        :root {
          --ac-card: #ffffff;
          --ac-bg: #f8f9fb;
          --ac-border: rgba(0,0,0,0.07);
          --ac-text-primary: #1e293b;
          --ac-text-muted: #94a3b8;
        }
        .dark {
          --ac-card: rgba(22,24,32,0.95);
          --ac-bg: rgba(15,17,24,0.8);
          --ac-border: rgba(255,255,255,0.07);
          --ac-text-primary: #e2e8f0;
          --ac-text-muted: #64748b;
        }
        .ac-search-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
        }
        .ac-invite-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.35) !important;
        }
        .ac-tab-btn {
          position: relative;
          transition: color .2s, background .2s;
        }
        .ac-tab-btn::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 0; right: 0;
          height: 2px;
          background: #6366f1;
          border-radius: 2px 2px 0 0;
          transform: scaleX(0);
          transition: transform .25s cubic-bezier(.4,0,.2,1);
        }
      `}</style>

      <section id="agents" style={{ paddingBottom: 60 }}>

        {/* ── premium header ── */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{
              fontSize: 24, fontWeight: 800,
              color: 'var(--ac-text-primary)', margin: 0,
              letterSpacing: '-0.025em', lineHeight: 1.2,
            }}>
              Agents
            </h2>
            <p style={{
              fontSize: 13, color: 'var(--ac-text-muted)',
              margin: '6px 0 0', fontWeight: 500,
              lineHeight: 1.5,
            }}>
              Gérez votre équipe, les rôles et les accès de votre workspace
            </p>
          </div>
        </div>

        {/* ── KPI stat cards ── */}
        <div id="agents-kpis" style={{
          display: 'grid',
          gap: 12, marginBottom: 28,
        }}>
          {[
            { label: 'Collaborateurs', value: stats.total, color: '#6366f1', type: 'total' },
            { label: 'Agents actifs',  value: stats.actifs, color: '#10b981', type: 'actifs' },
            { label: 'Managers',       value: stats.managers, color: '#8b5cf6', type: 'managers' },
            { label: 'Admins',         value: stats.admins, color: '#f43f5e', type: 'admins' },
          ].map(({ label, value, color, type }) => (
            <div
              key={label}
              style={{
                background: 'var(--ac-card)',
                border: '1px solid var(--ac-border)',
                borderRadius: 14, padding: '18px 20px',
                display: 'flex', flexDirection: 'column', gap: 10,
                transition: 'box-shadow .2s, transform .2s',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}12`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={16} style={{ color }} />
              </div>
              <div>
                <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--ac-text-primary)', margin: 0, lineHeight: 1 }}>
                  {value}
                </p>
                <p style={{ fontSize: 12, color: 'var(--ac-text-muted)', margin: '4px 0 0', fontWeight: 500 }}>
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── tabs ── */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid var(--ac-border)',
          marginBottom: 24,
        }}>
          {tabItems.map(({ id, label, count }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`ac-tab-btn ${active ? 'ac-tab-active' : ''}`}
                style={{
                  padding: '10px 20px',
                  fontSize: 13, fontWeight: 700,
                  border: 'none', background: active ? 'rgba(99,102,241,0.06)' : 'none',
                  cursor: 'pointer',
                  color: active ? '#6366f1' : 'var(--ac-text-muted)',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: -1,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {label}
                {count != null && (
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    padding: '2px 7px', borderRadius: 20,
                    background: active ? 'rgba(99,102,241,0.12)' : 'var(--ac-bg)',
                    color: active ? '#6366f1' : 'var(--ac-text-muted)',
                    minWidth: 20, textAlign: 'center',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{
            marginBottom: 16, padding: '10px 14px',
            borderRadius: 10, fontSize: 13,
            background: 'rgba(244,63,94,0.08)',
            border: '1px solid rgba(244,63,94,0.25)',
            color: '#f43f5e',
          }}>
            {error}
          </div>
        )}

        {/* ══ TAB 1 — Collaborateurs ════════════════════════════ */}
        {activeTab === 'collaborateurs' && (
          <>
            {/* toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
                <Search size={14} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ac-text-muted)', pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un agent, rôle ou équipe…"
                  className="ac-search-input"
                  style={{
                    width: '100%', paddingLeft: 34, paddingRight: 12,
                    paddingTop: 8, paddingBottom: 8,
                    borderRadius: 10,
                    border: '1px solid var(--ac-border)',
                    background: 'var(--ac-card)',
                    fontSize: 13, color: 'var(--ac-text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color .2s, box-shadow .2s',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('invitations')}
                className="ac-invite-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#6366f1',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(99,102,241,0.25)',
                  transition: 'all .2s',
                }}
              >
                <UserPlus size={14} />
                Inviter un agent
              </button>
            </div>

            {/* cards grid */}
            {filteredAgents.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 20px',
                background: 'var(--ac-card)', borderRadius: 16,
                border: '1px solid var(--ac-border)',
              }}>
                <Users size={32} style={{ color: 'var(--ac-text-muted)', marginBottom: 12, opacity: 0.5 }} />
                <p style={{ color: 'var(--ac-text-muted)', fontSize: 14, fontWeight: 600, margin: 0 }}>
                  {searchQuery ? 'Aucun agent ne correspond à votre recherche.' : 'Aucun agent enregistré.'}
                </p>
                <p style={{ color: 'var(--ac-text-muted)', fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                  {searchQuery ? 'Essayez un autre terme de recherche.' : 'Invitez votre premier collaborateur pour commencer.'}
                </p>
              </div>
            ) : (
              <div id="agents-grid" style={{
                display: 'grid',
                gap: 14,
              }}>
                {filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onClick={() => setSelectedAgent(agent)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ TAB 2 — Invitations ══════════════════════════════ */}
        {activeTab === 'invitations' && (
          <div style={{ maxWidth: 480 }}>
            <div style={{
              background: 'var(--ac-card)',
              border: '1px solid var(--ac-border)',
              borderRadius: 16,
              padding: 24,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ac-text-primary)', margin: '0 0 4px' }}>
                Options d&apos;invitation
              </h3>
              <p style={{ fontSize: 12, color: 'var(--ac-text-muted)', margin: '0 0 24px' }}>
                Partagez le lien ou générez une clé unique pour enregistrer un nouveau collaborateur.
              </p>

              {/* link */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ac-text-muted)', display: 'block', marginBottom: 8 }}>
                  Lien d&apos;inscription
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly
                    value={registerUrl}
                    style={{
                      flex: 1, minWidth: 0, padding: '9px 12px',
                      borderRadius: 10, border: '1px solid var(--ac-border)',
                      background: 'var(--ac-bg)',
                      fontSize: 12, fontFamily: 'monospace',
                      color: 'var(--ac-text-primary)',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '9px 14px', borderRadius: 10,
                      border: '1px solid var(--ac-border)',
                      background: 'var(--ac-bg)',
                      color: 'var(--ac-text-primary)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <Copy size={13} />
                    {copiedLink ? 'Copié !' : 'Copier'}
                  </button>
                </div>
              </div>

              {/* key */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ac-text-muted)', display: 'block', marginBottom: 8 }}>
                  Clé d&apos;activation
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '10px 18px', borderRadius: 10,
                    background: '#6366f1', border: 'none',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                  }}
                >
                  <KeyRound size={14} /> Générer une clé
                </button>

                <div style={{
                  marginTop: 14, padding: '14px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--ac-border)',
                  background: 'var(--ac-bg)',
                  minHeight: 56,
                  display: 'flex', alignItems: 'center',
                }}>
                  {rawKey ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                      <code style={{
                        flex: 1, fontSize: 13, fontFamily: 'monospace',
                        fontWeight: 700, color: '#10b981',
                        wordBreak: 'break-all',
                      }}>
                        {rawKey}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '6px 10px', borderRadius: 8,
                          border: '1px solid var(--ac-border)',
                          background: 'var(--ac-card)',
                          color: 'var(--ac-text-primary)',
                          fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <Copy size={11} />
                        {copiedKey ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--ac-text-muted)', fontStyle: 'italic', width: '100%', textAlign: 'center' }}>
                      Cliquez sur le bouton pour générer une clé unique.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Profile Modal ── */}
      {selectedAgent && (
        <AgentModal
          agent={selectedAgent}
          currentUser={currentUser}
          onClose={() => { setSelectedAgent(null); setRoleMenuOpen(null); }}
          onChangeRole={applyRole}
          onToggleStatus={toggleStatus}
          busyId={busyId}
          roleMenuOpen={roleMenuOpen}
          setRoleMenuOpen={setRoleMenuOpen}
          onPreviewCv={handlePreviewCv}
        />
      )}

      {/* ── CV Preview Modal ── */}
      {previewCvUrl && (
        <CvPreviewModal
          url={previewCvUrl}
          name={previewCvName}
          onClose={() => {
            URL.revokeObjectURL(previewCvUrl);
            setPreviewCvUrl(null);
            setPreviewCvName('');
          }}
        />
      )}
    </>
  );
}

/* ─── CV Preview Modal Component ─────────────────────────────── */
function CvPreviewModal({ url, name, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 110, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--ac-card)',
          border: '1px solid var(--ac-border)',
          borderRadius: 20,
          width: '90%', maxWidth: 900,
          height: '85vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--ac-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ac-text-primary)' }}>
            CV de {name}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.08)', border: 'none',
              borderRadius: '50%', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--ac-text-muted)',
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ flex: 1, background: '#1e1e24', position: 'relative' }}>
          <iframe
            src={url}
            title={`CV_${name}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
