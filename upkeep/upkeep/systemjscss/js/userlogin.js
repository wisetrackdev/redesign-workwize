const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var parameterValue = urlParams.get('mode');


window.onload = function () {
    if (parameterValue === null) {
        parameterValue = "taskmaster";
    }
};

function LoginNormalUser(){
    loginUser(parameterValue)
}