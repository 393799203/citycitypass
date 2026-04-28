import { useState, useEffect } from 'react';
import { X, ShoppingCart as CartIcon, Trash2, Package, Gift } from 'lucide-react';
import { shopApi, getSessionId, getShopUser } from '@/api/shop';
import { toast } from 'react-toastify';

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
    brand?: { name: string };
  };
  bundle?: {
    id: string;
    name: string;
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

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  onCartUpdate: () => void;
}

export default function ShoppingCart({ isOpen, onClose, onCheckout, onCartUpdate }: ShoppingCartProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [discountRate, setDiscountRate] = useState<number | null>(null);

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
            setDiscountRate(userRes.data.data.discountRate);
          }
        } catch (error) {
          console.error('Failed to fetch user info:', error);
        }
      }
      
      const res = await shopApi.getCart(sessionId, user?.userId);
      if (res.data.success) {
        console.log('购物车数据:', res.data.data);
        setCartItems(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      toast.error('加载购物车失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const sessionId = getSessionId();
      await shopApi.removeFromCart(itemId, sessionId);
      toast.success('已从购物车移除');
      fetchCart();
      onCartUpdate();
    } catch (error) {
      console.error('Failed to remove item:', error);
      toast.error('移除失败');
    }
  };

  const getTotalAmount = () => {
    return cartItems.reduce((sum, item) => {
      return sum + (item.displayInfo ? Number(item.displayInfo.price) * item.quantity : 0);
    }, 0);
  };

  const getDiscountAmount = () => {
    if (!discountRate || discountRate >= 1) return 0;
    return getTotalAmount() * (1 - discountRate);
  };

  const getFinalAmount = () => {
    return getTotalAmount() - getDiscountAmount();
  };

  const getTotalQuantity = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:rounded-lg sm:max-w-md max-h-[85vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CartIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">购物车</h2>
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {cartItems.length} 种
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CartIcon className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg">购物车是空的</p>
              <p className="text-sm mt-2">快去挑选心仪的商品吧</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => {
                const display = item.displayInfo;
                const isOutOfStock = !display || display.availableStock === 0;

                return (
                  <div
                    key={item.id}
                    className={`bg-gray-50 rounded-lg p-3 ${isOutOfStock ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-800 line-clamp-1">
                              {display?.name || '未知商品'}
                            </h3>
                            {display && (
                              <p className="text-sm text-gray-500 mt-0.5">
                                {display.spec} / {display.packaging}
                              </p>
                            )}
                            {item.product?.brand?.name && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                {item.product.brand.name}
                              </span>
                            )}
                            {item.bundleId && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                套装
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="text-blue-600 font-bold">
                            ¥{display ? Number(display.price).toFixed(2) : '0.00'}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {isOutOfStock ? '缺货' : `库存 ${display?.availableStock || 0}`}
                            </span>
                            <div className="px-2 py-1 bg-white border rounded text-sm font-medium">
                              × {item.quantity}
                            </div>
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
          <div className="sticky bottom-0 bg-white border-t px-4 py-3">
            {discountRate && discountRate < 1 && (
              <div className="flex items-center gap-2 mb-3 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                <Gift className="w-4 h-4" />
                <span>企业客户折扣: {(discountRate * 100).toFixed(0)}折</span>
                <span className="text-gray-500 line-through ml-auto">¥{getTotalAmount().toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">
                共 {getTotalQuantity()} 件商品
              </div>
              <div className="flex items-center gap-2">
                {discountRate && discountRate < 1 ? (
                  <>
                    <span className="text-sm text-gray-600">折后：</span>
                    <span className="text-2xl font-bold text-green-600">
                      ¥{getFinalAmount().toFixed(2)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-600">合计：</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ¥{getTotalAmount().toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onCheckout}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                discountRate && discountRate < 1
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              去结算
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
