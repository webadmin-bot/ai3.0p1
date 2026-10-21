export type StorySourceMode =
  | 'AI_CONCEPT'
  | 'OWN_STORY'
  | 'OWN_SCRIPT'
  | 'DISCOVER_NICHES'
  | 'RESEARCH_NICHE'
  | 'ORIGINAL_IDEAS';

export type PhaseId = 'phase1' | 'phase2' | 'phase3';

export type StageId = PhaseId | 'stage1' | 'stage2' | 'stage3' | 'stage4';

export type FormatType =
  | 'Shorts/Reels'
  | 'Episodic Short Drama'
  | 'Episodic Long-Form Series'
  | 'Short Film'
  | 'Feature/Narrative Film'
  | 'Educational'
  | 'Documentary'
  | 'Motivational'
  | 'Comedy/Skit'
  | 'Custom';

export type RealismLevel =
  | 'PHOTOREALISTIC'
  | 'REALISTIC'
  | 'SEMI_REALISTIC'
  | 'STYLIZED'
  | 'ILLUSTRATED'
  | 'ANIMATED'
  | 'ABSTRACT';

export interface MasterVisualStyle {
  presetId: string;
  name: string;
  category: string;
  description: string;
  medium: string; // e.g. "Live Action Cinema", "2D Cel Animation", "3D CGI", "Stop Motion"
  realismLevel: RealismLevel;
  colorIntent: string;
  lightingIntent: string;
  textureIntent: string;
  customDescription?: string;
}

export type VoiceMode =
  | 'CHARACTER_DIALOGUE_ONLY'
  | 'NARRATION_VO_ONLY'
  | 'DIALOGUE_AND_NARRATION'
  | 'INTRO_NARRATION_THEN_DIALOGUE'
  | 'AI_DECIDE'
  | 'NO_SPOKEN_VOICE';

export type OpeningStrategy =
  | 'NONE'
  | 'NARRATOR_HOOK'
  | 'CHARACTER_DIALOGUE_HOOK'
  | 'CINEMATIC_PROLOGUE'
  | 'MYSTERY_COLD_OPEN'
  | 'AI_DECIDE';

export interface ProjectSettings {
  format: FormatType;
  genres: string[];
  primaryGenre?: string;
  language: string;
  audience: string;
  platform: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  targetRuntimeSeconds: number;
  runtimeGuideline?: string;
  episodeCount: number; // 1-30, active if Episodic Short Drama or Episodic Long-Form Series
  seasonTitle?: string;
  selectedEpisodeNumber?: number; // Active episode being produced in Stages 3-4
  tone: string;
  primaryTone?: string;
  secondaryTone?: string;
  narration: 'AI Decide' | 'No Narrator' | 'Narrator Allowed' | 'Character Inner Voice' | 'Narration Led';
  topicOrNiche?: string;
  targetRegion?: string;
  settingCulture?: string;
  storyConstraints?: string;
  specialInstructions?: string;
  customCreativeInstructions?: string;
  voiceFormat?: 'Narration' | 'Dialogue' | 'Inner Voice' | 'No-Voice' | 'AI Decide';
  // Universal Phase 1 Voice, Dialogue & Opening Architecture
  voiceMode?: VoiceMode;
  decidedVoiceMode?: VoiceMode;
  openingStrategy?: OpeningStrategy;
  decidedOpeningStrategy?: OpeningStrategy;
  narratorPersona?: string;
  narrativeViewpoint?: 'FIRST_PERSON' | 'THIRD_PERSON_LIMITED' | 'THIRD_PERSON_OMNISCIENT' | 'OBSERVER';
  voiceLanguageOrAccent?: string;
  deliveryTone?: string;
  targetIntroDurationSeconds?: number;
  voiceoverDensity?: 'SPARSE' | 'BALANCED' | 'DENSE';
  spokenWordPacing?: 'SLOW' | 'NATURAL' | 'RAPID';
  audioProductionPreference?: 'NATIVE_VIDEO_SYNC' | 'SEPARATE_VO_TRACK' | 'HYBRID';
}

export interface NicheResearchVideoItem {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount?: number;
  duration?: string;
  url: string;
  thumbnailUrl?: string;
  source: 'YouTube' | 'TikTok' | 'Instagram' | 'Manual' | 'Synthetic AI';
}

export interface NicheOpportunityScores {
  audienceDemand: number; // 0-100
  competition: number; // 0-100
  creativeOriginalityPotential: number; // 0-100
  aiProductionFeasibility: number; // 0-100
  overallScore: number; // 0-100
}

export interface NicheOpportunityAnalysis {
  niche: string;
  targetPlatform: string;
  commonSuccessfulTopics: string[];
  strongOpeningHooks: string[];
  recurringAudienceInterests: string[];
  popularStorytellingStructures: string[];
  typicalVideoDuration: string;
  topicSaturationSignals: string[];
  possibleUnderservedSubtopics: string[];
  opportunitiesForAiStorytelling: string[];
  estimatedProductionDifficulty: 'Easy' | 'Moderate' | 'Ambitious';
  suitabilityForEpisodicContent: 'High' | 'Medium' | 'Low';
  scores: NicheOpportunityScores;
  retrievedAt: string;
  dataSource: string;
}

export interface DiscoveredNicheCard {
  name: string;
  description: string;
  demand: string;
  competition: string;
  aiSuitability: string;
  sampleAngle: string;
  trendingHook: string;
}

export interface NicheResearchState {
  connected: boolean;
  dataSourceNotice?: string;
  selectedPlatform: string;
  keyword: string;
  region: string;
  language: string;
  timeframe: '7d' | '30d' | '90d';
  contentType: 'shorts' | 'long' | 'all';
  minViews: number;
  searchResults: NicheResearchVideoItem[];
  opportunityAnalysis: NicheOpportunityAnalysis | null;
  discoveredNiches: DiscoveredNicheCard[];
  isSearching: boolean;
  isAnalyzing: boolean;
}

export interface StoryConcept {
  conceptId: string;
  title: string;
  genre: string;
  logline: string;
  uniqueHook: string;
  premise: string;
  protagonist: string;
  conflict: string;
  stakes: string;
  emotionalAppeal: string;
  visualPotential: string;
  seriesPotential?: string;
  filmabilityNote: string;
}

export interface StoryDevelopment {
  conceptId: string;
  title: string;
  titleAlternatives: string[];
  logline: string;
  expandedPremise: string;
  theme: string;
  protagonistWant: string;
  protagonistNeed: string;
  opposingForce: string;
  stakes: string;
  tone: string;
  world: string;
  emotionalHook: string;
  narrativeEngine: string;
  endingStrategy: string;
  episodicPotential?: string;
}

export interface OwnStoryAnalysis {
  plotSummary: string;
  protagonist: string;
  conflict: string;
  world: string;
  charactersIdentified: string[];
  timeline: string;
  majorBeats: string[];
  setupPayoffs: string[];
  unansweredQuestions: string[];
  episodeStructureSuggestion?: string;
  aiSuggestions: Array<{
    area: string;
    suggestion: string;
    approved?: boolean;
  }>;
  analyzedAt: string;
}

export interface ExtractedScriptScene {
  sceneNumber: number;
  slugline: string; // e.g., EXT. ROOFTOP - NIGHT
  summary: string;
  characters: string[];
  dialogueLines: Array<{
    speaker: string;
    line: string;
    parenthetical?: string;
  }>;
  propsUsed: string[];
  location: string;
}

export interface ImportedScript {
  originalText: string;
  sourceName: string;
  sourceType: 'PASTE' | 'FILE_TXT' | 'FILE_MD';
  importedAt: string;
  version: number;
  extractedScenes: ExtractedScriptScene[];
  extractedCharacters: string[];
  extractedDialogueCount: number;
  extractedLocations: string[];
  extractedProps: string[];
  storyRules: string[];
  secrets: string[];
  openThreads: string[];
  isSourceOfTruth: boolean;
}

export interface StoryFoundation {
  projectId: string;
  title: string;
  provenance: StorySourceMode;
  originalReference?: string;
  selectedStyle: MasterVisualStyle;
  logline: string;
  premise: string;
  protagonist: string;
  mainConflict: string;
  emotionalStakes: string;
  theme: string;
  genre: string;
  tone: string;
  audience: string;
  worldSetting: string;
  hook: string;
  narrativePromise: string;
  endingDirection: string;
  targetRuntimeSeconds: number;
  runtimeGuideline: string;
}

export interface CanonCharacter {
  id: string; // CHAR-01
  name: string;
  role: 'PROTAGONIST' | 'ANTAGONIST' | 'DEUTERAGONIST' | 'SUPPORTING' | 'CATALYST';
  age?: string;
  archetype: string;
  personalityVoice: string;
  want: string;
  need: string;
  motivation: string;
  weakness: string;
  internalConflict: string;
  externalConflict: string;
  arc: string;
}

export interface CanonRelationship {
  id: string;
  characterAId: string;
  characterBId: string;
  dynamic: string;
  tension: string;
  sharedSecret?: string;
}

export interface CanonWorldRule {
  id: string; // RULE-01
  rule: string;
  scope: string; // e.g. "Physical", "Social", "Supernatural", "Technological"
  consequence: string;
}

export interface CanonBeat {
  id: string; // BEAT-01 or EP01-BEAT-01
  actOrEpisode: string;
  sequenceNumber: number;
  title: string;
  description: string;
  causalConnection: string; // Why this happened because of previous beat
  emotionalBeat: string;
  estimatedSeconds: number;
  charactersPresent: string[]; // CHAR-01, etc.
  locationId?: string; // LOC-01
}

export interface CanonTimelineEvent {
  id: string; // TIME-01
  timeMarker: string; // e.g., "Day 1, 08:00 AM" or "Before Inciting Incident"
  event: string;
  charactersPresent: string[];
}

export interface CanonCharacterKnowledge {
  characterId: string;
  knows: string[];
  ignorantOf: string[];
}

export interface CanonSetupPayoff {
  id: string; // SP-01
  setupDescription: string;
  introducedAtBeat: string; // BEAT-01
  payoffDescription: string;
  resolvedAtBeat: string; // BEAT-06
  status: 'PLANTED' | 'PAID_OFF' | 'UNRESOLVED';
}

export interface CanonLocation {
  id: string; // LOC-01, LOC-02, LOC-03, LOC-04...
  name: string;
  narrativeSignificance: string;
  moodAtmosphere: string;
  description?: string;
  permanentSpatialAnchors?: string;
  storyPurpose?: string;
}

export interface CanonProp {
  id: string; // PROP-01, PROP-02, PROP-03...
  name: string;
  narrativeSignificance: string;
  ownerOrHolder: string;
  description?: string;
  storyFunction?: string;
  continuityDetails?: string;
}

export interface CanonUnresolvedThread {
  id: string; // THREAD-01
  question: string;
  status: 'OPEN' | 'RESOLVED_LATER' | 'CLIFFHANGER';
}

export interface EpisodicRoadmapItem {
  episodeNumber: number;
  title: string;
  logline: string;
  coreConflict: string;
  cliffhangerHook: string;
  targetRuntimeSeconds: number;
}

export interface StoryCanon {
  characters: CanonCharacter[];
  relationships: CanonRelationship[];
  worldRules: CanonWorldRule[];
  narrativeStructure: {
    type: string;
    description: string;
  };
  beatMap: CanonBeat[];
  timeline: CanonTimelineEvent[];
  characterKnowledge: CanonCharacterKnowledge[];
  setupPayoffs: CanonSetupPayoff[];
  locations: CanonLocation[];
  props: CanonProp[];
  unresolvedThreads: CanonUnresolvedThread[];
  filmabilityNotes: string;
  episodicRoadmap?: EpisodicRoadmapItem[];
}

export type AuditSeverity = 'REQUIRED' | 'WARNING' | 'INFO';

export interface AuditIssue {
  issueId: string;
  severity: AuditSeverity;
  section: string; // e.g. "Characters", "World Rules", "Beat Map", "Setup/Payoff"
  fieldPath: string;
  description: string;
  consequence: string;
  suggestedFix: string;
  classification: string;
  isSafeToAutoFix: boolean;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED' | 'FAILED' | 'NEEDS_REVIEW';
  verifiedAt?: string;
  verificationDetails?: string;
  repairError?: string;
}

export interface CanonAudit {
  issues: AuditIssue[];
  auditedAt: string;
  overallScore: number; // 0 - 100
  summary: string;
  lastCheckedVersion?: number;
}

export interface Stage1State {
  status: 'DRAFT' | 'GENERATING' | 'READY_FOR_REVIEW' | 'LOCKED';
  currentStep: string;
  generationProgress: number; // 0 - 100
  approved: boolean;
  locked: boolean;
  approvedAt?: string;
  approvedVersion?: number;
  dirty: boolean;
  needsReaudit: boolean;
  unresolvedIssuesCount: number;
}

export type VisualAssetType = 'CHARACTER' | 'WARDROBE' | 'LOCATION' | 'PROP' | 'SPECIAL';
export type AssetImportance = 'PRIMARY' | 'SECONDARY' | 'OPTIONAL';
export type PromptStatus = 'DRAFT' | 'READY' | 'NEEDS_REAUDIT';

export interface VisualAssetSpecification {
  summary: string;
  keyFeatures: string[];
  colors: string[];
  materialsOrTextures: string[];
  dimensionsOrProportions?: string;
  lightingOrRenderingRules?: string;
}

export interface VisualAsset {
  id: string; // CHAR-001, WARD-CHAR001-01, LOC-001, PROP-001, VEHICLE-01
  type: VisualAssetType;
  name: string;
  storyFunction: string;
  importance: AssetImportance;
  sourceCanonIds: string[]; // e.g. CHAR-001, BEAT-02
  visualSpecification: VisualAssetSpecification;
  referencePrompt: string; // Complete copy-paste ready English prompt
  turnaroundPrompt?: string; // Optional character reference turnaround (front/side/back)
  frontViewPrompt?: string;
  backViewPrompt?: string;
  sideViewPrompt?: string;
  topViewPrompt?: string;
  expressionPrompt?: string;
  silhouetteAndProportions?: string;
  costumeAndAccessories?: string;
  identifyingMarks?: string;
  stableIdentityRules?: string;
  spatialLayout?: string;
  entryExitPoints?: string;
  recurringLandmarks?: string;
  cameraViews?: string[];
  physicalShape?: string;
  dimensions?: string;
  ownerOrHolder?: string;
  continuityRequirements?: string;
  promptStatus: PromptStatus;
  reviewIssues: string[];
  updatedAt: string;
  optionalReferenceImageId?: string;
  optionalReferenceImageData?: string; // Base64 data URL from local upload
  optionalReferenceFileName?: string;
  referenceMedia?: MediaReference | null;
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  generationMode?: 'FREE_MANUAL' | 'DIRECT_API';
}

export interface VisualStyleBible {
  version: number;
  inheritedStyle: MasterVisualStyle;
  artDirection?: string;
  mediumAndRealism: string;
  colorPaletteAndContrast: string;
  lightingRules: string;
  textureAndRenderingLanguage: string;
  worldArchitecturePrinciples: string;
  characterProportionRules: string;
  wardrobeAndPropPhilosophy: string;
  cameraAndCompositionStyle?: string;
  aspectRatioConstraints?: string;
  scaleConsistency?: string;
  negativeVisualConstraints?: string[];
  continuityLocks?: string[];
  allowedElements: string[];
  avoidedElements: string[];
  referenceImageClarityRules: string;
  updatedAt: string;
}

export type Stage2FixClass = 'SAFE_AUTOFIX' | 'NEEDS_USER_REVIEW' | 'UPSTREAM_CANON_CONFLICT';

export interface Stage2AuditIssue {
  issueId: string; // VIS-AUD-01
  severity: AuditSeverity;
  assetId?: string;
  field: string;
  description: string;
  consequence: string;
  suggestedFix: string;
  fixClass: Stage2FixClass;
  status: 'OPEN' | 'RESOLVED';
}

export interface Stage2Audit {
  issues: Stage2AuditIssue[];
  overallScore: number;
  summary: string;
  auditedAt: string;
}

export interface Stage2State {
  unlocked: boolean;
  implemented: boolean;
  title: string;
  description: string;
  status: 'DRAFT' | 'GENERATING' | 'READY_FOR_REVIEW' | 'LOCKED';
  currentStep: string;
  generationProgress: number;
  approved: boolean;
  locked: boolean;
  approvedAt?: string;
  approvedVersion?: number;
  dirty: boolean;
  needsReaudit: boolean;
  styleBible: VisualStyleBible | null;
  assets: VisualAsset[];
  audit: Stage2Audit | null;
  unresolvedIssuesCount: number;
}

export interface StageGate {
  unlocked: boolean;
  implemented: boolean;
  title: string;
  description: string;
}

export type Stage4TabId = 'queue' | 'ingredients' | 'frames' | 'audit' | 'reviewExport';

export interface MediaReference {
  source: 'UPLOAD' | 'GEMINI_GEN' | 'EXTERNAL_REF';
  mediaId: string;
  mimeType: string;
  filename?: string;
  verified: boolean;
  storageRef?: string;
  dataUrl?: string | null;
  capturedAt?: string;
  externalNote?: string;
}

export type TextReadiness = 'TEXT_READY' | 'TEXT_READY_WITH_WARNINGS' | 'TEXT_BLOCKED';
export type MediaReadiness = 'EXECUTION_READY' | 'MEDIA_PENDING' | 'CAPABILITY_UNVERIFIED';

export interface ActionTimingBeat {
  timeRange: string; // e.g. "0–2s", "2–6s", "6–8s"
  action: string;
}

export interface AudioLaneData {
  dialogue: string; // e.g. 'None' or verbatim character line
  narrationOrVO: string; // e.g. 'None' or line
  ambience: string;
  sfx: string;
  music: string;
  lipSyncRequired: boolean;
}

export interface ReferenceChecklistItem {
  assetId: string;
  assetType: string;
  assetName: string;
  role: 'PRIMARY' | 'SECONDARY' | 'ENVIRONMENT';
  promptId?: string;
  referencePromptText?: string;
  mediaStatus: 'AVAILABLE' | 'IMAGE_PENDING';
  notes?: string;
}

export interface GoogleFlowShotPackage {
  shotId: string;
  sceneId: string;
  episodeId?: string | null;
  order: number;
  purpose: string;
  flowMode: 'INGREDIENTS' | 'FRAMES';
  plannedDuration: 6 | 8 | 10;
  aspectRatio: string;
  targetModel: string;
  capabilityStatus: 'NOT_VERIFIED' | 'VERIFIED_COMPATIBLE' | 'REQUIRES_ADJUSTMENT';
  characterIds: string[];
  wardrobeIds: string[];
  locationId: string;
  propIds: string[];
  referenceChecklist: ReferenceChecklistItem[];
  firstFramePrompt: string | null;
  firstFrameImageId?: string | null;
  firstFrameMedia?: MediaReference | null;
  firstFrameMediaStatus: 'AVAILABLE' | 'IMAGE_PENDING' | 'NOT_APPLICABLE';
  hasExternalImageReference?: boolean;
  endFramePrompt: string | null;
  endFrameImageId?: string | null;
  endFrameMediaStatus: 'AVAILABLE' | 'IMAGE_PENDING' | 'NOT_APPLICABLE';
  videoPrompt: string; // Full copy-ready video prompt
  audioLanes: AudioLaneData;
  actionTiming: ActionTimingBeat[];
  continuityAnchors: {
    previousShotRef?: string;
    entryVisualState: string;
    exitVisualState: string;
    screenDirection: string;
    propAndHandState: string;
    lightingAtmosphere: string;
    styleConsistency: string;
  };
  exclusions: string[];
  textReadiness: TextReadiness;
  mediaReadiness: MediaReadiness;
  generationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  promptVersion: number;
  hasUserEdits: boolean;
  notes?: string;
  // Enhanced Part 2 Universal Production Contract
  continuationFromShotId?: string | null;
  continuationJustification?: string | null;
  continuationMediaStatus?: 'AVAILABLE' | 'IMAGE_PENDING' | 'NOT_APPLICABLE';
  continuationMediaDependency?: string | null;
  textToVideoMode?: boolean;
  speechSection?: string;
  isContinuationFromPreceding?: boolean;
  speechDialogueVerbatim?: string;
  speechDeliveryIntent?: string;
  speechSpeakerName?: string;
  speechTiming?: string;
  honestProductionStatus?: HonestShotProductionStatus;
}

export type HonestShotProductionStatus =
  | 'SOURCE_STALE'
  | 'DRAFT'
  | 'TEXT_READY'
  | 'MEDIA_PENDING'
  | 'REFERENCES_AVAILABLE'
  | 'CAPABILITY_UNVERIFIED'
  | 'READY_FOR_FLOW'
  | 'EXTERNALLY_GENERATED'
  | 'REVIEWED'
  | 'COMPLETE'
  | 'FAILED';

export interface Stage4AuditIssue {
  issueId: string;
  severity: 'REQUIRED' | 'WARNING' | 'INFO';
  shotId?: string;
  fieldPath: string;
  description: string;
  consequence: string;
  suggestedFix: string;
  fixClass: 'SAFE_AUTOFIX' | 'NEEDS_USER_REVIEW' | 'UPSTREAM_CANON_CONFLICT';
  status: 'OPEN' | 'FIXING' | 'RESOLVED' | 'NEEDS_REVIEW';
}

export interface Stage4Audit {
  overallScore: number;
  summary: string;
  issues: Stage4AuditIssue[];
  auditedAt: string;
}

export interface GoogleFlowProductionPackage {
  title: string;
  version: number;
  sourceMode: StorySourceMode;
  visualStyle: MasterVisualStyle;
  totalPlannedRuntimeSeconds: number;
  totalShotCount: number;
  ingredientsCount: number;
  framesCount: number;
  textReadyCount: number;
  mediaPendingCount: number;
  shots: GoogleFlowShotPackage[];
  compiledAt: string;
}

export interface Stage4State {
  unlocked: boolean;
  implemented: boolean;
  title: string;
  description: string;
  status: 'DRAFT' | 'GENERATING' | 'READY_FOR_REVIEW' | 'LOCKED';
  currentStep: string;
  generationProgress: number;
  approved: boolean;
  locked: boolean;
  approvedAt?: string;
  approvedVersion?: number;
  dirty: boolean;
  needsReaudit: boolean;
  targetSettings: {
    targetModel: string;
    capabilityVerified: boolean;
  };
  shotPackages: GoogleFlowShotPackage[];
  audit: Stage4Audit | null;
  unresolvedIssuesCount: number;
  productionPackage: GoogleFlowProductionPackage | null;
}

export type Stage3TabId = 'scenes' | 'shotPlan' | 'flowRouting' | 'audit' | 'finalReview';

export interface ScriptSettings {
  pacing: 'AUTO' | 'FAST' | 'BALANCED' | 'SLOW';
  dialogueDensity: 'AUTO' | 'LIGHT' | 'MEDIUM' | 'DIALOGUE_LED';
  allowNarration: boolean;
  maxShotDuration: 6 | 8 | 10;
  flowRoutePreference: 'AUTO' | 'PREFER_INGREDIENTS' | 'PREFER_FRAMES';
  activeEpisodeId?: string | null;
  activeEpisodeNumber?: number;
}

export interface ScriptActionBlock {
  id: string;
  order?: number;
  description: string;
  visibleAction: string;
  characterIds: string[];
  estimatedSeconds: number;
}

export interface ScriptDialogueBlock {
  id: string;
  order?: number;
  speakerId: string;
  speakerName: string;
  dialogue: string;
  type: 'DIALOGUE' | 'INNER_VO' | 'VOICE_OVER' | 'NARRATOR' | 'OFFSCREEN' | 'DEVICE_AUDIO';
  deliveryIntent?: string;
  language?: string;
}

export interface ScriptAudioCue {
  id: string;
  type: 'SFX' | 'AMBIENCE' | 'MUSIC' | 'FOLEY';
  description: string;
  timing?: string;
}

export interface ScriptScene {
  sceneId: string;
  sceneNumber: number;
  episodeId?: string | null;
  title: string;
  slugline?: string;
  sourceSceneRef?: string | null;
  sourceTextSpan?: string | null;
  beatIds: string[];
  storyPurpose: string;
  locationId: string;
  subLocation?: string;
  timeOfDay: string;
  characterIds: string[];
  wardrobeIds: string[];
  propIds: string[];
  entryState: string;
  exitState: string;
  actionBlocks: ScriptActionBlock[];
  dialogueBlocks: ScriptDialogueBlock[];
  audioCues: ScriptAudioCue[];
  emotionalState: string;
  knowledgeChanges?: string;
  continuityNotes: string[];
  setupPayoffIds?: string[];
  estimatedSceneDuration: number;
  scriptText: string;
  isOwnScriptVerbatim?: boolean;
  hasUserModifications?: boolean;
}

export type ShotDuration = 6 | 8 | 10;

export interface CinematicShot {
  shotId: string;
  sceneId: string;
  order: number;
  duration: ShotDuration;
  purpose: string;
  sourceBeatIds: string[];
  characterIds: string[];
  wardrobeIds: string[];
  propIds: string[];
  locationId: string;
  shotSize:
    | 'EXTREME_WIDE'
    | 'WIDE'
    | 'FULL'
    | 'MEDIUM_WIDE'
    | 'MEDIUM'
    | 'MEDIUM_CLOSE_UP'
    | 'CLOSE_UP'
    | 'EXTREME_CLOSE_UP'
    | 'INSERT';
  cameraAngle:
    | 'EYE_LEVEL'
    | 'LOW_ANGLE'
    | 'HIGH_ANGLE'
    | 'DUTCH_TILT'
    | 'BIRDS_EYE'
    | 'OVER_THE_SHOULDER'
    | 'POV';
  lensIntent: string;
  framing: string;
  cameraMovement:
    | 'STATIC'
    | 'SLOW_PUSH_IN'
    | 'PULL_OUT'
    | 'PAN_LEFT'
    | 'PAN_RIGHT'
    | 'TILT_UP'
    | 'TILT_DOWN'
    | 'TRACKING_LATERAL'
    | 'STEADICAM_FOLLOW'
    | 'ORBIT';
  subjectStartPosition: string;
  subjectEndPosition: string;
  blockingAndMovement: string;
  performanceNotes: string;
  eyeline: string;
  lightingAndAtmosphere: string;
  screenDirection: string;
  dialogueRefs: string[];
  audioContext: string;
  entryVisualState: string;
  exitVisualState: string;
  flowMode: 'INGREDIENTS' | 'FRAMES';
  routingReason: string;
  routingConfidence: number;
  routeManualOverride: boolean;
  ingredientAssetIds: string[];
  firstFramePrompt?: string | null;
  endFramePrompt?: string | null;
  firstFrameImageId?: string | null;
  endFrameImageId?: string | null;
  firstFrameImageData?: string | null; // Base64 data URL or generated image URL
  firstFrameFileName?: string | null;
  firstFrameMedia?: MediaReference | null;
  endFrameImageData?: string | null; // Base64 data URL or generated image URL for last frame
  endFrameFileName?: string | null;
  endFrameMedia?: MediaReference | null;
  dialogueText?: string;
  narrationText?: string;
  sfxText?: string;
  negativePrompt?: string;
  continuityRequirements?: string;
  approvalStatus?: 'APPROVED' | 'PENDING';
  referenceReadiness: 'READY' | 'IMAGES_PENDING' | 'ASSETS_PENDING';
  continuityNotes: string[];
  generationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  continuationFromShotId?: string | null;
  continuationJustification?: string | null;
  continuationMediaStatus?: 'AVAILABLE' | 'IMAGE_PENDING' | 'NOT_APPLICABLE';
  continuationMediaId?: string | null;
}

export interface Stage3AuditIssue {
  issueId: string;
  severity: 'REQUIRED' | 'WARNING' | 'INFO';
  category:
    | 'SCRIPT_CANON'
    | 'ORIGINAL_SCRIPT_FIDELITY'
    | 'CHARACTER_KNOWLEDGE'
    | 'SCENE_COVERAGE'
    | 'CHARACTER/ASSET_IDS'
    | 'WARDROBE'
    | 'PROP_STATE'
    | 'LOCATION_GEOGRAPHY'
    | 'SCREEN_DIRECTION'
    | 'LIGHTING/WEATHER'
    | 'DIALOGUE_TIMING'
    | 'VO/AUDIO'
    | 'SHOT_DURATION'
    | 'FLOW_ROUTING'
    | 'FIRST_FRAME_PROMPT'
    | 'STYLE_ALIGNMENT'
    | 'GENERATION_FEASIBILITY'
    | 'RUNTIME';
  sceneId?: string;
  shotId?: string;
  assetId?: string;
  description: string;
  consequence: string;
  suggestedFix: string;
  fixClass: 'SAFE_AUTOFIX' | 'NEEDS_USER_REVIEW' | 'UPSTREAM_CANON_CONFLICT';
  status: 'OPEN' | 'FIXING' | 'RESOLVED' | 'FAILED' | 'NEEDS_REVIEW';
}

export interface Stage3Audit {
  overallScore: number;
  summary: string;
  issues: Stage3AuditIssue[];
  auditedAt: string;
}

export interface ProductionScript {
  title: string;
  version: number;
  sourceMode: StorySourceMode;
  scenes: ScriptScene[];
  totalRuntimeSeconds: number;
  compiledAt: string;
}

export interface VisualShotPlan {
  title: string;
  version: number;
  shots: CinematicShot[];
  totalShotCount: number;
  totalRuntimeSeconds: number;
  ingredientsCount: number;
  framesCount: number;
  durationBreakdown: { dur6: number; dur8: number; dur10: number };
  compiledAt: string;
}

export interface DurationReconciliation {
  targetRuntime: number;
  plannedRuntime: number;
  discrepancy: number;
  isPartitionable: boolean;
  recommendedShotPlan?: { dur6Count: number; dur8Count: number; dur10Count: number };
  explanation: string;
}

export interface Stage3State {
  unlocked: boolean;
  implemented: boolean;
  title: string;
  description: string;
  status: 'DRAFT' | 'GENERATING' | 'READY_FOR_REVIEW' | 'LOCKED';
  currentStep: string;
  generationProgress: number;
  approved: boolean;
  locked: boolean;
  approvedAt?: string;
  approvedVersion?: number;
  dirty: boolean;
  needsReaudit: boolean;
  sourceMode: StorySourceMode;
  settings: ScriptSettings;
  scenes: ScriptScene[];
  shots: CinematicShot[];
  audit: Stage3Audit | null;
  unresolvedIssuesCount: number;
  productionScript: ProductionScript | null;
  visualShotPlan: VisualShotPlan | null;
  durationReconciliation: DurationReconciliation | null;
}

export interface ProjectSourceDrafts {
  AI_CONCEPT: {
    concepts: StoryConcept[];
    selectedConceptId: string | null;
    development: StoryDevelopment | null;
  };
  OWN_STORY: {
    text: string;
    analysis: OwnStoryAnalysis | null;
  };
  OWN_SCRIPT: {
    script: ImportedScript | null;
  };
}

// ============================================================================
// AUTHORITATIVE AUDIO CONTINUITY SHEET & SPEECH MANIFEST (UNIVERSAL TRUTH)
// ============================================================================
export type SpeechType =
  | 'ON_SCREEN_DIALOGUE'
  | 'OFF_SCREEN_DIALOGUE'
  | 'VO_NARRATION'
  | 'INTRO';

export type SpeechLineStatus =
  | 'ASSIGNED'
  | 'UNMAPPED'
  | 'EDITORIAL_VO_PENDING'
  | 'OVER_DURATION';

export interface SpeechLineRecord {
  lineId: string; // e.g. "LINE-01"
  sourceRevision: number;
  screenplayRevision: number;
  sceneId: string;
  shotId?: string | null;
  speakerId: string;
  speakerName: string; // "NARRATOR" for voice-over
  spokenText: string;
  language: string;
  speechType: SpeechType;
  deliveryIntent?: string;
  estimatedDurationSeconds: number;
  plannedStartSeconds?: number;
  plannedEndSeconds?: number;
  lipSyncRequired: boolean;
  lineStatus: SpeechLineStatus;
  unmappedReason?: string;
  durationWarning?: string;
}

export interface AudioContinuitySheet {
  version: number;
  voiceMode: VoiceMode;
  effectiveVoiceMode: Exclude<VoiceMode, 'AI_DECIDE'>;
  openingStrategy: OpeningStrategy;
  lines: SpeechLineRecord[];
  totalDialogueLines: number;
  totalNarrationLines: number;
  unmappedCount: number;
  overDurationCount: number;
  compiledAt: string;
}

// ============================================================================
// PHASE 1 — BRAIN AUDIT (TWO LAYERS: TECHNICAL & CREATIVE)
// ============================================================================
export type BrainAuditCategory =
  | 'MISSING'
  | 'MISMATCH'
  | 'INCOMPLETE'
  | 'CONTRADICTORY'
  | 'CREATIVE_SUGGESTION';

export interface BrainAuditIssue {
  issueId: string; // e.g. "BA-DET-01" or "BA-CRE-01"
  layer: 'LAYER_A_TECHNICAL' | 'LAYER_B_CREATIVE';
  category: BrainAuditCategory;
  severity: 'REQUIRED' | 'WARNING' | 'INFO';
  affectedIds: {
    sceneId?: string;
    shotId?: string;
    lineId?: string;
    characterId?: string;
    locationId?: string;
    propId?: string;
    sourceId?: string;
  };
  title: string;
  description: string;
  evidence: string;
  consequence: string;
  suggestedFix: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED' | 'NEEDS_REVIEW';
  isSafeToAutoFix?: boolean;
  canQuickFix?: boolean;
  quickFixAction?:
    | 'SYNC_REVISION'
    | 'REASSIGN_SPEECH'
    | 'SPLIT_SHOT'
    | 'ADD_MISSING_SHOTS'
    | 'ADJUST_TARGET_RUNTIME'
    | 'MARK_EDITORIAL_VO'
    | 'CONFIRM_ADAPTATION';
}

export interface BrainAuditReport {
  auditedAt: string;
  sourceRevision: number;
  screenplayRevision: number;
  shotListRevision: number;
  isCreativeAuditStale: boolean;
  overallScore: number; // 0 - 100
  isApproved: boolean; // true only if 0 REQUIRED open issues
  summary: string;
  layerATechnicalScore: number;
  layerBCreativeScore?: number;
  issues: BrainAuditIssue[];
  runtimeIntegrity: {
    targetRuntimeSeconds: number;
    actualEditorialDurationSeconds: number;
    durationGapSeconds: number;
    isCoverageComplete: boolean;
    platformDurationValid: boolean;
    platformWarnings: string[];
  };
}

export type Phase1StepId =
  | 'setup'
  | 'discover_niches'
  | 'research_niche'
  | 'concepts'
  | 'own_story_review'
  | 'screenplay'
  | 'shot_list'
  | 'brain_audit';

export interface Phase1WorkflowState {
  currentStep: Phase1StepId;
  completedSteps: Phase1StepId[];
  setupConfirmed: boolean;
  selectedStartingMode: StorySourceMode;
  stepStatus: Record<string, 'pending' | 'in_progress' | 'completed' | 'needs_review'>;
  needsReviewReason?: string;
  confirmedAt?: string;
  isComplete?: boolean;
}

export interface ProjectNavigationState {
  activePhase: PhaseId;
  phase1Step: Phase1StepId;
  phase2Tab: string;
  phase3Tab: string;
  completedStepsMap?: Record<string, boolean>;
  approvalRevision?: {
    phase1?: number;
    phase2?: number;
    phase3?: number;
  };
  associatedProjectId?: string;
  lastVisitedAt?: string;
}

export interface ApprovedPhase1Snapshot {
  revision: number;
  approvedAt: string;
  reason?: string;
  snapshot: {
    settings: ProjectSettings;
    visualStyle: MasterVisualStyle;
    storySourceMode: StorySourceMode;
    concepts?: StoryConcept[];
    selectedConceptId?: string | null;
    storyDevelopment?: StoryDevelopment | null;
    originalStoryText?: string;
    importedScript?: ImportedScript | null;
    storyCanon?: StoryCanon | null;
    storyFoundation?: StoryFoundation | null;
    scenes?: ScriptScene[];
    shots?: CinematicShot[];
    audioContinuitySheet?: AudioContinuitySheet;
    brainAudit?: BrainAuditReport;
  };
}

export interface ApprovedPhase2Snapshot {
  revision: number;
  approvedAt: string;
  reason?: string;
  snapshot: {
    styleBible?: VisualStyleBible | null;
    assets?: VisualAsset[];
  };
}

export interface Project {
  schemaVersion: number;
  projectId: string;
  title: string;
  storySourceMode: StorySourceMode;
  // Authoritative Revision Identity
  sourceRevision?: number;
  screenplayRevision?: number;
  shotListRevision?: number;
  activeSourceId?: string | null;
  settings: ProjectSettings;
  visualStyle: MasterVisualStyle;
  sourceDrafts: ProjectSourceDrafts;
  concepts: StoryConcept[];
  selectedConceptId: string | null;
  storyDevelopment: StoryDevelopment | null;
  originalStoryText: string;
  importedScript: ImportedScript | null;
  storyFoundation: StoryFoundation | null;
  storyCanon: StoryCanon | null;
  canonAudit: CanonAudit | null;
  audioContinuitySheet?: AudioContinuitySheet;
  brainAudit?: BrainAuditReport;
  nicheResearch?: NicheResearchState;
  activePhase?: PhaseId;
  phase1Workflow?: Phase1WorkflowState;
  navigationState?: ProjectNavigationState;
  approvedSnapshots?: {
    phase1?: ApprovedPhase1Snapshot[];
    phase2?: ApprovedPhase2Snapshot[];
  };
  stage1: Stage1State;
  stage2: Stage2State;
  stage3: Stage3State;
  stage4: Stage4State;
  createdAt: string;
  updatedAt: string;
}

export type AppViewMode = 'dashboard' | 'workspace';

export type ProjectSortOption =
  | 'updated_desc'
  | 'updated_asc'
  | 'title_asc'
  | 'title_desc';

export interface ProjectSummary {
  id: string; // matches projectId
  title: string;
  format: FormatType;
  aspectRatio: '9:16' | '16:9' | '1:1';
  episodeCount: number;
  currentStage: StageId;
  currentPhase?: PhaseId;
  stageApprovalStatus: string;
  stage1Locked: boolean;
  stage2Locked: boolean;
  stage3Locked: boolean;
  stage4Locked: boolean;
  updatedAt: string;
  createdAt: string;
  thumbnailDataUrl?: string | null;
  thumbnailMediaId?: string | null;
  logline?: string;
  genres?: string[];
  visualStyleName?: string;
  storySourceMode?: StorySourceMode;
}

export interface MigrationReport {
  attempted: boolean;
  success: boolean;
  migratedLegacyProjectId?: string;
  migratedLegacyProjectTitle?: string;
  error?: string;
  backupPreserved: boolean;
}

