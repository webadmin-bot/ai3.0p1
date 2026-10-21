import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  Copy,
  Check,
  Upload,
  Trash2,
  Edit3,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Archive,
  ArrowRight,
  User,
  MapPin,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { CinematicShot } from '../../types/filmStudio';
import { saveMediaItemDetailed } from '../../services/mediaStore';

export const ShotFramePromptsTab: React.FC = () => {
  const { project, updateStage3Shot, attachImageToShot, removeImageFromShot } = useProject();
  const shots: CinematicShot[] = project.stage3?.shots || [];
  const assets = project.stage2?.assets || [];

  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [editingShotId, setEditingShotId] = useState<string | null>(null);
  const [editedFirstFramePrompt, setEditedFirstFramePrompt] = useState<string>('');
  const [editedEndFramePrompt, setEditedEndFramePrompt] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showLegacyArchive, setShowLegacyArchive] = useState(false);
  const [filterRoute, setFilterRoute] = useState<'ALL' | 'INGREDIENTS' | 'FRAMES'>('ALL');

  // Legacy storyboard cards preservation
  const legacyCards = (project as any).stage3?.storyboardCards || [];

  const filteredShots = shots.filter((s) => {
    if (filterRoute === 'ALL') return true;
    return s.flowMode === filterRoute;
  });

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const handleStartEdit = (shot: CinematicShot) => {
    setEditingShotId(shot.shotId);
    setEditedFirstFramePrompt(shot.firstFramePrompt || '');
    setEditedEndFramePrompt(shot.endFramePrompt || '');
  };

  const handleSaveEdit = (shotId: string) => {
    updateStage3Shot(shotId, {
      firstFramePrompt: editedFirstFramePrompt,
      endFramePrompt: editedEndFramePrompt,
    });
    setEditingShotId(null);
  };

  // Free manual mode: upload keyframe image and persist in mediaStore
  const handleFileUpload = async (shot: CinematicShot, file: File, isEndFrame: boolean = false) => {
    setUploadError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        const mediaId = `media_shot_${shot.shotId}_${isEndFrame ? 'end' : 'first'}_${Date.now()}`;
        const saveResult = await saveMediaItemDetailed(mediaId, dataUrl, {
          projectId: project.projectId,
          targetId: shot.shotId,
          imageRole: isEndFrame ? 'END_FRAME' : 'FIRST_FRAME',
          approvalStatus: 'APPROVED',
          mimeType: file.type || 'image/png',
          filename: file.name,
          source: 'UPLOAD',
        });

        if (saveResult.success) {
          if (isEndFrame) {
            updateStage3Shot(shot.shotId, {
              endFrameImageData: dataUrl,
              endFrameFileName: file.name,
              endFrameImageId: mediaId,
              endFrameMedia: {
                source: 'UPLOAD',
                mediaId,
                mimeType: file.type || 'image/png',
                filename: file.name,
                verified: true,
                dataUrl,
              },
            });
          } else {
            attachImageToShot(shot.shotId, dataUrl, file.name);
          }
        } else {
          setUploadError(`Failed to persist media: ${saveResult.warning || 'Storage quota reached'}`);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to read image file');
    }
  };

  const handleRemoveImage = (shotId: string) => {
    removeImageFromShot(shotId, 'first');
  };

  const shotsWithImage = shots.filter((s) => Boolean(s.firstFrameImageData || s.firstFrameMedia?.verified)).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30 uppercase tracking-wider">
              Phase 2 Tab 5 — Prompt & Reference Management
            </span>
            <span className="text-xs text-[#79838E]">
              Canonical Shots: <strong className="text-white font-mono">{shots.length}</strong>
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-['Exo_2'] text-white">
            Shot Frame Prompts & References
          </h2>
          <p className="text-xs text-[#8A96A6] max-w-2xl leading-relaxed">
            Manage first-frame prompts, optional end-frame prompts, and master reference linkages per shot.
            Engineered for free manual workflow: copy prompt, render externally in Midjourney or Flux, and upload reference keyframes without paid API dependencies.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          {legacyCards.length > 0 && (
            <button
              onClick={() => setShowLegacyArchive(!showLegacyArchive)}
              className="px-3.5 py-2 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-[#C5D0DE] border border-[#243346] text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <Archive className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>{showLegacyArchive ? 'Hide Legacy Archive' : `Legacy Archive (${legacyCards.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Filter and Stats Bar */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <Film className="w-4 h-4 text-[#00AFFF]" />
            <span className="text-[#8A96A6]">Total Saved Shots:</span>
            <span className="font-mono text-white font-bold">{shots.length}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-[#8A96A6]">Persisted Images:</span>
            <span className="font-mono text-white font-bold">{shotsWithImage}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-[#79838E]">Route Filter:</span>
          {(['ALL', 'INGREDIENTS', 'FRAMES'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterRoute(mode)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                filterRoute === mode
                  ? 'bg-[#00AFFF] text-white border-[#00AFFF]'
                  : 'bg-[#070B10] text-[#79838E] border-[#1C2735]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Legacy Archive Section (if toggled) */}
      {showLegacyArchive && legacyCards.length > 0 && (
        <div className="bg-[#0D131C] border border-[#F4A62A]/40 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1C2735] pb-3">
            <div className="flex items-center space-x-2">
              <Archive className="w-4 h-4 text-[#F4A62A]" />
              <h3 className="font-bold text-white text-sm">Legacy Storyboard Archive</h3>
            </div>
            <span className="text-xs text-[#79838E]">
              Preserved previous visual storyboard records. Work is retained and never deleted.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {legacyCards.map((card: any, idx: number) => (
              <div key={card.id || idx} className="p-3 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-[#F4A62A]">{card.id || `CARD-${idx + 1}`}</span>
                  <span className="text-[#79838E]">{card.shotNumber ? `Shot ${card.shotNumber}` : ''}</span>
                </div>
                {card.imageUrl && (
                  <img src={card.imageUrl} alt="Legacy thumbnail" className="w-full h-24 object-cover rounded border border-[#1C2735]" />
                )}
                <p className="text-[11px] text-[#8A96A6] line-clamp-2">{card.prompt || card.visualDescription || 'Legacy card description'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shots Frame Prompt List */}
      {shots.length === 0 ? (
        <div className="p-12 rounded-xl bg-[#0B1017] border border-[#1C2735] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#141C26] text-[#00AFFF] flex items-center justify-center mx-auto">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">No Canonical Shots in Project</h3>
          <p className="text-xs text-[#79838E] max-w-md mx-auto">
            Complete Phase 1 Script & Shots to plan your cinematic shot list. Each shot will appear here with copy-ready visual prompts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShots.map((shot) => {
            const isEditing = editingShotId === shot.shotId;
            const hasRealImage = Boolean(shot.firstFrameImageData || shot.firstFrameMedia?.verified);
            const hasEndImage = Boolean(shot.endFrameImageData || shot.endFrameMedia?.verified);

            // Mapped assets
            const mappedChars = assets.filter((a) => (shot.characterIds || []).includes(a.id));
            const mappedLoc = assets.find((a) => a.id === shot.locationId);
            const mappedProps = assets.filter((a) => (shot.propIds || []).includes(a.id));

            return (
              <div
                key={shot.shotId}
                className="bg-[#0B1017] border border-[#1C2735] hover:border-[#2A394C] rounded-xl overflow-hidden transition-all shadow-sm"
              >
                {/* Header */}
                <div className="p-4 bg-[#0E1520] border-b border-[#1C2735] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 rounded bg-[#141C26] font-mono text-xs font-bold text-[#00AFFF]">
                      {shot.shotId}
                    </span>
                    <span className="text-xs text-white font-medium">
                      Scene: {shot.sceneId} (Order #{shot.order})
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300">
                      {shot.duration}s
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        shot.flowMode === 'FRAMES'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      Route: {shot.flowMode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        hasRealImage
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                          : 'bg-[#1C2735] text-[#8A96A6]'
                      }`}
                    >
                      {hasRealImage ? 'IMAGE AVAILABLE' : 'IMAGE PENDING'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartEdit(shot)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-white text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-1 border border-[#243346]"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#00AFFF]" />
                      <span>{isEditing ? 'Cancel Edit' : 'Edit Prompts'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  {/* Camera & Staging Summary */}
                  <div className="flex flex-wrap gap-2 text-[11px] text-[#A0AEC0]">
                    <span className="bg-[#070B10] px-2 py-1 rounded border border-[#1C2735]">
                      <strong className="text-white">Framing:</strong> {shot.shotSize} ({shot.cameraAngle})
                    </span>
                    <span className="bg-[#070B10] px-2 py-1 rounded border border-[#1C2735]">
                      <strong className="text-white">Movement:</strong> {shot.cameraMovement}
                    </span>
                    <span className="bg-[#070B10] px-2 py-1 rounded border border-[#1C2735]">
                      <strong className="text-white">Lens:</strong> {shot.lensIntent || '35mm anamorphic'}
                    </span>
                    {shot.continuationFromShotId && (
                      <span className="bg-amber-950/40 text-amber-300 px-2 py-1 rounded border border-amber-500/30">
                        Continuation from <strong>{shot.continuationFromShotId}</strong>
                      </span>
                    )}
                  </div>

                  {/* Linked Reference Assets */}
                  <div className="p-3 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-1.5">
                    <div className="text-[10px] font-bold text-[#79838E] uppercase tracking-wider">
                      Linked Master Reference Assets
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mappedChars.map((c) => (
                        <span key={c.id} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#111820] text-[#D7DCE2] border border-[#1C2735] text-[11px]">
                          <User className="w-3 h-3 text-[#00AFFF]" />
                          <span>{c.name} ({c.id})</span>
                        </span>
                      ))}
                      {mappedLoc && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#111820] text-[#D7DCE2] border border-[#1C2735] text-[11px]">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{mappedLoc.name} ({mappedLoc.id})</span>
                        </span>
                      )}
                      {mappedProps.map((p) => (
                        <span key={p.id} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#111820] text-[#D7DCE2] border border-[#1C2735] text-[11px]">
                          <Sliders className="w-3 h-3 text-purple-400" />
                          <span>{p.name} ({p.id})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* First Frame Prompt Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#79838E] uppercase tracking-wider font-sans">
                        First-Frame Visual Prompt
                      </span>
                      <button
                        onClick={() => handleCopyPrompt(`${shot.shotId}_first`, shot.firstFramePrompt || '')}
                        className="text-[11px] text-[#00AFFF] hover:underline flex items-center space-x-1 cursor-pointer font-semibold"
                      >
                        {copiedPromptId === `${shot.shotId}_first` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPromptId === `${shot.shotId}_first` ? 'Copied!' : 'Copy First-Frame Prompt'}</span>
                      </button>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={editedFirstFramePrompt}
                        onChange={(e) => setEditedFirstFramePrompt(e.target.value)}
                        rows={3}
                        className="w-full p-3 rounded-lg bg-[#070B10] border border-[#00AFFF] text-white font-mono text-xs focus:outline-none"
                      />
                    ) : (
                      <div className="p-3.5 rounded-lg bg-[#070B10] border border-[#1C2735] text-[#D7DCE2] font-mono leading-relaxed">
                        {shot.firstFramePrompt || 'No first-frame prompt defined.'}
                      </div>
                    )}
                  </div>

                  {/* End Frame Prompt Box (Optional) */}
                  {(shot.endFramePrompt || isEditing) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#79838E] uppercase tracking-wider font-sans">
                          Optional End-Frame Visual Prompt
                        </span>
                        {shot.endFramePrompt && (
                          <button
                            onClick={() => handleCopyPrompt(`${shot.shotId}_end`, shot.endFramePrompt || '')}
                            className="text-[11px] text-[#00AFFF] hover:underline flex items-center space-x-1 cursor-pointer font-semibold"
                          >
                            {copiedPromptId === `${shot.shotId}_end` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedPromptId === `${shot.shotId}_end` ? 'Copied!' : 'Copy End-Frame Prompt'}</span>
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <textarea
                          value={editedEndFramePrompt}
                          onChange={(e) => setEditedEndFramePrompt(e.target.value)}
                          placeholder="Optional ending keyframe prompt..."
                          rows={2}
                          className="w-full p-3 rounded-lg bg-[#070B10] border border-[#00AFFF] text-white font-mono text-xs focus:outline-none"
                        />
                      ) : (
                        <div className="p-3 rounded-lg bg-[#070B10] border border-[#1C2735] text-[#D7DCE2] font-mono leading-relaxed">
                          {shot.endFramePrompt}
                        </div>
                      )}
                    </div>
                  )}

                  {isEditing && (
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setEditingShotId(null)}
                        className="px-3 py-1.5 rounded-lg bg-[#141C26] text-[#79838E] hover:text-white text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(shot.shotId)}
                        className="px-4 py-1.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}

                  {/* Free Manual Mode: Image Attachment Actions */}
                  <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      {hasRealImage && shot.firstFrameImageData ? (
                        <div className="relative group">
                          <img
                            src={shot.firstFrameImageData}
                            alt={`Shot ${shot.shotId} keyframe`}
                            className="w-16 h-12 object-cover rounded-md border border-[#1C2735]"
                          />
                          <button
                            onClick={() => handleRemoveImage(shot.shotId)}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-red-950 text-red-400 hover:text-white rounded-full border border-red-500/40 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove Keyframe"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-12 rounded-md bg-[#111820] border border-dashed border-[#1C2735] flex items-center justify-center text-[#55606E]">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}

                      <div>
                        <div className="font-bold text-white text-xs">
                          {hasRealImage ? 'Persisted Keyframe Attached' : 'No Keyframe Attached Yet'}
                        </div>
                        <div className="text-[11px] text-[#79838E]">
                          {hasRealImage
                            ? shot.firstFrameFileName || 'Stored securely in browser IndexedDB'
                            : 'Upload externally rendered reference to fulfill Flow FRAMES requirement'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                        <Upload className="w-3.5 h-3.5 text-[#00AFFF]" />
                        <span>{hasRealImage ? 'Replace Image' : 'Upload Keyframe'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(shot, file, false);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
