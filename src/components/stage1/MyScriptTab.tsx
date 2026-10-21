import React, { useState, useRef } from 'react';
import {
  Clapperboard,
  Upload,
  FileText,
  Save,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiAnalyzeScript } from '../../services/api';
import { SAMPLE_OWN_SCRIPT } from '../../services/defaultProject';

export const MyScriptTab: React.FC<{ onLaunchCanonBuilder: () => void }> = ({
  onLaunchCanonBuilder,
}) => {
  const {
    project,
    updateImportedScript,
    setActiveTab,
  } = useProject();

  const [scriptText, setScriptText] = useState(
    project.importedScript?.originalText || ''
  );
  const [sourceName, setSourceName] = useState(
    project.importedScript?.sourceName || 'pasted-screenplay.txt'
  );
  const [sourceType, setSourceType] = useState<'PASTE' | 'FILE_TXT' | 'FILE_MD'>(
    project.importedScript?.sourceType || 'PASTE'
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase();

    if (ext !== 'txt' && ext !== 'md' && ext !== 'fountain') {
      setError(
        `File format ".${ext}" is not supported. Please import a plaintext (.txt), Markdown (.md), or Fountain (.fountain) screenplay file.`
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setScriptText(content);
      setSourceName(name);
      setSourceType(ext === 'md' ? 'FILE_MD' : 'FILE_TXT');
      setError(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveDraft = () => {
    if (!scriptText.trim()) return;
    updateImportedScript({
      originalText: scriptText,
      sourceName,
      sourceType,
      importedAt: new Date().toISOString(),
      version: 1,
      extractedScenes: project.importedScript?.extractedScenes || [],
      extractedCharacters: project.importedScript?.extractedCharacters || [],
      extractedDialogueCount: project.importedScript?.extractedDialogueCount || 0,
      extractedLocations: project.importedScript?.extractedLocations || [],
      extractedProps: project.importedScript?.extractedProps || [],
      storyRules: project.importedScript?.storyRules || [],
      secrets: project.importedScript?.secrets || [],
      openThreads: project.importedScript?.openThreads || [],
      isSourceOfTruth: true,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleAnalyzeScript = async () => {
    if (!scriptText.trim()) {
      setError('Please paste or upload a screenplay before extracting canon.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await apiAnalyzeScript(
        scriptText,
        sourceName,
        sourceType,
        project.settings
      );

      if (res.success && res.extractedScript) {
        updateImportedScript(res.extractedScript);
        setActiveTab('extraction');
      } else {
        setError(res.error || 'Failed to extract script canon.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with Gemini.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadSample = () => {
    setScriptText(SAMPLE_OWN_SCRIPT);
    setSourceName('seawall-protocol.fountain');
    setSourceType('PASTE');
    project.title = 'Seawall Protocol';
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
            MODE C • SCREENPLAY IMPORT (SOURCE OF TRUTH)
          </div>
          <h2 className="font-['Exo_2'] font-bold text-xl text-white">
            Import Existing Screenplay
          </h2>
          <p className="text-xs text-[#79838E]">
            Preserves scene order and spoken dialogue verbatim. Your script is the authoritative production blueprint.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] px-3 py-2 rounded-lg transition-colors cursor-pointer"
            title="Load Seawall Protocol 2-scene script for Acceptance Test 18"
          >
            Load Sample 2-Scene Script
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Upload .TXT / .MD</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.fountain"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            type="button"
            onClick={handleSaveDraft}
            className="text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Save Toast */}
      {saveSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 p-2.5 rounded-lg flex items-center space-x-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Screenplay draft saved to project snapshot successfully.</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950/60 border border-red-500/40 p-4 rounded-xl text-red-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Script Source of Truth Badge */}
      <div className="bg-[#111820] border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="font-semibold text-white">SCRIPT SOURCE OF TRUTH: </span>
            <span className="text-[#79838E]">
              Stage 3 will skip generating a replacement script and focus on shot planning.
            </span>
          </div>
        </div>
        <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold border border-emerald-500/30">
          {sourceName}
        </span>
      </div>

      {/* Screenplay Text Area */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-[#79838E] border-b border-[#1C2735] pb-2">
          <span className="font-semibold text-[#D7DCE2]">Screenplay Fountain / Standard Format</span>
          <span className="font-mono text-[11px]">{scriptText.length} characters</span>
        </div>

        <textarea
          rows={16}
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          placeholder={`SCENE 1: INT. COFFEE SHOP - DAY
Rain lashes against the window. MARC (30s) grips a cold ceramic mug.

MARC
(whispering)
They already know we have the flash drive.

SARAH (20s) enters, shaking water from her coat.

SARAH
Then we leave now.`}
          className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-4 text-xs text-[#D7DCE2] leading-relaxed placeholder-[#79838E]/40 focus:border-[#00AFFF] focus:outline-none transition-colors font-mono"
        />
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-xs text-[#79838E]">
          Extraction preserves spoken dialogue lines verbatim without rewriting or summarizing dialogue.
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleAnalyzeScript}
            disabled={isAnalyzing || !scriptText.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-lg shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Extracting Verbatim Canon...' : 'Analyze Script & Extract Canon'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
