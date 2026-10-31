var IsManager = false;
var AreaMap = {};
var PropertyMap = {};
var CurrentProperty = '';
var CurrentPropertyDetails = '';
var userName = '';
var userEmail = '';
var ExistingData = null;
var AllUsers = null;
var AreaSubareas = null;
var GlobarAreas = null;

window.onload = function () {
  var UserObject = GetStoredUserData();
  if (UserObject != null) {
    $('#UserName_Name').text(UserObject.name);
    userName = UserObject.name;
    userEmail = UserObject.username;
    var jwts = GetStoredUserData();
    

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
      $($.fn.dataTable.tables(true)).css('width', '100%');
      $($.fn.dataTable.tables(true)).DataTable().columns.adjust().draw();
    });

    $('.select2').select2({
      width: '100%'
    });

    SetDashboardDates();
    UpdateDashboard();

  }
  else {
    LogoutUser();
  }
};


function SetDashboardDates() {
  var currentDate = new Date();
  var firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  var lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  var formattedFirstDay = formatDate(firstDayOfMonth);
  var formattedLastDay = formatDate(lastDayOfMonth);
  $('#dash_start_date').val(formattedFirstDay);
  $('#dash_end_date').val(formattedLastDay);
}

function formatDate(date) {
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var year = date.getFullYear();

  // Pad single digit month/day with leading zero
  if (month < 10) {
    month = '0' + month;
  }
  if (day < 10) {
    day = '0' + day;
  }

  return year + '-' + month + '-' + day;
}
function formatDate2(inputDate) {
  // Split the date string into an array of year, month, and day
  var parts = inputDate.split('-');

  // Rearrange the parts to form the desired format
  var formattedDate = parts[2] + '-' + parts[1] + '-' + parts[0];

  return formattedDate;
}

function UpdateDashboard() {
  GetAllProperties();
  GetAllAreas();
  GetSubAreas();
  GetAllEmployee();
  GetAllTeams();
}



//#region Property

function GetAllProperties() {
  blockUI('#section-block');
  var ep = applicationdomain + 'api/admin/getallproperty';
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
      UpdatePropertyTable(Response)
      unblockUI('#section-block');
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
function UpdatePropertyTable(datavalues) {
  PropertyMap = {}
  datavalues.forEach(function (data) {
    PropertyMap[data.propId] = data.propName;
  });


  if ($.fn.DataTable.isDataTable('#propertyDataTable')) {
    $('#propertyDataTable').DataTable().destroy();
  }

  // Create Search Inputs
  $('#propertyDataTable thead th').each(function (i) {
    var title = $('#propertyDataTable thead th').eq($(this).index()).text();
    $(this).html(
        `<label class="header-label">${title}</label><br><input type="text" class="form-control form-control-sm" placeholder="Search..." data-index="${i}" />`
    );
  });


  var table = $('#propertyDataTable').DataTable({
    stateSave: true,
    stateDuration: -1,
    stateSave: true,
    stateDuration: -1,
    data: datavalues,
    "columns": [
      { data: "propId", name: "ID" },
      { data: "propName", name: "NAME" },
      { data: "propState", name: "STATE" },
      { data: "propCity", name: "CITY" },
      { data: "propCountry", name: "COUNTRY" },
      { data: "propType", name: "TYPE" },
      { data: "propContactPerson", name: "CONTACT PERSON" },
      { data: "propContact", name: "CONTACT NUMBER" },
      { data: "propEmail", name: "EMAIL" },
      { data: "propWebsite", name: "WEBSITE" },
      {
        data: "isactive", name: "STATUS", render: function (data, type, row, meta) {
          var rowid = row["propId"];
          var status = row["isactive"];
          if (status === false) {
            return `<span class="badge bg-label-danger"> Inactive </span>`
          }
          else {
            return `<span class="badge bg-label-success"> Active </span>`
          }
        }
      },
      {
        data: "propId", name: "ACTION", width: '150px', render: function (data, type, row, meta) {
          var rowid = row["propId"];
          return PropertyActionItemsHtml(rowid);

        }
      },
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
  $('#propertyDataTable tbody').on('mouseover', 'tr', function () {

    $('[data-toggle="tooltip"]').tooltip({
      trigger: 'hover',
      html: true
    });
  });
  $('#propertyDataTable_filter').css("margin-top", "0px")
  $('#propertyDataTable_filter').css("margin-bottom", "5px")

          // Filter event handler
          $(table.table().container()).on('keyup', 'thead input', function () {
            table
                .column($(this).data('index'))
                .search(this.value)
                .draw();
        });
}

function PropertyActionItemsHtml(jobid) {

  var htm = `<div class="text-center d-grid">
              <button class="btn btn-linkedin btn-xs collapsed rounded" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${jobid}" aria-expanded="false" aria-controls="collapse${jobid}">
                      View Actions
              </button>
              <div class="collapse" id="collapse${jobid}">
                  <div class="m-1 p-1">
                      <ul class="list-group">
                        <li class="list-group-item p-1">
                          <div class="d-grid">
                              <button class="btn btn-outline-linkedin btn-xs rounded-1" onclick="GetPropertyDetails('${jobid}')">View Details</button>
                          </div>
                        </li>
                        <li class="list-group-item p-1">
                          <div class="d-grid">
                              <button class="btn btn-outline-linkedin btn-xs rounded-1" onclick="AddEmployee('${jobid}')">Add Employee</button>
                          </div>
                        </li>
                        <li class="list-group-item p-1">
                          <div class="d-grid">
                              <button class="btn btn-outline-linkedin btn-xs rounded-1"onclick="AddTeam('${jobid}')">Add Team</button>
                          </div>
                        </li>
                      </ul>
                  </div>
              </div>
            </div>
            `
  return htm
}

function AddNewProperty() {

  var mainhtml = ` <div class="modal fade animate__animated" id="newpropertyform" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bgimg">
          <h5 class="modal-title" id="exampleModalLabel2">Add New Property</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
  
          <div class="accordion" id="collapsibleSection">
            <!-- Delivery Address -->
            <div class="card accordion-item" data-select2-id="30">
              <h2 class="accordion-header" id="headingDeliveryAddress">
                <button class="accordion-button collapsed bgimg2" type="button" data-bs-toggle="collapse"
                  data-bs-target="#collapseDeliveryAddress" aria-expanded="false" aria-controls="collapseDeliveryAddress">
                  Property Details
                </button>
              </h2>
              <div id="collapseDeliveryAddress" class="accordion-collapse collapse" aria-labelledby="headingDeliveryAddress" data-bs-parent="#collapsibleSection">
                <div class="accordion-body">
                  <div class="row g-3 mt-0" data-select2-id="29">
                    <div class="col-md-12">
                      <div class="row">
                        <label class="col-sm-2 col-form-label" for="propName">Property Name</label>
                        <div class="col-sm-10">
                          <input type="text" id="propName" class="form-control" placeholder="Property Name">
                        </div>
                      </div>
                    </div>
                    <div class="col-md-12">
                      <div class="row">
                        <label class="col-sm-2 col-form-label" for="propAddress">Address</label>
                        <div class="col-sm-10">
                          <textarea name="propAddress" class="form-control" id="propAddress" rows="4"
                            placeholder="1456, Mall Road"></textarea>
                        </div>
                      </div>
                    </div>
                    <hr class="my-4">
                    <div class="col-md-6">
                      <div class="row">
                        <label class="col-sm-3 col-form-label text-sm-end" for="propType">Property Type</label>
                        <div class="col-sm-9">
                          <input type="text" id="propType" class="form-control" placeholder="Property Type">
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="row">
                        <label class="col-sm-3 col-form-label text-sm-end" for="propCity">City</label>
                        <div class="col-sm-9">
                          <input type="text" id="propCity" class="form-control" placeholder="City">
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="row">
                        <label class="col-sm-3 col-form-label text-sm-end" for="propState">State/Province</label>
                        <div class="col-sm-9">
                          <input type="text" id="propState" class="form-control" placeholder="State/Province">
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="row">
                        <label class="col-sm-3 col-form-label text-sm-end" for="propCountry">Country</label>
                        <div class="col-sm-9">
                          <input type="text" id="propCountry" class="form-control" placeholder="Country">
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="row">
                        <label class="col-sm-3 col-form-label text-sm-end" for="propZip">Zip Code</label>
                        <div class="col-sm-9">
                          <input type="text" id="propZip" class="form-control" placeholder="Zip Code">
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="row">
                        <label class="col-sm-3 col-form-label text-sm-end" for="propZip">Images</label>
                        <div class="col-sm-9">
                          <input type="file" id="propertyIamge" class="form-control" placeholder="Property Images" multiple>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          
            <!-- Delivery Options -->
            <div class="card accordion-item">
              <h2 class="accordion-header" id="headingDeliveryOptions">
                <button class="accordion-button collapsed bgimg2" type="button" data-bs-toggle="collapse"
                  data-bs-target="#collapseDeliveryOptions" aria-expanded="false" aria-controls="collapseDeliveryOptions">
                  Contact Details
                </button>
              </h2>
              <div id="collapseDeliveryOptions" class="accordion-collapse collapse" aria-labelledby="headingDeliveryOptions" data-bs-parent="#collapsibleSection">
                <div class="accordion-body">
                  <div class="row g-3 mt-0">
                    <div class="col-md-6">
                      <div class="row">
                        <label class="col-sm-3 col-form-label text-sm-end" for="propContactPerson">Contact Person</label>
                        <div class="col-sm-9">
                          <input type="text" id="propContactPerson" class="form-control" placeholder="Contact Person">
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="row">
                        <label class="col-sm-3 col-form-label text-sm-end" for="propEmail">Email</label>
                        <div class="col-sm-9">
                          <input type="text" id="propEmail" class="form-control" placeholder="Email">
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="row">
                        <label class="col-sm-3 col-form-label text-sm-end" for="propContact">Phone Number</label>
                        <div class="col-sm-9">
                          <input type="text" id="propContact" class="form-control" placeholder="Phone Number">
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="row">
                        <label class="col-sm-3 col-form-label text-sm-end" for="propWebsite">Web Site</label>
                        <div class="col-sm-9">
                          <input type="text" id="propWebsite" class="form-control" placeholder="Web Site">
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Payment Method -->
            <div class="card accordion-item">
              <h2 class="accordion-header" id="headingPaymentMethod">
                <button class="accordion-button collapsed bgimg2" type="button" data-bs-toggle="collapse"
                  data-bs-target="#collapsePaymentMethod" aria-expanded="false" aria-controls="collapsePaymentMethod">
                 Property Areas
                </button>
              </h2>
              <div id="collapsePaymentMethod" class="accordion-collapse collapse" aria-labelledby="headingPaymentMethod" data-bs-parent="#collapsibleSection">
                <form>
                  <div class="accordion-body">
                    <div class="demo-inline-spacing mt-3">
                      <ul class="list-group" id="area-ul-holder">
                      </ul>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
  
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-outline-linkedin btn-sm" onclick="SubmitNewProperty()">Save changes</button>
        </div>
      </div>
    </div>
                    </div>`;
  $(`#modelHolder`).html(mainhtml);

  var htmlli = '';
  Object.entries(AreaMap).forEach(([key, value]) => {

    htmlli += `<li class="list-group-item">
        <div class="d-flex">
          <label class="switch switch-dark switch-sm switch-square">
            <input type="checkbox" class="switch-input propareas" id="${key}" >
            <span class="switch-toggle-slider">
              <span class="switch-on"></span>
              <span class="switch-off"></span>
            </span>
            <span class="switch-label">${value}</span>
          </label>
        </div>
      </li>`;
  });

  $('#area-ul-holder').html(htmlli);
  ShowPopupModal('newpropertyform');
}

function SubmitNewProperty() {
  var propName = $('#propName').val();
  var propState = $('#propState').val();
  var propZip = $('#propZip').val();
  var propCity = $('#propCity').val();
  var propCountry = $('#propCountry').val();
  var propAddress = $('#propAddress').val();
  var propType = $('#propType').val();
  var propContactPerson = $('#propContactPerson').val();
  var propEmail = $('#propEmail').val();
  var propWebsite = $('#propWebsite').val();
  var propContact = $('#propContact').val();
  var fileInput = document.getElementById('propertyIamge');
  var areas = [];
  const checkboxes = document.querySelectorAll('.propareas:checked');
  checkboxes.forEach((checkbox) => {
    areas.push(checkbox.id);
  });



  var form = new FormData();
  form.append("propName", propName);
  form.append("propState", propState);
  form.append("propZip", propZip);
  form.append("propCity", propCity);
  form.append("propCountry", propCountry);
  form.append("propAddress", propAddress);
  form.append("propType", propType);
  form.append("propContactPerson", propContactPerson);
  form.append("propEmail", propEmail);
  form.append("propWebsite", propWebsite);
  form.append("propContact", propContact);
  areas.forEach((area) => {
    form.append("areas", area);
  });
  for (let i = 0; i < fileInput.files.length; i++) {
    form.append("propertyIamge", fileInput.files[i]);
  }

  if (areas.length === 0) {
    NotifyToast('error', "Plase select atleast one area to continue")
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

            var ep = applicationdomain + 'api/admin/addnewproperty';
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
                  HidePopupModal('newpropertyform');
                  GetAllProperties();
                  var userdata = `<p>New Property added successfully</p>`
                  SuccessMessageCustom('New Property', userdata, 'success')
                }
                else {
                  var userdata = `<p>Failed to add new property</p>`
                  SuccessMessageCustom('New Property', userdata, 'error')
                }

              },
              error: function (XMLHttpRequest, textStatus, errorThrown) {
                if (XMLHttpRequest.status === 401) {
                  LogoutUser()
                }
                else if (XMLHttpRequest.status === 400) {
                  var errorResponse = XMLHttpRequest.responseJSON;
                  var msg = (errorResponse && errorResponse.message) ? errorResponse.message : "Validation error occurred.";
                  SuccessMessageCustom('Validation Notice', '<p class="text-danger font-weight-bold">' + msg + '</p>', 'error');
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

function AddEmployee(property) {
  var htm =
    `<div class="modal fade animate__animated" id="newpropertyEmployee" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bgimg">
          <h5 class="modal-title" id="exampleModalLabel2">Add New Employee <span id="emp-prop-name" class="text-muted">[Bolfushi respi]</span></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
  
          <div class="card">
            <div class="card-body">
              <div class="row row-bordered" data-select2-id="20">
                <div class="col-md-9">
                  <h6 class="mb-b fw-semibold text-gray text-uppercase" >1. User Details</h6>
                  <div class="row mt-3">
                    <div class="col-md-4">
                      <label class="form-label" for="emp-first-name">First Name</label>
                      <input type="text" id="emp-first-name" class="form-control" placeholder="First Name">
                    </div>
                    <div class="col-md-4">
                      <label class="form-label" for="emp-last-name">Last Name</label>
                      <input type="text" id="emp-last-name" class="form-control" placeholder="Last Name">
                    </div>
                    <div class="col-md-4">
                      <label class="form-label" for="emp-Designation">Designation</label>
                      <input type="text" id="emp-Designation" class="form-control" placeholder="Designation">
                    </div>
                    <div class="col-md-6 my-2">
                      <label class="form-label" for="emp-email">Email</label>
                      <input type="text" id="emp-email" class="form-control" placeholder="Email">
                    </div>
                    <div class="col-md-6 my-2">
                      <label class="form-label" for="emp-phone">Phone No</label>
                      <input type="text" id="emp-phone" class="form-control phone-mask" placeholder="658 799 8941" aria-label="658 799 8941">
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <h6 class="mb-b fw-semibold text-gray text-uppercase">2. User Roles</h6>
                  <div class="demo-inline-spacing mt-3">
                    <ul class="list-group" id="area-ul-holder">
                     <li class="list-group-item">
                        <div class="d-flex">
                          <label class="switch switch-dark switch-sm switch-square">
                            <input type="checkbox" class="switch-input emproles" id="emp_superadmin" >
                            <span class="switch-toggle-slider">
                              <span class="switch-on"></span>
                              <span class="switch-off"></span>
                            </span>
                            <span class="switch-label">Super Admin</span>
                          </label>
                        </div>                                 
                      </li>  
                      <li class="list-group-item">
                        <div class="d-flex">
                          <label class="switch switch-dark switch-sm switch-square">
                            <input type="checkbox" class="switch-input emproles" id="emp_oproadmin" >
                            <span class="switch-toggle-slider">
                              <span class="switch-on"></span>
                              <span class="switch-off"></span>
                            </span>
                            <span class="switch-label">Opro Admin</span>
                          </label>
                        </div>                                 
                      </li>
                    <li class="list-group-item">
                        <div class="d-flex">
                          <label class="switch switch-dark switch-sm switch-square">
                            <input type="checkbox" class="switch-input emproles" id="emp_admin" >
                            <span class="switch-toggle-slider">
                              <span class="switch-on"></span>
                              <span class="switch-off"></span>
                            </span>
                            <span class="switch-label">Resort Admin</span>
                          </label>
                        </div>                                 
                      </li>
                      <li class="list-group-item">
                        <div class="d-flex">
                          <label class="switch switch-dark switch-sm switch-square">
                            <input type="checkbox" class="switch-input emproles" id="emp_manager" >
                            <span class="switch-toggle-slider">
                              <span class="switch-on"></span>
                              <span class="switch-off"></span>
                            </span>
                            <span class="switch-label">Manager</span>
                          </label>
                        </div>
                      </li>
                      <li class="list-group-item">
                        <div class="d-flex">
                          <label class="switch switch-dark switch-sm switch-square">
                            <input type="checkbox" class="switch-input emproles" id="emp_supervisor" >
                            <span class="switch-toggle-slider">
                              <span class="switch-on"></span>
                              <span class="switch-off"></span>
                            </span>
                            <span class="switch-label">Supervisor</span>
                          </label>
                        </div>
                      </li>
                      <li class="list-group-item">
                        <div class="d-flex">
                          <label class="switch switch-dark switch-sm switch-square">
                            <input type="checkbox" class="switch-input emproles" id="emp_owner" >
                            <span class="switch-toggle-slider">
                              <span class="switch-on"></span>
                              <span class="switch-off"></span>
                            </span>
                            <span class="switch-label">Resort Owner</span>
                          </label>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

          </div>
  
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-outline-linkedin btn-sm" onclick="SubmitNewEmployee('${property}')">Save changes</button>
        </div>
      </div>
    </div>
    </div>`;
  var txt = `[${PropertyMap[property]}]`;
  $(`#modelHolder`).html(htm);
  $(`#emp-prop-name`).text(txt);
  ShowPopupModal('newpropertyEmployee');
}

function SubmitNewEmployee(propCode) {
  var emp_first_name = $('#emp-first-name').val();
  var emp_last_name = $('#emp-last-name').val();
  var emp_email = $('#emp-email').val();
  var emp_phone = $('#emp-phone').val();
  var emp_Designation= $('#emp-Designation').val();
  var roles = [];
  const checkboxes = document.querySelectorAll('.emproles:checked');
  checkboxes.forEach((checkbox) => {
    roles.push(checkbox.id);
  });

  if (emp_first_name !== '' && emp_last_name !== '' && emp_email !== '' && emp_Designation !== '' && roles.length >= 1) {
    var form = new FormData();
    form.append("propID", propCode);
    form.append("emp_first_name", emp_first_name);
    form.append("emp_last_name", emp_last_name);
    form.append("emp_email", emp_email);
    form.append("emp_phone", emp_phone);
    form.append("emp_designation", emp_Designation);
    roles.forEach((role) => {
      form.append("roles", role);
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

            var ep = applicationdomain + 'api/admin/addemployee';
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
                  HidePopupModal('newpropertyEmployee');
                  GetAllEmployee();
                  var userdata = `<p>Employee added successfully</p>`
                  SuccessMessageCustom('Employee Registration', userdata, 'success')
                }
                else {
                  var userdata = `<p>Failed to add employee</p>`
                  SuccessMessageCustom('Employee Registration', userdata, 'error')
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
    NotifyToast('error', "One or more mandatory fields empty")
  }

}

function GetPropertyDetails(property) {
  blockUI('#section-block');
  var ep = applicationdomain + 'api/admin/getproperty';
  var jwt = GetStoredJwt();

  var form = new FormData();
  form.append("propId", property);

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
      CurrentPropertyDetails = Response;
      ShowPropertyDetails(Response)

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

function ShowPropertyDetails(details) {

  CurrentProperty = details.propId;
  var mainhtml = ` <div class="modal fade animate__animated" id="editpropertyform" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content">
          <div class="modal-header bgimg">
              <h5 class="modal-title" id="exampleModalLabel2">Add New Property</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">

              <div class="accordion" id="collapsibleSection">
                  <!-- Delivery Address -->
                  <div class="card accordion-item" data-select2-id="30">
                      <h2 class="accordion-header" id="headingDeliveryAddress">
                          <button class="accordion-button collapsed bgimg2" type="button" data-bs-toggle="collapse"
                              data-bs-target="#collapseDeliveryAddress" aria-expanded="false"
                              aria-controls="collapseDeliveryAddress">
                              Property Details
                          </button>
                      </h2>
                      <div id="collapseDeliveryAddress" class="accordion-collapse collapse"
                          aria-labelledby="headingDeliveryAddress" data-bs-parent="#collapsibleSection">
                          <div class="accordion-body">
                              <div class="row g-3 mt-0" data-select2-id="29">
                                  <div class="col-md-12">
                                      <div class="row">
                                          <label class="col-sm-2 col-form-label" for="propName">Property Name</label>
                                          <div class="col-sm-10">
                                              <input type="text" id="propName" class="form-control"
                                                  placeholder="Property Name">
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-12">
                                      <div class="row">
                                          <label class="col-sm-2 col-form-label" for="propAddress">Address</label>
                                          <div class="col-sm-10">
                                              <textarea name="propAddress" class="form-control" id="propAddress"
                                                  rows="4" placeholder="1456, Mall Road"></textarea>
                                          </div>
                                      </div>
                                  </div>
                                  <hr class="my-4">
                                  <div class="col-md-6">
                                      <div class="row">
                                          <label class="col-sm-3 col-form-label text-sm-end" for="propType">Property
                                              Type</label>
                                          <div class="col-sm-9">
                                              <input type="text" id="propType" class="form-control"
                                                  placeholder="Property Type">
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-6">
                                      <div class="row">
                                          <label class="col-sm-3 col-form-label text-sm-end"
                                              for="propCity">City</label>
                                          <div class="col-sm-9">
                                              <input type="text" id="propCity" class="form-control"
                                                  placeholder="City">
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-6">
                                      <div class="row">
                                          <label class="col-sm-3 col-form-label text-sm-end"
                                              for="propState">State/Province</label>
                                          <div class="col-sm-9">
                                              <input type="text" id="propState" class="form-control"
                                                  placeholder="State/Province">
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-6">
                                      <div class="row">
                                          <label class="col-sm-3 col-form-label text-sm-end"
                                              for="propCountry">Country</label>
                                          <div class="col-sm-9">
                                              <input type="text" id="propCountry" class="form-control"
                                                  placeholder="Country">
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-6">
                                      <div class="row">
                                          <label class="col-sm-3 col-form-label text-sm-end" for="propZip">Zip
                                              Code</label>
                                          <div class="col-sm-9">
                                              <input type="text" id="propZip" class="form-control"
                                                  placeholder="Zip Code">
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-6">
                                      <div class="row">
                                          <label class="col-sm-3 col-form-label text-sm-end"
                                              for="propZip">Images</label>
                                          <div class="col-sm-9">
                                              <input type="file" id="propertyIamge" class="form-control"
                                                  placeholder="Property Images" multiple>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <!-- Delivery Options -->
                  <div class="card accordion-item">
                      <h2 class="accordion-header" id="headingDeliveryOptions">
                          <button class="accordion-button collapsed bgimg2" type="button" data-bs-toggle="collapse"
                              data-bs-target="#collapseDeliveryOptions" aria-expanded="false"
                              aria-controls="collapseDeliveryOptions">
                              Contact Details
                          </button>
                      </h2>
                      <div id="collapseDeliveryOptions" class="accordion-collapse collapse"
                          aria-labelledby="headingDeliveryOptions" data-bs-parent="#collapsibleSection">
                          <div class="accordion-body">
                              <div class="row g-3 mt-0">
                                  <div class="col-md-6">
                                      <div class="row">
                                          <label class="col-sm-3 col-form-label text-sm-end"
                                              for="propContactPerson">Contact Person</label>
                                          <div class="col-sm-9">
                                              <input type="text" id="propContactPerson" class="form-control"
                                                  placeholder="Contact Person">
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-6">
                                      <div class="row">
                                          <label class="col-sm-3 col-form-label text-sm-end"
                                              for="propEmail">Email</label>
                                          <div class="col-sm-9">
                                              <input type="text" id="propEmail" class="form-control"
                                                  placeholder="Email">
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-6">
                                      <div class="row">
                                          <label class="col-sm-3 col-form-label text-sm-end" for="propContact">Phone
                                              Number</label>
                                          <div class="col-sm-9">
                                              <input type="text" id="propContact" class="form-control"
                                                  placeholder="Phone Number">
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-6">
                                      <div class="row">
                                          <label class="col-sm-3 col-form-label text-sm-end" for="propWebsite">Web
                                              Site</label>
                                          <div class="col-sm-9">
                                              <input type="text" id="propWebsite" class="form-control"
                                                  placeholder="Web Site">
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <!-- Payment Method -->
                  <div class="card accordion-item">
                      <h2 class="accordion-header" id="headingPaymentMethod">
                          <button class="accordion-button collapsed bgimg2" type="button" data-bs-toggle="collapse"
                              data-bs-target="#collapsePaymentMethod" aria-expanded="false"
                              aria-controls="collapsePaymentMethod">
                              Property Areas
                          </button>
                      </h2>
                      <div id="collapsePaymentMethod" class="accordion-collapse collapse"
                          aria-labelledby="headingPaymentMethod" data-bs-parent="#collapsibleSection">
                          <div>
                              <div class="accordion-body">
                                  <div class="demo-inline-spacing mt-3">
                                      <ul class="list-group" id="area-ul-holder">
                                      </ul>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                   <!-- Image Method -->
                   <div class="card accordion-item">
                      <h2 class="accordion-header" id="headingImageMethod">
                          <button class="accordion-button collapsed bgimg2" type="button" data-bs-toggle="collapse"
                              data-bs-target="#collapseImageMethod" aria-expanded="false"
                              aria-controls="collapseImageMethod">
                              Property Images
                          </button>
                      </h2>
                      <div id="collapseImageMethod" class="accordion-collapse collapse"
                          aria-labelledby="headingImageMethod" data-bs-parent="#collapsibleSection">
                          <div>
                              <div class="accordion-body">
                                  <div class="demo-inline-spacing mt-3">
                                  <div class="card" >
                                  <h5 class="card-header">Select Images To Delete</h5>
                                  <div class="card-body" style=" height: 300px; overflow: auto; ">
                                    <div class="row" id="prop-img-holder">
                                      <div class="col-md mb-md-0 mb-2">
                                        <div class="form-check custom-option custom-option-image custom-option-image-check">
                                          <input class="form-check-input" type="checkbox" value="" id="customCheckboxImg1">
                                          <label class="form-check-label custom-option-content" for="customCheckboxImg1">
                                            <span class="custom-option-body">
                                              <img src="admincssjs/theme/assets/img/backgrounds/3.jpg" alt="cbImg">
                                            </span>
                                          </label>
                                        </div>
                                      </div>
                                      <div class="col-md mb-md-0 mb-2">
                                        <div class="form-check custom-option custom-option-image custom-option-image-check">
                                          <input class="form-check-input" type="checkbox" value="" id="customCheckboxImg2">
                                          <label class="form-check-label custom-option-content" for="customCheckboxImg2">
                                            <span class="custom-option-body">
                                              <img src="admincssjs/theme/assets/img/backgrounds/5.jpg" alt="cbImg">
                                            </span>
                                          </label>
                                        </div>
                                      </div>
                                      <div class="col-md">
                                        <div class="form-check custom-option custom-option-image custom-option-image-check ">
                                          <input class="form-check-input" type="checkbox" value="" id="customCheckboxImg3">
                                          <label class="form-check-label custom-option-content" for="customCheckboxImg3">
                                            <span class="custom-option-body">
                                              <img src="admincssjs/theme/assets/img/backgrounds/8.jpg" alt="cbImg">
                                            </span>
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>


              </div>
          </div>
          <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                  Close
              </button>
              <button type="button" class="btn btn-outline-linkedin btn-sm" onclick="UpdateProperty()">Save
                  changes</button>
          </div>
      </div>
  </div>
</div>`;
  $(`#modelHolder`).html(mainhtml);

  var htmlli = '';
  Object.entries(AreaMap).forEach(([key, value]) => {

    var areaDetails = details.propAreas.find(area => area.areaid === key);
    var isVilla = areaDetails && areaDetails.isvilla;
    
    
    htmlli += `<li class="list-group-item">
      <div class="d-flex justify-content-between">
        <label class="switch switch-dark switch-sm switch-square">
          <input type="checkbox" class="switch-input propareas" id="${key}" >
          <span class="switch-toggle-slider">
            <span class="switch-on"></span>
            <span class="switch-off"></span>
          </span>
          <span class="switch-label">${value}</span>
        </label>
       
        <div>
        <button class="btn btn-outline-secondary btn-xs" onclick="EditSubAreaForm('${key}', '${CurrentProperty}')">Sub Areas</button>
        ${isVilla ? `<button class="btn btn-outline-primary btn-xs ms-1" onclick="VillaFunction('${key}', '${CurrentProperty}')">Villa Options</button>` : ''}
      </div>
      </div>
    </li>`;
  });

  $('#area-ul-holder').html(htmlli);

  $('#exampleModalLabel2').text(details.propName)
  $('#propName').val(details.propName)
  $('#propState').val(details.propState)
  $('#propZip').val(details.propZip)
  $('#propCity').val(details.propCity)
  $('#propCountry').val(details.propCountry)
  $('#propAddress').val(details.propAddress)
  $('#propContactPerson').val(details.propContactPerson)
  $('#propEmail').val(details.propEmail)
  $('#propWebsite').val(details.propWebsite)
  $('#propContact').val(details.propContact)
  $('#propType').val(details.propType)
  $.each(details.propAreas, function (index, area) {
    $('#' + area.areaid).prop("checked", true);
  });

  var imghtm = '';
  $.each(details.propImage, function (index, img) {
    imghtm += `<div class="col-md mb-md-0 mb-2">
    <div class="form-check custom-option custom-option-image custom-option-image-check">
      <input class="form-check-input delimgs" type="checkbox" value="" id="${img.fileId}">
      <label class="form-check-label custom-option-content" for="${img.fileId}">
        <span class="custom-option-body">
          <img src="${img.fileName}" alt="cbImg">
        </span>
      </label>
    </div>
  </div>`;
  });
  $('#prop-img-holder').html(imghtm)
  ShowPopupModal('editpropertyform');
}

function VillaFunction(areaID, propid){
  HidePopupModal('editVillaAreaModal');
  HidePopupModal('editpropertyform');
  let areaSubareas = [];

  // Find the specific area in propAreas
  const selectedArea = CurrentPropertyDetails.propAreas.find(area => area.areaid === areaID);
  
  // If area exists and has subareas, get them
  if (selectedArea && selectedArea.villasList) {
    areaSubareas = selectedArea.villasList;
  }
  
  let subareasList = '';
  if (areaSubareas && areaSubareas.length > 0) {
    areaSubareas.forEach(subarea => {
      subareasList += `
        <div class="d-flex align-items-center mb-2">
          <input type="text" class="form-control me-2" value="${subarea.villaName}" id="${subarea.villaId}"/>
           <button type="button" class="btn btn-outline-linkedin btn-sm me-1" onclick="UpdateVillaName('${propid}','${areaID}', '${subarea.villaId}')">
            <i class="bx bx-revision"></i>
          </button>
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="DeleteVilla('${propid}','${areaID}', '${subarea.villaId}')">
            <i class="bx bx-trash"></i>
          </button>
        </div>
      `;
    });
  } else {
    subareasList = '<p class="text-muted">No villas added yet.</p>';
  }

  var htm = `<div class="modal fade" id="editVillaAreaModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg" >
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title">Manage Villa for ${AreaMap[areaID]}</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Add New Villa</label>
            <div class="d-flex">
              <input type="text" class="form-control me-2" placeholder="Enter Villa Name" id="new-villaid-name"/>
              <button type="button" class="btn btn-outline-linkedin" onclick="AddNewVilla('${areaID}','${propid}')">
                Add
              </button>
            </div>
          </div>
          
          <div class="mt-4">
            <label class="form-label">Existing Villas</label>
            <div class="subarea-list">
              ${subareasList}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>`;

  $('#modelHolder').html(htm);
  ShowPopupModal('editVillaAreaModal');
}

function AddNewVilla(areaID, propId){
  var villaname = $('#new-villaid-name').val();
  var form = new FormData();
  form.append("propId", propId);
  form.append("areaId", areaID);
  form.append("villa", villaname);

  var ep = applicationdomain + 'api/admin/addnewvilla';
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
      CurrentPropertyDetails = Response.property;
      VillaFunction(areaID, propId)
      

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

function UpdateVillaName(propId,areaID,villaID){
  var villaname = $('#'+ villaID).val();
  var form = new FormData();
  form.append("propId", propId);
  form.append("areaId", areaID);
  form.append("villaid", villaID);
  form.append("villa", villaname);

  var ep = applicationdomain + 'api/admin/updatevilla';
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
      console.log(Response);
      CurrentPropertyDetails = Response.property;
      VillaFunction(areaID, propId)


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

function DeleteVilla(propId,areaID,villaID){
  var form = new FormData();
  form.append("propId", propId);
  form.append("areaId", areaID);
  form.append("villaid", villaID);
  
  var ep = applicationdomain + 'api/admin/deletevilla';
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
      console.log(Response);
      CurrentPropertyDetails = Response.property;
      VillaFunction(areaID, propId)


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

function UpdateProperty() {
  var propName = $('#propName').val();
  var propState = $('#propState').val();
  var propZip = $('#propZip').val();
  var propCity = $('#propCity').val();
  var propCountry = $('#propCountry').val();
  var propAddress = $('#propAddress').val();
  var propType = $('#propType').val();
  var propContactPerson = $('#propContactPerson').val();
  var propEmail = $('#propEmail').val();
  var propWebsite = $('#propWebsite').val();
  var propContact = $('#propContact').val();
  var fileInput = document.getElementById('propertyIamge');
  var areas = [];
  const checkboxes = document.querySelectorAll('.propareas:checked');
  checkboxes.forEach((checkbox) => {
    areas.push(checkbox.id);
  });

  var delimages = [];
  const checkboxesdel = document.querySelectorAll('.delimgs:checked');
  checkboxesdel.forEach((checkbox) => {
    delimages.push(checkbox.id);
  });

  console.log(CurrentProperty)


  var form = new FormData();
  form.append("propID", CurrentProperty);
  form.append("propName", propName);
  form.append("propState", propState);
  form.append("propZip", propZip);
  form.append("propCity", propCity);
  form.append("propCountry", propCountry);
  form.append("propAddress", propAddress);
  form.append("propType", propType);
  form.append("propContactPerson", propContactPerson);
  form.append("propEmail", propEmail);
  form.append("propWebsite", propWebsite);
  form.append("propContact", propContact);
  areas.forEach((area) => {
    form.append("areas", area);
  });
  delimages.forEach((imgs) => {
    form.append("delimg", imgs);
  });

  for (let i = 0; i < fileInput.files.length; i++) {
    form.append("propertyIamge", fileInput.files[i]);
  }



  if (areas.length === 0) {
    NotifyToast('error', "Plase select atleast one area to continue")
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

            var ep = applicationdomain + 'api/admin/updateproperty';
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
                  HidePopupModal('editpropertyform');
                  GetAllProperties();
                  var userdata = `<p>Property updated successfully</p>`
                  SuccessMessageCustom('Update Property', userdata, 'success')
                }
                else {
                  var userdata = `<p>Failed to update property</p>`
                  SuccessMessageCustom('Update Property', userdata, 'error')
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

function AddTeam(prop) {
  blockUI('#section-block');
  var form = new FormData();
  form.append("propId", prop);

  var ep = applicationdomain + 'api/admin/getallpropusers';
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
      console.log(Response);

      $('#newteam-fullname').val('');
      $('#team-prop-name').text('[' + Response.propName + ']')
      $('#collapsible-manager').empty();
      Response.propManager.forEach(function (emp) {
        $('#collapsible-manager').append('<option value="' + emp.userName + '">' + emp.firstName + ' ' + emp.lastName + '</option>');
      });

      $('#collapsible-member').empty();
      Response.propEmp.forEach(function (emp) {
        $('#collapsible-member').append('<option value="' + emp.userName + '">' + emp.firstName + ' ' + emp.lastName + '</option>');
      });
      CurrentProperty = Response.propid;
      ShowPopupModal('addNewTeam');
      $('.jbtclsdd').select2({
        width: '100%',
        dropdownParent: $('#addNewTeam')
      });

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

function CreateNewTeam() {
  var teamName = $('#newteam-fullname').val();
  var teamManager = $('#collapsible-manager').val();
  var teamMembers = $('#collapsible-member').val();

  if (teamName !== '' && teamManager !== '' & teamMembers.length > 0) {

    var form = new FormData();
    form.append("propId", CurrentProperty);
    form.append("teamName", teamName);
    form.append("managerID", teamManager);
    teamMembers.forEach((mem) => {
      form.append("memberID", mem);
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

            var ep = applicationdomain + 'api/admin/addnewteam';
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
                  HidePopupModal('addNewTeam');
                  GetAllTeams();
                  var userdata = `<p>Team added successfully</p>`
                  SuccessMessageCustom('Property Teams', userdata, 'success')
                }
                else {
                  var userdata = `<p>Failed to add team</p>`
                  SuccessMessageCustom('Property Teams', userdata, 'error')
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
    NotifyToast('error', "Plase enter all required values")
  }

}

var allTeamsCache = [];
var currentTeamFilter = 'ALL';

function FilterTeamsByStatus(status) {
  currentTeamFilter = status;
  $('#teamStatusFilterGroup button').removeClass('active');
  if (status === 'ALL') $('#btnFilterAllTeams').addClass('active');
  else if (status === 'ACTIVE') $('#btnFilterActiveTeams').addClass('active');
  else if (status === 'INACTIVE') $('#btnFilterInactiveTeams').addClass('active');

  var filtered = allTeamsCache;
  if (status === 'ACTIVE') {
    filtered = allTeamsCache.filter(function(t) { return t.isactive !== false && t.isactive !== 0; });
  } else if (status === 'INACTIVE') {
    filtered = allTeamsCache.filter(function(t) { return t.isactive === false || t.isactive === 0; });
  }
  RenderTeamsDataTable(filtered);
}

function ToggleTeamStatus(propId, teamId, isActive) {
  var jwt = GetStoredJwt();
  var ep = applicationdomain + 'api/admin/toggleteamstatus';
  var formData = new FormData();
  formData.append('propId', propId);
  formData.append('teamId', teamId);
  formData.append('isActive', isActive);

  blockUI('#section-block');
  $.ajax({
    url: ep,
    type: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    headers: {
      'Authorization': 'Bearer ' + jwt
    },
    success: function (res) {
      unblockUI('#section-block');
      toastr.success(isActive ? 'Team marked active successfully!' : 'Team marked inactive successfully!');
      GetAllTeams();
    },
    error: function (xhr) {
      unblockUI('#section-block');
      toastr.error('Failed to update team status');
    }
  });
}

function GetAllTeams() {
  blockUI('#section-block');
  var ep = applicationdomain + 'api/admin/getallteams';
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
      allTeamsCache = Response || [];
      FilterTeamsByStatus(currentTeamFilter);
      unblockUI('#section-block');
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

function UpdateTeamsTable(datavalues) {
  allTeamsCache = datavalues || [];
  FilterTeamsByStatus(currentTeamFilter);
}

function RenderTeamsDataTable(datavalues) {
  if ($.fn.DataTable.isDataTable('#teamDataTable')) {
    $('#teamDataTable').DataTable().destroy();
  }

  // Create Search Inputs
  $('#teamDataTable thead th').each(function (i) {
    var title = $('#teamDataTable thead th').eq($(this).index()).text();
    $(this).html(
        `<label class="header-label">${title}</label><br><input type="text" class="form-control form-control-sm" placeholder="Search..." data-index="${i}" />`
    );
  });

 var table = $('#teamDataTable').DataTable({
    data: datavalues,
    stateSave: true,
    stateDuration: -1,
    "columns": [
      { data: "propID", name: "PROPERTY ID" },
      { data: "propName", name: "PROPERTY NAME" },
      { data: "teamId", name: "TEAM ID" },
      { data: "teamName", name: "TEAM NAME" },
      {
        data: "manager", name: "MANAGER", render: function (data, type, row, meta) {
          var rowid = row["manager"];
          if (!rowid) return "-";
          var tt = `${rowid.firstName || ""} ${rowid.lastName || ""}`.trim();
          return tt || "-";
        }
      },
      {
        data: "members", name: "TOTAL MEMBERS", render: function (data, type, row, meta) {
          var rowid = row["members"];
          var tt = Array.isArray(rowid) ? rowid.length : 0;
          return tt;
        }
      },
      {
        data: "isactive", name: "STATUS", render: function (data, type, row, meta) {
          var status = row["isactive"];
          if (status === false || status === 0) {
            return `<span class="badge bg-label-danger"> Inactive </span>`;
          } else {
            return `<span class="badge bg-label-success"> Active </span>`;
          }
        }
      },
      {
        data: "teamId", name: "ACTION", width: '220px', render: function (data, type, row, meta) {
          var rowid = row["propID"];
          var teamId = row["teamId"];
          var isActive = row["isactive"] !== false && row["isactive"] !== 0;
          var toggleBtn = isActive
            ? `<button class="btn btn-outline-danger btn-xs rounded-1 ms-1" onclick="ToggleTeamStatus('${rowid}','${teamId}',false)"><i class="bx bx-power-off me-1"></i>Deactivate</button>`
            : `<button class="btn btn-outline-success btn-xs rounded-1 ms-1" onclick="ToggleTeamStatus('${rowid}','${teamId}',true)"><i class="bx bx-check me-1"></i>Activate</button>`;
          var tt = `<button class="btn btn-linkedin btn-xs rounded-1" onclick="EditTeam('${rowid}','${teamId}')">Edit Team</button>` + toggleBtn;
          return tt;
        }
      },
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
    searching: true,
    initComplete: function () {
      var state = this.api().state.loaded();
      if (state) {
        this.api().columns().eq(0).each(function (colIdx) {
          var colSearch = state.columns[colIdx].search;
          if (colSearch && colSearch.search) {
            $('#teamDataTable thead input[data-index="' + colIdx + '"]').val(colSearch.search);
          }
        });
      }
    }
  });
  $('#teamDataTable tbody').on('mouseover', 'tr', function () {

    $('[data-toggle="tooltip"]').tooltip({
      trigger: 'hover',
      html: true
    });
  });
  $('#teamDataTable_filter').css("margin-top", "0px")
  $('#teamDataTable_filter').css("margin-bottom", "5px")

        // Filter event handler
        $(table.table().container()).on('keyup', 'thead input', function () {
          table
              .column($(this).data('index'))
              .search(this.value)
              .draw();
      });
}

function EditTeam(propID, teamID) {
  var form = new FormData();
  form.append("propId", propID);

  var ep = applicationdomain + 'api/admin/getallpropusers';
  var es = applicationdomain + 'api/admin/getteambyid';
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


      var form2 = new FormData();
      form2.append("propId", propID);
      form2.append("teamID", teamID);

      $.ajax({
        url: es,
        type: 'POST',
        dataType: 'json',
        data: form2,
        processData: false,
        contentType: false,
        headers: {
          "Authorization": "Bearer " + jwt
        },
        success: function (Response1) {
          AllUsers = null;
          AllUsers = Response;
          ExistingData = null;
          ExistingData = Response1;

          var htm = `<div class="modal fade" id="updateTeam" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-lg modal-dialog-centered">
                          <div class="modal-content">      
                            <div class="modal-header bgimg2">
                              <h5 class="modal-title" id="exampleModalLabel2">Update Team <span id="team-prop-name1" class="text-muted"></span></h5>
                              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                              <div>
                                <div class="mb-3">

                                  <label class="form-label" for="updateteam-fullname">Team Name<span style="color: red;">*</span></label>
                                  <input type="text" class="form-control" id="updateteam-fullname" placeholder="Team Name">

                                </div>
                                <div class="mb-3">
                                  <label class="form-label" for="collapsible-manager1">Manager<span style="color: red;">*</span></label>
                                  <select id="collapsible-manager1" class="select2 form-select jbtclsdd">
                                  </select>
                                </div>
                                <div class="mb-3">
                                  <label class="form-label" for="collapsible-member1">Team Members<span style="color: red;">*</span></label>
                                  <select id="collapsible-member1" class="select2 form-select jbtclsdd" multiple>
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div class="modal-footer">
                              <div class="row" style="width:100%">
                                <div class="col-6 d-flex">
                                  <button class="btn btn-outline-linkedin btn-sm" onclick="AddSubTeam('${teamID}','${propID}','${ExistingData.teamName}')">Add Sub Team</button>
                                  <div id="subteam-holder" class="mx-1">
                                  </div>  
                                </div>
                                <div class="col-6 d-flex justify-content-end">
                                    <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                                      Close
                                    </button>
                                    <button type="button" class="btn btn-outline-linkedin btn-sm mx-2" onclick="UpdateTeams('${teamID}','${propID}')">Save changes</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>`

          $('#teams2').html(htm)
          $('#team-prop-name1').text('[' + AllUsers.propName + ']')
          $('#collapsible-manager1').empty();

          AllUsers.propManager.forEach(function (emp) {
            $('#collapsible-manager1').append('<option value="' + emp.userName + '">' + emp.firstName + ' ' + emp.lastName + '</option>');
          });

          $('#collapsible-member1').empty();
          AllUsers.propEmp.forEach(function (emp) {
            $('#collapsible-member1').append('<option value="' + emp.userName + '">' + emp.firstName + ' ' + emp.lastName + '</option>');
          });

          $('#updateteam-fullname').val(ExistingData.teamName)

          $('#collapsible-manager1').val(ExistingData.manager.email);
          $('#collapsible-manager1').trigger('change');

          var selectedMembers = [];
          ExistingData.members.forEach(function (emp) {
            selectedMembers.push(emp.email);
          });

          $('#collapsible-member1').val(selectedMembers);
          $('#collapsible-member1').trigger('change');



          var subcount = 0;
          var subteam = ``;

          $.each(Response1.subteams, function (index, med) {
            var subteamName = med.subteamName;
            var subteamId = med.subteamId;
            var propId = med.propId;
            var teamId = Response1.teamId;
            var teamName = Response1.teamName;
            subteam += ` <li><a class="dropdown-item" onclick="EditSubTeamItem('${subteamId}','${teamId}','${subteamName}','${propId}')">${subteamName}</a></li>`
            var ssss = ` <option value="${subteamId}">${subteamName}</option>`
            subcount++;
          });

          if (subcount > 0) {

            var ddlist = `<div class="btn-group">
                      <button type="button" class="btn btn-outline-secondary btn-sm">Edit Sub Teams</button>
                      <button type="button" class="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                        <span class="visually-hidden">Toggle Dropdown</span>
                      </button>
                      <ul class="dropdown-menu" style="">
                        ${subteam}
                      </ul>
                    </div>`

            $('#subteam-holder').html(ddlist)
          }
          else {
            $('#subteam-holder').html('')
          }

          ShowPopupModal('updateTeam');
          $('.jbtclsdd').select2({
            width: '100%',
            dropdownParent: $('#updateTeam')
          });
          $('.jbtclsddx').select2({
            width: '60%',
            dropdownParent: $('#updateTeam')
          });



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

function UpdateTeams(teamID, propID) {
  var teamName = $('#updateteam-fullname').val();
  var teamManager = $('#collapsible-manager1').val();
  var teamMembers = $('#collapsible-member1').val();

  if (teamName !== '' && teamManager !== '' & teamMembers.length > 0) {

    var form = new FormData();
    form.append("propId", propID);
    form.append("teamId", teamID);
    form.append("teamName", teamName);
    form.append("managerID", teamManager);
    teamMembers.forEach((mem) => {
      form.append("memberID", mem);
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

            var ep = applicationdomain + 'api/admin/updateteam';
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
                  GetAllTeams();
                  HidePopupModal('updateTeam');
                  var userdata = `<p>Team modified successfully</p>`
                  SuccessMessageCustom('Property Teams', userdata, 'success')
                }
                else {
                  var userdata = `<p>Failed to modify team</p>`
                  SuccessMessageCustom('Property Teams', userdata, 'error')
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
    NotifyToast('error', "Plase enter all required values")
  }
}

function AddSubTeam(teamID, propID, MainTeam) {
  var form = new FormData();
  form.append("propId", propID);
  form.append("teamId", teamID);

  var ep = applicationdomain + 'api/admin/getmainteamusers';
  var es = applicationdomain + 'api/admin/getteambyid';
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


      var form2 = new FormData();
      form2.append("propId", propID);
      form2.append("teamID", teamID);

      $.ajax({
        url: es,
        type: 'POST',
        dataType: 'json',
        data: form2,
        processData: false,
        contentType: false,
        headers: {
          "Authorization": "Bearer " + jwt
        },
        success: function (Response1) {
          
          HidePopupModal('updateTeam');
          var AllUsers = Response
          var ExistingData = Response1;
          
          var htm = `<div class="modal fade" id="updateTeam" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-lg modal-dialog-centered">
                          <div class="modal-content">      
                            <div class="modal-header bgimg2">
                              <h5 class="modal-title">Add Sub Team [${MainTeam}] <span id="team-prop-name1" class="text-muted"></span></h5>
                              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                              <div>
                                <div class="mb-3">

                                  <label class="form-label" for="updateteam-fullname1">Sub Team Name<span style="color: red;">*</span></label>
                                  <input type="text" class="form-control" id="updateteam-fullname1" placeholder="Team Name">

                                </div>
                                <div class="mb-3">
                                  <label class="form-label" for="collapsible-manager2">Manager<span style="color: red;">*</span></label>
                                  <select id="collapsible-manager2" class="select2 form-select jbtclsdd">
                                  </select>
                                </div>
                                <div class="mb-3">
                                  <label class="form-label" for="collapsible-member2">Team Members<span style="color: red;">*</span></label>
                                  <select id="collapsible-member2" class="select2 form-select jbtclsdd" multiple>
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div class="modal-footer">
                                    <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                                      Close
                                    </button>
                                    <button type="button" class="btn btn-outline-linkedin btn-sm mx-2" onclick="AddUpdateSubTeams('${teamID}','${propID}')">Save changes</button>
                            </div>
                          </div>
                        </div>
                      </div>`

          $('#teams2').html(htm)
          $('#team-prop-name1').text('[' + AllUsers.propName + ']')
          $('#collapsible-manager2').empty();

          AllUsers.propManager.forEach(function (emp) {
            $('#collapsible-manager2').append('<option value="' + emp.userName + '">' + emp.firstName + ' ' + emp.lastName + '</option>');
          });

          $('#collapsible-member2').empty();
          AllUsers.propEmp.forEach(function (emp) {
            $('#collapsible-member2').append('<option value="' + emp.userName + '">' + emp.firstName + ' ' + emp.lastName + '</option>');
          });

          // $('#updateteam-fullname').val(ExistingData.teamName)
          // $('#collapsible-manager1').val(ExistingData.manager.email);
          // $('#collapsible-manager1').trigger('change');

          var selectedMembers = [];
          ExistingData.members.forEach(function (emp) {
            selectedMembers.push(emp.email);
          });

          //$('#collapsible-member1').val(selectedMembers);
          //$('#collapsible-member1').trigger('change');

          ShowPopupModal('updateTeam');

          $('.jbtclsdd').select2({
            width: '100%',
            dropdownParent: $('#updateTeam')
          });



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

function AddUpdateSubTeams(teamID, propID) {
  var teamName = $('#updateteam-fullname1').val();
  var teamManager = $('#collapsible-manager2').val();
  var teamMembers = $('#collapsible-member2').val();

  if (teamName !== '' && teamManager !== '' & teamMembers.length > 0) {

    var form = new FormData();
    form.append("propId", propID);
    form.append("teamId", teamID);
    form.append("teamName", teamName);
    form.append("managerID", teamManager);
    teamMembers.forEach((mem) => {
      form.append("memberID", mem);
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

            var ep = applicationdomain + 'api/admin/addnewsubteam';
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
                  GetAllTeams();
                  HidePopupModal('updateTeam');
                  var userdata = `<p>Team modified successfully</p>`
                  SuccessMessageCustom('Property Teams', userdata, 'success')
                }
                else {
                  var userdata = `<p>Failed to modify team</p>`
                  SuccessMessageCustom('Property Teams', userdata, 'error')
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
    NotifyToast('error', "Plase enter all required values")
  }
}

function EditSubTeamItem(subteamid, teamId, teamdetail,propId) {
  HidePopupModal('updateTeam');
  var form = new FormData();
  form.append("propId", propId);
  form.append("teamId", teamId);
  
  
  var ep = applicationdomain + 'api/admin/getmainteamusers';
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

      
      var ssid = subteamid;
      var managerID = ''
      var membersList= [];
      var currentTeam = findSubteam(ExistingData.subteams, teamId, ssid);
      if (currentTeam.length > 0) {
        currentTeam = currentTeam[0];
        currentTeam.subteams.forEach(function (emp){
         if(emp.manager===true){
            managerID = emp.email;
         }
         else{
          membersList.push(emp.email)
         }
        });
    
        console.log(currentTeam)
    
      }
      
      var htm = `<div class="modal fade" id="updateTeam" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">      
          <div class="modal-header bgimg2">
            <h5 class="modal-title" id="exampleModalLabel2">Update Sub Team <span id="team-prop-name1" class="text-muted"></span></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div>
              <div class="mb-3">
    
                <label class="form-label" for="updateteam-fullname">Team Name<span style="color: red;">*</span></label>
                <input type="text" class="form-control" id="updateteam-fullname" placeholder="Team Name">
    
              </div>
              <div class="mb-3">
                <label class="form-label" for="collapsible-manager1">Manager<span style="color: red;">*</span></label>
                <select id="collapsible-manager1" class="select2 form-select jbtclsdd">
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label" for="collapsible-member1">Team Members<span style="color: red;">*</span></label>
                <select id="collapsible-member1" class="select2 form-select jbtclsdd" multiple>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <div class="row" style="width:100%">
              <div class="col-6 d-flex"> 
                <button type="button" class="btn btn-outline-danger btn-sm mx-2" id="removeteam">Remove Sub Team</button>
              </div>
              <div class="col-6 d-flex justify-content-end">
                  <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
                    Close
                  </button>
                  <button type="button" class="btn btn-outline-linkedin btn-sm mx-2" id="save-changes-button">Save changes</button>
              </div>
            </div>
          </div>
        </div>
      </div>
                </div>`
    
      $('#teams2').html(htm)
      $('#team-prop-name1').text('[' + Response.propName + ']')
      $('#collapsible-manager1').empty();
    
      Response.propManager.forEach(function (emp) {
        $('#collapsible-manager1').append('<option value="' + emp.userName + '">' + emp.firstName + ' ' + emp.lastName + '</option>');
      });
    
      $('#collapsible-member1').empty();
      Response.propEmp.forEach(function (emp) {
        $('#collapsible-member1').append('<option value="' + emp.userName + '">' + emp.firstName + ' ' + emp.lastName + '</option>');
      });
    
      $('#updateteam-fullname').val(teamdetail)
      $('#collapsible-manager1').val(managerID);
      $('#collapsible-manager1').trigger('change');
    
      $('#collapsible-member1').val(membersList);
      $('#collapsible-member1').trigger('change');
    
      ShowPopupModal('updateTeam');
      $('.jbtclsdd').select2({
        width: '100%',
        dropdownParent: $('#updateTeam')
      });
    
    
      function SaveSubTeamDetail(){
        var teamName = $('#updateteam-fullname').val();
        var teamManager = $('#collapsible-manager1').val();
        var teamMembers = $('#collapsible-member1').val();
      
        if (teamName !== '' && teamManager !== '' & teamMembers.length > 0) {
      
          var form = new FormData();
          form.append("propId", currentTeam.propId);
          form.append("teamId", currentTeam.teamId);
          form.append("subteamId", ssid);
          form.append("teamName", teamName);
          form.append("managerID", teamManager);
          teamMembers.forEach((mem) => {
            form.append("memberID", mem);
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
      
                  var ep = applicationdomain + 'api/admin/updatesubteam';
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
                        GetAllTeams();
                        HidePopupModal('updateTeam');
                        var userdata = `<p>Team modified successfully</p>`
                        SuccessMessageCustom('Property Teams', userdata, 'success')
                      }
                      else {
                        var userdata = `<p>Failed to modify team</p>`
                        SuccessMessageCustom('Property Teams', userdata, 'error')
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
          NotifyToast('error', "Plase enter all required values")
        }
      }
    
      function RemoveSubTeam(){
        var form = new FormData();
        form.append("propId", currentTeam.propId);
        form.append("teamId", currentTeam.teamId);
        form.append("subteamId", ssid);
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
    
                var ep = applicationdomain + 'api/admin/removesubteam';
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
                      GetAllTeams();
                      HidePopupModal('updateTeam');
                      var userdata = `<p>Team modified successfully</p>`
                      SuccessMessageCustom('Property Teams', userdata, 'success')
                    }
                    else {
                      var userdata = `<p>Failed to modify team</p>`
                      SuccessMessageCustom('Property Teams', userdata, 'error')
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


      $('#save-changes-button').on('click', SaveSubTeamDetail);
      $('#removeteam').on('click', RemoveSubTeam);


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


function findSubteam(data, teamId, subteamId) {
  return data.filter(item => item.teamId === teamId && item.subteamId === subteamId);
}
//#endregion




//#region  Areas
function GetAllAreas() {
  blockUI('#section-block');
  var ep = applicationdomain + 'api/admin/getallareas';
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
      GlobarAreas = Response;
      UpdateAreaTable(Response)
      unblockUI('#section-block');
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

function UpdateAreaTable(datavalues) {
  AreaMap = {}
  var html = '';
  // Loop through data values and build HTML string
  datavalues.forEach(function (data) {
    // Build HTML for each row
    html += '<tr>';
    html += `<td><span class="badge bg-label-dark">` + data.sr + `</span></td>`
    html += `<td><span class="badge bg-label-dark">` + data.areaId + `</span></td>`;
    html += `<td>
                        <div class="d-flex align-items-center">
                        <img src="admincssjs/theme/assets/img/icons/brands/location.png" alt="Oneplus" height="24" width="24" class="me-2">
                        <div class="d-flex flex-column">
                        <span class="fw-semibold lh-1">`+ data.areaName + `</span>
                        </div>
                        </div>
               </td>`
    html += `<td><span class="badge bg-label-dark">` + data.total + `</span></td>`;
    html += `<td><button class="btn btn-linkedin btn-xs rounded-1" type="button" onclick="EditAreaForm('${data.areaId}')">EDIT</button> </td>`;
    //html += `<td><button class="btn btn-linkedin btn-xs rounded-1" type="button" onclick="EditSubAreaForm('${data.areaId}')">UPDATE</button> </td>`;
    AreaMap[data.areaId] = data.areaName;
  });

  $('#area-table-body').html(html)
}

function EditAreaForm(areaID) {

  var foundArea = GlobarAreas.find(area => area.areaId === areaID);
  
  var htm = `<div class="modal fade" id="resetAreaModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Edit Area Name</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <input type="text" class="form-control" placeholder="Enter New Name" value="${AreaMap[areaID]}"  id="area-new-name"/>
        </div>
        <div class="modal-footer">
          
          <div class="card p-2" style="float: left;">
                              <label class="switch switch-dark switch-sm switch-square">
                                <input type="checkbox" class="switch-input emproles" id="area_is_villa" ${foundArea && foundArea.isvilla ? 'checked' : ''}>
                                <span class="switch-toggle-slider">
                                  <span class="switch-on"></span>
                                  <span class="switch-off"></span>
                                </span>
                                <span class="switch-label" id="area_is_villa-lable">Is Villa</span>
                              </label>
                          </div>
          
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-outline-linkedin btn-sm" onclick="ResetAreaName('${areaID}')">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

  $('#modelHolder').html(htm)
  ShowPopupModal('resetAreaModel');
}


function EditSubAreaForm(areaID, propid) {

  // Find the property area and its subareas from CurrentPropertyDetails
  let areaSubareas = [];

  // Find the specific area in propAreas
  const selectedArea = CurrentPropertyDetails.propAreas.find(area => area.areaid === areaID);

  // If area exists and has subareas, get them
  if (selectedArea && selectedArea.subAreas) {
    areaSubareas = selectedArea.subAreas;
  }
  
  HidePopupModal('editpropertyform');
  // Assuming SubAreaMap is an object that maps subarea IDs to names for the given area
  // And AreaSubareas is an object that contains arrays of subarea IDs for each area
  //let areaSubareas = AreaSubareas.filter(item => item.areaId === areaID);


  let subareasList = '';
  if (areaSubareas && areaSubareas.length > 0) {
    areaSubareas.forEach(subarea => {
      subareasList += `
        <div class="d-flex align-items-center mb-2">
          <input type="text" class="form-control me-2" value="${subarea.subareaName}" id="${subarea.subareaId}"/>
           <button type="button" class="btn btn-outline-linkedin btn-sm me-1" onclick="UpdateSubArea('${propid}','${areaID}', '${subarea.subareaId}')">
            <i class="bx bx-revision"></i>
          </button>
           <button type="button" class="btn btn-outline-linkedin btn-sm me-1" onclick="EditChickListSubArea('${propid}','${areaID}', '${subarea.subareaId}')">
            <i class="bx bx-list-check"></i>
          </button>
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="DeleteSubArea('${propid}','${areaID}', '${subarea.subareaId}')">
            <i class="bx bx-trash"></i>
          </button>
        </div>
      `;
    });
  } else {
    subareasList = '<p class="text-muted">No subareas added yet.</p>';
  }

  var htm = `<div class="modal fade" id="editSubAreaModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg" >
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title">Manage Subareas for ${AreaMap[areaID]}</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Add New Subarea</label>
            <div class="d-flex">
              <input type="text" class="form-control me-2" placeholder="Enter Subarea Name" id="new-subarea-name"/>
             
              <button type="button" class="btn btn-outline-linkedin" onclick="AddSubArea('${areaID}','${propid}')">
                Add
              </button>
            </div>
          </div>
          
          <div class="mt-4">
            <label class="form-label">Existing Subareas</label>
            <div class="subarea-list">
              ${subareasList}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>`;

  $('#modelHolder').html(htm);
  ShowPopupModal('editSubAreaModal');
  
}

function EditChickListSubArea(propid, areaID, subareaId) {

  // Hide any previously open modal
  HidePopupModal('editSubAreaModal');

  // Find the property area and its subareas from CurrentPropertyDetails
  let selectedSubarea = null;
  let subareaName = "";

  // Find the specific area in propAreas
  var selectedArea = CurrentPropertyDetails.propAreas.find(area => area.areaid === areaID);
  
  // If area exists and has subareas, find the specific subarea
  if (selectedArea && selectedArea.subAreas) {
    selectedSubarea = selectedArea.subAreas.find(subarea => subarea.subareaId === subareaId);
    if (selectedSubarea) {
      subareaName = selectedSubarea.subareaName;
    }
  }

  // Get checkpoints for this subarea
  let checkpoints = [];
  if (selectedSubarea && selectedSubarea.checkpoints) {
    checkpoints = selectedSubarea.checkpoints;
  }

  let checkpointsHtml = '';
  if (checkpoints && checkpoints.length > 0) {
    checkpoints.forEach((checkpoint) => {
      checkpointsHtml += `
        <div class="d-flex align-items-center mb-2">
          <input type="text" class="form-control me-2" value="${checkpoint.checkpointName}" id="${checkpoint.checkpointId}"/>
          <button type="button" class="btn btn-outline-linkedin btn-sm me-1" onclick="UpdateSubAreaCheckpoint('${propid}','${areaID}','${subareaId}','${checkpoint.checkpointId}')">
            <i class="bx bx-revision"></i>
          </button>
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="DeleteSubAreaCheckpoint('${propid}','${areaID}','${subareaId}','${checkpoint.checkpointId}')">
            <i class="bx bx-trash"></i>
          </button>
        </div>
      `;
    });
  } else {
    checkpointsHtml = '<p class="text-muted">No checkpoints added yet.</p>';
  }

  var htm = `<div class="modal fade" id="editChecklistModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title">Manage Checklist for Subarea: ${subareaName}</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Add New Checklist Item</label>
            <div class="d-flex">
              <input type="text" class="form-control me-2" placeholder="Enter Checklist Item" id="new-checklist-item"/>
              <button type="button" class="btn btn-outline-linkedin" onclick="AddChecklistItem('${propid}','${areaID}','${subareaId}')">
                Add
              </button>
            </div>
          </div>
          
          <div class="mt-4">
            <label class="form-label">Checklist Items</label>
            <div class="checklist-items-container">
              ${checkpointsHtml}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>`;

  $('#modelHolder').html(htm);
  ShowPopupModal('editChecklistModal');
}

// Function to add a new checklist item
function AddChecklistItem(propid, areaID, subareaId) {
  var subareaname = $('#new-checklist-item').val();
  if (subareaname === '') {
    NotifyToast('error', "Plase enter a sub area name")
  }
  else {
    var form = new FormData();
    form.append("areaId", areaID);
    form.append("propId", propid);
    form.append("subareaId", subareaId);
    form.append("checkpointName", subareaname);
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

            var ep = applicationdomain + 'api/admin/addnewsubareachecks';
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
                CurrentPropertyDetails = Response.property;
                if (Response.success === true) {
                  HidePopupModal('resetAreaModel');
                  HidePopupModal('editChecklistModal');
                  GetAllAreas();
                  EditChickListSubArea(propid, areaID, subareaId);
                  var userdata = `<p>Sub Area modified successfully</p>`
                  SuccessMessageCustom('Sub Area Modification', userdata, 'success')

                }
                else {
                  var userdata = `<p>Failed to modifify sub area</p>`
                  SuccessMessageCustom('Sub Area Modification', userdata, 'error')
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

function UpdateSubAreaCheckpoint(propid, areaID, subareaId, checkpointId) {
  var subareaname = $('#' + checkpointId).val();
  if (subareaname === '') {
    NotifyToast('error', "Plase enter a check point")
  }
  else {
    var form = new FormData();
    form.append("areaId", areaID);
    form.append("propId", propid);
    form.append("subareaId", subareaId);
    form.append("checkpointId", checkpointId);
    form.append("checkpointName", subareaname);
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

            var ep = applicationdomain + 'api/admin/updatesubareachecks';
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
                CurrentPropertyDetails = Response.property;
                if (Response.success === true) {
                  HidePopupModal('resetAreaModel');
                  HidePopupModal('editChecklistModal');
                  GetAllAreas();
                  EditChickListSubArea(propid, areaID, subareaId);
                  var userdata = `<p>Sub Area modified successfully</p>`
                  SuccessMessageCustom('Sub Area Modification', userdata, 'success')

                }
                else {
                  var userdata = `<p>Failed to modifify sub area</p>`
                  SuccessMessageCustom('Sub Area Modification', userdata, 'error')
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

function DeleteSubAreaCheckpoint(propid, areaID, subareaId, checkpointId) {

  var form = new FormData();
  form.append("areaId", areaID);
  form.append("propId", propid);
  form.append("subareaId", subareaId);
  form.append("checkpointId", checkpointId);
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

          var ep = applicationdomain + 'api/admin/removesubareachecks';
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
              CurrentPropertyDetails = Response.property;
              if (Response.success === true) {
                HidePopupModal('resetAreaModel');
                HidePopupModal('editChecklistModal');
                GetAllAreas();
                EditChickListSubArea(propid, areaID, subareaId);
                var userdata = `<p>Sub Area modified successfully</p>`
                SuccessMessageCustom('Sub Area Modification', userdata, 'success')

              }
              else {
                var userdata = `<p>Failed to modifify sub area</p>`
                SuccessMessageCustom('Sub Area Modification', userdata, 'error')
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




function AddSubArea(areaID,propid){
  var subareaname = $('#new-subarea-name').val();
  if (subareaname === '') {
    NotifyToast('error', "Plase enter a sub area name")
  }
  else {
    var form = new FormData();
    form.append("areaId", areaID);
    form.append("propId", propid);
    form.append("subareaName", subareaname);
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

            var ep = applicationdomain + 'api/admin/addnewsubarea';
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
                CurrentPropertyDetails = Response.property;
                
                if (Response.success === true) {
                  HidePopupModal('resetAreaModel');
                  HidePopupModal('editSubAreaModal');
                  GetAllAreas();
                  EditSubAreaForm(areaID,propid);
                  var userdata = `<p>Sub Area modified successfully</p>`
                  SuccessMessageCustom('Sub Area Modification', userdata, 'success')
                  
                }
                else {
                  var userdata = `<p>Failed to modifify sub area</p>`
                  SuccessMessageCustom('Sub Area Modification', userdata, 'error')
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

function UpdateSubArea(propid, areaID, subareaId) {
  var subareaname = $('#'+subareaId).val();
  if (subareaname === '') {
    NotifyToast('error', "Plase enter a sub area name")
  }
  else{
    var form = new FormData();
    form.append("areaId", areaID);
    form.append("propId", propid);
    form.append("subareaId", subareaId);
    form.append("subareaName", subareaname);
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

            var ep = applicationdomain + 'api/admin/updatesubarea';
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
                CurrentPropertyDetails = Response.property;
                if (Response.success === true) {
                  HidePopupModal('resetAreaModel');
                  HidePopupModal('editSubAreaModal');
                  GetAllAreas();
                  EditSubAreaForm(areaID,propid);
                  var userdata = `<p>Sub Area modified successfully</p>`
                  SuccessMessageCustom('Sub Area Modification', userdata, 'success')

                }
                else {
                  var userdata = `<p>Failed to modifify sub area</p>`
                  SuccessMessageCustom('Sub Area Modification', userdata, 'error')
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

function DeleteSubArea(propid, areaID, subareaId) {
  var form = new FormData();
  form.append("areaId", areaID);
  form.append("propId", propid);
  form.append("subareaId", subareaId);
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

          var ep = applicationdomain + 'api/admin/deletesubarea';
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
              CurrentPropertyDetails = Response.property;
              if (Response.success === true) {
                HidePopupModal('resetAreaModel');
                HidePopupModal('editSubAreaModal');
                GetAllAreas();
                EditSubAreaForm(areaID,propid);
                var userdata = `<p>Sub Area modified successfully</p>`
                SuccessMessageCustom('Sub Area Modification', userdata, 'success')

              }
              else {
                var userdata = `<p>Failed to modifify sub area</p>`
                SuccessMessageCustom('Sub Area Modification', userdata, 'error')
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

function GetSubAreas(){
  var ep = applicationdomain + 'api/admin/getsubarea';
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
      AreaSubareas = Response;

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




function ResetAreaName(areaID) {
  var newArea = $('#area-new-name').val();
  var isVilla = $('#area_is_villa').is(':checked');
  if (newArea === '') {
    NotifyToast('error', "Plase enter a new area name")
  }
  else {
    var form = new FormData();
    form.append("propArea", newArea);
    form.append("propAreaID", areaID);
    form.append("isvilla", isVilla);
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

            var ep = applicationdomain + 'api/admin/updatearea';
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
                  HidePopupModal('resetAreaModel');
                  GetAllAreas();
                  var userdata = `<p>Area name modified successfully</p>`
                  SuccessMessageCustom('Area Modification', userdata, 'success')
                }
                else {
                  var userdata = `<p>Failed to modifify area name</p>`
                  SuccessMessageCustom('Area Modification', userdata, 'error')
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

function AddNewArea() {
  var htm = `<div class="modal fade" id="addAreaModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">      
        <div class="modal-header bgimg2">
          <h5 class="modal-title" id="exampleModalLabel2">Add New Area</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <input type="text" class="form-control" placeholder="Enter New Name" value=""  id="add-area-new-name"/>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
            Close
          </button>
          <button type="button" class="btn btn-outline-linkedin btn-sm" onclick="SubmitNewArea()">Save changes</button>
        </div>
      </div>
    </div>
  </div>`

  $('#modelHolder').html(htm)
  ShowPopupModal('addAreaModel');
}


function SubmitNewArea() {
  var newArea = $('#add-area-new-name').val();
  if (newArea === '') {
    NotifyToast('error', "Plase enter a new area name")
  }
  else {
    var form = new FormData();
    form.append("propArea", newArea);
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

            var ep = applicationdomain + 'api/admin/addnewarea';
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
                  HidePopupModal('addAreaModel');
                  GetAllAreas();
                  var userdata = `<p>New area added successfully</p>`
                  SuccessMessageCustom('Area Modification', userdata, 'success')
                }
                else {
                  var userdata = `<p>Failed to add area name</p>`
                  SuccessMessageCustom('Area Modification', userdata, 'error')
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

//#endregion


//#region Employee
function GetAllEmployee() {
  blockUI('#section-block');
  var ep = applicationdomain + 'api/admin/getallusers';
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
      UpdateEmployeeTable(Response)
      unblockUI('#section-block');
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

function UpdateEmployeeTable(userdata) {

  var txt = 0;

  if ($.fn.DataTable.isDataTable('#employeeDataTable')) {
    $('#employeeDataTable').DataTable().destroy();
  }

  // Create Search Inputs
  $('#employeeDataTable thead th').each(function (i) {
    var title = $('#employeeDataTable thead th').eq($(this).index()).text();
    $(this).html(
        `<label class="header-label">${title}</label><br><input type="text" class="form-control form-control-sm" placeholder="Search..." data-index="${i}" />`
    );
  });

  var table = $('#employeeDataTable').DataTable({
    stateSave: true,
    stateDuration: -1,
    stateSave: true,
    stateDuration: -1,
    data: userdata,
    "columns": [
      { data: "userName", name: "ID" },
      { data: "firstName", name: "FIRST NAME" },
      { data: "lastName", name: "LAST NAME" },
      { data: "email", name: "EMAIL" },
      { data: "phoneNumber", name: "MOBILE" },
      { data: "propName", name: "PROPERTY" },
      {
        data: "isActive", name: "STATUS", render: function (data, type, row, meta) {
          var rowid = row["userName"];
          var status = row["isActive"];
          if (status === false) {
            return `<span class="badge bg-label-danger"> Inactive </span>`
          }
          else {
            return `<span class="badge bg-label-success"> Active </span>`
          }
        }
      },
      {
        data: "userName", name: "ACTION", width: '50px', render: function (data, type, row, meta) {
          var rowid = row["userName"];
          var fname = row["firstName"];
          var lname = row["lastName"];
          var tt = `
                <div class="btn-group dropstart">
                <button class="btn btn-linkedin btn-xs rounded-1" type="button" onclick="GetEmployee('` + rowid + `')">
                  EDIT
                </button>
                </div>`
          txt++;

          return EmployeeActionItemsHtml(rowid, rowid.replace('@', '-').replace('.', '-'), fname, lname, txt);

        }
      },
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
  $('#employeeDataTable tbody').on('mouseover', 'tr', function () {

    $('[data-toggle="tooltip"]').tooltip({
      trigger: 'hover',
      html: true
    });
  });
  $('#employeeDataTable_filter').css("margin-top", "0px")
  $('#employeeDataTable_filter').css("margin-bottom", "5px")
  
      // Filter event handler
      $(table.table().container()).on('keyup', 'thead input', function () {
        table
            .column($(this).data('index'))
            .search(this.value)
            .draw();
    });
}

function EmployeeActionItemsHtml(empid, norm, fname, lname, rid) {

  var htm = `<div class="text-center d-grid">
              <button class="btn btn-linkedin btn-xs collapsed rounded" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${rid}" aria-expanded="false" aria-controls="collapse${rid}">
                      View Actions
              </button>
              <div class="collapse" id="collapse${rid}">
                  <div class="m-1 p-1">
                      <ul class="list-group">
                        <li class="list-group-item p-1">
                          <div class="d-grid">
                              <button class="btn btn-outline-linkedin btn-xs rounded-1" onclick="GetEmployee('${empid}')">Details</button>
                          </div>
                        </li>
                        <li class="list-group-item p-1">
                          <div class="d-grid">
                              <button class="btn btn-outline-linkedin btn-xs rounded-1" onclick="GetEmpAccess('${empid}','${fname}','${lname}')">Access</button>
                          </div>
                        </li>
                      </ul>
                  </div>
              </div>
            </div>
            `
  return htm
}



function GetEmployee(empid) {

  var form = new FormData();
  form.append("userid", empid);

  blockUI('#section-block');
  var ep = applicationdomain + 'api/admin/getemployee';
  var jwt = GetStoredJwt();

  $.ajax({
    url: ep,
    type: 'POST',
    dataType: 'json',
    processData: false,
    contentType: false,
    data: form,
    headers: {
      "Authorization": "Bearer " + jwt
    },
    success: function (Response) {

      unblockUI('#section-block');
      ShowEmpData(Response)
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

function GetEmpAccess(empid, fname, lname) {
  var form = new FormData();
  form.append("userid", empid);

  blockUI('#section-block');
  var ep = applicationdomain + 'api/admin/getemployeeaccess';
  var jwt = GetStoredJwt();

  $.ajax({
    url: ep,
    type: 'POST',
    dataType: 'json',
    processData: false,
    contentType: false,
    data: form,
    headers: {
      "Authorization": "Bearer " + jwt
    },
    success: function (Response) {

      var modaltext = `<div class="modal fade" id="addRoleModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">      
          <div class="modal-header bgimg2">
            <h5 class="modal-title" id="exampleModalLabel2">Update Access Levels</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="text-center mb-4">
              <h3 class="role-title" id="user-in-access"></h3>
              <p><span id="email-in-access"></span></p>
            </div>


            <div id="addRoleForm" class="row g-3">
              <div class="col-12">
                <div class="table-responsive">
                  <table class="table table-flush-spacing">
                    <tbody id="perm-tab-body">

                    </tbody>
                  </table>
                </div>
              </div>
            </div>


          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
              Close
            </button>
            <button type="button" class="btn btn-linkedin btn-sm" onclick="UpdatePermission('${empid}')">Save changes</button>
          </div>
        </div>
      </div>
                       </div>`
      var row = ``;
      $.each(Response, function (key, value) {
        var readChecked = value.read ? 'checked' : '';
        var writeChecked = value.write ? 'checked' : '';
        row += `
                <tr>
                    <td class="text-nowrap fw-semibold">${value.name}</td>
                    <td>
                        <div class="d-flex">
                            <div class="form-check me-3 form-check-info me-lg-5">
                                <input class="form-check-input permcls" type="checkbox" id="${key}_R" ${readChecked} name="${key}" data-type="read"/>
                                <label class="form-check-label" for="${key}_R"> Read </label>
                            </div>
                            <div class="form-check me-3 form-check-info me-lg-5">
                                <input class="form-check-input permcls" type="checkbox" id="${key}_W" ${writeChecked} name="${key}" data-type="write" />
                                <label class="form-check-label" for="${key}_W"> Write </label>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
      });

      $('#permissin-divs').html(modaltext);
      var fullname = `${fname} ${lname}`;
      $('#user-in-access').text(fullname);
      $('#email-in-access').text(empid)
      $('#perm-tab-body').html(row);
      ShowPopupModal('addRoleModal');
      unblockUI('#section-block');
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

function UpdatePermission(email) {
  var updatedResponse = {};
  $('.permcls').each(function () {
    var key = $(this).attr('name');
    var type = $(this).data('type');
    var isChecked = $(this).is(':checked');

    if (!updatedResponse[key]) {
      updatedResponse[key] = {
        read: false,
        write: false,
      };
    }

    if (type === 'read') {
      updatedResponse[key].read = isChecked;
    } else if (type === 'write') {
      updatedResponse[key].write = isChecked;
    }
  });


  var form = new FormData();
  form.append("userid", email);
  form.append("access", JSON.stringify(updatedResponse));

  blockUI('#section-block');
  var ep = applicationdomain + 'api/admin/setemployeeaccess';
  var jwt = GetStoredJwt();

  $.ajax({
    url: ep,
    type: 'POST',
    dataType: 'json',
    processData: false,
    contentType: false,
    data: form,
    headers: {
      "Authorization": "Bearer " + jwt
    },
    success: function (Response) {
      unblockUI('#section-block');
      HidePopupModal('addRoleModal');
      var userdata = `<p>Access level modified successfully</p>`
      SuccessMessageCustom('Access Modification', userdata, 'success')


    },
    error: function (XMLHttpRequest, textStatus, errorThrown) {
      if (XMLHttpRequest.status === 401) {
        // Unauthorized error handling
        LogoutUser()
      }
      else if (XMLHttpRequest.status === 400) {
        unblockUI('#section-block');
        var errorResponse = XMLHttpRequest.responseJSON;
        //console.log("Bad Request error occurred.",errorResponse);
        ErrorMessage()
      } else {
        unblockUI('#section-block');
        console.log("An error occurred:", errorThrown);
      }
    }
  });

}



function ShowEmpData(userdata) {
  var htm =
    `<div class="modal fade animate__animated" id="editpropertyEmployee" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header bgimg">
                  <h5 class="modal-title" id="exampleModalLabel2">Edit Employee <span id="emp-prop-name" class="text-muted">[Bolfushi respi]</span></h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">

                  <div class="card">
                    <div class="card-body">
                      <div class="row row-bordered" data-select2-id="20">
                        <div class="col-md-9">
                          <h6 class="mb-b fw-semibold text-gray text-uppercase" >1. User Details</h6>
                          <div class="row mt-3">
                            <div class="col-md-4">
                              <label class="form-label" for="emp-first-name">First Name</label>
                              <input type="text" id="emp-first-name" class="form-control text-capitalize" placeholder="First Name">
                            </div>
                            <div class="col-md-4">
                              <label class="form-label" for="emp-last-name">Last Name</label>
                              <input type="text" id="emp-last-name" class="form-control text-capitalize" placeholder="Last Name">
                            </div>
                            <div class="col-md-4">
                              <label class="form-label" for="emp-Designation">Designation</label>
                              <input type="text" id="emp-Designation" class="form-control text-capitalize" placeholder="Designation">
                            </div>
                            <div class="col-md-6 my-2">
                              <label class="form-label" for="emp-email">Email</label>
                              <input type="text" id="emp-email" class="form-control" placeholder="Email" readonly>
                            </div>
                            <div class="col-md-6 my-2">
                              <label class="form-label" for="emp-phone">Phone No</label>
                              <input type="text" id="emp-phone" class="form-control phone-mask" placeholder="658 799 8941" aria-label="658 799 8941">
                            </div>
                          </div>
                        </div>
                        <div class="col-md-3">
                          <h6 class="mb-b fw-semibold text-gray text-uppercase">2. User Roles</h6>
                          <div class="demo-inline-spacing mt-3">
                            <ul class="list-group" id="area-ul-holder">
                            <li class="list-group-item">
                                <div class="d-flex">
                                  <label class="switch switch-dark switch-sm switch-square">
                                    <input type="checkbox" class="switch-input emproles" id="emp_superadmin" >
                                    <span class="switch-toggle-slider">
                                      <span class="switch-on"></span>
                                      <span class="switch-off"></span>
                                    </span>
                                    <span class="switch-label">Super Admin</span>
                                  </label>
                                </div>                                 
                              </li>  
                               <li class="list-group-item">
                                <div class="d-flex">
                                  <label class="switch switch-dark switch-sm switch-square">
                                    <input type="checkbox" class="switch-input emproles" id="emp_oproadmin" >
                                    <span class="switch-toggle-slider">
                                      <span class="switch-on"></span>
                                      <span class="switch-off"></span>
                                    </span>
                                    <span class="switch-label">Opro Admin</span>
                                  </label>
                                </div>                                 
                            </li>
                            <li class="list-group-item">
                                <div class="d-flex">
                                  <label class="switch switch-dark switch-sm switch-square">
                                    <input type="checkbox" class="switch-input emproles" id="emp_admin" >
                                    <span class="switch-toggle-slider">
                                      <span class="switch-on"></span>
                                      <span class="switch-off"></span>
                                    </span>
                                    <span class="switch-label">Resort Admin</span>
                                  </label>
                                </div>                                 
                              </li>
                              <li class="list-group-item">
                                <div class="d-flex">
                                  <label class="switch switch-dark switch-sm switch-square">
                                    <input type="checkbox" class="switch-input emproles" id="emp_manager" >
                                    <span class="switch-toggle-slider">
                                      <span class="switch-on"></span>
                                      <span class="switch-off"></span>
                                    </span>
                                    <span class="switch-label">Manager</span>
                                  </label>
                                </div>
                              </li>
                              <li class="list-group-item">
                                <div class="d-flex">
                                  <label class="switch switch-dark switch-sm switch-square">
                                    <input type="checkbox" class="switch-input emproles" id="emp_supervisor" >
                                    <span class="switch-toggle-slider">
                                      <span class="switch-on"></span>
                                      <span class="switch-off"></span>
                                    </span>
                                    <span class="switch-label">Supervisor</span>
                                  </label>
                                </div>
                              </li>
                              <li class="list-group-item">
                                <div class="d-flex">
                                  <label class="switch switch-dark switch-sm switch-square">
                                    <input type="checkbox" class="switch-input emproles" id="emp_owner" >
                                    <span class="switch-toggle-slider">
                                      <span class="switch-on"></span>
                                      <span class="switch-off"></span>
                                    </span>
                                    <span class="switch-label">Resort Owner</span>
                                  </label>
                                </div>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
                <div class="modal-footer">
                  <div class="d-flex justify-content-between" style="width: 100%;">
                    
                        <div style="display: inline-block;">
                          <div class="card p-2" style="float: left;">
                              <label class="switch switch-dark switch-sm switch-square">
                                <input type="checkbox" class="switch-input emproles" id="emp_active" >
                                <span class="switch-toggle-slider">
                                  <span class="switch-on"></span>
                                  <span class="switch-off"></span>
                                </span>
                                <span class="switch-label" id="emp_active-lable">Active</span>
                              </label>
                          </div>
                          <div style="float: left; margin-left: 10px;" class="p-1"> 
                            <button class="btn btn-outline-linkedin btn-sm" onclick="ResetPassword2('${userdata.email}','${userdata.fName} ${userdata.lName}')">Reset Password</button> 
                          </div> 
                        </div>
                        
                        <div>
                          
                          <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Close</button>
                          <button type="button" class="btn btn-outline-linkedin btn-sm" onclick="SubmitEditEmployee()">Save changes</button>
                        </div>
                    
                  </div>
                </div>
              </div>
            </div>
     </div>`;
  var txt = `[${userdata.propName}]`;
  $(`#modelHolder`).html(htm);

  $(`#emp-first-name`).val(userdata.fName);
  $(`#emp-last-name`).val(userdata.lName);
  $(`#emp-Designation`).val(userdata.designation);
  $(`#emp-email`).val(userdata.email);
  $(`#emp-phone`).val(userdata.phone);
  $(`#emp-prop-name`).text(txt);

  if (userdata.roles.includes('SUPERADMIN')) {
    $('#emp_superadmin').prop("checked", true);
  };

  if (userdata.roles.includes('OPROADMIN')) {
    $('#emp_oproadmin').prop("checked", true);
  };

  if (userdata.roles.includes('SUPERVISOR')) {
    $('#emp_supervisor').prop("checked", true);
  };

  if (userdata.roles.includes('ADMIN')) {
    $('#emp_admin').prop("checked", true);
  };

  if (userdata.roles.includes('MANAGER')) {
    $('#emp_manager').prop("checked", true);
  };

  if (userdata.roles.includes('OWNER')) {
    $('#emp_owner').prop("checked", true);
  };

  if (userdata.status === true) {
    $('#emp_active').prop("checked", true);
    $(`#emp_active-lable`).text('Active');
  }
  else {
    $('#emp_active').prop("checked", false);
    $(`#emp_active-lable`).text('In Active');
  }



  ShowPopupModal('editpropertyEmployee');
}

function SubmitEditEmployee() {
  var emp_first_name = $('#emp-first-name').val();
  var emp_last_name = $('#emp-last-name').val();
  var emp_email = $('#emp-email').val();
  var emp_phone = $('#emp-phone').val();
  var emp_designation = $('#emp-Designation').val();
  var roles = [];
  const checkboxes = document.querySelectorAll('.emproles:checked');
  checkboxes.forEach((checkbox) => {
    roles.push(checkbox.id);
  });

  var activestatus = 1;
  var checkstatus = $('#emp_active').is(':checked');
  if (checkstatus === false) {
    activestatus = 0;
  }

  if (emp_first_name !== '' && emp_last_name !== '' && emp_email !== '' && emp_designation !== '' && roles.length >= 1) {
    var form = new FormData();
    form.append("emp_first_name", emp_first_name);
    form.append("emp_last_name", emp_last_name);
    form.append("emp_email", emp_email);
    form.append("emp_phone", emp_phone);
    form.append("emp_designation", emp_designation);
    form.append("emp_status", activestatus);
    roles.forEach((role) => {
      form.append("roles", role);
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

            var ep = applicationdomain + 'api/admin/editemployee';
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
                  HidePopupModal('editpropertyEmployee');
                  GetAllEmployee();
                  var userdata = `<p>Employee modified successfully</p>`
                  SuccessMessageCustom('Employee Registration', userdata, 'success')
                }
                else {
                  var userdata = `<p>Failed to modify employee</p>`
                  SuccessMessageCustom('Employee Registration', userdata, 'error')
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
    NotifyToast('error', "One or more mandatory fields empty")
  }

}



//#endregion






function SuccessMessage3(Title, userdata) {
  Swal.fire({
    title: Title,
    html: userdata,
    icon: "success",
  });
  $(".swal2-confirm").removeClass("btn-primary");
  $(".swal2-confirm").addClass("btn-yellotick-rev");
}

function SuccessMessageCustom(Title, userdata, icon) {
  Swal.fire({
    title: Title,
    html: userdata,
    icon: icon,
  });
  $(".swal2-confirm").removeClass("btn-primary");
  $(".swal2-confirm").addClass("btn-dark");
}

