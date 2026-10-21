import React from 'react';
import {
  BookOpen,
  ArrowRight,
  Flame,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  AlertCircle,
  Layers,
  Clock,
  User,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const StoryAnalysisTab: React.FC<{ onLaunchCanonBuilder: () => void }> = ({
  onLaunchCanonBuilder,
}) => {
  const { project, setActiveTab } = useProject();

  const analysis = project.sourceDrafts.OWN_STORY?.analysis;

  if (!analysis) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-[#F4A62A] mx-auto" />
        <h3 className="font-['Exo_2'] font-bold text-lg text-white">
          No Story Analysis Yet
        </h3>
        <p className="text-xs text-[#79838E]">
          Please enter your story text and run "Analyze My Story" first.
        </p>
        <button
          onClick={() => setActiveTab('mystory')}
          className="px-4 py-2 bg-[#00AFFF] text-white text-xs font-bold rounded-lg cursor-pointer"
        >
          Return to My Story
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#F4A62A] mb-0.5">
            MODE B • FAITHFUL EXTRACTION REVIEW
          </div>
          <h2 className="font-['Exo_2'] font-bold text-xl text-white">
            Story Text Analysis
          </h2>
          <p className="text-xs text-[#79838E]">
            Verified against author's original text. Missing elements are marked UNSPECIFIED.
          </p>
        </div>

        <button
          onClick={onLaunchCanonBuilder}
          className="bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0099DD] hover:to-blue-700 text-white font-bold text-xs px-6 py-3 rounded-lg shadow-xl shadow-[#00AFFF]/25 flex items-center space-x-2 cursor-pointer"
        >
          <Flame className="w-4 h-4 text-amber-300" />
          <span>Build Story Canon</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Plot Summary */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-2">
        <span className="text-xs font-bold text-[#00AFFF] uppercase tracking-wider block">
          Faithful Plot Extraction
        </span>
        <p className="text-xs text-[#D7DCE2] leading-relaxed">
          {analysis.plotSummary}
        </p>
      </div>

      {/* Core Elements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-1.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <User className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span>Protagonist</span>
          </div>
          <p className="text-xs text-[#D7DCE2]">{analysis.protagonist}</p>
        </div>

        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-1.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Central Conflict</span>
          </div>
          <p className="text-xs text-[#D7DCE2]">{analysis.conflict}</p>
        </div>

        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-1.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>Story World</span>
          </div>
          <p className="text-xs text-[#D7DCE2]">{analysis.world}</p>
        </div>
      </div>

      {/* Characters Identified */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
        <span className="text-xs font-bold text-[#00AFFF] uppercase tracking-wider block">
          Characters Explicitly Identified in Text
        </span>
        <div className="flex flex-wrap gap-2">
          {analysis.charactersIdentified.map((c, i) => (
            <span
              key={i}
              className="bg-[#111820] text-white px-3 py-1.5 rounded-lg border border-[#1C2735] text-xs font-medium"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Major Beats & Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
          <span className="text-xs font-bold text-[#00AFFF] uppercase tracking-wider block">
            Extracted Major Beats
          </span>
          <div className="space-y-2">
            {analysis.majorBeats.map((beat, i) => (
              <div
                key={i}
                className="text-xs text-[#D7DCE2] bg-[#111820] p-2.5 rounded border border-[#1C2735] flex items-start space-x-2"
              >
                <span className="font-mono text-[10px] text-[#00AFFF] mt-0.5">
                  BEAT {i + 1}:
                </span>
                <span>{beat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
          <span className="text-xs font-bold text-[#F4A62A] uppercase tracking-wider block">
            Timeline & Setup / Payoffs
          </span>
          <div className="space-y-2 text-xs">
            <div className="bg-[#111820] p-2.5 rounded border border-[#1C2735]">
              <span className="text-[11px] font-semibold text-[#79838E] block mb-1">
                Extracted Timeline:
              </span>
              <p className="text-[#D7DCE2]">{analysis.timeline}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#79838E] block">
                Extracted Setup/Payoffs:
              </span>
              {analysis.setupPayoffs.map((sp, i) => (
                <div
                  key={i}
                  className="bg-[#111820] p-2 rounded border border-[#1C2735] text-[#D7DCE2]"
                >
                  {sp}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Unanswered Questions / Unspecified Details */}
      {analysis.unansweredQuestions && analysis.unansweredQuestions.length > 0 && (
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#79838E] uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>Unspecified in Text / Open Questions</span>
          </div>
          <div className="space-y-1 text-xs text-[#79838E]">
            {analysis.unansweredQuestions.map((q, i) => (
              <div key={i} className="flex items-center space-x-2">
                <span className="text-[#F4A62A]">?</span>
                <span>{q}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional AI Suggestions (Author-Approved) */}
      {analysis.aiSuggestions && analysis.aiSuggestions.length > 0 && (
        <div className="bg-[#111820] border border-[#00AFFF]/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#00AFFF] uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-300" />
            <span>Optional AI Creative Suggestions (Author Approval Required)</span>
          </div>
          <p className="text-[11px] text-[#79838E]">
            These are optional cinematic ideas that will NOT be incorporated into canon unless you approve them.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.aiSuggestions.map((sug, i) => (
              <div
                key={i}
                className="bg-[#0B1017] p-3 rounded-lg border border-[#1C2735] text-xs space-y-1"
              >
                <span className="text-[#00AFFF] font-semibold">{sug.area}</span>
                <p className="text-[#D7DCE2]">{sug.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Launch Button */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={onLaunchCanonBuilder}
          className="bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0099DD] hover:to-blue-700 text-white font-bold text-xs px-8 py-3.5 rounded-lg shadow-xl shadow-[#00AFFF]/25 flex items-center space-x-2 cursor-pointer"
        >
          <Flame className="w-4 h-4 text-amber-300" />
          <span>Build Story Canon from Extracted Elements</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
