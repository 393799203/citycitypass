import axios from 'axios';

const AMAP_KEY = process.env.AMAP_KEY || 'your_amap_key_here';
const AMAP_BASE_URL = 'https://restapi.amap.com/v3';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  strategy: string;
  steps?: any[];
}

export async function geocode(address: string, city?: string): Promise<GeoLocation | null> {
  try {
    const params: any = {
      key: AMAP_KEY,
      address,
    };
    if (city) {
      params.city = city;
    }
    
    const response = await axios.get(`${AMAP_BASE_URL}/geocode/geo`, { params });
    const data = response.data as any;
    
    if (data && data.geocodes && data.geocodes.length > 0) {
      const geocode = data.geocodes[0];
      return {
        latitude: parseFloat(geocode.location.split(',')[1]),
        longitude: parseFloat(geocode.location.split(',')[0]),
        province: geocode.province,
        city: geocode.city,
        district: geocode.district,
        address: geocode.formatted_address,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocode error:', error);
    return null;
  }
}

export async function drivingRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteInfo | null> {
  try {
    const params = {
      key: AMAP_KEY,
      origin: `${origin.lng},${origin.lat}`,
      destination: `${destination.lng},${destination.lat}`,
      strategy: '10',
    };
    
    const response = await axios.get(`${AMAP_BASE_URL}/direction/driving`, { params });
    const data = response.data as any;
    
    if (data && data.route && data.route.paths) {
      const path = data.route.paths[0];
      return {
        distance: parseFloat(path.distance),
        duration: parseInt(path.duration),
        strategy: '10',
        steps: path.steps,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Driving route error:', error);
    return null;
  }
}

export interface MultiDestinationRouteInfo {
  routes: RouteInfo[];
  totalDistance: number;
  totalDuration: number;
}

export async function drivingRouteMultiDestination(
  origin: { lat: number; lng: number },
  destinations: Array<{ lat: number; lng: number }>
): Promise<MultiDestinationRouteInfo | null> {
  try {
    const routes: RouteInfo[] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    
    let prevPoint = origin;
    for (const dest of destinations) {
      const params = {
        key: AMAP_KEY,
        origin: `${prevPoint.lng},${prevPoint.lat}`,
        destination: `${dest.lng},${dest.lat}`,
        strategy: '10',
      };
      
      const response = await axios.get(`${AMAP_BASE_URL}/direction/driving`, { params });
      const data = response.data as any;
      
      if (data && data.route && data.route.paths) {
        const path = data.route.paths[0];
        const routeInfo: RouteInfo = {
          distance: parseFloat(path.distance),
          duration: parseInt(path.duration),
          strategy: '10',
          steps: path.steps,
        };
        routes.push(routeInfo);
        totalDistance += routeInfo.distance;
        totalDuration += routeInfo.duration;
      } else {
        const distance = calculateDistance(prevPoint.lat, prevPoint.lng, dest.lat, dest.lng);
        const routeInfo: RouteInfo = {
          distance: distance,
          duration: Math.round(distance / 60 * 60),
          strategy: 'fallback',
          steps: [],
        };
        routes.push(routeInfo);
        totalDistance += distance;
        totalDuration += routeInfo.duration;
      }
      
      prevPoint = dest;
    }
    
    return {
      routes,
      totalDistance,
      totalDuration,
    };
  } catch (error) {
    console.error('Driving route multi destination error:', error);
    return null;
  }
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
