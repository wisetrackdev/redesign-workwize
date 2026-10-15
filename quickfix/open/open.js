var QuickFixOpen = null;
var UserRoles = null;
var UserCurrentTeamId = null;
var userDesignation = '';
var userTeams = [];
var UserSubTeamInfo = [];
var QuickFisxNew = null;
var UserRoles = null;
var allTeams = null;


function initializePage(containerId) {
    $(document).ready(function () {
        var userdata = $(containerId).data('controlData');
        QuickFixOpen = userdata.controlData;
        renderType = userdata.renderType;
        var UserObject = GetStoredUserData();
        UserRoles = UserObject.role;

        CurrentProperty = (QuickFixOpen && QuickFixOpen.property) ? QuickFixOpen.property.propId : null;
        UserCurrentTeamId = QuickFixOpen.teamId;
        allTeams = QuickFixOpen.allTeams;
        userTeams = QuickFixOpen.userTeam;
        UserSubTeamInfo = QuickFixOpen.userSubTeamData;

        var totalOpenCount = (QuickFixOpen && QuickFixOpen.pagination && QuickFixOpen.pagination.totalOpen !== undefined)
            ? QuickFixOpen.pagination.totalOpen
            : ((QuickFixOpen && QuickFixOpen.openjob) ? QuickFixOpen.openjob.length : 0);
        $('#openjobcountbadge').text(totalOpenCount);

        PopulateOpenJobCards()
    });
}


function PopulateOpenJobCards() {
    var htm = ``;
    var tabrow = ``
    var rowcount = 1;
    let OpenJobs = (QuickFixOpen && QuickFixOpen.openjob) ? QuickFixOpen.openjob : [];
    let pagination = (QuickFixOpen && QuickFixOpen.pagination) ? QuickFixOpen.pagination : {};
    let currentPage = parseInt(pagination.pageNumber || (QuickFixOpen && QuickFixOpen.currentPage) || window.currentOpenPage || 1);
    let pageSize = parseInt(pagination.pageSize || (QuickFixOpen && QuickFixOpen.pageSize) || window.currentOpenPageSize || 25);
    let totalRecords = pagination.totalOpen !== undefined ? parseInt(pagination.totalOpen) : OpenJobs.length;
    let totalPages = pagination.totalOpenPages !== undefined ? parseInt(pagination.totalOpenPages) : (Math.ceil(totalRecords / pageSize) || 1);





    $.each(OpenJobs, function (index, op) {

        var retval = ``;

        if (op.open_uploads.length > 0) {
            var imgurl = op.open_uploads[0].fileurl;
            const isImage = imgurl.match(/\.(jpeg|jpg|png|gif)$/i);
            const isVideo = imgurl.match(/\.(mp4|mov)$/i);
            retval = `<a href="#" onclick="ShowImageMob('${imgurl}')"><img class="image1" src="${imgurl}" alt=""></a>`;
            if (isImage) {
                retval = `<a href="#" onclick="ShowImageMob('${imgurl}')"><img class="image1" src="${imgurl}" alt=""></a>`;
            }
            else {
                retval = `<a href="#" onclick="ShowImageMob('${imgurl}')" class="fa fa-play-circle fa-2x" style="color: #0077b5;"></a>`;
            }
        }

        var currentstatus = op.job_status;
        var propId = op.propId;
        var jobId = op.jobId;
        var areaId = op.areaId;
        var issued_to_team = op.issued_to_team;
        var assigned_supervisor = op.assigned_supervisor;
        var tt = ``;

        if ((issued_to_team === UserCurrentTeamId) && UserRoles.includes('MANAGER')) {
            tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}','${assigned_supervisor}')">${currentstatus}</a>`
        }
        else if
            (assigned_supervisor === userEmail) {
            tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}','${assigned_supervisor}')">${currentstatus}</a>`
        }
        else if (UserRoles.includes('ADMIN') || UserRoles.includes('SUPERADMIN') || UserRoles.includes('OPROADMIN')) {
            tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}','${assigned_supervisor}')">${currentstatus}</a>`
        }
        else {
            tt = `<span>${currentstatus}</span>`
        }





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
                              <div class="col-8">${op.issued_by_team_name != op.issued_to_team_name ? "NA" : op.assigned_dept_name !== null ? op.assigned_dept_name : op.assigned_dept_main}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Assign Name:</div>
                              <div class="col-8"><a href="#" ${op.issued_to_team === UserCurrentTeamId ? `onclick="GetTeamMember('${op.propId}','${op.issued_by_team_name === op.issued_to_team_name ? op.assigned_dept : op.issued_to_team}','${op.jobId}')"` : ""}><span>${op.assigned_supervisor ? op.assigned_supervisor_first_name + " " + op.assigned_supervisor_last_name : "NA"}</span></a></div>
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
                              <div class="col-8">${formatDateString(op.openDate)} IST</div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Photo After:</div>
                              <div class="col-8"><img class="image1" src="quickfixcssjs/theme/assets/img/gallery-default.png" alt=""></div>
                            </div>
                            <div class="cont1">
                              <div class="col-4">Remark:</div>
                              <div class="col-8">${op.job_remark ? op.job_remark : "NA"}</div>
                            </div>
                            <div class="cont1">
                              <div class="col-12 d-grid"><button class="btn btn-linkedin btn-sm" disabled onclick="ConfirmationDialog('${op.propId}','${op.jobId}')">Move To Task Master</button></div>
                            </div>
                          </div>
                    </div>
                </div>`;
        rowcount++;
    });
    $('#open-card-view').html(htm);

    if ($.fn.DataTable.isDataTable('#openjobstable')) {
        $('#openjobstable').DataTable().destroy();
    }
    $('#openjobstable thead th select').remove();

    $('#openjobstable').DataTable({

        data: OpenJobs,
        "columns": [
            {
                data: "propID", name: "Sr.No.",
                render: function (data, type, row, meta) {
                    return (currentPage - 1) * pageSize + meta.row + 1;
                }
            },
            { data: "job_detail", name: "Job Details" },
            { data: "issued_by_team_details", name: "Issued By" },
            { data: "issued_to_team_name", name: "Issued To" },
            { data: "area_name", name: "Area" },
            { data: "subarea", name: "Sub-Area" },
            {
render: function (data, type, row) {
    let op = row["openDate"];
    if (!op) return "";

    let date = new Date(op);

    // UTC → Maldives (UTC + 5 hours)
    date.setHours(date.getHours() + 5);

    return formatDateString(date) + " GST";
},
//  width: "210px",           
//     className: "text-nowrap no-wrap"

            },
            {
                data: "teamName", name: "Photo Before",
                render: function (data, type, row, meta) {
                    var op = row["open_uploads"];
                    if (op.length > 0) {


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
                    else {
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

                    //var tt =`${issued_by_team_name!=issued_to_team_name? "NA": assigned_dept_name!==null? assigned_dept_name: assigned_dept_main}`
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

                    var tt = `<a href="#" ${issued_to_team === UserCurrentTeamId ? `onclick="GetTeamMember('${propId}','${issued_by_team_name === issued_to_team_name ? issued_to_team : assigned_dept}','${jobId}')"` : ""}><span>${assigned_supervisor ? assigned_supervisor_first_name + " " + assigned_supervisor_last_name : "NA"}</span></a>`
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
                    else if (UserRoles.includes('ADMIN') || UserRoles.includes('SUPERADMIN') || UserRoles.includes('OPROADMIN')) {
                        tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}','${assigned_supervisor}')">${currentstatus}</a>`
                    }
                    else {
                        tt = `<span>${currentstatus}</span>`
                    }
                    //var tt =` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}')">${currentstatus}</a>`
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
                    var tt = `<div class="col-12 d-grid"><button class="btn btn-linkedin btn-xs" disabled onclick="ConfirmationDialog('${propId}','${jobId}')">Move To Task Master</button></div>`
                    return tt;
                }
            },

        ],
        columnDefs: [{
            "defaultContent": "-",
            "targets": "_all"
        }],
        paging: false,
        info: false,
        "serverSide": false,
        "order": [0, "asc"],
        "processing": true,

        "language": {
            "processing": "Processing...Please wait"
        },
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', className: 'btn-outline-secondary btn-sm' },
            { extend: 'csv', className: 'btn-outline-secondary btn-sm' },
            { extend: 'excel', className: 'btn-outline-secondary btn-sm' },
            { extend: 'pdf', className: 'btn-outline-secondary btn-sm' },
            { extend: 'print', className: 'btn-outline-secondary btn-sm' }
        ],
        autoWidth: true,
        responsive: true,
        searching: true,
        initComplete: function () {
            this.api()
                .columns([1, 2, 3, 4, 5])
                .every(function () {
                    var column = this;
                    $(column.header()).find('select').remove();
                    var select = $('<select class="form-select form-select-sm mt-1"><option value=""></option></select>')
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
                            if (d && typeof d === 'string' && d.trim() !== '') {
                                select.append('<option value="' + d + '">' + d + '</option>');
                            }
                        });

                    $(column.footer()).empty();

                });

        },


    });

    RenderTopPageSizeSelector('#openjobstable', pageSize, 'ChangeOpenPageSize');
    $('#mobile-open-pagesize').val(pageSize);
    RenderPaginationControls('#open-pagination-container', currentPage, totalPages, totalRecords, pageSize, 'FetchOpenJobPage');
}

function SearchOpenJobs() {
    var txt = $('#Search').val();
    if (!txt || txt.trim() === '') {
        PopulateOpenJobCards();
        return;
    }
    var searchedList = searchItems(txt, (QuickFixOpen && QuickFixOpen.openjob) ? QuickFixOpen.openjob : []);
    if (searchedList.length > 0) {

        var htm = ``;
        $.each(searchedList, function (index, op) {
            var retval = ``;
            var isImage = null;
            var isVideo = null;
            if (op.open_uploads.length > 0) {
                var imgurl = op.open_uploads[0].fileurl;
                isImage = imgurl.match(/\.(jpeg|jpg|png|gif)$/i);
                isVideo = imgurl.match(/\.(mp4|mov)$/i);

                if (isImage) {
                    retval = `<a href="#" onclick="ShowImageMob('${imgurl}')"><img class="image1" src="${imgurl}" alt=""></a>`;
                }
                else {
                    retval = `<a href="#" onclick="ShowImageMob('${imgurl}')" class="fa fa-play-circle fa-2x" style="color: #0077b5;"></a>`;
                }
            }

            var currentstatus = op.job_status;
            var currentstatus = op.job_status;
            var propId = op.propId;
            var jobId = op.jobId;
            var areaId = op.areaId;
            var issued_to_team = op.issued_to_team;
            var assigned_supervisor = op.assigned_supervisor;
            var tt = ``;

            if ((issued_to_team === QuickFixOpen.teamId) && UserRoles.includes('MANAGER')) {
                tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}','${assigned_supervisor}')">${currentstatus}</a>`
            }
            else if
                (assigned_supervisor === userEmail) {
                tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}','${assigned_supervisor}')">${currentstatus}</a>`
            }
            else if (UserRoles.includes('ADMIN') || UserRoles.includes('SUPERADMIN') || UserRoles.includes('OPROADMIN')) {
                tt = ` <a href="#" onclick="ChangeJobStatus('${currentstatus}', '${jobId}','${propId}','${areaId}','${assigned_supervisor}')">${currentstatus}</a>`
            }
            else {
                tt = `<span>${currentstatus}</span>`
            }



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
                                  <div class="col-8">${op.issued_by_team_name != op.issued_to_team_name ? "NA" : op.assigned_dept_name !== null ? op.assigned_dept_name : op.assigned_dept_main}</div>
                                </div>
                                <div class="cont1">
                                  <div class="col-4">Assign Name:</div>
                                  <div class="col-8"><a href="#" ${op.issued_to_team === QuickFixOpen.teamId ? `onclick="GetTeamMember('${op.propId}','${op.issued_by_team_name === op.issued_to_team_name ? op.assigned_dept : op.issued_to_team}','${op.jobId}')"` : ""}><span>${op.assigned_supervisor ? op.assigned_supervisor_first_name + " " + op.assigned_supervisor_last_name : "NA"}</span></a></div>
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
                                  <div class="col-8"><img class="image1" src="quickfixcssjs/theme/assets/img/gallery-default.png" alt=""></div>
                                </div>
                                <div class="cont1">
                                  <div class="col-4">Remark:</div>
                                  <div class="col-8">${op.job_remark ? op.job_remark : "NA"}</div>
                                </div>
                                 <div class="cont1">
                                    <div class="col-12 d-grid"><button class="btn btn-linkedin btn-sm" disabled onclick="ConfirmationDialog('${op.propId}','${op.jobId}')">Move To Task Master</button></div>
                                 </div>
                              </div>
                        </div>
                    </div>`;
        });
        $('#open-card-view').html(htm);
    }
}

function ConfirmationDialog(propId, jobId) {
    Swal.fire({
        title: "Do you want to save the changes?",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Save",
        denyButtonText: `Don't save`
    }).then((result) => {
        /* Read more about isConfirmed, isDenied below */
        if (result.isConfirmed) {
            MoveToTaskMaster(propId, jobId)
        } else if (result.isDenied) {
            Swal.fire("Changes are not saved", "", "info");
        }
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
                PropertyChange();
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

function ChangeJobStatus(currentstatus, jobid, propid, areaid, assignedSupervisor) {

    var status = ``;
    if (UserRoles.includes('SUPERADMIN') || UserRoles.includes('OPROADMIN')) {
        status += `<option value="Assigned" ${currentstatus === "Assigned" ? "selected" : ""}>Assigned</option>`;
        status += `<option value="In-Progress" ${currentstatus === "In-Progress" ? "selected" : ""}>In-Progress</option>`;
        status += `<option value="Closed" ${currentstatus === "Closed" ? "selected" : ""}>Closed</option>`;
    }
    else {
        if (assignedSupervisor === "null" || assignedSupervisor === undefined || assignedSupervisor === '') {
            status += `<option value="Open" ${currentstatus === "Open" ? "selected" : ""}>Open</option>`;
        }
        else {
            status += `<option value="Assigned" ${currentstatus === "Assigned" ? "selected" : ""}>Assigned</option>`;
            status += `<option value="In-Progress" ${currentstatus === "In-Progress" ? "selected" : ""}>In-Progress</option>`;
            status += `<option value="Closed" ${currentstatus === "Closed" ? "selected" : ""}>Closed</option>`;
        }
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
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
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

        var error = 0;

        if (new_status === 'Closed') {
            if (close_job_remark === '') {
                error++;

                var userdata = `<p>Please enter closing remarks</p>`
                SuccessMessageCustom('Job Status', userdata, 'error')

                //alert("Please enter closing remarks and also select a picture")
            }
            else {
                if (fileInput.files.length === 0) {
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
                        if (result.isConfirmed) {
                            SaveJobDetailCloseStatusWithoutPhoto()
                        } else if (result.isDenied) {
                            Swal.fire("Changes are not saved", "", "info");
                        }
                    });
                }
                else {
                    SaveJobDetailCloseStatusWithPhoto()
                }
            }
        }
        else {
            SaveJobDetailCloseStatusWithoutPhoto();
        }
    }
    function SaveJobDetailCloseStatusWithPhoto() {
        var new_status = $('#job-status-sector').val();
        var close_job_remark = $('#close-job-remark').val();
        var fileInput = document.getElementById('close-job-photo');
        var ggg = `${new_status}:${jobid}:${propid}:${areaid}`

        var error = 0;
        if (error === 0) {
            var form = new FormData();
            form.append("jobID", jobid);
            form.append("propId", propid);
            form.append("areaID", areaid);
            form.append("status", new_status);
            form.append("remarks", close_job_remark);
            for (let i = 0; i < fileInput.files.length; i++) {
                form.append("jobImages", fileInput.files[i]);
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

                        /*
                        GetAllOpenJobs();
                        GetAllCloseJobs();
                        GetAllOpenJobsCount(propid);
                        */
                        PropertyChange();
                        var userdata = `Status modified successfully`
                        ConfirmationDialog2('Job Status', userdata, 'success')
                        //location.reload();
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


    }
    function SaveJobDetailCloseStatusWithoutPhoto() {
        var new_status = $('#job-status-sector').val();
        var close_job_remark = $('#close-job-remark').val();
        var fileInput = document.getElementById('close-job-photo');
        var ggg = `${new_status}:${jobid}:${propid}:${areaid}`

        var error = 0;
        if (error === 0) {
            var form = new FormData();
            form.append("jobID", jobid);
            form.append("propId", propid);
            form.append("areaID", areaid);
            form.append("status", new_status);
            form.append("remarks", close_job_remark);


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

                        /*
                        GetAllOpenJobs();
                        GetAllCloseJobs();
                        GetAllOpenJobsCount(propid);
                        */
                        PropertyChange();
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


    }
    $('#save-changes-button').on('click', SaveJobDetail);
    
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

function findTeamByTeamId(teams, teamId) {
    return teams.find(team => team.teamId === teamId);
}

function AssignJobToMemeber(name_list, propid, teamid, jobid) {




    var teamlist = ``
    var teamnames = ``;
    // $.each(userTeams, function (index, op) {
    //     teamnames += `<option value="${op.teamid}">${op.teamName}</option>`
    // });


    if (UserSubTeamInfo.length > 0) {

        $.each(UserSubTeamInfo, function (index, op) {
            teamnames += `<option value="${op.subteamId}">${op.subteamName}</option>`
        });

        $.each(UserSubTeamInfo[0].subteams, function (index, op) {
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
          <button type="button" class="btn btn-linkedin btn-sm"  id="save-changes-button">Save changes</button>
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
            ShowSpinner();
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
                    HideSpinner()
                    if (Response === true) {
                        HidePopupModal('resetDataModel');


                        PropertyChange();
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
    else {
        alert('Job cannot be assigned as there are no sub teams in this department.')
    }
}

function AssignTeamNameChange() {
    var new_status = $('#job-team-sector').val();
    let result = UserSubTeamInfo.find(obj => obj.subteamId === new_status);
    var teamlist = ``
    $.each(result.subteams, function (index, op) {
        teamlist += `<option value="${op.email}">${op.firstName} ${op.lastName}</option>`
    });
    $('#job-teamassign-sector').html(teamlist);
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
        /* Read more about isConfirmed, isDenied below */
        if (result.isConfirmed) {

        }
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


function ShowImagePc(mediaUrl) {


    // Determine if the URL is an image or a video
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
        htm += `<img 
    src="${mediaUrl}" 
    alt="" 
    style="width:100%; height:45vh; object-fit:contain; display:block;"
>`;

    } else if (isVideo) {
        const videoType = mediaUrl.endsWith('.mp4') ? 'video/mp4' : 'video/quicktime';
        htm += `<video controls autoplay muted style="height: 45vh; width: 100%;">
                    <source src="${mediaUrl}" type="${videoType}">
                    Your browser does not support the video tag.
                </video>`;
    } else {
        htm += `<p>Unsupported media type.</p>`;
    }

    htm += `        </div>
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