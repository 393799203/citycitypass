import React from 'react';

interface LicensePlateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const PROVINCES = [
  '京', '津', '沪', '渝', '冀', '豫', '云', '辽', '黑', '湘', '皖', '鲁', '新', '苏', '浙', '赣', '鄂', '桂', '甘', '晋',
  '蒙', '陕', '吉', '闽', '贵', '粤', '青', '藏', '川', '宁', '琼', '使', '领', '港', '澳'
];

export default function LicensePlateInput({ value, onChange, className = '' }: LicensePlateInputProps) {
  const province = PROVINCES.includes(value[0] || '') ? value[0] : '';
  const letters = value.slice(1);
  const hasContent = value && value.length >= 2;

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-1">
        <select
          value={province}
          onChange={(e) => onChange(e.target.value + letters)}
          className="px-2 py-2 border rounded-lg bg-white w-14 flex-shrink-0"
        >
          <option value="">省</option>
          {PROVINCES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          type="text"
          value={letters}
          onChange={(e) => {
            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
            onChange(province + val);
          }}
          placeholder="ABCDEF"
          className={`flex-1 min-w-0 px-2 py-2 border rounded-lg text-center uppercase ${hasContent ? 'text-left pr-16' : ''}`}
          maxLength={6}
        />
      </div>
      {hasContent && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="px-2 py-1 bg-blue-600 text-white text-sm font-medium rounded">
            {value.slice(0, 2)}·{value.slice(2)}
          </span>
        </div>
      )}
    </div>
  );
}