var QuickFixClosed = null;
function initializePage(containerId) {
    $(document).ready(function () {
        var userdata = $(containerId).data('controlData');
        QuickFixClosed = userdata.controlData;
        renderType = userdata.renderType;
        PopulateCloseJobCards();

    });
}

function PopulateCloseJobCards() {
    var htm = ``;
    var tabrow = ``
    var rowcount = 1;
    let CloseJobs = (QuickFixClosed && QuickFixClosed.closedjob) ? QuickFixClosed.closedjob : [];
    let pagination = (QuickFixClosed && QuickFixClosed.pagination) ? QuickFixClosed.pagination : {};
    let currentPage = parseInt(pagination.pageNumber || (QuickFixClosed && QuickFixClosed.currentPage) || window.currentClosePage || 1);
    let pageSize = parseInt(pagination.pageSize || (QuickFixClosed && QuickFixClosed.pageSize) || window.currentClosePageSize || 25);
    let totalRecords = pagination.totalClose !== undefined ? parseInt(pagination.totalClose) : (pagination.totalRecords !== undefined ? parseInt(pagination.totalRecords) : CloseJobs.length);
    let totalPages = pagination.totalClosePages !== undefined ? parseInt(pagination.totalClosePages) : (pagination.totalPages !== undefined ? parseInt(pagination.totalPages) : (Math.ceil(totalRecords / pageSize) || 1));


    $.each(CloseJobs, function (index, op) {

        var retval =``;
        if(op.open_uploads.length>0){
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

        var cimgurl =``;
        var isCImage= false;
        var isCVideo= false;
        if(op.close_uploads.length>0){
            cimgurl = op.close_uploads[0].fileurl;
            isCImage = cimgurl.match(/\.(jpeg|jpg|png|gif)$/i);
            isCVideo = cimgurl.match(/\.(mp4|mov)$/i);
        }
 

        var closedmedia=`<a href="#" onclick="ShowImageMob('${cimgurl}')"><img class="image1" src="${cimgurl}" alt=""></a>`
        if (isCImage) {
            closedmedia = `<a href="#" onclick="ShowImageMob('${cimgurl}')"><img class="image1" src="${cimgurl}" alt=""></a>`;
        }
        else {
            closedmedia = `<a href="#" onclick="ShowImageMob('${cimgurl}')" class="fa fa-play-circle fa-2x" style="color: #0077b5;"></a>`;
        }

        var currentstatus = op.job_status;
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
                              <div class="col-8">${op.assigned_supervisor ? op.assigned_supervisor_first_name + " " + op.assigned_supervisor_last_name : "NA"}</div>
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
                              <div class="col-8">${formatDateString(op.openDate)} IST</div>
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

        tabrow += `<tr>
                        <td>${rowcount}</td>
                        <td>${op.job_detail}</td>
                        <td>${op.issued_by_team_details}</td>
                        <td>${op.issued_to_team_name}</td>
                        <td>${op.area_name}</td>
                        <td>${op.subarea}</td>
                        <td>${formatDateString(op.openDate)}</td>
                        <td>
                            <a href="#" onclick="ShowImagePc('${op.open_uploads.length>0?op.open_uploads[0].fileurl:''}')"><img class="image1" src="${op.open_uploads.length>0?op.open_uploads[0].fileurl:''}" alt=""></a>
                        </td>
                        <td>
                            <a href="#" onclick="ShowImagePc('${op.close_uploads.length>0?op.close_uploads[0].fileurl:''}')"><img class="image1" src="${op.close_uploads.length>0?op.close_uploads[0].fileurl:''}" alt=""></a> 
                        </td>
                        <td>${op.assigned_supervisor_first_name} ${op.assigned_supervisor_last_name}</td>
                        <td>${formatDateString(op.closeDate)} IST</td>
                        
                        <td>
                          <a href="#">${currentstatus}</a>
                        </td>
                        <td>${op.job_remark ? op.job_remark : "NA"}</td>
                    </tr>`
        rowcount++;
    });
    $('#close-card-view').html(htm);
    // $('#close-table-view').html(tabrow);



    if ($.fn.DataTable.isDataTable('#closejobstable')) {
        $('#closejobstable').DataTable().destroy();
    }
    $('#closejobstable thead th select').remove();

    $('#closejobstable').DataTable({

        data: CloseJobs,
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
                data: "teamId", name: "Open Date/Time",
                render: function (data, type, row, meta) {
                    var op = row["openDate"];
                    return formatDateString(op) + ' IST';
                }
            },
            {
                data: "teamName", name: "Photo Before",
                render: function (data, type, row, meta) {
                    
                    var op = row["open_uploads"];
                    if(op.length>0){

                    
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
                    if(op.length>0){

                    
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
                    return formatDateString(op) + ' IST';
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

    RenderTopPageSizeSelector('#closejobstable', pageSize, 'ChangeClosePageSize');
    $('#mobile-close-pagesize').val(pageSize);
    RenderPaginationControls('#close-pagination-container', currentPage, totalPages, totalRecords, pageSize, 'FetchCloseJobPage');
}

function SearchCloseJobs() {
    var txt = $('#Search').val();
    if (!txt || txt.trim() === '') {
        PopulateCloseJobCards();
        return;
    }
    var searchedList = searchItems(txt, (QuickFixClosed && QuickFixClosed.closedjob) ? QuickFixClosed.closedjob : []);
    if (searchedList.length > 0) {
        var htm = ``;
        $.each(searchedList, function (index, op) {
            var retval = ``;
            if (op.open_uploads.length > 0) {
                var imgurl = op.open_uploads[0].fileurl;
                const isImage = imgurl.match(/\.(jpeg|jpg|png|gif)$/i);
                if (isImage) {
                    retval = `<a href="#" onclick="ShowImageMob('${imgurl}')"><img class="image1" src="${imgurl}" alt=""></a>`;
                } else {
                    retval = `<a href="#" onclick="ShowImageMob('${imgurl}')" class="fa fa-play-circle fa-2x" style="color: #0077b5;"></a>`;
                }
            }
            var currentstatus = op.job_status;
            htm += `<div class="accordion-item1">
                        <button class="accordion-btn1" onclick="toggleAccordion(this)">
                            <div class="moretitle">View More
                                <span class="plus">+</span>
                                <span class="minus" style="display: none;">-</span>
                            </div>
                            <div class="morecont">
                                <div class="cont1"><div class="col-4">Job Details:</div><div class="col-8">${op.job_detail}</div></div>
                                <div class="cont1"><div class="col-4">Area:</div><div class="col-8">${op.area_name}</div></div>
                                <div class="cont1"><div class="col-4">Sub-Area:</div><div class="col-8">${op.subarea}</div></div>
                                <div class="cont1"><div class="col-4">Issued To:</div><div class="col-8">${op.issued_to_team_name}</div></div>
                                <div class="cont1"><div class="col-4">Status:</div><div class="col-8"><a href="#">${currentstatus}</a></div></div>
                            </div>
                        </button>
                    </div>`;
        });
        $('#close-card-view').html(htm);
    }
}
