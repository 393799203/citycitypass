import { useState, useEffect, Suspense } from 'react';
import { useConfirm } from './ConfirmProvider';
import OwnerModal from './OwnerModal';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useOwnerStore } from '../stores/owner';
import { ownerApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import {
  Truck,
  ShoppingCart,
  Package,
  Warehouse,
  Boxes,
  ArrowUpFromLine,
  ArrowRightLeft,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Settings,
  Building2,
  Factory,
  Route,
  FileText,
  RotateCcw,
  GitBranch,
  ArrowLeft,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

const roleMap: Record<string, string> = {
  ADMIN: '管理员',
  MANAGER: '经理',
  OPERATOR: '操作员',
  WAREHOUSE_STAFF: '仓管',
  DRIVER: '司机',
  CUSTOMER: '访客',
  OWNER: '主体',
};

const configMenuItems = [
  { path: '/warehouses', icon: Warehouse, label: '仓库管理' },
  { path: '/products', icon: Package, label: '商品管理' },
  { path: '/customers', icon: Users, label: '客户管理' },
  { path: '/suppliers', icon: Users, label: '供应商管理' },
  { path: '/carriers', icon: Factory, label: '承运商管理' },
];

const businessMenuItems = [
  { path: '/orders', icon: ShoppingCart, label: '订单中心' },
  { path: '/outbound', icon: ArrowUpFromLine, label: '发货管理' },
  { path: '/dispatch', icon: Route, label: '运力调度' },
  { path: '/returns', icon: RotateCcw, label: '退货管理' },
  { path: '/inventory', icon: Boxes, label: '库存看板' },
  { path: '/batch-trace', icon: GitBranch, label: '批次追踪' },
  { path: '/purchases', icon: Truck, label: '采购管理' },
  { path: '/inbound', icon: Package, label: '入库管理' },
  { path: '/stock-transfers', icon: ArrowRightLeft, label: '移库管理' },
  { path: '/transport', icon: Truck, label: '运力看板' },
];

const adminMenuItems = [
  { path: '/users', icon: Settings, label: '用户中心' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [owners, setOwners] = useState<any[]>([]);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState<any>(null);
  const [contentKey, setContentKey] = useState(0);
  const { user, logout } = useAuthStore();
  const { currentOwnerId, currentOwnerName, setCurrentOwner } = useOwnerStore();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    ownerApi.list().then(res => {
      if (res.data.success) {
        const activeOwners = res.data.data.filter((o: any) => o.status !== 'STOPPED');
        setOwners(activeOwners);
        if (activeOwners.length === 0) {
          setShowOwnerModal(true);
        }
      }
    });
  }, []);

  const canGoBack = location.pathname !== '/orders' && location.pathname !== '/inventory' &&
    !['/orders', '/inventory', '/outbound', '/inbound', '/stock-transfers', '/batch-trace',
       '/owners', '/warehouses', '/products', '/customers', '/suppliers', '/transport',
       '/carriers', '/users', '/dispatch', '/returns', '/purchases'].includes(location.pathname);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  useEffect(() => {
    setContentKey(k => k + 1);
  }, [currentOwnerId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-white border-r shadow-sm transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-14 flex items-center justify-between px-3 border-b bg-primary-600">
          <div className={`flex items-center gap-2 ${collapsed ? 'justify-center w-full' : ''}`}>
            <Truck className="w-7 h-7 text-white flex-shrink-0" />
            {!collapsed && <span className="text-lg font-bold text-white whitespace-nowrap">企管通</span>}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 hover:bg-white/10 rounded"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <nav className="p-2 space-y-1">
          <div className={`flex items-center gap-2 my-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className={`h-px bg-gray-200 flex-1 ${collapsed ? 'w-6' : ''}`} />
            {!collapsed && <span className="text-xs text-gray-400">业务</span>}
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          {businessMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/orders'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          ))}

          <div className={`flex items-center gap-2 my-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className={`h-px bg-gray-200 flex-1 ${collapsed ? 'w-6' : ''}`} />
            {!collapsed && <span className="text-xs text-gray-400">配置</span>}
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          {configMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          ))}
          
          {user?.role === 'ADMIN' && (
            <>
              <div className={`flex items-center gap-2 my-3 ${collapsed ? 'justify-center' : ''}`}>
                <div className={`h-px bg-gray-200 flex-1 ${collapsed ? 'w-6' : ''}`} />
                {!collapsed && <span className="text-xs text-gray-400">权限</span>}
                <div className="h-px bg-gray-200 flex-1" />
              </div>
              {adminMenuItems.map((item: any) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    } ${collapsed ? 'justify-center' : ''}`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className={`absolute bottom-0 left-0 right-0 p-2 border-t ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg ${
              collapsed ? 'w-full justify-center' : ''
            }`}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span>收起</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div
        className={`transition-all duration-300 ${
          collapsed ? 'lg:ml-16' : 'lg:ml-56'
        }`}
      >
        <header className="h-14 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {canGoBack && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">返回</span>
              </button>
            )}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => owners.length > 0 ? setOwnerDropdownOpen(!ownerDropdownOpen) : (setEditingOwner(null), setShowOwnerModal(true))}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {currentOwnerName || (owners.length === 0 ? '创建主体' : '全部主体')}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${ownerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
                {ownerDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOwnerDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <button
                        onClick={() => {
                          setCurrentOwner(null, null);
                          setOwnerDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${!currentOwnerId ? 'text-primary-600 font-medium' : 'text-gray-600'}`}
                      >
                        全部主体
                      </button>
                      {owners.map(o => (
                        <div
                          key={o.id}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${currentOwnerId === o.id ? 'text-primary-600 font-medium' : 'text-gray-600'}`}
                        >
                          <button
                            onClick={() => {
                              setCurrentOwner(o.id, o.name);
                              setOwnerDropdownOpen(false);
                            }}
                            className="flex items-center gap-2 flex-1"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            {o.name}
                          </button>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingOwner(o);
                                setShowOwnerModal(true);
                              }}
                              className="p-0.5 hover:bg-gray-200 rounded"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {currentOwnerId !== o.id && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const ok = await confirm({ message: `确定要删除主体"${o.name}"吗？` });
                                  if (!ok) return;
                                  try {
                                    await ownerApi.delete(o.id);
                                    toast.success('主体已删除');
                                    ownerApi.list().then(res => {
                                      if (res.data.success) {
                                        setOwners(res.data.data.filter((owner: any) => owner.status !== 'STOPPED'));
                                      }
                                    });
                                  } catch (error: any) {
                                    toast.error(error.response?.data?.message || '删除失败');
                                  }
                                }}
                                className="p-0.5 hover:bg-gray-200 rounded text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setEditingOwner(null);
                          setShowOwnerModal(true);
                          setOwnerDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 text-primary-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {owners.length === 0 ? '创建主体' : '新增主体'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            <div className="h-6 w-px bg-gray-200" />
            <span className="text-sm text-gray-600">{roleMap[user?.role || '']}：{user?.name}</span>
            <NavLink
              to="/knowledge-base"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <FileText className="w-4 h-4" />
              知识库管理
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          </div>
        </header>
        <main className="p-4 lg:p-6 pt-0">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <span className="mt-2 text-sm text-gray-500">加载中...</span>
            </div>
          }>
            <div key={contentKey}>
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>

      <OwnerModal
        open={showOwnerModal}
        editingOwner={editingOwner}
        onClose={() => setShowOwnerModal(false)}
        onSuccess={() => {
          ownerApi.list().then(res => {
            if (res.data.success) {
              setOwners(res.data.data.filter((o: any) => o.status !== 'STOPPED'));
            }
          });
        }}
      />

      <ToastContainer />

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
