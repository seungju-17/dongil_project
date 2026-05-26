"use client"

export function PrintButtons() {
  return (
    <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
      <button
        onClick={() => window.print()}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
      >
        🖨️ 인쇄
      </button>
      <button
        onClick={() => window.close()}
        className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300"
      >
        닫기
      </button>
    </div>
  )
}
