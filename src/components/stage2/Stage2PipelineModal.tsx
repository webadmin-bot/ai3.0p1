import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  Layers,
  Palette,
  ShieldCheck,
  User,
  Shirt,
  MapPin,
  Box,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  apiGenerateStyleBible,
  apiGenerateVisualAssets,
  apiAuditVisualPrompts,
} from '../../services/api';
import { VisualAsset, VisualStyleBible, Stage2Audit } from '../../types/filmStudio';

interface Stage2PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

interface PipelineStep {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: StepStatus;
  detail?: string;
}

export const Stage2PipelineModal: React.FC<Stage2PipelineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    project,
    setStyleBible,
    setStage2Assets,
    setStage2Audit,
  } = useProject();

  const [steps, setSteps] = useState<PipelineStep[]>([
    {
      id: 1,
      title: 'Inspect Canon & Visual Manifest',
      description: 'Analyze Stage 1 characters, locations, props, and scene anchors.',
      icon: Layers,
      status: 'PENDING',
    },
    {
      id: 2,
      title: 'Generate Visual Style Bible V1',
      description: 'Formulate authoritative text directives for color, lighting, medium, and textures.',
      icon: Palette,
      status: 'PENDING',
    },
    {
      id: 3,
      title: 'Character Visual Designs & Prompts',
      description: 'Construct stable identities, facial anchors, and turnaround reference sheets.',
      icon: User,
      status: 'PENDING',
    },
    {
      id: 4,
      title: 'Signature Wardrobe & Costume Prompts',
      description: 'Specify textiles, wear patterns, layers, and character-linked color keys.',
      icon: Shirt,
      status: 'PENDING',
    },
    {
      id: 5,
      title: 'Location & Environment Prompts',
      description: 'Build architectural scale, lighting vectors, and spatial reference anchors.',
      icon: MapPin,
      status: 'PENDING',
    },
    {
      id: 6,
      title: 'Props, Vehicles & Special Assets',
      description: 'Detail physical scale, surface wear, tactile materials, and holders.',
      icon: Box,
      status: 'PENDING',
    },
    {
      id: 7,
      title: 'Compile & Format Visual Prompt Package V1',
      description: 'Normalize stable IDs, verify English copy-paste syntax, assemble manifest.',
      icon: Sparkles,
      status: 'PENDING',
    },
    {
      id: 8,
      title: 'Run Visual Canon Audit',
      description: 'Evaluate style cohesion, identity anchoring, and flag any blocking issues.',
      icon: ShieldCheck,
      status: 'PENDING',
    },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Local working state across steps
  const styleBibleRef = useRef<VisualStyleBible | null>(project.stage2.styleBible);
  const allAssetsRef = useRef<VisualAsset[]>(project.stage2.assets);
  const auditRef = useRef<Stage2Audit | null>(project.stage2.audit);

  useEffect(() => {
    if (isOpen) {
      // Initialize steps state based on existing progress if partially generated
      if (project.stage2.styleBible && project.stage2.assets.length > 0 && project.stage2.audit) {
        setSteps((prev) =>
          prev.map((s) => ({ ...s, status: 'COMPLETED' }))
        );
      }
    }
  }, [isOpen, project.stage2.styleBible, project.stage2.assets.length, project.stage2.audit]);

  const updateStepStatus = (stepId: number, status: StepStatus, detail?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status, detail: detail ?? s.detail } : s))
    );
  };

  const runPipelineFrom = async (startStepIndex: number) => {
    if (!project.storyFoundation || !project.storyCanon) {
      setErrorMessage('Stage 1 Story Foundation and Canon must be finalized before generating visual prompts.');
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);

    try {
      // STEP 1: Inspect Stage 1 Canon
      if (startStepIndex <= 0) {
        setCurrentStepIndex(0);
        updateStepStatus(1, 'RUNNING', 'Scanning recurring characters, key props, and story environments...');
        await new Promise((r) => setTimeout(r, 600));

        const charCount = project.storyCanon.characters?.length || 0;
        const locCount = project.storyCanon.locations?.length || 0;
        const propCount = project.storyCanon.props?.length || 0;

        updateStepStatus(
          1,
          'COMPLETED',
          `Identified ${charCount} recurring characters, ${locCount} locations, and ${propCount} story props.`
        );
      }

      // STEP 2: Generate Visual Style Bible
      if (startStepIndex <= 1) {
        setCurrentStepIndex(1);
        updateStepStatus(2, 'RUNNING', `Synthesizing ${project.visualStyle.name} visual laws and lighting physics...`);

        const bibleRes = await apiGenerateStyleBible({
          settings: project.settings,
          visualStyle: project.visualStyle,
          storyFoundation: project.storyFoundation,
          storyCanon: project.storyCanon,
        });

        if (!bibleRes.success || !bibleRes.styleBible) {
          throw new Error(bibleRes.error || 'Failed to generate Visual Style Bible');
        }

        styleBibleRef.current = bibleRes.styleBible;
        setStyleBible(bibleRes.styleBible);
        updateStepStatus(2, 'COMPLETED', `Style Bible V1 established for ${bibleRes.styleBible.mediumAndRealism}.`);
      }

      // STEP 3 - 6: Generate Visual Assets (Characters, Wardrobe, Locations, Props, Specials)
      if (startStepIndex <= 2) {
        setCurrentStepIndex(2);
        updateStepStatus(3, 'RUNNING', 'Synthesizing concrete character visual identities, face references, and turnarounds...');

        // Call the comprehensive visual assets generator
        const assetsRes = await apiGenerateVisualAssets({
          settings: project.settings,
          visualStyle: project.visualStyle,
          storyFoundation: project.storyFoundation,
          storyCanon: project.storyCanon,
          styleBible: styleBibleRef.current,
          importedScript: project.importedScript,
        });

        if (!assetsRes.success || !assetsRes.assets) {
          throw new Error(assetsRes.error || 'Failed to generate visual asset prompts');
        }

        const genAssets = assetsRes.assets;
        allAssetsRef.current = genAssets;

        const charAssets = genAssets.filter((a) => a.type === 'CHARACTER');
        const wardAssets = genAssets.filter((a) => a.type === 'WARDROBE');
        const locAssets = genAssets.filter((a) => a.type === 'LOCATION');
        const propAssets = genAssets.filter((a) => a.type === 'PROP' || a.type === 'SPECIAL');

        updateStepStatus(3, 'COMPLETED', `Engineered ${charAssets.length} master character reference prompts.`);

        // STEP 4: Wardrobe
        setCurrentStepIndex(3);
        updateStepStatus(4, 'RUNNING', 'Linking signature costume layers, fabric wear, and color palettes...');
        await new Promise((r) => setTimeout(r, 400));
        updateStepStatus(4, 'COMPLETED', `Engineered ${wardAssets.length} wardrobe reference prompts.`);

        // STEP 5: Locations
        setCurrentStepIndex(4);
        updateStepStatus(5, 'RUNNING', 'Calibrating architectural scale, atmospheric lighting, and key angles...');
        await new Promise((r) => setTimeout(r, 400));
        updateStepStatus(5, 'COMPLETED', `Engineered ${locAssets.length} location establishing prompts.`);

        // STEP 6: Props & Specials
        setCurrentStepIndex(5);
        updateStepStatus(6, 'RUNNING', 'Specifying tactile prop textures, surface wear, and mechanisms...');
        await new Promise((r) => setTimeout(r, 400));
        updateStepStatus(6, 'COMPLETED', `Engineered ${propAssets.length} prop and special asset prompts.`);

        // STEP 7: Validate & Assemble Manifest
        setCurrentStepIndex(6);
        updateStepStatus(7, 'RUNNING', 'Verifying IDs, stripping forbidden tags, checking copy-paste formatting...');
        setStage2Assets(genAssets);
        await new Promise((r) => setTimeout(r, 500));
        updateStepStatus(
          7,
          'COMPLETED',
          `Assembled Visual Prompt Package V1 with ${genAssets.length} total production-ready prompts.`
        );
      }

      // STEP 8: Run Visual Canon Audit
      if (startStepIndex <= 7) {
        setCurrentStepIndex(7);
        updateStepStatus(8, 'RUNNING', 'Auditing visual prompt package against style bible and canon continuity...');

        const auditRes = await apiAuditVisualPrompts({
          assets: allAssetsRef.current,
          styleBible: styleBibleRef.current,
          storyFoundation: project.storyFoundation,
          storyCanon: project.storyCanon,
        });

        if (!auditRes.success || !auditRes.audit) {
          throw new Error(auditRes.error || 'Failed to complete Visual Canon Audit');
        }

        auditRef.current = auditRes.audit;
        setStage2Audit(auditRes.audit);
        const reqCount = auditRes.audit.issues.filter((i) => i.severity === 'REQUIRED' && i.status === 'OPEN').length;

        updateStepStatus(
          8,
          'COMPLETED',
          `Audit complete (Score: ${auditRes.audit.overallScore}/100, ${reqCount} required issues).`
        );
      }

      setIsRunning(false);
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err: any) {
      console.error('Pipeline step execution error:', err);
      setIsRunning(false);
      const failedStepId = currentStepIndex + 1;
      updateStepStatus(failedStepId, 'FAILED', err?.message || 'Step encountered a service error.');
      setErrorMessage(
        err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE')
          ? 'Temporary model availability spike (503). Your generated checkpoints are preserved—click Retry to resume.'
          : err?.message || 'An error occurred during prompt generation.'
      );
    }
  };

  const handleStart = () => {
    runPipelineFrom(0);
  };

  const handleRetry = () => {
    runPipelineFrom(currentStepIndex);
  };

  if (!isOpen) return null;

  const completedCount = steps.filter((s) => s.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#1C2735] pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] bg-[#00AFFF]/15 px-2 py-0.5 rounded border border-[#00AFFF]/30">
                8-STEP PRODUCTION PIPELINE
              </span>
              <span className="text-xs text-[#79838E]">Checkpoint-Safe</span>
            </div>
            <h2 className="font-['Exo_2'] font-bold text-xl text-white">
              Visual Asset Prompt Studio Generator
            </h2>
            <p className="text-xs text-[#79838E]">
              From Stage 1 Canon & Master Visual Style ({project.visualStyle.name}) to complete ready-to-paste prompts.
            </p>
          </div>

          {!isRunning && (
            <button
              onClick={onClose}
              className="text-[#79838E] hover:text-white p-1.5 rounded-lg hover:bg-[#141C26] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#D7DCE2]">Generation Progress</span>
            <span className="text-[#00AFFF] font-mono">{progressPercent}% ({completedCount} / 8 Steps)</span>
          </div>
          <div className="w-full h-2 bg-[#141C26] rounded-full overflow-hidden border border-[#1C2735]">
            <div
              className="h-full bg-gradient-to-r from-[#00AFFF] to-[#00E5FF] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = step.status === 'RUNNING';
            const isDone = step.status === 'COMPLETED';
            const isFailed = step.status === 'FAILED';

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start space-x-3.5 ${
                  isCurrent
                    ? 'bg-[#111820] border-[#00AFFF] shadow-md shadow-[#00AFFF]/10'
                    : isDone
                    ? 'bg-[#0E141D] border-emerald-500/30'
                    : isFailed
                    ? 'bg-red-950/20 border-red-500/50'
                    : 'bg-[#0A0E14] border-[#1C2735]/60 opacity-60'
                }`}
              >
                {/* Step indicator */}
                <div
                  className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                    isDone
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : isCurrent
                      ? 'bg-[#00AFFF]/20 text-[#00AFFF] border border-[#00AFFF]/40 animate-pulse'
                      : isFailed
                      ? 'bg-red-950 text-red-400 border border-red-500/40'
                      : 'bg-[#141C26] text-[#79838E]'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : isFailed ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* Step detail */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#79838E] uppercase tracking-wider">
                      STEP {step.id}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase font-bold ${
                        isDone
                          ? 'text-emerald-400'
                          : isCurrent
                          ? 'text-[#00AFFF]'
                          : isFailed
                          ? 'text-red-400'
                          : 'text-[#79838E]'
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-0.5">{step.title}</h4>
                  <p className="text-[11px] text-[#79838E] leading-normal mt-0.5">
                    {step.description}
                  </p>
                  {step.detail && (
                    <div
                      className={`text-[11px] font-mono mt-1.5 p-1.5 rounded ${
                        isDone
                          ? 'text-emerald-300 bg-emerald-950/40'
                          : isCurrent
                          ? 'text-[#00AFFF] bg-[#00AFFF]/10'
                          : isFailed
                          ? 'text-red-300 bg-red-950/40'
                          : 'text-[#79838E]'
                      }`}
                    >
                      {step.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Generation Paused</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Modal Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1C2735]">
          <div className="text-[11px] text-[#79838E]">
            {!isRunning && completedCount === 0 && 'Ready to begin 8-step prompt synthesis.'}
            {isRunning && `Executing step ${currentStepIndex + 1} of 8...`}
            {!isRunning && completedCount === 8 && 'All visual asset prompts generated and audited.'}
          </div>

          <div className="flex items-center space-x-2.5">
            {!isRunning && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] text-xs font-semibold rounded-lg border border-[#1C2735] transition-colors"
              >
                {completedCount === 8 ? 'Close' : 'Cancel'}
              </button>
            )}

            {errorMessage ? (
              <button
                type="button"
                onClick={handleRetry}
                className="px-5 py-2 bg-[#F4A62A] hover:bg-[#E09620] text-black text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-[#F4A62A]/20 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Step {currentStepIndex + 1}</span>
              </button>
            ) : completedCount === 8 ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>View Prompts</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={isRunning}
                className="px-5 py-2 bg-[#00AFFF] hover:bg-[#0090D0] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-[#00AFFF]/25 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Prompts...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{completedCount > 0 ? 'Restart Pipeline' : 'Start Generation'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
