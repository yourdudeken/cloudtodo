import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
/*import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';*/
import { useTaskStore } from '@/store/tasks';
import { KanbanColumn } from './kanban-column';
import { KanbanTask } from './kanban-task';

type TaskStatus = 'todo' | 'in-progress' | 'completed';

interface KanbanBoardProps {
  onTaskClick: (taskId: string) => void; // Add prop type
}

export function KanbanBoard({ onTaskClick }: KanbanBoardProps) { // Destructure prop
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => {
      switch (status) {
        case 'todo':
          return task.status === 'pending' && !task.tags?.includes('In Progress');
        case 'in-progress':
          return task.status === 'pending' && task.tags?.includes('In Progress');
        case 'completed':
          return task.status === 'completed';
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let updatedTask: Partial<typeof task> = {};

    switch (newStatus) {
      case 'todo':
        updatedTask = {
          status: 'pending',
          tags: task.tags?.filter((tag) => tag !== 'In Progress'),
        };
        break;
      case 'in-progress':
        updatedTask = {
          status: 'pending',
          tags: [...(task.tags || []), 'In Progress'],
        };
        break;
      case 'completed':
        updatedTask = {
          status: 'completed',
          tags: task.tags?.filter((tag) => tag !== 'In Progress'),
        };
        break;
    }

    // Update both local state and Google Drive
    updateTask(taskId, updatedTask);
    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : null;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-xl md:text-2xl font-semibold mb-4 md:mb-8">Kanban Board</h1>
      
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setActiveId(active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto">
          <KanbanColumn
            id="todo"
            title="To Do"
            tasks={getTasksByStatus('todo')}
            icon="circle"
            onTaskClick={onTaskClick} // Pass prop
          />
          <KanbanColumn
            id="in-progress"
            title="In Progress"
            tasks={getTasksByStatus('in-progress')}
            icon="clock"
            onTaskClick={onTaskClick} // Pass prop
          />
          <KanbanColumn
            id="completed"
            title="Completed"
            tasks={getTasksByStatus('completed')}
            icon="check-circle"
            onTaskClick={onTaskClick} // Pass prop
          />
        </div>

        {/* Pass onTaskClick to the DragOverlay task as well */}
        <DragOverlay>
          {activeId && activeTask ? (
            <div className="bg-white shadow-lg rounded-lg border p-4">
              <KanbanTask task={activeTask} onTaskClick={onTaskClick} /> 
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
