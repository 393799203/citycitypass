import { useState } from 'react';

interface LogisticsInputProps {
  company: string;
  trackingNo: string;
  onCompanyChange: (company: string) => void;
  onTrackingNoChange: (trackingNo: string) => void;
}

const LOGISTICS_COMPANIES = [
  { value: '顺丰速运', logo: 'SF' },
  { value: '中通快递', logo: 'ZTO' },
  { value: '圆通速递', logo: 'YTO' },
  { value: '韵达快递', logo: 'YD' },
  { value: '申通快递', logo: 'STO' },
  { value: '极兔速递', logo: 'JTSD' },
  { value: '京东物流', logo: 'JD' },
  { value: '邮政EMS', logo: 'EMS' },
  { value: '德邦快递', logo: 'DB' },
  { value: '其他', logo: '?' },
];

export default function LogisticsInput({ company, trackingNo, onCompanyChange, onTrackingNoChange }: LogisticsInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const selectedCompany = LOGISTICS_COMPANIES.find(c => c.value === company);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">物流公司</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full border rounded-lg px-3 py-2 text-left flex items-center gap-2"
          >
            {selectedCompany ? (
              <>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                  {selectedCompany.logo}
                </span>
                <span>{selectedCompany.value}</span>
              </>
            ) : (
              <span className="text-gray-400">请选择物流公司</span>
            )}
          </button>
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {LOGISTICS_COMPANIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    onCompanyChange(c.value);
                    setShowDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                    {c.logo}
                  </span>
                  <span>{c.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">快递单号</label>
        <input
          type="text"
          value={trackingNo}
          onChange={e => onTrackingNoChange(e.target.value)}
          placeholder="请输入快递单号"
          className="w-full border rounded-lg px-3 py-2"
        />
        {company && trackingNo && (
          <a
            href={`https://www.kuaidi100.com/chaxun?com=${encodeURIComponent(company)}&nu=${trackingNo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline text-sm mt-1 inline-block"
          >
            查询物流 →
          </a>
        )}
      </div>
    </div>
  );
}
