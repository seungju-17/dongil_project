import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { OrderDataTable } from "@/components/orders/OrderDataTable"

export const dynamic = "force-dynamic"

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { orderNumber: "asc" },
    take: 200,
    include: { createdBy: { select: { fullName: true } } },
  })

  const serialized = orders.map((o) => ({
    ...o,
    area: o.area?.toString() ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    orderReceivedDate: o.orderReceivedDate?.toISOString() ?? null,
    productionRequestDate: o.productionRequestDate?.toISOString() ?? null,
    deliveryRequestDate: o.deliveryRequestDate?.toISOString() ?? null,
    preparingDate: o.preparingDate?.toISOString() ?? null,
    productionDate: o.productionDate?.toISOString() ?? null,
    productionDoneDate: o.productionDoneDate?.toISOString() ?? null,
    shipmentDate: o.shipmentDate?.toISOString() ?? null,
    deliveryStartDate: o.deliveryStartDate?.toISOString() ?? null,
    arrivedDate: o.arrivedDate?.toISOString() ?? null,
    receivedDate: o.receivedDate?.toISOString() ?? null,
    returnReceivedDate: o.returnReceivedDate?.toISOString() ?? null,
  }))

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">발주 목록</h2>
      <Suspense fallback={<div>목록 불러오는 중...</div>}>
        <OrderDataTable initialData={serialized as any} />
      </Suspense>
    </div>
  )
}
