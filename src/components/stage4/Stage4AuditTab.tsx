import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Wrench,
  ExternalLink,
  ChevronRight,
  Flame,
  Check,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiAuditStage4, apiAutoFixStage4Issue } from '../../services/api';
import { Stage4AuditIssue, GoogleFlowShotPackage } from '../../types/filmStudio';

interface Stage4AuditTabProps {
  onOpenShotEdit: (pkg: GoogleFlowShotPackage) => void;
  onNavigateToShot: (shotId: string) => void;
}

export const Stage4AuditTab: React.FC<Stage4AuditTabProps> = ({
  onOpenShotEdit,
  onNavigateToShot,
}) => {
  const {
    project,
    setStage4Audit,
    updateStage4AuditIssue,
    updateStage4ShotPackage,
    setStage4Tab,
  } = useProject();

  const [isAuditing, setIsAuditing] = useState(false);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'REQUIRED' | 'WARNING' | 'INFO'>('ALL');

  const audit = project.stage4.audit;
  const packages = project.stage4.shotPackages || [];
  const shots = project.stage3.shots || [];
  const stage2Assets = project.stage2.assets || [];
  const styleBible = project.stage2.styleBible;

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await apiAuditStage4({
        shotPackages: packages,
        shots,
        storyCanon: project.storyCanon!,
        storySourceMode: project.storySourceMode,
        importedScript: project.importedScript,
        stage2Assets,
        styleBible,
      });

      if (res.success && res.audit) {
        setStage4Audit(res.audit);
      }
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleAutoFix = async (issue: Stage4AuditIssue) => {
    const targetPkg = packages.find((p) => p.shotId === issue.shotId);
    if (!targetPkg) return;

    setFixingIssueId(issue.issueId);
    try {
      const res = await apiAutoFixStage4Issue({
        issue,
        shotPackage: targetPkg,
        styleBible,
        stage2Assets,
      });

      if (res.success && res.repairedPackage) {
        updateStage4ShotPackage(targetPkg.shotId, res.repairedPackage);
        updateStage4AuditIssue(issue.issueId, { status: 'RESOLVED' });
      }
    } catch (err) {
      console.error('Auto-fix failed:', err);
    } finally {
      setFixingIssueId(null);
    }
  };

  const handleFixAllSafe = async () => {
    if (!audit) return;
    const safeIssues = audit.issues.filter(
      (i) => i.fixClass === 'SAFE_AUTOFIX' && i.status === 'OPEN'
    );
    if (safeIssues.length === 0) return;

    setIsFixingAll(true);
    for (const issue of safeIssues) {
      await handleAutoFix(issue);
    }
    setIsFixingAll(false);
  };

  const issues = audit?.issues || [];
  const requiredCount = issues.filter((i) => i.severity === 'REQUIRED' && i.status === 'OPEN').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING' && i.status === 'OPEN').length;
  const infoCount = issues.filter((i) => i.severity === 'INFO' && i.status === 'OPEN').length;
  const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length;

  const filteredIssues = issues.filter((i) => {
    if (filterSeverity === 'ALL') return true;
    return i.severity === filterSeverity;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Audit Header */}
      <div className="bg-[#111820] border border-[#1C2735] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-bold text-xl border ${
              requiredCount === 0
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400'
                : 'bg-red-950/70 border-red-500/40 text-red-400'
            }`}
          >
            {audit?.overallScore ?? 100}%
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-[#00AFFF] uppercase tracking-wider">
                STAGE 4 PRODUCTION AUDIT
              </span>
              <span className="text-[10px] text-[#79838E]">
                • {packages.length} shots inspected
              </span>
            </div>
            <h3 className="font-['Exo_2'] font-bold text-xl text-white">
              {requiredCount === 0
                ? 'Zero Textual Blockers — Production Package Verified'
                : `${requiredCount} Required Textual Issues Detected`}
            </h3>
            <p className="text-xs text-[#79838E] mt-0.5">
              {audit?.summary || 'Continuity, duration adherence, prompt completeness, and capability checks.'}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {issues.some((i) => i.fixClass === 'SAFE_AUTOFIX' && i.status === 'OPEN') && (
            <button
              onClick={handleFixAllSafe}
              disabled={isFixingAll}
              className="px-4 py-2 bg-gradient-to-r from-[#F4A62A] to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-all shadow-lg shadow-[#F4A62A]/20 cursor-pointer disabled:opacity-50"
            >
              {isFixingAll ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Fixing All...</span>
                </>
              ) : (
                <>
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Fix All Safe Issues</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={runAudit}
            disabled={isAuditing}
            className="px-4 py-2 bg-[#141C26] hover:bg-[#1C2735] text-white font-semibold text-xs rounded-lg border border-[#1C2735] hover:border-[#00AFFF] flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00AFFF] ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditing...' : 'Re-run Full Audit'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1C2735] pb-2 text-xs">
        <button
          onClick={() => setFilterSeverity('ALL')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filterSeverity === 'ALL'
              ? 'bg-[#141C26] text-white border border-[#1C2735]'
              : 'text-[#79838E] hover:text-white'
          }`}
        >
          All Issues ({issues.length})
        </button>
        <button
          onClick={() => setFilterSeverity('REQUIRED')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
            filterSeverity === 'REQUIRED'
              ? 'bg-red-950/60 text-red-300 border border-red-500/40'
              : 'text-[#79838E] hover:text-red-300'
          }`}
        >
          <span>Required Blockers</span>
          <span className="font-mono bg-red-950 px-1.5 py-0.2 rounded text-[10px] text-red-400">
            {requiredCount}
          </span>
        </button>
        <button
          onClick={() => setFilterSeverity('WARNING')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
            filterSeverity === 'WARNING'
              ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
              : 'text-[#79838E] hover:text-amber-300'
          }`}
        >
          <span>Warnings (Media & Capability)</span>
          <span className="font-mono bg-amber-950 px-1.5 py-0.2 rounded text-[10px] text-amber-400">
            {warningCount}
          </span>
        </button>
        <button
          onClick={() => setFilterSeverity('INFO')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
            filterSeverity === 'INFO'
              ? 'bg-sky-950/60 text-sky-300 border border-sky-500/40'
              : 'text-[#79838E] hover:text-sky-300'
          }`}
        >
          <span>Info Notes</span>
          <span className="font-mono bg-sky-950 px-1.5 py-0.2 rounded text-[10px] text-sky-400">
            {infoCount}
          </span>
        </button>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.map((issue) => {
          const isResolved = issue.status === 'RESOLVED';
          const targetPkg = packages.find((p) => p.shotId === issue.shotId);

          return (
            <div
              key={issue.issueId}
              className={`bg-[#0B1017] border rounded-xl p-4 transition-all space-y-2.5 ${
                isResolved
                  ? 'border-emerald-500/30 opacity-60'
                  : issue.severity === 'REQUIRED'
                  ? 'border-red-500/40'
                  : issue.severity === 'WARNING'
                  ? 'border-amber-500/30'
                  : 'border-[#1C2735]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] font-bold text-[#79838E] bg-[#111820] px-2 py-0.5 rounded border border-[#1C2735]">
                    {issue.issueId}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      issue.severity === 'REQUIRED'
                        ? 'bg-red-950 text-red-400 border border-red-500/30'
                        : issue.severity === 'WARNING'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-950 text-sky-400 border border-sky-500/30'
                    }`}
                  >
                    {issue.severity}
                  </span>

                  {issue.shotId && (
                    <span className="font-mono text-xs font-bold text-[#00AFFF]">
                      [{issue.shotId}]
                    </span>
                  )}

                  <span className="text-[11px] font-mono text-[#79838E]">
                    Field: {issue.fieldPath}
                  </span>
                </div>

                {/* Status & Action */}
                <div className="flex items-center space-x-2">
                  {isResolved ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolved</span>
                    </span>
                  ) : (
                    <>
                      {issue.fixClass === 'SAFE_AUTOFIX' && (
                        <button
                          onClick={() => handleAutoFix(issue)}
                          disabled={fixingIssueId === issue.issueId}
                          className="px-2.5 py-1 bg-[#F4A62A]/20 hover:bg-[#F4A62A]/30 text-[#F4A62A] text-xs font-bold rounded border border-[#F4A62A]/40 flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>{fixingIssueId === issue.issueId ? 'Fixing...' : 'Auto Fix'}</span>
                        </button>
                      )}

                      {targetPkg && (
                        <button
                          onClick={() => onOpenShotEdit(targetPkg)}
                          className="px-2.5 py-1 bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-xs font-semibold rounded border border-[#1C2735] hover:border-[#00AFFF] flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <span>Open Shot</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-[#D7DCE2] font-semibold">
                {issue.description}
              </p>

              {/* Consequence & Suggested Fix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-[#111820] p-2.5 rounded-lg">
                <div>
                  <span className="text-[#79838E] block">Consequence:</span>
                  <span className="text-[#D7DCE2]">{issue.consequence}</span>
                </div>
                <div>
                  <span className="text-emerald-400 block font-semibold">Suggested Fix:</span>
                  <span className="text-[#D7DCE2]">{issue.suggestedFix}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredIssues.length === 0 && (
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center text-xs text-[#79838E] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-white font-semibold">No issues in this severity filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
