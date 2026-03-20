import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Truck, Plus, Trash2, Edit2, User, Phone, Car, X, MapPin } from 'lucide-react';
import { vehicleApi, driverApi, geocodeApi } from '../api';
import LicensePlateInput from '../components/LicensePlateInput';

const vehicleTypeMap: Record<string, string> = {
  '小面': '小面',
  '中面': '中面',
  '厢货': '厢货',
};

const vehicleStatusMap: Record<string, string> = {
  AVAILABLE: '空闲',
  IN_TRANSIT: '配送中',
  MAINTENANCE: '维修',
  DISABLED: '停用',
};

const driverStatusMap: Record<string, string> = {
  AVAILABLE: '空闲',
  IN_TRANSIT: '配送中',
  RESTING: '休息',
  DISABLED: '停用',
};

interface Vehicle {
  id: string;
  licensePlate: string;
  vehicleType: string;
  capacity: number;
  volume?: number;
  status: string;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  latitude?: number;
  longitude?: number;
  location?: string;
  drivers?: Driver[];
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
  licenseTypes?: string[];
  status: string;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  vehicle?: Vehicle;
  latitude?: number;
  longitude?: number;
  location?: string;
}

export default function TransportPage() {
  const [activeTab, setActiveTab] = useState<'vehicle' | 'driver'>('vehicle');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationItem, setLocationItem] = useState<any>(null);
  const [locationForm, setLocationForm] = useState({ address: '', latitude: '', longitude: '', location: '' });
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    warehouseId: '',
    licensePlate: '',
    vehicleType: '小面',
    capacity: 50,
    volume: '',
    status: 'AVAILABLE',
    name: '',
    phone: '',
    licenseNo: '',
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
        vehicleApi.list({}),
        driverApi.list({}),
        (await import('../api')).warehouseApi.list({}),
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
        if (!formData.warehouseId) {
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
          capacity: formData.capacity,
          volume: formData.volume || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          location: formData.location || null,
        };
        if (editingItem) {
          await vehicleApi.update(editingItem.id, vehicleData);
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
        if (editingItem) {
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

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return;
    try {
      if (activeTab === 'vehicle') {
        await vehicleApi.delete(id);
        toast.success('车辆删除成功');
      } else {
        await driverApi.delete(id);
        toast.success('司机删除成功');
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleOpenLocationModal = (item: any) => {
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
      if (activeTab === 'vehicle') {
        await vehicleApi.update(locationItem.id, updateData);
        toast.success('车辆位置更新成功');
      } else {
        await driverApi.update(locationItem.id, updateData);
        toast.success('司机位置更新成功');
      }
      setShowLocationModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '位置更新失败');
    }
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'vehicle') {
      setFormData({
        warehouseId: item.warehouseId || '',
        licensePlate: item.licensePlate,
        vehicleType: item.vehicleType,
        capacity: item.capacity,
        volume: item.volume?.toString() || '',
        status: item.status,
        name: '',
        phone: '',
        licenseNo: '',
        licenseTypes: [],
        driverStatus: 'AVAILABLE',
        latitude: item.latitude?.toString() || '',
        longitude: item.longitude?.toString() || '',
        location: item.location || '',
        address: '',
      });
    } else {
      setFormData({
        warehouseId: item.warehouseId || '',
        licensePlate: '',
        vehicleType: '小面',
        capacity: 50,
        volume: '',
        status: 'AVAILABLE',
        name: item.name,
        phone: item.phone,
        licenseNo: item.licenseNo,
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
      licensePlate: '',
      vehicleType: '小面',
      capacity: 50,
      volume: '',
      status: 'AVAILABLE',
      name: '',
      phone: '',
      licenseNo: '',
      licenseTypes: [],
      driverStatus: 'AVAILABLE',
      latitude: '',
      longitude: '',
      location: '',
      address: '',
    });
    setShowModal(true);
  };

  return (
    <div className="p-6">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Truck className="w-6 h-6" />
          运力管理
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
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              添加{activeTab === 'vehicle' ? '车辆' : '司机'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : activeTab === 'vehicle' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 text-sm border-b">
                    <th className="pb-3">仓库</th>
                    <th className="pb-3">车牌号</th>
                    <th className="pb-3">车型</th>
                    <th className="pb-3">载重(吨)</th>
                    <th className="pb-3">容积(m³)</th>
                    <th className="pb-3">当前位置</th>
                    <th className="pb-3">详细地址</th>
                    <th className="pb-3">当前司机</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const groupedVehicles = vehicles.reduce((acc: any, v) => {
                      const key = v.warehouse?.name || '未知仓库';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(v);
                      return acc;
                    }, {});
                    return Object.entries(groupedVehicles).map(([warehouseName, list]: [string, any]) => (
                      <React.Fragment key={warehouseName}>
                        {list.map((vehicle: any, idx: number) => (
                          <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                            {idx === 0 && <td rowSpan={list.length} className="py-3 text-primary-600 font-medium align-middle">{warehouseName}</td>}
                            <td className="py-3 font-medium">{vehicle.licensePlate}</td>
                            <td className="py-3">{vehicle.vehicleType}</td>
                            <td className="py-3">{vehicle.capacity}</td>
                            <td className="py-3">{vehicle.volume || '-'}</td>
                            <td className="py-3 text-gray-500 text-sm">
                              {vehicle.location || '-'}
                            </td>
                            <td className="py-3 text-gray-500 text-sm">
                              {vehicle.address || '-'}
                              {vehicle.latitude && vehicle.longitude && (
                                <span className="ml-1 text-xs">({vehicle.latitude},{vehicle.longitude})</span>
                              )}
                            </td>
                            <td className="py-3">
                              {vehicle.drivers && vehicle.drivers.length > 0 
                                ? vehicle.drivers.map((d: any) => d.name).join(', ')
                                : '-'}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                vehicle.status === 'AVAILABLE' ? 'bg-green-600 text-white' :
                                vehicle.status === 'IN_TRANSIT' ? 'bg-blue-600 text-white' :
                                vehicle.status === 'MAINTENANCE' ? 'bg-yellow-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}>
                                {vehicleStatusMap[vehicle.status]}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleOpenLocationModal(vehicle)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded mr-2"
                                title="更新位置"
                              >
                                <MapPin className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(vehicle)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(vehicle.id)}
                                className={`p-1.5 rounded ${
                                  vehicle.status === 'AVAILABLE' 
                                    ? 'text-red-600 hover:bg-red-50' 
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                disabled={vehicle.status !== 'AVAILABLE'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ));
                  })()}
                  {vehicles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        暂无车辆数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 text-sm border-b">
                    <th className="pb-3">仓库</th>
                    <th className="pb-3">姓名</th>
                    <th className="pb-3">电话</th>
                    <th className="pb-3">驾驶证号</th>
                    <th className="pb-3">准驾车型</th>
                    <th className="pb-3">当前位置</th>
                    <th className="pb-3">详细地址</th>
                    <th className="pb-3">当前车辆</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const groupedDrivers = drivers.reduce((acc: any, d) => {
                      const key = d.warehouse?.name || '未知仓库';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(d);
                      return acc;
                    }, {});
                    return Object.entries(groupedDrivers).map(([warehouseName, list]: [string, any]) => (
                      <React.Fragment key={warehouseName}>
                        {list.map((driver: any, idx: number) => (
                          <tr key={driver.id} className="border-b hover:bg-gray-50">
                            {idx === 0 && <td rowSpan={list.length} className="py-3 text-primary-600 font-medium align-middle">{warehouseName}</td>}
                            <td className="py-3 font-medium">{driver.name}</td>
                            <td className="py-3">{driver.phone}</td>
                            <td className="py-3">{driver.licenseNo}</td>
                            <td className="py-3">{driver.licenseTypes?.join(', ') || '-'}</td>
                            <td className="py-3 text-gray-500 text-sm">
                              {driver.location || '-'}
                            </td>
                            <td className="py-3 text-gray-500 text-sm">
                              {driver.address || '-'}
                              {driver.latitude && driver.longitude && (
                                <span className="ml-1 text-xs">({driver.latitude},{driver.longitude})</span>
                              )}
                            </td>
                            <td className="py-3">{driver.vehicle?.licensePlate || '-'}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                driver.status === 'AVAILABLE' ? 'bg-green-600 text-white' :
                                driver.status === 'IN_TRANSIT' ? 'bg-blue-600 text-white' :
                                driver.status === 'RESTING' ? 'bg-yellow-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}>
                                {driverStatusMap[driver.status]}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleOpenLocationModal(driver)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded mr-2"
                                title="更新位置"
                              >
                                <MapPin className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(driver)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(driver.id)}
                                className={`p-1.5 rounded ${
                                  driver.status === 'AVAILABLE' 
                                    ? 'text-red-600 hover:bg-red-50' 
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                disabled={driver.status !== 'AVAILABLE'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ));
                  })()}
                  {drivers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        暂无司机数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingItem ? '编辑' : '添加'}{activeTab === 'vehicle' ? '车辆' : '司机'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {activeTab === 'vehicle' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">仓库</label>
                    <select
                      value={formData.warehouseId}
                      onChange={e => {
                        const warehouse = warehouses.find(w => w.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          warehouseId: e.target.value,
                          latitude: warehouse?.latitude?.toString() || '',
                          longitude: warehouse?.longitude?.toString() || '',
                          location: warehouse?.address || '',
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">请选择仓库</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">车牌号</label>
                    <LicensePlateInput
                      value={formData.licensePlate}
                      onChange={(val) => setFormData({ ...formData, licensePlate: val })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">车型</label>
                    <select
                      value={formData.vehicleType}
                      onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="小面">小面</option>
                      <option value="中面">中面</option>
                      <option value="厢货">厢货</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">载重(吨)</label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">容积(m³)</label>
                    <input
                      type="number"
                      value={formData.volume}
                      onChange={e => setFormData({ ...formData, volume: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="可选"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">仓库</label>
                    <select
                      value={formData.warehouseId}
                      onChange={e => {
                        const warehouse = warehouses.find(w => w.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          warehouseId: e.target.value,
                          latitude: warehouse?.latitude?.toString() || '',
                          longitude: warehouse?.longitude?.toString() || '',
                          location: warehouse?.address || '',
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">请选择仓库</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">驾驶证号</label>
                    <input
                      type="text"
                      value={formData.licenseNo}
                      onChange={e => setFormData({ ...formData, licenseNo: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">准驾车型</label>
                    <div className="flex flex-wrap gap-2">
                      {['小面', '中面', '厢货'].map(type => (
                        <label key={type} className="flex items-center gap-1 px-3 py-1 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={formData.licenseTypes.includes(type)}
                            onChange={e => {
                              if (e.target.checked) {
                                setFormData({ ...formData, licenseTypes: [...formData.licenseTypes, type] });
                              } else {
                                setFormData({ ...formData, licenseTypes: formData.licenseTypes.filter(t => t !== type) });
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600"
                          />
                          <span className="text-sm">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {formData.latitude && formData.longitude && (
                    <p className="text-xs text-green-600 mt-1">
                      已设置位置: {formData.latitude}, {formData.longitude} {formData.location && `(${formData.location})`}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">更新位置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                <input
                  type="text"
                  value={locationForm.address}
                  onChange={e => setLocationForm({ ...locationForm, address: e.target.value })}
                  onBlur={async () => {
                    if (locationForm.address) {
                      try {
                        const res = await geocodeApi.geocode(locationForm.address);
                        if (res.data.success) {
                          setLocationForm(prev => ({
                            ...prev,
                            latitude: res.data.data.latitude.toString(),
                            longitude: res.data.data.longitude.toString(),
                            location: res.data.data.location,
                          }));
                        }
                      } catch (e) {
                        // ignore
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="输入地址自动获取经纬度"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">纬度</label>
                  <input
                    type="text"
                    value={locationForm.latitude}
                    onChange={e => setLocationForm({ ...locationForm, latitude: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="如: 39.9042"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">经度</label>
                  <input
                    type="text"
                    value={locationForm.longitude}
                    onChange={e => setLocationForm({ ...locationForm, longitude: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="如: 116.4074"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">位置描述</label>
                <input
                  type="text"
                  value={locationForm.location}
                  onChange={e => setLocationForm({ ...locationForm, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="可选"
                />
              </div>
              <p className="text-xs text-gray-500">提示：输入地址后点击保存会自动调用高德API获取经纬度</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleUpdateLocation}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
