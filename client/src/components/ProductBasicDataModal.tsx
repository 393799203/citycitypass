import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Package } from 'lucide-react';
import { productApi } from '../api';
import { toast } from 'react-toastify';

interface ProductBasicDataModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CategoryForm {
  code: string;
  name: string;
}

interface SubCategoryForm {
  code: string;
  name: string;
  categoryId: string;
}

interface BrandForm {
  code: string;
  name: string;
  subCategoryId: string;
}

interface SpecForm {
  code: string;
  name: string;
  sortOrder: number;
}

interface PackagingForm {
  code: string;
  name: string;
  sortOrder: number;
}

export default function ProductBasicDataModal({ open, onClose, onSuccess }: ProductBasicDataModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CategoryForm[]>([{ code: '', name: '' }]);
  const [subCategories, setSubCategories] = useState<SubCategoryForm[]>([{ code: '', name: '', categoryId: '' }]);
  const [brands, setBrands] = useState<BrandForm[]>([{ code: '', name: '', subCategoryId: '' }]);
  const [specs, setSpecs] = useState<SpecForm[]>([{ code: '', name: '', sortOrder: 0 }]);
  const [packagings, setPackagings] = useState<PackagingForm[]>([{ code: '', name: '', sortOrder: 0 }]);

  const [existingCategories, setExistingCategories] = useState<any[]>([]);
  const [existingSubCategories, setExistingSubCategories] = useState<any[]>([]);
  const [existingSpecs, setExistingSpecs] = useState<any[]>([]);
  const [existingPackagings, setExistingPackagings] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchExisting();
    }
  }, [open]);

  const fetchExisting = async () => {
    setLoading(true);
    try {
      const [catRes, subCatRes, specRes, pkgRes] = await Promise.all([
        productApi.getCategories(),
        productApi.getSubCategories(),
        productApi.getSpecs(),
        productApi.getPackagings(),
      ]);
      if (catRes.data.success) setExistingCategories(catRes.data.data);
      if (subCatRes.data.success) setExistingSubCategories(subCatRes.data.data);
      if (specRes.data.success) setExistingSpecs(specRes.data.data);
      if (pkgRes.data.success) setExistingPackagings(pkgRes.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => setCategories([...categories, { code: '', name: '' }]);
  const removeCategory = (idx: number) => setCategories(categories.filter((_, i) => i !== idx));

  const addSubCategory = () => setSubCategories([...subCategories, { code: '', name: '', categoryId: '' }]);
  const removeSubCategory = (idx: number) => setSubCategories(subCategories.filter((_, i) => i !== idx));

  const addBrand = () => setBrands([...brands, { code: '', name: '', subCategoryId: '' }]);
  const removeBrand = (idx: number) => setBrands(brands.filter((_, i) => i !== idx));

  const addSpec = () => setSpecs([...specs, { code: '', name: '', sortOrder: specs.length }]);
  const removeSpec = (idx: number) => setSpecs(specs.filter((_, i) => i !== idx));

  const addPackaging = () => setPackagings([...packagings, { code: '', name: '', sortOrder: packagings.length }]);
  const removePackaging = (idx: number) => setPackagings(packagings.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      const createdCategoryIds: Record<string, string> = {};
      const createdSubCategoryIds: Record<string, string> = {};

      for (const cat of categories) {
        if (cat.code && cat.name) {
          const res = await productApi.createCategory(cat);
          if (res.data.success) {
            createdCategoryIds[cat.code] = res.data.data.id;
          }
        }
      }

      for (const sc of subCategories) {
        if (sc.code && sc.name && sc.categoryId) {
          const res = await productApi.createSubCategory(sc);
          if (res.data.success) {
            createdSubCategoryIds[sc.code] = res.data.data.id;
          }
        }
      }

      for (const brand of brands) {
        if (brand.code && brand.name && brand.subCategoryId) {
          await productApi.createBrand(brand);
        }
      }

      for (const spec of specs) {
        if (spec.code && spec.name) {
          const res = await productApi.createSpec({ ...spec, sortOrder: spec.sortOrder || 0 });
          if (res.data.success) {
            const specId = res.data.data.id;
            for (const sc of subCategories) {
              if (sc.categoryId && createdSubCategoryIds[sc.code]) {
                await productApi.createSubCategorySpec({
                  subCategoryId: createdSubCategoryIds[sc.code],
                  specId: specId,
                });
              }
            }
          }
        }
      }

      for (const pkg of packagings) {
        if (pkg.code && pkg.name) {
          const res = await productApi.createPackaging({ ...pkg, sortOrder: pkg.sortOrder || 0 });
          if (res.data.success) {
            const packagingId = res.data.data.id;
            for (const sc of subCategories) {
              if (sc.categoryId && createdSubCategoryIds[sc.code]) {
                await productApi.createSubCategoryPackaging({
                  subCategoryId: createdSubCategoryIds[sc.code],
                  packagingId: packagingId,
                });
              }
            }
          }
        }
      }

      toast.success('基础数据创建成功');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('创建失败');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold">创建商品基础数据</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)] space-y-8">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">一级分类</h3>
                <button onClick={addCategory} className="text-sm text-primary-600 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> 添加
                </button>
              </div>
              <div className="space-y-2">
                {categories.map((cat, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      placeholder="编码"
                      value={cat.code}
                      onChange={e => {
                        const updated = [...categories];
                        updated[idx].code = e.target.value;
                        setCategories(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <input
                      placeholder="名称"
                      value={cat.name}
                      onChange={e => {
                        const updated = [...categories];
                        updated[idx].name = e.target.value;
                        setCategories(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    {categories.length > 1 && (
                      <button onClick={() => removeCategory(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">二级分类</h3>
                <button onClick={addSubCategory} className="text-sm text-primary-600 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> 添加
                </button>
              </div>
              <div className="space-y-2">
                {subCategories.map((sc, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      placeholder="编码"
                      value={sc.code}
                      onChange={e => {
                        const updated = [...subCategories];
                        updated[idx].code = e.target.value;
                        setSubCategories(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <input
                      placeholder="名称"
                      value={sc.name}
                      onChange={e => {
                        const updated = [...subCategories];
                        updated[idx].name = e.target.value;
                        setSubCategories(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <select
                      value={sc.categoryId}
                      onChange={e => {
                        const updated = [...subCategories];
                        updated[idx].categoryId = e.target.value;
                        setSubCategories(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    >
                      <option value="">选择一级分类</option>
                      {[...existingCategories, ...categories.filter(c => c.code && c.name && !existingCategories.find(ec => ec.code === c.code))].map(c => (
                        <option key={c.code} value={existingCategories.find(ec => ec.code === c.code)?.id || c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {subCategories.length > 1 && (
                      <button onClick={() => removeSubCategory(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">品牌</h3>
                <button onClick={addBrand} className="text-sm text-primary-600 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> 添加
                </button>
              </div>
              <div className="space-y-2">
                {brands.map((brand, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      placeholder="编码"
                      value={brand.code}
                      onChange={e => {
                        const updated = [...brands];
                        updated[idx].code = e.target.value;
                        setBrands(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <input
                      placeholder="名称"
                      value={brand.name}
                      onChange={e => {
                        const updated = [...brands];
                        updated[idx].name = e.target.value;
                        setBrands(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <select
                      value={brand.subCategoryId}
                      onChange={e => {
                        const updated = [...brands];
                        updated[idx].subCategoryId = e.target.value;
                        setBrands(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    >
                      <option value="">选择二级分类</option>
                      {[...existingSubCategories, ...subCategories.filter(sc => sc.code && sc.name && !existingSubCategories.find(esc => esc.code === sc.code))].map(sc => (
                        <option key={sc.code} value={existingSubCategories.find(esc => esc.code === sc.code)?.id || sc.code}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                    {brands.length > 1 && (
                      <button onClick={() => removeBrand(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">规格</h3>
                <button onClick={addSpec} className="text-sm text-primary-600 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> 添加
                </button>
              </div>
              <div className="space-y-2">
                {specs.map((spec, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      placeholder="编码"
                      value={spec.code}
                      onChange={e => {
                        const updated = [...specs];
                        updated[idx].code = e.target.value;
                        setSpecs(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <input
                      placeholder="名称（如：500ml）"
                      value={spec.name}
                      onChange={e => {
                        const updated = [...specs];
                        updated[idx].name = e.target.value;
                        setSpecs(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="排序"
                      value={spec.sortOrder}
                      onChange={e => {
                        const updated = [...specs];
                        updated[idx].sortOrder = parseInt(e.target.value) || 0;
                        setSpecs(updated);
                      }}
                      className="w-24 px-3 py-2 border rounded-lg"
                    />
                    {specs.length > 1 && (
                      <button onClick={() => removeSpec(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">包装</h3>
                <button onClick={addPackaging} className="text-sm text-primary-600 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> 添加
                </button>
              </div>
              <div className="space-y-2">
                {packagings.map((pkg, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      placeholder="编码"
                      value={pkg.code}
                      onChange={e => {
                        const updated = [...packagings];
                        updated[idx].code = e.target.value;
                        setPackagings(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <input
                      placeholder="名称（如：瓶、箱）"
                      value={pkg.name}
                      onChange={e => {
                        const updated = [...packagings];
                        updated[idx].name = e.target.value;
                        setPackagings(updated);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="排序"
                      value={pkg.sortOrder}
                      onChange={e => {
                        const updated = [...packagings];
                        updated[idx].sortOrder = parseInt(e.target.value) || 0;
                        setPackagings(updated);
                      }}
                      className="w-24 px-3 py-2 border rounded-lg"
                    />
                    {packagings.length > 1 && (
                      <button onClick={() => removePackaging(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
