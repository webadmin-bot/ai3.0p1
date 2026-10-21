import {
  Project,
  VisualAsset,
  VisualStyleBible,
  CinematicShot,
  ScriptScene,
  VisualAssetType,
  AssetImportance,
} from '../types/filmStudio';

export type Phase2ReadinessStatus =
  | 'NOT STARTED'
  | 'GENERATING'
  | 'PROMPTS READY'
  | 'IMAGES PENDING'
  | 'IMAGE APPROVED'
  | 'MEDIA READY'
  | 'FAILED';

export interface ExtractedEntitiesSummary {
  characters: Array<{ id: string; name: string; role?: string; source: string; description?: string }>;
  locations: Array<{ id: string; name: string; source: string; description?: string }>;
  props: Array<{ id: string; name: string; owner?: string; source: string; description?: string }>;
}

/**
 * Normalizes an entity ID to standard format CHAR-001, LOC-001, PROP-001,
 * while respecting and preserving existing valid IDs already present.
 */
export function normalizeCanonicalId(prefix: 'CHAR' | 'LOC' | 'PROP', index: number, existingId?: string): string {
  if (existingId && existingId.trim()) {
    // Preserve valid existing ID if already formatted
    return existingId.trim();
  }
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

/**
 * Scans Phase 1 story assets (screenplay scenes, cinematic shots, canon, imported script, concepts)
 * to extract all distinct characters, locations, and props.
 */
export function extractPhase1Entities(project: Project): ExtractedEntitiesSummary {
  const charactersMap = new Map<string, { id: string; name: string; role?: string; source: string; description?: string }>();
  const locationsMap = new Map<string, { id: string; name: string; source: string; description?: string }>();
  const propsMap = new Map<string, { id: string; name: string; owner?: string; source: string; description?: string }>();

  // 1. Existing Phase 2 assets (keep stable IDs!)
  (project.stage2?.assets || []).forEach((asset) => {
    if (asset.type === 'CHARACTER') {
      charactersMap.set(asset.name.toLowerCase().trim(), {
        id: asset.id,
        name: asset.name,
        role: asset.importance === 'PRIMARY' ? 'PROTAGONIST' : 'SUPPORTING',
        source: 'Phase 2 Registry',
        description: asset.visualSpecification?.summary,
      });
    } else if (asset.type === 'LOCATION') {
      locationsMap.set(asset.name.toLowerCase().trim(), {
        id: asset.id,
        name: asset.name,
        source: 'Phase 2 Registry',
        description: asset.visualSpecification?.summary,
      });
    } else if (asset.type === 'PROP') {
      propsMap.set(asset.name.toLowerCase().trim(), {
        id: asset.id,
        name: asset.name,
        source: 'Phase 2 Registry',
        description: asset.visualSpecification?.summary,
      });
    }
  });

  // 2. Story Canon (if present)
  (project.storyCanon?.characters || []).forEach((c, idx) => {
    const key = c.name.toLowerCase().trim();
    if (!charactersMap.has(key)) {
      charactersMap.set(key, {
        id: c.id || normalizeCanonicalId('CHAR', charactersMap.size + 1),
        name: c.name,
        role: c.role,
        source: 'Story Canon',
        description: `${c.archetype || ''} ${c.personalityVoice || ''} Want: ${c.want || ''}`.trim(),
      });
    }
  });

  (project.storyCanon?.locations || []).forEach((l, idx) => {
    const key = l.name.toLowerCase().trim();
    if (!locationsMap.has(key)) {
      locationsMap.set(key, {
        id: l.id || normalizeCanonicalId('LOC', locationsMap.size + 1),
        name: l.name,
        source: 'Story Canon',
        description: l.moodAtmosphere || l.description || l.narrativeSignificance,
      });
    }
  });

  (project.storyCanon?.props || []).forEach((p, idx) => {
    const key = p.name.toLowerCase().trim();
    if (!propsMap.has(key)) {
      propsMap.set(key, {
        id: p.id || normalizeCanonicalId('PROP', propsMap.size + 1),
        name: p.name,
        owner: p.ownerOrHolder,
        source: 'Story Canon',
        description: p.storyFunction || p.description,
      });
    }
  });

  // 3. Screenplay Scenes (Phase 1 Screenplay)
  (project.stage3?.scenes || []).forEach((scene) => {
    // Location from slugline or locationId
    if (scene.slugline) {
      const parts = scene.slugline.split('-').map((s) => s.trim());
      const locName = parts.length > 1 ? parts.slice(1, -1).join(' - ') || parts[1] : scene.slugline.replace(/^(INT\.|EXT\.)\s*/i, '').trim();
      const cleanLoc = locName.replace(/\s*-\s*(DAY|NIGHT|DUSK|DAWN|CONTINUOUS).*/i, '').trim();
      if (cleanLoc && cleanLoc.length > 2 && !locationsMap.has(cleanLoc.toLowerCase())) {
        locationsMap.set(cleanLoc.toLowerCase(), {
          id: scene.locationId || normalizeCanonicalId('LOC', locationsMap.size + 1),
          name: cleanLoc,
          source: `Scene #${scene.sceneNumber}`,
          description: scene.storyPurpose || 'Key narrative scene location',
        });
      }
    }

    // Characters from dialogue speakers
    (scene.dialogueBlocks || []).forEach((d) => {
      if (d.speakerName && d.speakerName.trim()) {
        const name = d.speakerName.trim().toUpperCase();
        if (name !== 'NARRATOR' && name !== 'VOICE OVER' && name !== 'ALL' && !charactersMap.has(name.toLowerCase())) {
          charactersMap.set(name.toLowerCase(), {
            id: d.speakerId || normalizeCanonicalId('CHAR', charactersMap.size + 1),
            name: d.speakerName.trim(),
            role: 'CHARACTER',
            source: `Screenplay Dialogue (Scene #${scene.sceneNumber})`,
          });
        }
      }
    });

    // Character IDs from action blocks
    (scene.actionBlocks || []).forEach((a) => {
      (a.characterIds || []).forEach((cId) => {
        // If not already in map, look up in canon or add as known ID
        const existing = Array.from(charactersMap.values()).find((c) => c.id === cId);
        if (!existing) {
          charactersMap.set(cId.toLowerCase(), {
            id: cId,
            name: cId,
            source: `Scene #${scene.sceneNumber} Action`,
          });
        }
      });
    });

    // Props from propIds
    (scene.propIds || []).forEach((pId) => {
      const existing = Array.from(propsMap.values()).find((p) => p.id === pId);
      if (!existing) {
        propsMap.set(pId.toLowerCase(), {
          id: pId,
          name: pId,
          source: `Scene #${scene.sceneNumber}`,
        });
      }
    });
  });

  // 4. Cinematic Shot List
  (project.stage3?.shots || []).forEach((shot) => {
    (shot.characterIds || []).forEach((cId) => {
      const existing = Array.from(charactersMap.values()).find((c) => c.id === cId);
      if (!existing && cId) {
        charactersMap.set(cId.toLowerCase(), {
          id: cId,
          name: cId,
          source: `Shot ${shot.shotId}`,
        });
      }
    });

    if (shot.locationId) {
      const existing = Array.from(locationsMap.values()).find((l) => l.id === shot.locationId);
      if (!existing) {
        locationsMap.set(shot.locationId.toLowerCase(), {
          id: shot.locationId,
          name: shot.locationId,
          source: `Shot ${shot.shotId}`,
        });
      }
    }

    (shot.propIds || []).forEach((pId) => {
      const existing = Array.from(propsMap.values()).find((p) => p.id === pId);
      if (!existing && pId) {
        propsMap.set(pId.toLowerCase(), {
          id: pId,
          name: pId,
          source: `Shot ${shot.shotId}`,
        });
      }
    });
  });

  // 5. Concepts / Story Foundation / Original Story
  if (charactersMap.size === 0) {
    const protagonistName = project.storyFoundation?.protagonist || 'Protagonist';
    charactersMap.set(protagonistName.toLowerCase(), {
      id: 'CHAR-001',
      name: protagonistName,
      role: 'PROTAGONIST',
      source: 'Story Premise',
      description: project.storyFoundation?.logline || 'Primary narrative lead',
    });
  }

  if (locationsMap.size === 0) {
    const defaultLoc = project.storyFoundation?.worldSetting || 'Primary Setting';
    locationsMap.set(defaultLoc.toLowerCase(), {
      id: 'LOC-001',
      name: defaultLoc,
      source: 'World Setting',
      description: 'Central location of the film story',
    });
  }

  return {
    characters: Array.from(charactersMap.values()),
    locations: Array.from(locationsMap.values()),
    props: Array.from(propsMap.values()),
  };
}

/**
 * Determines current Phase 2 completion state
 */
export function determinePhase2Status(project: Project): Phase2ReadinessStatus {
  const assets = project.stage2?.assets || [];
  const bible = project.stage2?.styleBible;
  const shots = project.stage3?.shots || [];

  if (!bible && assets.length === 0) {
    return 'NOT STARTED';
  }

  const hasApprovedImage = assets.some((a) => a.approvalStatus === 'APPROVED' || a.optionalReferenceImageData) ||
    shots.some((s) => s.firstFrameImageData);

  const allAssetsHaveImages = assets.length > 0 && assets.every((a) => Boolean(a.optionalReferenceImageData || a.referenceMedia?.dataUrl));
  const allShotsHaveImages = shots.length > 0 && shots.every((s) => Boolean(s.firstFrameImageData));

  if (allAssetsHaveImages && allShotsHaveImages) {
    return 'MEDIA READY';
  }

  if (hasApprovedImage) {
    return 'IMAGE APPROVED';
  }

  const allPromptsReady = assets.length > 0 && assets.every((a) => Boolean(a.referencePrompt && a.referencePrompt.trim()));
  if (allPromptsReady) {
    return 'IMAGES PENDING';
  }

  return 'PROMPTS READY';
}

/**
 * Builds model-specific prompt formats for external AI generators (Midjourney, Flux, SDXL, Gemini)
 */
export function formatPromptForEngine(
  basePrompt: string,
  engine: 'GEMINI' | 'MIDJOURNEY' | 'FLUX' | 'SDXL',
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
  styleName?: string
): string {
  const cleanPrompt = basePrompt.trim().replace(/\s+/g, ' ');
  const styleClause = styleName ? `, ${styleName} visual aesthetic` : '';

  switch (engine) {
    case 'MIDJOURNEY':
      return `${cleanPrompt}${styleClause} --ar ${aspectRatio} --v 6.1 --style raw`;
    case 'FLUX':
      return `${cleanPrompt}${styleClause}, cinematic 35mm composition, ultra detailed, hyper realistic textures`;
    case 'SDXL':
      return `masterpiece, cinematic film still, ${cleanPrompt}${styleClause}, 8k, sharp focus, volumetric lighting, photorealistic`;
    case 'GEMINI':
    default:
      return `${cleanPrompt}${styleClause}`;
  }
}

/**
 * Client-side authoritative fallback synthesizer:
 * Produces a complete Visual Style Bible and complete Character, Location, and Prop prompts
 * respecting project settings, genre, emotional tone, visual style, and aspect ratio.
 */
export function synthesizePhase2AssetsFallback(
  project: Project,
  missingOnly: boolean = false
): { styleBible: VisualStyleBible; assets: VisualAsset[] } {
  const vs = project.visualStyle || {
    name: 'Cinematic Realism',
    medium: 'Live Action Cinema',
    realismLevel: 'REALISTIC',
    colorIntent: 'Balanced naturalistic palette with atmospheric contrast',
    lightingIntent: 'Three-point lighting with directional key and soft ambient fill',
    textureIntent: 'Tactile organic surfaces with natural film grain',
  };

  const settings = project.settings || {
    format: 'Shorts/Reels',
    genres: ['Drama'],
    tone: 'Cinematic',
    aspectRatio: '9:16',
  };

  const primaryGenre = settings.primaryGenre || (settings.genres && settings.genres[0]) || 'Drama';
  const toneDesc = settings.primaryTone || settings.tone || 'Cinematic & Immersive';
  const arDesc = settings.aspectRatio === '9:16' ? '9:16 vertical composition (Shorts/Reels)' : '16:9 widescreen composition';

  // 1. Synthesize Complete Visual Style Bible
  const existingBible = project.stage2?.styleBible;
  const styleBible: VisualStyleBible = existingBible && missingOnly ? existingBible : {
    version: (existingBible?.version || 0) + 1,
    inheritedStyle: vs,
    artDirection: `Art Direction for "${project.title}": Directed in ${vs.name} medium (${vs.medium}) with ${vs.realismLevel.toLowerCase()} aesthetic. Genre alignment: ${primaryGenre}. Emotional tone: ${toneDesc}. Every frame enforces strict continuity and atmospheric depth.`,
    mediumAndRealism: `${vs.medium} with ${vs.realismLevel} rendering standard. No mixed-medium artifacts or contradictory stylization.`,
    colorPaletteAndContrast: `${vs.colorIntent || 'Curated cinematic color palette'}. Anchored to ${primaryGenre.toLowerCase()} color psychology with high-retention contrast and controlled chromatic saturation.`,
    lightingRules: `${vs.lightingIntent || 'Volumetric directional lighting'}. Consistent key-to-fill ratios, expressive rim lighting, motivated light sources, and realistic shadow falloff across all shots.`,
    textureAndRenderingLanguage: `${vs.textureIntent || 'Tactile material rendering'}. Realistic surface micro-details, authentic fabric textures, accurate reflections, and natural atmospheric density.`,
    worldArchitecturePrinciples: `Environment design follows coherent spatial logic matching ${primaryGenre}. Architectural shapes and horizons remain grounded to the established world rules and scale.`,
    characterProportionRules: `Strict proportion anchors: Distinct anatomical silhouettes, consistent head-to-body scale ratio, expressive eye design, unique wardrobe silhouettes, and recognizable profile landmarks.`,
    wardrobeAndPropPhilosophy: `Physical catalysts and character costumes must show authentic wear, lived-in patina, practical materials, and strict color coordination with environment palettes.`,
    cameraAndCompositionStyle: `Cinematic camera language tailored for ${arDesc}. Controlled depth of field (f/1.8 to f/2.8 on prime lenses), intentional leading lines, headroom discipline, and dynamic framing.`,
    aspectRatioConstraints: `Composition optimized strictly for ${settings.aspectRatio}. Subject placement maintains focal hierarchy and eye-level connection within safe areas.`,
    scaleConsistency: `Rigid character height benchmarks and architectural scale anchors maintain believable spatial relationships in wide and close-up views.`,
    negativeVisualConstraints: [
      'no modern or anachronistic objects in historical or fantasy scenes',
      'no duplicate faces or cloned character silhouettes',
      'no blown-out highlights without motivated light sources',
      'no floating artifacts, unnatural plastic skin, or distorted anatomy',
      'no muddy colors, watermarks, or text overlays',
    ],
    continuityLocks: [
      `Master Visual Medium: ${vs.medium}`,
      `Primary Aspect Ratio: ${settings.aspectRatio}`,
      `Color Grading Tone: ${toneDesc}`,
      `Costume Lock: Approved character signature wardrobe must be preserved across scenes`,
    ],
    allowedElements: [
      `${vs.medium} cinematic lighting`,
      'Authentic material textures and natural surface patina',
      'Directional volumetric atmosphere',
      'Balanced rule-of-thirds framing',
      'Distinct recognizable character silhouettes',
    ],
    avoidedElements: [
      'Uncanny plastic skin smoothing',
      'Inconsistent costume colors between shots',
      'Flat unmotivated studio lighting',
      'Anachronistic props',
      'Distorted perspective lines',
    ],
    referenceImageClarityRules: 'High-clarity studio reference rendering with isolated subjects against neutral backgrounds for character turnarounds, and atmospheric establishing views for environments.',
    updatedAt: new Date().toISOString(),
  };

  // 2. Extract Phase 1 Entities
  const entities = extractPhase1Entities(project);
  const existingAssets = project.stage2?.assets || [];
  const existingAssetsMap = new Map<string, VisualAsset>(existingAssets.map((a) => [a.id, a]));

  const assets: VisualAsset[] = [];

  // Helper to preserve or create
  const getOrSynthesizeAsset = (
    id: string,
    type: VisualAssetType,
    name: string,
    importance: AssetImportance,
    synthesizer: () => VisualAsset
  ): VisualAsset => {
    const existing = existingAssetsMap.get(id) || existingAssets.find((a) => a.type === type && a.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (existing && missingOnly) {
      return existing;
    }
    if (existing) {
      // Preserve approved image data and custom user edits
      const fresh = synthesizer();
      return {
        ...fresh,
        id: existing.id,
        optionalReferenceImageData: existing.optionalReferenceImageData,
        optionalReferenceFileName: existing.optionalReferenceFileName,
        optionalReferenceImageId: existing.optionalReferenceImageId,
        referenceMedia: existing.referenceMedia,
        approvalStatus: existing.approvalStatus || 'APPROVED',
      };
    }
    return synthesizer();
  };

  // Synthesize Characters
  entities.characters.forEach((char, idx) => {
    const charId = char.id.startsWith('CHAR-') ? char.id : normalizeCanonicalId('CHAR', idx + 1);
    const importance: AssetImportance = idx === 0 ? 'PRIMARY' : idx < 3 ? 'SECONDARY' : 'OPTIONAL';

    const charAsset = getOrSynthesizeAsset(charId, 'CHARACTER', char.name, importance, () => {
      const masterPrompt = `Cinematic character reference portrait of ${char.name}, ${char.role || 'character'} in a ${primaryGenre.toLowerCase()} film. Style: ${vs.name} (${vs.medium}). Full-body three-quarter studio reference, distinct facial features, authentic eye expression, signature costume tailored for ${toneDesc.toLowerCase()} tone. ${vs.colorIntent || 'Cinematic lighting'}, neutral atmospheric studio background, high resolution, 8k, sharp focus, master film still.`;
      const frontPrompt = `Character turnaround FRONT VIEW of ${char.name}, full body standing in neutral posture, head-to-toe view, neutral lighting, clean background, exact costume and hair details matching master design.`;
      const sidePrompt = `Character turnaround SIDE PROFILE VIEW (90 degrees) of ${char.name}, full body standing, showing silhouette depth, posture, hair length, and costume layers.`;
      const backPrompt = `Character turnaround BACK VIEW of ${char.name}, full body standing from behind, detailing jacket/clothing rear construction, footwear, and hairstyle.`;
      const expressionPrompt = `Character facial expression reference grid for ${char.name}: neutral, intense, sorrowful, determined, subtle smile, highlighting micro-expressions and eye reflections.`;

      return {
        id: charId,
        type: 'CHARACTER',
        name: char.name,
        storyFunction: char.description || `${char.role || 'Character'} in ${project.title}`,
        importance,
        sourceCanonIds: [charId],
        visualSpecification: {
          summary: `Authoritative visual design for ${char.name}. Silhouette, costume layers, and distinct facial anchors locked for continuous production.`,
          keyFeatures: [
            `Distinctive ${primaryGenre.toLowerCase()} facial silhouette`,
            'Signature hairstyle and eye color anchor',
            'Authentic body proportion benchmarks',
            'Expression clarity in high-contrast lighting',
          ],
          colors: ['Deep neutral base', 'Accent tone matching character arc'],
          materialsOrTextures: ['Natural textiles', 'Lived-in fabric wear', 'Organic hair rendering'],
          dimensionsOrProportions: 'Athletic/grounded build, proportional head-to-height ratio',
          lightingOrRenderingRules: `Rendered strictly in ${vs.medium} conventions with motivated cinematic key light`,
        },
        referencePrompt: masterPrompt,
        turnaroundPrompt: `${frontPrompt} | ${sidePrompt} | ${backPrompt}`,
        frontViewPrompt: frontPrompt,
        backViewPrompt: backPrompt,
        sideViewPrompt: sidePrompt,
        expressionPrompt,
        silhouetteAndProportions: 'Consistent height and shoulder-width anchor relative to other cast members',
        costumeAndAccessories: 'Signature layers with functional fasteners, textured fabrics, and subtle weathering',
        stableIdentityRules: 'Facial bone structure, eye shape, and signature silhouette must not deviate between scenes',
        promptStatus: 'READY',
        reviewIssues: [],
        updatedAt: new Date().toISOString(),
        approvalStatus: 'PENDING',
      };
    });

    assets.push(charAsset);
  });

  // Synthesize Locations
  entities.locations.forEach((loc, idx) => {
    const locId = loc.id.startsWith('LOC-') ? loc.id : normalizeCanonicalId('LOC', idx + 1);
    const importance: AssetImportance = idx === 0 ? 'PRIMARY' : 'SECONDARY';

    const locAsset = getOrSynthesizeAsset(locId, 'LOCATION', loc.name, importance, () => {
      const masterPrompt = `Cinematic wide establishing shot of ${loc.name}, an essential environment in a ${primaryGenre.toLowerCase()} film. Style: ${vs.name} (${vs.medium}). Architectural scale, volumetric atmospheric depth, ${vs.lightingIntent || 'dramatic directional lighting'}, distinctive spatial anchors, authentic environmental textures. High resolution 35mm cinematic film still.`;

      return {
        id: locId,
        type: 'LOCATION',
        name: loc.name,
        storyFunction: loc.description || `Key environment for ${project.title}`,
        importance,
        sourceCanonIds: [locId],
        visualSpecification: {
          summary: `Permanent spatial architecture and environmental lighting rules for ${loc.name}.`,
          keyFeatures: [
            'Recognizable architectural landmarks',
            'Motivated light sources and practical lighting fixtures',
            'Spatial depth and entry/exit vectors',
            'Atmospheric haze and textural surfaces',
          ],
          colors: ['Environmental baseline palette', 'Contrasting key light accent'],
          materialsOrTextures: ['Weathered architectural materials', 'Surface patina', 'Volumetric atmosphere'],
          lightingOrRenderingRules: `Cohesive directional lighting matching ${vs.medium}`,
        },
        referencePrompt: masterPrompt,
        spatialLayout: 'Grounded architectural layout with clearly defined foreground, middle ground, and deep horizon',
        entryExitPoints: 'Main entrance doorway and primary transit corridor visually established',
        recurringLandmarks: 'Central architectural focal point anchored across wide and medium coverage',
        continuityRequirements: 'Maintain consistent light direction, time-of-day shadow vectors, and weather across consecutive shots',
        promptStatus: 'READY',
        reviewIssues: [],
        updatedAt: new Date().toISOString(),
        approvalStatus: 'PENDING',
      };
    });

    assets.push(locAsset);
  });

  // Synthesize Props
  entities.props.forEach((prop, idx) => {
    const propId = prop.id.startsWith('PROP-') ? prop.id : normalizeCanonicalId('PROP', idx + 1);

    const propAsset = getOrSynthesizeAsset(propId, 'PROP', prop.name, 'SECONDARY', () => {
      const masterPrompt = `Cinematic isolated hero prop still of ${prop.name}, a critical physical story catalyst in a ${primaryGenre.toLowerCase()} film. Style: ${vs.name} (${vs.medium}). Macro depth of field, detailed tactile materials, authentic engravings, wear marks, and functional mechanisms under warm directional studio key lighting. Neutral backdrop, 8k resolution.`;

      return {
        id: propId,
        type: 'PROP',
        name: prop.name,
        storyFunction: prop.description || `Story-critical object in ${project.title}`,
        importance: 'SECONDARY',
        sourceCanonIds: [propId],
        visualSpecification: {
          summary: `Material construction, dimensions, and distinctive markings for ${prop.name}.`,
          keyFeatures: [
            'Tactile surface materials and mechanical details',
            'Distinctive engraving or functional marks',
            'Proportional scale relative to character hands',
          ],
          colors: ['Primary material finish', 'Secondary accent and wear patina'],
          materialsOrTextures: ['Machined metal / treated wood / tactile leather'],
          dimensionsOrProportions: 'Handheld scale proportional to human grip',
          lightingOrRenderingRules: 'Sharp macro focus with edge rim light to emphasize physical contours',
        },
        referencePrompt: masterPrompt,
        physicalShape: 'Ergonomic functional geometry with distinct silhouette',
        dimensions: 'Proportional handheld item (approx. 20-30cm)',
        ownerOrHolder: prop.owner || 'Assigned character',
        continuityRequirements: 'Preserve scratches, unique markings, and operational states across all scenes',
        promptStatus: 'READY',
        reviewIssues: [],
        updatedAt: new Date().toISOString(),
        approvalStatus: 'PENDING',
      };
    });

    assets.push(propAsset);
  });

  return { styleBible, assets };
}
