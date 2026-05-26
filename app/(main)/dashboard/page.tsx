import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/orders/StatusBadge"
import { format, isThisWeek, isBefore, startOfDay, subMonths, startOfMonth, endOfMonth, isSameDay } from "date-fns"
import Link from "next/link"

export const dynamic = "force-dynamic"

const GLASS_LABELS: Record<string, string> = {
  TPS: "TPS", LAMINATED: "접합", TRIPLE: "3복층", SINGLE: "단판", OTHER: "기타",
}

export default async function DashboardPage() {
  const today = startOfDay(new Date())

  const [orders, lots, clients] = await Promise.all([
    (prisma.order.findMany as any)({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true, orderNumber: true, clientName: true, clientId: true,
        siteName: true, status: true, quantity: true, glassType: true,
        deliveryRequestDate: true, createdAt: true,
      },
    }) as any[],
    (prisma.productionLot.findMany as any)({
      where: {
        scheduledDate: {
          gte: startOfMonth(subMonths(today, 1)),
          lte: endOfMonth(today),
        },
      },
      select: { id: true, lotName: true, scheduledDate: true, completedDate: true, quantity: true },
    }) as any[],
    (prisma.client.findMany as any)({
      select: { id: true, name: true },
    }) as any[],
  ])

  // 발주목록 필터와 동일한 기준
  const DONE_STATUSES = ["RECEIVED", "RETURN_RECEIVED", "HOLD"]

  const total = orders.length
  const inProgress = orders.filter((o: any) => !([...DONE_STATUSES, "SHIPPED"] as string[]).includes(o.status)).length
  const thisWeek = orders.filter(
    (o: any) => o.deliveryRequestDate && isThisWeek(new Date(o.deliveryRequestDate), { weekStartsOn: 1 })
  ).length
  const delayed = orders.filter(
    (o: any) => o.deliveryRequestDate &&
      isBefore(new Date(o.deliveryRequestDate), today) &&
      !(DONE_STATUSES as string[]).includes(o.status)
  ).length
  const received = orders.filter((o: any) => o.status === "RECEIVED").length
  const completionRate = total > 0 ? Math.round((received / total) * 100) : 0

  const todayOrders = orders.filter(
    (o: any) => o.deliveryRequestDate && isSameDay(new Date(o.deliveryRequestDate), today)
  )

  const statusCounts: Record<string, number> = {
    WAITING: orders.filter((o: any) => o.status === "WAITING").length,
    PREPARING: orders.filter((o: any) => o.status === "PREPARING").length,
    PRODUCTION: orders.filter((o: any) => o.status === "PRODUCTION").length,
    PRODUCTION_DONE: orders.filter((o: any) => o.status === "PRODUCTION_DONE").length,
    SHIPPED: orders.filter((o: any) => o.status === "SHIPPED").length,
    IN_DELIVERY: orders.filter((o: any) => o.status === "IN_DELIVERY").length,
    ARRIVED: orders.filter((o: any) => o.status === "ARRIVED").length,
    RECEIVED: received,
    DEFECTIVE: orders.filter((o: any) => o.status === "DEFECTIVE").length,
    RETURN_RECEIVED: orders.filter((o: any) => o.status === "RETURN_RECEIVED").length,
    HOLD: orders.filter((o: any) => o.status === "HOLD").length,
  }

  const recentDelayed = orders
    .filter((o: any) => o.deliveryRequestDate &&
      isBefore(new Date(o.deliveryRequestDate), today) &&
      !(DONE_STATUSES as string[]).includes(o.status)
    )
    .slice(0, 5)

  // 거래처별 발주 수 Top 5
  const clientOrderCount = orders.reduce<Record<string, { name: string; count: number }>>((acc, o: any) => {
    const key = o.clientName
    if (!acc[key]) acc[key] = { name: key, count: 0 }
    acc[key].count++
    return acc
  }, {})
  const topClients = Object.values(clientOrderCount).sort((a, b) => b.count - a.count).slice(0, 5)
  const maxClientCount = topClients[0]?.count ?? 1

  // 최근 6개월 발주량
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(today, 5 - i)
    const from = startOfMonth(d)
    const to = endOfMonth(d)
    const count = orders.filter((o: any) => {
      const c = new Date(o.createdAt)
      return c >= from && c <= to
    }).length
    return { label: format(d, "M월"), count }
  })
  const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1)

  // 유리종류별 분포
  const glassCount = orders.reduce<Record<string, number>>((acc, o: any) => {
    if (o.glassType) acc[o.glassType] = (acc[o.glassType] ?? 0) + 1
    return acc
  }, {})

  // 오늘 생산 예정 조
  const todayLots = lots.filter((l: any) => l.scheduledDate && isSameDay(new Date(l.scheduledDate), today))

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">대시보드</h2>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "진행 중인 발주", value: inProgress, color: "text-blue-600", href: "/orders?status=IN_PROGRESS" },
          { label: "이번 주 납품", value: thisWeek, color: "text-green-600", href: "/orders?quickFilter=THIS_WEEK" },
          { label: "지연 건수", value: delayed, color: "text-red-600", href: "/orders?quickFilter=DELAYED" },
          { label: "수령완료율", value: `${completionRate}%`, color: "text-gray-700", href: "/orders?status=RECEIVED" },
        ].map(({ label, value, color, href }) => (
          <Link key={label} href={href}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 오늘 납품 & 오늘 생산 */}
      {(todayOrders.length > 0 || todayLots.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {todayOrders.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader><CardTitle className="text-sm text-orange-700">오늘 납품 예정 ({todayOrders.length}건)</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {todayOrders.map((o: any) => (
                  <div key={o.id} className="flex items-center gap-2 text-sm">
                    <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline font-medium">{o.orderNumber}</Link>
                    <span className="text-gray-700 flex-1">{o.clientName}</span>
                    <StatusBadge status={o.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {todayLots.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader><CardTitle className="text-sm text-blue-700">오늘 생산 예정 조 ({todayLots.length}건)</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {todayLots.map((l: any) => (
                  <div key={l.id} className="text-sm flex gap-2">
                    <span className="font-medium">{l.lotName}</span>
                    {l.quantity && <span className="text-gray-500">{l.quantity}장</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 상태 분포 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">상태별 현황</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-3">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <StatusBadge status={status as any} />
                <span className="text-sm font-semibold">{count}건</span>
              </div>
            ))}
          </div>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            {Object.entries(statusCounts).map(([status, count]) => {
              if (count === 0 || total === 0) return null
              const pct = (count / total) * 100
              const colors: Record<string, string> = {
                WAITING: "bg-gray-300", PREPARING: "bg-orange-300",
                PRODUCTION: "bg-yellow-400", PRODUCTION_DONE: "bg-blue-400",
                SHIPPED: "bg-indigo-400", IN_DELIVERY: "bg-purple-400",
                ARRIVED: "bg-teal-400", RECEIVED: "bg-green-500",
                DEFECTIVE: "bg-red-300", RETURN_RECEIVED: "bg-rose-400", HOLD: "bg-red-500",
              }
              return <div key={status} className={`${colors[status]}`} style={{ width: `${pct}%` }} title={`${status}: ${count}건`} />
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* 월별 발주 추이 */}
        <Card>
          <CardHeader><CardTitle className="text-sm">월별 발주 추이</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {monthlyData.map((m) => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{m.count}</span>
                  <div
                    className="w-full bg-blue-400 rounded-t"
                    style={{ height: `${(m.count / maxMonthly) * 80}px`, minHeight: m.count > 0 ? "4px" : "0" }}
                  />
                  <span className="text-xs text-gray-500">{m.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 거래처 Top 5 */}
        <Card>
          <CardHeader><CardTitle className="text-sm">거래처 Top 5</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topClients.map((c) => (
              <div key={c.name} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-700 truncate max-w-32">{c.name}</span>
                  <span className="text-gray-500">{c.count}건</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(c.count / maxClientCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 유리 종류 분포 */}
      {Object.keys(glassCount).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">유리 종류별 발주</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(glassCount).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="flex items-center gap-1.5 border rounded-full px-3 py-1 text-sm">
                  <span className="font-medium">{GLASS_LABELS[type] ?? type}</span>
                  <span className="text-gray-500">{count}건</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 지연 발주 */}
      {recentDelayed.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-red-600">⚠ 지연 발주</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentDelayed.map((o: any) => (
                <li key={o.id} className="flex items-center gap-3 text-sm">
                  <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline font-medium w-20">{o.orderNumber}</Link>
                  <span className="text-gray-700 flex-1">{o.clientName}</span>
                  {o.siteName && <span className="text-gray-500 text-xs">{o.siteName}</span>}
                  <span className="text-red-600 text-xs">납품: {format(new Date(o.deliveryRequestDate!), "MM.dd")}</span>
                  <StatusBadge status={"DELAYED"} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
