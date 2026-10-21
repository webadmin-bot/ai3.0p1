/**
 * Google Flow Smart Routing Engine
 * Implements strict, intelligent auto-routing between INGREDIENTS and FRAMES.
 *
 * Rules:
 * - INGREDIENTS for independent shots, new scenes, fresh compositions,
 *   camera cuts / new angles, and shots relying on character/location/prop references.
 * - FRAMES only for GENUINE visual continuations from a specific earlier shot:
 *   same continuing action/state, staging, screen direction, location, camera compatibility.
 * - Opening establishing shots default to INGREDIENTS.
 * - Auto-FRAMES records continuationFromShotId, continuationJustification, and start-frame dependency.
 * - Manual override is honored without requiring whole-project regeneration.
 */

import { CinematicShot, ScriptScene, VisualAsset } from '../types/filmStudio';

export interface RoutingEvaluationResult {
  flowMode: 'INGREDIENTS' | 'FRAMES';
  routingReason: string;
  routingConfidence: number;
  continuationFromShotId?: string | null;
  continuationJustification?: string | null;
  continuationMediaDependency?: string | null;
  continuationMediaStatus: 'AVAILABLE' | 'IMAGE_PENDING' | 'NOT_APPLICABLE';
  isContinuation: boolean;
}

/**
 * Checks if two shots constitute a genuine visual continuation rather than an editorial cut/new angle
 */
export function isGenuineVisualContinuation(
  currentShot: CinematicShot,
  previousShot: CinematicShot | null
): { isContinuation: boolean; justification?: string } {
  if (!previousShot) {
    return {
      isContinuation: false,
      justification: 'Opening establishing shot of sequence; independent visual composition',
    };
  }

  // Different scene = different setup/timeline cut
  if (currentShot.sceneId !== previousShot.sceneId) {
    return {
      isContinuation: false,
      justification: `Scene cut from ${previousShot.sceneId} to ${currentShot.sceneId}; fresh spatial setup`,
    };
  }

  // Different location = distinct environment
  if (currentShot.locationId && previousShot.locationId && currentShot.locationId !== previousShot.locationId) {
    return {
      isContinuation: false,
      justification: `Location transition from ${previousShot.locationId} to ${currentShot.locationId}`,
    };
  }

  // Camera cut: Different camera angle (e.g. LOW_ANGLE to OVER_THE_SHOULDER) or distinct shot size jump
  // (e.g. WIDE to CLOSE_UP) represents an editorial angle cut, which must be independently composed
  const isAngleCut = currentShot.cameraAngle !== previousShot.cameraAngle;
  const isSizeJump =
    (previousShot.shotSize === 'WIDE' || previousShot.shotSize === 'EXTREME_WIDE') &&
    (currentShot.shotSize === 'CLOSE_UP' || currentShot.shotSize === 'EXTREME_CLOSE_UP');

  if (isAngleCut) {
    return {
      isContinuation: false,
      justification: `Camera angle cut from ${previousShot.cameraAngle} to ${currentShot.cameraAngle}; independent composition required`,
    };
  }

  if (isSizeJump) {
    return {
      isContinuation: false,
      justification: `Shot size transition (${previousShot.shotSize} to ${currentShot.shotSize}); independent framing`,
    };
  }

  // Action/blocking continuation check:
  // If exit visual state of previous matches or directly feeds entry state of current
  const prevExit = (previousShot.exitVisualState || '').toLowerCase();
  const currEntry = (currentShot.entryVisualState || '').toLowerCase();
  const hasContinuityAction =
    prevExit.includes('forward') ||
    prevExit.includes('walk') ||
    prevExit.includes('run') ||
    prevExit.includes('motion') ||
    currEntry.includes('continue') ||
    currEntry.includes('maintain') ||
    (previousShot.cameraMovement === currentShot.cameraMovement &&
      (previousShot.cameraMovement === 'TRACKING_LATERAL' ||
        previousShot.cameraMovement === 'STEADICAM_FOLLOW' ||
        previousShot.cameraMovement === 'SLOW_PUSH_IN'));

  // Screen direction consistency
  const sameScreenDirection =
    !currentShot.screenDirection ||
    !previousShot.screenDirection ||
    currentShot.screenDirection === previousShot.screenDirection;

  // Characters present
  const charOverlap = (currentShot.characterIds || []).some((c) =>
    (previousShot.characterIds || []).includes(c)
  );

  if (hasContinuityAction && sameScreenDirection && charOverlap) {
    return {
      isContinuation: true,
      justification: `Genuine visual continuation from shot ${previousShot.shotId}: unbroken motion vector, matching ${currentShot.screenDirection || 'screen direction'} and persistent character staging in ${currentShot.locationId}.`,
    };
  }

  return {
    isContinuation: false,
    justification: `Independent setup in ${currentShot.locationId}; distinct shot composition with ${currentShot.cameraMovement} coverage.`,
  };
}

/**
 * Evaluates the authoritative routing for a single shot
 */
export function evaluateSingleShotRouting(
  shot: CinematicShot,
  previousShot: CinematicShot | null,
  overrideMode?: 'INGREDIENTS' | 'FRAMES',
  overrideReason?: string
): RoutingEvaluationResult {
  // 1. Honor explicit user manual override
  if (overrideMode) {
    const isFrames = overrideMode === 'FRAMES';
    const hasMedia = Boolean(shot.firstFrameImageData || shot.firstFrameMedia?.verified);
    return {
      flowMode: overrideMode,
      routingReason: overrideReason || `Manual user override: Set to ${overrideMode}`,
      routingConfidence: 1.0,
      continuationFromShotId: isFrames ? previousShot?.shotId || null : null,
      continuationJustification: isFrames
        ? overrideReason || 'Manual FRAMES selection for keyframe-anchored generation'
        : null,
      continuationMediaDependency: isFrames
        ? previousShot?.firstFrameImageId || `shot_${previousShot?.shotId || shot.shotId}_keyframe`
        : null,
      continuationMediaStatus: isFrames
        ? hasMedia
          ? 'AVAILABLE'
          : 'IMAGE_PENDING'
        : 'NOT_APPLICABLE',
      isContinuation: isFrames && Boolean(previousShot),
    };
  }

  // If the shot already had a manual override saved, preserve it
  if (shot.routeManualOverride && shot.flowMode) {
    const isFrames = shot.flowMode === 'FRAMES';
    const hasMedia = Boolean(shot.firstFrameImageData || shot.firstFrameMedia?.verified);
    return {
      flowMode: shot.flowMode,
      routingReason: shot.routingReason || `Preserved manual user override: ${shot.flowMode}`,
      routingConfidence: shot.routingConfidence || 1.0,
      continuationFromShotId: shot.continuationFromShotId || (isFrames ? previousShot?.shotId || null : null),
      continuationJustification: shot.continuationJustification || (isFrames ? shot.routingReason : null),
      continuationMediaDependency: isFrames
        ? previousShot?.firstFrameImageId || `shot_${previousShot?.shotId || shot.shotId}_keyframe`
        : null,
      continuationMediaStatus: isFrames
        ? hasMedia
          ? 'AVAILABLE'
          : 'IMAGE_PENDING'
        : 'NOT_APPLICABLE',
      isContinuation: isFrames && Boolean(previousShot),
    };
  }

  // 2. Default Smart Auto-Routing
  const continuationCheck = isGenuineVisualContinuation(shot, previousShot);

  if (continuationCheck.isContinuation && previousShot) {
    // Check if previous shot has an actual persisted image
    const hasPrecedingImage = Boolean(
      previousShot.firstFrameImageData || previousShot.firstFrameMedia?.verified
    );

    return {
      flowMode: 'FRAMES',
      routingReason: continuationCheck.justification || 'Visual continuation from preceding shot',
      routingConfidence: 0.92,
      continuationFromShotId: previousShot.shotId,
      continuationJustification: continuationCheck.justification,
      continuationMediaDependency: previousShot.firstFrameImageId || `shot_${previousShot.shotId}_final_frame`,
      continuationMediaStatus: hasPrecedingImage ? 'AVAILABLE' : 'IMAGE_PENDING',
      isContinuation: true,
    };
  }

  // Default to INGREDIENTS for all independent shots, cuts, and establishing shots
  return {
    flowMode: 'INGREDIENTS',
    routingReason:
      continuationCheck.justification ||
      'Independent composition relying on master character and environment reference assets',
    routingConfidence: 0.95,
    continuationFromShotId: null,
    continuationJustification: null,
    continuationMediaDependency: null,
    continuationMediaStatus: 'NOT_APPLICABLE',
    isContinuation: false,
  };
}

/**
 * Auto-routes all shots across a project, preserving existing manual overrides
 */
export function applySmartRoutingToShots(
  shots: CinematicShot[],
  scenes: ScriptScene[] = []
): CinematicShot[] {
  if (!shots || shots.length === 0) return [];

  const routedShots: CinematicShot[] = [];

  for (let i = 0; i < shots.length; i++) {
    const current = shots[i];
    const previous = i > 0 ? routedShots[i - 1] : null;

    const evaluation = evaluateSingleShotRouting(
      current,
      previous,
      current.routeManualOverride ? current.flowMode : undefined,
      current.routeManualOverride ? current.routingReason : undefined
    );

    routedShots.push({
      ...current,
      flowMode: evaluation.flowMode,
      routingReason: evaluation.routingReason,
      routingConfidence: evaluation.routingConfidence,
      continuationFromShotId: evaluation.continuationFromShotId || null,
      continuationJustification: evaluation.continuationJustification || null,
      continuationMediaStatus: evaluation.continuationMediaStatus,
      continuationMediaId: evaluation.continuationMediaDependency || null,
    });
  }

  return routedShots;
}
