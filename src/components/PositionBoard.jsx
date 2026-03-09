import { useMemo } from 'react'
import { useDashboardStore } from '../store/useDashboardStore.js'
import { STAGE_ORDER, STAGE_COLORS } from '../plugins/csv/jazzhr-mapper.js'

function MiniPipeline({ counts }) {
  const total = STAGE_ORDER.reduce((a, s) => a + (counts[s] || 0), 0)
  if (total === 0) return <span className="text-xs text-gray-300">No active candidates</span>

  return (
    <div className="flex items-center gap-1">
      {STAGE_ORDER.map(stage => {
        const n = counts[stage] || 0
        if (n === 0) return null
        const c = STAGE_COLORS[stage]
        return (
          <span
            key={stage}
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text} border ${c.border}`}
            title={`${stage}: ${n}`}
          >
            {n}
          </span>
        )
      })}
    </div>
  )
}

export default function PositionBoard() {
  const candidates = useDashboardStore(s => s.candidates)

  const byJob = useMemo(() => {
    const groups = {}
    for (const c of candidates) {
      const job = c.jobTitle || 'Unknown Position'
      if (!groups[job]) groups[job] = []
      groups[job].push(c)
    }
    return groups
  }, [candidates])

  const pipelineByJob = useMemo(() => {
    const result = {}
    for (const [job, cands] of Object.entries(byJob)) {
      result[job] = { Screened: 0, Submitted: 0, Interviewed: 0, Offered: 0, Hired: 0, Inactive: 0 }
      for (const c of cands) result[job][c.stageGroup] = (result[job][c.stageGroup] || 0) + 1
    }
    return result
  }, [byJob])

  const rows = Object.entries(pipelineByJob)
    .map(([job, counts]) => ({
      job,
      counts,
      hired: counts.Hired || 0,
      active: STAGE_ORDER.filter(s => s !== 'Hired').reduce((a, s) => a + (counts[s] || 0), 0),
      inactive: counts.Inactive || 0,
      total: byJob[job]?.length || 0,
    }))
    .sort((a, b) => b.active - a.active)

  if (rows.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm">
        No positions to display. Load a JazzHR CSV to get started.
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Position</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Hired</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Active Pipeline</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Inactive</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.job}
                className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-800 line-clamp-2">{row.job}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {row.hired > 0 ? (
                    <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      {row.hired}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <MiniPipeline counts={row.counts} />
                </td>
                <td className="px-4 py-3 text-center text-gray-400 text-xs">{row.inactive || '—'}</td>
                <td className="px-4 py-3 text-center text-gray-500 font-medium">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
