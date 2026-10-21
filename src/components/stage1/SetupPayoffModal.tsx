import React, { useState, useEffect } from 'react';
import { X, Key, AlertCircle, Save } from 'lucide-react';
import { CanonSetupPayoff, CanonBeat } from '../../types/filmStudio';
import { getNextSetupPayoffId } from '../../services/canonHelpers';

interface SetupPayoffModalProps {
  isOpen: boolean;
  mode: 'ADD' | 'EDIT';
  initialItem?: CanonSetupPayoff | null;
  existingItems: CanonSetupPayoff[];
  beats: CanonBeat[];
  onSave: (item: CanonSetupPayoff) => void;
  onClose: () => void;
}

export const SetupPayoffModal: React.FC<SetupPayoffModalProps> = ({
  isOpen,
  mode,
  initialItem,
  existingItems,
  beats,
  onSave,
  onClose,
}) => {
  const [id, setId] = useState('');
  const [setupDescription, setSetupDescription] = useState('');
  const [introducedAtBeat, setIntroducedAtBeat] = useState('');
  const [payoffDescription, setPayoffDescription] = useState('');
  const [resolvedAtBeat, setResolvedAtBeat] = useState('');
  const [status, setStatus] = useState<'PLANTED' | 'PAID_OFF' | 'UNRESOLVED'>('PAID_OFF');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (mode === 'EDIT' && initialItem) {
        setId(initialItem.id);
        setSetupDescription(initialItem.setupDescription);
        setIntroducedAtBeat(initialItem.introducedAtBeat);
        setPayoffDescription(initialItem.payoffDescription);
        setResolvedAtBeat(initialItem.resolvedAtBeat);
        setStatus(initialItem.status);
      } else {
        const nextId = getNextSetupPayoffId(existingItems);
        setId(nextId);
        setSetupDescription('');
        setIntroducedAtBeat(beats[0]?.id || 'BEAT-01');
        setPayoffDescription('');
        setResolvedAtBeat(beats[beats.length - 1]?.id || 'BEAT-04');
        setStatus('PAID_OFF');
      }
    }
  }, [isOpen, mode, initialItem, existingItems, beats]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = id.trim().toUpperCase();
    const trimmedSetup = setupDescription.trim();
    const trimmedPayoff = payoffDescription.trim();

    if (!trimmedId || !trimmedSetup || !trimmedPayoff) {
      setError('ID, Setup, and Payoff descriptions are required.');
      return;
    }

    onSave({
      id: trimmedId,
      setupDescription: trimmedSetup,
      introducedAtBeat: introducedAtBeat || 'BEAT-01',
      payoffDescription: trimmedPayoff,
      resolvedAtBeat: resolvedAtBeat || 'BEAT-04',
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
        <div className="flex items-start justify-between border-b border-[#1C2735] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-base text-white">
                {mode === 'ADD' ? 'Add Setup & Payoff' : `Edit Setup & Payoff (${initialItem?.id})`}
              </h3>
              <p className="text-xs text-[#79838E]">
                Narrative plants, emotional payoffs & resolution ledger
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#00AFFF] uppercase tracking-wider mb-1">
                Ledger ID *
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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="PLANTED">PLANTED</option>
                <option value="PAID_OFF">PAID_OFF</option>
                <option value="UNRESOLVED">UNRESOLVED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
              Setup (Planted Event / Prop / Line) *
            </label>
            <textarea
              rows={2}
              value={setupDescription}
              onChange={(e) => setSetupDescription(e.target.value)}
              placeholder="e.g. The kettle whistling softly on the small gas stove in beat 1..."
              required
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#79838E] uppercase tracking-wider mb-1">
                Introduced at Beat
              </label>
              <select
                value={introducedAtBeat}
                onChange={(e) => setIntroducedAtBeat(e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white font-mono"
              >
                {beats.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id}: {b.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#79838E] uppercase tracking-wider mb-1">
                Resolved at Beat
              </label>
              <select
                value={resolvedAtBeat}
                onChange={(e) => setResolvedAtBeat(e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white font-mono"
              >
                {beats.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id}: {b.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
              Payoff (Resolution / Climax Event) *
            </label>
            <textarea
              rows={2}
              value={payoffDescription}
              onChange={(e) => setPayoffDescription(e.target.value)}
              placeholder="e.g. The hot ginger tea poured for Jun-Jun once the loop halts..."
              required
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
              <span>{mode === 'ADD' ? 'Save Setup/Payoff' : 'Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
