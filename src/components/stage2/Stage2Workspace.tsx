import React, { useState } from 'react';
import {
  Palette,
  User,
  Shirt,
  MapPin,
  Box,
  FileText,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Info,
  BookOpen,
  Film,
  CheckCircle2,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { StyleBibleTab } from './StyleBibleTab';
import { CharactersTab } from './CharactersTab';
import { WardrobeTab } from './WardrobeTab';
import { LocationsTab } from './LocationsTab';
import { PropsTab } from './PropsTab';
import { AssetManifestTab } from './AssetManifestTab';
import { CanonReviewTab } from './CanonReviewTab';
import { Stage2PipelineModal } from './Stage2PipelineModal';
import { apiAuditVisualPrompts } from '../../services/api';

export const Stage2Workspace: React.FC = () => {
  const {
    project,
    stage2Tab,
    setStage2Tab,
    setStage2Audit,
    approveAndLockStage2,
    unlockStage2ForRevision,
    setActiveStage,
  } = useProject();

  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showStage1Drawer, setShowStage1Drawer] = useState(false);

  // Verification: Is Stage 1 locked?
  const isStage1Locked = project.stage1.locked;
  const hasStoryCanon = Boolean(project.storyFoundation && project.storyCanon);

  // Status Metrics
  const totalAssets = project.stage2.assets.length;
  const readyPrompts = project.stage2.assets.filter((a) => a.promptStatus === 'READY').length;
  const openRequired = (project.stage2.audit?.issues || []).filter(
    (i) => i.severity === 'REQUIRED' && i.status === 'OPEN'
  ).length;

  const tabs = [
    { id: 'styleBible', label: 'STYLE BIBLE', icon: Palette },
    { id: 'characters', label: 'CHARACTERS', icon: User, count: project.stage2.assets.filter((a) => a.type === 'CHARACTER').length },
    { id: 'wardrobe', label: 'WARDROBE', icon: Shirt, count: project.stage2.assets.filter((a) => a.type === 'WARDROBE').length },
    { id: 'locations', label: 'LOCATIONS', icon: MapPin, count: project.stage2.assets.filter((a) => a.type === 'LOCATION').length },
    { id: 'props', label: 'PROPS & OTHERS', icon: Box, count: project.stage2.assets.filter((a) => a.type === 'PROP' || a.type === 'SPECIAL').length },
    { id: 'manifest', label: 'ASSET MANIFEST', icon: FileText, count: totalAssets },
    { id: 'audit', label: 'CANON REVIEW', icon: ShieldCheck, alertCount: openRequired },
  ];

  const handleQuickReaudit = async () => {
    if (!project.storyFoundation || !project.storyCanon) return;
    setIsAuditing(true);
    try {
      const res = await apiAuditVisualPrompts({
        assets: project.stage2.assets,
        styleBible: project.stage2.styleBible,
        storyFoundation: project.storyFoundation,
        storyCanon: project.storyCanon,
      });
      if (res.success && res.audit) {
        setStage2Audit(res.audit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Upstream Lock Guard
  if (!isStage1Locked || !hasStoryCanon) {
    return (
      <div className="space-y-6 max-w-4xl pb-12">
        <button
          onClick={() => setActiveStage('stage1')}
          className="flex items-center space-x-1.5 text-xs text-[#79838E] hover:text-[#00AFFF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Stage 1: Story & Canon Studio</span>
        </button>

        <div className="bg-[#0B1017] border-2 border-amber-500/30 rounded-2xl p-8 space-y-6">
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-[#F4A62A]">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#F4A62A]">
              PREREQUISITE REQUIRED
            </span>
            <h2 className="font-['Exo_2'] font-bold text-2xl text-white">
              Stage 1 Story Canon Must Be Approved & Locked First
            </h2>
            <p className="text-xs text-[#D7DCE2] leading-relaxed max-w-xl">
              Stage 2 converts your approved narrative foundation and master visual style into production-ready prompts. To prevent narrative drift and conflicting character designs, finish and lock Stage 1: Story & Canon Studio before entering the Visual Asset Prompt Studio.
            </p>
          </div>

          <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 text-xs space-y-2">
            <div className="font-semibold text-white">Current Stage 1 Status:</div>
            <div className="flex items-center space-x-2 text-[#79838E]">
              <span className={`w-2 h-2 rounded-full ${project.stage1.locked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>
                {project.stage1.locked ? 'Locked' : 'Draft / Unapproved'} •{' '}
                {project.storyFoundation ? `Foundation V1 Defined ("${project.title}")` : 'Foundation Not Finalized'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveStage('stage1')}
            className="px-6 py-2.5 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer"
          >
            <span>Proceed to Stage 1 to Review & Lock Canon</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner / Actions Bar */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-5 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00AFFF] bg-[#00AFFF]/15 px-2 py-0.5 rounded border border-[#00AFFF]/30">
                STAGE 2
              </span>
              <span className="text-[10px] text-[#79838E] uppercase tracking-wider font-semibold">
                Prompt-Only Image Pre-Production
              </span>
            </div>
            <h1 className="font-['Exo_2'] font-bold text-2xl text-white tracking-wide mt-1">
              VISUAL ASSET PROMPT STUDIO
            </h1>
            <p className="text-xs text-[#79838E] mt-0.5">
              Create consistent, production-ready image prompts. Copy them into any image generator.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowStage1Drawer(!showStage1Drawer)}
              className="px-3 py-2 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Toggle Stage 1 Canon & Master Style Reference"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>{showStage1Drawer ? 'Hide Canon Ref' : 'Stage 1 Canon'}</span>
            </button>

            <button
              onClick={() => setShowPipelineModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] hover:to-[#007AB0] text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-[#00AFFF]/25 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {totalAssets > 0 ? 'RE-GENERATE PROMPTS' : 'GENERATE VISUAL ASSET PROMPTS'}
              </span>
            </button>

            {totalAssets > 0 && (
              <button
                onClick={handleQuickReaudit}
                disabled={isAuditing}
                className="px-3.5 py-2 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Run prompt package consistency audit"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#00AFFF] ${isAuditing ? 'animate-spin' : ''}`} />
                <span>{isAuditing ? 'Auditing...' : 'RE-AUDIT'}</span>
              </button>
            )}

            {project.stage2.locked ? (
              <button
                onClick={unlockStage2ForRevision}
                className="px-3.5 py-2 bg-[#141C26] hover:bg-[#1C2735] text-[#F4A62A] border border-[#F4A62A]/40 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>LOCKED V1 (Unlock)</span>
              </button>
            ) : (
              <button
                onClick={() => setStage2Tab('audit')}
                className="px-4 py-2 bg-[#111820] hover:bg-[#1C2735] text-emerald-400 border border-emerald-500/40 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>APPROVE & LOCK V1</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact Counts & Readiness Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#1C2735]">
          <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase font-mono block">Total Assets</span>
            <span className="font-mono text-base font-bold text-white">{totalAssets}</span>
          </div>

          <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase font-mono block">Prompts Ready</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {readyPrompts} / {totalAssets}
            </span>
          </div>

          <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase font-mono block">Required Issues</span>
            <span className={`font-mono text-base font-bold ${openRequired > 0 ? 'text-rose-400' : 'text-white'}`}>
              {openRequired}
            </span>
          </div>

          <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase font-mono block">Approval Status</span>
            <span
              className={`text-xs font-bold block mt-0.5 ${
                project.stage2.locked ? 'text-[#F4A62A]' : totalAssets > 0 ? 'text-[#00AFFF]' : 'text-[#79838E]'
              }`}
            >
              {project.stage2.locked ? 'LOCKED V1' : totalAssets > 0 ? 'READY FOR REVIEW' : 'DRAFT (NOT GENERATED)'}
            </span>
          </div>
        </div>
      </div>

      {/* Stage 1 Traceability Drawer (Collapsible) */}
      {showStage1Drawer && (
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#1C2735] pb-2.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
              <Film className="w-4 h-4 text-[#00AFFF]" />
              <span>Stage 1 Canon & Master Style Reference (Read-Only)</span>
            </div>
            <button
              onClick={() => setShowStage1Drawer(false)}
              className="text-xs text-[#79838E] hover:text-white"
            >
              Close Ref
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#00AFFF] block">Master Visual Style</span>
              <div className="text-white font-medium">{project.visualStyle.name}</div>
              <div className="text-[11px] text-[#79838E]">
                {project.visualStyle.medium} • {project.visualStyle.realismLevel}
              </div>
              <div className="text-[11px] text-[#79838E] mt-1">
                {project.visualStyle.colorIntent}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#00AFFF] block">Narrative Foundation</span>
              <div className="text-white font-medium truncate">{project.title}</div>
              <div className="text-[11px] text-[#79838E] line-clamp-3">
                {project.storyFoundation?.logline}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#00AFFF] block">Canon Elements</span>
              <div className="text-[11px] text-[#79838E] space-y-0.5">
                <div>Characters: {project.storyCanon?.characters.map((c) => c.name).join(', ')}</div>
                <div>Locations: {project.storyCanon?.locations.map((l) => l.name).join(', ')}</div>
                <div>Key Props: {project.storyCanon?.props.map((p) => p.name).join(', ')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-[#1C2735] flex items-center space-x-1 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = stage2Tab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setStage2Tab(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#00AFFF] text-white bg-[#111820]'
                  : 'border-transparent text-[#79838E] hover:text-[#D7DCE2] hover:bg-[#0B1017]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00AFFF]' : ''}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#141C26] text-[#79838E]">
                  {tab.count}
                </span>
              )}
              {tab.alertCount !== undefined && tab.alertCount > 0 && (
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 font-bold border border-rose-500/30">
                  {tab.alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty State Welcome when nothing is generated */}
      {totalAssets === 0 && !project.stage2.styleBible ? (
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl p-8 md:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF] mx-auto shadow-lg shadow-[#00AFFF]/10">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF]">
              READY TO SYNTHESIZE
            </span>
            <h2 className="font-['Exo_2'] font-bold text-2xl text-white">
              Convert Story Canon into Ready-to-Paste Prompts
            </h2>
            <p className="text-xs text-[#79838E] leading-relaxed">
              Stage 1 Story Canon has been locked with style <span className="text-white font-semibold">"{project.visualStyle.name}"</span>. Click below to launch the 8-step modular pipeline to generate concrete image generation prompts for characters, signature wardrobe, locations, and narrative props.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-[#79838E]">
            <div className="bg-[#111820] px-3.5 py-2 rounded-lg border border-[#1C2735]">
              {project.storyCanon?.characters.length || 0} Characters
            </div>
            <div className="bg-[#111820] px-3.5 py-2 rounded-lg border border-[#1C2735]">
              {project.storyCanon?.locations.length || 0} Locations
            </div>
            <div className="bg-[#111820] px-3.5 py-2 rounded-lg border border-[#1C2735]">
              {project.storyCanon?.props.length || 0} Key Props
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowPipelineModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] hover:to-[#007AB0] text-white text-xs font-bold rounded-xl flex items-center space-x-2.5 mx-auto transition-all shadow-xl shadow-[#00AFFF]/30 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>LAUNCH VISUAL PROMPT GENERATOR</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Tab Content */
        <div className="pt-2">
          {stage2Tab === 'styleBible' && <StyleBibleTab />}
          {stage2Tab === 'characters' && <CharactersTab />}
          {stage2Tab === 'wardrobe' && <WardrobeTab />}
          {stage2Tab === 'locations' && <LocationsTab />}
          {stage2Tab === 'props' && <PropsTab />}
          {stage2Tab === 'manifest' && <AssetManifestTab />}
          {stage2Tab === 'audit' && <CanonReviewTab />}
        </div>
      )}

      {/* 8-Step Pipeline Modal */}
      <Stage2PipelineModal
        isOpen={showPipelineModal}
        onClose={() => setShowPipelineModal(false)}
        onSuccess={() => {
          setShowPipelineModal(false);
          setStage2Tab('characters');
        }}
      />
    </div>
  );
};
