import {
  ALL_PREDEFINED_GENRES,
  GENRE_LIBRARY_CATEGORIES,
  ALL_PREDEFINED_TONES,
  TONE_LIBRARY_CATEGORIES,
  normalizeGenres,
  normalizeTone,
  normalizeProjectSettings,
} from '../src/data/genreAndToneLibrary';
import { createDefaultProject } from '../src/services/defaultProject';
import { normalizeProjectData, saveProjectRecord, loadProjectById } from '../src/services/projectStorage';
import { Project, ProjectSettings } from '../src/types/filmStudio';

// In-memory mock localStorage for Node testing
const storageMap = new Map<string, string>();
(global as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runAcceptanceTests() {
  console.log('\n============================================================');
  console.log('XEMACS7 3.0 — GENRE & EMOTIONAL TONE ACCEPTANCE TESTS');
  console.log('============================================================\n');

  // Test 1: Verify Comprehensive Genre Library Coverage
  console.log('TEST 1: Comprehensive Genre Library Coverage');
  const requiredGenres = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Drama',
    'Romance', 'Romantic Comedy', 'Horror', 'Psychological Horror',
    'Thriller', 'Mystery', 'Suspense', 'Crime', 'Detective',
    'Science Fiction', 'Fantasy', 'Dark Fantasy', 'Supernatural',
    'Mythology', 'Folklore', 'Historical', 'Period Drama',
    'Documentary', 'Educational', 'Explainer', 'Biography',
    'Kids & Family', 'Nursery Rhymes', 'Musical',
    'Slice of Life', 'Coming-of-Age', 'Sports',
    'Cyberpunk', 'Steampunk', 'Post-Apocalyptic', 'Dystopian',
    'Superhero', 'Nature & Wildlife', 'Technology & AI',
    'Inspirational', 'Faith & Spiritual', 'Travel',
    'Experimental', 'Satire', 'Parody'
  ];

  requiredGenres.forEach((g) => {
    assert(ALL_PREDEFINED_GENRES.includes(g), `Library includes genre: ${g}`);
  });

  // Test 2: Verify Emotional Tone Library Coverage
  console.log('\nTEST 2: Comprehensive Emotional Tone Library Coverage');
  const requiredTones = [
    'Heartwarming', 'Funny', 'Playful', 'Joyful', 'Whimsical',
    'Adventurous', 'Exciting', 'Suspenseful', 'Mysterious', 'Dark',
    'Scary', 'Creepy', 'Emotional', 'Sad', 'Melancholic', 'Romantic',
    'Nostalgic', 'Peaceful', 'Relaxing', 'Dreamy', 'Inspirational',
    'Hopeful', 'Epic', 'Dramatic', 'Intense', 'Serious', 'Educational',
    'Friendly', 'Uplifting', 'Thought-Provoking', 'Satirical', 'Bittersweet'
  ];

  requiredTones.forEach((t) => {
    assert(ALL_PREDEFINED_TONES.includes(t), `Library includes tone: ${t}`);
  });

  // Test 3: Multi-select genres with Primary genre designation
  console.log('\nTEST 3: Multi-select genres with Primary designation');
  {
    const selected = ['Cyberpunk', 'Psychological Horror', 'Detective', 'Custom Neo-Noir Heist'];
    const normalized = normalizeGenres(selected);
    assert(normalized.length === 4, 'All 4 genres preserved in array');
    assert(normalized[0] === 'Cyberpunk', 'First genre is primary (Cyberpunk)');
    assert(normalized.includes('Custom Neo-Noir Heist'), 'Custom genre preserved');
  }

  // Test 4: Primary & Secondary Emotional Tone pairing
  console.log('\nTEST 4: Primary & Secondary Emotional Tone pairing');
  {
    const toneResult = normalizeTone('Suspenseful & Thought-Provoking');
    assert(toneResult.primary === 'Suspenseful', 'Primary tone parsed as Suspenseful');
    assert(toneResult.secondary === 'Thought-Provoking', 'Secondary tone parsed as Thought-Provoking');

    const singleTone = normalizeTone('Epic');
    assert(singleTone.primary === 'Epic', 'Single tone parsed as Epic');
    assert(singleTone.secondary === '', 'Secondary tone is empty');

    const customTone = normalizeTone('Gritty Cyberpunk Melancholy');
    assert(customTone.primary === 'Gritty Cyberpunk Melancholy', 'Custom tone preserved verbatim');
  }

  // Test 5: Save and Reopen Persistence
  console.log('\nTEST 5: Save and Reopen Project Persistence');
  {
    const project = createDefaultProject();
    project.projectId = 'proj-acceptance-test-1';
    project.title = 'Cyberpunk Mystery Film';
    project.settings.genres = ['Cyberpunk', 'Mystery', 'Psychological Horror'];
    project.settings.primaryGenre = 'Cyberpunk';
    project.settings.primaryTone = 'Dark';
    project.settings.secondaryTone = 'Thought-Provoking';
    project.settings.tone = 'Dark & Thought-Provoking';

    const saveRes = await saveProjectRecord(project);
    assert(saveRes.success, 'Project saved successfully to storage');

    const loaded = await loadProjectById('proj-acceptance-test-1');
    assert(loaded !== null, 'Project reloaded successfully');
    assert(loaded!.settings.genres.length === 3, 'All 3 genres persisted');
    assert(loaded!.settings.genres[0] === 'Cyberpunk', 'Primary genre preserved on reload');
    assert(loaded!.settings.primaryTone === 'Dark', 'Primary tone preserved on reload');
    assert(loaded!.settings.secondaryTone === 'Thought-Provoking', 'Secondary tone preserved on reload');
    assert(loaded!.settings.tone === 'Dark & Thought-Provoking', 'Combined tone string preserved');
  }

  // Test 6: Legacy Compatibility - Comma-separated genres and composite tones
  console.log('\nTEST 6: Legacy Project Compatibility');
  {
    const legacyProject: any = createDefaultProject();
    legacyProject.projectId = 'proj-legacy-test';
    // Older project stored genres as string:
    legacyProject.settings.genres = 'Action, Thriller, Custom Alien Sci-Fi';
    // Older project stored tone as composite string without primary/secondary fields:
    legacyProject.settings.tone = 'Suspenseful / Dramatic';
    delete legacyProject.settings.primaryGenre;
    delete legacyProject.settings.primaryTone;
    delete legacyProject.settings.secondaryTone;

    const normalized = normalizeProjectData(legacyProject);
    assert(Array.isArray(normalized.settings.genres), 'Genres converted to array');
    assert(normalized.settings.genres.length === 3, 'All 3 genres extracted');
    assert(normalized.settings.genres.includes('Custom Alien Sci-Fi'), 'Unrecognized legacy custom genre preserved');
    assert(normalized.settings.primaryGenre === 'Action', 'Primary genre defaulted to first genre');
    assert(normalized.settings.primaryTone === 'Suspenseful', 'Primary tone extracted');
    assert(normalized.settings.secondaryTone === 'Dramatic', 'Secondary tone extracted');
  }

  // Test 7: Verify other Project Specifications fields remain completely unaltered
  console.log('\nTEST 7: Unaltered Project Specifications Integrity');
  {
    const testProj = createDefaultProject();
    testProj.settings.format = 'Shorts/Reels';
    testProj.settings.aspectRatio = '9:16';
    testProj.settings.targetRuntimeSeconds = 60;
    testProj.settings.platform = 'TikTok';
    testProj.settings.voiceFormat = 'Dialogue';
    testProj.settings.language = 'Spanish';
    testProj.settings.targetRegion = 'Latin America';
    testProj.settings.episodeCount = 1;

    const norm = normalizeProjectSettings(testProj.settings);
    assert(norm.format === 'Shorts/Reels', 'Format intact');
    assert(norm.aspectRatio === '9:16', 'Aspect ratio intact');
    assert(norm.targetRuntimeSeconds === 60, 'Target runtime intact');
    assert(norm.platform === 'TikTok', 'Platform intact');
    assert(norm.voiceFormat === 'Dialogue', 'Voice format intact');
    assert(norm.language === 'Spanish', 'Language intact');
    assert(norm.targetRegion === 'Latin America', 'Target region intact');
  }

  console.log('\n============================================================');
  console.log('🎉 ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  console.log('============================================================\n');
}

runAcceptanceTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
