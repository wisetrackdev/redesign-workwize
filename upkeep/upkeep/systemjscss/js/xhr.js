window.onload = function () {
    var storedUserData = sessionStorage.getItem('oproUserData');
    var UserObject = JSON.parse(storedUserData);
    if (UserObject != null) {
        $('#UserName_Name').text(UserObject.name);
        GetEmpCount()
        GetAllEmp()

        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            $($.fn.dataTable.tables(true)).css('width', '100%');
            $($.fn.dataTable.tables(true)).DataTable().columns.adjust().draw();
        });

        $('.select2').select2({
            width: '100%'
        });

    }
    else {
        LogoutUser();
    }
};

//#region DashBoard Top

function GetEmpCount() {

    var ep = applicationdomain + 'api/hr/getempcount';
    var jwt = GetStoredJwt();
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: ep,
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            $('#admin-count').text(Response.admin)
            $('#hr-count').text(Response.hr)
            $('#sales-count').text(Response.sales)
            $('#merchant-count').text(Response.merchant)
            console.log(Response);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status === 401) {
                // Unauthorized error handling
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                // Bad Request error handling
                var errorResponse = XMLHttpRequest.responseJSON;
                //console.log("Bad Request error occurred.",errorResponse);
                ErrorMessage()
            } else {
                // Other error handling
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}
function GetAllEmp() {
    var ep = applicationdomain + 'api/hr/getallemp';
    var jwt = GetStoredJwt();
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: ep,
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            AppendEmpTable(Response.hr);
            AppendAdminEmpTable(Response.admins);
            AppendSalesEmpTable(Response.sales);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status === 401) {
                // Unauthorized error handling
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                // Bad Request error handling
                var errorResponse = XMLHttpRequest.responseJSON;
                //console.log("Bad Request error occurred.",errorResponse);
                ErrorMessage()
            } else {
                // Other error handling
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}
//#endregion

//#region DataTables

function GetAdminManager() {
    var ep = applicationdomain + 'api/hr/getalladminmanager';
    var jwt = GetStoredJwt();
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: ep,
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            console.log(Response);
            ShowEmployeeForm('ADMIN', Response)
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status === 401) {
                // Unauthorized error handling
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                // Bad Request error handling
                var errorResponse = XMLHttpRequest.responseJSON;
                //console.log("Bad Request error occurred.",errorResponse);
                ErrorMessage()
            } else {
                // Other error handling
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}
function GetHrManager() {
    var ep = applicationdomain + 'api/hr/getallhrmanager';
    var jwt = GetStoredJwt();
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: ep,
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            console.log(Response);
            ShowEmployeeForm('HR', Response)
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status === 401) {
                // Unauthorized error handling
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                // Bad Request error handling
                var errorResponse = XMLHttpRequest.responseJSON;
                //console.log("Bad Request error occurred.",errorResponse);
                ErrorMessage()
            } else {
                // Other error handling
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}
function GetSalesManager() {
    var ep = applicationdomain + 'api/hr/getallsalesmanager';
    var jwt = GetStoredJwt();
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: ep,
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            console.log(Response);
            ShowEmployeeForm('SALES', Response)


        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status === 401) {
                // Unauthorized error handling
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                // Bad Request error handling
                var errorResponse = XMLHttpRequest.responseJSON;
                //console.log("Bad Request error occurred.",errorResponse);
                ErrorMessage()
            } else {
                // Other error handling
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}

function GetManager(managers) {
    var ep = applicationdomain + 'api/hr/getmanager?manager=' + managers;
    var jwt = GetStoredJwt();
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: ep,
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            ShowEmployeeForm('SALES', Response)
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status === 401) {
                // Unauthorized error handling
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                // Bad Request error handling
                var errorResponse = XMLHttpRequest.responseJSON;
                //console.log("Bad Request error occurred.",errorResponse);
                ErrorMessage()
            } else {
                // Other error handling
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}



function AppendEmpTable(data) {
    if ($.fn.DataTable.isDataTable('#EmployeeDataTable')) {
        $('#EmployeeDataTable').DataTable().destroy();
    }

    $('#EmployeeDataTable').DataTable({
        data: data,
        "columns": [
            { data: "id", name: "ID" },
            { data: "fname", name: "FIRST NAME" },
            { data: "lname", name: "LAST NAME" },
            { data: "email", name: "EMAIL" },
            { data: "phone", name: "PHONE" },
            { data: "gender", name: "GENDER" },
            { data: "etype", name: "EMPTYPE" },
            { data: "division", name: "DIVISION" },
            {
                data: "status", name: "STATUS", render: function (data, type, row, meta) {
                    var rowid = row["id"];
                    var status = row["status"];
                    if(status==='DEACTIVATED'){
                        return `<span class="badge bg-label-danger"> Deactive </span>`
                    }
                    else{
                        return `<span class="badge bg-label-success"> Active </span>`
                    }
                }
            },
            { data: "cdate", name: "CREATE DATE" },
            { data: "manger", name: "MANAGER" },
            {
                data: "id", name: "ACTION", width: '50px', render: function (data, type, row, meta) {
                    var rowid = row["id"];
                    var fname = row["fname"];
                    var lname = row["lname"];
                    var status = row["status"];
                    var fullname = fname + ' ' + lname;
                    var tt = `
                    <div class="btn-group dropstart">
                    <button class="btn btn-yellotick-rev btn-xs dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Actions
                    </button>
                    <ul class="dropdown-menu" style="">
                    <li><a class="dropdown-item" href="#" onclick="GetEmployeeDetails('` + rowid + `')"">Edit</a></li>
                    <li><a class="dropdown-item" href="#" onclick="ResetPassword('` + rowid + `','` + fullname + `')"">Reset Password</a></li>
                    <li>
                        <hr class="dropdown-divider">
                    </li>
                    <li>
                    `

                    if(status==='DEACTIVATED'){
                        tt +=`<a class="dropdown-item" href="#" onclick="ReactivateUser('`+ rowid +`')">Reactivate User</a></li>
                            </ul>
                            </div>`
                    }
                    else{
                        tt +=`<a class="dropdown-item" href="#" onclick="DeactivateUser('`+ rowid +`')">Deactivate User</a></li>
                        </ul>
                        </div>`
                    }
                   
                    return tt;

                }
            }


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
            { extend: 'pageLength', className: 'btn-outline-secondary btn-sm' },
            {
                text: 'Add New HR', action: function (e, dt, node, config) {
                    AddNewUser('HR');
                },
                className: 'btn-outline-secondary btmar btn-sm',
                attr: {
                    id: 'createProjectButton1',
                    "data-bs-toggle": "modal",
                    "data-bs-target": "#modalNewProject1"
                }
            }
        ],
        autoWidth: true,
        responsive: true,
        searching: true
    });
    $('#EmployeeDataTable tbody').on('mouseover', 'tr', function () {

        $('[data-toggle="tooltip"]').tooltip({
            trigger: 'hover',
            html: true
        });
    });
    $('#EmployeeDataTable_filter').css("margin-top", "0px")
    $('#EmployeeDataTable_filter').css("margin-bottom", "5px")
}

function AppendAdminEmpTable(data) {
    if ($.fn.DataTable.isDataTable('#AdminEmployeeDataTable')) {
        $('#AdminEmployeeDataTable').DataTable().destroy();
    }

    $('#AdminEmployeeDataTable').DataTable({
        data: data,
        "columns": [
            { data: "id", name: "ID" },
            { data: "fname", name: "FIRST NAME" },
            { data: "lname", name: "LAST NAME" },
            { data: "email", name: "EMAIL" },
            { data: "phone", name: "PHONE" },
            { data: "gender", name: "GENDER" },
            { data: "etype", name: "EMPTYPE" },
            { data: "division", name: "DIVISION" },
            {
                data: "status", name: "STATUS", render: function (data, type, row, meta) {
                    var rowid = row["id"];
                    var status = row["status"];
                    if(status==='DEACTIVATED'){
                        return `<span class="badge bg-label-danger"> Deactive </span>`
                    }
                    else{
                        return `<span class="badge bg-label-success"> Active </span>`
                    }
                }
            },
            { data: "cdate", name: "CREATE DATE" },
            { data: "manger", name: "MANAGER" },
            {
                data: "id", name: "ACTION", width: '50px', render: function (data, type, row, meta) {
                    var rowid = row["id"];
                    var fname = row["fname"];
                    var lname = row["lname"];
                    var status = row["status"];
                    var fullname = fname + ' ' + lname;
                    var tt = `
                    <div class="btn-group dropstart">
                    <button class="btn btn-yellotick-rev btn-xs dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Actions
                    </button>
                    <ul class="dropdown-menu" style="">
                    <li><a class="dropdown-item" href="#" onclick="GetEmployeeDetails('` + rowid + `')"">Edit</a></li>
                    <li><a class="dropdown-item" href="#" onclick="ResetPassword('` + rowid + `','` + fullname + `')"">Reset Password</a></li>
                    <li>
                        <hr class="dropdown-divider">
                    </li>
                    <li>
                    `

                    if(status==='DEACTIVATED'){
                        tt +=`<a class="dropdown-item" href="#" onclick="ReactivateUser('`+ rowid +`')">Reactivate User</a></li>
                            </ul>
                            </div>`
                    }
                    else{
                        tt +=`<a class="dropdown-item" href="#" onclick="DeactivateUser('`+ rowid +`')">Deactivate User</a></li>
                        </ul>
                        </div>`
                    }
                   
                    return tt;

                }
            }


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
            { extend: 'pageLength', className: 'btn-outline-secondary btn-sm' },
            {
                text: 'Add New Admin', action: function (e, dt, node, config) {
                    AddNewUser('ADMIN');
                },
                className: 'btn-outline-secondary btmar btn-sm',
                attr: {
                    id: 'createProjectButton2',
                    "data-bs-toggle": "modal",
                    "data-bs-target": "#modalNewProject2"
                }
            }
        ],
        autoWidth: true,
        responsive: true,
        searching: true
    });
    $('#AdminEmployeeDataTable tbody').on('mouseover', 'tr', function () {

        $('[data-toggle="tooltip"]').tooltip({
            trigger: 'hover',
            html: true
        });
    });
    $('#AdminEmployeeDataTable_filter').css("margin-top", "0px")
    $('#AdminEmployeeDataTable_filter').css("margin-bottom", "5px")
}

function AppendSalesEmpTable(data) {
    if ($.fn.DataTable.isDataTable('#salesEmployeeDataTable')) {
        $('#salesEmployeeDataTable').DataTable().destroy();
    }

    $('#salesEmployeeDataTable').DataTable({
        data: data,
        "columns": [
            { data: "id", name: "ID" },
            { data: "fname", name: "FIRST NAME" },
            { data: "lname", name: "LAST NAME" },
            { data: "email", name: "EMAIL" },
            { data: "phone", name: "PHONE" },
            { data: "gender", name: "GENDER" },
            { data: "etype", name: "EMPTYPE" },
            { data: "division", name: "DIVISION" },
            {
                data: "status", name: "STATUS", render: function (data, type, row, meta) {
                    var rowid = row["id"];
                    var status = row["status"];
                    if(status==='DEACTIVATED'){
                        return `<span class="badge bg-label-danger"> Deactive </span>`
                    }
                    else{
                        return `<span class="badge bg-label-success"> Active </span>`
                    }
                }
            },
            { data: "cdate", name: "CREATE DATE" },
            { data: "manger", name: "MANAGER" },
            {
                data: "id", name: "ACTION", width: '50px', render: function (data, type, row, meta) {
                    var rowid = row["id"];
                    var fname = row["fname"];
                    var lname = row["lname"];
                    var status = row["status"];
                    var fullname = fname + ' ' + lname;
                    var tt = `
                    <div class="btn-group dropstart">
                    <button class="btn btn-yellotick-rev btn-xs dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Actions
                    </button>
                    <ul class="dropdown-menu" style="">
                    <li><a class="dropdown-item" href="#" onclick="GetEmployeeDetails('` + rowid + `')"">Edit</a></li>
                    <li><a class="dropdown-item" href="#" onclick="ResetPassword('` + rowid + `','` + fullname + `')"">Reset Password</a></li>
                    <li>
                        <hr class="dropdown-divider">
                    </li>
                    <li>
                    `

                    if(status==='DEACTIVATED'){
                        tt +=`<a class="dropdown-item" href="#" onclick="ReactivateUser('`+ rowid +`')">Reactivate User</a></li>
                            </ul>
                            </div>`
                    }
                    else{
                        tt +=`<a class="dropdown-item" href="#" onclick="DeactivateUser('`+ rowid +`')">Deactivate User</a></li>
                        </ul>
                        </div>`
                    }
                   
                    return tt;

                }
            }


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
            { extend: 'pageLength', className: 'btn-outline-secondary btn-sm' },
            {
                text: 'Add New Sales', action: function (e, dt, node, config) {
                    AddNewUser('SALES');
                },
                className: 'btn-outline-secondary btmar btn-sm',
                attr: {
                    id: 'createProjectButton3',
                    "data-bs-toggle": "modal",
                    "data-bs-target": "#modalNewProject3"
                }
            }
        ],
        autoWidth: true,
        responsive: true,
        searching: true
    });
    $('#salesEmployeeDataTable tbody').on('mouseover', 'tr', function () {

        $('[data-toggle="tooltip"]').tooltip({
            trigger: 'hover',
            html: true
        });
    });
    $('#salesEmployeeDataTable_filter').css("margin-top", "0px")
    $('#salesEmployeeDataTable_filter').css("margin-bottom", "5px")
}

function AddNewUser(role) {
    if (role == "SALES") {
        GetSalesManager();
    }
    else if (role == "ADMIN") {
        GetAdminManager();
    }
    else if (role == "HR") {
        GetHrManager();
    }
}
//#endregion

//#region New Employee

function ShowEmployeeForm(role, mamager) {

    var mangers = '';
    mamager.forEach(item => {
        mangers += `<option value="${item.id}">${item.fname.toUpperCase()} ${item.lname.toUpperCase()}</option>`;
    });

    var htm =
        ` 
    <div class="modal fade" id="exLargeModal" tabindex="-1" aria-modal="true" role="dialog">
    <div class="modal-dialog modal-xl modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header bgimg py-3">
          <h5 class="modal-title" id="exampleModalLabel4"><span id="model-title">ADD NEW EMPLOYEE - </span><span id="emprole">`+ role + `</span></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div id="item-body">
            <div class="card-body">
                
            <div class="row mb-lg-n4">
                <div class="col-md-4 px-4">
                    <div class="">
                        <h6 class="mb-b fw-semibold">1. Photo</h6>
                        <div id="selectedFile" class="card mb-1 p-2" style="height:155px">
                            <img id="emp-sel-photo" alt="Selected File" width="100%" src="../../assets/img/AppImages/uploadphoto.png">
                        </div>
                        <input class="form-control form-control-sm" type="file" id="formFile" onchange="displaySelectedFile()">
                    </div>
                
                </div>
                <div class="col-md-3 px-4">
                    <h6 class="mb-b fw-semibold">2. Account Details</h6>
                    <div class="row mb-2">
                        <label class="form-label mb-0" for="firstname">First Name</label>
                        <input type="text" id="firstname" class="form-control req" placeholder="First Name">
                    </div>
                    <div class="row mb-2">
                        <label class="form-label mb-0" for="lastname">Last Name</label>
                        <input type="text" id="lastname" class="form-control req" placeholder="Last Name">
                    </div>
                    <div class="row mb-2">
                        <label class="form-label mb-0" for="email">Email</label>
                        <input type="text" id="email" class="form-control req" placeholder="john.doe" aria-label="john.doe" aria-describedby="multicol-email2">
                    </div>
                </div>

                <div class="col-md-5 px-4">
                    <h6 class="mb-b fw-semibold">3. Employment Details</h6>
                    
                    <div class="row mb-3">
                    <label class="form-label mb-0">Emp Type</label>
                    <div class="">
                        <div class="col mt-2">
                        <div class="form-check form-check-inline">
                            <input name="emp-type" class="form-check-input emptypecls" type="radio" value="" id="emp-type-perm" checked="">
                            <label class="form-check-label" for="emp-type-perm">Permanent</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input name="emp-type" class="form-check-input emptypecls" type="radio" value="" id="emp-type-contract">
                            <label class="form-check-label" for="emp-type-contract">Contract</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input name="emp-type" class="form-check-input emptypecls" type="radio" value="" id="emp-type-franchise">
                            <label class="form-check-label" for="emp-type-franchise">Franchise</label>
                        </div>
                        </div>
                    </div>
                    </div>

                    <div class="row mb-3">
                    <label class="form-label  mb-0">Is Manager</label>
                    <div class="">
                        <div class="col mt-2">
                        <div class="form-check form-check-inline">
                            <input name="Is-Manager" class="form-check-input ismancls" type="radio" value="" id="Manager-yes" >
                            <label class="form-check-label" for="Manager-yes">Manager</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input name="Is-Manager" class="form-check-input ismancls" type="radio" value="" id="Manager-no" checked="">
                            <label class="form-check-label" for="Manager-no">Non-Manager</label>
                        </div>
                        </div>
                    </div>
                    </div>

                    <div class="row mb-2">
                        <label class="form-label mb-0" for="manager">Reporting To</label>
                        <div class="">
                        <select id="manager" class="select2 form-select" >
                            <option value="" selected disabled>Select manager...</option>
                        `+ mangers + `
                        </select>
                        </div>
                    </div>

                </div>
                </div>

                <hr class="my-4 mx-n4">
                <h6 class="mb-3 fw-semibold">4. Personal Info</h6>
                <div class="row g-3 mb-3">
                <div class="col-md-6">
                    <label class="col-sm-3 col-form-label" for="multicol-full-name">Gender</label>
                    <div class="col-sm-9">
                    <div class="col mt-2">
                        <div class="form-check form-check-inline">
                        <input name="gender" class="form-check-input empgend" type="radio" value="" id="gender-male" checked="">
                        <label class="form-check-label" for="gender-male">Male</label>
                        </div>
                        <div class="form-check form-check-inline">
                        <input name="gender" class="form-check-input empgend" type="radio" value="" id="gender-female">
                        <label class="form-check-label" for="gender-female">Female</label>
                        </div>
                        <div class="form-check form-check-inline">
                        <input name="gender" class="form-check-input empgend" type="radio" value="" id="gender-other">
                        <label class="form-check-label" for="gender-other">Other</label>
                        </div>
                    </div>
                    </div>
                </div>
               
                
                </div>


                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                    <label class="form-label" for="emp-phone">Phone No</label>
                    <input type="text" id="emp-phone" class="form-control phone-mask req"  placeholder="658 799 8941" aria-label="658 799 8941">
                    </div>
                    <div class="col-md-6">
                    <label class="form-label" for="emp-aadhar ">Aadhar Card Numner</label>
                    <input type="text" id="emp-aadhar" class="form-control req" placeholder="John Doe">
                    </div>
                    <div class="col-md-12">
                    <label class="form-label" for="emp-address">Address</label>
                    <input type="text" id="emp-address" class="form-control req" placeholder="John Doe">
                    </div>
                </div>
            </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-yellotick-rev"  onclick='SetNewEmployee("`+ role + `")'>
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
    `;
    $('#modelHolder').html(htm);
    $('#manager').select2(
        {
            dropdownParent: $('#exLargeModal'),
            width: '100%',
            theme: "classic"
        }
    );
    $('#manager').trigger('change');
    ShowPopupModal('exLargeModal');


}

function SetNewEmployee(role) {


    var validationerrors = FormValidator()
    if (validationerrors == 0) {
        var firstName = $("#firstname").val();
        var lastName = $("#lastname").val();
        var email = $("#email").val();

        // Retrieve employment details
        var reportingTo = $("#manager").val();
        var empTypeLabel = $('input:radio.emptypecls:checked').parent().find('label').text();
        var isManagerLabel = $('input:radio.ismancls:checked').parent().find('label').text();

        // Retrieve personal info
        var genderLabel = $('input:radio.empgend:checked').parent().find('label').text();
        var photo = $("#formFile").val();
        var phoneNumber = $("#emp-phone").val();
        var aadharCardNumber = $("#emp-aadhar").val();
        var address = $("#emp-address").val();

        // You can then perform further operations with the retrieved data, such as sending it to the server via AJAX or processing it in any other way you require.

        // For demonstration purposes, let's log the retrieved data to the console
        /* console.log("First Name:", firstName);
        console.log("Last Name:", lastName);
        console.log("Email:", email);
        console.log("Reporting To:", reportingTo);
        console.log("Employee Type:", empTypeLabel);
        console.log("Is Manager:", isManagerLabel);
        console.log("Role:", role);
        console.log("Gender:", genderLabel);
        console.log("Photo:", photo);
        console.log("Phone Number:", phoneNumber);
        console.log("Aadhar Card Number:", aadharCardNumber);
        console.log("Address:", address); */


        var form = new FormData();
        form.append("firstname", firstName);
        form.append("lastname", lastName);
        form.append("email", email);
        form.append("gender", genderLabel);
        form.append("phone", phoneNumber);
        form.append("address", address);
        form.append("aadhar", aadharCardNumber);
        form.append("manager", reportingTo);
        form.append("role", role);
        form.append("claim", isManagerLabel);
        form.append("employment", empTypeLabel);
        var fileInput = document.getElementById('formFile');
        if (fileInput.files.length > 0) {
            form.append("photo", fileInput.files[0]);
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

                        var ep = applicationdomain + 'api/hr/addemployee';
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
                                GetAllEmp();
                                HidePopupModal('exLargeModal');
                                var userdata = `<p>USERID: ${Response.userid}</p> <p>PASSWORD: ${Response.password}</p>`
                                SuccessMessage(userdata)
                            },
                            error: function (XMLHttpRequest, textStatus, errorThrown) {
                                if (XMLHttpRequest.status === 401) {
                                    // Unauthorized error handling
                                    LogoutUser()
                                }
                                else if (XMLHttpRequest.status === 400) {
                                    // Bad Request error handling
                                    var errorResponse = XMLHttpRequest.responseJSON;
                                    //console.log("Bad Request error occurred.",errorResponse);
                                    ErrorMessage()
                                } else {
                                    // Other error handling
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
//#endregion

//#region  Edit Employee
function GetEmployeeDetails(emp) {
    var ep = applicationdomain + 'api/hr/getemployee?userid=' + emp;
    var jwt = GetStoredJwt();
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: ep,
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            ShowEditForm(Response)
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status === 401) {
                // Unauthorized error handling
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                // Bad Request error handling
                var errorResponse = XMLHttpRequest.responseJSON;
                //console.log("Bad Request error occurred.",errorResponse);
                ErrorMessage()
            } else {
                // Other error handling
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}

function ShowEditForm(Response) {
    var ctr = 0;
    var defmanger1 = '<option value="" selected disabled>Select manager...</option>'
    var defmanger2 = '<option value="" disabled>Select manager...</option>'
    var mangerstemp = '';
    var mangers = '';
    Response.managerlist.forEach(item => {
        let selected = item.ismymanager ? 'selected' : ''; // Check if ismanger is true
        if (item.ismymanager == true) { ctr++ }
        mangerstemp += `<option value="${item.id}" ${selected}>${item.fname.toUpperCase()} ${item.lname.toUpperCase()}</option>`;
    });

    if (ctr > 0) {
        mangers = defmanger2 + mangerstemp
    }
    else {
        mangers = defmanger1 + mangerstemp
    }

    var htm =
        ` 
    <div class="modal fade" id="exLargeModal" tabindex="-1" aria-modal="true" role="dialog">
    <div class="modal-dialog modal-xl modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header bgimg py-3">
          <h5 class="modal-title" id="exampleModalLabel4"><span id="model-title">EDIT EMPLOYEE DATA- </span><span id="emprole">`+ Response.division + `</span></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div id="item-body">
            <div class="card-body">
                
            <div class="row mb-lg-n4">
                <div class="col-md-4 px-4">
                    <div class="">
                        <h6 class="mb-b fw-semibold">1. Photo</h6>
                        <div id="selectedFile" class="card mb-1 p-2" style="height:155px">
                            <img id="emp-sel-photo" alt="Selected File" width="100%" src="../../assets/img/AppImages/uploadphoto.png">
                        </div>
                        <input class="form-control form-control-sm" type="file" id="formFile" onchange="displaySelectedFile()">
                    </div>
                
                </div>
                <div class="col-md-3 px-4">
                    <h6 class="mb-b fw-semibold">2. Account Details</h6>
                    <div class="row mb-2">
                        <label class="form-label mb-0" for="firstname">First Name</label>
                        <input type="text" id="firstname" class="form-control req" placeholder="First Name">
                    </div>
                    <div class="row mb-2">
                        <label class="form-label mb-0" for="lastname">Last Name</label>
                        <input type="text" id="lastname" class="form-control req" placeholder="Last Name">
                    </div>
                    <div class="row mb-2">
                        <label class="form-label mb-0" for="email">Email</label>
                        <input type="text" id="email" class="form-control req" placeholder="john.doe" aria-label="john.doe" aria-describedby="multicol-email2">
                    </div>
                </div>

                <div class="col-md-5 px-4">
                    <h6 class="mb-b fw-semibold">3. Employment Details</h6>
                    
                    <div class="row mb-3">
                    <label class="form-label mb-0">Emp Type</label>
                    <div class="">
                        <div class="col mt-2">
                        <div class="form-check form-check-inline">
                            <input name="emp-type" class="form-check-input emptypecls" type="radio" value="" id="emp-type-perm" checked="">
                            <label class="form-check-label" for="emp-type-perm">Permanent</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input name="emp-type" class="form-check-input emptypecls" type="radio" value="" id="emp-type-contract">
                            <label class="form-check-label" for="emp-type-contract">Contract</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input name="emp-type" class="form-check-input emptypecls" type="radio" value="" id="emp-type-franchise">
                            <label class="form-check-label" for="emp-type-franchise">Franchise</label>
                        </div>
                        </div>
                    </div>
                    </div>

                    <div class="row mb-3">
                    <label class="form-label  mb-0">Is Manager</label>
                    <div class="">
                        <div class="col mt-2">
                        <div class="form-check form-check-inline">
                            <input name="Is-Manager" class="form-check-input ismancls" type="radio" value="" id="Manager-yes" >
                            <label class="form-check-label" for="Manager-yes">Manager</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input name="Is-Manager" class="form-check-input ismancls" type="radio" value="" id="Manager-no" checked="">
                            <label class="form-check-label" for="Manager-no">Non-Manager</label>
                        </div>
                        </div>
                    </div>
                    </div>

                    <div class="row mb-2">
                        <label class="form-label mb-0" for="manager">Reporting To</label>
                        <div class="">
                        <select id="manager" class="select2 form-select" >
                        `+ mangers + `
                        </select>
                        </div>
                    </div>

                </div>
                </div>

                <hr class="my-4 mx-n4">
                <h6 class="mb-3 fw-semibold">4. Personal Info</h6>
                <div class="row g-3 mb-3">
                <div class="col-md-6">
                    <label class="col-sm-3 col-form-label" for="multicol-full-name">Gender</label>
                    <div class="col-sm-9">
                    <div class="col mt-2">
                        <div class="form-check form-check-inline">
                        <input name="gender" class="form-check-input empgend" type="radio" value="" id="gender-male">
                        <label class="form-check-label" for="gender-male">Male</label>
                        </div>
                        <div class="form-check form-check-inline">
                        <input name="gender" class="form-check-input empgend" type="radio" value="" id="gender-female">
                        <label class="form-check-label" for="gender-female">Female</label>
                        </div>
                        <div class="form-check form-check-inline">
                        <input name="gender" class="form-check-input empgend" type="radio" value="" id="gender-other">
                        <label class="form-check-label" for="gender-other">Other</label>
                        </div>
                    </div>
                    </div>
                </div>
               
                
                </div>


                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                    <label class="form-label" for="emp-phone">Phone No</label>
                    <input type="text" id="emp-phone" class="form-control phone-mask req"  placeholder="658 799 8941" aria-label="658 799 8941">
                    </div>
                    <div class="col-md-6">
                    <label class="form-label" for="emp-aadhar ">Aadhar Card Numner</label>
                    <input type="text" id="emp-aadhar" class="form-control req" placeholder="John Doe">
                    </div>
                    <div class="col-md-12">
                    <label class="form-label" for="emp-address">Address</label>
                    <input type="text" id="emp-address" class="form-control req" placeholder="John Doe">
                    </div>
                </div>
            </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-yellotick-rev"  onclick='SetEditEmployee("`+ Response.division + `","` + Response.id + `")'>
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
    `;
    $('#modelHolder').html(htm);
    $('#manager').select2(
        {
            dropdownParent: $('#exLargeModal'),
            width: '100%',
            theme: "classic"
        }
    );
    $('#manager').trigger('change');

    $('#emp-address').val(Response.address)
    $('#emp-aadhar').val(Response.aadhar)
    $('#emp-phone').val(Response.phone)
    $('#email').val(Response.email)
    $('#lastname').val(Response.lname)
    $('#firstname').val(Response.fname)
    if (Response.gender === 'FEMALE') {
        $('#gender-female').prop("checked", true);
    }
    else if (Response.gender === 'MALE') {
        $('#gender-male').prop("checked", true);
    }
    else {
        $('#gender-other').prop("checked", true);
    }


    if (Response.ismanager == true) {
        $('#Manager-yes').prop("checked", true);
    }
    else {
        $('#Manager-no').prop("checked", true);
    }


    if (Response.etype === 'PERMANENT') {
        $('#emp-type-perm').prop("checked", true);
    }
    else if (Response.etype === 'CONTRACT') {
        $('#emp-type-contract').prop("checked", true);
    }
    else {
        $('#emp-type-franchise').prop("checked", true);
    }


    if (Response.photo != null) {
        $('#emp-sel-photo').attr("src", Response.photo);
    }


    ShowPopupModal('exLargeModal');

}

function SetEditEmployee(role, userid) {
    var validationerrors = FormValidator()
    if (validationerrors == 0) {
        var firstName = $("#firstname").val();
        var lastName = $("#lastname").val();
        var email = $("#email").val();

        // Retrieve employment details
        var reportingTo = $("#manager").val();
        var reportingToText = $("#manager").text();
        debugger
        var empTypeLabel = $('input:radio.emptypecls:checked').parent().find('label').text();
        var isManagerLabel = $('input:radio.ismancls:checked').parent().find('label').text();

        // Retrieve personal info
        var genderLabel = $('input:radio.empgend:checked').parent().find('label').text();
        var photo = $("#formFile").val();
        var phoneNumber = $("#emp-phone").val();
        var aadharCardNumber = $("#emp-aadhar").val();
        var address = $("#emp-address").val();


        var form = new FormData();
        form.append("userid", userid);
        form.append("firstname", firstName);
        form.append("lastname", lastName);
        form.append("email", email);
        form.append("gender", genderLabel);
        form.append("phone", phoneNumber);
        form.append("address", address);
        form.append("aadhar", aadharCardNumber);
        form.append("manager", reportingTo);
        form.append("role", role);
        form.append("claim", isManagerLabel);
        form.append("employment", empTypeLabel);
        var fileInput = document.getElementById('formFile');
        if (fileInput.files.length > 0) {
            form.append("photo", fileInput.files[0]);
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

                        var ep = applicationdomain + 'api/hr/editemployee';
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
                                GetAllEmp();
                                HidePopupModal('exLargeModal');
                                var userdata = `<p>Employee data updated</p>`
                                SuccessMessage2(userdata)
                            },
                            error: function (XMLHttpRequest, textStatus, errorThrown) {
                                if (XMLHttpRequest.status === 401) {
                                    // Unauthorized error handling
                                    LogoutUser()
                                }
                                else if (XMLHttpRequest.status === 400) {
                                    // Bad Request error handling
                                    var errorResponse = XMLHttpRequest.responseJSON;
                                    //console.log("Bad Request error occurred.",errorResponse);
                                    ErrorMessage()
                                } else {
                                    // Other error handling
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

function ResetPassword(userid, username) {

    var ttx = `<div class="col-12">
    <label class="form-label" for="modalEnableOTPPhone">Password</label>
    <div class="input-group input-group-merge">
    <input
      type="text"
      id="password1"
      class="form-control"
      name="password2"
      placeholder="&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;"
      aria-describedby="password"
    />
  </div>
  </div>
  <div class="col-12">
    <label class="form-label" for="modalEnableOTPPhone">Confirm Password</label>
    <div class="input-group input-group-merge">
    <input
      type="text"
      id="password2"
      class="form-control"
      name="password2"
      placeholder="&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;"
      aria-describedby="password"
    />
  </div>

  <div class="">
            <span id="ErrorMsg" class="text-danger" style="font-size: .85em; display: block;"></span>
  </div>
  </div>
  <div class="col-12">
    <button type="submit" class="btn btn-yellotick-rev me-sm-3 me-1" onclick="ResetPasswordValidate('`+ userid + `')">Submit</button>
    <button
      type="reset"
      class="btn btn-label-secondary"
      data-bs-dismiss="modal"
      aria-label="Close"
    >
      Cancel
    </button>
  </div>`


    $('#UserID-PWD').text(username);
    $('#UserName-PWD').text(userid);
    $('#enableOTPForm').html(ttx)
    ShowPopupModal('resetPasswordModel');

}

function ResetPasswordValidate(userid) {
    var pass1 = $('#password1').val();
    var pass2 = $('#password2').val();
    if (pass1 === "" || pass2 === "") {
        $('#ErrorMsg').html("Please enter new password to continue.")
    }
    else {
        if (pass1 === pass2) {
            var validation = VerifyPasswordSchema(pass1)
            if (validation.msg == true) {


                var form = new FormData();
                form.append("userid", userid);
                form.append("password", pass1);

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

                                var ep = applicationdomain + 'api/hr/resetpassword';
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
                                        HidePopupModal('resetPasswordModel');
                                        var userdata = `<p>` + Response.message + `</p>`
                                        SuccessMessage3('Password Updated!', userdata)
                                    },
                                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                                        if (XMLHttpRequest.status === 401) {
                                            // Unauthorized error handling
                                            LogoutUser()
                                        }
                                        else if (XMLHttpRequest.status === 400) {
                                            // Bad Request error handling
                                            var errorResponse = XMLHttpRequest.responseJSON;
                                            //console.log("Bad Request error occurred.",errorResponse);
                                            ErrorMessage()
                                        } else {
                                            // Other error handling
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
                $('#ErrorMsg').html(validation.err)
            }
        }
        else {
            $('#ErrorMsg').html("Password and Confirm password does not match.")
        }
    }
}


function VerifyPasswordSchema(password) {
    var lengthRegex = /.{8,}/;
    var nonAlphanumericRegex = /[^a-zA-Z0-9]/;
    var digitRegex = /\d/;
    var lowercaseRegex = /[a-z]/;
    var uppercaseRegex = /[A-Z]/; // New regular expression for at least one uppercase letter

    // Check each requirement and update the UI accordingly
    var errors = [];
    if (!lengthRegex.test(password)) {
        errors.push("Password must be at least 8 characters");
    }
    if (!nonAlphanumericRegex.test(password)) {
        errors.push("Password must have at least one non-alphanumeric character");
    }
    if (!digitRegex.test(password)) {
        errors.push("Password must have at least one digit");
    }
    if (!lowercaseRegex.test(password)) {
        errors.push("Password must have at least one lowercase letter");
    }
    if (!uppercaseRegex.test(password)) {
        errors.push("Password must have at least one uppercase letter"); // New error message
    }

    if (errors.length > 0) {
        var res = {
            msg: false,
            err: errors.join("<br>")
        };
        return res;
    }
    else {
        var res = {
            msg: true,
            err: null
        };
        return res;
    }

}

function ReactivateUser(userid){
    var form = new FormData();
    form.append("userid", userid);
    
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

                    var ep = applicationdomain + 'api/hr/reactivateuser';
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
                            GetAllEmp();
                            var userdata = `<p>User Reactivated</p>`
                            SuccessMessage3('User Status!', userdata)
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            if (XMLHttpRequest.status === 401) {
                                // Unauthorized error handling
                                LogoutUser()
                            }
                            else if (XMLHttpRequest.status === 400) {
                                // Bad Request error handling
                                var errorResponse = XMLHttpRequest.responseJSON;
                                //console.log("Bad Request error occurred.",errorResponse);
                                ErrorMessage()
                            } else {
                                // Other error handling
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

function DeactivateUser(userid){
    var form = new FormData();
    form.append("userid", userid);
    
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

                    var ep = applicationdomain + 'api/hr/deactivateuser';
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
                            GetAllEmp();
                            var userdata = `<p>User Deactivated</p>`
                            SuccessMessage3('User Status!', userdata)
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            if (XMLHttpRequest.status === 401) {
                                // Unauthorized error handling
                                LogoutUser()
                            }
                            else if (XMLHttpRequest.status === 400) {
                                // Bad Request error handling
                                var errorResponse = XMLHttpRequest.responseJSON;
                                //console.log("Bad Request error occurred.",errorResponse);
                                ErrorMessage()
                            } else {
                                // Other error handling
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

//#endregion

//#region Messages
function SuccessMessage(userdata) {
    Swal.fire({
        title: "Employee Added!",
        html: userdata,
        icon: "success"
    });
}

function SuccessMessage2(userdata) {
    Swal.fire({
        title: "Employee Updated!",
        html: userdata,
        icon: "success",
    });
    $(".swal2-confirm").removeClass("btn-primary");
    $(".swal2-confirm").addClass("btn-yellotick-rev");
}

function SuccessMessage3(Title, userdata) {
    Swal.fire({
        title: Title,
        html: userdata,
        icon: "success",
    });
    $(".swal2-confirm").removeClass("btn-primary");
    $(".swal2-confirm").addClass("btn-yellotick-rev");
}


function ErrorMessage() {
    Swal.fire({
        title: "Oops...",
        html: "Something went wrong!",
        icon: "error",
        footer: 'Please try again later.'
    });
}

//#endregion

//#region Helper
function FormValidator() {
    var elementIDs = [];
    $(".req").each(function () {
        elementIDs.push($(this).attr("id"));
    });

    var error = 0;
    elementIDs.forEach(function (id) {
        var data = $('#' + id).val();
        if (data.trim().length == 0) {
            $('#' + id).addClass('is-invalid');
            error++;
        }
        else {
            $('#' + id).removeClass('is-invalid');
        }
    });

    return error;
}
function displaySelectedFile() {
    const fileInput = document.getElementById('formFile');
    const selectedFile = fileInput.files[0];
    const fileReader = new FileReader();
    fileReader.onload = function (event) {
        const imageUrl = event.target.result;
        const selectedFileImage = document.getElementById('emp-sel-photo');
        selectedFileImage.src = imageUrl;
    };
    fileReader.readAsDataURL(selectedFile);
}
//#endregion

