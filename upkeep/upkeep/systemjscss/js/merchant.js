const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const parameterValue = urlParams.get('qid');
var mercPrimaryUPI = null;
var mercName = null;

window.onload = function () {
    if (parameterValue === null) {
        window.location.href = 'error.html';
    }
    else {
        GetMerchantDetails()
    }

};


function GetMerchantDetails() {
    var ep = applicationdomain + 'api/opendata/getmerchant?user=' + parameterValue;
    blockUI('#section-block');
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: ep,
        success: function (Response) {
            unblockUI('#section-block');
            mercPrimaryUPI = Response.mercPrimaryUPI;
            mercName = Response.mercName;
            $('#merchant-name').text(Response.mercName)
            $('#merchant-business-name').text(Response.mercBusiness)
            $('#merchant-img').attr("src", Response.mercPhoto);
            $('#merchant-address').text(Response.mercAddress);
            var shopimages = '';
            var ImageCount = 1;
            Response.mercShop.forEach(item => {
                let selected = item.ismymanager ? 'selected' : ''; // Check if ismanger is true
                if (item.ismymanager == true) { ctr++ }
                shopimages += `<div class="swiper-slide" style="background-image: url(${item})">Picture ${ImageCount}</div>`
                ImageCount++;
            });
            $('#merchant-shop-images').html(shopimages);
            var gpay_upi_primary = `<a href="upi://pay?pa=${Response.mercPrimaryUPI}&amp;pn=${Response.mercName}  K&amp;cu=INR" type="button" class="btn rounded-pill btn-icon btn-outline-yellotick" onclick="SetClickTypes('UPI_CLICK')"><span class=""><img src="assets/img/AppImages/Google Pay.png"/></span></a>`
            var ppay_upi_primary = `<a href="upi://pay?pa=${Response.mercPrimaryUPI}&amp;pn=${Response.mercName}  K&amp;cu=INR" type="button" class="btn rounded-pill btn-icon btn-outline-yellotick" onclick="SetClickTypes('UPI_CLICK')"><span class=""><img src="assets/img/AppImages/Phone Pe.png"/></span></a>`
            var patm_upi_primary = `<a href="#" class="btn rounded-pill btn-icon btn-outline-yellotick" onclick="InvokePayment()"><span class=""><img src="assets/img/AppImages/Paytm.png"/></span></a>`
            var Final_UPI = gpay_upi_primary;
            Final_UPI += ppay_upi_primary;
            Final_UPI += patm_upi_primary;
            $('#merchant-upis').html(patm_upi_primary)
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            unblockUI('#section-block');
            if (XMLHttpRequest.status === 400) {
                var errorResponse = XMLHttpRequest.responseJSON;
                console.log("Bad Request error occurred.", errorResponse);
            } else {
                // Other error handling
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}

function GetContactVcf() {
    var ep = applicationdomain + 'api/opendata/getmerchantvcf?user=' + parameterValue;
    window.location.href = ep;
}

function GetContactVcf2() {
    var ep = applicationdomain + 'api/opendata/getmerchantvcf?user=' + parameterValue;
    var fileUrl = ep; // Replace this with your file URL
    var fileName = parameterValue + ".vcf"; // Replace this with your desired file name
    var a = $("<a>")
        .attr("href", fileUrl)
        .attr("download", fileName)
        .appendTo("body");
    a[0].click();
    a.remove();
}

function InvokePayment() {
    SetClickTypes('UPI_CLICK')
    RedirectToPayment()
}



function SetClickTypes(clicktyp) {
    var ep = applicationdomain + 'api/opendata/setclicks';
    var clickdata = {
        userID: parameterValue,
        clickType: clicktyp
    };

    $.ajax({
        type: 'POST',
        dataType: 'json',
        url: ep,
        data: JSON.stringify(clickdata),
        success: function (Response) {
            console.log('click saved')
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status === 400) {
                var errorResponse = XMLHttpRequest.responseJSON;
                ErrorMessage()
            } else {
                // Other error handling
                console.log("An error occurred:", errorThrown);
            }
        }
    });
}

function RedirectToPayment(){
    console.log(mercPrimaryUPI);
    console.log(mercName);
    var paymentURL = `upi://pay?pa=${encodeURIComponent(mercPrimaryUPI)}&pn=${encodeURIComponent(mercName)}%20K&cu=INR`;
    window.location.href = paymentURL;
}