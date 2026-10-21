import React, { useState, useEffect } from 'react';
import { X, MapPin, AlertCircle, Save } from 'lucide-react';
import { CanonLocation } from '../../types/filmStudio';
import { getNextLocationId } from '../../services/canonHelpers';

interface LocationModalProps {
  isOpen: boolean;
  mode: 'ADD' | 'EDIT';
  initialLocation?: CanonLocation | null;
  existingLocations?: CanonLocation[];
  onSave: (location: CanonLocation) => void;
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  mode,
  initialLocation,
  existingLocations = [],
  onSave,
  onClose,
}) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [moodAtmosphere, setMoodAtmosphere] = useState('');
  const [permanentSpatialAnchors, setPermanentSpatialAnchors] = useState('');
  const [storyPurpose, setStoryPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const safeLocations = Array.isArray(existingLocations) ? existingLocations : [];
      if (mode === 'EDIT' && initialLocation) {
        setId(initialLocation.id || '');
        setName(initialLocation.name || '');
        setDescription(initialLocation.description || initialLocation.narrativeSignificance || '');
        setMoodAtmosphere(initialLocation.moodAtmosphere || '');
        setPermanentSpatialAnchors(initialLocation.permanentSpatialAnchors || '');
        setStoryPurpose(initialLocation.storyPurpose || initialLocation.narrativeSignificance || '');
      } else {
        const nextId = getNextLocationId(safeLocations);
        setId(nextId);
        setName('');
        setDescription('');
        setMoodAtmosphere('');
        setPermanentSpatialAnchors('');
        setStoryPurpose('');
      }
    }
  }, [isOpen, mode, initialLocation, existingLocations]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = (id || '').trim().toUpperCase();
    const trimmedName = (name || '').trim();
    const trimmedAtmosphere = (moodAtmosphere || '').trim();
    const trimmedDescription = (description || '').trim();
    const trimmedStoryPurpose = (storyPurpose || '').trim();
    const trimmedAnchors = (permanentSpatialAnchors || '').trim();

    if (!trimmedId) {
      setError('Location ID is required (e.g. LOC-01, LOC-04).');
      return;
    }

    if (!trimmedName) {
      setError('Location Name is required.');
      return;
    }

    const safeLocations = Array.isArray(existingLocations) ? existingLocations : [];
    if (mode === 'ADD') {
      const exists = safeLocations.some((l) => {
        if (!l) return false;
        const lid = typeof l === 'string' ? l : l.id || (l as any).locationId;
        return typeof lid === 'string' && lid.trim().toUpperCase() === trimmedId;
      });
      if (exists) {
        setError(`A location with ID "${trimmedId}" already exists. Please choose a unique ID.`);
        return;
      }
    } else if (mode === 'EDIT' && initialLocation) {
      const currentInitialId = (initialLocation.id || '').trim().toUpperCase();
      const existsOther = safeLocations.some((l) => {
        if (!l) return false;
        const lid = typeof l === 'string' ? l : l.id || (l as any).locationId;
        return (
          typeof lid === 'string' &&
          lid.trim().toUpperCase() === trimmedId &&
          lid.trim().toUpperCase() !== currentInitialId
        );
      });
      if (existsOther) {
        setError(`Another location with ID "${trimmedId}" already exists.`);
        return;
      }
    }

    const narrativeSig =
      trimmedStoryPurpose || trimmedDescription || `${trimmedName} environment`;

    const savedLocation: CanonLocation = {
      id: trimmedId,
      name: trimmedName,
      narrativeSignificance: narrativeSig,
      moodAtmosphere: trimmedAtmosphere || 'Cinematic atmospheric lighting',
      description: trimmedDescription || undefined,
      permanentSpatialAnchors: trimmedAnchors || undefined,
      storyPurpose: trimmedStoryPurpose || undefined,
    };

    onSave(savedLocation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#1C2735] pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00AFFF]/20 border border-[#00AFFF]/40 flex items-center justify-center text-[#00AFFF]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                {mode === 'ADD' ? 'Add Canon Location' : `Edit Location (${initialLocation?.id || id})`}
              </h3>
              <p className="text-xs text-[#79838E]">
                Persistent spatial anchor, atmosphere & Stage 2 prompt registry
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#79838E] hover:text-white p-1 rounded-lg hover:bg-[#141C26] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-950/70 border border-red-500/50 p-3 rounded-lg text-xs text-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Stable ID & Location Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#00AFFF] uppercase tracking-wider mb-1">
                Stable ID *
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="LOC-04"
                disabled={mode === 'EDIT'}
                className={`w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white font-mono focus:border-[#00AFFF] focus:outline-none ${
                  mode === 'EDIT' ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
              <span className="text-[10px] text-[#79838E] mt-0.5 block">
                {mode === 'ADD' ? 'Unique sequential ID' : 'Preserved immutable ID'}
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
                Location Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Watchmaker’s Workshop, Cogberry Town Square"
                required
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white focus:border-[#00AFFF] focus:outline-none"
              />
            </div>
          </div>

          {/* Atmosphere & Lighting */}
          <div>
            <label className="block text-[11px] font-bold text-[#F4A62A] uppercase tracking-wider mb-1">
              Atmosphere & Lighting <span className="text-[#79838E] font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={moodAtmosphere}
              onChange={(e) => setMoodAtmosphere(e.target.value)}
              placeholder="e.g. Rain-streaked glass, amber oil lantern glow, ticking pendulum shadows..."
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white focus:border-[#F4A62A] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
              Description & Visual Geography <span className="text-[#79838E] font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Architectural style, scale, materials, walls, floor, exterior view from windows..."
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white focus:border-[#00AFFF] focus:outline-none"
            />
          </div>

          {/* Permanent Spatial Anchors */}
          <div>
            <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
              Permanent Spatial Anchors <span className="text-[#79838E] font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={permanentSpatialAnchors}
              onChange={(e) => setPermanentSpatialAnchors(e.target.value)}
              placeholder="e.g. Heavy oak workbench in center, grandfather clock on north wall, rusted tin roof..."
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
            />
            <span className="text-[10px] text-[#79838E] mt-0.5 block">
              Anchors ensure camera continuity across different shot setups in Stage 3 and Stage 4.
            </span>
          </div>

          {/* Story Purpose */}
          <div>
            <label className="block text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-1">
              Story Purpose & Narrative Significance <span className="text-[#79838E] font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={storyPurpose}
              onChange={(e) => setStoryPurpose(e.target.value)}
              placeholder="Why this location matters in the story and emotional arc..."
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
            />
          </div>

          {/* Notice */}
          <div className="bg-[#111820] border border-[#1C2735] p-2.5 rounded-lg text-[11px] text-[#79838E]">
            Saving will update the active Story Canon and mark Stage 1 as{' '}
            <span className="text-[#F4A62A] font-semibold">NEEDS RE-AUDIT</span> to check continuity before final approval.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1C2735]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold rounded-lg flex items-center space-x-1.5 shadow-lg shadow-[#00AFFF]/20 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{mode === 'ADD' ? 'Save Location' : 'Update Location'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
