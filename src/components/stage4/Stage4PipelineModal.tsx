import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Film,
  ShieldCheck,
  ChevronRight,
  Database,
  ArrowRight,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiGenerateFlowPrompts, apiAuditStage4 } from '../../services/api';
import { GoogleFlowShotPackage } from '../../types/filmStudio';

interface Stage4PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PipelineStep =
  | 'READY'
  | 'STEP_1_HANDOFF'
  | 'STEP_2_SKELETON'
  | 'STEP_3_SYNTHESIS'
  | 'STEP_7_VALIDATION'
  | 'STEP_8_AUDIT'
  | 'COMPLETE'
  | 'ERROR';

export const Stage4PipelineModal: React.FC<Stage4PipelineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    project,
    setStage4ShotPackages,
    setStage4Audit,
    stage4Tab,
    setStage4Tab,
  } = useProject();

  const [currentStep, setCurrentStep] = useState<PipelineStep>('READY');
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Ready to compile Google Flow prompts.');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedPackages, setGeneratedPackages] = useState<GoogleFlowShotPackage[]>([]);

  const shots = project.stage3.shots || [];
  const scenes = project.stage3.scenes || [];
  const visualStyle = project.visualStyle;
  const styleBible = project.stage2.styleBible;
  const stage2Assets = project.stage2.assets || [];
  const storyCanon = project.storyCanon;

  const totalShotsCount = shots.length;
  const ingredientsCount = shots.filter((s) => s.flowMode === 'INGREDIENTS').length;
  const framesCount = shots.filter((s) => s.flowMode === 'FRAMES').length;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep('READY');
      setProgressPercent(0);
      setErrorMessage(null);
      setStatusMessage(`Ready to transform ${totalShotsCount} approved Stage 3 shots into Google Flow packages.`);
    }
  }, [isOpen, totalShotsCount]);

  if (!isOpen) return null;

  const runPipeline = async () => {
    setErrorMessage(null);

    try {
      // Step 1: Lossless Handoff & Upstream Verification
      setCurrentStep('STEP_1_HANDOFF');
      setProgressPercent(15);
      setStatusMessage(`Step 1: Reading ${totalShotsCount} approved Stage 3 shots and Stage 2 visual assets...`);
      await new Promise((r) => setTimeout(r, 400));

      if (shots.length === 0) {
        throw new Error('No approved Stage 3 shots found. Please finalize Stage 3 Visual Shot Plan first.');
      }

      // Step 2: Package Skeleton & Coverage Reservation
      setCurrentStep('STEP_2_SKELETON');
      setProgressPercent(30);
      setStatusMessage(`Step 2: Pre-allocating exact shot coverage (${ingredientsCount} Ingredients, ${framesCount} Frames)...`);
      await new Promise((r) => setTimeout(r, 400));

      // Step 3-6: Gemini Synthesis Engine
      setCurrentStep('STEP_3_SYNTHESIS');
      setProgressPercent(55);
      setStatusMessage('Steps 3–6: Gemini synthesizing full video prompts, audio lanes, and continuity anchors...');

      const response = await apiGenerateFlowPrompts({
        shots,
        scenes,
        visualStyle,
        styleBible,
        stage2Assets,
        storyCanon: storyCanon!,
        targetSettings: project.stage4.targetSettings,
        settings: project.settings,
        storySourceMode: project.storySourceMode,
      });

      if (!response.success || !response.shotPackages || response.shotPackages.length === 0) {
        throw new Error(response.error || 'Failed to generate Google Flow prompts from Gemini model.');
      }

      const packages = response.shotPackages;
      setGeneratedPackages(packages);
      setStage4ShotPackages(packages);

      // Step 7: Capability & Readiness Validation
      setCurrentStep('STEP_7_VALIDATION');
      setProgressPercent(80);
      setStatusMessage('Step 7: Validating 6s/8s/10s duration compliance and asset checklist readiness...');
      await new Promise((r) => setTimeout(r, 400));

      // Step 8: Comprehensive Stage 4 Production Audit
      setCurrentStep('STEP_8_AUDIT');
      setProgressPercent(95);
      setStatusMessage('Step 8: Compiling production audit and continuity validation...');

      const auditRes = await apiAuditStage4({
        shotPackages: packages,
        shots,
        storyCanon: storyCanon!,
        storySourceMode: project.storySourceMode,
        importedScript: project.importedScript,
        stage2Assets,
        styleBible,
      });

      if (auditRes.success && auditRes.audit) {
        setStage4Audit(auditRes.audit);
      }

      // Complete!
      setCurrentStep('COMPLETE');
      setProgressPercent(100);
      setStatusMessage(`Successfully generated ${packages.length} complete Google Flow video prompt packages!`);
    } catch (err: any) {
      console.error('Stage 4 compilation failed:', err);
      setCurrentStep('ERROR');
      setErrorMessage(
        err?.message ||
          'Generation interrupted by model service. Any completed work was saved. You can retry safely.'
      );
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0">
        {/* Header */}
        <div className="bg-[#111820] border-b border-[#1C2735] p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00AFFF]/15 border border-[#00AFFF]/30 flex items-center justify-center text-[#00AFFF]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#00AFFF] uppercase tracking-wider">
                STAGE 4 COMPILATION ENGINE
              </span>
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                Build Google Flow Production Prompts
              </h3>
            </div>
          </div>
          {currentStep !== 'STEP_3_SYNTHESIS' && (
            <button
              onClick={onClose}
              className="text-[#79838E] hover:text-white p-2 rounded-lg hover:bg-[#1C2735] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[#D7DCE2]">{statusMessage}</span>
              <span className="font-mono text-[#00AFFF]">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-[#141C26] rounded-full overflow-hidden border border-[#1C2735]">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  currentStep === 'ERROR'
                    ? 'bg-red-500'
                    : currentStep === 'COMPLETE'
                    ? 'bg-emerald-400'
                    : 'bg-gradient-to-r from-[#00AFFF] to-blue-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Upstream Snapshot Data Overview */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">
                Total Planned Shots
              </span>
              <span className="font-mono text-base font-bold text-white">
                {totalShotsCount}
              </span>
              <span className="text-[10px] text-[#79838E] block">
                Duration: 6s / 8s / 10s strictly
              </span>
            </div>

            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">
                Ingredients Route
              </span>
              <span className="font-mono text-base font-bold text-[#F4A62A]">
                {ingredientsCount}
              </span>
              <span className="text-[10px] text-[#79838E] block">
                With Stage 2 Asset Checklists
              </span>
            </div>

            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-[#79838E] uppercase tracking-wider block">
                Frames Route
              </span>
              <span className="font-mono text-base font-bold text-indigo-300">
                {framesCount}
              </span>
              <span className="text-[10px] text-[#79838E] block">
                Keyframe + Motion Prompts
              </span>
            </div>
          </div>

          {/* Pipeline Step Sequence Checklist */}
          <div className="bg-[#0E141D] border border-[#1C2735] rounded-xl p-4 space-y-2 text-xs">
            <span className="text-[10px] font-bold text-[#79838E] uppercase tracking-wider block">
              Execution Architecture
            </span>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center space-x-2 text-[#D7DCE2]">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    progressPercent >= 15 ? 'text-emerald-400' : 'text-[#79838E]'
                  }`}
                />
                <span>Step 1: Lossless Handoff of All Stage 3 Shots</span>
              </div>
              <div className="flex items-center space-x-2 text-[#D7DCE2]">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    progressPercent >= 30 ? 'text-emerald-400' : 'text-[#79838E]'
                  }`}
                />
                <span>Step 2: Reserve Exact 1:1 Package Records</span>
              </div>
              <div className="flex items-center space-x-2 text-[#D7DCE2]">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    progressPercent >= 55 ? 'text-emerald-400' : 'text-[#79838E]'
                  }`}
                />
                <span>Steps 3–6: Full Prompt Synthesis (Motion, Dialogue, Audio Lanes, Continuity)</span>
              </div>
              <div className="flex items-center space-x-2 text-[#D7DCE2]">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    progressPercent >= 80 ? 'text-emerald-400' : 'text-[#79838E]'
                  }`}
                />
                <span>Step 7: Readiness & Capability Validation</span>
              </div>
              <div className="flex items-center space-x-2 text-[#D7DCE2]">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    progressPercent >= 95 ? 'text-emerald-400' : 'text-[#79838E]'
                  }`}
                />
                <span>Step 8: Automated Continuity & Coverage Audit</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-950/60 border border-red-500/50 rounded-xl flex items-start space-x-3 text-xs text-red-200">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-bold block text-red-300">Generation Alert</span>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#111820] border-t border-[#1C2735] p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={currentStep === 'STEP_3_SYNTHESIS'}
            className="px-4 py-2 text-xs font-semibold text-[#79838E] hover:text-white rounded-lg hover:bg-[#1C2735] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          {currentStep === 'READY' && (
            <button
              onClick={runPipeline}
              className="px-6 py-2.5 bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0090D0] hover:to-blue-700 text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Compile Google Flow Prompts</span>
            </button>
          )}

          {currentStep === 'ERROR' && (
            <button
              onClick={runPipeline}
              className="px-6 py-2.5 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-[#00AFFF]/25 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Generation</span>
            </button>
          )}

          {currentStep === 'COMPLETE' && (
            <button
              onClick={handleFinish}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <span>View Generation Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {currentStep !== 'READY' && currentStep !== 'ERROR' && currentStep !== 'COMPLETE' && (
            <div className="flex items-center space-x-2 text-xs text-[#00AFFF]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generating with Gemini...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
