/*
*
* Node styles: contents of the "Node shape" Settings card. Two sections,
* shapes and borders, in a box of limited height with the Scrolly scrollbar of the
* legend: a click on a cell applies the value to the selected nodes, the round
* button of a cell selects the nodes that have that value. The last action resets
* every node, after a confirmation. Like the other Settings cards, the card can be
* dragged out of the Settings column.
*
*/
let gtiz_node_styles = {};

gtiz_node_styles.svg_ns = 'http://www.w3.org/2000/svg';
// tooth height of the decorative borders in the drawings (thumbnail units)
gtiz_node_styles.segment_teeth = {
  crown : 6.5,
  wavy : 6.5,
  spikes : 5.5,
  gear : 4.5,
  gear_round : 4.5
};

/**
 * Values, localization prefix and title of a kind of style.
 *
 * @param {String} kind 'shapes' or 'borders'
 * @returns {Object} {values, prefix, title}
 */
gtiz_node_styles.getKind = function(kind) {
  if (kind == 'shapes') {
    return {
      values : D3MSTreeNodeStyles.shapes,
      prefix : 'shape_',
      title : gtiz_locales.current.node_shapes
    };
  }
  return {
    values : D3MSTreeNodeStyles.borders,
    prefix : 'border_',
    title : gtiz_locales.current.node_borders
  };
}

/**
 * Contents of the Settings card: hint (shown only after a click on a cell with no
 * node selected), the shapes and the borders sections, the reset action. Called by
 * gtiz_settings.buildForm.
 *
 * @returns {Element} Contents
 */
gtiz_node_styles.buildContents = function() {
  let contents = document.createElement('div');
  contents.setAttribute('class', 'node-styles');
  let hint = document.createElement('p');
  hint.setAttribute('class', 'node-styles-hint');
  // info icon before the text, so the hint does not look like a section label
  let hint_icon = document.createElement('i');
  hint_icon.setAttribute('class', 'tabler tabler-info-circle');
  hint.append(hint_icon, document.createTextNode(' ' + gtiz_locales.current.select_nodes_in_tree));
  contents.append(hint);
  // sections in a box of limited height (css), scrolled with Scrolly when longer
  let scroll_box = document.createElement('div');
  scroll_box.setAttribute('class', 'node-styles-scroll');
  let scroll_contents = document.createElement('div');
  scroll_contents.setAttribute('class', 'node-styles-scroll-contents');
  ['shapes', 'borders'].forEach(kind => {
    scroll_contents.append(gtiz_node_styles.buildSection(kind));
  });
  scroll_box.append(scroll_contents);
  contents.append(scroll_box);
  // the square cells follow the card width: update the scrollbar when the box changes size
  if (window.ResizeObserver) {
    new ResizeObserver(() => gtiz_node_styles.updateScroll()).observe(scroll_box);
  }
  // reset of every node, as the other actions of the cards
  let box = document.createElement('div');
  box.setAttribute('class', 'button-box node-styles-reset not-draggable');
  let reset = document.createElement('a');
  reset.setAttribute('class', 'card-action not-draggable');
  let icon = document.createElement('i');
  icon.setAttribute('class', 'tabler tabler-restore not-draggable');
  reset.append(icon, document.createTextNode(' ' + gtiz_locales.current.reset_nodes_style));
  reset.addEventListener('click', () => {
    gtiz_tree.confirmResetNodesStyle();
  });
  box.append(reset);
  contents.append(box);
  // the card may be built after the tree: show the current selection at once
  setTimeout(() => {
    gtiz_node_styles.refresh();
    gtiz_node_styles.updateScroll();
  }, 0);
  return contents;
}

/**
 * Create, update or remove the scrollbar of the sections, with the Scrolly
 * instance of the legend (same look and behaviour).
 *
 * @returns {undefined}
 */
gtiz_node_styles.updateScroll = function() {
  let node = document.querySelector('.node-styles-scroll-contents');
  if (node && node.offsetParent) {
    gtiz_layout.scrolly.updateNode(node);
  }
}

/**
 * Section of a kind of style: title and grid of cells (drawing, name, select button).
 *
 * @param {String} kind 'shapes' or 'borders'
 * @returns {Element} Section
 */
gtiz_node_styles.buildSection = function(kind) {
  let cfg = gtiz_node_styles.getKind(kind);
  let section = document.createElement('div');
  section.setAttribute('class', 'node-styles-section');
  section.setAttribute('data-kind', kind);
  let title = document.createElement('div');
  title.setAttribute('class', 'form-label');
  title.textContent = cfg.title;
  section.append(title);
  let grid = document.createElement('div');
  grid.setAttribute('class', 'node-styles-grid');
  cfg.values.forEach(value => {
    // not-draggable: a click on a cell must not start dragging the card
    let cell = document.createElement('div');
    cell.setAttribute('class', 'node-styles-cell not-draggable');
    cell.setAttribute('data-kind', kind);
    cell.setAttribute('data-value', value);
    let label = document.createElement('span');
    label.setAttribute('class', 'not-draggable');
    label.textContent = gtiz_locales.current[cfg.prefix + value];
    let select = document.createElement('a');
    select.setAttribute('class', 'node-styles-select not-draggable');
    select.setAttribute('title', gtiz_locales.current.select_nodes_with_style);
    select.setAttribute('aria-label', gtiz_locales.current.select_nodes_with_style);
    // select all, or deselect when all are selected (see refresh)
    let icon = document.createElement('i');
    icon.setAttribute('class', 'tabler tabler-select-all not-draggable');
    select.append(icon);
    select.addEventListener('click', (e) => {
      // selecting does not apply the style of the cell
      e.stopPropagation();
      gtiz_node_styles.selectByStyle(kind, value, true);
    });
    cell.append(gtiz_node_styles.buildThumbnail(kind, value), label, select);
    cell.addEventListener('click', () => {
      // with no node selected the hint explains what to do
      if (!gtiz_tree.tree || gtiz_tree.tree.getSelectedNodeIDs().length == 0) {
        gtiz_node_styles.showHint();
        return;
      }
      // through the item of the macros, so a recording notes it
      gtiz_node_styles.runItem(kind == 'shapes' ? 'node-shape-geometry' : 'node-shape-border', value);
    });
    grid.append(cell);
  });
  section.append(grid);
  return section;
}

/**
 * Show the hint asking to select some nodes; it goes away when nodes are selected.
 *
 * @returns {undefined}
 */
gtiz_node_styles.showHint = function() {
  let contents = document.querySelector('.node-styles');
  if (contents) {
    contents.classList.add('node-styles-show-hint');
  }
}

/**
 * Lines of the drawing of a border: a short segment with the border pattern.
 *
 * @param {String} border Border name
 * @returns {Array} Lines {points, cls}
 */
gtiz_node_styles.getBorderLines = function(border) {
  let base = [[-10, 0], [10, 0]];
  let lines = [];
  if (border == 'double') {
    lines.push({ points : base }, { points : [[-10, -3], [10, -3]] });
  } else if (border == 'dashed') {
    lines.push({ points : base, cls : 'thumbnail-dashed' });
  } else if (border == 'dotted') {
    lines.push({ points : base, cls : 'thumbnail-dotted' });
  } else {
    lines.push({ points : base });
  }
  if (D3MSTreeNodeStyles.decorations[border]) {
    let h = gtiz_node_styles.segment_teeth[border];
    // decorations are filled, as in the tree
    lines.push({ points : D3MSTreeNodeStyles.segmentPoints(border, -10, 10, 0, h), cls : 'thumbnail-fill' });
  }
  return lines;
}

/**
 * Drawing of a shape or a border (outline, shapes and decorations with a light fill),
 * centred on its own extent.
 *
 * @param {String} kind 'shapes' or 'borders'
 * @param {String} value Shape or border name
 * @returns {Element} SVG element
 */
gtiz_node_styles.buildThumbnail = function(kind, value) {
  let ns = gtiz_node_styles.svg_ns;
  let num = (n) => Math.round(n * 100) / 100;
  let svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'node-styles-thumbnail');
  svg.setAttribute('viewBox', '-12 -12 24 24');
  let group = document.createElementNS(ns, 'g');
  let min_x = Infinity, min_y = Infinity, max_x = -Infinity, max_y = -Infinity;
  // extent of the drawing, to centre it in the box
  let extend = (points) => {
    points.forEach(p => {
      min_x = Math.min(min_x, p[0]);
      max_x = Math.max(max_x, p[0]);
      min_y = Math.min(min_y, p[1]);
      max_y = Math.max(max_y, p[1]);
    });
  };
  if (kind == 'shapes') {
    let outline = D3MSTreeNodeStyles.shapeOutline(value, 0, 0, 7.5, 0);
    if (outline.type == 'circle') {
      extend([[-outline.r, -outline.r], [outline.r, outline.r]]);
    } else {
      extend(outline.points);
    }
    let path = document.createElementNS(ns, 'path');
    path.setAttribute('d', D3MSTreeNodeStyles.svgPath(outline, num));
    // shapes are filled, as the nodes in the tree
    path.setAttribute('class', 'thumbnail-fill');
    group.append(path);
  } else {
    gtiz_node_styles.getBorderLines(value).forEach(line => {
      extend(line.points);
      let path = document.createElementNS(ns, 'path');
      let d = line.points.map((p, i) => (i == 0 ? 'M' : 'L') + num(p[0]) + ',' + num(p[1])).join(' ');
      path.setAttribute('d', d);
      if (line.cls) {
        path.setAttribute('class', line.cls);
      }
      group.append(path);
    });
  }
  group.setAttribute('transform', 'translate(' + num(-(min_x + max_x) / 2) + ',' + num(-(min_y + max_y) / 2) + ')');
  svg.append(group);
  return svg;
}

/**
 * Nodes drawn in the tree (hidden hypothetical nodes and empty nodes excluded).
 *
 * @returns {Array} Force nodes
 */
gtiz_node_styles.getDrawnNodes = function() {
  let tree = gtiz_tree.tree;
  if (!tree || !tree.force_nodes) {
    return [];
  }
  return tree.force_nodes.filter(node => {
    if (node.hypothetical && !tree.show_hypothetical_nodes) {
      return false;
    }
    return tree.node_radii[node.id] > 0;
  });
}

/**
 * Value of a kind of style of a node.
 *
 * @param {Object} node Force node
 * @param {String} kind 'shapes' or 'borders'
 * @returns {String} Shape or border name
 */
gtiz_node_styles.getValue = function(node, kind) {
  let tree = gtiz_tree.tree;
  return kind == 'shapes' ? tree.getNodeShape(node) : tree.getNodeBorder(node);
}

/**
 * Select the nodes that have a shape or a border, replacing the selection; when
 * they are all selected already, deselect them and keep the other selected nodes.
 *
 * @param {String} kind 'shapes' or 'borders'
 * @param {String} value Shape or border name
 * @returns {Number} Number of nodes with the value
 */
gtiz_node_styles.selectByStyle = function(kind, value, from_card) {
  let nodes = gtiz_node_styles.getDrawnNodes().filter(node => gtiz_node_styles.getValue(node, kind) == value);
  let ids = nodes.map(node => node.id);
  if (ids.length == 0) {
    return 0;
  }
  if (nodes.every(node => node.selected)) {
    gtiz_tree.tree.unselectNodesByIds(ids);
  } else if (from_card) {
    // through the item of the macros, so a recording notes it (a deselection
    // has no step: it depends on the selection of the moment)
    gtiz_node_styles.runItem('node-shape-select', value);
  } else {
    gtiz_tree.tree.replaceSelectionByIds(ids);
  }
  return ids.length;
}

/**
 * Run an operation of the card through its item in `macro_items`, the one the
 * macros wrap: a click on the grid is then recorded like a menu option.
 *
 * @param {String} id Item id
 * @param {String} value Shape or border name, when the item takes one
 * @returns {undefined}
 */
gtiz_node_styles.runItem = function(id, value) {
  let item = gtiz_node_styles.macro_items.find(candidate => candidate.id == id);
  if (value === undefined) {
    item.function();
  } else {
    item.function(value);
  }
}

/**
 * Select the nodes that have a shape or a border, replacing the selection (no
 * toggle, unlike the button of the card: a macro step always selects).
 *
 * @param {String} value Shape or border name
 * @returns {Number} Number of nodes selected
 */
gtiz_node_styles.selectNodesWithStyle = function(value) {
  let kind = D3MSTreeNodeStyles.shapes.includes(value) ? 'shapes' : 'borders';
  let ids = gtiz_node_styles.getDrawnNodes().filter(node => gtiz_node_styles.getValue(node, kind) == value).map(node => node.id);
  if (ids.length > 0) {
    gtiz_tree.tree.replaceSelectionByIds(ids);
  }
  return ids.length;
}

/*
*
* Operations of the card as menu-like items, for the macros (js/macros.js): the
* card is a grid, not a menu, so its cells cannot be named by a menu item. Shape
* and border apply to the nodes selected when the step runs.
*
*/

/**
 * Options of a kind of style, with the localized names.
 *
 * @param {String} kind 'shapes' or 'borders'
 * @returns {Array} Options {value, label}
 */
gtiz_node_styles.styleOptions = function(kind) {
  let prefix = kind == 'shapes' ? 'shape_' : 'border_';
  return D3MSTreeNodeStyles[kind].map(value => {
    return { value : value, label : gtiz_locales.current[prefix + value] };
  });
}

gtiz_node_styles.macro_items = [{
  type : 'select',
  id : 'node-shape-geometry',
  // undo: the shapes and borders before the change (js/history.js)
  undo : 'styles',
  requires_selection : true,
  label : () => {
    return gtiz_locales.current.node_shapes;
  },
  options : () => {
    return gtiz_node_styles.styleOptions('shapes');
  },
  function : (value) => {
    gtiz_tree.setSelectedNodesStyle('shapes', value);
  }
}, {
  type : 'select',
  id : 'node-shape-border',
  // undo: the shapes and borders before the change (js/history.js)
  undo : 'styles',
  requires_selection : true,
  label : () => {
    return gtiz_locales.current.node_borders;
  },
  options : () => {
    return gtiz_node_styles.styleOptions('borders');
  },
  function : (value) => {
    gtiz_tree.setSelectedNodesStyle('borders', value);
  }
}, {
  type : 'select',
  id : 'node-shape-select',
  // not in the undo history: it selects nodes (js/history.js)
  undo : false,
  label : () => {
    return gtiz_locales.current.select_nodes_with_style;
  },
  options : () => {
    return [...gtiz_node_styles.styleOptions('shapes'), ...gtiz_node_styles.styleOptions('borders')];
  },
  function : (value) => {
    gtiz_node_styles.selectNodesWithStyle(value);
  }
}, {
  type : 'abutton',
  id : 'node-shape-reset',
  // undo: the shapes and borders before the reset (js/history.js)
  undo : 'styles',
  label : () => {
    return gtiz_locales.current.reset_nodes_style;
  },
  function : () => {
    gtiz_tree.resetNodesStyle();
  }
}];

/**
 * Update the card to the tree: faded cells when no node is selected (the hint goes
 * away when some are), the value shared by all the selected nodes in blue, select
 * buttons disabled for the values no node has and turned into deselect buttons when
 * all the nodes with the value are selected, reset disabled with no style applied.
 *
 * @returns {undefined}
 */
gtiz_node_styles.refresh = function() {
  let contents = document.querySelector('.node-styles');
  if (!contents || !gtiz_tree.tree) {
    return;
  }
  let nodes = gtiz_node_styles.getDrawnNodes();
  ['shapes', 'borders'].forEach(kind => {
    let counts = {};
    let selected_counts = {};
    let shared;
    let selected = 0;
    nodes.forEach(node => {
      let value = gtiz_node_styles.getValue(node, kind);
      counts[value] = (counts[value] || 0) + 1;
      if (node.selected) {
        selected_counts[value] = (selected_counts[value] || 0) + 1;
        // undefined when the selected nodes have different values
        shared = selected == 0 || shared == value ? value : undefined;
        selected++;
      }
    });
    contents.classList.toggle('node-styles-empty', selected == 0);
    if (selected > 0) {
      contents.classList.remove('node-styles-show-hint');
    }
    contents.querySelectorAll('.node-styles-cell[data-kind="' + kind + '"]').forEach(cell => {
      let value = cell.getAttribute('data-value');
      cell.classList.toggle('active', selected > 0 && value == shared);
      let select = cell.querySelector('.node-styles-select');
      select.classList.toggle('disabled', !counts[value]);
      select.setAttribute('aria-disabled', counts[value] ? 'false' : 'true');
      // all the nodes with the value selected: the button deselects them
      let all = counts[value] > 0 && selected_counts[value] == counts[value];
      select.classList.toggle('active', all);
      select.querySelector('i').setAttribute('class', 'tabler ' + (all ? 'tabler-deselect' : 'tabler-select-all') + ' not-draggable');
      let tip = all ? gtiz_locales.current.deselect_nodes_with_style : gtiz_locales.current.select_nodes_with_style;
      select.setAttribute('title', tip);
      select.setAttribute('aria-label', tip);
    });
  });
  let styles = gtiz_tree.tree.node_styles;
  let applied = Object.keys(styles.shapes).length + Object.keys(styles.borders).length > 0;
  let reset = contents.querySelector('.node-styles-reset');
  if (reset) {
    reset.classList.toggle('disabled', !applied);
  }
}
