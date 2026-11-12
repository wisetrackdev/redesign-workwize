

var currentsubareaid = null;
var currentsubarea = null;
var subareas = null;
var villaid = null;

// Global Photo Upload Handler Functions
function handlePhotoUpload(input, checkpointId) {
    console.log('handlePhotoUpload called with checkpointId:', checkpointId);
    console.log('input.files:', input.files);
    if (input.files && input.files[0]) {
        const file = input.files[0];
        console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size);

        if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
            alert('Please select a JPEG or PNG image only.');
            input.value = '';
            return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('Image size must be less than 5MB. Please select a smaller image.');
            input.value = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('preview_img_' + checkpointId).src = e.target.result;
            document.getElementById('upload_icon_' + checkpointId).style.display = 'none';
            document.getElementById('image_preview_' + checkpointId).style.display = 'flex';
            window['photo_data_' + checkpointId] = e.target.result;
            delete window['photo_removed_' + checkpointId];
        };
        reader.readAsDataURL(file);
    }
}

function removePhoto(checkpointId) {
    console.log('removePhoto called for:', checkpointId);

    // Clear the file input
    var fileInput = document.getElementById('photo_inline_' + checkpointId);
    if (fileInput) {
        fileInput.value = '';
        console.log('File input cleared');
    }

    // Clear the preview image
    var previewImg = document.getElementById('preview_img_' + checkpointId);
    if (previewImg) {
        previewImg.src = '';
    }

    // Show the upload button container (use flex for centering)
    var uploadIcon = document.getElementById('upload_icon_' + checkpointId);
    if (uploadIcon) {
        uploadIcon.style.display = 'flex';
        console.log('Upload icon shown');
    }

    // Hide the image preview container
    var imagePreview = document.getElementById('image_preview_' + checkpointId);
    if (imagePreview) {
        imagePreview.style.display = 'none';
        console.log('Image preview hidden');
    }

    // Clear stored base64 data
    if (window['photo_data_' + checkpointId]) {
        delete window['photo_data_' + checkpointId];
        console.log('Photo data cleared');
    }
    // Saving the row now tells the server to delete the saved photo too
    window['photo_removed_' + checkpointId] = true;
    markRowDirty(checkpointId);
}

function updateRowStatus(checkpointId, statusValue) {
    const row = document.getElementById('row_' + checkpointId);
    if (row) {
        row.classList.remove('row-excellent', 'row-good', 'row-satisfactory', 'row-unsatisfactory', 'row-poor', 'row-safety');
        const statusMap = {
            '01': 'row-excellent',
            '02': 'row-good',
            '03': 'row-satisfactory',
            '04': 'row-unsatisfactory',
            '05': 'row-poor',
            '06': 'row-safety'
        };
        if (statusMap[statusValue]) {
            row.classList.add(statusMap[statusValue]);
        }
    }
}

function initializePage(containerId) {
    $(document).ready(function () {

        var userdata = $(containerId).data('controlData');
        currentsubareaid = userdata.controlData;
        var renderType = userdata.renderType;
        var UserObject = GetStoredUserData();
        UserRoles = UserObject.role;
        renderCurrentChecklist(null);
    });
}

// Draws the checklist for the current area/subarea/villa. Pass drafts (from captureDrafts)
// to carry unsaved rows across the redraw; pass null for a fresh view.
function renderCurrentChecklist(drafts) {
    subareas = findAreaById(currentareaid, PropertyData.propArea);
    currentsubarea = findCheckpoints(currentareaid, currentsubareaid, PropertyData.propArea)
    villaid = $('#villa-select').val();

    if (!drafts) {
        clearPhotoDrafts();
    }

    // Villa areas show nothing until the auditor picks a villa
    if (subareas.isvilla === true && subareas.villasList && subareas.villasList.length > 0 && !villaid) {
        showSelectVillaPrompt();
        return;
    }
    if (typeof refreshVillaOptions === 'function') {
        refreshVillaOptions();
    }

    var items;
    if (villaid !== undefined && villaid.length > 1) {
        var tables = createVillaWiseCheckpointTable(villaid, currentsubarea.checkpoints, currentsubarea.subareaName, PropertyData.propEmp, AuditData)
        $('#subarea-checklist-holder').html(tables);
        items = getItemsByAreaVilla(AuditData, subareas.areaid, villaid)
    }
    else {
        var tables = createCheckpointTable(currentsubarea.checkpoints, currentsubarea.subareaName, PropertyData.propEmp, AuditData)
        $('#subarea-checklist-holder').html(tables);
        items = getItemsByArea(AuditData, subareas.areaid)
    }

    // Nothing saved yet for this area/villa
    var latest = getLatestItemWithDate(items);
    $('#sc_inspectby').text(latest ? latest.item.createdBy : '-')
    $('#sc_inspectdate').text(latest ? latest.formattedDate : '-')

    if (drafts) {
        restoreDrafts(drafts);
    }

    // Initialize auto-resize for textareas
    initAutoResizeTextareas();
    updateSaveAllButton();
}

function showSelectVillaPrompt() {
    ['#sc_excel', '#sc_good', '#sc_poor', '#sc_safty', '#sc_satis', '#sc_unsatis'].forEach(id => $(id).text('0'));
    $('#sc_score').text('0%');
    $('#sc_inspectby').text('-');
    $('#sc_inspectdate').text('-');

    // Shortcuts to the villas already audited, so saved work is one click away
    const counts = savedCountByVilla(subareas.areaid);
    const audited = subareas.villasList.filter(v => counts[v.villaId]);
    const shortcuts = audited.length === 0 ? '' :
        '<p class="mb-2 mt-3">Already audited in this audit:</p><div class="d-flex flex-wrap justify-content-center gap-2">' +
        audited.map(v => `<button type="button" class="btn btn-sm btn-outline-primary" onclick="pickVilla('${v.villaId}')">` +
            `${$('<div>').text(v.villaName).html()} <span class="badge bg-primary ms-1">${counts[v.villaId]}</span></button>`).join('') +
        '</div>';
    $('#subarea-checklist-holder').html(
        '<div class="table-container"><div class="text-muted p-4 text-center">' +
        '<p class="mb-0"><i class="fa fa-hand-pointer me-2"></i>Select a villa above to start auditing this sub area.</p>' +
        shortcuts + '</div></div>');
    updateSaveAllButton();
}

// Photos picked or removed but not saved live on window; drop them when a different checklist is shown
// so they can't be saved against another villa's row with the same checkpoint id.
function clearPhotoDrafts() {
    Object.keys(window).forEach(key => {
        if (key.indexOf('photo_data_') === 0 || key.indexOf('photo_removed_') === 0) {
            delete window[key];
        }
    });
}

// Snapshot of every unsaved row, so a redraw doesn't lose what the user typed
function captureDrafts(excludeIds = []) {
    const drafts = {};
    $('.audit-table tr.row-dirty').each(function () {
        const id = this.id.substring(4);
        if (excludeIds.indexOf(id) !== -1) {
            return;
        }
        const preview = document.getElementById('image_preview_' + id);
        drafts[id] = {
            status: $('#status_' + id).val(),
            resp: $('#resp_' + id).val(),
            obs: $('#obs_' + id).val(),
            issue: $('#issue_' + id).val(),
            photoHidden: preview ? preview.style.display === 'none' : true
        };
    });
    return drafts;
}

function restoreDrafts(drafts) {
    Object.keys(drafts).forEach(id => {
        if (!document.getElementById('row_' + id)) {
            return;
        }
        const d = drafts[id];
        $('#status_' + id).val(d.status);
        $('#resp_' + id).val(d.resp);
        $('#obs_' + id).val(d.obs);
        $('#issue_' + id).val(d.issue);
        updateRowStatus(id, d.status);

        if (window['photo_data_' + id]) {
            document.getElementById('preview_img_' + id).src = window['photo_data_' + id];
            document.getElementById('upload_icon_' + id).style.display = 'none';
            document.getElementById('image_preview_' + id).style.display = 'flex';
        } else if (d.photoHidden) {
            document.getElementById('upload_icon_' + id).style.display = 'flex';
            document.getElementById('image_preview_' + id).style.display = 'none';
        }
        $('#row_' + id).addClass('row-dirty');
    });
}

// Auto-resize textareas function
function initAutoResizeTextareas() {
    document.querySelectorAll('.auto-textarea').forEach(function (textarea) {
        autoResizeTextarea(textarea);
        textarea.addEventListener('input', function () {
            autoResizeTextarea(this);
        });
    });
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(textarea.scrollHeight, 40) + 'px';
}

function findCheckpoints(areaId, subareaId, propAreas, propId = null) {
    // Input validation
    if (!areaId || !subareaId || !propAreas || !Array.isArray(propAreas)) {
        console.error("Invalid input parameters");
        return null;
    }

    // Find the matching area
    let area;
    if (propId) {
        // If propId is provided, use it in the search criteria
        area = propAreas.find(area =>
            area.areaid === areaId && area.propId === propId
        );
    } else {
        // Otherwise, search only by areaId
        area = propAreas.find(area => area.areaid === areaId);
    }

    if (!area || !area.subAreas) {
        return null;
    }

    // Find and return the matching subarea object (not just the checkpoints)
    return area.subAreas.find(subarea => subarea.subareaId === subareaId) || null;
}
function findMatchingCheckpoints(checkpointDefinitions, auditData) {
    // Create a Set of composite keys for efficient lookup
    // Each key combines propId, areaId, subareaId, and checkpointId
    const compositeKeys = new Set(
        checkpointDefinitions.map(item =>
            `${item.propId}|${item.areaId}|${item.subareaId}|${item.checkpointId}`
        )
    );

    // Filter the second list to find items with matching composite keys
    const matchingItems = auditData.filter(item => {
        const compositeKey = `${item.propId}|${item.areaId}|${item.subareaId}|${item.checkpointId}`;
        return compositeKeys.has(compositeKey);
    });

    return matchingItems;
}


function countCheckpointStatus(auditData) {
    // Define the mapping between status values and labels
    const statusMapping = {
        1: "Excellent",
        2: "Good",
        3: "Satisfactory",
        4: "Unsatisfactory",
        5: "Poor",
        6: "SafetyIssue"
    };

    // Define fixed coefficients (percentages) for each status
    const statusCoefficients = {
        "Excellent": 100,
        "Good": 75,
        "Satisfactory": 50,
        "Unsatisfactory": 25,
        "Poor": 0,
        "SafetyIssue": 0
    };

    // Initialize counters for all possible statuses
    const statusCounts = {
        "Excellent": 0,
        "Good": 0,
        "Satisfactory": 0,
        "Unsatisfactory": 0,
        "Poor": 0,
        "SafetyIssue": 0
    };

    // Count occurrences of each status
    auditData.forEach(item => {
        const statusLabel = statusMapping[item.checkpointStatus];
        if (statusLabel && statusCounts.hasOwnProperty(statusLabel)) {
            statusCounts[statusLabel]++;
        }
    });

    // Calculate weighted scores (count × coefficient)
    const weightedScores = {};
    Object.entries(statusCounts).forEach(([status, count]) => {
        const coefficient = statusCoefficients[status];
        weightedScores[status] = count * coefficient;
    });

    // Calculate total counts (S11)
    const totalCounts = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    // Calculate sum of weighted scores (M7+N7+O7+P7+Q7+R7)
    const sumWeightedScores = Object.values(weightedScores).reduce((sum, score) => sum + score, 0);

    // Calculate final score: (100% / S11) * (sum of weighted scores)
    const finalScore = totalCounts > 0 ? (sumWeightedScores / totalCounts) : 0;

    return {
        counts: statusCounts,
        weightedScores: weightedScores,
        finalScore: finalScore
    };
}

// Helper function to get row status class based on status value
function getRowStatusClass(statusValue) {
    const statusMap = {
        '01': 'row-excellent',
        '02': 'row-good',
        '03': 'row-satisfactory',
        '04': 'row-unsatisfactory',
        '05': 'row-poor',
        '06': 'row-safety'
    };
    return statusMap[statusValue] || '';
}

function createCheckpointTable(checkpoints, subareaName = "Checkpoints", teams = [], existingData = []) {

    var dtd = findMatchingCheckpoints(checkpoints, existingData);
    var odt = countCheckpointStatus(dtd)
    $('#sc_excel').text(odt.counts.Excellent)
    $('#sc_good').text(odt.counts.Good)
    $('#sc_poor').text(odt.counts.Poor)
    $('#sc_safty').text(odt.counts.SafetyIssue)
    $('#sc_satis').text(odt.counts.Satisfactory)
    $('#sc_unsatis').text(odt.counts.Unsatisfactory)
    $('#sc_score').text(`${odt.finalScore.toFixed(1)}%`)

    // Input validation
    if (!checkpoints || !Array.isArray(checkpoints) || checkpoints.length === 0) {
        var rxtx = `
        <div class="checkpoint-header">
            <h2 class="checkpoint-title">${subareaName}</h2>
            <div class="add-section">
                <input type="text" class="add-input" placeholder="Enter new checkpoint name" id="newCheckpointInput">
                <button class="btn-add" onclick="AddNewCheckPoint()">
                    <i class="fa fa-plus"></i> Add
                </button>
            </div>
        </div>
        <div class="table-container">
            <p class="text-muted p-4 text-center">No checkpoints available for this subarea.</p>
        </div>`

        return rxtx;
    }

    // Helper function to find existing data for a checkpoint
    function findExistingCheckpointData(checkpointId) {
        if (!existingData || !Array.isArray(existingData)) {

            return null;
        }
        return existingData.find(data => data.checkpointId === checkpointId) || null;
    }

    // Helper function to create status dropdown with pre-selected value - NEW STYLING
    function createStatusDropdown(checkpointId, selectedValue = '') {
        const statusOptions = [
            { value: "01", text: "Excellent", class: "status-excellent" },
            { value: "02", text: "Good", class: "status-good" },
            { value: "03", text: "Satisfactory", class: "status-satisfactory" },
            { value: "04", text: "Unsatisfactory", class: "status-unsatisfactory" },
            { value: "05", text: "Poor", class: "status-poor" },
            { value: "06", text: "Safety Issue", class: "status-safety" },
            { value: "07", text: "N/A", class: "NA" }
        ];

        let optionsHTML = '<option value="">Select</option>';
        statusOptions.forEach(option => {
            const selected = selectedValue.toString() === option.value ? 'selected' : '';
            optionsHTML += `<option value="${option.value}" ${selected}>${option.text}</option>`;
        });

        return `<select name="status_${checkpointId}" id="status_${checkpointId}" class="form-select-new" onchange="updateRowStatus('${checkpointId}', this.value)">${optionsHTML}</select>`;
    }

    // Helper function to create responsibility dropdown with pre-selected value - NEW STYLING
    function createResponsibilityDropdown(checkpointId, selectedValue = '') {
        let optionsHTML = '<option value="">Select</option>';

        if (teams && Array.isArray(teams) && teams.length > 0) {
            teams.forEach(team => {
                const selected = selectedValue === team.teamId ? 'selected' : '';
                optionsHTML += `<option value="${team.teamId}" ${selected}>${team.teamName}</option>`;
            });
        } else {
            // Fallback options
            const fallbackOptions = [
                { value: "01", text: "Eng" },
                { value: "02", text: "HK" },
                { value: "03", text: "Eng+HK" }
            ];

            fallbackOptions.forEach(option => {
                const selected = selectedValue === option.value ? 'selected' : '';
                optionsHTML += `<option value="${option.value}" ${selected}>${option.text}</option>`;
            });
        }

        return `<select name="resp_${checkpointId}" id="resp_${checkpointId}" class="form-select-new">${optionsHTML}</select>`;
    }

    // Helper function to create image preview with existing image if available - NEW STYLING
    function createImagePreview(checkpointId, imageUrl = null) {
        if (!imageUrl) {
            // No existing image - show upload button with label approach for Chrome compatibility
            return `
                <div id="upload_icon_${checkpointId}" class="photo-container-new">
                    <input type="file" id="photo_inline_${checkpointId}"
                           accept="image/jpeg, image/png"
                           style="position:absolute;left:-9999px;opacity:0;"
                           onchange="handlePhotoUpload(this, '${checkpointId}')">
                    <label for="photo_inline_${checkpointId}" class="btn-upload-photo">
                        <i class="fa fa-camera"></i> Upload
                    </label>
                </div>

                <div id="image_preview_${checkpointId}" class="photo-container-new" style="display:none;">
                    <div class="image-preview-new">
                        <img id="preview_img_${checkpointId}" src="" alt="Preview" class="preview-image">
                        <button type="button" class="remove-photo-btn" onclick="removePhoto('${checkpointId}')">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Existing image - show preview with option to change
            return `
                <div id="upload_icon_${checkpointId}" class="photo-container-new" style="display:none;">
                    <input type="file" id="photo_inline_${checkpointId}"
                           accept="image/jpeg, image/png"
                           style="position:absolute;left:-9999px;opacity:0;"
                           onchange="handlePhotoUpload(this, '${checkpointId}')">
                    <label for="photo_inline_${checkpointId}" class="btn-upload-photo">
                        <i class="fa fa-camera"></i> Upload
                    </label>
                </div>

                <div id="image_preview_${checkpointId}" class="photo-container-new" style="display:block;">
                    <div class="image-preview-new">
                        <img id="preview_img_${checkpointId}" src="${imageUrl}" alt="Preview" class="preview-image">
                        <button type="button" class="remove-photo-btn" onclick="removePhoto('${checkpointId}')">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Start building the HTML table with NEW STYLING from test.html
    let tableHTML = `
<!-- Header Section -->
<div class="checkpoint-header">
    <h2 class="checkpoint-title">${subareaName}</h2>
    <div class="header-actions">
        <div class="add-section">
            <input type="text" class="add-input" placeholder="Enter new checkpoint name" id="newCheckpointInput">
            <button class="btn-add" onclick="AddNewCheckPoint()">
                <i class="fa fa-plus"></i> Add
            </button>
        </div>
        <button class="btn-save-all" id="saveAllBtn" onclick="SaveAllCheckpoints()" disabled title="Save every edited checkpoint in this list">
            <i class="fa fa-save"></i> Save All <span class="save-all-count"></span>
        </button>
    </div>
</div>

<!-- Table Container -->
<div class="table-container">
    <div class="table-wrapper">
        <table class="audit-table">
            <thead>
                <tr>
                    <th class="col-sno">S.No</th>
                    <th class="col-checkpoint">Checkpoint</th>
                    <th class="col-status">Status</th>
                    <th class="col-responsibility">Responsibility</th>
                    <th class="col-photo">Photo</th>
                    <th class="col-observation">Observation</th>
                    <th class="col-issue">Issue</th>
                    <th class="col-taskmaster">TaskMaster</th>
                    <th class="col-action">Action</th>
                </tr>
            </thead>
            <tbody>`;

    // Add each checkpoint row
    checkpoints.forEach((checkpoint, index) => {
        // Find existing data for this checkpoint
        const existingCheckpointData = findExistingCheckpointData(checkpoint.checkpointId);

        // Extract values from existing data if available
        const statusValue = existingCheckpointData ? existingCheckpointData.checkpointStatus.toString().padStart(2, '0') : '';
        const responsibilityValue = existingCheckpointData ? existingCheckpointData.checkpointResponsibility : '';
        const observationValue = existingCheckpointData ? existingCheckpointData.checkpointObservation || '' : '';
        const issueValue = existingCheckpointData ? existingCheckpointData.checkpointIssue || '' : '';

        // Get image URL if available
        let imageUrl = null;
        if (existingCheckpointData && existingCheckpointData.uploads && existingCheckpointData.uploads.length > 0) {
            imageUrl = existingCheckpointData.uploads[0].fileurl;
        }

        // Get row status class
        const rowStatusClass = getRowStatusClass(statusValue);

        tableHTML += `
                <tr id="row_${checkpoint.checkpointId}" class="${rowStatusClass}">
                    <td>
                        <span class="serial-number">${index + 1}</span>
                    </td>
                    <td>
                        <span class="checkpoint-name">${checkpoint.checkpointName}</span>
                    </td>
                    <td>
                        ${createStatusDropdown(checkpoint.checkpointId, statusValue)}
                    </td>
                    <td>
                        ${createResponsibilityDropdown(checkpoint.checkpointId, responsibilityValue)}
                    </td>
                    <td>
                        ${createImagePreview(checkpoint.checkpointId, imageUrl)}
                    </td>
                    <td>
                        <div class="textarea-container">
                            <textarea class="auto-textarea" name="obs_${checkpoint.checkpointId}" id="obs_${checkpoint.checkpointId}"
                                   placeholder="Enter observation...">${observationValue}</textarea>
                        </div>
                    </td>
                    <td>
                        <div class="textarea-container">
                            <textarea class="auto-textarea" name="issue_${checkpoint.checkpointId}" id="issue_${checkpoint.checkpointId}"
                                   placeholder="Enter issue...">${issueValue}</textarea>
                        </div>
                    </td>
                    <td>
                        ${!existingCheckpointData ?
                '<span class="status-badge status-pending"><i class="fa fa-clock"></i> Save First</span>' :
                existingCheckpointData.isjobtracker === false ?
                    `<button class="btn-taskmaster-new" onclick="AddToTaskMaster('${checkpoint.checkpointId}')"><i class="fa fa-plus"></i> Add</button>` :
                    `<span class="status-badge status-completed"><i class="fa fa-check"></i> ${existingCheckpointData.jobtrackerid || 'Added'}</span>`
            }
                    </td>
                    <td>
                        <button class="btn-new btn-save-new" onclick="SaveCheckpointData('${checkpoint.checkpointId}')">
                            <i class="fa fa-save"></i> Save
                        </button>
                    </td>
                </tr>`;
    });

    // Close the table and containers
    tableHTML += `
            </tbody>
        </table>
    </div>
</div>

<!-- Modal for Observation/Issue -->
<div class="modal fade" id="observationModal" tabindex="-1" aria-labelledby="observationModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="observationModalLabel">Enter Details</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="modal-checkpoint-id">
        <input type="hidden" id="modal-field-type">
        <div class="mb-3">
          <label for="modal-text" class="form-label">Details</label>
          <textarea class="form-control" id="modal-text" rows="5"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="saveModalData()">Save</button>
      </div>
    </div>
  </div>
</div>`;

    return tableHTML;
}






function createVillaWiseCheckpointTable(villaid, checkpoints, subareaName = "Checkpoints", teams = [], existingData = []) {

    var dtd = findMatchingCheckpoints(checkpoints, existingData);
    var odt = countCheckpointStatus(dtd)
    $('#sc_excel').text(odt.counts.Excellent)
    $('#sc_good').text(odt.counts.Good)
    $('#sc_poor').text(odt.counts.Poor)
    $('#sc_safty').text(odt.counts.SafetyIssue)
    $('#sc_satis').text(odt.counts.Satisfactory)
    $('#sc_unsatis').text(odt.counts.Unsatisfactory)
    $('#sc_score').text(`${odt.finalScore.toFixed(1)}%`)

    // Input validation
    if (!checkpoints || !Array.isArray(checkpoints) || checkpoints.length === 0) {
        var rxtx = `
        <div class="checkpoint-header">
            <h2 class="checkpoint-title">${subareaName}</h2>
            <div class="add-section">
                <input type="text" class="add-input" placeholder="Enter new checkpoint name" id="newCheckpointInput">
                <button class="btn-add" onclick="AddNewCheckPoint()">
                    <i class="fa fa-plus"></i> Add
                </button>
            </div>
        </div>
        <div class="table-container">
            <p class="text-muted p-4 text-center">No checkpoints available for this subarea.</p>
        </div>`

        return rxtx;
    }

    // Helper function to find existing data for a checkpoint
    function vfindExistingCheckpointData(checkpointId) {
        if (!existingData || !Array.isArray(existingData)) {
            return null;
        }
        var res = existingData.find(data => data.checkpointId === checkpointId && data.villaId === villaid) || null;

        return res
    }

    // Helper function to create status dropdown with pre-selected value - NEW STYLING
    function vcreateStatusDropdown(checkpointId, selectedValue = '') {
        const statusOptions = [
            { value: "01", text: "Excellent", class: "status-excellent" },
            { value: "02", text: "Good", class: "status-good" },
            { value: "03", text: "Satisfactory", class: "status-satisfactory" },
            { value: "04", text: "Unsatisfactory", class: "status-unsatisfactory" },
            { value: "05", text: "Poor", class: "status-poor" },
            { value: "06", text: "Safety Issue", class: "status-safety" },
            { value: "07", text: "N/A", class: "NA" }

        ];

        let optionsHTML = '<option value="">Select</option>';
        statusOptions.forEach(option => {
            const selected = selectedValue.toString() === option.value ? 'selected' : '';
            optionsHTML += `<option value="${option.value}" ${selected}>${option.text}</option>`;
        });

        return `<select name="status_${checkpointId}" id="status_${checkpointId}" class="form-select-new" onchange="updateRowStatus('${checkpointId}', this.value)">${optionsHTML}</select>`;
    }

    // Helper function to create responsibility dropdown with pre-selected value - NEW STYLING
    function vcreateResponsibilityDropdown(checkpointId, selectedValue = '') {
        let optionsHTML = '<option value="">Select</option>';

        if (teams && Array.isArray(teams) && teams.length > 0) {
            teams.forEach(team => {
                const selected = selectedValue === team.teamId ? 'selected' : '';
                optionsHTML += `<option value="${team.teamId}" ${selected}>${team.teamName}</option>`;
            });
        } else {
            // Fallback options
            const fallbackOptions = [
                { value: "01", text: "Eng" },
                { value: "02", text: "HK" },
                { value: "03", text: "Eng+HK" }
            ];

            fallbackOptions.forEach(option => {
                const selected = selectedValue === option.value ? 'selected' : '';
                optionsHTML += `<option value="${option.value}" ${selected}>${option.text}</option>`;
            });
        }

        return `<select name="resp_${checkpointId}" id="resp_${checkpointId}" class="form-select-new">${optionsHTML}</select>`;
    }

    // Helper function to create image preview with existing image if available - NEW STYLING
    function vcreateImagePreview(checkpointId, imageUrl = null) {
        if (!imageUrl) {
            // No existing image - show upload button with label approach for Chrome compatibility
            return `
                <div id="upload_icon_${checkpointId}" class="photo-container-new">
                    <input type="file" id="photo_inline_${checkpointId}"
                           accept="image/jpeg, image/png"
                           style="position:absolute;left:-9999px;opacity:0;"
                           onchange="handlePhotoUpload(this, '${checkpointId}')">
                    <label for="photo_inline_${checkpointId}" class="btn-upload-photo">
                        <i class="fa fa-camera"></i> Upload
                    </label>
                </div>

                <div id="image_preview_${checkpointId}" class="photo-container-new" style="display:none;">
                    <div class="image-preview-new">
                        <img id="preview_img_${checkpointId}" src="" alt="Preview" class="preview-image">
                        <button type="button" class="remove-photo-btn" onclick="removePhoto('${checkpointId}')">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Existing image - show preview with option to change
            return `
                <div id="upload_icon_${checkpointId}" class="photo-container-new" style="display:none;">
                    <input type="file" id="photo_inline_${checkpointId}"
                           accept="image/jpeg, image/png"
                           style="position:absolute;left:-9999px;opacity:0;"
                           onchange="handlePhotoUpload(this, '${checkpointId}')">
                    <label for="photo_inline_${checkpointId}" class="btn-upload-photo">
                        <i class="fa fa-camera"></i> Upload
                    </label>
                </div>

                <div id="image_preview_${checkpointId}" class="photo-container-new" style="display:block;">
                    <div class="image-preview-new">
                        <img id="preview_img_${checkpointId}" src="${imageUrl}" alt="Preview" class="preview-image">
                        <button type="button" class="remove-photo-btn" onclick="removePhoto('${checkpointId}')">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Start building the HTML table with NEW STYLING
    let tableHTML = `
<!-- Header Section -->
<div class="checkpoint-header">
    <h2 class="checkpoint-title">${subareaName}</h2>
    <div class="header-actions">
        <div class="add-section">
            <input type="text" class="add-input" placeholder="Enter new checkpoint name" id="newCheckpointInput">
            <button class="btn-add" onclick="AddNewCheckPoint()">
                <i class="fa fa-plus"></i> Add
            </button>
        </div>
        <button class="btn-save-all" id="saveAllBtn" onclick="SaveAllCheckpoints()" disabled title="Save every edited checkpoint in this list">
            <i class="fa fa-save"></i> Save All <span class="save-all-count"></span>
        </button>
    </div>
</div>

<!-- Table Container -->
<div class="table-container">
    <div class="table-wrapper">
        <table class="audit-table">
            <thead>
                <tr>
                    <th class="col-sno">S.No</th>
                    <th class="col-checkpoint">Checkpoint</th>
                    <th class="col-status">Status</th>
                    <th class="col-responsibility">Responsibility</th>
                    <th class="col-photo">Photo</th>
                    <th class="col-observation">Observation</th>
                    <th class="col-issue">Issue</th>
                    <th class="col-taskmaster">TaskMaster</th>
                    <th class="col-action">Action</th>
                </tr>
            </thead>
            <tbody>`;

    // Add each checkpoint row
    checkpoints.forEach((checkpoint, index) => {
        // Find existing data for this checkpoint
        const existingCheckpointData = vfindExistingCheckpointData(checkpoint.checkpointId);

        // Extract values from existing data if available
        const statusValue = existingCheckpointData ? existingCheckpointData.checkpointStatus.toString().padStart(2, '0') : '';
        const responsibilityValue = existingCheckpointData ? existingCheckpointData.checkpointResponsibility : '';
        const observationValue = existingCheckpointData ? existingCheckpointData.checkpointObservation || '' : '';
        const issueValue = existingCheckpointData ? existingCheckpointData.checkpointIssue || '' : '';

        // Get image URL if available
        let imageUrl = null;
        if (existingCheckpointData && existingCheckpointData.uploads && existingCheckpointData.uploads.length > 0) {
            imageUrl = existingCheckpointData.uploads[0].fileurl;
        }

        // Get row status class
        const rowStatusClass = getRowStatusClass(statusValue);

        tableHTML += `
                <tr id="row_${checkpoint.checkpointId}" class="${rowStatusClass}">
                    <td>
                        <span class="serial-number">${index + 1}</span>
                    </td>
                    <td>
                        <span class="checkpoint-name">${checkpoint.checkpointName}</span>
                    </td>
                    <td>
                        ${vcreateStatusDropdown(checkpoint.checkpointId, statusValue)}
                    </td>
                    <td>
                        ${vcreateResponsibilityDropdown(checkpoint.checkpointId, responsibilityValue)}
                    </td>
                    <td>
                        ${vcreateImagePreview(checkpoint.checkpointId, imageUrl)}
                    </td>
                    <td>
                        <div class="textarea-container">
                            <textarea class="auto-textarea" name="obs_${checkpoint.checkpointId}" id="obs_${checkpoint.checkpointId}"
                                   placeholder="Enter observation...">${observationValue}</textarea>
                        </div>
                    </td>
                    <td>
                        <div class="textarea-container">
                            <textarea class="auto-textarea" name="issue_${checkpoint.checkpointId}" id="issue_${checkpoint.checkpointId}"
                                   placeholder="Enter issue...">${issueValue}</textarea>
                        </div>
                    </td>
                    <td>
                        ${!existingCheckpointData ?
                '<span class="status-badge status-pending"><i class="fa fa-clock"></i> Save First</span>' :
                existingCheckpointData.isjobtracker === false ?
                    `<button class="btn-taskmaster-new" onclick="AddToTaskMaster('${checkpoint.checkpointId}')"><i class="fa fa-plus"></i> Add</button>` :
                    `<span class="status-badge status-completed"><i class="fa fa-check"></i> ${existingCheckpointData.jobtrackerid || 'Added'}</span>`
            }
                    </td>
                    <td>
                        <button class="btn-new btn-save-new" onclick="SaveCheckpointData('${checkpoint.checkpointId}')">
                            <i class="fa fa-save"></i> Save
                        </button>
                    </td>
                </tr>`;
    });

    // Close the table and containers
    tableHTML += `
            </tbody>
        </table>
    </div>
</div>

<!-- Modal for Observation/Issue -->
<div class="modal fade" id="observationModal" tabindex="-1" aria-labelledby="observationModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="observationModalLabel">Enter Details</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="modal-checkpoint-id">
        <input type="hidden" id="modal-field-type">
        <div class="mb-3">
          <label for="modal-text" class="form-label">Details</label>
          <textarea class="form-control" id="modal-text" rows="5"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="saveModalData()">Save</button>
      </div>
    </div>
  </div>
</div>`;

    return tableHTML;
}

// Function to open the observation/issue modal
function openObservationModal(checkpointId, fieldType) {
    document.getElementById('modal-checkpoint-id').value = checkpointId;
    document.getElementById('modal-field-type').value = fieldType;

    const inputId = fieldType === 'observation' ? 'obs_' + checkpointId : 'issue_' + checkpointId;
    const currentValue = document.getElementById(inputId).value;

    document.getElementById('modal-text').value = currentValue;
    document.getElementById('observationModalLabel').textContent =
        fieldType === 'observation' ? 'Enter Observation' : 'Enter Issue';

    const modal = new bootstrap.Modal(document.getElementById('observationModal'));
    modal.show();
}

function saveModalData() {
    const checkpointId = document.getElementById('modal-checkpoint-id').value;
    const fieldType = document.getElementById('modal-field-type').value;
    const text = document.getElementById('modal-text').value;

    const inputId = fieldType === 'observation' ? 'obs_' + checkpointId : 'issue_' + checkpointId;
    document.getElementById(inputId).value = text;

    const modal = bootstrap.Modal.getInstance(document.getElementById('observationModal'));
    modal.hide();
}

function createErrorModal() {
    // Check if the error modal already exists
    if (document.getElementById('errorModal')) {
        return;
    }

    // Create the error modal HTML
    const modalHTML = `
<div class="modal fade" id="errorModal" tabindex="-1" aria-labelledby="errorModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-danger text-white">
        <h5 class="modal-title" id="errorModalLabel">Error</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body" id="errorModalBody">
        <!-- Error message will be inserted here -->
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>`;

    // Create a container div for the modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;

    // Append the modal to the body
    document.body.appendChild(modalContainer);
}
function showErrorModal(message) {
    // Make sure the error modal exists
    createErrorModal();

    // Set the error message
    document.getElementById('errorModalBody').innerHTML = message;

    // Show the modal
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    errorModal.show();
}

function AddNewCheckPoint() {

    var cpname = $('#newCheckpointInput').val().trim();
    if (cpname === '') {
        PageToast('error', "Please enter a checkpoint name")
    }
    else {
        var form = new FormData();
        form.append("areaId", subareas.areaid);
        form.append("propId", subareas.propId);
        form.append("subareaId", currentsubareaid);
        form.append("checkpointName", cpname);
        var ep = applicationdomain + 'api/upkeep/addnewsubareachecks';
        var jwt = GetStoredJwt();
        $.ajax({
            url: ep,
            type: 'POST',
            dataType: 'json',
            data: form,
            processData: false,
            contentType: false,
            headers: {
                "Authorization": "Bearer " + jwt
            },
            success: function (Response) {
                if (Response.success === false) {
                    PageToast('error', 'Checkpoint could not be added')
                    return;
                }
                // Redraw in place instead of reloading the page: the villa, subarea and any
                // unsaved rows stay as they are, and the new checkpoint appears at the end.
                var drafts = captureDrafts();
                RefreshPropertyData(function () {
                    renderCurrentChecklist(drafts);
                    PageToast('success', 'Checkpoint added')
                });
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                if (XMLHttpRequest.status === 401) {
                    LogoutUser()
                }
                else if (XMLHttpRequest.status === 400) {
                    var errorResponse = XMLHttpRequest.responseJSON;
                    ErrorMessage()
                } else {
                    console.log("An error occurred:", errorThrown);
                }
            }
        });
    }




}

function validateCheckpointData(checkpointId) {
    const validationErrors = [];

    // Check if all required fields are present

    // 1. Status
    const statusElem = document.getElementById(`status_${checkpointId}`);
    if (!statusElem || !statusElem.value) {
        validationErrors.push("Status is required");
    }

    // 2. Responsibility is optional

    // 3. Observation
    const obsElem = document.getElementById(`obs_${checkpointId}`);
    if (!obsElem || obsElem.value.trim() === '') {
        // validationErrors.push("Observation is required");
    }

    // 4. Issue
    const issueElem = document.getElementById(`issue_${checkpointId}`);
    if (!issueElem || issueElem.value.trim() === '') {
        // validationErrors.push("Issue is required");
    }

    // 5. Photo - Enhanced validation for existing images
    const fileInput = document.getElementById(`photo_inline_${checkpointId}`);
    const hasNewFile = fileInput?.files?.[0];
    const hasBase64Data = window[`photo_data_${checkpointId}`];

    // Check if there's an existing image displayed
    const previewImg = document.getElementById(`preview_img_${checkpointId}`);
    const hasExistingImage = previewImg && previewImg.src && previewImg.src !== '' &&
        previewImg.src !== window.location.href && previewImg.src !== 'about:blank';

    const photoExists = hasNewFile || hasBase64Data || hasExistingImage;

    // Check IDs
    if (!checkpointId) {
        validationErrors.push("Checkpoint ID is missing");
    }

    if (!currentsubareaid) {
        validationErrors.push("Subarea ID is missing");
    }

    if (!currentareaid) {
        validationErrors.push("Area ID is missing");
    }

    if (!propID) {
        validationErrors.push("Property ID is missing");
    }

    if (!auditID) {
        validationErrors.push("Audit ID is missing");
    }

    return validationErrors;
}


function AddToTaskMaster(checkpointId) {

    if ($('#row_' + checkpointId).hasClass('row-dirty')) {
        showErrorModal('<p class="mb-0">This checkpoint has unsaved changes. Save it first so TaskMaster gets the latest details.</p>');
        return;
    }
    const saved = (AuditData || []).find(d => d.checkpointId === checkpointId &&
        (villaid !== undefined && villaid.length > 1 ? d.villaId === villaid : true));
    if (!saved || !saved.checkpointResponsibility) {
        showErrorModal('<p class="mb-0">Choose a Responsibility and save the checkpoint before adding it to TaskMaster, so the job is assigned to a team.</p>');
        return;
    }

    showConfirmationModal(
        'Confirm Save',
        'Are you sure you want to add this to task master?',
        function () {
            // User clicked Yes - proceed with save
            ExecuteAddToTaskMaster(checkpointId);
        },
        function () {
            // User clicked No - do nothing
            console.log('Save cancelled by user');
        }
    );
}

function ExecuteAddToTaskMaster(checkpointId) {
    const formData = new FormData();

    // Add checkpoint ID and other IDs
    formData.append("checkpointId", checkpointId);
    formData.append("subareaId", currentsubareaid);
    formData.append("areaId", currentareaid);
    formData.append("propertyId", propID);
    formData.append("auditId", auditID);
    // Add villaId only if it's defined and has length > 1
    if (villaid !== undefined && villaid.length > 1) {
        formData.append("villaId", villaid);
    }
    ShowSpinner()
    // Example AJAX call using FormData
    var ep = applicationdomain + 'api/upkeep/upkeeptojobtracker';
    var jwt = GetStoredJwt();
    $.ajax({
        url: ep,
        type: 'POST',
        dataType: 'json',
        data: formData,
        processData: false,
        contentType: false,
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            HideSpinner()
            if (Response.success) {
                AuditData = Response.trackers;
                showSuccessToast('Checkpoint added to task master!');
                renderCurrentChecklist(captureDrafts());
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            $('#submit-new-job-btn').attr("disabled", false);
            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                var errorResponse = XMLHttpRequest.responseJSON;
                ErrorMessage()
            } else {
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}


function SaveCheckpointData(checkpointId) {
    // Show confirmation dialog first
    showConfirmationModal(
        'Confirm Save',
        'Are you sure you want to save this checkpoint data?',
        function () {
            // User clicked Yes - proceed with save
            executeCheckpointSave(checkpointId);
        },
        function () {
            // User clicked No - do nothing
            console.log('Save cancelled by user');
        }
    );
}



function executeCheckpointSave(checkpointId) {


    // Validate all required fields
    const validationErrors = validateCheckpointData(checkpointId);

    // If there are validation errors, show them in a modal and return null
    if (validationErrors.length > 0) {
        const errorMessage = '<ul class="mb-0 ps-3">' +
            validationErrors.map(error => '<li>' + error + '</li>').join('') +
            '</ul>';

        showErrorModal('<p class="mb-2">Please fix the following errors:</p>' + errorMessage);
        return null;
    }

    const formData = buildCheckpointFormData(checkpointId);

    console.log("FormData created for checkpoint:", checkpointId);
    ShowSpinner()
    // Example AJAX call using FormData
    var ep = applicationdomain + 'api/upkeep/addnewcheckpoint';
    var jwt = GetStoredJwt();
    $.ajax({
        url: ep,
        type: 'POST',
        dataType: 'json',
        data: formData,
        processData: false,
        contentType: false,
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            HideSpinner()
            if (Response.success) {
                AuditData = Response.trackers;
                showSuccessToast('Checkpoint data saved successfully!');
                // Keep the other rows the user hasn't saved yet
                var drafts = captureDrafts([checkpointId]);
                delete window['photo_data_' + checkpointId];
                delete window['photo_removed_' + checkpointId];
                renderCurrentChecklist(drafts);
            } else {
                showErrorModal('<p class="mb-0">The checkpoint could not be saved. Please try again.</p>');
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            HideSpinner()
            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                var errorResponse = XMLHttpRequest.responseJSON;
                ErrorMessage()
            } else {
                console.log("An error occurred:", errorThrown);
            }
        }
    });

    return formData;
}

function buildCheckpointFormData(checkpointId) {
    // Create a new FormData object
    const formData = new FormData();

    // Add checkpoint ID and other IDs
    formData.append("checkpointId", checkpointId);
    formData.append("subareaId", currentsubareaid);
    formData.append("areaId", currentareaid);
    formData.append("propertyId", propID);
    formData.append("auditId", auditID);
    // Add villaId only if it's defined and has length > 1
    if (villaid !== undefined && villaid.length > 1) {
        formData.append("villaId", villaid);
    }

    // Get and add status dropdown value
    const statusElem = document.getElementById(`status_${checkpointId}`);
    if (statusElem) {
        formData.append("statusValue", statusElem.value);
    }

    // Get and add responsibility dropdown value
    const respElem = document.getElementById(`resp_${checkpointId}`);
    if (respElem) {
        formData.append("responsibilityValue", respElem.value);
    }

    // Get and add observation text
    const obsElem = document.getElementById(`obs_${checkpointId}`);
    if (obsElem) {
        formData.append("observation", obsElem.value);
    }

    // Get and add issue text
    const issueElem = document.getElementById(`issue_${checkpointId}`);
    if (issueElem) {
        formData.append("issue", issueElem.value);
    }

    // Get and add photo data (if available)
    // First check if we have a file input with an actual file
    const fileInput = document.getElementById(`photo_inline_${checkpointId}`);
    if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append("photo", fileInput.files[0]);
    }
    // If no file in input but we have stored base64 data, convert it to a file
    else if (window[`photo_data_${checkpointId}`]) {
        // Convert base64 to blob
        const base64Data = window[`photo_data_${checkpointId}`];
        const byteString = atob(base64Data.split(',')[1]);
        const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([ab], { type: mimeString });
        const fileName = `checkpoint_${checkpointId}_photo.${mimeString.split('/')[1]}`;
        const file = new File([blob], fileName, { type: mimeString });

        formData.append("photo", file);
    }
    else if (window[`photo_removed_${checkpointId}`]) {
        formData.append("removePhoto", "true");
    }

    // Add timestamp
    formData.append("savedOn", new Date().toISOString());

    return formData;
}

//#region Save All
function SaveAllCheckpoints() {
    const ids = $('.audit-table tr.row-dirty').map(function () { return this.id.substring(4); }).get();
    if (ids.length === 0) {
        return;
    }

    // Status is the only required field; list every row that is missing it
    const missing = ids.filter(id => !$('#status_' + id).val());
    if (missing.length > 0) {
        const names = missing.map(id => '<li>' + $('#row_' + id + ' .checkpoint-name').text() + '</li>').join('');
        showErrorModal('<p class="mb-2">Select a Status for these checkpoints before saving:</p><ul class="mb-0 ps-3">' + names + '</ul>');
        return;
    }

    showConfirmationModal(
        'Confirm Save All',
        `Save ${ids.length} edited checkpoint(s)?`,
        function () {
            executeSaveAll(ids);
        }
    );
}

function postCheckpoint(formData) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: applicationdomain + 'api/upkeep/addnewcheckpoint',
            type: 'POST',
            dataType: 'json',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                "Authorization": "Bearer " + GetStoredJwt()
            },
            success: resolve,
            error: reject
        });
    });
}

function fetchAuditReport() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${applicationdomain}api/upkeep/getauditreport?prop=${propID}&audit=${auditID}`,
            type: 'GET',
            dataType: 'json',
            headers: {
                "Authorization": "Bearer " + GetStoredJwt()
            },
            success: resolve,
            error: reject
        });
    });
}

async function executeSaveAll(ids) {
    ShowSpinner()
    $('#saveAllBtn').prop('disabled', true);
    const failed = [];

    // One request per row, in order; the full report is fetched once at the end
    for (const id of ids) {
        const formData = buildCheckpointFormData(id);
        formData.append("returnTrackers", "false");
        try {
            const resp = await postCheckpoint(formData);
            if (resp.success) {
                delete window['photo_data_' + id];
                delete window['photo_removed_' + id];
            } else {
                failed.push(id);
            }
        } catch (xhr) {
            if (xhr.status === 401) {
                HideSpinner()
                LogoutUser()
                return;
            }
            failed.push(id);
        }
    }

    // Failed rows stay as unsaved drafts so nothing is lost
    const drafts = captureDrafts(ids.filter(id => failed.indexOf(id) === -1));
    try {
        AuditData = await fetchAuditReport();
    } catch (xhr) {
        console.log("Could not reload audit report:", xhr);
    }
    HideSpinner()
    renderCurrentChecklist(drafts);

    const saved = ids.length - failed.length;
    if (failed.length === 0) {
        showSuccessToast(`${saved} checkpoint(s) saved successfully!`);
    } else {
        const names = failed.map(id => '<li>' + $('#row_' + id + ' .checkpoint-name').text() + '</li>').join('');
        showErrorModal(`<p class="mb-2">${saved} saved. These could not be saved and are still marked as unsaved:</p><ul class="mb-0 ps-3">${names}</ul>`);
    }
}
//#endregion

function createConfirmationModal() {
    // Check if the confirmation modal already exists
    if (document.getElementById('confirmationModal')) {
        return;
    }

    // Create the confirmation modal HTML
    const modalHTML = `
<div class="modal fade" id="confirmationModal" tabindex="-1" aria-labelledby="confirmationModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-warning text-dark">
        <h5 class="modal-title" id="confirmationModalLabel">Confirmation</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body" id="confirmationModalBody">
        <!-- Confirmation message will be inserted here -->
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="confirmationNoBtn">No</button>
        <button type="button" class="btn btn-primary" id="confirmationYesBtn">Yes</button>
      </div>
    </div>
  </div>
</div>`;

    // Create a container div for the modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;

    // Append the modal to the body
    document.body.appendChild(modalContainer);
}


function showConfirmationModal(title, message, onYes, onNo = null) {
    // Make sure the confirmation modal exists
    createConfirmationModal();

    // Set the title and message
    document.getElementById('confirmationModalLabel').textContent = title;
    document.getElementById('confirmationModalBody').innerHTML = message;

    // Get modal instance
    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));

    // Set up event handlers
    const yesBtn = document.getElementById('confirmationYesBtn');
    const noBtn = document.getElementById('confirmationNoBtn');

    // Remove any existing event listeners
    yesBtn.replaceWith(yesBtn.cloneNode(true));
    noBtn.replaceWith(noBtn.cloneNode(true));

    // Get the new button references
    const newYesBtn = document.getElementById('confirmationYesBtn');
    const newNoBtn = document.getElementById('confirmationNoBtn');

    // Add event listeners
    newYesBtn.addEventListener('click', function () {
        confirmationModal.hide();
        if (onYes && typeof onYes === 'function') {
            onYes();
        }
    });

    newNoBtn.addEventListener('click', function () {
        confirmationModal.hide();
        if (onNo && typeof onNo === 'function') {
            onNo();
        }
    });

    // Handle modal close (X button or backdrop click) as "No"
    document.getElementById('confirmationModal').addEventListener('hidden.bs.modal', function () {
        if (onNo && typeof onNo === 'function') {
            onNo();
        }
    }, { once: true });

    // Show the modal
    confirmationModal.show();
}

/**
 * Function to create a success modal if it doesn't exist
 */
function createSuccessModal() {
    // Check if the success modal already exists
    if (document.getElementById('successModal')) {
        return;
    }

    // Create the success modal HTML
    const modalHTML = `
<div class="modal fade" id="successModal" tabindex="-1" aria-labelledby="successModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header bg-success text-white">
        <h5 class="modal-title" id="successModalLabel">Success</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body" id="successModalBody">
        <!-- Success message will be inserted here -->
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-success" data-bs-dismiss="modal">OK</button>
      </div>
    </div>
  </div>
</div>`;

    // Create a container div for the modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;

    // Append the modal to the body
    document.body.appendChild(modalContainer);
}

/**
 * Function to show a success message in a modal
 * @param {string} message - The success message to display
 */
function showSuccessModal(message) {
    // Make sure the success modal exists
    createSuccessModal();

    // Set the success message
    document.getElementById('successModalBody').innerHTML = message;

    // Show the modal
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    successModal.show();
}

/**
 * Function to create toast container if it doesn't exist
 */
function createToastContainer() {
    // Check if toast container already exists
    if (document.getElementById('toastContainer')) {
        return;
    }

    // Create toast container positioned at top-right with maximum z-index
    const toastContainerHTML = `
<div class="toast-container position-fixed top-0 end-0 p-3" id="toastContainer" style="z-index: 99999;">
  <!-- Toasts will be dynamically added here -->
</div>`;

    // Append to body
    document.body.insertAdjacentHTML('beforeend', toastContainerHTML);
}

/**
 * Function to show a success toast notification
 * @param {string} message - The success message to display
 */
function showSuccessToast(message) {
    createToastContainer();

    // Create unique ID for this toast
    const toastId = 'toast_' + Date.now();

    // Create toast HTML with maximum z-index
    const toastHTML = `
<div id="${toastId}" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true" style="z-index: 100000;">
  <div class="d-flex">
    <div class="toast-body">
      <i class="fa fa-check-circle me-2"></i>${message}
    </div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
  </div>
</div>`;

    // Add toast to container
    document.getElementById('toastContainer').insertAdjacentHTML('beforeend', toastHTML);

    // Show the toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        delay: 4000 // Auto-hide after 4 seconds
    });
    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
}



function getItemsBySubarea(data, subareaId) {
    // Input validation
    if (!data || !Array.isArray(data)) {
        console.error("Invalid data parameter - expected an array");
        return [];
    }

    if (!subareaId) {
        console.error("Invalid subareaId parameter - cannot be empty or null");
        return [];
    }

    // Filter the data to get items where subareaId matches
    const filteredItems = data.filter(item => {
        // Check if item exists and has subareaId property
        if (!item || typeof item !== 'object') {
            return false;
        }

        // Match the subareaId
        return item.subareaId === subareaId;
    });

    console.log(`Found ${filteredItems.length} items for subareaId: ${subareaId}`);

    return filteredItems;
}
function getItemsByArea(data, areaId) {
    // Input validation
    if (!data || !Array.isArray(data)) {
        console.error("Invalid data parameter - expected an array");
        return [];
    }

    if (!areaId) {
        console.error("Invalid subareaId parameter - cannot be empty or null");
        return [];
    }

    // Filter the data to get items where subareaId matches
    const filteredItems = data.filter(item => {
        // Check if item exists and has subareaId property
        if (!item || typeof item !== 'object') {
            return false;
        }

        // Match the subareaId
        return item.areaId === areaId;
    });

    console.log(`Found ${filteredItems.length} items for subareaId: ${areaId}`);

    return filteredItems;
}

function getItemsByAreaVilla(data, areaId, villa) {
    // Input validation
    if (!data || !Array.isArray(data)) {
        console.error("Invalid data parameter - expected an array");
        return [];
    }

    if (!areaId) {
        console.error("Invalid subareaId parameter - cannot be empty or null");
        return [];
    }

    // Filter the data to get items where subareaId matches
    const filteredItems = data.filter(item => {
        // Check if item exists and has subareaId property
        if (!item || typeof item !== 'object') {
            return false;
        }

        // Match the subareaId
        return item.areaId === areaId && item.villaId === villa;
    });

    console.log(`Found ${filteredItems.length} items for subareaId: ${areaId}`);

    return filteredItems;
}


function getStatusCounts(checkpointData) {
    // Initialize counts
    const statusCounts = {
        excellent: 0,
        good: 0,
        satisfactory: 0,
        unsatisfactory: 0,
        poor: 0,
        safetyIssue: 0
    };

    // Input validation
    if (!checkpointData || !Array.isArray(checkpointData)) {
        console.warn("Invalid checkpoint data provided to getStatusCounts");
        return statusCounts;
    }

    // Count each status
    checkpointData.forEach(checkpoint => {
        if (checkpoint && checkpoint.checkpointStatus) {
            const status = checkpoint.checkpointStatus.toString();

            switch (status) {
                case "1":
                    statusCounts.excellent++;
                    break;
                case "2":
                    statusCounts.good++;
                    break;
                case "3":
                    statusCounts.satisfactory++;
                    break;
                case "4":
                    statusCounts.unsatisfactory++;
                    break;
                case "5":
                    statusCounts.poor++;
                    break;
                case "6":
                    statusCounts.safetyIssue++;
                    break;
                default:
                    console.warn(`Unknown status value: ${status}`);
            }
        }
    });

    return statusCounts;
}



function getLatestItem(checkpointData) {
    // Input validation
    if (!checkpointData || !Array.isArray(checkpointData) || checkpointData.length === 0) {
        console.warn("Invalid or empty checkpoint data provided to getLatestItem");
        return null;
    }

    // Filter out items without createdOn property and sort by createdOn date
    const validItems = checkpointData.filter(item => item && item.createdOn);

    if (validItems.length === 0) {
        console.warn("No items with createdOn property found");
        return null;
    }

    // Find the item with the latest createdOn date
    const latestItem = validItems.reduce((latest, current) => {
        const latestDate = new Date(latest.createdOn);
        const currentDate = new Date(current.createdOn);

        return currentDate > latestDate ? current : latest;
    });

    return latestItem;
}

/**
 * Alternative version that also returns the formatted date
 * @param {Array} checkpointData - Array of checkpoint objects with createdOn property
 * @returns {Object|null} - Object containing the latest item and formatted date, or null
 */
function getLatestItemWithDate(checkpointData) {
    const latestItem = getLatestItem(checkpointData);

    if (!latestItem) {
        return null;
    }

    // Inspection date and time in Maldives Time
    const createdDate = parseApiDate(latestItem.createdOn);
    const formattedDate = formatMaldives(createdDate, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    return {
        item: latestItem,
        formattedDate: formattedDate,
        rawDate: createdDate
    };
}
