"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Spell } from "@/lib/spells";
import HoloCard from "./HoloCard";

interface DraggableCardProps {
  id: string;
  spell: Spell;
  className?: string;
}

export default function DraggableCard({ id, spell, className = "" }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { spell },
  });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
    touchAction: "none",
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={className}>
      <HoloCard spell={spell} />
    </div>
  );
}
