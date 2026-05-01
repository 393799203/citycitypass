import { useTranslation } from 'react-i18next';

interface PurchaseItemsProps {
  order: any;
}

export default function PurchaseItems({ order }: PurchaseItemsProps) {
  const { t } = useTranslation();

  return (
    <div className="px-8 py-6">
      <div className="border border-gray-200 rounded-lg overflow-hidden print:border-gray-300">
        <table className="min-w-full">
          <thead className="bg-gray-50 print:bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('purchase.productLabel')}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('purchase.specUnitLabel')}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">{t('purchase.quantityLabel')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-32">{t('purchase.priceLabel')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-32">{t('purchase.amountLabel')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.items?.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50 print:hover:bg-white">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      item.itemType === 'BUNDLE' ? 'bg-purple-100 text-purple-700' :
                      item.itemType === 'MATERIAL' ? 'bg-green-100 text-green-700' :
                      item.itemType === 'OTHER' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {item.itemType === 'BUNDLE' ? t('purchase.productTypeBundle') : item.itemType === 'MATERIAL' ? t('purchase.productTypeMaterial') : item.itemType === 'OTHER' ? t('purchase.productTypeOther') : t('purchase.productTypeProduct')}
                    </span>
                    <span className="font-medium text-gray-800">
                      {item.itemType === 'BUNDLE' ? item.bundle?.name :
                       item.itemType === 'MATERIAL' || item.itemType === 'OTHER' ? item.supplierMaterial?.name :
                       item.sku?.product?.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">
                  {item.itemType === 'BUNDLE' ? (
                    <span>{item.bundle?.spec || '-'}</span>
                  ) : item.itemType === 'MATERIAL' || item.itemType === 'OTHER' ? (
                    <span>{item.supplierMaterial?.unit || '-'}</span>
                  ) : (
                    <span>{item.sku?.spec || '-'} {item.sku?.packaging ? `/ ${item.sku.packaging}` : ''}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-sm">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-sm">¥{item.price || 0}</td>
                <td className="px-4 py-3 text-right text-sm font-medium">¥{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 print:bg-gray-100">
            <tr>
              <td colSpan={4} className="px-4 py-4 text-right font-semibold text-gray-700 text-lg">{t('purchase.totalAmountLabel')}</td>
              <td className="px-4 py-4 text-right font-bold text-xl text-blue-600">¥{Number(order.totalAmount || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
