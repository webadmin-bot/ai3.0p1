import React, { useState } from 'react';
import { X, Save, Edit3, Film, Sparkles, Volume2, Clock, Ban } from 'lucide-react';
import { GoogleFlowShotPackage } from '../../types/filmStudio';

interface EditFlowPromptModalProps {
  pkg: GoogleFlowShotPackage | null;
  onClose: () => void;
  onSave: (updated: GoogleFlowShotPackage) => void;
}

export const EditFlowPromptModal: React.FC<EditFlowPromptModalProps> = ({
  pkg,
  onClose,
  onSave,
}) => {
  if (!pkg) return null;

  const [videoPrompt, setVideoPrompt] = useState(pkg.videoPrompt);
  const [firstFramePrompt, setFirstFramePrompt] = useState(pkg.firstFramePrompt || '');
  const [endFramePrompt, setEndFramePrompt] = useState(pkg.endFramePrompt || '');
  const [dialogue, setDialogue] = useState(pkg.audioLanes?.dialogue || '');
  const [narrationOrVO, setNarrationOrVO] = useState(pkg.audioLanes?.narrationOrVO || '');
  const [ambience, setAmbience] = useState(pkg.audioLanes?.ambience || '');
  const [sfx, setSfx] = useState(pkg.audioLanes?.sfx || '');
  const [music, setMusic] = useState(pkg.audioLanes?.music || '');
  const [lipSyncRequired, setLipSyncRequired] = useState(Boolean(pkg.audioLanes?.lipSyncRequired));
  const [exclusions, setExclusions] = useState((pkg.exclusions || []).join('\n'));
  const [notes, setNotes] = useState(pkg.notes || '');

  const handleSave = () => {
    const updated: GoogleFlowShotPackage = {
      ...pkg,
      videoPrompt,
      firstFramePrompt: pkg.flowMode === 'FRAMES' ? (firstFramePrompt.trim() || null) : pkg.firstFramePrompt,
      endFramePrompt: endFramePrompt.trim() || null,
      audioLanes: {
        dialogue: dialogue.trim() || 'None',
        narrationOrVO: narrationOrVO.trim() || 'None',
        ambience: ambience.trim() || 'Room tone',
        sfx: sfx.trim() || 'Natural movement',
        music: music.trim() || 'None',
        lipSyncRequired,
      },
      exclusions: exclusions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      notes,
      promptVersion: (pkg.promptVersion || 1) + 1,
      hasUserEdits: true,
      textReadiness:
        pkg.flowMode === 'FRAMES' && (!firstFramePrompt || !firstFramePrompt.trim())
          ? 'TEXT_BLOCKED'
          : 'TEXT_READY',
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-0 my-8">
        {/* Header */}
        <div className="bg-[#111820] border-b border-[#1C2735] p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00AFFF]/10 border border-[#00AFFF]/30 flex items-center justify-center text-[#00AFFF]">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[#00AFFF]">{pkg.shotId}</span>
                <span className="text-xs text-[#79838E]">• {pkg.flowMode} • {pkg.plannedDuration}s</span>
              </div>
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                Edit Flow Video Prompt & Directives
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
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Video Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>Final Video Prompt (Main Motion & Staging Instruction)</span>
            </label>
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              rows={5}
              className="w-full bg-[#070B10] border border-[#1C2735] focus:border-[#00AFFF] rounded-xl p-3 text-xs text-white font-mono leading-relaxed resize-y focus:outline-none"
              placeholder="Detailed staging, camera motion, performance, and lighting instructions..."
            />
          </div>

          {/* Frames Mode Specific */}
          {pkg.flowMode === 'FRAMES' && (
            <div className="bg-[#111820] border border-indigo-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300 uppercase tracking-wide">
                <Film className="w-3.5 h-3.5" />
                <span>Frames Mode Keyframe Prompts</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#D7DCE2] block">
                  First Frame Keyframe Prompt (Required):
                </label>
                <textarea
                  value={firstFramePrompt}
                  onChange={(e) => setFirstFramePrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-[#070B10] border border-[#1C2735] focus:border-indigo-400 rounded-lg p-2.5 text-xs text-white font-mono leading-relaxed resize-y focus:outline-none"
                  placeholder="Detailed still-image opening composition..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#D7DCE2] block">
                  End Frame Keyframe Prompt (Optional):
                </label>
                <textarea
                  value={endFramePrompt}
                  onChange={(e) => setEndFramePrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-[#070B10] border border-[#1C2735] focus:border-indigo-400 rounded-lg p-2.5 text-xs text-white font-mono leading-relaxed resize-y focus:outline-none"
                  placeholder="Optional ending composition if required..."
                />
              </div>
            </div>
          )}

          {/* Audio Lanes */}
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span>Audio Lanes & Dialogue</span>
              </span>
              <label className="flex items-center space-x-2 cursor-pointer text-[11px] text-[#D7DCE2]">
                <input
                  type="checkbox"
                  checked={lipSyncRequired}
                  onChange={(e) => setLipSyncRequired(e.target.checked)}
                  className="rounded border-[#1C2735] text-[#00AFFF] focus:ring-0"
                />
                <span>Lip-sync required for on-screen dialogue</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[#79838E] text-[11px]">Dialogue (Verbatim):</span>
                <input
                  type="text"
                  value={dialogue}
                  onChange={(e) => setDialogue(e.target.value)}
                  className="w-full bg-[#070B10] border border-[#1C2735] rounded p-2 text-white text-xs focus:outline-none focus:border-[#00AFFF]"
                  placeholder="Character lines or 'None'"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[#79838E] text-[11px]">Narration / Voice-Over:</span>
                <input
                  type="text"
                  value={narrationOrVO}
                  onChange={(e) => setNarrationOrVO(e.target.value)}
                  className="w-full bg-[#070B10] border border-[#1C2735] rounded p-2 text-white text-xs focus:outline-none focus:border-[#00AFFF]"
                  placeholder="VO line or 'None'"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[#79838E] text-[11px]">Ambience:</span>
                <input
                  type="text"
                  value={ambience}
                  onChange={(e) => setAmbience(e.target.value)}
                  className="w-full bg-[#070B10] border border-[#1C2735] rounded p-2 text-white text-xs focus:outline-none focus:border-[#00AFFF]"
                  placeholder="e.g. Quiapo monsoon rain, distant thunder"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[#79838E] text-[11px]">SFX / Foley:</span>
                <input
                  type="text"
                  value={sfx}
                  onChange={(e) => setSfx(e.target.value)}
                  className="w-full bg-[#070B10] border border-[#1C2735] rounded p-2 text-white text-xs focus:outline-none focus:border-[#00AFFF]"
                  placeholder="e.g. Clock ticking, wet shoes on wood"
                />
              </div>
            </div>
          </div>

          {/* Negative Exclusions */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Ban className="w-3.5 h-3.5 text-red-400" />
              <span>Negative Constraints / Exclusions (one per line)</span>
            </label>
            <textarea
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
              rows={3}
              className="w-full bg-[#070B10] border border-[#1C2735] focus:border-red-400 rounded-xl p-3 text-xs text-white font-mono leading-relaxed resize-y focus:outline-none"
              placeholder="No camera wobble\nNo character wardrobe drift"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#79838E] uppercase tracking-wider block">
              Internal Director Notes:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#070B10] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
              placeholder="Production notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#111820] border-t border-[#1C2735] p-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#79838E] hover:text-white rounded-lg hover:bg-[#1C2735] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Package Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
