import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { stockApi } from '../../api';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { TraceData, BatchInfo } from '../../types/batchTrace';
import BatchList from './BatchList';
import BatchFlowChart from './BatchFlowChart';
import BatchRecordCards from './BatchRecordCards';

export default function BatchTracePage() {
  const { t } = useTranslation();
  const { batchNo } = useParams<{ batchNo: string }>();
  const navigate = useNavigate();
  const [inputBatchNo, setInputBatchNo] = useState('');
  const [batchList, setBatchList] = useState<BatchInfo[]>([]);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 筛选状态
  const [filters, setFilters] = useState({
    batchNo: '',
    supplier: '',
    product: '',
    type: '',
  });
  
  // 筛选展开状态
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // 供应商和商品列表
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  
  // 从批次列表中提取供应商和商品列表
  useEffect(() => {
    if (batchList.length > 0) {
      // 提取供应商列表
      const supplierSet = new Set<string>();
      // 提取商品列表
      const productMap = new Map<string, Set<string>>(); // 按类型分组商品
      
      batchList.forEach(batch => {
        if (batch.supplierName) {
          supplierSet.add(batch.supplierName);
        }
        const productName = batch.productName || batch.sku?.product?.name || '';
        if (productName) {
          if (!productMap.has(batch.type)) {
            productMap.set(batch.type, new Set<string>());
          }
          productMap.get(batch.type)?.add(productName);
        }
      });
      
      setSuppliers(Array.from(supplierSet).sort());
      
      // 生成所有商品列表（用于默认显示）
      const allProducts = new Set<string>();
      productMap.forEach((products) => {
        products.forEach(product => allProducts.add(product));
      });
      setProducts(Array.from(allProducts).sort());
    }
  }, [batchList]);
  
  // 根据选择的类型过滤商品列表
  const filteredProducts = filters.type 
    ? batchList
        .filter(batch => batch.type === filters.type)
        .map(batch => batch.productName || batch.sku?.product?.name || '')
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index) // 去重
        .sort()
    : products;

  useEffect(() => {
    loadBatchList();
    if (batchNo) {
      loadTraceData(batchNo);
    }
  }, [batchNo]);

  const loadBatchList = async () => {
    setLoading(true);
    setBatchList([]);
    try {
      const res = await stockApi.batchList();
      if (res.data.success) {
        setBatchList(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load batch list', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTraceData = async (batch: string) => {
    if (!batch.trim()) {
      toast.error(t('batchTrace.searchPlaceholder'));
      return;
    }
    setLoading(true);
    try {
      const res = await stockApi.batchTrace(batch);
      if (res.data.success) {
        setTraceData(res.data.data);
      } else {
        toast.error(res.data.message || t('batchTrace.noData'));
        setTraceData(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('batchTrace.noData'));
      setTraceData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (inputBatchNo.trim()) {
      navigate(`/batch-trace/${inputBatchNo.trim()}`);
    }
  };

  // 筛选逻辑
  const filteredBatchList = batchList.filter(batch => {
    // 批次号筛选
    if (filters.batchNo && !batch.batchNo.toLowerCase().includes(filters.batchNo.toLowerCase())) {
      return false;
    }
    // 供应商筛选
    if (filters.supplier && !batch.supplierName?.toLowerCase().includes(filters.supplier.toLowerCase())) {
      return false;
    }
    // 商品筛选
    if (filters.product) {
      const productName = batch.productName || batch.sku?.product?.name || '';
      if (!productName.toLowerCase().includes(filters.product.toLowerCase())) {
        return false;
      }
    }
    // 类型筛选
    if (filters.type && batch.type !== filters.type) {
      return false;
    }
    return true;
  });

  if (!batchNo) {
    return (
      <div className="p-2 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{t('batchTrace.batchList')}</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">
              {t('batchTrace.totalBatches', { count: filteredBatchList.length })}
            </div>
            <button
              onClick={() => loadBatchList()}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isFilterExpanded && (
          <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[150px]">
                <input
                  type="text"
                  value={filters.batchNo}
                  onChange={(e) => setFilters({ ...filters, batchNo: e.target.value })}
                  placeholder={t('batchTrace.batchNo')}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <select
                  value={filters.supplier}
                  onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">{t('batchTrace.allSuppliers')}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier} value={supplier}>
                      {supplier}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value, product: '' })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">{t('batchTrace.allTypes')}</option>
                  <option value="PRODUCT">{t('batchTrace.product')}</option>
                  <option value="BUNDLE">{t('batchTrace.bundle')}</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <select
                  value={filters.product}
                  onChange={(e) => setFilters({ ...filters, product: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">{t('batchTrace.allProducts')}</option>
                  {filteredProducts.map((product) => (
                    <option key={product} value={product}>
                      {product}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => setFilters({ batchNo: '', supplier: '', product: '', type: '' })}
                  className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('common.reset')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        <BatchList batchList={filteredBatchList} loading={loading} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="mt-2 text-gray-600">{t('batchTrace.loading')}</p>
        </div>
      </div>
    );
  }

  if (!traceData) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto mt-20">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-red-600 mb-4">{t('batchTrace.notFound')}</p>
            <button
              onClick={() => navigate('/batch-trace')}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              {t('batchTrace.backToSearch')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allStockIns = traceData.stockIns || [];
  const totalInbound = allStockIns.reduce((sum: number, s: any) => sum + s.quantity, 0);
  const totalInWarehouse = (traceData.locations || []).reduce((sum: number, l: any) => sum + (l.totalQuantity || l.quantity || 0), 0);
  const totalSold = (traceData.stockOuts || []).reduce((sum: number, o: any) => sum + o.quantity, 0);
  const totalReturned = (traceData.returns || []).reduce((sum: number, r: any) => sum + r.quantity, 0);

  return (
    <div className="p-2 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('batchTrace.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('batchTrace.batchNo')}: <span className="font-mono text-blue-600">{batchNo}</span></p>
        </div>
        <button
          onClick={() => loadTraceData(batchNo)}
          className="p-2 hover:bg-gray-100 rounded-lg ml-auto"
          title={t('common.refresh')}
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <BatchFlowChart 
        traceData={traceData} 
        batchNo={batchNo} 
        totalInbound={totalInbound} 
        totalInWarehouse={totalInWarehouse} 
        totalSold={totalSold} 
        totalReturned={totalReturned} 
      />

      <BatchRecordCards traceData={traceData} />
    </div>
  );
}
