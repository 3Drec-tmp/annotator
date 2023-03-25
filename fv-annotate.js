
var colors = ["red", "blue", "green", "silver", "yellow"];
var modified = false;
var delete_polygon_key = 0;
var max_clases = 100;


function pt_pt_dis(pt1, pt2) {
    return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
}

function pt_line_dist(newpt, pt1, pt2) {
    return Math.abs((pt2.x - pt1.x) * (pt1.y - newpt.y) - (pt1.x - newpt.x) * (pt2.y - pt1.y)) /
        Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
}

function pt_line_segment_dist(newpt, pt1, pt2) {
    var M = { x: pt2.x - pt1.x, y: pt2.y - pt1.y };
    var t0 = (M.x * (newpt.x - pt1.x) + M.y * (newpt.y - pt1.y)) / (M.x * M.x + M.y * M.y);
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
    this._points_order = [];
    this._anotation_canvas = anotation_canvas;
    this._polygon_id = polygon_id;
    this._polygon_color = polygon_color;
    this._status = 0;

    this.init = function () {
        this._polygon = new fabric.Polygon(this._points, {
            left: 0,
            top: 0,
            scale: 1,
            opacity: 0.5,
            fill: this._polygon_color,
            strokeWidth: 2,
            stroke: this._polygon_color,
            objectCaching: false,
            transparentCorners: true,
            cornerSize: 8,
        });
        this._anotation_canvas._canvas.add(this._polygon);
        this._polygon.lockMovementX = true;
        this._polygon.lockMovementY = true;
        this._polygon.id = this._polygon_id;
        this._polygon.hoverCursor = 'default';
        this._polygon.parent = this;
        this._polygon.selectable = false;
    };

    this.pt_pt_dis = function (pt1, pt2) {
        return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
    }

    this.pt_line_dist = function (newpt, pt1, pt2) {
        return Math.abs((pt2.x - pt1.x) * (pt1.y - newpt.y) - (pt1.x - newpt.x) * (pt2.y - pt1.y)) /
            Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
    }

    this.pt_line_segment_dist = function (newpt, pt1, pt2) {
        var M = { x: pt2.x - pt1.x, y: pt2.y - pt1.y };
        var t0 = (M.x * (newpt.x - pt1.x) + M.y * (newpt.y - pt1.y)) / (M.x * M.x + M.y * M.y);
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

    this.removeLastPoint = function () {
        if (this._points.length > 0) {
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

            if (this._points.length < 2) {
                this._status = 0;
            }
        }
    };
}


function AnotationCanvas(canvas_id, img_path, img_width) {
    this._canvas_id = canvas_id;
    this._canvas = null;
    this._img_id = null;
    this._img = null;
    this._img_path = img_path;
    this._img_width = img_width;
    this._scale = null;
    this._polygons = [];
    this._active_polygon = null;

    this.init = function () {
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

        // check if annotation already exist
        this.load_anotation_if_exist();

        var at = this;
        this._canvas.on('mouse:up', function (e) {
            at.process_canvas_click_event(e);
        });

        for (var i = 0; i < max_clases; i += 1) {
            var annot_block = document.getElementById("anot_class_" + pad(i, 3));
            if (annot_block != null) {
                annot_block.annot_id = i;
                annot_block.color_name = colors[i];
                annot_block.onclick = function () { at.set_active(this.annot_id, this.color_name) };
            }
        }

        // onclic next
        var next_button = document.getElementById("next_img");
        if (next_button != null) {
            next_button.onclick = function () { at.send_annotation_to_server(this.annot_id) };
        }

        // keyboard listening
        document.addEventListener("keydown", function (event) {
            if (event.key == "Backspace" || event.key == "Delete") {
                if (at._active_polygon != null) {
                    at._active_polygon.removeLastPoint();
                }
            }
            if (event.key == "a") {
                at.add_polygon();
            }
            if (event.key == "d") {
                setTimeout(function () { delete_polygon_key = 0; }, 500);
                delete_polygon_key += 1;
                if (delete_polygon_key > 1) {
                    at.remove_polygon(at._active_polygon);
                }
            }
            if (event.key == "Tab") {
                at.change_active_polygon_in_class();
                event.preventDefault();
            }
        });
    };

    this.init_img = function () {
        var at = this;
        fabric.util.loadImage(img_path, function (img) {
            at._img = new fabric.Image(img);
            at._canvas.add(at._img);
            at._canvas.moveTo(at._img, 0);

            at._img.lockMovementX = true;
            at._img.lockMovementY = true;
            at._img.lockScale = true;
            at._img.selectable = false;
            at._img.hoverCursor = 'default';
            at._img.id = at._img_id;

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

        var p = this._active_polygon;
        if (e.target != null && !modified) {   
            var pt = { x: e.pointer.x, y: e.pointer.y };
            if (p._status > 0) {
                var min_dist = p.pt_line_segment_dist(pt, p._points[p._points.length - 1], p._points[0]);
                var min_dist_id = p._points.length;
                for (var i = 0; i < p._points.length - 1; i += 1) {
                    var dist = pt_line_segment_dist(pt, p._points[i], p._points[i + 1]);
                    if (dist.d < min_dist.d || (dist.d == min_dist.d && dist.d_line > min_dist.d_line)) {
                        min_dist = dist;
                        min_dist_id = i + 1;
                    }
                }
                if (min_dist_id == p._points.length) {
                    p._points.push(pt);
                    p._points_order.push(p._points.length);
                } else {
                    var tmp_pt;
                    var tmp_pt_order;
                    var pt_order = p._points.length;
                    for (var i = min_dist_id; i < p._points.length; i += 1) {
                        tmp_pt = p._points[i];
                        p._points[i] = pt;
                        pt = tmp_pt;

                        tmp_pt_order = p._points_order[i];
                        p._points_order[i] = pt_order;
                        pt_order = tmp_pt_order;
                    }
                    p._points[p._points.length] = pt;
                }
            } else {
                p._points.push(pt);
                p._points_order.push(p._points.length);
            }
            Edit(this._canvas, p._polygon);
        }
        modified = false;
    };

    this.set_active = function (polygon_id, polygon_color) {
        if (Number.isInteger(polygon_id)) {
            if (this._polygons[polygon_id] == undefined) {
                this._polygons[polygon_id] = new AnotationPolygon(this, polygon_id, polygon_color);
                this._polygons[polygon_id].init();
            }
            this._active_polygon = this._polygons[polygon_id];
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
                    if (i == (polygon_id % max_clases)) {
                        annot_block.style = "background-color: " + colors[i] + "; border-style: solid; border-width: 3px; border-color:black;";
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
            if (polygon._polygon_id < max_clases) {
                this.set_active(polygon._polygon_id, polygon._polygon_color);
            } else {
                this.set_active(polygon._polygon_id - max_clases, polygon._polygon_color);
            }
        }
    };

    this.add_polygon = function () {
        if (this._active_polygon == null || this._active_polygon._points.length == undefined) {
            alert("Please select the class before adding new component.");
            return;
        }
        if (this._active_polygon._points.length < 3) {
            alert("Current polygon is not valid, i.e., has less than 3 points. Please finish this polygon before starting new component.");
            return;
        }
        var component_id = 1;
        while (this._polygons[this._active_polygon._polygon_id + component_id * max_clases] != undefined) {
            component_id += 1;
        }
        this.set_active(this._active_polygon._polygon_id + component_id * max_clases, this._active_polygon._polygon_color);
    };

    this.change_active_polygon_in_class = function () {
        if (this._active_polygon == null || this._active_polygon._points.length == undefined) {
            alert("Please select the class before adding new component.");
            return;
        }
        if (this._active_polygon._points.length < 3) {
            alert("Current polygon is not valid, i.e., has less than 3 points. Please finish this polygon before switching to another component.");
            return;
        }
        if (this._polygons[this._active_polygon._polygon_id + max_clases] != null) {
            this.set_active(this._active_polygon._polygon_id + max_clases, this._active_polygon._polygon_color);
        } else {
            this.set_active(this._active_polygon._polygon_id % max_clases, this._active_polygon._polygon_color);
        }
    };

    this.load_anotation_if_exist = function (product_id) {
        var at = this;
        $.ajax({
            type: "GET",
            url: "http://xxx",      // 91.121.77.14:5000/dataset_segmentation_store&prodict_id=" + product_id
            context: document.body
        }).done(function (data) {
            data_obj = JSON.parse(data);
            console.log(data_obj);
            for (var i = 0; i < data_obj.dict.length; i += 1) {
                var anot_class = data_obj.dict[i];
                var class_id = anot_class.class_id;
                var list_polyg = anot_class.values;
                for (var component_id = 0; component_id < list_polyg.length; component_id += 1) {
                    var polygon_id = class_id + component_id * max_clases;
                    at._polygons[polygon_id] = new AnotationPolygon(at, polygon_id, colors[class_id]);
                    var list_pts = list_polyg[component_id];
                    for (var p_id = 0; p_id < list_pts.length; p_id += 2) {
                        at._polygons[polygon_id]._points.push({ x: list_pts[p_id], y: list_pts[p_id + 1] });
                        at._polygons[polygon_id]._points_order.push(Math.round(p_id / 2));
                    }
                }

            }

        });
    };

    this.send_annotation_to_server = function (product_id) {
        var data_obj = {
            product_id: product_id,
            dict: []
        };
        for (var i = 0; i < max_clases; i += 1) {
            var class_anotations = [];
            var component_id = 0;
            while (this._polygons[i + component_id * max_clases] != undefined) {
                var pts = this._polygons[i + component_id * max_clases]._points;
                var pts_uv = [];
                for (var j = 0; j < pts.length; j += 1) {
                    pts_uv.push(pts[j].x / this._scale);
                    pts_uv.push(pts[j].y / this._scale);
                }
                class_anotations.push(pts_uv)
                component_id += 1;
            }
            data_obj.dict.push({ class_id: i, values: class_anotations });
        }

        console.log(JSON.stringify(data_obj));
        $.ajax({
            type: "POST",
            url: "http://xxx",   // 91.121.77.14:5000/dataset_segmentation_store
            data: JSON.stringify(data_obj)
        });
    }
}


function polygonPositionHandler(dim, finalMatrix, fabricObject) {
    var x = (fabricObject.points[this.pointIndex].x - fabricObject.pathOffset.x),
        y = (fabricObject.points[this.pointIndex].y - fabricObject.pathOffset.y);
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
        mouseLocalPosition = polygon.toLocalPoint(new fabric.Point(x, y), 'center', 'center'),
        polygonBaseSize = polygon._getNonTransformedDimensions(),
        size = polygon._getTransformedDimensions(0, 0),
        finalPointPosition = {
            x: mouseLocalPosition.x * polygonBaseSize.x / size.x + polygon.pathOffset.x,
            y: mouseLocalPosition.y * polygonBaseSize.y / size.y + polygon.pathOffset.y
        };
    polygon.points[currentControl.pointIndex] = finalPointPosition;
    polygon.parent._status = 1;
    return true;
}

function anchorWrapper(anchorIndex, fn) {
    return function (eventData, transform, x, y) {
        var fabricObject = transform.target,
            absolutePoint = fabric.util.transformPoint({
                x: (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x),
                y: (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y),
            }, fabricObject.calcTransformMatrix()),
            actionPerformed = fn(eventData, transform, x, y),
            newDim = fabricObject._setPositionDimensions({}),
            polygonBaseSize = fabricObject._getNonTransformedDimensions(),
            newX = (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x) / polygonBaseSize.x,
            newY = (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y) / polygonBaseSize.y;
        fabricObject.setPositionByOrigin(absolutePoint, newX + 0.5, newY + 0.5);
        return actionPerformed;
    }
}

function Edit(canvas, poly) {
    canvas.setActiveObject(poly);
    poly.edit = true;
    var lastControl = poly.points.length - 1;
    poly.cornerStyle = 'circle';
    poly.cornerColor = 'rgba(0,0,255,0.5)';
    poly.controls = poly.points.reduce(function (acc, point, index) {
        acc['p' + index] = new fabric.Control({
            positionHandler: polygonPositionHandler,
            actionHandler: anchorWrapper(index > 0 ? index - 1 : lastControl, actionHandler),
            actionName: 'modifyPolygon',
            pointIndex: index
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
