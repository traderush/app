'use client';

import React, { useState, useRef, useEffect } from 'react';

interface CustomSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  signatureColor?: string;
}

const CustomSlider = React.memo(function CustomSlider({
  min,
  max,
  step,
  value,
  onChange,
  className = '',
  signatureColor = '#FA5616'
}: CustomSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Calculate percentage position
  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValue(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateValue(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateValue = (e: MouseEvent | React.MouseEvent) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newValue = min + (percentage / 100) * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    
    onChange(clampedValue);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className={`relative w-full ${className}`} style={{ height: '24px', padding: '8px 0' }}>
      {/* Slider Track */}
      <div
        ref={sliderRef}
        className="relative w-full h-2 rounded-full cursor-pointer"
        style={{ 
          minWidth: '100px',
          backgroundColor: '#171717'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Active Track */}
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: signatureColor
          }}
        />
        
        {/* Thumb */}
        <div
          className="absolute top-1/2 bg-white rounded-full shadow-lg cursor-pointer transform -translate-y-1/2 border"
          style={{
            left: `calc(${percentage}% - 7px)`,
            backgroundColor: 'white',
            borderColor: '#52525B',
            borderWidth: '1px',
            width: '14px',
            height: '14px'
          }}
        />
      </div>
    </div>
  );
});

export default CustomSlider;
