import React, { useState, useMemo, useRef } from 'react';
import {
  Film,
  Plus,
  Search,
  FolderOpen,
  Download,
  Trash2,
  Copy,
  Edit3,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Clapperboard,
  Video,
  AlertTriangle,
  HardDrive,
  Info,
  Layers,
  ChevronDown,
  ArrowRight,
  Sliders,
  Calendar,
  X,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ProjectSummary, ProjectSortOption, FormatType, StageId } from '../../types/filmStudio';
import { ApiSettingsModal } from '../settings/ApiSettingsModal';

export const ProjectDashboard: React.FC = () => {
  const {
    projectList,
    openProject,
    createNewProject,
    renameProject,
    duplicateProject,
    deleteProject,
    exportSingleProject,
    exportStudioBackup,
    importProjectFromFile,
    migrationReport,
  } = useProject();

  const [showSettings, setShowSettings] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<'ALL' | StageId>('ALL');
  const [sortOption, setSortOption] = useState<ProjectSortOption>('updated_desc');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectFormat, setNewProjectFormat] = useState<FormatType>('Shorts/Reels');
  const [newProjectAspectRatio, setNewProjectAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [newProjectEpisodes, setNewProjectEpisodes] = useState(1);

  const [renameTarget, setRenameTarget] = useState<ProjectSummary | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filter and Sort projects
  const filteredProjects = useMemo(() => {
    return projectList
      .filter((p) => {
        const matchesSearch =
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.logline && p.logline.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (Array.isArray(p.genres)
            ? p.genres.some((g) => typeof g === 'string' && g.toLowerCase().includes(searchQuery.toLowerCase()))
            : typeof (p as any).genres === 'string' && (p as any).genres.toLowerCase().includes(searchQuery.toLowerCase())) ||
          p.format.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStage = selectedStageFilter === 'ALL' || p.currentStage === selectedStageFilter;
        return matchesSearch && matchesStage;
      })
      .sort((a, b) => {
        if (sortOption === 'updated_desc') {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortOption === 'updated_asc') {
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        if (sortOption === 'title_asc') {
          return a.title.localeCompare(b.title);
        }
        if (sortOption === 'title_desc') {
          return b.title.localeCompare(a.title);
        }
        return 0;
      });
  }, [projectList, searchQuery, selectedStageFilter, sortOption]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newProjectTitle.trim() || 'Untitled Film Project';
    await createNewProject(title, {
      format: newProjectFormat,
      aspectRatio: newProjectAspectRatio,
      episodeCount: newProjectEpisodes,
    });
    setShowCreateModal(false);
    setNewProjectTitle('');
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const trimmed = renameInput.trim();
    if (!trimmed) return;

    await renameProject(renameTarget.id, trimmed);
    showToast(`Project renamed to "${trimmed}"`);
    setRenameTarget(null);
    setRenameInput('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmTitle.trim().toLowerCase() !== deleteTarget.title.trim().toLowerCase()) {
      setDeleteError('Project title does not match. Please re-enter the exact title.');
      return;
    }

    await deleteProject(deleteTarget.id);
    showToast(`Project "${deleteTarget.title}" was deleted.`, 'info');
    setDeleteTarget(null);
    setDeleteConfirmTitle('');
    setDeleteError('');
  };

  const handleDuplicate = async (project: ProjectSummary) => {
    const copy = await duplicateProject(project.id);
    if (copy) {
      showToast(`Duplicated as "${copy.title}"`);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importProjectFromFile(content);
      if (res.success && res.project) {
        showToast(`Successfully imported "${res.project.title}"!`);
      } else {
        showToast(res.error || 'Failed to import project file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#070B10] text-[#D7DCE2] flex flex-col font-sans select-none antialiased">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-fade-in ${
            notification.type === 'error'
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : notification.type === 'info'
              ? 'bg-[#111820] border-[#1C2735] text-[#00AFFF]'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Top Studio Brand Header */}
      <header className="h-16 bg-[#0B1017] border-b border-[#1C2735] px-4 md:px-8 flex items-center justify-between z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00AFFF] to-[#005580] flex items-center justify-center font-bold text-white shadow-lg shadow-[#00AFFF]/20 border border-[#00AFFF]/40">
            <span className="font-['Exo_2'] tracking-tighter text-sm">X7</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-['Exo_2'] font-bold text-base tracking-wide text-white">
                XEMACS7
              </span>
              <span className="text-[10px] font-semibold bg-[#1C2735] text-[#00AFFF] px-1.5 py-0.5 rounded border border-[#00AFFF]/30">
                AI FILM STUDIO 2.0
              </span>
            </div>
            <p className="text-[11px] text-[#79838E] hidden sm:block tracking-tight">
              Production Dashboard • Multi-Project Studio
            </p>
          </div>
        </div>

        {/* Global Studio Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] px-3 py-1.5 rounded-lg border border-[#1C2735] transition-colors cursor-pointer"
            title="Import project or studio archive JSON"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span className="hidden sm:inline text-xs">Import Project</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileImport}
          />

          {projectList.length > 0 && (
            <button
              onClick={() => exportStudioBackup()}
              className="hidden md:flex items-center space-x-1.5 text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] px-3 py-1.5 rounded-lg border border-[#1C2735] transition-colors cursor-pointer"
              title="Download backup archive of all projects"
            >
              <Download className="w-3.5 h-3.5 text-[#79838E]" />
              <span className="text-xs">Backup All</span>
            </button>
          )}

          {/* API Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-1.5 text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] px-3 py-1.5 rounded-lg border border-[#1C2735] hover:border-[#00AFFF]/50 transition-colors cursor-pointer"
            title="Configure YouTube Data API & Gemini AI integrations"
          >
            <Settings className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span className="hidden sm:inline text-xs">API Settings</span>
          </button>

          <button
            onClick={() => {
              setNewProjectTitle('');
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-1.5 text-xs bg-[#00AFFF] hover:bg-[#0095db] text-white font-bold px-3.5 py-1.5 rounded-lg shadow-lg shadow-[#00AFFF]/20 border border-[#00AFFF]/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Migration Alert Banner if legacy project was migrated */}
        {migrationReport && migrationReport.attempted && (
          <div className="bg-[#111820] border border-[#00AFFF]/40 rounded-xl p-4 flex items-start justify-between shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-[#00AFFF]/10 text-[#00AFFF] mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                  <span>Legacy Project Restored Safely</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                    MIGRATED
                  </span>
                </h4>
                <p className="text-[11px] text-[#79838E]">
                  Your previous work from "{migrationReport.migratedLegacyProjectTitle || 'Legacy Project'}" has been
                  safely imported into the new multi-project manager. An untouched backup has also been preserved in
                  storage.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Title & Stats Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#1C2735]">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="font-['Exo_2'] text-2xl font-bold text-white tracking-tight">
                My Film Productions
              </h1>
              <span className="text-xs font-bold bg-[#111820] text-[#00AFFF] border border-[#1C2735] px-2.5 py-0.5 rounded-full">
                {projectList.length} {projectList.length === 1 ? 'Project' : 'Projects'}
              </span>
            </div>
            <p className="text-xs text-[#79838E] mt-1 flex items-center space-x-2">
              <HardDrive className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>Browser-Local Storage • Independent Isolated Pipelines • Safe Export & Restore</span>
            </p>
          </div>

          {/* Quick Storage Status Notice */}
          <div className="flex items-center space-x-3 text-xs bg-[#0E141D] border border-[#1C2735] px-3.5 py-2 rounded-lg">
            <Info className="w-3.5 h-3.5 text-[#00AFFF] flex-shrink-0" />
            <span className="text-[#79838E] text-[11px]">
              Projects are stored locally in your browser storage. Export JSON backups to transfer between devices.
            </span>
          </div>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#79838E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search productions by title, genre, or premise..."
              className="w-full bg-[#0E141D] border border-[#1C2735] rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-[#79838E] focus:outline-none focus:border-[#00AFFF] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#79838E] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Stage Filter Buttons */}
            <div className="flex items-center space-x-1 bg-[#0E141D] p-1 rounded-lg border border-[#1C2735] text-[11px]">
              <button
                onClick={() => setSelectedStageFilter('ALL')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  selectedStageFilter === 'ALL'
                    ? 'bg-[#00AFFF] text-white font-semibold'
                    : 'text-[#79838E] hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedStageFilter('stage1')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  selectedStageFilter === 'stage1'
                    ? 'bg-[#00AFFF] text-white font-semibold'
                    : 'text-[#79838E] hover:text-white'
                }`}
              >
                Stage 1
              </button>
              <button
                onClick={() => setSelectedStageFilter('stage2')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  selectedStageFilter === 'stage2'
                    ? 'bg-[#00AFFF] text-white font-semibold'
                    : 'text-[#79838E] hover:text-white'
                }`}
              >
                Stage 2
              </button>
              <button
                onClick={() => setSelectedStageFilter('stage3')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  selectedStageFilter === 'stage3'
                    ? 'bg-[#00AFFF] text-white font-semibold'
                    : 'text-[#79838E] hover:text-white'
                }`}
              >
                Stage 3
              </button>
              <button
                onClick={() => setSelectedStageFilter('stage4')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  selectedStageFilter === 'stage4'
                    ? 'bg-[#00AFFF] text-white font-semibold'
                    : 'text-[#79838E] hover:text-white'
                }`}
              >
                Stage 4
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 bg-[#0E141D] border border-[#1C2735] px-2.5 py-1.5 rounded-lg text-xs">
              <Clock className="w-3.5 h-3.5 text-[#79838E]" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as ProjectSortOption)}
                className="bg-transparent text-[#D7DCE2] text-xs focus:outline-none cursor-pointer"
              >
                <option value="updated_desc" className="bg-[#111820] text-white">
                  Recently Modified
                </option>
                <option value="updated_asc" className="bg-[#111820] text-white">
                  Oldest Modified
                </option>
                <option value="title_asc" className="bg-[#111820] text-white">
                  Title (A–Z)
                </option>
                <option value="title_desc" className="bg-[#111820] text-white">
                  Title (Z–A)
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Projects Grid or Friendly Empty State */}
        {filteredProjects.length === 0 ? (
          projectList.length === 0 ? (
            /* First Launch Empty State */
            <div className="bg-[#0E141D] border border-[#1C2735] rounded-2xl p-8 md:p-14 text-center max-w-2xl mx-auto my-8 space-y-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00AFFF]/20 to-[#005580]/20 border border-[#00AFFF]/40 flex items-center justify-center mx-auto text-[#00AFFF] shadow-lg shadow-[#00AFFF]/10">
                <Film className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="font-['Exo_2'] font-bold text-2xl text-white">
                  Welcome to XEMACS7 AI Film Studio
                </h2>
                <p className="text-sm text-[#79838E] max-w-md mx-auto">
                  No film projects yet. Start your cinematic journey by creating your first video production or
                  importing an existing project archive.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#00AFFF] hover:bg-[#0095db] text-white font-bold text-xs rounded-lg shadow-lg shadow-[#00AFFF]/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Project</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] text-xs font-semibold rounded-lg border border-[#1C2735] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-[#79838E]" />
                  <span>Import Existing JSON</span>
                </button>
              </div>

              {/* Universal 3-Phase Architecture Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 text-left border-t border-[#1C2735]/60">
                <div className="bg-[#111820]/70 p-3 rounded-lg border border-[#1C2735]">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#00AFFF]" />
                    <span>Phase 1: Brain & Development</span>
                  </div>
                  <p className="text-[11px] text-[#79838E]">
                    Modes A–D, evidence-based niche research, concept decks, screenplays, and cinematic shot lists.
                  </p>
                </div>
                <div className="bg-[#111820]/70 p-3 rounded-lg border border-[#1C2735]">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#F4A62A]" />
                    <span>Phase 2: Pre-Production</span>
                  </div>
                  <p className="text-[11px] text-[#79838E]">
                    Visual consistency, style bibles, character turnarounds, and Midjourney/Flux image prompt testing.
                  </p>
                </div>
                <div className="bg-[#111820]/70 p-3 rounded-lg border border-[#1C2735]">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white mb-1">
                    <Video className="w-3.5 h-3.5 text-purple-400" />
                    <span>Phase 3: Production</span>
                  </div>
                  <p className="text-[11px] text-[#79838E]">
                    Google Flow & Veo 2 master prompts, shot timeline, and one-click Production Bible exports.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Search Filter No Match State */
            <div className="bg-[#0E141D] border border-[#1C2735] rounded-xl p-10 text-center space-y-3">
              <Search className="w-8 h-8 text-[#79838E] mx-auto opacity-50" />
              <h3 className="font-['Exo_2'] font-bold text-sm text-white">No productions match your criteria</h3>
              <p className="text-xs text-[#79838E]">Try searching with a different term or clear your filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStageFilter('ALL');
                }}
                className="px-3.5 py-1.5 bg-[#111820] hover:bg-[#1C2735] text-xs font-semibold text-[#00AFFF] rounded-lg border border-[#1C2735] transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((p) => {
              const stageBadgeColor =
                p.currentStage === 'stage4'
                  ? 'bg-purple-950/60 text-purple-400 border-purple-500/40'
                  : p.currentStage === 'stage3'
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                  : p.currentStage === 'stage2'
                  ? 'bg-[#F4A62A]/10 text-[#F4A62A] border-[#F4A62A]/40'
                  : 'bg-[#00AFFF]/10 text-[#00AFFF] border-[#00AFFF]/40';

              const StageIcon =
                p.currentStage === 'stage4'
                  ? Video
                  : p.currentStage === 'stage3'
                  ? Clapperboard
                  : p.currentStage === 'stage2'
                  ? Sparkles
                  : BookOpen;

              return (
                <div
                  key={p.id}
                  className="bg-[#0E141D] hover:bg-[#111820] border border-[#1C2735] hover:border-[#00AFFF]/40 rounded-xl overflow-hidden transition-all duration-200 flex flex-col group shadow-lg"
                >
                  {/* Card Thumbnail / Banner */}
                  <div className="relative aspect-video bg-[#070B10] border-b border-[#1C2735] overflow-hidden flex items-center justify-center">
                    {p.thumbnailDataUrl ? (
                      <img
                        src={p.thumbnailDataUrl}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      /* Stylized Cinematic Graphic for projects without uploaded image */
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0B1017] via-[#070B10] to-[#0E141D] text-center">
                        <div className="w-10 h-10 rounded-xl bg-[#111820] border border-[#1C2735] flex items-center justify-center text-[#00AFFF] mb-2 group-hover:border-[#00AFFF]/40 transition-colors">
                          <Film className="w-5 h-5" />
                        </div>
                        <span className="font-['Exo_2'] text-xs font-bold text-white max-w-[200px] truncate">
                          {p.title}
                        </span>
                        <span className="text-[10px] text-[#79838E] mt-0.5">
                          {p.visualStyleName || 'Cinematic Realism'}
                        </span>
                      </div>
                    )}

                    {/* Aspect Ratio & Format Overlay Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono font-bold bg-black/80 text-white backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/10">
                        {p.aspectRatio}
                      </span>
                      <span className="text-[10px] font-medium bg-black/80 text-[#D7DCE2] backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/10 truncate max-w-[120px]">
                        {p.format}
                      </span>
                    </div>

                    {/* Current Stage Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 backdrop-blur-sm shadow-md ${stageBadgeColor}`}
                      >
                        <StageIcon className="w-2.5 h-2.5" />
                        <span className="uppercase tracking-wider">
                          {p.currentPhase === 'phase3' || p.currentStage === 'stage4'
                            ? 'Phase 3'
                            : p.currentPhase === 'phase2' || p.currentStage === 'stage2'
                            ? 'Phase 2'
                            : 'Phase 1'}
                        </span>
                      </span>
                    </div>

                    {/* Episodic Count Pill if > 1 */}
                    {p.episodeCount > 1 && (
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="text-[10px] font-semibold bg-[#00AFFF]/90 text-white px-1.5 py-0.5 rounded shadow">
                          {p.episodeCount} Episodes
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          onClick={() => openProject(p.id)}
                          className="font-['Exo_2'] font-bold text-sm text-white group-hover:text-[#00AFFF] transition-colors cursor-pointer truncate flex-1"
                          title={p.title}
                        >
                          {p.title}
                        </h3>
                      </div>

                      {p.logline ? (
                        <p className="text-[11px] text-[#79838E] line-clamp-2 leading-relaxed">
                          {p.logline}
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#79838E]/60 italic">
                          No premise recorded yet. Begin in Stage 1.
                        </p>
                      )}

                      {/* Approval Status Pill */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        <span className="text-[10px] text-[#79838E] font-medium">Status:</span>
                        <span className="text-[10px] font-semibold text-[#D7DCE2] bg-[#111820] px-2 py-0.5 rounded border border-[#1C2735]">
                          {p.stageApprovalStatus}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Metadata & Actions */}
                    <div className="pt-2 border-t border-[#1C2735]/60 flex items-center justify-between text-[11px] text-[#79838E]">
                      <div className="flex items-center space-x-1 truncate">
                        <Clock className="w-3 h-3 text-[#79838E]" />
                        <span>{formatDate(p.updatedAt)}</span>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setRenameTarget(p);
                            setRenameInput(p.title);
                          }}
                          className="p-1.5 rounded hover:bg-[#1C2735] text-[#79838E] hover:text-white transition-colors cursor-pointer"
                          title="Rename project"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(p)}
                          className="p-1.5 rounded hover:bg-[#1C2735] text-[#79838E] hover:text-white transition-colors cursor-pointer"
                          title="Duplicate project"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => exportSingleProject(p.id)}
                          className="p-1.5 rounded hover:bg-[#1C2735] text-[#79838E] hover:text-white transition-colors cursor-pointer"
                          title="Export project JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(p);
                            setDeleteConfirmTitle('');
                            setDeleteError('');
                          }}
                          className="p-1.5 rounded hover:bg-red-950/60 text-[#79838E] hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openProject(p.id)}
                          className="ml-1 px-3 py-1 bg-[#00AFFF] hover:bg-[#0095db] text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center space-x-1 cursor-pointer transition-all"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CREATE NEW PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1C2735]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#00AFFF]/20 border border-[#00AFFF]/40 flex items-center justify-center text-[#00AFFF]">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                  Create Independent Production
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#79838E] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#D7DCE2] font-semibold mb-1.5">
                  Production Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="e.g. Chronicles of Neon Horizons"
                  className="w-full bg-[#0E141D] border border-[#1C2735] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#79838E] focus:outline-none focus:border-[#00AFFF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#D7DCE2] font-semibold mb-1.5">
                    Format
                  </label>
                  <select
                    value={newProjectFormat}
                    onChange={(e) => setNewProjectFormat(e.target.value as FormatType)}
                    className="w-full bg-[#0E141D] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                  >
                    <option value="Shorts/Reels">Shorts / Reels</option>
                    <option value="Episodic Short Drama">Episodic Short Drama</option>
                    <option value="Short Film">Short Film</option>
                    <option value="Feature/Narrative Film">Feature / Narrative Film</option>
                    <option value="Documentary">Documentary</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#D7DCE2] font-semibold mb-1.5">
                    Aspect Ratio
                  </label>
                  <select
                    value={newProjectAspectRatio}
                    onChange={(e) => setNewProjectAspectRatio(e.target.value as any)}
                    className="w-full bg-[#0E141D] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                  >
                    <option value="9:16">9:16 Vertical (Shorts/Reels)</option>
                    <option value="16:9">16:9 Widescreen (Cinematic)</option>
                    <option value="1:1">1:1 Square</option>
                  </select>
                </div>
              </div>

              {newProjectFormat.includes('Episodic') && (
                <div>
                  <label className="block text-[#D7DCE2] font-semibold mb-1.5">
                    Number of Episodes
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newProjectEpisodes}
                    onChange={(e) => setNewProjectEpisodes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#0E141D] border border-[#1C2735] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                  />
                </div>
              )}

              <p className="text-[11px] text-[#79838E] pt-1">
                Your new production will receive a permanent unique project ID and start at Stage 1 (Story & Canon Studio).
                Existing projects remain untouched.
              </p>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#1C2735]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-[#D7DCE2] hover:bg-[#1C2735] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00AFFF] hover:bg-[#0095db] text-white font-bold text-xs rounded-lg shadow-lg shadow-[#00AFFF]/20 transition-all cursor-pointer"
                >
                  Create & Launch Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME PROJECT MODAL */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-['Exo_2'] font-bold text-base text-white">
              Rename Production
            </h3>
            <p className="text-xs text-[#79838E]">
              Change the display title for this production. All story canon, visual bibles, scripts, and production prompts will be preserved under the same project ID.
            </p>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full bg-[#0E141D] border border-[#1C2735] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3.5 py-1.5 text-xs text-[#D7DCE2] hover:bg-[#1C2735] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#00AFFF] text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Save Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-[#111820] border border-red-500/50 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-['Exo_2'] font-bold text-base text-white">
                Delete Production?
              </h3>
            </div>
            <p className="text-xs text-[#79838E] leading-relaxed">
              This action is permanent and cannot be undone. To confirm deletion of{' '}
              <span className="font-bold text-white">"{deleteTarget.title}"</span>, please type the project title below:
            </p>

            <div className="space-y-2">
              <input
                type="text"
                autoFocus
                value={deleteConfirmTitle}
                onChange={(e) => {
                  setDeleteConfirmTitle(e.target.value);
                  setDeleteError('');
                }}
                placeholder={deleteTarget.title}
                className="w-full bg-[#0E141D] border border-red-500/40 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
              {deleteError && (
                <p className="text-[11px] text-red-400 font-semibold">{deleteError}</p>
              )}
            </div>

            <p className="text-[10px] text-[#79838E]">
              Note: Only this selected project will be deleted. Other projects and shared media will remain untouched.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#1C2735]">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError('');
                }}
                className="px-3.5 py-1.5 text-xs text-[#D7DCE2] hover:bg-[#1C2735] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmTitle.trim().toLowerCase() !== deleteTarget.title.trim().toLowerCase()}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  deleteConfirmTitle.trim().toLowerCase() === deleteTarget.title.trim().toLowerCase()
                    ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
                    : 'bg-red-950/40 text-red-400/40 cursor-not-allowed border border-red-500/20'
                }`}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centralized API Integrations Settings Modal */}
      <ApiSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};
