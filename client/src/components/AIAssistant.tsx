import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Image as ImageIcon, Bot, Sparkles, Check, FileText, ShoppingCart, Package, ClipboardList, AlertCircle, Minus, GripVertical, Square } from 'lucide-react';
import ImageUploader from './ImageUploader';
import MessageFlow from './MessageFlow';
import { aiApi } from '../api/ai';

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
}

export default function AIAssistant({ onDocumentCreate }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showConfirmCard, setShowConfirmCard] = useState(false);
  const [confirmData, setConfirmData] = useState<AIStructuredData | null>(null);
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

  const initialMessages: Message[] = [
    {
      id: '1',
      content: '您好！我是AI业务助手，可以帮您处理多种业务操作：\n\n📋 创建订单 - "帮张三订购100箱茅台500ml，发往北京..."\n🛒 采购订单 - "向供应商A采购100瓶茅台"\n📦 入库操作 - "将100瓶茅台入库到北京仓库"\n🚚 调度配送 - "调度车辆配送订单12345"\n\n直接说出您的需求，我会帮您生成单据确认！',
      type: 'system',
      timestamp: new Date()
    }
  ];

  const parseAIResponse = (content: string): AIStructuredData | null => {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.intent && parsed.type) {
          return parsed as AIStructuredData;
        }
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }
    return null;
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
      const ragResponse = await aiApi.queryDocuments(input);

      let context: string[] = [];
      if (ragResponse.success && ragResponse.data && ragResponse.data.length > 0) {
        context = ragResponse.data.map((doc: any) => doc.content);
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

  const handleConfirm = () => {
    if (confirmData && onDocumentCreate) {
      onDocumentCreate({
        type: confirmData.type,
        data: confirmData.data,
        intent: confirmData.intent
      });

      const successMessage: Message = {
        id: Date.now().toString(),
        content: '✅ 单据已创建成功！',
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
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
              <div className="mt-2">
                <span className="text-gray-500">采购商品：</span>
                <ul className="mt-1 space-y-1">
                  {data.items?.map((item: any, idx: number) => (
                    <li key={idx} className="bg-white px-2 py-1 rounded">
                      {item.productName} - {item.spec || ''} × {item.quantity} @ ¥{item.price || '-'}
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
        </div>

        <div className="flex gap-2 mt-4">
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
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 悬浮按钮 - 固定在右下角 */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => { setIsOpen(true); setMessages(initialMessages); }}
            className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
          >
            <Bot className="w-6 h-6" />
          </button>
        </div>
      )}

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
              <button
                onClick={() => setIsOpen(false)}
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
              <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                <MessageFlow messages={messages} />
                {showConfirmCard && <ConfirmCard />}
              </div>

              {/* 输入区域 */}
              <div className="border-t border-gray-200 p-3 no-drag">
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
