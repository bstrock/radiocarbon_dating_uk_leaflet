function mapFactory() {
  //create the map
  let map = L.map('mapid', {
    attributionControl: false,
    center: [53, -2.5],
    zoom: 7
  });

  //create tiles, add to map
  L.tileLayer('https://api.mapbox.com/styles/v1/bstrock/ckkyvuz9f34ng17qvc0grkfqw/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 10,
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiYnN0cm9jayIsImEiOiJjanpkOG82M28wOGRzM2xtb3ptNHR5YzlvIn0.gGUJvtXSIRlx-VgF3avzDw'
  }).addTo(map);

  // move attribution control
  L.control.attribution({
    position: 'topright'
  }).addTo(map);

  //call to retrieve map data
  getData(map);

  //attaches listeners to buttons for "culture" field
  buttonFactory(map);

  //perhaps make this a function?
  //anyway, it's a legend.
  L.Control.Legend = L.Control.extend({
    position: 'bottomright',
    onAdd: function (map) {
      let div = L.DomUtil.create("div", "time-legend");

      // I'd like to get the styling done in CSS, but this worked first.
      div.innerHTML = '<h2 style="font-family:\'Ibarra Real Nova">Year: 10000 BCE</h2>';
      div.style.backgroundColor = 'lightgrey';
      div.style.textAlign = 'left';
      div.style.width = '275px';
      div.style.padding = '.5em';
      div.style.borderStyle = 'solid';
      div.style.borderWidth = '2px';
      div.style.borderRadius = '5px';
      return div;
    },

    onRemove: function (map) {  // this is really important for some reason??
    }
  });

  //constructor function above is instantiated here
  L.control.legend = function (opts) {
    return new L.Control.Legend(opts);
  }
  L.control.legend({position: 'bottomright'}).addTo(map);  //attach time legend to map

  // constructor for slider control
  L.Control.SliderControl = L.Control.extend({
    position: 'bottomleft',
    onAdd: function (map) {
      let div = L.DomUtil.create("div", "slider-control");

      //also would be nice as CSS instead of clutter
      div.style.backgroundColor = 'lightgrey';
      div.style.padding = '.5em';
      div.style.borderStyle = 'solid';
      div.style.borderWidth = '2px';
      div.style.borderRadius = '5px';
      div.style.width = '300px';

      // stops map from moving when slider is clicked
      L.DomEvent.disableClickPropagation(div);

      return div;
    },
    onRemove: function (map) {
    }

  });

  // instantiates slider control
  L.control.sliderControl = function (opts) {
    return new L.Control.SliderControl(opts);
  };

  L.control.sliderControl({position: 'bottomleft'}).addTo(map); // adds slider to map
}

function getData(map) {
  /* AJAX call happens here
  waits until data is loaded
  inputs: leaflet map object */

  let data = $.getJSON('data/gbc14.geojson', function() {
    $.when(data).done(function(){
      console.log(data.responseJSON);
      let attributes = processData(data.responseJSON);  //gets ordered array of years
      createPropSymbols(data.responseJSON, map, attributes);  // instantiates symbols
      createSequenceControls(map, attributes);  // instantiates range slider & listener
    });
  });
}

function processData(data) {

  // let's get properties
  let properties = data.features[0].properties;

  // properties are k-v pairs, we want the keys
  let attArray = Object.keys(properties);

  console.log(attArray);

  // sort the array, function returns lower value
  attArray.sort(function(a, b){return a - b})


  // array is sorted low to high- let's keep everything but the strings at the end
  let keepValues = attArray.slice(1131, 3496);
  console.log(keepValues.length);

    return keepValues;

}

function createPropSymbols(data, map) {
  // uses geoJson function to instantiate circlemarkers from geojson data
  // IE it turns data into markers at the start of the map

  L.geoJson(data, {
    pointToLayer: function(feature, latlng){
      return symbolSizer(feature, latlng, 0)
    }
    }).addTo(map);
}

function symbolSizer(feature, latlng, attribute) {

  /* informs look and interaction for symbol objects
  inputs: GSON feature, latlng coordinate pair
  outputs: leaflet circlemarker object with style and interaction properties set*/

  let geoMarkerOptions = {
    fillColor: '#FFF',
    color: '#FFF',
    weight: .5,
    opacity: 0,
    fillOpacity: 1,
  };

  // get value of attributes
  let attValue = Number(feature.properties[attribute]);

  // calculate radius
  geoMarkerOptions.radius = calcPropRadius(attValue);

  // create marker
  let layer = L.circleMarker(latlng, geoMarkerOptions);

  createPopup(feature.properties, layer);

  layer.culture = feature.properties.Culture || {}; // we all need a little culture
  return layer;
}

function calcPropRadius(attValue) {

  /* calculates radius of circle to inform prop symbols
  inputs:  attributes value to calculate
  returns:  radius (numeric value) */

  let radius = 40 * Math.pow(attValue, .2)

  return radius;
}

function createPopup(properties, layer){
    // generate popup content
  let popUpContent = "<p><b>Name: </b>" + properties['SiteName'] + "<br>" +
                      "<b>Material: </b>" + properties['Material'] +  "<br>" +
                      "<b>Material Species: </b>" + properties['MaterialSpecies'] +  "<br>" +
                      "<b>Culture: </b>" + properties['Culture'] + "</p>";

  // bind popup to marker
  layer.bindPopup(popUpContent);

}

function createSequenceControls(map, attributes) {
  //create range input element (slider)
  $('.slider-control').append('<input class="range-slider" type="range">');

  // define properties of slider
  // change this array to change input values
  // why is it broken in chrome?
  $('.range-slider').attr({
    min: 0,
    max: 2364,
    value: 0,
    step: 1
  });

  // slider movement event listener- hands off to update function
  $('.range-slider').on('input', function () {
    let index = $(this).val();
    updatePropSymbols(map, attributes[index]);
  });
}

function updatePropSymbols(map, attribute){
  /* this function is triggered when slider input is detected
  inputs: leaflet map object, attribute array
  returns: none (NOTE- updates properties of existing objects!)
   */
  map.closePopup();  // the slider is moving, close the popups

  updateTimeLegend(attribute); // gives the time legend the correct year to show

  // each marker is a layer- this method iterates through them

  map.eachLayer(function(layer){
    // check for existence of a feature
    if (layer.feature){

      let props = layer.feature.properties;

       //update each feature's radius based on new attribute values
      let radius = calcPropRadius(props[attribute]);
      layer.setRadius(radius);
    }
  })
}

function updateTimeLegend(attribute){
  // updates the time legend with the correct value
  // displays in multiples of ten (decades)

  if (attribute % 10 == 0) {  // decade filter

    // this ensures correct formatting for years depending on negative or positive value
    if (attribute < 0){
      $('.time-legend').html('<h2 style="font-family:\'Ibarra Real Nova">Year: ' + attribute.slice(1) + ' BCE</h2>')
    } else {
      $('.time-legend').html('<h2 style="font-family:\'Ibarra Real Nova">Year: ' + attribute + ' CE</h2>')
    }
  }
}

function buttonFactory(map) {

  // attaches event listeners to the culture buttons in the sidebar
  let buttons = $(":button");
  for (let i = 0; i < buttons.length; i++) {
    let buttonID = buttons[i].id;
    buttons[i].addEventListener('click', function(){
      updateMarkerColor(buttonID, map) // callback function can be changed to repurpose this code
    })
  }
}

function updateMarkerColor(buttonID, map) {
  // the buttonID handed off here comes from the feature value assigned to the listener

  // color dictionary
  let Color = {
    'British EN': '#a6cee3',
    'Grooved Ware': '#33a02c',
    'EBA': '#fb9a99',
    'British MN': '#cab2d6',
    'British LN': '#fdbf6f',
    'Late Meso': '#e31a1c',
    'Obanian': '#6a3d9a',
    'Pitted Ware': '#ff7f00',
    'Bell Beaker': '#b2df8a',
    'Orkney': '#1f78b4',
  };

  // THIS ALL WORKS, BUT...
  // it would probably be better to use layergroups, yes?
  // make that happen
  // big performance much yes
  map.eachLayer(function (layer) {

    if (layer.feature) {

      // this resets all markers to white if mono is clicked
      if (buttonID === 'mono') {
        let options = {
          fillColor: 'white'
        };
        layer.setStyle(options);

        // otherwise, match the culture to the button clicked and set the appropriate color
      } else {
        if (layer.culture === buttonID) {

          let currentColor = layer.options.fillColor;
          if (currentColor === 'white') {
            let options = {
              fillColor: Color[buttonID]
            };
            layer.setStyle(options);
          } else {
            let options = {
              fillColor: 'white'
            };
            layer.setStyle(options);
          }
        }
      }
    }

    $('#' + buttonID).css('background-color', Color[buttonID]);
    console.log(buttonID, Color[buttonID]);
  });
}


$(document).ready(mapFactory);
