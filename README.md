# STAQSS II Recruiting Dashboard

Static MVP for weekly JazzHR reporting. The app runs fully in the browser and stores weekly snapshots, comments, mappings, and presets in IndexedDB, which makes it easy to host on GitHub Pages without standing up a backend.

## What it does

- Imports JazzHR candidate and job exports in `CSV`, `XLSX`, or `XLS`
- Validates required columns before saving a weekly snapshot
- Creates versioned weekly snapshots and preserves history
- Normalizes JazzHR stages into business stages with editable default mappings
- Derives stage-entry events to calculate `This Week` and `To Date`
- Shows a summary matrix and a recruiter-friendly detail board
- Saves weekly position comments
- Exports an `XLSX` workbook and supports browser print for PDF sharing
- Includes guided demo snapshots for tester walkthroughs

## Local use

1. Open `index.html` in a browser, or serve the folder with a simple static server.
2. Validate one candidate export and one job export for a selected week.
3. Save the snapshot.
4. Review the Summary Dashboard and Detail Board.
5. Export the workbook or print the page to PDF.

## Hosting

This repo is designed for GitHub Pages.

- If the repository is `solkim8513/Recruiting-STAQSS2-`, the expected Pages URL is:
  `https://solkim8513.github.io/Recruiting-STAQSS2-/`
- Publish from the repository root on the default branch.
- The `.nojekyll` file is included for a clean static deploy.

## Notes

- Data is stored in the browser, not on a server.
- Historical snapshots remain reproducible because each saved week keeps its own mapping snapshot and derived records.
- Default stage mappings in Admin affect future imports.
