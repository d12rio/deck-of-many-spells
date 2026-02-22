"use client";

import { useDroppable } from "@dnd-kit/core";

interface DroppableZoneProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  label?: string;
}

export default function DroppableZone({ id, children, className = "", label }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`droppable-zone ${isOver ? "droppable-zone--over" : ""} ${className}`}
    >
      {label && <span className="droppable-zone__label">{label}</span>}
      {children}
    </div>
  );
}
