/**
 * Canvas 2D renderer for the minimum spanning tree.
 *
 * Rationale: with thousands of nodes the previous SVG implementation created
 * tens of thousands of DOM elements (one <g> per node with N pie <path> + halo +
 * <text>, one <g> per link with <line> + <text>). The browser then paid layout,
 * paint, hit-testing and memory costs on the whole DOM tree, which produced lag
 * and freezes during manipulation.
 *
 * This renderer draws the mass of nodes and links onto a single <canvas>, while
 * the SVG layer is kept only for the few interactive/overlay elements (brush,
 * scale bar, legend). It is a PURE CONSUMER of the tree model: it reads the node
 * coordinates (node.x / node.y), radii (tree.node_radii), pie composition
 * (tree._getPieData) and category colours computed by the unchanged layout
 * algorithm. It never alters topology, positions or branch lengths.
 *
 * Picking (which node/link is under the pointer) is provided here via a
 * d3.quadtree spatial index, replacing the per-element hit-testing that the
 * browser performed for free with SVG.
 */
function D3MSTreeCanvasRenderer(tree, canvas) {
        this.tree = tree;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // Device pixel ratio so the canvas stays crisp on HiDPI screens.
        this.dpr = window.devicePixelRatio || 1;
        // rAF coalescing: many model mutations per frame collapse into one draw.
        this._raf = null;
        // Spatial indexes for picking (rebuilt when node positions settle).
        this.node_quadtree = null;
        this.link_quadtree = null;
        // Marks the indexes stale (e.g. while the force simulation moves nodes
        // in dynamic mode). They are then rebuilt lazily on the next pick, so a
        // running simulation does not pay a rebuild on every frame.
        this._index_dirty = false;
        // Below this on-screen label size (px) node labels are skipped (LOD).
        this.min_label_px = 6;
        // Dimmed (non-highlighted) opacity used by the legend visual selection.
        this.dim_opacity = 0.05;
}

/**
 * Colours of the drawing that are not data: ink of links, node outlines, labels
 * and decorations, paper behind the text halos, muted link labels. `light` is
 * the print palette (white background); the dark one is read from the dark
 * variables of the active theme (`--text`, `--surface`, `--secondary-dark`) and
 * kept until the mode changes (see the listener at the end of this file).
 */
D3MSTreeCanvasRenderer.palettes = {
        light: { ink: 'black', ink_faded: 'rgba(0,0,0,0.2)', paper: 'white', muted: 'gray', label_halo: null },
        dark: null
};

/**
 * A colour with an opacity, for the faded links of the dark palette
 * @param {string} colour Hexadecimal colour (#rgb or #rrggbb)
 * @param {number} alpha Opacity
 * @returns {string|null} rgba() colour, null when the colour is not hexadecimal
 */
D3MSTreeCanvasRenderer.withAlpha = function (colour, alpha) {
        var hex = String(colour).trim().replace('#', '');
        if (hex.length === 3) {
                hex = hex.split('').map(function (c) { return c + c; }).join('');
        }
        if (!/^[0-9a-f]{6}$/i.test(hex)) {
                return null;
        }
        var value = parseInt(hex, 16);
        return 'rgba(' + (value >> 16 & 255) + ',' + (value >> 8 & 255) + ',' + (value & 255) + ',' + alpha + ')';
};

/**
 * Palette of the current drawing: the dark one on screen in dark mode
 * (js/theme.js), the print one otherwise and always in the exports.
 * @returns {Object} Palette, see D3MSTreeCanvasRenderer.palettes
 */
D3MSTreeCanvasRenderer.prototype._palette = function () {
        var dark = !this._exporting && document.documentElement.getAttribute('data-theme') === 'dark';
        if (!dark) {
                return D3MSTreeCanvasRenderer.palettes.light;
        }
        if (!D3MSTreeCanvasRenderer.palettes.dark) {
                var css = getComputedStyle(document.documentElement);
                var ink = css.getPropertyValue('--text').trim() || '#D5DEEA';
                var paper = css.getPropertyValue('--surface').trim() || '#19212D';
                var muted = css.getPropertyValue('--secondary-dark').trim() || '#8A95A5';
                D3MSTreeCanvasRenderer.palettes.dark = {
                        ink: ink,
                        ink_faded: D3MSTreeCanvasRenderer.withAlpha(ink, 0.2) || muted,
                        paper: paper,
                        muted: muted,
                        label_halo: paper
                };
        }
        return D3MSTreeCanvasRenderer.palettes.dark;
};

/**
 * Resize the backing canvas to the container size, accounting for devicePixelRatio.
 * @param {number} width  CSS width in pixels
 * @param {number} height CSS height in pixels
 */
D3MSTreeCanvasRenderer.prototype.resize = function (width, height) {
        this.dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.canvas.width = Math.round(width * this.dpr);
        this.canvas.height = Math.round(height * this.dpr);
        this.requestRedraw();
};

/**
 * Schedule a redraw on the next animation frame. Safe to call many times per
 * frame; the draw runs at most once per frame.
 */
D3MSTreeCanvasRenderer.prototype.requestRedraw = function () {
        var self = this;
        if (this._raf) {
                return;
        }
        this._raf = window.requestAnimationFrame(function () {
                self._raf = null;
                self.draw();
        });
};

/**
 * Apply the current tree zoom/pan transform to the 2D context, composed with the
 * device pixel ratio. This mirrors the transform applied to the SVG #vis group
 * (translate(tx,ty) scale(k)), so canvas and SVG overlay stay aligned.
 */
D3MSTreeCanvasRenderer.prototype._applyTransform = function () {
        var k = this.tree.scale;
        var tx = this.tree.translate[0];
        var ty = this.tree.translate[1];
        var d = this.dpr;
        this.ctx.setTransform(d * k, 0, 0, d * k, d * tx, d * ty);
};

/**
 * Full scene redraw: clear, then draw links, nodes (halo, wedges, stroke) and
 * labels in that order. All visual state is read from the model.
 */
D3MSTreeCanvasRenderer.prototype.draw = function () {
        var tree = this.tree;
        var ctx = this.ctx;
        // Clear in device space (identity transform) then switch to data space.
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this._applyTransform();
        // css pixels per data unit, for the minimum width of the node borders
        this._px_per_unit = tree.scale;

        this._drawLinks();
        this._drawNodes();
        this._drawNodeLabels();
        this._drawNoteMarks();
};

D3MSTreeCanvasRenderer.prototype._drawLinks = function () {
        var tree = this.tree;
        var ctx = this.ctx;
        var links = tree.force_links;
        var show_labels = tree.show_link_labels;
        // Legend visual-selection (highlight mode, also driven by the video).
        var hl = tree._highlight;
        var palette = this._palette();
        // Line width is expressed in user units so it scales with zoom, matching
        // the SVG behaviour where stroke-width lived inside the scaled group.
        for (var i = 0; i < links.length; i++) {
                var l = links[i];
                // Hidden links (over hide_link_length) were drawn at opacity 0.
                if (l.value > tree.hide_link_length) {
                        continue;
                }
                var sx = l.source.x, sy = l.source.y, tx = l.target.x, ty = l.target.y;
                var dashed = (tree.max_link_length && l.value > tree.max_link_length);

                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(tx, ty);
                if (hl) {
                        // Solid black between two highlighted nodes, faded otherwise.
                        if (l.source._hl_visible && l.target._hl_visible) {
                                ctx.strokeStyle = palette.ink;
                                ctx.setLineDash([]);
                        } else {
                                ctx.strokeStyle = palette.ink_faded;
                                ctx.setLineDash([2, 2]);
                        }
                } else if (l.tracked) {
                        // Drag highlight of the moved subtree.
                        ctx.strokeStyle = '#A0A0A0';
                        ctx.setLineDash(dashed ? [3, 5] : []);
                } else {
                        ctx.strokeStyle = palette.ink;
                        ctx.setLineDash(dashed ? [3, 5] : []);
                }
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]);
        }

        if (show_labels) {
                this._drawLinkLabels();
        }
};

D3MSTreeCanvasRenderer.prototype._drawLinkLabels = function () {
        var tree = this.tree;
        var ctx = this.ctx;
        var links = tree.force_links;
        var size = tree.link_font_size;
        // Skip labels when they would be too small to read (level of detail).
        // During export the full detail is always rendered.
        if (!this._exporting && size * tree.scale < this.min_label_px) {
                return;
        }
        ctx.font = size + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var hl = tree._highlight;
        var palette = this._palette();
        for (var i = 0; i < links.length; i++) {
                var l = links[i];
                if (l.value > tree.hide_link_length) {
                        continue;
                }
                // In highlight mode, only label links between highlighted nodes.
                if (hl && !(l.source._hl_visible && l.target._hl_visible)) {
                        continue;
                }
                if (typeof l.original_value === 'undefined') {
                        continue;
                }
                var label = l.original_value >= 1 ? Math.floor(l.original_value) : l.original_value.toPrecision(2);
                var mx = (l.source.x + l.target.x) / 2.0;
                var my = (l.source.y + l.target.y) / 2.0;
                // Paper halo then muted fill, reproducing the two-layer SVG text.
                ctx.lineWidth = 3;
                ctx.strokeStyle = palette.paper;
                ctx.strokeText(label, mx, my);
                ctx.fillStyle = palette.muted;
                ctx.fillText(label, mx, my);
        }
};

D3MSTreeCanvasRenderer.prototype._drawNodes = function () {
        var tree = this.tree;
        var ctx = this.ctx;
        var nodes = tree.force_nodes;
        var default_colour = tree.default_colour;
        var colours = tree.category_colours;

        var hl = tree._highlight;
        for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                if (n.hypothetical && !tree.show_hypothetical_nodes) {
                        continue;
                }
                var r = tree.node_radii[n.id];
                if (!r || r <= 0) {
                        continue;
                }
                var pie = n._pie;
                if (!pie || pie.length === 0) {
                        continue;
                }
                // Nodes with a shape or a border chosen by the user take their own
                // path; plain circles keep the drawing below unchanged.
                var shape = tree.getNodeShape ? tree.getNodeShape(n) : D3MSTreeNodeStyles.default_shape;
                var border = tree.getNodeBorder ? tree.getNodeBorder(n) : D3MSTreeNodeStyles.default_border;
                if (shape !== D3MSTreeNodeStyles.default_shape || border !== D3MSTreeNodeStyles.default_border) {
                        this._drawStyledNode(n, r, shape, border);
                        continue;
                }
                // Halo (selection/highlight ring) is drawn per node, right behind
                // its own body, reproducing the old SVG layout where the halo lived
                // inside each node <g>. This keeps every selected node's ring
                // visible even when nodes overlap (a single batched halo pass would
                // be covered by the bodies drawn on top of it).
                if (n.halo_thickness) {
                        ctx.beginPath();
                        ctx.arc(n.x, n.y, r + n.halo_thickness, 0, 2 * Math.PI);
                        ctx.fillStyle = n.halo_colour;
                        ctx.fill();
                }
                // Tagged nodes (subtree being dragged) get a thick orange stroke,
                // matching the previous SVG highlight.
                var stroke = n.tagged ? '#ff9900' : this._palette().ink;
                var stroke_w = n.tagged ? 3 : 1;
                for (var w = 0; w < pie.length; w++) {
                        var seg = pie[w];
                        var type = seg.data.type;
                        var fill;
                        if (hl) {
                                // Highlight mode: only wedges of a selected group are
                                // drawn (with the group colour); the rest are hidden,
                                // reproducing the old per-wedge opacity behaviour.
                                if (hl.types[type] === undefined) {
                                        continue;
                                }
                                fill = hl.types[type];
                        } else {
                                fill = colours[type] ? colours[type] : default_colour;
                        }
                        ctx.beginPath();
                        if (pie.length === 1) {
                                // Single category: a full disc (avoids a seam line).
                                ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
                        } else {
                                ctx.moveTo(n.x, n.y);
                                ctx.arc(n.x, n.y, r, seg.startAngle - Math.PI / 2, seg.endAngle - Math.PI / 2);
                                ctx.closePath();
                        }
                        ctx.fillStyle = fill;
                        ctx.fill();
                        ctx.lineWidth = stroke_w;
                        ctx.strokeStyle = stroke;
                        ctx.stroke();
                }
        }
};

/**
 * Wedges of a node pie with their colours. In highlight mode only the wedges of
 * a selected group are kept, with the group colour.
 * @param {Object} node Force node
 * @returns {Array} [wedge, colour] pairs
 */
D3MSTreeCanvasRenderer.prototype._nodeFills = function (node) {
        var tree = this.tree;
        var hl = tree._highlight;
        var colours = tree.category_colours;
        var fills = [];
        for (var w = 0; w < node._pie.length; w++) {
                var seg = node._pie[w];
                var type = seg.data.type;
                if (hl) {
                        if (hl.types[type] === undefined) {
                                continue;
                        }
                        fills.push([seg, hl.types[type]]);
                } else {
                        fills.push([seg, colours[type] ? colours[type] : tree.default_colour]);
                }
        }
        return fills;
};

/**
 * Draw a node with a shape or a border chosen by the user: halo following the
 * outer path, solid decoration or double ring behind the body, pie wedges
 * clipped to the shape (separators always solid), then the shape outline with
 * the border line style. A node with no visible wedge (highlight mode) is not
 * drawn, as for plain nodes.
 * @param {Object} n Force node
 * @param {number} r Node radius
 * @param {string} shape Shape name
 * @param {string} border Border name
 * @returns {undefined}
 */
D3MSTreeCanvasRenderer.prototype._drawStyledNode = function (n, r, shape, border) {
        // see _styledNodeSvg for the same node in the SVG export
        var ctx = this.ctx;
        var styles = D3MSTreeNodeStyles;
        var palette = this._palette();
        var fills = this._nodeFills(n);
        if (fills.length === 0) {
                return;
        }
        // paths centred on the origin, cached by shape, border and radius
        var paths = this._styledPaths(shape, border, r);
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.setLineDash([]);
        if (n.halo_thickness) {
                // the halo is the outer path grown by its thickness (round joins)
                ctx.fillStyle = n.halo_colour;
                ctx.strokeStyle = n.halo_colour;
                ctx.lineWidth = n.halo_thickness * 2;
                ctx.lineJoin = 'round';
                ctx.fill(paths.outer);
                ctx.stroke(paths.outer);
                ctx.lineJoin = 'miter';
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = palette.ink;
        if (styles.decorations[border]) {
                ctx.fillStyle = palette.ink;
                ctx.fill(paths.outer);
        } else if (border === 'double') {
                ctx.fillStyle = palette.paper;
                ctx.fill(paths.outer);
                ctx.lineWidth = this._minLine({ width: 1, dash: [] }, r).width;
                ctx.stroke(paths.outer);
                ctx.lineWidth = 1;
        }
        if (n._pie.length === 1) {
                // a single colour fills the shape, no clip needed (the common, cheap case)
                ctx.fillStyle = fills[0][1];
                ctx.fill(paths.body);
        } else {
                // wedges drawn a bit larger than the shape, so their arcs fall outside the clip
                var big = styles.circumradius(shape, r) * 1.05;
                ctx.save();
                ctx.clip(paths.body);
                for (var f = 0; f < fills.length; f++) {
                        var seg = fills[f][0];
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.arc(0, 0, big, seg.startAngle - Math.PI / 2, seg.endAngle - Math.PI / 2);
                        ctx.closePath();
                        ctx.fillStyle = fills[f][1];
                        ctx.fill();
                        ctx.stroke();
                }
                ctx.restore();
        }
        // shape outline: the border line style, or the orange stroke of a dragged subtree
        var line = n.tagged ? { width: 3, dash: [], cap: 'butt' } : this._minLine(styles.lineStyle(border), r);
        ctx.lineWidth = line.width;
        ctx.setLineDash(line.dash);
        ctx.lineCap = line.cap;
        ctx.strokeStyle = n.tagged ? '#ff9900' : palette.ink;
        ctx.stroke(paths.body);
        ctx.restore();
};

/**
 * Outer and body paths of a styled node, centred on the origin. Building the
 * decorations is the costly part of drawing, and nodes share few radii, so the
 * paths are cached by shape, border and radius (the cache is emptied when it
 * grows too much, e.g. after many changes of node size).
 * @param {string} shape Shape name
 * @param {string} border Border name
 * @param {number} r Node radius
 * @returns {Object} {outer, body} Path2D objects
 */
D3MSTreeCanvasRenderer.prototype._styledPaths = function (shape, border, r) {
        if (!this._path_cache || this._path_cache.size > 2000) {
                this._path_cache = new Map();
        }
        var key = shape + '|' + border + '|' + r;
        var paths = this._path_cache.get(key);
        if (!paths) {
                var styles = D3MSTreeNodeStyles;
                paths = {
                        outer: styles.path2D(styles.outerOutline(shape, border, 0, 0, r)),
                        body: styles.path2D(styles.shapeOutline(shape, 0, 0, r, 0))
                };
                this._path_cache.set(key, paths);
        }
        return paths;
};

/**
 * Border line kept at least one pixel wide on screen (and in the PNG export): when
 * zoomed out, data-unit widths would vanish and dashed or dotted borders would look
 * normal. Dashes grow with the width, but a dash pattern never exceeds a third of
 * the node perimeter. The SVG export is vector and keeps the data-unit widths.
 * @param {Object} line {width, dash, cap} in data units
 * @param {number} r Node radius
 * @returns {Object} {width, dash, cap}
 */
D3MSTreeCanvasRenderer.prototype._minLine = function (line, r) {
        var px = this._px_per_unit || 1;
        var factor = Math.max(1, 1 / (line.width * px));
        if (factor === 1) {
                return line;
        }
        var dash = line.dash.map(function (d) { return d * factor; });
        var pattern = dash.reduce(function (a, b) { return a + b; }, 0);
        var limit = 2 * Math.PI * r / 3;
        if (pattern > limit) {
                dash = dash.map(function (d) { return d * limit / pattern; });
        }
        return { width: line.width * factor, dash: dash, cap: line.cap };
};

/**
 * SVG markup of a node with a shape or a border chosen by the user, mirroring
 * _drawStyledNode: halo, decoration or double ring, the body (filled, or with its
 * wedges clipped to the shape), then the shape outline. The outer and body paths
 * are written once in `<defs>`, centred on the origin and shared by every node
 * with the same shape, border and radius; each node only places them, which
 * keeps the file small when many nodes are styled.
 * @param {Object} nd Force node
 * @param {number} r Node radius
 * @param {string} shape Shape name
 * @param {string} border Border name
 * @param {Object} defs Shared definitions of the export {ids: {}, list: []}
 * @param {string} clip_id Unique id for the clipPath of a multi-colour node
 * @param {Function} num Number formatter of the export
 * @returns {string} SVG markup ('' when no wedge is visible)
 */
D3MSTreeCanvasRenderer.prototype._styledNodeSvg = function (nd, r, shape, border, defs, clip_id, num) {
        var styles = D3MSTreeNodeStyles;
        var fills = this._nodeFills(nd);
        if (fills.length === 0) {
                return '';
        }
        // shared paths, defined the first time they are needed
        var key = shape + '|' + border + '|' + r;
        var ref = defs.ids[key];
        if (!ref) {
                ref = defs.ids[key] = 'spread-node-style-' + defs.list.length;
                defs.list.push('<path id="' + ref + '-outer" d="' + styles.svgPath(styles.outerOutline(shape, border, 0, 0, r), num) + '"/>');
                defs.list.push('<path id="' + ref + '-body" d="' + styles.svgPath(styles.shapeOutline(shape, 0, 0, r, 0), num) + '"/>');
        }
        var outer = 'xlink:href="#' + ref + '-outer"';
        var body = 'xlink:href="#' + ref + '-body"';
        var out = ['<g transform="translate(' + num(nd.x) + ',' + num(nd.y) + ')">'];
        if (nd.halo_thickness) {
                out.push('<use ' + outer + ' fill="' + nd.halo_colour + '" stroke="' + nd.halo_colour +
                        '" stroke-width="' + num(nd.halo_thickness * 2) + '" stroke-linejoin="round"/>');
        }
        if (styles.decorations[border]) {
                out.push('<use ' + outer + ' fill="black"/>');
        } else if (border === 'double') {
                out.push('<use ' + outer + ' fill="white" stroke="black" stroke-width="1"/>');
        }
        if (nd._pie.length === 1) {
                out.push('<use ' + body + ' fill="' + fills[0][1] + '"/>');
        } else {
                var big = styles.circumradius(shape, r) * 1.05;
                out.push('<clipPath id="' + clip_id + '"><use ' + body + '/></clipPath>');
                out.push('<g clip-path="url(#' + clip_id + ')">');
                for (var f = 0; f < fills.length; f++) {
                        var seg = fills[f][0];
                        var a0 = seg.startAngle - Math.PI / 2;
                        var a1 = seg.endAngle - Math.PI / 2;
                        var large = (a1 - a0) > Math.PI ? 1 : 0;
                        var d = 'M0,0 L' + num(big * Math.cos(a0)) + ',' + num(big * Math.sin(a0)) +
                                ' A' + num(big) + ',' + num(big) + ' 0 ' + large + ' 1 ' +
                                num(big * Math.cos(a1)) + ',' + num(big * Math.sin(a1)) + ' Z';
                        out.push('<path d="' + d + '" fill="' + fills[f][1] + '" stroke="black" stroke-width="1"/>');
                }
                out.push('</g>');
        }
        var line = nd.tagged ? { width: 3, dash: [], cap: 'butt' } : styles.lineStyle(border);
        out.push('<use ' + body + ' fill="none" stroke="' + (nd.tagged ? '#ff9900' : 'black') +
                '" stroke-width="' + line.width + '"' +
                (line.dash.length ? ' stroke-dasharray="' + line.dash.join(',') + '"' : '') +
                (line.cap !== 'butt' ? ' stroke-linecap="' + line.cap + '"' : '') + '/>');
        out.push('</g>');
        return out.join('');
};

D3MSTreeCanvasRenderer.prototype._drawNodeLabels = function () {
        var tree = this.tree;
        var ctx = this.ctx;
        if (!tree.show_node_labels) {
                return;
        }
        var size = tree.node_font_size;
        // Level of detail: do not pay the text cost when zoomed out (always draw
        // labels during export so the saved image keeps full detail).
        if (!this._exporting && size * tree.scale < this.min_label_px) {
                return;
        }
        var nodes = tree.force_nodes;
        var field = tree.node_text_value;
        ctx.font = size + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var palette = this._palette();
        ctx.fillStyle = palette.ink;
        if (palette.label_halo) {
                ctx.lineWidth = 3;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = palette.label_halo;
        }
        for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                if (n.hypothetical && !tree.show_hypothetical_nodes) {
                        continue;
                }
                var text = this._nodeLabel(n, field);
                // light labels need a dark halo over the (often white) nodes
                if (palette.label_halo) {
                        ctx.strokeText(text, n.x, n.y);
                }
                ctx.fillText(text, n.x, n.y);
        }
        ctx.lineJoin = 'miter';
};

/**
 * Resolve the label string for a node, reproducing the logic previously in
 * D3MSTree._setNodeText (node id, or a metadata field, or "ND").
 */
D3MSTreeCanvasRenderer.prototype._nodeLabel = function (node, field) {
        var tree = this.tree;
        if (field && field !== 'node_id') {
                var meta_ids = tree.metadata_map[node.id];
                if (meta_ids) {
                        var display = tree.metadata[meta_ids[0]][field];
                        return display ? display : 'ND';
                }
                return 'ND';
        }
        return node.id;
};

/* ------------------------------------------------------------------ */
/* Picking (spatial index)                                            */
/* ------------------------------------------------------------------ */

/**
 * Rebuild the quadtrees used for picking. Call this whenever node positions
 * settle (after layout, drag end, collapse, etc.).
 */
D3MSTreeCanvasRenderer.prototype.refreshIndex = function () {
        var nodes = this.tree.force_nodes;
        this.node_quadtree = d3.quadtree()
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; })
                .addAll(nodes);

        // Index links by their midpoint for cheap nearest-link lookup on hover.
        var links = this.tree.force_links;
        this.link_quadtree = d3.quadtree()
                .x(function (d) { return (d.source.x + d.target.x) / 2; })
                .y(function (d) { return (d.source.y + d.target.y) / 2; })
                .addAll(links);
        this._index_dirty = false;
};

/**
 * Mark the picking indexes stale without rebuilding them. Called on each force
 * tick (dynamic mode): the rebuild is deferred to the next pickNode/pickLink so
 * picking always matches the drawn node positions even while they move.
 */
D3MSTreeCanvasRenderer.prototype.invalidateIndex = function () {
        this._index_dirty = true;
};

/**
 * Find the node under a point given in data coordinates, or null. A node is hit
 * when the point lies within its drawn radius.
 * @param {number} x data-space x
 * @param {number} y data-space y
 */
D3MSTreeCanvasRenderer.prototype.pickNode = function (x, y) {
        if (!this.node_quadtree || this._index_dirty) {
                this.refreshIndex();
        }
        // Search radius accounts for the largest node; quadtree.find needs a bound.
        // Polygons with the area of the circle reach further out (the triangle
        // up to about 1.56 times the radius).
        var max_r = this._maxRadius();
        var candidate = this.node_quadtree.find(x, y, max_r * 1.6 + 4);
        if (!candidate) {
                return null;
        }
        if (candidate.hypothetical && !this.tree.show_hypothetical_nodes) {
                return null;
        }
        var r = this.tree.node_radii[candidate.id] || 3;
        // the hit follows the node shape (the nearest centre is the only candidate)
        var shape = this.tree.getNodeShape ? this.tree.getNodeShape(candidate) : D3MSTreeNodeStyles.default_shape;
        return D3MSTreeNodeStyles.contains(shape, candidate.x, candidate.y, r, x, y) ? candidate : null;
};

/**
 * Given a node and a point, return the pie wedge under the point (by angle), so
 * the tooltip can show the right segment. Falls back to the first wedge.
 */
D3MSTreeCanvasRenderer.prototype.pickWedge = function (node, x, y) {
        var pie = node._pie;
        if (!pie || pie.length === 0) {
                return null;
        }
        if (pie.length === 1) {
                return pie[0];
        }
        // Angle measured the same way the wedges are drawn (offset by -PI/2).
        var a = Math.atan2(y - node.y, x - node.x) + Math.PI / 2;
        if (a < 0) {
                a += 2 * Math.PI;
        }
        for (var i = 0; i < pie.length; i++) {
                if (a >= pie[i].startAngle && a < pie[i].endAngle) {
                        return pie[i];
                }
        }
        return pie[0];
};

/**
 * Find a link near a point in data coordinates (used for the link tooltip).
 * Returns the link whose segment is within `tol` data units, or null.
 */
D3MSTreeCanvasRenderer.prototype.pickLink = function (x, y, tol) {
        if (!this.link_quadtree || this._index_dirty) {
                this.refreshIndex();
        }
        tol = tol || 4;
        var best = null;
        var best_d = tol * tol;
        // Scan candidates near the point; quadtree.visit prunes far quadrants.
        var self = this;
        this.link_quadtree.visit(function (qnode, x0, y0, x1, y1) {
                if (!qnode.length) {
                        do {
                                var l = qnode.data;
                                var d = self._distToSegmentSq(x, y, l.source.x, l.source.y, l.target.x, l.target.y);
                                if (d < best_d) {
                                        best_d = d;
                                        best = l;
                                }
                        } while ((qnode = qnode.next));
                }
                // Prune quadrants whose bounding box is farther than the tolerance.
                return x0 > x + tol || x1 < x - tol || y0 > y + tol || y1 < y - tol;
        });
        return best;
};

D3MSTreeCanvasRenderer.prototype._maxRadius = function () {
        if (this._cached_max_radius_dirty === false) {
                return this._cached_max_radius;
        }
        var radii = this.tree.node_radii;
        var max = 3;
        for (var id in radii) {
                if (radii[id] > max) {
                        max = radii[id];
                }
        }
        this._cached_max_radius = max;
        this._cached_max_radius_dirty = false;
        return max;
};

/** Invalidate the cached maximum radius (call when node sizes change). */
D3MSTreeCanvasRenderer.prototype.invalidateRadius = function () {
        this._cached_max_radius_dirty = true;
};

D3MSTreeCanvasRenderer.prototype._distToSegmentSq = function (px, py, x1, y1, x2, y2) {
        var dx = x2 - x1, dy = y2 - y1;
        var len2 = dx * dx + dy * dy;
        var t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        var cx = x1 + t * dx, cy = y1 + t * dy;
        var ex = px - cx, ey = py - cy;
        return ex * ex + ey * ey;
};

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

/**
 * Render the current view (same zoom/pan as on screen) into a fresh, white,
 * higher-resolution canvas suitable for a PNG export. Returns the canvas; the
 * caller can composite the legend/scale overlays and save it.
 *
 * Matches the previous SVG export, which serialised the on-screen viewport.
 * @param {number} targetWidth Output width in pixels (height keeps the ratio)
 */
D3MSTreeCanvasRenderer.prototype.exportToCanvas = function (targetWidth) {
        var tree = this.tree;
        targetWidth = targetWidth || 2400;
        var s = targetWidth / tree.width;
        var out = document.createElement('canvas');
        out.width = Math.round(tree.width * s);
        out.height = Math.round(tree.height * s);
        var ctx = out.getContext('2d');
        // White background for print/publication.
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, out.width, out.height);

        var k = tree.scale;
        var tx = tree.translate[0];
        var ty = tree.translate[1];
        // Temporarily draw onto the export context with the scaled view transform.
        var saved_ctx = this.ctx;
        var saved_exporting = this._exporting;
        this.ctx = ctx;
        this._exporting = true;
        ctx.setTransform(s * k, 0, 0, s * k, s * tx, s * ty);
        var saved_px_per_unit = this._px_per_unit;
        this._px_per_unit = s * k;
        this._drawLinks();
        this._drawNodes();
        this._drawNodeLabels();
        this._drawNoteMarks();
        this.ctx = saved_ctx;
        this._exporting = saved_exporting;
        this._px_per_unit = saved_px_per_unit;
        return out;
};

/**
 * Build a vector (SVG) representation of the WHOLE tree from the model, in data
 * coordinates, mirroring exactly what draw() paints (links, link labels, node
 * halos, pie wedges and node labels — including the current highlight state).
 *
 * Unlike exportToCanvas (which captures only the visible viewport at the current
 * zoom), this always covers the full tree extent so the SVG export contains the
 * entire tree regardless of zoom/pan.
 *
 * @returns {{content: string, minX: number, minY: number, maxX: number, maxY: number}}
 *   `content` is the SVG markup (no <svg> wrapper) in data space; the bounds give
 *   the full tree bounding box (already padded for labels).
 */
D3MSTreeCanvasRenderer.prototype.exportToSvg = function () {
        var tree = this.tree;
        var nodes = tree.force_nodes;
        var links = tree.force_links;
        var colours = tree.category_colours;
        var default_colour = tree.default_colour;
        var hl = tree._highlight;

        function esc(s) {
                return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        function num(n) {
                // Trim to 2 decimals to keep the file small; avoid "-0".
                var r = Math.round(n * 100) / 100;
                return r === 0 ? 0 : r;
        }

        // ---- full-tree bounding box (node body + halo) ----
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (var b = 0; b < nodes.length; b++) {
                var bn = nodes[b];
                if (bn.hypothetical && !tree.show_hypothetical_nodes) {
                        continue;
                }
                // the node shape and border may reach beyond the radius
                var b_r = tree.node_radii[bn.id] || 3;
                var b_shape = tree.getNodeShape ? tree.getNodeShape(bn) : D3MSTreeNodeStyles.default_shape;
                var b_border = tree.getNodeBorder ? tree.getNodeBorder(bn) : D3MSTreeNodeStyles.default_border;
                var br = D3MSTreeNodeStyles.extent(b_shape, b_border, b_r) + (bn.halo_thickness || 0);
                if (bn.x - br < minX) { minX = bn.x - br; }
                if (bn.x + br > maxX) { maxX = bn.x + br; }
                if (bn.y - br < minY) { minY = bn.y - br; }
                if (bn.y + br > maxY) { maxY = bn.y + br; }
        }
        if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1; maxY = 1; }
        // Padding so node/link labels near the edges are not clipped.
        var pad = (tree.node_font_size || 12) + this._maxRadius() + 10;
        minX -= pad; minY -= pad; maxX += pad; maxY += pad;

        var out = [];

        // ---- links ----
        out.push('<g class="links" fill="none">');
        for (var i = 0; i < links.length; i++) {
                var l = links[i];
                if (l.value > tree.hide_link_length) {
                        continue;
                }
                var dashed = (tree.max_link_length && l.value > tree.max_link_length);
                var stroke = 'black';
                var dash = '';
                if (hl) {
                        if (l.source._hl_visible && l.target._hl_visible) {
                                stroke = 'black';
                        } else {
                                stroke = 'rgba(0,0,0,0.2)';
                                dash = '2,2';
                        }
                } else if (l.tracked) {
                        stroke = '#A0A0A0';
                        dash = dashed ? '3,5' : '';
                } else {
                        stroke = 'black';
                        dash = dashed ? '3,5' : '';
                }
                out.push('<line x1="' + num(l.source.x) + '" y1="' + num(l.source.y) +
                        '" x2="' + num(l.target.x) + '" y2="' + num(l.target.y) +
                        '" stroke="' + stroke + '" stroke-width="1"' +
                        (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>');
        }
        out.push('</g>');

        // ---- link labels ----
        if (tree.show_link_labels) {
                var lsize = tree.link_font_size;
                out.push('<g class="link-labels" font-family="sans-serif" font-size="' + lsize +
                        '" text-anchor="middle" fill="gray" stroke="white" stroke-width="3"' +
                        ' paint-order="stroke" style="dominant-baseline:central">');
                for (var li = 0; li < links.length; li++) {
                        var ll = links[li];
                        if (ll.value > tree.hide_link_length) { continue; }
                        if (hl && !(ll.source._hl_visible && ll.target._hl_visible)) { continue; }
                        if (typeof ll.original_value === 'undefined') { continue; }
                        var label = ll.original_value >= 1 ? Math.floor(ll.original_value) : ll.original_value.toPrecision(2);
                        var lmx = (ll.source.x + ll.target.x) / 2.0;
                        var lmy = (ll.source.y + ll.target.y) / 2.0;
                        out.push('<text x="' + num(lmx) + '" y="' + num(lmy) + '">' + esc(label) + '</text>');
                }
                out.push('</g>');
        }

        // ---- node bodies (pie wedges / disc), each preceded by its own halo ----
        // shared paths of the styled nodes, written before the nodes once known
        var style_defs = { ids: {}, list: [] };
        var nodes_start = out.length;
        out.push('<g class="nodes">');
        for (var n = 0; n < nodes.length; n++) {
                var nd = nodes[n];
                if (nd.hypothetical && !tree.show_hypothetical_nodes) { continue; }
                var r = tree.node_radii[nd.id];
                if (!r || r <= 0) { continue; }
                var pie = nd._pie;
                if (!pie || pie.length === 0) { continue; }
                // Nodes with a shape or a border chosen by the user, as drawn on canvas
                var nshape = tree.getNodeShape ? tree.getNodeShape(nd) : D3MSTreeNodeStyles.default_shape;
                var nborder = tree.getNodeBorder ? tree.getNodeBorder(nd) : D3MSTreeNodeStyles.default_border;
                if (nshape !== D3MSTreeNodeStyles.default_shape || nborder !== D3MSTreeNodeStyles.default_border) {
                        out.push(this._styledNodeSvg(nd, r, nshape, nborder, style_defs, 'spread-node-clip-' + n, num));
                        continue;
                }
                // Halo drawn right before this node's body so every selected node
                // keeps a visible ring even when nodes overlap (mirrors the canvas
                // draw order and the old per-node SVG <g> layout).
                if (nd.halo_thickness) {
                        out.push('<circle cx="' + num(nd.x) + '" cy="' + num(nd.y) + '" r="' + num(r + nd.halo_thickness) +
                                '" fill="' + nd.halo_colour + '"/>');
                }
                var nstroke = nd.tagged ? '#ff9900' : 'black';
                var nstroke_w = nd.tagged ? 3 : 1;
                for (var w = 0; w < pie.length; w++) {
                        var seg = pie[w];
                        var type = seg.data.type;
                        var fill;
                        if (hl) {
                                if (hl.types[type] === undefined) { continue; }
                                fill = hl.types[type];
                        } else {
                                fill = colours[type] ? colours[type] : default_colour;
                        }
                        if (pie.length === 1) {
                                out.push('<circle cx="' + num(nd.x) + '" cy="' + num(nd.y) + '" r="' + num(r) +
                                        '" fill="' + fill + '" stroke="' + nstroke + '" stroke-width="' + nstroke_w + '"/>');
                        } else {
                                var a0 = seg.startAngle - Math.PI / 2;
                                var a1 = seg.endAngle - Math.PI / 2;
                                var x0 = nd.x + r * Math.cos(a0), y0 = nd.y + r * Math.sin(a0);
                                var x1 = nd.x + r * Math.cos(a1), y1 = nd.y + r * Math.sin(a1);
                                var large = (a1 - a0) > Math.PI ? 1 : 0;
                                var d = 'M' + num(nd.x) + ',' + num(nd.y) +
                                        ' L' + num(x0) + ',' + num(y0) +
                                        ' A' + num(r) + ',' + num(r) + ' 0 ' + large + ' 1 ' + num(x1) + ',' + num(y1) + ' Z';
                                out.push('<path d="' + d + '" fill="' + fill + '" stroke="' + nstroke +
                                        '" stroke-width="' + nstroke_w + '"/>');
                        }
                }
        }
        out.push('</g>');
        if (style_defs.list.length) {
                out.splice(nodes_start, 0, '<defs>' + style_defs.list.join('') + '</defs>');
        }

        // ---- node labels ----
        if (tree.show_node_labels) {
                var nsize = tree.node_font_size;
                out.push('<g class="node-labels" font-family="sans-serif" font-size="' + nsize +
                        '" text-anchor="middle" fill="black" style="dominant-baseline:central">');
                var field = tree.node_text_value;
                for (var nl = 0; nl < nodes.length; nl++) {
                        var nln = nodes[nl];
                        if (nln.hypothetical && !tree.show_hypothetical_nodes) { continue; }
                        out.push('<text x="' + num(nln.x) + '" y="' + num(nln.y) + '">' +
                                esc(this._nodeLabel(nln, field)) + '</text>');
                }
                out.push('</g>');
        }

        // ---- marks of the nodes with notes (sizes for the unzoomed tree) ----
        var marks = this._noteMarks(1);
        if (marks.length) {
                out.push('<g class="note-marks">');
                for (var nm = 0; nm < marks.length; nm++) {
                        var mk = marks[nm];
                        out.push('<circle cx="' + num(mk.x) + '" cy="' + num(mk.y) + '" r="' + num(mk.r) +
                                '" fill="black" stroke="white" stroke-width="' + num(mk.ring) + '"/>');
                        for (var ml = 0; ml < mk.lines.length; ml++) {
                                var ln = mk.lines[ml];
                                out.push('<line x1="' + num(ln[0]) + '" y1="' + num(ln[1]) + '" x2="' + num(ln[2]) + '" y2="' + num(ln[3]) +
                                        '" stroke="white" stroke-width="' + num(mk.ring) + '"/>');
                        }
                }
                out.push('</g>');
        }

        return { content: out.join(''), minX: minX, minY: minY, maxX: maxX, maxY: maxY };
};

/* ------------------------------------------------------------------ */
/* Marks of the nodes with notes (js/notes.js)                        */
/* ------------------------------------------------------------------ */

/**
 * Marks of the nodes holding at least one sample with a note: a small black disc
 * with a white ring and two white lines (a note), on the upper right edge of the
 * node. The size stays the same on screen whatever the zoom. The tree tells the
 * samples with notes in `note_samples` (a Set) and hides the marks with
 * `show_note_marks` set to false.
 *
 * @param {number} scale Css pixels per data unit (the zoom of the view)
 * @returns {Array} Marks `{ x, y, r, ring, lines, node }` in data units
 */
D3MSTreeCanvasRenderer.prototype._noteMarks = function (scale) {
        var tree = this.tree;
        var samples = tree.note_samples;
        if (tree.show_note_marks === false || !samples || samples.size === 0) {
                return [];
        }
        var unit = 1 / (scale || 1);
        var m = 6 * unit;
        var marks = [];
        var nodes = tree.force_nodes;
        for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                if (n.hypothetical && !tree.show_hypothetical_nodes) {
                        continue;
                }
                var r = tree.node_radii[n.id];
                if (!r || r <= 0) {
                        continue;
                }
                // a node may group several samples: one of them with a note is enough
                var grouped = tree.grouped_nodes ? tree.grouped_nodes[n.id] : null;
                var ids = grouped && grouped.length ? grouped : [n.id];
                var noted = false;
                for (var j = 0; j < ids.length; j++) {
                        if (samples.has(ids[j])) {
                                noted = true;
                                break;
                        }
                }
                if (!noted) {
                        continue;
                }
                var x = n.x + r * Math.SQRT1_2;
                var y = n.y - r * Math.SQRT1_2;
                var half = 2.5 * unit;
                marks.push({
                        node: n,
                        x: x,
                        y: y,
                        r: m,
                        ring: 1.5 * unit,
                        lines: [[x - half, y - 1.5 * unit, x + half, y - 1.5 * unit], [x - half, y + 1.5 * unit, x + half, y + 1.5 * unit]]
                });
        }
        return marks;
};

/**
 * Node whose note mark is under a point (the mark is drawn over the node, so it
 * wins over it), or null: the notes open their panel on that node.
 * @param {number} x data-space x
 * @param {number} y data-space y
 * @returns {Object|null} The node
 */
D3MSTreeCanvasRenderer.prototype.pickNoteMark = function (x, y) {
        var marks = this._noteMarks(this.tree.scale);
        for (var i = marks.length - 1; i >= 0; i--) {
                var mk = marks[i];
                var reach = mk.r + mk.ring;
                var dx = x - mk.x;
                var dy = y - mk.y;
                if (dx * dx + dy * dy <= reach * reach) {
                        return mk.node;
                }
        }
        return null;
};

/**
 * Draw the marks of the nodes with notes, over nodes and labels.
 */
D3MSTreeCanvasRenderer.prototype._drawNoteMarks = function () {
        var marks = this._noteMarks(this.tree.scale);
        var ctx = this.ctx;
        var palette = this._palette();
        for (var i = 0; i < marks.length; i++) {
                var mk = marks[i];
                ctx.beginPath();
                ctx.arc(mk.x, mk.y, mk.r, 0, 2 * Math.PI);
                ctx.fillStyle = palette.ink;
                ctx.fill();
                ctx.lineWidth = mk.ring;
                ctx.strokeStyle = palette.paper;
                ctx.stroke();
                ctx.beginPath();
                for (var l = 0; l < mk.lines.length; l++) {
                        ctx.moveTo(mk.lines[l][0], mk.lines[l][1]);
                        ctx.lineTo(mk.lines[l][2], mk.lines[l][3]);
                }
                ctx.stroke();
        }
};

/*
*
* A change of light or dark mode (js/theme.js): the dark palette is read again
* from the theme and the tree on screen is redrawn
*
*/
document.addEventListener('spread-theme-change', function () {
        D3MSTreeCanvasRenderer.palettes.dark = null;
        if (typeof gtiz_tree !== 'undefined' && gtiz_tree.tree && gtiz_tree.tree.renderer) {
                gtiz_tree.tree.renderer.requestRedraw();
        }
});
