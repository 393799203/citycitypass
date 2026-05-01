import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Pencil, Trash2, X, Loader2, Users, FileText, MapPin, Phone, Clock } from 'lucide-react';
import AddressInput from '../components/AddressInput';
import PhoneInput from '../components/PhoneInput';
import { formatPhone, formatAddress } from '../utils/format';
import { useConfirm } from '../components/ConfirmProvider';
import OwnerStamp from '../components/OwnerStamp';
import { useOwnerStore } from '../stores/owner';
import { usePermission } from '../hooks/usePermission';
import { customerApi, contractApi, uploadApi } from '../api';

interface Customer {
  id: string;
  ownerId?: string;
  owner?: { id: string; name: string };
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
  shopUsers?: ShopUser[];
}

interface ShopUser {
  id: string;
  nickname?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  createdAt: string;
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
  ownerId: '',
};

export default function CustomersPage() {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const { currentOwnerId, owners } = useOwnerStore();
  const { canWrite } = usePermission('config', 'customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterOwner, setFilterOwner] = useState(currentOwnerId || '');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractView, setContractView] = useState<'list' | 'form'>('list');
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
      const params: any = {};
      if (filters.channel) params.channel = filters.channel;
      if (filters.level) params.level = filters.level;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const res = await customerApi.list(params);
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [filterOwner]);

  useEffect(() => {
    fetchCustomers();
  }, [filters]);

  const resetForm = () => {
    setFormData({ ...defaultFormData, ownerId: filterOwner });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('customer.inputCustomerName'));
      return;
    }
    if (!formData.contact.trim()) {
      toast.error(t('customer.inputContact'));
      return;
    }
    if (!formData.phone.trim()) {
      toast.error(t('customer.inputPhone'));
      return;
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      toast.error(t('customer.inputCorrectPhone'));
      return;
    }
    if (!formData.province || !formData.city || !formData.address.trim()) {
      toast.error(t('customer.inputCompleteAddress'));
      return;
    }
    
    try {
      if (editingId) {
        await customerApi.update(editingId, formData);
        toast.success(t('customer.updateSuccess'));
      } else {
        await customerApi.create(formData);
        toast.success(t('customer.createSuccess'));
      }
      setShowModal(false);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('customer.operationFailed'));
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
    const ok = await confirm({ message: t('customer.deleteConfirm') });
    if (!ok) return;
    try {
      await customerApi.delete(id);
      toast.success(t('customer.deleteSuccess'));
      fetchCustomers();
    } catch (error) {
      toast.error(t('customer.deleteFailed'));
    }
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractForm.name.trim()) {
      toast.error(t('customer.inputContractName'));
      return;
    }
    if (!contractForm.startDate) {
      toast.error(t('customer.selectStartDate'));
      return;
    }
    if (!contractForm.endDate) {
      toast.error(t('customer.selectEndDate'));
      return;
    }
    if (contractForm.startDate > contractForm.endDate) {
      toast.error(t('customer.endDateBeforeStart'));
      return;
    }
    
    try {
      if (editingContractId) {
        await contractApi.update(editingContractId, contractForm);
        toast.success(t('customer.contractUpdateSuccess'));
      } else {
        await contractApi.create(contractForm);
        toast.success(t('customer.contractCreateSuccess'));
      }
      setShowContractModal(false);
      setContractView('list');
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
    } catch (error) {
      toast.error(t('customer.contractOperationFailed'));
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
      pricingTerms: contract.pricingTerms || '',
      serviceTerms: contract.serviceTerms || '',
      specialTerms: contract.specialTerms || '',
      status: contract.status as any,
      autoRenew: contract.autoRenew || false,
      fileUrl: contract.fileUrl || '',
      fileName: contract.fileName || '',
      fileSize: contract.fileSize || 0,
    });
    setEditingContractId(contract.id);
    setContractView('form');
  };

  const handleDeleteContract = async (id: string) => {
    const ok = await confirm({ message: t('customer.contractDeleteConfirm') });
    if (!ok) return;
    try {
      await contractApi.delete(id);
      toast.success(t('customer.contractDeleteSuccess'));
      fetchCustomers();
    } catch (error) {
      toast.error(t('customer.contractDeleteFailed'));
    }
  };

  const handleUnbindShopUser = async (customerId: string, shopUserId: string) => {
    const ok = await confirm({ message: t('customer.unbindUserConfirm') });
    if (!ok) return;
    try {
      await customerApi.unbindShopUser(customerId, shopUserId);
      toast.success(t('customer.unbindUserSuccess'));
      fetchCustomers();
    } catch (error) {
      toast.error(t('customer.unbindUserFailed'));
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
    <div className="p-2 space-y-6">
      
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('customer.title')}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {t('customer.customerCount')}: {customers.length}
          </span>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            disabled={!filterOwner || !canWrite}
            title={!filterOwner ? t('customer.pleaseSelectOwner') : !canWrite ? t('customer.noPermission') : ''}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              filterOwner && canWrite
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" /> {t('customer.newCustomer')}
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder={t('customer.searchPlaceholder')}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm w-48"
        />
        <select
          value={filters.channel}
          onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">{t('customer.allChannels')}</option>
          <option value="电商">{t('customer.channelEcommerce')}</option>
          <option value="线下门店">{t('customer.channelOffline')}</option>
          <option value="批发商">{t('customer.channelWholesale')}</option>
        </select>
        <select
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">{t('customer.allLevels')}</option>
          <option value="VIP">{t('customer.levelVIP')}</option>
          <option value="NORMAL">{t('customer.levelNormal')}</option>
          <option value="POTENTIAL">{t('customer.levelPotential')}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{t('customer.noCustomer')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <div key={customer.id} className="border rounded-lg p-4 bg-white hover:shadow-lg transition-all relative">
              {customer.owner?.name && (
                <OwnerStamp name={customer.owner.name} />
              )}
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
                    {customer.level === 'VIP' ? t('customer.levelVIP') : customer.level === 'POTENTIAL' ? t('customer.levelPotential') : t('customer.levelNormal')}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded font-medium ${getStatusColor(customer.status)}`}>
                    {customer.status === 'ACTIVE' ? t('customer.statusActive') : customer.status === 'INACTIVE' ? t('customer.statusInactive') : t('customer.statusBlacklisted')}
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
                    {t('customer.deliveryTime')}: {customer.deliveryStartTime || '--'}-{customer.deliveryEndTime || '--'}
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-primary-200 text-primary-600 rounded text-sm hover:bg-primary-50"
                  >
                    <Pencil className="w-4 h-4" /> {t('customer.edit')}
                  </button>
                  <button
                    onClick={() => { setSelectedCustomer(customer); setShowContractModal(true); setContractForm({ ...contractForm, customerId: customer.id }); }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-green-200 text-green-600 rounded text-sm hover:bg-green-50"
                  >
                    <FileText className="w-4 h-4" /> {t('customer.contractAndUsers')}
                  </button>
                  {canWrite && (
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? t('customer.editCustomerTitle') : t('customer.createCustomerTitle')}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('customer.customerName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('customer.channel')}</label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">{t('customer.selectChannel')}</option>
                    <option value="电商">{t('customer.channelEcommerce')}</option>
                    <option value="线下门店">{t('customer.channelOffline')}</option>
                    <option value="批发商">{t('customer.channelWholesale')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('customer.level')}</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="NORMAL">{t('customer.levelNormal')}</option>
                    <option value="VIP">{t('customer.levelVIP')}</option>
                    <option value="POTENTIAL">{t('customer.levelPotential')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('customer.contactRequired')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('customer.phoneRequired')} <span className="text-red-500">*</span>
                  </label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    className="w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('customer.deliveryAddress')} <span className="text-red-500">*</span>
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

              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-blue-700">{t('customer.deliverySettings')}</label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('customer.deliveryStartTime')}</label>
                    <input
                      type="time"
                      value={formData.deliveryStartTime}
                      onChange={(e) => setFormData({ ...formData, deliveryStartTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('customer.deliveryEndTime')}</label>
                    <input
                      type="time"
                      value={formData.deliveryEndTime}
                      onChange={(e) => setFormData({ ...formData, deliveryEndTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('customer.specialRequirements')}</label>
                    <input
                      type="text"
                      value={formData.specialRequirements}
                      onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                      placeholder={t('customer.specialRequirementsPlaceholder')}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 space-y-4">
                <label className="block text-sm font-medium text-purple-700">{t('customer.signatureRules')}</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.inspectionRequired}
                      onChange={(e) => setFormData({ ...formData, inspectionRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{t('customer.needInspection')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.certificateRequired}
                      onChange={(e) => setFormData({ ...formData, certificateRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{t('customer.needCertificate')}</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('customer.signatureNote')}</label>
                  <input
                    type="text"
                    value={formData.signatureNote}
                    onChange={(e) => setFormData({ ...formData, signatureNote: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder={t('customer.signatureNotePlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('customer.remark')}</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 border rounded-lg">{t('customer.cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg">{t('customer.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showContractModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold">{t('customer.contractAndUsers')} - {selectedCustomer.name}</h2>
              <button onClick={() => { setShowContractModal(false); setContractView('list'); setEditingContractId(null); setSelectedCustomer(null); setContractForm({ contractNo: '', name: '', customerId: '', startDate: '', endDate: '', amount: '', discount: '', pricingTerms: '', serviceTerms: '', specialTerms: '', status: 'DRAFT' as const, autoRenew: false, fileUrl: '', fileName: '', fileSize: 0 }); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {contractView === 'list' ? (
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">{t('customer.contractList')} {selectedCustomer.contracts?.length || 0}/1</h3>
                  {canWrite && (!selectedCustomer.contracts || selectedCustomer.contracts.length === 0) && (
                    <button
                      onClick={() => { setContractForm({ ...contractForm, customerId: selectedCustomer.id }); setContractView('form'); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                    >
                      <Plus className="w-4 h-4" /> {t('customer.newContract')}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedCustomer.contracts && selectedCustomer.contracts.length > 0 ? (
                    selectedCustomer.contracts.map(contract => (
                      <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{contract.name} ({contract.contractNo})</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                            <span>{contract.startDate?.split('T')[0]} ~ {contract.endDate?.split('T')[0]}</span>
                            {contract.amount && <span className="text-blue-600 font-medium">¥{contract.amount}</span>}
                            {contract.discount && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">{Number(contract.discount) * 100}折</span>}
                          </div>
                          {contract.fileName && (
                            <a href={contract.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                              📎 {contract.fileName}
                            </a>
                          )}
                          <span className={`inline-block px-2 py-0.5 text-xs rounded mt-1 ${
                            contract.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                            contract.status === 'EXPIRED' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {contract.status === 'ACTIVE' ? t('customer.contractActive') : contract.status === 'EXPIRED' ? t('customer.contractExpired') : contract.status}
                          </span>
                        </div>
                        {canWrite && (
                          <div className="flex gap-2">
                            <button onClick={() => { setContractForm({ contractNo: contract.contractNo, name: contract.name, customerId: contract.customerId, startDate: contract.startDate?.split('T')[0] || '', endDate: contract.endDate?.split('T')[0] || '', amount: contract.amount?.toString() || '', discount: contract.discount?.toString() || '', pricingTerms: contract.pricingTerms || '', serviceTerms: contract.serviceTerms || '', specialTerms: contract.specialTerms || '', status: contract.status as any, autoRenew: contract.autoRenew || false, fileUrl: contract.fileUrl || '', fileName: contract.fileName || '', fileSize: contract.fileSize || 0 }); setEditingContractId(contract.id); setContractView('form'); }} className="text-primary-600 hover:bg-primary-50 p-2 rounded">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteContract(contract.id)} className="text-red-600 hover:bg-red-50 p-2 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">{t('customer.noContract')}</div>
                  )}
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">{t('customer.relatedUsers')}</h3>
                  </div>
                  {selectedCustomer.shopUsers && selectedCustomer.shopUsers.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCustomer.shopUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-medium">{(user.nickname || user.name || 'U').charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{user.nickname || user.name || '未命名用户'}</div>
                              <div className="text-sm text-gray-500">
                                {user.phone ? <span>手机: {user.phone}</span> : <span>ID: {user.id}</span>}
                              </div>
                            </div>
                          </div>
                          {canWrite && (
                            <button onClick={() => handleUnbindShopUser(selectedCustomer.id, user.id)} className="text-red-600 hover:bg-red-50 p-2 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">{t('customer.noRelatedUsers')}</div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleContractSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-3 gap-4">
                  <div className="hidden">
                    <input type="text" value={contractForm.contractNo} onChange={(e) => setContractForm({ ...contractForm, contractNo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('customer.contractName')} <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={contractForm.name} onChange={(e) => setContractForm({ ...contractForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('customer.contractStatus')}</label>
                    <select value={contractForm.status} onChange={(e) => setContractForm({ ...contractForm, status: e.target.value as any })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="DRAFT">{t('customer.contractDraft')}</option>
                      <option value="PENDING">{t('customer.contractPending')}</option>
                      <option value="ACTIVE">{t('customer.contractActive')}</option>
                      <option value="EXPIRED">{t('customer.contractExpired')}</option>
                      <option value="TERMINATED">{t('customer.contractTerminated')}</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="autoRenew" checked={contractForm.autoRenew} onChange={(e) => setContractForm({ ...contractForm, autoRenew: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                    <label htmlFor="autoRenew" className="text-sm cursor-pointer">{t('customer.autoRenew')}</label>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('customer.startDate')} <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('customer.endDate')} <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('customer.contractAmount')}</label>
                    <input type="number" value={contractForm.amount} onChange={(e) => setContractForm({ ...contractForm, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder={t('customer.amountPlaceholder')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('customer.discount')}</label>
                    <input type="number" step="0.01" min="0" max="1" value={contractForm.discount} onChange={(e) => setContractForm({ ...contractForm, discount: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder={t('customer.discountPlaceholder')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('customer.serviceTerms')}</label>
                    <textarea value={contractForm.serviceTerms} onChange={(e) => setContractForm({ ...contractForm, serviceTerms: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder={t('customer.serviceTermsPlaceholder')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('customer.specialTerms')}</label>
                    <textarea value={contractForm.specialTerms} onChange={(e) => setContractForm({ ...contractForm, specialTerms: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder={t('customer.specialTermsPlaceholder')} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('customer.contractFile')}</label>
                  <div className="flex items-center gap-4">
                    <input type="file" id="contract-file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await uploadApi.contract(formData);
                        if (res.data.success) {
                          setContractForm({ ...contractForm, fileUrl: res.data.data.fileUrl, fileName: res.data.data.fileName, fileSize: res.data.data.fileSize });
                          toast.success(t('customer.uploadSuccess'));
                        } else {
                          toast.error(res.data.message || t('customer.uploadFailed'));
                        }
                      } catch (error) {
                        toast.error(t('customer.uploadFailed'));
                      } finally {
                        setUploading(false);
                      }
                    }} className="hidden" />
                    <label htmlFor="contract-file" className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg text-sm cursor-pointer hover:bg-primary-50">
                      {uploading ? t('customer.uploading') : t('customer.selectFile')}
                    </label>
                    {contractForm.fileName && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{contractForm.fileName}</span>
                        {contractForm.fileSize && <span className="text-xs text-gray-400">({(contractForm.fileSize / 1024).toFixed(1)} KB)</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => { setContractView('list'); setEditingContractId(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{t('customer.cancel')}</button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{t('customer.save')}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
