import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Film,
  Sparkles,
  Palette,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Layers,
  BookOpen,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const ContextPanel: React.FC = () => {
  const { project, saveStatus } = useProject();
  const [collapsed, setCollapsed] = useState(false);

  // Calculate canon completeness percentage
  const canon = project.storyCanon;
  let completenessScore = 0;
  if (project.storyFoundation) completenessScore += 20;
  if (canon?.characters && canon.characters.length > 0) completenessScore += 20;
  if (canon?.worldRules && canon.worldRules.length > 0) completenessScore += 15;
  if (canon?.beatMap && canon.beatMap.length > 0) completenessScore += 25;
  if (canon?.setupPayoffs && canon.setupPayoffs.length > 0) completenessScore += 10;
  if (canon?.timeline && canon.timeline.length > 0) completenessScore += 10;

  // Audit counts
  const issues = project.canonAudit?.issues || [];
  const requiredCount = issues.filter(
    (i) => i.severity === 'REQUIRED' && i.status === 'OPEN'
  ).length;
  const warningCount = issues.filter(
    (i) => i.severity === 'WARNING' && i.status === 'OPEN'
  ).length;
  const infoCount = issues.filter(
    (i) => i.severity === 'INFO' && i.status === 'OPEN'
  ).length;

  if (collapsed) {
    return (
      <aside className="w-10 bg-[#0B1017] border-l border-[#1C2735] flex flex-col items-center py-4 justify-between select-none">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded hover:bg-[#1C2735] text-[#79838E] hover:text-white transition-colors"
          title="Expand Context Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="rotate-90 text-[10px] font-semibold text-[#79838E] tracking-widest uppercase origin-center whitespace-nowrap mt-16">
          Context & Continuity
        </div>

        <div className="space-y-3 flex flex-col items-center">
          {requiredCount > 0 && (
            <div
              className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"
              title={`${requiredCount} Required Audit Issues`}
            />
          )}
          <div
            className="w-2 h-2 rounded-full bg-[#00AFFF]"
            title={`Canon: ${completenessScore}%`}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 md:w-80 bg-[#0B1017] border-l border-[#1C2735] flex flex-col justify-between overflow-y-auto select-none p-4 space-y-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-2.5">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#00AFFF]" />
            <h3 className="font-['Exo_2'] font-bold text-xs uppercase tracking-wider text-[#D7DCE2]">
              Context & Continuity
            </h3>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-[#1C2735] text-[#79838E] hover:text-white transition-colors"
            title="Collapse Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Source Mode Badge */}
        <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 space-y-1.5">
          <div className="text-[10px] uppercase font-semibold text-[#79838E] tracking-wider">
            Starting Workflow Mode
          </div>
          <div className="flex items-center space-x-2">
            {project.storySourceMode === 'AI_CONCEPT' && (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span className="text-xs font-semibold text-white">Mode A: AI Story Ideation</span>
              </>
            )}
            {project.storySourceMode === 'OWN_STORY' && (
              <>
                <BookOpen className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span className="text-xs font-semibold text-white">Mode B: Author's Own Story</span>
              </>
            )}
            {project.storySourceMode === 'OWN_SCRIPT' && (
              <>
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Mode C: Screenplay Import</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-[#79838E]">
            {project.storySourceMode === 'AI_CONCEPT' && 'Exploring 5 AI-generated story concepts with development.'}
            {project.storySourceMode === 'OWN_STORY' && 'Preserving author text verbatim with faithful extraction.'}
            {project.storySourceMode === 'OWN_SCRIPT' && 'Screenplay is Source of Truth; preserving dialogue lines verbatim.'}
          </p>
        </div>

        {/* Project Target Format */}
        <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-[#79838E] tracking-wider">
              Format & Timing
            </span>
            <span className="text-[10px] bg-[#1C2735] text-[#00AFFF] px-1.5 py-0.5 rounded font-mono">
              {project.settings.aspectRatio}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-[#79838E] block">Format</span>
              <span className="font-medium text-[#D7DCE2] truncate block">
                {project.settings.format}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#79838E] block">Target Runtime</span>
              <span className="font-medium text-[#D7DCE2] block font-mono">
                {project.settings.targetRuntimeSeconds}s
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#79838E] block">Tone</span>
              <span className="font-medium text-[#D7DCE2] block truncate">
                {project.settings.tone}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#79838E] block">Language</span>
              <span className="font-medium text-[#D7DCE2] block truncate">
                {project.settings.language}
              </span>
            </div>
            <div className="col-span-2 pt-1 border-t border-[#1C2735]">
              <span className="text-[10px] text-[#79838E] block mb-1">Active Genres</span>
              <div className="flex flex-wrap gap-1">
                {(project.settings.genres || []).map((g, idx) => (
                  <span
                    key={g}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      idx === 0
                        ? 'bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30'
                        : 'bg-[#1C2735] text-[#D7DCE2]'
                    }`}
                  >
                    {idx === 0 ? `★ ${g}` : g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Master Visual Style Card */}
        <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 space-y-2">
          <div className="flex items-center space-x-1.5 text-[10px] uppercase font-semibold text-[#79838E] tracking-wider">
            <Palette className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span>Master Visual Style</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white">
                {project.visualStyle.name}
              </h4>
              <span className="text-[9px] bg-[#1C2735] text-[#79838E] px-1.5 py-0.2 rounded font-mono">
                {project.visualStyle.realismLevel}
              </span>
            </div>
            <div className="text-[10px] text-[#00AFFF] font-medium">
              {project.visualStyle.medium}
            </div>
            <p className="text-[11px] text-[#79838E] leading-relaxed line-clamp-3">
              {project.visualStyle.customDescription || project.visualStyle.description}
            </p>
          </div>

          <div className="pt-2 border-t border-[#1C2735]/60 text-[10px] space-y-1 text-[#79838E]">
            <div>
              <span className="text-[#D7DCE2] font-medium">Lighting: </span>
              {project.visualStyle.lightingIntent}
            </div>
            <div>
              <span className="text-[#D7DCE2] font-medium">Texture: </span>
              {project.visualStyle.textureIntent}
            </div>
          </div>
        </div>

        {/* Canon Completeness Meter */}
        <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-[#79838E] tracking-wider">
              Canon Architecture
            </span>
            <span className="text-xs font-bold text-[#00AFFF]">
              {completenessScore}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#1C2735] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#00AFFF] to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${completenessScore}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 text-[#79838E]">
            <div className="flex items-center space-x-1">
              <span className={canon?.characters?.length ? 'text-emerald-400' : 'text-[#79838E]'}>●</span>
              <span>Characters ({canon?.characters?.length || 0})</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className={canon?.worldRules?.length ? 'text-emerald-400' : 'text-[#79838E]'}>●</span>
              <span>World Rules ({canon?.worldRules?.length || 0})</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className={canon?.beatMap?.length ? 'text-emerald-400' : 'text-[#79838E]'}>●</span>
              <span>Beats ({canon?.beatMap?.length || 0})</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className={canon?.setupPayoffs?.length ? 'text-emerald-400' : 'text-[#79838E]'}>●</span>
              <span>Setups ({canon?.setupPayoffs?.length || 0})</span>
            </div>
          </div>
        </div>

        {/* Canon Quality Audit Status */}
        <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[10px] uppercase font-semibold text-[#79838E] tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>Canon Audit</span>
            </div>
            {project.canonAudit && (
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {project.canonAudit.overallScore}/100
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded border ${
              requiredCount > 0 ? 'bg-red-950/60 text-red-400 border-red-500/40' : 'bg-[#1C2735] text-[#79838E] border-transparent'
            }`}>
              <AlertTriangle className="w-3 h-3" />
              <span>{requiredCount} Required</span>
            </div>
            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded border ${
              warningCount > 0 ? 'bg-amber-950/60 text-amber-400 border-amber-500/40' : 'bg-[#1C2735] text-[#79838E] border-transparent'
            }`}>
              <Info className="w-3 h-3" />
              <span>{warningCount} Warn</span>
            </div>
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#1C2735] text-[#79838E]">
              <span>{infoCount} Info</span>
            </div>
          </div>

          {project.stage1.needsReaudit && (
            <div className="text-[10px] text-[#F4A62A] bg-[#F4A62A]/10 p-1.5 rounded border border-[#F4A62A]/20">
              Changes detected — re-audit recommended before approval.
            </div>
          )}
        </div>

        {/* Phase 2 Visual References Card */}
        {(project.stage2.assets.length > 0 || project.stage2.unlocked) && (
          <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-[10px] uppercase font-semibold text-[#00AFFF] tracking-wider">
                <Palette className="w-3.5 h-3.5" />
                <span>Phase 2 Visual References</span>
              </div>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                project.stage2.locked
                  ? 'bg-[#F4A62A]/20 text-[#F4A62A] border border-[#F4A62A]/30'
                  : project.stage2.assets.length > 0 ? 'READY' : 'ACTIVE'
              }`}>
                {project.stage2.locked ? 'LOCKED' : project.stage2.assets.length > 0 ? 'READY' : 'ACTIVE'}
              </span>
            </div>

            <div className="text-[11px] text-[#79838E] space-y-1">
              <div className="flex justify-between">
                <span>Reference Assets:</span>
                <span className="font-mono text-white">{project.stage2.assets.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Style Bible:</span>
                <span className={project.stage2.styleBible ? 'text-emerald-400 font-medium' : 'text-[#79838E]'}>
                  {project.stage2.styleBible ? 'Active' : 'Not generated'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Phase 1 Script & Shots Summary */}
        {(project.stage3.shots.length > 0 || project.stage3.unlocked) && (
          <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-[10px] uppercase font-semibold text-[#00AFFF] tracking-wider">
                <Film className="w-3.5 h-3.5" />
                <span>Phase 1 Script & Shots</span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                {project.stage3.shots.length > 0 ? 'READY' : 'ACTIVE'}
              </span>
            </div>

            <div className="text-[11px] text-[#79838E] space-y-1">
              <div className="flex justify-between">
                <span>Screenplay Scenes:</span>
                <span className="font-mono text-white">{project.stage3.scenes?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Planned Shots:</span>
                <span className="font-mono text-white">{project.stage3.shots.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Runtime:</span>
                <span className="font-mono text-white">
                  {project.stage3.shots.reduce((acc, s) => acc + s.duration, 0)}s
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3 Flow Production Card */}
        {(project.stage4.shotPackages.length > 0 || project.stage4.unlocked) && (
          <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-[10px] uppercase font-semibold text-[#00AFFF] tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Phase 3 Flow Production</span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                {project.stage4.shotPackages.length > 0 ? 'READY' : 'ACTIVE'}
              </span>
            </div>

            <div className="text-[11px] text-[#79838E] space-y-1">
              <div className="flex justify-between">
                <span>Video Packages:</span>
                <span className="font-mono text-white">{project.stage4.shotPackages.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Flow Ready:</span>
                <span className="font-mono text-emerald-400">
                  {project.stage4.shotPackages.filter((p) => p.honestProductionStatus === 'READY_FOR_FLOW').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Continuity Note */}
      <div className="pt-3 border-t border-[#1C2735] text-[10px] text-[#79838E]">
        <div className="font-medium text-[#D7DCE2] mb-0.5">Authoritative Pipeline Handoff:</div>
        <div>Phase 1 Script & Shots and Phase 2 Visual References strictly govern Phase 3 Flow Production packages.</div>
      </div>
    </aside>
  );
};
