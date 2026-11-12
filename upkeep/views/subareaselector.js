var currentareaid = null;
var subareas =null;
var userselectedarea = null;
function initializePage(containerId) {
    $(document).ready(function () {
        var userdata = $(containerId).data('controlData');
        currentareaid = userdata.controlData;
        var renderType = userdata.renderType;
        var UserObject = GetStoredUserData();
        UserRoles = UserObject.role;
        subareas =  findAreaById(currentareaid,PropertyData.propArea);
        $('#area-name').text(subareas.areaName);
        $('#area-name2').text(subareas.areaName);
        var subareaslist = createSubAreaTabs(subareas)
        $('#subarealist-div').html(subareaslist)
    });
}


function AddNewSubarea(){
    console.log(subareas.areaid);
    console.log(subareas.propId);
    var subareaname = $('#newSubareaInput').val();
    console.log(subareaname);


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
               location.reload();
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


function getSubAreaDetail(subAreaId) {
    userselectedarea = subAreaId;
    LoadCustomControlWithRender('subareachecklist-div','views/subareachecklist.html',subAreaId,'')
}



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

        // Add options for each villa
        areaData.villasList.forEach(villa => {
            html += `<option value="${villa.villaId}">${villa.villaName}</option>`;
        });

        html += `
                </select>
            </div>
        `;
    }

    // Start the tabs container
    html += '<ul class="nav nav-tab2 mb-3" id="tab2-tab" role="tablist">';
    var firstsubarea = areaData.subAreas[0].subareaId;

    // Loop through each subArea to create a tab
    areaData.subAreas.forEach((subArea, index) => {
        // Skip if subarea is not active
        if (subArea.isactive === false) {
            return;
        }

        // Create safe ID by removing spaces and special characters
        const subAreaId = subArea.subareaName.toLowerCase().replace(/[^a-z0-9]/g, '-');

        // Determine if this should be the active tab (first one is active)
        const isActive = index === 0;

        html += `
            <li class="nav-item" role="presentation">
                <button class="nav-link ${isActive ? 'active' : ''}" 
                        id="${subAreaId}-tab" 
                        data-bs-toggle="pill"
                        data-bs-target="#${subAreaId}" 
                        type="button" 
                        role="tab"
                        aria-controls="${subAreaId}" 
                        aria-selected="${isActive ? 'true' : 'false'}"
                        data-subarea-id="${subArea.subareaId}"
                        onclick="getSubAreaDetail('${subArea.subareaId}')">
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

// Optional: Add this helper function to handle villa selection changes
function onVillaChange(selectedVillaId) {
    if (selectedVillaId) {
        LoadCustomControlWithRender('subareachecklist-div','views/subareachecklist.html',userselectedarea,'')
    }
}