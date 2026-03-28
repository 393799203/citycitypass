import { useState, useEffect } from 'react';
import { productApi, bundleApi, warehouseApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Pencil, Trash2, X, Loader2, Package, Warehouse, Minus } from 'lucide-react';
import { useConfirm } from '../components/ConfirmProvider';

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
  skuCode?: string;
  packaging: string;
  spec: string;
  price: string;
}

interface Bundle {
  id: string;
  name: string;
  skuCode?: string;
  packaging: string;
  spec: string;
  price: string;
  status: string;
  items: BundleItem[];
}

interface BundleItem {
  id: string;
  skuId: string;
  sku: {
    id: string;
    packaging: string;
    spec: string;
    price: string;
    product: {
      id: string;
      name: string;
    }
  };
  quantity: number;
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

interface SKUWithProduct {
  id: string;
  skuCode?: string;
  packaging: string;
  spec: string;
  price: string;
  product: {
    id: string;
    name: string;
    brand: {
      name: string;
    }
  };
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

const defaultBundlePackagings = ['礼盒', '纸盒', '简装'];
const defaultBundleSpecs = ['单品', '组合'];

export default function ProductsPage() {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'product' | 'bundle'>('product');
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState<any[]>([]);
  const [brandPackagings, setBrandPackagings] = useState<any[]>([]);
  const [brandSpecs, setBrandSpecs] = useState<any[]>([]);
  const [skus, setSkus] = useState<SKUWithProduct[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bundleStocks, setBundleStocks] = useState<any[]>([]);
  const [productStocks, setProductStocks] = useState<any[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockForm, setStockForm] = useState({ warehouseId: '', zoneId: '', shelfId: '', locationId: '', quantity: 1, remark: '', skuId: '' });
  const [stockZones, setStockZones] = useState<any[]>([]);
  const [stockShelves, setStockShelves] = useState<any[]>([]);
  const [stockLocations, setStockLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    brandId: '',
    categoryId: '',
    subCategoryId: '',
    status: 'ACTIVE',
    skus: [{ packaging: '', spec: '', price: '' }],
  });

  const [bundleFormData, setBundleFormData] = useState({
    name: '',
    packaging: '礼盒',
    spec: '组合',
    price: '',
    status: 'ACTIVE',
    items: [] as { skuId: string; quantity: number }[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.categoryId) {
      const filtered = brands.filter(b => b.categoryId === formData.categoryId);
      setFilteredBrands(filtered);
      if (!filtered.find(b => b.id === formData.brandId)) {
        setFormData(f => ({ ...f, brandId: '' }));
      }
    } else {
      setFilteredBrands([]);
      setFormData(f => ({ ...f, brandId: '' }));
    }
  }, [formData.categoryId, brands]);

  // 品类变化时过滤二级分类
  useEffect(() => {
    if (formData.categoryId) {
      const filtered = subCategories.filter(sc => sc.categoryId === formData.categoryId);
      setFilteredSubCategories(filtered);
      if (!filtered.find(sc => sc.id === formData.subCategoryId)) {
        setFormData(f => ({ ...f, subCategoryId: '' }));
      }
    } else {
      setFilteredSubCategories([]);
      setFormData(f => ({ ...f, subCategoryId: '' }));
    }
  }, [formData.categoryId, subCategories]);

  // 品类变化时过滤品牌列表（二级分类不影响品牌列表）
  useEffect(() => {
    if (formData.categoryId) {
      const filtered = brands.filter(b => b.categoryId === formData.categoryId);
      setFilteredBrands(filtered);
      if (!filtered.find(b => b.id === formData.brandId)) {
        setFormData(f => ({ ...f, brandId: '' }));
      }
    } else {
      setFilteredBrands([]);
      setFormData(f => ({ ...f, brandId: '' }));
    }
  }, [formData.categoryId, brands]);

  // 品牌变化时加载对应的包装和规格选项
  useEffect(() => {
    const fetchBrandOptions = async () => {
      if (formData.brandId) {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
        try {
          const res = await fetch(`/api/products/brands/${formData.brandId}/options`, { headers });
          const data = await res.json();
          if (data.success) {
            setBrandPackagings(data.data.packagings || []);
            setBrandSpecs(data.data.specs || []);
          }
        } catch (error) {
          console.error('Fetch brand options error:', error);
        }
      } else {
        setBrandPackagings([]);
        setBrandSpecs([]);
      }
    };
    fetchBrandOptions();
  }, [formData.brandId]);

  const fetchBrands = async (categoryId?: string) => {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    try {
      const url = categoryId ? `/api/products/brands?categoryId=${categoryId}` : '/api/products/brands';
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setBrands(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    try {
      const [productsRes, bundlesRes, categoriesRes, brandsRes, subCategoriesRes, warehousesRes] = await Promise.all([
        productApi.list(),
        bundleApi.list(),
        fetch('/api/products/categories', { headers }).then(r => r.json()),
        fetch('/api/products/brands', { headers }).then(r => r.json()),
        fetch('/api/products/sub-categories', { headers }).then(r => r.json()),
        warehouseApi.list(),
      ]);

      if (productsRes.data.success) {
        setProducts(productsRes.data.data);
        const allSkus: SKUWithProduct[] = [];
        productsRes.data.data.forEach((p: any) => {
          p.skus?.forEach((s: any) => {
            allSkus.push({ ...s, product: { id: p.id, name: p.name, brand: p.brand } });
          });
        });
        setSkus(allSkus);
      }
      if (bundlesRes.data.success) setBundles(bundlesRes.data.data);
      if (categoriesRes.success) setCategories(categoriesRes.data);
      if (brandsRes.success) setBrands(brandsRes.data);
      if (subCategoriesRes.success) setSubCategories(subCategoriesRes.data);
      if (warehousesRes.data.success) setWarehouses(warehousesRes.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        skus: formData.skus.filter(s => s.packaging || s.spec || s.price).map(s => ({
          ...s,
          price: s.price ? Number(s.price) : 0,
        })),
      };
      
      if (editingId) {
        await productApi.update(editingId, data);
        toast.success('更新成功');
      } else {
        await productApi.create(data);
        toast.success('创建成功');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleBundleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await bundleApi.update(editingId, bundleFormData);
        toast.success('更新成功');
      } else {
        await bundleApi.create(bundleFormData);
        toast.success('创建成功');
      }
      setShowModal(false);
      resetBundleForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleEdit = async (product: Product) => {
    setFormData({
      name: product.name,
      brandId: product.brandId,
      categoryId: product.categoryId,
      subCategoryId: (product as any).subCategoryId || '',
      status: product.status,
      skus: product.skus.length > 0 ? product.skus : [{ packaging: '', spec: '', price: '' }],
    });
    setEditingId(product.id);
    setShowModal(true);
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    try {
      const res = await fetch(`/api/products/brands?categoryId=${product.categoryId}`, { headers });
      const data = await res.json();
      if (data.success) {
        setFilteredBrands(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleBundleEdit = (bundle: Bundle) => {
    setBundleFormData({
      name: bundle.name,
      packaging: bundle.packaging || '礼盒',
      spec: bundle.spec || '组合',
      price: bundle.price,
      status: bundle.status,
      items: bundle.items.map(i => ({ skuId: i.skuId, quantity: i.quantity })),
    });
    setEditingId(bundle.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: '确定删除?' });
    if (!ok) return;
    try {
      await productApi.delete(id);
      toast.success('删除成功');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleBundleDelete = async (id: string) => {
    const ok = await confirm({ message: '确定删除?' });
    if (!ok) return;
    try {
      await bundleApi.delete(id);
      toast.success('删除成功');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', brandId: '', categoryId: '', subCategoryId: '', status: 'ACTIVE', skus: [{ packaging: '', spec: '', price: '' }] });
    setFilteredBrands([]);
    setFilteredSubCategories([]);
    setEditingId(null);
  };

  const resetBundleForm = () => {
    setBundleFormData({ name: '', packaging: '礼盒', spec: '组合', price: '', status: 'ACTIVE', items: [] });
    setEditingId(null);
  };

  const handleSpecChange = async (newSpec: string) => {
    if (bundleFormData.spec === '组合' && newSpec === '单品' && bundleFormData.items.length > 1) {
      const ok = await confirm({ message: '切换为单品将只保留第一个商品，确定要切换吗？' });
      if (!ok) return;
      setBundleFormData({ ...bundleFormData, spec: newSpec, items: [bundleFormData.items[0]] });
    } else {
      setBundleFormData({ ...bundleFormData, spec: newSpec });
    }
  };

  const addSkuField = () => {
    setFormData({ ...formData, skus: [...formData.skus, { packaging: '', spec: '', price: '' }] });
  };

  const removeSkuField = (index: number) => {
    setFormData({ ...formData, skus: formData.skus.filter((_, i) => i !== index) });
  };

  const updateSkuField = (index: number, field: string, value: string) => {
    const newSkus = [...formData.skus];
    (newSkus[index] as any)[field] = value;
    setFormData({ ...formData, skus: newSkus });
  };

  const canSelectMultiple = bundleFormData.spec === '组合';

  const addBundleItem = (skuId: string) => {
    if (bundleFormData.items.find(i => i.skuId === skuId)) return;
    if (!canSelectMultiple && bundleFormData.items.length > 0) return;
    setBundleFormData({ ...bundleFormData, items: [...bundleFormData.items, { skuId, quantity: 1 }] });
  };

  const removeBundleItem = (skuId: string) => {
    setBundleFormData({ ...bundleFormData, items: bundleFormData.items.filter(i => i.skuId !== skuId) });
  };

  const updateBundleItemQuantity = (skuId: string, quantity: number) => {
    setBundleFormData({
      ...bundleFormData,
      items: bundleFormData.items.map(i => i.skuId === skuId ? { ...i, quantity } : i),
    });
  };

  const getTotalItems = (bundle: Bundle) => {
    return bundle.items.reduce((sum, item) => sum + item.quantity, 0);
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

  const getCategoryStyle = (categoryName: string) => {
    const color = getCategoryColor(categoryName);
    return { backgroundColor: color.bg, color: color.text };
  };

  const getOriginalPrice = (bundle: Bundle) => {
    if (!bundle.items || bundle.items.length === 0) return 0;
    return bundle.items.reduce((sum, item) => {
      const skuPrice = Number(item.sku?.price || 0);
      return sum + (skuPrice * item.quantity);
    }, 0);
  };

  const fetchBundleStocks = async (bundle: Bundle) => {
    setSelectedBundle(bundle);
    setSelectedProduct(null);
    setProductStocks([]);
    setStockLoading(true);
    try {
      const res = await fetch(`/api/stock/bundle/${bundle.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setBundleStocks(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setStockLoading(false);
    }
  };

  const fetchZones = async (warehouseId: string) => {
    try {
      const res = await warehouseApi.listZones(warehouseId);
      if (res.data.success) {
        setStockZones(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleStockIn = async () => {
    if (selectedBundle) {
      try {
        await fetch('/api/stock/bundle/stock-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bundleId: selectedBundle.id,
            warehouseId: stockForm.warehouseId,
            locationId: stockForm.locationId || null,
            quantity: stockForm.quantity,
          }),
        });
        toast.success('入库成功');
        fetchBundleStocks(selectedBundle);
        setStockForm({ warehouseId: '', zoneId: '', shelfId: '', locationId: '', quantity: 1, remark: '', skuId: '' });
      } catch (error: any) {
        toast.error(error.response?.data?.message || '入库失败');
      }
    } else if (selectedProduct && stockForm.skuId) {
      try {
        await fetch('/api/stock/stock-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skuId: stockForm.skuId,
            warehouseId: stockForm.warehouseId,
            locationId: stockForm.locationId || null,
            quantity: stockForm.quantity,
            remark: stockForm.remark || null,
          }),
        });
        toast.success('入库成功');
        fetchProductStocks(selectedProduct);
        setStockForm({ warehouseId: '', zoneId: '', shelfId: '', locationId: '', quantity: 1, remark: '', skuId: '' });
      } catch (error: any) {
        toast.error(error.response?.data?.message || '入库失败');
      }
    }
  };

  const fetchProductStocks = async (product: Product) => {
    setSelectedProduct(product);
    setSelectedBundle(null);
    setBundleStocks([]);
    setStockLoading(true);
    try {
      const res = await fetch(`/api/stock/sku/${product.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      console.log('fetchProductStocks response:', data);
      if (data.success) {
        setProductStocks(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setStockLoading(false);
    }
  };

  return (
    <div className="p-6">
      <ToastContainer />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">商品&套装管理</h1>
        <button
          onClick={() => { 
            if (activeTab === 'product') resetForm(); 
            else resetBundleForm();
            setShowModal(true); 
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'product' ? '创建商品' : '创建套装'}
        </button>
      </div>

      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('product')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'product' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          商品管理
        </button>
        <button
          onClick={() => setActiveTab('bundle')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'bundle' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'
          }`}
        >
          套装管理
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : activeTab === 'product' ? (
        products.length === 0 ? (
          <div className="text-center py-10 text-gray-500">暂无商品，请创建</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
              <div key={product.id} className="border border-blue-200 rounded-lg p-4 hover:shadow-lg transition-all bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      <h3 className="font-bold text-lg">{product.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {product.brand?.name && (
                        <span className="px-2 py-0.5 text-xs rounded-full border border-blue-300 bg-blue-100 text-blue-700">
                          {product.brand.name}
                        </span>
                      )}
                      {product.category?.name && (
                        <span
                          className="px-2 py-0.5 text-xs rounded-full border"
                          style={getCategoryStyle(product.category.name)}
                        >
                          {product.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded font-medium ${product.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {product.status === 'ACTIVE' ? '在售' : '停售'}
                  </span>
                </div>
                <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: '#f0f4f8' }}>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">{product.skus?.length || 0}</span> 个规格
                  </div>
                  {product.skus && product.skus.length > 0 && (
                    <div className="mt-2 text-xs max-h-16 overflow-y-auto text-gray-600">
                      {product.skus.map(s => (
                        <div key={s.id} className="flex justify-between">
                          <span>{s.spec} / {s.packaging} <span className="text-gray-400">({s.skuCode})</span></span>
                          <span className="font-bold">¥{s.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { fetchProductStocks(product); setShowStockModal(true); }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-green-200 text-green-600 rounded-lg text-sm hover:bg-green-50"
                  >
                    <Warehouse className="w-4 h-4" />
                    库存
                  </button>
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-primary-200 text-primary-600 rounded-lg text-sm hover:bg-primary-50"
                  >
                    <Pencil className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        bundles.length === 0 ? (
          <div className="text-center py-10 text-gray-500">暂无套装，请创建</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bundles.map(bundle => (
              <div key={bundle.id} className="border border-purple-200 rounded-lg p-4 hover:shadow-lg transition-all bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-500" />
                      <h3 className="font-bold text-lg">{bundle.name}</h3>
                      {bundle.skuCode && <span className="text-xs text-gray-400">({bundle.skuCode})</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{bundle.packaging} · {bundle.spec}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded font-medium ${bundle.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {bundle.status === 'ACTIVE' ? '在售' : '停售'}
                  </span>
                </div>
                <div className="text-xl font-bold text-purple-600 mb-3">
                  <span>¥{Number(bundle.price).toFixed(2)}</span>
                  {getOriginalPrice(bundle) > Number(bundle.price) && (
                    <span className="ml-2 text-sm text-gray-400 line-through">
                      ¥{getOriginalPrice(bundle).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="bg-purple-50 rounded-lg p-3 mb-3">
                  <div className="text-sm text-purple-700">
                    <span className="font-medium">{bundle.items?.length || 0}</span> 种商品 · 共 <span className="font-medium">{getTotalItems(bundle)}</span> 件
                  </div>
                  {bundle.items && bundle.items.length > 0 && (
                    <div className="mt-2 text-xs text-purple-600 max-h-16 overflow-y-auto">
                      {bundle.items.map(item => (
                        <div key={item.id} className="flex justify-between py-0.5">
                          <span>{item.sku?.product?.name} - {item.sku?.spec}/{item.sku?.packaging}</span>
                          <span className="font-medium">×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { fetchBundleStocks(bundle); setShowStockModal(true); }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-purple-200 text-purple-600 rounded-lg text-sm hover:bg-purple-50"
                  >
                    <Warehouse className="w-4 h-4" />
                    库存
                  </button>
                  <button
                    onClick={() => { setActiveTab('bundle'); handleBundleEdit(bundle); }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-primary-200 text-primary-600 rounded-lg text-sm hover:bg-primary-50"
                  >
                    <Pencil className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => handleBundleDelete(bundle.id)}
                    className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">
                {editingId ? (activeTab === 'product' ? '编辑商品' : '编辑套装') : (activeTab === 'product' ? '创建商品' : '创建套装')}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); resetBundleForm(); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {activeTab === 'product' ? (
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">分类</label>
                      <select
                        value={formData.categoryId}
                        onChange={e => setFormData({ ...formData, categoryId: e.target.value, brandId: '', subCategoryId: '' })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      >
                        <option value="">选择分类</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">二级分类</label>
                      <select
                        value={formData.subCategoryId}
                        onChange={e => setFormData({ ...formData, subCategoryId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        disabled={!formData.categoryId}
                      >
                        <option value="">选择二级分类</option>
                        {filteredSubCategories.map(sc => (
                          <option key={sc.id} value={sc.id}>{sc.name}（{sc.code}）</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">品牌</label>
                      <select
                        value={formData.brandId}
                        onChange={e => setFormData({ ...formData, brandId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        disabled={!formData.categoryId}
                      >
                        <option value="">{formData.categoryId ? '选择品牌' : '请先选择分类'}</option>
                        {filteredBrands.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">商品名称</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-purple-700">规格配置</label>
                    <button type="button" onClick={addSkuField} className="text-sm text-purple-600 hover:text-purple-800">+ 添加规格</button>
                  </div>
                  {formData.skus.map((sku, index) => (
                    <div key={index} className="flex gap-2 mb-2 items-center">
                      <select
                        value={sku.packaging}
                        onChange={e => updateSkuField(index, 'packaging', e.target.value)}
                        className="flex-1 px-2 py-2 border rounded-lg text-sm bg-white"
                      >
                        <option value="">选择包装</option>
                        {brandPackagings.map((p: any) => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={sku.spec}
                        onChange={e => updateSkuField(index, 'spec', e.target.value)}
                        className="flex-1 px-2 py-2 border rounded-lg text-sm bg-white"
                      >
                        <option value="">选择规格</option>
                        {brandSpecs.map((s: any) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">¥</span>
                        <input
                          type="number"
                          value={sku.price}
                          onChange={e => updateSkuField(index, 'price', e.target.value)}
                          placeholder="价格"
                          className="w-24 px-2 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      {formData.skus.length > 1 && (
                        <button type="button" onClick={() => removeSkuField(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-6 py-2 border rounded-lg hover:bg-gray-50">取消</button>
                  <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">保存</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBundleSubmit} className="p-4 space-y-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">套装名称</label>
                      <input
                        type="text"
                        value={bundleFormData.name}
                        onChange={e => setBundleFormData({ ...bundleFormData, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium mb-1">价格</label>
                      <div className="flex items-center h-[42px]">
                        <span className="text-gray-500 text-sm">¥</span>
                        <input
                          type="number"
                          value={bundleFormData.price}
                          onChange={e => setBundleFormData({ ...bundleFormData, price: e.target.value })}
                          className="flex-1 w-20 px-2 py-2 border rounded-lg text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">包装</label>
                      <select
                        value={bundleFormData.packaging}
                        onChange={e => setBundleFormData({ ...bundleFormData, packaging: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">选择包装</option>
                        {defaultBundlePackagings.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">规格</label>
                      <select
                        value={bundleFormData.spec}
                        onChange={e => handleSpecChange(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">选择规格</option>
                        {defaultBundleSpecs.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-green-700 mb-3">选择商品</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3 max-h-80 overflow-y-auto bg-white">
                      {skus.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">暂无商品</div>
                      ) : (
                        skus.map(sku => {
                          const isAdded = bundleFormData.items.find(i => i.skuId === sku.id);
                          const canAdd = (!canSelectMultiple && bundleFormData.items.length === 0 && !isAdded) || (canSelectMultiple && !isAdded);
                          return (
                            <div key={sku.id} 
                              onClick={() => canAdd && addBundleItem(sku.id)}
                              className={`flex items-center justify-between py-2 px-2 rounded cursor-pointer text-sm mb-1 ${isAdded ? 'bg-green-100 text-green-700' : canAdd ? 'hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'}`}
                            >
                              <div>
                                <div className="font-medium">{sku.product?.name}</div>
                                <div className="text-xs text-gray-500">{sku.spec}/{sku.packaging}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-primary-600 font-medium">¥{Number(sku.price || 0).toFixed(2)}</div>
                                {isAdded && <span className="text-green-600 text-xs">✓ 已选</span>}
                                {!canAdd && !isAdded && <span className="text-gray-400 text-xs">{canSelectMultiple ? '组合可选' : '单品限选1个'}</span>}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="border rounded-lg p-3 bg-white">
                      <div className="text-sm font-medium text-gray-700 mb-2">已选商品 ({bundleFormData.items.length})</div>
                      {bundleFormData.items.length === 0 ? (
                        <div className="text-center text-gray-400 py-8 text-sm">点击左侧商品添加</div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {bundleFormData.items.map(item => {
                            const sku = skus.find(s => s.id === item.skuId);
                            return (
                              <div key={item.skuId} className="flex items-center justify-between bg-green-50 rounded p-2">
                                <div className="flex-1">
                                  <div className="text-sm">{sku?.product?.name}</div>
                                  <div className="text-xs text-gray-500">{sku?.spec}/{sku?.packaging}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button 
                                    type="button" 
                                    onClick={() => updateBundleItemQuantity(item.skuId, Math.max(1, item.quantity - 1))} 
                                    className="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100"
                                  >-</button>
                                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                                  <button 
                                    type="button" 
                                    onClick={() => updateBundleItemQuantity(item.skuId, item.quantity + 1)} 
                                    className="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100"
                                  >+</button>
                                  <button 
                                    type="button" 
                                    onClick={() => removeBundleItem(item.skuId)} 
                                    className="ml-2 text-red-500 hover:bg-red-50 rounded p-1"
                                  ><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {bundleFormData.items.length > 0 && (
                        <div className="mt-3 pt-2 border-t text-sm text-gray-600">
                          共 {bundleFormData.items.reduce((sum, i) => sum + i.quantity, 0)} 件
                          <span className="ml-2 text-purple-600">
                            (原价 ¥{bundleFormData.items.reduce((sum, i) => {
                              const sku = skus.find(s => s.id === i.skuId);
                              return sum + (Number(sku?.price || 0) * i.quantity);
                            }, 0).toFixed(2)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => { setShowModal(false); resetBundleForm(); }} className="px-6 py-2 border rounded-lg hover:bg-gray-50">取消</button>
                  <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">保存</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">{selectedBundle ? `${selectedBundle.name} - 库存看板` : selectedProduct ? `${selectedProduct.name} - 库存看板` : '库存看板'}</h2>
              <button onClick={() => { setShowStockModal(false); setSelectedBundle(null); setSelectedProduct(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">仓库</label>
                  <select
                    value={stockForm.warehouseId}
                    onChange={e => { setStockForm({ ...stockForm, warehouseId: e.target.value, zoneId: '', shelfId: '', locationId: '' }); setStockZones([]); setStockShelves([]); setStockLocations([]); if (e.target.value) fetchZones(e.target.value); }}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                    required
                  >
                    <option value="">选择仓库</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <span className="text-gray-400 mt-4">-</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">库区</label>
                  <select
                    value={stockForm.zoneId}
                    onChange={e => { setStockForm({ ...stockForm, zoneId: e.target.value, shelfId: '', locationId: '' }); setStockShelves([]); setStockLocations([]); const zone = stockZones.find(z => z.id === e.target.value); if (zone) setStockShelves(zone.shelves || []); }}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                    disabled={!stockForm.warehouseId}
                    required
                  >
                    <option value="">选择库区</option>
                    {stockZones.map(z => (
                      <option key={z.id} value={z.id}>{z.code}-{z.name}</option>
                    ))}
                  </select>
                </div>
                <span className="text-gray-400 mt-4">-</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">货架</label>
                  <select
                    value={stockForm.shelfId}
                    onChange={e => { setStockForm({ ...stockForm, shelfId: e.target.value, locationId: '' }); setStockLocations([]); const shelf = stockShelves.find(s => s.id === e.target.value); if (shelf) setStockLocations(shelf.locations || []); }}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                    disabled={!stockForm.zoneId}
                    required
                  >
                    <option value="">选择货架</option>
                    {stockShelves.map(s => (
                      <option key={s.id} value={s.id}>{s.code}</option>
                    ))}
                  </select>
                </div>
                <span className="text-gray-400 mt-4">-</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">库位</label>
                  <select
                    value={stockForm.locationId}
                    onChange={e => setStockForm({ ...stockForm, locationId: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                    disabled={!stockForm.shelfId}
                    required
                  >
                    <option value="">选择库位</option>
                    {stockLocations.map(l => (
                      <option key={l.id} value={l.id}>L{l.level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedProduct && (
                  <div className="w-48">
                    <label className="block text-xs text-gray-600 mb-1">规格</label>
                    <select
                      value={stockForm.skuId}
                      onChange={e => setStockForm({ ...stockForm, skuId: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded-lg text-sm"
                      required
                    >
                      <option value="">选择规格</option>
                      {selectedProduct.skus?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.spec}/{s.packaging} ({s.skuCode})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="w-24">
                  <label className="block text-xs text-gray-600 mb-1">数量</label>
                  <input
                    type="number"
                    min="1"
                    value={stockForm.quantity}
                    onChange={e => setStockForm({ ...stockForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">备注</label>
                  <input
                    type="text"
                    value={stockForm.remark}
                    onChange={e => setStockForm({ ...stockForm, remark: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                    placeholder="备注"
                  />
                </div>
                <button
                  onClick={handleStockIn}
                  disabled={!stockForm.warehouseId || !stockForm.locationId || stockForm.quantity < 1 || (!!selectedProduct && !stockForm.skuId)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:bg-gray-300 mt-4"
                >
                  入库
                </button>
              </div>
            </div>

              {stockLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
                </div>
              ) : selectedBundle ? (
                <>
                  {console.log('DEBUG bundleStocks:', bundleStocks)}
                  {bundleStocks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">暂无库存记录</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-center">
                          <th className="px-3 py-2">仓库</th>
                          <th className="px-3 py-2">库位</th>
                          <th className="px-3 py-2">总库存</th>
                          <th className="px-3 py-2">可用</th>
                          <th className="px-3 py-2">已锁定</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bundleStocks.map(stock => (
                          <tr key={stock.id} className="border-t">
                            <td className="px-3 py-2 text-center">{stock.warehouse?.code}</td>
                            <td className="px-3 py-2 text-center">
                              {stock.location ? `${stock.location.shelf?.zone?.code || '-'} - ${stock.location.shelf?.code || '-'} - L${stock.location.level}` : '-'}
                            </td>
                            <td className="px-3 py-2 text-center">{stock.totalQuantity}</td>
                            <td className="px-3 py-2 text-center text-green-600">{stock.availableQuantity}</td>
                            <td className="px-3 py-2 text-center text-orange-600">{stock.lockedQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              ) : selectedProduct ? (
                <>
                  {console.log('DEBUG: selectedProduct=', selectedProduct?.name, 'productStocks=', productStocks.length)}
                  {productStocks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">暂无库存记录</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-center">
                          <th className="px-3 py-2">仓库</th>
                          <th className="px-3 py-2">库位</th>
                          <th className="px-3 py-2">规格</th>
                          <th className="px-3 py-2">总库存</th>
                          <th className="px-3 py-2">可用</th>
                          <th className="px-3 py-2">已锁定</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productStocks.map(stock => (
                          <tr key={stock.id} className="border-t">
                            <td className="px-3 py-2 text-center">{stock.warehouse?.code}</td>
                            <td className="px-3 py-2 text-center">
                              {stock.location ? `${stock.location.shelf?.zone?.code || '-'} - ${stock.location.shelf?.code || '-'} - L${stock.location.level}` : '-'}
                            </td>
                            <td className="px-3 py-2 text-center">{stock.sku?.spec}/{stock.sku?.packaging}</td>
                            <td className="px-3 py-2 text-center">{stock.totalQuantity}</td>
                            <td className="px-3 py-2 text-center text-green-600">{stock.availableQuantity}</td>
                            <td className="px-3 py-2 text-center text-orange-600">{stock.lockedQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">请选择一个商品或套装</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
