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
  type?: string;
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
  selectedOption?: any;
}

interface MessageFlowProps {
  messages: Message[];
}

function ItemsDisplay({ items }: { items: any[] }) {
  if (!items?.length) return null;
  return (
    <div>
      商品：{items.map((item, idx) => (
        <span key={idx} className="inline-block mr-2">
          {item.productName}{item.spec ? ` ${item.spec}` : ''}{item.packaging ? ` ${item.packaging}` : ''} × {item.quantity}
        </span>
      ))}
    </div>
  );
}

function CardHeader({ icon: Icon, title, confirmed, color = 'purple' }: { icon: any; title: string; confirmed?: boolean; color?: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'text-purple-700',
    blue: 'text-blue-700',
    green: 'text-green-700',
    amber: 'text-amber-700',
  };
  return (
    <div className={`flex items-center gap-2 ${colorClasses[color]} font-medium`}>
      <Icon className="w-4 h-4" />
      <span>{title}</span>
      {confirmed && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">已创建</span>}
    </div>
  );
}

function OrderCard({ message }: { message: Message }) {
  const data = message.structuredData?.data;
  return (
    <div className="space-y-1">
      <CardHeader icon={ShoppingCart} title="创建销售订单" confirmed={message.confirmed} />
      <div className="text-gray-600 text-xs space-y-0.5">
        {data?.receiver && <div>客户：{data.receiver}</div>}
        {data?.phone && <div>电话：{data.phone}</div>}
        {(data?.province || data?.city || data?.address) && (
          <div>地址：{[data.province, data.city, data.address].filter(Boolean).join('')}</div>
        )}
        <ItemsDisplay items={data?.items} />
      </div>
      {!message.confirmed && <div className="text-xs text-purple-500 mt-1">点击查看详情 →</div>}
    </div>
  );
}

function PurchaseOrderCard({ message }: { message: Message }) {
  const data = message.structuredData?.data;
  return (
    <div className="space-y-1">
      <CardHeader icon={ClipboardList} title="创建采购订单" confirmed={message.confirmed} />
      <div className="text-gray-600 text-xs space-y-0.5">
        {data?.supplierName && <div>供应商：{data.supplierName}</div>}
        {data?.warehouseName && <div>仓库：{data.warehouseName}</div>}
        {data?.orderDate && <div>订单日期：{data.orderDate}</div>}
        {data?.expectedDate && <div>预期到货：{data.expectedDate}</div>}
        <ItemsDisplay items={data?.items} />
      </div>
      {!message.confirmed && <div className="text-xs text-purple-500 mt-1">点击查看详情 →</div>}
    </div>
  );
}

function InboundCard({ message }: { message: Message }) {
  const data = message.structuredData?.data;
  return (
    <div className="space-y-1">
      <CardHeader icon={Package} title="创建入库单" confirmed={message.confirmed} />
      <div className="text-gray-600 text-xs space-y-0.5">
        {data?.warehouseName && <div>仓库：{data.warehouseName}</div>}
        {data?.source && <div>来源：{data.source}</div>}
        <ItemsDisplay items={data?.items} />
      </div>
      {!message.confirmed && <div className="text-xs text-purple-500 mt-1">点击查看详情 →</div>}
    </div>
  );
}

function BatchInventoryCard({ message }: { message: Message }) {
  const { structuredData } = message;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-amber-700 font-medium">
        <Package className="w-4 h-4" />
        <span>批次库存查询结果</span>
      </div>
      <div className="text-xs bg-amber-50 p-2 rounded space-y-1">
        <div><b>{structuredData.data.productName}</b> {structuredData.data.spec} {structuredData.data.packaging}</div>
        <div>批次号：{structuredData.data.batchNo}</div>
      </div>
      <div className="flex gap-4 text-xs bg-amber-50 p-2 rounded">
        <span>入库：<b className="text-green-600">{structuredData.data.totalInbound}</b></span>
        <span>出库：<b className="text-red-500">{structuredData.data.totalOutbound}</b></span>
        <span>在库：<b className="text-amber-700">{structuredData.data.totalInWarehouse}</b></span>
      </div>
      {structuredData.data?.locations?.length > 0 && (
        <div className="text-xs space-y-1">
          <div className="font-medium text-gray-600">库位分布：</div>
          {structuredData.data.locations.map((item: any, idx: number) => (
            <div key={idx} className="border-l-2 border-amber-300 pl-2 py-1">
              <div className="text-gray-500">
                仓库：{item.warehouseName} | 库位：{item.locationCode} | 数量：{item.quantity}
              </div>
            </div>
          ))}
        </div>
      )}
      {structuredData.data?.stockOuts?.length > 0 && (
        <div className="text-xs space-y-1">
          <div className="font-medium text-gray-600">关联出库订单：</div>
          {structuredData.data.stockOuts.map((item: any, idx: number) => (
            <div key={idx} className="border-l-2 border-red-300 pl-2 py-1">
              <div className="text-gray-500">
                订单号：{item.orderNo} | 客户：{item.customerName} | 数量：{item.quantity} | 时间：{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BundleInventoryCard({ message }: { message: Message }) {
  const { structuredData } = message;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-green-700 font-medium">
        <Package className="w-4 h-4" />
        <span>套装库存查询结果 - {structuredData.data.bundleName || structuredData.data.productName || ''} {structuredData.data.spec || ''}</span>
      </div>
      {structuredData.data?.summary && (
        <div className="flex gap-4 text-xs bg-green-50 p-2 rounded">
          <span>总数量：<b className="text-green-700">{structuredData.data.summary.totalQuantity}</b></span>
          <span>可用：<b className="text-green-600">{structuredData.data.summary.availableQuantity}</b></span>
          <span>锁定：<b className="text-orange-500">{structuredData.data.summary.lockedQuantity}</b></span>
        </div>
      )}
      {structuredData.data?.details?.length > 0 && (
        <div className="text-xs space-y-1 max-h-60 overflow-y-auto">
          {structuredData.data.details.map((item: any, idx: number) => (
            <div key={idx} className="border-l-2 border-green-300 pl-2 py-1">
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
  );
}

function SkuSelectCard({ message }: { message: Message }) {
  const { structuredData } = message;
  const data = structuredData.data;
  const type = structuredData.type;
  const productName = data.productName || data.options?.[0]?.productName || '';
  const spec = data.spec || data.options?.[0]?.spec || '';
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-2">
      <div className="flex items-center gap-2 text-blue-700 text-xs">
        <Package className="w-3 h-3" />
        <span className="font-medium">{productName} {spec} - 找到 {data.options.length} 种SKU</span>
      </div>
      {type === 'create' && data.quantity && (
        <div className="text-xs text-gray-600">
          购买数量：<span className="font-bold text-blue-600">{data.quantity}</span>
        </div>
      )}
      {type === 'purchase' && data.quantity && (
        <div className="text-xs text-gray-600">
          采购数量：<span className="font-bold text-blue-600">{data.quantity}</span>
        </div>
      )}
      {type === 'inbound' && data.quantity && (
        <div className="text-xs text-gray-600">
          入库数量：<span className="font-bold text-blue-600">{data.quantity}</span>
        </div>
      )}
      {type === 'create' && (data.receiver || data.phone) && (
        <div className="text-xs text-gray-600 space-y-0.5">
          {data.receiver && <div>收货人：{data.receiver}</div>}
          {data.phone && <div>电话：{data.phone}</div>}
          {(data.province || data.city || data.address) && (
            <div>地址：{[data.province, data.city, data.address].filter(Boolean).join('')}</div>
          )}
        </div>
      )}
      {type === 'purchase' && data.supplierName && (
        <div className="text-xs text-gray-600">
          供应商：{data.supplierName}
        </div>
      )}
      {type === 'inbound' && data.warehouseName && (
        <div className="text-xs text-gray-600">
          仓库：{data.warehouseName}
        </div>
      )}
      <div className="grid grid-cols-2 gap-1">
        {data.options.map((item: any, idx: number) => {
          const isSelected = message.selectedOption?.skuId === item.skuId;
          const isDisabled = message.confirmed || message.selectedOption;
          return (
            <div
              key={idx}
              className={`rounded p-2 text-xs transition-all ${isSelected ? 'bg-green-100 border border-green-400' : isDisabled ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-white border border-gray-200 hover:border-blue-400 cursor-pointer'}`}
              onClick={(e) => {
                if (isDisabled) return;
                e.stopPropagation();
                if (typeof window !== 'undefined' && (window as any).selectInventoryOption) {
                  (window as any).selectInventoryOption({ 
                    ...item, 
                    type,
                    quantity: data.quantity, 
                    receiver: data.receiver, 
                    phone: data.phone, 
                    province: data.province, 
                    city: data.city, 
                    address: data.address,
                    warehouseId: data.warehouseId,
                    warehouseName: data.warehouseName,
                    supplierId: data.supplierId,
                    supplierName: data.supplierName,
                  });
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                  {item.packaging}
                  {isSelected && ' ✓'}
                </span>
                {item.availableQuantity !== undefined && (
                  <span className={`font-bold ${isSelected ? 'text-green-600' : 'text-blue-600'}`}>
                    {item.availableQuantity}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkuInventoryCard({ message }: { message: Message }) {
  const { structuredData } = message;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-blue-700 font-medium">
        <Package className="w-4 h-4" />
        <span>SKU库存查询结果 - {structuredData.data.productName} {structuredData.data.spec} {structuredData.data.packaging}</span>
      </div>
      {structuredData.data?.summary && (
        <div className="flex gap-4 text-xs bg-blue-50 p-2 rounded">
          <span>总数量：<b className="text-blue-700">{structuredData.data.summary.totalQuantity}</b></span>
          <span>可用：<b className="text-green-600">{structuredData.data.summary.availableQuantity}</b></span>
          <span>锁定：<b className="text-orange-500">{structuredData.data.summary.lockedQuantity}</b></span>
        </div>
      )}
      {structuredData.data?.details?.length > 0 && (
        <div className="text-xs space-y-1 max-h-60 overflow-y-auto">
          {structuredData.data.details.map((item: any, idx: number) => (
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
      {!structuredData.data?.details?.length && structuredData.data?.summary && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          {structuredData.data.productName} {structuredData.data.spec} {structuredData.data.packaging} 的库存汇总：总数量 {structuredData.data.summary.totalQuantity}，可用 {structuredData.data.summary.availableQuantity}
        </div>
      )}
    </div>
  );
}

function OwnerStockSummaryCard({ message }: { message: Message }) {
  const { structuredData } = message;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-indigo-700 font-medium">
        <Package className="w-4 h-4" />
        <span>主体库存汇总</span>
      </div>
      {structuredData.data?.products?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-600">商品库存：</div>
          {structuredData.data.products.map((item: any, idx: number) => (
            <div key={`p-${idx}`} className="text-xs border-l-2 border-indigo-300 pl-2 py-1">
              <div className="font-medium text-gray-700">{item.productName} {item.spec} {item.packaging}</div>
              <div className="text-gray-500">SKU：{item.skuId} | 可用：{item.totalAvailable}</div>
            </div>
          ))}
        </div>
      )}
      {structuredData.data?.bundles?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-600">套装库存：</div>
          {structuredData.data.bundles.map((item: any, idx: number) => (
            <div key={`b-${idx}`} className="text-xs border-l-2 border-indigo-300 pl-2 py-1">
              <div className="font-medium text-gray-700">{item.bundleName} {item.packaging}</div>
              <div className="text-gray-500">套装ID：{item.bundleId} | 可用：{item.totalAvailable}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OthersCard({ message }: { message: Message }) {
  const { structuredData } = message;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-blue-700 font-medium">
        <FileText className="w-4 h-4" />
        <span>知识库回答</span>
      </div>
      <div className="text-gray-700 text-sm whitespace-pre-wrap bg-blue-50 p-3 rounded">
        {structuredData.data?.answer || structuredData.data?.content || JSON.stringify(structuredData.data)}
      </div>
    </div>
  );
}

function FallbackCard({ message }: { message: Message }) {
  const { structuredData } = message;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-purple-700 font-medium">
        <FileText className="w-4 h-4" />
        <span>{structuredData.intent}</span>
      </div>
      <div className="text-gray-600 text-xs space-y-0.5">
        {typeof structuredData.data === 'string' ? (
          <div className="whitespace-pre-wrap">{structuredData.data}</div>
        ) : (
          structuredData.data && Object.entries(structuredData.data).map(([key, value]) => {
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
  );
}

function ErrorDisplay({ message }: { message: Message }) {
  return (
    <div className="flex items-start gap-2">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-medium text-red-700">AI 服务错误</div>
        <div className="text-sm text-red-600 mt-1">
          <div>错误码：{message.error?.code}</div>
          <div className="mt-1">错误信息：{message.error?.message}</div>
          {message.error?.provider && (
            <div className="mt-1">提供商：{message.error.provider}</div>
          )}
          {message.error?.raw && (
            <div className="mt-1 text-xs text-red-400 break-all">
              详情：{message.error.raw}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlainTextDisplay({ content }: { content: string }) {
  if (content.includes('{') && content.includes('}')) {
    return (
      <pre className="bg-gray-800 text-green-400 p-3 rounded-lg overflow-x-auto text-xs">
        <code>{content}</code>
      </pre>
    );
  }
  return (
    <div className="whitespace-pre-wrap">
      {content.split('\n').map((line, index) => (
        <p key={index} className="mb-1 last:mb-0">{line}</p>
      ))}
    </div>
  );
}

function renderStructuredContent(message: Message) {
  const { structuredData } = message;

  if (structuredData?.intent === 'create_order') {
    return <OrderCard message={message} />;
  }

  if (structuredData?.intent === 'create_purchase_order') {
    return <PurchaseOrderCard message={message} />;
  }

  if (structuredData?.intent === 'create_inbound') {
    return <InboundCard message={message} />;
  }

  if (structuredData?.intent === 'match_sku') {
    return <SkuSelectCard message={message} />;
  }

  if (structuredData?.intent === 'query') {
    switch (structuredData.type) {
      case 'batch_inventory':
        return <BatchInventoryCard message={message} />;
      case 'bundle_inventory':
        return <BundleInventoryCard message={message} />;
      case 'sku_inventory':
        return <SkuInventoryCard message={message} />;
      case 'owner_stock_summary':
        return <OwnerStockSummaryCard message={message} />;
      case 'others':
        return <OthersCard message={message} />;
      default:
        return <FallbackCard message={message} />;
    }
  }

  return <FallbackCard message={message} />;
}

function handleStructuredClick(message: Message) {
  if (message.confirmed) return;

  const isMatchSku = message.structuredData?.intent === 'match_sku';

  if (isMatchSku) {
    return;
  }

  if (!['create_order', 'create_purchase_order', 'create_inbound'].includes(message.structuredData?.intent || '')) {
    return;
  }

  if (typeof window !== 'undefined' && (window as any).openAIPanel) {
    (window as any).openAIPanel(message.structuredData);
  }
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

            {message.error && <ErrorDisplay message={message} />}

            {message.structuredData && !message.error && (
              <div
                className={`mb-2 p-3 bg-white rounded border border-purple-200 ${message.confirmed ? '' : 'cursor-pointer hover:bg-purple-50 transition-colors'} text-sm`}
                onClick={() => handleStructuredClick(message)}
              >
                {renderStructuredContent(message)}
              </div>
            )}

            {!message.error && !message.structuredData && message.content && (
              <PlainTextDisplay content={message.content} />
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
