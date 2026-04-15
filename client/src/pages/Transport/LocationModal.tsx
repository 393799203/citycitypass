import React from 'react';
import { LocationForm } from '../../types/dispatch';

interface LocationModalProps {
  isOpen: boolean;
  locationForm: LocationForm;
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (key: keyof LocationForm, value: string) => void;
}

export default function LocationModal({
  isOpen,
  locationForm,
  onClose,
  onSubmit,
  onFormChange
}: LocationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">更新位置</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
            <input
              type="text"
              value={locationForm.address}
              onChange={e => onFormChange('address', e.target.value)}
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
                onChange={e => onFormChange('latitude', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="如: 39.9042"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">经度</label>
              <input
                type="text"
                value={locationForm.longitude}
                onChange={e => onFormChange('longitude', e.target.value)}
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
              onChange={e => onFormChange('location', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="可选"
            />
          </div>
          <p className="text-xs text-gray-500">提示：输入地址后点击保存会自动调用高德API获取经纬度</p>
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
