"use client";

import { useState } from "react";

export interface SlotLevel {
  max: number;
  used: number;
}

export type SlotState = Record<number, SlotLevel>;

export const DEFAULT_SLOTS: SlotState = {
  1: { max: 4, used: 0 },
  2: { max: 3, used: 0 },
  3: { max: 3, used: 0 },
  4: { max: 3, used: 0 },
  5: { max: 3, used: 0 },
  6: { max: 2, used: 0 },
  7: { max: 2, used: 0 },
  8: { max: 1, used: 0 },
  9: { max: 1, used: 0 },
};

export function hasAvailableSlot(slots: SlotState, spellLevel: number): boolean {
  if (spellLevel === 0) return true; // cantrips don't use slots
  const s = slots[spellLevel];
  if (!s) return false;
  return s.used < s.max;
}

interface SpellSlotTrackerProps {
  slots: SlotState;
  setSlots: (value: SlotState | ((prev: SlotState) => SlotState)) => void;
}

export default function SpellSlotTracker({ slots, setSlots }: SpellSlotTrackerProps) {
  const [editing, setEditing] = useState(false);

  const useSlot = (level: number) => {
    setSlots((prev) => {
      const s = prev[level];
      if (!s || s.used >= s.max) return prev;
      return { ...prev, [level]: { ...s, used: s.used + 1 } };
    });
  };

  const restoreSlot = (level: number) => {
    setSlots((prev) => {
      const s = prev[level];
      if (!s || s.used <= 0) return prev;
      return { ...prev, [level]: { ...s, used: s.used - 1 } };
    });
  };

  const setMax = (level: number, max: number) => {
    const clamped = Math.max(0, Math.min(20, max));
    setSlots((prev) => {
      const s = prev[level];
      return {
        ...prev,
        [level]: { max: clamped, used: Math.min(s?.used ?? 0, clamped) },
      };
    });
  };

  const levels = Object.entries(slots)
    .map(([k, v]) => [Number(k), v] as [number, SlotLevel])
    .sort(([a], [b]) => a - b);

  // Hide levels with 0 max slots unless editing
  const visibleLevels = editing ? levels : levels.filter(([, v]) => v.max > 0);

  return (
    <div className="slot-tracker">
      <div className="slot-tracker__header">
        <div className="slot-tracker__actions">
          <button
            className={`slot-tracker__btn ${editing ? "slot-tracker__btn--active" : ""}`}
            onClick={() => setEditing(!editing)}
            title="Configure max slots"
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      <div className="slot-tracker__levels">
        {visibleLevels.map(([level, { max, used }]) => {
          const remaining = max - used;
          return (
            <div key={level} className="slot-tracker__level">
              <span className="slot-tracker__level-label">{level}</span>

              {editing ? (
                <div className="slot-tracker__edit-row">
                  <button
                    className="slot-tracker__adj-btn"
                    onClick={() => setMax(level, max - 1)}
                  >
                    -
                  </button>
                  <span className="slot-tracker__max-val">{max}</span>
                  <button
                    className="slot-tracker__adj-btn"
                    onClick={() => setMax(level, max + 1)}
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="slot-tracker__pips">
                  {Array.from({ length: max }, (_, i) => (
                    <button
                      key={i}
                      className={`slot-tracker__pip ${i < remaining ? "slot-tracker__pip--available" : "slot-tracker__pip--used"}`}
                      onClick={() => (i < remaining ? useSlot(level) : restoreSlot(level))}
                      title={i < remaining ? "Use slot" : "Restore slot"}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
