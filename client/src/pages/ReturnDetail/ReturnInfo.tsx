import React from 'react';
import { Phone } from 'lucide-react';

interface ReturnInfoProps {
  returnOrder: any;
}

export default function ReturnInfo({ returnOrder }: ReturnInfoProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className={`grid ${(returnOrder.trackingNo || returnOrder.logisticsCompany) ? 'grid-cols-3' : 'grid-cols-2'} gap-6`}>
        <div>
          <div className="text-sm text-gray-500 mb-1">退货人</div>
          <div className="flex items-center gap-2">
            <div className="text-base">{returnOrder.receiverName}</div>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Phone className="w-4 h-4" />
              {returnOrder.receiverPhone}
            </div>
          </div>
          <div className="text-sm text-gray-500 mt-2 mb-1">退货人地址</div>
          <div className="text-base">{returnOrder.receiverAddress}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500 mb-1">收货仓</div>
          <div className="text-base">{returnOrder.warehouse?.name}</div>
          <div className="text-sm text-gray-500 mt-2 mb-1">收货仓地址</div>
          <div className="text-base">{returnOrder.warehouse?.address}</div>
        </div>
        {(returnOrder.trackingNo || returnOrder.logisticsCompany) && (
          <div>
            <div className="text-sm text-gray-500 mb-1">退货快递</div>
            <div className="text-base">{returnOrder.logisticsCompany || '-'}</div>
            <div className="text-sm text-gray-500 mt-2 mb-1">快递单号</div>
            <div className="flex items-center gap-2">
              <span className="text-base text-gray-600">{returnOrder.trackingNo || '-'}</span>
              {returnOrder.trackingNo && returnOrder.logisticsCompany && (
                <a
                  href={`https://www.kuaidi100.com/chaxun?com=${encodeURIComponent(returnOrder.logisticsCompany)}&nu=${returnOrder.trackingNo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  查询
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}