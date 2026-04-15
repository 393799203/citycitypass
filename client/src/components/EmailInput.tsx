import React, { useState } from 'react';

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function EmailInput({ value, onChange, placeholder = '邮箱', className = '' }: EmailInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`relative transition-all duration-300 ${focused ? 'transform scale-105' : ''}`}>
      <input
        type="email"
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={`w-full px-4 py-2 pl-12 border-2 rounded-xl transition-all duration-300 outline-none ${className}
          ${focused
            ? 'border-blue-500 shadow-lg shadow-blue-100'
            : 'border-gray-200 hover:border-gray-300'}`}
      />
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300
        ${focused ? 'text-blue-500 transform -translate-y-1/2 scale-110' : 'text-gray-400'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
  );
}
