import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { warehouseApi, ownerApi, geocodeApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import RegionPicker from '../components/RegionPicker';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Building2, MapPin, Search, X, Package } from 'lucide-react';

const typeMap: Record<string, string> = {
  NORMAL: '普通仓',
  COLD: '冷链仓',
};

const statusMap: Record<string, string> = {
  ACTIVE: '启用',
  INACTIVE: '停用',
  MAINTENANCE: '维护中',
};

export default function WarehousesPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'NORMAL',
    status: 'ACTIVE',
    province: '',
    city: '',
    address: '',
    latitude: '',
    longitude: '',
    ownerId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [warehouseRes, ownerRes] = await Promise.all([
        warehouseApi.list(),
        ownerApi.list(),
      ]);
      if (warehouseRes.data.success) {
        setWarehouses(warehouseRes.data.data);
      }
      if (ownerRes.data.success) {
        setOwners(ownerRes.data.data);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        ownerId: formData.ownerId || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };
      
      if (editingId) {
        await warehouseApi.update(editingId, data);
        toast.success('仓库已更新');
      } else {
        await warehouseApi.create(data);
        toast.success('仓库已创建');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该仓库吗？')) return;
    try {
      await warehouseApi.delete(id);
      toast.success('仓库已删除');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const openEditModal = (warehouse: any) => {
    setEditingId(warehouse.id);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      type: warehouse.type,
      status: warehouse.status,
      province: warehouse.province || '',
      city: warehouse.city || '',
      address: warehouse.address || '',
      latitude: warehouse.latitude?.toString() || '',
      longitude: warehouse.longitude?.toString() || '',
      ownerId: warehouse.ownerId || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      code: '',
      name: '',
      type: 'NORMAL',
      status: 'ACTIVE',
      province: '',
      city: '',
      address: '',
      latitude: '',
      longitude: '',
      ownerId: '',
    });
  };

  return (
    <div className="space-y-6">
      <ToastContainer />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">仓库管理</h1>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          创建仓库
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : warehouses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
          暂无仓库，请创建
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(warehouse => (
            <div key={warehouse.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/warehouses/${warehouse.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 hover:text-primary-600">{warehouse.name}</h3>
                    <p className="text-sm text-gray-500">{warehouse.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openEditModal(warehouse)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(warehouse.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">类型</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    warehouse.type === 'COLD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {typeMap[warehouse.type]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">状态</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    warehouse.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                    warehouse.status === 'INACTIVE' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {statusMap[warehouse.status]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">货主</span>
                  <span className="text-gray-700">{warehouse.owner?.name || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">货架数</span>
                  <span className="text-gray-700 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {warehouse._count?.shelves || 0}
                  </span>
                </div>
                {(warehouse.province || warehouse.city || warehouse.address) && (
                  <div className="flex items-start justify-between pt-2 border-t">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-500 text-xs">
                        {warehouse.province}{warehouse.city}{warehouse.address}
                        {warehouse.latitude && warehouse.longitude && (
                          <span className="ml-1">({warehouse.latitude},{warehouse.longitude})</span>
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      库存: {warehouse.totalStock || 0} 件 / {warehouse.skuCount || 0} SKU
                      {(warehouse.totalBundleStock > 0 || warehouse.bundleCount > 0) && (
                        <span className="ml-2 text-purple-600">
                          / 套装: {warehouse.totalBundleStock || 0} 件 / {warehouse.bundleCount || 0} 款
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editingId ? '编辑仓库' : '创建仓库'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    仓库编码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    仓库名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="NORMAL">普通仓</option>
                    <option value="COLD">冷链仓</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="ACTIVE">启用</option>
                    <option value="INACTIVE">停用</option>
                    <option value="MAINTENANCE">维护中</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属货主</label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">请选择货主</option>
                  {owners.map(owner => (
                    <option key={owner.id} value={owner.id}>{owner.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">省市区</label>
                  <RegionPicker
                    value={{ province: formData.province, city: formData.city }}
                    onChange={(val) => setFormData({ 
                      ...formData, 
                      province: val.province || '', 
                      city: val.city || '' 
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    onBlur={async () => {
                      if (formData.address) {
                        try {
                          const fullAddress = `${formData.province}${formData.city}${formData.address}`;
                          const res = await geocodeApi.geocode(fullAddress);
                          if (res.data.success) {
                            setFormData(prev => ({
                              ...prev,
                              latitude: res.data.data.latitude.toString(),
                              longitude: res.data.data.longitude.toString(),
                            }));
                          }
                        } catch (e) {
                          // ignore
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {formData.latitude && formData.longitude && (
                    <p className="text-xs text-green-600 mt-1">
                      已获取经纬度: {formData.latitude}, {formData.longitude}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingId ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
