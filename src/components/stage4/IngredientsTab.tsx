import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Paperclip,
  Copy,
  Check,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Film,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { FlowShotCard } from './FlowShotCard';
import { GoogleFlowShotPackage } from '../../types/filmStudio';

interface IngredientsTabProps {
  onEditShot: (pkg: GoogleFlowShotPackage) => void;
  onRefineShot: (pkg: GoogleFlowShotPackage) => void;
}

export const IngredientsTab: React.FC<IngredientsTabProps> = ({
  onEditShot,
  onRefineShot,
}) => {
  const { project, updateStage4ShotPackage } = useProject();
  const [searchQuery, setSearchQuery] = useState('');

  const packages = project.stage4.shotPackages || [];
  const stage2Assets = project.stage2.assets || [];

  const ingredientShots = packages.filter((p) => p.flowMode === 'INGREDIENTS');

  const filteredShots = ingredientShots.filter((pkg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pkg.shotId.toLowerCase().includes(q) ||
      pkg.purpose.toLowerCase().includes(q) ||
      pkg.videoPrompt.toLowerCase().includes(q) ||
      (pkg.characterIds || []).some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-[#111820] border border-amber-500/30 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-[#F4A62A]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F4A62A]">
                GOOGLE FLOW INGREDIENTS WORKFLOW
              </span>
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                Ingredients Route Packages ({ingredientShots.length} Shots)
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="bg-[#0B1017] border border-[#1C2735] px-3 py-1.5 rounded-lg text-[#D7DCE2]">
              {ingredientShots.filter((s) => s.mediaReadiness === 'EXECUTION_READY').length} / {ingredientShots.length} Media Attached
            </span>
          </div>
        </div>

        <p className="text-xs text-[#79838E] leading-relaxed max-w-2xl">
          Google Flow Ingredients Mode synthesizes video by referencing pre-existing identity, wardrobe, location, and prop images. Attach each required reference asset into the Google Flow Ingredients drawer prior to running generation.
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
            placeholder="Search Ingredients shots..."
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
          />
        ))}

        {filteredShots.length === 0 && (
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center text-xs text-[#79838E]">
            {ingredientShots.length === 0
              ? 'No shots were routed to INGREDIENTS in your Stage 3 Shot Plan.'
              : 'No Ingredients shots match your search.'}
          </div>
        )}
      </div>
    </div>
  );
};
