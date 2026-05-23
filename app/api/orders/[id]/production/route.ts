import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role === "USER" || session.role === "SITE_MANAGER")
    return Response.json({ error: "권한이 없습니다." }, { status: 403 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return Response.json({ error: "발주를 찾을 수 없습니다." }, { status: 404 })
  if (order.status !== "PREPARING")
    return Response.json({ error: "생산 준비 상태에서만 생산 시작이 가능합니다." }, { status: 400 })

  const { productionDate } = await req.json()

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "PRODUCTION",
      productionDate: productionDate ? new Date(productionDate) : new Date(),
    },
  })

  await prisma.activity.create({
    data: { orderId: id, userId: session.userId, action: "PRODUCTION_STARTED", changes: { from: "PREPARING", to: "PRODUCTION" } },
  })

  return Response.json(updated)
}
