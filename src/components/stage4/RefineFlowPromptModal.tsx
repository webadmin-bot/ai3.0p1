import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, Check, AlertCircle, Wand2 } from 'lucide-react';
import { GoogleFlowShotPackage, VisualAsset, VisualStyleBible } from '../../types/filmStudio';
import { apiRegenerateFlowPrompt } from '../../services/api';

interface RefineFlowPromptModalProps {
  pkg: GoogleFlowShotPackage | null;
  stage2Assets: VisualAsset[];
  styleBible: VisualStyleBible | null;
  onClose: () => void;
  onSuccess: (updated: GoogleFlowShotPackage) => void;
}

export const RefineFlowPromptModal: React.FC<RefineFlowPromptModalProps> = ({
  pkg,
  stage2Assets,
  styleBible,
  onClose,
  onSuccess,
}) => {
  if (!pkg) return null;

  const [guidance, setGuidance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickPills = [
    'Enhance camera motion & lens depth',
    'Sharpen character emotion & eye-line direction',
    'Clarify lighting contrast & environmental texture',
    'Tighten timing progression across the seconds',
    'Reinforce style consistency & exclude digital artifacts',
  ];

  const handleRefine = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiRegenerateFlowPrompt({
        shotPackage: pkg,
        styleBible,
        stage2Assets,
        guidance: guidance.trim() || undefined,
      });

      if (!res.success || !res.shotPackage) {
        throw new Error(res.error || 'Gemini model returned an unexpected response');
      }

      onSuccess(res.shotPackage);
      onClose();
    } catch (err: any) {
      console.error('Failed to refine Flow prompt:', err);
      setError(err?.message || 'Refinement service temporarily unavailable. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0">
        {/* Header */}
        <div className="bg-[#111820] border-b border-[#1C2735] p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4A62A]/10 border border-[#F4A62A]/30 flex items-center justify-center text-[#F4A62A]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[#F4A62A]">{pkg.shotId}</span>
                <span className="text-xs text-[#79838E]">• {pkg.flowMode} ({pkg.plannedDuration}s)</span>
              </div>
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                Refine Flow Video Prompt with Gemini
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#79838E] hover:text-white p-2 rounded-lg hover:bg-[#1C2735] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Current Prompt Preview */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#79838E] uppercase tracking-wider block">
              Current Prompt Text:
            </label>
            <div className="p-3 rounded-lg bg-[#070B10] border border-[#1C2735] font-mono text-[11px] text-[#D7DCE2] max-h-24 overflow-y-auto leading-relaxed">
              {pkg.videoPrompt}
            </div>
          </div>

          {/* User Guidance Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Wand2 className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>Directorial Refinement Instructions</span>
            </label>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              rows={3}
              className="w-full bg-[#070B10] border border-[#1C2735] focus:border-[#00AFFF] rounded-xl p-3 text-xs text-white placeholder-[#79838E]/60 focus:outline-none resize-none leading-relaxed"
              placeholder="e.g. Enhance camera push-in speed, make lighting more moody and amber, emphasize Mang Tomas's hand trembling..."
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickPills.map((pill, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGuidance((prev) => (prev ? `${prev}. ${pill}` : pill))}
                  className="text-[10px] bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] hover:text-[#00AFFF] px-2 py-1 rounded border border-[#1C2735] transition-colors cursor-pointer"
                >
                  + {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl flex items-start space-x-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Refinement Failed</span>
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#111820] border-t border-[#1C2735] p-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-[#79838E] hover:text-white rounded-lg hover:bg-[#1C2735] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleRefine}
            disabled={isSubmitting}
            className="px-5 py-2 bg-gradient-to-r from-[#F4A62A] to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-[#F4A62A]/25 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Refining with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Execute Refinement</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
