const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const auditID = urlParams.get('audit');
const propID = urlParams.get('prop');
var PropertyData = null;
var AuditData = null;
var AuditInfo = null;
var userEmail = null;

// Where the auditor is (area tab, sub area per area, villa per area). Kept in localStorage per audit,
// so a refresh or reopening the audit (View Details opens a new tab) comes back to the same place.
var AuditViewKey = 'upkeepAuditView_' + auditID;
var SavedAuditView = loadAuditView();

function loadAuditView() {
    try {
        return JSON.parse(localStorage.getItem(AuditViewKey)) || {};
    } catch (e) {
        return {};
    }
}

function saveAuditView() {
    try {
        localStorage.setItem(AuditViewKey, JSON.stringify(SavedAuditView));
    } catch (e) { /* storage blocked: refresh just starts at the first tab */ }
}

function rememberArea(areaId) {
    SavedAuditView.area = areaId;
    saveAuditView();
}

function rememberSubarea(areaId, subareaId) {
    SavedAuditView.subareas = Object.assign({}, SavedAuditView.subareas, { [areaId]: subareaId });
    saveAuditView();
}

// State that must survive the area/subarea/checklist views being reloaded
// (each view load re-runs its script and resets that script's globals).
var SelectedVillaByArea = Object.assign({}, SavedAuditView.villas);
var PreferredSubareaId = null;

function rememberVilla(areaId, villaId) {
    if (villaId) {
        SelectedVillaByArea[areaId] = villaId;
    } else {
        delete SelectedVillaByArea[areaId];
    }
    SavedAuditView.villas = SelectedVillaByArea;
    saveAuditView();
}
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

        // The checklist renders saved values from AuditData, so load it before the property tree
        GetAuditInfo();
        GetAuditReport(function () {
            GetPropertyInfo(propID);
        });

        window.addEventListener('beforeunload', function (e) {
            if (getUnsavedRowCount() > 0 || isKeyStrengthDirty()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

    }
    else{
        LogoutUser();
    }
});

// Unsaved-change tracking: any edit inside the checklist marks its row dirty until saved
$(document).on('input change', '.audit-table tr[id^="row_"] select, .audit-table tr[id^="row_"] textarea, .audit-table tr[id^="row_"] input', function () {
    markRowDirty($(this).closest('tr').attr('id').substring(4));
});

function markRowDirty(checkpointId) {
    $('#row_' + checkpointId).addClass('row-dirty');
    updateSaveAllButton();
}

function getUnsavedRowCount() {
    return $('.audit-table tr.row-dirty').length;
}

function updateSaveAllButton() {
    var count = getUnsavedRowCount();
    var btn = $('#saveAllBtn');
    btn.prop('disabled', count === 0);
    btn.find('.save-all-count').text(count > 0 ? `(${count})` : '');
}

// Ask before leaving a checklist with unsaved rows. Returns true when it is safe to continue.
function confirmDiscardUnsaved() {
    var count = getUnsavedRowCount();
    if (count === 0) {
        return true;
    }
    return window.confirm(`You have unsaved changes in ${count} checkpoint(s).\n\nPress Cancel to stay and use "Save All", or OK to discard them.`);
}

// Villa to show for an area: the one the auditor last picked in this audit. A fresh audit
// starts with no villa selected, so a villa is never audited by mistake.
function getDefaultVillaId(area) {
    if (!area || !area.villasList || area.villasList.length === 0) {
        return null;
    }
    var remembered = SelectedVillaByArea[area.areaid];
    return remembered && area.villasList.some(v => v.villaId === remembered) ? remembered : null;
}

// Re-fetch the property tree (areas/subareas/checkpoints) without reloading the page
function RefreshPropertyData(onDone) {
    var form = new FormData();
    form.append("propId", propID);
    $.ajax({
        url: applicationdomain + 'api/upkeep/getpropinfo',
        type: 'POST',
        dataType: 'json',
        data: form,
        processData: false,
        contentType: false,
        headers: {
            "Authorization": "Bearer " + GetStoredJwt()
        },
        success: function (Response) {
            if (Response) {
                PropertyData = Response;
            }
            if (onDone) {
                onDone();
            }
        },
        error: function (XMLHttpRequest) {
            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            } else {
                PageToast('error', 'Could not refresh the checklist. Please reload the page.')
            }
        }
    });
}

function GetAuditInfo() {
    $.ajax({
        url: `${applicationdomain}api/upkeep/getauditinfo?prop=${propID}&audit=${auditID}`,
        type: 'GET',
        dataType: 'json',
        headers: {
            "Authorization": "Bearer " + GetStoredJwt()
        },
        success: function (Response) {
            AuditInfo = Response;
        },
        error: function (XMLHttpRequest) {
            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            }
        }
    });
}

// toastr (used by NotifyToast) is not loaded on this page, so use a Bootstrap toast
function PageToast(type, message) {
    if (!document.getElementById('pageToastContainer')) {
        document.body.insertAdjacentHTML('beforeend',
            '<div class="toast-container position-fixed top-0 end-0 p-3" id="pageToastContainer" style="z-index: 99999;"></div>');
    }
    var toastId = 'ptoast_' + Date.now();
    var bg = type === 'success' ? 'bg-success' : (type === 'warning' ? 'bg-warning text-dark' : 'bg-danger');
    var icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    var el = document.createElement('div');
    el.id = toastId;
    el.className = `toast align-items-center text-white ${bg} border-0`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="fa ${icon} me-2"></i></div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    el.querySelector('.toast-body').appendChild(document.createTextNode(message));
    document.getElementById('pageToastContainer').appendChild(el);
    var toast = new bootstrap.Toast(el, { delay: 4000 });
    toast.show();
    el.addEventListener('hidden.bs.toast', function () { el.remove(); });
}

//#region Key Strength
var keyStrengthEditor = null;
var keyStrengthSaved = '';

function isKeyStrengthDirty() {
    return keyStrengthEditor !== null && getKeyStrengthHtml() !== keyStrengthSaved;
}

function getKeyStrengthHtml() {
    // Quill leaves "<p><br></p>" behind when emptied
    return keyStrengthEditor.getText().trim() === '' ? '' : keyStrengthEditor.root.innerHTML;
}

function ShowKeyStrength() {
    if (ActiveAreaTabId === 'KEYSTRENGTH') {
        return;
    }
    if (!confirmDiscardUnsaved()) {
        restoreActiveAreaTab();
        return;
    }
    ActiveAreaTabId = 'KEYSTRENGTH';
    rememberArea('KEYSTRENGTH');

    $('#subareaselector-div').html(`
        <div class="keystrength-card">
            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <div>
                    <h4 class="mb-1">Key Strength</h4>
                    <p class="text-muted mb-0">Summarise what went right in this audit. This is exported to the "Key Strengths Observed" section of the report.</p>
                </div>
                <button class="btn-save-all" onclick="SaveKeyStrength()">
                    <i class="fa fa-save"></i> Save Key Strength
                </button>
            </div>
            <div id="keystrength-toolbar">
                <span class="ql-formats">
                    <select class="ql-font"></select>
                    <select class="ql-size"></select>
                </span>
                <span class="ql-formats">
                    <button class="ql-bold"></button>
                    <button class="ql-italic"></button>
                    <button class="ql-underline"></button>
                    <button class="ql-strike"></button>
                </span>
                <span class="ql-formats">
                    <select class="ql-color"></select>
                    <select class="ql-background"></select>
                </span>
                <span class="ql-formats">
                    <button class="ql-header" value="1"></button>
                    <button class="ql-header" value="2"></button>
                    <button class="ql-blockquote"></button>
                </span>
                <span class="ql-formats">
                    <button class="ql-list" value="ordered"></button>
                    <button class="ql-list" value="bullet"></button>
                    <button class="ql-indent" value="-1"></button>
                    <button class="ql-indent" value="+1"></button>
                </span>
                <span class="ql-formats">
                    <select class="ql-align"></select>
                </span>
                <span class="ql-formats">
                    <button class="ql-link"></button>
                    <button class="ql-clean"></button>
                </span>
            </div>
            <div id="keystrength-editor"></div>
        </div>`);

    keyStrengthEditor = new Quill('#keystrength-editor', {
        theme: 'snow',
        placeholder: 'e.g. Flooring maintenance & upkeep in all the guest villas inspected was found to be in excellent condition.',
        modules: { toolbar: '#keystrength-toolbar' }
    });

    var existing = AuditInfo && AuditInfo.keyStrength ? AuditInfo.keyStrength : '';
    if (existing) {
        keyStrengthEditor.clipboard.dangerouslyPasteHTML(existing);
    }
    keyStrengthSaved = getKeyStrengthHtml();
}

function SaveKeyStrength() {
    var html = getKeyStrengthHtml();
    var form = new FormData();
    form.append("propId", propID);
    form.append("auditId", auditID);
    form.append("keyStrength", html);

    ShowSpinner()
    $.ajax({
        url: applicationdomain + 'api/upkeep/savekeystrength',
        type: 'POST',
        dataType: 'json',
        data: form,
        processData: false,
        contentType: false,
        headers: {
            "Authorization": "Bearer " + GetStoredJwt()
        },
        success: function (Response) {
            HideSpinner()
            if (Response.success) {
                keyStrengthSaved = html;
                if (AuditInfo) {
                    AuditInfo.keyStrength = html;
                }
                PageToast('success', 'Key Strength saved')
            } else {
                PageToast('error', 'Key Strength could not be saved')
            }
        },
        error: function (XMLHttpRequest) {
            HideSpinner()
            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            } else {
                PageToast('error', 'Key Strength could not be saved')
            }
        }
    });
}

// Leaving the Key Strength tab with unsaved text
function confirmLeaveKeyStrength() {
    if (!isKeyStrengthDirty()) {
        keyStrengthEditor = null;
        return true;
    }
    if (window.confirm('Key Strength has unsaved changes. Discard them?')) {
        keyStrengthEditor = null;
        return true;
    }
    return false;
}
//#endregion

// Put the "active" highlight back on the area tab that is actually showing
var ActiveAreaTabId = null;
function restoreActiveAreaTab() {
    $('#tab1-tab .nav-link').removeClass('active').attr('aria-selected', 'false');
    var selector = ActiveAreaTabId === 'KEYSTRENGTH' ? '#tab1-tab .keystrength-tab' : `#tab1-tab [data-area-id="${ActiveAreaTabId}"]`;
    $(selector).addClass('active').attr('aria-selected', 'true');
}


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
                // Changed to load mainareaselector_new.html
                LoadCustomControlWithRender('mainareaselector-div','views/mainareaselector_new.html',PropertyData,'')
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {

            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {
                unblockUI('#section-block');
                var errorResponse = XMLHttpRequest.responseText;
                PageToast('error', errorResponse)

            } else {
                console.log("An error occurred:", errorThrown);
                unblockUI('#section-block');
            }
        }
    });
}

function GetAuditReport(onDone){

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
            if (onDone) {
                onDone();
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {

            if (XMLHttpRequest.status === 401) {
                LogoutUser()
            }
            else if (XMLHttpRequest.status === 400) {

                var errorResponse = XMLHttpRequest.responseText;
                PageToast('error', errorResponse)

            } else {
                console.log("An error occurred:", errorThrown);
                unblockUI('#section-block');
            }
        }
    });
}
