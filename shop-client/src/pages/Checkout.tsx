import { useState, useEffect } from 'react';
import { X, MapPin, User, Package, Loader2 } from 'lucide-react';
import { shopApi, getSessionId, getShopUser } from '@/api/shop';
import { toast } from 'react-toastify';
import PhoneInput from '@/components/PhoneInput';
import RegionPicker from '@/components/RegionPicker';

interface CartItem {
  id: string;
  productId?: string;
  bundleId?: string;
  skuId?: string;
  ownerId?: string;
  warehouseId?: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    owner?: { id: string; name: string };
  };
  bundle?: {
    id: string;
    name: string;
    owner?: { id: string; name: string };
  };
  displayInfo: {
    name: string;
    spec: string;
    packaging: string;
    price: string;
    availableStock: number;
  };
}

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderNo: string) => void;
}

export default function Checkout({ isOpen, onClose, onSuccess }: CheckoutProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [discountRate, setDiscountRate] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [formData, setFormData] = useState({
    receiver: '',
    phone: '',
    province: '',
    city: '',
    address: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchCart();
    }
  }, [isOpen]);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const sessionId = getSessionId();
      const user = getShopUser();
      
      if (user?.userId) {
        try {
          const userRes = await shopApi.getUserInfo();
          if (userRes.data.success) {
            setCurrentUser(userRes.data.data);
            setDiscountRate(userRes.data.data.discountRate);
            const userAddresses = userRes.data.data.addresses || [];
            setAddresses(userAddresses);
            
            // 如果有默认地址或第一个地址，自动填充
            const defaultAddr = userAddresses.find((a: any) => a.isDefault) || userAddresses[0];
            if (defaultAddr) {
              setSelectedAddressId(defaultAddr.id);
              setFormData({
                receiver: defaultAddr.receiver || '',
                phone: defaultAddr.phone || '',
                province: defaultAddr.province || '',
                city: defaultAddr.city || '',
                address: defaultAddr.address || '',
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch user info:', error);
        }
      }
      
      const res = await shopApi.getCart(sessionId, user?.userId);
      if (res.data.success) {
        const items = res.data.data || [];
        const validItems = items.filter((item: CartItem) => item.displayInfo.availableStock > 0);
        setCartItems(validItems);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      toast.error('加载购物车失败');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    return cartItems.reduce((sum, item) => {
      return sum + Number(item.displayInfo.price) * item.quantity;
    }, 0);
  };

  const getDiscountAmount = () => {
    if (!discountRate || discountRate >= 1) return 0;
    return getTotalAmount() * (1 - discountRate);
  };

  const getFinalAmount = () => {
    return getTotalAmount() - getDiscountAmount();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.receiver.trim()) {
      toast.warning('请输入收货人姓名');
      return;
    }
    if (!formData.phone.trim() || !/^1[3-9]\d{9}$/.test(formData.phone)) {
      toast.warning('请输入正确的手机号码');
      return;
    }
    if (!formData.province.trim()) {
      toast.warning('请选择省份');
      return;
    }
    if (!formData.city.trim()) {
      toast.warning('请选择城市');
      return;
    }
    if (!formData.address.trim()) {
      toast.warning('请输入详细地址');
      return;
    }

    if (cartItems.length === 0) {
      toast.warning('购物车为空');
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = getSessionId();
      const firstItem = cartItems[0];

      const ownerId = firstItem.ownerId;
      const warehouseId = firstItem.warehouseId;

      if (!ownerId) {
        toast.error('商品缺少主体信息');
        setSubmitting(false);
        return;
      }

      if (!warehouseId) {
        toast.error('商品缺少仓库信息');
        setSubmitting(false);
        return;
      }

      const orderData: any = {
        sessionId,
        shopUserId: currentUser?.id,
        ownerId,
        warehouseId,
        receiver: formData.receiver,
        phone: formData.phone,
        deliveryType: 'DELIVERY',
        province: formData.province,
        city: formData.city,
        address: formData.address,
        items: cartItems.map(item => {
          const orderItem: any = { quantity: item.quantity };
          if (item.skuId) {
            orderItem.skuId = item.skuId;
          } else if (item.bundleId) {
            orderItem.bundleId = item.bundleId;
          }
          return orderItem;
        }),
      };

      const res = await shopApi.createOrder(orderData);
      if (res.data.success) {
        await shopApi.clearCart(sessionId);
        toast.success('订单创建成功');
        onClose();
        onSuccess(res.data.data.orderNo);
      }
    } catch (error: any) {
      console.error('Failed to create order:', error);
      toast.error(error.response?.data?.message || '创建订单失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:rounded-lg sm:max-w-lg max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">填写订单信息</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <h3 className="text-sm font-medium text-blue-800 mb-3">收货人信息</h3>
                
                {addresses.length > 0 && (
                  <div className="mb-3">
                    <label className="block text-xs text-gray-600 mb-1">选择地址</label>
                    <select
                      value={selectedAddressId}
                      onChange={(e) => {
                        const addr = addresses.find((a: any) => a.id === e.target.value);
                        setSelectedAddressId(e.target.value);
                        if (addr) {
                          setFormData({
                            receiver: addr.receiver || '',
                            phone: addr.phone || '',
                            province: addr.province || '',
                            city: addr.city || '',
                            address: addr.address || '',
                          });
                        } else {
                          setFormData({
                            receiver: '',
                            phone: '',
                            province: '',
                            city: '',
                            address: '',
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">手动填写</option>
                      {addresses.map((addr: any) => (
                        <option key={addr.id} value={addr.id}>
                          {addr.receiver} - {addr.province}{addr.city}{addr.address} {addr.isDefault ? '[默认]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">
                        <User className="w-3 h-3 inline mr-1" />
                        收货人
                      </label>
                      <input
                        type="text"
                        value={formData.receiver}
                        onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                        placeholder="请输入收货人姓名"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">手机号</label>
                      <PhoneInput
                        value={formData.phone}
                        onChange={(value) => setFormData({ ...formData, phone: value })}
                        placeholder="请输入手机号"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      收货地址
                    </label>
                    <div className="mb-2">
                      <RegionPicker
                        value={{ province: formData.province, city: formData.city }}
                        onChange={({ province, city }) => setFormData({ ...formData, province: province || '', city: city || '' })}
                        placeholder="请选择省/市"
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="详细地址（街道、门牌号等）"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-800 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  商品清单 ({cartItems.length} 种)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cartItems.map((item) => {
                    const info = item.displayInfo;
                    return (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">{info.name}</div>
                          <div className="text-xs text-gray-500">{info.spec} / {info.packaging}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-600">
                            ¥{(Number(info.price) * item.quantity).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">× {item.quantity}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-3">
                {discountRate && discountRate < 1 && (
                  <div className="flex items-center justify-between mb-3 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                    <span>企业客户折扣: {(discountRate * 100).toFixed(0)}折</span>
                    <span className="text-gray-500 line-through">原价 ¥{getTotalAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">应付金额</span>
                  {discountRate && discountRate < 1 ? (
                    <span className="text-2xl font-bold text-green-600">
                      ¥{getFinalAmount().toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-2xl font-bold text-blue-600">
                      ¥{getTotalAmount().toFixed(2)}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={submitting || cartItems.length === 0}
                  className={`w-full py-3 rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    discountRate && discountRate < 1
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    '提交订单'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
