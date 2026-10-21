import React, { useState } from 'react';
import { Sliders, X, Check, Clock, Sparkles, Layers, Info } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ScriptSettings, ShotDuration } from '../../types/filmStudio';

interface ScriptSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScriptSettingsModal: React.FC<ScriptSettingsModalProps> = ({ isOpen, onClose }) => {
  const { project, updateScriptSettings } = useProject();

  const currentSettings: ScriptSettings = project.stage3.settings || {
    pacing: 'BALANCED',
    dialogueDensity: 'MEDIUM',
    allowNarration: false,
    maxShotDuration: 10,
    flowRoutePreference: 'AUTO',
    activeEpisodeId: null,
  };

  const [form, setForm] = useState<ScriptSettings>(currentSettings);

  if (!isOpen) return null;

  const handleSave = () => {
    updateScriptSettings(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Exo_2'] font-bold text-lg text-white">
                Script & Shot Planner Settings
              </h2>
              <p className="text-xs text-[#79838E]">
                Configure pacing, dialogue density, shot duration limits, and Google Flow preferences.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#79838E] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-xs">
          {/* Inherited Visual Style (Read-Only) */}
          <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-[#79838E] font-semibold">
                Master Visual Style (Inherited from Stage 1)
              </span>
              <span className="text-[10px] font-mono text-[#00AFFF] bg-[#00AFFF]/10 px-2 py-0.5 rounded">
                READ-ONLY MASTER
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {project.visualStyle.name}
            </div>
            <div className="text-[11px] text-[#79838E]">
              {project.visualStyle.medium} • {project.visualStyle.realismLevel}
            </div>
          </div>

          {/* Episode Target Selector (If project is episodic) */}
          {(project.settings.format === 'Episodic Short Drama' || project.settings.format === 'Episodic Long-Form Series') &&
            project.storyCanon?.episodicRoadmap &&
            project.storyCanon.episodicRoadmap.length > 0 && (
              <div className="space-y-2 bg-[#111820] border border-[#00AFFF]/40 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-white flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#00AFFF]" />
                    <span>Active Production Episode</span>
                  </label>
                  <span className="text-[10px] font-mono text-[#00AFFF] bg-[#00AFFF]/10 px-2 py-0.5 rounded">
                    EPISODE-BY-EPISODE
                  </span>
                </div>
                <p className="text-[11px] text-[#79838E]">
                  Select the specific episode to write and decompose into 6s/8s/10s shots. Reusable canon characters and assets are preserved across all episodes.
                </p>
                <select
                  value={form.activeEpisodeNumber || project.settings.selectedEpisodeNumber || 1}
                  onChange={(e) => {
                    const epNum = Number(e.target.value) || 1;
                    const ep = project.storyCanon?.episodicRoadmap?.find((r) => r.episodeNumber === epNum);
                    setForm({
                      ...form,
                      activeEpisodeNumber: epNum,
                      activeEpisodeId: ep ? `EP-${epNum}` : null,
                    });
                  }}
                  className="w-full bg-[#0B1017] border border-[#1C2735] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00AFFF] focus:outline-none"
                >
                  {project.storyCanon.episodicRoadmap.map((ep) => (
                    <option key={ep.episodeNumber} value={ep.episodeNumber}>
                      Episode {ep.episodeNumber}: {ep.title} (~{ep.targetRuntimeSeconds || project.settings.targetRuntimeSeconds}s)
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* Maximum Shot Duration Constraint (6, 8, 10s) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00AFFF]" />
                <span>Maximum Allowed Shot Duration</span>
              </label>
              <span className="text-[10px] text-[#79838E]">Strict 6s / 8s / 10s standard</span>
            </div>
            <p className="text-[11px] text-[#79838E]">
              Per-shot planning constraint. Scenes longer than this are automatically partitioned into multiple shots.
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {([6, 8, 10] as ShotDuration[]).map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setForm({ ...form, maxShotDuration: dur })}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    form.maxShotDuration === dur
                      ? 'bg-[#00AFFF]/15 border-[#00AFFF] text-white font-bold shadow-md shadow-[#00AFFF]/10'
                      : 'bg-[#111820] border-[#1C2735] text-[#79838E] hover:text-[#D7DCE2]'
                  }`}
                >
                  <div className="text-base font-mono">{dur}s Max</div>
                  <div className="text-[10px] mt-0.5">
                    {dur === 10 ? 'Standard (6, 8, 10s)' : dur === 8 ? 'Snappy (6, 8s only)' : 'Ultra-Rapid (6s only)'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pacing */}
          <div className="space-y-2">
            <label className="font-semibold text-white block">Pacing Directive</label>
            <div className="grid grid-cols-4 gap-2">
              {(['AUTO', 'FAST', 'BALANCED', 'SLOW'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, pacing: p })}
                  className={`py-2 px-2 rounded-lg border text-center text-xs font-medium transition-colors cursor-pointer ${
                    form.pacing === p
                      ? 'bg-[#00AFFF]/15 border-[#00AFFF] text-white'
                      : 'bg-[#111820] border-[#1C2735] text-[#79838E] hover:text-[#D7DCE2]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Dialogue Density */}
          <div className="space-y-2">
            <label className="font-semibold text-white block">Dialogue Density</label>
            <div className="grid grid-cols-4 gap-2">
              {(['AUTO', 'LIGHT', 'MEDIUM', 'DIALOGUE_LED'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, dialogueDensity: d })}
                  className={`py-2 px-2 rounded-lg border text-center text-xs font-medium transition-colors cursor-pointer ${
                    form.dialogueDensity === d
                      ? 'bg-[#00AFFF]/15 border-[#00AFFF] text-white'
                      : 'bg-[#111820] border-[#1C2735] text-[#79838E] hover:text-[#D7DCE2]'
                  }`}
                >
                  {d.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Flow Route Preference */}
          <div className="space-y-2">
            <label className="font-semibold text-white block">Google Flow Route Preference</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'AUTO', label: 'AUTO (Heuristic)' },
                  { id: 'PREFER_INGREDIENTS', label: 'PREFER INGREDIENTS' },
                  { id: 'PREFER_FRAMES', label: 'PREFER FRAMES' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setForm({ ...form, flowRoutePreference: opt.id })}
                  className={`py-2 px-2 rounded-lg border text-center text-xs font-medium transition-colors cursor-pointer ${
                    form.flowRoutePreference === opt.id
                      ? 'bg-[#00AFFF]/15 border-[#00AFFF] text-white'
                      : 'bg-[#111820] border-[#1C2735] text-[#79838E] hover:text-[#D7DCE2]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-[#79838E] flex items-center space-x-1.5 mt-1">
              <Info className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span>Preference guides AI routing, but never overrides essential technical requirements.</span>
            </div>
          </div>

          {/* Allow Narration / Voiceover */}
          <div className="flex items-center justify-between p-3.5 bg-[#111820] border border-[#1C2735] rounded-xl">
            <div>
              <div className="font-semibold text-white">Allow Narration / Voiceover</div>
              <div className="text-[11px] text-[#79838E]">
                Enables voice-over audio blocks and inner monologue when appropriate.
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.allowNarration}
              onChange={(e) => setForm({ ...form, allowNarration: e.target.checked })}
              className="w-4 h-4 rounded border-[#1C2735] text-[#00AFFF] focus:ring-[#00AFFF] cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2.5 border-t border-[#1C2735] pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-md shadow-[#00AFFF]/20 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
