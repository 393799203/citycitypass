import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface ReturnItemsProps {
  items: any[];
}

export default function ReturnItems({ items }: ReturnItemsProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">退货商品</h3>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">商品</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">包装</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">规格</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">退货数量</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">合格数量</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">拒收数量</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items?.map((item: any) => (
            <tr key={item.id}>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>
                    {item.bundleId ? <span className="text-purple-500">[套装]</span> : <span className="text-blue-500">[商品]</span>}
                    {item.productName}
                    {item.bundleId && item.bundle?.items?.length > 0 && (
                      <button
                        type="button"
                        onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                        onMouseLeave={() => setTooltip(null)}
                        onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                        className="hover:bg-gray-100 rounded ml-1"
                      >
                        <Info className="w-3 h-3 text-purple-500 cursor-help inline" />
                      </button>
                    )}
                  </span>
                </div>
                {item.bundleId ? (
                  <>
                    {item.bundleBatch?.batchNo && <div className="text-purple-500 text-xs">批:{item.bundleBatch.batchNo}</div>}
                    {item.bundleBatch?.expiryDate && <div className="text-orange-500 text-xs">效期:{new Date(item.bundleBatch.expiryDate).toLocaleDateString()}</div>}
                  </>
                ) : (
                  <>
                    {item.skuBatch?.batchNo && <div className="text-purple-500 text-xs">批:{item.skuBatch.batchNo}</div>}
                    {item.skuBatch?.expiryDate && <div className="text-orange-500 text-xs">效期:{new Date(item.skuBatch.expiryDate).toLocaleDateString()}</div>}
                  </>
                )}
              </td>
              <td className="px-4 py-3 text-base text-gray-500 text-center">{item.packaging}</td>
              <td className="px-4 py-3 text-base text-gray-500 text-center">{item.spec}</td>
              <td className="px-4 py-3 text-base text-center">{item.quantity}</td>
              <td className="px-4 py-3 text-base text-green-600 text-center">{item.qualifiedQuantity !== undefined ? item.qualifiedQuantity : '-'}</td>
              <td className="px-4 py-3 text-base text-red-600 text-center">{item.rejectedQuantity !== undefined ? item.rejectedQuantity : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-800 text-white rounded-lg shadow-xl p-3 max-w-xs"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}