const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const parameterValue = urlParams.get('xid');
var AllProperties = null;
var userEmail = null;
var CurrentPropertyData = null;
var CurrentAuditData = null;
function initializeSignalR(emaiID) {
    var hubconsstring = applicationdomain + 'applicationhub?token=&appcode=upkeep&param=' + emaiID;

    const iconnection = new signalR.HubConnectionBuilder()
        .withUrl(hubconsstring)
        .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: retryContext => {
                if (retryContext.elapsedMilliseconds < 60000) {
                    // Wait 2 seconds before the next reconnect attempt
                    return 2000;
                }
            }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

    iconnection.start().then(function () {
        console.log("connected");
        $('#avatar-status').removeClass('avatar-offline');
        $('#avatar-status-dd').removeClass('avatar-offline');

        $('#avatar-status').addClass('avatar-online');
        $('#avatar-status-dd').addClass('avatar-online');

        iconnection.invoke('getConnectionId')
            .then(function (connectionId) {
                sessionStorage.setItem('conectionId', connectionId);
                //document.getElementById('SIGNALR_ID').value = connectionId;
                // Send the connectionId to controller
            }).catch(err => console.error(err.toString()));
    }).catch(err => console.error('Connection failed: ', err.toString()));

    iconnection.on("TriggerAction", function (ActionName, ActionMessage) {
        // Handle the TriggerAction event
        // console.log(`Action: ${ActionName}, Message: ${ActionMessage}`);

        if (ActionName === 'JOBCREATED') {
            $('#top-notification-bell').html(`<span class="badge bg-danger rounded-pill badge-notifications">${ActionMessage}</span>`);
            $('#openjobscount').text(ActionMessage);
        }
        else if (ActionName === 'JOBASSIGNED') {
            playMusic();
        }
    });
}
function GetSignalRclientID() {
    return iconnection.connection.connectionId;
}

$(document).ready(function () {

    UserObject = GetStoredUserData();

    if (UserObject != null) {
        userName = UserObject.name;
        userEmail = UserObject.username;
        userDesignation = UserObject.desg;
        CurrentProperty = null;
        UserRoles = UserObject.role;
        initializeSignalR(userEmail);
        $('#UserName_Name').text(UserObject.name);
        $('#is-designation').text(userDesignation);
        GetPropertyList(UserRoles, UserObject.prop);


    }
    else {
        LogoutUser();
    }
});


function GetPropertyList(uroles, propid) {
    var ep = applicationdomain + 'api/upkeep/getallproperty';
    var jwt = GetStoredJwt();

    $.ajax({
        url: ep,
        type: 'GET',
        dataType: 'json',
        processData: false,
        contentType: false,
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            if (Response) {
                var htm = ``;
                AllProperties = Response;
                var PropName = extractPropData(Response);

                var TopIndexProp = null;

                if (uroles.includes('SUPERADMIN') || uroles.includes('OPROADMIN')) {
                    TopIndexProp = PropName[0];
                    $.each(PropName, function (index, op) {
                        htm += `<option ${index === 0 ? 'selected' : ''} value="${op.propId}">${op.propName}</option>`
                    });
                    var selt2 = `<select id="property_sector" class=" form-select" oninput="PropertyChange()">${htm}</select>`
                    $('#prop-selector-div').html(selt2);
                }
                else {
                    TopIndexProp = getPropDataById(Response, propid);
                    htm += `<option selected value="${TopIndexProp.propId}">${TopIndexProp.propName}</option>`
                    var selt2 = `<select id="property_sector" class=" form-select" oninput="PropertyChange()">${htm}</select>`
                    $('#prop-selector-div').html(selt2);
                }

                if (TopIndexProp) {

                    PropertyChange()
                }
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {

            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                unblockUI('#section-block');
                var errorResponse = XMLHttpRequest.responseText;
                NotifyToast('error', errorResponse)

            } else {
                console.log("An error occurred:", errorThrown);
                unblockUI('#section-block');
            }
        }
    });
}


function extractPropData(data) {
    return data.map(prop => ({
        propId: prop.propId,
        propName: prop.propName
    }));
}
function getPropDataById(data, propId) {
    const prop = data.find(prop => prop.propId === propId);
    if (prop) {
        return {
            propId: prop.propId,
            propName: prop.propName
        };
    }
    return null;
}
function getFullPropertyById(data, propId) {
    // Find the property object with the matching propId
    const property = data.find(item => item.propId === propId);

    // Return the found property or null if no match is found
    return property || null;
}
function PropertyChange() {

    GetAllAudits()

    // var NewProp = $('#property_sector').val();
    // var form = new FormData();
    // form.append("propId", NewProp);
    // form.append("status", 'Open');
    //
    //
    // var ep = applicationdomain + 'api/dailyjob/getallquickfixjobs';
    // var jwt = GetStoredJwt();
    // debugger
    // $.ajax({
    //     url: ep,
    //     type: 'POST',
    //     dataType: 'json',
    //     data: form,
    //     processData: false,
    //     contentType: false,
    //     headers: {
    //         "Authorization": "Bearer " + jwt
    //     },
    //     success: function (Response) {
    //         if(Response){
    //
    //             var CurrentProperty = getFullPropertyById(AllProperties,NewProp);
    //             var XTeam = findTeamByEmail(userEmail,Response.teams);
    //             var UserCurrentTeamId = null;
    //             var UserSubTeams = [];
    //             if(XTeam){
    //                 UserCurrentTeamId = XTeam.teamId
    //                 UserSubTeams = XTeam.propsubteams
    //             }
    //
    //             var control_open = {
    //                 property : CurrentProperty,
    //                 openjob: Response.open,
    //                 teamId:UserCurrentTeamId,
    //                 allTeams : Response.teams,
    //                 userTeam:Response.userTeam,
    //                 userSubTeamData : UserSubTeams,
    //                 areas:Response.areas
    //             };
    //
    //             var control_close = {
    //                 property : CurrentProperty,
    //                 closedjob: Response.close,
    //                 teamId:UserCurrentTeamId,
    //                 allTeams : Response.teams,
    //                 userTeam:Response.userTeam,
    //                 userSubTeamData : UserSubTeams,
    //                 areas:Response.areas
    //             };
    //
    //             var Control_new = {
    //                 property : CurrentProperty,
    //                 teamId:UserCurrentTeamId,
    //                 allTeams : Response.teams,
    //                 userTeam:Response.userTeam,
    //                 userSubTeamData : UserSubTeams,
    //                 areas:Response.areas
    //             }
    //
    //             LoadNewJobControl(Control_new);
    //             LoadOpneJobControl(control_open);
    //             LoadCloseJobControl(control_close);
    //         }
    //     },
    //     error: function (XMLHttpRequest, textStatus, errorThrown) {
    //         if (XMLHttpRequest.status === 401) {
    //             LogoutUser()
    //         }
    //         else if (XMLHttpRequest.status === 400) {
    //             var errorResponse = XMLHttpRequest.responseJSON;
    //             ErrorMessage()
    //         } else {
    //             console.log("An error occurred:", errorThrown);
    //         }
    //     }
    // });



}

function GetCurrentPropertyInfo(propid) {

    ShowSpinner()
    var form = new FormData();
    form.append("propId", propid);


    var ep = applicationdomain + 'api/upkeep/getpropinfo';
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
            HideSpinner()

            if (Response) {
                CurrentPropertyData = Response;
                console.log(CurrentPropertyData);
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {

            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                unblockUI('#section-block');
                var errorResponse = XMLHttpRequest.responseText;
                NotifyToast('error', errorResponse)

            } else {
                console.log("An error occurred:", errorThrown);
                unblockUI('#section-block');
            }
        }
    });
}

function CreateNewAudit() {
    var NewProp = $('#property_sector').val();
    var form = new FormData();
    form.append("propId", NewProp);
    var ep = applicationdomain + 'api/upkeep/addnewaudit';
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
            if (Response.success == true) {
                GetAllAudits()
                handleAction(Response.auditid, NewProp)
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

function GetAllAudits() {

    var NewProp = $('#property_sector').val();
    var ep = `${applicationdomain}api/upkeep/getallaudits?prop=${NewProp}`;
    var jwt = GetStoredJwt();

    $.ajax({
        url: ep,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/json',
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            var tableHTML = createAuditTable(Response);
            $('#auditdatatablediv').html(tableHTML);
            GetCurrentPropertyInfo(NewProp)

        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {

            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {

                var errorResponse = XMLHttpRequest.responseText;
                NotifyToast('error', errorResponse)

            } else {
                console.log("An error occurred:", errorThrown);
                unblockUI('#section-block');
            }
        }
    });
}




function createAuditTable(auditData) {
    if (!auditData || auditData.length === 0) {
        return `
            <div class="table-container">
                <div class="empty-state-with-action">
                    <h3>No audit data available</h3>
                    <p>Get started by creating your first audit report.</p>
                    <button class="add-audit-btn" onclick="handleAddNewAudit()">
                        + Add New Audit Report
                    </button>
                </div>
            </div>
        `;
    }

    // Sort audit data by created date in descending order (latest first)
    const sortedAuditData = [...auditData].sort((a, b) => {
        return new Date(b.createdOn) - new Date(a.createdOn);
    });


    let tableHTML = `
        <div class="table-container">
            <div class="table-header">
                <h2>Audit Data Overview</h2>
            </div>
            <div class="table-controls">
                <div class="search-container">
                    <input 
                        type="text" 
                        class="search-input" 
                        placeholder="Search by Audit ID or Created By..."
                        onkeyup="filterTable(this.value)"
                        id="auditSearch"
                    >
                </div>
                <button class="add-audit-btn" onclick="handleAddNewAudit()">
                    + Add New Audit Report
                </button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Audit ID</th>
                        <th>Progress</th>
                        <th>Total</th>
                        <th>Created Date</th>
                        <th>Created By</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="auditTableBody">
    `;

    sortedAuditData.forEach((audit, index) => {
        const coveredCount = audit.opUpkeepTrackers ? audit.opUpkeepTrackers.length : 0;
        const totalCount = audit.subAreaCheckPoints ? audit.subAreaCheckPoints.length : 0;
        const createdDate = formatMaldives(audit.createdOn, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });


        

        tableHTML += `
            <tr class="audit-row" data-audit-id="${audit.auditId}" data-created-by="${audit.createdBy}">
                <td>
                    <div class="audit-id">
                        <a href="#" onclick="GetCurrentAuditReport('${audit.auditId}','${audit.propId}')">
                            ${audit.auditId}
                        </a>
                    </div>
                </td>
                <td>
                    <span class="count-badge covered-count">${coveredCount}</span>
                </td>
                <td>
                    <span class="count-badge total-count">${totalCount}</span>
                </td>
                <td>
                    <div class="created-date">${createdDate}</div>
                </td>
                <td>${audit.createdBy}</td>
                <td>
                    <div class="action-group">
                        <button class="action-btn" onclick="handleAction('${audit.auditId}', '${audit.propId}')">
                            View Details
                        </button>
                        <button class="action-btn report-btn" onclick="openAuditReport('${audit.auditId}', '${audit.propId}', 'report')" title="Maintenance & Safety Audit Report (PDF)">
                            Generate Report
                        </button>
                        <button class="action-btn export-btn" onclick="openAuditReport('${audit.auditId}', '${audit.propId}', 'export')" title="All checkpoint data as Excel or PDF">
                            Export
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
            <div id="noResults" class="no-results" style="display: none;">
                <p>No audit reports match your search criteria.</p>
            </div>
        </div>
    `;

    // Auto-call GetCurrentAuditReport for the most recent audit (first row)
    if (sortedAuditData.length > 0) {
        const latestAudit = sortedAuditData[0];
        setTimeout(() => {
            if (typeof GetCurrentAuditReport === 'function') {
                GetCurrentAuditReport(latestAudit.auditId, latestAudit.propId);
            }
        }, 100);
    }

    return tableHTML;
}
function handleAction(auditId, propid) {




    // Create URL with query parameters for auditinfo.html
    const auditInfoUrl = `auditinfo_new.html?audit=${encodeURIComponent(auditId)}&prop=${encodeURIComponent(propid)}`;

    // Open in new tab
    window.open(auditInfoUrl, '_blank');



}

// mode: 'report' = Generate Report, 'export' = Export (Excel / PDF)
function openAuditReport(auditId, propid, mode) {
    var url = `auditreport.html?audit=${encodeURIComponent(auditId)}&prop=${encodeURIComponent(propid)}`;
    if (mode === 'export') {
        url += '&mode=export';
    }
    window.open(url, '_blank');
}

function handleAddNewAudit() {
    CreateNewAudit()
}

function filterTable(searchTerm) {
    const rows = document.querySelectorAll('.audit-row');
    const noResults = document.getElementById('noResults');
    const tableBody = document.getElementById('auditTableBody');
    let visibleRowCount = 0;

    searchTerm = searchTerm.toLowerCase().trim();

    rows.forEach(row => {
        const auditId = row.getAttribute('data-audit-id').toLowerCase();
        const propertyId = row.getAttribute('data-property-id').toLowerCase();
        const createdBy = row.getAttribute('data-created-by').toLowerCase();

        const isVisible = searchTerm === '' ||
            auditId.includes(searchTerm) ||
            propertyId.includes(searchTerm) ||
            createdBy.includes(searchTerm);

        if (isVisible) {
            row.style.display = '';
            visibleRowCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Show/hide no results message
    if (visibleRowCount === 0 && searchTerm !== '') {
        noResults.style.display = 'block';
        tableBody.style.display = 'none';
    } else {
        noResults.style.display = 'none';
        tableBody.style.display = '';
    }
}

function GetCurrentAuditReport(auditID, propid) {

    ShowSpinner()
    var ep = `${applicationdomain}api/upkeep/getauditreport?prop=${propid}&audit=${auditID}`;
    var jwt = GetStoredJwt();

    $.ajax({
        url: ep,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/json',
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            HideSpinner()
            if (Response) {
                CurrentAuditData = Response;
                var ttx = createAuditSummaryTable(CurrentPropertyData.propArea, CurrentAuditData);
                $('#auditsummarydatadiv').html(ttx);
                $('#audit-id-span').text(`Audit Report : ${auditID}`)
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {

            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {

                var errorResponse = XMLHttpRequest.responseText;
                NotifyToast('error', errorResponse)

            } else {
                console.log("An error occurred:", errorThrown);
                unblockUI('#section-block');
            }
        }
    });
}


function groupByAreaId(data) {
    // Create an object to store grouped data
    const groupedData = {};

    // Iterate through each item in the data array
    data.forEach(item => {
        const areaId = item.areaId;

        // If this areaId doesn't exist in our grouped data, create an empty array
        if (!groupedData[areaId]) {
            groupedData[areaId] = [];
        }

        // Add the current item to the appropriate group
        groupedData[areaId].push(item);
    });

    // Convert the object to an array of arrays (list of lists)
    const result = Object.keys(groupedData).map(areaId => ({
        areaId: areaId,
        items: groupedData[areaId],
        count: groupedData[areaId].length
    }));

    return result;
}


function getScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'satisfactory';
    if (score >= 20) return 'poor';
    return 'critical';
}


function createAuditSummaryTable(areasData, checklistData) {
    // Validate input data
    if (!areasData || areasData.length === 0) {
        return `
            <div class="table-responsive">
                <div class="empty-state">
                    <h3>No area data available</h3>
                    <p>Please provide area data to generate the summary table.</p>
                </div>
            </div>
        `;
    }

    // Calculate area-wise scores using the new scoring method
    const areawiseScores = groupByAreaId(CurrentAuditData);
    const areaScoreMap = {};

    areawiseScores.forEach(area => {
        const areaScore = countCheckpointStatus(area.items);

        console.log(`Area ${area.areaId} Score: ${areaScore.finalScore.toFixed(2)}% (${areaScore.totalItems} checkpoints)`);
        console.log('Status breakdown:', areaScore.counts);

        areaScoreMap[area.areaId] = {
            score: Math.round(areaScore.finalScore),
            safetyIssues: areaScore.counts.SafetyIssue || 0,
            totalItems: areaScore.totalItems,
            statusCounts: areaScore.counts
        };
    });

    // Prepare area statistics for the table
    const areaStats = areasData.map((area, index) => {
        // Get calculated score from new method
        const calculatedScore = areaScoreMap[area.areaid];

        // Count checkpoints for this area
        const areaCheckpoints = checklistData.filter(checkpoint =>
            checkpoint.areaId === area.areaid
        );

        // Calculate total expected checkpoints
        let totalCheckpoints = 0;
        area.subAreas.forEach(subArea => {
            totalCheckpoints += subArea.checkpoints ? subArea.checkpoints.length : 0;
        });

        // If no checkpoints in area structure, use actual checklist count
        if (totalCheckpoints === 0) {
            totalCheckpoints = areaCheckpoints.length;
        }

        return {
            sno: index + 1,
            areaId: area.areaid,
            areaName: area.areaName,
            score: calculatedScore ? calculatedScore.score : 0,
            safetyIssues: calculatedScore ? calculatedScore.safetyIssues : 0,
            totalCheckpoints: totalCheckpoints,
            completedCheckpoints: areaCheckpoints.length,
            statusCounts: calculatedScore ? calculatedScore.statusCounts : {}
        };
    });

    // Calculate overall summary
    const totalSafetyIssues = areaStats.reduce((sum, area) => sum + area.safetyIssues, 0);
    const averageScore = areaStats.length > 0
        ? Math.round(areaStats.reduce((sum, area) => sum + area.score, 0) / areaStats.length)
        : 0;

    // Generate the HTML table
    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-bordered audit-table">
                <thead>
                    <tr>
                        <th>S.No.</th>
                        <th>Area</th>
                        <th>Score</th>
                        <th>Safety Hazard</th>
                        <th>Progress</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Generate table rows
    areaStats.forEach(area => {
        const progressPercentage = area.totalCheckpoints > 0
            ? Math.round((area.completedCheckpoints / area.totalCheckpoints) * 100)
            : 0;

        tableHTML += `
            <tr>
                <td>${area.sno}</td>
                <td>${area.areaName}</td>
                <td>
                    <span class="score-badge score-${getScoreClass(area.score)}">
                        ${area.score}%
                    </span>
                </td>
                <td>
                    <span class="safety-badge ${area.safetyIssues > 0 ? 'safety-issues' : 'no-issues'}">
                        ${area.safetyIssues}
                    </span>
                </td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${progressPercentage}%"></div>
                        <span class="progress-text">${area.completedCheckpoints}/${area.totalCheckpoints}</span>
                    </div>
                </td>
            </tr>
        `;
    });

    // Generate table footer
    tableHTML += `
                </tbody>
                <tfoot>
                    <tr class="summary-row">
                        <td colspan="2"><strong>Overall Summary</strong></td>
                        <td>
                            <strong>
                                <span class="score-badge score-${getScoreClass(averageScore)}">
                                    ${averageScore}%
                                </span>
                            </strong>
                        </td>
                        <td>
                            <strong>
                                <span class="safety-badge ${totalSafetyIssues > 0 ? 'safety-issues' : 'no-issues'}">
                                    ${totalSafetyIssues}
                                </span>
                            </strong>
                        </td>
                        <td><strong>Total Issues: ${totalSafetyIssues}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    return tableHTML;
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

