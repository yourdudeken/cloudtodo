import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanTask } from './kanban-task';
import { Task } from '@/store/tasks';
import { Circle, Clock, CheckCircle } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  icon: 'circle' | 'clock' | 'check-circle';
}

export function KanbanColumn({ id, title, tasks, icon }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

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
            <KanbanTask key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}