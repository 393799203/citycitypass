import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Truck, MapPin, Package, User } from 'lucide-react';
import { dispatchApi } from '../api';
import { formatPhone, formatAddress } from '../utils/format';
import { usePermission } from '../hooks/usePermission';

const getDispatchStatusMap = (t: any): Record<string, string> => ({
  PENDING: t('dispatch.dispatchStatusPending'),
  IN_TRANSIT: t('dispatch.dispatchStatusInTransit'),
  COMPLETED: t('dispatch.dispatchStatusCompleted'),
  CANCELLED: t('dispatch.dispatchStatusCancelled'),
});

export default function DispatchDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { canWrite } = usePermission('business', 'dispatch');
  const dispatchStatusMap = getDispatchStatusMap(t);
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
      toast.success(t('dispatch.statusUpdated'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('dispatch.dispatchFailed'));
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">{t('dispatch.loading')}</div>
      </div>
    );
  }

  if (!dispatch) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">{t('dispatch.dispatchNotExist')}</div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-4 pb-20">
      <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
        <div className="hidden sm:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Truck className="w-6 h-6" />
              {t('dispatch.dispatchDetail')}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              {t('dispatch.dispatchNo')}: {dispatch.dispatchNo}
              {dispatch.vehicleSource === 'CARRIER' && (
                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded">{t('dispatch.carrier')}</span>
              )}
              <span className={`px-3 py-1 text-sm rounded-full ${
                dispatch.status === 'PENDING' ? 'bg-yellow-600 text-white' :
                dispatch.status === 'DISPATCHING' ? 'bg-blue-600 text-white' :
                dispatch.status === 'COMPLETED' ? 'bg-green-600 text-white' :
                'bg-gray-600 text-white'
              }`}>
                {dispatchStatusMap[dispatch.status]}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {dispatch.status === 'PENDING' && canWrite && (
              <button
                onClick={() => handleStatusChange('IN_TRANSIT')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('dispatch.startVehicle')}
              </button>
            )}
            {dispatch.status === 'IN_TRANSIT' && canWrite && (
              <button
                onClick={() => handleStatusChange('COMPLETED')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {t('dispatch.completeDelivery')}
              </button>
            )}
            {dispatch.status === 'PENDING' && canWrite && (
              <button
                onClick={() => handleStatusChange('CANCELLED')}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50"
              >
                {t('dispatch.cancelDelivery')}
              </button>
            )}
          </div>
        </div>

        <div className="sm:hidden flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{dispatch.dispatchNo}</span>
            {dispatch.vehicleSource === 'CARRIER' && (
              <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded">{t('dispatch.carrier')}</span>
            )}
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              dispatch.status === 'PENDING' ? 'bg-yellow-600 text-white' :
              dispatch.status === 'DISPATCHING' ? 'bg-blue-600 text-white' :
              dispatch.status === 'COMPLETED' ? 'bg-green-600 text-white' :
              'bg-gray-600 text-white'
            }`}>
              {dispatchStatusMap[dispatch.status]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h3 className="font-medium text-gray-700 mb-2 sm:mb-3 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              {t('dispatch.origin')}
            </h3>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('dispatch.warehouse')}:</span>
                <span>{dispatch.warehouse?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('dispatch.address')}:</span>
                <span className="text-right max-w-[60%]">{formatAddress(dispatch.warehouse?.province, dispatch.warehouse?.city, dispatch.warehouse?.address)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h3 className="font-medium text-gray-700 mb-2 sm:mb-3 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              {t('dispatch.destination')}
            </h3>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              {dispatch.orders?.length > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('dispatch.city')}:</span>
                    <span>{dispatch.orders[0]?.order?.city || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('dispatch.endpoint')}:</span>
                    <span className="text-right max-w-[60%]">{formatAddress(
                      dispatch.orders[dispatch.orders.length - 1]?.order?.province,
                      dispatch.orders[dispatch.orders.length - 1]?.order?.city,
                      dispatch.orders[dispatch.orders.length - 1]?.order?.address
                    )}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('dispatch.city')}:</span>
                    <span>{dispatch.plannedRoute?.destination?.agentName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('dispatch.address')}:</span>
                    <span className="text-right max-w-[60%]">{dispatch.plannedRoute?.destination?.address || '-'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-gray-50 rounded-lg p-2 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 text-gray-500 text-xs sm:text-sm mb-1">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('dispatch.vehicle')}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="inline-flex items-center justify-center px-1 sm:px-2 py-0.5 sm:py-1 bg-blue-600 text-white text-xs font-medium rounded">
                {dispatch.vehicleSource === 'CARRIER'
                  ? dispatch.carrierVehicle?.licensePlate?.slice(0, 2) + '·' + dispatch.carrierVehicle?.licensePlate?.slice(2)
                  : dispatch.vehicle?.licensePlate?.slice(0, 2) + '·' + dispatch.vehicle?.licensePlate?.slice(2) || '-'}
              </div>
            </div>
            <div className="text-xs text-gray-500 hidden sm:block">
              {t('dispatch.capacity')}: {dispatch.vehicleSource === 'CARRIER' ? dispatch.carrierVehicle?.capacity : dispatch.vehicle?.capacity}{t('dispatch.items')}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-2 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 text-gray-500 text-xs sm:text-sm mb-1">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('dispatch.driver')}
            </div>
            <div className="font-medium text-sm sm:text-base">
              {dispatch.driver?.name || '-'}
            </div>
            <div className="text-xs text-gray-500">
              {formatPhone(dispatch.driver?.phone || '')}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-2 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 text-gray-500 text-xs sm:text-sm mb-1">
              <Package className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('dispatch.dispatch')}
            </div>
            <div className="font-medium text-sm sm:text-base">
              {dispatch.orderCount}{t('dispatch.ordersUnit')}
            </div>
            <div className="text-xs text-gray-500">
              {dispatch.totalDistance ? dispatch.totalDistance.toFixed(1) + 'km' : '-'}
            </div>
          </div>
        </div>

        {dispatch.plannedRoute && (
          <div className="mb-4 sm:mb-6">
            <h3 className="font-medium text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base">{t('dispatch.routeInfo')}</h3>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm">
              <div className="flex-shrink-0">
                <div className="text-gray-500">{t('dispatch.origin')}</div>
                <div className="font-medium">{dispatch.plannedRoute?.origin?.address}</div>
              </div>
              {dispatch.plannedRoute?.destinations?.map((dest: any, index: number) => (
                <div key={index} className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-gray-400">→</div>
                  <div className="flex-shrink-0">
                    <div className="text-gray-500">
                      {index === (dispatch.plannedRoute?.destinations?.length || 0) - 1 ? t('dispatch.endpoint') : `${t('dispatch.via')}${index + 1}`}
                    </div>
                    <div className="font-medium">{dest.address}</div>
                  </div>
                </div>
              ))}
            </div>
            <div ref={mapRef} className="w-full h-48 sm:h-96 rounded-lg mt-3" />
          </div>
        )}

        <div className="mb-4 sm:mb-6">
          <h3 className="font-medium text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base">{t('dispatch.orderList')}</h3>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b">
                  <th className="pb-2">{t('dispatch.sequence')}</th>
                  <th className="pb-2">{t('dispatch.orderNo')}</th>
                  <th className="pb-2">{t('dispatch.receiver')}</th>
                  <th className="pb-2">{t('dispatch.contactPhone')}</th>
                  <th className="pb-2">{t('dispatch.deliveryAddress')}</th>
                  <th className="pb-2">{t('dispatch.status')}</th>
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
                        {isFinal ? t('dispatch.endpoint') : `${t('dispatch.via')}${index + 1}`}
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
                        {doItem.order?.status === 'PENDING' ? t('dispatch.statusPending') :
                         doItem.order?.status === 'APPROVED' ? t('dispatch.statusApproved') :
                         doItem.order?.status === 'PICKING' ? t('dispatch.statusPicking') :
                         doItem.order?.status === 'OUTBOUND_REVIEW' ? t('dispatch.statusOutboundReview') :
                         doItem.order?.status === 'DISPATCHING' ? t('dispatch.statusDispatching') :
                         doItem.order?.status === 'DISPATCHED' ? t('dispatch.statusDispatched') :
                         doItem.order?.status === 'IN_TRANSIT' ? t('dispatch.statusInTransit') :
                         doItem.order?.status === 'DELIVERED' ? t('dispatch.statusDelivered') :
                         doItem.order?.status === 'CANCELLED' ? t('dispatch.statusCancelled') :
                         doItem.order?.status || '-'}
                      </span>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-2">
            {dispatch.orders?.map((doItem: any, index: number) => {
              const totalDests = dispatch.plannedRoute?.destinations?.length || dispatch.orders?.length || 0;
              const isFinal = index === totalDests - 1;
              return (
                <div key={doItem.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-primary-600">{doItem.order?.orderNo}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${isFinal ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {isFinal ? t('dispatch.endpoint') : `${t('dispatch.via')}${index + 1}`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>{doItem.order?.receiver}</span>
                      <span>{formatPhone(doItem.order?.phone || '')}</span>
                    </div>
                    <div className="text-gray-400 truncate">{formatAddress(doItem.order?.province, doItem.order?.city, doItem.order?.address)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {canWrite && dispatch.status === 'PENDING' && (
        <div className="fixed bottom-14 left-0 right-0 bg-white border-t p-3 sm:hidden z-50">
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('IN_TRANSIT')}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg"
            >
              {t('dispatch.startVehicle')}
            </button>
            <button
              onClick={() => handleStatusChange('CANCELLED')}
              className="flex-1 py-2.5 border border-red-500 text-red-500 rounded-lg"
            >
              {t('dispatch.cancelDelivery')}
            </button>
          </div>
        </div>
      )}
      {canWrite && dispatch.status === 'IN_TRANSIT' && (
        <div className="fixed bottom-14 left-0 right-0 bg-white border-t p-3 sm:hidden z-50">
          <button
            onClick={() => handleStatusChange('COMPLETED')}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg"
          >
            完成配送
          </button>
        </div>
      )}
    </div>
  );
}
