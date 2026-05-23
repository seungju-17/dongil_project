import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role === "USER")
    return Response.json({ error: "권한이 없습니다." }, { status: 403 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return Response.json({ error: "발주를 찾을 수 없습니다." }, { status: 404 })
  if (order.status !== "ARRIVED")
    return Response.json({ error: "도착 상태에서만 수령 확인이 가능합니다." }, { status: 400 })

  const body = await req.json()
  const { result, defectiveNote, checkDate } = body as {
    result: "RECEIVED" | "DEFECTIVE"
    defectiveNote?: string
    checkDate?: string
  }

  if (result !== "RECEIVED" && result !== "DEFECTIVE")
    return Response.json({ error: "result는 RECEIVED 또는 DEFECTIVE이어야 합니다." }, { status: 400 })
  if (result === "DEFECTIVE" && !defectiveNote?.trim())
    return Response.json({ error: "불량 내용을 입력해주세요." }, { status: 400 })

  const now = checkDate ? new Date(checkDate) : new Date()

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: result,
      receivedDate: result === "RECEIVED" ? now : null,
      defectiveNote: result === "DEFECTIVE" ? (defectiveNote ?? null) : null,
    },
  })

  await prisma.activity.create({
    data: {
      orderId: id,
      userId: session.userId,
      action: result === "RECEIVED" ? "ORDER_RECEIVED" : "ORDER_DEFECTIVE",
      changes: { from: "ARRIVED", to: result },
      reason: result === "DEFECTIVE" ? defectiveNote : null,
    },
  })

  return Response.json(updated)
}
