"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrderStatus } from "./StatusBadge"
import { format } from "date-fns"
import { Undo2 } from "lucide-react"

interface Props {
  orderId: string
  status: OrderStatus
  role: string
}

// 공장 측에서 처리하는 단계만 표시 (SITE_MANAGER는 접근 불가)
const FACTORY_ROLES = ["ADMIN", "MANAGER"]

interface StepConfig {
  label: string
  dateLabel: string
  dateKey: string
  endpoint: string
  buttonClass: string
}

const stepConfig: Partial<Record<OrderStatus, StepConfig>> = {
  WAITING: {
    label: "생산 준비",
    dateLabel: "생산 준비일",
    dateKey: "preparingDate",
    endpoint: "preparing",
    buttonClass: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  PREPARING: {
    label: "생산 시작",
    dateLabel: "생산 시작일",
    dateKey: "productionDate",
    endpoint: "production",
    buttonClass: "bg-yellow-500 hover:bg-yellow-600 text-white",
  },
  PRODUCTION: {
    label: "생산완료",
    dateLabel: "생산완료일",
    dateKey: "productionDoneDate",
    endpoint: "production-done",
    buttonClass: "bg-blue-500 hover:bg-blue-600 text-white",
  },
  PRODUCTION_DONE: {
    label: "출고",
    dateLabel: "출고일",
    dateKey: "shipmentDate",
    endpoint: "shipment",
    buttonClass: "bg-indigo-600 hover:bg-indigo-700 text-white",
  },
  SHIPPED: {
    label: "배송 시작",
    dateLabel: "배송 시작일",
    dateKey: "deliveryStartDate",
    endpoint: "in-delivery",
    buttonClass: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  // DEFECTIVE → RETURN_RECEIVED 는 공장 측
  DEFECTIVE: {
    label: "반품 공장도착",
    dateLabel: "반품 도착일",
    dateKey: "returnReceivedDate",
    endpoint: "return-received",
    buttonClass: "bg-rose-600 hover:bg-rose-700 text-white",
  },
}

const revertLabels: Partial<Record<OrderStatus, string>> = {
  PREPARING: "대기 상태로 되돌리기",
  PRODUCTION: "생산 준비 상태로 되돌리기",
  PRODUCTION_DONE: "생산 중 상태로 되돌리기",
  SHIPPED: "생산완료 상태로 되돌리기",
  IN_DELIVERY: "출고 상태로 되돌리기",
}

export function ProductionShipmentActions({ orderId, status, role }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const today = format(new Date(), "yyyy-MM-dd")
  const [actionDate, setActionDate] = useState(today)
  const [showRevert, setShowRevert] = useState(false)
  const [revertReason, setRevertReason] = useState("")

  // 공장 관리자만 표시
  if (!FACTORY_ROLES.includes(role)) return null

  const step = stepConfig[status]
  const canRevert = !!revertLabels[status]

  async function handleAction() {
    if (!step) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/${step.endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [step.dateKey]: actionDate }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`${step.label} 처리되었습니다.`)
      router.refresh()
    } catch { toast.error("오류가 발생했습니다.") }
    finally { setLoading(false) }
  }

  async function handleRevert() {
    if (!revertReason.trim()) { toast.error("되돌리기 사유를 입력해주세요."); return }
    if (!confirm("정말 이전 단계로 되돌리시겠습니까?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/revert`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revertReason }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success("이전 단계로 되돌렸습니다.")
      setShowRevert(false)
      setRevertReason("")
      router.refresh()
    } catch { toast.error("오류가 발생했습니다.") }
    finally { setLoading(false) }
  }

  if (!step && !canRevert) return null

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">공장 처리</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {step && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{step.dateLabel}</Label>
              <Input
                type="date"
                value={actionDate}
                onChange={(e) => setActionDate(e.target.value)}
                className="w-36"
              />
            </div>
            <Button onClick={handleAction} disabled={loading} className={step.buttonClass}>
              {step.label}
            </Button>
          </div>
        )}

        {canRevert && (
          <div className="border-t pt-4">
            {!showRevert ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRevert(true)}
                className="text-red-600 border-red-300 hover:bg-red-50 gap-1"
              >
                <Undo2 className="h-4 w-4" />
                {revertLabels[status]}
              </Button>
            ) : (
              <div className="space-y-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-700">⚠ {revertLabels[status]}</p>
                <div className="space-y-1">
                  <Label className="text-xs text-red-600">사유 (필수)</Label>
                  <Input
                    value={revertReason}
                    onChange={(e) => setRevertReason(e.target.value)}
                    placeholder="되돌리기 사유를 입력하세요..."
                    className="border-red-300 focus:border-red-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleRevert} disabled={loading} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                    확인
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowRevert(false); setRevertReason("") }} disabled={loading}>
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
