import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Film,
  Layers,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  PartyPopper,
  AlertCircle,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { FlowShotCard } from './FlowShotCard';
import { GoogleFlowShotPackage } from '../../types/filmStudio';

interface ReviewExportTabProps {
  onOpenExportModal: () => void;
  onEditShot: (pkg: GoogleFlowShotPackage) => void;
  onRefineShot: (pkg: GoogleFlowShotPackage) => void;
}

export const ReviewExportTab: React.FC<ReviewExportTabProps> = ({
  onOpenExportModal,
  onEditShot,
  onRefineShot,
}) => {
  const {
    project,
    approveAndLockStage4,
    unlockStage4ForRevision,
    updateStage4ShotPackage,
  } = useProject();

  const [copiedAll, setCopiedAll] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const packages = project.stage4.shotPackages || [];
  const shots = project.stage3.shots || [];
  const stage2Assets = project.stage2.assets || [];
  const audit = project.stage4.audit;
  const isLocked = project.stage4.locked;

  const totalRuntime = packages.reduce((acc, p) => acc + p.plannedDuration, 0);
  const ingredientsCount = packages.filter((p) => p.flowMode === 'INGREDIENTS').length;
  const framesCount = packages.filter((p) => p.flowMode === 'FRAMES').length;
  const textReadyCount = packages.filter((p) => p.textReadiness === 'TEXT_READY').length;
  const mediaPendingCount = packages.filter((p) => p.mediaReadiness === 'MEDIA_PENDING').length;
  const capabilityUnverifiedCount = packages.filter((p) => p.capabilityStatus === 'NOT_VERIFIED').length;

  const openRequired = (audit?.issues || []).filter(
    (i) => i.severity === 'REQUIRED' && i.status !== 'RESOLVED'
  ).length;

  const openWarnings = (audit?.issues || []).filter(
    (i) => i.severity === 'WARNING' && i.status !== 'RESOLVED'
  ).length;

  const hasCurrentAudit = Boolean(audit) && !project.stage4.needsReaudit && !project.stage4.dirty;

  const seenIds = new Set<string>();
  const isOneToOneAndValid =
    packages.length === shots.length &&
    packages.length > 0 &&
    packages.every((p, idx) => {
      const s = shots[idx];
      if (!s || p.shotId !== s.shotId) return false;
      if (seenIds.has(p.shotId)) return false;
      seenIds.add(p.shotId);
      if (p.sceneId !== s.sceneId || p.plannedDuration !== s.duration || p.flowMode !== s.flowMode) return false;
      if (p.flowMode === 'FRAMES' && (!p.firstFramePrompt || !p.firstFramePrompt.trim())) return false;
      if (!p.videoPrompt || p.videoPrompt.trim().length < 20) return false;
      return true;
    });

  const canApprove =
    hasCurrentAudit &&
    isOneToOneAndValid &&
    openRequired === 0 &&
    project.stage1.locked &&
    project.stage2.locked &&
    project.stage3.locked;

  const handleCopyAllPrompts = async () => {
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
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleApproveClick = () => {
    if (!canApprove) return;
    if (mediaPendingCount > 0 || capabilityUnverifiedCount > 0) {
      setShowWarningModal(true);
    } else {
      approveAndLockStage4();
    }
  };

  const confirmApproveWithWarnings = () => {
    setShowWarningModal(false);
    approveAndLockStage4();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Locked / Pipeline Complete Hero Banner */}
      {isLocked && (
        <div className="bg-gradient-to-r from-emerald-950/70 via-[#111820] to-emerald-950/70 border-2 border-emerald-500/50 rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xl shadow-emerald-500/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/60 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <PartyPopper className="w-3.5 h-3.5" />
                  <span>FOUR-STAGE PRODUCTION PIPELINE COMPLETE</span>
                </span>
                <h3 className="font-['Exo_2'] font-bold text-xl sm:text-2xl text-white">
                  Google Flow Video Generation Package V{project.stage4.approvedVersion || 1} Locked
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenExportModal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Package</span>
              </button>

              <button
                onClick={unlockStage4ForRevision}
                className="px-3.5 py-2.5 bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] font-semibold text-xs rounded-xl border border-[#1C2735] hover:border-amber-400/50 flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Unlock to edit video prompts"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>Revise</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-[#D7DCE2] leading-relaxed max-w-2xl">
            All four stages of pre-production are verified and locked. Your {packages.length} shots have complete, copy-ready video prompts, reference checklists, and continuity instructions ready for manual assembly in Google Flow.
          </p>
        </div>
      )}

      {/* Production Specification Summary Card */}
      <div className="bg-[#111820] border border-[#1C2735] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C2735] pb-4">
          <div>
            <span className="text-[10px] font-bold text-[#00AFFF] uppercase tracking-wider">
              STAGE 4 PRODUCTION MANIFEST
            </span>
            <h3 className="font-['Exo_2'] font-bold text-xl text-white">
              {project.title} — Google Flow Package Review
            </h3>
            <p className="text-xs text-[#79838E]">
              Master Visual Style: <strong className="text-white">{project.visualStyle?.name}</strong> • Aspect: <strong className="text-white">{project.settings?.aspectRatio}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyAllPrompts}
              className="px-3 py-2 bg-[#141C26] hover:bg-[#1C2735] text-white text-xs font-semibold rounded-lg border border-[#1C2735] hover:border-[#00AFFF] flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">All Prompts Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#00AFFF]" />
                  <span>Copy All Prompts</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenExportModal}
              className="px-3 py-2 bg-[#141C26] hover:bg-[#1C2735] text-white text-xs font-semibold rounded-lg border border-[#1C2735] hover:border-[#F4A62A] flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Export Files</span>
            </button>
          </div>
        </div>

        {/* 6-Metric Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Shot Coverage</span>
            <span className="font-mono text-base font-bold text-white">
              {packages.length} / {shots.length}
            </span>
            <span className="text-[10px] text-emerald-400 block font-semibold">100% 1:1 Coverage</span>
          </div>

          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Planned Runtime</span>
            <span className="font-mono text-base font-bold text-white">{totalRuntime}s</span>
            <span className="text-[10px] text-[#79838E] block">Target: {project.settings?.targetRuntimeSeconds}s</span>
          </div>

          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Routes</span>
            <span className="font-mono text-base font-bold text-white">
              {ingredientsCount} Ing • {framesCount} Frm
            </span>
            <span className="text-[10px] text-[#79838E] block">Ingredients / Frames</span>
          </div>

          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Text Package</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {textReadyCount} / {packages.length}
            </span>
            <span className="text-[10px] text-emerald-400/90 block font-semibold">Copy-Ready</span>
          </div>

          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Media Status</span>
            <span className="font-mono text-base font-bold text-amber-400">
              {mediaPendingCount} Pending
            </span>
            <span className="text-[10px] text-amber-400/90 block">External upload needed</span>
          </div>

          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">Capability Checks</span>
            <span className="font-mono text-base font-bold text-sky-400">
              {capabilityUnverifiedCount} Unverified
            </span>
            <span className="text-[10px] text-sky-400/90 block">Target model notes</span>
          </div>
        </div>

        {/* Upstream Gate Verification */}
        <div className="bg-[#0E141D] border border-[#1C2735] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-[10px] font-bold text-[#79838E] uppercase tracking-wider">
              Pipeline Locks:
            </span>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Stage 1: Canon V1 Locked</span>
              </span>
              <span className="flex items-center space-x-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Stage 2: Assets Locked</span>
              </span>
              <span className="flex items-center space-x-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Stage 3: Script & Shots Locked</span>
              </span>
            </div>
          </div>

          {/* Audit Verification */}
          <div className="flex items-center space-x-2">
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                openRequired === 0
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-950 text-red-400 border border-red-500/30'
              }`}
            >
              {openRequired === 0 ? 'AUDIT PASSED (0 BLOCKERS)' : `${openRequired} BLOCKERS OPEN`}
            </span>
          </div>
        </div>

        {/* Main Approval Action */}
        {!isLocked && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#1C2735]">
            <div className="text-xs text-[#79838E]">
              {canApprove ? (
                <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready to approve and lock final Google Flow Production Package V1.</span>
                </span>
              ) : (
                <span className="text-red-400 font-semibold flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>
                    {!hasCurrentAudit
                      ? 'Current Stage 4 audit required before approval.'
                      : !isOneToOneAndValid
                      ? 'Shot packages must match Stage 3 shots exactly (1:1 sequence, zero duplicates).'
                      : `Resolve all ${openRequired} required audit blockers before locking.`}
                  </span>
                </span>
              )}
            </div>

            <button
              onClick={handleApproveClick}
              disabled={!canApprove}
              className="px-6 py-3 bg-gradient-to-r from-[#F4A62A] to-amber-600 hover:from-amber-500 hover:to-amber-700 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-xl shadow-[#F4A62A]/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>APPROVE & LOCK GOOGLE FLOW PACKAGE V1</span>
            </button>
          </div>
        )}
      </div>

      {/* Full Ordered Per-Shot Packages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-['Exo_2'] font-bold text-base text-white">
            Complete Production Shot Manifest ({packages.length} Packages)
          </h4>
          <span className="text-xs text-[#79838E]">
            Ordered exactly according to Stage 3 Shot Plan
          </span>
        </div>

        {packages.map((pkg) => (
          <FlowShotCard
            key={pkg.shotId}
            pkg={pkg}
            stage2Assets={stage2Assets}
            onEdit={onEditShot}
            onRefine={onRefineShot}
          />
        ))}
      </div>

      {/* Warning Confirmation Modal (if media is pending or unverified) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1017] border border-amber-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-[#F4A62A]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                Confirm Textual Production Package Lock
              </h3>
              <p className="text-xs text-[#D7DCE2] leading-relaxed">
                Zero required textual blockers remain! However, your package contains non-blocking warnings:
              </p>
              <ul className="list-disc list-inside text-xs text-[#79838E] space-y-1">
                {mediaPendingCount > 0 && (
                  <li>
                    <strong className="text-amber-300">{mediaPendingCount} shots</strong> have reference files or frames marked as pending external generation.
                  </li>
                )}
                {capabilityUnverifiedCount > 0 && (
                  <li>
                    <strong className="text-sky-300">{capabilityUnverifiedCount} shots</strong> have target model capabilities marked as unverified.
                  </li>
                )}
              </ul>
              <p className="text-xs text-[#79838E] leading-relaxed pt-1">
                As per Section 8 of the Production Contract, approving a <strong>TEXT-ONLY PRODUCTION PACKAGE</strong> is fully supported with warnings acknowledged.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#1C2735]">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#79838E] hover:text-white rounded-lg hover:bg-[#1C2735] transition-colors cursor-pointer"
              >
                Return to Review
              </button>
              <button
                onClick={confirmApproveWithWarnings}
                className="px-5 py-2 bg-[#F4A62A] hover:bg-amber-500 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Textual Package V1</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
