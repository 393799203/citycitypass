import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { warehouseApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Plus, Trash2, Loader2, Building2, MapPin, Package, X, Phone, Clock, Edit3 } from 'lucide-react';
import WarehouseVisualization from '../components/WarehouseVisualization';
import { formatPhone, formatAddress } from '../utils/format';

const typeMap: Record<string, string> = {
  RECEIVING: '收货区',
  STORAGE: '存储区',
  PICKING: '拣货区',
  SHIPPING: '发货区',
  RETURNING: '退货区',
};

const statusMap: Record<string, string> = {
  ACTIVE: '启用',
  INACTIVE: '停用',
  MAINTENANCE: '维护中',
};

export default function WarehouseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState<any>(null);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zones, setZones] = useState<any[]>([]);

  const shelvesWithStocks = warehouse?.shelves || [];
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [resetViewKey, setResetViewKey] = useState(0);
  const [shelfFormData, setShelfFormData] = useState({
    code: '',
    name: '',
    type: 'HEAVY',
    status: 'ACTIVE',
    levels: 5,
    zoneId: ''
  });
  const [zoneFormData, setZoneFormData] = useState({
    code: '',
    name: '',
    type: 'STORAGE'
  });

  useEffect(() => {
    fetchWarehouse();
    fetchZones();
  }, [id]);

  const fetchWarehouse = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await warehouseApi.get(id);
      if (res.data.success) {
        setWarehouse(res.data.data);
      }
    } catch (error) {
      console.error('Fetch warehouse error:', error);
    } finally {
      setLoading(false);
    }
  };

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
      setShelfFormData({ code: '', name: '', type: 'HEAVY', status: 'ACTIVE', levels: 5, zoneId: '' });
      fetchWarehouse();
      fetchZones();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleDeleteShelf = async (shelfId: string) => {
    if (!confirm('确定要删除该货架吗？')) return;
    try {
      await warehouseApi.deleteShelf(shelfId);
      toast.success('货架已删除');
      fetchWarehouse();
      fetchZones();
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
      setShelfFormData({ code: '', name: '', type: 'HEAVY', status: 'ACTIVE', levels: 5, zoneId: '' });
      fetchWarehouse();
      fetchZones();
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
      fetchZones();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const fetchZones = async () => {
    if (!id) return;
    try {
      const res = await warehouseApi.listZones(id);
      if (res.data.success) {
        setZones(res.data.data);
      }
    } catch (error) {
      console.error('Fetch zones error:', error);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await warehouseApi.createZone(id, zoneFormData);
      toast.success('库区已创建');
      setShowZoneModal(false);
      setZoneFormData({ code: '', name: '', type: 'STORAGE' });
      fetchZones();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm('确定要删除该库区吗？')) return;
    try {
      await warehouseApi.deleteZone(zoneId);
      toast.success('库区已删除');
      fetchZones();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
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
      <div className="text-center py-12 text-gray-500">
        仓库不存在
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ToastContainer />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/warehouses')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            返回仓库列表
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">{warehouse.name}</h1>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  warehouse.type === 'COLD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {typeMap[warehouse.type]}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  warehouse.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                  warehouse.status === 'INACTIVE' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {statusMap[warehouse.status]}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">仓库编号: {warehouse.code}</span>
                {warehouse.owner && (
                  <span className="text-xs text-primary-600">货主: {warehouse.owner.name}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {(warehouse.manager || warehouse.managerPhone) && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 flex items-center gap-1 w-fit">
                <Phone className="w-3 h-3" />
                {warehouse.manager} {warehouse.managerPhone && formatPhone(warehouse.managerPhone)}
              </span>
            )}
            {(warehouse.businessStartTime || warehouse.businessEndTime) && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-700 flex items-center gap-1 w-fit">
                <Clock className="w-3 h-3" />
                {warehouse.businessStartTime || '--'}-{warehouse.businessEndTime || '--'}
              </span>
            )}
          </div>
        </div>
        {(warehouse.province || warehouse.city || warehouse.address) && (
          <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {formatAddress(warehouse.province, warehouse.city, warehouse.address)}
              {warehouse.latitude && warehouse.longitude && (
                <span className="ml-1">({warehouse.latitude},{warehouse.longitude})</span>
              )}
            </div>
            <div className="text-green-600 font-medium">
              商品: {warehouse.totalStock || 0} / 冻结: {warehouse.lockedStock || 0} / 可用: {warehouse.availableStock || 0}
              {(warehouse.totalBundleStock > 0) && (
                <span className="ml-3 text-purple-600">
                  套装: {warehouse.totalBundleStock || 0} / 冻结: {warehouse.lockedBundleStock || 0} / 可用: {warehouse.availableBundleStock || 0}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-4 border-b mb-4">
          <button
            onClick={() => setSelectedZoneId(null)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${selectedZoneId === null ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            全部货架 ({shelvesWithStocks.length})
          </button>
          {zones.map((zone: any) => (
            <div
              key={zone.id}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 cursor-pointer ${selectedZoneId === zone.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedZoneId(zone.id)}
            >
              {zone.name}
              <span className={`ml-1 px-1 py-0.5 text-xs rounded ${
                zone.type === 'RECEIVING' ? 'bg-blue-100 text-blue-700' :
                zone.type === 'STORAGE' ? 'bg-gray-100 text-gray-700' :
                zone.type === 'PICKING' ? 'bg-yellow-100 text-yellow-700' :
                zone.type === 'SHIPPING' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {zone.type === 'RECEIVING' ? '收货' : zone.type === 'STORAGE' ? '存储' : zone.type === 'PICKING' ? '拣货' : zone.type === 'SHIPPING' ? '发货' : '退货'}
              </span>
              <span
                onClick={(e) => { e.stopPropagation(); handleEditZone(zone); }}
                className="p-0.5 hover:bg-blue-100 rounded cursor-pointer ml-1"
              >
                <Edit3 className="w-3 h-3 text-blue-500" />
              </span>
              <span
                onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone.id); }}
                className="p-0.5 hover:bg-red-100 rounded cursor-pointer"
              >
                <X className="w-3 h-3 text-red-500" />
              </span>
            </div>
          ))}
          <button
            onClick={() => setShowZoneModal(true)}
            className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            添加库区
          </button>
          {selectedZoneId && (
            <button
              onClick={() => {
                setShelfFormData({ ...shelfFormData, zoneId: selectedZoneId });
                setShowShelfModal(true);
              }}
              className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg flex items-center gap-1 ml-auto"
            >
              <Plus className="w-4 h-4" />
              添加货架
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">货架编码</th>
                {!selectedZoneId && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">库区</th>}
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">货物</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shelvesWithStocks.filter((s: any) => !selectedZoneId || s.zoneId === selectedZoneId).map((shelf: any) => {
                return (
                  <tr
                    key={shelf.id}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedShelfId === shelf.id ? 'bg-primary-50' : ''}`}
                    onClick={() => setSelectedShelfId(selectedShelfId === shelf.id ? null : shelf.id)}
                  >
                    <td className="px-3 py-2">
                      <div className="text-sm font-medium text-primary-600">{shelf.zone?.code || ''}-{shelf.code}</div>
                      <div className="text-xs text-gray-400">库位: {shelf.locations?.length || 0}</div>
                    </td>
                    {!selectedZoneId && (
                      <td className="px-3 py-2">
                        {shelf.zone ? (
                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">{shelf.zone.name}</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
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
                      <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                        shelf.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {shelf.status === 'ACTIVE' ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {(shelf.stocks && shelf.stocks.filter((s: any) => (s.availableQuantity || 0) > 0).length > 0) || (shelf.bundleStocks && shelf.bundleStocks.filter((b: any) => (b.availableQuantity || 0) > 0).length > 0) ? (
                        <div className="text-sm">
                          {shelf.stocks?.filter((s: any) => (s.availableQuantity || 0) > 0).map((s: any) => (
                            <div key={s.id} className="text-xs">
                              <span className="text-gray-700">{s.sku?.product?.name} / {s.sku?.spec} / {s.sku?.packaging}</span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-green-600 font-medium">{s.availableQuantity || 0}</span>
                              <span className="text-gray-400">件</span>
                            </div>
                          ))}
                          {shelf.bundleStocks?.filter((b: any) => (b.availableQuantity || 0) > 0).map((b: any) => (
                            <div key={b.id} className="text-xs flex items-center gap-1">
                              <span className="text-purple-700">{b.bundle?.name}</span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-green-600 font-medium">{b.availableQuantity || 0}</span>
                              <span className="text-gray-400">套</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditShelf(shelf); }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteShelf(shelf.id); }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                  onChange={(e) => setZoneFormData({ ...zoneFormData, code: e.target.value })}
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
                  placeholder="如 A区-收货区"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">库区类型</label>
                <select
                  value={zoneFormData.type}
                  onChange={(e) => setZoneFormData({ ...zoneFormData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="RECEIVING">收货区</option>
                  <option value="STORAGE">存储区</option>
                  <option value="PICKING">拣货区</option>
                  <option value="SHIPPING">发货区</option>
                  <option value="RETURNING">退货区</option>
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
              <button onClick={() => { setShowShelfModal(false); setEditingShelf(null); setShelfFormData({ code: '', name: '', type: 'HEAVY', status: 'ACTIVE', levels: 5, zoneId: '' }); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editingShelf ? handleUpdateShelf : handleCreateShelf} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">货架编码</label>
                <input
                  type="text"
                  value={shelfFormData.code}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, code: e.target.value })}
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
                  placeholder="可选"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属库区</label>
                <select
                  value={shelfFormData.zoneId}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, zoneId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={!!editingShelf}
                  required
                >
                  <option value="">请选择库区</option>
                  {zones.map((zone: any) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">货架类型</label>
                  <select
                    value={shelfFormData.type}
                    onChange={(e) => setShelfFormData({ ...shelfFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="HEAVY">重型货架</option>
                    <option value="FLOW">流利架</option>
                    <option value="LIGHT">轻型货架</option>
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
                    <option value="INACTIVE">禁用</option>
                  </select>
                </div>
              </div>
              {!editingShelf && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">库位层数</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={shelfFormData.levels}
                    onChange={(e) => setShelfFormData({ ...shelfFormData, levels: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowShelfModal(false); setEditingShelf(null); setShelfFormData({ code: '', name: '', type: 'HEAVY', status: 'ACTIVE', levels: 5, zoneId: '' }); }} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
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

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">仓库可视化</h2>
          {selectedShelfId && (
            <button
              onClick={() => setResetViewKey(k => k + 1)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              全局
            </button>
          )}
        </div>
        <WarehouseVisualization 
          zones={warehouse.zones || []} 
          selectedShelfId={selectedShelfId}
          showResetButton={false}
          resetTrigger={resetViewKey}
        />
      </div>
    </div>
  );
}
