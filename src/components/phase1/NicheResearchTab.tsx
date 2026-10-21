import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  TrendingUp,
  Youtube,
  Globe,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Flame,
  Target,
  Zap,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  apiGetResearchStatus,
  apiSearchYouTube,
  apiDiscoverNiches,
  apiAnalyzeNiche,
} from '../../services/api';
import {
  NicheResearchVideoItem,
  NicheOpportunityAnalysis,
  DiscoveredNicheCard,
} from '../../types/filmStudio';

interface NicheResearchTabProps {
  onProceedToConcepts?: () => void;
}

export const NicheResearchTab: React.FC<NicheResearchTabProps> = ({ onProceedToConcepts }) => {
  const { project, updateSettings, updateNicheResearch, markPhase1StepCompleted } = useProject();

  const [connected, setConnected] = useState<boolean>(false);
  const [dataSourceNotice, setDataSourceNotice] = useState<string>('Checking data sources...');
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);

  // Form states initialized from project
  const nicheState = project.nicheResearch || {
    connected: false,
    dataSourceNotice: '',
    selectedPlatform: project.settings.platform || 'YouTube Shorts',
    keyword: project.settings.topicOrNiche || '',
    region: 'US',
    language: project.settings.language || 'English',
    timeframe: '30d' as const,
    contentType: project.settings.format === 'Shorts/Reels' ? ('shorts' as const) : ('all' as const),
    minViews: 10000,
    searchResults: [],
    opportunityAnalysis: null,
    discoveredNiches: [],
    isSearching: false,
    isAnalyzing: false,
  };

  const [keyword, setKeyword] = useState(nicheState.keyword || project.settings.topicOrNiche || '');
  const [platform, setPlatform] = useState(nicheState.selectedPlatform || project.settings.platform || 'YouTube Shorts');
  const [region, setRegion] = useState(nicheState.region || 'US');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>(nicheState.timeframe || '30d');
  const [contentType, setContentType] = useState<'shorts' | 'long' | 'all'>(nicheState.contentType || 'shorts');
  const [minViews, setMinViews] = useState<number>(nicheState.minViews || 10000);

  const [searchResults, setSearchResults] = useState<NicheResearchVideoItem[]>(nicheState.searchResults || []);
  const [opportunityAnalysis, setOpportunityAnalysis] = useState<NicheOpportunityAnalysis | null>(
    nicheState.opportunityAnalysis || null
  );
  const [discoveredNiches, setDiscoveredNiches] = useState<DiscoveredNicheCard[]>(nicheState.discoveredNiches || []);

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check connection status on mount
  useEffect(() => {
    let mounted = true;
    apiGetResearchStatus()
      .then((res) => {
        if (!mounted) return;
        setConnected(res.connected);
        setDataSourceNotice(res.dataSourceNotice);
        setIsCheckingStatus(false);
      })
      .catch(() => {
        if (!mounted) return;
        setConnected(false);
        setDataSourceNotice('DATA SOURCE NOT CONNECTED: Backend status check failed.');
        setIsCheckingStatus(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSearchYouTube = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsSearching(true);

    try {
      const res = await apiSearchYouTube({
        keyword,
        timeframe,
        contentType,
        minViews,
        regionCode: region,
      });

      setConnected(res.connected);
      setDataSourceNotice(res.dataSourceNotice);
      setSearchResults(res.results || []);

      if (updateNicheResearch) {
        updateNicheResearch({
          connected: res.connected,
          dataSourceNotice: res.dataSourceNotice,
          keyword,
          selectedPlatform: platform,
          region,
          timeframe,
          contentType,
          minViews,
          searchResults: res.results || [],
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to perform research search.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDiscoverNiches = async () => {
    setIsDiscovering(true);
    setErrorMsg(null);
    try {
      const res = await apiDiscoverNiches({
        platform,
        targetAudience: project.settings.audience,
        format: project.settings.format,
      });

      if (res.success && res.niches) {
        setDiscoveredNiches(res.niches);
        if (updateNicheResearch) {
          updateNicheResearch({ discoveredNiches: res.niches });
        }
      } else {
        setErrorMsg(res.error || 'Failed to discover niches');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to discover niches');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAnalyzeNiche = async () => {
    const targetNiche = keyword.trim() || project.settings.topicOrNiche || 'AI Cinematic Drama';
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await apiAnalyzeNiche({
        niche: targetNiche,
        platform,
        audience: project.settings.audience,
        sampleVideos: searchResults,
      });

      if (res.success && res.analysis) {
        setOpportunityAnalysis(res.analysis);
        if (updateNicheResearch) {
          updateNicheResearch({ opportunityAnalysis: res.analysis });
        }
      } else {
        setErrorMsg(res.error || 'Failed to analyze niche opportunity');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to analyze niche opportunity');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const adoptNiche = (nicheCard: DiscoveredNicheCard) => {
    setKeyword(nicheCard.name);
    updateSettings({
      topicOrNiche: nicheCard.name,
      specialInstructions: `Niche focus: ${nicheCard.description}. Hook inspiration: "${nicheCard.trendingHook}". Narrative angle: ${nicheCard.sampleAngle}.`,
    });
    if (updateNicheResearch) {
      updateNicheResearch({ keyword: nicheCard.name });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0E1520] via-[#111A26] to-[#0A1017] border border-[#1C2735] rounded-xl p-5 md:p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AFFF]/10 text-[#00AFFF] border border-[#00AFFF]/30 uppercase tracking-widest">
                Creative Brain Engine
              </span>
              {/* Connection Status Badge */}
              <div
                className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                  connected
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{connected ? 'YouTube Data API Connected' : 'DATA SOURCE NOT CONNECTED'}</span>
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-['Exo_2'] text-white">
              Evidence-Based Viral & Niche Research
            </h2>
            <p className="text-xs text-[#8A96A6] max-w-3xl">
              Research real audience demand, discover high-potential video opportunities, analyze successful storytelling hooks, and identify underserved niches before producing scripts.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleDiscoverNiches}
              disabled={isDiscovering}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#141C28] hover:bg-[#1B2636] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-[#00AFFF] ${isDiscovering ? 'animate-spin' : ''}`} />
              <span>{isDiscovering ? 'Discovering...' : 'Mode A: Discover Niches'}</span>
            </button>

            {onProceedToConcepts && (
              <button
                onClick={() => {
                  const targetNiche = keyword.trim() || project.settings.topicOrNiche;
                  if (!targetNiche && !opportunityAnalysis) {
                    setErrorMsg('Please select or specify a niche to proceed to concept generation.');
                    return;
                  }
                  if (markPhase1StepCompleted) {
                    markPhase1StepCompleted('research_niche', 'concepts');
                    markPhase1StepCompleted('discover_niches');
                  }
                  onProceedToConcepts();
                }}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
              >
                <span>Confirm Niche & Proceed to Concepts</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Data Source Notice Bar */}
        <div className="mt-4 pt-3 border-t border-[#1C2735] flex items-center justify-between text-[11px] text-[#79838E]">
          <div className="flex items-center space-x-2">
            <Info className="w-3.5 h-3.5 text-[#00AFFF] shrink-0" />
            <span>{dataSourceNotice}</span>
          </div>
          <span className="text-[10px] text-[#55606E]">
            Verified data integrity: no fabricated metrics or artificial trends.
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Discovered Niches Grid (Mode A) */}
      {discoveredNiches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Mode A — High-Opportunity Niche Discoveries ({discoveredNiches.length})
              </h3>
            </div>
            <span className="text-[11px] text-[#79838E]">
              Select a niche to auto-populate research and story parameters
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {discoveredNiches.map((niche, idx) => {
              const isSelected = keyword.toLowerCase() === niche.name.toLowerCase();
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#101D2D] border-[#00AFFF] shadow-md shadow-[#00AFFF]/10'
                      : 'bg-[#0B1017] border-[#1C2735] hover:border-[#2A3B4F]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-[#00AFFF]">
                        {niche.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#00AFFF]/15 text-[#00AFFF] shrink-0">
                        {niche.demand} Demand
                      </span>
                    </div>

                    <p className="text-xs text-[#8A96A6] line-clamp-2">
                      {niche.description}
                    </p>

                    <div className="pt-2 border-t border-[#1C2735] space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-[#657283]">Hook: </span>
                        <span className="text-amber-300 font-medium italic">"{niche.trendingHook}"</span>
                      </div>
                      <div>
                        <span className="text-[#657283]">AI Suitability: </span>
                        <span className="text-emerald-400">{niche.aiSuitability}</span>
                      </div>
                      <div>
                        <span className="text-[#657283]">Angle: </span>
                        <span className="text-[#C5D0DE]">{niche.sampleAngle}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#1C2735]/60 flex items-center justify-between">
                    <span className="text-[10px] text-[#55606E]">
                      Competition: {niche.competition}
                    </span>
                    <button
                      onClick={() => adoptNiche(niche)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#00AFFF] text-white'
                          : 'bg-[#141C26] hover:bg-[#1E2938] text-[#D7DCE2] border border-[#243346]'
                      }`}
                    >
                      {isSelected ? '✓ Active Niche' : 'Adopt Niche'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Research Controls Card (Mode B) */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-[#00AFFF]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Mode B — Research Niche or Topic
            </h3>
          </div>
          <span className="text-[11px] text-[#79838E]">
            Targeting platform: <strong className="text-white">{platform}</strong>
          </span>
        </div>

        <form onSubmit={handleSearchYouTube} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#657283] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter video niche, premise seed, or keyword (e.g. Cinematic Sci-Fi, Deep Sea Lore, True Crime Shorts)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#070B10] border border-[#1C2735] focus:border-[#00AFFF] rounded-lg text-white text-xs placeholder-[#55606E] outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
            >
              <Youtube className="w-4 h-4" />
              <span>{isSearching ? 'Searching...' : 'Search Videos'}</span>
            </button>

            <button
              type="button"
              onClick={handleAnalyzeNiche}
              disabled={isAnalyzing}
              className="px-4 py-2.5 rounded-lg bg-[#141C28] hover:bg-[#1E293A] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors shadow-sm flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Opportunity'}</span>
            </button>
          </div>

          {/* Research Filters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 pt-2">
            <div>
              <label className="block text-[10px] font-semibold text-[#657283] uppercase mb-1">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => {
                  setPlatform(e.target.value);
                  updateSettings({ platform: e.target.value });
                }}
                className="w-full bg-[#070B10] border border-[#1C2735] rounded-md px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="YouTube Shorts">YouTube Shorts</option>
                <option value="YouTube">YouTube (Long-Form)</option>
                <option value="TikTok">TikTok</option>
                <option value="Instagram Reels">Instagram Reels</option>
                <option value="Facebook Reels">Facebook Reels</option>
                <option value="Multi-Platform">Multi-Platform</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#657283] uppercase mb-1">
                Region / Country
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-[#070B10] border border-[#1C2735] rounded-md px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="US">United States (US)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="CA">Canada (CA)</option>
                <option value="AU">Australia (AU)</option>
                <option value="DE">Germany (DE)</option>
                <option value="FR">France (FR)</option>
                <option value="JP">Japan (JP)</option>
                <option value="IN">India (IN)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#657283] uppercase mb-1">
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="w-full bg-[#070B10] border border-[#1C2735] rounded-md px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="7d">Recent 7 Days</option>
                <option value="30d">Recent 30 Days</option>
                <option value="90d">Recent 90 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#657283] uppercase mb-1">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as any)}
                className="w-full bg-[#070B10] border border-[#1C2735] rounded-md px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="shorts">Short-Form (&lt; 60s)</option>
                <option value="long">Long-Form (&gt; 60s)</option>
                <option value="all">All Formats</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#657283] uppercase mb-1">
                Min. Available Views
              </label>
              <select
                value={minViews}
                onChange={(e) => setMinViews(Number(e.target.value))}
                className="w-full bg-[#070B10] border border-[#1C2735] rounded-md px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="0">Any view count</option>
                <option value="10000">10,000+ views</option>
                <option value="50000">50,000+ views</option>
                <option value="100000">100,000+ views</option>
                <option value="500000">500,000+ views</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Niche Opportunity Analysis Card */}
      {opportunityAnalysis && (
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 space-y-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#1C2735] gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 uppercase tracking-widest">
                  Intelligence Report
                </span>
                <span className="text-xs text-[#79838E]">
                  Source: {opportunityAnalysis.dataSource}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                Niche Opportunity: "{opportunityAnalysis.niche}"
              </h3>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-[10px] uppercase text-[#79838E] font-semibold">
                  Overall Score
                </div>
                <div className="text-2xl font-black text-[#00AFFF] font-['Exo_2']">
                  {opportunityAnalysis.scores.overallScore}
                  <span className="text-xs text-[#79838E] font-normal">/100</span>
                </div>
              </div>

              {onProceedToConcepts && (
                <button
                  onClick={onProceedToConcepts}
                  className="px-4 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center space-x-1.5"
                >
                  <span>Generate Concepts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 4 Transparent Heuristic Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-1">
              <span className="text-[10px] font-bold text-[#79838E] uppercase">Audience Demand</span>
              <div className="text-xl font-bold text-white font-['Exo_2']">
                {opportunityAnalysis.scores.audienceDemand}
                <span className="text-xs text-[#55606E]">/100</span>
              </div>
              <div className="w-full bg-[#1C2735] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{ width: `${opportunityAnalysis.scores.audienceDemand}%` }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-1">
              <span className="text-[10px] font-bold text-[#79838E] uppercase">Competition</span>
              <div className="text-xl font-bold text-white font-['Exo_2']">
                {opportunityAnalysis.scores.competition}
                <span className="text-xs text-[#55606E]">/100</span>
              </div>
              <div className="w-full bg-[#1C2735] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${opportunityAnalysis.scores.competition}%` }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-1">
              <span className="text-[10px] font-bold text-[#79838E] uppercase">Creative Originality</span>
              <div className="text-xl font-bold text-white font-['Exo_2']">
                {opportunityAnalysis.scores.creativeOriginalityPotential}
                <span className="text-xs text-[#55606E]">/100</span>
              </div>
              <div className="w-full bg-[#1C2735] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#00AFFF] h-full rounded-full"
                  style={{ width: `${opportunityAnalysis.scores.creativeOriginalityPotential}%` }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-1">
              <span className="text-[10px] font-bold text-[#79838E] uppercase">AI Feasibility</span>
              <div className="text-xl font-bold text-white font-['Exo_2']">
                {opportunityAnalysis.scores.aiProductionFeasibility}
                <span className="text-xs text-[#55606E]">/100</span>
              </div>
              <div className="w-full bg-[#1C2735] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-400 h-full rounded-full"
                  style={{ width: `${opportunityAnalysis.scores.aiProductionFeasibility}%` }}
                />
              </div>
            </div>
          </div>

          {/* Analysis Details Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Opening Hooks */}
            <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-2">
              <h4 className="font-bold text-amber-300 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>High-Retention Opening Hooks</span>
              </h4>
              <ul className="space-y-1.5 text-[#C5D0DE]">
                {(opportunityAnalysis.strongOpeningHooks || []).map((hook, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
                    <span className="italic">"{hook}"</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Underserved Gaps */}
            <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-2">
              <h4 className="font-bold text-emerald-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Underserved Subtopics & Gaps</span>
              </h4>
              <ul className="space-y-1.5 text-[#C5D0DE]">
                {(opportunityAnalysis.possibleUnderservedSubtopics || []).map((sub, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-emerald-400 shrink-0">•</span>
                    <span>{sub}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Storytelling Opportunities */}
            <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-2">
              <h4 className="font-bold text-[#00AFFF] flex items-center space-x-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>AI Video Creation Opportunities</span>
              </h4>
              <ul className="space-y-1.5 text-[#C5D0DE]">
                {(opportunityAnalysis.opportunitiesForAiStorytelling || []).map((opp, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-[#00AFFF] shrink-0">▸</span>
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Saturation Warnings */}
            <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] space-y-2">
              <h4 className="font-bold text-rose-300 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Saturation Warnings (What Is Overdone)</span>
              </h4>
              <ul className="space-y-1.5 text-[#C5D0DE]">
                {(opportunityAnalysis.topicSaturationSignals || []).map((sat, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-rose-400 shrink-0">✕</span>
                    <span>{sat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Retrieved Research Videos Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Youtube className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Retrieved Research Videos ({searchResults.length})
            </h3>
          </div>
          <span className="text-[11px] text-[#79838E]">
            {searchResults.length === 0
              ? connected
                ? 'Run a search to fetch videos'
                : 'Connect YouTube Data API key on server to retrieve live metrics'
              : 'Sorted by available view metrics'}
          </span>
        </div>

        {searchResults.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0B1017] border border-[#1C2735] text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#111822] text-[#79838E] flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">No Research Videos Retrieved Yet</h4>
              <p className="text-[11px] text-[#79838E] max-w-md mx-auto">
                {connected
                  ? 'Enter a topic or niche keyword above and click Search Videos to retrieve top-performing content.'
                  : 'The YouTube Data API is currently not connected on this server. You can still use Mode A Niche Discovery and AI Opportunity Analysis to plan your video concept.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.map((video) => (
              <div
                key={video.id}
                className="bg-[#0B1017] border border-[#1C2735] hover:border-[#2A3B4F] rounded-xl overflow-hidden transition-all flex flex-col justify-between"
              >
                <div>
                  {video.thumbnailUrl && (
                    <div className="aspect-video bg-[#070B10] relative overflow-hidden">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono">
                        {video.duration || 'Video'}
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 space-y-2">
                    <h4 className="text-xs font-bold text-white line-clamp-2">
                      {video.title}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-[#79838E]">
                      <span className="truncate max-w-[150px]">{video.channelTitle}</span>
                      <span className="text-[#00AFFF] font-semibold">
                        {video.viewCount.toLocaleString()} views
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#070B10] border-t border-[#1C2735] flex items-center justify-between text-[11px]">
                  <span className="text-[#55606E]">
                    {new Date(video.publishedAt).toLocaleDateString()}
                  </span>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-[#00AFFF] hover:underline"
                  >
                    <span>View on YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
