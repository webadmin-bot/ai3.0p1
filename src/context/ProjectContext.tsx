import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  AuditIssue,
  CinematicShot,
  ImportedScript,
  MasterVisualStyle,
  OwnStoryAnalysis,
  ProductionScript,
  Project,
  ProjectSettings,
  ProjectSummary,
  MigrationReport,
  AppViewMode,
  ScriptScene,
  ScriptSettings,
  Stage2Audit,
  Stage2AuditIssue,
  Stage3Audit,
  Stage3AuditIssue,
  Stage3TabId,
  Stage4Audit,
  Stage4AuditIssue,
  Stage4TabId,
  StageId,
  StoryCanon,
  StoryConcept,
  StoryDevelopment,
  StoryFoundation,
  StorySourceMode,
  VisualAsset,
  VisualStyleBible,
  VisualShotPlan,
  GoogleFlowShotPackage,
  GoogleFlowProductionPackage,
  MediaReference,
  PhaseId,
  Phase1StepId,
  Phase1WorkflowState,
  ProjectNavigationState,
  ApprovedPhase1Snapshot,
  ApprovedPhase2Snapshot,
  NicheResearchState,
  BrainAuditIssue,
  BrainAuditReport,
  AudioContinuitySheet,
  SpeechLineRecord,
} from '../types/filmStudio';
import {
  checkStage1ApprovalGate,
  deriveAuditSummary,
  normalizeAuditIssue,
} from '../services/canonAuditEngine';
import { compileAudioContinuitySheet } from '../services/audioContinuityEngine';
import { runDeterministicBrainAudit, applyBrainAuditQuickFix } from '../services/brainAuditEngine';
import { hydrateProjectMedia } from '../services/persistence';
import { saveMediaItem } from '../services/mediaStore';
import { createDefaultProject } from '../services/defaultProject';
import {
  getSynchronousIndex,
  loadProjectIndex,
  loadProjectById,
  saveProjectRecord,
  createAndSaveNewProject,
  renameProjectRecord,
  duplicateProjectRecord,
  deleteProjectRecord,
  migrateLegacyProjectIfNeeded,
  exportSingleProjectJson,
  exportAllProjectsBackupJson,
  importProjectFromJsonString,
  ACTIVE_PROJECT_KEY,
} from '../services/projectStorage';

interface ModeSwitchPrompt {
  targetMode: StorySourceMode;
  isOpen: boolean;
}

interface ProjectContextValue {
  // Navigation & Multi-project state
  viewMode: AppViewMode;
  setViewMode: (mode: AppViewMode) => void;
  projectList: ProjectSummary[];
  migrationReport: MigrationReport | null;
  createNewProject: (title?: string, settings?: Partial<ProjectSettings>) => Promise<Project>;
  openProject: (projectId: string) => Promise<boolean>;
  renameProject: (projectId: string, newTitle: string) => Promise<boolean>;
  duplicateProject: (projectId: string) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<boolean>;
  exportSingleProject: (projectId?: string) => Promise<void>;
  exportStudioBackup: () => Promise<void>;
  importProjectFromFile: (jsonString: string) => Promise<{ success: boolean; project?: Project; error?: string }>;
  flushSave: () => Promise<boolean>;

  // Active Project Workspace state
  project: Project;
  activeStage: StageId;
  activePhase: PhaseId;
  activeTab: string;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  storageError: string | null;
  modeSwitchPrompt: ModeSwitchPrompt;
  setActiveStage: (stage: StageId) => void;
  setActivePhase: (phase: PhaseId) => void;
  setActiveTab: (tab: string) => void;
  updateNicheResearch: (updates: Partial<NicheResearchState>) => void;
  updatePhase1Workflow: (updates: Partial<Phase1WorkflowState>) => void;
  setPhase1Step: (step: Phase1StepId) => void;
  markPhase1StepCompleted: (step: Phase1StepId, nextStep?: Phase1StepId) => void;
  resetPhase1Workflow: () => void;
  setStorySourceMode: (mode: StorySourceMode) => void;
  confirmModeSwitch: () => void;
  cancelModeSwitch: () => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  updateVisualStyle: (style: MasterVisualStyle) => void;
  updateOriginalStoryText: (text: string) => void;
  updateImportedScript: (script: ImportedScript | null) => void;
  setConcepts: (concepts: StoryConcept[]) => void;
  selectConceptId: (id: string | null) => void;
  setStoryDevelopment: (development: StoryDevelopment | null) => void;
  setStoryAnalysis: (analysis: OwnStoryAnalysis | null) => void;
  setStoryCanonAndFoundation: (foundation: StoryFoundation, canon: StoryCanon) => void;
  updateStoryCanon: (canon: StoryCanon, markNeedsReaudit?: boolean) => void;
  setCanonAudit: (audit: any) => void;
  updateCanonAuditIssue: (issueId: string, updates: Partial<AuditIssue>) => void;
  stage2Tab: string;
  setStage2Tab: (tab: string) => void;
  setStyleBible: (styleBible: VisualStyleBible) => void;
  updateStyleBible: (updates: Partial<VisualStyleBible>) => void;
  setStage2Assets: (assets: VisualAsset[]) => void;
  updateStage2Asset: (assetId: string, updates: Partial<VisualAsset>) => void;
  setStage2Audit: (audit: Stage2Audit) => void;
  updateStage2AuditIssue: (issueId: string, updates: Partial<Stage2AuditIssue>) => void;
  attachReferenceImageToAsset: (assetId: string, dataUrl: string, fileName: string) => void;
  removeReferenceImageFromAsset: (assetId: string) => void;
  approveAndLockStage2: () => boolean;
  unlockStage2ForRevision: () => void;
  stage3Tab: Stage3TabId;
  setStage3Tab: (tab: Stage3TabId) => void;
  updateScriptSettings: (settings: Partial<ScriptSettings>) => void;
  setStage3Scenes: (scenes: ScriptScene[]) => void;
  updateStage3Scene: (sceneId: string, updates: Partial<ScriptScene>) => void;
  setStage3Shots: (shots: CinematicShot[]) => void;
  updateStage3Shot: (shotId: string, updates: Partial<CinematicShot>) => void;
  attachImageToShot: (shotId: string, dataUrl: string, fileName?: string, frameTarget?: 'first' | 'end') => void;
  removeImageFromShot: (shotId: string, frameTarget?: 'first' | 'end') => void;
  setStage3Audit: (audit: Stage3Audit) => void;
  updateStage3AuditIssue: (issueId: string, updates: Partial<Stage3AuditIssue>) => void;
  approveAndLockStage3: () => boolean;
  unlockStage3ForRevision: () => void;
  stage4Tab: Stage4TabId;
  setStage4Tab: (tab: Stage4TabId) => void;
  setStage4ShotPackages: (packages: GoogleFlowShotPackage[]) => void;
  updateStage4ShotPackage: (shotId: string, updates: Partial<GoogleFlowShotPackage>) => void;
  updateStage4TargetSettings: (settings: { targetModel: string; capabilityVerified: boolean }) => void;
  setStage4Audit: (audit: Stage4Audit) => void;
  updateStage4AuditIssue: (issueId: string, updates: Partial<Stage4AuditIssue>) => void;
  approveAndLockStage4: () => boolean;
  unlockStage4ForRevision: () => void;
  approveAndLockStage1: () => boolean;
  unlockStage1ForRevision: () => void;
  reviseApprovedPhase1: (reason?: string) => Promise<boolean>;
  reviseApprovedPhase2: (reason?: string) => Promise<boolean>;
  isPhase1Locked: boolean;
  isPhase2Locked: boolean;
  retrySave: () => Promise<boolean>;
  // Phase 1 Universal Brain Audit & Audio Continuity Architecture
  runBrainAuditTechnical: () => BrainAuditReport;
  runBrainAuditCreative: () => Promise<BrainAuditReport>;
  applyBrainAuditFix: (issueId: string) => boolean;
  updateBrainAuditIssue: (issueId: string, updates: Partial<BrainAuditIssue>) => void;
  reassignSpeechLine: (lineId: string, targetShotId: string | null, markEditorialVo?: boolean) => void;
  confirmSourceAdaptation: () => void;
  syncAudioContinuity: () => AudioContinuitySheet;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation: Dashboard is the default landing page
  const [viewMode, setViewModeState] = useState<AppViewMode>('dashboard');
  const [projectList, setProjectList] = useState<ProjectSummary[]>(() => getSynchronousIndex());
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);

  // Active workspace state
  const [project, setProject] = useState<Project>(() => createDefaultProject());
  const [activeStage, setActiveStage] = useState<StageId>('stage1');
  const [activeTab, setActiveTab] = useState<string>('setup');
  const [stage2Tab, setStage2Tab] = useState<string>('styleBible');
  const [stage3Tab, setStage3Tab] = useState<Stage3TabId>('scenes');
  const [stage4Tab, setStage4Tab] = useState<Stage4TabId>('queue');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [storageError, setStorageError] = useState<string | null>(null);
  const [modeSwitchPrompt, setModeSwitchPrompt] = useState<ModeSwitchPrompt>({
    targetMode: 'AI_CONCEPT',
    isOpen: false,
  });

  const projectRef = useRef<Project>(project);
  projectRef.current = project;
  const lastEditTimestampRef = useRef<number>(Date.now());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initial Boot & Legacy Migration
  useEffect(() => {
    let mounted = true;

    async function initApp() {
      // 1. Safely run legacy migration idempotently
      const rep = await migrateLegacyProjectIfNeeded();
      if (mounted) setMigrationReport(rep);

      // 2. Load latest index
      const index = getSynchronousIndex();
      if (mounted) setProjectList(index);

      // 3. Preload active project if saved
      const savedActiveId = localStorage.getItem(ACTIVE_PROJECT_KEY);
      const targetId = savedActiveId || (index.length > 0 ? index[0].id : null);

      if (targetId) {
        const loaded = await loadProjectById(targetId);
        if (loaded && mounted) {
          setProject(loaded);
          projectRef.current = loaded;

          // Restore active phase and stage according to saved navigationState or project progress
          const nav = loaded.navigationState;
          const targetPhase: PhaseId = nav?.activePhase || loaded.activePhase || (
            loaded.stage4?.locked || (loaded.stage4?.unlocked && loaded.stage4?.shotPackages?.length) ? 'phase3' :
            loaded.stage2?.locked || (loaded.stage2?.unlocked && loaded.stage2?.assets?.length) ? 'phase2' :
            'phase1'
          );

          if (targetPhase === 'phase3') setActiveStage('stage4');
          else if (targetPhase === 'phase2') setActiveStage('stage2');
          else setActiveStage('stage1');

          const targetStep = nav?.phase1Step || loaded.phase1Workflow?.currentStep || (loaded.stage1?.locked ? 'brain_audit' : 'setup');
          setActiveTab(targetStep);
          if (nav?.phase2Tab) setStage2Tab(nav.phase2Tab);
          if (nav?.phase3Tab) setStage4Tab(nav.phase3Tab as Stage4TabId);

          setSaveStatus('saved');
          setStorageError(null);
        }
      }
    }

    initApp();

    return () => {
      mounted = false;
    };
  }, []);

  // Synchronous / Immediate flush save
  const flushSave = useCallback(async (): Promise<boolean> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const currentProj = projectRef.current;
    const saveTime = lastEditTimestampRef.current;
    setSaveStatus('saving');
    try {
      const res = await saveProjectRecord(currentProj, { writeTimestamp: saveTime });
      if (res.success) {
        if (lastEditTimestampRef.current === saveTime) {
          setSaveStatus('saved');
          setStorageError(null);
        }
        setProjectList(getSynchronousIndex());
        return true;
      } else {
        setSaveStatus('error');
        setStorageError(res.error || 'Failed to save project.');
        return false;
      }
    } catch (err: any) {
      setSaveStatus('error');
      setStorageError(err?.message || 'Storage save failed.');
      return false;
    }
  }, []);

  // Retry save exposed to UI
  const retrySave = useCallback(async (): Promise<boolean> => {
    return await flushSave();
  }, [flushSave]);

  // Set view mode with safety flush
  const setViewMode = useCallback(
    async (mode: AppViewMode) => {
      if (mode === 'dashboard' && saveStatus === 'unsaved') {
        const ok = await flushSave();
        if (!ok) {
          console.warn('[ProjectContext] Save failed before returning to dashboard.');
          return;
        }
      }
      setViewModeState(mode);
    },
    [saveStatus, flushSave]
  );

  // Auto-save debounce when working in workspace
  useEffect(() => {
    if (viewMode === 'dashboard') return;

    lastEditTimestampRef.current = Date.now();
    const thisEditTimestamp = lastEditTimestampRef.current;
    setSaveStatus('unsaved');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await saveProjectRecord(project, { writeTimestamp: thisEditTimestamp });
        if (res.success) {
          if (lastEditTimestampRef.current === thisEditTimestamp) {
            setSaveStatus('saved');
            setStorageError(null);
          }
          setProjectList(getSynchronousIndex());
        } else {
          setSaveStatus('error');
          setStorageError(res.error || 'Failed to save project to browser storage.');
        }
      } catch (err: any) {
        setSaveStatus('error');
        setStorageError(err?.message || 'Failed to persist changes.');
      }
    }, 600);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [project, viewMode]);

  // Create an independent new project
  const createNewProject = useCallback(
    async (title?: string, settings?: Partial<ProjectSettings>): Promise<Project> => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (saveStatus === 'unsaved') {
        const ok = await flushSave();
        if (!ok) {
          console.warn('[ProjectContext] Failed to save current project before creating new project.');
        }
      }

      const newProj = await createAndSaveNewProject(title, settings);
      setProject(newProj);
      projectRef.current = newProj;
      lastEditTimestampRef.current = Date.now();
      setActiveStage('stage1');
      setActiveTab('setup');
      setStage2Tab('style');
      setStage4Tab('queue');
      setProjectList(getSynchronousIndex());
      setSaveStatus('saved');
      setStorageError(null);
      setViewModeState('workspace');
      return newProj;
    },
    [saveStatus, flushSave]
  );

  // Open an existing project by ID
  const openProject = useCallback(
    async (projectId: string): Promise<boolean> => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (saveStatus === 'unsaved') {
        const ok = await flushSave();
        if (!ok) {
          console.warn('[ProjectContext] Failed to save current project before opening another.');
          return false;
        }
      }

      const loaded = await loadProjectById(projectId);
      if (!loaded) return false;

      setProject(loaded);
      projectRef.current = loaded;
      lastEditTimestampRef.current = Date.now();
      localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);

      // Restore active phase, stage, and tab according to saved navigation state
      const nav = loaded.navigationState;
      const targetPhase: PhaseId = nav?.activePhase || loaded.activePhase || (
        loaded.stage4?.locked || (loaded.stage4?.unlocked && loaded.stage4?.shotPackages?.length) ? 'phase3' :
        loaded.stage2?.locked || (loaded.stage2?.unlocked && loaded.stage2?.assets?.length) ? 'phase2' :
        'phase1'
      );

      if (targetPhase === 'phase3') setActiveStage('stage4');
      else if (targetPhase === 'phase2') setActiveStage('stage2');
      else setActiveStage('stage1');

      const targetStep = nav?.phase1Step || loaded.phase1Workflow?.currentStep || (loaded.stage1?.locked ? 'brain_audit' : 'setup');
      setActiveTab(targetStep);
      if (nav?.phase2Tab) setStage2Tab(nav.phase2Tab);
      if (nav?.phase3Tab) setStage4Tab(nav.phase3Tab as Stage4TabId);

      setSaveStatus('saved');
      setStorageError(null);
      setViewModeState('workspace');
      return true;
    },
    [saveStatus, flushSave]
  );

  // Rename a project
  const renameProject = useCallback(
    async (projectId: string, newTitle: string): Promise<boolean> => {
      const ok = await renameProjectRecord(projectId, newTitle);
      if (ok) {
        setProjectList(getSynchronousIndex());
        if (project.projectId === projectId) {
          setProject((prev) => ({ ...prev, title: newTitle.trim() }));
        }
      }
      return ok;
    },
    [project.projectId]
  );

  // Duplicate a project
  const duplicateProject = useCallback(
    async (projectId: string): Promise<Project | null> => {
      const copy = await duplicateProjectRecord(projectId);
      if (copy) {
        setProjectList(getSynchronousIndex());
      }
      return copy;
    },
    []
  );

  // Delete a project
  const deleteProject = useCallback(
    async (projectId: string): Promise<boolean> => {
      const ok = await deleteProjectRecord(projectId);
      if (ok) {
        const updated = getSynchronousIndex();
        setProjectList(updated);
        if (project.projectId === projectId) {
          if (updated.length > 0) {
            const next = await loadProjectById(updated[0].id);
            if (next) setProject(next);
          } else {
            setProject(createDefaultProject());
          }
          setViewModeState('dashboard');
        }
      }
      return ok;
    },
    [project.projectId]
  );

  // Export single project
  const exportSingleProject = useCallback(
    async (projectId?: string) => {
      if (projectId && projectId !== project.projectId) {
        const target = await loadProjectById(projectId);
        if (target) {
          await exportSingleProjectJson(target);
          return;
        }
      }
      await exportSingleProjectJson(project);
    },
    [project]
  );

  // Export all projects studio backup
  const exportStudioBackup = useCallback(async () => {
    await exportAllProjectsBackupJson();
  }, []);

  // Import project JSON
  const importProjectFromFile = useCallback(
    async (jsonString: string): Promise<{ success: boolean; project?: Project; error?: string }> => {
      const res = await importProjectFromJsonString(jsonString);
      if (res.success && res.project) {
        setProjectList(getSynchronousIndex());
        setProject(res.project);
        localStorage.setItem(ACTIVE_PROJECT_KEY, res.project.projectId);
        setViewModeState('workspace');
      }
      return res;
    },
    []
  );

  // Mode switching with safety confirmation
  const setStorySourceMode = useCallback(
    (targetMode: StorySourceMode) => {
      if (targetMode === project.storySourceMode) return;

      let hasData = false;
      if (project.storySourceMode === 'AI_CONCEPT' && project.concepts.length > 0) {
        hasData = true;
      } else if (project.storySourceMode === 'OWN_STORY' && project.originalStoryText.trim().length > 0) {
        hasData = true;
      } else if (project.storySourceMode === 'OWN_SCRIPT' && project.importedScript !== null) {
        hasData = true;
      }

      if (hasData) {
        setModeSwitchPrompt({ targetMode, isOpen: true });
      } else {
        applyModeSwitch(targetMode);
      }
    },
    [project.storySourceMode, project.concepts, project.originalStoryText, project.importedScript]
  );

  const applyModeSwitch = useCallback((targetMode: StorySourceMode) => {
    setProject((prev) => {
      const updatedDrafts = { ...prev.sourceDrafts };
      if (prev.storySourceMode === 'AI_CONCEPT') {
        updatedDrafts.AI_CONCEPT = {
          concepts: prev.concepts,
          selectedConceptId: prev.selectedConceptId,
          development: prev.storyDevelopment,
        };
      } else if (prev.storySourceMode === 'OWN_STORY') {
        updatedDrafts.OWN_STORY = {
          text: prev.originalStoryText,
          analysis: prev.sourceDrafts.OWN_STORY?.analysis || null,
        };
      } else if (prev.storySourceMode === 'OWN_SCRIPT') {
        updatedDrafts.OWN_SCRIPT = {
          script: prev.importedScript,
        };
      }

      let restoredConcepts = prev.concepts;
      let restoredSelectedConceptId = prev.selectedConceptId;
      let restoredDevelopment = prev.storyDevelopment;
      let restoredStoryText = prev.originalStoryText;
      let restoredScript = prev.importedScript;

      if (targetMode === 'AI_CONCEPT') {
        restoredConcepts = updatedDrafts.AI_CONCEPT.concepts;
        restoredSelectedConceptId = updatedDrafts.AI_CONCEPT.selectedConceptId;
        restoredDevelopment = updatedDrafts.AI_CONCEPT.development;
      } else if (targetMode === 'OWN_STORY') {
        restoredStoryText = updatedDrafts.OWN_STORY.text;
      } else if (targetMode === 'OWN_SCRIPT') {
        restoredScript = updatedDrafts.OWN_SCRIPT.script;
      }

      return {
        ...prev,
        storySourceMode: targetMode,
        sourceDrafts: updatedDrafts,
        concepts: restoredConcepts,
        selectedConceptId: restoredSelectedConceptId,
        storyDevelopment: restoredDevelopment,
        originalStoryText: restoredStoryText,
        importedScript: restoredScript,
        stage1: {
          ...prev.stage1,
          dirty: true,
        },
      };
    });

    setModeSwitchPrompt({ targetMode, isOpen: false });
    setActiveTab('setup');
  }, []);

  const confirmModeSwitch = useCallback(() => {
    applyModeSwitch(modeSwitchPrompt.targetMode);
  }, [applyModeSwitch, modeSwitchPrompt.targetMode]);

  const cancelModeSwitch = useCallback(() => {
    setModeSwitchPrompt((prev) => ({ ...prev, isOpen: false }));
  }, []);
  const activePhase: PhaseId =
    activeStage === 'stage4' || activeStage === 'phase3'
      ? 'phase3'
      : activeStage === 'stage2' || activeStage === 'phase2'
      ? 'phase2'
      : 'phase1';

  const isPhase1Locked = Boolean(project.stage1?.locked);
  const isPhase2Locked = Boolean(project.stage2?.locked);

  const setActivePhase = useCallback((phase: PhaseId) => {
    if (phase === 'phase1') setActiveStage('stage1');
    else if (phase === 'phase2') setActiveStage('stage2');
    else if (phase === 'phase3') setActiveStage('stage4');

    setProject((prev) => {
      const nav: ProjectNavigationState = {
        ...(prev.navigationState || {
          phase1Step: 'setup',
          phase2Tab: 'style',
          phase3Tab: 'board',
        }),
        activePhase: phase,
        associatedProjectId: prev.projectId,
        lastVisitedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        activePhase: phase,
        navigationState: nav,
      };
    });
  }, []);

  const updateNicheResearch = useCallback((updates: Partial<NicheResearchState>) => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Mutation blocked at data level.');
        return prev;
      }
      const base: NicheResearchState = prev.nicheResearch || {
        connected: false,
        dataSourceNotice: 'YouTube Data API key not configured on server',
        selectedPlatform: 'YouTube Shorts',
        keyword: '',
        region: 'US',
        language: 'English',
        timeframe: '30d',
        contentType: 'shorts',
        minViews: 10000,
        searchResults: [],
        opportunityAnalysis: null,
        discoveredNiches: [],
        isSearching: false,
        isAnalyzing: false,
      };
      return {
        ...prev,
        nicheResearch: {
          ...base,
          ...updates,
        },
      };
    });
  }, []);

  // Update Phase 1 Guided Workflow State
  const updatePhase1Workflow = useCallback((updates: Partial<Phase1WorkflowState>) => {
    setProject((prev) => {
      const base: Phase1WorkflowState = prev.phase1Workflow || {
        currentStep: 'setup',
        completedSteps: [],
        setupConfirmed: false,
        selectedStartingMode: prev.storySourceMode || 'AI_CONCEPT',
        stepStatus: {
          setup: 'in_progress',
          discover_niches: 'pending',
          research_niche: 'pending',
          concepts: 'pending',
          own_story_review: 'pending',
          screenplay: 'pending',
          shot_list: 'pending',
        },
      };

      const updated: Phase1WorkflowState = {
        ...base,
        ...updates,
        stepStatus: {
          ...base.stepStatus,
          ...(updates.stepStatus || {}),
        },
      };

      return {
        ...prev,
        phase1Workflow: updated,
      };
    });
  }, []);

  const setPhase1Step = useCallback((step: Phase1StepId) => {
    setActiveTab(step);
    setProject((prev) => {
      const base: Phase1WorkflowState = prev.phase1Workflow || {
        currentStep: 'setup',
        completedSteps: [],
        setupConfirmed: false,
        selectedStartingMode: prev.storySourceMode || 'AI_CONCEPT',
        stepStatus: {
          setup: 'in_progress',
          discover_niches: 'pending',
          research_niche: 'pending',
          concepts: 'pending',
          own_story_review: 'pending',
          screenplay: 'pending',
          shot_list: 'pending',
        },
      };

      const nav: ProjectNavigationState = {
        ...(prev.navigationState || {
          activePhase: 'phase1',
          phase2Tab: 'style',
          phase3Tab: 'board',
        }),
        phase1Step: step,
        associatedProjectId: prev.projectId,
        lastVisitedAt: new Date().toISOString(),
      };

      return {
        ...prev,
        navigationState: nav,
        phase1Workflow: {
          ...base,
          currentStep: step,
        },
      };
    });
  }, []);

  const markPhase1StepCompleted = useCallback((step: Phase1StepId, nextStep?: Phase1StepId) => {
    setProject((prev) => {
      const base: Phase1WorkflowState = prev.phase1Workflow || {
        currentStep: 'setup',
        completedSteps: [],
        setupConfirmed: false,
        selectedStartingMode: prev.storySourceMode || 'AI_CONCEPT',
        stepStatus: {
          setup: 'in_progress',
          discover_niches: 'pending',
          research_niche: 'pending',
          concepts: 'pending',
          own_story_review: 'pending',
          screenplay: 'pending',
          shot_list: 'pending',
        },
      };

      const completedSet = new Set(base.completedSteps || []);
      completedSet.add(step);

      const updatedStatus = {
        ...base.stepStatus,
        [step]: 'completed' as const,
      };

      if (nextStep && updatedStatus[nextStep] !== 'completed') {
        updatedStatus[nextStep] = 'in_progress' as const;
      }

      const nextTarget = nextStep || base.currentStep;
      if (nextTarget) {
        setActiveTab(nextTarget);
      }

      const nav: ProjectNavigationState = {
        ...(prev.navigationState || {
          activePhase: 'phase1',
          phase2Tab: 'style',
          phase3Tab: 'board',
        }),
        phase1Step: nextTarget,
        associatedProjectId: prev.projectId,
        lastVisitedAt: new Date().toISOString(),
      };

      return {
        ...prev,
        navigationState: nav,
        phase1Workflow: {
          ...base,
          completedSteps: Array.from(completedSet),
          currentStep: nextTarget,
          stepStatus: updatedStatus,
        },
      };
    });
  }, []);

  const resetPhase1Workflow = useCallback(() => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Reset blocked at data level.');
        return prev;
      }
      return {
        ...prev,
        phase1Workflow: {
          currentStep: 'setup',
          completedSteps: [],
          setupConfirmed: false,
          selectedStartingMode: prev.storySourceMode || 'AI_CONCEPT',
          stepStatus: {
            setup: 'in_progress',
            discover_niches: 'pending',
            research_niche: 'pending',
            concepts: 'pending',
            own_story_review: 'pending',
            screenplay: 'pending',
            shot_list: 'pending',
          },
          needsReviewReason: undefined,
        },
      };
    });
  }, []);

  // Update Settings
  const updateSettings = useCallback((newSettings: Partial<ProjectSettings>) => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Settings update blocked at data level.');
        return prev;
      }
      return {
        ...prev,
        settings: { ...prev.settings, ...newSettings },
        stage1: { ...prev.stage1, dirty: true, needsReaudit: true },
      };
    });
  }, []);

  // Update Visual Style
  const updateVisualStyle = useCallback((style: MasterVisualStyle) => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Visual style update blocked at data level.');
        return prev;
      }
      return {
        ...prev,
        visualStyle: style,
        stage1: { ...prev.stage1, dirty: true, needsReaudit: true },
      };
    });
  }, []);

  // Update Original Story Text (Mode D)
  const updateOriginalStoryText = useCallback((text: string) => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Story text update blocked at data level.');
        return prev;
      }
      const isChanged = Boolean(prev.originalStoryText && text && prev.originalStoryText !== text);
      const hasDownstream = Boolean(prev.stage3?.scenes?.length || prev.stage3?.shots?.length);

      const workflow = prev.phase1Workflow;
      const updatedWorkflow = workflow
        ? {
            ...workflow,
            stepStatus: {
              ...workflow.stepStatus,
              ...(isChanged && hasDownstream
                ? {
                    screenplay: 'needs_review' as const,
                    shot_list: 'needs_review' as const,
                  }
                : {}),
            },
            needsReviewReason:
              isChanged && hasDownstream
                ? 'Original story text was modified. Screenplay and shots are marked for review.'
                : workflow.needsReviewReason,
          }
        : undefined;

      return {
        ...prev,
        sourceRevision: isChanged ? (prev.sourceRevision || 1) + 1 : prev.sourceRevision || 1,
        activeSourceId: 'OWN_STORY',
        originalStoryText: text,
        phase1Workflow: updatedWorkflow,
        sourceDrafts: {
          ...prev.sourceDrafts,
          OWN_STORY: {
            ...prev.sourceDrafts.OWN_STORY,
            text,
          },
        },
        stage1: {
          ...prev.stage1,
          dirty: true,
          ...(isChanged && hasDownstream ? { needsReaudit: true } : {}),
        },
        stage3: {
          ...prev.stage3,
          ...(isChanged && hasDownstream ? { dirty: true, needsReaudit: true } : {}),
        },
      };
    });
  }, []);

  // Update Imported Script (Mode C)
  const updateImportedScript = useCallback((script: ImportedScript | null) => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Mutation blocked at data level.');
        return prev;
      }
      return {
        ...prev,
        sourceRevision: (prev.sourceRevision || 1) + 1,
        activeSourceId: 'OWN_SCRIPT',
        importedScript: script,
        sourceDrafts: {
          ...prev.sourceDrafts,
          OWN_SCRIPT: {
            script,
          },
        },
        stage1: { ...prev.stage1, dirty: true, needsReaudit: true },
      };
    });
  }, []);

  // Set Concepts (Mode A)
  const setConcepts = useCallback((concepts: StoryConcept[]) => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Mutation blocked at data level.');
        return prev;
      }
      return {
        ...prev,
        concepts,
        sourceDrafts: {
          ...prev.sourceDrafts,
          AI_CONCEPT: {
            ...prev.sourceDrafts.AI_CONCEPT,
            concepts,
          },
        },
        stage1: { ...prev.stage1, dirty: true },
      };
    });
  }, []);

  // Select Concept ID (Modes A, B, C)
  const selectConceptId = useCallback((id: string | null) => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Mutation blocked at data level.');
        return prev;
      }
      const isChanged = Boolean(prev.selectedConceptId && id && prev.selectedConceptId !== id);
      const hasDownstream = Boolean(prev.stage3?.scenes?.length || prev.stage3?.shots?.length);

      const workflow = prev.phase1Workflow;
      const updatedWorkflow = workflow
        ? {
            ...workflow,
            stepStatus: {
              ...workflow.stepStatus,
              concepts: 'completed' as const,
              ...(isChanged && hasDownstream
                ? {
                    screenplay: 'needs_review' as const,
                    shot_list: 'needs_review' as const,
                  }
                : {}),
            },
            needsReviewReason:
              isChanged && hasDownstream
                ? 'Selected concept was changed. Screenplay and shot list are marked for review.'
                : workflow.needsReviewReason,
          }
        : undefined;

      return {
        ...prev,
        sourceRevision: isChanged ? (prev.sourceRevision || 1) + 1 : prev.sourceRevision || 1,
        activeSourceId: id,
        selectedConceptId: id,
        phase1Workflow: updatedWorkflow,
        sourceDrafts: {
          ...prev.sourceDrafts,
          AI_CONCEPT: {
            ...prev.sourceDrafts.AI_CONCEPT,
            selectedConceptId: id,
          },
        },
        stage1: {
          ...prev.stage1,
          dirty: true,
          ...(isChanged && hasDownstream ? { needsReaudit: true } : {}),
        },
        stage3: {
          ...prev.stage3,
          ...(isChanged && hasDownstream ? { dirty: true, needsReaudit: true } : {}),
        },
      };
    });
  }, []);

  // Set Story Development (Mode A)
  const setStoryDevelopment = useCallback((development: StoryDevelopment | null) => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Mutation blocked at data level.');
        return prev;
      }
      return {
        ...prev,
        storyDevelopment: development,
        sourceDrafts: {
          ...prev.sourceDrafts,
          AI_CONCEPT: {
            ...prev.sourceDrafts.AI_CONCEPT,
            development,
          },
        },
        stage1: { ...prev.stage1, dirty: true },
      };
    });
  }, []);

  // Set Story Analysis (Mode B)
  const setStoryAnalysis = useCallback((analysis: OwnStoryAnalysis | null) => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Mutation blocked at data level.');
        return prev;
      }
      return {
        ...prev,
        sourceDrafts: {
          ...prev.sourceDrafts,
          OWN_STORY: {
            ...prev.sourceDrafts.OWN_STORY,
            analysis,
          },
        },
        stage1: { ...prev.stage1, dirty: true },
      };
    });
  }, []);

  // Set Story Canon and Foundation
  const setStoryCanonAndFoundation = useCallback(
    (foundation: StoryFoundation, canon: StoryCanon) => {
      setProject((prev) => {
        if (prev.stage1.locked) {
          console.warn('[ProjectContext] Phase 1 is locked. Mutation blocked at data level.');
          return prev;
        }
        return {
          ...prev,
          storyFoundation: foundation,
          storyCanon: canon,
          stage1: {
            ...prev.stage1,
            status: 'READY_FOR_REVIEW',
            generationProgress: 100,
            dirty: false,
            needsReaudit: true,
          },
        };
      });
    },
    []
  );

  // Update Story Canon (local edits)
  const updateStoryCanon = useCallback((canon: StoryCanon, markNeedsReaudit: boolean = true) => {
    setProject((prev) => {
      if (prev.stage1.locked) {
        console.warn('[ProjectContext] Phase 1 is locked. Mutation blocked at data level.');
        return prev;
      }
      return {
        ...prev,
        storyCanon: canon,
        stage1: {
          ...prev.stage1,
          dirty: true,
          needsReaudit: markNeedsReaudit,
        },
      };
    });
  }, []);

  // Set Canon Audit
  const setCanonAudit = useCallback((audit: any) => {
    setProject((prev) => {
      const rawIssues = Array.isArray(audit?.issues) ? audit.issues : [];
      const normalizedIssues = rawIssues.map((i: any, idx: number) => normalizeAuditIssue(i, idx));
      const summary = deriveAuditSummary(normalizedIssues);

      return {
        ...prev,
        canonAudit: audit
          ? {
              ...audit,
              issues: normalizedIssues,
            }
          : null,
        stage1: {
          ...prev.stage1,
          needsReaudit: false,
          unresolvedIssuesCount: summary.unresolvedRequired,
        },
      };
    });
  }, []);

  // Update specific issue status
  const updateCanonAuditIssue = useCallback(
    (issueId: string, updates: Partial<AuditIssue>) => {
      setProject((prev) => {
        if (!prev.canonAudit) return prev;
        const updatedIssues = prev.canonAudit.issues.map((i, idx) =>
          i.issueId === issueId ? normalizeAuditIssue({ ...i, ...updates }, idx) : i
        );
        const summary = deriveAuditSummary(updatedIssues);

        return {
          ...prev,
          canonAudit: {
            ...prev.canonAudit,
            issues: updatedIssues,
          },
          stage1: {
            ...prev.stage1,
            unresolvedIssuesCount: summary.unresolvedRequired,
          },
        };
      });
    },
    []
  );

  // Approve & Lock Phase 1 / Stage 1
  const approveAndLockStage1 = useCallback((): boolean => {
    // Run deterministic brain audit: only genuine objective blockers should prevent approval
    const brainReport = runDeterministicBrainAudit(project);
    const openRequired = brainReport.issues.filter((i) => i.severity === 'REQUIRED' && i.status === 'OPEN').length;
    if (openRequired > 0) {
      console.warn(`Phase 1 Approval blocked: ${openRequired} required issue(s) remaining in Brain Audit.`);
      return false;
    }

    setProject((prev) => {
      const updatedWorkflow = prev.phase1Workflow
        ? {
            ...prev.phase1Workflow,
            isComplete: true,
            stepStatus: {
              ...prev.phase1Workflow.stepStatus,
              shot_list: 'completed' as const,
              brain_audit: 'completed' as const,
            },
          }
        : undefined;

      const updated: Project = {
        ...prev,
        brainAudit: brainReport,
        phase1Workflow: updatedWorkflow,
        stage1: {
          ...prev.stage1,
          status: 'LOCKED',
          approved: true,
          locked: true,
          approvedAt: new Date().toISOString(),
          approvedVersion: (prev.stage1.approvedVersion || 0) + 1,
          dirty: false,
          unresolvedIssuesCount: 0,
        },
        stage2: {
          ...prev.stage2,
          unlocked: true,
          implemented: true,
        },
      };
      saveProjectRecord(updated);
      return updated;
    });

    return true;
  }, [project]);

  // Set Style Bible (Stage 2)
  const setStyleBible = useCallback((styleBible: VisualStyleBible) => {
    setProject((prev) => ({
      ...prev,
      stage2: {
        ...prev.stage2,
        styleBible,
        dirty: true,
        needsReaudit: true,
      },
    }));
  }, []);

  // Update Style Bible (Stage 2)
  const updateStyleBible = useCallback((updates: Partial<VisualStyleBible>) => {
    setProject((prev) => {
      if (!prev.stage2.styleBible) return prev;
      return {
        ...prev,
        stage2: {
          ...prev.stage2,
          styleBible: {
            ...prev.stage2.styleBible,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
          dirty: true,
          needsReaudit: true,
        },
      };
    });
  }, []);

  // Set Stage 2 Assets
  const setStage2Assets = useCallback((assets: VisualAsset[]) => {
    setProject((prev) => ({
      ...prev,
      stage2: {
        ...prev.stage2,
        assets,
        status: 'READY_FOR_REVIEW',
        generationProgress: 100,
        dirty: false,
        needsReaudit: true,
      },
    }));
  }, []);

  // Update Single Stage 2 Asset
  const updateStage2Asset = useCallback((assetId: string, updates: Partial<VisualAsset>) => {
    setProject((prev) => {
      const updatedAssets = prev.stage2.assets.map((a) =>
        a.id === assetId
          ? { ...a, ...updates, promptStatus: 'NEEDS_REAUDIT' as const, updatedAt: new Date().toISOString() }
          : a
      );
      return {
        ...prev,
        stage2: {
          ...prev.stage2,
          assets: updatedAssets,
          dirty: true,
          needsReaudit: true,
        },
      };
    });
  }, []);

  // Set Stage 2 Audit
  const setStage2Audit = useCallback((audit: Stage2Audit) => {
    setProject((prev) => {
      const requiredCount = (audit?.issues || []).filter(
        (i) => i.severity === 'REQUIRED' && i.status === 'OPEN'
      ).length;
      return {
        ...prev,
        stage2: {
          ...prev.stage2,
          audit,
          needsReaudit: false,
          unresolvedIssuesCount: requiredCount,
        },
      };
    });
  }, []);

  // Update Stage 2 Audit Issue
  const updateStage2AuditIssue = useCallback((issueId: string, updates: Partial<Stage2AuditIssue>) => {
    setProject((prev) => {
      if (!prev.stage2.audit) return prev;
      const updatedIssues = prev.stage2.audit.issues.map((i) =>
        i.issueId === issueId ? { ...i, ...updates } : i
      );
      const requiredCount = updatedIssues.filter(
        (i) => i.severity === 'REQUIRED' && i.status === 'OPEN'
      ).length;
      return {
        ...prev,
        stage2: {
          ...prev.stage2,
          audit: {
            ...prev.stage2.audit,
            issues: updatedIssues,
          },
          unresolvedIssuesCount: requiredCount,
        },
      };
    });
  }, []);

  // Attach Reference Image
  const attachReferenceImageToAsset = useCallback(
    (assetId: string, dataUrl: string, fileName: string) => {
      setProject((prev) => {
        const updated = prev.stage2.assets.map((a) =>
          a.id === assetId
            ? {
                ...a,
                optionalReferenceImageData: dataUrl,
                optionalReferenceFileName: fileName,
                optionalReferenceImageId: 'REF-' + Date.now(),
                updatedAt: new Date().toISOString(),
              }
            : a
        );
        return {
          ...prev,
          stage2: {
            ...prev.stage2,
            assets: updated,
            dirty: true,
          },
        };
      });
    },
    []
  );

  // Remove Reference Image
  const removeReferenceImageFromAsset = useCallback((assetId: string) => {
    setProject((prev) => {
      const updated = prev.stage2.assets.map((a) =>
        a.id === assetId
          ? {
                ...a,
                optionalReferenceImageData: undefined,
                optionalReferenceFileName: undefined,
                optionalReferenceImageId: undefined,
                updatedAt: new Date().toISOString(),
              }
          : a
      );
      return {
        ...prev,
        stage2: {
          ...prev.stage2,
          assets: updated,
          dirty: true,
        },
      };
    });
  }, []);

  // Approve & Lock Stage 2
  const approveAndLockStage2 = useCallback((): boolean => {
    if (!project.stage1.locked) {
      return false;
    }
    if (!project.stage2.styleBible || project.stage2.assets.length === 0) {
      return false;
    }

    for (const a of project.stage2.assets) {
      if (!a.referencePrompt || !a.referencePrompt.trim()) return false;
      if (!a.visualSpecification?.summary) return false;
    }

    const openRequired = (project.stage2.audit?.issues || []).filter(
      (i) => i.severity === 'REQUIRED' && i.status === 'OPEN'
    ).length;

    if (openRequired > 0) {
      return false;
    }

    setProject((prev) => {
      const updated: Project = {
        ...prev,
        stage2: {
          ...prev.stage2,
          status: 'LOCKED',
          approved: true,
          locked: true,
          approvedAt: new Date().toISOString(),
          approvedVersion: (prev.stage2.approvedVersion || 0) + 1,
          dirty: false,
        },
        stage3: {
          ...prev.stage3,
          unlocked: true,
          implemented: true,
        },
      };
      saveProjectRecord(updated);
      return updated;
    });

    return true;
  }, [project]);

  // Stage 3 Methods
  const updateScriptSettings = useCallback((settings: Partial<ScriptSettings>) => {
    setProject((prev) => ({
      ...prev,
      stage3: {
        ...prev.stage3,
        settings: { ...prev.stage3.settings, ...settings },
        dirty: true,
        needsReaudit: true,
      },
    }));
  }, []);

  const setStage3Scenes = useCallback((scenes: ScriptScene[]) => {
    setProject((prev) => {
      const nextScreenplayRev = (prev.screenplayRevision || 1) + 1;
      const updatedSheet = compileAudioContinuitySheet({
        scenes,
        shots: prev.stage3?.shots || [],
        settings: prev.settings,
        sourceRevision: prev.sourceRevision || 1,
        screenplayRevision: nextScreenplayRev,
        existingSheet: prev.audioContinuitySheet,
      });
      return {
        ...prev,
        screenplayRevision: nextScreenplayRev,
        audioContinuitySheet: updatedSheet,
        stage3: {
          ...prev.stage3,
          scenes,
          dirty: true,
          needsReaudit: true,
        },
      };
    });
  }, []);

  const updateStage3Scene = useCallback((sceneId: string, updates: Partial<ScriptScene>) => {
    setProject((prev) => {
      const updatedScenes = prev.stage3.scenes.map((s) =>
        s.sceneId === sceneId ? { ...s, ...updates, hasUserModifications: true } : s
      );
      const nextScreenplayRev = (prev.screenplayRevision || 1) + 1;
      const updatedSheet = compileAudioContinuitySheet({
        scenes: updatedScenes,
        shots: prev.stage3?.shots || [],
        settings: prev.settings,
        sourceRevision: prev.sourceRevision || 1,
        screenplayRevision: nextScreenplayRev,
        existingSheet: prev.audioContinuitySheet,
      });
      return {
        ...prev,
        screenplayRevision: nextScreenplayRev,
        audioContinuitySheet: updatedSheet,
        stage3: {
          ...prev.stage3,
          scenes: updatedScenes,
          dirty: true,
          needsReaudit: true,
        },
      };
    });
  }, []);

  const setStage3Shots = useCallback((shots: CinematicShot[]) => {
    setProject((prev) => {
      const nextShotRev = (prev.shotListRevision || 1) + 1;
      const updatedSheet = compileAudioContinuitySheet({
        scenes: prev.stage3?.scenes || [],
        shots,
        settings: prev.settings,
        sourceRevision: prev.sourceRevision || 1,
        screenplayRevision: prev.screenplayRevision || 1,
        existingSheet: prev.audioContinuitySheet,
      });
      return {
        ...prev,
        shotListRevision: nextShotRev,
        audioContinuitySheet: updatedSheet,
        stage3: {
          ...prev.stage3,
          shots,
          dirty: true,
          needsReaudit: true,
        },
      };
    });
  }, []);

  const updateStage3Shot = useCallback((shotId: string, updates: Partial<CinematicShot>) => {
    setProject((prev) => {
      const updatedShots = prev.stage3.shots.map((sh) => (sh.shotId === shotId ? { ...sh, ...updates } : sh));
      const nextShotRev = (prev.shotListRevision || 1) + 1;
      const updatedSheet = compileAudioContinuitySheet({
        scenes: prev.stage3?.scenes || [],
        shots: updatedShots,
        settings: prev.settings,
        sourceRevision: prev.sourceRevision || 1,
        screenplayRevision: prev.screenplayRevision || 1,
        existingSheet: prev.audioContinuitySheet,
      });
      return {
        ...prev,
        shotListRevision: nextShotRev,
        audioContinuitySheet: updatedSheet,
        stage3: {
          ...prev.stage3,
          shots: updatedShots,
          dirty: true,
          needsReaudit: true,
        },
      };
    });
  }, []);

  const attachImageToShot = useCallback(
    (shotId: string, dataUrl: string, fileName?: string, frameTarget: 'first' | 'end' = 'first') => {
      const mediaId = `media_${shotId}_${frameTarget}_${Date.now()}`;
      const mimeType = dataUrl.startsWith('data:image/jpeg')
        ? 'image/jpeg'
        : dataUrl.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/png';
      const defaultFilename = `${shotId}-${frameTarget}-frame.png`;
      const mediaRef: MediaReference = {
        source: 'UPLOAD',
        mediaId,
        mimeType,
        filename: fileName || defaultFilename,
        verified: true,
        storageRef: mediaId,
        dataUrl,
        capturedAt: new Date().toISOString(),
      };

      saveMediaItem(mediaId, dataUrl, {
        source: 'UPLOAD',
        mimeType,
        filename: mediaRef.filename,
      }).catch(console.warn);

      setProject((prev) => {
        const updatedShots = prev.stage3.shots.map((sh) => {
          if (sh.shotId !== shotId) return sh;
          if (frameTarget === 'end') {
            return {
              ...sh,
              endFrameImageData: dataUrl,
              endFrameFileName: mediaRef.filename,
              endFrameImageId: mediaId,
              endFrameMedia: mediaRef,
            };
          }
          return {
            ...sh,
            firstFrameImageData: dataUrl,
            firstFrameFileName: mediaRef.filename,
            firstFrameImageId: mediaId,
            firstFrameMedia: mediaRef,
            referenceReadiness: 'READY' as const,
          };
        });

        const updatedPackages = (prev.stage4.shotPackages || []).map((pkg) => {
          if (pkg.shotId === shotId) {
            const capVerified = Boolean(
              prev.stage4.targetSettings.capabilityVerified ||
              pkg.capabilityStatus === 'VERIFIED_COMPATIBLE'
            );
            if (frameTarget === 'end') {
              return {
                ...pkg,
                endFrameMediaStatus: 'AVAILABLE' as const,
                endFrameImageId: mediaId,
              };
            }
            return {
              ...pkg,
              firstFrameMedia: mediaRef,
              firstFrameImageId: mediaId,
              firstFrameMediaStatus: 'AVAILABLE' as const,
              mediaReadiness: capVerified
                ? ('EXECUTION_READY' as const)
                : ('CAPABILITY_UNVERIFIED' as const),
            };
          }
          return pkg;
        });

        return {
          ...prev,
          stage3: {
            ...prev.stage3,
            shots: updatedShots,
            dirty: true,
            needsReaudit: true,
          },
          stage4: {
            ...prev.stage4,
            shotPackages: updatedPackages,
            dirty: updatedPackages.length > 0 ? true : prev.stage4.dirty,
            needsReaudit: updatedPackages.length > 0 ? true : prev.stage4.needsReaudit,
          },
        };
      });
    },
    []
  );

  const removeImageFromShot = useCallback((shotId: string, frameTarget: 'first' | 'end' = 'first') => {
    setProject((prev) => {
      const updatedShots = prev.stage3.shots.map((sh) => {
        if (sh.shotId !== shotId) return sh;
        if (frameTarget === 'end') {
          return {
            ...sh,
            endFrameImageData: null,
            endFrameFileName: null,
            endFrameImageId: null,
            endFrameMedia: null,
          };
        }
        return {
          ...sh,
          firstFrameImageData: null,
          firstFrameFileName: null,
          firstFrameImageId: null,
          firstFrameMedia: null,
          referenceReadiness: 'IMAGES_PENDING' as const,
        };
      });

      const updatedPackages = (prev.stage4.shotPackages || []).map((pkg) => {
        if (pkg.shotId === shotId) {
          if (frameTarget === 'end') {
            return {
              ...pkg,
              endFrameImageId: null,
              endFrameMediaStatus: 'NOT_APPLICABLE' as const,
            };
          }
          return {
            ...pkg,
            firstFrameMedia: null,
            firstFrameImageId: null,
            firstFrameMediaStatus: (pkg.flowMode === 'FRAMES' ? 'IMAGE_PENDING' : 'NOT_APPLICABLE') as any,
            mediaReadiness: 'MEDIA_PENDING' as const,
          };
        }
        return pkg;
      });

      return {
        ...prev,
        stage3: {
          ...prev.stage3,
          shots: updatedShots,
          dirty: true,
          needsReaudit: true,
        },
        stage4: {
          ...prev.stage4,
          shotPackages: updatedPackages,
          dirty: updatedPackages.length > 0 ? true : prev.stage4.dirty,
          needsReaudit: updatedPackages.length > 0 ? true : prev.stage4.needsReaudit,
        },
      };
    });
  }, []);

  const setStage3Audit = useCallback((audit: Stage3Audit) => {
    setProject((prev) => {
      const openReq = (audit.issues || []).filter(
        (i) => i.severity === 'REQUIRED' && i.status !== 'RESOLVED'
      ).length;
      return {
        ...prev,
        stage3: {
          ...prev.stage3,
          audit,
          unresolvedIssuesCount: openReq,
          needsReaudit: false,
          dirty: false,
        },
      };
    });
  }, []);

  const updateStage3AuditIssue = useCallback(
    (issueId: string, updates: Partial<Stage3AuditIssue>) => {
      setProject((prev) => {
        if (!prev.stage3.audit) return prev;
        const updatedIssues = prev.stage3.audit.issues.map((i) =>
          i.issueId === issueId ? { ...i, ...updates } : i
        );
        const openReq = updatedIssues.filter(
          (i) => i.severity === 'REQUIRED' && i.status !== 'RESOLVED'
        ).length;
        return {
          ...prev,
          stage3: {
            ...prev.stage3,
            audit: {
              ...prev.stage3.audit,
              issues: updatedIssues,
            },
            unresolvedIssuesCount: openReq,
          },
        };
      });
    },
    []
  );

  const approveAndLockStage3 = useCallback((): boolean => {
    if (!project.stage1.locked || !project.stage2.locked) {
      return false;
    }
    if (project.stage3.locked) {
      return true;
    }
    if (!project.stage3.audit || project.stage3.needsReaudit || project.stage3.dirty) {
      return false;
    }
    if (project.stage3.scenes.length === 0 || project.stage3.shots.length === 0) {
      return false;
    }

    const coveredScenes = new Set(project.stage3.shots.map((s) => s.sceneId));
    for (const sc of project.stage3.scenes) {
      if (!coveredScenes.has(sc.sceneId)) return false;
    }

    if (project.storySourceMode === 'OWN_SCRIPT' && project.importedScript && project.stage3.scenes.length === 0) {
      return false;
    }

    const validAssetIds = new Set([
      ...(project.stage2.assets || []).map((a) => a.id),
      ...(project.storyCanon?.characters || []).map((c) => c.id),
      ...(project.storyCanon?.locations || []).map((l) => l.id),
    ]);
    for (const sh of project.stage3.shots) {
      for (const cId of sh.characterIds || []) {
        if (cId && !validAssetIds.has(cId)) return false;
      }
      if (sh.locationId && !validAssetIds.has(sh.locationId)) return false;
      for (const pId of sh.propIds || []) {
        if (pId && !validAssetIds.has(pId)) return false;
      }
    }

    for (const sh of project.stage3.shots) {
      if (sh.duration !== 6 && sh.duration !== 8 && sh.duration !== 10) return false;
      if (sh.flowMode !== 'INGREDIENTS' && sh.flowMode !== 'FRAMES') return false;
      if (sh.flowMode === 'FRAMES' && (!sh.firstFramePrompt || !sh.firstFramePrompt.trim())) {
        return false;
      }
    }

    const unresolvedRequired = (project.stage3.audit.issues || []).filter(
      (i) => i.severity === 'REQUIRED' && i.status !== 'RESOLVED'
    ).length;

    if (unresolvedRequired > 0) {
      return false;
    }

    const totalRuntime = project.stage3.shots.reduce((acc, s) => acc + s.duration, 0);
    const dur6 = project.stage3.shots.filter((s) => s.duration === 6).length;
    const dur8 = project.stage3.shots.filter((s) => s.duration === 8).length;
    const dur10 = project.stage3.shots.filter((s) => s.duration === 10).length;
    const ingredientsCount = project.stage3.shots.filter((s) => s.flowMode === 'INGREDIENTS').length;
    const framesCount = project.stage3.shots.filter((s) => s.flowMode === 'FRAMES').length;

    const productionScript: ProductionScript = {
      title: project.title,
      version: (project.stage3.approvedVersion || 0) + 1,
      sourceMode: project.storySourceMode,
      scenes: project.stage3.scenes,
      totalRuntimeSeconds: totalRuntime,
      compiledAt: new Date().toISOString(),
    };

    const visualShotPlan: VisualShotPlan = {
      title: `${project.title} - Visual Shot Plan V${(project.stage3.approvedVersion || 0) + 1}`,
      version: (project.stage3.approvedVersion || 0) + 1,
      shots: project.stage3.shots,
      totalShotCount: project.stage3.shots.length,
      totalRuntimeSeconds: totalRuntime,
      ingredientsCount,
      framesCount,
      durationBreakdown: { dur6, dur8, dur10 },
      compiledAt: new Date().toISOString(),
    };

    setProject((prev) => {
      const updated: Project = {
        ...prev,
        stage3: {
          ...prev.stage3,
          status: 'LOCKED',
          approved: true,
          locked: true,
          approvedAt: new Date().toISOString(),
          approvedVersion: (prev.stage3.approvedVersion || 0) + 1,
          dirty: false,
          needsReaudit: false,
          productionScript,
          visualShotPlan,
        },
        stage4: {
          ...prev.stage4,
          unlocked: true,
          implemented: true,
        },
      };
      saveProjectRecord(updated);
      return updated;
    });

    return true;
  }, [project]);

  const unlockStage3ForRevision = useCallback(() => {
    setProject((prev) => ({
      ...prev,
      stage3: {
        ...prev.stage3,
        status: 'READY_FOR_REVIEW',
        approved: false,
        locked: false,
        dirty: true,
      },
    }));
  }, []);

  // Stage 4 Callbacks
  const setStage4ShotPackages = useCallback((packages: GoogleFlowShotPackage[]) => {
    setProject((prev) => ({
      ...prev,
      stage4: {
        ...prev.stage4,
        shotPackages: packages,
        dirty: true,
        needsReaudit: true,
      },
    }));
  }, []);

  const updateStage4ShotPackage = useCallback((shotId: string, updates: Partial<GoogleFlowShotPackage>) => {
    setProject((prev) => ({
      ...prev,
      stage4: {
        ...prev.stage4,
        shotPackages: prev.stage4.shotPackages.map((p) =>
          p.shotId === shotId ? { ...p, ...updates } : p
        ),
        dirty: true,
        needsReaudit: true,
      },
    }));
  }, []);

  const updateStage4TargetSettings = useCallback((settings: { targetModel: string; capabilityVerified: boolean }) => {
    setProject((prev) => ({
      ...prev,
      stage4: {
        ...prev.stage4,
        targetSettings: settings,
      },
    }));
  }, []);

  const setStage4Audit = useCallback((audit: Stage4Audit) => {
    const unresolvedCount = audit.issues.filter(
      (i) => i.severity === 'REQUIRED' && i.status !== 'RESOLVED'
    ).length;
    setProject((prev) => ({
      ...prev,
      stage4: {
        ...prev.stage4,
        audit,
        unresolvedIssuesCount: unresolvedCount,
        needsReaudit: false,
        dirty: false,
      },
    }));
  }, []);

  const updateStage4AuditIssue = useCallback((issueId: string, updates: Partial<Stage4AuditIssue>) => {
    setProject((prev) => {
      if (!prev.stage4.audit) return prev;
      const issues = prev.stage4.audit.issues.map((i) =>
        i.issueId === issueId ? { ...i, ...updates } : i
      );
      const unresolvedCount = issues.filter(
        (i) => i.severity === 'REQUIRED' && i.status !== 'RESOLVED'
      ).length;
      return {
        ...prev,
        stage4: {
          ...prev.stage4,
          audit: { ...prev.stage4.audit, issues },
          unresolvedIssuesCount: unresolvedCount,
        },
      };
    });
  }, []);

  const approveAndLockStage4 = useCallback((): boolean => {
    if (!project.stage1.locked || !project.stage2.locked || !project.stage3.locked) {
      return false;
    }
    if (project.stage4.locked) {
      return true;
    }
    if (!project.stage4.audit || project.stage4.needsReaudit || project.stage4.dirty) {
      return false;
    }
    if (
      project.stage4.shotPackages.length === 0 ||
      project.stage4.shotPackages.length !== project.stage3.shots.length
    ) {
      return false;
    }

    const unresolvedRequired = (project.stage4.audit.issues || []).filter(
      (i) => i.severity === 'REQUIRED' && i.status !== 'RESOLVED'
    ).length;
    if (unresolvedRequired > 0) {
      return false;
    }

    const seenShotIds = new Set<string>();
    for (let i = 0; i < project.stage3.shots.length; i++) {
      const s = project.stage3.shots[i];
      const p = project.stage4.shotPackages[i];
      if (!p || p.shotId !== s.shotId) return false;
      if (seenShotIds.has(p.shotId)) return false;
      seenShotIds.add(p.shotId);

      if (p.sceneId !== s.sceneId) return false;
      if (p.plannedDuration !== s.duration) return false;
      if (p.flowMode !== s.flowMode) return false;

      if (p.flowMode === 'FRAMES' && (!p.firstFramePrompt || !p.firstFramePrompt.trim())) {
        return false;
      }

      if (!p.videoPrompt || p.videoPrompt.trim().length < 20) return false;
      if (!p.audioLanes || typeof p.audioLanes.dialogue === 'undefined') return false;
      if (!p.continuityAnchors || !p.continuityAnchors.entryVisualState || !p.continuityAnchors.exitVisualState) return false;
    }

    const totalRuntime = project.stage4.shotPackages.reduce((acc, s) => acc + s.plannedDuration, 0);
    const ingredientsCount = project.stage4.shotPackages.filter((s) => s.flowMode === 'INGREDIENTS').length;
    const framesCount = project.stage4.shotPackages.filter((s) => s.flowMode === 'FRAMES').length;
    const textReadyCount = project.stage4.shotPackages.filter((s) => s.textReadiness === 'TEXT_READY').length;
    const mediaPendingCount = project.stage4.shotPackages.filter((s) => s.mediaReadiness === 'MEDIA_PENDING').length;

    const productionPackage: GoogleFlowProductionPackage = {
      title: `${project.title} — Google Flow Package V${(project.stage4.approvedVersion || 0) + 1}`,
      version: (project.stage4.approvedVersion || 0) + 1,
      sourceMode: project.storySourceMode,
      visualStyle: project.visualStyle,
      totalPlannedRuntimeSeconds: totalRuntime,
      totalShotCount: project.stage4.shotPackages.length,
      ingredientsCount,
      framesCount,
      textReadyCount,
      mediaPendingCount,
      shots: project.stage4.shotPackages,
      compiledAt: new Date().toISOString(),
    };

    setProject((prev) => {
      const updated: Project = {
        ...prev,
        stage4: {
          ...prev.stage4,
          status: 'LOCKED',
          approved: true,
          locked: true,
          approvedAt: new Date().toISOString(),
          approvedVersion: (prev.stage4.approvedVersion || 0) + 1,
          dirty: false,
          needsReaudit: false,
          productionPackage,
        },
      };
      saveProjectRecord(updated);
      return updated;
    });

    return true;
  }, [project]);

  const unlockStage4ForRevision = useCallback(() => {
    setProject((prev) => ({
      ...prev,
      stage4: {
        ...prev.stage4,
        status: 'READY_FOR_REVIEW',
        approved: false,
        locked: false,
        dirty: true,
      },
    }));
  }, []);

  const unlockStage2ForRevision = useCallback(() => {
    setProject((prev) => ({
      ...prev,
      stage2: {
        ...prev.stage2,
        status: 'READY_FOR_REVIEW',
        approved: false,
        locked: false,
        dirty: true,
      },
    }));
  }, []);

  const unlockStage1ForRevision = useCallback(() => {
    setProject((prev) => ({
      ...prev,
      stage1: {
        ...prev.stage1,
        status: 'READY_FOR_REVIEW',
        approved: false,
        locked: false,
        dirty: true,
      },
    }));
  }, []);

  const reviseApprovedPhase1 = useCallback(async (reason?: string): Promise<boolean> => {
    let succeeded = false;
    setProject((prev) => {
      const currentRev = prev.sourceRevision || 1;
      const snapshot: ApprovedPhase1Snapshot = {
        revision: currentRev,
        approvedAt: prev.stage1?.approvedAt || new Date().toISOString(),
        reason: reason || 'User requested Phase 1 revision',
        snapshot: {
          settings: { ...prev.settings },
          visualStyle: { ...prev.visualStyle },
          storySourceMode: prev.storySourceMode,
          concepts: prev.concepts ? [...prev.concepts] : [],
          selectedConceptId: prev.selectedConceptId,
          storyDevelopment: prev.storyDevelopment ? { ...prev.storyDevelopment } : null,
          originalStoryText: prev.originalStoryText,
          importedScript: prev.importedScript ? { ...prev.importedScript } : null,
          storyCanon: prev.storyCanon ? { ...prev.storyCanon } : null,
          storyFoundation: prev.storyFoundation ? { ...prev.storyFoundation } : null,
          scenes: prev.stage3?.scenes ? [...prev.stage3.scenes] : [],
          shots: prev.stage3?.shots ? [...prev.stage3.shots] : [],
          audioContinuitySheet: prev.audioContinuitySheet ? { ...prev.audioContinuitySheet } : undefined,
          brainAudit: prev.brainAudit ? { ...prev.brainAudit } : undefined,
        },
      };

      const existingSnapshots = prev.approvedSnapshots?.phase1 || [];
      const updatedSnapshots = {
        ...(prev.approvedSnapshots || { phase1: [], phase2: [] }),
        phase1: [...existingSnapshots, snapshot],
      };

      const nextRev = currentRev + 1;

      // Mark Phase 1 workflow as needs_review without resetting completed steps
      const currentWorkflow = prev.phase1Workflow;
      const updatedWorkflow: Phase1WorkflowState = {
        ...(currentWorkflow || {
          currentStep: 'setup',
          completedSteps: ['setup'],
          setupConfirmed: true,
          selectedStartingMode: prev.storySourceMode || 'AI_CONCEPT',
          stepStatus: {},
        }),
        isComplete: false,
        stepStatus: {
          ...(currentWorkflow?.stepStatus || {}),
          brain_audit: 'needs_review',
        },
        needsReviewReason: reason || 'Phase 1 unlocked for revision. Review Brain Audit before re-approving.',
      };

      // Mark downstream artifacts as NEEDS_REVIEW / SOURCE_STALE rather than deleting
      const updatedStage2Assets = (prev.stage2?.assets || []).map((asset) => ({
        ...asset,
        promptStatus: 'NEEDS_REAUDIT' as const,
      }));

      const updatedStage4Packages = (prev.stage4?.shotPackages || []).map((pkg) => ({
        ...pkg,
        honestProductionStatus: 'SOURCE_STALE' as const,
      }));

      const updated: Project = {
        ...prev,
        sourceRevision: nextRev,
        approvedSnapshots: updatedSnapshots,
        phase1Workflow: updatedWorkflow,
        stage1: {
          ...prev.stage1,
          status: 'READY_FOR_REVIEW',
          approved: false,
          locked: false,
          dirty: true,
          needsReaudit: true,
        },
        stage2: {
          ...prev.stage2,
          assets: updatedStage2Assets,
          status: prev.stage2.locked ? 'READY_FOR_REVIEW' : prev.stage2.status,
          approved: false,
          locked: false,
          dirty: true,
          needsReaudit: true,
        },
        stage3: {
          ...prev.stage3,
          status: prev.stage3.locked ? 'READY_FOR_REVIEW' : prev.stage3.status,
          approved: false,
          locked: false,
          dirty: true,
          needsReaudit: true,
        },
        stage4: {
          ...prev.stage4,
          shotPackages: updatedStage4Packages,
          status: prev.stage4.locked ? 'READY_FOR_REVIEW' : prev.stage4.status,
          approved: false,
          locked: false,
          dirty: true,
          needsReaudit: true,
        },
      };

      saveProjectRecord(updated);
      succeeded = true;
      return updated;
    });

    return succeeded;
  }, []);

  const reviseApprovedPhase2 = useCallback(async (reason?: string): Promise<boolean> => {
    let succeeded = false;
    setProject((prev) => {
      const currentVer = prev.stage2?.approvedVersion || 1;
      const snapshot: ApprovedPhase2Snapshot = {
        revision: currentVer,
        approvedAt: prev.stage2?.approvedAt || new Date().toISOString(),
        reason: reason || 'User requested Phase 2 revision',
        snapshot: {
          styleBible: prev.stage2?.styleBible ? { ...prev.stage2.styleBible } : null,
          assets: prev.stage2?.assets ? [...prev.stage2.assets] : [],
        },
      };

      const existingSnapshots = prev.approvedSnapshots?.phase2 || [];
      const updatedSnapshots = {
        ...(prev.approvedSnapshots || { phase1: [], phase2: [] }),
        phase2: [...existingSnapshots, snapshot],
      };

      const updatedStage4Packages = (prev.stage4?.shotPackages || []).map((pkg) => ({
        ...pkg,
        honestProductionStatus: 'SOURCE_STALE' as const,
      }));

      const updated: Project = {
        ...prev,
        approvedSnapshots: updatedSnapshots,
        stage2: {
          ...prev.stage2,
          status: 'READY_FOR_REVIEW',
          approved: false,
          locked: false,
          dirty: true,
          needsReaudit: true,
        },
        stage4: {
          ...prev.stage4,
          shotPackages: updatedStage4Packages,
          status: prev.stage4.locked ? 'READY_FOR_REVIEW' : prev.stage4.status,
          approved: false,
          locked: false,
          dirty: true,
          needsReaudit: true,
        },
      };

      saveProjectRecord(updated);
      succeeded = true;
      return updated;
    });

    return succeeded;
  }, []);

  // =========================================================================
  // PHASE 1 — UNIVERSAL BRAIN AUDIT & AUDIO CONTINUITY IMPLEMENTATION
  // =========================================================================
  const syncAudioContinuity = useCallback((): AudioContinuitySheet => {
    const updatedSheet = compileAudioContinuitySheet({
      scenes: project.stage3?.scenes || [],
      shots: project.stage3?.shots || [],
      settings: project.settings,
      sourceRevision: project.sourceRevision || 1,
      screenplayRevision: project.screenplayRevision || 1,
      existingSheet: project.audioContinuitySheet,
    });
    setProject((prev) => ({
      ...prev,
      audioContinuitySheet: updatedSheet,
    }));
    return updatedSheet;
  }, [project]);

  const runBrainAuditTechnical = useCallback((): BrainAuditReport => {
    const audioSheet = compileAudioContinuitySheet({
      scenes: project.stage3?.scenes || [],
      shots: project.stage3?.shots || [],
      settings: project.settings,
      sourceRevision: project.sourceRevision || 1,
      screenplayRevision: project.screenplayRevision || 1,
      existingSheet: project.audioContinuitySheet,
    });

    const report = runDeterministicBrainAudit({
      ...project,
      audioContinuitySheet: audioSheet,
    });

    setProject((prev) => ({
      ...prev,
      audioContinuitySheet: audioSheet,
      brainAudit: report,
      stage1: {
        ...prev.stage1,
        needsReaudit: false,
        unresolvedIssuesCount: report.issues.filter((i) => i.severity === 'REQUIRED' && i.status === 'OPEN').length,
      },
    }));

    return report;
  }, [project]);

  const runBrainAuditCreative = useCallback(async (): Promise<BrainAuditReport> => {
    const technicalReport = runBrainAuditTechnical();

    try {
      const res = await fetch('/api/gemini/audit-brain-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            title: project.title,
            storySourceMode: project.storySourceMode,
            settings: project.settings,
            visualStyle: project.visualStyle,
            selectedConcept: project.concepts?.find((c) => c.conceptId === project.selectedConceptId) || project.storyDevelopment,
            originalStoryText: project.originalStoryText,
            scenes: project.stage3?.scenes || [],
            shots: project.stage3?.shots || [],
            audioLines: technicalReport.issues ? project.audioContinuitySheet?.lines || [] : [],
          },
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.creativeIssues)) {
        const combinedIssues: BrainAuditIssue[] = [
          ...technicalReport.issues,
          ...data.creativeIssues,
        ];
        const combinedScore = Math.round((technicalReport.layerATechnicalScore * 0.6) + ((data.creativeScore || 85) * 0.4));
        const finalReport: BrainAuditReport = {
          ...technicalReport,
          layerBCreativeScore: data.creativeScore || 85,
          overallScore: combinedScore,
          issues: combinedIssues,
          isCreativeAuditStale: false,
          summary: data.creativeSummary || technicalReport.summary,
        };

        setProject((prev) => ({
          ...prev,
          brainAudit: finalReport,
        }));
        return finalReport;
      }
    } catch (err) {
      console.warn('Creative brain audit failed, returning technical report:', err);
    }
    return technicalReport;
  }, [project, runBrainAuditTechnical]);

  const applyBrainAuditFix = useCallback((issueId: string): boolean => {
    let resultSuccess = false;
    setProject((prev) => {
      const currentReport = prev.brainAudit || runDeterministicBrainAudit(prev);
      const issue = currentReport.issues.find((i) => i.issueId === issueId);
      if (!issue) return prev;

      const { updatedProject, success } = applyBrainAuditQuickFix(prev, issue);
      resultSuccess = success;
      if (!success) return prev;

      const freshReport = runDeterministicBrainAudit(updatedProject);
      saveProjectRecord({ ...updatedProject, brainAudit: freshReport });
      return {
        ...updatedProject,
        brainAudit: freshReport,
      };
    });
    return resultSuccess;
  }, []);

  const updateBrainAuditIssue = useCallback((issueId: string, updates: Partial<BrainAuditIssue>) => {
    setProject((prev) => {
      if (!prev.brainAudit) return prev;
      const updatedIssues = prev.brainAudit.issues.map((i) =>
        i.issueId === issueId ? { ...i, ...updates } : i
      );
      const openRequired = updatedIssues.filter((i) => i.severity === 'REQUIRED' && i.status === 'OPEN').length;
      return {
        ...prev,
        brainAudit: {
          ...prev.brainAudit,
          issues: updatedIssues,
          isApproved: openRequired === 0,
        },
      };
    });
  }, []);

  const reassignSpeechLine = useCallback((lineId: string, targetShotId: string | null, markEditorialVo?: boolean) => {
    setProject((prev) => {
      const sheet = prev.audioContinuitySheet;
      if (!sheet) return prev;

      const updatedLines = sheet.lines.map((l) => {
        if (l.lineId !== lineId) return l;
        if (markEditorialVo) {
          return {
            ...l,
            shotId: null,
            lineStatus: 'EDITORIAL_VO_PENDING' as const,
            unmappedReason: 'Assigned to editorial voice-over lane',
          };
        }
        return {
          ...l,
          shotId: targetShotId,
          lineStatus: targetShotId ? ('ASSIGNED' as const) : ('UNMAPPED' as const),
          unmappedReason: targetShotId ? undefined : 'Unassigned by author',
        };
      });

      const updatedSheet: AudioContinuitySheet = {
        ...sheet,
        lines: updatedLines,
        unmappedCount: updatedLines.filter((l) => l.lineStatus === 'UNMAPPED').length,
        overDurationCount: updatedLines.filter((l) => l.lineStatus === 'OVER_DURATION').length,
        version: (sheet.version || 1) + 1,
      };

      const freshAudit = runDeterministicBrainAudit({
        ...prev,
        audioContinuitySheet: updatedSheet,
      });

      return {
        ...prev,
        audioContinuitySheet: updatedSheet,
        brainAudit: freshAudit,
      };
    });
  }, []);

  const confirmSourceAdaptation = useCallback(() => {
    setProject((prev) => {
      const currentRev = prev.sourceRevision || 1;
      const updatedWorkflow = prev.phase1Workflow
        ? {
            ...prev.phase1Workflow,
            stepStatus: {
              ...prev.phase1Workflow.stepStatus,
              screenplay: 'completed' as const,
              shot_list: 'completed' as const,
            },
            needsReviewReason: undefined,
          }
        : undefined;

      const updated: Project = {
        ...prev,
        screenplayRevision: currentRev,
        shotListRevision: currentRev,
        phase1Workflow: updatedWorkflow,
      };

      const freshAudit = runDeterministicBrainAudit(updated);
      saveProjectRecord({ ...updated, brainAudit: freshAudit });
      return {
        ...updated,
        brainAudit: freshAudit,
      };
    });
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        viewMode,
        setViewMode,
        projectList,
        migrationReport,
        createNewProject,
        openProject,
        renameProject,
        duplicateProject,
        deleteProject,
        exportSingleProject,
        exportStudioBackup,
        importProjectFromFile,
        flushSave,
        project,
        activeStage,
        activePhase,
        activeTab,
        saveStatus,
        storageError,
        modeSwitchPrompt,
        setActiveStage,
        setActivePhase,
        setActiveTab,
        updateNicheResearch,
        updatePhase1Workflow,
        setPhase1Step,
        markPhase1StepCompleted,
        resetPhase1Workflow,
        setStorySourceMode,
        confirmModeSwitch,
        cancelModeSwitch,
        updateSettings,
        updateVisualStyle,
        updateOriginalStoryText,
        updateImportedScript,
        setConcepts,
        selectConceptId,
        setStoryDevelopment,
        setStoryAnalysis,
        setStoryCanonAndFoundation,
        updateStoryCanon,
        setCanonAudit,
        updateCanonAuditIssue,
        stage2Tab,
        setStage2Tab,
        setStyleBible,
        updateStyleBible,
        setStage2Assets,
        updateStage2Asset,
        setStage2Audit,
        updateStage2AuditIssue,
        attachReferenceImageToAsset,
        removeReferenceImageFromAsset,
        approveAndLockStage2,
        unlockStage2ForRevision,
        stage3Tab,
        setStage3Tab,
        updateScriptSettings,
        setStage3Scenes,
        updateStage3Scene,
        setStage3Shots,
        updateStage3Shot,
        attachImageToShot,
        removeImageFromShot,
        setStage3Audit,
        updateStage3AuditIssue,
        approveAndLockStage3,
        unlockStage3ForRevision,
        stage4Tab,
        setStage4Tab,
        setStage4ShotPackages,
        updateStage4ShotPackage,
        updateStage4TargetSettings,
        setStage4Audit,
        updateStage4AuditIssue,
        approveAndLockStage4,
        unlockStage4ForRevision,
        approveAndLockStage1,
        unlockStage1ForRevision,
        reviseApprovedPhase1,
        reviseApprovedPhase2,
        isPhase1Locked,
        isPhase2Locked,
        retrySave,
        syncAudioContinuity,
        runBrainAuditTechnical,
        runBrainAuditCreative,
        applyBrainAuditFix,
        updateBrainAuditIssue,
        reassignSpeechLine,
        confirmSourceAdaptation,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
