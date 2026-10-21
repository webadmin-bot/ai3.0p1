import React, { useState } from 'react';
import { MapPin, Search, PlusCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { AssetCard } from './AssetCard';
import { RegeneratePromptModal } from './RegeneratePromptModal';
import { VisualAsset, CanonLocation } from '../../types/filmStudio';

interface LocationsTabProps {
  onGeneratePhase2Assets?: () => void;
}

export const LocationsTab: React.FC<LocationsTabProps> = ({ onGeneratePhase2Assets }) => {
  const {
    project,
    updateStage2Asset,
    setStage2Assets,
    attachReferenceImageToAsset,
    removeReferenceImageFromAsset,
  } = useProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetForRegen, setSelectedAssetForRegen] = useState<VisualAsset | null>(null);

  const canonLocations: CanonLocation[] = project.storyCanon?.locations || [];
  const locationAssets = project.stage2?.assets?.filter(
    (a) => a.type === 'LOCATION'
  ) || [];

  const approvedCount = locationAssets.filter(
    (a) => a.approvalStatus === 'APPROVED' || a.optionalReferenceImageData
  ).length;

  // Check for any canon locations that don't yet have an asset prompt in Stage 2
  const missingCanonLocations = canonLocations.filter(
    (loc) => !project.stage2?.assets?.some((a) => a.id.toUpperCase() === loc.id.toUpperCase())
  );

  const filteredLocations = locationAssets.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.referencePrompt.toLowerCase().includes(q) ||
      (a.visualSpecification?.summary && a.visualSpecification.summary.toLowerCase().includes(q))
    );
  });

  // Handle generating prompts for any newly added canon locations
  const handleSyncMissingLocations = () => {
    const newAssets: VisualAsset[] = missingCanonLocations.map((loc) => {
      const styleName = project.visualStyle?.name || 'Cinematic Realism';
      const medium = project.visualStyle?.medium || '35mm anamorphic live-action film';
      const prompt = `${styleName} (${medium}) establishing environmental shot of ${loc.name}. ${loc.storyPurpose || loc.narrativeSignificance || loc.description || ''}. Atmosphere and lighting: ${loc.moodAtmosphere || 'Atmospheric natural lighting'}.${loc.permanentSpatialAnchors ? ` Permanent spatial anchors: ${loc.permanentSpatialAnchors}.` : ''} High-detail environmental cinematography, authentic architectural texture, physical depth of field.`;

      return {
        id: loc.id,
        type: 'LOCATION',
        name: loc.name,
        storyFunction: loc.storyPurpose || loc.narrativeSignificance || 'Primary narrative setting',
        importance: 'PRIMARY',
        sourceCanonIds: [loc.id],
        visualSpecification: {
          summary: `${loc.name} environment. ${loc.moodAtmosphere || 'Atmospheric setting'}`,
          keyFeatures: loc.permanentSpatialAnchors
            ? [loc.permanentSpatialAnchors]
            : ['Architectural scale', 'Lighting direction'],
          colors: [project.visualStyle?.colorIntent || 'Cinematic tonal palette'],
          materialsOrTextures: [project.visualStyle?.textureIntent || 'Tactile physical materials'],
          lightingOrRenderingRules: loc.moodAtmosphere || 'Low-key practical lighting',
        },
        referencePrompt: prompt,
        spatialLayout: 'Grounded architectural layout with clearly defined foreground, middle ground, and deep horizon',
        entryExitPoints: 'Main entrance doorway and primary transit corridor visually established',
        recurringLandmarks: 'Central architectural focal point anchored across wide and medium coverage',
        continuityRequirements: 'Maintain consistent light direction and spatial geography across shots',
        promptStatus: 'READY',
        reviewIssues: [],
        updatedAt: new Date().toISOString(),
      };
    });

    setStage2Assets([...(project.stage2?.assets || []), ...newAssets]);
  };

  if (locationAssets.length === 0) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 md:p-12 text-center space-y-5 max-w-2xl mx-auto shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
          <MapPin className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            PHASE 2 DIRECTIVE
          </span>
          <h3 className="font-['Exo_2'] font-bold text-xl text-white">
            Locations & Environments Registry Empty
          </h3>
          <p className="text-xs text-[#79838E] leading-relaxed max-w-md mx-auto">
            Extract permanent spatial sets and environment worlds from your Phase 1 screenplay sluglines, scenes, and shot lists. Generates establishing prompts, spatial layout anchors, entry/exit vectors, and camera angles.
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

          {missingCanonLocations.length > 0 && (
            <button
              onClick={handleSyncMissingLocations}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sync {missingCanonLocations.length} Canon Locations</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Missing Canon Sync Banner if user added locations in Stage 1 */}
      {missingCanonLocations.length > 0 && (
        <div className="bg-[#0E1A18] border border-emerald-500/40 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 text-emerald-200">
            <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              New canon locations detected ({missingCanonLocations.map((l) => l.id).join(', ')}). Generate corresponding Phase 2 visual asset prompts now.
            </span>
          </div>
          <button
            onClick={handleSyncMissingLocations}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 shrink-0 text-xs shadow-md cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Prompts for {missingCanonLocations.map((l) => l.id).join(', ')}</span>
          </button>
        </div>
      )}

      {/* Search and Counts Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1017] border border-[#1C2735] p-3.5 rounded-xl">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Permanent Sets ({locationAssets.length})</span>
          </span>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
            {approvedCount} / {locationAssets.length} Approved References
          </span>
          <span className="text-[#79838E] font-mono text-[11px] hidden md:inline">
            • Stable Canonical IDs (LOC-001...)
          </span>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#79838E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations, sets, IDs..."
            className="w-full bg-[#111820] border border-[#1C2735] focus:border-[#00AFFF] pl-9 pr-3 py-1.5 text-xs text-white rounded-lg focus:outline-none placeholder-[#79838E]"
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 gap-5">
        {filteredLocations.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onUpdateAsset={updateStage2Asset}
            onRegeneratePrompt={(a) => setSelectedAssetForRegen(a)}
            onAttachImage={attachReferenceImageToAsset}
            onRemoveImage={removeReferenceImageFromAsset}
          />
        ))}

        {filteredLocations.length === 0 && (
          <div className="p-8 text-center text-xs text-[#79838E] bg-[#0B1017] border border-[#1C2735] rounded-xl">
            No locations match your search query "{searchQuery}".
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
