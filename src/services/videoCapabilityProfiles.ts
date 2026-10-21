/**
 * Video Model Capability Profiles for Google Flow & Veo
 * Governs supported durations, aspect ratios, audio generation,
 * Ingredients & Frames input modes with updatable verification states.
 */

export interface VideoModelCapabilityProfile {
  id: string;
  name: string;
  family: 'VEO' | 'FLOW' | 'CUSTOM';
  version: string;
  supportedDurations: Array<6 | 8 | 10>;
  supportedAspectRatios: Array<'16:9' | '9:16' | '1:1'>;
  supportsIngredients: boolean;
  maxIngredientsCount: number;
  supportsFrames: boolean;
  supportsLastFrame: boolean;
  supportsTextToVideo: boolean;
  supportsNativeAudio: boolean;
  verificationStatus: 'VERIFIED' | 'CAPABILITY_UNVERIFIED';
  recommendedUse: string;
}

export const VERIFIED_CAPABILITY_PROFILES: Record<string, VideoModelCapabilityProfile> = {
  'google-veo-2-standard': {
    id: 'google-veo-2-standard',
    name: 'Google Veo 2 / Flow Standard',
    family: 'VEO',
    version: '2.0-std',
    supportedDurations: [6, 8],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportsIngredients: true,
    maxIngredientsCount: 3,
    supportsFrames: true,
    supportsLastFrame: true,
    supportsTextToVideo: true,
    supportsNativeAudio: true,
    verificationStatus: 'VERIFIED',
    recommendedUse: 'Standard production pipeline for cinematic high-fidelity clips with character/environment consistency',
  },
  'google-veo-2-turbo': {
    id: 'google-veo-2-turbo',
    name: 'Google Veo 2 Turbo (Fast Draft)',
    family: 'VEO',
    version: '2.0-turbo',
    supportedDurations: [6, 8],
    supportedAspectRatios: ['16:9', '9:16'],
    supportsIngredients: true,
    maxIngredientsCount: 2,
    supportsFrames: true,
    supportsLastFrame: false,
    supportsTextToVideo: true,
    supportsNativeAudio: false,
    verificationStatus: 'VERIFIED',
    recommendedUse: 'Fast iteration and rapid previz video generation with lower latency',
  },
  'google-flow-pro': {
    id: 'google-flow-pro',
    name: 'Google Flow Pro Studio (High-Fidelity)',
    family: 'FLOW',
    version: '2.5-pro',
    supportedDurations: [6, 8, 10],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportsIngredients: true,
    maxIngredientsCount: 4,
    supportsFrames: true,
    supportsLastFrame: true,
    supportsTextToVideo: true,
    supportsNativeAudio: true,
    verificationStatus: 'VERIFIED',
    recommendedUse: 'Professional studio multi-asset composite and complex continuity shots',
  },
  'unverified-external-engine': {
    id: 'unverified-external-engine',
    name: 'External Flow Engine (Unverified)',
    family: 'CUSTOM',
    version: 'custom',
    supportedDurations: [6, 8, 10],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportsIngredients: true,
    maxIngredientsCount: 3,
    supportsFrames: true,
    supportsLastFrame: false,
    supportsTextToVideo: true,
    supportsNativeAudio: false,
    verificationStatus: 'CAPABILITY_UNVERIFIED',
    recommendedUse: 'User-specified or experimental generation engine',
  },
};

export const DEFAULT_MODEL_ID = 'google-veo-2-standard';

export function getCapabilityProfile(modelIdOrName?: string): VideoModelCapabilityProfile {
  if (!modelIdOrName) {
    return VERIFIED_CAPABILITY_PROFILES[DEFAULT_MODEL_ID];
  }

  // Exact ID match
  if (VERIFIED_CAPABILITY_PROFILES[modelIdOrName]) {
    return VERIFIED_CAPABILITY_PROFILES[modelIdOrName];
  }

  // Match by name or legacy string
  const lower = modelIdOrName.toLowerCase();
  if (lower.includes('turbo')) {
    return VERIFIED_CAPABILITY_PROFILES['google-veo-2-turbo'];
  }
  if (lower.includes('pro')) {
    return VERIFIED_CAPABILITY_PROFILES['google-flow-pro'];
  }
  if (lower.includes('veo') || lower.includes('flow')) {
    return VERIFIED_CAPABILITY_PROFILES['google-veo-2-standard'];
  }

  // Fallback to unverified capability profile
  return {
    ...VERIFIED_CAPABILITY_PROFILES['unverified-external-engine'],
    name: modelIdOrName,
  };
}

export function validateShotAgainstCapability(
  shotDuration: number,
  aspectRatio: string,
  flowMode: 'INGREDIENTS' | 'FRAMES',
  profile: VideoModelCapabilityProfile
): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (profile.verificationStatus === 'CAPABILITY_UNVERIFIED') {
    warnings.push(`Target model '${profile.name}' capabilities are unverified in AI Studio.`);
  }

  if (!profile.supportedDurations.includes(shotDuration as any)) {
    warnings.push(
      `Duration ${shotDuration}s exceeds supported model durations (${profile.supportedDurations.join('s, ')}s).`
    );
  }

  if (flowMode === 'INGREDIENTS' && !profile.supportsIngredients) {
    warnings.push(`Model '${profile.name}' does not support INGREDIENTS reference images.`);
  }

  if (flowMode === 'FRAMES' && !profile.supportsFrames) {
    warnings.push(`Model '${profile.name}' does not support FRAMES keyframe input.`);
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
