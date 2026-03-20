import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { warehouseApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Plus, Trash2, Loader2, Building2, MapPin, Package, X, Phone, Clock } from 'lucide-react';
import WarehouseVisualization from '../components/WarehouseVisualization';
import { formatPhone, formatAddress } from '../utils/format';

const typeMap: Record<string, string> = {
  NORMAL: '普通仓',
  COLD: '冷链仓',
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
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [resetViewKey, setResetViewKey] = useState(0);
  const [shelfFormData, setShelfFormData] = useState({ 
    type: '2', 
    row: 1,
    column: 1, 
    level: 5 
  });

  useEffect(() => {
    fetchWarehouse();
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
    if (!id) return;
    try {
      await warehouseApi.createShelf(id, shelfFormData);
      toast.success('货架已创建');
      setShowShelfModal(false);
      setShelfFormData({ type: '2', row: 1, column: 1, level: 5 });
      fetchWarehouse();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4 min-h-[550px]">
          <div className="bg-white rounded-xl shadow-sm border p-4 min-h-[550px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">
                货架管理 
                <span className="text-gray-400 font-normal text-sm ml-1">
                  (共 {warehouse.shelves?.length || 0} 个)
                </span>
              </h2>
              <button
                onClick={() => setShowShelfModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                添加货架
              </button>
            </div>

            {warehouse.shelves?.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                暂无货架，请添加
              </div>
            ) : (
              <div className="overflow-x-auto h-full w-full">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">货架编码</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">货物</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {warehouse.shelves?.map((shelf: any) => {
                      return (
                        <tr 
                          key={shelf.id} 
                          className={`hover:bg-gray-50 cursor-pointer ${selectedShelfId === shelf.id ? 'bg-primary-50' : ''}`}
                          onClick={() => setSelectedShelfId(selectedShelfId === shelf.id ? null : shelf.id)}
                        >
                          <td className="px-3 py-2">
                            <div className="text-sm font-medium text-primary-600">{shelf.code}</div>
                            <div className="text-xs text-gray-400">{shelf.row}排-{shelf.column}列-{shelf.level}层</div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                              shelf.type === '1' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {shelf.type === '1' ? '重型' : '轻型'}
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
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteShelf(shelf.id); }}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-4">
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
            shelves={warehouse.shelves || []} 
            selectedShelfId={selectedShelfId}
            showResetButton={false}
            resetTrigger={resetViewKey}
          />
        </div>
      </div>

      {showShelfModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">添加货架</h2>
              <button onClick={() => setShowShelfModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateShelf} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">货架类型</label>
                  <select
                    value={shelfFormData.type}
                    onChange={e => setShelfFormData({ ...shelfFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="1">重型货架</option>
                    <option value="2">轻型货架</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">层数</label>
                  <input
                    type="number"
                    min={1}
                    value={shelfFormData.level}
                    onChange={e => setShelfFormData({ ...shelfFormData, level: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排</label>
                  <input
                    type="number"
                    min={1}
                    value={shelfFormData.row}
                    onChange={e => setShelfFormData({ ...shelfFormData, row: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">列</label>
                  <input
                    type="number"
                    min={1}
                    value={shelfFormData.column}
                    onChange={e => setShelfFormData({ ...shelfFormData, column: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowShelfModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
