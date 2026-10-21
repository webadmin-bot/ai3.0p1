import React, { useState } from 'react';
import {
  Sparkles,
  Compass,
  Search,
  BookOpen,
  Sliders,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  FileText,
  Layers,
  Settings,
  HelpCircle,
  Mic,
  Volume2,
  VolumeX,
  Radio,
  Headphones,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { StorySourceMode, FormatType, VoiceMode, OpeningStrategy } from '../../types/filmStudio';
import { VISUAL_STYLE_PRESETS } from '../../data/visualStylePresets';
import { GenreMultiSelect } from './GenreMultiSelect';
import { EmotionalToneSelect } from './EmotionalToneSelect';

interface StartingModesTabProps {
  onContinueToNext?: () => void;
}

export const StartingModesTab: React.FC<StartingModesTabProps> = ({ onContinueToNext }) => {
  const {
    project,
    updateSettings,
    updateVisualStyle,
    setStorySourceMode,
    renameProject,
    updateOriginalStoryText,
    updateNicheResearch,
    markPhase1StepCompleted,
    updatePhase1Workflow,
  } = useProject();

  const currentMode = project.storySourceMode;
  const [validationError, setValidationError] = useState<string | null>(null);
  const [scriptType, setScriptType] = useState<'STORY' | 'SCREENPLAY'>('STORY');
  const [showAdvancedAudio, setShowAdvancedAudio] = useState(false);

  const modes: Array<{
    id: StorySourceMode;
    label: string;
    modeLetter: string;
    title: string;
    tagline: string;
    description: string;
    badge: string;
    badgeColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'DISCOVER_NICHES',
      label: 'Discover Niches',
      modeLetter: 'MODE A',
      title: 'Discover Video Niches',
      tagline: 'No topic yet? Let Creative Brain find high-demand niches.',
      description:
        'Explore evidence-based content opportunities, viral categories, high-retention hooks, and underserved audience gaps.',
      badge: 'Trend Discovery',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: Compass,
    },
    {
      id: 'RESEARCH_NICHE',
      label: 'Research My Niche',
      modeLetter: 'MODE B',
      title: 'Research My Niche',
      tagline: 'Have a topic or industry? Analyze real audience interest & gaps.',
      description:
        'Inspect existing popular videos, audience demand scores, competition metrics, and find the winning creative hook for your niche.',
      badge: 'Evidence Research',
      badgeColor: 'bg-[#00AFFF]/15 text-[#00AFFF] border-[#00AFFF]/30',
      icon: Search,
    },
    {
      id: 'ORIGINAL_IDEAS',
      label: 'Generate Original Ideas',
      modeLetter: 'MODE C',
      title: 'Generate Original Ideas',
      tagline: 'Specify genre or premise to generate 5 distinct story concepts.',
      description:
        'Skip external platform research and generate fresh narrative architectures tailored to your visual style and format.',
      badge: 'Original Fiction',
      badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      icon: Sparkles,
    },
    {
      id: 'OWN_STORY',
      label: 'I Have My Own Story',
      modeLetter: 'MODE D',
      title: 'I Have My Own Story / Script',
      tagline: 'Bring your own premise, narrative draft, or full screenplay.',
      description:
        'Respects your original vision verbatim. Analyzes character dynamics and builds the visual asset & shot plan directly from your text.',
      badge: 'Author Canon',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: BookOpen,
    },
  ];

  const isModeActive = (modeId: StorySourceMode) => {
    if (currentMode === modeId) return true;
    if (modeId === 'ORIGINAL_IDEAS' && currentMode === 'AI_CONCEPT') return true;
    if (modeId === 'OWN_STORY' && (currentMode === 'OWN_STORY' || currentMode === 'OWN_SCRIPT')) return true;
    return false;
  };

  const handleSelectMode = (modeId: StorySourceMode) => {
    setStorySourceMode(modeId);
    setValidationError(null);
    updatePhase1Workflow({ selectedStartingMode: modeId });
  };

  const handleConfirmAndContinue = () => {
    setValidationError(null);

    // Validation rules per mode
    if (!project.title || !project.title.trim()) {
      setValidationError('Please specify a Project Title before continuing.');
      return;
    }

    if (currentMode === 'RESEARCH_NICHE') {
      if (!project.settings.topicOrNiche || !project.settings.topicOrNiche.trim()) {
        setValidationError('Mode B requires a Topic or Niche to research. Please enter your niche or subject matter below.');
        return;
      }
    }

    if (currentMode === 'ORIGINAL_IDEAS' || currentMode === 'AI_CONCEPT') {
      if (!project.settings.genres || project.settings.genres.length === 0) {
        setValidationError('Mode C requires at least one primary genre to generate tailored original concepts.');
        return;
      }
    }

    if (currentMode === 'OWN_STORY' || currentMode === 'OWN_SCRIPT') {
      if (!project.originalStoryText || project.originalStoryText.trim().length < 15) {
        setValidationError('Mode D requires your original story draft, treatment, or screenplay text (minimum 15 characters).');
        return;
      }
    }

    // Determine next step based on mode
    let nextStep: 'discover_niches' | 'research_niche' | 'concepts' | 'own_story_review' = 'concepts';
    if (currentMode === 'DISCOVER_NICHES') {
      nextStep = 'discover_niches';
    } else if (currentMode === 'RESEARCH_NICHE') {
      nextStep = 'research_niche';
    } else if (currentMode === 'ORIGINAL_IDEAS' || currentMode === 'AI_CONCEPT') {
      nextStep = 'concepts';
    } else if (currentMode === 'OWN_STORY' || currentMode === 'OWN_SCRIPT') {
      nextStep = 'own_story_review';
    }

    // Confirm setup in workflow
    updatePhase1Workflow({
      setupConfirmed: true,
      selectedStartingMode: currentMode,
      confirmedAt: new Date().toISOString(),
    });

    markPhase1StepCompleted('setup', nextStep);

    if (onContinueToNext) {
      onContinueToNext();
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Starting Modes Selection Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00AFFF]">
              Step 1 — Creative Starting Point
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white font-['Exo_2']">
              Choose Your Creative Starting Mode
            </h3>
          </div>
          <span className="text-xs text-[#79838E] hidden sm:inline">
            Each mode unlocks a tailored progressive filmmaking workflow
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modes.map((m) => {
            const active = isModeActive(m.id);
            const Icon = m.icon;

            return (
              <div
                key={m.id}
                onClick={() => handleSelectMode(m.id)}
                className={`p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  active
                    ? 'bg-[#0E1724] border-[#00AFFF] shadow-md shadow-[#00AFFF]/10 ring-1 ring-[#00AFFF]'
                    : 'bg-[#0B1017] border-[#1C2735] hover:border-[#2C3B4E] hover:bg-[#0E141D]'
                }`}
              >
                {active && (
                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                    <div className="absolute transform rotate-45 bg-[#00AFFF] text-white font-bold text-[9px] py-0.5 right-[-35px] top-[18px] w-[120px] text-center">
                      ACTIVE
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-[#79838E] uppercase tracking-wider">
                      {m.modeLetter}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${m.badgeColor}`}>
                      {m.badge}
                    </span>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        active ? 'bg-[#00AFFF] text-white' : 'bg-[#141C26] text-[#79838E]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{m.title}</h4>
                      <p className="text-xs text-amber-200/80 font-medium mt-0.5">{m.tagline}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#8A96A6] leading-relaxed pt-1">
                    {m.description}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-[#1C2735] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#55606E]">
                    {active ? 'Selected starting mode' : 'Click to select this mode'}
                  </span>
                  <span className={`font-semibold ${active ? 'text-[#00AFFF]' : 'text-[#79838E]'}`}>
                    {active ? '✓ Selected' : 'Select →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mode-Specific Setup Form */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C2735]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#00AFFF]">
                Mode Parameters Setup
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#141C26] text-[#A0AEC0] border border-[#243346]">
                {currentMode === 'DISCOVER_NICHES'
                  ? 'MODE A · DISCOVER NICHES'
                  : currentMode === 'RESEARCH_NICHE'
                  ? 'MODE B · RESEARCH MY NICHE'
                  : currentMode === 'OWN_STORY' || currentMode === 'OWN_SCRIPT'
                  ? 'MODE D · AUTHOR STORY'
                  : 'MODE C · ORIGINAL IDEAS'}
              </span>
            </div>
            <h3 className="text-base font-bold text-white font-['Exo_2'] mt-1">
              {currentMode === 'DISCOVER_NICHES' && 'Mode A: Discovery Preferences & Production Specs'}
              {currentMode === 'RESEARCH_NICHE' && 'Mode B: Niche Subject & Research Parameters'}
              {(currentMode === 'ORIGINAL_IDEAS' || currentMode === 'AI_CONCEPT') && 'Mode C: Narrative Architecture & Style Specs'}
              {(currentMode === 'OWN_STORY' || currentMode === 'OWN_SCRIPT') && 'Mode D: Original Story Input & Adaptation Specs'}
            </h3>
          </div>
          <span className="text-xs text-[#79838E] hidden sm:inline">
            Configures downstream script pacing, aspect ratio, audio & visual styling
          </span>
        </div>

        {/* Global Project Title Field (Required across all modes) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider flex items-center justify-between">
            <span>Project Title <strong className="text-rose-400">*</strong></span>
            <span className="text-[10px] text-[#55606E]">Working title for script & video</span>
          </label>
          <input
            type="text"
            value={project.title}
            onChange={(e) => renameProject(project.projectId, e.target.value)}
            placeholder="e.g. Echoes of Europa, The Quantum Heist, Micro-History: Pompeii..."
            className="w-full px-3.5 py-2.5 bg-[#070B10] border border-[#1C2735] focus:border-[#00AFFF] rounded-lg text-white text-xs placeholder-[#55606E] outline-none transition-colors"
          />
        </div>

        {/* ========================================================================= */}
        {/* MODE A SPECIFIC FORM: Platform, Region, Language, Audience, Format        */}
        {/* ========================================================================= */}
        {currentMode === 'DISCOVER_NICHES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Optional Topic or Starting Direction */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider flex items-center justify-between">
                <span>Optional Starting Direction or Curiosity (Optional)</span>
                <span className="text-[10px] text-[#00AFFF]">Creative Brain will discover 6 niches</span>
              </label>
              <input
                type="text"
                value={project.settings.topicOrNiche || ''}
                onChange={(e) => updateSettings({ topicOrNiche: e.target.value })}
                placeholder="e.g. History, Sci-Fi mysteries, Deep sea, True crime, Tech dilemmas... (Leave blank for open trend discovery)"
                className="w-full px-3.5 py-2 bg-[#070B10] border border-[#1C2735] focus:border-[#00AFFF] rounded-lg text-white text-xs placeholder-[#55606E] outline-none"
              />
            </div>

            {/* Target Platform */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Target Distribution Platform
              </label>
              <select
                value={project.settings.platform}
                onChange={(e) => updateSettings({ platform: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
              >
                <option value="YouTube Shorts">YouTube Shorts (Vertical 9:16)</option>
                <option value="TikTok">TikTok (Vertical 9:16)</option>
                <option value="Instagram Reels">Instagram Reels (Vertical 9:16)</option>
                <option value="Facebook Reels">Facebook Reels (Vertical 9:16)</option>
                <option value="YouTube">YouTube Cinematic (Widescreen 16:9)</option>
                <option value="Multi-Platform">Multi-Platform Universal</option>
              </select>
            </div>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Target Audience Demographics
              </label>
              <select
                value={project.settings.audience || 'General'}
                onChange={(e) => updateSettings({ audience: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
              >
                <option value="General">General Video Audience</option>
                <option value="Gen Z & Digital Natives">Gen Z & Digital Natives (Fast Pacing, High Energy)</option>
                <option value="Millennials">Millennials (Cinematic Storytelling, Nostalgia)</option>
                <option value="Tech & Sci-Fi Enthusiasts">Tech & Sci-Fi Enthusiasts (High Concepts, Worldbuilding)</option>
                <option value="Cinema & Film Buffs">Cinema & Film Buffs (Deep Atmosphere, Subtext)</option>
                <option value="Educational & Curiosity Seekers">Educational & Curiosity Seekers (What-Ifs, History)</option>
              </select>
            </div>

            {/* Language & Target Region */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Language & Regional Focus
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={project.settings.language}
                  onChange={(e) => updateSettings({ language: e.target.value })}
                  placeholder="Language (e.g. English)"
                  className="px-3 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none"
                />
                <input
                  type="text"
                  value={project.settings.targetRegion || 'US'}
                  onChange={(e) => updateSettings({ targetRegion: e.target.value })}
                  placeholder="Region (e.g. US, Global)"
                  className="px-3 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none"
                />
              </div>
            </div>

            {/* Dialogue / Voice Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Content Voice / Audio Format
              </label>
              <select
                value={project.settings.voiceFormat || 'Dialogue'}
                onChange={(e) => updateSettings({ voiceFormat: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
              >
                <option value="Dialogue">Character Dialogue & Cinematic Staging</option>
                <option value="Narration">Voiceover / Documentary Narration Led</option>
                <option value="Inner Voice">Character Inner Monologue</option>
                <option value="No-Voice">No-Voice (Visuals + Cinematic Foley / Score)</option>
              </select>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE B SPECIFIC FORM: Niche Topic Required, Research Filters, Format      */}
        {/* ========================================================================= */}
        {currentMode === 'RESEARCH_NICHE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Required Topic or Niche */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider flex items-center justify-between">
                <span>Niche or Subject Matter to Research <strong className="text-rose-400">* (Required)</strong></span>
                <span className="text-[10px] text-amber-300">Searched via YouTube Data API v3</span>
              </label>
              <input
                type="text"
                value={project.settings.topicOrNiche || ''}
                onChange={(e) => {
                  updateSettings({ topicOrNiche: e.target.value });
                  updateNicheResearch({ keyword: e.target.value });
                }}
                placeholder="e.g. Ancient Roman Gladiators, Deep Sea Submarines, Cyberpunk AI Crime, Quantum Physics What-Ifs..."
                className={`w-full px-3.5 py-2.5 bg-[#070B10] border rounded-lg text-white text-xs outline-none transition-colors ${
                  !project.settings.topicOrNiche ? 'border-amber-500/50 focus:border-amber-400' : 'border-[#1C2735] focus:border-[#00AFFF]'
                }`}
              />
              {!project.settings.topicOrNiche && (
                <p className="text-[11px] text-amber-300">
                  Please enter your topic or keyword so the research engine can retrieve real audience demand and metrics.
                </p>
              )}
            </div>

            {/* Target Platform */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Distribution Platform
              </label>
              <select
                value={project.settings.platform}
                onChange={(e) => {
                  updateSettings({ platform: e.target.value });
                  updateNicheResearch({ selectedPlatform: e.target.value });
                }}
                className="w-full px-3.5 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
              >
                <option value="YouTube Shorts">YouTube Shorts</option>
                <option value="TikTok">TikTok</option>
                <option value="Instagram Reels">Instagram Reels</option>
                <option value="YouTube">YouTube Long-Form</option>
                <option value="Multi-Platform">Multi-Platform Universal</option>
              </select>
            </div>

            {/* Timeframe Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Research Timeframe Filter
              </label>
              <select
                value={project.nicheResearch?.timeframe || '30d'}
                onChange={(e) => updateNicheResearch({ timeframe: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
              >
                <option value="7d">Past 7 Days (Ultra-Recent Trending)</option>
                <option value="30d">Past 30 Days (Established Monthly Momentum)</option>
                <option value="90d">Past 90 Days (Quarterly Evergreen Demand)</option>
              </select>
            </div>

            {/* Content Type Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Video Content Duration Filter
              </label>
              <select
                value={project.nicheResearch?.contentType || 'shorts'}
                onChange={(e) => updateNicheResearch({ contentType: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
              >
                <option value="shorts">Short-Form (&lt; 60 seconds)</option>
                <option value="long">Long-Form (&gt; 4 minutes)</option>
                <option value="all">All Durations</option>
              </select>
            </div>

            {/* Min Views Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Minimum Views Threshold
              </label>
              <select
                value={project.nicheResearch?.minViews || 10000}
                onChange={(e) => updateNicheResearch({ minViews: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
              >
                <option value={1000}>1,000+ views (Micro-niche & early breakout)</option>
                <option value={10000}>10,000+ views (Verified viewer interest)</option>
                <option value={50000}>50,000+ views (Proven mid-scale traction)</option>
                <option value={200000}>200,000+ views (Mega-viral hits)</option>
              </select>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE C SPECIFIC FORM: Genre, Tone, Premise, Style (Research Skipped)      */}
        {/* ========================================================================= */}
        {(currentMode === 'ORIGINAL_IDEAS' || currentMode === 'AI_CONCEPT') && (
          <div className="space-y-5 pt-2">
            <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/30 text-purple-200 text-xs flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Pure Original Fiction Mode:</strong> External platform research is bypassed by default. The Creative Brain will generate 5 distinct narrative decks directly from your selected genres, emotional tones, and optional premise.
              </span>
            </div>

            {/* Optional Premise / Story Spark */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider flex items-center justify-between">
                <span>Optional Story Spark, Premise or High Concept Hook</span>
                <span className="text-[10px] text-[#55606E]">Leave blank for 5 diverse open directions</span>
              </label>
              <textarea
                rows={2}
                value={project.settings.topicOrNiche || ''}
                onChange={(e) => updateSettings({ topicOrNiche: e.target.value })}
                placeholder="e.g. In an underwater research colony, an engineer discovers that the station AI has been communicating with abyssal leviathans..."
                className="w-full px-3.5 py-2 bg-[#070B10] border border-[#1C2735] focus:border-[#00AFFF] rounded-lg text-white text-xs placeholder-[#55606E] outline-none"
              />
            </div>

            {/* Searchable Multi-Select Genre Library */}
            <div>
              <label className="block text-xs font-semibold text-[#8A96A6] uppercase tracking-wider mb-1">
                Genres <strong className="text-rose-400">* (Select 1-5 genres)</strong>
              </label>
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

            {/* Emotional Tone Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#8A96A6] uppercase tracking-wider mb-1">
                Emotional Tone & Atmosphere
              </label>
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE D SPECIFIC FORM: Original Story Text / Full Screenplay Verbatim       */}
        {/* ========================================================================= */}
        {(currentMode === 'OWN_STORY' || currentMode === 'OWN_SCRIPT') && (
          <div className="space-y-5 pt-2">
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Author Canon Preservation:</strong> Your original story, character dialogue, and scene descriptions will be respected verbatim. Downstream scenes and shots are built directly from your text without forcing concept generation.
              </span>
            </div>

            {/* Script Type Toggle */}
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-[#8A96A6] font-semibold uppercase tracking-wider">Input Document Type:</span>
              <div className="flex rounded-lg p-1 bg-[#070B10] border border-[#1C2735]">
                <button
                  type="button"
                  onClick={() => setScriptType('STORY')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    scriptType === 'STORY' ? 'bg-[#00AFFF] text-white' : 'text-[#79838E] hover:text-white'
                  }`}
                >
                  Original Story / Treatment Draft
                </button>
                <button
                  type="button"
                  onClick={() => setScriptType('SCREENPLAY')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    scriptType === 'SCREENPLAY' ? 'bg-[#00AFFF] text-white' : 'text-[#79838E] hover:text-white'
                  }`}
                >
                  Full Formatted Screenplay (Preserve Verbatim)
                </button>
              </div>
            </div>

            {/* Large Text Area for Author Text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                  {scriptType === 'SCREENPLAY' ? 'Paste Full Screenplay Text' : 'Paste Original Story / Scene Treatment'}{' '}
                  <strong className="text-rose-400">*</strong>
                </label>
                <span className="text-[11px] text-[#79838E] font-mono">
                  {project.originalStoryText?.length || 0} characters ·{' '}
                  {project.originalStoryText ? project.originalStoryText.trim().split(/\s+/).length : 0} words
                </span>
              </div>
              <textarea
                rows={9}
                value={project.originalStoryText || ''}
                onChange={(e) => updateOriginalStoryText(e.target.value)}
                placeholder={
                  scriptType === 'SCREENPLAY'
                    ? `INT. ORBITAL COMM-DECK - NIGHT\n\nELENA (30s) stares at the encrypted distress signal oscillating across the holoscreen.\n\nELENA\nThey aren't requesting extraction. They're transmitting coordinates.\n\nMARCUS steps out from the shadow of the blast bulkhead.\n\nMARCUS\nThen close the frequency before it propagates to the colony grid.`
                    : `Write or paste your original narrative story, treatment, plot breakdown, or character scenes here. XEMACS7 AI Film Studio will preserve your characters, dialogue, and beats verbatim throughout pre-production and shot planning.`
                }
                className="w-full p-3.5 bg-[#070B10] border border-[#1C2735] focus:border-[#00AFFF] rounded-lg text-white font-mono text-xs placeholder-[#55606E] outline-none leading-relaxed select-text"
              />
            </div>

            {/* Adaptation Fidelity Preferences */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Adaptation & Script Pacing Preference
              </label>
              <select
                value={project.settings.customCreativeInstructions || 'Strict verbatim fidelity to original dialogue and scenes'}
                onChange={(e) => updateSettings({ customCreativeInstructions: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
              >
                <option value="Strict verbatim fidelity to original dialogue and scenes">
                  Strict Verbatim Fidelity (Preserve author lines and action blocks exactly as written)
                </option>
                <option value="Cinematic expansion of visual blocking while preserving dialogue">
                  Cinematic Visual Expansion (Preserve dialogue verbatim, expand camera movement & lighting)
                </option>
                <option value="Adaptive pacing optimization for target runtime">
                  Adaptive Pacing (Fit editorial scene count to target runtime duration)
                </option>
              </select>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* COMMON TECHNICAL FORMAT SPECIFICATIONS (Reused across all modes)          */}
        {/* ========================================================================= */}
        <div className="pt-4 border-t border-[#1C2735] space-y-4">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-[#00AFFF]" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Technical Production Format & Visual Bible
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['9:16', '16:9', '1:1'] as const).map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => updateSettings({ aspectRatio: ar })}
                    className={`py-2 px-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer text-center ${
                      project.settings.aspectRatio === ar
                        ? 'bg-[#00AFFF]/20 border-[#00AFFF] text-white'
                        : 'bg-[#070B10] border-[#1C2735] text-[#79838E] hover:border-[#2C3B4E]'
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Runtime */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Target Runtime
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="15"
                  max="3600"
                  step="15"
                  value={project.settings.targetRuntimeSeconds}
                  onChange={(e) => updateSettings({ targetRuntimeSeconds: Number(e.target.value) })}
                  className="w-24 px-3 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none"
                />
                <span className="text-xs text-[#79838E]">
                  ≈ {Math.floor(project.settings.targetRuntimeSeconds / 60)}m{' '}
                  {project.settings.targetRuntimeSeconds % 60}s
                </span>
              </div>
            </div>

            {/* Master Visual Style Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
                Master Visual Style
              </label>
              <select
                value={project.visualStyle?.presetId || 'preset_cinematic_realism'}
                onChange={(e) => {
                  const found = VISUAL_STYLE_PRESETS.find((p) => p.presetId === e.target.value);
                  if (found) updateVisualStyle(found);
                }}
                className="w-full px-3 py-2 bg-[#070B10] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer truncate"
              >
                {VISUAL_STYLE_PRESETS.map((preset) => (
                  <option key={preset.presetId} value={preset.presetId}>
                    {preset.name} ({preset.medium})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VOICE, DIALOGUE & OPENING STRATEGY (UNIVERSAL AUDIO CONTINUITY)           */}
        {/* ========================================================================= */}
        <div className="pt-4 border-t border-[#1C2735] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mic className="w-4 h-4 text-[#00AFFF]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Voice Mode, Dialogue & Opening Strategy
              </h4>
            </div>
            <span className="text-[11px] text-[#55606E]">
              Governs script speech generation & authoritative audio sheet
            </span>
          </div>

          {/* Voice Mode 6-Option Grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider flex items-center justify-between">
              <span>Voice Mode</span>
              <span className="text-[11px] font-mono text-[#00AFFF]">
                Active: {project.settings.voiceMode || 'CHARACTER_DIALOGUE_ONLY'}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                {
                  id: 'CHARACTER_DIALOGUE_ONLY' as VoiceMode,
                  label: 'Dialogue Only',
                  sub: 'Character lines',
                  icon: Mic,
                },
                {
                  id: 'NARRATION_VO_ONLY' as VoiceMode,
                  label: 'Narration Only',
                  sub: 'Single VO voice',
                  icon: Volume2,
                },
                {
                  id: 'DIALOGUE_AND_NARRATION' as VoiceMode,
                  label: 'Dialogue + VO',
                  sub: 'Both speech lanes',
                  icon: Radio,
                },
                {
                  id: 'INTRO_NARRATION_THEN_DIALOGUE' as VoiceMode,
                  label: 'Intro VO → Dialogue',
                  sub: 'Hook then scenes',
                  icon: Headphones,
                },
                {
                  id: 'AI_DECIDE' as VoiceMode,
                  label: 'AI Decide',
                  sub: 'Auto by format',
                  icon: Sparkles,
                },
                {
                  id: 'NO_SPOKEN_VOICE' as VoiceMode,
                  label: 'No Spoken Voice',
                  sub: 'Intentional silent',
                  icon: VolumeX,
                },
              ].map((vm) => {
                const Icon = vm.icon;
                const isSelected = (project.settings.voiceMode || 'CHARACTER_DIALOGUE_ONLY') === vm.id;
                return (
                  <button
                    key={vm.id}
                    type="button"
                    onClick={() => updateSettings({ voiceMode: vm.id })}
                    className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#00AFFF]/15 border-[#00AFFF] text-white ring-1 ring-[#00AFFF]/30'
                        : 'bg-[#070B10] border-[#1C2735] text-[#79838E] hover:border-[#2C3B4E]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#00AFFF]' : 'text-[#55606E]'}`} />
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00AFFF]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight truncate">{vm.label}</div>
                      <div className="text-[10px] text-[#55606E] truncate">{vm.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opening Strategy Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider">
              Opening Strategy (3-Second Retention Hook)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { id: 'NONE' as OpeningStrategy, label: 'Standard', desc: 'Direct scene start' },
                { id: 'NARRATOR_HOOK' as OpeningStrategy, label: 'Narrator Hook', desc: 'Provocative VO question' },
                { id: 'CHARACTER_DIALOGUE_HOOK' as OpeningStrategy, label: 'Dialogue Hook', desc: 'Punchy opening line' },
                { id: 'CINEMATIC_PROLOGUE' as OpeningStrategy, label: 'Prologue', desc: 'Atmospheric cold visual' },
                { id: 'MYSTERY_COLD_OPEN' as OpeningStrategy, label: 'Mystery Open', desc: 'In media res dilemma' },
                { id: 'AI_DECIDE' as OpeningStrategy, label: 'AI Decide', desc: 'Format optimal hook' },
              ].map((os) => {
                const isSelected = (project.settings.openingStrategy || 'NONE') === os.id;
                return (
                  <button
                    key={os.id}
                    type="button"
                    onClick={() => updateSettings({ openingStrategy: os.id })}
                    className={`py-2 px-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#141F2E] border-[#00AFFF] text-white ring-1 ring-[#00AFFF]/20'
                        : 'bg-[#070B10] border-[#1C2735] text-[#79838E] hover:border-[#2C3B4E]'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{os.label}</div>
                    <div className="text-[9px] text-[#55606E] truncate">{os.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Collapsible Advanced Voice & Audio Continuity Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedAudio(!showAdvancedAudio)}
              className="flex items-center space-x-1.5 text-xs text-[#00AFFF] hover:text-[#38BDF8] font-semibold cursor-pointer"
            >
              {showAdvancedAudio ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showAdvancedAudio ? 'Hide Advanced Voice Controls' : 'Show Advanced Audio Continuity, Voice Pacing & Persona Controls'}</span>
            </button>

            {showAdvancedAudio && (
              <div className="mt-3 p-3.5 rounded-xl bg-[#070B10] border border-[#1C2735] space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Spoken-Word Pacing */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8A96A6]">
                      Spoken Pacing (Speech Density)
                    </label>
                    <select
                      value={project.settings.spokenWordPacing || 'NATURAL'}
                      onChange={(e) => updateSettings({ spokenWordPacing: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-[#0B1017] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
                    >
                      <option value="SLOW">Slow (~2.0 words/s · Dramatic / Horror)</option>
                      <option value="NATURAL">Natural (~2.6 words/s · Cinematic Standard)</option>
                      <option value="RAPID">Rapid (~3.3 words/s · High-Energy Short)</option>
                    </select>
                  </div>

                  {/* Target Intro Duration */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8A96A6]">
                      Target Intro Hook Length
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="2"
                        max={Math.max(4, Math.floor(project.settings.targetRuntimeSeconds * 0.25))}
                        value={project.settings.targetIntroDurationSeconds || Math.min(8, Math.max(3, Math.floor(project.settings.targetRuntimeSeconds * 0.15)))}
                        onChange={(e) => updateSettings({ targetIntroDurationSeconds: Number(e.target.value) })}
                        className="w-20 px-2.5 py-1.5 bg-[#0B1017] border border-[#1C2735] rounded-lg text-white text-xs outline-none"
                      />
                      <span className="text-[10px] text-[#55606E]">
                        seconds (max 25% of runtime)
                      </span>
                    </div>
                  </div>

                  {/* Audio Production Preference */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8A96A6]">
                      Audio Production Lane
                    </label>
                    <select
                      value={project.settings.audioProductionPreference || 'NATIVE_VIDEO_SYNC'}
                      onChange={(e) => updateSettings({ audioProductionPreference: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-[#0B1017] border border-[#1C2735] rounded-lg text-white text-xs outline-none cursor-pointer"
                    >
                      <option value="NATIVE_VIDEO_SYNC">Native Video Lip-Sync Preferred</option>
                      <option value="SEPARATE_VO_TRACK">Separate Editorial VO Track</option>
                      <option value="HYBRID">Hybrid (Native Character + External VO)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#141C26]">
                  {/* Narrator Persona */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8A96A6]">
                      Narrator Persona & Tone Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={project.settings.narratorPersona || ''}
                      onChange={(e) => updateSettings({ narratorPersona: e.target.value })}
                      placeholder="e.g. Gritty noir detective, calm scientific observer, or breathless storyteller"
                      className="w-full px-2.5 py-1.5 bg-[#0B1017] border border-[#1C2735] rounded-lg text-white text-xs outline-none placeholder-[#55606E]"
                    />
                  </div>

                  {/* Accent / Delivery Style */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8A96A6]">
                      Language / Accent / Delivery Style (Optional)
                    </label>
                    <input
                      type="text"
                      value={project.settings.voiceLanguageOrAccent || ''}
                      onChange={(e) => updateSettings({ voiceLanguageOrAccent: e.target.value })}
                      placeholder="e.g. English (Cinematic American), Whispered ASMR, or British Received Pronunciation"
                      className="w-full px-2.5 py-1.5 bg-[#0B1017] border border-[#1C2735] rounded-lg text-white text-xs outline-none placeholder-[#55606E]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Confirm Setup Action Bar */}
        <div className="pt-4 border-t border-[#1C2735] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-[#79838E]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Inputs validate locally · No AI token consumption to confirm setup</span>
          </div>

          <button
            onClick={handleConfirmAndContinue}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-all shadow-md shadow-[#00AFFF]/20 hover:shadow-lg hover:shadow-[#00AFFF]/30"
          >
            <span>CONFIRM & CONTINUE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
