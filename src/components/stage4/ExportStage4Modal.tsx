import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, Code, FileCode } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

interface ExportStage4ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportStage4Modal: React.FC<ExportStage4ModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { project } = useProject();
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const packages = project.stage4.shotPackages || [];
  const title = project.title || 'Untitled Film';
  const approvedVersion = project.stage4.approvedVersion || 1;
  const visualStyle = project.visualStyle?.name || 'Cinematic Realism';
  const targetRuntime = packages.reduce((acc, p) => acc + p.plannedDuration, 0);

  // Generate TXT Content
  const generateTxtExport = (): string => {
    const lines = [
      `================================================================================`,
      `XEMACS7 AI FILM STUDIO 2.0 — STAGE 4: GOOGLE FLOW PRODUCTION PACKAGE`,
      `Project: ${title}`,
      `Visual Style: ${visualStyle} | Aspect Ratio: ${project.settings?.aspectRatio || '9:16'}`,
      `Total Shots: ${packages.length} | Planned Runtime: ${targetRuntime}s`,
      `Generated At: ${new Date().toISOString()}`,
      `================================================================================`,
      ``,
    ];

    packages.forEach((pkg, idx) => {
      lines.push(
        `--------------------------------------------------------------------------------`,
        `SHOT #${idx + 1}: [${pkg.shotId}] | SCENE: ${pkg.sceneId} | ROUTE: ${pkg.flowMode} | DURATION: ${pkg.plannedDuration}s`,
        `Purpose: ${pkg.purpose}`,
        `Text Readiness: ${pkg.textReadiness} | Media Readiness: ${pkg.mediaReadiness}`,
        `Target Model: ${pkg.targetModel} (${pkg.capabilityStatus})`,
        `--------------------------------------------------------------------------------`
      );

      if (pkg.flowMode === 'FRAMES' && pkg.firstFramePrompt) {
        lines.push(
          `FIRST FRAME IMAGE PROMPT (${pkg.firstFrameMediaStatus}):`,
          pkg.firstFramePrompt,
          ``
        );
        if (pkg.endFramePrompt) {
          lines.push(
            `END FRAME IMAGE PROMPT (${pkg.endFrameMediaStatus}):`,
            pkg.endFramePrompt,
            ``
          );
        }
      }

      if (pkg.flowMode === 'INGREDIENTS' && pkg.referenceChecklist?.length) {
        lines.push(`INGREDIENTS REFERENCE CHECKLIST:`);
        pkg.referenceChecklist.forEach((ref) => {
          lines.push(`  - [${ref.assetId}] (${ref.assetType}) ${ref.assetName} [Role: ${ref.role}] — ${ref.mediaStatus}`);
        });
        lines.push(``);
      }

      lines.push(
        `VIDEO PROMPT:`,
        pkg.videoPrompt,
        ``,
        `AUDIO LANES:`,
        `  - Dialogue: ${pkg.audioLanes?.dialogue || 'None'}`,
        `  - Narration/VO: ${pkg.audioLanes?.narrationOrVO || 'None'}`,
        `  - Ambience: ${pkg.audioLanes?.ambience || 'None'}`,
        `  - SFX: ${pkg.audioLanes?.sfx || 'None'}`,
        `  - Music: ${pkg.audioLanes?.music || 'None'}`,
        `  - Lip-Sync Required: ${pkg.audioLanes?.lipSyncRequired ? 'YES' : 'NO'}`,
        ``,
        `ACTION TIMING:`,
        ...(pkg.actionTiming || []).map((t) => `  - ${t.timeRange}: ${t.action}`),
        ``,
        `CONTINUITY ANCHORS:`,
        `  - Entry: ${pkg.continuityAnchors?.entryVisualState || 'N/A'}`,
        `  - Exit: ${pkg.continuityAnchors?.exitVisualState || 'N/A'}`,
        `  - Screen Direction: ${pkg.continuityAnchors?.screenDirection || 'N/A'}`,
        `  - Hand/Prop: ${pkg.continuityAnchors?.propAndHandState || 'N/A'}`,
        `  - Lighting: ${pkg.continuityAnchors?.lightingAtmosphere || 'N/A'}`,
        ``,
        `EXCLUSIONS:`,
        ...(pkg.exclusions || []).map((ex) => `  - ${ex}`),
        ``,
        ``
      );
    });

    return lines.join('\n');
  };

  // Generate Markdown Content
  const generateMarkdownExport = (): string => {
    const lines = [
      `# ${title} — Google Flow Production Package V${approvedVersion}`,
      ``,
      `- **Visual Style**: ${visualStyle}`,
      `- **Aspect Ratio**: ${project.settings?.aspectRatio || '9:16'}`,
      `- **Planned Runtime**: ${targetRuntime}s across ${packages.length} shots`,
      `- **Timestamp**: ${new Date().toISOString()}`,
      ``,
      `---`,
      ``,
    ];

    packages.forEach((pkg, idx) => {
      lines.push(
        `## Shot #${idx + 1}: \`${pkg.shotId}\` (${pkg.flowMode} • ${pkg.plannedDuration}s)`,
        ``,
        `- **Scene**: \`${pkg.sceneId}\``,
        `- **Purpose**: ${pkg.purpose}`,
        `- **Readiness**: \`${pkg.textReadiness}\` / \`${pkg.mediaReadiness}\``,
        `- **Model Compatibility**: ${pkg.targetModel} (\`${pkg.capabilityStatus}\`)`,
        ``
      );

      if (pkg.flowMode === 'FRAMES' && pkg.firstFramePrompt) {
        lines.push(
          `### 🖼️ First Frame Keyframe Prompt (\`${pkg.firstFrameMediaStatus}\`)`,
          `\`\`\`text`,
          pkg.firstFramePrompt,
          `\`\`\``,
          ``
        );
      }

      if (pkg.flowMode === 'INGREDIENTS' && pkg.referenceChecklist?.length) {
        lines.push(
          `### 📦 Reference Checklist`,
          `| Asset ID | Type | Name | Role | Media Status |`,
          `| :--- | :--- | :--- | :--- | :--- |`,
          ...pkg.referenceChecklist.map(
            (ref) =>
              `| \`${ref.assetId}\` | ${ref.assetType} | ${ref.assetName} | ${ref.role} | \`${ref.mediaStatus}\` |`
          ),
          ``
        );
      }

      lines.push(
        `### 🎬 Video Prompt`,
        `\`\`\`text`,
        pkg.videoPrompt,
        `\`\`\``,
        ``,
        `### 🔊 Audio Lanes`,
        `- **Dialogue**: ${pkg.audioLanes?.dialogue || 'None'}`,
        `- **Narration / VO**: ${pkg.audioLanes?.narrationOrVO || 'None'}`,
        `- **Ambience**: ${pkg.audioLanes?.ambience || 'None'}`,
        `- **SFX**: ${pkg.audioLanes?.sfx || 'None'}`,
        `- **Music**: ${pkg.audioLanes?.music || 'None'}`,
        `- **Lip-Sync Required**: ${pkg.audioLanes?.lipSyncRequired ? 'YES' : 'NO'}`,
        ``,
        `### ⏱️ Action Timing`,
        ...(pkg.actionTiming || []).map((t) => `- \`${t.timeRange}\`: ${t.action}`),
        ``,
        `### ⚓ Continuity Anchors`,
        `- **Entry State**: ${pkg.continuityAnchors?.entryVisualState || 'N/A'}`,
        `- **Exit State**: ${pkg.continuityAnchors?.exitVisualState || 'N/A'}`,
        `- **Screen Direction**: ${pkg.continuityAnchors?.screenDirection || 'N/A'}`,
        `- **Hand / Prop**: ${pkg.continuityAnchors?.propAndHandState || 'N/A'}`,
        `- **Lighting**: ${pkg.continuityAnchors?.lightingAtmosphere || 'N/A'}`,
        ``,
        `---`,
        ``
      );
    });

    return lines.join('\n');
  };

  // Generate JSON Content
  const generateJsonExport = (): string => {
    const payload = {
      meta: {
        studio: 'XEMACS7 AI FILM STUDIO 2.0',
        stage: 'STAGE_4_GOOGLE_FLOW_PRODUCTION',
        projectTitle: title,
        visualStyle,
        aspectRatio: project.settings?.aspectRatio || '9:16',
        totalShots: packages.length,
        totalPlannedRuntimeSeconds: targetRuntime,
        exportedAt: new Date().toISOString(),
      },
      upstreamLocks: {
        stage1Locked: project.stage1.locked,
        stage2Locked: project.stage2.locked,
        stage3Locked: project.stage3.locked,
      },
      shots: packages,
    };
    return JSON.stringify(payload, null, 2);
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // fallback
    }
  };

  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0">
        {/* Header */}
        <div className="bg-[#111820] border-b border-[#1C2735] p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00AFFF]/10 border border-[#00AFFF]/30 flex items-center justify-center text-[#00AFFF]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#00AFFF] uppercase tracking-wider">
                PRODUCTION EXPORT
              </span>
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                Export Google Flow Video Prompts
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#79838E] hover:text-white p-2 rounded-lg hover:bg-[#1C2735] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-[#D7DCE2] leading-relaxed">
            Download or copy complete, formatted video prompts and reference assembly instructions for all{' '}
            <strong className="text-white">{packages.length} shots</strong> in your project.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* TXT Format */}
            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#1C2735] flex items-center justify-center text-[#00AFFF]">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-sm">Plain Text (.txt)</h4>
                <p className="text-[11px] text-[#79838E]">
                  Human-readable plaintext format ready for desktop paste workflows.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#1C2735]">
                <button
                  onClick={() =>
                    downloadFile(
                      generateTxtExport(),
                      `${safeTitle}-google-flow-v${approvedVersion}.txt`,
                      'text/plain;charset=utf-8'
                    )
                  }
                  className="w-full py-2 bg-[#00AFFF] hover:bg-[#0090D0] text-white font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download TXT</span>
                </button>
                <button
                  onClick={() => copyToClipboard(generateTxtExport(), 'txt')}
                  className="w-full py-1.5 bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-[#1C2735]"
                >
                  {copiedType === 'txt' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Markdown Format */}
            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#1C2735] flex items-center justify-center text-[#F4A62A]">
                  <FileCode className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-sm">Markdown (.md)</h4>
                <p className="text-[11px] text-[#79838E]">
                  Structured Markdown with tables, code blocks, and shot headings.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#1C2735]">
                <button
                  onClick={() =>
                    downloadFile(
                      generateMarkdownExport(),
                      `${safeTitle}-google-flow-v${approvedVersion}.md`,
                      'text/markdown;charset=utf-8'
                    )
                  }
                  className="w-full py-2 bg-[#F4A62A] hover:bg-amber-500 text-black font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MD</span>
                </button>
                <button
                  onClick={() => copyToClipboard(generateMarkdownExport(), 'md')}
                  className="w-full py-1.5 bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-[#1C2735]"
                >
                  {copiedType === 'md' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* JSON Format */}
            <div className="bg-[#111820] border border-[#1C2735] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#1C2735] flex items-center justify-center text-emerald-400">
                  <Code className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-sm">Structured JSON</h4>
                <p className="text-[11px] text-[#79838E]">
                  Machine-readable JSON schema with full per-shot arrays and metadata.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#1C2735]">
                <button
                  onClick={() =>
                    downloadFile(
                      generateJsonExport(),
                      `${safeTitle}-google-flow-v${approvedVersion}.json`,
                      'application/json;charset=utf-8'
                    )
                  }
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </button>
                <button
                  onClick={() => copyToClipboard(generateJsonExport(), 'json')}
                  className="w-full py-1.5 bg-[#141C26] hover:bg-[#1C2735] text-[#D7DCE2] font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-[#1C2735]"
                >
                  {copiedType === 'json' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#111820] border-t border-[#1C2735] p-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#141C26] hover:bg-[#1C2735] text-white text-xs font-semibold rounded-lg border border-[#1C2735] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
