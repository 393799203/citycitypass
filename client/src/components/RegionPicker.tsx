import { useState } from 'react';
import { provinceCities } from '../data/regions';
import { X, MapPin } from 'lucide-react';

interface RegionPickerProps {
  value: { province?: string; city?: string };
  onChange: (value: { province?: string; city?: string }) => void;
  placeholder?: string;
}

export default function RegionPicker({ value, onChange, placeholder = '请选择省市区' }: RegionPickerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'province' | 'city'>('province');

  const displayValue = value.province 
    ? `${value.province} / ${value.city || ''}`.replace(/\s*\/\s*$/g, '')
    : '';

  const handleSelect = (type: 'province' | 'city', item: string) => {
    if (type === 'province') {
      onChange({ province: item, city: '' });
      setStep('city');
    } else {
      onChange({ ...value, city: item });
      setOpen(false);
      setStep('province');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ province: '', city: '' });
  };

  const handleBack = () => {
    if (step === 'city' && value.province) {
      setStep('province');
    }
  };

  return (
    <div className="relative">
      <div
        className="w-full px-3 py-2 border rounded-lg cursor-pointer bg-white min-h-[42px] flex items-center gap-2"
        onClick={() => setOpen(!open)}
      >
        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={displayValue ? 'text-gray-900' : 'text-gray-400'}>
          {displayValue || placeholder}
        </span>
        {displayValue && (
          <X className="w-4 h-4 text-gray-400 ml-auto" onClick={handleClear} />
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="flex border-b">
            <button
              className={`flex-1 px-3 py-2 text-sm ${step === 'province' ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-500'}`}
              onClick={handleBack}
            >
              {step === 'city' && value.province ? '返回' : '省份'}
            </button>
            <button
              className={`flex-1 px-3 py-2 text-sm ${step === 'city' ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-500'}`}
              disabled={!value.province}
            >
              城市
            </button>
          </div>
          <div className="overflow-y-auto max-h-48">
            {step === 'province' && provinceCities.map(p => (
              <div
                key={p.value}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${value.province === p.value ? 'bg-primary-50 text-primary-600' : ''}`}
                onClick={() => handleSelect('province', p.value)}
              >
                {p.label}
              </div>
            ))}
            {step === 'city' && (() => {
              const provinces = provinceCities.find(p => p.value === value.province);
              return provinces ? provinces.cities.map(c => (
                <div
                  key={c}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${value.city === c ? 'bg-primary-50 text-primary-600' : ''}`}
                  onClick={() => handleSelect('city', c)}
                >
                  {c}
                </div>
              )) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
