import { CinematicShot, Project, VisualAsset, ShotDuration } from '../types/filmStudio';

/**
 * Format raw seconds into standard MM:SS timecode display.
 */
export function formatSecondsToTimecode(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export interface ShotTimecodeRange {
  startSeconds: number;
  endSeconds: number;
  startFormatted: string;
  endFormatted: string;
  rangeDisplay: string;
  duration: number;
}

/**
 * Computes sequential cumulative timecode for a shot at a specific index.
 */
export function calculateShotTimecode(shots: CinematicShot[], shotIndex: number): ShotTimecodeRange {
  let elapsed = 0;
  for (let i = 0; i < shotIndex; i++) {
    elapsed += shots[i]?.duration || 8;
  }
  const currentDuration = shots[shotIndex]?.duration || 8;
  const end = elapsed + currentDuration;

  return {
    startSeconds: elapsed,
    endSeconds: end,
    startFormatted: formatSecondsToTimecode(elapsed),
    endFormatted: formatSecondsToTimecode(end),
    rangeDisplay: `${formatSecondsToTimecode(elapsed)} – ${formatSecondsToTimecode(end)}`,
    duration: currentDuration,
  };
}

/**
 * Maps all shots to their corresponding timecode ranges.
 */
export function calculateAllTimecodes(shots: CinematicShot[]): Map<string, ShotTimecodeRange> {
  const map = new Map<string, ShotTimecodeRange>();
  let elapsed = 0;

  shots.forEach((shot, index) => {
    const dur = shot.duration || 8;
    const start = elapsed;
    const end = elapsed + dur;
    map.set(shot.shotId, {
      startSeconds: start,
      endSeconds: end,
      startFormatted: formatSecondsToTimecode(start),
      endFormatted: formatSecondsToTimecode(end),
      rangeDisplay: `${formatSecondsToTimecode(start)} – ${formatSecondsToTimecode(end)}`,
      duration: dur,
    });
    elapsed = end;
  });

  return map;
}

/**
 * Intelligently constructs an authoritative, cinematic image prompt
 * inheriting approved style bible, character specs, location specs, and continuity locks.
 */
export function buildStoryboardPrompt(
  shot: CinematicShot,
  project: Project,
  frameType: 'first' | 'end' = 'first'
): string {
  const visualStyle = project.visualStyle;
  const styleBible = project.stage2?.styleBible;
  const assets: VisualAsset[] = project.stage2?.assets || [];

  // 1. Core Cinematography & Shot Size
  const shotSizeHuman = (shot.shotSize || 'MEDIUM')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const angleHuman = (shot.cameraAngle || 'EYE_LEVEL')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const moveHuman = (shot.cameraMovement || 'STATIC')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // 2. Resolve Character Descriptions
  const charDescriptions = (shot.characterIds || []).map((charId) => {
    // Check Stage 2 Asset first
    const asset = assets.find((a) => a.id === charId || a.sourceCanonIds?.includes(charId));
    // Check Canon character
    const canonChar = project.storyCanon?.characters?.find((c) => c.id === charId);

    const name = asset?.name || canonChar?.name || charId;
    const archetype = canonChar?.archetype || 'protagonist';
    const features = asset?.visualSpecification?.keyFeatures?.slice(0, 3).join(', ');
    const colors = asset?.visualSpecification?.colors?.slice(0, 2).join(' & ');

    let desc = `${name} (${archetype}`;
    if (colors) desc += `, wearing ${colors}`;
    if (features) desc += `, ${features}`;
    desc += `)`;
    return desc;
  });

  const subjectClause =
    charDescriptions.length > 0
      ? charDescriptions.join(' alongside ')
      : shot.purpose || 'Cinematic dramatic character focus';

  // 3. Resolve Location Description
  const locAsset = assets.find((a) => a.id === shot.locationId || a.type === 'LOCATION');
  const canonLoc = project.storyCanon?.locations?.find((l) => l.id === shot.locationId);
  const locationName = locAsset?.name || canonLoc?.name || shot.locationId || 'Atmospheric set';
  const locationAtmosphere =
    locAsset?.visualSpecification?.summary ||
    canonLoc?.moodAtmosphere ||
    canonLoc?.description ||
    'detailed architectural environment';

  // 4. Props
  const propNames = (shot.propIds || []).map((pId) => {
    const propAsset = assets.find((a) => a.id === pId);
    const canonProp = project.storyCanon?.props?.find((p) => p.id === pId);
    return propAsset?.name || canonProp?.name || pId;
  });
  const propsClause = propNames.length > 0 ? ` Featured story prop: ${propNames.join(', ')}.` : '';

  // 5. Lighting & Aesthetics
  const lighting =
    shot.lightingAndAtmosphere ||
    styleBible?.lightingRules ||
    visualStyle?.lightingIntent ||
    'Cinematic volumetric atmospheric lighting, high dynamic contrast';

  const lens = shot.lensIntent || '35mm anamorphic prime lens, shallow depth of field, subtle chromatic aberration';

  // 6. Staging / Blocking
  const framing = shot.framing || 'Rule of thirds composition, balanced golden ratio framing';
  const staging =
    frameType === 'first'
      ? shot.entryVisualState || shot.subjectStartPosition || shot.blockingAndMovement || 'Initial poised framing'
      : shot.exitVisualState || shot.subjectEndPosition || 'Consequent end-frame posture after movement';

  // 7. Master Aesthetic
  const masterStyleName = visualStyle?.name || 'Cinematic Film';
  const medium = visualStyle?.medium || 'Live Action Cinema';
  const realism = visualStyle?.realismLevel || 'REALISTIC';
  const colorIntent = visualStyle?.colorIntent || 'Color graded 35mm film palette';

  const frameLabel = frameType === 'first' ? 'Opening still frame keyframe' : 'Climax ending still keyframe';

  const genreStr = Array.isArray(project.settings?.genres) && project.settings.genres.length > 0
    ? project.settings.genres.join(', ')
    : 'Cinematic';
  const toneStr = project.settings?.primaryTone
    ? `${project.settings.primaryTone}${project.settings.secondaryTone ? ` & ${project.settings.secondaryTone}` : ''}`
    : (project.settings?.tone || 'Suspenseful');
  const moodClause = `Atmosphere & Mood: ${toneStr} tone, ${genreStr} cinematic aesthetics.`;

  // Compose prompt
  const parts = [
    `${masterStyleName} visual style: ${frameLabel} of shot ${shot.shotId}.`,
    `${shotSizeHuman} shot captured from a ${angleHuman} with ${moveHuman} camera framing.`,
    `Subject: ${subjectClause} positioned within ${locationName} (${locationAtmosphere}).`,
    `Staging & Action: ${staging}.${propsClause}`,
    `Cinematography: ${lens}, ${framing}.`,
    `Lighting & Palette: ${lighting}. ${colorIntent}.`,
    moodClause,
    `Production standards: ${medium}, ${realism} fidelity, high texture clarity, master composition.`,
  ];

  // Add Aspect Ratio tag
  const arTag = project.settings.aspectRatio === '9:16' ? ' --ar 9:16' : ' --ar 16:9';

  return parts.filter(Boolean).join(' ') + arTag;
}

/**
 * Creates balanced initial storyboard shots from the project's screenplay,
 * scenes, or story canon if Phase 1 has not generated shots yet.
 */
export function autoGenerateStoryboardShotsFromProject(project: Project): CinematicShot[] {
  const scenes = project.stage3?.scenes || [];
  const canon = project.storyCanon;
  const targetRuntime = project.settings?.targetRuntimeSeconds || 60;
  const defaultDurations: ShotDuration[] = [8, 8, 6, 8, 6, 8, 10, 8];

  const primaryChar = canon?.characters?.[0]?.id || 'CHAR-01';
  const secondaryChar = canon?.characters?.[1]?.id;
  const primaryLoc = canon?.locations?.[0]?.id || 'LOC-01';
  const primaryProp = canon?.props?.[0]?.id;

  // If scenes exist, build 1-2 shots per scene
  if (scenes.length > 0) {
    const generatedShots: CinematicShot[] = [];
    let order = 1;

    scenes.forEach((scene, scIdx) => {
      const sceneChars = scene.characterIds?.length > 0 ? scene.characterIds : [primaryChar];
      const sceneLoc = scene.locationId || primaryLoc;
      const sceneProps = scene.propIds || [];

      // Shot A: Establishing or Subject Entry
      const shotAId = `SHOT-${String(order).padStart(2, '0')}`;
      const durA: ShotDuration = (scIdx === 0 ? 8 : 6) as ShotDuration;
      const shotA: CinematicShot = {
        shotId: shotAId,
        sceneId: scene.sceneId,
        order: order++,
        duration: durA,
        purpose: `Establish ${scene.title || `Scene ${scene.sceneNumber}`}: ${scene.entryState || 'Subject enters spatial environment'}`,
        sourceBeatIds: scene.beatIds || [],
        characterIds: sceneChars,
        wardrobeIds: scene.wardrobeIds || [],
        propIds: sceneProps,
        locationId: sceneLoc,
        shotSize: scIdx === 0 ? 'WIDE' : 'MEDIUM_WIDE',
        cameraAngle: 'EYE_LEVEL',
        lensIntent: '28mm anamorphic, deep depth of field',
        framing: 'Geometric architectural framing',
        cameraMovement: 'SLOW_PUSH_IN',
        subjectStartPosition: 'Mid-ground framing',
        subjectEndPosition: 'Subtle advance into frame',
        blockingAndMovement: scene.actionBlocks?.[0]?.description || 'Subject observes surroundings with tension.',
        performanceNotes: scene.emotionalState || 'Focused, observant presence',
        eyeline: 'Across scene toward key focal point',
        lightingAndAtmosphere: scene.timeOfDay ? `${scene.timeOfDay} atmospheric ambient lighting` : 'Volumetric directional light',
        screenDirection: 'Left to Right',
        dialogueRefs: scene.dialogueBlocks?.[0] ? [scene.dialogueBlocks[0].dialogue] : [],
        dialogueText: scene.dialogueBlocks?.[0] ? `${scene.dialogueBlocks[0].speakerName}: "${scene.dialogueBlocks[0].dialogue}"` : undefined,
        narrationText: project.settings.narration !== 'No Narrator' ? `The silence before the revelation.` : undefined,
        sfxText: scene.audioCues?.[0]?.description || 'Low room tone and distant environmental reverberation',
        audioContext: 'Atmospheric subtle suspense tone',
        entryVisualState: 'Crisp initial silence',
        exitVisualState: 'Heightened attention',
        flowMode: 'INGREDIENTS',
        routingReason: 'Atmospheric scene setting and character establishment',
        routingConfidence: 0.95,
        routeManualOverride: false,
        ingredientAssetIds: [sceneChars[0], sceneLoc].filter(Boolean),
        firstFramePrompt: null,
        endFramePrompt: null,
        referenceReadiness: 'READY',
        continuityNotes: [
          `Scene ${scene.sceneNumber} opening continuity`,
          `Location locked to ${sceneLoc}`,
        ],
        generationComplexity: 'MEDIUM',
      };
      shotA.firstFramePrompt = buildStoryboardPrompt(shotA, project, 'first');
      generatedShots.push(shotA);

      // Shot B: Intimate Dramatic Beat / Dialogue
      const shotBId = `SHOT-${String(order).padStart(2, '0')}`;
      const durB: ShotDuration = 8;
      const shotB: CinematicShot = {
        shotId: shotBId,
        sceneId: scene.sceneId,
        order: order++,
        duration: durB,
        purpose: `Dramatic escalation in ${scene.title || `Scene ${scene.sceneNumber}`}`,
        sourceBeatIds: scene.beatIds || [],
        characterIds: sceneChars.slice(0, 2),
        wardrobeIds: scene.wardrobeIds || [],
        propIds: sceneProps,
        locationId: sceneLoc,
        shotSize: 'MEDIUM_CLOSE_UP',
        cameraAngle: 'LOW_ANGLE',
        lensIntent: '50mm prime portrait lens, f/1.8 shallow focus',
        framing: 'Rule of thirds focal isolation',
        cameraMovement: 'STEADICAM_FOLLOW',
        subjectStartPosition: 'Center-left profile',
        subjectEndPosition: 'Direct eye contact towards opponent/objective',
        blockingAndMovement: scene.actionBlocks?.[1]?.description || 'Intense realization and decisive emotional reaction.',
        performanceNotes: 'Internal conflict, resolute expression',
        eyeline: 'Intense eyeline to counterpart',
        lightingAndAtmosphere: 'High key-to-fill ratio, rim lighting defining jawline',
        screenDirection: 'Centered',
        dialogueRefs: scene.dialogueBlocks?.[1] ? [scene.dialogueBlocks[1].dialogue] : [],
        dialogueText: scene.dialogueBlocks?.[1] ? `${scene.dialogueBlocks[1].speakerName}: "${scene.dialogueBlocks[1].dialogue}"` : undefined,
        sfxText: 'Heartbeat pulse, subtle mechanical click or breath sound',
        audioContext: 'Dramatic swell in score',
        entryVisualState: 'Reaction hold',
        exitVisualState: 'Decisive move forward',
        flowMode: 'FRAMES',
        routingReason: 'Emotional character close-up requiring precise facial keyframe',
        routingConfidence: 0.92,
        routeManualOverride: false,
        ingredientAssetIds: sceneChars,
        firstFramePrompt: null,
        endFramePrompt: null,
        referenceReadiness: 'READY',
        continuityNotes: [
          `Match costume and eye-line from ${shotAId}`,
          `Lighting key matches previous shot direction`,
        ],
        generationComplexity: 'HIGH',
      };
      shotB.firstFramePrompt = buildStoryboardPrompt(shotB, project, 'first');
      shotB.endFramePrompt = buildStoryboardPrompt(shotB, project, 'end');
      generatedShots.push(shotB);
    });

    return generatedShots;
  }

  // Fallback: Build 6 standard cinematic beats matching canon
  const shotCount = Math.max(4, Math.min(10, Math.round(targetRuntime / 8)));
  const shots: CinematicShot[] = [];

  const shotSizes: Array<CinematicShot['shotSize']> = [
    'WIDE',
    'MEDIUM_WIDE',
    'MEDIUM',
    'MEDIUM_CLOSE_UP',
    'CLOSE_UP',
    'EXTREME_CLOSE_UP',
    'WIDE',
  ];
  const angles: Array<CinematicShot['cameraAngle']> = [
    'EYE_LEVEL',
    'LOW_ANGLE',
    'HIGH_ANGLE',
    'EYE_LEVEL',
    'DUTCH_TILT',
    'EYE_LEVEL',
  ];
  const moves: Array<CinematicShot['cameraMovement']> = [
    'SLOW_PUSH_IN',
    'PAN_RIGHT',
    'STATIC',
    'STEADICAM_FOLLOW',
    'ORBIT',
    'PULL_OUT',
  ];

  for (let i = 0; i < shotCount; i++) {
    const order = i + 1;
    const shotId = `SHOT-${String(order).padStart(2, '0')}`;
    const dur = defaultDurations[i % defaultDurations.length];
    const shotSize = shotSizes[i % shotSizes.length];
    const cameraAngle = angles[i % angles.length];
    const cameraMovement = moves[i % moves.length];

    const characters = i % 2 === 0 ? [primaryChar] : [primaryChar, secondaryChar].filter(Boolean) as string[];
    const props = primaryProp && i % 2 === 1 ? [primaryProp] : [];

    const shot: CinematicShot = {
      shotId,
      sceneId: 'SCENE-01',
      order,
      duration: dur,
      purpose:
        i === 0
          ? 'Opening hook: establish world and protagonist in isolation'
          : i === shotCount - 1
          ? 'Climactic cliffhanger / resolution beat'
          : `Story progression beat ${order}: escalating tension and narrative reveal`,
      sourceBeatIds: [`BEAT-0${Math.min(i + 1, 6)}`],
      characterIds: characters,
      wardrobeIds: [],
      propIds: props,
      locationId: primaryLoc,
      shotSize,
      cameraAngle,
      lensIntent: i % 2 === 0 ? '35mm anamorphic' : '50mm prime portrait',
      framing: 'Rule of thirds composition, balanced framing',
      cameraMovement,
      subjectStartPosition: 'Center frame',
      subjectEndPosition: 'Subtle shift in stance',
      blockingAndMovement: `Character executes purposeful movement under narrative tension.`,
      performanceNotes: 'Grounded cinematic presence, subtle micro-expressions',
      eyeline: 'Targeted focus',
      lightingAndAtmosphere: 'Cinematic contrast, subtle haze and volumetric rim lighting',
      screenDirection: i % 2 === 0 ? 'Left to Right' : 'Centered',
      dialogueRefs: [],
      dialogueText: i === 1 ? '“Everything changed the moment we unlocked it.”' : undefined,
      narrationText: i === 0 ? 'In the shadows of the metropolis, silence was the only currency left.' : undefined,
      sfxText: i === 0 ? 'Distant wind and industrial drone' : 'Foley footsteps and ambient hum',
      audioContext: 'Atmospheric cinematic score',
      entryVisualState: 'Initial stillness',
      exitVisualState: 'Action culmination',
      flowMode: i % 2 === 0 ? 'INGREDIENTS' : 'FRAMES',
      routingReason: 'Standard sequence progression',
      routingConfidence: 0.95,
      routeManualOverride: false,
      ingredientAssetIds: [primaryChar, primaryLoc].filter(Boolean),
      firstFramePrompt: null,
      endFramePrompt: null,
      referenceReadiness: 'READY',
      continuityNotes: [`Continuity anchor for shot ${shotId}`, `Lighting and wardrobe consistency enforced`],
      generationComplexity: 'MEDIUM',
    };

    shot.firstFramePrompt = buildStoryboardPrompt(shot, project, 'first');
    if (shot.flowMode === 'FRAMES') {
      shot.endFramePrompt = buildStoryboardPrompt(shot, project, 'end');
    }
    shots.push(shot);
  }

  return shots;
}

/**
 * Reorders storyboard shots without changing stable shot IDs.
 * Only the sequence `order` and cumulative timecodes adapt.
 */
export function reorderStoryboardShots(
  shots: CinematicShot[],
  fromIndex: number,
  toIndex: number
): CinematicShot[] {
  if (fromIndex < 0 || fromIndex >= shots.length || toIndex < 0 || toIndex >= shots.length) {
    return shots;
  }
  if (fromIndex === toIndex) return shots;

  const copy = [...shots];
  const [removed] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, removed);

  // Re-index order 1, 2, 3... preserving original shotId!
  return copy.map((shot, index) => ({
    ...shot,
    order: index + 1,
  }));
}
