import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { BatchInfo } from '../../types/batchTrace';

interface BatchListProps {
  batchList: BatchInfo[];
  loading: boolean;
}

export default function BatchList({ batchList, loading }: BatchListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (batchList.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">{t('batchTrace.noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('batchTrace.batchNo')}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('batchTrace.type')}/{t('batchTrace.productName')}</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{t('batchTrace.supplier')}</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{t('batchTrace.expiryDate')}</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{t('inventory.remainingStock')}</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{t('common.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {batchList.map((batch) => (
              <tr key={batch.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-4 py-3">
                  <div className="font-mono font-medium text-gray-900">{batch.batchNo}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${batch.type === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {batch.type === 'PRODUCT' ? t('batchTrace.product') : t('batchTrace.bundle')}
                    </span>
                    <span className="font-medium text-gray-800">{batch.productName || batch.sku?.product?.name || '-'}</span>
                  </div>
                  {batch.spec && batch.packaging && (
                    <div className="text-sm text-gray-500">{batch.spec} / {batch.packaging}</div>
                  )}
                  {batch.spec && !batch.packaging && (
                    <div className="text-sm text-gray-500">{batch.spec}</div>
                  )}
                  {!batch.spec && batch.packaging && (
                    <div className="text-sm text-gray-500">{batch.packaging}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-gray-600">{batch.supplierName || '-'}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {batch.expiryDate ? (
                    <span className={new Date(batch.expiryDate) < new Date() ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {batch.totalQuantity && batch.totalQuantity > 0 ? (
                    <span className="px-3 py-1 rounded-full text-sm font-medium text-green-700 bg-green-100">{batch.totalQuantity}</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-sm font-medium text-gray-400 bg-gray-100">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => navigate(`/batch-trace/${batch.batchNo}`)}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors duration-150"
                  >
                    {t('batchTrace.search')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
