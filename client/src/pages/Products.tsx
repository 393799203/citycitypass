import { useState, useEffect } from 'react';
import { productApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Pencil, Trash2, X, Loader2, Filter, Minus, Grid, List } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

interface Product {
  id: string;
  name: string;
  brandId: string;
  brand: { id: string; name: string; code?: string };
  categoryId: string;
  category: { id: string; name: string };
  status: string;
  skus: SKU[];
}

interface SKU {
  id: string;
  packaging: string;
  spec: string;
  price: string;
}

interface Category {
  id: string;
  code: string;
  name: string;
}

interface Brand {
  id: string;
  code: string;
  name: string;
  categoryId: string;
}

const defaultPackagings = ['单瓶', '双瓶', '箱(6瓶)', '箱(12瓶)'];
const defaultSpecs = ['100ml', '250ml', '500ml', '1L'];

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ name: '', categoryId: '', brandId: '' });
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    brandId: '',
    skus: [] as { id?: string; packaging: string; spec: string; price: number }[],
  });
  const [showSkuInput, setShowSkuInput] = useState(false);
  const [newSku, setNewSku] = useState<{ id?: string; packaging: string; spec: string; price: number }>({ packaging: '', spec: '', price: 0 });
  const [alcoholCategory, setAlcoholCategory] = useState('');
  const [alcoholBrandList, setAlcoholBrandList] = useState<{id: string, name: string, subCategory?: string}[]>([]);
  const [alcoholBrand, setAlcoholBrand] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productApi.list(filters);
      if (res.data.success) {
        const sortedProducts = [...res.data.data].sort((a, b) => {
          if (a.category.name === b.category.name) return 0;
          return a.category.name.localeCompare(b.category.name);
        });
        setProducts(sortedProducts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await productApi.getCategories();
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBrands = async (categoryId?: string) => {
    try {
      const params = categoryId ? { categoryId } : {};
      const res = await productApi.getBrands(params);
      if (res.data.success) {
        setBrands(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
  }, []);

  useEffect(() => {
    if (formData.categoryId && !editingId) {
      fetchBrands(formData.categoryId);
    }
  }, [formData.categoryId, editingId]);

  const handleSearch = () => {
    fetchProducts();
    setShowFilters(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId) {
      toast.error('请填写必填项');
      return;
    }
    if (!alcoholCategory && !formData.brandId) {
      toast.error('请选择品牌');
      return;
    }
    if (alcoholCategory && !alcoholBrand) {
      toast.error('请选择品牌');
      return;
    }

    try {
      let brandIdToUse = formData.brandId;
      
      if (alcoholCategory && alcoholBrand) {
        brandIdToUse = alcoholBrand;
      }

      if (editingId) {
        console.log('Updating product:', { ...formData, brandId: brandIdToUse });
        await productApi.update(editingId, { ...formData, brandId: brandIdToUse });
        toast.success('商品更新成功');
      } else {
        const productData = {
          name: formData.name,
          categoryId: formData.categoryId,
          brandId: brandIdToUse,
          skus: formData.skus,
        };
        console.log('Creating product:', productData);
        await productApi.create(productData);
        toast.success('商品创建成功');
      }
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingId(product.id);
    await fetchBrands(product.categoryId);
    setFormData({
      name: product.name,
      categoryId: product.categoryId,
      brandId: product.brandId,
      skus: product.skus.map(s => ({
        id: s.id,
        packaging: s.packaging,
        spec: s.spec,
        price: Number(s.price),
      })),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该商品吗？')) return;
    try {
      await productApi.delete(id);
      toast.success('商品已删除');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      categoryId: '',
      brandId: '',
      skus: [],
    });
    setNewSku({ packaging: '', spec: '', price: 0 });
    setAlcoholCategory('');
    setAlcoholBrand('');
    setAlcoholBrandList([]);
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const addSku = () => {
    if (!newSku.packaging || !newSku.spec) {
      toast.error('请填写SKU信息');
      return;
    }
    setFormData(prev => ({
      ...prev,
      skus: [...prev.skus, { ...newSku, price: Number(newSku.price) }],
    }));
    setNewSku({ packaging: '', spec: '', price: 0 });
    setShowSkuInput(false);
  };

  const removeSku = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skus: prev.skus.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      <ToastContainer />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">商品（SKU）管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            {viewMode === 'card' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            {viewMode === 'card' ? '列表模式' : '卡片模式'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-5 h-5" />
            筛选
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新增商品(SKU)
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品名</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="请输入商品名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品类别</label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">全部</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
              <select
                value={filters.brandId}
                onChange={(e) => setFilters({ ...filters, brandId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={!filters.categoryId}
              >
                <option value="">全部</option>
                {(brands as any[])
                  .filter((b: any) => !filters.categoryId || b.categoryId === filters.categoryId)
                  .map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                查询
              </button>
              <button
                onClick={() => { setFilters({ name: '', categoryId: '', brandId: '' }); fetchProducts(); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无数据</div>
        ) : (
          <>
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <BrandLogo brandCode={product.brand.code || ''} brandName={product.brand.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.category.name} · {product.brand.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {product.skus.length > 0 && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {product.skus.slice(0, 4).map((sku) => (
                            <div key={sku.id} className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
                              <span className="text-gray-600">{sku.spec}</span>
                              <span className="text-gray-300 mx-1">·</span>
                              <span className="text-gray-600">{sku.packaging}</span>
                            </div>
                          ))}
                          {product.skus.length > 4 && (
                            <div className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-500">
                              +{product.skus.length - 4}
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-lg font-semibold text-primary-600">
                            ¥{Math.min(...product.skus.map(s => Number(s.price))).toLocaleString()}
                            {product.skus.length > 1 && (
                              <span className="text-sm text-gray-400 font-normal">
                                ~¥{Math.max(...product.skus.map(s => Number(s.price))).toLocaleString()}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'table' && (
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-12">分类</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">品牌</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">规格</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">包装</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">价格</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products.flatMap(p => p.skus.map(sku => ({ product: p, sku }))).map(({ product, sku }, index, arr) => {
                        const prevItem = arr[index - 1];
                        const isFirstSkuOfProduct = !prevItem || prevItem.product.id !== product.id;
                        const rowSpan = arr.filter(item => item.product.id === product.id).length;
                        
                        const prevProduct = index > 0 ? arr[index - 1].product : null;
                        const isFirstOfCategory = !prevProduct || prevProduct.categoryId !== product.categoryId;
                        const categoryRowSpan = isFirstOfCategory 
                          ? arr.filter(item => item.product.categoryId === product.categoryId).length 
                          : 0;
                        
                        return (
                          <tr key={sku.id} className="hover:bg-gray-50">
                            {isFirstOfCategory && (
                              <td className="px-1 py-3 align-middle w-12" rowSpan={categoryRowSpan}>
                                <div className="flex flex-col items-center justify-center h-full">
                                  <span className="text-gray-700 text-xs font-medium" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '1em' }}>
                                    {product.category.name}
                                  </span>
                                </div>
                              </td>
                            )}
                            {isFirstSkuOfProduct && (
                              <>
                                <td className="px-4 py-3" rowSpan={rowSpan}>
                                  <span className="font-medium text-gray-900">{product.name}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500" rowSpan={rowSpan}>
                                  <div className="flex items-center gap-2">
                                    <BrandLogo brandCode={product.brand.code || ''} brandName={product.brand.name} size="sm" />
                                    {product.brand.name}
                                  </div>
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3 text-sm text-gray-500">{sku.spec}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{sku.packaging}</td>
                            <td className="px-4 py-3 text-sm text-right text-primary-600 font-medium">¥{Number(sku.price).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">{editingId ? '编辑商品' : '新增商品&SKU'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    商品类别 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={async (e) => {
                      const catId = e.target.value;
                      setFormData({ ...formData, categoryId: catId, brandId: '' });
                      const cat = categories.find(c => c.id === catId);
                      if (cat && ['白酒', '啤酒', '葡萄酒', '洋酒'].includes(cat.name)) {
                        setAlcoholCategory(cat.name);
                        const res = await productApi.getBrands({ categoryId: catId });
                        setAlcoholBrandList(res.data.data || []);
                      } else {
                        setAlcoholCategory('');
                        setAlcoholBrand('');
                        setAlcoholBrandList([]);
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">请选择类别</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    品牌 <span className="text-red-500">*</span>
                  </label>
                  {alcoholCategory ? (
                    <select
                      value={alcoholBrand}
                      onChange={(e) => setAlcoholBrand(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">请选择品牌</option>
                      {(() => {
                        const subCategories = [...new Set(alcoholBrandList.map(b => b.subCategory).filter(Boolean))];
                        if (subCategories.length > 0) {
                          return subCategories.map(subCat => (
                            <optgroup key={subCat} label={subCat!}>
                              {alcoholBrandList.filter(b => b.subCategory === subCat).map(brand => (
                                <option key={brand.id} value={brand.id}>{brand.name}</option>
                              ))}
                            </optgroup>
                          ));
                        } else {
                          return alcoholBrandList.map(brand => (
                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                          ));
                        }
                      })()}
                    </select>
                  ) : (
                    <select
                      value={formData.brandId}
                      onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      disabled={!formData.categoryId}
                    >
                      <option value="">请选择品牌</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  商品名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如：飞天茅台"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <button
                    type="button"
                    onClick={() => setShowSkuInput(true)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + 添加SKU
                  </button>
                </div>
                
                {showSkuInput && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">单瓶规格</label>
                        <select
                          value={newSku.spec}
                          onChange={(e) => setNewSku({ ...newSku, spec: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        >
                          <option value="">选择规格</option>
                          {defaultSpecs.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">包装</label>
                        <select
                          value={newSku.packaging}
                          onChange={(e) => setNewSku({ ...newSku, packaging: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        >
                          <option value="">选择包装</option>
                          {defaultPackagings.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">价格</label>
                        <input
                          type="number"
                          value={newSku.price}
                          onChange={(e) => setNewSku({ ...newSku, price: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addSku}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                      >
                        确认添加
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowSkuInput(false); setNewSku({ packaging: '', spec: '', price: 0 }); }}
                        className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
                
                {formData.skus.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {formData.skus.map((sku, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-700">{sku.spec}</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-sm text-gray-700">{sku.packaging}</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-sm text-gray-500">价格:</span>
                          <input
                            type="number"
                            value={sku.price}
                            onChange={(e) => {
                              const newSkus = [...formData.skus];
                              newSkus[idx] = { ...newSkus[idx], price: Number(e.target.value) };
                              setFormData({ ...formData, skus: newSkus });
                            }}
                            className="w-20 px-2 py-1 text-sm border rounded"
                            placeholder="价格"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSku(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingId ? '保存' : '创建'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
