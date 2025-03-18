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
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTaskStore } from '@/store/tasks';
import { KanbanColumn } from './kanban-column';
import { KanbanTask } from './kanban-task';

type TaskStatus = 'todo' | 'in-progress' | 'completed';

export function KanbanBoard() {
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
          return !task.completed && !task.tags?.includes('In Progress');
        case 'in-progress':
          return !task.completed && task.tags?.includes('In Progress');
        case 'completed':
          return task.completed;
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
          completed: false,
          tags: task.tags?.filter((tag) => tag !== 'In Progress'),
        };
        break;
      case 'in-progress':
        updatedTask = {
          completed: false,
          tags: [...(task.tags || []), 'In Progress'],
        };
        break;
      case 'completed':
        updatedTask = {
          completed: true,
          tags: task.tags?.filter((tag) => tag !== 'In Progress'),
        };
        break;
    }

    updateTask(taskId, updatedTask);
    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-8">Kanban Board</h1>
      
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setActiveId(active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KanbanColumn
            id="todo"
            title="To Do"
            tasks={getTasksByStatus('todo')}
            icon="circle"
          />
          <KanbanColumn
            id="in-progress"
            title="In Progress"
            tasks={getTasksByStatus('in-progress')}
            icon="clock"
          />
          <KanbanColumn
            id="completed"
            title="Completed"
            tasks={getTasksByStatus('completed')}
            icon="check-circle"
          />
        </div>

        <DragOverlay>
          {activeId && activeTask ? (
            <div className="bg-white shadow-lg rounded-lg border p-4">
              <KanbanTask task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}