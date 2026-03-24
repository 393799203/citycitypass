import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Pencil, Trash2, X, Loader2, Users, FileText, MapPin, Phone, Clock } from 'lucide-react';
import AddressInput from '../components/AddressInput';
import PhoneInput from '../components/PhoneInput';
import { formatPhone, formatAddress } from '../utils/format';
import { useConfirm } from '../components/ConfirmProvider';

interface Customer {
  id: string;
  code: string;
  name: string;
  channel: string;
  region: string;
  level: 'VIP' | 'NORMAL' | 'POTENTIAL';
  contact: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  deliveryStartTime: string;
  deliveryEndTime: string;
  specialRequirements: string;
  inspectionRequired: boolean;
  certificateRequired: boolean;
  signatureNote: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  remark: string;
  contracts: Contract[];
}

interface Contract {
  id: string;
  contractNo: string;
  name: string;
  customerId: string;
  customer?: Customer;
  startDate: string;
  endDate: string;
  amount: number;
  discount?: number;
  pricingTerms: any;
  serviceTerms: string;
  specialTerms: string;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  autoRenew: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

const defaultFormData: Customer = {
  id: '',
  code: '',
  name: '',
  channel: '',
  region: '',
  level: 'NORMAL',
  contact: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  address: '',
  latitude: '',
  longitude: '',
  deliveryStartTime: '09:00',
  deliveryEndTime: '18:00',
  specialRequirements: '',
  inspectionRequired: true,
  certificateRequired: false,
  signatureNote: '',
  status: 'ACTIVE',
  remark: '',
  contracts: [],
};

export default function CustomersPage() {
  const { confirm } = useConfirm();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [contractForm, setContractForm] = useState({
    contractNo: '',
    name: '',
    customerId: '',
    startDate: '',
    endDate: '',
    amount: '',
    discount: '',
    pricingTerms: '',
    serviceTerms: '',
    specialTerms: '',
    status: 'DRAFT' as const,
    autoRenew: false,
    fileUrl: '',
    fileName: '',
    fileSize: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({ channel: '', level: '', status: '', search: '' });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const params = new URLSearchParams();
      if (filters.channel) params.append('channel', filters.channel);
      if (filters.level) params.append('level', filters.level);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const res = await fetch(`/api/customers?${params}`, { headers });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [filters]);

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? '更新成功' : '创建成功');
        setShowModal(false);
        resetForm();
        fetchCustomers();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      id: customer.id,
      code: customer.code,
      name: customer.name,
      channel: customer.channel || '',
      region: customer.region || '',
      level: customer.level as 'NORMAL' | 'VIP' | 'POTENTIAL',
      contact: customer.contact,
      phone: customer.phone,
      province: customer.province,
      city: customer.city,
      district: customer.district || '',
      address: customer.address,
      latitude: String(customer.latitude || ''),
      longitude: String(customer.longitude || ''),
      deliveryStartTime: customer.deliveryStartTime || '',
      deliveryEndTime: customer.deliveryEndTime || '',
      specialRequirements: customer.specialRequirements || '',
      inspectionRequired: customer.inspectionRequired,
      certificateRequired: customer.certificateRequired,
      signatureNote: customer.signatureNote || '',
      status: customer.status as 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED',
      remark: customer.remark || '',
      contracts: customer.contracts || [],
    });
    setEditingId(customer.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: '确定要删除该客户吗？' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('删除成功');
        fetchCustomers();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingContractId ? `/api/contracts/${editingContractId}` : '/api/contracts';
      const method = editingContractId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingContractId ? '更新成功' : '创建成功');
        setShowContractModal(false);
        setEditingContractId(null);
        setContractForm({
          contractNo: '',
          name: '',
          customerId: '',
          startDate: '',
          endDate: '',
          amount: '',
          discount: '',
          pricingTerms: '',
          serviceTerms: '',
          specialTerms: '',
          status: 'DRAFT' as const,
          autoRenew: false,
          fileUrl: '',
          fileName: '',
          fileSize: 0,
        });
        fetchCustomers();
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleEditContract = (contract: Contract) => {
    setContractForm({
      contractNo: contract.contractNo,
      name: contract.name,
      customerId: contract.customerId,
      startDate: contract.startDate?.split('T')[0] || '',
      endDate: contract.endDate?.split('T')[0] || '',
      amount: contract.amount?.toString() || '',
      discount: contract.discount?.toString() || '',
      pricingTerms: contract.pricingTerms ? JSON.stringify(contract.pricingTerms) : '',
      serviceTerms: contract.serviceTerms || '',
      specialTerms: contract.specialTerms || '',
      status: contract.status as 'DRAFT',
      autoRenew: contract.autoRenew || false,
      fileUrl: contract.fileUrl || '',
      fileName: contract.fileName || '',
      fileSize: contract.fileSize || 0,
    });
    setEditingContractId(contract.id);
    setShowContractModal(true);
  };

  const handleDeleteContract = async (id: string) => {
    const ok = await confirm({ message: '确定要删除该合同吗？' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('删除成功');
        fetchCustomers();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'VIP': return 'bg-purple-100 text-purple-700';
      case 'POTENTIAL': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'INACTIVE': return 'bg-gray-100 text-gray-700';
      case 'BLACKLISTED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6">
      <ToastContainer />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">客户管理</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" /> 新建客户
        </button>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="搜索客户名称/编码/联系人"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm w-48"
        />
        <select
          value={filters.channel}
          onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">全部渠道</option>
          <option value="电商">电商</option>
          <option value="线下门店">线下门店</option>
          <option value="批发商">批发商</option>
        </select>
        <select
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">全部等级</option>
          <option value="VIP">VIP</option>
          <option value="NORMAL">普通</option>
          <option value="POTENTIAL">潜在</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <div key={customer.id} className="border rounded-lg p-4 bg-white hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <h3 className="font-bold text-lg">{customer.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{customer.code}</p>
                </div>
                <div className="flex gap-1">
                  <span className={`px-2 py-1 text-xs rounded font-medium ${getLevelColor(customer.level)}`}>
                    {customer.level === 'VIP' ? 'VIP' : customer.level === 'POTENTIAL' ? '潜在' : '普通'}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded font-medium ${getStatusColor(customer.status)}`}>
                    {customer.status === 'ACTIVE' ? '活跃' : customer.status === 'INACTIVE' ? '不活跃' : '黑名单'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {customer.contact} · {formatPhone(customer.phone)}
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>{formatAddress(customer.province, customer.city, customer.address, customer.district)}</span>
                </div>
                {(customer.deliveryStartTime || customer.deliveryEndTime) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    配送时间: {customer.deliveryStartTime || '--'}-{customer.deliveryEndTime || '--'}
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-primary-200 text-primary-600 rounded text-sm hover:bg-primary-50"
                  >
                    <Pencil className="w-4 h-4" /> 编辑
                  </button>
                  <button
                    onClick={() => { setSelectedCustomer(customer); setShowContractModal(true); setContractForm({ ...contractForm, customerId: customer.id }); }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-green-200 text-green-600 rounded text-sm hover:bg-green-50"
                  >
                    <FileText className="w-4 h-4" /> 合同
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {customer.contracts && customer.contracts.length > 0 && (
                  <div className="text-xs text-purple-600 pt-2 border-t">
                    有效合同: {customer.contracts.length}份
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? '编辑客户' : '新建客户'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">客户名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">渠道</label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">选择渠道</option>
                    <option value="电商">电商</option>
                    <option value="线下门店">线下门店</option>
                    <option value="批发商">批发商</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">客户等级</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="NORMAL">普通</option>
                    <option value="VIP">VIP</option>
                    <option value="POTENTIAL">潜在</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">联系人 *</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">联系电话 *</label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">配送地址</label>
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

              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-blue-700">配送设置</label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">配送开始时间</label>
                    <input
                      type="time"
                      value={formData.deliveryStartTime}
                      onChange={(e) => setFormData({ ...formData, deliveryStartTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">配送结束时间</label>
                    <input
                      type="time"
                      value={formData.deliveryEndTime}
                      onChange={(e) => setFormData({ ...formData, deliveryEndTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">特殊要求</label>
                    <input
                      type="text"
                      value={formData.specialRequirements}
                      onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                      placeholder="如：夜间配送"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 space-y-4">
                <label className="block text-sm font-medium text-purple-700">签收规则</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.inspectionRequired}
                      onChange={(e) => setFormData({ ...formData, inspectionRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">需要验货</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.certificateRequired}
                      onChange={(e) => setFormData({ ...formData, certificateRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">需要凭证</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">签收备注</label>
                  <input
                    type="text"
                    value={formData.signatureNote}
                    onChange={(e) => setFormData({ ...formData, signatureNote: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="验货/凭证的特殊要求说明"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">备注</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 border rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showContractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">合同管理 {selectedCustomer && `- ${selectedCustomer.name}`}</h2>
              <button onClick={() => { setShowContractModal(false); setEditingContractId(null); setSelectedCustomer(null); setContractForm({ contractNo: '', name: '', customerId: '', startDate: '', endDate: '', amount: '', discount: '', pricingTerms: '', serviceTerms: '', specialTerms: '', status: 'DRAFT' as const, autoRenew: false, fileUrl: '', fileName: '', fileSize: 0 }); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleContractSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="hidden">
                  <input
                    type="text"
                    value={contractForm.contractNo}
                    onChange={(e) => setContractForm({ ...contractForm, contractNo: e.target.value })}
                  />
                </div>
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
                    onChange={(e) => setContractForm({ ...contractForm, status: e.target.value as any })}
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
                  <label className="block text-sm font-medium mb-1">开始日期 *</label>
                  <input
                    type="date"
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">结束日期 *</label>
                  <input
                    type="date"
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">合同金额（元）</label>
                  <input
                    type="number"
                    value={contractForm.amount}
                    onChange={(e) => setContractForm({ ...contractForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">合同折扣（如 0.85 表示 85 折）</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={contractForm.discount}
                    onChange={(e) => setContractForm({ ...contractForm, discount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="不填则不打折"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={contractForm.autoRenew}
                    onChange={(e) => setContractForm({ ...contractForm, autoRenew: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">自动续约</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">服务条款</label>
                <textarea
                  value={contractForm.serviceTerms}
                  onChange={(e) => setContractForm({ ...contractForm, serviceTerms: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="描述服务范围、质量标准等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">特殊条款</label>
                <textarea
                  value={contractForm.specialTerms}
                  onChange={(e) => setContractForm({ ...contractForm, specialTerms: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="差异化条款、特殊约定等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">合同文件</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="contract-file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await fetch('/api/upload/contract', {
                          method: 'POST',
                          body: formData,
                        });
                        const data = await res.json();
                        if (data.success) {
                          setContractForm({
                            ...contractForm,
                            fileUrl: data.data.fileUrl,
                            fileName: data.data.fileName,
                            fileSize: data.data.fileSize,
                          });
                          toast.success('上传成功');
                        } else {
                          toast.error(data.message || '上传失败');
                        }
                      } catch (error) {
                        toast.error('上传失败');
                      } finally {
                        setUploading(false);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="contract-file"
                    className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg text-sm cursor-pointer hover:bg-primary-50"
                  >
                    {uploading ? '上传中...' : '选择文件'}
                  </label>
                  {contractForm.fileName && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{contractForm.fileName}</span>
                      {contractForm.fileSize && (
                        <span className="text-xs text-gray-400">
                          ({(contractForm.fileSize / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => { setShowContractModal(false); setEditingContractId(null); }} className="px-4 py-2 border rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg">保存</button>
              </div>
            </form>

            {selectedCustomer && (
              <div className="p-4 border-t">
                <h3 className="font-medium mb-3">该客户的合同列表</h3>
                <div className="space-y-2">
                  {customers.find(c => c.id === selectedCustomer.id)?.contracts?.map(contract => (
                    <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{contract.name} ({contract.contractNo})</div>
                        <div className="text-sm text-gray-500">
                          {contract.startDate?.split('T')[0]} ~ {contract.endDate?.split('T')[0]}
                          {contract.amount && ` · ¥${contract.amount}`}
                        </div>
                        {contract.fileName && (
                          <a
                            href={contract.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:underline mt-1 inline-block"
                          >
                            📎 {contract.fileName}
                          </a>
                        )}
                        <span className={`inline-block px-2 py-0.5 text-xs rounded mt-1 ${
                          contract.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          contract.status === 'EXPIRED' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {contract.status === 'ACTIVE' ? '生效中' : contract.status === 'EXPIRED' ? '已过期' : contract.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditContract(contract)} className="text-primary-600 hover:bg-primary-50 p-2 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteContract(contract.id)} className="text-red-600 hover:bg-red-50 p-2 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!customers.find(c => c.id === selectedCustomer.id)?.contracts || customers.find(c => c.id === selectedCustomer.id)?.contracts?.length === 0) && (
                    <div className="text-center text-gray-500 py-4">暂无合同</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
