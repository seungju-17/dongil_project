"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"

interface User {
  id: string
  username: string
  fullName: string
  department: string | null
  phone: string | null
  role: string
  status: string
  lastLoginAt: string | null
  createdAt: string
}

const statusBadge: Record<string, { label: string; className: string }> = {
  PENDING: { label: "대기", className: "bg-yellow-100 text-yellow-800" },
  ACTIVE: { label: "활성", className: "bg-green-100 text-green-800" },
  INACTIVE: { label: "비활성", className: "bg-gray-100 text-gray-600" },
}

const roleLabel: Record<string, string> = { ADMIN: "관리자", MANAGER: "매니저", SITE_MANAGER: "현장관리자", USER: "사용자" }

interface Props {
  users: User[]
  currentUserId: string
}

export function AdminUsersClient({ users: initial, currentUserId }: Props) {
  const router = useRouter()
  const [users, setUsers] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)

  async function act(userId: string, action: string, role?: string) {
    setLoading(userId + action)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, role }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "오류"); return }

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u
          if (action === "approve") return { ...u, status: "ACTIVE" }
          if (action === "deactivate") return { ...u, status: "INACTIVE" }
          if (action === "changeRole" && role) return { ...u, role }
          return u
        })
      )
      toast.success("처리되었습니다.")
      router.refresh()
    } catch { toast.error("오류가 발생했습니다.") }
    finally { setLoading(null) }
  }

  const pending = users.filter((u) => u.status === "PENDING")
  const others = users.filter((u) => u.status !== "PENDING")

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-yellow-700 mb-2">가입 승인 대기 ({pending.length})</h3>
          <div className="border rounded-lg bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>아이디</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>처리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.department || "-"}</TableCell>
                    <TableCell>{u.phone || "-"}</TableCell>
                    <TableCell>{format(new Date(u.createdAt), "MM.dd")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => act(u.id, "approve")}
                          disabled={!!loading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          승인
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="text-red-600 border-red-200"
                          onClick={() => act(u.id, "reject")}
                          disabled={!!loading}
                        >
                          거절
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">전체 사용자 ({others.length})</h3>
        <div className="border rounded-lg bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>아이디</TableHead>
                <TableHead>부서</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>권한</TableHead>
                <TableHead>최근 로그인</TableHead>
                <TableHead>처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {others.map((u) => {
                const s = statusBadge[u.status] ?? statusBadge.INACTIVE
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.department || "-"}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${s.className}`}>{s.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) => act(u.id, "changeRole", v ?? undefined)}
                        disabled={u.id === currentUserId || !!loading}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">관리자</SelectItem>
                          <SelectItem value="MANAGER">매니저</SelectItem>
                          <SelectItem value="SITE_MANAGER">현장관리자</SelectItem>
                          <SelectItem value="USER">사용자</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {u.lastLoginAt ? format(new Date(u.lastLoginAt), "MM.dd HH:mm") : "-"}
                    </TableCell>
                    <TableCell>
                      {u.id !== currentUserId && u.status === "ACTIVE" && (
                        <Button
                          size="sm" variant="outline"
                          className="text-red-600 border-red-200 h-7 text-xs"
                          onClick={() => act(u.id, "deactivate")}
                          disabled={!!loading}
                        >
                          비활성화
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
