import { useState } from 'react'
import { useDashboardStore } from './store/useDashboardStore.js'
import CSVUpload from './components/CSVUpload.jsx'
import SummaryBar from './components/SummaryBar.jsx'
import PipelineView from './components/PipelineView.jsx'
import PositionBoard from './components/PositionBoard.jsx'

const TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'positions', label: 'Position Board' },
]

export default function App() {
  const [tab, setTab] = useState('pipeline')
  const [showUpload, setShowUpload] = useState(false)
  const candidates = useDashboardStore(s => s.candidates)
  const lastLoadedAt = useDashboardStore(s => s.lastLoadedAt)
  const hasData = candidates.length > 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 leading-tight">NIS Recruiting Dashboard</h1>
              <p className="text-xs text-gray-400 leading-tight">STAQSS II · SAF/AQ</p>
            </div>
          </div>
          {hasData && (
            <nav className="flex gap-1 ml-4">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors
                    ${tab === t.id
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          )}
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {hasData ? 'Refresh Data' : 'Load JazzHR Export'}
        </button>
      </header>

      {/* Empty state */}
      {!hasData && (
        <div className="flex-1 flex flex-col items-center justify-center p-8"
          style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f0f9ff 100%)' }}>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 max-w-lg w-full text-center">

            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md"
              style={{ boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to get started</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Load your JazzHR candidate export to see the full recruiting pipeline for STAQSS II.
            </p>

            <button
              onClick={() => setShowUpload(true)}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              style={{ boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
            >
              Load JazzHR Export
            </button>

            {/* Steps */}
            <div className="mt-8 grid grid-cols-3 gap-4 text-left">
              {[
                { step: '1', label: 'Export CSV', desc: 'Reports → Candidate Export in JazzHR' },
                { step: '2', label: 'Upload Here', desc: 'Drag & drop or browse your file' },
                { step: '3', label: 'View Pipeline', desc: 'Kanban board and position table' },
              ].map(({ step, label, desc }) => (
                <div key={step} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center mb-2">{step}</div>
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">{label}</p>
                  <p className="text-xs text-gray-400 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Data flow */}
          <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
            <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">JazzHR</span>
            <span className="text-gray-300">──▶</span>
            <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">CSV Export</span>
            <span className="text-gray-300">──▶</span>
            <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 font-medium shadow-sm">Dashboard</span>
            <span className="text-gray-200">╌╌▶</span>
            <span className="px-3 py-1.5 bg-white border border-dashed border-gray-200 rounded-lg text-gray-300">API (future)</span>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {hasData && (
        <div className="flex-1 flex flex-col">
          <SummaryBar />
          {tab === 'pipeline' && <PipelineView />}
          {tab === 'positions' && <PositionBoard />}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && <CSVUpload onClose={() => setShowUpload(false)} />}
    </div>
  )
}
