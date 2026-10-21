import React from 'react';
import { X, Download, ExternalLink, Sparkles } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title: string;
  subtitle?: string;
  promptText?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
  promptText,
}) => {
  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-keyframe.png`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0B1017] border border-[#1C2735] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1C2735] flex items-center justify-between bg-[#0E1520]">
          <div className="min-w-0 pr-4">
            <h3 className="font-['Exo_2'] font-bold text-white text-base truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#79838E] font-mono truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-white text-xs font-semibold flex items-center space-x-1.5 border border-[#1C2735] transition-colors cursor-pointer"
              title="Download image"
            >
              <Download className="w-3.5 h-3.5 text-[#00AFFF]" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#79838E] hover:text-white hover:bg-[#1C2735] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Frame */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#070B10]">
          <div className="relative max-h-[60vh] max-w-full rounded-xl overflow-hidden border border-[#1C2735] shadow-xl">
            <img
              src={imageUrl}
              alt={title}
              className="max-h-[60vh] w-auto object-contain mx-auto"
              onError={(e) => {
                // Graceful fallback for broken image
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Footer with prompt */}
        {promptText && (
          <div className="p-4 border-t border-[#1C2735] bg-[#0E1520] space-y-1.5 text-xs">
            <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase tracking-wider text-[#00AFFF] font-bold">
              <Sparkles className="w-3 h-3" />
              <span>Keyframe Prompt Metadata</span>
            </div>
            <div className="bg-[#070B10] p-2.5 rounded-lg border border-[#1C2735] font-mono text-[11px] text-[#D7DCE2] max-h-24 overflow-y-auto leading-relaxed select-text">
              {promptText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
