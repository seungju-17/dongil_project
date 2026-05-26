import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { PrintButtons } from "@/components/orders/PrintButtons"

export const dynamic = "force-dynamic"

function fmt(val: Date | null | undefined) {
  return val ? format(val, "yyyy.MM.dd") : "-"
}

const GLASS_LABELS: Record<string, string> = {
  TPS: "TPS (이중복층)", LAMINATED: "접합", TRIPLE: "3복층", SINGLE: "단판", OTHER: "기타",
}

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const order = await (prisma.order.findUnique as any)({
    where: { id },
    include: {
      createdBy: { select: { fullName: true } },
      productionLots: { orderBy: { createdAt: "asc" } },
    },
  }) as any

  if (!order) notFound()

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Malgun Gothic', sans-serif; }
          .no-print { display: none !important; }
        }
        body { font-family: 'Malgun Gothic', sans-serif; background: white; color: #111; }
      `}</style>

      <PrintButtons />

      <div className="max-w-2xl mx-auto p-8 text-sm">
        {/* 헤더 */}
        <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold">동 일 유 리</h1>
          <p className="text-gray-500 text-xs mt-1">생산 의뢰서</p>
        </div>

        {/* 의뢰번호 + 날짜 */}
        <div className="flex justify-between mb-4">
          <div>
            <span className="text-gray-500">의뢰번호: </span>
            <span className="font-bold text-lg">{order.orderNumber}</span>
          </div>
          <div className="text-gray-500 text-xs">
            등록일: {fmt(order.createdAt)}
          </div>
        </div>

        {/* 기본 정보 */}
        <table className="w-full border-collapse mb-4">
          <tbody>
            <tr className="border">
              <td className="bg-gray-100 px-3 py-2 font-medium w-28 border-r">업체명</td>
              <td className="px-3 py-2 font-bold text-base">{order.clientName}</td>
              <td className="bg-gray-100 px-3 py-2 font-medium w-28 border-l border-r">현장명</td>
              <td className="px-3 py-2">{order.siteName || "-"}</td>
            </tr>
          </tbody>
        </table>

        {/* 사양 */}
        <table className="w-full border-collapse mb-4 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1.5 text-left">수량</th>
              <th className="border px-2 py-1.5 text-left">면적(m²)</th>
              <th className="border px-2 py-1.5 text-left">유리종류</th>
              <th className="border px-2 py-1.5 text-left">간봉</th>
              <th className="border px-2 py-1.5 text-left">품명/규격</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border px-2 py-2">{order.quantity ?? "-"}</td>
              <td className="border px-2 py-2">{order.area?.toString() ?? "-"}</td>
              <td className="border px-2 py-2">{order.glassType ? (GLASS_LABELS[order.glassType] ?? order.glassType) : "-"}</td>
              <td className="border px-2 py-2">{order.frameType || "-"}</td>
              <td className="border px-2 py-2">{order.productName || "-"}</td>
            </tr>
          </tbody>
        </table>

        {/* 일정 */}
        <table className="w-full border-collapse mb-4 text-xs">
          <tbody>
            <tr className="border">
              <td className="bg-gray-100 px-3 py-1.5 font-medium border-r w-32">주문서 도착일</td>
              <td className="px-3 py-1.5 border-r">{fmt(order.orderReceivedDate)}</td>
              <td className="bg-gray-100 px-3 py-1.5 font-medium border-r w-32">생산 의뢰일</td>
              <td className="px-3 py-1.5 border-r">{fmt(order.productionRequestDate)}</td>
              <td className="bg-gray-100 px-3 py-1.5 font-medium border-r w-32">납품 요청일</td>
              <td className="px-3 py-1.5">{fmt(order.deliveryRequestDate)}</td>
            </tr>
          </tbody>
        </table>

        {/* 비고 */}
        {(order.noteDefect || order.noteJoint) && (
          <table className="w-full border-collapse mb-4 text-xs">
            <tbody>
              {order.noteDefect && (
                <tr className="border">
                  <td className="bg-gray-100 px-3 py-2 font-medium w-28 border-r">비고 (하자외)</td>
                  <td className="px-3 py-2 whitespace-pre-wrap">{order.noteDefect}</td>
                </tr>
              )}
              {order.noteJoint && (
                <tr className="border">
                  <td className="bg-gray-100 px-3 py-2 font-medium w-28 border-r">비고 (접합)</td>
                  <td className="px-3 py-2 whitespace-pre-wrap">{order.noteJoint}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* 생산 조 */}
        {order.productionLots?.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-xs text-gray-600 uppercase tracking-wide">생산 조 배치</h3>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1.5 text-left">조 이름</th>
                  <th className="border px-2 py-1.5 text-left">수량</th>
                  <th className="border px-2 py-1.5 text-left">예정일</th>
                  <th className="border px-2 py-1.5 text-left">완료일</th>
                  <th className="border px-2 py-1.5 text-left">비고</th>
                </tr>
              </thead>
              <tbody>
                {order.productionLots.map((lot: any) => (
                  <tr key={lot.id} className={lot.completedDate ? "bg-green-50" : ""}>
                    <td className="border px-2 py-1.5 font-medium">{lot.lotName}</td>
                    <td className="border px-2 py-1.5">{lot.quantity ?? "-"}</td>
                    <td className="border px-2 py-1.5">{fmt(lot.scheduledDate)}</td>
                    <td className="border px-2 py-1.5">{fmt(lot.completedDate)}</td>
                    <td className="border px-2 py-1.5 text-gray-500">{lot.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 서명란 */}
        <div className="mt-8 pt-4 border-t grid grid-cols-3 gap-4 text-center text-xs text-gray-500">
          <div>
            <div className="h-12 border-b mb-1" />
            <span>담당자</span>
          </div>
          <div>
            <div className="h-12 border-b mb-1" />
            <span>확인자</span>
          </div>
          <div>
            <div className="h-12 border-b mb-1" />
            <span>승인자</span>
          </div>
        </div>
      </div>
    </>
  )
}
