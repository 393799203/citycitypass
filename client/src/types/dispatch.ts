export interface Vehicle {
  id: string;
  licensePlate: string;
  vehicleType: string;
  brand?: string;
  model?: string;
  capacity: number;
  volume?: number;
  licenseNo?: string;
  insuranceNo?: string;
  status: string;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  latitude?: number;
  longitude?: number;
  location?: string;
  address?: string;
  drivers?: Driver[];
  sourceType?: 'WAREHOUSE' | 'CARRIER';
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
  licenseTypes?: string[];
  status: string;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  vehicle?: Vehicle;
  latitude?: number;
  longitude?: number;
  location?: string;
  address?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface FormData {
  warehouseId: string;
  warehouse: { id: string; name: string } | null;
  licensePlate: string;
  vehicleType: string;
  brand: string;
  model: string;
  capacity: number;
  volume: string;
  licenseNo: string;
  insuranceNo: string;
  status: string;
  name: string;
  phone: string;
  licenseTypes: string[];
  driverStatus: string;
  latitude: string;
  longitude: string;
  location: string;
  address: string;
}

export interface LocationForm {
  address: string;
  latitude: string;
  longitude: string;
  location: string;
}
