import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Compass,
  Film,
  Zap,
  Target,
  FileText,
  Sliders,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiGenerateStoryConcepts, apiRegenerateSingleConcept, apiDevelopConcept } from '../../services/api';
import { StoryConcept } from '../../types/filmStudio';

interface CreativeConceptsTabProps {
  onProceedToScript?: () => void;
}

export const CreativeConceptsTab: React.FC<CreativeConceptsTabProps> = ({ onProceedToScript }) => {
  const {
    project,
    setConcepts,
    selectConceptId,
    setStoryDevelopment,
    updateOriginalStoryText,
    setStoryCanonAndFoundation,
    markPhase1StepCompleted,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [isDeveloping, setIsDeveloping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [regenGuidance, setRegenGuidance] = useState('');
  const [showRegenModal, setShowRegenModal] = useState<StoryConcept | null>(null);

  const concepts = project.concepts || [];
  const selectedConceptId = project.selectedConceptId;
  const isOwnStoryMode = project.storySourceMode === 'OWN_STORY';

  const handleGenerate5 = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const workingTitle = project.settings.topicOrNiche || project.title;
      const res = await apiGenerateStoryConcepts(project.settings, project.visualStyle, workingTitle);
      if (res.success && res.concepts) {
        setConcepts(res.concepts);
        if (res.concepts.length > 0 && !selectedConceptId) {
          selectConceptId(res.concepts[0].conceptId);
        }
      } else {
        setErrorMsg(res.error || 'Failed to generate concepts');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate concepts');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAndDevelop = async (concept: StoryConcept) => {
    selectConceptId(concept.conceptId);
    setIsDeveloping(true);
    setErrorMsg(null);
    try {
      const res = await apiDevelopConcept(concept, project.settings, project.visualStyle);
      if (res.success && res.development) {
        setStoryDevelopment(res.development);
      }
    } catch (err: any) {
      console.warn('Develop concept warning:', err);
    } finally {
      setIsDeveloping(false);
    }
  };

  const handleRegenerateSingle = async (conceptToReplace: StoryConcept) => {
    setRegeneratingId(conceptToReplace.conceptId);
    setErrorMsg(null);
    try {
      const otherConcepts = concepts.filter((c) => c.conceptId !== conceptToReplace.conceptId);
      const res = await apiRegenerateSingleConcept(
        conceptToReplace,
        otherConcepts,
        project.settings,
        project.visualStyle,
        regenGuidance.trim() || undefined
      );

      if (res.success && res.concept) {
        const updated = concepts.map((c) =>
          c.conceptId === conceptToReplace.conceptId ? res.concept! : c
        );
        setConcepts(updated);
        setShowRegenModal(null);
        setRegenGuidance('');
      } else {
        setErrorMsg(res.error || 'Failed to regenerate concept');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to regenerate concept');
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 uppercase tracking-widest">
              Creative Brain
            </span>
            <span className="text-xs text-[#79838E]">
              Format: <strong className="text-white">{project.settings.format}</strong> ({project.settings.aspectRatio})
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-['Exo_2'] text-white">
            {isOwnStoryMode ? 'Author Story & Premise Blueprint' : '5 Distinct Story Concepts'}
          </h2>
          <p className="text-xs text-[#8A96A6] max-w-2xl">
            {isOwnStoryMode
              ? 'Input your original story, premise, or draft. The Creative Brain will preserve your narrative canon and construct the scene & shot breakdown.'
              : 'Each concept represents a unique creative angle, distinct emotional hook, protagonist arc, and filmable visual premise.'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          {!isOwnStoryMode && (
            <button
              onClick={handleGenerate5}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Generating Concepts...' : concepts.length === 0 ? 'Generate 5 Concepts' : 'Regenerate Deck (5)'}</span>
            </button>
          )}

          {onProceedToScript && (
            <button
              onClick={() => {
                if (!selectedConceptId) {
                  setErrorMsg('Please select one of the story concepts before proceeding.');
                  return;
                }
                markPhase1StepCompleted('concepts', 'screenplay');
                onProceedToScript();
              }}
              disabled={!selectedConceptId}
              className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-white text-xs font-bold cursor-pointer transition-colors shadow-sm ${
                selectedConceptId
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-[#1C2735] text-[#79838E] cursor-not-allowed opacity-60'
              }`}
            >
              <span>Confirm Concept & Proceed to Screenplay</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Needs Review Alert Banner */}
      {project.phase1Workflow?.stepStatus?.concepts === 'needs_review' && (
        <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Needs Review:</strong> {project.phase1Workflow?.needsReviewReason || 'Upstream settings or niche research were updated.'}
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Mode D: Own Story Input */}
      {isOwnStoryMode ? (
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-amber-300" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Your Original Story / Script Text
            </h3>
          </div>
          <p className="text-xs text-[#8A96A6]">
            Paste your premise, narrative synopsis, scene breakdown, or full screenplay below. The studio will preserve characters, dialogues, and setting details verbatim.
          </p>

          <textarea
            rows={10}
            value={project.originalStoryText || ''}
            onChange={(e) => updateOriginalStoryText(e.target.value)}
            placeholder="Paste your original story premise, character notes, or script text here..."
            className="w-full p-4 bg-[#070B10] border border-[#1C2735] focus:border-[#00AFFF] rounded-xl text-white text-xs placeholder-[#55606E] outline-none font-mono leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-[#55606E]">
              {(project.originalStoryText || '').length} characters recorded
            </span>
            {onProceedToScript && (
              <button
                onClick={onProceedToScript}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
              >
                <span>Continue to Screenplay & Shot Planning</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : concepts.length === 0 ? (
        /* Empty State */
        <div className="p-12 rounded-xl bg-[#0B1017] border border-[#1C2735] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#141C28] text-[#00AFFF] flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No Concepts Generated Yet</h3>
            <p className="text-xs text-[#8A96A6]">
              Click the button below to generate 5 substantially distinct narrative concepts powered by Gemini based on your chosen niche and visual style.
            </p>
          </div>
          <button
            onClick={handleGenerate5}
            disabled={isGenerating}
            className="px-6 py-3 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-lg disabled:opacity-50 inline-flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate 5 Distinct Concepts</span>
          </button>
        </div>
      ) : (
        /* Concepts Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-[#00AFFF]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Select Your Core Concept ({concepts.length})
              </h3>
            </div>
            <span className="text-xs text-[#79838E]">
              Selected concept will drive the script and shot list
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {concepts.map((concept, index) => {
              const isSelected = concept.conceptId === selectedConceptId;
              const isBusy = regeneratingId === concept.conceptId;

              return (
                <div
                  key={concept.conceptId || index}
                  className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#0F1B2B] border-[#00AFFF] ring-1 ring-[#00AFFF] shadow-md shadow-[#00AFFF]/15'
                      : 'bg-[#0B1017] border-[#1C2735] hover:border-[#2C3B4E]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Badge & ID */}
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141C26] text-[#79838E]">
                        CONCEPT {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-bold text-[#00AFFF] uppercase tracking-wider">
                        {concept.genre}
                      </span>
                    </div>

                    {/* Title & Hook */}
                    <div>
                      <h4 className="text-base font-bold text-white leading-snug">
                        {concept.title}
                      </h4>
                      <div className="mt-1.5 p-2 rounded-lg bg-[#070B10] border border-[#1C2735] text-[11px] text-amber-300 italic font-medium">
                        "{concept.uniqueHook}"
                      </div>
                    </div>

                    {/* Logline */}
                    <p className="text-xs text-[#8A96A6] leading-relaxed">
                      {concept.logline}
                    </p>

                    {/* Conflict & Protagonist */}
                    <div className="pt-2 border-t border-[#1C2735] space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-[#657283]">Protagonist: </span>
                        <span className="text-white font-medium">{concept.protagonist}</span>
                      </div>
                      <div>
                        <span className="text-[#657283]">Core Conflict: </span>
                        <span className="text-[#C5D0DE]">{concept.conflict}</span>
                      </div>
                      <div>
                        <span className="text-[#657283]">Stakes: </span>
                        <span className="text-rose-300 font-medium">{concept.stakes}</span>
                      </div>
                      <div>
                        <span className="text-[#657283]">Filmability: </span>
                        <span className="text-emerald-400 font-medium">{concept.filmabilityNote}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 mt-4 border-t border-[#1C2735] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setShowRegenModal(concept)}
                      disabled={isBusy}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141C26] hover:bg-[#1C2735] text-[#79838E] hover:text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-1"
                      title="Regenerate this specific concept"
                    >
                      <RefreshCw className={`w-3 h-3 ${isBusy ? 'animate-spin' : ''}`} />
                      <span>Refine</span>
                    </button>

                    <button
                      onClick={() => handleSelectAndDevelop(concept)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center space-x-1 ${
                        isSelected
                          ? 'bg-[#00AFFF] text-white'
                          : 'bg-[#141C26] hover:bg-[#1E2938] text-[#D7DCE2] border border-[#243346]'
                      }`}
                    >
                      <span>{isSelected ? '✓ Selected' : 'Select Concept'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Single Concept Regeneration Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Regenerate Concept: "{showRegenModal.title}"
            </h3>
            <p className="text-xs text-[#8A96A6]">
              Provide optional guidance to explore a specific theme, twist, character archetype, or dramatic direction.
            </p>

            <textarea
              rows={3}
              value={regenGuidance}
              onChange={(e) => setRegenGuidance(e.target.value)}
              placeholder="e.g. Focus more on psychological tension, add an unexpected betrayal, shift setting to deep orbit..."
              className="w-full p-3 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRegenModal(null)}
                className="px-3.5 py-2 rounded-lg bg-[#141C26] hover:bg-[#1C2735] text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRegenerateSingle(showRegenModal)}
                disabled={regeneratingId !== null}
                className="px-4 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50"
              >
                {regeneratingId ? 'Regenerating...' : 'Regenerate Single Concept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
