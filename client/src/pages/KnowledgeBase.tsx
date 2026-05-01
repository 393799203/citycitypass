import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import { useOwnerStore } from '../stores/owner';
import { aiApi } from '../api/ai';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Search, RefreshCw, Save, X } from 'lucide-react';
import { useConfirm } from '../components/ConfirmProvider';
import { useTranslation } from 'react-i18next';

const getTypeMap = (t: any): Record<string, string> => ({
  'format': t('knowledgeBase.typeFormat'),
  'product': t('knowledgeBase.typeProduct'),
  'rule': t('knowledgeBase.typeRule'),
  'process': t('knowledgeBase.typeProcess'),
  'others': t('knowledgeBase.typeOthers')
});

const getCategoryMap = (t: any): Record<string, string> => ({
  'order': t('knowledgeBase.categoryOrder'),
  'inventory': t('knowledgeBase.categoryInventory'),
  'dispatch': t('knowledgeBase.categoryDispatch'),
  'return': t('knowledgeBase.categoryReturn'),
  'batch': t('knowledgeBase.categoryBatch'),
  'product': t('knowledgeBase.categoryProduct'),
  'others': t('knowledgeBase.categoryOthers')
});

const getTypeName = (type: string, t: any): string => {
  return getTypeMap(t)[type] || type;
};

const getCategoryName = (category: string, t: any): string => {
  return getCategoryMap(t)[category] || category;
};

interface Document {
  id: string;
  content: string;
  metadata: {
    type: string;
    title: string;
    category: string;
    originalId?: string;
  };
  embedding?: boolean;
  score: number;
  rank: number;
}

interface DocumentFormData {
  content: string;
  metadata: {
    type: string;
    title: string;
    category: string;
    originalId?: string;
  };
}

export default function KnowledgeBase() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currentOwnerId } = useOwnerStore();
  const { confirm } = useConfirm();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState<DocumentFormData>({
    content: '',
    metadata: {
      type: 'format',
      title: '',
      category: 'order',
    },
  });

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await aiApi.queryDocuments('', 100);
      if (response.success) {
        setDocuments(response.data || []);
      } else {
        toast.error(t('knowledgeBase.fetchFailed'));
      }
    } catch (error) {
      toast.error(t('knowledgeBase.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await aiApi.queryDocuments(searchQuery, 100);
      if (response.success) {
        setDocuments(response.data || []);
      } else {
        toast.error(t('knowledgeBase.searchFailed'));
      }
    } catch (error) {
      toast.error(t('knowledgeBase.searchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async () => {
    setLoading(true);
    try {
      const response = await aiApi.addDocument(formData.content, formData.metadata);
      if (response.success) {
        toast.success(t('knowledgeBase.addSuccess'));
        setShowAddModal(false);
        fetchDocuments();
      } else {
        toast.error(t('knowledgeBase.addFailed'));
      }
    } catch (error) {
      toast.error(t('knowledgeBase.addFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditDocument = async () => {
    if (!currentDocument) return;
    setLoading(true);
    try {
      await aiApi.deleteDocument(currentDocument.id);
      const response = await aiApi.addDocument(formData.content, formData.metadata);
      if (response.success) {
        toast.success(t('knowledgeBase.updateSuccess'));
        setShowEditModal(false);
        fetchDocuments();
      } else {
        toast.error(t('knowledgeBase.updateFailed'));
      }
    } catch (error) {
      toast.error(t('knowledgeBase.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    const ok = await confirm({ message: t('knowledgeBase.deleteConfirm') });
    if (!ok) return;
    setLoading(true);
    try {
      const response = await aiApi.deleteDocument(id);
      if (response.success) {
        toast.success(t('knowledgeBase.deleteSuccess'));
        fetchDocuments();
      } else {
        toast.error(t('knowledgeBase.deleteFailed'));
      }
    } catch (error) {
      toast.error(t('knowledgeBase.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshEmbedding = async (document: Document) => {
    setLoading(true);
    try {
      const response = await aiApi.updateDocumentEmbedding(document.id);
      if (response.success) {
        toast.success(t('knowledgeBase.vectorRefreshSuccess'));
        fetchDocuments();
      } else {
        toast.error(t('knowledgeBase.vectorRefreshFailed'));
      }
    } catch (error) {
      toast.error(t('knowledgeBase.vectorRefreshFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (document: Document) => {
    setCurrentDocument(document);
    setFormData({
      content: document.content,
      metadata: document.metadata,
    });
    setShowEditModal(true);
  };

  const handleAdd = () => {
    setFormData({
      content: '',
      metadata: {
        type: 'format',
        title: '',
        category: 'order',
      },
    });
    setShowAddModal(true);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800">{t('knowledgeBase.title')}</h1>
        <button
          onClick={handleAdd}
          disabled={!currentOwnerId}
          title={!currentOwnerId ? t('knowledgeBase.pleaseSelectOwner') : ''}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
            currentOwnerId
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" />
          {t('knowledgeBase.addDocument')}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('knowledgeBase.searchPlaceholder')}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          <Search className="w-4 h-4" />
          {t('knowledgeBase.search')}
        </button>
        <button
          onClick={fetchDocuments}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          {t('knowledgeBase.refresh')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('knowledgeBase.titleColumn')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('knowledgeBase.typeColumn')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('knowledgeBase.categoryColumn')}
              </th>
              <th className="px-10 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('knowledgeBase.contentColumn')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('knowledgeBase.vectorizedColumn')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('knowledgeBase.actionsColumn')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {doc.metadata.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getTypeName(doc.metadata.type, t)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getCategoryName(doc.metadata.category, t)}
                </td>
                <td className="px-10 py-4 text-sm text-gray-500 max-w-md truncate">
                  {doc.content}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.embedding ? t('knowledgeBase.yes') : t('knowledgeBase.no')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(doc)}
                    className="text-primary-600 hover:text-primary-900 mr-3"
                  >
                    <Pencil className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleRefreshEmbedding(doc)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title={t('knowledgeBase.refreshVector')}
                  >
                    <RefreshCw className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <RefreshCw className="w-6 h-6 animate-spin text-primary-600 mx-auto" />
            <p className="mt-2 text-center text-gray-600">{t('knowledgeBase.processing')}</p>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{t('knowledgeBase.addDocument')}</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('knowledgeBase.titleLabel')}
                </label>
                <input
                  type="text"
                  value={formData.metadata.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metadata: {
                        ...formData.metadata,
                        title: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('knowledgeBase.typeLabel')}
                </label>
                <select
                  value={formData.metadata.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metadata: {
                        ...formData.metadata,
                        type: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="product">{t('knowledgeBase.typeProduct')}</option>
                  <option value="rule">{t('knowledgeBase.typeRule')}</option>
                  <option value="process">{t('knowledgeBase.typeProcess')}</option>
                  <option value="others">{t('knowledgeBase.typeOthers')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('knowledgeBase.categoryLabel')}
                </label>
                <select
                  value={formData.metadata.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metadata: {
                        ...formData.metadata,
                        category: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="order">{t('knowledgeBase.categoryOrder')}</option>
                  <option value="inventory">{t('knowledgeBase.categoryInventory')}</option>
                  <option value="dispatch">{t('knowledgeBase.categoryDispatch')}</option>
                  <option value="return">{t('knowledgeBase.categoryReturn')}</option>
                  <option value="batch">{t('knowledgeBase.categoryBatch')}</option>
                  <option value="product">{t('knowledgeBase.categoryProduct')}</option>
                  <option value="others">{t('knowledgeBase.categoryOthers')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('knowledgeBase.contentLabel')}
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      content: e.target.value,
                    })
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddDocument}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{t('knowledgeBase.editDocument')}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('knowledgeBase.titleLabel')}
                </label>
                <input
                  type="text"
                  value={formData.metadata.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metadata: {
                        ...formData.metadata,
                        title: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('knowledgeBase.typeLabel')}
                </label>
                <select
                  value={formData.metadata.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metadata: {
                        ...formData.metadata,
                        type: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="format">{t('knowledgeBase.typeFormat')}</option>
                  <option value="product">{t('knowledgeBase.typeProduct')}</option>
                  <option value="rule">{t('knowledgeBase.typeRule')}</option>
                  <option value="process">{t('knowledgeBase.typeProcess')}</option>
                  <option value="others">{t('knowledgeBase.typeOthers')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('knowledgeBase.categoryLabel')}
                </label>
                <select
                  value={formData.metadata.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metadata: {
                        ...formData.metadata,
                        category: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="order">{t('knowledgeBase.categoryOrder')}</option>
                  <option value="inventory">{t('knowledgeBase.categoryInventory')}</option>
                  <option value="dispatch">{t('knowledgeBase.categoryDispatch')}</option>
                  <option value="return">{t('knowledgeBase.categoryReturn')}</option>
                  <option value="batch">{t('knowledgeBase.categoryBatch')}</option>
                  <option value="product">{t('knowledgeBase.categoryProduct')}</option>
                  <option value="others">{t('knowledgeBase.categoryOthers')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('knowledgeBase.contentLabel')}
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      content: e.target.value,
                    })
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleEditDocument}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}
