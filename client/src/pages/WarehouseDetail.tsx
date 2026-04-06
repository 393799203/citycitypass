import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { warehouseApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Plus, Trash2, Loader2, Building2, MapPin, Package, X, Phone, Clock, Edit3, Info } from 'lucide-react';
import { formatPhone, formatAddress } from '../utils/format';
import { useConfirm } from '../components/ConfirmProvider';

const typeMap: Record<string, string> = {
  INBOUND: '入库区',
  STORAGE: '存储区',
  PICKING: '拣货区',
  SHIPPING: '发货区',
  RETURNING: '退货区',
  DAMAGED: '残次品区',
};

const statusMap: Record<string, string> = {
  ACTIVE: '启用',
  INACTIVE: '停用',
  MAINTENANCE: '维护中',
};

export default function WarehouseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [warehouse, setWarehouse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState<any>(null);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [resetViewKey, setResetViewKey] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const [shelfFormData, setShelfFormData] = useState({
    code: '',
    name: '',
    type: 'LIGHT',
    status: 'ACTIVE',
    levels: 6,
    zoneId: ''
  });
  const [zoneFormData, setZoneFormData] = useState({
    code: '',
    name: '',
    type: 'INBOUND'
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const warehouseId = id;
    warehouseApi.get(warehouseId).then(res => {
      if (res.data.success) {
        setWarehouse(res.data.data);
        const fetchedZones = res.data.data.zones || [];
        const warehouseShelves = res.data.data.shelves || [];
        if (warehouseShelves.length > 0) {
          const shelvesMap = new Map<any, any>(warehouseShelves.map((s: any) => [s.id, s]));
          const mergedZones = fetchedZones.map((z: any) => ({
            ...z,
            shelves: (z.shelves || []).map((shelf: any) => {
              const shelfData = shelvesMap.get(shelf.id) || {};
              return {
                ...shelf,
                stocks: shelfData.stocks || [],
                bundleStocks: shelfData.bundleStocks || [],
                materialStocks: shelfData.materialStocks || [],
                totalStock: (shelfData.stocks || []).reduce((sum: number, s: any) => sum + (s.totalQuantity || 0), 0),
              };
            }),
          }));
          setZones(mergedZones);
        } else {
          setZones(fetchedZones);
        }
      }
    }).catch(err => {
      console.error('Fetch warehouse error:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shelfFormData.zoneId) {
      toast.error('请选择库区');
      return;
    }
    try {
      await warehouseApi.createShelf(shelfFormData.zoneId, shelfFormData);
      toast.success('货架已创建');
      setShowShelfModal(false);
      setShelfFormData({ code: '', name: '', type: 'LIGHT', status: 'ACTIVE', levels: 6, zoneId: '' });
      const res = await warehouseApi.get(id!);
      if (res.data.success) {
        const data = res.data.data;
        setWarehouse(data);
        const fetchedZones = data?.zones || [];
        const warehouseShelves = data?.shelves || [];
        if (warehouseShelves.length > 0) {
          const shelvesMap = new Map<any, any>(warehouseShelves.map((s: any) => [s.id, s]));
          const mergedZones = fetchedZones.map((z: any) => ({
            ...z,
            shelves: (z.shelves || []).map((shelf: any) => {
              const shelfData = shelvesMap.get(shelf.id) || {};
              return {
                ...shelf,
                stocks: shelfData.stocks || [],
                bundleStocks: shelfData.bundleStocks || [],
                materialStocks: shelfData.materialStocks || [],
                totalStock: shelfData.stocks?.reduce((sum: number, s: any) => sum + (s.totalQuantity || 0), 0) || 0,
              };
            }),
          }));
          setZones(mergedZones);
        } else {
          setZones(fetchedZones);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleDeleteShelf = async (shelfId: string) => {
    const ok = await confirm({ message: '确定要删除该货架吗？' });
    if (!ok) return;
    try {
      await warehouseApi.deleteShelf(shelfId);
      toast.success('货架已删除');
      const res = await warehouseApi.get(id!);
      if (res.data.success) {
        const data = res.data.data;
        setWarehouse(data);
        const fetchedZones = data?.zones || [];
        const warehouseShelves = data?.shelves || [];
        if (warehouseShelves.length > 0) {
          const shelvesMap = new Map<any, any>(warehouseShelves.map((s: any) => [s.id, s]));
          const mergedZones = fetchedZones.map((z: any) => ({
            ...z,
            shelves: (z.shelves || []).map((shelf: any) => {
              const shelfData = shelvesMap.get(shelf.id) || {};
              return {
                ...shelf,
                stocks: shelfData.stocks || [],
                bundleStocks: shelfData.bundleStocks || [],
                materialStocks: shelfData.materialStocks || [],
                totalStock: shelfData.stocks?.reduce((sum: number, s: any) => sum + (s.totalQuantity || 0), 0) || 0,
              };
            }),
          }));
          setZones(mergedZones);
        } else {
          setZones(fetchedZones);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleEditShelf = (shelf: any) => {
    setEditingShelf(shelf);
    setShelfFormData({
      code: shelf.code,
      name: shelf.name || '',
      type: shelf.type,
      status: shelf.status,
      levels: shelf.locations?.length || 5,
      zoneId: shelf.zoneId
    });
    setShowShelfModal(true);
  };

  const handleUpdateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShelf) return;
    try {
      await warehouseApi.updateShelf(editingShelf.id, shelfFormData);
      toast.success('货架已更新');
      setShowShelfModal(false);
      setEditingShelf(null);
      setShelfFormData({ code: '', name: '', type: 'LIGHT', status: 'ACTIVE', levels: 6, zoneId: '' });
      const res = await warehouseApi.get(id!);
      if (res.data.success) {
        setWarehouse(res.data.data);
        const fetchedZones = res.data.data.zones || [];
        const warehouseShelves = res.data.data.shelves || [];
        const shelvesMap = new Map<any, any>(warehouseShelves.map((s: any) => [s.id, s]));
        const mergedZones = fetchedZones.map((z: any) => ({
          ...z,
          shelves: (z.shelves || []).map((shelf: any) => ({
            ...shelf,
            stocks: shelvesMap.get(shelf.id)?.stocks || [],
            bundleStocks: shelvesMap.get(shelf.id)?.bundleStocks || [],
            materialStocks: shelvesMap.get(shelf.id)?.materialStocks || [],
            totalStock: shelvesMap.get(shelf.id)?.stocks?.reduce((sum: number, s: any) => sum + (s.totalQuantity || 0), 0) || 0,
          })),
        }));
        setZones(mergedZones);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleEditZone = (zone: any) => {
    setEditingZone(zone);
    setZoneFormData({
      code: zone.code,
      name: zone.name,
      type: zone.type
    });
    setShowZoneModal(true);
  };

  const handleUpdateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;
    try {
      await warehouseApi.updateZone(editingZone.id, zoneFormData);
      toast.success('库区已更新');
      setShowZoneModal(false);
      setEditingZone(null);
      setZoneFormData({ code: '', name: '', type: 'STORAGE' });
      const res = await warehouseApi.get(id!);
      if (res.data.success) {
        setWarehouse(res.data.data);
        const fetchedZones = res.data.data.zones || [];
        const warehouseShelves = res.data.data.shelves || [];
        const shelvesMap = new Map<any, any>(warehouseShelves.map((s: any) => [s.id, s]));
        const mergedZones = fetchedZones.map((z: any) => ({
          ...z,
          shelves: (z.shelves || []).map((shelf: any) => ({
            ...shelf,
            stocks: shelvesMap.get(shelf.id)?.stocks || [],
            bundleStocks: shelvesMap.get(shelf.id)?.bundleStocks || [],
            materialStocks: shelvesMap.get(shelf.id)?.materialStocks || [],
            totalStock: shelvesMap.get(shelf.id)?.stocks?.reduce((sum: number, s: any) => sum + (s.totalQuantity || 0), 0) || 0,
          })),
        }));
        setZones(mergedZones);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouse?.id) {
      toast.error('仓库不存在');
      return;
    }
    try {
      await warehouseApi.createZone(warehouse.id, zoneFormData);
      toast.success('库区已创建');
      setShowZoneModal(false);
      setZoneFormData({ code: '', name: '', type: 'STORAGE' });
      const res = await warehouseApi.get(id!);
      if (res.data.success) {
        setWarehouse(res.data.data);
        setZones(res.data.data.zones || []);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    const ok = await confirm({ message: '确定要删除该库区吗？' });
    if (!ok) return;
    try {
      await warehouseApi.deleteZone(zoneId);
      toast.success('库区已删除');
      const res = await warehouseApi.get(id!);
      if (res.data.success) {
        setWarehouse(res.data.data);
        setZones(res.data.data.zones || []);
      }
      if (selectedZoneId === zoneId) setSelectedZoneId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const filteredZones = selectedZoneId ? zones.filter(z => z.id === selectedZoneId) : zones;

  const handleShelfClick = (shelfId: string) => {
    setSelectedShelfId(prev => prev === shelfId ? null : shelfId);
  };

  const handleResetView = () => {
    setSelectedShelfId(null);
    setResetViewKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">仓库不存在</div>
        <Link to="/warehouses" className="text-primary-600 hover:underline mt-2 inline-block">
          返回仓库列表
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastContainer />

      {tooltip && (
        <div
          className="fixed bg-gray-900 text-white text-xs rounded-xl p-3 min-w-[220px] shadow-xl z-[9999] pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 30 }}
        >
          {tooltip.content}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{warehouse.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowZoneModal(true)}
                  className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1.5 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  添加库区
                </button>
                {selectedZoneId && (
                  <button onClick={() => setSelectedZoneId(null)} className="text-sm text-primary-600 hover:underline">
                    查看全部
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {zones.map(zone => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${selectedZoneId === zone.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    zone.type === 'RECEIVING' ? 'bg-blue-500' :
                    zone.type === 'STORAGE' ? 'bg-gray-500' :
                    zone.type === 'PICKING' ? 'bg-yellow-500' :
                    zone.type === 'SHIPPING' ? 'bg-green-500' :
                    zone.type === 'RETURNING' ? 'bg-red-500' :
                    zone.type === 'DAMAGED' ? 'bg-orange-500' : 'bg-gray-400'
                  }`} />
                  {zone.code} {zone.name}
                </button>
              ))}
              {zones.length === 0 && <span className="text-gray-400 text-sm">暂无库区</span>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">货架列表</h2>
              <div className="flex gap-2">
                {selectedZoneId && (
                  <button
                    onClick={() => { setEditingShelf(null); setShelfFormData({ code: '', name: '', type: 'LIGHT', status: 'ACTIVE', levels: 6, zoneId: selectedZoneId }); setShowShelfModal(true); }}
                    className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加货架
                  </button>
                )}
              </div>
            </div>

            {filteredZones.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <div>暂无库区</div>
                <div className="text-sm mt-1">请先添加库区</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">货架编码</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">货架名称</th>
                      {!selectedZoneId && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">库区</th>}
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">货物</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredZones.map(zone => (
                      zone.shelves?.map((shelf: any) => (
                        <tr key={shelf.id} className={`hover:bg-gray-50 cursor-pointer ${selectedShelfId === shelf.id ? 'bg-primary-50' : ''}`} onClick={() => handleShelfClick(shelf.id)}>
                          <td className="px-3 py-2">
                            <div className="text-sm font-medium text-primary-600">{zone.code}-{shelf.code}</div>
                            <div className="text-xs text-gray-400">库位: {shelf.locations?.length || 0}</div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {shelf.name || '-'}
                          </td>
                          {!selectedZoneId && (
                            <td className="px-3 py-2 text-sm">
                              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                                zone.type === 'RECEIVING' ? 'bg-blue-100 text-blue-700' :
                                zone.type === 'STORAGE' ? 'bg-gray-100 text-gray-700' :
                                zone.type === 'PICKING' ? 'bg-yellow-100 text-yellow-700' :
                                zone.type === 'SHIPPING' ? 'bg-green-100 text-green-700' :
                                zone.type === 'RETURNING' ? 'bg-red-100 text-red-700' :
                                zone.type === 'DAMAGED' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {typeMap[zone.type] || zone.type}
                              </span>
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                              shelf.type === 'HEAVY' ? 'bg-gray-100 text-gray-700' :
                              shelf.type === 'FLOW' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {shelf.type === 'HEAVY' ? '重型' : shelf.type === 'FLOW' ? '流利架' : '轻型'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                              shelf.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {shelf.status === 'ACTIVE' ? '启用' : '禁用'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {(shelf.stocks?.length > 0 || shelf.bundleStocks?.length > 0 || shelf.materialStocks?.length > 0) ? (
                              <div className="text-xs space-y-1">
                                {shelf.stocks?.filter((s: any) => (s.totalQuantity || 0) > 0).map((s: any) => {
                                  const isReturnZone = s.location?.shelf?.zone?.type === 'RETURNING';
                                  return (
                                    <div
                                      key={s.id}
                                      className={isReturnZone ? 'text-gray-400' : ''}
                                      onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">商品信息</div><div className="text-gray-200 py-1">库位：{s.location ? `${s.location.shelf?.zone?.code || ''}-${s.location.shelf?.code || ''}-L${s.location.level}` : '无'}</div><div className="text-gray-200 py-1">批次号：{s.skuBatch?.batchNo || '无'}</div>{s.skuBatch?.expiryDate && <div className="text-gray-200 py-1">有效期：{new Date(s.skuBatch?.expiryDate).toLocaleDateString()}</div>}</div> })}
                                      onMouseLeave={() => setTooltip(null)}
                                      onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">商品信息</div><div className="text-gray-200 py-1">库位：{s.location ? `${s.location.shelf?.zone?.code || ''}-${s.location.shelf?.code || ''}-L${s.location.level}` : '无'}</div><div className="text-gray-200 py-1">批次号：{s.skuBatch?.batchNo || '无'}</div>{s.skuBatch?.expiryDate && <div className="text-gray-200 py-1">有效期：{new Date(s.skuBatch?.expiryDate).toLocaleDateString()}</div>}</div> })}
                                    >
                                      <span className={isReturnZone ? 'text-gray-500' : 'text-blue-600'}>{isReturnZone ? '[退] ' : '[商品] '}{s.sku?.product?.name}</span>
                                      <span className="text-gray-400 mx-1">/</span>
                                      <span className="text-gray-500">{s.sku?.spec}</span>
                                      <span className="text-gray-400 mx-1">/</span>
                                      <span className="text-gray-500">{s.sku?.packaging}</span>
                                      <span className="text-gray-400 mx-1">×</span>
                                      <span className={isReturnZone ? 'text-yellow-500 font-medium' : 'text-green-600 font-medium'}>{s.totalQuantity || 0}</span>
                                      <span className="text-gray-400">件</span>
                                    </div>
                                  );
                                })}
                                {shelf.bundleStocks?.filter((b: any) => (b.totalQuantity || 0) > 0).map((b: any) => {
                                  const isReturnZone = b.location?.shelf?.zone?.type === 'RETURNING';
                                  return (
                                    <div key={b.id} className={`flex items-center gap-1 ${isReturnZone ? 'text-gray-400' : ''}`}>
                                      <span className={isReturnZone ? 'text-gray-500' : 'text-purple-700'}>{isReturnZone ? '[退] ' : '[套装] '}{b.bundle?.name}</span>
                                      {b.bundle?.items && (
                                        <button
                                          onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{b.bundle.items.map((bi: any, idx: number) => (<div key={idx} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}<div className="border-t border-gray-600 mt-2 pt-2"><div className="text-gray-200 py-1">库位：{b.location ? `${b.location.shelf?.zone?.code || ''}-${b.location.shelf?.code || ''}-L${b.location.level}` : '无'}</div><div className="text-gray-200 py-1">批次号：{b.bundleBatch?.batchNo || '无'}</div></div></div> })}
                                          onMouseLeave={() => setTooltip(null)}
                                          onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{b.bundle.items.map((bi: any, idx: number) => (<div key={idx} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}<div className="border-t border-gray-600 mt-2 pt-2"><div className="text-gray-200 py-1">库位：{b.location ? `${b.location.shelf?.zone?.code || ''}-${b.location.shelf?.code || ''}-L${b.location.level}` : '无'}</div><div className="text-gray-200 py-1">批次号：{b.bundleBatch?.batchNo || '无'}</div></div></div> })}
                                          className="p-0.5 hover:bg-gray-100 rounded"
                                        >
                                          <Info className={`w-3 h-3 ${isReturnZone ? 'text-gray-400' : 'text-purple-500'} cursor-help`} />
                                        </button>
                                      )}
                                      <span className="text-gray-400 mx-1">×</span>
                                      <span className={isReturnZone ? 'text-yellow-500 font-medium' : 'text-green-600 font-medium'}>{b.totalQuantity || 0}</span>
                                      <span className="text-gray-400">套</span>
                                    </div>
                                  );
                                })}
                                {shelf.materialStocks?.filter((m: any) => (m.totalQuantity || 0) > 0).map((m: any) => {
                                  return (
                                    <div key={m.id} className="flex items-center gap-1 text-green-600">
                                      <span>[原料] {m.supplierMaterial?.name || '未知'}</span>
                                      <span className="text-gray-400 mx-1">×</span>
                                      <span className="font-medium">{m.totalQuantity || 0}</span>
                                      <span className="text-gray-400">{m.supplierMaterial?.unit || '件'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleEditShelf(shelf)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteShelf(shelf.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg ml-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ))}
                    {filteredZones.every(z => !z.shelves?.length) && (
                      <tr>
                        <td colSpan={selectedZoneId ? 6 : 7} className="px-3 py-8 text-center text-gray-500">
                          暂无货架
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">仓库信息</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">仓库编码</span>
                <span className="font-medium">{warehouse.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">仓库类型</span>
                <span className="font-medium">{warehouse.type === 'NORMAL' ? '普通仓' : warehouse.type === 'COLD' ? '冷链仓' : warehouse.type === 'MATERIAL' ? '原料仓' : warehouse.type}</span>
              </div>
              {formatAddress(warehouse.province, warehouse.city, warehouse.address, warehouse.district) !== '-' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">仓库地址</span>
                  <span className="font-medium text-right max-w-[200px] truncate">
                    {formatAddress(warehouse.province, warehouse.city, warehouse.address, warehouse.district)}
                  </span>
                </div>
              )}
              {(warehouse.manager || warehouse.managerPhone) && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">联系方式</span>
                  <div className="flex items-center gap-2">
                    {warehouse.manager && <span className="font-medium">{warehouse.manager}</span>}
                    {warehouse.manager && warehouse.managerPhone && <span className="text-gray-300">|</span>}
                    {warehouse.managerPhone && <span className="font-medium flex items-center gap-1"><Phone className="w-3 h-3" />{formatPhone(warehouse.managerPhone)}</span>}
                  </div>
                </div>
              )}
              {(warehouse.businessStartTime || warehouse.businessEndTime) && (
                <div className="flex justify-between">
                  <span className="text-gray-500">营业时间</span>
                  <span className="font-medium">
                    {warehouse.businessStartTime || ''}{warehouse.businessStartTime && warehouse.businessEndTime ? ' - ' : ''}{warehouse.businessEndTime || ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">库区数量</span>
                <span className="font-medium">{(warehouse.zones || []).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">货架数量</span>
                <span className="font-medium">{(warehouse.zones || []).reduce((sum: number, z: any) => sum + (z.shelves?.length || 0), 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">创建时间</span>
                <span className="font-medium">{new Date(warehouse.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">库区管理</h2>
            </div>
            <div className="divide-y">
              {zones.map(zone => (
                <div key={zone.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${
                        zone.type === 'RECEIVING' ? 'bg-blue-500' :
                        zone.type === 'STORAGE' ? 'bg-gray-500' :
                        zone.type === 'PICKING' ? 'bg-yellow-500' :
                        zone.type === 'SHIPPING' ? 'bg-green-500' :
                        zone.type === 'RETURNING' ? 'bg-red-500' :
                        zone.type === 'DAMAGED' ? 'bg-orange-500' : 'bg-gray-400'
                      }`} />
                      <span className="font-medium">{zone.code} {zone.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditZone(zone)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteZone(zone.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {typeMap[zone.type] || zone.type} · {zone.shelves?.length || 0} 个货架
                  </div>
                </div>
              ))}
              {zones.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  暂无库区
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showZoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingZone ? '编辑库区' : '添加库区'}</h3>
              <button onClick={() => { setShowZoneModal(false); setEditingZone(null); setZoneFormData({ code: '', name: '', type: 'STORAGE' }); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editingZone ? handleUpdateZone : handleCreateZone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">库区编码</label>
                <input
                  type="text"
                  value={zoneFormData.code}
                  onChange={(e) => setZoneFormData({ ...zoneFormData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如 A"
                  disabled={!!editingZone}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">库区名称</label>
                <input
                  type="text"
                  value={zoneFormData.name}
                  onChange={(e) => setZoneFormData({ ...zoneFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如 收货区"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">库区类型</label>
                <select
                  value={zoneFormData.type}
                  onChange={(e) => setZoneFormData({ ...zoneFormData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={!!editingZone}
                >
                  <option value="RECEIVING">收货区</option>
                  <option value="STORAGE">存储区</option>
                  <option value="PICKING">拣货区</option>
                  <option value="SHIPPING">发货区</option>
                  <option value="RETURNING">退货区</option>
                  <option value="DAMAGED">残次品区</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowZoneModal(false); setEditingZone(null); setZoneFormData({ code: '', name: '', type: 'STORAGE' }); }} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  取消
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  {editingZone ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShelfModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingShelf ? '编辑货架' : '添加货架'}</h3>
              <button onClick={() => { setShowShelfModal(false); setEditingShelf(null); setShelfFormData({ code: '', name: '', type: 'LIGHT', status: 'ACTIVE', levels: 6, zoneId: '' }); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editingShelf ? handleUpdateShelf : handleCreateShelf} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">货架编码</label>
                <input
                  type="text"
                  value={shelfFormData.code}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如 R001"
                  disabled={!!editingShelf}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">货架名称</label>
                <input
                  type="text"
                  value={shelfFormData.name}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如 重型货架A"
                />
              </div>
              {!editingShelf && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所属库区</label>
                  <select
                    value={shelfFormData.zoneId}
                    onChange={(e) => setShelfFormData({ ...shelfFormData, zoneId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">选择库区</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.code} - {z.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">货架类型</label>
                <select
                  value={shelfFormData.type}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="LIGHT">轻型货架</option>
                  <option value="HEAVY">重型货架</option>
                  <option value="FLOW">流利架</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={shelfFormData.status}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="ACTIVE">启用</option>
                  <option value="INACTIVE">停用</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">库位层数</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={shelfFormData.levels}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, levels: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={!!editingShelf}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowShelfModal(false); setEditingShelf(null); setShelfFormData({ code: '', name: '', type: 'LIGHT', status: 'ACTIVE', levels: 6, zoneId: '' }); }} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  取消
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  {editingShelf ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
