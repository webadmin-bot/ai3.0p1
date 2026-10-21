import React, { useState } from 'react';
import { User, Search, Sparkles, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { AssetCard } from './AssetCard';
import { RegeneratePromptModal } from './RegeneratePromptModal';
import { VisualAsset } from '../../types/filmStudio';

interface CharactersTabProps {
  onGeneratePhase2Assets?: () => void;
}

export const CharactersTab: React.FC<CharactersTabProps> = ({ onGeneratePhase2Assets }) => {
  const {
    project,
    updateStage2Asset,
    attachReferenceImageToAsset,
    removeReferenceImageFromAsset,
  } = useProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetForRegen, setSelectedAssetForRegen] = useState<VisualAsset | null>(null);

  const characterAssets = project.stage2?.assets?.filter(
    (a) => a.type === 'CHARACTER'
  ) || [];

  const approvedCount = characterAssets.filter(
    (a) => a.approvalStatus === 'APPROVED' || a.optionalReferenceImageData
  ).length;

  const filteredCharacters = characterAssets.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.referencePrompt.toLowerCase().includes(q) ||
      (a.visualSpecification?.summary && a.visualSpecification.summary.toLowerCase().includes(q))
    );
  });

  if (characterAssets.length === 0) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 md:p-12 text-center space-y-5 max-w-2xl mx-auto shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF] mx-auto shadow-lg shadow-[#00AFFF]/10">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] bg-[#00AFFF]/10 px-2 py-0.5 rounded border border-[#00AFFF]/30">
            PHASE 2 DIRECTIVE
          </span>
          <h3 className="font-['Exo_2'] font-bold text-xl text-white">
            Character Visual Consistency Registry Empty
          </h3>
          <p className="text-xs text-[#79838E] leading-relaxed max-w-md mx-auto">
            Extract recurring cast members from your Phase 1 screenplay, dialogue speakers, and story canon. Generates master character prompts, turnaround sheets (front, side, back), expression grids, and stable identity locks.
          </p>
        </div>

        <div>
          <button
            onClick={onGeneratePhase2Assets}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] hover:to-[#007AB0] text-white text-xs font-bold flex items-center space-x-2.5 mx-auto transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer animate-pulse"
          >
            <Sparkles className="w-4 h-4" />
            <span>GENERATE PHASE 2 ASSETS</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search and Counts Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1017] border border-[#1C2735] p-3.5 rounded-xl">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <User className="w-4 h-4 text-[#00AFFF]" />
            <span>Recurring Cast ({characterAssets.length})</span>
          </span>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
            {approvedCount} / {characterAssets.length} Approved References
          </span>
          <span className="text-[#79838E] font-mono text-[11px] hidden md:inline">
            • Stable Canonical IDs (CHAR-001...)
          </span>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#79838E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters, traits, IDs..."
            className="w-full bg-[#111820] border border-[#1C2735] focus:border-[#00AFFF] pl-9 pr-3 py-1.5 text-xs text-white rounded-lg focus:outline-none placeholder-[#79838E]"
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 gap-5">
        {filteredCharacters.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onUpdateAsset={updateStage2Asset}
            onRegeneratePrompt={(a) => setSelectedAssetForRegen(a)}
            onAttachImage={attachReferenceImageToAsset}
            onRemoveImage={removeReferenceImageFromAsset}
          />
        ))}

        {filteredCharacters.length === 0 && (
          <div className="p-8 text-center text-xs text-[#79838E] bg-[#0B1017] border border-[#1C2735] rounded-xl">
            No characters match your search query "{searchQuery}".
          </div>
        )}
      </div>

      {/* Regenerate Modal */}
      <RegeneratePromptModal
        asset={selectedAssetForRegen}
        isOpen={Boolean(selectedAssetForRegen)}
        onClose={() => setSelectedAssetForRegen(null)}
      />
    </div>
  );
};
