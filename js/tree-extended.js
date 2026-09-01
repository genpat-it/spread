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