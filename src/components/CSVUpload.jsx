import { useRef, useState } from 'react'
import { csvPlugin } from '../plugins/index.js'
import { DEFAULT_COLUMN_MAP } from '../plugins/csv/jazzhr-mapper.js'
import { useDashboardStore } from '../store/useDashboardStore.js'

export default function CSVUpload({ onClose }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [columnMap, setColumnMap] = useState({ ...DEFAULT_COLUMN_MAP })
  const fileRef = useRef()
  const setCandidates = useDashboardStore(s => s.setCandidates)

  const handleFile = (f) => {
    if (!f?.name.endsWith('.csv')) {
      setError('Please select a .csv file exported from JazzHR.')
      return
    }
    setFile(f)
    setError(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }

  const handleLoad = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const candidates = await csvPlugin.load(file, columnMap)
      setCandidates(candidates)
      onClose?.()
    } catch (err) {
      setError(`Failed to parse CSV: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Load JazzHR Data</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Export from JazzHR → Reports → Candidate Export → Upload here
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
              ${file ? 'border-green-400 bg-green-50' : ''}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <div>
                <div className="text-2xl mb-1">✓</div>
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-green-600 mt-1">
                  {(file.size / 1024).toFixed(1)} KB — click to replace
                </p>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2 text-gray-300">↑</div>
                <p className="font-medium text-gray-600">Drop CSV file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">JazzHR native export format (.csv)</p>
              </div>
            )}
          </div>

          {/* Advanced: column mapping */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>{showAdvanced ? '▾' : '▸'}</span> Advanced: column mapping
          </button>

          {showAdvanced && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-2">
              <p className="text-xs text-gray-500 mb-2">
                Map your JazzHR CSV column headers to dashboard fields.
                Leave blank to skip a field.
              </p>
              {Object.entries(columnMap).map(([field, header]) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="w-28 text-xs text-gray-500 font-mono shrink-0">{field}</span>
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => setColumnMap(prev => ({ ...prev, [field]: e.target.value }))}
                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-400"
                    placeholder={`JazzHR column header for "${field}"`}
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={!file || loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
              hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading…' : 'Load Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
