import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Clock,
  User,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Clapperboard,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ScriptScene } from '../../types/filmStudio';

interface ScreenplayPlannerTabProps {
  onProceedToShots?: () => void;
}

export const ScreenplayPlannerTab: React.FC<ScreenplayPlannerTabProps> = ({ onProceedToShots }) => {
  const {
    project,
    setStage3Scenes,
    updateStage3Scene,
    markPhase1StepCompleted,
    confirmSourceAdaptation,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<ScriptScene | null>(null);

  const scenes: ScriptScene[] = project.stage3?.scenes || [];
  const selectedConcept = project.concepts?.find((c) => c.conceptId === project.selectedConceptId) || project.storyDevelopment;

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: project.settings,
          voiceMode: project.settings.voiceMode || 'CHARACTER_DIALOGUE_ONLY',
          openingStrategy: project.settings.openingStrategy || 'NONE',
          narratorPersona: project.settings.narratorPersona,
          spokenWordPacing: project.settings.spokenWordPacing,
          targetIntroDurationSeconds: project.settings.targetIntroDurationSeconds,
          voiceLanguageOrAccent: project.settings.voiceLanguageOrAccent,
          visualStyle: project.visualStyle,
          activeConcept: selectedConcept,
          storyFoundation: project.storyFoundation || {
            title: project.title,
            logline: selectedConcept?.logline || 'Cinematic video narrative',
            premise: (selectedConcept && 'premise' in selectedConcept ? selectedConcept.premise : (selectedConcept as any)?.expandedPremise) || '',
            tone: project.settings.tone,
            genre: project.settings.genres?.[0] || 'Drama',
          },
          storyCanon: project.storyCanon || {
            characters: [
              {
                id: 'CHAR-01',
                name: (selectedConcept && 'protagonist' in selectedConcept ? selectedConcept.protagonist : '') || 'Protagonist',
                role: 'Lead',
                archetype: 'Hero'
              },
            ],
            locations: [
              { id: 'LOC-01', name: 'Primary Location', moodAtmosphere: 'Atmospheric' },
            ],
          },
          scriptSettings: project.stage3?.settings || {
            pacing: 'BALANCED',
            dialogueDensity: 'MEDIUM',
            allowNarration: project.settings.voiceMode !== 'NO_SPOKEN_VOICE',
          },
          sourceMode: project.storySourceMode,
          originalStoryText: project.originalStoryText,
          importedScript: project.importedScript,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.scenes)) {
        setStage3Scenes(data.scenes);
      } else {
        setErrorMsg(data.error || 'Failed to generate screenplay');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate screenplay');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddBlankScene = () => {
    const newSceneNumber = scenes.length + 1;
    const newScene: ScriptScene = {
      sceneId: `SCENE-${String(newSceneNumber).padStart(2, '0')}`,
      sceneNumber: newSceneNumber,
      slugline: `INT. NEW LOCATION - DAY`,
      title: `Scene ${newSceneNumber}`,
      beatIds: [],
      storyPurpose: 'Advance narrative tension',
      locationId: 'LOC-01',
      timeOfDay: 'DAY',
      characterIds: ['CHAR-01'],
      wardrobeIds: [],
      propIds: [],
      entryState: 'Characters present in space',
      exitState: 'Characters complete scene action',
      audioCues: [],
      emotionalState: 'Focused anticipation',
      continuityNotes: [],
      estimatedSceneDuration: 30,
      actionBlocks: [
        {
          id: `ACT-${newSceneNumber}-01`,
          order: 1,
          description: 'Characters enter the space and take positions.',
          characterIds: ['CHAR-01'],
          visibleAction: 'Carefully surveys the environment.',
          estimatedSeconds: 10,
        },
      ],
      dialogueBlocks: [
        {
          id: `DIA-${newSceneNumber}-01`,
          order: 1,
          speakerId: 'CHAR-01',
          speakerName: 'Protagonist',
          type: 'DIALOGUE',
          dialogue: 'We do not have much time before the signal cuts out.',
        },
      ],
      scriptText: `INT. NEW LOCATION - DAY\n\nCarefully surveys the environment.\n\nPROTAGONIST\nWe do not have much time before the signal cuts out.`,
      hasUserModifications: true,
    };
    setStage3Scenes([...scenes, newScene]);
  };

  const handleDeleteScene = (sceneId: string) => {
    const updated = scenes.filter((s) => s.sceneId !== sceneId);
    setStage3Scenes(updated);
  };

  const handleSaveSceneEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScene) return;
    updateStage3Scene(editingScene.sceneId, editingScene);
    setEditingScene(null);
  };

  const totalDuration = scenes.reduce((acc, s) => acc + (s.estimatedSceneDuration || 0), 0);

  const handleConfirmAndProceed = () => {
    if (scenes.length === 0) {
      setErrorMsg('Please generate or create at least one screenplay scene before proceeding to the shot list.');
      return;
    }
    markPhase1StepCompleted('screenplay', 'shot_list');
    if (onProceedToShots) {
      onProceedToShots();
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Needs Review Alert Banner */}
      {project.phase1Workflow?.stepStatus?.screenplay === 'needs_review' && (
        <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Needs Review:</strong> {project.phase1Workflow?.needsReviewReason || 'Upstream creative inputs were modified. Review your scenes to ensure consistency.'}
          </span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30 uppercase tracking-widest">
              Phase 1 — Scripting
            </span>
            <span className="text-xs text-[#79838E]">
              Total Script Runtime: <strong className="text-white font-mono">{totalDuration}s</strong> / Target:{' '}
              <strong className="text-[#00AFFF] font-mono">{project.settings.targetRuntimeSeconds}s</strong>
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-['Exo_2'] text-white">
            Production Screenplay & Narration
          </h2>
          <p className="text-xs text-[#8A96A6] max-w-2xl">
            Full scene-by-scene script with standard sluglines, action staging, and spoken dialogue / narration cues. Fully editable for your exact vision.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={handleGenerateScript}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating Screenplay...' : scenes.length === 0 ? 'Generate Script V1' : 'Regenerate Script'}</span>
          </button>

          <button
            onClick={handleAddBlankScene}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Scene</span>
          </button>

          {onProceedToShots && (
            <button
              onClick={handleConfirmAndProceed}
              disabled={scenes.length === 0}
              className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-white text-xs font-bold cursor-pointer transition-colors shadow-sm ${
                scenes.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-[#1C2735] text-[#79838E] cursor-not-allowed opacity-60'
              }`}
            >
              <span>Confirm Screenplay & Proceed to Shot List</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Scenes List */}
      {scenes.length === 0 ? (
        <div className="p-12 rounded-xl bg-[#0B1017] border border-[#1C2735] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#141C28] text-[#00AFFF] flex items-center justify-center mx-auto shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No Screenplay Generated Yet</h3>
            <p className="text-xs text-[#8A96A6]">
              Generate a full production script based on your selected concept, or create scenes manually.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handleGenerateScript}
              disabled={isGenerating}
              className="px-6 py-3 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-lg disabled:opacity-50 inline-flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Screenplay V1</span>
            </button>
            <button
              onClick={handleAddBlankScene}
              className="px-4 py-3 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer"
            >
              Add Scene Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Clapperboard className="w-4 h-4 text-[#00AFFF]" />
              <span>Production Scenes ({scenes.length})</span>
            </h3>
            <span className="text-xs text-[#79838E]">
              Click Edit to modify dialogue or sluglines directly
            </span>
          </div>

          <div className="space-y-4">
            {scenes.map((scene, index) => (
              <div
                key={scene.sceneId || index}
                className="bg-[#0B1017] border border-[#1C2735] hover:border-[#2C3B4E] rounded-xl overflow-hidden transition-all shadow-sm"
              >
                {/* Scene Header */}
                <div className="p-4 bg-[#0E1520] border-b border-[#1C2735] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 rounded bg-[#141C26] font-mono text-xs font-bold text-[#00AFFF]">
                      SCENE {String(scene.sceneNumber || index + 1).padStart(2, '0')}
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono">
                      {scene.slugline || scene.title}
                    </h4>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5 text-xs text-[#79838E]">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono text-white font-semibold">
                        ~{scene.estimatedSceneDuration || 30}s
                      </span>
                    </div>

                    <button
                      onClick={() => setEditingScene(scene)}
                      className="p-1.5 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-[#D7DCE2] border border-[#243346] text-xs cursor-pointer"
                      title="Edit scene"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteScene(scene.sceneId)}
                      className="p-1.5 rounded-lg bg-[#141C26] hover:bg-rose-950/40 text-[#79838E] hover:text-rose-400 border border-[#243346] text-xs cursor-pointer"
                      title="Delete scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Script Body Display */}
                <div className="p-5 space-y-4 text-xs font-mono">
                  {scene.scriptText ? (
                    <pre className="whitespace-pre-wrap font-mono text-[#D7DCE2] leading-relaxed bg-[#070B10] p-4 rounded-lg border border-[#1C2735]">
                      {scene.scriptText}
                    </pre>
                  ) : (
                    <div className="space-y-3">
                      {/* Action Blocks */}
                      {(scene.actionBlocks || []).map((act, i) => (
                        <p key={i} className="text-[#C5D0DE] leading-relaxed">
                          {act.visibleAction || act.description}
                        </p>
                      ))}

                      {/* Dialogue Blocks */}
                      {(scene.dialogueBlocks || []).map((dia, i) => (
                        <div key={i} className="pl-6 py-1 space-y-0.5">
                          <span className="font-bold text-[#00AFFF] uppercase tracking-wide">
                            {dia.speakerName || dia.speakerId}
                            {dia.type !== 'DIALOGUE' && ` (${dia.type})`}
                          </span>
                          <p className="text-white italic">"{dia.dialogue}"</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {scene.storyPurpose && (
                    <div className="pt-2 border-t border-[#1C2735]/60 flex items-center space-x-2 text-[11px] text-[#79838E] font-sans">
                      <span className="font-semibold text-[#8A96A6]">Narrative Purpose:</span>
                      <span>{scene.storyPurpose}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Scene Modal */}
      {editingScene && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSceneEdit}
            className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">
              Edit Scene {editingScene.sceneNumber}: {editingScene.title}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#8A96A6] font-semibold mb-1">Slugline</label>
                <input
                  type="text"
                  value={editingScene.slugline || ''}
                  onChange={(e) =>
                    setEditingScene({ ...editingScene, slugline: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8A96A6] font-semibold mb-1">
                  Estimated Scene Duration (Seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={editingScene.estimatedSceneDuration || 30}
                  onChange={(e) =>
                    setEditingScene({
                      ...editingScene,
                      estimatedSceneDuration: Number(e.target.value),
                    })
                  }
                  className="w-32 px-3 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8A96A6] font-semibold mb-1">
                  Full Script / Dialogue Text
                </label>
                <textarea
                  rows={8}
                  value={editingScene.scriptText || ''}
                  onChange={(e) =>
                    setEditingScene({ ...editingScene, scriptText: e.target.value })
                  }
                  placeholder="Enter screenplay action and dialogue formatted in script style..."
                  className="w-full p-3 bg-[#070B10] border border-[#1C2735] rounded-lg text-white font-mono outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingScene(null)}
                className="px-4 py-2 rounded-lg bg-[#141C26] hover:bg-[#1C2735] text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
              >
                Save Scene
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
