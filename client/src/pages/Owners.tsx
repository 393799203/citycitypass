import { useState, useEffect } from 'react';
import { ownerApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddressInput from '../components/AddressInput';
import { provinces, provinceCities } from '../data/region';
import { UserPlus, Pencil, Trash2, X, Loader2, Filter, Power, PowerOff } from 'lucide-react';

const defaultProductTags = ['电子产品', '服装', '食品', '建材', '化工', '医药', '生鲜', '家电', '家具'];

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
        const sortedOwners = [...res.data.data].sort((a, b) => {
          if (a.isSelfOperated === b.isSelfOperated) return 0;
          return a.isSelfOperated ? -1 : 1;
        });
        setOwners(sortedOwners);
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
      toast.error('请输入货主主体');
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
        toast.success('货主更新成功');
      } else {
        await ownerApi.create(data);
        toast.success('货主创建成功');
      }
      setShowModal(false);
      resetForm();
      fetchOwners();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
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
    if (!confirm('确定要删除该货主吗？')) return;
    try {
      await ownerApi.delete(id);
      toast.success('货主已删除');
      fetchOwners();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleToggleStatus = async (owner: Owner) => {
    const newStatus = owner.status === 'SERVING' ? 'STOPPED' : 'SERVING';
    const action = newStatus === 'STOPPED' ? '停止服务' : '开启服务';
    if (!confirm(`确定要${action}该货主吗？`)) return;
    try {
      await ownerApi.update(owner.id, { status: newStatus });
      toast.success(`${action}成功`);
      fetchOwners();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
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
    <div className="space-y-6">
      <ToastContainer />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">货主管理</h1>
        <div className="flex gap-2">
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
            <UserPlus className="w-5 h-5" />
            新增货主
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">货主主体</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="请输入货主主体"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所在省份</label>
              <select
                value={filters.province}
                onChange={(e) => setFilters({ ...filters, province: e.target.value, city: '' })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">全部</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所在城市</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={!filters.province}
              >
                <option value="">全部</option>
                {filters.province && provinceCities[filters.province]?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">全部</option>
                <option value="SERVING">服务中</option>
                <option value="STOPPED">停止服务</option>
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
                onClick={() => { setFilters({ name: '', province: '', city: '', status: '' }); fetchOwners(); }}
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
        ) : owners.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无数据</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">货主主体</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">自营</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">负责人</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">负责人电话</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">货物名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">详细地址</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {owners.map((owner) => (
                <tr key={owner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{owner.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {owner.isSelfOperated ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">是</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">否</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{owner.contact || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{owner.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {owner.productTags?.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                      {(!owner.productTags || owner.productTags.length === 0) && '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {owner.province || owner.city || owner.address ? `${owner.province || ''}${owner.city || ''}${owner.address || ''}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      owner.status === 'SERVING' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {owner.status === 'SERVING' ? '服务中' : '停止服务'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(owner)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(owner)}
                        className={`p-1.5 rounded-lg ${
                          owner.status === 'SERVING'
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={owner.status === 'SERVING' ? '停止服务' : '开启服务'}
                      >
                        {owner.status === 'SERVING' ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(owner.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">{editingId ? '编辑货主' : '新增货主'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    货主主体 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="请输入货主主体"
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
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="请输入电话"
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
