import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

type OrderStatusValue = "WAITING" | "PREPARING" | "PRODUCTION" | "PRODUCTION_DONE" | "SHIPPED" | "IN_DELIVERY" | "ARRIVED" | "RECEIVED" | "DEFECTIVE" | "RETURN_RECEIVED" | "HOLD"

// 현재 상태 → { 이전 상태, 지울 날짜 필드 }
const revertMap: Record<string, { prev: OrderStatusValue; clearField: string }> = {
  PREPARING:       { prev: "WAITING",        clearField: "preparingDate" },
  PRODUCTION:      { prev: "PREPARING",      clearField: "productionDate" },
  PRODUCTION_DONE: { prev: "PRODUCTION",     clearField: "productionDoneDate" },
  SHIPPED:         { prev: "PRODUCTION_DONE", clearField: "shipmentDate" },
  IN_DELIVERY:     { prev: "SHIPPED",        clearField: "deliveryStartDate" },
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role === "USER" || session.role === "SITE_MANAGER")
    return Response.json({ error: "관리자만 상태를 되돌릴 수 있습니다." }, { status: 403 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return Response.json({ error: "발주를 찾을 수 없습니다." }, { status: 404 })

  const rule = revertMap[order.status]
  if (!rule)
    return Response.json({ error: "현재 상태에서는 되돌릴 수 없습니다." }, { status: 400 })

  const { reason } = await req.json()

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: rule.prev,
      [rule.clearField]: null,
    },
  })

  await prisma.activity.create({
    data: {
      orderId: id,
      userId: session.userId,
      action: "STATUS_REVERTED",
      changes: { from: order.status, to: rule.prev },
      reason: reason || null,
    },
  })

  return Response.json(updated)
}
