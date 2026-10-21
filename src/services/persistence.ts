import { Project, MediaReference } from '../types/filmStudio';
import { createDefaultProject } from './defaultProject';
import { saveMediaItem, getMediaItem, getAllMediaMap } from './mediaStore';
import {
  saveProjectRecord,
  loadProjectById,
  ACTIVE_PROJECT_KEY,
  getSynchronousIndex,
  stripHeavyMediaForStorage,
  normalizeProjectData,
} from './projectStorage';

export const STORAGE_KEY = 'xemacs7_film_studio_project_v2';

export interface StorageSaveResult {
  success: boolean;
  error?: string;
  isQuotaError?: boolean;
}

export function loadSavedProject(): Project {
  try {
    // 1. Check if an active project ID is recorded
    const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (activeId) {
      const cached = localStorage.getItem(`xemacs7_proj_${activeId}`);
      if (cached) {
        return normalizeProjectData(JSON.parse(cached) as Project);
      }
    }

    // 2. Check if legacy project exists
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeProjectData(JSON.parse(raw) as Project);
    }

    // 3. Check first project from index
    const index = getSynchronousIndex();
    if (index.length > 0) {
      const first = localStorage.getItem(`xemacs7_proj_${index[0].id}`);
      if (first) {
        return normalizeProjectData(JSON.parse(first) as Project);
      }
    }

    return createDefaultProject();
  } catch (err) {
    console.error('Failed to load project from storage:', err);
    return createDefaultProject();
  }
}

/**
 * Asynchronously loads stored image dataUrls from IndexedDB mediaStore into the in-memory project.
 */
export async function hydrateProjectMedia(project: Project): Promise<Project> {
  try {
    const mediaMap = await getAllMediaMap();
    if (!mediaMap || Object.keys(mediaMap).length === 0) return project;

    let hasChanges = false;
    const cloned = { ...project };

    // Hydrate Stage 2
    if (cloned.stage2?.assets) {
      cloned.stage2.assets = cloned.stage2.assets.map((asset) => {
        const refId = asset.referenceMedia?.storageRef || asset.referenceMedia?.mediaId || asset.optionalReferenceImageId;
        if (refId && mediaMap[refId] && !asset.optionalReferenceImageData) {
          hasChanges = true;
          return {
            ...asset,
            optionalReferenceImageData: mediaMap[refId],
            referenceMedia: {
              ...(asset.referenceMedia || {
                source: 'UPLOAD',
                mediaId: refId,
                mimeType: 'image/png',
                filename: `${asset.id}.png`,
                verified: true,
              }),
              dataUrl: mediaMap[refId],
              verified: true,
            },
          };
        }
        return asset;
      });
    }

    // Hydrate Stage 3
    if (cloned.stage3?.shots) {
      cloned.stage3.shots = cloned.stage3.shots.map((shot) => {
        let updatedShot = { ...shot };
        const refId = shot.firstFrameMedia?.storageRef || shot.firstFrameMedia?.mediaId || shot.firstFrameImageId;
        if (refId && mediaMap[refId] && !shot.firstFrameImageData) {
          hasChanges = true;
          updatedShot = {
            ...updatedShot,
            firstFrameImageData: mediaMap[refId],
            referenceReadiness: 'READY',
            firstFrameMedia: {
              ...(shot.firstFrameMedia || {
                source: 'UPLOAD',
                mediaId: refId,
                mimeType: 'image/png',
                filename: `${shot.shotId}-first-frame.png`,
                verified: true,
              }),
              dataUrl: mediaMap[refId],
              verified: true,
            },
          };
        }

        const endRefId = shot.endFrameMedia?.storageRef || shot.endFrameMedia?.mediaId || shot.endFrameImageId;
        if (endRefId && mediaMap[endRefId] && !shot.endFrameImageData) {
          hasChanges = true;
          updatedShot = {
            ...updatedShot,
            endFrameImageData: mediaMap[endRefId],
            endFrameMedia: {
              ...(shot.endFrameMedia || {
                source: 'UPLOAD',
                mediaId: endRefId,
                mimeType: 'image/png',
                filename: `${shot.shotId}-end-frame.png`,
                verified: true,
              }),
              dataUrl: mediaMap[endRefId],
              verified: true,
            },
          };
        }
        return updatedShot;
      });
    }

    // Hydrate Stage 4
    if (cloned.stage4?.shotPackages) {
      cloned.stage4.shotPackages = cloned.stage4.shotPackages.map((pkg) => {
        const refId = pkg.firstFrameMedia?.storageRef || pkg.firstFrameMedia?.mediaId || pkg.firstFrameImageId;
        if (refId && mediaMap[refId]) {
          hasChanges = true;
          const updatedMedia: MediaReference = {
            ...(pkg.firstFrameMedia || {
              source: 'UPLOAD',
              mediaId: refId,
              mimeType: 'image/png',
              filename: `${pkg.shotId}-first-frame.png`,
              verified: true,
            }),
            dataUrl: mediaMap[refId],
            verified: true,
          };
          const capVerified = Boolean(cloned.stage4?.targetSettings?.capabilityVerified || pkg.capabilityStatus === 'VERIFIED_COMPATIBLE');
          return {
            ...pkg,
            firstFrameMedia: updatedMedia,
            firstFrameMediaStatus: 'AVAILABLE',
            mediaReadiness: capVerified ? 'EXECUTION_READY' : 'CAPABILITY_UNVERIFIED',
          };
        }
        return pkg;
      });
    }

    return hasChanges ? cloned : project;
  } catch (err) {
    console.warn('[Persistence] Could not hydrate media from mediaStore:', err);
    return project;
  }
}

/**
 * Saves project state. Heavy base64 image strings are offloaded into IndexedDB,
 * storing only lightweight MediaReference contracts inside localStorage.
 * Returns explicit success/failure with quota diagnosis.
 */
export function saveProjectToStorage(project: Project): StorageSaveResult {
  try {
    // 1. Offload heavy media to IndexedDB mediaStore and create stripped payload for localStorage
    const strippedProject: Project = {
      ...project,
      updatedAt: new Date().toISOString(),
      stage2: project.stage2
        ? {
            ...project.stage2,
            assets: (Array.isArray(project.stage2.assets) ? project.stage2.assets : []).map((asset) => {
              if (asset.optionalReferenceImageData && asset.optionalReferenceImageData.length > 500) {
                const mediaId = asset.referenceMedia?.mediaId || asset.optionalReferenceImageId || `asset_${asset.id}`;
                saveMediaItem(mediaId, asset.optionalReferenceImageData, {
                  source: 'UPLOAD',
                  filename: asset.optionalReferenceFileName,
                }).catch(console.warn);
                return {
                  ...asset,
                  optionalReferenceImageData: undefined, // stripped from localStorage
                  referenceMedia: {
                    source: asset.referenceMedia?.source || 'UPLOAD',
                    mediaId,
                    mimeType: asset.referenceMedia?.mimeType || 'image/png',
                    filename: asset.optionalReferenceFileName || `${asset.id}.png`,
                    verified: true,
                    storageRef: mediaId,
                    dataUrl: null, // stripped from localStorage
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
              if (shot.firstFrameImageData && shot.firstFrameImageData.length > 500) {
                const mediaId = shot.firstFrameMedia?.mediaId || shot.firstFrameImageId || `shot_${shot.shotId}`;
                saveMediaItem(mediaId, shot.firstFrameImageData, {
                  source: shot.firstFrameMedia?.source || 'UPLOAD',
                  filename: shot.firstFrameFileName || undefined,
                }).catch(console.warn);
                return {
                  ...shot,
                  firstFrameImageData: undefined, // stripped from localStorage
                  firstFrameMedia: {
                    source: shot.firstFrameMedia?.source || 'UPLOAD',
                    mediaId,
                    mimeType: shot.firstFrameMedia?.mimeType || 'image/png',
                    filename: shot.firstFrameFileName || `${shot.shotId}-first-frame.png`,
                    verified: true,
                    storageRef: mediaId,
                    dataUrl: null, // stripped from localStorage
                  },
                };
              }
              return shot;
            }),
          }
        : project.stage3,
      stage4: project.stage4
        ? {
            ...project.stage4,
            shotPackages: (Array.isArray(project.stage4.shotPackages) ? project.stage4.shotPackages : []).map((pkg) => {
              if (pkg.firstFrameMedia?.dataUrl && pkg.firstFrameMedia.dataUrl.length > 500) {
                const mediaId = pkg.firstFrameMedia.mediaId || `shot_${pkg.shotId}`;
                saveMediaItem(mediaId, pkg.firstFrameMedia.dataUrl, {
                  source: pkg.firstFrameMedia.source,
                  filename: pkg.firstFrameMedia.filename,
                }).catch(console.warn);
                return {
                  ...pkg,
                  firstFrameMedia: {
                    ...pkg.firstFrameMedia,
                    dataUrl: null, // stripped from localStorage
                    storageRef: mediaId,
                  },
                };
              }
              return pkg;
            }),
          }
        : project.stage4,
    };

    const serialized = JSON.stringify(strippedProject);
    localStorage.setItem(STORAGE_KEY, serialized);
    // Also sync to multi-project storage
    saveProjectRecord(project).catch((e) => console.warn('[Persistence] Multi-project sync warning:', e));
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save project to localStorage:', err);
    const errMsg = String(err?.message || err);
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      errMsg.toLowerCase().includes('quota') ||
      errMsg.toLowerCase().includes('exceeded');

    return {
      success: false,
      error: isQuota
        ? 'Browser storage quota reached. Please export your project to back up your progress.'
        : `Storage save failed: ${errMsg}`,
      isQuotaError: isQuota,
    };
  }
}

/**
 * Exports complete project JSON.
 * Media manifest semantics: embeds real media bytes when available in accessible storage,
 * and labels external references appropriately. Never includes secrets or API keys.
 */
export async function exportProjectAsJson(project: Project): Promise<void> {
  try {
    const safeTitle = (project.title || 'xemacs7-project')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    const filename = `${safeTitle}_v${project.schemaVersion}_${Date.now()}.json`;

    // Ensure media dataUrls are attached in export payload
    const fullProject = await hydrateProjectMedia(project);

    // Sanitize any accidentally injected credentials
    const cleanProject = JSON.parse(JSON.stringify(fullProject));
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
    console.error('Failed to export project:', err);
  }
}

export function parseImportedProjectJson(jsonString: string): {
  project?: Project;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed.projectId || !parsed.storySourceMode || !parsed.settings) {
      return { error: 'Invalid project file format: missing core project identifiers or settings.' };
    }

    // Never import api keys
    delete parsed.geminiApiKey;
    delete parsed.apiKey;
    delete parsed.env;

    // Normalize state
    const normalized: Project = {
      ...createDefaultProject(),
      ...parsed,
      updatedAt: new Date().toISOString(),
    };

    return { project: normalized };
  } catch (err: any) {
    return { error: err.message || 'Invalid JSON file' };
  }
}
