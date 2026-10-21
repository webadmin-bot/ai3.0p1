import React, { useState } from 'react';
import {
  Users,
  GitBranch,
  Globe,
  Film,
  Clock,
  Key,
  MapPin,
  Box,
  ListOrdered,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Lock,
  Unlock,
  Sparkles,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  CanonCharacter,
  CanonWorldRule,
  CanonBeat,
  CanonSetupPayoff,
  CanonLocation,
  CanonProp,
} from '../../types/filmStudio';
import {
  getLocationReferences,
  getPropReferences,
  reconcileLocationReferences,
  reconcilePropReferences,
  normalizeStoryCanon,
} from '../../services/canonHelpers';
import { LocationModal } from './LocationModal';
import { PropModal } from './PropModal';
import { CharacterModal } from './CharacterModal';
import { WorldRuleModal } from './WorldRuleModal';
import { BeatModal } from './BeatModal';
import { SetupPayoffModal } from './SetupPayoffModal';
import { DeleteCanonConfirmModal } from './DeleteCanonConfirmModal';

export const StoryCanonTab: React.FC = () => {
  const {
    project,
    updateStoryCanon,
    unlockStage1ForRevision,
    setActiveTab,
  } = useProject();

  const [activeSection, setActiveSection] = useState<
    | 'foundation'
    | 'characters'
    | 'relationships'
    | 'worldRules'
    | 'beatMap'
    | 'timeline'
    | 'setupPayoffs'
    | 'locationsProps'
    | 'episodes'
  >('foundation');

  // Modals state
  const [locationModalState, setLocationModalState] = useState<{
    isOpen: boolean;
    mode: 'ADD' | 'EDIT';
    location: CanonLocation | null;
  }>({ isOpen: false, mode: 'ADD', location: null });

  const [propModalState, setPropModalState] = useState<{
    isOpen: boolean;
    mode: 'ADD' | 'EDIT';
    prop: CanonProp | null;
  }>({ isOpen: false, mode: 'ADD', prop: null });

  const [characterModalState, setCharacterModalState] = useState<{
    isOpen: boolean;
    mode: 'ADD' | 'EDIT';
    character: CanonCharacter | null;
  }>({ isOpen: false, mode: 'ADD', character: null });

  const [ruleModalState, setRuleModalState] = useState<{
    isOpen: boolean;
    mode: 'ADD' | 'EDIT';
    rule: CanonWorldRule | null;
  }>({ isOpen: false, mode: 'ADD', rule: null });

  const [beatModalState, setBeatModalState] = useState<{
    isOpen: boolean;
    mode: 'ADD' | 'EDIT';
    beat: CanonBeat | null;
  }>({ isOpen: false, mode: 'ADD', beat: null });

  const [spModalState, setSpModalState] = useState<{
    isOpen: boolean;
    mode: 'ADD' | 'EDIT';
    sp: CanonSetupPayoff | null;
  }>({ isOpen: false, mode: 'ADD', sp: null });

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    itemType: 'Location' | 'Prop' | 'Character' | 'World Rule' | 'Beat' | 'Setup & Payoff';
    itemId: string;
    itemName: string;
    references: string[];
    onConfirm: (reconcile: boolean) => void;
  }>({
    isOpen: false,
    itemType: 'Location',
    itemId: '',
    itemName: '',
    references: [],
    onConfirm: () => {},
  });

  const foundation = project.storyFoundation;
  const rawCanon = project.storyCanon;
  const isLocked = Boolean(project.stage1.locked);

  if (!foundation || !rawCanon) {
    return (
      <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-[#F4A62A] mx-auto" />
        <h3 className="font-['Exo_2'] font-bold text-lg text-white">
          No Story Canon Generated
        </h3>
        <p className="text-xs text-[#79838E]">
          Please develop your story concepts or analyze your text and run "Build Story Canon" first.
        </p>
        <button
          onClick={() => setActiveTab('setup')}
          className="px-4 py-2 bg-[#00AFFF] text-white text-xs font-bold rounded-lg cursor-pointer"
        >
          Return to Setup
        </button>
      </div>
    );
  }

  const canon = normalizeStoryCanon(rawCanon);

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Location Handlers
  // -------------------------------------------------------------
  const handleSaveLocation = (loc: CanonLocation) => {
    const currentLocs = Array.isArray(canon.locations) ? canon.locations : [];
    let updatedLocations: CanonLocation[];
    if (locationModalState.mode === 'ADD') {
      updatedLocations = [...currentLocs, loc];
    } else {
      updatedLocations = currentLocs.map((l) => (l.id === loc.id ? loc : l));
    }
    updateStoryCanon({
      ...canon,
      locations: updatedLocations,
    });
  };

  const handleDeleteLocationClick = (loc: CanonLocation) => {
    if (isLocked) return;
    const refs = getLocationReferences(loc.id, canon, project);
    setDeleteModalState({
      isOpen: true,
      itemType: 'Location',
      itemId: loc.id,
      itemName: loc.name,
      references: refs,
      onConfirm: (reconcile: boolean) => {
        const currentLocs = Array.isArray(canon.locations) ? canon.locations : [];
        let updatedCanon = {
          ...canon,
          locations: currentLocs.filter((l) => l.id !== loc.id),
        };
        if (reconcile) {
          updatedCanon = reconcileLocationReferences(loc.id, updatedCanon);
        }
        updateStoryCanon(updatedCanon);
      },
    });
  };

  // -------------------------------------------------------------
  // Prop Handlers
  // -------------------------------------------------------------
  const handleSaveProp = (prop: CanonProp) => {
    const currentProps = Array.isArray(canon.props) ? canon.props : [];
    let updatedProps: CanonProp[];
    if (propModalState.mode === 'ADD') {
      updatedProps = [...currentProps, prop];
    } else {
      updatedProps = currentProps.map((p) => (p.id === prop.id ? prop : p));
    }
    updateStoryCanon({
      ...canon,
      props: updatedProps,
    });
  };

  const handleDeletePropClick = (prop: CanonProp) => {
    if (isLocked) return;
    const refs = getPropReferences(prop.id, canon, project);
    setDeleteModalState({
      isOpen: true,
      itemType: 'Prop',
      itemId: prop.id,
      itemName: prop.name,
      references: refs,
      onConfirm: (reconcile: boolean) => {
        const currentProps = Array.isArray(canon.props) ? canon.props : [];
        let updatedCanon = {
          ...canon,
          props: currentProps.filter((p) => p.id !== prop.id),
        };
        if (reconcile) {
          updatedCanon = reconcilePropReferences(prop.id, updatedCanon);
        }
        updateStoryCanon(updatedCanon);
      },
    });
  };

  // -------------------------------------------------------------
  // Character Handlers
  // -------------------------------------------------------------
  const handleSaveCharacter = (char: CanonCharacter) => {
    let updated: CanonCharacter[];
    if (characterModalState.mode === 'ADD') {
      updated = [...canon.characters, char];
    } else {
      updated = canon.characters.map((c) => (c.id === char.id ? char : c));
    }
    updateStoryCanon({ ...canon, characters: updated });
  };

  const handleDeleteCharacterClick = (char: CanonCharacter) => {
    if (isLocked) return;
    setDeleteModalState({
      isOpen: true,
      itemType: 'Character',
      itemId: char.id,
      itemName: char.name,
      references: (canon.beatMap || [])
        .filter((b) => b.charactersPresent?.includes(char.id))
        .map((b) => `Beat ${b.id}: "${b.title}"`),
      onConfirm: () => {
        updateStoryCanon({
          ...canon,
          characters: canon.characters.filter((c) => c.id !== char.id),
        });
      },
    });
  };

  // -------------------------------------------------------------
  // World Rule Handlers
  // -------------------------------------------------------------
  const handleSaveRule = (rule: CanonWorldRule) => {
    let updated: CanonWorldRule[];
    if (ruleModalState.mode === 'ADD') {
      updated = [...canon.worldRules, rule];
    } else {
      updated = canon.worldRules.map((r) => (r.id === rule.id ? rule : r));
    }
    updateStoryCanon({ ...canon, worldRules: updated });
  };

  const handleDeleteRuleClick = (rule: CanonWorldRule) => {
    if (isLocked) return;
    setDeleteModalState({
      isOpen: true,
      itemType: 'World Rule',
      itemId: rule.id,
      itemName: rule.rule,
      references: [],
      onConfirm: () => {
        updateStoryCanon({
          ...canon,
          worldRules: canon.worldRules.filter((r) => r.id !== rule.id),
        });
      },
    });
  };

  // -------------------------------------------------------------
  // Beat Handlers
  // -------------------------------------------------------------
  const handleSaveBeat = (beat: CanonBeat) => {
    let updated: CanonBeat[];
    if (beatModalState.mode === 'ADD') {
      updated = [...canon.beatMap, beat];
    } else {
      updated = canon.beatMap.map((b) => (b.id === beat.id ? beat : b));
    }
    updateStoryCanon({ ...canon, beatMap: updated });
  };

  const handleDeleteBeatClick = (beat: CanonBeat) => {
    if (isLocked) return;
    setDeleteModalState({
      isOpen: true,
      itemType: 'Beat',
      itemId: beat.id,
      itemName: beat.title,
      references: [],
      onConfirm: () => {
        updateStoryCanon({
          ...canon,
          beatMap: canon.beatMap.filter((b) => b.id !== beat.id),
        });
      },
    });
  };

  // -------------------------------------------------------------
  // Setup / Payoff Handlers
  // -------------------------------------------------------------
  const handleSaveSetupPayoff = (sp: CanonSetupPayoff) => {
    let updated: CanonSetupPayoff[];
    if (spModalState.mode === 'ADD') {
      updated = [...canon.setupPayoffs, sp];
    } else {
      updated = canon.setupPayoffs.map((s) => (s.id === sp.id ? sp : s));
    }
    updateStoryCanon({ ...canon, setupPayoffs: updated });
  };

  const handleDeleteSetupPayoffClick = (sp: CanonSetupPayoff) => {
    if (isLocked) return;
    setDeleteModalState({
      isOpen: true,
      itemType: 'Setup & Payoff',
      itemId: sp.id,
      itemName: sp.setupDescription,
      references: [],
      onConfirm: () => {
        updateStoryCanon({
          ...canon,
          setupPayoffs: canon.setupPayoffs.filter((s) => s.id !== sp.id),
        });
      },
    });
  };

  const navItems = [
    { id: 'foundation', label: 'Foundation V1', icon: Film, count: null },
    { id: 'characters', label: 'Characters', icon: Users, count: (canon.characters || []).length },
    { id: 'relationships', label: 'Relationships', icon: GitBranch, count: (canon.relationships || []).length },
    { id: 'worldRules', label: 'World Rules', icon: Globe, count: (canon.worldRules || []).length },
    { id: 'beatMap', label: 'Narrative Beats', icon: ListOrdered, count: (canon.beatMap || []).length },
    { id: 'timeline', label: 'Timeline & Knowledge', icon: Clock, count: (canon.timeline || []).length },
    { id: 'setupPayoffs', label: 'Setup & Payoff', icon: Key, count: (canon.setupPayoffs || []).length },
    {
      id: 'locationsProps',
      label: 'Locations & Props',
      icon: MapPin,
      count: (canon.locations?.length || 0) + (canon.props?.length || 0),
    },
    ...(canon.episodicRoadmap && canon.episodicRoadmap.length > 0
      ? [{ id: 'episodes', label: 'Episodic Roadmap', icon: Calendar, count: canon.episodicRoadmap.length }]
      : []),
  ] as const;

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2735] pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#00AFFF] mb-0.5">
            STAGE 1 OUTPUT • AUTHORITATIVE SPECIFICATION
          </div>
          <h2 className="font-['Exo_2'] font-bold text-xl text-white flex items-center space-x-2">
            <span>STORY CANON V1 ARCHITECTURE</span>
            <span className="text-[10px] bg-[#00AFFF]/20 text-[#00AFFF] font-mono px-2 py-0.5 rounded border border-[#00AFFF]/30">
              V1.0
            </span>
            {isLocked && (
              <span className="text-[10px] bg-[#F4A62A]/20 text-[#F4A62A] font-mono px-2 py-0.5 rounded border border-[#F4A62A]/30 flex items-center space-x-1">
                <Lock className="w-2.5 h-2.5" />
                <span>LOCKED</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-[#79838E]">
            Stable canonical IDs: CHAR-01, RULE-01, BEAT-01, SP-01, LOC-01, PROP-01. Full editing before lock.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={`border text-xs font-bold px-4 py-2.5 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer ${
              project.stage1.needsReaudit
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 animate-pulse'
                : 'bg-[#111820] hover:bg-[#1C2735] text-[#D7DCE2] border-[#1C2735]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#00AFFF]" />
            <span>
              {project.stage1.needsReaudit ? 'Re-Run Canon Audit' : 'Open Canon Audit'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className="bg-[#00AFFF] hover:bg-[#0090D0] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-[#00AFFF]/20 flex items-center space-x-2 cursor-pointer"
          >
            <span>Proceed to Final Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Locked Canon Alert Banner */}
      {isLocked && (
        <div className="bg-[#0D1522] border border-[#F4A62A]/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3 text-[#D7DCE2]">
            <Lock className="w-5 h-5 text-[#F4A62A] shrink-0" />
            <div>
              <span className="font-bold text-white block">Story Canon V1 is Locked</span>
              <span className="text-[#79838E]">
                Direct editing is restricted to protect downstream Stage 2 assets. Unlock canon to add, edit, or delete entries.
              </span>
            </div>
          </div>
          <button
            onClick={unlockStage1ForRevision}
            className="bg-[#111820] hover:bg-[#1C2735] text-[#F4A62A] border border-[#F4A62A]/40 font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlock Canon for Revision</span>
          </button>
        </div>
      )}

      {/* Needs Re-Audit Alert Banner */}
      {!isLocked && project.stage1.needsReaudit && (
        <div className="bg-[#141812] border border-amber-500/40 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Canon entries have been modified. <strong className="text-white">Canon Audit is marked as NEEDS RE-AUDIT</strong>. Please re-run audit to verify continuity before final approval.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('audit')}
            className="bg-[#F4A62A] hover:bg-[#e09822] text-black font-bold px-3 py-1 rounded-lg shrink-0 text-[11px] cursor-pointer"
          >
            Re-Run Audit Now
          </button>
        </div>
      )}

      {/* Internal Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#1C2735] pb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#00AFFF]/20 border border-[#00AFFF] text-white font-bold'
                  : 'bg-[#111820] hover:bg-[#1C2735] border border-[#1C2735] text-[#79838E] hover:text-[#D7DCE2]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.count !== null && (
                <span className="text-[10px] font-mono text-[#00AFFF] ml-0.5">
                  ({item.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION: FOUNDATION V1 */}
      {activeSection === 'foundation' && (
        <div className="space-y-5">
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1C2735] pb-3">
              <h3 className="font-['Exo_2'] font-bold text-lg text-white">
                {foundation.title}
              </h3>
              <span className="text-xs bg-[#1C2735] text-[#00AFFF] px-2.5 py-1 rounded font-mono">
                {foundation.provenance}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[#00AFFF] uppercase tracking-wider block">
                Logline
              </span>
              <p className="text-sm text-white italic bg-[#111820] p-3 rounded-lg border border-[#1C2735]">
                "{foundation.logline}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#111820] p-3.5 rounded-lg border border-[#1C2735] space-y-1">
                <span className="text-[#79838E] font-semibold block">Format & Platform:</span>
                <span className="text-white font-medium">
                  {project.settings.format} (~{foundation.targetRuntimeSeconds}s)
                </span>
              </div>
              <div className="bg-[#111820] p-3.5 rounded-lg border border-[#1C2735] space-y-1">
                <span className="text-[#79838E] font-semibold block">Master Visual Style:</span>
                <span className="text-[#00AFFF] font-medium">
                  {foundation.selectedStyle?.name || project.visualStyle.name}
                </span>
              </div>
              <div className="bg-[#111820] p-3.5 rounded-lg border border-[#1C2735] space-y-1">
                <span className="text-[#79838E] font-semibold block">Protagonist & Core Arc:</span>
                <span className="text-white">{foundation.protagonist}</span>
              </div>
              <div className="bg-[#111820] p-3.5 rounded-lg border border-[#1C2735] space-y-1">
                <span className="text-[#79838E] font-semibold block">Primary Conflict & Stakes:</span>
                <span className="text-white">{foundation.mainConflict}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: CHARACTERS (CHAR-01...) */}
      {activeSection === 'characters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#79838E]">
              Total Characters: {canon.characters.length}
            </span>
            <button
              onClick={() => {
                if (isLocked) return;
                setCharacterModalState({ isOpen: true, mode: 'ADD', character: null });
              }}
              disabled={isLocked}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isLocked
                  ? 'bg-[#1C2735] text-[#79838E] cursor-not-allowed'
                  : 'bg-[#00AFFF] hover:bg-[#0090D0] text-white shadow-md'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD CHARACTER</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canon.characters.map((char) => (
              <div
                key={char.id}
                className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-3 relative group"
              >
                <div className="flex items-center justify-between border-b border-[#1C2735] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold bg-[#141C26] text-[#00AFFF] px-2 py-0.5 rounded border border-[#1C2735]">
                      {char.id}
                    </span>
                    <h4 className="font-['Exo_2'] font-bold text-base text-white">
                      {char.name}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-semibold bg-[#111820] text-[#F4A62A] px-2 py-0.5 rounded border border-[#F4A62A]/30">
                      {char.role}
                    </span>
                    {!isLocked && (
                      <div className="flex items-center space-x-1 ml-1">
                        <button
                          onClick={() => setCharacterModalState({ isOpen: true, mode: 'EDIT', character: char })}
                          className="p-1 text-[#79838E] hover:text-[#00AFFF] rounded hover:bg-[#111820]"
                          title="Edit Character"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCharacterClick(char)}
                          className="p-1 text-[#79838E] hover:text-red-400 rounded hover:bg-[#111820]"
                          title="Delete Character"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[#79838E] text-[11px] block">Archetype & Voice:</span>
                    <p className="text-white font-medium">
                      {char.archetype} • <span className="text-[#D7DCE2] font-normal">{char.personalityVoice}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-[#111820] p-2 rounded border border-[#1C2735]">
                      <span className="text-emerald-400 font-semibold text-[11px] block">Want:</span>
                      <p className="text-[#D7DCE2] text-[11px]">{char.want}</p>
                    </div>
                    <div className="bg-[#111820] p-2 rounded border border-[#1C2735]">
                      <span className="text-amber-400 font-semibold text-[11px] block">Need:</span>
                      <p className="text-[#D7DCE2] text-[11px]">{char.need}</p>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div>
                      <span className="text-[#79838E] text-[10px] font-semibold uppercase">Weakness & Fatal Flaw:</span>
                      <p className="text-[#D7DCE2]">{char.weakness}</p>
                    </div>
                    <div>
                      <span className="text-[#00AFFF] text-[10px] font-semibold uppercase">Narrative Arc:</span>
                      <p className="text-[#D7DCE2]">{char.arc}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: RELATIONSHIPS */}
      {activeSection === 'relationships' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canon.relationships.map((rel) => (
              <div
                key={rel.id}
                className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-center space-x-2 font-mono text-xs text-[#00AFFF]">
                  <span className="bg-[#141C26] px-2 py-0.5 rounded border border-[#1C2735]">
                    {rel.characterAId}
                  </span>
                  <span>⟷</span>
                  <span className="bg-[#141C26] px-2 py-0.5 rounded border border-[#1C2735]">
                    {rel.characterBId}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-[#79838E] font-medium block">Interpersonal Dynamic:</span>
                    <p className="text-white font-medium">{rel.dynamic}</p>
                  </div>
                  <div>
                    <span className="text-red-400 font-medium block">Dramatic Tension:</span>
                    <p className="text-[#D7DCE2]">{rel.tension}</p>
                  </div>
                  {rel.sharedSecret && (
                    <div className="bg-[#111820] p-2 rounded border border-[#1C2735] text-[11px]">
                      <span className="text-[#F4A62A] font-medium block">Shared Secret:</span>
                      <p className="text-[#D7DCE2]">{rel.sharedSecret}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: WORLD RULES (RULE-01...) */}
      {activeSection === 'worldRules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#79838E]">
              Total World Rules: {(canon.worldRules || []).length}
            </span>
            <button
              onClick={() => {
                if (isLocked) return;
                setRuleModalState({ isOpen: true, mode: 'ADD', rule: null });
              }}
              disabled={isLocked}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isLocked
                  ? 'bg-[#1C2735] text-[#79838E] cursor-not-allowed'
                  : 'bg-[#00AFFF] hover:bg-[#0090D0] text-white shadow-md'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD WORLD RULE</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(canon.worldRules || []).map((rule) => (
              <div
                key={rule.id}
                className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-[#1C2735] pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-[#00AFFF]">
                      {rule.id}
                    </span>
                    <span className="text-[10px] font-mono bg-[#141C26] text-[#79838E] px-2 py-0.5 rounded">
                      {rule.scope}
                    </span>
                  </div>
                  {!isLocked && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setRuleModalState({ isOpen: true, mode: 'EDIT', rule })}
                        className="p-1 text-[#79838E] hover:text-[#00AFFF] rounded hover:bg-[#111820]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRuleClick(rule)}
                        className="p-1 text-[#79838E] hover:text-red-400 rounded hover:bg-[#111820]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block mb-1">Rule Statement:</span>
                  <p className="text-xs text-[#D7DCE2] leading-relaxed">{rule.rule}</p>
                </div>
                <div className="bg-[#111820] p-2.5 rounded border border-[#1C2735] text-xs">
                  <span className="text-red-400 font-semibold block text-[11px] mb-0.5">
                    Consequence of Violation:
                  </span>
                  <p className="text-[#79838E] leading-relaxed">{rule.consequence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: BEAT MAP (BEAT-01...) */}
      {activeSection === 'beatMap' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#79838E]">
            <div className="flex items-center space-x-3">
              <span>Total Sequence Beats: {canon.beatMap.length}</span>
              <span className="font-mono text-[#00AFFF]">
                Est. Duration: {canon.beatMap.reduce((acc, b) => acc + (b.estimatedSeconds || 0), 0)}s
              </span>
            </div>
            <button
              onClick={() => {
                if (isLocked) return;
                setBeatModalState({ isOpen: true, mode: 'ADD', beat: null });
              }}
              disabled={isLocked}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isLocked
                  ? 'bg-[#1C2735] text-[#79838E] cursor-not-allowed'
                  : 'bg-[#00AFFF] hover:bg-[#0090D0] text-white shadow-md'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD BEAT</span>
            </button>
          </div>

          <div className="space-y-3">
            {canon.beatMap.map((beat) => (
              <div
                key={beat.id}
                className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-2.5 transition-colors hover:border-[#2E3E52]"
              >
                <div className="flex items-center justify-between border-b border-[#1C2735] pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold bg-[#141C26] text-[#00AFFF] px-2 py-0.5 rounded border border-[#1C2735]">
                      {beat.id}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {beat.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-[10px] font-mono text-[#79838E]">
                    <span>{beat.actOrEpisode}</span>
                    <span>•</span>
                    <span className="text-[#00AFFF]">{beat.estimatedSeconds}s</span>
                    {!isLocked && (
                      <div className="flex items-center space-x-1 pl-2 border-l border-[#1C2735]">
                        <button
                          onClick={() => setBeatModalState({ isOpen: true, mode: 'EDIT', beat })}
                          className="p-1 text-[#79838E] hover:text-[#00AFFF] rounded hover:bg-[#111820]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBeatClick(beat)}
                          className="p-1 text-[#79838E] hover:text-red-400 rounded hover:bg-[#111820]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#D7DCE2] leading-relaxed">
                  {beat.description}
                </p>

                {/* Strict Causality Connection */}
                <div className="bg-[#111820] p-2.5 rounded-lg border border-[#1C2735] text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-[#F4A62A] uppercase tracking-wider">
                    <span>Causal Chain (Why this occurs):</span>
                  </div>
                  <p className="text-[#79838E] leading-relaxed text-[11px]">
                    {beat.causalConnection}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#79838E] pt-1">
                  <div>
                    <span className="text-[#D7DCE2] font-semibold">Location: </span>
                    <span className="font-mono text-[#00AFFF]">{beat.locationId || 'Unspecified'}</span>
                    <span className="mx-2">•</span>
                    <span className="text-[#D7DCE2] font-semibold">Emotional Beat: </span>
                    <span>{beat.emotionalBeat}</span>
                  </div>
                  <div>
                    <span className="text-[#D7DCE2] font-semibold">Present: </span>
                    <span className="font-mono">{(beat.charactersPresent || []).join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: TIMELINE */}
      {activeSection === 'timeline' && (
        <div className="space-y-5">
          <div className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-5 space-y-4">
            <h4 className="font-['Exo_2'] font-bold text-sm text-white uppercase tracking-wider">
              Chronological Timeline Ledger
            </h4>
            <div className="space-y-3">
              {canon.timeline.map((event) => (
                <div
                  key={event.id}
                  className="bg-[#111820] p-3 rounded-lg border border-[#1C2735] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[#00AFFF] font-mono text-[11px]">
                    <span className="font-bold">{event.timeMarker}</span>
                    <span className="text-[#79838E]">{event.id}</span>
                  </div>
                  <p className="text-white">{event.event}</p>
                  <div className="text-[10px] text-[#79838E]">
                    Characters Present: {event.charactersPresent.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION: SETUP & PAYOFF */}
      {activeSection === 'setupPayoffs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#79838E]">
            <span>Setup & Payoffs Ledger: {canon.setupPayoffs.length}</span>
            <button
              onClick={() => {
                if (isLocked) return;
                setSpModalState({ isOpen: true, mode: 'ADD', sp: null });
              }}
              disabled={isLocked}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isLocked
                  ? 'bg-[#1C2735] text-[#79838E] cursor-not-allowed'
                  : 'bg-[#00AFFF] hover:bg-[#0090D0] text-white shadow-md'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD SETUP & PAYOFF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canon.setupPayoffs.map((sp) => (
              <div
                key={sp.id}
                className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between border-b border-[#1C2735] pb-2">
                  <span className="font-mono font-bold text-[#00AFFF]">{sp.id}</span>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        sp.status === 'PAID_OFF'
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                          : 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                      }`}
                    >
                      {sp.status}
                    </span>
                    {!isLocked && (
                      <div className="flex items-center space-x-1 pl-1">
                        <button
                          onClick={() => setSpModalState({ isOpen: true, mode: 'EDIT', sp })}
                          className="p-1 text-[#79838E] hover:text-[#00AFFF] rounded hover:bg-[#111820]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSetupPayoffClick(sp)}
                          className="p-1 text-[#79838E] hover:text-red-400 rounded hover:bg-[#111820]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#79838E]">
                    <span className="text-[#00AFFF] font-semibold">SETUP:</span>
                    <span className="font-mono">at {sp.introducedAtBeat}</span>
                  </div>
                  <p className="text-white">{sp.setupDescription}</p>
                </div>

                <div className="space-y-1 pt-1 border-t border-[#1C2735]">
                  <div className="flex items-center justify-between text-[11px] text-[#79838E]">
                    <span className="text-emerald-400 font-semibold">PAYOFF:</span>
                    <span className="font-mono">at {sp.resolvedAtBeat}</span>
                  </div>
                  <p className="text-[#D7DCE2]">{sp.payoffDescription}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: LOCATIONS & PROPS (LOC-01, PROP-01...) */}
      {activeSection === 'locationsProps' && (
        <div className="space-y-8">
          {/* LOCATIONS SUBSECTION */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C2735] pb-2">
              <div>
                <h4 className="font-['Exo_2'] font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#F4A62A]" />
                  <span>Locations ({(canon.locations || []).length})</span>
                </h4>
                <p className="text-[11px] text-[#79838E]">
                  Stable IDs: LOC-01, LOC-02... New locations receive sequential unique IDs (e.g. LOC-04).
                </p>
              </div>

              <button
                onClick={() => {
                  if (isLocked) return;
                  setLocationModalState({
                    isOpen: true,
                    mode: 'ADD',
                    location: null,
                  });
                }}
                disabled={isLocked}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  isLocked
                    ? 'bg-[#1C2735] text-[#79838E] cursor-not-allowed'
                    : 'bg-[#F4A62A] hover:bg-[#e09822] text-black shadow-md shadow-[#F4A62A]/20'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD LOCATION</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(canon.locations || []).map((loc) => (
                <div
                  key={loc.id || Math.random()}
                  className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-2 text-xs relative group hover:border-[#2E3E52] transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-[#1C2735] pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] text-[#00AFFF] font-bold bg-[#141C26] px-2 py-0.5 rounded border border-[#1C2735]">
                        {loc.id}
                      </span>
                      <span className="font-bold text-white text-sm">{loc.name}</span>
                    </div>

                    {!isLocked && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() =>
                            setLocationModalState({
                              isOpen: true,
                              mode: 'EDIT',
                              location: loc,
                            })
                          }
                          className="px-2 py-1 text-[11px] text-[#79838E] hover:text-[#00AFFF] rounded hover:bg-[#111820] flex items-center space-x-1 border border-transparent hover:border-[#1C2735] transition-colors cursor-pointer"
                          title="Edit Location"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>EDIT</span>
                        </button>
                        <button
                          onClick={() => handleDeleteLocationClick(loc)}
                          className="px-2 py-1 text-[11px] text-[#79838E] hover:text-red-400 rounded hover:bg-[#111820] flex items-center space-x-1 border border-transparent hover:border-[#1C2735] transition-colors cursor-pointer"
                          title="Delete Location"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>DELETE</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Story Purpose & Narrative Significance */}
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-0.5">
                      Story Purpose / Narrative Role:
                    </span>
                    <p className="text-[#D7DCE2] leading-relaxed">
                      {loc.storyPurpose || loc.narrativeSignificance}
                    </p>
                  </div>

                  {/* Atmosphere */}
                  <div>
                    <span className="text-[10px] font-bold text-[#F4A62A] uppercase tracking-wider block mb-0.5">
                      Atmosphere & Lighting:
                    </span>
                    <p className="text-[#79838E] italic">
                      {loc.moodAtmosphere}
                    </p>
                  </div>

                  {/* Permanent Spatial Anchors */}
                  {loc.permanentSpatialAnchors && (
                    <div className="bg-[#111820] p-2 rounded border border-[#1C2735] text-[11px]">
                      <span className="text-emerald-400 font-bold block mb-0.5">
                        Permanent Spatial Anchors:
                      </span>
                      <p className="text-[#D7DCE2]">{loc.permanentSpatialAnchors}</p>
                    </div>
                  )}
                </div>
              ))}

              {(!canon.locations || canon.locations.length === 0) && (
                <div className="col-span-2 p-8 text-center text-xs text-[#79838E] border border-dashed border-[#1C2735] rounded-xl">
                  No locations registered in canon. Click "ADD LOCATION" to create one.
                </div>
              )}
            </div>
          </div>

          {/* PROPS SUBSECTION */}
          <div className="space-y-3 pt-4 border-t border-[#1C2735]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C2735] pb-2">
              <div>
                <h4 className="font-['Exo_2'] font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
                  <Box className="w-4 h-4 text-purple-400" />
                  <span>Story Props ({(canon.props || []).length})</span>
                </h4>
                <p className="text-[11px] text-[#79838E]">
                  Stable IDs: PROP-01, PROP-02... Standalone artifacts & continuity details.
                </p>
              </div>

              <button
                onClick={() => {
                  if (isLocked) return;
                  setPropModalState({
                    isOpen: true,
                    mode: 'ADD',
                    prop: null,
                  });
                }}
                disabled={isLocked}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  isLocked
                    ? 'bg-[#1C2735] text-[#79838E] cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD PROP</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(canon.props || []).map((p) => (
                <div
                  key={p.id || Math.random()}
                  className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-2 text-xs relative group hover:border-[#2E3E52] transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-[#1C2735] pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] text-purple-400 font-bold bg-[#141C26] px-2 py-0.5 rounded border border-[#1C2735]">
                        {p.id}
                      </span>
                      <span className="font-bold text-white text-sm">{p.name}</span>
                    </div>

                    {!isLocked && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() =>
                            setPropModalState({
                              isOpen: true,
                              mode: 'EDIT',
                              prop: p,
                            })
                          }
                          className="px-2 py-1 text-[11px] text-[#79838E] hover:text-[#00AFFF] rounded hover:bg-[#111820] flex items-center space-x-1 border border-transparent hover:border-[#1C2735] transition-colors cursor-pointer"
                          title="Edit Prop"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>EDIT</span>
                        </button>
                        <button
                          onClick={() => handleDeletePropClick(p)}
                          className="px-2 py-1 text-[11px] text-[#79838E] hover:text-red-400 rounded hover:bg-[#111820] flex items-center space-x-1 border border-transparent hover:border-[#1C2735] transition-colors cursor-pointer"
                          title="Delete Prop"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>DELETE</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Story Function */}
                  <div>
                    <span className="text-[10px] font-bold text-[#00AFFF] uppercase tracking-wider block mb-0.5">
                      Story Function / Role:
                    </span>
                    <p className="text-[#D7DCE2] leading-relaxed">
                      {p.storyFunction || p.narrativeSignificance}
                    </p>
                  </div>

                  {/* Holder / Owner */}
                  <div className="flex items-center space-x-1.5 text-[11px]">
                    <span className="text-[#79838E]">Holder / Owner:</span>
                    <span className="text-white font-medium bg-[#111820] px-2 py-0.5 rounded border border-[#1C2735]">
                      {p.ownerOrHolder}
                    </span>
                  </div>

                  {/* Continuity Details */}
                  {p.continuityDetails && (
                    <div className="bg-[#111820] p-2 rounded border border-[#1C2735] text-[11px]">
                      <span className="text-[#F4A62A] font-bold block mb-0.5">
                        Continuity Details:
                      </span>
                      <p className="text-[#D7DCE2]">{p.continuityDetails}</p>
                    </div>
                  )}
                </div>
              ))}

              {(!canon.props || canon.props.length === 0) && (
                <div className="col-span-2 p-8 text-center text-xs text-[#79838E] border border-dashed border-[#1C2735] rounded-xl">
                  No props registered in canon. Click "ADD PROP" to create one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION: EPISODIC ROADMAP */}
      {activeSection === 'episodes' && canon.episodicRoadmap && (
        <div className="space-y-4">
          <div className="text-xs text-[#79838E]">
            Season roadmap with per-episode runtime and cliffhanger hooks for {canon.episodicRoadmap.length} episodes.
          </div>
          <div className="space-y-3">
            {canon.episodicRoadmap.map((ep) => (
              <div
                key={ep.episodeNumber}
                className="bg-[#0B1017] border border-[#1C2735] rounded-xl p-4 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between border-b border-[#1C2735] pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-[#00AFFF] bg-[#141C26] px-2 py-0.5 rounded">
                      EPISODE {ep.episodeNumber}
                    </span>
                    <span className="font-bold text-white text-sm">{ep.title}</span>
                  </div>
                  <span className="font-mono text-[#79838E] text-[11px]">
                    ~{ep.targetRuntimeSeconds}s
                  </span>
                </div>
                <p className="text-[#D7DCE2] italic">"{ep.logline}"</p>
                <div className="bg-[#111820] p-2.5 rounded border border-[#1C2735] text-[11px] space-y-1">
                  <div>
                    <span className="text-[#D7DCE2] font-semibold">Core Conflict: </span>
                    <span className="text-[#79838E]">{ep.coreConflict}</span>
                  </div>
                  <div>
                    <span className="text-[#F4A62A] font-semibold">Cliffhanger Hook: </span>
                    <span className="text-[#D7DCE2]">{ep.cliffhangerHook}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <LocationModal
        isOpen={locationModalState.isOpen}
        mode={locationModalState.mode}
        initialLocation={locationModalState.location}
        existingLocations={canon.locations || []}
        onSave={handleSaveLocation}
        onClose={() => setLocationModalState({ isOpen: false, mode: 'ADD', location: null })}
      />

      <PropModal
        isOpen={propModalState.isOpen}
        mode={propModalState.mode}
        initialProp={propModalState.prop}
        existingProps={canon.props || []}
        characters={canon.characters || []}
        onSave={handleSaveProp}
        onClose={() => setPropModalState({ isOpen: false, mode: 'ADD', prop: null })}
      />

      <CharacterModal
        isOpen={characterModalState.isOpen}
        mode={characterModalState.mode}
        initialCharacter={characterModalState.character}
        existingCharacters={canon.characters || []}
        onSave={handleSaveCharacter}
        onClose={() => setCharacterModalState({ isOpen: false, mode: 'ADD', character: null })}
      />

      <WorldRuleModal
        isOpen={ruleModalState.isOpen}
        mode={ruleModalState.mode}
        initialRule={ruleModalState.rule}
        existingRules={canon.worldRules || []}
        onSave={handleSaveRule}
        onClose={() => setRuleModalState({ isOpen: false, mode: 'ADD', rule: null })}
      />

      <BeatModal
        isOpen={beatModalState.isOpen}
        mode={beatModalState.mode}
        initialBeat={beatModalState.beat}
        existingBeats={canon.beatMap || []}
        locations={canon.locations || []}
        characters={canon.characters || []}
        onSave={handleSaveBeat}
        onClose={() => setBeatModalState({ isOpen: false, mode: 'ADD', beat: null })}
      />

      <SetupPayoffModal
        isOpen={spModalState.isOpen}
        mode={spModalState.mode}
        initialItem={spModalState.sp}
        existingItems={canon.setupPayoffs || []}
        beats={canon.beatMap || []}
        onSave={handleSaveSetupPayoff}
        onClose={() => setSpModalState({ isOpen: false, mode: 'ADD', sp: null })}
      />

      <DeleteCanonConfirmModal
        isOpen={deleteModalState.isOpen}
        itemType={deleteModalState.itemType}
        itemId={deleteModalState.itemId}
        itemName={deleteModalState.itemName}
        references={deleteModalState.references}
        onConfirm={deleteModalState.onConfirm}
        onClose={() =>
          setDeleteModalState((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};
