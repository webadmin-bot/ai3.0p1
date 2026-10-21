import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Lock,
  Unlock,
  Wrench,
  Check,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiAuditVisualPrompts, apiAutoFixVisualIssue } from '../../services/api';
import { Stage2AuditIssue } from '../../types/filmStudio';

export const CanonReviewTab: React.FC = () => {
  const {
    project,
    setStage2Audit,
    updateStage2AuditIssue,
    updateStage2Asset,
    approveAndLockStage2,
    unlockStage2ForRevision,
  } = useProject();

  const audit = project.stage2.audit;
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'REQUIRED' | 'WARNING' | 'INFO'>('ALL');
  const [isAuditing, setIsAuditing] = useState(false);
  const [autoFixingId, setAutoFixingId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const issues = audit?.issues || [];
  const requiredCount = issues.filter((i) => i.severity === 'REQUIRED' && i.status === 'OPEN').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING' && i.status === 'OPEN').length;
  const infoCount = issues.filter((i) => i.severity === 'INFO' && i.status === 'OPEN').length;
  const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length;

  const filteredIssues = issues.filter((issue) => {
    if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;
    return true;
  });

  const handleRunReaudit = async () => {
    if (!project.storyFoundation || !project.storyCanon) return;
    setIsAuditing(true);
    setApprovalError(null);
    try {
      const res = await apiAuditVisualPrompts({
        assets: project.stage2.assets,
        styleBible: project.stage2.styleBible,
        storyFoundation: project.storyFoundation,
        storyCanon: project.storyCanon,
      });
      if (res.success && res.audit) {
        setStage2Audit(res.audit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleAutoFix = async (issue: Stage2AuditIssue) => {
    if (!issue.assetId || !project.storyCanon) return;
    const targetAsset = project.stage2.assets.find((a) => a.id === issue.assetId);
    if (!targetAsset) return;

    setAutoFixingId(issue.issueId);
    try {
      const res = await apiAutoFixVisualIssue({
        issue,
        asset: targetAsset,
        styleBible: project.stage2.styleBible,
        storyCanon: project.storyCanon,
      });

      if (res.success && res.repairedAsset) {
        updateStage2Asset(targetAsset.id, res.repairedAsset);
        updateStage2AuditIssue(issue.issueId, { status: 'RESOLVED' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAutoFixingId(null);
    }
  };

  const handleResolveManual = (issueId: string) => {
    updateStage2AuditIssue(issueId, { status: 'RESOLVED' });
  };

  const handleApproveAndLock = () => {
    setApprovalError(null);
    const success = approveAndLockStage2();
    if (!success) {
      if (!project.stage1.locked) {
        setApprovalError('Stage 1 must be locked before approving Stage 2.');
      } else if (!project.stage2.styleBible) {
        setApprovalError('Visual Style Bible must be established first.');
      } else if (project.stage2.assets.length === 0) {
        setApprovalError('At least one visual asset prompt must be generated.');
      } else if (requiredCount > 0) {
        setApprovalError(`Cannot lock with ${requiredCount} unresolved REQUIRED audit issues.`);
      } else {
        setApprovalError('All asset prompts and visual specifications must be non-empty.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Audit Score & Top Metrics */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#79838E]">
                CANON & PROMPT QUALITY AUDIT
              </div>
              <h2 className="font-['Exo_2'] font-bold text-xl text-white">
                Visual Consistency & Readiness Score
              </h2>
              <p className="text-xs text-[#79838E]">
                Verified against Stage 1 canon facts and master style directives.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-white">
                {audit ? `${audit.overallScore}/100` : '—'}
              </div>
              <div className="text-[10px] font-semibold text-[#00AFFF]">
                {audit ? (audit.overallScore >= 90 ? 'Production Ready' : 'Review Advised') : 'Not Audited'}
              </div>
            </div>

            <button
              onClick={handleRunReaudit}
              disabled={isAuditing}
              className="px-4 py-2 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00AFFF] ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Auditing...' : 'Run Re-Audit'}</span>
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        {audit && (
          <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 text-xs text-[#D7DCE2] leading-relaxed">
            <span className="text-white font-semibold block mb-0.5">Auditor Summary:</span>
            {audit.summary}
          </div>
        )}

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              severityFilter === 'ALL'
                ? 'bg-[#00AFFF] text-white'
                : 'bg-[#111820] text-[#79838E] border border-[#1C2735]'
            }`}
          >
            All Issues ({issues.length})
          </button>

          <button
            onClick={() => setSeverityFilter('REQUIRED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              severityFilter === 'REQUIRED'
                ? 'bg-rose-600 text-white'
                : 'bg-[#111820] text-rose-400 border border-rose-500/30'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>REQUIRED ({requiredCount})</span>
          </button>

          <button
            onClick={() => setSeverityFilter('WARNING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              severityFilter === 'WARNING'
                ? 'bg-amber-600 text-white'
                : 'bg-[#111820] text-amber-400 border border-amber-500/30'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>WARNING ({warningCount})</span>
          </button>

          <button
            onClick={() => setSeverityFilter('INFO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              severityFilter === 'INFO'
                ? 'bg-sky-600 text-white'
                : 'bg-[#111820] text-sky-400 border border-sky-500/30'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>INFO ({infoCount})</span>
          </button>

          <div className="ml-auto text-xs font-mono text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{resolvedCount} Resolved</span>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.map((issue) => {
          const isOpen = issue.status === 'OPEN';
          const isAutoFixing = autoFixingId === issue.issueId;

          const severityBadge = {
            REQUIRED: 'bg-rose-950 text-rose-400 border-rose-500/40',
            WARNING: 'bg-amber-950 text-amber-400 border-amber-500/40',
            INFO: 'bg-sky-950 text-sky-400 border-sky-500/40',
          }[issue.severity];

          return (
            <div
              key={issue.issueId}
              className={`bg-[#0B1017] border rounded-xl p-4.5 space-y-3 transition-all ${
                !isOpen
                  ? 'border-[#1C2735]/40 opacity-60'
                  : issue.severity === 'REQUIRED'
                  ? 'border-rose-500/40 shadow-sm shadow-rose-500/10'
                  : 'border-[#1C2735]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C2735] pb-2.5">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-xs font-bold text-white bg-[#141C26] px-2 py-0.5 rounded border border-[#1C2735]">
                    {issue.issueId}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${severityBadge}`}>
                    {issue.severity}
                  </span>
                  {issue.assetId && (
                    <span className="font-mono text-xs text-[#00AFFF] bg-[#00AFFF]/10 px-2 py-0.5 rounded">
                      Asset: {issue.assetId}
                    </span>
                  )}
                  <span className="text-xs text-[#79838E] font-medium">
                    Field: {issue.field}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                      isOpen ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'
                    }`}
                  >
                    {issue.status}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="text-white font-medium leading-relaxed">
                  {issue.description}
                </div>
                <div className="text-[#79838E]">
                  <span className="text-[#D7DCE2] font-semibold">Cinematic Consequence: </span>
                  {issue.consequence}
                </div>
                <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735] text-[11px] text-[#00AFFF]">
                  <span className="font-semibold text-white block mb-0.5">Suggested Solution:</span>
                  {issue.suggestedFix}
                </div>
              </div>

              {/* Action Buttons */}
              {isOpen && (
                <div className="flex items-center justify-between pt-2 border-t border-[#1C2735]/60 text-xs">
                  <span className="font-mono text-[10px] text-[#79838E]">
                    Classification: {issue.fixClass}
                  </span>

                  <div className="flex items-center space-x-2">
                    {issue.fixClass === 'SAFE_AUTOFIX' && issue.assetId && (
                      <button
                        type="button"
                        onClick={() => handleAutoFix(issue)}
                        disabled={isAutoFixing}
                        className="px-3 py-1 bg-[#00AFFF] hover:bg-[#0090D0] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-sm shadow-[#00AFFF]/20 cursor-pointer"
                      >
                        <Wrench className={`w-3 h-3 ${isAutoFixing ? 'animate-spin' : ''}`} />
                        <span>{isAutoFixing ? 'Fixing...' : 'Safe Auto-Fix'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleResolveManual(issue.issueId)}
                      className="px-3 py-1 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] text-xs font-semibold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Mark Resolved</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredIssues.length === 0 && (
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center text-xs text-[#79838E]">
            {issues.length === 0
              ? 'No audit issues recorded. Run an audit to evaluate prompt quality.'
              : `No issues match the ${severityFilter} severity filter.`}
          </div>
        )}
      </div>

      {/* FINAL APPROVAL GATE CARD */}
      <div className="bg-[#0B1017] border-2 border-[#1C2735] rounded-2xl p-6 md:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF]">
              STAGE 2 FINAL GATE
            </div>
            <h3 className="font-['Exo_2'] font-bold text-xl text-white">
              Approve & Lock Visual Prompt Package V1
            </h3>
            <p className="text-xs text-[#79838E]">
              Locks master style bible and asset prompt definitions, unlocking Stage 3: Script & Shot Planner.
            </p>
          </div>

          <div>
            {project.stage2.locked ? (
              <span className="px-3.5 py-1.5 rounded-lg bg-[#F4A62A]/15 text-[#F4A62A] font-bold text-xs border border-[#F4A62A]/40 flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5" />
                <span>LOCKED V1</span>
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-lg bg-sky-950 text-[#00AFFF] font-bold text-xs border border-[#00AFFF]/40 flex items-center space-x-2">
                <span>READY FOR REVIEW</span>
              </span>
            )}
          </div>
        </div>

        {/* Readiness Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center space-x-2 bg-[#111820] p-3 rounded-lg border border-[#1C2735]">
            <CheckCircle2
              className={`w-4 h-4 ${
                project.stage1.locked ? 'text-emerald-400' : 'text-red-400'
              }`}
            />
            <span className={project.stage1.locked ? 'text-white' : 'text-[#79838E]'}>
              Stage 1 Story Canon Locked
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-[#111820] p-3 rounded-lg border border-[#1C2735]">
            <CheckCircle2
              className={`w-4 h-4 ${
                project.stage2.styleBible ? 'text-emerald-400' : 'text-red-400'
              }`}
            />
            <span className={project.stage2.styleBible ? 'text-white' : 'text-[#79838E]'}>
              Style Bible V1 Established
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-[#111820] p-3 rounded-lg border border-[#1C2735]">
            <CheckCircle2
              className={`w-4 h-4 ${
                project.stage2.assets.length > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            />
            <span className={project.stage2.assets.length > 0 ? 'text-white' : 'text-[#79838E]'}>
              Asset Manifest Synthesized ({project.stage2.assets.length} Assets)
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-[#111820] p-3 rounded-lg border border-[#1C2735]">
            <CheckCircle2
              className={`w-4 h-4 ${
                requiredCount === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            />
            <span className={requiredCount === 0 ? 'text-white' : 'text-rose-300 font-bold'}>
              Zero Open REQUIRED Issues ({requiredCount} Open)
            </span>
          </div>
        </div>

        {/* Error message */}
        {approvalError && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{approvalError}</span>
          </div>
        )}

        {/* Gate Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#1C2735]">
          <div className="text-[11px] text-[#79838E]">
            {project.stage2.locked
              ? `Approved on ${new Date(project.stage2.approvedAt || '').toLocaleDateString()}. Unlocking allows edits and flags re-audit.`
              : 'Approve to freeze prompt package and proceed to Stage 3 shot planning.'}
          </div>

          <div className="flex items-center space-x-3">
            {project.stage2.locked ? (
              <button
                type="button"
                onClick={unlockStage2ForRevision}
                className="px-4 py-2.5 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] text-xs font-semibold rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>Unlock for Revision</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApproveAndLock}
                disabled={requiredCount > 0 || project.stage2.assets.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] hover:to-[#007AB0] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>APPROVE & LOCK VISUAL PROMPT PACKAGE V1</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
