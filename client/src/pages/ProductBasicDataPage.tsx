import { useState, useEffect } from 'react';
import { productApi } from '../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Pencil, Trash2, X, Loader2, ChevronRight, ChevronDown, Package, Tag, Layers } from 'lucide-react';
import { useConfirm } from '../components/ConfirmProvider';

interface Category {
  id: string;
  code: string;
  name: string;
  subCategories?: SubCategory[];
}

interface SubCategory {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  brands?: Brand[];
}

interface Brand {
  id: string;
  code: string;
  name: string;
  subCategoryId: string;
}

interface Spec {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  subCategoryId: string;
}

interface Packaging {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  subCategoryId: string;
}

export default function ProductBasicDataPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  const [subCategorySpecs, setSubCategorySpecs] = useState<Spec[]>([]);
  const [subCategoryPackagings, setSubCategoryPackagings] = useState<Packaging[]>([]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [showPackagingModal, setShowPackagingModal] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingSpec, setEditingSpec] = useState<Spec | null>(null);
  const [editingPackaging, setEditingPackaging] = useState<Packaging | null>(null);

  const [categoryForm, setCategoryForm] = useState({ code: '', name: '' });
  const [subCategoryForm, setSubCategoryForm] = useState({ code: '', name: '', categoryId: '' });
  const [brandForm, setBrandForm] = useState({ code: '', name: '', subCategoryId: '' });
  const [specForm, setSpecForm] = useState({ code: '', name: '', sortOrder: 0 });
  const [packagingForm, setPackagingForm] = useState({ code: '', name: '', sortOrder: 0 });

  const { confirm } = useConfirm();

  useEffect(() => {
    fetchData(true);
  }, []);

  useEffect(() => {
    if (selectedSubCategory) {
      fetchSpecsAndPackagings(selectedSubCategory);
    } else {
      setSubCategorySpecs([]);
      setSubCategoryPackagings([]);
    }
  }, [selectedSubCategory]);

  const fetchData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const catRes = await productApi.getCategories();
      if (catRes.data.success) {
        setCategories(prevCategories => {
          return catRes.data.data.map((cat: any) => {
            const prevCat = prevCategories.find(c => c.id === cat.id);
            return {
              ...cat,
              subCategories: prevCat?.subCategories || cat.subCategories || [],
            };
          });
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const fetchSpecsAndPackagings = async (subCategoryId: string) => {
    try {
      const [specRes, pkgRes] = await Promise.all([
        productApi.getSpecs(subCategoryId),
        productApi.getPackagings(subCategoryId),
      ]);
      if (specRes.data.success) setSubCategorySpecs(specRes.data.data);
      if (pkgRes.data.success) setSubCategoryPackagings(pkgRes.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSubCategoriesForCategory = (categoryId: string) => {
    productApi.getSubCategories({ categoryId }).then(res => {
      if (res.data.success) {
        setCategories(prev => prev.map(cat =>
          cat.id === categoryId ? { ...cat, subCategories: res.data.data } : cat
        ));
      }
    });
  };

  const fetchBrandsForSubCategory = (subCategoryId: string) => {
    productApi.getBrands({ subCategoryId }).then(res => {
      if (res.data.success) {
        setCategories(prev => prev.map(cat => ({
          ...cat,
          subCategories: cat.subCategories?.map(sub =>
            sub.id === subCategoryId ? { ...sub, brands: res.data.data } : sub
          )
        })));
      }
    });
  };

  const toggleCategory = (id: string) => {
    if (expandedCategories.has(id)) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(new Set([id]));
    }
  };

  const toggleSubCategory = (id: string) => {
    if (expandedSubCategories.has(id)) {
      setExpandedSubCategories(new Set());
    } else {
      setExpandedSubCategories(new Set([id]));
    }
  };

  const refreshCurrentData = () => {
    if (selectedSubCategory) {
      const subCategory = categories.flatMap(c => c.subCategories || []).find(sc => sc.id === selectedSubCategory);
      if (subCategory) {
        fetchSpecsAndPackagings(selectedSubCategory);
        fetchBrandsForSubCategory(selectedSubCategory);
      }
    }
  };

  const openCategoryModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ code: cat.code, name: cat.name });
    } else {
      setEditingCategory(null);
      setCategoryForm({ code: '', name: '' });
    }
    setShowCategoryModal(true);
  };

  const openSubCategoryModal = (sc?: SubCategory, categoryId?: string) => {
    if (sc) {
      setEditingSubCategory(sc);
      setSubCategoryForm({ code: sc.code, name: sc.name, categoryId: sc.categoryId });
    } else {
      setEditingSubCategory(null);
      setSubCategoryForm({ code: '', name: '', categoryId: categoryId || '' });
    }
    setShowSubCategoryModal(true);
  };

  const openBrandModal = (brand?: Brand, subCategoryId?: string) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({ code: brand.code, name: brand.name, subCategoryId: brand.subCategoryId });
    } else {
      setEditingBrand(null);
      setBrandForm({ code: '', name: '', subCategoryId: subCategoryId || '' });
    }
    setShowBrandModal(true);
  };

  const openSpecModal = (spec?: Spec) => {
    if (spec) {
      setEditingSpec(spec);
      setSpecForm({ code: spec.code, name: spec.name, sortOrder: spec.sortOrder });
    } else {
      setEditingSpec(null);
      setSpecForm({ code: '', name: '', sortOrder: subCategorySpecs.length });
    }
    setShowSpecModal(true);
  };

  const openPackagingModal = (pkg?: Packaging) => {
    if (pkg) {
      setEditingPackaging(pkg);
      setPackagingForm({ code: pkg.code, name: pkg.name, sortOrder: pkg.sortOrder });
    } else {
      setEditingPackaging(null);
      setPackagingForm({ code: '', name: '', sortOrder: subCategoryPackagings.length });
    }
    setShowPackagingModal(true);
  };

  const saveCategory = async () => {
    try {
      if (editingCategory) {
        await productApi.updateCategory(editingCategory.id, categoryForm);
        toast.success('更新成功');
      } else {
        await productApi.createCategory(categoryForm);
        toast.success('创建成功');
      }
      setShowCategoryModal(false);
      fetchData();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const saveSubCategory = async () => {
    try {
      if (editingSubCategory) {
        await productApi.updateSubCategory(editingSubCategory.id, subCategoryForm);
        toast.success('更新成功');
      } else {
        await productApi.createSubCategory(subCategoryForm);
        toast.success('创建成功');
      }
      setShowSubCategoryModal(false);
      if (expandedCategories.size > 0) {
        const expandedCatId = Array.from(expandedCategories)[0];
        await fetchSubCategoriesForCategory(expandedCatId);
      }
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const saveBrand = async () => {
    try {
      if (editingBrand) {
        await productApi.updateBrand(editingBrand.id, brandForm);
        toast.success('更新成功');
      } else {
        await productApi.createBrand(brandForm);
        toast.success('创建成功');
      }
      setShowBrandModal(false);
      if (selectedSubCategory) {
        await fetchBrandsForSubCategory(selectedSubCategory);
      }
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const saveSpec = async () => {
    if (!selectedSubCategory) {
      toast.error('请先选择二级分类');
      return;
    }
    try {
      if (editingSpec) {
        await productApi.updateSpec(editingSpec.id, specForm);
        toast.success('更新成功');
      } else {
        await productApi.createSpec({ ...specForm, subCategoryId: selectedSubCategory });
        toast.success('创建成功');
      }
      setShowSpecModal(false);
      await fetchSpecsAndPackagings(selectedSubCategory);
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const savePackaging = async () => {
    if (!selectedSubCategory) {
      toast.error('请先选择二级分类');
      return;
    }
    try {
      if (editingPackaging) {
        await productApi.updatePackaging(editingPackaging.id, packagingForm);
        toast.success('更新成功');
      } else {
        await productApi.createPackaging({ ...packagingForm, subCategoryId: selectedSubCategory });
        toast.success('创建成功');
      }
      setShowPackagingModal(false);
      await fetchSpecsAndPackagings(selectedSubCategory);
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const deleteCategory = async (id: string) => {
    const confirmed = await confirm({
      title: '删除一级分类',
      message: '确定删除该一级分类？其下的二级分类也会一并删除。',
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await productApi.deleteCategory(id);
      toast.success('删除成功');
      setSelectedSubCategory(null);
      fetchData(true);
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const deleteSubCategory = async (id: string) => {
    const confirmed = await confirm({
      title: '删除二级分类',
      message: '确定删除该二级分类？',
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await productApi.deleteSubCategory(id);
      toast.success('删除成功');
      setSelectedSubCategory(null);
      if (expandedCategories.size > 0) {
        const expandedCatId = Array.from(expandedCategories)[0];
        setExpandedCategories(new Set([expandedCatId]));
        fetchSubCategoriesForCategory(expandedCatId);
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const deleteBrand = async (id: string) => {
    const confirmed = await confirm({
      title: '删除品牌',
      message: '确定删除该品牌？',
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await productApi.deleteBrand(id);
      toast.success('删除成功');
      if (selectedSubCategory) {
        await fetchBrandsForSubCategory(selectedSubCategory);
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const deleteSpec = async (id: string) => {
    const confirmed = await confirm({
      title: '删除规格',
      message: '确定删除该规格？',
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await productApi.deleteSpec(id);
      toast.success('删除成功');
      if (selectedSubCategory) {
        await fetchSpecsAndPackagings(selectedSubCategory);
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const deletePackaging = async (id: string) => {
    const confirmed = await confirm({
      title: '删除包装',
      message: '确定删除该包装？',
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await productApi.deletePackaging(id);
      toast.success('删除成功');
      if (selectedSubCategory) {
        await fetchSpecsAndPackagings(selectedSubCategory);
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      <div className="w-1/2 border-r overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layers className="w-5 h-5" />
            分类结构
          </h2>
          <button
            onClick={() => openCategoryModal()}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            一级分类
          </button>
        </div>

        <div className="space-y-1">
          {categories.map(cat => (
            <div key={cat.id}>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 group cursor-pointer"
                style={{ paddingLeft: '8px' }}
                onClick={() => {
                  toggleCategory(cat.id);
                  if (!expandedCategories.has(cat.id) && (!cat.subCategories || cat.subCategories.length === 0)) {
                    fetchSubCategoriesForCategory(cat.id);
                  }
                }}
              >
                <button onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(cat.id);
                  if (!expandedCategories.has(cat.id) && (!cat.subCategories || cat.subCategories.length === 0)) {
                    fetchSubCategoriesForCategory(cat.id);
                  }
                }} className="p-0.5">
                  {expandedCategories.has(cat.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <Tag className="w-4 h-4 text-orange-500" />
                <span className="flex-1 font-medium">{cat.name}</span>
                <span className="text-xs text-gray-400">{cat.code}</span>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openSubCategoryModal(undefined, cat.id); }} className="p-1 text-primary-600 hover:bg-primary-50 rounded">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openCategoryModal(cat); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {expandedCategories.has(cat.id) && (
                <div className="ml-6 space-y-1 overflow-hidden transition-all duration-300 ease-in-out">
                  {cat.subCategories?.map(sc => (
                    <div key={sc.id}>
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 group cursor-pointer ${
                          selectedSubCategory === sc.id ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                        style={{ paddingLeft: '8px' }}
                        onClick={() => {
                          setSelectedSubCategory(sc.id);
                          toggleSubCategory(sc.id);
                          if (!sc.brands) {
                            fetchBrandsForSubCategory(sc.id);
                          }
                        }}
                      >
                        <button onClick={(e) => {
                          e.stopPropagation();
                          toggleSubCategory(sc.id);
                          if (!sc.brands) {
                            fetchBrandsForSubCategory(sc.id);
                          }
                        }} className="p-0.5">
                          {expandedSubCategories.has(sc.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <Package className="w-4 h-4 text-blue-500" />
                        <span className="flex-1">{sc.name}</span>
                        <span className="text-xs text-gray-400">{sc.code}</span>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openBrandModal(undefined, sc.id); }} className="p-1 text-primary-600 hover:bg-primary-50 rounded">
                            <Plus className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openSubCategoryModal(sc); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteSubCategory(sc.id); }} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {expandedSubCategories.has(sc.id) && (
                        <div className="ml-6 space-y-1 overflow-hidden transition-all duration-300 ease-in-out">
                          {sc.brands?.map(brand => (
                            <div
                              key={brand.id}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 group"
                              style={{ paddingLeft: '8px' }}
                            >
                              <div className="w-4" />
                              <span className="w-3 h-3 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                B
                              </span>
                              <span className="flex-1 text-sm">{brand.name}</span>
                              <span className="text-xs text-gray-400">{brand.code}</span>
                              <div className="hidden group-hover:flex items-center gap-1">
                                <button onClick={() => openBrandModal(brand)} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => deleteBrand(brand.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {(!sc.brands || sc.brands.length === 0) && (
                            <div className="px-3 py-1.5 text-sm text-gray-400 italic" style={{ paddingLeft: '32px' }}>
                              暂无品牌
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!cat.subCategories || cat.subCategories.length === 0) && (
                    <div className="px-3 py-1.5 text-sm text-gray-400 italic" style={{ paddingLeft: '32px' }}>
                      暂无二级分类
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              暂无分类数据
            </div>
          )}
        </div>
      </div>

      <div className="w-1/2 overflow-y-auto p-4 bg-gray-50">
        {selectedSubCategory ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">规格与包装</h2>
              <span className="text-sm text-gray-500">
                当前二级分类: {categories.flatMap(c => c.subCategories || []).find(sc => sc.id === selectedSubCategory)?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">规格</h3>
                  <button
                    onClick={() => openSpecModal()}
                    className="text-sm text-primary-600 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> 新建
                  </button>
                </div>
                <div className="space-y-2">
                  {subCategorySpecs.map(spec => (
                    <div key={spec.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{spec.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{spec.code}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openSpecModal(spec)} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteSpec(spec.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {subCategorySpecs.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-4">暂无规格</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">包装</h3>
                  <button
                    onClick={() => openPackagingModal()}
                    className="text-sm text-primary-600 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> 新建
                  </button>
                </div>
                <div className="space-y-2">
                  {subCategoryPackagings.map(pkg => (
                    <div key={pkg.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{pkg.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{pkg.code}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openPackagingModal(pkg)} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => deletePackaging(pkg.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {subCategoryPackagings.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-4">暂无包装</div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Package className="w-16 h-16 mb-4" />
            <p>选择左侧二级分类查看规格和包装</p>
          </div>
        )}
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingCategory ? '编辑' : '新建'}一级分类</h3>
              <button onClick={() => setShowCategoryModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">编码</label>
                <input
                  value={categoryForm.code}
                  onChange={e => setCategoryForm({ ...categoryForm, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">名称</label>
                <input
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={saveCategory} className="px-4 py-2 bg-primary-600 text-white rounded-lg">保存</button>
            </div>
          </div>
        </div>
      )}

      {showSubCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingSubCategory ? '编辑' : '新建'}二级分类</h3>
              <button onClick={() => setShowSubCategoryModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">编码</label>
                <input
                  value={subCategoryForm.code}
                  onChange={e => setSubCategoryForm({ ...subCategoryForm, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">名称</label>
                <input
                  value={subCategoryForm.name}
                  onChange={e => setSubCategoryForm({ ...subCategoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">一级分类</label>
                <select
                  value={subCategoryForm.categoryId}
                  onChange={e => setSubCategoryForm({ ...subCategoryForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">选择一级分类</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowSubCategoryModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={saveSubCategory} className="px-4 py-2 bg-primary-600 text-white rounded-lg">保存</button>
            </div>
          </div>
        </div>
      )}

      {showBrandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingBrand ? '编辑' : '新建'}品牌</h3>
              <button onClick={() => setShowBrandModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">编码</label>
                <input
                  value={brandForm.code}
                  onChange={e => setBrandForm({ ...brandForm, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">名称</label>
                <input
                  value={brandForm.name}
                  onChange={e => setBrandForm({ ...brandForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">二级分类</label>
                <select
                  value={brandForm.subCategoryId}
                  onChange={e => setBrandForm({ ...brandForm, subCategoryId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">选择二级分类</option>
                  {categories.flatMap(c => c.subCategories || []).map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBrandModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={saveBrand} className="px-4 py-2 bg-primary-600 text-white rounded-lg">保存</button>
            </div>
          </div>
        </div>
      )}

      {showSpecModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingSpec ? '编辑' : '新建'}规格</h3>
              <button onClick={() => setShowSpecModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">编码</label>
                <div className="flex items-center gap-1">
                  <input
                    value="SPEC_"
                    disabled
                    className="w-20 px-3 py-2 border rounded-lg bg-gray-100 text-gray-500"
                  />
                  <input
                    value={specForm.code.replace(/^SPEC_/, '')}
                    onChange={e => setSpecForm({ ...specForm, code: `SPEC_${e.target.value}` })}
                    className="flex-1 px-3 py-2 border rounded-lg"
                    placeholder="如: BAIJIU_500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">名称</label>
                <input
                  value={specForm.name}
                  onChange={e => setSpecForm({ ...specForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">排序</label>
                <input
                  type="number"
                  value={specForm.sortOrder}
                  onChange={e => setSpecForm({ ...specForm, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowSpecModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={saveSpec} className="px-4 py-2 bg-primary-600 text-white rounded-lg">保存</button>
            </div>
          </div>
        </div>
      )}

      {showPackagingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingPackaging ? '编辑' : '新建'}包装</h3>
              <button onClick={() => setShowPackagingModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">编码</label>
                <div className="flex items-center gap-1">
                  <input
                    value="PKG_"
                    disabled
                    className="w-20 px-3 py-2 border rounded-lg bg-gray-100 text-gray-500"
                  />
                  <input
                    value={packagingForm.code.replace(/^PKG_/, '')}
                    onChange={e => setPackagingForm({ ...packagingForm, code: `PKG_${e.target.value}` })}
                    className="flex-1 px-3 py-2 border rounded-lg"
                    placeholder="如: BAIJIU_BOTTLE"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">名称</label>
                <input
                  value={packagingForm.name}
                  onChange={e => setPackagingForm({ ...packagingForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">排序</label>
                <input
                  type="number"
                  value={packagingForm.sortOrder}
                  onChange={e => setPackagingForm({ ...packagingForm, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowPackagingModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={savePackaging} className="px-4 py-2 bg-primary-600 text-white rounded-lg">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
