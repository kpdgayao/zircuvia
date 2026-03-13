import { prisma } from "./prisma";

export async function createSystemLog(params: {
  action: string;
  description: string;
  userId: string;
  targetType?: string;
  targetId?: string;
}) {
  return prisma.systemLog.create({ data: params });
}
