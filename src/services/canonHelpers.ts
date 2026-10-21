import {
  CanonLocation,
  CanonProp,
  CanonCharacter,
  CanonWorldRule,
  CanonBeat,
  CanonSetupPayoff,
  StoryCanon,
  Project,
} from '../types/filmStudio';

/**
 * Safely extracts a string ID from any item shape (string, object with id, or object with alias/legacy key).
 * Returns an empty string if the ID is missing, undefined, or invalid.
 */
export function extractRawId(item: any, fallbackKey?: string): string {
  if (item === null || item === undefined) return '';
  if (typeof item === 'string') return item.trim();
  if (typeof item === 'number') return String(item);
  if (typeof item === 'object') {
    if (typeof item.id === 'string' && item.id.trim()) {
      return item.id.trim();
    }
    if (typeof item.id === 'number') {
      return String(item.id);
    }
    if (fallbackKey && typeof item[fallbackKey] === 'string' && item[fallbackKey].trim()) {
      return item[fallbackKey].trim();
    }
    if (fallbackKey && typeof item[fallbackKey] === 'number') {
      return String(item[fallbackKey]);
    }
    // Check known canonical / legacy aliases safely
    if (typeof item.propId === 'string' && item.propId.trim()) return item.propId.trim();
    if (typeof item.locationId === 'string' && item.locationId.trim()) return item.locationId.trim();
    if (typeof item.characterId === 'string' && item.characterId.trim()) return item.characterId.trim();
    if (typeof item.ruleId === 'string' && item.ruleId.trim()) return item.ruleId.trim();
    if (typeof item.beatId === 'string' && item.beatId.trim()) return item.beatId.trim();
    if (typeof item.setupPayoffId === 'string' && item.setupPayoffId.trim()) return item.setupPayoffId.trim();
  }
  return '';
}

/**
 * Parses numeric suffixes from ID strings, checking both standard prefix tags
 * (e.g. PROP-01, LOC-02) and any embedded or trailing numbers.
 * Guaranteed never to call .match() on undefined or non-string values.
 */
export function extractNumericSuffix(rawId: any, prefix: string): number | null {
  if (rawId === null || rawId === undefined) return null;
  if (typeof rawId !== 'string') {
    if (typeof rawId === 'number' && !isNaN(rawId)) {
      return rawId;
    }
    return null;
  }
  const cleanId = rawId.trim();
  if (!cleanId) return null;

  // 1. Strict prefix match: e.g. PROP-01, PROP_01, PROP01
  const prefixRegex = new RegExp(`^${prefix}[-_]?(\\d+)$`, 'i');
  const prefixMatch = cleanId.match(prefixRegex);
  if (prefixMatch && prefixMatch[1]) {
    const val = parseInt(prefixMatch[1], 10);
    return isNaN(val) ? null : val;
  }

  // 2. Fallback: match any trailing sequence of digits: e.g. CUSTOM_PROP_4
  const trailingRegex = /(\\d+)$/;
  const trailingMatch = cleanId.match(trailingRegex);
  if (trailingMatch && trailingMatch[1]) {
    const val = parseInt(trailingMatch[1], 10);
    return isNaN(val) ? null : val;
  }

  return null;
}

/**
 * Generic generator for sequential, collision-free canonical IDs.
 * Handles missing, invalid, or legacy ID values without crashing.
 * Never renumbers existing records.
 */
export function generateSequentialId(
  items: any[] = [],
  prefix: string,
  aliasKey?: string
): string {
  const existingNums: number[] = [];
  const existingIdSet = new Set<string>();

  const safeItems = Array.isArray(items) ? items : [];

  for (const item of safeItems) {
    if (!item) continue;
    const rawId = extractRawId(item, aliasKey);
    if (rawId) {
      existingIdSet.add(rawId.toUpperCase());
      const num = extractNumericSuffix(rawId, prefix);
      if (num !== null && !isNaN(num) && num > 0) {
        existingNums.push(num);
      }
    }
  }

  const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
  let candidateNum = maxNum + 1;
  let candidateId = `${prefix}-${String(candidateNum).padStart(2, '0')}`;

  // Ensure strict uniqueness in case existing records have un-numbered or out-of-order IDs
  while (existingIdSet.has(candidateId.toUpperCase())) {
    candidateNum++;
    candidateId = `${prefix}-${String(candidateNum).padStart(2, '0')}`;
  }

  return candidateId;
}

/**
 * Returns the next available unique location ID (e.g. LOC-01, LOC-02, LOC-04...).
 * Safely handles missing, invalid, and legacy ID values without crashing.
 */
export function getNextLocationId(locations: any[] = []): string {
  return generateSequentialId(locations, 'LOC', 'locationId');
}

/**
 * Returns the next available unique prop ID (e.g. PROP-01, PROP-02, PROP-04...).
 * Safely handles missing, invalid, and legacy ID values without crashing.
 */
export function getNextPropId(props: any[] = []): string {
  return generateSequentialId(props, 'PROP', 'propId');
}

/**
 * Returns the next available unique character ID (e.g. CHAR-01, CHAR-02...).
 */
export function getNextCharacterId(characters: any[] = []): string {
  return generateSequentialId(characters, 'CHAR', 'characterId');
}

/**
 * Returns the next available unique world rule ID (e.g. RULE-01, RULE-02...).
 */
export function getNextRuleId(rules: any[] = []): string {
  return generateSequentialId(rules, 'RULE', 'ruleId');
}

/**
 * Returns the next available unique beat ID (e.g. BEAT-01, BEAT-02...).
 */
export function getNextBeatId(beats: any[] = []): string {
  return generateSequentialId(beats, 'BEAT', 'beatId');
}

/**
 * Returns the next available unique setup/payoff ID (e.g. SP-01, SP-02...).
 */
export function getNextSetupPayoffId(sps: any[] = []): string {
  return generateSequentialId(sps, 'SP', 'setupPayoffId');
}

/**
 * Checks where a Location is referenced across canon beats, scenes, and shots.
 * Null-safe on all inputs.
 */
export function getLocationReferences(
  locationId?: string | null,
  canon?: StoryCanon | null,
  project?: Project | null
): string[] {
  const refs: string[] = [];
  if (!locationId || typeof locationId !== 'string') return refs;
  const normalizedId = locationId.trim().toUpperCase();
  if (!normalizedId) return refs;

  if (canon?.beatMap && Array.isArray(canon.beatMap)) {
    for (const beat of canon.beatMap) {
      if (!beat) continue;
      const beatLocId = typeof beat.locationId === 'string' ? beat.locationId.trim().toUpperCase() : '';
      const beatDesc = typeof beat.description === 'string' ? beat.description.toUpperCase() : '';
      if (beatLocId === normalizedId || (normalizedId.length >= 3 && beatDesc.includes(normalizedId))) {
        refs.push(`Beat ${beat.id || 'Unknown'}: "${beat.title || 'Untitled'}"`);
      }
    }
  }

  if (project?.stage3?.scenes && Array.isArray(project.stage3.scenes)) {
    for (const sc of project.stage3.scenes) {
      if (!sc) continue;
      const scLocId = typeof sc.locationId === 'string' ? sc.locationId.trim().toUpperCase() : '';
      if (scLocId === normalizedId) {
        refs.push(`Scene ${sc.sceneNumber || '?'}: "${sc.title || 'Untitled'}"`);
      }
    }
  }

  if (project?.stage3?.shots && Array.isArray(project.stage3.shots)) {
    for (const sh of project.stage3.shots) {
      if (!sh) continue;
      const shLocId = typeof sh.locationId === 'string' ? sh.locationId.trim().toUpperCase() : '';
      if (shLocId === normalizedId) {
        refs.push(`Shot ${sh.shotId || '?'}: "${sh.purpose || 'Untitled'}"`);
      }
    }
  }

  if (project?.importedScript?.extractedScenes && Array.isArray(project.importedScript.extractedScenes)) {
    for (const sc of project.importedScript.extractedScenes) {
      if (!sc) continue;
      const scLoc = typeof sc.location === 'string' ? sc.location.toUpperCase() : '';
      if (scLoc.includes(normalizedId)) {
        refs.push(`Script Scene ${sc.sceneNumber || '?'}: "${sc.slugline || 'Untitled'}"`);
      }
    }
  }

  return refs;
}

/**
 * Checks where a Prop is referenced across canon beats, scenes, and shots.
 * Null-safe on all inputs.
 */
export function getPropReferences(
  propId?: string | null,
  canon?: StoryCanon | null,
  project?: Project | null
): string[] {
  const refs: string[] = [];
  if (!propId || typeof propId !== 'string') return refs;
  const normalizedId = propId.trim().toUpperCase();
  if (!normalizedId) return refs;

  if (canon?.beatMap && Array.isArray(canon.beatMap)) {
    for (const beat of canon.beatMap) {
      if (!beat) continue;
      const beatDesc = typeof beat.description === 'string' ? beat.description.toUpperCase() : '';
      if (normalizedId.length >= 3 && beatDesc.includes(normalizedId)) {
        refs.push(`Beat ${beat.id || 'Unknown'}: "${beat.title || 'Untitled'}"`);
      }
    }
  }

  if (project?.stage3?.scenes && Array.isArray(project.stage3.scenes)) {
    for (const sc of project.stage3.scenes) {
      if (!sc) continue;
      if (
        Array.isArray(sc.propIds) &&
        sc.propIds.some((p: any) => typeof p === 'string' && p.trim().toUpperCase() === normalizedId)
      ) {
        refs.push(`Scene ${sc.sceneNumber || '?'}: "${sc.title || 'Untitled'}"`);
      }
    }
  }

  if (project?.stage3?.shots && Array.isArray(project.stage3.shots)) {
    for (const sh of project.stage3.shots) {
      if (!sh) continue;
      if (
        Array.isArray(sh.propIds) &&
        sh.propIds.some((p: any) => typeof p === 'string' && p.trim().toUpperCase() === normalizedId)
      ) {
        refs.push(`Shot ${sh.shotId || '?'}: "${sh.purpose || 'Untitled'}"`);
      }
    }
  }

  if (project?.importedScript?.extractedScenes && Array.isArray(project.importedScript.extractedScenes)) {
    for (const sc of project.importedScript.extractedScenes) {
      if (!sc) continue;
      if (
        Array.isArray(sc.propsUsed) &&
        sc.propsUsed.some((p: any) => typeof p === 'string' && p.trim().toUpperCase() === normalizedId)
      ) {
        refs.push(`Script Scene ${sc.sceneNumber || '?'}: "${sc.slugline || 'Untitled'}"`);
      }
    }
  }

  return refs;
}

/**
 * Safely unlinks / clears references to a deleted location from beatMap.
 */
export function reconcileLocationReferences(
  locationId: string,
  canon: StoryCanon
): StoryCanon {
  if (!locationId || typeof locationId !== 'string' || !canon) return canon;
  const normalizedId = locationId.trim().toUpperCase();
  const updatedBeats = (canon?.beatMap || []).map((beat) => {
    if (beat?.locationId && beat.locationId.trim().toUpperCase() === normalizedId) {
      return { ...beat, locationId: undefined };
    }
    return beat;
  });

  return {
    ...canon,
    beatMap: updatedBeats,
  };
}

/**
 * Safely unlinks / clears references to a deleted prop from canon.
 */
export function reconcilePropReferences(
  propId: string,
  canon: StoryCanon
): StoryCanon {
  if (!propId || typeof propId !== 'string' || !canon) return canon;
  return canon;
}

/**
 * Safely converts any value (undefined, null, scalar, object with properties, dictionary)
 * into a guaranteed Array. Never throws.
 */
export function toSafeArray<T = any>(val: any): T[] {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') {
    // Single item object e.g. { id: 'RULE-01', rule: '...' }
    if (val.id || val.rule || val.name || val.title || val.question) {
      return [val as T];
    }
    // Key-value dictionary / map: { "RULE-01": {...}, "RULE-02": {...} }
    const values = Object.values(val);
    if (values.length > 0 && values.every((v) => typeof v === 'object' && v !== null)) {
      return values as T[];
    }
    return [val as T];
  }
  return [];
}

/**
 * Normalizes a StoryCanon object so that every single collection is guaranteed
 * to be a non-null Array, preventing runtime "xxx.map is not a function" crashes.
 */
export function normalizeStoryCanon(rawCanon: any): StoryCanon {
  if (!rawCanon || typeof rawCanon !== 'object') {
    return {
      characters: [],
      relationships: [],
      worldRules: [],
      narrativeStructure: { type: 'Three-Act', description: '' },
      beatMap: [],
      timeline: [],
      characterKnowledge: [],
      setupPayoffs: [],
      locations: [],
      props: [],
      unresolvedThreads: [],
      filmabilityNotes: '',
      episodicRoadmap: [],
    };
  }

  return {
    ...rawCanon,
    characters: toSafeArray(rawCanon.characters),
    relationships: toSafeArray(rawCanon.relationships),
    worldRules: toSafeArray(rawCanon.worldRules),
    narrativeStructure:
      rawCanon.narrativeStructure && typeof rawCanon.narrativeStructure === 'object'
        ? rawCanon.narrativeStructure
        : { type: 'Three-Act', description: '' },
    beatMap: toSafeArray(rawCanon.beatMap || rawCanon.plotBeats),
    timeline: toSafeArray(rawCanon.timeline),
    characterKnowledge: toSafeArray(rawCanon.characterKnowledge),
    setupPayoffs: toSafeArray(rawCanon.setupPayoffs || rawCanon.setupsAndPayoffs),
    locations: toSafeArray(rawCanon.locations),
    props: toSafeArray(rawCanon.props),
    unresolvedThreads: toSafeArray(rawCanon.unresolvedThreads),
    filmabilityNotes:
      typeof rawCanon.filmabilityNotes === 'string' ? rawCanon.filmabilityNotes : '',
    episodicRoadmap: toSafeArray(rawCanon.episodicRoadmap || rawCanon.episodicGrid),
  };
}

