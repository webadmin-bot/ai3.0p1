import React, { useState, useEffect } from 'react';
import {
  Palette,
  User,
  MapPin,
  Eye,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Copy,
  Film,
  RefreshCw,
  AlertTriangle,
  Settings,
  ChevronDown,
  Layers,
  X,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { StyleBibleTab } from '../stage2/StyleBibleTab';
import { CharactersTab } from '../stage2/CharactersTab';
import { LocationsTab } from '../stage2/LocationsTab';
import { PropsTab } from '../stage2/PropsTab';
import { ShotFramePromptsTab } from './ShotFramePromptsTab';
import { ApiSettingsModal } from '../settings/ApiSettingsModal';
import {
  determinePhase2Status,
  extractPhase1Entities,
  synthesizePhase2AssetsFallback,
  Phase2ReadinessStatus,
} from '../../services/phase2AssetEngine';
import { apiGeneratePhase2Assets } from '../../services/api';
import { VisualAsset } from '../../types/filmStudio';

export type Phase2SubTab = 'style' | 'characters' | 'locations' | 'props' | 'framePrompts';

interface Phase2WorkspaceProps {
  onProceedToPhase3?: () => void;
}

export const Phase2Workspace: React.FC<Phase2WorkspaceProps> = ({ onProceedToPhase3 }) => {
  const {
    project,
    setStyleBible,
    setStage2Assets,
    setActivePhase,
    setActiveStage,
    reviseApprovedPhase2,
    isPhase2Locked,
    stage2Tab,
    setStage2Tab,
  } = useProject();

  const [currentTab, setCurrentTab] = useState<Phase2SubTab>(() => {
    const saved = project.navigationState?.phase2Tab as Phase2SubTab;
    return saved && ['style', 'characters', 'locations', 'props', 'framePrompts'].includes(saved)
      ? saved
      : 'style';
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [selectedAssetToRegen, setSelectedAssetToRegen] = useState<string>('');

  const isLockedOrApproved = isPhase2Locked || Boolean(project.stage2?.locked || project.stage2?.approved);

  const assets = project.stage2?.assets || [];
  const styleBible = project.stage2?.styleBible;
  const shots = project.stage3?.shots || [];
  const scenes = project.stage3?.scenes || [];

  const charCount = assets.filter((a) => a.type === 'CHARACTER').length;
  const locCount = assets.filter((a) => a.type === 'LOCATION').length;
  const propCount = assets.filter((a) => a.type === 'PROP').length;
  const shotCount = shots.length;

  const currentStatus: Phase2ReadinessStatus = isGenerating
    ? 'GENERATING'
    : generationError
    ? 'FAILED'
    : determinePhase2Status(project);

  // Subtabs configuration - 5 Streamlined Phase 2 Tabs
  const subtabs: Array<{
    id: Phase2SubTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    countBadge?: number;
  }> = [
    {
      id: 'style',
      label: '1. Master Visual Style / Style Bible',
      sublabel: 'Color, Lighting & Bible',
      icon: Palette,
      countBadge: styleBible ? 1 : undefined,
    },
    {
      id: 'characters',
      label: '2. Characters & Consistency',
      sublabel: 'Turnarounds & Identity Anchors',
      icon: User,
      countBadge: charCount > 0 ? charCount : undefined,
    },
    {
      id: 'locations',
      label: '3. Locations & Environments',
      sublabel: 'Permanent Spatial Sets',
      icon: MapPin,
      countBadge: locCount > 0 ? locCount : undefined,
    },
    {
      id: 'props',
      label: '4. Key Story Props',
      sublabel: 'Physical Catalysts & Items',
      icon: Sliders,
      countBadge: propCount > 0 ? propCount : undefined,
    },
    {
      id: 'framePrompts',
      label: '5. Shot Frame Prompts & References',
      sublabel: 'First & End Frame Prompts',
      icon: Film,
      countBadge: shotCount > 0 ? shotCount : undefined,
    },
  ];

  // Primary Action: Generate Phase 2 Assets
  const handleGeneratePhase2Assets = async (missingOnly: boolean = false, targetAssetId?: string) => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress(15);
    setGenerationStep('Extracting characters, locations, and props from Phase 1 output...');

    try {
      // Step 1: Scan Phase 1 output
      setGenerationProgress(30);
      setGenerationStep('Synthesizing Master Visual Style Bible & Continuity Rules...');

      const payload = {
        settings: project.settings,
        visualStyle: project.visualStyle,
        storyFoundation: project.storyFoundation,
        storyCanon: project.storyCanon,
        styleBible: project.stage2?.styleBible,
        importedScript: project.importedScript,
        scenes,
        shots,
        existingAssets: assets,
        concepts: project.concepts,
        originalStoryText: project.originalStoryText,
        generateMissingOnly: missingOnly,
        regenerateAssetId: targetAssetId || null,
      };

      setGenerationProgress(60);
      setGenerationStep(
        targetAssetId
          ? `Regenerating specifications for asset ${targetAssetId}...`
          : missingOnly
          ? 'Scanning screenplay for unmapped entities...'
          : 'Synthesizing Character Consistency, Turnaround Prompts, Locations & Props...'
      );

      // Call API or Fallback
      let res;
      try {
        res = await apiGeneratePhase2Assets(payload);
      } catch (networkErr: any) {
        console.warn('Backend call failed, using client fallback synthesis:', networkErr);
      }

      setGenerationProgress(85);
      setGenerationStep('Normalizing canonical IDs and verifying prompt packages...');

      if (res && res.success && res.assets && res.assets.length > 0) {
        if (res.styleBible) {
          setStyleBible(res.styleBible);
        }
        setStage2Assets(res.assets);
      } else {
        // Deterministic Fallback Synthesis
        const fallback = synthesizePhase2AssetsFallback(project, missingOnly);
        setStyleBible(fallback.styleBible);
        if (missingOnly) {
          // Merge missing
          const existingIds = new Set(assets.map((a) => a.id));
          const newOnes = fallback.assets.filter((a) => !existingIds.has(a.id));
          setStage2Assets([...assets, ...newOnes]);
        } else if (targetAssetId) {
          const updated = assets.map((a) => {
            if (a.id === targetAssetId) {
              const fresh = fallback.assets.find((f) => f.id === targetAssetId);
              return fresh || a;
            }
            return a;
          });
          setStage2Assets(updated);
        } else {
          setStage2Assets(fallback.assets);
        }
      }

      setGenerationProgress(100);
      setGenerationStep('Phase 2 visual specifications generated successfully!');
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationStep('');
      }, 800);
    } catch (err: any) {
      console.error('Phase 2 generation failed:', err);
      setGenerationError(err?.message || 'Failed to synthesize Phase 2 visual assets.');
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleNextPhase = () => {
    if (onProceedToPhase3) {
      onProceedToPhase3();
    } else {
      if (setActivePhase) {
        setActivePhase('phase3');
      } else {
        setActiveStage('stage4');
      }
    }
  };

  const statusColors: Record<Phase2ReadinessStatus, { badge: string; text: string; bg: string }> = {
    'NOT STARTED': { badge: 'bg-slate-800 text-slate-300 border-slate-700', text: 'NOT STARTED', bg: 'border-[#1C2735]' },
    'GENERATING': { badge: 'bg-[#00AFFF]/20 text-[#00AFFF] border-[#00AFFF]/40 animate-pulse', text: 'GENERATING ASSETS...', bg: 'border-[#00AFFF]/40' },
    'PROMPTS READY': { badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40', text: 'PROMPTS READY', bg: 'border-emerald-500/30' },
    'IMAGES PENDING': { badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40', text: 'IMAGES PENDING APPROVAL', bg: 'border-amber-500/30' },
    'IMAGE APPROVED': { badge: 'bg-sky-950/80 text-sky-300 border-sky-500/40', text: 'APPROVED REFERENCE READY', bg: 'border-sky-500/30' },
    'MEDIA READY': { badge: 'bg-emerald-900 text-emerald-200 border-emerald-400', text: 'ALL MEDIA COMPLETE', bg: 'border-emerald-500' },
    'FAILED': { badge: 'bg-rose-950/80 text-rose-300 border-rose-500/40', text: 'GENERATION FAILED', bg: 'border-rose-500/40' },
  };

  const statusInfo = statusColors[currentStatus] || statusColors['NOT STARTED'];

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. PROMINENT PHASE 2 ASSET GENERATION ACTION HEADER      */}
      {/* ======================================================== */}
      <div className={`bg-[#0B1017] border ${statusInfo.bg} rounded-2xl p-5 md:p-6 shadow-xl transition-all space-y-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00AFFF] bg-[#00AFFF]/15 px-2.5 py-0.5 rounded border border-[#00AFFF]/30">
                PHASE 2 • PRE-PRODUCTION
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${statusInfo.badge}`}>
                {statusInfo.text}
              </span>
              <span className="text-xs text-[#79838E]">
                Locked to style: <strong className="text-white">{project.visualStyle?.name || 'Cinematic Realism'}</strong>
              </span>
            </div>

            <h1 className="font-['Exo_2'] font-bold text-2xl text-white tracking-wide">
              Visual Asset Studio & Continuity Bible
            </h1>
            <p className="text-xs text-[#8A96A6] max-w-2xl leading-relaxed">
              Extracts characters, locations, and props from Phase 1 output. Generates complete Master Prompts, turnarounds, spatial sets, and storyboard keyframes with stable IDs.
            </p>
          </div>

          {/* Core Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* If Not Started: Primary Action Button */}
            {assets.length === 0 && !styleBible ? (
              <button
                onClick={() => handleGeneratePhase2Assets(false)}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] hover:to-[#007AB0] text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-[#00AFFF]/30 disabled:opacity-50 cursor-pointer animate-pulse"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'SYNTHESIZING ASSETS...' : 'GENERATE PHASE 2 ASSETS'}</span>
              </button>
            ) : (
              /* If Assets Already Exist: Follow-up Actions */
              <>
                {/* 1. Generate Missing Assets */}
                <button
                  onClick={() => handleGeneratePhase2Assets(true)}
                  disabled={isGenerating}
                  className="px-3.5 py-2 bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] hover:to-[#007AB0] text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-md shadow-[#00AFFF]/20 disabled:opacity-50 cursor-pointer"
                  title="Scan screenplay for characters or locations missing from Phase 2 registry"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>GENERATE MISSING ASSETS</span>
                </button>

                {/* 2. Review Generated Assets */}
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-3.5 py-2 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="Open authoritative Phase 2 registry review"
                >
                  <FileText className="w-3.5 h-3.5 text-[#00AFFF]" />
                  <span>REVIEW GENERATED ASSETS</span>
                </button>

                {/* 3. Regenerate Selected Asset Picker */}
                <div className="relative flex items-center bg-[#111820] border border-[#1C2735] rounded-lg px-2">
                  <select
                    value={selectedAssetToRegen}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedAssetToRegen(id);
                      if (id) {
                        handleGeneratePhase2Assets(false, id);
                        setSelectedAssetToRegen('');
                      }
                    }}
                    className="bg-transparent text-xs text-[#D7DCE2] py-2 pr-2 focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0B1017] text-[#79838E]">
                      REGENERATE SELECTED ASSET...
                    </option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id} className="bg-[#0B1017] text-white">
                        [{a.id}] {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* API Settings Quick Access */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 bg-[#111820] hover:bg-[#1C2735] text-[#79838E] hover:text-[#00AFFF] border border-[#1C2735] rounded-lg transition-colors cursor-pointer"
              title="Open API Integrations Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real Generation Progress Bar & Indicator */}
        {isGenerating && (
          <div className="space-y-2 pt-2 border-t border-[#1C2735] animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#00AFFF] font-semibold flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00AFFF]" />
                <span>{generationStep || 'Synthesizing Phase 2 visual assets...'}</span>
              </span>
              <span className="font-mono text-white font-bold">{generationProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#141C26] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00AFFF] to-emerald-400 transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {generationError && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{generationError}</span>
            </div>
            <button
              onClick={() => handleGeneratePhase2Assets(false)}
              className="px-2.5 py-1 bg-red-900 hover:bg-red-800 text-white rounded text-[11px] font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#1C2735] text-xs">
          <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase font-mono block">Characters</span>
            <span className="font-mono text-base font-bold text-white">{charCount}</span>
          </div>

          <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase font-mono block">Locations</span>
            <span className="font-mono text-base font-bold text-white">{locCount}</span>
          </div>

          <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase font-mono block">Props</span>
            <span className="font-mono text-base font-bold text-white">{propCount}</span>
          </div>

          <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase font-mono block">Storyboard Shots</span>
            <span className="font-mono text-base font-bold text-emerald-400">{shotCount}</span>
          </div>
        </div>
      </div>

      {/* Approved Phase 2 Read-Only Review Banner */}
      {isLockedOrApproved && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-sm">Phase 2 Approved & Locked</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                  Version #{project.stage2?.approvedVersion || 1}
                </span>
                {project.approvedSnapshots?.phase2 && project.approvedSnapshots.phase2.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#141C26] text-[#79838E] border border-[#1C2735]">
                    {project.approvedSnapshots.phase2.length} saved snapshot(s)
                  </span>
                )}
              </div>
              <p className="text-[#8A96A6] text-xs mt-0.5">
                Style Bible and visual reference asset prompts are in read-only review. All tabs can be inspected safely.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setShowReviseModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#141F2E] hover:bg-[#1E2F46] text-[#00AFFF] border border-[#00AFFF]/50 font-bold text-xs cursor-pointer transition-colors shadow-sm"
            >
              Revise Approved Phase 2
            </button>
            <button
              onClick={handleNextPhase}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span>Phase 3 Production →</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SUBTABS NAVIGATION BAR                                */}
      {/* ======================================================== */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-2 flex flex-wrap gap-1.5 shadow-sm">
        {subtabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setCurrentTab(tab.id);
                setStage2Tab(tab.id);
              }}
              className={`flex-1 min-w-[170px] py-2 px-3 rounded-lg text-left transition-all cursor-pointer flex items-center space-x-2.5 ${
                isActive
                  ? 'bg-[#141F2E] border border-[#00AFFF] text-white shadow-sm'
                  : 'bg-transparent hover:bg-[#101722] text-[#79838E] border border-transparent'
              }`}
            >
              <div
                className={`p-1.5 rounded-md shrink-0 ${
                  isActive ? 'bg-[#00AFFF] text-white' : 'bg-[#141C26] text-[#657283]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-xs font-bold truncate ${
                      isActive ? 'text-white' : 'text-[#A0AEC0]'
                    }`}
                  >
                    {tab.label}
                  </span>
                  {tab.countBadge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[#1C2735] text-[#00AFFF]">
                      {tab.countBadge}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#55606E] truncate">{tab.sublabel}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Top Banner with Phase Transition */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-[#79838E]">
          Active Phase 2 Tab: <strong className="text-white">{subtabs.find((s) => s.id === currentTab)?.label}</strong>
        </span>

        {isLockedOrApproved ? (
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phase 2 Locked (Read-Only)</span>
            </span>
            <button
              onClick={handleNextPhase}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
            >
              <span>CONTINUE TO PHASE 3</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleNextPhase}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
          >
            <span>COMPLETE PHASE 2 → PROCEED TO PHASE 3</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. SUBTAB CONTENT VIEW                                   */}
      {/* ======================================================== */}
      <div className="transition-all">
        {currentTab === 'style' && (
          <StyleBibleTab onGeneratePhase2Assets={() => handleGeneratePhase2Assets(false)} />
        )}
        {currentTab === 'characters' && (
          <CharactersTab onGeneratePhase2Assets={() => handleGeneratePhase2Assets(false)} />
        )}
        {currentTab === 'locations' && (
          <LocationsTab onGeneratePhase2Assets={() => handleGeneratePhase2Assets(false)} />
        )}
        {currentTab === 'props' && (
          <PropsTab onGeneratePhase2Assets={() => handleGeneratePhase2Assets(false)} />
        )}
        {currentTab === 'framePrompts' && <ShotFramePromptsTab />}
      </div>

      {/* API Integrations Settings Modal */}
      <ApiSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Asset Review Manifest Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-[#0E141D] border-b border-[#1C2735] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#00AFFF]" />
                <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                  Authoritative Visual Asset Registry ({assets.length} assets)
                </h3>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 text-[#79838E] hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="divide-y divide-[#1C2735]">
                {assets.map((asset) => (
                  <div key={asset.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#141C26] text-[#00AFFF] border border-[#1C2735]">
                          {asset.id}
                        </span>
                        <span className="font-bold text-white text-sm">{asset.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded uppercase bg-[#141C26] text-[#79838E]">
                          {asset.type}
                        </span>
                      </div>
                      <p className="text-xs text-[#A0AEC0]">{asset.visualSpecification?.summary}</p>
                      <p className="text-[11px] font-mono text-[#79838E] line-clamp-2">{asset.referencePrompt}</p>
                    </div>

                    <div className="flex flex-col items-end space-y-2 shrink-0">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                        {asset.promptStatus}
                      </span>
                      {asset.optionalReferenceImageData ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Image Attached</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-medium">Image Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#0E141D] border-t border-[#1C2735] flex justify-end">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold cursor-pointer"
              >
                Close Registry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revise Approved Phase 2 Confirmation Modal */}
      {showReviseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-[#00AFFF]">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base font-bold text-white font-['Exo_2']">
                Revise Approved Phase 2?
              </h3>
            </div>

            <div className="space-y-3 text-xs text-[#8A96A6] leading-relaxed">
              <p>
                This action will archive your currently approved Style Bible and Asset Prompts as <strong className="text-white">Snapshot Version #{project.stage2?.approvedVersion || 1}</strong> and unlock Phase 2 for editing under a new revision.
              </p>
              <div className="p-3 bg-[#111820] border border-[#1C2735] rounded-lg space-y-1.5 text-[11px]">
                <div className="flex items-center space-x-2 text-amber-300 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Revision Impact:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[#A0AEC0] pl-1">
                  <li>Your existing characters, wardrobe, locations, and props are <strong className="text-white">preserved safely</strong>.</li>
                  <li>Downstream Phase 3 Google Flow shot packages will be marked <span className="font-mono text-amber-300">SOURCE_STALE</span> to reflect that assets are being modified.</li>
                </ul>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#C5D0DE] mb-1">
                  Reason for Revision (Optional):
                </label>
                <input
                  type="text"
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="e.g. Updating protagonist wardrobe colors, altering location atmosphere"
                  className="w-full px-3 py-2 bg-[#141C26] border border-[#243346] rounded-lg text-white text-xs focus:outline-none focus:border-[#00AFFF]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#1C2735]">
              <button
                onClick={() => {
                  setShowReviseModal(false);
                  setRevisionReason('');
                }}
                disabled={isRevising}
                className="px-4 py-2 rounded-lg bg-[#141C26] hover:bg-[#1C2735] text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsRevising(true);
                  try {
                    await reviseApprovedPhase2(revisionReason.trim() || undefined);
                    setShowReviseModal(false);
                    setRevisionReason('');
                  } finally {
                    setIsRevising(false);
                  }
                }}
                disabled={isRevising}
                className="px-4 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center space-x-1.5"
              >
                {isRevising ? (
                  <span>Unlocking...</span>
                ) : (
                  <span>Confirm & Unlock Phase 2</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
