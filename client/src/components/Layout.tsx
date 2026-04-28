import { useState, useEffect, Suspense, useMemo } from 'react';
import { useConfirm } from './ConfirmProvider';
import OwnerModal from './OwnerModal';
import AIAssistantWrapper from './AIAssistantWrapper';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useOwnerStore } from '../stores/owner';
import { ownerApi, authApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import {
  Bot as LogoIcon,
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
  Truck,
  PlayCircle,
  X,
  User,
  QrCode,
} from 'lucide-react';

import { MENU_ITEMS } from '../constants/menus';

const MenuIconMap: Record<string, any> = {
  '/orders': ShoppingCart,
  '/outbound': ArrowUpFromLine,
  '/dispatch': Route,
  '/returns': RotateCcw,
  '/inventory': Boxes,
  '/batch-trace': GitBranch,
  '/purchases': Truck,
  '/inbound': Package,
  '/stock-transfers': ArrowRightLeft,
  '/transport': Truck,
  '/warehouses': Warehouse,
  '/products': Package,
  '/customers': Users,
  '/suppliers': Users,
  '/carriers': Factory,
  '/qrcode': QrCode,
  '/system': Settings,
};

// 辅助函数来渲染菜单图标
const MenuIcon = ({ path, className }: { path: string; className?: string }) => {
  const Icon = MenuIconMap[path];
  if (!Icon) return null;
  return <Icon className={className} />;
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState<any>(null);
  const [contentKey, setContentKey] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showMobileTip, setShowMobileTip] = useState(false);
  const { user, permissions, logout, token, setAuth, owners: authOwners } = useAuthStore();
  const { currentOwnerId, currentOwnerName, setCurrentOwner, logout: logoutOwner } = useOwnerStore();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();

  // 使用 authStore 的 owners
  const owners = authOwners;

  // 移动端首次登录提示
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    const hasShownTip = localStorage.getItem('mobile_tip_shown');
    if (isMobile && !hasShownTip && user) {
      setShowMobileTip(true);
      localStorage.setItem('mobile_tip_shown', 'true');
    }
  }, [user]);

  // 初始化时调用 /me 获取最新用户信息和权限
  useEffect(() => {
    if (token) {
      authApi.me()
        .then(res => {
          if (res.data.success) {
            const { user: freshUser, permissions: freshPermissions, owners: userOwners } = res.data.data;
            setAuth(token, freshUser, freshPermissions, userOwners);
            // 设置主体列表 - 只显示当前用户拥有的主体
            if (userOwners && userOwners.length > 0) {
              // 非ADMIN用户默认选中第一个主体（如果没有选中的主体）
              if (!freshUser.isAdmin && !currentOwnerId) {
                // 先清除可能存在的旧的主体信息
                localStorage.removeItem('currentOwnerId');
                localStorage.removeItem('currentOwnerName');
                setCurrentOwner(userOwners[0].id, userOwners[0].name);
              }
            }
          }
        })
        .catch(() => {
          // token 无效，跳转登录
          logout();
          window.location.href = '/login';
        });
    }
  }, [token]);

  // 切换主体时重新获取该主体的权限
  useEffect(() => {
    if (token && currentOwnerId && !user?.isAdmin) {
      authApi.me()
        .then(res => {
          if (res.data.success) {
            const { permissions: freshPermissions, owners: freshOwners } = res.data.data;
            setAuth(token, user!, freshPermissions, freshOwners);
          }
        })
        .catch(err => {
          console.error('获取主体权限失败:', err);
        });
    }
  }, [currentOwnerId, token, user?.isAdmin]);

  // 根据用户权限过滤菜单
  const filteredMenuItems = useMemo(() => {
    return MENU_ITEMS.filter(item => {
      // ADMIN可以看到所有菜单
      if (user?.isAdmin) return true;
      // 检查用户是否有该菜单的权限
      if (!user || !permissions) return false;

      const modulePermissions = permissions[item.module];
      if (!modulePermissions) return false;

      const permission = modulePermissions[item.permission];
      return permission === 'READ' || permission === 'WRITE';
    });
  }, [user?.isAdmin, permissions]);

  // 分离业务菜单和配置菜单
  const businessMenuItems = filteredMenuItems.filter(item =>
    ['/orders', '/outbound', '/dispatch', '/returns', '/inventory', '/batch-trace', '/purchases', '/inbound', '/stock-transfers', '/transport'].includes(item.path)
  );

  const configMenuItems = filteredMenuItems.filter(item =>
    ['/warehouses', '/products', '/customers', '/suppliers', '/carriers', '/qrcode'].includes(item.path)
  );

  const adminMenuItems = filteredMenuItems.filter(item =>
    ['/system'].includes(item.path)
  );

  const mobileNavItems = filteredMenuItems.filter(item =>
    ['/orders', '/outbound', '/dispatch', '/returns', '/inventory'].includes(item.path)
  );

  const showOwnerGuard = !user?.isAdmin && !!user && owners.length === 0 && !currentOwnerId;

  const canGoBack = !showOwnerGuard && !['/orders', '/inventory', '/outbound', '/inbound', '/stock-transfers', '/batch-trace',
      '/owners', '/warehouses', '/products', '/customers', '/suppliers', '/transport',
      '/carriers', '/dispatch', '/returns', '/purchases', '/system', '/knowledge-base', '/qrcode'].includes(location.pathname);

  const handleLogout = () => {
    logout();
    logoutOwner();
    window.location.href = '/login';
  };

  useEffect(() => {
    setContentKey(k => k + 1);
  }, [currentOwnerId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <aside
        className={`hidden lg:block fixed top-0 left-0 z-50 h-screen bg-white border-r shadow-sm transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        <div className="h-14 flex items-center justify-between px-3 border-b bg-primary-600">
          <div className={`flex items-center gap-2 ${collapsed ? 'justify-center w-full' : ''}`}>
            <LogoIcon className="w-7 h-7 text-white flex-shrink-0" />
            {!collapsed && <span className="text-lg font-bold text-white whitespace-nowrap">智链云AI</span>}
          </div>
        </div>

        <nav className="p-2 space-y-1">
          {businessMenuItems.length > 0 && (
          <>
            <div className={`flex items-center gap-2 my-3 ${collapsed ? 'justify-center' : ''}`}>
              <div className={`h-px bg-gray-200 flex-1 ${collapsed ? 'w-6' : ''}`} />
              {!collapsed && <span className="text-xs text-gray-400">业务</span>}
              <div className={`h-px bg-gray-200 flex-1 ${collapsed ? 'w-6' : ''}`} />
            </div>

            {businessMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/orders'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <MenuIcon path={item.path} className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}

        {configMenuItems.length > 0 && (
          <>
            <div className={`flex items-center gap-2 my-3 ${collapsed ? 'justify-center' : ''}`}>
              <div className={`h-px bg-gray-200 flex-1 ${collapsed ? 'w-6' : ''}`} />
              {!collapsed && <span className="text-xs text-gray-400">配置</span>}
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            {configMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <MenuIcon path={item.path} className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}

        {adminMenuItems.length > 0 && (
          <>
            <div className={`flex items-center gap-2 my-3 ${collapsed ? 'justify-center' : ''}`}>
              <div className={`h-px bg-gray-200 flex-1 ${collapsed ? 'w-6' : ''}`} />
              {!collapsed && <span className="text-xs text-gray-400">权限</span>}
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            {adminMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <MenuIcon path={item.path} className="w-5 h-5 flex-shrink-0" />
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
        <header className="hidden lg:flex h-14 bg-white border-b items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {canGoBack && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>返回</span>
              </button>
            )}
          </div>
          
          <button
            onClick={() => setShowVideoModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-300"
          >
            <PlayCircle className="w-4 h-4" />
            <span>观看演示</span>
          </button>
          
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
                      {user?.isAdmin && (
                        <button
                          onClick={() => {
                            setCurrentOwner(null, null);
                            setOwnerDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${!currentOwnerId ? 'text-primary-600 font-medium' : 'text-gray-600'}`}
                        >
                          全部主体
                        </button>
                      )}
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
                            {o.roleCode === 'OWNER' && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const res = await ownerApi.get(o.id);
                                    if (res.data.success) {
                                      setEditingOwner(res.data.data);
                                      setShowOwnerModal(true);
                                    }
                                  } catch (err) {
                                    console.error('获取主体详情失败', err);
                                  }
                                }}
                                className="p-0.5 hover:bg-gray-200 rounded"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            {user?.isAdmin && currentOwnerId !== o.id && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const ok = await confirm({ message: `确定要删除主体"${o.name}"吗？` });
                                  if (!ok) return;
                                  try {
                                    await ownerApi.delete(o.id);
                                    toast.success('主体已删除');
                                    // 重新调用 /me 获取当前用户拥有的主体列表
                                    authApi.me()
                                      .then(res => {
                                        if (res.data.success) {
                                          const { user: freshUser, permissions: freshPermissions, owners: userOwners } = res.data.data;
                                          setAuth(token || '', freshUser, freshPermissions, userOwners);
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
            <span className="text-sm text-gray-600">
              {user?.isAdmin ? '系统管理员' : (() => {
                const currentOwnerRole = authOwners.find(o => o.id === currentOwnerId);
                return currentOwnerRole?.roleName || currentOwnerRole?.roleCode || '';
              })()}：{user?.name}
            </span>
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
        <main className="lg:p-4 pb-16 lg:pb-6">
          {showOwnerGuard ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
              <div className="text-center">
                <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h2 className="text-xl font-medium text-gray-700 mb-2">暂无主体</h2>
                <p className="text-gray-500 mb-6">您还没有关联任何主体，请先创建一个主体</p>
                <button
                  onClick={() => {
                    setEditingOwner(null);
                    setShowOwnerModal(true);
                  }}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  创建主体
                </button>
              </div>
            </div>
          ) : (
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
          )}
        </main>
      </div>

      {/* 移动端底部导航 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
        <div className="flex items-center justify-around h-14">
          {mobileNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/orders'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 ${
                  isActive ? 'text-primary-600' : 'text-gray-500'
                }`
              }
            >
              <MenuIcon path={item.path} className="w-5 h-5" />
              <span className="text-xs mt-0.5">{item.label.replace('中心', '').replace('管理', '').replace('看板', '').replace('调度', '')}</span>
            </NavLink>
          ))}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 ${
                isActive ? 'text-primary-600' : 'text-gray-500'
              }`
            }
          >
            <User className="w-5 h-5" />
            <span className="text-xs mt-0.5">我的</span>
          </NavLink>
        </div>
      </nav>

      <OwnerModal
        open={showOwnerModal}
        editingOwner={editingOwner}
        onClose={() => setShowOwnerModal(false)}
        onSuccess={() => {
          // 重新调用 /me 获取当前用户拥有的主体列表
          authApi.me()
            .then(res => {
              if (res.data.success) {
                const { user: freshUser, permissions: freshPermissions, owners: userOwners } = res.data.data;
                setAuth(token || '', freshUser, freshPermissions, userOwners);
              }
            });
        }}
      />

      <ToastContainer />

      {/* 移动端首次登录提示 */}
      {showMobileTip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">温馨提示</h3>
              <p className="text-gray-600 text-sm mb-6">
                移动端仅支持部分能力，全量能力请登录PC查看。
              </p>
              <button
                onClick={() => setShowMobileTip(false)}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      <AIAssistantWrapper />

      {showVideoModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <video
              src="/showcase.mp4"
              controls
              autoPlay
              className="w-full h-auto"
              style={{ maxHeight: '80vh' }}
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
