const DB_NAME = "staqss_dashboard_v1";
const DB_VERSION = 1;
const IMPORT_STORE = "imports";
const SETTINGS_STORE = "settings";
const SETTINGS_KEY = "app_settings";

const DEFAULT_STAGE_ORDER = [
  "Screening",
  "Submitted/In Review",
  "Interview",
  "Offer",
  "Hired",
  "Other",
];

const CANDIDATE_SCHEMA = [
  { key: "job_department", label: "Job Department", aliases: ["job department", "department"], required: false },
  { key: "job_title", label: "Job Title", aliases: ["job title", "position"], required: true },
  { key: "job_status", label: "Job Status", aliases: ["job status", "status"], required: false },
  { key: "job_location", label: "Job Location", aliases: ["job location", "location"], required: false },
  { key: "clearance", label: "Clearance", aliases: ["clearance"], required: false },
  { key: "soc", label: "SOC", aliases: ["soc"], required: false },
  {
    key: "candidate_first_name",
    label: "Candidate First Name",
    aliases: ["candidate first name", "first name"],
    required: true,
  },
  {
    key: "candidate_last_name",
    label: "Candidate Last Name",
    aliases: ["candidate last name", "last name"],
    required: false,
  },
  { key: "workflow_stage", label: "Workflow Stage", aliases: ["workflow stage", "stage"], required: true },
  { key: "candidate_id", label: "Candidate ID", aliases: ["candidate id"], required: false },
  { key: "job_id", label: "Job ID", aliases: ["job id"], required: false },
  { key: "workflow_stage_id", label: "Workflow Stage ID", aliases: ["workflow stage id"], required: false },
  { key: "date_created", label: "Date Created", aliases: ["date created"], required: false },
  {
    key: "last_active_workflow_stage",
    label: "Last Active Workflow Stage",
    aliases: ["last active workflow stage"],
    required: false,
  },
  {
    key: "date_moved_into_current_stage",
    label: "Date Moved into Current Stage",
    aliases: ["date moved into current stage"],
    required: false,
  },
  { key: "source", label: "Source", aliases: ["source"], required: false },
  { key: "referrer", label: "Referrer", aliases: ["referrer"], required: false },
  { key: "recruiter", label: "Recruiter", aliases: ["recruiter"], required: false },
  { key: "apply_date", label: "Apply Date", aliases: ["apply date"], required: false },
];

const STAGE_INFERENCE_RULES = [
  { pattern: /screen|phone|reviewed|resume/i, stage: "Screening" },
  { pattern: /submitted|in review|submittal/i, stage: "Submitted/In Review" },
  { pattern: /interview|panel|onsite|technical/i, stage: "Interview" },
  { pattern: /offer|accepted/i, stage: "Offer" },
  { pattern: /hired|hire|start/i, stage: "Hired" },
];

const app = {
  db: null,
  imports: [],
  settings: getDefaultSettings(),
  ui: {
    activePanel: "import",
    selectedImportId: "",
    filters: getDefaultFilters(),
    pendingImport: null,
    fileSelection: getEmptyFileSelection(),
    toastTimer: null,
  },
};

const dom = {};

document.addEventListener("DOMContentLoaded", () => {
  initializeApp().catch((error) => {
    console.error(error);
    showToast("The dashboard could not finish loading. Check the browser console for details.");
    if (dom.storageStatus) {
      dom.storageStatus.textContent = "Load error";
    }
  });
});

async function initializeApp() {
  cacheDom();
  bindEvents();
  setDefaultWeekInput();
  updateWeekHint();

  app.db = await openDatabase();
  await loadPersistedState();

  if (app.imports.length) {
    app.ui.selectedImportId = getLatestImport()?.id || "";
    app.ui.activePanel = "summary";
  }

  renderAll();
}

function cacheDom() {
  const ids = [
    "storageStatus",
    "heroMetrics",
    "snapshotSelect",
    "snapshotHint",
    "reportBar",
    "reportTitle",
    "jobStatusFilter",
    "departmentFilter",
    "recruiterFilter",
    "stageFilter",
    "clearanceFilter",
    "locationFilter",
    "socFilter",
    "sourceFilter",
    "referrerFilter",
    "jobChecklist",
    "jobFilterCount",
    "jobSearchInput",
    "loadSavedFiltersButton",
    "saveSavedFiltersButton",
    "clearFiltersButton",
    "reportWeekInput",
    "reportWeekHint",
    "importFilesInput",
    "uploadStatusPanel",
    "validateImportButton",
    "saveImportButton",
    "loadDemoButton",
    "validationStatus",
    "validationResults",
    "importHistoryPanel",
    "summaryMetrics",
    "summaryLogicNote",
    "summaryTableContainer",
    "exportWorkbookButton",
    "printReportButton",
    "detailBoardContainer",
    "mappingTableBody",
    "newRawStageInput",
    "newRawStageMappedInput",
    "addMappingButton",
    "savedPresetSummary",
    "toast",
  ];

  ids.forEach((id) => {
    dom[id] = document.getElementById(id);
  });

  dom.tabButtons = [...document.querySelectorAll(".tab-link")];
  dom.panels = [...document.querySelectorAll(".panel")];
}

function bindEvents() {
  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      switchPanel(button.dataset.panelTarget);
    });
  });

  dom.reportWeekInput.addEventListener("change", updateWeekHint);
  dom.importFilesInput.addEventListener("change", handleImportFilesSelected);
  dom.validateImportButton.addEventListener("click", handleValidateImport);
  dom.saveImportButton.addEventListener("click", handleSaveImport);
  dom.loadDemoButton.addEventListener("click", handleLoadDemo);

  dom.snapshotSelect.addEventListener("change", (event) => {
    app.ui.selectedImportId = event.target.value;
    renderAll();
  });

  [
    dom.jobStatusFilter,
    dom.departmentFilter,
    dom.recruiterFilter,
    dom.stageFilter,
    dom.clearanceFilter,
    dom.locationFilter,
    dom.socFilter,
    dom.sourceFilter,
    dom.referrerFilter,
  ].forEach((element) => {
    element.addEventListener("change", updateFiltersFromControls);
  });

  dom.jobSearchInput.addEventListener("input", renderJobChecklist);
  dom.jobChecklist.addEventListener("change", handleJobChecklistChange);

  dom.clearFiltersButton.addEventListener("click", () => {
    app.ui.filters = getDefaultFilters();
    dom.jobSearchInput.value = "";
    renderAll();
  });

  dom.saveSavedFiltersButton.addEventListener("click", saveCurrentPreset);
  dom.loadSavedFiltersButton.addEventListener("click", loadSavedPreset);
  dom.exportWorkbookButton.addEventListener("click", exportWorkbook);
  dom.printReportButton.addEventListener("click", handlePrint);

  dom.detailBoardContainer.addEventListener("change", handleCommentChange);
  dom.importHistoryPanel.addEventListener("click", handleHistoryActions);
  dom.mappingTableBody.addEventListener("change", handleMappingChange);
  dom.addMappingButton.addEventListener("click", handleAddMapping);

  window.addEventListener("afterprint", () => {
    document.body.removeAttribute("data-printing");
  });
}

function getDefaultSettings() {
  return {
    explicitStageMappings: {
      Screen: "Screening",
      Screening: "Screening",
      "Submitted/In Review": "Submitted/In Review",
      Interview: "Interview",
      Offer: "Offer",
      Hired: "Hired",
      "Offer Accepted": "Offer",
    },
    savedPreset: getDefaultFilters(),
  };
}

function getDefaultFilters() {
  return {
    jobStatus: "All",
    department: "",
    recruiter: "",
    stage: "",
    clearance: "",
    location: "",
    soc: "",
    source: "",
    referrer: "",
    jobIds: [],
  };
}

function getEmptyFileSelection() {
  return {
    all: [],
    candidate: null,
    unknown: [],
    duplicates: [],
  };
}

async function loadPersistedState() {
  const settingsRecord = await idbGet(SETTINGS_STORE, SETTINGS_KEY);
  if (settingsRecord?.value) {
    app.settings = {
      ...getDefaultSettings(),
      ...settingsRecord.value,
      explicitStageMappings: {
        ...getDefaultSettings().explicitStageMappings,
        ...(settingsRecord.value.explicitStageMappings || {}),
      },
    };
  }

  const imports = await idbGetAll(IMPORT_STORE);
  app.imports = sortImportsForUi(imports);
  app.ui.filters = cloneFilters(app.settings.savedPreset || getDefaultFilters());
}

function renderAll() {
  renderHeroMetrics();
  renderSnapshotSelector();
  renderReportBar();
  renderImportSelection();
  renderImportValidation();
  renderImportHistory();
  renderSummaryDashboard();
  renderDetailBoard();
  renderAdminPanel();
  syncPanels();
}

function switchPanel(panelName) {
  app.ui.activePanel = panelName;
  syncPanels();
}

function syncPanels() {
  dom.tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panelTarget === app.ui.activePanel);
  });

  dom.panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === app.ui.activePanel);
  });

  const showReportBar = app.ui.activePanel === "summary" || app.ui.activePanel === "detail";
  dom.reportBar.classList.toggle("hidden", !showReportBar);
}

function renderHeroMetrics() {
  const latestImport = getLatestImport();
  if (!latestImport) {
    dom.storageStatus.textContent = "Browser workspace ready";
    dom.heroMetrics.innerHTML = createMetricCards([
      { label: "Snapshots", value: "0" },
      { label: "Positions", value: "0" },
      { label: "Candidates", value: "0" },
      { label: "Comments", value: "0" },
    ]);
    return;
  }

  const commentCount = app.imports.reduce((count, snapshot) => {
    return count + Object.values(snapshot.commentsByJobId || {}).filter((value) => String(value).trim()).length;
  }, 0);

  dom.storageStatus.textContent = `IndexedDB workspace active - ${app.imports.length} versioned snapshot${app.imports.length === 1 ? "" : "s"}`;
  dom.heroMetrics.innerHTML = createMetricCards([
    { label: "Snapshots", value: String(app.imports.length) },
    { label: "Positions", value: String(latestImport.positions.length) },
    { label: "Candidates", value: String(latestImport.candidateRecords.length) },
    { label: "Comments", value: String(commentCount) },
  ]);
}

function renderSnapshotSelector() {
  const currentSelection = getSelectedImport()?.id || getLatestImport()?.id || "";
  if (!currentSelection && app.imports.length) {
    app.ui.selectedImportId = app.imports[0].id;
  }

  if (!app.imports.length) {
    dom.snapshotSelect.innerHTML = '<option value="">No saved snapshots</option>';
    dom.snapshotSelect.disabled = true;
    dom.snapshotHint.textContent = "No weekly snapshots yet. Start in Import Center or load the guided demo.";
    return;
  }

  dom.snapshotSelect.disabled = false;
  dom.snapshotSelect.innerHTML = app.imports
    .map((snapshot) => {
      const selected = snapshot.id === (app.ui.selectedImportId || currentSelection) ? "selected" : "";
      return `<option value="${escapeHtml(snapshot.id)}" ${selected}>${escapeHtml(
        `${snapshot.weekLabel} - v${snapshot.version}`
      )}</option>`;
    })
    .join("");

  const selectedImport = getSelectedImport();
  if (selectedImport) {
    dom.snapshotHint.textContent = `Saved ${formatDateTime(selectedImport.createdAt)} from ${selectedImport.sourceFiles.candidateFileName}`;
  }
}

function renderReportBar() {
  const selectedImport = getSelectedImport();
  if (!selectedImport) {
    dom.reportTitle.textContent = "Choose a weekly snapshot";
    populateSelect(dom.departmentFilter, []);
    populateSelect(dom.recruiterFilter, []);
    populateSelect(dom.stageFilter, []);
    populateSelect(dom.clearanceFilter, []);
    populateSelect(dom.locationFilter, []);
    populateSelect(dom.socFilter, []);
    populateSelect(dom.sourceFilter, []);
    populateSelect(dom.referrerFilter, []);
    dom.jobChecklist.innerHTML = '<div class="empty-state compact-empty">No jobs available yet.</div>';
    dom.jobFilterCount.textContent = "0 jobs selected";
    return;
  }

  const stages = getVisibleStages(selectedImport);
  const positions = selectedImport.positions;
  const candidateRecords = selectedImport.candidateRecords;

  dom.reportTitle.textContent = `${selectedImport.weekLabel} - v${selectedImport.version}`;
  dom.jobStatusFilter.value = app.ui.filters.jobStatus;

  populateSelect(dom.departmentFilter, getUniqueValues(positions, "jobDepartment"), app.ui.filters.department);
  populateSelect(dom.recruiterFilter, getUniqueValues(positions, "recruiter"), app.ui.filters.recruiter);
  populateSelect(dom.stageFilter, stages, app.ui.filters.stage);
  populateSelect(dom.clearanceFilter, getUniqueValues(positions, "clearance"), app.ui.filters.clearance);
  populateSelect(dom.locationFilter, getUniqueValues(positions, "jobLocation"), app.ui.filters.location);
  populateSelect(dom.socFilter, getUniqueValues(positions, "soc"), app.ui.filters.soc);
  populateSelect(dom.sourceFilter, getUniqueValues(candidateRecords, "source"), app.ui.filters.source);
  populateSelect(dom.referrerFilter, getUniqueValues(candidateRecords, "referrer"), app.ui.filters.referrer);
  renderJobChecklist();
}

function renderJobChecklist() {
  const selectedImport = getSelectedImport();
  if (!selectedImport) {
    dom.jobChecklist.innerHTML = '<div class="empty-state compact-empty">No jobs available yet.</div>';
    dom.jobFilterCount.textContent = "0 jobs selected";
    return;
  }

  const searchTerm = slugify(dom.jobSearchInput.value || "");
  const filteredPositions = selectedImport.positions.filter((position) => {
    if (!searchTerm) {
      return true;
    }
    const haystack = slugify(`${position.jobTitle} ${position.jobId}`);
    return haystack.includes(searchTerm);
  });

  if (!filteredPositions.length) {
    dom.jobChecklist.innerHTML = '<div class="empty-state compact-empty">No jobs match this search.</div>';
  } else {
    dom.jobChecklist.innerHTML = filteredPositions
      .map((position) => {
        const checked = app.ui.filters.jobIds.includes(position.jobId) ? "checked" : "";
        const label = `${position.jobTitle || "Untitled Position"} (${position.jobId})`;
        const meta = [position.jobDepartment, position.jobStatus, position.recruiter].filter(Boolean).join(" - ");
        return `
          <label class="job-option">
            <input type="checkbox" value="${escapeHtml(position.jobId)}" ${checked}>
            <span>
              ${escapeHtml(label)}
              <small>${escapeHtml(meta || "No additional metadata")}</small>
            </span>
          </label>
        `;
      })
      .join("");
  }

  dom.jobFilterCount.textContent = `${app.ui.filters.jobIds.length} job${app.ui.filters.jobIds.length === 1 ? "" : "s"} selected`;
}

function renderImportSelection() {
  const selection = app.ui.fileSelection;
  const slots = [
    {
      title: "Candidate export",
      item: selection.candidate,
      emptyText: "No candidate file selected yet.",
    },
  ];

  const extraNotes = [];
  if (selection.duplicates.length) {
    extraNotes.push(`${selection.duplicates.length} extra file(s) were ignored. This workflow only needs one candidate export.`);
  }
  if (selection.unknown.length) {
    extraNotes.push(`${selection.unknown.length} file(s) did not match the candidate export template.`);
  }

  dom.uploadStatusPanel.innerHTML = [
    ...slots.map(({ title, item, emptyText }) => {
      if (!item) {
        return `
          <article class="upload-slot">
            <p class="sidebar-label">${escapeHtml(title)}</p>
            <p class="sidebar-hint">${escapeHtml(emptyText)}</p>
          </article>
        `;
      }

      const slotClass = item.detection.confidence === "high" ? "upload-slot is-ready" : "upload-slot is-warning";
      const meta = [
        `${item.sheet.rows.length} row${item.sheet.rows.length === 1 ? "" : "s"}`,
        "Candidate template detected",
        item.detection.confidence === "high" ? "Confident match" : "Check before validating",
      ];

      return `
        <article class="${slotClass}">
          <p class="sidebar-label">${escapeHtml(title)}</p>
          <p class="upload-title">${escapeHtml(item.file.name)}</p>
          <p class="upload-file">${escapeHtml(item.summary)}</p>
          <div class="upload-meta">
            ${meta.map((entry) => `<span class="upload-pill">${escapeHtml(entry)}</span>`).join("")}
          </div>
        </article>
      `;
    }),
    extraNotes.length
      ? `<article class="upload-slot is-warning"><p class="sidebar-label">Upload notes</p><p class="upload-file">${escapeHtml(
          extraNotes.join(" ")
        )}</p></article>`
      : "",
  ].join("");
}

function renderImportValidation() {
  const pending = app.ui.pendingImport;
  if (!pending) {
    dom.validationStatus.textContent = "Waiting for files";
    const hasSelectedFiles = app.ui.fileSelection.candidate;
    dom.validationResults.innerHTML = hasSelectedFiles
      ? "Detected upload is shown above. Click Validate files to review the snapshot preview and any template issues."
      : "Upload the weekly candidate export, then validate before saving.";
    dom.saveImportButton.disabled = true;
    return;
  }

  dom.validationStatus.textContent = pending.valid ? "Ready to save" : "Validation issue";

  const missingCandidate = pending.candidateReview.missingRequired;
  const stageMappings = Object.entries(pending.mappingSnapshot);
  const hasBlockingIssues = Boolean(missingCandidate.length);
  const bannerClass = hasBlockingIssues ? "validation-banner is-error" : pending.warnings.length ? "validation-banner is-warning" : "validation-banner is-success";
  const bannerText = hasBlockingIssues
    ? "Validation found blocking issues. The missing required fields below must be fixed before a snapshot can be saved."
    : pending.warnings.length
      ? "Validation passed in candidate-only mode. The app will derive positions from the candidate export and track changes by weekly snapshot."
      : "Validation passed. The candidate export is ready to save as a weekly snapshot.";

  dom.validationResults.innerHTML = `
    <div class="${bannerClass}">
      <strong>${hasBlockingIssues ? "Validation issue" : "Validation complete"}</strong>
      <span>${escapeHtml(bannerText)}</span>
    </div>
    <div class="validation-grid">
      <div class="validation-card">
        <span>Candidate rows</span>
        <strong>${formatNumber(pending.candidateRows.length)}</strong>
      </div>
      <div class="validation-card">
        <span>Derived positions</span>
        <strong>${formatNumber(pending.positions.length)}</strong>
      </div>
      <div class="validation-card">
        <span>Weekly logic</span>
        <strong>Snapshot-based</strong>
      </div>
      <div class="validation-card">
        <span>Snapshot version</span>
        <strong>v${pending.version}</strong>
      </div>
    </div>
    <div class="validation-lists">
      <div class="validation-list ${missingCandidate.length ? "is-error" : "is-success"}">
        <h3>Candidate file checks</h3>
        ${renderListOrSuccess(missingCandidate, "All required candidate columns found.")}
      </div>
      <div class="validation-list ${pending.warnings.length ? "is-warning" : "is-success"}">
        <h3>Candidate-only notes</h3>
        ${renderListOrSuccess(pending.warnings, "No optional-field warnings detected.")}
      </div>
      <div class="validation-list ${stageMappings.length ? "is-success" : ""}">
        <h3>Stage mappings in this save</h3>
        ${
          stageMappings.length
            ? `<ul>${stageMappings
                .map(([rawStage, mappedStage]) => `<li>${escapeHtml(rawStage)} -> ${escapeHtml(mappedStage)}</li>`)
                .join("")}</ul>`
            : "<p>No workflow stages detected.</p>"
        }
      </div>
      <div class="validation-list is-success">
        <h3>This Week logic</h3>
        <p>This Week counts stage changes first observed in the selected weekly snapshot. To Date stays cumulative across all saved snapshots.</p>
      </div>
    </div>
  `;

  dom.saveImportButton.disabled = !pending.valid;
}

function renderImportHistory() {
  if (!app.imports.length) {
    dom.importHistoryPanel.innerHTML =
      '<div class="empty-state compact-empty">Snapshot history will appear here after the first save.</div>';
    return;
  }

  dom.importHistoryPanel.innerHTML = `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Week</th>
            <th>Version</th>
            <th>Saved</th>
            <th>Candidates</th>
            <th>Positions</th>
            <th>Input mode</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${app.imports
            .map((snapshot) => {
              return `
                <tr>
                  <td>${escapeHtml(snapshot.weekLabel)}</td>
                  <td>v${snapshot.version}</td>
                  <td>${escapeHtml(formatDateTime(snapshot.createdAt))}</td>
                  <td>${formatNumber(snapshot.candidateRecords.length)}</td>
                  <td>${formatNumber(snapshot.positions.length)}</td>
                  <td>Candidate-only</td>
                  <td>
                    <button type="button" class="ghost-button" data-open-snapshot="${escapeHtml(snapshot.id)}">Open</button>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSummaryDashboard() {
  const context = buildReportContext();
  if (!context) {
    dom.summaryMetrics.innerHTML = "";
    dom.summaryLogicNote.innerHTML = "";
    dom.summaryTableContainer.innerHTML = "Save a weekly snapshot to generate the summary matrix.";
    return;
  }

  dom.summaryMetrics.innerHTML = createMetricCards([
    { label: "Positions in scope", value: String(context.positions.length) },
    { label: "Current candidates", value: String(context.currentRecords.length) },
    { label: "Updated this week", value: String(context.weeklyEvents.length) },
    { label: "Open jobs", value: String(context.positions.filter((position) => position.jobStatus === "Open").length) },
  ]);

  dom.summaryLogicNote.innerHTML = `
    <strong>This Week logic:</strong>
    counts candidates whose stage change was first observed in this saved weekly snapshot.
    <strong>To Date:</strong>
    cumulative observed stage entries across all saved snapshots through this week.
  `;

  if (!context.positions.length) {
    dom.summaryTableContainer.innerHTML =
      '<div class="empty-state compact-empty">No positions match the current filter set.</div>';
    return;
  }

  const headerRow = context.stages
    .map((stage) => `<th colspan="2" class="summary-stage ${getStageClassName(stage)}">${escapeHtml(stage)}</th>`)
    .join("");
  const subHeaderRow = context.stages
    .map((stage) => `<th class="summary-subhead ${getStageClassName(stage)}">This Week</th><th class="summary-subhead ${getStageClassName(stage)}">To Date</th>`)
    .join("");

  const bodyRows = context.positions
    .map((position, index) => {
      const stageCells = context.stages
        .map((stage) => {
          const thisWeek = context.weeklyEvents.filter(
            (event) => event.jobId === position.jobId && event.normalizedStage === stage
          ).length;
          const toDate = context.cumulativeEvents.filter(
            (event) => event.jobId === position.jobId && event.normalizedStage === stage
          ).length;
          return `<td class="summary-number ${getStageClassName(stage)}">${formatNumber(thisWeek)}</td><td class="summary-number ${getStageClassName(stage)}">${formatNumber(toDate)}</td>`;
        })
        .join("");

      const metaItems = [
        position.jobDepartment || "",
        position.jobStatus || "Unknown",
        position.jobLabel || "",
      ].filter(Boolean);

      return `
        <tr class="${index % 2 === 0 ? "summary-row-even" : "summary-row-odd"}">
          <th scope="row">
            <div>${escapeHtml(position.jobTitle)}</div>
            <div class="meta-line">
              ${metaItems.map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`).join("")}
            </div>
          </th>
          ${stageCells}
        </tr>
      `;
    })
    .join("");

  const totalCells = context.stages
    .map((stage) => {
      const thisWeek = context.weeklyEvents.filter((event) => event.normalizedStage === stage).length;
      const toDate = context.cumulativeEvents.filter((event) => event.normalizedStage === stage).length;
      return `<td class="summary-number ${getStageClassName(stage)}">${formatNumber(thisWeek)}</td><td class="summary-number ${getStageClassName(stage)}">${formatNumber(toDate)}</td>`;
    })
    .join("");

  dom.summaryTableContainer.innerHTML = `
    <div class="table-scroll">
      <table class="summary-table">
        <thead>
          <tr>
            <th rowspan="2">Position</th>
            ${headerRow}
          </tr>
          <tr>${subHeaderRow}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>
          <tr>
            <th>Total</th>
            ${totalCells}
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function renderDetailBoard() {
  const context = buildReportContext();
  if (!context) {
    dom.detailBoardContainer.innerHTML = "Save a weekly snapshot to populate the recruiter-facing board.";
    return;
  }

  if (!context.positions.length) {
    dom.detailBoardContainer.innerHTML =
      '<div class="empty-state compact-empty">No positions match the current filter set.</div>';
    return;
  }

  dom.detailBoardContainer.innerHTML = `
    <div class="detail-grid">
      ${context.positions
        .map((position) => {
          const cards = context.stages
            .map((stage) => {
              const candidates = context.currentRecords.filter(
                (record) => record.jobId === position.jobId && record.normalizedStage === stage
              );
              return `
                <section class="stage-lane">
                  <header>
                    <h4>${escapeHtml(stage)}</h4>
                    <span class="stage-count">${formatNumber(candidates.length)}</span>
                  </header>
                  <div class="candidate-list">
                    ${
                      candidates.length
                        ? candidates
                            .map((candidate) => {
                              const titleParts = [candidate.source, candidate.referrer].filter(Boolean).join(" - ");
                              return `<span class="candidate-chip" title="${escapeHtml(titleParts || "No source metadata")}">${escapeHtml(candidate.candidateName)}</span>`;
                            })
                            .join("")
                        : '<span class="empty-chip">No current candidates</span>'
                    }
                  </div>
                </section>
              `;
            })
            .join("");

          const comment = context.selectedImport.commentsByJobId?.[position.jobId] || "";
          const metaItems = [
            position.jobDepartment || "No department",
            position.jobStatus || "Unknown status",
            position.jobLabel || "",
          ].filter(Boolean);

          return `
            <article class="detail-card">
              <div class="detail-card-header">
                <h3>${escapeHtml(position.jobTitle)}</h3>
                <div class="meta-line">
                  ${metaItems.map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`).join("")}
                </div>
              </div>
              <div class="detail-board">${cards}</div>
              <div class="comment-panel">
                <label for="comment-${escapeHtml(position.jobId)}">Weekly position comment</label>
                <textarea
                  id="comment-${escapeHtml(position.jobId)}"
                  data-comment-job-id="${escapeHtml(position.jobId)}"
                  placeholder="Add weekly status, blockers, or next-step notes..."
                >${escapeHtml(comment)}</textarea>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderAdminPanel() {
  const knownRawStages = getKnownRawStages();
  dom.mappingTableBody.innerHTML = knownRawStages.length
    ? knownRawStages
        .map((rawStage) => {
          const mappedStage = app.settings.explicitStageMappings[rawStage] || inferStage(rawStage);
          return `
            <tr>
              <td>${escapeHtml(rawStage)}</td>
              <td>
                <input
                  type="text"
                  class="input-text"
                  list="businessStageOptions"
                  data-raw-stage="${escapeHtml(rawStage)}"
                  value="${escapeHtml(mappedStage)}"
                >
              </td>
            </tr>
          `;
        })
        .join("")
    : '<tr><td colspan="2">Workflow stages from saved imports will appear here.</td></tr>';

  const preset = app.settings.savedPreset || getDefaultFilters();
  const summaryItems = [
    preset.jobStatus !== "All" ? `Job Status: ${preset.jobStatus}` : null,
    preset.department ? `Department: ${preset.department}` : null,
    preset.recruiter ? `Recruiter: ${preset.recruiter}` : null,
    preset.stage ? `Stage: ${preset.stage}` : null,
    preset.clearance ? `Clearance: ${preset.clearance}` : null,
    preset.location ? `Location: ${preset.location}` : null,
    preset.soc ? `SOC: ${preset.soc}` : null,
    preset.source ? `Source: ${preset.source}` : null,
    preset.referrer ? `Referrer: ${preset.referrer}` : null,
    preset.jobIds.length ? `${preset.jobIds.length} saved job selections` : null,
  ].filter(Boolean);

  dom.savedPresetSummary.innerHTML = summaryItems.length
    ? `<ul class="sidebar-list">${summaryItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "No saved STAQSS preset yet.";
}

function updateWeekHint() {
  const weekStart = getWeekStart(dom.reportWeekInput.value || todayIso());
  const weekEnd = addDays(weekStart, 6);
  dom.reportWeekInput.value = weekStart;
  dom.reportWeekHint.textContent = `${formatDate(weekStart)} through ${formatDate(weekEnd)} - Monday-Sunday reporting window`;
}

function setDefaultWeekInput() {
  dom.reportWeekInput.value = getWeekStart(todayIso());
}

async function handleImportFilesSelected(event) {
  const selectedFiles = [...(event.target.files || [])];
  if (!selectedFiles.length) {
    return;
  }

  dom.validationStatus.textContent = "Reading uploads...";
  app.ui.pendingImport = null;

  try {
    const mergedFiles = dedupeFiles([...selectedFiles]);
    app.ui.fileSelection = await analyzeImportFiles(mergedFiles);
    renderAll();
    showToast("File uploaded. Review the detected candidate template before validating.");
  } catch (error) {
    console.error(error);
    app.ui.fileSelection = getEmptyFileSelection();
    renderAll();
    showToast("One or more uploaded files could not be read. Please re-upload valid CSV or XLSX files.");
  } finally {
    dom.importFilesInput.value = "";
  }
}

async function analyzeImportFiles(files) {
  const analyses = await Promise.all(
    files.map(async (file) => {
      const sheet = await parseWorkbook(file);
      const detection = detectImportKind(sheet.headers);
      const summary = buildFileSummary(sheet.headers);
      return {
        file,
        sheet,
        detection,
        summary,
      };
    })
  );

  const candidateMatches = analyses
    .filter((entry) => entry.detection.kind === "candidate")
    .sort((left, right) => (right.detection.score - left.detection.score) || (right.file.lastModified - left.file.lastModified));
  const candidate = candidateMatches[0] || null;
  const duplicates = analyses.filter((entry) => entry.detection.kind === "candidate" && candidate && entry !== candidate);

  const unknown = analyses.filter((entry) => entry.detection.kind === "unknown");

  return {
    all: analyses,
    candidate,
    unknown,
    duplicates,
  };
}

function detectImportKind(headers) {
  const candidateScore = scoreHeadersForSchema(headers, CANDIDATE_SCHEMA);

  if (candidateScore.score >= 3) {
    return { kind: "candidate", score: candidateScore.score, confidence: candidateScore.score >= 4 ? "high" : "medium" };
  }

  return { kind: "unknown", score: candidateScore.score, confidence: "low" };
}

function scoreHeadersForSchema(headers, schema) {
  const normalizedHeaders = headers.map((header) => slugify(header));
  return schema.reduce(
    (result, field) => {
      const matched = field.aliases.some((alias) => normalizedHeaders.includes(slugify(alias)));
      if (matched) {
        result.score += field.required ? 2 : 1;
      }
      return result;
    },
    { score: 0 }
  );
}

function buildFileSummary(headers) {
  const populatedHeaders = headers.filter((header) => asText(header));
  const visibleHeaders = populatedHeaders.slice(0, 4);
  return visibleHeaders.length
    ? `Headers: ${visibleHeaders.join(", ")}${populatedHeaders.length > 4 ? "..." : ""}`
    : "No header row detected.";
}

function dedupeFiles(files) {
  const seen = new Map();
  files.forEach((file) => {
    const key = `${file.name}::${file.size}::${file.lastModified}`;
    seen.set(key, file);
  });
  return [...seen.values()];
}

async function handleValidateImport() {
  const { candidate } = app.ui.fileSelection;
  if (!candidate) {
    showToast("Upload the weekly candidate export before validation.");
    return;
  }

  if (!window.XLSX) {
    showToast("The spreadsheet parser failed to load. Refresh the page and try again.");
    return;
  }

  dom.validationStatus.textContent = "Reading files...";
  dom.saveImportButton.disabled = true;

  try {
    const weekStart = getWeekStart(dom.reportWeekInput.value || todayIso());
    const weekEnd = addDays(weekStart, 6);
    const candidateReview = normalizeSheet(candidate.sheet, CANDIDATE_SCHEMA);
    const jobReview = buildDerivedJobReview(candidateReview.rows);
    const pendingImport = buildImportPreview({
      candidateReview,
      jobReview,
      weekStart,
      weekEnd,
      candidateFileName: candidate.file.name,
      jobFileName: "Derived from candidate export",
    });

    app.ui.pendingImport = pendingImport;
    renderImportValidation();
    if (pendingImport.valid) {
      showToast(`Validation passed. ${pendingImport.weekLabel} is ready to save.`);
    } else {
      showToast("Validation finished with issues. Review the missing columns before saving.");
    }
  } catch (error) {
    console.error(error);
    app.ui.pendingImport = {
      valid: false,
      candidateRows: [],
      jobRows: [],
      candidateReview: { missingRequired: ["Unable to parse the candidate file."], missingOptional: [], rows: [] },
      jobReview: { missingRequired: ["Unable to parse the job file."], missingOptional: [], rows: [] },
      unmatchedJobIds: [],
      positions: [],
      mappingSnapshot: {},
      version: 1,
      warnings: [],
    };
    renderImportValidation();
    showToast("The files could not be parsed. Confirm they are valid CSV or XLSX exports.");
  }
}

async function handleSaveImport() {
  const pendingImport = app.ui.pendingImport;
  if (!pendingImport?.valid) {
    showToast("Validate a clean import before saving.");
    return;
  }

  try {
    app.imports = rebuildStageEvents(sortImportsForUi([...app.imports, pendingImport.record]));
    await persistAllImports();
    app.ui.pendingImport = null;
    app.ui.selectedImportId = pendingImport.record.id;
    app.ui.activePanel = "summary";
    app.ui.fileSelection = getEmptyFileSelection();
    await persistSettings();
    renderAll();
    showToast(`Saved ${pendingImport.record.weekLabel} v${pendingImport.record.version}.`);
  } catch (error) {
    console.error(error);
    showToast("The snapshot could not be saved. Check browser storage availability and try again.");
  }
}

async function handleLoadDemo() {
  if (app.imports.some((snapshot) => snapshot.sourceFiles.candidateFileName.startsWith("demo-"))) {
    showToast("The guided demo snapshots are already in this browser workspace.");
    return;
  }

  const demoImports = buildDemoSnapshots();
  app.imports = rebuildStageEvents(sortImportsForUi([...app.imports, ...demoImports]));
  app.ui.selectedImportId = demoImports[demoImports.length - 1].id;
  app.ui.activePanel = "summary";
  await persistAllImports();
  renderAll();
  showToast("Loaded two guided demo snapshots so testers can explore the workflow immediately.");
}

function buildImportPreview({ candidateReview, jobReview, weekStart, weekEnd, candidateFileName, jobFileName }) {
  const valid = !candidateReview.missingRequired.length && !jobReview.missingRequired.length;
  const candidateRows = candidateReview.rows;
  const jobRows = jobReview.rows;
  const rawStages = getUniqueStrings(candidateRows.map((row) => row.workflow_stage || row.last_active_workflow_stage));
  const mappingSnapshot = buildMappingSnapshot(rawStages);
  const version = nextVersionForWeek(weekStart);
  const warnings = [
    ...candidateReview.missingOptional.map((label) => `Candidate export is missing optional field: ${label}`),
    ...jobReview.missingOptional.map((label) => `Derived position metadata is missing optional field: ${label}`),
    "This Week uses snapshot-based change detection because the candidate template does not provide dependable stage movement dates.",
  ];
  const record = valid
    ? createSnapshotRecord({
        id: createSnapshotId(weekStart, version),
        version,
        weekStart,
        weekEnd,
        candidateRows,
        jobRows,
        candidateFileName,
        jobFileName,
        mappingSnapshot,
        createdAt: new Date().toISOString(),
      })
    : null;

  return {
    valid,
    weekStart,
    weekEnd,
    weekLabel: formatWeekLabel(weekStart, weekEnd),
    candidateRows,
    jobRows,
    candidateReview,
    jobReview,
    unmatchedJobIds: record?.unmatchedJobIds || [],
    positions: record?.positions || [],
    mappingSnapshot,
    version,
    record,
    warnings,
  };
}

function buildDerivedJobReview(candidateRows) {
  const rowsByJobId = new Map();
  const missingOptional = [];

  if (!candidateRows.some((row) => asText(row.job_status))) {
    missingOptional.push("Job Status (derived as Unknown unless present in candidate export)");
  }
  if (!candidateRows.some((row) => asText(row.job_location))) {
    missingOptional.push("Job Location");
  }
  if (!candidateRows.some((row) => asText(row.clearance))) {
    missingOptional.push("Clearance");
  }
  if (!candidateRows.some((row) => asText(row.soc))) {
    missingOptional.push("SOC");
  }
  missingOptional.push("Date Opened");
  missingOptional.push("Date Closed");

  candidateRows.forEach((row, index) => {
    const jobId = buildJobIdentifier(row.job_id, row.job_title, index);
    if (!jobId || rowsByJobId.has(jobId)) {
      return;
    }

    rowsByJobId.set(jobId, {
      job_title: asText(row.job_title),
      job_status: asText(row.job_status) || "Unknown",
      job_id: jobId,
      job_department: asText(row.job_department),
      date_opened: "",
      date_closed: "",
      recruiter: asText(row.recruiter),
      job_location: asText(row.job_location),
      clearance: asText(row.clearance),
      soc: asText(row.soc),
    });
  });

  return {
    missingRequired: [],
    missingOptional,
    rows: [...rowsByJobId.values()],
  };
}

function createSnapshotRecord({
  id,
  version,
  weekStart,
  weekEnd,
  candidateRows,
  jobRows,
  candidateFileName,
  jobFileName,
  mappingSnapshot,
  createdAt,
}) {
  const positionsMap = new Map();

  jobRows.forEach((row, index) => {
    const jobId = buildJobIdentifier(row.job_id, row.job_title, index);
    if (!jobId) {
      return;
    }

    positionsMap.set(jobId, {
      jobId,
      jobLabel: deriveJobLabel(jobId, asText(row.job_title)),
      hasSyntheticJobId: isSyntheticJobId(jobId),
      jobTitle: asText(row.job_title) || `Job ${jobId}`,
      jobStatus: normalizeJobStatus(asText(row.job_status)),
      jobDepartment: asText(row.job_department),
      dateOpened: toIsoDate(row.date_opened),
      dateClosed: toIsoDate(row.date_closed),
      recruiter: asText(row.recruiter),
      jobLocation: asText(row.job_location),
      clearance: asText(row.clearance),
      soc: asText(row.soc),
    });
  });

  const candidateRecords = candidateRows.map((row, index) => {
    const jobId = buildJobIdentifier(row.job_id, row.job_title, index);
    const rawStage = asText(row.workflow_stage || row.last_active_workflow_stage);
    const matchingPosition = positionsMap.get(jobId);
    const candidateName = [asText(row.candidate_first_name), asText(row.candidate_last_name)].filter(Boolean).join(" ");
    const fallbackPosition = {
      jobId,
      jobLabel: deriveJobLabel(jobId, asText(row.job_title)),
      hasSyntheticJobId: isSyntheticJobId(jobId),
      jobTitle: asText(row.job_title) || `Unmatched job ${jobId}`,
      jobStatus: "Unmatched",
      jobDepartment: asText(row.job_department),
      recruiter: asText(row.recruiter),
      jobLocation: "",
      clearance: "",
      soc: "",
      dateOpened: "",
      dateClosed: "",
    };

    if (!matchingPosition && jobId) {
      positionsMap.set(jobId, fallbackPosition);
    }

    const position = matchingPosition || positionsMap.get(jobId) || fallbackPosition;

    return {
      candidateKey: `${jobId}::${asText(row.candidate_id) || slugify(candidateName) || `candidate-${index + 1}`}`,
      candidateId: asText(row.candidate_id) || `candidate-${index + 1}`,
      candidateName: candidateName || `Candidate ${index + 1}`,
      jobId,
      jobLabel: position.jobLabel,
      hasSyntheticJobId: position.hasSyntheticJobId,
      jobTitle: position.jobTitle,
      jobStatus: position.jobStatus,
      jobDepartment: position.jobDepartment,
      recruiter: position.recruiter || asText(row.recruiter),
      jobLocation: position.jobLocation,
      clearance: position.clearance,
      soc: position.soc,
      source: asText(row.source),
      referrer: asText(row.referrer),
      rawStage,
      normalizedStage: mappingSnapshot[rawStage] || inferStage(rawStage),
      workflowStageId: asText(row.workflow_stage_id),
      lastActiveWorkflowStage: asText(row.last_active_workflow_stage),
      dateCreated: toIsoDate(row.date_created),
      applyDate: toIsoDate(row.apply_date),
      dateMovedIntoCurrentStage: toIsoDate(row.date_moved_into_current_stage),
    };
  });

  const positions = [...positionsMap.values()].sort(sortPositions);
  const unmatchedJobIds = getUniqueStrings(
    candidateRecords.filter((record) => record.jobStatus === "Unmatched").map((record) => record.jobId)
  );
  const existingComments = findLatestCommentsForWeek(weekStart);

  return {
    id,
    version,
    weekStart,
    weekEnd,
    weekLabel: formatWeekLabel(weekStart, weekEnd),
    createdAt,
    sourceFiles: {
      candidateFileName,
      jobFileName,
    },
    mappingSnapshot,
    candidateRecords,
    positions,
    unmatchedJobIds,
    commentsByJobId: existingComments,
    stageEvents: [],
  };
}

function rebuildStageEvents(imports) {
  const chronologicallySorted = [...imports].sort(sortImportsChronologically);
  const rebuilt = chronologicallySorted.map((snapshot, index, list) => {
    const previousSnapshot = [...list]
      .slice(0, index)
      .reverse()
      .find((candidate) => candidate.weekStart < snapshot.weekStart);

    return {
      ...snapshot,
      stageEvents: deriveStageEvents(snapshot, previousSnapshot),
    };
  });

  return sortImportsForUi(rebuilt);
}

function deriveStageEvents(snapshot, previousSnapshot) {
  const previousByCandidate = new Map(
    (previousSnapshot?.candidateRecords || []).map((record) => [record.candidateKey, record])
  );

  return snapshot.candidateRecords
    .map((record) => {
      const previous = previousByCandidate.get(record.candidateKey);
      const previousStage = previous?.normalizedStage || "";
      const previousMovedDate = previous?.dateMovedIntoCurrentStage || "";
      const currentMovedDate = record.dateMovedIntoCurrentStage || "";
      const stageChanged = !previous || previousStage !== record.normalizedStage;
      const sameStageReentry = Boolean(previous) && previousStage === record.normalizedStage && currentMovedDate !== previousMovedDate;

      if (!stageChanged && !sameStageReentry) {
        return null;
      }

      return {
        id: `${snapshot.id}::${record.candidateKey}::${record.normalizedStage}::${snapshot.weekEnd}`,
        importId: snapshot.id,
        eventDate: snapshot.weekEnd,
        auditRecordedAt: snapshot.createdAt,
        auditWeekLabel: snapshot.weekLabel,
        candidateKey: record.candidateKey,
        candidateId: record.candidateId,
        candidateName: record.candidateName,
        jobId: record.jobId,
        jobTitle: record.jobTitle,
        jobDepartment: record.jobDepartment,
        jobStatus: record.jobStatus,
        recruiter: record.recruiter,
        jobLocation: record.jobLocation,
        clearance: record.clearance,
        soc: record.soc,
        source: record.source,
        referrer: record.referrer,
        normalizedStage: record.normalizedStage,
        rawStage: record.rawStage,
        eventType: !previous ? "first_seen" : stageChanged ? "stage_changed" : "same_stage_reentry",
        eventSource: "snapshot_observed_change",
      };
    })
    .filter(Boolean);
}

function buildReportContext() {
  const selectedImport = getSelectedImport();
  if (!selectedImport) {
    return null;
  }

  const positions = selectedImport.positions.filter((position) => positionMatchesFilters(position, app.ui.filters));
  const positionIds = new Set(positions.map((position) => position.jobId));

  const currentRecords = selectedImport.candidateRecords.filter((record) => {
    return positionIds.has(record.jobId) && candidateMatchesFilters(record, app.ui.filters);
  });

  const includedSnapshots = app.imports.filter(
    (snapshot) => snapshot.weekStart < selectedImport.weekStart || snapshot.id === selectedImport.id
  );

  const cumulativeEvents = includedSnapshots.flatMap((snapshot) => snapshot.stageEvents || []).filter((event) => {
    return positionIds.has(event.jobId) && candidateMatchesFilters(event, app.ui.filters) && event.eventDate <= selectedImport.weekEnd;
  });

  const weeklyEvents = cumulativeEvents.filter(
    (event) => event.eventDate >= selectedImport.weekStart && event.eventDate <= selectedImport.weekEnd
  );

  const stages = app.ui.filters.stage
    ? [app.ui.filters.stage]
    : getVisibleStages(selectedImport, cumulativeEvents, currentRecords);

  return {
    selectedImport,
    positions,
    currentRecords,
    cumulativeEvents,
    weeklyEvents,
    stages,
  };
}

function getVisibleStages(snapshot, events = snapshot.stageEvents || [], records = snapshot.candidateRecords || []) {
  const discovered = new Set(DEFAULT_STAGE_ORDER);
  [...events, ...records].forEach((item) => {
    if (item.normalizedStage) {
      discovered.add(item.normalizedStage);
    }
  });

  const sorted = [...discovered].sort((a, b) => {
    const aIndex = DEFAULT_STAGE_ORDER.indexOf(a);
    const bIndex = DEFAULT_STAGE_ORDER.indexOf(b);
    const safeA = aIndex === -1 ? 999 : aIndex;
    const safeB = bIndex === -1 ? 999 : bIndex;
    return safeA - safeB || a.localeCompare(b);
  });

  if (sorted.includes("Other")) {
    return sorted;
  }

  return sorted.filter(Boolean);
}

function getStageClassName(stage) {
  const slug = slugify(stage).replace(/\s+/g, "-");
  return slug ? `stage-${slug}` : "stage-other";
}

function positionMatchesFilters(position, filters) {
  if (filters.jobStatus !== "All" && normalizeJobStatus(position.jobStatus) !== filters.jobStatus) {
    return false;
  }

  if (filters.department && position.jobDepartment !== filters.department) {
    return false;
  }

  if (filters.recruiter && position.recruiter !== filters.recruiter) {
    return false;
  }

  if (filters.clearance && position.clearance !== filters.clearance) {
    return false;
  }

  if (filters.location && position.jobLocation !== filters.location) {
    return false;
  }

  if (filters.soc && position.soc !== filters.soc) {
    return false;
  }

  if (filters.jobIds.length && !filters.jobIds.includes(position.jobId)) {
    return false;
  }

  return true;
}

function candidateMatchesFilters(record, filters) {
  if (filters.stage && record.normalizedStage !== filters.stage) {
    return false;
  }

  if (filters.source && (record.source || "") !== filters.source) {
    return false;
  }

  if (filters.referrer && (record.referrer || "") !== filters.referrer) {
    return false;
  }

  if (filters.recruiter && (record.recruiter || "") !== filters.recruiter) {
    return false;
  }

  return true;
}

function populateSelect(element, values, selectedValue = "") {
  const options = ['<option value="">All</option>']
    .concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`))
    .join("");
  element.innerHTML = options;
  element.value = selectedValue || "";
}

function updateFiltersFromControls() {
  app.ui.filters = {
    ...app.ui.filters,
    jobStatus: dom.jobStatusFilter.value || "All",
    department: dom.departmentFilter.value || "",
    recruiter: dom.recruiterFilter.value || "",
    stage: dom.stageFilter.value || "",
    clearance: dom.clearanceFilter.value || "",
    location: dom.locationFilter.value || "",
    soc: dom.socFilter.value || "",
    source: dom.sourceFilter.value || "",
    referrer: dom.referrerFilter.value || "",
  };
  renderAll();
}

function handleJobChecklistChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") {
      return;
    }

  const nextSelected = new Set(app.ui.filters.jobIds);
  if (input.checked) {
    nextSelected.add(input.value);
  } else {
    nextSelected.delete(input.value);
  }

  app.ui.filters.jobIds = [...nextSelected];
  renderAll();
}

async function saveCurrentPreset() {
  app.settings.savedPreset = cloneFilters(app.ui.filters);
  await persistSettings();
  renderAdminPanel();
  showToast("Saved the current filter set as the STAQSS preset.");
}

function loadSavedPreset() {
  app.ui.filters = cloneFilters(app.settings.savedPreset || getDefaultFilters());
  dom.jobSearchInput.value = "";
  renderAll();
  showToast("Loaded the saved STAQSS preset.");
}

async function handleCommentChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }

  const jobId = target.dataset.commentJobId;
  if (!jobId) {
    return;
  }

  const selectedImport = getSelectedImport();
  if (!selectedImport) {
    return;
  }

  selectedImport.commentsByJobId = {
    ...(selectedImport.commentsByJobId || {}),
    [jobId]: target.value.trim(),
  };

  app.imports = sortImportsForUi(app.imports.map((snapshot) => (snapshot.id === selectedImport.id ? selectedImport : snapshot)));
  await idbPut(IMPORT_STORE, selectedImport);
  showToast(`Saved the weekly comment for ${selectedImport.weekLabel}.`);
}

function handleHistoryActions(event) {
  const button = event.target;
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const snapshotId = button.dataset.openSnapshot;
  if (snapshotId) {
    app.ui.selectedImportId = snapshotId;
    app.ui.activePanel = "summary";
    renderAll();
  }
}

async function handleMappingChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const rawStage = input.dataset.rawStage;
  if (!rawStage) {
    return;
  }

  const mappedStage = input.value.trim() || inferStage(rawStage);
  app.settings.explicitStageMappings[rawStage] = mappedStage;
  await persistSettings();
  showToast(`Saved the default mapping for "${rawStage}".`);
}

async function handleAddMapping() {
  const rawStage = dom.newRawStageInput.value.trim();
  const mappedStage = dom.newRawStageMappedInput.value.trim();

  if (!rawStage || !mappedStage) {
    showToast("Enter both the raw JazzHR stage and the business stage.");
    return;
  }

  app.settings.explicitStageMappings[rawStage] = mappedStage;
  dom.newRawStageInput.value = "";
  dom.newRawStageMappedInput.value = "";
  await persistSettings();
  renderAdminPanel();
  showToast(`Added a default mapping for "${rawStage}".`);
}

function exportWorkbook() {
  const context = buildReportContext();
  if (!context || !window.XLSX) {
    showToast("There is no report context available to export.");
    return;
  }

  const workbook = XLSX.utils.book_new();
  const summaryData = buildSummarySheetData(context);
  const detailData = buildDetailSheetData(context);
  const notesData = buildMetadataSheetData(context);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  const notesSheet = XLSX.utils.aoa_to_sheet(notesData);

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detail");
  XLSX.utils.book_append_sheet(workbook, notesSheet, "Report Notes");

  XLSX.writeFile(workbook, `staqss-report-${context.selectedImport.weekStart}.xlsx`);
  showToast("Exported the workbook for the selected snapshot.");
}

function handlePrint() {
  document.body.setAttribute("data-printing", "true");
  window.print();
}

function buildSummarySheetData(context) {
  const rows = [];
  const headerRow = ["Position"];
  const subHeader = [""];

  context.stages.forEach((stage) => {
    headerRow.push(stage, "");
    subHeader.push("This Week", "To Date");
  });

  rows.push([`STAQSS Summary - ${context.selectedImport.weekLabel}`]);
  rows.push([]);
  rows.push(headerRow);
  rows.push(subHeader);

  context.positions.forEach((position) => {
    const row = [position.jobTitle];
    context.stages.forEach((stage) => {
      const thisWeek = context.weeklyEvents.filter(
        (event) => event.jobId === position.jobId && event.normalizedStage === stage
      ).length;
      const toDate = context.cumulativeEvents.filter(
        (event) => event.jobId === position.jobId && event.normalizedStage === stage
      ).length;
      row.push(thisWeek, toDate);
    });
    rows.push(row);
  });

  const totalRow = ["Total"];
  context.stages.forEach((stage) => {
    totalRow.push(
      context.weeklyEvents.filter((event) => event.normalizedStage === stage).length,
      context.cumulativeEvents.filter((event) => event.normalizedStage === stage).length
    );
  });
  rows.push(totalRow);

  return rows;
}

function buildDetailSheetData(context) {
  const rows = [[`STAQSS Detail Board - ${context.selectedImport.weekLabel}`], []];
  rows.push(["Position", ...context.stages, "Comment"]);

  context.positions.forEach((position) => {
    const stageColumns = context.stages.map((stage) => {
      return context.currentRecords
        .filter((record) => record.jobId === position.jobId && record.normalizedStage === stage)
        .map((record) => record.candidateName)
        .join("\n");
    });

    rows.push([
      position.jobTitle,
      ...stageColumns,
      context.selectedImport.commentsByJobId?.[position.jobId] || "",
    ]);
  });

  return rows;
}

function buildMetadataSheetData(context) {
  return [
    ["Report Week", context.selectedImport.weekLabel],
    ["Snapshot Version", `v${context.selectedImport.version}`],
    ["Saved At", formatDateTime(context.selectedImport.createdAt)],
    ["This Week Logic", "Stage changes first observed in the selected saved snapshot"],
    ["Filter - Job Status", app.ui.filters.jobStatus],
    ["Filter - Department", app.ui.filters.department || "All"],
    ["Filter - Recruiter", app.ui.filters.recruiter || "All"],
    ["Filter - Stage", app.ui.filters.stage || "All"],
    ["Filter - Clearance", app.ui.filters.clearance || "All"],
    ["Filter - Location", app.ui.filters.location || "All"],
    ["Filter - SOC", app.ui.filters.soc || "All"],
    ["Filter - Source", app.ui.filters.source || "All"],
    ["Filter - Referrer", app.ui.filters.referrer || "All"],
    ["Selected Jobs", app.ui.filters.jobIds.join(", ") || "All"],
  ];
}

function buildDemoSnapshots() {
  const baseJobs = [
    {
      job_title: "Systems Engineer II",
      job_status: "Open",
      job_id: "JOB-101",
      job_department: "STAQSS",
      date_opened: "2026-02-10",
      date_closed: "",
      recruiter: "Ana",
      job_location: "Huntsville, AL",
      clearance: "Secret",
      soc: "15-1299",
    },
    {
      job_title: "Program Analyst",
      job_status: "Open",
      job_id: "JOB-102",
      job_department: "STAQSS",
      date_opened: "2026-02-17",
      date_closed: "",
      recruiter: "Ana",
      job_location: "Arlington, VA",
      clearance: "Top Secret",
      soc: "13-1111",
    },
    {
      job_title: "Capture Manager",
      job_status: "Closed",
      job_id: "JOB-103",
      job_department: "Growth",
      date_opened: "2026-01-12",
      date_closed: "2026-03-18",
      recruiter: "Scott",
      job_location: "Remote",
      clearance: "Public Trust",
      soc: "11-1021",
    },
  ];

  const weekOneCandidates = [
    demoCandidate("Alex", "Carter", "JOB-101", "Systems Engineer II", "STAQSS", "Screen", "C-1001", "WS-01", "2026-03-04", "Screen", "2026-03-09", "Referral", "Rina Patel", "Ana", "2026-03-04"),
    demoCandidate("Jamie", "Liu", "JOB-101", "Systems Engineer II", "STAQSS", "Submitted/In Review", "C-1002", "WS-02", "2026-03-05", "Submitted/In Review", "2026-03-10", "LinkedIn", "", "Ana", "2026-03-05"),
    demoCandidate("Priya", "Shah", "JOB-102", "Program Analyst", "STAQSS", "Interview", "C-1003", "WS-03", "2026-03-03", "Interview", "2026-03-11", "Employee Referral", "Marco Vega", "Ana", "2026-03-03"),
    demoCandidate("Marcus", "Bell", "JOB-103", "Capture Manager", "Growth", "Offer", "C-1004", "WS-04", "2026-02-22", "Offer", "2026-03-12", "Agency", "", "Scott", "2026-02-22"),
  ];

  const weekTwoCandidates = [
    demoCandidate("Alex", "Carter", "JOB-101", "Systems Engineer II", "STAQSS", "Submitted/In Review", "C-1001", "WS-02", "2026-03-04", "Submitted/In Review", "2026-03-17", "Referral", "Rina Patel", "Ana", "2026-03-04"),
    demoCandidate("Jamie", "Liu", "JOB-101", "Systems Engineer II", "STAQSS", "Interview", "C-1002", "WS-03", "2026-03-05", "Interview", "2026-03-18", "LinkedIn", "", "Ana", "2026-03-05"),
    demoCandidate("Priya", "Shah", "JOB-102", "Program Analyst", "STAQSS", "Offer", "C-1003", "WS-04", "2026-03-03", "Offer", "2026-03-18", "Employee Referral", "Marco Vega", "Ana", "2026-03-03"),
    demoCandidate("Marcus", "Bell", "JOB-103", "Capture Manager", "Growth", "Hired", "C-1004", "WS-05", "2026-02-22", "Hired", "2026-03-19", "Agency", "", "Scott", "2026-02-22"),
    demoCandidate("Nina", "Reyes", "JOB-102", "Program Analyst", "STAQSS", "Screen", "C-1005", "WS-01", "2026-03-17", "Screen", "2026-03-17", "Career Site", "", "Ana", "2026-03-17"),
  ];

  const mappingSnapshot = buildMappingSnapshot(["Screen", "Submitted/In Review", "Interview", "Offer", "Hired"]);

  return [
    createSnapshotRecord({
      id: createSnapshotId("2026-03-09", 1),
      version: 1,
      weekStart: "2026-03-09",
      weekEnd: "2026-03-15",
      candidateRows: weekOneCandidates,
      jobRows: baseJobs,
      candidateFileName: "demo-candidates-week-1.csv",
      jobFileName: "demo-jobs.csv",
      mappingSnapshot,
      createdAt: "2026-03-15T18:00:00.000Z",
    }),
    createSnapshotRecord({
      id: createSnapshotId("2026-03-16", 1),
      version: 1,
      weekStart: "2026-03-16",
      weekEnd: "2026-03-22",
      candidateRows: weekTwoCandidates,
      jobRows: baseJobs,
      candidateFileName: "demo-candidates-week-2.csv",
      jobFileName: "demo-jobs.csv",
      mappingSnapshot,
      createdAt: "2026-03-22T18:00:00.000Z",
    }),
  ];
}

function demoCandidate(
  firstName,
  lastName,
  jobId,
  jobTitle,
  jobDepartment,
  workflowStage,
  candidateId,
  workflowStageId,
  dateCreated,
  lastActiveWorkflowStage,
  dateMovedIntoCurrentStage,
  source,
  referrer,
  recruiter,
  applyDate
) {
  return {
    candidate_first_name: firstName,
    candidate_last_name: lastName,
    job_id: jobId,
    job_title: jobTitle,
    job_department: jobDepartment,
    workflow_stage: workflowStage,
    candidate_id: candidateId,
    workflow_stage_id: workflowStageId,
    date_created: dateCreated,
    last_active_workflow_stage: lastActiveWorkflowStage,
    date_moved_into_current_stage: dateMovedIntoCurrentStage,
    source,
    referrer,
    recruiter,
    apply_date: applyDate,
  };
}

function getSelectedImport() {
  if (!app.imports.length) {
    return null;
  }
  return app.imports.find((snapshot) => snapshot.id === app.ui.selectedImportId) || app.imports[0];
}

function getLatestImport() {
  return app.imports[0] || null;
}

function nextVersionForWeek(weekStart, imports = app.imports) {
  const versions = imports.filter((snapshot) => snapshot.weekStart === weekStart).map((snapshot) => snapshot.version);
  return versions.length ? Math.max(...versions) + 1 : 1;
}

function createSnapshotId(weekStart, version) {
  return `${weekStart}-v${version}-${Math.random().toString(36).slice(2, 8)}`;
}

function findLatestCommentsForWeek(weekStart) {
  const latest = app.imports.find((snapshot) => snapshot.weekStart === weekStart);
  return { ...(latest?.commentsByJobId || {}) };
}

function getKnownRawStages() {
  const stageSet = new Set(Object.keys(app.settings.explicitStageMappings || {}));
  app.imports.forEach((snapshot) => {
    Object.keys(snapshot.mappingSnapshot || {}).forEach((rawStage) => {
      stageSet.add(rawStage);
    });
  });
  return [...stageSet].sort((a, b) => a.localeCompare(b));
}

function buildMappingSnapshot(rawStages) {
  const mapping = {};
  rawStages.forEach((rawStage) => {
    mapping[rawStage] = app.settings.explicitStageMappings[rawStage] || inferStage(rawStage);
  });
  return mapping;
}

function inferStage(rawStage) {
  const cleanStage = asText(rawStage);
  if (!cleanStage) {
    return "Other";
  }

  const rule = STAGE_INFERENCE_RULES.find((entry) => entry.pattern.test(cleanStage));
  return rule?.stage || cleanStage || "Other";
}

async function parseWorkbook(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: false,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  const [headers = [], ...bodyRows] = rows;
  return {
    headers,
    rows: bodyRows,
  };
}

function normalizeSheet(sheet, schema) {
  const headerLookup = new Map(sheet.headers.map((header, index) => [slugify(header), index]));
  const resolvedSchema = schema.map((field) => {
    const alias = field.aliases.find((aliasValue) => headerLookup.has(slugify(aliasValue)));
    return {
      ...field,
      index: alias ? headerLookup.get(slugify(alias)) : -1,
    };
  });

  const missingRequired = resolvedSchema.filter((field) => field.required && field.index === -1).map((field) => field.label);
  const missingOptional = resolvedSchema.filter((field) => !field.required && field.index === -1).map((field) => field.label);
  const rows = sheet.rows
    .filter((row) => row.some((cell) => asText(cell)))
    .map((row) => {
      const normalized = {};
      resolvedSchema.forEach((field) => {
        normalized[field.key] = field.index >= 0 ? row[field.index] : "";
      });
      return normalized;
    });

  return {
    missingRequired,
    missingOptional,
    rows,
  };
}

function normalizeJobStatus(value) {
  const cleanValue = asText(value);
  if (/^open$/i.test(cleanValue)) {
    return "Open";
  }
  if (/^closed$/i.test(cleanValue)) {
    return "Closed";
  }
  return cleanValue || "Unknown";
}

function buildJobIdentifier(jobId, jobTitle, fallbackIndex = 0) {
  const explicitId = asText(jobId);
  if (explicitId) {
    return explicitId;
  }

  const titleSlug = slugify(jobTitle).replace(/\s+/g, "-").toUpperCase();
  if (titleSlug) {
    return `TITLE-${titleSlug}`;
  }

  return `JOB-${fallbackIndex + 1}`;
}

function isSyntheticJobId(jobId) {
  return /^TITLE-|^JOB-\d+$/i.test(asText(jobId));
}

function deriveJobLabel(jobId, jobTitle) {
  return isSyntheticJobId(jobId) ? "" : asText(jobId);
}

function sortImportsForUi(imports) {
  return [...imports].sort((left, right) => {
    if (left.weekStart !== right.weekStart) {
      return right.weekStart.localeCompare(left.weekStart);
    }
    if (left.version !== right.version) {
      return right.version - left.version;
    }
    return right.createdAt.localeCompare(left.createdAt);
  });
}

function sortImportsChronologically(left, right) {
  if (left.weekStart !== right.weekStart) {
    return left.weekStart.localeCompare(right.weekStart);
  }
  if (left.version !== right.version) {
    return left.version - right.version;
  }
  return left.createdAt.localeCompare(right.createdAt);
}

function sortPositions(left, right) {
  if (left.jobStatus !== right.jobStatus) {
    return left.jobStatus.localeCompare(right.jobStatus);
  }
  return left.jobTitle.localeCompare(right.jobTitle);
}

function getUniqueValues(items, key) {
  return getUniqueStrings(items.map((item) => item[key]));
}

function getUniqueStrings(values) {
  return [...new Set(values.map((value) => asText(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function createMetricCards(items) {
  return items
    .map((item) => {
      return `
        <div class="metric-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderListOrSuccess(items, successText) {
  if (!items.length) {
    return `<p>${escapeHtml(successText)}</p>`;
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function formatDate(isoDate) {
  if (!isoDate) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${isoDate}T12:00:00`));
}

function formatDateTime(isoDateTime) {
  if (!isoDateTime) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDateTime));
}

function formatWeekLabel(weekStart, weekEnd) {
  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
}

function toIsoDate(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && window.XLSX?.SSF?.parse_date_code) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(parsed.y, parsed.m - 1, parsed.d);
      return date.toISOString().slice(0, 10);
    }
  }

  const text = asText(value);
  if (!text) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const normalized = text.replace(/\./g, "/").replace(/-/g, "/");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
}

function getWeekStart(dateText) {
  const date = new Date(`${dateText}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate, amount) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function asText(value) {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function slugify(value) {
  return asText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cloneFilters(filters) {
  return JSON.parse(JSON.stringify(filters || getDefaultFilters()));
}

function escapeHtml(value) {
  return asText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message) {
  if (!dom.toast) {
    return;
  }

  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  clearTimeout(app.ui.toastTimer);
  app.ui.toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, 2600);
}

async function persistAllImports() {
  const transaction = app.db.transaction(IMPORT_STORE, "readwrite");
  const store = transaction.objectStore(IMPORT_STORE);
  store.clear();
  app.imports.forEach((snapshot) => {
    store.put(snapshot);
  });
  await waitForTransaction(transaction);
}

async function persistSettings() {
  await idbPut(SETTINGS_STORE, {
    key: SETTINGS_KEY,
    value: app.settings,
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMPORT_STORE)) {
        db.createObjectStore(IMPORT_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = app.db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = app.db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    const transaction = app.db.transaction(storeName, "readwrite");
    const request = transaction.objectStore(storeName).put(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
