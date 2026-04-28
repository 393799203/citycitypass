import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Minus, Plus, Package, Layers, ShoppingCart as CartIcon, Gift } from 'lucide-react';
import { shopApi, getSessionId, getShopUser } from '@/api/shop';
import { toast } from 'react-toastify';
import Checkout from './Checkout';
import Payment from './Payment';

interface CartItem {
  id: string;
  productId?: string;
  bundleId?: string;
  skuId?: string;
  quantity: number;
  ownerId?: string;
  warehouseId?: string;
  product?: {
    id: string;
    name: string;
    imageUrl?: string;
    brand?: { name: string };
  };
  bundle?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  sku?: {
    id: string;
    packaging: string;
    spec: string;
    price: string;
    stocks: Array<{ availableQuantity: number }>;
  };
  displayInfo: {
    name: string;
    spec: string;
    packaging: string;
    price: string;
    availableStock: number;
  };
}

export default function ShoppingCartPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ownerId = searchParams.get('ownerId');

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [discountRate, setDiscountRate] = useState<number | null>(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const sessionId = getSessionId();
      const user = getShopUser();
      
      if (user?.userId) {
        try {
          const userRes = await shopApi.getUserInfo();
          if (userRes.data.success) {
            setDiscountRate(userRes.data.data.discountRate);
          }
        } catch (error) {
          console.error('Failed to fetch user info:', error);
        }
      }
      
      const res = await shopApi.getCart(sessionId, user?.userId);
      if (res.data.success) {
        setCartItems(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      toast.error('加载购物车失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      const sessionId = getSessionId();
      await shopApi.updateCartItem(itemId, { quantity: newQuantity }, sessionId);
      fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新失败');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const sessionId = getSessionId();
      await shopApi.removeFromCart(itemId, sessionId);
      toast.success('已从购物车移除');
      fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '移除失败');
    }
  };

  const handleBack = () => {
    if (ownerId) {
      navigate(`/shop?ownerId=${ownerId}`);
    } else {
      navigate('/shop');
    }
  };

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = (newOrderNo: string) => {
    setOrderNo(newOrderNo);
    setShowCheckout(false);
    setShowPayment(true);
    fetchCart();
  };

  const handleClosePayment = () => {
    setShowPayment(false);
    setOrderNo(null);
    navigate(`/shop?ownerId=${ownerId || ''}`);
  };

  const handleGoToOrder = (orderNo: string) => {
    navigate(`/shop/order/${orderNo}?ownerId=${ownerId || ''}`);
  };

  const getItemPrice = (item: CartItem): number => {
    return Number(item.displayInfo.price) * item.quantity;
  };

  const getAvailableStock = (item: CartItem): number => {
    return item.displayInfo.availableStock;
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + getItemPrice(item), 0);
  
  const getDiscountAmount = () => {
    if (!discountRate || discountRate >= 1) return 0;
    return totalPrice * (1 - discountRate);
  };
  
  const getFinalAmount = () => {
    return totalPrice - getDiscountAmount();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Checkout
          isOpen={true}
          onSuccess={handleCheckoutSuccess}
          onClose={() => setShowCheckout(false)}
        />
      </div>
    );
  }

  if (showPayment && orderNo) {
    return <Payment orderNo={orderNo} onClose={handleClosePayment} onGoToOrder={handleGoToOrder} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b shadow-sm z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <CartIcon className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-800">购物车</h1>
            <span className="text-sm text-gray-500">({cartItems.length}件商品)</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-32">
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <CartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">购物车是空的</p>
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg"
            >
              去购物
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item) => {
              const availableStock = getAvailableStock(item);
              const isOutOfStock = availableStock === 0;
              const isOverStock = item.quantity > availableStock;
              const isBundle = !!item.bundleId;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm p-4 ${isOutOfStock || isOverStock ? 'border-2 border-red-200' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                      {isBundle ? (
                        item.bundle?.imageUrl ? (
                          <img 
                            src={item.bundle.imageUrl} 
                            alt={item.displayInfo.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Layers className="w-8 h-8 text-purple-400" />
                        )
                      ) : (
                        item.product?.imageUrl ? (
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.displayInfo.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-blue-400" />
                        )
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-gray-800 truncate">
                            {item.displayInfo.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {item.displayInfo.spec} / {item.displayInfo.packaging}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border rounded-lg">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="p-1.5 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-3 text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= availableStock}
                            className="p-1.5 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">
                            ¥{getItemPrice(item).toFixed(2)}
                          </div>
                          {isOutOfStock && (
                            <div className="text-xs text-red-500">已售罄</div>
                          )}
                          {isOverStock && !isOutOfStock && (
                            <div className="text-xs text-red-500">库存不足 (仅剩{availableStock})</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
          <div className="max-w-4xl mx-auto px-4 py-3">
            {discountRate && discountRate < 1 && (
              <div className="flex items-center gap-2 mb-3 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                <Gift className="w-4 h-4" />
                <span>企业客户折扣: {(discountRate * 100).toFixed(0)}折</span>
                <span className="text-gray-500 line-through ml-auto">¥{totalPrice.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">合计</span>
              {discountRate && discountRate < 1 ? (
                <span className="text-2xl font-bold text-green-600">¥{getFinalAmount().toFixed(2)}</span>
              ) : (
                <span className="text-2xl font-bold text-blue-600">¥{totalPrice.toFixed(2)}</span>
              )}
            </div>
            <button
              onClick={handleCheckout}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                discountRate && discountRate < 1
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              去结算
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
