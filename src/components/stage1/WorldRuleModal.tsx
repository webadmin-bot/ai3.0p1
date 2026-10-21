import React, { useState, useEffect } from 'react';
import { X, Globe, AlertCircle, Save } from 'lucide-react';
import { CanonWorldRule } from '../../types/filmStudio';
import { getNextRuleId } from '../../services/canonHelpers';

interface WorldRuleModalProps {
  isOpen: boolean;
  mode: 'ADD' | 'EDIT';
  initialRule?: CanonWorldRule | null;
  existingRules: CanonWorldRule[];
  onSave: (rule: CanonWorldRule) => void;
  onClose: () => void;
}

export const WorldRuleModal: React.FC<WorldRuleModalProps> = ({
  isOpen,
  mode,
  initialRule,
  existingRules,
  onSave,
  onClose,
}) => {
  const [id, setId] = useState('');
  const [rule, setRule] = useState('');
  const [scope, setScope] = useState('Physical');
  const [consequence, setConsequence] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (mode === 'EDIT' && initialRule) {
        setId(initialRule.id);
        setRule(initialRule.rule);
        setScope(initialRule.scope || 'Physical');
        setConsequence(initialRule.consequence);
      } else {
        const nextId = getNextRuleId(existingRules);
        setId(nextId);
        setRule('');
        setScope('Supernatural');
        setConsequence('');
      }
    }
  }, [isOpen, mode, initialRule, existingRules]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = id.trim().toUpperCase();
    const trimmedRule = rule.trim();
    const trimmedConsequence = consequence.trim();

    if (!trimmedId || !trimmedRule || !trimmedConsequence) {
      setError('All fields are required.');
      return;
    }

    if (mode === 'ADD' && existingRules.some((r) => r.id.toUpperCase() === trimmedId)) {
      setError(`Rule with ID "${trimmedId}" already exists.`);
      return;
    }

    onSave({
      id: trimmedId,
      rule: trimmedRule,
      scope,
      consequence: trimmedConsequence,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
        <div className="flex items-start justify-between border-b border-[#1C2735] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00AFFF]/20 border border-[#00AFFF]/40 flex items-center justify-center text-[#00AFFF]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-base text-white">
                {mode === 'ADD' ? 'Add World Rule' : `Edit World Rule (${initialRule?.id})`}
              </h3>
              <p className="text-xs text-[#79838E]">
                Immutable physics, magic logic, societal constraints
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
                Rule ID *
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
                Scope / Category
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="Physical">Physical / Environmental</option>
                <option value="Supernatural">Supernatural / Temporal</option>
                <option value="Technological">Technological / Mechanical</option>
                <option value="Social">Social / Legal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
              Rule Statement *
            </label>
            <textarea
              rows={2}
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              placeholder="e.g. The Remorse Watch Loop resets 60 seconds whenever someone feels active guilt..."
              required
              className="w-full bg-[#111820] border border-[#1C2735] rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">
              Consequence of Violation / Trigger Mechanism *
            </label>
            <textarea
              rows={2}
              value={consequence}
              onChange={(e) => setConsequence(e.target.value)}
              placeholder="e.g. Flash of blue gears, memories preserved only in guilty subject..."
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
              <span>{mode === 'ADD' ? 'Save Rule' : 'Update Rule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
