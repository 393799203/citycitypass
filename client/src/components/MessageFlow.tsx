import React from 'react';
import { AlertCircle, FileText, ShoppingCart, Package, ClipboardList } from 'lucide-react';

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
  imageUrls?: string[];
  error?: AIErrorInfo;
  structuredData?: AIStructuredData | null;
  confirmed?: boolean;
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
            {message.imageUrls && message.imageUrls.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {message.imageUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt="Message"
                    className="max-h-40 object-contain rounded"
                  />
                ))}
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
                className={`mb-2 p-3 bg-white rounded border border-purple-200 ${message.confirmed ? '' : 'cursor-pointer hover:bg-purple-50 transition-colors'} text-sm`}
                onClick={() => {
                  if (message.confirmed) return;
                  const isQueryWithOptions = message.structuredData?.intent === 'query' && 
                    message.structuredData?.type === 'match_sku' && 
                    message.structuredData?.data?.options;
                  if (!['create_order', 'create_purchase_order', 'create_inbound'].includes(message.structuredData?.intent || '') && !isQueryWithOptions) {
                    return;
                  }
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
                      {message.confirmed && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">已创建</span>}
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
                    {!message.confirmed && <div className="text-xs text-purple-500 mt-1">点击查看详情 →</div>}
                  </div>
                )}
                {message.structuredData.intent === 'create_purchase_order' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <ClipboardList className="w-4 h-4" />
                      <span>创建采购订单</span>
                      {message.confirmed && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">已创建</span>}
                    </div>
                    <div className="text-gray-600 text-xs">
                      {message.structuredData.data?.supplierId && (
                        <div>供应商ID：{message.structuredData.data.supplierId}</div>
                      )}
                      {message.structuredData.data?.items?.length > 0 && (
                        <div>商品：{message.structuredData.data.items.map((item: any, idx: number) => (
                          <span key={idx} className="inline-block mr-2">
                            {item.productName}{item.spec ? ` ${item.spec}` : ''}{item.packaging ? ` ${item.packaging}` : ''} × {item.quantity}
                          </span>
                        ))}</div>
                      )}
                    </div>
                    {!message.confirmed && <div className="text-xs text-purple-500 mt-1">点击查看详情 →</div>}
                  </div>
                )}
                {message.structuredData.intent === 'create_inbound' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <Package className="w-4 h-4" />
                      <span>创建入库单</span>
                      {message.confirmed && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">已创建</span>}
                    </div>
                    <div className="text-gray-600 text-xs">
                      {message.structuredData.data?.warehouseId && (
                        <div>仓库：{message.structuredData.data.warehouseId}</div>
                      )}
                      {message.structuredData.data?.source && (
                        <div>来源：{message.structuredData.data.source}</div>
                      )}
                      {message.structuredData.data?.items?.length > 0 && (
                        <div>商品：{message.structuredData.data.items.map((item: any, idx: number) => (
                          <span key={idx} className="inline-block mr-2">
                            {item.productName}{item.spec ? ` ${item.spec}` : ''}{item.packaging ? ` ${item.packaging}` : ''} × {item.quantity}
                          </span>
                        ))}</div>
                      )}
                    </div>
                    {!message.confirmed && <div className="text-xs text-purple-500 mt-1">点击查看详情 →</div>}
                  </div>
                )}
                {message.structuredData.intent === 'query' && message.structuredData.type === 'batch_inventory' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 font-medium">
                      <Package className="w-4 h-4" />
                      <span>批次库存查询结果</span>
                    </div>
                    <div className="text-xs bg-amber-50 p-2 rounded space-y-1">
                      <div><b>{message.structuredData.data.productName}</b> {message.structuredData.data.spec} {message.structuredData.data.packaging}</div>
                      <div>批次号：{message.structuredData.data.batchNo}</div>
                    </div>
                    <div className="flex gap-4 text-xs bg-amber-50 p-2 rounded">
                      <span>入库：<b className="text-green-600">{message.structuredData.data.totalInbound}</b></span>
                      <span>出库：<b className="text-red-500">{message.structuredData.data.totalOutbound}</b></span>
                      <span>在库：<b className="text-amber-700">{message.structuredData.data.totalInWarehouse}</b></span>
                    </div>
                    {message.structuredData.data?.locations?.length > 0 && (
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-gray-600">库位分布：</div>
                        {message.structuredData.data.locations.map((item: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-amber-300 pl-2 py-1">
                            <div className="text-gray-500">
                              仓库：{item.warehouseName} | 库位：{item.locationCode} | 数量：{item.quantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {message.structuredData.intent === 'query' && message.structuredData.type === 'bundle_inventory' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700 font-medium">
                      <Package className="w-4 h-4" />
                      <span>套装库存查询结果 - {message.structuredData.data.bundleName || message.structuredData.data.productName || ''} {message.structuredData.data.spec || ''}</span>
                    </div>
                    {message.structuredData.data?.summary && (
                      <div className="flex gap-4 text-xs bg-green-50 p-2 rounded">
                        <span>总数量：<b className="text-green-700">{message.structuredData.data.summary.totalQuantity}</b></span>
                        <span>可用：<b className="text-green-600">{message.structuredData.data.summary.availableQuantity}</b></span>
                        <span>锁定：<b className="text-orange-500">{message.structuredData.data.summary.lockedQuantity}</b></span>
                      </div>
                    )}
                    {message.structuredData.data?.details?.length > 0 && (
                      <div className="text-xs space-y-1 max-h-60 overflow-y-auto">
                        {message.structuredData.data.details.map((item: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-green-300 pl-2 py-1">
                            <div className="font-medium text-gray-700">{item.bundleName}</div>
                            <div className="text-gray-500">
                              仓库：{item.warehouseName} | 库位：{item.locationCode} | 批次：{item.batchNo}
                            </div>
                            <div className="text-gray-500">
                              总数：{item.totalQuantity} | 可用：{item.availableQuantity} | 锁定：{item.lockedQuantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {message.structuredData.intent === 'query' && message.structuredData.type === 'match_sku' && message.structuredData.data?.options && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-2">
                    <div className="flex items-center gap-2 text-blue-700 text-xs">
                      <Package className="w-3 h-3" />
                      <span className="font-medium">{message.structuredData.data.productName} {message.structuredData.data.spec} - 找到 {message.structuredData.data.options.length} 种包装</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {message.structuredData.data.options.map((item: any, idx: number) => {
                        const isSelected = message.selectedOption?.skuId === item.skuId;
                        const isDisabled = message.confirmed;
                        return (
                          <div
                            key={idx}
                            className={`rounded p-2 text-xs transition-all ${isSelected ? 'bg-green-100 border border-green-400' : isDisabled ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-white border border-gray-200 hover:border-blue-400 cursor-pointer'}`}
                            onClick={(e) => {
                              if (isDisabled) return;
                              e.stopPropagation();
                              if (typeof window !== 'undefined' && (window as any).selectInventoryOption) {
                                (window as any).selectInventoryOption(item);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                                {item.packaging}
                                {isSelected && ' ✓'}
                              </span>
                              <span className={`font-bold ${isSelected ? 'text-green-600' : 'text-blue-600'}`}>{item.availableQuantity}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {message.structuredData.intent === 'query' && (message.structuredData.type === 'sku_inventory') && message.structuredData.data?.summary && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-700 font-medium">
                      <Package className="w-4 h-4" />
                      <span>SKU库存查询结果 - {message.structuredData.data.productName} {message.structuredData.data.spec} {message.structuredData.data.packaging}</span>
                    </div>
                    {message.structuredData.data?.summary && (
                      <div className="flex gap-4 text-xs bg-blue-50 p-2 rounded">
                        <span>总数量：<b className="text-blue-700">{message.structuredData.data.summary.totalQuantity}</b></span>
                        <span>可用：<b className="text-green-600">{message.structuredData.data.summary.availableQuantity}</b></span>
                        <span>锁定：<b className="text-orange-500">{message.structuredData.data.summary.lockedQuantity}</b></span>
                      </div>
                    )}
                    {message.structuredData.data?.details?.length > 0 && (
                      <div className="text-xs space-y-1 max-h-60 overflow-y-auto">
                        {message.structuredData.data.details.map((item: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-blue-300 pl-2 py-1">
                            <div className="text-gray-500">
                              仓库：{item.warehouseName} | 库位：{item.locationCode} | 批次：{item.batchNo || '-'}
                            </div>
                            <div className="text-gray-500">
                              总数：{item.totalQuantity} | 可用：{item.availableQuantity} | 锁定：{item.lockedQuantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!message.structuredData.data?.details?.length && message.structuredData.data?.summary && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        {message.structuredData.data.productName} {message.structuredData.data.spec} {message.structuredData.data.packaging} 的库存汇总：总数量 {message.structuredData.data.summary.totalQuantity}，可用 {message.structuredData.data.summary.availableQuantity}
                      </div>
                    )}
                  </div>
                )}
                {message.structuredData.intent === 'query' && message.structuredData.type === 'owner_stock_summary' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-indigo-700 font-medium">
                      <Package className="w-4 h-4" />
                      <span>主体库存汇总</span>
                    </div>
                    {message.structuredData.data?.products?.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-600">商品库存：</div>
                        {message.structuredData.data.products.map((item: any, idx: number) => (
                          <div key={`p-${idx}`} className="text-xs border-l-2 border-indigo-300 pl-2 py-1">
                            <div className="font-medium text-gray-700">{item.productName} {item.spec} {item.packaging}</div>
                            <div className="text-gray-500">SKU：{item.skuId} | 可用：{item.totalAvailable}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {message.structuredData.data?.bundles?.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-600">套装库存：</div>
                        {message.structuredData.data.bundles.map((item: any, idx: number) => (
                          <div key={`b-${idx}`} className="text-xs border-l-2 border-indigo-300 pl-2 py-1">
                            <div className="font-medium text-gray-700">{item.bundleName} {item.packaging}</div>
                            <div className="text-gray-500">套装ID：{item.bundleId} | 可用：{item.totalAvailable}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {message.structuredData.intent === 'query' && message.structuredData.type === 'others' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-700 font-medium">
                      <FileText className="w-4 h-4" />
                      <span>知识库回答</span>
                    </div>
                    <div className="text-gray-700 text-sm whitespace-pre-wrap bg-blue-50 p-3 rounded">
                      {message.structuredData.data?.answer || message.structuredData.data?.content || JSON.stringify(message.structuredData.data)}
                    </div>
                  </div>
                )}
                {!['create_order', 'create_purchase_order', 'create_inbound', 'query'].includes(message.structuredData.intent) && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <FileText className="w-4 h-4" />
                      <span>{message.structuredData.intent}</span>
                    </div>
                    <div className="text-gray-600 text-xs space-y-0.5">
                      {typeof message.structuredData.data === 'string' ? (
                        <div className="whitespace-pre-wrap">{message.structuredData.data}</div>
                      ) : (
                        message.structuredData.data && Object.entries(message.structuredData.data).map(([key, value]) => {
                          if (value === null || value === undefined) return null;
                          return (
                            <div key={key} className="flex gap-2 flex-wrap">
                              <span className="font-medium">{key}：</span>
                              <span className="flex-1 break-all">
                                {typeof value === 'object' ? (
                                  Array.isArray(value) ? value.join(', ') : JSON.stringify(value)
                                ) : String(value)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!message.error && !message.structuredData && message.content && (
              <>
                {message.content.includes('{') && message.content.includes('}') ? (
                  <pre className="bg-gray-800 text-green-400 p-3 rounded-lg overflow-x-auto text-xs">
                    <code>{message.content}</code>
                  </pre>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {message.content.split('\n').map((line, index) => (
                      <p key={index} className="mb-1 last:mb-0">{line}</p>
                    ))}
                  </div>
                )}
              </>
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
