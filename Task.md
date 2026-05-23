# 동일유리 생산관리 시스템 — 개발 태스크 목록

> PRD v2.0 기반 | 기술 스택: Next.js + Prisma + PostgreSQL + Vercel

---

## Phase 0. 프로젝트 초기 설정

- [ ] Next.js 프로젝트 생성 (`create-next-app`, TypeScript, App Router)
- [ ] Tailwind CSS 설치 및 설정
- [ ] shadcn/ui 초기화 및 공통 컴포넌트 추가 (Button, Input, Select, Badge, Card, Table, Dialog, Textarea)
- [ ] PostgreSQL 데이터베이스 생성 (로컬 개발용)
- [ ] Prisma 설치 및 `schema.prisma` 작성 (User, Order, Attachment, Activity 모델)
- [ ] Prisma 마이그레이션 초기 실행 (`prisma migrate dev`)
- [ ] 환경 변수 설정 (`.env.local` — `DATABASE_URL`, `NEXTAUTH_SECRET` 등)
- [ ] TanStack Query, React Hook Form, date-fns, Sentry 패키지 설치
- [ ] ESLint / Prettier 설정
- [ ] 폴더 구조 세팅 (`app/`, `components/`, `lib/`, `prisma/`)

---

## Phase 1. 인증 & 권한 관리

### 1-1. 회원가입 / 로그인
- [ ] NextAuth.js 설치 및 Credentials Provider 설정
- [ ] JWT + 리프레시 토큰 전략 구현
- [ ] 로그인 페이지 UI (`app/auth/login/page.tsx`)
- [ ] 회원가입 페이지 UI (`app/auth/register/page.tsx`) — 웹링크 기반 접근 제한
- [ ] 비밀번호 bcrypt 해시 처리
- [ ] 로그인 실패 5회 시 계정 잠금 로직
- [ ] 비밀번호 변경 기능 (마이페이지)
- [ ] 세션 타임아웃 30분 자동 로그아웃

### 1-2. 권한 관리
- [ ] `UserRole` (ADMIN / MANAGER / USER) 기반 미들웨어 작성
- [ ] 권한별 페이지 접근 제어 (Next.js `middleware.ts`)
- [ ] 관리자 페이지 — 가입 대기 목록 및 승인/거절 (`app/admin/users/page.tsx`)
- [ ] 관리자 페이지 — 사용자 목록 조회, 권한 변경, 계정 비활성화

### 1-3. 감시 & 보안 로그
- [ ] `Activity` 테이블에 로그인/로그아웃 기록 (IP, 시간, 성공/실패)
- [ ] 중요 작업(발주 삭제, 권한 변경) 감시 로그 저장
- [ ] CORS, Rate Limiting, CSRF 토큰 설정

---

## Phase 2. 발주 관리 (CRUD)

### 2-1. 발주 등록
- [ ] 발주 등록 폼 UI (`app/orders/new/page.tsx`)
  - [ ] 기본 정보 섹션: 의뢰번호(자동생성), 업체명, 현장명
  - [ ] 사양 정보 섹션: 수량, 면적, 간봉, 품명
  - [ ] 특수 정보 섹션: 비고(하자외), 비고(접합,3복층)
- [ ] 의뢰번호 자동 생성 함수 (`YY-XXXX` 형식, 중복 불가)
- [ ] 폼 유효성 검사 (업체명 필수, 수량/면적 음수 불가)
- [ ] `POST /api/orders` API Route 구현
- [ ] 발주 등록 시 Activity 로그 기록

### 2-2. 발주 목록 조회
- [ ] 발주 목록 페이지 UI (`app/orders/page.tsx`)
- [ ] `OrderDataTable` 컴포넌트 (TanStack Table)
  - [ ] 컬럼: 의뢰번호, 업체명, 현장명, 수량, 면적, 납품요청일, 진행상태
  - [ ] 전체 컬럼 오름/내림차순 정렬
  - [ ] 검색: 의뢰번호, 업체명, 현장명 빠른 검색
  - [ ] 필터: 진행상태, 업체명, 날짜 범위 (from~to)
  - [ ] 빠른 필터: "이번 주 납품", "지연 중인 발주"
  - [ ] 페이지네이션
- [ ] `GET /api/orders` API Route (쿼리 파라미터: status, clientName, dateFrom, dateTo, page, limit)
- [ ] 행 클릭 시 상세 모달, 우클릭 컨텍스트 메뉴 (수정/삭제)
- [ ] Excel 다운로드 기능 (전체 / 선택 행)

### 2-3. 발주 상세 조회
- [ ] 발주 상세 페이지 UI (`app/orders/[id]/page.tsx`)
- [ ] 전체 발주 정보 표시
- [ ] 일정 타임라인 표시
- [ ] 변경 이력 목록 표시 (Activity 로그)
- [ ] `GET /api/orders/[id]` API Route

### 2-4. 발주 수정
- [ ] 발주 수정 폼 UI (`app/orders/[id]/edit/page.tsx`)
- [ ] 출고완료 상태는 조회만 가능하도록 제한
- [ ] 납품요청일 변경 시 알림 트리거
- [ ] 변경 이력 자동 기록 (변경 전후 값 JSON 저장)
- [ ] `PATCH /api/orders/[id]` API Route

### 2-5. 발주 삭제
- [ ] 대기(WAITING) 상태에서만 삭제 가능 검증
- [ ] 삭제 확인 다이얼로그 UI
- [ ] 삭제 감시 로그 기록
- [ ] `DELETE /api/orders/[id]` API Route

---

## Phase 3. 일정 관리

- [ ] 일정 입력 UI — Datepicker 컴포넌트 (date-fns 기반)
  - [ ] 주문서도착일, 생산의뢰일, 납품요청일 입력
- [ ] 일정 논리 순서 검증: 주문서도착일 ≤ 생산의뢰일 ≤ 납품요청일
- [ ] 월별/주별 캘린더 뷰 페이지
- [ ] Gantt 차트 — 전체 발주 일정 시각화 (색상: 진행상태별)
- [ ] `PATCH /api/orders/[id]` 일정 업데이트 반영

---

## Phase 4. 생산 & 출고 처리

### 4-1. 생산 등록
- [ ] 발주 상세 페이지에 "생산 등록" 버튼 추가
- [ ] 생산일 자동 입력(현재 날짜) 또는 수동 입력 UI
- [ ] 상태 WAITING → PRODUCTION 자동 변경
- [ ] 생산 담당자 기록
- [ ] `PATCH /api/orders/[id]/production` API Route
- [ ] Activity 로그 기록 (`PRODUCTION_STARTED`)

### 4-2. 출고 등록
- [ ] 발주 상세 페이지에 "출고 등록" 버튼 추가
- [ ] 출고일 자동 입력(현재 날짜) 또는 수동 입력 UI
- [ ] 배송 방법 선택 (택배 / 직배송 / 픽업)
- [ ] 상태 PRODUCTION/PRODUCTION_DONE → SHIPPED 자동 변경
- [ ] `PATCH /api/orders/[id]/shipment` API Route
- [ ] Activity 로그 기록 (`SHIPMENT_COMPLETED`)

### 4-3. 상태 관리
- [ ] 상태 Badge 컴포넌트 (대기:회색, 생산중:노란색, 생산완료:파란색, 출고완료:초록색, 보류:빨간색)
- [ ] 보류 상태 처리 및 사유 입력 UI
- [ ] 상태 변경 이력 추적

---

## Phase 5. 대시보드 & 분석

### 5-1. 메인 대시보드 (`app/dashboard/page.tsx`)
- [ ] KPI 카드: 진행 중인 발주 수, 이번 주 납품 수, 지연 건수, 완료율(%)
- [ ] Pie 차트 — 상태별 발주 건수
- [ ] Bar 차트 — 업체별 발주 건수
- [ ] Line 차트 — 시간대별 완료 추세

### 5-2. 통계 & 리포트
- [ ] 월별 완료 건수 집계
- [ ] 평균 생산 기간 계산 (의뢰 등록일 → 출고일)
- [ ] 날짜 범위 선택 후 리포트 생성
- [ ] PDF 다운로드 기능

---

## Phase 6. 알림

- [ ] 인앱 알림 벨 아이콘 UI (우측 상단, 읽음/안읽음 상태)
- [ ] 알림 트리거 구현
  - [ ] 발주 생성/수정 시 담당자 알림
  - [ ] 납품요청일 3일 전 알림
  - [ ] 상태 변경 시 담당 영업사원 알림
- [ ] 알림 목록 조회 API

---

## Phase 7. 배포 & 운영

- [ ] Vercel 프로젝트 연결 및 환경 변수 설정 (`.env.production`)
- [ ] PostgreSQL 프로덕션 DB 연결 (Supabase 또는 Neon)
- [ ] Prisma 마이그레이션 프로덕션 적용
- [ ] Sentry 에러 추적 설정
- [ ] 일일 자동 백업 설정
- [ ] SSL 인증서 확인
- [ ] CI/CD 파이프라인 구성 (GitHub Actions → Vercel)

---

## 미래 확장 (Phase 2+)

- [ ] 의뢰서 이미지/PDF 업로드 및 OCR 자동 파싱 → 폼 자동 완성
- [ ] 이메일 알림 (중요 일정, 주간 리포트)
- [ ] 모바일 앱 (React Native)
- [ ] PDF 선적 명세서 자동 생성
- [ ] 재고 관리 시스템 연동
- [ ] AI 기반 생산 일정 최적화

---

## 체크 현황 요약

| Phase | 태스크 수 | 완료 |
|-------|----------|------|
| 0. 초기 설정 | 10 | 0 |
| 1. 인증 & 권한 | 15 | 0 |
| 2. 발주 관리 | 27 | 0 |
| 3. 일정 관리 | 6 | 0 |
| 4. 생산 & 출고 | 13 | 0 |
| 5. 대시보드 | 9 | 0 |
| 6. 알림 | 6 | 0 |
| 7. 배포 & 운영 | 7 | 0 |
| **합계** | **93** | **0** |
