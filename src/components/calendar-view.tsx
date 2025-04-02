import React from 'react';
import { useTaskStore } from '@/store/tasks';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfToday, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaskDetail } from './task-detail';

export function CalendarView() {
  const tasks = useTaskStore((state) => state.tasks);
  const [selectedDate, setSelectedDate] = React.useState(startOfToday());
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const firstDayCurrentMonth = startOfMonth(selectedDate);

  const days = eachDayOfInterval({
    start: startOfMonth(firstDayCurrentMonth),
    end: endOfMonth(firstDayCurrentMonth),
  });

  const priorityColors = {
    1: 'bg-red-100 text-red-700 ring-red-600',
    2: 'bg-orange-100 text-orange-700 ring-orange-600',
    3: 'bg-blue-100 text-blue-700 ring-blue-600',
    4: 'bg-gray-100 text-gray-700 ring-gray-600',
  };

  const previousMonth = () => {
    const firstDayNextMonth = new Date(firstDayCurrentMonth);
    firstDayNextMonth.setMonth(firstDayNextMonth.getMonth() - 1);
    setSelectedDate(firstDayNextMonth);
  };

  const nextMonth = () => {
    const firstDayNextMonth = new Date(firstDayCurrentMonth);
    firstDayNextMonth.setMonth(firstDayNextMonth.getMonth() + 1);
    setSelectedDate(firstDayNextMonth);
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => task.dueDate && isSameDay(new Date(task.dueDate), date));
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-8 w-8 text-gray-700" />
          <h1 className="text-2xl font-semibold">Calendar</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-semibold text-xl">
            {format(firstDayCurrentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden shadow-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="bg-gray-50 py-2 text-center text-sm font-semibold text-gray-700"
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const tasksForDay = getTasksForDate(day);
          const firstTask = tasksForDay[0];
          const additionalTasks = tasksForDay.length - 1;

          return (
            <div
              key={day.toString()}
              className={cn(
                'min-h-[120px] bg-white p-2',
                !isSameMonth(day, firstDayCurrentMonth) && 'text-gray-400 bg-gray-50'
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'font-semibold text-sm w-8 h-8 rounded-full flex items-center justify-center',
                    isToday(day) && 'bg-blue-600 text-white',
                    isSameDay(day, selectedDate) && !isToday(day) && 'bg-gray-100'
                  )}
                >
                  {format(day, 'd')}
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {firstTask && (
                  <div
                    className={cn(
                      'text-xs p-1 rounded truncate cursor-pointer hover:ring-2 transition-all',
                      firstTask.priority ? priorityColors[firstTask.priority as keyof typeof priorityColors] : priorityColors[4]
                    )}
                    onClick={() => firstTask.id && setSelectedTaskId(firstTask.id)}
                  >
                    {firstTask.taskTitle}
                  </div>
                )}
                {additionalTasks > 0 && (
                  <div className="text-xs text-gray-500 pl-1">
                    +{additionalTasks} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected date tasks */}
      {getTasksForDate(selectedDate).length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold text-lg mb-4">
            Tasks for {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          <div className="space-y-2">
            {getTasksForDate(selectedDate).map((task) => (
              <div
                key={task.id}
                className={cn(
                  'p-3 rounded-lg cursor-pointer hover:ring-2 transition-all',
                  task.priority ? priorityColors[task.priority as keyof typeof priorityColors] : priorityColors[4]
                )}
                onClick={() => task.id && setSelectedTaskId(task.id)}
              >
                <div className="font-medium">{task.taskTitle}</div>
                {task.description && (
                  <div className="text-sm mt-1 opacity-80">{task.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Detail Dialog */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
