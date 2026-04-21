import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Truck, Plus, Pencil, Trash2, X, Loader2, CheckCircle, XCircle, Car, Phone, MapPin, FileText, Edit } from 'lucide-react';
import { carrierApi } from '../api';
import { useConfirm } from '../components/ConfirmProvider';
import OwnerStamp from '../components/OwnerStamp';
import { usePermission } from '../hooks/usePermission';
import { useAuthStore } from '../stores/auth';
import PhoneInput from '../components/PhoneInput';
import LicensePlateInput from '../components/LicensePlateInput';
import { useOwnerStore } from '../stores/owner';
import { formatPhone } from '../utils/format';

interface Carrier {
  id: string;
  code: string;
  name: string;
  type: 'INDIVIDUAL' | 'COMPANY';
  level: 'A' | 'B' | 'C';
  businessLicenseNo?: string;
  transportLicenseNo?: string;
  serviceTypes: string[];
  coverageAreas: string[];
  vehicleTypes: string[];
  contact?: string;
  phone?: string;
  province?: string;
  city?: string;
  address?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  contracts?: CarrierContract[];
  vehicles?: CarrierVehicle[];
  remark?: string;
  createdAt: string;
  owner?: { id: string; name: string };
}

interface CarrierContract {
  id: string;
  carrierId: string;
  contractNo: string;
  name: string;
  startDate: string;
  endDate: string;
  serviceTerms?: string;
  priceTerms?: string;
  amount?: number;
  deposit?: number;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  fileUrl?: string;
}

interface CarrierVehicle {
  id: string;
  carrierId: string;
  licensePlate: string;
  vehicleType: string;
  brand?: string;
  model?: string;
  capacity?: number;
  volume?: number;
  licenseNo?: string;
  insuranceNo?: string;
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE' | 'DISABLED';
  location?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  remark?: string;
}

const serviceTypeOptions = ['长途运输', '短途配送', '冷链运输', '危险品运输', '大件运输', '快递服务'];
const vehicleTypeOptions = ['小型货车', '中型货车', '大型货车', '平板车', '厢式货车', '冷藏车'];
const levelOptions = [
  { value: 'A', label: 'A - 优质', color: 'bg-green-100 text-green-700' },
  { value: 'B', label: 'B - 良好', color: 'bg-blue-100 text-blue-700' },
  { value: 'C', label: 'C - 合格', color: 'bg-gray-100 text-gray-700' },
];

export default function CarriersPage() {
  const { currentOwnerId } = useOwnerStore();
  const { canWrite } = usePermission('config', 'carriers');
  const { confirm } = useConfirm();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showVehicleListModal, setShowVehicleListModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [vehicleCarrier, setVehicleCarrier] = useState<Carrier | null>(null);
  const [carrierFilters, setCarrierFilters] = useState({ status: '', level: '', search: '', ownerId: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts'>('overview');

  const [formData, setFormData] = useState({
    name: '',
    type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'COMPANY',
    level: 'C' as 'A' | 'B' | 'C',
    businessLicenseNo: '',
    transportLicenseNo: '',
    serviceTypes: [] as string[],
    coverageAreas: [] as string[],
    vehicleTypes: [] as string[],
    contact: '',
    phone: '',
    province: '',
    city: '',
    address: '',
    remark: '',
  });

  const [contractForm, setContractForm] = useState({
    contractNo: '',
    name: '',
    startDate: '',
    endDate: '',
    serviceTerms: '',
    priceTerms: '',
    amount: '',
    deposit: '',
  });

  const [vehicleForm, setVehicleForm] = useState({
    licensePlate: '',
    vehicleType: '',
    brand: '',
    model: '',
    capacity: '',
    volume: '',
    licenseNo: '',
    insuranceNo: '',
  });

  const fetchCarriers = async () => {
    setLoading(true);
    try {
      const { ownerId, ...filters } = carrierFilters;
      const params: any = { ...filters };
      const res = await carrierApi.list(params);
      if (res.data.success) {
        setCarriers(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarriers();
  }, [carrierFilters, currentOwnerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('请输入承运商名称');
      return;
    }
    if (!currentOwnerId) {
      toast.error('请先选择主体');
      return;
    }

    try {
      const data = { ...formData, ownerId: currentOwnerId };

      if (editingId) {
        await carrierApi.update(editingId, data);
        toast.success('更新成功');
      } else {
        await carrierApi.create(data);
        toast.success('创建成功');
      }
      setShowModal(false);
      resetForm();
      fetchCarriers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleEdit = (carrier: Carrier) => {
    setEditingId(carrier.id);
    setFormData({
      name: carrier.name,
      type: carrier.type,
      level: carrier.level,
      businessLicenseNo: carrier.businessLicenseNo || '',
      transportLicenseNo: carrier.transportLicenseNo || '',
      serviceTypes: carrier.serviceTypes || [],
      coverageAreas: carrier.coverageAreas || [],
      vehicleTypes: carrier.vehicleTypes || [],
      contact: carrier.contact || '',
      phone: carrier.phone || '',
      province: carrier.province || '',
      city: carrier.city || '',
      address: carrier.address || '',
      remark: carrier.remark || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: '确定要删除该承运商吗？' });
    if (!ok) return;
    try {
      await carrierApi.delete(id);
      toast.success('删除成功');
      fetchCarriers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleApprove = async (carrier: Carrier, action: 'approve' | 'reject' | 'suspend') => {
    let message = '';
    if (action === 'approve') message = '确定要审核通过该承运商吗？';
    else if (action === 'reject') message = '确定要拒绝该承运商吗？';
    else message = '确定要暂停该承运商吗？';

    const ok = await confirm({ message });
    if (!ok) return;

    try {
      let rejectionReason = '';
      if (action === 'reject') {
        rejectionReason = await new Promise<string>((resolve) => {
          const reason = prompt('请输入拒绝原因：');
          resolve(reason || '不符合准入条件');
        });
      }

      await carrierApi.approve(carrier.id, { action, rejectionReason });
      toast.success('操作成功');
      fetchCarriers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'INDIVIDUAL',
      level: 'C',
      businessLicenseNo: '',
      transportLicenseNo: '',
      serviceTypes: [],
      coverageAreas: [],
      vehicleTypes: [],
      contact: '',
      phone: '',
      province: '',
      city: '',
      address: '',
      remark: '',
    });
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarrier) return;

    try {
      const data = {
        ...contractForm,
        amount: contractForm.amount ? parseFloat(contractForm.amount) : undefined,
        deposit: contractForm.deposit ? parseFloat(contractForm.deposit) : undefined,
      };

      if (editingContractId) {
        await carrierApi.updateContract(editingContractId, data);
        toast.success('合同更新成功');
        setEditingContractId(null);
      } else {
        await carrierApi.createContract(selectedCarrier.id, data);
        toast.success('合同创建成功');
      }
      setShowContractModal(false);
      setContractForm({ contractNo: '', name: '', startDate: '', endDate: '', serviceTerms: '', priceTerms: '', amount: '', deposit: '' });
      refreshCarrier();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const refreshVehicleCarrier = async () => {
    if (vehicleCarrier) {
      const res = await carrierApi.get(vehicleCarrier.id);
      if (res.data.success) {
        setVehicleCarrier(res.data.data);
      }
    }
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleCarrier) return;

    try {
      if (editingVehicleId) {
        await carrierApi.updateVehicle(editingVehicleId, {
          ...vehicleForm,
          capacity: vehicleForm.capacity ? parseFloat(vehicleForm.capacity) : undefined,
          volume: vehicleForm.volume ? parseFloat(vehicleForm.volume) : undefined,
        });
        toast.success('车辆更新成功');
      } else {
        await carrierApi.createVehicle(vehicleCarrier.id, {
          ...vehicleForm,
          capacity: vehicleForm.capacity ? parseFloat(vehicleForm.capacity) : undefined,
          volume: vehicleForm.volume ? parseFloat(vehicleForm.volume) : undefined,
        });
        toast.success('车辆添加成功');
      }
      setShowVehicleModal(false);
      setShowVehicleListModal(true);
      setVehicleForm({ licensePlate: '', vehicleType: '', brand: '', model: '', capacity: '', volume: '', licenseNo: '', insuranceNo: '' });
      setEditingVehicleId(null);
      refreshVehicleCarrier();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleEditVehicle = (vehicle: any) => {
    setVehicleForm({
      licensePlate: vehicle.licensePlate || '',
      vehicleType: vehicle.vehicleType || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      capacity: vehicle.capacity?.toString() || '',
      volume: vehicle.volume?.toString() || '',
      licenseNo: vehicle.licenseNo || '',
      insuranceNo: vehicle.insuranceNo || '',
    });
    setEditingVehicleId(vehicle.id);
    setShowVehicleListModal(false);
    setShowVehicleModal(true);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!selectedCarrier) return;
    const ok = await confirm({ message: '确定要删除该车辆吗？' });
    if (!ok) return;

    try {
      await carrierApi.deleteVehicle(vehicleId);
      toast.success('删除成功');
      refreshCarrier();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const refreshCarrier = async () => {
    if (selectedCarrier) {
      const res = await carrierApi.get(selectedCarrier.id);
      if (res.data.success) {
        setSelectedCarrier(res.data.data);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">待审核</span>;
      case 'APPROVED':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">已通过</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">已拒绝</span>;
      case 'SUSPENDED':
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">已暂停</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getLevelBadge = (level: string) => {
    const levelConfig = levelOptions.find(l => l.value === level);
    return <span className={`px-2 py-1 rounded-full text-xs ${levelConfig?.color || 'bg-gray-100 text-gray-700'}`}>{levelConfig?.label || level}</span>;
  };

  return (
    <div className="p-2 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">承运商管理</h1>
        <div className="flex gap-2">
          <select
            value={carrierFilters.status}
            onChange={(e) => setCarrierFilters({ ...carrierFilters, status: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">全部状态</option>
            <option value="PENDING">待审核</option>
            <option value="APPROVED">已通过</option>
            <option value="REJECTED">已拒绝</option>
            <option value="SUSPENDED">已暂停</option>
          </select>
          <select
            value={carrierFilters.level}
            onChange={(e) => setCarrierFilters({ ...carrierFilters, level: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">全部等级</option>
            <option value="A">A - 优质</option>
            <option value="B">B - 良好</option>
            <option value="C">C - 合格</option>
          </select>
          <input
            type="text"
            placeholder="搜索承运商"
            value={carrierFilters.search}
            onChange={(e) => setCarrierFilters({ ...carrierFilters, search: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm w-48"
          />
          <button
            onClick={openModal}
            disabled={!currentOwnerId || !canWrite}
            title={!currentOwnerId ? '请先选择主体' : !canWrite ? '无操作权限' : ''}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              currentOwnerId && canWrite
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-5 h-5" />
            新增承运商
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : carriers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>暂无承运商数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carriers.map((carrier) => (
            <div key={carrier.id} className="border rounded-lg p-4 bg-white hover:shadow-lg transition-all relative">
              {carrier.owner?.name && (
                <OwnerStamp name={carrier.owner.name} />
              )}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{carrier.name}</h3>
                    <p className="text-xs text-gray-500">{carrier.code}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(carrier.status)}
                  {getLevelBadge(carrier.level)}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {carrier.contact && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    {carrier.contact} · {formatPhone(carrier.phone || '')}
                  </div>
                )}
                {carrier.province && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    {carrier.province}{carrier.city}{carrier.address}
                  </div>
                )}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>合同: {carrier.contracts?.length || 0}</span>
                  <span>车辆: {carrier.vehicles?.length || 0}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 mt-3 border-t">
                <button
                  onClick={() => { setSelectedCarrier(carrier); setActiveTab('overview'); }}
                  className="flex-1 px-3 py-1.5 border border-primary-200 text-primary-600 rounded text-sm hover:bg-primary-50"
                >
                  查看详情
                </button>
                <button
                  onClick={() => { setVehicleCarrier(carrier); setShowVehicleListModal(true); }}
                  className="px-3 py-1.5 border border-orange-200 text-orange-600 rounded text-sm hover:bg-orange-50"
                >
                  车辆
                </button>
                {canWrite && carrier.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleApprove(carrier, 'approve')}
                      className="px-3 py-1.5 bg-green-100 text-green-600 rounded text-sm hover:bg-green-200"
                      title="审核通过"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleApprove(carrier, 'reject')}
                      className="px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
                      title="拒绝"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                {canWrite && (
                  <>
                    <button
                      onClick={() => handleEdit(carrier)}
                      className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded text-sm hover:bg-gray-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(carrier.id)}
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

      {selectedCarrier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="text-xl font-bold">{selectedCarrier.name}</h2>
                <p className="text-sm text-gray-500">{selectedCarrier.code} · {selectedCarrier.type === 'INDIVIDUAL' ? '个体' : '企业'}</p>
              </div>
              <button onClick={() => setSelectedCarrier(null)} className="p-2 hover:bg-gray-100 rounded-lg">
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
                onClick={() => setActiveTab('contracts')}
                className={`px-6 py-3 text-sm font-medium ${activeTab === 'contracts' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
              >
                合同管理
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-700">资质信息</h3>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">营业执照:</span>
                        <span>{selectedCarrier.businessLicenseNo || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">运输许可证:</span>
                        <span>{selectedCarrier.transportLicenseNo || '-'}</span>
                      </div>
                    </div>

                    <h3 className="font-medium text-gray-700 mt-4">服务能力</h3>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="text-gray-500">服务类型:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedCarrier.serviceTypes?.map((t, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{t}</span>
                          )) || '-'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">可用车型:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedCarrier.vehicleTypes?.map((t, i) => (
                            <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">{t}</span>
                          )) || '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-700">联系信息</h3>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">联系人:</span>
                        <span>{selectedCarrier.contact || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">电话:</span>
                        <span>{selectedCarrier.phone || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">地址:</span>
                        <span>{selectedCarrier.province}{selectedCarrier.city}{selectedCarrier.address || '-'}</span>
                      </div>
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
                        onClick={() => setShowContractModal(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                      >
                        <Plus className="w-4 h-4" /> 添加合同
                      </button>
                    )}
                  </div>
                  {selectedCarrier.contracts && selectedCarrier.contracts.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCarrier.contracts.map((contract) => (
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
                                        contractNo: contract.contractNo,
                                        name: contract.name,
                                        startDate: contract.startDate?.split('T')[0] || '',
                                        endDate: contract.endDate?.split('T')[0] || '',
                                        serviceTerms: contract.serviceTerms || '',
                                        priceTerms: contract.priceTerms || '',
                                        amount: contract.amount?.toString() || '',
                                        deposit: contract.deposit?.toString() || '',
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
                                        await carrierApi.deleteContract(contract.id);
                                        toast.success('删除成功');
                                        refreshCarrier();
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
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">{editingId ? '编辑承运商' : '新增承运商'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">承运商名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="请输入承运商名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INDIVIDUAL' | 'COMPANY' })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="INDIVIDUAL">个体</option>
                    <option value="COMPANY">企业</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">等级</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as 'A' | 'B' | 'C' })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="A">A - 优质</option>
                  <option value="B">B - 良好</option>
                  <option value="C">C - 合格</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">营业执照号</label>
                  <input
                    type="text"
                    value={formData.businessLicenseNo}
                    onChange={(e) => setFormData({ ...formData, businessLicenseNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">运输许可证号</label>
                  <input
                    type="text"
                    value={formData.transportLicenseNo}
                    onChange={(e) => setFormData({ ...formData, transportLicenseNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务类型</label>
                <div className="flex flex-wrap gap-2">
                  {serviceTypeOptions.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          serviceTypes: prev.serviceTypes.includes(type)
                            ? prev.serviceTypes.filter(t => t !== type)
                            : [...prev.serviceTypes, type]
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.serviceTypes.includes(type)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">可用车型</label>
                <div className="flex flex-wrap gap-2">
                  {vehicleTypeOptions.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          vehicleTypes: prev.vehicleTypes.includes(type)
                            ? prev.vehicleTypes.filter(t => t !== type)
                            : [...prev.vehicleTypes, type]
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.vehicleTypes.includes(type)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingId ? '保存' : '创建'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showContractModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">{editingContractId ? '编辑合同' : '添加合同'}</h2>
              <button onClick={() => { setShowContractModal(false); setEditingContractId(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleContractSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">合同名称</label>
                  <input
                    type="text"
                    value={contractForm.name}
                    onChange={(e) => setContractForm({ ...contractForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">合同编号</label>
                  <input
                    type="text"
                    value={contractForm.contractNo}
                    onChange={(e) => setContractForm({ ...contractForm, contractNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                  <input
                    type="date"
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">合同金额</label>
                  <input
                    type="number"
                    value={contractForm.amount}
                    onChange={(e) => setContractForm({ ...contractForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">保证金</label>
                  <input
                    type="number"
                    value={contractForm.deposit}
                    onChange={(e) => setContractForm({ ...contractForm, deposit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务条款</label>
                <textarea
                  value={contractForm.serviceTerms}
                  onChange={(e) => setContractForm({ ...contractForm, serviceTerms: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  {editingContractId ? '保存' : '创建'}
                </button>
                <button type="button" onClick={() => { setShowContractModal(false); setEditingContractId(null); }} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVehicleListModal && vehicleCarrier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">车辆管理 - {vehicleCarrier.name}</h2>
              <button onClick={() => setShowVehicleListModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="flex justify-between mb-4">
                <h3 className="font-medium">车辆列表 ({vehicleCarrier.vehicles?.length || 0})</h3>
                {canWrite && (
                  <button
                    onClick={() => {
                      setEditingVehicleId(null);
                      setVehicleForm({ licensePlate: '', vehicleType: '', brand: '', model: '', capacity: '', volume: '', licenseNo: '', insuranceNo: '' });
                      setShowVehicleListModal(false);
                      setShowVehicleModal(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                  >
                    <Plus className="w-4 h-4" /> 添加车辆
                  </button>
                )}
              </div>
              {vehicleCarrier.vehicles && vehicleCarrier.vehicles.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {vehicleCarrier.vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="border rounded-lg p-3 relative">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Car className="w-5 h-5 text-gray-400" />
                          <div>
                            <h4 className="font-medium">{vehicle.licensePlate}</h4>
                            <p className="text-xs text-gray-500">{vehicle.vehicleType}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            vehicle.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                            vehicle.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                            vehicle.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {vehicle.status === 'AVAILABLE' ? '空闲' :
                             vehicle.status === 'IN_TRANSIT' ? '配送中' :
                             vehicle.status === 'MAINTENANCE' ? '维修' : '停用'}
                          </span>
                          {canWrite && (
                            <>
                              <button
                                onClick={() => handleEditVehicle(vehicle)}
                                className="p-1 hover:bg-gray-100 rounded text-blue-600"
                                title="编辑"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                                className="p-1 hover:bg-gray-100 rounded text-red-600"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 flex gap-3">
                        {vehicle.brand && <span>{vehicle.brand}</span>}
                        {vehicle.capacity && <span>载重: {vehicle.capacity}吨</span>}
                        {vehicle.volume && <span>容积: {vehicle.volume}方</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">暂无车辆</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowVehicleModal(false); setShowVehicleListModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg" title="返回列表">
                  ←
                </button>
                <h2 className="text-xl font-bold">{editingVehicleId ? '编辑车辆' : '添加车辆'}</h2>
              </div>
              <button onClick={() => { setShowVehicleModal(false); setShowVehicleListModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleVehicleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">承运商</label>
                  <input
                    type="text"
                    value={vehicleCarrier?.name || ''}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">车牌号 *</label>
                  <LicensePlateInput
                    value={vehicleForm.licensePlate}
                    onChange={(val) => setVehicleForm({ ...vehicleForm, licensePlate: val })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">车辆类型 *</label>
                  <select
                    value={vehicleForm.vehicleType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">选择车型</option>
                    {vehicleTypeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
                  <input
                    type="text"
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">型号</label>
                  <input
                    type="text"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">载重(吨)</label>
                  <input
                    type="number"
                    value={vehicleForm.capacity}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">容积(方)</label>
                  <input
                    type="number"
                    value={vehicleForm.volume}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, volume: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">行驶证号</label>
                  <input
                    type="text"
                    value={vehicleForm.licenseNo}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, licenseNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">保险单号</label>
                  <input
                    type="text"
                    value={vehicleForm.insuranceNo}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="可选"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                {canWrite && (
                  <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    {editingVehicleId ? '保存' : '添加'}
                  </button>
                )}
                <button type="button" onClick={() => setShowVehicleModal(false)} className={`py-2 border rounded-lg hover:bg-gray-50 ${canWrite ? 'flex-1' : 'w-full'}`}>
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
