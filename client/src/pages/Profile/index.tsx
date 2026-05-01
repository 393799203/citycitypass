import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User as UserIcon, LogOut, Building2, Phone, Mail, ChevronDown, Check, QrCode, X } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { useOwnerStore } from '../../stores/owner';
import { useConfirm } from '../../components/ConfirmProvider';
import SystemManage from '../System';
import { formatPhone } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';
import { qrcodeApi } from '../../api';
import { toast } from 'react-toastify';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout, owners: authOwners } = useAuthStore();
  const { currentOwnerId, currentOwnerName, setCurrentOwner, logout: logoutOwner } = useOwnerStore();
  const { confirm } = useConfirm();
  const { canRead } = usePermission('system', 'system');
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<{ qrCode: string; shoppingUrl: string } | null>(null);

  const handleLogout = async () => {
    const ok = await confirm({ message: t('profile.logoutConfirm') });
    if (ok) {
      logout();
      logoutOwner();
      window.location.href = '/login';
    }
  };

  const handleGenerateShopQRCode = async () => {
    if (!currentOwnerId) {
      toast.warning(t('profile.selectOwnerFirst'));
      return;
    }
    try {
      const res = await qrcodeApi.getShoppingQRCode();
      if (res.data.success) {
        const { qrCode, shoppingUrl } = res.data.data;
        setQRCodeData({ qrCode, shoppingUrl });
        setShowQRCodeModal(true);
      }
    } catch (error: any) {
      console.error('Failed to generate QR code:', error);
      toast.error(error.response?.data?.message || t('profile.qrCodeFailed'));
    }
  };

  const handleDownloadQRCode = () => {
    if (!qrCodeData) return;
    
    const link = document.createElement('a');
    link.href = qrCodeData.qrCode;
    link.download = `店铺二维码_${currentOwnerName || 'shop'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('二维码已下载');
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
            {currentOwnerId && (
              <button
                onClick={handleGenerateShopQRCode}
                className="px-3 py-2.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                title={t('profile.generateShopQRCode')}
              >
                <QrCode className="w-4 h-4" />
              </button>
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

      {canRead && (
        <div className="mt-2">
          <SystemManage />
        </div>
      )}
      
      {showQRCodeModal && qrCodeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">店铺二维码</h3>
              <button
                onClick={() => {
                  setShowQRCodeModal(false);
                  setQRCodeData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-center">
              {currentOwnerName && (
                <p className="text-sm text-gray-600 mb-3">{currentOwnerName}</p>
              )}
              <img
                src={qrCodeData.qrCode}
                alt={t('profile.shopQRCode')}
                className="mx-auto mb-3"
              />
              <p className="text-xs text-gray-400 break-all mb-4">
                扫描二维码访问店铺
              </p>
              
              <button
                onClick={handleDownloadQRCode}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                下载二维码
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
