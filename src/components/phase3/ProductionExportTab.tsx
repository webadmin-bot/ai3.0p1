import React, { useState } from 'react';
import {
  Download,
  FileText,
  Copy,
  Check,
  Package,
  Layers,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  generateUniversalExportPackage,
  compileUniversalAuditReport,
} from '../../services/exportSerializer';

export const ProductionExportTab: React.FC = () => {
  const { project, exportSingleProject } = useProject();

  const [copiedBible, setCopiedBible] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const exportPackage = generateUniversalExportPackage(project);
  const audit = exportPackage.auditSummary;

  const handleDownloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyBible = () => {
    navigator.clipboard.writeText(exportPackage.productionBibleMarkdown);
    setCopiedBible(true);
    setTimeout(() => setCopiedBible(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(exportPackage.flowManifestJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AFFF]/15 text-[#00AFFF] border border-[#00AFFF]/30 uppercase tracking-widest">
              Phase 3 — Authoritative Production Package
            </span>
            <span className="text-xs text-[#79838E]">
              Universal Export Synchronizer
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-['Exo_2'] text-white">
            Export Production Package
          </h2>
          <p className="text-xs text-[#8A96A6] max-w-2xl">
            Single authoritative export serializer guarantees exact dialogue preservation, timing synchronization, smart Flow routing, and objective audit reporting across Markdown, JSON, and CSV.
          </p>
        </div>
      </div>

      {/* Production Audit Summary Card */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1C2735] pb-2.5 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Authoritative Pre-Export Audit
            </span>
            <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-[#141C26] text-[#00AFFF]">
              {audit.totalPlannedRuntime}s Planned / {audit.targetRuntime}s Target
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              audit.issues.length === 0
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-950 text-amber-300 border border-amber-500/40'
            }`}
          >
            {audit.issues.length === 0 ? 'ALL EXPORT CHECKS PASSED' : `${audit.issues.length} AUDIT WARNINGS`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded bg-[#070B10] border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase block">Total Shots</span>
            <span className="font-mono text-white font-bold">{audit.totalShots} ({audit.ingredientsShotsCount} Ing / {audit.framesShotsCount} Frm)</span>
          </div>
          <div className="p-2.5 rounded bg-[#070B10] border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase block">Dialogue Lines</span>
            <span className="font-mono text-white font-bold">{audit.speechLinesCount} ({audit.missingSpeechCount} unmapped)</span>
          </div>
          <div className="p-2.5 rounded bg-[#070B10] border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase block">Media Readiness</span>
            <span className="font-mono text-white font-bold">{audit.missingMediaCount === 0 ? 'All Ready' : `${audit.missingMediaCount} Pending`}</span>
          </div>
          <div className="p-2.5 rounded bg-[#070B10] border border-[#1C2735]">
            <span className="text-[10px] text-[#79838E] uppercase block">Source State</span>
            <span className={`font-mono font-bold ${audit.isSourceStale ? 'text-rose-400' : 'text-emerald-400'}`}>
              {audit.isSourceStale ? 'SOURCE_STALE' : 'SYNCHRONIZED'}
            </span>
          </div>
        </div>

        {audit.issues.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-300 space-y-1">
            {audit.issues.map((iss, i) => (
              <div key={i} className="flex items-start space-x-1.5">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>{iss}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Production Bible Markdown */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-lg bg-[#141C26] text-[#00AFFF]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Full Video Production Bible</h3>
                <span className="text-[10px] text-[#79838E]">Markdown format (.md)</span>
              </div>
            </div>
            <p className="text-xs text-[#8A96A6] leading-relaxed">
              Complete pre-production document containing audit report, narrative foundation, visual style bible, character reference prompts, full scene screenplay, and master video prompts.
            </p>
          </div>

          <div className="pt-3 border-t border-[#1C2735] flex items-center justify-between">
            <button
              onClick={handleCopyBible}
              className="px-3 py-1.5 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-[#D7DCE2] border border-[#243346] text-xs font-semibold cursor-pointer flex items-center space-x-1"
            >
              {copiedBible ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBible ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() =>
                handleDownloadFile(
                  exportPackage.productionBibleMarkdown,
                  `${project.title.toLowerCase().replace(/\s+/g, '-')}-production-bible.md`,
                  'text/markdown'
                )
              }
              className="px-4 py-2 rounded-lg bg-[#00AFFF] hover:bg-[#0096DC] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Bible (.md)</span>
            </button>
          </div>
        </div>

        {/* Card 2: Google Flow Manifest JSON */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-lg bg-[#141C26] text-purple-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Google Flow Production Manifest</h3>
                <span className="text-[10px] text-[#79838E]">JSON Schema Payload</span>
              </div>
            </div>
            <p className="text-xs text-[#8A96A6] leading-relaxed">
              Standardized JSON manifest including all shot packages, camera movement physics, negative video prompts, audio cues, and continuity anchors.
            </p>
          </div>

          <div className="pt-3 border-t border-[#1C2735] flex items-center justify-between">
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-lg bg-[#141C26] hover:bg-[#1E2938] text-[#D7DCE2] border border-[#243346] text-xs font-semibold cursor-pointer flex items-center space-x-1"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() =>
                handleDownloadFile(
                  exportPackage.flowManifestJson,
                  `${project.title.toLowerCase().replace(/\s+/g, '-')}-flow-manifest.json`,
                  'application/json'
                )
              }
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Flow JSON</span>
            </button>
          </div>
        </div>

        {/* Card 3: Shot List CSV */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-lg bg-[#141C26] text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Filming Shot List (CSV)</h3>
                <span className="text-[10px] text-[#79838E]">Spreadsheet & Filming Sheet</span>
              </div>
            </div>
            <p className="text-xs text-[#8A96A6] leading-relaxed">
              Tabular breakdown of shot orders, sizes, lens parameters, camera movements, durations, blocking cues, and generation prompts ready for Google Sheets or Excel.
            </p>
          </div>

          <div className="pt-3 border-t border-[#1C2735] flex items-center justify-end">
            <button
              onClick={() =>
                handleDownloadFile(
                  exportPackage.shotListCsv,
                  `${project.title.toLowerCase().replace(/\s+/g, '-')}-shot-list.csv`,
                  'text/csv'
                )
              }
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* Card 4: Complete Project Backup */}
        <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-lg bg-[#141C26] text-amber-300">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Complete Project Backup (.json)</h3>
                <span className="text-[10px] text-[#79838E]">Full Studio State Backup</span>
              </div>
            </div>
            <p className="text-xs text-[#8A96A6] leading-relaxed">
              Complete standalone project backup file that can be re-imported into any XEMACS7 AI Film Studio workspace without data loss.
            </p>
          </div>

          <div className="pt-3 border-t border-[#1C2735] flex items-center justify-end">
            <button
              onClick={() => exportSingleProject()}
              className="px-4 py-2 rounded-lg bg-[#141C28] hover:bg-[#1E2938] text-white border border-[#243346] text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Project Backup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
