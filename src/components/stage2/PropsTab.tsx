import React, { useState } from 'react';
import { Box, Search, PlusCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { AssetCard } from './AssetCard';
import { RegeneratePromptModal } from './RegeneratePromptModal';
import { VisualAsset, CanonProp } from '../../types/filmStudio';

interface PropsTabProps {
  onGeneratePhase2Assets?: () => void;
}

export const PropsTab: React.FC<PropsTabProps> = ({ onGeneratePhase2Assets }) => {
  const {
    project,
    updateStage2Asset,
    setStage2Assets,
    attachReferenceImageToAsset,
    removeReferenceImageFromAsset,
  } = useProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetForRegen, setSelectedAssetForRegen] = useState<VisualAsset | null>(null);

  const canonProps: CanonProp[] = project.storyCanon?.props || [];
  const propAssets = project.stage2?.assets?.filter(
    (a) => a.type === 'PROP' || a.type === 'SPECIAL'
  ) || [];

  const approvedCount = propAssets.filter(
    (a) => a.approvalStatus === 'APPROVED' || a.optionalReferenceImageData
  ).length;

  // Check for any canon props that don't yet have an asset prompt in Stage 2
  const missingCanonProps = canonProps.filter(
    (prop) => !project.stage2?.assets?.some((a) => a.id.toUpperCase() === prop.id.toUpperCase())
  );

  const filteredProps = propAssets.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.referencePrompt.toLowerCase().includes(q) ||
      (a.visualSpecification?.summary && a.visualSpecification.summary.toLowerCase().includes(q))
    );
  });

  const handleSyncMissingProps = () => {
    const newAssets: VisualAsset[] = missingCanonProps.map((prop) => {
      const styleName = project.visualStyle?.name || 'Cinematic Realism';
      const medium = project.visualStyle?.medium || '35mm anamorphic live-action film';
      const prompt = `${styleName} (${medium}) macro cinematic reference still of ${prop.name}. ${prop.storyFunction || prop.narrativeSignificance || prop.description || ''}. Held or owned by ${prop.ownerOrHolder || 'unassigned'}.${prop.continuityDetails ? ` Continuity details: ${prop.continuityDetails}.` : ''} Isolated object reference framing, tactile physical textures, surface wear, shallow depth of field.`;

      return {
        id: prop.id,
        type: 'PROP',
        name: prop.name,
        storyFunction: prop.storyFunction || prop.narrativeSignificance || 'Key story artifact',
        importance: 'PRIMARY',
        sourceCanonIds: [prop.id],
        visualSpecification: {
          summary: `${prop.name}. ${prop.storyFunction || prop.narrativeSignificance || 'Key narrative artifact'}`,
          keyFeatures: prop.continuityDetails
            ? [prop.continuityDetails]
            : ['Physical scale', 'Tactile craftsmanship'],
          colors: ['Natural material colors and patina'],
          materialsOrTextures: ['Authentic weathered materials and surface engravings'],
          lightingOrRenderingRules: 'Neutral diagnostic studio lighting with soft highlights',
        },
        referencePrompt: prompt,
        physicalShape: 'Functional ergonomic shape designed for narrative interactions',
        dimensions: 'Handheld human-scale prop (approx 25cm)',
        ownerOrHolder: prop.ownerOrHolder || 'Assigned character',
        continuityRequirements: 'Material wear, distinctive markings, and operational states must be preserved between scenes',
        promptStatus: 'READY',
        reviewIssues: [],
        updatedAt: new Date().toISOString(),
      };
    });

    setStage2Assets([...(project.stage2?.assets || []), ...newAssets]);
  };

  if (propAssets.length === 0) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 md:p-12 text-center space-y-5 max-w-2xl mx-auto shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-purple-400 mx-auto shadow-lg shadow-purple-500/10">
          <Box className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
            PHASE 2 DIRECTIVE
          </span>
          <h3 className="font-['Exo_2'] font-bold text-xl text-white">
            Key Story Props Registry Empty
          </h3>
          <p className="text-xs text-[#79838E] leading-relaxed max-w-md mx-auto">
            Extract story-critical physical items and catalysts from your Phase 1 screenplay, action paragraphs, and prop references. Generates macro product stills, wear patina details, dimensions, and owner links.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onGeneratePhase2Assets}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] hover:to-[#007AB0] text-white text-xs font-bold flex items-center space-x-2.5 transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer animate-pulse"
          >
            <Sparkles className="w-4 h-4" />
            <span>GENERATE PHASE 2 ASSETS</span>
          </button>

          {missingCanonProps.length > 0 && (
            <button
              onClick={handleSyncMissingProps}
              className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-purple-600/25 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sync {missingCanonProps.length} Canon Props</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Missing Canon Sync Banner if user added props in Stage 1 */}
      {missingCanonProps.length > 0 && (
        <div className="bg-[#1A1026] border border-purple-500/40 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 text-purple-200">
            <PlusCircle className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              New canon props detected ({missingCanonProps.map((p) => p.id).join(', ')}). Generate corresponding Phase 2 visual asset prompts now.
            </span>
          </div>
          <button
            onClick={handleSyncMissingProps}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 shrink-0 text-xs shadow-md cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Prompts for {missingCanonProps.map((p) => p.id).join(', ')}</span>
          </button>
        </div>
      )}

      {/* Search and Counts Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1017] border border-[#1C2735] p-3.5 rounded-xl">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Box className="w-4 h-4 text-purple-400" />
            <span>Physical Story Catalysts ({propAssets.length})</span>
          </span>
          <span className="text-[11px] font-mono text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded">
            {approvedCount} / {propAssets.length} Approved References
          </span>
          <span className="text-[#79838E] font-mono text-[11px] hidden md:inline">
            • Stable Canonical IDs (PROP-001...)
          </span>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#79838E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search story props, markings, IDs..."
            className="w-full bg-[#111820] border border-[#1C2735] focus:border-[#00AFFF] pl-9 pr-3 py-1.5 text-xs text-white rounded-lg focus:outline-none placeholder-[#79838E]"
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 gap-5">
        {filteredProps.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onUpdateAsset={updateStage2Asset}
            onRegeneratePrompt={(a) => setSelectedAssetForRegen(a)}
            onAttachImage={attachReferenceImageToAsset}
            onRemoveImage={removeReferenceImageFromAsset}
          />
        ))}

        {filteredProps.length === 0 && (
          <div className="p-8 text-center text-xs text-[#79838E] bg-[#0B1017] border border-[#1C2735] rounded-xl">
            No story props match your search query "{searchQuery}".
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
