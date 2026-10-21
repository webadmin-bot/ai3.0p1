import React, { useState } from 'react';
import { X, Check, Film, Clock, AlertTriangle } from 'lucide-react';
import { ScriptScene } from '../../types/filmStudio';

interface EditSceneModalProps {
  scene: ScriptScene;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedScene: ScriptScene) => void;
}

export const EditSceneModal: React.FC<EditSceneModalProps> = ({
  scene,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(scene.title);
  const [storyPurpose, setStoryPurpose] = useState(scene.storyPurpose);
  const [locationId, setLocationId] = useState(scene.locationId);
  const [timeOfDay, setTimeOfDay] = useState(scene.timeOfDay);
  const [scriptText, setScriptText] = useState(scene.scriptText);
  const [duration, setDuration] = useState(scene.estimatedSceneDuration);
  const [hasChangedVerbatim, setHasChangedVerbatim] = useState(false);

  if (!isOpen) return null;

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScriptText(e.target.value);
    if (scene.isOwnScriptVerbatim && !hasChangedVerbatim) {
      setHasChangedVerbatim(true);
    }
  };

  const handleSave = () => {
    onSave({
      ...scene,
      title,
      storyPurpose,
      locationId,
      timeOfDay,
      scriptText,
      estimatedSceneDuration: Number(duration) || scene.estimatedSceneDuration,
      hasUserModifications: true,
      isOwnScriptVerbatim: scene.isOwnScriptVerbatim && !hasChangedVerbatim,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-white text-base">
                Edit Scene [{scene.sceneId}]
              </h3>
              <p className="text-[11px] text-[#79838E]">
                Modify staging, visible action, dialogue lines, or estimated duration.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#79838E] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if Mode C Verbatim Original Script */}
        {scene.isOwnScriptVerbatim && (
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-[#F4A62A]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Original Screenplay Source of Truth:</span> This scene was imported verbatim from your uploaded script. Editing the text will mark it as a user-modified copy rather than untouched original author text.
            </div>
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#79838E] mb-1 font-semibold">Scene Title / Slugline</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white text-xs focus:border-[#00AFFF] outline-none"
              />
            </div>
            <div>
              <label className="block text-[#79838E] mb-1 font-semibold">Location ID / Anchor</label>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white text-xs focus:border-[#00AFFF] outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#79838E] mb-1 font-semibold">Time of Day</label>
              <input
                type="text"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white text-xs focus:border-[#00AFFF] outline-none"
              />
            </div>
            <div>
              <label className="block text-[#79838E] mb-1 font-semibold flex items-center space-x-1">
                <Clock className="w-3 h-3 text-[#00AFFF]" />
                <span>Estimated Scene Duration (seconds)</span>
              </label>
              <input
                type="number"
                min="6"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white text-xs focus:border-[#00AFFF] outline-none font-mono"
              />
              <span className="text-[10px] text-[#79838E]">
                Scenes may be any length (e.g. 24s, 30s); shots decomposed from it will be strictly 6s/8s/10s.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[#79838E] mb-1 font-semibold">Narrative Purpose</label>
            <textarea
              rows={2}
              value={storyPurpose}
              onChange={(e) => setStoryPurpose(e.target.value)}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-3 text-white text-xs focus:border-[#00AFFF] outline-none"
            />
          </div>

          <div>
            <label className="block text-[#79838E] mb-1 font-semibold">
              Screenplay Formatted Text (Slugline, Action, Dialogue)
            </label>
            <textarea
              rows={8}
              value={scriptText}
              onChange={handleScriptChange}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-3 font-mono text-[11px] text-white focus:border-[#00AFFF] outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2 border-t border-[#1C2735] pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#111820] text-[#79838E] hover:text-white text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-[#00AFFF]/20"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Scene Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
