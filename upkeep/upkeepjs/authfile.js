var jwtToken;
var UserName;
var Password;
var Email;
var Roles;
var Name;




//#region Authentication and Log out
function loginUser() {

    var username = $('#username').val();
    var password = $('#password').val();
    var settings = {
        "url": loginendpoint,
        "method": "POST",
        "timeout": 0,
        "headers": {
            "Content-Type": "application/json"
        },
        "data": JSON.stringify({
            "Email": username,
            "Password": password,
            "App": 'quickfix'
        }),
    };

    // Perform AJAX request for login
    $.ajax(settings)
        .done(function(response) {
            // Check if the response contains a valid token
            if (response.token) {
                // Extract the JWT token from the response and assign it to the global variable
                jwtToken = response.token;
                var jst = getJwtValus(jwtToken);
                Name = getUserNameFromJwt(jwtToken)
                Email = getUserEmailFromJwt(jwtToken)
                Roles = jst['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
                if (!Array.isArray(Roles)) {
                    // If Roles is not an array, convert it to a single-element array
                    Roles = [Roles];
                }
                var updatedUserData = {
                    username: username, // Use the correct username
                    jwt: response.token,
                    name: Name,
                    email:Email,
                    role:Roles,
                    prop: jst.PrimaryProp,
                    desg:jst.Designation,
                    access : JSON.parse(jst.Access)
                };


                localStorage.removeItem('oproUserData');
                localStorage.setItem('oproUserData', JSON.stringify(updatedUserData));

                window.location.href = 'index.html';


                return true; // Return true indicating successful login
            } else {
                jwtToken = "";
                $('#login-errors').text('Invalid credentials')
                return false; // Return false indicating unsuccessful login
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            jwtToken = "";
            $('#login-errors').text('Invalid credentials')
            return false; // Return false indicating unsuccessful login
        });
}

function loginUserMobile() {

    var username = $('#username').val();
    var password = $('#password').val();
    var settings = {
        "url": loginendpoint,
        "method": "POST",
        "timeout": 0,
        "headers": {
            "Content-Type": "application/json"
        },
        "data": JSON.stringify({
            "Email": username,
            "Password": password,
            "App": 'Mobile'
        }),
    };

    // Perform AJAX request for login
    $.ajax(settings)
        .done(function(response) {
            // Check if the response contains a valid token
            if (response.token) {
                // Extract the JWT token from the response and assign it to the global variable
                jwtToken = response.token;
                var jst = getJwtValus(jwtToken);
                Name = getUserNameFromJwt(jwtToken)
                Email = getUserEmailFromJwt(jwtToken)
                Roles = jst['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
                if (!Array.isArray(Roles)) {
                    // If Roles is not an array, convert it to a single-element array
                    Roles = [Roles];
                }
                var updatedUserData = {
                    username: username, // Use the correct username
                    jwt: response.token,
                    name: Name,
                    email:Email,
                    role:Roles,
                    prop: jst.PrimaryProp,
                    desg:jst.Designation,
                    access : JSON.parse(jst.Access)
                };

                localStorage.removeItem('oproUserData');
                localStorage.setItem('oproUserData', JSON.stringify(updatedUserData));
                //window.location.href = 'new.html?xid=new';

                window.location.href = 'qindex.html';
                return true; // Return true indicating successful login
            } else {
                jwtToken = "";
                $('#login-errors').text('Invalid credentials')
                return false; // Return false indicating unsuccessful login
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            jwtToken = "";
            $('#login-errors').text('Invalid credentials')
            return false; // Return false indicating unsuccessful login
        });
}




function LogoutUser(){

    localStorage.removeItem('oproUserData')
    window.location.href = 'login.html';
}

function LogoutUserMobile(){
    localStorage.removeItem('oproUserData')
    window.location.href = 'login.html';
}
//#endregion

function GetStoredUserData() {
    var storedUserData = localStorage.getItem('oproUserData');

    var userData = storedUserData ? JSON.parse(storedUserData) : null;
    if (!userData || !userData.jwt) {
        return null
    }
    else {
        return userData
    }
}


function GetStoredJwt() {
    var storedUserData = localStorage.getItem('oproUserData');

    var userData = storedUserData ? JSON.parse(storedUserData) : null;
    if (!userData || !userData.jwt) {
        return null
    }
    else {
        return userData.jwt
    }
}

function getUsernameFromJwt(token) {
    try {
        var decodedToken = jwtDecode(token);
        var firstName = decodedToken.FirstName;
        return firstName
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}
function getUserEmailFromJwt(token) {
    try {
        var decodedToken = jwtDecode(token);
        var firstName = decodedToken.email;
        return firstName
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}
function getUserNameFromJwt(token) {
    try {
        var decodedToken = jwtDecode(token);
        var firstName = decodedToken.name;
        return firstName
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

function getJwtValus(token) {
    try {
        var decodedToken = jwtDecode(token);
        return decodedToken
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}




function blockUI(elem) {
    // Block the UI when the condition is met
    $(elem).block({
        message: '<div class="d-flex justify-content-center"><p class="mb-0">Please wait...</p> <div class="sk-wave m-0"><div class="sk-rect sk-wave-rect"></div> <div class="sk-rect sk-wave-rect"></div> <div class="sk-rect sk-wave-rect"></div> <div class="sk-rect sk-wave-rect"></div> <div class="sk-rect sk-wave-rect"></div></div> </div>',
        css: {
            backgroundColor: 'transparent',
            color: '#fff',
            border: '0'
        },
        overlayCSS: {
            opacity: 0.5
        }
    });
}

function unblockUI(elem) {
    // Unblock the UI
    $(elem).unblock();
}


function ShowPopupModal(name) {
    var modaln = "#" + name;
    $(modaln).modal('show');
};
function HidePopupModal(name) {
    var modaln = "#" + name;
    $(modaln).modal('hide');
};

function fixtable(){

    setTimeout(function() {
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            $($.fn.dataTable.tables(true)).css('width', '100%');
            $($.fn.dataTable.tables(true)).DataTable().columns.adjust().draw();
        });
    }, 5000);
}


function NotifyToast(type, message) {
    Command: toastr[type](message)
    toastr.options = {
        "closeButton": true,
        "debug": false,
        "newestOnTop": false,
        "progressBar": false,
        "positionClass": "toast-top-right",
        "preventDuplicates": false,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "3000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    }
}


function formatDateString(dateString) {
    // Convert the date string to a JavaScript Date object
    var date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
        return "Invalid Date";
    }

    // Format the date as a human-readable string
    var humanReadableDate = date.toLocaleString(); // You can specify additional options as needed

    return humanReadableDate;
}

function extractDate(dateTimeString) {
    // Split the datetime string by space to separate date and time
    var parts = dateTimeString.split(" ");

    // Return only the date part
    return parts[0];
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


function xxLoadCustomControl(parentId, controlPath, controlData){
    var controlid = `#${parentId}`;
    $(controlid).load(controlPath, function() {
        var userdata = {
            'controlData': controlData,
            'renderType': 'new',
        };
        $(this).data('controlData', userdata);
        initializePage(controlid)
    });
}

function xxLoadCustomControlWithRender(parentId, controlPath, controlData, renderType){
    var controlid = `#${parentId}`;
    $(controlid).load(controlPath, function() {
        var userdata = {
            'controlData': controlData,
            'renderType': renderType,
        };
        $(this).data('controlData', userdata);
        initializePage(controlid)
    });
}

function LoadCustomControl(parentId, controlPath, controlData){

    var controlid = `#${parentId}`;
    $(controlid).html('');
    $(controlid).load(controlPath.toLowerCase() + '?v=' + new Date().getTime(), function() {
        var userdata = {
            'controlData': controlData,
            'renderType': 'new',
        };
        $(this).data('controlData', userdata);
        initializePage(controlid)
    });
}

function LoadCustomControlWithRender(parentId, controlPath, controlData, renderType){
    var controlid = `#${parentId}`;
    $(controlid).html('');
    $(controlid).load(controlPath.toLowerCase() + '?v=' + new Date().getTime(), function() {
        var userdata = {
            'controlData': controlData,
            'renderType': renderType,
        };
        $(this).data('controlData', userdata);
        initializePage(controlid)
    });
}


//#region Reset Password
function ResetPassword() {





    var ttx = `
    <div class="modal fade" id="resetPasswordModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-simple modal-enable-otp modal-dialog-centered">
      <div class="modal-content p-3 p-md-5">
        <div class="modal-body">
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          <div class="text-center mb-4">
            <h3 class="mb-5">Reset User Password</h3>
          </div>
          <h6 class="text-center"> <span id="UserID-PWD" class="text-warning"></span>&nbsp;&nbsp;[<span id="UserName-PWD" class="text-muted">${userEmail}</span>]</h6>
          <div id="enableOTPForm" class="row g-3" onsubmit="return false">
            
                    <div class="col-12">
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
                    <button  class="btn btn-linkedin me-sm-3 me-1" onclick="ResetPasswordValidate('`+ userEmail + `')">Submit</button>
                    <button
                      type="reset"
                      class="btn btn-label-secondary"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                    >
                      Cancel
                    </button>
                  </div>
  
          </div>
        </div>
      </div>
    </div>
  </div>
    
    
    
  `


    $('#UserID-PWD').text(userName);
    $('#UserName-PWD').text(userEmail);
    $('#divholder').html(ttx)
    ShowPopupModal('resetPasswordModel');

}
function ResetPassword2(userEmailOther,userNameOther) {





    var ttx = `
    <div class="modal fade" id="resetPasswordModel" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-simple modal-enable-otp modal-dialog-centered">
      <div class="modal-content p-3 p-md-5">
        <div class="modal-body">
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          <div class="text-center mb-4">
            <h3 class="mb-5">Reset User Password</h3>
          </div>
          <h6 class="text-center"> <span id="UserID-PWD" class="text-warning"></span>&nbsp;&nbsp;[<span id="UserName-PWD" class="text-muted">${userEmailOther}</span>]</h6>
          <div id="enableOTPForm" class="row g-3" onsubmit="return false">
            
                    <div class="col-12">
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
                    <button  class="btn btn-linkedin me-sm-3 me-1" onclick="ResetPasswordValidate2('`+ userEmailOther + `')">Submit</button>
                    <button
                      type="reset"
                      class="btn btn-label-secondary"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                    >
                      Cancel
                    </button>
                  </div>
  
          </div>
        </div>
      </div>
    </div>
  </div>
    
    
    
  `


    $('#UserID-PWD').text(userNameOther);
    $('#UserName-PWD').text(userEmailOther);
    $('#divholder').html(ttx)
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

                                var ep = applicationdomain + 'api/users/resetpassword';
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
                                        SuccessMessageCustom('Password Updated!', userdata)
                                        LogoutUser();
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
function ResetPasswordValidate2(userid) {
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

                                var ep = applicationdomain + 'api/users/resetpassword';
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
                                        SuccessMessageCustom('Password Updated!', userdata)
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


function isNumeric(value) {
    return !isNaN(value - parseFloat(value));
}
//#endregion