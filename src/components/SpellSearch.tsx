"use client";

import { useState, useMemo } from "react";
import type { Spell } from "@/lib/spells";
import { allSpells, schoolName, cleanEntryText } from "@/lib/spells";

interface SpellSearchProps {
  onSelect: (spell: Spell) => void;
  selectedNames: Set<string>;
}

export default function SpellSearch({ onSelect, selectedNames }: SpellSearchProps) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let results = allSpells;
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter((s) => {
        if (s.name.toLowerCase().includes(q)) return true;
        return s.entries.some(
          (e) => typeof e === "string" && cleanEntryText(e).toLowerCase().includes(q)
        );
      });
    }
    if (levelFilter !== null) {
      results = results.filter((s) => s.level === levelFilter);
    }
    return results.slice(0, 50);
  }, [query, levelFilter]);

  return (
    <div className="spell-search">
      <div className="spell-search__header">
        <h2 className="spell-search__title">Spell Deck</h2>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search spells..."
        className="spell-search__input"
      />

      <div className="spell-search__filters">
        <button
          onClick={() => setLevelFilter(null)}
          className={`spell-search__filter-btn ${levelFilter === null ? "spell-search__filter-btn--active" : ""}`}
        >
          All
        </button>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevelFilter(lvl)}
            className={`spell-search__filter-btn ${levelFilter === lvl ? "spell-search__filter-btn--active" : ""}`}
          >
            {lvl === 0 ? "C" : lvl}
          </button>
        ))}
      </div>

      <ul className="spell-search__list">
        {filtered.map((spell) => {
          const isSelected = selectedNames.has(spell.name);
          return (
            <li key={spell.name} className="spell-search__item">
              <button
                onClick={() => onSelect(spell)}
                disabled={isSelected}
                className={`spell-search__spell-btn ${isSelected ? "spell-search__spell-btn--selected" : ""}`}
              >
                <span className="spell-search__spell-name">{spell.name}</span>
                <span className="spell-search__spell-meta">
                  {spell.level === 0 ? "Cantrip" : `Lvl ${spell.level}`}
                  {" · "}
                  {schoolName(spell.school)}
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="spell-search__empty">No spells found</li>
        )}
      </ul>
    </div>
  );
}
