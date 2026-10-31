var CurrentProperty = '';
var AllProperties = {};
var UserRoles = [];
var userName = '';
var userEmail = '';
var UserObject = null;


var surveyID = "csdcd";
var hubconsstring = applicationdomain + 'applicationhub?token=' + '&appcode=jobtracker' + '&param=' + surveyID;
const iconnection = new signalR.HubConnectionBuilder().withUrl(hubconsstring).withAutomaticReconnect({
    nextRetryDelayInMilliseconds: retryContext => {
        if (retryContext.elapsedMilliseconds < 60000) {
            // If we've been reconnecting for less than 60 seconds so far,
            // wait between 0 and 10 seconds before the next reconnect attempt.
            //return Math.random() * 10000;
            return 2000;
        }
    }
}).configureLogging(signalR.LogLevel.Information).build();
function SignalRConnect() {
    iconnection.start().then(function () {
        console.log("connected");
        iconnection.invoke('getConnectionId')
            .then(function (connectionId) {
                sessionStorage.setItem('conectionId', connectionId);
                //document.getElementById('SIGNALR_ID').value = connectionId;
                // Send the connectionId to controller
            }).catch(err => console.error(err.toString()));;
    });
    iconnection.on("TriggerAction", function (ActionName, ActionMessage) {
       
        if (ActionName == "UPDATEDASHBOARD") {
            AutoUpdateLastoundDetails();
            if (ActionMessage == 'roundwinner') {
                ServerUpdates();
            }
            GetAudtitorResults();
        }
        else if (ActionName == "ROUNDUPDATES") {
            AutoUpdateLastoundDetails();
            GetAudtitorResults();
        }
    });
}
function GetSignalRclientID() {
    return iconnection.connection.connectionId;
}







window.onload = function () {
    SignalRConnect();
    
    UserObject = GetStoredUserData();
    if (UserObject != null) {
        
        
        
        $('#UserName_Name').text(UserObject.name);
        userName = UserObject.name;
        userEmail = UserObject.username;
        CurrentProperty = UserObject.prop;
        UserRoles = UserObject.role;
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            $($.fn.dataTable.tables(true)).css('width', '100%');
            $($.fn.dataTable.tables(true)).DataTable().columns.adjust().draw();
        });

        $('.select2').select2({
            width: '100%'
        });

        GetAllProperties();
        GetJobOverView(CurrentProperty);
        if ('F01' in UserObject.access) {
            if (UserObject.access['F01'].read === true && UserObject.access['F01'].write === false) {
              $('#btn-F01').prop('disabled', true);
              $('#btn-F01').show();
            }
            else if (UserObject.access['F01'].read === false && UserObject.access['F01'].write === false) {
                $('#div-F01').html('')
            }
            else if (UserObject.access['F01'].read === true && UserObject.access['F01'].write === true) {
                $('#btn-F01').show();
            }
        }

    }
    else {
        LogoutUser();
    }
};

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
            var htm2 = ``;
            var litenms = ``;

            AllProperties = {}
            $.each(Response, function (index, med) {
                AllProperties[med.propId] = med.propName;
                litenms += `<li class="list-group-item p-1">
                            <div class="d-grid">
                            <button class="btn btn-outline-linkedin btn-sm" onclick="GetJobOverView('${med.propId}')">${med.propName}</button>
                            </div>
                          </li>`

            });






            if (UserRoles.includes('SUPERADMIN') || UserRoles.includes('ADMIN')) {


                var keys = Object.keys(AllProperties);
                if (keys.length >= 1) {
                    CurrentProperty = keys[0];
                    GetJobOverView(CurrentProperty)
                }



                var control = `<li class="nav-item dropdown-shortcuts navbar-dropdown dropdown me-2 me-xl-0">
                <a class="nav-link dropdown-toggle hide-arrow" href="#" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"><span class="mx-1" id="nav-prop-name-span">${AllProperties[CurrentProperty]}</span><i class="bx bx-grid-alt bx-sm"></i>  </a>
                <div class="dropdown-menu dropdown-menu-end py-0" id="nav-dd-prop">
                  <div class="dropdown-menu-header border-bottom">
                    <div class="dropdown-header d-flex align-items-center py-3" >
                      <h5 class="text-body mb-0 me-auto">Select Property</h5>
                    </div>
                  </div>
                  <div class="dropdown-shortcuts-list scrollable-container">
                    <div class="row row-bordered overflow-visible g-0">
                      <ul class="list-group p-1">
                        ${litenms}
                      </ul>
                    </div>
                  </div>
                </div>
                             </li>`;

                $('#nav-bar-prp-selector').html(control)

            }
            $('#master-prop-name').text(AllProperties[CurrentProperty]);



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

function GetJobOverView(Cprop) {
    CurrentProperty = Cprop;
    blockUI('#section-block');
    var form = new FormData();
    form.append("propId", CurrentProperty);

    var ep = applicationdomain + 'api/jobtracker/getjoboverview';
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

            $('#nav-prop-name-span').text(AllProperties[CurrentProperty]);
            $('#nav-dd-prop').removeClass('show')
            var tableBody = document.getElementById('job-overview-table-body');
            tableBody.innerHTML = '';
            Response.forEach((data, index) => {
                // Create a new table row
                var row = document.createElement('tr');

                // Populate the table row with data
                row.innerHTML = `
                                <td><div class="card card-body text-center p-3">${index + 1}</div></td>
                                <td>
                                    <div class="card card-body p-3">
                                        <div class="d-flex align-items-center">
                                            <img src="mainapp/assets/img/icons/brands/location.png" alt="${data.areaName}" height="24" class="me-2">
                                            <a class="dropdown-item" href="javascript:void(0);" onclick="ShowAreaJobs('${data.areaID}')"><span>${data.areaName}</span></a>
                                        </div>
                                    </div>
                                </td>
                                <td><div class="card card-body text-center p-3">${data.total_jobs}</div></td>
                                <td>
                                    <div class="card card-body text-center p-3">
                                        <div class="btn-group dropup">
                                            <button type="button" class="btn dropdown-toggle p-0 btn-label-secondary" data-bs-toggle="dropdown" aria-expanded="false">
                                                ${data.open_jobs}
                                            </button>
                                            <ul class="dropdown-menu" style="">
                                                <li>
                                                    <div class="d-flex justify-content-between">
                                                        <div class=""><a class="dropdown-item" href="#" onclick="FillterByAreaAndDate('${data.areaID}','d30')">Within 30 Days: </a></div>
                                                        <div class=""><a class="dropdown-item" href="#" onclick="FillterByAreaAndDate('${data.areaID}','d30')">${data.jobs.day30}</a></div>
                                                    </div>
                                                    
                                                </li>
                                                <li>
                                                    <div class="d-flex justify-content-between">
                                                        <div class=""><a class="dropdown-item" href="#" onclick="FillterByAreaAndDate('${data.areaID}','d60')">31 to 89 Days: </a></div>
                                                        <div class=""><a class="dropdown-item" href="#" onclick="FillterByAreaAndDate('${data.areaID}','d60')">${data.jobs.day60}</a></div>
                                                    </div>
                                                    
                                                </li>
                                                <li>
                                                    <div class="d-flex justify-content-between">
                                                        <div class=""><a class="dropdown-item" href="#"  onclick="FillterByAreaAndDate('${data.areaID}','d90')">90 Days Ago: </a></div>
                                                        <div class=""><a class="dropdown-item" href="#"  onclick="FillterByAreaAndDate('${data.areaID}','d90')">${data.jobs.day90}</a></div>
                                                    </div>
                                                    
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </td>
                                <td><div class="card card-body text-center p-3">${data.safety_jobs}</div></td>
                                <td>
                                    <div class="card p-1">
                                        <div class="d-flex justify-content-between align-items-center gap-3" style="height: 16px;">
                                            <div class="progress w-100" style="height: 10px">
                                                <div class="progress-bar bg-success" role="progressbar" style="width: ${(data.total_jobs / 10) * 100}%"
                                                    aria-valuenow="${data.total_jobs}" aria-valuemin="0" aria-valuemax="10"></div>
                                            </div>
                                            <small class="fw-semibold">${data.total_jobs}</small>
                                        </div>
                                        <div class="d-flex justify-content-between align-items-center gap-3" style="height: 16px;">
                                            <div class="progress w-100" style="height: 10px">
                                                <div class="progress-bar bg-primary" role="progressbar" style="width: ${(data.open_jobs / 10) * 100}%"
                                                    aria-valuenow="${data.open_jobs}" aria-valuemin="0" aria-valuemax="10"></div>
                                            </div>
                                            <small class="fw-semibold">${data.open_jobs}</small>
                                        </div>
                                        <div class="d-flex justify-content-between align-items-center gap-3" style="height: 16px;">
                                            <div class="progress w-100" style="height: 10px">
                                                <div class="progress-bar bg-info" role="progressbar" style="width: ${(data.safety_jobs / 10) * 100}%"
                                                    aria-valuenow="${data.safety_jobs}" aria-valuemin="0" aria-valuemax="10"></div>
                                            </div>
                                            <small class="fw-semibold">${data.safety_jobs}</small>
                                        </div>
                                    </div>
                                </td>
                                `;

                // Append the row to the table body
                tableBody.appendChild(row);
            });

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




function CreateNewJob() {

    GetProperyInfo(CurrentProperty);
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
            ShowJobform(Response);

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

function ShowJobform(datavals) {

    $('#job-prop-name').text("[" + datavals.propName + "]");
    $('#collapsible-area').empty();
    datavals.propArea.forEach(function (area) {
        $('#collapsible-area').append('<option value="' + area.areaid + '">' + area.areaName + '</option>');
    });

    $('#collapsible-assigned').empty();
    datavals.propEmp.forEach(function (emp) {
        $('#collapsible-assigned').append('<option value="' + emp.teamId + '">' + emp.manager.firstName + ' ' + emp.manager.lastName + ' [' + emp.teamName + ']' + '</option>');
    });

    ShowPopupModal('newJobform');
    $('.jbtclsdd').select2({
        width: '100%',
        dropdownParent: $('#newJobform')
    });
}

function propertyChange() {
    var areacode = $('#admin-properties').val();
    CurrentProperty = areacode;
    GetJobOverView(CurrentProperty);
}


function AreaChange() {
    var areacode = $('#collapsible-area').val();
    var selectedText = $('#collapsible-area').find(':selected').text();
    if (selectedText !== '') {
        var odata = selectedText.toUpperCase().trim();
        if (odata === 'GUEST VILLA') {
            $('#collapsible-villa').prop('disabled', false)
        }
        else {
            $('#collapsible-villa').prop('disabled', true)
            $('#collapsible-villa').val('');
        }
    }

}

function CCFChange(){
    var ccf = $('#collapsible-ccf').val();
    if(ccf==='Department Operational Budget'){
        var htm = `<div class="my-1 card card-body p-2" >
        <label class="form-label" for="collapsible-ccf-def" style="font-size: 0.75em;">Department<span style="color: red;">*</span></label>
        <input type="text" class="form-control form-control-sm" id="ccf-dept-name"/>
      </div>`;
      $('#ccf-dept-div').html(htm);
      $('#collapsible-ccf-def').val('')
    }
    else{
        $('#ccf-dept-div').html('');
        $('#collapsible-ccf-def').val('')
    }
}


function SubmitNewJob() {
    var area = $('#collapsible-area').val();
    var villaNumber = $('#collapsible-villa').val();
    var priority = $('#collapsible-priority').val();
    var location = $('#collapsible-location').val();
    var creationDate = $('#collapsible-date').val();
    var status = $('#collapsible-status').val();
    var assignedTo = $('#collapsible-assigned').val(); // This will return an array of selected values if 'multiple' attribute is present
    var budget = $('#collapsible-budget').val();
    var ccf = $('#collapsible-ccf').val();
    var ccf_dept = $('#ccf-dept-name').val();
    var referenceNo = $('#collapsible-refNumb').val(); // This seems to have the same ID as creation date. Ensure correct ID is used.
    var jobDetails = $('#collapsible-jd').val();
    var fileInput = document.getElementById('collapsible-attachment');
    
    var error = 0;
    if (area !== '' && priority !== '' && location !== '' && creationDate !== '' && status !== '' && assignedTo.length > 0) {
        var selectedText = $('#collapsible-area').find(':selected').text().toUpperCase().trim();
        if (selectedText === 'GUEST VILLA' && villaNumber === '') {
            error = 1;
        }
    }
    else {
        error = 1;
    }

    if(ccf==='Department Operational Budget' && ccf_dept===''){
        error = 1;
    }


    if (error === 0) {
        var form = new FormData();
        form.append("propId", CurrentProperty);
        form.append("areaID", area);
        form.append("villaNumber", villaNumber);
        form.append("priority", priority);
        form.append("jobLocation", location);
        form.append("jobStatus", status);
        form.append("jobDate", creationDate);
        form.append("refNum", referenceNo);
        form.append("jobDetail", jobDetails);
        form.append("budget", budget);
        form.append("ccf", ccf);
        form.append("ccfdept", ccf_dept);
        assignedTo.forEach((team) => {
            form.append("assignedTo", team);
        });
        for (let i = 0; i < fileInput.files.length; i++) {
            form.append("propImages", fileInput.files[i]);
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

                        var ep = applicationdomain + 'api/jobtracker/addnewjob';
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
                                    HidePopupModal('newJobform');
                                    GetJobOverView(CurrentProperty);
                                    var userdata = `<p>Job added successfully</p>`
                                    SuccessMessageCustom('New Job', userdata, 'success')
                                }
                                else {
                                    var userdata = `<p>Failed to add job</p>`
                                    SuccessMessageCustom('New Job', userdata, 'error')
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

function ShowAreaJobs(areaID) {


    blockUI('#section-block');
    var form = new FormData();
    form.append("propId", CurrentProperty);
    form.append("areaID", areaID);

    var ep = applicationdomain + 'api/jobtracker/getareajobs';
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

            AppendJobListing(Response.jobs, Response.villaCount);
            if (Response.villaCount === 0) {
                $('#jbt-villa-header').hide();
            }
            else {
                $('#jbt-villa-header').show();
            }
            $('#job-area-name').text(` [` + Response.areaName + `] [${AllProperties[CurrentProperty]}]`);

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

    ShowPopupModal('JobDetailsform');
}

function FillterByAreaAndDate(areaID, datespan) {

    blockUI('#section-block');
    var form = new FormData();
    form.append("propID", CurrentProperty);
    form.append("areaID", areaID);
    form.append("dateID", datespan);

    var dateText = '';
    if (datespan === 'd30') {
        dateText = 'Within 30 days';
    }
    else if (datespan === 'd60') {
        dateText = 'Between 31 to 89 Days';
    }
    else if (datespan === 'd90') {
        dateText = '90 days ago';
    }

    var ep = applicationdomain + 'api/jobtracker/getareajobsbydate';
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
            
            AppendJobListing(Response.jobs, Response.villaCount);
            if (Response.villaCount === 0) {
                $('#jbt-villa-header').hide();
            }
            else {
                $('#jbt-villa-header').show();
            }
            $('#job-area-name').text(' [' + Response.areaName + '] [' + dateText + ']');

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

    ShowPopupModal('JobDetailsform');
}
function ViewClosedJobs() {

    blockUI('#section-block');
    var form = new FormData();
    form.append("propID", CurrentProperty);
    var ep = applicationdomain + 'api/jobtracker/getclosedjobs';
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

            AppendJobListing(Response.jobs, Response.villaCount);
            if (Response.villaCount === 0) {
                $('#jbt-villa-header').hide();
            }
            else {
                $('#jbt-villa-header').show();
            }
            $('#job-area-name').text(' [Closed Jobs]');

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

    ShowPopupModal('JobDetailsform');
}




function AppendJobListing(datavalues, villas) {
    
    var condition = true;
    if (villas === 0) {
        condition = false
    }
    if ($.fn.DataTable.isDataTable('#jobTrackerDataTable')) {
        $('#jobTrackerDataTable').DataTable().destroy();
    }

    $('#jobTrackerDataTable').DataTable({
        data: datavalues,
        "columns": [
            {
                data: "jobId", name: "ID", render: function (data, type, row, meta) {
                    var rowid = row["jobId"];
                    var showwid = row["orgjobId"];
                    var tt = `<a href="#" onclick="ShowJobDetails('${rowid}')" ><span class="text-secondary text-decoration-underline">${showwid}</span></a>`
                    return tt;
                }
            },
            { data: "villaNumber", name: "VILLA" , visible :condition, render: function (data, type, row, meta) {
                
                var txt = row["villaNumber"]; 
                if(txt!==''){
                    return txt;
                }
                else{
                    return '-'
                }

            } 
            },
            {
                data: "jobDetail", name: "DETAILS", render: function (data, type, row, meta) {
                    
                    
                    return type === 'display' && data.length > 50 ?
                        data.substr(0, 50) + '...' :
                        data;
                }
            },
            {
                data: "jobCreatedOn", name: "CREATE DATE", render: function (data, type, row, meta) {
                    var rowid = row["jobCreatedOn"];
                    return extractDate(formatDateString(rowid)).replace(',','');

                }
            },
            { data: "jobLocation", name: "LOCATION" },
            { data: "priority", name: "PRIORITY" },
            { data: "jobStatus", name: "STATUS" },
            { data: "refNum", name: "REF NO" },
            {
                data: "data1", name: "ASSIGNED TO", render: function (data, type, row, meta) {
                    var rowid = row["jobId"];
                    var teams = row["data1"];
                    var tt = JobTeamsHtml(rowid, teams)
                    return tt;

                }
            },
            {
                data: "jobCloseOn", name: "CLOSE DATE", render: function (data, type, row, meta) {
                    var rowid = row["jobCloseOn"];
                    if (rowid === '0001-01-01T00:00:00') {
                        return 'NA'
                    }
                    else {
                        return extractDate(formatDateString(rowid)).replace(',','');
                    }


                }
            },
            { data: "uploadCount", name: "ATTACHMENTS" },
            { data: "commentCount", name: "COMMENTS" },
        ],
        columnDefs: [{
            "defaultContent": "-",
            "targets": "_all"
        }],
        "serverSide": false,
        "order": [0, "desc"],
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
        searching: true
    });
    $('#jobTrackerDataTable tbody').on('mouseover', 'tr', function () {

        $('[data-toggle="tooltip"]').tooltip({
            trigger: 'hover',
            html: true
        });
    });
    $('#jobTrackerDataTable_filter').css("margin-top", "0px")
    $('#jobTrackerDataTable_filter').css("margin-bottom", "5px")



}

function JobTeamsHtml(jobid, team) {


    var htmlli = '';
    $.each(team, function (index, item) {
        htmlli += `<li class="list-group-item p-1">
                    <div class="">
                        <span>${item.teamName} [${item.firstName} ${item.lastName}]</span>
                    </div>
                </li>`;
    });


    var htm = `<div class="text-center">
                <button class="btn btn-dark btn-xs collapsed rounded" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${jobid}" aria-expanded="false" aria-controls="collapse${jobid}">
                        View Teams
                </button>
                <div class="collapse" id="collapse${jobid}">
                    <div class="m-1 p-1">
                        <ul class="list-group">
                            ${htmlli}
                        </ul>
                    </div>
                </div>
              </div>
              `
    return htm
}

function ShowJobDetails(jobid) {

    window.open(`jobpage.html?jobid=${jobid}`, '_blank');
}




