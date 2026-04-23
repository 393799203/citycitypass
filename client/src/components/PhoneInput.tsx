import React from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function PhoneInput({ value, onChange, placeholder = '手机号', className = '', required = false }: PhoneInputProps) {
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 3 || i === 7) {
        formatted += ' ';
      }
      formatted += digits[i];
    }
    return formatted;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '').slice(0, 11);
    onChange(rawValue);
  };

  return (
    <input
      type="tel"
      value={formatPhone(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className={`px-3 py-2 border rounded-lg ${className} ${required && !value ? 'border-red-300 bg-red-50' : ''}`}
      required={required}
    />
  );
}