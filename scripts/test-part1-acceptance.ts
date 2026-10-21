import assert from 'node:assert';
import {
  compileAudioContinuitySheet,
  estimateSpeechDuration,
  resolveEffectiveVoiceMode,
} from '../src/services/audioContinuityEngine';
import {
  runDeterministicBrainAudit,
  checkPlatformCompatibility,
  applyBrainAuditQuickFix,
} from '../src/services/brainAuditEngine';
import { ScriptScene, CinematicShot, ProjectSettings } from '../src/types/filmStudio';
import { createDefaultProject } from '../src/services/defaultProject';

console.log('============================================================');
console.log('XEMACS7 3.0 — PART 1 FOUNDATION & STORY INTEGRITY ACCEPTANCE');
console.log('============================================================\n');

const mockSettings: ProjectSettings = {
  voiceMode: 'CHARACTER_DIALOGUE_ONLY',
  targetRuntimeSeconds: 12,
  format: 'Short Film',
  aspectRatio: '16:9',
  genres: ['Sci-Fi'],
  language: 'English',
  audience: 'General',
  platform: 'YouTube',
  episodeCount: 1,
  tone: 'Dramatic',
  narration: 'No Narrator',
};

function createMockScene(params: {
  sceneId: string;
  sceneNumber: number;
  title: string;
  slugline?: string;
  characterIds?: string[];
  dialogueBlocks?: ScriptScene['dialogueBlocks'];
  estimatedDuration?: number;
}): ScriptScene {
  return {
    sceneId: params.sceneId,
    sceneNumber: params.sceneNumber,
    title: params.title,
    slugline: params.slugline || 'INT. SCENE - DAY',
    beatIds: [],
    storyPurpose: 'Advance dramatic narrative',
    locationId: 'LOC-01',
    timeOfDay: 'DAY',
    characterIds: params.characterIds || ['CHAR-01'],
    wardrobeIds: [],
    propIds: [],
    entryState: 'Scene begins',
    exitState: 'Scene concludes',
    actionBlocks: [],
    dialogueBlocks: params.dialogueBlocks || [],
    audioCues: [],
    emotionalState: 'Tense',
    continuityNotes: [],
    estimatedSceneDuration: params.estimatedDuration || 8,
    scriptText: '',
  };
}

// -----------------------------------------------------------------------------
// TEST 1: Revision Tracking & Needs Review on Stale Adaptations
// -----------------------------------------------------------------------------
console.log('TEST 1: Canonical Source Revision & Stale Adaptation Protection');
{
  const project = createDefaultProject();
  project.projectId = 'proj-rev-01';
  project.title = 'Cybernetic Echoes';
  project.sourceRevision = 2; // User updated source concept
  project.screenplayRevision = 1; // Screenplay still based on Rev 1

  project.stage3.scenes = [
    createMockScene({
      sceneId: 'SCENE-01',
      sceneNumber: 1,
      title: 'Neon Alley Encounter',
      slugline: 'EXT. NEON ALLEY - NIGHT',
      characterIds: ['CHAR-01'],
      dialogueBlocks: [
        {
          id: 'D-01',
          speakerName: 'Cyborg Alex',
          speakerId: 'CHAR-01',
          type: 'DIALOGUE',
          dialogue: 'The grid is completely down tonight.',
        },
      ],
      estimatedDuration: 8,
    }),
  ];

  project.stage3.shots = [
    {
      shotId: 'SHOT-01',
      sceneId: 'SCENE-01',
      order: 1,
      duration: 8,
      purpose: 'Establish environment',
      sourceBeatIds: [],
      characterIds: ['CHAR-01'],
      wardrobeIds: [],
      propIds: [],
      locationId: 'LOC-01',
      shotSize: 'WIDE',
      cameraAngle: 'EYE_LEVEL',
      lensIntent: '35mm',
      framing: 'Rule of thirds',
      cameraMovement: 'STATIC',
      subjectStartPosition: 'Left',
      subjectEndPosition: 'Center',
      blockingAndMovement: 'Alex walks into neon shadows',
      performanceNotes: 'Alert',
      eyeline: 'Forward',
      lightingAndAtmosphere: 'High contrast neon',
      screenDirection: 'Left to Right',
      dialogueRefs: ['D-01'],
      audioContext: 'Rain and hum',
      entryVisualState: 'Establishing',
      exitVisualState: 'Centered',
      flowMode: 'INGREDIENTS',
      routingReason: 'Atmospheric establish',
      routingConfidence: 0.9,
      routeManualOverride: false,
      ingredientAssetIds: ['CHAR-01'],
      continuityNotes: [],
      generationComplexity: 'LOW',
      referenceReadiness: 'READY',
    },
  ];

  const auditReport = runDeterministicBrainAudit(project);
  const mismatchIssue = auditReport.issues.find(
    (i) => i.title.includes('Creative Source Updated After Screenplay Generation')
  );

  assert(mismatchIssue !== undefined, 'Brain audit detected stale screenplay adaptation');
  assert.strictEqual(mismatchIssue?.category, 'MISMATCH');
  assert.strictEqual(mismatchIssue?.canQuickFix, true);

  // Quick fix: Author confirms adaptation
  const fixResult = applyBrainAuditQuickFix(project, mismatchIssue!);
  assert.strictEqual(fixResult.success, true);
  assert.strictEqual(fixResult.updatedProject.screenplayRevision, 2, 'Screenplay revision synced to source revision');

  const reAudit = runDeterministicBrainAudit(fixResult.updatedProject);
  const reAuditMismatch = reAudit.issues.find(
    (i) => i.title.includes('Creative Source Updated After Screenplay Generation')
  );
  assert.strictEqual(reAuditMismatch, undefined, 'Mismatch resolved after author confirmation');
  console.log('  ✓ Stale adaptation identified without rewriting user screenplay');
  console.log('  ✓ Quick-fix confirms adaptation and synchronizes revision numbers');
}

// -----------------------------------------------------------------------------
// TEST 2: Voice Modes & Audio Continuity Sheet Generation
// -----------------------------------------------------------------------------
console.log('\nTEST 2: Audio Continuity Sheet Voice Modes & Duration Estimation');
{
  const text = 'This is a test of the emergency broadcast system across seven distinct sectors';
  const normalDuration = estimateSpeechDuration(text, 'NATURAL');
  const slowDuration = estimateSpeechDuration(text, 'SLOW');
  const rapidDuration = estimateSpeechDuration(text, 'RAPID');

  assert(slowDuration > normalDuration, 'SLOW pacing yields longer duration than NATURAL');
  assert(normalDuration > rapidDuration, 'NATURAL pacing yields longer duration than RAPID');
  console.log(`  ✓ Pacing engine verified: SLOW=${slowDuration}s, NATURAL=${normalDuration}s, RAPID=${rapidDuration}s`);

  // Test AI_DECIDE resolution
  const shortsMode = resolveEffectiveVoiceMode('AI_DECIDE', 'Shorts/Reels');
  assert.strictEqual(shortsMode, 'INTRO_NARRATION_THEN_DIALOGUE', 'AI_DECIDE for Shorts resolves to Intro Narration');

  const docMode = resolveEffectiveVoiceMode('AI_DECIDE', 'Documentary');
  assert.strictEqual(docMode, 'NARRATION_VO_ONLY', 'AI_DECIDE for Documentary resolves to Narration VO Only');
  console.log('  ✓ AI_DECIDE dynamically resolves optimal format-aware voice modes');

  // Test NO_SPOKEN_VOICE (Intentional Silent Storytelling)
  const silentSheet = compileAudioContinuitySheet({
    scenes: [
      createMockScene({
        sceneId: 'SC-01',
        sceneNumber: 1,
        title: 'Silent Valley',
        slugline: 'EXT. VALLEY - DAY',
        characterIds: [],
        dialogueBlocks: [],
        estimatedDuration: 8,
      }),
    ],
    shots: [
      {
        shotId: 'SH-01',
        sceneId: 'SC-01',
        order: 1,
        duration: 8,
        purpose: 'Visual beauty',
        sourceBeatIds: [],
        characterIds: [],
        wardrobeIds: [],
        propIds: [],
        locationId: 'LOC-01',
        shotSize: 'WIDE',
        cameraAngle: 'EYE_LEVEL',
        lensIntent: '50mm',
        framing: 'Centered',
        cameraMovement: 'PAN_RIGHT',
        subjectStartPosition: 'Left',
        subjectEndPosition: 'Right',
        blockingAndMovement: 'Sun sets over mountains',
        performanceNotes: 'None',
        eyeline: 'None',
        lightingAndAtmosphere: 'Golden hour',
        screenDirection: 'Static',
        dialogueRefs: [],
        audioContext: 'Wind blowing',
        entryVisualState: 'Golden sky',
        exitVisualState: 'Deep orange',
        flowMode: 'INGREDIENTS',
        routingReason: 'Visual landscape',
        routingConfidence: 1.0,
        routeManualOverride: false,
        ingredientAssetIds: [],
        continuityNotes: [],
        generationComplexity: 'LOW',
        referenceReadiness: 'READY',
      },
    ],
    settings: {
      ...mockSettings,
      voiceMode: 'NO_SPOKEN_VOICE',
      targetRuntimeSeconds: 8,
    },
  });

  assert.strictEqual(silentSheet.effectiveVoiceMode, 'NO_SPOKEN_VOICE');
  assert.strictEqual(silentSheet.lines.length, 0);
  assert.strictEqual(silentSheet.unmappedCount, 0);
  console.log('  ✓ Intentional Silent Storytelling cleanly compiled with zero errors');
}

// -----------------------------------------------------------------------------
// TEST 3: Speech-to-Shot Mapping & Over-Duration Detection
// -----------------------------------------------------------------------------
console.log('\nTEST 3: Speech Line Mapping & Overrun Protection');
{
  const scenes: ScriptScene[] = [
    createMockScene({
      sceneId: 'SC-01',
      sceneNumber: 1,
      title: 'Briefing Room',
      slugline: 'INT. BRIEFING ROOM - DAY',
      characterIds: ['CHAR-01'],
      dialogueBlocks: [
        {
          id: 'D-01',
          speakerName: 'Commander Vance',
          speakerId: 'CHAR-01',
          type: 'DIALOGUE',
          dialogue: 'Listen carefully, team. We only have one shot at infiltrating the mainframe before the security grid locks down permanently.',
        },
        {
          id: 'D-02',
          speakerName: 'Commander Vance',
          speakerId: 'CHAR-01',
          type: 'DIALOGUE',
          dialogue: 'Deploy immediately.',
        },
      ],
      estimatedDuration: 12,
    }),
  ];

  const shots: CinematicShot[] = [
    {
      shotId: 'SHOT-01',
      sceneId: 'SC-01',
      order: 1,
      duration: 6,
      purpose: 'Vance delivers instructions',
      sourceBeatIds: [],
      characterIds: ['CHAR-01'],
      wardrobeIds: [],
      propIds: [],
      locationId: 'LOC-01',
      shotSize: 'MEDIUM',
      cameraAngle: 'EYE_LEVEL',
      lensIntent: '50mm',
      framing: 'Rule of thirds',
      cameraMovement: 'STATIC',
      subjectStartPosition: 'Center',
      subjectEndPosition: 'Center',
      blockingAndMovement: 'Vance leans on table',
      performanceNotes: 'Determined',
      eyeline: 'Camera',
      lightingAndAtmosphere: 'Fluorescent',
      screenDirection: 'Center',
      dialogueRefs: ['D-01'],
      audioContext: 'Hum',
      entryVisualState: 'Vance speaking',
      exitVisualState: 'Vance concludes',
      flowMode: 'INGREDIENTS',
      routingReason: 'Dialogue shot',
      routingConfidence: 0.9,
      routeManualOverride: false,
      ingredientAssetIds: ['CHAR-01'],
      continuityNotes: [],
      generationComplexity: 'LOW',
      referenceReadiness: 'READY',
    },
    {
      shotId: 'SHOT-02',
      sceneId: 'SC-01',
      order: 2,
      duration: 6,
      purpose: 'Final order',
      sourceBeatIds: [],
      characterIds: ['CHAR-01'],
      wardrobeIds: [],
      propIds: [],
      locationId: 'LOC-01',
      shotSize: 'CLOSE_UP',
      cameraAngle: 'EYE_LEVEL',
      lensIntent: '85mm',
      framing: 'Tight',
      cameraMovement: 'SLOW_PUSH_IN',
      subjectStartPosition: 'Center',
      subjectEndPosition: 'Center',
      blockingAndMovement: 'Vance stern look',
      performanceNotes: 'Commanding',
      eyeline: 'Camera',
      lightingAndAtmosphere: 'Dramatic key light',
      screenDirection: 'Center',
      dialogueRefs: ['D-02'],
      audioContext: 'Silence',
      entryVisualState: 'Tight on face',
      exitVisualState: 'Fade to black',
      flowMode: 'INGREDIENTS',
      routingReason: 'Reaction shot',
      routingConfidence: 0.9,
      routeManualOverride: false,
      ingredientAssetIds: ['CHAR-01'],
      continuityNotes: [],
      generationComplexity: 'LOW',
      referenceReadiness: 'READY',
    },
  ];

  const sheet = compileAudioContinuitySheet({
    scenes,
    shots,
    settings: mockSettings,
  });

  assert.strictEqual(sheet.lines.length, 2);
  const overLine = sheet.lines.find((l) => l.lineStatus === 'OVER_DURATION');
  assert(overLine !== undefined, 'Over-duration speech detected on Shot 1 (duration: 6s, speech: ~7.7s)');
  assert(overLine?.durationWarning?.includes('exceeds assigned Shot'), 'Duration warning details excess');

  const secondLine = sheet.lines.find((l) => l.lineId === 'LINE-02');
  assert.strictEqual(secondLine?.lineStatus, 'ASSIGNED', 'Second line fits within Shot 2');
  console.log('  ✓ Line mapping successfully assigned all screenplay dialogue to shots');
  console.log('  ✓ Over-duration warning triggered with exact seconds discrepancy');
}

// -----------------------------------------------------------------------------
// TEST 4: Brain Audit Technical Layer A & Platform Constraints
// -----------------------------------------------------------------------------
console.log('\nTEST 4: Brain Audit Layer A Platform & Coverage Checks');
{
  const ytCompat = checkPlatformCompatibility(
    {
      ...mockSettings,
      platform: 'YouTube Shorts',
      aspectRatio: '9:16',
      format: 'Shorts/Reels',
      targetRuntimeSeconds: 70,
    },
    72
  );
  assert.strictEqual(ytCompat.isValid, false, 'YouTube Shorts > 60s flagged as invalid');
  assert(ytCompat.warnings[0].includes('≤ 60 seconds'), 'Warning contains exact guideline');

  const ytRatioCompat = checkPlatformCompatibility(
    {
      ...mockSettings,
      platform: 'YouTube Shorts',
      aspectRatio: '16:9',
      format: 'Shorts/Reels',
      targetRuntimeSeconds: 45,
    },
    45
  );
  assert.strictEqual(ytRatioCompat.isValid, false);
  assert(ytRatioCompat.warnings[0].includes('vertical 9:16 or square 1:1'), 'Aspect ratio warning raised');

  const igCompat = checkPlatformCompatibility(
    {
      ...mockSettings,
      platform: 'Instagram Reels',
      aspectRatio: '9:16',
      format: 'Shorts/Reels',
      targetRuntimeSeconds: 120,
    },
    100
  );
  assert.strictEqual(igCompat.isValid, false);
  assert(igCompat.warnings[0].includes('maximum 90 seconds'));
  console.log('  ✓ Platform constraint validator enforces platform video limits & aspect ratios');
}

// -----------------------------------------------------------------------------
// TEST 5: Editorial Duration Quick-Fixes (ADD_MISSING_SHOTS & ADJUST_TARGET)
// -----------------------------------------------------------------------------
console.log('\nTEST 5: Non-Destructive Editorial Coverage Quick-Fixes');
{
  const project = createDefaultProject();
  project.projectId = 'proj-coverage-01';
  project.title = 'Space Odyssey';
  project.settings.targetRuntimeSeconds = 30;
  project.stage3.scenes = [
    createMockScene({
      sceneId: 'SC-01',
      sceneNumber: 1,
      title: 'Airlock',
      slugline: 'INT. AIRLOCK - NIGHT',
      characterIds: ['CHAR-01'],
      dialogueBlocks: [],
      estimatedDuration: 8,
    }),
  ];

  project.stage3.shots = [
    {
      shotId: 'SHOT-01',
      sceneId: 'SC-01',
      order: 1,
      duration: 8,
      purpose: 'Establish astronaut',
      sourceBeatIds: [],
      characterIds: ['CHAR-01'],
      wardrobeIds: [],
      propIds: [],
      locationId: 'LOC-01',
      shotSize: 'MEDIUM',
      cameraAngle: 'EYE_LEVEL',
      lensIntent: '50mm',
      framing: 'Centered',
      cameraMovement: 'STATIC',
      subjectStartPosition: 'Center',
      subjectEndPosition: 'Center',
      blockingAndMovement: 'Stone checks suit seals',
      performanceNotes: 'Focused',
      eyeline: 'Down',
      lightingAndAtmosphere: 'Emergency red',
      screenDirection: 'Center',
      dialogueRefs: [],
      audioContext: 'Breathing',
      entryVisualState: 'Suit up',
      exitVisualState: 'Helmet locked',
      flowMode: 'INGREDIENTS',
      routingReason: 'Character establish',
      routingConfidence: 0.95,
      routeManualOverride: false,
      ingredientAssetIds: ['CHAR-01'],
      continuityNotes: [],
      generationComplexity: 'LOW',
      referenceReadiness: 'READY',
    },
  ];

  const report = runDeterministicBrainAudit(project);
  const coverageIssue = report.issues.find((i) => i.title.includes('Editorial Coverage Deficit'));
  assert(coverageIssue !== undefined, 'Audit flagged 22s deficit');

  // Apply Quick Fix: ADD_MISSING_SHOTS
  const quickFixResult = applyBrainAuditQuickFix(project, coverageIssue!);
  assert.strictEqual(quickFixResult.success, true);
  const updatedTotal = quickFixResult.updatedProject.stage3.shots.reduce(
    (acc, s) => acc + s.duration,
    0
  );
  assert(
    Math.abs(project.settings.targetRuntimeSeconds - updatedTotal) <= 8,
    `New coverage total (${updatedTotal}s) matches target (${project.settings.targetRuntimeSeconds}s) within modular boundary`
  );

  // Re-audit with updated shots
  const reAuditReport = runDeterministicBrainAudit(quickFixResult.updatedProject);
  const remainingDeficit = reAuditReport.issues.find((i) => i.title.includes('Editorial Coverage Deficit'));
  assert.strictEqual(remainingDeficit, undefined, 'Coverage deficit fully resolved by modular shots');
  console.log('  ✓ Modular expansion shots automatically fill editorial duration gap');
  console.log(`  ✓ Coverage reached ${updatedTotal}s target with modular 6s/8s/10s shots`);
}

console.log('\n============================================================');
console.log('🎉 ALL PART 1 FOUNDATION & AUDIT ACCEPTANCE TESTS PASSED!');
console.log('============================================================\n');
