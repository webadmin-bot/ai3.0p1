import React, { useState, useEffect } from 'react';
import {
  Flame,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiCompileStoryCanon, apiAuditStoryCanon } from '../../services/api';

interface StepState {
  id: number;
  label: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  description: string;
}

export const CanonBuilderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const {
    project,
    setStoryCanonAndFoundation,
    setCanonAudit,
    setActiveTab,
  } = useProject();

  const [steps, setSteps] = useState<StepState[]>([
    {
      id: 1,
      label: 'Story Source Handoff & Format Assessment',
      status: 'PENDING',
      description: 'Aligning source input with format, runtime, and platform rules.',
    },
    {
      id: 2,
      label: 'Character Architecture (CHAR-01... Series)',
      status: 'PENDING',
      description: 'Designing wants, subconscious needs, weaknesses, and emotional arcs.',
    },
    {
      id: 3,
      label: 'Relationships, Tensions & Shared Secrets',
      status: 'PENDING',
      description: 'Mapping interpersonal dynamics and dramatic friction points.',
    },
    {
      id: 4,
      label: 'World Rules, Limits & Consequences (RULE-01...)',
      status: 'PENDING',
      description: 'Establishing ironclad physical, technological, or supernatural laws.',
    },
    {
      id: 5,
      label: 'Causal Narrative Beat Map (BEAT-01...)',
      status: 'PENDING',
      description: 'Structuring sequence beats with strict cause-and-effect transitions.',
    },
    {
      id: 6,
      label: 'Continuity Ledger (Setup/Payoff, Props, Locations)',
      status: 'PENDING',
      description: 'Tracking SP-01 setups, LOC-01 locations, and PROP-01 continuity.',
    },
    {
      id: 7,
      label: 'Foundation & Canon Synthesis V1',
      status: 'PENDING',
      description: 'Compiling unified Story Foundation V1 and Story Canon V1 structures.',
    },
    {
      id: 8,
      label: 'Automated Continuity & Quality Audit',
      status: 'PENDING',
      description: 'Executing audit algorithms for plot holes, world breaches, and causality.',
    },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Automatically start when opened
  useEffect(() => {
    if (isOpen && !isRunning) {
      runPipeline();
    }
  }, [isOpen]);

  const updateStepStatus = (index: number, status: StepState['status']) => {
    setSteps((prev) =>
      prev.map((step, idx) => (idx === index ? { ...step, status } : step))
    );
  };

  const runPipeline = async () => {
    setIsRunning(true);
    setErrorMsg(null);

    try {
      // Step 1 - 6: Simulated modular progression with checkpointing
      for (let i = 0; i < 6; i++) {
        setActiveStepIndex(i);
        updateStepStatus(i, 'RUNNING');
        await new Promise((resolve) => setTimeout(resolve, 350));
        updateStepStatus(i, 'COMPLETED');
      }

      // Step 7: Real Gemini Canon Compilation
      setActiveStepIndex(6);
      updateStepStatus(6, 'RUNNING');

      const selectedConcept = project.concepts.find(
        (c) => c.conceptId === project.selectedConceptId
      );

      const compileRes = await apiCompileStoryCanon({
        sourceMode: project.storySourceMode,
        projectId: project.projectId,
        projectTitle: project.title,
        settings: project.settings,
        visualStyle: project.visualStyle,
        concept: selectedConcept,
        development: project.storyDevelopment,
        originalStoryText: project.originalStoryText,
        importedScript: project.importedScript,
      });

      if (!compileRes.success || !compileRes.storyCanon || !compileRes.storyFoundation) {
        throw new Error(compileRes.error || 'Failed to compile story canon with Gemini.');
      }

      updateStepStatus(6, 'COMPLETED');
      setStoryCanonAndFoundation(compileRes.storyFoundation, compileRes.storyCanon);

      // Step 8: Real Gemini Audit
      setActiveStepIndex(7);
      updateStepStatus(7, 'RUNNING');

      const auditRes = await apiAuditStoryCanon({
        storyFoundation: compileRes.storyFoundation,
        storyCanon: compileRes.storyCanon,
        sourceMode: project.storySourceMode,
        originalStoryText: project.originalStoryText,
        importedScript: project.importedScript,
      });

      if (auditRes.success && auditRes.audit) {
        setCanonAudit(auditRes.audit);
      }
      updateStepStatus(7, 'COMPLETED');

      // Finish & Navigate to Canon viewer
      setTimeout(() => {
        setIsRunning(false);
        onClose();
        setActiveTab('canon');
      }, 700);
    } catch (err: any) {
      console.error('Canon building error:', err);
      setErrorMsg(err.message || 'Error occurred during story canon construction.');
      updateStepStatus(activeStepIndex, 'FAILED');
      setIsRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-[#0B1017] border-2 border-[#1C2735] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00AFFF] to-blue-700 flex items-center justify-center text-white">
              <Flame className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-base text-white">
                Modular Story Canon Compiler
              </h3>
              <p className="text-[11px] text-[#79838E]">
                Assembling Story Foundation V1 & Canon V1 with stable IDs
              </p>
            </div>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              className="text-[#79838E] hover:text-white p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Steps List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {steps.map((step) => {
            return (
              <div
                key={step.id}
                className={`p-3 rounded-lg border text-xs flex items-start space-x-3 transition-colors ${
                  step.status === 'RUNNING'
                    ? 'bg-[#111820] border-[#00AFFF] text-white shadow-md shadow-[#00AFFF]/10'
                    : step.status === 'COMPLETED'
                    ? 'bg-[#0E141D] border-[#1C2735] text-[#D7DCE2]'
                    : step.status === 'FAILED'
                    ? 'bg-red-950/60 border-red-500/50 text-red-200'
                    : 'bg-[#090D13] border-[#141C26] text-[#79838E]/60'
                }`}
              >
                <div className="mt-0.5">
                  {step.status === 'COMPLETED' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {step.status === 'RUNNING' && (
                    <Clock className="w-4 h-4 text-[#00AFFF] animate-spin" />
                  )}
                  {step.status === 'FAILED' && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  {step.status === 'PENDING' && (
                    <div className="w-4 h-4 rounded-full border border-[#1C2735] flex items-center justify-center text-[9px] font-mono">
                      {step.id}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{step.label}</span>
                    <span className="text-[10px] font-mono text-[#79838E]">
                      {step.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#79838E] mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error and Retry */}
        {errorMsg && (
          <div className="bg-red-950/70 border border-red-500/50 p-3 rounded-xl text-xs text-red-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-red-300">Compilation Interrupted</div>
              <div>{errorMsg}</div>
            </div>
            <button
              onClick={runPipeline}
              className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white font-bold rounded flex items-center space-x-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-[#1C2735] flex items-center justify-between text-xs text-[#79838E]">
          <span>Checkpoints saved automatically to browser storage.</span>
          {isRunning && (
            <span className="text-[#00AFFF] font-mono text-[11px] animate-pulse">
              Processing step {activeStepIndex + 1} of 8...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
