import React, { useState } from 'react';
import { User as UserIcon, LogOut, Building2, Phone, Mail, ChevronDown, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { useOwnerStore } from '../../stores/owner';
import { useConfirm } from '../../components/ConfirmProvider';
import SystemManage from '../System';
import { formatPhone } from '../../utils/format';

const Profile: React.FC = () => {
  const { user, logout, owners: authOwners } = useAuthStore();
  const { currentOwnerId, currentOwnerName, setCurrentOwner, logout: logoutOwner } = useOwnerStore();
  const { confirm } = useConfirm();
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);

  const handleLogout = async () => {
    const ok = await confirm({ message: '确定要退出登录吗？' });
    if (ok) {
      logout();
      logoutOwner();
      window.location.href = '/login';
    }
  };

  const currentOwnerRole = authOwners.find(o => o.id === currentOwnerId);
  const owners = authOwners;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white">
        <div className="px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-800">{user?.name}</h2>
                {user?.isAdmin && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                    系统管理员
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">@{user?.username}</p>
              {!user?.isAdmin && currentOwnerRole && (
                <div className="flex items-center gap-1 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {currentOwnerName} · {currentOwnerRole.roleName || currentOwnerRole.roleCode}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {user?.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{formatPhone(user.phone)}</span>
              </div>
            )}
            {user?.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{user.email}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {owners.length > 0 && (
              <div className="flex-1 relative">
                <button
                  onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">
                      {currentOwnerName || (user?.isAdmin ? '全部主体' : '请选择主体')}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showOwnerDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showOwnerDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowOwnerDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 max-h-64 overflow-y-auto">
                      {user?.isAdmin && (
                        <button
                          onClick={() => {
                            setCurrentOwner(null, null);
                            setShowOwnerDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <span className={!currentOwnerId ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                            全部主体
                          </span>
                          {!currentOwnerId && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      )}
                      {owners.map(o => (
                        <button
                          key={o.id}
                          onClick={() => {
                            setCurrentOwner(o.id, o.name);
                            setShowOwnerDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <span className={currentOwnerId === o.id ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                            {o.name}
                          </span>
                          {currentOwnerId === o.id && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 border border-red-500 text-red-500 rounded-lg flex items-center justify-center gap-1 text-sm font-medium hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">退出登录</span>
              <span className="sm:hidden">退出</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <SystemManage />
      </div>
    </div>
  );
};

export default Profile;
