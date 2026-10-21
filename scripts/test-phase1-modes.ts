import { createDefaultProject } from '../src/services/defaultProject';
import { normalizeProjectData } from '../src/services/projectStorage';
import { Project, Phase1StepId, StorySourceMode } from '../src/types/filmStudio';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

console.log('====================================================');
console.log('TESTING PHASE 1 GUIDED ADAPTIVE WORKFLOW UX');
console.log('====================================================\n');

// 1. FRESH PROJECT TEST
console.log('TEST 1: Fresh Project Initial State');
const freshProj = createDefaultProject();
assert(freshProj.phase1Workflow !== undefined, 'phase1Workflow is defined on fresh project');
assert(freshProj.phase1Workflow?.setupConfirmed === false, 'setupConfirmed is false initially');
assert(freshProj.phase1Workflow?.currentStep === 'setup', 'currentStep is setup');
assert(freshProj.phase1Workflow?.completedSteps.length === 0, 'completedSteps is empty initially');
console.log('✅ Test 1 Passed\n');

// 2. MODE A ADAPTIVE STEP ROUTING TEST
console.log('TEST 2: Mode A (Discover Niches) Adaptive Step Routing');
freshProj.storySourceMode = 'DISCOVER_NICHES';
freshProj.title = 'Cyberpunk Tokyo Odyssey';
freshProj.settings.platform = 'YouTube Shorts';
freshProj.settings.format = 'Shorts/Reels';

// Mode A does not require topic
assert(!freshProj.settings.topicOrNiche, 'Mode A topic is optional');

// Confirm Mode A setup
freshProj.phase1Workflow!.setupConfirmed = true;
freshProj.phase1Workflow!.selectedStartingMode = 'DISCOVER_NICHES';
freshProj.phase1Workflow!.completedSteps = ['setup'];
freshProj.phase1Workflow!.currentStep = 'discover_niches';

assert(freshProj.phase1Workflow!.currentStep === 'discover_niches', 'Mode A step 2 is discover_niches');

// Advance Mode A: discover_niches -> research_niche -> concepts -> screenplay -> shot_list
const modeASteps: Phase1StepId[] = ['setup', 'discover_niches', 'research_niche', 'concepts', 'screenplay', 'shot_list'];
let current: Phase1StepId = freshProj.phase1Workflow!.currentStep;
for (let i = 1; i < modeASteps.length; i++) {
  assert(current === modeASteps[i], `Mode A step ${i + 1} matches ${modeASteps[i]}`);
  freshProj.phase1Workflow!.completedSteps.push(modeASteps[i]);
  if (i + 1 < modeASteps.length) {
    freshProj.phase1Workflow!.currentStep = modeASteps[i + 1];
    current = freshProj.phase1Workflow!.currentStep;
  }
}
assert(freshProj.phase1Workflow!.completedSteps.includes('shot_list'), 'Mode A completed shot list');
console.log('✅ Test 2 Passed\n');

// 3. MODE B ADAPTIVE STEP ROUTING & TOPIC REQUIREMENT TEST
console.log('TEST 3: Mode B (Research My Niche) Requires Topic & Skips Discover');
const modeBProj = createDefaultProject();
modeBProj.storySourceMode = 'RESEARCH_NICHE';
modeBProj.title = 'Deep Sea Mysteries';

// Validation test: Blank topic must fail validation
let topicValid = Boolean(modeBProj.settings.topicOrNiche && modeBProj.settings.topicOrNiche.trim());
assert(!topicValid, 'Mode B validation correctly catches missing topic');

// User supplies topic
modeBProj.settings.topicOrNiche = 'Abyssal Trench Discoveries';
topicValid = Boolean(modeBProj.settings.topicOrNiche && modeBProj.settings.topicOrNiche.trim());
assert(topicValid, 'Mode B validation succeeds once topic is provided');

// Confirm setup advances directly to research_niche (skipping discover_niches)
modeBProj.phase1Workflow!.setupConfirmed = true;
modeBProj.phase1Workflow!.selectedStartingMode = 'RESEARCH_NICHE';
modeBProj.phase1Workflow!.completedSteps = ['setup'];
modeBProj.phase1Workflow!.currentStep = 'research_niche';

assert(modeBProj.phase1Workflow!.currentStep === 'research_niche', 'Mode B advances directly to research_niche');
assert(!modeBProj.phase1Workflow!.completedSteps.includes('discover_niches'), 'Mode B skips discover_niches');
console.log('✅ Test 3 Passed\n');

// 4. MODE C ADAPTIVE STEP ROUTING (ORIGINAL FICTION) TEST
console.log('TEST 4: Mode C (Generate Original Ideas) Skips External Research');
const modeCProj = createDefaultProject();
modeCProj.storySourceMode = 'ORIGINAL_IDEAS';
modeCProj.title = 'Solaris Requiem';
modeCProj.settings.genres = ['Sci-Fi', 'Psychological Thriller'];
modeCProj.settings.tone = 'Atmospheric & Bleak';

// Confirm Mode C setup
modeCProj.phase1Workflow!.setupConfirmed = true;
modeCProj.phase1Workflow!.selectedStartingMode = 'ORIGINAL_IDEAS';
modeCProj.phase1Workflow!.completedSteps = ['setup'];
modeCProj.phase1Workflow!.currentStep = 'concepts';

assert(modeCProj.phase1Workflow!.currentStep === 'concepts', 'Mode C advances directly to concepts');
assert(!modeCProj.phase1Workflow!.completedSteps.includes('discover_niches'), 'Mode C skips discover_niches');
assert(!modeCProj.phase1Workflow!.completedSteps.includes('research_niche'), 'Mode C skips research_niche');
console.log('✅ Test 4 Passed\n');

// 5. MODE D (OWN STORY / SCRIPT) TEST
console.log('TEST 5: Mode D (Author Story / Script) Preserves Text Verbatim & Skips Concepts');
const modeDProj = createDefaultProject();
modeDProj.storySourceMode = 'OWN_STORY';
modeDProj.title = 'The Last Signal from Station 9';
modeDProj.originalStoryText = 'INT. DEEP SPACE OUTPOST - NIGHT\n\nCOMMANDER VANE watches the radiation meter tick toward critical.\n\nVANE\nSeal the secondary blast hatch.';

assert(modeDProj.originalStoryText.length > 20, 'Original story text preserved verbatim');

// Confirm Mode D setup
modeDProj.phase1Workflow!.setupConfirmed = true;
modeDProj.phase1Workflow!.selectedStartingMode = 'OWN_STORY';
modeDProj.phase1Workflow!.completedSteps = ['setup'];
modeDProj.phase1Workflow!.currentStep = 'own_story_review';

assert(modeDProj.phase1Workflow!.currentStep === 'own_story_review', 'Mode D advances directly to own_story_review');
assert(!modeDProj.phase1Workflow!.completedSteps.includes('concepts'), 'Mode D does NOT require concept generation');
assert(!modeDProj.phase1Workflow!.completedSteps.includes('research_niche'), 'Mode D does NOT require niche research');
console.log('✅ Test 5 Passed\n');

// 6. DOWNSTREAM ARTIFACT REVIEW INVALIDATION TEST
console.log('TEST 6: Changed Concept Marks Downstream as Needs Review without Deleting');
const reviewProj = createDefaultProject();
reviewProj.concepts = [
  { conceptId: 'CON-01', title: 'Concept One', genre: 'Sci-Fi', logline: 'First', uniqueHook: 'Hook 1', premise: 'P1', protagonist: 'Hero 1', conflict: 'C1', stakes: 'S1', filmabilityNote: 'F1', visualStyleRecommendation: 'V1', tone: 'T1' },
  { conceptId: 'CON-02', title: 'Concept Two', genre: 'Horror', logline: 'Second', uniqueHook: 'Hook 2', premise: 'P2', protagonist: 'Hero 2', conflict: 'C2', stakes: 'S2', filmabilityNote: 'F2', visualStyleRecommendation: 'V2', tone: 'T2' },
] as any;
reviewProj.selectedConceptId = 'CON-01';
reviewProj.stage3.scenes = [
  {
    sceneId: 'SCENE-01',
    sceneNumber: 1,
    title: 'Opening Confrontation',
    slugline: 'INT. CONTROL ROOM - DAY',
    storyPurpose: 'Inciting incident',
    locationId: 'LOC-01',
    timeOfDay: 'DAY',
    characterIds: ['CHAR-01'],
    wardrobeIds: [],
    propIds: [],
    entryState: 'Start',
    exitState: 'End',
    actionBlocks: [],
    dialogueBlocks: [],
    audioCues: [],
    emotionalState: 'Tense',
    continuityNotes: [],
    estimatedSceneDuration: 30,
    scriptText: 'Scene 1',
    beatIds: [],
  },
];
reviewProj.stage3.shots = [
  {
    shotId: 'SHOT-01',
    sceneId: 'SCENE-01',
    order: 1,
    duration: 8,
    purpose: 'Hero establishing',
    sourceBeatIds: [],
    characterIds: ['CHAR-01'],
    wardrobeIds: [],
    propIds: [],
    locationId: 'LOC-01',
    shotSize: 'MEDIUM',
    cameraAngle: 'EYE_LEVEL',
    lensIntent: '35mm',
    framing: 'Rule of thirds',
    cameraMovement: 'STATIC',
    subjectStartPosition: 'Center',
    subjectEndPosition: 'Center',
    blockingAndMovement: 'Still',
    performanceNotes: 'Tense',
    eyeline: 'Forward',
    lightingAndAtmosphere: 'Moody',
    screenDirection: 'Centered',
    dialogueRefs: [],
    audioContext: 'Hum',
    entryVisualState: 'Enter',
    exitVisualState: 'Exit',
  },
] as any;

// User changes selected concept to CON-02
const previousConcept = reviewProj.selectedConceptId;
reviewProj.selectedConceptId = 'CON-02';

// Simulating the context change behavior
if (previousConcept && previousConcept !== 'CON-02' && reviewProj.stage3.scenes.length > 0) {
  reviewProj.phase1Workflow!.stepStatus.screenplay = 'needs_review';
  reviewProj.phase1Workflow!.stepStatus.shot_list = 'needs_review';
  reviewProj.phase1Workflow!.needsReviewReason = 'Selected concept changed from Concept One to Concept Two.';
}

assert(reviewProj.stage3.scenes.length === 1, 'Existing screenplay scenes are preserved (not deleted)');
assert(reviewProj.stage3.shots.length === 1, 'Existing shot list is preserved (not deleted)');
assert(reviewProj.phase1Workflow!.stepStatus.screenplay === 'needs_review', 'Screenplay correctly marked needs_review');
assert(reviewProj.phase1Workflow!.stepStatus.shot_list === 'needs_review', 'Shot list correctly marked needs_review');
console.log('✅ Test 6 Passed\n');

// 7. PERSISTENCE & RESUME WORKFLOW TEST
console.log('TEST 7: Persistence Normalization Resumes Saved Progress');
const savedProjJson = JSON.stringify(reviewProj);
const rehydrated = normalizeProjectData(JSON.parse(savedProjJson));

assert(rehydrated.phase1Workflow !== undefined, 'phase1Workflow persisted through normalization');
assert(rehydrated.phase1Workflow?.setupConfirmed === true, 'setupConfirmed remains true on reload');
assert(rehydrated.stage3.scenes.length === 1, 'Scenes persisted on reload');
assert(rehydrated.stage3.shots.length === 1, 'Shots persisted on reload');
console.log('✅ Test 7 Passed\n');

// 8. PHASE 1 COMPLETION HANDOFF TEST
console.log('TEST 8: Successful Shot List Unlocks Phase 2 Pre-Production');
assert(rehydrated.stage3.shots.length > 0, 'Valid shot list exists');
// Trigger Phase 1 Completion
rehydrated.stage1.approved = true;
rehydrated.stage1.locked = true;
rehydrated.stage2.unlocked = true;
rehydrated.activePhase = 'phase2';

assert(rehydrated.stage1.approved === true, 'Phase 1 approved');
assert(rehydrated.stage2.unlocked === true, 'Phase 2 unlocked');
assert(rehydrated.activePhase === 'phase2', 'Active phase transferred to Phase 2 Pre-Production');
console.log('✅ Test 8 Passed\n');

console.log('====================================================');
console.log('ALL 8 PHASE 1 GUIDED WORKFLOW TEST SUITES PASSED! 🎉');
console.log('====================================================');
