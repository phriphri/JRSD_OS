import React, { useState, useEffect } from 'react';
import { useGlobalStore } from '../store/globalStore';

const TYPE_COLORS = {
  pdf: 'bg-red-500/10 text-red-400 border-red-500/20 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
  xlsx: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
  xls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
  csv: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
  docx: 'bg-blue-500/10 text-blue-400 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
  doc: 'bg-blue-500/10 text-blue-400 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
  png: 'bg-purple-500/10 text-purple-400 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
  jpg: 'bg-purple-500/10 text-purple-400 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
  jpeg: 'bg-purple-500/10 text-purple-400 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
  gif: 'bg-purple-500/10 text-purple-400 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
  txt: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 dark:bg-zinc-500/20 dark:text-zinc-300 dark:border-zinc-500/30',
  zip: 'bg-orange-500/10 text-orange-400 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30',
  rar: 'bg-orange-500/10 text-orange-400 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30',
};

const FILE_ICONS = {
  pdf: '📄',
  xlsx: '📊',
  xls: '📊',
  csv: '📊',
  docx: '📝',
  doc: '📝',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
  gif: '🖼️',
  txt: '📃',
  zip: '📦',
  rar: '📦',
};

export default function Documents() {
  const { documents, users, projects, teams, currentUser, fetchDocuments, uploadDocument, deleteDocument } = useGlobalStore();

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  }

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetType, setTargetType] = useState('all');
  const [targetId, setTargetId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    if (targetType !== 'all' && !targetId) {
      setError('Veuillez sélectionner une destination');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('target_type', targetType);
    if (targetType !== 'all') {
      formData.append('target_id', targetId);
    }

    const result = await uploadDocument(formData);
    setUploading(false);

    if (result.success) {
      setShowUploadModal(false);
      setSelectedFile(null);
      setTargetType('all');
      setTargetId('');
    } else {
      setError(result.message || 'Erreur lors du téléversement');
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    const result = await deleteDocument(docId);
    if (!result.success) {
      alert(result.message || 'Erreur lors de la suppression');
    }
  };

  const handleDownload = (downloadUrl, fileName) => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileTypeStyle = (fileType) => {
    const ext = fileType?.toLowerCase() || '';
    return TYPE_COLORS[ext] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  const getFileIcon = (fileType) => {
    const ext = fileType?.toLowerCase() || '';
    return FILE_ICONS[ext] || '📄';
  };

  const getTargetLabel = (doc) => {
    if (doc.targetType === 'all') return 'Général';
    if (doc.targetType === 'team') {
      const team = teams.find(t => t.id === doc.targetId);
      return team ? `Équipe: ${team.nom}` : 'Équipe inconnue';
    }
    if (doc.targetType === 'project') {
      const project = projects.find(p => p.id === doc.targetId);
      return project ? `Projet: ${project.name}` : 'Projet inconnu';
    }
    return 'Inconnu';
  };

  const getAvailableTeams = () => {
    if (!currentUser) return [];
    if (currentUser?.role === 'admin') return teams;
    // Non-admin users only see their own team
    const userTeam = teams.find(t => t.id === currentUser.teamId);
    return userTeam ? [userTeam] : [];
  };

  const getAvailableProjects = () => {
    if (!currentUser) return [];
    if (currentUser?.role === 'admin') return projects;
    // Non-admin users only see projects they are members of
    return projects.filter(p => 
      p.collaborators && p.collaborators.some(c => c.id === currentUser.id)
    );
  };

  const canDelete = (doc) => {
    if (!currentUser) return false;
    if (currentUser?.role === 'admin') return true;
    return doc.uploadedBy === currentUser.id;
  };

  return (
    <section id="documents" className="scroll-mt-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Ressources et fichiers partagés</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Documents</h2>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Téléverser un document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Aucun document pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {documents.map((doc) => {
            const uploader = users.find(u => u.id === doc.uploadedBy);
            const tStyle = getFileTypeStyle(doc.fileType);

            return (
              <div key={doc.id} className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 rounded-xl p-5 transition-all duration-200 flex flex-col hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${tStyle}`}>
                    <span className="text-lg">{getFileIcon(doc.fileType)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(doc.downloadUrl, doc.name)}
                      className="text-gray-500 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      title="Télécharger"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    {canDelete(doc) && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-gray-500 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-1 truncate" title={doc.name}>{doc.name}</h3>
                <p className="text-gray-500 dark:text-zinc-500 text-xs mb-2">{doc.fileType?.toUpperCase() || 'UNKNOWN'}</p>
                <p className="text-gray-400 dark:text-zinc-400 text-xs mb-4">{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</p>

                <div className="mt-auto pt-3 border-t border-gray-200 dark:border-zinc-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    {uploader && (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 flex items-center justify-center text-[10px] text-gray-600 dark:text-zinc-400">
                          {uploader.initials || uploader.name?.[0] || 'U'}
                        </div>
                        <span className="text-gray-500 dark:text-zinc-400 text-[10px] truncate max-w-[80px]">{uploader.fullName || uploader.name}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-medium px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700">
                    {getTargetLabel(doc)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Téléverser un document</h3>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fichier</label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Destination</label>
                <select
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(e.target.value);
                    setTargetId('');
                  }}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                >
                  {currentUser?.role === 'admin' && <option value="all">Général (tout le monde)</option>}
                  <option value="team">{currentUser?.role === 'admin' ? 'Équipe' : 'Mon équipe'}</option>
                  <option value="project">Un projet</option>
                </select>
              </div>

              {targetType === 'team' && getAvailableTeams().length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Équipe</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                  >
                    <option value="">Sélectionner une équipe</option>
                    {getAvailableTeams().map(team => (
                      <option key={team.id} value={team.id}>{team.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'team' && getAvailableTeams().length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Vous n'avez pas d'équipe assignée.</p>
              )}

              {targetType === 'project' && getAvailableProjects().length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Projet</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                  >
                    <option value="">Sélectionner un projet</option>
                    {getAvailableProjects().map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'project' && getAvailableProjects().length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Vous n'êtes membre d'aucun projet.</p>
              )}

              {error && (
                <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setTargetType('all');
                    setTargetId('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Téléversement...' : 'Téléverser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
