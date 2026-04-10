import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Image as ImageIcon, Bot, Sparkles, Check, FileText, ShoppingCart, Package, ClipboardList, AlertCircle, Minus, GripVertical, Square, Trash2 } from 'lucide-react';
import ImageUploader from './ImageUploader';
import MessageFlow from './MessageFlow';
import { aiApi } from '../api/ai';
import { orderApi, purchaseOrderApi, productApi, bundleApi, ownerApi, inboundApi, warehouseApi, supplierApi, supplierProductApi } from '../api';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  imageUrl?: string;
  structuredData?: AIStructuredData | null;
  error?: AIErrorInfo;
}

interface AIErrorInfo {
  code: number;
  message: string;
  provider?: string;
  raw?: string;
}

interface AIStructuredData {
  intent: string;
  type: string;
  data: any;
}

interface AIAssistantProps {
  onDocumentCreate?: (document: any) => void;
  onUnload?: () => void;
}

export default function AIAssistant({ onDocumentCreate, onUnload }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });

  const initialMessages: Message[] = [
    {
      id: '1',
      content: '您好！我是AI业务助手，可以帮您处理多种业务操作：\n\n📋 创建订单 - "帮张三订购100箱茅台500ml，发往北京..."\n🛒 采购订单 - "向供应商A采购100瓶茅台"\n📦 入库操作 - "将100瓶茅台入库到北京仓库"\n🚚 调度配送 - "调度车辆配送订单12345"\n\n直接说出您的需求，我会帮您生成单据确认！',
      type: 'system',
      timestamp: new Date()
    }
  ];

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('ai-chat-messages');
      if (saved && saved !== '[]') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
            structuredData: m.structuredData || null
          }));
        }
      }
    } catch (e) {
      console.error('[AI] Init load error:', e);
    }
    return initialMessages;
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showConfirmCard, setShowConfirmCard] = useState(false);
  const [confirmData, setConfirmData] = useState<AIStructuredData | null>(null);
  const [searchMode, setSearchMode] = useState<'keyword' | 'vector' | 'hybrid'>('hybrid');
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isOpen, showConfirmCard]);

  useEffect(() => {
    if (isOpen) {
      setWindowPosition({
        x: Math.max(0, window.innerWidth - 400),
        y: Math.max(0, window.innerHeight - 650)
      });
    }
  }, [isOpen]);

  useEffect(() => {
    (window as any).openAIPanel = (data: AIStructuredData) => {
      setConfirmData(data);
      setShowConfirmCard(true);
      if (!isOpen) setIsOpen(true);
    };
    return () => {
      delete (window as any).openAIPanel;
    };
  }, [isOpen]);

  useEffect(() => {
    if (messages.length > 0) {
      const trimmed = messages.slice(-100);
      localStorage.setItem('ai-chat-messages', JSON.stringify(trimmed));
    } else {
      localStorage.removeItem('ai-chat-messages');
    }
  }, [messages]);

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem('ai-chat-messages');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: windowPosition.x,
      startPosY: windowPosition.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setWindowPosition({
      x: dragRef.current.startPosX + dx,
      y: dragRef.current.startPosY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const parseAIResponse = (content: string): AIStructuredData | null => {
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();

      let parsed = JSON.parse(jsonStr);
      if (parsed.intent) {
        return {
          intent: parsed.intent,
          type: parsed.type || '',
          data: parsed.data || {}
        } as AIStructuredData;
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }
    return null;
  };

  // 查找仓库ID
  const findWarehouseId = async (warehouseNameOrId: string) => {
    try {
      const warehouseRes = await warehouseApi.list({});
      const warehouses = warehouseRes.data.data || [];
      
      // 尝试匹配仓库（带空格处理）
      const trimmedInput = warehouseNameOrId.trim();
      const warehouse = warehouses.find((w: any) => 
        w.name.trim() === trimmedInput || w.id === trimmedInput
      );
      
      if (warehouse) {
        return warehouse.id;
      } else if (warehouses.length > 0) {
        // 如果没有找到，使用第一个仓库
        return warehouses[0].id;
      }
    } catch (error) {
      console.error('Failed to get warehouse list:', error);
    }
    return warehouseNameOrId;
  };

  // 查找所有者ID
  const findOwnerId = async (ownerNameOrId: string) => {
    try {
      const ownerRes = await ownerApi.list({});
      const owners = ownerRes.data.data || [];
      const owner = owners.find((o: any) => o.name === ownerNameOrId) || owners[0];
      return owner?.id || ownerNameOrId;
    } catch (error) {
      console.error('Failed to get owner list:', error);
      return ownerNameOrId;
    }
  };

  // 查找供应商ID
  const findSupplierId = async (supplierNameOrId: string) => {
    try {
      const supplierRes = await supplierApi.list({});
      const suppliers = supplierRes.data.data || [];
      const trimmedInput = supplierNameOrId.trim();
      const supplier = suppliers.find((s: any) => 
        s.name.trim() === trimmedInput || s.id === trimmedInput
      );
      if (supplier) {
        return supplier.id;
      } else if (suppliers.length > 0) {
        return suppliers[0].id;
      }
    } catch (error) {
      console.error('Failed to get supplier list:', error);
    }
    return supplierNameOrId;
  };

  // 匹配SKU
  const matchSku = (sku: any, item: any) => {
    const aiPackaging = item.packaging?.toLowerCase() || '';
    const aiSpec = item.spec?.toLowerCase() || '';
    const skuPackaging = sku.packaging?.toLowerCase() || '';
    const skuSpec = sku.spec?.toLowerCase() || '';

    console.log('[matchSku] AI input:', { aiPackaging, aiSpec }, 'SKU:', { skuPackaging, skuSpec, skuId: sku.id });

    if (aiPackaging && aiSpec) {
      const match = (skuPackaging.includes(aiPackaging) || aiPackaging.includes(skuPackaging)) &&
             (skuSpec.includes(aiSpec) || aiSpec.includes(skuSpec));
      console.log('[matchSku] Match with both:', match);
      return match;
    }
    if (aiPackaging) {
      const match = skuPackaging.includes(aiPackaging) || aiPackaging.includes(skuPackaging);
      console.log('[matchSku] Match with packaging only:', match);
      return match;
    }
    if (aiSpec) {
      const match = skuSpec.includes(aiSpec) || aiSpec.includes(skuSpec);
      console.log('[matchSku] Match with spec only:', match);
      return match;
    }
    console.log('[matchSku] No match');
    return false;
  };

  // 查找商品SKU或套装
  const findProductOrBundle = async (productName: string, item?: any, ownerId?: string, supplierId?: string) => {
    try {
      // 尝试查找SKU
      const productRes = await productApi.list({ 
        name: productName,
        ...(ownerId && { ownerId })
      });
      const products = productRes.data.data || [];

      for (const product of products) {
        if (!product.skus || product.skus.length === 0) continue;

        // 尝试匹配SKU
        let sku = product.skus.find((s: any) => matchSku(s, item));
        if (sku) {
          let price = sku.price || 0;
          // 尝试查找供应商对应的SKU价格
          if (supplierId) {
            try {
              const supplierProductRes = await supplierProductApi.list({ 
                supplierId,
                skuId: sku.id
              });
              const supplierProducts = supplierProductRes.data.data || [];
              if (supplierProducts.length > 0) {
                price = supplierProducts[0].price || price;
              }
            } catch (error) {
              console.error('Failed to get supplier product price:', error);
            }
          }
          return { skuId: sku.id, bundleId: null, price };
        }
      }

      // 尝试查找套装
      const bundleRes = await bundleApi.list({ name: productName });
      const bundles = bundleRes.data.data || [];
      if (bundles.length > 0) {
        const bundle = bundles[0];
        return { skuId: null, bundleId: bundle.id, price: bundle.price || 0 };
      }
    } catch (error) {
      console.error('Failed to search products/bundles:', error);
    }

    return { skuId: null, bundleId: null, price: 0 };
  };

  // 补全订单商品信息
  const completeOrderItems = async (items: any[], ownerId?: string) => {
    console.log('[completeOrderItems] Input items:', JSON.stringify(items, null, 2));
    return await Promise.all(
      items.map(async (item: any) => {
        console.log('[completeOrderItems] Processing item:', item);
        const { skuId, bundleId, price } = await findProductOrBundle(item.productName, item, ownerId);
        console.log('[completeOrderItems] Found skuId:', skuId, 'bundleId:', bundleId);
        return {
          skuId,
          bundleId,
          price: item.price || price || 0,
          quantity: item.quantity || 1
        };
      })
    );
  };

  // 补全入库商品信息
  const completeInboundItems = async (items: any[]) => {
    return await Promise.all(
      items.map(async (item: any) => {
        let skuId = item.skuId || null;
        let bundleId = item.bundleId || null;

        if (!skuId && !bundleId) {
          const { skuId: foundSkuId, bundleId: foundBundleId } = await findProductOrBundle(item.productName, item);
          skuId = foundSkuId;
          bundleId = foundBundleId;
        }

        return {
          type: item.type || (bundleId ? 'BUNDLE' : 'PRODUCT'),
          skuId,
          bundleId,
          supplierMaterialId: item.supplierMaterialId || null,
          quantity: item.quantity || 1,
          locationId: item.locationId || null,
          skuBatchId: item.skuBatchId || null,
          bundleBatchId: item.bundleBatchId || null,
        };
      })
    );
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let ragResponse;
      switch (searchMode) {
        case 'vector':
          ragResponse = await aiApi.queryDocumentsVector(input);
          break;
        case 'hybrid':
          ragResponse = await aiApi.queryDocumentsHybrid(input);
          break;
        case 'keyword':
        default:
          ragResponse = await aiApi.queryDocuments(input);
          break;
      }

      let context: string[] = [];
      if (ragResponse.success && ragResponse.data && ragResponse.data.length > 0) {
        context = ragResponse.data.map((doc: any) => doc.content);
        console.log(`[AI] ${searchMode} search results:`, ragResponse.data.map((doc: any) => ({ id: doc.id, score: doc.score, content: doc.content.substring(0, 50) })));
      }

      const chatResponse = await aiApi.chat([{ role: 'user', content: input }], context, true);

      if (chatResponse.success && chatResponse.data?.content) {
        const content = chatResponse.data.content;
        const structuredData = parseAIResponse(content);

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: content,
          type: 'ai',
          timestamp: new Date(),
          structuredData: structuredData
        };
        setMessages(prev => [...prev, aiMessage]);

        if (structuredData && ['create_order', 'create_purchase_order', 'create_inbound'].includes(structuredData.intent)) {
          setConfirmData(structuredData);
          setShowConfirmCard(true);
        }
      } else if (chatResponse.error) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: '',
          type: 'ai',
          timestamp: new Date(),
          error: chatResponse.error
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: '抱歉，暂时无法处理您的请求，请稍后再试。',
          type: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error: any) {
      console.error('AI response error:', error);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '',
        type: 'ai',
        timestamp: new Date(),
        error: {
          code: error?.response?.status || 500,
          message: error?.message || '网络错误'
        }
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmData) return;

    try {
      let result: any;

      if (confirmData.intent === 'create_order') {
        const ownerId = confirmData.data.ownerId || 'default-owner-id';
        const finalOwnerId = await findOwnerId(ownerId);

        const skuItems = await completeOrderItems(confirmData.data.items || [], finalOwnerId);
        const orderData = {
          ownerId: finalOwnerId,
          receiver: confirmData.data.receiver,
          phone: confirmData.data.phone,
          province: confirmData.data.province,
          city: confirmData.data.city,
          address: confirmData.data.address,
          items: skuItems.map((sku: any, idx: number) => ({
            skuId: sku.skuId,
            bundleId: sku.bundleId,
            productName: confirmData.data.items[idx].productName,
            spec: confirmData.data.items[idx].spec || '标准',
            packaging: confirmData.data.items[idx].packaging || '散装',
            quantity: Number(sku.quantity) || 1,
          })),
        };

        const response = await orderApi.create(orderData);
        result = response.data;
      } else if (confirmData.intent === 'create_purchase_order') {
        // 查找供应商ID
        const supplierId = await findSupplierId(confirmData.data.supplierId || 'default-supplier-id');

        // 查找仓库ID
        let warehouseId = confirmData.data.warehouseId || undefined;
        if (warehouseId) {
          warehouseId = await findWarehouseId(warehouseId);
        }

        // 补全商品信息
        const itemsWithDetails = await Promise.all(
          confirmData.data.items?.map(async (item: any) => {
            let skuId = item.skuId || null;
            let bundleId = item.bundleId || null;
            let price = item.price || 0;

            if (!skuId && !bundleId) {
              const { skuId: foundSkuId, bundleId: foundBundleId, price: foundPrice } = await findProductOrBundle(item.productName, item, undefined, supplierId);
              skuId = foundSkuId;
              bundleId = foundBundleId;
              price = foundPrice;
            } else if (skuId) {
              // 尝试查找供应商对应的SKU价格
              try {
                const supplierProductRes = await supplierProductApi.list({ 
                  supplierId,
                  skuId
                });
                const supplierProducts = supplierProductRes.data.data || [];
                if (supplierProducts.length > 0) {
                  price = supplierProducts[0].price || price;
                }
              } catch (error) {
                console.error('Failed to get supplier product price:', error);
              }
            }

            return {
              itemType: item.itemType || (bundleId ? 'BUNDLE' : 'PRODUCT'),
              skuId,
              bundleId,
              supplierMaterialId: item.supplierMaterialId || undefined,
              quantity: item.quantity || 1,
              price,
              productionDate: item.productionDate || undefined,
              expireDate: item.expireDate || undefined,
            };
          }) || []
        );

        const purchaseData = {
          supplierId,
          warehouseId,
          orderDate: confirmData.data.orderDate || new Date().toISOString(),
          expectedDate: confirmData.data.expectedDate || undefined,
          remark: confirmData.data.remark || '',
          items: itemsWithDetails,
        };

        console.log('[AI] Creating purchase order with data:', purchaseData);
        const response = await purchaseOrderApi.create(purchaseData);
        result = response.data;
      } else if (confirmData.intent === 'create_inbound') {
        // 查找仓库ID
        const warehouseId = await findWarehouseId(confirmData.data.warehouseId);

        // 补全商品信息
        const itemsWithDetails = await completeInboundItems(confirmData.data.items || []);

        const inboundData = {
          warehouseId,
          source: confirmData.data.source || 'PURCHASE',
          remark: confirmData.data.remark || '',
          purchaseOrderId: confirmData.data.purchaseOrderId || null,
          returnOrderId: confirmData.data.returnOrderId || null,
          items: itemsWithDetails,
        };

        console.log('[AI] Creating inbound order with data:', inboundData);
        const response = await inboundApi.create(inboundData);
        result = response.data;
      }

      const successMessage: Message = {
        id: Date.now().toString(),
        content: result?.success !== false ? '✅ 单据已创建成功！' : `❌ 创建失败：${result?.message || '未知错误'}`,
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
    } catch (error: any) {
      let errorMsg = '请重试';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `❌ 创建失败：${errorMsg}`,
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setShowConfirmCard(false);
    setConfirmData(null);
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'create_order': return <ShoppingCart className="w-5 h-5" />;
      case 'create_purchase_order': return <ClipboardList className="w-5 h-5" />;
      case 'create_inbound': return <Package className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getIntentTitle = (intent: string) => {
    switch (intent) {
      case 'create_order': return '创建销售订单';
      case 'create_purchase_order': return '创建采购订单';
      case 'create_inbound': return '创建入库单';
      case 'query': return '查询请求';
      default: return 'AI 回复';
    }
  };

  const ConfirmCard = () => {
    if (!confirmData) return null;

    const { intent, type, data } = confirmData;

    return (
      <div className="border border-purple-200 rounded-lg bg-purple-50 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 text-purple-700">
          {getIntentIcon(intent)}
          <span className="font-semibold">{getIntentTitle(intent)}</span>
        </div>

        <div className="space-y-2 text-sm">
          {intent === 'create_order' && (
            <>
              <div className="flex gap-2"><span className="text-gray-500">客户：</span><span>{data.customerName || data.receiver || '-'}</span></div>
              {data.phone && <div className="flex gap-2"><span className="text-gray-500">电话：</span><span>{data.phone}</span></div>}
              <div className="flex gap-2"><span className="text-gray-500">配送地址：</span><span>{[data.province, data.city, data.address].filter(Boolean).join('') || '-'}</span></div>
              <div className="mt-2">
                <span className="text-gray-500">商品明细：</span>
                <ul className="mt-1 space-y-1">
                  {data.items?.map((item: any, idx: number) => (
                    <li key={idx} className="bg-white px-2 py-1 rounded">
                      {item.productName} - {item.spec} × {item.quantity} {item.unit || '件'}
                      {item.packaging && <span className="text-gray-400 ml-1">({item.packaging})</span>}
                    </li>
                  )) || <li className="text-gray-400">暂无商品信息</li>}
                </ul>
              </div>
              {data.remark && <div className="flex gap-2 mt-2"><span className="text-gray-500">备注：</span><span>{data.remark}</span></div>}
            </>
          )}

          {intent === 'create_purchase_order' && (
            <>
              <div className="flex gap-2"><span className="text-gray-500">供应商：</span><span>{data.supplierName || data.supplierId || '-'}</span></div>
              {data.warehouseId && <div className="flex gap-2"><span className="text-gray-500">仓库：</span><span>{data.warehouseId}</span></div>}
              {data.orderDate && <div className="flex gap-2"><span className="text-gray-500">订单日期：</span><span>{data.orderDate}</span></div>}
              {data.expectedDate && <div className="flex gap-2"><span className="text-gray-500">预计到货日期：</span><span>{data.expectedDate}</span></div>}
              {data.remark && <div className="flex gap-2"><span className="text-gray-500">备注：</span><span>{data.remark}</span></div>}
              <div className="mt-2">
                <span className="text-gray-500">采购商品：</span>
                <ul className="mt-1 space-y-1">
                  {data.items?.map((item: any, idx: number) => (
                    <li key={idx} className="bg-white px-2 py-1 rounded">
                      {item.productName} - {item.spec || ''} × {item.quantity} @ ¥{item.price || '-'}
                      {item.packaging && <span className="text-gray-400 ml-1">({item.packaging})</span>}
                      {item.productionDate && <span className="text-gray-400 ml-2">生产日期: {item.productionDate}</span>}
                      {item.expireDate && <span className="text-gray-400 ml-2">过期日期: {item.expireDate}</span>}
                    </li>
                  )) || <li className="text-gray-400">暂无商品信息</li>}
                </ul>
              </div>
            </>
          )}

          {intent === 'create_inbound' && (
            <>
              <div className="flex gap-2"><span className="text-gray-500">仓库：</span><span>{data.warehouseName || data.warehouseId || '-'}</span></div>
              <div className="mt-2">
                <span className="text-gray-500">入库商品：</span>
                <ul className="mt-1 space-y-1">
                  {data.items?.map((item: any, idx: number) => (
                    <li key={idx} className="bg-white px-2 py-1 rounded">
                      {item.productName} - {item.spec || ''} × {item.quantity}
                      {item.batchNo && <span className="text-gray-400 ml-2">批次: {item.batchNo}</span>}
                    </li>
                  )) || <li className="text-gray-400">暂无商品信息</li>}
                </ul>
              </div>
            </>
          )}

          {intent === 'query' && (
            <>
              <div className="flex gap-2"><span className="text-gray-500">查询类型：</span><span>{data.type || data.data?.type || '信息查询'}</span></div>
              {data.query && <div className="flex gap-2"><span className="text-gray-500">查询内容：</span><span>{data.query}</span></div>}
              
              {/* 处理产品规格查询 */}
              {(data.data?.productName || data.productName) && (
                <div className="mt-2">
                  <span className="text-gray-500">产品信息：</span>
                  <div className="mt-1 bg-white px-2 py-1 rounded">
                    {data.data?.productName && <div className="flex gap-2"><span className="font-medium">产品名称：</span><span>{data.data.productName}</span></div>}
                    {data.productName && <div className="flex gap-2"><span className="font-medium">产品名称：</span><span>{data.productName}</span></div>}
                    {data.data?.spec && <div className="flex gap-2"><span className="font-medium">规格：</span><span>{data.data.spec}</span></div>}
                    {data.spec && <div className="flex gap-2"><span className="font-medium">规格：</span><span>{data.spec}</span></div>}
                    {data.data?.packaging && <div className="flex gap-2"><span className="font-medium">包装：</span><span>{data.data.packaging}</span></div>}
                    {data.packaging && <div className="flex gap-2"><span className="font-medium">包装：</span><span>{data.packaging}</span></div>}
                  </div>
                </div>
              )}
              
              {/* 处理查询结果列表 */}
              {(data.results && data.results.length > 0) && (
                <div className="mt-2">
                  <span className="text-gray-500">查询结果：</span>
                  <ul className="mt-1 space-y-1">
                    {data.results.map((result: any, idx: number) => (
                      <li key={idx} className="bg-white px-2 py-1 rounded">
                        {result.title || result.content?.substring(0, 50) || '无标题'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* 处理文本内容 */}
              {(data.content || data.data?.content) && (
                <div className="mt-2">
                  <span className="text-gray-500">查询结果：</span>
                  <div className="mt-1 bg-white px-2 py-1 rounded text-sm">
                    {data.content || data.data?.content}
                  </div>
                </div>
              )}
              
              {/* 处理其他数据字段 */}
              {(!data.content && !data.data?.content && !data.results && !data.data?.productName && !data.productName) && (
                <div className="mt-2">
                  <span className="text-gray-500">查询结果：</span>
                  <div className="mt-1 bg-white px-2 py-1 rounded text-sm">
                    {Object.entries((data.data || data || {}) as Record<string, unknown>).map(([key, value], idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="font-medium">{key}：</span>
                        <span>{value != null ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : '无'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {intent === 'query' ? (
            <button
              onClick={() => { setShowConfirmCard(false); setConfirmData(null); }}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
              关闭
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
              >
                <Check className="w-4 h-4" />
                确认创建
              </button>
              <button
                onClick={() => { setShowConfirmCard(false); setConfirmData(null); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* AI助手窗口 - 可拖动 */}
      {isOpen && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl w-80 md:w-96 max-h-[600px] flex flex-col border border-gray-200 overflow-hidden"
          style={{
            left: `${windowPosition.x}px`,
            top: `${windowPosition.y}px`,
            cursor: isDragging ? 'grabbing' : 'default'
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 头部 - 可拖动 */}
          <div
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex justify-between items-center cursor-move"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 cursor-grab opacity-70" />
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold">AI智能助手</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20 p-1 rounded transition-colors"
                title={isMinimized ? "展开" : "最小化"}
              >
                {isMinimized ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="text-white hover:bg-white/20 p-1 rounded transition-colors"
                  title="清除聊天记录"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => { setIsOpen(false); onUnload?.(); }}
                className="text-white hover:bg-white/20 p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 最小化时只显示头部 */}
          {isMinimized ? (
            <div className="p-4 bg-gray-50 text-center text-sm text-gray-500 no-drag">
              AI助手已最小化 · 点击上方按钮展开
            </div>
          ) : (
            <>
              {/* 消息区域 */}
              <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px] min-h-[400px]">
                <MessageFlow messages={messages} />
                {showConfirmCard && <ConfirmCard />}
              </div>

              {/* 输入区域 */}
              <div className="border-t border-gray-200 p-3 no-drag">
                {/* 搜索模式选择器 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">搜索模式：</span>
                  <select
                    value={searchMode}
                    onChange={(e) => setSearchMode(e.target.value as 'keyword' | 'vector' | 'hybrid')}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="keyword">关键词搜索</option>
                    <option value="vector">向量搜索</option>
                    <option value="hybrid">混合搜索</option>
                  </select>
                </div>
                {showImageUpload ? (
                  <ImageUploader
                    onUpload={(url) => { setShowImageUpload(false); }}
                    onCancel={() => setShowImageUpload(false)}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowImageUpload(true)}
                      className="text-gray-500 hover:text-purple-600 p-2 rounded"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="说出您的需求..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleSend}
                      disabled={loading || !input.trim()}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
