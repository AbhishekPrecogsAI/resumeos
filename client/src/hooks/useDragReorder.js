import { useState } from 'react';

/**
 * Minimal HTML5 drag-and-drop reordering. Always paired with move-up/down buttons, since
 * drag-and-drop alone isn't keyboard or screen-reader accessible.
 */
export function useDragReorder(onMove) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const handleProps = (index) => ({
    draggable: true,
    onDragStart: (e) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    },
    onDragEnd: () => {
      setDragIndex(null);
      setOverIndex(null);
    },
  });

  const dropProps = (index) => ({
    onDragOver: (e) => {
      if (dragIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (overIndex !== index) setOverIndex(index);
    },
    onDrop: (e) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== index) onMove(dragIndex, index);
      setDragIndex(null);
      setOverIndex(null);
    },
  });

  return { handleProps, dropProps, dragIndex, overIndex };
}
