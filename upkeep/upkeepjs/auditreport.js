// UpKeep audit report.
//   auditreport.html?audit=..&prop=..               -> "Generate Report": Maintenance & Safety Audit Report (PDF)
//   auditreport.html?audit=..&prop=..&mode=export   -> "Export": every saved checkpoint (Excel / PDF)

const reportParams = new URLSearchParams(window.location.search);
const reportAuditId = reportParams.get('audit');
const reportPropId = reportParams.get('prop');
const reportMode = reportParams.get('mode') === 'export' ? 'export' : 'report';

const STATUS = {
    1: { name: 'Excellent', short: 'E', points: 4 },
    2: { name: 'Good', short: 'G', points: 3 },
    3: { name: 'Satisfactory', short: 'S', points: 2 },
    4: { name: 'Unsatisfactory', short: 'US', points: 1 },
    5: { name: 'Poor', short: 'P', points: 0 },
    6: { name: 'Safety Issue', short: 'SI', points: 0 },
    7: { name: 'N/A', short: 'N/A', points: null }
};

// Statuses that go into "Detailed Findings"
const FINDING_STATUSES = [4, 5, 6];

var Report = null;

$(document).ready(function () {
    if (GetStoredUserData() == null) {
        LogoutUser();
        return;
    }
    if (!reportAuditId || !reportPropId) {
        showState('This link is missing the audit or property id.');
        return;
    }

    if (reportMode === 'export') {
        document.title = 'WorkWize | Audit Export';
        $('#toolbar-title').text('Audit Data Export');
        $('#toolbar-hint').text('All saved checkpoints across every area and sub area.');
        $('#btn-excel').show();
        $('#sheet').addClass('landscape');
        $('#page-orientation').text('@media print { @page { size: A4 landscape; margin: 10mm; } }');
    }

    Promise.all([fetchPropertyInfo(), fetchAuditRows(), fetchAuditInfo()])
        .then(([property, rows, info]) => {
            Report = buildReportModel(property, rows || [], info);
            document.title = `${Report.auditId} - ${reportMode === 'export' ? 'Audit Export' : 'Audit Report'}`;
            $('#sheet').html(reportMode === 'export' ? renderExport(Report) : renderReport(Report));
            $('#btn-pdf, #btn-excel').prop('disabled', false);
        })
        .catch(xhr => {
            if (xhr && xhr.status === 401) {
                LogoutUser();
                return;
            }
            showState('The audit could not be loaded. Please close this tab and try again.');
        });
});

function showState(message) {
    $('#sheet').html(`<div class="state">${escapeHtml(message)}</div>`);
}

//#region Data
function authAjax(options) {
    return new Promise((resolve, reject) => {
        $.ajax(Object.assign({
            dataType: 'json',
            headers: { "Authorization": "Bearer " + GetStoredJwt() },
            success: resolve,
            error: reject
        }, options));
    });
}

function fetchPropertyInfo() {
    const form = new FormData();
    form.append("propId", reportPropId);
    return authAjax({
        url: applicationdomain + 'api/upkeep/getpropinfo',
        type: 'POST',
        data: form,
        processData: false,
        contentType: false
    });
}

function fetchAuditRows() {
    return authAjax({
        url: `${applicationdomain}api/upkeep/getauditreport?prop=${encodeURIComponent(reportPropId)}&audit=${encodeURIComponent(reportAuditId)}`,
        type: 'GET'
    });
}

function fetchAuditInfo() {
    // Older backends don't have this endpoint; the report still works without Key Strength
    return authAjax({
        url: `${applicationdomain}api/upkeep/getauditinfo?prop=${encodeURIComponent(reportPropId)}&audit=${encodeURIComponent(reportAuditId)}`,
        type: 'GET'
    }).catch(xhr => {
        if (xhr && xhr.status === 401) {
            throw xhr;
        }
        return null;
    });
}

// Joins saved rows to the property tree so everything is in checklist order with names
function buildReportModel(property, rows, info) {
    const teams = {};
    (property.propEmp || []).forEach(t => { teams[t.teamId] = t.teamName; });

    // Same rule as the area tabs: only areas that have at least one checkpoint
    const areas = (property.propArea || []).filter(a =>
        a.subAreas && a.subAreas.some(sa => sa.checkpoints && sa.checkpoints.length > 0));

    const allAreaModels = areas.map(area => {
        const villas = {};
        (area.villasList || []).forEach((v, i) => { villas[v.villaId] = { name: v.villaName, order: i }; });

        const subOrder = {};
        const cpLookup = {};
        (area.subAreas || []).forEach((sa, si) => {
            subOrder[sa.subareaId] = si;
            (sa.checkpoints || []).forEach((cp, ci) => {
                cpLookup[sa.subareaId + '|' + cp.checkpointId] = { name: cp.checkpointName, order: ci, subareaName: sa.subareaName };
            });
        });

        const areaRows = rows
            .filter(r => r.areaId === area.areaid)
            .map(r => {
                const cp = cpLookup[r.subareaId + '|' + r.checkpointId];
                const subarea = (area.subAreas || []).find(sa => sa.subareaId === r.subareaId);
                const villa = r.villaId ? villas[r.villaId] : null;
                return {
                    raw: r,
                    status: r.checkpointStatus,
                    subareaName: subarea ? subarea.subareaName : (cp ? cp.subareaName : 'Removed sub area'),
                    checkpointName: cp ? cp.name : (r.checkpointName || 'Removed checkpoint'),
                    villaName: villa ? villa.name : (r.villaId ? r.villaId : ''),
                    responsibility: r.checkpointResponsibility ? (teams[r.checkpointResponsibility] || r.checkpointResponsibility) : '',
                    observation: r.checkpointObservation || '',
                    issue: r.checkpointIssue || '',
                    photos: (r.uploads || []).map(u => u.fileurl).filter(Boolean),
                    taskMasterId: r.isjobtracker ? (r.jobtrackerid || 'Added') : '',
                    savedBy: r.createdBy || '',
                    savedOn: parseApiDate(r.createdOn),
                    sortKey: [
                        subOrder[r.subareaId] ?? 9999,
                        villa ? villa.order : -1,
                        cp ? cp.order : 9999
                    ]
                };
            })
            .sort((a, b) => a.sortKey[0] - b.sortKey[0] || a.sortKey[1] - b.sortKey[1] || a.sortKey[2] - b.sortKey[2]);

        return {
            number: 0,
            name: area.areaName,
            isVilla: area.isvilla === true,
            rows: areaRows,
            score: scoreRows(areaRows),
            findings: areaRows.filter(r => FINDING_STATUSES.indexOf(r.status) !== -1)
        };
    });

    // Areas with nothing saved were not audited, so they stay out of the report and the numbering
    const areaModels = allAreaModels.filter(a => a.rows.length > 0);
    areaModels.forEach((a, i) => { a.number = i + 1; });

    const dates = rows.map(r => parseApiDate(r.createdOn)).filter(Boolean);
    const auditors = [...new Set(rows.map(r => r.createdBy).filter(Boolean))];
    if (auditors.length === 0 && info && info.createdBy) {
        auditors.push(info.createdBy);
    }

    return {
        auditId: reportAuditId,
        propertyName: property.propName || '',
        createdOn: info ? parseApiDate(info.createdOn) : null,
        firstDate: dates.length ? new Date(Math.min(...dates)) : null,
        lastDate: dates.length ? new Date(Math.max(...dates)) : null,
        auditors: auditors,
        keyStrength: info && info.keyStrength ? info.keyStrength : '',
        areas: areaModels,
        overall: scoreRows(areaModels.flatMap(a => a.rows))
    };
}

// Same weighting as the audit screen: E=100, G=75, S=50, US=25, P/SI=0; N/A is not scored
function scoreRows(rows) {
    const scored = rows.filter(r => STATUS[r.status] && STATUS[r.status].points !== null);
    if (scored.length === 0) {
        return { checked: rows.length, scored: 0, percent: null };
    }
    const points = scored.reduce((sum, r) => sum + STATUS[r.status].points, 0);
    return { checked: rows.length, scored: scored.length, percent: points / (scored.length * 4) * 100 };
}

// Highest severity among the area's findings; the auditor can change it on the report
function suggestedRisk(findings) {
    if (findings.some(f => f.status === 6)) return 'High';
    if (findings.some(f => f.status === 5)) return 'Medium';
    if (findings.some(f => f.status === 4)) return 'Low';
    return '';
}
//#endregion

//#region Rendering helpers
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function multiline(value) {
    return escapeHtml(value).replace(/\n/g, '<br>');
}

// Report dates are Maldives Time
function formatDate(date) {
    return formatMaldives(date, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(date) {
    return formatMaldives(date, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function auditDateRange(model) {
    if (model.firstDate) {
        const first = formatDate(model.firstDate);
        const last = formatDate(model.lastDate);
        return first === last ? first : `${first} – ${last}`;
    }
    return model.createdOn ? formatDate(model.createdOn) : '';
}

function statusChip(status) {
    const s = STATUS[status];
    return s ? `<span class="chip s${status}">${escapeHtml(s.name)}</span>` : '';
}

function scoreText(score) {
    return score.percent === null ? '—' : `${score.percent.toFixed(1)}%`;
}

// Key Strength is stored rich text; keep formatting, drop anything executable
function sanitizeRichText(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstChild;
    root.querySelectorAll('script, style, iframe, object, embed, link, meta, form, input, button').forEach(el => el.remove());
    root.querySelectorAll('*').forEach(el => {
        [...el.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            const value = attr.value.trim().toLowerCase();
            if (name.startsWith('on') || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
                el.removeAttribute(attr.name);
            }
        });
    });
    return root.innerHTML;
}

function photosHtml(photos) {
    if (!photos.length) return '';
    return `<div class="photos">${photos.map(url => `<img src="${escapeHtml(url)}" alt="Checkpoint photo" loading="eager">`).join('')}</div>`;
}

function generalInfoHtml(model) {
    return `
        <h2>General Information</h2>
        <ul class="info">
            <li>Property Name: <b>${escapeHtml(model.propertyName)}</b></li>
            <li>Audit Type: <span class="editable" contenteditable="true">Internal</span></li>
            <li>Audit ID: ${escapeHtml(model.auditId)}</li>
            <li>Audit Date(s): ${escapeHtml(auditDateRange(model))}</li>
            <li>Auditor(s): ${escapeHtml(model.auditors.join(', '))}</li>
            <li>General Manager: <span class="editable" contenteditable="true"></span></li>
            <li>Head of Engineering: <span class="editable" contenteditable="true"></span></li>
        </ul>`;
}
//#endregion

//#region Generate Report
function renderReport(model) {
    let html = `
        <div class="brand"><img src="main/images/opro-logo.png" alt="OPRO - Adding Care to Your Property"></div>
        <h1 class="report-title">Maintenance &amp; Safety Audit Report</h1>
        <hr class="rule">
        ${generalInfoHtml(model)}

        <h2>Scope &amp; Objective</h2>
        <ul class="info">
            <li><b>Overall maintenance, safety, and statutory compliance assessment.</b></li>
        </ul>

        <h2>Rating Scale</h2>
        <ul class="info">
            <li>Excellent (E) = 4</li>
            <li>Good (G) = 3</li>
            <li>Satisfactory (S) = 2</li>
            <li>Unsatisfactory (US) = 1</li>
            <li>Poor (P) = 0</li>
            <li>Safety Issue (SI) = 0</li>
        </ul>

        <h2>Areas &amp; Scoring</h2>
        <table class="grid">
            <thead><tr><th style="width:40px">#</th><th>Area</th><th style="width:130px">Checkpoints rated</th><th style="width:90px">Score</th></tr></thead>
            <tbody>
                ${model.areas.map(a => `
                    <tr>
                        <td class="num">${a.number}</td>
                        <td>${escapeHtml(a.name)}</td>
                        <td class="num">${a.score.checked}</td>
                        <td class="num">${scoreText(a.score)}</td>
                    </tr>`).join('')}
                ${model.areas.length === 0 ? `<tr><td></td><td class="muted" colspan="3">No checkpoints have been saved in this audit yet.</td></tr>` : ''}
                <tr>
                    <td></td>
                    <td><b>Overall</b></td>
                    <td class="num"><b>${model.overall.checked}</b></td>
                    <td class="num"><b>${scoreText(model.overall)}</b></td>
                </tr>
            </tbody>
        </table>

        <h2>Key Strengths Observed</h2>
        ${model.keyStrength
            ? `<div class="ks-content ql-editor">${sanitizeRichText(model.keyStrength)}</div>`
            : `<p class="muted">No key strengths recorded. Add them in the audit under the "Key Strength" tab.</p>`}

        <h2>Detailed Findings (Area-wise)</h2>
        <p class="muted no-print" style="margin-top:0">Only areas with checkpoints rated Unsatisfactory, Poor or Safety Issue.</p>`;

    const areasWithFindings = model.areas.filter(a => a.findings.length > 0);
    if (areasWithFindings.length === 0) {
        html += `<p class="muted">No unsatisfactory, poor or safety findings were recorded in this audit.</p>`;
    }
    areasWithFindings.forEach(area => {
        const risk = suggestedRisk(area.findings);
        const findings = area.findings.map((f, i) => {
                f.ref = `${area.number}.${i + 1}`;
                const where = [f.subareaName, f.villaName].filter(Boolean).map(escapeHtml).join(' · ');
                return `
                    <div class="finding">
                        <div><span class="finding-title">${f.ref} ${escapeHtml(f.checkpointName)}</span> ${statusChip(f.status)}</div>
                        <div class="finding-meta">${where}</div>
                        ${f.observation ? `<div class="finding-field"><b>Observation:</b> ${multiline(f.observation)}</div>` : ''}
                        ${f.issue ? `<div class="finding-field"><b>Issue:</b> ${multiline(f.issue)}</div>` : ''}
                        ${photosHtml(f.photos)}
                    </div>`;
            });
        // Heading, "Findings:" and the first finding print as one unit so a heading is never left alone at a page end
        html += `
            <div class="area-block">
                <div class="keep-together">
                    <h3>${area.number}. ${escapeHtml(area.name)}</h3>
                    <p class="findings-label">Findings:</p>
                    ${findings[0]}
                </div>
                ${findings.slice(1).join('')}
                <p class="risk-line">Risk Level (Low/Medium/High):
                    <select class="risk-select" aria-label="Risk level for ${escapeHtml(area.name)}">
                        ${['', 'Low', 'Medium', 'High'].map(r => `<option value="${r}" ${r === risk ? 'selected' : ''}>${r || '—'}</option>`).join('')}
                    </select>
                </p>
            </div>`;
    });

    const transferred = model.areas.flatMap(a => a.rows.filter(r => r.taskMasterId));
    html += `
        <h2>Non-Conformity / Urgent Follow up required (Transferred to Task Master)</h2>
        ${transferred.length === 0
            ? `<p class="muted">No checkpoints were transferred to TaskMaster.</p>`
            : `<table class="grid">
                <thead><tr><th style="width:60px">Ref</th><th>Finding</th><th style="width:160px">TaskMaster Job</th></tr></thead>
                <tbody>
                    ${transferred.map(r => `
                        <tr>
                            <td>${escapeHtml(r.ref || '—')}</td>
                            <td><b>${escapeHtml(r.checkpointName)}</b>${r.issue ? ` — ${multiline(r.issue)}` : ''}
                                <div class="finding-meta">${[r.subareaName, r.villaName].filter(Boolean).map(escapeHtml).join(' · ')}</div></td>
                            <td>${escapeHtml(r.taskMasterId)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>`}
        <div class="end-rule"></div>`;

    return html;
}
//#endregion

//#region Export
function renderExport(model) {
    const total = model.areas.reduce((n, a) => n + a.rows.length, 0);
    let html = `
        <div class="brand"><img src="main/images/opro-logo.png" alt="OPRO - Adding Care to Your Property"></div>
        <h1 class="report-title">Audit Data Export</h1>
        <hr class="rule">
        <ul class="info">
            <li>Property Name: <b>${escapeHtml(model.propertyName)}</b></li>
            <li>Audit ID: ${escapeHtml(model.auditId)}</li>
            <li>Audit Date(s): ${escapeHtml(auditDateRange(model))}</li>
            <li>Auditor(s): ${escapeHtml(model.auditors.join(', '))}</li>
            <li>Checkpoints saved: ${total} · Overall score: ${scoreText(model.overall)}</li>
        </ul>`;

    if (total === 0) {
        return html + `<p class="state">No checkpoints have been saved in this audit yet.</p>`;
    }

    model.areas.filter(a => a.rows.length > 0).forEach(area => {
        html += `
            <h2>${area.number}. ${escapeHtml(area.name)} <span class="muted" style="font-size:14px">— Score ${scoreText(area.score)}</span></h2>
            <table class="grid">
                <thead>
                    <tr>
                        <th>Sub Area</th>
                        ${area.isVilla ? '<th>Villa</th>' : ''}
                        <th>Checkpoint</th>
                        <th>Status</th>
                        <th>Responsibility</th>
                        <th>Observation</th>
                        <th>Issue</th>
                        <th>Photo</th>
                        <th>TaskMaster</th>
                        <th>Saved</th>
                    </tr>
                </thead>
                <tbody>
                    ${area.rows.map(r => `
                        <tr>
                            <td>${escapeHtml(r.subareaName)}</td>
                            ${area.isVilla ? `<td>${escapeHtml(r.villaName)}</td>` : ''}
                            <td>${escapeHtml(r.checkpointName)}</td>
                            <td>${statusChip(r.status)}</td>
                            <td>${escapeHtml(r.responsibility)}</td>
                            <td>${multiline(r.observation)}</td>
                            <td>${multiline(r.issue)}</td>
                            <td>${photosHtml(r.photos)}</td>
                            <td>${escapeHtml(r.taskMasterId)}</td>
                            <td class="finding-meta">${escapeHtml(r.savedBy)}<br>${escapeHtml(formatDateTime(r.savedOn))}</td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    });
    return html;
}

function DownloadExcel() {
    if (!Report || typeof XLSX === 'undefined') {
        alert('Excel export is not available right now. Please check your internet connection and reload.');
        return;
    }

    const dataRows = [[
        'Area #', 'Area', 'Sub Area', 'Villa', 'Checkpoint', 'Status', 'Responsibility',
        'Observation', 'Issue', 'Photo URL(s)', 'TaskMaster Job', 'Saved By', 'Saved On'
    ]];
    Report.areas.forEach(area => {
        area.rows.forEach(r => {
            dataRows.push([
                area.number, area.name, r.subareaName, r.villaName, r.checkpointName,
                STATUS[r.status] ? STATUS[r.status].name : '', r.responsibility,
                r.observation, r.issue, r.photos.join('\n'), r.taskMasterId,
                r.savedBy, formatDateTime(r.savedOn)
            ]);
        });
    });

    const summaryRows = [
        ['Maintenance & Safety Audit'],
        [],
        ['Property Name', Report.propertyName],
        ['Audit ID', Report.auditId],
        ['Audit Date(s)', auditDateRange(Report)],
        ['Auditor(s)', Report.auditors.join(', ')],
        [],
        ['#', 'Area', 'Checkpoints rated', 'Score %', 'Unsatisfactory', 'Poor', 'Safety Issue']
    ];
    Report.areas.forEach(a => {
        summaryRows.push([
            a.number, a.name, a.score.checked,
            a.score.percent === null ? '' : Number(a.score.percent.toFixed(1)),
            a.rows.filter(r => r.status === 4).length,
            a.rows.filter(r => r.status === 5).length,
            a.rows.filter(r => r.status === 6).length
        ]);
    });
    summaryRows.push(['', 'Overall', Report.overall.checked, Report.overall.percent === null ? '' : Number(Report.overall.percent.toFixed(1))]);
    summaryRows.push([]);
    summaryRows.push(['Key Strengths Observed']);
    summaryRows.push([richTextToPlain(Report.keyStrength)]);

    const wb = XLSX.utils.book_new();
    const summary = XLSX.utils.aoa_to_sheet(summaryRows);
    summary['!cols'] = [{ wch: 18 }, { wch: 34 }, { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 13 }];
    XLSX.utils.book_append_sheet(wb, summary, 'Summary');

    const data = XLSX.utils.aoa_to_sheet(dataRows, { cellDates: true });
    data['!cols'] = [
        { wch: 7 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 40 }, { wch: 14 }, { wch: 16 },
        { wch: 45 }, { wch: 45 }, { wch: 50 }, { wch: 16 }, { wch: 28 }, { wch: 18 }
    ];
    data['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: dataRows.length - 1, c: dataRows[0].length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, data, 'Audit Data');

    const safeName = Report.propertyName.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
    XLSX.writeFile(wb, `${Report.auditId}_${safeName || 'audit'}.xlsx`);
}

function richTextToPlain(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(sanitizeRichText(html).replace(/<\/(p|li|h1|h2|h3|blockquote)>/gi, '$&\n'), 'text/html');
    return doc.body.textContent.replace(/\n{3,}/g, '\n\n').trim();
}
//#endregion

function DownloadPdf() {
    // The browser print dialog's "Save as PDF" produces the PDF; wait for photos so none print blank
    const pending = [...document.querySelectorAll('#sheet img')].filter(img => !img.complete);
    if (pending.length === 0) {
        window.print();
        return;
    }
    ShowSpinner();
    Promise.all(pending.map(img => new Promise(done => { img.onload = img.onerror = done; })))
        .then(() => {
            HideSpinner();
            window.print();
        });
}
