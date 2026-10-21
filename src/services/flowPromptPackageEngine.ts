/**
 * Flow Prompt Package Engine
 * Synthesizes production-ready Google Flow video prompts, exact spoken dialogue,
 * reference attachment checklists, and honest completion readiness.
 */

import {
  CinematicShot,
  GoogleFlowShotPackage,
  HonestShotProductionStatus,
  MasterVisualStyle,
  Project,
  ProjectSettings,
  ReferenceChecklistItem,
  ScriptScene,
  VisualAsset,
} from '../types/filmStudio';
import { getCapabilityProfile, VideoModelCapabilityProfile } from './videoCapabilityProfiles';
import { evaluateSingleShotRouting } from './googleFlowRoutingEngine';

export interface FlowPackageSynthesisOptions {
  modelProfile?: VideoModelCapabilityProfile;
  sourceStale?: boolean;
}

/**
 * Derives exact verbatim dialogue or voice-over lines assigned to this shot from scene blocks
 */
export function extractExactSpeechForShot(
  shot: CinematicShot,
  scene?: ScriptScene
): {
  dialogueVerbatim: string;
  speakerName: string;
  speechType: string;
  speechSectionText: string;
  hasSpeech: boolean;
} {
  // 1. Check if shot has direct dialogueText
  if (shot.dialogueText && shot.dialogueText.trim()) {
    const raw = shot.dialogueText.trim();
    const speakerMatch = raw.match(/^([^:]+):\s*["']?(.*?)["']?$/);
    const speakerName = speakerMatch ? speakerMatch[1].trim() : 'Speaker';
    const cleanLine = speakerMatch ? speakerMatch[2].trim() : raw;

    return {
      dialogueVerbatim: cleanLine,
      speakerName,
      speechType: 'DIALOGUE',
      hasSpeech: true,
      speechSectionText: `[SPEECH & AUDIO DIRECTIONS]
Speaker: ${speakerName}
Type: Verbatim Spoken Dialogue
Timing: 0–${Math.min(shot.duration, 6)}s
Spoken Line: "${cleanLine}"`,
    };
  }

  // 2. Check if scene has dialogueBlocks matched by dialogueRefs
  if (scene && scene.dialogueBlocks && scene.dialogueBlocks.length > 0) {
    let matchedBlock = scene.dialogueBlocks.find((b) =>
      (shot.dialogueRefs || []).includes(b.id)
    );

    // If no explicit ID match, check if this shot order aligns with scene blocks
    if (!matchedBlock && shot.dialogueRefs && shot.dialogueRefs.length > 0) {
      matchedBlock = scene.dialogueBlocks[0];
    }

    if (matchedBlock) {
      const isVo =
        matchedBlock.type === 'VOICE_OVER' ||
        matchedBlock.type === 'INNER_VO' ||
        matchedBlock.type === 'NARRATOR';
      const speechLabel = isVo ? 'EXTERNAL VO/SOUNDTRACK' : 'CHARACTER DIALOGUE';

      return {
        dialogueVerbatim: matchedBlock.dialogue,
        speakerName: matchedBlock.speakerName,
        speechType: speechLabel,
        hasSpeech: true,
        speechSectionText: `[SPEECH & AUDIO DIRECTIONS]
Speaker: ${matchedBlock.speakerName} (${matchedBlock.speakerId || 'CHAR'})
Delivery Intent: ${matchedBlock.deliveryIntent || 'Natural & expressive'}
Audio Mode: ${speechLabel}
Timing: 0–${Math.min(shot.duration, 6)}s
Verbatim Spoken Line: "${matchedBlock.dialogue}"`,
      };
    }
  }

  // 3. Intentionally Silent / Ambience-Only
  return {
    dialogueVerbatim: '',
    speakerName: '',
    speechType: 'INTENTIONALLY_SILENT',
    hasSpeech: false,
    speechSectionText: `[SPEECH & AUDIO DIRECTIONS]
Audio Mode: INTENTIONALLY SILENT
Spoken Dialogue: None (Pure cinematic atmosphere and motivated sound design)`,
  };
}

/**
 * Builds the compact Google Flow image reference checklist
 */
export function buildFlowReferenceChecklist(
  shot: CinematicShot,
  stage2Assets: VisualAsset[],
  flowMode: 'INGREDIENTS' | 'FRAMES',
  maxIngredientsAllowed: number = 3
): ReferenceChecklistItem[] {
  const checklist: ReferenceChecklistItem[] = [];

  if (flowMode === 'FRAMES') {
    // For FRAMES, the primary visual dependency is the Start Frame
    const hasImage = Boolean(shot.firstFrameImageData || shot.firstFrameMedia?.verified);
    checklist.push({
      assetId: shot.firstFrameImageId || `KEYFRAME-${shot.shotId}`,
      assetType: 'KEYFRAME_START',
      assetName: `Shot ${shot.shotId} Opening Keyframe`,
      role: 'PRIMARY',
      promptId: shot.firstFrameImageId || undefined,
      referencePromptText: shot.firstFramePrompt || 'First frame visual composition',
      mediaStatus: hasImage ? 'AVAILABLE' : 'IMAGE_PENDING',
      notes: 'Where to attach: Attach as Primary START FRAME in Google Flow',
    });

    // If end frame prompt is specified, include as optional end frame
    if (shot.endFramePrompt && shot.endFramePrompt.trim()) {
      const hasEndImage = Boolean(shot.endFrameImageData || shot.endFrameMedia?.verified);
      checklist.push({
        assetId: shot.endFrameImageId || `ENDFRAME-${shot.shotId}`,
        assetType: 'KEYFRAME_END',
        assetName: `Shot ${shot.shotId} Ending Keyframe`,
        role: 'SECONDARY',
        promptId: shot.endFrameImageId || undefined,
        referencePromptText: shot.endFramePrompt,
        mediaStatus: hasEndImage ? 'AVAILABLE' : 'IMAGE_PENDING',
        notes: 'Where to attach: Attach as Optional END FRAME in Google Flow (if supported)',
      });
    }

    return checklist;
  }

  // For INGREDIENTS: Order by Character -> Location -> Props
  const mappedChars = stage2Assets.filter(
    (a) => a.type === 'CHARACTER' && (shot.characterIds || []).includes(a.id)
  );
  const mappedLocs = stage2Assets.filter(
    (a) => a.type === 'LOCATION' && a.id === shot.locationId
  );
  const mappedProps = stage2Assets.filter(
    (a) => a.type === 'PROP' && (shot.propIds || []).includes(a.id)
  );

  let slotIndex = 1;

  // Characters
  mappedChars.forEach((c) => {
    if (checklist.length < maxIngredientsAllowed) {
      const hasMedia = Boolean(c.optionalReferenceImageData || c.referenceMedia?.dataUrl);
      checklist.push({
        assetId: c.id,
        assetType: 'CHARACTER',
        assetName: c.name,
        role: 'PRIMARY',
        promptId: c.id,
        referencePromptText: c.referencePrompt,
        mediaStatus: hasMedia ? 'AVAILABLE' : 'IMAGE_PENDING',
        notes: `Attach in Google Flow: Reference Slot ${slotIndex++} (Character Identity)`,
      });
    }
  });

  // Location
  mappedLocs.forEach((l) => {
    if (checklist.length < maxIngredientsAllowed) {
      const hasMedia = Boolean(l.optionalReferenceImageData || l.referenceMedia?.dataUrl);
      checklist.push({
        assetId: l.id,
        assetType: 'LOCATION',
        assetName: l.name,
        role: 'ENVIRONMENT',
        promptId: l.id,
        referencePromptText: l.referencePrompt,
        mediaStatus: hasMedia ? 'AVAILABLE' : 'IMAGE_PENDING',
        notes: `Attach in Google Flow: Reference Slot ${slotIndex++} (Environment & Set Architecture)`,
      });
    }
  });

  // Props
  mappedProps.forEach((p) => {
    if (checklist.length < maxIngredientsAllowed) {
      const hasMedia = Boolean(p.optionalReferenceImageData || p.referenceMedia?.dataUrl);
      checklist.push({
        assetId: p.id,
        assetType: 'PROP',
        assetName: p.name,
        role: 'SECONDARY',
        promptId: p.id,
        referencePromptText: p.referencePrompt,
        mediaStatus: hasMedia ? 'AVAILABLE' : 'IMAGE_PENDING',
        notes: `Attach in Google Flow: Reference Slot ${slotIndex++} (Hero Story Prop)`,
      });
    }
  });

  return checklist;
}

/**
 * Calculates honest completion status based on actual saved state
 */
export function calculateHonestProductionStatus(
  shotPackage: Partial<GoogleFlowShotPackage>,
  hasRealMedia: boolean,
  isSourceStale: boolean,
  isCapabilityVerified: boolean
): HonestShotProductionStatus {
  if (isSourceStale) {
    return 'SOURCE_STALE';
  }

  const hasPrompt = Boolean(shotPackage.videoPrompt && shotPackage.videoPrompt.trim().length > 20);
  if (!hasPrompt) {
    return 'DRAFT';
  }

  if (shotPackage.flowMode === 'FRAMES') {
    if (!hasRealMedia) {
      return 'MEDIA_PENDING';
    }
    if (!isCapabilityVerified) {
      return 'CAPABILITY_UNVERIFIED';
    }
    return 'READY_FOR_FLOW';
  }

  // INGREDIENTS
  const checklist = shotPackage.referenceChecklist || [];
  const allIngredientsAvailable =
    checklist.length > 0 && checklist.every((c) => c.mediaStatus === 'AVAILABLE');

  if (!allIngredientsAvailable) {
    return 'MEDIA_PENDING';
  }

  if (!isCapabilityVerified) {
    return 'CAPABILITY_UNVERIFIED';
  }

  return 'READY_FOR_FLOW';
}

/**
 * Synthesizes a master Google Flow Video Prompt text conforming to professional prompt standards
 */
export function synthesizeVideoPromptText(
  shot: CinematicShot,
  visualStyle: MasterVisualStyle,
  settings: ProjectSettings,
  speechText?: string
): string {
  const ar = settings?.aspectRatio || '16:9';
  const duration = shot.duration || 8;
  const styleClause = visualStyle ? `${visualStyle.name} visual style, ${visualStyle.medium}` : 'Cinematic visual style';
  const lighting = shot.lightingAndAtmosphere || visualStyle?.lightingIntent || 'Cinematic volumetric contrast';
  const cameraAngle = ((shot.cameraAngle as string) || 'EYE_LEVEL').toLowerCase().replace(/_/g, ' ');
  const cameraMovement = ((shot.cameraMovement as string) || 'STATIC').toLowerCase().replace(/_/g, ' ');
  const shotSize = shot.shotSize || 'MEDIUM';
  const camera = `${shotSize} shot, ${cameraAngle} angle, ${cameraMovement}`;
  const blocking = shot.blockingAndMovement || 'Subject is staged with natural presence.';

  const parts = [
    `Cinematic film clip (${duration} seconds). ${styleClause}.`,
    `Optics & Framing: ${camera}, ${shot.lensIntent || '35mm anamorphic prime lens'}, ${shot.framing || 'Rule of thirds composition'}.`,
    `Lighting & Atmosphere: ${lighting}.`,
    `Subject Action & Choreography: ${blocking} ${shot.subjectStartPosition ? `Starting ${shot.subjectStartPosition}, moving to ${shot.subjectEndPosition}.` : ''}`,
    `Performance & Eyeline: ${shot.performanceNotes || 'Authentic cinematic emotional intensity'}, eyeline ${shot.eyeline || 'motivated by scene dynamics'}.`,
  ];

  if (speechText && speechText.trim()) {
    parts.push(`Spoken Dialogue: "${speechText.trim()}".`);
  }

  parts.push(`Continuity: Screen direction ${shot.screenDirection || 'centered'}. Unbroken physics, consistent wardrobe and environment.`);
  parts.push(`--ar ${ar}`);

  return parts.join(' ');
}

/**
 * Synthesizes a complete GoogleFlowShotPackage for a single shot
 */
export function synthesizeSingleFlowPackage(
  shot: CinematicShot,
  scene: ScriptScene | undefined,
  project: Project,
  options: FlowPackageSynthesisOptions = {}
): GoogleFlowShotPackage {
  const modelProfile = options.modelProfile || getCapabilityProfile(project.stage4?.targetSettings?.targetModel);
  const stage2Assets = project.stage2?.assets || [];
  const visualStyle = project.visualStyle;
  const settings = project.settings;

  // Speech extraction
  const speech = extractExactSpeechForShot(shot, scene);

  // Flow mode & continuation
  const flowMode = shot.flowMode || 'INGREDIENTS';
  const isFrames = flowMode === 'FRAMES';

  // Video prompt
  const videoPrompt =
    (shot as any).videoPrompt ||
    synthesizeVideoPromptText(shot, visualStyle, settings, speech.dialogueVerbatim);

  // Check real start frame media
  const hasStartFrameMedia = Boolean(
    shot.firstFrameImageData || shot.firstFrameMedia?.verified
  );

  // Reference checklist
  const referenceChecklist = buildFlowReferenceChecklist(
    shot,
    stage2Assets,
    flowMode,
    modelProfile.maxIngredientsCount
  );

  // Real first frame media record
  const firstFrameMedia = hasStartFrameMedia
    ? shot.firstFrameMedia || {
        source: 'UPLOAD' as const,
        mediaId: shot.firstFrameImageId || `shot_${shot.shotId}_frame`,
        mimeType: 'image/png',
        filename: shot.firstFrameFileName || `${shot.shotId}-first-frame.png`,
        verified: true,
        storageRef: shot.firstFrameImageId || `shot_${shot.shotId}`,
        dataUrl: shot.firstFrameImageData || null,
      }
    : null;

  // Honest status
  const isSourceStale = Boolean(
    options.sourceStale ||
      (project.sourceRevision &&
        project.screenplayRevision &&
        project.sourceRevision > project.screenplayRevision)
  );

  const honestProductionStatus = calculateHonestProductionStatus(
    { flowMode, videoPrompt, referenceChecklist },
    hasStartFrameMedia,
    isSourceStale,
    modelProfile.verificationStatus === 'VERIFIED'
  );

  const textReadiness =
    isFrames && (!shot.firstFramePrompt || !shot.firstFramePrompt.trim())
      ? 'TEXT_BLOCKED'
      : 'TEXT_READY';

  const mediaReadiness =
    honestProductionStatus === 'READY_FOR_FLOW'
      ? 'EXECUTION_READY'
      : honestProductionStatus === 'CAPABILITY_UNVERIFIED'
      ? 'CAPABILITY_UNVERIFIED'
      : 'MEDIA_PENDING';

  return {
    shotId: shot.shotId,
    sceneId: shot.sceneId,
    episodeId: (shot as any).episodeId || null,
    order: shot.order,
    purpose: shot.purpose,
    flowMode,
    plannedDuration: (shot.duration as 6 | 8 | 10) || 8,
    aspectRatio: settings.aspectRatio || '16:9',
    targetModel: modelProfile.name,
    capabilityStatus:
      modelProfile.verificationStatus === 'VERIFIED'
        ? 'VERIFIED_COMPATIBLE'
        : 'NOT_VERIFIED',
    characterIds: shot.characterIds || [],
    wardrobeIds: shot.wardrobeIds || [],
    locationId: shot.locationId,
    propIds: shot.propIds || [],
    referenceChecklist,
    firstFramePrompt:
      shot.firstFramePrompt ||
      `${visualStyle.name} opening still frame for shot ${shot.shotId}: ${shot.shotSize} framing in ${shot.locationId}.`,
    firstFrameImageId: shot.firstFrameImageId || null,
    firstFrameMedia,
    firstFrameMediaStatus: isFrames
      ? hasStartFrameMedia
        ? 'AVAILABLE'
        : 'IMAGE_PENDING'
      : 'NOT_APPLICABLE',
    endFramePrompt: shot.endFramePrompt || null,
    endFrameImageId: shot.endFrameImageId || null,
    endFrameMediaStatus: shot.endFramePrompt
      ? shot.endFrameImageData
        ? 'AVAILABLE'
        : 'IMAGE_PENDING'
      : 'NOT_APPLICABLE',
    videoPrompt,
    audioLanes: {
      dialogue: speech.dialogueVerbatim ? `${speech.speakerName}: "${speech.dialogueVerbatim}"` : 'None',
      narrationOrVO: speech.speechType.includes('VO') ? speech.dialogueVerbatim : 'None',
      ambience: `${shot.locationId} room tone, motivated atmosphere`,
      sfx: shot.sfxText || 'Motivated foley and spatial audio',
      music: 'Subtle cinematic score and harmonic drone',
      lipSyncRequired: Boolean(speech.hasSpeech && !speech.speechType.includes('VO')),
    },
    actionTiming: [
      {
        timeRange: `0–${Math.floor((shot.duration || 8) / 2)}s`,
        action: shot.subjectStartPosition
          ? `Initial staging: ${shot.subjectStartPosition}. ${shot.blockingAndMovement}`
          : shot.blockingAndMovement,
      },
      {
        timeRange: `${Math.floor((shot.duration || 8) / 2)}–${shot.duration || 8}s`,
        action: shot.subjectEndPosition
          ? `Transitioning to ${shot.subjectEndPosition}. Eye contact locked, motion settles smoothly.`
          : 'Motion vector completes smoothly without erratic frame warping.',
      },
    ],
    continuityAnchors: {
      previousShotRef: shot.continuationFromShotId || undefined,
      entryVisualState: shot.entryVisualState || 'Clean motivated composition',
      exitVisualState: shot.exitVisualState || 'Hold composition on subject',
      screenDirection: shot.screenDirection || 'Centered subject axis',
      propAndHandState: 'Held securely as staged',
      lightingAtmosphere: shot.lightingAndAtmosphere || visualStyle.lightingIntent || 'Motivated key light',
      styleConsistency: visualStyle.name,
    },
    exclusions: [
      'No camera jitter or unmotivated camera shake',
      'No character wardrobe drift or facial bone deformation',
      'No morphing hands or anatomical inconsistencies',
      'No synthetic AI compression artifacts',
    ],
    textReadiness,
    mediaReadiness,
    generationComplexity: shot.generationComplexity || 'MEDIUM',
    promptVersion: 1,
    hasUserEdits: false,
    notes: shot.continuityNotes?.join('; ') || '',
    continuationFromShotId: shot.continuationFromShotId || null,
    continuationJustification: shot.continuationJustification || null,
    continuationMediaStatus: shot.continuationMediaStatus || (isFrames ? (hasStartFrameMedia ? 'AVAILABLE' : 'IMAGE_PENDING') : 'NOT_APPLICABLE'),
    continuationMediaDependency: shot.continuationMediaId || (isFrames && shot.continuationFromShotId ? `shot_${shot.continuationFromShotId}_final_frame` : null),
    textToVideoMode: !isFrames && referenceChecklist.length === 0,
    speechSection: speech.speechSectionText,
    isContinuationFromPreceding: Boolean(shot.continuationFromShotId),
    speechDialogueVerbatim: speech.dialogueVerbatim,
    speechDeliveryIntent: speech.speechType,
    speechSpeakerName: speech.speakerName,
    speechTiming: `0–${Math.min(shot.duration, 6)}s`,
    honestProductionStatus,
  };
}

/**
 * Builds the complete copyable shot package markdown text for a single shot
 */
export function buildCompleteCopyableShotPackage(pkg: GoogleFlowShotPackage): string {
  const divider = '============================================================';
  const subDivider = '------------------------------------------------------------';

  let text = `${divider}
XEMACS7 STUDIO 3.0 — GOOGLE FLOW PRODUCTION PACKAGE
SHOT: [${pkg.shotId}] | SCENE: [${pkg.sceneId}] | DURATION: ${pkg.plannedDuration}s
ROUTE: ${pkg.flowMode} | TARGET MODEL: ${pkg.targetModel}
STATUS: ${pkg.honestProductionStatus || pkg.mediaReadiness}
${divider}

[1. MASTER VIDEO PROMPT]
${pkg.videoPrompt}

${subDivider}
[2. IMAGES TO USE IN GOOGLE FLOW]
`;

  if (pkg.flowMode === 'FRAMES') {
    text += `Mode: FRAMES (Keyframe-Guided Generation)
Required START Frame: ${pkg.firstFrameMedia?.filename || pkg.firstFrameImageId || `shot_${pkg.shotId}_keyframe`}
Status: ${pkg.firstFrameMediaStatus}
Start Frame Prompt:
"${pkg.firstFramePrompt}"

${
  pkg.continuationFromShotId
    ? `Continuation Link: Genuine visual continuation from shot [${pkg.continuationFromShotId}]
Continuation Justification: ${pkg.continuationJustification || 'Continuous action and spatial staging'}
Continuation Start Frame Media: ${pkg.continuationMediaStatus === 'AVAILABLE' ? 'Accessible & Approved' : 'IMAGE PENDING — Extract final frame from generated clip ' + pkg.continuationFromShotId}`
    : 'Establishing / Independent Keyframe'
}
`;
  } else {
    text += `Mode: INGREDIENTS (Reference Asset Image Input)
Attached Reference Checklist (${pkg.referenceChecklist.length} slots):
`;
    pkg.referenceChecklist.forEach((item, idx) => {
      text += `  Slot ${idx + 1}: [${item.assetId}] ${item.assetName} (${item.assetType})
    Role: ${item.role} | Status: ${item.mediaStatus}
    Attachment Instructions: ${item.notes || 'Attach in Google Flow reference slot'}
    Reference Prompt (for external generation):
    "${item.referencePromptText}"
`;
    });
  }

  text += `
${subDivider}
[3. SPEECH & AUDIO LANES]
${pkg.speechSection || 'Audio Mode: INTENTIONALLY SILENT'}

Audio Lane Directives:
• Dialogue Track: ${pkg.audioLanes.dialogue}
• Narration / VO: ${pkg.audioLanes.narrationOrVO}
• Environmental Ambience: ${pkg.audioLanes.ambience}
• Sound Effects: ${pkg.audioLanes.sfx}
• Musical Score: ${pkg.audioLanes.music}
• Lip-Sync Required: ${pkg.audioLanes.lipSyncRequired ? 'YES' : 'NO'}

${subDivider}
[4. TIMING & CONTINUITY CHOREOGRAPHY]
`;
  pkg.actionTiming.forEach((beat) => {
    text += `• ${beat.timeRange}: ${beat.action}\n`;
  });

  text += `
Continuity Anchors:
• Screen Direction: ${pkg.continuityAnchors.screenDirection}
• Entry Visual State: ${pkg.continuityAnchors.entryVisualState}
• Exit Visual State: ${pkg.continuityAnchors.exitVisualState}
• Lighting Atmosphere: ${pkg.continuityAnchors.lightingAtmosphere}

Negative Exclusions:
${pkg.exclusions.map((e) => `• ✕ ${e}`).join('\n')}

${divider}
`;

  return text;
}
