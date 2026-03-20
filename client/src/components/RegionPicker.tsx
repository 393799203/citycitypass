import { useState } from 'react';
import { provinceCities } from '../data/regions';
import { X, MapPin } from 'lucide-react';

interface RegionPickerProps {
  value: { province?: string; city?: string };
  onChange: (value: { province?: string; city?: string }) => void;
  placeholder?: string;
  showRegion?: boolean;
  regionValue?: string;
  onRegionChange?: (region: string) => void;
}

const regions = [
  { value: '华东', label: '华东', provinces: ['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东'] },
  { value: '华北', label: '华北', provinces: ['北京', '天津', '河北', '山西', '内蒙古'] },
  { value: '华南', label: '华南', provinces: ['广东', '广西', '海南'] },
  { value: '华西', label: '华西', provinces: ['重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'] },
  { value: '华中', label: '华中', provinces: ['河南', '湖北', '湖南'] },
  { value: '东北', label: '东北', provinces: ['辽宁', '吉林', '黑龙江'] },
];

export default function RegionPicker({ 
  value, 
  onChange, 
  placeholder = '请选择省市区',
  showRegion = false,
  regionValue = '',
  onRegionChange,
}: RegionPickerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'region' | 'province' | 'city'>('region');

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
      setStep('region');
    }
  };

  const handleRegionSelect = (region: string) => {
    if (onRegionChange) {
      onRegionChange(region);
    }
    setStep('province');
  };

  const handleOpen = () => {
    if (!open) {
      if (!showRegion) {
        setStep('province');
      } else {
        setStep('region');
      }
    }
    setOpen(!open);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ province: '', city: '' });
  };

  const handleBack = () => {
    if (step === 'city' && value.province) {
      setStep('province');
    } else if (step === 'province' && showRegion) {
      setStep('region');
    }
  };

  const getProvinces = () => {
    if (!showRegion || !regionValue) {
      return provinceCities;
    }
    const regionData = regions.find(r => r.value === regionValue);
    if (!regionData) return provinceCities;
    return provinceCities.filter(p => regionData.provinces.includes(p.value));
  };

  return (
    <div className="relative">
      {showRegion && (
        <select
          value={regionValue}
          onChange={(e) => {
            if (onRegionChange) onRegionChange(e.target.value);
            onChange({ province: '', city: '' });
          }}
          className="w-full px-3 py-2 border rounded-lg mb-2 bg-white"
        >
          <option value="">选择区域</option>
          {regions.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      )}
      <div
        className="w-full px-3 py-2 border rounded-lg cursor-pointer bg-white min-h-[42px] flex items-center gap-2"
        onClick={handleOpen}
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
            {showRegion && (
              <button
                className={`flex-1 px-3 py-2 text-sm ${step === 'region' ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-500'}`}
                onClick={handleBack}
              >
                {step === 'province' || step === 'city' ? '返回' : '区域'}
              </button>
            )}
            <button
              className={`flex-1 px-3 py-2 text-sm ${step === 'province' ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-500'}`}
              onClick={() => step === 'city' && value.province && setStep('province')}
              disabled={step === 'city'}
            >
              {step === 'province' || !showRegion ? '省份' : value.province || '省份'}
            </button>
            <button
              className={`flex-1 px-3 py-2 text-sm ${step === 'city' ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-500'}`}
              disabled={!value.province}
            >
              城市
            </button>
          </div>
          <div className="overflow-y-auto max-h-48">
            {step === 'region' && showRegion && regions.map(r => (
              <div
                key={r.value}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${regionValue === r.value ? 'bg-primary-50 text-primary-600' : ''}`}
                onClick={() => handleRegionSelect(r.value)}
              >
                {r.label}
              </div>
            ))}
            {step === 'province' && getProvinces().map(p => (
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
