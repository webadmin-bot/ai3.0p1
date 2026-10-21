import {
  AudioContinuitySheet,
  CinematicShot,
  ProjectSettings,
  ScriptScene,
  SpeechLineRecord,
  SpeechLineStatus,
  SpeechType,
  VoiceMode,
  OpeningStrategy,
} from '../types/filmStudio';

/**
 * Calculates estimated speech duration in seconds from spoken text and pacing.
 * Standard conversational pacing: ~2.6 words per second.
 * Minimum speech line duration: 1.5 seconds (to allow acoustic breath and pause).
 */
export function estimateSpeechDuration(
  text: string,
  pacing: 'SLOW' | 'NATURAL' | 'RAPID' = 'NATURAL'
): number {
  if (!text || !text.trim()) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;

  let wordsPerSecond = 2.6;
  if (pacing === 'SLOW') wordsPerSecond = 2.0;
  if (pacing === 'RAPID') wordsPerSecond = 3.3;

  const rawSeconds = words / wordsPerSecond;
  // Bounded between minimum 1.5s and rounded to one decimal place
  return Math.max(1.5, Math.round(rawSeconds * 10) / 10);
}

/**
 * Resolves effective voice mode when 'AI_DECIDE' is configured.
 */
export function resolveEffectiveVoiceMode(
  configuredMode?: VoiceMode,
  format?: string
): Exclude<VoiceMode, 'AI_DECIDE'> {
  if (configuredMode && configuredMode !== 'AI_DECIDE') {
    return configuredMode;
  }
  // Format-aware default when AI Decide is selected:
  if (format === 'Shorts/Reels') {
    return 'INTRO_NARRATION_THEN_DIALOGUE';
  }
  if (format === 'Educational' || format === 'Documentary' || format === 'Motivational') {
    return 'NARRATION_VO_ONLY';
  }
  return 'DIALOGUE_AND_NARRATION';
}

/**
 * Compiles an authoritative Audio Continuity Sheet from current screenplay scenes and shot list.
 * Single source of truth across Phase 1, Phase 2, and Phase 3.
 */
export function compileAudioContinuitySheet(params: {
  scenes: ScriptScene[];
  shots: CinematicShot[];
  settings?: ProjectSettings;
  sourceRevision?: number;
  screenplayRevision?: number;
  existingSheet?: AudioContinuitySheet;
}): AudioContinuitySheet {
  const {
    scenes = [],
    shots = [],
    settings,
    sourceRevision = 1,
    screenplayRevision = 1,
    existingSheet,
  } = params;

  const configuredVoiceMode: VoiceMode = settings?.voiceMode || 'CHARACTER_DIALOGUE_ONLY';
  const effectiveVoiceMode = resolveEffectiveVoiceMode(configuredVoiceMode, settings?.format);
  const openingStrategy: OpeningStrategy = settings?.openingStrategy || 'NONE';
  const pacing = settings?.spokenWordPacing || 'NATURAL';
  const language = settings?.language || 'English';

  // Map existing line status/shot assignments for continuity
  const existingMap = new Map<string, SpeechLineRecord>();
  if (existingSheet?.lines) {
    for (const l of existingSheet.lines) {
      existingMap.set(l.lineId, l);
    }
  }

  // If intentional No Spoken Voice:
  if (effectiveVoiceMode === 'NO_SPOKEN_VOICE') {
    return {
      version: (existingSheet?.version || 0) + 1,
      voiceMode: configuredVoiceMode,
      effectiveVoiceMode,
      openingStrategy,
      lines: [],
      totalDialogueLines: 0,
      totalNarrationLines: 0,
      unmappedCount: 0,
      overDurationCount: 0,
      compiledAt: new Date().toISOString(),
    };
  }

  const lines: SpeechLineRecord[] = [];
  let lineCounter = 1;

  // Build shot lookup by ID
  const shotMap = new Map<string, CinematicShot>();
  for (const s of shots) {
    shotMap.set(s.shotId, s);
  }

  // Iterate scenes in chronological order
  for (const scene of scenes) {
    const sceneShots = shots.filter((s) => s.sceneId === scene.sceneId);
    const dialogueBlocks = scene.dialogueBlocks || [];

    for (let dIdx = 0; dIdx < dialogueBlocks.length; dIdx++) {
      const block = dialogueBlocks[dIdx];
      const rawText = (block.dialogue || '').trim();
      if (!rawText) continue;

      const lineId = `LINE-${String(lineCounter++).padStart(2, '0')}`;
      const existing = existingMap.get(lineId) || existingMap.get(block.id);

      // Determine speech type
      let speechType: SpeechType = 'ON_SCREEN_DIALOGUE';
      const isNarrator =
        block.type === 'NARRATOR' ||
        block.type === 'VOICE_OVER' ||
        block.speakerName.toUpperCase() === 'NARRATOR' ||
        effectiveVoiceMode === 'NARRATION_VO_ONLY';

      if (isNarrator) {
        if (lineCounter === 2 && (openingStrategy === 'NARRATOR_HOOK' || effectiveVoiceMode === 'INTRO_NARRATION_THEN_DIALOGUE')) {
          speechType = 'INTRO';
        } else {
          speechType = 'VO_NARRATION';
        }
      } else if (block.type === 'OFFSCREEN') {
        speechType = 'OFF_SCREEN_DIALOGUE';
      }

      const estDuration = estimateSpeechDuration(rawText, pacing);

      // Determine shot assignment
      let targetShotId: string | null = null;
      if (existing?.shotId && shotMap.has(existing.shotId)) {
        // Preserve user's manual assignment
        targetShotId = existing.shotId;
      } else {
        // Automatic assignment:
        // 1. Look for shot whose dialogueRefs include block.id or lineId
        const explicitShot = sceneShots.find(
          (s) => (s.dialogueRefs || []).includes(block.id) || (s.dialogueRefs || []).includes(lineId)
        );
        if (explicitShot) {
          targetShotId = explicitShot.shotId;
        } else if (sceneShots.length > 0) {
          // Distribute chronologically across scene shots
          const shotIndex = Math.min(dIdx, sceneShots.length - 1);
          targetShotId = sceneShots[shotIndex].shotId;
        }
      }

      const assignedShot = targetShotId ? shotMap.get(targetShotId) : null;

      // Status and timing checks
      let lineStatus: SpeechLineStatus = 'ASSIGNED';
      let unmappedReason: string | undefined = undefined;
      let durationWarning: string | undefined = undefined;

      if (!targetShotId || !assignedShot) {
        if (existing?.lineStatus === 'EDITORIAL_VO_PENDING') {
          lineStatus = 'EDITORIAL_VO_PENDING';
          unmappedReason = existing.unmappedReason || 'Designated for global editorial audio lane';
        } else {
          lineStatus = 'UNMAPPED';
          unmappedReason = `No cinematic shot currently assigned in scene ${scene.sceneId}`;
        }
      } else {
        const shotDuration = assignedShot.duration || 8;
        if (estDuration > shotDuration) {
          lineStatus = 'OVER_DURATION';
          durationWarning = `Estimated speech length (${estDuration}s) exceeds assigned Shot ${assignedShot.shotId} duration (${shotDuration}s). Consider splitting shot or using editorial VO.`;
        }
      }

      // Lip sync is required only for visible on-screen character dialogue
      const lipSyncRequired = speechType === 'ON_SCREEN_DIALOGUE';

      lines.push({
        lineId,
        sourceRevision,
        screenplayRevision,
        sceneId: scene.sceneId,
        shotId: targetShotId,
        speakerId: isNarrator ? 'NARRATOR' : block.speakerId || 'CHAR-01',
        speakerName: isNarrator ? 'NARRATOR' : block.speakerName || 'Character',
        spokenText: rawText,
        language: block.language || language,
        speechType,
        deliveryIntent: block.deliveryIntent,
        estimatedDurationSeconds: estDuration,
        lipSyncRequired,
        lineStatus,
        unmappedReason,
        durationWarning,
      });
    }
  }

  const totalDialogue = lines.filter((l) => l.speechType === 'ON_SCREEN_DIALOGUE' || l.speechType === 'OFF_SCREEN_DIALOGUE').length;
  const totalNarration = lines.filter((l) => l.speechType === 'VO_NARRATION' || l.speechType === 'INTRO').length;
  const unmapped = lines.filter((l) => l.lineStatus === 'UNMAPPED').length;
  const overDuration = lines.filter((l) => l.lineStatus === 'OVER_DURATION').length;

  return {
    version: (existingSheet?.version || 0) + 1,
    voiceMode: configuredVoiceMode,
    effectiveVoiceMode,
    openingStrategy,
    lines,
    totalDialogueLines: totalDialogue,
    totalNarrationLines: totalNarration,
    unmappedCount: unmapped,
    overDurationCount: overDuration,
    compiledAt: new Date().toISOString(),
  };
}
