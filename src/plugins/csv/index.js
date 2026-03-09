import Papa from 'papaparse'
import { mapRow, DEFAULT_COLUMN_MAP } from './jazzhr-mapper.js'

export const csvPlugin = {
  id: 'jazzhr-csv',
  name: 'JazzHR CSV Export',
  description: 'Upload a CSV exported from JazzHR (Reports → Candidate Export)',

  /**
   * @param {File} file - File object from <input type="file">
   * @param {object} columnMap - optional override of DEFAULT_COLUMN_MAP
   * @returns {Promise<import('../index.js').Candidate[]>}
   */
  load(file, columnMap = DEFAULT_COLUMN_MAP) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parse warnings:', results.errors)
          }
          const candidates = results.data.map(row => mapRow(row, columnMap))
          resolve(candidates)
        },
        error: (err) => reject(err),
      })
    })
  },
}
