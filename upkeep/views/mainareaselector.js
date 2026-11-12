function initializePage(containerId) {
    $(document).ready(function () {
        var userdata = $(containerId).data('controlData');
        var QuickFixOpen = userdata.controlData;
        var renderType = userdata.renderType;
        var UserObject = GetStoredUserData();
        UserRoles = UserObject.role;
        var arealist = createAreaTabs(PropertyData.propArea);
        $('#proparealist-div').html(arealist);
        
    });
}


function createAreaTabs(propAreaData) {
    
    
    
    if (!propAreaData || !Array.isArray(propAreaData) || propAreaData.length === 0) {
        console.error("Property area data is invalid or empty");
        return "";
    }

    // Filter areas to include only those with at least one subarea with at least one checkpoint
    const filteredAreas = propAreaData.filter(area =>
        area.subAreas &&
        area.subAreas.some(subarea =>
            subarea.checkpoints &&
            subarea.checkpoints.length > 0
        )
    );

    // If no valid areas, return empty string
    if (filteredAreas.length === 0) {
        console.warn("No areas with subareas containing checkpoints found");
        return "";
    }
    var firstarea = filteredAreas[0].areaid;
    
    let html = '<ul class="nav nav-tab1 mb-3" id="tab1-tab" role="tablist">';
    
    // Loop through each filtered area to create a tab
    filteredAreas.forEach((area, index) => {
        // Create safe ID by removing spaces and special characters
        const areaId = area.areaName.toLowerCase().replace(/[^a-z0-9]/g, '-');

        // Determine if this should be the active tab (first one is active)
        const isActive = index === 0;

        html += `
            <li class="nav-item" role="presentation">
                <button class="nav-link ${isActive ? 'active' : ''}" 
                        id="${areaId}-tab" 
                        data-bs-toggle="pill"
                        data-bs-target="#${areaId}" 
                        type="button" 
                        role="tab" 
                        aria-controls="${areaId}"
                        aria-selected="${isActive ? 'true' : 'false'}"
                        data-area-id="${area.areaid}"
                        onclick="getAreaDetail('${area.areaid}')">
                    ${area.areaName}
                </button>
            </li>
        `;
    });

    html += '</ul>';
    getAreaDetail(firstarea)
    return html;
}

function getAreaDetail(areaid) {
   
    LoadCustomControlWithRender('subareaselector-div','views/subareaselector.html',areaid,'')
}

function findAreaById(areaId, propArea) {
    // Input validation
    if (!areaId || !propArea || !Array.isArray(propArea)) {
        console.error("Invalid input parameters");
        return null;
    }

    // Find and return the matching area object
    return propArea.find(area => area.areaid === areaId) || null;
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

    // Find the matching subarea
    const subarea = area.subAreas.find(subarea =>
        subarea.subareaId === subareaId
    );

    if (!subarea || !subarea.checkpoints) {
        return null;
    }

    // Return the checkpoints
    return subarea.checkpoints;
}