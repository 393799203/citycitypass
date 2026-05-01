import React, { useState, useEffect } from 'react';
import { Role, User, Owner } from './types';
import { RoleList, RoleModal } from './RoleManage';
import { UserList, UserModal } from './UserManage';
import { useAuthStore } from '../../stores/auth';
import { useOwnerStore } from '../../stores/owner';
import { permissionApi, userApi } from '../../api';
import { usePermission } from '../../hooks/usePermission';
import { useConfirm } from '../../components/ConfirmProvider';
import { formatPhone } from '../../utils/format';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

type Tab = 'users' | 'roles' | 'members';

export const SystemManage: React.FC = () => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [ownerMembers, setOwnerMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const { refreshPermissions, owners: authOwners, user: currentUser } = useAuthStore();
  const { currentOwnerId, currentOwnerName } = useOwnerStore();
  const { canRead, canWrite } = usePermission('system', 'system');
  const { confirm } = useConfirm();

  const isAdminView = currentUser?.isAdmin && !currentOwnerId;
  const defaultTab: Tab = isAdminView ? 'users' : 'members';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    loadData();
  }, [activeTab, authOwners.length]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'roles') {
        const rolesRes = await permissionApi.getRoles();
        if (rolesRes.data.success) {
          setRoles(rolesRes.data.data);
        }
      } else if (activeTab === 'users') {
        const [usersRes, rolesRes] = await Promise.all([
          userApi.list(),
          permissionApi.getRoles()
        ]);
        if (usersRes.data.success) {
          setUsers(usersRes.data.data);
        }
        if (rolesRes.data.success) {
          setRoles(rolesRes.data.data);
        }
      } else if (activeTab === 'members' && currentOwnerId) {
        const [usersRes, rolesRes] = await Promise.all([
          userApi.list(),
          permissionApi.getRoles()
        ]);
        if (usersRes.data.success) {
          setOwnerMembers(usersRes.data.data);
        }
        if (rolesRes.data.success) {
          setRoles(rolesRes.data.data);
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
    setLoading(false);
  };

  const handleSaveRole = async (data: Partial<Role>) => {
    try {
      let res;
      if (editingRole) {
        res = await permissionApi.updateRole(editingRole.id, data);
      } else {
        res = await permissionApi.createRole(data);
      }

      if (res.data.success) {
        toast.success(t('system.roleSaved'));
        setShowRoleModal(false);
        setEditingRole(undefined);
        loadData();
        await refreshPermissions();
      } else {
        toast.error(res.data.message || t('system.saveFailed'));
      }
    } catch (error) {
      console.error('Failed to save role:', error);
      toast.error(t('system.saveFailed'));
    }
  };

  const handleDeleteRole = async (id: string) => {
    const ok = await confirm({ message: t('system.deleteRoleConfirm'), danger: true });
    if (!ok) return;
    try {
      const res = await permissionApi.deleteRole(id);

      if (res.data.success) {
        toast.success(t('system.roleDeleted'));
        loadData();
        await refreshPermissions();
      } else {
        toast.error(res.data.message || t('system.deleteFailed'));
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error(t('system.deleteFailed'));
    }
  };

  const handleSaveUser = async (data: Partial<User>) => {
    try {
      let res;
      if (editingUser) {
        res = await userApi.update(editingUser.id, data);
      } else {
        res = await userApi.register(data);
      }

      if (res.data.success) {
        toast.success(editingUser ? t('system.userUpdated') : t('system.userCreated'));
        setShowUserModal(false);
        setEditingUser(undefined);
        loadData();
        await refreshPermissions();
      } else {
        toast.error(res.data.message || t('system.saveFailed'));
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error(t('system.saveFailed'));
    }
  };

  const handleDeleteUser = async (id: string) => {
    const ok = await confirm({ message: t('system.deleteConfirm'), danger: true });
    if (!ok) return;
    try {
      const res = await userApi.delete(id);

      if (res.data.success) {
        toast.success(t('system.userDeleted'));
        loadData();
        await refreshPermissions();
      } else {
        toast.error(res.data.message || t('system.deleteFailed'));
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(t('system.deleteFailed'));
    }
  };

  const handleRemoveOwner = async (userId: string, ownerId: string) => {
    const ok = await confirm({ message: t('system.removeOwnerConfirm'), danger: true });
    if (!ok) return;
    try {
      const res = await userApi.removeOwner(userId, ownerId);

      if (res.data.success) {
        toast.success(t('system.ownerRemoved'));
        loadData();
        await refreshPermissions();
      } else {
        toast.error(res.data.message || t('system.removeOwnerFailed'));
      }
    } catch (error) {
      console.error('Failed to remove owner:', error);
      toast.error(t('system.removeOwnerFailed'));
    }
  };

  return (
    <div className="p-2 space-y-4">
      <div className="hidden sm:block mb-0 sm:mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('system.title')}</h1>
        <p className="text-gray-600 mt-1">{t('system.subtitle')}</p>
      </div>

      <div className="mb-4 border-b border-gray-200 !mt-0">
        <nav className="-mb-px flex">
          {!isAdminView && (
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-3 sm:py-4 sm:px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('system.memberManagement')}
            </button>
          )}
          {isAdminView && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 sm:py-4 sm:px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('system.userManagement')}
            </button>
          )}
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 py-3 sm:py-4 sm:px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('system.roleManagement')}
          </button>
        </nav>
      </div>

      <div className="mb-4 flex justify-end hidden sm:flex">
        {canWrite && activeTab !== 'members' && (
          <button
            onClick={() => {
              if (activeTab === 'roles') {
                setEditingRole(undefined);
                setShowRoleModal(true);
              } else {
                setEditingUser(undefined);
                setShowUserModal(true);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            {activeTab === 'roles' ? t('system.newRole') : t('system.newUser')}
          </button>
        )}
      </div>

      <div className="sm:hidden mb-3">
        {canWrite && activeTab !== 'members' && (
          <button
            onClick={() => {
              if (activeTab === 'roles') {
                setEditingRole(undefined);
                setShowRoleModal(true);
              } else {
                setEditingUser(undefined);
                setShowUserModal(true);
              }
            }}
            className="w-full py-2 bg-blue-600 text-white text-sm rounded-md"
          >
            {activeTab === 'roles' ? t('system.newRole') : t('system.newUser')}
          </button>
        )}
        {activeTab === 'members' && canWrite && (
          <button
            onClick={() => {
              setEditingUser(undefined);
              setShowUserModal(true);
            }}
            className="w-full py-2 bg-blue-600 text-white text-sm rounded-md"
          >
            {t('system.registerAndJoin')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('system.loading')}</div>
      ) : activeTab === 'members' ? (
        <div>
          <div className="hidden sm:flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">{t('system.currentOwnerMembers')}</h3>
            {canWrite && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingUser(undefined);
                    setShowUserModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  {t('system.registerAndJoin')}
                </button>
                
              </div>
            )}
          </div>

          <div className="sm:hidden mb-3">
            <h3 className="text-base font-medium mb-2">{t('system.currentOwnerMembers')}</h3>
          </div>
          
          {ownerMembers.length > 0 ? (
            <>
              <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('system.nameLabel')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('system.usernameLabel')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('system.phoneLabel')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('system.ownerRole')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('system.joinTime')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[...ownerMembers].sort((a, b) => {
                      const aRole = a.owners?.find((o: any) => o.ownerId === currentOwnerId)?.roleCode;
                      const bRole = b.owners?.find((o: any) => o.ownerId === currentOwnerId)?.roleCode;
                      if (aRole === 'OWNER' && bRole !== 'OWNER') return -1;
                      if (aRole !== 'OWNER' && bRole === 'OWNER') return 1;
                      return 0;
                    }).map((member) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{member.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{member.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatPhone(member.phone)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs ${
                            member.owners?.find((o: any) => o.ownerId === currentOwnerId)?.roleCode === 'OWNER'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {member.owners?.find((o: any) => o.ownerId === currentOwnerId)?.roleName || member.owners?.find((o: any) => o.ownerId === currentOwnerId)?.roleCode || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {canWrite && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingUser(member);
                                  setShowUserModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 mr-3"
                              >
                                {t('system.editBtn')}
                              </button>
                              <button
                                onClick={() => handleRemoveOwner(member.id, currentOwnerId!)}
                                className="text-red-600 hover:text-red-800"
                              >
                                {t('system.removeRelation')}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden space-y-2">
                {[...ownerMembers].sort((a, b) => {
                  const aRole = a.owners?.find((o: any) => o.ownerId === currentOwnerId)?.roleCode;
                  const bRole = b.owners?.find((o: any) => o.ownerId === currentOwnerId)?.roleCode;
                  if (aRole === 'OWNER' && bRole !== 'OWNER') return -1;
                  if (aRole !== 'OWNER' && bRole === 'OWNER') return 1;
                  return 0;
                }).map((member) => (
                  <div key={member.id} className="bg-white rounded-lg shadow p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          member.owners?.find((o: any) => o.ownerId === currentOwnerId)?.roleCode === 'OWNER'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {member.owners?.find((o: any) => o.ownerId === currentOwnerId)?.roleName || '-'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(member.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 mb-2">
                      <div className="flex justify-between">
                        <span>{t('system.usernameLabel')}: {member.username}</span>
                        <span>{formatPhone(member.phone)}</span>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex gap-2 pt-2 border-t">
                        <button
                          onClick={() => {
                            setEditingUser(member);
                            setShowUserModal(true);
                          }}
                          className="flex-1 py-1.5 text-blue-600 text-xs border border-blue-600 rounded"
                        >
                          {t('system.editBtn')}
                        </button>
                        <button
                          onClick={() => handleRemoveOwner(member.id, currentOwnerId!)}
                          className="flex-1 py-1.5 text-red-600 text-xs border border-red-600 rounded"
                        >
                          {t('system.removeRelation')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">{t('system.noMembers')}</div>
          )}
        </div>
      ) : activeTab === 'users' ? (
        <UserList
          users={users}
          onEdit={(user) => {
            setEditingUser(user);
            setShowUserModal(true);
          }}
          onDelete={handleDeleteUser}
          canWrite={canWrite}
        />
      ) : (
        <RoleList
          roles={roles}
          onEdit={(role) => {
            setEditingRole(role);
            setShowRoleModal(true);
          }}
          onDelete={handleDeleteRole}
          canWrite={canWrite}
          isAdmin={currentUser?.isAdmin}
        />
      )}

      {showRoleModal && (
        <RoleModal
          role={editingRole}
          onSave={handleSaveRole}
          onClose={() => {
            setShowRoleModal(false);
            setEditingRole(undefined);
          }}
          canWrite={canWrite}
          isAdmin={currentUser?.isAdmin}
        />
      )}

      {showUserModal && (
        <UserModal
          user={editingUser}
          owners={authOwners}
          roles={roles}
          onSave={handleSaveUser}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(undefined);
          }}
          isMemberMode={activeTab === 'members'}
          currentOwnerId={currentOwnerId}
          currentOwnerName={currentOwnerName}
          canWrite={canWrite}
        />
      )}
    </div>
  );
};

export default SystemManage;
