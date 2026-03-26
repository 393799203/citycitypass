import { useState, useEffect } from 'react';
import { warehouseApi, stockApi } from '../api';
import { Package, X, Layers } from 'lucide-react';
import { toast } from 'react-toastify';

interface InboundItemInput {
  type: 'PRODUCT' | 'BUNDLE';
  skuId?: string;
  bundleId?: string;
  productName: string;
  spec?: string;
  packaging?: string;
  quantity: number;
  batchNo?: string;
  locationId?: string;
  locationCode?: string;
  zoneId?: string;
  shelfId?: string;
}

interface InboundOrderModalProps {
  open: boolean;
  warehouseId?: string;
  source?: 'PURCHASE' | 'RETURN' | 'TRANSFER' | 'OTHER';
  returnOrderId?: string;
  orderNo?: string;
  returnNo?: string;
  defaultItems?: InboundItemInput[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InboundOrderModal({
  open,
  warehouseId,
  source = 'PURCHASE',
  returnOrderId,
  orderNo,
  returnNo,
  defaultItems = [],
  onClose,
  onSuccess,
}: InboundOrderModalProps) {
  const isReturn = source === 'RETURN';

  const [formSource, setFormSource] = useState(source);
  const [formWarehouseId, setFormWarehouseId] = useState(warehouseId || '');
  const [inboundItems, setInboundItems] = useState<InboundItemInput[]>(defaultItems);
  const [inboundRemark, setInboundRemark] = useState(isReturn ? '退货入库' : '');

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const returnZones = zones.filter((z: any) => z.type === 'RETURNING');
  const getZoneShelves = (zoneId: string) => zones.find((z: any) => z.id === zoneId)?.shelves || [];
  const getShelfLocations = (shelfId: string, shelves: any[]) => shelves.find((s: any) => s.id === shelfId)?.locations || [];

  useEffect(() => {
    if (open) {
      loadWarehouses();
      setFormSource(source);
      setFormWarehouseId(warehouseId || '');
      setInboundItems(defaultItems.map(item => ({ ...item, locationId: '', locationCode: '', zoneId: '', shelfId: '' })));
      const defaultRemark = isReturn
        ? `订单号：${orderNo || '-'}  退货单号：${returnNo || '-'}`
        : '';
      setInboundRemark(defaultRemark);
    }
  }, [open, warehouseId, source, defaultItems]);

  useEffect(() => {
    if (formWarehouseId) {
      loadZones(formWarehouseId);
    }
  }, [formWarehouseId]);

  useEffect(() => {
    if (open && isReturn && zones.length > 0) {
      const returnZonesList = zones.filter((z: any) => z.type === 'RETURNING');
      if (returnZonesList.length === 1) {
        setInboundItems(prev => prev.map(item => ({ ...item, zoneId: returnZonesList[0].id })));
      }
    }
  }, [open, zones, isReturn]);

  const loadWarehouses = async () => {
    try {
      const res = await warehouseApi.list();
      if (res.data.success) {
        setWarehouses(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadZones = async (whId: string) => {
    try {
      const res = await warehouseApi.listZones(whId);
      if (res.data.success) {
        setZones(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...inboundItems];
    if (field === 'zoneId') {
      newItems[index] = { ...newItems[index], zoneId: value, shelfId: '', locationId: '', locationCode: '' };
    } else if (field === 'shelfId') {
      newItems[index] = { ...newItems[index], shelfId: value, locationId: '', locationCode: '' };
    } else if (field === 'locationId') {
      const shelf = getZoneShelves(newItems[index].zoneId || '').find((s: any) => s.id === newItems[index].shelfId);
      const loc = shelf?.locations?.find((l: any) => l.id === value);
      newItems[index] = { ...newItems[index], locationId: value, locationCode: loc?.code || '' };
    }
    setInboundItems(newItems);
  };

  const handleCreateOrder = async () => {
    if (!formWarehouseId) {
      toast.error('请选择仓库');
      return;
    }

    if (isReturn && inboundItems.some(item => !item.locationId)) {
      toast.error('请为每个商品选择入库库位');
      return;
    }

    setSaving(true);
    try {
      const res = await stockApi.createInboundOrder({
        warehouseId: formWarehouseId,
        source: formSource,
        returnOrderId,
        remark: inboundRemark,
        items: inboundItems.map(item => ({
          type: item.type,
          skuId: item.skuId,
          bundleId: item.bundleId,
          quantity: item.quantity,
          batchNo: item.batchNo,
          locationId: item.locationId,
        })),
      });

      if (res.data.success) {
        toast.success('入库单创建成功');
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.data.message || '创建失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold">创建入库单</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {isReturn ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-blue-50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">仓库</label>
                    <select
                      value={formWarehouseId}
                      onChange={(e) => setFormWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      disabled={isReturn}
                    >
                      <option value="">选择仓库</option>
                      {warehouses.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">来源</label>
                    <select
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      disabled={isReturn}
                    >
                      <option value="PURCHASE">采购入库</option>
                      <option value="RETURN">退货入库</option>
                      <option value="TRANSFER">调拨入库</option>
                      <option value="OTHER">其他入库</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">入库清单 ({inboundItems.length})</div>
                {inboundItems.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                    暂无商品
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inboundItems.map((item, idx) => {
                      const shelves = getZoneShelves(item.zoneId || '');
                      const locations = getShelfLocations(item.shelfId || '', shelves);
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.type === 'BUNDLE' ? (
                              <Layers className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            ) : (
                              <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                            <span className={`px-1.5 py-0.5 text-xs rounded font-medium flex-shrink-0 ${
                              item.type === 'BUNDLE' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {item.type === 'BUNDLE' ? '套装' : '商品'}
                            </span>
                            <span className="font-medium truncate">{item.productName}</span>
                            {item.batchNo && (
                              <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded flex-shrink-0">
                                批:{item.batchNo}
                              </span>
                            )}
                            <span className="text-green-600 font-bold flex-shrink-0">{item.quantity}件</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs flex-shrink-0 ml-2">
                            <select
                              value={item.zoneId || ''}
                              onChange={(e) => updateItem(idx, 'zoneId', e.target.value)}
                              className="px-1 py-1 border rounded text-xs w-20"
                            >
                              <option value="">选择仓区</option>
                              {returnZones.map(z => (
                                <option key={z.id} value={z.id}>{z.name}</option>
                              ))}
                            </select>
                            <select
                              value={item.shelfId || ''}
                              onChange={(e) => updateItem(idx, 'shelfId', e.target.value)}
                              disabled={!item.zoneId}
                              className="px-1 py-1 border rounded text-xs w-20"
                            >
                              <option value="">选择货架</option>
                              {shelves.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name || s.code}</option>
                              ))}
                            </select>
                            <select
                              value={item.locationId || ''}
                              onChange={(e) => updateItem(idx, 'locationId', e.target.value)}
                              disabled={!item.shelfId}
                              className="px-1 py-1 border rounded text-xs w-20"
                            >
                              <option value="">选择库位</option>
                              {locations.map((l: any) => (
                                <option key={l.id} value={l.id}>L{l.level}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <textarea
                    value={inboundRemark}
                    onChange={(e) => setInboundRemark(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={2}
                    placeholder="退货入库"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button onClick={onClose} className="px-4 py-2 border rounded-lg">
                  取消
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={saving || inboundItems.some(item => !item.locationId)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? '创建中...' : '创建入库单'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">仓库</label>
                    <select
                      value={formWarehouseId}
                      onChange={(e) => setFormWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">选择仓库</option>
                      {warehouses.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">来源</label>
                    <select
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="PURCHASE">采购入库</option>
                      <option value="RETURN">退货入库</option>
                      <option value="TRANSFER">调拨入库</option>
                      <option value="OTHER">其他入库</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">入库清单</div>
                <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  请添加商品
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button onClick={onClose} className="px-4 py-2 border rounded-lg">取消</button>
                <button disabled className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg">创建入库单</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
