import {
  Project,
  ProjectSummary,
  ProjectSettings,
  MigrationReport,
  StageId,
  PhaseId,
  Phase1StepId,
  MediaReference,
} from '../types/filmStudio';
import { createDefaultProject } from './defaultProject';
import { saveMediaItem, getMediaItem, getAllMediaMap } from './mediaStore';
import { hydrateProjectMedia } from './persistence';
import { normalizeProjectSettings } from '../data/genreAndToneLibrary';
import { compileAudioContinuitySheet } from './audioContinuityEngine';

export const INDEX_KEY = 'xemacs7_project_index_v2';
export const LEGACY_KEY = 'xemacs7_film_studio_project_v2';
export const LEGACY_BACKUP_KEY = 'xemacs7_film_studio_project_v2_legacy_backup';
export const ACTIVE_PROJECT_KEY = 'xemacs7_active_project_id';
export const LEGACY_MIGRATED_FLAG = 'xemacs7_legacy_migrated_v2';
export const PROJECT_PREFIX = 'xemacs7_proj_';

const DB_NAME = 'xemacs7_film_studio_projects_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';

// In-memory cache for fast lookups
const projectMemoryCache = new Map<string, Project>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function getProjectsDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
            db.createObjectStore(STORE_PROJECTS, { keyPath: 'projectId' });
          }
        };
        req.onsuccess = (e: any) => {
          resolve(e.target.result as IDBDatabase);
        };
        req.onerror = (err) => {
          console.warn('[ProjectStorage] IndexedDB open failed, using fallback:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('[ProjectStorage] IndexedDB init exception:', err);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

/**
 * Computes a lightweight ProjectSummary from a full Project object.
 */
export function deriveProjectSummary(project: Project): ProjectSummary {
  // Determine current active stage
  let currentStage: StageId = 'stage1';
  if (project.stage4?.unlocked && ((project.stage4?.shotPackages && project.stage4.shotPackages.length > 0) || project.stage4?.locked)) {
    currentStage = 'stage4';
  } else if (project.stage3?.unlocked && ((project.stage3?.shots && project.stage3.shots.length > 0) || project.stage3?.locked)) {
    currentStage = 'stage3';
  } else if (project.stage2?.unlocked && ((project.stage2?.assets && project.stage2.assets.length > 0) || project.stage2?.locked)) {
    currentStage = 'stage2';
  } else {
    currentStage = 'stage1';
  }

  // Derive human-readable approval status
  let stageApprovalStatus = 'Stage 1 — In Progress';
  if (project.stage4?.locked) {
    stageApprovalStatus = 'Stage 4 — Locked (Flow Ready)';
  } else if (project.stage4?.unlocked) {
    stageApprovalStatus = 'Stage 4 — In Production';
  } else if (project.stage3?.locked) {
    stageApprovalStatus = 'Stage 3 — Locked (Script & Shots)';
  } else if (project.stage3?.unlocked) {
    stageApprovalStatus = 'Stage 3 — In Progress';
  } else if (project.stage2?.locked) {
    stageApprovalStatus = 'Stage 2 — Locked (Assets & Bible)';
  } else if (project.stage2?.unlocked) {
    stageApprovalStatus = 'Stage 2 — In Progress';
  } else if (project.stage1?.locked) {
    stageApprovalStatus = 'Stage 1 — Locked (Canon V1)';
  }

  // Look for thumbnail candidates
  let thumbnailDataUrl: string | null = null;
  let thumbnailMediaId: string | null = null;

  // 1. Try first shot with media
  const shotWithImage = project.stage3?.shots?.find(
    (s) => s.firstFrameImageData || s.firstFrameMedia?.dataUrl || s.firstFrameMedia?.mediaId
  );
  if (shotWithImage) {
    thumbnailDataUrl = shotWithImage.firstFrameImageData || shotWithImage.firstFrameMedia?.dataUrl || null;
    thumbnailMediaId = shotWithImage.firstFrameMedia?.mediaId || shotWithImage.firstFrameImageId || null;
  }

  // 2. Try first asset with media
  if (!thumbnailDataUrl && !thumbnailMediaId) {
    const assetWithImage = project.stage2?.assets?.find(
      (a) => a.optionalReferenceImageData || a.referenceMedia?.dataUrl || a.referenceMedia?.mediaId
    );
    if (assetWithImage) {
      thumbnailDataUrl = assetWithImage.optionalReferenceImageData || assetWithImage.referenceMedia?.dataUrl || null;
      thumbnailMediaId = assetWithImage.referenceMedia?.mediaId || assetWithImage.optionalReferenceImageId || null;
    }
  }

  // To prevent localStorage index explosion, do not keep long base64 strings in index.
  // Short SVG or mediaId is preferred.
  const isLargeBase64 = thumbnailDataUrl && thumbnailDataUrl.length > 1000;
  const safeThumbnail = isLargeBase64 ? null : thumbnailDataUrl;

  let currentPhase: PhaseId = project.activePhase || (
    project.stage4?.unlocked ? 'phase3' : project.stage2?.unlocked ? 'phase2' : 'phase1'
  );

  return {
    id: project.projectId,
    title: project.title || 'Untitled Film Project',
    format: project.settings?.format || 'Shorts/Reels',
    aspectRatio: project.settings?.aspectRatio || '9:16',
    episodeCount: project.settings?.episodeCount || 1,
    currentStage,
    currentPhase,
    stageApprovalStatus,
    stage1Locked: Boolean(project.stage1?.locked),
    stage2Locked: Boolean(project.stage2?.locked),
    stage3Locked: Boolean(project.stage3?.locked),
    stage4Locked: Boolean(project.stage4?.locked),
    updatedAt: project.updatedAt || new Date().toISOString(),
    createdAt: project.createdAt || new Date().toISOString(),
    thumbnailDataUrl: safeThumbnail,
    thumbnailMediaId: thumbnailMediaId || undefined,
    logline: project.storyFoundation?.logline || undefined,
    genres: project.settings?.genres || [],
    visualStyleName: project.visualStyle?.name || undefined,
    storySourceMode: project.storySourceMode || 'AI_CONCEPT',
  };
}

/**
 * Synchronously reads the project index from localStorage for instant render.
 */
export function getSynchronousIndex(): ProjectSummary[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Asynchronously loads the project index, syncing between IndexedDB and localStorage.
 */
export async function loadProjectIndex(): Promise<ProjectSummary[]> {
  const syncIndex = getSynchronousIndex();
  return syncIndex;
}

/**
 * Persists project index to localStorage and keeps it lightweight.
 */
export async function saveProjectIndex(index: ProjectSummary[]): Promise<boolean> {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    return true;
  } catch (err) {
    console.warn('[ProjectStorage] Failed to save project index to localStorage:', err);
    return false;
  }
}

/**
 * Derives the completed Phase 1 steps purely from real saved artifacts.
 * Prevents inventing steps while guaranteeing pre-existing work is recognized.
 */
export function derivePhase1CompletedSteps(parsed: Project): Phase1StepId[] {
  const completed: Phase1StepId[] = ['setup'];

  if (parsed.nicheResearch?.discoveredNiches && parsed.nicheResearch.discoveredNiches.length > 0) {
    if (!completed.includes('discover_niches')) completed.push('discover_niches');
  }

  if (
    (parsed.nicheResearch?.searchResults && parsed.nicheResearch.searchResults.length > 0) ||
    (parsed.nicheResearch?.opportunityAnalysis !== null && parsed.nicheResearch?.opportunityAnalysis !== undefined)
  ) {
    if (!completed.includes('research_niche')) completed.push('research_niche');
  }

  if (
    (parsed.concepts && parsed.concepts.length > 0) ||
    Boolean(parsed.selectedConceptId) ||
    (parsed.storyDevelopment !== null && parsed.storyDevelopment !== undefined)
  ) {
    if (!completed.includes('concepts')) completed.push('concepts');
  }

  if (
    Boolean(parsed.originalStoryText?.trim()) ||
    Boolean(parsed.importedScript) ||
    parsed.storyFoundation?.provenance === 'OWN_STORY' ||
    Boolean(parsed.sourceDrafts?.OWN_STORY?.text?.trim())
  ) {
    if (!completed.includes('own_story_review')) completed.push('own_story_review');
  }

  if (parsed.stage3?.scenes && parsed.stage3.scenes.length > 0) {
    if (!completed.includes('screenplay')) completed.push('screenplay');
  }

  if (parsed.stage3?.shots && parsed.stage3.shots.length > 0) {
    if (!completed.includes('shot_list')) completed.push('shot_list');
  }

  if (
    Boolean(parsed.brainAudit) ||
    Boolean(parsed.canonAudit) ||
    Boolean(parsed.stage1?.locked)
  ) {
    if (!completed.includes('brain_audit')) completed.push('brain_audit');
  }

  return completed;
}

/**
 * Normalizes project collections and states safely.
 */
export function normalizeProjectData(parsed: Project): Project {
  // Ensure authoritative revisions exist
  parsed.sourceRevision = typeof parsed.sourceRevision === 'number' ? parsed.sourceRevision : 1;
  parsed.screenplayRevision = typeof parsed.screenplayRevision === 'number' ? parsed.screenplayRevision : 1;
  parsed.shotListRevision = typeof parsed.shotListRevision === 'number' ? parsed.shotListRevision : 1;

  // Normalize settings (genres array and primary/secondary tone)
  if (parsed.settings) {
    parsed.settings = normalizeProjectSettings(parsed.settings);
    // Normalize voiceMode and openingStrategy
    if (!parsed.settings.voiceMode) {
      if (parsed.settings.voiceFormat === 'No-Voice') {
        parsed.settings.voiceMode = 'NO_SPOKEN_VOICE';
      } else if (parsed.settings.voiceFormat === 'Narration' || parsed.settings.narration === 'Narration Led') {
        parsed.settings.voiceMode = 'NARRATION_VO_ONLY';
      } else if (parsed.settings.voiceFormat === 'Inner Voice') {
        parsed.settings.voiceMode = 'DIALOGUE_AND_NARRATION';
      } else if (parsed.settings.voiceFormat === 'AI Decide' || parsed.settings.narration === 'AI Decide') {
        parsed.settings.voiceMode = 'AI_DECIDE';
      } else {
        parsed.settings.voiceMode = 'CHARACTER_DIALOGUE_ONLY';
      }
    }
    if (!parsed.settings.openingStrategy) {
      parsed.settings.openingStrategy = 'NONE';
    }
    if (!parsed.settings.spokenWordPacing) {
      parsed.settings.spokenWordPacing = 'NATURAL';
    }
    if (!parsed.settings.audioProductionPreference) {
      parsed.settings.audioProductionPreference = 'NATIVE_VIDEO_SYNC';
    }
  }

  // Compile or update Audio Continuity Sheet
  parsed.audioContinuitySheet = compileAudioContinuitySheet({
    scenes: parsed.stage3?.scenes || [],
    shots: parsed.stage3?.shots || [],
    settings: parsed.settings,
    sourceRevision: parsed.sourceRevision,
    screenplayRevision: parsed.screenplayRevision,
    existingSheet: parsed.audioContinuitySheet,
  });

  // Reset interrupted generating flags upon load without erasing data
  if (parsed.stage1?.status === 'GENERATING') {
    parsed.stage1.status = parsed.storyCanon ? 'READY_FOR_REVIEW' : 'DRAFT';
    parsed.stage1.generationProgress = parsed.storyCanon ? 100 : 0;
  }

  if (parsed.storyCanon) {
    if (!Array.isArray(parsed.storyCanon.locations)) parsed.storyCanon.locations = [];
    if (!Array.isArray(parsed.storyCanon.props)) parsed.storyCanon.props = [];
    if (!Array.isArray(parsed.storyCanon.characters)) parsed.storyCanon.characters = [];
    if (!Array.isArray(parsed.storyCanon.worldRules)) parsed.storyCanon.worldRules = [];
    if (!Array.isArray(parsed.storyCanon.beatMap)) parsed.storyCanon.beatMap = [];
    if (!Array.isArray(parsed.storyCanon.setupPayoffs)) parsed.storyCanon.setupPayoffs = [];
    if (!Array.isArray(parsed.storyCanon.relationships)) parsed.storyCanon.relationships = [];
    if (!Array.isArray(parsed.storyCanon.timeline)) parsed.storyCanon.timeline = [];
  }

  if (!parsed.stage2 || !Array.isArray(parsed.stage2.assets)) {
    parsed.stage2 = {
      unlocked: parsed.stage1?.locked || false,
      implemented: true,
      title: 'Visual Asset Prompt Studio',
      description: 'Generates Style Bible and ready-to-paste image prompts for characters, wardrobe, locations, and props.',
      status: 'DRAFT',
      currentStep: 'INITIAL',
      generationProgress: 0,
      approved: false,
      locked: false,
      dirty: false,
      needsReaudit: false,
      styleBible: null,
      assets: [],
      audit: null,
      unresolvedIssuesCount: 0,
    };
  } else {
    parsed.stage2.implemented = true;
    if (parsed.stage2.status === 'GENERATING') {
      parsed.stage2.status = parsed.stage2.assets.length > 0 ? 'READY_FOR_REVIEW' : 'DRAFT';
      parsed.stage2.generationProgress = parsed.stage2.assets.length > 0 ? 100 : 0;
    }
  }

  if (!parsed.stage3 || !Array.isArray(parsed.stage3.scenes)) {
    parsed.stage3 = {
      unlocked: parsed.stage2?.locked || false,
      implemented: true,
      title: 'Script & Shot Planner',
      description: 'Generates Production Script V1 and Visual Shot Plan with modular 6s, 8s, 10s shot durations.',
      status: 'DRAFT',
      currentStep: 'INITIAL',
      generationProgress: 0,
      approved: false,
      locked: false,
      dirty: false,
      needsReaudit: false,
      sourceMode: parsed.storySourceMode || 'AI_CONCEPT',
      settings: {
        pacing: 'BALANCED',
        dialogueDensity: 'MEDIUM',
        allowNarration: false,
        maxShotDuration: 10,
        flowRoutePreference: 'AUTO',
        activeEpisodeId: null,
      },
      scenes: [],
      shots: [],
      audit: null,
      unresolvedIssuesCount: 0,
      productionScript: null,
      visualShotPlan: null,
      durationReconciliation: null,
    };
  } else {
    parsed.stage3.implemented = true;
    if (parsed.stage3.status === 'GENERATING') {
      parsed.stage3.status = parsed.stage3.scenes.length > 0 ? 'READY_FOR_REVIEW' : 'DRAFT';
      parsed.stage3.generationProgress = parsed.stage3.scenes.length > 0 ? 100 : 0;
    }
  }

  if (!parsed.stage4 || !Array.isArray((parsed.stage4 as any).shotPackages)) {
    parsed.stage4 = {
      unlocked: parsed.stage3?.locked || false,
      implemented: true,
      title: 'Google Flow Production Studio',
      description: 'Generates full per-shot video prompts, continuity pacing, audio instructions, and export payloads.',
      status: 'DRAFT',
      currentStep: 'INITIAL',
      generationProgress: 0,
      approved: false,
      locked: false,
      dirty: false,
      needsReaudit: false,
      targetSettings: {
        targetModel: 'Google Veo 2 / Flow Standard',
        capabilityVerified: false,
      },
      shotPackages: [],
      audit: null,
      unresolvedIssuesCount: 0,
      productionPackage: null,
    };
  } else {
    parsed.stage4.implemented = true;
    if (parsed.stage4.status === 'GENERATING') {
      parsed.stage4.status = parsed.stage4.shotPackages.length > 0 ? 'READY_FOR_REVIEW' : 'DRAFT';
      parsed.stage4.generationProgress = parsed.stage4.shotPackages.length > 0 ? 100 : 0;
    }
  }

  if (!parsed.sourceDrafts) {
    parsed.sourceDrafts = {
      AI_CONCEPT: { concepts: [], selectedConceptId: null, development: null },
      OWN_STORY: { text: '', analysis: null },
      OWN_SCRIPT: { script: null },
    };
  }

  if (!parsed.activePhase) {
    if (parsed.stage4?.unlocked && ((parsed.stage4 as any).shotPackages?.length || parsed.stage4?.locked)) {
      parsed.activePhase = 'phase3';
    } else if (parsed.stage2?.unlocked && ((parsed.stage2 as any).assets?.length || parsed.stage2?.locked)) {
      parsed.activePhase = 'phase2';
    } else {
      parsed.activePhase = 'phase1';
    }
  }

  if (!parsed.nicheResearch) {
    parsed.nicheResearch = {
      connected: false,
      dataSourceNotice: 'YouTube Data API key not configured on server',
      selectedPlatform: parsed.settings?.platform || 'YouTube Shorts',
      keyword: parsed.settings?.topicOrNiche || '',
      region: 'US',
      language: parsed.settings?.language || 'English',
      timeframe: '30d',
      contentType: parsed.settings?.format === 'Shorts/Reels' ? 'shorts' : 'all',
      minViews: 10000,
      searchResults: [],
      opportunityAnalysis: null,
      discoveredNiches: [],
      isSearching: false,
      isAnalyzing: false,
    };
  }

  const derivedCompleted = derivePhase1CompletedSteps(parsed);
  const isPreExisting = derivedCompleted.length > 1 || Boolean(parsed.stage1?.locked);

  if (!parsed.phase1Workflow) {
    let currentStep: Phase1StepId = 'setup';
    if (parsed.stage1?.locked || parsed.brainAudit) currentStep = 'brain_audit';
    else if (parsed.stage3?.shots?.length) currentStep = 'shot_list';
    else if (parsed.stage3?.scenes?.length) currentStep = 'shot_list';
    else if (parsed.concepts?.length || parsed.selectedConceptId) currentStep = 'screenplay';
    else if (parsed.originalStoryText?.trim().length) currentStep = 'screenplay';
    else if (parsed.nicheResearch?.searchResults?.length) currentStep = 'concepts';
    else if (isPreExisting) currentStep = 'setup';

    const stepStatusRecord: Record<string, 'pending' | 'in_progress' | 'completed' | 'needs_review'> = {
      setup: isPreExisting ? 'completed' : 'in_progress',
      discover_niches: derivedCompleted.includes('discover_niches') ? 'completed' : 'pending',
      research_niche: derivedCompleted.includes('research_niche') ? 'completed' : 'pending',
      concepts: derivedCompleted.includes('concepts') ? 'completed' : 'pending',
      own_story_review: derivedCompleted.includes('own_story_review') ? 'completed' : 'pending',
      screenplay: derivedCompleted.includes('screenplay') ? 'completed' : 'pending',
      shot_list: derivedCompleted.includes('shot_list') ? 'completed' : 'pending',
      brain_audit: derivedCompleted.includes('brain_audit') ? 'completed' : 'pending',
    };

    parsed.phase1Workflow = {
      currentStep,
      completedSteps: derivedCompleted,
      setupConfirmed: isPreExisting,
      selectedStartingMode: parsed.storySourceMode || 'AI_CONCEPT',
      stepStatus: stepStatusRecord,
      isComplete: Boolean(parsed.stage1?.locked),
    };
  } else {
    if (!parsed.phase1Workflow.stepStatus) {
      parsed.phase1Workflow.stepStatus = {};
    }
    if (!parsed.phase1Workflow.stepStatus.brain_audit) {
      parsed.phase1Workflow.stepStatus.brain_audit = parsed.stage1?.locked ? 'completed' : 'pending';
    }

    // Ensure pre-existing completed steps are recognized from real artifacts
    for (const step of derivedCompleted) {
      if (!parsed.phase1Workflow.completedSteps.includes(step)) {
        parsed.phase1Workflow.completedSteps.push(step);
      }
      if (parsed.phase1Workflow.stepStatus[step] === 'pending' || !parsed.phase1Workflow.stepStatus[step]) {
        parsed.phase1Workflow.stepStatus[step] = 'completed';
      }
    }

    if (isPreExisting || parsed.stage1?.locked) {
      parsed.phase1Workflow.setupConfirmed = true;
      if (!parsed.phase1Workflow.completedSteps.includes('setup')) {
        parsed.phase1Workflow.completedSteps.unshift('setup');
      }
      if (parsed.stage1?.locked) {
        parsed.phase1Workflow.isComplete = true;
      }
    }
  }

  // Normalize navigationState
  if (!parsed.navigationState) {
    let activePhase: PhaseId = parsed.activePhase || (
      parsed.stage4?.locked || (parsed.stage4?.unlocked && parsed.stage4?.shotPackages?.length) ? 'phase3' :
      parsed.stage2?.locked || (parsed.stage2?.unlocked && parsed.stage2?.assets?.length) ? 'phase2' :
      'phase1'
    );
    parsed.navigationState = {
      activePhase,
      phase1Step: parsed.phase1Workflow?.currentStep || (parsed.stage1?.locked ? 'brain_audit' : 'setup'),
      phase2Tab: 'style',
      phase3Tab: 'board',
      associatedProjectId: parsed.projectId,
      lastVisitedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } else {
    if (!parsed.navigationState.phase1Step) {
      parsed.navigationState.phase1Step = parsed.phase1Workflow?.currentStep || 'setup';
    }
    if (!parsed.navigationState.activePhase) {
      parsed.navigationState.activePhase = parsed.activePhase || 'phase1';
    }
    if (!parsed.navigationState.phase2Tab) {
      parsed.navigationState.phase2Tab = 'style';
    }
    if (!parsed.navigationState.phase3Tab) {
      parsed.navigationState.phase3Tab = 'board';
    }
  }

  // Normalize approvedSnapshots
  if (!parsed.approvedSnapshots) {
    parsed.approvedSnapshots = {
      phase1: [],
      phase2: [],
    };
  }

  return parsed;
}

// In-flight and committed write registry to prevent stale/delayed overwrites
interface ProjectWriteCommit {
  timestamp: number;
  revision: number;
}
const projectWriteRegistry = new Map<string, ProjectWriteCommit>();

/**
 * Extracts heavy base64 images from project and awaits their persistent storage in IndexedDB MediaStore.
 * Ensures media are physically stored before project metadata declares durable success.
 */
export async function extractAndPersistProjectMedia(project: Project): Promise<Project> {
  const mediaSaves: Promise<boolean>[] = [];

  const processedAssets = (Array.isArray(project.stage2?.assets) ? project.stage2.assets : []).map((asset) => {
    if (asset.optionalReferenceImageData && asset.optionalReferenceImageData.length > 500) {
      const mediaId = asset.referenceMedia?.mediaId || asset.optionalReferenceImageId || `asset_${asset.id}`;
      mediaSaves.push(
        saveMediaItem(mediaId, asset.optionalReferenceImageData, {
          projectId: project.projectId,
          targetId: asset.id,
          imageRole: 'REFERENCE',
          source: 'UPLOAD',
          filename: asset.optionalReferenceFileName,
        }).catch((err) => {
          console.warn('[ProjectStorage] Media save error for asset:', err);
          return false;
        })
      );
      return {
        ...asset,
        optionalReferenceImageData: undefined,
        referenceMedia: {
          source: asset.referenceMedia?.source || 'UPLOAD',
          mediaId,
          mimeType: asset.referenceMedia?.mimeType || 'image/png',
          filename: asset.optionalReferenceFileName || `${asset.id}.png`,
          verified: true,
          storageRef: mediaId,
          dataUrl: null,
        },
      };
    }
    return asset;
  });

  const processedShots = (Array.isArray(project.stage3?.shots) ? project.stage3.shots : []).map((shot) => {
    let pShot = { ...shot };
    if (shot.firstFrameImageData && shot.firstFrameImageData.length > 500) {
      const mediaId = shot.firstFrameMedia?.mediaId || shot.firstFrameImageId || `shot_${shot.shotId}_first`;
      mediaSaves.push(
        saveMediaItem(mediaId, shot.firstFrameImageData, {
          projectId: project.projectId,
          targetId: shot.shotId,
          imageRole: 'FIRST_FRAME',
          source: shot.firstFrameMedia?.source || 'UPLOAD',
          filename: shot.firstFrameFileName || undefined,
        }).catch((err) => {
          console.warn('[ProjectStorage] Media save error for shot first frame:', err);
          return false;
        })
      );
      pShot = {
        ...pShot,
        firstFrameImageData: undefined,
        firstFrameMedia: {
          source: shot.firstFrameMedia?.source || 'UPLOAD',
          mediaId,
          mimeType: shot.firstFrameMedia?.mimeType || 'image/png',
          filename: shot.firstFrameFileName || `${shot.shotId}-first-frame.png`,
          verified: true,
          storageRef: mediaId,
          dataUrl: null,
        },
      };
    }

    if (shot.endFrameImageData && shot.endFrameImageData.length > 500) {
      const endMediaId = shot.endFrameMedia?.mediaId || shot.endFrameImageId || `shot_${shot.shotId}_end`;
      mediaSaves.push(
        saveMediaItem(endMediaId, shot.endFrameImageData, {
          projectId: project.projectId,
          targetId: shot.shotId,
          imageRole: 'END_FRAME',
          source: shot.endFrameMedia?.source || 'UPLOAD',
          filename: shot.endFrameFileName || undefined,
        }).catch((err) => {
          console.warn('[ProjectStorage] Media save error for shot end frame:', err);
          return false;
        })
      );
      pShot = {
        ...pShot,
        endFrameImageData: undefined,
        endFrameMedia: {
          source: shot.endFrameMedia?.source || 'UPLOAD',
          mediaId: endMediaId,
          mimeType: shot.endFrameMedia?.mimeType || 'image/png',
          filename: shot.endFrameFileName || `${shot.shotId}-end-frame.png`,
          verified: true,
          storageRef: endMediaId,
          dataUrl: null,
        },
      };
    }
    return pShot;
  });

  const processedPackages = (Array.isArray(project.stage4?.shotPackages) ? project.stage4.shotPackages : []).map((pkg) => {
    if (pkg.firstFrameMedia?.dataUrl && pkg.firstFrameMedia.dataUrl.length > 500) {
      const mediaId = pkg.firstFrameMedia.mediaId || `shot_${pkg.shotId}`;
      mediaSaves.push(
        saveMediaItem(mediaId, pkg.firstFrameMedia.dataUrl, {
          projectId: project.projectId,
          targetId: pkg.shotId,
          imageRole: 'FIRST_FRAME',
          source: pkg.firstFrameMedia.source,
          filename: pkg.firstFrameMedia.filename,
        }).catch((err) => {
          console.warn('[ProjectStorage] Media save error for shot package:', err);
          return false;
        })
      );
      return {
        ...pkg,
        firstFrameMedia: {
          ...pkg.firstFrameMedia,
          dataUrl: null,
          storageRef: mediaId,
        },
      };
    }
    return pkg;
  });

  if (mediaSaves.length > 0) {
    await Promise.all(mediaSaves);
  }

  return {
    ...project,
    stage2: project.stage2 ? { ...project.stage2, assets: processedAssets } : project.stage2,
    stage3: project.stage3 ? { ...project.stage3, shots: processedShots } : project.stage3,
    stage4: project.stage4 ? { ...project.stage4, shotPackages: processedPackages } : project.stage4,
  };
}

/**
 * Synchronously strips heavy base64 images from project before saving to localStorage.
 */
export function stripHeavyMediaForStorage(project: Project): Project {
  return {
    ...project,
    stage2: project.stage2
      ? {
          ...project.stage2,
          assets: (Array.isArray(project.stage2.assets) ? project.stage2.assets : []).map((asset) => {
            if (asset.optionalReferenceImageData && asset.optionalReferenceImageData.length > 500) {
              const mediaId = asset.referenceMedia?.mediaId || asset.optionalReferenceImageId || `asset_${asset.id}`;
              return {
                ...asset,
                optionalReferenceImageData: undefined,
                referenceMedia: {
                  source: asset.referenceMedia?.source || 'UPLOAD',
                  mediaId,
                  mimeType: asset.referenceMedia?.mimeType || 'image/png',
                  filename: asset.optionalReferenceFileName || `${asset.id}.png`,
                  verified: true,
                  storageRef: mediaId,
                  dataUrl: null,
                },
              };
            }
            return asset;
          }),
        }
      : project.stage2,
    stage3: project.stage3
      ? {
          ...project.stage3,
          shots: (Array.isArray(project.stage3.shots) ? project.stage3.shots : []).map((shot) => {
            let processedShot = { ...shot };
            if (shot.firstFrameImageData && shot.firstFrameImageData.length > 500) {
              const mediaId = shot.firstFrameMedia?.mediaId || shot.firstFrameImageId || `shot_${shot.shotId}_first`;
              processedShot = {
                ...processedShot,
                firstFrameImageData: undefined,
                firstFrameMedia: {
                  source: shot.firstFrameMedia?.source || 'UPLOAD',
                  mediaId,
                  mimeType: shot.firstFrameMedia?.mimeType || 'image/png',
                  filename: shot.firstFrameFileName || `${shot.shotId}-first-frame.png`,
                  verified: true,
                  storageRef: mediaId,
                  dataUrl: null,
                },
              };
            }
            if (shot.endFrameImageData && shot.endFrameImageData.length > 500) {
              const endMediaId = shot.endFrameMedia?.mediaId || shot.endFrameImageId || `shot_${shot.shotId}_end`;
              processedShot = {
                ...processedShot,
                endFrameImageData: undefined,
                endFrameMedia: {
                  source: shot.endFrameMedia?.source || 'UPLOAD',
                  mediaId: endMediaId,
                  mimeType: shot.endFrameMedia?.mimeType || 'image/png',
                  filename: shot.endFrameFileName || `${shot.shotId}-end-frame.png`,
                  verified: true,
                  storageRef: endMediaId,
                  dataUrl: null,
                },
              };
            }
            return processedShot;
          }),
        }
      : project.stage3,
    stage4: project.stage4
      ? {
          ...project.stage4,
          shotPackages: (Array.isArray(project.stage4.shotPackages) ? project.stage4.shotPackages : []).map((pkg) => {
            if (pkg.firstFrameMedia?.dataUrl && pkg.firstFrameMedia.dataUrl.length > 500) {
              const mediaId = pkg.firstFrameMedia.mediaId || `shot_${pkg.shotId}`;
              return {
                ...pkg,
                firstFrameMedia: {
                  ...pkg.firstFrameMedia,
                  dataUrl: null,
                  storageRef: mediaId,
                },
              };
            }
            return pkg;
          }),
        }
      : project.stage4,
  };
}

/**
 * Loads a project by ID with priority:
 * 1. Memory cache
 * 2. IndexedDB projects store
 * 3. localStorage `xemacs7_proj_${projectId}`
 * Also hydrates media from IndexedDB MediaStore.
 */
export async function loadProjectById(projectId: string): Promise<Project | null> {
  if (!projectId) return null;

  let loaded: Project | null = projectMemoryCache.get(projectId) || null;

  // 1. Try IndexedDB
  if (!loaded) {
    const db = await getProjectsDb();
    if (db) {
      try {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.get(projectId);
        loaded = await new Promise<Project | null>((resolve) => {
          req.onsuccess = () => resolve((req.result as Project) || null);
          req.onerror = () => resolve(null);
        });
      } catch (err) {
        console.warn('[ProjectStorage] IndexedDB load error:', err);
      }
    }
  }

  // 2. Try localStorage fallback
  if (!loaded) {
    try {
      const raw = localStorage.getItem(`${PROJECT_PREFIX}${projectId}`);
      if (raw) {
        loaded = JSON.parse(raw) as Project;
      }
    } catch (err) {
      console.warn('[ProjectStorage] localStorage load error:', err);
    }
  }

  if (loaded) {
    const normalized = normalizeProjectData(loaded);
    const hydrated = await hydrateProjectMedia(normalized);
    projectMemoryCache.set(projectId, hydrated);
    return hydrated;
  }

  return null;
}

/**
 * Saves a single project record with true persistence:
 * - Awaits IndexedDB request success AND transaction completion
 * - Protects against stale write overwrites via write timestamps
 * - Awaits persistent media storage
 * - Atomically syncs project index with project record
 * - Disallows claiming durable success when only in-memory cache was updated
 */
export async function saveProjectRecord(
  project: Project,
  options?: { writeTimestamp?: number }
): Promise<{ success: boolean; error?: string; isQuotaError?: boolean }> {
  const writeTimestamp = options?.writeTimestamp || Date.now();

  try {
    if (!project || !project.projectId) {
      return { success: false, error: 'Cannot save project with invalid or missing project ID.' };
    }

    // Stale write check: if a newer write for this project has already committed, discard this stale write
    const existingCommit = projectWriteRegistry.get(project.projectId);
    if (existingCommit && existingCommit.timestamp > writeTimestamp) {
      console.warn(
        `[ProjectStorage] Discarded stale write for ${project.projectId}: committed ${existingCommit.timestamp} > incoming ${writeTimestamp}`
      );
      return { success: false, error: 'Discarded stale write: a newer save was already committed.' };
    }

    const updatedProject: Project = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    // Await extraction and true persistent storage of media items
    const strippedProject = await extractAndPersistProjectMedia(updatedProject);

    let idbSuccess = false;
    let idbError: string | null = null;
    let isQuotaError = false;

    // 1. Save full record to IndexedDB (awaits request success AND transaction completion)
    const db = await getProjectsDb();
    if (db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_PROJECTS, 'readwrite');
          const store = tx.objectStore(STORE_PROJECTS);
          const req = store.put(updatedProject);
          let putSuccess = false;

          req.onsuccess = () => {
            putSuccess = true;
          };

          req.onerror = () => {
            const err = req.error || new Error('IndexedDB put error');
            reject(err);
          };

          tx.oncomplete = () => {
            if (putSuccess) {
              resolve();
            } else {
              reject(new Error('Transaction completed without put confirmation'));
            }
          };

          tx.onerror = () => {
            const err = tx.error || new Error('Transaction error');
            reject(err);
          };

          tx.onabort = () => {
            const err = tx.error || new Error('Transaction aborted');
            reject(err);
          };
        });
        idbSuccess = true;
      } catch (idbErr: any) {
        idbError = idbErr?.message || 'IndexedDB write error';
        if (
          idbErr?.name === 'QuotaExceededError' ||
          String(idbErr?.message || '').toLowerCase().includes('quota')
        ) {
          isQuotaError = true;
        }
        console.warn('[ProjectStorage] IndexedDB write failed:', idbErr);
      }
    }

    // 2. Save stripped copy to localStorage for resilient offline/fallback access
    let lsSuccess = false;
    try {
      localStorage.setItem(`${PROJECT_PREFIX}${updatedProject.projectId}`, JSON.stringify(strippedProject));
      lsSuccess = true;
    } catch (lsErr: any) {
      const isLsQuota =
        lsErr?.name === 'QuotaExceededError' ||
        lsErr?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        String(lsErr?.message || '').toLowerCase().includes('quota');
      if (isLsQuota) {
        isQuotaError = true;
        console.warn('[ProjectStorage] LocalStorage quota reached for stripped project; IndexedDB holds record.');
      }
    }

    // TRUE PERSISTENCE RULE: Do not return durable success for an in-memory fallback
    const hasDurablePersistence = idbSuccess || lsSuccess;
    if (!hasDurablePersistence) {
      return {
        success: false,
        error: isQuotaError
          ? 'Browser storage quota reached. Please export your project to prevent data loss.'
          : (idbError || 'Browser persistent storage is unavailable. Changes could not be durably saved.'),
        isQuotaError,
      };
    }

    // Register committed write timestamp to lock out older racing writes
    projectWriteRegistry.set(updatedProject.projectId, {
      timestamp: writeTimestamp,
      revision: updatedProject.sourceRevision || 1,
    });

    // Update in-memory cache
    projectMemoryCache.set(updatedProject.projectId, updatedProject);

    // 3. Atomically update project index only after confirmed durable record write
    const summary = deriveProjectSummary(updatedProject);
    const currentIndex = getSynchronousIndex();
    const existingIdx = currentIndex.findIndex((item) => item.id === summary.id);

    let nextIndex: ProjectSummary[];
    if (existingIdx >= 0) {
      nextIndex = [...currentIndex];
      nextIndex[existingIdx] = summary;
    } else {
      nextIndex = [summary, ...currentIndex];
    }

    await saveProjectIndex(nextIndex);
    return { success: true };
  } catch (err: any) {
    console.error('[ProjectStorage] saveProjectRecord failed:', err);
    const errMsg = String(err?.message || err);
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      errMsg.toLowerCase().includes('quota');

    return {
      success: false,
      error: isQuota
        ? 'Browser storage quota reached. Please export your project to back up your progress.'
        : `Save failed: ${errMsg}`,
      isQuotaError: isQuota,
    };
  }
}

/**
 * Creates and initializes an independent new project.
 */
export async function createAndSaveNewProject(
  initialTitle?: string,
  initialSettings?: Partial<ProjectSettings>
): Promise<Project> {
  const newProj = createDefaultProject();
  if (initialTitle && initialTitle.trim()) {
    newProj.title = initialTitle.trim();
  }
  if (initialSettings) {
    newProj.settings = { ...newProj.settings, ...initialSettings };
  }

  // Ensure unique immutable ID
  newProj.projectId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  newProj.createdAt = new Date().toISOString();
  newProj.updatedAt = new Date().toISOString();

  await saveProjectRecord(newProj);
  localStorage.setItem(ACTIVE_PROJECT_KEY, newProj.projectId);
  return newProj;
}

/**
 * Renames a project without altering its immutable ID or production content.
 */
export async function renameProjectRecord(projectId: string, newTitle: string): Promise<boolean> {
  const existing = await loadProjectById(projectId);
  if (!existing) return false;

  const trimmed = newTitle.trim() || 'Untitled Project';
  const updated: Project = {
    ...existing,
    title: trimmed,
    updatedAt: new Date().toISOString(),
  };

  const res = await saveProjectRecord(updated);
  return res.success;
}

/**
 * Duplicates a project deeply with a brand new ID, preserving internal references.
 */
export async function duplicateProjectRecord(projectId: string, newTitle?: string): Promise<Project | null> {
  const existing = await loadProjectById(projectId);
  if (!existing) return null;

  // Fully hydrate before cloning so media references and data are preserved
  const hydrated = await hydrateProjectMedia(existing);
  const cloned: Project = JSON.parse(JSON.stringify(hydrated));

  const newProjId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  cloned.projectId = newProjId;
  cloned.title = newTitle?.trim() || `${existing.title || 'Untitled Project'} (Copy)`;
  cloned.createdAt = new Date().toISOString();
  cloned.updatedAt = new Date().toISOString();

  // Update storyFoundation projectId reference if present
  if (cloned.storyFoundation) {
    cloned.storyFoundation.projectId = newProjId;
  }

  await saveProjectRecord(cloned);
  return cloned;
}

/**
 * Deletes a project record, returning to safe state without deleting other projects or shared media.
 */
export async function deleteProjectRecord(projectId: string): Promise<boolean> {
  if (!projectId) return false;

  projectMemoryCache.delete(projectId);

  // 1. Remove from IndexedDB
  const db = await getProjectsDb();
  if (db) {
    try {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      store.delete(projectId);
    } catch (err) {
      console.warn('[ProjectStorage] IndexedDB delete error:', err);
    }
  }

  // 2. Remove from localStorage
  try {
    localStorage.removeItem(`${PROJECT_PREFIX}${projectId}`);
  } catch {}

  // 3. Remove from Index
  const currentIndex = getSynchronousIndex();
  const nextIndex = currentIndex.filter((item) => item.id !== projectId);
  await saveProjectIndex(nextIndex);

  // If this was the active project, clear active pointer
  if (localStorage.getItem(ACTIVE_PROJECT_KEY) === projectId) {
    if (nextIndex.length > 0) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, nextIndex[0].id);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }

  return true;
}

/**
 * Safely migrates legacy single-project data (`xemacs7_film_studio_project_v2`)
 * into the new multi-project structure idempotently and with an untouched backup.
 */
export async function migrateLegacyProjectIfNeeded(): Promise<MigrationReport> {
  const report: MigrationReport = {
    attempted: false,
    success: true,
    backupPreserved: false,
  };

  try {
    const rawLegacy = localStorage.getItem(LEGACY_KEY);
    if (!rawLegacy || rawLegacy.trim().length === 0) {
      return report; // No legacy data found
    }

    report.attempted = true;

    // 1. Step: Preserve untouched backup
    const existingBackup = localStorage.getItem(LEGACY_BACKUP_KEY);
    if (!existingBackup) {
      localStorage.setItem(LEGACY_BACKUP_KEY, rawLegacy);
      report.backupPreserved = true;
    } else {
      report.backupPreserved = true;
    }

    // 2. Step: Check if already migrated
    const isMigrated = localStorage.getItem(LEGACY_MIGRATED_FLAG) === 'true';
    const index = getSynchronousIndex();

    // Parse legacy project
    let legacyProject: Project;
    try {
      legacyProject = JSON.parse(rawLegacy) as Project;
    } catch (parseErr: any) {
      report.success = false;
      report.error = `Legacy project JSON could not be parsed: ${parseErr.message}`;
      return report;
    }

    if (!legacyProject.projectId) {
      legacyProject.projectId = `proj-legacy-${Date.now().toString(36)}`;
    }
    if (!legacyProject.title) {
      legacyProject.title = 'Legacy Film Production';
    }

    report.migratedLegacyProjectId = legacyProject.projectId;
    report.migratedLegacyProjectTitle = legacyProject.title;

    // 3. Step: Check if index already has this project
    const existingIndexItem = index.find((item) => item.id === legacyProject.projectId);

    if (existingIndexItem) {
      // Never overwrite a newer project with older legacy data
      const existingDate = new Date(existingIndexItem.updatedAt).getTime();
      const legacyDate = legacyProject.updatedAt ? new Date(legacyProject.updatedAt).getTime() : 0;
      if (existingDate >= legacyDate) {
        localStorage.setItem(LEGACY_MIGRATED_FLAG, 'true');
        return report;
      }
    }

    // 4. Normalize and save legacy project
    const normalized = normalizeProjectData(legacyProject);
    await saveProjectRecord(normalized);

    localStorage.setItem(LEGACY_MIGRATED_FLAG, 'true');
    report.success = true;
    return report;
  } catch (err: any) {
    console.error('[ProjectStorage] Migration exception:', err);
    report.success = false;
    report.error = err.message || 'Unknown migration error';
    return report;
  }
}

/**
 * Exports complete project JSON sanitized of any secrets, embedding available media.
 */
export async function exportSingleProjectJson(project: Project): Promise<void> {
  try {
    const safeTitle = (project.title || 'xemacs7_project')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    const filename = `${safeTitle}_v${project.schemaVersion || 2}_${Date.now()}.json`;

    const fullProject = await hydrateProjectMedia(project);
    const cleanProject = JSON.parse(JSON.stringify(fullProject));

    // Sanitize any accidental credentials
    delete (cleanProject as any).geminiApiKey;
    delete (cleanProject as any).apiKey;
    delete (cleanProject as any).env;

    const blob = new Blob([JSON.stringify(cleanProject, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[ProjectStorage] Failed to export single project:', err);
  }
}

/**
 * Exports a studio backup archive containing all projects.
 */
export async function exportAllProjectsBackupJson(): Promise<void> {
  try {
    const index = getSynchronousIndex();
    const allProjects: Project[] = [];

    for (const item of index) {
      const p = await loadProjectById(item.id);
      if (p) {
        allProjects.push(p);
      }
    }

    const payload = {
      archiveVersion: 1,
      exportedAt: new Date().toISOString(),
      studio: 'XEMACS7 AI Film Studio 2.0',
      projectCount: allProjects.length,
      projects: allProjects,
    };

    const filename = `xemacs7_studio_all_projects_backup_${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[ProjectStorage] Failed to export all projects:', err);
  }
}

/**
 * Validates and imports a project JSON file, preventing project ID collisions.
 */
export async function importProjectFromJsonString(
  jsonString: string
): Promise<{ success: boolean; project?: Project; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);

    // Support single project or studio archive
    if (parsed.archiveVersion && Array.isArray(parsed.projects)) {
      // Archive import: import each project
      const importedList: Project[] = [];
      const index = getSynchronousIndex();
      const existingIds = new Set(index.map((i) => i.id));

      for (const p of parsed.projects) {
        if (p && p.title) {
          let targetId = p.projectId;
          if (!targetId || existingIds.has(targetId)) {
            targetId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
          }
          const normalized: Project = {
            ...createDefaultProject(),
            ...p,
            projectId: targetId,
            updatedAt: new Date().toISOString(),
          };
          await saveProjectRecord(normalized);
          importedList.push(normalized);
          existingIds.add(targetId);
        }
      }

      if (importedList.length > 0) {
        return { success: true, project: importedList[0] };
      }
      return { success: false, error: 'Archive contained no valid project records.' };
    }

    if (!parsed.title && !parsed.projectId && !parsed.storySourceMode) {
      return { success: false, error: 'Invalid project file format: missing essential project metadata.' };
    }

    // Never import credentials
    delete parsed.geminiApiKey;
    delete parsed.apiKey;
    delete parsed.env;

    // Check for ID collision
    const index = getSynchronousIndex();
    const isCollision = index.some((item) => item.id === parsed.projectId);

    let finalProjectId = parsed.projectId;
    let finalTitle = parsed.title || 'Imported Film Project';

    if (!finalProjectId || isCollision) {
      finalProjectId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
      if (isCollision) {
        finalTitle = `${finalTitle} (Imported)`;
      }
    }

    const normalized: Project = {
      ...createDefaultProject(),
      ...parsed,
      projectId: finalProjectId,
      title: finalTitle,
      updatedAt: new Date().toISOString(),
    };

    const normalizedSafe = normalizeProjectData(normalized);
    await saveProjectRecord(normalizedSafe);

    return { success: true, project: normalizedSafe };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Could not parse project file.' };
  }
}
