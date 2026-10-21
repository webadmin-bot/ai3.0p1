import React, { useState, useRef } from 'react';
import {
  Camera,
  Clock,
  Sparkles,
  Upload,
  Trash2,
  Edit3,
  Copy,
  Check,
  Eye,
  ArrowLeft,
  ArrowRight,
  Move,
  Volume2,
  MessageSquare,
  Mic,
  MapPin,
  User,
  Package,
  Layers,
  AlertCircle,
  Maximize2,
  RefreshCw,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { CinematicShot, Project, VisualAsset } from '../../types/filmStudio';
import { useProject } from '../../context/ProjectContext';
import { calculateShotTimecode, buildStoryboardPrompt } from '../../services/storyboardEngine';
import { apiGenerateImagePreview, apiRefineStoryboardPrompt } from '../../services/api';
import { formatPromptForEngine } from '../../services/phase2AssetEngine';
import { saveMediaItemDetailed } from '../../services/mediaStore';

interface StoryboardCardProps {
  shot: CinematicShot;
  index: number;
  totalShots: number;
  allShots: CinematicShot[];
  project: Project;
  onEdit: (shot: CinematicShot) => void;
  onDelete: (shotId: string) => void;
  onMoveEarlier: (index: number) => void;
  onMoveLater: (index: number) => void;
  onPreviewImage: (dataUrl: string, title: string) => void;
}

export const StoryboardCard: React.FC<StoryboardCardProps> = ({
  shot,
  index,
  totalShots,
  allShots,
  project,
  onEdit,
  onDelete,
  onMoveEarlier,
  onMoveLater,
  onPreviewImage,
}) => {
  const { updateStage3Shot, attachImageToShot, removeImageFromShot } = useProject();

  const [activeFrameTab, setActiveFrameTab] = useState<'first' | 'end'>('first');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isRefiningPrompt, setIsRefiningPrompt] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<'GEMINI' | 'MIDJOURNEY' | 'FLUX' | 'SDXL'>('GEMINI');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timecode calculation
  const timecode = calculateShotTimecode(allShots, index);

  // Active frame image and prompt
  const isFirstFrame = activeFrameTab === 'first';
  const currentImageData = isFirstFrame ? shot.firstFrameImageData : shot.endFrameImageData;
  const currentPrompt = isFirstFrame ? shot.firstFramePrompt : shot.endFramePrompt;
  const hasImage = Boolean(currentImageData);
  const hasPrompt = Boolean(currentPrompt && currentPrompt.trim());
  const isApproved = shot.approvalStatus === 'APPROVED' || hasImage;

  // Find character, location, prop names
  const characters = (shot.characterIds || []).map((id) => {
    const asset = project.stage2?.assets?.find((a) => a.id === id);
    const canon = project.storyCanon?.characters?.find((c) => c.id === id);
    return { id, name: asset?.name || canon?.name || id, role: canon?.role };
  });

  const locationAsset = project.stage2?.assets?.find((a) => a.id === shot.locationId);
  const locationCanon = project.storyCanon?.locations?.find((l) => l.id === shot.locationId);
  const locationName = locationAsset?.name || locationCanon?.name || shot.locationId || 'Default Location';

  const propsList = (shot.propIds || []).map((pId) => {
    const asset = project.stage2?.assets?.find((a) => a.id === pId);
    const canon = project.storyCanon?.props?.find((p) => p.id === pId);
    return asset?.name || canon?.name || pId;
  });

  // Formatted prompt based on engine
  const formattedPrompt = formatPromptForEngine(
    currentPrompt || '',
    selectedEngine,
    project.settings.aspectRatio === '9:16' ? '9:16' : '16:9',
    project.visualStyle?.name
  );

  // Copy prompt handler
  const handleCopyPrompt = () => {
    if (!formattedPrompt) return;
    navigator.clipboard.writeText(formattedPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleToggleApproval = () => {
    const newStatus = shot.approvalStatus === 'APPROVED' ? 'PENDING' : 'APPROVED';
    updateStage3Shot(shot.shotId, { approvalStatus: newStatus });
  };

  // Re-assemble prompt inheriting style bible & character specs
  const handleRebuildPrompt = () => {
    const fresh = buildStoryboardPrompt(shot, project, activeFrameTab);
    if (activeFrameTab === 'first') {
      updateStage3Shot(shot.shotId, { firstFramePrompt: fresh });
    } else {
      updateStage3Shot(shot.shotId, { endFramePrompt: fresh });
    }
  };

  // AI Refine Prompt
  const handleAiRefinePrompt = async () => {
    setIsRefiningPrompt(true);
    setGenerationError(null);
    try {
      const res = await apiRefineStoryboardPrompt({
        shot,
        visualStyle: project.visualStyle,
        styleBible: project.stage2?.styleBible,
        characters: project.stage2?.assets?.filter((a) => a.type === 'CHARACTER'),
        location: locationAsset,
        frameType: activeFrameTab,
      });

      if (res.success && res.refinedPrompt) {
        if (activeFrameTab === 'first') {
          updateStage3Shot(shot.shotId, { firstFramePrompt: res.refinedPrompt });
        } else {
          updateStage3Shot(shot.shotId, { endFramePrompt: res.refinedPrompt });
        }
      } else {
        setGenerationError(res.error || 'Failed to refine prompt');
      }
    } catch (err: any) {
      setGenerationError(err?.message || 'Error refining storyboard prompt');
    } finally {
      setIsRefiningPrompt(false);
    }
  };

  // Generate Image via existing image API
  const handleGenerateImage = async () => {
    let promptToUse = currentPrompt;
    if (!promptToUse || !promptToUse.trim()) {
      promptToUse = buildStoryboardPrompt(shot, project, activeFrameTab);
      if (activeFrameTab === 'first') {
        updateStage3Shot(shot.shotId, { firstFramePrompt: promptToUse });
      } else {
        updateStage3Shot(shot.shotId, { endFramePrompt: promptToUse });
      }
    }

    setIsGeneratingImage(true);
    setGenerationError(null);
    try {
      const ar = project.settings.aspectRatio === '9:16' ? '9:16' : '16:9';
      const res = await apiGenerateImagePreview(promptToUse, ar);
      if (res.success && res.imageDataUrl) {
        const fileName = `${shot.shotId}-${activeFrameTab}-frame.png`;
        const mediaId = `media_${shot.shotId}_${activeFrameTab}_${Date.now()}`;

        // Save persistently in IndexedDB
        saveMediaItemDetailed(mediaId, res.imageDataUrl, {
          projectId: project.projectId,
          targetId: shot.shotId,
          imageRole: activeFrameTab === 'first' ? 'FIRST_FRAME' : 'END_FRAME',
          approvalStatus: 'APPROVED',
          source: 'GEMINI_GEN',
          filename: fileName,
        }).then((saveRes) => {
          if (!saveRes.isPersistent && saveRes.warning) {
            setGenerationError(saveRes.warning);
          }
        });

        attachImageToShot(
          shot.shotId,
          res.imageDataUrl,
          fileName,
          activeFrameTab
        );
        updateStage3Shot(shot.shotId, { approvalStatus: 'APPROVED' });
      } else {
        setGenerationError(res.error || 'Image generation failed');
      }
    } catch (err: any) {
      setGenerationError(err?.message || 'Failed to generate storyboard image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Upload image handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const mediaId = `media_${shot.shotId}_${activeFrameTab}_${Date.now()}`;
        saveMediaItemDetailed(mediaId, reader.result, {
          projectId: project.projectId,
          targetId: shot.shotId,
          imageRole: activeFrameTab === 'first' ? 'FIRST_FRAME' : 'END_FRAME',
          approvalStatus: 'APPROVED',
          source: 'UPLOAD',
          filename: file.name,
        }).then((saveRes) => {
          if (!saveRes.isPersistent && saveRes.warning) {
            setGenerationError(saveRes.warning);
          }
        });

        attachImageToShot(shot.shotId, reader.result, file.name, activeFrameTab);
        updateStage3Shot(shot.shotId, { approvalStatus: 'APPROVED' });
      }
    };
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = () => {
    removeImageFromShot(shot.shotId, activeFrameTab);
  };

  const handleDownloadImage = () => {
    if (!currentImageData) return;
    const a = document.createElement('a');
    a.href = currentImageData;
    a.download = `${shot.shotId}-${activeFrameTab}-frame.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isAspect916 = project.settings.aspectRatio === '9:16';

  return (
    <div className="bg-[#0B1017] border border-[#1C2735] hover:border-[#00AFFF]/50 rounded-xl overflow-hidden transition-all shadow-md flex flex-col group">
      {/* Top Header Bar */}
      <div className="p-3 bg-[#0E141D] border-b border-[#1C2735] flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          {/* Reordering Controls */}
          <div className="flex items-center space-x-0.5 bg-[#141C26] rounded-md border border-[#243346] p-0.5">
            <button
              onClick={() => onMoveEarlier(index)}
              disabled={index === 0}
              className="p-1 hover:bg-[#1E2938] text-[#79838E] hover:text-white rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Move earlier (stable ID preserved)"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono font-bold text-white px-1">#{shot.order}</span>
            <button
              onClick={() => onMoveLater(index)}
              disabled={index === totalShots - 1}
              className="p-1 hover:bg-[#1E2938] text-[#79838E] hover:text-white rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Move later (stable ID preserved)"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Stable Shot ID */}
          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30">
            {shot.shotId}
          </span>

          {/* Duration Selector */}
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#141C26] text-[#A0AEC0] border border-[#1C2735] flex items-center space-x-1">
            <Clock className="w-3 h-3 text-[#00AFFF]" />
            <span>{shot.duration || 8}s</span>
          </span>
        </div>

        {/* Timecode & Actions */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded">
            TC: {timecode.rangeDisplay}
          </span>

          <button
            onClick={() => onEdit(shot)}
            className="p-1.5 hover:bg-[#1C2735] text-[#79838E] hover:text-white rounded cursor-pointer transition-colors"
            title="Edit Full Shot Card"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(shot.shotId)}
            className="p-1.5 hover:bg-red-950/50 text-[#79838E] hover:text-red-400 rounded cursor-pointer transition-colors"
            title="Delete Shot"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frame Tab Switcher (First Frame vs End Frame) */}
      <div className="flex items-center border-b border-[#1C2735] bg-[#090D13] px-3 py-1.5 justify-between">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveFrameTab('first')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
              activeFrameTab === 'first'
                ? 'bg-[#1C2735] text-white border border-[#00AFFF]/40'
                : 'text-[#657283] hover:text-[#A0AEC0]'
            }`}
          >
            First Frame Keyframe
          </button>
          <button
            onClick={() => setActiveFrameTab('end')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
              activeFrameTab === 'end'
                ? 'bg-[#1C2735] text-white border border-[#00AFFF]/40'
                : 'text-[#657283] hover:text-[#A0AEC0]'
            }`}
          >
            End Frame (Optional)
          </button>
        </div>

        {/* Status Badge & Approval Toggle */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleToggleApproval}
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center space-x-1 cursor-pointer transition-colors ${
              isApproved
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:bg-amber-900'
            }`}
            title="Toggle approval status for this frame"
          >
            {isApproved ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : <Lock className="w-2.5 h-2.5 text-amber-400" />}
            <span>{isApproved ? 'APPROVED' : 'PENDING'}</span>
          </button>

          {hasImage ? (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center space-x-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>IMAGE READY</span>
            </span>
          ) : hasPrompt ? (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
              <AlertCircle className="w-2.5 h-2.5" />
              <span>PROMPT READY</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-700/50">
              PENDING PROMPT
            </span>
          )}
        </div>
      </div>

      {/* Visual Image Canvas Area */}
      <div
        className={`relative bg-[#070A0F] flex items-center justify-center overflow-hidden border-b border-[#1C2735] ${
          isAspect916 ? 'aspect-[9/16] max-h-72' : 'aspect-video max-h-60'
        }`}
      >
        {currentImageData ? (
          <div className="relative w-full h-full group/canvas">
            <img
              src={currentImageData}
              alt={`${shot.shotId} ${activeFrameTab} frame`}
              className="w-full h-full object-cover"
            />

            {/* Hover Action Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/canvas:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
              <button
                onClick={() => onPreviewImage(currentImageData, `${shot.shotId} — ${activeFrameTab === 'first' ? 'First Frame' : 'End Frame'}`)}
                className="p-2 rounded-lg bg-black/70 hover:bg-black text-white text-xs flex items-center space-x-1 cursor-pointer"
                title="Enlarge preview"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span>Zoom</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg bg-black/70 hover:bg-black text-white text-xs flex items-center space-x-1 cursor-pointer"
                title="Replace image"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Replace</span>
              </button>

              <button
                onClick={handleDownloadImage}
                className="p-2 rounded-lg bg-black/70 hover:bg-black text-white text-xs flex items-center space-x-1 cursor-pointer"
                title="Download image"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
              </button>

              <button
                onClick={handleRemoveImage}
                className="p-2 rounded-lg bg-black/70 hover:bg-red-950 text-red-400 text-xs flex items-center space-x-1 cursor-pointer"
                title="Remove image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center space-y-3 w-full max-w-xs">
            <div className="w-10 h-10 rounded-xl bg-[#141C28] text-[#55606E] flex items-center justify-center mx-auto border border-[#1C2735]">
              <ImageIcon className="w-5 h-5 text-[#00AFFF]/70" />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#8A96A6]">
                {hasPrompt ? 'Prompt ready for rendering' : 'Awaiting prompt'}
              </div>
              <div className="text-[10px] text-[#55606E]">
                Generate with Gemini or manually upload reference sketch/still
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
                className="px-3 py-1.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-[11px] font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Sparkles className={`w-3 h-3 ${isGeneratingImage ? 'animate-spin' : ''}`} />
                <span>{isGeneratingImage ? 'Generating...' : 'Generate Image'}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-[#D7DCE2] border border-[#243346] text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
              >
                <Upload className="w-3 h-3 text-emerald-400" />
                <span>Upload</span>
              </button>
            </div>
          </div>
        )}

        {/* Hidden File Input for Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Loading overlay during generation */}
        {isGeneratingImage && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 p-4 text-center z-10">
            <RefreshCw className="w-6 h-6 text-[#00AFFF] animate-spin" />
            <span className="text-xs font-bold text-white">Rendering Storyboard Frame...</span>
            <span className="text-[10px] text-[#79838E]">Inheriting master style & character anchors</span>
          </div>
        )}
      </div>

      {/* Generation Error Alert if any */}
      {generationError && (
        <div className="p-2 bg-red-950/60 border-b border-red-500/40 text-red-300 text-[10px] flex items-center justify-between">
          <span className="truncate">{generationError}</span>
          <button onClick={() => setGenerationError(null)} className="text-white hover:underline ml-2">
            dismiss
          </button>
        </div>
      )}

      {/* Card Body & Details */}
      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
        {/* Visual Description & Purpose */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF]">
              Visual Description & Action
            </span>
            <span className="text-[9px] font-mono text-[#55606E]">
              Scene: {shot.sceneId || 'SCENE-01'}
            </span>
          </div>
          <p className="text-xs text-white leading-relaxed font-normal">
            {shot.purpose || shot.blockingAndMovement || 'No visual description entered yet.'}
          </p>
        </div>

        {/* Cinematography Specs Badges */}
        <div className="grid grid-cols-2 gap-1.5 py-1 border-y border-[#16202C]">
          <div className="flex items-center space-x-1.5 text-[11px] text-[#A0AEC0]">
            <Camera className="w-3 h-3 text-[#00AFFF] shrink-0" />
            <span className="truncate">
              <strong>Size:</strong> {(shot.shotSize || 'MEDIUM').replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] text-[#A0AEC0]">
            <Move className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>Move:</strong> {(shot.cameraMovement || 'STATIC').replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-[10px] text-[#79838E] col-span-2 truncate">
            <span>
              <strong>Angle & Lens:</strong> {(shot.cameraAngle || 'EYE_LEVEL').replace(/_/g, ' ')} ·{' '}
              {shot.lensIntent || '35mm anamorphic'}
            </span>
          </div>
        </div>

        {/* Character, Location & Prop References */}
        <div className="space-y-1 text-[11px]">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold text-[#55606E] flex items-center space-x-1 mr-1">
              <User className="w-2.5 h-2.5 text-[#00AFFF]" />
              <span>Characters:</span>
            </span>
            {characters.length > 0 ? (
              characters.map((c) => (
                <span
                  key={c.id}
                  className="px-1.5 py-0.2 rounded text-[10px] bg-[#141F2E] text-[#00AFFF] border border-[#00AFFF]/30"
                  title={`${c.name} (${c.role || 'Character'})`}
                >
                  @{c.name}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-[#55606E]">None tagged</span>
            )}
          </div>

          <div className="flex items-center space-x-1 text-[10px] text-[#79838E] truncate">
            <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              <strong>Location:</strong> {locationName}
            </span>
          </div>

          {propsList.length > 0 && (
            <div className="flex items-center space-x-1 text-[10px] text-[#79838E] truncate">
              <Package className="w-2.5 h-2.5 text-purple-400 shrink-0" />
              <span className="truncate">
                <strong>Props:</strong> {propsList.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Audio Lanes (Dialogue, Narration, SFX) */}
        {(shot.dialogueText || shot.narrationText || shot.sfxText || shot.audioContext) && (
          <div className="bg-[#080C12] p-2 rounded-lg border border-[#16202C] space-y-1 text-[10px]">
            {shot.dialogueText && (
              <div className="flex items-start space-x-1.5 text-white">
                <MessageSquare className="w-3 h-3 text-[#00AFFF] shrink-0 mt-0.5" />
                <span className="italic line-clamp-1">{shot.dialogueText}</span>
              </div>
            )}
            {shot.narrationText && (
              <div className="flex items-start space-x-1.5 text-amber-200">
                <Mic className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <span className="italic line-clamp-1">VO: {shot.narrationText}</span>
              </div>
            )}
            {(shot.sfxText || shot.audioContext) && (
              <div className="flex items-start space-x-1.5 text-[#79838E]">
                <Volume2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span className="line-clamp-1">SFX: {shot.sfxText || shot.audioContext}</span>
              </div>
            )}
          </div>
        )}

        {/* Prompt Accordion & Prompt Tools */}
        <div className="pt-2 border-t border-[#16202C] space-y-1.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowPromptDetails(!showPromptDetails)}
              className="text-[10px] font-bold text-[#A0AEC0] hover:text-white flex items-center space-x-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-[#00AFFF]" />
              <span>
                {activeFrameTab === 'first' ? 'First Frame Prompt' : 'End Frame Prompt'}
              </span>
              <span className="text-[9px] text-[#55606E]">({showPromptDetails ? 'hide' : 'view'})</span>
            </button>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopyPrompt}
                disabled={!currentPrompt}
                className="p-1 text-[#79838E] hover:text-white rounded disabled:opacity-30 cursor-pointer"
                title="Copy prompt text"
              >
                {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>

              <button
                onClick={handleAiRefinePrompt}
                disabled={isRefiningPrompt}
                className="p-1 text-[#79838E] hover:text-[#00AFFF] rounded disabled:opacity-30 cursor-pointer"
                title="AI Refine Prompt via Gemini"
              >
                <Sparkles className={`w-3 h-3 ${isRefiningPrompt ? 'animate-spin text-[#00AFFF]' : ''}`} />
              </button>

              <button
                onClick={handleRebuildPrompt}
                className="p-1 text-[#79838E] hover:text-amber-400 rounded cursor-pointer"
                title="Re-assemble prompt from style bible & characters"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {showPromptDetails && (
            <div className="p-2.5 rounded-lg bg-[#070A0F] border border-[#1A2534] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center space-x-1 text-[#79838E]">
                  <span>Engine Format:</span>
                  <select
                    value={selectedEngine}
                    onChange={(e) => setSelectedEngine(e.target.value as any)}
                    className="bg-[#141C26] border border-[#1C2735] text-[#D7DCE2] px-1.5 py-0.5 rounded focus:outline-none cursor-pointer"
                  >
                    <option value="GEMINI">Standard / Gemini</option>
                    <option value="MIDJOURNEY">Midjourney v6.1</option>
                    <option value="FLUX">Flux.1 Schnell</option>
                    <option value="SDXL">SDXL Photoreal</option>
                  </select>
                </div>
                <span className="text-[#55606E]">AR: {project.settings.aspectRatio}</span>
              </div>

              <textarea
                value={currentPrompt || ''}
                onChange={(e) => {
                  if (activeFrameTab === 'first') {
                    updateStage3Shot(shot.shotId, { firstFramePrompt: e.target.value });
                  } else {
                    updateStage3Shot(shot.shotId, { endFramePrompt: e.target.value });
                  }
                }}
                rows={3}
                placeholder="Image prompt inheriting master style, character anchors, and lighting..."
                className="w-full bg-[#0B1017] border border-[#1C2735] rounded p-2 text-[11px] text-[#D7DCE2] font-mono focus:border-[#00AFFF] focus:outline-none resize-none leading-relaxed"
              />

              {/* Negative Prompt */}
              <div className="space-y-0.5">
                <label className="text-[10px] text-[#79838E] font-semibold block">Negative Prompt / Avoided Elements:</label>
                <input
                  type="text"
                  value={shot.negativePrompt || ''}
                  onChange={(e) => updateStage3Shot(shot.shotId, { negativePrompt: e.target.value })}
                  placeholder="e.g. blur, cloned faces, oversaturated, plastic skin, distorted anatomy"
                  className="w-full bg-[#0B1017] border border-[#1C2735] rounded px-2 py-1 text-[10px] text-[#D7DCE2] font-mono focus:border-[#00AFFF] focus:outline-none"
                />
              </div>

              {/* Continuity Requirements */}
              <div className="space-y-0.5">
                <label className="text-[10px] text-[#79838E] font-semibold block">Continuity Requirements & Geography:</label>
                <input
                  type="text"
                  value={shot.continuityRequirements || (shot.continuityNotes && shot.continuityNotes[0]) || ''}
                  onChange={(e) => updateStage3Shot(shot.shotId, { continuityRequirements: e.target.value })}
                  placeholder="e.g. Eyeline must match Shot 02, protagonist holds device in left hand"
                  className="w-full bg-[#0B1017] border border-[#1C2735] rounded px-2 py-1 text-[10px] text-[#D7DCE2] focus:border-[#00AFFF] focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center text-[9px] text-[#55606E] pt-1">
                <span>Edits save automatically to project</span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="text-[#00AFFF] hover:text-white flex items-center space-x-1 cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  <span>{copiedPrompt ? 'Copied Formatted' : `Copy ${selectedEngine} Prompt`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Continuity Notes Mini-Pill */}
          {(shot.continuityRequirements || (shot.continuityNotes && shot.continuityNotes.length > 0)) && !showPromptDetails && (
            <div className="flex items-center space-x-1 text-[9px] text-[#657283] truncate">
              <span className="font-semibold text-[#8A96A6]">Continuity:</span>
              <span className="truncate">{shot.continuityRequirements || shot.continuityNotes[0]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
