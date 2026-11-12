const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const auditID = urlParams.get('audit');
const propID = urlParams.get('prop');
var PropertyData = null;
var AuditData = null;
var userEmail = null;
function initializeSignalR(emaiID) {
    var hubconsstring = applicationdomain + 'applicationhub?token=&appcode=upkeepcreate&param=' + emaiID;

    const iconnection = new signalR.HubConnectionBuilder()
        .withUrl(hubconsstring)
        .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: retryContext => {
                if (retryContext.elapsedMilliseconds < 60000) {
                    // Wait 2 seconds before the next reconnect attempt
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
                //document.getElementById('SIGNALR_ID').value = connectionId;
                // Send the connectionId to controller
            }).catch(err => console.error(err.toString()));
    }).catch(err => console.error('Connection failed: ', err.toString()));

    iconnection.on("TriggerAction", function (ActionName, ActionMessage) {
        // Handle the TriggerAction event
        // console.log(`Action: ${ActionName}, Message: ${ActionMessage}`);

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

$(document).ready(function () {

    UserObject = GetStoredUserData();

    if (UserObject != null){
        userName = UserObject.name;
        userEmail = UserObject.username;
        userDesignation = UserObject.desg;
        CurrentProperty = null;
        UserRoles = UserObject.role;
        initializeSignalR(userEmail);
        $('#UserName_Name').text(UserObject.name);
        $('#is-designation').text(userDesignation);
        
        GetPropertyInfo(propID)
        GetAuditReport();

    }
    else{
        LogoutUser();
    }
});


function GetPropertyInfo(propid){

    ShowSpinner()
    var NewProp = $('#property_sector').val();
    var form = new FormData();
    form.append("propId", propid);
    
    
    var ep = applicationdomain + 'api/upkeep/getpropinfo';
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
            if(Response){
                PropertyData = Response;
                LoadCustomControlWithRender('mainareaselector-div','views/mainareaselector.html',PropertyData,'')
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

function GetAuditReport(){

    ShowSpinner()
    var ep = `${applicationdomain}api/upkeep/getauditreport?prop=${propID}&audit=${auditID}`;
    var jwt = GetStoredJwt();
        
    $.ajax({
        url: ep,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/json',
        headers: {
            "Authorization": "Bearer " + jwt
        },
        success: function (Response) {
            HideSpinner()
            if(Response){
                AuditData = Response;
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {

            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
              
                var errorResponse = XMLHttpRequest.responseText;
                NotifyToast('error', errorResponse)

            } else {
                console.log("An error occurred:", errorThrown);
                unblockUI('#section-block');
            }
        }
    });
}