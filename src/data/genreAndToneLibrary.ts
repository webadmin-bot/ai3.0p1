export interface GenreCategory {
  category: string;
  genres: string[];
}

export const GENRE_LIBRARY_CATEGORIES: GenreCategory[] = [
  {
    category: 'Action, Thriller & Mystery',
    genres: [
      'Action',
      'Adventure',
      'Thriller',
      'Mystery',
      'Suspense',
      'Crime',
      'Detective',
      'Superhero',
    ],
  },
  {
    category: 'Sci-Fi, Fantasy & Speculative',
    genres: [
      'Science Fiction',
      'Cyberpunk',
      'Steampunk',
      'Post-Apocalyptic',
      'Dystopian',
      'Fantasy',
      'Dark Fantasy',
      'Supernatural',
      'Technology & AI',
    ],
  },
  {
    category: 'Drama, Romance & Life',
    genres: [
      'Drama',
      'Romance',
      'Romantic Comedy',
      'Slice of Life',
      'Coming-of-Age',
      'Sports',
      'Historical',
      'Period Drama',
    ],
  },
  {
    category: 'Horror & Psychological',
    genres: ['Horror', 'Psychological Horror'],
  },
  {
    category: 'Mythology & Folklore',
    genres: ['Mythology', 'Folklore'],
  },
  {
    category: 'Comedy & Satire',
    genres: ['Comedy', 'Satire', 'Parody'],
  },
  {
    category: 'Documentary & Informational',
    genres: [
      'Documentary',
      'Educational',
      'Explainer',
      'Biography',
      'Nature & Wildlife',
      'Travel',
    ],
  },
  {
    category: 'Inspirational & Faith',
    genres: ['Inspirational', 'Faith & Spiritual'],
  },
  {
    category: 'Animation, Family & Art',
    genres: [
      'Animation',
      'Kids & Family',
      'Nursery Rhymes',
      'Musical',
      'Experimental',
    ],
  },
];

// Flat list of all predefined genres
export const ALL_PREDEFINED_GENRES: string[] = GENRE_LIBRARY_CATEGORIES.flatMap(
  (c) => c.genres
);

export interface ToneCategory {
  category: string;
  tones: string[];
}

export const TONE_LIBRARY_CATEGORIES: ToneCategory[] = [
  {
    category: 'Positive & Warm',
    tones: ['Heartwarming', 'Friendly', 'Uplifting', 'Joyful', 'Playful', 'Funny', 'Whimsical'],
  },
  {
    category: 'Adventure & Excitement',
    tones: ['Adventurous', 'Exciting', 'Epic', 'Dramatic', 'Intense'],
  },
  {
    category: 'Mystery, Suspense & Dark',
    tones: ['Suspenseful', 'Mysterious', 'Serious', 'Dark', 'Scary', 'Creepy'],
  },
  {
    category: 'Poetic & Reflective',
    tones: ['Emotional', 'Thought-Provoking', 'Nostalgic', 'Melancholic', 'Bittersweet', 'Sad'],
  },
  {
    category: 'Serene & Wonder',
    tones: ['Peaceful', 'Relaxing', 'Dreamy', 'Romantic', 'Hopeful', 'Inspirational'],
  },
  {
    category: 'Informational & Satirical',
    tones: ['Educational', 'Satirical'],
  },
];

// Flat list of all predefined emotional tones
export const ALL_PREDEFINED_TONES: string[] = [
  'Heartwarming',
  'Funny',
  'Playful',
  'Joyful',
  'Whimsical',
  'Adventurous',
  'Exciting',
  'Suspenseful',
  'Mysterious',
  'Dark',
  'Scary',
  'Creepy',
  'Emotional',
  'Sad',
  'Melancholic',
  'Romantic',
  'Nostalgic',
  'Peaceful',
  'Relaxing',
  'Dreamy',
  'Inspirational',
  'Hopeful',
  'Epic',
  'Dramatic',
  'Intense',
  'Serious',
  'Educational',
  'Friendly',
  'Uplifting',
  'Thought-Provoking',
  'Satirical',
  'Bittersweet',
];

/**
 * Normalizes legacy genre values that might be stored as comma-separated string,
 * single string, or string array. Preserves unrecognized values as custom tags.
 */
export function normalizeGenres(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Normalizes legacy tone string into primary and optional secondary tone.
 * Handles patterns like "Suspenseful & Dark", "Suspenseful, Dark", or single values.
 */
export function normalizeTone(
  toneInput: unknown,
  existingPrimary?: string,
  existingSecondary?: string
): { primary: string; secondary: string } {
  if (existingPrimary) {
    return {
      primary: existingPrimary.trim(),
      secondary: existingSecondary ? existingSecondary.trim() : '',
    };
  }

  const raw = typeof toneInput === 'string' ? toneInput.trim() : '';
  if (!raw) return { primary: 'Suspenseful', secondary: '' };

  // Check for common separators: " & ", " and ", ", ", " / "
  const parts = raw
    .split(/\s*(?:&|and|\/|,)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      primary: parts[0],
      secondary: parts[1],
    };
  }

  return {
    primary: raw,
    secondary: '',
  };
}

/**
 * Ensures a project's settings have normalized genres (string array)
 * and properly synchronized primaryTone/secondaryTone.
 */
export function normalizeProjectSettings<T extends { genres?: any; genre?: any; tone?: any; primaryGenre?: any; primaryTone?: any; secondaryTone?: any }>(
  settings: T
): T {
  if (!settings) return settings;

  const genres = normalizeGenres(settings.genres ?? (settings as any).genre);
  const toneData = normalizeTone(settings.tone, settings.primaryTone, settings.secondaryTone);

  return {
    ...settings,
    genres: genres.length > 0 ? genres : ['Drama'],
    primaryGenre: settings.primaryGenre || genres[0] || 'Drama',
    tone: settings.tone || (toneData.secondary ? `${toneData.primary} & ${toneData.secondary}` : toneData.primary),
    primaryTone: toneData.primary,
    secondaryTone: toneData.secondary || undefined,
  };
}
