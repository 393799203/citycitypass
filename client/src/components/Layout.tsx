import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
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
  Route,
  FileText,
  RotateCcw,
  GitBranch,
} from 'lucide-react';

const roleMap: Record<string, string> = {
  ADMIN: '管理员',
  MANAGER: '经理',
  OPERATOR: '操作员',
  WAREHOUSE_STAFF: '仓管',
  DRIVER: '司机',
  CUSTOMER: '访客',
  OWNER: '货主',
};

const configMenuItems = [
  { path: '/owners', icon: Building2, label: '货主管理' },
  { path: '/warehouses', icon: Warehouse, label: '仓库配置' },
  { path: '/products', icon: Package, label: '商品管理' },
  { path: '/customers', icon: Users, label: '客户管理' },
  { path: '/suppliers', icon: Users, label: '供应商管理' },
  { path: '/transport', icon: Truck, label: '运力管理' },
  { path: '/carriers', icon: Truck, label: '承运商管理' },
];

const businessMenuItems = [
  { path: '/orders', icon: ShoppingCart, label: '订单中心' },
  { path: '/outbound', icon: ArrowUpFromLine, label: '发货管理' },
  { path: '/dispatch', icon: Route, label: '运力调度' },
  { path: '/returns', icon: RotateCcw, label: '退货管理' },
  { path: '/inventory', icon: Boxes, label: '库存看板' },
  { path: '/stock-transfers', icon: ArrowRightLeft, label: '移库管理' },
  { path: '/inbound', icon: Package, label: '入库管理' },
  { path: '/batch-trace', icon: GitBranch, label: '批次追踪' },
];

const adminMenuItems = [
  { path: '/users', icon: Settings, label: '用户中心' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
            {!collapsed && <span className="text-lg font-bold text-white whitespace-nowrap">城城通</span>}
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
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm text-gray-600">{roleMap[user?.role || '']}：{user?.name}</span>
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
          <Outlet />
        </main>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
