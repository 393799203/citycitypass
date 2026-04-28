import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi, bundleApi, warehouseApi, stockApi, qrcodeApi } from '../api';
import api from '../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Pencil, Trash2, X, Loader2, Package, Warehouse, Minus, RefreshCw, Database, QrCode, Image as ImageIcon, Upload, Layers } from 'lucide-react';
import { useConfirm } from '../components/ConfirmProvider';
import OwnerStamp from '../components/OwnerStamp';
import { useOwnerStore } from '../stores/owner';
import { usePermission } from '../hooks/usePermission';

interface Product {
  id: string;
  name: string;
  imageUrl?: string;
  brandId: string;
  brand: { id: string; name: string; code?: string };
  subCategoryId: string;
  subCategory: { id: string; name: string; category: { id: string; name: string } };
  ownerId?: string;
  owner?: { id: string; name: string };
  status: string;
  isVisibleToCustomer?: boolean;
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
  ownerId?: string;
  owner?: { id: string; name: string };
  name: string;
  imageUrl?: string;
  skuCode?: string;
  packaging: string;
  spec: string;
  price: string;
  status: string;
  isVisibleToCustomer?: boolean;
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
  subCategoryId: string;
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

interface Owner {
  id: string;
  name: string;
}

const defaultBundlePackagings = ['礼盒', '纸盒', '简装'];
const defaultBundleSpecs = ['单品', '组合'];

export default function ProductsPage() {
  const { confirm } = useConfirm();
  const { currentOwnerId, owners } = useOwnerStore();
  const { canWrite } = usePermission('config', 'products');
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
  const [filterOwner, setFilterOwner] = useState(currentOwnerId || '');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [bundleStocks, setBundleStocks] = useState<any[]>([]);
  const [productStocks, setProductStocks] = useState<any[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockForm, setStockForm] = useState({ warehouseId: '', zoneId: '', shelfId: '', locationId: '', quantity: 1, remark: '', skuId: '' });
  const [stockZones, setStockZones] = useState<any[]>([]);
  const [stockShelves, setStockShelves] = useState<any[]>([]);
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<{ qrCode: string; shoppingUrl: string; productName?: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    brandId: '',
    subCategoryId: '',
    ownerId: '',
    status: 'ACTIVE',
    isVisibleToCustomer: true,
    skus: [{ packaging: '', spec: '', price: '' }],
  });

  const [formCategoryId, setFormCategoryId] = useState('');
  const isInitializingRef = useRef(true);

  const [bundleFormData, setBundleFormData] = useState({
    name: '',
    imageUrl: '',
    packaging: '礼盒',
    spec: '组合',
    price: '',
    status: 'ACTIVE',
    isVisibleToCustomer: true,
    ownerId: '',
    items: [] as { skuId: string; quantity: number }[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchProductsByOwner = async () => {
      try {
        const [productRes, bundleRes] = await Promise.all([
          productApi.list({}),
          bundleApi.list({}),
        ]);
        if (productRes.data.success) {
          setProducts(productRes.data.data);
          const allSkus: SKUWithProduct[] = [];
          productRes.data.data.forEach((p: any) => {
            p.skus?.forEach((s: any) => {
              allSkus.push({ ...s, product: { id: p.id, name: p.name, brand: p.brand } });
            });
          });
          setSkus(allSkus);
        }
        if (bundleRes.data.success) {
          setBundles(bundleRes.data.data);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchProductsByOwner();
  }, [filterOwner]);

  // 一级分类变化时过滤二级分类
  useEffect(() => {
    if (isInitializingRef.current) {
      isInitializingRef.current = false;
      return;
    }
    if (formCategoryId) {
      const filtered = subCategories.filter(sc => sc.categoryId === formCategoryId);
      setFilteredSubCategories(filtered);
    } else {
      setFilteredSubCategories([]);
      setFormData(f => ({ ...f, subCategoryId: '', brandId: '' }));
      setFilteredBrands([]);
    }
  }, [formCategoryId, subCategories]);

  // 二级分类变化时过滤品牌（只在新建时需要过滤，编辑时 filteredBrands 已设置好）
  useEffect(() => {
    if (!editingId && formData.subCategoryId) {
      const filtered = brands.filter(b => b.subCategoryId === formData.subCategoryId);
      setFilteredBrands(filtered);
    } else if (!editingId && !formData.subCategoryId) {
      setFilteredBrands([]);
    }
  }, [formData.subCategoryId, brands, editingId]);

  // 二级分类变化时获取规格和包装选项
  useEffect(() => {
    const fetchSubCategoryOptions = async () => {
      if (formData.subCategoryId) {
        try {
          const res = await productApi.getSubCategoryOptions(formData.subCategoryId);
          if (res.data.success) {
            setBrandSpecs(res.data.data.specs || []);
            setBrandPackagings(res.data.data.packagings || []);
          }
        } catch (error) {
          console.error('Fetch sub-category options error:', error);
        }
      } else {
        setBrandPackagings([]);
        setBrandSpecs([]);
      }
    };
    fetchSubCategoryOptions();
  }, [formData.subCategoryId]);

  

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, bundlesRes, categoriesRes, brandsRes, subCategoriesRes, warehousesRes] = await Promise.all([
        productApi.list({}),
        bundleApi.list({}),
        productApi.getCategories(),
        productApi.getBrands({}),
        productApi.getSubCategories(),
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
      if (categoriesRes.data.success) setCategories(categoriesRes.data.data);
      if (brandsRes.data.success) setBrands(brandsRes.data.data);
      if (subCategoriesRes.data.success) setSubCategories(subCategoriesRes.data.data);
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
    console.log('[Bundle Submit] bundleFormData:', bundleFormData);
    try {
      if (editingId) {
        const res = await bundleApi.update(editingId, bundleFormData);
        console.log('[Bundle Submit] Update response:', res.data);
        toast.success('更新成功');
      } else {
        await bundleApi.create(bundleFormData);
        toast.success('创建成功');
      }
      setShowModal(false);
      resetBundleForm();
      fetchData();
    } catch (error: any) {
      console.error('[Bundle Submit] Error:', error);
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleEdit = async (product: Product) => {
    const categoryId = product.subCategory?.category?.id || '';
    const subCategoryId = product.subCategoryId || '';

    // 先加载数据
    let filteredSubCats: any[] = [];
    let filteredBrandsList: any[] = [];
    try {
      if (categoryId) {
        const subCatsRes = await productApi.getSubCategories();
        if (subCatsRes.data.success) {
          filteredSubCats = subCatsRes.data.data.filter((sc: any) => sc.categoryId === categoryId);
        }
      }
      if (subCategoryId) {
        const brandsRes = await productApi.getBrands({ subCategoryId });
        if (brandsRes.data.success) {
          filteredBrandsList = brandsRes.data.data;
        }
      }
    } catch (error) {
      console.error(error);
    }

    // 设置 formData（会触发 useEffect，但编辑模式下不应清空）
    setFormData({
      name: product.name,
      imageUrl: product.imageUrl || '',
      brandId: product.brandId,
      subCategoryId: subCategoryId,
      ownerId: product.ownerId || '',
      status: product.status,
      isVisibleToCustomer: product.isVisibleToCustomer ?? true,
      skus: product.skus.length > 0 ? product.skus : [{ packaging: '', spec: '', price: '' }],
    });

    // 设置 formCategoryId（会触发 useEffect，但编辑模式下不应清空）
    setFormCategoryId(categoryId);
    setFilteredSubCategories(filteredSubCats);
    setFilteredBrands(filteredBrandsList);

    setEditingId(product.id);
    setShowModal(true);
  };

  const handleBundleEdit = (bundle: Bundle) => {
    setBundleFormData({
      name: bundle.name,
      imageUrl: bundle.imageUrl || '',
      packaging: bundle.packaging || '礼盒',
      spec: bundle.spec || '组合',
      price: bundle.price,
      status: bundle.status,
      isVisibleToCustomer: bundle.isVisibleToCustomer ?? true,
      ownerId: (bundle as any).ownerId || '',
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

  const handleGenerateQRCode = async (productId: string, productName?: string) => {
    try {
      const res = await qrcodeApi.getShoppingQRCode(productId);
      if (res.data.success) {
        const { qrCode, shoppingUrl } = res.data.data;
        setQRCodeData({ qrCode, shoppingUrl, productName });
        setShowQRCodeModal(true);
      }
    } catch (error: any) {
      console.error('生成二维码失败:', error);
      toast.error(error.response?.data?.message || '生成二维码失败');
    }
  };

  const handleDownloadQRCode = () => {
    if (!qrCodeData) return;
    
    const link = document.createElement('a');
    link.href = qrCodeData.qrCode;
    link.download = `商品二维码_${qrCodeData.productName || 'product'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('二维码已下载');
  };

  const resetForm = () => {
    setFormData({ name: '', imageUrl: '', brandId: '', subCategoryId: '', ownerId: filterOwner, status: 'ACTIVE', isVisibleToCustomer: true, skus: [{ packaging: '', spec: '', price: '' }] });
    setFilteredBrands([]);
    setFilteredSubCategories([]);
    setFormCategoryId('');
    setEditingId(null);
  };

  const resetBundleForm = () => {
    setBundleFormData({ name: '', imageUrl: '', packaging: '礼盒', spec: '组合', price: '', status: 'ACTIVE', isVisibleToCustomer: true, ownerId: filterOwner, items: [] });
    setEditingId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      toast.error('只支持 JPEG、PNG、WebP 格式的图片');
      return;
    }

    setUploadingImage(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('image', file);

      const response = await api.post('/upload/product-image', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        if (activeTab === 'product') {
          setFormData({ ...formData, imageUrl: response.data.data.url });
        } else {
          setBundleFormData({ ...bundleFormData, imageUrl: response.data.data.url });
        }
        toast.success('图片上传成功');
      } else {
        toast.error(response.data.message || '图片上传失败');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('图片上传失败');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
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
      const res = await stockApi.getBundleStock(bundle.id);
      if (res.data.success) {
        setBundleStocks(res.data.data);
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

  const fetchProductStocks = async (product: Product) => {
    setSelectedProduct(product);
    setSelectedBundle(null);
    setBundleStocks([]);
    setStockLoading(true);
    try {
      const res = await stockApi.getProductStock(product.id);
      if (res.data.success) {
        setProductStocks(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setStockLoading(false);
    }
  };

  return (
    <div className="p-2 space-y-6">
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">商品&套装管理</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fetchData()}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">
            商品: {products.length} | 套装: {bundles.length}
          </span>
          <button
            onClick={() => {
              if (activeTab === 'product') resetForm();
              else resetBundleForm();
              setShowModal(true);
            }}
            disabled={!filterOwner || !canWrite}
            title={!filterOwner ? '请先选择主体' : !canWrite ? '无操作权限' : ''}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              filterOwner && canWrite
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'product' ? '创建商品' : '创建套装'}
          </button>
          <button
            onClick={() => navigate('/product-basic-data')}
            disabled={!filterOwner}
            title={!filterOwner ? '请先选择主体' : ''}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-primary-600 hover:bg-primary-50 ${
              filterOwner ? 'text-primary-600' : 'text-gray-400 border-gray-300 cursor-not-allowed'
            }`}
          >
            <Database className="w-4 h-4" />
            基础类目
          </button>
        </div>
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
        <>
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无商品，请创建</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
              <div 
                key={product.id} 
                className="border border-blue-200 rounded-lg p-4 hover:shadow-lg transition-all bg-white relative overflow-hidden"
                style={product.imageUrl ? {
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${product.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {}}
              >
                {product.owner?.name && (
                  <OwnerStamp name={product.owner.name} />
                )}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 flex items-center justify-center border-2 border-white shadow-sm">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg truncate">{product.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {product.brand?.name && (
                          <span className="px-2 py-0.5 text-xs rounded-full border border-blue-300 bg-blue-100 text-blue-700">
                            {product.brand.name}
                          </span>
                        )}
                        {product.subCategory?.category?.name && (
                          <span
                            className="px-2 py-0.5 text-xs rounded-full border"
                            style={getCategoryStyle(product.subCategory.category.name)}
                          >
                            {product.subCategory.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${product.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {product.status === 'ACTIVE' ? '在售' : '停售'}
                    </span>
                    {product.isVisibleToCustomer === false && (
                      <span className="px-2 py-1 text-xs rounded font-medium bg-red-100 text-red-700 whitespace-nowrap">
                        对客户隐藏
                      </span>
                    )}
                  </div>
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
                    onClick={() => handleGenerateQRCode(product.id, product.name)}
                    className="px-3 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm hover:bg-blue-50"
                    title="生成商品二维码"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  {canWrite && (
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </>
      ) : (
        bundles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无套装，请创建</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bundles.map(bundle => (
              <div 
                key={bundle.id} 
                className="border border-purple-200 rounded-lg p-4 hover:shadow-lg transition-all bg-white relative overflow-hidden"
                style={bundle.imageUrl ? {
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${bundle.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {}}
              >
                {bundle.owner?.name && (
                  <OwnerStamp name={bundle.owner.name} />
                )}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 flex items-center justify-center border-2 border-white shadow-sm">
                      {bundle.imageUrl ? (
                        <img 
                          src={bundle.imageUrl} 
                          alt={bundle.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Layers className="w-6 h-6 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg truncate">{bundle.name}</h3>
                        {bundle.skuCode && <span className="text-xs text-gray-400">({bundle.skuCode})</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{bundle.packaging} · {bundle.spec}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${bundle.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {bundle.status === 'ACTIVE' ? '在售' : '停售'}
                    </span>
                    {bundle.isVisibleToCustomer === false && (
                      <span className="px-2 py-1 text-xs rounded font-medium bg-red-100 text-red-700 whitespace-nowrap">
                        对客户隐藏
                      </span>
                    )}
                  </div>
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
                  {canWrite && (
                    <button
                      onClick={() => handleBundleDelete(bundle.id)}
                      className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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
                        value={formCategoryId}
                        onChange={e => {
                          setFormCategoryId(e.target.value);
                          setFormData({ ...formData, brandId: '', subCategoryId: '' });
                        }}
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
                        disabled={!formCategoryId}
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
                        disabled={!formCategoryId}
                      >
                        <option value="">{formCategoryId ? '选择品牌' : '请先选择分类'}</option>
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
                  <div>
                    <label className="block text-sm font-medium mb-1">商品图片</label>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        {formData.imageUrl ? (
                          <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                            <img 
                              src={formData.imageUrl} 
                              alt="商品图片" 
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, imageUrl: '' })}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => imageInputRef.current?.click()}
                            className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors"
                          >
                            {uploadingImage ? (
                              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                            ) : (
                              <>
                                <Upload className="w-8 h-8 text-gray-400" />
                                <span className="text-xs text-gray-500 mt-1">上传图片</span>
                              </>
                            )}
                          </div>
                        )}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>• 支持 JPEG、PNG、WebP 格式</p>
                        <p>• 图片大小不超过 5MB</p>
                        <p>• 建议尺寸 800x800px</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      id="isVisibleToCustomer"
                      checked={formData.isVisibleToCustomer}
                      onChange={e => setFormData({ ...formData, isVisibleToCustomer: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="isVisibleToCustomer" className="text-sm text-gray-700">
                      对客户可见（在客户购物页面显示此商品）
                    </label>
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
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">套装图片</label>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        {bundleFormData.imageUrl ? (
                          <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                            <img 
                              src={bundleFormData.imageUrl} 
                              alt="套装图片" 
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setBundleFormData({ ...bundleFormData, imageUrl: '' })}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => imageInputRef.current?.click()}
                            className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
                          >
                            {uploadingImage ? (
                              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                            ) : (
                              <>
                                <Upload className="w-8 h-8 text-gray-400" />
                                <span className="text-xs text-gray-500 mt-1">上传图片</span>
                              </>
                            )}
                          </div>
                        )}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>• 支持 JPEG、PNG、WebP 格式</p>
                        <p>• 图片大小不超过 5MB</p>
                        <p>• 建议尺寸 800x800px</p>
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
                        <div className="text-center py-12 text-gray-500">
                          <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                          <p>暂无商品</p>
                        </div>
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
                                  {canWrite && (
                                    <button 
                                      type="button" 
                                      onClick={() => removeBundleItem(item.skuId)} 
                                      className="ml-2 text-red-500 hover:bg-red-50 rounded p-1"
                                    ><Trash2 className="w-4 h-4" /></button>
                                  )}
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
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    id="bundleIsVisibleToCustomer"
                    checked={bundleFormData.isVisibleToCustomer}
                    onChange={e => setBundleFormData({ ...bundleFormData, isVisibleToCustomer: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="bundleIsVisibleToCustomer" className="text-sm text-gray-700">
                    对客户可见（在客户购物页面显示此套装）
                  </label>
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
            {stockLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
              </div>
            ) : selectedBundle ? (
                  <>
                    {bundleStocks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">暂无库存记录</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr className="text-center">
                            <th className="px-3 py-2">仓库</th>
                            <th className="px-3 py-2">规格</th>
                            <th className="px-3 py-2">库位</th>
                            <th className="px-3 py-2">批号</th>
                            <th className="px-3 py-2">总库存</th>
                            <th className="px-3 py-2">可用</th>
                            <th className="px-3 py-2">冻结</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bundleStocks.map(stock => (
                            <tr key={stock.id} className="border-t">
                              <td className="px-3 py-2 text-center">{stock.warehouse?.name}</td>
                              <td className="px-3 py-2 text-center">{stock.bundle?.spec} / {stock.bundle?.packaging}</td>
                              <td className="px-3 py-2 text-center">
                                {stock.location ? `${stock.location.shelf?.zone?.code || '-'} - ${stock.location.shelf?.code || '-'} - L${stock.location.level}` : '-'}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">{stock.bundleBatch?.batchNo || '-'}</td>
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
                    {productStocks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">暂无库存记录</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr className="text-center">
                            <th className="px-3 py-2">仓库</th>
                            <th className="px-3 py-2">规格</th>
                            <th className="px-3 py-2">库位</th>
                            <th className="px-3 py-2">批号</th>
                            <th className="px-3 py-2">总库存</th>
                            <th className="px-3 py-2">可用</th>
                            <th className="px-3 py-2">冻结</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productStocks.map(stock => (
                            <tr key={stock.id} className="border-t">
                              <td className="px-3 py-2 text-center">{stock.warehouse?.name}</td>
                              <td className="px-3 py-2 text-center">{stock.sku?.spec} / {stock.sku?.packaging}</td>
                              <td className="px-3 py-2 text-center">
                                {stock.location ? `${stock.location.shelf?.zone?.code || '-'} - ${stock.location.shelf?.code || '-'} - L${stock.location.level}` : '-'}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">{stock.skuBatch?.batchNo || '-'}</td>
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
      
      {showQRCodeModal && qrCodeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">商品二维码</h3>
              <button
                onClick={() => {
                  setShowQRCodeModal(false);
                  setQRCodeData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-center">
              {qrCodeData.productName && (
                <p className="text-sm text-gray-600 mb-3">{qrCodeData.productName}</p>
              )}
              <img
                src={qrCodeData.qrCode}
                alt="商品二维码"
                className="mx-auto mb-3"
              />
              <p className="text-xs text-gray-400 break-all mb-4">
                扫描二维码访问商品页面
              </p>
              
              <button
                onClick={handleDownloadQRCode}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                下载二维码
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
