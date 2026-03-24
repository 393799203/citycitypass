import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;

export async function logOperation(
  userId: string | null,
  username: string | null,
  module: string,
  action: string,
  resource?: string,
  detail?: string,
  ip?: string
) {
  try {
    await (prisma as any).operationLog.create({
      data: {
        userId,
        username,
        module,
        action,
        resource,
        detail,
        ip,
      },
    });
  } catch {
    // operationLog model may not exist
  }
}
