import React from 'react';
import {
  Clapperboard,
  ShieldCheck,
  ArrowRight,
  Flame,
  MessageSquare,
  MapPin,
  Box,
  Layers,
  Film,
  AlertCircle,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const ScriptExtractionTab: React.FC<{ onLaunchCanonBuilder: () => void }> = ({
  onLaunchCanonBuilder,
}) => {
  const { project, setActiveTab } = useProject();

  const script = project.importedScript;

  if (!script || script.extractedScenes.length === 0) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-emerald-400 mx-auto" />
        <h3 className="font-['Exo_2'] font-bold text-lg text-white">
          No Screenplay Extraction Yet
        </h3>
        <p className="text-xs text-[#79838E]">
          Please paste or upload your screenplay and run "Analyze Script & Extract Canon" first.
        </p>
        <button
          onClick={() => setActiveTab('myscript')}
          className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer"
        >
          Return to My Script
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
            MODE C • SCREENPLAY EXTRACTION REVIEW
          </div>
          <h2 className="font-['Exo_2'] font-bold text-xl text-white">
            Extracted Screenplay Canon
          </h2>
          <p className="text-xs text-[#79838E]">
            {script.extractedScenes.length} scenes • {script.extractedCharacters.length} speaking roles • {script.extractedDialogueCount} spoken lines preserved verbatim.
          </p>
        </div>

        <button
          onClick={onLaunchCanonBuilder}
          className="bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0099DD] hover:to-blue-700 text-white font-bold text-xs px-6 py-3 rounded-lg shadow-xl shadow-[#00AFFF]/25 flex items-center space-x-2 cursor-pointer"
        >
          <Flame className="w-4 h-4 text-amber-300" />
          <span>Build Story Canon</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Source of Truth Status Banner */}
      <div className="bg-[#111820] border-2 border-emerald-500/50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              Screenplay Source of Truth Verified
            </div>
            <div className="text-[11px] text-[#79838E]">
              Scene sequence and spoken lines will be locked and inherited directly into production.
            </div>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
          {script.sourceName}
        </span>
      </div>

      {/* Characters, Locations & Props Quick Tags */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-2">
          <span className="text-[11px] font-bold text-[#00AFFF] uppercase tracking-wider block">
            Extracted Characters ({script.extractedCharacters.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {script.extractedCharacters.map((c, i) => (
              <span
                key={i}
                className="bg-[#111820] text-white px-2 py-0.5 rounded text-xs border border-[#1C2735]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5" />
            <span>Locations ({script.extractedLocations.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {script.extractedLocations.map((loc, i) => (
              <span
                key={i}
                className="bg-[#111820] text-[#D7DCE2] px-2 py-0.5 rounded text-xs border border-[#1C2735]"
              >
                {loc}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            <Box className="w-3.5 h-3.5" />
            <span>Key Props ({script.extractedProps.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {script.extractedProps.map((p, i) => (
              <span
                key={i}
                className="bg-[#111820] text-[#D7DCE2] px-2 py-0.5 rounded text-xs border border-[#1C2735]"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Extracted Scenes & Verbatim Dialogue Cards */}
      <div className="space-y-4">
        <h3 className="font-['Exo_2'] font-bold text-base text-white">
          Extracted Scenes & Verbatim Dialogue Lines
        </h3>

        <div className="space-y-4">
          {script.extractedScenes.map((scene) => (
            <div
              key={scene.sceneNumber}
              className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3"
            >
              {/* Slugline */}
              <div className="flex items-center justify-between border-b border-[#1C2735] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold bg-[#141C26] text-[#00AFFF] px-2 py-0.5 rounded border border-[#1C2735]">
                    SCENE {scene.sceneNumber}
                  </span>
                  <span className="font-mono text-xs font-bold text-white tracking-wide">
                    {scene.slugline}
                  </span>
                </div>
                <span className="text-[10px] text-[#79838E] truncate max-w-[200px]">
                  {scene.location}
                </span>
              </div>

              {/* Summary */}
              <p className="text-xs text-[#D7DCE2] leading-relaxed">
                {scene.summary}
              </p>

              {/* Characters in Scene */}
              <div className="flex items-center space-x-2 text-[11px] text-[#79838E]">
                <span className="font-semibold text-[#D7DCE2]">Present:</span>
                <span>{scene.characters.join(', ')}</span>
              </div>

              {/* Verbatim Dialogue Lines */}
              {scene.dialogueLines && scene.dialogueLines.length > 0 && (
                <div className="bg-[#111820] rounded-lg p-3 space-y-2 border border-[#1C2735]/60 mt-2">
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-[#00AFFF] uppercase tracking-wider">
                    <MessageSquare className="w-3 h-3" />
                    <span>Verbatim Dialogue Lines</span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {scene.dialogueLines.map((line, lIdx) => (
                      <div key={lIdx} className="space-y-0.5">
                        <div className="text-[#00AFFF] font-bold text-[11px]">
                          {line.speaker}
                          {line.parenthetical && (
                            <span className="text-[#79838E] font-normal italic ml-1">
                              ({line.parenthetical})
                            </span>
                          )}
                        </div>
                        <p className="text-[#D7DCE2] pl-3 border-l-2 border-[#1C2735]">
                          "{line.line}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Launch Button */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={onLaunchCanonBuilder}
          className="bg-gradient-to-r from-[#00AFFF] to-blue-600 hover:from-[#0099DD] hover:to-blue-700 text-white font-bold text-xs px-8 py-3.5 rounded-lg shadow-xl shadow-[#00AFFF]/25 flex items-center space-x-2 cursor-pointer"
        >
          <Flame className="w-4 h-4 text-amber-300" />
          <span>Build Story Canon from Extracted Script</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
