import React, { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ContextPanel } from './components/layout/ContextPanel';
import { ModeSelector } from './components/stage1/ModeSelector';
import { ProjectSetupTab } from './components/stage1/ProjectSetupTab';
import { StoryIdeasTab } from './components/stage1/StoryIdeasTab';
import { StoryDevelopmentTab } from './components/stage1/StoryDevelopmentTab';
import { MyStoryTab } from './components/stage1/MyStoryTab';
import { StoryAnalysisTab } from './components/stage1/StoryAnalysisTab';
import { MyScriptTab } from './components/stage1/MyScriptTab';
import { ScriptExtractionTab } from './components/stage1/ScriptExtractionTab';
import { StoryCanonTab } from './components/stage1/StoryCanonTab';
import { CanonAuditTab } from './components/stage1/CanonAuditTab';
import { FinalReviewTab } from './components/stage1/FinalReviewTab';
import { CanonBuilderModal } from './components/stage1/CanonBuilderModal';
import { Stage2Workspace } from './components/stage2/Stage2Workspace';
import { Stage3Workspace } from './components/stage3/Stage3Workspace';
import { Stage4Workspace } from './components/stage4/Stage4Workspace';
import { StagePendingView } from './components/stages/StagePendingView';
import { ProjectDashboard } from './components/dashboard/ProjectDashboard';
import { Phase1Workspace } from './components/phase1/Phase1Workspace';
import { Phase2Workspace } from './components/phase2/Phase2Workspace';
import { Phase3Workspace } from './components/phase3/Phase3Workspace';
import {
  Sliders,
  Sparkles,
  Compass,
  BookOpen,
  FileText,
  Layers,
  ShieldCheck,
  Lock,
  Search,
} from 'lucide-react';

// Error Boundary to prevent black screen renders
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('UI Crash intercepted by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#0B1017] border border-red-500/50 rounded-xl p-8 max-w-lg mx-auto my-12 text-center space-y-4">
          <div className="w-12 h-12 bg-red-950 text-red-400 rounded-xl flex items-center justify-center mx-auto">
            ⚠
          </div>
          <h2 className="font-['Exo_2'] font-bold text-lg text-white">
            Workspace Error
          </h2>
          <p className="text-xs text-[#79838E]">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[#00AFFF] text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Retry Workspace
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainWorkspace: React.FC = () => {
  const { project, activeStage, setActiveStage } = useProject();

  const isPhase2 = activeStage === 'stage2' || activeStage === 'phase2';
  const isPhase3 = activeStage === 'stage4' || activeStage === 'phase3';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070B10]">
      {isPhase2 ? (
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <ErrorBoundary>
            <Phase2Workspace onProceedToPhase3={() => setActiveStage('stage4')} />
          </ErrorBoundary>
        </main>
      ) : isPhase3 ? (
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <ErrorBoundary>
            <Phase3Workspace />
          </ErrorBoundary>
        </main>
      ) : (
        /* Phase 1 Workspace: Brain & Development */
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <ErrorBoundary>
            <Phase1Workspace onProceedToPhase2={() => setActiveStage('stage2')} />
          </ErrorBoundary>
        </main>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { viewMode } = useProject();

  if (viewMode === 'dashboard') {
    return <ProjectDashboard />;
  }

  return (
    <div className="min-h-screen bg-[#070B10] text-[#D7DCE2] flex flex-col font-sans select-none antialiased">
      {/* Top Header */}
      <Header />

      {/* 3-Panel Cinematic Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center Workspace */}
        <MainWorkspace />

        {/* Right Collapsible Context Panel */}
        <ContextPanel />
      </div>
    </div>
  );
};

export function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}

export default App;

