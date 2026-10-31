const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var parameterValue = urlParams.get('jobid');
var UserRoles = [];
var UserAccess = [];
var JobInfo = null;
var CurrentProperty = '';
var CurrentJob = '';
var ServerRole = '';



window.onload = function () {
    var UserObject = GetStoredUserData();
    if (UserObject != null) {
        $('#UserName_Name').text(UserObject.name);
        CurrentProperty = UserObject.prop;
        UserRoles = UserObject.role;
        UserAccess = UserObject.access;

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
        else {
            GetJobById(parameterValue)
        }

    }
    else {
        LogoutUser();
    }
};

function GetJobById(pid) {
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

            if (Response.success === true) {
                JobInfo = Response;
                CurrentProperty = Response.jobdata.propId;
                ServerRole = Response.role;
                console.log(JobInfo)

                if(Response.jobdata.propImg.length>0){
                    var htm = `<div style="background-image: url(${Response.jobdata.propImg[0]});
                    height: 400px;
                    background-repeat: no-repeat;
                    background-position: center;
                    background-size: cover;
                    ">`;
                    $('#prop-img-banner').html(htm)
                }



                $('#jbt-arae1-name').text(Response.jobdata.areaName);
                $('#jbt-prop-name').val(Response.jobdata.propName);
                $('#jbt-prop1-name').text(`[` + Response.jobdata.propName + `]`);
                
                if (Response.jobdata.isActive === true) {
                    $('#jbt-jobid-name').removeClass('text-bg-success');
                    $('#jbt-jobid-name').addClass('text-bg-danger');
                    $('#jbt-jobid-name').text(Response.jobdata.orgjobId);
                    $('#jobclosedate-row-div').html('');
                    $('#jobcloseby-row-div').html('');
                }
                else {
                    $('#jbt-jobid-name').removeClass('text-bg-success');
                    $('#jbt-jobid-name').addClass('text-bg-danger');
                    $('#jbt-jobid-name').text(Response.jobdata.orgjobId);
                    $('#user-controls').html('');
                    $('#comment-new-box').html('');
                    $('#main-user-controls').html('');

                    $('#jobclosedate-row-div').html(`<div class="col-5"><span>Job Closed On</span></div>
                    <div class="col-7">
                      <input class="form-control" type="date" id="html5-date-input" readonly value="${extractDate(Response.jobdata.jobCloseOn)}">
                      <span id="jbt-jobcloseddate-name" class="text-uppercase"></span></div>
                    <hr class="my-3">`);

                    $('#jobcloseby-row-div').html(`<div class="col-5"><span>Job Closed By</span></div>
                                                    <div class="col-7"><input type="text" class="form-control" placeholder="Closed By" readonly value="${Response.jobdata.jobCloseBy}">
                                                </div>
                    <hr class="my-3">`);
                }







                /* Location */
                if ((ServerRole == 'ADMIN' || ServerRole == 'SUPERADMIN') && Response.jobdata.isActive === true) {
                    var htm = ` <div class="input-group">
                                    <input readonly type="text" id="jbt-location-name" class="form-control" placeholder="Location" aria-describedby="button-location-edit" value="${Response.jobdata.jobLocation}">
                                    <button class="btn btn-outline-linkedin" type="button" id="button-location-edit" onclick="EditJobLocation()">Edit</button>
                                </div>`;

                    $('#div-location-holder').html(htm);

                    var htm2 = `<div class="input-group">
                                <input readonly type="text" id="jbt-refnum-name" class="form-control" placeholder="Referance Number" aria-describedby="button-referance-edit" value="${Response.jobdata.refNum}">
                                <button class="btn btn-outline-linkedin" type="button" id="button-referance-edit" onclick="EditReferanceNumber()">Edit</button>
                            </div>`;
                    $('#div-refnum-holder').html(htm2);


                    if (Response.jobdata.areaName !== 'Guest Villa') {
                        var htm3 = ` <div class="input-group">
                                        <input readonly type="text" id="jbt-arae-name" class="form-control" placeholder="Area" aria-describedby="button-area-edit" value="${Response.jobdata.areaName}">
                                        <button class="btn btn-outline-linkedin" type="button" id="button-area-edit" onclick="EditJobArea()">Edit</button>
                                    </div>`;

                        $('#div-area-holder').html(htm3);
                    }
                    else {
                        var htm3 = `<div class="input-group">
                                        <input readonly type="text" id="jbt-arae-name" class="form-control" placeholder="Area" aria-describedby="button-area-edit" value="${Response.jobdata.areaName}">
                                        <button class="btn btn-outline-linkedin" type="button" id="button-area-edit" onclick="EditJobArea()">Edit</button>
                                    </div>
                                    <div class="badge bg-label-facebook d-flex p-2" style="margin-top: 8px;">
                                        <div><span>Villa Number:</span></div>
                                        <div><span class="mx-3">${Response.jobdata.villaNumber}</span></div>
                                    </div>`;

                        $('#div-area-holder').html(htm3);
                    }



                    var htm4 = ` <div class="input-group">
                                    <input readonly type="text" class="form-control" placeholder="Budget in $" id="jbt-budget-name" value="${Response.jobdata.budget}">
                                    <button class="btn btn-outline-linkedin" id="button-budget-edit" type="button" onclick="EditBudget()">Edit</button>
                                </div>`;
                    $('#div-budget-holder').html(htm4);


                    var htm5 = ` <div class="input-group">
                                    <input readonly type="text" class="form-control" placeholder="Final Expense" id="jbt-finalexpense-name" value="${Response.jobdata.finalExp}">
                                    <button class="btn btn-outline-linkedin" id="button-finalexpense-edit" type="button" onclick="EditFinalBudget()">Edit</button>
                                </div>`;
                    $('#div-finexp-holder').html(htm5);

                    var htm6 = ` <div class="input-group">
                                    <input readonly type="date" class="form-control" placeholder="Job Create Date" id="jbt-createdate-name" value="${extractDate(Response.jobdata.jobCreatedOn)}">
                                    <button class="btn btn-outline-linkedin" id="button-createdate-edit" type="button" onclick="EditCreateDate()">Edit</button>
                                </div>`;
                    $('#div-createdate-holder').html(htm6);

                    $('#job-detail-pane').text(Response.jobdata.jobDetail);
                    $('#jbt-detail-edit-div').html(`<button class="btn btn-outline-linkedin btn-sm" onclick="EditJobDetail()">Edit</button>`);

                    var htm7 = `<div class="input-group">
                                <div class="form-control form-control-sm d-flex" id="jbt-team-name">${CreateSalesTeamFormatting2(Response.jobdata.teams)}</div>
                                <button class="btn btn-outline-linkedin" id="button-team-edit" type="button" onclick="EditTeam()">Edit</button>
                            </div>`
                    $('#div-assignedto-holder').html(htm7);



                    if (Response.jobdata.ccf !== 'Department Operational Budget') {
                        var htm8 = ` <div class="input-group">
                                        <input readonly type="text" class="form-control" placeholder="Cost Center" id="jbt-ccf-name" value="${Response.jobdata.ccf}">
                                        <button class="btn btn-outline-linkedin" id="button-ccf-edit" type="button" onclick="EditCCF()">Edit</button>
                                    </div>`;
                        $('#div-ccf-holder').html(htm8);
                    }
                    else {
                        var htm8 = ` <div class="input-group">
                                        <input readonly type="text" class="form-control" placeholder="Cost Center" id="jbt-ccf-name" value="${Response.jobdata.ccf}">
                                        <button class="btn btn-outline-linkedin" id="button-ccf-edit" type="button" onclick="EditCCF()">Edit</button>
                                     </div>
                                      <div class="badge bg-label-facebook d-flex p-2" style="margin-top: 8px;">
                                        <div><span>Department:</span></div>
                                        <div><span class="mx-3">${Response.jobdata.ccf_dept}</span></div>
                                      </div>`;
                        $('#div-ccf-holder').html(htm8);
                    }






                }
                else {

                    $('#user-controls').html('');


                    var htm = `<input type="text" id="jbt-location-name" class="form-control" placeholder="Location" readonly value="${Response.jobdata.jobLocation}">`;
                    $('#div-location-holder').html(htm);

                    var htm2 = `<input type="text" id="jbt-refnum-name" class="form-control" placeholder="Location" readonly value="${Response.jobdata.refNum}">`;
                    $('#div-refnum-holder').html(htm2);

                    if (Response.jobdata.areaName !== 'Guest Villa') {
                        var htm3 = `<input type="text" id="jbt-arae-name" class="form-control" placeholder="Location" readonly value="${Response.jobdata.areaName}">`;
                        $('#div-area-holder').html(htm3);
                    }
                    else {
                        var htm3 = `<input type="text" id="jbt-arae-name" class="form-control" placeholder="Location" readonly value="${Response.jobdata.areaName}">
                                    <div class="badge bg-label-facebook d-flex p-2" style="margin-top: 8px;">
                                        <div><span>Villa Number:</span></div>
                                        <div><span class="mx-3">${Response.jobdata.villaNumber}</span></div>
                                    </div>`;
                        $('#div-area-holder').html(htm3);
                    }


                    var htm4 = `<input type="text" id="jbt-budget-name" class="form-control" placeholder="Location" readonly value="${Response.jobdata.budget}">`;
                    $('#div-budget-holder').html(htm4);

                    var htm5 = `<input type="text" id="jbt-finalexpense-name" class="form-control" placeholder="Location" readonly value="${Response.jobdata.finalExp}">`;
                    $('#div-finexp-holder').html(htm5);

                    var htm6 = `<input type="date" id="jbt-createdate-name" class="form-control" placeholder="Location" readonly value="${extractDate(Response.jobdata.jobCreatedOn)}">`;
                    $('#div-createdate-holder').html(htm6);

                    $('#job-detail-pane').text(Response.jobdata.jobDetail);

                    var htm7 = `<div class="input-group">
                                <div class="form-control form-control-sm d-flex" id="jbt-team-name">${CreateSalesTeamFormatting2(Response.jobdata.teams)}</div>
                             </div>`
                    $('#div-assignedto-holder').html(htm7);


                    if (Response.jobdata.ccf !== 'Department Operational Budget') {
                        var htm8 = `<div><input type="text" id="jbt-ccf-name" class="form-control" placeholder="ccf" readonly value="${Response.jobdata.ccf}"></div>`;
                        $('#div-ccf-holder').html(htm8);
                    }
                    else {
                        var htm8 = `<div><input type="text" id="jbt-ccf-name" class="form-control" placeholder="ccf" readonly value="${Response.jobdata.ccf}"></div>
                        <div class="badge bg-label-facebook d-flex p-2" style="margin-top: 8px;">
                            <div><span>Department:</span></div>
                            <div><span class="mx-3">${Response.jobdata.ccf_dept}</span></div>
                        </div>`;
                        $('#div-ccf-holder').html(htm8);
                    }


                }


                /* OWNER COMMENT */
                if ('F02' in UserAccess) {
                    if (UserAccess['F02'].read === false && UserAccess['F02'].write === false) {
                        $('#job-ownercomment-pane-div').html('')
                    }
                    else if (UserAccess['F02'].read === false && UserAccess['F02'].write === true) {
                        $('#job-ownercomment-pane-div').html('')
                    }
                    else if (UserAccess['F02'].read === true && UserAccess['F02'].write === false) {
                        $('#job-ownercomment-pane').html(Response.jobdata.owner_comment);
                    }
                    else if (UserAccess['F02'].read === true && UserAccess['F02'].write === true) {

                        var htm = `<button class="btn btn-outline-linkedin btn-sm" id="button-ownercomment-edit" type="button" onclick="EditOwnerComment()">Edit</button>`;

                        if (Response.jobdata.isActive === true) {
                            $('#jbt-ownercomment-edit-div').html(htm)
                        }
                        $('#job-ownercomment-pane').html(Response.jobdata.owner_comment);

                    }
                }
                else {
                    $('#job-ownercomment-pane-div').html('')
                }

                /* Budget */
                if ('F03' in UserAccess) {
                    if (UserAccess['F03'].read === false && UserAccess['F03'].write === false) {
                        $('#budget-row-div').html('')
                        $('#ccf-row-div').html('')
                    }
                    else if (UserAccess['F03'].read === false && UserAccess['F03'].write === true) {
                        $('#budget-row-div').html('')
                        $('#ccf-row-div').html('')
                    }
                    else if (UserAccess['F03'].read === true && UserAccess['F03'].write === false) {
                        var htm4 = `<input type="text" id="jbt-budget-name" class="form-control" placeholder="Location" readonly value="${Response.jobdata.budget}">`;
                        $('#div-budget-holder').html(htm4);

                        var htm41 = `<input type="text" id="jbt-ccf-name" class="form-control" placeholder="Cost Center" readonly value="${Response.jobdata.ccf}">`;
                        $('#div-ccf-holder').html(htm41);

                    }
                    else if (UserAccess['F03'].read === true && UserAccess['F03'].write === true) {


                        if (Response.jobdata.isActive === true) {

                            var htm4 = ` <div class="input-group">
                                        <input readonly type="text" class="form-control" placeholder="Budget in $" id="jbt-budget-name" value="${Response.jobdata.budget}">
                                        <button class="btn btn-outline-linkedin" id="button-budget-edit" type="button" onclick="EditBudget()">Edit</button>
                                    </div>`;
                            $('#div-budget-holder').html(htm4);



                            if (Response.jobdata.ccf !== 'Department Operational Budget') {
                                var htm41 = ` <div class="input-group">
                                    <input readonly type="text" class="form-control" placeholder="Cost Center" id="jbt-ccf-name" value="${Response.jobdata.ccf}">
                                    <button class="btn btn-outline-linkedin" id="button-ccf-edit" type="button" onclick="EditCCF()">Edit</button>
                             </div>`;
                                $('#div-ccf-holder').html(htm41);
                            }
                            else {
                                
                                var htm41 = ` <div class="input-group">
                                            <input readonly type="text" class="form-control" placeholder="Cost Center" id="jbt-ccf-name" value="${Response.jobdata.ccf}">
                                            <button class="btn btn-outline-linkedin" id="button-ccf-edit" type="button" onclick="EditCCF()">Edit</button>
                                         </div>
                                <div class="badge bg-label-facebook d-flex p-2" style="margin-top: 8px;">
                                        <div><span>Department:</span></div>
                                        <div><span class="mx-3">${Response.jobdata.ccf_dept==='undefined'?'':Response.jobdata.ccf_dept}</span></div>
                                      </div>`;
                                $('#div-ccf-holder').html(htm41);
                            }
                        }
                        else {
                            var htm4 = `<input type="text" id="jbt-budget-name" class="form-control" placeholder="Location" readonly value="${Response.jobdata.budget}">`;
                            $('#div-budget-holder').html(htm4);

                            var htm41 = `<input type="text" id="jbt-ccf-name" class="form-control" placeholder="Cost Center" readonly value="${Response.jobdata.ccf}">`;
                            $('#div-ccf-holder').html(htm41);
                        }



                    }
                }
                else {
                    $('#budget-row-div').html('')
                }


                /* STATUS */
                if ('F04' in UserAccess) {
                    if (UserAccess['F04'].read === false && UserAccess['F04'].write === false) {
                        $('#status-row-div').html('')
                        $('#main-user-controls').html('');
                    }
                    else if (UserAccess['F04'].read === false && UserAccess['F04'].write === true) {
                        $('#status-row-div').html('')
                        $('#main-user-controls').html('');
                    }
                    else if (UserAccess['F04'].read === true && UserAccess['F04'].write === false) {
                        var htm = ` <input value="${Response.jobdata.jobStatus}" type="text" id="jbt-status-name" class="form-control" placeholder="Status" readonly>`;
                        $('#div-status-holder').html(htm);
                        $('#main-user-controls').html('');
                    }
                    else if (UserAccess['F04'].read === true && UserAccess['F04'].write === true) {

                        var htm = ` <div class="input-group">
                                        <input readonly value="${Response.jobdata.jobStatus}" type="text" id="jbt-status-name" class="form-control" placeholder="Status"  aria-describedby="button-status-edit">
                                        <button class="btn btn-outline-linkedin" id="button-status-edit" type="button" onclick="EditStatus()">Edit</button>
                                    </div>`;

                        if (Response.jobdata.isActive === false) {
                            htm = ` <div class="input-group">
                                        <input readonly value="${Response.jobdata.jobStatus}" type="text" id="jbt-status-name" class="form-control" placeholder="Status"  aria-describedby="button-status-edit">
                                    </div>`;
                        }
                        else {
                            if (Response.jobdata.jobStatus === 'FIXED') {
                                $('#send-report').html(`<button  class="btn btn-sm btn-secondary" onclick="">Send Report To Manager</button>`)
                            }
                            else {
                                $('#send-report').html(``)
                            }
                        }

                        $('#div-status-holder').html(htm);

                    }
                }
                else {
                    $('#status-row-div').html('')
                }

                /* ASSIGNED TO */
                if ('F05' in UserAccess) {
                    if (UserAccess['F05'].read === false && UserAccess['F05'].write === false) {
                        $('#div-assignedto-holder').html('')
                    }
                    else if (UserAccess['F05'].read === false && UserAccess['F05'].write === true) {
                        $('#div-assignedto-holder').html('')
                    }
                    else if (UserAccess['F05'].read === true && UserAccess['F05'].write === false) {
                        var htm = ` <div class="input-group">
                        <div class="form-control form-control-sm d-flex" id="jbt-team-name">${CreateSalesTeamFormatting2(Response.jobdata.teams)}</div>
                    </div>`;
                        $('#div-assignedto-holder').html(htm);
                    }
                    else if (UserAccess['F05'].read === true && UserAccess['F05'].write === true) {

                        var htm = ` <div class="input-group">
                                    <div class="form-control form-control-sm d-flex" id="jbt-team-name">${CreateSalesTeamFormatting2(Response.jobdata.teams)}</div>
                                    <button class="btn btn-outline-linkedin" id="button-team-edit" type="button" onclick="EditTeam()">Edit</button>
                                </div>`;

                        if (Response.jobdata.isActive === false) {
                            htm = ` <div class="input-group">
                                        <div class="form-control form-control-sm d-flex" id="jbt-team-name">${CreateSalesTeamFormatting2(Response.jobdata.teams)}</div>
                                    </div>`;
                        }

                        $('#div-assignedto-holder').html(htm);

                    }
                }
                else {
                    $('#div-assignedto-holder').html('')
                }




                /* PRIORITY */
                if ('F06' in UserAccess) {
                    if (UserAccess['F06'].read === false && UserAccess['F06'].write === false) {
                        $('#priority-row-div').html('')
                    }
                    else if (UserAccess['F06'].read === false && UserAccess['F06'].write === true) {
                        $('#priority-row-div').html('')
                    }
                    else if (UserAccess['F06'].read === true && UserAccess['F06'].write === false) {
                        var htm = ` <input value="${Response.jobdata.priority}" type="text" id="jbt-priority-name" class="form-control" placeholder="Priority" readonly>`;
                        $('#div-priority-holder').html(htm);
                    }
                    else if (UserAccess['F06'].read === true && UserAccess['F06'].write === true) {

                        var htm = ` <div class="input-group">
                                        <input readonly value="${Response.jobdata.priority}" type="text" id="jbt-priority-name" class="form-control" placeholder="Priority"  aria-describedby="button-priority-edit">
                                        <button class="btn btn-outline-linkedin" id="button-priority-edit" type="button" onclick="EditPriority()">Edit</button>
                                    </div>`;

                        if (Response.jobdata.isActive === false) {
                            htm = ` <div class="input-group">
                                                <input readonly value="${Response.jobdata.priority}" type="text" id="jbt-priority-name" class="form-control" placeholder="Priority"  aria-describedby="button-priority-edit">
                                        </div>`;
                            $('#send-report').html('')
                        }



                        $('#div-priority-holder').html(htm);




                    }
                }
                else {
                    $('#priority-row-div').html('')
                }


                /* Final Expense */
                if ('F07' in UserAccess) {
                    if (UserAccess['F07'].read === false && UserAccess['F07'].write === false) {
                        $('#finexp-row-div').html('')
                    }
                    else if (UserAccess['F07'].read === false && UserAccess['F07'].write === true) {
                        $('#finexp-row-div').html('')
                    }
                    else if (UserAccess['F07'].read === true && UserAccess['F07'].write === false) {

                        var htm5 = `<input type="text" id="jbt-finalexpense-name" class="form-control" placeholder="Location" readonly value="${Response.jobdata.finalExp}">`;
                        $('#div-finexp-holder').html(htm5);
                    }
                    else if (UserAccess['F07'].read === true && UserAccess['F07'].write === true) {
                        var htm5 = ` <div class="input-group">
                        <input readonly type="text" class="form-control" placeholder="Final Expense" id="jbt-finalexpense-name" value="${Response.jobdata.finalExp}">
                        <button class="btn btn-outline-linkedin" id="button-finalexpense-edit" type="button" onclick="EditFinalBudget()">Edit</button>
                    </div>`;

                        if (Response.jobdata.isActive === false) {
                            htm5 = ` <div class="input-group">
                        <input readonly type="text" class="form-control" placeholder="Final Expense" id="jbt-finalexpense-name" value="${Response.jobdata.finalExp}">
                    </div>`;
                        }


                        $('#div-finexp-holder').html(htm5);
                    }
                }
                else {
                    $('#finexp-row-div').html('')
                }


                if (Response.jobdata.uploads.length > 0) {
                    $('#job-detail-image').html(PopulateImages(Response.jobdata.uploads))
                }

                if (Response.jobdata.comments.length > 0) {
                    $('#comment-break-line').html(`<hr class="my-4 mx-n4"> <ul class="timeline" id="comment-ul-timeline"></ul>`)
                    PopulateComments(Response.jobdata.comments)
                }



            }
            else {
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

function EditJobLocation() {
    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Job Location</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <input type="text" class="form-control" placeholder="Enter New Name" value="${JobInfo.jobdata.jobLocation}"  id="edit-job-loaction-input"/>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm)
    ShowPopupModal('resetDataModel');


    function SaveJobLocation() {
        var newjoblocation = $('#edit-job-loaction-input').val();
        var jobID = JobInfo.jobdata.jobId;
        var propid = JobInfo.jobdata.propId;
        var form = new FormData();
        form.append("propID", propid);
        form.append("jobID", jobID);
        form.append("field", 'JB-LOCATION');
        form.append("data", newjoblocation);
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

                        var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                    GetJobById(parameterValue);
                                    HidePopupModal('resetDataModel');
                                    var userdata = `<p>Job modified successfully</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'success')
                                }
                                else {
                                    var userdata = `<p>Failed to modify job</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'error')
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

    $('#save-changes-button').on('click', SaveJobLocation);
}

function EditBudget() {
    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Budget</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <input type="text" class="form-control" placeholder="Enter New Name" value="${JobInfo.jobdata.budget}"  id="edit-job-loaction-input"/>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm)
    ShowPopupModal('resetDataModel');


    function SaveBudget() {
        var newjoblocation = $('#edit-job-loaction-input').val();
        if (isNumeric(newjoblocation)) {



            var jobID = JobInfo.jobdata.jobId;
            var propid = JobInfo.jobdata.propId;
            var form = new FormData();
            form.append("propID", propid);
            form.append("jobID", jobID);
            form.append("field", 'JB-BUDGET');
            form.append("data", newjoblocation);
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

                            var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                        GetJobById(parameterValue);
                                        HidePopupModal('resetDataModel');
                                        var userdata = `<p>Job modified successfully</p>`
                                        SuccessMessageCustom('Job Modification', userdata, 'success')
                                    }
                                    else {
                                        var userdata = `<p>Failed to modify job</p>`
                                        SuccessMessageCustom('Job Modification', userdata, 'error')
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
        else {
            NotifyToast('error', "Plase enter a numeric value to continue.")
        }

    }

    $('#save-changes-button').on('click', SaveBudget);
}

function EditFinalBudget() {
    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Final Expense</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <input type="text" class="form-control" placeholder="Enter New Name" value="${JobInfo.jobdata.finalExp}"  id="edit-job-loaction-input"/>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm)
    ShowPopupModal('resetDataModel');


    function SaveFinalBudget() {
        var newjoblocation = $('#edit-job-loaction-input').val();
        if (isNumeric(newjoblocation)) {
            var jobID = JobInfo.jobdata.jobId;
            var propid = JobInfo.jobdata.propId;
            var form = new FormData();
            form.append("propID", propid);
            form.append("jobID", jobID);
            form.append("field", 'JB-FINEXP');
            form.append("data", newjoblocation);
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

                            var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                        GetJobById(parameterValue);
                                        HidePopupModal('resetDataModel');
                                        var userdata = `<p>Job modified successfully</p>`
                                        SuccessMessageCustom('Job Modification', userdata, 'success')
                                    }
                                    else {
                                        var userdata = `<p>Failed to modify job</p>`
                                        SuccessMessageCustom('Job Modification', userdata, 'error')
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
        else {
            NotifyToast('error', "Plase enter a numeric value to continue.")
        }
    }

    $('#save-changes-button').on('click', SaveFinalBudget);
}

function EditReferanceNumber() {
    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Ref Number</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <input type="text" class="form-control" placeholder="Enter New Name" value="${JobInfo.jobdata.refNum}"  id="edit-job-loaction-input"/>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm)
    ShowPopupModal('resetDataModel');


    function SaveRefNum() {
        var newjoblocation = $('#edit-job-loaction-input').val();
        var jobID = JobInfo.jobdata.jobId;
        var propid = JobInfo.jobdata.propId;
        var form = new FormData();
        form.append("propID", propid);
        form.append("jobID", jobID);
        form.append("field", 'JB-REFNUM');
        form.append("data", newjoblocation);
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

                        var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                    GetJobById(parameterValue);
                                    HidePopupModal('resetDataModel');
                                    var userdata = `<p>Job modified successfully</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'success')
                                }
                                else {
                                    var userdata = `<p>Failed to modify job</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'error')
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

    $('#save-changes-button').on('click', SaveRefNum);
}

function EditCreateDate() {

    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Job Creation Date</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <input type="date" class="form-control" placeholder="Enter New Name" value="${extractDate(JobInfo.jobdata.jobCreatedOn)}"  id="edit-job-loaction-input"/>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm)
    ShowPopupModal('resetDataModel');


    function SaveCreateDate() {
        var newjoblocation = $('#edit-job-loaction-input').val();
        var jobID = JobInfo.jobdata.jobId;
        var propid = JobInfo.jobdata.propId;
        var form = new FormData();
        form.append("propID", propid);
        form.append("jobID", jobID);
        form.append("field", 'JB-CREATEDATE');
        form.append("data", newjoblocation);
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

                        var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                    GetJobById(parameterValue);
                                    HidePopupModal('resetDataModel');
                                    var userdata = `<p>Job modified successfully</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'success')
                                }
                                else {
                                    var userdata = `<p>Failed to modify job</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'error')
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

    $('#save-changes-button').on('click', SaveCreateDate);
}

function EditPriority() {

    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Priority</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
            <select id="edit-job-priority-input" class="select2 form-select jbtclsdd">
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="SAFETY">Safety</option>
            </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm);
    $('#edit-job-priority-input').val(JobInfo.jobdata.priority);
    $('#edit-job-priority-input').trigger('change');

    ShowPopupModal('resetDataModel');
    $('.jbtclsdd').select2({
        width: '100%',
        dropdownParent: $('#resetDataModel')
    });

    function SavePriority() {
        var newjoblocation = $('#edit-job-priority-input').val();
        var jobID = JobInfo.jobdata.jobId;
        var propid = JobInfo.jobdata.propId;
        var form = new FormData();
        form.append("propID", propid);
        form.append("jobID", jobID);
        form.append("field", 'JB-PRIORITY');
        form.append("data", newjoblocation);
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

                        var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                    GetJobById(parameterValue);
                                    HidePopupModal('resetDataModel');
                                    var userdata = `<p>Job modified successfully</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'success')
                                }
                                else {
                                    var userdata = `<p>Failed to modify job</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'error')
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

    $('#save-changes-button').on('click', SavePriority);
}

function EditStatus() {

    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Status</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
            <select id="edit-job-status-input" class="select2 form-select jbtclsdd">
                <option value="YET_TO_COMMENCE">Yet to Commence</option>
                <option value="IN_PROGRESS">In-Progress</option>
                <option value="SPARES_ON_ORDER">Spares on Order</option>
                <option value="FIXED">Fixed</option>
                <option value="COMPLETED">Completed</option>
                <option value="UNDER_DISCUSSION">Under Discussion</option>
            </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm);
    $('#edit-job-status-input').val(JobInfo.jobdata.jobStatus);
    $('#edit-job-status-input').trigger('change');

    ShowPopupModal('resetDataModel');
    $('.jbtclsdd').select2({
        width: '100%',
        dropdownParent: $('#resetDataModel')
    });

    function SaveJobStatus() {
        var newjoblocation = $('#edit-job-status-input').val();
        var jobID = JobInfo.jobdata.jobId;
        var propid = JobInfo.jobdata.propId;
        var form = new FormData();
        form.append("propID", propid);
        form.append("jobID", jobID);
        form.append("field", 'JB-STATUS');
        form.append("data", newjoblocation);
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

                        var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                    GetJobById(parameterValue);
                                    HidePopupModal('resetDataModel');
                                    var userdata = `<p>Job modified successfully</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'success')
                                }
                                else {
                                    var userdata = `<p>Failed to modify job</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'error')
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

    $('#save-changes-button').on('click', SaveJobStatus);
}

function EditJobArea() {

    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Area</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
            <div><select id="edit-area-input" class="select2 form-select jbtclsdd" oninput="AreaChange()"></select></div>
            <div class="my-2" id="villa-disp-div"><input type="text" class="form-control" placeholder="Villa Number" value="${JobInfo.jobdata.villaNumber}"  id="edit-area2-input"/></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm);

    $('#edit-area-input').empty();
    JobInfo.jobdata.allareas.forEach(function (area) {
        if (JobInfo.jobdata.areaID === area.areaid) {
            $('#edit-area-input').append('<option selected value="' + area.areaid + '">' + area.areaName + '</option>');
        }
        else {
            $('#edit-area-input').append('<option value="' + area.areaid + '">' + area.areaName + '</option>');
        }
    });

    if (JobInfo.jobdata.villaNumber !== '') {
        $('#villa-disp-div').show();
    }
    else {
        $('#villa-disp-div').hide();
    }





    $('#edit-area-input').trigger('change');

    ShowPopupModal('resetDataModel');
    $('.jbtclsdd').select2({
        width: '100%',
        dropdownParent: $('#resetDataModel')
    });

    function SaveArea() {
        var newjoblocation = $('#edit-area-input').val();
        var newjoblocation2 = $('#edit-area2-input').val();
        var selectedText = $('#edit-area-input').find(':selected').text();
        var odata = selectedText.toUpperCase().trim();
        var errors = 0;

        if (odata === 'GUEST VILLA' && newjoblocation2 == '') {
            errors++;
            NotifyToast('error', "Plase enter villa number to continue.")
        }
        else if (odata !== 'GUEST VILLA') {
            newjoblocation2 = '';
        }

        if (errors === 0) {
            var jobID = JobInfo.jobdata.jobId;
            var propid = JobInfo.jobdata.propId;
            var form = new FormData();
            form.append("propID", propid);
            form.append("jobID", jobID);
            form.append("field", 'JB-AREA');
            form.append("data", newjoblocation);
            form.append("data2", newjoblocation2);
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

                            var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                        GetJobById(parameterValue);
                                        HidePopupModal('resetDataModel');
                                        var userdata = `<p>Job modified successfully</p>`
                                        SuccessMessageCustom('Job Modification', userdata, 'success')
                                    }
                                    else {
                                        var userdata = `<p>Failed to modify job</p>`
                                        SuccessMessageCustom('Job Modification', userdata, 'error')
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


    }

    $('#save-changes-button').on('click', SaveArea);
}

function EditJobDetail() {

    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Job Details</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
            <textarea id="edit-job-detail-input" class="form-control" rows="10" placeholder="Enter job details">${JobInfo.jobdata.jobDetail}</textarea>
            <input type="file" class="form-control my-2" placeholder="Select images"  id="edit-job-detail-files" multiple/>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm);
    ShowPopupModal('resetDataModel');


    function SaveJobDetail() {
        var newjobdetail = $('#edit-job-detail-input').val();
        var fileInput = document.getElementById('edit-job-detail-files');

        var jobID = JobInfo.jobdata.jobId;
        var propid = JobInfo.jobdata.propId;
        var form = new FormData();
        form.append("propID", propid);
        form.append("jobID", jobID);
        form.append("field", 'JB-DETAILS');
        form.append("data", newjobdetail);
        for (let i = 0; i < fileInput.files.length; i++) {
            form.append("jobImages", fileInput.files[i]);
        }

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

                        var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                    GetJobById(parameterValue);
                                    HidePopupModal('resetDataModel');
                                    var userdata = `<p>Job modified successfully</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'success')
                                }
                                else {
                                    var userdata = `<p>Failed to modify job</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'error')
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

    $('#save-changes-button').on('click', SaveJobDetail);
}

function EditOwnerComment() {

    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Owner's Comment</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
            <textarea id="edit-owner-comment-input" class="form-control" rows="10" placeholder="Enter job details">${JobInfo.jobdata.owner_comment}</textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm);
    ShowPopupModal('resetDataModel');


    function SaveOwnerComment() {
        var newjobdetail = $('#edit-owner-comment-input').val();
        var jobID = JobInfo.jobdata.jobId;
        var propid = JobInfo.jobdata.propId;
        var areaID = JobInfo.jobdata.areaID;
        var form = new FormData();
        form.append("propID", propid);
        form.append("jobID", jobID);
        form.append("areaID", areaID);
        form.append("field", 'JB-OWNERCOMMENT');
        form.append("data", newjobdetail);

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

                        var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                    GetJobById(parameterValue);
                                    HidePopupModal('resetDataModel');
                                    var userdata = `<p>Job modified successfully</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'success')
                                }
                                else {
                                    var userdata = `<p>Failed to modify job</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'error')
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

    $('#save-changes-button').on('click', SaveOwnerComment);
}

function EditTeam() {

    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Team</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
            <select id="edit-job-team-input" class="select2 form-select jbtclsdd" multiple>
            </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm);

    $('#edit-job-team-input').empty();

    JobInfo.jobdata.allTeams.forEach(function (emp) {
        $('#edit-job-team-input').append('<option value="' + emp.teamId + '">' + emp.manager.firstName + ' ' + emp.manager.lastName + ' [' + emp.teamName + ']' + '</option>');
    });


    var selectedTeams = [];
    JobInfo.jobdata.teams.forEach(function (tm) {
        selectedTeams.push(tm.teamID);
    });
    $('#edit-job-team-input').val(selectedTeams).trigger('change');

    ShowPopupModal('resetDataModel');
    $('.jbtclsdd').select2({
        width: '100%',
        dropdownParent: $('#resetDataModel')
    });

    function SaveTeam() {
        var newjoblocation = $('#edit-job-team-input').val();
        var jobID = JobInfo.jobdata.jobId;
        var propid = JobInfo.jobdata.propId;
        var form = new FormData();
        form.append("propID", propid);
        form.append("jobID", jobID);
        form.append("field", 'JB-TEAMS');
        newjoblocation.forEach((team) => {
            form.append("data", team);
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

                        var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                    GetJobById(parameterValue);
                                    HidePopupModal('resetDataModel');
                                    var userdata = `<p>Job modified successfully</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'success')
                                }
                                else {
                                    var userdata = `<p>Failed to modify job</p>`
                                    SuccessMessageCustom('Job Modification', userdata, 'error')
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

    $('#save-changes-button').on('click', SaveTeam);
}


function EditCCF() {
    var od = JobInfo.jobdata.ccf_dept==='undefined'?'':JobInfo.jobdata.ccf_dept;
    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Cost Center</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
            <div>
            <select id="edit-ccf-input" class="select2 form-select jbtclsdd" oninput="CCFChange()">
                <option value="POMEC">POMEC</option>
                <option value="CAPEX">CAPEX</option>
                <option value="Department Operational Budget">Department Operational Budget</option>
            </select>
            </div>
            <div class="my-2" id="ccf-dept-div">
                <input type="text" class="form-control" placeholder="Department" value="${od}"  id="edit-area2-input"/>
            </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm);
    $('#edit-ccf-input').val(JobInfo.jobdata.ccf);


    if (JobInfo.jobdata.ccf_dept !== '' && JobInfo.jobdata.ccf_dept !== null && JobInfo.jobdata.ccf_dept !== 'undefined') {
        $('#ccf-dept-div').show();
    }
    else {
        $('#ccf-dept-div').hide();
    }

    $('#edit-ccf-input').trigger('change');
    ShowPopupModal('resetDataModel');
    $('.jbtclsdd').select2({
        width: '100%',
        dropdownParent: $('#resetDataModel')
    });

    function SaveCCF() {
        var newjoblocation = $('#edit-ccf-input').val();
        var newjoblocation2 = $('#edit-area2-input').val();
        var selectedText = $('#edit-ccf-input').find(':selected').text();
        var odata = selectedText.trim();
        var errors = 0;


        if (newjoblocation === '' || newjoblocation === null) {
            errors++;
            NotifyToast('error', "Plase select atleast one option to continue.")
        }
        else {




            if (odata === 'Department Operational Budget' && newjoblocation2 == '') {
                errors++;
                NotifyToast('error', "Plase enter department to continue.")
            }
            else if (odata !== 'Department Operational Budget') {
                newjoblocation2 = '';
            }

            if (errors === 0) {
                var jobID = JobInfo.jobdata.jobId;
                var propid = JobInfo.jobdata.propId;
                var form = new FormData();
                form.append("propID", propid);
                form.append("jobID", jobID);
                form.append("field", 'JB-CCF');
                form.append("data", newjoblocation);
                form.append("data2", newjoblocation2);
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

                                var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                            GetJobById(parameterValue);
                                            HidePopupModal('resetDataModel');
                                            var userdata = `<p>Job modified successfully</p>`
                                            SuccessMessageCustom('Job Modification', userdata, 'success')
                                        }
                                        else {
                                            var userdata = `<p>Failed to modify job</p>`
                                            SuccessMessageCustom('Job Modification', userdata, 'error')
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
        }

    }

    $('#save-changes-button').on('click', SaveCCF);
}


function CloseJob() {

    var htm = `<div class="modal fade" id="resetDataModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Close This Job</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
            <textarea id="edit-job-detail-input" class="form-control" rows="10" placeholder="Enter closure comments"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

    $('#modelHolder').html(htm);
    ShowPopupModal('resetDataModel');


    function CloseJobDetail() {
        var newjobdetail = $('#edit-job-detail-input').val();
        debugger

        var jobID = JobInfo.jobdata.jobId;
        var propid = JobInfo.jobdata.propId;
        var form = new FormData();
        form.append("propID", propid);
        form.append("jobID", jobID);
        form.append("field", 'JB-CLOSEJOB');
        form.append("data", newjobdetail);

        if (newjobdetail.trim() === '') {
            NotifyToast('error', "Plase enter closure comment to continue.")
        }
        else {

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

                            var ep = applicationdomain + 'api/jobtracker/updatejobfields';
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
                                        GetJobById(parameterValue);
                                        HidePopupModal('resetDataModel');
                                        var userdata = `<p>Job modified successfully</p>`
                                        SuccessMessageCustom('Job Modification', userdata, 'success')
                                    }
                                    else {
                                        var userdata = `<p>Failed to modify job</p>`
                                        SuccessMessageCustom('Job Modification', userdata, 'error')
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
    }

    $('#save-changes-button').on('click', CloseJobDetail);
}



function PopulateComments(comments) {
    var htmlli = '';
    $.each(comments, function (index, coms) {
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

    htmlli += ` <li class="timeline-end-indicator">
    <i class="bx bx-check-circle"></i>
  </li>`;
    $('#comment-ul-timeline').html(htmlli)
}

function PopulateImages(medias) {

    if (medias !== null) {
        var oth = ``;




        var crr = 1;
        $.each(medias, function (index, med) {


            if (crr == 1) {
                oth += `<div class="mx-2">
                                <a target="_blank" href="${med}">
                                    <img class="d-block imgt rounded-3" src="${med}" alt="First slide" onclick="toggleEnlarge(this)">
                                </a>
                            </div>`
            }
            else {
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
    else {
        return ``;
    }
}


function toggleEnlarge(img) {
    img.classList.toggle("enlarged");
}

function AddComment() {
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

            if (Response === true) {

                $('#basic-default-message').val('')
                $('#commentImage').val('')
                GetJobById(parameterValue)
                var userdata = `<p>Comment added successfully</p>`
                SuccessMessageCustom('New Comment', userdata, 'success')
            }
            else {
                var userdata = `<p>Failed to add comment</p>`
                SuccessMessageCustom('New Comment', userdata, 'error')
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

function CreateSalesTeamFormatting(lst) {
    var htm = ``;
    $.each(lst, function (index, med) {
        htm += `<li class="list-group-item p-1 text-center" style="font-size: small;">${med.firstName} ${med.lastName} [${med.teamName}]</li>`
    });
    return htm;
}
function CreateSalesTeamFormatting2(lst) {
    var htm = ``;
    $.each(lst, function (index, med) {
        htm += `<span class="list-group-item p-1 text-center" style="font-size: small;">${med.firstName} ${med.lastName} [${med.teamName}]</span>`
    });
    return htm;
}


function ShowJobform() {
    datavals = JobInfo.jobdata;

    $('#job-prop-name').text("[" + datavals.propName + "]");
    $('#collapsible-area').empty();
    datavals.allareas.forEach(function (area) {
        if (datavals.areaID === area.areaid) {
            $('#collapsible-area').append('<option selected value="' + area.areaid + '">' + area.areaName + '</option>');
        }
        else {
            $('#collapsible-area').append('<option value="' + area.areaid + '">' + area.areaName + '</option>');
        }
    });

    $('#collapsible-assigned').empty();
    datavals.allTeams.forEach(function (emp) {
        $('#collapsible-assigned').append('<option value="' + emp.teamId + '">' + emp.manager.firstName + ' ' + emp.manager.lastName + ' [' + emp.teamName + ']' + '</option>');
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


    datavals.teams.forEach(function (tm) {
        $('#collapsible-assigned').val(tm.teamID)
        $('#collapsible-assigned').trigger('change');
    });

    $('#collapsible-status').val(datavals.jobStatus);
    $('#collapsible-status').trigger('change');

    if (ServerRole !== 'ADMIN') {
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
function AreaChange() {
    var areacode = $('#edit-area-input').val();
    var selectedText = $('#edit-area-input').find(':selected').text();
    if (selectedText !== '') {
        var odata = selectedText.toUpperCase().trim();
        if (odata === 'GUEST VILLA') {
            $('#villa-disp-div').show();
        }
        else {
            $('#villa-disp-div').hide();
        }
    }

}


function CCFChange() {
    var selectedText = $('#edit-ccf-input').find(':selected').text();
    if (selectedText !== '') {
        var odata = selectedText.trim();
        if (odata === 'Department Operational Budget') {
            $('#ccf-dept-div').show();
        }
        else {
            $('#ccf-dept-div').hide();
        }
    }

}

function SubmitEditJob() {
    var propID = CurrentProperty;
    var jobID = parameterValue;
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
    if (checkstatus === true) {
        isActive = 0;
    }

    var error = 0;
    if (area !== '' && priority !== '' && location !== '' && creationDate !== '' && status !== '' && assignedTo.length > 0) {
        var selectedText = $('#collapsible-area').find(':selected').text().toUpperCase().trim();
        if (selectedText === 'GUEST VILLA' && villaNumber == '') {
            error = 1;
        }

    }
    else {
        error = 1;
    }


    if (error === 0) {


        var form = new FormData();
        form.append("propID", propID);
        form.append("jobID", jobID);
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

                                if (Response === true) {
                                    HidePopupModal('editJobform');
                                    GetJobById(parameterValue);
                                    var userdata = `<p>Job edited successfully</p>`
                                    SuccessMessageCustom('Job Edits', userdata, 'success')
                                }
                                else {
                                    var userdata = `<p>Failed to edit job</p>`
                                    SuccessMessageCustom('Job Edits', userdata, 'error')
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
    else {
        NotifyToast('error', "Plase enter all mandatory fields to continue.")
    }


}
