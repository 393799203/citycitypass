import React from 'react';
import { X, Search, Trash2 } from 'lucide-react';
import { PurchaseItem, SupplierProduct, CustomItem } from '../../types/purchase';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingId: string | null;
  formData: {
    supplierId: string;
    orderDate: string;
    expectedDate: string;
    remark: string;
  };
  formItems: PurchaseItem[];
  suppliers: any[];
  products: SupplierProduct[];
  bundles: SupplierProduct[];
  customItems: CustomItem[];
  productType: 'SKU' | 'BUNDLE' | 'MATERIAL' | 'OTHER';
  searchKeyword: string;
  saving: boolean;
  onFormDataChange: (data: any) => void;
  onFormItemsChange: (items: PurchaseItem[]) => void;
  onProductTypeChange: (type: 'SKU' | 'BUNDLE' | 'MATERIAL' | 'OTHER') => void;
  onSearchKeywordChange: (keyword: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItemQuantity: (index: number, quantity: number) => void;
  onSubmit: () => void;
}

export default function PurchaseOrderModal({
  isOpen,
  onClose,
  editingId,
  formData,
  formItems,
  suppliers,
  products,
  bundles,
  customItems,
  productType,
  searchKeyword,
  saving,
  onFormDataChange,
  onFormItemsChange,
  onProductTypeChange,
  onSearchKeywordChange,
  onAddItem,
  onRemoveItem,
  onUpdateItemQuantity,
  onSubmit
}: PurchaseOrderModalProps) {
  if (!isOpen) return null;

  const filteredProducts = products.filter((p: any) => {
    const kw = searchKeyword.toLowerCase();
    return !kw ||
      p.productName?.toLowerCase().includes(kw) ||
      p.spec?.toLowerCase().includes(kw) ||
      p.packaging?.toLowerCase().includes(kw) ||
      p.skuCode?.toLowerCase().includes(kw);
  });

  const filteredBundles = bundles.filter((b: any) => {
    const kw = searchKeyword.toLowerCase();
    return !kw ||
      b.bundleName?.toLowerCase().includes(kw) ||
      b.spec?.toLowerCase().includes(kw) ||
      b.packaging?.toLowerCase().includes(kw);
  });

  const productGroups = filteredProducts.reduce<Record<string, any[]>>((acc, s) => {
    const name = s.productName || '';
    if (!acc[name]) acc[name] = [];
    acc[name].push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{editingId ? '编辑采购单' : '新建采购单'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="flex">
          <div className="w-1/2 border-r flex flex-col max-h-[70vh]">
            <div className="p-4 border-b bg-gray-50">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 px-1">供应商</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => onFormDataChange({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    required
                    disabled={!!editingId}
                  >
                    <option value="">选择供应商</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 px-1">期望到货日期</label>
                  <input
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => onFormDataChange({ ...formData, expectedDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex border-b bg-gray-50">
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={() => onProductTypeChange('SKU')}
                  className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                    productType === 'SKU' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
                  }`}
                >
                  商品
                </button>
              )}
              {bundles.length > 0 && (
                <button
                  type="button"
                  onClick={() => onProductTypeChange('BUNDLE')}
                  className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                    productType === 'BUNDLE' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'
                  }`}
                >
                  套装
                </button>
              )}
              {customItems.filter(c => c.type === 'MATERIAL').length > 0 && (
                <button
                  type="button"
                  onClick={() => onProductTypeChange('MATERIAL')}
                  className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                    productType === 'MATERIAL' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'
                  }`}
                >
                  原材料
                </button>
              )}
              {customItems.filter(c => c.type === 'OTHER').length > 0 && (
                <button
                  type="button"
                  onClick={() => onProductTypeChange('OTHER')}
                  className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                    productType === 'OTHER' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
                  }`}
                >
                  其他
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={productType === 'SKU' ? "搜索商品..." : productType === 'BUNDLE' ? "搜索套装..." : "搜索..."}
                value={searchKeyword}
                onChange={(e) => onSearchKeywordChange(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {productType === 'SKU' && (
                <>
                  {Object.entries(productGroups).length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      {formData.supplierId ? '暂无商品' : '请先选择供应商'}
                    </div>
                  ) : (
                    Object.entries(productGroups).map(([productName, skus]) => (
                      <div key={productName} className="mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">{productName}</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {skus.map((sku: any) => (
                            <div
                              key={sku.skuId}
                              onClick={() => {
                                const newItem: PurchaseItem = {
                                  itemType: 'PRODUCT',
                                  skuId: sku.skuId,
                                  quantity: 1,
                                  price: sku.price,
                                  productName: sku.productName,
                                  spec: sku.spec,
                                  packaging: sku.packaging,
                                };
                                const existing = formItems.find(item => item.skuId === sku.skuId);
                                if (!existing) {
                                  onFormItemsChange([...formItems, newItem]);
                                }
                              }}
                              className="p-2 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all text-xs bg-white"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="text-gray-700 truncate">{sku.spec}</div>
                                  <div className="text-gray-400 text-xs">{sku.packaging}</div>
                                </div>
                                {sku.price && (
                                  <div className="text-green-600 font-medium ml-1 shrink-0">¥{sku.price}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {productType === 'BUNDLE' && (
                <>
                  {filteredBundles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      {formData.supplierId ? '暂无套装' : '请先选择供应商'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {filteredBundles.map((bundle: any) => (
                        <div
                          key={bundle.bundleId}
                          onClick={() => {
                            const newItem: PurchaseItem = {
                              itemType: 'BUNDLE',
                              bundleId: bundle.bundleId,
                              quantity: 1,
                              price: bundle.price,
                              productName: bundle.bundleName,
                              bundleName: bundle.bundleName,
                              spec: bundle.spec,
                              packaging: bundle.packaging,
                            };
                            const existing = formItems.find(item => item.bundleId === bundle.bundleId);
                            if (!existing) {
                              onFormItemsChange([...formItems, newItem]);
                            }
                          }}
                          className="p-2 border border-purple-200 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all text-xs bg-white"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-purple-600 truncate">{bundle.bundleName}</div>
                              {bundle.spec && <div className="text-gray-400 text-xs truncate">{bundle.spec} {bundle.packaging && `/ ${bundle.packaging}`}</div>}
                            </div>
                            {bundle.price && (
                              <div className="text-green-600 font-medium ml-1 shrink-0">¥{bundle.price}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {(productType === 'MATERIAL' || productType === 'OTHER') && (
                <>
                  {customItems.filter(c => c.type === productType && (!searchKeyword || c.name.toLowerCase().includes(searchKeyword.toLowerCase()))).length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      {searchKeyword ? '无匹配结果' : '暂无可选项目'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {customItems.filter(c => c.type === productType && (!searchKeyword || c.name.toLowerCase().includes(searchKeyword.toLowerCase()))).map((item: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => {
                            const newItem: PurchaseItem = {
                              itemType: productType as 'MATERIAL' | 'OTHER',
                              supplierMaterialId: item.supplierMaterialId,
                              quantity: 1,
                              price: item.price,
                              name: item.name,
                              unit: item.unit,
                            };
                            const existing = formItems.find(i => i.supplierMaterialId === item.supplierMaterialId && i.itemType === newItem.itemType);
                            if (!existing) {
                              onFormItemsChange([...formItems, newItem]);
                            }
                          }}
                          className={`p-2 border rounded-lg cursor-pointer transition-all text-xs bg-white ${
                            productType === 'MATERIAL'
                              ? 'border-green-200 hover:border-green-500 hover:bg-green-50'
                              : 'border-orange-200 hover:border-orange-500 hover:bg-orange-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium truncate ${
                                productType === 'MATERIAL' ? 'text-green-600' : 'text-orange-600'
                              }`}>{item.name}</div>
                              {item.unit && <div className="text-gray-400 text-xs">({item.unit})</div>}
                            </div>
                            {item.price && (
                              <div className="text-green-600 font-medium ml-1 shrink-0">¥{item.price}/{item.unit || '单位'}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="w-1/2 flex flex-col max-h-[70vh]">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">采购清单</span>
                <span className="text-xs text-gray-500">
                  {formItems.length} 个商品
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {formItems.length === 0 ? (
                <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-lg">
                  暂无商品，请从左侧添加
                </div>
              ) : (
                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                            item.itemType === 'BUNDLE' ? 'bg-purple-100 text-purple-600' :
                            item.itemType === 'MATERIAL' ? 'bg-green-100 text-green-600' :
                            item.itemType === 'OTHER' ? 'bg-orange-100 text-orange-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {item.itemType === 'BUNDLE' ? '套装' : item.itemType === 'MATERIAL' ? '原材料' : item.itemType === 'OTHER' ? '其他' : '商品'}
                          </span>
                          <span className="font-medium truncate max-w-32">
                            {item.itemType === 'BUNDLE' ? item.bundleName :
                             item.itemType === 'MATERIAL' || item.itemType === 'OTHER' ? (item.supplierMaterial?.name || item.name) :
                             item.productName}
                          </span>
                          {item.itemType === 'MATERIAL' || item.itemType === 'OTHER' ? (
                            <span className="text-xs text-gray-500">({item.supplierMaterial?.unit || item.unit || '-'})</span>
                          ) : (
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {item.spec}{item.spec && item.packaging ? '/' : ''}{item.packaging}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onUpdateItemQuantity(idx, Math.max(1, item.quantity - 1)); }}
                            className="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => { e.stopPropagation(); onUpdateItemQuantity(idx, parseInt(e.target.value) || 1); }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-14 px-1 py-1 border rounded text-center text-sm"
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onUpdateItemQuantity(idx, item.quantity + 1); }}
                            className="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        {item.price && (
                          <span className="text-green-600 text-xs whitespace-nowrap text-right">
                            ¥{(item.price * item.quantity).toFixed(0)}
                          </span>
                        )}
                        <button type="button" onClick={(e) => { e.stopPropagation(); onRemoveItem(idx); }} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium">总计</span>
                <span className="text-lg text-green-600 font-bold">
                  ¥{formItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0).toFixed(2)}
                </span>
              </div>
              <textarea
                value={formData.remark}
                onChange={(e) => onFormDataChange({ ...formData, remark: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={2}
                placeholder="添加备注..."
              />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || formItems.length === 0}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
