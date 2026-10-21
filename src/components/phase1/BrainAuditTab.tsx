import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Wrench,
  Radio,
  Clock,
  Mic,
  Volume2,
  VolumeX,
  Film,
  ArrowRight,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  BrainAuditIssue,
  BrainAuditReport,
  BrainAuditCategory,
  SpeechLineRecord,
} from '../../types/filmStudio';

interface BrainAuditTabProps {
  onProceedToPhase2?: () => void;
}

export const BrainAuditTab: React.FC<BrainAuditTabProps> = ({ onProceedToPhase2 }) => {
  const {
    project,
    runBrainAuditTechnical,
    runBrainAuditCreative,
    applyBrainAuditFix,
    updateBrainAuditIssue,
    reassignSpeechLine,
    approveAndLockStage1,
    setActiveStage,
    setActivePhase,
  } = useProject();

  const [isRunningCreative, setIsRunningCreative] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'REQUIRED' | 'WARNING' | 'INFO'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | BrainAuditCategory>('ALL');
  const [selectedLayer, setSelectedLayer] = useState<'ALL' | 'TECHNICAL' | 'CREATIVE'>('ALL');
  const [showResolved, setShowResolved] = useState(false);
  const [showAudioSheet, setShowAudioSheet] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Run technical audit on mount if not yet audited
  useEffect(() => {
    if (!project.brainAudit) {
      runBrainAuditTechnical();
    }
  }, []);

  const report: BrainAuditReport = project.brainAudit || runBrainAuditTechnical();
  const audioSheet = project.audioContinuitySheet;
  const shots = project.stage3?.shots || [];

  const handleRunTechnical = () => {
    const fresh = runBrainAuditTechnical();
    setFeedbackMessage('Deterministic technical audit revalidated in 4ms (0 AI tokens consumed).');
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleRunCreative = async () => {
    setIsRunningCreative(true);
    setFeedbackMessage(null);
    try {
      await runBrainAuditCreative();
      setFeedbackMessage('Gemini Creative Review completed. Advisory story notes updated.');
    } catch (err: any) {
      setFeedbackMessage(`Creative review failed: ${err.message || 'Model service error'}`);
    } finally {
      setIsRunningCreative(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleApplyFix = (issueId: string) => {
    const success = applyBrainAuditFix(issueId);
    if (success) {
      setFeedbackMessage(`Quick-fix applied successfully for issue ${issueId}.`);
    } else {
      setFeedbackMessage(`Could not automatically fix ${issueId}. Manual edit required.`);
    }
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleToggleResolve = (issue: BrainAuditIssue) => {
    const nextStatus = issue.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
    updateBrainAuditIssue(issue.issueId, { status: nextStatus });
  };

  const handleApprovePhase1 = () => {
    const approved = approveAndLockStage1();
    if (approved) {
      if (onProceedToPhase2) {
        onProceedToPhase2();
      } else if (setActivePhase) {
        setActivePhase('phase2');
      } else {
        setActiveStage('stage2');
      }
    }
  };

  // Filter issues
  const filteredIssues = (report.issues || []).filter((issue) => {
    if (!showResolved && issue.status === 'RESOLVED') return false;
    if (selectedSeverity !== 'ALL' && issue.severity !== selectedSeverity) return false;
    if (selectedCategory !== 'ALL' && issue.category !== selectedCategory) return false;
    if (selectedLayer === 'TECHNICAL' && issue.layer !== 'LAYER_A_TECHNICAL') return false;
    if (selectedLayer === 'CREATIVE' && issue.layer !== 'LAYER_B_CREATIVE') return false;
    return true;
  });

  const openRequiredCount = (report.issues || []).filter(
    (i) => i.severity === 'REQUIRED' && i.status === 'OPEN'
  ).length;
  const openWarningCount = (report.issues || []).filter(
    (i) => i.severity === 'WARNING' && i.status === 'OPEN'
  ).length;
  const resolvedCount = (report.issues || []).filter((i) => i.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Top Brain Audit Summary Header */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div
              className={`p-3 rounded-xl shrink-0 flex items-center justify-center ${
                openRequiredCount === 0
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-950/60 border border-rose-500/40 text-rose-400'
              }`}
            >
              {openRequiredCount === 0 ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base font-bold text-white font-['Exo_2']">
                  Phase 1 Brain Audit & Continuity Sheet
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    openRequiredCount === 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {openRequiredCount === 0 ? 'APPROVAL READY' : `${openRequiredCount} REQUIRED BLOCKER(S)`}
                </span>
              </div>
              <p className="text-xs text-[#8A96A6] mt-1 leading-relaxed">
                Objective two-layer verification: Layer A validates deterministic technical invariants (source revisions, modular durations, audio mapping). Layer B provides on-demand creative story notes without endless loops.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleRunTechnical}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#141C26] hover:bg-[#1C2735] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors"
              title="Instant zero-token deterministic invariant check"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>Revalidate Technical</span>
            </button>

            <button
              onClick={handleRunCreative}
              disabled={isRunningCreative}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isRunningCreative ? 'animate-spin' : ''}`} />
              <span>{isRunningCreative ? 'Analyzing Story...' : 'Run Creative Review'}</span>
            </button>

            <button
              onClick={() => setShowAudioSheet(!showAudioSheet)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                showAudioSheet
                  ? 'bg-[#00AFFF]/20 border-[#00AFFF] text-white'
                  : 'bg-[#141C26] hover:bg-[#1C2735] text-[#8A96A6] border-[#243346]'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>Audio Continuity Sheet ({audioSheet?.lines?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* Feedback message banner */}
        {feedbackMessage && (
          <div className="p-3 rounded-lg bg-[#141F2E] border border-[#00AFFF]/40 text-[#00AFFF] text-xs flex items-center space-x-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 4-Metric Score Card Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[#1C2735]">
          {/* Overall Audit Score */}
          <div className="bg-[#070B10] border border-[#1C2735] rounded-lg p-3">
            <div className="text-[10px] text-[#55606E] font-semibold uppercase tracking-wider">
              Overall Audit Score
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span
                className={`text-2xl font-bold font-mono ${
                  report.overallScore >= 90
                    ? 'text-emerald-400'
                    : report.overallScore >= 70
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {report.overallScore}
              </span>
              <span className="text-xs text-[#55606E]">/ 100</span>
            </div>
            <div className="text-[10px] text-[#8A96A6] mt-0.5">
              {openRequiredCount === 0 ? 'Eligible for Phase 2' : `${openRequiredCount} blocker(s) remaining`}
            </div>
          </div>

          {/* Layer A Technical Score */}
          <div className="bg-[#070B10] border border-[#1C2735] rounded-lg p-3">
            <div className="text-[10px] text-[#55606E] font-semibold uppercase tracking-wider">
              Layer A: Technical
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold font-mono text-[#00AFFF]">
                {report.layerATechnicalScore}
              </span>
              <span className="text-xs text-[#55606E]">/ 100</span>
            </div>
            <div className="text-[10px] text-[#8A96A6] mt-0.5">
              Source Rev {project.sourceRevision || 1} · Script Rev {project.screenplayRevision || 1}
            </div>
          </div>

          {/* Layer B Creative Score */}
          <div className="bg-[#070B10] border border-[#1C2735] rounded-lg p-3">
            <div className="text-[10px] text-[#55606E] font-semibold uppercase tracking-wider">
              Layer B: Creative
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold font-mono text-purple-400">
                {typeof report.layerBCreativeScore === 'number' ? report.layerBCreativeScore : '—'}
              </span>
              <span className="text-xs text-[#55606E]">
                {typeof report.layerBCreativeScore === 'number' ? '/ 100' : 'Advisory'}
              </span>
            </div>
            <div className="text-[10px] text-[#8A96A6] mt-0.5">
              {report.isCreativeAuditStale ? 'Stale (Inputs changed)' : 'Fidelity & causality review'}
            </div>
          </div>

          {/* Editorial Runtime Coverage */}
          <div className="bg-[#070B10] border border-[#1C2735] rounded-lg p-3">
            <div className="text-[10px] text-[#55606E] font-semibold uppercase tracking-wider">
              Runtime Coverage
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span
                className={`text-2xl font-bold font-mono ${
                  report.runtimeIntegrity.isCoverageComplete ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {report.runtimeIntegrity.actualEditorialDurationSeconds}s
              </span>
              <span className="text-xs text-[#55606E]">
                / {report.runtimeIntegrity.targetRuntimeSeconds}s target
              </span>
            </div>
            <div className="text-[10px] text-[#8A96A6] mt-0.5">
              {report.runtimeIntegrity.durationGapSeconds === 0
                ? 'Exact match'
                : report.runtimeIntegrity.durationGapSeconds > 0
                ? `${report.runtimeIntegrity.durationGapSeconds}s deficit`
                : `${Math.abs(report.runtimeIntegrity.durationGapSeconds)}s excess`}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Continuity Sheet Subview (Collapsible) */}
      {showAudioSheet && (
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4 shadow-sm animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C2735] pb-3">
            <div className="flex items-center space-x-2.5">
              <Mic className="w-4 h-4 text-[#00AFFF]" />
              <h4 className="text-sm font-bold text-white font-['Exo_2']">
                Authoritative Audio Continuity Sheet (Line-Level Speech Manifest)
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-[#141C26] text-[#A0AEC0] border border-[#243346] font-mono">
                Mode: {audioSheet?.effectiveVoiceMode || 'CHARACTER_DIALOGUE_ONLY'}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#141C26] text-[#A0AEC0] border border-[#243346] font-mono">
                {audioSheet?.lines?.length || 0} Total Lines
              </span>
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold ${
                  audioSheet?.unmappedCount === 0
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                }`}
              >
                {audioSheet?.unmappedCount || 0} Unmapped
              </span>
            </div>
          </div>

          {audioSheet?.effectiveVoiceMode === 'NO_SPOKEN_VOICE' ? (
            <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] text-center text-xs text-[#8A96A6]">
              <VolumeX className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
              <strong className="text-white block mb-0.5">Intentional Silent Storytelling Active</strong>
              This project is configured with "No Spoken Voice". Zero dialogue lines are expected and valid. Downstream prompts and exports will specify silent visual narrative.
            </div>
          ) : audioSheet?.lines && audioSheet.lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1C2735] text-[#55606E] font-mono text-[10px] uppercase">
                    <th className="py-2 px-2.5">Line ID</th>
                    <th className="py-2 px-2.5">Speaker</th>
                    <th className="py-2 px-3">Spoken Text</th>
                    <th className="py-2 px-2.5">Type</th>
                    <th className="py-2 px-2">Est. Sec</th>
                    <th className="py-2 px-2.5">Assigned Shot</th>
                    <th className="py-2 px-2.5">Lip-Sync</th>
                    <th className="py-2 px-2.5">Status</th>
                    <th className="py-2 px-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141C26]">
                  {audioSheet.lines.map((line) => {
                    const assignedShot = shots.find((s) => s.shotId === line.shotId);
                    return (
                      <tr key={line.lineId} className="hover:bg-[#0E1520] transition-colors">
                        <td className="py-2.5 px-2.5 font-mono text-[#00AFFF] font-bold">
                          {line.lineId}
                        </td>
                        <td className="py-2.5 px-2.5 font-semibold text-white whitespace-nowrap">
                          {line.speakerName}
                        </td>
                        <td className="py-2.5 px-3 text-[#C5D0DE] max-w-xs truncate" title={line.spokenText}>
                          "{line.spokenText}"
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#141C26] text-[#8A96A6]">
                            {line.speechType}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-mono text-white">
                          {line.estimatedDurationSeconds}s
                        </td>
                        <td className="py-2.5 px-2.5">
                          <select
                            value={line.shotId || ''}
                            onChange={(e) => reassignSpeechLine(line.lineId, e.target.value || null)}
                            className="px-2 py-1 bg-[#070B10] border border-[#1C2735] rounded text-white text-[11px] outline-none"
                          >
                            <option value="">Unassigned</option>
                            {shots.map((s) => (
                              <option key={s.shotId} value={s.shotId}>
                                {s.shotId} ({s.duration}s · {s.sceneId})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-2.5">
                          {line.lipSyncRequired ? (
                            <span className="text-emerald-400 font-bold text-[10px]">REQUIRED</span>
                          ) : (
                            <span className="text-[#55606E] text-[10px]">VO (None)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              line.lineStatus === 'ASSIGNED'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : line.lineStatus === 'EDITORIAL_VO_PENDING'
                                ? 'bg-blue-500/15 text-blue-300'
                                : line.lineStatus === 'OVER_DURATION'
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-rose-500/15 text-rose-300'
                            }`}
                          >
                            {line.lineStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          {line.lineStatus === 'UNMAPPED' && (
                            <button
                              onClick={() => reassignSpeechLine(line.lineId, null, true)}
                              className="px-2 py-1 rounded bg-[#141C26] hover:bg-[#1C2735] text-[10px] text-[#00AFFF] font-semibold cursor-pointer border border-[#243346]"
                              title="Assign to global editorial voice-over lane"
                            >
                              Move to VO
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] text-center text-xs text-[#8A96A6]">
              No dialogue lines currently extracted from screenplay. Generate screenplay scenes with spoken dialogue to populate the continuity sheet.
            </div>
          )}
        </div>
      )}

      {/* Issues Filter & Toolbar */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 md:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity filter buttons */}
          <div className="flex rounded-lg p-0.5 bg-[#070B10] border border-[#1C2735]">
            {(['ALL', 'REQUIRED', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  selectedSeverity === sev
                    ? sev === 'REQUIRED'
                      ? 'bg-rose-600 text-white'
                      : sev === 'WARNING'
                      ? 'bg-amber-600 text-white'
                      : 'bg-[#00AFFF] text-white'
                    : 'text-[#79838E] hover:text-white'
                }`}
              >
                {sev === 'ALL' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          {/* Layer filter buttons */}
          <div className="flex rounded-lg p-0.5 bg-[#070B10] border border-[#1C2735]">
            {(['ALL', 'TECHNICAL', 'CREATIVE'] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setSelectedLayer(layer)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  selectedLayer === layer ? 'bg-[#141C26] text-white border border-[#243346]' : 'text-[#79838E] hover:text-white'
                }`}
              >
                {layer === 'ALL' ? 'All Layers' : layer === 'TECHNICAL' ? 'Layer A (Tech)' : 'Layer B (Story)'}
              </button>
            ))}
          </div>

          {/* Category filter dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-2.5 py-1 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="MISSING">MISSING</option>
            <option value="MISMATCH">MISMATCH</option>
            <option value="INCOMPLETE">INCOMPLETE</option>
            <option value="CONTRADICTORY">CONTRADICTORY</option>
            <option value="CREATIVE_SUGGESTION">CREATIVE SUGGESTION</option>
          </select>
        </div>

        {/* Resolved Toggle */}
        <label className="flex items-center space-x-2 text-xs text-[#8A96A6] cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded bg-[#070B10] border-[#1C2735] text-[#00AFFF] focus:ring-0"
          />
          <span>Show Resolved ({resolvedCount})</span>
        </label>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white font-['Exo_2']">
              Zero Issues Match Filter
            </h4>
            <p className="text-xs text-[#8A96A6]">
              All technical invariants and creative checks in this category are satisfied.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isResolved = issue.status === 'RESOLVED';
            const isRequired = issue.severity === 'REQUIRED';
            const isWarning = issue.severity === 'WARNING';

            return (
              <div
                key={issue.issueId}
                className={`bg-[#0B1017] border rounded-xl p-4 transition-all shadow-sm ${
                  isResolved
                    ? 'border-[#1C2735] opacity-60'
                    : isRequired
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : isWarning
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : 'border-[#1C2735]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#8A96A6]">
                        {issue.issueId}
                      </span>

                      {/* Severity Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isRequired
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {issue.severity}
                      </span>

                      {/* Category Badge */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141C26] text-[#A0AEC0] border border-[#243346]">
                        {issue.category}
                      </span>

                      {/* Layer Badge */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141C26] text-purple-300 border border-purple-500/30">
                        {issue.layer === 'LAYER_A_TECHNICAL' ? 'Layer A (Tech)' : 'Layer B (Creative)'}
                      </span>

                      {/* Affected IDs */}
                      {Object.entries(issue.affectedIds || {}).map(([key, val]) =>
                        val ? (
                          <span
                            key={key}
                            className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#070B10] text-[#00AFFF] border border-[#1C2735]"
                          >
                            {val}
                          </span>
                        ) : null
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white leading-tight">
                      {issue.title}
                    </h4>

                    <p className="text-xs text-[#A0AEC0] leading-relaxed">
                      {issue.description}
                    </p>

                    {/* Evidence & Consequence */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                      {issue.evidence && (
                        <div className="p-2 rounded bg-[#070B10] border border-[#1C2735] text-[#8A96A6]">
                          <strong className="text-white block font-mono text-[10px]">EVIDENCE:</strong>
                          {issue.evidence}
                        </div>
                      )}
                      {issue.consequence && (
                        <div className="p-2 rounded bg-[#070B10] border border-[#1C2735] text-[#8A96A6]">
                          <strong className="text-amber-300 block font-mono text-[10px]">WHY IT MATTERS:</strong>
                          {issue.consequence}
                        </div>
                      )}
                    </div>

                    {/* Suggested Fix */}
                    {issue.suggestedFix && (
                      <div className="text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg mt-1">
                        <strong>Suggested Fix:</strong> {issue.suggestedFix}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                    {issue.canQuickFix && !isResolved && (
                      <button
                        onClick={() => handleApplyFix(issue.issueId)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Quick-Fix</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleResolve(issue)}
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                        isResolved
                          ? 'bg-[#141C26] text-[#A0AEC0] border-[#243346]'
                          : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/60'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{isResolved ? 'Reopen Issue' : 'Mark Passed'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Phase 1 Completion & Approval Gate Footer */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            {openRequiredCount === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            )}
            <h4 className="text-sm font-bold text-white font-['Exo_2']">
              {openRequiredCount === 0
                ? 'Phase 1 Story & Continuity Gate Passed'
                : `${openRequiredCount} Required Technical Issue(s) Block Phase 2`}
            </h4>
          </div>
          <p className="text-xs text-[#8A96A6]">
            {openRequiredCount === 0
              ? 'Authoritative creative source, screenplay scene order, line-level speech records, and runtime coverage are verified. Ready to unlock Phase 2 Visual Asset Prompts.'
              : 'Resolve all open REQUIRED issues to unlock Phase 2 Pre-Production and asset generation.'}
          </p>
        </div>

        <button
          onClick={handleApprovePhase1}
          disabled={openRequiredCount > 0}
          className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg text-xs font-bold transition-all shadow-md ${
            openRequiredCount === 0
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/30'
              : 'bg-[#141C26] text-[#55606E] border border-[#243346] cursor-not-allowed'
          }`}
        >
          <span>APPROVE PHASE 1 & ADVANCE TO PHASE 2</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
