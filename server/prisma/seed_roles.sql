-- 清空现有角色
DELETE FROM "Role";

-- 插入新的6个角色
INSERT INTO "Role" (id, code, name, description, permissions, "isDefault", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'ADMIN',
  '系统管理员',
  '跨所有主体，拥有最高权限，可以看所有主体的数据',
  '{"oms":{"orders":"WRITE","import":"WRITE","export":"WRITE","cancel":"WRITE"},"wms":{"inbound":"WRITE","outbound":"WRITE","inventory":"WRITE","batch":"WRITE","location":"WRITE","adjustment":"WRITE","transfer":"WRITE"},"tms":{"dispatch":"WRITE","vehicle":"WRITE","driver":"WRITE","route":"WRITE","track":"WRITE","report":"WRITE"},"afterSales":{"returns":"WRITE","refund":"WRITE","complaint":"WRITE","statistics":"WRITE"},"system":{"users":"WRITE","roles":"WRITE","owners":"WRITE","parameters":"WRITE","backup":"WRITE","logs":"WRITE"}}',
  false,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'MANAGER',
  '管理员',
  '某主体内的全部权限，只能看自己所属主体的数据',
  '{"oms":{"orders":"WRITE","import":"WRITE","export":"WRITE","cancel":"WRITE"},"wms":{"inbound":"WRITE","outbound":"WRITE","inventory":"WRITE","batch":"WRITE","location":"WRITE","adjustment":"WRITE","transfer":"WRITE"},"tms":{"dispatch":"WRITE","vehicle":"WRITE","driver":"WRITE","route":"WRITE","track":"WRITE","report":"WRITE"},"afterSales":{"returns":"WRITE","refund":"WRITE","complaint":"WRITE","statistics":"WRITE"},"system":{"users":"WRITE","roles":"NONE","owners":"NONE","parameters":"READ","backup":"NONE","logs":"READ"}}',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'WAREHOUSE_MANAGER',
  '仓储管理',
  '负责仓库运营管理，拥有WMS全部功能权限，只能看自己所属主体的数据',
  '{"oms":{"orders":"READ","import":"NONE","export":"READ","cancel":"NONE"},"wms":{"inbound":"WRITE","outbound":"WRITE","inventory":"WRITE","batch":"WRITE","location":"WRITE","adjustment":"WRITE","transfer":"WRITE"},"tms":{"dispatch":"READ","vehicle":"READ","driver":"READ","route":"READ","track":"READ","report":"READ"},"afterSales":{"returns":"READ","refund":"NONE","complaint":"NONE","statistics":"READ"},"system":{"users":"NONE","roles":"NONE","owners":"NONE","parameters":"NONE","backup":"NONE","logs":"READ"}}',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'TRANSPORT_MANAGER',
  '运力管理',
  '负责配送调度管理，拥有TMS全部功能权限，只能看自己所属主体的数据',
  '{"oms":{"orders":"READ","import":"NONE","export":"READ","cancel":"NONE"},"wms":{"inbound":"NONE","outbound":"READ","inventory":"READ","batch":"READ","location":"NONE","adjustment":"NONE","transfer":"NONE"},"tms":{"dispatch":"WRITE","vehicle":"WRITE","driver":"WRITE","route":"WRITE","track":"WRITE","report":"WRITE"},"afterSales":{"returns":"READ","refund":"NONE","complaint":"NONE","statistics":"READ"},"system":{"users":"NONE","roles":"NONE","owners":"NONE","parameters":"NONE","backup":"NONE","logs":"READ"}}',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'AFTER_SALES_MANAGER',
  '售后管理',
  '负责退货和客服管理，拥有售后模块全部权限，只能看自己所属主体的数据',
  '{"oms":{"orders":"READ","import":"NONE","export":"READ","cancel":"NONE"},"wms":{"inbound":"NONE","outbound":"READ","inventory":"READ","batch":"READ","location":"NONE","adjustment":"NONE","transfer":"NONE"},"tms":{"dispatch":"READ","vehicle":"READ","driver":"READ","route":"READ","track":"READ","report":"READ"},"afterSales":{"returns":"WRITE","refund":"WRITE","complaint":"WRITE","statistics":"WRITE"},"system":{"users":"NONE","roles":"NONE","owners":"NONE","parameters":"NONE","backup":"NONE","logs":"READ"}}',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'GUEST',
  '访客',
  '外部人员查看，仅有查看权限，只能看自己所属主体的数据',
  '{"oms":{"orders":"READ","import":"NONE","export":"NONE","cancel":"NONE"},"wms":{"inbound":"READ","outbound":"READ","inventory":"READ","batch":"READ","location":"READ","adjustment":"NONE","transfer":"READ"},"tms":{"dispatch":"READ","vehicle":"READ","driver":"READ","route":"READ","track":"READ","report":"READ"},"afterSales":{"returns":"READ","refund":"NONE","complaint":"NONE","statistics":"READ"},"system":{"users":"NONE","roles":"NONE","owners":"NONE","parameters":"NONE","backup":"NONE","logs":"NONE"}}',
  true,
  NOW(),
  NOW()
);
