import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Film,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Palette,
  Clock,
  Layers,
  FileCheck,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  checkStage1ApprovalGate,
  deriveAuditSummary,
} from '../../services/canonAuditEngine';
import { normalizeStoryCanon } from '../../services/canonHelpers';

export const FinalReviewTab: React.FC = () => {
  const {
    project,
    approveAndLockStage1,
    unlockStage1ForRevision,
    setActiveStage,
  } = useProject();

  const [confirmLockModal, setConfirmLockModal] = useState(false);
  const [unlockModal, setUnlockModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const foundation = project.storyFoundation;
  const canon = project.storyCanon ? normalizeStoryCanon(project.storyCanon) : null;
  const audit = project.canonAudit;
  const isLocked = project.stage1.locked;
  const auditSummary = deriveAuditSummary(audit?.issues || []);

  // Single authoritative approval gate check
  const checkModePrerequisites = (): string | null => {
    const gate = checkStage1ApprovalGate(project);
    return gate.blockerReason;
  };

  const handleApproveClick = () => {
    const error = checkModePrerequisites();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    setConfirmLockModal(true);
  };

  const handleExecuteApproval = () => {
    const success = approveAndLockStage1();
    setConfirmLockModal(false);
    if (!success) {
      setValidationError('Approval validation failed. Ensure all requirements are met.');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] mb-0.5">
            STAGE 1 GATEWAY • FINAL APPROVAL
          </div>
          <h2 className="font-['Exo_2'] font-bold text-xl text-white flex items-center space-x-2">
            <span>Stage 1 Final Review & Lock</span>
            {isLocked && (
              <span className="text-[10px] bg-[#F4A62A]/20 text-[#F4A62A] px-2 py-0.5 rounded font-mono font-bold border border-[#F4A62A]/40 flex items-center space-x-1">
                <Lock className="w-2.5 h-2.5" />
                <span>LOCKED V1</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-[#79838E]">
            One authoritative gate. Approving creates immutable Foundation V1 & Canon V1 snapshots and logically unlocks Stage 2.
          </p>
        </div>

        <div>
          {isLocked ? (
            <button
              onClick={() => setActiveStage('stage2')}
              className="bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0099DD] hover:to-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-xl shadow-[#00AFFF]/25 flex items-center space-x-2 cursor-pointer"
            >
              <span>Continue to Stage 2</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleApproveClick}
              className="bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0099DD] hover:to-blue-700 text-white font-bold text-xs px-6 py-3 rounded-lg shadow-xl shadow-[#00AFFF]/25 flex items-center space-x-2 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-300" />
              <span>APPROVE & LOCK STORY CANON V1</span>
            </button>
          )}
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-red-950/70 border border-red-500/50 p-4 rounded-xl text-xs text-red-200 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-red-300">Approval Blocked</div>
            <div>{validationError}</div>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-red-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Locked Celebration / State Banner */}
      {isLocked && (
        <div className="bg-[#0B1522] border-2 border-[#F4A62A] rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-[#F4A62A]/20 border border-[#F4A62A]/40 flex items-center justify-center text-[#F4A62A]">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#F4A62A] uppercase tracking-wider">
                  STAGE 1 COMPLETE • PRODUCTION READY
                </div>
                <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                  Story Canon V1 Approved & Locked
                </h3>
                <p className="text-xs text-[#79838E]">
                  Locked on {new Date(project.stage1.approvedAt || '').toLocaleString()} • Version {project.stage1.approvedVersion || 1}
                </p>
              </div>
            </div>

            <button
              onClick={() => setUnlockModal(true)}
              className="text-xs bg-[#111820] hover:bg-[#1C2735] text-[#79838E] hover:text-[#D7DCE2] border border-[#1C2735] px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors"
            >
              <Unlock className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Unlock to Revise</span>
            </button>
          </div>

          <p className="text-xs text-[#D7DCE2] leading-relaxed">
            Stage 2 (Visual Asset Prompt Studio) is logically unlocked. The authoritative story foundation, characters, and master visual style will now govern all future prompt generation.
          </p>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setActiveStage('stage2')}
              className="bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-lg shadow-[#00AFFF]/25 flex items-center space-x-2 cursor-pointer"
            >
              <span>Continue to Stage 2: Visual Asset Prompt Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Snapshot Review Cards */}
      {foundation && canon && (
        <div className="space-y-4">
          {/* Foundation Snapshot */}
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1C2735] pb-2.5">
              <span className="text-xs font-bold text-[#00AFFF] uppercase tracking-wider">
                Story Foundation V1 Snapshot
              </span>
              <span className="font-mono text-xs text-white">
                {foundation.title}
              </span>
            </div>

            <div className="text-xs space-y-2">
              <p className="text-white italic bg-[#111820] p-3 rounded-lg border border-[#1C2735]">
                "{foundation.logline}"
              </p>
              <p className="text-[#D7DCE2] leading-relaxed">
                {foundation.premise}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
              <div className="bg-[#111820] p-2 rounded border border-[#1C2735]">
                <span className="text-[#79838E] text-[10px] block">Mode</span>
                <span className="text-white font-semibold">{project.storySourceMode}</span>
              </div>
              <div className="bg-[#111820] p-2 rounded border border-[#1C2735]">
                <span className="text-[#79838E] text-[10px] block">Format</span>
                <span className="text-white font-semibold">{project.settings.format}</span>
              </div>
              <div className="bg-[#111820] p-2 rounded border border-[#1C2735]">
                <span className="text-[#79838E] text-[10px] block">Target Runtime</span>
                <span className="text-white font-semibold">{project.settings.targetRuntimeSeconds}s</span>
              </div>
              <div className="bg-[#111820] p-2 rounded border border-[#1C2735]">
                <span className="text-[#79838E] text-[10px] block">Tone</span>
                <span className="text-white font-semibold">{project.settings.tone}</span>
              </div>
            </div>
          </div>

          {/* Master Visual Style Snapshot */}
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1C2735] pb-2.5">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-[#00AFFF]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Authoritative Master Visual Style
                </span>
              </div>
              <span className="text-xs font-bold text-[#00AFFF]">
                {project.visualStyle.name}
              </span>
            </div>

            <p className="text-xs text-[#D7DCE2] leading-relaxed">
              {project.visualStyle.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#79838E]">
              <div>
                <span className="text-[#D7DCE2] font-semibold">Medium: </span>
                {project.visualStyle.medium}
              </div>
              <div>
                <span className="text-[#D7DCE2] font-semibold">Lighting: </span>
                {project.visualStyle.lightingIntent}
              </div>
              <div>
                <span className="text-[#D7DCE2] font-semibold">Texture: </span>
                {project.visualStyle.textureIntent}
              </div>
            </div>
          </div>

          {/* Canon Architecture Checklist */}
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
            <span className="text-xs font-bold text-[#00AFFF] uppercase tracking-wider block border-b border-[#1C2735] pb-2.5">
              Canon Architecture Inventory
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] flex items-center justify-between">
                <div>
                  <span className="text-[#79838E] text-[10px] block">Characters</span>
                  <span className="text-white font-bold">{canon.characters.length} Roles</span>
                </div>
                {canon.characters.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>

              <div className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] flex items-center justify-between">
                <div>
                  <span className="text-[#79838E] text-[10px] block">World Rules</span>
                  <span className="text-white font-bold">{canon.worldRules.length} Rules</span>
                </div>
                {canon.worldRules.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>

              <div className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] flex items-center justify-between">
                <div>
                  <span className="text-[#79838E] text-[10px] block">Narrative Beats</span>
                  <span className="text-white font-bold">{canon.beatMap.length} Beats</span>
                </div>
                {canon.beatMap.length >= (canon.episodicRoadmap?.length ? Math.min(3, canon.episodicRoadmap.length) : 3) ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
              </div>

              <div className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] flex items-center justify-between">
                <div>
                  <span className="text-[#79838E] text-[10px] block">Setup / Payoff</span>
                  <span className="text-white font-bold">{canon.setupPayoffs.length} Ledgers</span>
                </div>
                {canon.setupPayoffs.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
              </div>

              <div className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] flex items-center justify-between">
                <div>
                  <span className="text-[#79838E] text-[10px] block">Locations</span>
                  <span className="text-white font-bold">{canon.locations.length} Locations</span>
                </div>
                {canon.locations.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>

              <div className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] flex items-center justify-between">
                <div>
                  <span className="text-[#79838E] text-[10px] block">Props</span>
                  <span className="text-white font-bold">{canon.props.length} Props</span>
                </div>
                {canon.props.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>

              <div className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] flex items-center justify-between">
                <div>
                  <span className="text-[#79838E] text-[10px] block">Timeline</span>
                  <span className="text-white font-bold">{canon.timeline.length} Milestones</span>
                </div>
                {canon.timeline.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
              </div>

              {Array.isArray(canon.episodicRoadmap) && canon.episodicRoadmap.length > 0 && (
                <div className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] flex items-center justify-between">
                  <div>
                    <span className="text-[#79838E] text-[10px] block">Episodic Roadmap</span>
                    <span className="text-white font-bold">{canon.episodicRoadmap.length} Episodes</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              )}

              <div className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] flex items-center justify-between">
                <div>
                  <span className="text-[#79838E] text-[10px] block">Audit Readiness</span>
                  {project.stage1.needsReaudit ? (
                    <span className="text-amber-400 font-bold text-xs">
                      Re-Audit Needed
                    </span>
                  ) : auditSummary.unresolvedRequired > 0 ? (
                    <span className="text-red-400 font-bold text-xs">
                      {auditSummary.unresolvedRequired} Blocking Required
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold text-xs">
                      {audit?.overallScore || 90}/100 Score • Ready
                    </span>
                  )}
                </div>
                {project.stage1.needsReaudit ? (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                ) : auditSummary.unresolvedRequired > 0 ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111820] border-2 border-[#00AFFF] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-['Exo_2'] font-bold text-lg text-white">
              Approve and Lock Story Canon V1?
            </h3>
            <p className="text-xs text-[#79838E] leading-relaxed">
              This will finalize Stage 1 and lock your Story Foundation and Canon V1 specifications. You can unlock at any time if you need to revise later.
            </p>
            <div className="bg-[#090D13] p-3 rounded border border-[#1C2735] text-[11px] text-[#D7DCE2] space-y-1">
              <div>✓ Zero open REQUIRED audit issues confirmed</div>
              <div>✓ Master Visual Style ({project.visualStyle.name}) confirmed</div>
              <div>✓ Stage 2 (Visual Asset Prompt Studio) will be unlocked</div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmLockModal(false)}
                className="px-4 py-2 text-xs text-[#D7DCE2] hover:bg-[#1C2735] rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteApproval}
                className="px-5 py-2 text-xs bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold rounded flex items-center space-x-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm & Lock Stage 1</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock for Revision Modal */}
      {unlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-['Exo_2'] font-bold text-base text-white">
              Unlock Story Canon for Revision?
            </h3>
            <p className="text-xs text-[#79838E] leading-relaxed">
              Unlocking allows editing characters, world rules, beats, or premises. Any changes will increment version history and require re-auditing before relocking.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setUnlockModal(false)}
                className="px-4 py-2 text-xs text-[#D7DCE2] hover:bg-[#1C2735] rounded"
              >
                Keep Locked
              </button>
              <button
                onClick={() => {
                  unlockStage1ForRevision();
                  setUnlockModal(false);
                }}
                className="px-4 py-2 text-xs bg-[#F4A62A] hover:bg-[#D48F20] text-black font-bold rounded flex items-center space-x-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock for Revision</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
