import { useState, useEffect } from 'react';
import { X, Package, Minus, Plus, ShoppingCart, Layers } from 'lucide-react';
import { shopApi, getSessionId } from '@/api/shop';
import { toast } from 'react-toastify';

interface Product {
  id: string;
  name: string;
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

interface ProductDetailProps {
  productId: string;
  onClose: () => void;
  onCartUpdate: () => void;
}

export default function ProductDetail({ productId, onClose, onCartUpdate }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await shopApi.getProduct(productId);
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
      toast.success('已添加到购物车');
      onCartUpdate();
      onClose();
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      toast.error(error.response?.data?.message || '添加失败');
    } finally {
      setAddingToCart(false);
    }
  };

  const selectedSku = product?.type === 'PRODUCT' ? product.skus?.find(s => s.id === selectedSkuId) : null;
  const isBundle = product?.type === 'BUNDLE';

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p>商品不存在</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isBundle ? (
              <Layers className="w-5 h-5 text-purple-600" />
            ) : (
              <Package className="w-5 h-5 text-blue-600" />
            )}
            <h2 className="text-lg font-bold text-gray-800">{product.name}</h2>
            {isBundle && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 border border-purple-300">
                套装
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
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
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-800">{product.spec} / {product.packaging}</div>
                      <div className="text-xs text-gray-500 mt-1">库存 {product.availableStock}</div>
                    </div>
                    <div className="text-xl font-bold text-blue-600">
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

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
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
                <div className="text-2xl font-bold text-blue-600">
                  ¥{isBundle 
                    ? (Number(product.price || 0) * quantity).toFixed(2) 
                    : selectedSku 
                      ? (Number(selectedSku.price) * quantity).toFixed(2) 
                      : '0.00'}
                </div>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={(!isBundle && !selectedSku) || addingToCart}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {addingToCart ? '添加中...' : '加入购物车'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
