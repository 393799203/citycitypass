import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus } from 'lucide-react';

interface BatchOption {
  batchNo: string;
  expiryDate?: string;
  supplierId?: string;
  supplierName?: string;
}

interface BatchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: BatchOption[];
  placeholder?: string;
  onGenerate?: () => void;
  showGenerate?: boolean;
  isError?: boolean;
  className?: string;
}

export default function BatchSelect({
  value,
  onChange,
  options,
  placeholder = '选择/新建',
  onGenerate,
  showGenerate = true,
  isError = false,
  className = '',
}: BatchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && 
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
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

  const selectedOption = options.find(o => o.batchNo === value);
  const isNewBatch = value && !options.some(o => o.batchNo === value);

  const handleSelect = (batchNo: string) => {
    onChange(batchNo);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1 border rounded px-2 py-1 text-sm bg-white text-left ${
          isError ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <span className={`truncate ${!value ? 'text-gray-400' : ''}`}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${Math.max(position.width, 200)}px`,
          }}
        >
          {options.length > 0 ? (
            options.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(option.batchNo);
                }}
                className={`w-full text-left px-2 py-1.5 hover:bg-blue-50 transition-colors ${
                  value === option.batchNo ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-1">
                  {value === option.batchNo && (
                    <Check className="w-3 h-3 text-blue-600 shrink-0" />
                  )}
                  <span className="font-mono text-sm">{option.batchNo}</span>
                </div>
                {option.expiryDate && (
                  <div className="text-xs text-gray-500 ml-4">
                    有效期: {option.expiryDate.split('T')[0]}
                  </div>
                )}
                {option.supplierName && (
                  <div className="text-xs text-gray-500 ml-4">
                    供应商: {option.supplierName}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-400 text-center">
              暂无历史批次
            </div>
          )}
          
          {isNewBatch && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-green-50 bg-green-50 border-t"
            >
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-600 shrink-0" />
                <span className="font-mono text-sm text-green-700">{value}</span>
                <span className="text-xs text-green-600 ml-1">新批次</span>
              </div>
            </button>
          )}

          {showGenerate && onGenerate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onGenerate();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 border-t"
            >
              <Plus className="w-3 h-3" />
              生成新批次
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
