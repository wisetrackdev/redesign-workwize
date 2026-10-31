const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var uid = urlParams.get('uid');
var token = urlParams.get('token');

window.onload = function () {
  $('#useremail').text(uid)
};


function ResetPassword(){
    
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
        
        if ($('#pass1').val() === $('#pass2').val() && $('#pass1').val() !== '' && $('#pass2').val() !== '') {
            ShowSpinner();
            var form = new FormData();
            form.append('uid', uid);
            form.append('token', token);
            form.append('pass', $('#pass1').val());
            var ep = `${applicationdomain}api/it/resetpassword`;
    
            $.ajax({
                url: ep,
                type: 'POST',
                dataType: 'json',
                data: form,
                processData: false,
                contentType: false,
                success: function (Response) {
                    HideSpinner()
                    if(Response===true){
                        $('#pass1').val('')
                        $('#pass2').val('')
                        var userdata = `<p class="text-primary text-center">Your password has been reset successfully</p>`
                        $('#reset-validation-message').html(userdata)
                       
                    }
                    else{
                        $('#pass1').val('')
                        $('#pass2').val('')
                        var userdata = `<p class="text-danger text-center">An error occured while restting your password. Please try again.</p>`
                        $('#reset-validation-message').html(userdata)
                       
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
        } else {
            var userdata = `<p class="text-danger text-center">Password and confirm password does not matches.</p>`
            $('#reset-validation-message').html(userdata)
        }



    }
    }
}

function ForgetPassword(){
    var email = $('#email').val();
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
        form.append('email', email);
        var ep = `${applicationdomain}api/it/forgotpassword`;

        ShowSpinner();
        $.ajax({
            url: ep,
            type: 'POST',
            dataType: 'json',
            data: form,
            processData: false,
            contentType: false,
            
            success: function (Response) {
                HideSpinner()
                if(Response===true){
                    $('#email').val('')
                    var userdata = `<p class="text-primary text-center">We have sent reset link, please check your registered email</p>`
                    $('#forget-validation-message').html(userdata)
                }
                else{
                    var userdata = `<p class="text-danger text-center">An error occured while sending reset link. Please try again.</p>`
                    $('#forget-validation-message').html(userdata)
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