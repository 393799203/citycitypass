import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { warehouseApi, ownerApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddressInput from '../components/AddressInput';
import { Plus, Pencil, Trash2, Loader2, Building2, MapPin, X, Package, Phone, Clock, Zap } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { formatPhone, formatAddress } from '../utils/format';
import { useConfirm } from '../components/ConfirmProvider';

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
  const { confirm } = useConfirm();
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
    manager: '',
    managerPhone: '',
    businessStartTime: '',
    businessEndTime: '',
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
    const ok = await confirm({ message: '确定要删除该仓库吗？' });
    if (!ok) return;
    try {
      await warehouseApi.delete(id);
      toast.success('仓库已删除');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleQuickCreate = async () => {
    if (!formData.code || !formData.name) {
      toast.error('请填写仓库编码和名称');
      return;
    }

    const ok = await confirm({
      message: `确认创建仓库 "${formData.name}" 及其默认库区和货架？\n\n将创建：\n- 入库区（IN）\n- 存储区（ST）\n- 拣货区（PK）\n- 退货区（RT）\n- 报废区（DM）\n\n每个库区包含 1 个默认货架 R001`,
    });
    if (!ok) return;

    try {
      const data = {
        ...formData,
        ownerId: formData.ownerId || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };
      await warehouseApi.quickCreate(data);
      toast.success('仓库及默认配置创建成功！');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建失败');
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
      manager: warehouse.manager || '',
      managerPhone: warehouse.managerPhone || '',
      businessStartTime: warehouse.businessStartTime || '',
      businessEndTime: warehouse.businessEndTime || '',
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
      manager: '',
      managerPhone: '',
      businessStartTime: '08:00',
      businessEndTime: '18:00',
    });
  };

  return (
    <div className="space-y-6">
      <ToastContainer />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">仓库管理</h1>
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
                {(warehouse.manager || warehouse.managerPhone) && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">管理员</span>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Phone className="w-3 h-3" />
                      {warehouse.manager} {warehouse.managerPhone && formatPhone(warehouse.managerPhone)}
                    </div>
                  </div>
                )}
                {(warehouse.businessStartTime || warehouse.businessEndTime) && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">营业时间</span>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Clock className="w-3 h-3" />
                      {warehouse.businessStartTime || '--'} - {warehouse.businessEndTime || '--'}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">货架数</span>
                  <span className="text-gray-700 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {warehouse.zones?.length || 0} 个库区 / {warehouse.shelves?.length || 0} 个货架
                  </span>
                </div>
                {(warehouse.province || warehouse.city || warehouse.address) && (
                  <div className="flex items-start justify-between pt-2 border-t">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-500 text-xs">
                        {formatAddress(warehouse.province, warehouse.city, warehouse.address)}
                        {warehouse.latitude && warehouse.longitude && (
                          <div className="mt-1">({warehouse.latitude}, {warehouse.longitude})</div>
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <div className="text-blue-600">商品库存: {warehouse.totalStock || 0} 件 / {warehouse.skuCount || 0} SKU</div>
                      {(warehouse.totalBundleStock > 0 || warehouse.bundleCount > 0) && (
                        <div className="text-purple-600 mt-1">
                          套装库存: {warehouse.totalBundleStock || 0} 件 / {warehouse.bundleCount || 0} 款
                        </div>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
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
                  onChange={e => {
                    const owner = owners.find(o => o.id === e.target.value);
                    setFormData({
                      ...formData,
                      ownerId: e.target.value,
                      manager: owner?.contact || '',
                      managerPhone: owner?.phone || '',
                      province: owner?.province || '',
                      city: owner?.city || '',
                      address: owner?.address || '',
                      latitude: owner?.latitude?.toString() || '',
                      longitude: owner?.longitude?.toString() || '',
                    });
                  }}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">管理员</label>
                  <input
                    type="text"
                    value={formData.manager}
                    onChange={e => setFormData({ ...formData, manager: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="管理员姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">管理员电话</label>
                  <PhoneInput
                    value={formData.managerPhone}
                    onChange={(val) => setFormData({ ...formData, managerPhone: val })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">营业时间</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={formData.businessStartTime}
                    onChange={e => setFormData({ ...formData, businessStartTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="time"
                    value={formData.businessEndTime}
                    onChange={e => setFormData({ ...formData, businessEndTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                <AddressInput
                  value={{
                    province: formData.province || '',
                    city: formData.city || '',
                    address: formData.address || '',
                    latitude: formData.latitude || '',
                    longitude: formData.longitude || '',
                  }}
                  onChange={(val) => setFormData({
                    ...formData,
                    province: val.province || '',
                    city: val.city || '',
                    address: val.address || '',
                    latitude: val.latitude || '',
                    longitude: val.longitude || '',
                  })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                {!editingId && (
                  <button
                    type="button"
                    onClick={handleQuickCreate}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Zap className="w-4 h-4 inline mr-1" />
                    一键创建
                  </button>
                )}
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
