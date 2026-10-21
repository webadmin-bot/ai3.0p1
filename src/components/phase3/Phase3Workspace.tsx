import React, { useState } from 'react';
import {
  Video,
  Download,
  Package,
  Layers,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ProductionBoardTab } from './ProductionBoardTab';
import { ProductionExportTab } from './ProductionExportTab';

export type Phase3SubTab = 'board' | 'export';

export const Phase3Workspace: React.FC = () => {
  const { project, setActivePhase, setActiveStage } = useProject();
  const [currentTab, setCurrentTab] = useState<Phase3SubTab>('board');

  const shotCount = project.stage4?.shotPackages?.length || project.stage3?.shots?.length || 0;

  const subtabs: Array<{
    id: Phase3SubTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    countBadge?: number;
  }> = [
    {
      id: 'board',
      label: '1. Video Prompts & Timeline',
      sublabel: 'Veo 2 / Flow Production Board',
      icon: Video,
      countBadge: shotCount > 0 ? shotCount : undefined,
    },
    {
      id: 'export',
      label: '2. Complete Production Package',
      sublabel: 'Bible, Flow JSON, CSV & Backup',
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Subtabs Bar */}
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-2 flex flex-wrap gap-1.5 shadow-sm">
        {subtabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex-1 min-w-[170px] py-2 px-3 rounded-lg text-left transition-all cursor-pointer flex items-center space-x-2.5 ${
                isActive
                  ? 'bg-[#141F2E] border border-[#00AFFF] text-white shadow-sm'
                  : 'bg-transparent hover:bg-[#101722] text-[#79838E] border border-transparent'
              }`}
            >
              <div
                className={`p-1.5 rounded-md shrink-0 ${
                  isActive ? 'bg-[#00AFFF] text-white' : 'bg-[#141C26] text-[#657283]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-xs font-bold truncate ${
                      isActive ? 'text-white' : 'text-[#A0AEC0]'
                    }`}
                  >
                    {tab.label}
                  </span>
                  {tab.countBadge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[#1C2735] text-[#00AFFF]">
                      {tab.countBadge}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#55606E] truncate">{tab.sublabel}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Subtab Content View */}
      <div className="transition-all">
        {currentTab === 'board' && <ProductionBoardTab />}
        {currentTab === 'export' && <ProductionExportTab />}
      </div>
    </div>
  );
};
