import React from 'react';
import { Truck, Printer } from 'lucide-react';

interface PurchaseHeaderProps {
  orderNo: string;
  status: string;
  hasInboundOrder: boolean;
  inboundNo: string;
  onOpenInboundModal: () => void;
  onPrint: () => void;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待确认', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: '已确认', color: 'bg-blue-100 text-blue-700' },
  PARTIAL: { label: '部分到货', color: 'bg-orange-100 text-orange-700' },
  ARRIVED: { label: '已到货', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
  COMPLETED: { label: '已完成', color: 'bg-purple-100 text-purple-700' },
};

export default function PurchaseHeader({ 
  orderNo, 
  status, 
  hasInboundOrder, 
  inboundNo, 
  onOpenInboundModal, 
  onPrint 
}: PurchaseHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">采购单</h2>
            <p className="text-blue-100 text-sm">订单号：{orderNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasInboundOrder ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
              <span className="text-sm font-medium">已关联入库单</span>
              <span className="text-xs">入库单号：{inboundNo}</span>
            </div>
          ) : status === 'CONFIRMED' && (
            <button
              onClick={onOpenInboundModal}
              className="px-3 py-1.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
            >
              创建入库单
            </button>
          )}
          <button
            onClick={onPrint}
            className="flex items-center gap-1 px-3 py-1.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            打印
          </button>
          <span className={`px-4 py-1.5 text-sm font-medium rounded-full bg-white ${
            status === 'PENDING' ? 'text-yellow-600' :
            status === 'CONFIRMED' ? 'text-blue-600' :
            status === 'PARTIAL' ? 'text-orange-600' :
            status === 'ARRIVED' ? 'text-green-600' :
            status === 'CANCELLED' ? 'text-gray-600' : 'text-purple-600'
          }`}>
            {STATUS_MAP[status]?.label}
          </span>
        </div>
      </div>
    </div>
  );
}