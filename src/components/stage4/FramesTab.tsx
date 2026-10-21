import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  Paperclip,
  Copy,
  Check,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { FlowShotCard } from './FlowShotCard';
import { GoogleFlowShotPackage } from '../../types/filmStudio';

interface FramesTabProps {
  onEditShot: (pkg: GoogleFlowShotPackage) => void;
  onRefineShot: (pkg: GoogleFlowShotPackage) => void;
}

export const FramesTab: React.FC<FramesTabProps> = ({
  onEditShot,
  onRefineShot,
}) => {
  const { project, updateStage4ShotPackage } = useProject();
  const [searchQuery, setSearchQuery] = useState('');

  const packages = project.stage4.shotPackages || [];
  const stage2Assets = project.stage2.assets || [];

  const frameShots = packages.filter((p) => p.flowMode === 'FRAMES');

  const filteredShots = frameShots.filter((pkg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pkg.shotId.toLowerCase().includes(q) ||
      pkg.purpose.toLowerCase().includes(q) ||
      pkg.videoPrompt.toLowerCase().includes(q) ||
      (pkg.firstFramePrompt || '').toLowerCase().includes(q)
    );
  });

  const readyKeyframesCount = frameShots.filter((s) => {
    const matching = project.stage3.shots?.find((sh) => sh.shotId === s.shotId);
    return Boolean(s.firstFrameMedia?.verified || s.firstFrameMedia?.dataUrl || matching?.firstFrameImageData);
  }).length;

  const handleToggleMedia = (shotId: string) => {
    const target = packages.find((p) => p.shotId === shotId);
    if (!target) return;
    const nextVal = !target.hasExternalImageReference;
    updateStage4ShotPackage(shotId, {
      hasExternalImageReference: nextVal,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-[#111820] border border-indigo-500/30 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                GOOGLE FLOW FRAMES WORKFLOW
              </span>
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                Frames Mode Packages ({frameShots.length} Shots)
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="bg-[#0B1017] border border-[#1C2735] px-3 py-1.5 rounded-lg text-[#D7DCE2]">
              {readyKeyframesCount} / {frameShots.length} Verified Keyframes Attached
            </span>
          </div>
        </div>

        <p className="text-xs text-[#79838E] leading-relaxed max-w-2xl">
          Google Flow Frames Mode begins directly from an exact opening keyframe still image. Use the supplied first-frame prompt to generate your keyframe in your preferred image tool, attach it in Google Flow, and paste the corresponding motion prompt.
        </p>
      </div>

      {/* Search */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#79838E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Frames shots..."
            className="w-full bg-[#111820] border border-[#1C2735] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {filteredShots.map((pkg) => (
          <FlowShotCard
            key={pkg.shotId}
            pkg={pkg}
            stage2Assets={stage2Assets}
            onEdit={onEditShot}
            onRefine={onRefineShot}
            onToggleMediaAttached={handleToggleMedia}
          />
        ))}

        {filteredShots.length === 0 && (
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center text-xs text-[#79838E]">
            {frameShots.length === 0
              ? 'No shots were routed to FRAMES in your Stage 3 Shot Plan.'
              : 'No Frames shots match your search.'}
          </div>
        )}
      </div>
    </div>
  );
};
