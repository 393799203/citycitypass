  import React from 'react';

interface LicenseNoInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function LicenseNoInput({ value, onChange, placeholder = '驾驶证号', className = '' }: LicenseNoInputProps) {
  const formatLicense = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 18);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 6 || i === 10) {
        formatted += ' ';
      }
      formatted += digits[i];
    }
    return formatted;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '').slice(0, 18);
    onChange(rawValue);
  };

  return (
    <input
      type="tel"
      value={formatLicense(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className={`px-3 py-2 border rounded-lg ${className}`}
    />
  );
}