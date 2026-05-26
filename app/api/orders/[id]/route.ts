import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      createdBy: { select: { fullName: true, username: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { fullName: true } } },
      },
    },
  })

  if (!order) return Response.json({ error: "발주를 찾을 수 없습니다." }, { status: 404 })
  return Response.json(order)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return Response.json({ error: "발주를 찾을 수 없습니다." }, { status: 404 })

  const ADMIN_ROLES = ["ADMIN", "MANAGER"]
  if (!ADMIN_ROLES.includes(session.role) && ["RECEIVED", "RETURN_RECEIVED"].includes(order.status)) {
    return Response.json({ error: "완료된 발주는 수정할 수 없습니다." }, { status: 400 })
  }

  const body = await req.json()
  const before = { ...order }

  const VALID_STATUSES = ["WAITING","PREPARING","PRODUCTION","PRODUCTION_DONE","SHIPPED","IN_DELIVERY","ARRIVED","RECEIVED","DEFECTIVE","RETURN_RECEIVED","HOLD"]
  const newStatus = body.status && VALID_STATUSES.includes(body.status) ? body.status : undefined

  const updated = await prisma.order.update({
    where: { id },
    data: {
      ...(newStatus ? { status: newStatus } : {}),
      clientName: body.clientName ?? order.clientName,
      clientId: body.clientId !== undefined ? (body.clientId || null) : order.clientId,
      siteName: body.siteName !== undefined ? (body.siteName || null) : order.siteName,
      quantity: body.quantity !== undefined ? (body.quantity ? Number(body.quantity) : null) : order.quantity,
      area: body.area !== undefined ? (body.area ? Number(body.area) : null) : order.area,
      frameType: body.frameType !== undefined ? (body.frameType || null) : order.frameType,
      glassType: body.glassType !== undefined ? (body.glassType || null) : order.glassType,
      productName: body.productName !== undefined ? (body.productName || null) : order.productName,
      noteDefect: body.noteDefect !== undefined ? (body.noteDefect || null) : order.noteDefect,
      noteJoint: body.noteJoint !== undefined ? (body.noteJoint || null) : order.noteJoint,
      orderReceivedDate: body.orderReceivedDate !== undefined
        ? (body.orderReceivedDate ? new Date(body.orderReceivedDate) : null)
        : order.orderReceivedDate,
      productionRequestDate: body.productionRequestDate !== undefined
        ? (body.productionRequestDate ? new Date(body.productionRequestDate) : null)
        : order.productionRequestDate,
      deliveryRequestDate: body.deliveryRequestDate !== undefined
        ? (body.deliveryRequestDate ? new Date(body.deliveryRequestDate) : null)
        : order.deliveryRequestDate,
    },
  })

  if (newStatus && newStatus !== before.status) {
    await prisma.activity.create({
      data: {
        orderId: id,
        userId: session.userId,
        action: "STATUS_CHANGED",
        changes: { from: before.status, to: newStatus },
      },
    })
  } else {
    await prisma.activity.create({
      data: {
        orderId: id,
        userId: session.userId,
        action: "ORDER_UPDATED",
        changes: { before, after: updated },
      },
    })
  }

  return Response.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return Response.json({ error: "발주를 찾을 수 없습니다." }, { status: 404 })

  if (order.status !== "WAITING") {
    return Response.json({ error: "대기 상태에서만 삭제 가능합니다." }, { status: 400 })
  }

  await prisma.activity.create({
    data: {
      orderId: id,
      userId: session.userId,
      action: "ORDER_DELETED",
      changes: { orderNumber: order.orderNumber, clientName: order.clientName },
    },
  })

  await prisma.order.delete({ where: { id } })
  return Response.json({ ok: true })
}
