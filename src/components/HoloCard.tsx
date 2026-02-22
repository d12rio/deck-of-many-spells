"use client";

import { useState, useRef, useCallback } from "react";
import type { Spell } from "@/lib/spells";
import {
  cardImagePath,
  schoolName,
  formatCastingTime,
  formatRange,
  formatComponents,
  formatDuration,
  formatEntries,
  cleanEntryText,
} from "@/lib/spells";

interface HoloCardProps {
  spell: Spell;
  className?: string;
  style?: React.CSSProperties;
  flipped?: boolean;
}

export default function HoloCard({ spell, className = "", style, flipped = false }: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x, y });
  }, []);

  const rotateX = hovering ? (pos.y - 50) / 3.5 : 0;
  const rotateY = hovering ? -(pos.x - 50) / 3.5 : 0;

  const gradientPos = `${pos.x}% ${pos.y}%`;

  return (
    <div
      className={`holo-card-wrapper ${className}`}
      style={{
        perspective: "800px",
        ...style,
      }}
    >
      <div
        ref={cardRef}
        className={`holo-card ${hovering ? "holo-card--active" : ""}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => {
          setHovering(false);
          setPos({ x: 50, y: 50 });
        }}
        style={{
          "--mx": `${pos.x}%`,
          "--my": `${pos.y}%`,
          "--rotateX": `${rotateX}deg`,
          "--rotateY": `${rotateY}deg`,
          "--gradient-pos": gradientPos,
        } as React.CSSProperties}
      >
        <div className={`holo-card__flipper ${flipped ? "holo-card__flipper--flipped" : ""}`}>
          {/* Front face */}
          <div className="holo-card__face holo-card__face--front">
            <img
              src={cardImagePath(spell)}
              alt={spell.name}
              className="holo-card__img"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="holo-card__fallback">
              <div className="holo-card__level">
                {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}
              </div>
              <div className="holo-card__name">{spell.name}</div>
              <div className="holo-card__school">{schoolName(spell.school)}</div>
            </div>
            <div className="holo-card__shine" />
            <div className="holo-card__glare" />
          </div>

          {/* Back face */}
          <div className="holo-card__face holo-card__face--back">
            <div className="holo-card__back-content">
              <div className="holo-card__back-name">{spell.name}</div>
              <div className="holo-card__back-subtitle">
                {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`} {schoolName(spell.school)}
              </div>
              <div className="holo-card__back-stats">
                <div className="holo-card__back-stat">
                  <span className="holo-card__back-stat-label">Cast</span>
                  <span>{formatCastingTime(spell)}</span>
                </div>
                <div className="holo-card__back-stat">
                  <span className="holo-card__back-stat-label">Range</span>
                  <span>{formatRange(spell)}</span>
                </div>
                <div className="holo-card__back-stat">
                  <span className="holo-card__back-stat-label">Comp.</span>
                  <span>{formatComponents(spell)}</span>
                </div>
                <div className="holo-card__back-stat">
                  <span className="holo-card__back-stat-label">Duration</span>
                  <span>{formatDuration(spell)}</span>
                </div>
              </div>
              <div className="holo-card__back-desc">
                {formatEntries(spell.entries).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              {spell.entriesHigherLevel && spell.entriesHigherLevel[0] && (
                <div className="holo-card__back-higher">
                  <strong>{spell.entriesHigherLevel[0].name}.</strong>{" "}
                  {spell.entriesHigherLevel[0].entries.map((e) => cleanEntryText(e)).join(" ")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
