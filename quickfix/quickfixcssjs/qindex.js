const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const parameterValue = urlParams.get('xid');
var AllProperties = null;
var userEmail = null;
function initializeSignalR(emaiID) {
    var hubconsstring = applicationdomain + 'applicationhub?token=&appcode=dailyjobtracker&param=' + emaiID;

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
            $('#openjobcountbadge').text(ActionMessage);
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
    if (UserObject != null){
        userName = UserObject.name;
        userEmail = UserObject.username;
        userDesignation = UserObject.desg;
        CurrentProperty = null;
        UserRoles = UserObject.role;
        initializeSignalR(userEmail);
        $('#UserName_Name').text(UserObject.name);
        $('#is-designation').text(userDesignation);
        GetPropertyList(UserRoles,UserObject.prop);

        $(document).on('shown.bs.tab', '#tab2-tab', function () {
            if ($.fn.DataTable.isDataTable('#openjobstable')) {
                $('#openjobstable').DataTable().columns.adjust().responsive.recalc();
            }
        });
        $(document).on('shown.bs.tab', '#tab3-tab', function () {
            if ($.fn.DataTable.isDataTable('#closejobstable')) {
                $('#closejobstable').DataTable().columns.adjust().responsive.recalc();
            }
        });
    }
    else{
        LogoutUser();
    }
});

function GetPropertyList(uroles, propid){
    var ep = applicationdomain + 'api/dailyjob/getallproperty';
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
            if(Response){
                var htm = ``;
                AllProperties = Response;
                var PropName = extractPropData(Response);
                var TopIndexProp = null;
                
                if(uroles.includes('SUPERADMIN') || uroles.includes('OPROADMIN')){
                    TopIndexProp = PropName[0];
                    $.each(PropName, function (index, op){
                        htm += `<option ${index===0?'selected':''} value="${op.propId}">${op.propName}</option>`
                    });
                    var selt2 = `<select id="property_sector" class=" form-select" oninput="PropertyChange()">${htm}</select>`
                    $('#prop-selector-div').html(selt2);
                }
                else{
                    TopIndexProp = getPropDataById(Response,propid);
                    htm += `<option selected value="${TopIndexProp.propId}">${TopIndexProp.propName}</option>`
                    var selt2 = `<select id="property_sector" class=" form-select" oninput="PropertyChange()">${htm}</select>`
                    $('#prop-selector-div').html(selt2);
                }

                if(TopIndexProp) {
                    PropertyChange();
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
    if (!data || !Array.isArray(data)) return null;
    const property = data.find(item => item.propId === propId);
    return property || null;
}
window.currentOpenPage = 1;
window.currentOpenPageSize = 25;
window.currentClosePage = 1;
window.currentClosePageSize = 25;
var cachedTeams = [];
var cachedAreas = [];
var cachedUserTeam = [];

function PropertyChange(openPage, closePage) {
    window.currentOpenPage = (typeof openPage === 'number' && openPage > 0) ? openPage : 1;
    window.currentClosePage = (typeof closePage === 'number' && closePage > 0) ? closePage : 1;
    if (!window.currentOpenPageSize) window.currentOpenPageSize = 25;
    if (!window.currentClosePageSize) window.currentClosePageSize = 25;

    FetchOpenJobs(window.currentOpenPage, window.currentOpenPageSize, true);
    FetchClosedJobs(window.currentClosePage, window.currentClosePageSize, true);
}

function FetchOpenJobs(page, pageSize, isInitial) {
    if (typeof page === 'number' && page > 0) {
        window.currentOpenPage = page;
    } else {
        window.currentOpenPage = 1;
    }
    if (typeof pageSize === 'number' && pageSize > 0) {
        window.currentOpenPageSize = pageSize;
    } else if (!window.currentOpenPageSize) {
        window.currentOpenPageSize = 25;
    }

    var NewProp = $('#property_sector').val();
    if (!NewProp) return;

    var form = new FormData();
    form.append("propId", NewProp);
    form.append("jobList", "open");
    form.append("pageNumber", window.currentOpenPage);
    form.append("pageSize", window.currentOpenPageSize);

    var ep = applicationdomain + 'api/dailyjob/getallquickfixjobs';
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
            if (Response) {
                var CurrentProperty = getFullPropertyById(AllProperties, NewProp);
                if (Response.teams && Response.teams.length > 0) {
                    cachedTeams = Response.teams;
                }
                if (Response.areas && Response.areas.length > 0) {
                    cachedAreas = Response.areas;
                }
                if (Response.userTeam) {
                    cachedUserTeam = Response.userTeam;
                }

                var XTeam = findTeamByEmail(userEmail, cachedTeams || []);
                var UserCurrentTeamId = null;
                var UserSubTeams = [];
                if (XTeam) {
                    UserCurrentTeamId = XTeam.teamId;
                    UserSubTeams = XTeam.propsubteams;
                }

                var totalOpenCount = (Response.pagination && Response.pagination.totalOpen !== undefined)
                    ? Response.pagination.totalOpen
                    : (Response.open ? Response.open.length : 0);
                $('#openjobcountbadge').text(totalOpenCount);

                var control_open = {
                    property: CurrentProperty,
                    openjob: Response.open || [],
                    teamId: UserCurrentTeamId,
                    allTeams: cachedTeams,
                    userTeam: cachedUserTeam,
                    userSubTeamData: UserSubTeams,
                    areas: cachedAreas,
                    pagination: Response.pagination || null,
                    currentPage: window.currentOpenPage,
                    pageSize: window.currentOpenPageSize
                };

                if (isInitial) {
                    var Control_new = {
                        property: CurrentProperty,
                        teamId: UserCurrentTeamId,
                        allTeams: cachedTeams,
                        userTeam: cachedUserTeam,
                        userSubTeamData: UserSubTeams,
                        areas: cachedAreas
                    };
                    LoadNewJobControl(Control_new);
                }

                if (!isInitial && typeof PopulateOpenJobCards === 'function' && $('#openjobstable').length > 0) {
                    window.QuickFixOpen = control_open;
                    if (typeof QuickFixOpen !== 'undefined') {
                        QuickFixOpen = control_open;
                    }
                    PopulateOpenJobCards();
                } else {
                    LoadOpneJobControl(control_open);
                }
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status === 401) {
                LogoutUser();
            } else if (XMLHttpRequest.status === 400) {
                var errorResponse = XMLHttpRequest.responseJSON;
                ErrorMessage();
            } else {
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}

function FetchOpenJobPage(page) {
    FetchOpenJobs(page, window.currentOpenPageSize || 25, false);
}

function ChangeOpenPageSize(pageSize) {
    window.currentOpenPageSize = parseInt(pageSize) || 25;
    window.currentOpenPage = 1;
    FetchOpenJobs(1, window.currentOpenPageSize, false);
}

function FetchClosedJobs(page, pageSize, isInitial) {
    if (typeof page === 'number' && page > 0) {
        window.currentClosePage = page;
    } else {
        window.currentClosePage = 1;
    }
    if (typeof pageSize === 'number' && pageSize > 0) {
        window.currentClosePageSize = pageSize;
    } else if (!window.currentClosePageSize) {
        window.currentClosePageSize = 25;
    }

    var NewProp = $('#property_sector').val();
    if (!NewProp) return;

    var form = new FormData();
    form.append("propId", NewProp);
    form.append("jobList", "close");
    form.append("pageNumber", window.currentClosePage);
    form.append("pageSize", window.currentClosePageSize);

    var ep = applicationdomain + 'api/dailyjob/getallquickfixjobs';
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
            if (Response) {
                var CurrentProperty = getFullPropertyById(AllProperties, NewProp);
                if (Response.teams && Response.teams.length > 0) {
                    cachedTeams = Response.teams;
                }
                if (Response.areas && Response.areas.length > 0) {
                    cachedAreas = Response.areas;
                }
                if (Response.userTeam) {
                    cachedUserTeam = Response.userTeam;
                }

                var XTeam = findTeamByEmail(userEmail, cachedTeams || []);
                var UserCurrentTeamId = null;
                var UserSubTeams = [];
                if (XTeam) {
                    UserCurrentTeamId = XTeam.teamId;
                    UserSubTeams = XTeam.propsubteams;
                }

                var control_close = {
                    property: CurrentProperty,
                    closedjob: Response.close || [],
                    teamId: UserCurrentTeamId,
                    allTeams: cachedTeams,
                    userTeam: cachedUserTeam,
                    userSubTeamData: UserSubTeams,
                    areas: cachedAreas,
                    pagination: Response.pagination || null,
                    currentPage: window.currentClosePage,
                    pageSize: window.currentClosePageSize
                };

                if (!isInitial && typeof PopulateCloseJobCards === 'function' && $('#closejobstable').length > 0) {
                    window.QuickFixClosed = control_close;
                    if (typeof QuickFixClosed !== 'undefined') {
                        QuickFixClosed = control_close;
                    }
                    PopulateCloseJobCards();
                } else {
                    LoadCloseJobControl(control_close);
                }
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status === 401) {
                LogoutUser();
            } else if (XMLHttpRequest.status === 400) {
                var errorResponse = XMLHttpRequest.responseJSON;
                ErrorMessage();
            } else {
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}

function FetchCloseJobPage(page) {
    FetchClosedJobs(page, window.currentClosePageSize || 25, false);
}

function ChangeClosePageSize(pageSize) {
    window.currentClosePageSize = parseInt(pageSize) || 25;
    window.currentClosePage = 1;
    FetchClosedJobs(1, window.currentClosePageSize, false);
}

function generatePaginationHTML(currentPage, totalPages, onClickFuncName) {
    if (totalPages <= 1) {
        return `
            <nav aria-label="Page navigation">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item active"><span class="page-link">1</span></li>
                </ul>
            </nav>
        `;
    }

    let html = '<nav aria-label="Page navigation"><ul class="pagination pagination-sm mb-0 flex-wrap gap-1">';
    
    if (currentPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="${onClickFuncName}(${currentPage - 1})">&laquo; Prev</a></li>`;
    } else {
        html += `<li class="page-item disabled"><span class="page-link">&laquo; Prev</span></li>`;
    }

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="${onClickFuncName}(1)">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else {
            html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="${onClickFuncName}(${i})">${i}</a></li>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="${onClickFuncName}(${totalPages})">${totalPages}</a></li>`;
    }

    if (currentPage < totalPages) {
        html += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="${onClickFuncName}(${currentPage + 1})">Next &raquo;</a></li>`;
    } else {
        html += `<li class="page-item disabled"><span class="page-link">Next &raquo;</span></li>`;
    }

    html += '</ul></nav>';
    return html;
}

function RenderTopPageSizeSelector(tableId, pageSize, onPageSizeChangeFuncName) {
    let container = $(tableId).closest('.dt-container, .dataTables_wrapper');
    if (!container || container.length === 0) return;

    let buttonsDiv = container.find('.dt-buttons');
    if (buttonsDiv.length > 0) {
        container.find('.custom-pagesize-container').remove();
        let html = `
            <div class="custom-pagesize-container d-inline-flex align-items-center ms-3 my-1">
                <span class="text-muted small me-2 fw-semibold text-nowrap">Show</span>
                <select class="form-select form-select-sm d-inline-block" style="width: auto; min-width: 80px;" onchange="${onPageSizeChangeFuncName}(this.value)">
                    <option value="25" ${pageSize == 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${pageSize == 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${pageSize == 100 ? 'selected' : ''}>100</option>
                    <option value="200" ${pageSize == 200 ? 'selected' : ''}>200</option>
                </select>
                <span class="text-muted small ms-2 fw-semibold text-nowrap">rows</span>
            </div>
        `;
        buttonsDiv.after(html);
    }
}

function RenderPaginationControls(containerId, currentPage, totalPages, totalRecords, pageSize, onClickFuncName) {
    if (totalRecords <= 0) {
        $(containerId).html(`
            <div class="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
                <div class="text-muted small">
                    Showing <strong>0</strong> to <strong>0</strong> of <strong>0</strong> entries
                </div>
            </div>
        `);
        return;
    }

    let startItem = (currentPage - 1) * pageSize + 1;
    let endItem = Math.min(currentPage * pageSize, totalRecords);

    let infoHTML = `
        <div class="text-muted small">
            Showing <strong>${startItem}</strong> to <strong>${endItem}</strong> of <strong>${totalRecords}</strong> entries
        </div>
    `;

    let paginationHTML = generatePaginationHTML(currentPage, totalPages, onClickFuncName);

    $(containerId).html(`
        <div class="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
            ${infoHTML}
            <div class="pagination-nav ms-auto">${paginationHTML}</div>
        </div>
    `);
}

function LoadNewJobControl(propid){
    LoadCustomControlWithRender('div-newjob-holder','new/new.html',propid,'osd')
}
function LoadOpneJobControl(propid){
    LoadCustomControlWithRender('div-openjob-holder','open/open.html',propid,'osd')
}
function LoadCloseJobControl(propid){
    LoadCustomControlWithRender('div-closejob-holder','close/closed.html',propid,'osd')
}

function ApplyCurrentDateTime() {
    $('#CurrentDateTime').text(getCurrentDatetime())
}

function getCurrentDatetime() {
    var currentDatetime = new Date();
    var day = String(currentDatetime.getDate()).padStart(2, '0');
    var month = String(currentDatetime.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    var year = currentDatetime.getFullYear();

    var hours = currentDatetime.getHours();
    var minutes = String(currentDatetime.getMinutes()).padStart(2, '0');
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' should be '12'
    var formattedTime = hours + ':' + minutes + ' ' + ampm;

    var formattedDatetime = day + '/' + month + '/' + year + ', ' + formattedTime;
    return formattedDatetime;
}

function searchItems(searchText, data) {
    return data.filter(item => {
        return Object.values(item).some(value =>
            value && value.toString().toLowerCase().includes(searchText.toLowerCase())
        );
    });
}

function playMusic() {
    var url = `${applicationdomain}audio/play2.wav`
    const audio = new Audio(url);
    audio.play();
}


function findTeamByEmail(email, data) {
    // Iterate over each team in the data array
    for (let team of data) {
        // Check each member of the team
        for (let member of team.members) {
            // If the email matches, return the team
            if (member.email === email) {
                return team;
            }
        }
    }
    // If no team found with the provided email, return null
    return null;
}