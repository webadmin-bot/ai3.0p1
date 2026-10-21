import React, { useState, useEffect } from 'react';
import { X, Box, AlertCircle, Save } from 'lucide-react';
import { CanonProp, CanonCharacter } from '../../types/filmStudio';
import { getNextPropId } from '../../services/canonHelpers';

interface PropModalProps {
  isOpen: boolean;
  mode: 'ADD' | 'EDIT';
  initialProp?: CanonProp | null;
  existingProps?: CanonProp[];
  characters?: CanonCharacter[];
  onSave: (prop: CanonProp) => void;
  onClose: () => void;
}

export const PropModal: React.FC<PropModalProps> = ({
  isOpen,
  mode,
  initialProp,
  existingProps = [],
  characters = [],
  onSave,
  onClose,
}) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [storyFunction, setStoryFunction] = useState('');
  const [ownerOrHolder, setOwnerOrHolder] = useState('');
  const [continuityDetails, setContinuityDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const safeProps = Array.isArray(existingProps) ? existingProps : [];
      if (mode === 'EDIT' && initialProp) {
        setId(initialProp.id || '');
        setName(initialProp.name || '');
        setDescription(initialProp.description || initialProp.narrativeSignificance || '');
        setStoryFunction(initialProp.storyFunction || initialProp.narrativeSignificance || '');
        setOwnerOrHolder(initialProp.ownerOrHolder || '');
        setContinuityDetails(initialProp.continuityDetails || '');
      } else {
        const nextId = getNextPropId(safeProps);
        setId(nextId);
        setName('');
        setDescription('');
        setStoryFunction('');
        setOwnerOrHolder('');
        setContinuityDetails('');
      }
    }
  }, [isOpen, mode, initialProp, existingProps]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = (id || '').trim().toUpperCase();
    const trimmedName = (name || '').trim();
    const trimmedDescription = (description || '').trim();
    const trimmedFunction = (storyFunction || '').trim();
    const trimmedHolder = (ownerOrHolder || '').trim();
    const trimmedContinuity = (continuityDetails || '').trim();

    if (!trimmedId) {
      setError('Prop ID is required (e.g. PROP-01, PROP-04).');
      return;
    }

    if (!trimmedName) {
      setError('Prop Name is required.');
      return;
    }

    // Check duplicate ID safely across existing props
    const safeProps = Array.isArray(existingProps) ? existingProps : [];
    if (mode === 'ADD') {
      const exists = safeProps.some((p) => {
        if (!p) return false;
        const pid = typeof p === 'string' ? p : p.id || (p as any).propId;
        return typeof pid === 'string' && pid.trim().toUpperCase() === trimmedId;
      });
      if (exists) {
        setError(`A prop with ID "${trimmedId}" already exists. Please choose a unique ID.`);
        return;
      }
    } else if (mode === 'EDIT' && initialProp) {
      const currentInitialId = (initialProp.id || '').trim().toUpperCase();
      const existsOther = safeProps.some((p) => {
        if (!p) return false;
        const pid = typeof p === 'string' ? p : p.id || (p as any).propId;
        return (
          typeof pid === 'string' &&
          pid.trim().toUpperCase() === trimmedId &&
          pid.trim().toUpperCase() !== currentInitialId
        );
      });
      if (existsOther) {
        setError(`Another prop with ID "${trimmedId}" already exists.`);
        return;
      }
    }

    const narrativeSig =
      trimmedFunction || trimmedDescription || `${trimmedName} narrative artifact`;

    const savedProp: CanonProp = {
      id: trimmedId,
      name: trimmedName,
      narrativeSignificance: narrativeSig,
      ownerOrHolder: trimmedHolder || 'Unassigned',
      description: trimmedDescription || undefined,
      storyFunction: trimmedFunction || undefined,
      continuityDetails: trimmedContinuity || undefined,
    };

    onSave(savedProp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#1C2735] pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                {mode === 'ADD' ? 'Add Story Prop' : `Edit Prop (${initialProp?.id || id})`}
              </h3>
              <p className="text-xs text-[#79838E]">
                Narrative artifact, mechanical scale & Stage 2 prompt registry
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
          {/* Row 1: Stable ID & Prop Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-1">
                Stable ID *
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="PROP-04"
                disabled={mode === 'EDIT'}
                className={`w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white font-mono focus:border-purple-400 focus:outline-none ${
                  mode === 'EDIT' ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
              <span className="text-[10px] text-[#79838E] mt-0.5 block">
                {mode === 'ADD' ? 'Unique sequential ID' : 'Preserved immutable ID'}
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
                Prop Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Reverse Remorse Pocket Watch, Chipped Enamel Mug"
                required
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
              Description & Physical Appearance <span className="text-[#79838E] font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scale, materials (e.g. oxidized brass, blued steel hands, cracked ivory dial), surface wear, engravings..."
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
            />
          </div>

          {/* Story Function */}
          <div>
            <label className="block text-[11px] font-bold text-[#00AFFF] uppercase tracking-wider mb-1">
              Story Function <span className="text-[#79838E] font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={storyFunction}
              onChange={(e) => setStoryFunction(e.target.value)}
              placeholder="e.g. Antiquated timepiece that triggers the 60-second time loop upon active remorse..."
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white focus:border-[#00AFFF] focus:outline-none"
            />
          </div>

          {/* Holder / Owner */}
          <div>
            <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
              Holder / Owner <span className="text-[#79838E] font-normal lowercase">(optional)</span>
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                value={ownerOrHolder}
                onChange={(e) => setOwnerOrHolder(e.target.value)}
                placeholder="e.g. Mang Tomas (CHAR-01), Jun-Jun, or Unassigned"
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
              />
              {Array.isArray(characters) && characters.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[10px] text-[#79838E]">Quick select:</span>
                  {characters.map((char) => {
                    if (!char) return null;
                    const charLabel = `${char.name || 'Character'} (${char.id || 'CHAR'})`;
                    return (
                      <button
                        key={char.id || Math.random()}
                        type="button"
                        onClick={() => setOwnerOrHolder(charLabel)}
                        className="px-1.5 py-0.5 rounded bg-[#141C26] hover:bg-[#1C2735] text-[10px] text-[#00AFFF] font-mono border border-[#1C2735]"
                      >
                        {char.id || 'CHAR'}: {char.name || 'Unknown'}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Continuity Details */}
          <div>
            <label className="block text-[11px] font-bold text-[#F4A62A] uppercase tracking-wider mb-1">
              Continuity Details <span className="text-[#79838E] font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={continuityDetails}
              onChange={(e) => setContinuityDetails(e.target.value)}
              placeholder="e.g. Brass hunting case is scratched on bottom bezel; balance wheel glows faint blue during rewind; kept in wooden drawer until scene 2."
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-3 py-2 text-white focus:border-[#F4A62A] focus:outline-none"
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
              <span>{mode === 'ADD' ? 'Save Prop' : 'Update Prop'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
