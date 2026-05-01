import React, { useState, useEffect } from 'react';
import { Role, PERMISSIONS, MODULE_NAMES, PermissionValue } from './types';
import { useTranslation } from 'react-i18next';

interface RoleModalProps {
  role?: Role;
  onSave: (data: Partial<Role>) => void;
  onClose: () => void;
  canWrite?: boolean;
  isAdmin?: boolean;
}

export const RoleModal: React.FC<RoleModalProps> = ({ role, onSave, onClose, canWrite = false, isAdmin = false }) => {
  const { t } = useTranslation();
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
      alert(t('system.roleCodeRequired'));
      return;
    }
    if (!formData.name.trim()) {
      alert(t('system.roleNameRequired'));
      return;
    }
    
    onSave(formData);
  };

  const isReadOnly = !canWrite || (role?.isDefault && !isAdmin);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b flex justify-between items-center flex-shrink-0">
          <h3 className="text-base sm:text-lg font-medium">{!canWrite || (role?.isDefault && !isAdmin) ? t('system.viewRole') : (role ? t('system.editRole') : t('system.createRole'))}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-3 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('system.roleCodeLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                disabled={!!role || isReadOnly}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100 text-sm"
                required
                placeholder={t('system.roleCodePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('system.roleNameLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100 text-sm"
                required
                placeholder={t('system.roleNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('system.roleDescriptionLabel')}</label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100 text-sm"
                placeholder={t('common.optional')}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('system.permissionConfig')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="border rounded-lg p-3 sm:p-4">
                <div className="font-medium text-gray-800 mb-3 text-sm sm:text-base">{t('system.businessModule')}</div>
                <div className="space-y-2">
                  {Object.entries(PERMISSIONS.business).map(([action, info]) => (
                    <div key={action} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-xs sm:text-sm">{info.name}</span>
                      <select
                        value={formData.permissions['business']?.[action] || 'NONE'}
                        onChange={e => handlePermissionChange('business', action, e.target.value as PermissionValue)}
                        disabled={isReadOnly}
                        className="text-xs sm:text-sm border rounded px-2 py-1 disabled:bg-gray-200"
                      >
                        <option value="WRITE">{t('system.permissionWrite')}</option>
                        <option value="READ">{t('system.permissionRead')}</option>
                        <option value="NONE">{t('system.permissionNone')}</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-3 sm:p-4">
                  <div className="font-medium text-gray-800 mb-3 text-sm sm:text-base">{t('system.configModule')}</div>
                  <div className="space-y-2">
                    {Object.entries(PERMISSIONS.config).map(([action, info]) => (
                      <div key={action} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-xs sm:text-sm">{info.name}</span>
                        <select
                          value={formData.permissions['config']?.[action] || 'NONE'}
                          onChange={e => handlePermissionChange('config', action, e.target.value as PermissionValue)}
                          disabled={isReadOnly}
                          className="text-xs sm:text-sm border rounded px-2 py-1 disabled:bg-gray-200"
                        >
                          <option value="WRITE">{t('system.permissionWrite')}</option>
                          <option value="READ">{t('system.permissionRead')}</option>
                          <option value="NONE">{t('system.permissionNone')}</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-3 sm:p-4">
                  <div className="font-medium text-gray-800 mb-3 text-sm sm:text-base">{t('system.systemModule')}</div>
                  <div className="space-y-2">
                    {Object.entries(PERMISSIONS.system).map(([action, info]) => (
                      <div key={action} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-xs sm:text-sm">{info.name}</span>
                        <select
                          value={formData.permissions['system']?.[action] || 'NONE'}
                          onChange={e => handlePermissionChange('system', action, e.target.value as PermissionValue)}
                          disabled={isReadOnly}
                          className="text-xs sm:text-sm border rounded px-2 py-1 disabled:bg-gray-200"
                        >
                          <option value="WRITE">{t('system.permissionWrite')}</option>
                          <option value="READ">{t('system.permissionRead')}</option>
                          <option value="NONE">{t('system.permissionNone')}</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
            >
              {t('system.cancelBtn')}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                {t('system.saveBtn')}
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
  const { t } = useTranslation();
  
  return (
    <div className="bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('system.roleCodeLabel')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('system.roleNameLabel')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('system.roleDescriptionLabel')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('system.defaultRole')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
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
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{t('system.yes')}</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{t('system.no')}</span>
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
                          {t('system.editPermission')}
                        </button>
                        {!role.isDefault && role.code !== 'ADMIN' && role.code !== 'OWNER' && (
                          <button
                            onClick={() => onDelete(role.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            {t('system.deleteBtn')}
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
                    {t('system.viewPermission')}
                  </button>
                ) : canWrite ? (
                  <button
                    onClick={() => onEdit(role)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    {t('system.editPermission')}
                  </button>
                ) : (
                  <button
                    onClick={() => onEdit(role)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    {t('system.viewPermission')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sm:hidden space-y-2 p-2">
        {roles.map(role => (
          <div key={role.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium text-sm text-gray-800 truncate">{role.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{role.code}</span>
                {role.isDefault && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] flex-shrink-0">{t('system.defaultRole')}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {isAdmin ? (
                  <>
                    {role.code !== 'ADMIN' && (
                      <>
                        <button
                          onClick={() => onEdit(role)}
                          className="text-blue-600 text-xs"
                        >
                          {t('system.editPermission')}
                        </button>
                        {!role.isDefault && role.code !== 'ADMIN' && role.code !== 'OWNER' && (
                          <button
                            onClick={() => onDelete(role.id)}
                            className="text-red-600 text-xs"
                          >
                            {t('system.deleteBtn')}
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : canWrite && role.isDefault ? (
                  <button
                    onClick={() => onEdit(role)}
                    className="text-blue-600 text-xs"
                  >
                    {t('system.viewBtn')}
                  </button>
                ) : canWrite ? (
                  <button
                    onClick={() => onEdit(role)}
                    className="text-blue-600 text-xs"
                  >
                    {t('system.editBtn')}
                  </button>
                ) : (
                  <button
                    onClick={() => onEdit(role)}
                    className="text-blue-600 text-xs"
                  >
                    {t('system.viewBtn')}
                  </button>
                )}
              </div>
            </div>
            {role.description && (
              <div className="text-xs text-gray-500 mt-1 truncate">{role.description}</div>
            )}
          </div>
        ))}
        {roles.length === 0 && (
          <div className="text-center text-gray-500 py-8">{t('system.noRoleData')}</div>
        )}
      </div>
    </div>
  );
};
