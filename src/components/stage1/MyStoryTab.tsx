import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Save,
  Sparkles,
  ArrowRight,
  Flame,
  AlertCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { apiAnalyzeOwnStory } from '../../services/api';
import { SAMPLE_OWN_STORY } from '../../services/defaultProject';

export const MyStoryTab: React.FC<{ onLaunchCanonBuilder: () => void }> = ({
  onLaunchCanonBuilder,
}) => {
  const {
    project,
    updateOriginalStoryText,
    setStoryAnalysis,
    setActiveTab,
  } = useProject();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotification, setSavedNotification] = useState(false);

  const text = project.originalStoryText || '';

  const wordCount = useMemo(() => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [text]);

  const charCount = text.length;

  const handleSave = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2000);
  };

  const handleAnalyzeStory = async () => {
    if (!text.trim()) {
      setError('Please enter or paste your story text before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await apiAnalyzeOwnStory(
        text,
        project.settings,
        project.visualStyle
      );

      if (res.success && res.analysis) {
        setStoryAnalysis(res.analysis);
        setActiveTab('analysis');
      } else {
        setError(res.error || 'Failed to analyze story.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with Gemini.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadSample = () => {
    updateOriginalStoryText(SAMPLE_OWN_STORY);
    project.title = 'The Quiapo Clockmaker';
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#F4A62A] mb-0.5">
            MODE B • AUTHOR'S ORIGINAL STORY
          </div>
          <h2 className="font-['Exo_2'] font-bold text-xl text-white">
            Write or Paste Your Original Story
          </h2>
          <p className="text-xs text-[#79838E]">
            Your words are saved verbatim. Gemini will never invent major events or change your ending.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] px-3 py-2 rounded-lg transition-colors cursor-pointer"
            title="Load Quiapo Clockmaker sample for Acceptance Test 18"
          >
            Load Sample Story
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="text-xs bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border border-[#1C2735] px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Save Toast */}
      {savedNotification && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 p-2.5 rounded-lg flex items-center space-x-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Story text saved to project snapshot successfully.</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950/60 border border-red-500/40 p-4 rounded-xl text-red-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Freeform Editor */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-[#79838E] border-b border-[#1C2735] pb-2">
          <span className="font-semibold text-[#D7DCE2]">Story Text / Premise / Outline</span>
          <div className="flex items-center space-x-3 font-mono text-[11px]">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{charCount} characters</span>
          </div>
        </div>

        <textarea
          rows={14}
          value={text}
          onChange={(e) => updateOriginalStoryText(e.target.value)}
          placeholder="Paste or write your original story, premise, treatment, or scene outline here...

Tip: You can paste a full prose story, a detailed beat-by-beat outline, or an emotional character study. Stage 1 will faithfully parse your characters, world rules, and conflicts without replacing them with generic AI tropes."
          className="w-full bg-[#111820] border border-[#1C2735] rounded-lg p-4 text-sm text-[#D7DCE2] leading-relaxed placeholder-[#79838E]/40 focus:border-[#00AFFF] focus:outline-none transition-colors font-sans"
        />
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-xs text-[#79838E]">
          Mode B bypasses concept ideation entirely. No concept ID required for approval.
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleAnalyzeStory}
            disabled={isAnalyzing || !text.trim()}
            className="bg-[#1C2735] hover:bg-[#2A3B4F] disabled:opacity-50 text-white font-bold text-xs px-5 py-3 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#00AFFF] ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing Verbatim Text...' : 'Analyze My Story'}</span>
          </button>

          <button
            type="button"
            onClick={onLaunchCanonBuilder}
            disabled={!text.trim()}
            className="bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0099DD] hover:to-blue-700 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-lg shadow-xl shadow-[#00AFFF]/25 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Build Story Canon</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
