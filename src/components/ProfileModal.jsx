import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { X, Camera, Save, User, Mail, Shield, Users, FileText, Upload, Trash2 } from 'lucide-react';
import { api } from '../services/api';

/* ── tiny helpers ───────────────────────────────────────────── */
function cvLabel(cvUrl) {
  if (!cvUrl) return null;
  return decodeURIComponent(cvUrl.split('/').pop()); // filename from path
}

function isPdf(cvUrl) {
  return cvUrl?.toLowerCase().endsWith('.pdf');
}

export default function ProfileModal({ isOpen, onClose }) {
  const { currentUser, setCurrentUser, fetchUsers, refreshCurrentUser } = useGlobalStore();

  const [formData, setFormData] = useState({
    nom_prenom: currentUser?.fullName || '',
    email: currentUser?.email || ''
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(
    currentUser?.avatar ? (currentUser.avatar.startsWith('http') || currentUser.avatar.startsWith('data:') ? currentUser.avatar : `http://localhost:3001${currentUser.avatar}`) : null
  );

  // CV state
  const [cvFile, setCvFile]         = useState(null);
  const [cvPreview, setCvPreview]   = useState(null); // PNG preview URL
  const [cvUploading, setCvUploading] = useState(false);
  const [cvDeleting, setCvDeleting]   = useState(false);
  const [cvUrl, setCvUrl]           = useState(currentUser?.cv_url || null);
  const [cvError, setCvError]       = useState(null);
  const [cvSuccess, setCvSuccess]   = useState(null);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);

  const [deleteAvatar, setDeleteAvatar] = useState(false);

  if (!isOpen || !currentUser) return null;

  const isAdmin = currentUser.role?.toLowerCase() === 'admin';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setDeleteAvatar(false);
    }
  };

  const handleDeleteAvatar = () => {
    setFile(null);
    setPreview(null);
    setDeleteAvatar(true);
  };

  /* ── CV handlers ─────────────────────────────────────────── */
  const handleCvChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    // Validate client-side
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(selected.type)) {
      setCvError('Format non supporté. Utilisez PDF ou PNG.');
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setCvError('Le fichier dépasse 5 Mo.');
      return;
    }
    setCvError(null);
    setCvFile(selected);
    if (selected.type.startsWith('image/')) {
      setCvPreview(URL.createObjectURL(selected));
    } else {
      setCvPreview(null);
    }
  };

  const handleCvUpload = async () => {
    if (!cvFile) return;
    setCvUploading(true);
    setCvError(null);
    setCvSuccess(null);
    try {
      const fd = new FormData();
      fd.append('cv', cvFile);
      const res = await api.users.uploadCv(fd);
      if (!res.success) throw new Error(res.message);
      setCvUrl(res.cv_url);
      setCvFile(null);
      setCvPreview(null);
      if (typeof setCurrentUser === 'function') {
        setCurrentUser({ ...currentUser, cv_url: res.cv_url });
      } else {
        console.warn('setCurrentUser is not defined in useGlobalStore');
      }
      setCvSuccess('CV enregistré avec succès.');
      setTimeout(() => setCvSuccess(null), 3000);
    } catch (err) {
      setCvError(err.message || 'Erreur lors de l\'envoi.');
    } finally {
      setCvUploading(false);
    }
  };

  const handleCvDelete = async () => {
    if (!cvUrl) return;
    setCvDeleting(true);
    setCvError(null);
    setCvSuccess(null);
    try {
      const res = await api.users.deleteCv();
      if (!res.success) throw new Error(res.message);
      setCvUrl(null);
      setCvFile(null);
      setCvPreview(null);
      if (typeof setCurrentUser === 'function') {
        setCurrentUser({ ...currentUser, cv_url: null });
      } else {
        console.warn('setCurrentUser is not defined in useGlobalStore');
      }
      setCvSuccess('CV supprimé.');
      setTimeout(() => setCvSuccess(null), 2500);
    } catch (err) {
      setCvError(err.message || 'Erreur lors de la suppression.');
    } finally {
      setCvDeleting(false);
    }
  };

  /* ── Profile save ─────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = new FormData();
      data.append('nom_prenom', formData.nom_prenom);
      data.append('email', formData.email);
      if (file) {
        data.append('avatar', file);
      }
      data.append('deleteAvatar', deleteAvatar ? 'true' : 'false');

      // Utilise le helper API centralisé (gère le token automatiquement)
      const json = await api.users.updateProfile(data);
      if (!json.success) throw new Error(json.message);

      // Re-fetch le profil depuis le serveur → mise à jour propre dans le store
      if (typeof refreshCurrentUser === 'function') {
        await refreshCurrentUser();
      }
      if (typeof fetchUsers === 'function') {
        fetchUsers();
      }
      setSuccess('Profil mis à jour avec succès.');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const rColors = {
    admin:   'text-red-500 bg-red-100 dark:bg-red-500/10 dark:text-red-400',
    manager: 'text-blue-500 bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400',
    employe: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400'
  };
  const roleColor = rColors[currentUser.role?.toLowerCase()] || rColors.employe;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Modifier mon profil</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error   && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">{error}</div>}
            {success && <div className="p-3 text-sm text-emerald-600 bg-emerald-50 rounded-lg dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">{success}</div>}

            {/* avatar */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                {preview ? (
                  <img src={preview} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-sm" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-sm border-4 border-white dark:border-slate-800">
                    {currentUser.initials}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 flex gap-1">
                  <label htmlFor="avatar-upload" className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-1.5 rounded-full shadow-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                  {preview && (
                    <button
                      type="button"
                      onClick={handleDeleteAvatar}
                      title="Supprimer la photo"
                      className="bg-white dark:bg-slate-800 text-red-500 p-1.5 rounded-full shadow-md border border-slate-200 dark:border-slate-700 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* fields */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <User className="w-4 h-4 text-slate-400" /> Nom & Prénom
                </label>
                <input
                  type="text" name="nom_prenom" required
                  value={formData.nom_prenom} onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <Mail className="w-4 h-4 text-slate-400" /> Adresse Email
                </label>
                <input
                  type="email" name="email" required
                  value={formData.email} onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <Shield className="w-4 h-4 text-slate-400" /> Rôle
                  </label>
                  <div className={`w-full px-3 py-2 border border-transparent rounded-lg text-sm font-semibold cursor-not-allowed ${roleColor}`}>
                    {currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Employé'}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <Users className="w-4 h-4 text-slate-400" /> Équipe
                  </label>
                  <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed">
                    {currentUser.team_id ? `Équipe #${currentUser.team_id}` : 'Aucune'}
                  </div>
                </div>
              </div>
            </div>

            {/* save button */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>

          {/* ── CV section (non-admin only) ───────────────────── */}
          {!isAdmin && (
            <div className="px-6 pb-6">
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Mon CV
                  </span>
                  <span className="text-xs text-slate-400 font-normal">(facultatif · PDF ou PNG · max 5 Mo)</span>
                </div>

                {/* feedback */}
                {cvError   && <p className="text-xs text-red-500 mb-2">{cvError}</p>}
                {cvSuccess && <p className="text-xs text-emerald-500 mb-2">{cvSuccess}</p>}

                {/* current CV */}
                {cvUrl && !cvFile && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mb-3">
                    {isPdf(cvUrl) ? (
                      <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                    ) : (
                      <img
                        src={cvUrl.startsWith('http') || cvUrl.startsWith('data:') ? cvUrl : `http://localhost:3001${cvUrl}`}
                        alt="CV"
                        className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {cvLabel(cvUrl)}
                      </p>
                      <p className="text-[10px] text-slate-400">CV actuel</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCvDelete}
                      disabled={cvDeleting}
                      title="Supprimer le CV"
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* new file selected preview */}
                {cvFile && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 mb-3">
                    {cvPreview ? (
                      <img src={cvPreview} alt="preview" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                    )}
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">
                      {cvFile.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setCvFile(null); setCvPreview(null); setCvError(null); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* upload zone / action */}
                {cvFile ? (
                  <button
                    type="button"
                    onClick={handleCvUpload}
                    disabled={cvUploading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {cvUploading ? 'Envoi en cours…' : 'Confirmer l\'envoi'}
                  </button>
                ) : (
                  <label
                    htmlFor="cv-upload"
                    className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5 transition-all group"
                  >
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {cvUrl ? 'Remplacer le CV' : 'Déposer un CV'}
                    </span>
                    <input
                      id="cv-upload"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleCvChange}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
