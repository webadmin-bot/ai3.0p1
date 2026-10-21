import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  FileText,
  Camera,
  Layers,
  ArrowRight,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { calculateDurationReconciliation } from '../../services/stage3Duration';
import { ExportStage3Modal } from './ExportStage3Modal';

interface FinalReviewTabProps {
  onOpenExportModal: () => void;
}

export const FinalReviewTab: React.FC<FinalReviewTabProps> = ({ onOpenExportModal }) => {
  const {
    project,
    approveAndLockStage3,
    unlockStage3ForRevision,
    setActiveStage,
    updateSettings,
  } = useProject();

  const [approvalError, setApprovalError] = useState<string | null>(null);

  const scenes = project.stage3.scenes || [];
  const shots = project.stage3.shots || [];
  const targetRuntime = project.settings?.targetRuntimeSeconds || 60;
  const plannedRuntime = shots.reduce((acc, s) => acc + s.duration, 0);
  const maxShotDuration = project.stage3.settings?.maxShotDuration || 10;

  const durationRecon = calculateDurationReconciliation(
    targetRuntime,
    shots,
    maxShotDuration
  );

  const isLocked = project.stage3.locked;

  // Prerequisites Validation
  const isStage1Locked = project.stage1.locked;
  const isStage2Locked = project.stage2.locked;
  const hasScenes = scenes.length > 0;
  const hasShots = shots.length > 0;

  const hasCurrentAudit = Boolean(project.stage3.audit) && !project.stage3.needsReaudit && !project.stage3.dirty;

  const coveredScenes = new Set(shots.map((s) => s.sceneId));
  const hasCompleteSceneCoverage = scenes.every((sc) => coveredScenes.has(sc.sceneId));

  const invalidDurations = shots.filter(
    (s) => s.duration !== 6 && s.duration !== 8 && s.duration !== 10
  );

  const missingFramePrompts = shots.filter(
    (s) => s.flowMode === 'FRAMES' && (!s.firstFramePrompt || !s.firstFramePrompt.trim())
  );

  const openRequiredIssues = (project.stage3.audit?.issues || []).filter(
    (i) => i.severity === 'REQUIRED' && i.status !== 'RESOLVED'
  );

  const canApprove =
    isStage1Locked &&
    isStage2Locked &&
    hasScenes &&
    hasShots &&
    hasCurrentAudit &&
    hasCompleteSceneCoverage &&
    invalidDurations.length === 0 &&
    missingFramePrompts.length === 0 &&
    openRequiredIssues.length === 0;

  const handleApprove = () => {
    setApprovalError(null);
    const success = approveAndLockStage3();
    if (!success) {
      if (!hasCurrentAudit) {
        setApprovalError(
          'A CURRENT Stage 3 audit is required before approval. Any modifications require running a fresh audit.'
        );
      } else if (!hasCompleteSceneCoverage) {
        setApprovalError(
          'Every scene in your screenplay must have at least one corresponding planned shot before approval.'
        );
      } else if (openRequiredIssues.length > 0) {
        setApprovalError(
          `Unable to approve: ${openRequiredIssues.length} REQUIRED audit issue(s) remain unresolved.`
        );
      } else {
        setApprovalError(
          'Unable to approve Stage 3. Please check duration constraints (6s/8s/10s) and first-frame prompts.'
        );
      }
    }
  };

  const dur6Count = shots.filter((s) => s.duration === 6).length;
  const dur8Count = shots.filter((s) => s.duration === 8).length;
  const dur10Count = shots.filter((s) => s.duration === 10).length;
  const ingredientsCount = shots.filter((s) => s.flowMode === 'INGREDIENTS').length;
  const framesCount = shots.filter((s) => s.flowMode === 'FRAMES').length;

  return (
    <div className="space-y-6 max-w-4xl pb-8">
      {/* Locked Celebration Banner */}
      {isLocked && (
        <div className="bg-[#0B1520] border-2 border-emerald-500/50 rounded-2xl p-6 md:p-8 space-y-4 shadow-xl shadow-emerald-950/20">
          <div className="flex items-center space-x-3 text-emerald-400">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                STAGE 3 AUTHORITATIVELY LOCKED
              </span>
              <h2 className="font-['Exo_2'] font-bold text-xl text-white">
                Production Script V1 & Visual Shot Plan V1 Approved!
              </h2>
            </div>
          </div>

          <p className="text-xs text-[#D7DCE2] leading-relaxed">
            Both Stage 3 deliverables have been compiled, timestamped, and immutably persisted. Stage 4: Google Flow Production Studio is now unlocked.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveStage('stage4')}
              className="px-6 py-2.5 rounded-xl bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-[#00AFFF]/25 cursor-pointer transition-all"
            >
              <span>Continue to Stage 4: Google Flow Production Studio</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenExportModal}
              className="px-4 py-2.5 rounded-xl bg-[#111820] hover:bg-[#1C2735] text-white font-semibold text-xs flex items-center space-x-1.5 border border-[#1C2735] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>Export Stage 3 Package</span>
            </button>

            <button
              onClick={unlockStage3ForRevision}
              className="px-4 py-2.5 rounded-xl bg-[#111820] hover:bg-[#1C2735] text-[#79838E] hover:text-white font-semibold text-xs flex items-center space-x-1.5 border border-[#1C2735] cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock for Revision</span>
            </button>
          </div>
        </div>
      )}

      {/* Target Runtime vs Planned Runtime & Duration Reconciliation */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C2735] pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#79838E] font-bold">
              Runtime Alignment Analysis
            </span>
            <h3 className="font-['Exo_2'] font-bold text-white text-base">
              Target Runtime vs Planned Shot Runtime
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="text-right">
              <span className="text-[10px] text-[#79838E] block">Target Runtime</span>
              <span className="font-bold text-white text-sm">{targetRuntime}s</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#79838E]" />
            <div className="text-right">
              <span className="text-[10px] text-[#79838E] block">Planned Shots</span>
              <span className="font-bold text-[#00AFFF] text-sm">{plannedRuntime}s</span>
            </div>
          </div>
        </div>

        {/* Reconciliation Status Details */}
        <div className="space-y-2 text-xs">
          <p className="text-[#D7DCE2] leading-relaxed">
            {durationRecon.explanation}
          </p>

          {durationRecon.discrepancy !== 0 && (
            <div className="bg-[#111820] border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center space-x-2 text-[#F4A62A] font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Duration Reconciliation Options</span>
              </div>
              <p className="text-[11px] text-[#79838E]">
                Because all AI video shots are strictly 6, 8, or 10 seconds, you can align the target runtime to your planned shot breakdown:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSettings({ targetRuntimeSeconds: plannedRuntime })}
                  className="px-3 py-1.5 rounded-lg bg-[#00AFFF]/15 hover:bg-[#00AFFF]/25 text-[#00AFFF] font-semibold text-xs border border-[#00AFFF]/30 cursor-pointer transition-colors"
                >
                  Adjust Target Runtime to Match Planned Shots ({plannedRuntime}s)
                </button>
                <span className="text-[11px] text-[#79838E]">or accept as creative variance.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prerequisites Checklist */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
        <h4 className="font-['Exo_2'] font-bold text-white text-sm">
          Stage 3 Approval Prerequisites Checklist
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-2 bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <CheckCircle2 className={`w-4 h-4 ${isStage1Locked ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className={isStage1Locked ? 'text-white' : 'text-rose-400'}>
              Stage 1 Story Canon Locked
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <CheckCircle2 className={`w-4 h-4 ${isStage2Locked ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className={isStage2Locked ? 'text-white' : 'text-rose-400'}>
              Stage 2 Visual Assets Locked ({project.stage2.assets.length} assets)
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <CheckCircle2 className={`w-4 h-4 ${hasScenes ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className={hasScenes ? 'text-white' : 'text-rose-400'}>
              Screenplay Scenes Scripted ({scenes.length} scenes)
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <CheckCircle2 className={`w-4 h-4 ${invalidDurations.length === 0 && hasShots ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className={invalidDurations.length === 0 && hasShots ? 'text-white' : 'text-rose-400'}>
              All Shots Partitioned Strictly to 6s, 8s, or 10s ({shots.length} shots)
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <CheckCircle2 className={`w-4 h-4 ${missingFramePrompts.length === 0 && hasShots ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className={missingFramePrompts.length === 0 && hasShots ? 'text-white' : 'text-rose-400'}>
              All FRAMES Shots Have First-Frame Prompts ({framesCount} frames shots)
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <CheckCircle2 className={`w-4 h-4 ${openRequiredIssues.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className={openRequiredIssues.length === 0 ? 'text-white' : 'text-rose-400'}>
              Zero Open REQUIRED Audit Issues ({openRequiredIssues.length} open)
            </span>
          </div>
        </div>
      </div>

      {/* Deliverable Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deliverable A: Production Script V1 */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#00AFFF] uppercase font-bold">
                Deliverable A
              </span>
              <h4 className="font-['Exo_2'] font-bold text-white text-sm">
                Production Script V1
              </h4>
            </div>
          </div>
          <p className="text-xs text-[#79838E] leading-relaxed">
            Full scene-by-scene screenplay script with visible present-tense action, dialogue blocks, speech timings, and audio cues.
          </p>
          <div className="bg-[#111820] p-3 rounded-lg text-xs font-mono text-[#D7DCE2] space-y-1">
            <div>Scenes: {scenes.length}</div>
            <div>Estimated Scene Runtime: ~{scenes.reduce((a, s) => a + s.estimatedSceneDuration, 0)}s</div>
            <div>Source Mode: {project.storySourceMode}</div>
          </div>
        </div>

        {/* Deliverable B: Visual Shot Plan V1 */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#F4A62A]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#F4A62A] uppercase font-bold">
                Deliverable B
              </span>
              <h4 className="font-['Exo_2'] font-bold text-white text-sm">
                Visual Shot Plan V1
              </h4>
            </div>
          </div>
          <p className="text-xs text-[#79838E] leading-relaxed">
            Cinematic shot list adhering strictly to 6s, 8s, 10s increments with camera movements, lighting, and Google Flow routing.
          </p>
          <div className="bg-[#111820] p-3 rounded-lg text-xs font-mono text-[#D7DCE2] space-y-1">
            <div>Total Shots: {shots.length} (Planned Runtime: {plannedRuntime}s)</div>
            <div>Breakdown: {dur6Count}×6s • {dur8Count}×8s • {dur10Count}×10s</div>
            <div>Routing: {ingredientsCount} Ingredients • {framesCount} Frames</div>
          </div>
        </div>
      </div>

      {/* Approval Gate Footer */}
      {!isLocked && (
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
          {approvalError && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-lg p-3 text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{approvalError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white">
                Ready to Lock Stage 3?
              </div>
              <p className="text-[11px] text-[#79838E]">
                This will finalize Production Script V1 & Visual Shot Plan V1 and unlock Stage 4.
              </p>
            </div>

            <button
              onClick={handleApprove}
              disabled={!canApprove}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00AFFF] to-[#0080C0] hover:from-[#0090D0] hover:to-[#0070B0] text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-[#00AFFF]/25 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>Approve & Lock Script + Shot Plan V1</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
