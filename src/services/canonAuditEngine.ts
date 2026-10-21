import {
  AuditIssue,
  AuditSeverity,
  CanonBeat,
  CanonCharacter,
  CanonLocation,
  CanonProp,
  CanonWorldRule,
  Project,
  StoryCanon,
  StoryFoundation,
} from '../types/filmStudio';

export interface AuditSummaryCounts {
  totalIssues: number;
  unresolvedRequired: number; // Blocking REQUIRED issues
  unresolvedWarning: number;
  unresolvedInfo: number;
  unresolvedSafeToFix: number;
  resolvedCount: number;
  isEligibleForApproval: boolean;
}

/**
 * Normalizes any issue status (including missing, legacy, or unexpected values) to a canonical status.
 * Absent or legacy values default to 'OPEN'.
 */
export function normalizeIssueStatus(status?: string | null): AuditIssue['status'] {
  if (!status) return 'OPEN';
  const upper = String(status).trim().toUpperCase();
  if (upper === 'RESOLVED') return 'RESOLVED';
  if (upper === 'FAILED') return 'FAILED';
  if (upper === 'NEEDS_REVIEW') return 'NEEDS_REVIEW';
  if (upper === 'IGNORED') return 'IGNORED';
  return 'OPEN';
}

/**
 * An issue is strictly resolved ONLY if its status is 'RESOLVED'.
 * Any other status (OPEN, FAILED, NEEDS_REVIEW, IGNORED, or missing) is unresolved.
 */
export function isIssueResolved(issue?: Partial<AuditIssue> | null): boolean {
  if (!issue) return false;
  return normalizeIssueStatus(issue.status) === 'RESOLVED';
}

/**
 * A REQUIRED issue blocks approval unless explicitly and verified RESOLVED.
 */
export function isIssueBlocking(issue?: Partial<AuditIssue> | null): boolean {
  if (!issue) return false;
  return issue.severity === 'REQUIRED' && !isIssueResolved(issue);
}

/**
 * Sanitizes and normalizes an AuditIssue object ensuring all required fields are present and safe.
 */
export function normalizeAuditIssue(issue: any, index: number = 0): AuditIssue {
  if (!issue || typeof issue !== 'object') {
    return {
      issueId: `AUD-DET-${String(index + 1).padStart(2, '0')}`,
      severity: 'REQUIRED',
      section: 'General',
      fieldPath: 'canon',
      description: 'Malformed audit issue entry.',
      consequence: 'Audit integrity compromised.',
      suggestedFix: 'Re-run audit verification.',
      classification: 'DATA_MALFORMED',
      isSafeToAutoFix: false,
      status: 'OPEN',
    };
  }

  const sevRaw = String(issue.severity || 'WARNING').toUpperCase();
  const severity: AuditSeverity =
    sevRaw === 'REQUIRED' ? 'REQUIRED' : sevRaw === 'INFO' ? 'INFO' : 'WARNING';

  const issueId =
    typeof issue.issueId === 'string' && issue.issueId.trim()
      ? issue.issueId.trim()
      : `AUD-${String(index + 1).padStart(2, '0')}`;

  return {
    issueId,
    severity,
    section: typeof issue.section === 'string' ? issue.section : 'Story Canon',
    fieldPath: typeof issue.fieldPath === 'string' ? issue.fieldPath : 'canon',
    description: typeof issue.description === 'string' ? issue.description : 'Issue detected',
    consequence: typeof issue.consequence === 'string' ? issue.consequence : 'Continuity or logic defect',
    suggestedFix: typeof issue.suggestedFix === 'string' ? issue.suggestedFix : 'Review canon entry',
    classification: typeof issue.classification === 'string' ? issue.classification : 'CANON_CHECK',
    isSafeToAutoFix: Boolean(issue.isSafeToAutoFix),
    status: normalizeIssueStatus(issue.status),
    verifiedAt: issue.verifiedAt,
    verificationDetails: issue.verificationDetails,
    repairError: issue.repairError,
  };
}

/**
 * Single shared, normalized audit summary calculator used across all UI tabs, badges, filters, and gates.
 */
export function deriveAuditSummary(issuesInput: any[] = []): AuditSummaryCounts {
  const issues = Array.isArray(issuesInput)
    ? issuesInput.map((i, idx) => normalizeAuditIssue(i, idx))
    : [];

  let unresolvedRequired = 0;
  let unresolvedWarning = 0;
  let unresolvedInfo = 0;
  let unresolvedSafeToFix = 0;
  let resolvedCount = 0;

  for (const issue of issues) {
    if (isIssueResolved(issue)) {
      resolvedCount++;
    } else {
      if (issue.severity === 'REQUIRED') {
        unresolvedRequired++;
      } else if (issue.severity === 'WARNING') {
        unresolvedWarning++;
      } else if (issue.severity === 'INFO') {
        unresolvedInfo++;
      }

      if (issue.isSafeToAutoFix) {
        unresolvedSafeToFix++;
      }
    }
  }

  return {
    totalIssues: issues.length,
    unresolvedRequired,
    unresolvedWarning,
    unresolvedInfo,
    unresolvedSafeToFix,
    resolvedCount,
    isEligibleForApproval: unresolvedRequired === 0,
  };
}

// =========================================================================
// LAYER A — DETERMINISTIC CANON VALIDATION
// Repeatable, zero-hallucination validation against structural invariants.
// =========================================================================

export function runDeterministicCanonValidation(
  foundation?: StoryFoundation | null,
  canon?: StoryCanon | null,
  projectSettings?: any | null
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let counter = 1;

  const addIssue = (
    severity: AuditSeverity,
    section: string,
    fieldPath: string,
    description: string,
    consequence: string,
    suggestedFix: string,
    classification: string,
    isSafeToAutoFix: boolean = false,
    customId?: string
  ) => {
    issues.push({
      issueId: customId || `DET-${classification.replace(/[^A-Z0-9]/gi, '_')}-${String(counter++).padStart(2, '0')}`,
      severity,
      section,
      fieldPath,
      description,
      consequence,
      suggestedFix,
      classification,
      isSafeToAutoFix,
      status: 'OPEN',
    });
  };

  // 1. Foundation Invariants
  if (!foundation) {
    addIssue(
      'REQUIRED',
      'Foundation',
      'storyFoundation',
      'Story Foundation is missing or not compiled.',
      'Stage 1 cannot establish tone, runtime, or visual style.',
      'Compile Foundation V1 before proceeding.',
      'FOUNDATION_MISSING',
      false,
      'DET-FOUNDATION-001'
    );
    return issues;
  }

  if (!foundation.title || !foundation.title.trim()) {
    addIssue(
      'REQUIRED',
      'Foundation',
      'storyFoundation.title',
      'Project title is empty in Story Foundation.',
      'Project lacks an authoritative name.',
      'Provide a valid story title.',
      'TITLE_EMPTY',
      false,
      'DET-TITLE-001'
    );
  }

  if (!foundation.logline || !foundation.logline.trim()) {
    addIssue(
      'REQUIRED',
      'Foundation',
      'storyFoundation.logline',
      'Logline is missing in Story Foundation.',
      'Core narrative premise cannot be verified.',
      'Provide a clear logline.',
      'LOGLINE_EMPTY',
      false,
      'DET-LOGLINE-001'
    );
  }

  // 2. Story Canon Invariants
  if (!canon) {
    addIssue(
      'REQUIRED',
      'Story Canon',
      'storyCanon',
      'Story Canon is missing or not compiled.',
      'Cannot verify characters, world rules, beats, or locations.',
      'Compile Story Canon V1.',
      'CANON_MISSING',
      false,
      'DET-CANON-001'
    );
    return issues;
  }

  // Characters
  const characters = Array.isArray(canon.characters) ? canon.characters : [];
  if (characters.length === 0) {
    addIssue(
      'REQUIRED',
      'Characters',
      'storyCanon.characters',
      'Story Canon contains zero registered characters.',
      'Narrative cannot progress without active protagonists.',
      'Register at least one primary character.',
      'CHARACTERS_EMPTY',
      false,
      'DET-CHAR-001'
    );
  } else {
    const charIdSet = new Set<string>();
    for (const c of characters) {
      if (!c.id || !c.id.trim()) {
        addIssue(
          'REQUIRED',
          'Characters',
          `storyCanon.characters.${c.name || 'unnamed'}.id`,
          `Character "${c.name || 'unnamed'}" has no valid ID.`,
          'Stage 2 and 3 visual references will fail.',
          'Assign a standard ID like CHAR-01.',
          'CHAR_ID_MISSING',
          true
        );
      } else {
        const normId = c.id.trim().toUpperCase();
        if (charIdSet.has(normId)) {
          addIssue(
            'REQUIRED',
            'Characters',
            `storyCanon.characters.${normId}`,
            `Duplicate character ID "${normId}" detected.`,
            'Cross-stage prompts will misattribute character traits.',
            'Assign a unique sequential ID to each character.',
            'CHAR_ID_DUPLICATE',
            false
          );
        }
        charIdSet.add(normId);
      }

      if (!c.name || !c.name.trim()) {
        addIssue(
          'REQUIRED',
          'Characters',
          `storyCanon.characters.${c.id || 'unknown'}.name`,
          `Character [${c.id}] has an empty name.`,
          'Screenplay and visual assets cannot identify the subject.',
          'Specify a character name.',
          'CHAR_NAME_EMPTY',
          false
        );
      }
    }
  }

  // Locations
  const locations = Array.isArray(canon.locations) ? canon.locations : [];
  if (locations.length === 0) {
    addIssue(
      'REQUIRED',
      'Locations',
      'storyCanon.locations',
      'Story Canon contains zero registered locations.',
      'Cinematic scenes require at least one anchored environment.',
      'Add at least one key story location.',
      'LOCATIONS_EMPTY',
      false,
      'DET-LOC-001'
    );
  } else {
    const locIdSet = new Set<string>();
    for (const l of locations) {
      if (!l.id || !l.id.trim()) {
        addIssue(
          'REQUIRED',
          'Locations',
          `storyCanon.locations.${l.name || 'unnamed'}.id`,
          `Location "${l.name || 'unnamed'}" has no valid ID.`,
          'Spatial anchor lookups in Stage 2 will fail.',
          'Assign an ID like LOC-01.',
          'LOC_ID_MISSING',
          true
        );
      } else {
        const normId = l.id.trim().toUpperCase();
        if (locIdSet.has(normId)) {
          addIssue(
            'REQUIRED',
            'Locations',
            `storyCanon.locations.${normId}`,
            `Duplicate location ID "${normId}" detected.`,
            'Background consistency across shots will be broken.',
            'Assign a unique sequential ID to each location.',
            'LOC_ID_DUPLICATE',
            false
          );
        }
        locIdSet.add(normId);
      }
    }
  }

  // Props: check duplicate IDs and schema safely
  const props = Array.isArray(canon.props) ? canon.props : [];
  const propIdSet = new Set<string>();
  for (const p of props) {
    if (!p) continue;
    const pid = typeof p.id === 'string' ? p.id.trim().toUpperCase() : '';
    if (pid) {
      if (propIdSet.has(pid)) {
        addIssue(
          'REQUIRED',
          'Props',
          `storyCanon.props.${pid}`,
          `Duplicate prop ID "${pid}" detected.`,
          'Item tracking and continuity prompts will collide.',
          'Assign a unique sequential ID such as PROP-04.',
          'PROP_ID_DUPLICATE',
          false
        );
      }
      propIdSet.add(pid);
    }
  }

  // World Rules: check duplicate IDs and missing statements
  const worldRules = Array.isArray(canon.worldRules) ? canon.worldRules : [];
  const ruleIdSet = new Set<string>();
  for (const r of worldRules) {
    if (!r) continue;
    const rid = typeof r.id === 'string' ? r.id.trim().toUpperCase() : '';
    if (rid) {
      if (ruleIdSet.has(rid)) {
        addIssue(
          'WARNING',
          'World Rules',
          `storyCanon.worldRules.${rid}`,
          `Duplicate world rule ID "${rid}" detected.`,
          'Rule lookup may resolve ambiguously.',
          'Ensure distinct rule IDs.',
          'RULE_ID_DUPLICATE',
          false
        );
      }
      ruleIdSet.add(rid);
    }
    if (!r.rule || !r.rule.trim()) {
      addIssue(
        'WARNING',
        'World Rules',
        `storyCanon.worldRules.${rid || 'unknown'}.rule`,
        `World rule "${(r as any).name || r.id || rid}" has an empty rule statement.`,
        'Logic constraints will not guide script generation.',
        'Define explicit law or limitation.',
        'RULE_STATEMENT_EMPTY',
        false
      );
    }
  }

  // 3. EPISODIC BEAT VALIDATION (REQUIREMENT 5)
  // Stage 1 contains season-level narrative beats and an episode-by-episode roadmap.
  // Do NOT treat season-level beat count as total scene-level beats!
  const isEpisodic =
    (projectSettings?.episodeCount && Number(projectSettings.episodeCount) > 1) ||
    (Array.isArray(canon.episodicRoadmap) && canon.episodicRoadmap.length > 0) ||
    String(projectSettings?.format || '').toLowerCase().includes('series') ||
    String(foundation?.runtimeGuideline || '').toLowerCase().includes('series') ||
    String(foundation?.runtimeGuideline || '').toLowerCase().includes('episode');

  const beats = Array.isArray(canon.beatMap) ? canon.beatMap : [];
  const roadmap = Array.isArray(canon.episodicRoadmap) ? canon.episodicRoadmap : [];

  if (isEpisodic) {
    // For episodic projects, verify the episodic roadmap
    if (roadmap.length === 0) {
      addIssue(
        'WARNING',
        'Episodic Roadmap',
        'storyCanon.episodicRoadmap',
        'Episodic project has no episode roadmap defined.',
        'Downstream script planner lacks episode boundaries.',
        'Generate or populate the episodic roadmap.',
        'EPISODIC_ROADMAP_EMPTY',
        false
      );
    } else {
      // Roadmap is present (e.g. 10 episodes in The Little Circuit Family)
      // Check that episodes have valid titles and conflict
      let missingLoglines = 0;
      for (const ep of roadmap) {
        if (!ep.title || !ep.logline) {
          missingLoglines++;
        }
      }
      if (missingLoglines > 0) {
        addIssue(
          'WARNING',
          'Episodic Roadmap',
          'storyCanon.episodicRoadmap',
          `${missingLoglines} episodes in the roadmap are missing loglines or titles.`,
          'Episode arcs lack clear premises.',
          'Fill in missing episode details in Story Canon.',
          'EPISODIC_LOGLINE_MISSING',
          false
        );
      }
    }

    // In episodic long-form, beatMap represents season-level arc milestones.
    // 3-12 macro beats is completely normal and valid for Stage 1.
    // Never issue a REQUIRED blocker demanding 30 scene-level beats in Stage 1!
    if (beats.length === 0) {
      addIssue(
        'REQUIRED',
        'Narrative Beats',
        'storyCanon.beatMap',
        'Story Canon has zero narrative arc beats.',
        'Season narrative backbone is missing.',
        'Define key season milestone beats.',
        'BEATS_EMPTY',
        false
      );
    } else if (beats.length < 3 && roadmap.length > 0) {
      addIssue(
        'WARNING',
        'Narrative Beats',
        'storyCanon.beatMap',
        `Season arc has only ${beats.length} milestone beats for a ${roadmap.length}-episode series.`,
        'Season pacing across episodes may lack intermediate turning points.',
        'Consider defining at least 4–8 season arc milestone beats.',
        'EPISODIC_BEAT_DENSITY',
        false
      );
    }
  } else {
    // Standalone film / shorts
    if (beats.length === 0) {
      addIssue(
        'REQUIRED',
        'Narrative Beats',
        'storyCanon.beatMap',
        'Story Canon has zero narrative beats.',
        'Story structure cannot be planned without beats.',
        'Compile or add narrative beats.',
        'BEATS_EMPTY',
        false
      );
    }
  }

  // Beat reference checks: check if beat references broken location or character IDs
  const validCharIds = new Set(characters.map((c) => (c.id || '').trim().toUpperCase()));
  const validLocIds = new Set(locations.map((l) => (l.id || '').trim().toUpperCase()));

  for (const beat of beats) {
    if (!beat) continue;
    if (beat.locationId) {
      const bLoc = beat.locationId.trim().toUpperCase();
      if (!validLocIds.has(bLoc)) {
        addIssue(
          'WARNING',
          'Narrative Beats',
          `storyCanon.beatMap.${beat.id || 'beat'}.locationId`,
          `Beat [${beat.id}] references location "${beat.locationId}" which is not registered in Locations.`,
          'Stage 3 shot planner will have an unresolved background asset.',
          `Register "${beat.locationId}" in Locations & Props or link to an existing location.`,
          'BEAT_LOCATION_UNRESOLVED',
          true
        );
      }
    }
  }

  return issues;
}

// =========================================================================
// STAGE 1 APPROVAL GATEWAY VALIDATION
// Authoritative, single gate used in Canon Audit, Final Review, & Context.
// =========================================================================

export interface ApprovalGateResult {
  eligible: boolean;
  blockerReason: string | null;
  summary: AuditSummaryCounts;
  unresolvedRequiredIssues: AuditIssue[];
}

export function checkStage1ApprovalGate(project: Project): ApprovalGateResult {
  const audit = project.canonAudit;
  const issues = audit?.issues || [];
  const summary = deriveAuditSummary(issues);

  // Collect any blocking REQUIRED issues
  const unresolvedRequiredIssues = issues
    .map((i, idx) => normalizeAuditIssue(i, idx))
    .filter((i) => i.severity === 'REQUIRED' && !isIssueResolved(i));

  // 1. Foundation & Canon must exist
  if (!project.storyFoundation) {
    return {
      eligible: false,
      blockerReason: 'Story Foundation V1 must be compiled before final approval.',
      summary,
      unresolvedRequiredIssues,
    };
  }

  if (!project.storyCanon) {
    return {
      eligible: false,
      blockerReason: 'Story Canon V1 must be compiled before final approval.',
      summary,
      unresolvedRequiredIssues,
    };
  }

  // 2. Mode-specific source checks
  if (project.storySourceMode === 'AI_CONCEPT') {
    if (!project.selectedConceptId || !project.storyDevelopment) {
      return {
        eligible: false,
        blockerReason: 'Mode A requires a selected story concept and completed narrative development.',
        summary,
        unresolvedRequiredIssues,
      };
    }
  } else if (project.storySourceMode === 'OWN_STORY') {
    if (!project.originalStoryText || !project.originalStoryText.trim()) {
      return {
        eligible: false,
        blockerReason: "Mode B requires non-empty author's original story text.",
        summary,
        unresolvedRequiredIssues,
      };
    }
  } else if (project.storySourceMode === 'OWN_SCRIPT') {
    if (!project.importedScript || !project.importedScript.originalText.trim()) {
      return {
        eligible: false,
        blockerReason: 'Mode C requires non-empty imported screenplay text.',
        summary,
        unresolvedRequiredIssues,
      };
    }
  }

  // 3. Needs Re-Audit Check
  if (project.stage1.needsReaudit) {
    return {
      eligible: false,
      blockerReason: 'Story Canon has been modified since the last audit. Please re-run Canon Audit to verify continuity before final approval.',
      summary,
      unresolvedRequiredIssues,
    };
  }

  // 4. Deterministic validation check
  const deterministicIssues = runDeterministicCanonValidation(
    project.storyFoundation,
    project.storyCanon,
    project.settings
  );
  const detBlocking = deterministicIssues.filter((i) => i.severity === 'REQUIRED');
  if (detBlocking.length > 0) {
    return {
      eligible: false,
      blockerReason: `Deterministic validation found ${detBlocking.length} blocking structural defect(s): ${detBlocking[0].description}`,
      summary,
      unresolvedRequiredIssues: [...unresolvedRequiredIssues, ...detBlocking],
    };
  }

  // 5. Audit existence check
  if (!audit) {
    return {
      eligible: false,
      blockerReason: 'Canon Quality & Continuity Audit has not been executed. Please run Canon Audit first.',
      summary,
      unresolvedRequiredIssues,
    };
  }

  // 6. Unresolved REQUIRED issues check
  if (unresolvedRequiredIssues.length > 0) {
    const firstIssue = unresolvedRequiredIssues[0];
    const statusNote = firstIssue.status !== 'OPEN' ? ` (status: ${firstIssue.status})` : '';
    return {
      eligible: false,
      blockerReason: `Cannot approve: ${unresolvedRequiredIssues.length} blocking REQUIRED audit issue(s) remain unresolved [${firstIssue.issueId}${statusNote} - ${firstIssue.description}]. Please resolve them in Canon Audit first.`,
      summary,
      unresolvedRequiredIssues,
    };
  }

  return {
    eligible: true,
    blockerReason: null,
    summary,
    unresolvedRequiredIssues: [],
  };
}

// =========================================================================
// SURGICAL REPAIR VERIFICATION & MERGING
// Validates repaired records, confirms targeted change, preserves unrelated fields.
// =========================================================================

export interface RepairMergeResult {
  success: boolean;
  canon?: StoryCanon;
  error?: string;
  explanation?: string;
}

export function verifyAndMergeCanonRepair(
  currentCanon: StoryCanon,
  repairData: any,
  issue: AuditIssue
): RepairMergeResult {
  if (!currentCanon || typeof currentCanon !== 'object') {
    return { success: false, error: 'Current story canon is invalid.' };
  }
  if (!repairData || typeof repairData !== 'object') {
    return { success: false, error: 'Repair response contains no data.' };
  }

  // Deep clone to avoid mutating input during validation
  const workingCanon: StoryCanon = JSON.parse(JSON.stringify(currentCanon));

  // Case 1: Targeted record repair (preferred precision approach)
  // { targetSection, targetRecordId, repairedRecord, fieldPath }
  if (repairData.targetSection && repairData.repairedRecord) {
    const secKey = String(repairData.targetSection).trim() as keyof StoryCanon;
    const targetArr = workingCanon[secKey];

    if (Array.isArray(targetArr)) {
      const recId = repairData.targetRecordId
        ? String(repairData.targetRecordId).trim().toUpperCase()
        : null;

      let matchedIndex = -1;
      if (recId) {
        matchedIndex = targetArr.findIndex((item: any) => {
          if (!item) return false;
          const id = (item.id || item.propId || item.locationId || item.ruleId || '').trim().toUpperCase();
          return id === recId;
        });
      }

      if (matchedIndex >= 0) {
        // Merge into the existing record, preserving other records and stable ID
        const originalRec = targetArr[matchedIndex];
        const updatedRec = {
          ...originalRec,
          ...repairData.repairedRecord,
          id: (originalRec as any).id || (originalRec as any).characterId || (originalRec as any).issueId || recId, // Strictly preserve original stable ID
        };

        // Verify that something actually changed
        if (JSON.stringify(originalRec) === JSON.stringify(updatedRec)) {
          return {
            success: false,
            error: `Targeted repair on record [${recId}] produced identical content. Defect was not modified.`,
          };
        }

        const newArr = [...targetArr];
        newArr[matchedIndex] = updatedRec;
        (workingCanon as any)[secKey] = newArr;

        return {
          success: true,
          canon: workingCanon,
          explanation: repairData.explanation || `Surgically updated [${recId}] in section ${String(secKey)}.`,
        };
      } else if (issue.suggestedFix?.toLowerCase().includes('register') || issue.suggestedFix?.toLowerCase().includes('add')) {
        // Genuinely missing record addition
        const newRec = { ...repairData.repairedRecord };
        const newArr = [...targetArr, newRec];
        (workingCanon as any)[secKey] = newArr;
        return {
          success: true,
          canon: workingCanon,
          explanation: repairData.explanation || `Added missing record to ${String(secKey)}.`,
        };
      }
    } else if (typeof targetArr === 'object' && targetArr !== null) {
      // Object section (e.g. narrativeStructure)
      const updatedSection = {
        ...targetArr,
        ...repairData.repairedRecord,
      };
      (workingCanon as any)[secKey] = updatedSection;
      return {
        success: true,
        canon: workingCanon,
        explanation: repairData.explanation || `Surgically updated ${String(secKey)}.`,
      };
    }
  }

  // Case 2: Full repairedCanon returned by Gemini fallback
  if (repairData.repairedCanon && typeof repairData.repairedCanon === 'object') {
    const candidate = repairData.repairedCanon;

    // Identify which section actually changed
    const canonKeys: (keyof StoryCanon)[] = [
      'characters',
      'locations',
      'props',
      'worldRules',
      'beatMap',
      'relationships',
      'timeline',
      'setupPayoffs',
      'episodicRoadmap',
      'narrativeStructure',
    ];

    let changedSectionsCount = 0;
    for (const key of canonKeys) {
      const origSec = currentCanon[key];
      const candSec = candidate[key];

      if (candSec !== undefined && JSON.stringify(origSec) !== JSON.stringify(candSec)) {
        changedSectionsCount++;
        // Merge the candidate section into workingCanon, but if it is an array, ensure it is non-empty if orig was non-empty
        if (Array.isArray(origSec) && origSec.length > 0 && Array.isArray(candSec) && candSec.length === 0) {
          return {
            success: false,
            error: `Repair attempt erroneously emptied array section "${String(key)}". Aborting to prevent data loss.`,
          };
        }
        (workingCanon as any)[key] = candSec;
      }
    }

    if (changedSectionsCount === 0) {
      return {
        success: false,
        error: 'Repaired canon is identical to current canon. No defect was resolved.',
      };
    }

    return {
      success: true,
      canon: workingCanon,
      explanation: repairData.explanation || `Repaired canon across ${changedSectionsCount} section(s).`,
    };
  }

  return {
    success: false,
    error: 'Repair response does not match expected schema (missing repairedRecord or repairedCanon).',
  };
}
