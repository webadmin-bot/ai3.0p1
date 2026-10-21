import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Film,
  Zap,
  Target,
  Compass,
  Flame,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiDevelopSelectedConcept } from '../../services/api';
import { StoryDevelopment } from '../../types/filmStudio';

export const StoryDevelopmentTab: React.FC<{ onLaunchCanonBuilder: () => void }> = ({
  onLaunchCanonBuilder,
}) => {
  const {
    project,
    setStoryDevelopment,
    setActiveTab,
  } = useProject();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const selectedConcept = project.concepts.find(
    (c) => c.conceptId === project.selectedConceptId
  );
  const development = project.storyDevelopment;

  const handleDevelopStory = async () => {
    if (!selectedConcept) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiDevelopSelectedConcept(
        selectedConcept,
        project.settings,
        project.visualStyle
      );

      if (res.success && res.development) {
        setStoryDevelopment(res.development);
        project.title = res.development.title; // Sync working title
      } else {
        setError(res.error || 'Failed to develop narrative architecture.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDevField = (field: keyof StoryDevelopment, val: any) => {
    if (!development) return;
    const updated = { ...development, [field]: val };
    setStoryDevelopment(updated);
  };

  if (!selectedConcept) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-[#F4A62A] mx-auto" />
        <h3 className="font-['Exo_2'] font-bold text-lg text-white">
          No Concept Selected
        </h3>
        <p className="text-xs text-[#79838E]">
          Please select a story concept from the deck first before developing its architecture.
        </p>
        <button
          onClick={() => setActiveTab('ideas')}
          className="px-4 py-2 bg-[#00AFFF] text-white text-xs font-bold rounded-lg"
        >
          Return to Story Ideas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] mb-0.5">
            MODE A • DEEP NARRATIVE ARCHITECTURE
          </div>
          <h2 className="font-['Exo_2'] font-bold text-xl text-white">
            Story Development
          </h2>
          <p className="text-xs text-[#79838E]">
            Selected: <strong className="text-white">"{selectedConcept.title}"</strong> ({selectedConcept.genre})
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {!development && (
            <button
              onClick={handleDevelopStory}
              disabled={isLoading}
              className="bg-[#00AFFF] hover:bg-[#0090D0] disabled:bg-[#1C2735] text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-[#00AFFF]/20 flex items-center space-x-2 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Developing Deep Architecture...' : 'Develop Selected Story'}</span>
            </button>
          )}

          {development && (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span>{isEditing ? 'Done Editing' : 'Edit Draft'}</span>
              </button>

              <button
                onClick={onLaunchCanonBuilder}
                className="bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0099DD] hover:to-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-xl shadow-[#00AFFF]/25 flex items-center space-x-2 cursor-pointer"
              >
                <Flame className="w-4 h-4 text-amber-300" />
                <span>Build Story Canon</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-950/60 border border-red-500/40 p-4 rounded-xl text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Prompt to Develop if empty */}
      {!development && !isLoading && (
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#111820] flex items-center justify-center mx-auto text-[#00AFFF]">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-['Exo_2'] font-bold text-base text-white mb-1">
              Deepen "{selectedConcept.title}" into Film Architecture
            </h3>
            <p className="text-xs text-[#79838E] max-w-md mx-auto">
              Gemini will generate protagonist wants vs subconscious needs, opposing forces, core theme, narrative engine, and ending strategy.
            </p>
          </div>
          <button
            onClick={handleDevelopStory}
            className="bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold px-6 py-3 rounded-lg shadow-lg shadow-[#00AFFF]/20 inline-flex items-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Full Architecture</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 bg-[#111820] rounded-xl" />
          <div className="h-28 bg-[#111820] rounded-xl" />
          <div className="h-40 bg-[#111820] rounded-xl" />
        </div>
      )}

      {/* Developed Blueprint View / Form */}
      {development && !isLoading && (
        <div className="space-y-5">
          {/* Title & Alternatives */}
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
            <label className="text-xs font-bold text-[#00AFFF] uppercase tracking-wider block">
              Title & Alternatives
            </label>
            {isEditing ? (
              <input
                type="text"
                value={development.title}
                onChange={(e) => updateDevField('title', e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-base font-bold text-white focus:border-[#00AFFF] focus:outline-none"
              />
            ) : (
              <h3 className="font-['Exo_2'] font-extrabold text-2xl text-white">
                {development.title}
              </h3>
            )}

            {development.titleAlternatives && development.titleAlternatives.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="text-[11px] text-[#79838E]">Alternatives:</span>
                {development.titleAlternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    onClick={() => updateDevField('title', alt)}
                    className="bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] px-2.5 py-1 rounded text-xs border border-[#1C2735] transition-colors"
                  >
                    "{alt}"
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Premise & Logline */}
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
            <label className="text-xs font-bold text-[#00AFFF] uppercase tracking-wider block">
              Authoritative Logline & Expanded Premise
            </label>
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={development.logline}
                  onChange={(e) => updateDevField('logline', e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white"
                />
                <textarea
                  rows={4}
                  value={development.expandedPremise}
                  onChange={(e) => updateDevField('expandedPremise', e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-white italic bg-[#111820] p-3 rounded-lg border border-[#1C2735]">
                  "{development.logline}"
                </p>
                <p className="text-xs text-[#D7DCE2] leading-relaxed">
                  {development.expandedPremise}
                </p>
              </div>
            )}
          </div>

          {/* Core Theme, Protagonist Want vs Need */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-1.5">
              <span className="text-[11px] font-bold text-[#00AFFF] uppercase tracking-wider block">
                Thematic Core
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={development.theme}
                  onChange={(e) => updateDevField('theme', e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2 text-xs text-white"
                />
              ) : (
                <p className="text-xs text-white font-medium">{development.theme}</p>
              )}
            </div>

            <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Protagonist Conscious Want
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={development.protagonistWant}
                  onChange={(e) => updateDevField('protagonistWant', e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2 text-xs text-white"
                />
              ) : (
                <p className="text-xs text-[#D7DCE2]">{development.protagonistWant}</p>
              )}
            </div>

            <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-1.5">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Subconscious Need (Arc)
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={development.protagonistNeed}
                  onChange={(e) => updateDevField('protagonistNeed', e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2 text-xs text-white"
                />
              ) : (
                <p className="text-xs text-[#D7DCE2]">{development.protagonistNeed}</p>
              )}
            </div>
          </div>

          {/* Opposing Force & Stakes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-1.5">
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">
                Opposing Force / Antagonism
              </span>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={development.opposingForce}
                  onChange={(e) => updateDevField('opposingForce', e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2 text-xs text-white"
                />
              ) : (
                <p className="text-xs text-[#D7DCE2] leading-relaxed">{development.opposingForce}</p>
              )}
            </div>

            <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-1.5">
              <span className="text-[11px] font-bold text-[#F4A62A] uppercase tracking-wider block">
                Stakes (Internal & External)
              </span>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={development.stakes}
                  onChange={(e) => updateDevField('stakes', e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2 text-xs text-white"
                />
              ) : (
                <p className="text-xs text-[#D7DCE2] leading-relaxed">{development.stakes}</p>
              )}
            </div>
          </div>

          {/* Narrative Engine & Ending Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#00AFFF] uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                <span>Narrative Engine (Causality Driver)</span>
              </div>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={development.narrativeEngine}
                  onChange={(e) => updateDevField('narrativeEngine', e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2 text-xs text-white"
                />
              ) : (
                <p className="text-xs text-[#D7DCE2] leading-relaxed">{development.narrativeEngine}</p>
              )}
            </div>

            <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#F4A62A] uppercase tracking-wider">
                <Target className="w-3.5 h-3.5" />
                <span>Ending & Payoff Strategy</span>
              </div>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={development.endingStrategy}
                  onChange={(e) => updateDevField('endingStrategy', e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2 text-xs text-white"
                />
              ) : (
                <p className="text-xs text-[#D7DCE2] leading-relaxed">{development.endingStrategy}</p>
              )}
            </div>
          </div>

          {/* Bottom Action */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={onLaunchCanonBuilder}
              className="bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0099DD] hover:to-blue-700 text-white font-bold text-xs px-8 py-3.5 rounded-lg shadow-xl shadow-[#00AFFF]/25 flex items-center space-x-2 cursor-pointer"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Proceed to Build Story Canon</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
