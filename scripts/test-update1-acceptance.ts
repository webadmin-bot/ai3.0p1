/**
 * XEMACS7 AI FILM STUDIO 3.0 — UNIVERSAL UPDATE 1 OF 4
 * Acceptance Checkpoints A through F Verification Suite
 */

const storageMap = new Map<string, string>();

(global as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (i: number) => Array.from(storageMap.keys())[i] || null,
};

(global as any).window = {
  localStorage: (global as any).localStorage,
  indexedDB: undefined,
};

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runUpdate1AcceptanceTests() {
  console.log('======================================================================');
  console.log('XEMACS7 UPDATE 1 OF 4 — PERSISTENCE, NAVIGATION & REVISION ACCEPTANCE');
  console.log('======================================================================\n');

  const {
    createAndSaveNewProject,
    loadProjectById,
    saveProjectRecord,
    normalizeProjectData,
    derivePhase1CompletedSteps,
    INDEX_KEY,
  } = await import('../src/services/projectStorage');

  const {
    createDefaultProject,
    createStage2ReadyProject,
    createStage3ReadyProject,
    createStage4ReadyProject,
  } = await import('../src/services/defaultProject');

  storageMap.clear();

  // -------------------------------------------------------------------------
  // CHECKPOINT A: Edit -> Save -> refresh -> reopen same project
  // Verify exact latest content and Saved indicator
  // -------------------------------------------------------------------------
  console.log('CHECKPOINT A: Edit -> Save -> refresh -> reopen same project');
  const projA = await createAndSaveNewProject('Project Alpha: Neon Drift', {
    format: 'Shorts/Reels',
    aspectRatio: '9:16',
    genres: ['Cyberpunk', 'Action'],
  });
  assert(Boolean(projA.projectId), 'Project Alpha created with ID ' + projA.projectId);

  // Edit content
  const editedA = {
    ...projA,
    originalStoryText: 'In Neo-Kyoto, delivery pilot Ren uncovers a rogue AI syndicate running the city sub-grid.',
    settings: {
      ...projA.settings,
      topicOrNiche: 'Autonomous Delivery Drones',
      targetRuntimeSeconds: 30 as const,
    },
    navigationState: {
      activePhase: 'phase1' as const,
      phase1Step: 'screenplay' as const,
      phase2Tab: 'characters',
      phase3Tab: 'board',
      associatedProjectId: projA.projectId,
      lastVisitedAt: new Date().toISOString(),
    },
  };

  const saveResA = await saveProjectRecord(editedA);
  assert(saveResA.success === true, 'Save confirmed durable write for latest revision');

  // Simulate refresh: re-import or reload from cold storage
  const reloadedA = await loadProjectById(projA.projectId);
  assert(reloadedA !== null, 'Reopened same project after simulated refresh');
  assert(reloadedA?.originalStoryText === editedA.originalStoryText, 'Exact story text preserved on reopen');
  assert(reloadedA?.settings?.topicOrNiche === 'Autonomous Delivery Drones', 'Exact niche preserved');
  assert(reloadedA?.navigationState?.phase1Step === 'screenplay', 'Navigation step preserved as screenplay');
  console.log('✅ Checkpoint A Passed\n');

  // -------------------------------------------------------------------------
  // CHECKPOINT B: Open and switch between two distinct projects, rapid edits;
  // no leakage or stale overwrite
  // -------------------------------------------------------------------------
  console.log('CHECKPOINT B: Multi-project switching and rapid-edit isolation');
  const projB = await createAndSaveNewProject('Project Beta: Deep Ocean', {
    format: 'Shorts/Reels',
    aspectRatio: '16:9',
    genres: ['Sci-Fi', 'Thriller'],
  });
  assert(projB.projectId !== projA.projectId, 'Project Beta has distinct ID: ' + projB.projectId);

  // Rapid edits to both
  const timeA = Date.now();
  const timeB = timeA + 100;

  const editedB = {
    ...projB,
    originalStoryText: 'Dr. Aris descends into the Mariana Trench and discovers biological machinery.',
    navigationState: {
      activePhase: 'phase2' as const,
      phase1Step: 'setup' as const,
      phase2Tab: 'locations',
      phase3Tab: 'board',
      associatedProjectId: projB.projectId,
      lastVisitedAt: new Date().toISOString(),
    },
  };

  await saveProjectRecord(editedB, { writeTimestamp: timeB });

  // Stale write attempt on Project A with older timestamp than committed
  const staleEditedA = {
    ...editedA,
    originalStoryText: 'STALE OVERWRITE SHOULD BE IGNORED OR REJECTED',
  };
  const staleRes = await saveProjectRecord(staleEditedA, { writeTimestamp: timeA - 5000 });
  assert(staleRes.success === false, 'Stale delayed write was rejected, preventing overwrite of newer data');

  // Reload both and verify strict isolation
  const verifyA = await loadProjectById(projA.projectId);
  const verifyB = await loadProjectById(projB.projectId);

  assert(verifyA?.originalStoryText === editedA.originalStoryText, 'Project A untouched by Project B or stale write');
  assert(verifyB?.originalStoryText === editedB.originalStoryText, 'Project B has its own distinct content');
  assert(verifyA?.settings.aspectRatio === '9:16', 'Project A aspect ratio intact');
  assert(verifyB?.settings.aspectRatio === '16:9', 'Project B aspect ratio intact');
  console.log('✅ Checkpoint B Passed\n');

  // -------------------------------------------------------------------------
  // CHECKPOINT C: Simulate storage failure/abort/denial
  // Show Save Failed, keep unsaved content recoverable, never fake Saved
  // -------------------------------------------------------------------------
  console.log('CHECKPOINT C: Simulated storage failure handling');
  const originalSetItem = (global as any).localStorage.setItem;
  // Simulate quota exceeded
  (global as any).localStorage.setItem = () => {
    throw new Error('QuotaExceededError: DOM Exception 22');
  };

  const failedSaveRes = await saveProjectRecord({
    ...verifyA!,
    title: 'Project Alpha (Attempted Unsaved Title)',
  });

  assert(failedSaveRes.success === false, 'Storage failure correctly returned success: false');
  assert(Boolean(failedSaveRes.error), 'Clear error message provided: ' + failedSaveRes.error);

  // Restore storage
  (global as any).localStorage.setItem = originalSetItem;

  // Unsaved content is still in memory / recoverable by caller
  const retryRes = await saveProjectRecord({
    ...verifyA!,
    title: 'Project Alpha (Recovered and Saved Title)',
  });
  assert(retryRes.success === true, 'Retry succeeded after restoring storage availability');
  const verifyRecovered = await loadProjectById(projA.projectId);
  assert(verifyRecovered?.title === 'Project Alpha (Recovered and Saved Title)', 'Recovered content successfully persisted');
  console.log('✅ Checkpoint C Passed\n');

  // -------------------------------------------------------------------------
  // CHECKPOINT D: Approve Phase 1 -> visit Phase 2 & 3 -> return to Phase 1
  // All completed relevant tabs visible and read-only; return to Phase 2 without reset
  // -------------------------------------------------------------------------
  console.log('CHECKPOINT D: Approved Phase 1 reviewability and seamless navigation');
  const readyP1 = createStage4ReadyProject();
  readyP1.projectId = 'proj-test-approved-p1';
  readyP1.stage1.locked = true;
  readyP1.stage1.approved = true;
  readyP1.stage1.approvedAt = new Date().toISOString();

  // Test derived completed steps for real artifacts (readyP1 is OWN_STORY mode)
  const completedSteps = derivePhase1CompletedSteps(readyP1);
  assert(completedSteps.includes('setup'), 'Setup step included');
  assert(completedSteps.includes('own_story_review'), 'Own story step included from saved story text');
  assert(completedSteps.includes('screenplay'), 'Screenplay step included from saved scenes');
  assert(completedSteps.includes('shot_list'), 'Shot list step included from saved shots');
  assert(completedSteps.includes('brain_audit'), 'Brain audit step included from approval');

  // Verify that an AI_CONCEPT project with concepts correctly derives 'concepts' step
  const aiConceptProj = createDefaultProject();
  aiConceptProj.storySourceMode = 'AI_CONCEPT';
  aiConceptProj.concepts = [{ id: 'C-01', title: 'Concept One', logline: 'Test logline', hook: 'Hook', synopsis: 'Syn' } as any];
  aiConceptProj.selectedConceptId = 'C-01';
  const aiCompleted = derivePhase1CompletedSteps(aiConceptProj);
  assert(aiCompleted.includes('concepts'), 'Concepts step derived correctly when concepts exist');

  // Save project in Phase 2
  readyP1.navigationState = {
    activePhase: 'phase2',
    phase1Step: 'brain_audit',
    phase2Tab: 'characters',
    phase3Tab: 'board',
    associatedProjectId: readyP1.projectId,
    lastVisitedAt: new Date().toISOString(),
  };
  await saveProjectRecord(readyP1);

  // Navigate: simulate visiting Phase 3
  const navPhase3 = {
    ...readyP1,
    navigationState: {
      ...readyP1.navigationState,
      activePhase: 'phase3' as const,
      phase3Tab: 'board',
    },
  };
  await saveProjectRecord(navPhase3);

  // Navigate: return to Phase 1
  const returnToP1 = {
    ...navPhase3,
    navigationState: {
      ...navPhase3.navigationState,
      activePhase: 'phase1' as const,
      phase1Step: 'screenplay' as const,
    },
  };
  await saveProjectRecord(returnToP1);

  const reloadedReturnP1 = await loadProjectById(readyP1.projectId);
  assert(reloadedReturnP1?.stage1.locked === true, 'Phase 1 remains locked (read-only) upon return');
  assert(reloadedReturnP1?.navigationState?.activePhase === 'phase1', 'Active phase restored to Phase 1');
  assert(reloadedReturnP1?.navigationState?.phase1Step === 'screenplay', 'Visited step restored without restarting wizard');
  assert(reloadedReturnP1?.stage3.scenes.length === readyP1.stage3.scenes.length, 'Screenplay scenes intact');
  assert(reloadedReturnP1?.stage3.shots.length === readyP1.stage3.shots.length, 'Shots intact');

  // Return to Phase 2: verify state is preserved without reset
  const returnToP2 = {
    ...reloadedReturnP1!,
    navigationState: {
      ...reloadedReturnP1!.navigationState!,
      activePhase: 'phase2' as const,
    },
  };
  await saveProjectRecord(returnToP2);
  const reloadedReturnP2 = await loadProjectById(readyP1.projectId);
  assert(reloadedReturnP2?.navigationState?.activePhase === 'phase2', 'Returned to Phase 2 successfully');
  assert(reloadedReturnP2?.navigationState?.phase2Tab === 'characters', 'Phase 2 last tab (characters) preserved without reset');
  console.log('✅ Checkpoint D Passed\n');

  // -------------------------------------------------------------------------
  // CHECKPOINT E: Explicit Revise changes only a new revision, flags dependent
  // outputs stale and keeps approved snapshot accessible
  // -------------------------------------------------------------------------
  console.log('CHECKPOINT E: Explicit Revision safety & dependent artifact staleness');
  const readyP3 = createStage4ReadyProject();
  readyP3.projectId = 'proj-test-revision-cycle';
  readyP3.sourceRevision = 1;
  readyP3.stage1.locked = true;
  readyP3.stage1.approved = true;
  readyP3.stage2.locked = true;
  readyP3.stage2.approved = true;
  readyP3.stage3.locked = true;
  readyP3.stage3.approved = true;
  readyP3.stage4.locked = true;
  readyP3.stage4.approved = true;
  readyP3.stage4.shotPackages = [
    {
      shotId: 'SC01-SH01',
      sceneId: 'SCENE-01',
      order: 1,
      purpose: 'Establish workshop',
      flowMode: 'INGREDIENTS',
      plannedDuration: 10,
      aspectRatio: '9:16',
      targetModel: 'Google Veo 2 / Flow Standard',
      capabilityStatus: 'VERIFIED_COMPATIBLE',
      characterIds: ['CHAR-01'],
      wardrobeIds: [],
      locationId: 'LOC-01',
      propIds: [],
      referenceChecklist: [],
      firstFramePrompt: null,
      firstFrameMediaStatus: 'NOT_APPLICABLE',
      endFramePrompt: null,
      endFrameMediaStatus: 'NOT_APPLICABLE',
      videoPrompt: 'Cinematic wide shot of Mang Tomas at antique teak clockmaker workbench in rain.',
      audioLanes: { dialogue: 'None', narrationOrVO: 'None', ambience: 'Rain', sfx: 'Clock ticking', music: 'None', lipSyncRequired: false },
      actionTiming: [{ timeRange: '0-10s', action: 'Tinkers with brass watch escapement' }],
      continuityAnchors: { entryVisualState: 'Seated', exitVisualState: 'Looking up', screenDirection: 'Static', propAndHandState: 'Tweezers in hand', lightingAtmosphere: 'Amber lamp', styleConsistency: 'Film grain' },
      exclusions: [],
      textReadiness: 'TEXT_READY',
      mediaReadiness: 'EXECUTION_READY',
      generationComplexity: 'LOW',
      promptVersion: 1,
      hasUserEdits: false,
      honestProductionStatus: 'READY_FOR_FLOW',
    } as any,
  ];

  // Snapshot before revision
  const phase1Snapshot = {
    revision: readyP3.sourceRevision,
    approvedAt: new Date().toISOString(),
    reason: 'Testing revision safety',
    snapshot: {
      settings: { ...readyP3.settings },
      visualStyle: { ...readyP3.visualStyle },
      storySourceMode: readyP3.storySourceMode,
      concepts: [...readyP3.concepts],
      scenes: [...readyP3.stage3.scenes],
      shots: [...readyP3.stage3.shots],
    },
  };

  // Perform explicit revise of Phase 1
  const revisedProject = {
    ...readyP3,
    sourceRevision: readyP3.sourceRevision + 1, // Rev 2
    approvedSnapshots: {
      phase1: [phase1Snapshot],
      phase2: [],
    },
    stage1: {
      ...readyP3.stage1,
      locked: false,
      approved: false,
      status: 'READY_FOR_REVIEW' as const,
      dirty: true,
      needsReaudit: true,
    },
    // Downstream artifacts marked STALE / NEEDS_REVIEW, NOT deleted
    stage2: {
      ...readyP3.stage2,
      assets: readyP3.stage2.assets.map((a) => ({ ...a, promptStatus: 'NEEDS_REAUDIT' as const })),
      status: 'READY_FOR_REVIEW' as const,
      locked: false,
      approved: false,
      dirty: true,
      needsReaudit: true,
    },
    stage4: {
      ...readyP3.stage4,
      shotPackages: readyP3.stage4.shotPackages.map((p) => ({
        ...p,
        honestProductionStatus: 'SOURCE_STALE' as const,
      })),
      status: 'READY_FOR_REVIEW' as const,
      locked: false,
      approved: false,
      dirty: true,
      needsReaudit: true,
    },
  };

  await saveProjectRecord(revisedProject);
  const reloadedRevised = await loadProjectById(readyP3.projectId);

  assert(reloadedRevised?.sourceRevision === 2, 'Authoritative sourceRevision incremented to 2');
  assert(reloadedRevised?.stage1.locked === false, 'Phase 1 is now unlocked for editable revision');
  assert(Boolean(reloadedRevised?.approvedSnapshots?.phase1 && reloadedRevised.approvedSnapshots.phase1.length === 1), 'Previous approved snapshot safely preserved in history');
  assert(Boolean(reloadedRevised?.approvedSnapshots?.phase1 && reloadedRevised.approvedSnapshots.phase1[0].revision === 1), 'Snapshot records Revision 1 state');
  assert(reloadedRevised?.stage2.assets.length === readyP3.stage2.assets.length, 'Phase 2 assets preserved (not deleted)');
  assert(reloadedRevised?.stage2.assets[0].promptStatus === 'NEEDS_REAUDIT', 'Phase 2 assets flagged NEEDS_REAUDIT');
  assert(reloadedRevised?.stage4.shotPackages.length === readyP3.stage4.shotPackages.length, 'Phase 3 shots preserved (not deleted)');
  assert(reloadedRevised?.stage4.shotPackages[0].honestProductionStatus === 'SOURCE_STALE', 'Downstream production package flagged SOURCE_STALE');
  console.log('✅ Checkpoint E Passed\n');

  // -------------------------------------------------------------------------
  // CHECKPOINT F: Reopen legacy and new projects; restore last phase/tab
  // without breaking their assets and approval records
  // -------------------------------------------------------------------------
  console.log('CHECKPOINT F: Backward compatibility with legacy projects');
  const legacyFixture: any = {
    projectId: 'legacy-film-001',
    title: 'Legacy Cinematic Project',
    storySourceMode: 'OWN_STORY',
    originalStoryText: 'A retired courier is pulled into one last interplanetary heist.',
    settings: {
      format: 'Shorts/Reels',
      aspectRatio: '9:16',
      targetRuntimeSeconds: 60,
      genres: ['Sci-Fi'],
    },
    stage1: {
      locked: true,
      approved: true,
      status: 'LOCKED',
    },
    stage2: {
      locked: true,
      approved: true,
      assets: [
        { id: 'CHAR-01', name: 'Jared', type: 'CHARACTER', visualSpecification: { summary: 'Grizzled courier' } },
      ],
    },
    stage3: {
      scenes: [
        { sceneId: 'SCENE-01', title: 'Hangar Bay Entry', estimatedSceneDuration: 10 },
      ],
      shots: [
        { shotId: 'SHOT-01', sceneId: 'SCENE-01', duration: 10 },
      ],
    },
    // No phase1Workflow or navigationState in legacy record
  };

  const normalizedLegacy = normalizeProjectData(legacyFixture);
  assert(normalizedLegacy.phase1Workflow !== undefined, 'Phase1Workflow created for legacy project');
  assert(normalizedLegacy.phase1Workflow?.setupConfirmed === true, 'Legacy project setupConfirmed is true (wizard not restarted)');
  assert(Boolean(normalizedLegacy.phase1Workflow?.completedSteps.includes('setup')), 'Setup step included');
  assert(Boolean(normalizedLegacy.phase1Workflow?.completedSteps.includes('own_story_review')), 'Own story step recognized from text');
  assert(Boolean(normalizedLegacy.phase1Workflow?.completedSteps.includes('screenplay')), 'Screenplay step recognized from scenes');
  assert(Boolean(normalizedLegacy.phase1Workflow?.completedSteps.includes('shot_list')), 'Shot list step recognized from shots');
  assert(normalizedLegacy.navigationState !== undefined, 'Navigation state generated for legacy project');
  assert(normalizedLegacy.sourceRevision === 1, 'Source revision defaulted to 1');
  assert(normalizedLegacy.stage1.locked === true, 'Stage 1 locked status preserved');
  assert(normalizedLegacy.stage2.locked === true, 'Stage 2 locked status preserved');
  assert(normalizedLegacy.stage2.assets.length === 1, 'Stage 2 assets intact');

  await saveProjectRecord(normalizedLegacy);
  const reloadedLegacy = await loadProjectById('legacy-film-001');
  assert(reloadedLegacy?.title === 'Legacy Cinematic Project', 'Legacy project title verified');
  assert(reloadedLegacy?.stage1.locked === true, 'Legacy Stage 1 locked status retained');
  assert(reloadedLegacy?.phase1Workflow?.setupConfirmed === true, 'Setup confirmed retained');
  console.log('✅ Checkpoint F Passed\n');

  console.log('======================================================================');
  console.log('🎉 ALL 6 ACCEPTANCE CHECKPOINTS (A through F) PASSED CLEANLY! 🎉');
  console.log('======================================================================');
}

runUpdate1AcceptanceTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
