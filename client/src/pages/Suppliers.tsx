import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Pencil, Trash2, X, Loader2, Users, Phone, MapPin, FileText } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import AddressInput from '../components/AddressInput';
import { supplierApi, supplierContractApi } from '../api';
import { useConfirm } from '../components/ConfirmProvider';

const defaultProductTags = ['白酒', '啤酒', '葡萄酒', '洋酒', '黄酒', '饮料', '食品'];

interface Supplier {
  id: string;
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Supplier>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const { confirm } = useConfirm();

  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [contractForm, setContractForm] = useState<SupplierContract>(defaultContractForm);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierContracts, setSupplierContracts] = useState<SupplierContract[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await supplierApi.list();
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
  }, []);

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
    setFormData(defaultFormData);
    setEditingId(null);
    setCustomTagInput('');
    setShowCustomTagInput(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('请填写供应商名称');
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

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContractId) {
        await supplierContractApi.update(editingContractId, contractForm);
        toast.success('更新成功');
      } else {
        await supplierContractApi.create(contractForm);
        toast.success('创建成功');
      }
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
    <div className="p-6">
      <ToastContainer />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">供应商管理</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" /> 新建供应商
        </button>
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
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="border rounded-lg p-4 bg-white hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <h3 className="font-bold text-lg">{supplier.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{supplier.code}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded font-medium ${getStatusColor(supplier.status)}`}>
                  {supplier.status === 'ACTIVE' ? '启用' : '停用'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {supplier.contact || '-'} · {supplier.phone || '-'}
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>{supplier.province}{supplier.city}{supplier.address}</span>
                </div>
                {supplier.productTags && supplier.productTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t">
                    {supplier.productTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-primary-200 text-primary-600 rounded text-sm hover:bg-primary-50"
                  >
                    <Pencil className="w-4 h-4" /> 编辑
                  </button>
                  <button
                    onClick={() => handleOpenContractModal(supplier)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-green-200 text-green-600 rounded text-sm hover:bg-green-50"
                  >
                    <FileText className="w-4 h-4" /> 合同
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">供应商编码</label>
                  <input
                    type="text"
                    value={formData.code}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                    placeholder="自动生成"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">供应商名称 *</label>
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
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">联系人</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="请输入联系人姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">联系电话</label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">所在地区</label>
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
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold">供应商合同 {selectedSupplier && `- ${selectedSupplier.name}`}</h2>
              <button onClick={() => { setShowContractModal(false); setSelectedSupplier(null); resetContractForm(); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">{editingContractId ? '编辑合同' : '新建合同'}</h3>
                <form onSubmit={handleContractSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">合同名称 *</label>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">开始日期</label>
                      <input
                        type="date"
                        value={contractForm.startDate || ''}
                        onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">结束日期</label>
                      <input
                        type="date"
                        value={contractForm.endDate || ''}
                        onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">合同金额（元）</label>
                      <input
                        type="number"
                        value={contractForm.amount || ''}
                        onChange={(e) => setContractForm({ ...contractForm, amount: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">合同折扣</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={contractForm.discount || ''}
                        onChange={(e) => setContractForm({ ...contractForm, discount: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="如 0.85 表示 85 折"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">服务条款</label>
                    <textarea
                      value={contractForm.serviceTerms || ''}
                      onChange={(e) => setContractForm({ ...contractForm, serviceTerms: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">特殊条款</label>
                    <textarea
                      value={contractForm.specialTerms || ''}
                      onChange={(e) => setContractForm({ ...contractForm, specialTerms: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={resetContractForm} className="px-4 py-2 border rounded-lg">取消</button>
                    <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                      {editingContractId ? '更新' : '创建'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-2">合同列表</h3>
                {supplierContracts.length > 0 ? (
                  <div className="space-y-2">
                    {supplierContracts.map(contract => (
                      <div key={contract.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{contract.name}</span>
                              <span className={`px-2 py-0.5 text-xs rounded ${getContractStatusColor(contract.status)}`}>
                                {getContractStatusText(contract.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">编号: {contract.contractNo}</p>
                            {contract.amount && (
                              <p className="text-sm text-gray-500">金额: ¥{contract.amount}</p>
                            )}
                            {contract.startDate && contract.endDate && (
                              <p className="text-sm text-gray-500">
                                有效期: {contract.startDate.split('T')[0]} ~ {contract.endDate.split('T')[0]}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditContract(contract)}
                              className="px-3 py-1 text-sm border border-primary-200 text-primary-600 rounded hover:bg-primary-50"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteContract(contract.id)}
                              className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">暂无合同</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
