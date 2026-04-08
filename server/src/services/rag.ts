import { callAI } from '../api/ai';

interface Document {
  id: string;
  content: string;
  keywords: string[];
  metadata: Record<string, any>;
}

interface KnowledgeBase {
  [key: string]: Document[];
}

class RAGService {
  private knowledgeBase: KnowledgeBase = {
    order: [
      {
        id: 'order_001',
        content: '创建订单需要提供：客户信息（名称、地址、联系方式）、商品信息（SKU、数量、单价）、配送地址、配送时间、备注信息。订单状态包括：待确认、已确认、配货中、已发货、已完成、已取消。',
        keywords: ['订单', '创建', '客户', '商品', '配送'],
        metadata: { type: 'order', category: 'operation' }
      },
      {
        id: 'order_002',
        content: '订单查询可以通过订单号、客户名称、配送状态、日期范围等条件进行筛选。订单详情包含：基本信息、商品明细、配送信息、支付信息、操作日志。',
        keywords: ['订单', '查询', '筛选', '订单号', '状态'],
        metadata: { type: 'order', category: 'query' }
      },
      {
        id: 'order_003',
        content: '订单取消规则：未发货订单可随时取消；已发货订单需收货方确认拒收后才能取消；已完成订单不支持取消，可申请退货。取消订单后库存自动回滚。',
        keywords: ['订单', '取消', '退货', '回滚'],
        metadata: { type: 'order', category: 'rule' }
      }
    ],
    inventory: [
      {
        id: 'inv_001',
        content: '库存查询支持按SKU、仓库、批次号、品牌等条件查询。库存数据实时更新，包含：当前库存、安全库存、可用库存、锁定库存、待出库数量。',
        keywords: ['库存', '查询', 'SKU', '仓库', '批次'],
        metadata: { type: 'inventory', category: 'query' }
      },
      {
        id: 'inv_002',
        content: '入库操作流程：1）扫描或输入入库单号；2）选择仓库和库位；3）扫描商品条码；4）确认数量和规格；5）提交入库。入库后库存立即更新。',
        keywords: ['入库', '扫描', '库位', '商品条码', '数量'],
        metadata: { type: 'inventory', category: 'operation' }
      },
      {
        id: 'inv_003',
        content: '出库操作流程：1）查看待出库订单；2）波次拣货；3）扫描校验；4）打包发货。出库后库存自动扣减，支持批量出库和单个出库。',
        keywords: ['出库', '拣货', '波次', '扫描', '打包'],
        metadata: { type: 'inventory', category: 'operation' }
      },
      {
        id: 'inv_004',
        content: '库存预警规则：当库存低于安全库存时系统自动预警。预警级别：黄色（低于安全库存80%）、橙色（低于安全库存50%）、红色（低于或等于0）。',
        keywords: ['库存', '预警', '安全库存', '预警级别'],
        metadata: { type: 'inventory', category: 'rule' }
      }
    ],
    warehouse: [
      {
        id: 'wh_001',
        content: '仓库管理包括：仓库信息维护（名称、地址、负责人）、库位管理（库区、货架、库位编码）、温区设置（常温、冷藏、恒温）。每个仓库可设置多个库位。',
        keywords: ['仓库', '库位', '库区', '货架', '温区'],
        metadata: { type: 'warehouse', category: 'management' }
      },
      {
        id: 'wh_002',
        content: '创建仓库需要提供：仓库名称（必填）、仓库地址（必填）、仓库类型（自有/租赁）、负责人、联系电话、温区类型（常温/冷藏/恒温）、备注信息。',
        keywords: ['仓库', '创建', '名称', '地址', '温区'],
        metadata: { type: 'warehouse', category: 'operation' }
      }
    ],
    supplier: [
      {
        id: 'sup_001',
        content: '创建供应商需要提供：供应商名称（必填）、联系人、联系电话、邮箱、地址、结算方式（现结/月结）、付款周期、税务登记号、开户银行、银行账号等基本信息。',
        keywords: ['供应商', '创建', '联系人', '结算', '付款'],
        metadata: { type: 'supplier', category: 'operation' }
      },
      {
        id: 'sup_002',
        content: '供应商管理包括：供应商档案维护、供货清单管理、结算管理、评价管理。支持按供货商品、结算方式、评价等级筛选供应商。',
        keywords: ['供应商', '管理', '供货', '结算', '评价'],
        metadata: { type: 'supplier', category: 'management' }
      }
    ],
    customer: [
      {
        id: 'cust_001',
        content: '创建客户需要提供：客户名称（必填）、客户类型（个人/企业）、联系人、联系电话、收货地址、发票信息、结算方式、信用额度、客户等级。',
        keywords: ['客户', '创建', '联系人', '地址', '结算'],
        metadata: { type: 'customer', category: 'operation' }
      },
      {
        id: 'cust_002',
        content: '客户等级分为：普通客户、银卡客户、金卡客户、VIP客户。不同等级享有不同折扣政策和付款账期。VIP客户可享受先货后款服务。',
        keywords: ['客户', '等级', '折扣', 'VIP', '账期'],
        metadata: { type: 'customer', category: 'rule' }
      }
    ],
    product: [
      {
        id: 'prod_001',
        content: '创建SKU需要提供：商品名称（必填）、品牌（必填）、规格（容量/尺寸）、包装单位（瓶/箱/盒）、条形码、进货价、零售价、备注信息。',
        keywords: ['SKU', '商品', '创建', '品牌', '规格', '价格'],
        metadata: { type: 'product', category: 'operation' }
      },
      {
        id: 'prod_002',
        content: '商品分类体系：一级分类（如白酒、啤酒、葡萄酒）、二级分类（如酱香型、浓香型）、品牌分类。商品可同时属于多个分类。',
        keywords: ['商品', '分类', '品牌', '白酒', '啤酒'],
        metadata: { type: 'product', category: 'management' }
      },
      {
        id: 'prod_003',
        content: '包装规格说明：瓶装（单瓶销售）、双瓶装（2瓶/组）、箱装（6瓶/12瓶/箱）、礼盒装。不同包装规格对应不同SKU和价格体系。',
        keywords: ['包装', '规格', '瓶', '箱', '礼盒'],
        metadata: { type: 'product', category: 'rule' }
      }
    ],
    vehicle: [
      {
        id: 'veh_001',
        content: '创建车辆需要提供：车牌号（必填）、车辆类型（厢式/板车/冷藏车）、载重吨位、最大装载体积、车辆状态（可用/维修中/停用）、GPS设备号。',
        keywords: ['车辆', '创建', '车牌', '载重', '类型'],
        metadata: { type: 'vehicle', category: 'operation' }
      },
      {
        id: 'veh_002',
        content: '创建司机需要提供：司机姓名（必填）、联系电话（必填）、驾驶证号、准驾车型、所属车队、紧急联系人、紧急联系电话。',
        keywords: ['司机', '创建', '姓名', '驾驶证', '车队'],
        metadata: { type: 'driver', category: 'operation' }
      }
    ],
    carrier: [
      {
        id: 'car_001',
        content: '创建承运商需要提供：承运商名称（必填）、联系人、联系电话、服务区域、结算方式、信誉等级、合作状态、备注信息。',
        keywords: ['承运商', '创建', '联系人', '服务区域', '结算'],
        metadata: { type: 'carrier', category: 'operation' }
      },
      {
        id: 'car_002',
        content: '承运商服务包括：同城配送、跨城配送、冷链配送。配送费用按距离、重量、体积或件数计算。支持实时追踪和配送评价。',
        keywords: ['承运商', '配送', '冷链', '追踪', '费用'],
        metadata: { type: 'carrier', category: 'service' }
      }
    ],
    dispatch: [
      {
        id: 'disp_001',
        content: '配送调度流程：1）接收配送订单；2）智能匹配车辆和司机；3）规划最优路线；4）下发配送任务；5）执行配送；6）确认送达。',
        keywords: ['配送', '调度', '车辆', '司机', '路线'],
        metadata: { type: 'dispatch', category: 'operation' }
      },
      {
        id: 'disp_002',
        content: '波次拣货规则：按仓库、按客户、按配送区域、按商品类别分组生成波次。同批次订单合并拣货，提高拣货效率。',
        keywords: ['波次', '拣货', '仓库', '分组', '效率'],
        metadata: { type: 'dispatch', category: 'rule' }
      }
    ],
    batch: [
      {
        id: 'batch_001',
        content: '批次追踪记录商品从入库到出库的全流程：入库记录（供应商、入库时间、批次号）、库内移动（库位调整）、出库记录（订单、客戶、出库时间）。',
        keywords: ['批次', '追踪', '入库', '出库', '全流程'],
        metadata: { type: 'batch', category: 'tracking' }
      },
      {
        id: 'batch_002',
        content: '批次号规则：入库日期（8位）+ 供应商代码（4位）+ 顺序号（4位）。例如：20260408 + A001 + 0001 = 20260408A0010001。',
        keywords: ['批次', '批次号', '规则', '日期', '供应商'],
        metadata: { type: 'batch', category: 'rule' }
      }
    ],
    format: [
      {
        id: 'fmt_order',
        content: `【销售订单格式】
intent: create_order
type: order

顶层字段：
- ownerId: 货主ID（必填，UUID格式）
- warehouseId: 仓库ID（可选）
- receiver: 收货人姓名（必填）
- phone: 联系电话（必填）
- province: 省份（必填，如：浙江省）
- city: 城市（必填，如：杭州市）
- address: 详细地址（必填，不含省市）
- latitude: 纬度（可选，数字）
- longitude: 经度（可选，数字）

items数组字段：
- skuId: SKU的UUID（可选，如果知道商品对应的SKU ID）
- bundleId: 捆绑包ID（可选，通常为null）
- productName: 商品名称（必填）
- packaging: 包装规格（必填，如："箱(12瓶)"、"瓶装"）
- spec: 容量规格（必填，如："330ml"、"500ml"）
- price: 单价（必填，数字）
- quantity: 数量（必填，数字）

示例：
{"intent":"create_order","type":"order","data":{"ownerId":"xxx货主ID","warehouseId":"","receiver":"张三","phone":"138xxxx","province":"浙江省","city":"杭州市","address":"余杭区xx路xx号","latitude":30.25,"longitude":119.96,"items":[{"productName":"茅台","packaging":"箱(12瓶)","spec":"500ml","price":0,"quantity":1}]}}`,
        keywords: ['销售订单', 'create_order', '订购', '下单', '购买', '格式', 'JSON'],
        metadata: { type: 'format', category: 'order' }
      },
      {
        id: 'fmt_purchase',
        content: `【采购订单格式】
intent: create_purchase_order
type: purchase_order
必需字段: supplierId, items
items数组: [{itemType: "PRODUCT", productName: 商品名称, spec: 规格, quantity: 数量, price: 单价}]
可选字段: warehouseId, orderDate, expectedDate, remark
示例: {"intent":"create_purchase_order","type":"purchase_order","data":{"supplierId":"xxx","items":[{"itemType":"PRODUCT","productName":"茅台","spec":"500ml","quantity":10,"price":0}]}}`,
        keywords: ['采购订单', 'create_purchase_order', '采购', '向供应商', '格式', 'JSON'],
        metadata: { type: 'format', category: 'purchase_order' }
      },
      {
        id: 'fmt_inbound',
        content: `【入库单格式】
intent: create_inbound
type: inbound
必需字段: warehouseId, ownerId, items
items数组: [{productName: 商品名称, spec: 规格, quantity: 数量, batchNo: 批次号(可选), productionDate: 生产日期(可选), expireDate: 过期日期(可选)}]
可选字段: remark
示例: {"intent":"create_inbound","type":"inbound","data":{"warehouseId":"xxx","ownerId":"xxx","items":[{"productName":"茅台","spec":"500ml","quantity":100}],"remark":""}}`,
        keywords: ['入库单', 'create_inbound', '入库', '格式', 'JSON'],
        metadata: { type: 'format', category: 'inbound' }
      },
      {
        id: 'fmt_query',
        content: `【查询格式】
intent: query
必需字段: queryType
可选字段: params.keyword, params.filters
queryType可选值: inventory, order, purchase_order, inbound, warehouse, customer, supplier, vehicle, driver
示例: {"intent":"query","queryType":"inventory","params":{"keyword":"茅台","filters":{}}}`,
        keywords: ['查询', 'query', '搜索', '查找', '格式', 'JSON'],
        metadata: { type: 'format', category: 'query' }
      }
    ]
  };

  private customDocuments: Document[] = [];

  async addDocument(content: string, metadata: Record<string, any>): Promise<string> {
    const id = `custom_${Date.now()}`;
    const keywords = this.extractKeywords(content);
    
    this.customDocuments.push({
      id,
      content,
      keywords,
      metadata
    });
    
    return id;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
    const words = text.match(/[\u4e00-\u9fa5a-zA-Z0-9]+/g) || [];
    return [...new Set(words.filter(w => w.length > 1 && !stopWords.includes(w)))].slice(0, 10);
  }

  private calculateRelevance(doc: Document, query: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    
    let score = 0;
    
    if (doc.keywords.some(k => queryLower.includes(k.toLowerCase()))) {
      score += 10;
    }
    
    if (doc.content.toLowerCase().includes(queryLower)) {
      score += 8;
    }
    
    for (const keyword of doc.keywords) {
      if (queryLower.includes(keyword.toLowerCase())) {
        score += 5;
      }
    }
    
    const contentWords = contentLower.match(/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/g) || [];
    for (const word of contentWords) {
      if (queryLower.includes(word)) {
        score += 1;
      }
    }
    
    return score;
  }

  async query(query: string, topK: number = 3): Promise<Document[]> {
    const allDocuments: Document[] = [];
    
    for (const category of Object.keys(this.knowledgeBase)) {
      allDocuments.push(...this.knowledgeBase[category]);
    }
    allDocuments.push(...this.customDocuments);
    
    const scored = allDocuments.map(doc => ({
      doc,
      score: this.calculateRelevance(doc, query)
    }));
    
    const filtered = scored.filter(s => s.score > 0);
    
    filtered.sort((a, b) => b.score - a.score);
    
    return filtered.slice(0, topK).map(s => s.doc);
  }

  async getRelevantDocuments(query: string, topK: number = 3): Promise<string[]> {
    const relevantDocs = await this.query(query, topK);
    return relevantDocs.map(doc => doc.content);
  }

  async generateResponse(query: string, context: string[] = []): Promise<string> {
    const relevantDocs = await this.getRelevantDocuments(query);
    const augmentedContext = [...context, ...relevantDocs].join('\n\n');
    
    const prompt = `你是一个专业的WMS仓储管理系统助手。基于以下知识库内容回答用户问题。

知识库内容：
${augmentedContext || '知识库中暂无相关内容'}

用户问题：${query}

请根据知识库内容给出准确、专业的回答。如果知识库中没有相关信息，请说明并给出一般性建议。`;

    try {
      const result = await callAI(prompt);
      return result.success && result.data ? result.data : this.getFallbackResponse(query);
    } catch (error) {
      console.error('Generate response error:', error);
      return this.getFallbackResponse(query);
    }
  }

  private getFallbackResponse(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('订单') || lowerQuery.includes('创建订单')) {
      return '创建订单需要提供：客户信息、商品信息（SKU和数量）、配送地址。订单状态包括待确认、已确认、配货中、已发货、已完成。';
    }
    if (lowerQuery.includes('库存') || lowerQuery.includes('查询库存')) {
      return '库存查询支持按SKU、仓库、批次号、品牌等条件查询。库存数据实时更新，包含当前库存、安全库存、可用库存等。';
    }
    if (lowerQuery.includes('入库')) {
      return '入库操作流程：1）扫描或输入入库单号；2）选择仓库和库位；3）扫描商品条码；4）确认数量和规格；5）提交入库。';
    }
    if (lowerQuery.includes('仓库')) {
      return '仓库管理包括：仓库信息维护、库位管理、温区设置。每个仓库可设置多个库位，支持常温、冷藏、恒温等温区。';
    }
    if (lowerQuery.includes('供应商')) {
      return '创建供应商需要提供：供应商名称、联系人、联系电话、地址、结算方式、付款周期等基本信息。';
    }
    if (lowerQuery.includes('客户')) {
      return '创建客户需要提供：客户名称、客户类型、联系人、联系电话、收货地址、发票信息、结算方式等。';
    }
    if (lowerQuery.includes('车辆') || lowerQuery.includes('司机')) {
      return '车辆管理需要提供车牌号、车辆类型、载重吨位等信息。司机管理需要提供姓名、联系电话、驾驶证号等信息。';
    }
    if (lowerQuery.includes('配送') || lowerQuery.includes('调度')) {
      return '配送调度流程：1）接收配送订单；2）智能匹配车辆和司机；3）规划最优路线；4）下发配送任务；5）执行配送；6）确认送达。';
    }
    if (lowerQuery.includes('批次') || lowerQuery.includes('追踪')) {
      return '批次追踪记录商品从入库到出库的全流程，包括入库记录、库内移动、出库记录。批次号包含日期、供应商代码和顺序号。';
    }
    
    return '我理解您的需求。对于WMS仓储管理系统的操作，建议您通过系统的各个功能模块进行操作。如有具体问题，请描述您需要完成的任务。';
  }

  clearDocuments() {
    this.customDocuments = [];
  }

  getDocumentCount(): number {
    let count = 0;
    for (const category of Object.keys(this.knowledgeBase)) {
      count += this.knowledgeBase[category].length;
    }
    return count + this.customDocuments.length;
  }
}

export const ragService = new RAGService();
export default RAGService;