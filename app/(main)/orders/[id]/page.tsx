import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { StatusBadge } from "@/components/orders/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductionShipmentActions } from "@/components/orders/ProductionShipmentActions"
import { ArrivalActions } from "@/components/orders/ArrivalActions"
import { ProductionLots } from "@/components/orders/ProductionLots"
import { format } from "date-fns"
import { ArrowLeft, Pencil, Printer } from "lucide-react"

export const dynamic = "force-dynamic"

function fmt(val: Date | null | undefined) {
  return val ? format(val, "yyyy.MM.dd") : "-"
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-28 shrink-0 text-gray-500">{label}</span>
      <span className="font-medium">{value ?? "-"}</span>
    </div>
  )
}

const activityLabel: Record<string, string> = {
  ORDER_CREATED:       "발주 등록",
  ORDER_UPDATED:       "발주 수정",
  ORDER_DELETED:       "발주 삭제",
  STATUS_CHANGED:      "상태 변경",
  STATUS_REVERTED:     "상태 되돌림",
  PREPARING_STARTED:   "생산 준비 시작",
  PRODUCTION_STARTED:  "생산 시작",
  PRODUCTION_DONE:     "생산완료",
  SHIPMENT_COMPLETED:  "출고",
  DELIVERY_STARTED:    "배송 시작",
  ORDER_ARRIVED:       "현장 도착",
  ORDER_RECEIVED:      "수령완료",
  ORDER_DEFECTIVE:     "불량 처리",
  RETURN_RECEIVED:     "반품 공장도착",
}

// 수정 버튼 비활성화 상태 (완료 단계)
const NO_EDIT_STATUSES = new Set(["RECEIVED", "RETURN_RECEIVED"])

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  const order = await (prisma.order.findUnique as any)({
    where: { id },
    include: {
      createdBy: { select: { fullName: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { fullName: true } } },
      },
    },
  }) as any

  if (!order) notFound()

  const role = session?.role ?? "USER"
  const canEdit = !NO_EDIT_STATUSES.has(order.status) && role !== "USER" && role !== "SITE_MANAGER"

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/orders">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />목록</Button>
        </Link>
        <h2 className="text-lg font-semibold flex-1">{order.orderNumber}</h2>
        <StatusBadge status={order.status} />
        {canEdit && (
          <Link href={`/orders/${id}/edit`}>
            <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" />수정</Button>
          </Link>
        )}
        <Link href={`/orders/${id}/print`} target="_blank">
          <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" />인쇄</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">기본 정보</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="의뢰번호" value={order.orderNumber} />
            <Row label="업체명" value={order.clientName} />
            <Row label="현장명" value={order.siteName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">사양 정보</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="수량" value={order.quantity} />
            <Row label="면적" value={order.area ? `${order.area} m²` : null} />
            <Row label="간봉" value={order.frameType} />
            <Row label="유리종류" value={
              order.glassType
                ? ({ TPS: "TPS (이중복층)", LAMINATED: "접합", TRIPLE: "3복층", SINGLE: "단판", OTHER: "기타" }[order.glassType as string] ?? order.glassType)
                : null
            } />
            <Row label="품명" value={order.productName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">일정</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="주문서도착일" value={fmt(order.orderReceivedDate)} />
            <Row label="생산의뢰일"  value={fmt(order.productionRequestDate)} />
            <Row label="납품요청일"  value={fmt(order.deliveryRequestDate)} />
            <Row label="생산 준비일" value={fmt(order.preparingDate)} />
            <Row label="생산 시작일" value={fmt(order.productionDate)} />
            <Row label="생산완료일"  value={fmt(order.productionDoneDate)} />
            <Row label="출고일"      value={fmt(order.shipmentDate)} />
            <Row label="배송 시작일" value={fmt(order.deliveryStartDate)} />
            <Row label="현장 도착일" value={fmt(order.arrivedDate)} />
            <Row label="수령일"      value={fmt(order.receivedDate)} />
            <Row label="반품 도착일" value={fmt(order.returnReceivedDate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">비고</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">하자외</p>
              <p className="whitespace-pre-wrap">{order.noteDefect || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">접합, 3복층</p>
              <p className="whitespace-pre-wrap">{order.noteJoint || "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 공장 처리 (ADMIN, MANAGER) */}
      <ProductionShipmentActions
        orderId={id}
        status={order.status}
        role={role}
      />

      {/* 현장 수령 처리 (ADMIN, MANAGER, SITE_MANAGER) */}
      <ArrivalActions
        orderId={id}
        status={order.status}
        role={role}
        defectiveNote={order.defectiveNote}
      />

      {/* 생산 조 배치 */}
      <ProductionLots orderId={id} role={role} />

      {/* 변경 이력 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">변경 이력</CardTitle></CardHeader>
        <CardContent>
          {order.activities.length === 0 ? (
            <p className="text-sm text-gray-400">이력이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {order.activities.map((a: any) => (
                <li key={a.id} className="text-sm flex gap-2 text-gray-600">
                  <span className="text-gray-400 text-xs w-32 shrink-0">
                    {format(a.createdAt, "MM.dd HH:mm")}
                  </span>
                  <span>{a.user?.fullName ?? "시스템"}</span>
                  <span className="text-gray-500">{activityLabel[a.action] ?? a.action}</span>
                  {a.reason && <span className="text-red-500 text-xs">({a.reason})</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
