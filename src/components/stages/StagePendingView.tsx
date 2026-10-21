import React from 'react';
import {
  Image as ImageIcon,
  Clapperboard,
  Video,
  ArrowLeft,
  Lock,
  Layers,
  Palette,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { StageId } from '../../types/filmStudio';

export const StagePendingView: React.FC<{ stageId: StageId }> = ({ stageId }) => {
  const { project, setActiveStage } = useProject();

  const stageMeta = {
    stage2: {
      number: 2,
      title: 'VISUAL ASSET PROMPT STUDIO',
      tagline: 'Style Bible and Ready-to-Paste Character, Wardrobe, Location and Prop Prompts',
      icon: ImageIcon,
      statusMessage: 'Stage 2 implementation pending.',
      plannedOutputs: [
        'Production Style Bible (prompt parameters, lens physics, color grading directives)',
        'Character Visual Master Prompts (CHAR-01... facial structure, hair, eyes, skin rendering)',
        'Wardrobe & Costume Prompts (era-specific textiles, wear patterns, color keys)',
        'Location & Architecture Prompts (LOC-01... lighting angles, weather atmosphere)',
        'Significant Prop Prompts (PROP-01... material textures, scale markers)',
      ],
      note: 'Prompt-only specification. Does not require or invoke in-app image generation APIs.',
    },
    stage3: {
      number: 3,
      title: 'SCRIPT & SHOT PLANNER',
      tagline: 'Production Script V1 and Visual Shot Plan with 6s / 8s / 10s Modular Durations',
      icon: Clapperboard,
      statusMessage: 'Stage 3 implementation pending.',
      plannedOutputs: [
        'Production Screenplay V1 (inherited verbatim if Mode C script import)',
        'Visual Shot Plan V1 with camera movements, angles, and framing',
        'Modular planned shot durations: 6s, 8s, 10s (shot increments, not scene duration limit)',
        'Shot Ingredients & Framing Decomposition',
      ],
      note: 'Inherits Story Canon V1 beats and characters. Preserves Mode C screenplay source of truth.',
    },
    stage4: {
      number: 4,
      title: 'GOOGLE FLOW PRODUCTION STUDIO',
      tagline: 'Full Per-Shot Video Prompts, Continuity Audio, Timing and Export',
      icon: Video,
      statusMessage: 'Stage 4 implementation pending.',
      plannedOutputs: [
        'Per-shot Google Flow video prompts matching target model capabilities',
        'Audio & Dialogue timing tracks',
        'Multi-shot video pacing & continuity payload',
        'Production export bundles',
      ],
      note: 'Will dynamically verify Google video model duration and aspect ratio capabilities.',
    },
  }[stageId as 'stage2' | 'stage3' | 'stage4'];

  const Icon = stageMeta.icon;

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Return Button */}
      <button
        onClick={() => setActiveStage('stage1')}
        className="flex items-center space-x-1.5 text-xs text-[#79838E] hover:text-[#00AFFF] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Stage 1: Story & Canon Studio</span>
      </button>

      {/* Main Pending Banner */}
      <div className="bg-[#0B1017] border-2 border-[#1C2735] rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-5">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#79838E]">
                STAGE {stageMeta.number} • FUTURE PIPELINE
              </div>
              <h2 className="font-['Exo_2'] font-bold text-xl text-white">
                {stageMeta.title}
              </h2>
              <p className="text-xs text-[#00AFFF]">
                {stageMeta.tagline}
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#111820] border border-[#1C2735] text-xs font-mono text-[#F4A62A] flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#F4A62A] animate-pulse" />
            <span>{stageMeta.statusMessage}</span>
          </div>
        </div>

        {/* Planned Stage Architecture */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Planned Downstream Outputs
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {stageMeta.plannedOutputs.map((out, idx) => (
              <div
                key={idx}
                className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] text-xs text-[#D7DCE2] flex items-start space-x-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00AFFF] mt-0.5 shrink-0" />
                <span>{out}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#79838E] italic pt-1">
            {stageMeta.note}
          </p>
        </div>

        {/* Inherited Stage 1 Contract Handoff Preview */}
        {project.storyFoundation && (
          <div className="bg-[#111820] border border-[#00AFFF]/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1C2735] pb-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#00AFFF] uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                <span>Inherited Stage 1 Production Contract</span>
              </div>
              {project.stage1.locked && (
                <span className="text-[10px] bg-[#F4A62A]/20 text-[#F4A62A] px-2 py-0.5 rounded font-bold font-mono">
                  CANON V1 LOCKED
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#0B1017] p-3 rounded-lg border border-[#1C2735] space-y-1">
                <span className="text-[#79838E] text-[10px] block">Project Foundation</span>
                <span className="text-white font-bold block truncate">
                  {project.storyFoundation.title}
                </span>
                <span className="text-[11px] text-[#79838E] block">
                  {project.settings.format} • {project.settings.targetRuntimeSeconds}s
                </span>
              </div>

              <div className="bg-[#0B1017] p-3 rounded-lg border border-[#1C2735] space-y-1">
                <span className="text-[#79838E] text-[10px] block">Master Visual Style</span>
                <span className="text-[#00AFFF] font-bold block truncate">
                  {project.visualStyle.name}
                </span>
                <span className="text-[11px] text-[#79838E] block truncate">
                  {project.visualStyle.medium}
                </span>
              </div>

              <div className="bg-[#0B1017] p-3 rounded-lg border border-[#1C2735] space-y-1">
                <span className="text-[#79838E] text-[10px] block">Character Roster</span>
                <span className="text-white font-bold block">
                  {project.storyCanon?.characters.length || 0} Canonical Characters
                </span>
                <span className="text-[11px] text-[#79838E] block">
                  Ready for Stage 2 Image Prompts
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-start">
          <button
            onClick={() => setActiveStage('stage1')}
            className="bg-[#1C2735] hover:bg-[#2E3E52] text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Stage 1 Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
