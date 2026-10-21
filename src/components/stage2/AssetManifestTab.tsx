import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Search,
  Filter,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { VisualAsset } from '../../types/filmStudio';

export const AssetManifestTab: React.FC = () => {
  const { project, updateStage2Asset } = useProject();
  const assets = project.stage2.assets;

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredAssets = assets.filter((asset) => {
    if (categoryFilter !== 'ALL' && asset.type !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.id.toLowerCase().includes(q) ||
        asset.storyFunction.toLowerCase().includes(q) ||
        asset.referencePrompt.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopySinglePrompt = (asset: VisualAsset) => {
    navigator.clipboard.writeText(asset.referencePrompt);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllPrompts = () => {
    const formatted = assets
      .map((a) => `### [${a.id}] ${a.name} (${a.type})\n${a.referencePrompt}\n`)
      .join('\n---\n\n');

    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const content = `# XEMACS7 STUDIO AI — VISUAL PROMPT PACKAGE V1
Project: ${project.title}
Visual Style: ${project.visualStyle.name} (${project.visualStyle.category})
Generated: ${new Date().toLocaleDateString()}

${assets
  .map(
    (a) => `## [${a.id}] ${a.name}
- **Type**: ${a.type}
- **Importance**: ${a.importance}
- **Story Function**: ${a.storyFunction}
- **Canon Anchors**: ${(a.sourceCanonIds || []).join(', ') || 'N/A'}

### Master Image Generation Prompt
\`\`\`
${a.referencePrompt}
\`\`\`
${
  a.turnaroundPrompt
    ? `### Turnaround Reference Prompt\n\`\`\`\n${a.turnaroundPrompt}\n\`\`\`\n`
    : ''
}
`
  )
  .join('\n---\n\n')}`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/\s+/g, '_')}_Visual_Prompt_Package_V1.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (assets.length === 0) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-[#141C26] border border-[#1C2735] flex items-center justify-center text-[#00AFFF] mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="font-['Exo_2'] font-bold text-lg text-white">
          Asset Manifest Empty
        </h3>
        <p className="text-xs text-[#79838E] max-w-md mx-auto">
          Generate visual prompts using the pipeline to populate the normalized visual asset manifest.
        </p>
      </div>
    );
  }

  const charCount = assets.filter((a) => a.type === 'CHARACTER').length;
  const wardCount = assets.filter((a) => a.type === 'WARDROBE').length;
  const locCount = assets.filter((a) => a.type === 'LOCATION').length;
  const propCount = assets.filter((a) => a.type === 'PROP' || a.type === 'SPECIAL').length;

  return (
    <div className="space-y-5">
      {/* Manifest Top Controls */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'CHARACTER', 'WARDROBE', 'LOCATION', 'PROP', 'SPECIAL'].map((cat) => {
            const count =
              cat === 'ALL'
                ? assets.length
                : cat === 'CHARACTER'
                ? charCount
                : cat === 'WARDROBE'
                ? wardCount
                : cat === 'LOCATION'
                ? locCount
                : assets.filter((a) => a.type === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#00AFFF] text-white'
                    : 'bg-[#111820] text-[#79838E] hover:text-[#D7DCE2] border border-[#1C2735]'
                }`}
              >
                <span>{cat}</span>
                <span className="ml-1.5 font-mono text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#79838E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter manifest..."
              className="w-full bg-[#111820] border border-[#1C2735] focus:border-[#00AFFF] pl-9 pr-3 py-1.5 text-xs text-white rounded-lg focus:outline-none placeholder-[#79838E]"
            />
          </div>

          <button
            onClick={handleCopyAllPrompts}
            className="px-3.5 py-1.5 bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] hover:text-white border border-[#1C2735] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Copy all prompts in manifest"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAll ? 'All Copied!' : 'Copy All Prompts'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="px-3 py-1.5 bg-[#111820] hover:bg-[#1C2735] text-[#00AFFF] border border-[#1C2735] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Download full prompt package as markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .MD</span>
          </button>
        </div>
      </div>

      {/* Normalized Manifest Table */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#111820] border-b border-[#1C2735] text-[#79838E] text-[10px] font-mono uppercase tracking-wider">
                <th className="py-3 px-4">Stable ID</th>
                <th className="py-3 px-4">Name & Classification</th>
                <th className="py-3 px-4">Story Function</th>
                <th className="py-3 px-4">Canon Links</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reference Attached</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C2735]">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-[#111820]/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                    {asset.id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{asset.name}</div>
                    <div className="text-[10px] text-[#79838E] uppercase font-mono">
                      {asset.type} • {asset.importance}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#D7DCE2] max-w-xs truncate">
                    {asset.storyFunction}
                  </td>
                  <td className="py-3 px-4 font-mono text-[10px] text-[#00AFFF]">
                    {(asset.sourceCanonIds || []).join(', ') || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        asset.promptStatus === 'READY'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {asset.promptStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[11px] text-[#79838E]">
                    {asset.optionalReferenceImageData ? (
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Attached</span>
                      </span>
                    ) : (
                      <span className="text-[#79838E]/60">None (Prompt Only)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleCopySinglePrompt(asset)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        copiedId === asset.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#141C26] hover:bg-[#00AFFF] text-white border border-[#1C2735]'
                      }`}
                    >
                      {copiedId === asset.id ? 'Copied' : 'Copy Prompt'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
