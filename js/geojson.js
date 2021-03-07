// creates map from leaflet interactions, adds controls, summons tiles, etc.
function mapFactory() {
  //create the map

  let map = L.map('mapid', {
    attributionControl: false,
    maxBounds: [[50, 4], [62, -8.5]],
    center: [55, -4.5],
    zoom: 6,
    loadingControl: true
  });

  //create tiles, add to map
  L.tileLayer('https://api.mapbox.com/styles/v1/bstrock/ckkyvuz9f34ng17qvc0grkfqw/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    minZoom: 6,
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

  // magic leaflet control stuff happens in this function
  makeLegend(map);

  //constructor function above is instantiated here
  L.control.legend = (opts) => {return new L.Control.Legend(opts)};

  //attach time legend to map
  L.control.legend({position: 'bottomleft'}).addTo(map);

  // extend control to make slider
  makeSliderControl(map);

  // slider control constructor function
  L.control.sliderControl = (opts) => {return new L.Control.SliderControl(opts)};

  // instantiate slider and add to map
  L.control.sliderControl({position: 'bottomleft'}).addTo(map); // adds slider to map

  map.addEventListener('mousedown', function(){
    if (timer !== null){
      $('#play-button').attr('state', 'off');
      let play = 'img/play.svg';
      $('#play-button').css('background-image', "url(" + play + ")");
      clearInterval(timer);
      timer = null;
    }
  });

}

// extends control class to enable time legend
function makeLegend(map) {

  L.Control.Legend = L.Control.extend({
    position: 'bottomright',
    onAdd: function (map) {
      let div = L.DomUtil.create("div", "time-legend");

      // I'd like to get the styling done in CSS, but this worked first.
      div.innerHTML = '<h2 style="font-family:\'Ibarra Real Nova">Year:&nbsp;<span id="year-view">10000</span><span id="era-view"> BCE</span></h2>';
      div.style.backgroundColor = 'lightgrey';
      div.style.textAlign = 'left';
      div.style.width = '300px';
      div.style.padding = '.5em';
      div.style.borderStyle = 'solid';
      div.style.borderWidth = '2px';
      div.style.borderColor = 'darkgrey';
      div.style.borderRadius = '5px';
      return div;
    },

    onRemove: function (map) {  // this is really important for some reason??
    }
  });
}

// extends control class to enable slider control
function makeSliderControl(map) {

  L.Control.SliderControl = L.Control.extend({
    position: 'bottomleft',
    onAdd: function (map) {
      let div = L.DomUtil.create("div", "slider-control");

      //also would be nice as CSS instead of clutter
      div.style.backgroundColor = 'lightgrey';
      div.style.padding = '.5em';
      div.style.borderStyle = 'solid';
      div.style.borderWidth = '2px';
      div.style.borderColor = 'darkgrey';
      div.style.borderRadius = '5px';
      div.style.width = '300px';
      div.style.margin = '7px';


      // stops map from moving when slider is clicked
      L.DomEvent.disableClickPropagation(div);

      return div;
    },
    onRemove: function (map) {
    }

  });
}

// ajax call to get the geojson data
// callback functions: process data, create symbols, create sequence controls
function getData(map) {
  /* AJAX call happens here
  waits until data is loaded
  inputs: leaflet map object */



  let data = $.getJSON('data/gbc14-10k.geojson', function() {

    $.when(data).done(function(){
      let geoJSON = data.responseJSON;
      console.log(geoJSON);
      let attributes = processData(geoJSON);  //gets ordered array of years
      createPropSymbols(geoJSON, map, attributes);  // instantiates symbols
      createSequenceControls(map, attributes);  // instantiates range slider & listener
    });
  });
}

// does the messy work of getting attributes for the slider from the json data
function processData(data) {

  // let's get properties
  let properties = data.features[0].properties;

  // properties are k-v pairs, we want the keys
  let attArray = $.map(properties, function(v, i){
    return i;
  });

  // so.
  // JavaScript does some apparently silly things.  Buckle up for this.
  let tenKYA = properties['-10000']; // For some reason, the value "-10000" disappears from the simple key call above.
  attArray.unshift(tenKYA);  // we have to add its value back in.

  // user agent detection necessary because chrome and safari don't agree on how to sort numbers...
  switch(sniffSniff()){
    // safari = true, chrome = false
    case true:
     return safariSort(attArray);

    case false:
      return chromeSort(attArray);

  }
}

// checks if user is in safari or chrome to decide how numbers should be sorted
function sniffSniff(){
  let agent = navigator.userAgent;
  let chromeAgent = agent.indexOf("Chrome") > -1;
  let safariAgent = agent.indexOf("Safari") > -1;
  if ((chromeAgent) && (safariAgent)) safariAgent = false;
  return safariAgent;
}

// the sorting that happens for safari
function safariSort(attArray){
   attArray.sort(function(a, b){
        return a - b
      });

    // array is sorted low to high- let's keep everything but the strings at the end
      let keepValues = attArray.slice(0, 2366);
    return keepValues.filter( (value) => value !== 0);  // yes, this does in fact hurt.
}

// the much more involved sorting that has to happen for chrome
function chromeSort(attArray){
  // You'd think a simple sort function can sort things.
  // In chrome, this true only in a very disconnected sense.
  // Sorting our list of numbers, from -10000 to 1820, is not so straightforward.
  attArray.sort(function(a, b){
    return b - a ? -1 : 1;
  });

      // Now we have these values:  [-5, ... -9900, 1820, ... 0, <string column headers>, -9905, ... -10000]
      // What on Earth is to be done?
      // Enter the Frankenstein machine.

  let negVals = attArray.slice(0, 1980);
  negVals.reverse();
  let posVals = attArray.slice(1980, 2345);
  posVals.reverse();
  let strayNegVals = attArray.slice(2364);
  strayNegVals.reverse();
  let firstStep = strayNegVals.concat(negVals);
  return firstStep.concat(posVals);
      // Whew.
}

// attaches event listeners to the culture buttons in the sidebar, so that symbols change color when you click them
function buttonFactory(map) {
  let buttons = $(":button");
  for (let i = 0; i < buttons.length; i++) {
    let buttonID = buttons[i].id; // get button id
    buttons[i].state = 'off'; // give it an off state to toggle
    buttons[i].addEventListener('click', function(){
      updateMarkerColor(buttonID, map); // callback function can be changed to repurpose this code
      });
  }
}

// creates the slider input element, initializes its range values, and adds event listener
function createSequenceControls(map, attributes) {
  // create slider controls
  $('.slider-control').append('<div class="container" id="time-container"><span class="play-button" id="play-button"></span><span class="" id="play-speed">x2</span><input class="range-slider" type="range" id="range"><span class="replay-button" id="replay-button"></span></div>');

  // configure range slider values
  $('.range-slider').attr({
    min: 0,
    max: 2364,
    value: 0,
    step: 1,
  });

  // initialize play button
  $('#play-button').attr({
    state: 'off'
  });

  // initialize play speed
  $('#play-speed').attr({
    speed: speed[0]
  });

  // slider movement event listener- hands off to update functions
  $('.range-slider').on('input', function() {
    let index = $(this).val();
    updatePropSymbols(map, attributes[index]);
    updateTimeLegend(attributes[index], 5); // gives the time legend the correct year to show

    // stops playback if slider is moved
    if (timer !== null) {
      stopPlayback();
    }
  });

  // without this, only dragging range input will correctly update symbols and legend
  $('.range-slider').on('click', function() {
    let index = $(this).val();
    updatePropSymbols(map, attributes[index]);
    updateTimeLegend(attributes[index], 5); // gives the time legend the correct year to show

    // stops playback if slider is clicked
    if (timer !== null) {
      stopPlayback();
    }
  });

  // controls playback button
  $('#play-button').on('click', function() {
    let state = $(this).attr('state');

    switch (state) {
      case 'off':
        $(this).attr('state', 'on');
        let pause = 'img/pause.svg';
        $(this).css('background-image', "url(" + pause + ")");
        let slider = document.getElementById("range");

        // this block resets slider if play is clicked when at max value
        if (slider.value === slider.max) {
          slider.value = 0;
          stopPlayback();
          break; // this is really important!!!!
        }
        // initializes the timer which advances the range-slider to control playback functionality
        timer = setInterval(function () {
          // this block resets slider if playback reaches max value
          if (slider.value === slider.max) {
            slider.value = 0;
            stopPlayback();
          }
          slider.stepUp(1); // playback speed is actually controlled by size of step

          // less detail on time legend during playback
          updateTimeLegend(attributes[slider.value], speed[1]); // otherwise the year flickers like crazy and it's distracting
          updatePropSymbols(map, attributes[slider.value]);

        }, 5); // dox say lowest value is 10- not touching it
        break;

      case 'on':
        stopPlayback();

        break;
    }
  });

  // playback speed controls
  // all in all, this was really challenging

  $('#play-speed').on('click', function(){
    let currentSpeed = $('#play-speed').attr('speed');
    console.log('click')
    switch(currentSpeed){


      // in each case, the following are configured:
      // speed global variable, button attribute, button html (text), input slider step value
      // clicking one cycles to the next: x1-x2-x4
      case '1':
        speed = [2, 50];
        $('#play-speed').attr('speed', speed[0]);
        $('#play-speed').html('x2');
        $('.range-slider').attr('step', '2');
        break;
      case '2':
        speed = [4, 100];
        $('#play-speed').attr('speed', speed[0]);
        $('#play-speed').html('x4');
        $('.range-slider').attr('step', '4');
        break;
      case '4':
        speed = [1, 10];
        $('#play-speed').attr('speed', speed[0]);
        $('#play-speed').html('x1');
        $('.range-slider').attr('step', '1');
    }
    });

  $("#replay-button").on('click', function() {
    let slider = document.getElementById("range");
    slider.value = 0;
    stopPlayback();
    updateTimeLegend(attributes[slider.value], speed[1]);
    updatePropSymbols(map, attributes[slider.value]);
  })

}

function stopPlayback() {
  // change button state, change background image, clear and replace interval

  $('#play-button').attr('state', 'off');
  let play = 'img/play.svg';
  $('#play-button').css('background-image', "url(" + play + ")");
  clearInterval(timer);
  timer = null;
}

// when we need point symbols from geojson data, we turn to this symbol, which calls the pointToLayer
function createPropSymbols(data, map) {
  // uses geoJson function to instantiate circlemarkers from geojson data
  // IE it turns data into markers at the start of the map

  L.geoJson(data, {
    pointToLayer: function(feature, latlng){
      return symbolFactory(feature, latlng, 0)
    }
    }).addTo(map);
}

// instantiates markers, initializes marker style attributes, attaches popups
function symbolFactory(feature, latlng, attribute) {

  //inputs: GSON feature, latlng coordinate pair
  //outputs: leaflet circlemarker object with style and interaction properties set

  //define style
  let geoMarkerOptions = {
    fillColor: 'white',
    color: '#FFF',
    weight: .5,
    opacity: 1,
    fillOpacity: .5,
  };

  // get value of attributes
  let attValue = Number(feature.properties[attribute]);

  // calculate radius
  geoMarkerOptions.radius = calcPropRadius(attValue);

  // create marker
  let layer = L.circleMarker(latlng, geoMarkerOptions);

  // make me a popup
  createPopup(feature.properties, layer);

  // turn off playback if open popup clicked
  layer.addEventListener('click', function(){
    if (timer !== null) {
      $('#play-button').attr('state', 'off');
      let play = 'img/play.svg';
      $('#play-button').css('background-image', "url(" + play + ")");
      clearInterval(timer);
      timer = null;
    }});

  // we all need a little culture
  layer.culture = feature.properties.Culture || {};
  return layer;
}

// scaling function for symbols based on attribute value selected by slider control
function calcPropRadius(attValue) {

  /* calculates radius of circle to inform prop symbols
  inputs:  attributes value to calculate
  returns:  radius (numeric value) */

  let radius = 40 * Math.pow(attValue, .2);

  return radius;
}

// gets attribute data and populates popups
function createPopup(properties, layer){

    // generate popup content
  let popUpContent = "<p><b>Site Name: </b>" + properties['SiteName'] + "<br>";

    // not all fields have content...prevent blank entries
    if (properties['Material']) {
      popUpContent += "<b>Material: </b>" + properties['Material'] + "<br>";
    }

    if (properties['MaterialSpecies']){
      popUpContent += "<b>Material Species: </b>" + properties['MaterialSpecies'] +  "<br>";
    }

  if (properties['Culture'].length > 0) {
    popUpContent += "<b>Culture: </b>" + properties['Culture'] + "</p>";
  }

  // bind popup to marker
  layer.bindPopup(popUpContent);

}

// when you move the slider, this pops off and makes the symbols different sizes as the year changes
// also changes the corresponding year in the time legend
function updatePropSymbols(map, attribute){
  //inputs: leaflet map object, attribute array
  //returns: none (NOTE- updates properties of existing objects!)
  map.closePopup();  // the slider is moving, close the popups

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

// business function that formats and displays values for year in the time legend
function updateTimeLegend(attribute, interval) {

  // updates the time legend with the correct value
  let attVal = Math.abs(attribute);  // removes negative sign from integers for display formatting
  // this ensures correct formatting for years depending on negative or positive value

  if (attribute % interval === 0) {
    if (attribute < 0) {
      $('#year-view').html(attribute.slice(1));
      $('#era-view').html('BCE');

      // this if-else block locates the BCE/CE text according to the length of the year string
      // otherwise we have years that look like this:  40           CE
      if (attVal === 10000) {
        $('#era-view').css('margin-right', '1em');
        } else if (attVal < 100) {
        $('#era-view').css('margin-right', '2.3em');
      } else if (attVal < 1000) {
        $('#era-view').css('margin-right', '2em');
      } else if (attVal < 10000) {
        $('#era-view').css('margin-right', '1.45em');
      }
      // positive values formatted here
    } else if (attribute > 0) {
      $('#era-view').html('CE').css('margin-right', '2.7em');
      $('#year-view').html(attribute);
      if (attVal < 1000) {
      } else if (attVal < 10000) {
        $('#era-view').css('margin-right', '2.3em');
      }
    }
  }
}

// callback function for culture button click event listener
function updateMarkerColor(buttonID, map) {
  // the buttonID handed off here comes from the feature value assigned to the listener

  // color dictionary
  let Color = {
    'British EN': 'rgba(166, 206, 227, .75)',
    'Grooved Ware': 'rgba(51, 160, 44, .75)',
    'EBA': 'rgba(251, 154, 153, .75)',
    'British MN': 'rgba(202, 178, 214, .75)',
    'British LN': 'rgba(253, 191, 111, .75)',
    'Late Meso': 'rgba(227, 26, 28, .75)',
    'Obanian': 'rgba(106, 61, 154, .75)',
    'Pitted Ware': 'rgba(255, 127, 0, .75)',
    'Bell Beaker': 'rgba(178, 223, 138, .75)',
    'Orkney': 'rgba(31, 120, 180, .75)',
  };

  let onColor = Color[buttonID];
  changeButtonColor(buttonID, Color); //changes button color

  // THIS ALL WORKS, BUT...
  // it would probably be better to use layergroups, yes?
  // make that happen
  // big performance much yes
  map.eachLayer(function (layer) {

    if (layer.feature) {

      // first case: resets all markers to white if mono is clicked
      if (buttonID === 'mono') {
        let options = {
          fillColor: 'white',
          fillOpacity: .5
        };
        layer.setStyle(options);

      // second case: turns all markers their respective colors if poly is clicked
      } else if (buttonID === 'poly'){
        let options = {
          fillColor: Color[layer.culture]
        };
        layer.setStyle(options);

      // third case:  change the color from white to hue or hue to white, depending on current color
      } else {
        if (layer.culture === buttonID) {

          let currentColor = layer.options.fillColor;
          if (currentColor === 'white') {
            // this changes the marker to its color
            let options = {
              fillColor: onColor,
            };
            layer.setStyle(options);
          } else {
            // this changes a colored marker to white
            let options = {
              fillColor: 'white',
              fillOpacity: .5
            };
            layer.setStyle(options);
          }
        }
      }
    }
  });
}

// changes the color of the buttons based on state
function changeButtonColor(buttonID, Color) {

  // controls top two buttons (all or nothing toggle)
  if (buttonID === 'mono' || buttonID === 'poly') {

  switch(buttonID) {

    case 'mono':
      // will always be off, always be the same color
      let buttonsM = $(":button");

      for (let i = 0; i < buttonsM.length; i++) {
        buttonsM[i].style.backgroundColor = '#f8f9fa';
        buttonsM[i].state = 'off';
      }
      break;

    case 'poly':
      // turns on all colors

      let buttonsP = $(":button");

      for (let i = 0; i < buttonsP.length; i++) {
        let id = buttonsP[i].id;
        buttonsP[i].style.backgroundColor = Color[id];
        buttonsP[i].state = 'on';
      }
      break;
    }

  } else {

    // individual button functionality
    let button = document.getElementById(buttonID); // get the button
    let onColor = Color[buttonID]; // the color the button will be

    // turn the button on or off and assign color as appropriate
    switch (button.state) {
      case 'off':
        button.state = 'on';
        button.style.backgroundColor = onColor;
        break;

      case 'on':
        button.state = 'off';
        button.style.backgroundColor = null;
        break;

    }
  }
}

// stops playback because that has to happen in lots of places


// global variables controlling playback speed
speed = [2, 50];
timer = null;

// let's make it happen
 $(document).ready(function() {
   mapFactory();
});
