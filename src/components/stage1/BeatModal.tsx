import React, { useState, useEffect } from 'react';
import { X, ListOrdered, AlertCircle, Save } from 'lucide-react';
import { CanonBeat, CanonLocation, CanonCharacter } from '../../types/filmStudio';
import { getNextBeatId } from '../../services/canonHelpers';

interface BeatModalProps {
  isOpen: boolean;
  mode: 'ADD' | 'EDIT';
  initialBeat?: CanonBeat | null;
  existingBeats: CanonBeat[];
  locations: CanonLocation[];
  characters: CanonCharacter[];
  onSave: (beat: CanonBeat) => void;
  onClose: () => void;
}

export const BeatModal: React.FC<BeatModalProps> = ({
  isOpen,
  mode,
  initialBeat,
  existingBeats,
  locations,
  characters,
  onSave,
  onClose,
}) => {
  const [id, setId] = useState('');
  const [actOrEpisode, setActOrEpisode] = useState('Act 1');
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [causalConnection, setCausalConnection] = useState('');
  const [emotionalBeat, setEmotionalBeat] = useState('');
  const [estimatedSeconds, setEstimatedSeconds] = useState(60);
  const [locationId, setLocationId] = useState('');
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (mode === 'EDIT' && initialBeat) {
        setId(initialBeat.id);
        setActOrEpisode(initialBeat.actOrEpisode);
        setSequenceNumber(initialBeat.sequenceNumber);
        setTitle(initialBeat.title);
        setDescription(initialBeat.description);
        setCausalConnection(initialBeat.causalConnection);
        setEmotionalBeat(initialBeat.emotionalBeat);
        setEstimatedSeconds(initialBeat.estimatedSeconds || 60);
        setLocationId(initialBeat.locationId || (locations[0]?.id || ''));
        setSelectedChars(initialBeat.charactersPresent || []);
      } else {
        const nextId = getNextBeatId(existingBeats);
        setId(nextId);
        setActOrEpisode('Act 1');
        setSequenceNumber(existingBeats.length + 1);
        setTitle('');
        setDescription('');
        setCausalConnection('');
        setEmotionalBeat('');
        setEstimatedSeconds(60);
        setLocationId(locations[0]?.id || '');
        setSelectedChars(characters.slice(0, 2).map((c) => c.id));
      }
    }
  }, [isOpen, mode, initialBeat, existingBeats, locations, characters]);

  if (!isOpen) return null;

  const toggleChar = (charId: string) => {
    if (selectedChars.includes(charId)) {
      setSelectedChars(selectedChars.filter((c) => c !== charId));
    } else {
      setSelectedChars([...selectedChars, charId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = id.trim().toUpperCase();
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedCausal = causalConnection.trim();

    if (!trimmedId || !trimmedTitle || !trimmedDesc || !trimmedCausal) {
      setError('ID, Title, Description, and Causal Connection are required.');
      return;
    }

    onSave({
      id: trimmedId,
      actOrEpisode,
      sequenceNumber: Number(sequenceNumber) || 1,
      title: trimmedTitle,
      description: trimmedDesc,
      causalConnection: trimmedCausal,
      emotionalBeat: emotionalBeat.trim() || 'Tension & revelation',
      estimatedSeconds: Number(estimatedSeconds) || 60,
      charactersPresent: selectedChars,
      locationId: locationId || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto text-xs">
        <div className="flex items-start justify-between border-b border-[#1C2735] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00AFFF]/20 border border-[#00AFFF]/40 flex items-center justify-center text-[#00AFFF]">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-base text-white">
                {mode === 'ADD' ? 'Add Narrative Beat' : `Edit Beat (${initialBeat?.id})`}
              </h3>
              <p className="text-xs text-[#79838E]">
                Causal sequencing, emotional turning points & timing
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#79838E] hover:text-white p-1 rounded-lg hover:bg-[#141C26]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-950/70 border border-red-500/50 p-2.5 rounded-lg text-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#00AFFF] uppercase tracking-wider mb-1">
                Beat ID *
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={mode === 'EDIT'}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
                Act / Sequence
              </label>
              <input
                type="text"
                value={actOrEpisode}
                onChange={(e) => setActOrEpisode(e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
                Est. Seconds
              </label>
              <input
                type="number"
                value={estimatedSeconds}
                onChange={(e) => setEstimatedSeconds(Number(e.target.value))}
                min={10}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
              Beat Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Blackout Break-In"
              required
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
              Description *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happens in this sequence..."
              required
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#F4A62A] uppercase tracking-wider mb-1">
              Causal Chain (Why this happens because of prior beats) *
            </label>
            <textarea
              rows={2}
              value={causalConnection}
              onChange={(e) => setCausalConnection(e.target.value)}
              placeholder="Strict causality connection to preceding actions..."
              required
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
                Location
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white font-mono"
              >
                <option value="">Unspecified</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.id}: {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
                Emotional Beat
              </label>
              <input
                type="text"
                value={emotionalBeat}
                onChange={(e) => setEmotionalBeat(e.target.value)}
                placeholder="e.g. Panic and disorientation"
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
              Characters Present
            </label>
            <div className="flex flex-wrap gap-1.5">
              {characters.map((c) => {
                const isSelected = selectedChars.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleChar(c.id)}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                      isSelected
                        ? 'bg-[#00AFFF]/20 border-[#00AFFF] text-white font-bold'
                        : 'bg-[#111820] border-[#1C2735] text-[#79838E]'
                    }`}
                  >
                    {c.id} ({c.name})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1C2735]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold rounded-lg flex items-center space-x-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{mode === 'ADD' ? 'Save Beat' : 'Update Beat'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
