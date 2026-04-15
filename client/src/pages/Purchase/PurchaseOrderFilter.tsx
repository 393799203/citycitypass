import React from 'react';
import { Search } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待确认', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: '已确认', color: 'bg-blue-100 text-blue-700' },
  PARTIAL: { label: '部分到货', color: 'bg-orange-100 text-orange-700' },
  ARRIVED: { label: '已到货', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

interface PurchaseOrderFilterProps {
  listKeyword: string;
  filterStatus: string;
  onListKeywordChange: (value: string) => void;
  onFilterStatusChange: (value: string) => void;
}

export default function PurchaseOrderFilter({
  listKeyword,
  filterStatus,
  onListKeywordChange,
  onFilterStatusChange
}: PurchaseOrderFilterProps) {
  return (
    <div className="flex gap-4 mb-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={listKeyword}
          onChange={(e) => onListKeywordChange(e.target.value)}
          placeholder="搜索采购单号、供应商..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>
      <select
        value={filterStatus}
        onChange={(e) => onFilterStatusChange(e.target.value)}
        className="px-3 py-2 border rounded-lg"
      >
        <option value="">全部状态</option>
        {Object.entries(STATUS_MAP).map(([value, { label }]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  );
}
