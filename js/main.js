function jQueryAjax(){
  $.ajax('data/c14sites.geojson', {
    datatype: 'json',
    success: callback
  });
};

function callback(response) {
  console.log(response);
};


// LEAFLET MAP

// creates mymap object with view property

var mymap = L.map('mapid').setView([51.505, -0.09], 6);

L.tileLayer('https://api.mapbox.com/styles/v1/bstrock/ck8ci7is830om1inekvfwxr9z/tiles/{z}/{x}/{y}?access_token={accessToken}', {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
  maxZoom: 18,
  tileSize: 512,
  zoomOffset: -1,
  accessToken: 'pk.eyJ1IjoiYnN0cm9jayIsImEiOiJjanpkOG82M28wOGRzM2xtb3ptNHR5YzlvIn0.gGUJvtXSIRlx-VgF3avzDw'
}).addTo(mymap);

$.ajax('data/c14sites.geojson', {
  datatype: 'json',
  success: function(response){
    L.geoJson(response).addTo(mymap);
  }
});

$(document).ready(jQueryAjax());
/*

var popup = L.popup();

function onMapClick(e) {
  popup
    .setLatLng(e.latlng)
    .setContent("You clicked the map at " + e.latlng.toString())
    .openOn(mymap);
}

mymap.on('click', onMapClick);



*/
