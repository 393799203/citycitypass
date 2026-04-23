import React from 'react';

interface BusinessLicenseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function BusinessLicenseInput({
  value,
  onChange,
  placeholder = '请输入18位统一社会信用代码',
  className = '',
  required = false,
}: BusinessLicenseInputProps) {
  const formatValue = (val: string) => {
    return val.toUpperCase().replace(/[^0-9A-HJ-NPQRTUWXY]/g, '').slice(0, 18);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatValue(e.target.value);
    onChange(formatted);
  };

  const isValid = !value || /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(value);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg uppercase font-mono text-sm ${className} ${
          required && !value ? 'border-red-300 bg-red-50' : ''
        } ${value && !isValid ? 'border-orange-300 bg-orange-50' : ''}`}
        required={required}
        maxLength={18}
      />
      {value && !isValid && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-orange-500">
          格式有误
        </span>
      )}
    </div>
  );
}
