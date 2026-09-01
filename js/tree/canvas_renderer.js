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

        this._drawLinks();
        this._drawNodes();
        this._drawNodeLabels();
};

D3MSTreeCanvasRenderer.prototype._drawLinks = function () {
        var tree = this.tree;
        var ctx = this.ctx;
        var links = tree.force_links;
        var show_labels = tree.show_link_labels;
        // Legend visual-selection (highlight mode, also driven by the video).
        var hl = tree._highlight;
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
                                ctx.strokeStyle = 'black';
                                ctx.setLineDash([]);
                        } else {
                                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                                ctx.setLineDash([2, 2]);
                        }
                } else if (l.tracked) {
                        // Drag highlight of the moved subtree.
                        ctx.strokeStyle = '#A0A0A0';
                        ctx.setLineDash(dashed ? [3, 5] : []);
                } else {
                        ctx.strokeStyle = 'black';
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
                // White halo then grey fill, reproducing the two-layer SVG text.
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'white';
                ctx.strokeText(label, mx, my);
                ctx.fillStyle = 'gray';
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
                var stroke = n.tagged ? '#ff9900' : 'black';
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
        ctx.fillStyle = 'black';
        for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                if (n.hypothetical && !tree.show_hypothetical_nodes) {
                        continue;
                }
                ctx.fillText(this._nodeLabel(n, field), n.x, n.y);
        }
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
        var max_r = this._maxRadius();
        var candidate = this.node_quadtree.find(x, y, max_r + 4);
        if (!candidate) {
                return null;
        }
        if (candidate.hypothetical && !this.tree.show_hypothetical_nodes) {
                return null;
        }
        var r = this.tree.node_radii[candidate.id] || 3;
        var dx = candidate.x - x;
        var dy = candidate.y - y;
        return (dx * dx + dy * dy <= r * r) ? candidate : null;
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
        this._drawLinks();
        this._drawNodes();
        this._drawNodeLabels();
        this.ctx = saved_ctx;
        this._exporting = saved_exporting;
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
                var br = (tree.node_radii[bn.id] || 3) + (bn.halo_thickness || 0);
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
        out.push('<g class="nodes">');
        for (var n = 0; n < nodes.length; n++) {
                var nd = nodes[n];
                if (nd.hypothetical && !tree.show_hypothetical_nodes) { continue; }
                var r = tree.node_radii[nd.id];
                if (!r || r <= 0) { continue; }
                var pie = nd._pie;
                if (!pie || pie.length === 0) { continue; }
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

        return { content: out.join(''), minX: minX, minY: minY, maxX: maxX, maxY: maxY };
};
