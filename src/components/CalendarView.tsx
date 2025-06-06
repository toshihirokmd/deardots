import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface CalendarViewProps {
  groupId: Id<"groups">;
  onBack: () => void;
}

export function CalendarView({ groupId, onBack }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const entries = useQuery(api.entries.getEntriesForCalendar, {
    groupId,
    year,
    month,
  });

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEntriesForDate = (day: number) => {
    if (!entries) return [];
    const targetDate = new Date(year, month - 1, day);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).getTime();
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).getTime();
    
    return entries.filter(entry => 
      entry.entryDate >= startOfDay && entry.entryDate <= endOfDay
    );
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Calendar View</h2>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-200 shadow-sm">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Previous
          </button>
          <h3 className="text-xl font-semibold text-gray-800">
            {monthNames[month - 1]} {year}
          </h3>
          <button
            onClick={() => navigateMonth("next")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Next →
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty days for month start */}
          {emptyDays.map(day => (
            <div key={`empty-${day}`} className="h-24 p-1"></div>
          ))}
          
          {/* Days with entries */}
          {daysArray.map(day => {
            const dayEntries = getEntriesForDate(day);
            const hasEntries = dayEntries.length > 0;
            
            return (
              <div
                key={day}
                className={`h-24 p-1 border border-gray-100 rounded-lg ${
                  hasEntries ? "bg-gradient-to-br from-orange-50 to-pink-50" : "bg-gray-50"
                }`}
              >
                <div className="h-full flex flex-col">
                  <div className={`text-sm font-medium mb-1 ${
                    hasEntries ? "text-orange-600" : "text-gray-600"
                  }`}>
                    {day}
                  </div>
                  
                  {hasEntries && (
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {dayEntries.slice(0, 2).map((entry, index) => (
                        <div
                          key={entry._id}
                          className="text-xs bg-white/70 rounded px-1 py-0.5 truncate"
                          title={entry.title || entry.content.slice(0, 50)}
                        >
                          <span className="font-medium">{entry.author?.name}</span>
                          {entry.title && (
                            <span className="text-gray-600">: {entry.title}</span>
                          )}
                        </div>
                      ))}
                      
                      {dayEntries.length > 2 && (
                        <div className="text-xs text-orange-600 font-medium">
                          +{dayEntries.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-br from-orange-50 to-pink-50 border border-gray-200 rounded"></div>
          <span>Days with entries</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
          <span>No entries</span>
        </div>
      </div>
    </div>
  );
}
