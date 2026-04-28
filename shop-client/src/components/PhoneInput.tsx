import { useState, useRef, useEffect } from 'react';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function PhoneInput({ value, onChange, placeholder = '请输入手机号', required, className = '' }: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    setDisplayValue(formatPhone(value));
  }, [value]);

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue.length <= 11) {
      onChange(rawValue);
    }
  };

  const isValid = value.length === 11 && /^1[3-9]\d{9}$/.test(value);

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <Phone className="w-4 h-4" />
      </div>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
          value.length === 11 && !isValid
            ? 'border-red-500 focus:ring-red-500'
            : 'focus:ring-blue-500'
        } ${className}`}
      />
      {value.length === 11 && !isValid && (
        <div className="absolute -bottom-5 left-0 text-xs text-red-500">
          请输入正确的手机号
        </div>
      )}
    </div>
  );
}
