import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Search, Layers } from 'lucide-react';
import { shopApi } from '@/api/shop';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

interface ProductListProps {
  ownerId: string | null;
  onViewCart: () => void;
  cartCount: number;
}

export default function ProductList({ ownerId, onViewCart, cartCount }: ProductListProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [ownerId]);

  const fetchProducts = async (search?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.name = search;
      if (ownerId) params.ownerId = ownerId;
      const res = await shopApi.getProducts(Object.keys(params).length > 0 ? params : undefined);
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('加载商品失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchProducts(searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectProduct = (productId: string) => {
    navigate(`/shop/product?productId=${productId}&ownerId=${ownerId || ''}`);
  };

  const getCategoryColor = (categoryName: string) => {
    const colors = [
      { bg: '#fce7f3', text: '#db2777' },
      { bg: '#ffedd5', text: '#ea580c' },
      { bg: '#fef3c7', text: '#d97706' },
      { bg: '#ecfccb', text: '#65a30d' },
      { bg: '#ccfbf1', text: '#0d9488' },
      { bg: '#cffafe', text: '#0891b2' },
      { bg: '#e0e7ff', text: '#4f46e5' },
      { bg: '#ede9fe', text: '#7c3aed' },
    ];
    const hash = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const floatingCartRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        ref={floatingCartRef}
        onClick={onViewCart}
        className="fixed right-4 bottom-20 z-50 cursor-pointer group"
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

      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-800">商品列表</h1>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="搜索商品..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">暂无商品</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {products.map((product) => {
              const isBundle = product.type === 'BUNDLE';
              
              let totalStock = 0;
              let minPrice = 0;
              let maxPrice = 0;
              let skuCount = 0;

              if (isBundle) {
                totalStock = product.availableStock || 0;
                const price = Number(product.price || 0);
                minPrice = price;
                maxPrice = price;
                skuCount = product.items?.length || 0;
              } else {
                totalStock = product.skus?.reduce((sum, sku) => sum + sku.availableStock, 0) || 0;
                minPrice = product.skus && product.skus.length > 0
                  ? Math.min(...product.skus.map(s => Number(s.price)))
                  : 0;
                maxPrice = product.skus && product.skus.length > 0
                  ? Math.max(...product.skus.map(s => Number(s.price)))
                  : 0;
                skuCount = product.skus?.length || 0;
              }

              return (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product.id)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer flex"
                >
                  <div className="w-[120px] h-[120px] flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : isBundle ? (
                      <Layers className="w-12 h-12 text-purple-400" />
                    ) : (
                      <Package className="w-12 h-12 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 p-2 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 truncate">{product.name}</h3>
                        {isBundle && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 border border-purple-300 shrink-0">
                            套装
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {product.brand?.name && (
                          <span className="px-2 py-0.5 text-xs rounded-full border border-blue-300 bg-blue-100 text-blue-700">
                            {product.brand.name}
                          </span>
                        )}
                        {product.subCategory?.category?.name && (
                          <span
                            className="px-2 py-0.5 text-xs rounded-full border"
                            style={(() => {
                              const color = getCategoryColor(product.subCategory.category.name);
                              return { backgroundColor: color.bg, color: color.text };
                            })()}
                          >
                            {product.subCategory.category.name}
                          </span>
                        )}
                      </div>
                      {isBundle && product.items && product.items.length > 0 && (
                        <div className="text-xs text-gray-600 mb-1">
                          <span className="font-medium">{product.items.length}种商品</span>
                          <span className="text-gray-400 ml-1">共{product.items.reduce((sum, item) => sum + item.quantity, 0)}件</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          ¥{minPrice === maxPrice ? minPrice.toFixed(2) : `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isBundle ? `库存 ${totalStock}` : `${skuCount}个规格 · 库存 ${totalStock}`}
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
    </div>
  );
}
