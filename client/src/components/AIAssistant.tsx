import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Image as ImageIcon, Bot, Sparkles, Check, FileText, ShoppingCart, Package, ClipboardList, AlertCircle, GripVertical, Trash2 } from 'lucide-react';
import { jsonrepair } from 'jsonrepair';
import MessageFlow from './MessageFlow';
import { aiApi } from '../api/ai';
import { orderApi, purchaseOrderApi, inboundApi, stockApi } from '../api';
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
  const [windowPosition, setWindowPosition] = useState({
    x: typeof window !== 'undefined' ? Math.max(0, window.innerWidth - 460) : 0,
    y: typeof window !== 'undefined' ? Math.max(0, window.innerHeight - 674) : 0
  });
  const currentOwnerId = useOwnerStore((state) => state.currentOwnerId);

  const initialMessages: Message[] = [
    {
      id: '1',
      content: '您好！我是草莓园AI业务助手，可以帮您处理多种业务操作：\n\n📋 创建订单 - "帮张老板订购5箱女皇草莓，送到杭州西湖区文三路88号，13800138000"\n🛒 采购订单 - "向泰湖草莓园采购20箱10斤装女皇草莓，预计4月30日到货"\n📦 入库操作 - "将30箱女皇草莓入库到阳一点草莓仓"\n🔍 查询库存 - "查询女皇草莓的当前库存"\n📊 库存汇总 - "查询下我的库存汇总"\n🔎 批次查询 - "查询批次号20260428ZBKR的库存"\n\n直接说出您的需求，我会帮您生成单据或查询数据！',
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
      handleSKUSelect(option);
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
        } else {
          return null;
        }
      }

      try {
        const parsed = JSON.parse(jsonStr);
        if (typeof parsed === 'object' && parsed !== null && parsed.intent) {
          return parsed;
        }
        return null;
      } catch (e1) {
        try {
          const fixedJson = jsonrepair(jsonStr);
          const parsed = JSON.parse(fixedJson);
          if (typeof parsed === 'object' && parsed !== null && parsed.intent) {
            return parsed;
          }
          return null;
        } catch (e2) {
          console.error('Failed to parse AI response:', e2);
          return null;
        }
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      return null;
    }
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

      const systemPrompt = `你是WMS仓储助手。业务问题必须返回JSON，闲聊返回普通文本。

【意图与JSON格式】
- 销售订单: {"intent":"create_order","data":{"receiver":"姓名","phone":"电话","province":"省","city":"市","address":"地址","items":[{"skuId":"ID","productName":"商品","spec":"规格","packaging":"包装","quantity":数量}]}}
- 采购订单: {"intent":"create_purchase_order","data":{"supplierId":"ID","supplierName":"名称","orderDate":"YYYY-MM-DD","expectedDate":"日期","items":[...]}}
- 入库单: {"intent":"create_inbound","data":{"warehouseId":"ID","warehouseName":"名称","source":"OTHER","items":[...]}}
- SKU多选(销售): {"intent":"match_sku","type":"create","data":{"receiver":"姓名","phone":"电话","province":"省","city":"市","address":"地址","quantity":数量,"options":[{"skuId":"ID","productName":"商品","spec":"规格","packaging":"包装","availableQuantity":数量}]}}
- SKU多选(采购): {"intent":"match_sku","type":"purchase","data":{"supplierId":"ID","supplierName":"名称","quantity":数量,"options":[{"skuId":"ID","productName":"商品","spec":"规格","packaging":"包装"}]}}
- SKU多选(入库): {"intent":"match_sku","type":"inbound","data":{"warehouseId":"ID","warehouseName":"名称","quantity":数量,"options":[{"skuId":"ID","productName":"商品","spec":"规格","packaging":"包装"}]}}
- SKU多选(查询): {"intent":"match_sku","type":"query","data":{"options":[{"skuId":"ID","productName":"商品","spec":"规格","packaging":"包装","availableQuantity":数量}]}}
- 库存查询结果: {"intent":"query","type":"sku_inventory/bundle_inventory/owner_stock_summary/batch_inventory","data":{...}}
- 知识库回答: {"intent":"query","type":"others","data":{"answer":"回答内容"}}

【知识库】
${context.length > 0 ? context.join('\n') : '暂无'}

【要求】
1. 只能调用【工具】中列出的工具，不能调用其他工具
2. 创建订单/采购单/入库单前必须先调用匹配工具获取ID
3. 日期格式YYYY-MM-DD，采用今天的日期
4. packaging不要编造，用户说了才传入`;

      const hasImages = imagesToSend.length > 0;
      const enableTools = !hasImages;
      const toolInstructions = enableTools ? `

【可用工具】（只能调用这些，不要调用其他工具）
- match_sku(productName, spec?, packaging?) → 匹配商品SKU，返回skuId
- match_supplier(supplierName) → 匹配供应商，返回supplierId
- match_warehouse(warehouseName) → 匹配仓库，返回warehouseId
- query_inventory(productName, spec?, packaging?) → 查询库存
- query_owner_stock_summary() → 查询主体库存汇总
- query_batch_trace(batchNo) → 批次追溯

【工作流程】
1. 销售订单: match_sku获取skuId → 返回JSON（intent: create_order）
2. 采购订单: match_supplier获取supplierId → match_sku获取skuId → 返回JSON（intent: create_purchase_order）
3. 入库单: match_warehouse获取warehouseId → match_sku获取skuId → 返回JSON（intent: create_inbound）
4. 库存查询: 调用query工具 → 返回JSON（intent: query）

【重要】返回的JSON格式中不要包含tool字段，intent不是工具名称！

注意: ownerId由系统自动获取，无需AI提供` : '';

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
        console.log('[AI] parseAIResponse result:', structuredData, 'content:', content.substring(0, 100));

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
        } else if (structuredData?.intent === 'match_sku' && structuredData?.data?.options) {
          console.log('[AI] Setting inventory options:', structuredData.data.options);
          setInventoryQuery({
            productName: structuredData.data.productName,
            spec: structuredData.data.spec,
            packaging: structuredData.data.packaging
          });
          setInventoryOptions(structuredData.data.options);
        } else if (structuredData?.intent === 'match_sku' && (structuredData as any)?.success === false) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `❌ ${(structuredData as any).message || '未找到匹配的商品或套装'}`,
            type: 'ai',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
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

  const handleSKUSelect = async (option: any) => {
    setMessages(prev => {
      const newMsgs = [...prev];
      for (let i = newMsgs.length - 1; i >= 0; i--) {
        const msg = newMsgs[i];
        if (msg.structuredData?.intent === 'match_sku' && msg.structuredData?.data?.options) {
          newMsgs[i] = { ...msg, confirmed: true, selectedOption: option };
          break;
        }
      }
      return newMsgs;
    });

    setInventoryOptions([]);
    setInventoryQuery(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: `我选择 ${option.packaging} 包装的${option.productName || '商品'}`,
      type: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    if (option.type === 'query') {
      setLoading(true);
      try {
        const stockResponse = await stockApi.getSkuStock(option.skuId);
        const stockData = stockResponse.data?.data || stockResponse.data || [];
        const stocks = Array.isArray(stockData) ? stockData : [stockData];

        const totalQuantity = stocks.reduce((sum: number, s: any) => sum + (s.totalQuantity || 0), 0);
        const availableQuantity = stocks.reduce((sum: number, s: any) => sum + (s.availableQuantity || 0), 0);
        const lockedQuantity = stocks.reduce((sum: number, s: any) => sum + (s.lockedQuantity || 0), 0);

        const details = stocks.map((s: any) => ({
          skuId: s.skuId,
          productName: s.sku?.product?.name || option.productName || '',
          spec: s.sku?.spec || option.spec || '',
          packaging: s.sku?.packaging || option.packaging || '',
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
              productName: option.productName || details[0]?.productName || '',
              spec: option.spec || details[0]?.spec || '',
              packaging: option.packaging || details[0]?.packaging || '',
              skuId: option.skuId,
              summary: { totalQuantity, availableQuantity, lockedQuantity },
              details,
            }
          }
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error: any) {
        console.error('Stock query error:', error);
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
      return;
    }

    if (option.type === 'create' && option.receiver && option.phone && option.address) {
      const orderData = {
        intent: 'create_order',
        type: 'create',
        data: {
          receiver: option.receiver,
          phone: option.phone,
          province: option.province,
          city: option.city,
          address: option.address,
          items: [{
            skuId: option.skuId,
            productName: option.productName,
            spec: option.spec,
            packaging: option.packaging,
            quantity: option.quantity || 1,
          }]
        }
      };

      const msgId = (Date.now() + 1).toString();
      setPendingMsgId(msgId);
      setConfirmData(orderData as any);
      setShowConfirmCard(true);

      const aiMessage: Message = {
        id: msgId,
        content: JSON.stringify(orderData),
        type: 'ai',
        timestamp: new Date(),
        structuredData: orderData as any,
        confirmed: false
      };
      setMessages(prev => [...prev, aiMessage]);
      return;
    }

    if (option.type === 'purchase' && option.supplierId) {
      const orderData = {
        intent: 'create_purchase_order',
        type: 'purchase',
        data: {
          supplierId: option.supplierId,
          supplierName: option.supplierName,
          orderDate: new Date().toISOString().split('T')[0],
          items: [{
            skuId: option.skuId,
            productName: option.productName,
            spec: option.spec,
            packaging: option.packaging,
            quantity: option.quantity || 1,
          }]
        }
      };

      const msgId = (Date.now() + 1).toString();
      setPendingMsgId(msgId);
      setConfirmData(orderData as any);
      setShowConfirmCard(true);

      const aiMessage: Message = {
        id: msgId,
        content: JSON.stringify(orderData),
        type: 'ai',
        timestamp: new Date(),
        structuredData: orderData as any,
        confirmed: false
      };
      setMessages(prev => [...prev, aiMessage]);
      return;
    }

    if (option.type === 'inbound' && option.warehouseId) {
      const orderData = {
        intent: 'create_inbound',
        type: 'inbound',
        data: {
          warehouseId: option.warehouseId,
          warehouseName: option.warehouseName,
          source: 'OTHER',
          items: [{
            skuId: option.skuId,
            productName: option.productName,
            spec: option.spec,
            packaging: option.packaging,
            quantity: option.quantity || 1,
          }]
        }
      };

      const msgId = (Date.now() + 1).toString();
      setPendingMsgId(msgId);
      setConfirmData(orderData as any);
      setShowConfirmCard(true);

      const aiMessage: Message = {
        id: msgId,
        content: JSON.stringify(orderData),
        type: 'ai',
        timestamp: new Date(),
        structuredData: orderData as any,
        confirmed: false
      };
      setMessages(prev => [...prev, aiMessage]);
      return;
    }

    setLoading(true);

    try {
      let context: string[] = [];
      try {
        const ragResponse = await aiApi.queryDocuments(`${option.productName} ${option.spec}`);
        if (ragResponse.success && ragResponse.data && ragResponse.data.length > 0) {
          context = ragResponse.data.map((doc: any) => doc.content);
        }
      } catch { /* ignore */ }

      const systemPrompt = `你是业务助手，帮助用户创建订单。用户刚才选择了商品SKU，请根据选择的SKU信息创建订单。

【选择的SKU信息】
skuId: ${option.skuId}
productName: ${option.productName}
spec: ${option.spec || '标准'}
packaging: ${option.packaging || '散装'}
quantity: ${option.quantity || 1}

【JSON格式 - 必须严格遵守】
销售订单: {"intent": "create_order", "data": {"receiver":"姓名","phone":"电话","province":"省","city":"市","address":"地址","items":[{"skuId":"${option.skuId}","productName":"${option.productName}","spec":"${option.spec || ''}","packaging":"${option.packaging || ''}","quantity":${option.quantity || 1}}]}}

【要求】
1. 从之前的对话中提取收货人、电话、地址等信息
2. 如果之前对话中没有这些信息，请询问用户
3. 返回JSON格式`;

      const history = messages.filter(m => m.type !== 'system').slice(-4)
        .map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      const chatResponse = await aiApi.chat(systemPrompt, history, [], false);

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
      }
    } catch (error: any) {
      console.error('Continue order error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `处理失败：${error?.message || '未知错误'}`,
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
        const items = (confirmData.data.items || []).map((item: any) => ({
          skuId: item.skuId,
          bundleId: item.bundleId,
          productName: item.productName,
          spec: item.spec || '标准',
          packaging: item.packaging || '散装',
          quantity: Number(item.quantity) || 1,
        }));
        const orderData = {
          receiver: confirmData.data.receiver,
          phone: confirmData.data.phone,
          province: confirmData.data.province,
          city: confirmData.data.city,
          address: confirmData.data.address,
          items,
        };
        const response = await orderApi.create(orderData);
        result = response.data;
      }

      if (confirmData.intent === 'create_purchase_order') {
        const items = (confirmData.data.items || []).map((item: any) => ({
          itemType: item.itemType || (item.bundleId ? 'BUNDLE' : 'PRODUCT'),
          skuId: item.skuId,
          bundleId: item.bundleId,
          quantity: Number(item.quantity) || 1,
          price: item.price || 0,
        }));

        const purchaseData = {
          supplierId: confirmData.data.supplierId,
          warehouseId: confirmData.data.warehouseId,
          orderDate: parseDate(confirmData.data.orderDate) || new Date().toISOString(),
          expectedDate: parseDate(confirmData.data.expectedDate),
          remark: confirmData.data.remark || '',
          items,
        };
        const response = await purchaseOrderApi.create(purchaseData);
        result = response.data;
      }

      if (confirmData.intent === 'create_inbound') {
        const items = (confirmData.data.items || []).map((item: any) => ({
          type: item.type || (item.bundleId ? 'BUNDLE' : 'PRODUCT'),
          skuId: item.skuId,
          bundleId: item.bundleId,
          quantity: Number(item.quantity) || 1,
        }));

        const inboundData = {
          warehouseId: confirmData.data.warehouseId,
          source: confirmData.data.source || 'PURCHASE',
          remark: confirmData.data.remark || '',
          items,
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
      case 'match_sku': return 'SKU选择';
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
                      {item.productName}{item.spec ? ` - ${item.spec}` : ''}{item.packaging ? ` - ${item.packaging}` : ''} × {item.quantity} {item.unit || '件'}
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
                      {item.productName}{item.spec ? ` - ${item.spec}` : ''}{item.packaging ? ` - ${item.packaging}` : ''} × {item.quantity}
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
                      {item.productName}{item.spec ? ` - ${item.spec}` : ''}{item.packaging ? ` - ${item.packaging}` : ''} × {item.quantity}
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
          className="fixed z-50 bg-white rounded-xl shadow-2xl w-96 md:w-[450px] min-h-[650px] max-h-[650px] flex flex-col border border-gray-200"
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
