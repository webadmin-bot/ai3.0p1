import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Check,
  ChevronDown,
  Star,
  Plus,
  Sliders,
  Layers,
  AlertCircle,
} from 'lucide-react';
import {
  GENRE_LIBRARY_CATEGORIES,
  ALL_PREDEFINED_GENRES,
  normalizeGenres,
} from '../../data/genreAndToneLibrary';

interface GenreMultiSelectProps {
  value: string[];
  onChange: (genres: string[], primaryGenre?: string) => void;
  maxRecommended?: number;
}

export const GenreMultiSelect: React.FC<GenreMultiSelectProps> = ({
  value,
  onChange,
  maxRecommended = 5,
}) => {
  const selectedGenres = normalizeGenres(value);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter categories based on search query
  const query = searchQuery.trim().toLowerCase();
  const filteredCategories = GENRE_LIBRARY_CATEGORIES.map((cat) => {
    const matchingGenres = cat.genres.filter((g) => g.toLowerCase().includes(query));
    return {
      category: cat.category,
      genres: matchingGenres,
    };
  }).filter((cat) => cat.genres.length > 0);

  // Flattened visible items for keyboard navigation
  const visibleGenres = filteredCategories.flatMap((c) => c.genres);

  // Check if query is an exact match with an existing predefined or selected genre
  const exactPredefinedMatch = ALL_PREDEFINED_GENRES.some(
    (g) => g.toLowerCase() === query
  );
  const alreadySelected = selectedGenres.some((g) => g.toLowerCase() === query);
  const canAddCustom = query.length > 1 && !alreadySelected;

  const handleToggleGenre = (genre: string) => {
    const exists = selectedGenres.includes(genre);
    let next: string[];
    if (exists) {
      next = selectedGenres.filter((g) => g !== genre);
    } else {
      next = [...selectedGenres, genre];
    }
    onChange(next, next[0]);
  };

  const handleRemoveTag = (genreToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = selectedGenres.filter((g) => g !== genreToRemove);
    onChange(next, next[0]);
  };

  const handleSetPrimary = (genre: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedGenres[0] === genre) return;
    const reordered = [genre, ...selectedGenres.filter((g) => g !== genre)];
    onChange(reordered, genre);
  };

  const handleAddCustomGenre = () => {
    const trimmed = (customInput || searchQuery).trim();
    if (!trimmed) return;
    if (selectedGenres.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setSearchQuery('');
      setCustomInput('');
      return;
    }
    const next = [...selectedGenres, trimmed];
    onChange(next, next[0]);
    setSearchQuery('');
    setCustomInput('');
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([], undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < visibleGenres.length - 1 ? prev + 1 : prev));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && visibleGenres[focusedIndex]) {
        handleToggleGenre(visibleGenres[focusedIndex]);
      } else if (canAddCustom) {
        handleAddCustomGenre();
      }
      return;
    }

    if (e.key === 'Backspace' && !searchQuery && selectedGenres.length > 0) {
      // Remove last tag
      const last = selectedGenres[selectedGenres.length - 1];
      handleRemoveTag(last);
    }
  };

  return (
    <div ref={containerRef} className="space-y-1.5 relative w-full select-none">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#8A96A6] uppercase tracking-wider flex items-center space-x-1.5">
          <span>Project Genres</span>
          <span className="text-[10px] text-[#55606E] lowercase font-normal">
            (select up to {maxRecommended}, first is primary)
          </span>
        </label>

        <div className="flex items-center space-x-2 text-[10px]">
          {selectedGenres.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[#79838E] hover:text-red-400 cursor-pointer transition-colors"
            >
              Clear All
            </button>
          )}
          <span
            className={`font-mono font-bold px-1.5 py-0.2 rounded ${
              selectedGenres.length > maxRecommended
                ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                : 'text-[#00AFFF]'
            }`}
          >
            {selectedGenres.length} / {maxRecommended}
          </span>
        </div>
      </div>

      {/* Main Trigger Box with Selected Tags */}
      <div
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }}
        className={`min-h-[42px] px-2.5 py-1.5 bg-[#070B10] border rounded-lg flex flex-wrap items-center gap-1.5 cursor-pointer transition-all ${
          isOpen
            ? 'border-[#00AFFF] ring-1 ring-[#00AFFF]/40 shadow-sm'
            : 'border-[#1C2735] hover:border-[#2C3B4E]'
        }`}
      >
        {selectedGenres.length === 0 ? (
          <span className="text-xs text-[#55606E] pl-1.5 py-1 flex items-center space-x-1">
            <Search className="w-3.5 h-3.5 text-[#55606E]" />
            <span>Search or browse cinematic genres (e.g. Cyberpunk, Psychological Horror)...</span>
          </span>
        ) : (
          selectedGenres.map((genre, idx) => {
            const isPrimary = idx === 0;
            return (
              <span
                key={genre}
                className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold border transition-all ${
                  isPrimary
                    ? 'bg-[#141F2E] border-[#00AFFF] text-white shadow-sm'
                    : 'bg-[#0E141D] border-[#243346] text-[#D7DCE2] hover:border-[#384B63]'
                }`}
              >
                {/* Primary indicator button */}
                <button
                  type="button"
                  onClick={(e) => handleSetPrimary(genre, e)}
                  title={isPrimary ? 'Primary Dominant Genre' : 'Click to make Primary'}
                  className={`p-0.5 rounded cursor-pointer ${
                    isPrimary ? 'text-amber-400' : 'text-[#55606E] hover:text-amber-300'
                  }`}
                >
                  <Star className={`w-3 h-3 ${isPrimary ? 'fill-amber-400' : ''}`} />
                </button>

                <span className="truncate max-w-[150px]">{genre}</span>

                {isPrimary && (
                  <span className="text-[9px] font-bold tracking-tight text-[#00AFFF] px-1 py-0.2 rounded bg-[#00AFFF]/15 uppercase">
                    Primary
                  </span>
                )}

                {/* Remove tag */}
                <button
                  type="button"
                  onClick={(e) => handleRemoveTag(genre, e)}
                  className="p-0.5 hover:bg-black/40 text-[#79838E] hover:text-white rounded cursor-pointer ml-1"
                  title="Remove genre"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })
        )}

        <div className="ml-auto pl-1 text-[#79838E]">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#00AFFF]' : ''}`}
          />
        </div>
      </div>

      {/* Searchable Dropdown Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0B1017] border border-[#1C2735] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-80 animate-in fade-in-50 duration-150">
          {/* Search Box Header */}
          <div className="p-2.5 bg-[#0E141D] border-b border-[#1C2735] flex items-center space-x-2">
            <Search className="w-4 h-4 text-[#00AFFF] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type to filter genres or add custom..."
              className="w-full bg-transparent text-white text-xs placeholder-[#55606E] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#79838E] hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Custom Genre Quick Add Prompt if query not present */}
          {canAddCustom && !exactPredefinedMatch && (
            <div className="p-2 bg-[#141F2E] border-b border-[#00AFFF]/30 flex items-center justify-between">
              <span className="text-xs text-white truncate">
                Add <strong className="text-[#00AFFF]">"{searchQuery.trim()}"</strong> as custom genre
              </span>
              <button
                type="button"
                onClick={handleAddCustomGenre}
                className="px-2.5 py-1 rounded bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0 ml-2 shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>Add Tag</span>
              </button>
            </div>
          )}

          {/* Categorized Genres Scroll List */}
          <div className="overflow-y-auto p-2 space-y-3 flex-1 text-xs divide-y divide-[#16202C]">
            {/* Active Custom Genres (if any) */}
            {selectedGenres.filter((g) => !ALL_PREDEFINED_GENRES.some((p) => p.toLowerCase() === g.toLowerCase())).length > 0 && (
              <div className="space-y-1.5 pb-2">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Active Custom Genres</span>
                </div>
                <div className="flex flex-wrap gap-1 px-1">
                  {selectedGenres
                    .filter((g) => !ALL_PREDEFINED_GENRES.some((p) => p.toLowerCase() === g.toLowerCase()))
                    .map((customGenre) => {
                      const isPrimary = selectedGenres[0] === customGenre;
                      return (
                        <div
                          key={customGenre}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#141F2E] border border-amber-500/40 text-white text-xs font-medium"
                        >
                          <button
                            type="button"
                            onClick={(e) => handleSetPrimary(customGenre, e)}
                            title={isPrimary ? 'Primary Dominant Genre' : 'Click to make Primary'}
                            className={`p-0.5 rounded cursor-pointer ${
                              isPrimary ? 'text-amber-400' : 'text-[#79838E] hover:text-amber-300'
                            }`}
                          >
                            <Star className={`w-3 h-3 ${isPrimary ? 'fill-amber-400' : ''}`} />
                          </button>
                          <span className="truncate max-w-[120px]">{customGenre}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveTag(customGenre, e)}
                            className="p-0.5 hover:bg-black/40 text-[#79838E] hover:text-white rounded cursor-pointer ml-1"
                            title="Remove custom genre"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {filteredCategories.map((catGroup) => (
              <div key={catGroup.category} className="pt-2 first:pt-0 space-y-1.5">
                <div className="text-[10px] font-bold text-[#657283] uppercase tracking-wider px-2">
                  {catGroup.category}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {catGroup.genres.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    const isPrimary = selectedGenres[0] === genre;

                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => handleToggleGenre(genre)}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#141F2E] text-white border border-[#00AFFF]/50 font-semibold'
                            : 'text-[#A0AEC0] hover:bg-[#141C28] hover:text-white border border-transparent'
                        }`}
                      >
                        <span className="truncate mr-1">{genre}</span>
                        {isSelected && (
                          <span className="flex items-center space-x-0.5 shrink-0 text-[#00AFFF]">
                            {isPrimary ? (
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && !canAddCustom && (
              <div className="p-6 text-center text-xs text-[#55606E]">
                No matching genres found in library.
              </div>
            )}
          </div>

          {/* Bottom Custom Genre Input Footer */}
          <div className="p-2.5 bg-[#090D13] border-t border-[#1C2735] flex items-center space-x-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomGenre();
                }
              }}
              placeholder="Or type a custom genre tag..."
              className="flex-1 bg-[#111820] border border-[#1C2735] focus:border-[#00AFFF] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#55606E] outline-none"
            />
            <button
              type="button"
              onClick={handleAddCustomGenre}
              disabled={!customInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Add Custom
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
