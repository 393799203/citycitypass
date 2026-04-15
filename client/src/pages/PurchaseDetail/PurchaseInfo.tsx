import React from 'react';
import { format } from 'date-fns';

interface PurchaseInfoProps {
  supplierName: string;
  orderDate: string;
  expectedDate: string | null;
  ownerName: string;
}

export default function PurchaseInfo({ 
  supplierName, 
  orderDate, 
  expectedDate, 
  ownerName 
}: PurchaseInfoProps) {
  return (
    <div className="px-8 py-6 border-b border-gray-100">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">供应商</p>
          <p className="font-semibold text-gray-800">{supplierName || '-'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">下单日期</p>
          <p className="font-semibold text-gray-800">{format(new Date(orderDate), 'yyyy-MM-dd')}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">期望到货</p>
          <p className="font-semibold text-gray-800">{expectedDate ? format(new Date(expectedDate), 'yyyy-MM-dd') : '-'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">制单人</p>
          <p className="font-semibold text-gray-800">{ownerName || '-'}</p>
        </div>
      </div>
    </div>
  );
}