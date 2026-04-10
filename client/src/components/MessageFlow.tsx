import React from 'react';
import { Image as ImageIcon, AlertCircle, CheckCircle, FileText, ShoppingCart, Package, ClipboardList } from 'lucide-react';

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

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  imageUrl?: string;
  error?: AIErrorInfo;
  structuredData?: AIStructuredData | null;
}

interface MessageFlowProps {
  messages: Message[];
}

export default function MessageFlow({ messages }: MessageFlowProps) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] p-3 rounded-lg ${
              message.type === 'user'
                ? 'bg-blue-100 text-blue-800'
                : message.error
                ? 'bg-red-50 border border-red-200 p-4'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {message.imageUrl && (
              <div className="mb-2">
                <img
                  src={message.imageUrl}
                  alt="Message"
                  className="max-h-40 object-contain rounded"
                />
              </div>
            )}

            {message.error && (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-red-700">AI 服务错误</div>
                  <div className="text-sm text-red-600 mt-1">
                    <div>错误码：{message.error.code}</div>
                    <div className="mt-1">错误信息：{message.error.message}</div>
                    {message.error.provider && (
                      <div className="mt-1">提供商：{message.error.provider}</div>
                    )}
                    {message.error.raw && (
                      <div className="mt-1 text-xs text-red-400 break-all">
                        详情：{message.error.raw}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {message.structuredData && !message.error && (
              <div
                className="mb-2 p-3 bg-white rounded border border-purple-200 cursor-pointer hover:bg-purple-50 transition-colors text-sm"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).openAIPanel) {
                    (window as any).openAIPanel(message.structuredData);
                  }
                }}
              >
                {message.structuredData.intent === 'create_order' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <ShoppingCart className="w-4 h-4" />
                      <span>创建销售订单</span>
                    </div>
                    <div className="text-gray-600 text-xs space-y-0.5">
                      {message.structuredData.data?.receiver && (
                        <div>客户：{message.structuredData.data.receiver}</div>
                      )}
                      {message.structuredData.data?.phone && (
                        <div>电话：{message.structuredData.data.phone}</div>
                      )}
                      {(message.structuredData.data?.province || message.structuredData.data?.city || message.structuredData.data?.address) && (
                        <div>地址：{[message.structuredData.data.province, message.structuredData.data.city, message.structuredData.data.address].filter(Boolean).join('')}</div>
                      )}
                      {message.structuredData.data?.items?.length > 0 && (
                        <div>商品：{message.structuredData.data.items.map((item: any, idx: number) => (
                          <span key={idx} className="inline-block mr-2">
                            {item.productName}{item.spec ? ` ${item.spec}` : ''}{item.packaging ? ` ${item.packaging}` : ''} × {item.quantity}
                          </span>
                        ))}</div>
                      )}
                    </div>
                    <div className="text-xs text-purple-500 mt-1">点击查看详情 →</div>
                  </div>
                )}
                {message.structuredData.intent === 'create_purchase_order' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <ClipboardList className="w-4 h-4" />
                      <span>创建采购订单</span>
                    </div>
                    <div className="text-gray-600 text-xs">
                      {message.structuredData.data?.supplierId && (
                        <div>供应商ID：{message.structuredData.data.supplierId}</div>
                      )}
                      {message.structuredData.data?.items?.length > 0 && (
                        <div>商品：{message.structuredData.data.items.map((item: any, idx: number) => (
                          <span key={idx} className="inline-block mr-2">
                            {item.productName} × {item.quantity}
                          </span>
                        ))}</div>
                      )}
                    </div>
                    <div className="text-xs text-purple-500 mt-1">点击查看详情 →</div>
                  </div>
                )}
                {message.structuredData.intent === 'create_inbound' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <Package className="w-4 h-4" />
                      <span>创建入库单</span>
                    </div>
                    <div className="text-gray-600 text-xs">
                      {message.structuredData.data?.warehouseId && (
                        <div>仓库ID：{message.structuredData.data.warehouseId}</div>
                      )}
                      {message.structuredData.data?.items?.length > 0 && (
                        <div>商品：{message.structuredData.data.items.map((item: any, idx: number) => (
                          <span key={idx} className="inline-block mr-2">
                            {item.productName} × {item.quantity}
                          </span>
                        ))}</div>
                      )}
                    </div>
                    <div className="text-xs text-purple-500 mt-1">点击查看详情 →</div>
                  </div>
                )}
                {message.structuredData.intent === 'query' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <FileText className="w-4 h-4" />
                      <span>查询结果</span>
                    </div>
                    <div className="text-gray-600 text-xs space-y-0.5">
                      {message.structuredData.data?.type && (
                        <div>类型：{message.structuredData.data.type}</div>
                      )}
                      {message.structuredData.data?.productName && (
                        <div>产品名称：{message.structuredData.data.productName}</div>
                      )}
                      {message.structuredData.data?.spec && (
                        <div>规格：{message.structuredData.data.spec}</div>
                      )}
                      {message.structuredData.data?.packaging && (
                        <div>包装：{message.structuredData.data.packaging}</div>
                      )}
                      {message.structuredData.data?.content && (
                        <div>内容：{message.structuredData.data.content}</div>
                      )}
                      {message.structuredData.data?.results && message.structuredData.data.results.length > 0 && (
                        <div>结果：{message.structuredData.data.results.map((result: any, idx: number) => (
                          <span key={idx} className="inline-block mr-2">
                            {result.title || result.content?.substring(0, 30) || '无标题'}
                          </span>
                        ))}</div>
                      )}
                    </div>
                    <div className="text-xs text-purple-500 mt-1">点击查看详情 →</div>
                  </div>
                )}
              </div>
            )}

            {!message.error && !message.structuredData && message.content.includes('{') && message.content.includes('}') && (
              <pre className="bg-gray-800 text-green-400 p-3 rounded-lg overflow-x-auto text-xs">
                <code>{message.content}</code>
              </pre>
            )}

            {!message.error && !message.structuredData && (!message.content.includes('{') || !message.content.includes('}')) && (
              <div className="whitespace-pre-wrap">
                {message.content.split('\n').map((line, index) => (
                  <p key={index} className="mb-1 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
