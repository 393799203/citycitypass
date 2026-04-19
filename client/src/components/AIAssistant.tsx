import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Image as ImageIcon, Bot, Sparkles, Check, FileText, ShoppingCart, Package, ClipboardList, AlertCircle, GripVertical, Trash2 } from 'lucide-react';
import MessageFlow from './MessageFlow';
import { aiApi } from '../api/ai';
import { orderApi, purchaseOrderApi, productApi, bundleApi, inboundApi, warehouseApi, supplierApi, supplierProductApi } from '../api';
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
      content: '您好！我是AI业务助手，可以帮您处理多种业务操作：\n\n📋 创建订单 - "帮老丁购买飞天茅台1箱6瓶装的，杭州市XXX，132XXX"\n🛒 采购订单 - "向贵州茅台酒业采购3箱6瓶装的飞天茅台，期望到货4月30日"\n📦 入库操作 - "将10瓶茅台入库到XXXX仓库"\n\n直接说出您的需求，我会帮您生成单据确认！',
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
      setConfirmData(data);
      setShowConfirmCard(true);
      if (!isOpen) setIsOpen(true);
    };
    return () => {
      delete (window as any).openAIPanel;
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

      const systemPrompt = `你是一个专业的WMS仓储管理系统助手。你的任务是根据用户的自然语言输入，提取结构化的业务数据。

## 工作流程
1. 首先分析用户的输入，判断意图（创建订单/采购订单/入库/查询等）
2. 从知识库中查找对应意图的数据格式要求和商品规格信息
3. 严格按照知识库中的商品规格返回spec和packaging，不要自行编造
4. 返回结构化的JSON数据

## 重要：商品规格匹配规则
如果知识库中包含商品规格信息（如：规格=500ml, 包装=箱(6瓶)），必须：
- items中的spec字段必须从知识库的规格中选取
- items中的packaging字段必须从知识库的包装中选取
- 不要自行编造或修改spec和packaging值

## 意图判断关键词
- "订购"、"下单"、"购买"、"买"、"订" → create_order（销售订单：客户向你订购商品）
- "采购"、"向XX供应商采购"、"进货" → create_purchase_order（采购订单：你向供应商采购商品）
- "入库"、"入库到" → create_inbound（入库单）
- "查询"、"多少"、"库存" → query（查询）
- 如果用户输入与仓储管理无关（如：你好、天气、闲聊等）→ 返回普通文本回复，不要返回JSON

## 常见错误区分
- "帮XX订购/购买/下单" = create_order（销售订单）
- "向XX供应商采购/进货" = create_purchase_order（采购订单）

## 数据格式要求
若无相关业务数据格式要求，则返回普通文本回复，不要返回JSON。

【销售订单格式】：当用户订购商品时，必须返回此格式：
{"intent": "create_order", "type": "sales_order", "data": {"ownerId": "主体ID", "receiver": "客户姓名", "phone": "电话", "province": "省份", "city": "城市", "address": "详细地址", "items": [{"productName": "商品名称", "spec": "规格", "packaging": "包装", "quantity": 数量}]}}

【采购订单格式】：当用户采购商品时，必须返回此格式：
{"intent": "create_purchase_order", "type": "purchase_order", "data": {"supplierId": "供应商", "warehouseId": "仓库", "orderDate": "YYYY-MM-DD格式日期，如2026-04-17", "expectedDate": "YYYY-MM-DD格式日期，如2026-04-30", "remark": "备注", "items": [{"productName": "商品名称", "spec": "规格", "packaging": "包装", "quantity": 数量}]}}

【入库单格式】：当用户创建入库单时，必须返回此格式：
{"intent": "create_inbound", "type": "inbound_order", "data": {"warehouseId": "仓库", "source": "来源", "remark": "备注", "items": [{"productName": "商品名称", "spec": "规格", "packaging": "包装", "quantity": 数量}]}}

【其他格式】其他与物流仓库系统有关的业务数据格式要求：
{"intent": "类型", "type": "other", "data": "结果" }

## 重要规则
1. 如果是仓储相关问题，必须只返回JSON，不要任何其他文字
2. 数量必须是数字，不是字符串
3. 地址要拆分：address="详细地址（不含省市）"，province="省份"，city="城市"，省份和城市要补完整名称
4. **日期必须使用YYYY-MM-DD格式，如2026-04-17，不要使用"4月30日"、"April 30"等其他格式**
5. 如果信息不完整，相关字段填null或留空
6. productName是最重要的字段，必须从用户输入中提取
7. spec和packaging必须从知识库获取，不要自行编造

## 知识库内容
${context.length > 0 ? context.join('\n\n') : '暂无相关知识库内容'}

## 回答要求
1. 如果是仓储相关问题，必须只返回JSON，不要任何其他文字
2. 数量必须是数字，不是字符串
3. 地址要拆分：address="详细地址（不含省市）"，province="省份"，city="城市"
4. 如果信息不完整，相关字段填null或留空
5. productName是最重要的字段，必须从用户输入中提取
6. 【查询类问题-价格】当用户询问进货价/采购价格时：必须从知识库中找到"采购价格"或"进货"相关的数据`;

      const history = messages
        .filter(m => m.type !== 'system')
        .slice(-2)
        .map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      const fullPrompt = `${systemPrompt}\n\n【用户问题】\n${input}`;

      const chatResponse = await aiApi.chat(fullPrompt, history, imagesToSend);

      if (chatResponse.success && chatResponse.data?.content) {
        const content = chatResponse.data.content;
        const structuredData = parseAIResponse(content);

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
