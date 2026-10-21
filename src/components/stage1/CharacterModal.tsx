import React, { useState, useEffect } from 'react';
import { X, User, AlertCircle, Save } from 'lucide-react';
import { CanonCharacter } from '../../types/filmStudio';
import { getNextCharacterId } from '../../services/canonHelpers';

interface CharacterModalProps {
  isOpen: boolean;
  mode: 'ADD' | 'EDIT';
  initialCharacter?: CanonCharacter | null;
  existingCharacters: CanonCharacter[];
  onSave: (char: CanonCharacter) => void;
  onClose: () => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  mode,
  initialCharacter,
  existingCharacters,
  onSave,
  onClose,
}) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'PROTAGONIST' | 'ANTAGONIST' | 'DEUTERAGONIST' | 'SUPPORTING' | 'CATALYST'>('SUPPORTING');
  const [age, setAge] = useState('');
  const [archetype, setArchetype] = useState('');
  const [personalityVoice, setPersonalityVoice] = useState('');
  const [want, setWant] = useState('');
  const [need, setNeed] = useState('');
  const [motivation, setMotivation] = useState('');
  const [weakness, setWeakness] = useState('');
  const [internalConflict, setInternalConflict] = useState('');
  const [externalConflict, setExternalConflict] = useState('');
  const [arc, setArc] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (mode === 'EDIT' && initialCharacter) {
        setId(initialCharacter.id);
        setName(initialCharacter.name);
        setRole(initialCharacter.role || 'SUPPORTING');
        setAge(initialCharacter.age || '');
        setArchetype(initialCharacter.archetype || '');
        setPersonalityVoice(initialCharacter.personalityVoice || '');
        setWant(initialCharacter.want || '');
        setNeed(initialCharacter.need || '');
        setMotivation(initialCharacter.motivation || '');
        setWeakness(initialCharacter.weakness || '');
        setInternalConflict(initialCharacter.internalConflict || '');
        setExternalConflict(initialCharacter.externalConflict || '');
        setArc(initialCharacter.arc || '');
      } else {
        const nextId = getNextCharacterId(existingCharacters);
        setId(nextId);
        setName('');
        setRole('SUPPORTING');
        setAge('');
        setArchetype('');
        setPersonalityVoice('');
        setWant('');
        setNeed('');
        setMotivation('');
        setWeakness('');
        setInternalConflict('');
        setExternalConflict('');
        setArc('');
      }
    }
  }, [isOpen, mode, initialCharacter, existingCharacters]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = id.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedId || !trimmedName) {
      setError('Character ID and Name are required.');
      return;
    }

    if (mode === 'ADD' && existingCharacters.some((c) => c.id.toUpperCase() === trimmedId)) {
      setError(`Character with ID "${trimmedId}" already exists.`);
      return;
    }

    const saved: CanonCharacter = {
      id: trimmedId,
      name: trimmedName,
      role,
      age: age.trim() || undefined,
      archetype: archetype.trim() || 'Archetype',
      personalityVoice: personalityVoice.trim() || 'Naturalistic voice',
      want: want.trim() || 'Clear objective',
      need: need.trim() || 'Internal growth',
      motivation: motivation.trim() || want.trim() || 'Core motivation',
      weakness: weakness.trim() || 'Fatal flaw',
      internalConflict: internalConflict.trim() || 'Doubt vs responsibility',
      externalConflict: externalConflict.trim() || 'Environmental obstacle',
      arc: arc.trim() || 'Transformation from resistance to understanding',
    };

    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto text-xs">
        <div className="flex items-start justify-between border-b border-[#1C2735] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00AFFF]/20 border border-[#00AFFF]/40 flex items-center justify-center text-[#00AFFF]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                {mode === 'ADD' ? 'Add Canon Character' : `Edit Character (${initialCharacter?.id})`}
              </h3>
              <p className="text-xs text-[#79838E]">
                Dramatis personae, psychological conflict & character voice
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
                ID *
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
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#F4A62A] uppercase tracking-wider mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="PROTAGONIST">PROTAGONIST</option>
                <option value="ANTAGONIST">ANTAGONIST</option>
                <option value="DEUTERAGONIST">DEUTERAGONIST</option>
                <option value="SUPPORTING">SUPPORTING</option>
                <option value="CATALYST">CATALYST</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#79838E] uppercase tracking-wider mb-1">
                Archetype
              </label>
              <input
                type="text"
                value={archetype}
                onChange={(e) => setArchetype(e.target.value)}
                placeholder="e.g. Master Craftsman, Reluctant Thief"
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#79838E] uppercase tracking-wider mb-1">
                Age
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 78, 16"
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
              Personality & Voice
            </label>
            <input
              type="text"
              value={personalityVoice}
              onChange={(e) => setPersonalityVoice(e.target.value)}
              placeholder="e.g. Quiet, deliberate cadence, speaks with unhurried authority"
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                Want (External)
              </label>
              <input
                type="text"
                value={want}
                onChange={(e) => setWant(e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                Need (Subconscious)
              </label>
              <input
                type="text"
                value={need}
                onChange={(e) => setNeed(e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">
              Weakness / Fatal Flaw
            </label>
            <input
              type="text"
              value={weakness}
              onChange={(e) => setWeakness(e.target.value)}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#00AFFF] uppercase tracking-wider mb-1">
              Narrative Arc
            </label>
            <textarea
              rows={2}
              value={arc}
              onChange={(e) => setArc(e.target.value)}
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
            />
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
              <span>{mode === 'ADD' ? 'Save Character' : 'Update Character'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
