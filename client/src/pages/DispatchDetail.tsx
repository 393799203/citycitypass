import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Truck, MapPin, Package, User } from 'lucide-react';
import { dispatchApi } from '../api';
import { formatPhone, formatAddress } from '../utils/format';

const dispatchStatusMap: Record<string, string> = {
  PENDING: '待发运',
  IN_TRANSIT: '配送中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export default function DispatchDetailPage() {
  const { id } = useParams();
  const [dispatch, setDispatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!dispatch?.plannedRoute || !mapRef.current) return;
    
    console.log('Dispatch data:', dispatch);
    console.log('PlannedRoute:', dispatch.plannedRoute);
    
    const initMap = () => {
      const AMap = (window as any).AMap;
      console.log('AMap loaded:', !!AMap, AMap);
      if (!AMap || !AMap.Map) {
        console.log('AMap not ready');
        return;
      }
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }
      
      const origin = dispatch.plannedRoute?.origin;
      const steps = dispatch.plannedRoute?.steps;
      const plannedDestinations = dispatch.plannedRoute?.destinations;
      
      const orderDestinations = dispatch.orders?.map((doItem: any) => ({
        latitude: doItem.order?.latitude || doItem.latitude,
        longitude: doItem.order?.longitude || doItem.longitude,
        address: doItem.order?.province + doItem.order?.city + doItem.order?.address,
        orderNo: doItem.order?.orderNo,
      })).filter((d: any) => d.latitude && d.longitude) || [];
      
      let allDestinations = [];
      if (plannedDestinations && plannedDestinations.length > 0) {
        allDestinations = plannedDestinations;
      } else if (dispatch.plannedRoute?.destination) {
        allDestinations = [dispatch.plannedRoute?.destination];
      } else if (orderDestinations.length > 0) {
        allDestinations = orderDestinations;
      }
      
      console.log('Origin:', origin);
      console.log('Dispatch orders:', dispatch.orders);
      console.log('Destinations:', allDestinations);
      console.log('Destinations count:', allDestinations.length);
      console.log('Steps:', steps);
      
      if (origin?.latitude && origin?.longitude && allDestinations.length > 0) {
        console.log('Drawing map with', allDestinations.length, 'destinations');
        const lngs = [origin.longitude, ...allDestinations.map((d: any) => d.longitude)];
        const lats = [origin.latitude, ...allDestinations.map((d: any) => d.latitude)];
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        
        const map = new AMap.Map(mapRef.current, {
          zoom: 10,
          center: [centerLng, centerLat],
        });
        
        const originMarker = new AMap.Marker({
          position: [origin.longitude, origin.latitude],
          title: '发货地: ' + origin.address,
          icon: new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
            imageSize: new AMap.Size(32, 32),
          }),
        });
        map.add(originMarker);
        
        allDestinations.forEach((dest: any, index: number) => {
          const destMarker = new AMap.Marker({
            position: [dest.longitude, dest.latitude],
            title: `订单${index + 1}: ${dest.orderNo || dest.address}`,
            icon: new AMap.Icon({
              size: new AMap.Size(24, 24),
              image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
              imageSize: new AMap.Size(24, 24),
            }),
            label: {
              content: `${index + 1}`,
              position: [dest.longitude, dest.latitude],
              offset: new AMap.Pixel(-6, -6),
            },
          });
          map.add(destMarker);
        });
        
        if (steps && steps.length > 0) {
          const path: any[] = [];
          steps.forEach((step: any) => {
            const polyline = step.polyline;
            if (polyline) {
              const points = polyline.split(';');
              points.forEach((point: string) => {
                const [lng, lat] = point.split(',');
                if (lng && lat) {
                  path.push([parseFloat(lng), parseFloat(lat)]);
                }
              });
            }
          });
          
          if (path.length > 0) {
            new AMap.Polyline({
              path: path,
              strokeColor: '#3b82f6',
              strokeWeight: 5,
            }).setMap(map);
          }
        }
        
        mapInstanceRef.current = map;
      }
    };
    
    if ((window as any).AMap) {
      initMap();
    } else {
      const timer = setInterval(() => {
        if ((window as any).AMap) {
          clearInterval(timer);
          initMap();
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, [dispatch]);

  const fetchData = async () => {
    try {
      const res = await dispatchApi.get(id!);
      if (res.data.success) {
        setDispatch(res.data.data);
      }
    } catch (error) {
      console.error('Fetch dispatch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await dispatchApi.updateStatus(id!, status);
      toast.success('状态更新成功');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!dispatch) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">配送单不存在</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastContainer />

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Truck className="w-6 h-6" />
              配送单详情
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              配送单号: {dispatch.dispatchNo}
              {dispatch.vehicleSource === 'CARRIER' && (
                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded">承运商</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm rounded-full ${
              dispatch.status === 'PENDING' ? 'bg-yellow-600 text-white' :
              dispatch.status === 'DISPATCHING' ? 'bg-blue-600 text-white' :
              dispatch.status === 'COMPLETED' ? 'bg-green-600 text-white' :
              'bg-gray-600 text-white'
            }`}>
              {dispatchStatusMap[dispatch.status]}
            </span>
            {dispatch.status === 'PENDING' && (
              <button
                onClick={() => handleStatusChange('IN_TRANSIT')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                发车
              </button>
            )}
            {dispatch.status === 'IN_TRANSIT' && (
              <button
                onClick={() => handleStatusChange('COMPLETED')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                完成配送
              </button>
            )}
            {(dispatch.status === 'PENDING' || dispatch.status === 'IN_TRANSIT') && (
              <button
                onClick={() => handleStatusChange('CANCELLED')}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50"
              >
                取消配送
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              发货地
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">仓库:</span>
                <span>{dispatch.warehouse?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">地址:</span>
                <span>{formatAddress(dispatch.warehouse?.province, dispatch.warehouse?.city, dispatch.warehouse?.address)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              目的地
            </h3>
            <div className="space-y-2 text-sm">
              {dispatch.orders?.length > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">城市:</span>
                    <span>{dispatch.orders[0]?.order?.city || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">终点:</span>
                    <span>{formatAddress(
                      dispatch.orders[dispatch.orders.length - 1]?.order?.province,
                      dispatch.orders[dispatch.orders.length - 1]?.order?.city,
                      dispatch.orders[dispatch.orders.length - 1]?.order?.address
                    )}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">城市:</span>
                    <span>{dispatch.plannedRoute?.destination?.agentName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">地址:</span>
                    <span>{dispatch.plannedRoute?.destination?.address || '-'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <User className="w-4 h-4" />
              车辆信息
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center justify-center px-2 py-1 bg-blue-600 text-white text-sm font-medium rounded">
                {dispatch.vehicleSource === 'CARRIER'
                  ? dispatch.carrierVehicle?.licensePlate?.slice(0, 2) + '·' + dispatch.carrierVehicle?.licensePlate?.slice(2)
                  : dispatch.vehicle?.licensePlate?.slice(0, 2) + '·' + dispatch.vehicle?.licensePlate?.slice(2) || '-'}
              </div>
              <span className="text-gray-600">
                ({dispatch.vehicleSource === 'CARRIER' ? dispatch.carrierVehicle?.vehicleType : dispatch.vehicle?.vehicleType})
              </span>
            </div>
            <div className="text-sm text-gray-500">
              载重: {dispatch.vehicleSource === 'CARRIER' ? dispatch.carrierVehicle?.capacity : dispatch.vehicle?.capacity}件
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <User className="w-4 h-4" />
              司机信息
            </div>
            <div className="font-medium">
              {dispatch.driver?.name}
            </div>
            <div className="text-sm text-gray-500">
              电话: {formatPhone(dispatch.driver?.phone || '')}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Package className="w-4 h-4" />
              配送信息
            </div>
            <div className="font-medium">
              {dispatch.orderCount} 个订单 / {dispatch.totalWeight} 件
            </div>
            <div className="text-sm text-gray-500">
              距离: {dispatch.totalDistance ? dispatch.totalDistance.toFixed(1) + ' km' : '-'}
            </div>
          </div>
        </div>

        {dispatch.plannedRoute && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-3">路线规划</h3>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <div className="flex-shrink-0">
                <div className="text-sm text-gray-500">起点</div>
                <div className="font-medium">{dispatch.plannedRoute?.origin?.address}</div>
              </div>
              {dispatch.plannedRoute?.destinations?.map((dest: any, index: number) => (
                <div key={index} className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-gray-400">→</div>
                  <div className="flex-shrink-0">
                    <div className="text-sm text-gray-500">
                      {index === (dispatch.plannedRoute?.destinations?.length || 0) - 1 ? '终点' : `途径${index + 1}`}
                    </div>
                    <div className="font-medium">{dest.address}</div>
                  </div>
                </div>
              ))}
            </div>
            <div ref={mapRef} className="w-full h-96 rounded-lg mt-3" />
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">订单列表</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b">
                  <th className="pb-2">顺序</th>
                  <th className="pb-2">订单号</th>
                  <th className="pb-2">收货人</th>
                  <th className="pb-2">联系电话</th>
                  <th className="pb-2">收货地址</th>
                  <th className="pb-2">状态</th>
                </tr>
              </thead>
              <tbody>
                {dispatch.orders?.map((doItem: any, index: number) => {
                  const totalDests = dispatch.plannedRoute?.destinations?.length || dispatch.orders?.length || 0;
                  const isFinal = index === totalDests - 1;
                  return (
                  <tr key={doItem.id} className="border-b">
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${isFinal ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {isFinal ? '终点' : `途径${index + 1}`}
                      </span>
                    </td>
                    <td className="py-3 font-medium">{doItem.order?.orderNo}</td>
                    <td className="py-3">{doItem.order?.receiver}</td>
                    <td className="py-3">{formatPhone(doItem.order?.phone || '')}</td>
                    <td className="py-3">{formatAddress(doItem.order?.province, doItem.order?.city, doItem.order?.address)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        doItem.order?.status === 'PENDING' ? 'bg-yellow-600 text-white' :
                        doItem.order?.status === 'APPROVED' ? 'bg-blue-600 text-white' :
                        doItem.order?.status === 'IN_TRANSIT' ? 'bg-purple-600 text-white' :
                        doItem.order?.status === 'DELIVERED' ? 'bg-green-600 text-white' :
                        doItem.order?.status === 'CANCELLED' ? 'bg-red-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {doItem.order?.status === 'PENDING' ? '待确认' :
                         doItem.order?.status === 'APPROVED' ? '已通过' :
                         doItem.order?.status === 'PICKING' ? '拣货中' :
                         doItem.order?.status === 'OUTBOUND_REVIEW' ? '待出库' :
                         doItem.order?.status === 'DISPATCHING' ? '待调度' :
                         doItem.order?.status === 'DISPATCHED' ? '已调度' :
                         doItem.order?.status === 'IN_TRANSIT' ? '配送中' :
                         doItem.order?.status === 'DELIVERED' ? '已送达' :
                         doItem.order?.status === 'CANCELLED' ? '已取消' :
                         doItem.order?.status || '-'}
                      </span>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
