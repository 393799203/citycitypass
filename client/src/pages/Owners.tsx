import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ownerApi } from '../api';
import { useOwnerStore } from '../stores/owner';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddressInput from '../components/AddressInput';
import PhoneInput from '../components/PhoneInput';
import { formatPhone, formatAddress } from '../utils/format';
import { provinces, provinceCities } from '../data/region';
import { UserPlus, Pencil, Trash2, X, Loader2, Filter, Power, PowerOff, MapPin, Phone, Package } from 'lucide-react';
import { useConfirm } from '../components/ConfirmProvider';

const defaultProductTags = ['白酒', '啤酒', '葡萄酒', '洋酒', '黄酒', '饮料', '食品'];

interface Owner {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  productTags?: string[];
  warehouseLocation?: string;
  province?: string;
  city?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  status: string;
  isSelfOperated?: boolean;
}

export default function OwnersPage() {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const { setCurrentOwner } = useOwnerStore();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ name: '', province: '', city: '', status: '' });
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    productTags: [] as string[],
    province: '',
    city: '',
    address: '',
    latitude: '',
    longitude: '',
    warehouseLocation: '',
    isSelfOperated: false,
  });
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const res = await ownerApi.list(filters);
      if (res.data.success) {
        setOwners(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleSearch = () => {
    fetchOwners();
    setShowFilters(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error(t('owners.inputOwnerName'));
      return;
    }
    if (!formData.province || !formData.city || !formData.address) {
      toast.error(t('owners.inputCompleteAddress'));
      return;
    }

    try {
      const data = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };
      if (editingId) {
        await ownerApi.update(editingId, data);
        toast.success(t('owners.ownerUpdated'));
      } else {
        const res = await ownerApi.create(data);
        toast.success(t('owners.ownerCreated'));
        if (res.data?.data) {
          setCurrentOwner(res.data.data.id, res.data.data.name);
        }
      }
      setShowModal(false);
      resetForm();
      fetchOwners();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('owners.operationFailed'));
    }
  };

  const handleEdit = (owner: Owner) => {
    setEditingId(owner.id);
    setFormData({
      name: owner.name,
      contact: owner.contact || '',
      phone: owner.phone || '',
      productTags: owner.productTags || [],
      province: owner.province || '',
      city: owner.city || '',
      address: owner.address || '',
      latitude: owner.latitude?.toString() || '',
      longitude: owner.longitude?.toString() || '',
      warehouseLocation: owner.warehouseLocation || '',
      isSelfOperated: owner.isSelfOperated || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: t('owners.deleteConfirm') });
    if (!ok) return;
    try {
      await ownerApi.delete(id);
      toast.success(t('owners.ownerDeleted'));
      fetchOwners();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('owners.deleteFailed'));
    }
  };

  const handleToggleStatus = async (owner: Owner) => {
    const newStatus = owner.status === 'SERVING' ? 'STOPPED' : 'SERVING';
    const action = newStatus === 'STOPPED' ? t('owners.stopService') : t('owners.startService');
    const ok = await confirm({ message: t('owners.confirmAction', { action }) });
    if (!ok) return;
    try {
      await ownerApi.update(owner.id, { status: newStatus });
      toast.success(t('owners.actionSuccess', { action }));
      fetchOwners();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('owners.operationFailed'));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      contact: '',
      phone: '',
      productTags: [],
      province: '',
      city: '',
      address: '',
      latitude: '',
      longitude: '',
      warehouseLocation: '',
      isSelfOperated: false,
    });
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      productTags: prev.productTags.includes(tag)
        ? prev.productTags.filter(t => t !== tag)
        : [...prev.productTags, tag]
    }));
  };

  return (
    <div className="p-2 space-y-6">
      

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{t('owners.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-5 h-5" />
            {t('owners.filter')}
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            <UserPlus className="w-5 h-5" />
            {t('owners.newOwner')}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('owners.ownerName')}</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={t('owners.inputOwnerName')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('owners.province')}</label>
              <select
                value={filters.province}
                onChange={(e) => setFilters({ ...filters, province: e.target.value, city: '' })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">{t('owners.all')}</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('owners.city')}</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={!filters.province}
              >
                <option value="">{t('owners.all')}</option>
                {filters.province && provinceCities[filters.province]?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('owners.status')}</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">{t('owners.all')}</option>
                <option value="SERVING">{t('owners.serving')}</option>
                <option value="STOPPED">{t('owners.stopped')}</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {t('owners.search')}
              </button>
              <button
                onClick={() => { setFilters({ name: '', province: '', city: '', status: '' }); fetchOwners(); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('owners.reset')}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : owners.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl">{t('owners.noData')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {owners.map((owner) => (
            <div key={owner.id} className="border rounded-lg p-4 bg-white hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-lg">{owner.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{owner.name}</h3>
                    {owner.isSelfOperated ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">自营</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">入驻</span>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  owner.status === 'SERVING'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {owner.status === 'SERVING' ? t('owners.serving') : t('owners.stopped')}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {owner.contact && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    {owner.contact} · {owner.phone ? formatPhone(owner.phone) : '-'}
                  </div>
                )}
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>{formatAddress(owner.province, owner.city, owner.address)}</span>
                </div>
                {owner.productTags && owner.productTags.length > 0 && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <Package className="w-4 h-4 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {owner.productTags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 mt-3 border-t">
                <button
                  onClick={() => handleEdit(owner)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-primary-200 text-primary-600 rounded text-sm hover:bg-primary-50"
                >
                  <Pencil className="w-4 h-4" /> {t('owners.edit')}
                </button>
                <button
                  onClick={() => handleToggleStatus(owner)}
                  className={`px-3 py-1.5 rounded text-sm ${
                    owner.status === 'SERVING'
                      ? 'border border-orange-200 text-orange-600 hover:bg-orange-50'
                      : 'border border-green-200 text-green-600 hover:bg-green-50'
                  }`}
                  title={owner.status === 'SERVING' ? t('owners.stopService') : t('owners.startService')}
                >
                  {owner.status === 'SERVING' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(owner.id)}
                  className="px-3 py-1.5 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">{editingId ? t('owners.editOwner') : t('owners.newOwner')}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('owners.ownerName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder={t('owners.inputOwnerName')}
                  />
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="isSelfOperated"
                    checked={formData.isSelfOperated}
                    onChange={(e) => setFormData({ ...formData, isSelfOperated: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isSelfOperated" className="ml-2 text-sm text-gray-700">{t('owners.isSelfOperated')}</label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('owners.contact')}</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder={t('owners.inputContact')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('owners.contactPhone')}</label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('owners.productTags')}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {defaultProductTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        formData.productTags.includes(tag)
                          ? 'bg-blue-600 text-white'
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
                    {t('owners.customTag')}
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
                      className="flex-1 px-3 py-2 border rounded-lg"
                      placeholder={t('owners.inputCustomTag')}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const tag = customTagInput.trim();
                        if (tag && !formData.productTags.includes(tag)) {
                          setFormData(prev => ({
                            ...prev,
                            productTags: [...prev.productTags, tag]
                          }));
                        }
                        setCustomTagInput('');
                        setShowCustomTagInput(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {t('owners.add')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTagInput('');
                        setShowCustomTagInput(false);
                      }}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      {t('owners.cancel')}
                    </button>
                  </div>
                )}
                {formData.productTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.productTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => toggleTag(tag)} className="hover:text-blue-900">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  地址 <span className="text-red-500">*</span>
                </label>
                <AddressInput
                  value={{
                    province: formData.province || '',
                    city: formData.city || '',
                    address: formData.address || '',
                    latitude: formData.latitude || '',
                    longitude: formData.longitude || '',
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

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingId ? t('owners.save') : t('owners.create')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('owners.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
