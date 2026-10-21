import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  Wrench,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Flame,
  Check,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiAuditStoryCanon, apiAutoFixCanonIssue } from '../../services/api';
import { AuditIssue } from '../../types/filmStudio';
import {
  deriveAuditSummary,
  isIssueResolved,
  normalizeAuditIssue,
  runDeterministicCanonValidation,
  verifyAndMergeCanonRepair,
} from '../../services/canonAuditEngine';

export const CanonAuditTab: React.FC = () => {
  const {
    project,
    updateStoryCanon,
    setCanonAudit,
    updateCanonAuditIssue,
    setActiveTab,
  } = useProject();

  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'REQUIRED' | 'WARNING' | 'INFO'>('ALL');
  const [isAuditing, setIsAuditing] = useState(false);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [fixExplanation, setFixExplanation] = useState<{ id: string; text: string } | null>(null);
  const [confirmFixAllModal, setConfirmFixAllModal] = useState(false);
  const [lastRepairSummary, setLastRepairSummary] = useState<string | null>(null);

  const audit = project.canonAudit;
  const rawIssues = audit?.issues || [];
  const normalizedIssues = rawIssues.map((i, idx) => normalizeAuditIssue(i, idx));
  const summary = deriveAuditSummary(normalizedIssues);

  const filteredIssues = normalizedIssues.filter((i) => {
    if (severityFilter === 'ALL') return true;
    return i.severity === severityFilter;
  });

  // Re-run full audit (Layer A Deterministic + Layer B Gemini Creative Review)
  const handleRerunAudit = async () => {
    if (!project.storyFoundation || !project.storyCanon) return;
    setIsAuditing(true);
    setLastRepairSummary(null);
    try {
      const res = await apiAuditStoryCanon({
        storyFoundation: project.storyFoundation,
        storyCanon: project.storyCanon,
        sourceMode: project.storySourceMode,
        originalStoryText: project.originalStoryText,
        importedScript: project.importedScript,
      });

      if (res.success && res.audit) {
        setCanonAudit(res.audit);
      }
    } catch (err: any) {
      console.error('Audit failed:', err);
      setLastRepairSummary(`Audit pass failed: ${err.message || 'Network error'}`);
    } finally {
      setIsAuditing(false);
    }
  };

  // Deterministic fast re-verification without unnecessary Gemini API calls
  const handleFastDeterministicRecheck = () => {
    if (!project.storyFoundation || !project.storyCanon) return;
    const detIssues = runDeterministicCanonValidation(
      project.storyFoundation,
      project.storyCanon,
      project.settings
    );

    // Keep creative issues that don't collide with deterministic issues
    const nonDetIssues = normalizedIssues.filter((i) => !i.issueId.startsWith('DET-'));
    const combined = [...detIssues, ...nonDetIssues];

    setCanonAudit({
      overallScore: audit?.overallScore || 92,
      summary: 'Deterministic structural validation completed.',
      issues: combined,
      auditedAt: new Date().toISOString(),
    });
    setLastRepairSummary('Deterministic validation rules re-evaluated cleanly.');
  };

  // Auto-fix single safe issue with verified surgical merge
  const handleAutoFix = async (issue: AuditIssue) => {
    if (!project.storyFoundation || !project.storyCanon) return;
    setFixingIssueId(issue.issueId);
    setLastRepairSummary(null);

    try {
      const res = await apiAutoFixCanonIssue(
        issue,
        project.storyFoundation,
        project.storyCanon
      );

      if (res.success && res.repairedCanon) {
        // 1. Validate the repair schema and confirm the targeted defect actually changed
        const verifyResult = verifyAndMergeCanonRepair(
          project.storyCanon,
          res,
          issue
        );

        if (verifyResult.success && verifyResult.canon) {
          // 2. Re-run affected deterministic checks against the new canon
          const detAfter = runDeterministicCanonValidation(
            project.storyFoundation,
            verifyResult.canon,
            project.settings
          );
          const stillHasSameIssue = detAfter.some(
            (d) => d.issueId === issue.issueId || (d.fieldPath === issue.fieldPath && d.section === issue.section)
          );

          if (!stillHasSameIssue) {
            // Save updated canon atomically without marking needsReaudit since this was a verified audit fix
            updateStoryCanon(verifyResult.canon, false);

            updateCanonAuditIssue(issue.issueId, {
              status: 'RESOLVED',
              verifiedAt: new Date().toISOString(),
              verificationDetails: verifyResult.explanation,
              repairError: undefined,
            });
            setFixExplanation({
              id: issue.issueId,
              text: verifyResult.explanation || res.explanation || 'Issue resolved surgically and verified.',
            });
          } else {
            updateCanonAuditIssue(issue.issueId, {
              status: 'FAILED',
              repairError: 'Repair applied but structural validation still flagged this issue.',
            });
          }
        } else {
          updateCanonAuditIssue(issue.issueId, {
            status: 'FAILED',
            repairError: verifyResult.error || 'Verification of repaired fields failed.',
          });
        }
      } else {
        updateCanonAuditIssue(issue.issueId, {
          status: 'FAILED',
          repairError: res.error || 'Auto fix request returned an error.',
        });
      }
    } catch (err: any) {
      console.error('Auto fix error:', err);
      updateCanonAuditIssue(issue.issueId, {
        status: 'FAILED',
        repairError: err.message || 'Auto fix network request failed.',
      });
    } finally {
      setFixingIssueId(null);
    }
  };

  // Fix All Safe Issues sequentially using an accumulated working canon snapshot
  const handleFixAllSafe = async () => {
    setConfirmFixAllModal(false);
    setIsFixingAll(true);
    setLastRepairSummary(null);

    if (!project.storyFoundation || !project.storyCanon) {
      setIsFixingAll(false);
      return;
    }

    const safeIssues = normalizedIssues.filter((i) => i.isSafeToAutoFix && !isIssueResolved(i));
    if (safeIssues.length === 0) {
      setIsFixingAll(false);
      return;
    }

    // Sequential working canon snapshot: each successful repair feeds the next
    let workingCanon = JSON.parse(JSON.stringify(project.storyCanon));
    let successCount = 0;
    let failedCount = 0;
    const failureMessages: string[] = [];

    for (const issue of safeIssues) {
      try {
        const res = await apiAutoFixCanonIssue(
          issue,
          project.storyFoundation,
          workingCanon
        );

        if (res.success && res.repairedCanon) {
          const verifyResult = verifyAndMergeCanonRepair(
            workingCanon,
            res,
            issue
          );

          if (verifyResult.success && verifyResult.canon) {
            // Sequential snapshot receives updated canon
            workingCanon = verifyResult.canon;
            successCount++;
            updateCanonAuditIssue(issue.issueId, {
              status: 'RESOLVED',
              verifiedAt: new Date().toISOString(),
              verificationDetails: verifyResult.explanation,
              repairError: undefined,
            });
          } else {
            failedCount++;
            const msg = `[${issue.issueId}]: ${verifyResult.error || 'Verification failed'}`;
            failureMessages.push(msg);
            updateCanonAuditIssue(issue.issueId, {
              status: 'FAILED',
              repairError: verifyResult.error || 'Verification of repair failed',
            });
          }
        } else {
          failedCount++;
          const msg = `[${issue.issueId}]: ${res.error || 'Repair failed'}`;
          failureMessages.push(msg);
          updateCanonAuditIssue(issue.issueId, {
            status: 'FAILED',
            repairError: res.error || 'Repair request failed',
          });
        }
      } catch (err: any) {
        failedCount++;
        const msg = `[${issue.issueId}]: ${err.message || 'Network error'}`;
        failureMessages.push(msg);
        updateCanonAuditIssue(issue.issueId, {
          status: 'FAILED',
          repairError: err.message || 'Network error during repair',
        });
      }
    }

    // Commit final valid canon state atomically if any repairs succeeded
    if (successCount > 0) {
      updateStoryCanon(workingCanon, false);
    }

    setIsFixingAll(false);

    if (failedCount === 0) {
      setLastRepairSummary(`Successfully repaired and verified ${successCount} safe issue(s).`);
    } else {
      setLastRepairSummary(
        `Repaired ${successCount} safe issue(s). ${failedCount} issue(s) failed validation:\n${failureMessages.join('\n')}`
      );
    }
  };

  if (!audit) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <ShieldCheck className="w-8 h-8 text-[#00AFFF] mx-auto" />
        <h3 className="font-['Exo_2'] font-bold text-lg text-white">
          No Audit Generated Yet
        </h3>
        <p className="text-xs text-[#79838E]">
          Build your story canon first, or click below to audit current foundation.
        </p>
        <button
          onClick={handleRerunAudit}
          disabled={isAuditing || !project.storyCanon}
          className="px-4 py-2 bg-[#00AFFF] hover:bg-[#0090D0] disabled:bg-[#1C2735] text-white text-xs font-bold rounded-lg cursor-pointer"
        >
          {isAuditing ? 'Auditing Canon...' : 'Run Canon Quality Audit'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header & Quality Score Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] mb-0.5">
            QUALITY & CONTINUITY ENGINE • STABLE TWO-LAYER AUDIT
          </div>
          <h2 className="font-['Exo_2'] font-bold text-xl text-white flex items-center space-x-2">
            <span>Canon Quality & Continuity Audit</span>
          </h2>
          <p className="text-xs text-[#79838E]">
            Layer A deterministic structural checks + Layer B creative continuity review.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {summary.unresolvedSafeToFix > 0 && (
            <button
              onClick={() => setConfirmFixAllModal(true)}
              disabled={isFixingAll}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-900/20"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Fix All Safe Issues ({summary.unresolvedSafeToFix})</span>
            </button>
          )}

          <button
            onClick={handleFastDeterministicRecheck}
            disabled={isAuditing}
            title="Fast structural validation without consuming Gemini API"
            className="bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Verify Rules</span>
          </button>

          <button
            onClick={handleRerunAudit}
            disabled={isAuditing}
            className="bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] text-xs font-semibold px-3.5 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-[#00AFFF]' : ''}`} />
            <span>Re-Run Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className="bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-[#00AFFF]/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Proceed to Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Repair Summary Notice */}
      {lastRepairSummary && (
        <div className="bg-[#111820] border border-[#1C2735] p-3.5 rounded-xl text-xs flex items-start justify-between gap-3 animate-fade-in">
          <div className="text-[#D7DCE2] whitespace-pre-line leading-relaxed">
            {lastRepairSummary}
          </div>
          <button
            onClick={() => setLastRepairSummary(null)}
            className="text-[#79838E] hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Needs Re-Audit Alert Banner */}
      {project.stage1.needsReaudit && (
        <div className="bg-[#1C1808] border border-amber-500/50 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Story Canon was modified after the last audit. Please click <strong className="text-white">"Re-Run Audit"</strong> or <strong className="text-white">"Verify Rules"</strong> to revalidate continuity.
            </span>
          </div>
          <button
            onClick={handleRerunAudit}
            disabled={isAuditing}
            className="bg-[#F4A62A] hover:bg-[#e09822] text-black font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 shrink-0 text-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>Re-Run Audit</span>
          </button>
        </div>
      )}

      {/* Audit Executive Summary Card */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-[#111820] border border-[#1C2735] flex items-center justify-center font-mono font-bold text-lg text-emerald-400">
              {audit.overallScore}
            </div>
            <div>
              <div className="text-xs font-bold text-white">Overall Continuity Score</div>
              <div className="text-[11px] text-[#79838E]">
                Audited at {new Date(audit.auditedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded font-semibold ${
                summary.unresolvedRequired > 0
                  ? 'bg-red-950 text-red-400 border border-red-500/40'
                  : 'bg-[#111820] text-[#79838E]'
              }`}
            >
              {summary.unresolvedRequired} Required Unresolved
            </span>
            <span
              className={`px-2.5 py-1 rounded font-semibold ${
                summary.unresolvedWarning > 0
                  ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                  : 'bg-[#111820] text-[#79838E]'
              }`}
            >
              {summary.unresolvedWarning} Warnings
            </span>
            <span className="bg-[#111820] text-[#79838E] px-2.5 py-1 rounded">
              {summary.unresolvedInfo} Info
            </span>
            {summary.resolvedCount > 0 && (
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded font-semibold">
                {summary.resolvedCount} Resolved
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-[#D7DCE2] leading-relaxed">
          {audit.summary}
        </p>

        {summary.isEligibleForApproval && !project.stage1.needsReaudit ? (
          <div className="bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-lg flex items-center space-x-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero blocking REQUIRED issues. Story Canon V1 is eligible for approval & lock.</span>
          </div>
        ) : summary.unresolvedRequired > 0 ? (
          <div className="bg-red-950/60 border border-red-500/40 p-2.5 rounded-lg flex items-center space-x-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              {summary.unresolvedRequired} blocking REQUIRED issue(s) remain open. Final Stage 1 approval is blocked until all required issues are resolved.
            </span>
          </div>
        ) : null}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 text-xs">
        {(['ALL', 'REQUIRED', 'WARNING', 'INFO'] as const).map((sev) => {
          const count =
            sev === 'ALL'
              ? normalizedIssues.length
              : normalizedIssues.filter((i) => i.severity === sev).length;
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                severityFilter === sev
                  ? 'bg-[#00AFFF]/20 border-[#00AFFF] text-white font-bold'
                  : 'bg-[#0B1017] border-[#1C2735] text-[#79838E] hover:text-[#D7DCE2]'
              }`}
            >
              {sev} ({count})
            </button>
          );
        })}
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 && (
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-6 text-center text-xs text-[#79838E]">
            No issues found under the "{severityFilter}" filter.
          </div>
        )}

        {filteredIssues.map((issue) => {
          const isResolved = isIssueResolved(issue);
          const isFailed = issue.status === 'FAILED';
          const isNeedsReview = issue.status === 'NEEDS_REVIEW';
          const isFixing = fixingIssueId === issue.issueId;

          return (
            <div
              key={issue.issueId}
              className={`bg-[#0B1017] border rounded-xl p-4 space-y-3 transition-colors ${
                isResolved
                  ? 'border-emerald-500/30 opacity-75 bg-[#0A1310]'
                  : isFailed
                  ? 'border-red-500/60 bg-[#160B0B]'
                  : issue.severity === 'REQUIRED'
                  ? 'border-red-500/40 hover:border-red-500/60'
                  : issue.severity === 'WARNING'
                  ? 'border-amber-500/40 hover:border-amber-500/60'
                  : 'border-[#1C2735] hover:border-[#2E3E52]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-[#1C2735]/60 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      issue.severity === 'REQUIRED'
                        ? 'bg-red-950 text-red-400 border-red-500/40'
                        : issue.severity === 'WARNING'
                        ? 'bg-amber-950 text-amber-400 border-amber-500/40'
                        : 'bg-[#141C26] text-[#00AFFF] border-[#1C2735]'
                    }`}
                  >
                    {issue.severity}
                  </span>
                  <span className="font-mono text-xs text-white font-bold">
                    {issue.issueId}
                  </span>
                  <span className="text-[11px] text-[#79838E]">
                    • Section: <strong className="text-[#D7DCE2]">{issue.section}</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {isResolved ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>RESOLVED</span>
                    </span>
                  ) : isFailed ? (
                    <span className="text-[10px] text-red-400 font-bold flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>REPAIR FAILED</span>
                    </span>
                  ) : isNeedsReview ? (
                    <span className="text-[10px] text-amber-400 font-bold flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>NEEDS REVIEW</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#79838E] font-mono">
                      {issue.classification}
                    </span>
                  )}
                </div>
              </div>

              {/* Description & Consequence */}
              <div className="text-xs space-y-1.5">
                <p className="text-white font-medium leading-relaxed">
                  {issue.description}
                </p>
                <p className="text-[11px] text-[#79838E] leading-relaxed">
                  <strong className="text-red-300">Consequence:</strong> {issue.consequence}
                </p>
              </div>

              {/* Suggested Fix */}
              <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735] text-xs">
                <span className="text-[#00AFFF] font-semibold text-[11px] block mb-0.5">
                  Suggested Resolution:
                </span>
                <p className="text-[#D7DCE2] text-[11px] leading-relaxed">
                  {issue.suggestedFix}
                </p>
              </div>

              {/* Repair Failure Notice with Retry */}
              {isFailed && issue.repairError && (
                <div className="bg-red-950/70 border border-red-500/50 p-2.5 rounded-lg text-xs text-red-200 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-red-300 block mb-0.5">Repair Error:</span>
                    <p className="text-[11px]">{issue.repairError}</p>
                  </div>
                  {issue.isSafeToAutoFix && (
                    <button
                      onClick={() => handleAutoFix(issue)}
                      disabled={isFixing}
                      className="bg-red-800 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded text-[11px] flex items-center space-x-1 shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}

              {/* Verification Details */}
              {isResolved && issue.verificationDetails && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg text-[11px] text-emerald-300">
                  <span className="font-semibold">Verified: </span>
                  {issue.verificationDetails}
                </div>
              )}

              {/* Action Buttons */}
              {!isResolved && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    onClick={() => setActiveTab('canon')}
                    className="text-[#79838E] hover:text-[#00AFFF] flex items-center space-x-1 transition-colors text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in Canon Section</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {issue.isSafeToAutoFix ? (
                      <button
                        onClick={() => handleAutoFix(issue)}
                        disabled={isFixing}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-md flex items-center space-x-1 transition-colors cursor-pointer shadow-sm shadow-emerald-900/20"
                      >
                        <Wrench className={`w-3 h-3 ${isFixing ? 'animate-spin' : ''}`} />
                        <span>{isFixing ? 'Fixing & Verifying...' : isFailed ? 'Retry Auto Fix' : 'Auto Fix Safe Issue'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('canon')}
                        className="bg-[#1C2735] hover:bg-[#2E3E52] text-[#D7DCE2] font-semibold text-xs px-3 py-1.5 rounded-md transition-colors"
                      >
                        Review Issue in Canon
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm Fix All Modal */}
      {confirmFixAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-['Exo_2'] font-bold text-base text-white">
              Apply All Safe Automated Repairs?
            </h3>
            <p className="text-xs text-[#79838E] leading-relaxed">
              This will sequentially resolve {summary.unresolvedSafeToFix} safe tracking and reference issues. Each repair will be validated before merging, preserving original story premises, character motives, and user text.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmFixAllModal(false)}
                className="px-4 py-2 text-xs text-[#D7DCE2] hover:bg-[#1C2735] rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleFixAllSafe}
                className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center space-x-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Confirm & Fix All Safe</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
