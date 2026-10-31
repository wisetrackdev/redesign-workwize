var applicationdomain = "https://oprofase2.workarya.com/";
var applicationdomain2 = "https://localhost:7151/";
var loginendpoint = applicationdomain + "api/login"


function ShowSpinner() {
    document.getElementById("SpinnerLoader").style.display = "block";
};
function HideSpinner() {
    document.getElementById("SpinnerLoader").style.display = "none";
};

function formatDate(dateString) {
    // Create a new Date object from the input string
    let date = new Date(dateString);
    
    // Get the day, month, and year
    let day = String(date.getDate()).padStart(2, '0'); // Ensure 2-digit format
    let month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    let year = date.getFullYear();

    // Return the formatted date
    return `${day}-${month}-${year}`;
}


function loadScriptSequentially(scripts, index = 0) {
    if (index >= scripts.length) {
        //console.log('All scripts loaded successfully');
        return;
    }

    const script = document.createElement('script');
    script.src = scripts[index] + '?v=' + new Date().getTime();

    script.onload = function() {
        //console.log(`Loaded: ${scripts[index]}`);
        loadScriptSequentially(scripts, index + 1);
    };

    script.onerror = function() {
        //console.error(`Failed to load: ${scripts[index]}`);
        // Continue loading next script even if one fails
        loadScriptSequentially(scripts, index + 1);
    };

    document.body.appendChild(script);
}