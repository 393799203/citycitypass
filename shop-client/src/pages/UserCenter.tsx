import { useState, useEffect } from 'react';
import { User, MapPin, LogOut, Gift, X, ClipboardList, Loader2 } from 'lucide-react';
import { shopApi, getShopUser, setShopUser, clearShopUser } from '@/api/shop';
import { toast } from 'react-toastify';
import PhoneInput from '@/components/PhoneInput';
import RegionPicker from '@/components/RegionPicker';

interface ShopUser {
  id: string;
  nickname: string;
  avatar?: string;
  phone?: string;
  customer?: any;
  hasDiscount?: boolean;
  discountRate?: number;
  addresses?: Address[];
}

interface Address {
  id: string;
  receiver: string;
  phone: string;
  province: string;
  city: string;
  district?: string;
  address: string;
  label?: string;
  isDefault: boolean;
}

export default function UserCenter({ onClose }: { onClose: () => void }) {
  const [user, setUser] = useState<ShopUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showBindCustomer, setShowBindCustomer] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [customerCode, setCustomerCode] = useState('');
  const [showOrders, setShowOrders] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  
  const [loginForm, setLoginForm] = useState({
    phone: '',
    code: '',
  });
  
  const [addressForm, setAddressForm] = useState({
    receiver: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    address: '',
    label: '',
    isDefault: false,
  });

  useEffect(() => {
    const savedUser = getShopUser();
    if (savedUser) {
      loadUserInfo();
    }
  }, []);

  const loadUserInfo = async () => {
    try {
      const res = await shopApi.getUserInfo();
      if (res.data.success) {
        setUser(res.data.data);
      }
    } catch (error) {
      console.error('Load user info error:', error);
      clearShopUser();
    }
  };

  const handlePhoneLogin = async () => {
    if (!loginForm.phone || !/^1[3-9]\d{9}$/.test(loginForm.phone)) {
      toast.error('请输入正确的手机号');
      return;
    }

    setLoading(true);
    try {
      const res = await shopApi.phoneLogin(loginForm.phone, loginForm.code);
      if (res.data.success) {
        const { user: userData, token } = res.data.data;
        setShopUser({
          userId: userData.id,
          nickname: userData.nickname,
          phone: userData.phone,
          hasDiscount: userData.hasDiscount,
          token,
        });
        setUser(userData);
        setShowLogin(false);
        toast.success('登录成功');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleWechatLogin = async () => {
    setLoading(true);
    try {
      // 模拟微信登录
      const mockCode = `wechat_${Date.now()}`;
      const res = await shopApi.wechatLogin(mockCode);
      if (res.data.success) {
        const { user: userData, token } = res.data.data;
        setShopUser({
          userId: userData.id,
          nickname: userData.nickname,
          phone: userData.phone,
          hasDiscount: userData.hasDiscount,
          token,
        });
        setUser(userData);
        setShowLogin(false);
        toast.success('登录成功');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAlipayLogin = async () => {
    setLoading(true);
    try {
      // 模拟支付宝登录
      const mockCode = `alipay_${Date.now()}`;
      const res = await shopApi.alipayLogin(mockCode);
      if (res.data.success) {
        const { user: userData, token } = res.data.data;
        setShopUser({
          userId: userData.id,
          nickname: userData.nickname,
          phone: userData.phone,
          hasDiscount: userData.hasDiscount,
          token,
        });
        setUser(userData);
        setShowLogin(false);
        toast.success('登录成功');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBindCustomer = async () => {
    if (!customerCode.trim()) {
      toast.error('请输入客户编码');
      return;
    }

    setLoading(true);
    try {
      const res = await shopApi.bindCustomer(customerCode);
      if (res.data.success) {
        toast.success('绑定成功');
        loadUserInfo();
        setShowBindCustomer(false);
        setCustomerCode('');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '绑定失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearShopUser();
    setUser(null);
    toast.success('已退出登录');
  };

  const handleAddAddress = async () => {
    if (!addressForm.receiver || !addressForm.phone || !addressForm.province || !addressForm.city || !addressForm.address) {
      toast.error('请填写完整信息');
      return;
    }

    setLoading(true);
    try {
      if (editingAddress) {
        await shopApi.updateAddress(editingAddress.id, addressForm);
        toast.success('地址更新成功');
      } else {
        await shopApi.addAddress(addressForm);
        toast.success('地址添加成功');
      }
      loadUserInfo();
      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm({
        receiver: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        address: '',
        label: '',
        isDefault: false,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('确定要删除这个地址吗？')) return;

    try {
      await shopApi.deleteAddress(id);
      toast.success('地址删除成功');
      loadUserInfo();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  if (!user && !showLogin) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">用户中心</h2>
          <p className="text-gray-600 mb-6">登录后可享受更多优惠和服务</p>
          <button
            onClick={() => setShowLogin(true)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            立即登录
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 mt-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">登录</h2>
            <button onClick={() => setShowLogin(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleWechatLogin}
              disabled={loading}
              className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              微信登录
            </button>

            <button
              onClick={handleAlipayLogin}
              disabled={loading}
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              支付宝登录
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>

            <div>
              <input
                type="tel"
                placeholder="手机号"
                value={loginForm.phone}
                onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="验证码（可选）"
                value={loginForm.code}
                onChange={(e) => setLoginForm({ ...loginForm, code: e.target.value })}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => toast.info('验证码已发送（开发环境跳过验证）')}
              >
                获取验证码
              </button>
            </div>

            <button
              onClick={handlePhoneLogin}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>

          <button
            onClick={() => setShowLogin(false)}
            className="w-full py-3 mt-4 text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 overflow-y-auto">
      <div className="min-h-screen max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">用户中心</h2>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                返回
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                退出
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg text-gray-800">{user?.nickname}</div>
                {user?.phone && <div className="text-gray-600 text-sm">{user.phone}</div>}
              </div>
            </div>

            {user?.hasDiscount && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-green-700">
                  <Gift className="w-5 h-5" />
                  <span className="font-medium">享受企业客户优惠</span>
                </div>
                {user?.discountRate && (
                  <div className="text-green-600 text-sm mt-1">
                    折扣率：{(user.discountRate * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            )}

            {!user?.hasDiscount && (
              <button
                onClick={() => setShowBindCustomer(true)}
                className="w-full py-3 border-2 border-blue-500 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <Gift className="w-5 h-5" />
                绑定企业客户享受优惠
              </button>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setShowOrders(true)}
                className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <ClipboardList className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">我的订单</span>
              </button>
              <button
                onClick={() => setShowAddresses(true)}
                className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <MapPin className="w-6 h-6 text-green-600" />
                <span className="text-sm font-medium text-green-700">地址管理</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 绑定客户弹窗 */}
      {showBindCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">绑定企业客户</h3>
            <input
              type="text"
              placeholder="请输入客户编码"
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowBindCustomer(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleBindCustomer}
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '绑定中...' : '确认绑定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 地址表单弹窗 */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[120] overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{editingAddress ? '编辑地址' : '添加地址'}</h3>
              <button
                onClick={() => {
                  setShowAddressForm(false);
                  setEditingAddress(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="收货人"
                value={addressForm.receiver}
                onChange={(e) => setAddressForm({ ...addressForm, receiver: e.target.value })}
                className="w-full px-4 py-2 h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <PhoneInput
                value={addressForm.phone}
                onChange={(value) => setAddressForm({ ...addressForm, phone: value })}
              />

              <RegionPicker
                value={{ province: addressForm.province, city: addressForm.city }}
                onChange={(value) => setAddressForm({ ...addressForm, province: value.province || '', city: value.city || '' })}
              />

              <textarea
                placeholder="详细地址"
                value={addressForm.address}
                onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                className="w-full px-4 py-2 h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />

              <input
                type="text"
                placeholder="标签（如：家、公司）"
                value={addressForm.label}
                onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                className="w-full px-4 py-2 h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <label className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">设为默认地址</span>
              </label>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddressForm(false);
                  setEditingAddress(null);
                }}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleAddAddress}
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrders && (
        <OrderListModal onClose={() => setShowOrders(false)} />
      )}

      {showAddresses && (
        <AddressListModal
          addresses={user?.addresses || []}
          onEdit={(address) => {
            setEditingAddress(address);
            setAddressForm({
              receiver: address.receiver,
              phone: address.phone,
              province: address.province,
              city: address.city,
              district: address.district || '',
              address: address.address,
              label: address.label || '',
              isDefault: address.isDefault,
            });
            setShowAddressForm(true);
          }}
          onDelete={handleDeleteAddress}
          onAdd={() => {
            setEditingAddress(null);
            setAddressForm({
              receiver: '',
              phone: '',
              province: '',
              city: '',
              district: '',
              address: '',
              label: '',
              isDefault: false,
            });
            setShowAddressForm(true);
          }}
          onClose={() => setShowAddresses(false)}
        />
      )}
    </div>
  );
}

interface OrderListModalProps {
  onClose: () => void;
}

function OrderListModal({ onClose }: OrderListModalProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await shopApi.getMyOrders();
      if (res.data.success) {
        setOrders(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 border-yellow-500 text-yellow-700';
      case 'PICKING': return 'bg-indigo-50 border-indigo-500 text-indigo-700';
      case 'OUTBOUND_REVIEW': return 'bg-purple-50 border-purple-500 text-purple-700';
      case 'DISPATCHING': return 'bg-cyan-50 border-cyan-500 text-cyan-700';
      case 'DISPATCHED': return 'bg-cyan-50 border-cyan-500 text-cyan-700';
      case 'IN_TRANSIT': return 'bg-purple-50 border-purple-500 text-purple-700';
      case 'DELIVERED': return 'bg-green-50 border-green-500 text-green-700';
      case 'COMPLETED': return 'bg-emerald-50 border-emerald-500 text-emerald-700';
      case 'RETURNING': return 'bg-orange-50 border-orange-500 text-orange-700';
      case 'RETURNED': return 'bg-red-50 border-red-500 text-red-700';
      case 'CANCELLED': return 'bg-gray-50 border-gray-500 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return '待拣货';
      case 'PICKING': return '拣货中';
      case 'OUTBOUND_REVIEW': return '出库审核';
      case 'DISPATCHING': return '待调度';
      case 'DISPATCHED': return '已调度';
      case 'IN_TRANSIT': return '配送中';
      case 'DELIVERED': return '已送达';
      case 'COMPLETED': return '已完成';
      case 'RETURNING': return '退货中';
      case 'RETURNED': return '已退货';
      case 'CANCELLED': return '已取消';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[110]">
      <div className="bg-white w-full max-w-lg max-h-[80vh] rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-white">
          <h3 className="font-bold text-lg">我的订单</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardList className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p>暂无订单</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{order.orderNo}</span>
                    <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {order.items?.length || 0}件商品
                  </div>
                  {order.discountRate && order.discountRate < 1 && (
                    <div className="text-sm text-green-600">
                      折扣: {(order.discountRate * 100).toFixed(0)}折
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t">
                    <span className="text-gray-600">实付金额</span>
                    <span className="font-bold text-lg text-blue-600">¥{Number(order.totalAmount).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    {order.status === 'PENDING' || order.status === 'PICKING' || order.status === 'OUTBOUND_REVIEW' ? (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await shopApi.cancelOrder(order.id);
                              toast.success('订单已取消');
                              fetchOrders();
                            } catch (error: any) {
                              toast.error(error.response?.data?.message || '取消失败');
                            }
                          }}
                          className="flex-1 px-2 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          取消
                        </button>
                      </>
                    ) : null}
                    {order.status === 'DELIVERED' && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await shopApi.confirmReceive(order.id);
                              toast.success('已确认收货');
                              fetchOrders();
                            } catch (error: any) {
                              toast.error(error.response?.data?.message || '确认失败');
                            }
                          }}
                          className="flex-1 px-2 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          确认收货
                        </button>
                      </>
                    )}
                    {order.status === 'COMPLETED' && (
                      <button
                        onClick={() => {
                          const reason = prompt('请输入退货原因：');
                          if (reason) {
                            toast.success('退货申请已提交');
                          }
                        }}
                        className="flex-1 px-2 py-1.5 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                      >
                        申请退货
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AddressListModalProps {
  addresses: Address[];
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

function AddressListModal({ addresses, onEdit, onDelete, onAdd, onClose }: AddressListModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[110]">
      <div className="bg-white w-full max-w-lg max-h-[80vh] rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-white">
          <h3 className="font-bold text-lg">收货地址</h3>
          <div className="flex items-center gap-2">
            <button onClick={onAdd} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              添加地址
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {addresses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MapPin className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p>暂无收货地址</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map(address => (
                <div key={address.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium mr-2">{address.receiver}</span>
                      <span className="text-gray-600">{address.phone}</span>
                      {address.isDefault && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">默认</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {address.province} {address.city} {address.address}
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={() => onEdit(address)}
                      className="flex-1 py-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => onDelete(address.id)}
                      className="flex-1 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
