import React, { useState } from 'react';
import { X, Check, Camera, Clock, Layers, Sparkles, Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { CinematicShot, ShotDuration } from '../../types/filmStudio';
import { apiGenerateShotImage } from '../../services/api';

interface EditShotModalProps {
  shot: CinematicShot;
  maxAllowedDuration: ShotDuration;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedShot: CinematicShot) => void;
}

export const EditShotModal: React.FC<EditShotModalProps> = ({
  shot,
  maxAllowedDuration,
  isOpen,
  onClose,
  onSave,
}) => {
  const [duration, setDuration] = useState<ShotDuration>(shot.duration);
  const [purpose, setPurpose] = useState(shot.purpose);
  const [shotSize, setShotSize] = useState(shot.shotSize);
  const [cameraAngle, setCameraAngle] = useState(shot.cameraAngle);
  const [cameraMovement, setCameraMovement] = useState(shot.cameraMovement);
  const [lensIntent, setLensIntent] = useState(shot.lensIntent || '');
  const [blockingAndMovement, setBlockingAndMovement] = useState(shot.blockingAndMovement);
  const [lightingAndAtmosphere, setLightingAndAtmosphere] = useState(shot.lightingAndAtmosphere);
  const [flowMode, setFlowMode] = useState<'INGREDIENTS' | 'FRAMES'>(shot.flowMode);
  const [firstFramePrompt, setFirstFramePrompt] = useState(shot.firstFramePrompt || '');
  const [firstFrameImageData, setFirstFrameImageData] = useState<string | null>(shot.firstFrameImageData || null);
  const [routingReason, setRoutingReason] = useState(shot.routingReason);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  if (!isOpen) return null;

  const handleGenerateImage = async () => {
    if (!firstFramePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      const res = await apiGenerateShotImage({
        prompt: firstFramePrompt,
        aspectRatio: '16:9',
        shotId: shot.shotId,
      });
      if (res.success && res.imageData) {
        setFirstFrameImageData(res.imageData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFirstFrameImageData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave({
      ...shot,
      duration,
      purpose,
      shotSize,
      cameraAngle,
      cameraMovement,
      lensIntent,
      blockingAndMovement,
      lightingAndAtmosphere,
      flowMode,
      firstFramePrompt: flowMode === 'FRAMES' ? firstFramePrompt : shot.firstFramePrompt,
      firstFrameImageData,
      routingReason,
      routeManualOverride: flowMode !== shot.flowMode ? true : shot.routeManualOverride,
    });
    onClose();
  };

  const allowedDurations: ShotDuration[] = [6, 8, 10].filter(
    (d) => d <= maxAllowedDuration
  ) as ShotDuration[];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-white text-base">
                Edit Shot [{shot.shotId}]
              </h3>
              <p className="text-[11px] text-[#79838E]">
                Scene {shot.sceneId} • Order #{shot.order}
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

        <div className="space-y-4 text-xs">
          {/* Strict Duration Selector */}
          <div>
            <label className="block text-[#79838E] mb-1 font-semibold flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-white">
                <Clock className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span>Planned Shot Duration (Strict 6s / 8s / 10s Standard)</span>
              </span>
              <span className="text-[10px] text-[#F4A62A]">Non-negotiable rule</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5 mt-2">
              {([6, 8, 10] as ShotDuration[]).map((dur) => {
                const disabled = dur > maxAllowedDuration;
                return (
                  <button
                    key={dur}
                    type="button"
                    disabled={disabled}
                    onClick={() => setDuration(dur)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      duration === dur
                        ? 'bg-[#00AFFF]/20 border-[#00AFFF] text-white font-bold'
                        : disabled
                        ? 'bg-[#111820]/40 border-[#1C2735]/40 text-[#79838E]/40 cursor-not-allowed'
                        : 'bg-[#111820] border-[#1C2735] text-[#79838E] hover:text-white'
                    }`}
                  >
                    <div className="text-base font-bold font-mono">{dur}s</div>
                    <div className="text-[10px]">
                      {dur === 6 ? 'Fast Beat' : dur === 8 ? 'Standard Beat' : 'Extended / Sustained'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-[#79838E] mb-1 font-semibold">Shot Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white text-xs focus:border-[#00AFFF] outline-none"
            />
          </div>

          {/* Cinematography Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[#79838E] mb-1 font-semibold">Shot Size</label>
              <select
                value={shotSize}
                onChange={(e) => setShotSize(e.target.value as any)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-2 text-white text-xs focus:border-[#00AFFF] outline-none"
              >
                <option value="EXTREME_WIDE">Extreme Wide</option>
                <option value="WIDE">Wide</option>
                <option value="FULL">Full</option>
                <option value="MEDIUM_WIDE">Medium Wide</option>
                <option value="MEDIUM">Medium</option>
                <option value="MEDIUM_CLOSE_UP">Medium Close-Up</option>
                <option value="CLOSE_UP">Close-Up</option>
                <option value="EXTREME_CLOSE_UP">Extreme Close-Up</option>
                <option value="INSERT">Insert</option>
              </select>
            </div>

            <div>
              <label className="block text-[#79838E] mb-1 font-semibold">Camera Angle</label>
              <select
                value={cameraAngle}
                onChange={(e) => setCameraAngle(e.target.value as any)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-2 text-white text-xs focus:border-[#00AFFF] outline-none"
              >
                <option value="EYE_LEVEL">Eye Level</option>
                <option value="LOW_ANGLE">Low Angle</option>
                <option value="HIGH_ANGLE">High Angle</option>
                <option value="DUTCH_TILT">Dutch Tilt</option>
                <option value="BIRDS_EYE">Bird's Eye</option>
                <option value="OVER_THE_SHOULDER">Over The Shoulder</option>
                <option value="POV">POV</option>
              </select>
            </div>

            <div>
              <label className="block text-[#79838E] mb-1 font-semibold">Camera Movement</label>
              <select
                value={cameraMovement}
                onChange={(e) => setCameraMovement(e.target.value as any)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-2 text-white text-xs focus:border-[#00AFFF] outline-none"
              >
                <option value="STATIC">Static</option>
                <option value="SLOW_PUSH_IN">Slow Push-In</option>
                <option value="PULL_OUT">Pull Out</option>
                <option value="PAN_LEFT">Pan Left</option>
                <option value="PAN_RIGHT">Pan Right</option>
                <option value="TILT_UP">Tilt Up</option>
                <option value="TILT_DOWN">Tilt Down</option>
                <option value="TRACKING_LATERAL">Tracking Lateral</option>
                <option value="STEADICAM_FOLLOW">Steadicam Follow</option>
                <option value="ORBIT">Orbit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#79838E] mb-1 font-semibold">Lens Intent</label>
            <input
              type="text"
              value={lensIntent}
              onChange={(e) => setLensIntent(e.target.value)}
              placeholder="e.g. 35mm anamorphic prime lens, shallow depth of field"
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white text-xs focus:border-[#00AFFF] outline-none"
            />
          </div>

          <div>
            <label className="block text-[#79838E] mb-1 font-semibold">
              Blocking, Movement & Performance
            </label>
            <textarea
              rows={2}
              value={blockingAndMovement}
              onChange={(e) => setBlockingAndMovement(e.target.value)}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-white text-xs focus:border-[#00AFFF] outline-none"
            />
          </div>

          <div>
            <label className="block text-[#79838E] mb-1 font-semibold">
              Lighting & Atmosphere
            </label>
            <textarea
              rows={2}
              value={lightingAndAtmosphere}
              onChange={(e) => setLightingAndAtmosphere(e.target.value)}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-white text-xs focus:border-[#00AFFF] outline-none"
            />
          </div>

          {/* Flow Route Assignment */}
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span>Google Flow Production Route</span>
              </span>
              <span className="text-[10px] font-mono text-[#79838E]">
                Target video pipeline routing
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFlowMode('INGREDIENTS')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  flowMode === 'INGREDIENTS'
                    ? 'bg-[#00AFFF]/15 border-[#00AFFF] text-white font-bold'
                    : 'bg-[#090D13] border-[#1C2735] text-[#79838E] hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-white mb-0.5">INGREDIENTS</div>
                <div className="text-[10px] text-[#79838E]">
                  Consistent character/wardrobe/prop identity. Initial pose flexible.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFlowMode('FRAMES')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  flowMode === 'FRAMES'
                    ? 'bg-[#F4A62A]/15 border-[#F4A62A] text-white font-bold'
                    : 'bg-[#090D13] border-[#1C2735] text-[#79838E] hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-white mb-0.5">FRAMES</div>
                <div className="text-[10px] text-[#79838E]">
                  Precise starting keyframe composition, opening pose, or cut match.
                </div>
              </button>
            </div>

            <div>
              <label className="block text-[#79838E] mb-1 font-semibold">Routing Reason</label>
              <input
                type="text"
                value={routingReason}
                onChange={(e) => setRoutingReason(e.target.value)}
                className="w-full bg-[#090D13] border border-[#1C2735] rounded-lg px-3 py-1.5 text-white text-xs focus:border-[#00AFFF] outline-none"
              />
            </div>

            {flowMode === 'FRAMES' && (
              <div className="space-y-3 pt-1 border-t border-[#1C2735]">
                <div className="flex items-center justify-between">
                  <label className="text-[#F4A62A] font-semibold flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>First Frame Image Prompt (Required for FRAMES)</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage || !firstFramePrompt.trim()}
                      className="px-2.5 py-1 rounded bg-[#F4A62A]/20 hover:bg-[#F4A62A]/30 text-[#F4A62A] text-xs font-semibold flex items-center space-x-1 border border-amber-500/40 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      <span>{isGeneratingImage ? 'Generating...' : firstFrameImageData ? 'Regen AI' : 'Generate AI'}</span>
                    </button>
                    <label className="px-2.5 py-1 rounded bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] text-xs flex items-center space-x-1 border border-[#1C2735] transition-colors cursor-pointer">
                      <Upload className="w-3 h-3 text-[#00AFFF]" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {firstFrameImageData && (
                      <button
                        type="button"
                        onClick={() => setFirstFrameImageData(null)}
                        className="p-1 text-[#79838E] hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={firstFramePrompt}
                  onChange={(e) => setFirstFramePrompt(e.target.value)}
                  placeholder="Cinematic still prompt describing exact opening frame composition..."
                  className="w-full bg-[#090D13] border border-amber-500/40 rounded-lg p-2.5 font-mono text-[11px] text-white focus:border-[#F4A62A] outline-none leading-relaxed"
                />

                {/* Image Preview */}
                {firstFrameImageData && (
                  <div className="rounded-lg overflow-hidden border border-amber-500/30 max-h-44 bg-[#070B10]">
                    <img
                      src={firstFrameImageData}
                      alt="Shot First Frame"
                      className="w-full h-36 object-cover object-center"
                    />
                  </div>
                )}
              </div>
            )}
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
            <span>Save Shot Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
