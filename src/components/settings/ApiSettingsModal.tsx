import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Sparkles,
  Youtube,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ExternalLink,
  Lock,
  Zap,
  Info,
  Server,
  Key,
} from 'lucide-react';
import {
  apiGetSettingsIntegrations,
  apiTestYouTubeConnection,
  apiTestGeminiText,
  apiTestGeminiImage,
  SettingsIntegrationsResponse,
} from '../../services/api';
import { useProject } from '../../context/ProjectContext';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const { project, updateSettings } = useProject();

  const [activeTab, setActiveTab] = useState<'integrations' | 'youtube' | 'gemini' | 'preferences' | 'security'>('integrations');
  const [integrations, setIntegrations] = useState<SettingsIntegrationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Testing states
  const [testingYoutube, setTestingYoutube] = useState(false);
  const [youtubeTestResult, setYoutubeTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message?: string;
    itemsCount?: number;
    error?: string;
  } | null>(null);

  const [testingGeminiText, setTestingGeminiText] = useState(false);
  const [geminiTextResult, setGeminiTextResult] = useState<{
    success: boolean;
    latencyMs?: number;
    model?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const [testingGeminiImage, setTestingGeminiImage] = useState(false);
  const [geminiImageResult, setGeminiImageResult] = useState<{
    success: boolean;
    latencyMs?: number;
    model?: string;
    message?: string;
    error?: string;
    isQuotaOrBillingError?: boolean;
    diagnostic?: string;
  } | null>(null);

  // User image preferences (stored in project/local state)
  const [preferredModel, setPreferredModel] = useState<string>(
    (project as any).imagePreferences?.preferredModel || 'gemini-3.1-flash-lite-image'
  );
  const [preferredResolution, setPreferredResolution] = useState<string>(
    (project as any).imagePreferences?.resolution || 'Default'
  );
  const [preferredWorkflowMode, setPreferredWorkflowMode] = useState<'FREE_MANUAL' | 'DIRECT_API'>(
    (project as any).imagePreferences?.workflowMode || 'FREE_MANUAL'
  );

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const data = await apiGetSettingsIntegrations();
      if (data && data.success) {
        setIntegrations(data);
      }
    } catch (err) {
      console.error('Failed to fetch integrations status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestYoutube = async () => {
    setTestingYoutube(true);
    setYoutubeTestResult(null);
    try {
      const res = await apiTestYouTubeConnection();
      setYoutubeTestResult(res);
    } catch (err: any) {
      setYoutubeTestResult({ success: false, error: err.message || 'Connection test failed' });
    } finally {
      setTestingYoutube(false);
    }
  };

  const handleTestGeminiText = async () => {
    setTestingGeminiText(true);
    setGeminiTextResult(null);
    try {
      const res = await apiTestGeminiText();
      setGeminiTextResult(res);
    } catch (err: any) {
      setGeminiTextResult({ success: false, error: err.message || 'Text generation test failed' });
    } finally {
      setTestingGeminiText(false);
    }
  };

  const handleTestGeminiImage = async () => {
    setTestingGeminiImage(true);
    setGeminiImageResult(null);
    try {
      const res = await apiTestGeminiImage({ model: preferredModel });
      setGeminiImageResult(res);
      if (res.success) {
        setPreferredWorkflowMode('DIRECT_API');
      } else if (res.isQuotaOrBillingError) {
        setPreferredWorkflowMode('FREE_MANUAL');
      }
    } catch (err: any) {
      setGeminiImageResult({
        success: false,
        error: err.message || 'Image generation test failed',
        isQuotaOrBillingError: true,
      });
    } finally {
      setTestingGeminiImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-[#0E141D] border-b border-[#1C2735] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00AFFF] to-[#005580] flex items-center justify-center text-white shadow-md shadow-[#00AFFF]/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-['Exo_2'] font-bold text-lg text-white">
                  API Integrations & Engine Settings
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141C26] text-[#00AFFF] border border-[#1C2735]">
                  STUDIO 3.0
                </span>
              </div>
              <p className="text-xs text-[#79838E]">
                Centralized management for YouTube Data API v3, Gemini AI models, and image generation workflows
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#79838E] hover:text-white rounded-lg hover:bg-[#1C2735] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-5 pt-3 bg-[#0B1017] border-b border-[#1C2735] overflow-x-auto">
          {[
            { id: 'integrations', label: 'All Integrations', icon: Server },
            { id: 'youtube', label: 'YouTube Data API', icon: Youtube },
            { id: 'gemini', label: 'Gemini AI Studio', icon: Sparkles },
            { id: 'preferences', label: 'Image Preferences', icon: Sliders },
            { id: 'security', label: 'Security & Keys', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[#00AFFF] text-white bg-[#111820]'
                    : 'border-transparent text-[#79838E] hover:text-[#D7DCE2] hover:bg-[#111820]/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00AFFF]' : 'text-[#79838E]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'integrations' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* YouTube Card */}
                <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-red-950/60 text-red-400 border border-red-500/30">
                        <Youtube className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">YouTube Data API v3</div>
                        <div className="text-[11px] text-[#79838E]">Market trends & video research engine</div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        integrations?.youtube?.configured
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {integrations?.youtube?.configured ? 'CONNECTED' : 'OFFLINE'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#A0AEC0] leading-relaxed">
                    Powers Phase 1 Niche Research (Mode A & B) with live video metrics, audience demand scores, and title hooks.
                  </p>

                  <div className="pt-2 border-t border-[#1C2735] flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#79838E]">
                      Key: {integrations?.youtube?.maskedKey || 'Not configured'}
                    </span>
                    <button
                      onClick={() => setActiveTab('youtube')}
                      className="text-[#00AFFF] hover:underline font-semibold text-[11px] cursor-pointer"
                    >
                      Configure & Test →
                    </button>
                  </div>
                </div>

                {/* Gemini Card */}
                <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Google Gemini AI Engine</div>
                        <div className="text-[11px] text-[#79838E]">Text, Screenplay & Image Intelligence</div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        integrations?.gemini?.configured
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {integrations?.gemini?.configured ? 'CONNECTED' : 'OFFLINE'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#A0AEC0] leading-relaxed">
                    Powers Creative Concepts, Screenplay Scene breakdown, Shot Planning, Style Bible generation, and Direct Image Generation.
                  </p>

                  <div className="pt-2 border-t border-[#1C2735] flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#79838E]">
                      Key: {integrations?.gemini?.maskedKey || 'Not configured'}
                    </span>
                    <button
                      onClick={() => setActiveTab('gemini')}
                      className="text-[#00AFFF] hover:underline font-semibold text-[11px] cursor-pointer"
                    >
                      Configure & Test →
                    </button>
                  </div>
                </div>
              </div>

              {/* Workflow Modes Summary */}
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-[#00AFFF]" />
                  <span className="font-bold text-white">Active Image Workflow Mode</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className={`p-3 rounded-lg border transition-all ${preferredWorkflowMode === 'FREE_MANUAL' ? 'bg-[#141F2E] border-[#00AFFF]' : 'bg-[#0B1017] border-[#1C2735]'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">MODE A: Free Manual Workflow</span>
                      {preferredWorkflowMode === 'FREE_MANUAL' && <CheckCircle2 className="w-3.5 h-3.5 text-[#00AFFF]" />}
                    </div>
                    <p className="text-[11px] text-[#79838E] mt-1">
                      Always available without paid API keys. Generate precision prompts, copy for external tools (Midjourney, Flux, etc.), and upload approved media back.
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border transition-all ${preferredWorkflowMode === 'DIRECT_API' ? 'bg-[#141F2E] border-[#00AFFF]' : 'bg-[#0B1017] border-[#1C2735]'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">MODE B: Direct API Generation</span>
                      {preferredWorkflowMode === 'DIRECT_API' && <CheckCircle2 className="w-3.5 h-3.5 text-[#00AFFF]" />}
                    </div>
                    <p className="text-[11px] text-[#79838E] mt-1">
                      Direct in-app image preview and turnaround generation via Gemini image-capable models with quota and billing diagnostics.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: YOUTUBE API */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">YouTube Data API v3 Configuration</h3>
                    <p className="text-[#79838E] text-[11px]">
                      Used by Niche Discovery and YouTube Research in Phase 1
                    </p>
                  </div>
                  <button
                    onClick={handleTestYoutube}
                    disabled={testingYoutube}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingYoutube ? 'animate-spin' : ''}`} />
                    <span>{testingYoutube ? 'Testing Connection...' : 'Test Connection'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#0B1017] p-3 rounded border border-[#1C2735]">
                    <span className="text-[#79838E] block text-[10px] uppercase font-mono">Status</span>
                    <span className="font-bold text-white mt-0.5 block">
                      {integrations?.youtube?.configured ? 'Active & Configured' : 'Offline / Missing Key'}
                    </span>
                  </div>
                  <div className="bg-[#0B1017] p-3 rounded border border-[#1C2735]">
                    <span className="text-[#79838E] block text-[10px] uppercase font-mono">Masked Key</span>
                    <span className="font-mono text-white mt-0.5 block">
                      {integrations?.youtube?.maskedKey || 'YOUTUBE_API_KEY environment variable not set'}
                    </span>
                  </div>
                </div>

                {/* Test Result Display */}
                {youtubeTestResult && (
                  <div
                    className={`p-3.5 rounded-lg border text-xs flex items-start space-x-2.5 ${
                      youtubeTestResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-red-950/40 border-red-500/40 text-red-300'
                    }`}
                  >
                    {youtubeTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {youtubeTestResult.success ? 'YouTube Connection Verified' : 'Connection Error'}
                        {youtubeTestResult.latencyMs && (
                          <span className="ml-2 font-mono text-[10px] opacity-75">
                            ({youtubeTestResult.latencyMs}ms)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {youtubeTestResult.message || youtubeTestResult.error}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-2">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-[#00AFFF]" />
                  <span>Setup Instructions</span>
                </span>
                <p className="text-[11px] text-[#79838E] leading-relaxed">
                  To supply or update your official YouTube API key, configure the <code className="text-[#00AFFF] bg-[#141C26] px-1 py-0.5 rounded">YOUTUBE_API_KEY</code> variable in your hosting server environment (e.g. Cloud Run, Docker, or <code className="text-white">.env</code>). The server protects credentials and never returns them to client browsers.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: GEMINI AI */}
          {activeTab === 'gemini' && (
            <div className="space-y-4">
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">Google Gemini AI Studio Integration</h3>
                    <p className="text-[#79838E] text-[11px]">
                      Single credential supports both text synthesis and direct image preview requests
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleTestGeminiText}
                      disabled={testingGeminiText}
                      className="px-3 py-1.5 rounded-lg bg-[#141C26] hover:bg-[#1C2735] text-white border border-[#1C2735] text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 text-[#00AFFF] ${testingGeminiText ? 'animate-spin' : ''}`} />
                      <span>{testingGeminiText ? 'Testing Text...' : 'Test Text'}</span>
                    </button>

                    <button
                      onClick={handleTestGeminiImage}
                      disabled={testingGeminiImage}
                      className="px-3 py-1.5 rounded-lg bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 text-white ${testingGeminiImage ? 'animate-spin' : ''}`} />
                      <span>{testingGeminiImage ? 'Testing Image...' : 'Test Image Generation'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#0B1017] p-3 rounded border border-[#1C2735]">
                    <span className="text-[#79838E] block text-[10px] uppercase font-mono">Configured Key</span>
                    <span className="font-mono text-white mt-0.5 block">
                      {integrations?.gemini?.maskedKey || 'GEMINI_API_KEY environment variable not configured'}
                    </span>
                  </div>
                  <div className="bg-[#0B1017] p-3 rounded border border-[#1C2735]">
                    <span className="text-[#79838E] block text-[10px] uppercase font-mono">Primary Text Model</span>
                    <span className="font-mono text-emerald-400 mt-0.5 block">
                      {integrations?.gemini?.textModel || 'gemini-3.8-flash'}
                    </span>
                  </div>
                </div>

                {/* Gemini Text Test Result */}
                {geminiTextResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 ${
                      geminiTextResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-red-950/40 border-red-500/40 text-red-300'
                    }`}
                  >
                    {geminiTextResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {geminiTextResult.success ? 'Text Generation Active' : 'Text Generation Error'}
                        {geminiTextResult.latencyMs && (
                          <span className="ml-2 font-mono text-[10px] opacity-75">
                            ({geminiTextResult.latencyMs}ms)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {geminiTextResult.message || geminiTextResult.error}
                      </div>
                    </div>
                  </div>
                )}

                {/* Gemini Image Test Result */}
                {geminiImageResult && (
                  <div
                    className={`p-3.5 rounded-lg border text-xs flex items-start space-x-2.5 ${
                      geminiImageResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    {geminiImageResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {geminiImageResult.success ? 'Direct Image Generation Verified' : 'Image Generation Notice'}
                        {geminiImageResult.latencyMs && (
                          <span className="ml-2 font-mono text-[10px] opacity-75">
                            ({geminiImageResult.latencyMs}ms)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {geminiImageResult.message || geminiImageResult.diagnostic || geminiImageResult.error}
                      </div>
                      {!geminiImageResult.success && geminiImageResult.isQuotaOrBillingError && (
                        <div className="mt-2 text-[10px] text-amber-300 font-mono bg-amber-950/60 p-2 rounded border border-amber-500/30">
                          Mode A (Free Manual Workflow) remains 100% active. You can copy the generated prompts for external tools and upload images back.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: IMAGE PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-sm">Image Generation Engine & Model Selection</h3>
                  <p className="text-[#79838E] text-[11px]">
                    Select the target model for in-app previews and storyboard frame renders
                  </p>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <label className="text-white font-semibold block text-xs">Preferred Image Model</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'gemini-3.1-flash-lite-image',
                        name: 'Gemini 3.1 Flash Lite Image',
                        desc: 'Fast, lightweight preview generation (1:1, 9:16, 16:9)',
                        badge: 'Recommended',
                      },
                      {
                        id: 'gemini-nano-banana-2.1',
                        name: 'Nano Banana 2.1',
                        desc: 'High-quality image generation with 1K, 2K, 4K resolution support',
                        badge: 'Paid Tier',
                      },
                      {
                        id: 'gemini-3-pro-image',
                        name: 'Gemini 3 Pro Image',
                        desc: 'High-fidelity cinematic framing & complex composition',
                        badge: 'Pro Tier',
                      },
                    ].map((m) => {
                      const isSelected = preferredModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPreferredModel(m.id)}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#141F2E] border-[#00AFFF] text-white'
                              : 'bg-[#0B1017] border-[#1C2735] text-[#79838E] hover:border-[#243346]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">{m.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-[#141C26] text-[#00AFFF]">
                              {m.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#79838E] mt-1.5 leading-snug">{m.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Default Aspect Ratio */}
                <div className="space-y-2 pt-2 border-t border-[#1C2735]">
                  <label className="text-white font-semibold block text-xs">Default Film Aspect Ratio</label>
                  <div className="flex items-center space-x-3">
                    {[
                      { id: '9:16', label: '9:16 Vertical (Shorts/Reels)' },
                      { id: '16:9', label: '16:9 Cinematic Widescreen' },
                      { id: '1:1', label: '1:1 Square Reference' },
                    ].map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => updateSettings({ aspectRatio: ar.id as any })}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                          project.settings.aspectRatio === ar.id
                            ? 'bg-[#00AFFF] text-white border-[#00AFFF]'
                            : 'bg-[#0B1017] text-[#79838E] border-[#1C2735] hover:text-white'
                        }`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-white">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm">Security & Secret Management Architecture</span>
                </div>

                <p className="text-[11px] text-[#A0AEC0] leading-relaxed">
                  In compliance with Google AI Studio security standards:
                </p>

                <ul className="space-y-2 text-[11px] text-[#79838E] list-disc pl-5">
                  <li>
                    <strong className="text-white">Zero Client Exposure:</strong> API credentials are never bundled into client JavaScript, stored in localStorage, or committed to project export files.
                  </li>
                  <li>
                    <strong className="text-white">Protected Server Proxy:</strong> All requests to Gemini and YouTube pass through internal Express server routes (<code className="text-[#00AFFF]">/api/*</code>).
                  </li>
                  <li>
                    <strong className="text-white">Server Environment Keys:</strong> Secrets are configured as protected environment variables (<code className="text-white">GEMINI_API_KEY</code> and <code className="text-white">YOUTUBE_API_KEY</code>).
                  </li>
                  <li>
                    <strong className="text-white">Masked Key Displays:</strong> The UI only shows truncated prefix/suffix previews for identity verification and never logs full API keys.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0E141D] border-t border-[#1C2735] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[11px] text-[#79838E]">
            <Info className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span>Settings apply across all projects in the studio.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold cursor-pointer transition-colors"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
