-- 更新系统管理员权限
UPDATE "Role" SET permissions = '{
  "business": {
    "orders": "WRITE", "outbound": "WRITE", "dispatch": "WRITE", "returns": "WRITE",
    "inventory": "WRITE", "batch": "WRITE", "purchases": "WRITE", "inbound": "WRITE",
    "transfer": "WRITE", "transport": "WRITE"
  },
  "config": {
    "warehouses": "WRITE", "products": "WRITE", "customers": "WRITE",
    "suppliers": "WRITE", "carriers": "WRITE"
  },
  "system": {"system": "WRITE"}
}' WHERE code = 'ADMIN';

-- 更新管理员权限
UPDATE "Role" SET permissions = '{
  "business": {
    "orders": "WRITE", "outbound": "WRITE", "dispatch": "WRITE", "returns": "WRITE",
    "inventory": "WRITE", "batch": "WRITE", "purchases": "WRITE", "inbound": "WRITE",
    "transfer": "WRITE", "transport": "WRITE"
  },
  "config": {
    "warehouses": "WRITE", "products": "WRITE", "customers": "WRITE",
    "suppliers": "WRITE", "carriers": "WRITE"
  },
  "system": {"system": "WRITE"}
}' WHERE code = 'MANAGER';

-- 更新仓储管理员权限
UPDATE "Role" SET permissions = '{
  "business": {
    "orders": "READ", "outbound": "WRITE", "dispatch": "READ", "returns": "READ",
    "inventory": "WRITE", "batch": "WRITE", "purchases": "WRITE", "inbound": "WRITE",
    "transfer": "WRITE", "transport": "READ"
  },
  "config": {
    "warehouses": "WRITE", "products": "WRITE", "customers": "READ",
    "suppliers": "WRITE", "carriers": "READ"
  },
  "system": {"system": "NONE"}
}' WHERE code = 'WAREHOUSE_MANAGER';

-- 更新运力管理员权限
UPDATE "Role" SET permissions = '{
  "business": {
    "orders": "READ", "outbound": "READ", "dispatch": "WRITE", "returns": "READ",
    "inventory": "READ", "batch": "READ", "purchases": "READ", "inbound": "READ",
    "transfer": "NONE", "transport": "WRITE"
  },
  "config": {
    "warehouses": "READ", "products": "READ", "customers": "READ",
    "suppliers": "READ", "carriers": "WRITE"
  },
  "system": {"system": "NONE"}
}' WHERE code = 'TRANSPORT_MANAGER';

-- 更新售后管理员权限
UPDATE "Role" SET permissions = '{
  "business": {
    "orders": "READ", "outbound": "READ", "dispatch": "READ", "returns": "WRITE",
    "inventory": "READ", "batch": "READ", "purchases": "READ", "inbound": "READ",
    "transfer": "NONE", "transport": "READ"
  },
  "config": {
    "warehouses": "READ", "products": "READ", "customers": "READ",
    "suppliers": "READ", "carriers": "READ"
  },
  "system": {"system": "NONE"}
}' WHERE code = 'AFTER_SALES_MANAGER';

-- 更新访客权限
UPDATE "Role" SET permissions = '{
  "business": {
    "orders": "READ", "outbound": "READ", "dispatch": "READ", "returns": "READ",
    "inventory": "READ", "batch": "READ", "purchases": "READ", "inbound": "READ",
    "transfer": "READ", "transport": "READ"
  },
  "config": {
    "warehouses": "READ", "products": "READ", "customers": "READ",
    "suppliers": "READ", "carriers": "READ"
  },
  "system": {"system": "NONE"}
}' WHERE code = 'GUEST';
