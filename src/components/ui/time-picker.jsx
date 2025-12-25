import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';

export const TimePicker = ({ 
  label, 
  value = "14:00", 
  onChange,
  required = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState('14');
  const [minutes, setMinutes] = useState('00');
  const dropdownRef = useRef(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setHours(h || '14');
      setMinutes(m || '00');
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTimeChange = (newHours, newMinutes) => {
    const timeString = `${newHours.padStart(2, '0')}:${newMinutes.padStart(2, '0')}`;
    onChange(timeString);
  };

  const incrementHours = () => {
    const newHours = ((parseInt(hours) + 1) % 24).toString();
    setHours(newHours);
    handleTimeChange(newHours, minutes);
  };

  const decrementHours = () => {
    const newHours = ((parseInt(hours) - 1 + 24) % 24).toString();
    setHours(newHours);
    handleTimeChange(newHours, minutes);
  };

  const incrementMinutes = () => {
    const newMinutes = ((parseInt(minutes) + 15) % 60).toString();
    setMinutes(newMinutes);
    handleTimeChange(hours, newMinutes);
  };

  const decrementMinutes = () => {
    const newMinutes = ((parseInt(minutes) - 15 + 60) % 60).toString();
    setMinutes(newMinutes);
    handleTimeChange(hours, newMinutes);
  };

  const formatTime = (h, m) => {
    const hour = parseInt(h);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m.padStart(2, '0')} ${period}`;
  };

  const quickTimes = [
    { label: 'Morning (9:00 AM)', value: '09:00' },
    { label: 'Noon (12:00 PM)', value: '12:00' },
    { label: 'Afternoon (2:00 PM)', value: '14:00' },
    { label: 'Evening (6:00 PM)', value: '18:00' },
    { label: 'Night (8:00 PM)', value: '20:00' },
  ];

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Label className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        {/* Display Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-400" />
            <span className="text-base font-medium text-slate-700">
              {formatTime(hours, minutes)}
            </span>
          </div>
          <svg 
            className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-white border-2 border-slate-200 rounded-lg shadow-xl p-4">
            {/* Time Spinners */}
            <div className="flex items-center justify-center gap-4 mb-4 pb-4 border-b border-slate-200">
              {/* Hours */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={incrementHours}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={hours.padStart(2, '0')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 23)) {
                      setHours(val);
                      if (val.length === 2) handleTimeChange(val, minutes);
                    }
                  }}
                  className="w-16 text-center text-2xl font-bold text-slate-700 border-2 border-slate-300 rounded-lg py-2 focus:outline-none focus:border-blue-500"
                  maxLength={2}
                />
                <button
                  type="button"
                  onClick={decrementHours}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <span className="text-xs text-slate-500 mt-1">Hours</span>
              </div>

              <span className="text-3xl font-bold text-slate-400">:</span>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={incrementMinutes}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={minutes.padStart(2, '0')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                      setMinutes(val);
                      if (val.length === 2) handleTimeChange(hours, val);
                    }
                  }}
                  className="w-16 text-center text-2xl font-bold text-slate-700 border-2 border-slate-300 rounded-lg py-2 focus:outline-none focus:border-blue-500"
                  maxLength={2}
                />
                <button
                  type="button"
                  onClick={decrementMinutes}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <span className="text-xs text-slate-500 mt-1">Minutes</span>
              </div>
            </div>

            {/* Quick Select */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 mb-2">Quick Select</p>
              {quickTimes.map((time) => (
                <button
                  key={time.value}
                  type="button"
                  onClick={() => {
                    const [h, m] = time.value.split(':');
                    setHours(h);
                    setMinutes(m);
                    handleTimeChange(h, m);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {time.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
