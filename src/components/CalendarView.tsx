import React, { useState } from 'react';
import { useTodoStore } from '../store/todos';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { todos } = useTodoStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startingDayOfWeek = monthStart.getDay();
  const daysInPreviousMonth = Array(startingDayOfWeek).fill(null);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getTasksForDate = (date: Date) => {
    return todos.filter(todo => {
      if (!todo.dueDate) return false;
      return isSameDay(new Date(todo.dueDate), date);
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={previousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="text-center font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}

        {/* Previous month padding */}
        {daysInPreviousMonth.map((_, index) => (
          <div
            key={`prev-${index}`}
            className="h-32 p-1 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          />
        ))}

        {/* Current month days */}
        {daysInMonth.map(date => {
          const tasksForDay = getTasksForDate(date);
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isCurrentDay = isToday(date);

          return (
            <div
              key={date.toString()}
              className={`h-32 p-1 border border-gray-200 dark:border-gray-700 ${
                isCurrentMonth
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-gray-50 dark:bg-gray-900'
              } ${
                isCurrentDay
                  ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                  : ''
              }`}
            >
              <div className="flex flex-col h-full">
                <span className={`text-sm ${
                  isCurrentDay
                    ? 'font-bold text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {format(date, 'd')}
                </span>
                <div className="flex-1 overflow-y-auto">
                  {tasksForDay.map(task => (
                    <div
                      key={task.id}
                      className={`text-xs p-1 mb-1 rounded ${
                        task.completed
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : task.priority === 'high'
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          : task.priority === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};