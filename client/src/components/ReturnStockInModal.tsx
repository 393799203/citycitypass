import React, { useState, useEffect } from 'react';
import { warehouseApi } from '../api';
import { X } from 'lucide-react';

interface ReturnStockInModalProps {
  open: boolean;
  warehouseId: string;
  items: Array<{
    id: string;
    productName: string;
    qualifiedQuantity: number;
    skuBatchId?: string | null;
    bundleBatchId?: string | null;
    skuBatch?: { batchNo: string; expiryDate?: string } | null;
    bundleBatch?: { batchNo: string } | null;
  }>;
  onClose: () => void;
  onConfirm: (locationId: string) => Promise<void>;
}

export default function ReturnStockInModal({
  open,
  warehouseId,
  items,
  onClose,
  onConfirm,
}: ReturnStockInModalProps) {
  const [zones, setZones] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedShelfId, setSelectedShelfId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open && warehouseId) {
      fetchData();
    }
  }, [open, warehouseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [zonesRes, locationsRes] = await Promise.all([
        warehouseApi.listZones(warehouseId),
        warehouseApi.listLocations(warehouseId),
      ]);
      if (zonesRes.data.success) {
        setZones(zonesRes.data.data || []);
      }
      if (locationsRes.data.success) {
        setLocations(locationsRes.data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleZoneChange = (zoneId: string) => {
    setSelectedZone(zoneId);
    setSelectedShelfId('');
    setSelectedLocationId('');
  };

  const handleShelfChange = (shelfId: string) => {
    setSelectedShelfId(shelfId);
    setSelectedLocationId('');
  };

  const handleConfirm = async () => {
    if (!selectedLocationId) return;
    setConfirming(true);
    try {
      await onConfirm(selectedLocationId);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setConfirming(false);
    }
  };

  const filteredLocations = locations.filter((loc: any) => {
    if (!selectedShelfId) return false;
    return loc.shelfId === selectedShelfId;
  });

  const getShelvesInZone = () => {
    if (!selectedZone) return [];
    const zone = zones.find((z: any) => z.id === selectedZone);
    if (!zone) return [];
    const shelfIds = new Set(locations.filter((l: any) => l.zoneId === selectedZone || l.shelf?.zoneId === selectedZone).map((l: any) => l.shelfId));
    const shelvesInZone: any[] = [];
    shelfIds.forEach(id => {
      if (id) {
        const loc = locations.find((l: any) => l.shelfId === id);
        if (loc?.shelf) {
          shelvesInZone.push(loc.shelf);
        }
      }
    });
    return shelvesInZone;
  };

  const canConfirm = selectedLocationId && !confirming;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">退货入库</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">库区</label>
              <select
                value={selectedZone}
                onChange={e => handleZoneChange(e.target.value)}
                disabled={loading}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">选择库区</option>
                {zones.filter((z: any) => z.type === 'RETURNING').map(z => (
                  <option key={z.id} value={z.id}>{z.code} - {z.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">货架</label>
              <select
                value={selectedShelfId}
                onChange={e => handleShelfChange(e.target.value)}
                disabled={!selectedZone}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">选择货架</option>
                {getShelvesInZone().map((s: any) => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">库位</label>
              <select
                value={selectedLocationId}
                onChange={e => setSelectedLocationId(e.target.value)}
                disabled={!selectedShelfId}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">选择库位</option>
                {filteredLocations.map(l => (
                  <option key={l.id} value={l.id}>L{l.level}{l.position ? `-P${l.position}` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">入库商品</h3>
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
              {items.filter(i => i.qualifiedQuantity > 0).map(item => (
                <div key={item.id} className="flex justify-between items-center px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">
                      {item.productName}
                      {(item.skuBatch?.batchNo || item.skuBatch?.expiryDate) && (
                        <span className="text-purple-500 ml-1">
                          批:{item.skuBatch?.batchNo || '-'}{item.skuBatch?.expiryDate && `/${new Date(item.skuBatch.expiryDate).toLocaleDateString()}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-green-600 text-sm ml-2">×{item.qualifiedQuantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirming ? '入库中...' : '确认入库'}
          </button>
        </div>
      </div>
    </div>
  );
}
