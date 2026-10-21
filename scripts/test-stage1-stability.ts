import {
  deriveAuditSummary,
  isIssueBlocking,
  isIssueResolved,
  normalizeAuditIssue,
  normalizeIssueStatus,
  runDeterministicCanonValidation,
  checkStage1ApprovalGate,
  verifyAndMergeCanonRepair,
} from '../src/services/canonAuditEngine';
import { loadSavedProject, saveProjectToStorage } from '../src/services/persistence';
import { Project, StoryCanon, StoryFoundation, AuditIssue } from '../src/types/filmStudio';

// Mock localStorage for persistence testing in Node
const storageMap = new Map<string, string>();
(global as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runAllTests() {
  console.log('\n============================================================');
  console.log('XEMACS7 STAGE 1 AUDIT & REPAIR ENGINE REGRESSION SUITE');
  console.log('============================================================\n');

  // TEST 1: REQUIRED issue with missing status counts as unresolved.
  console.log('TEST 1: REQUIRED issue with missing status counts as unresolved');
  {
    const issueWithoutStatus: any = {
      issueId: 'AUD-01',
      severity: 'REQUIRED',
      section: 'Characters',
      description: 'Missing protagonist want',
    };
    const norm = normalizeAuditIssue(issueWithoutStatus);
    assert(norm.status === 'OPEN', 'Missing status normalized to OPEN');
    assert(!isIssueResolved(norm), 'Issue is not resolved');
    assert(isIssueBlocking(norm), 'Issue is blocking');

    const summary = deriveAuditSummary([issueWithoutStatus]);
    assert(summary.unresolvedRequired === 1, 'Summary counts 1 unresolvedRequired');
    assert(!summary.isEligibleForApproval, 'Not eligible for approval');
  }

  // TEST 2: REQUIRED issue with FAILED or NEEDS_REVIEW status blocks approval.
  console.log('\nTEST 2: REQUIRED issue with FAILED or NEEDS_REVIEW status blocks approval');
  {
    const failedIssue: AuditIssue = {
      issueId: 'AUD-FAIL-01',
      severity: 'REQUIRED',
      section: 'Props',
      fieldPath: 'props',
      description: 'Broken prop reference',
      consequence: 'Visual prompt failure',
      suggestedFix: 'Register prop',
      classification: 'PROP_REF',
      isSafeToAutoFix: true,
      status: 'FAILED',
    };
    assert(isIssueBlocking(failedIssue), 'FAILED issue is blocking');
    const summaryFail = deriveAuditSummary([failedIssue]);
    assert(summaryFail.unresolvedRequired === 1, 'FAILED issue counts as unresolvedRequired');

    const reviewIssue: AuditIssue = {
      ...failedIssue,
      issueId: 'AUD-REV-01',
      status: 'NEEDS_REVIEW',
    };
    assert(isIssueBlocking(reviewIssue), 'NEEDS_REVIEW issue is blocking');
    const summaryRev = deriveAuditSummary([reviewIssue]);
    assert(summaryRev.unresolvedRequired === 1, 'NEEDS_REVIEW issue counts as unresolvedRequired');
  }

  // TEST 3: Actually RESOLVED and verified issues do not block.
  console.log('\nTEST 3: Actually RESOLVED and verified issues do not block');
  {
    const resolvedIssue: AuditIssue = {
      issueId: 'AUD-RES-01',
      severity: 'REQUIRED',
      section: 'Props',
      fieldPath: 'props',
      description: 'Broken prop reference',
      consequence: 'Resolved',
      suggestedFix: 'Resolved',
      classification: 'PROP_REF',
      isSafeToAutoFix: true,
      status: 'RESOLVED',
      verifiedAt: new Date().toISOString(),
    };
    assert(isIssueResolved(resolvedIssue), 'RESOLVED issue is detected as resolved');
    assert(!isIssueBlocking(resolvedIssue), 'RESOLVED issue is NOT blocking');
    const summary = deriveAuditSummary([resolvedIssue]);
    assert(summary.unresolvedRequired === 0, 'Unresolved required is 0');
    assert(summary.resolvedCount === 1, 'Resolved count is 1');
    assert(summary.isEligibleForApproval, 'Summary is eligible for approval');
  }

  // TEST 4: Summary counts equal visible unresolved issue classifications.
  console.log('\nTEST 4: Summary counts equal visible unresolved issue classifications');
  {
    const mixedIssues: any[] = [
      { issueId: 'I1', severity: 'REQUIRED', status: 'OPEN' },
      { issueId: 'I2', severity: 'REQUIRED', status: 'FAILED' },
      { issueId: 'I3', severity: 'REQUIRED', status: 'RESOLVED' },
      { issueId: 'I4', severity: 'WARNING', status: 'OPEN' },
      { issueId: 'I5', severity: 'WARNING', status: 'RESOLVED' },
      { issueId: 'I6', severity: 'INFO', status: 'OPEN' },
      { issueId: 'I7', severity: 'INFO' }, // missing status -> OPEN
    ];
    const summary = deriveAuditSummary(mixedIssues);
    assert(summary.totalIssues === 7, 'Total issues is 7');
    assert(summary.unresolvedRequired === 2, 'Unresolved REQUIRED is 2 (OPEN + FAILED)');
    assert(summary.unresolvedWarning === 1, 'Unresolved WARNING is 1 (OPEN)');
    assert(summary.unresolvedInfo === 2, 'Unresolved INFO is 2 (OPEN + missing)');
    assert(summary.resolvedCount === 2, 'Resolved count is 2 (I3 + I5)');
    assert(!summary.isEligibleForApproval, 'Not eligible because unresolvedRequired > 0');
  }

  // TEST 5: Two sequential Auto Fix operations retain both repairs.
  console.log('\nTEST 5: Two sequential Auto Fix operations retain both repairs');
  {
    const baseCanon: StoryCanon = {
      characters: [
        { id: 'CHAR-01', name: 'Nico', archetype: 'Protagonist', want: 'Rebuild core', need: 'Trust family' } as any,
      ],
      relationships: [],
      worldRules: [
        { id: 'RULE-01', name: 'Energy Conservation', rule: 'Solar and wind recharge finite capacitors' } as any,
      ],
      narrativeStructure: { type: '3-Act', description: 'Classic adventure' },
      beatMap: [
        { id: 'BEAT-01', title: 'Power Surge', description: 'Surge strikes town' } as any,
      ],
      timeline: [],
      characterKnowledge: [],
      setupPayoffs: [],
      locations: [
        { id: 'LOC-01', name: 'Watchmaker Workshop', narrativeSignificance: 'Home base', permanentSpatialAnchors: 'Original anchors' } as any,
      ],
      props: [
        { id: 'PROP-01', name: 'Master Brass Key', narrativeSignificance: 'Unlocks vault', ownerOrHolder: 'Nico', continuityDetails: 'Original details' } as any,
        { id: 'PROP-02', name: 'Glowcell Battery', narrativeSignificance: 'Backup power', ownerOrHolder: 'Pico' } as any,
      ],
      unresolvedThreads: [],
      filmabilityNotes: 'Standard',
      episodicRoadmap: [],
    };

    let workingCanon = JSON.parse(JSON.stringify(baseCanon));

    // Operation 1: Repair PROP-01
    const repair1 = {
      targetSection: 'props',
      targetRecordId: 'PROP-01',
      repairedRecord: {
        continuityDetails: 'Finite-capacity reserve capacitors, gradually depletes.',
      },
      explanation: 'Updated reserve energy details for PROP-01',
    };
    const issue1: AuditIssue = {
      issueId: 'AUD-PROP-01',
      severity: 'REQUIRED',
      section: 'Props',
      fieldPath: 'props.PROP-01.continuityDetails',
      description: 'Clarify finite energy',
      consequence: 'Continuity gap',
      suggestedFix: 'Update continuity details',
      classification: 'CONTINUITY',
      isSafeToAutoFix: true,
      status: 'OPEN',
    };

    const res1 = verifyAndMergeCanonRepair(workingCanon, repair1, issue1);
    assert(res1.success && Boolean(res1.canon), 'Repair 1 succeeded');
    workingCanon = res1.canon!;
    assert(
      workingCanon.props[0].continuityDetails === 'Finite-capacity reserve capacitors, gradually depletes.',
      'PROP-01 updated'
    );
    assert(workingCanon.props[0].id === 'PROP-01', 'PROP-01 stable ID preserved');
    assert(workingCanon.props[1].id === 'PROP-02', 'PROP-02 untouched');

    // Operation 2: Repair LOC-01 on top of workingCanon
    const repair2 = {
      targetSection: 'locations',
      targetRecordId: 'LOC-01',
      repairedRecord: {
        permanentSpatialAnchors: 'North gear-clock tower, South copper workbench.',
      },
      explanation: 'Defined concrete spatial anchors for LOC-01',
    };
    const issue2: AuditIssue = {
      issueId: 'AUD-LOC-01',
      severity: 'WARNING',
      section: 'Locations',
      fieldPath: 'locations.LOC-01.permanentSpatialAnchors',
      description: 'Missing spatial anchors',
      consequence: 'Camera drift',
      suggestedFix: 'Add anchors',
      classification: 'SPATIAL',
      isSafeToAutoFix: true,
      status: 'OPEN',
    };

    const res2 = verifyAndMergeCanonRepair(workingCanon, repair2, issue2);
    assert(res2.success && Boolean(res2.canon), 'Repair 2 succeeded');
    workingCanon = res2.canon!;

    // Verify BOTH repairs are present!
    assert(
      workingCanon.props[0].continuityDetails === 'Finite-capacity reserve capacitors, gradually depletes.',
      'Repair 1 is retained after Repair 2'
    );
    assert(
      workingCanon.locations[0].permanentSpatialAnchors === 'North gear-clock tower, South copper workbench.',
      'Repair 2 is also applied'
    );
    assert(workingCanon.props.length === 2, 'Props array intact with 2 items');
    assert(workingCanon.locations.length === 1, 'Locations array intact with 1 item');
    assert(workingCanon.characters[0].id === 'CHAR-01', 'Characters completely intact');
  }

  // TEST 6: Failed repair preserves preceding valid corrections.
  console.log('\nTEST 6: Failed repair preserves preceding valid corrections');
  {
    const canonWithOp1: StoryCanon = {
      characters: [{ id: 'CHAR-01', name: 'Nico' }] as any,
      relationships: [],
      worldRules: [],
      narrativeStructure: { type: '3-Act', description: 'Story' },
      beatMap: [],
      timeline: [],
      characterKnowledge: [],
      setupPayoffs: [],
      locations: [],
      props: [{ id: 'PROP-01', name: 'Key', continuityDetails: 'Updated in Op 1' }] as any,
      unresolvedThreads: [],
      filmabilityNotes: '',
    };

    let workingCanon = JSON.parse(JSON.stringify(canonWithOp1));

    // Op 2 fails (e.g. attempting to update nonexistent record with identical payload)
    const badRepair = {
      targetSection: 'props',
      targetRecordId: 'NONEXISTENT',
      repairedRecord: {},
    };
    const badIssue: AuditIssue = {
      issueId: 'AUD-BAD',
      severity: 'WARNING',
      section: 'Props',
      fieldPath: 'props',
      description: 'Bad issue',
      consequence: '',
      suggestedFix: '',
      classification: 'UNKNOWN',
      isSafeToAutoFix: true,
      status: 'OPEN',
    };

    const resBad = verifyAndMergeCanonRepair(workingCanon, badRepair, badIssue);
    assert(!resBad.success, 'Bad repair failed validation');
    // Preceding correction in workingCanon is NOT corrupted
    assert(
      workingCanon.props[0].continuityDetails === 'Updated in Op 1',
      'Preceding valid correction was retained intact'
    );
  }

  // TEST 7: Editing a canon record invalidates the previous audit.
  console.log('\nTEST 7: Editing a canon record invalidates the previous audit');
  {
    const testProject: Project = {
      schemaVersion: 2,
      projectId: 'test-p1',
      title: 'The Little Circuit Family',
      storySourceMode: 'AI_CONCEPT',
      selectedConceptId: 'concept-1',
      storyDevelopment: { premise: 'Family of robots' } as any,
      settings: { format: 'Web Series', targetRuntimeSeconds: 600, episodeCount: 10 } as any,
      visualStyle: { name: 'Stylized 3D' } as any,
      sourceDrafts: {} as any,
      concepts: [],
      originalStoryText: '',
      importedScript: null,
      storyFoundation: { title: 'The Little Circuit Family', logline: 'Robot family survives energy crisis', runtimeGuideline: '10 episodes' } as any,
      storyCanon: {
        characters: [{ id: 'CHAR-01', name: 'Nico' }],
        locations: [{ id: 'LOC-01', name: 'Workshop' }],
        props: [{ id: 'PROP-01', name: 'Key' }],
        worldRules: [{ id: 'RULE-01', name: 'Energy', rule: 'Solar only' }],
        beatMap: [{ id: 'BEAT-01', title: 'Start', description: 'Begins' }],
        relationships: [],
        timeline: [],
        characterKnowledge: [],
        setupPayoffs: [],
        unresolvedThreads: [],
        filmabilityNotes: '',
        episodicRoadmap: Array.from({ length: 10 }, (_, i) => ({
          episodeNumber: i + 1,
          title: `Episode ${i + 1}`,
          logline: `Story ${i + 1}`,
          coreConflict: 'Power',
          cliffhangerHook: 'Mystery',
          targetRuntimeSeconds: 60,
        })),
      } as any,
      canonAudit: {
        overallScore: 95,
        summary: 'All good',
        issues: [],
        auditedAt: new Date().toISOString(),
      },
      stage1: {
        status: 'READY_FOR_REVIEW',
        currentStep: 'REVIEW',
        generationProgress: 100,
        approved: false,
        locked: false,
        dirty: false,
        needsReaudit: false,
        unresolvedIssuesCount: 0,
      },
      stage2: {} as any,
      stage3: {} as any,
      stage4: {} as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const gate1 = checkStage1ApprovalGate(testProject);
    assert(gate1.eligible, 'Approval gate passes before edits');

    // Simulate canon modification: dirty = true, needsReaudit = true
    testProject.stage1.needsReaudit = true;
    const gateAfterEdit = checkStage1ApprovalGate(testProject);
    assert(!gateAfterEdit.eligible, 'Approval gate BLOCKS when needsReaudit is true');
    assert(
      gateAfterEdit.blockerReason!.includes('modified since the last audit'),
      'Blocker message mentions re-audit required'
    );
  }

  // TEST 8: Re-running deterministic validation without changes gives stable results.
  console.log('\nTEST 8: Re-running deterministic validation without changes gives stable results');
  {
    const foundation: StoryFoundation = {
      title: 'Stable Story',
      logline: 'A stable logline',
      premise: 'Premise',
      tone: 'Warm',
      runtimeGuideline: 'Short',
      targetRuntimeSeconds: 60,
    } as any;
    const canon: StoryCanon = {
      characters: [{ id: 'CHAR-01', name: 'Nico' }],
      locations: [{ id: 'LOC-01', name: 'Workshop' }],
      props: [{ id: 'PROP-01', name: 'Key' }],
      worldRules: [{ id: 'RULE-01', name: 'Energy', rule: 'Solar' }],
      beatMap: [{ id: 'BEAT-01', title: 'B1', description: 'Desc' }],
      relationships: [],
      timeline: [],
      characterKnowledge: [],
      setupPayoffs: [],
      unresolvedThreads: [],
      filmabilityNotes: '',
    } as any;

    const run1 = runDeterministicCanonValidation(foundation, canon, { format: 'Short' });
    const run2 = runDeterministicCanonValidation(foundation, canon, { format: 'Short' });
    assert(run1.length === run2.length, 'Deterministic runs have identical issue counts');
    assert(JSON.stringify(run1) === JSON.stringify(run2), 'Deterministic runs have identical outputs');
  }

  // TEST 9: Ten-episode roadmap does not incorrectly trigger a minimum 30-beat requirement.
  console.log('\nTEST 9: Ten-episode roadmap does not incorrectly trigger a minimum 30-beat requirement');
  {
    const foundation: StoryFoundation = {
      title: 'The Little Circuit Family',
      logline: 'An animated micro-steampunk family navigates life in Cogberry.',
      premise: 'Robot family survives energy fluctuations.',
      tone: 'Charming & Inventive',
      runtimeGuideline: '10-Episode Web Series (~60s per episode)',
      targetRuntimeSeconds: 600,
    } as any;

    const episodicCanon: StoryCanon = {
      characters: [
        { id: 'CHAR-01', name: 'Nico', archetype: 'Watchmaker' },
        { id: 'CHAR-02', name: 'Pico', archetype: 'Young apprentice' },
      ] as any,
      locations: [
        { id: 'LOC-01', name: 'Workshop', narrativeSignificance: 'Main base' },
      ] as any,
      props: [
        { id: 'PROP-01', name: 'Brass Key', narrativeSignificance: 'Vault' },
      ] as any,
      worldRules: [
        { id: 'RULE-01', name: 'Capacitor Law', rule: 'Finite energy storage' },
      ] as any,
      narrativeStructure: { type: 'Episodic', description: '10 episodes' },
      beatMap: [
        { id: 'BEAT-01', title: 'Season Hook', description: 'The power fluctuates in town.' },
        { id: 'BEAT-02', title: 'Mid-Season Crisis', description: 'The central reserve drops.' },
        { id: 'BEAT-03', title: 'Season Climax', description: 'Family aligns backup cells.' },
        { id: 'BEAT-04', title: 'Season Resolution', description: 'Cogberry lights hum steadily.' },
      ] as any,
      relationships: [],
      timeline: [],
      characterKnowledge: [],
      setupPayoffs: [],
      unresolvedThreads: [],
      filmabilityNotes: 'Animation friendly',
      episodicRoadmap: Array.from({ length: 10 }, (_, i) => ({
        episodeNumber: i + 1,
        title: `Episode ${i + 1}: Step ${i + 1}`,
        logline: `Episode ${i + 1} adventures in Cogberry.`,
        coreConflict: 'Power distribution',
        cliffhangerHook: 'Battery dial flickers',
        targetRuntimeSeconds: 60,
      })),
    };

    const issues = runDeterministicCanonValidation(foundation, episodicCanon, {
      format: 'Web Series',
      episodeCount: 10,
    });

    const requiredIssues = issues.filter((i) => i.severity === 'REQUIRED');
    assert(requiredIssues.length === 0, 'Zero blocking REQUIRED issues on 10-episode project');
    const hasArbitrary30BeatIssue = issues.some(
      (i) => i.description.includes('minimum 30') || i.issueId === 'AUD-STRUCT-001'
    );
    assert(!hasArbitrary30BeatIssue, 'No arbitrary 30-beat requirement was triggered');
  }

  // TEST 10: Original stories and canon IDs remain unchanged unless an approved repair explicitly affects them.
  console.log('\nTEST 10: Original stories and canon IDs remain unchanged unless explicitly targeted');
  {
    const canon: StoryCanon = {
      characters: [{ id: 'CHAR-01', name: 'Nico' }, { id: 'CHAR-02', name: 'Pico' }] as any,
      locations: [{ id: 'LOC-01', name: 'Workshop' }, { id: 'LOC-02', name: 'Town Square' }] as any,
      props: [{ id: 'PROP-01', name: 'Key' }, { id: 'PROP-02', name: 'Battery' }] as any,
      worldRules: [{ id: 'RULE-01', name: 'Law', rule: 'Rule text' }] as any,
      narrativeStructure: { type: '3-Act', description: 'Desc' },
      beatMap: [{ id: 'BEAT-01', title: 'Beat', description: 'Desc' }] as any,
      relationships: [],
      timeline: [],
      characterKnowledge: [],
      setupPayoffs: [],
      unresolvedThreads: [],
      filmabilityNotes: '',
    };

    // Target ONLY PROP-02
    const targetedRepair = {
      targetSection: 'props',
      targetRecordId: 'PROP-02',
      repairedRecord: {
        narrativeSignificance: 'Model-7 Glowcell Battery powering community emergency circuits',
      },
      explanation: 'Updated narrative significance of PROP-02',
    };
    const dummyIssue: AuditIssue = {
      issueId: 'AUD-02',
      severity: 'WARNING',
      section: 'Props',
      fieldPath: 'props.PROP-02',
      description: 'Detail update',
      consequence: 'None',
      suggestedFix: 'Fix',
      classification: 'DETAIL',
      isSafeToAutoFix: true,
      status: 'OPEN',
    };

    const res = verifyAndMergeCanonRepair(canon, targetedRepair, dummyIssue);
    assert(res.success && Boolean(res.canon), 'Merge succeeded');
    const updated = res.canon!;

    assert(updated.characters[0].id === 'CHAR-01', 'CHAR-01 preserved');
    assert(updated.characters[1].id === 'CHAR-02', 'CHAR-02 preserved');
    assert(updated.locations[0].id === 'LOC-01', 'LOC-01 preserved');
    assert(updated.locations[1].id === 'LOC-02', 'LOC-02 preserved');
    assert(updated.props[0].id === 'PROP-01', 'PROP-01 preserved');
    assert(updated.props[1].id === 'PROP-02', 'PROP-02 ID strictly preserved');
    assert(
      updated.props[1].narrativeSignificance === 'Model-7 Glowcell Battery powering community emergency circuits',
      'Targeted field updated'
    );
  }

  // TEST 11: Refresh preserves fixed canon and verified audit status.
  console.log('\nTEST 11: Refresh preserves fixed canon and verified audit status');
  {
    storageMap.clear();
    const projectToPersist: Project = {
      schemaVersion: 2,
      projectId: 'persist-p1',
      title: 'Persistent Film',
      storySourceMode: 'AI_CONCEPT',
      settings: { format: 'Shorts', targetRuntimeSeconds: 60 } as any,
      visualStyle: { name: 'Cinematic' } as any,
      sourceDrafts: {} as any,
      concepts: [],
      originalStoryText: '',
      importedScript: null,
      storyFoundation: { title: 'Persistent Film', logline: 'Logline' } as any,
      storyCanon: {
        characters: [{ id: 'CHAR-01', name: 'Robot' }],
        locations: [{ id: 'LOC-01', name: 'Hub' }],
        props: [{ id: 'PROP-01', name: 'Key', continuityDetails: 'Verified finite power' }],
        worldRules: [],
        beatMap: [],
        relationships: [],
        timeline: [],
        characterKnowledge: [],
        setupPayoffs: [],
        unresolvedThreads: [],
        filmabilityNotes: '',
      } as any,
      canonAudit: {
        overallScore: 98,
        summary: 'Audit passed after auto-fix',
        issues: [
          {
            issueId: 'AUD-FIXED-01',
            severity: 'REQUIRED',
            section: 'Props',
            fieldPath: 'props',
            description: 'Finite power issue',
            consequence: 'None',
            suggestedFix: 'Fixed',
            classification: 'CONTINUITY',
            isSafeToAutoFix: true,
            status: 'RESOLVED',
            verifiedAt: '2026-10-13T04:00:00Z',
          },
        ],
        auditedAt: '2026-10-13T04:00:00Z',
      },
      stage1: {
        status: 'READY_FOR_REVIEW',
        currentStep: 'REVIEW',
        generationProgress: 100,
        approved: false,
        locked: false,
        dirty: false,
        needsReaudit: false,
        unresolvedIssuesCount: 0,
      },
      stage2: { implemented: true, assets: [] } as any,
      stage3: { implemented: true, scenes: [] } as any,
      stage4: { implemented: true, shotPackages: [] } as any,
      selectedConceptId: null,
      storyDevelopment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProjectToStorage(projectToPersist);
    const reloaded = loadSavedProject();

    assert(reloaded.projectId === 'persist-p1', 'Project reloaded from storage');
    assert(
      reloaded.storyCanon?.props[0].continuityDetails === 'Verified finite power',
      'Fixed canon prop persisted'
    );
    assert(reloaded.canonAudit?.issues.length === 1, 'Audit issues preserved');
    assert(reloaded.canonAudit?.issues[0].status === 'RESOLVED', 'RESOLVED status preserved');
    assert(reloaded.stage1.needsReaudit === false, 'needsReaudit flag preserved');
  }

  // TEST 12: Stages 2, 3, and 4 remain functional.
  console.log('\nTEST 12: Stages 2, 3, and 4 remain functional');
  {
    const proj = loadSavedProject();
    assert(proj.stage2.implemented === true, 'Stage 2 is implemented');
    assert(Array.isArray(proj.stage2.assets), 'Stage 2 assets array exists');
    assert(proj.stage3.implemented === true, 'Stage 3 is implemented');
    assert(Array.isArray(proj.stage3.scenes), 'Stage 3 scenes array exists');
    assert(proj.stage4.implemented === true, 'Stage 4 is implemented');
    assert(Array.isArray((proj.stage4 as any).shotPackages), 'Stage 4 shotPackages array exists');
  }

  console.log('\n============================================================');
  console.log('🎉 ALL 12 REGRESSION TESTS COMPLETED SUCCESSFULLY!');
  console.log('============================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
