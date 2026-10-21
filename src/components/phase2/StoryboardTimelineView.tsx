import React from 'react';
import {
  Camera,
  Clock,
  ArrowLeft,
  ArrowRight,
  Move,
  MessageSquare,
  Sparkles,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Eye,
  Maximize2,
} from 'lucide-react';
import { CinematicShot, Project } from '../../types/filmStudio';
import { calculateAllTimecodes } from '../../services/storyboardEngine';

interface StoryboardTimelineViewProps {
  shots: CinematicShot[];
  project: Project;
  onEditShot: (shot: CinematicShot) => void;
  onMoveEarlier: (index: number) => void;
  onMoveLater: (index: number) => void;
  onPreviewImage: (dataUrl: string, title: string) => void;
}

export const StoryboardTimelineView: React.FC<StoryboardTimelineViewProps> = ({
  shots,
  project,
  onEditShot,
  onMoveEarlier,
  onMoveLater,
  onPreviewImage,
}) => {
  const timecodes = calculateAllTimecodes(shots);
  const totalDuration = shots.reduce((acc, s) => acc + (s.duration || 8), 0);

  return (
    <div className="space-y-6">
      {/* Timeline Header & Total Duration Ruler */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-[#00AFFF] uppercase tracking-wider">
            Sequential Reel Timeline View
          </span>
          <h3 className="text-base font-bold text-white font-['Exo_2']">
            Chronological Narrative Flow ({shots.length} Shots)
          </h3>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-[#79838E]">
            Sequence Runtime: <strong className="text-white font-mono">{totalDuration}s</strong>
          </span>
          <span className="text-[#79838E]">
            Target:{' '}
            <strong className="text-[#00AFFF] font-mono">
              {project.settings.targetRuntimeSeconds}s
            </strong>
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Filmstrip Container */}
      <div className="bg-[#080C12] border border-[#1C2735] rounded-xl p-4 overflow-x-auto">
        <div className="flex items-stretch space-x-4 min-w-max pb-3">
          {shots.map((shot, index) => {
            const tc = timecodes.get(shot.shotId);
            const hasImage = Boolean(shot.firstFrameImageData);
            const hasPrompt = Boolean(shot.firstFramePrompt && shot.firstFramePrompt.trim());

            return (
              <div
                key={shot.shotId}
                className="w-72 bg-[#0E141D] border border-[#1C2735] hover:border-[#00AFFF]/50 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between shrink-0 transition-all group"
              >
                {/* Shot Header */}
                <div className="p-2.5 bg-[#141C26] border-b border-[#1C2735] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-[#00AFFF]/20 text-[#00AFFF] border border-[#00AFFF]/30">
                      #{shot.order} {shot.shotId}
                    </span>
                    <span className="text-[10px] font-mono text-[#A0AEC0] flex items-center space-x-1">
                      <Clock className="w-2.5 h-2.5 text-[#00AFFF]" />
                      <span>{shot.duration || 8}s</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onMoveEarlier(index)}
                      disabled={index === 0}
                      className="p-1 hover:bg-[#1E2938] text-[#79838E] hover:text-white rounded disabled:opacity-30 cursor-pointer"
                      title="Move earlier"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onMoveLater(index)}
                      disabled={index === shots.length - 1}
                      className="p-1 hover:bg-[#1E2938] text-[#79838E] hover:text-white rounded disabled:opacity-30 cursor-pointer"
                      title="Move later"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onEditShot(shot)}
                      className="p-1 hover:bg-[#1E2938] text-[#79838E] hover:text-[#00AFFF] rounded cursor-pointer"
                      title="Edit card"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Timecode Badge */}
                <div className="px-3 py-1 bg-[#090D13] border-b border-[#16202C] flex items-center justify-between text-[10px] font-mono text-emerald-400">
                  <span>TC: {tc?.rangeDisplay || '00:00 – 00:08'}</span>
                  <span>
                    {hasImage ? (
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>IMAGE</span>
                      </span>
                    ) : hasPrompt ? (
                      <span className="text-amber-400">PROMPT</span>
                    ) : (
                      <span className="text-slate-500">PENDING</span>
                    )}
                  </span>
                </div>

                {/* Filmstrip Frame Thumbnail */}
                <div className="relative aspect-video bg-[#070A0F] overflow-hidden flex items-center justify-center border-b border-[#1C2735]">
                  {shot.firstFrameImageData ? (
                    <div className="relative w-full h-full group/thumb">
                      <img
                        src={shot.firstFrameImageData}
                        alt={shot.shotId}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() =>
                          onPreviewImage(shot.firstFrameImageData!, `${shot.shotId} — Keyframe`)
                        }
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white text-xs font-semibold"
                      >
                        <Maximize2 className="w-4 h-4 mr-1 text-[#00AFFF]" />
                        <span>Enlarge</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center p-3 space-y-1">
                      <Camera className="w-5 h-5 text-[#55606E] mx-auto" />
                      <div className="text-[10px] text-[#79838E]">
                        {hasPrompt ? 'Prompt ready' : 'No prompt yet'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Shot Summary & Camera Info */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-white line-clamp-2">
                      {shot.purpose || shot.blockingAndMovement || 'Dramatic progression'}
                    </div>

                    <div className="text-[10px] text-[#A0AEC0] flex items-center space-x-1">
                      <span>{(shot.shotSize || 'MEDIUM').replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span className="text-amber-400">
                        {(shot.cameraMovement || 'STATIC').replace(/_/g, ' ')}
                      </span>
                      <span>·</span>
                      <span>{(shot.cameraAngle || 'EYE_LEVEL').replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  {/* Spoken Dialogue Snippet if any */}
                  {shot.dialogueText && (
                    <div className="p-1.5 rounded bg-[#090D13] text-[10px] text-white italic line-clamp-1 border border-[#16202C] flex items-center space-x-1">
                      <MessageSquare className="w-2.5 h-2.5 text-[#00AFFF] shrink-0" />
                      <span>{shot.dialogueText}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
