import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/store/tasks';
import { Calendar, Flag, Tag, Battery as Category } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface KanbanTaskProps {
  task: Task;
  onTaskClick: (taskId: string) => void; // Add prop
}

export function KanbanTask({ task, onTaskClick }: KanbanTaskProps) { // Destructure prop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id || crypto.randomUUID() }); // Fallback ID if undefined

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-blue-500',
    4: 'bg-gray-500',
  };

  // Get first category if exists
  const firstCategory = task.categories?.[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white rounded-lg border p-2 md:p-3 shadow-sm
        hover:shadow-md transition-shadow cursor-move group
        ${isDragging ? 'opacity-50' : ''}
        min-w-[280px] md:min-w-0
      `}
    >
      {/* Make inner content clickable */}
      <div 
        className="flex items-start gap-2 cursor-pointer" 
        onClick={() => task.id && onTaskClick(task.id)}
      >
        <div className={`w-2 h-2 rounded-full mt-2 ${priorityColors[(task.priority ?? 4) as keyof typeof priorityColors]} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600">{task.taskTitle}</h3>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2 mt-2">
            {firstCategory && (
              <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                <Category className="h-3 w-3" />
                {firstCategory}
              </div>
            )}
            {task.tags?.map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </div>
            ))}
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {task.dueDate && format(parseISO(task.dueDate), 'MMM d')}
              {task.dueTime && ` at ${task.dueTime}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
