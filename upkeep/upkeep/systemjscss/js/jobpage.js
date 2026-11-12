const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var parameterValue = urlParams.get('jobid');
var UserRoles = [];
var JobInfo=null;
var CurrentProperty = '';
var CurrentJob = '';
var ServerRole ='';
window.onload = function () {
    var UserObject = GetStoredUserData();
    if (UserObject != null) {
        $('#UserName_Name').text(UserObject.name);
        CurrentProperty = UserObject.prop;
        UserRoles = UserObject.role;
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            $($.fn.dataTable.tables(true)).css('width', '100%');
            $($.fn.dataTable.tables(true)).DataTable().columns.adjust().draw();
        });

        $('.select2').select2({
            width: '100%'
        });

        if (parameterValue === null) {
            LogoutUser();
        }
        else{
            GetJobById(parameterValue)
        }
       
    }
    else {
        LogoutUser();
    }
};

function GetJobById(pid)
{
    blockUI('#section-block');
    var form = new FormData();
    form.append("jobId", pid);

    var ep = applicationdomain + 'api/jobtracker/getjobbyid';
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
           
            if(Response.success===true){
                JobInfo = Response;
                CurrentProperty = Response.jobdata.propId;
                ServerRole = Response.role;
                console.log(ServerRole)
                
                if(ServerRole!=='ADMIN' && ServerRole!=='MANAGER')
                {
                    $('#user-controls').html('');
                }




                if(Response.jobdata.isActive===true)
                {
                    $('#jbt-jobid-name').removeClass('text-bg-success');
                    $('#jbt-jobid-name').addClass('text-bg-danger');
                    $('#jbt_active').prop("checked", false);
                }
                else{
                    $('#jbt-jobid-name').removeClass('text-bg-danger');
                    $('#jbt-jobid-name').addClass('text-bg-success');
                    $('#jbt_active').prop("checked", true);
                    $('#user-controls').html('');
                    $('#comment-new-box').html('');
                }


                if(Response.jobdata.villaNumber.trim().length!==0){
                    $('#div-area-values').html(`
                            <div><span id="jbt-arae-name" class="text-uppercase"></span></div>
                            <hr class="my-1">
                            <div><span id="jbt-villa-name" class="text-uppercase"></span></div>`);

                    $('#div-area-detail').html(`
                    <div><span>Area</span></div>
                    <hr class="my-1">
                    <div><span>Villa Number</span></div>
                    `)    

                    $('#jbt-arae-name').text(Response.jobdata.areaName);
                    $('#jbt-villa-name').text(Response.jobdata.villaNumber);
                }
                else{
                    $('#div-area-values').html(`
                    <div>
                        <span id="jbt-arae-name" class="text-uppercase"></span>
                    </div>
                    `);

                    $('#div-area-detail').html(`<div><span>Area</span></div>`)    

                    $('#jbt-arae-name').text(Response.jobdata.areaName);
                }


                $('#jbt-prop1-name').text(`[` + Response.jobdata.propName + `]`);
                $('#jbt-jobid-name').text(Response.jobdata.jobId);
                $('#jbt-prop-name').text(Response.jobdata.propName);
                $('#jbt-arae1-name').text(Response.jobdata.areaName);
                $('#jbt-priority-name').text(Response.jobdata.priority);
                if(Response.jobdata.priority==='SAFETY'){
                    $('#jbt-priority-name').addClass('text-bg-danger')
                }
                else{
                    $('#jbt-priority-name').addClass('text-bg-secondary')
                }

                $('#jbt-status-name').text(Response.jobdata.jobStatus);
                $('#jbt-location-name').text(Response.jobdata.jobLocation);
                $('#jbt-team-name').html(CreateSalesTeamFormatting(Response.jobdata.teams));

                $('#jbt-createdate-name').text(formatDateString(Response.jobdata.jobCreatedOn));
                $('#jbt-refnum-name').text(Response.jobdata.refNum);
                $('#jbt-budget-name').text(Response.jobdata.budget);
                $('#jbt-finalexpense-name').text(Response.jobdata.finalExp);
                if(Response.jobdata.jobCloseOn!==null)
                {
                    $('#jbt-jobcloseddate-name').text(formatDateString(Response.jobdata.jobCloseOn));
                    $('#jbt-jobclosedby-name').text(Response.jobdata.jobCloseBy);
                }
                else{
                    $('#jbt-jobcloseddate-name').text('NA');
                    $('#jbt-jobclosedby-name').text('NA');
                }

                $('#job-detail-pane').text(Response.jobdata.jobDetail);
                if(Response.jobdata.uploads.length>0){
                    $('#job-detail-image').html(PopulateImages(Response.jobdata.uploads))
                }
                if(Response.jobdata.comments.length>0){
                    $('#comment-break-line').html(`<hr class="my-4 mx-n4"> <ul class="timeline" id="comment-ul-timeline"></ul>`)
                    PopulateComments(Response.jobdata.comments)
                }





            }
            else{
                LogoutUser();
            }

            unblockUI('#section-block');  
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
function PopulateComments(comments){
    var htmlli = '';
    $.each(comments, function(index, coms) {
        htmlli += `     <li class="timeline-item timeline-item-transparent">
                            <span class="timeline-point timeline-point-primary"></span>
                            <div class="timeline-event">
                            <div class="timeline-header mb-1">

                                <div class="d-flex flex-wrap">
                                <div class="avatar me-3">
                                    <img src="mainapp/assets/img/avatars/3.png" alt="Avatar" class="rounded-circle">
                                </div>
                                <div class="align-content-center">
                                    <h6 class="mb-0">${coms.firstName} ${coms.lastName}</h6>
                                </div>
                            </div>

                                <small class="text-muted">${formatDateString(coms.commentDate)}</small>
                            </div>
                            <p class="mb-2">${coms.commentDetail}</p>
                                ${PopulateImages(coms.uploads)}
                           
                            </div>
                        </li>`;
    });

    htmlli+=` <li class="timeline-end-indicator">
    <i class="bx bx-check-circle"></i>
  </li>`;
    $('#comment-ul-timeline').html(htmlli)
}

function PopulateImages(medias){

    if(medias!==null)
        {
            var oth =``;




            var crr = 1;
            $.each(medias, function(index, med) {

                            
                if(crr==1){
                    oth += `<div class="mx-2">
                                <a target="_blank" href="${med}">
                                    <img class="d-block imgt rounded-3" src="${med}" alt="First slide" onclick="toggleEnlarge(this)">
                                </a>
                            </div>`
                }   
                else{
                    oth += `<div class="mx-2">
                              <a target="_blank" href="${med}">
                                <img class="d-block imgt rounded-3" src="${med}" alt="First slide" onclick="toggleEnlarge(this)">
                                </a>  
                            </div>`
                }    
                


                crr++;    
            });


            var other = `<div class="my-3">
                        <div class="d-flex">
                            ${oth}
                        </div>
                    </div>`

            return other;
    }
    else{
        return ``;
    }
}


function toggleEnlarge(img) {
    img.classList.toggle("enlarged");
}

function AddComment()
{
    var message = $('#basic-default-message').val();
    var fileInput = document.getElementById('commentImage');
    var form = new FormData();
    form.append("jobId", parameterValue);
    form.append("commentDetail", message);
    for (let i = 0; i < fileInput.files.length; i++) {
        form.append("commentMedia", fileInput.files[i]);
    }

    var ep = applicationdomain + 'api/jobtracker/addcomment';
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
            
            if(Response===true){
                
                $('#basic-default-message').val('')
                $('#commentImage').val('')
                GetJobById(parameterValue)
                var userdata = `<p>Comment added successfully</p>`
                SuccessMessageCustom('New Comment',userdata,'success')
            }
            else{
                var userdata = `<p>Failed to add comment</p>`
                SuccessMessageCustom('New Comment',userdata,'error')
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

function CreateSalesTeamFormatting(lst){
    var htm = ``;
    $.each(lst, function(index, med)
    {
        htm+=`<li class="list-group-item p-1 text-center" style="font-size: small;">${med.firstName} ${med.lastName} [${med.teamName}]</li>`
    });
    return htm;
}



function ShowJobform(){
    datavals = JobInfo.jobdata;
    
    $('#job-prop-name').text("[" + datavals.propName + "]");
    $('#collapsible-area').empty();
    datavals.allareas.forEach(function(area) {
        if(datavals.areaID=== area.areaid){
            $('#collapsible-area').append('<option selected value="' + area.areaid + '">' + area.areaName + '</option>');
        }
        else{
            $('#collapsible-area').append('<option value="' + area.areaid + '">' + area.areaName + '</option>');
        }
    });
    
    $('#collapsible-assigned').empty();
        datavals.allTeams.forEach(function(emp) {
        $('#collapsible-assigned').append('<option value="' + emp.teamId + '">' + emp.manager.firstName + ' ' + emp.manager.lastName +' [' + emp.teamName + ']' + '</option>');
    });
    
    $('#collapsible-villa').val(datavals.villaNumber);
    $('#collapsible-location').val(datavals.jobLocation);
    $('#collapsible-date').val(extractDate(datavals.jobCreatedOn));
    $('#collapsible-budget').val(datavals.budget)
    $('#collapsible-refNumb').val(datavals.refNum)
    $('#collapsible-jd').val(datavals.jobDetail)
    $('#collapsible-expense').val(datavals.finalExp)
    $('#collapsible-priority').val(datavals.priority);
    $('#collapsible-priority').trigger('change');


    datavals.teams.forEach(function(tm){
        $('#collapsible-assigned').val(tm.teamID)
        $('#collapsible-assigned').trigger('change');
    });

    $('#collapsible-status').val(datavals.jobStatus);
    $('#collapsible-status').trigger('change');

    if(ServerRole!=='ADMIN'){
        $('#collapsible-area').prop('disabled', true);
        $('#collapsible-assigned').prop('disabled', true);
        $('#collapsible-villa').prop('disabled', true);
        $('#collapsible-location').prop('disabled', true);
        $('#collapsible-date').prop('disabled', true);
        $('#collapsible-budget').prop('disabled', true);
        $('#collapsible-refNumb').prop('disabled', true);

        $('#collapsible-jd').prop('disabled', true);
        $('#collapsible-expense').prop('disabled', true);
        $('#collapsible-priority').prop('disabled', true);
        $('#jbt_active').prop('disabled', true);
    }



    ShowPopupModal('editJobform');
    $('.jbtclsdd').select2({
        width: '100%',
        dropdownParent: $('#editJobform')
    });
}
function AreaChange()
{
    var areacode = $('#collapsible-area').val();
    var selectedText = $('#collapsible-area').find(':selected').text();
    if(selectedText!==''){
        var odata = selectedText.toUpperCase().trim();
        if(odata === 'GUEST VILLA'){
            $('#collapsible-villa').prop('disabled', false)
        }
        else{
            $('#collapsible-villa').prop('disabled', true)
            $('#collapsible-villa').val('');
        }
    }
    
}


function SubmitEditJob(){
    var propID = CurrentProperty;
    var jobID =parameterValue;
    var area = $('#collapsible-area').val();
    var villaNumber = $('#collapsible-villa').val();
    var priority = $('#collapsible-priority').val();
    var location = $('#collapsible-location').val();
    var creationDate = $('#collapsible-date').val();
    var status = $('#collapsible-status').val();
    var assignedTo = $('#collapsible-assigned').val(); // This will return an array of selected values if 'multiple' attribute is present
    var budget = $('#collapsible-budget').val();
    var expense = $('#collapsible-expense').val();
    var referenceNo = $('#collapsible-refNumb').val(); // This seems to have the same ID as creation date. Ensure correct ID is used.
    var jobDetails = $('#collapsible-jd').val();
    var fileInput = document.getElementById('collapsible-attachment');
    var isActive = 1;
    var checkstatus = $('#jbt_active').is(':checked');
    if(checkstatus===true){
        isActive = 0;
    }

    var error = 0;
    if(area!=='' && priority!=='' && location!=='' && creationDate!=='' && status!=='' && assignedTo.length>0)
    {
        var selectedText = $('#collapsible-area').find(':selected').text().toUpperCase().trim();
        if(selectedText === 'GUEST VILLA' && villaNumber=='')
        {
            error=1;
        }

    }
    else{
        error=1;
    }


    if(error===0){


        var form = new FormData();
        form.append("propID",propID);
        form.append("jobID",jobID);
        form.append("areaID", area);
        form.append("villaNumber", villaNumber);
        form.append("priority", priority);
        form.append("jobLocation", location);
        form.append("jobStatus", status);
        form.append("jobDate", creationDate);
        form.append("refNum", referenceNo);
        form.append("jobDetail", jobDetails);
        form.append("budget", budget);
        form.append("expense", expense);
        form.append("jobActive", isActive);
        assignedTo.forEach((team) => {
            form.append("assignedTo", team);
        });
       


        $("#dialog-Confirm").dialog({
            resizable: false,
            height: "auto",
            width: "auto",
            modal: true,
            position: { my: "center", at: "center", of: window },
            dialogClass: "no-close",
            show: { effect: "pulsate", duration: 100 },
            buttons: [
                {
                    text: 'Yes, proceed!',
                    open: function () { $(this).addClass('yescls') },
                    click: function () {
                        $(this).dialog("close");
    
                        var ep = applicationdomain + 'api/jobtracker/updatejob';
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
                                
                                if(Response===true){
                                    HidePopupModal('editJobform');
                                    GetJobById(parameterValue);
                                    var userdata = `<p>Job edited successfully</p>`
                                    SuccessMessageCustom('Job Edits',userdata,'success')
                                }
                                else{
                                    var userdata = `<p>Failed to edit job</p>`
                                    SuccessMessageCustom('Job Edits',userdata,'error')
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
                },
                {
                    text: "Cancel",
                    open: function () { $(this).addClass('cancelcls') },
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ],
        });

    }
    else{
        NotifyToast('error',"Plase enter all mandatory fields to continue.")
    }


}
