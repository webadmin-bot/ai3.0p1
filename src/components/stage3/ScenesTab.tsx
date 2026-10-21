import React, { useState } from 'react';
import {
  Film,
  Clock,
  User,
  MapPin,
  Box,
  Shirt,
  Copy,
  Check,
  Edit3,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Volume2,
  FileText,
  Search,
  Zap,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ScriptScene } from '../../types/filmStudio';
import { EditSceneModal } from './EditSceneModal';
import { RegenerateSceneModal } from './RegenerateSceneModal';
import { apiRegenerateScene } from '../../services/api';

interface ScenesTabProps {
  onOpenPipeline: () => void;
}

export const ScenesTab: React.FC<ScenesTabProps> = ({ onOpenPipeline }) => {
  const { project, updateStage3Scene } = useProject();
  const scenes = project.stage3.scenes || [];

  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(
    scenes[0]?.sceneId || null
  );
  const [editingScene, setEditingScene] = useState<ScriptScene | null>(null);
  const [regeneratingScene, setRegeneratingScene] = useState<ScriptScene | null>(null);
  const [copiedSceneId, setCopiedSceneId] = useState<string | null>(null);
  const [tighteningSceneId, setTighteningSceneId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isOwnScript = project.storySourceMode === 'OWN_SCRIPT';

  const filteredScenes = scenes.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.sceneId.toLowerCase().includes(q) ||
      s.scriptText.toLowerCase().includes(q) ||
      s.locationId.toLowerCase().includes(q)
    );
  });

  const handleCopyScene = (scene: ScriptScene) => {
    navigator.clipboard.writeText(
      `--- ${scene.sceneId}: ${scene.title} (${scene.estimatedSceneDuration}s) ---\n${scene.scriptText}`
    );
    setCopiedSceneId(scene.sceneId);
    setTimeout(() => setCopiedSceneId(null), 2000);
  };

  const handleTightenPacing = async (scene: ScriptScene) => {
    setTighteningSceneId(scene.sceneId);
    try {
      const res = await apiRegenerateScene({
        scene,
        storyCanon: project.storyCanon!,
        scriptSettings: project.stage3.settings,
        guidance: 'Tighten scene pacing: streamline stage directions, make dialogue crisper, eliminate filler words.',
      });
      if (res.success && res.scene) {
        updateStage3Scene(scene.sceneId, res.scene);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTighteningSceneId(null);
    }
  };

  const handleRegenerateWithGuidance = async (guidance: string) => {
    if (!regeneratingScene) return;
    const res = await apiRegenerateScene({
      scene: regeneratingScene,
      storyCanon: project.storyCanon!,
      scriptSettings: project.stage3.settings,
      guidance,
    });
    if (res.success && res.scene) {
      updateStage3Scene(regeneratingScene.sceneId, res.scene);
    }
  };

  if (scenes.length === 0) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 md:p-12 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF] mx-auto shadow-lg shadow-[#00AFFF]/10">
          <Film className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-lg mx-auto">
          <h3 className="font-['Exo_2'] font-bold text-xl text-white">
            Screenplay Scenes Not Generated Yet
          </h3>
          <p className="text-xs text-[#79838E] leading-relaxed">
            {isOwnScript
              ? 'Stage 3 will extract your imported screenplay scenes and dialogue verbatim without rewriting, and partition them into 6s/8s/10s Google Flow shots.'
              : 'Stage 3 will turn your approved Stage 1 Story Canon and Stage 2 Visual Assets into filmable present-tense screenplay scenes with realistic speech timing.'}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onOpenPipeline}
            className="px-6 py-2.5 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#00AFFF]/20 flex items-center space-x-2 mx-auto cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isOwnScript ? 'Plan Shots From My Script' : 'Generate Script & Shot Plan'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  const totalSceneTime = scenes.reduce((a, s) => a + s.estimatedSceneDuration, 0);

  return (
    <div className="space-y-4">
      {/* Search & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1017] border border-[#1C2735] p-3 rounded-xl">
        <div className="flex items-center space-x-3 text-xs">
          <span className="font-bold text-white flex items-center space-x-1.5">
            <Film className="w-4 h-4 text-[#00AFFF]" />
            <span>{scenes.length} Production Scenes</span>
          </span>
          <span className="text-[#79838E]">•</span>
          <span className="text-[#79838E] font-mono">
            ~{totalSceneTime}s total estimated scene time
          </span>
          {isOwnScript && (
            <span className="hidden md:inline text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
              VERBATIM SCRIPT SOURCE OF TRUTH
            </span>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#79838E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scenes, characters, lines..."
            className="w-full bg-[#111820] border border-[#1C2735] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#79838E] outline-none focus:border-[#00AFFF]"
          />
        </div>
      </div>

      {/* Scenes List */}
      <div className="space-y-3">
        {filteredScenes.map((scene) => {
          const isExpanded = expandedSceneId === scene.sceneId;
          const isTightening = tighteningSceneId === scene.sceneId;

          return (
            <div
              key={scene.sceneId}
              className={`bg-[#0B1017] border rounded-xl transition-all overflow-hidden ${
                isExpanded
                  ? 'border-[#00AFFF]/40 shadow-lg shadow-[#00AFFF]/5'
                  : 'border-[#1C2735] hover:border-[#2A3B4F]'
              }`}
            >
              {/* Scene Card Header */}
              <div
                onClick={() => setExpandedSceneId(isExpanded ? null : scene.sceneId)}
                className="p-4 flex items-center justify-between cursor-pointer select-none bg-[#0E1520] hover:bg-[#111824] transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF] font-mono font-bold text-xs shrink-0">
                    {scene.sceneNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-mono text-xs font-bold text-white">
                        {scene.sceneId}
                      </span>
                      <span className="text-xs font-semibold text-white truncate max-w-sm">
                        {scene.title}
                      </span>
                      <span className="text-[10px] font-mono bg-[#141C26] text-[#79838E] px-1.5 py-0.5 rounded border border-[#1C2735]">
                        {scene.locationId}
                      </span>
                      <span className="text-[10px] font-mono bg-[#141C26] text-[#79838E] px-1.5 py-0.5 rounded border border-[#1C2735]">
                        {scene.timeOfDay}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#79838E] truncate max-w-md mt-0.5">
                      {scene.storyPurpose}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 ml-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-mono font-bold text-[#00AFFF] flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{scene.estimatedSceneDuration}s</span>
                    </div>
                    <div className="text-[10px] text-[#79838E]">
                      {scene.actionBlocks?.length || 0} actions • {scene.dialogueBlocks?.length || 0} lines
                    </div>
                  </div>
                  <div className="text-[#79838E]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Card Details */}
              {isExpanded && (
                <div className="p-4 md:p-5 border-t border-[#1C2735] space-y-4 text-xs">
                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingScene(scene)}
                        className="px-2.5 py-1 rounded bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-[#00AFFF]" />
                        <span>Edit Scene</span>
                      </button>
                      <button
                        onClick={() => handleCopyScene(scene)}
                        className="px-2.5 py-1 rounded bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer"
                      >
                        {copiedSceneId === scene.sceneId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedSceneId === scene.sceneId ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => handleTightenPacing(scene)}
                        disabled={isTightening}
                        className="px-2.5 py-1 rounded bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="w-3 h-3 text-[#F4A62A]" />
                        <span>{isTightening ? 'Tightening...' : 'Tighten Pacing'}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setRegeneratingScene(scene)}
                      className="px-2.5 py-1 rounded bg-[#00AFFF]/10 hover:bg-[#00AFFF]/20 text-[#00AFFF] text-xs font-semibold flex items-center space-x-1 border border-[#00AFFF]/30 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Regenerate Scene</span>
                    </button>
                  </div>

                  {/* Badges / Asset Mappings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="bg-[#111820] border border-[#1C2735] p-2.5 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#79838E] flex items-center space-x-1">
                        <User className="w-3 h-3 text-[#00AFFF]" />
                        <span>Characters Present</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {scene.characterIds.map((cId) => (
                          <span key={cId} className="font-mono text-[10px] bg-[#141C26] text-[#00AFFF] px-1.5 py-0.5 rounded">
                            {cId}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#111820] border border-[#1C2735] p-2.5 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#79838E] flex items-center space-x-1">
                        <Shirt className="w-3 h-3 text-[#F4A62A]" />
                        <span>Wardrobe Outfits</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {scene.wardrobeIds.map((wId) => (
                          <span key={wId} className="font-mono text-[10px] bg-[#141C26] text-[#F4A62A] px-1.5 py-0.5 rounded">
                            {wId}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#111820] border border-[#1C2735] p-2.5 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#79838E] flex items-center space-x-1">
                        <Box className="w-3 h-3 text-emerald-400" />
                        <span>Significant Props</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {scene.propIds.length > 0 ? (
                          scene.propIds.map((pId) => (
                            <span key={pId} className="font-mono text-[10px] bg-[#141C26] text-emerald-400 px-1.5 py-0.5 rounded">
                              {pId}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-[#79838E]">None specified</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Formatted Screenplay Block */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono uppercase text-[#79838E] font-bold">
                        Screenplay Script View
                      </span>
                      <span className="text-[10px] text-[#79838E]">
                        Estimated: {scene.estimatedSceneDuration} seconds
                      </span>
                    </div>
                    <div className="bg-[#070B10] border border-[#1C2735] rounded-xl p-4 font-mono text-[11px] text-[#D7DCE2] whitespace-pre-wrap leading-relaxed select-text shadow-inner">
                      {scene.scriptText}
                    </div>
                  </div>

                  {/* Spoken Dialogue Blocks Detail */}
                  {scene.dialogueBlocks && scene.dialogueBlocks.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase text-[#79838E] font-bold">
                        Extracted Spoken Dialogue Lines ({scene.dialogueBlocks.length})
                      </span>
                      <div className="space-y-1.5">
                        {scene.dialogueBlocks.map((d) => (
                          <div
                            key={d.id}
                            className="bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 flex items-start justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white">{d.speakerName}</span>
                                <span className="text-[10px] font-mono text-[#00AFFF] bg-[#00AFFF]/10 px-1.5 py-0.2 rounded">
                                  {d.type}
                                </span>
                                {d.deliveryIntent && (
                                  <span className="text-[10px] italic text-[#79838E]">
                                    ({d.deliveryIntent})
                                  </span>
                                )}
                              </div>
                              <p className="text-[#D7DCE2] mt-1 font-serif text-[13px]">
                                "{d.dialogue}"
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Continuity Notes */}
                  {scene.continuityNotes && scene.continuityNotes.length > 0 && (
                    <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 text-[11px] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#79838E]">
                        Continuity & Production Notes
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-[#D7DCE2]">
                        {scene.continuityNotes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Scene Modal */}
      {editingScene && (
        <EditSceneModal
          scene={editingScene}
          isOpen={true}
          onClose={() => setEditingScene(null)}
          onSave={(updated) => updateStage3Scene(updated.sceneId, updated)}
        />
      )}

      {/* Regenerate Scene Modal */}
      {regeneratingScene && (
        <RegenerateSceneModal
          scene={regeneratingScene}
          isOpen={true}
          onClose={() => setRegeneratingScene(null)}
          onRegenerate={handleRegenerateWithGuidance}
        />
      )}
    </div>
  );
};
