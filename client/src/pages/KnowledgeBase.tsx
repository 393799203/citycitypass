import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import { aiApi } from '../api/ai';
import { ToastContainer, toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Search, RefreshCw, Save, X } from 'lucide-react';
import { useConfirm } from '../components/ConfirmProvider';

// 类型和分类的中英文映射
const typeMap: Record<string, string> = {
  'format': '格式',
  'product': '商品',
  'rule': '规则',
  'process': '流程'
};

const categoryMap: Record<string, string> = {
  'order': '订单',
  'inventory': '库存',
  'dispatch': '调度',
  'return': '退货',
  'batch': '批次',
  'product': '商品'
};

// 获取中文类型
const getTypeName = (type: string): string => {
  return typeMap[type] || type;
};

// 获取中文分类
const getCategoryName = (category: string): string => {
  return categoryMap[category] || category;
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
  const { user } = useAuthStore();
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
      // 空查询时获取所有文档，不限制数量
      const response = await aiApi.queryDocuments('', 100);
      if (response.success) {
        setDocuments(response.data || []);
      } else {
        toast.error('获取知识库失败');
      }
    } catch (error) {
      toast.error('获取知识库失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      // 搜索时也获取所有文档，不限制数量
      const response = await aiApi.queryDocuments(searchQuery, 100);
      if (response.success) {
        setDocuments(response.data || []);
      } else {
        toast.error('搜索失败');
      }
    } catch (error) {
      toast.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async () => {
    setLoading(true);
    try {
      const response = await aiApi.addDocument(formData.content, formData.metadata);
      if (response.success) {
        toast.success('添加成功');
        setShowAddModal(false);
        fetchDocuments();
      } else {
        toast.error('添加失败');
      }
    } catch (error) {
      toast.error('添加失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDocument = async () => {
    if (!currentDocument) return;
    setLoading(true);
    try {
      // 先删除旧文档，再添加新文档
      await aiApi.deleteDocument(currentDocument.id);
      const response = await aiApi.addDocument(formData.content, formData.metadata);
      if (response.success) {
        toast.success('更新成功');
        setShowEditModal(false);
        fetchDocuments();
      } else {
        toast.error('更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    const ok = await confirm({ message: '确定要删除这个文档吗？' });
    if (!ok) return;
    setLoading(true);
    try {
      const response = await aiApi.deleteDocument(id);
      if (response.success) {
        toast.success('删除成功');
        fetchDocuments();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshEmbedding = async (document: Document) => {
    setLoading(true);
    try {
      // 直接更新向量嵌入
      const response = await aiApi.updateDocumentEmbedding(document.id);
      if (response.success) {
        toast.success('向量刷新成功');
        fetchDocuments();
      } else {
        toast.error('向量刷新失败');
      }
    } catch (error) {
      toast.error('向量刷新失败');
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
        <h1 className="text-xl font-semibold text-gray-800">知识库管理</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          添加文档
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索知识库..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          <Search className="w-4 h-4" />
          搜索
        </button>
        <button
          onClick={fetchDocuments}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                标题
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                分类
              </th>
              <th className="px-10 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                内容
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                向量化
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
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
                  {getTypeName(doc.metadata.type)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getCategoryName(doc.metadata.category)}
                </td>
                <td className="px-10 py-4 text-sm text-gray-500 max-w-md truncate">
                  {doc.content}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.embedding ? '是' : '否'}
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
                    title="刷新向量"
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
            <p className="mt-2 text-center text-gray-600">处理中...</p>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">添加文档</h2>
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
                  标题
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
                  类型
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
                  <option value="format">格式</option>
                  <option value="product">商品</option>
                  <option value="rule">规则</option>
                  <option value="process">流程</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类
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
                  <option value="order">订单</option>
                  <option value="inventory">库存</option>
                  <option value="dispatch">调度</option>
                  <option value="return">退货</option>
                  <option value="batch">批次</option>
                  <option value="product">商品</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  内容
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
                取消
              </button>
              <button
                onClick={handleAddDocument}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">编辑文档</h2>
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
                  标题
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
                  类型
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
                  <option value="format">格式</option>
                  <option value="product">商品</option>
                  <option value="rule">规则</option>
                  <option value="process">流程</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类
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
                  <option value="order">订单</option>
                  <option value="inventory">库存</option>
                  <option value="dispatch">调度</option>
                  <option value="return">退货</option>
                  <option value="batch">批次</option>
                  <option value="product">商品</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  内容
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
                取消
              </button>
              <button
                onClick={handleEditDocument}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
