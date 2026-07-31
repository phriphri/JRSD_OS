import React, { useState, useEffect } from 'react';
import { useGlobalStore } from '../store/globalStore';

const TRANSLATIONS = {
  FR: {
    loading: 'Chargement...',
    no_file: 'Veuillez sélectionner un fichier',
    no_dest: 'Veuillez sélectionner une destination',
    err_upload: 'Erreur lors du téléversement',
    del_confirm: 'Êtes-vous sûr de vouloir supprimer ce document ?',
    err_del: 'Erreur lors de la suppression',
    subtitle: 'Ressources et fichiers partagés',
    documents: 'Documents',
    upload_btn: 'Téléverser un document',
    no_docs: 'Aucun document pour le moment',
    download: 'Télécharger',
    delete: 'Supprimer',
    preview: 'Aperçu',
    gen: 'Général',
    team_prefix: 'Équipe: ',
    unknown_team: 'Équipe inconnue',
    proj_prefix: 'Projet: ',
    unknown_proj: 'Projet inconnu',
    unknown: 'Inconnu',
    upload_title: 'Téléverser un document',
    file_label: 'Fichier',
    dest_label: 'Destination',
    gen_everyone: 'Général (tout le monde)',
    team_admin: 'Équipe',
    team_my: 'Mon équipe',
    proj_label: 'Un projet',
    team: 'Équipe',
    select_team: 'Sélectionner une équipe',
    no_team: "Vous n'avez pas d'équipe assignée.",
    proj: 'Projet',
    select_proj: 'Sélectionner un projet',
    no_proj: "Vous n'êtes membre d'aucun projet.",
    cancel: 'Annuler',
    uploading: 'Téléversement...',
    upload: 'Téléverser',
    close: 'Fermer',
  },
  EN: {
    loading: 'Loading...',
    no_file: 'Please select a file',
    no_dest: 'Please select a destination',
    err_upload: 'Error during upload',
    del_confirm: 'Are you sure you want to delete this document?',
    err_del: 'Error deleting',
    subtitle: 'Shared resources and files',
    documents: 'Documents',
    upload_btn: 'Upload a document',
    no_docs: 'No documents at the moment',
    download: 'Download',
    delete: 'Delete',
    preview: 'Preview',
    gen: 'General',
    team_prefix: 'Team: ',
    unknown_team: 'Unknown team',
    proj_prefix: 'Project: ',
    unknown_proj: 'Unknown project',
    unknown: 'Unknown',
    upload_title: 'Upload a document',
    file_label: 'File',
    dest_label: 'Destination',
    gen_everyone: 'General (everyone)',
    team_admin: 'Team',
    team_my: 'My team',
    proj_label: 'A project',
    team: 'Team',
    select_team: 'Select a team',
    no_team: "You don't have an assigned team.",
    proj: 'Project',
    select_proj: 'Select a project',
    no_proj: "You are not a member of any project.",
    cancel: 'Cancel',
    uploading: 'Uploading...',
    upload: 'Upload',
    close: 'Close',
  }
};

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
  webp: 'bg-purple-500/10 text-purple-400 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
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
  webp: '🖼️',
  gif: '🖼️',
  txt: '📃',
  zip: '📦',
  rar: '📦',
};

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

export default function Documents() {
  const { documents, users, projects, teams, currentUser, fetchDocuments, uploadDocument, deleteDocument, language } = useGlobalStore();
  const t = TRANSLATIONS[language === 'EN' ? 'EN' : 'FR'];

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">{t.loading}</div>;
  }

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
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
      setError(t.no_file);
      return;
    }

    if (targetType !== 'all' && !targetId) {
      setError(t.no_dest);
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
      setError(result.message || t.err_upload);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm(t.del_confirm)) {
      return;
    }

    const result = await deleteDocument(docId);
    if (!result.success) {
      alert(result.message || t.err_del);
    }
  };

  const handleDownload = (downloadUrl, fileName) => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
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

  const isImage = (fileType) => {
    const ext = fileType?.toLowerCase() || '';
    return IMAGE_EXTENSIONS.includes(ext);
  };

  const isPdf = (fileType) => {
    return (fileType?.toLowerCase() || '') === 'pdf';
  };

  const getTargetLabel = (doc) => {
    if (doc.targetType === 'all') return t.gen;
    if (doc.targetType === 'team') {
      const team = teams.find(tm => tm.id === doc.targetId);
      return team ? `${t.team_prefix}${team.nom}` : t.unknown_team;
    }
    if (doc.targetType === 'project') {
      const project = projects.find(p => p.id === doc.targetId);
      return project ? `${t.proj_prefix}${project.name}` : t.unknown_proj;
    }
    return t.unknown;
  };

  const getAvailableTeams = () => {
    if (!currentUser) return [];
    if (currentUser?.role === 'admin') return teams;
    const userTeam = teams.find(tm => tm.id === currentUser.teamId);
    return userTeam ? [userTeam] : [];
  };

  const getAvailableProjects = () => {
    if (!currentUser) return [];
    if (currentUser?.role === 'admin') return projects;
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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{t.subtitle}</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t.documents}</h2>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t.upload_btn}
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t.no_docs}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {documents.map((doc) => {
            const uploader = users.find(u => u.id === doc.uploadedBy);
            const tStyle = getFileTypeStyle(doc.fileType);
            const hasImagePreview = isImage(doc.fileType);
            const hasPdfReader = isPdf(doc.fileType);

            return (
              <div key={doc.id} className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 rounded-xl p-5 transition-all duration-200 flex flex-col hover:shadow-lg hover:-translate-y-1">
                {hasImagePreview ? (
                  <div 
                    onClick={() => setPreviewDoc(doc)} 
                    className="relative w-full h-36 mb-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer border border-gray-100 dark:border-zinc-800 group/img"
                  >
                    <img 
                      src={doc.downloadUrl} 
                      alt={doc.name} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105" 
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                      {t.preview}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${tStyle}`}>
                      <span className="text-lg">{getFileIcon(doc.fileType)}</span>
                    </div>
                    <div className="flex gap-2">
                      {hasPdfReader && (
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="text-gray-500 dark:text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                          title={t.preview}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(doc.downloadUrl, doc.name)}
                        className="text-gray-500 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                        title={t.download}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      {canDelete(doc) && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-gray-500 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title={t.delete}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-1 truncate" title={doc.name}>{doc.name}</h3>
                  {hasImagePreview && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleDownload(doc.downloadUrl, doc.name)}
                        className="text-gray-500 dark:text-zinc-500 hover:text-blue-500 transition-colors"
                        title={t.download}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      {canDelete(doc) && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-gray-500 dark:text-zinc-500 hover:text-red-500 transition-colors"
                          title={t.delete}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-gray-500 dark:text-zinc-500 text-xs mb-2">{doc.fileType?.toUpperCase() || 'UNKNOWN'}</p>
                <p className="text-gray-400 dark:text-zinc-400 text-xs mb-4">{new Date(doc.createdAt).toLocaleDateString(language === 'EN' ? 'en-US' : 'fr-FR')}</p>

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

      {/* PDF Reader / Image Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getFileIcon(previewDoc.fileType)}</span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{previewDoc.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewDoc.downloadUrl, previewDoc.name)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {t.download}
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-900/5 dark:bg-black/30">
              {isImage(previewDoc.fileType) ? (
                <img
                  src={previewDoc.downloadUrl}
                  alt={previewDoc.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                />
              ) : isPdf(previewDoc.fileType) ? (
                <iframe
                  src={previewDoc.downloadUrl}
                  title={previewDoc.name}
                  className="w-full h-[70vh] rounded-lg border-0"
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium">{previewDoc.name}</p>
                  <button
                    onClick={() => handleDownload(previewDoc.downloadUrl, previewDoc.name)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                  >
                    {t.download}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-zinc-800 shrink-0">
              <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">{t.upload_title}</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-4 sm:p-6 space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.file_label}</label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.dest_label}</label>
                <select
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(e.target.value);
                    setTargetId('');
                  }}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                >
                  {currentUser?.role === 'admin' && <option value="all">{t.gen_everyone}</option>}
                  <option value="team">{currentUser?.role === 'admin' ? t.team_admin : t.team_my}</option>
                  <option value="project">{t.proj_label}</option>
                </select>
              </div>

              {targetType === 'team' && getAvailableTeams().length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.team}</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                  >
                    <option value="">{t.select_team}</option>
                    {getAvailableTeams().map(team => (
                      <option key={team.id} value={team.id}>{team.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'team' && getAvailableTeams().length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.no_team}</p>
              )}

              {targetType === 'project' && getAvailableProjects().length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.proj}</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                  >
                    <option value="">{t.select_proj}</option>
                    {getAvailableProjects().map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'project' && getAvailableProjects().length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.no_proj}</p>
              )}

              {error && (
                <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? t.uploading : t.upload}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
