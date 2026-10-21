import React, { useState } from 'react';
import {
  Clapperboard,
  Film,
  Camera,
  Layers,
  ShieldCheck,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  Download,
  Copy,
  Check,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Stage3TabId } from '../../types/filmStudio';
import { ScenesTab } from './ScenesTab';
import { ShotPlanTab } from './ShotPlanTab';
import { FlowRoutingTab } from './FlowRoutingTab';
import { AuditTab } from './AuditTab';
import { FinalReviewTab } from './FinalReviewTab';
import { ScriptSettingsModal } from './ScriptSettingsModal';
import { Stage3PipelineModal } from './Stage3PipelineModal';
import { CanonReferenceDrawer } from './CanonReferenceDrawer';
import { ExportStage3Modal } from './ExportStage3Modal';
import { apiAuditStage3 } from '../../services/api';

export const Stage3Workspace: React.FC = () => {
  const {
    project,
    stage3Tab,
    setStage3Tab,
    setStage3Audit,
    unlockStage3ForRevision,
    setActiveStage,
    saveStatus,
  } = useProject();

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showCanonDrawer, setShowCanonDrawer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedShotPlan, setCopiedShotPlan] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

  // Upstream Lock Verification
  const isStage1Locked = project.stage1.locked;
  const isStage2Locked = project.stage2.locked;
  const hasCanon = Boolean(project.storyFoundation && project.storyCanon);
  const hasStage2Assets = project.stage2.assets.length > 0;

  // Upstream Guard: Prevent rendering workspace if prerequisites are not locked
  if (!isStage1Locked || !isStage2Locked || !hasCanon || !hasStage2Assets) {
    return (
      <div className="space-y-6 max-w-4xl pb-12">
        <button
          onClick={() => setActiveStage(isStage1Locked ? 'stage2' : 'stage1')}
          className="flex items-center space-x-1.5 text-xs text-[#79838E] hover:text-[#00AFFF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to {isStage1Locked ? 'Stage 2: Visual Asset Prompt Studio' : 'Stage 1: Story & Canon Studio'}</span>
        </button>

        <div className="bg-[#0B1017] border-2 border-amber-500/30 rounded-2xl p-8 space-y-6">
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-[#F4A62A]">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#F4A62A]">
              PREREQUISITE REQUIRED
            </span>
            <h2 className="font-['Exo_2'] font-bold text-2xl text-white">
              Stage 1 and Stage 2 Must Be Approved & Locked First
            </h2>
            <p className="text-xs text-[#D7DCE2] leading-relaxed max-w-xl">
              Stage 3: Script & Shot Planner builds directly upon the approved narrative facts (Stage 1 Story Canon) and the approved textual visual design (Stage 2 Style Bible & Asset Manifest). Finish and lock both stages before entering Stage 3.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
              <div className="font-semibold text-white">Stage 1: Story & Canon</div>
              <div className="flex items-center space-x-2 text-[#79838E]">
                <span className={`w-2 h-2 rounded-full ${isStage1Locked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{isStage1Locked ? 'Locked & Approved' : 'Draft / Unapproved'}</span>
              </div>
            </div>

            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
              <div className="font-semibold text-white">Stage 2: Visual Assets</div>
              <div className="flex items-center space-x-2 text-[#79838E]">
                <span className={`w-2 h-2 rounded-full ${isStage2Locked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{isStage2Locked ? 'Locked & Approved' : 'Draft / Unapproved'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveStage(isStage1Locked ? 'stage2' : 'stage1')}
            className="px-6 py-2.5 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer"
          >
            <span>Proceed to {isStage1Locked ? 'Stage 2 to Finalize & Lock Assets' : 'Stage 1 to Finalize & Lock Canon'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Workspace Metrics
  const scenes = project.stage3.scenes || [];
  const shots = project.stage3.shots || [];
  const targetRuntime = project.settings?.targetRuntimeSeconds || 60;
  const plannedRuntime = shots.reduce((acc, s) => acc + s.duration, 0);

  const ingredientsCount = shots.filter((s) => s.flowMode === 'INGREDIENTS').length;
  const framesCount = shots.filter((s) => s.flowMode === 'FRAMES').length;

  const openRequired = (project.stage3.audit?.issues || []).filter(
    (i) => i.severity === 'REQUIRED' && i.status === 'OPEN'
  ).length;

  const isOwnScript = project.storySourceMode === 'OWN_SCRIPT';

  const tabs: Array<{
    id: Stage3TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    alertCount?: number;
  }> = [
    { id: 'scenes', label: 'SCENES & SCRIPT', icon: Film, count: scenes.length },
    { id: 'shotPlan', label: 'SHOT PLAN', icon: Camera, count: shots.length },
    { id: 'flowRouting', label: 'FLOW ROUTING', icon: Layers, count: shots.length },
    { id: 'audit', label: 'AUDIT', icon: ShieldCheck, alertCount: openRequired },
    { id: 'finalReview', label: 'FINAL REVIEW', icon: Lock },
  ];

  const handleQuickReaudit = async () => {
    if (!project.storyCanon) return;
    setIsAuditing(true);
    try {
      const res = await apiAuditStage3({
        scenes,
        shots,
        storyCanon: project.storyCanon,
        storySourceMode: project.storySourceMode,
        importedScript: project.importedScript,
        stage2Assets: project.stage2.assets,
        styleBible: project.stage2.styleBible,
        scriptSettings: project.stage3.settings,
        targetRuntime,
      });
      if (res.success && res.audit) {
        setStage3Audit(res.audit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCopyScript = () => {
    const fullScript = scenes.map((s) => `--- ${s.sceneId}: ${s.title} (${s.estimatedSceneDuration}s) ---\n${s.scriptText}`).join('\n\n');
    navigator.clipboard.writeText(fullScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyShotPlan = () => {
    const fullPlan = shots.map((sh) => `[${sh.shotId}] (${sh.duration}s - ${sh.flowMode})\nPurpose: ${sh.purpose}\nCamera: ${sh.shotSize} / ${sh.cameraAngle} / ${sh.cameraMovement}\nBlocking: ${sh.blockingAndMovement}\nLighting: ${sh.lightingAndAtmosphere}${sh.firstFramePrompt ? `\nFirst Frame Prompt: ${sh.firstFramePrompt}` : ''}`).join('\n\n');
    navigator.clipboard.writeText(fullPlan);
    setCopiedShotPlan(true);
    setTimeout(() => setCopiedShotPlan(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Stage Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1C2735] pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] bg-[#00AFFF]/10 px-2 py-0.5 rounded border border-[#00AFFF]/20">
              STAGE 3
            </span>
            <span className="text-xs font-mono text-[#79838E]">
              {project.title}
            </span>
            {project.settings.seasonTitle && (
              <span className="text-[10px] font-mono text-[#79838E] bg-[#141C26] px-2 py-0.5 rounded border border-[#1C2735]">
                {project.settings.seasonTitle}
              </span>
            )}
            {(project.settings.format === 'Episodic Short Drama' || project.settings.format === 'Episodic Long-Form Series') && (
              <span className="text-[10px] font-mono font-bold bg-[#00AFFF]/15 text-[#00AFFF] px-2 py-0.5 rounded border border-[#00AFFF]/30">
                EPISODE {project.stage3.settings?.activeEpisodeNumber || project.settings.selectedEpisodeNumber || 1} of {project.settings.episodeCount || 10}
              </span>
            )}
            {project.stage3.locked && (
              <span className="text-[10px] font-mono font-bold bg-[#F4A62A]/20 text-[#F4A62A] px-2 py-0.5 rounded border border-[#F4A62A]/40 flex items-center space-x-1">
                <Lock className="w-2.5 h-2.5" />
                <span>LOCKED • V{project.stage3.approvedVersion || 1}</span>
              </span>
            )}
          </div>
          <h1 className="font-['Exo_2'] font-bold text-2xl md:text-3xl text-white">
            STAGE 3 — SCRIPT & SHOT PLANNER
          </h1>
          <p className="text-xs text-[#79838E]">
            Convert approved canon into filmable scenes and 6–10 second Google Flow shot plans.
          </p>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCanonDrawer(true)}
            className="px-3 py-2 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1.5 border border-[#1C2735] transition-colors cursor-pointer"
            title="View locked Stage 1 Canon & Stage 2 Assets"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span className="hidden sm:inline">View Canon</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1.5 border border-[#1C2735] transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>Settings</span>
          </button>

          {scenes.length > 0 && (
            <>
              <button
                onClick={handleCopyScript}
                className="px-2.5 py-2 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer"
                title="Copy full screenplay"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedScript ? 'Copied' : 'Copy Script'}</span>
              </button>

              <button
                onClick={handleCopyShotPlan}
                className="px-2.5 py-2 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer"
                title="Copy shot plan"
              >
                {copiedShotPlan ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedShotPlan ? 'Copied' : 'Copy Shots'}</span>
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className="px-3 py-2 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1.5 border border-[#1C2735] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </>
          )}

          {shots.length > 0 && (
            <button
              onClick={handleQuickReaudit}
              disabled={isAuditing}
              className="px-3 py-2 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1.5 border border-[#1C2735] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Re-Audit</span>
            </button>
          )}

          {/* Primary Action Button */}
          {!project.stage3.locked ? (
            <button
              onClick={() => setShowPipelineModal(true)}
              className="px-4 py-2 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-lg shadow-lg shadow-[#00AFFF]/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {scenes.length === 0
                  ? isOwnScript
                    ? 'Plan Shots From My Script'
                    : 'Generate Script & Shot Plan'
                  : 'Regenerate Script & Shot Plan'}
              </span>
            </button>
          ) : (
            <button
              onClick={unlockStage3ForRevision}
              className="px-3.5 py-2 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-[#F4A62A] text-xs font-bold flex items-center space-x-1.5 border border-[#F4A62A]/40 transition-colors cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock For Revision</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Source Mode */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3">
          <span className="text-[10px] text-[#79838E] uppercase font-bold block">
            Source Mode
          </span>
          <span className="font-mono text-xs font-bold text-white mt-1 block truncate">
            {project.storySourceMode}
          </span>
        </div>

        {/* Inherited Visual Style (Read-Only) */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#79838E] uppercase font-bold">
              Visual Style
            </span>
            <span className="text-[9px] font-mono text-[#00AFFF]">MASTER</span>
          </div>
          <span className="text-xs font-bold text-[#00AFFF] mt-1 block truncate">
            {project.visualStyle.name}
          </span>
        </div>

        {/* Scenes Count */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3">
          <span className="text-[10px] text-[#79838E] uppercase font-bold block">
            Scenes Scripted
          </span>
          <span className="font-mono text-xs font-bold text-white mt-1 block">
            {scenes.length} Scenes
          </span>
        </div>

        {/* Shots & Runtime */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3">
          <span className="text-[10px] text-[#79838E] uppercase font-bold block">
            Planned Runtime
          </span>
          <div className="flex items-baseline space-x-1 mt-1 font-mono">
            <span className="text-xs font-bold text-[#00AFFF]">{plannedRuntime}s</span>
            <span className="text-[10px] text-[#79838E]">/ {targetRuntime}s target</span>
          </div>
        </div>

        {/* Route Counts */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3">
          <span className="text-[10px] text-[#79838E] uppercase font-bold block">
            Flow Routes
          </span>
          <div className="flex items-center space-x-1.5 mt-1 text-xs font-mono">
            <span className="text-[#00AFFF]">{ingredientsCount} Ing</span>
            <span className="text-[#79838E]">•</span>
            <span className="text-[#F4A62A]">{framesCount} Frm</span>
          </div>
        </div>

        {/* Audit Status / Required issues */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3">
          <span className="text-[10px] text-[#79838E] uppercase font-bold block">
            Audit Status
          </span>
          <div className="mt-1 flex items-center space-x-1.5">
            {openRequired > 0 ? (
              <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-500/30">
                {openRequired} Required
              </span>
            ) : project.stage3.audit ? (
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Score {project.stage3.audit.overallScore}/100
              </span>
            ) : (
              <span className="text-[10px] text-[#79838E] font-mono">Pending</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Switcher Bar */}
      <div className="border-b border-[#1C2735] flex items-center space-x-1 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = stage3Tab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setStage3Tab(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#00AFFF] text-white bg-[#111820]'
                  : 'border-transparent text-[#79838E] hover:text-[#D7DCE2] hover:bg-[#0B1017]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00AFFF]' : ''}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className="text-[10px] font-mono bg-[#141C26] text-[#79838E] px-1.5 py-0.2 rounded">
                  {tab.count}
                </span>
              )}
              {typeof tab.alertCount === 'number' && tab.alertCount > 0 && (
                <span className="text-[10px] font-mono font-bold bg-rose-900/60 text-rose-400 border border-rose-500/40 px-1.5 py-0.2 rounded">
                  {tab.alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="pt-2">
        {stage3Tab === 'scenes' && (
          <ScenesTab onOpenPipeline={() => setShowPipelineModal(true)} />
        )}
        {stage3Tab === 'shotPlan' && (
          <ShotPlanTab onOpenPipeline={() => setShowPipelineModal(true)} />
        )}
        {stage3Tab === 'flowRouting' && <FlowRoutingTab />}
        {stage3Tab === 'audit' && (
          <AuditTab onOpenSceneOrShot={() => setStage3Tab('shotPlan')} />
        )}
        {stage3Tab === 'finalReview' && (
          <FinalReviewTab onOpenExportModal={() => setShowExportModal(true)} />
        )}
      </div>

      {/* Script & Shot Settings Modal */}
      <ScriptSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Stage 3 Generation Pipeline Modal */}
      <Stage3PipelineModal
        isOpen={showPipelineModal}
        onClose={() => setShowPipelineModal(false)}
        onSuccess={() => {
          setShowPipelineModal(false);
          setStage3Tab('scenes');
        }}
      />

      {/* Canon Reference Slide-Over Drawer */}
      <CanonReferenceDrawer
        isOpen={showCanonDrawer}
        onClose={() => setShowCanonDrawer(false)}
      />

      {/* Export Package Modal */}
      <ExportStage3Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};
