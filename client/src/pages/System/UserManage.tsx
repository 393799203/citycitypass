import React, { useState } from 'react';
import { User, Owner, Role, ROLE_NAMES, ROLE_COLORS } from './types';
import { useAuthStore } from '../../stores/auth';
import PhoneInput from '../../components/PhoneInput';
import EmailInput from '../../components/EmailInput';
import { formatPhone } from '../../utils/format';

const ALL_ROLES = ['OWNER', 'MANAGER', 'WAREHOUSE_MANAGER', 'TRANSPORT_MANAGER', 'AFTER_SALES_MANAGER', 'GUEST'];

interface OwnerRole {
  ownerId: string;
  ownerName: string;
  roleId: string;
  roleCode?: string;
  roleName?: string;
}

interface UserModalProps {
  user?: User;
  owners: Owner[];
  roles?: Role[];
  onSave: (data: any) => void;
  onClose: () => void;
  isMemberMode?: boolean;
  currentOwnerId?: string | null;
  currentOwnerName?: string | null;
  canWrite?: boolean;
}

export const UserModal: React.FC<UserModalProps> = ({
  user,
  owners,
  roles,
  onSave,
  onClose,
  isMemberMode = false,
  currentOwnerId,
  currentOwnerName,
  canWrite = false
}) => {
  const { user: currentUser } = useAuthStore();

  const getInitialOwnerRoles = (): OwnerRole[] => {
    if (isMemberMode && currentOwnerId && currentOwnerName) {
      const existingRole = user?.owners?.find(o => o.ownerId === currentOwnerId);
      const defaultRoleId = roles && roles.length > 0 ? roles.find(r => r.code === 'MANAGER')?.id || roles[0].id : '';
      return [{
        ownerId: currentOwnerId,
        ownerName: currentOwnerName,
        roleId: existingRole?.roleId || defaultRoleId
      }];
    }
    if (user?.owners && user.owners.length > 0) {
      return user.owners.map(o => ({
        ownerId: o.ownerId,
        ownerName: o.ownerName,
        roleId: o.roleId,
        roleCode: o.roleCode,
        roleName: o.roleName,
      }));
    }
    return [];
  };

  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    name: user?.name || '',
    isAdmin: user?.isAdmin || false,
    phone: user?.phone || '',
    email: user?.email || '',
  });

  const [ownerRoles, setOwnerRoles] = useState<OwnerRole[]>(getInitialOwnerRoles());

  const isCurrentUserAdmin = currentUser?.isAdmin === true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      ownerRoles: formData.isAdmin ? [] : ownerRoles,
    };
    onSave(dataToSave);
  };

  const updateOwnerRole = (ownerId: string, roleId: string) => {
    setOwnerRoles(prev =>
      prev.map(or => or.ownerId === ownerId ? { ...or, roleId } : or)
    );
  };

  const removeOwnerRole = (ownerId: string) => {
    setOwnerRoles(prev => prev.filter(or => or.ownerId !== ownerId));
  };

  const addOwnerRole = (ownerId: string, ownerName: string) => {
    if (!ownerRoles.find(or => or.ownerId === ownerId)) {
      const defaultRoleId = roles && roles.length > 0 ? roles.find(r => r.code === 'MANAGER')?.id || roles[0].id : '';
      setOwnerRoles(prev => [...prev, { ownerId, ownerName, roleId: defaultRoleId }]);
    }
  };

  const availableOwners = owners.filter(o => !ownerRoles.find(or => or.ownerId === o.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">{user ? '编辑用户' : '新建用户'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {!user && (
              <>
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
              </>
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

            {isCurrentUserAdmin && !isMemberMode && (
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isAdmin}
                    onChange={e => setFormData(prev => ({ ...prev, isAdmin: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">系统管理员</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">系统管理员无需选择主体，可访问所有数据</p>
              </div>
            )}

            {!formData.isAdmin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    关联主体 {isMemberMode && <span className="text-gray-400 text-xs">（不可更改）</span>}
                  </label>
                  {ownerRoles.length === 0 ? (
                    <p className="text-sm text-gray-500 border rounded-md p-3">暂无关联主体</p>
                  ) : (
                    <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-2">
                      {ownerRoles.map(or => (
                        <div key={or.ownerId} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 flex-1">{or.ownerName}</span>
                          <select
                            value={or.roleId}
                            onChange={e => updateOwnerRole(or.ownerId, e.target.value)}
                            className="px-2 py-1 text-sm border rounded"
                          >
                            {(roles && roles.length > 0 ? roles.filter(r => r.code !== 'ADMIN') : ALL_ROLES.filter(r => r !== 'ADMIN')).map(r => (
                              <option key={typeof r === 'string' ? r : r.id} value={typeof r === 'string' ? r : r.id}>
                                {typeof r === 'string' ? (ROLE_NAMES[r] || r) : r.name}
                              </option>
                            ))}
                          </select>
                          {!isMemberMode && (
                            <button
                              type="button"
                              onClick={() => removeOwnerRole(or.ownerId)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              解除关联
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!isMemberMode && availableOwners.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">添加主体</label>
                    <div className="border rounded-md max-h-32 overflow-y-auto p-2 space-y-1">
                      {availableOwners.map(owner => (
                        <label
                          key={owner.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            onChange={e => {
                              if (e.target.checked) {
                                addOwnerRole(owner.id, owner.name);
                              } else {
                                removeOwnerRole(owner.id);
                              }
                            }}
                            checked={!!ownerRoles.find(or => or.ownerId === owner.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{owner.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

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
  canWrite?: boolean;
}

export const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete, canWrite = false }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">手机</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联主体</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users
            .sort((a, b) => (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0))
            .map(user => {
              const ownerCount = user.isAdmin ? 1 : (user.owners?.length || 0);
            return (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>{user.name}</span>
                    {user.isAdmin && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS['ADMIN']?.bg || 'bg-gray-100'} ${ROLE_COLORS['ADMIN']?.text || 'text-gray-800'}`}>
                        系统管理员
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPhone(user.phone || '')}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.isAdmin ? (
                    <span className="text-gray-500">所有主体</span>
                  ) : (ownerCount > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.owners!.map(o => (
                        <span key={o.ownerId} className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${ROLE_COLORS[o.roleCode]?.bg || 'bg-gray-100'} ${ROLE_COLORS[o.roleCode]?.text || 'text-gray-800'}`}>
                          {o.ownerName}: {o.roleName || o.roleCode}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {canWrite && (
                    <>
                      <button
                        onClick={() => onEdit(user)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        编辑
                      </button>
                      {!user.isAdmin && (
                        <button
                          onClick={() => onDelete(user.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          删除
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
