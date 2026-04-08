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
              <div className="mb-2 p-2 bg-white rounded border border-purple-100">
                {message.structuredData.intent === 'create_order' && (
                  <div className="flex items-center gap-2 text-purple-700 text-sm">
                    <ShoppingCart className="w-4 h-4" />
                    <span>创建销售订单</span>
                    {message.structuredData.data.items?.[0] && (
                      <span className="text-gray-500">
                        - {message.structuredData.data.items[0].productName}
                      </span>
                    )}
                  </div>
                )}
                {message.structuredData.intent === 'create_purchase_order' && (
                  <div className="flex items-center gap-2 text-purple-700 text-sm">
                    <ClipboardList className="w-4 h-4" />
                    <span>创建采购订单</span>
                  </div>
                )}
                {message.structuredData.intent === 'create_inbound' && (
                  <div className="flex items-center gap-2 text-purple-700 text-sm">
                    <Package className="w-4 h-4" />
                    <span>创建入库单</span>
                  </div>
                )}
              </div>
            )}

            {!message.error && (
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
