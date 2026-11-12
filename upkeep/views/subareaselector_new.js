var currentareaid = null;
var subareas = null;
var userselectedarea = null;
function initializePage(containerId) {
    $(document).ready(function () {
        var userdata = $(containerId).data('controlData');
        currentareaid = userdata.controlData;
        var renderType = userdata.renderType;
        var UserObject = GetStoredUserData();
        UserRoles = UserObject.role;
        subareas = findAreaById(currentareaid, PropertyData.propArea);
        $('#area-name').text(subareas.areaName);
        $('#area-name2').text(subareas.areaName);
        var subareaslist = createSubAreaTabs(subareas)
        $('#subarealist-div').html(subareaslist)
    });
}

function AddNewSubarea() {
    var subareaname = $('#newSubareaInput').val().trim();
    if (subareaname === '') {
        PageToast('error', 'Please enter a sub area name');
        return;
    }
    // Adding a subarea redraws this area, so unsaved rows must be saved (or discarded) first
    if (!confirmDiscardUnsaved()) {
        return;
    }
    var existingIds = (subareas.subAreas || []).map(sa => sa.subareaId);

    var form = new FormData();
    form.append("areaId", subareas.areaid);
    form.append("propId", subareas.propId);
    form.append("subareaName", subareaname);

    var ep = applicationdomain + 'api/upkeep/addnewsubarea';
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

            if (Response.success === true) {
                // Redraw in place (no page reload) so the selected villa is kept, and open the new subarea
                RefreshPropertyData(function () {
                    var area = findAreaById(currentareaid, PropertyData.propArea);
                    var added = area && area.subAreas ? area.subAreas.find(sa => existingIds.indexOf(sa.subareaId) === -1) : null;
                    PreferredSubareaId = added ? added.subareaId : null;
                    LoadCustomControlWithRender('subareaselector-div', 'views/subareaselector_new.html', currentareaid, '');
                    PageToast('success', 'Sub area added');
                });
            }
            else {
                var userdata = `<p>Failed to modifify sub area</p>`
                SuccessMessageCustom('Sub Area Modification', userdata, 'error')
            }

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



// tab according chnege subareaname

function selectSubAreaTab(btn) {
    $('#tab2-tab .nav-link').removeClass('active').attr('aria-selected', 'false');
    $(btn).addClass('active').attr('aria-selected', 'true');
}

function getSubAreaDetail(subAreaId, btn) {
    if (btn) {
        if (subAreaId === userselectedarea) {
            return;
        }
        if (!confirmDiscardUnsaved()) {
            return;
        }
        selectSubAreaTab(btn);
    }
    userselectedarea = subAreaId;
    rememberSubarea(currentareaid, subAreaId);
    updateSubareaHeader(subAreaId);
    // Changed to load subareachecklist_new.html
    LoadCustomControlWithRender('subareachecklist-div', 'views/subareachecklist_new.html', subAreaId, '')
}

function updateSubareaHeader(subAreaId) {
    if (!subareas || !Array.isArray(subareas.subAreas)) {
        return;
    }

    const selectedSubarea = subareas.subAreas.find(subarea => subarea.subareaId === subAreaId);
    if (!selectedSubarea) {
        return;
    }

    $('#area-name').text(selectedSubarea.subareaName);
    $('#area-name2').text(subareas.areaName);
}


// end of tab according chnege subareaname

function createSubAreaTabs(areaData) {
    // Input validation
    if (!areaData || !areaData.subAreas || !Array.isArray(areaData.subAreas) || areaData.subAreas.length === 0) {
        console.error("Invalid area data or missing subAreas");
        return "";
    }

    let html = '';

    // Add villa dropdown if isvilla is true and villasList exists
    if (areaData.isvilla === true && areaData.villasList && Array.isArray(areaData.villasList) && areaData.villasList.length > 0) {
        html += `
            <div class="mb-3">
                <label for="villa-select" class="form-label">Select Villa:</label>
                <select class="form-select" id="villa-select" onchange="onVillaChange(this.value)">

        `;

        // A fresh audit has no villa preselected; the auditor picks one before the checklist appears
        html += villaOptionsHtml(areaData, getDefaultVillaId(areaData));

        html += `
                </select>
            </div>
        `;
    }

    // Start the tabs container
    html += '<ul class="nav nav-tab2 mb-3" id="tab2-tab" role="tablist">';
    const activeSubAreas = areaData.subAreas.filter(sa => sa.isactive !== false);
    if (activeSubAreas.length === 0) {
        return html + '</ul>';
    }
    var firstsubarea = activeSubAreas.some(sa => sa.subareaId === PreferredSubareaId) ? PreferredSubareaId : activeSubAreas[0].subareaId;
    PreferredSubareaId = null;

    // Loop through each subArea to create a tab
    areaData.subAreas.forEach((subArea, index) => {
        // Skip if subarea is not active
        if (subArea.isactive === false) {
            return;
        }

        // Create safe ID by removing spaces and special characters
        const subAreaId = subArea.subareaName.toLowerCase().replace(/[^a-z0-9]/g, '-');

        const isActive = subArea.subareaId === firstsubarea;

        html += `
            <li class="nav-item" role="presentation">
                <button class="nav-link ${isActive ? 'active' : ''}"
                        id="${subAreaId}-tab"
                        type="button"
                        role="tab"
                        aria-selected="${isActive ? 'true' : 'false'}"
                        data-subarea-id="${subArea.subareaId}"
                        onclick="getSubAreaDetail('${subArea.subareaId}', this)">
                    ${subArea.subareaName}
                </button>
            </li>
        `;
    });



    // Close the tabs container
    html += '</ul>';

    // Call getSubAreaDetail for the first subarea
    userselectedarea = firstsubarea;
    getSubAreaDetail(firstsubarea);

    return html;
}

// Saved checkpoints per villa in this area, from the audit data
function savedCountByVilla(areaId) {
    const counts = {};
    (AuditData || []).forEach(d => {
        if (d.areaId === areaId && d.villaId) {
            counts[d.villaId] = (counts[d.villaId] || 0) + 1;
        }
    });
    return counts;
}

// Villa list with the villas already audited in this audit grouped first, so finished work is easy to find
function villaOptionsHtml(areaData, selectedId) {
    const counts = savedCountByVilla(areaData.areaid);
    const option = v => `<option value="${v.villaId}" ${v.villaId === selectedId ? 'selected' : ''}>${v.villaName}${counts[v.villaId] ? ` (${counts[v.villaId]} saved)` : ''}</option>`;
    const audited = areaData.villasList.filter(v => counts[v.villaId]);
    const notAudited = areaData.villasList.filter(v => !counts[v.villaId]);
    let html = `<option value="" ${selectedId ? '' : 'selected'}>-- Select Villa --</option>`;
    if (audited.length > 0) {
        html += `<optgroup label="Audited in this audit">${audited.map(option).join('')}</optgroup>`;
        html += `<optgroup label="Not audited yet">${notAudited.map(option).join('')}</optgroup>`;
    } else {
        html += notAudited.map(option).join('');
    }
    return html;
}

// After a save, refresh the saved counts and grouping in the villa list
function refreshVillaOptions() {
    const select = document.getElementById('villa-select');
    if (!select || !subareas || !subareas.villasList) {
        return;
    }
    select.innerHTML = villaOptionsHtml(subareas, select.value || null);
}

// Pick a villa from the "already audited" shortcuts on the empty checklist
function pickVilla(villaId) {
    $('#villa-select').val(villaId);
    onVillaChange(villaId);
}

// Optional: Add this helper function to handle villa selection changes
function onVillaChange(selectedVillaId) {
    if (!confirmDiscardUnsaved()) {
        $('#villa-select').val(SelectedVillaByArea[currentareaid] || '');
        return;
    }
    rememberVilla(currentareaid, selectedVillaId);
    LoadCustomControlWithRender('subareachecklist-div', 'views/subareachecklist_new.html', userselectedarea, '')
}
