import React, { useState } from 'react';
import {
  Copy,
  Check,
  Edit3,
  Sparkles,
  Layers,
  Film,
  Camera,
  Clock,
  Volume2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Paperclip,
  ExternalLink,
  Ban,
  Tag,
  Upload,
  Maximize2,
  X,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { GoogleFlowShotPackage, VisualAsset } from '../../types/filmStudio';

interface FlowShotCardProps {
  pkg: GoogleFlowShotPackage;
  stage2Assets: VisualAsset[];
  onEdit: (pkg: GoogleFlowShotPackage) => void;
  onRefine: (pkg: GoogleFlowShotPackage) => void;
  onToggleMediaAttached?: (shotId: string) => void;
  isCompact?: boolean;
}

export const FlowShotCard: React.FC<FlowShotCardProps> = ({
  pkg,
  stage2Assets,
  onEdit,
  onRefine,
  onToggleMediaAttached,
  isCompact = false,
}) => {
  const { project, attachImageToShot, updateStage4ShotPackage } = useProject();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedFirstFrame, setCopiedFirstFrame] = useState(false);
  const [copiedEndFrame, setCopiedEndFrame] = useState(false);
  const [copiedAssetPromptId, setCopiedAssetPromptId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!isCompact);

  const matchingShot = project.stage3.shots?.find((s) => s.shotId === pkg.shotId);
  const attachedImageUrl = pkg.firstFrameMedia?.dataUrl || matchingShot?.firstFrameImageData || matchingShot?.firstFrameMedia?.dataUrl;
  const isImageVerified = Boolean(attachedImageUrl || (pkg.firstFrameMedia?.verified && pkg.firstFrameMedia.storageRef));

  const copyToClipboard = async (text: string, setCopied: (val: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const isFrames = pkg.flowMode === 'FRAMES';
  const isIngredients = pkg.flowMode === 'INGREDIENTS';

  // Construct full copyable package text
  const generateFullPackageText = (): string => {
    const lines = [
      `==================================================`,
      `GOOGLE FLOW PRODUCTION SHOT PACKAGE: ${pkg.shotId}`,
      `Scene: ${pkg.sceneId} | Order: #${pkg.order} | Duration: ${pkg.plannedDuration}s | Route: ${pkg.flowMode}`,
      `Aspect Ratio: ${pkg.aspectRatio} | Target Model: ${pkg.targetModel} (${pkg.capabilityStatus})`,
      `Purpose: ${pkg.purpose}`,
      `--------------------------------------------------`,
      `[1. READINESS STATUS]`,
      `Text Package: ${pkg.textReadiness}`,
      `Flow Execution: ${pkg.mediaReadiness}`,
      `Complexity: ${pkg.generationComplexity}`,
      ``,
    ];

    if (isFrames && pkg.firstFramePrompt) {
      lines.push(
        `[2. FIRST FRAME IMAGE PROMPT]`,
        `Media Status: ${pkg.firstFrameMediaStatus}`,
        pkg.firstFramePrompt,
        ``
      );
      if (pkg.endFramePrompt) {
        lines.push(
          `[2B. END FRAME IMAGE PROMPT]`,
          `Media Status: ${pkg.endFrameMediaStatus}`,
          pkg.endFramePrompt,
          ``
        );
      }
    }

    if (isIngredients && pkg.referenceChecklist && pkg.referenceChecklist.length > 0) {
      lines.push(
        `[2. INGREDIENTS REFERENCE CHECKLIST]`,
        ...pkg.referenceChecklist.map(
          (ref) =>
            `- [${ref.assetId}] (${ref.assetType}) ${ref.assetName} [Role: ${ref.role}] — Media Status: ${ref.mediaStatus}`
        ),
        ``
      );
    }

    lines.push(
      `[3. FINAL VIDEO PROMPT]`,
      pkg.videoPrompt,
      ``,
      `[4. AUDIO LANES]`,
      `- Dialogue: ${pkg.audioLanes?.dialogue || 'None'}`,
      `- Narration/VO: ${pkg.audioLanes?.narrationOrVO || 'None'}`,
      `- Ambience: ${pkg.audioLanes?.ambience || 'None'}`,
      `- SFX: ${pkg.audioLanes?.sfx || 'None'}`,
      `- Music: ${pkg.audioLanes?.music || 'None'}`,
      `- Lip-Sync Required: ${pkg.audioLanes?.lipSyncRequired ? 'YES' : 'NO'}`,
      ``,
      `[5. ACTION TIMING]`,
      ...(pkg.actionTiming || []).map((t) => `- ${t.timeRange}: ${t.action}`),
      ``,
      `[6. CONTINUITY ANCHORS]`,
      `- Entry Visual State: ${pkg.continuityAnchors?.entryVisualState || 'N/A'}`,
      `- Exit Visual State: ${pkg.continuityAnchors?.exitVisualState || 'N/A'}`,
      `- Screen Direction: ${pkg.continuityAnchors?.screenDirection || 'N/A'}`,
      `- Hand / Prop State: ${pkg.continuityAnchors?.propAndHandState || 'N/A'}`,
      `- Lighting Atmosphere: ${pkg.continuityAnchors?.lightingAtmosphere || 'N/A'}`,
      `- Style Consistency: ${pkg.continuityAnchors?.styleConsistency || 'N/A'}`,
      ``,
      `[7. NEGATIVE EXCLUSIONS]`,
      ...(pkg.exclusions || []).map((ex) => `- ${ex}`),
      `==================================================`
    );

    return lines.join('\n');
  };

  return (
    <div
      id={`shot-${pkg.shotId}`}
      className={`bg-[#0B1017] border rounded-xl transition-all duration-200 overflow-hidden ${
        pkg.textReadiness === 'TEXT_BLOCKED'
          ? 'border-red-500/50 shadow-lg shadow-red-500/10'
          : pkg.mediaReadiness === 'MEDIA_PENDING'
          ? 'border-[#1C2735] hover:border-[#F4A62A]/40'
          : 'border-[#1C2735] hover:border-[#00AFFF]/40'
      }`}
    >
      {/* Header Bar */}
      <div className="bg-[#111820] border-b border-[#1C2735] p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#1C2735] text-[#00AFFF] border border-[#2E3E52]">
            {pkg.shotId}
          </span>
          <span className="font-mono text-xs text-[#79838E]">
            {pkg.sceneId} • #{pkg.order}
          </span>

          {/* Route Badge */}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1 ${
              isIngredients
                ? 'bg-amber-950/60 text-[#F4A62A] border border-[#F4A62A]/30'
                : 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            {isIngredients ? <Layers className="w-3 h-3" /> : <Film className="w-3 h-3" />}
            <span>{pkg.flowMode}</span>
          </span>

          {/* Duration Badge */}
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#141C26] text-white border border-[#1C2735] flex items-center space-x-1">
            <Clock className="w-3 h-3 text-[#00AFFF]" />
            <span>{pkg.plannedDuration}s</span>
          </span>

          {/* Aspect Ratio */}
          <span className="text-[10px] font-mono text-[#79838E] bg-[#0E141D] px-1.5 py-0.5 rounded border border-[#1C2735]">
            {pkg.aspectRatio}
          </span>
        </div>

        {/* Readiness Indicators & Action Toolbar */}
        <div className="flex items-center space-x-2">
          {/* Text Readiness Badge */}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 ${
              pkg.textReadiness === 'TEXT_READY'
                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                : pkg.textReadiness === 'TEXT_READY_WITH_WARNINGS'
                ? 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                : 'bg-red-950/70 text-red-400 border border-red-500/30'
            }`}
          >
            {pkg.textReadiness === 'TEXT_READY' ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            <span>{pkg.textReadiness.replace(/_/g, ' ')}</span>
          </span>

          {/* Media Readiness Badge */}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 ${
              pkg.mediaReadiness === 'EXECUTION_READY'
                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                : pkg.mediaReadiness === 'MEDIA_PENDING'
                ? 'bg-amber-950/60 text-[#F4A62A] border border-[#F4A62A]/30'
                : 'bg-sky-950/70 text-sky-300 border border-sky-500/30'
            }`}
          >
            <Paperclip className="w-3 h-3" />
            <span>{pkg.mediaReadiness.replace(/_/g, ' ')}</span>
          </span>

          {/* Fast Copy Prompt Button */}
          <button
            onClick={() => copyToClipboard(pkg.videoPrompt, setCopiedPrompt)}
            className="px-2.5 py-1 bg-[#141C26] hover:bg-[#1C2735] text-white text-xs font-semibold rounded border border-[#1C2735] hover:border-[#00AFFF]/50 flex items-center space-x-1 transition-all cursor-pointer"
            title="Copy Video Prompt only"
          >
            {copiedPrompt ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span>Prompt</span>
              </>
            )}
          </button>

          {/* Copy Full Shot Package */}
          <button
            onClick={() => copyToClipboard(generateFullPackageText(), setCopiedFull)}
            className="px-2.5 py-1 bg-[#141C26] hover:bg-[#1C2735] text-white text-xs font-semibold rounded border border-[#1C2735] hover:border-[#F4A62A]/50 flex items-center space-x-1 transition-all cursor-pointer"
            title="Copy entire structured package"
          >
            {copiedFull ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>Full</span>
              </>
            )}
          </button>

          {/* Edit Button */}
          <button
            onClick={() => onEdit(pkg)}
            className="p-1 bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] hover:text-[#00AFFF] rounded border border-[#1C2735] cursor-pointer"
            title="Manually edit this shot package"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Refine with Gemini */}
          <button
            onClick={() => onRefine(pkg)}
            className="p-1 bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] hover:text-[#F4A62A] rounded border border-[#1C2735] cursor-pointer"
            title="Refine video prompt with Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[#79838E] hover:text-white rounded hover:bg-[#1C2735] cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Purpose Banner */}
      <div className="px-4 py-2 bg-[#0E141D] border-b border-[#1C2735]/60 flex items-center justify-between text-xs text-[#79838E]">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-white">Shot Purpose:</span>
          <span className="italic">{pkg.purpose}</span>
        </div>
        <div className="flex items-center space-x-2 font-mono text-[10px]">
          <span>Target Model: {pkg.targetModel}</span>
          <span className="text-amber-400/90 font-bold">({pkg.capabilityStatus.replace(/_/g, ' ')})</span>
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 1. ROUTE-SPECIFIC ASSET & FRAME SECTION */}
          {isFrames && (
            <div className="bg-[#111820] border border-indigo-500/20 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300 uppercase tracking-wide">
                  <Film className="w-3.5 h-3.5" />
                  <span>Google Flow Frames Mode Directives</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 ${
                      isImageVerified
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : pkg.hasExternalImageReference
                        ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isImageVerified ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>FIRST FRAME VERIFIED</span>
                      </>
                    ) : pkg.hasExternalImageReference ? (
                      <span>EXTERNAL IMAGE NOTED</span>
                    ) : (
                      <span>FIRST FRAME PENDING</span>
                    )}
                  </span>

                  {/* Upload Keyframe Input */}
                  <label className="px-2 py-0.5 rounded bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-[10px] font-semibold flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer">
                    <Upload className="w-3 h-3 text-[#00AFFF]" />
                    <span>{attachedImageUrl ? 'Replace' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            attachImageToShot(pkg.shotId, reader.result, file.name);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* External availability informational toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      updateStage4ShotPackage(pkg.shotId, {
                        hasExternalImageReference: !pkg.hasExternalImageReference,
                      });
                    }}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      pkg.hasExternalImageReference
                        ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                        : 'bg-[#141C26] text-[#79838E] border-[#1C2735] hover:text-[#D7DCE2]'
                    }`}
                    title="Informational status: user has keyframe still externally"
                  >
                    {pkg.hasExternalImageReference ? '✓ External' : 'External?'}
                  </button>
                </div>
              </div>

              {/* Verified Image Preview Thumbnail */}
              {attachedImageUrl && (
                <div className="relative rounded-lg overflow-hidden border border-indigo-500/30 bg-[#070B10] group">
                  <img
                    src={attachedImageUrl}
                    alt={`Shot ${pkg.shotId} First Frame`}
                    className="w-full h-36 object-cover object-center group-hover:scale-[1.01] transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-black/75 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-mono border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Image Attached</span>
                  </div>
                </div>
              )}

              {/* First Frame Text Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#D7DCE2]">
                    Opening First Frame Keyframe Prompt:
                  </span>
                  {pkg.firstFramePrompt && (
                    <button
                      onClick={() =>
                        copyToClipboard(pkg.firstFramePrompt || '', setCopiedFirstFrame)
                      }
                      className="text-[#00AFFF] hover:text-white flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedFirstFrame ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy First Frame Prompt</span>
                    </button>
                  )}
                </div>
                <textarea
                  readOnly
                  value={
                    pkg.firstFramePrompt ||
                    'NO FIRST FRAME PROMPT DEFINED. A copy-ready first-frame prompt is required for FRAMES mode.'
                  }
                  rows={2}
                  className="w-full bg-[#070B10] border border-[#1C2735] rounded-lg p-2.5 text-xs text-[#D7DCE2] font-mono leading-relaxed resize-none focus:outline-none"
                />
              </div>

              {/* Optional End Frame */}
              {pkg.endFramePrompt && (
                <div className="space-y-1.5 pt-2 border-t border-[#1C2735]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#D7DCE2]">
                      Optional End Frame Keyframe Prompt:
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(pkg.endFramePrompt || '', setCopiedEndFrame)
                      }
                      className="text-[#00AFFF] hover:text-white flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedEndFrame ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy End Frame Prompt</span>
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={pkg.endFramePrompt}
                    rows={2}
                    className="w-full bg-[#070B10] border border-[#1C2735] rounded-lg p-2.5 text-xs text-[#D7DCE2] font-mono leading-relaxed resize-none focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {isIngredients && (
            <div className="bg-[#111820] border border-amber-500/20 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#F4A62A] uppercase tracking-wide">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Google Flow Ingredients Reference Checklist</span>
                </div>
                <span className="text-[10px] text-[#79838E]">
                  Attach these assets in Google Flow Ingredients tray
                </span>
              </div>

              {pkg.referenceChecklist && pkg.referenceChecklist.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {pkg.referenceChecklist.map((ref) => {
                    const matchedAsset = stage2Assets.find((a) => a.id === ref.assetId);
                    const promptToCopy = ref.referencePromptText || matchedAsset?.referencePrompt;

                    return (
                      <div
                        key={ref.assetId}
                        className="bg-[#070B10] border border-[#1C2735] rounded-lg p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-[#00AFFF]">
                            {ref.assetId}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              ref.mediaStatus === 'AVAILABLE'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {ref.mediaStatus === 'AVAILABLE' ? 'IMAGE READY' : 'IMAGE PENDING'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white truncate">
                          {ref.assetName}
                        </div>
                        <div className="text-[10px] text-[#79838E]">
                          Role: <span className="text-[#D7DCE2]">{ref.role}</span>
                        </div>

                        {promptToCopy && (
                          <button
                            onClick={() => {
                              copyToClipboard(promptToCopy, () => {});
                              setCopiedAssetPromptId(ref.assetId);
                              setTimeout(() => setCopiedAssetPromptId(null), 2000);
                            }}
                            className="w-full text-left text-[10px] text-[#00AFFF] hover:text-white flex items-center justify-between pt-1 border-t border-[#1C2735] cursor-pointer"
                          >
                            <span>
                              {copiedAssetPromptId === ref.assetId ? 'Prompt Copied!' : 'Copy Asset Image Prompt'}
                            </span>
                            {copiedAssetPromptId === ref.assetId ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-[#79838E] italic p-2 bg-[#070B10] rounded border border-[#1C2735]">
                  No specific Stage 2 asset references mapped for this shot.
                </div>
              )}
            </div>
          )}

          {/* 2. FULL FINAL VIDEO PROMPT (Primary output) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span>Final Google Flow Video Prompt</span>
              </label>
              <span className="text-[10px] text-[#79838E]">
                Includes staging, camera motion, lighting, dialogue context & continuity locks
              </span>
            </div>
            <textarea
              readOnly
              value={pkg.videoPrompt}
              rows={4}
              className="w-full bg-[#070B10] border border-[#1C2735] focus:border-[#00AFFF] rounded-xl p-3 text-xs text-[#D7DCE2] font-mono leading-relaxed resize-none focus:outline-none selection:bg-[#00AFFF]/30"
            />
          </div>

          {/* 3. AUDIO LANES & TIMING GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Audio Lanes */}
            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white border-b border-[#1C2735] pb-1.5">
                <span className="flex items-center space-x-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#00AFFF]" />
                  <span>Audio & Dialogue Breakdown</span>
                </span>
                {pkg.audioLanes?.lipSyncRequired && (
                  <span className="text-[9px] bg-red-950/80 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">
                    LIP-SYNC REQUIRED
                  </span>
                )}
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex">
                  <span className="w-24 text-[#79838E] flex-shrink-0">Dialogue:</span>
                  <span className="text-white font-sans">{pkg.audioLanes?.dialogue || 'None'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-[#79838E] flex-shrink-0">VO / Narr:</span>
                  <span className="text-[#D7DCE2] font-sans">{pkg.audioLanes?.narrationOrVO || 'None'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-[#79838E] flex-shrink-0">Ambience:</span>
                  <span className="text-[#D7DCE2] font-sans">{pkg.audioLanes?.ambience || 'None'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-[#79838E] flex-shrink-0">SFX / Foley:</span>
                  <span className="text-[#D7DCE2] font-sans">{pkg.audioLanes?.sfx || 'None'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-[#79838E] flex-shrink-0">Music:</span>
                  <span className="text-[#D7DCE2] font-sans">{pkg.audioLanes?.music || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Action Timing Beats */}
            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white border-b border-[#1C2735] pb-1.5">
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#F4A62A]" />
                  <span>Action Timeline ({pkg.plannedDuration}s Planned)</span>
                </span>
                <span className="text-[10px] text-[#79838E]">
                  {(pkg.actionTiming || []).length} Beats
                </span>
              </div>
              <div className="space-y-1.5">
                {(pkg.actionTiming || []).map((beat, bIdx) => (
                  <div key={bIdx} className="flex items-start space-x-2 text-[11px]">
                    <span className="font-mono font-bold text-[#F4A62A] bg-[#141C26] px-1.5 py-0.5 rounded flex-shrink-0">
                      {beat.timeRange}
                    </span>
                    <span className="text-[#D7DCE2]">{beat.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. CONTINUITY ANCHORS & EXCLUSIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Continuity Anchors */}
            <div className="bg-[#0E141D] border border-[#1C2735] rounded-xl p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] block">
                Continuity Anchors
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#D7DCE2]">
                <div>
                  <span className="text-[#79838E] block text-[10px]">Entry State:</span>
                  <span>{pkg.continuityAnchors?.entryVisualState || 'Standard entry cut'}</span>
                </div>
                <div>
                  <span className="text-[#79838E] block text-[10px]">Exit State:</span>
                  <span>{pkg.continuityAnchors?.exitVisualState || 'Standard exit cut'}</span>
                </div>
                <div>
                  <span className="text-[#79838E] block text-[10px]">Screen Direction:</span>
                  <span>{pkg.continuityAnchors?.screenDirection || 'Centered'}</span>
                </div>
                <div>
                  <span className="text-[#79838E] block text-[10px]">Hand & Prop State:</span>
                  <span>{pkg.continuityAnchors?.propAndHandState || 'As staged'}</span>
                </div>
              </div>
            </div>

            {/* Negative Exclusions */}
            <div className="bg-[#0E141D] border border-[#1C2735] rounded-xl p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center space-x-1">
                <Ban className="w-3 h-3" />
                <span>Negative Constraints / Exclusions</span>
              </span>
              <ul className="space-y-0.5 text-[11px] text-[#D7DCE2] list-disc list-inside">
                {(pkg.exclusions || []).map((ex, exIdx) => (
                  <li key={exIdx} className="truncate">
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
