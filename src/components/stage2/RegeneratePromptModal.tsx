import React, { useState } from 'react';
import { RefreshCw, X, Sparkles, AlertCircle } from 'lucide-react';
import { VisualAsset } from '../../types/filmStudio';
import { useProject } from '../../context/ProjectContext';
import { apiRegenerateAssetPrompt } from '../../services/api';

interface RegeneratePromptModalProps {
  asset: VisualAsset | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RegeneratePromptModal: React.FC<RegeneratePromptModalProps> = ({
  asset,
  isOpen,
  onClose,
}) => {
  const { project, updateStage2Asset } = useProject();
  const [guidance, setGuidance] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !asset) return null;

  const handleRegenerate = async () => {
    if (!project.storyCanon) {
      setError('Story Canon is required to regenerate prompts.');
      return;
    }

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await apiRegenerateAssetPrompt({
        asset,
        styleBible: project.stage2.styleBible,
        storyCanon: project.storyCanon,
        guidance: guidance.trim() || undefined,
      });

      if (response.success && response.asset) {
        updateStage2Asset(asset.id, response.asset);
        onClose();
      } else {
        setError(response.error || 'Failed to regenerate prompt. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error occurred.');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[#00AFFF]/15 text-[#00AFFF]">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-base text-white">
                Regenerate Prompt: {asset.name}
              </h3>
              <span className="font-mono text-[10px] text-[#79838E]">
                ID: {asset.id} • {asset.type}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#79838E] hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Prompt Snippet */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#79838E] uppercase tracking-wider">
            Current Prompt
          </label>
          <div className="bg-[#111820] border border-[#1C2735] p-3 rounded-lg text-xs font-mono text-[#D7DCE2] max-h-24 overflow-y-auto leading-relaxed">
            {asset.referencePrompt}
          </div>
        </div>

        {/* User Guidance Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#D7DCE2] flex items-center justify-between">
            <span>Director's Refinement Guidance (Optional)</span>
            <span className="text-[10px] text-[#79838E] font-normal">e.g. "Add weathered bronze patina, dramatic rim light"</span>
          </label>
          <textarea
            rows={3}
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            placeholder="Specify any adjustments to physical features, lighting, framing, materials, or style emphasis..."
            className="w-full bg-[#111820] border border-[#1C2735] focus:border-[#00AFFF] rounded-lg p-3 text-xs text-white placeholder-[#79838E] focus:outline-none"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2.5 pt-2 border-t border-[#1C2735]">
          <button
            type="button"
            onClick={onClose}
            disabled={isRegenerating}
            className="px-4 py-2 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] text-xs font-semibold rounded-lg border border-[#1C2735] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 bg-[#00AFFF] hover:bg-[#0090D0] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-[#00AFFF]/20 cursor-pointer"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Refining with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Regenerate Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
