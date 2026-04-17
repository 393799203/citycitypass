import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Truck, Plus, Car, User } from 'lucide-react';
import { vehicleApi, driverApi, geocodeApi, carrierApi } from '../../api';
import { formatPhone } from '../../utils/format';
import { useConfirm } from '../../components/ConfirmProvider';
import { Vehicle, Driver, Warehouse, FormData, LocationForm } from '../../types/dispatch';
import VehicleTable from './VehicleTable';
import DriverTable from './DriverTable';
import VehicleDriverForm from './VehicleDriverForm';
import LocationModal from './LocationModal';
import { usePermission } from '../../hooks/usePermission';
import { useOwnerStore } from '../../stores/owner';

export default function TransportPage() {
  const { confirm } = useConfirm();
  const { canWrite: canTransportWrite } = usePermission('business', 'transport');
  const { currentOwnerId } = useOwnerStore();
  const [activeTab, setActiveTab] = useState<'vehicle' | 'driver'>('vehicle');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationItem, setLocationItem] = useState<Vehicle | Driver | null>(null);
  const [locationForm, setLocationForm] = useState<LocationForm>({ address: '', latitude: '', longitude: '', location: '' });
  const [editingItem, setEditingItem] = useState<Vehicle | Driver | null>(null);
  const [formData, setFormData] = useState<FormData>({
    warehouseId: '',
    warehouse: null,
    licensePlate: '',
    vehicleType: '小型货车',
    brand: '',
    model: '',
    capacity: 50,
    volume: '',
    licenseNo: '',
    insuranceNo: '',
    status: 'AVAILABLE',
    name: '',
    phone: '',
    licenseTypes: [] as string[],
    driverStatus: 'AVAILABLE',
    latitude: '',
    longitude: '',
    location: '',
    address: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vehicleRes, driverRes, warehouseRes] = await Promise.all([
        vehicleApi.listAll(),
        driverApi.list({}),
        (await import('../../api')).warehouseApi.list({}),
      ]);
      if (vehicleRes.data.success) {
        setVehicles(vehicleRes.data.data);
      }
      if (driverRes.data.success) {
        setDrivers(driverRes.data.data);
      }
      if (warehouseRes.data.success) {
        setWarehouses(warehouseRes.data.data);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (activeTab === 'vehicle') {
        if (!(editingItem && 'sourceType' in editingItem && editingItem.sourceType === 'CARRIER') && !formData.warehouseId) {
          toast.error('请选择仓库');
          return;
        }
        if (!formData.licensePlate) {
          toast.error('请输入车牌号');
          return;
        }
        const vehicleData = {
          warehouseId: formData.warehouseId,
          licensePlate: formData.licensePlate,
          vehicleType: formData.vehicleType,
          brand: formData.brand || null,
          model: formData.model || null,
          capacity: formData.capacity,
          volume: formData.volume || null,
          licenseNo: formData.licenseNo || null,
          insuranceNo: formData.insuranceNo || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          location: formData.location || null,
        };
        if (editingItem && 'sourceType' in editingItem) {
          if (editingItem.sourceType === 'CARRIER') {
            await carrierApi.updateVehicle(editingItem.id, vehicleData);
          } else {
            await vehicleApi.update(editingItem.id, vehicleData);
          }
          toast.success('车辆更新成功');
        } else {
          await vehicleApi.create(vehicleData);
          toast.success('车辆添加成功');
        }
      } else {
        if (!formData.warehouseId) {
          toast.error('请选择仓库');
          return;
        }
        if (!formData.name || !formData.phone || !formData.licenseNo) {
          toast.error('请填写完整信息');
          return;
        }
        const driverData = {
          warehouseId: formData.warehouseId,
          name: formData.name,
          phone: formData.phone,
          licenseNo: formData.licenseNo,
          licenseTypes: formData.licenseTypes,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          location: formData.location || null,
        };
        if (editingItem && 'licenseTypes' in editingItem) {
          await driverApi.update(editingItem.id, driverData);
          toast.success('司机更新成功');
        } else {
          await driverApi.create(driverData);
          toast.success('司机添加成功');
        }
      }
      setShowModal(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string, item?: Vehicle) => {
    const ok = await confirm({ message: '确定要删除吗？' });
    if (!ok) return;
    try {
      if (activeTab === 'vehicle' && item && 'sourceType' in item) {
        if (item.sourceType === 'CARRIER') {
          await carrierApi.deleteVehicle(id);
        } else {
          await vehicleApi.delete(id);
        }
        toast.success('车辆删除成功');
      } else if (activeTab === 'driver') {
        await driverApi.delete(id);
        toast.success('司机删除成功');
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleOpenLocationModal = (item: Vehicle | Driver) => {
    setLocationItem(item);
    setLocationForm({
      address: item.address || item.location || '',
      latitude: item.latitude?.toString() || '',
      longitude: item.longitude?.toString() || '',
      location: item.location || '',
    });
    setShowLocationModal(true);
  };

  const handleUpdateLocation = async () => {
    if (!locationForm.address && !locationForm.latitude) {
      toast.error('请输入地址或经纬度');
      return;
    }
    try {
      if (locationForm.address && !locationForm.latitude) {
        const res = await geocodeApi.geocode(locationForm.address);
        if (res.data.success) {
          setLocationForm({
            ...locationForm,
            latitude: res.data.data.latitude.toString(),
            longitude: res.data.data.longitude.toString(),
            location: res.data.data.location,
          });
          toast.success('已获取经纬度，请确认后保存');
          return;
        } else {
          toast.error(res.data.message || '地址解析失败');
          return;
        }
      }
      const updateData: any = {
        latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null,
        longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null,
        location: locationForm.location || locationForm.address,
      };
      if (activeTab === 'driver' || activeTab === 'vehicle') {
        updateData.address = locationForm.address;
      }
      if (activeTab === 'vehicle' && locationItem && 'sourceType' in locationItem) {
        if (locationItem.sourceType === 'CARRIER') {
          await carrierApi.updateVehicleLocation(locationItem.id, updateData);
        } else {
          await vehicleApi.update(locationItem.id, updateData);
        }
        toast.success('车辆位置更新成功');
      } else if (activeTab === 'driver' && locationItem && 'licenseTypes' in locationItem) {
        await driverApi.update(locationItem.id, updateData);
        toast.success('司机位置更新成功');
      }
      setShowLocationModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '位置更新失败');
    }
  };

  const openEditModal = (item: Vehicle | Driver) => {
    setEditingItem(item);
    if ('licensePlate' in item) {
      setFormData({
        warehouseId: item.warehouseId || '',
        warehouse: item.warehouse || null,
        licensePlate: item.licensePlate,
        vehicleType: item.vehicleType,
        brand: item.brand || '',
        model: item.model || '',
        capacity: item.capacity,
        volume: item.volume?.toString() || '',
        licenseNo: item.licenseNo || '',
        insuranceNo: item.insuranceNo || '',
        status: item.status,
        name: '',
        phone: '',
        licenseTypes: [],
        driverStatus: 'AVAILABLE',
        latitude: item.latitude?.toString() || '',
        longitude: item.longitude?.toString() || '',
        location: item.location || '',
        address: item.address || '',
      });
    } else if ('licenseTypes' in item) {
      setFormData({
        warehouseId: item.warehouseId || '',
        warehouse: item.warehouse || null,
        licensePlate: '',
        vehicleType: '小型货车',
        brand: '',
        model: '',
        capacity: 50,
        volume: '',
        licenseNo: item.licenseNo,
        insuranceNo: '',
        status: 'AVAILABLE',
        name: item.name,
        phone: item.phone,
        licenseTypes: item.licenseTypes || [],
        driverStatus: item.status,
        latitude: item.latitude?.toString() || '',
        longitude: item.longitude?.toString() || '',
        location: item.location || '',
        address: item.address || '',
      });
    }
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      warehouseId: '',
      warehouse: null,
      licensePlate: '',
      vehicleType: '小型货车',
      brand: '',
      model: '',
      capacity: 50,
      volume: '',
      licenseNo: '',
      insuranceNo: '',
      status: 'AVAILABLE',
      name: '',
      phone: '',
      licenseTypes: [] as string[],
      driverStatus: 'AVAILABLE',
      latitude: '',
      longitude: '',
      location: '',
      address: '',
    });
    setShowModal(true);
  };

  const handleFormChange = (key: keyof FormData, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleWarehouseChange = (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    setFormData({
      ...formData,
      warehouseId: warehouseId,
      latitude: warehouse?.latitude?.toString() || '',
      longitude: warehouse?.longitude?.toString() || '',
      location: warehouse?.address || '',
    });
  };

  const handleLicenseTypeToggle = (type: string) => {
    if (formData.licenseTypes.includes(type)) {
      setFormData({ ...formData, licenseTypes: formData.licenseTypes.filter(t => t !== type) });
    } else {
      setFormData({ ...formData, licenseTypes: [...formData.licenseTypes, type] });
    }
  };

  const handleLocationFormChange = (key: keyof LocationForm, value: string) => {
    setLocationForm({ ...locationForm, [key]: value });
  };

  return (
    <div className="p-6">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Truck className="w-6 h-6" />
          运力看板
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('vehicle')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'vehicle'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Car className="w-4 h-4 inline mr-2" />
            车辆管理
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'driver'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            司机管理
          </button>
        </div>

        <div className="p-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={openAddModal}
              disabled={!currentOwnerId || !canTransportWrite}
              title={!currentOwnerId ? '请先选择主体' : !canTransportWrite ? '无操作权限' : ''}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                currentOwnerId && canTransportWrite
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              添加{activeTab === 'vehicle' ? '自有车辆' : '司机'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : activeTab === 'vehicle' ? (
            <VehicleTable
              vehicles={vehicles}
              onUpdateLocation={handleOpenLocationModal}
              onEdit={openEditModal}
              onDelete={handleDelete}
              canWrite={canTransportWrite}
            />
          ) : (
            <DriverTable
              drivers={drivers}
              onUpdateLocation={handleOpenLocationModal}
              onEdit={openEditModal}
              onDelete={handleDelete}
              canWrite={canTransportWrite}
            />
          )}
        </div>
      </div>

      <VehicleDriverForm
        isOpen={showModal}
        isEditing={!!editingItem}
        activeTab={activeTab}
        editingItem={editingItem}
        formData={formData}
        warehouses={warehouses}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        onFormChange={handleFormChange}
        onWarehouseChange={handleWarehouseChange}
        onLicenseTypeToggle={handleLicenseTypeToggle}
      />

      <LocationModal
        isOpen={showLocationModal}
        locationForm={locationForm}
        onClose={() => setShowLocationModal(false)}
        onSubmit={handleUpdateLocation}
        onFormChange={handleLocationFormChange}
      />
    </div>
  );
}
