import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Check,
  Copy,
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Film,
  ArrowRight,
  Image as ImageIcon,
  Upload,
  Trash2,
  Maximize2,
  Loader2,
  User,
  MapPin,
  Box,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { CinematicShot } from '../../types/filmStudio';
import { ImagePreviewModal } from './ImagePreviewModal';
import { apiGenerateShotImage } from '../../services/api';

export const FlowRoutingTab: React.FC = () => {
  const {
    project,
    updateStage3Shot,
    attachImageToShot,
    removeImageFromShot,
  } = useProject();
  const shots = project.stage3.shots || [];
  const assets = project.stage2.assets || [];

  const [routeFilter, setRouteFilter] = useState<'ALL' | 'INGREDIENTS' | 'FRAMES'>('ALL');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [generatingImageShotId, setGeneratingImageShotId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    prompt?: string;
  } | null>(null);

  const ingredientsCount = shots.filter((s) => s.flowMode === 'INGREDIENTS').length;
  const framesCount = shots.filter((s) => s.flowMode === 'FRAMES').length;

  const filteredShots = shots.filter((s) => {
    if (routeFilter === 'ALL') return true;
    return s.flowMode === routeFilter;
  });

  const handleToggleRoute = (shot: CinematicShot) => {
    const nextMode: 'INGREDIENTS' | 'FRAMES' =
      shot.flowMode === 'INGREDIENTS' ? 'FRAMES' : 'INGREDIENTS';

    let firstFramePrompt = shot.firstFramePrompt;
    if (nextMode === 'FRAMES' && (!firstFramePrompt || !firstFramePrompt.trim())) {
      firstFramePrompt = `${project.visualStyle.name} opening still keyframe for shot ${shot.shotId}: ${shot.shotSize} framing of ${shot.characterIds.join(', ')} in ${shot.locationId}. Lighting: ${shot.lightingAndAtmosphere}. Lens: ${shot.lensIntent || '35mm anamorphic'}. Staging: ${shot.blockingAndMovement}.`;
    }

    updateStage3Shot(shot.shotId, {
      flowMode: nextMode,
      routeManualOverride: true,
      firstFramePrompt,
      routingReason: `Manual override by user: Set to ${nextMode}.`,
    });
  };

  const handleCopyPrompt = (shotId: string, promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPromptId(shotId);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const handleGenerateShotImage = async (shot: CinematicShot) => {
    const promptToUse =
      shot.firstFramePrompt ||
      `${project.visualStyle.name} opening keyframe for shot ${shot.shotId}: ${shot.shotSize} of ${shot.characterIds.join(', ')} at ${shot.locationId}. Lighting: ${shot.lightingAndAtmosphere}. Lens: ${shot.lensIntent || '35mm anamorphic'}. Staging: ${shot.blockingAndMovement}.`;

    setGeneratingImageShotId(shot.shotId);
    try {
      const res = await apiGenerateShotImage({
        prompt: promptToUse,
        aspectRatio: '16:9',
        shotId: shot.shotId,
      });
      if (res.success && res.imageData) {
        attachImageToShot(shot.shotId, res.imageData, `${shot.shotId}-first-frame.png`);
        if (!shot.firstFramePrompt) {
          updateStage3Shot(shot.shotId, { firstFramePrompt: promptToUse });
        }
      }
    } catch (err) {
      console.error('Failed to generate shot image:', err);
    } finally {
      setGeneratingImageShotId(null);
    }
  };

  const handleShotImageUpload = (shotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        attachImageToShot(shotId, reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  if (shots.length === 0) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF] mx-auto">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="font-['Exo_2'] font-bold text-lg text-white">
          No Planned Shots to Route
        </h3>
        <p className="text-xs text-[#79838E] max-w-md mx-auto">
          Generate your Script & Shot Plan first in the Scenes & Script tab to enable Google Flow routing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Educational Header: INGREDIENTS vs FRAMES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-[#0B1017] border border-[#00AFFF]/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-['Exo_2'] font-bold text-white text-sm flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00AFFF]" />
              <span>INGREDIENTS ROUTE</span>
            </span>
            <span className="font-mono text-xs text-[#00AFFF] font-bold">
              {ingredientsCount} Shots
            </span>
          </div>
          <p className="text-[11px] text-[#79838E] leading-relaxed">
            Chosen when repeatable character identity, wardrobe, location, or prop continuity matters most, and opening pose can be flexible. Stage 3 provides a verified Stage 2 asset reference checklist.
          </p>
          <div className="text-[10px] text-[#00AFFF] font-mono bg-[#00AFFF]/10 p-2 rounded border border-[#00AFFF]/20">
            Status: ASSET PROMPTS AVAILABLE — IMAGES PENDING
          </div>
        </div>

        <div className="bg-[#0B1017] border border-amber-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-['Exo_2'] font-bold text-white text-sm flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F4A62A]" />
              <span>FRAMES ROUTE</span>
            </span>
            <span className="font-mono text-xs text-[#F4A62A] font-bold">
              {framesCount} Shots
            </span>
          </div>
          <p className="text-[11px] text-[#79838E] leading-relaxed">
            Chosen when precise initial composition, opening body pose, matching previous exit frame, or transformation endpoint is essential. Stage 3 synthesizes a copy-paste ready First Frame Image Prompt.
          </p>
          <div className="text-[10px] text-[#F4A62A] font-mono bg-amber-500/10 p-2 rounded border border-amber-500/20">
            Status: PROMPT READY — IMAGE PENDING
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-[#79838E] text-[11px]">Show Route:</span>
        {(['ALL', 'INGREDIENTS', 'FRAMES'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setRouteFilter(mode)}
            className={`px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
              routeFilter === mode
                ? 'bg-[#00AFFF] text-white font-bold shadow-md shadow-[#00AFFF]/20'
                : 'bg-[#111820] text-[#79838E] hover:text-white border border-[#1C2735]'
            }`}
          >
            {mode} ({mode === 'ALL' ? shots.length : mode === 'INGREDIENTS' ? ingredientsCount : framesCount})
          </button>
        ))}
      </div>

      {/* Routing Cards List */}
      <div className="space-y-3">
        {filteredShots.map((shot) => {
          const isFrames = shot.flowMode === 'FRAMES';
          const isCopied = copiedPromptId === shot.shotId;

          // Find mapped assets
          const mappedAssets = assets.filter((a) =>
            shot.characterIds.includes(a.id) ||
            shot.propIds?.includes(a.id) ||
            a.id === shot.locationId
          );

          return (
            <div
              key={shot.shotId}
              className={`bg-[#0B1017] border rounded-xl p-4 transition-all space-y-3 ${
                isFrames
                  ? 'border-amber-500/30 hover:border-amber-500/50'
                  : 'border-[#00AFFF]/30 hover:border-[#00AFFF]/50'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C2735] pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-sm font-bold text-white">
                    {shot.shotId}
                  </span>
                  <span className="text-xs text-[#79838E]">
                    (Scene {shot.sceneId})
                  </span>
                  <span className="font-mono text-xs bg-[#111820] text-white px-2 py-0.5 rounded border border-[#1C2735]">
                    {shot.duration}s
                  </span>
                  <span className="text-xs text-[#D7DCE2] font-semibold">
                    {shot.shotSize} • {shot.cameraMovement}
                  </span>
                </div>

                {/* Route Selector with Manual Override Indicator */}
                <div className="flex items-center space-x-2">
                  {shot.routeManualOverride && (
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950/40 border border-purple-500/30 px-1.5 py-0.5 rounded">
                      MANUAL OVERRIDE
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleRoute(shot)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                      isFrames
                        ? 'bg-[#F4A62A]/20 text-[#F4A62A] border-[#F4A62A]/40 hover:bg-[#F4A62A]/30'
                        : 'bg-[#00AFFF]/20 text-[#00AFFF] border-[#00AFFF]/40 hover:bg-[#00AFFF]/30'
                    }`}
                  >
                    <span>{shot.flowMode}</span>
                    <span className="text-[10px] text-[#79838E]">(Click to Switch)</span>
                  </button>
                </div>
              </div>

              {/* Purpose & Reasoning */}
              <div className="text-xs space-y-1">
                <div className="text-white font-medium">{shot.purpose}</div>
                <div className="text-[11px] text-[#79838E] flex items-center space-x-1">
                  <Info className="w-3 h-3 text-[#00AFFF] shrink-0" />
                  <span><strong>Routing Rationale:</strong> {shot.routingReason}</span>
                </div>
              </div>

              {/* Mode-Specific Body */}
              {isFrames ? (
                <div className="bg-[#14120B] border border-amber-500/30 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono uppercase text-[#F4A62A] font-bold flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>First Frame Image Keyframe</span>
                      </span>
                      {shot.firstFrameImageData ? (
                        <span className="text-[9px] font-mono font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded">
                          IMAGE READY
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold bg-amber-950/70 text-[#F4A62A] border border-amber-500/40 px-2 py-0.5 rounded">
                          IMAGE PENDING
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateShotImage(shot)}
                        disabled={generatingImageShotId === shot.shotId}
                        className="px-2.5 py-1 rounded bg-[#F4A62A]/20 hover:bg-[#F4A62A]/30 text-[#F4A62A] text-xs font-semibold flex items-center space-x-1.5 border border-amber-500/40 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {generatingImageShotId === shot.shotId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        <span>{generatingImageShotId === shot.shotId ? 'Generating...' : shot.firstFrameImageData ? 'Regen AI Image' : 'Generate AI Image'}</span>
                      </button>

                      <label className="px-2.5 py-1 rounded bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer">
                        <Upload className="w-3 h-3 text-[#00AFFF]" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleShotImageUpload(shot.shotId, e)}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={() => handleCopyPrompt(shot.shotId, shot.firstFramePrompt || '')}
                        className="px-2.5 py-1 rounded bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-xs font-semibold flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>

                      {shot.firstFrameImageData && (
                        <button
                          type="button"
                          onClick={() => removeImageFromShot(shot.shotId)}
                          className="p-1 text-[#79838E] hover:text-red-400 transition-colors cursor-pointer"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Image Preview Box */}
                  {shot.firstFrameImageData && (
                    <div
                      onClick={() =>
                        setPreviewImage({
                          url: shot.firstFrameImageData!,
                          title: `Shot ${shot.shotId} — First Frame Keyframe`,
                          subtitle: `Scene ${shot.sceneId} • ${shot.duration}s • FRAMES Mode`,
                          prompt: shot.firstFramePrompt || undefined,
                        })
                      }
                      className="relative rounded-lg overflow-hidden border border-amber-500/30 max-h-52 bg-[#070B10] group cursor-pointer"
                    >
                      <img
                        src={shot.firstFrameImageData}
                        alt={`Shot ${shot.shotId} Keyframe`}
                        className="w-full h-40 object-cover object-center group-hover:scale-[1.01] transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-[#0B1017]/90 px-3 py-1.5 rounded-lg text-white font-semibold text-xs flex items-center space-x-1.5 border border-[#1C2735] shadow-lg">
                          <Maximize2 className="w-3.5 h-3.5 text-[#00AFFF]" />
                          <span>Click to Expand View</span>
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="bg-[#070B10] p-2.5 rounded border border-amber-500/20 font-mono text-[11px] text-[#D7DCE2] leading-relaxed select-text">
                    {shot.firstFramePrompt || 'No prompt generated. Click to synthesize.'}
                  </div>
                </div>
              ) : (
                <div className="bg-[#090D13] border border-[#00AFFF]/20 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#00AFFF] font-bold">
                      Stage 2 Asset Reference Checklist ({mappedAssets.length})
                    </span>
                    <span className="text-[10px] text-[#79838E]">
                      {mappedAssets.filter((a) => a.optionalReferenceImageData).length}/{mappedAssets.length} Images Attached
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {mappedAssets.map((asset) => {
                      const hasImage = Boolean(asset.optionalReferenceImageData);
                      return (
                        <div
                          key={asset.id}
                          onClick={() => {
                            if (hasImage) {
                              setPreviewImage({
                                url: asset.optionalReferenceImageData!,
                                title: asset.name,
                                subtitle: `${asset.id} • ${asset.type}`,
                                prompt: asset.referencePrompt,
                              });
                            }
                          }}
                          className={`bg-[#111820] border p-2.5 rounded-lg text-xs flex items-center justify-between transition-all ${
                            hasImage
                              ? 'border-[#00AFFF]/30 hover:border-[#00AFFF]/60 hover:bg-[#15202D] cursor-pointer'
                              : 'border-[#1C2735]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate mr-2">
                            {hasImage ? (
                              <img
                                src={asset.optionalReferenceImageData}
                                alt={asset.name}
                                className="w-7 h-7 rounded object-cover border border-[#00AFFF]/40 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#79838E] shrink-0">
                                {asset.type === 'CHARACTER' ? (
                                  <User className="w-3.5 h-3.5 text-[#00AFFF]" />
                                ) : asset.type === 'LOCATION' ? (
                                  <MapPin className="w-3.5 h-3.5 text-purple-400" />
                                ) : (
                                  <Box className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                              </div>
                            )}
                            <div className="truncate min-w-0">
                              <span className="font-mono text-[10px] text-[#00AFFF] block leading-tight">
                                {asset.id}
                              </span>
                              <span className="text-white text-[11px] font-medium truncate block leading-tight">
                                {asset.name}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                              hasImage
                                ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
                                : 'bg-[#141C26] text-[#79838E] border-[#1C2735]'
                            }`}
                          >
                            {hasImage ? 'IMAGE READY' : 'PROMPT READY'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-[#79838E] flex items-center space-x-1 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00AFFF]" />
                    <span>Stage 2 assets establish character, wardrobe, location, and prop continuity anchors.</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Image Preview Lightbox Modal */}
      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || null}
        title={previewImage?.title || 'Keyframe Preview'}
        subtitle={previewImage?.subtitle}
        promptText={previewImage?.prompt}
      />
    </div>
  );
};
