import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Package, Minus, Plus, ShoppingCart, Layers, ArrowLeft, CreditCard } from 'lucide-react';
import { shopApi, getSessionId } from '@/api/shop';
import { toast } from 'react-toastify';

interface FlyingItem {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface Product {
  id: string;
  name: string;
  imageUrl?: string;
  type: 'PRODUCT' | 'BUNDLE';
  brand?: { id: string; name: string };
  subCategory?: {
    id: string;
    name: string;
    category?: { id: string; name: string };
  };
  skus?: Array<{
    id: string;
    skuCode?: string;
    packaging: string;
    spec: string;
    price: string;
    availableStock: number;
  }>;
  availableStock?: number;
  price?: string;
  packaging?: string;
  spec?: string;
  owner?: { id: string; name: string };
  items?: Array<{
    sku: {
      id: string;
      product: { name: string };
      spec: string;
      packaging: string;
    };
    quantity: number;
  }>;
}

export default function ProductDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get('productId');
  const ownerId = searchParams.get('ownerId');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const addToCartBtnRef = useRef<HTMLButtonElement>(null);
  const floatingCartRef = useRef<HTMLDivElement>(null);
  const flyingIdRef = useRef(0);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
    updateCartCount();
  }, [productId]);

  const updateCartCount = async () => {
    try {
      const sessionId = getSessionId();
      const res = await shopApi.getCart(sessionId);
      if (res.data.success) {
        const items = res.data.data || [];
        setCartCount(items.length);
      }
    } catch (error) {
      console.error('Failed to update cart count:', error);
    }
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await shopApi.getProduct(productId!);
      if (res.data.success) {
        setProduct(res.data.data);
        if (res.data.data.type === 'PRODUCT' && res.data.data.skus && res.data.data.skus.length > 0) {
          const availableSku = res.data.data.skus.find((s: any) => s.availableStock > 0);
          if (availableSku) {
            setSelectedSkuId(availableSku.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error('加载商品详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    const isBundle = product.type === 'BUNDLE';

    if (isBundle) {
      if (quantity > (product.availableStock || 0)) {
        toast.warning('库存不足');
        return;
      }
    } else {
      if (!selectedSkuId) {
        toast.warning('请选择商品规格');
        return;
      }

      const selectedSku = product.skus?.find(s => s.id === selectedSkuId);
      if (!selectedSku) {
        toast.error('商品规格不存在');
        return;
      }

      if (quantity > selectedSku.availableStock) {
        toast.warning('库存不足');
        return;
      }
    }

    setAddingToCart(true);
    try {
      const sessionId = getSessionId();
      if (isBundle) {
        await shopApi.addToCart({
          sessionId,
          bundleId: product.id,
          quantity,
        });
      } else {
        await shopApi.addToCart({
          sessionId,
          productId: product.id,
          skuId: selectedSkuId,
          quantity,
        });
      }

      if (addToCartBtnRef.current && floatingCartRef.current) {
        const btnRect = addToCartBtnRef.current.getBoundingClientRect();
        const cartRect = floatingCartRef.current.getBoundingClientRect();
        const startX = btnRect.left + btnRect.width / 2;
        const startY = btnRect.top + btnRect.height / 2;
        const endX = cartRect.left + cartRect.width / 2;
        const endY = cartRect.top + cartRect.height / 2;

        const id = flyingIdRef.current++;
        setFlyingItems(prev => [...prev, { id, startX, startY, endX, endY }]);
        setTimeout(() => {
          setFlyingItems(prev => prev.filter(item => item.id !== id));
        }, 800);
      }

      updateCartCount();
      toast.success('已添加到购物车');
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      toast.error(error.response?.data?.message || '添加失败');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;

    const isBundle = product.type === 'BUNDLE';

    if (isBundle) {
      if (quantity > (product.availableStock || 0)) {
        toast.warning('库存不足');
        return;
      }
    } else {
      if (!selectedSkuId) {
        toast.warning('请选择商品规格');
        return;
      }

      const selectedSku = product.skus?.find(s => s.id === selectedSkuId);
      if (!selectedSku) {
        toast.error('商品规格不存在');
        return;
      }

      if (quantity > selectedSku.availableStock) {
        toast.warning('库存不足');
        return;
      }
    }

    setBuyingNow(true);
    try {
      const sessionId = getSessionId();
      
      if (isBundle) {
        await shopApi.addToCart({
          sessionId,
          bundleId: product.id,
          quantity,
        });
      } else {
        await shopApi.addToCart({
          sessionId,
          productId: product.id,
          skuId: selectedSkuId,
          quantity,
        });
      }

      navigate(`/shop/cart?ownerId=${ownerId || product.owner?.id || ''}`);
    } catch (error: any) {
      console.error('Failed to buy now:', error);
      toast.error(error.response?.data?.message || '操作失败');
    } finally {
      setBuyingNow(false);
    }
  };

  const handleBack = () => {
    if (ownerId) {
      navigate(`/shop?ownerId=${ownerId}`);
    } else {
      navigate('/shop');
    }
  };

  const selectedSku = product?.type === 'PRODUCT' ? product.skus?.find(s => s.id === selectedSkuId) : null;
  const isBundle = product?.type === 'BUNDLE';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Package className="w-20 h-20 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">商品不存在</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          返回店铺
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {flyingItems.map(item => (
        <div
          key={item.id}
          className="fixed z-[100] pointer-events-none"
          style={{
            left: item.startX,
            top: item.startY,
            animation: 'flyToCart 0.8s ease-in-out forwards',
            '--start-x': `${item.startX}px`,
            '--start-y': `${item.startY}px`,
            '--end-x': `${item.endX}px`,
            '--end-y': `${item.endY}px`,
          } as React.CSSProperties}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${isBundle ? 'bg-purple-500' : 'bg-blue-500'}`}>
            {isBundle ? (
              <Layers className="w-5 h-5 text-white" />
            ) : (
              <Package className="w-5 h-5 text-white" />
            )}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes flyToCart {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(calc(var(--end-x) - var(--start-x)) * 0.5, calc(var(--end-y) - var(--start-y)) * 0.5 - 50px) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translate(calc(var(--end-x) - var(--start-x)), calc(var(--end-y) - var(--start-y))) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>

      <div
        ref={floatingCartRef}
        onClick={() => navigate(`/shop/cart?ownerId=${ownerId || ''}`)}
        className="fixed right-4 bottom-32 z-50 cursor-pointer group"
      >
        <div className="relative">
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg group-hover:bg-blue-700 transition-colors">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </div>
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          购物车
        </div>
      </div>

      <div className="sticky top-0 bg-white border-b shadow-sm z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isBundle ? (
              <Layers className="w-5 h-5 text-purple-600 shrink-0" />
            ) : (
              <Package className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <h1 className="text-lg font-bold text-gray-800 truncate">{product.name}</h1>
            {isBundle && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 border border-purple-300 shrink-0">
                套装
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-32">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : isBundle ? (
              <div className="text-center">
                <Layers className="w-24 h-24 text-purple-400 mx-auto mb-2" />
                <span className="text-purple-600 font-medium">套装商品</span>
              </div>
            ) : (
              <div className="text-center">
                <Package className="w-24 h-24 text-blue-400 mx-auto mb-2" />
                <span className="text-blue-600 font-medium">{product.name}</span>
              </div>
            )}
          </div>
          <div className="p-4 border-b">
            <div className="flex flex-wrap items-center gap-2">
              {product.brand?.name && (
                <span className="px-2 py-1 text-xs rounded-full border border-blue-300 bg-blue-100 text-blue-700">
                  {product.brand.name}
                </span>
              )}
              {product.subCategory?.category?.name && (
                <span className="px-2 py-1 text-xs rounded-full border border-gray-300 bg-gray-100 text-gray-700">
                  {product.subCategory.category.name}
                </span>
              )}
            </div>
          </div>

          <div className="p-4">
            {isBundle ? (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">套装内容</label>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {product.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.sku.product.name} ({item.sku.spec}/{item.sku.packaging})</span>
                        <span className="text-gray-500">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">套装规格</label>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-800">{product.spec} / {product.packaging}</div>
                        <div className="text-sm text-gray-500 mt-1">库存 {product.availableStock}</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        ¥{Number(product.price || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">购买数量</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border rounded-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 hover:bg-gray-100 transition-colors"
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const max = product.availableStock || 0;
                          setQuantity(Math.min(Math.max(val, 1), max));
                        }}
                        className="w-16 text-center border-x py-2"
                        min="1"
                        max={product.availableStock}
                      />
                      <button
                        onClick={() => setQuantity(Math.min(quantity + 1, product.availableStock || 0))}
                        className="p-2 hover:bg-gray-100 transition-colors"
                        disabled={quantity >= (product.availableStock || 0)}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">
                      最大可购买 {product.availableStock} 件
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择规格</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.skus?.map((sku) => {
                      const isSelected = selectedSkuId === sku.id;
                      const isOutOfStock = sku.availableStock === 0;

                      return (
                        <button
                          key={sku.id}
                          onClick={() => !isOutOfStock && setSelectedSkuId(sku.id)}
                          disabled={isOutOfStock}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                              : isOutOfStock
                              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-800">
                            {sku.spec} / {sku.packaging}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-blue-600 font-bold">¥{Number(sku.price).toFixed(2)}</span>
                            <span className={`text-xs ${isOutOfStock ? 'text-red-500' : 'text-gray-500'}`}>
                              {isOutOfStock ? '缺货' : `库存 ${sku.availableStock}`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedSku && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">购买数量</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-lg">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="p-2 hover:bg-gray-100 transition-colors"
                          disabled={quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            const max = selectedSku.availableStock;
                            setQuantity(Math.min(Math.max(val, 1), max));
                          }}
                          className="w-16 text-center border-x py-2"
                          min="1"
                          max={selectedSku.availableStock}
                        />
                        <button
                          onClick={() => setQuantity(Math.min(quantity + 1, selectedSku.availableStock))}
                          className="p-2 hover:bg-gray-100 transition-colors"
                          disabled={quantity >= selectedSku.availableStock}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-sm text-gray-500">
                        最大可购买 {selectedSku.availableStock} 件
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm text-gray-600">已选：</span>
              <span className="font-medium text-gray-800">
                {isBundle 
                  ? `${product.spec} / ${product.packaging}` 
                  : selectedSku 
                    ? `${selectedSku.spec} / ${selectedSku.packaging}` 
                    : '未选择'}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">小计</div>
              <div className="text-xl font-bold text-blue-600">
                ¥{isBundle 
                  ? (Number(product.price || 0) * quantity).toFixed(2) 
                  : selectedSku 
                    ? (Number(selectedSku.price) * quantity).toFixed(2) 
                    : '0.00'}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              ref={addToCartBtnRef}
              onClick={handleAddToCart}
              disabled={(!isBundle && !selectedSku) || addingToCart}
              className="flex-1 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {addingToCart ? '添加中...' : '加入购物车'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={(!isBundle && !selectedSku) || buyingNow}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              {buyingNow ? '处理中...' : '立即购买'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
