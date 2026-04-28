# ZLAI Shop Client - 用户端前端

这是ZLAI系统的用户端前端项目，提供商品浏览、购物车、下单和支付功能。

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- React Toastify
- Lucide React Icons

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 `http://localhost:3001` 启动。

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
shop-client/
├── src/
│   ├── api/              # API接口
│   │   └── shop.ts       # 购物相关API
│   ├── components/       # 公共组件
│   │   ├── PhoneInput.tsx
│   │   └── RegionPicker.tsx
│   ├── data/             # 静态数据
│   │   └── regions.ts    # 省市区数据
│   ├── pages/            # 页面组件
│   │   ├── Checkout.tsx
│   │   ├── OrderDetail.tsx
│   │   ├── Payment.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── ProductList.tsx
│   │   ├── ShoppingCart.tsx
│   │   └── ShoppingCartPage.tsx
│   ├── App.tsx           # 应用主组件
│   ├── main.tsx          # 应用入口
│   └── index.css         # 全局样式
├── index.html            # HTML模板
├── package.json          # 项目配置
├── vite.config.ts        # Vite配置
├── tsconfig.json         # TypeScript配置
├── tailwind.config.js    # Tailwind配置
└── postcss.config.js     # PostCSS配置
```

## 功能模块

### 1. 商品列表
- 商品展示（支持单品和套装）
- 商品搜索
- 分类筛选
- 购物车快捷入口

### 2. 商品详情
- 商品详细信息
- SKU选择
- 加入购物车
- 飞入动画效果

### 3. 购物车
- 商品列表
- 数量调整
- 删除商品
- 结算

### 4. 结算
- 收货信息填写
- 配送方式选择
- 订单确认

### 5. 支付
- 支付方式选择
- 支付状态显示
- 支付成功后跳转

### 6. 订单详情
- 订单状态
- 商品清单
- 收货信息
- 订单信息

## API代理配置

开发环境下，API请求会被代理到 `http://localhost:3000`。

如需修改代理目标，请编辑 `vite.config.ts`:

```typescript
server: {
  port: 3001,
  proxy: {
    '/api': {
      target: 'http://localhost:3000', // 修改为你的后端地址
      changeOrigin: true,
    },
  },
},
```

## 环境要求

- Node.js >= 16
- npm >= 7

## 注意事项

1. 确保后端服务已启动
2. 首次访问需要通过二维码或带ownerId参数的URL进入
3. 购物车数据存储在localStorage中
4. 支付功能为模拟支付，仅用于演示
