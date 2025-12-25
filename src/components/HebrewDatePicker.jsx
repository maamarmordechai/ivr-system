import React, { useState } from 'react';
import { HDate, months, HebrewCalendar, Sedra } from '@hebcal/core';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Calendar } from 'lucide-react';

const HEBREW_MONTHS = [
  'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול',
  'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר'
];

const HEBREW_DAYS_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const ENGLISH_DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sat'];

export default function HebrewDatePicker({ label, value, onChange, className = '' }) {
  const [showPicker, setShowPicker] = useState(false);
  
  // Convert Gregorian date to Hebrew
  const getHebrewDate = (gregorianDate) => {
    if (!gregorianDate) return null;
    const date = new Date(gregorianDate);
    const hdate = new HDate(date);
    return hdate;
  };

  // Convert Hebrew date to Gregorian
  const toGregorian = (hebrewDay, hebrewMonth, hebrewYear) => {
    const hdate = new HDate(hebrewDay, hebrewMonth, hebrewYear);
    return hdate.greg();
  };

  const currentHebDate = value ? getHebrewDate(value) : getHebrewDate(new Date());
  
  const formatHebrewDate = (date) => {
    if (!date) return '';
    const hdate = getHebrewDate(date);
    const monthName = HEBREW_MONTHS[hdate.getMonth() - 1] || hdate.getMonthName();
    
    // Get Parsha (Torah portion) for the week
    try {
      const sedra = new Sedra(hdate.getFullYear(), false); // false = Israel
      const saturday = hdate.onOrAfter(6); // Get the next Saturday
      const parsha = sedra.get(saturday);
      // parsha is array of strings
      const parshaName = parsha && Array.isArray(parsha) && parsha.length > 0 ? parsha.join('-') : '';
      
      return {
        hebrew: `${hdate.getDate()} ${monthName} ${hdate.getFullYear()}`,
        parsha: parshaName
      };
    } catch (e) {
      return {
        hebrew: `${hdate.getDate()} ${monthName} ${hdate.getFullYear()}`,
        parsha: ''
      };
    }
  };

  const formatGregorianDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  // Helper to get Hebrew number representation
  const getHebrewNumber = (num) => {
    const hebrewNumerals = {
      1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה',
      6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט', 10: 'י',
      11: 'יא', 12: 'יב', 13: 'יג', 14: 'יד', 15: 'טו',
      16: 'טז', 17: 'יז', 18: 'יח', 19: 'יט', 20: 'כ',
      21: 'כא', 22: 'כב', 23: 'כג', 24: 'כד', 25: 'כה',
      26: 'כו', 27: 'כז', 28: 'כח', 29: 'כט', 30: 'ל'
    };
    return hebrewNumerals[num] || num.toString();
  };

  // Generate calendar days for current Hebrew month
  const generateCalendarDays = () => {
    const year = currentHebDate.getFullYear();
    const month = currentHebDate.getMonth();
    
    // Hebrew months have either 29 or 30 days
    let daysInMonth = 30;
    try {
      const testDate = new HDate(30, month, year);
      daysInMonth = 30;
    } catch (error) {
      daysInMonth = 29;
    }
    
    // Get the first day of the month to determine starting position
    const firstDayOfMonth = new HDate(1, month, year);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 6 = Saturday
    
    const days = [];
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        hebrewDay: null,
        gregorianDate: null,
        isToday: false,
        isSelected: false,
        isEmpty: true
      });
    }
    
    // Add actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      try {
        const hdate = new HDate(day, month, year);
        const greg = hdate.greg();
        
        // Check for Parsha on Shabbat
        let parshaName = null;
        if (hdate.getDay() === 6) { // Saturday
          try {
            const sedra = new Sedra(year, false);
            const parsha = sedra.get(hdate);
            // parsha is array of strings
            if (parsha && Array.isArray(parsha) && parsha.length > 0) {
              parshaName = parsha.join('-');
            }
          } catch (e) {
            // Ignore parsha errors
          }
        }
        
        days.push({
          hebrewDay: day,
          gregorianDate: greg,
          isToday: new Date().toDateString() === greg.toDateString(),
          isSelected: value && new Date(value).toDateString() === greg.toDateString(),
          parshaName: parshaName,
          isShabbat: hdate.getDay() === 6
        });
      } catch (error) {
        console.error(`Error creating date for day ${day}:`, error);
      }
    }
    
    // Fill remaining cells to complete the grid (up to 6 weeks)
    const totalCells = Math.ceil(days.length / 7) * 7;
    while (days.length < totalCells) {
      days.push({
        hebrewDay: null,
        gregorianDate: null,
        isToday: false,
        isSelected: false,
        isEmpty: true
      });
    }
    
    return days;
  };

  const handleDateSelect = (gregorianDate) => {
    onChange(gregorianDate.toISOString().split('T')[0]);
    setShowPicker(false);
  };

  const changeMonth = (direction) => {
    const newMonth = currentHebDate.getMonth() + direction;
    const newYear = newMonth > 12 ? currentHebDate.getFullYear() + 1 : 
                    newMonth < 1 ? currentHebDate.getFullYear() - 1 : 
                    currentHebDate.getFullYear();
    const adjustedMonth = newMonth > 12 ? 1 : newMonth < 1 ? 12 : newMonth;
    
    const newHDate = new HDate(1, adjustedMonth, newYear);
    onChange(newHDate.greg().toISOString().split('T')[0]);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label className="text-sm font-medium text-slate-700">{label}</Label>}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 bg-white transition-colors text-left flex items-center gap-3"
        >
          <Calendar className="w-5 h-5 text-slate-400" />
          <div className="flex-1">
            <div className="text-base font-semibold text-slate-800">
              {formatHebrewDate(value).hebrew}
            </div>
            <div className="text-sm text-slate-500">
              {formatGregorianDate(value)}
            </div>
          </div>
        </button>

        {showPicker && (
          <>
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]"
              onClick={() => setShowPicker(false)}
            />
            
            {/* Calendar popup */}
            <div className="fixed z-[9999] w-[420px] bg-white border-2 border-slate-200 rounded-xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto" 
                 style={{
                   top: '50%',
                   left: '50%',
                   transform: 'translate(-50%, -50%)'
                 }}>
            {/* Weekly Parsha Display */}
            {(() => {
              try {
                const sedra = new Sedra(currentHebDate.getFullYear(), false);
                const saturday = currentHebDate.onOrAfter(6);
                const parsha = sedra.get(saturday);
                if (parsha && parsha.length > 0) {
                  return (
                    <div className="mb-4 p-4 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl shadow-md">
                      <div className="text-xs font-semibold text-purple-100 mb-1">פרשת השבוע • WEEKLY PARSHA</div>
                      <div className="font-bold text-2xl text-white">{parsha[0].he}</div>
                      {parsha[0].en && <div className="text-sm text-purple-100 mt-1">{parsha[0].en}</div>}
                    </div>
                  );
                }
              } catch (e) {
                return null;
              }
              return null;
            })()}
            
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-slate-100">
              <Button
                onClick={() => changeMonth(-1)}
                variant="outline"
                size="sm"
                className="px-4 py-2 hover:bg-slate-100"
                type="button"
              >
                ←
              </Button>
              <div className="text-center">
                <div className="font-bold text-xl text-slate-800">
                  {HEBREW_MONTHS[currentHebDate.getMonth() - 1] || currentHebDate.getMonthName()}
                </div>
                <div className="text-sm text-slate-600 font-semibold">
                  {currentHebDate.getFullYear()} • כסלו
                </div>
              </div>
              <Button
                onClick={() => changeMonth(1)}
                variant="outline"
                size="sm"
                className="px-4 py-2 hover:bg-slate-100"
                type="button"
              >
                →
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers - Dual Language */}
              {HEBREW_DAYS_SHORT.map((hDay, idx) => (
                <div key={hDay} className="text-center py-2">
                  <div className="text-xs font-bold text-slate-700">{hDay}</div>
                  <div className="text-[10px] text-slate-400">{ENGLISH_DAYS_SHORT[idx]}</div>
                </div>
              ))}

              {/* Calendar days */}
              {generateCalendarDays().map((dayInfo, idx) => {
                if (dayInfo.isEmpty) {
                  return <div key={`empty-${idx}`} className="p-2 min-h-[70px]"></div>;
                }
                
                const gregDay = dayInfo.gregorianDate.getDate();
                
                return (
                  <button
                    key={`day-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDateSelect(dayInfo.gregorianDate);
                    }}
                    className={`
                      p-2 text-sm rounded-lg transition-all flex flex-col items-center justify-between min-h-[85px] relative group
                      ${dayInfo.isSelected ? 'bg-blue-600 text-white shadow-lg scale-105' : ''}
                      ${dayInfo.isToday && !dayInfo.isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : ''}
                      ${dayInfo.isShabbat && !dayInfo.isSelected ? 'bg-purple-100 ring-2 ring-purple-400' : ''}
                      ${!dayInfo.isSelected && !dayInfo.isToday && !dayInfo.isShabbat ? 'hover:bg-slate-100 hover:ring-1 hover:ring-slate-300' : ''}
                      ${dayInfo.parshaName ? 'font-bold' : ''}
                    `}
                    title={dayInfo.parshaName ? `שבת קודש • פרשת ${dayInfo.parshaName}` : ''}
                  >
                    {/* Hebrew Date - Top */}
                    <div className={`text-xl font-bold ${dayInfo.isShabbat && !dayInfo.isSelected ? 'text-purple-800' : dayInfo.isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {getHebrewNumber(dayInfo.hebrewDay)}
                    </div>
                    
                    {/* Parsha Name - Middle (if exists) */}
                    {dayInfo.parshaName && (
                      <div className={`text-[10px] font-bold leading-tight text-center px-0.5 ${dayInfo.isSelected ? 'text-yellow-300' : 'text-purple-800'}`}>
                        {dayInfo.parshaName}
                      </div>
                    )}
                    
                    {/* Gregorian Date - Bottom */}
                    <div className={`text-xs font-semibold ${dayInfo.isSelected ? 'text-purple-100' : dayInfo.isShabbat ? 'text-purple-600' : 'text-slate-500 group-hover:text-slate-700'}`}>
                      {gregDay}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick actions */}
            <div className="mt-5 pt-4 border-t-2 border-slate-100 flex gap-2">
              <Button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  onChange(today);
                  setShowPicker(false);
                }}
                variant="outline"
                size="sm"
                className="flex-1 font-semibold"
                type="button"
              >
                היום • Today
              </Button>
              <Button
                onClick={() => setShowPicker(false)}
                variant="outline"
                size="sm"
                className="flex-1 font-semibold"
                type="button"
              >
                סגור • Close
              </Button>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
