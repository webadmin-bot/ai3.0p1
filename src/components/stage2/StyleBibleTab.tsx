import React, { useState } from 'react';
import {
  Palette,
  Edit3,
  Check,
  Sparkles,
  AlertTriangle,
  Layers,
  Sun,
  Box,
  Building,
  User,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiGenerateStyleBible } from '../../services/api';

interface StyleBibleTabProps {
  onGeneratePhase2Assets?: () => void;
}

export const StyleBibleTab: React.FC<StyleBibleTabProps> = ({ onGeneratePhase2Assets }) => {
  const { project, updateStyleBible, setStyleBible } = useProject();
  const bible = project.stage2.styleBible;
  const [isEditing, setIsEditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Editable local state
  const [editArtDirection, setEditArtDirection] = useState(bible?.artDirection || '');
  const [editMedium, setEditMedium] = useState(bible?.mediumAndRealism || '');
  const [editColor, setEditColor] = useState(bible?.colorPaletteAndContrast || '');
  const [editLighting, setEditLighting] = useState(bible?.lightingRules || '');
  const [editTexture, setEditTexture] = useState(bible?.textureAndRenderingLanguage || '');
  const [editArchitecture, setEditArchitecture] = useState(bible?.worldArchitecturePrinciples || '');
  const [editProportions, setEditProportions] = useState(bible?.characterProportionRules || '');
  const [editWardrobePhilosophy, setEditWardrobePhilosophy] = useState(bible?.wardrobeAndPropPhilosophy || '');
  const [editCamera, setEditCamera] = useState(bible?.cameraAndCompositionStyle || '');
  const [editAspectRatio, setEditAspectRatio] = useState(bible?.aspectRatioConstraints || '');
  const [editScale, setEditScale] = useState(bible?.scaleConsistency || '');
  const [editNegative, setEditNegative] = useState((bible?.negativeVisualConstraints || []).join('\n'));
  const [editContinuityLocks, setEditContinuityLocks] = useState((bible?.continuityLocks || []).join('\n'));
  const [editClarity, setEditClarity] = useState(bible?.referenceImageClarityRules || '');
  const [editAllowed, setEditAllowed] = useState((bible?.allowedElements || []).join('\n'));
  const [editAvoided, setEditAvoided] = useState((bible?.avoidedElements || []).join('\n'));

  if (!bible) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 md:p-12 text-center space-y-5 max-w-2xl mx-auto shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF] mx-auto shadow-lg shadow-[#00AFFF]/10">
          <Palette className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] bg-[#00AFFF]/10 px-2 py-0.5 rounded border border-[#00AFFF]/30">
            PHASE 2 DIRECTIVE
          </span>
          <h3 className="font-['Exo_2'] font-bold text-xl text-white">
            Visual Style Bible Not Generated
          </h3>
          <p className="text-xs text-[#79838E] leading-relaxed max-w-md mx-auto">
            Synthesize the authoritative Master Visual Style Bible based on your approved Phase 1 style:{' '}
            <strong className="text-white">{project.visualStyle?.name || 'Cinematic Realism'}</strong>.
            Enforces consistent art direction, lighting vectors, and color grading across all prompts.
          </p>
        </div>

        <div>
          <button
            onClick={onGeneratePhase2Assets}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] hover:to-[#007AB0] text-white text-xs font-bold flex items-center space-x-2.5 mx-auto transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer animate-pulse"
          >
            <Sparkles className="w-4 h-4" />
            <span>GENERATE PHASE 2 ASSETS</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSaveEdits = () => {
    updateStyleBible({
      artDirection: editArtDirection,
      mediumAndRealism: editMedium,
      colorPaletteAndContrast: editColor,
      lightingRules: editLighting,
      textureAndRenderingLanguage: editTexture,
      worldArchitecturePrinciples: editArchitecture,
      characterProportionRules: editProportions,
      wardrobeAndPropPhilosophy: editWardrobePhilosophy,
      cameraAndCompositionStyle: editCamera,
      aspectRatioConstraints: editAspectRatio,
      scaleConsistency: editScale,
      negativeVisualConstraints: editNegative.split('\n').map((s) => s.trim()).filter(Boolean),
      continuityLocks: editContinuityLocks.split('\n').map((s) => s.trim()).filter(Boolean),
      referenceImageClarityRules: editClarity,
      allowedElements: editAllowed.split('\n').map((s) => s.trim()).filter(Boolean),
      avoidedElements: editAvoided.split('\n').map((s) => s.trim()).filter(Boolean),
    });
    setIsEditing(false);
  };

  const handleAiRefine = async () => {
    if (!project.storyFoundation || !project.storyCanon) return;
    setIsRegenerating(true);
    try {
      const res = await apiGenerateStyleBible({
        settings: project.settings,
        visualStyle: project.visualStyle,
        storyFoundation: project.storyFoundation,
        storyCanon: project.storyCanon,
      });
      if (res.success && res.styleBible) {
        setStyleBible(res.styleBible);
        setEditMedium(res.styleBible.mediumAndRealism);
        setEditColor(res.styleBible.colorPaletteAndContrast);
        setEditLighting(res.styleBible.lightingRules);
        setEditTexture(res.styleBible.textureAndRenderingLanguage);
        setEditArchitecture(res.styleBible.worldArchitecturePrinciples);
        setEditProportions(res.styleBible.characterProportionRules);
        setEditWardrobePhilosophy(res.styleBible.wardrobeAndPropPhilosophy);
        setEditClarity(res.styleBible.referenceImageClarityRules);
        setEditAllowed(res.styleBible.allowedElements.join('\n'));
        setEditAvoided(res.styleBible.avoidedElements.join('\n'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyStyleBibleText = () => {
    const text = `=== XEMACS7 VISUAL STYLE BIBLE V1 ===
Project: ${project.title}
Inherited Master Style: ${project.visualStyle.name} (${project.visualStyle.category})
Medium & Realism: ${bible.mediumAndRealism}

COLOR PALETTE & CONTRAST:
${bible.colorPaletteAndContrast}

LIGHTING RULES:
${bible.lightingRules}

TEXTURE & RENDERING LANGUAGE:
${bible.textureAndRenderingLanguage}

WORLD ARCHITECTURE PRINCIPLES:
${bible.worldArchitecturePrinciples}

CHARACTER PROPORTION RULES:
${bible.characterProportionRules}

WARDROBE & PROP PHILOSOPHY:
${bible.wardrobeAndPropPhilosophy}

REFERENCE IMAGE CLARITY RULES:
${bible.referenceImageClarityRules}

ALLOWED ELEMENTS:
${(bible.allowedElements || []).map((e) => `• ${e}`).join('\n')}

AVOIDED ELEMENTS:
${(bible.avoidedElements || []).map((e) => `• ${e}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Downstream Re-Audit Warning if Dirty */}
      {project.stage2.needsReaudit && (
        <div className="bg-[#19150B] border border-[#F4A62A]/40 rounded-xl p-3.5 flex items-center justify-between text-xs text-[#F4A62A]">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Style Bible or asset prompt directives have been edited. A re-audit is recommended before Stage 2 approval.
            </span>
          </div>
          <span className="font-mono text-[10px] bg-[#F4A62A]/20 px-2 py-0.5 rounded font-bold uppercase">
            Re-Audit Needed
          </span>
        </div>
      )}

      {/* Style Bible Header Card */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] bg-[#00AFFF]/15 px-2 py-0.5 rounded border border-[#00AFFF]/30">
                INHERITED FROM STAGE 1
              </span>
              <span className="text-xs text-[#79838E]">
                Preset ID: <span className="font-mono text-white">{project.visualStyle.presetId}</span>
              </span>
            </div>
            <h2 className="font-['Exo_2'] font-bold text-xl text-white flex items-center space-x-2">
              <span>{project.visualStyle.name}</span>
              <span className="text-sm font-normal text-[#79838E]">
                ({project.visualStyle.category})
              </span>
            </h2>
            <p className="text-xs text-[#D7DCE2] max-w-2xl">
              {project.visualStyle.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onGeneratePhase2Assets && (
              <button
                onClick={onGeneratePhase2Assets}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] hover:to-[#007AB0] text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-md shadow-[#00AFFF]/20 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>GENERATE PHASE 2 PROMPTS</span>
              </button>
            )}

            <button
              onClick={handleCopyStyleBibleText}
              className="px-3 py-1.5 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'Copied Bible' : 'Copy Bible Text'}</span>
            </button>

            <button
              onClick={handleAiRefine}
              disabled={isRegenerating}
              className="px-3 py-1.5 bg-[#111820] hover:bg-[#1C2735] text-[#00AFFF] border border-[#1C2735] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>AI Refine Style</span>
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-1.5 bg-[#141C26] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Directives'}</span>
            </button>
          </div>
        </div>

        {/* Core Directives Grid */}
        {isEditing ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#D7DCE2]">Medium & Realism Intent</label>
                <textarea
                  rows={2}
                  value={editMedium}
                  onChange={(e) => setEditMedium(e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#D7DCE2]">Color Palette & Contrast</label>
                <textarea
                  rows={2}
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#D7DCE2]">Lighting Rules & Direction</label>
                <textarea
                  rows={2}
                  value={editLighting}
                  onChange={(e) => setEditLighting(e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#D7DCE2]">Texture & Rendering Language</label>
                <textarea
                  rows={2}
                  value={editTexture}
                  onChange={(e) => setEditTexture(e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#D7DCE2]">World & Architecture Principles</label>
                <textarea
                  rows={2}
                  value={editArchitecture}
                  onChange={(e) => setEditArchitecture(e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#D7DCE2]">Character Proportions & Stylization</label>
                <textarea
                  rows={2}
                  value={editProportions}
                  onChange={(e) => setEditProportions(e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#D7DCE2]">Wardrobe & Prop Philosophy</label>
                <textarea
                  rows={2}
                  value={editWardrobePhilosophy}
                  onChange={(e) => setEditWardrobePhilosophy(e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#D7DCE2]">Reference Image Clarity Rules</label>
                <textarea
                  rows={2}
                  value={editClarity}
                  onChange={(e) => setEditClarity(e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00AFFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-emerald-400">Allowed Elements (One per line)</label>
                <textarea
                  rows={3}
                  value={editAllowed}
                  onChange={(e) => setEditAllowed(e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-rose-400">Avoided Elements (One per line)</label>
                <textarea
                  rows={3}
                  value={editAvoided}
                  onChange={(e) => setEditAvoided(e.target.value)}
                  className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#1C2735]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-[#111820] text-[#79838E] hover:text-white text-xs font-semibold rounded-lg border border-[#1C2735]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdits}
                className="px-5 py-2 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-lg shadow-md shadow-[#00AFFF]/20 cursor-pointer"
              >
                Save Style Directives
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* 4 Primary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Medium & Realism */}
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-[#00AFFF] text-xs font-bold uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  <span>Medium & Realism Level</span>
                </div>
                <p className="text-xs text-[#D7DCE2] leading-relaxed">
                  {bible.mediumAndRealism}
                </p>
              </div>

              {/* Color Palette & Contrast */}
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-[#F4A62A] text-xs font-bold uppercase tracking-wider">
                  <Palette className="w-4 h-4" />
                  <span>Color Palette & Contrast</span>
                </div>
                <p className="text-xs text-[#D7DCE2] leading-relaxed">
                  {bible.colorPaletteAndContrast}
                </p>
              </div>

              {/* Lighting Rules */}
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Sun className="w-4 h-4" />
                  <span>Lighting Principles & Clarity</span>
                </div>
                <p className="text-xs text-[#D7DCE2] leading-relaxed">
                  {bible.lightingRules}
                </p>
              </div>

              {/* Texture & Rendering Language */}
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                  <Box className="w-4 h-4" />
                  <span>Texture & Rendering Language</span>
                </div>
                <p className="text-xs text-[#D7DCE2] leading-relaxed">
                  {bible.textureAndRenderingLanguage}
                </p>
              </div>

              {/* World & Architecture */}
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <Building className="w-4 h-4" />
                  <span>World Architecture Principles</span>
                </div>
                <p className="text-xs text-[#D7DCE2] leading-relaxed">
                  {bible.worldArchitecturePrinciples}
                </p>
              </div>

              {/* Character Proportions */}
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                  <User className="w-4 h-4" />
                  <span>Character Stylization & Proportions</span>
                </div>
                <p className="text-xs text-[#D7DCE2] leading-relaxed">
                  {bible.characterProportionRules}
                </p>
              </div>
            </div>

            {/* Wardrobe Philosophy & Reference Clarity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Wardrobe & Prop Philosophy
                </div>
                <p className="text-xs text-[#D7DCE2] leading-relaxed">
                  {bible.wardrobeAndPropPhilosophy}
                </p>
              </div>

              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Reference Image Clarity Rules
                </div>
                <p className="text-xs text-[#D7DCE2] leading-relaxed">
                  {bible.referenceImageClarityRules}
                </p>
              </div>
            </div>

            {/* Allowed vs Avoided Elements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Allowed */}
              <div className="bg-[#0B1410] border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Allowed / Signature Elements</span>
                </div>
                <div className="space-y-1.5">
                  {(bible.allowedElements || []).map((el, i) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-[#D7DCE2]">
                      <span className="text-emerald-400 font-bold shrink-0">•</span>
                      <span>{el}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avoided */}
              <div className="bg-[#140B0E] border border-rose-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Avoided / Forbidden Artifacts</span>
                </div>
                <div className="space-y-1.5">
                  {(bible.avoidedElements || []).map((el, i) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-[#D7DCE2]">
                      <span className="text-rose-400 font-bold shrink-0">•</span>
                      <span>{el}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
