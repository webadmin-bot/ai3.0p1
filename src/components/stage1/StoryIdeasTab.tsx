import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Eye,
  ArrowRight,
  Film,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  apiGenerateStoryConcepts,
  apiRegenerateSingleConcept,
} from '../../services/api';
import { StoryConcept } from '../../types/filmStudio';

export const StoryIdeasTab: React.FC = () => {
  const {
    project,
    setConcepts,
    selectConceptId,
    setActiveTab,
  } = useProject();

  const [isLoading, setIsLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailConcept, setDetailConcept] = useState<StoryConcept | null>(null);
  const [regenGuidance, setRegenGuidance] = useState<string>('');
  const [promptRegenFor, setPromptRegenFor] = useState<StoryConcept | null>(null);

  // Generate 5 ideas with Gemini
  const handleGenerateFive = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGenerateStoryConcepts(
        project.settings,
        project.visualStyle,
        project.title !== 'Untitled Film Project' ? project.title : undefined
      );

      if (res.success && res.concepts) {
        setConcepts(res.concepts);
        // Automatically select first if none selected
        if (!project.selectedConceptId && res.concepts.length > 0) {
          selectConceptId(res.concepts[0].conceptId);
        }
      } else {
        setError(res.error || 'Failed to generate story concepts.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while calling Gemini API.');
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate 1 specific concept
  const handleRegenerateSingle = async (
    targetConcept: StoryConcept,
    guidance?: string
  ) => {
    setRegeneratingId(targetConcept.conceptId);
    setError(null);
    try {
      const otherConcepts = project.concepts.filter(
        (c) => c.conceptId !== targetConcept.conceptId
      );

      const res = await apiRegenerateSingleConcept(
        targetConcept,
        otherConcepts,
        project.settings,
        project.visualStyle,
        guidance
      );

      if (res.success && res.concept) {
        const updated = project.concepts.map((c) =>
          c.conceptId === targetConcept.conceptId ? res.concept! : c
        );
        setConcepts(updated);
        setPromptRegenFor(null);
        setRegenGuidance('');
      } else {
        setError(res.error || 'Failed to regenerate concept.');
      }
    } catch (err: any) {
      setError(err.message || 'Error regenerating concept.');
    } finally {
      setRegeneratingId(null);
    }
  };

  const selectedConcept = project.concepts.find(
    (c) => c.conceptId === project.selectedConceptId
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Tab Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] mb-0.5">
            MODE A • ORIGINAL AI IDEATION
          </div>
          <h2 className="font-['Exo_2'] font-bold text-xl text-white">
            Story Concepts Deck
          </h2>
          <p className="text-xs text-[#79838E]">
            Generate 5 distinct narrative angles tailored to{' '}
            <span className="text-[#D7DCE2] font-semibold">{project.settings.format}</span> and{' '}
            <span className="text-[#00AFFF] font-semibold">{project.visualStyle.name}</span>.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleGenerateFive}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-[#00AFFF] hover:bg-[#0090D0] disabled:bg-[#1C2735] disabled:text-[#79838E] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-[#00AFFF]/20 transition-all cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>
              {isLoading
                ? 'Architecting 5 Concepts...'
                : project.concepts.length > 0
                ? 'Generate 5 New Ideas'
                : 'Generate 5 Story Ideas'}
            </span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-950/60 border border-red-500/40 p-4 rounded-xl flex items-start space-x-3 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-red-300">Generation Error</div>
            <div>{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Empty State / Initial Call to Action */}
      {project.concepts.length === 0 && !isLoading && (
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-10 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-[#111820] border border-[#1C2735] flex items-center justify-center mx-auto text-[#00AFFF] shadow-xl">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-['Exo_2'] font-bold text-lg text-white mb-1">
              No Concepts Generated Yet
            </h3>
            <p className="text-xs text-[#79838E] max-w-md mx-auto leading-relaxed">
              Click <span className="text-[#00AFFF] font-semibold">Generate 5 Story Ideas</span> to have Gemini's cinematic engine craft 5 distinct, high-concept narratives matching your project settings and chosen visual style.
            </p>
          </div>
          <button
            onClick={handleGenerateFive}
            className="bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold text-xs px-6 py-3 rounded-lg shadow-xl shadow-[#00AFFF]/25 transition-all inline-flex items-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate 5 Story Ideas Now</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3 animate-pulse"
            >
              <div className="h-4 bg-[#1C2735] rounded w-2/3" />
              <div className="h-3 bg-[#111820] rounded w-1/3" />
              <div className="h-16 bg-[#111820] rounded" />
              <div className="h-10 bg-[#141C26] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Concept Cards Deck */}
      {project.concepts.length > 0 && !isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.concepts.map((concept, index) => {
              const isSelected = project.selectedConceptId === concept.conceptId;
              const isRegenerating = regeneratingId === concept.conceptId;

              return (
                <div
                  key={concept.conceptId}
                  className={`bg-[#0B1017] rounded-xl border-2 transition-all p-5 flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#00AFFF] bg-[#0E1724] shadow-xl shadow-[#00AFFF]/15'
                      : 'border-[#1C2735] hover:border-[#2E3E52] text-[#D7DCE2]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold bg-[#141C26] text-[#00AFFF] px-2 py-0.5 rounded border border-[#1C2735]">
                        CONCEPT {index + 1}
                      </span>
                      <span className="text-[10px] text-[#79838E] font-medium truncate max-w-[130px]">
                        {concept.genre}
                      </span>
                    </div>

                    {/* Title & Logline */}
                    <div>
                      <h3 className="font-['Exo_2'] font-bold text-base text-white tracking-wide mb-1.5">
                        {concept.title}
                      </h3>
                      <p className="text-xs text-[#D7DCE2] leading-relaxed italic bg-[#111820]/60 p-2.5 rounded-lg border border-[#1C2735]/60">
                        "{concept.logline}"
                      </p>
                    </div>

                    {/* Premise & Hook */}
                    <div className="text-xs space-y-1.5">
                      <div>
                        <span className="text-[#00AFFF] font-semibold text-[11px] block">
                          Unique Hook:
                        </span>
                        <p className="text-[#79838E] text-[11px] leading-relaxed">
                          {concept.uniqueHook}
                        </p>
                      </div>

                      <div>
                        <span className="text-[#D7DCE2] font-semibold text-[11px] block">
                          Protagonist & Conflict:
                        </span>
                        <p className="text-[#79838E] text-[11px] leading-relaxed">
                          <strong className="text-white">{concept.protagonist}</strong> vs {concept.conflict}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 mt-4 border-t border-[#1C2735] flex items-center justify-between gap-2">
                    <button
                      onClick={() => selectConceptId(concept.conceptId)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#00AFFF] text-white shadow-md shadow-[#00AFFF]/30'
                          : 'bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735]'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selected Story</span>
                        </>
                      ) : (
                        <span>Select This Story</span>
                      )}
                    </button>

                    <button
                      onClick={() => setDetailConcept(concept)}
                      className="p-2 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-[#79838E] hover:text-white border border-[#1C2735] transition-colors"
                      title="Inspect full details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setPromptRegenFor(concept)}
                      disabled={isRegenerating}
                      className="p-2 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-[#79838E] hover:text-[#00AFFF] border border-[#1C2735] transition-colors disabled:opacity-50"
                      title="Regenerate this specific idea"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continue to Development Banner */}
          {selectedConcept && (
            <div className="bg-[#111820] border-2 border-[#00AFFF]/50 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-[#00AFFF]/20 border border-[#00AFFF]/40 flex items-center justify-center text-[#00AFFF]">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#00AFFF] tracking-wider">
                    Selected Story For Production
                  </div>
                  <h4 className="font-['Exo_2'] font-bold text-base text-white">
                    {selectedConcept.title}
                  </h4>
                  <p className="text-xs text-[#79838E] line-clamp-1 max-w-xl">
                    {selectedConcept.logline}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('development')}
                className="bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold text-xs px-6 py-3 rounded-lg shadow-lg shadow-[#00AFFF]/20 flex items-center space-x-2 cursor-pointer shrink-0"
              >
                <span>Develop Selected Story</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {detailConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b border-[#1C2735] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#00AFFF] uppercase">
                  {detailConcept.conceptId} • {detailConcept.genre}
                </span>
                <h3 className="font-['Exo_2'] font-bold text-xl text-white">
                  {detailConcept.title}
                </h3>
              </div>
              <button
                onClick={() => setDetailConcept(null)}
                className="text-[#79838E] hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[#D7DCE2]">
              <div>
                <span className="font-semibold text-[#00AFFF] block">Logline</span>
                <p className="italic bg-[#0B1017] p-2.5 rounded border border-[#1C2735]">
                  "{detailConcept.logline}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0B1017] p-2.5 rounded border border-[#1C2735]">
                  <span className="font-semibold text-white block">Protagonist</span>
                  <p className="text-[#79838E]">{detailConcept.protagonist}</p>
                </div>
                <div className="bg-[#0B1017] p-2.5 rounded border border-[#1C2735]">
                  <span className="font-semibold text-white block">Conflict</span>
                  <p className="text-[#79838E]">{detailConcept.conflict}</p>
                </div>
              </div>

              <div className="bg-[#0B1017] p-2.5 rounded border border-[#1C2735]">
                <span className="font-semibold text-white block">Premise</span>
                <p className="text-[#79838E]">{detailConcept.premise}</p>
              </div>

              <div className="bg-[#0B1017] p-2.5 rounded border border-[#1C2735]">
                <span className="font-semibold text-white block">Emotional Stakes</span>
                <p className="text-[#79838E]">{detailConcept.stakes}</p>
              </div>

              <div className="bg-[#0B1017] p-2.5 rounded border border-[#1C2735]">
                <span className="font-semibold text-white block">Visual Potential</span>
                <p className="text-[#79838E]">{detailConcept.visualPotential}</p>
              </div>

              <div className="bg-[#0B1017] p-2.5 rounded border border-[#1C2735]">
                <span className="font-semibold text-white block">Filmability Note</span>
                <p className="text-[#79838E]">{detailConcept.filmabilityNote}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1C2735]">
              <button
                onClick={() => setDetailConcept(null)}
                className="px-4 py-2 text-xs text-[#D7DCE2] hover:bg-[#1C2735] rounded"
              >
                Close
              </button>
              <button
                onClick={() => {
                  selectConceptId(detailConcept.conceptId);
                  setDetailConcept(null);
                }}
                className="px-4 py-2 text-xs bg-[#00AFFF] text-white font-bold rounded"
              >
                Select This Story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate with Guidance Modal */}
      {promptRegenFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-['Exo_2'] font-bold text-base text-white">
              Regenerate "{promptRegenFor.title}"
            </h3>
            <p className="text-xs text-[#79838E]">
              Provide optional guidance to steer the replacement concept in a new direction.
            </p>
            <textarea
              rows={3}
              value={regenGuidance}
              onChange={(e) => setRegenGuidance(e.target.value)}
              placeholder="e.g., Make it more psychological; lean heavier into the mystery; make the protagonist an undercover technician..."
              className="w-full bg-[#0B1017] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white placeholder-[#79838E]/50 focus:border-[#00AFFF] focus:outline-none"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setPromptRegenFor(null)}
                className="px-4 py-2 text-xs text-[#D7DCE2] hover:bg-[#1C2735] rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRegenerateSingle(promptRegenFor, regenGuidance)}
                className="px-4 py-2 text-xs bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold rounded flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate Idea</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
