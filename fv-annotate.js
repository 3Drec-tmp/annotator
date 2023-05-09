var colors = ["green", "blue", "purple", "yellow", "red"];
var modified = false;
var delete_polygon_key = 0;
var max_clases = 5;
var canvas_width = 900;

function pt_pt_dis(pt1, pt2) {
  return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
}

function pt_line_dist(newpt, pt1, pt2) {
  return (
    Math.abs(
      (pt2.x - pt1.x) * (pt1.y - newpt.y) - (pt1.x - newpt.x) * (pt2.y - pt1.y)
    ) / Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2))
  );
}

function pt_line_segment_dist(newpt, pt1, pt2) {
  var M = { x: pt2.x - pt1.x, y: pt2.y - pt1.y };
  var t0 =
    (M.x * (newpt.x - pt1.x) + M.y * (newpt.y - pt1.y)) /
    (M.x * M.x + M.y * M.y);
  var dist = -1;
  var dist_line = pt_line_dist(newpt, pt1, pt2);
  if (t0 <= 0) {
    dist = pt_pt_dis(newpt, pt1);
  }
  if (t0 >= 1) {
    dist = pt_pt_dis(newpt, pt2);
  }
  if (t0 > 0 && t0 < 1) {
    dist = dist_line;
  }
  return { d: dist, d_line: dist_line };
}

function AnotationPolygon(anotation_canvas, polygon_id, polygon_color) {
  this._polygon = null;
  this._points = [];
  this._labels = [];
  this._label_objects = [];
  this._next_label = 1;
  this._points_order = [];
  this._anotation_canvas = anotation_canvas;
  this._polygon_id = polygon_id;
  this._polygon_color = polygon_color;
  this._status = 0;

  this.init = function () {
    this._polygon = new fabric.Polygon(this._points, {
      left: -1,
      top: -1,
      scale: 1,
      opacity: 0.3,
      fill: this._polygon_color,
      strokeWidth: 2,
      stroke: this._polygon_color,
      objectCaching: false,
      transparentCorners: true,
      cornerSize: 6,
    });
    this._anotation_canvas._canvas.add(this._polygon);
    this._polygon.lockMovementX = true;
    this._polygon.lockMovementY = true;
    this._polygon.id = this._polygon_id;
    this._polygon.hoverCursor = "default";
    this._polygon.parent = this;
    this._polygon.selectable = false;
    this.refresh_active_mode();
  };

  this.refresh_active_label = function () {
    document.getElementById("poly_label").innerHTML =
      this._next_label.toString();
  };

  this.refresh_active_mode = function () {
    document.getElementById("mode").innerHTML =
      this._status == 0 ? "add" : "edit";
  };

  this.pt_pt_dis = function (pt1, pt2) {
    return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
  };

  this.pt_line_dist = function (newpt, pt1, pt2) {
    return (
      Math.abs(
        (pt2.x - pt1.x) * (pt1.y - newpt.y) -
          (pt1.x - newpt.x) * (pt2.y - pt1.y)
      ) / Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2))
    );
  };

  this.add_label = function (coords, idx) {
    const pointLabel = new fabric.Text(
      this._polygon_id + this._next_label.toString(),
      {
        left: coords.x,
        top: coords.y,
        textAlign: "center",
        fontSize: 16,
        fontWeight: "bold",
        fill: "black",
        stroke: "white",
        strokeWidth: 0.4,
      }
    );
    pointLabel.lockMovementX = true;
    pointLabel.lockMovementY = true;
    pointLabel.lockScalingX = true;
    pointLabel.lockScalingY = true;
    pointLabel.lockRotation = true;
    pointLabel.selectable = false;
    pointLabel.hoverCursor = "default";

    this._anotation_canvas._canvas.add(pointLabel);

    if (idx == -1) {
      this._labels.push(this._next_label);
      this._label_objects.push(pointLabel);
    } else {
      this._labels.splice(idx, 0, this._next_label);
      this._label_objects.splice(idx, 0, pointLabel);
    }

    this._next_label += 1;
  };

  this.pt_line_segment_dist = function (newpt, pt1, pt2) {
    var M = { x: pt2.x - pt1.x, y: pt2.y - pt1.y };
    var t0 =
      (M.x * (newpt.x - pt1.x) + M.y * (newpt.y - pt1.y)) /
      (M.x * M.x + M.y * M.y);
    var dist = -1;
    var dist_line = pt_line_dist(newpt, pt1, pt2);
    if (t0 <= 0) {
      dist = pt_pt_dis(newpt, pt1);
    }
    if (t0 >= 1) {
      dist = pt_pt_dis(newpt, pt2);
    }
    if (t0 > 0 && t0 < 1) {
      dist = dist_line;
    }
    return { d: dist, d_line: dist_line };
  };

  this.removeLastPoint = function () {
    if (this._points.length > 1) {
      var last_pt_id = -1;
      var last_pt_order = -1;
      for (var i = 0; i < this._points_order.length; i += 1) {
        if (last_pt_order < this._points_order[i]) {
          last_pt_order = this._points_order[i];
          last_pt_id = i;
        }
      }
      this._points.splice(last_pt_id, 1);
      this._points_order.splice(last_pt_id, 1);
      Edit(this._anotation_canvas._canvas, this._polygon);

      var lab_id =
        last_pt_id === -1 ? this._label_objects.length - 1 : last_pt_id;
      var labelObject = this._label_objects[lab_id];

      this._anotation_canvas._canvas.remove(labelObject);
      this._labels.splice(last_pt_id, 1);
      this._label_objects.splice(last_pt_id, 1);
      this._next_label -= 1;
      if (this._points.length < 2) {
        this._status = 0;
      }
      this.refresh_active_label();
    }
  };
}

function AnotationCanvas(canvas_id, zoom_canvas_id, img_path, img_width) {
  this._canvas_id = canvas_id;
  this._canvas = null;
  this._img_id = null;
  this._img = null;
  this._img_path = img_path;
  canvas_width = img_width;
  this._img_width = img_width;
  this._scale = null;
  this._polygons = [];
  this._polygons2 = [[], [], [], [], []]; // one array for each polygon class
  this._active_polygon = null;
  this._original_img_shape = null;
  this._zoom_canvas_id = zoom_canvas_id;
  this._active = 0;

  this.isEmpty = function () {
    return this._polygons.length == 0;
  };

  this.setActive = (a) => {
    this._active = a;
    this._active_polygon.refresh_active_mode();
    this._active_polygon.refresh_active_label();
  };

  this.changeActivePolygon = function (polygon_id) {
    this.set_active(polygon_id, colors[polygon_id]);
  };

  // init canvas
  this.init = function (polygon_id) {
    if (!document.getElementById(this._canvas_id)) {
      alert("Canvas with canvas id: " + canvas_id + " does not exist.");
      return;
    }
    this._canvas = this.__canvas = new fabric.Canvas(canvas_id);

    this._img_id = Math.floor(Math.random() * 10000000);
    while (document.getElementById(this._img_id.toString())) {
      this._img_id = Math.floor(Math.random() * 10000000);
    }
    this.init_img();

    var at = this;
    this._canvas.on("mouse:up", function (e) {
      at.process_canvas_click_event(e);
    });

    at.set_active(polygon_id, colors[polygon_id]);

    // keyboard listening
    document.addEventListener("keydown", function (event) {
      if (!at._active) {
        return;
      }
      if (event.key == "Backspace" || event.key == "Delete") {
        event.preventDefault();
        if (at._active_polygon != null) {
          at._active_polygon.removeLastPoint();
          if (at._active_polygon._points.length == 0) {
            at.remove_polygon(at._active_polygon);
          }
        }
      }
      if (event.key == "a") {
        at.add_polygon();
        at._active_polygon.refresh_active_mode();
      }
      if (event.key == "d") {
        setTimeout(function () {
          delete_polygon_key = 0;
        }, 500);
        delete_polygon_key += 1;
        if (delete_polygon_key > 1) {
          at.remove_polygon(at._active_polygon);
        }
      }
      if (event.key == "Tab") {
        at.change_active_polygon_in_class();
        at._active_polygon.refresh_active_mode();
        event.preventDefault();
      }
      if (event.key == "ArrowRight") {
        at._active_polygon._next_label += 1;
        at._active_polygon.refresh_active_label();
      }
      if (event.key == "ArrowLeft") {
        if (at._active_polygon._next_label > 1) {
          at._active_polygon._next_label -= 1;
          at._active_polygon.refresh_active_label();
        }
      }
      if (event.key == "m") {
        at._active_polygon._status = !at._active_polygon._status;
        at._active_polygon.refresh_active_mode();
      }
    });
  };

  // init magnifier canvas
  this.init_zoom = function () {
    /// Get the main canvas element
    var upper_id = this._zoom_canvas_id === "zoom_main_win" ? 0 : 1;
    var mainCanvas = document.getElementsByClassName("upper-canvas")[upper_id];

    // Create a new canvas element for the magnifying glass
    var magnifyingGlassCanvas = document.getElementById(this._zoom_canvas_id);
    magnifyingGlassCanvas.id = "magnifyingGlassCanvas";
    magnifyingGlassCanvas.width = 200; // Set the width of the magnifying glass
    magnifyingGlassCanvas.height = 200; // Set the height of the magnifying glass
    magnifyingGlassCanvas.style.position = "absolute"; // Set the position of the magnifying glass
    magnifyingGlassCanvas.style.display = "none"; // Hide the magnifying glass initially

    // Add an event listener to the main canvas to show the magnifying glass on mouseover
    mainCanvas.addEventListener("mouseover", function (event) {
      magnifyingGlassCanvas.style.display = "block";
    });

    // Add an event listener to the main canvas to hide the magnifying glass on mouseout
    mainCanvas.addEventListener("mouseout", function (event) {
      magnifyingGlassCanvas.style.display = "none";
    });

    // Add an event listener to the main canvas to update the magnifying glass on mousemove
    mainCanvas.addEventListener("mousemove", function (event) {
      // console.log(event);
      // Get the position of the mouse cursor
      var crossHairSzie = 60;
      var x = event.pageX - this.offsetLeft;
      var y = event.pageY - this.offsetTop;

      // Get the context of the magnifying glass canvas
      var magnifyingGlassCtx = magnifyingGlassCanvas.getContext("2d");

      // Clear the magnifying glass canvas
      magnifyingGlassCtx.clearRect(
        0,
        0,
        magnifyingGlassCanvas.width,
        magnifyingGlassCanvas.height
      );

      // Draw a portion of the main canvas onto the magnifying glass canvas

      scale = event.originalTarget.width / canvas_width;
      magnifyingGlassCtx.drawImage(
        document.getElementsByClassName("lower-canvas")[upper_id],
        event.layerX * scale - 30,
        event.layerY * scale - 30,
        60,
        60,
        0,
        0,
        magnifyingGlassCanvas.width,
        magnifyingGlassCanvas.height
      );

      // Set the position of the magnifying glass to follow the mouse cursor
      magnifyingGlassCanvas.style.left = x + 10 + "px";
      magnifyingGlassCanvas.style.top = y + 10 + "px";

      magnifyingGlassCtx.beginPath();
      magnifyingGlassCtx.moveTo(
        magnifyingGlassCanvas.width / 2,
        magnifyingGlassCanvas.height / 2 - crossHairSzie / 2
      );
      magnifyingGlassCtx.lineTo(
        magnifyingGlassCanvas.width / 2,
        magnifyingGlassCanvas.height / 2 + crossHairSzie / 2
      );
      magnifyingGlassCtx.moveTo(
        magnifyingGlassCanvas.width / 2 - crossHairSzie / 2,
        magnifyingGlassCanvas.height / 2
      );
      magnifyingGlassCtx.lineTo(
        magnifyingGlassCanvas.width / 2 + crossHairSzie / 2,
        magnifyingGlassCanvas.height / 2
      );
      magnifyingGlassCtx.strokeStyle = "red";
      magnifyingGlassCtx.stroke();
    });
  };

  this.destroy = function () {
    // remove listeners
  };

  this.init_img = function () {
    var at = this;
    fabric.util.loadImage(this._img_path, function (img) {
      at._img = new fabric.Image(img);
      at._canvas.add(at._img);
      at._canvas.moveTo(at._img, 0);

      at._img.lockMovementX = true;
      at._img.lockMovementY = true;
      at._img.lockScale = true;
      at._img.selectable = false;
      at._img.hoverCursor = "default";
      at._img.id = at._img_id;
      at._original_img_shape = [at._img.width, at._img.height];

      at._scale = at._img_width / at._img.width;
      at._img.scale(at._scale);
      at._canvas.setWidth(at._scale * at._img.width);
      at._canvas.setHeight(at._scale * at._img.height);
    });
  };

  this.process_canvas_click_event = function (e) {
    if (this._active_polygon == null) {
      alert("Select the anotation class at first.");
      return;
    }

    if (
      this._active_polygon._labels.includes(this._active_polygon._next_label)
    ) {
      alert("The corner label is already used.");
      return;
    }

    var p = this._active_polygon;
    if (e.target != null && !modified) {
      var pt = { x: e.pointer.x, y: e.pointer.y };
      var min_dist_id = p._points.length;
      if (p._status > 0) {
        var min_dist = p.pt_line_segment_dist(
          pt,
          p._points[p._points.length - 1],
          p._points[0]
        );
        for (var i = 0; i < p._points.length - 1; i += 1) {
          var dist = pt_line_segment_dist(pt, p._points[i], p._points[i + 1]);
          if (
            dist.d < min_dist.d ||
            (dist.d == min_dist.d && dist.d_line > min_dist.d_line)
          ) {
            min_dist = dist;
            min_dist_id = i + 1;
          }
        }
      }

      p._points.splice(min_dist_id, 0, pt);
      p._points_order.splice(min_dist_id, 0, p._points.length);
      p.add_label(pt, min_dist_id);

      Edit(this._canvas, p._polygon, p._label_objects);
      this._active_polygon.refresh_active_label();
    }
    modified = false;
  };

  this.set_active = function (polygon_id, polygon_color) {
    if (Number.isInteger(polygon_id)) {
      if (this._polygons[polygon_id] == undefined) {
        this._polygons[polygon_id] = new AnotationPolygon(
          this,
          polygon_id,
          polygon_color
        );
        this._polygons[polygon_id].init();
      }
      this._active_polygon = this._polygons[polygon_id];
      this._active_polygon.refresh_active_label();
      if (this._active_polygon._points.length > 3) {
        this._active_polygon._status = 1;
      } else {
        this._active_polygon._status = 0;
      }
      Edit(this._canvas, this._active_polygon._polygon);
      modified = false;

      for (var i = 0; i < max_clases; i += 1) {
        var annot_block = document.getElementById("anot_class_" + pad(i, 3));
        if (annot_block != null) {
          annot_block.style = "background-color: " + colors[i] + ";";
          if (i == polygon_id % max_clases) {
            annot_block.style =
              "background-color: " +
              colors[i] +
              "; border-style: solid; border-width: 3px; border-color:black;";
          }
        }
      }
    } else {
      alert("Segmentation class id has to be integer in range 0-999.");
    }
  };

  this.remove_polygon = function (polygon) {
    if (polygon != null && polygon != undefined) {
      this._polygons[polygon._polygon_id] = undefined;
      this._canvas.remove(polygon._polygon);

      // loop over all labels in the given polygon
      for (var i = 0; i < polygon._label_objects.length; i += 1) {
        var labelObject = polygon._label_objects[i];
        polygon._anotation_canvas._canvas.remove(labelObject);
      }

      var i = this._active_polygon._polygon_id + max_clases;
      if (i >= this._polygons.length) {
        i = this._active_polygon._polygon_id % max_clases;
      }
      while (i != this._active_polygon._polygon_id) {
        if (this._polygons[i] != undefined) {
          break;
        } else {
          i += max_clases;
        }
        if (i >= this._polygons.length) {
          i = this._active_polygon._polygon_id % max_clases;
        }
      }
      if (i == this._active_polygon._polygon_id) {
        i = this._active_polygon._polygon_id % max_clases;
      }
      this.set_active(i, this._active_polygon._polygon_color);
      this._active_polygon.refresh_active_label();
    }
  };

  this.add_polygon = function () {
    if (
      this._active_polygon == null ||
      this._active_polygon._points.length == undefined
    ) {
      alert("Please select the class before adding new component.");
      return;
    }
    if (this._active_polygon._points.length < 3) {
      if (
        !(
          this._active_polygon._points.length == 2 &&
          this._active_polygon._polygon_id % max_clases == 3
        )
      ) {
        alert(
          "Current polygon is not valid, i.e., has less than 3 points. Please finish this polygon before starting new component."
        );
        return;
      }
    }
    var component_id = 1;
    while (
      this._polygons[
        this._active_polygon._polygon_id + component_id * max_clases
      ] != undefined
    ) {
      component_id += 1;
    }
    this.set_active(
      this._active_polygon._polygon_id + component_id * max_clases,
      this._active_polygon._polygon_color
    );
    this._active_polygon.refresh_active_label();
  };

  this.change_active_polygon_in_class = function () {
    if (
      this._active_polygon == null ||
      this._active_polygon._points.length == undefined
    ) {
      alert("Please select the class before adding new component.");
      return;
    }
    if (this._active_polygon._points.length < 3) {
      if (this._active_polygon._points.length == 0) {
        this.remove_polygon(this._active_polygon);
      } else if (
        !this._active_polygon._points.length == 2 ||
        !this._active_polygon._polygon_id % max_clases == 3
      ) {
        alert(
          "Current polygon is not valid, i.e., has less than 3 points. Please finish this polygon before starting new component."
        );
        return;
      }
    }

    var i = this._active_polygon._polygon_id + max_clases;
    while (i != this._active_polygon._polygon_id) {
      if (i >= this._polygons.length) {
        i = this._active_polygon._polygon_id % max_clases;
      }
      if (this._polygons[i] != undefined) {
        break;
      } else {
        i += max_clases;
      }
    }

    this.set_active(i, this._active_polygon._polygon_color);
    this._active_polygon.refresh_active_label();
  };

  this.get_annotation_obj = function () {
    var data_obj = {};
    for (var i = 0; i < this._polygons.length; i += 1) {
      if (this._polygons[i] == undefined) {
        continue;
      }
      var pts = this._polygons[i]._points;
      var lbs = this._polygons[i]._labels;
      var id = this._polygons[i]._polygon_id;
      var pts_luv = [];
      for (var j = 0; j < pts.length; j += 1) {
        pts_luv.push([lbs[j], pts[j].x / this._scale, pts[j].y / this._scale]);
      }
      data_obj[id] = pts_luv;
    }

    return JSON.stringify(data_obj);
  };
}

function polygonPositionHandler(dim, finalMatrix, fabricObject) {
  var x = fabricObject.points[this.pointIndex].x - fabricObject.pathOffset.x,
    y = fabricObject.points[this.pointIndex].y - fabricObject.pathOffset.y;
  return fabric.util.transformPoint(
    { x: x, y: y },
    fabric.util.multiplyTransformMatrices(
      fabricObject.canvas.viewportTransform,
      fabricObject.calcTransformMatrix()
    )
  );
}

function actionHandler(eventData, transform, x, y) {
  modified = true;
  var polygon = transform.target,
    currentControl = polygon.controls[polygon.__corner],
    mouseLocalPosition = polygon.toLocalPoint(
      new fabric.Point(x, y),
      "center",
      "center"
    ),
    polygonBaseSize = polygon._getNonTransformedDimensions(),
    size = polygon._getTransformedDimensions(0, 0),
    finalPointPosition = {
      x:
        (mouseLocalPosition.x * polygonBaseSize.x) / size.x +
        polygon.pathOffset.x,
      y:
        (mouseLocalPosition.y * polygonBaseSize.y) / size.y +
        polygon.pathOffset.y,
    };
  polygon.points[currentControl.pointIndex] = finalPointPosition;
  polygon.parent._status = 1;
  return true;
}

function anchorWrapper(anchorIndex, fn) {
  return function (eventData, transform, x, y) {
    var fabricObject = transform.target,
      absolutePoint = fabric.util.transformPoint(
        {
          x: fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x,
          y: fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y,
        },
        fabricObject.calcTransformMatrix()
      ),
      actionPerformed = fn(eventData, transform, x, y),
      newDim = fabricObject._setPositionDimensions({}),
      polygonBaseSize = fabricObject._getNonTransformedDimensions(),
      newX =
        (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x) /
        polygonBaseSize.x,
      newY =
        (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y) /
        polygonBaseSize.y;
    fabricObject.setPositionByOrigin(absolutePoint, newX + 0.5, newY + 0.5);
    return actionPerformed;
  };
}

function Edit(canvas, poly, labels) {
  canvas.setActiveObject(poly);
  poly.edit = true;
  var lastControl = poly.points.length - 1;
  poly.cornerStyle = "circle";
  poly.cornerColor = "rgba(0,0,255,0.5)";
  poly.controls = poly.points.reduce(function (acc, point, index) {
    // console.log(acc, point, index);
    acc["p" + index] = new fabric.Control({
      positionHandler: polygonPositionHandler,
      actionHandler: anchorWrapper(
        index > 0 ? index - 1 : lastControl,
        actionHandler
      ),
      actionName: "modifyPolygon",
      pointIndex: index,
    });
    return acc;
  }, {});
  poly.hasBorders = !poly.edit;
  canvas.requestRenderAll();
}

function pad(num, size) {
  num = num.toString();
  while (num.length < size) num = "0" + num;
  return num;
}
