import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, CheckSquare, Square, ShieldAlert } from 'lucide-react';

interface DeleteCanonConfirmModalProps {
  isOpen: boolean;
  itemType: 'Location' | 'Prop' | 'Character' | 'World Rule' | 'Beat' | 'Setup & Payoff';
  itemId: string;
  itemName: string;
  references: string[];
  onConfirm: (reconcileReferences: boolean) => void;
  onClose: () => void;
}

export const DeleteCanonConfirmModal: React.FC<DeleteCanonConfirmModalProps> = ({
  isOpen,
  itemType,
  itemId,
  itemName,
  references,
  onConfirm,
  onClose,
}) => {
  const [reconcileChecked, setReconcileChecked] = useState(false);

  if (!isOpen) return null;

  const hasReferences = references.length > 0;

  const handleConfirm = () => {
    onConfirm(reconcileChecked);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#1C2735] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-base text-white">
                Delete {itemType}
              </h3>
              <p className="font-mono text-xs text-[#79838E]">
                {itemId} — {itemName}
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

        {/* References Check Warning */}
        {hasReferences ? (
          <div className="space-y-3">
            <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-xl space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-amber-300 font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Active References Detected ({references.length})</span>
              </div>
              <p className="text-[#D7DCE2] leading-relaxed">
                This {itemType.toLowerCase()} is referenced elsewhere in your production structure. Deleting it without reconciliation may cause continuity issues in Canon Audit.
              </p>
              <div className="max-h-28 overflow-y-auto space-y-1 bg-[#070B10] p-2 rounded border border-[#1C2735] font-mono text-[11px] text-[#00AFFF]">
                {references.map((ref, idx) => (
                  <div key={idx} className="truncate">• {ref}</div>
                ))}
              </div>
            </div>

            <div
              onClick={() => setReconcileChecked(!reconcileChecked)}
              className="flex items-start space-x-2.5 p-3 rounded-lg bg-[#111820] border border-[#1C2735] cursor-pointer hover:border-[#2E3E52] transition-colors"
            >
              <div className="mt-0.5 text-[#00AFFF]">
                {reconcileChecked ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4 text-[#79838E]" />
                )}
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">
                  Safely reconcile references
                </span>
                <span className="text-[11px] text-[#79838E]">
                  Unlink or clear {itemId} from referring beats/scenes to preserve clean continuity.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#111820] border border-[#1C2735] p-3.5 rounded-xl text-xs space-y-2">
            <p className="text-[#D7DCE2]">
              Are you sure you want to remove <span className="font-mono text-[#00AFFF] font-bold">{itemId}</span> (<span className="text-white font-medium">{itemName}</span>) from Story Canon?
            </p>
            <p className="text-[11px] text-[#79838E]">
              This record is not referenced in beats or scenes. Deleting will mark Stage 1 as <span className="text-[#F4A62A] font-semibold">NEEDS RE-AUDIT</span>.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1C2735]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {hasReferences ? (reconcileChecked ? 'Reconcile & Delete' : 'Delete Anyway') : 'Delete'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
