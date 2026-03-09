import { useMemo } from 'react'
import { useDashboardStore } from '../store/useDashboardStore.js'
import { STAGE_COLORS, STAGE_ORDER } from '../plugins/csv/jazzhr-mapper.js'

export default function SummaryBar() {
  const candidates = useDashboardStore(s => s.candidates)
  const lastLoadedAt = useDashboardStore(s => s.lastLoadedAt)
  const total = candidates.length

  const summary = useMemo(() => {
    const counts = { Screened: 0, Submitted: 0, Interviewed: 0, Offered: 0, Hired: 0, Inactive: 0 }
    for (const c of candidates) counts[c.stageGroup] = (counts[c.stageGroup] || 0) + 1
    return counts
  }, [candidates])

  const activeTotal = STAGE_ORDER.reduce((acc, s) => acc + (summary[s] || 0), 0)

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Pipeline Overview</span>
          <span className="text-xs text-gray-400">—</span>
          <span className="text-xs text-gray-400">{total} total candidates</span>
        </div>
        {lastLoadedAt && (
          <span className="text-xs text-gray-400">
            Loaded {new Date(lastLoadedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        {STAGE_ORDER.map(stage => {
          const count = summary[stage] || 0
          const c = STAGE_COLORS[stage]
          const pct = activeTotal > 0 ? Math.round((count / activeTotal) * 100) : 0
          return (
            <div key={stage} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${c.bg} ${c.border}`}>
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              <span className={`text-sm font-medium ${c.text}`}>{stage}</span>
              <span className={`text-lg font-bold ${c.text}`}>{count}</span>
              {count > 0 && (
                <span className={`text-xs ${c.text} opacity-70`}>{pct}%</span>
              )}
            </div>
          )
        })}
        {summary.Inactive > 0 && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${STAGE_COLORS.Inactive.bg} ${STAGE_COLORS.Inactive.border}`}>
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-sm font-medium text-gray-400">Inactive</span>
            <span className="text-lg font-bold text-gray-400">{summary.Inactive}</span>
          </div>
        )}
      </div>
    </div>
  )
}
