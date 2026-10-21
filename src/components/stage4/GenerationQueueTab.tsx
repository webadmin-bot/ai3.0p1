import React, { useState } from 'react';
import {
  Search,
  Filter,
  Layers,
  Film,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { FlowShotCard } from './FlowShotCard';
import { GoogleFlowShotPackage } from '../../types/filmStudio';

interface GenerationQueueTabProps {
  onEditShot: (pkg: GoogleFlowShotPackage) => void;
  onRefineShot: (pkg: GoogleFlowShotPackage) => void;
  onLaunchPipeline: () => void;
}

export const GenerationQueueTab: React.FC<GenerationQueueTabProps> = ({
  onEditShot,
  onRefineShot,
  onLaunchPipeline,
}) => {
  const { project, updateStage4ShotPackage } = useProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScene, setSelectedScene] = useState<string>('ALL');
  const [selectedRoute, setSelectedRoute] = useState<'ALL' | 'INGREDIENTS' | 'FRAMES'>('ALL');
  const [selectedReadiness, setSelectedReadiness] = useState<string>('ALL');

  const packages = project.stage4.shotPackages || [];
  const scenes = project.stage3.scenes || [];
  const stage2Assets = project.stage2.assets || [];

  if (packages.length === 0) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 md:p-12 text-center space-y-5 max-w-xl mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-[#00AFFF]/10 border border-[#00AFFF]/30 flex items-center justify-center text-[#00AFFF] mx-auto">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF]">
            GENERATION QUEUE READY
          </span>
          <h3 className="font-['Exo_2'] font-bold text-xl text-white">
            Transform Your Shot Plan Into Flow Prompts
          </h3>
          <p className="text-xs text-[#79838E] leading-relaxed max-w-md mx-auto">
            You have <strong className="text-white">{project.stage3.shots.length} approved shots</strong> in Stage 3.
            Click below to generate copy-paste ready Google Flow video prompts, reference checklists, audio breakdowns, and continuity anchors.
          </p>
        </div>

        <button
          onClick={onLaunchPipeline}
          className="px-6 py-3 bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0090D0] hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-xl shadow-[#00AFFF]/25 inline-flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Build Google Flow Prompts</span>
        </button>
      </div>
    );
  }

  // Filter logic
  const filteredPackages = packages.filter((pkg) => {
    if (selectedScene !== 'ALL' && pkg.sceneId !== selectedScene) return false;
    if (selectedRoute !== 'ALL' && pkg.flowMode !== selectedRoute) return false;
    if (selectedReadiness === 'TEXT_BLOCKED' && pkg.textReadiness !== 'TEXT_BLOCKED') return false;
    if (selectedReadiness === 'MEDIA_PENDING' && pkg.mediaReadiness !== 'MEDIA_PENDING') return false;
    if (selectedReadiness === 'READY' && pkg.textReadiness !== 'TEXT_READY') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = pkg.shotId.toLowerCase().includes(q);
      const matchPurpose = pkg.purpose.toLowerCase().includes(q);
      const matchPrompt = pkg.videoPrompt.toLowerCase().includes(q);
      const matchChars = (pkg.characterIds || []).some((c) => c.toLowerCase().includes(q));
      if (!matchId && !matchPurpose && !matchPrompt && !matchChars) return false;
    }
    return true;
  });

  const handleToggleMedia = (shotId: string) => {
    const target = packages.find((p) => p.shotId === shotId);
    if (!target) return;
    const nextVal = !target.hasExternalImageReference;
    updateStage4ShotPackage(shotId, {
      hasExternalImageReference: nextVal,
    });
  };

  const totalRuntime = packages.reduce((acc, p) => acc + p.plannedDuration, 0);
  const textBlockedCount = packages.filter((p) => p.textReadiness === 'TEXT_BLOCKED').length;
  const mediaPendingCount = packages.filter((p) => p.mediaReadiness === 'MEDIA_PENDING').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Metric Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Total Shots</span>
          <div className="flex items-center space-x-1.5">
            <Film className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span className="font-mono text-base font-bold text-white">{packages.length}</span>
          </div>
        </div>

        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Planned Runtime</span>
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span className="font-mono text-base font-bold text-white">{totalRuntime}s</span>
          </div>
        </div>

        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Ingredients</span>
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span className="font-mono text-base font-bold text-[#F4A62A]">
              {packages.filter((p) => p.flowMode === 'INGREDIENTS').length}
            </span>
          </div>
        </div>

        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Frames</span>
          <div className="flex items-center space-x-1.5">
            <Film className="w-3.5 h-3.5 text-indigo-300" />
            <span className="font-mono text-base font-bold text-indigo-300">
              {packages.filter((p) => p.flowMode === 'FRAMES').length}
            </span>
          </div>
        </div>

        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Text Blocked</span>
          <div className="flex items-center space-x-1.5">
            <AlertTriangle className={`w-3.5 h-3.5 ${textBlockedCount > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
            <span className={`font-mono text-base font-bold ${textBlockedCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {textBlockedCount}
            </span>
          </div>
        </div>

        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
          <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Media Pending</span>
          <div className="flex items-center space-x-1.5">
            <Paperclip className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-base font-bold text-amber-400">
              {mediaPendingCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#79838E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shots by ID, character, purpose, or text..."
            className="w-full bg-[#111820] border border-[#1C2735] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center space-x-2">
          {/* Scene Filter */}
          <select
            value={selectedScene}
            onChange={(e) => setSelectedScene(e.target.value)}
            className="bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-xs text-[#D7DCE2] focus:outline-none focus:border-[#00AFFF] cursor-pointer"
          >
            <option value="ALL">All Scenes ({scenes.length})</option>
            {scenes.map((sc) => (
              <option key={sc.sceneId} value={sc.sceneId}>
                Scene {sc.sceneNumber}: {sc.title.slice(0, 30)}
              </option>
            ))}
          </select>

          {/* Route Filter */}
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value as any)}
            className="bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-xs text-[#D7DCE2] focus:outline-none focus:border-[#00AFFF] cursor-pointer"
          >
            <option value="ALL">All Routes</option>
            <option value="INGREDIENTS">Ingredients Only</option>
            <option value="FRAMES">Frames Only</option>
          </select>

          {/* Readiness Filter */}
          <select
            value={selectedReadiness}
            onChange={(e) => setSelectedReadiness(e.target.value)}
            className="bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-xs text-[#D7DCE2] focus:outline-none focus:border-[#00AFFF] cursor-pointer"
          >
            <option value="ALL">All Readiness</option>
            <option value="TEXT_BLOCKED">Text Blocked Only</option>
            <option value="MEDIA_PENDING">Media Pending Only</option>
            <option value="READY">Text Ready</option>
          </select>
        </div>
      </div>

      {/* Shot Cards List */}
      <div className="space-y-4">
        {filteredPackages.map((pkg) => (
          <FlowShotCard
            key={pkg.shotId}
            pkg={pkg}
            stage2Assets={stage2Assets}
            onEdit={onEditShot}
            onRefine={onRefineShot}
            onToggleMediaAttached={handleToggleMedia}
          />
        ))}

        {filteredPackages.length === 0 && (
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center text-xs text-[#79838E]">
            No shot packages match your search filters. Try clearing the filters.
          </div>
        )}
      </div>
    </div>
  );
};
