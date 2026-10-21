import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { ScriptScene } from '../../types/filmStudio';

interface RegenerateSceneModalProps {
  scene: ScriptScene;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (guidance: string) => Promise<void>;
}

export const RegenerateSceneModal: React.FC<RegenerateSceneModalProps> = ({
  scene,
  isOpen,
  onClose,
  onRegenerate,
}) => {
  const [guidance, setGuidance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onRegenerate(guidance);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-white text-base">
                Regenerate Scene [{scene.sceneId}]
              </h3>
              <p className="text-[11px] text-[#79838E]">
                Targeted AI rewrite maintaining canonical character identities and narrative purpose.
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="text-[#79838E] hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3 text-[#D7DCE2] space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#79838E]">Target Scene</div>
            <div className="font-bold text-white">{scene.title}</div>
            <div className="text-[11px] text-[#79838E]">{scene.storyPurpose}</div>
          </div>

          <div>
            <label className="block text-white mb-1.5 font-semibold">
              Director's Notes / Rewrite Guidance
            </label>
            <textarea
              rows={4}
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="e.g. Intensify the psychological tension during Mang Tomas's dialogue; add more tactile physical actions with the clock gears..."
              className="w-full bg-[#111820] border border-[#1C2735] rounded-xl p-3 text-white text-xs focus:border-[#00AFFF] outline-none leading-relaxed"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 border-t border-[#1C2735] pt-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-[#111820] text-[#79838E] hover:text-white text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-[#00AFFF]/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Regenerating Scene...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Regenerate Scene</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
