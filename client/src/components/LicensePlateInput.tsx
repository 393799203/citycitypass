import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface LicensePlateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

const PROVINCES = [
  '京', '津', '沪', '渝', '冀', '豫', '云', '辽', '黑', '湘',
  '皖', '鲁', '新', '苏', '浙', '赣', '鄂', '桂', '甘', '晋',
  '蒙', '陕', '吉', '闽', '贵', '粤', '青', '藏', '川', '宁',
  '琼', '使', '领', '港', '澳'
];

const ENERGY_PREFIX = ['D', 'F'];

export default function LicensePlateInput({ 
  value, 
  onChange, 
  className = '', 
  required = false,
  disabled = false 
}: LicensePlateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const province = PROVINCES.includes(value[0] || '') ? value[0] : '';
  const letters = value.slice(1);
  const hasContent = value && value.length >= 2;
  const isNewEnergy = value.length === 8;

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const handleProvinceSelect = (p: string) => {
    if (disabled) return;
    onChange(p + letters);
    setIsOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const getPlateDisplay = () => {
    if (!hasContent) return null;
    if (isNewEnergy) {
      return `${value.slice(0, 2)}·${value.slice(2, 5)} ${value.slice(5)}`;
    }
    return `${value.slice(0, 2)}·${value.slice(2)}`;
  };

  return (
    <div className={`relative ${className} ${required && !value ? 'ring-1 ring-red-300 rounded-lg' : ''}`}>
      <div className="flex">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`px-2 py-2 border border-r-0 rounded-l-lg flex items-center gap-0.5 min-w-[44px] justify-center ${
            disabled 
              ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
              : required && !province 
                ? 'border-red-300 bg-red-50' 
                : 'bg-white border-gray-300 hover:border-gray-400'
          }`}
        >
          <span className={`text-sm ${province ? '' : 'text-gray-400'}`}>{province || '省'}</span>
          {!disabled && (
            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </button>
        <input
          ref={inputRef}
          type="text"
          value={letters}
          onChange={(e) => {
            if (disabled) return;
            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
            onChange(province + val);
          }}
          placeholder={isNewEnergy ? "新能源8位" : "A12345"}
          disabled={disabled}
          className={`flex-1 min-w-0 px-2 py-2 border rounded-r-lg uppercase ${
            disabled 
              ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
              : required && !letters 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300'
          } ${hasContent && !disabled ? 'text-left pr-20' : ''}`}
          maxLength={7}
          required={required}
        />
        {hasContent && !disabled && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className={`px-2 py-1 text-white text-sm font-medium rounded ${
              isNewEnergy ? 'bg-green-600' : 'bg-blue-600'
            }`}>
              {getPlateDisplay()}
            </span>
          </div>
        )}
      </div>

      {isOpen && !disabled && createPortal(
        <div
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl p-2"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div className="grid grid-cols-7 gap-1">
            {PROVINCES.map(p => (
              <button
                key={p}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleProvinceSelect(p);
                }}
                className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                  province === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 hover:bg-blue-100 text-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
