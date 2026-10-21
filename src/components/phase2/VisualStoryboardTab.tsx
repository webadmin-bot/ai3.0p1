import React, { useState } from 'react';
import {
  Clapperboard,
  Sparkles,
  Plus,
  LayoutGrid,
  Film,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  ArrowRight,
  Maximize2,
  X,
  FileText,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { CinematicShot } from '../../types/filmStudio';
import { StoryboardCard } from './StoryboardCard';
import { StoryboardTimelineView } from './StoryboardTimelineView';
import { EditStoryboardCardModal } from './EditStoryboardCardModal';
import { StoryboardContactSheetModal } from './StoryboardContactSheetModal';
import {
  autoGenerateStoryboardShotsFromProject,
  reorderStoryboardShots,
  buildStoryboardPrompt,
  calculateShotTimecode,
} from '../../services/storyboardEngine';
import { apiGenerateImagePreview } from '../../services/api';

export const VisualStoryboardTab: React.FC = () => {
  const {
    project,
    setStage3Shots,
    updateStage3Shot,
    attachImageToShot,
    setActiveStage,
    setActivePhase,
  } = useProject();

  const shots: CinematicShot[] = project.stage3?.shots || [];
  const scenes = project.stage3?.scenes || [];

  // Local View States
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [editingShot, setEditingShot] = useState<CinematicShot | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'has_image' | 'no_image'>('all');
  const [isBatchGeneratingPrompts, setIsBatchGeneratingPrompts] = useState(false);
  const [isBatchGeneratingImages, setIsBatchGeneratingImages] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string } | null>(null);

  // Calculate statistics
  const totalDuration = shots.reduce((acc, s) => acc + (s.duration || 8), 0);
  const shotsWithImage = shots.filter((s) => Boolean(s.firstFrameImageData)).length;
  const shotsWithPrompt = shots.filter((s) => Boolean(s.firstFramePrompt && s.firstFramePrompt.trim())).length;
  const targetRuntime = project.settings?.targetRuntimeSeconds || 60;

  // Reordering handlers (preserves stable shotId!)
  const handleMoveEarlier = (index: number) => {
    if (index === 0) return;
    const reordered = reorderStoryboardShots(shots, index, index - 1);
    setStage3Shots(reordered);
  };

  const handleMoveLater = (index: number) => {
    if (index === shots.length - 1) return;
    const reordered = reorderStoryboardShots(shots, index, index + 1);
    setStage3Shots(reordered);
  };

  // Add a new shot card
  const handleAddNewShot = () => {
    const nextOrder = shots.length + 1;
    const shotId = `SHOT-${String(nextOrder).padStart(2, '0')}`;
    const newShot: CinematicShot = {
      shotId,
      sceneId: scenes[0]?.sceneId || 'SCENE-01',
      order: nextOrder,
      duration: 8,
      purpose: 'Dramatic narrative beat and character progression',
      sourceBeatIds: [],
      characterIds: project.stage2?.assets?.filter((a) => a.type === 'CHARACTER').slice(0, 1).map((a) => a.id) || ['CHAR-01'],
      wardrobeIds: [],
      propIds: [],
      locationId: project.stage2?.assets?.find((a) => a.type === 'LOCATION')?.id || 'LOC-01',
      shotSize: 'MEDIUM',
      cameraAngle: 'EYE_LEVEL',
      lensIntent: '35mm anamorphic prime lens',
      framing: 'Rule of thirds composition, balanced framing',
      cameraMovement: 'SLOW_PUSH_IN',
      subjectStartPosition: 'Center frame',
      subjectEndPosition: 'Subtle advance into key light',
      blockingAndMovement: 'Subject maintains focused presence under narrative tension.',
      performanceNotes: 'Grounded cinematic posture',
      eyeline: 'Direct to focal target',
      lightingAndAtmosphere: 'Cinematic volumetric contrast, subtle rim lighting',
      screenDirection: 'Centered',
      dialogueRefs: [],
      audioContext: 'Atmospheric room tone and score swell',
      entryVisualState: 'Initial stillness',
      exitVisualState: 'Progressive momentum',
      flowMode: 'INGREDIENTS',
      routingReason: 'Single character focal beat',
      routingConfidence: 0.95,
      routeManualOverride: false,
      ingredientAssetIds: ['CHAR-01'],
      firstFramePrompt: null,
      endFramePrompt: null,
      referenceReadiness: 'READY',
      continuityNotes: [`Continuity anchor for ${shotId}`],
      generationComplexity: 'MEDIUM',
    };

    newShot.firstFramePrompt = buildStoryboardPrompt(newShot, project, 'first');
    setStage3Shots([...shots, newShot]);
  };

  // Delete shot card
  const handleDeleteShot = (shotId: string) => {
    const remaining = shots.filter((s) => s.shotId !== shotId);
    const reindexed = remaining.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStage3Shots(reindexed);
  };

  // Auto-initialize from Phase 1 shots or screenplay
  const handleAutoCreateShots = () => {
    const generated = autoGenerateStoryboardShotsFromProject(project);
    setStage3Shots(generated);
  };

  // Batch Assemble Missing Prompts
  const handleBatchAssemblePrompts = () => {
    setIsBatchGeneratingPrompts(true);
    const updated = shots.map((shot) => {
      let first = shot.firstFramePrompt;
      let end = shot.endFramePrompt;
      if (!first || !first.trim()) {
        first = buildStoryboardPrompt(shot, project, 'first');
      }
      if (shot.flowMode === 'FRAMES' && (!end || !end.trim())) {
        end = buildStoryboardPrompt(shot, project, 'end');
      }
      return {
        ...shot,
        firstFramePrompt: first,
        endFramePrompt: end,
      };
    });
    setStage3Shots(updated);
    setIsBatchGeneratingPrompts(false);
  };

  // Optional Batch Image Generation (sequential with delay to prevent rate limits)
  const handleBatchGenerateImages = async () => {
    const missing = shots.filter((s) => !s.firstFrameImageData);
    if (missing.length === 0) return;

    setIsBatchGeneratingImages(true);
    setBatchProgress({ current: 0, total: missing.length });

    for (let i = 0; i < missing.length; i++) {
      const shot = missing[i];
      setBatchProgress({ current: i + 1, total: missing.length });

      let prompt = shot.firstFramePrompt;
      if (!prompt || !prompt.trim()) {
        prompt = buildStoryboardPrompt(shot, project, 'first');
        updateStage3Shot(shot.shotId, { firstFramePrompt: prompt });
      }

      try {
        const ar = project.settings.aspectRatio === '9:16' ? '9:16' : '16:9';
        const res = await apiGenerateImagePreview(prompt, ar);
        if (res.success && res.imageDataUrl) {
          attachImageToShot(shot.shotId, res.imageDataUrl, `${shot.shotId}-first-frame.png`, 'first');
        }
      } catch (err) {
        console.warn(`Failed image generation for ${shot.shotId}:`, err);
      }

      // Small pause between sequential requests
      await new Promise((r) => setTimeout(r, 800));
    }

    setIsBatchGeneratingImages(false);
    setBatchProgress(null);
  };

  // Filtered shots list
  const filteredShots = shots.filter((shot) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = shot.shotId.toLowerCase().includes(q);
      const matchPurpose = (shot.purpose || '').toLowerCase().includes(q);
      const matchChar = (shot.characterIds || []).some((c) => c.toLowerCase().includes(q));
      const matchDialogue = (shot.dialogueText || '').toLowerCase().includes(q);
      if (!matchId && !matchPurpose && !matchChar && !matchDialogue) return false;
    }

    // Filter mode
    if (filterMode === 'has_image' && !shot.firstFrameImageData) return false;
    if (filterMode === 'no_image' && shot.firstFrameImageData) return false;

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Studio Header */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30 uppercase tracking-widest">
              Phase 2 — Visual Storyboard Studio
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] bg-[#141C26] text-[#A0AEC0] border border-[#1C2735]">
              Master Style: <strong className="text-white">{project.visualStyle?.name}</strong>
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#141C26] text-emerald-400 border border-[#1C2735]">
              AR: {project.settings.aspectRatio}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold font-['Exo_2'] text-white">
            Cinematic Visual Storyboard & Shot Sequences
          </h2>
          <p className="text-xs text-[#8A96A6] max-w-2xl leading-relaxed">
            Synchronized directly with your Phase 1 Shot List. Each card establishes camera movement, lens angle, duration, audio cues, character continuity, and master style keyframe prompts.
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span>Export Storyboard / PDF</span>
          </button>

          <button
            onClick={handleAddNewShot}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Shot</span>
          </button>

          <button
            onClick={() => {
              if (setActivePhase) {
                setActivePhase('phase3');
              } else {
                setActiveStage('stage4');
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
          >
            <span>Proceed to Phase 3: Production</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics & Control Bar */}
      <div className="bg-[#090D13] border border-[#1C2735] rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Statistics Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#0E141D] border border-[#1C2735] flex items-center space-x-2">
            <Film className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span className="text-[#8A96A6]">Total Shots:</span>
            <strong className="text-white font-mono">{shots.length}</strong>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#0E141D] border border-[#1C2735] flex items-center space-x-2">
            <span className="text-[#8A96A6]">Runtime:</span>
            <strong className="text-white font-mono">{totalDuration}s</strong>
            <span className="text-[#55606E]">/ {targetRuntime}s target</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#0E141D] border border-[#1C2735] flex items-center space-x-2">
            <span className="text-[#8A96A6]">Rendered Images:</span>
            <strong className="text-emerald-400 font-mono">
              {shotsWithImage} / {shots.length}
            </strong>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#0E141D] border border-[#1C2735] flex items-center space-x-2">
            <span className="text-[#8A96A6]">Prompt Readiness:</span>
            <strong className="text-[#00AFFF] font-mono">
              {shotsWithPrompt} / {shots.length}
            </strong>
          </div>
        </div>

        {/* View Switcher & Batch Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleBatchAssemblePrompts}
            disabled={isBatchGeneratingPrompts || shots.length === 0}
            className="px-3 py-1.5 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-[#A0AEC0] hover:text-white border border-[#243346] text-xs font-medium flex items-center space-x-1.5 cursor-pointer disabled:opacity-40"
            title="Auto-assemble prompts for shots that don't have one"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Assemble Missing Prompts</span>
          </button>

          {shotsWithImage < shots.length && (
            <button
              onClick={handleBatchGenerateImages}
              disabled={isBatchGeneratingImages || shots.length === 0}
              className="px-3 py-1.5 rounded-lg bg-[#141F2E] hover:bg-[#1B293C] text-[#00AFFF] border border-[#00AFFF]/40 text-xs font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-40"
              title="Generate images for all shots lacking one"
            >
              <RefreshCw className={`w-3 h-3 ${isBatchGeneratingImages ? 'animate-spin' : ''}`} />
              <span>
                {isBatchGeneratingImages
                  ? `Rendering (${batchProgress?.current}/${batchProgress?.total})...`
                  : 'Render Missing Images'}
              </span>
            </button>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-[#141C26] rounded-lg p-0.5 border border-[#243346]">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'grid'
                  ? 'bg-[#00AFFF] text-white shadow-sm'
                  : 'text-[#79838E] hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>

            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'timeline'
                  ? 'bg-[#00AFFF] text-white shadow-sm'
                  : 'text-[#79838E] hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Timeline View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {shots.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B1017] p-3 rounded-xl border border-[#1C2735]">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#55606E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Shot ID, action, character..."
              className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg pl-9 pr-3 py-1.5 text-xs focus:border-[#00AFFF] outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <Filter className="w-3.5 h-3.5 text-[#55606E]" />
            <div className="flex items-center bg-[#141C26] rounded-lg p-0.5 border border-[#243346] text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-[#1C2735] text-white'
                    : 'text-[#79838E] hover:text-white'
                }`}
              >
                All ({shots.length})
              </button>
              <button
                onClick={() => setFilterMode('has_image')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  filterMode === 'has_image'
                    ? 'bg-[#1C2735] text-emerald-400'
                    : 'text-[#79838E] hover:text-white'
                }`}
              >
                With Image ({shotsWithImage})
              </button>
              <button
                onClick={() => setFilterMode('no_image')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  filterMode === 'no_image'
                    ? 'bg-[#1C2735] text-amber-400'
                    : 'text-[#79838E] hover:text-white'
                }`}
              >
                Prompt Only ({shots.length - shotsWithImage})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Empty State vs Cards */}
      {shots.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#0B1017] border border-[#1C2735] text-center space-y-4 max-w-xl mx-auto shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-[#141C28] text-[#00AFFF] flex items-center justify-center mx-auto border border-[#243346] shadow-sm">
            <Clapperboard className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold font-['Exo_2'] text-white">
              No Storyboard Shot Cards Yet
            </h3>
            <p className="text-xs text-[#8A96A6] leading-relaxed">
              Automatically build a complete sequence of visual shot cards from your screenplay & canon, or add blank cards manually to begin designing camera shots.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleAutoCreateShots}
              className="px-4 py-2.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Auto-Build Storyboard from Scenes & Canon</span>
            </button>

            <button
              onClick={handleAddNewShot}
              className="px-4 py-2.5 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Blank Shot</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'timeline' ? (
        <StoryboardTimelineView
          shots={filteredShots}
          project={project}
          onEditShot={(s) => setEditingShot(s)}
          onMoveEarlier={handleMoveEarlier}
          onMoveLater={handleMoveLater}
          onPreviewImage={(url, title) => setPreviewModalImage({ url, title })}
        />
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShots.map((shot, index) => {
            const actualIndex = shots.findIndex((s) => s.shotId === shot.shotId);
            return (
              <StoryboardCard
                key={shot.shotId}
                shot={shot}
                index={actualIndex >= 0 ? actualIndex : index}
                totalShots={shots.length}
                allShots={shots}
                project={project}
                onEdit={(s) => setEditingShot(s)}
                onDelete={handleDeleteShot}
                onMoveEarlier={handleMoveEarlier}
                onMoveLater={handleMoveLater}
                onPreviewImage={(url, title) => setPreviewModalImage({ url, title })}
              />
            );
          })}
        </div>
      )}

      {/* Edit Storyboard Card Modal */}
      {editingShot && (
        <EditStoryboardCardModal
          shot={editingShot}
          project={project}
          isOpen={Boolean(editingShot)}
          onClose={() => setEditingShot(null)}
          onSave={(updated) => {
            updateStage3Shot(updated.shotId, updated);
            setEditingShot(null);
          }}
        />
      )}

      {/* Export Storyboard / Contact Sheet Modal */}
      <StoryboardContactSheetModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        shots={shots}
        project={project}
      />

      {/* Lightbox / Zoom Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center bg-[#0B1017] border border-[#1C2735] rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-3 border-b border-[#1C2735]">
              <span className="text-xs font-bold text-white">{previewModalImage.title}</span>
              <button
                onClick={() => setPreviewModalImage(null)}
                className="p-1 hover:bg-[#1C2735] text-[#79838E] hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-hidden">
              <img
                src={previewModalImage.url}
                alt={previewModalImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
