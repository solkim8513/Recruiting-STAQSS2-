import { useState, useMemo } from 'react'
import { useDashboardStore } from '../store/useDashboardStore.js'
import { STAGE_ORDER, STAGE_COLORS } from '../plugins/csv/jazzhr-mapper.js'

function CandidateCard({ candidate }) {
  const [expanded, setExpanded] = useState(false)
  const c = STAGE_COLORS[candidate.stageGroup]

  return (
    <div
      className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{candidate.fullName || '(No name)'}</p>
          {candidate.location && (
            <p className="text-xs text-gray-400 truncate">{candidate.location}</p>
          )}
        </div>
        {candidate.source && (
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
            {candidate.source}
          </span>
        )}
      </div>

      {candidate.stage && candidate.stage !== candidate.stageGroup && (
        <div className={`mt-2 text-xs px-2 py-0.5 rounded-full inline-block ${c.bg} ${c.text}`}>
          {candidate.stage}
        </div>
      )}

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
          {candidate.email && <p className="text-xs text-gray-500">{candidate.email}</p>}
          {candidate.phone && <p className="text-xs text-gray-500">{candidate.phone}</p>}
          {candidate.salary && <p className="text-xs text-gray-500">Salary: {candidate.salary}</p>}
          {candidate.clearance && <p className="text-xs text-gray-500">Clearance: {candidate.clearance}</p>}
          {candidate.lastActivity && (
            <p className="text-xs text-gray-400">Last activity: {candidate.lastActivity}</p>
          )}
          {candidate.notes && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3">{candidate.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

function PipelineColumn({ stage, candidates }) {
  const c = STAGE_COLORS[stage]
  return (
    <div className={`flex-1 min-w-48 rounded-xl border ${c.border} ${c.bg} flex flex-col`}>
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${c.border}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
          <span className={`text-sm font-semibold ${c.text}`}>{stage}</span>
        </div>
        <span className={`text-sm font-bold ${c.text}`}>{candidates.length}</span>
      </div>
      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-96">
        {candidates.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-4">No candidates</p>
        ) : (
          candidates.map((c, i) => <CandidateCard key={c.id || i} candidate={c} />)
        )}
      </div>
    </div>
  )
}

export default function PipelineView() {
  const candidates = useDashboardStore(s => s.candidates)
  const [selectedJob, setSelectedJob] = useState('__all__')

  const byJob = useMemo(() => {
    const groups = {}
    for (const c of candidates) {
      const job = c.jobTitle || 'Unknown Position'
      if (!groups[job]) groups[job] = []
      groups[job].push(c)
    }
    return groups
  }, [candidates])

  const jobs = Object.keys(byJob).sort()

  const filtered = selectedJob === '__all__'
    ? candidates
    : (byJob[selectedJob] || [])

  const activeFiltered = filtered.filter(c => c.stageGroup !== 'Inactive')
  const byStage = {}
  for (const stage of STAGE_ORDER) {
    byStage[stage] = activeFiltered.filter(c => c.stageGroup === stage)
  }

  return (
    <div className="p-6">
      {/* Job filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-sm text-gray-500 font-medium">Position:</span>
        <select
          value={selectedJob}
          onChange={e => setSelectedJob(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400 max-w-sm"
        >
          <option value="__all__">All Positions ({candidates.filter(c => c.stageGroup !== 'Inactive').length} active)</option>
          {jobs.map(job => (
            <option key={job} value={job}>
              {job} ({byJob[job].filter(c => c.stageGroup !== 'Inactive').length} active)
            </option>
          ))}
        </select>
        {selectedJob !== '__all__' && (
          <span className="text-xs text-gray-400">
            {filtered.filter(c => c.stageGroup === 'Inactive').length} inactive hidden
          </span>
        )}
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGE_ORDER.map(stage => (
          <PipelineColumn key={stage} stage={stage} candidates={byStage[stage]} />
        ))}
      </div>
    </div>
  )
}
