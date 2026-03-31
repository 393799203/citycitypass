import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { geocode, drivingRouteMultiDestination, calculateDistance } from '../services/amap';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId, status, vehicleId, driverId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId as string;
    if (driverId) where.driverId = driverId as string;

    const dispatches = await prisma.dispatch.findMany({
      where,
      include: {
        vehicle: true,
        carrierVehicle: true,
        driver: true,
        warehouse: true,
        orders: {
          include: {
            order: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: dispatches });
  } catch (error) {
    console.error('Get dispatches error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { vehicleId, vehicleSource, carrierVehicleId, driverId, warehouseId, orderIds, remark, departureTime } = req.body;

    if (!warehouseId || !orderIds || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    let vehicleCapacity = 0;
    let carrierVehicle = null;

    if (vehicleSource === 'CARRIER' && carrierVehicleId) {
      carrierVehicle = await prisma.carrierVehicle.findUnique({ where: { id: carrierVehicleId } });
      if (!carrierVehicle) {
        return res.status(400).json({ success: false, message: '承运商车辆不存在' });
      }
      vehicleCapacity = carrierVehicle.capacity || 999999;
    } else if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) {
        return res.status(400).json({ success: false, message: '车辆不存在' });
      }
      vehicleCapacity = vehicle.capacity;
    } else {
      return res.status(400).json({ success: false, message: '请选择车辆' });
    }

    if (driverId) {
      const driver = await prisma.driver.findUnique({ where: { id: driverId } });
      if (!driver) {
        return res.status(400).json({ success: false, message: '司机不存在' });
      }
    }

    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        status: 'DISPATCHING',
      },
      include: {
        items: true,
      },
    });

    if (orders.length === 0) {
      return res.status(400).json({ success: false, message: '没有可调度的订单' });
    }

    const totalWeight = orders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    if (totalWeight > vehicleCapacity) {
      return res.status(400).json({
        success: false,
        message: `订单总重量${totalWeight}件，超过车辆载重${vehicleCapacity}件`
      });
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      return res.status(400).json({ success: false, message: '仓库不存在' });
    }

    const orderLocations = await Promise.all(
      orders.map(async (order) => {
        const address = `${order.province}${order.city}${order.address}`;
        const location = order.latitude && order.longitude 
          ? { latitude: order.latitude, longitude: order.longitude }
          : await geocode(address, order.city);
        return {
          order,
          address,
          location,
        };
      })
    );
    
    const validLocations = orderLocations.filter(loc => loc.location);
    
    const uniqueLocationsMap = new Map<string, typeof validLocations[0]>();
    for (const loc of validLocations) {
      const key = `${loc.location!.latitude},${loc.location!.longitude}`;
      if (!uniqueLocationsMap.has(key)) {
        uniqueLocationsMap.set(key, loc);
      }
    }
    const uniqueLocations = Array.from(uniqueLocationsMap.values());
    
    const destinations = uniqueLocations.map(loc => ({
      lat: loc.location!.latitude,
      lng: loc.location!.longitude,
    }));
    
    let distance = 0;
    let plannedRoute: any = null;
    
    if (warehouse.latitude && warehouse.longitude && destinations.length > 0) {
      const multiRouteInfo = await drivingRouteMultiDestination(
        { lat: warehouse.latitude, lng: warehouse.longitude },
        destinations
      );
      
      if (multiRouteInfo) {
        distance = multiRouteInfo.totalDistance / 1000;
        const allSteps = multiRouteInfo.routes.flatMap(r => r.steps || []);
        plannedRoute = {
          origin: {
            address: `${warehouse.province || ''}${warehouse.city || ''}${warehouse.address || ''}`,
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
          },
          destinations: uniqueLocations.map((loc, index) => ({
            address: loc.address,
            latitude: loc.location!.latitude,
            longitude: loc.location!.longitude,
            agentName: loc.order.city,
            orderNo: loc.order.orderNo,
          })),
          distance: distance,
          duration: multiRouteInfo.totalDuration,
          steps: allSteps,
        };
      }
    }

    if (!plannedRoute && validLocations.length > 0) {
      if (warehouse.latitude && warehouse.longitude) {
        distance = 0;
        for (const loc of validLocations) {
          distance += calculateDistance(
            warehouse.latitude,
            warehouse.longitude,
            loc.location!.latitude,
            loc.location!.longitude
          );
        }
        plannedRoute = {
          origin: {
            address: `${warehouse.province || ''}${warehouse.city || ''}${warehouse.address || ''}`,
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
          },
          destinations: uniqueLocations.map(loc => ({
            address: loc.address,
            latitude: loc.location!.latitude,
            longitude: loc.location!.longitude,
            agentName: loc.order.city,
            orderNo: loc.order.orderNo,
          })),
          distance: distance,
        };
      }
    }

    const dispatchNo = `DP${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const dispatch = await prisma.$transaction(async (tx) => {
      const created = await tx.dispatch.create({
        data: {
          dispatchNo,
          vehicleSource: vehicleSource || 'WAREHOUSE',
          vehicleId: vehicleSource === 'CARRIER' ? null : vehicleId,
          carrierVehicleId: vehicleSource === 'CARRIER' ? carrierVehicleId : null,
          driverId: driverId || null,
          warehouseId,
          status: 'PENDING',
          plannedRoute,
          totalDistance: distance,
          orderCount: orders.length,
          totalWeight,
          remark: remark || null,
          departureTime: departureTime ? new Date(departureTime) : null,
          orders: {
            create: orders.map((order) => {
              const orderLoc = validLocations.find(loc => loc.order.id === order.id);
              return {
                orderId: order.id,
                latitude: orderLoc?.location?.latitude || null,
                longitude: orderLoc?.location?.longitude || null,
                agentName: order.city,
                status: 'PENDING',
              };
            }),
          },
        },
        include: {
          vehicle: true,
          driver: true,
          warehouse: true,
          orders: {
            include: {
              order: true,
            },
          },
        },
      });

      for (const orderId of orderIds) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'DISPATCHED' },
        });
      }

      if (vehicleSource === 'CARRIER' && carrierVehicleId) {
        await tx.carrierVehicle.update({
          where: { id: carrierVehicleId },
          data: { status: 'IN_TRANSIT' },
        });
      } else if (vehicleId) {
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { status: 'IN_TRANSIT' },
        });
      }

      if (driverId) {
        await tx.driver.update({
          where: { id: driverId },
          data: { status: 'IN_TRANSIT', vehicleId },
        });
      }

      return created;
    });

    res.json({ success: true, data: dispatch });
  } catch (error) {
    console.error('Create dispatch error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = await prisma.dispatch.findUnique({ 
      where: { id },
      include: { orders: true }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: '配送单不存在' });
    }

    const dispatch = await prisma.$transaction(async (tx) => {
      let updated = existing;

      if (status === 'IN_TRANSIT') {
        updated = await tx.dispatch.update({
          where: { id },
          data: { 
            status: 'IN_TRANSIT',
            departureTime: new Date(),
          },
          include: {
            vehicle: true,
            driver: true,
            warehouse: true,
            orders: {
              include: {
                order: true,
              },
            },
          },
        });

        for (const dispatchOrder of updated.orders) {
          await tx.order.update({
            where: { id: dispatchOrder.orderId },
            data: { status: 'IN_TRANSIT' },
          });
        }
      } else if (status === 'COMPLETED') {
        updated = await tx.dispatch.update({
          where: { id },
          data: { 
            status: 'COMPLETED',
            completedTime: new Date(),
          },
          include: {
            vehicle: true,
            driver: true,
            warehouse: true,
            orders: {
              include: {
                order: true,
              },
            },
          },
        });

        if (existing.vehicleId) {
          await tx.vehicle.update({
            where: { id: existing.vehicleId },
            data: { status: 'AVAILABLE' },
          });
        }
        if (existing.carrierVehicleId) {
          await tx.carrierVehicle.update({
            where: { id: existing.carrierVehicleId },
            data: { status: 'AVAILABLE' },
          });
        }

        if (existing.driverId) {
          await tx.driver.update({
            where: { id: existing.driverId },
            data: { status: 'AVAILABLE', vehicleId: null },
          });
        }

        let lastDeliveredOrder = null;
        
        const orderIds = existing.orders.map(o => o.orderId);
        const orders = await tx.order.findMany({
          where: { id: { in: orderIds } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });
        
        if (orders.length > 0) {
          lastDeliveredOrder = orders[0];
        }

        for (const dispatchOrder of existing.orders) {
          await tx.order.update({
            where: { id: dispatchOrder.orderId },
            data: { status: 'DELIVERED' },
          });
          
          await tx.dispatchOrder.update({
            where: { id: dispatchOrder.id },
            data: { status: 'SIGNED' },
          });
        }

        if (lastDeliveredOrder) {
          const locationData = {
            location: `${lastDeliveredOrder.province || ''}${lastDeliveredOrder.city || ''}`,
            address: lastDeliveredOrder.address,
          };
          
          const coordinateData: any = {};
          if (lastDeliveredOrder.latitude != null) coordinateData.latitude = lastDeliveredOrder.latitude;
          if (lastDeliveredOrder.longitude != null) coordinateData.longitude = lastDeliveredOrder.longitude;

          if (existing.vehicleId) {
          await tx.vehicle.update({
            where: { id: existing.vehicleId },
            data: { ...locationData, ...coordinateData },
          });
        }
        if (existing.carrierVehicleId) {
          await tx.carrierVehicle.update({
            where: { id: existing.carrierVehicleId },
            data: { ...locationData, ...coordinateData },
          });
        }

        if (existing.driverId) {
            await tx.driver.update({
              where: { id: existing.driverId },
              data: { ...locationData, ...coordinateData },
            });
          }
        }
      } else if (status === 'CANCELLED') {
        updated = await tx.dispatch.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: {
            vehicle: true,
            driver: true,
            warehouse: true,
            orders: {
              include: {
                order: true,
              },
            },
          },
        });

        if (existing.vehicleId) {
          await tx.vehicle.update({
            where: { id: existing.vehicleId },
            data: { status: 'AVAILABLE' },
          });
        }
        if (existing.carrierVehicleId) {
          await tx.carrierVehicle.update({
            where: { id: existing.carrierVehicleId },
            data: { status: 'AVAILABLE' },
          });
        }
        if (existing.driverId) {
          await tx.driver.update({
            where: { id: existing.driverId },
            data: { status: 'AVAILABLE', vehicleId: null },
          });
        }

        for (const dispatchOrder of existing.orders) {
          await tx.order.update({
            where: { id: dispatchOrder.orderId },
            data: { status: 'DISPATCHING' },
          });
        }
      }

      return updated;
    });

    res.json({ success: true, data: dispatch });
  } catch (error) {
    console.error('Update dispatch status error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const dispatch = await prisma.dispatch.findUnique({
      where: { id },
      include: {
        vehicle: true,
        carrierVehicle: true,
        driver: true,
        warehouse: true,
        orders: {
          include: {
            order: {
              include: {
                items: true,
              },
            },
          },
        },
      },
    });

    if (!dispatch) {
      return res.status(404).json({ success: false, message: '配送单不存在' });
    }

    res.json({ success: true, data: dispatch });
  } catch (error) {
    console.error('Get dispatch error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.dispatch.findUnique({ 
      where: { id },
      include: { orders: true, vehicle: true, driver: true }
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, message: '配送单不存在' });
    }

    if (existing.status === 'IN_TRANSIT') {
      return res.status(400).json({ success: false, message: '配送中的订单无法删除' });
    }

    if (existing.status !== 'CANCELLED') {
      return res.status(400).json({ success: false, message: '只有已取消的配送单可以删除' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.dispatchOrder.deleteMany({
        where: { dispatchId: id },
      });

      if (existing.vehicleId) {
        await tx.vehicle.update({
          where: { id: existing.vehicleId },
          data: { status: 'AVAILABLE' },
        });
      }

      if (existing.driverId) {
        await tx.driver.update({
          where: { id: existing.driverId },
          data: { status: 'AVAILABLE', vehicleId: null },
        });
      }

      for (const dispatchOrder of existing.orders) {
        await tx.order.update({
          where: { id: dispatchOrder.orderId },
          data: { status: 'DISPATCHING' },
        });
      }

      await tx.dispatch.delete({
        where: { id },
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete dispatch error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
