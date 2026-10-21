import React, { useState } from 'react';
import {
  Clapperboard,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Clock,
  Video,
  Layers,
  ArrowRight,
  Move,
  Camera,
  Sun,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { CinematicShot } from '../../types/filmStudio';

interface CinematicShotListTabProps {
  onProceedToPhase2?: () => void;
}

export const CinematicShotListTab: React.FC<CinematicShotListTabProps> = ({ onProceedToPhase2 }) => {
  const {
    project,
    setStage3Shots,
    updateStage3Shot,
    setActiveStage,
    setActivePhase,
    markPhase1StepCompleted,
    updatePhase1Workflow,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingShot, setEditingShot] = useState<CinematicShot | null>(null);

  const shots: CinematicShot[] = project.stage3?.shots || [];
  const scenes = project.stage3?.scenes || [];

  const handleGenerateShots = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/generate-shot-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes,
          storyCanon: project.storyCanon || { characters: [], locations: [] },
          visualStyle: project.visualStyle,
          scriptSettings: project.stage3?.settings || { maxShotDuration: 10 },
          targetSettings: { targetModel: 'Google Veo 2 / Flow Standard' },
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.shots)) {
        setStage3Shots(data.shots);
      } else {
        setErrorMsg(data.error || 'Failed to generate shot plan');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate shot plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddBlankShot = () => {
    const nextOrder = shots.length + 1;
    const newShot: CinematicShot = {
      shotId: `SHOT-${String(nextOrder).padStart(2, '0')}`,
      sceneId: scenes[0]?.sceneId || 'SCENE-01',
      order: nextOrder,
      duration: 8,
      purpose: 'Establish narrative tension and character positioning',
      sourceBeatIds: [],
      characterIds: scenes[0]?.characterIds || ['CHAR-01'],
      wardrobeIds: [],
      propIds: [],
      locationId: scenes[0]?.locationId || 'LOC-01',
      shotSize: 'MEDIUM',
      cameraAngle: 'EYE_LEVEL',
      lensIntent: '35mm anamorphic',
      framing: 'Rule of thirds composition',
      cameraMovement: 'SLOW_PUSH_IN',
      subjectStartPosition: 'Centered in frame',
      subjectEndPosition: 'Step forward slightly',
      blockingAndMovement: 'Subject maintains eye contact with lens.',
      performanceNotes: 'Focused, steady gaze',
      eyeline: 'Direct to camera',
      lightingAndAtmosphere: 'Cinematic volumetric contrast',
      screenDirection: 'Centered',
      dialogueRefs: [],
      audioContext: 'Subtle cinematic drone and room tone',
      entryVisualState: 'Initial stillness',
      exitVisualState: 'Forward momentum',
      flowMode: 'INGREDIENTS',
      routeManualOverride: false,
      routingConfidence: 0.95,
      routingReason: 'Single character dramatic beat',
      ingredientAssetIds: ['CHAR-01', 'LOC-01'],
      firstFramePrompt: `${project.visualStyle?.name || 'Cinematic'} opening shot: Medium shot of protagonist in key environment.`,
      referenceReadiness: 'READY',
      continuityNotes: [],
      generationComplexity: 'MEDIUM',
    };
    setStage3Shots([...shots, newShot]);
  };

  const handleDeleteShot = (shotId: string) => {
    const updated = shots.filter((s) => s.shotId !== shotId).map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));
    setStage3Shots(updated);
  };

  const handleMoveShot = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === shots.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...shots];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const reindexed = reordered.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStage3Shots(reindexed);
  };

  const handleSaveShotEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShot) return;
    updateStage3Shot(editingShot.shotId, editingShot);
    setEditingShot(null);
  };

  const totalShotDuration = shots.reduce((acc, s) => acc + (s.duration || 8), 0);

  const handleProceed = () => {
    if (shots.length === 0) {
      setErrorMsg('Cannot complete Phase 1: You must generate or create at least one cinematic shot.');
      return;
    }
    if (markPhase1StepCompleted) {
      markPhase1StepCompleted('shot_list');
    }
    if (updatePhase1Workflow) {
      updatePhase1Workflow({ isComplete: true });
    }
    if (onProceedToPhase2) {
      onProceedToPhase2();
    } else {
      if (setActivePhase) {
        setActivePhase('phase2');
      } else {
        setActiveStage('stage2');
      }
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30 uppercase tracking-widest">
              Phase 1 — Shot Planning
            </span>
            <span className="text-xs text-[#79838E]">
              Total Shot Duration: <strong className="text-white font-mono">{totalShotDuration}s</strong> / Target:{' '}
              <strong className="text-[#00AFFF] font-mono">{project.settings.targetRuntimeSeconds}s</strong>
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-['Exo_2'] text-white">
            Cinematic Shot List Breakdown
          </h2>
          <p className="text-xs text-[#8A96A6] max-w-2xl">
            Each shot specifies precise camera movement, lens angle, duration (6s, 8s, 10s), blocking dynamics, and character anchors ready for Veo 2 / Google Flow video generation.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={handleGenerateShots}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating Shots...' : shots.length === 0 ? 'Generate Shot Plan' : 'Regenerate Shots'}</span>
          </button>

          <button
            onClick={handleAddBlankShot}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Shot</span>
          </button>

          <button
            onClick={handleProceed}
            disabled={shots.length === 0}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-white text-xs font-bold cursor-pointer transition-all shadow-md ${
              shots.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30 ring-1 ring-emerald-400/40'
                : 'bg-[#1C2735] text-[#79838E] cursor-not-allowed opacity-60'
            }`}
            title={
              shots.length === 0
                ? 'Generate or add at least one cinematic shot to complete Phase 1'
                : 'All Phase 1 requirements satisfied. Complete Phase 1 and unlock Phase 2 Pre-Production.'
            }
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>COMPLETE PHASE 1 → PROCEED TO PHASE 2</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Shots List */}
      {shots.length === 0 ? (
        <div className="p-12 rounded-xl bg-[#0B1017] border border-[#1C2735] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#141C28] text-[#00AFFF] flex items-center justify-center mx-auto shadow-sm">
            <Camera className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No Cinematic Shots Planned Yet</h3>
            <p className="text-xs text-[#8A96A6]">
              Generate a modular shot plan from your screenplay, or manually add individual cinematic shots.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handleGenerateShots}
              disabled={isGenerating}
              className="px-6 py-3 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-lg disabled:opacity-50 inline-flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Shot Plan</span>
            </button>
            <button
              onClick={handleAddBlankShot}
              className="px-4 py-3 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer"
            >
              Add Shot Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Clapperboard className="w-4 h-4 text-[#00AFFF]" />
              <span>Cinematic Shots Queue ({shots.length})</span>
            </h3>
            <span className="text-xs text-[#79838E]">
              Click any shot to edit camera motion, framing, or action instructions
            </span>
          </div>

          <div className="space-y-3">
            {shots.map((shot, index) => (
              <div
                key={shot.shotId || index}
                className="bg-[#0B1017] border border-[#1C2735] hover:border-[#2C3B4E] rounded-xl p-4 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Shot Identification & Badges */}
                <div className="flex items-start space-x-3.5">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <button
                      onClick={() => handleMoveShot(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-[#55606E] hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move shot earlier"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2.5 py-1 rounded-md bg-[#070B10] border border-[#1C2735] font-mono text-xs font-bold text-[#00AFFF]">
                      {shot.shotId}
                    </span>
                    <button
                      onClick={() => handleMoveShot(index, 'down')}
                      disabled={index === shots.length - 1}
                      className="p-1 text-[#55606E] hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move shot later"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00AFFF]/15 text-[#00AFFF] uppercase">
                        {shot.shotSize}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#141C26] text-[#C5D0DE]">
                        Camera: {shot.cameraMovement}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#141C26] text-amber-300">
                        Lens: {shot.lensIntent || '35mm anamorphic'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300">
                        {shot.duration}s
                      </span>
                    </div>

                    <p className="text-xs text-white leading-relaxed">
                      {shot.blockingAndMovement || shot.purpose}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#79838E]">
                      {shot.lightingAndAtmosphere && (
                        <div className="flex items-center space-x-1">
                          <Sun className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{shot.lightingAndAtmosphere}</span>
                        </div>
                      )}
                      <div>
                        <span>Anchors: </span>
                        <span className="text-[#A0AEC0]">
                          {(shot.characterIds || []).join(', ') || 'No character'} @ {shot.locationId || 'Scene set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => setEditingShot(shot)}
                    className="p-2 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-[#D7DCE2] border border-[#243346] text-xs cursor-pointer flex items-center space-x-1"
                    title="Edit shot parameters"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteShot(shot.shotId)}
                    className="p-2 rounded-lg bg-[#141C26] hover:bg-rose-950/40 text-[#79838E] hover:text-rose-400 border border-[#243346] text-xs cursor-pointer"
                    title="Delete shot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Shot Modal */}
      {editingShot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveShotEdit}
            className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-bold text-white">
              Edit Shot {editingShot.shotId}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#8A96A6] font-semibold mb-1">Shot Size</label>
                <select
                  value={editingShot.shotSize}
                  onChange={(e) =>
                    setEditingShot({ ...editingShot, shotSize: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white outline-none"
                >
                  <option value="WIDE">Wide Shot</option>
                  <option value="MEDIUM">Medium Shot</option>
                  <option value="CLOSE_UP">Close-Up</option>
                  <option value="EXTREME_CLOSE_UP">Extreme Close-Up</option>
                  <option value="DRONE_ESTABLISHING">Drone / Aerial Establishing</option>
                  <option value="POV">Point of View (POV)</option>
                  <option value="INSERT">Insert / Detail</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8A96A6] font-semibold mb-1">Camera Movement</label>
                <select
                  value={editingShot.cameraMovement}
                  onChange={(e) =>
                    setEditingShot({ ...editingShot, cameraMovement: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white outline-none"
                >
                  <option value="STATIC">Static Locked-off</option>
                  <option value="SLOW_PUSH_IN">Slow Push In (Dolly)</option>
                  <option value="PULL_OUT">Pull Out</option>
                  <option value="PAN_LEFT">Pan Left</option>
                  <option value="PAN_RIGHT">Pan Right</option>
                  <option value="TILT_UP">Tilt Up</option>
                  <option value="TILT_DOWN">Tilt Down</option>
                  <option value="TRACKING_LATERAL">Lateral Tracking</option>
                  <option value="STEADICAM_FOLLOW">Steadicam Follow</option>
                  <option value="ORBIT">360 Orbit</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8A96A6] font-semibold mb-1">
                  Duration (Modular seconds)
                </label>
                <div className="flex items-center space-x-2">
                  {([6, 8, 10] as const).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setEditingShot({ ...editingShot, duration: sec })}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors cursor-pointer ${
                        editingShot.duration === sec
                          ? 'bg-[#00AFFF] text-white border-[#00AFFF]'
                          : 'bg-[#070B10] border-[#1C2735] text-[#79838E]'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#8A96A6] font-semibold mb-1">Lens & Optics</label>
                <input
                  type="text"
                  value={editingShot.lensIntent || ''}
                  onChange={(e) =>
                    setEditingShot({ ...editingShot, lensIntent: e.target.value })
                  }
                  placeholder="e.g. 35mm anamorphic, f/1.8 shallow depth"
                  className="w-full px-3 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[#8A96A6] font-semibold mb-1">
                  Blocking, Movement & Subject Action
                </label>
                <textarea
                  rows={3}
                  value={editingShot.blockingAndMovement || ''}
                  onChange={(e) =>
                    setEditingShot({ ...editingShot, blockingAndMovement: e.target.value })
                  }
                  className="w-full p-3 bg-[#070B10] border border-[#1C2735] rounded-lg text-white outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[#8A96A6] font-semibold mb-1">
                  Lighting & Atmosphere
                </label>
                <input
                  type="text"
                  value={editingShot.lightingAndAtmosphere || ''}
                  onChange={(e) =>
                    setEditingShot({ ...editingShot, lightingAndAtmosphere: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1C2735]">
              <button
                type="button"
                onClick={() => setEditingShot(null)}
                className="px-4 py-2 rounded-lg bg-[#141C26] hover:bg-[#1C2735] text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
              >
                Save Shot
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
