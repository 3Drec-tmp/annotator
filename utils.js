let imagesArray = [];
var anotation_tool = null;
var satellite_tool = null;
var active_img = null;
var active_sat_img_name = null;
var active_polygon_id = 0;

const url = "http://147.32.71.74:443/api/insert_annotation";

function setActiveAnnot(id) {
  if (anotation_tool != null) {
    anotation_tool.setActive(id === 1);
  }
  if (satellite_tool != null) {
    satellite_tool.setActive(id === 0);
  }
  if (id === 1) {
    container = document.getElementById("canvas_main");
    container.style.border_bottom = "2px solid black";
    container = document.getElementById("canvas_sec");
    container.style.border = "0px solid black";
  } else {
    container = document.getElementById("canvas_main");
    container.style.border = "0px solid black";
    container = document.getElementById("canvas_sec");
    container.style.border_bottom = "2px solid black";
  }
}

function sendToCanvas(index) {
  console.log(imagesArray[index]);
  active_img = imagesArray[index];

  container = document.getElementById("canvas_main");
  container.innerHTML = "";
  container.innerHTML = `<canvas id="canvas_img" style="border:0px solid black;"></canvas>`;
  containerz = document.getElementById("canvas_main_zoom");
  containerz.innerHTML = "";
  containerz.innerHTML = `<canvas id="zoom_main_win" width="200" height="200" ></canvas>
`;

  anotation_tool = new AnotationCanvas(
    "canvas_img",
    "zoom_main_win",
    URL.createObjectURL(imagesArray[index]),
    1200
  );
  anotation_tool.init(active_polygon_id);
  anotation_tool.init_zoom();

  if (satellite_tool != null) {
    if (!confirm("Does the loaded satellite image match with the new img?")) {
      requestSat();
    }
  }
}

function setActivePolygon(index) {
  active_polygon_id = index;
  if (anotation_tool != null) {
    anotation_tool.changeActivePolygon(index);
  }
  if (satellite_tool != null) {
    satellite_tool.changeActivePolygon(index);
  }
}

function displayImageList(output) {
  let images = "";

  imagesArray.forEach((image, index) => {
    images += `<div>
                    <button type="button" class="btn btn-outline-dark btn-small" onclick="sendToCanvas(${index})">
                        "${image.name}"
                    </button>
                        <span onclick="deleteImage(${index})" style="cursor:pointer;">&times;</span>
                    </div>`;
  });
  output.innerHTML = images;

  if (anotation_tool == null) {
    sendToCanvas(0);
  }
}

function pixelToLatLon(zoomLevel, startLat, startLon, dxPixels, dyPixels) {
  const spatialResolution =
    (156543.03392 * Math.cos((startLat * Math.PI) / 180)) /
    Math.pow(2, zoomLevel);

  console.log(spatialResolution);
  const earthRadius = 6378137; // Earth's radius in meters (approximate)

  const dxMeters = dxPixels * spatialResolution;
  const dyMeters = dyPixels * spatialResolution;

  const dLat = ((dyMeters / earthRadius) * 180) / Math.PI;
  const dLon =
    ((dxMeters / earthRadius) * 180) /
    Math.PI /
    Math.cos((startLat * Math.PI) / 180);

  const endLat = startLat + dLat;
  const endLon = startLon + dLon;

  return [endLat, endLon];
}

function deleteImage(index) {
  console.log(index);
  imagesArray.splice(index, 1);

  imageList = document.getElementsByClassName("image-list-content")[0];
  displayImageList(imageList);
}

function dmsToDecimal(degs, mins, secs, direction) {
  let sign = 1;
  if (direction == "S" || direction == "W") {
    sign = -1;
  }
  return sign * (Math.abs(degs) + mins / 60 + secs / 3600);
}

function requestSat() {
  if (anotation_tool == null) {
    alert("You have to load image first");
    return;
  }

  EXIF.getData(active_img, function () {
    var MetaData = EXIF.getAllTags(this);
    console.log(JSON.stringify(MetaData, null, "\t"));
    if (!("GPSLatitude" in MetaData) || !("GPSLongitude" in MetaData)) {
      alert("No location data found, cant get the satellite image.");
      return;
    }
    var coordLat = dmsToDecimal(
      ...MetaData["GPSLatitude"],
      MetaData["GPSLatitudeRef"]
    );
    var coordLon = dmsToDecimal(
      ...MetaData["GPSLongitude"],
      MetaData["GPSLongitudeRef"]
    );
    if (
      !(typeof coordLat === "undefined") &&
      !(typeof coordLon == "undefined")
    ) {
      requestDist([coordLat, coordLon]);
    } else {
      alert("No location data found, cant get the satellite image.");
    }
  });
}

function sendSatRequest(data, success_fun) {
  $.ajax({
    url: "http://147.32.71.74:443/api/request_satelite_image",
    type: "GET",
    CORS: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    data: data,
    xhr: function () {
      // Seems like the only way to get access to the xhr object
      var xhr = new XMLHttpRequest();
      xhr.responseType = "blob";
      return xhr;
    },
    success: success_fun,
    error: function (data) {
      console.log(data);
      alert("Error occured, try again");
    },
  });
}

function requestZoomed(new_coords) {
  console.log();
  data = {
    lat: new_coords[0],
    lon: new_coords[1],
    zoom: 20,
    img_name: new_coords.toString() + "_20.jpg",
  };

  success_fn = (data) => {
    console.log(data);
    container = document.getElementById("canvas_sec");
    container.innerHTML = "";
    container.innerHTML = `<canvas id="canvas_sat" style="border:1px solid black;"></canvas>`;
    containerz = document.getElementById("canvas_sec_zoom");
    containerz.innerHTML = "";
    containerz.innerHTML = `<canvas id="zoom_sec_win" width="200" height="200"></canvas>
`;
    let satUrl = URL.createObjectURL(data);
    console.log(satUrl);
    satellite_tool = new AnotationCanvas(
      "canvas_sat",
      "zoom_sec_win",
      satUrl,
      600
    );
    satellite_tool.init(active_polygon_id);
    satellite_tool.init_zoom();
    active_sat_img_name = new_coords.toString() + "_20.jpg";
  };
  sendSatRequest(data, success_fn);
}

function requestDist(coords) {
  var new_coords;
  data = {
    lat: coords[0],
    lon: coords[1],
    zoom: 19,
    img_name: coords.toString() + "_19.jpg",
  };
  success_fun = (data) => {
    console.log(data);
    var overlay = document.getElementById("overlay");
    overlay.style.display = "block";
    var img = document.getElementById("img");
    img.src = URL.createObjectURL(data);
    $("#img").on("click", (event) => {
      console.log(event);
      console.log(this);
      var dx = event.originalEvent.layerX - event.target.width / 2;
      var dy = event.target.width / 2 - event.originalEvent.layerY;
      new_coords = pixelToLatLon(19, coords[0], coords[1], dx, dy);
      overlay.style.display = "none";
      requestZoomed(new_coords);
    });
  };
  sendSatRequest(data, success_fun);
}

function sendAnnot() {
  if (anotation_tool == null || satellite_tool == null) {
    alert("You have to load image and satellite image first");
    return;
  }
  if (anotation_tool.isEmpty() || satellite_tool.isEmpty()) {
    alert("You have to annotate image and satellite image first");
    return;
  }
  if (
    confirm(
      "Are you sure satellite image matches and you want to send the annotations?"
    )
  ) {
    // POST REQUEST TO SERVER ANNOTATIONS
    const formData = new FormData();
    formData.append("annot_pic", anotation_tool.get_annotation_obj());
    formData.append("img_pic", active_img);
    formData.append("img_pic_name", active_img.name);
    formData.append("img_pic_width", anotation_tool._original_img_shape[0]);
    formData.append("img_pic_height", anotation_tool._original_img_shape[1]);
    formData.append("annot_sat", anotation_tool.get_annotation_obj());
    formData.append("img_sat_name", active_sat_img_name);

    console.log(formData);
    console.log("sending annot");
    fetch(url, {
      method: "POST",
      body: formData,
      CORS: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "multipart/form-data",
      },
    })
      .then((data) => {
        console.log(data);
        // remove canvas and image from images
      })
      .catch((error) => {
        console.error(error);
      });

    const index = imagesArray.indexOf(active_img);
    deleteImage(index);
    // anotation_tool.destroy();
    anotation_tool = null;
    containerz = document.getElementById("canvas_main_zoom");
    containerz.innerHTML = "";
    containerz.innerHTML = `<canvas id="zoom_main_win" width="200" height="200" ></canvas>`;

    container = document.getElementById("canvas_main");
    container.innerHTML = "";
    container.innerHTML = `<canvas id="canvas_img" style="border:1px solid black;"></canvas>`;
    if (imagesArray.length > 0) {
      active_img = imagesArray[0];
      sendToCanvas(active_img);
    }
  }
}

document.addEventListener("DOMContentLoaded", function (event) {
  const fileSelector = document.getElementById("file-selector");
  const imageList = document.getElementsByClassName("image-list-content")[0];

  fileSelector.addEventListener("change", (event) => {
    const fileList = event.target.files;
    console.log(fileList);
    for (let i = 0; i < fileList.length; i++) {
      imagesArray.push(fileList[i]);
    }
    displayImageList(imageList);
  });
});
