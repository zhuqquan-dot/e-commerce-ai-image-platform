import { prisma } from "@/lib/prisma";

export async function acceptPendingInvites(userId: string): Promise<number> {
  const updated = await prisma.member.updateMany({
    where: {
      userId,
      status: "invited",
    },
    data: {
      status: "active",
      joinedAt: new Date(),
    },
  });

  return updated.count;
}
