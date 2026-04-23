import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Pencil, Trash2, X, Loader2, Users, Phone, MapPin, FileText, Package } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import AddressInput from '../components/AddressInput';
import { supplierApi, supplierContractApi, supplierProductApi, supplierMaterialApi, productApi, bundleApi } from '../api';
import OwnerStamp from '../components/OwnerStamp';
import { useConfirm } from '../components/ConfirmProvider';
import { useOwnerStore } from '../stores/owner';
import { formatPhone } from '../utils/format';
import { usePermission } from '../hooks/usePermission';

const defaultProductTags = ['白酒', '啤酒', '葡萄酒', '洋酒', '黄酒', '饮料', '食品'];

interface Supplier {
  id: string;
  ownerId?: string;
  owner?: { id: string; name: string };
  code: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  province: string;
  city: string;
  district?: string;
  latitude?: string;
  longitude?: string;
  productTags: string[];
  status: 'ACTIVE' | 'INACTIVE';
  remark: string;
  contractCount?: number;
}

interface SupplierContract {
  id: string;
  contractNo: string;
  name: string;
  supplierId: string;
  startDate: string | null;
  endDate: string | null;
  amount: string | null;
  discount: string | null;
  serviceTerms: string | null;
  specialTerms: string | null;
  status: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
}

const defaultFormData: Supplier = {
  id: '',
  code: '',
  name: '',
  contact: '',
  phone: '',
  address: '',
  province: '',
  city: '',
  latitude: '',
  longitude: '',
  productTags: [],
  status: 'ACTIVE',
  remark: '',
  ownerId: '',
};

const defaultContractForm: SupplierContract = {
  id: '',
  contractNo: '',
  name: '',
  supplierId: '',
  startDate: '',
  endDate: '',
  amount: '',
  discount: '',
  serviceTerms: '',
  specialTerms: '',
  status: 'DRAFT',
  fileUrl: null,
  fileName: null,
  fileSize: null,
};

export default function SuppliersPage() {
  const { currentOwnerId, owners } = useOwnerStore();
  const { canWrite } = usePermission('config', 'suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterOwner, setFilterOwner] = useState(currentOwnerId || '');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Supplier>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const { confirm } = useConfirm();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts'>('overview');

  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [contractForm, setContractForm] = useState<SupplierContract>(defaultContractForm);
  const [supplierContracts, setSupplierContracts] = useState<SupplierContract[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalSupplierId, setProductModalSupplierId] = useState<string | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
  const [supplierMaterials, setSupplierMaterials] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allBundles, setAllBundles] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [selectedBundles, setSelectedBundles] = useState<any[]>([]);
  const [productType, setProductType] = useState<'PRODUCT' | 'BUNDLE' | 'MATERIAL' | 'OTHER'>('PRODUCT');
  const [searchKeyword, setSearchKeyword] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      const res = await supplierApi.list(params);
      if (res.data.success) {
        setSuppliers(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [filterOwner]);

  useEffect(() => {
    fetchSuppliers();
  }, [filters]);

  const filteredSuppliers = suppliers.filter(s => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!s.name.toLowerCase().includes(search) &&
          !s.code.toLowerCase().includes(search) &&
          !s.contact?.toLowerCase().includes(search) &&
          !s.phone?.includes(search)) {
        return false;
      }
    }
    if (filters.status && s.status !== filters.status) {
      return false;
    }
    return true;
  });

  const resetForm = () => {
    setFormData({ ...defaultFormData, ownerId: filterOwner });
    setEditingId(null);
    setCustomTagInput('');
    setShowCustomTagInput(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('请输入供应商名称');
      return;
    }
    if (!formData.contact.trim()) {
      toast.error('请输入联系人');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('请输入联系电话');
      return;
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      toast.error('请输入正确的11位手机号');
      return;
    }
    if (!formData.province || !formData.city || !formData.address.trim()) {
      toast.error('请填写完整地址（省/市/详细地址）');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await supplierApi.update(editingId, formData);
        toast.success('更新成功');
      } else {
        await supplierApi.create(formData);
        toast.success('创建成功');
      }
      setShowModal(false);
      resetForm();
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      ...supplier,
      phone: supplier.phone || '',
    });
    setEditingId(supplier.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: '确定要删除该供应商吗？' });
    if (!ok) return;

    try {
      await supplierApi.delete(id);
      toast.success('删除成功');
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      productTags: prev.productTags.includes(tag)
        ? prev.productTags.filter(t => t !== tag)
        : [...prev.productTags, tag]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'EXPIRED': return 'bg-red-100 text-red-700';
      case 'TERMINATED': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getContractStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '生效中';
      case 'DRAFT': return '草稿';
      case 'PENDING': return '待生效';
      case 'EXPIRED': return '已过期';
      case 'TERMINATED': return '已终止';
      default: return status;
    }
  };

  const handleOpenContractModal = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setContractForm({ ...defaultContractForm, supplierId: supplier.id });
    setEditingContractId(null);
    setShowContractModal(true);
    fetchSupplierContracts(supplier.id);
  };

  const fetchSupplierContracts = async (supplierId: string) => {
    try {
      const res = await supplierContractApi.list({ supplierId });
      if (res.data.success) {
        setSupplierContracts(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenProductModal = async (supplier: Supplier) => {
    setProductModalSupplierId(supplier.id);
    try {
      const [productRes, bundleRes, supplierProductRes, materialRes] = await Promise.all([
        productApi.list({ ownerId: supplier.ownerId }),
        bundleApi.list({ ownerId: supplier.ownerId }),
        supplierProductApi.getBySupplier(supplier.id),
        supplierMaterialApi.getBySupplier(supplier.id),
      ]);
      setAllProducts(productRes.data.data || []);
      setAllBundles(bundleRes.data.data || []);
      setSupplierMaterials(materialRes.data.data || []);
      const existingProducts = supplierProductRes.data.data || [];
      const selectedSkus: any[] = [];
      const selectedBdles: any[] = [];
      existingProducts.forEach((p: any) => {
        if (p.itemType === 'PRODUCT' && p.sku) {
          selectedSkus.push({
            skuId: p.skuId,
            productId: p.sku.productId,
            productName: p.sku.product?.name,
            spec: p.sku.spec,
            packaging: p.sku.packaging,
            price: p.price,
            supplierPrice: p.price,
          });
        } else if (p.itemType === 'BUNDLE' && p.bundle) {
          selectedBdles.push({
            bundleId: p.bundleId,
            bundleName: p.bundle.name,
            spec: p.bundle.spec,
            packaging: p.bundle.packaging,
            price: p.bundle.price,
            supplierPrice: p.price,
          });
        }
      });
      setSelectedProducts(selectedSkus);
      setSelectedBundles(selectedBdles);
      setShowProductModal(true);
    } catch (error) {
      toast.error('加载商品失败');
    }
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractForm.name.trim()) {
      toast.error('请输入合同名称');
      return;
    }
    if (!contractForm.startDate) {
      toast.error('请选择开始日期');
      return;
    }
    if (!contractForm.endDate) {
      toast.error('请选择结束日期');
      return;
    }
    if (contractForm.startDate > contractForm.endDate) {
      toast.error('结束日期不能早于开始日期');
      return;
    }
    
    try {
      const submitData = {
        ...contractForm,
        amount: contractForm.amount ? parseFloat(contractForm.amount) : null,
        discount: contractForm.discount ? parseFloat(contractForm.discount) : null,
      };
      if (editingContractId) {
        await supplierContractApi.update(editingContractId, submitData);
        toast.success('更新成功');
      } else {
        await supplierContractApi.create(submitData);
        toast.success('创建成功');
      }
      setShowContractModal(false);
      setContractForm(defaultContractForm);
      setEditingContractId(null);
      if (selectedSupplier) {
        fetchSupplierContracts(selectedSupplier.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleEditContract = (contract: SupplierContract) => {
    setContractForm({
      ...contract,
      startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
      endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
      amount: contract.amount?.toString() || '',
      discount: contract.discount?.toString() || '',
    });
    setEditingContractId(contract.id);
  };

  const handleDeleteContract = async (id: string) => {
    const ok = await confirm({ message: '确定要删除该合同吗？' });
    if (!ok) return;
    try {
      await supplierContractApi.delete(id);
      toast.success('删除成功');
      if (selectedSupplier) {
        fetchSupplierContracts(selectedSupplier.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const resetContractForm = () => {
    setContractForm({ ...defaultContractForm, supplierId: selectedSupplier?.id || '' });
    setEditingContractId(null);
  };

  return (
    <div className="p-2 space-y-6">
      

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">供应商管理</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            供应商: {filteredSuppliers.length}
          </span>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            disabled={!filterOwner || !canWrite}
            title={!filterOwner ? '请先选择主体' : !canWrite ? '无操作权限' : ''}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              filterOwner && canWrite
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" /> 新建供应商
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="搜索供应商名称/编码/联系人"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm w-48"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">全部状态</option>
          <option value="ACTIVE">启用</option>
          <option value="INACTIVE">停用</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>暂无供应商数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="border rounded-lg p-4 bg-white hover:shadow-lg transition-all relative">
              {supplier.owner?.name && (
                <OwnerStamp name={supplier.owner.name} />
              )}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{supplier.name}</h3>
                    <p className="text-xs text-gray-500">{supplier.code}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded font-medium ${supplier.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {supplier.status === 'ACTIVE' ? '启用' : '停用'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {supplier.contact || '-'} · {formatPhone(supplier.phone)}
                  </div>
                  <span className="text-xs text-gray-500">合同: {supplier.contractCount || 0}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>{supplier.province}{supplier.city}{supplier.address}</span>
                </div>
                {supplier.productTags && supplier.productTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t">
                    {supplier.productTags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                    {supplier.productTags.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        +{supplier.productTags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 mt-3 border-t">
                <button
                  onClick={() => { setSelectedSupplier(supplier); setActiveTab('overview'); }}
                  className="flex-1 px-3 py-1.5 border border-primary-200 text-primary-600 rounded text-sm hover:bg-primary-50"
                >
                  查看详情
                </button>
                <button
                  onClick={() => { handleOpenProductModal(supplier); }}
                  className="px-3 py-1.5 border border-purple-200 text-purple-600 rounded text-sm hover:bg-purple-50"
                >
                  供应商品
                </button>
                {canWrite && (
                  <>
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="px-3 py-1.5 border border-primary-200 text-primary-600 rounded text-sm hover:bg-primary-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="text-xl font-bold">{selectedSupplier.name}</h2>
                <p className="text-sm text-gray-500">{selectedSupplier.code}</p>
              </div>
              <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium ${activeTab === 'overview' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
              >
                基本信息
              </button>
              <button
                onClick={() => { setActiveTab('contracts'); fetchSupplierContracts(selectedSupplier.id); }}
                className={`px-6 py-3 text-sm font-medium ${activeTab === 'contracts' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
              >
                合同管理
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-700">联系信息</h3>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">联系人:</span>
                        <span>{selectedSupplier.contact || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">电话:</span>
                        <span>{selectedSupplier.phone || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">地址:</span>
                        <span>{selectedSupplier.province}{selectedSupplier.city}{selectedSupplier.address || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-700">状态信息</h3>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">状态:</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${selectedSupplier.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {selectedSupplier.status === 'ACTIVE' ? '启用' : '停用'}
                        </span>
                      </div>
                      {selectedSupplier.productTags && selectedSupplier.productTags.length > 0 && (
                        <div>
                          <span className="text-gray-500">商品标签:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedSupplier.productTags.map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'contracts' && (
                <div>
                  <div className="flex justify-between mb-4">
                    <h3 className="font-medium">合同列表</h3>
                    {canWrite && (
                      <button
                        onClick={() => { handleOpenContractModal(selectedSupplier); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                      >
                        <Plus className="w-4 h-4" /> 添加合同
                      </button>
                    )}
                  </div>
                  {supplierContracts.length > 0 ? (
                    <div className="space-y-3">
                      {supplierContracts.map((contract) => (
                        <div key={contract.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{contract.name}</h4>
                              <p className="text-sm text-gray-500">合同号: {contract.contractNo}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                contract.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                contract.status === 'EXPIRED' ? 'bg-gray-100 text-gray-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {contract.status === 'ACTIVE' ? '生效中' : contract.status === 'EXPIRED' ? '已过期' : contract.status}
                              </span>
                              {canWrite && (
                                <>
                                  <button
                                    onClick={() => {
                                      setContractForm({
                                        id: contract.id,
                                        contractNo: contract.contractNo,
                                        name: contract.name,
                                        supplierId: contract.supplierId,
                                        startDate: contract.startDate?.split('T')[0] || '',
                                        endDate: contract.endDate?.split('T')[0] || '',
                                        amount: contract.amount || '',
                                        discount: contract.discount || '',
                                        serviceTerms: contract.serviceTerms || '',
                                        specialTerms: contract.specialTerms || '',
                                        status: contract.status,
                                        fileUrl: contract.fileUrl,
                                        fileName: contract.fileName,
                                        fileSize: contract.fileSize,
                                      });
                                      setEditingContractId(contract.id);
                                      setShowContractModal(true);
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Pencil className="w-4 h-4 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const ok = await confirm({ message: '确定要删除该合同吗？' });
                                      if (!ok) return;
                                      try {
                                        await supplierContractApi.delete(contract.id);
                                        toast.success('删除成功');
                                        fetchSupplierContracts(selectedSupplier.id);
                                      } catch (error: any) {
                                        toast.error(error.response?.data?.message || '删除失败');
                                      }
                                    }}
                                    className="p-1 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-gray-500 flex gap-4">
                            <span>有效期: {contract.startDate?.split('T')[0]} 至 {contract.endDate?.split('T')[0]}</span>
                            {contract.amount && <span>金额: ¥{contract.amount}</span>}
                            {contract.discount && <span>折扣: {parseFloat(contract.discount) * 100}折</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">暂无合同</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              {canWrite && (
                <>
                  <button
                    onClick={() => handleEdit(selectedSupplier)}
                    className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(selectedSupplier.id)}
                    className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    删除
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold">{editingId ? '编辑供应商' : '新建供应商'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    供应商名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="请输入供应商名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">状态</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="ACTIVE">启用</option>
                    <option value="INACTIVE">停用</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    联系人 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="请输入联系人姓名"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    联系电话 <span className="text-red-500">*</span>
                  </label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    className="w-full"
                    required
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                  所在地区 <span className="text-red-500">*</span>
                </label>
                <AddressInput
                  value={{
                    province: formData.province,
                    city: formData.city,
                    address: formData.address,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                  }}
                  onChange={(val) => setFormData({
                    ...formData,
                    province: val.province || '',
                    city: val.city || '',
                    address: val.address || '',
                    latitude: val.latitude || '',
                    longitude: val.longitude || '',
                  })}
                  required
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">商品标签</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {defaultProductTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        formData.productTags.includes(tag)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowCustomTagInput(true)}
                    className="px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                  >
                    + 自定义
                  </button>
                </div>
                {showCustomTagInput && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const tag = customTagInput.trim();
                          if (tag && !formData.productTags.includes(tag)) {
                            setFormData(prev => ({
                              ...prev,
                              productTags: [...prev.productTags, tag]
                            }));
                          }
                          setCustomTagInput('');
                          setShowCustomTagInput(false);
                        }
                      }}
                      placeholder="输入自定义标签后按回车"
                      className="flex-1 px-3 py-1 border rounded"
                      autoFocus
                    />
                  </div>
                )}
                {formData.productTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.productTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => toggleTag(tag)} className="hover:text-purple-900">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">备注</label>
                <textarea
                  value={formData.remark}
                  onChange={e => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="请输入备注信息"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 border rounded-lg">取消</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showContractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold">供应商合同 {selectedSupplier && `- ${selectedSupplier.name}`}</h2>
              <button onClick={() => { setShowContractModal(false); setSelectedSupplier(null); resetContractForm(); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <form onSubmit={handleContractSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      合同名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contractForm.name}
                      onChange={(e) => setContractForm({ ...contractForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">状态</label>
                    <select
                      value={contractForm.status}
                      onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="DRAFT">草稿</option>
                      <option value="PENDING">待生效</option>
                      <option value="ACTIVE">生效中</option>
                      <option value="EXPIRED">已过期</option>
                      <option value="TERMINATED">已终止</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="autoRenew" checked={contractForm.autoRenew || false} onChange={(e) => setContractForm({ ...contractForm, autoRenew: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                    <label htmlFor="autoRenew" className="text-sm cursor-pointer">自动续约</label>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      开始日期 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={contractForm.startDate || ''}
                      onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      结束日期 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={contractForm.endDate || ''}
                      onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">合同金额(元)</label>
                    <input
                      type="number"
                      value={contractForm.amount || ''}
                      onChange={(e) => setContractForm({ ...contractForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">折扣</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={contractForm.discount || ''}
                      onChange={(e) => setContractForm({ ...contractForm, discount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="如0.85"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">服务条款</label>
                    <textarea
                      value={contractForm.serviceTerms || ''}
                      onChange={(e) => setContractForm({ ...contractForm, serviceTerms: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                      placeholder="服务范围、质量标准等"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">特殊条款</label>
                    <textarea
                      value={contractForm.specialTerms || ''}
                      onChange={(e) => setContractForm({ ...contractForm, specialTerms: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                      placeholder="差异化条款、特殊约定等"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={resetContractForm} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    {editingContractId ? '更新' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold">供应商品管理 {productModalSupplierId && `- ${suppliers.find(s => s.id === productModalSupplierId)?.name}`}</h2>
              <button onClick={() => { setShowProductModal(false); setSelectedProducts([]); setSelectedBundles([]); setProductModalSupplierId(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/2 border-r flex flex-col">
                <div className="flex border-b bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setProductType('PRODUCT')}
                    className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                      productType === 'PRODUCT' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
                    }`}
                  >
                    商品
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType('BUNDLE')}
                    className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                      productType === 'BUNDLE' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'
                    }`}
                  >
                    套装
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType('MATERIAL')}
                    className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                      productType === 'MATERIAL' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'
                    }`}
                  >
                    原材料
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType('OTHER')}
                    className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                      productType === 'OTHER' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
                    }`}
                  >
                    其他
                  </button>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
                  <input
                    type="text"
                    placeholder={productType === 'PRODUCT' ? "搜索商品..." : productType === 'BUNDLE' ? "搜索套装..." : "搜索..."}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {productType === 'PRODUCT' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {allProducts
                        .filter((p: any) => p.name.toLowerCase().includes(searchKeyword.toLowerCase()))
                        .map((p: any) => (
                          <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <div className="p-2 font-medium text-gray-700 text-xs bg-gray-50">{p.name}</div>
                            <div className="p-1">
                              {(p.skus || []).map((sku: any) => {
                                const isSelected = selectedProducts.some(s => s.skuId === sku.id);
                                return (
                                  <div
                                    key={sku.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedProducts(selectedProducts.filter(s => s.skuId !== sku.id));
                                      } else {
                                        setSelectedProducts([...selectedProducts, {
                                          skuId: sku.id,
                                          productId: p.id,
                                          productName: p.name,
                                          spec: sku.spec,
                                          packaging: sku.packaging,
                                          price: sku.price,
                                          supplierPrice: sku.price,
                                        }]);
                                      }
                                    }}
                                    className={`p-2 rounded cursor-pointer text-xs mb-1 last:mb-0 ${
                                      isSelected
                                        ? 'bg-blue-50 border border-blue-400 text-blue-700'
                                        : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>{sku.spec} / {sku.packaging}</span>
                                      {sku.price && <span className="text-green-600">¥{sku.price}</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : productType === 'BUNDLE' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {allBundles
                        .filter((b: any) => b.name.toLowerCase().includes(searchKeyword.toLowerCase()))
                        .map((b: any) => {
                          const isSelected = selectedBundles.some(s => s.bundleId === b.id);
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedBundles(selectedBundles.filter(s => s.bundleId !== b.id));
                                } else {
                                  setSelectedBundles([...selectedBundles, {
                                    bundleId: b.id,
                                    bundleName: b.name,
                                    spec: b.spec,
                                    packaging: b.packaging,
                                    price: b.price,
                                    supplierPrice: b.price,
                                  }]);
                                }
                              }}
                              className={`p-2 border rounded-lg cursor-pointer text-xs bg-white ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-purple-200 hover:border-purple-500 hover:bg-purple-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-purple-600 truncate">{b.name}</span>
                                {b.price && <span className="text-green-600 shrink-0 ml-1">¥{b.price}</span>}
                              </div>
                              {b.spec && <div className="text-xs text-gray-400 mt-1">{b.spec} / {b.packaging}</div>}
                            </div>
                          );
                        })}
                    </div>
                  ) : null}
                  {(productType === 'MATERIAL' || productType === 'OTHER') && (
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          placeholder="名称"
                          id="materialName"
                          className="flex-1 px-2 py-1.5 border rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="单位"
                          id="materialUnit"
                          className="w-16 px-2 py-1.5 border rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="单价"
                          id="materialPrice"
                          className="w-20 px-2 py-1.5 border rounded text-sm"
                        />
                        <button
                          onClick={() => {
                            const nameInput = document.getElementById('materialName') as HTMLInputElement;
                            const unitInput = document.getElementById('materialUnit') as HTMLInputElement;
                            const priceInput = document.getElementById('materialPrice') as HTMLInputElement;
                            const name = nameInput?.value?.trim();
                            if (!name) return;
                            const exists = supplierMaterials.some(m => m.name === name && m.category === productType);
                            if (!exists) {
                              setSupplierMaterials([...supplierMaterials, {
                                id: `new-${Date.now()}`,
                                name,
                                category: productType,
                                unit: unitInput?.value?.trim() || '',
                                price: priceInput?.value ? parseFloat(priceInput.value) : null,
                              }]);
                              nameInput.value = '';
                              unitInput.value = '';
                              priceInput.value = '';
                            }
                          }}
                          className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          添加
                        </button>
                      </div>
                      {supplierMaterials.filter(m => m.category === productType).length > 0 && (
                        <div className="space-y-1">
                          {supplierMaterials.filter(m => m.category === productType).map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded text-sm">
                              <span className="text-sm font-medium text-green-700">{item.name}</span>
                              {item.unit && <span className="text-xs text-gray-500">({item.unit})</span>}
                              <span className="text-xs text-gray-400 ml-auto mr-2">{item.price ? `¥${item.price}` : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-1/2 flex flex-col max-h-[70vh]">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">供货商品</span>
                    <span className="text-xs text-gray-500">
                      {selectedProducts.length + selectedBundles.length + supplierMaterials.length} 个
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {selectedProducts.length === 0 && selectedBundles.length === 0 && supplierMaterials.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-lg">
                      点击左侧商品添加到清单
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedProducts.map((item: any, idx: number) => (
                        <div key={`p-${item.skuId}`} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-600">商</span>
                              <span className="font-medium truncate">{item.productName}</span>
                            </div>
                            <div className="text-xs text-gray-500 ml-6">{item.spec} / {item.packaging}</div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">供货价:</span>
                              <input
                                type="number"
                                value={item.supplierPrice}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  setSelectedProducts(selectedProducts.map((s: any, i: number) =>
                                    i === idx ? { ...s, supplierPrice: newPrice } : s
                                  ));
                                }}
                                className="w-20 px-2 py-1 border rounded text-center text-sm"
                              />
                            </div>
                            <button
                              onClick={() => setSelectedProducts(selectedProducts.filter((_: any, i: number) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {selectedBundles.map((item: any, idx: number) => (
                        <div key={`b-${item.bundleId}`} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-600">套</span>
                              <span className="font-medium truncate">{item.bundleName}</span>
                            </div>
                            {item.spec && <div className="text-xs text-gray-500 ml-6">{item.spec} / {item.packaging}</div>}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">供货价:</span>
                              <input
                                type="number"
                                value={item.supplierPrice}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  setSelectedBundles(selectedBundles.map((b: any, i: number) =>
                                    i === idx ? { ...b, supplierPrice: newPrice } : b
                                  ));
                                }}
                                className="w-20 px-2 py-1 border rounded text-center text-sm"
                              />
                            </div>
                            <button
                              onClick={() => setSelectedBundles(selectedBundles.filter((_: any, i: number) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {supplierMaterials.map((item: any) => {
                        const isMaterial = item.category === 'MATERIAL';
                        return (
                        <div key={item.id} className={`flex items-center justify-between p-3 ${isMaterial ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'} rounded-lg text-sm`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 text-xs rounded ${isMaterial ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{isMaterial ? '原' : '其他'}</span>
                              <span className="font-medium truncate">{item.name}</span>
                              {item.unit && <span className="text-xs text-gray-400">({item.unit})</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">供货价:</span>
                              <input
                                type="number"
                                value={item.price || ''}
                                onChange={(e) => {
                                  const newMaterials = supplierMaterials.map((m: any) =>
                                    m.id === item.id ? { ...m, price: e.target.value } : m
                                  );
                                  setSupplierMaterials(newMaterials);
                                }}
                                className="w-20 px-2 py-1 border rounded text-center text-sm"
                              />
                            </div>
                            <button
                              onClick={() => setSupplierMaterials(supplierMaterials.filter((m: any) => m.id !== item.id))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>


              </div>
            </div>
            {canWrite && (
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => { setShowProductModal(false); setSelectedProducts([]); setSelectedBundles([]); setSearchKeyword(''); setProductModalSupplierId(null); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  try {
                    const productItems: any[] = [];
                    selectedProducts.forEach((item: any) => {
                      productItems.push({
                        itemType: 'PRODUCT',
                        skuId: item.skuId,
                        price: item.supplierPrice,
                      });
                    });
                    selectedBundles.forEach((item: any) => {
                      productItems.push({
                        itemType: 'BUNDLE',
                        bundleId: item.bundleId,
                        price: item.supplierPrice,
                      });
                    });
                    const materialItems = supplierMaterials.map((item: any) => ({
                      name: item.name,
                      category: item.category,
                      unit: item.unit,
                      price: item.price,
                    }));
                    if (productModalSupplierId) {
                      await supplierProductApi.batch(productModalSupplierId, productItems);
                      await supplierMaterialApi.batch(productModalSupplierId, materialItems);
                      toast.success('供应商品已保存');
                      setShowProductModal(false);
                      setSelectedProducts([]);
                      setSelectedBundles([]);
                      setSearchKeyword('');
                      setProductModalSupplierId(null);
                    }
                  } catch (error: any) {
                    toast.error(error.response?.data?.message || '保存失败');
                  }
                }}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                保存
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
