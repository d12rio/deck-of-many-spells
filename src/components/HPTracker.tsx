"use client";

import { useState } from "react";

export interface HPState {
  current: number;
  max: number;
  temp: number;
}

export const DEFAULT_HP: HPState = { current: 10, max: 10, temp: 0 };

const CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Exhaustion",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
] as const;

interface HPTrackerProps {
  hp: HPState;
  setHP: (value: HPState | ((prev: HPState) => HPState)) => void;
  conditions: string[];
  setConditions: (value: string[] | ((prev: string[]) => string[])) => void;
}

export default function HPTracker({ hp, setHP, conditions, setConditions }: HPTrackerProps) {
  const [editing, setEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(false);

  const condSet = new Set(conditions);

  const adjustHP = (amount: number) => {
    setHP((prev) => {
      if (amount < 0) {
        // Damage: hits temp HP first
        let damage = Math.abs(amount);
        let newTemp = prev.temp;
        let newCurrent = prev.current;
        if (newTemp > 0) {
          const absorbed = Math.min(newTemp, damage);
          newTemp -= absorbed;
          damage -= absorbed;
        }
        newCurrent = Math.max(0, newCurrent - damage);
        return { ...prev, current: newCurrent, temp: newTemp };
      } else {
        // Healing: can't exceed max
        const newCurrent = Math.min(prev.max, prev.current + amount);
        return { ...prev, current: newCurrent };
      }
    });
  };

  const setMax = (max: number) => {
    const clamped = Math.max(1, Math.min(999, max));
    setHP((prev) => ({
      ...prev,
      max: clamped,
      current: Math.min(prev.current, clamped),
    }));
  };

  const setTemp = (temp: number) => {
    setHP((prev) => ({ ...prev, temp: Math.max(0, Math.min(999, temp)) }));
  };

  const setCurrent = (current: number) => {
    setHP((prev) => ({
      ...prev,
      current: Math.max(0, Math.min(prev.max, current)),
    }));
  };

  const toggleCondition = (cond: string) => {
    setConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  // HP bar calculations
  const ratio = hp.max > 0 ? hp.current / hp.max : 0;
  const totalRatio = hp.max > 0 ? Math.min(1, (hp.current + hp.temp) / hp.max) : 0;
  const hpBarWidth = Math.round(ratio * 100);
  const tempBarWidth = Math.round(Math.min(totalRatio - ratio, 1 - ratio) * 100);

  const barColor =
    ratio > 0.5 ? "var(--hp-green)" : ratio > 0.25 ? "var(--hp-yellow)" : "var(--hp-red)";

  // Sort conditions: active first
  const sortedConditions = [...CONDITIONS].sort((a, b) => {
    const aActive = condSet.has(a) ? 0 : 1;
    const bActive = condSet.has(b) ? 0 : 1;
    return aActive - bActive;
  });

  return (
    <div className="hp-tracker">
      <div className="hp-tracker__header">
        <button
          className={`hp-tracker__btn ${editing ? "hp-tracker__btn--active" : ""}`}
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing ? (
        <div className="hp-tracker__edit">
          <label className="hp-tracker__edit-field">
            <span className="hp-tracker__edit-label">Max</span>
            <input
              type="number"
              className="hp-tracker__edit-input"
              value={hp.max}
              onChange={(e) => setMax(Number(e.target.value) || 1)}
              min={1}
              max={999}
            />
          </label>
          <label className="hp-tracker__edit-field">
            <span className="hp-tracker__edit-label">Temp</span>
            <input
              type="number"
              className="hp-tracker__edit-input"
              value={hp.temp}
              onChange={(e) => setTemp(Number(e.target.value) || 0)}
              min={0}
              max={999}
            />
          </label>
        </div>
      ) : (
        <div className="hp-tracker__bar-group">
          <div className="hp-tracker__bar-container">
            <div
              className="hp-tracker__bar"
              style={{ width: `${hpBarWidth}%`, background: barColor }}
            />
            {hp.temp > 0 && (
              <div
                className="hp-tracker__bar hp-tracker__bar--temp"
                style={{ width: `${tempBarWidth}%`, left: `${hpBarWidth}%` }}
              />
            )}
          </div>
          <div className="hp-tracker__values">
            {editingValue ? (
              <input
                type="number"
                className="hp-tracker__value-input"
                value={hp.current}
                onChange={(e) => setCurrent(Number(e.target.value) || 0)}
                onBlur={() => setEditingValue(false)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingValue(false); }}
                autoFocus
              />
            ) : (
              <button className="hp-tracker__value-btn" onClick={() => setEditingValue(true)} title="Click to edit current HP">
                {hp.current}
              </button>
            )}
            <span className="hp-tracker__value-sep">/</span>
            <span className="hp-tracker__value-max">{hp.max}</span>
            {hp.temp > 0 && (
              <span className="hp-tracker__value-temp">+{hp.temp}</span>
            )}
          </div>
          <div className="hp-tracker__controls">
            <button className="hp-tracker__adj hp-tracker__adj--dmg" onClick={() => adjustHP(-5)}>-5</button>
            <button className="hp-tracker__adj hp-tracker__adj--dmg" onClick={() => adjustHP(-1)}>-1</button>
            <button className="hp-tracker__adj hp-tracker__adj--heal" onClick={() => adjustHP(1)}>+1</button>
            <button className="hp-tracker__adj hp-tracker__adj--heal" onClick={() => adjustHP(5)}>+5</button>
          </div>
        </div>
      )}

      <div className="hp-tracker__conditions">
        {sortedConditions.map((cond) => (
          <button
            key={cond}
            className={`hp-tracker__condition ${condSet.has(cond) ? "hp-tracker__condition--active" : ""}`}
            onClick={() => toggleCondition(cond)}
            title={cond}
          >
            {cond}
          </button>
        ))}
      </div>
    </div>
  );
}
