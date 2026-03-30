import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { provinceCities } from '../data/regions';
import { X, MapPin, Loader2 } from 'lucide-react';
import { geocodeApi } from '../api';

interface AddressInputProps {
  value: {
    province?: string;
    city?: string;
    address?: string;
    latitude?: string;
    longitude?: string;
  };
  onChange: (value: { province?: string; city?: string; address?: string; latitude?: string; longitude?: string }) => void;
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

export default function AddressInput({
  value,
  onChange,
  showRegion = false,
  regionValue = '',
  onRegionChange,
}: AddressInputProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'region' | 'province' | 'city'>('region');
  const [geocoding, setGeocoding] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + window.scrollY, left: rect.left, width: rect.width });
    }
  }, [open]);

  const displayValue = value.province
    ? value.province === value.city
      ? value.province
      : `${value.province} / ${value.city || ''}`.replace(/\s*\/\s*$/g, '')
    : '';

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

  const handleSelect = (type: 'province' | 'city', item: string) => {
    if (type === 'province') {
      onChange({ ...value, province: item, city: '' });
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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ province: '', city: '', address: '', latitude: '', longitude: '' });
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

  const handleAddressBlur = async () => {
    const fullAddress = `${value.province || ''}${value.city || ''}${value.address || ''}`;
    if (!value.province || !value.city || !value.address) return;

    setGeocoding(true);
    try {
      const res = await geocodeApi.geocode(fullAddress);
      if (res.data.success && res.data.data.latitude && res.data.data.longitude) {
        onChange({
          ...value,
          latitude: String(res.data.data.latitude),
          longitude: String(res.data.data.longitude),
        });
      }
    } catch (error) {
      console.error('获取坐标失败:', error);
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div>
      {showRegion && (
        <select
          value={regionValue}
          onChange={(e) => {
            if (onRegionChange) onRegionChange(e.target.value);
            onChange({ province: '', city: '', address: '', latitude: '', longitude: '' });
          }}
          className="w-full px-3 py-2 border rounded-lg mb-2 bg-white"
        >
          <option value="">选择区域</option>
          {regions.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      )}
      
      <div className="flex gap-2">
        <div className="relative flex-1 overflow-visible" ref={inputRef}>
          <div
            className="w-full px-3 py-2 border rounded-lg cursor-pointer bg-white min-h-[42px] flex items-center gap-2"
            onClick={handleOpen}
          >
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className={displayValue ? 'text-gray-900' : 'text-gray-400'}>
              {displayValue || '选择省/市'}
            </span>
            {displayValue && (
              <X className="w-4 h-4 text-gray-400 ml-auto" onClick={handleClear} />
            )}
          </div>

          {open && createPortal(
            <div
              className="fixed bg-white border rounded-lg shadow-lg max-h-64 overflow-hidden"
              style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999 }}
            >
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
            </div>,
            document.body
          )}
        </div>

        <input
          type="text"
          value={value.address || ''}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          onBlur={handleAddressBlur}
          placeholder="详细地址"
          className="flex-[2] px-3 py-2 border rounded-lg"
        />
      </div>

      {value.latitude && value.longitude && (
        <div className="mt-1 flex items-center gap-2">
          {geocoding ? (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> 定位中...
            </span>
          ) : (
            <span className="text-xs text-green-600">
              已获取坐标 ({value.latitude}, {value.longitude})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
