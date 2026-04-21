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
  specs?: Spec[];
  packagings?: Packaging[];
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
}

interface Packaging {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

export default function ProductBasicDataPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

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

  const [subCategorySpecs, setSubCategorySpecs] = useState<Spec[]>([]);
  const [subCategoryPackagings, setSubCategoryPackagings] = useState<Packaging[]>([]);
  const confirm = useConfirm();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSubCategory) {
      fetchSubCategoryDetails(selectedSubCategory);
    }
  }, [selectedSubCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, specRes, pkgRes] = await Promise.all([
        productApi.getCategories(),
        productApi.getSpecs(),
        productApi.getPackagings(),
      ]);
      if (catRes.data.success) {
        const catsWithSub = await Promise.all(
          catRes.data.data.map(async (cat: any) => {
            const subCatRes = await productApi.getSubCategories();
            if (subCatRes.data.success) {
              const subCategories = subCatRes.data.data.filter((sc: any) => sc.categoryId === cat.id);
              const subCatsWithBrands = await Promise.all(
                subCategories.map(async (sc: any) => {
                  const brandRes = await productApi.getBrands({ subCategoryId: sc.id });
                  return {
                    ...sc,
                    brands: brandRes.data.success ? brandRes.data.data : [],
                  };
                })
              );
              return { ...cat, subCategories: subCatsWithBrands };
            }
            return cat;
          })
        );
        setCategories(catsWithSub);
      }
      if (specRes.data.success) setSpecs(specRes.data.data);
      if (pkgRes.data.success) setPackagings(pkgRes.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategoryDetails = async (subCategoryId: string) => {
    try {
      const res = await productApi.getSubCategoryOptions(subCategoryId);
      if (res.data.success) {
        setSubCategorySpecs(res.data.data.specs || []);
        setSubCategoryPackagings(res.data.data.packagings || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleCategory = (id: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedCategories(newSet);
  };

  const toggleSubCategory = (id: string) => {
    const newSet = new Set(expandedSubCategories);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSubCategories(newSet);
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
      setSpecForm({ code: '', name: '', sortOrder: specs.length });
    }
    setShowSpecModal(true);
  };

  const openPackagingModal = (pkg?: Packaging) => {
    if (pkg) {
      setEditingPackaging(pkg);
      setPackagingForm({ code: pkg.code, name: pkg.name, sortOrder: pkg.sortOrder });
    } else {
      setEditingPackaging(null);
      setPackagingForm({ code: '', name: '', sortOrder: packagings.length });
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
      fetchData();
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
      fetchData();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const saveSpec = async () => {
    try {
      if (editingSpec) {
        await productApi.updateSpec(editingSpec.id, specForm);
        toast.success('更新成功');
      } else {
        await productApi.createSpec(specForm);
        toast.success('创建成功');
      }
      setShowSpecModal(false);
      fetchData();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const savePackaging = async () => {
    try {
      if (editingPackaging) {
        await productApi.updatePackaging(editingPackaging.id, packagingForm);
        toast.success('更新成功');
      } else {
        await productApi.createPackaging(packagingForm);
        toast.success('创建成功');
      }
      setShowPackagingModal(false);
      fetchData();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('确定删除？')) return;
    try {
      await productApi.deleteCategory(id);
      toast.success('删除成功');
      fetchData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const deleteSubCategory = async (id: string) => {
    if (!confirm('确定删除？')) return;
    try {
      await productApi.deleteSubCategory(id);
      toast.success('删除成功');
      fetchData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm('确定删除？')) return;
    try {
      await productApi.deleteBrand(id);
      toast.success('删除成功');
      fetchData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const linkSpecToSubCategory = async (specId: string) => {
    if (!selectedSubCategory) return;
    try {
      await productApi.createSubCategorySpec({ subCategoryId: selectedSubCategory, specId });
      toast.success('关联成功');
      fetchSubCategoryDetails(selectedSubCategory);
    } catch (error) {
      toast.error('关联失败');
    }
  };

  const linkPackagingToSubCategory = async (packagingId: string) => {
    if (!selectedSubCategory) return;
    try {
      await productApi.createSubCategoryPackaging({ subCategoryId: selectedSubCategory, packagingId });
      toast.success('关联成功');
      fetchSubCategoryDetails(selectedSubCategory);
    } catch (error) {
      toast.error('关联失败');
    }
  };

  const unlinkSpec = async (specId: string) => {
    if (!selectedSubCategory) return;
    const confirmed = await confirm({
      title: '删除规格',
      message: '确定要删除该规格吗？这将同时取消其与当前二级分类的关联。',
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await productApi.deleteSubCategorySpec(selectedSubCategory, specId);
      await productApi.deleteSpec(specId);
      toast.success('删除成功');
      fetchSubCategoryDetails(selectedSubCategory);
      fetchData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const unlinkPackaging = async (packagingId: string) => {
    if (!selectedSubCategory) return;
    const confirmed = await confirm({
      title: '删除包装',
      message: '确定要删除该包装吗？这将同时取消其与当前二级分类的关联。',
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await productApi.deleteSubCategoryPackaging(selectedSubCategory, packagingId);
      await productApi.deletePackaging(packagingId);
      toast.success('删除成功');
      fetchSubCategoryDetails(selectedSubCategory);
      fetchData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const availableSpecsToLink = specs.filter(s => !subCategorySpecs.find(ss => ss.id === s.id));
  const availablePackagingsToLink = packagings.filter(p => !subCategoryPackagings.find(pp => pp.id === p.id));

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
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 group"
                style={{ paddingLeft: '8px' }}
              >
                <button onClick={() => toggleCategory(cat.id)} className="p-0.5">
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
                  <button onClick={() => openSubCategoryModal(undefined, cat.id)} className="p-1 text-primary-600 hover:bg-primary-50 rounded">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => openCategoryModal(cat)} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {expandedCategories.has(cat.id) && (
                <div className="ml-6 space-y-1">
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
                        }}
                      >
                        <button onClick={(e) => { e.stopPropagation(); toggleSubCategory(sc.id); }} className="p-0.5">
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
                        <div className="ml-6 space-y-1">
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
                    <Plus className="w-4 h-4" /> 新建规格
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
                        <button onClick={() => unlinkSpec(spec.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {subCategorySpecs.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-4">暂无关联规格</div>
                  )}
                </div>
                {availableSpecsToLink.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">添加关联</p>
                    <div className="flex flex-wrap gap-1">
                      {availableSpecsToLink.map(spec => (
                        <button
                          key={spec.id}
                          onClick={() => linkSpecToSubCategory(spec.id)}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          {spec.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">包装</h3>
                  <button
                    onClick={() => openPackagingModal()}
                    className="text-sm text-primary-600 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> 新建包装
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
                        <button onClick={() => unlinkPackaging(pkg.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {subCategoryPackagings.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-4">暂无关联包装</div>
                  )}
                </div>
                {availablePackagingsToLink.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">添加关联</p>
                    <div className="flex flex-wrap gap-1">
                      {availablePackagingsToLink.map(pkg => (
                        <button
                          key={pkg.id}
                          onClick={() => linkPackagingToSubCategory(pkg.id)}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          {pkg.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                  placeholder="如: BAIJIU"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">名称</label>
                <input
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如: 白酒"
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
                  placeholder="如: BAIJIU_500ML"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">名称</label>
                <input
                  value={subCategoryForm.name}
                  onChange={e => setSubCategoryForm({ ...subCategoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如: 500ml装白酒"
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
                  placeholder="如: MOUTAI"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">名称</label>
                <input
                  value={brandForm.name}
                  onChange={e => setBrandForm({ ...brandForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如: 茅台"
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
                  {categories.flatMap(c => (c.subCategories || []).map(sc => ({ ...sc, categoryName: c.name }))).map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.categoryName} / {sc.name}</option>
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
                <input
                  value={specForm.code}
                  onChange={e => setSpecForm({ ...specForm, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如: SPEC_500ML"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">名称</label>
                <input
                  value={specForm.name}
                  onChange={e => setSpecForm({ ...specForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如: 500ml"
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
                <input
                  value={packagingForm.code}
                  onChange={e => setPackagingForm({ ...packagingForm, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如: PKG_BOTTLE"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">名称</label>
                <input
                  value={packagingForm.name}
                  onChange={e => setPackagingForm({ ...packagingForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="如: 瓶"
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
