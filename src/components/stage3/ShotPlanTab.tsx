import React, { useState } from 'react';
import {
  Camera,
  Clock,
  Layers,
  Sparkles,
  Edit3,
  Scissors,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Box,
  Shirt,
  Compass,
  Sun,
  Eye,
  ArrowRight,
  Filter,
  Image as ImageIcon,
  Upload,
  Trash2,
  Maximize2,
  Loader2,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { CinematicShot, ShotDuration } from '../../types/filmStudio';
import { EditShotModal } from './EditShotModal';
import { SplitShotModal } from './SplitShotModal';
import { RegenerateShotModal } from './RegenerateShotModal';
import { ImagePreviewModal } from './ImagePreviewModal';
import { apiRegenerateShot, apiGenerateShotImage } from '../../services/api';

interface ShotPlanTabProps {
  onOpenPipeline: () => void;
}

export const ShotPlanTab: React.FC<ShotPlanTabProps> = ({ onOpenPipeline }) => {
  const {
    project,
    updateStage3Shot,
    setStage3Shots,
    attachImageToShot,
    removeImageFromShot,
  } = useProject();
  const shots = project.stage3.shots || [];
  const scenes = project.stage3.scenes || [];
  const assets = project.stage2.assets || [];
  const maxShotDuration = project.stage3.settings?.maxShotDuration || 10;

  const [selectedSceneFilter, setSelectedSceneFilter] = useState<string>('ALL');
  const [expandedShotId, setExpandedShotId] = useState<string | null>(shots[0]?.shotId || null);
  const [editingShot, setEditingShot] = useState<CinematicShot | null>(null);
  const [splittingShot, setSplittingShot] = useState<CinematicShot | null>(null);
  const [regeneratingShot, setRegeneratingShot] = useState<CinematicShot | null>(null);
  const [copiedShotId, setCopiedShotId] = useState<string | null>(null);
  const [generatingImageShotId, setGeneratingImageShotId] = useState<string | null>(null);
  const [imageGenFailure, setImageGenFailure] = useState<{
    shotId: string;
    prompt: string;
    error: string;
  } | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    prompt?: string;
  } | null>(null);

  const filteredShots = shots.filter((s) => {
    if (selectedSceneFilter === 'ALL') return true;
    return s.sceneId === selectedSceneFilter;
  });

  const totalRuntime = shots.reduce((acc, s) => acc + s.duration, 0);
  const dur6Count = shots.filter((s) => s.duration === 6).length;
  const dur8Count = shots.filter((s) => s.duration === 8).length;
  const dur10Count = shots.filter((s) => s.duration === 10).length;

  const handleCopyShot = (shot: CinematicShot) => {
    const text = `SHOT ${shot.shotId} (Scene ${shot.sceneId}) [${shot.duration}s - ${shot.flowMode}]\nPurpose: ${shot.purpose}\nCamera: ${shot.shotSize} | ${shot.cameraAngle} | ${shot.cameraMovement} (${shot.lensIntent || 'Standard lens'})\nBlocking: ${shot.blockingAndMovement}\nLighting: ${shot.lightingAndAtmosphere}\nAssets: ${shot.characterIds.join(', ')} | Location: ${shot.locationId}${shot.firstFramePrompt ? `\nFirst Frame Prompt: ${shot.firstFramePrompt}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedShotId(shot.shotId);
    setTimeout(() => setCopiedShotId(null), 2000);
  };

  const handleSplitConfirm = (shotA: CinematicShot, shotB: CinematicShot) => {
    const index = shots.findIndex((s) => s.shotId === splittingShot?.shotId);
    if (index === -1) return;
    const nextShots = [...shots];
    nextShots.splice(index, 1, shotA, shotB);
    // re-order
    const reordered = nextShots.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStage3Shots(reordered);
    setSplittingShot(null);
  };

  const handleRegenerateWithGuidance = async (guidance: string) => {
    if (!regeneratingShot) return;
    const scene = scenes.find((s) => s.sceneId === regeneratingShot.sceneId);
    const res = await apiRegenerateShot({
      shot: regeneratingShot,
      scene,
      styleBible: project.stage2.styleBible,
      stage2Assets: project.stage2.assets,
      guidance,
    });
    if (res.success && res.shot) {
      updateStage3Shot(regeneratingShot.shotId, res.shot);
    }
  };

  const handleGenerateShotImage = async (shot: CinematicShot) => {
    const promptToUse =
      shot.firstFramePrompt ||
      `${project.visualStyle.name} opening keyframe for shot ${shot.shotId}: ${shot.shotSize} of ${shot.characterIds.join(', ')} at ${shot.locationId}. Lighting: ${shot.lightingAndAtmosphere}. Lens: ${shot.lensIntent || '35mm anamorphic'}. Staging: ${shot.blockingAndMovement}.`;

    // Map project settings aspect ratio, never hardcode 16:9
    const rawAspect = project.settings?.aspectRatio || '16:9';
    const supportedAspects = ['16:9', '9:16', '1:1', '4:3', '3:4'];
    const validAspect = supportedAspects.includes(rawAspect)
      ? (rawAspect as '16:9' | '9:16' | '1:1' | '4:3' | '3:4')
      : '16:9';

    setImageGenFailure(null);
    setGeneratingImageShotId(shot.shotId);
    try {
      const res = await apiGenerateShotImage({
        prompt: promptToUse,
        aspectRatio: validAspect,
        shotId: shot.shotId,
      });
      if (res.success && res.imageData) {
        attachImageToShot(shot.shotId, res.imageData, `${shot.shotId}-first-frame.png`);
        if (!shot.firstFramePrompt) {
          updateStage3Shot(shot.shotId, { firstFramePrompt: promptToUse });
        }
      } else {
        // Truthful failure reporting without synthetic fake images
        setImageGenFailure({
          shotId: shot.shotId,
          prompt: promptToUse,
          error: res.error || 'Gemini image generation model unavailable.',
        });
      }
    } catch (err: any) {
      console.error('Failed to generate shot image:', err);
      setImageGenFailure({
        shotId: shot.shotId,
        prompt: promptToUse,
        error: err?.message || 'Failed to reach image generation service.',
      });
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
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 md:p-12 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF] mx-auto shadow-lg shadow-[#00AFFF]/10">
          <Camera className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-lg mx-auto">
          <h3 className="font-['Exo_2'] font-bold text-xl text-white">
            Visual Shot Plan Not Generated Yet
          </h3>
          <p className="text-xs text-[#79838E] leading-relaxed">
            Decompose your screenplay scenes into continuous, purposeful video shots adhering strictly to modular durations of 6, 8, or 10 seconds.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onOpenPipeline}
            className="px-6 py-2.5 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#00AFFF]/20 flex items-center space-x-2 mx-auto cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Shot Plan</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Duration Standard Banner & Metrics */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#00AFFF]/10 border border-[#00AFFF]/30 flex items-center justify-center text-[#00AFFF]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-['Exo_2'] font-bold text-white text-sm">
                  Strict 6s / 8s / 10s Shot Duration Standard
                </span>
                <span className="text-[10px] font-mono font-bold bg-[#00AFFF]/20 text-[#00AFFF] px-2 py-0.5 rounded">
                  MAX {maxShotDuration}s PER SHOT
                </span>
              </div>
              <p className="text-[11px] text-[#79838E]">
                Total Planned Runtime: <strong className="text-white font-mono">{totalRuntime}s</strong> across <strong className="text-white font-mono">{shots.length}</strong> shots.
              </p>
            </div>
          </div>

          {/* Duration Breakdown Pills */}
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="bg-[#111820] border border-[#1C2735] px-2.5 py-1 rounded-lg text-[#00AFFF] flex items-center space-x-1">
              <strong>{dur6Count}</strong> <span className="text-[10px] text-[#79838E]">× 6s</span>
            </span>
            <span className="bg-[#111820] border border-[#1C2735] px-2.5 py-1 rounded-lg text-[#F4A62A] flex items-center space-x-1">
              <strong>{dur8Count}</strong> <span className="text-[10px] text-[#79838E]">× 8s</span>
            </span>
            <span className="bg-[#111820] border border-[#1C2735] px-2.5 py-1 rounded-lg text-purple-400 flex items-center space-x-1">
              <strong>{dur10Count}</strong> <span className="text-[10px] text-[#79838E]">× 10s</span>
            </span>
          </div>
        </div>

        {/* Scene Filter Row */}
        <div className="flex items-center space-x-2 border-t border-[#1C2735] pt-3 overflow-x-auto text-xs">
          <span className="text-[#79838E] text-[11px] flex items-center space-x-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>Filter Scene:</span>
          </span>
          <button
            onClick={() => setSelectedSceneFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
              selectedSceneFilter === 'ALL'
                ? 'bg-[#00AFFF] text-white font-bold'
                : 'bg-[#111820] text-[#79838E] hover:text-white border border-[#1C2735]'
            }`}
          >
            All Shots ({shots.length})
          </button>
          {scenes.map((sc) => (
            <button
              key={sc.sceneId}
              onClick={() => setSelectedSceneFilter(sc.sceneId)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                selectedSceneFilter === sc.sceneId
                  ? 'bg-[#00AFFF] text-white font-bold'
                  : 'bg-[#111820] text-[#79838E] hover:text-white border border-[#1C2735]'
              }`}
            >
              {sc.sceneId} ({shots.filter((s) => s.sceneId === sc.sceneId).length})
            </button>
          ))}
        </div>
      </div>

      {/* Shots List */}
      <div className="space-y-3">
        {filteredShots.map((shot) => {
          const isExpanded = expandedShotId === shot.shotId;
          const durationColor =
            shot.duration === 6
              ? 'text-[#00AFFF] bg-[#00AFFF]/10 border-[#00AFFF]/30'
              : shot.duration === 8
              ? 'text-[#F4A62A] bg-[#F4A62A]/10 border-[#F4A62A]/30'
              : 'text-purple-400 bg-purple-500/10 border-purple-500/30';

          const routeColor =
            shot.flowMode === 'INGREDIENTS'
              ? 'text-[#00AFFF] bg-[#00AFFF]/10 border-[#00AFFF]/30'
              : 'text-[#F4A62A] bg-[#F4A62A]/10 border-[#F4A62A]/30';

          return (
            <div
              key={shot.shotId}
              className={`bg-[#0B1017] border rounded-xl transition-all overflow-hidden ${
                isExpanded
                  ? 'border-[#00AFFF]/40 shadow-lg shadow-[#00AFFF]/5'
                  : 'border-[#1C2735] hover:border-[#2A3B4F]'
              }`}
            >
              {/* Shot Card Header */}
              <div
                onClick={() => setExpandedShotId(isExpanded ? null : shot.shotId)}
                className="p-3.5 md:p-4 flex items-center justify-between cursor-pointer select-none bg-[#0E1520] hover:bg-[#111824] transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-white font-mono font-bold text-xs shrink-0">
                    #{shot.order}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-mono text-xs font-bold text-white">
                        {shot.shotId}
                      </span>
                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${durationColor}`}>
                        {shot.duration}s
                      </span>
                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${routeColor}`}>
                        {shot.flowMode}
                      </span>
                      <span className="text-[10px] font-mono text-[#79838E] bg-[#141C26] px-1.5 py-0.5 rounded">
                        Scene {shot.sceneId}
                      </span>
                    </div>
                    <div className="text-xs text-[#D7DCE2] font-medium truncate max-w-md mt-1">
                      {shot.purpose}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 ml-3">
                  <div className="text-right hidden sm:block text-xs">
                    <div className="text-white font-semibold">
                      {shot.shotSize} • {shot.cameraMovement}
                    </div>
                    <div className="text-[10px] text-[#79838E] font-mono">
                      {shot.locationId}
                    </div>
                  </div>
                  <div className="text-[#79838E]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Card Details */}
              {isExpanded && (
                <div className="p-4 md:p-5 border-t border-[#1C2735] space-y-4 text-xs">
                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingShot(shot)}
                        className="px-2.5 py-1 rounded bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-[#00AFFF]" />
                        <span>Edit Shot</span>
                      </button>
                      <button
                        onClick={() => handleCopyShot(shot)}
                        className="px-2.5 py-1 rounded bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer"
                      >
                        {copiedShotId === shot.shotId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedShotId === shot.shotId ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => setSplittingShot(shot)}
                        className="px-2.5 py-1 rounded bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer"
                      >
                        <Scissors className="w-3 h-3 text-[#F4A62A]" />
                        <span>Split Shot</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setRegeneratingShot(shot)}
                      className="px-2.5 py-1 rounded bg-[#00AFFF]/10 hover:bg-[#00AFFF]/20 text-[#00AFFF] text-xs font-semibold flex items-center space-x-1 border border-[#00AFFF]/30 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Regenerate This Shot</span>
                    </button>
                  </div>

                  {/* Cinematography Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-[#111820] border border-[#1C2735] p-3 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#79838E] flex items-center space-x-1">
                        <Camera className="w-3 h-3 text-[#00AFFF]" />
                        <span>Camera & Optics</span>
                      </span>
                      <div className="text-white font-semibold">
                        {shot.shotSize} • {shot.cameraAngle}
                      </div>
                      <div className="text-[11px] text-[#79838E]">
                        <strong>Movement:</strong> {shot.cameraMovement}
                      </div>
                      <div className="text-[11px] text-[#79838E]">
                        <strong>Lens:</strong> {shot.lensIntent || 'Standard lens'}
                      </div>
                    </div>

                    <div className="bg-[#111820] border border-[#1C2735] p-3 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#79838E] flex items-center space-x-1">
                        <Sun className="w-3 h-3 text-[#F4A62A]" />
                        <span>Lighting & Atmosphere</span>
                      </span>
                      <p className="text-[11px] text-[#D7DCE2] leading-relaxed">
                        {shot.lightingAndAtmosphere}
                      </p>
                    </div>

                    <div className="bg-[#111820] border border-[#1C2735] p-3 rounded-lg space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-[#79838E] flex items-center space-x-1">
                        <User className="w-3 h-3 text-emerald-400" />
                        <span>Linked Stage 2 Assets & Continuity</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {shot.characterIds.map((cId) => {
                          const assetObj = assets.find((a) => a.id === cId);
                          return (
                            <button
                              key={cId}
                              type="button"
                              onClick={() => {
                                if (assetObj?.optionalReferenceImageData) {
                                  setPreviewImage({
                                    url: assetObj.optionalReferenceImageData,
                                    title: assetObj.name,
                                    subtitle: `${assetObj.id} • ${assetObj.type}`,
                                    prompt: assetObj.referencePrompt,
                                  });
                                }
                              }}
                              className={`font-mono text-[10px] px-2 py-1 rounded flex items-center space-x-1.5 border transition-all ${
                                assetObj?.optionalReferenceImageData
                                  ? 'bg-[#141C26] hover:bg-[#1A2534] border-[#00AFFF]/40 text-[#00AFFF] cursor-pointer'
                                  : 'bg-[#141C26] border-[#1C2735] text-[#00AFFF]'
                              }`}
                              title={assetObj ? `${assetObj.name} (Click to view reference)` : cId}
                            >
                              {assetObj?.optionalReferenceImageData ? (
                                <img
                                  src={assetObj.optionalReferenceImageData}
                                  alt={assetObj.name}
                                  className="w-3.5 h-3.5 rounded-full object-cover border border-[#00AFFF]/50"
                                />
                              ) : (
                                <User className="w-3 h-3 text-[#00AFFF]/70" />
                              )}
                              <span>{cId}</span>
                            </button>
                          );
                        })}
                        {/* Location */}
                        {(() => {
                          const locObj = assets.find((a) => a.id === shot.locationId);
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                if (locObj?.optionalReferenceImageData) {
                                  setPreviewImage({
                                    url: locObj.optionalReferenceImageData,
                                    title: locObj.name,
                                    subtitle: `${locObj.id} • LOCATION`,
                                    prompt: locObj.referencePrompt,
                                  });
                                }
                              }}
                              className={`font-mono text-[10px] px-2 py-1 rounded flex items-center space-x-1.5 border transition-all ${
                                locObj?.optionalReferenceImageData
                                  ? 'bg-[#141C26] hover:bg-[#1A2534] border-purple-500/40 text-purple-400 cursor-pointer'
                                  : 'bg-[#141C26] border-[#1C2735] text-purple-400'
                              }`}
                              title={locObj ? `${locObj.name} (Click to view reference)` : shot.locationId}
                            >
                              {locObj?.optionalReferenceImageData ? (
                                <img
                                  src={locObj.optionalReferenceImageData}
                                  alt={locObj.name}
                                  className="w-3.5 h-3.5 rounded object-cover border border-purple-500/50"
                                />
                              ) : (
                                <MapPin className="w-3 h-3 text-purple-400/70" />
                              )}
                              <span>{shot.locationId}</span>
                            </button>
                          );
                        })()}
                        {/* Props */}
                        {shot.propIds?.map((pId) => {
                          const propObj = assets.find((a) => a.id === pId);
                          return (
                            <button
                              key={pId}
                              type="button"
                              onClick={() => {
                                if (propObj?.optionalReferenceImageData) {
                                  setPreviewImage({
                                    url: propObj.optionalReferenceImageData,
                                    title: propObj.name,
                                    subtitle: `${propObj.id} • PROP`,
                                    prompt: propObj.referencePrompt,
                                  });
                                }
                              }}
                              className={`font-mono text-[10px] px-2 py-1 rounded flex items-center space-x-1.5 border transition-all ${
                                propObj?.optionalReferenceImageData
                                  ? 'bg-[#141C26] hover:bg-[#1A2534] border-emerald-500/40 text-emerald-400 cursor-pointer'
                                  : 'bg-[#141C26] border-[#1C2735] text-emerald-400'
                              }`}
                              title={propObj ? `${propObj.name} (Click to view reference)` : pId}
                            >
                              {propObj?.optionalReferenceImageData ? (
                                <img
                                  src={propObj.optionalReferenceImageData}
                                  alt={propObj.name}
                                  className="w-3.5 h-3.5 rounded object-cover border border-emerald-500/50"
                                />
                              ) : (
                                <Box className="w-3 h-3 text-emerald-400/70" />
                              )}
                              <span>{pId}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Staging, Eyeline & Performance */}
                  <div className="bg-[#111820] border border-[#1C2735] p-3.5 rounded-lg space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[#79838E]">
                      Physical Staging, Blocking & Eyeline
                    </span>
                    <p className="text-white text-xs leading-relaxed">
                      {shot.blockingAndMovement}
                    </p>
                    {shot.performanceNotes && (
                      <div className="text-[11px] text-[#79838E] italic">
                        <strong>Performance Directive:</strong> {shot.performanceNotes}
                      </div>
                    )}
                  </div>

                  {/* Entry & Exit Visual Continuity Chain */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <div className="bg-[#090D13] border border-[#1C2735] p-2.5 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-[#79838E] block mb-1">
                        Entry Visual State
                      </span>
                      <span className="text-[#D7DCE2]">{shot.entryVisualState || 'Initial framing cut'}</span>
                    </div>
                    <div className="bg-[#090D13] border border-[#1C2735] p-2.5 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-[#79838E] block mb-1">
                        Exit Visual State
                      </span>
                      <span className="text-[#D7DCE2]">{shot.exitVisualState || 'Trailing frame resolution'}</span>
                    </div>
                  </div>

                  {/* First Frame Keyframe Section (FRAMES route or whenever first frame data exists) */}
                  {(shot.flowMode === 'FRAMES' || shot.firstFrameImageData || shot.firstFramePrompt) && (
                    <div className="bg-[#14120B] border border-amber-500/30 p-3.5 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono uppercase text-[#F4A62A] font-bold flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Google Flow First-Frame Keyframe</span>
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

                        {/* Image Action Controls */}
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

                      {/* Image Gen Failure Informative Fallback Banner */}
                      {imageGenFailure?.shotId === shot.shotId && (
                        <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-3 text-xs space-y-2">
                          <div className="flex items-center justify-between text-amber-300 font-bold">
                            <span>AI Image Generation Model Output Unavailable</span>
                            <button
                              type="button"
                              onClick={() => setImageGenFailure(null)}
                              className="text-[#79838E] hover:text-white cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="text-[#D7DCE2] text-[11px] leading-relaxed">
                            {imageGenFailure.error} To preserve truthful keyframes without synthetic placeholders, copy the prompt to generate in Midjourney, Flux, or Imagen and upload below.
                          </p>
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(imageGenFailure.prompt);
                                setCopiedShotId(`prompt_${shot.shotId}`);
                                setTimeout(() => setCopiedShotId(null), 2000);
                              }}
                              className="px-2.5 py-1 bg-[#141C26] hover:bg-[#1C2735] text-[#00AFFF] rounded border border-[#00AFFF]/40 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                            >
                              {copiedShotId === `prompt_${shot.shotId}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>
                                {copiedShotId === `prompt_${shot.shotId}` ? 'Copied Prompt' : 'Copy Prompt'}
                              </span>
                            </button>
                            <label className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 rounded border border-amber-500/40 text-xs font-semibold flex items-center space-x-1 cursor-pointer">
                              <Upload className="w-3 h-3" />
                              <span>Upload Keyframe</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  handleShotImageUpload(shot.shotId, e);
                                  setImageGenFailure(null);
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      )}

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
                          className="relative rounded-lg overflow-hidden border border-amber-500/30 max-h-56 bg-[#070B10] group cursor-pointer"
                        >
                          <img
                            src={shot.firstFrameImageData}
                            alt={`Shot ${shot.shotId} First Frame`}
                            className="w-full h-44 object-cover object-center group-hover:scale-[1.01] transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                            <span className="bg-[#0B1017]/90 px-3 py-1.5 rounded-lg text-white font-semibold text-xs flex items-center space-x-1.5 border border-[#1C2735] shadow-lg">
                              <Maximize2 className="w-3.5 h-3.5 text-[#00AFFF]" />
                              <span>Click to Expand View</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Prompt Display */}
                      {shot.firstFramePrompt && (
                        <div className="bg-[#070B10] p-2.5 rounded border border-amber-500/20 font-mono text-[11px] text-[#F4A62A] select-text leading-relaxed">
                          {shot.firstFramePrompt}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Shot Modal */}
      {editingShot && (
        <EditShotModal
          shot={editingShot}
          maxAllowedDuration={maxShotDuration}
          isOpen={true}
          onClose={() => setEditingShot(null)}
          onSave={(updated) => updateStage3Shot(updated.shotId, updated)}
        />
      )}

      {/* Split Shot Modal */}
      {splittingShot && (
        <SplitShotModal
          shot={splittingShot}
          isOpen={true}
          onClose={() => setSplittingShot(null)}
          onSplit={handleSplitConfirm}
        />
      )}

      {/* Regenerate Shot Modal */}
      {regeneratingShot && (
        <RegenerateShotModal
          shot={regeneratingShot}
          isOpen={true}
          onClose={() => setRegeneratingShot(null)}
          onRegenerate={handleRegenerateWithGuidance}
        />
      )}

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
