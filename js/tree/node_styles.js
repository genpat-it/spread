/*
*
* Node shapes and borders chosen by the user for the tree nodes: names, defaults
* and geometry. Shared by the canvas renderer (drawing, SVG export, picking), the
* tree model (validation of the saved styles) and the node style card (drawings).
* Loaded before js/tree/canvas_renderer.js.
*
*/

/**
 * Geometry of the node shapes and borders chosen by the user for selected nodes
 * (tree menu). It is shared by the canvas drawing, the SVG export and the
 * picking, so the three always agree.
 *
 * - Shapes keep the area of the circle of the same radius, so the node size
 *   still reads as the number of samples (polygons reach a bit further out).
 * - Pie wedges are clipped to the shape.
 * - Decorative borders (crown, gears, spikes, wavy crown) are solid black and
 *   drawn behind the body; the selection halo follows the outer path.
 *
 * An outline is either {type: 'circle', x, y, r} or {type: 'poly', points}.
 */
var D3MSTreeNodeStyles = {
        shapes: ['circle', 'square', 'triangle', 'hexagon', 'octagon'],
        borders: ['normal', 'double', 'dashed', 'dotted', 'crown', 'gear', 'gear_round', 'spikes', 'wavy'],
        default_shape: 'circle',
        default_border: 'normal',
        // number of sides and rotation of the polygons (flat base, triangle pointing up)
        sides: { square: 4, triangle: 3, hexagon: 6, octagon: 8 },
        rotation: { square: Math.PI / 4, triangle: -Math.PI / 2, hexagon: 0, octagon: Math.PI / 8 },
        // borders drawn as a solid decoration around the shape
        decorations: { crown: true, gear: true, gear_round: true, spikes: true, wavy: true }
};

/**
 * Circumradius of a regular polygon with the same area as a circle of radius r.
 * @param {string} shape Shape name
 * @param {number} r Radius of the circle
 * @returns {number} Circumradius (r for the circle)
 */
D3MSTreeNodeStyles.circumradius = function (shape, r) {
        var n = this.sides[shape];
        if (!n) {
                return r;
        }
        return r * Math.sqrt(2 * Math.PI / (n * Math.sin(2 * Math.PI / n)));
};

/**
 * Outline of the shape, grown outward by d at the same distance from every edge.
 * @param {string} shape Shape name
 * @param {number} x Centre x
 * @param {number} y Centre y
 * @param {number} r Node radius
 * @param {number} d Outward offset (0 for the shape itself)
 * @returns {Object} Outline
 */
D3MSTreeNodeStyles.shapeOutline = function (shape, x, y, r, d) {
        var n = this.sides[shape];
        if (!n) {
                return { type: 'circle', x: x, y: y, r: r + d };
        }
        var rr = this.circumradius(shape, r) + d / Math.cos(Math.PI / n);
        var points = [];
        for (var i = 0; i < n; i++) {
                var a = this.rotation[shape] + i * 2 * Math.PI / n;
                points.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]);
        }
        return { type: 'poly', points: points };
};

/**
 * Perimeter of the shape.
 * @param {string} shape Shape name
 * @param {number} r Node radius
 * @returns {number} Perimeter
 */
D3MSTreeNodeStyles.perimeter = function (shape, r) {
        var n = this.sides[shape];
        if (!n) {
                return 2 * Math.PI * r;
        }
        return n * 2 * this.circumradius(shape, r) * Math.sin(Math.PI / n);
};

/**
 * Point at arc length t along the outline (from the top for the circle, from a
 * corner for polygons), with the direction from the centre, which stays
 * continuous at the corners.
 * @param {string} shape Shape name
 * @param {number} x Centre x
 * @param {number} y Centre y
 * @param {number} r Node radius
 * @param {number} t Arc length
 * @returns {Object} {x, y, nx, ny}
 */
D3MSTreeNodeStyles.outlineAt = function (shape, x, y, r, t) {
        var p = this.perimeter(shape, r);
        t = ((t % p) + p) % p;
        var n = this.sides[shape];
        if (!n) {
                var a = t / r - Math.PI / 2;
                return { x: x + r * Math.cos(a), y: y + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) };
        }
        var rr = this.circumradius(shape, r);
        var side = p / n;
        var e = Math.floor(t / side);
        var f = (t - e * side) / side;
        var a0 = this.rotation[shape] + e * 2 * Math.PI / n;
        var a1 = a0 + 2 * Math.PI / n;
        var px = rr * ((1 - f) * Math.cos(a0) + f * Math.cos(a1));
        var py = rr * ((1 - f) * Math.sin(a0) + f * Math.sin(a1));
        var l = Math.sqrt(px * px + py * py);
        return { x: x + px, y: y + py, nx: px / l, ny: py / l };
};

/**
 * Height of the decorative borders, proportional to the node.
 * @param {number} r Node radius
 * @returns {number} Height
 */
D3MSTreeNodeStyles.decorationHeight = function (r) {
        return r * 0.18 + 1;
};

/**
 * How far the border reaches outside the shape.
 * @param {string} border Border name
 * @param {number} r Node radius
 * @returns {number} Distance from the shape
 */
D3MSTreeNodeStyles.reach = function (border, r) {
        if (border === 'double') {
                return Math.max(1.5, r * 0.15);
        }
        if (border === 'spikes') {
                return this.decorationHeight(r) * 1.3;
        }
        if (this.decorations[border]) {
                return this.decorationHeight(r);
        }
        return 0;
};

/**
 * Radius of a circle around the whole node, border included (export bounds).
 * @param {string} shape Shape name
 * @param {string} border Border name
 * @param {number} r Node radius
 * @returns {number} Radius
 */
D3MSTreeNodeStyles.extent = function (shape, border, r) {
        var n = this.sides[shape];
        var reach = this.reach(border, r);
        return this.circumradius(shape, r) + (n ? reach / Math.cos(Math.PI / n) : reach);
};

/**
 * Number of teeth of about the given width, a multiple of the sides so that the
 * teeth sit the same way on every side.
 * @param {string} shape Shape name
 * @param {number} r Node radius
 * @param {number} width Tooth width
 * @returns {number} Teeth
 */
D3MSTreeNodeStyles.teethCount = function (shape, r, width) {
        var n = this.sides[shape] || 1;
        var k = Math.max(8, Math.round(this.perimeter(shape, r) / width));
        return Math.max(n, Math.round(k / n) * n);
};

/**
 * Outer path of the crown, spikes and wavy crown borders: teeth placed along
 * the outline and pointing away from the centre.
 * @param {string} border Border name
 * @param {string} shape Shape name
 * @param {number} x Centre x
 * @param {number} y Centre y
 * @param {number} r Node radius
 * @returns {Array} Points
 */
D3MSTreeNodeStyles._teethPoints = function (border, shape, x, y, r) {
        var self = this;
        var p = this.perimeter(shape, r);
        var h = this.decorationHeight(r);
        var points = [];
        var i, k;
        function at(t, off) {
                var q = self.outlineAt(shape, x, y, r, t);
                points.push([q.x + q.nx * off, q.y + q.ny * off]);
        }
        if (border === 'crown') {
                k = this.teethCount(shape, r, h * 1.4);
                for (i = 0; i < k; i++) {
                        at(i * p / k, 0);
                        at((i + 0.5) * p / k, h);
                }
        }
        if (border === 'spikes') {
                k = this.teethCount(shape, r, h * 1.4);
                var w = 0.6 * p / k;
                for (i = 0; i < k; i++) {
                        var c = (i + 0.5) * p / k;
                        at(c - w / 2, 0);
                        at(c, h * 1.3);
                        at(c + w / 2, 0);
                }
        }
        if (border === 'wavy') {
                k = this.teethCount(shape, r, h * 1.6);
                var m = k * 12;
                for (i = 0; i < m; i++) {
                        var t = i * p / m;
                        at(t, h * 0.5 * (1 - Math.cos(2 * Math.PI * k * t / p)));
                }
        }
        return points;
};

/**
 * Outer path of the gear borders. On the circle the teeth are radial and
 * slightly tapered (rounded on top for gear_round); on polygons they are laid
 * side by side, with their flanks perpendicular to the side and the corners in
 * the gaps.
 * @param {string} shape Shape name
 * @param {number} x Centre x
 * @param {number} y Centre y
 * @param {number} r Node radius
 * @param {boolean} rounded Rounded teeth
 * @returns {Array} Points
 */
D3MSTreeNodeStyles._gearPoints = function (shape, x, y, r, rounded) {
        var self = this;
        var h = this.decorationHeight(r);
        var tooth = h * 2.6;
        var steps = 12;
        var points = [];
        var j, s;
        // tooth height across its width: flat top, or a rounded one
        function profile(u) {
                if (!rounded) {
                        return 1;
                }
                return Math.pow(1 - Math.pow(Math.abs(2 * u - 1), 2.5), 1 / 2.5);
        }
        var n = this.sides[shape];
        if (!n) {
                var p = 2 * Math.PI * r;
                var k = Math.max(8, Math.round(p / tooth));
                var q = p / k;
                var at = function (t, off) {
                        var o = self.outlineAt(shape, x, y, r, t);
                        points.push([o.x + o.nx * off, o.y + o.ny * off]);
                };
                for (j = 0; j < k; j++) {
                        var s0 = j * q;
                        if (!rounded) {
                                at(s0, 0);
                                at(s0 + q * 0.08, h);
                                at(s0 + q * 0.42, h);
                                at(s0 + q * 0.5, 0);
                        } else {
                                for (s = 0; s <= steps; s++) {
                                        at(s0 + q * 0.5 * s / steps, h * profile(s / steps));
                                }
                        }
                }
                return points;
        }
        var vertices = this.shapeOutline(shape, x, y, r, 0).points;
        for (var e = 0; e < n; e++) {
                var v0 = vertices[e];
                var v1 = vertices[(e + 1) % n];
                var dx = v1[0] - v0[0];
                var dy = v1[1] - v0[1];
                var len = Math.sqrt(dx * dx + dy * dy);
                var ux = dx / len, uy = dy / len;
                var am = this.rotation[shape] + (e + 0.5) * 2 * Math.PI / n;
                var nx = Math.cos(am), ny = Math.sin(am);
                var m = Math.max(1, Math.round(len / tooth));
                var su = rounded ? steps : 1;
                points.push([v0[0], v0[1]]);
                for (j = 0; j < m; j++) {
                        var ce = (j + 0.5) * len / m;
                        var he = 0.25 * len / m;
                        points.push([v0[0] + ux * (ce - he), v0[1] + uy * (ce - he)]);
                        for (s = 0; s <= su; s++) {
                                var tt = ce - he + 2 * he * s / su;
                                var oo = h * profile(s / su);
                                points.push([v0[0] + ux * tt + nx * oo, v0[1] + uy * tt + ny * oo]);
                        }
                        points.push([v0[0] + ux * (ce + he), v0[1] + uy * (ce + he)]);
                }
        }
        return points;
};

/**
 * Decorative border along a straight segment, for the drawings of the border
 * card: teeth over the segment, pointing up (negative y), with the proportions
 * used on the nodes.
 * @param {string} border Border name (crown, gear, gear_round, spikes, wavy)
 * @param {number} x0 Segment start x
 * @param {number} x1 Segment end x
 * @param {number} y Segment y
 * @param {number} h Tooth height
 * @returns {Array} Points of an open polyline
 */
D3MSTreeNodeStyles.segmentPoints = function (border, x0, x1, y, h) {
        var points = [];
        var len = x1 - x0;
        var i, k, q, s;
        function at(t, off) {
                points.push([x0 + t, y - off]);
        }
        if (border === 'crown') {
                k = Math.max(1, Math.round(len / (h * 1.4)));
                q = len / k;
                for (i = 0; i < k; i++) {
                        at(i * q, 0);
                        at((i + 0.5) * q, h);
                }
                at(len, 0);
        }
        if (border === 'gear' || border === 'gear_round') {
                k = Math.max(1, Math.round(len / (h * 2.6)));
                q = len / k;
                at(0, 0);
                for (i = 0; i < k; i++) {
                        var c = (i + 0.5) * q;
                        var hw = 0.25 * q;
                        at(c - hw, 0);
                        if (border === 'gear') {
                                at(c - hw, h);
                                at(c + hw, h);
                        } else {
                                for (s = 0; s <= 12; s++) {
                                        var u = s / 12;
                                        at(c - hw + 2 * hw * u, h * Math.pow(1 - Math.pow(Math.abs(2 * u - 1), 2.5), 1 / 2.5));
                                }
                        }
                        at(c + hw, 0);
                }
                at(len, 0);
        }
        if (border === 'spikes') {
                k = Math.max(1, Math.round(len / (h * 1.4)));
                q = len / k;
                var w = 0.6 * q;
                at(0, 0);
                for (i = 0; i < k; i++) {
                        var cs = (i + 0.5) * q;
                        at(cs - w / 2, 0);
                        at(cs, h * 1.3);
                        at(cs + w / 2, 0);
                }
                at(len, 0);
        }
        if (border === 'wavy') {
                k = Math.max(1, Math.round(len / (h * 1.6)));
                for (i = 0; i <= 96; i++) {
                        var t = i * len / 96;
                        at(t, h * 0.5 * (1 - Math.cos(2 * Math.PI * k * t / len)));
                }
        }
        return points;
};

/**
 * Outer outline of the node: the decoration, the outer ring of the double
 * border, or the shape itself.
 * @param {string} shape Shape name
 * @param {string} border Border name
 * @param {number} x Centre x
 * @param {number} y Centre y
 * @param {number} r Node radius
 * @returns {Object} Outline
 */
D3MSTreeNodeStyles.outerOutline = function (shape, border, x, y, r) {
        if (border === 'gear' || border === 'gear_round') {
                return { type: 'poly', points: this._gearPoints(shape, x, y, r, border === 'gear_round') };
        }
        if (this.decorations[border]) {
                return { type: 'poly', points: this._teethPoints(border, shape, x, y, r) };
        }
        return this.shapeOutline(shape, x, y, r, border === 'double' ? this.reach(border, r) : 0);
};

/**
 * Canvas Path2D of an outline, to be cached and drawn many times.
 * @param {Object} outline Outline
 * @returns {Path2D} Path
 */
D3MSTreeNodeStyles.path2D = function (outline) {
        var path = new Path2D();
        if (outline.type === 'circle') {
                path.arc(outline.x, outline.y, outline.r, 0, 2 * Math.PI);
                return path;
        }
        var pts = outline.points;
        path.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) {
                path.lineTo(pts[i][0], pts[i][1]);
        }
        path.closePath();
        return path;
};

/**
 * SVG path data of an outline.
 * @param {Object} outline Outline
 * @param {Function} num Number formatter of the export
 * @returns {string} Path data
 */
D3MSTreeNodeStyles.svgPath = function (outline, num) {
        if (outline.type === 'circle') {
                var x = outline.x, y = outline.y, r = outline.r;
                return 'M' + num(x - r) + ',' + num(y) +
                        ' A' + num(r) + ',' + num(r) + ' 0 1 0 ' + num(x + r) + ',' + num(y) +
                        ' A' + num(r) + ',' + num(r) + ' 0 1 0 ' + num(x - r) + ',' + num(y) + ' Z';
        }
        var d = [];
        outline.points.forEach(function (p, i) {
                d.push((i === 0 ? 'M' : 'L') + num(p[0]) + ',' + num(p[1]));
        });
        return d.join(' ') + ' Z';
};

/**
 * Whether a point lies inside the shape of a node.
 * @param {string} shape Shape name
 * @param {number} x Centre x
 * @param {number} y Centre y
 * @param {number} r Node radius
 * @param {number} px Point x
 * @param {number} py Point y
 * @returns {boolean} true when inside
 */
D3MSTreeNodeStyles.contains = function (shape, x, y, r, px, py) {
        var dx = px - x, dy = py - y;
        var n = this.sides[shape];
        if (!n) {
                return dx * dx + dy * dy <= r * r;
        }
        // inside a regular polygon: within the apothem along every side normal
        var apothem = this.circumradius(shape, r) * Math.cos(Math.PI / n);
        for (var e = 0; e < n; e++) {
                var am = this.rotation[shape] + (e + 0.5) * 2 * Math.PI / n;
                if (dx * Math.cos(am) + dy * Math.sin(am) > apothem) {
                        return false;
                }
        }
        return true;
};

/**
 * Line style of the shape outline for the border: width, dashes and caps.
 * @param {string} border Border name
 * @returns {Object} {width, dash, cap}
 */
D3MSTreeNodeStyles.lineStyle = function (border) {
        if (border === 'dashed') {
                return { width: 1.5, dash: [4, 2.5], cap: 'butt' };
        }
        if (border === 'dotted') {
                return { width: 1.8, dash: [0.01, 3], cap: 'round' };
        }
        return { width: 1, dash: [], cap: 'butt' };
};
