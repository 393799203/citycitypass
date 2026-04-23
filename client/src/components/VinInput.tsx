import React from 'react';

interface VinInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function VinInput({
  value,
  onChange,
  placeholder = '请输入17位车辆识别代号',
  className = '',
  required = false,
}: VinInputProps) {
  const formatValue = (val: string) => {
    return val.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
  };

  const displayValue = (val: string) => {
    if (!val) return '';
    const parts = [val.slice(0, 3), val.slice(3, 9), val.slice(9, 17)];
    return parts.filter(p => p).join(' ');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\s/g, '');
    const formatted = formatValue(rawValue);
    onChange(formatted);
  };

  const isValid = !value || /^[A-HJ-NPR-Z0-9]{17}$/.test(value);

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue(value)}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg uppercase font-mono text-sm ${className} ${
          required && !value ? 'border-red-300 bg-red-50' : ''
        } ${value && !isValid ? 'border-orange-300 bg-orange-50' : ''}`}
        required={required}
        maxLength={19}
      />
      {value && !isValid && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-orange-500">
          格式有误
        </span>
      )}
    </div>
  );
}
