import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type OrderStatus =
  | "WAITING"
  | "PREPARING"
  | "PRODUCTION"
  | "PRODUCTION_DONE"
  | "SHIPPED"
  | "IN_DELIVERY"
  | "ARRIVED"
  | "RECEIVED"
  | "DEFECTIVE"
  | "RETURN_RECEIVED"
  | "HOLD"
  | "DELAYED"

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  WAITING:          { label: "대기",            className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  PREPARING:        { label: "생산 준비",        className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  PRODUCTION:       { label: "생산 중",          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  PRODUCTION_DONE:  { label: "생산완료",         className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  SHIPPED:          { label: "출고",             className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100" },
  IN_DELIVERY:      { label: "배송 중",          className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
  ARRIVED:          { label: "도착",             className: "bg-teal-100 text-teal-800 hover:bg-teal-100" },
  RECEIVED:         { label: "수령완료",         className: "bg-green-100 text-green-800 hover:bg-green-100" },
  DEFECTIVE:        { label: "불량/반품",         className: "bg-red-100 text-red-700 hover:bg-red-100" },
  RETURN_RECEIVED:  { label: "반품 공장도착",     className: "bg-rose-100 text-rose-700 hover:bg-rose-100" },
  HOLD:             { label: "보류",             className: "bg-red-100 text-red-700 hover:bg-red-100" },
  DELAYED:          { label: "지연",             className: "bg-red-50 text-red-600 hover:bg-red-50 font-semibold" },
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] ?? statusConfig.WAITING
  return <Badge className={cn("font-medium text-xs", config.className)}>{config.label}</Badge>
}

export { statusConfig }

// 완료 상태 (지연 판단에서 제외)
export const DONE_STATUSES: OrderStatus[] = ["RECEIVED", "RETURN_RECEIVED", "HOLD"]

// 공장 측 처리 가능 상태
export const FACTORY_STATUSES: OrderStatus[] = ["WAITING", "PREPARING", "PRODUCTION", "PRODUCTION_DONE", "SHIPPED"]
