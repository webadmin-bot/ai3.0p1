import React, { useState } from 'react';
import {
  Video,
  Layers,
  Film,
  ShieldCheck,
  Lock,
  Unlock,
  Sparkles,
  Download,
  Copy,
  Check,
  ArrowLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Stage4TabId, GoogleFlowShotPackage } from '../../types/filmStudio';
import { GenerationQueueTab } from './GenerationQueueTab';
import { IngredientsTab } from './IngredientsTab';
import { FramesTab } from './FramesTab';
import { Stage4AuditTab } from './Stage4AuditTab';
import { ReviewExportTab } from './ReviewExportTab';
import { Stage4PipelineModal } from './Stage4PipelineModal';
import { EditFlowPromptModal } from './EditFlowPromptModal';
import { RefineFlowPromptModal } from './RefineFlowPromptModal';
import { ExportStage4Modal } from './ExportStage4Modal';
import { apiAuditStage4 } from '../../services/api';

export const Stage4Workspace: React.FC = () => {
  const {
    project,
    stage4Tab,
    setStage4Tab,
    setStage4Audit,
    updateStage4ShotPackage,
    updateStage4TargetSettings,
    unlockStage4ForRevision,
    setActiveStage,
  } = useProject();

  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTargetSetup, setShowTargetSetup] = useState(false);
  const [activeEditingShot, setActiveEditingShot] = useState<GoogleFlowShotPackage | null>(null);
  const [activeRefiningShot, setActiveRefiningShot] = useState<GoogleFlowShotPackage | null>(null);
  const [copiedAllPrompts, setCopiedAllPrompts] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

  // Upstream Guard Verification
  const isStage1Locked = project.stage1.locked;
  const isStage2Locked = project.stage2.locked;
  const isStage3Locked = project.stage3.locked;
  const hasStage3Shots = (project.stage3.shots || []).length > 0;

  if (!isStage1Locked || !isStage2Locked || !isStage3Locked || !hasStage3Shots) {
    return (
      <div className="space-y-6 max-w-4xl pb-12">
        <button
          onClick={() => setActiveStage(isStage3Locked ? 'stage3' : isStage2Locked ? 'stage3' : isStage1Locked ? 'stage2' : 'stage1')}
          className="flex items-center space-x-1.5 text-xs text-[#79838E] hover:text-[#00AFFF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>
            Return to {isStage2Locked ? 'Stage 3: Script & Shot Planner' : isStage1Locked ? 'Stage 2: Visual Asset Prompt Studio' : 'Stage 1: Story & Canon Studio'}
          </span>
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
              Stage 1, 2, and 3 Must Be Approved & Locked First
            </h2>
            <p className="text-xs text-[#D7DCE2] leading-relaxed max-w-xl">
              Stage 4: Google Flow Production Studio builds directly upon the approved Story Canon (Stage 1), the visual assets & Style Bible (Stage 2), and the approved Production Script & 6s/8s/10s Visual Shot Plan (Stage 3). Lock all three stages before entering Stage 4.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
              <div className="font-semibold text-white">Stage 1: Story Canon</div>
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

            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
              <div className="font-semibold text-white">Stage 3: Script & Shots</div>
              <div className="flex items-center space-x-2 text-[#79838E]">
                <span className={`w-2 h-2 rounded-full ${isStage3Locked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{isStage3Locked ? 'Locked & Approved' : 'Draft / Unapproved'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveStage(!isStage1Locked ? 'stage1' : !isStage2Locked ? 'stage2' : 'stage3')}
            className="px-6 py-2.5 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer"
          >
            <span>Proceed to {!isStage1Locked ? 'Stage 1' : !isStage2Locked ? 'Stage 2' : 'Stage 3'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Workspace Data
  const packages = project.stage4.shotPackages || [];
  const shots = project.stage3.shots || [];
  const ingredientsCount = packages.filter((p) => p.flowMode === 'INGREDIENTS').length;
  const framesCount = packages.filter((p) => p.flowMode === 'FRAMES').length;

  const openRequired = (project.stage4.audit?.issues || []).filter(
    (i) => i.severity === 'REQUIRED' && i.status === 'OPEN'
  ).length;

  const openWarnings = (project.stage4.audit?.issues || []).filter(
    (i) => i.severity === 'WARNING' && i.status === 'OPEN'
  ).length;

  const tabs: Array<{
    id: Stage4TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    alertCount?: number;
  }> = [
    {
      id: 'queue',
      label: 'Generation Queue',
      icon: Film,
      count: packages.length,
    },
    {
      id: 'ingredients',
      label: 'Ingredients',
      icon: Layers,
      count: ingredientsCount,
    },
    {
      id: 'frames',
      label: 'Frames',
      icon: Film,
      count: framesCount,
    },
    {
      id: 'audit',
      label: 'Audit & Continuity',
      icon: ShieldCheck,
      alertCount: openRequired,
    },
    {
      id: 'reviewExport',
      label: 'Review & Export',
      icon: Lock,
    },
  ];

  const handleCopyAllPrompts = async () => {
    if (packages.length === 0) return;
    const formatted = packages
      .map(
        (p, idx) =>
          `// SHOT #${idx + 1} [${p.shotId}] (${p.flowMode} • ${p.plannedDuration}s • Aspect: ${p.aspectRatio})\n` +
          (p.flowMode === 'FRAMES' && p.firstFramePrompt ? `// FIRST FRAME PROMPT:\n${p.firstFramePrompt}\n\n` : '') +
          `// VIDEO MOTION PROMPT:\n${p.videoPrompt}\n`
      )
      .join('\n----------------------------------------\n\n');

    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedAllPrompts(true);
      setTimeout(() => setCopiedAllPrompts(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleReaudit = async () => {
    setIsAuditing(true);
    try {
      const res = await apiAuditStage4({
        shotPackages: packages,
        shots,
        storyCanon: project.storyCanon!,
        storySourceMode: project.storySourceMode,
        importedScript: project.importedScript,
        stage2Assets: project.stage2.assets || [],
        styleBible: project.stage2.styleBible,
      });

      if (res.success && res.audit) {
        setStage4Audit(res.audit);
        setStage4Tab('audit');
      }
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Workspace Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1C2735] pb-5">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold text-[#00AFFF] uppercase tracking-wider bg-[#141C26] px-2 py-0.5 rounded border border-[#1C2735]">
              STAGE 4 — GOOGLE FLOW PRODUCTION STUDIO
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
            {project.stage4.locked && (
              <span className="text-[10px] font-bold text-[#F4A62A] bg-[#F4A62A]/10 border border-[#F4A62A]/30 px-2 py-0.5 rounded flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>PACKAGE V{project.stage4.approvedVersion || 1} LOCKED</span>
              </span>
            )}
          </div>
          <h1 className="font-['Exo_2'] font-bold text-2xl text-white tracking-tight">
            Google Flow Production Studio
          </h1>
          <p className="text-xs text-[#79838E] mt-0.5">
            Turn your locked shot plan into complete, copy-ready Google Flow video prompts.
          </p>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Setup Toggle */}
          <button
            onClick={() => setShowTargetSetup(!showTargetSetup)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center space-x-1.5 cursor-pointer ${
              showTargetSetup
                ? 'bg-[#1C2735] text-[#00AFFF] border-[#00AFFF]'
                : 'bg-[#111820] text-[#D7DCE2] border-[#1C2735] hover:border-[#79838E]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Target Flow Setup</span>
          </button>

          {/* Re-Audit Button */}
          {packages.length > 0 && (
            <button
              onClick={handleReaudit}
              disabled={isAuditing}
              className="px-3 py-2 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] hover:text-white text-xs font-semibold rounded-lg border border-[#1C2735] flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00AFFF] ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Auditing...' : 'Re-Audit'}</span>
            </button>
          )}

          {/* Copy All Prompts */}
          {packages.length > 0 && (
            <button
              onClick={handleCopyAllPrompts}
              className="px-3 py-2 bg-[#111820] hover:bg-[#1C2735] text-white text-xs font-semibold rounded-lg border border-[#1C2735] hover:border-[#00AFFF] flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copiedAllPrompts ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">All Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#00AFFF]" />
                  <span>Copy All Prompts</span>
                </>
              )}
            </button>
          )}

          {/* Export Package */}
          {packages.length > 0 && (
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-2 bg-[#111820] hover:bg-[#1C2735] text-white text-xs font-semibold rounded-lg border border-[#1C2735] hover:border-[#F4A62A] flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Export Package</span>
            </button>
          )}

          {/* Primary Action Button: Build Google Flow Prompts */}
          <button
            onClick={() => setShowPipelineModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0090D0] hover:to-blue-700 text-white font-bold text-xs rounded-lg shadow-lg shadow-[#00AFFF]/25 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {packages.length > 0 ? 'Rebuild Prompts' : 'BUILD GOOGLE FLOW PROMPTS'}
            </span>
          </button>
        </div>
      </div>

      {/* Target Flow Setup Panel (Expandable) */}
      {showTargetSetup && (
        <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 sm:p-5 space-y-3 transition-all text-xs">
          <div className="flex items-center justify-between border-b border-[#1C2735] pb-2.5">
            <div className="flex items-center space-x-2 font-bold text-white uppercase tracking-wider text-xs">
              <Sliders className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>Target Flow Setup & Capability Configuration</span>
            </div>
            <button
              onClick={() => setShowTargetSetup(false)}
              className="text-[#79838E] hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target Model Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#D7DCE2] block">
                Target Video Model:
              </label>
              <select
                value={project.stage4.targetSettings?.targetModel || 'Google Veo 2 / Flow Standard'}
                onChange={(e) =>
                  updateStage4TargetSettings({
                    targetModel: e.target.value,
                    capabilityVerified: false,
                  })
                }
                className="w-full bg-[#070B10] border border-[#1C2735] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#00AFFF] cursor-pointer"
              >
                <option value="Google Veo 2 / Flow Standard">Google Veo 2 / Flow Standard</option>
                <option value="Google Veo 2 (Fast Mode)">Google Veo 2 (Fast Mode)</option>
                <option value="Google Flow Legacy">Google Flow Legacy</option>
                <option value="Custom / User Specified">Custom / User Specified</option>
              </select>
            </div>

            {/* Aspect Ratio (Inherited from upstream) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#D7DCE2] block">
                Inherited Aspect Ratio:
              </label>
              <div className="bg-[#070B10] border border-[#1C2735] rounded-lg p-2 font-mono text-white text-xs">
                {project.settings?.aspectRatio || '9:16'} (Locked upstream)
              </div>
            </div>

            {/* Visual Style (Inherited from upstream) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#D7DCE2] block">
                Inherited Visual Style:
              </label>
              <div className="bg-[#070B10] border border-[#1C2735] rounded-lg p-2 text-white text-xs truncate">
                {project.visualStyle?.name || 'Cinematic Realism'}
              </div>
            </div>
          </div>

          {/* Capability Notes Notice (Required per Section 2) */}
          <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg flex items-start space-x-2 text-[11px] text-amber-200">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>MODEL CAPABILITIES NOT VERIFIED:</strong> Durations (6s, 8s, 10s) and modes (Ingredients, Frames) are strict pre-production planning standards. Verify in your Google Flow workspace console which durations and video lengths are exposed for your model.
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="border-b border-[#1C2735] flex items-center space-x-1 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = stage4Tab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setStage4Tab(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#00AFFF] text-white bg-[#111820]'
                  : 'border-transparent text-[#79838E] hover:text-[#D7DCE2] hover:bg-[#0B1017]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00AFFF]' : ''}`} />
              <span>{tab.label}</span>

              {tab.count !== undefined && (
                <span className="font-mono text-[10px] bg-[#141C26] px-1.5 py-0.2 rounded text-[#79838E]">
                  {tab.count}
                </span>
              )}

              {tab.alertCount !== undefined && tab.alertCount > 0 && (
                <span className="font-mono text-[10px] bg-red-950 text-red-400 px-1.5 py-0.2 rounded font-bold border border-red-500/40">
                  {tab.alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Workspaces */}
      <div>
        {stage4Tab === 'queue' && (
          <GenerationQueueTab
            onEditShot={(pkg) => setActiveEditingShot(pkg)}
            onRefineShot={(pkg) => setActiveRefiningShot(pkg)}
            onLaunchPipeline={() => setShowPipelineModal(true)}
          />
        )}

        {stage4Tab === 'ingredients' && (
          <IngredientsTab
            onEditShot={(pkg) => setActiveEditingShot(pkg)}
            onRefineShot={(pkg) => setActiveRefiningShot(pkg)}
          />
        )}

        {stage4Tab === 'frames' && (
          <FramesTab
            onEditShot={(pkg) => setActiveEditingShot(pkg)}
            onRefineShot={(pkg) => setActiveRefiningShot(pkg)}
          />
        )}

        {stage4Tab === 'audit' && (
          <Stage4AuditTab
            onOpenShotEdit={(pkg) => setActiveEditingShot(pkg)}
            onNavigateToShot={(shotId) => {
              setStage4Tab('queue');
              setTimeout(() => {
                const el = document.getElementById(`shot-${shotId}`);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 150);
            }}
          />
        )}

        {stage4Tab === 'reviewExport' && (
          <ReviewExportTab
            onOpenExportModal={() => setShowExportModal(true)}
            onEditShot={(pkg) => setActiveEditingShot(pkg)}
            onRefineShot={(pkg) => setActiveRefiningShot(pkg)}
          />
        )}
      </div>

      {/* Modals */}
      <Stage4PipelineModal
        isOpen={showPipelineModal}
        onClose={() => setShowPipelineModal(false)}
        onSuccess={() => setStage4Tab('queue')}
      />

      <ExportStage4Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      <EditFlowPromptModal
        pkg={activeEditingShot}
        onClose={() => setActiveEditingShot(null)}
        onSave={(updated) => updateStage4ShotPackage(updated.shotId, updated)}
      />

      <RefineFlowPromptModal
        pkg={activeRefiningShot}
        stage2Assets={project.stage2.assets || []}
        styleBible={project.stage2.styleBible}
        onClose={() => setActiveRefiningShot(null)}
        onSuccess={(updated) => updateStage4ShotPackage(updated.shotId, updated)}
      />
    </div>
  );
};
