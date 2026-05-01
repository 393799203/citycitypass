import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReturnItemsProps {
  items: any[];
}

export default function ReturnItems({ items }: ReturnItemsProps) {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  return (
    <div className="border-t pt-4 sm:pt-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">{t('return.returnItems')}</h3>
      <table className="w-full hidden sm:table">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('return.product')}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('return.packaging')}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('return.spec')}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('return.returnQuantity')}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('return.qualifiedQuantity')}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('return.rejectedQuantity')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items?.map((item: any) => (
            <tr key={item.id}>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>
                    {item.bundleId ? <span className="text-purple-500">[{t('return.bundle')}]</span> : <span className="text-blue-500">[{t('return.productTag')}]</span>}
                    {item.productName}
                    {item.bundleId && item.bundle?.items?.length > 0 && (
                      <button
                        type="button"
                        onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">{t('return.bundleContains')}:</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                        onMouseLeave={() => setTooltip(null)}
                        onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">{t('return.bundleContains')}:</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                        className="hover:bg-gray-100 rounded ml-1"
                      >
                        <Info className="w-3 h-3 text-purple-500 cursor-help inline" />
                      </button>
                    )}
                  </span>
                </div>
                {item.bundleId ? (
                  <>
                    {item.bundleBatch?.batchNo && <div className="text-purple-500 text-xs">{t('return.batch')}:{item.bundleBatch.batchNo}</div>}
                    {item.bundleBatch?.expiryDate && <div className="text-orange-500 text-xs">{t('return.expiry')}:{new Date(item.bundleBatch.expiryDate).toLocaleDateString()}</div>}
                  </>
                ) : (
                  <>
                    {item.skuBatch?.batchNo && <div className="text-purple-500 text-xs">{t('return.batch')}:{item.skuBatch.batchNo}</div>}
                    {item.skuBatch?.expiryDate && <div className="text-orange-500 text-xs">{t('return.expiry')}:{new Date(item.skuBatch.expiryDate).toLocaleDateString()}</div>}
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
      <div className="sm:hidden space-y-2">
        {items?.map((item: any) => (
          <div key={item.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <span className={`text-[10px] px-1 py-0.5 rounded text-white ${item.bundleId ? 'bg-purple-500' : 'bg-blue-500'}`}>
                  {item.bundleId ? t('return.bundle') : t('return.productTag')}
                </span>
                <span className="font-medium text-sm">{item.productName}</span>
              </div>
              <span className="text-gray-500 text-xs">x{item.quantity}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>{item.spec} · {item.packaging}</span>
              <div className="flex gap-2">
                {item.qualifiedQuantity !== undefined && <span className="text-green-600">{t('return.qualified')}:{item.qualifiedQuantity}</span>}
                {item.rejectedQuantity !== undefined && item.rejectedQuantity > 0 && <span className="text-red-600">{t('return.rejected')}:{item.rejectedQuantity}</span>}
              </div>
            </div>
            {(item.skuBatch?.batchNo || item.bundleBatch?.batchNo) && (
              <div className="text-xs text-purple-500">
                {t('return.batch')}:{item.skuBatch?.batchNo || item.bundleBatch?.batchNo}
              </div>
            )}
          </div>
        ))}
      </div>
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
