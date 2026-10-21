import React, { useState } from 'react';
import { X, Check, Scissors, AlertCircle, Clock } from 'lucide-react';
import { CinematicShot, ShotDuration } from '../../types/filmStudio';

interface SplitShotModalProps {
  shot: CinematicShot;
  isOpen: boolean;
  onClose: () => void;
  onSplit: (shotA: CinematicShot, shotB: CinematicShot) => void;
}

export const SplitShotModal: React.FC<SplitShotModalProps> = ({
  shot,
  isOpen,
  onClose,
  onSplit,
}) => {
  const [shotADuration, setShotADuration] = useState<ShotDuration>(6);
  const [shotBDuration, setShotBDuration] = useState<ShotDuration>(shot.duration === 10 ? 8 : 6);
  const [shotAPurpose, setShotAPurpose] = useState(`${shot.purpose} (Part A: Setup)`);
  const [shotBPurpose, setShotBPurpose] = useState(`${shot.purpose} (Part B: Payoff)`);

  if (!isOpen) return null;

  const handleConfirmSplit = () => {
    const shotA: CinematicShot = {
      ...shot,
      shotId: `${shot.shotId}A`,
      duration: shotADuration,
      purpose: shotAPurpose,
      order: shot.order,
      continuityNotes: [...shot.continuityNotes, 'Split from original shot sequence (Part A)'],
    };

    const shotB: CinematicShot = {
      ...shot,
      shotId: `${shot.shotId}B`,
      duration: shotBDuration,
      purpose: shotBPurpose,
      order: shot.order + 1,
      flowMode: shot.flowMode,
      firstFramePrompt: shot.flowMode === 'FRAMES'
        ? `${shot.firstFramePrompt || ''} Continuation cut from ${shotA.shotId}.`
        : null,
      continuityNotes: [...shot.continuityNotes, 'Split from original shot sequence (Part B)'],
    };

    onSplit(shotA, shotB);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-white text-base">
                Split Shot [{shot.shotId}]
              </h3>
              <p className="text-[11px] text-[#79838E]">
                Decompose into two continuous filmable shots (Strictly 6s, 8s, or 10s each).
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#79838E] hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3 text-[#D7DCE2] space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#79838E]">Current Shot</div>
            <div className="font-bold text-white">{shot.purpose}</div>
            <div className="font-mono text-[11px] text-[#00AFFF]">Current Duration: {shot.duration}s</div>
          </div>

          {/* Shot A Config */}
          <div className="p-3 bg-[#0E1520] border border-[#1C2735] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Shot A ({shot.shotId}A)</span>
              <div className="flex items-center space-x-1">
                {([6, 8, 10] as ShotDuration[]).map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setShotADuration(dur)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer ${
                      shotADuration === dur
                        ? 'bg-[#00AFFF] text-white'
                        : 'bg-[#111820] text-[#79838E] hover:text-white'
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={shotAPurpose}
              onChange={(e) => setShotAPurpose(e.target.value)}
              placeholder="Shot A Purpose..."
              className="w-full bg-[#111820] border border-[#1C2735] rounded px-2.5 py-1.5 text-white text-xs outline-none"
            />
          </div>

          {/* Shot B Config */}
          <div className="p-3 bg-[#0E1520] border border-[#1C2735] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Shot B ({shot.shotId}B)</span>
              <div className="flex items-center space-x-1">
                {([6, 8, 10] as ShotDuration[]).map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setShotBDuration(dur)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer ${
                      shotBDuration === dur
                        ? 'bg-[#00AFFF] text-white'
                        : 'bg-[#111820] text-[#79838E] hover:text-white'
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={shotBPurpose}
              onChange={(e) => setShotBPurpose(e.target.value)}
              placeholder="Shot B Purpose..."
              className="w-full bg-[#111820] border border-[#1C2735] rounded px-2.5 py-1.5 text-white text-xs outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 text-[#79838E] text-[11px]">
            <Clock className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span>Combined Split Runtime: <strong className="text-white font-mono">{shotADuration + shotBDuration}s</strong></span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 border-t border-[#1C2735] pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#111820] text-[#79838E] hover:text-white text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSplit}
            className="px-5 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-[#00AFFF]/20"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm Split</span>
          </button>
        </div>
      </div>
    </div>
  );
};
