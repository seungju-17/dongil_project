"use client"

import { useState, useEffect, useRef, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const GLASS_TYPE_LABELS: Record<string, string> = {
  TPS: "TPS (이중복층)",
  LAMINATED: "접합",
  TRIPLE: "3복층",
  SINGLE: "단판",
  OTHER: "기타",
}

interface Client {
  id: string
  name: string
  shortCode: string | null
}

const STATUS_LABELS: Record<string, string> = {
  WAITING: "대기",
  PREPARING: "생산 준비",
  PRODUCTION: "생산 중",
  PRODUCTION_DONE: "생산완료",
  SHIPPED: "출고",
  IN_DELIVERY: "배송 중",
  ARRIVED: "도착",
  RECEIVED: "수령완료",
  DEFECTIVE: "불량/반품",
  RETURN_RECEIVED: "반품 공장도착",
  HOLD: "보류",
}

interface OrderData {
  id?: string
  orderNumber?: string
  clientName?: string
  clientId?: string | null
  siteName?: string
  quantity?: number | null
  area?: string | number | null
  frameType?: string
  glassType?: string | null
  productName?: string
  noteDefect?: string
  noteJoint?: string
  status?: string
  orderReceivedDate?: string | null
  productionRequestDate?: string | null
  deliveryRequestDate?: string | null
}

interface OrderFormProps {
  initialData?: OrderData
  mode: "create" | "edit"
  canChangeStatus?: boolean
}

function toDateInput(val: string | null | undefined): string {
  if (!val) return ""
  return val.split("T")[0]
}

function ClientCombobox({
  value,
  clientId,
  clients,
  onChange,
}: {
  value: string
  clientId: string
  clients: Client[]
  onChange: (name: string, id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        if (!clientId) setQuery(value)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [clientId, value])

  const filtered = query
    ? clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients

  return (
    <div ref={ref} className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value, "")
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="업체명 입력 또는 선택"
        required
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto text-sm">
          {filtered.slice(0, 20).map((c) => (
            <li
              key={c.id}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(c.name, c.id)
                setQuery(c.name)
                setOpen(false)
              }}
            >
              <span>{c.name}</span>
              {c.shortCode && <span className="text-gray-400 text-xs">{c.shortCode}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function OrderForm({ initialData, mode, canChangeStatus }: OrderFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState({
    orderNumber: initialData?.orderNumber || "",
    clientName: initialData?.clientName || "",
    clientId: initialData?.clientId || "",
    siteName: initialData?.siteName || "",
    quantity: initialData?.quantity?.toString() || "",
    area: initialData?.area?.toString() || "",
    frameType: initialData?.frameType || "",
    glassType: initialData?.glassType || "",
    productName: initialData?.productName || "",
    noteDefect: initialData?.noteDefect || "",
    noteJoint: initialData?.noteJoint || "",
    status: initialData?.status || "WAITING",
    orderReceivedDate: toDateInput(initialData?.orderReceivedDate),
    productionRequestDate: toDateInput(initialData?.productionRequestDate),
    deliveryRequestDate: toDateInput(initialData?.deliveryRequestDate),
  })

  useEffect(() => {
    fetch("/api/clients?limit=200")
      .then((r) => r.json())
      .then((d) => setClients(d.data ?? []))
      .catch(() => {})
  }, [])

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.clientName.trim()) {
      toast.error("업체명은 필수입니다.")
      return
    }
    if (form.quantity && Number(form.quantity) < 0) {
      toast.error("수량은 0 이상이어야 합니다.")
      return
    }
    if (form.area && Number(form.area) < 0) {
      toast.error("면적은 0 이상이어야 합니다.")
      return
    }

    setLoading(true)
    try {
      const url = mode === "create" ? "/api/orders" : `/api/orders/${initialData?.id}`
      const method = mode === "create" ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.clientName,
          clientId: form.clientId || null,
          siteName: form.siteName,
          ...(mode === "edit" && canChangeStatus ? { status: form.status } : {}),
          quantity: form.quantity ? Number(form.quantity) : null,
          area: form.area ? form.area : null,
          frameType: form.frameType,
          glassType: form.glassType || null,
          productName: form.productName,
          noteDefect: form.noteDefect,
          noteJoint: form.noteJoint,
          orderReceivedDate: form.orderReceivedDate || null,
          productionRequestDate: form.productionRequestDate || null,
          deliveryRequestDate: form.deliveryRequestDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "오류가 발생했습니다.")
        return
      }
      toast.success(mode === "create" ? "발주가 등록되었습니다." : "발주가 수정되었습니다.")
      router.push(`/orders/${data.id}`)
      router.refresh()
    } catch {
      toast.error("서버 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>의뢰번호</Label>
            <Input
              value={form.orderNumber || (mode === "create" ? "저장 시 자동 부여" : "")}
              readOnly
              className="bg-gray-50 text-gray-400"
            />
          </div>
          {mode === "edit" && canChangeStatus && (
            <div className="space-y-1">
              <Label>상태</Label>
              <Select value={form.status} onValueChange={(v: string | null) => { if (v) set("status", v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>업체명 *</Label>
            <ClientCombobox
              value={form.clientName}
              clientId={form.clientId}
              clients={clients}
              onChange={(name, id) => setForm((prev) => ({ ...prev, clientName: name, clientId: id }))}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>현장명</Label>
            <Input value={form.siteName} onChange={(e) => set("siteName", e.target.value)} placeholder="현장명" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">사양 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label>수량</Label>
            <Input type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <Label>면적 (m²)</Label>
            <Input type="number" min="0" step="0.01" value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label>간봉</Label>
            <Input value={form.frameType} onChange={(e) => set("frameType", e.target.value)} placeholder="간봉" />
          </div>
          <div className="space-y-1">
            <Label>유리 종류</Label>
            <Select value={form.glassType} onValueChange={(v: string | null) => set("glassType", !v || v === "NONE" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">-</SelectItem>
                {Object.entries(GLASS_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-4 space-y-1">
            <Label>품명 / 규격</Label>
            <Input value={form.productName} onChange={(e) => set("productName", e.target.value)} placeholder="품명 및 상세 규격" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">일정</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>주문서도착일</Label>
            <Input type="date" value={form.orderReceivedDate} onChange={(e) => set("orderReceivedDate", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>생산의뢰일</Label>
            <Input type="date" value={form.productionRequestDate} onChange={(e) => set("productionRequestDate", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>납품요청일</Label>
            <Input type="date" value={form.deliveryRequestDate} onChange={(e) => set("deliveryRequestDate", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">비고</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>비고 (하자외)</Label>
            <Textarea value={form.noteDefect} onChange={(e) => set("noteDefect", e.target.value)} rows={2} placeholder="하자외 비고사항" />
          </div>
          <div className="space-y-1">
            <Label>비고 (접합, 3복층)</Label>
            <Textarea value={form.noteJoint} onChange={(e) => set("noteJoint", e.target.value)} rows={2} placeholder="접합, 3복층 비고사항" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "저장 중..." : mode === "create" ? "등록" : "수정"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
      </div>
    </form>
  )
}
