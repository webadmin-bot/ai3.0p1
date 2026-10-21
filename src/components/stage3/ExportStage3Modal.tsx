import React, { useState } from 'react';
import { X, Copy, Download, Check, FileText, Film, Layers } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

interface ExportStage3ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportStage3Modal: React.FC<ExportStage3ModalProps> = ({ isOpen, onClose }) => {
  const { project } = useProject();
  const [activeFormat, setActiveFormat] = useState<'MARKDOWN' | 'TXT' | 'JSON'>('MARKDOWN');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scenes = project.stage3.scenes || [];
  const shots = project.stage3.shots || [];
  const totalRuntime = shots.reduce((acc, s) => acc + s.duration, 0);

  const generateMarkdown = () => {
    let md = `# ${project.title} — Production Script & Visual Shot Plan V1\n\n`;
    md += `**Project:** XEMACS7 AI Film Studio 2.0\n`;
    md += `**Source Mode:** ${project.storySourceMode}\n`;
    md += `**Master Visual Style:** ${project.visualStyle.name} (${project.visualStyle.medium})\n`;
    md += `**Total Planned Shot Runtime:** ${totalRuntime} seconds across ${shots.length} shots\n`;
    md += `**Status:** ${project.stage3.locked ? 'APPROVED & LOCKED' : 'DRAFT / WORK IN PROGRESS'}\n\n`;
    md += `---\n\n`;
    md += `## PART 1: PRODUCTION SCRIPT V1\n\n`;

    scenes.forEach((sc) => {
      md += `### ${sc.sceneId}: ${sc.title}\n`;
      md += `**Location:** ${sc.locationId} | **Time:** ${sc.timeOfDay} | **Est. Duration:** ${sc.estimatedSceneDuration}s\n`;
      md += `**Characters:** ${sc.characterIds.join(', ')}\n\n`;
      md += `\`\`\`fountain\n${sc.scriptText}\n\`\`\`\n\n`;
    });

    md += `---\n\n`;
    md += `## PART 2: VISUAL SHOT PLAN V1 (Strict 6s / 8s / 10s Standard)\n\n`;

    shots.forEach((sh) => {
      md += `### ${sh.shotId} (Scene ${sh.sceneId}) — [${sh.duration}s] — Flow Route: ${sh.flowMode}\n`;
      md += `- **Purpose:** ${sh.purpose}\n`;
      md += `- **Camera & Lens:** ${sh.shotSize} | ${sh.cameraAngle} | ${sh.cameraMovement} (${sh.lensIntent || 'Standard lens'})\n`;
      md += `- **Staging & Blocking:** ${sh.blockingAndMovement}\n`;
      md += `- **Lighting & Atmosphere:** ${sh.lightingAndAtmosphere}\n`;
      md += `- **Characters & Props:** Assets: ${sh.characterIds.join(', ')} | Location: ${sh.locationId}\n`;
      if (sh.flowMode === 'FRAMES' && sh.firstFramePrompt) {
        md += `- **First Frame Image Prompt:** \`${sh.firstFramePrompt}\`\n`;
      }
      md += `- **Routing Reason:** ${sh.routingReason}\n\n`;
    });

    return md;
  };

  const generatePlainText = () => {
    let txt = `====================================================\n`;
    txt += `${project.title.toUpperCase()}\nPRODUCTION SCRIPT & SHOT PLAN V1\n`;
    txt += `Total Runtime: ${totalRuntime}s | Shots: ${shots.length} | Scenes: ${scenes.length}\n`;
    txt += `====================================================\n\n`;

    scenes.forEach((sc) => {
      txt += `--- ${sc.sceneId}: ${sc.title} (${sc.estimatedSceneDuration}s) ---\n`;
      txt += `${sc.scriptText}\n\n`;
    });

    txt += `====================================================\n`;
    txt += `VISUAL SHOT PLAN\n`;
    txt += `====================================================\n\n`;

    shots.forEach((sh) => {
      txt += `[${sh.shotId}] (${sh.duration}s - ${sh.flowMode})\n`;
      txt += `Camera: ${sh.shotSize} / ${sh.cameraAngle} / ${sh.cameraMovement}\n`;
      txt += `Blocking: ${sh.blockingAndMovement}\n`;
      txt += `Lighting: ${sh.lightingAndAtmosphere}\n`;
      if (sh.firstFramePrompt) {
        txt += `First Frame Prompt: ${sh.firstFramePrompt}\n`;
      }
      txt += `\n`;
    });

    return txt;
  };

  const generateJson = () => {
    return JSON.stringify(
      {
        projectTitle: project.title,
        version: project.stage3.approvedVersion || 1,
        sourceMode: project.storySourceMode,
        visualStyle: project.visualStyle,
        totalPlannedRuntimeSeconds: totalRuntime,
        scenes,
        shots,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  };

  const currentContent =
    activeFormat === 'MARKDOWN'
      ? generateMarkdown()
      : activeFormat === 'TXT'
      ? generatePlainText()
      : generateJson();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeFormat === 'MARKDOWN' ? 'md' : activeFormat === 'TXT' ? 'txt' : 'json';
    const mime = activeFormat === 'JSON' ? 'application/json' : 'text/plain';
    const blob = new Blob([currentContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}_Stage3_Package.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="p-5 border-b border-[#1C2735] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Exo_2'] font-bold text-white text-base">
                Export Stage 3 Package
              </h3>
              <p className="text-[11px] text-[#79838E]">
                Production Script V1 & Visual Shot Plan V1 ready for distribution.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#79838E] hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Bar */}
        <div className="px-5 py-3 border-b border-[#1C2735] bg-[#0E1520] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            {(['MARKDOWN', 'TXT', 'JSON'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setActiveFormat(fmt)}
                className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                  activeFormat === fmt
                    ? 'bg-[#00AFFF] text-white shadow-md shadow-[#00AFFF]/20'
                    : 'bg-[#111820] text-[#79838E] hover:text-white border border-[#1C2735]'
                }`}
              >
                .{fmt.toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#111820] hover:bg-[#1C2735] text-white text-xs flex items-center space-x-1.5 border border-[#1C2735] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-[#00AFFF]/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] text-[#D7DCE2] bg-[#070B10] leading-relaxed whitespace-pre-wrap select-text">
          {currentContent}
        </div>
      </div>
    </div>
  );
};
