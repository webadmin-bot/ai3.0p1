import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Image as ImageIcon,
  Download,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ExternalLink,
  Layers,
  Eye,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiGenerateImagePreview } from '../../services/api';
import { VisualAsset } from '../../types/filmStudio';

export const VisualPreviewTab: React.FC = () => {
  const { project, attachReferenceImageToAsset } = useProject();

  const assets: VisualAsset[] = project.stage2?.assets || [];
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('9:16');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedPack, setCopiedPack] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  const getFullPromptText = (asset?: VisualAsset) => {
    const target = asset || selectedAsset;
    if (!target) return customPrompt;

    const basePrompt = target.referencePrompt || '';
    const styleAddon = project.visualStyle ? `, ${project.visualStyle.name} visual aesthetic, ${project.visualStyle.medium}` : '';
    const arFlag = project.settings.aspectRatio === '9:16' ? ' --ar 9:16' : ' --ar 16:9';
    return `${basePrompt}${styleAddon} --v 6.1${arFlag}`;
  };

  const handleCopyPrompt = () => {
    const text = customPrompt || getFullPromptText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAllPromptsPack = () => {
    const pack = assets.map((a, i) => {
      return `### ASSET ${i + 1}: [${a.id}] ${a.name} (${a.type})\n${getFullPromptText(a)}\n`;
    }).join('\n---\n\n');

    navigator.clipboard.writeText(pack);
    setCopiedPack(true);
    setTimeout(() => setCopiedPack(false), 2000);
  };

  const handleGeneratePreview = async () => {
    const promptToTest = customPrompt || getFullPromptText();
    if (!promptToTest.trim()) return;

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await apiGenerateImagePreview(promptToTest, aspectRatio);
      if (res.success && res.imageDataUrl) {
        setPreviewImage(res.imageDataUrl);
        // Optionally attach to asset
        if (selectedAsset && attachReferenceImageToAsset) {
          attachReferenceImageToAsset(selectedAsset.id, res.imageDataUrl, `${selectedAsset.id}-preview.png`);
        }
      } else {
        setErrorMsg(res.error || 'Failed to generate visual preview');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate visual preview via Gemini');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30 uppercase tracking-widest">
              Visual Testing & Asset Lab
            </span>
            <span className="text-xs text-[#79838E]">
              Master Style: <strong className="text-white">{project.visualStyle?.name}</strong>
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-['Exo_2'] text-white">
            Visual Consistency & Image Prompt Studio
          </h2>
          <p className="text-xs text-[#8A96A6] max-w-2xl">
            Test and preview prompts directly in-app using Gemini, or copy production-ready prompts formatted for Midjourney v6, Flux, Imagen 3, and Stable Diffusion.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopyAllPromptsPack}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            {copiedPack ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#00AFFF]" />}
            <span>{copiedPack ? 'Copied Prompt Pack!' : 'Copy All Assets Pack'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Studio Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Asset Selection & Prompt Config (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Asset Picker Pills */}
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-3">
            <label className="text-xs font-bold text-[#8A96A6] uppercase tracking-wider block">
              Select Visual Asset ({assets.length})
            </label>

            {assets.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#070B10] border border-[#1C2735] text-center text-xs text-[#79838E]">
                No visual assets generated yet. Visit the Characters or Locations tab to generate asset prompts.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {assets.map((asset) => {
                  const isSelected = asset.id === selectedAssetId;
                  return (
                    <button
                      key={asset.id}
                      onClick={() => {
                        setSelectedAssetId(asset.id);
                        setCustomPrompt('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-[#00AFFF] text-white border-[#00AFFF] shadow-sm'
                          : 'bg-[#070B10] text-[#79838E] border-[#1C2735] hover:border-[#2C3B4E] hover:text-white'
                      }`}
                    >
                      <span className="font-mono text-[10px] opacity-80">{asset.id}</span>
                      <span>{asset.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Prompt Box */}
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Production-Ready Image Prompt
              </span>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-[#79838E]">Aspect Ratio:</span>
                {(['9:16', '16:9', '1:1'] as const).map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      aspectRatio === ar
                        ? 'bg-[#00AFFF] text-white border-[#00AFFF]'
                        : 'bg-[#070B10] text-[#79838E] border-[#1C2735]'
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={6}
              value={customPrompt || getFullPromptText()}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full p-3.5 bg-[#070B10] border border-[#1C2735] focus:border-[#00AFFF] rounded-xl text-white text-xs font-mono leading-relaxed outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={handleCopyPrompt}
                className="px-4 py-2.5 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold cursor-pointer transition-colors shadow-sm flex items-center space-x-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#00AFFF]" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt for Midjourney / Flux'}</span>
              </button>

              <button
                onClick={handleGeneratePreview}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center space-x-2 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Synthesizing Image...' : 'Test Visual Preview'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Preview Canvas (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#00AFFF]" />
                  <span>Visual Reference Canvas</span>
                </span>
                {previewImage && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                    Preview Active
                  </span>
                )}
              </div>

              {/* Preview Window */}
              <div
                className={`w-full rounded-xl bg-[#070B10] border border-[#1C2735] flex items-center justify-center overflow-hidden relative ${
                  aspectRatio === '9:16'
                    ? 'aspect-[9/16] max-h-[460px] mx-auto'
                    : aspectRatio === '16:9'
                    ? 'aspect-video'
                    : 'aspect-square'
                }`}
              >
                {isGenerating ? (
                  <div className="text-center space-y-3 p-6">
                    <div className="w-10 h-10 border-2 border-[#00AFFF] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-white font-semibold">Generating Visual Reference...</p>
                    <p className="text-[11px] text-[#79838E]">Synthesizing character/location aesthetics via Gemini</p>
                  </div>
                ) : previewImage ? (
                  <img
                    src={previewImage}
                    alt="Visual Reference Preview"
                    className="w-full h-full object-cover"
                  />
                ) : selectedAsset?.referenceMedia?.dataUrl || selectedAsset?.optionalReferenceImageData ? (
                  <img
                    src={selectedAsset.referenceMedia?.dataUrl || selectedAsset.optionalReferenceImageData}
                    alt="Verified Asset"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center space-y-2.5 p-6 text-[#79838E]">
                    <ImageIcon className="w-8 h-8 mx-auto text-[#55606E]" />
                    <p className="text-xs font-semibold text-white">No Visual Preview Yet</p>
                    <p className="text-[11px] text-[#79838E] max-w-xs">
                      Click "Test Visual Preview" to generate a sample render, or copy the prompt into Midjourney or Flux.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {previewImage && (
              <div className="pt-3 border-t border-[#1C2735] flex items-center justify-between text-xs text-[#79838E]">
                <span>Attached to {selectedAsset?.name || 'asset'}</span>
                <a
                  href={previewImage}
                  download={`${selectedAsset?.id || 'preview'}.png`}
                  className="text-[#00AFFF] hover:underline flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
