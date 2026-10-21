import React from 'react';
import { Sparkles, BookOpen, Clapperboard, Check } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { StorySourceMode } from '../../types/filmStudio';

export const ModeSelector: React.FC = () => {
  const {
    project,
    setStorySourceMode,
    modeSwitchPrompt,
    confirmModeSwitch,
    cancelModeSwitch,
  } = useProject();

  const modes: Array<{
    id: StorySourceMode;
    letter: string;
    title: string;
    description: string;
    tagline: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'AI_CONCEPT',
      letter: 'A',
      title: 'GENERATE STORY CONCEPTS',
      tagline: 'Discover five original AI-generated story concepts.',
      description: 'Explore diverse high-concept story pitches shaped by your format, genre, and visual style. Select the best concept and develop its full narrative architecture.',
      icon: Sparkles,
    },
    {
      id: 'OWN_STORY',
      letter: 'B',
      title: 'MY OWN STORY',
      tagline: 'Paste or write your original story, premise or outline.',
      description: 'Bring your original writing, treatment, or premise. Gemini analyzes your text verbatim, marks unspecified details, and builds an authoritative canon without inventing major facts.',
      icon: BookOpen,
    },
    {
      id: 'OWN_SCRIPT',
      letter: 'C',
      title: 'MY OWN SCRIPT',
      tagline: 'Import an existing screenplay and preserve its dialogue and scenes.',
      description: 'Import or paste an existing screenplay. Extracts scenes, sluglines, and verbatim dialogue lines to build a production canon while flagging your script as the Source of Truth.',
      icon: Clapperboard,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="border-b border-[#1C2735] pb-5">
        <div className="flex items-center space-x-2 text-[11px] font-semibold tracking-widest text-[#00AFFF] uppercase mb-1">
          <span>STAGE 1 • PRE-PRODUCTION FOUNDATION</span>
        </div>
        <h1 className="font-['Exo_2'] font-extrabold text-2xl md:text-3xl text-white tracking-tight">
          STORY & CANON STUDIO
        </h1>
        <p className="text-sm text-[#79838E] mt-1">
          Every great film begins with a story. Choose how you want to start.
        </p>
      </div>

      {/* 3 Prominent Starting Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = project.storySourceMode === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setStorySourceMode(mode.id)}
              className={`relative text-left p-5 rounded-xl border-2 transition-all flex flex-col justify-between group ${
                isSelected
                  ? 'bg-[#0E1722] border-[#00AFFF] shadow-xl shadow-[#00AFFF]/15'
                  : 'bg-[#0B1017] hover:bg-[#111820] border-[#1C2735] text-[#D7DCE2] hover:border-[#2E3E52]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#00AFFF] text-white shadow-md shadow-[#00AFFF]/30'
                        : 'bg-[#141C26] text-[#79838E] group-hover:text-[#D7DCE2]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Radio / Check badge */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-[#00AFFF] border-[#00AFFF] text-white'
                        : 'border-[#2E3E52] bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="text-[10px] font-bold text-[#79838E] uppercase tracking-wider mb-1">
                  MODE {mode.letter}
                </div>
                <h3 className="font-['Exo_2'] font-bold text-sm md:text-base text-white tracking-wide mb-2">
                  {mode.title}
                </h3>
                <p className="text-xs font-medium text-[#00AFFF] mb-2 leading-relaxed">
                  "{mode.tagline}"
                </p>
                <p className="text-xs text-[#79838E] leading-relaxed">
                  {mode.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#1C2735] flex items-center justify-between text-[11px]">
                <span
                  className={
                    isSelected
                      ? 'text-[#00AFFF] font-semibold'
                      : 'text-[#79838E] group-hover:text-[#D7DCE2]'
                  }
                >
                  {isSelected ? 'Active Mode' : 'Select Mode'}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-[#00AFFF] animate-pulse" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mode Switch Safety Confirmation Modal */}
      {modeSwitchPrompt.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-['Exo_2'] font-bold text-lg text-white mb-2">
              Confirm Workflow Mode Switch
            </h3>
            <p className="text-xs text-[#79838E] mb-4 leading-relaxed">
              You are switching from{' '}
              <span className="text-white font-semibold">
                {project.storySourceMode}
              </span>{' '}
              to{' '}
              <span className="text-[#00AFFF] font-semibold">
                {modeSwitchPrompt.targetMode}
              </span>
              . Your existing inputs will be saved to your mode drafts, but your
              active workspace view will adapt to the new workflow.
            </p>
            <div className="bg-[#090D13] p-3 rounded border border-[#1C2735] text-[11px] text-[#79838E] mb-6">
              • Original text, scripts, or concepts are never deleted.
              <br />• You can switch back at any time and recover your drafts.
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelModeSwitch}
                className="px-4 py-2 text-xs text-[#D7DCE2] hover:bg-[#1C2735] rounded transition-colors"
              >
                Keep Current Mode
              </button>
              <button
                onClick={confirmModeSwitch}
                className="px-4 py-2 text-xs bg-[#00AFFF] hover:bg-[#0090D0] text-white font-semibold rounded transition-colors"
              >
                Switch Workflow Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
