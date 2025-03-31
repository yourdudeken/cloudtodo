import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanTask } from './kanban-task';
import { Task } from '@/store/tasks';
import { Circle, Clock, CheckCircle } from 'lucide-react'; // Corrected import CheckCircle2 -> CheckCircle

// Define props interface including onTaskClick
interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  icon: 'circle' | 'clock' | 'check-circle';
  onTaskClick: (taskId: string) => void; // Add prop type
}

// Destructure props including onTaskClick
export function KanbanColumn({ id, title, tasks, icon, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  // Corrected Icon mapping based on actual imports
  const Icon = {
    circle: Circle,
    clock: Clock,
    'check-circle': CheckCircle, 
  }[icon];

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-50 rounded-lg p-4 min-h-[500px]"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-gray-600" />
        <h2 className="font-semibold text-gray-700">{title}</h2>
        <span className="ml-auto bg-gray-200 text-gray-600 px-2 py-1 rounded text-sm">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {tasks.map((task) => (
            // Pass onTaskClick down to KanbanTask
            <KanbanTask key={task.id} task={task} onTaskClick={onTaskClick} /> 
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
