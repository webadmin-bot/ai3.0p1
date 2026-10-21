import React, { useState, useRef } from 'react';
import {
  Film,
  Download,
  FolderOpen,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  LayoutGrid,
  Edit3,
  X,
  BookOpen,
  Sparkles,
  Clapperboard,
  Video,
  Settings,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { parseImportedProjectJson } from '../../services/persistence';
import { FormatType, StageId } from '../../types/filmStudio';
import { ApiSettingsModal } from '../settings/ApiSettingsModal';

export const Header: React.FC = () => {
  const {
    project,
    activeStage,
    saveStatus,
    storageError,
    viewMode,
    setViewMode,
    createNewProject,
    renameProject,
    exportSingleProject,
    importProjectFromFile,
    retrySave,
  } = useProject();

  const [showSettings, setShowSettings] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFormat, setNewFormat] = useState<FormatType>('Shorts/Reels');
  const [newAspectRatio, setNewAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.title);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim() || 'Untitled Film Project';
    await createNewProject(title, {
      format: newFormat,
      aspectRatio: newAspectRatio,
    });
    setShowNewModal(false);
    setNewTitle('');
  };

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;
    await renameProject(project.projectId, titleInput.trim());
    setIsEditingTitle(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importProjectFromFile(content);
      if (!res.success) {
        alert('Failed to import project: ' + (res.error || 'Invalid file'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const stageLabelMap: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    phase1: { label: 'Phase 1: Brain & Development', icon: Sparkles },
    phase2: { label: 'Phase 2: Pre-Production', icon: Sparkles },
    phase3: { label: 'Phase 3: Production', icon: Video },
    stage1: { label: 'Phase 1: Brain & Development', icon: Sparkles },
    stage2: { label: 'Phase 2: Pre-Production', icon: Sparkles },
    stage3: { label: 'Phase 1: Brain & Development', icon: Sparkles },
    stage4: { label: 'Phase 3: Production', icon: Video },
  };

  const currentStageInfo = stageLabelMap[activeStage] || stageLabelMap.phase1;
  const StageIcon = currentStageInfo.icon;

  return (
    <>
      <header className="h-16 bg-[#0B1017] border-b border-[#1C2735] px-4 md:px-6 flex items-center justify-between select-none z-30">
        {/* Left Section: Brand & Back to Dashboard */}
        <div className="flex items-center space-x-3">
          {/* Back to Projects Dashboard Button */}
          <button
            onClick={() => setViewMode('dashboard')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] transition-colors cursor-pointer text-xs font-semibold group"
            title="Return to Projects Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#00AFFF] group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">My Projects</span>
          </button>

          <div className="h-5 w-px bg-[#1C2735] hidden sm:block" />

          {/* Studio Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00AFFF] to-[#005580] flex items-center justify-center font-bold text-white shadow-md shadow-[#00AFFF]/20 border border-[#00AFFF]/40">
              <span className="font-['Exo_2'] tracking-tighter text-xs">X7</span>
            </div>
            <div className="hidden md:block">
              <div className="flex items-center space-x-1.5">
                <span className="font-['Exo_2'] font-bold text-sm tracking-wide text-white">
                  XEMACS7
                </span>
                <span className="text-[9px] font-semibold bg-[#1C2735] text-[#00AFFF] px-1 py-0.2 rounded border border-[#00AFFF]/30">
                  AI 3.0
                </span>
              </div>
            </div>
          </div>

          <div className="h-5 w-px bg-[#1C2735] hidden md:block" />

          {/* Active Project Title with Quick Rename */}
          <div className="flex items-center space-x-2 bg-[#111820] px-3 py-1.5 rounded-lg border border-[#1C2735]">
            <Film className="w-3.5 h-3.5 text-[#00AFFF] flex-shrink-0" />
            {isEditingTitle ? (
              <form onSubmit={handleSaveTitle} className="flex items-center space-x-1.5">
                <input
                  type="text"
                  autoFocus
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleSaveTitle}
                  className="bg-[#070B10] border border-[#00AFFF] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-36 sm:w-48 font-medium"
                />
              </form>
            ) : (
              <button
                onClick={() => {
                  setTitleInput(project.title);
                  setIsEditingTitle(true);
                }}
                className="flex items-center space-x-1.5 text-xs font-semibold text-white hover:text-[#00AFFF] transition-colors max-w-[140px] sm:max-w-[200px] truncate cursor-pointer text-left"
                title="Click to rename project"
              >
                <span className="truncate">{project.title || 'Untitled Project'}</span>
                <Edit3 className="w-2.5 h-2.5 text-[#79838E] hover:text-[#00AFFF] flex-shrink-0" />
              </button>
            )}

            {/* Current Stage Indicator */}
            <div className="hidden xl:flex items-center space-x-1 pl-1.5 border-l border-[#1C2735]">
              <StageIcon className="w-3 h-3 text-[#00AFFF]" />
              <span className="text-[10px] text-[#79838E] font-medium">
                {currentStageInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Multi-project Actions & Autosave Status */}
        <div className="flex items-center space-x-2 md:space-x-2.5">
          {/* New Project (Creates separate project without resetting current) */}
          <button
            onClick={() => {
              setNewTitle('');
              setShowNewModal(true);
            }}
            className="flex items-center space-x-1.5 text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] px-2.5 py-1.5 rounded-lg border border-[#1C2735] transition-colors cursor-pointer"
            title="Create an independent new project"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span className="hidden sm:inline text-[11px]">New</span>
          </button>

          {/* Open / Dashboard */}
          <button
            onClick={() => setViewMode('dashboard')}
            className="flex items-center space-x-1.5 text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] px-2.5 py-1.5 rounded-lg border border-[#1C2735] transition-colors cursor-pointer"
            title="Open project from Dashboard"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#79838E]" />
            <span className="hidden sm:inline text-[11px]">Dashboard</span>
          </button>

          {/* Import JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="hidden sm:flex items-center space-x-1.5 text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] px-2.5 py-1.5 rounded-lg border border-[#1C2735] transition-colors cursor-pointer"
            title="Open project from JSON"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#79838E]" />
            <span className="text-[11px]">Import</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Export JSON */}
          <button
            onClick={() => exportSingleProject()}
            className="flex items-center space-x-1.5 text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] px-2.5 py-1.5 rounded-lg border border-[#1C2735] transition-colors cursor-pointer"
            title="Export this project JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#79838E]" />
            <span className="hidden sm:inline text-[11px]">Export</span>
          </button>

          {/* API Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-1.5 text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] px-2.5 py-1.5 rounded-lg border border-[#1C2735] hover:border-[#00AFFF]/50 transition-colors cursor-pointer"
            title="Configure YouTube Data API & Gemini AI Settings"
          >
            <Settings className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span className="hidden sm:inline text-[11px]">API Settings</span>
          </button>

          {/* Autosave Status */}
          <div className="flex items-center space-x-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-[#111820] border border-[#1C2735]">
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold hidden sm:inline">Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <Clock className="w-3.5 h-3.5 text-[#00AFFF] animate-spin" />
                <span className="text-[#00AFFF] font-medium hidden sm:inline">Saving...</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <div className="w-2 h-2 rounded-full bg-[#F4A62A] animate-pulse" />
                <span className="text-[#F4A62A] font-medium hidden sm:inline">Unsaved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center space-x-1.5 text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span className="font-semibold text-[11px]">Save Failed</span>
                <button
                  onClick={() => retrySave()}
                  className="ml-1 px-2 py-0.5 bg-[#141F2E] hover:bg-[#1E2F46] border border-[#00AFFF]/50 rounded text-[10px] text-[#00AFFF] font-bold cursor-pointer transition-colors shadow-sm"
                  title="Retry saving latest changes to durable storage"
                >
                  Retry
                </button>
                <button
                  onClick={() => exportSingleProject()}
                  className="ml-1 px-2 py-0.5 bg-red-950 hover:bg-red-900 border border-red-500/50 rounded text-[10px] text-white font-bold cursor-pointer transition-colors shadow-sm"
                  title={storageError || 'Browser storage limit reached. Export your project to avoid data loss.'}
                >
                  Export
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CREATE NEW PROJECT MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1C2735]">
              <h3 className="font-['Exo_2'] font-bold text-base text-white">
                Start Independent Project
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[#79838E] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#79838E]">
              Creating a new project will not overwrite your active production. Your current work is safely saved.
            </p>

            <form onSubmit={handleCreateNew} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#D7DCE2] font-semibold mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Echoes of the Deep"
                  className="w-full bg-[#0E141D] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#D7DCE2] font-semibold mb-1">
                    Format
                  </label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as FormatType)}
                    className="w-full bg-[#0E141D] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                  >
                    <option value="Shorts/Reels">Shorts / Reels</option>
                    <option value="Short Film">Short Film</option>
                    <option value="Episodic Short Drama">Episodic Drama</option>
                    <option value="Feature/Narrative Film">Feature Film</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#D7DCE2] font-semibold mb-1">
                    Aspect Ratio
                  </label>
                  <select
                    value={newAspectRatio}
                    onChange={(e) => setNewAspectRatio(e.target.value as any)}
                    className="w-full bg-[#0E141D] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                  >
                    <option value="9:16">9:16 Vertical</option>
                    <option value="16:9">16:9 Widescreen</option>
                    <option value="1:1">1:1 Square</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#1C2735]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-1.5 text-xs text-[#D7DCE2] hover:bg-[#1C2735] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#00AFFF] text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Centralized API Integrations Settings Modal */}
      <ApiSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
};
