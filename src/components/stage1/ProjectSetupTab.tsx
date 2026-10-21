import React, { useState, useMemo } from 'react';
import {
  Film,
  Search,
  Check,
  Palette,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  VISUAL_STYLE_PRESETS,
  FORMAT_OPTIONS,
  LANGUAGE_OPTIONS,
  AUDIENCE_OPTIONS,
  PLATFORM_OPTIONS,
  NARRATION_OPTIONS,
} from '../../data/visualStylePresets';
import { FormatType, MasterVisualStyle } from '../../types/filmStudio';
import { GenreMultiSelect } from '../phase1/GenreMultiSelect';
import { EmotionalToneSelect } from '../phase1/EmotionalToneSelect';

export const ProjectSetupTab: React.FC = () => {
  const { project, updateSettings, updateVisualStyle, setActiveTab } = useProject();

  // Search state for visual style presets
  const [styleSearch, setStyleSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Extract unique categories from presets
  const categories = useMemo(() => {
    const set = new Set<string>();
    VISUAL_STYLE_PRESETS.forEach((p) => set.add(p.category));
    return ['ALL', ...Array.from(set)];
  }, []);

  // Filtered visual style presets
  const filteredStyles = useMemo(() => {
    return VISUAL_STYLE_PRESETS.filter((p) => {
      const matchesCategory =
        selectedCategoryFilter === 'ALL' || p.category === selectedCategoryFilter;
      const matchesSearch =
        styleSearch.trim() === '' ||
        p.name.toLowerCase().includes(styleSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(styleSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(styleSearch.toLowerCase()) ||
        p.medium.toLowerCase().includes(styleSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [styleSearch, selectedCategoryFilter]);

  const handleFormatChange = (format: FormatType) => {
    let runtime = project.settings.targetRuntimeSeconds;
    let guideline = '';
    let episodes = project.settings.episodeCount || 1;

    if (format === 'Shorts/Reels') {
      runtime = 60;
      guideline = '30–90 seconds optimal for vertical Shorts/Reels';
    } else if (format === 'Episodic Short Drama') {
      runtime = 90;
      guideline = '60–120 seconds per episode across 1–30 episodes';
      if (!episodes || episodes < 1) episodes = 10;
    } else if (format === 'Episodic Long-Form Series') {
      runtime = 360; // 6 minutes default
      guideline = '3–15 minutes per episode across 1–30 episodes. Ideal for YouTube animated adventures, family storytelling, fantasy and sci-fi series.';
      if (!episodes || episodes < 1) episodes = 10;
    } else if (format === 'Short Film') {
      runtime = 300; // 5 min
      guideline = '3–15 minutes cinematic short narrative';
    } else if (format === 'Feature/Narrative Film') {
      runtime = 5400; // 90 min
      guideline = '75–120 minutes full narrative feature';
    } else {
      runtime = 120;
      guideline = 'Flexible runtime tailored to narrative scope';
    }

    updateSettings({
      format,
      targetRuntimeSeconds: runtime,
      runtimeGuideline: guideline,
      episodeCount: episodes,
    });
  };

  const nextTabForMode =
    project.storySourceMode === 'AI_CONCEPT'
      ? 'ideas'
      : project.storySourceMode === 'OWN_STORY'
      ? 'mystory'
      : 'myscript';

  const nextButtonLabel =
    project.storySourceMode === 'AI_CONCEPT'
      ? 'Continue to Story Ideas'
      : project.storySourceMode === 'OWN_STORY'
      ? 'Continue to My Story'
      : 'Continue to My Script';

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* SECTION 1: GENERAL PROJECT IDENTITY */}
      <section className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#1C2735] pb-3">
          <Film className="w-4 h-4 text-[#00AFFF]" />
          <h2 className="font-['Exo_2'] font-bold text-base text-white tracking-wide">
            1. GENERAL PROJECT IDENTITY & FORMAT
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project Title */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-[#D7DCE2]">
              Film / Project Title (Working Title)
            </label>
            <input
              type="text"
              value={project.title}
              onChange={(e) => updateSettings({} as any) /* triggers save */}
              onInput={(e: any) => {
                project.title = e.target.value;
                updateSettings({});
              }}
              placeholder="e.g., The Quiapo Clockmaker / Echoes of Proxima"
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-[#79838E]/50 focus:border-[#00AFFF] focus:outline-none transition-colors"
            />
          </div>

          {/* Format Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#D7DCE2]">
              Narrative Format
            </label>
            <select
              value={project.settings.format}
              onChange={(e) => handleFormatChange(e.target.value as FormatType)}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00AFFF] focus:outline-none"
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {project.settings.runtimeGuideline && (
              <p className="text-[11px] text-[#79838E]">
                {project.settings.runtimeGuideline}
              </p>
            )}
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#D7DCE2]">
              Cinematic Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['9:16', '16:9', '1:1'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => updateSettings({ aspectRatio: ratio })}
                  className={`py-2 px-3 text-xs rounded-lg border font-mono transition-colors ${
                    project.settings.aspectRatio === ratio
                      ? 'bg-[#00AFFF]/20 border-[#00AFFF] text-white font-bold'
                      : 'bg-[#111820] border-[#1C2735] text-[#79838E] hover:text-[#D7DCE2]'
                  }`}
                >
                  {ratio} {ratio === '9:16' ? '(Vertical)' : ratio === '16:9' ? '(Widescreen)' : '(Square)'}
                </button>
              ))}
            </div>
          </div>

          {/* Target Runtime Seconds */}
          <div className="space-y-1.5">
            {(() => {
              const isLongForm = project.settings.format === 'Episodic Long-Form Series';
              const isShortDrama = project.settings.format === 'Episodic Short Drama';
              const minRuntime = isLongForm ? 180 : isShortDrama ? 60 : 15;
              const maxRuntime = isLongForm ? 900 : isShortDrama ? 180 : 10800;
              const mins = Math.floor(project.settings.targetRuntimeSeconds / 60);
              const secs = project.settings.targetRuntimeSeconds % 60;
              const durationFormatted = mins > 0 ? `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim() : `${secs}s`;

              return (
                <>
                  <label className="text-xs font-semibold text-[#D7DCE2] flex items-center justify-between">
                    <span>Target Runtime (Seconds)</span>
                    <span className="text-[#00AFFF] font-mono">
                      {project.settings.targetRuntimeSeconds}s ({durationFormatted})
                    </span>
                  </label>
                  <input
                    type="number"
                    min={minRuntime}
                    max={maxRuntime}
                    step={isLongForm ? 10 : 5}
                    value={project.settings.targetRuntimeSeconds}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateSettings({ targetRuntimeSeconds: isNaN(val) ? 60 : val });
                    }}
                    className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#00AFFF] focus:outline-none"
                  />
                  {isLongForm && (
                    <p className="text-[11px] text-[#79838E]">
                      Allowed: 180–900 seconds (3m–15m). Current: {durationFormatted}.
                    </p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Platform */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#D7DCE2]">
              Target Release Platform
            </label>
            <select
              value={project.settings.platform}
              onChange={(e) => updateSettings({ platform: e.target.value })}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00AFFF] focus:outline-none"
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Episode Count & Season Title (For Episodic formats) */}
          {(project.settings.format === 'Episodic Short Drama' || project.settings.format === 'Episodic Long-Form Series') && (
            <div className="space-y-3 md:col-span-2 bg-[#111820] p-4 rounded-lg border border-[#00AFFF]/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C2735] pb-2.5">
                <div>
                  <div className="text-xs font-bold text-white flex items-center space-x-2">
                    <span>
                      {project.settings.format === 'Episodic Long-Form Series'
                        ? 'Episodic Long-Form Series Arc'
                        : 'Episodic Short Drama Season Arc'}
                    </span>
                    <span className="text-[10px] font-mono text-[#00AFFF] bg-[#00AFFF]/15 px-2 py-0.5 rounded">
                      1–30 EPISODES
                    </span>
                  </div>
                  <p className="text-[11px] text-[#79838E] mt-0.5">
                    {project.settings.format === 'Episodic Long-Form Series'
                      ? '3–15 minutes per episode across 1–30 episodes. Ideal for YouTube animated adventures, family storytelling, fantasy and sci-fi series.'
                      : '60–120 seconds per episode across 1–30 episodes with rapid vertical drama cliffhangers.'}
                  </p>
                </div>
                <div className="text-[#00AFFF] font-mono font-bold text-sm bg-[#141C26] px-3 py-1 rounded border border-[#00AFFF]/30 self-start sm:self-auto">
                  {project.settings.episodeCount} Episodes
                </div>
              </div>

              {/* Season Title input */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#D7DCE2]">
                  Season Title / Subtitle (Optional)
                </label>
                <input
                  type="text"
                  value={project.settings.seasonTitle || ''}
                  onChange={(e) => updateSettings({ seasonTitle: e.target.value })}
                  placeholder="e.g., Season 1: The Clockwork Relic / The Whispering Grove"
                  className="w-full bg-[#0B1017] border border-[#1C2735] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#79838E]/50 focus:border-[#00AFFF] focus:outline-none"
                />
              </div>

              {/* Episode Count Slider & Number Input */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={project.settings.episodeCount}
                    onChange={(e) =>
                      updateSettings({ episodeCount: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })
                    }
                    className="flex-1 accent-[#00AFFF] cursor-pointer"
                  />
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={project.settings.episodeCount}
                    onChange={(e) => {
                      const val = Math.min(30, Math.max(1, Number(e.target.value) || 1));
                      updateSettings({ episodeCount: val });
                    }}
                    className="w-16 bg-[#0B1017] border border-[#1C2735] rounded-lg px-2 py-1 text-xs text-white font-mono text-center focus:border-[#00AFFF] focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#79838E]">
                  Story Canon will compile an authoritative {project.settings.episodeCount}-episode roadmap with shared locations, props, recurring character arcs, and cliffhanger hooks.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: STORY & NARRATIVE DIRECTION */}
      <section className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#1C2735] pb-3">
          <Sliders className="w-4 h-4 text-[#00AFFF]" />
          <h2 className="font-['Exo_2'] font-bold text-base text-white tracking-wide">
            2. STORY & NARRATIVE DIRECTION
          </h2>
        </div>

        {/* Searchable Multiselect Genres */}
        <div className="space-y-2">
          <GenreMultiSelect
            value={project.settings.genres}
            onChange={(newGenres, primaryGenre) =>
              updateSettings({
                genres: newGenres,
                primaryGenre: primaryGenre || newGenres[0],
              })
            }
            maxRecommended={5}
          />
        </div>

        {/* Searchable Emotional Tone Dropdown */}
        <div className="space-y-2">
          <EmotionalToneSelect
            value={project.settings.tone}
            primaryTone={project.settings.primaryTone}
            secondaryTone={project.settings.secondaryTone}
            onChange={(combinedTone, primary, secondary) =>
              updateSettings({
                tone: combinedTone,
                primaryTone: primary,
                secondaryTone: secondary,
              })
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Language */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#D7DCE2]">
              Primary Language
            </label>
            <select
              value={project.settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00AFFF] focus:outline-none"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Audience */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#D7DCE2]">
              Target Audience
            </label>
            <select
              value={project.settings.audience}
              onChange={(e) => updateSettings({ audience: e.target.value })}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00AFFF] focus:outline-none"
            >
              {AUDIENCE_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

          {/* Narration */}
          <div className="space-y-1.5 md:col-span-3">
            <label className="text-xs font-semibold text-[#D7DCE2]">
              Voiceover / Narration Philosophy
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {NARRATION_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateSettings({ narration: n })}
                  className={`py-2 px-2 text-xs rounded-lg border text-center transition-colors ${
                    project.settings.narration === n
                      ? 'bg-[#00AFFF]/20 border-[#00AFFF] text-white font-semibold'
                      : 'bg-[#111820] border-[#1C2735] text-[#79838E] hover:text-[#D7DCE2]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
      </section>

      {/* SECTION 3: MASTER VISUAL STYLE REGISTRY */}
      <section className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-3">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-[#00AFFF]" />
            <h2 className="font-['Exo_2'] font-bold text-base text-white tracking-wide">
              3. MASTER VISUAL STYLE REGISTRY
            </h2>
          </div>
          <span className="text-[11px] text-[#79838E]">
            Authoritative Look • Inherited by Stages 2–4
          </span>
        </div>

        {/* Selected Preset Showcase Banner */}
        <div className="bg-[#111820] border-2 border-[#00AFFF] rounded-xl p-4 space-y-2 shadow-lg shadow-[#00AFFF]/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#00AFFF] uppercase tracking-wider">
                ACTIVE STYLE:
              </span>
              <span className="text-sm font-bold text-white">
                {project.visualStyle.name}
              </span>
              <span className="text-[10px] bg-[#1C2735] text-[#D7DCE2] px-2 py-0.5 rounded font-mono">
                {project.visualStyle.category}
              </span>
            </div>
            <span className="text-[10px] bg-[#00AFFF]/20 text-[#00AFFF] px-2 py-0.5 rounded font-mono font-semibold">
              {project.visualStyle.realismLevel}
            </span>
          </div>

          <p className="text-xs text-[#D7DCE2] leading-relaxed">
            {project.visualStyle.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1C2735] text-[11px] text-[#79838E]">
            <div>
              <span className="text-[#D7DCE2] font-semibold">Medium: </span>
              {project.visualStyle.medium}
            </div>
            <div>
              <span className="text-[#D7DCE2] font-semibold">Lighting: </span>
              {project.visualStyle.lightingIntent}
            </div>
            <div>
              <span className="text-[#D7DCE2] font-semibold">Texture: </span>
              {project.visualStyle.textureIntent}
            </div>
          </div>
        </div>

        {/* Custom Hybrid Style Editor (if custom is active or for adding bespoke director notes) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#D7DCE2] flex items-center justify-between">
            <span>Bespoke Visual Nuance / Custom Hybrid Directives</span>
            <span className="text-[10px] text-[#79838E]">Optional director-level customization</span>
          </label>
          <textarea
            rows={2}
            value={project.visualStyle.customDescription || ''}
            onChange={(e) =>
              updateVisualStyle({
                ...project.visualStyle,
                customDescription: e.target.value,
              })
            }
            placeholder="e.g., Infuse 1970s Filipino rural daylight, heavy atmospheric dust motes, muted tropical teal shadows..."
            className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white placeholder-[#79838E]/50 focus:border-[#00AFFF] focus:outline-none transition-colors"
          />
        </div>

        {/* Preset Search and Category Filter */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#79838E]" />
              <input
                type="text"
                value={styleSearch}
                onChange={(e) => setStyleSearch(e.target.value)}
                placeholder="Search styles by keyword (e.g. Noir, Anime, Clay, Watercolor, 35mm)..."
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#79838E]/50 focus:border-[#00AFFF] focus:outline-none"
              />
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00AFFF] focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Style Categories' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Preset Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
            {filteredStyles.map((preset) => {
              const isSelected = project.visualStyle.presetId === preset.presetId;
              return (
                <button
                  key={preset.presetId}
                  type="button"
                  onClick={() => updateVisualStyle(preset)}
                  className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#00AFFF]/15 border-[#00AFFF] text-white shadow-md'
                      : 'bg-[#111820] hover:bg-[#161F2A] border-[#1C2735] text-[#D7DCE2] hover:border-[#2E3E52]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-[#00AFFF] uppercase tracking-wide truncate">
                        {preset.category}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#00AFFF]" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-white mb-1">
                      {preset.name}
                    </div>
                    <p className="text-[11px] text-[#79838E] line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-[#1C2735]/60 text-[9px] text-[#79838E] flex justify-between font-mono">
                    <span>{preset.realismLevel}</span>
                    <span className="truncate max-w-[100px]">{preset.medium}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4: ADVANCED / CULTURAL CONSTRAINTS (COLLAPSIBLE) */}
      <section className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#F4A62A]" />
            <h2 className="font-['Exo_2'] font-bold text-base text-white tracking-wide">
              4. ADVANCED SETTING, CULTURE & CONSTRAINTS
            </h2>
          </div>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4 text-[#79838E]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#79838E]" />
          )}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#1C2735]">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#D7DCE2]">
                Setting & Cultural Context
              </label>
              <input
                type="text"
                value={project.settings.settingCulture || ''}
                onChange={(e) => updateSettings({ settingCulture: e.target.value })}
                placeholder="e.g. Quiapo Market during monsoon; Neo-Tokyo 2099; Coastal fishing village"
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white placeholder-[#79838E]/50 focus:border-[#00AFFF] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#D7DCE2]">
                Hard Story Constraints
              </label>
              <input
                type="text"
                value={project.settings.storyConstraints || ''}
                onChange={(e) => updateSettings({ storyConstraints: e.target.value })}
                placeholder="e.g. Single location, no weapons, must feature a pocket watch, no voiceover"
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white placeholder-[#79838E]/50 focus:border-[#00AFFF] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-[#D7DCE2]">
                Special Director Instructions for Gemini
              </label>
              <textarea
                rows={2}
                value={project.settings.specialInstructions || ''}
                onChange={(e) => updateSettings({ specialInstructions: e.target.value })}
                placeholder="Any special narrative pacing instructions, character tropes to avoid, or thematic priorities..."
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white placeholder-[#79838E]/50 focus:border-[#00AFFF] focus:outline-none"
              />
            </div>
          </div>
        )}
      </section>

      {/* Primary Continue Button to Mode Step */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={() => setActiveTab(nextTabForMode)}
          className="flex items-center space-x-2 bg-[#00AFFF] hover:bg-[#0095DC] text-white font-bold text-sm px-6 py-3 rounded-lg shadow-xl shadow-[#00AFFF]/20 transition-all cursor-pointer"
        >
          <span>{nextButtonLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
