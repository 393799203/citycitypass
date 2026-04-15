import React, { useState } from 'react';
import { User, Owner, Role, ROLE_NAMES, ROLE_COLORS } from './types';
import { useAuthStore } from '../../stores/auth';
import PhoneInput from '../../components/PhoneInput';
import EmailInput from '../../components/EmailInput';

interface UserModalProps {
  user?: User;
  owners: Owner[];
  roles: Role[];
  onSave: (data: Partial<User>) => void;
  onClose: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ user, owners, roles, onSave, onClose }) => {
  const { user: currentUser } = useAuthStore();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    name: user?.name || '',
    role: user?.role || 'WAREHOUSE_MANAGER',
    phone: user?.phone || '',
    email: user?.email || '',
    ownerIds: user?.ownerIds || '',
  });

  const isAdmin = currentUser?.role === 'ADMIN';
  const selectedRoleIsAdmin = formData.role === 'ADMIN';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 如果是ADMIN角色，ownerIds设为空字符串表示关联所有主体
    const dataToSave = {
      ...formData,
      ownerIds: selectedRoleIsAdmin ? '' : formData.ownerIds,
    };
    onSave(dataToSave);
  };

  const selectedOwnerIds = formData.ownerIds ? formData.ownerIds.split(',').filter(Boolean) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">{user ? '编辑用户' : '新建用户'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
            )}

            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  required={!user}
                  minLength={6}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
              <select
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
              >
                {roles.map(role => (
                  <option key={role.code} value={role.code}>{role.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">关联主体</label>
              {selectedRoleIsAdmin ? (
                <div className="border rounded-md p-3 bg-gray-50">
                  <p className="text-sm text-gray-600">系统管理员无需选择主体，自动关联所有主体</p>
                </div>
              ) : owners.length === 0 ? (
                <p className="text-sm text-gray-500">暂无主体</p>
              ) : (
                <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                  {owners.map(owner => {
                    const isSelected = selectedOwnerIds.includes(owner.id);
                    return (
                      <label
                        key={owner.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            let newIds: string[];
                            if (e.target.checked) {
                              newIds = [...selectedOwnerIds, owner.id];
                            } else {
                              newIds = selectedOwnerIds.filter(id => id !== owner.id);
                            }
                            setFormData(prev => ({ ...prev, ownerIds: newIds.join(',') }));
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{owner.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <PhoneInput
                value={formData.phone}
                onChange={phone => setFormData(prev => ({ ...prev, phone }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <EmailInput
                value={formData.email}
                onChange={email => setFormData(prev => ({ ...prev, email }))}
                className="w-full"
              />
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

export const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">手机</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联主体</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map(user => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`px-2 py-1 rounded-full text-xs ${ROLE_COLORS[user.role]?.bg || 'bg-gray-100'} ${ROLE_COLORS[user.role]?.text || 'text-gray-800'}`}>
                  {ROLE_NAMES[user.role] || user.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone || '-'}</td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {user.role === 'ADMIN'
                  ? '所有主体'
                  : (user.owners && user.owners.length > 0
                    ? user.owners.map(o => o.name).join(', ')
                    : '-')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  onClick={() => onEdit(user)}
                  className="text-blue-600 hover:text-blue-800 mr-3"
                >
                  编辑
                </button>
                <button
                  onClick={() => onDelete(user.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
