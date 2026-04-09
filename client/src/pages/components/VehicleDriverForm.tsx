import React from 'react';
import { X } from 'lucide-react';
import LicensePlateInput from '../../components/LicensePlateInput';
import PhoneInput from '../../components/PhoneInput';
import LicenseNoInput from '../../components/LicenseNoInput';
import { Vehicle, Driver, FormData, Warehouse } from '../types';

interface VehicleDriverFormProps {
  isOpen: boolean;
  isEditing: boolean;
  activeTab: 'vehicle' | 'driver';
  editingItem: Vehicle | Driver | null;
  formData: FormData;
  warehouses: Warehouse[];
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (key: keyof FormData, value: any) => void;
  onWarehouseChange: (warehouseId: string) => void;
  onLicenseTypeToggle: (type: string) => void;
}

export default function VehicleDriverForm({
  isOpen,
  isEditing,
  activeTab,
  editingItem,
  formData,
  warehouses,
  onClose,
  onSubmit,
  onFormChange,
  onWarehouseChange,
  onLicenseTypeToggle
}: VehicleDriverFormProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {isEditing ? '编辑' : '添加'}{activeTab === 'vehicle' ? '车辆' : '司机'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === 'vehicle' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {editingItem && 'sourceType' in editingItem && editingItem.sourceType === 'CARRIER' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">承运商</label>
                    <input
                      type="text"
                      value={formData.warehouse?.name || ''}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                ) : editingItem ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">仓库</label>
                    <input
                      type="text"
                      value={warehouses.find(w => w.id === formData.warehouseId)?.name || ''}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">仓库 *</label>
                    <select
                      value={formData.warehouseId}
                      onChange={e => onWarehouseChange(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">请选择仓库</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">车牌号</label>
                  {editingItem ? (
                    <input
                      type="text"
                      value={formData.licensePlate}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                    />
                  ) : (
                    <LicensePlateInput
                      value={formData.licensePlate}
                      onChange={(val) => onFormChange('licensePlate', val)}
                      className="w-full"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">车型</label>
                  <select
                    value={formData.vehicleType}
                    onChange={e => onFormChange('vehicleType', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="小型货车">小型货车</option>
                    <option value="中型货车">中型货车</option>
                    <option value="大型货车">大型货车</option>
                    <option value="平板车">平板车</option>
                    <option value="厢式货车">厢式货车</option>
                    <option value="冷藏车">冷藏车</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => onFormChange('brand', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">型号</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={e => onFormChange('model', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">载重(吨)</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={e => onFormChange('capacity', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">容积(m³)</label>
                  <input
                    type="number"
                    value={formData.volume}
                    onChange={e => onFormChange('volume', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">行驶证号</label>
                  <input
                    type="text"
                    value={formData.licenseNo}
                    onChange={e => onFormChange('licenseNo', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">保险单号</label>
                  <input
                    type="text"
                    value={formData.insuranceNo}
                    onChange={e => onFormChange('insuranceNo', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">仓库</label>
                <select
                  value={formData.warehouseId}
                  onChange={e => onWarehouseChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">请选择仓库</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => onFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => onFormChange('phone', val)}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">驾驶证号</label>
                  <LicenseNoInput
                    value={formData.licenseNo}
                    onChange={(val) => onFormChange('licenseNo', val)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">准驾车型</label>
                  <div className="flex flex-wrap gap-2">
                    {['小型货车', '中型货车', '大型货车', '平板车', '厢式货车', '冷藏车'].map(type => (
                      <label key={type} className="flex items-center gap-1 px-3 py-1 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.licenseTypes.includes(type)}
                          onChange={() => onLicenseTypeToggle(type)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
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
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
