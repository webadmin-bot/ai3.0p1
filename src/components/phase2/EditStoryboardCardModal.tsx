import React, { useState } from 'react';
import {
  X,
  Camera,
  Clock,
  Sparkles,
  Upload,
  Trash2,
  Check,
  Move,
  MessageSquare,
  Mic,
  Volume2,
  MapPin,
  User,
  Package,
  Layers,
  Save,
  RefreshCw,
} from 'lucide-react';
import { CinematicShot, Project, ShotDuration } from '../../types/filmStudio';
import { useProject } from '../../context/ProjectContext';
import { buildStoryboardPrompt } from '../../services/storyboardEngine';
import { apiGenerateImagePreview } from '../../services/api';

interface EditStoryboardCardModalProps {
  shot: CinematicShot;
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedShot: CinematicShot) => void;
}

export const EditStoryboardCardModal: React.FC<EditStoryboardCardModalProps> = ({
  shot,
  project,
  isOpen,
  onClose,
  onSave,
}) => {
  const { attachImageToShot, removeImageFromShot } = useProject();

  const [form, setForm] = useState<CinematicShot>({ ...shot });
  const [activeTab, setActiveTab] = useState<'visual' | 'cinematography' | 'audio' | 'prompts'>('visual');
  const [activeFramePreview, setActiveFramePreview] = useState<'first' | 'end'>('first');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const characters = project.stage2?.assets?.filter((a) => a.type === 'CHARACTER') || [];
  const locations = project.stage2?.assets?.filter((a) => a.type === 'LOCATION') || [];
  const props = project.stage2?.assets?.filter((a) => a.type === 'PROP') || [];

  const handleToggleCharacter = (charId: string) => {
    const current = form.characterIds || [];
    if (current.includes(charId)) {
      setForm({ ...form, characterIds: current.filter((id) => id !== charId) });
    } else {
      setForm({ ...form, characterIds: [...current, charId] });
    }
  };

  const handleToggleProp = (propId: string) => {
    const current = form.propIds || [];
    if (current.includes(propId)) {
      setForm({ ...form, propIds: current.filter((id) => id !== propId) });
    } else {
      setForm({ ...form, propIds: [...current, propId] });
    }
  };

  const handleRebuildPrompt = (frameType: 'first' | 'end') => {
    const fresh = buildStoryboardPrompt(form, project, frameType);
    if (frameType === 'first') {
      setForm({ ...form, firstFramePrompt: fresh });
    } else {
      setForm({ ...form, endFramePrompt: fresh });
    }
    setStatusMsg(`Re-assembled ${frameType} frame prompt with current specs.`);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleGenerateImage = async () => {
    const prompt = activeFramePreview === 'first' ? form.firstFramePrompt : form.endFramePrompt;
    if (!prompt || !prompt.trim()) {
      setStatusMsg('Please provide a prompt before generating an image.');
      return;
    }

    setIsGenerating(true);
    setStatusMsg(null);
    try {
      const ar = project.settings.aspectRatio === '9:16' ? '9:16' : '16:9';
      const res = await apiGenerateImagePreview(prompt, ar);
      if (res.success && res.imageDataUrl) {
        if (activeFramePreview === 'first') {
          setForm({
            ...form,
            firstFrameImageData: res.imageDataUrl,
            firstFrameFileName: `${form.shotId}-first-frame.png`,
          });
          attachImageToShot(form.shotId, res.imageDataUrl, `${form.shotId}-first-frame.png`, 'first');
        } else {
          setForm({
            ...form,
            endFrameImageData: res.imageDataUrl,
            endFrameFileName: `${form.shotId}-end-frame.png`,
          });
          attachImageToShot(form.shotId, res.imageDataUrl, `${form.shotId}-end-frame.png`, 'end');
        }
        setStatusMsg('Image successfully generated and attached!');
      } else {
        setStatusMsg(res.error || 'Failed to generate image');
      }
    } catch (err: any) {
      setStatusMsg(err?.message || 'Error generating image preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        if (activeFramePreview === 'first') {
          setForm({
            ...form,
            firstFrameImageData: dataUrl,
            firstFrameFileName: file.name,
          });
          attachImageToShot(form.shotId, dataUrl, file.name, 'first');
        } else {
          setForm({
            ...form,
            endFrameImageData: dataUrl,
            endFrameFileName: file.name,
          });
          attachImageToShot(form.shotId, dataUrl, file.name, 'end');
        }
        setStatusMsg('Image uploaded and attached.');
        setTimeout(() => setStatusMsg(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (activeFramePreview === 'first') {
      setForm({ ...form, firstFrameImageData: null, firstFrameFileName: null });
      removeImageFromShot(form.shotId, 'first');
    } else {
      setForm({ ...form, endFrameImageData: null, endFrameFileName: null });
      removeImageFromShot(form.shotId, 'end');
    }
    setStatusMsg('Image detached.');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  const currentPreviewImage =
    activeFramePreview === 'first' ? form.firstFrameImageData : form.endFrameImageData;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 md:p-5 bg-[#0E141D] border-b border-[#1C2735] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded font-mono font-bold text-xs bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30">
              {form.shotId}
            </span>
            <div>
              <h3 className="text-base font-bold font-['Exo_2'] text-white">
                Edit Storyboard Shot Card #{form.order}
              </h3>
              <p className="text-[11px] text-[#79838E]">
                Modify visual action, cinematography, audio cues, image prompts, and references
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#1C2735] text-[#79838E] hover:text-white rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1C2735] bg-[#080C12] px-4">
          <button
            onClick={() => setActiveTab('visual')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'visual'
                ? 'border-[#00AFFF] text-white bg-[#0E141D]'
                : 'border-transparent text-[#79838E] hover:text-[#A0AEC0]'
            }`}
          >
            1. Visual Action & Canon
          </button>

          <button
            onClick={() => setActiveTab('cinematography')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'cinematography'
                ? 'border-[#00AFFF] text-white bg-[#0E141D]'
                : 'border-transparent text-[#79838E] hover:text-[#A0AEC0]'
            }`}
          >
            2. Camera & Lighting
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'audio'
                ? 'border-[#00AFFF] text-white bg-[#0E141D]'
                : 'border-transparent text-[#79838E] hover:text-[#A0AEC0]'
            }`}
          >
            3. Dialogue & Audio
          </button>

          <button
            onClick={() => setActiveTab('prompts')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'prompts'
                ? 'border-[#00AFFF] text-white bg-[#0E141D]'
                : 'border-transparent text-[#79838E] hover:text-[#A0AEC0]'
            }`}
          >
            4. Image Prompts & Frames
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-6 overflow-y-auto flex-1">
          {statusMsg && (
            <div className="p-3 bg-[#141F2E] border border-[#00AFFF]/40 text-[#00AFFF] text-xs rounded-lg flex items-center justify-between">
              <span>{statusMsg}</span>
              <button
                type="button"
                onClick={() => setStatusMsg(null)}
                className="text-white hover:underline ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: Visual Action & Canon */}
          {activeTab === 'visual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                    Duration (Seconds)
                  </label>
                  <select
                    value={form.duration || 8}
                    onChange={(e) => setForm({ ...form, duration: Number(e.target.value) as ShotDuration })}
                    className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                  >
                    <option value={6}>6 Seconds</option>
                    <option value={8}>8 Seconds</option>
                    <option value={10}>10 Seconds</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                    Linked Scene ID
                  </label>
                  <input
                    type="text"
                    value={form.sceneId || 'SCENE-01'}
                    onChange={(e) => setForm({ ...form, sceneId: e.target.value })}
                    className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                    Location Set Anchor
                  </label>
                  <select
                    value={form.locationId || ''}
                    onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                    className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.id})
                      </option>
                    ))}
                    {locations.length === 0 && <option value="LOC-01">LOC-01 Primary Set</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                  Visual Description & Dramatic Purpose
                </label>
                <textarea
                  value={form.purpose || ''}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  rows={3}
                  className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none leading-relaxed"
                  placeholder="Describe the visible drama, subject actions, and visual dynamics..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                  Blocking, Movement & Subject Entry/Exit
                </label>
                <textarea
                  value={form.blockingAndMovement || ''}
                  onChange={(e) => setForm({ ...form, blockingAndMovement: e.target.value })}
                  rows={2}
                  className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none leading-relaxed"
                  placeholder="Subject position, movement path, eye-line target..."
                />
              </div>

              {/* Characters Present Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1.5 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-[#00AFFF]" />
                  <span>Characters Present in Shot</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {characters.map((char) => {
                    const isSelected = (form.characterIds || []).includes(char.id);
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => handleToggleCharacter(char.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                          isSelected
                            ? 'bg-[#141F2E] border-[#00AFFF] text-white'
                            : 'bg-[#141C28] border-[#243346] text-[#79838E] hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {char.name} ({char.id})
                      </button>
                    );
                  })}
                  {characters.length === 0 && (
                    <span className="text-xs text-[#55606E]">
                      No characters defined yet in Pre-Production assets.
                    </span>
                  )}
                </div>
              </div>

              {/* Props Present Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1.5 flex items-center space-x-1">
                  <Package className="w-3.5 h-3.5 text-purple-400" />
                  <span>Key Story Props</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {props.map((prop) => {
                    const isSelected = (form.propIds || []).includes(prop.id);
                    return (
                      <button
                        key={prop.id}
                        type="button"
                        onClick={() => handleToggleProp(prop.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                            : 'bg-[#141C28] border-[#243346] text-[#79838E] hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {prop.name} ({prop.id})
                      </button>
                    );
                  })}
                  {props.length === 0 && (
                    <span className="text-xs text-[#55606E]">No props tagged.</span>
                  )}
                </div>
              </div>

              {/* Continuity Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                  Continuity Anchors & Screen Direction
                </label>
                <input
                  type="text"
                  value={form.continuityNotes?.join('; ') || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      continuityNotes: e.target.value.split(';').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                  placeholder="e.g. Costume match previous shot; Screen direction L to R; Eye-line 45 deg right"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Cinematography & Lighting */}
          {activeTab === 'cinematography' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                    Shot Size
                  </label>
                  <select
                    value={form.shotSize || 'MEDIUM'}
                    onChange={(e) => setForm({ ...form, shotSize: e.target.value as any })}
                    className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                  >
                    <option value="EXTREME_WIDE">EXTREME WIDE</option>
                    <option value="WIDE">WIDE</option>
                    <option value="FULL">FULL</option>
                    <option value="MEDIUM_WIDE">MEDIUM WIDE</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="MEDIUM_CLOSE_UP">MEDIUM CLOSE-UP</option>
                    <option value="CLOSE_UP">CLOSE-UP</option>
                    <option value="EXTREME_CLOSE_UP">EXTREME CLOSE-UP</option>
                    <option value="INSERT">INSERT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                    Camera Angle
                  </label>
                  <select
                    value={form.cameraAngle || 'EYE_LEVEL'}
                    onChange={(e) => setForm({ ...form, cameraAngle: e.target.value as any })}
                    className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                  >
                    <option value="EYE_LEVEL">EYE LEVEL</option>
                    <option value="LOW_ANGLE">LOW ANGLE</option>
                    <option value="HIGH_ANGLE">HIGH ANGLE</option>
                    <option value="DUTCH_TILT">DUTCH TILT</option>
                    <option value="BIRDS_EYE">BIRDS EYE / OVERHEAD</option>
                    <option value="OVER_THE_SHOULDER">OVER THE SHOULDER (OTS)</option>
                    <option value="POV">POV (POINT OF VIEW)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                    Camera Movement
                  </label>
                  <select
                    value={form.cameraMovement || 'STATIC'}
                    onChange={(e) => setForm({ ...form, cameraMovement: e.target.value as any })}
                    className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                  >
                    <option value="STATIC">STATIC</option>
                    <option value="SLOW_PUSH_IN">SLOW PUSH-IN</option>
                    <option value="PULL_OUT">PULL-OUT</option>
                    <option value="PAN_LEFT">PAN LEFT</option>
                    <option value="PAN_RIGHT">PAN RIGHT</option>
                    <option value="TILT_UP">TILT UP</option>
                    <option value="TILT_DOWN">TILT DOWN</option>
                    <option value="TRACKING_LATERAL">TRACKING LATERAL</option>
                    <option value="STEADICAM_FOLLOW">STEADICAM FOLLOW</option>
                    <option value="ORBIT">ORBIT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                    Screen Direction
                  </label>
                  <input
                    type="text"
                    value={form.screenDirection || 'Centered'}
                    onChange={(e) => setForm({ ...form, screenDirection: e.target.value })}
                    className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                    placeholder="e.g. Left to Right, Centered, Moving towards camera"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                  Lens Intent & Optics
                </label>
                <input
                  type="text"
                  value={form.lensIntent || ''}
                  onChange={(e) => setForm({ ...form, lensIntent: e.target.value })}
                  className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                  placeholder="e.g. 35mm anamorphic prime lens, f/2.0 aperture, subtle barrel distortion"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                  Lighting & Atmosphere
                </label>
                <textarea
                  value={form.lightingAndAtmosphere || ''}
                  onChange={(e) => setForm({ ...form, lightingAndAtmosphere: e.target.value })}
                  rows={2}
                  className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none leading-relaxed"
                  placeholder="Volumetric lighting, contrast ratio, color temperature..."
                />
              </div>
            </div>
          )}

          {/* TAB 3: Audio & Dialogue */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1 flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#00AFFF]" />
                  <span>Spoken Dialogue</span>
                </label>
                <textarea
                  value={form.dialogueText || ''}
                  onChange={(e) => setForm({ ...form, dialogueText: e.target.value })}
                  rows={2}
                  className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                  placeholder='e.g. KIRA: "The signal isn’t coming from orbit. It’s underneath us."'
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1 flex items-center space-x-1.5">
                  <Mic className="w-3.5 h-3.5 text-amber-400" />
                  <span>Narration / Voice-Over (VO)</span>
                </label>
                <textarea
                  value={form.narrationText || ''}
                  onChange={(e) => setForm({ ...form, narrationText: e.target.value })}
                  rows={2}
                  className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                  placeholder="e.g. NARRATOR: In 2084, the ground was no longer solid ground."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1 flex items-center space-x-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sound Effects (SFX) & Ambient Tone</span>
                </label>
                <textarea
                  value={form.sfxText || form.audioContext || ''}
                  onChange={(e) => setForm({ ...form, sfxText: e.target.value, audioContext: e.target.value })}
                  rows={2}
                  className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs focus:border-[#00AFFF] outline-none"
                  placeholder="e.g. Heavy atmospheric rain, sub-bass drone, metallic pneumatic click"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Prompts & Frame Images */}
          {activeTab === 'prompts' && (
            <div className="space-y-5">
              {/* Frame Preview Switcher */}
              <div className="flex items-center justify-between bg-[#141C28] p-2 rounded-xl border border-[#243346]">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveFramePreview('first')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeFramePreview === 'first'
                        ? 'bg-[#00AFFF] text-white'
                        : 'bg-transparent text-[#79838E] hover:text-white'
                    }`}
                  >
                    First Frame Keyframe
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveFramePreview('end')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeFramePreview === 'end'
                        ? 'bg-[#00AFFF] text-white'
                        : 'bg-transparent text-[#79838E] hover:text-white'
                    }`}
                  >
                    End Frame (Optional)
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleRebuildPrompt(activeFramePreview)}
                    className="px-2.5 py-1 text-[11px] rounded bg-[#1C2735] hover:bg-[#253446] text-[#A0AEC0] hover:text-white flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-assemble Prompt</span>
                  </button>
                </div>
              </div>

              {/* Prompt Textarea */}
              <div>
                <label className="block text-xs font-semibold text-[#A0AEC0] mb-1">
                  {activeFramePreview === 'first' ? 'First Frame Image Prompt' : 'End Frame Image Prompt'}
                </label>
                <textarea
                  value={
                    activeFramePreview === 'first'
                      ? form.firstFramePrompt || ''
                      : form.endFramePrompt || ''
                  }
                  onChange={(e) => {
                    if (activeFramePreview === 'first') {
                      setForm({ ...form, firstFramePrompt: e.target.value });
                    } else {
                      setForm({ ...form, endFramePrompt: e.target.value });
                    }
                  }}
                  rows={4}
                  className="w-full bg-[#141C28] border border-[#243346] text-white rounded-lg p-2.5 text-xs font-mono focus:border-[#00AFFF] outline-none leading-relaxed"
                  placeholder="Master visual style image prompt..."
                />
              </div>

              {/* Image Preview & Upload Container */}
              <div className="bg-[#090D13] p-4 rounded-xl border border-[#1C2735] flex flex-col md:flex-row items-center gap-4">
                <div className="w-48 h-32 bg-[#070A0F] rounded-lg border border-[#1C2735] overflow-hidden flex items-center justify-center shrink-0">
                  {currentPreviewImage ? (
                    <img
                      src={currentPreviewImage}
                      alt="Frame preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-[#55606E]">No image attached</span>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="text-xs font-bold text-white">
                    {activeFramePreview === 'first' ? 'Opening Keyframe Image' : 'Ending Keyframe Image'}
                  </div>
                  <p className="text-[11px] text-[#79838E]">
                    Generate with the configured Gemini image model or upload a local sketch/still.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isGenerating}
                      className="px-3 py-1.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>{isGenerating ? 'Generating...' : 'Generate with Gemini'}</span>
                    </button>

                    <label className="px-3 py-1.5 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-medium flex items-center space-x-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {currentPreviewImage && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950 text-red-400 border border-red-500/30 text-xs font-medium flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#1C2735] flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#55606E]">
              Shot ID: {form.shotId} (Stable Identifier)
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-[#D7DCE2] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
