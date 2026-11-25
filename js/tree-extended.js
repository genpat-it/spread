// Canvas migration: selection state is now read straight from the model. The
// previous implementation found the node datum through its SVG element
// (node_elements.nodes()[..].__data__); with no per-node SVG elements we set
// node.selected directly on the force node. node_map maps every id (including
// grouped sample ids) to its force node, so the lookup stays O(1).
let setNodeSelectedState = (tree, id, state) => {
  let node = tree.node_map[id];
  if (node) {
    node.selected = state;
  }
}

toggleSelection = (tree, ids, state) => {
  if (Array.isArray(ids)) {
    for (var id of ids) {
      setNodeSelectedState(tree, id, state);
    }
  } else {
    setNodeSelectedState(tree, ids, state);
  }
  let action = state ? 'add' : 'clear';
  // tree.clearSelection(true);
  tree._updateSelectionStatus(action, true);
}

D3MSTree.prototype.selectNodesByIds = function(ids) {
  toggleSelection(this, ids, true);
}

D3MSTree.prototype.unselectNodesByIds = function(ids) {
  toggleSelection(this, ids, false);
}

/**
 * Replace the current selection with the nodes of the given ids.
 *
 * Unlike selectNodesByIds, which adds to the selection, the previous selection is
 * dropped. Halos and selection listeners are updated once (refreshSelectionHalos),
 * instead of a round for the clearing and one for the new selection.
 *
 * @param {Array} ids Sample ids (grouped samples are found through node_map)
 * @returns {undefined}
 */
D3MSTree.prototype.replaceSelectionByIds = function(ids) {
  this.force_nodes.forEach(node => {
    node.selected = false;
  });
  (Array.isArray(ids) ? ids : [ids]).forEach(id => {
    setNodeSelectedState(this, id, true);
  });
  this.refreshSelectionHalos();
}

/**
 * Zoom and pan the tree, with an animation, to the nodes of the given ids.
 *
 * On large trees the selected nodes of a cluster can be a few pixels wide: the
 * view moves so that they take about 60% of it, with the rest of the tree around
 * them, and never magnifies a node beyond `max_radius` pixels. The view then
 * counts as moved by the user, so layout changes do not center the tree again.
 * With "reduce motion" set in the system the view changes at once.
 *
 * @param {Array} ids Sample ids (grouped samples are found through node_map)
 * @param {Object} options Optional `duration` in ms (750) and `max_radius` in px (30)
 * @returns {Boolean} true when at least one node was found
 */
D3MSTree.prototype.zoomToNodes = function(ids, options) {
  let opts = options ? options : {};
  let duration = opts.duration !== undefined ? opts.duration : 750;
  let max_radius = opts.max_radius ? opts.max_radius : 30;
  let nodes = new Set();
  (Array.isArray(ids) ? ids : [ids]).forEach(id => {
    if (this.node_map[id]) {
      nodes.add(this.node_map[id]);
    }
  });
  if (nodes.size === 0 || !this.width || !this.height) {
    return false;
  }
  // bounding box in tree units, node bodies and halos included
  let min_x = Infinity, min_y = Infinity, max_x = -Infinity, max_y = -Infinity, max_r = 0;
  nodes.forEach(node => {
    let r = (this.node_radii[node.id] || 3) + 5;
    min_x = Math.min(min_x, node.x - r);
    max_x = Math.max(max_x, node.x + r);
    min_y = Math.min(min_y, node.y - r);
    max_y = Math.max(max_y, node.y + r);
    max_r = Math.max(max_r, r);
  });
  let fit = Math.min(this.width / (max_x - min_x), this.height / (max_y - min_y));
  let scale = Math.min(fit * 0.6, max_radius / max_r);
  let center_x = (min_x + max_x) / 2;
  let center_y = (min_y + max_y) / 2;
  let transform = d3.zoomIdentity
    .translate(this.width / 2 - center_x * scale, this.height / 2 - center_y * scale)
    .scale(scale);
  let reduce_motion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce_motion || duration === 0) {
    this.background_rect.call(this.zoom.transform, transform);
  } else {
    this.background_rect.transition().duration(duration).call(this.zoom.transform, transform);
  }
  this.user_moved = true;
  return true;
}

/**
 * Recompute the selection halos from the current node.selected flags in a single
 * O(N) pass (adds the red halo to selected nodes, removes it from the others),
 * then redraws once and notifies the selection listeners once.
 *
 * This is for batched callers (e.g. the video slider) that set many node.selected
 * flags directly and want to apply the visual update only once, instead of paying
 * a full halo scan + redraw + listener round per changed group.
 */
D3MSTree.prototype.refreshSelectionHalos = function() {
  var nodes = this.force_nodes;
  for (var i = 0; i < nodes.length; i++) {
    var d = nodes[i];
    if (d.selected) {
      d.halo_thickness = 5;
      d.halo_colour = 'red';
    } else {
      delete d.halo_thickness;
      delete d.halo_colour;
    }
  }
  if (this.renderer) {
    this.renderer.requestRedraw();
  }
  for (var j in this.nodesSelectedListeners) {
    this.nodesSelectedListeners[j](this);
  }
}