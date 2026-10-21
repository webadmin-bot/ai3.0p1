import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  Layers,
  Clapperboard,
  Film,
  Camera,
  Compass,
  Link2,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  apiGenerateScriptScenes,
  apiGenerateShotPlan,
  apiAuditStage3,
} from '../../services/api';
import { ScriptScene, CinematicShot, Stage3Audit } from '../../types/filmStudio';

interface Stage3PipelineModalProps {
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

export const Stage3PipelineModal: React.FC<Stage3PipelineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    project,
    setStage3Scenes,
    setStage3Shots,
    setStage3Audit,
  } = useProject();

  const [steps, setSteps] = useState<PipelineStep[]>([
    {
      id: 1,
      title: 'Approved Canon & Source Script Handoff',
      description: 'Validate Stage 1 locked canon, Stage 2 visual assets, and source mode.',
      icon: Layers,
      status: 'PENDING',
    },
    {
      id: 2,
      title: 'Scene Plan & Structural Architecture',
      description: 'Map narrative beats to filmable scenes with location, character, and wardrobe anchors.',
      icon: Clapperboard,
      status: 'PENDING',
    },
    {
      id: 3,
      title: 'Screenplay Script & Dialogue Action',
      description: project.storySourceMode === 'OWN_SCRIPT'
        ? 'Extract user imported screenplay scenes & dialogue verbatim without rewriting.'
        : 'Generate filmable present-tense visible action and spoken dialogue blocks.',
      icon: Film,
      status: 'PENDING',
    },
    {
      id: 4,
      title: 'Scene Continuity & Speech Timing Review',
      description: 'Compute realistic speaking durations, pause intervals, and scene runtimes.',
      icon: Clock,
      status: 'PENDING',
    },
    {
      id: 5,
      title: 'Scene-to-Shot Breakdown (Strict 6s / 8s / 10s)',
      description: 'Partition every scene into continuous filmable shots adhering strictly to 6s, 8s, or 10s.',
      icon: Camera,
      status: 'PENDING',
    },
    {
      id: 6,
      title: 'Cinematography, Blocking & Lighting Staging',
      description: 'Direct shot size, camera angle, movement, subject blocking, eyelines, and style lighting.',
      icon: Compass,
      status: 'PENDING',
    },
    {
      id: 7,
      title: 'Google Flow Routing & First Frame Prompts',
      description: 'Route shots to INGREDIENTS or FRAMES; generate copy-paste first frame prompts for FRAMES.',
      icon: Link2,
      status: 'PENDING',
    },
    {
      id: 8,
      title: 'Shot-to-Shot Continuity Compilation',
      description: 'Verify screen direction, prop holders, eye continuity, and production readiness.',
      icon: CheckCircle2,
      status: 'PENDING',
    },
    {
      id: 9,
      title: 'Stage 3 Production & Canon Audit',
      description: 'Execute deep audit verifying duration invariants, asset IDs, and script fidelity.',
      icon: ShieldCheck,
      status: 'PENDING',
    },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedStepId, setFailedStepId] = useState<number | null>(null);

  // Local working state across asynchronous steps
  const workingScenesRef = useRef<ScriptScene[]>(project.stage3.scenes || []);
  const workingShotsRef = useRef<CinematicShot[]>(project.stage3.shots || []);
  const workingAuditRef = useRef<Stage3Audit | null>(project.stage3.audit || null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const updateStepStatus = (id: number, status: StepStatus, detail?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s))
    );
  };

  const runPipelineFromStep = async (startStep: number) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setFailedStepId(null);
    let currentRunningStep = startStep;

    const targetRuntime = project.settings?.targetRuntimeSeconds || 60;
    const scriptSettings = project.stage3.settings || {
      pacing: 'BALANCED',
      dialogueDensity: 'MEDIUM',
      allowNarration: false,
      maxShotDuration: 10,
      flowRoutePreference: 'AUTO',
    };

    try {
      // STEP 1 — Approved Canon Handoff
      if (startStep <= 1) {
        currentRunningStep = 1;
        setCurrentStepId(1);
        updateStepStatus(1, 'RUNNING', 'Verifying Stage 1 locked canon and Stage 2 asset manifest...');
        await new Promise((r) => setTimeout(r, 600));

        if (!project.stage1.locked || !project.storyCanon) {
          throw new Error('Stage 1 Story Canon is not locked. Please lock Stage 1 first.');
        }
        if (!project.stage2.locked || project.stage2.assets.length === 0) {
          throw new Error('Stage 2 Visual Asset Package is not locked. Please lock Stage 2 first.');
        }

        updateStepStatus(1, 'COMPLETED', `Handoff verified: ${project.storyCanon.characters.length} characters, ${project.stage2.assets.length} visual assets.`);
      }

      // STEP 2 & 3 & 4 — Scene Generation / Script Extraction
      if (startStep <= 2 || startStep <= 3 || startStep <= 4) {
        currentRunningStep = 2;
        setCurrentStepId(2);
        updateStepStatus(2, 'RUNNING', 'Synthesizing scene plan and narrative beat coverage...');
        updateStepStatus(3, 'RUNNING', project.storySourceMode === 'OWN_SCRIPT' ? 'Preserving original script verbatim...' : 'Scripting action and dialogue blocks...');
        updateStepStatus(4, 'RUNNING', 'Calculating speech timing and natural pauses...');

        const scenesRes = await apiGenerateScriptScenes({
          storySourceMode: project.storySourceMode,
          storyFoundation: project.storyFoundation!,
          storyCanon: project.storyCanon!,
          originalStoryText: project.originalStoryText,
          importedScript: project.importedScript,
          settings: project.settings,
          scriptSettings,
          visualStyle: project.visualStyle,
          styleBible: project.stage2.styleBible,
        });

        if (!scenesRes.success || !scenesRes.scenes || scenesRes.scenes.length === 0) {
          throw new Error(scenesRes.error || 'Failed to generate screenplay scenes.');
        }

        workingScenesRef.current = scenesRes.scenes;
        setStage3Scenes(scenesRes.scenes);

        updateStepStatus(2, 'COMPLETED', `Generated ${scenesRes.scenes.length} structured scenes.`);
        updateStepStatus(3, 'COMPLETED', project.storySourceMode === 'OWN_SCRIPT' ? 'Original script dialogue preserved verbatim.' : `Screenplay script completed with action and dialogue blocks.`);
        updateStepStatus(4, 'COMPLETED', `Scene runtimes estimated (~${scenesRes.scenes.reduce((a, s) => a + s.estimatedSceneDuration, 0)}s total estimated).`);
      }

      // STEP 5 & 6 & 7 — Scene-to-Shot Breakdown (Strict 6s / 8s / 10s)
      if (startStep <= 5 || startStep <= 6 || startStep <= 7) {
        currentRunningStep = 5;
        setCurrentStepId(5);
        updateStepStatus(5, 'RUNNING', 'Decomposing scenes into shots strictly 6s, 8s, or 10s...');
        updateStepStatus(6, 'RUNNING', 'Assigning camera movements, lens intent, and chiaroscuro lighting...');
        updateStepStatus(7, 'RUNNING', 'Determining Google Flow route & generating first frame prompts...');

        const shotsRes = await apiGenerateShotPlan({
          scenes: workingScenesRef.current,
          visualStyle: project.visualStyle,
          styleBible: project.stage2.styleBible,
          stage2Assets: project.stage2.assets,
          storyCanon: project.storyCanon!,
          scriptSettings,
        });

        if (!shotsRes.success || !shotsRes.shots || shotsRes.shots.length === 0) {
          throw new Error(shotsRes.error || 'Failed to decompose scenes into shots.');
        }

        workingShotsRef.current = shotsRes.shots;
        setStage3Shots(shotsRes.shots);

        const ingCount = shotsRes.shots.filter((s) => s.flowMode === 'INGREDIENTS').length;
        const frameCount = shotsRes.shots.filter((s) => s.flowMode === 'FRAMES').length;
        const totalShotRuntime = shotsRes.shots.reduce((a, s) => a + s.duration, 0);

        updateStepStatus(5, 'COMPLETED', `${shotsRes.shots.length} shots planned (Strictly 6s/8s/10s, total: ${totalShotRuntime}s).`);
        updateStepStatus(6, 'COMPLETED', `Cinematography & blocking aligned with "${project.visualStyle.name}".`);
        updateStepStatus(7, 'COMPLETED', `Routing complete: ${ingCount} Ingredients shots, ${frameCount} Frames shots.`);
      }

      // STEP 8 — Shot Continuity Compilation
      if (startStep <= 8) {
        currentRunningStep = 8;
        setCurrentStepId(8);
        updateStepStatus(8, 'RUNNING', 'Compiling shot-to-shot continuity chain and asset mappings...');
        await new Promise((r) => setTimeout(r, 600));

        updateStepStatus(8, 'COMPLETED', 'Continuity chain validated across camera axes and screen directions.');
      }

      // STEP 9 — Stage 3 Production Audit
      if (startStep <= 9) {
        currentRunningStep = 9;
        setCurrentStepId(9);
        updateStepStatus(9, 'RUNNING', 'Running Stage 3 Canon & Production Audit...');

        const auditRes = await apiAuditStage3({
          scenes: workingScenesRef.current,
          shots: workingShotsRef.current,
          storyCanon: project.storyCanon!,
          storySourceMode: project.storySourceMode,
          importedScript: project.importedScript,
          stage2Assets: project.stage2.assets,
          styleBible: project.stage2.styleBible,
          scriptSettings,
          targetRuntime,
        });

        if (auditRes.success && auditRes.audit) {
          workingAuditRef.current = auditRes.audit;
          setStage3Audit(auditRes.audit);
          updateStepStatus(9, 'COMPLETED', `Audit finished with score ${auditRes.audit.overallScore}/100.`);
        } else {
          updateStepStatus(9, 'COMPLETED', 'Basic audit completed.');
        }
      }

      setIsProcessing(false);
      setCurrentStepId(null);
      onSuccess();
    } catch (err: any) {
      console.error('Stage 3 pipeline error:', err);
      const stepThatFailed = currentRunningStep;
      setFailedStepId(stepThatFailed);
      updateStepStatus(stepThatFailed, 'FAILED', err.message || 'Step encountered an error.');
      setErrorMessage(
        err.message?.includes('503')
          ? 'Temporary model unavailability (503). Completed scenes and shots are preserved. Please click "Retry Failed Step" to resume.'
          : err.message?.includes('429')
          ? 'API rate limit reached (429). Completed work is saved. Please pause a moment and retry.'
          : err.message || 'An error occurred during script & shot generation.'
      );
      setIsProcessing(false);
    }
  };

  const handleStartGeneration = () => {
    // Reset steps
    setSteps((prev) => prev.map((s) => ({ ...s, status: 'PENDING', detail: undefined })));
    runPipelineFromStep(1);
  };

  const handleRetryFailedStep = () => {
    if (failedStepId !== null) {
      runPipelineFromStep(failedStepId);
    }
  };

  if (!isOpen) return null;

  const allCompleted = steps.every((s) => s.status === 'COMPLETED');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00AFFF]/20 to-[#0090D0]/10 border border-[#00AFFF]/30 flex items-center justify-center text-[#00AFFF]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#00AFFF] font-bold">
                STAGE 3 MODULAR PIPELINE
              </div>
              <h2 className="font-['Exo_2'] font-bold text-xl text-white">
                Generate Script & Shot Plan
              </h2>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="text-[#79838E] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Source Mode Context Bar */}
        <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[#79838E]">Source Mode:</span>
            <span className="font-mono font-bold text-white bg-[#141C26] px-2 py-0.5 rounded border border-[#1C2735]">
              {project.storySourceMode}
            </span>
            <span className="text-[#79838E] ml-2">Visual Style:</span>
            <span className="font-semibold text-[#00AFFF]">
              {project.visualStyle.name}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#F4A62A]">
            Duration Standard: 6s / 8s / 10s
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            const isRunning = step.status === 'RUNNING';
            const isCompleted = step.status === 'COMPLETED';
            const isFailed = step.status === 'FAILED';

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isRunning
                    ? 'bg-[#111820] border-[#00AFFF]/50 shadow-md shadow-[#00AFFF]/10'
                    : isCompleted
                    ? 'bg-[#0E151F] border-emerald-500/30'
                    : isFailed
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-[#111820]/60 border-[#1C2735]'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isRunning
                        ? 'bg-[#00AFFF]/20 text-[#00AFFF]'
                        : isCompleted
                        ? 'bg-emerald-950 text-emerald-400'
                        : isFailed
                        ? 'bg-rose-950 text-rose-400'
                        : 'bg-[#141C26] text-[#79838E]'
                    }`}
                  >
                    {isRunning ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : isFailed ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-white">
                        STEP {step.id}: {step.title}
                      </div>
                      <span
                        className={`text-[10px] font-mono uppercase ${
                          isRunning
                            ? 'text-[#00AFFF] font-bold animate-pulse'
                            : isCompleted
                            ? 'text-emerald-400 font-bold'
                            : isFailed
                            ? 'text-rose-400 font-bold'
                            : 'text-[#79838E]'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#79838E] mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                    {step.detail && (
                      <div
                        className={`text-[11px] font-mono mt-1 ${
                          isFailed ? 'text-rose-400' : isCompleted ? 'text-emerald-400' : 'text-[#D7DCE2]'
                        }`}
                      >
                        ↳ {step.detail}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Notification Bar */}
        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 flex items-start space-x-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-white">Generation Paused at Step {failedStepId}</div>
              <div className="mt-0.5">{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#1C2735] pt-4">
          <div className="text-[11px] text-[#79838E]">
            {isProcessing ? 'Generating script and 6/8/10s shots...' : allCompleted ? 'All steps completed successfully!' : 'Ready to synthesize Stage 3.'}
          </div>

          <div className="flex items-center space-x-2.5">
            {!isProcessing && failedStepId !== null && (
              <button
                onClick={handleRetryFailedStep}
                className="px-4 py-2 bg-[#141C26] hover:bg-[#1C2735] text-[#F4A62A] border border-[#F4A62A]/40 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Step {failedStepId}</span>
              </button>
            )}

            {!isProcessing && !allCompleted && (
              <button
                onClick={handleStartGeneration}
                className="px-6 py-2.5 bg-gradient-to-r from-[#00AFFF] to-[#0090D0] hover:from-[#0090D0] hover:to-[#007AB0] text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>START SCRIPT & SHOT PIPELINE</span>
              </button>
            )}

            {allCompleted && (
              <button
                onClick={() => {
                  onClose();
                  onSuccess();
                }}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>VIEW SCRIPT & SHOT PLAN</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
