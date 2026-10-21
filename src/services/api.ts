import {
  AuditIssue,
  ImportedScript,
  MasterVisualStyle,
  OwnStoryAnalysis,
  ProjectSettings,
  Stage2Audit,
  Stage2AuditIssue,
  StoryCanon,
  StoryConcept,
  StoryDevelopment,
  StoryFoundation,
  StorySourceMode,
  VisualAsset,
  VisualStyleBible,
  ScriptScene,
  CinematicShot,
  ScriptSettings,
  Stage3Audit,
  Stage3AuditIssue,
  GoogleFlowShotPackage,
  Stage4Audit,
  Stage4AuditIssue,
  GoogleFlowProductionPackage,
  NicheResearchVideoItem,
  NicheOpportunityAnalysis,
  DiscoveredNicheCard,
} from '../types/filmStudio';

export interface ResearchStatusResponse {
  connected: boolean;
  hasYouTubeKey: boolean;
  platforms: string[];
  dataSourceNotice: string;
}

export interface YouTubeResearchResponse {
  success: boolean;
  connected: boolean;
  dataSourceNotice: string;
  results: NicheResearchVideoItem[];
  error?: string;
}

export interface DiscoverNichesResponse {
  success: boolean;
  niches?: DiscoveredNicheCard[];
  error?: string;
}

export interface AnalyzeNicheResponse {
  success: boolean;
  analysis?: NicheOpportunityAnalysis;
  error?: string;
}

export interface GenerateImagePreviewResponse {
  success: boolean;
  imageDataUrl?: string;
  error?: string;
}

export interface GenerateConceptsResponse {
  success: boolean;
  concepts?: StoryConcept[];
  error?: string;
}

export interface RegenerateConceptResponse {
  success: boolean;
  concept?: StoryConcept;
  error?: string;
}

export interface DevelopConceptResponse {
  success: boolean;
  development?: StoryDevelopment;
  error?: string;
}

export interface AnalyzeStoryResponse {
  success: boolean;
  analysis?: OwnStoryAnalysis;
  error?: string;
}

export interface AnalyzeScriptResponse {
  success: boolean;
  extractedScript?: ImportedScript;
  error?: string;
}

export interface CompileCanonResponse {
  success: boolean;
  storyFoundation?: StoryFoundation;
  storyCanon?: StoryCanon;
  error?: string;
}

export interface AuditCanonResponse {
  success: boolean;
  audit?: {
    overallScore: number;
    summary: string;
    issues: AuditIssue[];
    auditedAt: string;
  };
  error?: string;
}

export interface AutoFixIssueResponse {
  success: boolean;
  repairedCanon?: StoryCanon;
  explanation?: string;
  error?: string;
}

// 0. Research & Brain API calls
export async function apiGetResearchStatus(): Promise<ResearchStatusResponse> {
  const res = await fetch('/api/research/status');
  return await res.json();
}

export async function apiSearchYouTube(params: {
  keyword: string;
  timeframe: '7d' | '30d' | '90d';
  contentType: 'shorts' | 'long' | 'all';
  minViews: number;
  regionCode?: string;
}): Promise<YouTubeResearchResponse> {
  const res = await fetch('/api/research/youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
}

export async function apiDiscoverNiches(params: {
  platform: string;
  targetAudience?: string;
  format?: string;
}): Promise<DiscoverNichesResponse> {
  const res = await fetch('/api/research/discover-niches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
}

export async function apiAnalyzeNiche(params: {
  niche: string;
  platform: string;
  audience: string;
  sampleVideos?: NicheResearchVideoItem[];
}): Promise<AnalyzeNicheResponse> {
  const res = await fetch('/api/research/analyze-niche', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
}

export async function apiGenerateImagePreview(
  prompt: string,
  aspectRatio: '1:1' | '9:16' | '16:9' = '1:1'
): Promise<GenerateImagePreviewResponse> {
  const res = await fetch('/api/gemini/generate-image-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio }),
  });
  return await res.json();
}

export interface RefineStoryboardPromptResponse {
  success: boolean;
  refinedPrompt?: string;
  cinematographyNotes?: string;
  error?: string;
}

export async function apiRefineStoryboardPrompt(params: {
  shot: CinematicShot;
  visualStyle: MasterVisualStyle;
  styleBible?: VisualStyleBible | null;
  characters?: any[];
  location?: any;
  frameType?: 'first' | 'end';
}): Promise<RefineStoryboardPromptResponse> {
  const res = await fetch('/api/gemini/refine-storyboard-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
}

// 1. Generate 5 Concepts (Mode A)
export async function apiGenerateStoryConcepts(
  settings: ProjectSettings,
  visualStyle: MasterVisualStyle,
  workingTitle?: string
): Promise<GenerateConceptsResponse> {
  const res = await fetch('/api/gemini/generate-concepts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings, visualStyle, workingTitle }),
  });
  return await res.json();
}

// 2. Regenerate Single Concept (Mode A)
export async function apiRegenerateSingleConcept(
  conceptToReplace: StoryConcept,
  otherConcepts: StoryConcept[],
  settings: ProjectSettings,
  visualStyle: MasterVisualStyle,
  guidance?: string
): Promise<RegenerateConceptResponse> {
  const res = await fetch('/api/gemini/regenerate-single-concept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conceptToReplace, otherConcepts, settings, visualStyle, guidance }),
  });
  return await res.json();
}

// 3. Develop Concept (Mode A)
export async function apiDevelopSelectedConcept(
  concept: StoryConcept,
  settings: ProjectSettings,
  visualStyle: MasterVisualStyle
): Promise<DevelopConceptResponse> {
  const res = await fetch('/api/gemini/develop-concept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concept, settings, visualStyle }),
  });
  return await res.json();
}

export const apiDevelopConcept = apiDevelopSelectedConcept;

// 4. Analyze Own Story (Mode B)
export async function apiAnalyzeOwnStory(
  storyText: string,
  settings: ProjectSettings,
  visualStyle: MasterVisualStyle
): Promise<AnalyzeStoryResponse> {
  const res = await fetch('/api/gemini/analyze-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyText, settings, visualStyle }),
  });
  return await res.json();
}

// 5. Analyze Script (Mode C)
export async function apiAnalyzeScript(
  scriptText: string,
  sourceName: string,
  sourceType: 'PASTE' | 'FILE_TXT' | 'FILE_MD',
  settings: ProjectSettings
): Promise<AnalyzeScriptResponse> {
  const res = await fetch('/api/gemini/analyze-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptText, sourceName, sourceType, settings }),
  });
  return await res.json();
}

// 6. Compile Canon (All Modes)
export async function apiCompileStoryCanon(payload: {
  sourceMode: StorySourceMode;
  projectId: string;
  projectTitle: string;
  settings: ProjectSettings;
  visualStyle: MasterVisualStyle;
  concept?: StoryConcept | null;
  development?: StoryDevelopment | null;
  originalStoryText?: string;
  importedScript?: ImportedScript | null;
}): Promise<CompileCanonResponse> {
  const res = await fetch('/api/gemini/compile-canon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 7. Audit Canon
export async function apiAuditStoryCanon(payload: {
  storyFoundation: StoryFoundation;
  storyCanon: StoryCanon;
  sourceMode: StorySourceMode;
  originalStoryText?: string;
  importedScript?: ImportedScript | null;
}): Promise<AuditCanonResponse> {
  const res = await fetch('/api/gemini/audit-canon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 8. Auto-Fix Issue
export async function apiAutoFixCanonIssue(
  issue: AuditIssue,
  storyFoundation: StoryFoundation,
  storyCanon: StoryCanon
): Promise<AutoFixIssueResponse> {
  const res = await fetch('/api/gemini/auto-fix-issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issue, storyFoundation, storyCanon }),
  });
  return await res.json();
}

// ==========================================
// STAGE 2 API METHODS (VISUAL ASSET PROMPTS)
// ==========================================

export interface GenerateStyleBibleResponse {
  success: boolean;
  styleBible?: VisualStyleBible;
  error?: string;
}

export interface GenerateVisualAssetsResponse {
  success: boolean;
  assets?: VisualAsset[];
  error?: string;
}

export interface RegenerateAssetPromptResponse {
  success: boolean;
  asset?: VisualAsset;
  error?: string;
}

export interface AuditVisualPromptsResponse {
  success: boolean;
  audit?: Stage2Audit;
  error?: string;
}

export interface AutoFixVisualIssueResponse {
  success: boolean;
  repairedAsset?: VisualAsset;
  explanation?: string;
  error?: string;
}

// 9. Generate Visual Style Bible
export async function apiGenerateStyleBible(payload: {
  settings: ProjectSettings;
  visualStyle: MasterVisualStyle;
  storyFoundation: StoryFoundation;
  storyCanon: StoryCanon;
}): Promise<GenerateStyleBibleResponse> {
  const res = await fetch('/api/gemini/generate-style-bible', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 10. Generate Phase 2 Visual Assets (Complete Style Bible & Normalized Assets)
export interface GeneratePhase2AssetsResponse {
  success: boolean;
  styleBible?: VisualStyleBible;
  assets?: VisualAsset[];
  extractedSummary?: {
    charactersCount: number;
    locationsCount: number;
    propsCount: number;
  };
  error?: string;
}

export async function apiGeneratePhase2Assets(payload: {
  settings?: ProjectSettings;
  visualStyle?: MasterVisualStyle;
  storyFoundation?: StoryFoundation | null;
  storyCanon?: StoryCanon | null;
  styleBible?: VisualStyleBible | null;
  importedScript?: ImportedScript | null;
  scenes?: ScriptScene[];
  shots?: CinematicShot[];
  existingAssets?: VisualAsset[];
  concepts?: StoryConcept[];
  originalStoryText?: string;
  generateMissingOnly?: boolean;
  regenerateAssetId?: string | null;
}): Promise<GeneratePhase2AssetsResponse> {
  const res = await fetch('/api/gemini/generate-phase2-assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function apiGenerateVisualAssets(payload: {
  settings?: ProjectSettings;
  visualStyle?: MasterVisualStyle;
  storyFoundation?: StoryFoundation | null;
  storyCanon?: StoryCanon | null;
  styleBible?: VisualStyleBible | null;
  importedScript?: ImportedScript | null;
  scenes?: ScriptScene[];
  shots?: CinematicShot[];
  existingAssets?: VisualAsset[];
  concepts?: StoryConcept[];
  originalStoryText?: string;
  generateMissingOnly?: boolean;
  regenerateAssetId?: string | null;
}): Promise<GeneratePhase2AssetsResponse> {
  return apiGeneratePhase2Assets(payload);
}

// 10b. API Integrations Settings & Diagnostics
export interface SettingsIntegrationsResponse {
  success: boolean;
  youtube: {
    configured: boolean;
    maskedKey: string;
    status: 'CONNECTED' | 'NOT_CONFIGURED';
    isDefaultKey: boolean;
  };
  gemini: {
    configured: boolean;
    maskedKey: string;
    textModel: string;
    supportedImageModels: Array<{
      id: string;
      name: string;
      tier: string;
      supportedAspectRatios: string[];
      supportedResolutions: string[];
    }>;
    status: 'CONNECTED' | 'NOT_CONFIGURED';
  };
  error?: string;
}

export async function apiGetSettingsIntegrations(): Promise<SettingsIntegrationsResponse> {
  const res = await fetch('/api/settings/integrations');
  return await res.json();
}

export async function apiTestYouTubeConnection(): Promise<{
  success: boolean;
  latencyMs?: number;
  message?: string;
  itemsCount?: number;
  error?: string;
  code?: number;
}> {
  const res = await fetch('/api/settings/test-youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return await res.json();
}

export async function apiTestGeminiText(): Promise<{
  success: boolean;
  latencyMs?: number;
  model?: string;
  message?: string;
  error?: string;
  isQuotaError?: boolean;
}> {
  const res = await fetch('/api/settings/test-gemini-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return await res.json();
}

export async function apiTestGeminiImage(params?: {
  model?: string;
  prompt?: string;
}): Promise<{
  success: boolean;
  latencyMs?: number;
  model?: string;
  message?: string;
  error?: string;
  isQuotaOrBillingError?: boolean;
  diagnostic?: string;
}> {
  const res = await fetch('/api/settings/test-gemini-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  return await res.json();
}

// 11. Regenerate Single Asset Prompt
export async function apiRegenerateAssetPrompt(payload: {
  asset: VisualAsset;
  styleBible?: VisualStyleBible | null;
  storyCanon?: StoryCanon | null;
  guidance?: string;
}): Promise<RegenerateAssetPromptResponse> {
  const res = await fetch('/api/gemini/regenerate-asset-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 12. Audit Visual Prompts
export async function apiAuditVisualPrompts(payload: {
  assets: VisualAsset[];
  styleBible?: VisualStyleBible | null;
  storyFoundation: StoryFoundation;
  storyCanon: StoryCanon;
}): Promise<AuditVisualPromptsResponse> {
  const res = await fetch('/api/gemini/audit-visual-prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 13. Auto-Fix Visual Issue
export async function apiAutoFixVisualIssue(payload: {
  issue: Stage2AuditIssue;
  asset: VisualAsset;
  styleBible?: VisualStyleBible | null;
  storyCanon: StoryCanon;
}): Promise<AutoFixVisualIssueResponse> {
  const res = await fetch('/api/gemini/auto-fix-visual-issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// ==========================================
// STAGE 3 API METHODS (SCRIPT & SHOT PLANNER)
// ==========================================

export interface GenerateScriptScenesResponse {
  success: boolean;
  scenes?: ScriptScene[];
  error?: string;
}

export interface GenerateShotPlanResponse {
  success: boolean;
  shots?: CinematicShot[];
  error?: string;
}

export interface RegenerateSceneResponse {
  success: boolean;
  scene?: ScriptScene;
  error?: string;
}

export interface RegenerateShotResponse {
  success: boolean;
  shot?: CinematicShot;
  error?: string;
}

export interface AuditStage3Response {
  success: boolean;
  audit?: Stage3Audit;
  error?: string;
}

export interface AutoFixStage3IssueResponse {
  success: boolean;
  repairedScene?: ScriptScene;
  repairedShot?: CinematicShot;
  explanation?: string;
  error?: string;
}

// 14. Generate Script Scenes
export async function apiGenerateScriptScenes(payload: {
  storySourceMode: StorySourceMode;
  storyFoundation: StoryFoundation;
  storyCanon: StoryCanon;
  originalStoryText?: string;
  importedScript?: ImportedScript | null;
  settings: ProjectSettings;
  scriptSettings: ScriptSettings;
  visualStyle: MasterVisualStyle;
  styleBible?: VisualStyleBible | null;
}): Promise<GenerateScriptScenesResponse> {
  const res = await fetch('/api/gemini/generate-script-scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 15. Generate Shot Plan (6, 8, 10s only)
export async function apiGenerateShotPlan(payload: {
  scenes: ScriptScene[];
  visualStyle: MasterVisualStyle;
  styleBible?: VisualStyleBible | null;
  stage2Assets: VisualAsset[];
  storyCanon: StoryCanon;
  scriptSettings: ScriptSettings;
}): Promise<GenerateShotPlanResponse> {
  const res = await fetch('/api/gemini/generate-shot-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 16. Regenerate Single Scene
export async function apiRegenerateScene(payload: {
  scene: ScriptScene;
  storyCanon: StoryCanon;
  scriptSettings: ScriptSettings;
  guidance?: string;
}): Promise<RegenerateSceneResponse> {
  const res = await fetch('/api/gemini/regenerate-scene', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 17. Regenerate Single Shot
export async function apiRegenerateShot(payload: {
  shot: CinematicShot;
  scene?: ScriptScene;
  styleBible?: VisualStyleBible | null;
  stage2Assets: VisualAsset[];
  guidance?: string;
}): Promise<RegenerateShotResponse> {
  const res = await fetch('/api/gemini/regenerate-shot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 18. Audit Stage 3
export async function apiAuditStage3(payload: {
  scenes: ScriptScene[];
  shots: CinematicShot[];
  storyCanon: StoryCanon;
  storySourceMode: StorySourceMode;
  importedScript?: ImportedScript | null;
  stage2Assets: VisualAsset[];
  styleBible?: VisualStyleBible | null;
  scriptSettings: ScriptSettings;
  targetRuntime?: number;
}): Promise<AuditStage3Response> {
  const res = await fetch('/api/gemini/audit-stage3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 19. Auto-Fix Stage 3 Issue
export async function apiAutoFixStage3Issue(payload: {
  issue: Stage3AuditIssue;
  shot?: CinematicShot;
  scene?: ScriptScene;
  styleBible?: VisualStyleBible | null;
  stage2Assets: VisualAsset[];
}): Promise<AutoFixStage3IssueResponse> {
  const res = await fetch('/api/gemini/auto-fix-stage3-issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 20. Generate Google Flow Prompts (Stage 4)
export interface GenerateFlowPromptsResponse {
  success: boolean;
  shotPackages?: GoogleFlowShotPackage[];
  error?: string;
}

export async function apiGenerateFlowPrompts(payload: {
  shots: CinematicShot[];
  scenes: ScriptScene[];
  visualStyle: MasterVisualStyle;
  styleBible?: VisualStyleBible | null;
  stage2Assets: VisualAsset[];
  storyCanon: StoryCanon;
  targetSettings?: { targetModel: string; capabilityVerified: boolean };
  settings: ProjectSettings;
  storySourceMode: StorySourceMode;
}): Promise<GenerateFlowPromptsResponse> {
  const res = await fetch('/api/gemini/generate-flow-prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 21. Regenerate Single Google Flow Prompt
export interface RegenerateFlowPromptResponse {
  success: boolean;
  shotPackage?: GoogleFlowShotPackage;
  error?: string;
}

export async function apiRegenerateFlowPrompt(payload: {
  shotPackage: GoogleFlowShotPackage;
  shot?: CinematicShot;
  styleBible?: VisualStyleBible | null;
  stage2Assets: VisualAsset[];
  guidance?: string;
}): Promise<RegenerateFlowPromptResponse> {
  const res = await fetch('/api/gemini/regenerate-flow-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 22. Audit Stage 4
export interface AuditStage4Response {
  success: boolean;
  audit?: Stage4Audit;
  error?: string;
}

export async function apiAuditStage4(payload: {
  shotPackages: GoogleFlowShotPackage[];
  shots: CinematicShot[];
  storyCanon: StoryCanon;
  storySourceMode: StorySourceMode;
  importedScript?: ImportedScript | null;
  stage2Assets: VisualAsset[];
  styleBible?: VisualStyleBible | null;
}): Promise<AuditStage4Response> {
  const res = await fetch('/api/gemini/audit-stage4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 23. Auto-Fix Stage 4 Issue
export interface AutoFixStage4IssueResponse {
  success: boolean;
  repairedPackage?: GoogleFlowShotPackage;
  explanation?: string;
  error?: string;
}

export async function apiAutoFixStage4Issue(payload: {
  issue: Stage4AuditIssue;
  shotPackage?: GoogleFlowShotPackage;
  styleBible?: VisualStyleBible | null;
  stage2Assets: VisualAsset[];
}): Promise<AutoFixStage4IssueResponse> {
  const res = await fetch('/api/gemini/auto-fix-stage4-issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 24. Generate First Frame / Reference Shot Image (Gemini Flash Lite Image)
export interface GenerateShotImageResponse {
  success: boolean;
  imageData?: string;
  error?: string;
  code?: 'RATE_LIMIT' | 'SERVICE_UNAVAILABLE' | 'MODEL_IMAGE_UNAVAILABLE' | 'INTERNAL_ERROR';
  fallbackAction?: string;
  aspectRatio?: string;
  shotId?: string;
}

export async function apiGenerateShotImage(payload: {
  prompt: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  shotId?: string;
}): Promise<GenerateShotImageResponse> {
  const res = await fetch('/api/gemini/generate-shot-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}


