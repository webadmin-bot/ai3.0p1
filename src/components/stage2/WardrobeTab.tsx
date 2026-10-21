import React, { useState } from 'react';
import { Shirt, Search } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { AssetCard } from './AssetCard';
import { RegeneratePromptModal } from './RegeneratePromptModal';
import { VisualAsset } from '../../types/filmStudio';

interface WardrobeTabProps {
  onGeneratePhase2Assets?: () => void;
}

export const WardrobeTab: React.FC<WardrobeTabProps> = ({ onGeneratePhase2Assets }) => {
  const {
    project,
    updateStage2Asset,
    attachReferenceImageToAsset,
    removeReferenceImageFromAsset,
  } = useProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetForRegen, setSelectedAssetForRegen] = useState<VisualAsset | null>(null);

  const wardrobeAssets = project.stage2?.assets?.filter(
    (a) => a.type === 'WARDROBE'
  ) || [];

  const filteredWardrobe = wardrobeAssets.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.referencePrompt.toLowerCase().includes(q) ||
      (a.visualSpecification?.summary && a.visualSpecification.summary.toLowerCase().includes(q))
    );
  });

  if (wardrobeAssets.length === 0) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#F4A62A] mx-auto">
          <Shirt className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-['Exo_2'] font-bold text-lg text-white">
            No Wardrobe Prompts Generated Yet
          </h3>
          <p className="text-xs text-[#79838E] max-w-md mx-auto">
            Extract signature costume designs, era-specific textiles, wear patterns, and character-linked color keys from Phase 1.
          </p>
        </div>
        {onGeneratePhase2Assets && (
          <button
            onClick={onGeneratePhase2Assets}
            className="px-5 py-2.5 bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] text-white text-xs font-bold rounded-xl inline-flex items-center space-x-2 cursor-pointer shadow-lg"
          >
            <span>GENERATE PHASE 2 ASSETS</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search and Counts Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1017] border border-[#1C2735] p-3.5 rounded-xl">
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Shirt className="w-4 h-4 text-[#F4A62A]" />
            <span>Costumes & Wardrobe ({wardrobeAssets.length})</span>
          </span>
          <span className="text-[#79838E] font-mono text-[11px]">
            • Linked to Character IDs
          </span>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#79838E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wardrobe, textiles, character links..."
            className="w-full bg-[#111820] border border-[#1C2735] focus:border-[#F4A62A] pl-9 pr-3 py-1.5 text-xs text-white rounded-lg focus:outline-none placeholder-[#79838E]"
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 gap-5">
        {filteredWardrobe.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onUpdateAsset={updateStage2Asset}
            onRegeneratePrompt={(a) => setSelectedAssetForRegen(a)}
            onAttachImage={attachReferenceImageToAsset}
            onRemoveImage={removeReferenceImageFromAsset}
          />
        ))}

        {filteredWardrobe.length === 0 && (
          <div className="p-8 text-center text-xs text-[#79838E]">
            No wardrobe items match your search query "{searchQuery}".
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
