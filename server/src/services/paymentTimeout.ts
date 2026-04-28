import prisma from '../lib/prisma';

export class PaymentTimeoutService {
  private static intervalId: NodeJS.Timeout | null = null;

  static start(intervalMinutes: number = 1) {
    if (this.intervalId) {
      console.log('[支付超时服务] 服务已在运行中');
      return;
    }

    console.log(`[支付超时服务] 启动服务，检查间隔: ${intervalMinutes} 分钟`);

    this.checkTimeoutOrders();

    this.intervalId = setInterval(() => {
      this.checkTimeoutOrders();
    }, intervalMinutes * 60 * 1000);
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[支付超时服务] 服务已停止');
    }
  }

  static async checkTimeoutOrders() {
    try {
      console.log('[支付超时服务] 开始检查超时订单...');

      const now = new Date();
      const timeoutOrders = await prisma.order.findMany({
        where: {
          paymentStatus: 'PENDING',
          paymentTimeoutAt: {
            lt: now,
          },
          status: 'PENDING',
          source: 'CUSTOMER',
        },
        include: {
          items: true,
          stockLocks: true,
          bundleStockLocks: true,
        },
      });

      if (timeoutOrders.length === 0) {
        console.log('[支付超时服务] 没有超时订单');
        return;
      }

      console.log(`[支付超时服务] 发现 ${timeoutOrders.length} 个超时订单`);

      for (const order of timeoutOrders) {
        await this.cancelOrder(order);
      }

      console.log(`[支付超时服务] 已处理 ${timeoutOrders.length} 个超时订单`);
    } catch (error) {
      console.error('[支付超时服务] 检查超时订单失败:', error);
    }
  }

  private static async cancelOrder(order: any) {
    try {
      console.log(`[支付超时服务] 开始取消订单: ${order.orderNo}`);

      await prisma.$transaction(async (tx: any) => {
        for (const lock of order.stockLocks) {
          if (lock.locationId) {
            const stock = await tx.stock.findFirst({
              where: {
                warehouseId: lock.warehouseId,
                locationId: lock.locationId,
                skuBatchId: lock.skuBatchId,
              },
            });

            if (stock && stock.lockedQuantity > 0) {
              await tx.stock.update({
                where: {
                  warehouseId_locationId_skuBatchId: {
                    warehouseId: lock.warehouseId,
                    locationId: lock.locationId,
                    skuBatchId: lock.skuBatchId,
                  },
                },
                data: {
                  lockedQuantity: { decrement: Math.min(lock.quantity, stock.lockedQuantity) },
                  availableQuantity: { increment: Math.min(lock.quantity, stock.lockedQuantity) },
                },
              });
            }
          } else {
            const stocks = await tx.stock.findMany({
              where: {
                skuId: lock.skuId,
                warehouseId: lock.warehouseId,
                locationId: null,
                skuBatchId: lock.skuBatchId,
              },
            });

            for (const stock of stocks) {
              if (stock.lockedQuantity > 0) {
                await tx.stock.update({
                  where: { id: stock.id },
                  data: {
                    lockedQuantity: { decrement: Math.min(lock.quantity, stock.lockedQuantity) },
                    availableQuantity: { increment: Math.min(lock.quantity, stock.lockedQuantity) },
                  },
                });
              }
            }
          }

          await tx.stockLock.delete({ where: { id: lock.id } });
        }

        for (const lock of order.bundleStockLocks) {
          if (lock.locationId) {
            const bundleStock = await tx.bundleStock.findFirst({
              where: {
                bundleId: lock.bundleId,
                warehouseId: lock.warehouseId,
                locationId: lock.locationId,
                bundleBatchId: lock.bundleBatchId,
              },
            });

            if (bundleStock && bundleStock.lockedQuantity > 0) {
              await tx.bundleStock.update({
                where: { id: bundleStock.id },
                data: {
                  lockedQuantity: { decrement: Math.min(lock.quantity, bundleStock.lockedQuantity) },
                  availableQuantity: { increment: Math.min(lock.quantity, bundleStock.lockedQuantity) },
                },
              });
            }
          } else {
            await tx.bundleStock.updateMany({
              where: {
                bundleId: lock.bundleId,
                warehouseId: lock.warehouseId,
              },
              data: {
                lockedQuantity: { decrement: lock.quantity },
                availableQuantity: { increment: lock.quantity },
              },
            });
          }

          await tx.bundleStockLock.delete({ where: { id: lock.id } });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'TIMEOUT',
          },
        });

        console.log(`[支付超时服务] 订单 ${order.orderNo} 已取消，库存已释放`);
      });
    } catch (error) {
      console.error(`[支付超时服务] 取消订单 ${order.orderNo} 失败:`, error);
    }
  }
}
