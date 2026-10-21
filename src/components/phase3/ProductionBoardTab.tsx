import React, { useState } from 'react';
import {
  Video,
  Sparkles,
  Copy,
  Check,
  Play,
  Clock,
  Camera,
  Layers,
  ArrowRight,
  Download,
  AlertTriangle,
  CheckCircle2,
  Filter,
  User,
  MapPin,
  Sliders,
  Image as ImageIcon,
  HelpCircle,
  FileText,
  Volume2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { GoogleFlowShotPackage, CinematicShot, VisualAsset } from '../../types/filmStudio';
import {
  synthesizeSingleFlowPackage,
  buildCompleteCopyableShotPackage,
} from '../../services/flowPromptPackageEngine';
import { applySmartRoutingToShots } from '../../services/googleFlowRoutingEngine';
import { getCapabilityProfile } from '../../services/videoCapabilityProfiles';

export const ProductionBoardTab: React.FC = () => {
  const {
    project,
    setStage4ShotPackages,
    updateStage4ShotPackage,
    updateStage3Shot,
    setStage3Shots,
  } = useProject();

  const shotPackages: GoogleFlowShotPackage[] = project.stage4?.shotPackages || [];
  const shots = project.stage3?.shots || [];
  const scenes = project.stage3?.scenes || [];
  const stage2Assets = project.stage2?.assets || [];

  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copiedPackageId, setCopiedPackageId] = useState<string | null>(null);
  const [filterRoute, setFilterRoute] = useState<'ALL' | 'INGREDIENTS' | 'FRAMES'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingRouteShotId, setEditingRouteShotId] = useState<string | null>(null);
  const [routeOverrideReason, setRouteOverrideReason] = useState<string>('');

  const targetModelProfile = getCapabilityProfile(project.stage4?.targetSettings?.targetModel);
  const isSourceStale = Boolean(
    project.sourceRevision &&
      project.screenplayRevision &&
      project.sourceRevision > project.screenplayRevision
  );

  // Auto-generate or synchronize Google Flow packages from current authoritative shots
  const handleGenerateFlowPrompts = async () => {
    setIsGeneratingPrompts(true);
    setErrorMsg(null);
    try {
      // Step 1: Ensure smart routing is applied to current shots
      const routedShots = applySmartRoutingToShots(shots, scenes);
      setStage3Shots(routedShots);

      // Step 2: Try backend Gemini generator or fallback to deterministic client engine
      let backendSuccess = false;
      try {
        const res = await fetch('/api/gemini/generate-flow-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shots: routedShots,
            stage2Assets,
            styleBible: project.stage2?.styleBible || {
              colorPaletteAndContrast: project.visualStyle?.colorIntent,
              lightingRules: project.visualStyle?.lightingIntent,
              textureAndRenderingLanguage: project.visualStyle?.textureIntent,
            },
            targetSettings: {
              targetModel: targetModelProfile.name,
              capabilityVerified: targetModelProfile.verificationStatus === 'VERIFIED',
            },
            settings: project.settings,
            visualStyle: project.visualStyle,
          }),
        });

        const data = await res.json();
        if (data.success && Array.isArray(data.shotPackages) && data.shotPackages.length > 0) {
          setStage4ShotPackages(data.shotPackages);
          backendSuccess = true;
        }
      } catch (networkErr) {
        console.warn('Backend call failed, using client engine:', networkErr);
      }

      if (!backendSuccess) {
        // Deterministic synthesis from authoritative current project data
        const synthesized = routedShots.map((sh) => {
          const sc = scenes.find((s) => s.sceneId === sh.sceneId);
          return synthesizeSingleFlowPackage(sh, sc, project, {
            modelProfile: targetModelProfile,
            sourceStale: isSourceStale,
          });
        });
        setStage4ShotPackages(synthesized);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate Google Flow prompts');
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleCopyPrompt = (shotId: string, promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPromptId(shotId);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const handleCopyCompletePackage = (pkg: GoogleFlowShotPackage) => {
    const text = buildCompleteCopyableShotPackage(pkg);
    navigator.clipboard.writeText(text);
    setCopiedPackageId(pkg.shotId);
    setTimeout(() => setCopiedPackageId(null), 2000);
  };

  // Change route for a single shot with recorded justification
  const handleToggleRoute = (shotId: string, nextMode: 'INGREDIENTS' | 'FRAMES') => {
    const reason =
      routeOverrideReason.trim() ||
      `Manual user override: Set to ${nextMode} for precision production`;

    // 1. Update Stage 3 shot
    updateStage3Shot(shotId, {
      flowMode: nextMode,
      routeManualOverride: true,
      routingReason: reason,
      continuationFromShotId: nextMode === 'FRAMES' ? (shots.find((s) => s.shotId === shotId)?.continuationFromShotId || null) : null,
    });

    // 2. Update Stage 4 package
    const existingPkg = shotPackages.find((p) => p.shotId === shotId);
    if (existingPkg) {
      const matchingShot = shots.find((s) => s.shotId === shotId);
      const matchingScene = scenes.find((s) => s.sceneId === existingPkg.sceneId);
      if (matchingShot) {
        const updated = synthesizeSingleFlowPackage(
          { ...matchingShot, flowMode: nextMode, routeManualOverride: true, routingReason: reason },
          matchingScene,
          project,
          { modelProfile: targetModelProfile, sourceStale: isSourceStale }
        );
        updateStage4ShotPackage(shotId, updated);
      }
    }

    setEditingRouteShotId(null);
    setRouteOverrideReason('');
  };

  // Filter packages
  const filteredPackages = shotPackages.filter((pkg) => {
    if (filterRoute !== 'ALL' && pkg.flowMode !== filterRoute) return false;
    if (filterStatus === 'READY' && pkg.honestProductionStatus !== 'READY_FOR_FLOW') return false;
    if (filterStatus === 'PENDING' && pkg.honestProductionStatus !== 'MEDIA_PENDING') return false;
    if (filterStatus === 'STALE' && pkg.honestProductionStatus !== 'SOURCE_STALE') return false;
    return true;
  });

  const totalRuntime = shotPackages.reduce((acc, p) => acc + (p.plannedDuration || 8), 0);
  const targetRuntime = project.settings?.targetRuntimeSeconds || 60;
  const readyCount = shotPackages.filter((p) => p.honestProductionStatus === 'READY_FOR_FLOW').length;
  const pendingCount = shotPackages.filter((p) => p.honestProductionStatus === 'MEDIA_PENDING').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30 uppercase tracking-widest">
              Phase 3 Production Board
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141C26] text-[#C5D0DE] border border-[#1C2735]">
              Target Model: <strong className="text-white">{targetModelProfile.name}</strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                targetModelProfile.verificationStatus === 'VERIFIED'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
              }`}
            >
              {targetModelProfile.verificationStatus === 'VERIFIED' ? 'CAPABILITY VERIFIED' : 'UNVERIFIED MODEL'}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold font-['Exo_2'] text-white">
            Google Flow Master Production Timeline
          </h2>
          <p className="text-xs text-[#8A96A6] max-w-2xl leading-relaxed">
            Smart-routed timeline packages adhering strictly to your authoritative screenplay and visual assets.
            INGREDIENTS routes independent compositions; FRAMES routes genuine visual continuations with verified start-frame dependencies.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={handleGenerateFlowPrompts}
            disabled={isGeneratingPrompts}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingPrompts ? 'animate-spin' : ''}`} />
            <span>
              {isGeneratingPrompts
                ? 'Synthesizing Prompts...'
                : shotPackages.length === 0
                ? 'Generate Flow Prompts'
                : 'Sync & Regenerate Prompts'}
            </span>
          </button>
        </div>
      </div>

      {isSourceStale && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>SOURCE_STALE Warning:</strong> Upstream story concept or canon (Rev {project.sourceRevision}) was modified after screenplay adaptation (Rev {project.screenplayRevision}). Re-syncing production prompts is recommended.
            </span>
          </div>
          <button
            onClick={handleGenerateFlowPrompts}
            className="px-3 py-1 bg-amber-500 text-black font-bold rounded text-xs shrink-0 cursor-pointer"
          >
            Re-Sync Now
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Metrics & Filter Bar */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-[#00AFFF]" />
            <span className="text-[#8A96A6]">Runtime:</span>
            <span className="font-mono text-white font-bold">{totalRuntime}s / {targetRuntime}s</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Video className="w-4 h-4 text-emerald-400" />
            <span className="text-[#8A96A6]">Total Shots:</span>
            <span className="font-mono text-white font-bold">{shotPackages.length}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[#8A96A6]">Flow Ready:</span>
            <span className="font-mono text-emerald-400 font-bold">{readyCount}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-[#8A96A6]">Media Pending:</span>
            <span className="font-mono text-amber-400 font-bold">{pendingCount}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#79838E]">Route:</span>
          {(['ALL', 'INGREDIENTS', 'FRAMES'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterRoute(mode)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                filterRoute === mode
                  ? 'bg-[#00AFFF] text-white border-[#00AFFF]'
                  : 'bg-[#070B10] text-[#79838E] border-[#1C2735]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Production Shot Cards */}
      {shotPackages.length === 0 ? (
        <div className="p-12 rounded-xl bg-[#0B1017] border border-[#1C2735] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#141C26] text-[#00AFFF] flex items-center justify-center mx-auto shadow-sm">
            <Video className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No Google Flow Prompts Generated Yet</h3>
            <p className="text-xs text-[#8A96A6]">
              Synthesize production-ready Veo 2 / Google Flow prompts for every shot in your shot plan, complete with camera physics, lighting cues, verbatim dialogue, and reference checklists.
            </p>
          </div>
          <button
            onClick={handleGenerateFlowPrompts}
            disabled={isGeneratingPrompts}
            className="px-6 py-3 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-lg disabled:opacity-50 inline-flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Master Video Prompts</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredPackages.map((pkg) => {
            const isCopiedPrompt = copiedPromptId === pkg.shotId;
            const isCopiedPackage = copiedPackageId === pkg.shotId;
            const isEditingRoute = editingRouteShotId === pkg.shotId;

            const isFrames = pkg.flowMode === 'FRAMES';
            const hasStartImage = Boolean(pkg.firstFrameMedia?.verified || pkg.firstFrameMediaStatus === 'AVAILABLE');

            return (
              <div
                key={pkg.shotId}
                className="bg-[#0B1017] border border-[#1C2735] hover:border-[#2C3B4E] rounded-xl overflow-hidden transition-all shadow-sm"
              >
                {/* Header Bar */}
                <div className="p-4 bg-[#0E1520] border-b border-[#1C2735] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded bg-[#141C26] font-mono text-xs font-bold text-[#00AFFF]">
                      {pkg.shotId}
                    </span>
                    <span className="text-xs text-white font-medium">
                      Scene: {pkg.sceneId} (Order #{pkg.order})
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300">
                      {pkg.plannedDuration}s
                    </span>

                    {/* Route Badge with Edit Option */}
                    <button
                      onClick={() => setEditingRouteShotId(isEditingRoute ? null : pkg.shotId)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-colors flex items-center space-x-1 ${
                        isFrames
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                          : 'bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/25'
                      }`}
                      title="Click to change routing mode"
                    >
                      <span>Route: {pkg.flowMode}</span>
                      <span className="text-[9px] opacity-70">✎</span>
                    </button>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        pkg.honestProductionStatus === 'READY_FOR_FLOW'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                          : pkg.honestProductionStatus === 'SOURCE_STALE'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                          : pkg.honestProductionStatus === 'MEDIA_PENDING'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                          : 'bg-[#1C2735] text-[#A0AEC0]'
                      }`}
                    >
                      {pkg.honestProductionStatus || pkg.mediaReadiness}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyPrompt(pkg.shotId, pkg.videoPrompt)}
                      className="px-3 py-1.5 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-1.5 shadow-sm"
                    >
                      {isCopiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#00AFFF]" />}
                      <span>{isCopiedPrompt ? 'Copied Prompt!' : 'Copy Video Prompt'}</span>
                    </button>

                    <button
                      onClick={() => handleCopyCompletePackage(pkg)}
                      className="px-3 py-1.5 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-[#C5D0DE] border border-[#243346] text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-1.5 shadow-sm"
                    >
                      {isCopiedPackage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5 text-purple-400" />}
                      <span>{isCopiedPackage ? 'Copied Package!' : 'Copy Complete Package'}</span>
                    </button>
                  </div>
                </div>

                {/* Inline Route Override Panel */}
                {isEditingRoute && (
                  <div className="p-3 bg-[#111822] border-b border-[#1C2735] text-xs space-y-2">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>Change Routing for Shot {pkg.shotId}</span>
                      <span className="text-[11px] text-[#79838E]">Instant shot override</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleRoute(pkg.shotId, 'INGREDIENTS')}
                        className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors ${
                          pkg.flowMode === 'INGREDIENTS' ? 'bg-[#00AFFF] text-white' : 'bg-[#141C26] text-[#A0AEC0]'
                        }`}
                      >
                        Set to INGREDIENTS
                      </button>
                      <button
                        onClick={() => handleToggleRoute(pkg.shotId, 'FRAMES')}
                        className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors ${
                          pkg.flowMode === 'FRAMES' ? 'bg-amber-500 text-black' : 'bg-[#141C26] text-[#A0AEC0]'
                        }`}
                      >
                        Set to FRAMES
                      </button>
                      <input
                        type="text"
                        placeholder="Optional reason for manual override..."
                        value={routeOverrideReason}
                        onChange={(e) => setRouteOverrideReason(e.target.value)}
                        className="flex-1 p-1.5 rounded bg-[#070B10] border border-[#1C2735] text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-5 text-xs font-sans">
                  {/* SECTION 1: MASTER VIDEO PROMPT */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#79838E] uppercase tracking-wider">
                        [1] Google Flow / Veo Master Video Prompt
                      </span>
                    </div>
                    <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] text-[#D7DCE2] font-mono text-xs leading-relaxed">
                      {pkg.videoPrompt}
                    </div>
                  </div>

                  {/* SECTION 2: IMAGES TO USE IN GOOGLE FLOW */}
                  <div className="p-4 rounded-lg bg-[#080D14] border border-[#1C2735] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1C2735]/60 pb-2">
                      <div className="flex items-center space-x-2">
                        <ImageIcon className="w-4 h-4 text-[#00AFFF]" />
                        <span className="font-bold text-white text-xs uppercase tracking-wider">
                          [2] Images to Use in Google Flow
                        </span>
                      </div>
                      <span className="text-[11px] text-[#79838E]">
                        Mode: <strong className="text-white">{pkg.flowMode}</strong>
                      </span>
                    </div>

                    {isFrames ? (
                      /* FRAMES Image Directives */
                      <div className="space-y-2.5">
                        <div className="p-3 rounded bg-[#070B10] border border-[#1C2735] flex items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-10 rounded bg-[#111820] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs">
                                Required START Frame: {pkg.firstFrameMedia?.filename || `shot_${pkg.shotId}_keyframe.png`}
                              </div>
                              <div className="text-[11px] text-[#79838E]">
                                {pkg.firstFrameMediaStatus === 'AVAILABLE'
                                  ? 'Image file available & accessible'
                                  : 'IMAGE PENDING — Upload or generate keyframe in Phase 2 Tab 5'}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              hasStartImage ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-300'
                            }`}
                          >
                            {hasStartImage ? 'AVAILABLE' : 'IMAGE PENDING'}
                          </span>
                        </div>

                        {pkg.continuationFromShotId && (
                          <div className="p-2.5 rounded bg-[#121A26] border border-[#1C2735] text-[11px] text-[#A0AEC0] space-y-1">
                            <div className="font-bold text-white">
                              Continuation Dependency: Shot [{pkg.continuationFromShotId}]
                            </div>
                            <div>
                              {pkg.continuationJustification || 'Visual continuation in continuous timeline.'}
                            </div>
                            <div className="text-[10px] text-amber-400">
                              Dependency Status: {pkg.continuationMediaStatus === 'AVAILABLE' ? 'Preceding clip final frame accessible' : 'PENDING generation of preceding shot final frame'}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* INGREDIENTS Image Directives */
                      <div className="space-y-2">
                        {pkg.referenceChecklist.length === 0 ? (
                          <div className="text-[11px] text-[#79838E] italic">
                            No external reference images linked. Pure text-to-video generation mode.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {pkg.referenceChecklist.map((item, idx) => (
                              <div
                                key={item.assetId || idx}
                                className="p-2.5 rounded bg-[#070B10] border border-[#1C2735] space-y-1.5"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-white truncate">{item.assetName}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                      item.mediaStatus === 'AVAILABLE'
                                        ? 'bg-emerald-950 text-emerald-400'
                                        : 'bg-amber-950 text-amber-300'
                                    }`}
                                  >
                                    {item.mediaStatus}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#79838E] font-mono">
                                  {item.assetId} ({item.assetType})
                                </div>
                                <div className="text-[10px] text-[#00AFFF] font-semibold">
                                  {item.notes || `Reference Slot ${idx + 1}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: EXACT SPEECH & AUDIO LANES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-2">
                      <div className="flex items-center space-x-2 text-[10px] font-bold text-[#00AFFF] uppercase tracking-wider">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>[3] Exact Screenplay Spoken Line</span>
                      </div>
                      <div className="text-xs text-[#D7DCE2] leading-relaxed">
                        {pkg.speechDialogueVerbatim ? (
                          <div>
                            <span className="font-bold text-white">{pkg.speechSpeakerName}: </span>
                            <span className="italic">"{pkg.speechDialogueVerbatim}"</span>
                            <span className="ml-2 text-[10px] bg-[#141C26] text-[#A0AEC0] px-1.5 py-0.5 rounded font-mono">
                              {pkg.speechTiming || '0–6s'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[#79838E] italic">
                            Intentionally Silent (No spoken dialogue or VO assigned to this shot)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-1.5">
                      <div className="text-[10px] font-bold text-[#79838E] uppercase tracking-wider">
                        Audio Track Atmosphere
                      </div>
                      <div className="space-y-1 text-[11px] text-[#A0AEC0]">
                        <div><strong className="text-white">Ambience:</strong> {pkg.audioLanes?.ambience || 'Motivated room tone'}</div>
                        <div><strong className="text-white">Foley / SFX:</strong> {pkg.audioLanes?.sfx || 'Subtle spatial foley'}</div>
                        <div><strong className="text-white">Score:</strong> {pkg.audioLanes?.music || 'Atmospheric tension'}</div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: CHOREOGRAPHY & CONTINUITY */}
                  <div className="p-3.5 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-2">
                    <div className="text-[10px] font-bold text-[#79838E] uppercase tracking-wider">
                      [4] Choreography & Continuity Anchors
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#A0AEC0]">
                      <div><strong className="text-white">Screen Direction:</strong> {pkg.continuityAnchors?.screenDirection}</div>
                      <div><strong className="text-white">Entry State:</strong> {pkg.continuityAnchors?.entryVisualState}</div>
                      <div><strong className="text-white">Exit State:</strong> {pkg.continuityAnchors?.exitVisualState}</div>
                      <div><strong className="text-white">Lighting:</strong> {pkg.continuityAnchors?.lightingAtmosphere}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
