import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { addDays, subDays, subMonths, startOfWeek, endOfWeek } from "date-fns"
import * as dotenv from "dotenv"
dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  if (!adminUser) {
    console.error("ADMIN 유저가 없습니다. 먼저 회원가입 후 관리자 권한을 부여하세요.")
    process.exit(1)
  }
  const userId = adminUser.id
  console.log(`Using user: ${adminUser.fullName} (${adminUser.username})`)

  const clientData = [
    { name: "한국건설", shortCode: "HK", phone: "02-1234-5678", memo: "VIP 거래처" },
    { name: "서울유리", shortCode: "SY", phone: "02-9876-5432", memo: "정기 납품" },
    { name: "대한인테리어", shortCode: "DH", phone: "031-555-1234", memo: null },
    { name: "현대건축", shortCode: "HD", phone: "032-777-8888", memo: "현장 3곳" },
    { name: "강남리모델링", shortCode: "GN", phone: "010-1111-2222", memo: null },
    { name: "부산유리상사", shortCode: "BS", phone: "051-333-4444", memo: "부산 지역" },
    { name: "우미건설", shortCode: "UM", phone: "02-8888-9999", memo: "아파트 단지 전문" },
    { name: "효성중공업", shortCode: "HS", phone: "02-7777-6666", memo: "산업시설" },
  ]
  const clients: Record<string, string> = {}
  for (const c of clientData) {
    const existing = await prisma.client.findFirst({ where: { name: c.name } })
    if (existing) {
      clients[c.name] = existing.id
    } else {
      const created = await prisma.client.create({ data: c })
      clients[c.name] = created.id
    }
  }
  console.log(`거래처 ${Object.keys(clients).length}개 준비 완료`)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  const ordersToCreate = [
    // ── WAITING: 이번주 납품 예정 → 대시보드 "이번주 납품" 카드
    {
      orderNumber: "26-0001",
      clientName: "한국건설", clientId: clients["한국건설"],
      siteName: "강남 오피스텔 A동",
      quantity: 24, area: 48.5, frameType: "12A",
      glassType: "TPS" as const, productName: "24mm TPS",
      noteDefect: null, noteJoint: null,
      status: "WAITING" as const,
      orderReceivedDate: subDays(today, 3),
      productionRequestDate: subDays(today, 2),
      deliveryRequestDate: addDays(weekStart, 3),
      productionDate: null, lots: [],
    },
    // ── WAITING: 납품 여유 있음
    {
      orderNumber: "26-0002",
      clientName: "서울유리", clientId: clients["서울유리"],
      siteName: "마포 아파트 101동",
      quantity: 10, area: 18.0, frameType: "9A",
      glassType: "LAMINATED" as const, productName: "8.76 접합",
      noteDefect: null, noteJoint: "방음 강화 접합",
      status: "WAITING" as const,
      orderReceivedDate: subDays(today, 1),
      productionRequestDate: today,
      deliveryRequestDate: addDays(today, 7),
      productionDate: null, lots: [],
    },
    // ── WAITING: 지연 (납품일 경과) → 대시보드 "지연" 카드 + 목록 지연 배너
    {
      orderNumber: "26-0020",
      clientName: "우미건설", clientId: clients["우미건설"],
      siteName: "울산 신정동 아파트",
      quantity: 56, area: 112.0, frameType: "16A",
      glassType: "TPS" as const, productName: "32mm TPS",
      noteDefect: null, noteJoint: null,
      status: "WAITING" as const,
      orderReceivedDate: subDays(today, 12),
      productionRequestDate: subDays(today, 10),
      deliveryRequestDate: subDays(today, 1),
      productionDate: null, lots: [],
    },
    // ── PREPARING: 준비중 + 이번주 납품 → 대시보드
    {
      orderNumber: "26-0003",
      clientName: "대한인테리어", clientId: clients["대한인테리어"],
      siteName: "송파 상가 2층",
      quantity: 16, area: 32.0, frameType: "12A",
      glassType: "TPS" as const, productName: "24mm TPS",
      noteDefect: null, noteJoint: null,
      status: "PREPARING" as const,
      orderReceivedDate: subDays(today, 5),
      productionRequestDate: subDays(today, 4),
      preparingDate: subDays(today, 2),
      deliveryRequestDate: addDays(weekEnd, -1),
      productionDate: null,
      lots: [
        { lotName: "1조", quantity: 8, scheduledDate: addDays(today, 1), completedDate: null },
        { lotName: "2조", quantity: 8, scheduledDate: addDays(today, 2), completedDate: null },
      ],
    },
    // ── PREPARING: 지연 (납품일 경과) → 지연 배너
    {
      orderNumber: "26-0019",
      clientName: "부산유리상사", clientId: clients["부산유리상사"],
      siteName: "부산 해운대 상가",
      quantity: 25, area: 50.0, frameType: "12A",
      glassType: "TPS" as const, productName: "24mm TPS",
      noteDefect: null, noteJoint: null,
      status: "PREPARING" as const,
      orderReceivedDate: subDays(today, 15),
      productionRequestDate: subDays(today, 13),
      preparingDate: subDays(today, 10),
      deliveryRequestDate: subDays(today, 2),
      productionDate: null,
      lots: [
        { lotName: "1조", quantity: 15, scheduledDate: subDays(today, 5), completedDate: null },
        { lotName: "2조", quantity: 10, scheduledDate: subDays(today, 3), completedDate: null },
      ],
    },
    // ── PRODUCTION: 생산중 + 오늘 생산 조 → 캘린더 오늘 표시
    {
      orderNumber: "26-0005",
      clientName: "현대건축", clientId: clients["현대건축"],
      siteName: "인천 주상복합 B동",
      quantity: 40, area: 80.0, frameType: "16A",
      glassType: "TRIPLE" as const, productName: "3중 복층 42mm",
      noteDefect: "모서리 강화 처리 필요", noteJoint: null,
      status: "PRODUCTION" as const,
      orderReceivedDate: subDays(today, 10),
      productionRequestDate: subDays(today, 8),
      preparingDate: subDays(today, 6),
      productionDate: subDays(today, 2),
      deliveryRequestDate: addDays(today, 6),
      lots: [
        { lotName: "1조", quantity: 15, scheduledDate: today, completedDate: null },           // 오늘
        { lotName: "2조", quantity: 15, scheduledDate: addDays(today, 1), completedDate: null },
        { lotName: "3조", quantity: 10, scheduledDate: addDays(today, 2), completedDate: null },
      ],
    },
    // ── PRODUCTION: 생산중 + 오늘 생산 조 → 캘린더
    {
      orderNumber: "26-0006",
      clientName: "강남리모델링", clientId: clients["강남리모델링"],
      siteName: "강남 주택 리모델링",
      quantity: 18, area: 28.5, frameType: "12A",
      glassType: "TPS" as const, productName: "24mm TPS",
      noteDefect: null, noteJoint: "접합 별도 발주",
      status: "PRODUCTION" as const,
      orderReceivedDate: subDays(today, 7),
      productionRequestDate: subDays(today, 5),
      preparingDate: subDays(today, 4),
      productionDate: subDays(today, 1),
      deliveryRequestDate: addDays(today, 4),
      lots: [
        { lotName: "1조", quantity: 10, scheduledDate: today, completedDate: null },           // 오늘
        { lotName: "2조", quantity: 8, scheduledDate: addDays(today, 1), completedDate: null },
      ],
    },
    // ── PRODUCTION: 지연 (납품일 경과) → 지연 배너
    {
      orderNumber: "26-0018",
      clientName: "대한인테리어", clientId: clients["대한인테리어"],
      siteName: "서초 빌딩 1층 로비",
      quantity: 8, area: 12.0, frameType: "9A",
      glassType: "SINGLE" as const, productName: "단판 6mm",
      noteDefect: null, noteJoint: null,
      status: "PRODUCTION" as const,
      orderReceivedDate: subDays(today, 20),
      productionRequestDate: subDays(today, 18),
      preparingDate: subDays(today, 15),
      productionDate: subDays(today, 10),
      deliveryRequestDate: subDays(today, 3),
      lots: [
        { lotName: "1조", quantity: 8, scheduledDate: subDays(today, 8), completedDate: null },
      ],
    },
    // ── PRODUCTION_DONE: 생산완료, 출고 대기
    {
      orderNumber: "26-0007",
      clientName: "부산유리상사", clientId: clients["부산유리상사"],
      siteName: "부산 오피스 3층",
      quantity: 20, area: 38.0, frameType: "12A",
      glassType: "TPS" as const, productName: "TPS 24mm",
      noteDefect: null, noteJoint: null,
      status: "PRODUCTION_DONE" as const,
      orderReceivedDate: subDays(today, 14),
      productionRequestDate: subDays(today, 12),
      preparingDate: subDays(today, 10),
      productionDate: subDays(today, 7),
      productionDoneDate: subDays(today, 2),
      deliveryRequestDate: addDays(today, 1),
      lots: [
        { lotName: "1조", quantity: 10, scheduledDate: subDays(today, 4), completedDate: subDays(today, 3) },
        { lotName: "2조", quantity: 10, scheduledDate: subDays(today, 3), completedDate: subDays(today, 2) },
      ],
    },
    // ── PRODUCTION_DONE: 이번주 납품 예정 → 대시보드
    {
      orderNumber: "26-0008",
      clientName: "한국건설", clientId: clients["한국건설"],
      siteName: "성북 타운하우스",
      quantity: 35, area: 70.0, frameType: "16A",
      glassType: "TPS" as const, productName: "32mm TPS",
      noteDefect: null, noteJoint: null,
      status: "PRODUCTION_DONE" as const,
      orderReceivedDate: subDays(today, 18),
      productionRequestDate: subDays(today, 16),
      preparingDate: subDays(today, 13),
      productionDate: subDays(today, 10),
      productionDoneDate: subDays(today, 3),
      deliveryRequestDate: addDays(weekStart, 4),
      lots: [
        { lotName: "1조", quantity: 18, scheduledDate: subDays(today, 6), completedDate: subDays(today, 5) },
        { lotName: "2조", quantity: 17, scheduledDate: subDays(today, 4), completedDate: subDays(today, 3) },
      ],
    },
    // ── SHIPPED: 출고 완료
    {
      orderNumber: "26-0009",
      clientName: "효성중공업", clientId: clients["효성중공업"],
      siteName: "대구 신암6구역 재개발",
      quantity: 144, area: 288.0, frameType: "16A",
      glassType: "TPS" as const, productName: "32mm TPS",
      noteDefect: null, noteJoint: null,
      status: "SHIPPED" as const,
      orderReceivedDate: subDays(today, 30),
      productionRequestDate: subDays(today, 28),
      preparingDate: subDays(today, 25),
      productionDate: subDays(today, 20),
      productionDoneDate: subDays(today, 15),
      shipmentDate: subDays(today, 10),
      deliveryRequestDate: subDays(today, 8),
      lots: [
        { lotName: "1조", quantity: 50, scheduledDate: subDays(today, 22), completedDate: subDays(today, 21) },
        { lotName: "2조", quantity: 50, scheduledDate: subDays(today, 19), completedDate: subDays(today, 18) },
        { lotName: "3조", quantity: 44, scheduledDate: subDays(today, 17), completedDate: subDays(today, 16) },
      ],
    },
    // ── IN_DELIVERY: 배송중 → 이동현황 시연
    {
      orderNumber: "26-0010",
      clientName: "서울유리", clientId: clients["서울유리"],
      siteName: "용산 빌딩 로비",
      quantity: 12, area: 22.0, frameType: "9A",
      glassType: "LAMINATED" as const, productName: "접합 8.76",
      noteDefect: null, noteJoint: null,
      status: "IN_DELIVERY" as const,
      orderReceivedDate: subDays(today, 25),
      productionRequestDate: subDays(today, 23),
      preparingDate: subDays(today, 20),
      productionDate: subDays(today, 15),
      productionDoneDate: subDays(today, 10),
      shipmentDate: subDays(today, 5),
      deliveryStartDate: subDays(today, 2),
      deliveryRequestDate: today,
      lots: [
        { lotName: "1조", quantity: 12, scheduledDate: subDays(today, 12), completedDate: subDays(today, 11) },
      ],
    },
    // ── IN_DELIVERY: 배송중 + 이번주 납품 → 대시보드
    {
      orderNumber: "26-0011",
      clientName: "우미건설", clientId: clients["우미건설"],
      siteName: "창원 남문지구 물류센터",
      quantity: 442, area: 850.0, frameType: "16A",
      glassType: "TPS" as const, productName: "32mm TPS",
      noteDefect: null, noteJoint: null,
      status: "IN_DELIVERY" as const,
      orderReceivedDate: subDays(today, 40),
      productionRequestDate: subDays(today, 38),
      preparingDate: subDays(today, 35),
      productionDate: subDays(today, 28),
      productionDoneDate: subDays(today, 20),
      shipmentDate: subDays(today, 12),
      deliveryStartDate: subDays(today, 3),
      deliveryRequestDate: addDays(weekStart, 2),
      lots: [
        { lotName: "A조", quantity: 150, scheduledDate: subDays(today, 30), completedDate: subDays(today, 29) },
        { lotName: "B조", quantity: 150, scheduledDate: subDays(today, 26), completedDate: subDays(today, 25) },
        { lotName: "C조", quantity: 142, scheduledDate: subDays(today, 22), completedDate: subDays(today, 21) },
      ],
    },
    // ── ARRIVED: 도착, 수령 확인 대기 → 도착확인 버튼 시연
    {
      orderNumber: "26-0012",
      clientName: "현대건축", clientId: clients["현대건축"],
      siteName: "동대문 빌딩 외벽",
      quantity: 50, area: 100.0, frameType: "16A",
      glassType: "TRIPLE" as const, productName: "3중 복층 42mm",
      noteDefect: null, noteJoint: null,
      status: "ARRIVED" as const,
      orderReceivedDate: subDays(today, 35),
      productionRequestDate: subDays(today, 33),
      preparingDate: subDays(today, 30),
      productionDate: subDays(today, 24),
      productionDoneDate: subDays(today, 18),
      shipmentDate: subDays(today, 12),
      deliveryStartDate: subDays(today, 5),
      arrivedDate: subDays(today, 1),
      deliveryRequestDate: subDays(today, 2),
      lots: [
        { lotName: "1조", quantity: 25, scheduledDate: subDays(today, 26), completedDate: subDays(today, 25) },
        { lotName: "2조", quantity: 25, scheduledDate: subDays(today, 22), completedDate: subDays(today, 20) },
      ],
    },
    // ── RECEIVED: 정상 수령 완료 (정상 경로 완료)
    {
      orderNumber: "26-0013",
      clientName: "강남리모델링", clientId: clients["강남리모델링"],
      siteName: "강남 오피스 리모델링",
      quantity: 22, area: 44.0, frameType: "12A",
      glassType: "TPS" as const, productName: "24mm TPS",
      noteDefect: null, noteJoint: null,
      status: "RECEIVED" as const,
      orderReceivedDate: subMonths(today, 2),
      productionRequestDate: addDays(subMonths(today, 2), 2),
      preparingDate: addDays(subMonths(today, 2), 4),
      productionDate: addDays(subMonths(today, 2), 8),
      productionDoneDate: addDays(subMonths(today, 2), 12),
      shipmentDate: addDays(subMonths(today, 2), 14),
      deliveryStartDate: addDays(subMonths(today, 2), 15),
      arrivedDate: addDays(subMonths(today, 2), 16),
      receivedDate: addDays(subMonths(today, 2), 17),
      deliveryRequestDate: addDays(subMonths(today, 2), 15),
      lots: [
        { lotName: "1조", quantity: 22, scheduledDate: addDays(subMonths(today, 2), 9), completedDate: addDays(subMonths(today, 2), 11) },
      ],
    },
    // ── RECEIVED: 수령완료 (지난달, 차트용)
    {
      orderNumber: "26-0014",
      clientName: "한국건설", clientId: clients["한국건설"],
      siteName: "광진 빌라 단지",
      quantity: 30, area: 55.0, frameType: "12A",
      glassType: "TPS" as const, productName: "24mm TPS",
      noteDefect: null, noteJoint: null,
      status: "RECEIVED" as const,
      orderReceivedDate: subMonths(today, 1),
      productionRequestDate: addDays(subMonths(today, 1), 2),
      preparingDate: addDays(subMonths(today, 1), 3),
      productionDate: addDays(subMonths(today, 1), 7),
      productionDoneDate: addDays(subMonths(today, 1), 10),
      shipmentDate: addDays(subMonths(today, 1), 12),
      deliveryStartDate: addDays(subMonths(today, 1), 13),
      arrivedDate: addDays(subMonths(today, 1), 14),
      receivedDate: addDays(subMonths(today, 1), 15),
      deliveryRequestDate: addDays(subMonths(today, 1), 13),
      lots: [
        { lotName: "1조", quantity: 15, scheduledDate: addDays(subMonths(today, 1), 8), completedDate: addDays(subMonths(today, 1), 9) },
        { lotName: "2조", quantity: 15, scheduledDate: addDays(subMonths(today, 1), 9), completedDate: addDays(subMonths(today, 1), 10) },
      ],
    },
    // ── DEFECTIVE: 불량 발생 (도착 후 파손) → 되돌리기 시연
    {
      orderNumber: "26-0015",
      clientName: "효성중공업", clientId: clients["효성중공업"],
      siteName: "대구 신암 재개발 2차",
      quantity: 80, area: 160.0, frameType: "16A",
      glassType: "TPS" as const, productName: "32mm TPS",
      noteDefect: "도착 후 파손 3장 확인", noteJoint: null,
      status: "DEFECTIVE" as const,
      orderReceivedDate: subDays(today, 28),
      productionRequestDate: subDays(today, 26),
      preparingDate: subDays(today, 23),
      productionDate: subDays(today, 18),
      productionDoneDate: subDays(today, 12),
      shipmentDate: subDays(today, 8),
      deliveryStartDate: subDays(today, 4),
      arrivedDate: subDays(today, 2),
      deliveryRequestDate: subDays(today, 3),
      lots: [
        { lotName: "1조", quantity: 40, scheduledDate: subDays(today, 20), completedDate: subDays(today, 19) },
        { lotName: "2조", quantity: 40, scheduledDate: subDays(today, 16), completedDate: subDays(today, 14) },
      ],
    },
    // ── RETURN_RECEIVED: 반품 공장도착 (불량 경로 완료)
    {
      orderNumber: "26-0016",
      clientName: "서울유리", clientId: clients["서울유리"],
      siteName: "여의도 오피스 리모델링",
      quantity: 15, area: 30.0, frameType: "9A",
      glassType: "LAMINATED" as const, productName: "접합 8.76",
      noteDefect: "규격 오류 - 전량 반품", noteJoint: null,
      status: "RETURN_RECEIVED" as const,
      orderReceivedDate: subDays(today, 45),
      productionRequestDate: subDays(today, 43),
      preparingDate: subDays(today, 40),
      productionDate: subDays(today, 34),
      productionDoneDate: subDays(today, 28),
      shipmentDate: subDays(today, 22),
      deliveryStartDate: subDays(today, 15),
      arrivedDate: subDays(today, 12),
      returnReceivedDate: subDays(today, 8),
      deliveryRequestDate: subDays(today, 14),
      lots: [
        { lotName: "1조", quantity: 15, scheduledDate: subDays(today, 36), completedDate: subDays(today, 35) },
      ],
    },
    // ── HOLD: 보류
    {
      orderNumber: "26-0017",
      clientName: "현대건축", clientId: clients["현대건축"],
      siteName: "노원 주상복합 설계변경",
      quantity: 88, area: 176.0, frameType: "16A",
      glassType: "TRIPLE" as const, productName: "3중 복층 42mm",
      noteDefect: "설계 변경 검토 중 - 규격 미확정", noteJoint: null,
      status: "HOLD" as const,
      orderReceivedDate: subDays(today, 7),
      productionRequestDate: subDays(today, 5),
      deliveryRequestDate: addDays(today, 20),
      productionDate: null, lots: [],
    },
    // ── PREPARING: 대규모 발주, 조 3개 → 캘린더 풍부하게
    {
      orderNumber: "26-0004",
      clientName: "우미건설", clientId: clients["우미건설"],
      siteName: "울산 다운2지구 아파트",
      quantity: 60, area: 120.0, frameType: "16A",
      glassType: "TPS" as const, productName: "32mm TPS",
      noteDefect: null, noteJoint: null,
      status: "PREPARING" as const,
      orderReceivedDate: subDays(today, 8),
      productionRequestDate: subDays(today, 6),
      preparingDate: subDays(today, 3),
      deliveryRequestDate: addDays(today, 10),
      productionDate: null,
      lots: [
        { lotName: "A조", quantity: 20, scheduledDate: addDays(today, 3), completedDate: null },
        { lotName: "B조", quantity: 20, scheduledDate: addDays(today, 4), completedDate: null },
        { lotName: "C조", quantity: 20, scheduledDate: addDays(today, 5), completedDate: null },
      ],
    },
  ]

  let created = 0
  for (const o of ordersToCreate) {
    const { lots, ...orderData } = o
    const existing = await prisma.order.findFirst({ where: { orderNumber: o.orderNumber } })
    if (existing) {
      // 생산 조만 최신 데이터로 교체
      await prisma.productionLot.deleteMany({ where: { orderId: existing.id } })
      for (const lot of lots) {
        await prisma.productionLot.create({ data: { ...lot, orderId: existing.id } })
      }
      console.log(`  LOTS: ${o.orderNumber} (${lots.length}개 재생성)`)
      continue
    }
    const order = await prisma.order.create({
      data: {
        ...orderData,
        createdById: userId,
        activities: { create: { userId, action: "ORDER_CREATED" } },
      },
    })
    for (const lot of lots) {
      await prisma.productionLot.create({ data: { ...lot, orderId: order.id } })
    }
    created++
    console.log(`  CREATE: ${o.orderNumber} - ${o.clientName} / ${o.siteName} (${o.status})`)
  }

  console.log(`\n완료: 발주 ${created}건 추가, 총 발주 수: ${await prisma.order.count()}`)
  console.log("\n=== 기능별 데이터 요약 ===")
  console.log("대시보드 이번주납품:", ordersToCreate.filter(o => o.deliveryRequestDate >= weekStart && o.deliveryRequestDate <= weekEnd).length, "건")
  console.log("대시보드 지연:", ordersToCreate.filter(o => o.deliveryRequestDate < today && !["SHIPPED","IN_DELIVERY","ARRIVED","RECEIVED","RETURN_RECEIVED","HOLD"].includes(o.status)).length, "건")
  console.log("캘린더 오늘 생산 조:", "26-0005, 26-0006 각 1조")
  console.log("이동현황 시연: IN_DELIVERY(26-0010,11) → ARRIVED(26-0012) → RECEIVED(26-0013)")
  console.log("불량 경로 시연: DEFECTIVE(26-0015) → RETURN_RECEIVED(26-0016)")
  console.log("되돌리기 시연: 26-0015 (DEFECTIVE 상태에서 이전 단계로)")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
