import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ownerApi } from '../api';
import { toast } from 'react-toastify';
import PhoneInput from './PhoneInput';
import AddressInput from './AddressInput';

interface OwnerFormData {
  name: string;
  contact: string;
  phone: string;
  productTags: string[];
  province: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  warehouseLocation: string;
  isSelfOperated: boolean;
}

interface OwnerModalProps {
  open: boolean;
  editingOwner?: {
    id: string;
    name: string;
    contact?: string;
    phone?: string;
    productTags?: string[];
    province?: string;
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    warehouseLocation?: string;
    isSelfOperated?: boolean;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const defaultProductTags = ['生鲜', '食品', '医药', '服装', '电器', '家具', '美妆', '母婴', '建材', '日用品', '箱包', '玩具', '车品', '其他'];

export default function OwnerModal({ open, editingOwner, onClose, onSuccess }: OwnerModalProps) {
  const [formData, setFormData] = useState<OwnerFormData>({
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
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingOwner) {
        setFormData({
          name: editingOwner.name,
          contact: editingOwner.contact || '',
          phone: editingOwner.phone || '',
          productTags: editingOwner.productTags || [],
          province: editingOwner.province || '',
          city: editingOwner.city || '',
          address: editingOwner.address || '',
          latitude: editingOwner.latitude?.toString() || '',
          longitude: editingOwner.longitude?.toString() || '',
          warehouseLocation: editingOwner.warehouseLocation || '',
          isSelfOperated: editingOwner.isSelfOperated || false,
        });
      } else {
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
      }
      setShowCustomTagInput(false);
      setCustomTagInput('');
    }
  }, [open, editingOwner]);

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      productTags: prev.productTags.includes(tag)
        ? prev.productTags.filter(t => t !== tag)
        : [...prev.productTags, tag]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('请输入主体名称');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };
      if (editingOwner) {
        await ownerApi.update(editingOwner.id, payload);
        toast.success('主体已更新');
      } else {
        await ownerApi.create(payload);
        toast.success('主体已创建');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{editingOwner ? '编辑主体' : '新增主体'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                主体名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="请输入主体名"
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
              <label htmlFor="isSelfOperated" className="ml-2 text-sm text-gray-700">是否自营</label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="请输入负责人"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">负责人电话</label>
              <PhoneInput
                value={formData.phone}
                onChange={(val) => setFormData({ ...formData, phone: val })}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">货物名称（标签）</label>
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
                  className="flex-1 px-3 py-2 border rounded-lg"
                  placeholder="输入标签名称后按回车"
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
                  添加
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomTagInput('');
                    setShowCustomTagInput(false);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
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
            <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
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
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : (editingOwner ? '保存' : '创建')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
