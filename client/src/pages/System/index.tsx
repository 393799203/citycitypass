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

type Tab = 'users' | 'roles' | 'members';

export const SystemManage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [ownerMembers, setOwnerMembers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
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
          userApi.list({ ownerId: currentOwnerId }),
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

  const fetchAvailableUsers = async () => {
    try {
      const res = await userApi.list();
      if (res.data.success) {
        const allUsers = res.data.data;
        const memberIds = ownerMembers.map(m => m.id);
        setAvailableUsers(allUsers.filter((u: any) =>
          !memberIds.includes(u.id) && !u.isAdmin
        ));
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  };

  const handleAddMember = async (userId: string, roleId: string) => {
    try {
      const res = await userApi.addOwner(userId, { ownerId: currentOwnerId!, roleId });
      if (res.data.success) {
        setShowAddMemberModal(false);
        loadData();
        await refreshPermissions();
      } else {
        alert(res.data.message || '添加失败');
      }
    } catch (error) {
      console.error('添加成员失败:', error);
      alert('添加失败');
    }
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
        setShowRoleModal(false);
        setEditingRole(undefined);
        loadData();
        await refreshPermissions();
      } else {
        alert(res.data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存角色失败:', error);
      alert('保存失败');
    }
  };

  const handleDeleteRole = async (id: string) => {
    const ok = await confirm({ message: '确定要删除该角色吗？', danger: true });
    if (!ok) return;
    try {
      const res = await permissionApi.deleteRole(id);

      if (res.data.success) {
        loadData();
        await refreshPermissions();
      } else {
        alert(res.data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      alert('删除失败');
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
        setShowUserModal(false);
        setEditingUser(undefined);
        loadData();
        await refreshPermissions();
      } else {
        alert(res.data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存用户失败:', error);
      alert('保存失败');
    }
  };

  const handleDeleteUser = async (id: string) => {
    const ok = await confirm({ message: '确定要删除该用户吗？', danger: true });
    if (!ok) return;
    try {
      const res = await userApi.delete(id);

      if (res.data.success) {
        loadData();
        await refreshPermissions();
      } else {
        alert(res.data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除失败');
    }
  };

  const handleRemoveOwner = async (userId: string, ownerId: string) => {
    const ok = await confirm({ message: '确定要解除该成员与当前主体的关联吗？', danger: true });
    if (!ok) return;
    try {
      const res = await userApi.removeOwner(userId, ownerId);

      if (res.data.success) {
        loadData();
        await refreshPermissions();
      } else {
        alert(res.data.message || '解除关联失败');
      }
    } catch (error) {
      console.error('解除关联失败:', error);
      alert('解除关联失败');
    }
  };

  return (
    <div className="p-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">系统管理</h1>
        <p className="text-gray-600 mt-1">管理系统用户和角色权限</p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {!isAdminView && (
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              成员管理
            </button>
          )}
          {isAdminView && (
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              用户管理
            </button>
          )}
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            角色管理
          </button>
        </nav>
      </div>

      <div className="mb-4 flex justify-end">
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {activeTab === 'roles' ? '新建角色' : '注册新用户'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : activeTab === 'members' ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">当前主体成员</h3>
            {canWrite && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingUser(undefined);
                    setShowUserModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  注册新用户
                </button>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                >
                  添加已有用户
                </button>
              </div>
            )}
          </div>
          {ownerMembers.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">手机</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">主体角色</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">加入时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
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
                              编辑
                            </button>
                            <button
                              onClick={() => handleRemoveOwner(member.id, currentOwnerId!)}
                              className="text-red-600 hover:text-red-800"
                            >
                              解除关联
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">暂无成员</div>
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

      {showAddMemberModal && (
        <AddMemberModal
          users={availableUsers}
          roles={roles}
          onAdd={handleAddMember}
          onClose={() => setShowAddMemberModal(false)}
          onOpen={() => { fetchAvailableUsers(); }}
        />
      )}
    </div>
  );
};

interface AddMemberModalProps {
  users: any[];
  roles: Role[];
  onAdd: (userId: string, role: string) => void;
  onClose: () => void;
  onOpen: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ users, roles, onAdd, onClose, onOpen }) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('MANAGER');

  useEffect(() => {
    onOpen();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      onAdd(selectedUser, selectedRole);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">添加已有用户</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择用户</label>
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">请选择用户</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分配角色</label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">请选择角色</option>
                {roles.filter(r => r.code !== 'ADMIN').map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!selectedUser}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SystemManage;
