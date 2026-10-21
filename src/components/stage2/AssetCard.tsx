import React, { useState, useRef } from 'react';
import {
  Copy,
  Check,
  Edit3,
  RefreshCw,
  Upload,
  Trash2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
  User,
  MapPin,
  Box,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Lock,
  ExternalLink,
  Download,
} from 'lucide-react';
import { VisualAsset } from '../../types/filmStudio';
import { useProject } from '../../context/ProjectContext';
import { formatPromptForEngine } from '../../services/phase2AssetEngine';
import { apiGenerateImagePreview } from '../../services/api';
import { saveMediaItemDetailed, ImageRole } from '../../services/mediaStore';

interface AssetCardProps {
  asset: VisualAsset;
  onUpdateAsset: (id: string, updates: Partial<VisualAsset>) => void;
  onRegeneratePrompt: (asset: VisualAsset) => void;
  onAttachImage: (id: string, dataUrl: string, fileName: string) => void;
  onRemoveImage: (id: string) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  onUpdateAsset,
  onRegeneratePrompt,
  onAttachImage,
  onRemoveImage,
}) => {
  const { project } = useProject();

  // Copy state
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedView, setCopiedView] = useState<string | null>(null);

  // Edit states
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPromptText, setEditedPromptText] = useState(asset.referencePrompt);
  const [isEditingTurnaround, setIsEditingTurnaround] = useState(false);
  const [editedTurnaroundText, setEditedTurnaroundText] = useState(asset.turnaroundPrompt || '');
  const [showSpecDetails, setShowSpecDetails] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'master' | 'front' | 'side' | 'back' | 'expression' | 'details'>('master');

  // Model-specific prompt formatting engine
  const [selectedEngine, setSelectedEngine] = useState<'GEMINI' | 'MIDJOURNEY' | 'FLUX' | 'SDXL'>('GEMINI');

  // Direct API Image Generation state (Mode B)
  const [isGeneratingApi, setIsGeneratingApi] = useState(false);
  const [apiGenError, setApiGenError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatted prompt based on selected engine
  const formattedPrompt = formatPromptForEngine(
    asset.referencePrompt,
    selectedEngine,
    project.settings.aspectRatio === '9:16' ? '9:16' : '16:9',
    project.visualStyle?.name
  );

  const handleCopyPrompt = async (textToCopy?: string, label: string = 'master') => {
    const text = textToCopy || formattedPrompt;
    try {
      await navigator.clipboard.writeText(text);
      if (label === 'master') {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      } else {
        setCopiedView(label);
        setTimeout(() => setCopiedView(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleSavePromptEdit = () => {
    onUpdateAsset(asset.id, {
      referencePrompt: editedPromptText,
      promptStatus: 'NEEDS_REAUDIT',
    });
    setIsEditingPrompt(false);
  };

  const handleSaveTurnaroundEdit = () => {
    onUpdateAsset(asset.id, {
      turnaroundPrompt: editedTurnaroundText,
      promptStatus: 'NEEDS_REAUDIT',
    });
    setIsEditingTurnaround(false);
  };

  const handleToggleApproval = () => {
    const newStatus = asset.approvalStatus === 'APPROVED' ? 'PENDING' : 'APPROVED';
    onUpdateAsset(asset.id, {
      approvalStatus: newStatus,
    });
  };

  // Mode A: File Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const mediaId = `asset_${asset.id}_${Date.now()}`;
      const role: ImageRole = asset.type === 'CHARACTER' ? 'FRONT' : 'REFERENCE';

      // Persistent save with IndexedDB
      const saveRes = await saveMediaItemDetailed(mediaId, dataUrl, {
        projectId: project.projectId,
        targetId: asset.id,
        imageRole: role,
        approvalStatus: 'APPROVED',
        source: 'UPLOAD',
        filename: file.name,
        mimeType: file.type,
      });

      if (!saveRes.isPersistent && saveRes.warning) {
        setStorageWarning(saveRes.warning);
      } else {
        setStorageWarning(null);
      }

      onAttachImage(asset.id, dataUrl, file.name);
      onUpdateAsset(asset.id, {
        approvalStatus: 'APPROVED',
        optionalReferenceImageId: mediaId,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Mode B: Direct API Image Generation
  const handleDirectApiGeneration = async () => {
    setIsGeneratingApi(true);
    setApiGenError(null);
    setStorageWarning(null);

    try {
      const ar = project.settings.aspectRatio === '9:16' ? '9:16' : '16:9';
      const promptToUse = asset.referencePrompt;

      const res = await apiGenerateImagePreview(promptToUse, ar);
      if (res.success && res.imageDataUrl) {
        const mediaId = `asset_api_${asset.id}_${Date.now()}`;
        const fileName = `${asset.id}-api-reference.png`;

        const saveRes = await saveMediaItemDetailed(mediaId, res.imageDataUrl, {
          projectId: project.projectId,
          targetId: asset.id,
          imageRole: 'REFERENCE',
          approvalStatus: 'APPROVED',
          source: 'GEMINI_GEN',
          filename: fileName,
        });

        if (!saveRes.isPersistent && saveRes.warning) {
          setStorageWarning(saveRes.warning);
        }

        onAttachImage(asset.id, res.imageDataUrl, fileName);
        onUpdateAsset(asset.id, {
          approvalStatus: 'APPROVED',
          optionalReferenceImageId: mediaId,
        });
      } else {
        setApiGenError(res.error || 'Direct image generation failed. Try Mode A: copy prompt and generate externally.');
      }
    } catch (err: any) {
      setApiGenError(err.message || 'Error communicating with image generation service.');
    } finally {
      setIsGeneratingApi(false);
    }
  };

  const handleDownloadImage = () => {
    if (!asset.optionalReferenceImageData) return;
    const a = document.createElement('a');
    a.href = asset.optionalReferenceImageData;
    a.download = `${asset.id}-approved-reference.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const typeConfig = {
    CHARACTER: {
      color: 'text-[#00AFFF] bg-[#00AFFF]/15 border-[#00AFFF]/30',
      icon: User,
      label: 'Character Asset',
    },
    WARDROBE: {
      color: 'text-[#F4A62A] bg-[#F4A62A]/15 border-[#F4A62A]/30',
      icon: Layers,
      label: 'Wardrobe Asset',
    },
    LOCATION: {
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      icon: MapPin,
      label: 'Location Set',
    },
    PROP: {
      color: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
      icon: Box,
      label: 'Story Prop',
    },
    SPECIAL: {
      color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
      icon: Sparkles,
      label: 'Special Catalyst',
    },
  }[asset.type] || {
    color: 'text-[#00AFFF] bg-[#00AFFF]/15 border-[#00AFFF]/30',
    icon: Sparkles,
    label: asset.type,
  };

  const TypeIcon = typeConfig.icon;
  const isApproved = asset.approvalStatus === 'APPROVED' || Boolean(asset.optionalReferenceImageData);

  return (
    <div className={`bg-[#0B1017] border ${isApproved ? 'border-emerald-500/40' : 'border-[#1C2735]'} hover:border-[#2E3E52] rounded-xl p-5 space-y-4 transition-all shadow-md`}>
      {/* 1. Header Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C2735] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold bg-[#141C26] text-white px-2.5 py-0.5 rounded border border-[#1C2735]">
            {asset.id}
          </span>
          <h3 className="font-['Exo_2'] font-bold text-base text-white tracking-wide">
            {asset.name}
          </h3>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase flex items-center space-x-1 ${typeConfig.color}`}>
            <TypeIcon className="w-3 h-3" />
            <span>{typeConfig.label}</span>
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[10px] font-mono">
          <span className="text-[#79838E] bg-[#111820] px-2 py-0.5 rounded border border-[#1C2735]">
            {asset.importance}
          </span>

          {/* Approval Status Toggle */}
          <button
            type="button"
            onClick={handleToggleApproval}
            className={`px-2 py-0.5 rounded border font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
              isApproved
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900'
                : 'bg-amber-950/80 text-amber-400 border-amber-500/40 hover:bg-amber-900'
            }`}
            title="Click to toggle approved design status"
          >
            {isApproved ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
            <span>{isApproved ? 'APPROVED' : 'PENDING'}</span>
          </button>
        </div>
      </div>

      {/* 2. Story Function & Narrative Context */}
      <div className="text-xs text-[#79838E]">
        <span className="text-[#D7DCE2] font-semibold">Story Function: </span>
        <span>{asset.storyFunction}</span>
        {asset.sourceCanonIds && asset.sourceCanonIds.length > 0 && (
          <span className="ml-2 font-mono text-[10px] text-[#00AFFF]">
            [{asset.sourceCanonIds.join(', ')}]
          </span>
        )}
      </div>

      {/* 3. Visual Specification Summary Box */}
      <div className="bg-[#111820] p-3.5 rounded-lg border border-[#1C2735] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#00AFFF] uppercase tracking-wider flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span>Visual Specification & Continuity Rules</span>
          </span>
          <button
            type="button"
            onClick={() => setShowSpecDetails(!showSpecDetails)}
            className="text-[10px] text-[#79838E] hover:text-white flex items-center space-x-1 cursor-pointer"
          >
            <span>{showSpecDetails ? 'Hide Continuity Breakdown' : 'Show Full Breakdown'}</span>
            {showSpecDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <p className="text-xs text-[#D7DCE2] leading-relaxed">
          {asset.visualSpecification?.summary || 'Authoritative visual specification generated from Phase 1 narrative canon.'}
        </p>

        {showSpecDetails && (
          <div className="pt-2 border-t border-[#1C2735]/70 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[#79838E]">
            {/* CHARACTER SPECIFIC FIELDS */}
            {asset.type === 'CHARACTER' && (
              <>
                {asset.silhouetteAndProportions && (
                  <div>
                    <span className="text-white font-semibold block">Silhouette & Proportions:</span>
                    <span>{asset.silhouetteAndProportions}</span>
                  </div>
                )}
                {asset.costumeAndAccessories && (
                  <div>
                    <span className="text-white font-semibold block">Signature Costume & Accessories:</span>
                    <span>{asset.costumeAndAccessories}</span>
                  </div>
                )}
                {asset.stableIdentityRules && (
                  <div className="sm:col-span-2">
                    <span className="text-white font-semibold block">Stable Visual Identity Anchor:</span>
                    <span className="text-emerald-300 font-mono text-[10px]">{asset.stableIdentityRules}</span>
                  </div>
                )}
              </>
            )}

            {/* LOCATION SPECIFIC FIELDS */}
            {asset.type === 'LOCATION' && (
              <>
                {asset.spatialLayout && (
                  <div>
                    <span className="text-white font-semibold block">Spatial Layout:</span>
                    <span>{asset.spatialLayout}</span>
                  </div>
                )}
                {asset.entryExitPoints && (
                  <div>
                    <span className="text-white font-semibold block">Entry & Exit Vectors:</span>
                    <span>{asset.entryExitPoints}</span>
                  </div>
                )}
                {asset.recurringLandmarks && (
                  <div>
                    <span className="text-white font-semibold block">Recurring Visual Landmarks:</span>
                    <span>{asset.recurringLandmarks}</span>
                  </div>
                )}
                {asset.continuityRequirements && (
                  <div>
                    <span className="text-white font-semibold block">Continuity Locks:</span>
                    <span>{asset.continuityRequirements}</span>
                  </div>
                )}
              </>
            )}

            {/* PROP SPECIFIC FIELDS */}
            {(asset.type === 'PROP' || asset.type === 'SPECIAL') && (
              <>
                {asset.physicalShape && (
                  <div>
                    <span className="text-white font-semibold block">Physical Shape & Material:</span>
                    <span>{asset.physicalShape}</span>
                  </div>
                )}
                {asset.dimensions && (
                  <div>
                    <span className="text-white font-semibold block">Dimensions Relative to Actor:</span>
                    <span>{asset.dimensions}</span>
                  </div>
                )}
                {asset.ownerOrHolder && (
                  <div>
                    <span className="text-white font-semibold block">Primary Owner / Holder:</span>
                    <span>{asset.ownerOrHolder}</span>
                  </div>
                )}
                {asset.continuityRequirements && (
                  <div>
                    <span className="text-white font-semibold block">Continuity & Wear:</span>
                    <span>{asset.continuityRequirements}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 4. Sub-View / Multi-Angle Tabs for Characters & Locations */}
      {asset.type === 'CHARACTER' && (asset.frontViewPrompt || asset.turnaroundPrompt) && (
        <div className="flex items-center space-x-1 bg-[#141C26] p-1 rounded-lg border border-[#1C2735] text-[11px]">
          <button
            type="button"
            onClick={() => setActiveSubView('master')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
              activeSubView === 'master' ? 'bg-[#00AFFF] text-white' : 'text-[#79838E] hover:text-white'
            }`}
          >
            Master Prompt
          </button>
          {asset.frontViewPrompt && (
            <button
              type="button"
              onClick={() => setActiveSubView('front')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                activeSubView === 'front' ? 'bg-[#00AFFF] text-white' : 'text-[#79838E] hover:text-white'
              }`}
            >
              Front View
            </button>
          )}
          {asset.sideViewPrompt && (
            <button
              type="button"
              onClick={() => setActiveSubView('side')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                activeSubView === 'side' ? 'bg-[#00AFFF] text-white' : 'text-[#79838E] hover:text-white'
              }`}
            >
              Side View
            </button>
          )}
          {asset.backViewPrompt && (
            <button
              type="button"
              onClick={() => setActiveSubView('back')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                activeSubView === 'back' ? 'bg-[#00AFFF] text-white' : 'text-[#79838E] hover:text-white'
              }`}
            >
              Back View
            </button>
          )}
          {asset.expressionPrompt && (
            <button
              type="button"
              onClick={() => setActiveSubView('expression')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                activeSubView === 'expression' ? 'bg-[#00AFFF] text-white' : 'text-[#79838E] hover:text-white'
              }`}
            >
              Expressions
            </button>
          )}
        </div>
      )}

      {/* 5. Master / Subview Prompt Container */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>
                {activeSubView === 'master'
                  ? 'Master Reference Prompt'
                  : activeSubView === 'front'
                  ? 'Front View Turnaround Prompt'
                  : activeSubView === 'side'
                  ? 'Side Profile View Prompt'
                  : activeSubView === 'back'
                  ? 'Back View Prompt'
                  : 'Expressions Reference Prompt'}
              </span>
            </span>

            {/* Model-Specific Formatting Dropdown */}
            {activeSubView === 'master' && (
              <div className="flex items-center space-x-1 text-[10px] text-[#79838E] ml-2">
                <span>Format:</span>
                <select
                  value={selectedEngine}
                  onChange={(e) => setSelectedEngine(e.target.value as any)}
                  className="bg-[#141C26] border border-[#1C2735] text-[#D7DCE2] px-1.5 py-0.5 rounded focus:outline-none cursor-pointer"
                >
                  <option value="GEMINI">Gemini / Standard</option>
                  <option value="MIDJOURNEY">Midjourney v6.1</option>
                  <option value="FLUX">Flux.1 Schnell</option>
                  <option value="SDXL">SDXL Photoreal</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {activeSubView === 'master' && (
              <button
                type="button"
                onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                className="text-[11px] text-[#79838E] hover:text-[#00AFFF] flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingPrompt ? 'Cancel' : 'Edit Prompt'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Prompt Body / Editor */}
        {activeSubView === 'master' ? (
          isEditingPrompt ? (
            <div className="space-y-2">
              <textarea
                rows={5}
                value={editedPromptText}
                onChange={(e) => setEditedPromptText(e.target.value)}
                className="w-full bg-[#111820] border border-[#00AFFF] rounded-lg p-3 text-xs text-white leading-relaxed focus:outline-none font-mono"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditedPromptText(asset.referencePrompt);
                    setIsEditingPrompt(false);
                  }}
                  className="px-3 py-1 bg-[#111820] text-[#79838E] hover:text-white text-xs rounded border border-[#1C2735] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePromptEdit}
                  className="px-3 py-1 bg-[#00AFFF] text-white text-xs font-bold rounded cursor-pointer"
                >
                  Save Prompt
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3.5 relative group font-mono text-xs text-[#D7DCE2] leading-relaxed select-text">
              <p className="whitespace-pre-wrap">{formattedPrompt}</p>
            </div>
          )
        ) : (
          <div className="bg-[#111820] border border-[#1C2735] rounded-lg p-3.5 relative group font-mono text-xs text-[#D7DCE2] leading-relaxed select-text space-y-2">
            <p className="whitespace-pre-wrap">
              {activeSubView === 'front'
                ? asset.frontViewPrompt
                : activeSubView === 'side'
                ? asset.sideViewPrompt
                : activeSubView === 'back'
                ? asset.backViewPrompt
                : asset.expressionPrompt}
            </p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() =>
                  handleCopyPrompt(
                    activeSubView === 'front'
                      ? asset.frontViewPrompt
                      : activeSubView === 'side'
                      ? asset.sideViewPrompt
                      : activeSubView === 'back'
                      ? asset.backViewPrompt
                      : asset.expressionPrompt,
                    activeSubView
                  )
                }
                className="text-[10px] text-[#00AFFF] hover:text-white flex items-center space-x-1 cursor-pointer"
              >
                {copiedView === activeSubView ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedView === activeSubView ? 'Copied View' : 'Copy This View'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Attached Approved Reference Image Preview (Persistent IndexedDB) */}
      {asset.optionalReferenceImageData && (
        <div className="bg-[#111820] p-3.5 rounded-lg border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <img
              src={asset.optionalReferenceImageData}
              alt={asset.name}
              className="w-16 h-16 rounded-lg object-cover border border-[#1C2735] shrink-0"
            />
            <div className="text-xs truncate">
              <div className="text-white font-semibold flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Approved Master Reference Locked</span>
              </div>
              <div className="text-[10px] text-[#79838E] truncate">
                {asset.optionalReferenceFileName || `${asset.id}-master.png`}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                Stored persistently in IndexedDB • Preserved across refreshes
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={handleDownloadImage}
              className="p-1.5 text-[#79838E] hover:text-white transition-colors cursor-pointer"
              title="Download image file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRemoveImage(asset.id)}
              className="p-1.5 text-[#79838E] hover:text-red-400 transition-colors cursor-pointer"
              title="Remove reference image"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Error / Warning Alert Messages */}
      {apiGenError && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span>{apiGenError}</span>
            <div className="text-[10px] text-red-300">
              💡 <strong>Free Manual Mode Recommended:</strong> Copy the prompt above, generate in Gemini app or Flux, and click "Upload Reference".
            </div>
          </div>
        </div>
      )}

      {storageWarning && (
        <div className="p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-lg text-[11px] text-amber-200 flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{storageWarning}</span>
        </div>
      )}

      {/* 7. Action Controls: MODE A (Manual) + MODE B (Direct API) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#1C2735]">
        {/* Left Side: Copy Prompt & Direct API Generation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* MODE A: COPY PROMPT */}
          <button
            type="button"
            onClick={() => handleCopyPrompt(formattedPrompt, 'master')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md ${
              copiedPrompt
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-[#00AFFF] hover:bg-[#0090D0] text-white shadow-[#00AFFF]/25'
            }`}
          >
            {copiedPrompt ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Prompt Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPY PROMPT</span>
              </>
            )}
          </button>

          {/* MODE B: DIRECT API GENERATION */}
          <button
            type="button"
            onClick={handleDirectApiGeneration}
            disabled={isGeneratingApi}
            className="px-3.5 py-2 rounded-lg text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] hover:text-white border border-[#1C2735] hover:border-[#00AFFF]/40 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Generate preview image directly via configured Gemini API"
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#00AFFF] ${isGeneratingApi ? 'animate-spin' : ''}`} />
            <span>{isGeneratingApi ? 'GENERATING...' : 'GENERATE VIA API'}</span>
          </button>

          {/* REGENERATE TEXTUAL PROMPT */}
          <button
            type="button"
            onClick={() => onRegeneratePrompt(asset)}
            className="px-3 py-2 rounded-lg text-xs bg-[#111820] hover:bg-[#1C2735] text-[#79838E] hover:text-[#D7DCE2] border border-[#1C2735] flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Regenerate textual prompt specifications"
          >
            <RefreshCw className="w-3 h-3 text-[#00AFFF]" />
            <span className="hidden sm:inline">Regenerate Prompt</span>
          </button>
        </div>

        {/* Right Side: Mode A Upload Reference */}
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-lg text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Upload an externally generated image (Free Manual Mode)"
          >
            <Upload className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>{asset.optionalReferenceImageData ? 'Replace Reference' : 'Upload Generated Image'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  );
};
