import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  RefreshCw,
  Wrench,
  Sparkles,
  Filter,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Stage3AuditIssue } from '../../types/filmStudio';
import { apiAuditStage3, apiAutoFixStage3Issue } from '../../services/api';

interface AuditTabProps {
  onOpenSceneOrShot?: (sceneId?: string, shotId?: string) => void;
}

export const AuditTab: React.FC<AuditTabProps> = ({ onOpenSceneOrShot }) => {
  const {
    project,
    setStage3Audit,
    updateStage3AuditIssue,
    updateStage3Shot,
    updateStage3Scene,
  } = useProject();

  const audit = project.stage3.audit;
  const issues = audit?.issues || [];
  const shots = project.stage3.shots || [];
  const scenes = project.stage3.scenes || [];

  const [isAuditing, setIsAuditing] = useState(false);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'REQUIRED' | 'WARNING' | 'INFO'>('ALL');

  const requiredCount = issues.filter((i) => i.severity === 'REQUIRED' && i.status === 'OPEN').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING' && i.status === 'OPEN').length;
  const infoCount = issues.filter((i) => i.severity === 'INFO' && i.status === 'OPEN').length;
  const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length;

  const safeIssues = issues.filter((i) => i.fixClass === 'SAFE_AUTOFIX' && i.status === 'OPEN');

  const filteredIssues = issues.filter((i) => {
    if (severityFilter === 'ALL') return true;
    return i.severity === severityFilter;
  });

  const handleRunAudit = async () => {
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
        targetRuntime: project.settings?.targetRuntimeSeconds,
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

  const handleFixIssue = async (issue: Stage3AuditIssue) => {
    setFixingIssueId(issue.issueId);
    updateStage3AuditIssue(issue.issueId, { status: 'FIXING' });

    try {
      // Find relevant shot or scene
      const targetShot = shots.find((s) => s.shotId === issue.shotId);
      const targetScene = scenes.find((s) => s.sceneId === issue.sceneId);

      // 1. Programmatic Shot Duration Fix
      if (issue.category === 'SHOT_DURATION' && targetShot) {
        let repairedDuration: 6 | 8 | 10 = 8;
        const maxDur = project.stage3.settings?.maxShotDuration || 10;
        const currentDur = Number(targetShot.duration);
        if (currentDur > maxDur) {
          repairedDuration = (maxDur === 6 ? 6 : 8) as 6 | 8 | 10;
        } else if (currentDur < 6) {
          repairedDuration = 6;
        } else if (currentDur !== 6 && currentDur !== 8 && currentDur !== 10) {
          repairedDuration = 8;
        } else {
          repairedDuration = (currentDur as 6 | 8 | 10);
        }
        updateStage3Shot(targetShot.shotId, { duration: repairedDuration });
        updateStage3AuditIssue(issue.issueId, { status: 'RESOLVED' });
        return;
      }

      // 2. Programmatic First Frame Prompt Fix
      if (issue.category === 'FIRST_FRAME_PROMPT' && targetShot) {
        const generatedPrompt = `${project.visualStyle.name} opening still keyframe for shot ${targetShot.shotId}: ${targetShot.shotSize} framing of ${targetShot.characterIds.join(', ')} in ${targetShot.locationId}. Lighting: ${targetShot.lightingAndAtmosphere}. Lens: ${targetShot.lensIntent || '35mm anamorphic'}. Staging: ${targetShot.blockingAndMovement}.`;
        updateStage3Shot(targetShot.shotId, { firstFramePrompt: generatedPrompt });
        updateStage3AuditIssue(issue.issueId, { status: 'RESOLVED' });
        return;
      }

      // 3. API-based safe surgical auto-fix
      const res = await apiAutoFixStage3Issue({
        issue,
        shot: targetShot,
        scene: targetScene,
        styleBible: project.stage2.styleBible,
        stage2Assets: project.stage2.assets,
      });

      if (res.success) {
        if (res.repairedShot && targetShot) {
          updateStage3Shot(targetShot.shotId, res.repairedShot);
        }
        if (res.repairedScene && targetScene) {
          updateStage3Scene(targetScene.sceneId, res.repairedScene);
        }
        updateStage3AuditIssue(issue.issueId, { status: 'RESOLVED' });
      } else {
        updateStage3AuditIssue(issue.issueId, { status: 'FAILED' });
      }
    } catch (err) {
      console.error(err);
      updateStage3AuditIssue(issue.issueId, { status: 'FAILED' });
    } finally {
      setFixingIssueId(null);
    }
  };

  const handleFixAllSafe = async () => {
    setIsFixingAll(true);
    for (const issue of safeIssues) {
      await handleFixIssue(issue);
    }
    setIsFixingAll(false);
  };

  if (!audit) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 md:p-12 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF] mx-auto shadow-lg shadow-[#00AFFF]/10">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-lg mx-auto">
          <h3 className="font-['Exo_2'] font-bold text-xl text-white">
            Stage 3 Audit Not Run Yet
          </h3>
          <p className="text-xs text-[#79838E] leading-relaxed">
            Run a deep verification on strict 6s/8s/10s duration invariants, scene-to-shot coverage, Google Flow first frame prompts, and canon fidelity.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="px-6 py-2.5 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#00AFFF]/20 flex items-center space-x-2 mx-auto cursor-pointer transition-all disabled:opacity-50"
          >
            {isAuditing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Audit...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Run Stage 3 Audit Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Executive Summary & Score Header */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {/* Score Circle */}
          <div
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-mono font-bold border shrink-0 ${
              audit.overallScore >= 90
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                : audit.overallScore >= 75
                ? 'bg-amber-950/40 border-amber-500/40 text-[#F4A62A]'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
            }`}
          >
            <span className="text-xl leading-none">{audit.overallScore}</span>
            <span className="text-[9px] text-[#79838E]">/ 100</span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-['Exo_2'] font-bold text-white text-base">
                Canon & Production Audit Summary
              </h3>
              {requiredCount === 0 ? (
                <span className="text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                  APPROVAL READY
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold bg-rose-950/60 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded">
                  {requiredCount} REQUIRED ISSUES BLOCKING APPROVAL
                </span>
              )}
            </div>
            <p className="text-xs text-[#79838E] mt-1 leading-relaxed max-w-xl">
              {audit.summary}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          {safeIssues.length > 0 && (
            <button
              onClick={handleFixAllSafe}
              disabled={isFixingAll}
              className="px-3.5 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-[#00AFFF]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isFixingAll ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wrench className="w-3.5 h-3.5" />
              )}
              <span>Fix All Safe ({safeIssues.length})</span>
            </button>
          )}

          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="px-3.5 py-2 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-white text-xs font-bold flex items-center space-x-1.5 border border-[#1C2735] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>Re-Audit</span>
          </button>
        </div>
      </div>

      {/* Severity Filter Bar */}
      <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1">
        <span className="text-[#79838E] text-[11px] flex items-center space-x-1">
          <Filter className="w-3 h-3" />
          <span>Filter:</span>
        </span>
        <button
          onClick={() => setSeverityFilter('ALL')}
          className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
            severityFilter === 'ALL'
              ? 'bg-[#00AFFF] text-white font-bold'
              : 'bg-[#111820] text-[#79838E] hover:text-white border border-[#1C2735]'
          }`}
        >
          All Issues ({issues.length})
        </button>
        <button
          onClick={() => setSeverityFilter('REQUIRED')}
          className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
            severityFilter === 'REQUIRED'
              ? 'bg-rose-500 text-white font-bold'
              : 'bg-[#111820] text-rose-400 hover:text-white border border-rose-500/30'
          }`}
        >
          Required ({requiredCount})
        </button>
        <button
          onClick={() => setSeverityFilter('WARNING')}
          className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
            severityFilter === 'WARNING'
              ? 'bg-[#F4A62A] text-white font-bold'
              : 'bg-[#111820] text-[#F4A62A] hover:text-white border border-amber-500/30'
          }`}
        >
          Warning ({warningCount})
        </button>
        <button
          onClick={() => setSeverityFilter('INFO')}
          className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
            severityFilter === 'INFO'
              ? 'bg-blue-500 text-white font-bold'
              : 'bg-[#111820] text-blue-400 hover:text-white border border-blue-500/30'
          }`}
        >
          Info ({infoCount})
        </button>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.map((issue) => {
          const isResolved = issue.status === 'RESOLVED';
          const isFixing = fixingIssueId === issue.issueId || issue.status === 'FIXING';
          const isRequired = issue.severity === 'REQUIRED';

          return (
            <div
              key={issue.issueId}
              className={`bg-[#0B1017] border rounded-xl p-4 transition-all space-y-3 ${
                isResolved
                  ? 'border-emerald-500/20 opacity-70'
                  : isRequired
                  ? 'border-rose-500/40 bg-rose-950/10'
                  : 'border-[#1C2735]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C2735] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-white">
                    {issue.issueId}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isRequired
                        ? 'bg-rose-950/60 text-rose-400 border-rose-500/40'
                        : issue.severity === 'WARNING'
                        ? 'bg-amber-950/60 text-[#F4A62A] border-amber-500/40'
                        : 'bg-blue-950/60 text-blue-400 border-blue-500/40'
                    }`}
                  >
                    {issue.severity}
                  </span>
                  <span className="text-[10px] font-mono text-[#79838E] bg-[#111820] px-2 py-0.5 rounded border border-[#1C2735]">
                    {issue.category}
                  </span>
                  {issue.shotId && (
                    <span className="text-[10px] font-mono text-[#00AFFF]">
                      Shot: {issue.shotId}
                    </span>
                  )}
                  {issue.sceneId && (
                    <span className="text-[10px] font-mono text-[#79838E]">
                      Scene: {issue.sceneId}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isResolved
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                        : issue.fixClass === 'SAFE_AUTOFIX'
                        ? 'bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30'
                        : 'bg-amber-950/60 text-[#F4A62A] border border-amber-500/30'
                    }`}
                  >
                    {isResolved ? 'RESOLVED' : issue.fixClass}
                  </span>

                  {!isResolved && issue.fixClass === 'SAFE_AUTOFIX' && (
                    <button
                      onClick={() => handleFixIssue(issue)}
                      disabled={isFixing}
                      className="px-2.5 py-1 rounded bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold flex items-center space-x-1 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isFixing ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Wrench className="w-3 h-3" />
                      )}
                      <span>Auto Fix</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Description & Consequence */}
              <div className="space-y-1.5 text-xs">
                <p className="text-white font-medium">{issue.description}</p>
                <div className="text-[11px] text-[#79838E]">
                  <strong className="text-rose-400">Production Consequence:</strong> {issue.consequence}
                </div>
                <div className="text-[11px] text-[#D7DCE2] bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
                  <strong className="text-[#00AFFF]">Suggested Fix:</strong> {issue.suggestedFix}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
