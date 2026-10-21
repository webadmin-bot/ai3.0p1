import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Check,
  ChevronDown,
  Sparkles,
  Plus,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import {
  TONE_LIBRARY_CATEGORIES,
  ALL_PREDEFINED_TONES,
  normalizeTone,
} from '../../data/genreAndToneLibrary';

interface EmotionalToneSelectProps {
  value: string;
  primaryTone?: string;
  secondaryTone?: string;
  onChange: (combinedTone: string, primary: string, secondary?: string) => void;
}

export const EmotionalToneSelect: React.FC<EmotionalToneSelectProps> = ({
  value,
  primaryTone: propPrimary,
  secondaryTone: propSecondary,
  onChange,
}) => {
  // Normalize current values safely
  const normalized = normalizeTone(value, propPrimary, propSecondary);
  const primary = normalized.primary || 'Suspenseful';
  const secondary = normalized.secondary || '';

  const [isPrimaryOpen, setIsPrimaryOpen] = useState(false);
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);
  const [primarySearch, setPrimarySearch] = useState('');
  const [secondarySearch, setSecondarySearch] = useState('');
  const [customPrimaryInput, setCustomPrimaryInput] = useState('');
  const [customSecondaryInput, setCustomSecondaryInput] = useState('');
  const [showSecondarySelector, setShowSecondarySelector] = useState(Boolean(secondary));

  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (primaryRef.current && !primaryRef.current.contains(event.target as Node)) {
        setIsPrimaryOpen(false);
      }
      if (secondaryRef.current && !secondaryRef.current.contains(event.target as Node)) {
        setIsSecondaryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const emitChange = (newPrimary: string, newSecondary?: string) => {
    const p = (newPrimary || '').trim();
    const s = (newSecondary || '').trim();
    const combined = s ? `${p} & ${s}` : p;
    onChange(combined, p, s || undefined);
  };

  const handleSelectPrimary = (tone: string) => {
    emitChange(tone, secondary);
    setIsPrimaryOpen(false);
    setPrimarySearch('');
  };

  const handleSelectSecondary = (tone: string) => {
    emitChange(primary, tone);
    setIsSecondaryOpen(false);
    setSecondarySearch('');
  };

  const handleClearSecondary = (e: React.MouseEvent) => {
    e.stopPropagation();
    emitChange(primary, '');
    setShowSecondarySelector(false);
  };

  const handleAddCustomPrimary = () => {
    const trimmed = (customPrimaryInput || primarySearch).trim();
    if (!trimmed) return;
    emitChange(trimmed, secondary);
    setCustomPrimaryInput('');
    setPrimarySearch('');
    setIsPrimaryOpen(false);
  };

  const handleAddCustomSecondary = () => {
    const trimmed = (customSecondaryInput || secondarySearch).trim();
    if (!trimmed) return;
    emitChange(primary, trimmed);
    setCustomSecondaryInput('');
    setSecondarySearch('');
    setIsSecondaryOpen(false);
  };

  // Filter lists based on query
  const pQuery = primarySearch.trim().toLowerCase();
  const filteredPrimaryCategories = TONE_LIBRARY_CATEGORIES.map((cat) => ({
    category: cat.category,
    tones: cat.tones.filter((t) => t.toLowerCase().includes(pQuery)),
  })).filter((cat) => cat.tones.length > 0);

  const sQuery = secondarySearch.trim().toLowerCase();
  const filteredSecondaryCategories = TONE_LIBRARY_CATEGORIES.map((cat) => ({
    category: cat.category,
    tones: cat.tones.filter((t) => t.toLowerCase().includes(sQuery) && t !== primary),
  })).filter((cat) => cat.tones.length > 0);

  const combinedDisplay = secondary ? `${primary} & ${secondary}` : primary;

  return (
    <div className="space-y-2 relative select-none">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider flex items-center space-x-1.5">
          <span>Emotional Tone</span>
          <span className="text-[10px] text-[#55606E] lowercase font-normal">
            (Primary + Optional Secondary)
          </span>
        </label>

        {!showSecondarySelector && (
          <button
            type="button"
            onClick={() => setShowSecondarySelector(true)}
            className="text-[10px] font-semibold text-[#00AFFF] hover:text-[#0096DC] flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add Secondary Tone</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* PRIMARY TONE SELECTOR */}
        <div ref={primaryRef} className="relative">
          <div
            onClick={() => {
              setIsPrimaryOpen(!isPrimaryOpen);
              setIsSecondaryOpen(false);
            }}
            className={`min-h-[42px] px-3 py-2 bg-[#070B10] border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
              isPrimaryOpen
                ? 'border-[#00AFFF] ring-1 ring-[#00AFFF]/40 shadow-sm'
                : 'border-[#1C2735] hover:border-[#2C3B4E]'
            }`}
          >
            <div className="flex items-center space-x-2 truncate">
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#00AFFF]/15 text-[#00AFFF] uppercase shrink-0">
                Primary
              </span>
              <span className="text-xs font-semibold text-white truncate">
                {primary || 'Select Tone'}
              </span>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-[#79838E] transition-transform duration-200 shrink-0 ${
                isPrimaryOpen ? 'rotate-180 text-[#00AFFF]' : ''
              }`}
            />
          </div>

          {/* Primary Dropdown Menu */}
          {isPrimaryOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0B1017] border border-[#1C2735] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-72 animate-in fade-in-50 duration-150">
              <div className="p-2.5 bg-[#0E141D] border-b border-[#1C2735] flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-[#00AFFF] shrink-0" />
                <input
                  type="text"
                  value={primarySearch}
                  onChange={(e) => setPrimarySearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = primarySearch.trim();
                      if (trimmed) {
                        const match = ALL_PREDEFINED_TONES.find((t) => t.toLowerCase() === trimmed.toLowerCase());
                        handleSelectPrimary(match || trimmed);
                      }
                    }
                  }}
                  placeholder="Filter emotional tones or enter custom..."
                  className="w-full bg-transparent text-white text-xs placeholder-[#55606E] outline-none"
                  autoFocus
                />
                {primarySearch && (
                  <button
                    type="button"
                    onClick={() => setPrimarySearch('')}
                    className="text-[#79838E] hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Add Custom Primary Tone if search doesn't exactly match predefined */}
              {pQuery.length > 1 && !ALL_PREDEFINED_TONES.some((t) => t.toLowerCase() === pQuery) && (
                <div className="p-2 bg-[#141F2E] border-b border-[#00AFFF]/30 flex items-center justify-between">
                  <span className="text-xs text-white truncate">
                    Use <strong className="text-[#00AFFF]">"{primarySearch.trim()}"</strong> as custom tone
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      emitChange(primarySearch.trim(), secondary);
                      setPrimarySearch('');
                      setIsPrimaryOpen(false);
                    }}
                    className="px-2.5 py-1 rounded bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0 ml-2 shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Apply</span>
                  </button>
                </div>
              )}

              {/* Current Custom Primary Tone indicator if active */}
              {primary && !ALL_PREDEFINED_TONES.includes(primary) && (
                <div className="p-2 bg-[#101924] border-b border-[#1C2735] flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-white truncate">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                      ACTIVE CUSTOM
                    </span>
                    <span className="font-semibold truncate">{primary}</span>
                  </div>
                  <Check className="w-3.5 h-3.5 text-[#00AFFF] shrink-0" />
                </div>
              )}

              {/* Tones by Category */}
              <div className="overflow-y-auto p-2 space-y-2.5 flex-1 text-xs divide-y divide-[#16202C]">
                {filteredPrimaryCategories.map((group) => (
                  <div key={group.category} className="pt-1.5 first:pt-0 space-y-1">
                    <div className="text-[9px] font-bold text-[#657283] uppercase tracking-wider px-2">
                      {group.category}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {group.tones.map((t) => {
                        const isSelected = primary === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleSelectPrimary(t)}
                            className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#141F2E] text-white border border-[#00AFFF]/50 font-semibold'
                                : 'text-[#A0AEC0] hover:bg-[#141C28] hover:text-white border border-transparent'
                            }`}
                          >
                            <span className="truncate">{t}</span>
                            {isSelected && <Check className="w-3 h-3 text-[#00AFFF]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredPrimaryCategories.length === 0 && (
                  <div className="p-4 text-center text-xs text-[#55606E]">
                    No matching predefined tones. Press Enter or click Apply above to use your custom tone.
                  </div>
                )}
              </div>

              {/* Custom Tone Input */}
              <div className="p-2 bg-[#090D13] border-t border-[#1C2735] flex items-center space-x-2">
                <input
                  type="text"
                  value={customPrimaryInput}
                  onChange={(e) => setCustomPrimaryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomPrimary();
                    }
                  }}
                  placeholder="Or custom tone..."
                  className="flex-1 bg-[#111820] border border-[#1C2735] focus:border-[#00AFFF] rounded-lg px-2 py-1 text-xs text-white placeholder-[#55606E] outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomPrimary}
                  disabled={!customPrimaryInput.trim()}
                  className="px-2.5 py-1 rounded bg-[#141C28] hover:bg-[#1E2938] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECONDARY TONE SELECTOR (OPTIONAL) */}
        {showSecondarySelector ? (
          <div ref={secondaryRef} className="relative">
            <div
              onClick={() => {
                setIsSecondaryOpen(!isSecondaryOpen);
                setIsPrimaryOpen(false);
              }}
              className={`min-h-[42px] px-3 py-2 bg-[#070B10] border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                isSecondaryOpen
                  ? 'border-purple-500 ring-1 ring-purple-500/40 shadow-sm'
                  : 'border-[#1C2735] hover:border-[#2C3B4E]'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30 uppercase shrink-0">
                  Secondary
                </span>
                <span className="text-xs font-semibold text-white truncate">
                  {secondary || <span className="text-[#55606E] font-normal">Choose Secondary Tone...</span>}
                </span>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                {secondary && (
                  <button
                    type="button"
                    onClick={handleClearSecondary}
                    className="p-1 hover:bg-[#1C2735] text-[#79838E] hover:text-red-400 rounded cursor-pointer"
                    title="Remove secondary tone"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-[#79838E] transition-transform duration-200 ${
                    isSecondaryOpen ? 'rotate-180 text-purple-400' : ''
                  }`}
                />
              </div>
            </div>

            {/* Secondary Dropdown Menu */}
            {isSecondaryOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0B1017] border border-[#1C2735] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-72 animate-in fade-in-50 duration-150">
                <div className="p-2.5 bg-[#0E141D] border-b border-[#1C2735] flex items-center space-x-2">
                  <Search className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <input
                    type="text"
                    value={secondarySearch}
                    onChange={(e) => setSecondarySearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = secondarySearch.trim();
                        if (trimmed) {
                          const match = ALL_PREDEFINED_TONES.find((t) => t.toLowerCase() === trimmed.toLowerCase());
                          handleSelectSecondary(match || trimmed);
                        }
                      }
                    }}
                    placeholder="Filter secondary tone or enter custom..."
                    className="w-full bg-transparent text-white text-xs placeholder-[#55606E] outline-none"
                    autoFocus
                  />
                  {secondarySearch && (
                    <button
                      type="button"
                      onClick={() => setSecondarySearch('')}
                      className="text-[#79838E] hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Add Custom Secondary Tone if search doesn't exactly match predefined */}
                {sQuery.length > 1 && !ALL_PREDEFINED_TONES.some((t) => t.toLowerCase() === sQuery) && (
                  <div className="p-2 bg-[#1C1428] border-b border-purple-500/30 flex items-center justify-between">
                    <span className="text-xs text-white truncate">
                      Use <strong className="text-purple-400">"{secondarySearch.trim()}"</strong> as secondary tone
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        emitChange(primary, secondarySearch.trim());
                        setSecondarySearch('');
                        setIsSecondaryOpen(false);
                      }}
                      className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0 ml-2 shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Apply</span>
                    </button>
                  </div>
                )}

                {/* Current Custom Secondary Tone indicator if active */}
                {secondary && !ALL_PREDEFINED_TONES.includes(secondary) && (
                  <div className="p-2 bg-[#181122] border-b border-[#1C2735] flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs text-white truncate">
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                        ACTIVE CUSTOM
                      </span>
                      <span className="font-semibold truncate">{secondary}</span>
                    </div>
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  </div>
                )}

                <div className="overflow-y-auto p-2 space-y-2.5 flex-1 text-xs divide-y divide-[#16202C]">
                  {filteredSecondaryCategories.map((group) => (
                    <div key={group.category} className="pt-1.5 first:pt-0 space-y-1">
                      <div className="text-[9px] font-bold text-[#657283] uppercase tracking-wider px-2">
                        {group.category}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {group.tones.map((t) => {
                          const isSelected = secondary === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleSelectSecondary(t)}
                              className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-950/50 text-white border border-purple-500/50 font-semibold'
                                  : 'text-[#A0AEC0] hover:bg-[#141C28] hover:text-white border border-transparent'
                              }`}
                            >
                              <span className="truncate">{t}</span>
                              {isSelected && <Check className="w-3 h-3 text-purple-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {filteredSecondaryCategories.length === 0 && (
                    <div className="p-4 text-center text-xs text-[#55606E]">
                      No matching predefined tones. Press Enter or click Apply above to use your custom secondary tone.
                    </div>
                  )}
                </div>

                {/* Custom Secondary Input */}
                <div className="p-2 bg-[#090D13] border-t border-[#1C2735] flex items-center space-x-2">
                  <input
                    type="text"
                    value={customSecondaryInput}
                    onChange={(e) => setCustomSecondaryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSecondary();
                      }
                    }}
                    placeholder="Or custom secondary tone..."
                    className="flex-1 bg-[#111820] border border-[#1C2735] focus:border-purple-500 rounded-lg px-2 py-1 text-xs text-white placeholder-[#55606E] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSecondary}
                    disabled={!customSecondaryInput.trim()}
                    className="px-2.5 py-1 rounded bg-[#141C28] hover:bg-[#1E2938] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex items-center px-3 py-2 bg-[#070B10]/50 border border-dashed border-[#1C2735] rounded-lg text-xs text-[#55606E]">
            <span>Click "+ Add Secondary Tone" above to pair complementary tones.</span>
          </div>
        )}
      </div>

      {/* Resulting Tone Preview Pill */}
      <div className="flex items-center space-x-2 text-[11px] text-[#79838E] pt-0.5">
        <span>Active Story Tone:</span>
        <span className="px-2 py-0.5 rounded bg-[#141C28] text-white font-mono font-semibold border border-[#243346]">
          {combinedDisplay}
        </span>
      </div>
    </div>
  );
};
