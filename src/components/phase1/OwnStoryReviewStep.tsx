import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  Shield,
  MapPin,
  ListOrdered,
  FileText,
  Clock,
  Eye,
  Edit3,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiAnalyzeOwnStory, apiAnalyzeScript } from '../../services/api';
import { OwnStoryAnalysis, ScriptScene } from '../../types/filmStudio';

interface OwnStoryReviewStepProps {
  onProceedToScript: () => void;
}

export const OwnStoryReviewStep: React.FC<OwnStoryReviewStepProps> = ({ onProceedToScript }) => {
  const {
    project,
    updateOriginalStoryText,
    setStoryAnalysis,
    setStoryCanonAndFoundation,
    setStage3Scenes,
    markPhase1StepCompleted,
  } = useProject();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState(project.originalStoryText || '');
  const [isPreservingVerbatim, setIsPreservingVerbatim] = useState(false);

  const storyText = project.originalStoryText || '';
  const analysis: OwnStoryAnalysis | null = project.sourceDrafts?.OWN_STORY?.analysis || null;
  const isFullScript =
    storyText.toUpperCase().includes('INT.') ||
    storyText.toUpperCase().includes('EXT.') ||
    storyText.includes('SCENE 1') ||
    project.importedScript !== null;

  const wordCount = storyText.trim() ? storyText.trim().split(/\s+/).length : 0;
  const charCount = storyText.length;

  const handleAnalyze = async () => {
    if (!storyText.trim()) {
      setErrorMsg('No story text found. Please provide your story text in Step 1 Setup.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      if (isFullScript) {
        const res = await apiAnalyzeScript(storyText, project.title, 'PASTE', project.settings);
        if (res.success && res.extractedScript) {
          // Map extracted script to analysis
          const scriptAnalysis: OwnStoryAnalysis = {
            plotSummary: `Original screenplay by author: ${project.title}`,
            protagonist: res.extractedScript.extractedCharacters?.[0] || 'Lead Character',
            conflict: 'Dramatic confrontation presented in author screenplay',
            world: res.extractedScript.extractedScenes?.[0]?.slugline || 'Contemporary Cinematic',
            charactersIdentified: res.extractedScript.extractedCharacters || ['Protagonist'],
            timeline: `${res.extractedScript.extractedScenes?.length || 1} scenes sequence`,
            majorBeats: (res.extractedScript.extractedScenes || []).map(
              (s: any, idx: number) => `Scene ${idx + 1}: ${s.slugline} - ${s.summary || 'Scene action'}`
            ),
            setupPayoffs: ['Script structural progression'],
            unansweredQuestions: [],
            aiSuggestions: [],
            analyzedAt: new Date().toISOString(),
          };
          setStoryAnalysis(scriptAnalysis);
        } else {
          // Fallback to story analysis endpoint
          const fallbackRes = await apiAnalyzeOwnStory(storyText, project.settings, project.visualStyle);
          if (fallbackRes.success && fallbackRes.analysis) {
            setStoryAnalysis(fallbackRes.analysis);
          } else {
            setErrorMsg(fallbackRes.error || res.error || 'Failed to analyze script');
          }
        }
      } else {
        const res = await apiAnalyzeOwnStory(storyText, project.settings, project.visualStyle);
        if (res.success && res.analysis) {
          setStoryAnalysis(res.analysis);
        } else {
          setErrorMsg(res.error || 'Failed to analyze story');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to analyze story');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePreserveVerbatim = () => {
    setIsPreservingVerbatim(true);

    // Extract scene chunks from script if sluglines exist, or create structured scene from text
    const lines = storyText.split('\n');
    const rawScenes: Array<{ slug: string; body: string[] }> = [];
    let currentSlug = 'INT. MAIN LOCATION - DAY';
    let currentBody: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('INT.') || trimmed.startsWith('EXT.') || trimmed.startsWith('SCENE')) {
        if (currentBody.length > 0) {
          rawScenes.push({ slug: currentSlug, body: currentBody });
        }
        currentSlug = trimmed;
        currentBody = [];
      } else {
        currentBody.push(line);
      }
    }
    if (currentBody.length > 0 || rawScenes.length === 0) {
      rawScenes.push({ slug: currentSlug, body: currentBody });
    }

    const compiledScenes: ScriptScene[] = rawScenes.map((raw, idx) => {
      const sceneId = `SCENE-${String(idx + 1).padStart(2, '0')}`;
      const textBlock = raw.body.join('\n').trim();

      return {
        sceneId,
        sceneNumber: idx + 1,
        slugline: raw.slug,
        title: `Scene ${idx + 1}`,
        beatIds: [],
        storyPurpose: 'Advance author narrative vision',
        locationId: 'LOC-01',
        timeOfDay: raw.slug.includes('NIGHT') ? 'NIGHT' : 'DAY',
        characterIds: ['CHAR-01'],
        wardrobeIds: [],
        propIds: [],
        entryState: 'Scene opening state',
        exitState: 'Scene conclusion',
        audioCues: [],
        emotionalState: project.settings.tone || 'Dramatic tension',
        continuityNotes: ['Preserve original author pacing'],
        actionBlocks: [
          {
            id: `${sceneId}-A01`,
            order: 1,
            description: textBlock.slice(0, 300) || 'Author script action block',
            visibleAction: textBlock.slice(0, 300) || 'Action unfolds per author specification',
            characterIds: ['CHAR-01'],
            estimatedSeconds: Math.max(15, Math.round(project.settings.targetRuntimeSeconds / rawScenes.length)),
          },
        ],
        dialogueBlocks: [],
        estimatedSceneDuration: Math.max(15, Math.round(project.settings.targetRuntimeSeconds / (rawScenes.length || 1))),
        scriptText: textBlock || raw.slug,
        isOwnScriptVerbatim: true,
        hasUserModifications: false,
      };
    });

    setStage3Scenes(compiledScenes);
    markPhase1StepCompleted('own_story_review', 'screenplay');
    onProceedToScript();
  };

  const handleConfirmAndProceed = () => {
    // If analysis exists, sync foundation and canon
    if (analysis) {
      setStoryCanonAndFoundation(
        {
          projectId: project.projectId,
          title: project.title,
          provenance: project.storySourceMode,
          selectedStyle: project.visualStyle,
          logline: analysis.plotSummary || `Original story: ${project.title}`,
          premise: analysis.plotSummary || '',
          protagonist: analysis.protagonist || 'Protagonist',
          mainConflict: analysis.conflict || 'Central dramatic conflict',
          emotionalStakes: 'Narrative integrity',
          theme: analysis.conflict || 'Core theme',
          genre: project.settings.genres?.[0] || 'Drama',
          tone: project.settings.tone,
          audience: project.settings.audience || 'General',
          worldSetting: analysis.world || 'Contemporary',
          hook: analysis.protagonist || 'Key character hook',
          narrativePromise: analysis.conflict || 'Resolution of central premise',
          endingDirection: 'Author envisioned resolution',
          targetRuntimeSeconds: project.settings.targetRuntimeSeconds,
          runtimeGuideline: project.settings.runtimeGuideline || 'Per author timing',
        },
        {
          characters: (analysis.charactersIdentified || ['Protagonist']).map((name, i) => ({
            id: `CHAR-${String(i + 1).padStart(2, '0')}`,
            name,
            role: i === 0 ? 'PROTAGONIST' : 'SUPPORTING',
            archetype: i === 0 ? 'Lead Character' : 'Secondary Role',
            personalityVoice: 'Defined by author script',
            want: 'Drive story forward',
            need: 'Fulfill narrative arc',
            motivation: 'Author intention',
            weakness: 'Dramatic flaw',
            internalConflict: 'Inner journey',
            externalConflict: analysis.conflict,
            arc: 'Narrative progression',
          })),
          locations: [
            {
              id: 'LOC-01',
              name: analysis.world || 'Primary Setting',
              narrativeSignificance: 'Main narrative environment',
              moodAtmosphere: project.settings.tone || 'Atmospheric',
            },
          ],
          relationships: [],
          worldRules: [],
          narrativeStructure: {
            type: 'Author Structured Dramatic Arc',
            description: analysis.plotSummary || 'Original narrative structure',
          },
          beatMap: (analysis.majorBeats || []).map((b, i) => ({
            id: `BEAT-${String(i + 1).padStart(2, '0')}`,
            actOrEpisode: 'Act 1',
            sequenceNumber: i + 1,
            title: `Beat ${i + 1}`,
            description: b,
            causalConnection: 'Direct narrative causality',
            emotionalBeat: 'Dramatic progression',
            estimatedSeconds: Math.round(project.settings.targetRuntimeSeconds / (analysis.majorBeats.length || 1)),
            charactersPresent: ['CHAR-01'],
          })),
          timeline: [],
          characterKnowledge: [],
          setupPayoffs: [],
          props: [],
          unresolvedThreads: [],
          filmabilityNotes: 'Validated per author specification',
        }
      );
    }

    markPhase1StepCompleted('own_story_review', 'screenplay');
    onProceedToScript();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Step Header Banner */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
              Mode D · Author Canon
            </span>
            <span className="text-xs text-[#79838E]">
              {wordCount} words · {charCount} chars
            </span>
            {isFullScript && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141C26] text-[#00AFFF] border border-[#243346]">
                Screenplay Format Detected
              </span>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-['Exo_2'] text-white">
            Author Story Analysis & Canon Confirmation
          </h2>
          <p className="text-xs text-[#8A96A6] max-w-2xl">
            Your original words are preserved verbatim. Review character dynamics, core dramatic conflicts, and narrative architecture before screenplay compilation.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing Story...' : analysis ? 'Re-Analyze Story' : 'Analyze Story Architecture'}</span>
          </button>

          {isFullScript && (
            <button
              onClick={handlePreserveVerbatim}
              disabled={isPreservingVerbatim}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
              title="Preserve screenplay scenes verbatim without AI rewriting"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Preserve Screenplay As-Is</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => handleAnalyze()}
            className="px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800 text-white text-[11px] font-semibold cursor-pointer"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Author Source Text Reader Card */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#1C2735]">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Original Author Text (Preserved Verbatim)</span>
          </div>
          <button
            onClick={() => {
              if (isEditingText) {
                updateOriginalStoryText(editedText);
              }
              setIsEditingText(!isEditingText);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold text-[#00AFFF] hover:bg-[#141C26] cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingText ? 'Done Editing' : 'Edit Source Text'}</span>
          </button>
        </div>

        {isEditingText ? (
          <textarea
            rows={8}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full p-3 bg-[#070B10] border border-[#00AFFF] rounded-lg text-white font-mono text-xs outline-none"
          />
        ) : (
          <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] max-h-56 overflow-y-auto text-xs text-[#C5D0DE] whitespace-pre-wrap font-sans leading-relaxed select-text">
            {storyText || (
              <span className="text-[#55606E] italic">
                No story text provided yet. Click "Edit Source Text" or return to Step 1 Setup.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Structured Analysis Results */}
      {analysis ? (
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C2735]">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white font-['Exo_2']">
                Extracted Story Architecture & Canon
              </h3>
            </div>
            <span className="text-xs text-[#79838E]">
              Confirmed structure will populate scenes, characters, and shots
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plot Summary */}
            <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-1.5 md:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF]">
                Narrative Core & Premise
              </span>
              <p className="text-xs text-white leading-relaxed">{analysis.plotSummary}</p>
            </div>

            {/* Protagonist & Opposing Force */}
            <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <User className="w-4 h-4 text-[#00AFFF]" />
                <span>Protagonist & Key Characters</span>
              </div>
              <div className="text-xs font-semibold text-white">{analysis.protagonist}</div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(analysis.charactersIdentified || []).map((char, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#141C26] text-[#A0AEC0] border border-[#243346]"
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>

            {/* Core Conflict & Stakes */}
            <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Shield className="w-4 h-4 text-rose-400" />
                <span>Central Conflict & Dramatic Engine</span>
              </div>
              <p className="text-xs text-[#C5D0DE] leading-relaxed">{analysis.conflict}</p>
              <div className="text-[11px] text-[#79838E] pt-1">
                World / Setting: <strong className="text-white">{analysis.world}</strong>
              </div>
            </div>

            {/* Major Beats */}
            <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <ListOrdered className="w-4 h-4 text-amber-400" />
                <span>Key Narrative Beats ({analysis.majorBeats?.length || 0})</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(analysis.majorBeats || []).map((beat, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-[#0E141D] border border-[#1C2735] text-xs text-[#C5D0DE] flex items-start space-x-2"
                  >
                    <span className="text-[10px] font-mono font-bold text-amber-300 mt-0.5">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span>{beat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Confirm & Proceed Action Bar */}
          <div className="pt-4 border-t border-[#1C2735] flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Original author canon verified and ready</span>
            </div>

            <button
              onClick={handleConfirmAndProceed}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
            >
              <span>Confirm Story Interpretation & Proceed to Screenplay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Manual / Offline Confirmation Alternative */
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 space-y-4 text-center">
          <p className="text-xs text-[#8A96A6] max-w-xl mx-auto">
            Click <strong>"Analyze Story Architecture"</strong> above to have AI extract characters, beats, and conflict, or proceed directly to screenplay planning using your original text.
          </p>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={handleConfirmAndProceed}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors"
            >
              <span>Continue with Manual Setup & Proceed to Screenplay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
