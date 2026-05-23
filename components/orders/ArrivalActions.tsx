"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrderStatus } from "./StatusBadge"
import { format } from "date-fns"
import { CheckCircle2, XCircle, PackageCheck } from "lucide-react"

interface Props {
  orderId: string
  status: OrderStatus
  role: string
  defectiveNote?: string | null
}

// 현장 관리자 + 공장 관리자 모두 사용 가능 (USER 제외)
const ALLOWED_ROLES = ["ADMIN", "MANAGER", "SITE_MANAGER"]

export function ArrivalActions({ orderId, status, role, defectiveNote }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const today = format(new Date(), "yyyy-MM-dd")
  const [actionDate, setActionDate] = useState(today)
  const [defNote, setDefNote] = useState("")
  const [showDefective, setShowDefective] = useState(false)

  if (!ALLOWED_ROLES.includes(role)) return null

  // IN_DELIVERY → ARRIVED
  async function handleArrived() {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/arrived`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arrivedDate: actionDate }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success("도착 처리되었습니다.")
      router.refresh()
    } catch { toast.error("오류가 발생했습니다.") }
    finally { setLoading(false) }
  }

  // ARRIVED → RECEIVED or DEFECTIVE
  async function handleArrivalCheck(result: "RECEIVED" | "DEFECTIVE") {
    if (result === "DEFECTIVE" && !defNote.trim()) {
      toast.error("불량 내용을 입력해주세요.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/arrival-check`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, defectiveNote: defNote, checkDate: actionDate }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(result === "RECEIVED" ? "수령완료 처리되었습니다." : "불량 처리되었습니다.")
      setShowDefective(false)
      router.refresh()
    } catch { toast.error("오류가 발생했습니다.") }
    finally { setLoading(false) }
  }

  // 표시 조건
  const showInDelivery = status === "IN_DELIVERY"
  const showArrived = status === "ARRIVED"
  const isDefective = status === "DEFECTIVE"
  const isDone = status === "RECEIVED" || status === "RETURN_RECEIVED"

  if (!showInDelivery && !showArrived && !isDefective && !isDone) return null

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">현장 수령 처리</CardTitle></CardHeader>
      <CardContent className="space-y-4">

        {/* IN_DELIVERY → ARRIVED */}
        {showInDelivery && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">도착일</Label>
              <Input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} className="w-36" />
            </div>
            <Button onClick={handleArrived} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white gap-1">
              <PackageCheck className="h-4 w-4" />
              도착 확인
            </Button>
          </div>
        )}

        {/* ARRIVED → 정상/불량 선택 */}
        {showArrived && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">확인일</Label>
              <Input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} className="w-36" />
            </div>
            <p className="text-sm font-medium text-gray-700">도착 상품 상태를 확인하세요.</p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleArrivalCheck("RECEIVED")}
                disabled={loading || showDefective}
                className="bg-green-600 hover:bg-green-700 text-white gap-1"
              >
                <CheckCircle2 className="h-4 w-4" />
                정상 수령
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDefective((v) => !v)}
                disabled={loading}
                className="text-red-600 border-red-300 hover:bg-red-50 gap-1"
              >
                <XCircle className="h-4 w-4" />
                불량 처리
              </Button>
            </div>
            {showDefective && (
              <div className="space-y-2 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-700">⚠ 불량 내용을 입력하세요</p>
                <Textarea
                  value={defNote}
                  onChange={(e) => setDefNote(e.target.value)}
                  placeholder="불량 내용, 부위, 수량 등을 상세히 입력하세요..."
                  rows={3}
                  className="border-red-300"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleArrivalCheck("DEFECTIVE")}
                    disabled={loading}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    불량 확정
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowDefective(false); setDefNote("") }} disabled={loading}>
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 불량 상태 — 불량 내용 표시 */}
        {isDefective && defectiveNote && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">불량 내용</p>
            <p className="text-sm text-red-800 whitespace-pre-wrap">{defectiveNote}</p>
            <p className="text-xs text-gray-400 mt-2">반품 처리 후 공장 도착 시 공장 관리자가 확인합니다.</p>
          </div>
        )}

        {/* 완료 상태 안내 */}
        {isDone && (
          <p className="text-sm text-gray-500">
            {status === "RECEIVED" ? "수령이 완료된 발주입니다." : "반품이 공장에 도착한 발주입니다."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
