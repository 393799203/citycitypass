import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Image as ImageIcon, Bot, Sparkles, Check, FileText, ShoppingCart, Package, ClipboardList, AlertCircle, GripVertical, Trash2 } from 'lucide-react';
import MessageFlow from './MessageFlow';
import { aiApi } from '../api/ai';
import { orderApi, purchaseOrderApi, productApi, bundleApi, inboundApi, warehouseApi, supplierApi, supplierProductApi, stockApi } from '../api';
import { useOwnerStore } from '../stores/owner';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  imageUrls?: string[];
  structuredData?: AIStructuredData | null;
  error?: AIErrorInfo;
  confirmed?: boolean;
  selectedOption?: any;
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
  const [isDragging, setIsDragging] = useState(false);
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });
  const currentOwnerId = useOwnerStore((state) => state.currentOwnerId);

  const initialMessages: Message[] = [
    {
      id: '1',
      content: '您好！我是AI业务助手，可以帮您处理多种业务操作：\n\n📋 创建订单 - "帮老丁购买飞天茅台1箱6瓶装的，杭州市XXX，132XXX"\n🛒 采购订单 - "向贵州茅台酒业采购3箱6瓶装的飞天茅台，期望到货4月30日"\n📦 入库操作 - "将10瓶茅台入库到XXXX仓库"\n🔍 查询库存 - "查询飞天茅台500ml的库存"\n📊 我的库存 - "查询下我的库存汇总"\n🔎 批次查询 - "查询批次号20260417的库存"\n\n直接说出您的需求，我会帮您生成单据或查询数据！',
      type: 'system',
      timestamp: new Date()
    }
  ];
  const ownerId = currentOwnerId || 'global';

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('ai-chat-messages');
      if (saved && saved !== '{}') {
        const parsed = JSON.parse(saved);
        const ownerMessages = parsed[ownerId];
        if (ownerMessages && Array.isArray(ownerMessages) && ownerMessages.length > 0) {
          return ownerMessages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
            structuredData: m.structuredData || null,
            confirmed: m.confirmed || false
          }));
        }
      }
    } catch (e) {
      console.error('[AI] Init load error:', e);
    }
    return initialMessages;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai-chat-messages');
      if (saved && saved !== '{}') {
        const parsed = JSON.parse(saved);
        const ownerMessages = parsed[ownerId];
        if (ownerMessages && Array.isArray(ownerMessages) && ownerMessages.length > 0) {
          setMessages(ownerMessages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
            structuredData: m.structuredData || null,
            confirmed: m.confirmed || false
          })));
        } else {
          setMessages(initialMessages);
        }
      } else {
        setMessages(initialMessages);
      }
    } catch (e) {
      console.error('[AI] Reload error:', e);
      setMessages(initialMessages);
    }
  }, [currentOwnerId]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmCard, setShowConfirmCard] = useState(false);
  const [confirmData, setConfirmData] = useState<AIStructuredData | null>(null);
  const [pendingMsgId, setPendingMsgId] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'keyword' | 'vector' | 'hybrid'>('hybrid');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [inventoryOptions, setInventoryOptions] = useState<any[]>([]);
  const [inventoryQuery, setInventoryQuery] = useState<{productName: string; spec?: string; packaging?: string} | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isOpen, showConfirmCard, selectedImages]);

  useEffect(() => {
    if (isOpen) {
      setWindowPosition({
        x: Math.max(0, window.innerWidth - 408),
        y: Math.max(0, window.innerHeight - 674)
      });
    }
  }, [isOpen]);

  useEffect(() => {
    (window as any).openAIPanel = (data: AIStructuredData) => {
      console.log('[AI] openAIPanel called with:', data);
      if (data.intent === 'query' && data.type === 'inventory' && data.data?.options) {
        console.log('[AI] Setting inventoryOptions:', data.data.options);
        setInventoryQuery({
          productName: data.data.productName,
          spec: data.data.spec,
          packaging: data.data.packaging
        });
        setInventoryOptions(data.data.options);
      } else {
        setConfirmData(data);
        setShowConfirmCard(true);
      }
      if (!isOpen) setIsOpen(true);
    };

    (window as any).selectInventoryOption = (option: any) => {
      console.log('[AI] selectInventoryOption called with:', option);
      handleInventorySelect(option);
    };

    return () => {
      delete (window as any).openAIPanel;
      delete (window as any).selectInventoryOption;
    };
  }, [isOpen]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai-chat-messages');
      const allMessages = saved ? JSON.parse(saved) : {};
      if (messages.length > 0) {
        const trimmed = messages.slice(-100);
        allMessages[ownerId] = trimmed;
      } else {
        delete allMessages[ownerId];
      }
      localStorage.setItem('ai-chat-messages', JSON.stringify(allMessages));
    } catch (e) {
      console.error('[AI] Save error:', e);
    }
  }, [messages, ownerId]);

  const clearMessages = () => {
    setMessages(initialMessages);
    try {
      const saved = localStorage.getItem('ai-chat-messages');
      if (saved) {
        const allMessages = JSON.parse(saved);
        delete allMessages[ownerId];
        localStorage.setItem('ai-chat-messages', JSON.stringify(allMessages));
      }
    } catch (e) {
      console.error('[AI] Clear error:', e);
    }
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
      const trimmed = content.trim();

      let jsonStr = trimmed;
      const jsonMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        const firstBrace = trimmed.indexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = trimmed.substring(firstBrace, lastBrace + 1);
        }
      }

      try {
        return JSON.parse(jsonStr);
      } catch (e1) {
        const opens = (jsonStr.match(/\{/g) || []).length;
        const closes = (jsonStr.match(/\}/g) || []).length;
        if (closes < opens) {
          jsonStr += '}'.repeat(opens - closes);
        }
        try {
          return JSON.parse(jsonStr);
        } catch (e2) {
          console.error('Failed to parse AI response:', e2);
        }
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }
    return null;
  };

  // 解析日期，返回ISO格式或undefined
  const parseDate = (dateStr: any): string | undefined => {
    if (!dateStr) return undefined;
    if (typeof dateStr === 'string') {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    return undefined;
  };

  // 查找仓库ID
  const findWarehouseId = async (warehouseNameOrId: string): Promise<string | undefined> => {
    try {
      const warehouseRes = await warehouseApi.list({});
      const warehouses = warehouseRes.data.data || [];
      const trimmed = warehouseNameOrId.trim();
      const found = warehouses.find((w: any) =>
        w.name.trim() === trimmed || w.id === trimmed
      );
      return found?.id || warehouses[0]?.id || undefined;
    } catch (error) {
      console.error('Failed to get warehouse list:', error);
      return undefined;
    }
  };

  // 查找供应商ID
  const findSupplierId = async (supplierNameOrId: string): Promise<string | undefined> => {
    try {
      const supplierRes = await supplierApi.list({});
      const suppliers = supplierRes.data.data || [];
      const trimmed = supplierNameOrId.trim();
      const found = suppliers.find((s: any) =>
        s.name.trim() === trimmed || s.id === trimmed
      );
      return found?.id || suppliers[0]?.id || undefined;
    } catch (error) {
      console.error('Failed to get supplier list:', error);
      return undefined;
    }
  };

  // 标准化包装名称
  const normalizePackaging = (p: string) => {
    return p.replace(/装/g, '').replace(/罐/g, '瓶');
  };

  // 匹配SKU
  const matchSku = (sku: any, item: any): boolean => {
    const aiPackaging = normalizePackaging(item.packaging?.toLowerCase() || '');
    const aiSpec = item.spec?.toLowerCase() || '';
    const skuPackaging = normalizePackaging(sku.packaging?.toLowerCase() || '');
    const skuSpec = sku.spec?.toLowerCase() || '';

    if (aiPackaging && aiSpec) {
      return skuPackaging.includes(aiPackaging) && skuSpec.includes(aiSpec);
    }
    if (aiPackaging) {
      return skuPackaging.includes(aiPackaging);
    }
    if (aiSpec) {
      return skuSpec.includes(aiSpec);
    }
    return false;
  };

  // 查找商品SKU或套装，返回匹配结果
  const findProductOrBundle = async (productName: string, item: any, supplierId?: string) => {
    try {
      const productRes = await productApi.list({ name: productName });
      const products = productRes.data.data || [];

      for (const product of products) {
        if (!product.skus?.length) continue;

        const matchedSku = product.skus.find((s: any) => matchSku(s, item));
        if (matchedSku) {
          let price = matchedSku.price || 0;
          if (supplierId) {
            try {
              const spRes = await supplierProductApi.list({ supplierId });
              const spList = spRes.data.data || [];
              const sp = spList.find((s: any) => s.skuId === matchedSku.id);
              if (sp?.price) price = sp.price;
            } catch { /* ignore */ }
          }
          return { skuId: matchedSku.id, bundleId: null, price };
        }
      }

      // 尝试匹配套装
      const bundleRes = await bundleApi.list({ name: productName });
      const bundles = bundleRes.data.data || [];
      if (bundles.length > 0) {
        return { skuId: null, bundleId: bundles[0].id, price: bundles[0].price || 0 };
      }
    } catch (error) {
      console.error('Failed to search products/bundles:', error);
    }
    return { skuId: null, bundleId: null, price: 0 };
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const imagesToSend = [...selectedImages];
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      type: 'user',
      timestamp: new Date(),
      imageUrls: imagesToSend.length > 0 ? imagesToSend : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImages([]);
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

      const systemPrompt = `你是WMS仓储助手。

【重要规则】
- 只有仓储业务问题（订单/采购/入库/库存查询）才返回JSON
- 打招呼/问候/闲聊/天气等非业务问题 → 返回普通文本，不要JSON！
- 如果不确定是否是业务问题，默认返回普通文本

【业务意图判断】
- 订购/下单/购买 → create_order（销售订单）
- 采购/进货 → create_purchase_order（采购订单）
- 入库 → create_inbound（入库单）
- 库存/查询 → 用工具查询，返回JSON

【JSON格式 - 必须严格遵守】
- 所有JSON必须完整闭合：每个{必须有对应的}，每个[必须有对应的]
- 禁止省略任何括号、引号
- 数量必须是数字，不能是字符串

销售订单: {"intent": "create_order", "data": {"ownerId":"ID","receiver":"姓名","phone":"电话","province":"省","city":"市","address":"地址","items":[{"productName":"商品","spec":"规格","packaging":"包装","quantity":数量}]}}

采购订单: {"intent": "create_purchase_order", "data": {"supplierId":"供应商","warehouseId":"仓库","orderDate":"2026-04-20","expectedDate":"2026-04-30","remark":"备注","items":[{"productName":"商品","spec":"规格","packaging":"包装","quantity":数量}]}}

入库单: {"intent": "create_inbound", "data": {"warehouseId":"仓库","source":"来源","remark":"备注","items":[{"productName":"商品","spec":"规格","packaging":"包装","quantity":数量}]}}

库存多选项: {"intent": "query", "type": "inventory", "data": {"productName":"商品名","spec":"规格","options":[{"skuId":"xxx","packaging":"包装","availableQuantity":数量}]}}

【知识库】
${context.length > 0 ? context.join('\n') : '暂无'}

【要求】
1. 日期用YYYY-MM-DD格式
2. spec/packaging必须从知识库选取`;

      const hasImages = imagesToSend.length > 0;
      const enableTools = !hasImages;
      const toolInstructions = enableTools ? `

【工具使用】
库存查询: query_inventory(productName必填, spec可选, packaging可选)
主体汇总: query_owner_stock_summary() **不需要参数，工具自动从请求头获取ownerId**
批次追溯: query_batch_trace(batchNo)

【库存查询规则】
1. 用 query_inventory 查询商品或套装库存
2. 用 query_owner_stock_summary 查询主体库存汇总（工具会自动从请求头获取ownerId，不需要AI提供）
3. 用 query_batch_trace 查询批次库存，返回: {"intent": "query", "type": "batch_inventory", "data": {...}}
4. 如果匹配单个SKU，返回: {"intent": "query", "type": "sku_inventory", "data": {...}}
5. 如果匹配单个套装，返回: {"intent": "query", "type": "bundle_inventory", "data": {...}}
6. 如果匹配多个SKU，返回: {"intent": "query", "type": "inventory", "data": {"productName": "商品名", "spec": "规格", "options": [...]}}
7. **禁止返回纯文本，必须返回JSON！**
8. **重要：查询库存时不要要求用户输入ownerId，工具会自动从请求头获取！**

` : '';

      const fullPrompt = `${systemPrompt}${toolInstructions}\n\n【用户问题】\n${input}`;

      const history = messages.filter(m => m.type !== 'system').slice(-2)
        .map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      const chatResponse = await aiApi.chat(fullPrompt, history, imagesToSend, enableTools);
      console.log('[AI] chatResponse:', chatResponse);

      if (chatResponse.success && chatResponse.data?.content) {
        const content = chatResponse.data.content;
        console.log('[AI] content length:', content.length);
        console.log('[AI] content bytes:', [...content].slice(0, 50).map(c => c.charCodeAt(0)));
        const structuredData = parseAIResponse(content);
        console.log('[AI] structuredData:', structuredData);

        const msgId = (Date.now() + 1).toString();
        const aiMessage: Message = {
          id: msgId,
          content: content,
          type: 'ai',
          timestamp: new Date(),
          structuredData: structuredData,
          confirmed: structuredData ? false : undefined
        };
        setMessages(prev => [...prev, aiMessage]);

        if (structuredData && ['create_order', 'create_purchase_order', 'create_inbound'].includes(structuredData.intent)) {
          setPendingMsgId(msgId);
          setConfirmData(structuredData);
          setShowConfirmCard(true);
          console.log('[AI] Showing confirm card for:', structuredData.intent);
        } else if (structuredData?.intent === 'query' && structuredData?.data?.options) {
          console.log('[AI] Setting inventory options:', structuredData.data.options);
          setInventoryQuery({
            productName: structuredData.data.productName,
            spec: structuredData.data.spec,
            packaging: structuredData.data.packaging
          });
          setInventoryOptions(structuredData.data.options);
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

  const handleInventorySelect = async (option: any) => {
    try {
      setLoading(true);

      const stockResponse = await stockApi.getSkuStock(option.skuId);
      const stockData = stockResponse.data?.data || stockResponse.data || [];
      const stocks = Array.isArray(stockData) ? stockData : [stockData];

      const totalQuantity = stocks.reduce((sum: number, s: any) => sum + (s.totalQuantity || 0), 0);
      const availableQuantity = stocks.reduce((sum: number, s: any) => sum + (s.availableQuantity || 0), 0);
      const lockedQuantity = stocks.reduce((sum: number, s: any) => sum + (s.lockedQuantity || 0), 0);

      const details = stocks.map((s: any) => ({
        warehouseName: s.warehouse?.name || '-',
        locationCode: s.locationCode || s.location?.code || '-',
        batchNo: s.skuBatch?.batchNo || '-',
        totalQuantity: s.totalQuantity || 0,
        availableQuantity: s.availableQuantity || 0,
        lockedQuantity: s.lockedQuantity || 0,
      }));

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '',
        type: 'ai',
        timestamp: new Date(),
        structuredData: {
          intent: 'query',
          type: 'sku_inventory',
          data: {
            productName: option.productName || '',
            spec: option.spec || '',
            packaging: option.packaging,
            skuId: option.skuId,
            summary: { totalQuantity, availableQuantity, lockedQuantity },
            details,
          }
        }
      };
      setMessages(prev => {
        const newMsgs = [...prev];
        for (let i = newMsgs.length - 1; i >= 0; i--) {
          const msg = newMsgs[i];
          if (msg.structuredData?.intent === 'query' && msg.structuredData?.type === 'inventory' && msg.structuredData?.data?.options) {
            newMsgs[i] = { ...msg, confirmed: true, selectedOption: option };
            break;
          }
        }
        newMsgs.push(aiMessage);
        return newMsgs;
      });

      setInventoryOptions([]);
      setInventoryQuery(null);
    } catch (error: any) {
      console.error('Inventory query error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `查询库存失败：${error?.message || '未知错误'}`,
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmData) return;

    try {
      let result: any;

      if (confirmData.intent === 'create_order') {
        const itemsWithDetails = await Promise.all(
          (confirmData.data.items || []).map(async (item: any) => {
            const { skuId, bundleId } = await findProductOrBundle(item.productName, item);
            return {
              skuId,
              bundleId,
              productName: item.productName,
              spec: item.spec || '标准',
              packaging: item.packaging || '散装',
              quantity: Number(item.quantity) || 1,
            };
          })
        );
        const orderData = {
          receiver: confirmData.data.receiver,
          phone: confirmData.data.phone,
          province: confirmData.data.province,
          city: confirmData.data.city,
          address: confirmData.data.address,
          items: itemsWithDetails,
        };
        const response = await orderApi.create(orderData);
        result = response.data;
      }

      if (confirmData.intent === 'create_purchase_order') {
        const supplierId = await findSupplierId(confirmData.data.supplierId || '');
        const warehouseId = await findWarehouseId(confirmData.data.warehouseId || '');

        const itemsWithDetails = await Promise.all(
          (confirmData.data.items || []).map(async (item: any) => {
            const { skuId, bundleId, price } = await findProductOrBundle(item.productName, item, supplierId);
            return {
              itemType: item.itemType || (bundleId ? 'BUNDLE' : 'PRODUCT'),
              skuId,
              bundleId,
              quantity: Number(item.quantity) || 1,
              price: item.price || price || 0,
            };
          })
        );

        const purchaseData = {
          supplierId,
          warehouseId,
          orderDate: parseDate(confirmData.data.orderDate) || new Date().toISOString(),
          expectedDate: parseDate(confirmData.data.expectedDate),
          remark: confirmData.data.remark || '',
          items: itemsWithDetails,
        };
        const response = await purchaseOrderApi.create(purchaseData);
        result = response.data;
      }

      if (confirmData.intent === 'create_inbound') {
        const warehouseId = await findWarehouseId(confirmData.data.warehouseId || '');

        const itemsWithDetails = await Promise.all(
          (confirmData.data.items || []).map(async (item: any) => {
            const { skuId, bundleId } = await findProductOrBundle(item.productName, item);
            return {
              type: item.type || (bundleId ? 'BUNDLE' : 'PRODUCT'),
              skuId,
              bundleId,
              quantity: Number(item.quantity) || 1,
            };
          })
        );

        const inboundData = {
          warehouseId,
          source: confirmData.data.source || 'PURCHASE',
          remark: confirmData.data.remark || '',
          items: itemsWithDetails,
        };
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

      if (result?.success !== false && pendingMsgId) {
        setMessages(prev => prev.map(m =>
          m.id === pendingMsgId ? { ...m, confirmed: true } : m
        ));
        setPendingMsgId(null);
      }
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
      <div className="border border-purple-200 rounded-lg bg-purple-50 p-3 mb-3 text-xs">
        <div className="flex items-center gap-2 mb-2 text-purple-700">
          {getIntentIcon(intent)}
          <span className="font-semibold">{getIntentTitle(intent)}</span>
        </div>

        <div className="space-y-1 text-xs">
          {intent === 'create_order' && (
            <>
              <div className="flex gap-2"><span className="text-gray-500">客户：</span><span>{data.customerName || data.receiver || '-'}</span></div>
              {data.phone && <div className="flex gap-2"><span className="text-gray-500">电话：</span><span>{data.phone}</span></div>}
              <div className="flex gap-2"><span className="text-gray-500">地址：</span><span>{[data.province, data.city, data.address].filter(Boolean).join('') || '-'}</span></div>
              <div className="mt-1">
                <span className="text-gray-500">商品：</span>
                <ul className="mt-0.5 space-y-0.5">
                  {data.items?.map((item: any, idx: number) => (
                    <li key={idx} className="bg-white px-2 py-0.5 rounded text-xs">
                      {item.productName} - {item.spec} × {item.quantity} {item.unit || '件'}
                    </li>
                  )) || <li className="text-gray-400">暂无商品</li>}
                </ul>
              </div>
            </>
          )}

          {intent === 'create_purchase_order' && (
            <>
              <div className="flex gap-2"><span className="text-gray-500">供应商：</span><span>{data.supplierName || data.supplierId || '-'}</span></div>
              {data.orderDate && <div className="flex gap-2"><span className="text-gray-500">订单日期：</span><span>{data.orderDate}</span></div>}
              {data.expectedDate && <div className="flex gap-2"><span className="text-gray-500">预计到货：</span><span>{data.expectedDate}</span></div>}
              <div className="mt-1">
                <span className="text-gray-500">商品：</span>
                <ul className="mt-0.5 space-y-0.5">
                  {data.items?.map((item: any, idx: number) => (
                    <li key={idx} className="bg-white px-2 py-0.5 rounded text-xs">
                      {item.productName} × {item.quantity}
                    </li>
                  )) || <li className="text-gray-400">暂无商品</li>}
                </ul>
              </div>
            </>
          )}

          {intent === 'create_inbound' && (
            <>
              <div className="flex gap-2"><span className="text-gray-500">仓库：</span><span>{data.warehouseName || data.warehouseId || '-'}</span></div>
              <div className="mt-1">
                <span className="text-gray-500">商品：</span>
                <ul className="mt-0.5 space-y-0.5">
                  {data.items?.map((item: any, idx: number) => (
                    <li key={idx} className="bg-white px-2 py-0.5 rounded text-xs">
                      {item.productName} × {item.quantity}
                    </li>
                  )) || <li className="text-gray-400">暂无商品</li>}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          {intent === 'query' ? (
            <button
              onClick={() => { setShowConfirmCard(false); setConfirmData(null); }}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-1.5 px-3 rounded-lg hover:bg-gray-200 text-xs"
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
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs"
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
          className="fixed z-50 bg-white rounded-xl shadow-2xl w-80 md:w-96 min-h-[650px] max-h-[650px] flex flex-col border border-gray-200"
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
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 rounded-t-xl flex justify-between items-center cursor-move"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 cursor-grab opacity-70" />
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold">AI智能助手</h3>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
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
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 消息区域 */}
          <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            <MessageFlow messages={messages} />
            {showConfirmCard && <ConfirmCard />}
          </div>

          {/* 输入区域 */}
          <div className="border-t border-gray-200 p-3 no-drag">
            {/* 搜索模式按钮和图片上传 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500">搜索：</span>
              {['keyword', 'vector', 'hybrid'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSearchMode(mode as 'keyword' | 'vector' | 'hybrid')}
                  className={`text-xs px-2 py-1 rounded ${
                    searchMode === mode
                      ? 'bg-purple-100 text-purple-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'keyword' ? '关键词' : mode === 'vector' ? '向量' : '混合'}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => imageInputRef.current?.click()}
                className="text-gray-500 hover:text-purple-600 p-1 rounded"
                title="上传图片"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  console.log('[AI] Files selected:', files?.length);
                  if (files && files.length > 0) {
                    const images: string[] = [];
                    const totalFiles = files.length;
                    let loaded = 0;
                    Array.from(files).forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          images.push(event.target.result as string);
                          loaded++;
                          console.log('[AI] Loaded:', loaded, '/', totalFiles);
                          if (loaded === totalFiles) {
                            console.log('[AI] Setting images:', images.length);
                            setSelectedImages(prev => [...prev, ...images]);
                          }
                        }
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
            </div>
            {selectedImages.length > 0 && (
              <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500">已选 {selectedImages.length} 张图片</span>
                  <button
                    onClick={() => setSelectedImages([])}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    清除全部
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="relative flex-shrink-0">
                      <img src={img} alt="" className="w-12 h-12 object-cover rounded" />
                      <button
                        onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
          </div>
        </div>
      )}
    </>
  );
}
