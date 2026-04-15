import React, { useState, useEffect } from 'react';
import { Role, User, Owner } from './types';
import { RoleList, RoleModal } from './RoleManage';
import { UserList, UserModal } from './UserManage';
import { PERMISSIONS } from '../../pages/System/types';
import { useAuthStore } from '../../stores/auth';
import { useOwnerStore } from '../../stores/owner';
import { permissionApi, userApi } from '../../api';

type Tab = 'users' | 'roles';

export const SystemManage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const { user, setPermissions } = useAuthStore();
  const { owners } = useOwnerStore();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'roles') {
        const rolesRes = await permissionApi.getRoles();
        if (rolesRes.data.success) {
          setRoles(rolesRes.data.data);
        }
      } else {
        const usersRes = await userApi.list();
        if (usersRes.data.success) {
          setUsers(usersRes.data.data);
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
        setShowRoleModal(false);
        setEditingRole(undefined);
        loadData();

        // 如果更新的角色是当前用户的角色，刷新权限
        if (editingRole && user?.role === editingRole.code) {
          try {
            const permRes = await permissionApi.getMyPermissions();
            if (permRes.data.success) {
              setPermissions(permRes.data.data.permissions);
            }
          } catch (permError) {
            console.error('刷新权限失败:', permError);
          }
        }
      } else {
        alert(res.data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存角色失败:', error);
      alert('保存失败');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('确定要删除该角色吗？')) return;
    try {
      const res = await permissionApi.deleteRole(id);

      if (res.data.success) {
        loadData();
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
      } else {
        alert(res.data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存用户失败:', error);
      alert('保存失败');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定要删除该用户吗？')) return;
    try {
      const res = await userApi.delete(id);

      if (res.data.success) {
        loadData();
      } else {
        alert(res.data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除失败');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">系统管理</h1>
        <p className="text-gray-600 mt-1">管理系统用户和角色权限</p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
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
          {activeTab === 'roles' ? '新建角色' : '新建用户'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : activeTab === 'users' ? (
        <UserList
          users={users}
          onEdit={(user) => {
            setEditingUser(user);
            setShowUserModal(true);
          }}
          onDelete={handleDeleteUser}
        />
      ) : (
        <RoleList
          roles={roles}
          onEdit={(role) => {
            setEditingRole(role);
            setShowRoleModal(true);
          }}
          onDelete={handleDeleteRole}
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
        />
      )}

      {showUserModal && (
        <UserModal
          user={editingUser}
          owners={owners}
          roles={roles}
          onSave={handleSaveUser}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(undefined);
          }}
        />
      )}
    </div>
  );
};

export default SystemManage;
