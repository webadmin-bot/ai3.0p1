import React from 'react';
import {
  BookOpen,
  Image as ImageIcon,
  Clapperboard,
  Video,
  Lock,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { StageId } from '../../types/filmStudio';

export const Sidebar: React.FC = () => {
  const { project, activeStage, activePhase, setActivePhase, setViewMode } = useProject();

  const stages: Array<{
    id: 'phase1' | 'phase2' | 'phase3';
    number: number;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    isLocked: boolean;
  }> = [
    {
      id: 'phase1',
      number: 1,
      title: 'Script & Shots',
      subtitle: 'Niche, Screenplay & Shot Plan',
      icon: Sparkles,
      isLocked: Boolean(project.stage1?.locked),
    },
    {
      id: 'phase2',
      number: 2,
      title: 'Visual References',
      subtitle: 'Style Bible & Visual Reference Assets',
      icon: ImageIcon,
      isLocked: Boolean(project.stage2?.locked),
    },
    {
      id: 'phase3',
      number: 3,
      title: 'Flow Production',
      subtitle: 'Google Flow Prompts & Production Package',
      icon: Video,
      isLocked: Boolean(project.stage4?.locked),
    },
  ];

  return (
    <aside className="w-64 md:w-72 bg-[#0B1017] border-r border-[#1C2735] flex flex-col justify-between select-none">
      {/* Stages Section */}
      <div className="p-3 md:p-4 space-y-4">
        {/* Navigation to Dashboard */}
        <button
          onClick={() => setViewMode('dashboard')}
          className="w-full text-left p-2.5 rounded-lg border border-[#1C2735] bg-[#0E141D] hover:bg-[#141C26] hover:border-[#00AFFF]/40 text-[#D7DCE2] transition-all flex items-center space-x-2.5 cursor-pointer shadow-sm group"
          title="Return to My Projects Dashboard"
        >
          <div className="p-1.5 rounded-md bg-[#111820] text-[#00AFFF] group-hover:bg-[#00AFFF]/20 transition-colors">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white group-hover:text-[#00AFFF] transition-colors">
              My Projects
            </h4>
            <p className="text-[10px] text-[#79838E]">Dashboard & Productions</p>
          </div>
        </button>

        <div className="h-px bg-[#1C2735]" />

        <div>
          <div className="text-[10px] font-semibold text-[#79838E] uppercase tracking-wider px-2 mb-2">
            Production Pipeline
          </div>

          <nav className="space-y-1.5">
            {stages.map((stage) => {
              const Icon = stage.icon;
              const isActive = activePhase === stage.id || (
                stage.id === 'phase1' ? activeStage === 'stage1' || activeStage === 'stage3' :
                stage.id === 'phase2' ? activeStage === 'stage2' :
                activeStage === 'stage4'
              );

              return (
                <button
                  key={stage.id}
                  onClick={() => setActivePhase(stage.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-start space-x-3 cursor-pointer ${
                    isActive
                      ? 'bg-[#111820] border-[#00AFFF] text-white shadow-lg shadow-[#00AFFF]/10'
                      : 'bg-[#0E141D] hover:bg-[#141C26] border-[#1C2735] text-[#D7DCE2]'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-2 rounded-md ${
                      isActive
                        ? 'bg-[#00AFFF]/20 text-[#00AFFF]'
                        : 'bg-[#1C2735] text-[#D7DCE2]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-[#79838E]">
                        PHASE {stage.number}
                      </span>
                      {isActive ? (
                        <span className="text-[9px] bg-[#00AFFF]/20 text-[#00AFFF] px-1.5 py-0.2 rounded font-semibold border border-[#00AFFF]/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>ACTIVE</span>
                        </span>
                      ) : stage.isLocked ? (
                        <span className="text-[9px] bg-emerald-950/60 text-emerald-400 px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30 flex items-center space-x-0.5">
                          <Lock className="w-2.5 h-2.5" />
                          <span>LOCKED</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#55606E] font-mono">3.0</span>
                      )}
                    </div>

                    <h4 className="text-xs font-semibold truncate text-[#D7DCE2] mt-0.5">
                      {stage.title}
                    </h4>
                    <p className="text-[10px] text-[#79838E] truncate">
                      {stage.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Story Canon Quick Status Card */}
        {project.storyFoundation && (
          <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#D7DCE2]">
              <span className="text-[#00AFFF]">Canon Snapshot</span>
              <span className="text-[#79838E] text-[10px]">
                {project.storyCanon?.characters.length || 0} Chars • {project.storyCanon?.beatMap.length || 0} Beats
              </span>
            </div>
            <div className="text-[11px] text-[#79838E] line-clamp-2">
              {project.storyFoundation.logline}
            </div>
          </div>
        )}
      </div>

      {/* Footer System Info */}
      <div className="p-3 md:p-4 border-t border-[#1C2735] bg-[#090D13]">
        <div className="flex items-center justify-between text-[10px] text-[#79838E]">
          <span>Engine: Gemini 3.8 Flash</span>
          <span className="text-[#00AFFF] font-mono">v2.0.4</span>
        </div>
        <div className="text-[9px] text-[#79838E]/70 mt-1">
          XEMACS7 Cinematic Pipeline Standard
        </div>
      </div>
    </aside>
  );
};
