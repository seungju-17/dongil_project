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
  if (order.status !== "PRODUCTION")
    return Response.json({ error: "생산 중 상태에서만 생산완료 처리가 가능합니다." }, { status: 400 })

  const { productionDoneDate } = await req.json()

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "PRODUCTION_DONE",
      productionDoneDate: productionDoneDate ? new Date(productionDoneDate) : new Date(),
    },
  })

  await prisma.activity.create({
    data: { orderId: id, userId: session.userId, action: "PRODUCTION_DONE", changes: { from: "PRODUCTION", to: "PRODUCTION_DONE" } },
  })

  return Response.json(updated)
}
