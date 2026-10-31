const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var uid = urlParams.get('uid');
var token = urlParams.get('token');

window.onload = function () {
   console.log(uid);
   console.log(token)
};


function ResetPassword(){
    debugger
    if(uid!==null && token!==null){
    const requiredFields = document.querySelectorAll('.breq-field');
    let isValid = true;
    requiredFields.forEach(field => {
        
        const id = field.id;
        const value = field.value.trim();
        if (field.value.trim() === '') {
            field.classList.add('is-invalid'); // Add a class to highlight error
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });

    if(isValid){
        
        var form = new FormData();
        form.append('uid', uid);
        form.append('token', token);
        form.append('pass', $('#pass1').val());
        var ep = `${applicationdomain}api/it/resetpassword`;
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
                    var userdata = `<p>Your password has been reset successfully</p>`
                    SuccessMessageCustom('Reset Password', userdata, 'success');
                    window.location.href = 'login.html';
                }
                else{
                    var userdata = `<p>An error occured while restting your password. Please try again.</p>`
                    SuccessMessageCustom('Reset Password', userdata, 'error');
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
}