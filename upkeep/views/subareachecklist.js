

var currentsubareaid = null;
var currentsubarea = null;
var subareas = null;
var villaid =null;
function initializePage(containerId) {
    $(document).ready(function () {
            
        var userdata = $(containerId).data('controlData');
        currentsubareaid = userdata.controlData;
        var renderType = userdata.renderType;
        var UserObject = GetStoredUserData();
        UserRoles = UserObject.role;
        subareas =  findAreaById(currentareaid,PropertyData.propArea);
        currentsubarea = findCheckpoints(currentareaid,currentsubareaid,PropertyData.propArea)
        villaid = $('#villa-select').val();
        
        
        
        if (villaid !== undefined && villaid.length > 1) {
            var tables = createVillaWiseCheckpointTable(villaid,currentsubarea.checkpoints,currentsubarea.subareaName,PropertyData.propEmp,AuditData)
            
            $('#subarea-checklist-holder').html(tables);
            var ck2 = getItemsByAreaVilla(AuditData,subareas.areaid,villaid)
            var sla2 = countCheckpointStatus(ck2)
           
            // $('#sc_excel').text(sla2.excellent)
            // $('#sc_good').text(sla2.good)
            // $('#sc_poor').text(sla2.poor)
            // $('#sc_safty').text(sla2.safetyIssue)
            // $('#sc_satis').text(sla2.satisfactory)
            // $('#sc_unsatis').text(sla2.unsatisfactory)

            var lat1 = getLatestItemWithDate(ck2);
            $('#sc_inspectby').text(lat1.item.createdBy)
            $('#sc_inspectdate').text(lat1.formattedDate)


         
        }
        else{
            var tables = createCheckpointTable(currentsubarea.checkpoints,currentsubarea.subareaName,PropertyData.propEmp,AuditData)
            $('#subarea-checklist-holder').html(tables);
            var ck1 = getItemsByArea(AuditData,subareas.areaid)
            var sla1 = countCheckpointStatus(ck1)

            // $('#sc_excel').text(sla1.excellent)
            // $('#sc_good').text(sla1.good)
            // $('#sc_poor').text(sla1.poor)
            // $('#sc_safty').text(sla1.safetyIssue)
            // $('#sc_satis').text(sla1.satisfactory)
            // $('#sc_unsatis').text(sla1.unsatisfactory)

            var lat1 = getLatestItemWithDate(ck1);
            $('#sc_inspectby').text(lat1.item.createdBy)
            $('#sc_inspectdate').text(lat1.formattedDate)

        
        }
    });
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

function createCheckpointTable(checkpoints, subareaName = "Checkpoints", teams = [], existingData = []) {
    

    var dtd = findMatchingCheckpoints(checkpoints,existingData);
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
        var rxtx = `<div class="tab-content" id="pills-tabContent">
                            <div class="tab-pane fade show active" id="checkpoint-content" role="tabpanel">
                                       <div class="d-flex justify-content-between align-items-center">
                                        <h3 class="heading-title text-left mt-4">${subareaName}</h3>
                                        <div class="d-flex gap-1">
                                            <input type="text" style="width:350px" class="form-control form-control-sm mb-0" placeholder="Enter new checkpoint name" id="newCheckpointInput">
                                            <button style="padding: 8px !important;" class="btn btn-primary btn-sm" onclick="AddNewCheckPoint()">Add</button>
                                        </div>
                                       </div>
                            </div>
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

    // Helper function to create status dropdown with pre-selected value
    function createStatusDropdown(checkpointId, selectedValue = '') {
        const statusOptions = [
            { value: "01", text: "Excellent" },
            { value: "02", text: "Good" },
            { value: "03", text: "Satisfactory" },
            { value: "04", text: "Unsatisfactory" },
            { value: "05", text: "Poor" },
            { value: "06", text: "Safety Issue" }
        ];

        let optionsHTML = '';
        statusOptions.forEach(option => {
            const selected = selectedValue.toString() === option.value ? 'selected' : '';
            optionsHTML += `<option value="${option.value}" ${selected}>${option.text}</option>`;
        });

        return `<select name="status_${checkpointId}" id="status_${checkpointId}" class="form-select">${optionsHTML}</select>`;
    }

    // Helper function to create responsibility dropdown with pre-selected value
    function createResponsibilityDropdown(checkpointId, selectedValue = '') {
        let optionsHTML = '';

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

        return `<select name="resp_${checkpointId}" id="resp_${checkpointId}" class="form-select">${optionsHTML}</select>`;
    }

    // Helper function to create image preview with existing image if available
    function createImagePreview(checkpointId, imageUrl = null) {
        if (!imageUrl) {
            // No existing image - show upload icon
            return `
                <div id="upload_icon_${checkpointId}" class="text-center">
                    <i class="fa fa-upload upload-file"
                       onclick="document.getElementById('photo_upload_${checkpointId}').click()"
                       style="cursor: pointer;"></i>
                </div>
                
                <div id="image_preview_${checkpointId}" class="text-center" style="display:none;">
                    <div class="image-wrapper overflow-hidden rounded mb-2">
                        <img id="preview_img_${checkpointId}" src="" alt="Preview" 
                             class="img-fluid" style="max-height: 100px; max-width: 100%;">
                    </div>
                    <button type="button" class="btn btn-danger btn-xs w-100"  style="padding: 1px !important;"
                            onclick="removePhoto('${checkpointId}')">
                        <i class="fa fa-trash me-1"></i>Remove
                    </button>
                </div>
            `;
        } else {
            // Existing image - show preview
            return `
                <div id="upload_icon_${checkpointId}" class="text-center" style="display:none;">
                    <i class="fa fa-upload upload-file"
                       onclick="document.getElementById('photo_upload_${checkpointId}').click()"
                       style="cursor: pointer;"></i>
                </div>
                
                <div id="image_preview_${checkpointId}" class="text-center" style="display:block;">
                    <div class="image-wrapper overflow-hidden rounded mb-2">
                        <img id="preview_img_${checkpointId}" src="${imageUrl}" alt="Preview" 
                             class="img-fluid" style="max-height: 100px; max-width: 100%;">
                    </div>
                    <button type="button" class="btn btn-danger btn-xs w-100" style="padding: 1px !important;"
                            onclick="removePhoto('${checkpointId}')">
                        <i class="fa fa-trash me-1"></i>Remove
                    </button>
                </div>
            `;
        }
    }

    // Start building the HTML table
    let tableHTML = `
<div class="tab-content" id="pills-tabContent">
    <div class="tab-pane fade show active" id="checkpoint-content" role="tabpanel">
        
               <div class="d-flex justify-content-between align-items-center">
                <h3 class="heading-title text-left mt-4">${subareaName}</h3>
                <div class="d-flex gap-1">
                    <input type="text" style="width:350px" class="form-control form-control-sm mb-0" placeholder="Enter new checkpoint name" id="newCheckpointInput">
                    <button style="padding: 8px !important;" class="btn btn-primary btn-sm" onclick="AddNewCheckPoint()">Add</button>
                </div>
               </div>
        
        <!-- Table Start -->
        <div class="arrival-bg">
            <div class="table-responsive">
                <div id="no-table">
                    <table class="table table-bordered arrival-table cf">
                        <thead class="cf">
                        <tr>
                            <th style="width: 5%;">S.No.</th>
                            <th style="width: 25%;">Check Points</th>
                            <th style="width: 10%;">Status</th>
                            <th style="width: 5%;">Responsibility</th>
                            <th style="width: 10%;">Photo</th>
                            <th style="width: 10%;">Observation</th>
                            <th style="width: 10%;">Issue</th>
                            <th style="width: 10%;">Task Master</th>
                            <th style="width: 5%;">Action</th>
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

        tableHTML += `
                        <tr>
                            <td data-title="S.No.">${index + 1}</td>
                            <td data-title="Check Point">${checkpoint.checkpointName}</td>
                            <td data-title="Status">
                                ${createStatusDropdown(checkpoint.checkpointId, statusValue)}
                            </td>
                            <td data-title="Responsibility">
                                ${createResponsibilityDropdown(checkpoint.checkpointId, responsibilityValue)}
                            </td>
                            <td data-title="Photo">
                                <div class="photo-container">
                                    <!-- Hidden file input -->
                                    <input type="file" id="photo_upload_${checkpoint.checkpointId}" name="photo_upload_${checkpoint.checkpointId}" 
                                           accept="image/jpeg, image/png" style="display:none;" onchange="handlePhotoUpload(this, '${checkpoint.checkpointId}')">
                                    
                                    ${createImagePreview(checkpoint.checkpointId, imageUrl)}
                                </div>
                            </td>
                            <td data-title="Observation">
                                <div class="d-flex">
                                    <input type="text" class="form-control me-1" name="obs_${checkpoint.checkpointId}" id="obs_${checkpoint.checkpointId}" 
                                           placeholder="Enter observation" readonly value="${observationValue}">
                                    <button type="button" class="btn btn-sm btn-blue-small" style="padding: 5px !important;"
                                            onclick="openObservationModal('${checkpoint.checkpointId}', 'observation')">
                                        <i class="fa fa-pencil"></i>
                                    </button>
                                </div>
                            </td>
                            <td data-title="Issue">
                                <div class="d-flex">
                                    <input type="text" class="form-control me-1" name="issue_${checkpoint.checkpointId}" id="issue_${checkpoint.checkpointId}" 
                                           placeholder="Enter issue" readonly value="${issueValue}">
                                    <button type="button" class="btn btn-sm btn-blue-small" style="padding: 5px !important;"
                                            onclick="openObservationModal('${checkpoint.checkpointId}', 'issue')">
                                        <i class="fa fa-pencil"></i>
                                    </button>
                                </div>
                            </td>
                            <td data-title="Task Master">
                              ${!existingCheckpointData ?
            '<small class="text-muted">Save to add to task master</small>' :
            existingCheckpointData.isjobtracker === false ?
                `<button class="btn-blue-small" onclick="AddToTaskMaster('${checkpoint.checkpointId}')">Add To Master</button>` :
                `<small class="text-success">Job ID: ${existingCheckpointData.jobtrackerid || 'N/A'}</small>`
        }
                            </td>
                            <td data-title="Action">
                                <button class="btn-green-small" onclick="SaveCheckpointData('${checkpoint.checkpointId}')">Save</button>
                            </td>
                        </tr>`;
    });

    // Close the table and containers
    tableHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
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
        <button type="button" class="btn btn-blue-small" onclick="saveModalData()">Save</button>
      </div>
    </div>
  </div>
</div>

<style>
.btn-xs {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    line-height: 1;
    border-radius: 0.2rem;
}

.btn-xs.btn-sm {
    padding: 0.15rem 0.3rem;
    font-size: 0.675rem;
}

.btn-xs i, .btn-xs .fa {
    font-size: 0.675rem;
}

.image-wrapper {
    display: inline-block;
    overflow: hidden;
}

.image-wrapper img {
    transition: transform 0.3s ease;
}

.image-wrapper:hover img {
    transform: scale(0.95);
}
</style>

<script>
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

function handlePhotoUpload(input, checkpointId) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
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
            document.getElementById('image_preview_' + checkpointId).style.display = 'block';
            window['photo_data_' + checkpointId] = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function removePhoto(checkpointId) {
    document.getElementById('photo_upload_' + checkpointId).value = '';
    document.getElementById('preview_img_' + checkpointId).src = '';
    document.getElementById('upload_icon_' + checkpointId).style.display = 'block';
    document.getElementById('image_preview_' + checkpointId).style.display = 'none';
    
    if (window['photo_data_' + checkpointId]) {
        delete window['photo_data_' + checkpointId];
    }
}
</script>`;

    return tableHTML;
}






function createVillaWiseCheckpointTable(villaid, checkpoints, subareaName = "Checkpoints", teams = [], existingData = []) {

    var dtd = findMatchingCheckpoints(checkpoints,existingData);
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
        var rxtx = `<div class="tab-content" id="pills-tabContent">
                            <div class="tab-pane fade show active" id="checkpoint-content" role="tabpanel">
                                       <div class="d-flex justify-content-between align-items-center">
                                        <h3 class="heading-title text-left mt-4">${subareaName}</h3>
                                        <div class="d-flex gap-1">
                                            <input type="text" style="width:350px" class="form-control form-control-sm mb-0" placeholder="Enter new checkpoint name" id="newCheckpointInput">
                                            <button style="padding: 8px !important;" class="btn btn-primary btn-sm" onclick="AddNewCheckPoint()">Add</button>
                                        </div>
                                       </div>
                            </div>
                           </div>`


        return rxtx;
    }

    // Helper function to find existing data for a checkpoint
    function vfindExistingCheckpointData(checkpointId) {

        // console.log(existingData)
        // console.log(villaid)
        // console.log(checkpointId)
        if (!existingData || !Array.isArray(existingData)) {
            return null;
        }
        var res = existingData.find(data => data.checkpointId === checkpointId && data.villaId === villaid) || null;
        
        return res
    }

    // Helper function to create status dropdown with pre-selected value
    function vcreateStatusDropdown(checkpointId, selectedValue = '') {
        const statusOptions = [
            { value: "01", text: "Excellent" },
            { value: "02", text: "Good" },
            { value: "03", text: "Satisfactory" },
            { value: "04", text: "Unsatisfactory" },
            { value: "05", text: "Poor" },
            { value: "06", text: "Safety Issue" }
        ];

        let optionsHTML = '';
        statusOptions.forEach(option => {
            const selected = selectedValue.toString() === option.value ? 'selected' : '';
            optionsHTML += `<option value="${option.value}" ${selected}>${option.text}</option>`;
        });

        return `<select name="status_${checkpointId}" id="status_${checkpointId}" class="form-select">${optionsHTML}</select>`;
    }

    // Helper function to create responsibility dropdown with pre-selected value
    function vcreateResponsibilityDropdown(checkpointId, selectedValue = '') {
        let optionsHTML = '';

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

        return `<select name="resp_${checkpointId}" id="resp_${checkpointId}" class="form-select">${optionsHTML}</select>`;
    }

    // Helper function to create image preview with existing image if available
    function vcreateImagePreview(checkpointId, imageUrl = null) {
        if (!imageUrl) {
            // No existing image - show upload icon
            return `
                <div id="upload_icon_${checkpointId}" class="text-center">
                    <i class="fa fa-upload upload-file"
                       onclick="document.getElementById('photo_upload_${checkpointId}').click()"
                       style="cursor: pointer;"></i>
                </div>
                
                <div id="image_preview_${checkpointId}" class="text-center" style="display:none;">
                    <div class="image-wrapper overflow-hidden rounded mb-2">
                        <img id="preview_img_${checkpointId}" src="" alt="Preview" 
                             class="img-fluid" style="max-height: 100px; max-width: 100%;">
                    </div>
                    <button type="button" class="btn btn-danger btn-xs w-100" style="padding: 1px !important;"
                            onclick="removePhoto('${checkpointId}')">
                        <i class="fa fa-trash me-1"></i>Remove
                    </button>
                </div>
            `;
        } else {
            // Existing image - show preview
            return `
                <div id="upload_icon_${checkpointId}" class="text-center" style="display:none;">
                    <i class="fa fa-upload upload-file"
                       onclick="document.getElementById('photo_upload_${checkpointId}').click()"
                       style="cursor: pointer;"></i>
                </div>
                
                <div id="image_preview_${checkpointId}" class="text-center" style="display:block;">
                    <div class="image-wrapper overflow-hidden rounded mb-2">
                        <img id="preview_img_${checkpointId}" src="${imageUrl}" alt="Preview" 
                             class="img-fluid" style="max-height: 100px; max-width: 100%;">
                    </div>
                    <button type="button" class="btn btn-danger btn-xs w-100" style="padding: 1px !important;"
                            onclick="removePhoto('${checkpointId}')">
                        <i class="fa fa-trash me-1"></i>Remove
                    </button>
                </div>
            `;
        }
    }

    // Start building the HTML table
    let tableHTML = `
<div class="tab-content" id="pills-tabContent">
    <div class="tab-pane fade show active" id="checkpoint-content" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center">
                <h3 class="heading-title text-left mt-4">${subareaName}</h3>
                <div class="d-flex gap-1">
                    <input type="text" style="width:350px" class="form-control form-control-sm mb-0" placeholder="Enter new checkpoint name" id="newCheckpointInput">
                    <button style="padding: 8px !important;" class="btn btn-primary btn-sm" onclick="AddNewCheckPoint()">Add</button>
                </div>
               </div>
        
        

        
        <!-- Table Start -->
        <div class="arrival-bg">
            <div class="table-responsive">
                <div id="no-table">
                    <table class="table table-bordered arrival-table cf">
                        <thead class="cf">
                        <tr>
                            <th style="width: 5%;">S.No.</th>
                            <th style="width: 25%;">Check Points</th>
                            <th style="width: 10%;">Status</th>
                            <th style="width: 5%;">Responsibility</th>
                            <th style="width: 10%;">Photo</th>
                            <th style="width: 10%;">Observation</th>
                            <th style="width: 10%;">Issue</th>
                            <th style="width: 10%;">Task Master</th>
                            <th style="width: 5%;">Action</th>
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

        tableHTML += `
                        <tr>
                            <td data-title="S.No.">${index + 1}</td>
                            <td data-title="Check Point">${checkpoint.checkpointName}</td>
                            <td data-title="Status">
                                ${vcreateStatusDropdown(checkpoint.checkpointId, statusValue)}
                            </td>
                            <td data-title="Responsibility">
                                ${vcreateResponsibilityDropdown(checkpoint.checkpointId, responsibilityValue)}
                            </td>
                            <td data-title="Photo">
                                <div class="photo-container">
                                    <!-- Hidden file input -->
                                    <input type="file" id="photo_upload_${checkpoint.checkpointId}" name="photo_upload_${checkpoint.checkpointId}" 
                                           accept="image/jpeg, image/png" style="display:none;" onchange="handlePhotoUpload(this, '${checkpoint.checkpointId}')">
                                    
                                    ${vcreateImagePreview(checkpoint.checkpointId, imageUrl)}
                                </div>
                            </td>
                            <td data-title="Observation">
                                <div class="d-flex">
                                    <input type="text" class="form-control me-1" name="obs_${checkpoint.checkpointId}" id="obs_${checkpoint.checkpointId}" 
                                           placeholder="Enter observation" readonly value="${observationValue}">
                                    <button type="button" class="btn btn-sm btn-blue-small" style="padding: 5px !important;"
                                            onclick="openObservationModal('${checkpoint.checkpointId}', 'observation')">
                                        <i class="fa fa-pencil"></i>
                                    </button>
                                </div>
                            </td>
                            <td data-title="Issue">
                                <div class="d-flex">
                                    <input type="text" class="form-control me-1" name="issue_${checkpoint.checkpointId}" id="issue_${checkpoint.checkpointId}" 
                                           placeholder="Enter issue" readonly value="${issueValue}">
                                    <button type="button" class="btn btn-sm btn-blue-small" style="padding: 5px !important;"
                                            onclick="openObservationModal('${checkpoint.checkpointId}', 'issue')">
                                        <i class="fa fa-pencil"></i>
                                    </button>
                                </div>
                            </td>
                           <td data-title="Task Master">
                              ${!existingCheckpointData ?
            '<small class="text-muted">Save to add to task master</small>' :
            existingCheckpointData.isjobtracker === false ?
                `<button class="btn-blue-small" onclick="AddToTaskMaster('${checkpoint.checkpointId}')">Add To Master</button>` :
                `<small class="text-success">Job ID: ${existingCheckpointData.jobtrackerid || 'N/A'}</small>`
        }
                            </td>
                            <td data-title="Action">
                                <button class="btn-green-small" onclick="SaveCheckpointData('${checkpoint.checkpointId}')">Save</button>
                            </td>
                        </tr>`;
    });

    // Close the table and containers
    tableHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
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
        <button type="button" class="btn btn-blue-small" onclick="saveModalData()">Save</button>
      </div>
    </div>
  </div>
</div>

<style>
.btn-xs {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    line-height: 1;
    border-radius: 0.2rem;
}

.btn-xs.btn-sm {
    padding: 0.15rem 0.3rem;
    font-size: 0.675rem;
}

.btn-xs i, .btn-xs .fa {
    font-size: 0.675rem;
}

.image-wrapper {
    display: inline-block;
    overflow: hidden;
}

.image-wrapper img {
    transition: transform 0.3s ease;
}

.image-wrapper:hover img {
    transform: scale(0.95);
}
</style>

<script>
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

function handlePhotoUpload(input, checkpointId) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
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
            document.getElementById('image_preview_' + checkpointId).style.display = 'block';
            window['photo_data_' + checkpointId] = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function removePhoto(checkpointId) {
    document.getElementById('photo_upload_' + checkpointId).value = '';
    document.getElementById('preview_img_' + checkpointId).src = '';
    document.getElementById('upload_icon_' + checkpointId).style.display = 'block';
    document.getElementById('image_preview_' + checkpointId).style.display = 'none';
    
    if (window['photo_data_' + checkpointId]) {
        delete window['photo_data_' + checkpointId];
    }
}
</script>`;

    return tableHTML;
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

function AddNewCheckPoint(){
    
    var cpname = $('#newCheckpointInput').val();
    if (cpname === '') {
        NotifyToast('error', "Plase enter a sub area name")
    }
    else{
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
                location.reload();
                // showSuccessToast('Checkpoint data saved successfully!');
                // if (villaid !== undefined && villaid.length > 1) {
                //     var tables = createVillaWiseCheckpointTable(villaid, currentsubarea.checkpoints, currentsubarea.subareaName, PropertyData.propEmp, AuditData)
                //     $('#subarea-checklist-holder').html(tables);
                // }
                // else{
                //     var tables = createCheckpointTable(currentsubarea.checkpoints,currentsubarea.subareaName,PropertyData.propEmp,AuditData)
                //     $('#subarea-checklist-holder').html(tables);
                // }
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

    // 2. Responsibility
    const respElem = document.getElementById(`resp_${checkpointId}`);
    if (!respElem || !respElem.value) {
        validationErrors.push("Responsibility is required");
    }

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
    const fileInput = document.getElementById(`photo_upload_${checkpointId}`);
    const hasNewFile = fileInput?.files?.[0];
    const hasBase64Data = window[`photo_data_${checkpointId}`];

    // Check if there's an existing image displayed
    const previewImg = document.getElementById(`preview_img_${checkpointId}`);
    const hasExistingImage = previewImg && previewImg.src && previewImg.src !== '' &&
        previewImg.src !== window.location.href && previewImg.src !== 'about:blank';

    const photoExists = hasNewFile || hasBase64Data || hasExistingImage;

    // if (!photoExists) {
    //     validationErrors.push("Photo is required");
    // }

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


function AddToTaskMaster(checkpointId){
   

    showConfirmationModal(
        'Confirm Save',
        'Are you sure you want to add this to task master?',
        function() {
            // User clicked Yes - proceed with save
            ExecuteAddToTaskMaster(checkpointId);
        },
        function() {
            // User clicked No - do nothing
            console.log('Save cancelled by user');
        }
    );
}

function ExecuteAddToTaskMaster(checkpointId){
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
            AuditData = Response.trackers;
            if(Response.success) {
                showSuccessToast('Checkpoint added to task master!');
                if (villaid !== undefined && villaid.length > 1) {
                    var tables = createVillaWiseCheckpointTable(villaid, currentsubarea.checkpoints, currentsubarea.subareaName, PropertyData.propEmp, AuditData)
                    $('#subarea-checklist-holder').html(tables);
                }
                else{
                    var tables = createCheckpointTable(currentsubarea.checkpoints,currentsubarea.subareaName,PropertyData.propEmp,AuditData)
                    $('#subarea-checklist-holder').html(tables);
                }
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
        function() {
            // User clicked Yes - proceed with save
            executeCheckpointSave(checkpointId);
        },
        function() {
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
    const fileInput = document.getElementById(`photo_upload_${checkpointId}`);
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

    // Add timestamp
    formData.append("savedOn", new Date().toISOString());

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
            AuditData = Response.trackers;
            if(Response.success) {
                showSuccessToast('Checkpoint data saved successfully!');
                if (villaid !== undefined && villaid.length > 1) {
                    var tables = createVillaWiseCheckpointTable(villaid, currentsubarea.checkpoints, currentsubarea.subareaName, PropertyData.propEmp, AuditData)
                    $('#subarea-checklist-holder').html(tables);
                }
                else{
                    var tables = createCheckpointTable(currentsubarea.checkpoints,currentsubarea.subareaName,PropertyData.propEmp,AuditData)
                    $('#subarea-checklist-holder').html(tables);
                }
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

    return formData;
}

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
    newYesBtn.addEventListener('click', function() {
        confirmationModal.hide();
        if (onYes && typeof onYes === 'function') {
            onYes();
        }
    });

    newNoBtn.addEventListener('click', function() {
        confirmationModal.hide();
        if (onNo && typeof onNo === 'function') {
            onNo();
        }
    });

    // Handle modal close (X button or backdrop click) as "No"
    document.getElementById('confirmationModal').addEventListener('hidden.bs.modal', function() {
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
    toastElement.addEventListener('hidden.bs.toast', function() {
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

            switch(status) {
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

    // Format the date for display (date only, no time)
    const createdDate = new Date(latestItem.createdOn);
    const formattedDate = createdDate.toLocaleDateString(); // Only date part, no time

    return {
        item: latestItem,
        formattedDate: formattedDate,
        rawDate: createdDate
    };
}