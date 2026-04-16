import React from 'react';
import { MapPin, Edit2, Trash2 } from 'lucide-react';
import { Driver } from '../../types/dispatch';
import { formatPhone } from '../../utils/format';

interface DriverTableProps {
  drivers: Driver[];
  onUpdateLocation: (driver: Driver) => void;
  onEdit: (driver: Driver) => void;
  onDelete: (id: string) => void;
  canWrite?: boolean;
}

const driverStatusMap: Record<string, string> = {
  AVAILABLE: '空闲',
  IN_TRANSIT: '配送中',
  RESTING: '休息',
  DISABLED: '停用',
};

const licenseTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  '小型货车': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  '中型货车': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  '大型货车': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  '平板车': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  '厢式货车': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  '冷藏车': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
};

export default function DriverTable({ drivers, onUpdateLocation, onEdit, onDelete, canWrite = false }: DriverTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-center text-gray-500 text-sm border-b">
            <th className="pb-3">仓库</th>
            <th className="pb-3">司机/电话</th>
            <th className="pb-3">驾驶证号</th>
            <th className="pb-3">准驾车型</th>
            <th className="pb-3">当前位置</th>
            <th className="pb-3">当前车辆</th>
            <th className="pb-3">状态</th>
            <th className="pb-3">操作</th>
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
                {list.map((driver: Driver, idx: number) => (
                  <tr key={driver.id} className="border-b hover:bg-gray-50">
                    {idx === 0 && <td rowSpan={list.length} className="py-3 text-primary-600 font-medium align-middle text-center">{warehouseName}</td>}
                    <td className="py-3 text-sm text-center">
                      <div className="font-medium">{driver.name}</div>
                      <div className="text-gray-400 text-xs">{formatPhone(driver.phone)}</div>
                    </td>
                    <td className="py-3 font-mono text-sm text-center">{driver.licenseNo ? driver.licenseNo.replace(/(\d{6})(\d{6})(\d{2})/, '$1 $2 $3').replace(/(\d{6})(\d{10})(\d{2})/, '$1 $2 $3') : '-'}</td>
                    <td className="py-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {driver.licenseTypes?.map((type: string) => (
                          <span key={type} className={`px-2 py-0.5 text-xs rounded-full ${licenseTypeColors[type]?.bg || 'bg-gray-100'} ${licenseTypeColors[type]?.text || 'text-gray-700'} border ${licenseTypeColors[type]?.border || 'border-gray-200'}`}>
                            {type}
                          </span>
                        )) || '-'}
                      </div>
                    </td>
                    <td className="py-3 text-gray-500 text-sm text-center">
                      <div>{driver.location || '-'}</div>
                      <div className="text-xs">{driver.address || '-'}</div>
                      {driver.latitude && driver.longitude && (
                        <div className="text-xs text-gray-400">({driver.latitude},{driver.longitude})</div>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {driver.vehicle?.licensePlate
                        ? <div className="inline-flex items-center justify-center px-2 py-1 bg-blue-600 text-white text-sm font-medium rounded">
                            {driver.vehicle.licensePlate.slice(0, 2)}·{driver.vehicle.licensePlate.slice(2)}
                          </div>
                        : '-'}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        driver.status === 'AVAILABLE' ? 'bg-green-600 text-white' :
                        driver.status === 'IN_TRANSIT' ? 'bg-blue-600 text-white' :
                        driver.status === 'RESTING' ? 'bg-yellow-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {driverStatusMap[driver.status]}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {canWrite && (
                        <>
                          <button
                            onClick={() => onUpdateLocation(driver)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded mr-2"
                            title="更新位置"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(driver)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(driver.id)}
                            className={`p-1.5 rounded ${
                              driver.status === 'AVAILABLE' 
                                ? 'text-red-600 hover:bg-red-50' 
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                            disabled={driver.status !== 'AVAILABLE'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ));
          })()}
          {drivers.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-500">
                暂无司机数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
