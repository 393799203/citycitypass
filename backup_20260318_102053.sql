--
-- PostgreSQL database dump
--

\restrict lLb5FexDgFEYoG2z4zdDhMRtCEgTQeZOtk7IDPfi25Vpj6iDWgIJzTMLDclU1Hj

-- Dumped from database version 18.3 (Homebrew)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: dingyuebo
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO dingyuebo;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: dingyuebo
--

COMMENT ON SCHEMA public IS '';


--
-- Name: DispatchOrderStatus; Type: TYPE; Schema: public; Owner: dingyuebo
--

CREATE TYPE public."DispatchOrderStatus" AS ENUM (
    'PENDING',
    'DELIVERED',
    'SIGNED'
);


ALTER TYPE public."DispatchOrderStatus" OWNER TO dingyuebo;

--
-- Name: DispatchStatus; Type: TYPE; Schema: public; Owner: dingyuebo
--

CREATE TYPE public."DispatchStatus" AS ENUM (
    'PENDING',
    'IN_TRANSIT',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."DispatchStatus" OWNER TO dingyuebo;

--
-- Name: DriverStatus; Type: TYPE; Schema: public; Owner: dingyuebo
--

CREATE TYPE public."DriverStatus" AS ENUM (
    'AVAILABLE',
    'IN_TRANSIT',
    'RESTING',
    'DISABLED'
);


ALTER TYPE public."DriverStatus" OWNER TO dingyuebo;

--
-- Name: LockStatus; Type: TYPE; Schema: public; Owner: dingyuebo
--

CREATE TYPE public."LockStatus" AS ENUM (
    'LOCKED',
    'RELEASED',
    'USED'
);


ALTER TYPE public."LockStatus" OWNER TO dingyuebo;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: dingyuebo
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'PICKING',
    'OUTBOUND_REVIEW',
    'DISPATCHING',
    'DISPATCHED',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED'
);


ALTER TYPE public."OrderStatus" OWNER TO dingyuebo;

--
-- Name: PickStatus; Type: TYPE; Schema: public; Owner: dingyuebo
--

CREATE TYPE public."PickStatus" AS ENUM (
    'PENDING',
    'PICKING',
    'PICKED',
    'PICK_FAILED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."PickStatus" OWNER TO dingyuebo;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: dingyuebo
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'MANAGER',
    'OPERATOR',
    'WAREHOUSE_STAFF',
    'DRIVER',
    'CUSTOMER',
    'OWNER'
);


ALTER TYPE public."UserRole" OWNER TO dingyuebo;

--
-- Name: VehicleStatus; Type: TYPE; Schema: public; Owner: dingyuebo
--

CREATE TYPE public."VehicleStatus" AS ENUM (
    'AVAILABLE',
    'IN_TRANSIT',
    'MAINTENANCE',
    'DISABLED'
);


ALTER TYPE public."VehicleStatus" OWNER TO dingyuebo;

--
-- Name: WarehouseStatus; Type: TYPE; Schema: public; Owner: dingyuebo
--

CREATE TYPE public."WarehouseStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'MAINTENANCE'
);


ALTER TYPE public."WarehouseStatus" OWNER TO dingyuebo;

--
-- Name: WarehouseType; Type: TYPE; Schema: public; Owner: dingyuebo
--

CREATE TYPE public."WarehouseType" AS ENUM (
    'NORMAL',
    'COLD'
);


ALTER TYPE public."WarehouseType" OWNER TO dingyuebo;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Dispatch; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."Dispatch" (
    id text NOT NULL,
    "dispatchNo" text NOT NULL,
    "vehicleId" text NOT NULL,
    "driverId" text NOT NULL,
    "warehouseId" text NOT NULL,
    status public."DispatchStatus" DEFAULT 'PENDING'::public."DispatchStatus" NOT NULL,
    "plannedRoute" jsonb,
    "actualRoute" jsonb,
    "totalDistance" double precision,
    "departureTime" timestamp(3) without time zone,
    "completedTime" timestamp(3) without time zone,
    "orderCount" integer NOT NULL,
    "totalWeight" integer NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Dispatch" OWNER TO dingyuebo;

--
-- Name: DispatchOrder; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."DispatchOrder" (
    id text NOT NULL,
    "dispatchId" text NOT NULL,
    "orderId" text NOT NULL,
    latitude double precision,
    longitude double precision,
    "agentName" text,
    status public."DispatchOrderStatus" DEFAULT 'PENDING'::public."DispatchOrderStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DispatchOrder" OWNER TO dingyuebo;

--
-- Name: Driver; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."Driver" (
    id text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    "licenseNo" text NOT NULL,
    status public."DriverStatus" DEFAULT 'AVAILABLE'::public."DriverStatus" NOT NULL,
    "warehouseId" text NOT NULL,
    "vehicleId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "licenseTypes" text[],
    latitude double precision,
    location text,
    longitude double precision
);


ALTER TABLE public."Driver" OWNER TO dingyuebo;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "orderNo" text NOT NULL,
    "ownerId" text NOT NULL,
    "warehouseId" text NOT NULL,
    receiver text NOT NULL,
    phone text NOT NULL,
    province text NOT NULL,
    city text NOT NULL,
    address text NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Order" OWNER TO dingyuebo;

--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "skuId" text NOT NULL,
    "productName" text NOT NULL,
    packaging text NOT NULL,
    spec text NOT NULL,
    price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OrderItem" OWNER TO dingyuebo;

--
-- Name: Owner; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."Owner" (
    id text NOT NULL,
    name text NOT NULL,
    contact text,
    phone text,
    "productTags" text[],
    "warehouseLocation" text,
    province text,
    city text,
    status text DEFAULT 'SERVING'::text NOT NULL,
    "isSelfOperated" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Owner" OWNER TO dingyuebo;

--
-- Name: PickOrder; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."PickOrder" (
    id text NOT NULL,
    "pickNo" text NOT NULL,
    "orderIds" text NOT NULL,
    status public."PickStatus" DEFAULT 'PENDING'::public."PickStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PickOrder" OWNER TO dingyuebo;

--
-- Name: PickOrderItem; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."PickOrderItem" (
    id text NOT NULL,
    "pickOrderId" text NOT NULL,
    "skuId" text NOT NULL,
    "productName" text NOT NULL,
    packaging text NOT NULL,
    spec text NOT NULL,
    quantity integer NOT NULL,
    "warehouseLocation" text NOT NULL,
    "stockLockId" text
);


ALTER TABLE public."PickOrderItem" OWNER TO dingyuebo;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    "brandId" text NOT NULL,
    "categoryId" text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO dingyuebo;

--
-- Name: ProductBrand; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."ProductBrand" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "categoryId" text NOT NULL,
    "subCategory" text,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductBrand" OWNER TO dingyuebo;

--
-- Name: ProductCategory; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."ProductCategory" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductCategory" OWNER TO dingyuebo;

--
-- Name: ProductSKU; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."ProductSKU" (
    id text NOT NULL,
    "productId" text NOT NULL,
    packaging text NOT NULL,
    spec text NOT NULL,
    price numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductSKU" OWNER TO dingyuebo;

--
-- Name: Shelf; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."Shelf" (
    id text NOT NULL,
    code text NOT NULL,
    type text DEFAULT '1'::text NOT NULL,
    "row" integer NOT NULL,
    "column" integer NOT NULL,
    level integer DEFAULT 5 NOT NULL,
    "warehouseId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Shelf" OWNER TO dingyuebo;

--
-- Name: Stock; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."Stock" (
    id text NOT NULL,
    "skuId" text NOT NULL,
    "warehouseId" text NOT NULL,
    "shelfId" text,
    "totalQuantity" integer DEFAULT 0 NOT NULL,
    "lockedQuantity" integer DEFAULT 0 NOT NULL,
    "availableQuantity" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Stock" OWNER TO dingyuebo;

--
-- Name: StockIn; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."StockIn" (
    id text NOT NULL,
    "stockId" text NOT NULL,
    "skuId" text NOT NULL,
    "warehouseId" text NOT NULL,
    "shelfId" text,
    quantity integer NOT NULL,
    "batchNo" text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    operator text
);


ALTER TABLE public."StockIn" OWNER TO dingyuebo;

--
-- Name: StockLock; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."StockLock" (
    id text NOT NULL,
    "skuId" text NOT NULL,
    "orderId" text NOT NULL,
    "warehouseId" text NOT NULL,
    "shelfId" text,
    quantity integer NOT NULL,
    status public."LockStatus" DEFAULT 'LOCKED'::public."LockStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StockLock" OWNER TO dingyuebo;

--
-- Name: User; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role public."UserRole" NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO dingyuebo;

--
-- Name: Vehicle; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."Vehicle" (
    id text NOT NULL,
    "licensePlate" text NOT NULL,
    "vehicleType" text NOT NULL,
    capacity integer NOT NULL,
    volume integer,
    status public."VehicleStatus" DEFAULT 'AVAILABLE'::public."VehicleStatus" NOT NULL,
    "warehouseId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    latitude double precision,
    location text,
    longitude double precision
);


ALTER TABLE public."Vehicle" OWNER TO dingyuebo;

--
-- Name: Warehouse; Type: TABLE; Schema: public; Owner: dingyuebo
--

CREATE TABLE public."Warehouse" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type public."WarehouseType" DEFAULT 'NORMAL'::public."WarehouseType" NOT NULL,
    status public."WarehouseStatus" DEFAULT 'ACTIVE'::public."WarehouseStatus" NOT NULL,
    province text,
    city text,
    address text,
    latitude double precision,
    longitude double precision,
    "ownerId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Warehouse" OWNER TO dingyuebo;

--
-- Data for Name: Dispatch; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."Dispatch" (id, "dispatchNo", "vehicleId", "driverId", "warehouseId", status, "plannedRoute", "actualRoute", "totalDistance", "departureTime", "completedTime", "orderCount", "totalWeight", remark, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DispatchOrder; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."DispatchOrder" (id, "dispatchId", "orderId", latitude, longitude, "agentName", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Driver; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."Driver" (id, name, phone, "licenseNo", status, "warehouseId", "vehicleId", "createdAt", "updatedAt", "licenseTypes", latitude, location, longitude) FROM stdin;
a765246e-23d0-4747-84c8-fa01793d3c2b	老大	13100131000	4242321331	AVAILABLE	c6a2fddc-feab-40a4-851f-18f54c9548bf	\N	2026-03-18 01:46:34.424	2026-03-18 01:46:34.424	{小面,中面,厢货}	\N	\N	\N
1caed05b-d763-4034-bad5-9f6fab41f189	老二	13200132001	31231231232	AVAILABLE	c6a2fddc-feab-40a4-851f-18f54c9548bf	\N	2026-03-18 01:47:09.651	2026-03-18 01:47:09.651	{中面}	\N	\N	\N
3f52b30b-43a6-471a-b82b-b592248a79e8	老表	13300133000	2313213312	AVAILABLE	d572d888-e807-4dfb-8860-3d62e31945cd	\N	2026-03-18 01:47:29.07	2026-03-18 01:47:29.07	{厢货,小面}	\N	\N	\N
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."Order" (id, "orderNo", "ownerId", "warehouseId", receiver, phone, province, city, address, "totalAmount", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: OrderItem; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."OrderItem" (id, "orderId", "skuId", "productName", packaging, spec, price, quantity, subtotal, "createdAt") FROM stdin;
\.


--
-- Data for Name: Owner; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."Owner" (id, name, contact, phone, "productTags", "warehouseLocation", province, city, status, "isSelfOperated", "createdAt", "updatedAt") FROM stdin;
9485bd0d-06bc-4b10-a147-127164d42e99	城城通官方	城城通	13100131000	{酒类}	雷甸镇	浙江省	湖州	SERVING	t	2026-03-18 01:02:29.174	2026-03-18 01:02:29.174
e8ccff9b-0a18-4468-bb69-594111e8aa29	俞汇酒行	俞汇	13200132000	{白酒}	武康镇	浙江省	湖州	SERVING	f	2026-03-18 01:03:17.652	2026-03-18 01:03:17.652
\.


--
-- Data for Name: PickOrder; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."PickOrder" (id, "pickNo", "orderIds", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PickOrderItem; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."PickOrderItem" (id, "pickOrderId", "skuId", "productName", packaging, spec, quantity, "warehouseLocation", "stockLockId") FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."Product" (id, name, "brandId", "categoryId", status, "createdAt", "updatedAt") FROM stdin;
a8458169-2d31-48bf-8d5c-7782eeb4d055	飞天茅台	f89239b4-56c0-42ad-afe7-6396693f19c2	a607f924-e939-4537-9bbf-0bc5169d89c2	ACTIVE	2026-03-18 02:05:36.878	2026-03-18 02:05:36.878
77854c65-a19d-473a-aba8-ea910ed7b67d	青岛纯生	b7ecf261-2509-44cb-88e3-c4ceb272f85c	a886c5bf-acc7-43c2-8f34-a2d717195416	ACTIVE	2026-03-18 02:06:01.957	2026-03-18 02:06:01.957
2d2e1c56-bc66-4892-b786-41e2e4b368d6	XO	97f3cda8-01fb-4554-8a94-e2173e792344	f3a0c55b-906f-4195-8250-2656372962d0	ACTIVE	2026-03-18 02:06:31.817	2026-03-18 02:06:31.817
e319182b-a8b0-481b-9015-940867fd4df8	干红	2ede4723-8bd9-4e3e-907e-bd17000a39a6	5032eb64-c261-4663-b080-158ebd021f2b	ACTIVE	2026-03-18 02:06:53.973	2026-03-18 02:07:10.918
\.


--
-- Data for Name: ProductBrand; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."ProductBrand" (id, code, name, "categoryId", "subCategory", description, "createdAt", "updatedAt") FROM stdin;
f89239b4-56c0-42ad-afe7-6396693f19c2	MAOTAI	茅台	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.65	2026-03-18 01:27:00.65
9beb8743-54a5-4bf2-8549-86962822a16c	WULIANGYE	五粮液	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.652	2026-03-18 01:27:00.652
99c9555d-1d6c-4cc7-b50e-4c97a1004fcd	LUZHOULAOJIAO	泸州老窖	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.653	2026-03-18 01:27:00.653
6e8bbce1-c9a1-467e-8a49-168288858663	YANGHE	洋河	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.655	2026-03-18 01:27:00.655
f0df860a-9f39-4143-aea7-5fa5c5959ad3	FENJIU	汾酒	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.656	2026-03-18 01:27:00.656
50d023de-098c-4962-b23a-9342aa163a65	LANGJIU	郎酒	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.657	2026-03-18 01:27:00.657
bd24aa47-8c30-473d-9118-f5443342abc1	XIJIU	习酒	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.659	2026-03-18 01:27:00.659
816a3133-6a71-46bf-bb1b-bd30c370547f	GUJINGGONGJIU	古井贡酒	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.66	2026-03-18 01:27:00.66
c22d38ee-eb52-458e-a65f-a0bbc566f477	JIANNANCHUN	剑南春	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.661	2026-03-18 01:27:00.661
317556ec-e952-498c-8e8d-b4a7e3f6ac3d	SHEDE	舍得	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.662	2026-03-18 01:27:00.662
0b50e0e7-e465-4365-b0cf-617620973168	SHUIJINGFANG	水井坊	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.663	2026-03-18 01:27:00.663
f96bc252-de08-4ae2-9b88-7e262cb98cf9	XIFENGJIU	西凤酒	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.665	2026-03-18 01:27:00.665
16c307f6-6779-42f6-b0fc-7f7abcb8ecf7	JIUGUIJIU	酒鬼酒	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.666	2026-03-18 01:27:00.666
e27a6141-425a-471f-832b-9f21152d4d71	KOUZIJIAO	口子窖	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.667	2026-03-18 01:27:00.667
74d15438-0508-494f-8766-e9baa4038a72	JINSHIYUAN	今世缘	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.668	2026-03-18 01:27:00.668
295556ac-d245-4195-a160-a34dd3e6459f	YINGJIAGONGJIU	迎驾贡酒	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.668	2026-03-18 01:27:00.668
826c5dbb-24dd-44dd-acbc-9b6a3fd97b16	JINZHONGZIJIU	金种子酒	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.669	2026-03-18 01:27:00.669
a2da3625-938c-47a3-a5fe-84fed11c4a7b	DONGJIU	董酒	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.67	2026-03-18 01:27:00.67
fcd36004-c40f-4624-b41b-4a266d2077bb	LAIMAO	赖茅	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.671	2026-03-18 01:27:00.671
888f117d-4cb4-4d82-b380-0b88778506da	ZHENJIU	珍酒	a607f924-e939-4537-9bbf-0bc5169d89c2	\N	\N	2026-03-18 01:27:00.672	2026-03-18 01:27:00.672
b7ecf261-2509-44cb-88e3-c4ceb272f85c	QINGDAO	青岛啤酒	a886c5bf-acc7-43c2-8f34-a2d717195416	国产头部	\N	2026-03-18 01:27:00.674	2026-03-18 01:27:00.674
3f981740-ec70-437d-81f8-fd962f6a9e14	XUEHUA	雪花啤酒	a886c5bf-acc7-43c2-8f34-a2d717195416	国产头部	\N	2026-03-18 01:27:00.675	2026-03-18 01:27:00.675
9e1d6be7-b516-4364-8684-95791741b0f1	YANJING	燕京啤酒	a886c5bf-acc7-43c2-8f34-a2d717195416	国产头部	\N	2026-03-18 01:27:00.675	2026-03-18 01:27:00.675
37c828ca-67e9-466c-b498-b124dafd67f5	BUDWEISER_CN	百威啤酒（中国）	a886c5bf-acc7-43c2-8f34-a2d717195416	国产头部	\N	2026-03-18 01:27:00.676	2026-03-18 01:27:00.676
010cf97e-561a-4160-9e11-3a387792ba1e	ZHUJIANG	珠江啤酒	a886c5bf-acc7-43c2-8f34-a2d717195416	国产头部	\N	2026-03-18 01:27:00.677	2026-03-18 01:27:00.677
3419dfa9-1f66-412a-a90d-6dabece259ec	HAERBIN	哈尔滨啤酒	a886c5bf-acc7-43c2-8f34-a2d717195416	国产头部	\N	2026-03-18 01:27:00.678	2026-03-18 01:27:00.678
c545f560-ecf8-4133-94bd-267d050a1081	SHANCHENG	山城啤酒	a886c5bf-acc7-43c2-8f34-a2d717195416	国产头部	\N	2026-03-18 01:27:00.68	2026-03-18 01:27:00.68
c8f518fc-73dd-4034-836d-a7bd99b92a92	JINXING	金星啤酒	a886c5bf-acc7-43c2-8f34-a2d717195416	国产头部	\N	2026-03-18 01:27:00.681	2026-03-18 01:27:00.681
57dcf1fc-646d-4821-bdbc-a608dc7a9346	JINWEI	金威啤酒	a886c5bf-acc7-43c2-8f34-a2d717195416	国产头部	\N	2026-03-18 01:27:00.682	2026-03-18 01:27:00.682
61840330-fa89-4aca-9a3d-945787427d68	LAOSHAN	崂山啤酒	a886c5bf-acc7-43c2-8f34-a2d717195416	国产头部	\N	2026-03-18 01:27:00.683	2026-03-18 01:27:00.683
f19841cf-5629-491e-8a47-04d5d951b071	HEINEKEN	喜力	a886c5bf-acc7-43c2-8f34-a2d717195416	进口主流	\N	2026-03-18 01:27:00.684	2026-03-18 01:27:00.684
1b9caf95-3ec9-498a-a875-d38db03e5603	CORONA	科罗娜	a886c5bf-acc7-43c2-8f34-a2d717195416	进口主流	\N	2026-03-18 01:27:00.685	2026-03-18 01:27:00.685
f3580560-9f9f-4aae-a7b2-5ef7c6266265	CARLSBERG	嘉士伯	a886c5bf-acc7-43c2-8f34-a2d717195416	进口主流	\N	2026-03-18 01:27:00.686	2026-03-18 01:27:00.686
ed7d1ecf-d344-43ac-93df-68cbdc4e1b5c	HOEGAARDEN	福佳白	a886c5bf-acc7-43c2-8f34-a2d717195416	进口主流	\N	2026-03-18 01:27:00.687	2026-03-18 01:27:00.687
e601539f-1440-4773-9845-8aef2e420b8f	BRIGITTE	教士啤酒	a886c5bf-acc7-43c2-8f34-a2d717195416	进口主流	\N	2026-03-18 01:27:00.688	2026-03-18 01:27:00.688
e5afa998-981a-4c22-aa62-2f9f1ae76c8e	百威（进	百威（进口）	a886c5bf-acc7-43c2-8f34-a2d717195416	进口主流	\N	2026-03-18 01:27:00.689	2026-03-18 01:27:00.689
a230b0a4-e383-470a-9ee0-ac9c7d611866	GUINNESS	健力士	a886c5bf-acc7-43c2-8f34-a2d717195416	进口主流	\N	2026-03-18 01:27:00.69	2026-03-18 01:27:00.69
1f4dee4c-e23b-4110-b830-28ba40311ba8	TUBORG	乐堡	a886c5bf-acc7-43c2-8f34-a2d717195416	进口主流	\N	2026-03-18 01:27:00.691	2026-03-18 01:27:00.691
0a59e819-c191-4339-8bb1-ef4ce38727df	OETTINGER	奥丁格	a886c5bf-acc7-43c2-8f34-a2d717195416	进口主流	\N	2026-03-18 01:27:00.692	2026-03-18 01:27:00.692
e65bd86b-98b4-499b-a7f5-57113bd8ed8e	PAULANER	柏龙	a886c5bf-acc7-43c2-8f34-a2d717195416	进口主流	\N	2026-03-18 01:27:00.693	2026-03-18 01:27:00.693
4e4bc83f-57fb-4ab4-bd5b-f34efcb32dd7	JOHNNIE_WALKER	尊尼获加	f3a0c55b-906f-4195-8250-2656372962d0	威士忌	\N	2026-03-18 01:27:00.695	2026-03-18 01:27:00.695
b1f6df8f-6c93-4c7d-9187-c87bb49c8dc8	CHIVAS	芝华士	f3a0c55b-906f-4195-8250-2656372962d0	威士忌	\N	2026-03-18 01:27:00.696	2026-03-18 01:27:00.696
4e0d103f-8b14-433c-9573-f2ed3ea74090	JACK_DANIELS	杰克丹尼	f3a0c55b-906f-4195-8250-2656372962d0	威士忌	\N	2026-03-18 01:27:00.697	2026-03-18 01:27:00.697
e508b17f-2f32-46bc-bf72-fd22fda4f99f	BALLANTINES	百龄坛	f3a0c55b-906f-4195-8250-2656372962d0	威士忌	\N	2026-03-18 01:27:00.698	2026-03-18 01:27:00.698
edef1d87-c5f3-486b-9ccc-9129baebba60	MACALLAN	麦卡伦	f3a0c55b-906f-4195-8250-2656372962d0	威士忌	\N	2026-03-18 01:27:00.699	2026-03-18 01:27:00.699
bcba1de0-8602-4666-929b-88f60a348365	GLENFIDDICH	格兰菲迪	f3a0c55b-906f-4195-8250-2656372962d0	威士忌	\N	2026-03-18 01:27:00.7	2026-03-18 01:27:00.7
42982b8f-8016-4d01-bb04-79e957ed9ae8	YAMAZAKI	山崎	f3a0c55b-906f-4195-8250-2656372962d0	威士忌	\N	2026-03-18 01:27:00.701	2026-03-18 01:27:00.701
e937e369-5ed8-475d-b544-9aea51d886ab	HAKUSHU	白州	f3a0c55b-906f-4195-8250-2656372962d0	威士忌	\N	2026-03-18 01:27:00.702	2026-03-18 01:27:00.702
01b1d8f2-e853-4175-b8b2-b2a46828b358	HIBIKI	响	f3a0c55b-906f-4195-8250-2656372962d0	威士忌	\N	2026-03-18 01:27:00.703	2026-03-18 01:27:00.703
8d2c7bb3-8469-4c14-b210-30e017b8ee79	JIM_BEAN	占边	f3a0c55b-906f-4195-8250-2656372962d0	威士忌	\N	2026-03-18 01:27:00.704	2026-03-18 01:27:00.704
30206272-b505-4756-abd9-7f369d79e2a6	HENNESSY	轩尼诗	f3a0c55b-906f-4195-8250-2656372962d0	白兰地	\N	2026-03-18 01:27:00.705	2026-03-18 01:27:00.705
3667f464-622c-469f-af2f-e48b598dda2f	REMY_MARTIN	人头马	f3a0c55b-906f-4195-8250-2656372962d0	白兰地	\N	2026-03-18 01:27:00.706	2026-03-18 01:27:00.706
af32b0ca-bcac-4f9f-b8f8-064a2b09869a	MARTELL	马爹利	f3a0c55b-906f-4195-8250-2656372962d0	白兰地	\N	2026-03-18 01:27:00.706	2026-03-18 01:27:00.706
97f3cda8-01fb-4554-8a94-e2173e792344	COURVOISIER	拿破仑	f3a0c55b-906f-4195-8250-2656372962d0	白兰地	\N	2026-03-18 01:27:00.707	2026-03-18 01:27:00.707
13e9e101-5629-4586-aaaa-e16f38587862	ZHANGYUKAYA	张裕可雅	f3a0c55b-906f-4195-8250-2656372962d0	白兰地	\N	2026-03-18 01:27:00.708	2026-03-18 01:27:00.708
4118e50b-f3f6-486a-a44b-a13340dbc2b9	CAMUS	卡慕	f3a0c55b-906f-4195-8250-2656372962d0	白兰地	\N	2026-03-18 01:27:00.709	2026-03-18 01:27:00.709
1adef4f8-9c66-48ee-a349-c161e6ab95aa	ABSOLUT	绝对伏特加	f3a0c55b-906f-4195-8250-2656372962d0	伏特加	\N	2026-03-18 01:27:00.71	2026-03-18 01:27:00.71
41f26ccd-5441-46fb-a9e8-709cb1a398b9	SMIRNOFF	斯米诺	f3a0c55b-906f-4195-8250-2656372962d0	伏特加	\N	2026-03-18 01:27:00.711	2026-03-18 01:27:00.711
f6bb008d-89d8-4a21-b824-7d4be256ffa2	GREY_GOOSE	灰雁	f3a0c55b-906f-4195-8250-2656372962d0	伏特加	\N	2026-03-18 01:27:00.712	2026-03-18 01:27:00.712
d285e9f0-a37f-4fa9-b0aa-45b4fb8b96d4	SKYY	深蓝伏特加	f3a0c55b-906f-4195-8250-2656372962d0	伏特加	\N	2026-03-18 01:27:00.713	2026-03-18 01:27:00.713
0e9b587a-2d0b-49f7-9c6b-5b0c15400640	BELVEDERE	雪树伏特加	f3a0c55b-906f-4195-8250-2656372962d0	伏特加	\N	2026-03-18 01:27:00.714	2026-03-18 01:27:00.714
d5a5bd19-a90c-4f59-a483-395636c202d4	BACARDI	百加得	f3a0c55b-906f-4195-8250-2656372962d0	朗姆酒	\N	2026-03-18 01:27:00.715	2026-03-18 01:27:00.715
db0613a2-46cd-4cf5-9d02-774a51f01f8a	CAPTAIN_MORGAN	摩根船长	f3a0c55b-906f-4195-8250-2656372962d0	朗姆酒	\N	2026-03-18 01:27:00.716	2026-03-18 01:27:00.716
929a702b-2147-468c-9827-dfd019431e33	HAVANA_CLUB	哈瓦那俱乐部	f3a0c55b-906f-4195-8250-2656372962d0	朗姆酒	\N	2026-03-18 01:27:00.716	2026-03-18 01:27:00.716
ac67d10c-1294-4cbb-9a73-cdd5e0054b87	MYERS	美雅士	f3a0c55b-906f-4195-8250-2656372962d0	朗姆酒	\N	2026-03-18 01:27:00.717	2026-03-18 01:27:00.717
2da895a1-66db-4b81-bae4-0b64cc11bc6b	GORDON	哥顿金酒	f3a0c55b-906f-4195-8250-2656372962d0	金酒	\N	2026-03-18 01:27:00.718	2026-03-18 01:27:00.718
2fcd9633-d310-4e6c-a975-1c3a6b5488db	TANQUERAY	添加利	f3a0c55b-906f-4195-8250-2656372962d0	金酒	\N	2026-03-18 01:27:00.719	2026-03-18 01:27:00.719
b21aae89-ec63-4813-b899-c85187106ba6	BEEFEATER	必富达	f3a0c55b-906f-4195-8250-2656372962d0	金酒	\N	2026-03-18 01:27:00.72	2026-03-18 01:27:00.72
ee3e6272-fbaa-42c0-a11e-9c69fe639547	BOMBAY	孟买蓝宝石	f3a0c55b-906f-4195-8250-2656372962d0	金酒	\N	2026-03-18 01:27:00.721	2026-03-18 01:27:00.721
1165ce2c-dd2c-4be5-8ffa-ecc3c901c27b	BAILEYS	百利甜	f3a0c55b-906f-4195-8250-2656372962d0	利口酒	\N	2026-03-18 01:27:00.721	2026-03-18 01:27:00.721
2907e0e3-ea3c-4e10-8a51-31ed181a2cec	COINTREAU	君度	f3a0c55b-906f-4195-8250-2656372962d0	利口酒	\N	2026-03-18 01:27:00.722	2026-03-18 01:27:00.722
1c4da70c-c0c5-484a-bb0b-c801432a71f7	JAGERMEISTER	野格	f3a0c55b-906f-4195-8250-2656372962d0	利口酒	\N	2026-03-18 01:27:00.723	2026-03-18 01:27:00.723
ae30536d-29bc-408a-9c58-cedb3f8d1b8e	KAHLUA	甘露咖啡	f3a0c55b-906f-4195-8250-2656372962d0	利口酒	\N	2026-03-18 01:27:00.724	2026-03-18 01:27:00.724
d9be1b90-4353-4ac0-a108-2f017e9259b5	CHANGYU	张裕	5032eb64-c261-4663-b080-158ebd021f2b	国产葡萄酒	\N	2026-03-18 01:27:00.725	2026-03-18 01:27:00.725
2ede4723-8bd9-4e3e-907e-bd17000a39a6	CHANGCHENG	长城	5032eb64-c261-4663-b080-158ebd021f2b	国产葡萄酒	\N	2026-03-18 01:27:00.726	2026-03-18 01:27:00.726
0dcf77ca-cdec-45c7-8e4f-d424eff6b59c	WANGCHAO	王朝	5032eb64-c261-4663-b080-158ebd021f2b	国产葡萄酒	\N	2026-03-18 01:27:00.727	2026-03-18 01:27:00.727
c2762d99-660f-4aa4-a383-d292d8cf6589	WEILONG	威龙	5032eb64-c261-4663-b080-158ebd021f2b	国产葡萄酒	\N	2026-03-18 01:27:00.728	2026-03-18 01:27:00.728
a40b53fd-1c49-4729-9355-7d5979ca707f	MOGAO	莫高	5032eb64-c261-4663-b080-158ebd021f2b	国产葡萄酒	\N	2026-03-18 01:27:00.729	2026-03-18 01:27:00.729
30d5dcf5-94b3-4efe-a23d-5420f7e3dd48	HELANSHAN	贺兰山	5032eb64-c261-4663-b080-158ebd021f2b	国产葡萄酒	\N	2026-03-18 01:27:00.731	2026-03-18 01:27:00.731
a2c6cd98-b3a8-486e-bfe4-73773f4da3f3	YIGARDEN	怡园酒庄	5032eb64-c261-4663-b080-158ebd021f2b	国产葡萄酒	\N	2026-03-18 01:27:00.732	2026-03-18 01:27:00.732
750a582d-1b09-43a7-bff9-d7d3b3d34791	LONGHUI	龙徽	5032eb64-c261-4663-b080-158ebd021f2b	国产葡萄酒	\N	2026-03-18 01:27:00.733	2026-03-18 01:27:00.733
bb3e0515-934a-44bc-9ed3-e224dd85553a	SHANGRI_LA	香格里拉	5032eb64-c261-4663-b080-158ebd021f2b	国产葡萄酒	\N	2026-03-18 01:27:00.733	2026-03-18 01:27:00.733
f43785e7-0713-4879-9f87-6007389b7721	LAFITE	拉菲	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.734	2026-03-18 01:27:00.734
be4d0dff-8fd8-4033-b30b-4f26ff4d631d	LATOUR	拉图	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.735	2026-03-18 01:27:00.735
ddfe518c-7987-4eb2-9a24-3d85ac622012	MOUTON	木桐	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.736	2026-03-18 01:27:00.736
06c359a2-70b3-42c1-847b-110adbc7f7ac	MARGOUX	玛歌	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.737	2026-03-18 01:27:00.737
52a0af7c-fe9e-4aa9-b5e8-e69a8bf7d1eb	HAUTBRION	侯伯王	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.738	2026-03-18 01:27:00.738
7dd377f3-263f-48a3-97a2-d92ec442768f	PENFOLDS	奔富	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.739	2026-03-18 01:27:00.739
a580c7f4-3a20-4e08-80c6-39860845e9e8	JACOB	杰卡斯	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.74	2026-03-18 01:27:00.74
d6538c15-2b75-4c58-998f-5566c3fc979b	YELLOW_TAIL	黄尾袋鼠	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.741	2026-03-18 01:27:00.741
50a19a8e-3bf9-4302-91eb-08d695cf1d23	CONCHA_Y_TORO	干露	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.742	2026-03-18 01:27:00.742
267d5dca-e71b-41af-98e8-906e3ff3e8f4	TORRES	桃乐丝	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.743	2026-03-18 01:27:00.743
cee290d2-0627-480e-9fe0-409100e3d457	CASTEL	卡思黛乐	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.744	2026-03-18 01:27:00.744
2f7d3788-2b61-444c-9801-16d215da9c87	MONTES	蒙特斯	5032eb64-c261-4663-b080-158ebd021f2b	进口葡萄酒	\N	2026-03-18 01:27:00.744	2026-03-18 01:27:00.744
\.


--
-- Data for Name: ProductCategory; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."ProductCategory" (id, code, name, "sortOrder", "createdAt", "updatedAt") FROM stdin;
a607f924-e939-4537-9bbf-0bc5169d89c2	BAIJIU	白酒	-1	2026-03-18 01:27:00.648	2026-03-18 01:27:00.648
a886c5bf-acc7-43c2-8f34-a2d717195416	PIJIU	啤酒	-1	2026-03-18 01:27:00.673	2026-03-18 01:27:00.673
f3a0c55b-906f-4195-8250-2656372962d0	YANGJIU	洋酒	-1	2026-03-18 01:27:00.694	2026-03-18 01:27:00.694
5032eb64-c261-4663-b080-158ebd021f2b	PUTAOJIU	葡萄酒	-1	2026-03-18 01:27:00.725	2026-03-18 01:27:00.725
\.


--
-- Data for Name: ProductSKU; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."ProductSKU" (id, "productId", packaging, spec, price, "createdAt", "updatedAt") FROM stdin;
e50e0619-da9e-4c01-961c-081efdea7d67	a8458169-2d31-48bf-8d5c-7782eeb4d055	单瓶	500ml	1499.00	2026-03-18 02:05:36.878	2026-03-18 02:05:36.878
69407edb-65a3-4c7e-ab39-623184cb1336	a8458169-2d31-48bf-8d5c-7782eeb4d055	箱(6瓶)	500ml	8994.00	2026-03-18 02:05:36.878	2026-03-18 02:05:36.878
9e5f8f4e-6fab-47ef-8076-5bfc661d1880	77854c65-a19d-473a-aba8-ea910ed7b67d	箱(12瓶)	250ml	45.00	2026-03-18 02:06:01.957	2026-03-18 02:06:01.957
775d14e1-e629-466b-ba45-e3306ab85d35	2d2e1c56-bc66-4892-b786-41e2e4b368d6	单瓶	1L	1999.00	2026-03-18 02:06:31.817	2026-03-18 02:06:31.817
9abbcce1-e400-4f57-88ee-6642c598f330	e319182b-a8b0-481b-9015-940867fd4df8	双瓶	500ml	149.00	2026-03-18 02:06:53.973	2026-03-18 02:07:10.918
7a15a0ec-a2dd-450e-8e0a-dd1700c5bddc	e319182b-a8b0-481b-9015-940867fd4df8	单瓶	500ml	79.00	2026-03-18 02:07:10.918	2026-03-18 02:07:10.918
\.


--
-- Data for Name: Shelf; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."Shelf" (id, code, type, "row", "column", level, "warehouseId", "createdAt", "updatedAt") FROM stdin;
aff41c99-5880-4a63-ac4b-af8feea5cef5	HZ1-011	2	1	1	5	c6a2fddc-feab-40a4-851f-18f54c9548bf	2026-03-18 01:07:07.477	2026-03-18 01:07:07.477
472399c9-146a-41f3-ae34-aa7cd65715e7	HZ1-012	2	1	2	5	c6a2fddc-feab-40a4-851f-18f54c9548bf	2026-03-18 01:07:12.379	2026-03-18 01:07:12.379
681774ea-2fdf-4cad-a30f-5a8be0f5e3a3	HZ1-013	2	1	3	5	c6a2fddc-feab-40a4-851f-18f54c9548bf	2026-03-18 01:07:15.979	2026-03-18 01:07:15.979
965ba0dc-3858-4f60-a846-44b2f859c423	HZ1-014	2	1	4	5	c6a2fddc-feab-40a4-851f-18f54c9548bf	2026-03-18 01:07:20.023	2026-03-18 01:07:20.023
d08a588a-3739-4c0c-bdbe-8b3a05bb819a	HZ1-015	2	1	5	5	c6a2fddc-feab-40a4-851f-18f54c9548bf	2026-03-18 01:07:24.431	2026-03-18 01:07:24.431
64767f18-a6ec-4f74-9fee-08cf49f59ca5	WK1-011	2	1	1	5	d572d888-e807-4dfb-8860-3d62e31945cd	2026-03-18 01:07:33.342	2026-03-18 01:07:33.342
fa5d2697-f3ca-4a23-a490-f41fb4d06096	WK1-012	2	1	2	5	d572d888-e807-4dfb-8860-3d62e31945cd	2026-03-18 01:07:37.861	2026-03-18 01:07:37.861
76abfedd-cb88-4e01-a8ed-b769d9cc53d1	WK1-013	2	1	3	5	d572d888-e807-4dfb-8860-3d62e31945cd	2026-03-18 01:07:41.405	2026-03-18 01:07:41.405
\.


--
-- Data for Name: Stock; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."Stock" (id, "skuId", "warehouseId", "shelfId", "totalQuantity", "lockedQuantity", "availableQuantity", "createdAt", "updatedAt") FROM stdin;
4431c82b-282f-4ae7-a3c5-f5134a176019	e50e0619-da9e-4c01-961c-081efdea7d67	c6a2fddc-feab-40a4-851f-18f54c9548bf	aff41c99-5880-4a63-ac4b-af8feea5cef5	16	0	16	2026-03-18 02:10:03.299	2026-03-18 02:10:03.299
0fe2128f-2d48-4680-b84d-42e52046567b	69407edb-65a3-4c7e-ab39-623184cb1336	c6a2fddc-feab-40a4-851f-18f54c9548bf	472399c9-146a-41f3-ae34-aa7cd65715e7	10	0	10	2026-03-18 02:10:41.149	2026-03-18 02:10:41.149
03e871a4-4e4f-4de2-8715-1a747b4ad194	9e5f8f4e-6fab-47ef-8076-5bfc661d1880	d572d888-e807-4dfb-8860-3d62e31945cd	64767f18-a6ec-4f74-9fee-08cf49f59ca5	18	0	18	2026-03-18 02:11:03.556	2026-03-18 02:11:03.556
5aa315e0-addf-42a4-b75f-5012c368b72f	775d14e1-e629-466b-ba45-e3306ab85d35	d572d888-e807-4dfb-8860-3d62e31945cd	64767f18-a6ec-4f74-9fee-08cf49f59ca5	6	0	6	2026-03-18 02:11:26.727	2026-03-18 02:11:26.727
\.


--
-- Data for Name: StockIn; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."StockIn" (id, "stockId", "skuId", "warehouseId", "shelfId", quantity, "batchNo", remark, "createdAt", operator) FROM stdin;
65c6e66f-542d-407b-a84f-bceb70de571d	4431c82b-282f-4ae7-a3c5-f5134a176019	e50e0619-da9e-4c01-961c-081efdea7d67	c6a2fddc-feab-40a4-851f-18f54c9548bf	aff41c99-5880-4a63-ac4b-af8feea5cef5	16	\N	\N	2026-03-18 02:10:03.342	\N
2b9d220d-b84d-4b82-8e62-8f8c0ca810e5	0fe2128f-2d48-4680-b84d-42e52046567b	69407edb-65a3-4c7e-ab39-623184cb1336	c6a2fddc-feab-40a4-851f-18f54c9548bf	472399c9-146a-41f3-ae34-aa7cd65715e7	10	\N	\N	2026-03-18 02:10:41.152	\N
195d9825-448d-4835-9fa4-703c3ea31503	03e871a4-4e4f-4de2-8715-1a747b4ad194	9e5f8f4e-6fab-47ef-8076-5bfc661d1880	d572d888-e807-4dfb-8860-3d62e31945cd	64767f18-a6ec-4f74-9fee-08cf49f59ca5	18	\N	\N	2026-03-18 02:11:03.559	\N
d85c849f-8bc0-49dc-97c4-9598b4609033	5aa315e0-addf-42a4-b75f-5012c368b72f	775d14e1-e629-466b-ba45-e3306ab85d35	d572d888-e807-4dfb-8860-3d62e31945cd	64767f18-a6ec-4f74-9fee-08cf49f59ca5	6	\N	\N	2026-03-18 02:11:26.728	\N
\.


--
-- Data for Name: StockLock; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."StockLock" (id, "skuId", "orderId", "warehouseId", "shelfId", quantity, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."User" (id, username, password, role, name, phone, email, "createdAt", "updatedAt") FROM stdin;
933806d7-f79d-4966-a264-2c0e2ee57cfc	admin	$2a$10$zU9BQPYoMxpiq8vzGdlXOugKdHEN0bOoHxqm5o9JqvTBeZbBDBjYe	ADMIN	系统管理员	\N	\N	2026-03-18 01:00:20.133	2026-03-18 01:00:20.133
\.


--
-- Data for Name: Vehicle; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."Vehicle" (id, "licensePlate", "vehicleType", capacity, volume, status, "warehouseId", "createdAt", "updatedAt", latitude, location, longitude) FROM stdin;
2f601992-9b8c-4aac-9929-329f0f7eaf12	浙E12345	小面	50	10	AVAILABLE	c6a2fddc-feab-40a4-851f-18f54c9548bf	2026-03-18 01:15:56.515	2026-03-18 01:15:56.515	\N	\N	\N
6e24f10e-f103-4411-b056-469cbb79a9d5	浙E54321	小面	50	10	AVAILABLE	c6a2fddc-feab-40a4-851f-18f54c9548bf	2026-03-18 01:16:17.143	2026-03-18 01:16:17.143	\N	\N	\N
c0b04d37-b9c0-4fd4-a7ad-708dd92a1f41	浙E98765	小面	50	10	AVAILABLE	d572d888-e807-4dfb-8860-3d62e31945cd	2026-03-18 01:16:34.759	2026-03-18 01:16:34.759	\N	\N	\N
\.


--
-- Data for Name: Warehouse; Type: TABLE DATA; Schema: public; Owner: dingyuebo
--

COPY public."Warehouse" (id, code, name, type, status, province, city, address, latitude, longitude, "ownerId", "createdAt", "updatedAt") FROM stdin;
c6a2fddc-feab-40a4-851f-18f54c9548bf	HZ1	湖州一号仓	NORMAL	ACTIVE	浙江省	湖州	雷甸	\N	\N	9485bd0d-06bc-4b10-a147-127164d42e99	2026-03-18 01:05:35.291	2026-03-18 01:05:35.291
d572d888-e807-4dfb-8860-3d62e31945cd	WK1	德清一号仓	NORMAL	ACTIVE	浙江省	湖州	武康	\N	\N	e8ccff9b-0a18-4468-bb69-594111e8aa29	2026-03-18 01:06:53.019	2026-03-18 01:06:53.019
\.


--
-- Name: DispatchOrder DispatchOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."DispatchOrder"
    ADD CONSTRAINT "DispatchOrder_pkey" PRIMARY KEY (id);


--
-- Name: Dispatch Dispatch_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Dispatch"
    ADD CONSTRAINT "Dispatch_pkey" PRIMARY KEY (id);


--
-- Name: Driver Driver_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Driver"
    ADD CONSTRAINT "Driver_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: Owner Owner_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Owner"
    ADD CONSTRAINT "Owner_pkey" PRIMARY KEY (id);


--
-- Name: PickOrderItem PickOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."PickOrderItem"
    ADD CONSTRAINT "PickOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: PickOrder PickOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."PickOrder"
    ADD CONSTRAINT "PickOrder_pkey" PRIMARY KEY (id);


--
-- Name: ProductBrand ProductBrand_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."ProductBrand"
    ADD CONSTRAINT "ProductBrand_pkey" PRIMARY KEY (id);


--
-- Name: ProductCategory ProductCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_pkey" PRIMARY KEY (id);


--
-- Name: ProductSKU ProductSKU_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."ProductSKU"
    ADD CONSTRAINT "ProductSKU_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Shelf Shelf_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Shelf"
    ADD CONSTRAINT "Shelf_pkey" PRIMARY KEY (id);


--
-- Name: StockIn StockIn_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."StockIn"
    ADD CONSTRAINT "StockIn_pkey" PRIMARY KEY (id);


--
-- Name: StockLock StockLock_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."StockLock"
    ADD CONSTRAINT "StockLock_pkey" PRIMARY KEY (id);


--
-- Name: Stock Stock_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Stock"
    ADD CONSTRAINT "Stock_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vehicle Vehicle_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY (id);


--
-- Name: Warehouse Warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Warehouse"
    ADD CONSTRAINT "Warehouse_pkey" PRIMARY KEY (id);


--
-- Name: Dispatch_dispatchNo_key; Type: INDEX; Schema: public; Owner: dingyuebo
--

CREATE UNIQUE INDEX "Dispatch_dispatchNo_key" ON public."Dispatch" USING btree ("dispatchNo");


--
-- Name: Order_orderNo_key; Type: INDEX; Schema: public; Owner: dingyuebo
--

CREATE UNIQUE INDEX "Order_orderNo_key" ON public."Order" USING btree ("orderNo");


--
-- Name: PickOrder_pickNo_key; Type: INDEX; Schema: public; Owner: dingyuebo
--

CREATE UNIQUE INDEX "PickOrder_pickNo_key" ON public."PickOrder" USING btree ("pickNo");


--
-- Name: ProductBrand_code_key; Type: INDEX; Schema: public; Owner: dingyuebo
--

CREATE UNIQUE INDEX "ProductBrand_code_key" ON public."ProductBrand" USING btree (code);


--
-- Name: ProductCategory_code_key; Type: INDEX; Schema: public; Owner: dingyuebo
--

CREATE UNIQUE INDEX "ProductCategory_code_key" ON public."ProductCategory" USING btree (code);


--
-- Name: Shelf_warehouseId_code_key; Type: INDEX; Schema: public; Owner: dingyuebo
--

CREATE UNIQUE INDEX "Shelf_warehouseId_code_key" ON public."Shelf" USING btree ("warehouseId", code);


--
-- Name: Stock_skuId_warehouseId_shelfId_key; Type: INDEX; Schema: public; Owner: dingyuebo
--

CREATE UNIQUE INDEX "Stock_skuId_warehouseId_shelfId_key" ON public."Stock" USING btree ("skuId", "warehouseId", "shelfId");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: dingyuebo
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Warehouse_code_key; Type: INDEX; Schema: public; Owner: dingyuebo
--

CREATE UNIQUE INDEX "Warehouse_code_key" ON public."Warehouse" USING btree (code);


--
-- Name: DispatchOrder DispatchOrder_dispatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."DispatchOrder"
    ADD CONSTRAINT "DispatchOrder_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES public."Dispatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DispatchOrder DispatchOrder_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."DispatchOrder"
    ADD CONSTRAINT "DispatchOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispatch Dispatch_driverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Dispatch"
    ADD CONSTRAINT "Dispatch_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES public."Driver"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispatch Dispatch_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Dispatch"
    ADD CONSTRAINT "Dispatch_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public."Vehicle"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispatch Dispatch_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Dispatch"
    ADD CONSTRAINT "Dispatch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Driver Driver_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Driver"
    ADD CONSTRAINT "Driver_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public."Vehicle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Driver Driver_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Driver"
    ADD CONSTRAINT "Driver_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderItem OrderItem_skuId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES public."ProductSKU"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."Owner"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PickOrderItem PickOrderItem_pickOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."PickOrderItem"
    ADD CONSTRAINT "PickOrderItem_pickOrderId_fkey" FOREIGN KEY ("pickOrderId") REFERENCES public."PickOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PickOrderItem PickOrderItem_skuId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."PickOrderItem"
    ADD CONSTRAINT "PickOrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES public."ProductSKU"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PickOrderItem PickOrderItem_stockLockId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."PickOrderItem"
    ADD CONSTRAINT "PickOrderItem_stockLockId_fkey" FOREIGN KEY ("stockLockId") REFERENCES public."StockLock"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductBrand ProductBrand_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."ProductBrand"
    ADD CONSTRAINT "ProductBrand_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProductCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductSKU ProductSKU_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."ProductSKU"
    ADD CONSTRAINT "ProductSKU_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_brandId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES public."ProductBrand"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProductCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Shelf Shelf_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Shelf"
    ADD CONSTRAINT "Shelf_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockIn StockIn_shelfId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."StockIn"
    ADD CONSTRAINT "StockIn_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES public."Shelf"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockIn StockIn_skuId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."StockIn"
    ADD CONSTRAINT "StockIn_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES public."ProductSKU"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIn StockIn_stockId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."StockIn"
    ADD CONSTRAINT "StockIn_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES public."Stock"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIn StockIn_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."StockIn"
    ADD CONSTRAINT "StockIn_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLock StockLock_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."StockLock"
    ADD CONSTRAINT "StockLock_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLock StockLock_shelfId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."StockLock"
    ADD CONSTRAINT "StockLock_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES public."Shelf"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockLock StockLock_skuId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."StockLock"
    ADD CONSTRAINT "StockLock_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES public."ProductSKU"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLock StockLock_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."StockLock"
    ADD CONSTRAINT "StockLock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Stock Stock_shelfId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Stock"
    ADD CONSTRAINT "Stock_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES public."Shelf"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Stock Stock_skuId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Stock"
    ADD CONSTRAINT "Stock_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES public."ProductSKU"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Stock Stock_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Stock"
    ADD CONSTRAINT "Stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vehicle Vehicle_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Warehouse Warehouse_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dingyuebo
--

ALTER TABLE ONLY public."Warehouse"
    ADD CONSTRAINT "Warehouse_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."Owner"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: dingyuebo
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict lLb5FexDgFEYoG2z4zdDhMRtCEgTQeZOtk7IDPfi25Vpj6iDWgIJzTMLDclU1Hj

