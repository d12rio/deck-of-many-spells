"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Spell } from "@/lib/spells";
import { allSpells, isConcentration, isRitual, schoolName } from "@/lib/spells";
import { useLocalStorage } from "@/lib/useLocalStorage";
import HoloCard from "./HoloCard";
import SpellSearch from "./SpellSearch";
import SpellSlotTracker, { DEFAULT_SLOTS, hasAvailableSlot, type SlotState } from "./SpellSlotTracker";
import HPTracker, { DEFAULT_HP, type HPState } from "./HPTracker";

interface SaveData {
  version: 1;
  name?: string;
  hand: string[];
  favorites: string[];
  slots: SlotState;
  concentratingOn?: string | null;
  hp?: HPState;
  conditions?: string[];
  prepLimit?: number;
}

interface ProfileStore {
  [name: string]: SaveData;
}

function buildSaveData(hand: Spell[], favorites: string[], slots: SlotState, concentratingOn: string | null, hp: HPState, conditions: string[], prepLimit: number, name?: string): SaveData {
  return {
    version: 1,
    ...(name ? { name } : {}),
    hand: hand.map((s) => s.name),
    favorites,
    slots,
    ...(concentratingOn ? { concentratingOn } : {}),
    hp,
    conditions,
    prepLimit,
  };
}

function spellsByName(names: string[]): Spell[] {
  const map = new Map(allSpells.map((s) => [s.name, s]));
  return names.map((n) => map.get(n)).filter((s): s is Spell => s !== undefined);
}

function getUpcastLevels(spell: Spell, slots: SlotState): number[] {
  if (spell.level === 0) return [];
  const levels: number[] = [];
  for (let lvl = spell.level + 1; lvl <= 9; lvl++) {
    const s = slots[lvl];
    if (s && s.max > 0 && s.used < s.max) levels.push(lvl);
  }
  return levels;
}

export default function Playfield() {
  const [hand, setHand] = useState<Spell[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [slots, setSlots] = useLocalStorage<SlotState>("dnd-spell-slots", DEFAULT_SLOTS);
  const [favorites, setFavorites] = useLocalStorage<string[]>("dnd-favorites", []);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [hp, setHP] = useLocalStorage<HPState>("dnd-hp", DEFAULT_HP);
  const [conditions, setConditions] = useLocalStorage<string[]>("dnd-conditions", []);
  const [prepLimit, setPrepLimit] = useLocalStorage<number>("dnd-prep-limit", 10);
  const [editingPrepLimit, setEditingPrepLimit] = useState(false);
  const [profiles, setProfiles] = useLocalStorage<ProfileStore>("dnd-profiles", {});
  const [activeProfile, setActiveProfile] = useLocalStorage<string>("dnd-last-profile", "");
  const [newCharName, setNewCharName] = useState("");
  const [renamingProfile, setRenamingProfile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const didAutoLoad = useRef(false);
  const [playingCard, setPlayingCard] = useState<string | null>(null);
  const [deniedCard, setDeniedCard] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  // Concentration
  const [concentratingOn, setConcentratingOn] = useState<string | null>(null);
  const [pendingCast, setPendingCast] = useState<{ spell: Spell; castLevel: number; ritual?: boolean } | null>(null);

  // Upcast menu
  const [upcastMenu, setUpcastMenu] = useState<{ spell: Spell; x: number; y: number } | null>(null);

  // Card flip
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  // Sort mode & view mode
  const [sortMode, setSortMode] = useState<"custom" | "name" | "level">("custom");
  const [viewMode, setViewMode] = useState<"cards" | "compact">("cards");
  const customOrderRef = useRef<string[]>([]);

  // Drag & drop
  const [dragSpell, setDragSpell] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Ritual cast animation (green variant)
  const [ritualCasting, setRitualCasting] = useState<string | null>(null);

  const favSet = new Set(favorites);
  const spellLevelMap = useMemo(() => new Map(allSpells.map((s) => [s.name, s.level])), []);
  const preparedCount = favorites.filter((n) => (spellLevelMap.get(n) ?? 0) > 0).length;
  const canPrepare = (spell: Spell) => {
    if (favSet.has(spell.name)) return true; // can always unprepare
    if (spell.level === 0) return true; // cantrips don't count
    return preparedCount < prepLimit;
  };
  const selectedNames = new Set(hand.map((s) => s.name));

  const addToHand = useCallback((spell: Spell) => {
    setHand((prev) => {
      if (prev.some((s) => s.name === spell.name)) return prev;
      return [...prev, spell];
    });
  }, []);

  const removeFromHand = useCallback((spellName: string) => {
    setHand((prev) => prev.filter((s) => s.name !== spellName));
    setConcentratingOn((prev) => (prev === spellName ? null : prev));
    setFlippedCards((prev) => {
      if (!prev.has(spellName)) return prev;
      const next = new Set(prev);
      next.delete(spellName);
      return next;
    });
  }, []);

  const sortHand = useCallback((mode: "custom" | "name" | "level") => {
    if (mode === "custom") {
      // Restore saved custom order
      const order = customOrderRef.current;
      if (order.length > 0) {
        setHand((prev) => {
          const map = new Map(prev.map((s) => [s.name, s]));
          const restored = order.map((n) => map.get(n)).filter((s): s is Spell => s !== undefined);
          // Append any cards added after the snapshot
          const restoredSet = new Set(order);
          for (const s of prev) {
            if (!restoredSet.has(s.name)) restored.push(s);
          }
          return restored;
        });
      }
    } else {
      // Save custom order before sorting
      setHand((prev) => {
        if (sortMode === "custom") {
          customOrderRef.current = prev.map((s) => s.name);
        }
        return [...prev].sort((a, b) => {
          if (mode === "name") return a.name.localeCompare(b.name);
          return a.level - b.level || a.name.localeCompare(b.name);
        });
      });
    }
    setSortMode(mode);
  }, [sortMode]);

  const toggleFavorite = useCallback((spellName: string) => {
    setFavorites((prev) => {
      if (prev.includes(spellName)) return prev.filter((n) => n !== spellName);
      // Cantrips don't count toward prep limit
      const spellLevel = spellLevelMap.get(spellName) ?? 0;
      if (spellLevel > 0) {
        const currentCount = prev.filter((n) => (spellLevelMap.get(n) ?? 0) > 0).length;
        if (currentCount >= prepLimit) return prev;
      }
      return [...prev, spellName];
    });
  }, [setFavorites, spellLevelMap, prepLimit]);

  const toggleFlip = useCallback((spellName: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(spellName)) next.delete(spellName);
      else next.add(spellName);
      return next;
    });
  }, []);

  const cardDimStyle = (spell: Spell): React.CSSProperties | undefined => {
    if (spell.level === 0) return undefined;
    if (isRitual(spell)) return undefined;
    if (!hasAvailableSlot(slots, spell.level)) {
      return { opacity: 0.3, filter: "saturate(0.3)" };
    }
    return undefined;
  };

  // Core cast logic — consumes a slot and plays animation
  const consumeAndAnimate = useCallback((spell: Spell, castLevel: number) => {
    setSlots((prev) => {
      const s = prev[castLevel];
      if (!s || s.used >= s.max) return prev;
      return { ...prev, [castLevel]: { ...s, used: s.used + 1 } };
    });
    setPlayingCard(spell.name);
    setTimeout(() => setPlayingCard(null), 600);
  }, [setSlots]);

  // Play (cast) a card — consume a spell slot with animation
  const playCard = useCallback((spell: Spell, castLevel?: number) => {
    if (playingCard || deniedCard || ritualCasting) return;

    const level = castLevel ?? spell.level;

    // Cantrips: just play the animation, no slot consumed
    if (level === 0) {
      setPlayingCard(spell.name);
      setTimeout(() => setPlayingCard(null), 600);
      return;
    }

    // Check if slot is available
    if (!hasAvailableSlot(slots, level)) {
      setDeniedCard(spell.name);
      setTimeout(() => setDeniedCard(null), 400);
      return;
    }

    // Concentration check
    if (isConcentration(spell) && concentratingOn && concentratingOn !== spell.name) {
      setPendingCast({ spell, castLevel: level });
      return;
    }

    if (isConcentration(spell)) {
      setConcentratingOn(spell.name);
    }

    consumeAndAnimate(spell, level);
  }, [playingCard, deniedCard, ritualCasting, slots, concentratingOn, consumeAndAnimate]);

  // Ritual cast — no slot consumed
  const ritualCast = useCallback((spell: Spell) => {
    if (playingCard || deniedCard || ritualCasting) return;
    if (!isRitual(spell)) return;

    // Concentration check for ritual + concentration spells
    if (isConcentration(spell) && concentratingOn && concentratingOn !== spell.name) {
      setPendingCast({ spell, castLevel: spell.level, ritual: true });
      return;
    }

    if (isConcentration(spell)) {
      setConcentratingOn(spell.name);
    }

    setRitualCasting(spell.name);
    setTimeout(() => setRitualCasting(null), 600);
  }, [playingCard, deniedCard, ritualCasting, concentratingOn]);

  // Confirm concentration switch
  const confirmConcentrationSwitch = useCallback(() => {
    if (!pendingCast) return;
    setConcentratingOn(pendingCast.spell.name);
    if (pendingCast.ritual) {
      setRitualCasting(pendingCast.spell.name);
      setTimeout(() => setRitualCasting(null), 600);
    } else {
      consumeAndAnimate(pendingCast.spell, pendingCast.castLevel);
    }
    setPendingCast(null);
  }, [pendingCast, consumeAndAnimate]);

  // Drag & drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, spellName: string) => {
    setDragSpell(spellName);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", spellName);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, spellName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(spellName);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragSpell && dropTarget && dragSpell !== dropTarget) {
      setHand((prev) => {
        const fromIdx = prev.findIndex((s) => s.name === dragSpell);
        const toIdx = prev.findIndex((s) => s.name === dropTarget);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return next;
      });
      setSortMode("custom");
      customOrderRef.current = [];
    }
    setDragSpell(null);
    setDropTarget(null);
  }, [dragSpell, dropTarget]);

  // Close upcast menu on Escape
  useEffect(() => {
    if (!upcastMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUpcastMenu(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [upcastMenu]);

  // Auto-load last used character (or first available) on mount
  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;
    const profileKeys = Object.keys(profiles);
    if (profileKeys.length === 0) return;
    const target = activeProfile && profiles[activeProfile] ? activeProfile : profileKeys[0];
    const data = profiles[target];
    if (!data) return;
    setHand(spellsByName(data.hand));
    setFavorites(data.favorites);
    if (data.slots) setSlots(data.slots);
    if (data.concentratingOn) setConcentratingOn(data.concentratingOn);
    if (data.hp) setHP(data.hp);
    if (data.conditions) setConditions(data.conditions);
    if (data.prepLimit != null) setPrepLimit(data.prepLimit);
    setActiveProfile(target);
  }, [profiles, activeProfile, setFavorites, setSlots, setHP, setConditions, setPrepLimit, setActiveProfile]);

  // Save current state to active character
  const saveCurrentState = useCallback(() => {
    if (!activeProfile) return;
    const data = buildSaveData(hand, favorites, slots, concentratingOn, hp, conditions, prepLimit);
    setProfiles((prev) => ({ ...prev, [activeProfile]: data }));
  }, [hand, favorites, slots, concentratingOn, hp, conditions, prepLimit, activeProfile, setProfiles]);

  // Character management
  const saveProfile = useCallback((name: string) => {
    const data = buildSaveData(hand, favorites, slots, concentratingOn, hp, conditions, prepLimit);
    setProfiles((prev) => ({ ...prev, [name]: data }));
    setActiveProfile(name);
  }, [hand, favorites, slots, concentratingOn, hp, conditions, prepLimit, setProfiles, setActiveProfile]);

  const loadProfile = useCallback((name: string) => {
    const data = profiles[name];
    if (!data) return;
    setHand(spellsByName(data.hand));
    setFavorites(data.favorites);
    if (data.slots) setSlots(data.slots);
    setConcentratingOn(data.concentratingOn ?? null);
    setHP(data.hp ?? DEFAULT_HP);
    setConditions(data.conditions ?? []);
    setPrepLimit(data.prepLimit ?? 10);
    setActiveProfile(name);
  }, [profiles, setFavorites, setSlots, setHP, setConditions, setPrepLimit, setActiveProfile]);

  const deleteProfile = useCallback((name: string) => {
    setProfiles((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, [setProfiles]);

  const renameProfile = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName || profiles[trimmed]) return;
    setProfiles((prev) => {
      const next = { ...prev };
      next[trimmed] = next[oldName];
      delete next[oldName];
      return next;
    });
    if (activeProfile === oldName) setActiveProfile(trimmed);
    setRenamingProfile(null);
  }, [profiles, activeProfile, setProfiles, setActiveProfile]);

  // Export a character as JSON file download
  const exportCharacter = useCallback((name: string) => {
    const charData = profiles[name];
    if (!charData) return;
    const data = { ...charData, name };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [profiles]);

  // Shared import logic
  const applyImport = useCallback((raw: string) => {
    try {
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== 1 || !Array.isArray(data.hand) || !Array.isArray(data.favorites)) {
        setImportError("Invalid save file format");
        return;
      }
      setHand(spellsByName(data.hand));
      setFavorites(data.favorites);
      if (data.slots) setSlots(data.slots);
      setConcentratingOn(data.concentratingOn ?? null);
      setHP(data.hp ?? DEFAULT_HP);
      setConditions(data.conditions ?? []);
      if (data.prepLimit != null) setPrepLimit(data.prepLimit);
      if (data.name) {
        setProfiles((prev) => ({ ...prev, [data.name!]: data }));
        setActiveProfile(data.name);
      }
      setShowImport(false);
      setImportText("");
    } catch {
      setImportError("Invalid JSON — check your paste and try again");
    }
  }, [setFavorites, setSlots, setHP, setConditions, setPrepLimit, setProfiles, setActiveProfile]);

  // Import from pasted JSON
  const handleImport = useCallback(() => {
    setImportError("");
    applyImport(importText);
  }, [importText, applyImport]);

  // Import from file
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        applyImport(reader.result);
      }
    };
    reader.onerror = () => setImportError("Failed to read file");
    reader.readAsText(file);
    e.target.value = "";
  }, [applyImport]);

  // Long rest — restore HP, clear temp HP, restore spell slots, drop concentration
  const handleRest = useCallback(() => {
    setHP((prev) => ({ ...prev, current: prev.max, temp: 0 }));
    setSlots((prev) => {
      const next: SlotState = {};
      for (const [k, v] of Object.entries(prev)) {
        next[Number(k)] = { ...v, used: 0 };
      }
      return next;
    });
    setConcentratingOn(null);
  }, [setHP, setSlots]);

  const displayHand = showFavoritesOnly
    ? hand.filter((s) => favSet.has(s.name))
    : hand;

  return (
    <div className="playfield">
      {/* Sidebar toggle + title */}
      <div className="playfield__topbar">
        <button
          className="playfield__sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Close spell deck" : "Open spell deck"}
        >
          {sidebarOpen ? "\u00AB" : "\u00BB"}
        </button>
        <h1 className="playfield__sidebar-title">Deck of Many Spells</h1>
      </div>

      {/* Spell search sidebar */}
      <aside className={`playfield__sidebar ${sidebarOpen ? "playfield__sidebar--open" : ""}`}>
        <SpellSearch onSelect={addToHand} selectedNames={selectedNames} />

        {/* Character section */}
        <div className="char-section">
          <h3 className="char-section__title">Characters</h3>

          {/* Active character */}
          {activeProfile && (
            <div className="char-section__active">
              <span className="char-section__active-name">{activeProfile}</span>
              <button className="char-section__save-btn" onClick={saveCurrentState} title="Save current state">
                Save
              </button>
            </div>
          )}

          {/* Character list */}
          {Object.keys(profiles).length > 0 && (
            <ul className="char-section__list">
              {Object.entries(profiles).map(([name, data]) => (
                <li key={name} className={`char-section__item${name === activeProfile ? " char-section__item--active" : ""}`}>
                  {renamingProfile === name ? (
                    <form
                      className="char-section__rename-form"
                      onSubmit={(e) => { e.preventDefault(); renameProfile(name, renameValue); }}
                    >
                      <input
                        className="char-section__input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => setRenamingProfile(null)}
                        onKeyDown={(e) => { if (e.key === "Escape") setRenamingProfile(null); }}
                        autoFocus
                      />
                    </form>
                  ) : (
                    <button className="char-section__item-load" onClick={() => loadProfile(name)}>
                      <span className="char-section__item-name">{name}</span>
                      <span className="char-section__item-meta">{data.hand.length} cards</span>
                    </button>
                  )}
                  <button
                    className="char-section__item-btn"
                    onClick={() => { setRenamingProfile(name); setRenameValue(name); }}
                    title="Rename"
                  >
                    {"\u270E"}
                  </button>
                  <button className="char-section__item-btn" onClick={() => exportCharacter(name)} title="Export">
                    {"\u2913"}
                  </button>
                  <button className="char-section__item-btn char-section__item-btn--delete" onClick={() => deleteProfile(name)} title="Delete">
                    {"\u00D7"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* New character */}
          <div className="char-section__new">
            <input
              type="text"
              className="char-section__input"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              placeholder="New character..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCharName.trim()) {
                  saveProfile(newCharName.trim());
                  setNewCharName("");
                }
              }}
            />
            <button
              className="char-section__add-btn"
              onClick={() => { saveProfile(newCharName.trim()); setNewCharName(""); }}
              disabled={!newCharName.trim()}
              title="Create character"
            >
              +
            </button>
          </div>

          {/* Import */}
          <div className="char-section__import">
            <button className="char-section__import-btn" onClick={() => { setShowImport(true); setImportError(""); setImportText(""); }}>
              Import JSON
            </button>
            <label className="char-section__import-btn char-section__import-file">
              Import File
              <input type="file" accept=".json" onChange={handleFileImport} hidden />
            </label>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="playfield__arena">
        {/* Hand controls */}
        {hand.length > 0 && (
          <div className="playfield__hand-sort">
            <button className={`playfield__hand-sort-btn ${sortMode === "custom" ? "playfield__hand-sort-btn--active" : ""}`} onClick={() => sortHand("custom")}>Custom</button>
            <button className={`playfield__hand-sort-btn ${sortMode === "name" ? "playfield__hand-sort-btn--active" : ""}`} onClick={() => sortHand("name")}>Name</button>
            <button className={`playfield__hand-sort-btn ${sortMode === "level" ? "playfield__hand-sort-btn--active" : ""}`} onClick={() => sortHand("level")}>Level</button>
            <button
              className={`playfield__hand-sort-btn ${showFavoritesOnly ? "playfield__hand-sort-btn--active" : ""}`}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              Prepared{showFavoritesOnly ? " Only" : ""}
            </button>
            <span className="playfield__prep-counter">
              <span className={`playfield__prep-count ${preparedCount >= prepLimit ? "playfield__prep-count--full" : ""}`}>
                {preparedCount}/{editingPrepLimit ? "" : prepLimit}
              </span>
              {editingPrepLimit ? (
                <input
                  type="number"
                  className="playfield__prep-input"
                  value={prepLimit}
                  onChange={(e) => setPrepLimit(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                  onBlur={() => setEditingPrepLimit(false)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingPrepLimit(false); }}
                  autoFocus
                  min={1}
                  max={99}
                />
              ) : (
                <button className="playfield__prep-edit-btn" onClick={() => setEditingPrepLimit(true)} title="Edit preparation limit">
                  &#9998;
                </button>
              )}
            </span>
            <button
              className={`playfield__hand-sort-btn ${viewMode === "compact" ? "playfield__hand-sort-btn--active" : ""}`}
              onClick={() => setViewMode(viewMode === "cards" ? "compact" : "cards")}
              title={viewMode === "cards" ? "Switch to compact list" : "Switch to card view"}
            >
              {viewMode === "cards" ? "List" : "Cards"}
            </button>
          </div>
        )}

        {/* Card display area */}
        <div className="playfield__hand">
          {hand.length === 0 && (
            <>
              <div className="playfield__ghost-card playfield__ghost-card--info">
                <div className="playfield__ghost-card-content">
                  <div className="playfield__ghost-card-arrow">{"\u2190"}</div>
                  <p className="playfield__ghost-card-title">Get Started</p>
                  <p className="playfield__ghost-card-desc">
                    Search and select spells from the sidebar to build your deck.
                  </p>
                  <div className="playfield__ghost-card-tips">
                    <p>Double-click to cast</p>
                    <p>Right-click to upcast</p>
                    <p>Shift+dbl-click for ritual</p>
                  </div>
                </div>
              </div>
              <div className="playfield__ghost-card" style={{ opacity: 0.4 }} />
              <div className="playfield__ghost-card" style={{ opacity: 0.2 }} />
              <div className="playfield__ghost-card" style={{ opacity: 0.1 }} />
            </>
          )}
          {viewMode === "compact" ? (
            <div className="playfield__compact-list">
              {displayHand.map((spell) => (
                <div
                  key={spell.name}
                  className={`playfield__compact-row${concentratingOn === spell.name ? " playfield__compact-row--conc" : ""}`}
                  style={cardDimStyle(spell)}
                  onDoubleClick={(e) => {
                    if (e.shiftKey && isRitual(spell)) {
                      ritualCast(spell);
                    } else {
                      playCard(spell);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (spell.level === 0) return;
                    const levels = getUpcastLevels(spell, slots);
                    if (levels.length === 0) return;
                    const x = Math.min(e.clientX, window.innerWidth - 160);
                    const y = Math.min(e.clientY, window.innerHeight - 200);
                    setUpcastMenu({ spell, x, y });
                  }}
                >
                  <button
                    className={`playfield__fav-btn ${favSet.has(spell.name) ? "playfield__fav-btn--active" : ""} ${!canPrepare(spell) ? "playfield__fav-btn--disabled" : ""}`}
                    onClick={() => toggleFavorite(spell.name)}
                    title={favSet.has(spell.name) ? "Unprepare" : canPrepare(spell) ? "Prepare" : `Prep limit reached (${preparedCount}/${prepLimit})`}
                  >
                    {favSet.has(spell.name) ? "\u2605" : "\u2606"}
                  </button>
                  <span className="playfield__compact-level">{spell.level === 0 ? "C" : spell.level}</span>
                  <span className="playfield__compact-name">{spell.name}</span>
                  <span className="playfield__compact-school">{schoolName(spell.school).slice(0, 3)}</span>
                  {isConcentration(spell) && <span className="playfield__compact-tag">C</span>}
                  {isRitual(spell) && <span className="playfield__compact-tag playfield__compact-tag--ritual">R</span>}
                  {concentratingOn === spell.name && <span className="playfield__compact-tag playfield__compact-tag--conc">CONC</span>}
                  <button
                    className="playfield__remove-btn"
                    onClick={() => removeFromHand(spell.name)}
                    title="Remove from hand"
                  >
                    {"\u00D7"}
                  </button>
                </div>
              ))}
              {showFavoritesOnly && displayHand.length === 0 && hand.length > 0 && (
                <div className="playfield__hand-hint">
                  No prepared spells in your hand yet — click the star on a card to mark it as prepared
                </div>
              )}
            </div>
          ) : (
            <>
              {displayHand.map((spell) => (
                <div
                  key={spell.name}
                  className={`playfield__hand-card${playingCard === spell.name ? " playfield__hand-card--casting" : ""}${ritualCasting === spell.name ? " playfield__hand-card--ritual-casting" : ""}${deniedCard === spell.name ? " playfield__hand-card--denied" : ""}${concentratingOn === spell.name ? " playfield__hand-card--concentrating" : ""}${dragSpell === spell.name ? " playfield__hand-card--dragging" : ""}${dropTarget === spell.name && dragSpell !== spell.name ? " playfield__hand-card--drop-target" : ""}`}
                  style={cardDimStyle(spell)}
                  onDoubleClick={(e) => {
                    if (e.shiftKey && isRitual(spell)) {
                      ritualCast(spell);
                    } else {
                      playCard(spell);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (spell.level === 0) return;
                    const levels = getUpcastLevels(spell, slots);
                    if (levels.length === 0) return;
                    const x = Math.min(e.clientX, window.innerWidth - 160);
                    const y = Math.min(e.clientY, window.innerHeight - 200);
                    setUpcastMenu({ spell, x, y });
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, spell.name)}
                  onDragOver={(e) => handleDragOver(e, spell.name)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={() => setDropTarget(null)}
                >
                  {/* Badges */}
                  {concentratingOn === spell.name && (
                    <button
                      className="playfield__conc-badge"
                      onClick={() => setConcentratingOn(null)}
                      title="Drop concentration"
                    >
                      CONC
                    </button>
                  )}
                  {isRitual(spell) && (
                    <div className="playfield__ritual-badge">R</div>
                  )}

                  {/* Action buttons */}
                  <div className="playfield__card-actions">
                    <button
                      className="playfield__flip-btn"
                      onClick={() => toggleFlip(spell.name)}
                      title="Flip card for details"
                    >
                      {"\u2139"}
                    </button>
                    <button
                      className="playfield__remove-btn"
                      onClick={() => removeFromHand(spell.name)}
                      title="Remove from hand"
                    >
                      {"\u00D7"}
                    </button>
                    <button
                      className={`playfield__fav-btn ${favSet.has(spell.name) ? "playfield__fav-btn--active" : ""} ${!canPrepare(spell) ? "playfield__fav-btn--disabled" : ""}`}
                      onClick={() => toggleFavorite(spell.name)}
                      title={favSet.has(spell.name) ? "Unprepare" : canPrepare(spell) ? "Prepare" : `Prep limit reached (${preparedCount}/${prepLimit})`}
                    >
                      {favSet.has(spell.name) ? "\u2605" : "\u2606"}
                    </button>
                    {isRitual(spell) && (
                      <button
                        className="playfield__ritual-cast-btn"
                        onClick={() => ritualCast(spell)}
                        title="Ritual cast (no slot consumed)"
                      >
                        R
                      </button>
                    )}
                  </div>
                  <HoloCard spell={spell} flipped={flippedCards.has(spell.name)} />
                </div>
              ))}
              {showFavoritesOnly && displayHand.length === 0 && hand.length > 0 && (
                <div className="playfield__hand-hint">
                  No prepared spells in your hand yet — click the star on a card to mark it as prepared
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom bar */}
        <div className="playfield__bottom-bar">
          <div className="playfield__bottom-bar-row">
            <button
              className="playfield__rest-btn"
              onClick={handleRest}
              title="Long rest — full heal, restore all slots, clear concentration"
            >
              Rest
            </button>
            <div className="playfield__bottom-bar-divider" />
            <details className="playfield__bottom-section" open>
              <summary className="playfield__bottom-section-toggle">HP &amp; Conditions</summary>
              <HPTracker hp={hp} setHP={setHP} conditions={conditions} setConditions={setConditions} />
            </details>
            <div className="playfield__bottom-bar-divider" />
            <details className="playfield__bottom-section" open>
              <summary className="playfield__bottom-section-toggle">Spell Slots</summary>
              <SpellSlotTracker slots={slots} setSlots={setSlots} />
            </details>
          </div>
        </div>
      </div>

      {/* Upcast context menu */}
      {upcastMenu && (
        <>
          <div className="upcast-backdrop" onClick={() => setUpcastMenu(null)} />
          <div
            className="upcast-menu"
            style={{ left: upcastMenu.x, top: upcastMenu.y }}
          >
            <div className="upcast-menu__title">Upcast {upcastMenu.spell.name}</div>
            {getUpcastLevels(upcastMenu.spell, slots).map((lvl) => (
              <button
                key={lvl}
                className="upcast-menu__option"
                onClick={() => {
                  playCard(upcastMenu.spell, lvl);
                  setUpcastMenu(null);
                }}
              >
                Level {lvl}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Concentration switch confirmation */}
      {pendingCast && (
        <div className="conc-overlay" onClick={() => setPendingCast(null)}>
          <div className="conc-overlay__panel" onClick={(e) => e.stopPropagation()}>
            <p className="conc-overlay__text">
              You are concentrating on <strong>{concentratingOn}</strong>.
              Casting <strong>{pendingCast.spell.name}</strong> will break concentration.
            </p>
            <div className="conc-overlay__actions">
              <button className="conc-overlay__btn conc-overlay__btn--cancel" onClick={() => setPendingCast(null)}>Cancel</button>
              <button className="conc-overlay__btn conc-overlay__btn--confirm" onClick={confirmConcentrationSwitch}>Cast Anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* Import overlay */}
      {showImport && (
        <div className="import-overlay" onClick={() => setShowImport(false)}>
          <div className="import-overlay__panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="import-overlay__title">Import Character</h3>
            <p className="import-overlay__desc">Paste your exported JSON below:</p>
            <textarea
              className="import-overlay__textarea"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"version":1,"hand":[...],"favorites":[...],"slots":{...}}'
              rows={8}
            />
            {importError && <p className="import-overlay__error">{importError}</p>}
            <div className="import-overlay__actions">
              <button className="import-overlay__btn import-overlay__btn--cancel" onClick={() => setShowImport(false)}>Cancel</button>
              <button className="import-overlay__btn import-overlay__btn--confirm" onClick={handleImport} disabled={!importText.trim()}>Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
