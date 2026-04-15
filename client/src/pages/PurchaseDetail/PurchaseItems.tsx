import React from 'react';

interface PurchaseItemsProps {
  items: any[];
  totalAmount: number;
}

export default function PurchaseItems({ items, totalAmount }: PurchaseItemsProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">商品</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">规格/单位</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">数量</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-32">单价</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-32">金额</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(items || []).map((item: any, idx: number) => (
            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    item.itemType === 'BUNDLE' ? 'bg-purple-100 text-purple-700' :
                    item.itemType === 'MATERIAL' ? 'bg-green-100 text-green-700' :
                    item.itemType === 'OTHER' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {item.itemType === 'BUNDLE' ? '套装' : item.itemType === 'MATERIAL' ? '原材料' : item.itemType === 'OTHER' ? '其他' : '商品'}
                  </span>
                  <span className="font-medium text-gray-800">
                    {item.itemType === 'BUNDLE' ? item.bundle?.name :
                     item.itemType === 'MATERIAL' || item.itemType === 'OTHER' ? item.supplierMaterial?.name :
                     item.sku?.product?.name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-center text-sm text-gray-600">
                {item.itemType === 'MATERIAL' || item.itemType === 'OTHER' ? (item.supplierMaterial?.unit || '-') :
                 item.itemType === 'BUNDLE' ? `${item.bundle?.spec || ''} / ${item.bundle?.packaging || ''}` :
                 `${item.sku?.spec || ''} / ${item.sku?.packaging || ''}`}
              </td>
              <td className="px-4 py-3 text-center text-sm font-medium">{item.quantity}</td>
              <td className="px-4 py-3 text-right text-sm">¥{Number(item.price || 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">¥{((Number(item.price) || 0) * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td colSpan={4} className="px-4 py-4 text-right font-semibold text-gray-700 text-lg">合计金额</td>
            <td className="px-4 py-4 text-right font-bold text-xl text-blue-600">¥{Number(totalAmount || 0).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}