const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const parameterValue = urlParams.get('xid');
var CurrentProperty = '';
var AllProperties = {};
var UserRoles = [];
var userName = '';
var userEmail = '';
var userDesignation = '';
var userTeams = [];
var userSubTeams = [];
var UserObject = null;
var ImmediatePropertyDef = null;
var UserPrimaryTeam = ``;
var UserCurrentTeamData = ``;
var UserCurrentTeamId = ``;
var OpenJobs = [];
var CloseJobs = [];
var iconnection; // Made global for access in GetSignalRclientID

function initializeSignalR(emaiID) {
    var hubconsstring = applicationdomain + 'applicationhub?token=&appcode=dailyjobtracker&param=' + emaiID;
    iconnection = new signalR.HubConnectionBuilder()
        .withUrl(hubconsstring)
        .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: retryContext => {
                if (retryContext.elapsedMilliseconds < 60000) {
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
            }).catch(err => console.error(err.toString()));
    }).catch(err => console.error('Connection failed: ', err.toString()));
    iconnection.on("TriggerAction", function (ActionName, ActionMessage) {
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

window.onload = function () {
    UserObject = GetStoredUserData();
    if (UserObject != null) {
        $('#UserName_Name').text(UserObject.name);
        userName = UserObject.name;
        userEmail = UserObject.username;
        userDesignation = UserObject.desg;
        CurrentProperty = null;
        UserRoles = UserObject.role;
        $('#is-designation').text(userDesignation);
        initializeSignalR(userEmail);
        GetUserTeams(userEmail);
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            $($.fn.dataTable.tables(true)).css('width', '100%');
            $($.fn.dataTable.tables(true)).DataTable().columns.adjust().draw();
        });
        $('.select2').select2({
            width: '100%'
        });
        GetAllProperties();
    }
    else {
        LogoutUser();
    }
};

function GetUserTeams() {
    var ep = applicationdomain + 'api/dailyjob/getuserteams';
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
            userTeams = [];
            userTeams = Response;
            if (userTeams.length > 0) {
                var fteam = userTeams[0];
                UserCurrentTeamId = fteam.primaryteam;
                UserPrimaryTeam = fteam.primaryteamname;
                UserCurrentTeamData = `${fteam.fname} ${fteam.lname} [${userDesignation}: ${fteam.primaryteamname}]`;
                var form = new FormData();
                form.append("teamId", fteam.primaryteam);
                form.append("propId", fteam.propid);
                var es = applicationdomain + 'api/dailyjob/getsubteam';
                $.ajax({
                    url: es,
                    type: 'POST',
                    dataType: 'json',
                    data: form,
                    processData: false,
                    contentType: false,
                    headers: {
                        "Authorization": "Bearer " + jwt
                    },
                    success: function (Response) {
                        userSubTeams = [];
                        userSubTeams = Response;
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
            else {
                UserCurrentTeamData = `${userName} [${userDesignation}] [${userEmail}]`;
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

function GetAllProperties() {
    var ep = applicationdomain + 'api/jobtracker/getallproperty';
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
            var htm = ``;
            var isSuperAdmin = UserRoles.includes("SUPERADMIN");
            if (isSuperAdmin) {
                AllProperties = {}
                $.each(Response, function (index, med) {
                    AllProperties[med.propId] = med.propName;
                    htm += `<option value="${med.propId}">${med.propName}</option>`
                });
                if (Object.keys(AllProperties).length > 1) {
                    var selt2 = `<select id="property_sector" class=" form-select" oninput="PropertyChange()">${htm}</select>`
                    $('#prop-selector-div').html(selt2);
                    $('.jbtclsdd').select2({
                        width: '100%',
                    });
                }
                var firstKey = Object.keys(AllProperties)[0];
                CurrentProperty = firstKey;
            }
            else {
                CurrentProperty = UserObject.prop;
            }
            GetAllOpenJobsCount(CurrentProperty);
            if (parameterValue === 'new' || isSuperAdmin) {
                GetProperyInfo(CurrentProperty);
            }
            if (parameterValue === 'open') {
                GetAllOpenJobs();
            } else if (parameterValue === 'close') {
                GetAllCloseJobs();
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

function GetProperyInfo(propID) {
    blockUI('#section-block');
    var form = new FormData();
    form.append("propId", propID);
    var ep = applicationdomain + 'api/jobtracker/getpropinfo';
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
            unblockUI('#section-block');
            ImmediatePropertyDef = Response;
            UpdatenewJobFields();
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

function UpdatenewJobFields() {
    var teamNames = [];
    var areaNames = [];
    var departments = ``;
    var areas = ``;
    $.each(ImmediatePropertyDef.propEmp, function (index, team) {
        teamNames.push({ id: team.teamId, name: team.teamName });
        departments += `<option value="${team.teamId}">${team.teamName}</option>`;
    });
    $.each(ImmediatePropertyDef.propArea, function (index, area) {
        areaNames.push({ id: area.areaid, name: area.areaName });
        areas += `<option value="${area.areaid}">${area.areaName}</option>`;
    });
    $('#issued-to-team').html(departments)
    $('#issued-to-area').html(areas)
    $('#issued-by-team').val(UserCurrentTeamData)
    DepartmentChange()
}

function DepartmentChange() {
    var issued_to = $('#issued-to-team').val();
    var issued_by = UserCurrentTeamId;
    var deptRow = document.getElementById('deptAssignRow');
    var supervisorRow = document.getElementById('supervisorAssignRow');
    if (issued_to === issued_by) {
        deptRow.classList.remove('hidden');
        supervisorRow.classList.remove('hidden');
        var currdepartments = ``;
        var currentMembers = ``;
        var ucounter = 0;
        userSubTeams.forEach(function (member) {
            currdepartments += `<option value="${member.subteamId}">${member.subteamName}</option>`;
            if (ucounter === 0) {
                member.subteams.forEach(function (xmember) {
                    currentMembers += `<option value="${xmember.email}">${xmember.firstName} ${xmember.lastName}</option>`;
                });
            }
            ucounter++;
        });
        $('#TeamAssignRow').html(currdepartments);
        $('#supervisorAssigndto').html(currentMembers);
    }
    else {
        deptRow.classList.add('hidden');
        supervisorRow.classList.add('hidden');
    }
}

function SubTeamChange() {
    var newDept = $('#TeamAssignRow').val();
    var NewMembers = ``;
    userSubTeams.forEach(function (member) {
        if (member.subteamId === newDept) {
            member.subteams.forEach(function (xmember) {
                NewMembers += `<option value="${xmember.email}">${xmember.firstName} ${xmember.lastName}</option>`;
            });
        }
    });
    $('#supervisorAssigndto').html(NewMembers);
}

function PropertyChange() {
    var NewProp = $('#property_sector').val();
    CurrentProperty = NewProp;
    GetUserTeams(userEmail);
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        $($.fn.dataTable.tables(true)).css('width', '100%');
        $($.fn.dataTable.tables(true)).DataTable().columns.adjust().draw();
    });
    $('.select2').select2({
        width: '100%'
    });
    GetAllProperties();
}

function SubmitDailyJob() {
    var issued_to = $('#issued-to-team').val();
    var issued_by_detail = $('#issued-by-team').val();
    var area = $('#issued-to-area').val();
    var subarea = $('#Subarea').val();
    var jobdetail = $('#job-details').val();
    var teamassigned = $('#TeamAssignRow').val();
    var supervisorAssigndto = $('#supervisorAssigndto').val();
    var fileInput = document.getElementById('job-photo');
    if (issued_to === '' || area === '' || subarea === '' || jobdetail === '') {
        var userdata = `<p>All fields are Mandatory *</p>`
        SuccessMessageCustom('New Job', userdata, 'error');
        return;
    }
    var hasPhoto = fileInput.files.length > 0;
    if (hasPhoto) {
        const validTypes = ['image/jpeg', 'video/mp4', 'video/quicktime'];
        const maxSize = 5 * 1024 * 1024; // 5 MB
        let isValid = true;
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            if (!validTypes.includes(file.type) || file.size > maxSize) {
                isValid = false;
                break;
            }
        }
        if (!isValid) {
            var userdata = `<p>Invalid file type or size exceeds 5 MB. Please upload JPEG, MP4, or MOV files only.</p>`;
            SuccessMessageCustom('New Job', userdata, 'error');
            return;
        }
        doSubmitDailyJob(issued_to, issued_by_detail, area, subarea, jobdetail, teamassigned, supervisorAssigndto, true);
    } else {
        Swal.fire({
            title: "<h4>Do you want to continue without job image?</h4>",
            showDenyButton: true,
            showCancelButton: false,
            confirmButtonText: "Save",
            denyButtonText: `Don't save`,
            customClass: {
                confirmButton: 'btn btn-label-linkedin',
                denyButton: 'btn btn-label-danger',
                cancelButton: 'btn custom-cancel-button'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                doSubmitDailyJob(issued_to, issued_by_detail, area, subarea, jobdetail, teamassigned, supervisorAssigndto, false);
            } else if (result.isDenied) {
                Swal.fire("Changes are not saved", "", "info");
            }
        });
    }
}

function doSubmitDailyJob(issued_to, issued_by_detail, area, subarea, jobdetail, teamassigned, supervisorAssigndto, hasPhoto) {
    if (issued_to !== UserCurrentTeamId) {
        supervisorAssigndto = null;
    }
    $('#submit-new-job-btn').attr("disabled", true);
    var form = new FormData();
    form.append("propId", CurrentProperty);
    form.append("areaID", area);
    form.append("subareaId", subarea);
    form.append("issued_to_team", issued_to);
    form.append("issued_by_team", UserCurrentTeamId);
    form.append("issued_by_team_details", issued_by_detail);
    form.append("creator_name", userName);
    form.append("creator_position", UserRoles[0]);
    form.append("job_detail", jobdetail);
    form.append("assigned_dept", teamassigned);
    form.append("assigned_supervisor", supervisorAssigndto);
    if (hasPhoto) {
        var fileInput = document.getElementById('job-photo');
        for (let i = 0; i < fileInput.files.length; i++) {
            form.append("jobImages", fileInput.files[i]);
        }
    }
    var ep = applicationdomain + 'api/dailyjob/addnewjob';
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
            $('#submit-new-job-btn').attr("disabled", false);
            if (Response.success === true) {
                GetAllOpenJobsCount(CurrentProperty);
                $('#job-details').val('');
                $('#Subarea').val('');
                var userdata = `<p>Job added successfully</p>`
                SuccessMessageCustom('New Job', userdata, 'success')
            }
            else {
                var userdata = `<p>Failed to add job</p>`
                SuccessMessageCustom('New Job', userdata, 'error')
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

function GetAllOpenJobs() {
    var form = new FormData();
    form.append("propId", CurrentProperty);
    form.append("status", 'Open');
    var ep = applicationdomain + 'api/dailyjob/getnonclosedjobs';
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
            OpenJobs = [];
            OpenJobs = Response;
            $('#top-notification-bell').html(`<span class="badge bg-danger rounded-pill badge-notifications">${OpenJobs.length}</span>`);
            PopulateOpenJobCards()
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

function GetAllCloseJobs() {
    var form = new FormData();
    form.append("propId", CurrentProperty);
    form.append("status", 'Closed');
    var ep = applicationdomain + 'api/dailyjob/getjobbystatus';
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
            CloseJobs = [];
            CloseJobs = Response;
            PopulateCloseJobCards();
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

function buildOpenJobHtml(jobs) {
    let htm = '';
    jobs.forEach(function (op) {
        let imgurl = op.open_uploads.length > 0 ? op.open_uploads[0].fileurl : '';
        let retval = '';
        if (imgurl) {
            const isImage = imgurl.match(/\.(jpeg|jpg|png|gif)$/i);
            if (isImage) {
                retval = `<a href="#" onclick="ShowImageMob('${imgurl}')"><img class="image1" src="${imgurl}" alt=""></a>`;
            }
            else {
                retval = `<a href="#" onclick="ShowImageMob('${imgurl}')" class="fa fa-play-circle fa-2x" style="color: #0077b5;"></a>`;
            }
        }
        let currentstatus = op.job_status;
        let tt = '';
        if ((op.issued_to_team === UserCurrentTeamId) && UserRoles.includes('MANAGER')) {
            tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${op.jobId}','${op.propId}','${op.areaId}','${op.assigned_supervisor}')">${currentstatus}</a>`
        }
        else if (op.assigned_supervisor === userEmail) {
            tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${op.jobId}','${op.propId}','${op.areaId}','${op.assigned_supervisor}')">${currentstatus}</a>`
        }
        else if (UserRoles.includes('ADMIN')) {
            tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${op.jobId}','${op.propId}','${op.areaId}','${op.assigned_supervisor}')">${currentstatus}</a>`
        }
        else {
            tt = `<span>${currentstatus}</span>`
        }
        let assignDept = op.issued_by_team_name != op.issued_to_team_name ? "NA" : (op.assigned_dept_name !== null ? op.assigned_dept_name : op.assigned_dept_main);
        let assignName = op.assigned_supervisor ? op.assigned_supervisor_first_name + " " + op.assigned_supervisor_last_name : "NA";
        let onclickAssign = op.issued_to_team === UserCurrentTeamId ? `onclick="GetTeamMember('${op.propId}','${op.issued_by_team_name === op.issued_to_team_name ? op.assigned_dept : op.issued_to_team}','${op.jobId}')"` : "";
        htm += `<div class="accordion-item1">
                    <button class="accordion-btn1" onclick="toggleAccordion(this)">
                        <div class="moretitle">View More
                            <span class="plus">+</span>
                            <span class="minus" style="display: none;">-</span>
                        </div>
                        <div class="morecont">
                            <div class="cont1">
                              <div class="col-4">Job Details:</div>
                              <div class="col-8">${op.job_detail}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Area:</div>
                              <div class="col-8">${op.area_name}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Sub-Area:</div>
                              <div class="col-8">${op.subarea}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Issued To:</div>
                              <div class="col-8">${op.issued_to_team_name}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Assign Sub-Dept:</div>
                              <div class="col-8">${assignDept}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Assign Name:</div>
                              <div class="col-8"><a href="#" ${onclickAssign}><span>${assignName}</span></a></div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Photo Before:</div>
                              <div class="col-8">${retval}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Status:</div>
                                <div class="col-8">${tt}</div>
                            </div>
                          </div>
                    </button>
                    <div class="accordion-content1">
                        <div class="morecont">
                            <div class="cont1">
                              <div class="col-4">Issued By:</div>
                              <div class="col-8">${op.issued_by_team_details}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Open Date/Time:</div>
                              <div class="col-8">${formatDateString(op.openDate)}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Photo After:</div>
                              <div class="col-8"><img class="image1" src="../mainapp/assets/img/gallery-default.png" alt=""></div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Remark:</div>
                              <div class="col-8">${op.job_remark ? op.job_remark : "NA"}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-12 d-grid"><button class="btn btn-linkedin btn-sm" onclick="ConfirmationDialog('${op.propId}','${op.jobId}')">Move To Task Master</button></div>
                            </div>
                          </div>
                    </div>
                </div>`;
    });
    return htm;
}

function PopulateOpenJobCards() {
    $('#open-card-view').html(buildOpenJobHtml(OpenJobs));
    if ($.fn.DataTable.isDataTable('#openjobstable')) {
        $('#openjobstable').DataTable().destroy();
    }
    $('#openjobstable').DataTable({
        data: OpenJobs,
        "columns": [
            {
                data: "propID", name: "Sr.No.",
                render: function (data, type, row, meta) {
                    return meta.row + 1;
                }
            },
            { data: "job_detail", name: "Job Details" },
            { data: "issued_by_team_details", name: "Issued By" },
            { data: "issued_to_team_name", name: "Issued To" },
            { data: "area_name", name: "Area" },
            { data: "subarea", name: "Sub-Area" },
            {
                data: "teamId", name: "Open Date/Time",
                render: function (data, type, row, meta) {
                    var op = row["openDate"];
                    return formatDateString(op);
                }
            },
            {
                data: "teamName", name: "Photo Before",
                render: function (data, type, row, meta) {
                    var op = row["open_uploads"];
                    if(op && op.length>0){
                        var imgurl = op[0].fileurl;
                        const isImage = imgurl.match(/\.(jpeg|jpg|png|gif)$/i);
                        const isVideo = imgurl.match(/\.(mp4|mov)$/i);
                        var retval = `<a href="#" onclick="ShowImagePc('${op[0].fileurl}')"><img class="image1" src="${op[0].fileurl}" alt=""></a>`;
                        if (isImage) {
                            retval = `<a href="#" onclick="ShowImagePc('${op[0].fileurl}')"><img class="image1" src="${op[0].fileurl}" alt=""></a>`;
                        }
                        else {
                            retval = `<a href="#" onclick="ShowImagePc('${op[0].fileurl}')" class="fa fa-play-circle fa-2x" style="color: #0077b5;"></a>`;
                        }
                        return retval;
                    }
                    else{
                        return 'na';
                    }
                }
            },
            {
                data: "propID", name: "Assign Sub-Dept.",
                render: function (data, type, row, meta) {
                    var issued_by_team_name = row["issued_by_team_name"];
                    var issued_to_team_name = row["issued_to_team_name"];
                    var assigned_dept_name = row["assigned_dept_name"];
                    var assigned_dept_main = row["assigned_dept_main"];
                    var assigned_supervisor = row["assigned_supervisor"];
                    var tt = ``
                    if (assigned_dept_name !== null) {
                        tt = assigned_dept_name;
                    }
                    else {
                        if (assigned_dept_name === null && assigned_supervisor === null) {
                            tt = "NA"
                        }
                        else {
                            if (assigned_dept_main !== null) {
                                tt = assigned_dept_main;
                            }
                            else {
                                tt = "NA"
                            }
                        }
                    }
                    return tt;
                }
            },
            {
                data: "propName", name: "Assign Name",
                render: function (data, type, row, meta) {
                    var issued_to_team = row["issued_to_team"];
                    var propId = row["propId"];
                    var issued_by_team_name = row["issued_by_team_name"];
                    var issued_to_team_name = row["issued_to_team_name"];
                    var assigned_dept = row["assigned_dept"];
                    var jobId = row["jobId"];
                    var assigned_supervisor = row["assigned_supervisor"];
                    var assigned_supervisor_first_name = row["assigned_supervisor_first_name"];
                    var assigned_supervisor_last_name = row["assigned_supervisor_last_name"];
                    var tt = `<a href="#" ${issued_to_team === UserCurrentTeamId ? `onclick="GetTeamMember('${propId}','${issued_by_team_name === issued_to_team_name ? assigned_dept : issued_to_team}','${jobId}')"` : ""}><span>${assigned_supervisor ? assigned_supervisor_first_name + " " + assigned_supervisor_last_name : "NA"}</span></a>`
                    return tt;
                }
            },
            {
                data: "teamId", name: "Photo After",
                render: function (data, type, row, meta) {
                    var tt = ` <div class="upload">
                                <label class="upload-area">
                                <input type="file">
                                <span class="upload-button">
                                    <i class="fas fa-upload"></i>
                                </span>
                                </label>
                             </div>`
                    return tt;
                }
            },
            {
                data: "teamName", name: "Status",
                render: function (data, type, row, meta) {
                    var propId = row["propId"];
                    var jobId = row["jobId"];
                    var areaId = row["areaId"];
                    var currentstatus = row["job_status"];
                    var issued_to_team = row["issued_to_team"];
                    var assigned_supervisor = row["assigned_supervisor"];
                    var tt = ``;
                    if ((issued_to_team === UserCurrentTeamId) && UserRoles.includes('MANAGER')) {
                        tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}','${assigned_supervisor}')">${currentstatus}</a>`
                    }
                    else if
                        (assigned_supervisor === userEmail) {
                        tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}','${assigned_supervisor}')">${currentstatus}</a>`
                    }
                    else if (UserRoles.includes('ADMIN')) {
                        tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}','${assigned_supervisor}')">${currentstatus}</a>`
                    }
                    else {
                        tt = `<span>${currentstatus}</span>`
                    }
                    return tt;
                }
            },
            {
                data: "teamId", name: "Remarks",
                render: function (data, type, row, meta) {
                    var job_remark = row["job_remark"];
                    var tt = `${job_remark ? job_remark : "NA"}`
                    return tt;
                }
            },
            {
                data: "teamName", name: "Action",
                render: function (data, type, row, meta) {
                    var propId = row["propId"];
                    var jobId = row["jobId"];
                    var tt = `<div class="col-12 d-grid"><button class="btn btn-linkedin btn-xs" onclick="ConfirmationDialog('${propId}','${jobId}')">Move To Task Master</button></div>`
                    return tt;
                }
            },
        ],
        columnDefs: [{
            "defaultContent": "-",
            "targets": "_all"
        }],
        "serverSide": false,
        "order": [0, "asc"],
        "processing": true,
        "language": {
            "processing": "Processing...Please wait"
        },
        pageLength: 10,
        dom: 'Bfrtip',
        lengthMenu: [
            [10, 25, 50, 100],
            ['10 rows', '25 rows', '50 rows', '100 rows']
        ],
        buttons: [
            { extend: 'copy', className: 'btn-outline-secondary btn-sm' },
            { extend: 'csv', className: 'btn-outline-secondary btn-sm' },
            { extend: 'excel', className: 'btn-outline-secondary btn-sm' },
            { extend: 'pdf', className: 'btn-outline-secondary btn-sm' },
            { extend: 'print', className: 'btn-outline-secondary btn-sm' },
            { extend: 'pageLength', className: 'btn-outline-secondary btn-sm' }
        ],
        autoWidth: true,
        responsive: true,
        searching: true,
        initComplete: function () {
            this.api()
                .columns([1, 2, 3, 4, 5])
                .every(function () {
                    var column = this;
                    var select = $('<select><option value=""></option></select>')
                        .appendTo($(column.header()))
                        .on('change', function () {
                            var val = $.fn.dataTable.util.escapeRegex($(this).val());
                            column.search(val ? '^' + val + '$' : '', true, false).draw();
                        });
                    column
                        .data()
                        .unique()
                        .sort()
                        .each(function (d, j) {
                            select.append('<option value="' + d + '">' + d + '</option>');
                        });
                    $(column.footer()).empty();
                });
        },
    });
    let div = document.querySelector('div.dt-buttons.btn-group.flex-wrap');
    if (div) {
        div.style.marginBottom = '-45px';
    }
    let divs = document.querySelector('div.dt-search');
    if (divs) {
        divs.style.marginBottom = '5px';
    }
}

function buildCloseJobHtml(jobs) {
    let htm = '';
    jobs.forEach(function (op) {
        let imgurl = op.open_uploads.length > 0 ? op.open_uploads[0].fileurl : '';
        let retval = '';
        if (imgurl) {
            const isImage = imgurl.match(/\.(jpeg|jpg|png|gif)$/i);
            if (isImage) {
                retval = `<a href="#" onclick="ShowImageMob('${imgurl}')"><img class="image1" src="${imgurl}" alt=""></a>`;
            }
            else {
                retval = `<a href="#" onclick="ShowImageMob('${imgurl}')" class="fa fa-play-circle fa-2x" style="color: #0077b5;"></a>`;
            }
        }
        let closedmedia = '';
        if (op.close_uploads && op.close_uploads.length > 0) {
            let cimgurl = op.close_uploads[0].fileurl;
            const isCImage = cimgurl.match(/\.(jpeg|jpg|png|gif)$/i);
            if (isCImage) {
                closedmedia = `<a href="#" onclick="ShowImageMob('${cimgurl}')"><img class="image1" src="${cimgurl}" alt=""></a>`;
            }
            else {
                closedmedia = `<a href="#" onclick="ShowImageMob('${cimgurl}')" class="fa fa-play-circle fa-2x" style="color: #0077b5;"></a>`;
            }
        }
        let currentstatus = op.job_status;
        let assignDept = op.issued_by_team_name != op.issued_to_team_name ? "NA" : (op.assigned_dept_name !== null ? op.assigned_dept_name : op.assigned_dept_main);
        let assignName = op.assigned_supervisor ? op.assigned_supervisor_first_name + " " + op.assigned_supervisor_last_name : "NA";
        htm += `<div class="accordion-item1">
                    <button class="accordion-btn1" onclick="toggleAccordion(this)">
                        <div class="moretitle">View More
                            <span class="plus">+</span>
                            <span class="minus" style="display: none;">-</span>
                        </div>
                        <div class="morecont">
                            <div class="cont1">
                              <div class="col-4">Job Details:</div>
                              <div class="col-8">${op.job_detail}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Area:</div>
                              <div class="col-8">${op.area_name}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Sub-Area:</div>
                              <div class="col-8">${op.subarea}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Issued To:</div>
                              <div class="col-8">${op.issued_to_team_name}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Assign Sub-Dept:</div>
                              <div class="col-8">${assignDept}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Assign Name:</div>
                              <div class="col-8">${assignName}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Photo Before:</div>
                              <div class="col-8">${retval}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Status:</div>
                              <div class="col-8"><a href="#">${currentstatus}</a></div>
                            </div>
                          </div>
                    </button>
                    <div class="accordion-content1">
                        <div class="morecont">
                            <div class="cont1">
                              <div class="col-4">Issued By:</div>
                              <div class="col-8">${op.issued_by_team_details}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Open Date/Time:</div>
                              <div class="col-8">${formatDateString(op.openDate)}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Photo After:</div>
                             <div class="col-8">${closedmedia}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Remark:</div>
                              <div class="col-8">${op.job_remark ? op.job_remark : "NA"}</div>
                            </div>
                          </div>
                    </div>
                </div>`;
    });
    return htm;
}

function PopulateCloseJobCards() {
    $('#close-card-view').html(buildCloseJobHtml(CloseJobs));
    if ($.fn.DataTable.isDataTable('#closejobstable')) {
        $('#closejobstable').DataTable().destroy();
    }
    $('#closejobstable').DataTable({
        data: CloseJobs,
        "columns": [
            {
                data: "propID", name: "Sr.No.",
                render: function (data, type, row, meta) {
                    return meta.row + 1;
                }
            },
            { data: "job_detail", name: "Job Details" },
            { data: "issued_by_team_details", name: "Issued By" },
            { data: "issued_to_team_name", name: "Issued To" },
            { data: "area_name", name: "Area" },
            { data: "subarea", name: "Sub-Area" },
            {
                data: "teamId", name: "Open Date/Time",
                render: function (data, type, row, meta) {
                    var op = row["openDate"];
                    return formatDateString(op);
                }
            },
            {
                data: "teamName", name: "Photo Before",
                render: function (data, type, row, meta) {
                    var op = row["open_uploads"];
                    if(op && op.length>0){
                        var imgurl = op[0].fileurl;
                        const isImage = imgurl.match(/\.(jpeg|jpg|png|gif)$/i);
                        const isVideo = imgurl.match(/\.(mp4|mov)$/i);
                        var retval = `<a href="#" onclick="ShowImagePc('${op[0].fileurl}')"><img class="image1" src="${op[0].fileurl}" alt=""></a>`;
                        if (isImage) {
                            retval = `<a href="#" onclick="ShowImagePc('${op[0].fileurl}')"><img class="image1" src="${op[0].fileurl}" alt=""></a>`;
                        }
                        else {
                            retval = `<a href="#" onclick="ShowImagePc('${op[0].fileurl}')" class="fa fa-play-circle fa-2x" style="color: #0077b5;"></a>`;
                        }
                        return retval;
                    }
                   else{
                    return 'NA'
                   }
                }
            },
            {
                data: "teamId", name: "Photo After",
                render: function (data, type, row, meta) {
                    var op = row["close_uploads"];
                    if(op && op.length>0){
                        var imgurl = op[0].fileurl;
                        const isImage = imgurl.match(/\.(jpeg|jpg|png|gif)$/i);
                        const isVideo = imgurl.match(/\.(mp4|mov)$/i);
                        var retval = `<a href="#" onclick="ShowImagePc('${op[0].fileurl}')"><img class="image1" src="${op[0].fileurl}" alt=""></a>`;
                        if (isImage) {
                            retval = `<a href="#" onclick="ShowImagePc('${op[0].fileurl}')"><img class="image1" src="${op[0].fileurl}" alt=""></a>`;
                        }
                        else {
                            retval = `<a href="#" onclick="ShowImagePc('${op[0].fileurl}')" class="fa fa-play-circle fa-2x" style="color: #0077b5;"></a>`;
                        }
                        return retval;
                }
                 else{
                    return 'NA'
                 }
                 
                }
            },
            {
                data: "propID", name: "Closed By",
                render: function (data, type, row, meta) {
                    var assigned_supervisor_first_name = row["assigned_supervisor_first_name"];
                    var assigned_supervisor_last_name = row["assigned_supervisor_last_name"];
                    var tt = `${assigned_supervisor_first_name} ${assigned_supervisor_last_name}`
                    return tt;
                }
            },
            {
                data: "propName", name: "Closed Date/Time",
                render: function (data, type, row, meta) {
                    var op = row["closeDate"];
                    return formatDateString(op);
                }
            },
            {
                data: "teamName", name: "Status",
                render: function (data, type, row, meta) {
                    var propId = row["propId"];
                    var jobId = row["jobId"];
                    var areaId = row["areaId"];
                    var currentstatus = row["job_status"];
                    var issued_to_team = row["issued_to_team"];
                    var assigned_supervisor = row["assigned_supervisor"];
                    if (UserRoles.includes('ADMIN')) {
                        var currentstatus = row["job_status"];;
                        var tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}')">${currentstatus}</a>`
                        return tt;
                    }
                    else {
                        var currentstatus = row["job_status"];;
                        var tt = `${currentstatus}`
                        return tt;
                    }
                }
            },
            {
                data: "teamId", name: "Remarks",
                render: function (data, type, row, meta) {
                    var job_remark = row["job_remark"];
                    var tt = `${job_remark ? job_remark : "NA"}`
                    return tt;
                }
            },
        ],
        columnDefs: [{
            "defaultContent": "-",
            "targets": "_all"
        }],
        "serverSide": false,
        "order": [0, "asc"],
        "processing": true,
        "language": {
            "processing": "Processing...Please wait"
        },
        pageLength: 10,
        dom: 'Bfrtip',
        lengthMenu: [
            [10, 25, 50, 100],
            ['10 rows', '25 rows', '50 rows', '100 rows']
        ],
        buttons: [
            { extend: 'copy', className: 'btn-outline-secondary btn-sm' },
            { extend: 'csv', className: 'btn-outline-secondary btn-sm' },
            { extend: 'excel', className: 'btn-outline-secondary btn-sm' },
            { extend: 'pdf', className: 'btn-outline-secondary btn-sm' },
            { extend: 'print', className: 'btn-outline-secondary btn-sm' },
            { extend: 'pageLength', className: 'btn-outline-secondary btn-sm' }
        ],
        autoWidth: true,
        responsive: true,
        searching: true,
        initComplete: function () {
            this.api()
                .columns([1, 2, 3, 4, 5])
                .every(function () {
                    var column = this;
                    var select = $('<select><option value=""></option></select>')
                        .appendTo($(column.header()))
                        .on('change', function () {
                            var val = $.fn.dataTable.util.escapeRegex($(this).val());
                            column.search(val ? '^' + val + '$' : '', true, false).draw();
                        });
                    column
                        .data()
                        .unique()
                        .sort()
                        .each(function (d, j) {
                            select.append('<option value="' + d + '">' + d + '</option>');
                        });
                    $(column.footer()).empty();
                });
        },
    });
    let div = document.querySelector('div.dt-buttons.btn-group.flex-wrap');
    if (div) {
        div.style.marginBottom = '-45px';
    }
    let divs = document.querySelector('div.dt-search');
    if (divs) {
        divs.style.marginBottom = '5px';
    }
}

function ShowImageMob(imgurl) {
    const isImage = imgurl.match(/\.(jpeg|jpg|png|gif)$/i);
    const isVideo = imgurl.match(/\.(mp4|mov)$/i);
    let htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-sm modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bgimg2">
                    <h5 class="modal-title" id="exampleModalLabel2">Job Media</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="card card-body p-2">`;
    if (isImage) {
        htm += `<img src="${imgurl}" alt="" style="height: 45vh; width: 100%;">`;
    } else if (isVideo) {
        const videoType = imgurl.endsWith('.mp4') ? 'video/mp4' : 'video/quicktime';
        htm += `<video controls autoplay muted style="height: 45vh; width: 100%;">
                    <source src="${imgurl}" type="${videoType}">
                    Your browser does not support the video tag.
                </video>`;
    } else {
        htm += `<p>Unsupported media type.</p>`;
    }
    htm += ` </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    $('#modelHolder').html(htm);
    ShowPopupModal('resetDataModel');
}

function ShowImagePc(mediaUrl) {
    const isImage = mediaUrl.match(/\.(jpeg|jpg|png|gif)$/i);
    const isVideo = mediaUrl.match(/\.(mp4|mov)$/i);
    let htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bgimg2">
                    <h5 class="modal-title" id="exampleModalLabel2">Job Media</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="card card-body p-2">`;
    if (isImage) {
        htm += `<img src="${mediaUrl}" alt="" style="height: 45vh; width: 100%;">`;
    } else if (isVideo) {
        const videoType = mediaUrl.endsWith('.mp4') ? 'video/mp4' : 'video/quicktime';
        htm += `<video controls autoplay muted style="height: 45vh; width: 100%;">
                    <source src="${mediaUrl}" type="${videoType}">
                    Your browser does not support the video tag.
                </video>`;
    } else {
        htm += `<p>Unsupported media type.</p>`;
    }
    htm += ` </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    $('#modelHolder').html(htm);
    $('#resetDataModel').modal('show');
}

function ChangeJobStatus(currentstatus, jobid, propid, areaid, assignedSupervisor) {
    var status = ``;
    if (assignedSupervisor === "null" || assignedSupervisor === undefined || assignedSupervisor === '') {
        status += `<option value="Open" ${currentstatus === "Open" ? "selected" : ""}>Open</option>`;
    }
    else {
        status += `<option value="Assigned" ${currentstatus === "Assigned" ? "selected" : ""}>Assigned</option>`;
        status += `<option value="In-Progress" ${currentstatus === "In-Progress" ? "selected" : ""}>In-Progress</option>`;
        status += `<option value="Closed" ${currentstatus === "Closed" ? "selected" : ""}>Closed</option>`;
    }
    var selt2 = `<select id="job-status-sector" class=" form-select " oninput="JobStatusChange()">${status}</select>`
   
    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Job Status</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
            <div class="card card-body p-2">
               <div>
                ${selt2}
               </div>
               <div id="div-close-job-status" >
                <div class="py-1">
                 <div>
                    <textarea id="close-job-remark" class="form-control" rows="5" placeholder="Enter Remarks"></textarea>
                 </div>
                    <div class="py-1">
                        <input type="file" id="close-job-photo" accept=".jpeg, .jpg, .mp4, .mov" class="form-control">
                    </div>
                </div>
               
               </div>
            </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm" id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`
    $('#modelHolder').html(htm);
    JobStatusChange();
    ShowPopupModal('resetDataModel');

    function SaveJobDetail() {
        var new_status = $('#job-status-sector').val();
        var close_job_remark = $('#close-job-remark').val();
        var fileInput = document.getElementById('close-job-photo');
        if (new_status !== 'Closed') {
            doChangeJobStatus(new_status, close_job_remark, false, jobid, propid, areaid);
            return;
        }
        if (close_job_remark === '') {
            var userdata = `<p>Please enter closing remarks</p>`
            SuccessMessageCustom('Job Status', userdata, 'error');
            return;
        }
        var hasPhoto = fileInput.files.length > 0;
        if (hasPhoto) {
            const validTypes = ['image/jpeg', 'video/mp4', 'video/quicktime'];
            const maxSize = 5 * 1024 * 1024; // 5 MB
            let isValid = true;
            for (let i = 0; i < fileInput.files.length; i++) {
                const file = fileInput.files[i];
                if (!validTypes.includes(file.type) || file.size > maxSize) {
                    isValid = false;
                    break;
                }
            }
            if (!isValid) {
                var userdata = `<p>Invalid file type or size exceeds 5 MB. Please upload JPEG, MP4, or MOV files only.</p>`;
                SuccessMessageCustom('Job Status', userdata, 'error');
                return;
            }
            doChangeJobStatus(new_status, close_job_remark, true, jobid, propid, areaid);
        } else {
            Swal.fire({
                title: "<h4>Do you want to continue without job image?</h4>",
                showDenyButton: true,
                showCancelButton: false,
                confirmButtonText: "Save",
                denyButtonText: `Don't save`,
                customClass: {
                    confirmButton: 'btn btn-label-linkedin',
                    denyButton: 'btn btn-label-danger',
                    cancelButton: 'btn custom-cancel-button'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    doChangeJobStatus(new_status, close_job_remark, false, jobid, propid, areaid);
                } else if (result.isDenied) {
                    Swal.fire("Changes are not saved", "", "info");
                }
            });
        }
    }

    function doChangeJobStatus(new_status, close_job_remark, hasPhoto, jobid, propid, areaid) {
        var form = new FormData();
        form.append("jobID", jobid);
        form.append("propId", propid);
        form.append("areaID", areaid);
        form.append("status", new_status);
        form.append("remarks", new_status === 'Closed' ? close_job_remark : '');
        if (hasPhoto) {
            for (let i = 0; i < fileInput.files.length; i++) {
                form.append("jobImages", fileInput.files[i]);
            }
        }
        var ep = applicationdomain + 'api/dailyjob/changejobstatus';
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
                if (Response === true) {
                    HidePopupModal('resetDataModel');
                    var userdata = `Status modified successfully`
                    ConfirmationDialog2('Job Status', userdata, 'success')
                }
                else {
                    var userdata = `<p>Failed to modify job status</p>`
                    SuccessMessageCustom('Job Status', userdata, 'error')
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

    $('#save-changes-button').on('click', SaveJobDetail);
}

function ConfirmationDialog2(data1, data2, data3) {
    Swal.fire({
        title: data1,
        text: data2,
        showDenyButton: false,
        showCancelButton: false,
        confirmButtonText: "Ok",
        denyButtonText: `Don't save`
    }).then((result) => {
        if (result.isConfirmed) {
            location.reload();
        }
    });
}

function JobStatusChange() {
    var new_status = $('#job-status-sector').val();
    if (new_status === 'Closed') {
        $('#div-close-job-status').show();
    }
    else {
        $('#div-close-job-status').hide();
        $('#close-job-remark').val('');
        $('#close-job-photo').val('')
    }
}

function GetAllOpenJobsCount(propid) {
    var form = new FormData();
    form.append("propId", propid);
    form.append("status", 'Open');
    var ep = applicationdomain + 'api/dailyjob/getnonclosedjobs';
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
            var OpenJobsCount = Response.length;
            $('#openjobscount').text(OpenJobsCount);
            $('#top-notification-bell').html(`<span class="badge bg-danger rounded-pill badge-notifications">${OpenJobsCount}</span>`);
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

function ApplyCurrentDateTime() {
    $('#CurrentDateTime').text(getCurrentDatetime())
}

function getCurrentDatetime() {
    var currentDatetime = new Date();
    var day = String(currentDatetime.getDate()).padStart(2, '0');
    var month = String(currentDatetime.getMonth() + 1).padStart(2, '0');
    var year = currentDatetime.getFullYear();
    var hours = currentDatetime.getHours();
    var minutes = String(currentDatetime.getMinutes()).padStart(2, '0');
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    var formattedTime = hours + ':' + minutes + ' ' + ampm;
    var formattedDatetime = day + '/' + month + '/' + year + ', ' + formattedTime;
    return formattedDatetime;
}

function GetTeamMember(propid, teamid, jobid) {
    var form = new FormData();
    form.append("propID", propid);
    form.append("teamID", teamid);
    var ep = applicationdomain + 'api/dailyjob/getpropteam';
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
            if (Response !== null) {
                AssignJobToMemeber(Response, propid, teamid, jobid)
            }
            else {
                var userdata = `<p>Team not found</p>`
                SuccessMessageCustom('Job Teams', userdata, 'error')
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

function AssignJobToMemeber(name_list, propid, teamid, jobid) {
    var teamnames = ``;
    $.each(userSubTeams, function (index, op) {
        teamnames += `<option value="${op.subteamId}">${op.subteamName}</option>`
    });
    var teamlist = ``
    $.each(userSubTeams[0].subteams, function (index, op) {
        teamlist += `<option value="${op.email}">${op.firstName} ${op.lastName}</option>`
    });
    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Assign job to</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
            <div class="mb-2">
                <select id="job-team-sector" class=" form-select" oninput="AssignTeamNameChange()">${teamnames}</select>
            </div>
            <div>
                <select id="job-teamassign-sector" class=" form-select">${teamlist}</select>
            </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm" id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`
    $('#modelHolder').html(htm);
    ShowPopupModal('resetDataModel');
    function AssignTeamMember() {
        var assignedto = $('#job-teamassign-sector').val();
        var assignedteam = $('#job-team-sector').val();
        var form = new FormData();
        form.append("jobId", jobid);
        form.append("propId", propid);
        form.append("teamId", teamid);
        form.append("subteamId", assignedteam);
        form.append("assignedto", assignedto);
        var ep = applicationdomain + 'api/dailyjob/assignteammember';
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
                if (Response === true) {
                    HidePopupModal('resetDataModel');
                    GetAllOpenJobs();
                    GetAllOpenJobsCount(propid);
                    var userdata = `<p>Job assigned successfully</p>`
                    SuccessMessageCustom('Job assignment', userdata, 'success')
                }
                else {
                    var userdata = `<p>Failed to assign job</p>`
                    SuccessMessageCustom('Job assignment', userdata, 'error')
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
    $('#save-changes-button').on('click', AssignTeamMember);
}

function AssignTeamNameChange() {
    var new_status = $('#job-team-sector').val();
    let result = userSubTeams.find(obj => obj.subteamId === new_status);
    var teamlist = ``
    $.each(result.subteams, function (index, op) {
        teamlist += `<option value="${op.email}">${op.firstName} ${op.lastName}</option>`
    });

    
    $('#job-teamassign-sector').html(teamlist);
}

function SearchOpenJobs() {
    var txt = $('#Search').val();
    var searchedList = searchItems(txt, OpenJobs);
    if (searchedList.length > 0) {
        $('#open-card-view').html(buildOpenJobHtml(searchedList));
    }
}

function SearchCloseJobs() {
    var txt = $('#Search').val();
    var searchedList = searchItems(txt, CloseJobs);
    if (searchedList.length > 0) {
        $('#close-card-view').html(buildCloseJobHtml(searchedList));
    }
}

function searchItems(searchText, data) {
    return data.filter(item => {
        return Object.values(item).some(value =>
            value && value.toString().toLowerCase().includes(searchText.toLowerCase())
        );
    });
}

function MoveToTaskMaster(propId, jobId) {
    var form = new FormData();
    form.append("jobId", jobId);
    form.append("propId", propId);
    var ep = applicationdomain + 'api/dailyjob/quickfixtojobtracker';
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
            if (Response === true) {
                GetAllOpenJobs();
                GetAllOpenJobsCount(propId);
                var userdata = `<p>Job moved to Task Master</p>`
                SuccessMessageCustom('Job movement', userdata, 'success')
            }
            else {
                var userdata = `<p>Failed to move to Task Master</p>`
                SuccessMessageCustom('Job movement', userdata, 'error')
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

function ConfirmationDialog(propId, jobId) {
    Swal.fire({
        title: "Do you want to save the changes?",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Save",
        denyButtonText: `Don't save`
    }).then((result) => {
        if (result.isConfirmed) {
            MoveToTaskMaster(propId, jobId)
        } else if (result.isDenied) {
            Swal.fire("Changes are not saved", "", "info");
        }
    });
}

function playMusic() {
    var url = `${applicationdomain}audio/play2.wav`
    const audio = new Audio(url);
    audio.play();
}