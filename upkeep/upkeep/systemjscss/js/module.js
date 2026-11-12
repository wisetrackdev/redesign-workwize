window.onload = function () {
    var storedUserData = sessionStorage.getItem('oproUserData');
    var UserObject = JSON.parse(storedUserData);
    if(UserObject!=null){
        $('#UserName_Name').text(UserObject.name);
        GetModules();
    }
    else{
        LogoutUser()
    }
};

function GetModules(){
    var jwts = GetStoredUserData()
    if(jwts.role.length>0){
        $('#roleholder').empty();
        
        if(jwts.role.includes("SUPERADMIN"))
        {
          var HR = `
          <div class="col-md-6 col-lg-4 m-4">
              <div class="card h-100">
                <img class="card-img-top" src="assets/img/elements/18.jpg" alt="Card image cap">
                <div class="card-body">
                  <h5 class="card-title">HR</h5>
                  <p class="card-text">
                    Add users, track activity.
                  </p>
                  <a href="#" class="btn btn-yellotick-rev" onclick="window.location.href = 'hr.html';" >Submit </a>
                </div>
              </div>
            </div>`;
          $('#roleholder').append(HR);


          var sales = `<div class="col-md-6 col-lg-4 m-4">
                    <div class="card h-100">
                      <img class="card-img-top" src="assets/img/elements/6.jpg" alt="Card image cap">
                      <div class="card-body">
                        <h5 class="card-title">Sales</h5>
                        <p class="card-text">
                          Add merchants, view profile.
                        </p>
                        <a href="#" class="btn btn-yellotick-rev" onclick="window.location.href = 'sales.html';" >Submit</a>
                      </div>
                    </div>
                  </div>`;
    
            $('#roleholder').append(sales);
          

        var salesmanager = `<div class="col-md-6 col-lg-4 m-4">
            <div class="card h-100">
              <img class="card-img-top" src="assets/img/elements/6.jpg" alt="Card image cap">
              <div class="card-body">
                <h5 class="card-title">Sales</h5>
                <p class="card-text">
                  Add merchants, view profile.
                </p>
                <a href="#" class="btn btn-yellotick-rev" onclick="window.location.href = 'salesmanager.html';" >Submit</a>
              </div>
            </div>
          </div>`;

        $('#roleholder').append(salesmanager);

        }
        else
        {
        for(i =0;i<jwts.role.length;i++){
            if(jwts.role[i]==="HR")
            {
                var txts = `
                <div class="col-md-6 col-lg-4 m-4">
                    <div class="card h-100">
                      <img class="card-img-top" src="assets/img/elements/18.jpg" alt="Card image cap">
                      <div class="card-body">
                        <h5 class="card-title">`+ jwts.role[i] +`</h5>
                        <p class="card-text">
                          Add users, track activity.
                        </p>
                        <a href="#" class="btn btn-yellotick-rev" onclick="window.location.href = 'hr.html';" >Submit </a>
                      </div>
                    </div>
                  </div>`;
    
            $('#roleholder').append(txts);
            }
            else if(jwts.role[i]==="SALES")
            {

              if(jwts.role.includes("MANAGER")){
                var txts = `<div class="col-md-6 col-lg-4 m-4">
                    <div class="card h-100">
                      <img class="card-img-top" src="assets/img/elements/6.jpg" alt="Card image cap">
                      <div class="card-body">
                        <h5 class="card-title">`+ jwts.role[i] +`</h5>
                        <p class="card-text">
                          View merchants, team member performance.
                        </p>
                        <a href="#" class="btn btn-yellotick-rev" onclick="window.location.href = 'salesmanager.html';" >Submit</a>
                      </div>
                    </div>
                  </div>`;
              $('#roleholder').append(txts);
              }
              else{
                var txts = `<div class="col-md-6 col-lg-4 m-4">
                    <div class="card h-100">
                      <img class="card-img-top" src="assets/img/elements/6.jpg" alt="Card image cap">
                      <div class="card-body">
                        <h5 class="card-title">`+ jwts.role[i] +`</h5>
                        <p class="card-text">
                          Add merchants, view profile.
                        </p>
                        <a href="#" class="btn btn-yellotick-rev" onclick="window.location.href = 'sales.html';" >Submit</a>
                      </div>
                    </div>
                  </div>`;
              $('#roleholder').append(txts);
              }


            }

        }
      }
        
    }
}