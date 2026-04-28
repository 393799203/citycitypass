import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Phone, MapPin, CreditCard, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';
import { shopApi } from '@/api/shop';
import { toast } from 'react-toastify';

interface OrderItem {
  id: string;
  productName: string;
  packaging: string;
  spec: string;
  price: string;
  quantity: number;
  subtotal: string;
}

interface Order {
  id: string;
  orderNo: string;
  receiver: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  totalAmount: string;
  status: string;
  deliveryType: string;
  items: OrderItem[];
  owner?: { name: string };
  warehouse?: { name: string };
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: '待支付', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  PAID: { label: '已支付', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
  PROCESSING: { label: '处理中', color: 'text-purple-600 bg-purple-50', icon: Package },
  SHIPPED: { label: '已发货', color: 'text-indigo-600 bg-indigo-50', icon: Truck },
  DELIVERED: { label: '已送达', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  CANCELLED: { label: '已取消', color: 'text-red-600 bg-red-50', icon: XCircle },
};

export default function OrderDetail() {
  const { orderNo } = useParams<{ orderNo: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ownerId = searchParams.get('ownerId');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderNo) {
      fetchOrder();
    }
  }, [orderNo]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await shopApi.getOrder(orderNo!);
      if (res.data.success) {
        setOrder(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error('加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (ownerId) {
      navigate(`/shop?ownerId=${ownerId}`);
    } else {
      navigate('/shop');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载订单信息...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 text-lg font-medium">订单不存在</p>
          <button
            onClick={handleBack}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回商品列表
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[order.status] || statusConfig.PENDING;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">订单详情</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-20">
        <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
          <div className={`p-4 ${statusInfo.color}`}>
            <div className="flex items-center gap-3">
              <StatusIcon className="w-6 h-6" />
              <div>
                <div className="font-bold text-lg">{statusInfo.label}</div>
                <div className="text-sm opacity-80">订单编号: {order.orderNo}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-800">商品信息</h2>
            </div>
          </div>
          
          <div className="p-4">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{item.productName}</div>
                    <div className="text-sm text-gray-500">{item.spec} / {item.packaging}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">×{item.quantity}</div>
                    <div className="font-medium text-blue-600">¥{Number(item.subtotal).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">订单总额</span>
                <span className="text-2xl font-bold text-blue-600">
                  ¥{Number(order.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-800">收货信息</h2>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-gray-600 text-sm min-w-[60px]">收货人</span>
              <span className="text-gray-800">{order.receiver}</span>
            </div>
            
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="text-gray-800">{order.phone}</span>
            </div>
            
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="text-gray-800">
                {order.province} {order.city} {order.address}
              </span>
            </div>

            {order.deliveryType && (
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-gray-800">
                  {order.deliveryType === 'PICKUP' ? '到店自提' : '快递配送'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-800">订单信息</h2>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">订单编号</span>
              <span className="text-gray-800">{order.orderNo}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">创建时间</span>
              <span className="text-gray-800">
                {new Date(order.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>

            {order.owner && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">商家</span>
                <span className="text-gray-800">{order.owner.name}</span>
              </div>
            )}

            {order.warehouse && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">仓库</span>
                <span className="text-gray-800">{order.warehouse.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
