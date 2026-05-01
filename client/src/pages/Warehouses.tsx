import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { warehouseApi, ownerApi } from '../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddressInput from '../components/AddressInput';
import { Plus, Pencil, Trash2, Loader2, Building2, MapPin, X, Package, Phone, Clock, Zap, Warehouse } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { formatPhone, formatAddress } from '../utils/format';
import { useConfirm } from '../components/ConfirmProvider';
import { useOwnerStore } from '../stores/owner';
import OwnerStamp from '../components/OwnerStamp';
import { usePermission } from '../hooks/usePermission';

const getTypeMap = (t: any): Record<string, string> => ({
  NORMAL: t('warehouse.normalWarehouse'),
  COLD: t('warehouse.coldWarehouse'),
  MATERIAL: t('warehouse.materialWarehouse'),
});

const getStatusMap = (t: any): Record<string, string> => ({
  ACTIVE: t('warehouse.active'),
  INACTIVE: t('warehouse.inactive'),
  MAINTENANCE: t('warehouse.maintenance'),
});

export default function WarehousesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { currentOwnerId, owners } = useOwnerStore();
  const { canWrite } = usePermission('config', 'warehouses');
  const typeMap = getTypeMap(t);
  const statusMap = getStatusMap(t);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [filterOwner, setFilterOwner] = useState(currentOwnerId || '');
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
  }, [filterOwner]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const warehouseRes = await warehouseApi.list({});
      if (warehouseRes.data.success) {
        setWarehouses(warehouseRes.data.data);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      toast.error(t('warehouse.inputWarehouseCode'));
      return;
    }
    if (!formData.name.trim()) {
      toast.error(t('warehouse.inputWarehouseName'));
      return;
    }
    if (!formData.province || !formData.city || !formData.address.trim()) {
      toast.error(t('warehouse.inputCompleteAddress'));
      return;
    }
    
    try {
      const data = {
        ...formData,
        ownerId: formData.ownerId || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };
      
      if (editingId) {
        await warehouseApi.update(editingId, data);
        toast.success(t('warehouse.warehouseUpdated'));
      } else {
        await warehouseApi.create(data);
        toast.success(t('warehouse.warehouseCreated'));
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('warehouse.operationFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: t('warehouse.deleteConfirm') });
    if (!ok) return;
    try {
      await warehouseApi.delete(id);
      toast.success(t('warehouse.warehouseDeleted'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('warehouse.operationFailed'));
    }
  };

  const handleQuickCreate = async () => {
    if (!formData.code || !formData.name) {
      toast.error(t('warehouse.inputWarehouseCodeAndName'));
      return;
    }

    const ok = await confirm({
      message: t('warehouse.quickCreateConfirm', { name: formData.name }),
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
      toast.success(t('warehouse.quickCreateSuccess'));
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('warehouse.quickCreateFailed'));
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

  const resetForm = async () => {
    setEditingId(null);
    let ownerData: any = { contact: '', phone: '', province: '', city: '', address: '', latitude: '', longitude: '' };

    if (filterOwner) {
      try {
        const res = await ownerApi.get(filterOwner);
        if (res.data.success) {
          ownerData = res.data.data;
        }
      } catch (error) {
        console.error(t('warehouse.fetchOwnerFailed'), error);
      }
    }

    setFormData({
      code: '',
      name: '',
      type: 'NORMAL',
      status: 'ACTIVE',
      province: ownerData.province || '',
      city: ownerData.city || '',
      address: ownerData.address || '',
      latitude: ownerData.latitude?.toString() || '',
      longitude: ownerData.longitude?.toString() || '',
      ownerId: filterOwner,
      manager: ownerData.contact || '',
      managerPhone: ownerData.phone || '',
      businessStartTime: '08:00',
      businessEndTime: '18:00',
    });
  };

  return (
    <div className="p-2 space-y-6">
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{t('warehouse.title')}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {t('warehouse.warehouseCount')}: {warehouses.length}
          </span>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            disabled={!filterOwner || !canWrite}
            title={!filterOwner ? t('warehouse.pleaseSelectOwner') : !canWrite ? t('warehouse.noPermission') : ''}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              filterOwner && canWrite
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            {t('warehouse.createWarehouseBtn')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Warehouse className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{t('warehouse.noWarehouse')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(warehouse => (
            <div key={warehouse.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => navigate(`/warehouses/${warehouse.id}`)}>
              {warehouse.owner?.name && (
                <OwnerStamp name={warehouse.owner.name} />
              )}
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
                  {canWrite && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('warehouse.type')}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    warehouse.type === 'COLD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {typeMap[warehouse.type]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('warehouse.status')}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    warehouse.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                    warehouse.status === 'INACTIVE' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {statusMap[warehouse.status]}
                  </span>
                </div>
                {(warehouse.manager || warehouse.managerPhone) && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t('warehouse.manager')}</span>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Phone className="w-3 h-3" />
                      {warehouse.manager} {warehouse.managerPhone && formatPhone(warehouse.managerPhone)}
                    </div>
                  </div>
                )}
                {(warehouse.businessStartTime || warehouse.businessEndTime) && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t('warehouse.businessHours')}</span>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Clock className="w-3 h-3" />
                      {warehouse.businessStartTime || '--'} - {warehouse.businessEndTime || '--'}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('warehouse.shelfCount')}</span>
                  <span className="text-gray-700 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {warehouse.zones?.length || 0} {t('warehouse.zones')} / {warehouse.shelves?.length || 0} {t('warehouse.shelves')}
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
                      <div className="text-blue-600">{t('warehouse.productStock')}: {warehouse.totalStock || 0} {t('warehouse.skuCount')} / {warehouse.skuCount || 0} SKU</div>
                      {(warehouse.totalBundleStock > 0 || warehouse.bundleCount > 0) && (
                        <div className="text-purple-600 mt-1">
                          {t('warehouse.bundleStock')}: {warehouse.totalBundleStock || 0} {t('warehouse.skuCount')} / {warehouse.bundleCount || 0} {t('warehouse.bundleCount')}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-semibold">{editingId ? t('warehouse.editWarehouseTitle') : t('warehouse.createWarehouseTitle')}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('warehouse.warehouseCodeRequired')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('warehouse.warehouseNameRequired')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('warehouse.type')}</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="NORMAL">{t('warehouse.normalWarehouse')}</option>
                    <option value="COLD">{t('warehouse.coldWarehouse')}</option>
                    <option value="MATERIAL">{t('warehouse.materialWarehouse')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('warehouse.status')}</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="ACTIVE">{t('warehouse.active')}</option>
                    <option value="INACTIVE">{t('warehouse.inactive')}</option>
                    <option value="MAINTENANCE">{t('warehouse.maintenance')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('warehouse.managerName')}</label>
                  <input
                    type="text"
                    value={formData.manager}
                    onChange={e => setFormData({ ...formData, manager: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder={t('warehouse.managerName')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('warehouse.managerPhone')}</label>
                  <PhoneInput
                    value={formData.managerPhone}
                    onChange={(val) => setFormData({ ...formData, managerPhone: val })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('warehouse.businessHours')}</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={formData.businessStartTime}
                      onChange={e => setFormData({ ...formData, businessStartTime: e.target.value })}
                      className="flex-1 px-2 py-2 border rounded-lg text-sm"
                    />
                    <span className="py-2 text-gray-400">-</span>
                    <input
                      type="time"
                      value={formData.businessEndTime}
                      onChange={e => setFormData({ ...formData, businessEndTime: e.target.value })}
                      className="flex-1 px-2 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('warehouse.addressRequired')} <span className="text-red-500">*</span>
                </label>
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
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  {t('warehouse.cancel')}
                </button>
                {!editingId && (
                  <button
                    type="button"
                    onClick={handleQuickCreate}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Zap className="w-4 h-4 inline mr-1" />
                    {t('warehouse.quickCreate')}
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingId ? t('warehouse.save') : t('warehouse.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
