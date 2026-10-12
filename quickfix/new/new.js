var UserCurrentTeamId = null;
var userDesignation = '';
var userTeams = [];
var UserSubTeamInfo = [];
var QuickFixNew = null;
var UserRoles = null;
var allTeams = null;
var AllCurrentProperty = null;
var CurrentProperty = null;
function initializePage(containerId) {
    $(document).ready(function () {
        var UserObject = GetStoredUserData();
        UserRoles = UserObject.role;
        var userdata = $(containerId).data('controlData');      
        QuickFixNew = userdata.controlData;
        renderType = userdata.renderType;
        AllCurrentProperty = QuickFixNew.property;
        CurrentProperty = QuickFixNew.property.propId
        UserCurrentTeamId = QuickFixNew.teamId;
        allTeams = QuickFixNew.allTeams;
        userTeams = QuickFixNew.userTeam;
        UserSubTeamInfo = QuickFixNew.userSubTeamData;
        $('#issued-by-team').val(`${UserObject.name} [${UserObject.desg}: ${getPrimaryTeam(QuickFixNew.userTeam,UserCurrentTeamId)}]`)
        UpdatenewJobFields();
    });
}

function getPrimaryTeam(teams, teamId) {
    // Find the first team with the specified primaryteam
    const team = teams.find(item => item.primaryteam === teamId);
    
    // If a team is found, return its primaryteamname; otherwise, return null
    return team ? team.primaryteamname : null;
}


function UpdatenewJobFields() {

    var teamNames = [];
    var areaNames = [];
    var departments = ``;
    var areas = ``;
    // Using jQuery to iterate over the array and extract team names
    $.each(QuickFixNew.allTeams, function (index, team) {
        teamNames.push({ id: team.teamId, name: team.teamName });
        departments += `<option value="${team.teamId}">${team.teamName}</option>`;
    });

    $.each(QuickFixNew.areas, function (index, area) {
        areaNames.push({ id: area.areaid, name: area.areaName });
        areas += `<option value="${area.areaid}">${area.areaName}</option>`;
    });

    $('#issued-to-team').html(departments)
    $('#issued-to-area').html(areas)
  
    DepartmentChange()
}

function DepartmentChange() {

    var issued_to = $('#issued-to-team').val();
    var issued_by = UserCurrentTeamId;
    //var issued_by = $('#issued-by-team').val();

    var deptRow = document.getElementById('deptAssignRow');
    var supervisorRow = document.getElementById('supervisorAssignRow');

    if (issued_to === issued_by) {
        deptRow.classList.remove('hidden');
        supervisorRow.classList.remove('hidden');
        var teamates = [];
        var currdepartments = ``;
        var currentMembers = ``;
        var ucounter = 0;
        if(UserSubTeamInfo.length>0){
            $('#subteamcount-span').html(``)
            UserSubTeamInfo.forEach(function (member) {
                currdepartments += `<option value="${member.subteamId}">${member.subteamName}</option>`;
                if (ucounter === 0) {
                    member.subteams.forEach(function (xmember) {
                        currentMembers += `<option value="${xmember.email}">${xmember.firstName} ${xmember.lastName}</option>`;
                    });
                }
                ucounter++;
            });
        }
        else{
            $('#subteamcount-span').html(`<span class="text-danger">Job cannot be added as there are no sub teams in this department.</span>`)
        }
        // else{
        //     var primaryteam = findTeamByTeamId(allTeams,issued_by)
        //     currdepartments += `<option value="${primaryteam.teamId}">${primaryteam.teamName}</option>`;
        //     primaryteam.members.forEach(function (member){
        //         currentMembers += `<option value="${member.email}">${member.firstName} ${member.lastName}</option>`;
        //     });
        // }

        $('#TeamAssignRow').html(currdepartments);
        $('#supervisorAssigndto').html(currentMembers);
    }
    else {
        $('#subteamcount-span').html(``)
        deptRow.classList.add('hidden');
        supervisorRow.classList.add('hidden');
    }
}

function findTeamByTeamId(teams, teamId) {
    return teams.find(team => team.teamId === teamId);
}


function SubTeamChange() {
    var newDept = $('#TeamAssignRow').val();
    var NewMembers = ``;
    UserSubTeamInfo.forEach(function (member) {
        if (member.subteamId === newDept) {
            member.subteams.forEach(function (xmember) {
                NewMembers += `<option value="${xmember.email}">${xmember.firstName} ${xmember.lastName}</option>`;
            });
        }
    });
    $('#supervisorAssigndto').html(NewMembers);
}

function SubmitDailyJob() {
    var fileInput = document.getElementById('job-photo');
    if(fileInput.files.length > 0){
        SubmitDailyJobWithPhoto();
    }
    else{
        Swal.fire({
            title: "<h4>Do you want to continue without job image?</h4>",
            showDenyButton: true,
            showCancelButton: false,
            confirmButtonText: "Save",
            denyButtonText: `Don't save`,
            customClass: {
                confirmButton: 'btn btn-label-linkedin', // Custom class for confirm button
                denyButton: 'btn btn-label-danger',       // Custom class for deny button
                cancelButton: 'btn custom-cancel-button'    // Custom class for cancel button
            }
        }).then((result) => {
            /* Read more about isConfirmed, isDenied below */
            if (result.isConfirmed) {
                SubmitDailyJobWithOutPhoto()
            } else if (result.isDenied) {
                Swal.fire("Changes are not saved", "", "info");
            }
        });
    }

}


function SubmitDailyJobWithPhoto() {
    var issued_to = $('#issued-to-team').val();
    var issued_by_detail = $('#issued-by-team').val();
    var area = $('#issued-to-area').val();
    var subarea = $('#Subarea').val();
    var jobdetail = $('#job-details').val();
    var teamassigned = $('#TeamAssignRow').val();
    var supervisorAssigndto = $('#supervisorAssigndto').val();
    var fileInput = document.getElementById('job-photo');
    var error = 0;
    
    if (issued_to !== '' && area !== '' && subarea !== '' && jobdetail !== '' && fileInput.files.length > 0) {

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
            return; // Exit the function
        }

        debugger
        if (issued_to !== UserCurrentTeamId) {
            supervisorAssigndto = null;
            teamassigned = null;
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
        for (let i = 0; i < fileInput.files.length; i++) {
            form.append("jobImages", fileInput.files[i]);
        }
        ShowSpinner();
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
                HideSpinner();
                $('#submit-new-job-btn').attr("disabled", false);
                if (Response.success === true) {                    
                    var control_open = {
                        property : AllCurrentProperty,
                        openjob: Response.jobs.open,
                        teamId:UserCurrentTeamId,
                        allTeams : allTeams,
                        userTeam: userTeams,
                        userSubTeamData : UserSubTeamInfo,
                        areas:Response.jobs.areas
                    };
                    
                    var control_close = {
                        property : AllCurrentProperty,
                        closedjob: Response.jobs.close,
                        teamId:UserCurrentTeamId,
                        allTeams : allTeams,
                        userTeam: userTeams,
                        userSubTeamData : UserSubTeamInfo,
                        areas:Response.jobs.areas
                    };
                    
                    LoadOpneJobControl(control_open);
                    LoadCloseJobControl(control_close);
                   
                    //GetAllOpenJobsCount(CurrentProperty);
                    $('#job-details').val('');
                    $('#Subarea').val('');
                    
                    $('#job-photo').val('');
                    var pc = document.getElementById('preview-container');
                    if (pc) pc.innerHTML = '';
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
    else {
        var userdata = `<p>All fields are Mandatory *</p>`
        SuccessMessageCustom('New Job', userdata, 'error');
        $('#submit-new-job-btn').attr("disabled", false);
    }
}
function SubmitDailyJobWithOutPhoto() {
    var issued_to = $('#issued-to-team').val();
    var issued_by_detail = $('#issued-by-team').val();
    var area = $('#issued-to-area').val();
    var subarea = $('#Subarea').val();
    var jobdetail = $('#job-details').val();
    var teamassigned = $('#TeamAssignRow').val();
    var supervisorAssigndto = $('#supervisorAssigndto').val();
    var fileInput = document.getElementById('job-photo');
    var error = 0;
    if (issued_to !== '' && area !== '' && subarea !== '' && jobdetail !== '') {

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
        
        ShowSpinner();
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
                HideSpinner();
                $('#submit-new-job-btn').attr("disabled", false);
                if (Response.success === true) {
                   
                    var control_open = {
                        property : AllCurrentProperty,
                        openjob: Response.jobs.open,
                        teamId:UserCurrentTeamId,
                        allTeams : allTeams,
                        userTeam: userTeams,
                        userSubTeamData : UserSubTeamInfo,
                        areas:Response.jobs.areas
                    };
                    
                    var control_close = {
                        property : AllCurrentProperty,
                        closedjob: Response.jobs.close,
                        teamId:UserCurrentTeamId,
                        allTeams : allTeams,
                        userTeam: userTeams,
                        userSubTeamData : UserSubTeamInfo,
                        areas:Response.jobs.areas
                    };
                    
                    LoadOpneJobControl(control_open);
                    LoadCloseJobControl(control_close);
            
                    //GetAllOpenJobsCount(CurrentProperty);
                    $('#job-details').val('');
                    $('#Subarea').val('');
                    
                    $('#job-photo').val('');
                    var pc = document.getElementById('preview-container');
                    if (pc) pc.innerHTML = '';
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
    else {
        var userdata = `<p>All fields are Mandatory *</p>`
        SuccessMessageCustom('New Job', userdata, 'error');
        $('#submit-new-job-btn').attr("disabled", false);
    }
}

function previewImage(event) {
    const input = document.getElementById('job-photo');
    if (!input) return;
    const files = Array.from(input.files || []);
    const previewContainer = document.getElementById('preview-container');
    if (!previewContainer) return;
    previewContainer.innerHTML = '';
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/quicktime'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    files.forEach(function (file) {
        if (!validTypes.includes(file.type) || file.size > maxSize) {
            var userdata = `<p>Invalid file type or size exceeds 5 MB. Please upload JPEG, PNG, MP4, or MOV files only.</p>`;
            SuccessMessageCustom('New Job', userdata, 'error');
            return; // skip this file
        }

        const identifier = `${file.name}_${file.size}_${file.lastModified}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-thumb';
        wrapper.style.cssText = 'position:relative;width:150px;height:150px;border-radius:6px;overflow:hidden;border:1px solid #ddd;padding:4px;background:#fff;';

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            img.alt = file.name;
            const reader = new FileReader();
            reader.onload = function (e) {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
            wrapper.appendChild(img);
        } else {
            const videoIcon = document.createElement('div');
            videoIcon.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;font-size:32px;color:#0077b5;';
            videoIcon.innerHTML = '<i class="fas fa-play-circle"></i>';
            wrapper.appendChild(videoIcon);
        }

        const del = document.createElement('button');
        del.type = 'button';
        del.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        del.setAttribute('aria-label', 'Remove file');
        del.title = 'Remove file';
        del.style.cssText = 'position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;line-height:22px;padding:0;display:flex;align-items:center;justify-content:center;';
        del.dataset.identifier = identifier;
        del.addEventListener('click', function () {
            removeFileByIdentifier(identifier);
        });
        wrapper.appendChild(del);

        previewContainer.appendChild(wrapper);
    });
}

function removeFileByIdentifier(identifier) {
    const input = document.getElementById('job-photo');
    if (!input) return;
    const dt = new DataTransfer();
    Array.from(input.files || []).forEach(function (file) {
        const id = `${file.name}_${file.size}_${file.lastModified}`;
        if (id !== identifier) {
            dt.items.add(file);
        }
    });
    input.files = dt.files;
    // Re-render previews
    previewImage();
}