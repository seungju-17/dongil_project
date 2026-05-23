# 동일유리 생산관리 시스템 (PRD v2.0)

## 프로젝트 개요

| 항목 | 설명 |
|------|------|
| **프로젝트명** | 동일유리 생산관리 시스템 |
| **목표** | 엑셀 기반의 발주/입출고 관리를 웹 기반 SaaS로 전환 |
| **대상 사용자** | 동일유리 임직원 (영업, 생산팀, 관리팀) |
| **버전** | v2.0 (초기 MVP 이후 기능 확장) |
| **개발 기간** | (TBD) |
| **배포 플랫폼** | Vercel (프론트엔드), Node.js/Python (백엔드) |

---

## 1. 기능 요구사항 (FRQ)

### 1.1 인증 & 권한 관리 (Authentication & Authorization)

#### 1.1.1 회원 관리
- **회원가입**: 웹링크 기반 회원가입 (보안)
  - 입력 항목: 아이디(ID), 비밀번호, 사용자명, 부서, 연락처
  - 비밀번호 암호화: bcrypt 또는 Argon2 사용
  - #이메일 인증 옵션 (미래 확장)

- **로그인/로그아웃**
  - JWT 토큰 기반 인증 (무상태)
  - 리프레시 토큰 구현 (보안 강화)
  - 로그인 시도 실패 횟수 제한 (5회 이상 시 계정 일시 잠금)
  - 로그인/로그아웃 기록 남기기

- **비밀번호 관리**
  - 비밀번호 변경 기능
  - $비밀번호 재설정 메일 발송 (미래 확장)
  - 주기적 비밀번호 재설정 알림 (옵션)

#### 1.1.2 권한 관리
- **권한 레벨**: 관리자(Admin) / 매니저(Manager) / 사용자(User)
  - **관리자**: 전체 시스템 제어, 사용자 관리, 통계
  - **매니저**: 발주 관리, 일정 조정, 팀 조회
  - **사용자**: 할당된 발주건만 조회/수정

- **관리자 전용 페이지**
  - 가입 대기 사용자 목록 및 승인/거절
  - 가입된 사용자 목록 조회 (부서, 권한, 활동 상태)
  - 사용자 권한 변경 및 계정 비활성화
  - 시스템 감시 대시보드 (API 응답시간, 에러율 등)

#### 1.1.3 감시 & 보안
- 로그인 로그 기록 (IP, 시간, 성공/실패)
- 중요 작업 감시 로그 (발주 삭제, 권한 변경 등)
- 세션 타임아웃: 30분 미활동 시 자동 로그아웃

---

### 1.2 발주 관리 (Order Management)

#### 1.2.1 발주 등록 (Create)
- **입력 폼 구조**
  - 기본 정보: 의뢰번호(##-#### ex:00-0000), 업체명, 현장명
  - 사양 정보: 수량, 면적, 간봉, 품명
  - 특수 정보: 비고_하자외, 비고_접합,3복층
  - 담당자: 담당 영업사원, 현장 담당자
  
- **검증 규칙**
  - 의뢰번호: 중복 불가(Unique)
  - 업체명: 필수 입력
  - 수량/면적: 숫자 및 소수점 허용 (음수 불가)
  - 날짜 필드: YYYY-MM-DD 형식

- **자동 생성 기능**
  - 의뢰번호 자동 생성: YY-XXXX 형식
  - 생산의뢰일: 등록일 기준 계산 가능

- #**첨부파일 지원(미래확장)**
  - 설계도/이미지 업로드 (JPG, PNG, PDF)
  - 파일 크기 제한: 10MB
  - 저장소: AWS S3 또는 Vercel Blob Storage

#### 1.2.2 발주 조회 (Read - 상세)
- **상세 조회 페이지**
  - 발주 정보 전체 표시
  - 일정 타임라인 (Gantt 차트 옵션)
  - 첨부파일 목록 및 다운로드

#### 1.2.3 발주 수정 (Update)
- **수정 가능 항목**
  - 기본 정보
  - 납품요청일 변경 시 알림 발송
  - 비고 정보 수정

- **수정 제한**
  - 출고완료 상태: 조회만 가능 (감시 목적 제외)
  - 변경이력 기록 (언제, 누가, 무엇을 변경했는지)

#### 1.2.4 발주 삭제 (Delete)
- 대기 상태에서만 삭제 가능
- 삭제 기록 남기기 (감시 로그)

---

### 1.3 일정 관리 (Schedule Management)

#### 1.3.1 일정 입력 & 수정
- **처리 항목** (달력 Datepicker 입력)
  - 주문서도착일
  - 생산의뢰일
  - 납품요청일

- **일정 검증**
  - 논리적 순서 확인: 의뢰 → 생산 → 납품
  - 과거 날짜 입력 불가 (옵션)
  - 중복 일정 경고

- **(미정)일정 충돌 감지**
  - 해당 날짜에 다른 발주가 있으면 경고
  - 생산 라인 예약 충돌 표시 (미래 확장)

#### 1.3.2 일정 타임라인 뷰
- 월별/주별 캘린더 뷰
- Gantt 차트: 모든 발주의 일정을 시각화
- 색상 구분: 진행상태별로 다른 색상

---

### 1.4 생산 & 출고 처리 (Production & Shipment)

#### 1.4.1 생산 등록
- **생산 버튼 클릭 시**
  - 생산일 자동 입력 (현재 날짜) 또는 수동 입력
  - 진행상태: "대기" → "생산중"으로 자동 변경
  - 생산 담당자 기록

#### 1.4.2 출고 등록
- **출고 버튼 클릭 시**
  - 출고일 자동 입력 (현재 날짜) 또는 수동 입력
  - 진행상태: "생산완료" → "출고완료"로 자동 변경
  - 출고 담당자 기록
  - 배송 방법 선택 (택배, 직배송, 픽업 등)

#### 1.4.3 상태 관리
- **상태 흐름도**
  ```
  대기 → 생산중 → 생산완료 → 출고완료
              ↓
            보류 (특별한 경우)
  ```
- **상태별 표시**
  - 대기: 회색
  - 생산중: 노란색
  - 생산완료: 파란색
  - 출고완료: 초록색
  - 보류: 빨간색

#### 1.4.4 생산 이력 추적
- 상태 변경 기록: 언제, 누가, 어떤 상태로 변경
- 변경 사유 입력 (옵션)

---

### 1.5 대시보드 & 분석 (Dashboard & Analytics)

#### 1.5.1 메인 대시보드
- **주요 KPI**
  - 진행 중인 발주: X건
  - 이번 주 납품: X건
  - 지연 건수: X건
  - 완료율(%): X%

- **상태 분포 차트**
  - Pie 차트: 상태별 발주 건수
  - Bar 차트: 업체별 발주 건수
  - Line 차트: 시간대별 완료 추세

#### 1.5.2 발주 목록 (데이터 그리드)
- **컬럼 표시**
  - 의뢰번호, 업체명, 현장명, 수량, 면적, 간봉, 품명
  - 납품요청일, 생산일, 출고일, 진행상태, 담당자

- **정렬 & 필터링**
  - 모든 컬럼 정렬 가능 (오름차순/내림차순)
  - 필터: 업체명, 현장명, 진행상태, 담당자
  - 날짜 범위 필터 (from ~ to)
  - 검색: 의뢰번호, 업체명, 현장명으로 빠른 검색

- **고급 필터**
  - "이번 주 납품" 빠른 필터
  - "지연 중인 발주" 빠른 필터
  - "내가 담당한 발주" 필터

- **행 액션**
  - 클릭: 상세 정보 모달
  - 마우스 호버: 미리보기 팝업
  - 우클릭: 컨텍스트 메뉴 (수정, 삭제, 다운로드)

- **엑스포트**
  - Excel 다운로드 (선택된 행 또는 전체)
  - PDF 인쇄 기능

#### 1.5.3 통계 & 리포트
- **성과 지표**
  - 월별 완료 건수
  - 업체별 발주 외 현황
  - 평균 생산 기간 (의뢰 → 출고)

- **리포트 생성**
  - 날짜 범위 선택 후 리포트 생성
  - PDF 다운로드 가능

---

### 1.6 알림 & 커뮤니케이션 (Notifications)

#### 1.6.1 시스템 알림
- **인앱 알림**
  - 우측 상단 알림 벨 아이콘
  - 읽음/안 읽음 상태 관리

- **알림 트리거**
  - 발주 생성/수정: 담당자에게 알림
  - 일정 임박: 납품요청일 3일 전 알림
  - 상태 변경: 담당 영업사원에게 알림

#### 1.6.2 이메일 알림 (미래 확장)
- 중요 일정 미리 알림
- 발주 상태 변경 알림
- 주간 리포트 발송

---

## 2. 비기능 요구사항 (NFRS)

### 2.1 성능 (Performance)
- **API 응답시간**: 200ms 이하
- **페이지 로딩**: 2초 이하
- **동시 사용자 지원**: 최소 100명
- **데이터 캐싱**: 불변 데이터 캐싱 (1시간)
- **데이터베이스 쿼리 최적화**: 인덱싱 및 쿼리 플랜 분석

### 2.2 보안 (Security)
- **전송 보안**: HTTPS/TLS 1.2 이상
- **데이터 암호화**
  - 비밀번호: bcrypt (소금 생성)
  - 민감 정보: AES-256 암호화 (DB 저장 시)
- **API 보안**
  - CORS 설정 (동일 출처)
  - Rate limiting: IP당 분당 60 요청
  - CSRF 토큰 적용
  - SQL Injection: 파라미터화된 쿼리
- **로그 보안**: 민감 정보(비밀번호, 토큰) 로그에서 제외

### 2.3 확장성 (Scalability)
- **아키텍처**: 마이크로서비스 고려 (미래)
- **데이터베이스**: 파티셔닝 계획 (연도별)
- **스토리지**: 클라우드 저장소 활용

### 2.4 가용성 & 신뢰성
- **업타임**: 99.5% 이상
- **백업**: 일일 자동 백업 (최소 7일 보관)
- **재해 복구**: RTO 1시간, RPO 1시간
- **에러 처리**: 모든 예외 상황에 대한 graceful한 처리

### 2.5 호환성
- **브라우저**: Chrome, Firefox, Safari, Edge (최신 2개 버전)
- **반응형 디자인**: 모바일(320px), 태블릿(768px), 데스크톱(1024px)
- **접근성**: WCAG 2.1 AA 준수 (선택사항)

### 2.6 운영 & 유지보수
- **로깅**: 중앙화된 로깅 (예: ELK Stack)
- **모니터링**: 대시보드 모니터링 (Datadog, Sentry)
- **에러 추적**: 실시간 에러 알림
- **문서화**: API 문서 (Swagger), 운영 매뉴얼

---

## 3. 기술 스택 추천

### 3.1 스택 선택 (Vercel 최적화)

| 계층 | 기술 | 이유 |
|------|------|------|
| **프론트엔드** | Next.js + React | Vercel과 완벽 통합, SSR 지원, 빠른 성능 |
| **스타일링** | Tailwind CSS | 빠른 개발, 반응형 디자인 용이 |
| **데이터 관리** | TanStack Query | 서버 상태 관리, 캐싱 최적화 |
| **폼 관리** | React Hook Form | 가벼운 폼 검증, 성능 우수 |
| **UI 컴포넌트** | shadcn/ui | 생산성 높음, 커스터마이징 가능 |
| **날짜 처리** | date-fns | 가볍고 함수형 API |
| **백엔드** | Node.js + Express 또는 Python + FastAPI | Vercel Serverless Functions과 호환 |
| **데이터베이스** | PostgreSQL + Prisma | 강력한 쿼리, ORM 활용, 타입 안전성 |
| **인증** | NextAuth.js | Next.js 통합, JWT 지원, 여러 인증 전략 |
| **파일 저장소** | Vercel Blob Storage 또는 AWS S3 | 클라우드 기반, 확장성 |
| **로깅** | Sentry + Pino | 에러 추적, 성능 모니터링 |

### 3.2 배포 아키텍처
```
┌─────────────────────────────────────────┐
│       Vercel (프론트엔드 + API)         │
│  ┌─────────────────┬──────────────────┐ │
│  │  Next.js App    │ Serverless Fn    │ │
│  │  (React Pages)  │ (API Routes)     │ │
│  └─────────────────┴──────────────────┘ │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴────────────┐
        │                       │
   ┌────▼─────┐         ┌──────▼──────┐
   │PostgreSQL│         │  S3/Blob    │
   │Database  │         │  Storage    │
   └──────────┘         └─────────────┘
```

---

## 4. 데이터베이스 스키마 (Prisma)

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 사용자 테이블
model User {
  id                String      @id @default(cuid())
  username          String      @unique @db.VarChar(50)
  email             String      @unique @db.VarChar(100)
  passwordHash      String      @db.VarChar(255)
  fullName          String      @db.VarChar(100)
  department        String?     @db.VarChar(50)
  phone             String?     @db.VarChar(20)
  role              UserRole    @default(USER)
  status            UserStatus  @default(PENDING)
  lastLoginAt       DateTime?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  orders            Order[]
  activities        Activity[]
  
  @@index([role])
  @@index([status])
}

enum UserRole {
  ADMIN
  MANAGER
  USER
}

enum UserStatus {
  PENDING      // 승인 대기
  ACTIVE       // 활성
  INACTIVE     // 비활성
}

// 발주 테이블
model Order {
  id                String      @id @default(cuid())
  orderNumber       String      @unique @db.VarChar(50)
  clientName        String      @db.VarChar(100) // 업체명
  siteName          String?     @db.VarChar(100) // 현장명
  quantity          Int?                          // 수량
  area              Decimal?    @db.Decimal(10, 2) // 면적
  frameType         String?     @db.VarChar(50)   // 간봉
  productName       String?     @db.VarChar(100)  // 품명
  noteNonDefect     String?     @db.Text          // 비고_하자외
  noteJoint         String?     @db.Text          // 비고_접합,3복층
  
  // 일정
  orderReceivedDate DateTime?
  productionRequestDate DateTime?
  deliveryRequestDate DateTime?
  productionDate    DateTime?
  shipmentDate      DateTime?
  
  // 상태 & 담당자
  status            OrderStatus @default(WAITING)
  salesperson       String?     @db.VarChar(50)   // 담당 영업사원
  siteManager       String?     @db.VarChar(50)   // 현장 담당자
  assignedUserId    String?
  assignedUser      User?       @relation(fields: [assignedUserId], references: [id])
  
  // 메타
  createdAt         DateTime    @default(now())
  createdById       String
  createdBy         User        @relation("OrderCreatedBy", fields: [createdById], references: [id])
  updatedAt         DateTime    @updatedAt
  
  attachments       Attachment[]
  activities        Activity[]
  
  @@index([orderNumber])
  @@index([clientName])
  @@index([status])
  @@index([deliveryRequestDate])
}

enum OrderStatus {
  WAITING          // 대기
  PRODUCTION       // 생산중
  PRODUCTION_DONE  // 생산완료
  SHIPPED          // 출고완료
  HOLD             // 보류
}

// 첨부파일 테이블
model Attachment {
  id                String      @id @default(cuid())
  orderId           String
  order             Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  fileName          String      @db.VarChar(255)
  fileSize          Int         // 바이트
  fileType          String      @db.VarChar(20)  // jpg, png, pdf 등
  fileUrl           String      @db.Text         // S3/Blob URL
  
  createdAt         DateTime    @default(now())
  createdById       String
  createdBy         User        @relation(fields: [createdById], references: [id])
  
  @@index([orderId])
}

// 활동 로그 테이블
model Activity {
  id                String      @id @default(cuid())
  orderId           String?
  order             Order?      @relation(fields: [orderId], references: [id], onDelete: SetNull)
  userId            String?
  user              User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  action            ActivityType
  changes           Json?       // 변경 사항 추적용 JSON
  reason            String?     @db.Text
  ipAddress         String?     @db.VarChar(45)
  userAgent         String?     @db.Text
  
  createdAt         DateTime    @default(now())
  
  @@index([orderId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

enum ActivityType {
  ORDER_CREATED
  ORDER_UPDATED
  ORDER_DELETED
  STATUS_CHANGED
  PRODUCTION_STARTED
  SHIPMENT_COMPLETED
  USER_LOGIN
  USER_LOGOUT
  USER_CREATED
  USER_UPDATED
  USER_PERMISSION_CHANGED
}
```

---

## 5. 프론트엔드 컴포넌트 아키텍처

### 5.1 페이지 구조
```
app/
├── page.tsx                    // 홈 / 대시보드
├── layout.tsx                  // 레이아웃 (헤더, 사이드바)
├── auth/
│   ├── login/page.tsx          // 로그인
│   └── register/page.tsx       // 회원가입
├── orders/
│   ├── page.tsx                // 발주 목록 (데이터 그리드)
│   ├── [id]/page.tsx           // 발주 상세
│   ├── new/page.tsx            // 발주 등록 폼
│   └── [id]/edit/page.tsx      // 발주 수정 폼
├── dashboard/
│   └── page.tsx                // 통계 & 리포트
├── admin/
│   ├── users/page.tsx          // 사용자 관리
│   └── system/page.tsx         // 시스템 설정
└── api/
    ├── auth/
    │   ├── login.ts
    │   ├── logout.ts
    │   └── [...nextauth].ts
    ├── orders/
    │   ├── route.ts            // GET, POST
    │   └── [id]/route.ts       // GET, PATCH, DELETE
    ├── users/
    │   ├── route.ts
    │   └── [id]/route.ts
    └── activities/
        └── route.ts
```

### 5.2 주요 컴포넌트

#### 5.2.1 발주 목록 (OrderDataTable)
```tsx
// components/orders/OrderDataTable.tsx

"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useState, useMemo } from "react"
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useQuery } from "@tanstack/react-query"
import { Order, OrderStatus } from "@prisma/client"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

const statusColors: Record<OrderStatus, string> = {
  WAITING: "bg-gray-100 text-gray-800",
  PRODUCTION: "bg-yellow-100 text-yellow-800",
  PRODUCTION_DONE: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-green-100 text-green-800",
  HOLD: "bg-red-100 text-red-800",
}

const statusLabels: Record<OrderStatus, string> = {
  WAITING: "대기",
  PRODUCTION: "생산중",
  PRODUCTION_DONE: "생산완료",
  SHIPPED: "출고완료",
  HOLD: "보류",
}

export function OrderDataTable() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL")
  const [clientFilter, setClientFilter] = useState("")

  // 데이터 조회
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders")
      if (!res.ok) throw new Error("Failed to fetch orders")
      return res.json()
    },
  })

  // 필터링된 데이터
  const filteredOrders = useMemo(() => {
    return orders.filter((order: Order) => {
      const matchesSearch =
        order.orderNumber.includes(searchTerm) ||
        order.clientName.includes(searchTerm) ||
        order.siteName?.includes(searchTerm)
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter
      const matchesClient = !clientFilter || order.clientName === clientFilter

      return matchesSearch && matchesStatus && matchesClient
    })
  }, [orders, searchTerm, statusFilter, clientFilter])

  // 테이블 컬럼 정의
  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "orderNumber",
      header: "의뢰번호",
      cell: ({ row }) => (
        <Link href={`/orders/${row.original.id}`}>
          <Button variant="link">{row.original.orderNumber}</Button>
        </Link>
      ),
    },
    {
      accessorKey: "clientName",
      header: "업체명",
    },
    {
      accessorKey: "siteName",
      header: "현장명",
    },
    {
      accessorKey: "quantity",
      header: "수량",
    },
    {
      accessorKey: "area",
      header: "면적",
    },
    {
      accessorKey: "deliveryRequestDate",
      header: "납품요청일",
      cell: ({ row }) =>
        row.original.deliveryRequestDate
          ? formatDate(new Date(row.original.deliveryRequestDate))
          : "-",
    },
    {
      accessorKey: "status",
      header: "진행상태",
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status]}>
          {statusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "작업",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link href={`/orders/${row.original.id}/edit`}>
            <Button variant="outline" size="sm">
              수정
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => handleDeleteOrder(row.original.id)}>
            삭제
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: filteredOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
  })

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("이 발주를 삭제하시겠습니까?")) return
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" })
      if (res.ok) {
        alert("삭제되었습니다")
        // 페이지 새로고침 또는 재조회
        window.location.reload()
      }
    } catch (error) {
      alert("삭제 실패: " + error)
    }
  }

  if (isLoading) return <div>로딩 중...</div>

  return (
    <div className="w-full">
      {/* 필터 영역 */}
      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="의뢰번호, 업체명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="WAITING">대기</SelectItem>
            <SelectItem value="PRODUCTION">생산중</SelectItem>
            <SelectItem value="PRODUCTION_DONE">생산완료</SelectItem>
            <SelectItem value="SHIPPED">출고완료</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  데이터 없음
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          총 {filteredOrders.length}건 / {table.getState().pagination.pageIndex + 1}페이지
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            이전
          </Button>
          <Button
            variant="outline"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  )
}
```

#### 5.2.2 발주 등록 폼 (OrderForm)
```tsx
// components/orders/OrderForm.tsx

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Order } from "@prisma/client"

interface OrderFormProps {
  initialData?: Order
  onSubmit?: (data: Order) => void
}

export function OrderForm({ initialData, onSubmit }: OrderFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: initialData || {
      orderNumber: generateOrderNumber(),
      clientName: "",
      siteName: "",
      quantity: 0,
      area: 0,
      frameType: "",
      productName: "",
      noteNonDefect: "",
      noteJoint: "",
    },
  })

  const onSubmitHandler = async (data: any) => {
    setIsLoading(true)
    try {
      const method = initialData ? "PATCH" : "POST"
      const url = initialData ? `/api/orders/${initialData.id}` : "/api/orders"

      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      // 파일 추가
      files.forEach((file) => {
        formData.append("files", file)
      })

      const res = await fetch(url, {
        method,
        body: formData,
      })

      if (!res.ok) throw new Error("Failed to submit form")

      const result = await res.json()
      if (onSubmit) onSubmit(result)
      router.push(`/orders/${result.id}`)
      router.refresh()
    } catch (error) {
      alert("제출 실패: " + error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
      {/* 기본 정보 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderNumber">의뢰번호</Label>
              <Input id="orderNumber" {...register("orderNumber")} readOnly />
            </div>
            <div>
              <Label htmlFor="clientName">업체명 *</Label>
              <Input
                id="clientName"
                {...register("clientName", { required: "필수 입력" })}
                placeholder="업체명"
              />
              {errors.clientName && <span className="text-red-500">{errors.clientName.message}</span>}
            </div>
            <div>
              <Label htmlFor="siteName">현장명</Label>
              <Input id="siteName" {...register("siteName")} placeholder="현장명" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 사양 정보 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>사양 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="quantity">수량</Label>
              <Input id="quantity" type="number" {...register("quantity")} />
            </div>
            <div>
              <Label htmlFor="area">면적</Label>
              <Input id="area" type="number" step="0.01" {...register("area")} />
            </div>
            <div>
              <Label htmlFor="frameType">간봉</Label>
              <Input id="frameType" {...register("frameType")} />
            </div>
            <div>
              <Label htmlFor="productName">품명</Label>
              <Input id="productName" {...register("productName")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 특수 정보 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>특수 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="noteNonDefect">비고 (하자외)</Label>
            <Textarea id="noteNonDefect" {...register("noteNonDefect")} />
          </div>
          <div>
            <Label htmlFor="noteJoint">비고 (접합,3복층)</Label>
            <Textarea id="noteJoint" {...register("noteJoint")} />
          </div>
        </CardContent>
      </Card>

      {/* 파일 업로드 (미래확장) */}
      {/* <Card>
        <CardHeader>
          <CardTitle>첨부 파일</CardTitle>
          <CardDescription>설계도 등 관련 파일 업로드 (최대 10MB)</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            accept=".jpg,.png,.pdf"
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f) => (
                <li key={f.name} className="text-sm text-gray-600">
                  {f.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card> */

      {/* 버튼 */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "저장 중..." : "저장"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          취소
        </Button>
      </div>
    </form>
  )
}

function generateOrderNumber(): string {
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)  // YY 형식
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")
  return `${year}-${random}`  // YY-XXXX 형식
}
```

---

## 6. 백엔드 API 명세

### 6.1 발주 API

#### 6.1.1 리스트 조회
```http
GET /api/orders
```

**쿼리 파라미터**:
- `status` (선택): 진행상태 필터
- `clientName` (선택): 업체명 검색
- `dateFrom` (선택): 납품 요청일 검색 시작
- `dateTo` (선택): 납품 요청일 검색 종료
- `page` (선택): 페이지 번호 (기본값: 1)
- `limit` (선택): 페이지당 항목 수 (기본값: 20)

**응답**:
```json
{
  "data": [
    {
      "id": "xxx",
      "orderNumber": "26-0001",
      "clientName": "업체A",
      "status": "WAITING",
      ...
    }
  ],
  "total": 100,
  "page": 1
}
```

#### 6.1.2 상세 조회
```http
GET /api/orders/{id}
```

**응답**:
```json
{
  "id": "xxx",
  "orderNumber": "26-0001",
  "clientName": "업체A",
  "status": "WAITING",
  "attachments": [...],
  "activities": [...]
}
```

#### 6.1.3 생성
```http
POST /api/orders
Content-Type: application/json

{
  "clientName": "업체A",
  "siteName": "서울",
  "quantity": 10,
  "area": 50.5,
  "frameType": "알루미늄",
  "productName": "복층유리",
  ...
}
```

#### 6.1.4 생산 등록
```http
PATCH /api/orders/{id}/production
Content-Type: application/json

{
  "productionDate": "2026-03-24T10:00:00Z"
}
```

**로직**:
```typescript
// api/orders/[id]/production.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 인증 확인
    const session = await verifyAuth(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { productionDate } = await req.json()

    // 발주 조회
    const order = await prisma.order.findUnique({
      where: { id: params.id },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // 상태 검증: WAITING 상태에서만 생산 가능
    if (order.status !== "WAITING") {
      return NextResponse.json(
        { error: "Order cannot be moved to production" },
        { status: 400 }
      )
    }

    // 발주 업데이트
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        productionDate: new Date(productionDate),
        status: "PRODUCTION",
      },
    })

    // 활동 로그 기록
    await prisma.activity.create({
      data: {
        orderId: params.id,
        userId: session.userId,
        action: "PRODUCTION_STARTED",
        changes: {
          from: "WAITING",
          to: "PRODUCTION",
        },
      },
    })

    // 알림 발송 (비동기)
    notifyStatusChange(order.id, "PRODUCTION")

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Production registration failed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

#### 6.1.5 출고 등록
```http
PATCH /api/orders/{id}/shipment
Content-Type: application/json

{
  "shipmentDate": "2026-03-25T14:00:00Z",
  "shippingMethod": "택배"
}
```

**로직**:
```typescript
// api/orders/[id]/shipment.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyAuth(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { shipmentDate } = await req.json()

    const order = await prisma.order.findUnique({
      where: { id: params.id },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // 상태 검증: 생산 완료 또는 생산중 상태에서만 출고 가능
    if (!["PRODUCTION", "PRODUCTION_DONE"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order cannot be shipped" },
        { status: 400 }
      )
    }

    // 발주 업데이트
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        shipmentDate: new Date(shipmentDate),
        status: "SHIPPED",
      },
    })

    // 활동 로그
    await prisma.activity.create({
      data: {
        orderId: params.id,
        userId: session.userId,
        action: "SHIPMENT_COMPLETED",
        changes: {
          from: order.status,
          to: "SHIPPED",
        },
      },
    })

    // 알림 발송
    notifyStatusChange(order.id, "SHIPPED")

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Shipment registration failed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

### 6.2 인증 API

#### 6.2.1 로그인
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password123"
}
```

**응답**:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "xxx",
    "username": "user@example.com",
    "role": "USER"
  }
}
```

#### 6.2.2 로그아웃
```http
POST /api/auth/logout
```

---

## 7. 배포 및 운영

### 7.1 배포 체크리스트
- [ ] 환경 변수 설정 (.env.production)
- [ ] 데이터베이스 마이그레이션 (Prisma)
- [ ] SSL 인증서 설정
- [ ] 백업 자동화
- [ ] 모니터링 대시보드 설정
- [ ] CI/CD 파이프라인 구성

### 7.2 초기 배포 단계
1. **로컬 개발**: 로컬 환경 구성 및 기본 기능 테스트
2. **스테이징**: Vercel Preview로 전체 기능 테스트
3. **운영**: Vercel Production으로 배포

---

## 8. 향후 확장 기능 (Road Map)

### Phase 2 (3개월)
- [ ] 모바일 앱 (React Native)
- [ ] 전자 서명 기능
- [ ] PDF 선적 명세서 자동 생성

### Phase 3 (6개월)
- [ ] 재고 관리 시스템
- [ ] ERP 연동
- [ ] 고객 포탈 (주문 조회)

### Phase 4 (1년)
- [ ] AI 기반 생산 일정 최적화
- [ ] IoT 센서 연동 (실시간 공정 모니터링)

---

## 9. 참고 자료

- **Prisma Docs**: https://www.prisma.io/docs/
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TanStack Query**: https://tanstack.com/query/latest
- **NextAuth.js**: https://next-auth.js.org/

---

## 문서 버전 관리

| 버전 | 작성일 | 수정 사항 |
|------|--------|---------|
| 1.0 | 2026-03-17 | 초기 PRD 작성 |
| 2.0 | 2026-03-24 | 상세 기능 명세, 기술 스택, 코드 예시 추가 |

