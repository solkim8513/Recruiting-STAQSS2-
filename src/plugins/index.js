/**
 * Data Source Plugin Interface
 *
 * Every data source plugin must export an object conforming to this shape:
 *
 * {
 *   id: string,                          // unique plugin identifier
 *   name: string,                        // display name
 *   description: string,
 *   load: (input) => Promise<Candidate[]> // transforms raw input → normalized records
 * }
 *
 * Normalized Candidate record shape:
 * {
 *   id: string,
 *   firstName: string,
 *   lastName: string,
 *   fullName: string,
 *   email: string,
 *   phone: string,
 *   jobTitle: string,       // position/job they applied to
 *   stage: string,          // raw stage from source
 *   stageGroup: string,     // normalized: Screened | Submitted | Interviewed | Offered | Hired | Inactive
 *   source: string,
 *   appliedDate: string,
 *   lastActivity: string,
 *   location: string,
 *   clearance: string,
 *   salary: string,
 *   notes: string,
 * }
 */

import { csvPlugin } from './csv/index.js'

const registry = {
  [csvPlugin.id]: csvPlugin,
  // future: jazzhrApiPlugin, googleSheetsPlugin, etc.
}

export function getPlugin(id) {
  return registry[id] ?? null
}

export function listPlugins() {
  return Object.values(registry)
}

export { csvPlugin }
