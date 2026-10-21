import React from 'react';
import { X, Layers, BookOpen, Palette, User, Shirt, MapPin, Box, ShieldCheck } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

interface CanonReferenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CanonReferenceDrawer: React.FC<CanonReferenceDrawerProps> = ({ isOpen, onClose }) => {
  const { project } = useProject();
  const [activeSubTab, setActiveSubTab] = React.useState<'story' | 'visual'>('story');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-[#0B1017] border-l border-[#1C2735] h-full flex flex-col shadow-2xl animate-slide-left">
        {/* Header */}
        <div className="p-4 border-b border-[#1C2735] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-white text-sm">
                Upstream Canon Reference
              </h3>
              <p className="text-[10px] text-[#79838E]">
                Locked Stage 1 Story & Stage 2 Visual Truth
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

        {/* Sub-tab Switcher */}
        <div className="flex border-b border-[#1C2735] bg-[#0E141D] px-4 pt-2">
          <button
            onClick={() => setActiveSubTab('story')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'story'
                ? 'border-[#00AFFF] text-white'
                : 'border-transparent text-[#79838E] hover:text-[#D7DCE2]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Stage 1 Story Canon</span>
          </button>
          <button
            onClick={() => setActiveSubTab('visual')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'visual'
                ? 'border-[#00AFFF] text-white'
                : 'border-transparent text-[#79838E] hover:text-[#D7DCE2]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Stage 2 Visual Assets</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeSubTab === 'story' ? (
            <div className="space-y-4">
              {/* Story Foundation */}
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-mono text-[#00AFFF] uppercase font-bold">
                  Story Foundation V1
                </span>
                <div className="text-white font-bold text-sm">
                  {project.storyFoundation?.title || project.title}
                </div>
                <div className="text-[#D7DCE2] italic">
                  "{project.storyFoundation?.logline}"
                </div>
                <div className="text-[11px] text-[#79838E] leading-relaxed">
                  {project.storyFoundation?.premise}
                </div>
              </div>

              {/* Characters */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-[#79838E] uppercase font-bold flex items-center space-x-1">
                  <User className="w-3 h-3 text-[#00AFFF]" />
                  <span>Canonical Characters ({project.storyCanon?.characters.length || 0})</span>
                </span>
                <div className="space-y-2">
                  {project.storyCanon?.characters.map((char) => (
                    <div key={char.id} className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{char.name}</span>
                        <span className="font-mono text-[10px] text-[#00AFFF] bg-[#00AFFF]/10 px-1.5 py-0.5 rounded">
                          {char.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#79838E]">
                        Role: {char.role} • Voice: {char.personalityVoice}
                      </div>
                      <div className="text-[11px] text-[#D7DCE2]">
                        <strong className="text-emerald-400">Want:</strong> {char.want} |{' '}
                        <strong className="text-amber-400">Need:</strong> {char.need}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Beat Map */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-[#79838E] uppercase font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-[#F4A62A]" />
                  <span>Narrative Beat Map ({project.storyCanon?.beatMap.length || 0})</span>
                </span>
                <div className="space-y-2">
                  {project.storyCanon?.beatMap.map((beat) => (
                    <div key={beat.id} className="bg-[#111820] border border-[#1C2735] rounded-lg p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-white">#{beat.sequenceNumber} {beat.title}</span>
                        <span className="font-mono text-[10px] text-[#F4A62A]">{beat.id}</span>
                      </div>
                      <p className="text-[11px] text-[#79838E]">{beat.description}</p>
                      <div className="text-[10px] text-[#00AFFF]">
                        Causality: {beat.causalConnection}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Style Bible Overview */}
              <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-mono text-[#00AFFF] uppercase font-bold">
                  Visual Style Bible V1
                </span>
                <div className="text-white font-bold">{project.visualStyle.name}</div>
                <div className="text-[11px] text-[#79838E]">
                  <strong>Lighting:</strong> {project.stage2.styleBible?.lightingRules || project.visualStyle.lightingIntent}
                </div>
                <div className="text-[11px] text-[#79838E]">
                  <strong>Textures:</strong> {project.stage2.styleBible?.textureAndRenderingLanguage || project.visualStyle.textureIntent}
                </div>
              </div>

              {/* Assets list */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-[#79838E] uppercase font-bold">
                  Stage 2 Visual Asset Registry ({project.stage2.assets.length})
                </span>
                <div className="space-y-2">
                  {project.stage2.assets.map((asset) => (
                    <div key={asset.id} className="bg-[#111820] border border-[#1C2735] rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          {asset.optionalReferenceImageData && (
                            <img
                              src={asset.optionalReferenceImageData}
                              alt={asset.name}
                              className="w-8 h-8 rounded object-cover border border-[#00AFFF]/40 shrink-0"
                            />
                          )}
                          <span className="font-bold text-white truncate">{asset.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-[#00AFFF] bg-[#00AFFF]/10 px-1.5 py-0.5 rounded shrink-0">
                          {asset.id} • {asset.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#79838E]">{asset.storyFunction}</p>
                      <div className="text-[10px] font-mono bg-[#090D13] p-2 rounded border border-[#1C2735] text-[#D7DCE2] line-clamp-3">
                        {asset.referencePrompt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
