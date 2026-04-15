import React from 'react';
import { MapPin, Edit2, Trash2 } from 'lucide-react';
import { Vehicle } from '../../types/dispatch';
import { formatPhone } from '../../utils/format';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onUpdateLocation: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string, vehicle: Vehicle) => void;
}

const vehicleStatusMap: Record<string, string> = {
  AVAILABLE: '空闲',
  IN_TRANSIT: '配送中',
  MAINTENANCE: '维修',
  DISABLED: '停用',
};

const vehicleTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  '小型货车': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  '中型货车': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  '大型货车': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  '平板车': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  '厢式货车': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  '冷藏车': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
};

export default function VehicleTable({ vehicles, onUpdateLocation, onEdit, onDelete }: VehicleTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-center text-gray-500 text-sm border-b">
            <th className="pb-3">仓库</th>
            <th className="pb-3">车牌号</th>
            <th className="pb-3">车型</th>
            <th className="pb-3">品牌-型号</th>
            <th className="pb-3">载重/容积</th>
            <th className="pb-3">证照信息</th>
            <th className="pb-3">当前位置</th>
            <th className="pb-3">当前司机</th>
            <th className="pb-3">状态</th>
            <th className="pb-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const warehouseVehicles = vehicles.filter((v) => v.sourceType === 'WAREHOUSE');
            const carrierVehicles = vehicles.filter((v) => v.sourceType === 'CARRIER');
            const groupedWarehouse = warehouseVehicles.reduce((acc: any, v) => {
              const key = v.warehouse?.name || '未知仓库';
              if (!acc[key]) acc[key] = [];
              acc[key].push(v);
              return acc;
            }, {});
            const groupedCarrier = carrierVehicles.reduce((acc: any, v) => {
              const key = v.warehouse?.name + ' (承运商)' || '未知承运商';
              if (!acc[key]) acc[key] = [];
              acc[key].push(v);
              return acc;
            }, {});
            const warehouseEntries = Object.entries(groupedWarehouse);
            const carrierEntries = Object.entries(groupedCarrier);
            return [...warehouseEntries.map(([k, v]) => [k, v, 'warehouse'] as [string, any, string]), 
                    ...carrierEntries.map(([k, v]) => [k, v, 'carrier'] as [string, any, string])].map(([groupName, list, source]) => (
              <React.Fragment key={groupName}>
                {list.map((vehicle: Vehicle, idx: number) => (
                  <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                    {idx === 0 && <td rowSpan={list.length} className="py-3 align-middle text-center">
                      <span className="text-primary-600 font-medium">{groupName.replace(' (承运商)', '')}</span>
                      {groupName.includes('承运商') && <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500 text-white rounded">承运商</span>}
                    </td>}
                    <td className="py-3 text-center">
                      <div className="inline-flex items-center justify-center px-2 py-1 bg-blue-600 text-white text-sm font-medium rounded">
                        {vehicle.licensePlate ? vehicle.licensePlate.slice(0, 2) + '·' + vehicle.licensePlate.slice(2) : '-'}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      {vehicle.vehicleType && vehicleTypeColors[vehicle.vehicleType] ? (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${vehicleTypeColors[vehicle.vehicleType].bg} ${vehicleTypeColors[vehicle.vehicleType].text} border ${vehicleTypeColors[vehicle.vehicleType].border}`}>
                          {vehicle.vehicleType}
                        </span>
                      ) : vehicle.vehicleType || '-'}
                    </td>
                    <td className="py-3 text-sm text-center">
                      {vehicle.brand || vehicle.model ? `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() : '-'}
                    </td>
                    <td className="py-3 text-sm text-center">
                      <div>载重: {vehicle.capacity}吨</div>
                      <div>容积: {vehicle.volume || '-'}m³</div>
                    </td>
                    <td className="py-3 text-sm text-gray-500 text-center">
                      <div>证:{vehicle.licenseNo || '-'}</div>
                      <div>险:{vehicle.insuranceNo || '-'}</div>
                    </td>
                    <td className="py-3 text-gray-500 text-sm text-center">
                      <div>{vehicle.location || '-'}</div>
                      <div className="text-xs">{vehicle.address || '-'}</div>
                      {vehicle.latitude && vehicle.longitude && (
                        <div className="text-xs text-gray-400">({vehicle.latitude},{vehicle.longitude})</div>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {vehicle.drivers && vehicle.drivers.length > 0
                        ? vehicle.drivers.map((d) => (
                            <div key={d.id} className="text-sm">
                              <div className="font-medium">{d.name}</div>
                              <div className="text-gray-400 text-xs">{formatPhone(d.phone)}</div>
                            </div>
                          ))
                        : '-'}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        vehicle.status === 'AVAILABLE' ? 'bg-green-600 text-white' :
                        vehicle.status === 'IN_TRANSIT' ? 'bg-blue-600 text-white' :
                        vehicle.status === 'MAINTENANCE' ? 'bg-yellow-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {vehicleStatusMap[vehicle.status]}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => onUpdateLocation(vehicle)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded mr-2"
                        title="更新位置"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                      {vehicle.sourceType !== 'CARRIER' && (
                        <>
                          <button
                            onClick={() => onEdit(vehicle)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(vehicle.id, vehicle)}
                            className={`p-1.5 rounded ${
                              vehicle.status === 'AVAILABLE'
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                            disabled={vehicle.status !== 'AVAILABLE'}
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
          {vehicles.length === 0 && (
            <tr>
              <td colSpan={10} className="py-8 text-center text-gray-500">
                暂无车辆数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
