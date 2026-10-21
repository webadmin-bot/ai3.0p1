import {
  BrainAuditIssue,
  BrainAuditReport,
  BrainAuditCategory,
  CinematicShot,
  Project,
  ProjectSettings,
  ScriptScene,
  AudioContinuitySheet,
} from '../types/filmStudio';
import { compileAudioContinuitySheet } from './audioContinuityEngine';

/**
 * Checks platform duration and aspect ratio constraints.
 */
export function checkPlatformCompatibility(settings: ProjectSettings, editorialDuration: number): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const platform = settings.platform || 'YouTube Shorts';
  const aspectRatio = settings.aspectRatio || '9:16';

  if (platform === 'YouTube Shorts') {
    if (editorialDuration > 60) {
      warnings.push(`YouTube Shorts requires video duration ≤ 60 seconds (current editorial plan: ${editorialDuration}s).`);
    }
    if (aspectRatio !== '9:16' && aspectRatio !== '1:1') {
      warnings.push(`YouTube Shorts is optimized for vertical 9:16 or square 1:1 framing (current: ${aspectRatio}).`);
    }
  } else if (platform === 'Instagram Reels' || platform === 'Facebook Reels') {
    if (editorialDuration > 90) {
      warnings.push(`${platform} allows maximum 90 seconds for standard reel format (current: ${editorialDuration}s).`);
    }
    if (aspectRatio !== '9:16') {
      warnings.push(`${platform} strictly requires vertical 9:16 framing for full-screen display.`);
    }
  } else if (platform === 'TikTok') {
    if (editorialDuration > 600) {
      warnings.push(`TikTok standard short video maximum is 10 minutes (current: ${editorialDuration}s).`);
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * LAYER A: Purely Deterministic Technical Brain Audit (0 AI Tokens / Instant).
 * Evaluates structural invariants, source revision matching, runtime coverage, and audio continuity.
 */
export function runDeterministicBrainAudit(project: Project): BrainAuditReport {
  const issues: BrainAuditIssue[] = [];
  let issueCounter = 1;

  const scenes: ScriptScene[] = project.stage3?.scenes || [];
  const shots: CinematicShot[] = project.stage3?.shots || [];
  const settings = project.settings;
  const targetRuntime = Number(settings?.targetRuntimeSeconds) || 60;

  const sourceRev = project.sourceRevision || 1;
  const screenplayRev = project.screenplayRevision || 1;
  const shotListRev = project.shotListRevision || 1;

  // --------------------------------------------------------------------------
  // 1. Creative Source & Revision Integrity
  // --------------------------------------------------------------------------
  if (sourceRev > screenplayRev && scenes.length > 0) {
    issues.push({
      issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
      layer: 'LAYER_A_TECHNICAL',
      category: 'MISMATCH',
      severity: 'WARNING',
      affectedIds: { sourceId: project.selectedConceptId || 'SOURCE' },
      title: 'Creative Source Updated After Screenplay Generation',
      description: `Project creative source was revised (Rev ${sourceRev}), but screenplay remains at Rev ${screenplayRev}.`,
      evidence: `sourceRevision (${sourceRev}) > screenplayRevision (${screenplayRev})`,
      consequence: 'Screenplay scenes may reflect a prior story direction, character names, or premise.',
      suggestedFix: 'Review screenplay to verify adaptation fidelity, or click "Confirm Adaptation as Current" to sync revisions.',
      status: 'OPEN',
      canQuickFix: true,
      quickFixAction: 'CONFIRM_ADAPTATION',
    });
  }

  // Verify source existence
  const mode = project.storySourceMode;
  if (mode === 'OWN_STORY' || mode === 'OWN_SCRIPT') {
    if (!project.originalStoryText || project.originalStoryText.trim().length < 15) {
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'MISSING',
        severity: 'REQUIRED',
        affectedIds: { sourceId: 'OWN_STORY_INPUT' },
        title: 'Original Story / Script Text Missing',
        description: 'Mode D requires author-supplied narrative or screenplay text.',
        evidence: `Text length: ${project.originalStoryText?.length || 0} chars`,
        consequence: 'Cannot build faithful assets or shot list without author source text.',
        suggestedFix: 'Enter your original narrative text in Step 1 Specs.',
        status: 'OPEN',
      });
    }
  } else if (mode === 'ORIGINAL_IDEAS' || mode === 'DISCOVER_NICHES' || mode === 'RESEARCH_NICHE') {
    if (scenes.length > 0 && !project.selectedConceptId && (!project.concepts || project.concepts.length === 0)) {
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'MISSING',
        severity: 'WARNING',
        affectedIds: { sourceId: 'CONCEPT_SELECTION' },
        title: 'No Explicit Creative Concept Selected',
        description: 'Screenplay exists but does not link to an approved story concept.',
        evidence: 'selectedConceptId is null',
        consequence: 'Downstream visual style and character identity anchors cannot be validated against a selected deck.',
        suggestedFix: 'Select an active concept in Creative Concepts tab.',
        status: 'OPEN',
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. Screenplay & Scene Completeness
  // --------------------------------------------------------------------------
  if (scenes.length === 0) {
    issues.push({
      issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
      layer: 'LAYER_A_TECHNICAL',
      category: 'MISSING',
      severity: 'REQUIRED',
      affectedIds: {},
      title: 'Screenplay Has Zero Scenes',
      description: 'The project does not contain any screenplay scenes.',
      evidence: 'scenes.length === 0',
      consequence: 'Cannot plan cinematic camera shots without screenplay scenes.',
      suggestedFix: 'Generate or write screenplay scenes in the Screenplay Planner.',
      status: 'OPEN',
    });
  }

  // Check scene ID uniqueness
  const sceneIdSet = new Set<string>();
  for (const s of scenes) {
    if (sceneIdSet.has(s.sceneId)) {
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'CONTRADICTORY',
        severity: 'REQUIRED',
        affectedIds: { sceneId: s.sceneId },
        title: `Duplicate Scene ID Detected: ${s.sceneId}`,
        description: `Multiple screenplay scenes share the identifier ${s.sceneId}.`,
        evidence: `Duplicate key: ${s.sceneId}`,
        consequence: 'Downstream shot mapping and asset linkages will become ambiguous.',
        suggestedFix: 'Re-index scenes with unique identifiers.',
        status: 'OPEN',
      });
    }
    sceneIdSet.add(s.sceneId);
  }

  // --------------------------------------------------------------------------
  // 3. Cinematic Shot List & Scene Coverage
  // --------------------------------------------------------------------------
  if (scenes.length > 0 && shots.length === 0) {
    issues.push({
      issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
      layer: 'LAYER_A_TECHNICAL',
      category: 'MISSING',
      severity: 'REQUIRED',
      affectedIds: {},
      title: 'Cinematic Shot List Has Zero Shots',
      description: 'Screenplay scenes exist, but no camera shots have been planned.',
      evidence: 'shots.length === 0',
      consequence: 'Cannot advance to Phase 2 Pre-Production without a valid shot list.',
      suggestedFix: 'Generate shot breakdown in the Shot List tab.',
      status: 'OPEN',
    });
  }

  // Check for scenes without shots
  const shotSceneIds = new Set(shots.map((s) => s.sceneId));
  for (const scene of scenes) {
    if (!shotSceneIds.has(scene.sceneId) && shots.length > 0) {
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'INCOMPLETE',
        severity: 'REQUIRED',
        affectedIds: { sceneId: scene.sceneId },
        title: `Scene ${scene.sceneNumber} (${scene.sceneId}) Has Zero Shots`,
        description: `Screenplay Scene "${scene.title}" has no cinematic shots allocated.`,
        evidence: `No shots found referencing sceneId ${scene.sceneId}`,
        consequence: 'Scene dialogue and action will be completely absent from the visual production plan.',
        suggestedFix: `Generate or add shots linked to ${scene.sceneId}.`,
        status: 'OPEN',
      });
    }
  }

  // Check for orphan shots (shots referencing non-existent scenes)
  for (const shot of shots) {
    if (!sceneIdSet.has(shot.sceneId) && scenes.length > 0) {
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'MISMATCH',
        severity: 'REQUIRED',
        affectedIds: { shotId: shot.shotId, sceneId: shot.sceneId },
        title: `Shot ${shot.shotId} References Invalid Scene ${shot.sceneId}`,
        description: `Shot ${shot.shotId} points to a scene ID that does not exist in the screenplay.`,
        evidence: `Referenced sceneId: ${shot.sceneId}`,
        consequence: 'Visual continuity broken; shot cannot inherit scene atmosphere or characters.',
        suggestedFix: `Reassign Shot ${shot.shotId} to a valid screenplay scene.`,
        status: 'OPEN',
      });
    }

    // Validate modular shot durations (must be 6, 8, or 10s)
    if (![6, 8, 10].includes(shot.duration)) {
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'CONTRADICTORY',
        severity: 'WARNING',
        affectedIds: { shotId: shot.shotId },
        title: `Non-Standard Shot Duration: ${shot.duration}s on ${shot.shotId}`,
        description: `Shot ${shot.shotId} duration is ${shot.duration}s. AI video models require modular 6s, 8s, or 10s units.`,
        evidence: `Duration: ${shot.duration}s`,
        consequence: 'Downstream generation models may reject non-standard duration or crop footage.',
        suggestedFix: 'Adjust shot duration to exactly 6s, 8s, or 10s.',
        status: 'OPEN',
      });
    }
  }

  // --------------------------------------------------------------------------
  // 4. Audio Continuity & Speech Manifest
  // --------------------------------------------------------------------------
  const effectiveVoiceMode = settings?.voiceMode || 'CHARACTER_DIALOGUE_ONLY';
  const audioSheet =
    project.audioContinuitySheet ||
    compileAudioContinuitySheet({
      scenes,
      shots,
      settings,
      sourceRevision: sourceRev,
      screenplayRevision: screenplayRev,
    });

  if (effectiveVoiceMode === 'NO_SPOKEN_VOICE') {
    // Intentional silent storytelling mode: 0 lines is VALID!
    // But check if author inadvertently wrote spoken dialogue:
    const totalLinesInScenes = scenes.reduce((acc, s) => acc + (s.dialogueBlocks?.length || 0), 0);
    if (totalLinesInScenes > 0) {
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'CONTRADICTORY',
        severity: 'WARNING',
        affectedIds: {},
        title: 'Dialogue Present in Intentional Silent Storytelling Mode',
        description: `Voice Mode is set to "No Spoken Voice", but screenplay contains ${totalLinesInScenes} dialogue blocks.`,
        evidence: `voiceMode === NO_SPOKEN_VOICE with ${totalLinesInScenes} script lines`,
        consequence: 'Audio continuity sheet will ignore dialogue lines during generation.',
        suggestedFix: 'Switch Voice Mode to Dialogue or remove spoken lines from the screenplay.',
        status: 'OPEN',
      });
    }
  } else {
    // Non-silent project: check unmapped lines
    const unmappedLines = audioSheet.lines.filter((l) => l.lineStatus === 'UNMAPPED');
    for (const line of unmappedLines) {
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'INCOMPLETE',
        severity: 'WARNING',
        affectedIds: { lineId: line.lineId, sceneId: line.sceneId },
        title: `Unmapped Speech Line: ${line.lineId} (${line.speakerName})`,
        description: `Spoken text "${line.spokenText.slice(0, 40)}..." is not assigned to any cinematic shot.`,
        evidence: `lineStatus === 'UNMAPPED' in scene ${line.sceneId}`,
        consequence: 'This line will be dropped from visual production unless assigned to a shot or marked EDITORIAL_VO_PENDING.',
        suggestedFix: 'Assign this line to a shot in the scene, or mark it as an editorial voice-over lane.',
        status: 'OPEN',
        canQuickFix: true,
        quickFixAction: 'MARK_EDITORIAL_VO',
      });
    }

    // Check over-duration lines
    const overDurationLines = audioSheet.lines.filter((l) => l.lineStatus === 'OVER_DURATION');
    for (const line of overDurationLines) {
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'CONTRADICTORY',
        severity: 'WARNING',
        affectedIds: { lineId: line.lineId, shotId: line.shotId || undefined },
        title: `Speech Duration Exceeds Shot Length: ${line.lineId}`,
        description: line.durationWarning || `Speech duration (${line.estimatedDurationSeconds}s) exceeds shot length.`,
        evidence: `estimatedDuration: ${line.estimatedDurationSeconds}s`,
        consequence: 'Actor or narrator will not finish speaking before the video clip ends.',
        suggestedFix: 'Split the shot into two continuous camera angles or reallocate speech to an editorial track.',
        status: 'OPEN',
      });
    }

    // Check if voice mode is dialogue-only but narrator lines exist
    if (effectiveVoiceMode === 'CHARACTER_DIALOGUE_ONLY') {
      const narratorLines = audioSheet.lines.filter((l) => l.speechType === 'VO_NARRATION' || l.speakerName === 'NARRATOR');
      if (narratorLines.length > 0) {
        issues.push({
          issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
          layer: 'LAYER_A_TECHNICAL',
          category: 'MISMATCH',
          severity: 'INFO',
          affectedIds: {},
          title: 'Narration Lines in Dialogue-Only Mode',
          description: `Voice Mode is "Character Dialogue Only", but found ${narratorLines.length} narrator line(s).`,
          evidence: `Found ${narratorLines.length} narrator lines`,
          consequence: 'Narration lines will be included in the Audio Sheet as voice-over.',
          suggestedFix: 'Update Voice Mode to "Dialogue + Narration" to reflect script intention.',
          status: 'OPEN',
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 5. Editorial Runtime Coverage vs Target Runtime
  // --------------------------------------------------------------------------
  const actualEditorialDuration = shots.reduce((acc, s) => acc + (s.duration || 8), 0);
  const durationGap = targetRuntime - actualEditorialDuration;
  const isCoverageComplete = shots.length > 0 && Math.abs(durationGap) <= 8;

  if (shots.length > 0) {
    if (durationGap > 8) {
      // Significant deficit (under target by more than 8 seconds)
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'INCOMPLETE',
        severity: durationGap > 16 ? 'REQUIRED' : 'WARNING',
        affectedIds: {},
        title: `Editorial Coverage Deficit: ${durationGap}s Missing`,
        description: `Current shot plan total runtime is ${actualEditorialDuration}s, but target is ${targetRuntime}s.`,
        evidence: `Coverage: ${actualEditorialDuration}s | Target: ${targetRuntime}s | Gap: +${durationGap}s`,
        consequence: 'Video will fall significantly short of desired release length and narrative pacing target.',
        suggestedFix: `Add shots to cover remaining ${durationGap}s, or adjust target runtime to ${actualEditorialDuration}s.`,
        status: 'OPEN',
        canQuickFix: true,
        quickFixAction: 'ADD_MISSING_SHOTS',
      });
    } else if (durationGap < -12) {
      // Significant excess (over target by more than 12 seconds)
      issues.push({
        issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
        layer: 'LAYER_A_TECHNICAL',
        category: 'CONTRADICTORY',
        severity: 'WARNING',
        affectedIds: {},
        title: `Editorial Coverage Exceeds Target by ${Math.abs(durationGap)}s`,
        description: `Planned shots total ${actualEditorialDuration}s against a ${targetRuntime}s target.`,
        evidence: `Coverage: ${actualEditorialDuration}s | Target: ${targetRuntime}s | Excess: ${Math.abs(durationGap)}s`,
        consequence: 'May exceed platform maximums (e.g., 60s for YouTube Shorts).',
        suggestedFix: 'Trim shot durations or adjust target runtime to match actual coverage.',
        status: 'OPEN',
        canQuickFix: true,
        quickFixAction: 'ADJUST_TARGET_RUNTIME',
      });
    }
  }

  // --------------------------------------------------------------------------
  // 6. Platform Compatibility Verification
  // --------------------------------------------------------------------------
  const platformCheck = checkPlatformCompatibility(settings, actualEditorialDuration);
  for (const warning of platformCheck.warnings) {
    issues.push({
      issueId: `BA-DET-${String(issueCounter++).padStart(2, '0')}`,
      layer: 'LAYER_A_TECHNICAL',
      category: 'CONTRADICTORY',
      severity: 'WARNING',
      affectedIds: {},
      title: 'Platform Constraint Warning',
      description: warning,
      evidence: `Platform: ${settings.platform} | Ratio: ${settings.aspectRatio} | Duration: ${actualEditorialDuration}s`,
      consequence: 'Content may not meet platform upload criteria or may display with letterboxing.',
      suggestedFix: 'Adjust target runtime or aspect ratio in Step 1 Specs.',
      status: 'OPEN',
    });
  }

  // Calculate technical score
  const openRequired = issues.filter((i) => i.severity === 'REQUIRED' && i.status === 'OPEN').length;
  const openWarning = issues.filter((i) => i.severity === 'WARNING' && i.status === 'OPEN').length;
  const openInfo = issues.filter((i) => i.severity === 'INFO' && i.status === 'OPEN').length;

  const technicalScore = Math.max(
    0,
    Math.min(100, 100 - openRequired * 25 - openWarning * 8 - openInfo * 2)
  );

  const isApproved = openRequired === 0;

  let summary = 'Technical brain audit passed with zero blocking issues.';
  if (openRequired > 0) {
    summary = `Blocked by ${openRequired} required technical issue(s). Resolve all required items to approve Phase 1.`;
  } else if (openWarning > 0) {
    summary = `Technical validation ready for approval with ${openWarning} non-blocking advisory warning(s).`;
  }

  return {
    auditedAt: new Date().toISOString(),
    sourceRevision: sourceRev,
    screenplayRevision: screenplayRev,
    shotListRevision: shotListRev,
    isCreativeAuditStale: false,
    overallScore: technicalScore,
    isApproved,
    summary,
    layerATechnicalScore: technicalScore,
    issues,
    runtimeIntegrity: {
      targetRuntimeSeconds: targetRuntime,
      actualEditorialDurationSeconds: actualEditorialDuration,
      durationGapSeconds: durationGap,
      isCoverageComplete,
      platformDurationValid: platformCheck.isValid,
      platformWarnings: platformCheck.warnings,
    },
  };
}

/**
 * Executes safe, targeted auto-fixes for deterministic issues without regenerating user work.
 */
export function applyBrainAuditQuickFix(
  project: Project,
  issue: BrainAuditIssue
): { updatedProject: Project; success: boolean; message: string } {
  const updated = { ...project };

  if (issue.quickFixAction === 'CONFIRM_ADAPTATION' || issue.quickFixAction === 'SYNC_REVISION') {
    // Sync screenplay revision to current source revision without rewriting screenplay
    updated.screenplayRevision = updated.sourceRevision || 1;
    if (updated.phase1Workflow?.stepStatus) {
      updated.phase1Workflow.stepStatus.screenplay = 'completed';
      updated.phase1Workflow.stepStatus.shot_list = 'completed';
      updated.phase1Workflow.needsReviewReason = undefined;
    }
    return {
      updatedProject: updated,
      success: true,
      message: `Author confirmed screenplay adaptation. Synced to Source Revision ${updated.sourceRevision}.`,
    };
  }

  if (issue.quickFixAction === 'MARK_EDITORIAL_VO' && issue.affectedIds?.lineId) {
    // Mark specific line as EDITORIAL_VO_PENDING
    if (updated.audioContinuitySheet?.lines) {
      updated.audioContinuitySheet = {
        ...updated.audioContinuitySheet,
        lines: updated.audioContinuitySheet.lines.map((l) =>
          l.lineId === issue.affectedIds.lineId
            ? { ...l, lineStatus: 'EDITORIAL_VO_PENDING', unmappedReason: 'Marked by author for editorial audio track' }
            : l
        ),
      };
      return {
        updatedProject: updated,
        success: true,
        message: `Line ${issue.affectedIds.lineId} preserved on global editorial VO track.`,
      };
    }
  }

  if (issue.quickFixAction === 'ADJUST_TARGET_RUNTIME') {
    const shots = updated.stage3?.shots || [];
    const actualCoverage = shots.reduce((acc, s) => acc + (s.duration || 8), 0);
    if (actualCoverage > 0) {
      updated.settings = {
        ...updated.settings,
        targetRuntimeSeconds: actualCoverage,
      };
      return {
        updatedProject: updated,
        success: true,
        message: `Target runtime adjusted to match actual shot coverage (${actualCoverage}s).`,
      };
    }
  }

  if (issue.quickFixAction === 'ADD_MISSING_SHOTS') {
    const shots = [...(updated.stage3?.shots || [])];
    const scenes = updated.stage3?.scenes || [];
    const target = updated.settings?.targetRuntimeSeconds || 60;
    const currentDuration = shots.reduce((acc, s) => acc + (s.duration || 8), 0);
    const deficit = target - currentDuration;

    if (deficit > 0 && scenes.length > 0) {
      const lastScene = scenes[scenes.length - 1];
      let remainingDeficit = deficit;
      let orderCounter = shots.length + 1;

      while (remainingDeficit >= 6) {
        const shotDuration: 6 | 8 | 10 = remainingDeficit >= 10 ? 10 : remainingDeficit >= 8 ? 8 : 6;
        shots.push({
          shotId: `SHOT-${String(orderCounter).padStart(2, '0')}`,
          sceneId: lastScene.sceneId,
          order: orderCounter++,
          duration: shotDuration,
          purpose: 'Editorial expansion shot to complete target duration coverage',
          sourceBeatIds: [],
          characterIds: lastScene.characterIds || ['CHAR-01'],
          wardrobeIds: [],
          propIds: [],
          locationId: lastScene.locationId || 'LOC-01',
          shotSize: 'MEDIUM_CLOSE_UP',
          cameraAngle: 'EYE_LEVEL',
          lensIntent: '50mm prime',
          framing: 'Rule of thirds composition',
          cameraMovement: 'SLOW_PUSH_IN',
          subjectStartPosition: 'Center frame',
          subjectEndPosition: 'Subtle reaction hold',
          blockingAndMovement: 'Subject holds dramatic focus.',
          performanceNotes: 'Intense atmospheric pacing',
          eyeline: 'Forward off-camera',
          lightingAndAtmosphere: 'Consistent with scene key light',
          screenDirection: 'Centered',
          dialogueRefs: [],
          audioContext: 'Room tone and atmospheric music swell',
          entryVisualState: 'Continuous from prior shot',
          exitVisualState: 'Scene conclusion',
          flowMode: 'INGREDIENTS',
          routingReason: 'Coverage expansion',
          routingConfidence: 0.95,
          routeManualOverride: false,
          ingredientAssetIds: lastScene.characterIds || ['CHAR-01'],
          continuityNotes: [],
          generationComplexity: 'LOW',
          referenceReadiness: 'READY',
        });
        remainingDeficit -= shotDuration;
      }

      updated.stage3 = {
        ...updated.stage3,
        shots,
        dirty: true,
      };
      updated.shotListRevision = (updated.shotListRevision || 1) + 1;

      return {
        updatedProject: updated,
        success: true,
        message: `Added ${shots.length - updated.stage3.shots.length} shots to fulfill ${target}s target runtime coverage.`,
      };
    }
  }

  return {
    updatedProject: project,
    success: false,
    message: 'No automatic quick-fix available for this issue. Manual adjustment required.',
  };
}
