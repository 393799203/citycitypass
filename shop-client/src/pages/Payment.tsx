import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Package, Phone, MapPin, CreditCard, Loader2, FileText, Home } from 'lucide-react';
import { shopApi } from '@/api/shop';
import { toast } from 'react-toastify';

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
  items: Array<{
    id: string;
    productName: string;
    packaging: string;
    spec: string;
    price: string;
    quantity: number;
    subtotal: string;
  }>;
  owner?: { name: string };
  warehouse?: { name: string };
}

interface PaymentProps {
  orderNo: string;
  onClose: () => void;
  onGoToOrder?: (orderNo: string) => void;
}

export default function Payment({ orderNo, onClose, onGoToOrder }: PaymentProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  useEffect(() => {
    fetchOrder();
  }, [orderNo]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await shopApi.getOrder(orderNo);
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

  const handlePayment = async () => {
    setPaying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = Math.random() > 0.3;
      
      if (success) {
        setPaymentStatus('success');
        toast.success('支付成功');
      } else {
        setPaymentStatus('failed');
        toast.error('支付失败，请重试');
      }
    } catch (error) {
      setPaymentStatus('failed');
      toast.error('支付失败');
    } finally {
      setPaying(false);
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
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">支付成功</h2>
          <p className="text-gray-600 mb-6">订单已提交，我们会尽快为您发货</p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">订单编号</span>
              <span className="font-medium text-gray-800">{order.orderNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">支付金额</span>
              <span className="font-bold text-blue-600">¥{Number(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {onGoToOrder && (
              <button
                onClick={() => onGoToOrder(order.orderNo)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                查看订单详情
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              返回商品列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-800">订单信息</h2>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">订单编号</span>
              <span className="font-medium text-gray-800">{order.orderNo}</span>
            </div>
            
            <div className="flex items-start gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-600">{order.receiver}</span>
                <span className="text-gray-400 mx-2">|</span>
                <span className="text-gray-600">{order.phone}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="text-gray-600">
                {order.province} {order.city} {order.address}
              </span>
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="text-sm font-medium text-gray-800 mb-2">商品清单</div>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <span className="text-gray-800">{item.productName}</span>
                      <span className="text-gray-500 ml-2">({item.spec}/{item.packaging})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-600">×{item.quantity}</span>
                      <span className="ml-2 font-medium text-blue-600">¥{Number(item.subtotal).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-800">选择支付方式</h2>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-3">
              <button
                onClick={() => setPaymentMethod('wechat')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'wechat'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">微信</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-800">微信支付</div>
                    <div className="text-xs text-gray-500">推荐使用微信支付</div>
                  </div>
                  {paymentMethod === 'wechat' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('alipay')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'alipay'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">支付宝</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-800">支付宝</div>
                    <div className="text-xs text-gray-500">使用支付宝快捷支付</div>
                  </div>
                  {paymentMethod === 'alipay' && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">应付金额</span>
            <span className="text-3xl font-bold text-blue-600">
              ¥{Number(order.totalAmount).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handlePayment}
            disabled={paying}
            className={`w-full py-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
              paymentMethod === 'wechat'
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-blue-500 hover:bg-blue-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {paying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                支付中...
              </>
            ) : (
              `立即支付 ¥${Number(order.totalAmount).toFixed(2)}`
            )}
          </button>

          {paymentStatus === 'failed' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">
                支付失败，请检查网络后重试
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
