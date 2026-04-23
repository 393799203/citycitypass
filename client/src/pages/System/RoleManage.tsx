import React, { useState, useEffect } from 'react';
import { Role, PERMISSIONS, MODULE_NAMES, PermissionValue } from './types';

interface RoleModalProps {
  role?: Role;
  onSave: (data: Partial<Role>) => void;
  onClose: () => void;
  canWrite?: boolean;
  isAdmin?: boolean;
}

export const RoleModal: React.FC<RoleModalProps> = ({ role, onSave, onClose, canWrite = false, isAdmin = false }) => {
  const [formData, setFormData] = useState({
    code: role?.code || '',
    name: role?.name || '',
    description: role?.description || '',
    permissions: role?.permissions || {
      business: {}, config: {}, system: {}
    } as Record<string, Record<string, PermissionValue>>,
  });

  const handlePermissionChange = (
    module: string,
    action: string,
    value: PermissionValue
  ) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: value,
        },
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role?.isDefault && !isAdmin) return;
    
    if (!formData.code.trim()) {
      alert('请输入角色代码');
      return;
    }
    if (!formData.name.trim()) {
      alert('请输入角色名称');
      return;
    }
    
    onSave(formData);
  };

  const isReadOnly = !canWrite || (role?.isDefault && !isAdmin);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-medium">{!canWrite || (role?.isDefault && !isAdmin) ? '查看角色' : (role ? '编辑角色' : '新建角色')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色代码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                disabled={!!role || isReadOnly}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                required
                placeholder="如：MANAGER"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                required
                placeholder="如：管理员"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色描述</label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                placeholder="可选"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">权限配置</label>
            <div className="grid grid-cols-2 gap-6">
              {/* 左侧 - 业务模块 */}
              <div className="border rounded-lg p-4">
                <div className="font-medium text-gray-800 mb-3">业务模块</div>
                <div className="space-y-2">
                  {Object.entries(PERMISSIONS.business).map(([action, info]) => (
                    <div key={action} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-sm">{info.name}</span>
                      <select
                        value={formData.permissions['business']?.[action] || 'NONE'}
                        onChange={e => handlePermissionChange('business', action, e.target.value as PermissionValue)}
                        disabled={isReadOnly}
                        className="text-sm border rounded px-2 py-1 disabled:bg-gray-200"
                      >
                        <option value="WRITE">可操作</option>
                        <option value="READ">可查看</option>
                        <option value="NONE">无权限</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* 右侧 - 配置模块和系统模块 */}
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="font-medium text-gray-800 mb-3">配置模块</div>
                  <div className="space-y-2">
                    {Object.entries(PERMISSIONS.config).map(([action, info]) => (
                      <div key={action} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm">{info.name}</span>
                        <select
                          value={formData.permissions['config']?.[action] || 'NONE'}
                          onChange={e => handlePermissionChange('config', action, e.target.value as PermissionValue)}
                          disabled={isReadOnly}
                          className="text-sm border rounded px-2 py-1 disabled:bg-gray-200"
                        >
                          <option value="WRITE">可操作</option>
                          <option value="READ">可查看</option>
                          <option value="NONE">无权限</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="font-medium text-gray-800 mb-3">系统模块</div>
                  <div className="space-y-2">
                    {Object.entries(PERMISSIONS.system).map(([action, info]) => (
                      <div key={action} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm">{info.name}</span>
                        <select
                          value={formData.permissions['system']?.[action] || 'NONE'}
                          onChange={e => handlePermissionChange('system', action, e.target.value as PermissionValue)}
                          disabled={isReadOnly}
                          className="text-sm border rounded px-2 py-1 disabled:bg-gray-200"
                        >
                          <option value="WRITE">可操作</option>
                          <option value="READ">可查看</option>
                          <option value="NONE">无权限</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                保存
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

interface RoleListProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (id: string) => void;
  canWrite?: boolean;
  isAdmin?: boolean;
}

export const RoleList: React.FC<RoleListProps> = ({ roles, onEdit, onDelete, canWrite = false, isAdmin = false }) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色代码</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色名称</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">默认角色</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {roles.map(role => (
            <tr key={role.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.code}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{role.description || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {role.isDefault ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">是</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">否</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {isAdmin ? (
                  <>
                    {role.code !== 'ADMIN' && (
                      <>
                        <button
                          onClick={() => onEdit(role)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          编辑权限
                        </button>
                        {!role.isDefault && role.code !== 'ADMIN' && role.code !== 'OWNER' && (
                          <button
                            onClick={() => onDelete(role.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            删除
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : canWrite && role.isDefault ? (
                  <button
                    onClick={() => onEdit(role)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    查看权限
                  </button>
                ) : canWrite ? (
                  <button
                    onClick={() => onEdit(role)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    编辑权限
                  </button>
                ) : (
                  <button
                    onClick={() => onEdit(role)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    查看权限
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
