import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { X, Camera, Save, User, Mail, Shield, Users } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { currentUser, token, setCurrentUser } = useGlobalStore();
  
  const [formData, setFormData] = useState({
    nom_prenom: currentUser?.fullName || '',
    email: currentUser?.email || ''
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentUser?.avatar ? `http://localhost:3001${currentUser.avatar}` : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen || !currentUser) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

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

      const res = await fetch('http://localhost:3001/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      // Update current user locally
      setCurrentUser({
        ...currentUser,
        fullName: formData.nom_prenom,
        email: formData.email,
        avatar: json.avatar || currentUser.avatar,
        initials: formData.nom_prenom.substring(0, 2).toUpperCase()
      });

      setSuccess('Profil mis à jour avec succès.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const rColors = {
    admin: 'text-red-500 bg-red-100 dark:bg-red-500/10 dark:text-red-400',
    manager: 'text-blue-500 bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400',
    employe: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400'
  };
  const roleColor = rColors[currentUser.role?.toLowerCase()] || rColors.employe;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Modifier mon profil</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">{error}</div>}
          {success && <div className="p-3 text-sm text-emerald-600 bg-emerald-50 rounded-lg dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">{success}</div>}
          
          <div className="flex flex-col items-center">
            <div className="relative group">
              {preview ? (
                <img src={preview} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-sm" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-sm border-4 border-white dark:border-slate-800">
                  {currentUser.initials}
                </div>
              )}
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-1.5 rounded-full shadow-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Camera className="w-4 h-4" />
                <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <User className="w-4 h-4 text-slate-400" /> Nom & Prénom
              </label>
              <input
                type="text"
                name="nom_prenom"
                required
                value={formData.nom_prenom}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Mail className="w-4 h-4 text-slate-400" /> Adresse Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
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

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
