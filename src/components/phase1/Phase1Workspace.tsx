import React, { useState } from 'react';
import {
  Compass,
  TrendingUp,
  Sparkles,
  FileText,
  Clapperboard,
  Sliders,
  ArrowRight,
  CheckCircle2,
  Lock,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Layers,
  ChevronRight,
  BookOpen,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Phase1StepId } from '../../types/filmStudio';
import { StartingModesTab } from './StartingModesTab';
import { NicheResearchTab } from './NicheResearchTab';
import { CreativeConceptsTab } from './CreativeConceptsTab';
import { OwnStoryReviewStep } from './OwnStoryReviewStep';
import { ScreenplayPlannerTab } from './ScreenplayPlannerTab';
import { CinematicShotListTab } from './CinematicShotListTab';
import { BrainAuditTab } from './BrainAuditTab';

interface Phase1WorkspaceProps {
  onProceedToPhase2?: () => void;
}

interface StepDefinition {
  id: Phase1StepId;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Phase1Workspace: React.FC<Phase1WorkspaceProps> = ({ onProceedToPhase2 }) => {
  const {
    project,
    setActivePhase,
    setActiveStage,
    setPhase1Step,
    resetPhase1Workflow,
    reviseApprovedPhase1,
    isPhase1Locked,
  } = useProject();

  const [showResetModal, setShowResetModal] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [isRevising, setIsRevising] = useState(false);

  const isApprovedOrLocked = Boolean(project.stage1?.locked || project.stage1?.approved);

  const workflow = project.phase1Workflow || {
    currentStep: 'setup' as Phase1StepId,
    completedSteps: [] as Phase1StepId[],
    setupConfirmed: false,
    selectedStartingMode: project.storySourceMode || 'AI_CONCEPT',
    stepStatus: {},
  };

  const isPreExisting =
    isApprovedOrLocked ||
    (workflow.completedSteps && workflow.completedSteps.length > 1) ||
    Boolean(
      project.stage3?.scenes?.length ||
      project.stage3?.shots?.length ||
      project.concepts?.length ||
      project.selectedConceptId ||
      project.originalStoryText?.trim() ||
      project.importedScript
    );

  const isSetupConfirmed = workflow.setupConfirmed || isPreExisting;
  const currentStep = workflow.currentStep || 'setup';
  const completedSteps = workflow.completedSteps || [];
  const currentMode = project.storySourceMode;

  // Build the adaptive step list based on the chosen creative mode
  const getAdaptiveSteps = (): StepDefinition[] => {
    const baseSetupStep: StepDefinition = {
      id: 'setup',
      label: '1. Starting Mode & Specs',
      sublabel: 'Parameters & Specs',
      icon: Sliders,
    };

    if (currentMode === 'DISCOVER_NICHES') {
      // Mode A: 7 steps
      return [
        baseSetupStep,
        {
          id: 'discover_niches',
          label: '2. Discover Niches',
          sublabel: 'Trend & Category Mining',
          icon: Compass,
        },
        {
          id: 'research_niche',
          label: '3. Niche Research',
          sublabel: 'Demand & Opportunity Analysis',
          icon: TrendingUp,
        },
        {
          id: 'concepts',
          label: '4. Creative Concepts',
          sublabel: '5 Story Architecture Decks',
          icon: Sparkles,
        },
        {
          id: 'screenplay',
          label: '5. Screenplay',
          sublabel: 'Scenes, Actions & Dialogue',
          icon: FileText,
        },
        {
          id: 'shot_list',
          label: '6. Shot List',
          sublabel: 'Cinematic Camera Plans',
          icon: Clapperboard,
        },
        {
          id: 'brain_audit',
          label: '7. Brain Audit',
          sublabel: 'Two-Layer Story & Technical Verification',
          icon: ShieldCheck,
        },
      ];
    }

    if (currentMode === 'RESEARCH_NICHE') {
      // Mode B: 6 steps
      return [
        baseSetupStep,
        {
          id: 'research_niche',
          label: '2. Research Niche',
          sublabel: 'Evidence & Metrics Analysis',
          icon: TrendingUp,
        },
        {
          id: 'concepts',
          label: '3. Creative Concepts',
          sublabel: '5 Story Architecture Decks',
          icon: Sparkles,
        },
        {
          id: 'screenplay',
          label: '4. Screenplay',
          sublabel: 'Scenes, Actions & Dialogue',
          icon: FileText,
        },
        {
          id: 'shot_list',
          label: '5. Shot List',
          sublabel: 'Cinematic Camera Plans',
          icon: Clapperboard,
        },
        {
          id: 'brain_audit',
          label: '6. Brain Audit',
          sublabel: 'Two-Layer Story & Technical Verification',
          icon: ShieldCheck,
        },
      ];
    }

    if (currentMode === 'OWN_STORY' || currentMode === 'OWN_SCRIPT') {
      // Mode D: 5 steps (No niche research, no concept generation!)
      return [
        baseSetupStep,
        {
          id: 'own_story_review',
          label: '2. Story Interpretation',
          sublabel: 'Author Canon & Analysis',
          icon: BookOpen,
        },
        {
          id: 'screenplay',
          label: '3. Screenplay',
          sublabel: 'Scene & Dialogue Preservation',
          icon: FileText,
        },
        {
          id: 'shot_list',
          label: '4. Shot List',
          sublabel: 'Cinematic Camera Plans',
          icon: Clapperboard,
        },
        {
          id: 'brain_audit',
          label: '5. Brain Audit',
          sublabel: 'Two-Layer Story & Technical Verification',
          icon: ShieldCheck,
        },
      ];
    }

    // Default: Mode C (ORIGINAL_IDEAS / AI_CONCEPT) - 5 steps (Skips niche research!)
    return [
      baseSetupStep,
      {
        id: 'concepts',
        label: '2. Creative Concepts',
        sublabel: '5 Story Architecture Decks',
        icon: Sparkles,
      },
      {
        id: 'screenplay',
        label: '3. Screenplay',
        sublabel: 'Scenes, Actions & Dialogue',
        icon: FileText,
      },
      {
        id: 'shot_list',
        label: '4. Shot List',
        sublabel: 'Cinematic Camera Plans',
        icon: Clapperboard,
      },
      {
        id: 'brain_audit',
        label: '5. Brain Audit',
        sublabel: 'Two-Layer Story & Technical Verification',
        icon: ShieldCheck,
      },
    ];
  };

  const steps = getAdaptiveSteps();
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const displayStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;
  const totalSteps = steps.length;

  const handleNextPhase = () => {
    if (onProceedToPhase2) {
      onProceedToPhase2();
    } else {
      if (setActivePhase) {
        setActivePhase('phase2');
      } else {
        setActiveStage('stage2');
      }
    }
  };

  const handleStepClick = (stepId: Phase1StepId) => {
    // When phase is approved or locked, users can freely view any step in read-only mode
    if (isApprovedOrLocked) {
      setPhase1Step(stepId);
      return;
    }
    const isCompleted = completedSteps.includes(stepId);
    const isCurrent = currentStep === stepId;
    if (isCompleted || isCurrent || stepId === 'setup') {
      setPhase1Step(stepId);
    }
  };

  const handleResetWorkflow = () => {
    resetPhase1Workflow();
    setShowResetModal(false);
  };

  // =========================================================================
  // 1. FRESH PROJECT / INITIAL SCREEN: Show ONLY Step 1 Starting Modes
  // =========================================================================
  if (!isSetupConfirmed) {
    return (
      <div className="space-y-6">
        <StartingModesTab
          onContinueToNext={() => {
            // Handled inside StartingModesTab via markPhase1StepCompleted
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // 2. GUIDED WORKFLOW WIZARD: Setup Confirmed -> Progressive Navigation
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Approved Phase 1 Read-Only Review Banner */}
      {isApprovedOrLocked && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-sm">Phase 1 Approved & Locked</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                  Revision #{project.sourceRevision || 1}
                </span>
                {project.approvedSnapshots?.phase1 && project.approvedSnapshots.phase1.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#141C26] text-[#79838E] border border-[#1C2735]">
                    {project.approvedSnapshots.phase1.length} saved snapshot(s)
                  </span>
                )}
              </div>
              <p className="text-[#8A96A6] text-xs mt-0.5">
                All specs, concepts, screenplay scenes, and shot plans are in read-only review. To make changes, unlock via explicit revision.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setShowReviseModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#141F2E] hover:bg-[#1E2F46] text-[#00AFFF] border border-[#00AFFF]/50 font-bold text-xs cursor-pointer transition-colors shadow-sm"
            >
              Revise Approved Phase 1
            </button>
            <button
              onClick={handleNextPhase}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span>Phase 2 Pre-Production →</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Workflow Status & Progress Bar */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#141C26] text-[#00AFFF] border border-[#243346] uppercase tracking-wider">
            {currentMode === 'DISCOVER_NICHES' && 'MODE A · DISCOVER NICHES'}
            {currentMode === 'RESEARCH_NICHE' && 'MODE B · RESEARCH MY NICHE'}
            {currentMode === 'ORIGINAL_IDEAS' || currentMode === 'AI_CONCEPT' ? 'MODE C · ORIGINAL IDEAS' : ''}
            {currentMode === 'OWN_STORY' || currentMode === 'OWN_SCRIPT' ? 'MODE D · AUTHOR STORY' : ''}
          </span>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-white">
              Step {displayStepNumber} of {totalSteps}
            </span>
            <span className="text-[#55606E]">·</span>
            <span className="text-[#8A96A6]">
              {steps.find((s) => s.id === currentStep)?.label || 'Setup'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {isApprovedOrLocked ? (
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Read-Only</span>
              </span>
              <button
                onClick={() => setShowReviseModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141F2E] hover:bg-[#1E2F46] text-[#00AFFF] border border-[#00AFFF]/50 text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Revise Phase 1</span>
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setPhase1Step('setup')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-[#A0AEC0] hover:text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors"
                title="Edit project technical parameters and creative starting specs"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span>Edit Setup</span>
              </button>

              <button
                onClick={() => setShowResetModal(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs text-[#79838E] hover:text-rose-300 hover:bg-rose-950/20 cursor-pointer transition-colors"
                title="Reset workflow to Step 1 mode selection"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset Workflow</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Compact Summary of Confirmed Project Specifications */}
      <div className="bg-[#0E141D] border border-[#1C2735] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#8A96A6]">
          <div>
            <span className="text-[#55606E]">Project: </span>
            <strong className="text-white font-medium">{project.title}</strong>
          </div>
          <div>
            <span className="text-[#55606E]">Format: </span>
            <strong className="text-[#C5D0DE]">{project.settings.format}</strong>
          </div>
          <div>
            <span className="text-[#55606E]">Ratio: </span>
            <strong className="text-[#00AFFF] font-mono">{project.settings.aspectRatio}</strong>
          </div>
          <div>
            <span className="text-[#55606E]">Target: </span>
            <strong className="text-white font-mono">{project.settings.targetRuntimeSeconds}s</strong>
          </div>
          <div>
            <span className="text-[#55606E]">Style: </span>
            <strong className="text-[#C5D0DE] truncate max-w-[160px] inline-block align-bottom">
              {project.visualStyle?.name || 'Cinematic Realism'}
            </strong>
          </div>
          {project.settings.topicOrNiche && (
            <div>
              <span className="text-[#55606E]">Focus: </span>
              <strong className="text-amber-300 truncate max-w-[180px] inline-block align-bottom">
                "{project.settings.topicOrNiche}"
              </strong>
            </div>
          )}
        </div>

        {isApprovedOrLocked ? (
          <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Canon Locked (v{project.sourceRevision || 1})</span>
          </span>
        ) : (
          <button
            onClick={() => setPhase1Step('setup')}
            className="text-[11px] text-[#00AFFF] hover:underline font-semibold cursor-pointer shrink-0"
          >
            Modify Specs →
          </button>
        )}
      </div>

      {/* Adaptive Progressive Stepper Navigation Bar */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-2 flex flex-wrap gap-1.5 shadow-sm">
        {steps.map((step, idx) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isAccessible = isApprovedOrLocked || isCompleted || isCurrent || step.id === 'setup';
          const isLocked = !isAccessible;
          const isNeedsReview = workflow.stepStatus?.[step.id] === 'needs_review';
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              disabled={isLocked}
              className={`flex-1 min-w-[150px] py-2 px-3 rounded-lg text-left transition-all flex items-center space-x-2.5 ${
                isCurrent
                  ? 'bg-[#141F2E] border border-[#00AFFF] text-white shadow-sm ring-1 ring-[#00AFFF]/30'
                  : isCompleted
                  ? 'bg-[#0E1520] hover:bg-[#131D2A] text-[#C5D0DE] border border-[#1C2735] cursor-pointer'
                  : 'bg-transparent text-[#455060] border border-transparent cursor-not-allowed opacity-50'
              }`}
            >
              <div
                className={`p-1.5 rounded-md shrink-0 flex items-center justify-center ${
                  isCurrent
                    ? 'bg-[#00AFFF] text-white'
                    : isNeedsReview
                    ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                    : isCompleted
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[#141C26] text-[#455060]'
                }`}
              >
                {isNeedsReview ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>

              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-xs font-bold truncate ${
                      isCurrent
                        ? 'text-white'
                        : isCompleted
                        ? 'text-[#C5D0DE]'
                        : 'text-[#455060]'
                    }`}
                  >
                    {step.label}
                  </span>
                  {isNeedsReview && (
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-500/20 text-amber-300">
                      REVIEW
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#55606E] truncate">{step.sublabel}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Downstream "Needs Review" Banner if inputs changed */}
      {workflow.stepStatus?.[currentStep] === 'needs_review' && (
        <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Needs Review:</strong> {workflow.needsReviewReason || 'Upstream creative selections were updated. Review this section to maintain continuity.'}
            </span>
          </div>
        </div>
      )}

      {/* Active Step Component View (Only current step is rendered!) */}
      <div className="transition-all">
        {currentStep === 'setup' && (
          <StartingModesTab
            onContinueToNext={() => {
              // Advances to the mode-appropriate next step
              let target: Phase1StepId = 'concepts';
              if (currentMode === 'DISCOVER_NICHES') target = 'discover_niches';
              else if (currentMode === 'RESEARCH_NICHE') target = 'research_niche';
              else if (currentMode === 'OWN_STORY' || currentMode === 'OWN_SCRIPT') target = 'own_story_review';
              setPhase1Step(target);
            }}
          />
        )}

        {(currentStep === 'discover_niches' || currentStep === 'research_niche') && (
          <NicheResearchTab
            onProceedToConcepts={() => setPhase1Step('concepts')}
          />
        )}

        {currentStep === 'concepts' && (
          <CreativeConceptsTab
            onProceedToScript={() => setPhase1Step('screenplay')}
          />
        )}

        {currentStep === 'own_story_review' && (
          <OwnStoryReviewStep
            onProceedToScript={() => setPhase1Step('screenplay')}
          />
        )}

        {currentStep === 'screenplay' && (
          <ScreenplayPlannerTab
            onProceedToShots={() => setPhase1Step('shot_list')}
          />
        )}

        {currentStep === 'shot_list' && (
          <CinematicShotListTab
            onProceedToPhase2={() => setPhase1Step('brain_audit')}
          />
        )}

        {currentStep === 'brain_audit' && (
          <BrainAuditTab
            onProceedToPhase2={handleNextPhase}
          />
        )}
      </div>

      {/* Reset Workflow Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-amber-400">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold text-white font-['Exo_2']">
                Reset Phase 1 Workflow?
              </h3>
            </div>

            <p className="text-xs text-[#8A96A6] leading-relaxed">
              This will return your project to <strong>Step 1: Creative Starting Mode Selection</strong>. Your existing generated concepts, screenplay scenes, and shot lists will remain safely saved in project drafts.
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#1C2735]">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-lg bg-[#141C26] hover:bg-[#1C2735] text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetWorkflow}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
              >
                Confirm Reset to Step 1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revise Approved Phase 1 Confirmation Modal */}
      {showReviseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-[#00AFFF]">
              <Edit3 className="w-5 h-5" />
              <h3 className="text-base font-bold text-white font-['Exo_2']">
                Revise Approved Phase 1?
              </h3>
            </div>

            <div className="space-y-3 text-xs text-[#8A96A6] leading-relaxed">
              <p>
                This action will archive your currently approved state as <strong className="text-white">Snapshot Revision #{project.sourceRevision || 1}</strong> and unlock Phase 1 for editing under <strong className="text-emerald-400">Revision #{(project.sourceRevision || 1) + 1}</strong>.
              </p>
              <div className="p-3 bg-[#111820] border border-[#1C2735] rounded-lg space-y-1.5 text-[11px]">
                <div className="flex items-center space-x-2 text-amber-300 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Revision Impact & Continuity Notice:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[#A0AEC0] pl-1">
                  <li>Your existing screenplay scenes, shots, and concepts are <strong className="text-white">preserved safely</strong>.</li>
                  <li>Downstream Phase 2 visual assets and Phase 3 Google Flow packages will be marked <span className="font-mono text-amber-300">NEEDS_REVIEW / SOURCE_STALE</span> to ensure continuity with your revisions.</li>
                  <li>Brain Audit will require verification before Phase 1 can be locked again.</li>
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
                  placeholder="e.g. Updating protagonist arc, adjusting ending scene"
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
                    await reviseApprovedPhase1(revisionReason.trim() || undefined);
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
                  <span>Confirm & Unlock for Revision</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
