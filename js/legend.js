let gtiz_legend = {};

gtiz_legend.initialized = false;
gtiz_legend.selection_mode = 'qualitative'; // `qualitative` || `visual`
gtiz_legend.view_mode = 'list'; // `list` || `histogram`
/*
*
* Scale of the histogram bars: `log` keeps small groups apart (default), `linear`
* keeps the exact ratios between groups. The largest group takes
* `histogram_max_width`, a percentage of the legend row (the space on its left).
*
*/
gtiz_legend.histogram_scale = 'log';
gtiz_legend.histogram_max_width = 65;
gtiz_legend.group_order = {
  type : 'size',
  sort : 'desc'
};
gtiz_legend.selection_map = undefined;
/*
*
* Legend filtered by the selected nodes: only the values of their samples are
* listed, with `selected/total` counts. It follows the selection of tree and map
* and it is removed when the selection is empty. Rows select nodes as usual:
* the filter follows the new selection.
*
*/
gtiz_legend.selection_filter = false;

gtiz_legend.context_menu = [{
  type : 'toggle',
  id : 'legend-menu-selection-mode',
  // not in the undo history: it is about the selection (js/history.js)
  undo : false,
  options : [{
      label : () => {
        return gtiz_locales.current.related_nodes_selection;
      },
      value : 'qualitative',
      icon : 'tabler-affiliate'
    },
    {
      label : () => {
        return gtiz_locales.current.visual_selection;
      },
      value : 'visual',
      icon : 'tabler-brush'
  }],
  selected : () => {
    return  gtiz_legend.selection_mode;
  },
  function : (value) => {
    gtiz_legend.toggleSelectionMode(value);
  }
}, {
  type : 'separator'
}, {
  type : 'abutton',
  id : 'legend-menu-select-all',
  label : () => {
    return gtiz_locales.current.select_all_items;
  },
  icon : 'tabler-circle-check',
  function : () => {
    gtiz_legend.selectAll();
  }
}, {
  type : 'abutton',
  id : 'legend-menu-invert-selection',
  label : () => {
    return gtiz_locales.current.invert_selection;
  },
  icon : 'tabler-arrows-shuffle',
  function : () => {
    gtiz_legend.invertSelection();
  }
}, {
  type : 'abutton',
  id : 'legend-menu-clean-selection',
  label : () => {
    return gtiz_locales.current.clean_selection;
  },
  icon : 'tabler-circle-minus',
  function : () => {
    gtiz_legend.unselectAll();
  }
}, {
  type : 'abutton',
  id : 'legend-menu-filter-by-selection',
  requires_selection : true,
  label : () => {
    return gtiz_locales.current.filter_legend_by_selection;
  },
  icon : 'tabler-filter',
  // disabled while no node is selected (requires_selection, see js/context.js)
  function : () => {
    gtiz_legend.filterBySelection();
  }
}, {
  type : 'separator'
}, {
  type : 'select',
  id : 'legend-menu-color-by',
  label : () => {
    return gtiz_locales.current.color_by;
  },
  icon : '',
  options : () => {
    let values = gtiz_legend.getColorByOptions();
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_legend.getColorByDefaultValue();
    return value;
  },
  function : (value) => {
    gtiz_legend.changeCategoryColor(value);
  }
}, {
  type : 'number',
  id : 'legend-menu-maximum-group-number',
  label : () => {
    return gtiz_locales.current.maximum_group_number;
  },
  icon : '',
  min: 0,
  max: 100000, // value from original GrapeTree context.js
  default : undefined,
  get_default : () => {
    let value = gtiz_legend.getMaxGroupNumberValue();
    return value;
  },
  function : (value) => {
    let category = gtiz_tree.tree.display_category;
    gtiz_legend.changeMaxGroupNumber(value, category, true);
  }
}, {
  type : 'number',
  id : 'legend-menu-minimum-group-size',
  label : () => {
    return gtiz_locales.current.minimum_group_size;
  },
  icon : '',
  min: 0,
  max: 100000, // value from original GrapeTree context.js
  default : undefined,
  get_default : () => {
    let value = gtiz_legend.getMinGroupSizeValue();
    return value;
  },
  function : (value) => {
    let category = gtiz_tree.tree.display_category;
    gtiz_legend.changeMinGroupSize(value, category, true);
  }
}, {
  type : 'separator'
}, {
  type : 'select',
  id : 'legend-menu-data-category',
  label : () => {
    return gtiz_locales.current.data_category;
  },
  icon : '',
  options : [{
    label : () => {
      return gtiz_locales.current.character;
    },
    value : 'character'
  }, {
    label : () => {
      return gtiz_locales.current.numeric;
    },
    value : 'numeric'
  }],
  default : undefined,
  get_default : () => {
    let value = gtiz_legend.getDataCategory();
    return value;
  },
  function : (value) => {
    let category = gtiz_tree.tree.display_category;
    gtiz_legend.changeDataCategory(value, category, true);
  }
}, {
  type : 'select',
  id : 'legend-menu-group-order',
  label : () => {
    return gtiz_locales.current.group_order;
  },
  icon : '',
  options : [{
    label : () => {
      return gtiz_locales.current.size_desc;
    },
    value : 'size-desc'
  }, {
    label : () => {
      return gtiz_locales.current.size_asc;
    },
    value : 'size-asc'
  }, {
    label : () => {
      return gtiz_locales.current.label_asc;
    },
    value : 'alphabetic-asc'
  }, {
    label : () => {
      return gtiz_locales.current.label_desc;
    },
    value : 'alphabetic-desc'
  }],
  default : undefined,
  get_default : () => {
    let value = gtiz_legend.getGroupOrder();
    return value;
  },
  function : (value) => {
    let category = gtiz_tree.tree.display_category;
    gtiz_legend.changeGroupOrder(value, category, true);
  }
}, {
  type : 'select',
  id : 'legend-menu-color-scheme',
  label : () => {
    return gtiz_locales.current.color_scheme;
  },
  icon : '',
  options : [{
    label : () => {
      return gtiz_locales.current.category;
    },
    value : 'category'
  }, {
    label : () => {
      return gtiz_locales.current.category_soft;
    },
    value : 'category_soft'
  }, {
    label : () => {
      return gtiz_locales.current.category_grapetree;
    },
    value : 'category_grapetree'
  }, {
    label : () => {
      return gtiz_locales.current.category_hue_rotation;
    },
    value : 'category_hue_rotation'
  }, {
    label : () => {
      return gtiz_locales.current.gradient;
    },
    value : 'gradient'
  }, {
    label : () => {
      return gtiz_locales.current.gradient_cool;
    },
    value : 'gradient_cool'
  }, {
    label : () => {
      return gtiz_locales.current.gradient_rainbow;
    },
    value : 'gradient_rainbow'
  }, {
    label : () => {
      return gtiz_locales.current.gradient_rainbow2;
    },
    value : 'gradient_rainbow2'
  }, {
    label : () => {
      return gtiz_locales.current.gradient_rainbow3;
    },
    value : 'gradient_rainbow3'
  }, /* {
    label : gtiz_locales.current.custom,
    value : 'custom'
  } */],
  default : undefined,
  get_default : () => {
    let value = gtiz_legend.getColorScheme();
    return value;
  },
  function : (value) => {
    let category = gtiz_tree.tree.display_category;
    gtiz_legend.changeColorScheme(value, category, true);
  }
}, {
  type : 'abutton',
  id : 'legend-menu-quick-gradient',
  // undo: the colours of the groups before the gradient (js/history.js)
  undo : 'colours',
  label : () => {
    return gtiz_locales.current.quick_gradient;
  },
  icon : 'tabler-clock',
  function : () => {
    gtiz_legend.quickGradient();
  }
}, {
  type : 'separator'
}, {
  type : 'select',
  id : 'legend-menu-view-mode',
  // not in the undo history: view of the legend (js/history.js)
  undo : false,
  label : () => {
    return gtiz_locales.current.legend_view;
  },
  icon : '',
  options : [{
    label : () => {
      return gtiz_locales.current.list_view;
    },
    value : 'list'
  }, {
    label : () => {
      return gtiz_locales.current.histogram_view;
    },
    value : 'histogram'
  }],
  default : undefined,
  get_default : () => {
    return gtiz_legend.view_mode;
  },
  function : (value) => {
    gtiz_legend.toggleViewMode(value);
  }
}, {
  type : 'toggle',
  id : 'legend-menu-histogram-scale',
  // not in the undo history: view of the legend (js/history.js)
  undo : false,
  // on/off switch with a fixed label, like the branch log scale in the settings
  options : [{
      label : () => {
        return gtiz_locales.current.histogram_log_scale;
      },
      value : 'log',
      icon : 'tabler-circle-check'
    },
    {
      label : () => {
        return gtiz_locales.current.histogram_log_scale;
      },
      value : 'linear',
      icon : 'tabler-ban'
  }],
  // the scale has no effect on the list view: built hidden, toggleViewMode() shows it
  hidden : () => {
    return gtiz_legend.view_mode !== 'histogram';
  },
  selected : () => {
    return  gtiz_legend.histogram_scale;
  },
  function : (value) => {
    gtiz_legend.toggleHistogramScale(value);
  }
}, {
  type : 'toggle',
  id : 'legend-menu-player',
  // not in the undo history: video player (js/history.js)
  undo : false,
  // on/off switch of the video player at the bottom of the legend card: the
  // round trigger in the card header uses it, it is never shown in the menu but
  // macros and the assistant reach the player through it
  hidden : () => {
    return true;
  },
  options : [{
      label : () => {
        return gtiz_locales.current.video;
      },
      value : 'on',
      icon : 'tabler-circle-check'
    },
    {
      label : () => {
        return gtiz_locales.current.video;
      },
      value : 'off',
      icon : 'tabler-ban'
  }],
  selected : () => {
    return  gtiz_layout.video;
  },
  function : (value) => {
    gtiz_layout.setVideo(value);
  }
}, {
  type : 'separator',
  hide_in_read_only: true
}, {
  type: 'abutton_optioned',
  id : 'legend-menu-download',
  hide_in_read_only: true,
  label: () => {
    return gtiz_locales.current.download_legend;
  },
  icon : 'tabler-photo',
  options: [{
    label: '.png',
    value: 'png'
  }, {
    label: '.svg',
    value: 'svg'
  }],
  selected: () => {
    return 'png';
  },
  function: (e) => {
    let box = e.currentTarget.closest('.button-box-optioned');
    let format = box && box.querySelector('select') ? box.querySelector('select').value : 'png';
    gtiz_legend.downloadLegend(format);
  }
}];

/**
 * Native color picker used to recolour legend categories.
 * Replaces the former jQuery Spectrum plugin with a vanilla
 * `<input type="color">`. It is kept off-screen and triggered
 * programmatically (see `legendItemCircleClicked` in tree.js).
 *
 */
gtiz_legend.legend_colour_chooser = document.createElement('input');
gtiz_legend.legend_colour_chooser.type = 'color';
gtiz_legend.legend_colour_chooser.setAttribute('aria-hidden', 'true');
gtiz_legend.legend_colour_chooser.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;padding:0;border:0;opacity:0;pointer-events:none;';
document.body.appendChild(gtiz_legend.legend_colour_chooser);
gtiz_legend.legend_colour_chooser.addEventListener('change', function(e) {
  var category = this.dataset.category;
  var value = this.dataset.value;
  gtiz_tree.tree.setColour(category, value, this.value);
  gtiz_tree.tree.changeCategory(category);
  if (gtiz_legend.selection_mode == 'visual') {
    gtiz_legend.resetVisualSelection();
    gtiz_legend.highlightSelection();
  } else {
    gtiz_legend.resetQualitativeSelection();
  }
});

/**
 * Change appaerance and class for the selcted legend item
 * 
 * @param {Node} item DOM node for the legend item
 */
gtiz_legend.toggleItemSelection = function(obj, tree) {
  let selection_mode = gtiz_legend.selection_mode;
  let item = obj.current_target;
  let check = item.querySelector('.list-check');
  let icon = check.querySelector('i');
  item.classList.toggle('selected');
  if (item.classList.contains('selected')) {
    icon.setAttribute('class', 'tabler tabler-circle-check');
  } else {
    icon.setAttribute('class', 'tabler tabler-circle');
  }
  if (selection_mode == 'qualitative') {
    gtiz_legend.nodeSelection(obj, tree);
  } else {
    gtiz_legend.highlightSelection();
  }
};

/**
 * Update only the visual (DOM) selected-state of a legend item, without running
 * the expensive node/highlight recompute. Used by the video player so it can
 * flip many items and then apply the highlight once (see gtiz_video).
 *
 * @param {Node} el The `.list-row` legend item
 * @param {Boolean} selected Whether the item should be marked selected
 */
gtiz_legend.setItemSelectedDom = function(el, selected) {
  let check = el.querySelector('.list-check');
  let icon = check ? check.querySelector('i') : null;
  if (selected) {
    el.classList.add('selected');
    if (icon) { icon.setAttribute('class', 'tabler tabler-circle-check'); }
  } else {
    el.classList.remove('selected');
    if (icon) { icon.setAttribute('class', 'tabler tabler-circle'); }
  }
};

gtiz_legend.setContextMenuForm = function(tree) {
  gtiz_legend.context_menu.forEach(item => {
    if (item.id) {
      let id = '#' + item.id;
      let input = document.querySelector(id);
      if (input) {
        if (item.default) {
          let value = item.default;
          input.value = value;
        } else {
          if (typeof item.get_default === 'function') {
            let value = item.get_default();
            input.value = value;
          }
        }
      }
    } 
  });
}

/**
 * Change color by category
 * 
 * @param {String} value Category
 */
gtiz_legend.changeCategoryColor = function(value) {
  let tree = gtiz_tree.tree;
  let values = gtiz_legend.getColorByOptions();
  if (values.find(el => el.value == value)) {
    let color = value;
    tree.changeCategory(color);
    gtiz_legend.setContextMenuForm(tree);
    if (gtiz_legend.selection_mode == 'visual') {
      gtiz_legend.resetVisualSelection();
      gtiz_legend.highlightSelection();
    } else {
      gtiz_legend.resetQualitativeSelection();
    }
  } else {
    console.log('Category not found');
  }
}

/**
 * Get current active category to set color by form value in context menu
 * 
 * @returns category
 */
gtiz_legend.getColorByDefaultValue = function() {
  let tree = gtiz_tree.tree;
  let category = tree.display_category;
  return category;
}

/**
 * Retreive the metadata category list to populate relative legend context menu select input.
 * 
 * @returns colors An array of object with value and label of available catgories
 */
gtiz_legend.getColorByOptions = function() {
  let tree = gtiz_tree.tree;
  let colors = Object.keys(tree.metadata_info)
  .sort()
  .map(function(category) {
    let label = tree.metadata_info[category]['label'];
    label = label.toLowerCase();
    label = label.charAt(0).toUpperCase() + label.slice(1) // same formula used to render legend title
    let ar = {
      value : category,
      label : label
    }
    return ar;
  });
  return colors;
}

/**
 * Get the current number of categories (items) to see in legend
 * 
 * @returns Number
 */
gtiz_legend.getMaxGroupNumberValue = function() {
  let tree = gtiz_tree.tree;
  let category = tree.display_category;
  let info = tree.metadata_info[category];
  let value = info.category_num;
  
  return value;
}

/**
 * Change max number of groups (categories, items) in legend list (category_num)
 * 
 * @param {String} value Value from input
 * @param {String} cat Category to change
 * @param {Boolean} change If `true`, call `changeCategory`
 * 
 */
gtiz_legend.changeMaxGroupNumber = function(value, cat, change) {
  let tree = gtiz_tree.tree;
  let category = cat ? cat : tree.display_category;
  let number = parseInt(value);
	let category_info = tree.metadata_info[category];
  if (number !== category_info.category_num) {
		category_info.category_num = number;
    if(change) {
      tree.changeCategory(category);
    }
	}
}

/**
 * Get the current minimum number of items in group to see in legend (minnum)
 * 
 * @returns Number
 */
gtiz_legend.getMinGroupSizeValue = function() {
  let tree = gtiz_tree.tree;
  let category = tree.display_category;
  let info = tree.metadata_info[category];
  let value = info.minnum;

  return value;
}

/**
 * Change max number of groups (categories, items) in legend list
 * 
 * @param {String} value Value from input
 * @param {String} cat Category to change
 * @param {Boolean} change If `true`, call `changeCategory`
 * 
 */
gtiz_legend.changeMinGroupSize = function(value, cat, change) {
  let tree = gtiz_tree.tree;
  let category = cat ? cat : tree.display_category;
  let number = parseInt(value);
	let category_info = tree.metadata_info[category];
  if (number !== category_info.minnum) {
		category_info.minnum = number;
		if(change) {
      tree.changeCategory(category);
    }
	}
}

/**
 * Get the current data category (coltype)
 * 
 * @returns String
 */
gtiz_legend.getDataCategory = function() {
  let tree = gtiz_tree.tree;
  let category = tree.display_category;
  let info = tree.metadata_info[category];
  let value = info.coltype;
  
  return value;
}

/**
 * Change data category (coltype).
 * 
 * @param {String} value `'character'` || `'numeric'`
 * @param {String} cat Category to change
 * @param {Boolean} change If `true`, call `changeCategory`
 * 
 */
gtiz_legend.changeDataCategory = function(value, cat, change) {
  let tree = gtiz_tree.tree;
  let category = cat ? cat : tree.display_category;
  let category_info = tree.metadata_info[category];
  if (value !== category_info.coltype) {
    category_info.coltype = value;
    if(change) {
      tree.changeCategory(category);
    }
  }
}

/**
 * Get the current group order (grouptype).
 * 
 * @returns String
 */
gtiz_legend.getGroupOrder = function() {
  /* let tree = gtiz_tree.tree;
  let category = tree.display_category;
  let info = tree.metadata_info[category];
  let value = info.grouptype;
  if (value == 'size') {
    value = 'size-desc';
  } else {
    value = 'alphabetic-asc';
  } */
  let value = gtiz_legend.group_order.type + '-' + gtiz_legend.group_order.sort;

  return value;
}

/**
 * Change group order (grouptype). Natively grapetree allow to use only size descendant or alphabetic ascendant,  we extend this by using `-asc` and `-desc` and saving the choice in the gtiz_legend object in order to invert order in `base_tree.js`.
 * 
 * @param {String} value `'size-asc'` || `'size-desc'` || `'alphabetic-asc'` || `'alphabetic-desc'`
 * @param {String} cat Category to change
 * @param {Boolean} change If `true`, call `changeCategory`
 *  
 */
gtiz_legend.changeGroupOrder = function(value, cat, change) {
  let delimiter = '-';
  let index = value.indexOf(delimiter);
  let type = value.substring(0, index);
  let sort = value.substring(index + 1);
  let obj = {
    type : type,
    sort : sort
  }
  let tree = gtiz_tree.tree;
  let category = cat ? cat : tree.display_category;
  let category_info = tree.metadata_info[category];
  gtiz_legend.group_order = obj;
  category_info.grouptype = type;
  if(change) {
    tree.changeCategory(category);
  }
}

/**
 * Get the current color schema (colorscheme).
 * 
 * @returns String
 */
gtiz_legend.getColorScheme = function() {
  let tree = gtiz_tree.tree;
  let category = tree.display_category;
  let info = tree.metadata_info[category];
  let value = info.colorscheme;
  
  return value;
}

/**
 * Change color schema (colorscheme).
 * 
 * @param {String} value See context legend menu configuration for allowed values
 * @param {String} cat Category to change
 * @param {Boolean} change If `true`, call `changeCategory`
 * 
 */
gtiz_legend.changeColorScheme = function(value, cat, change) {
  let tree = gtiz_tree.tree;
  let category = cat ? cat : tree.display_category;
  let category_info = tree.metadata_info[category];
  if (value !== category_info.colorscheme) {
    category_info.colorscheme = value;
    if(change) {
      tree.changeCategory(category);
    }
  }
}

/**
 * Change legend view mode: list mode or histogram mode.
 * 
 * @param {String} value `list` or `histogram` 
 * 
 */
gtiz_legend.toggleViewMode = function(value) {
  let legend = document.querySelector('.card-legend');
  gtiz_legend.view_mode = value;
  if (gtiz_legend.view_mode == 'list') {
    legend.classList.remove('card-legend-histogram');
    legend.classList.add('card-legend-list');
  } else {
    legend.classList.remove('card-legend-list');
    legend.classList.add('card-legend-histogram');
  }
  // the context menu stays open: show or hide the histogram scale switch right away
  let scale_switch = document.getElementById('legend-menu-histogram-scale');
  if (scale_switch) {
    scale_switch.closest('.tools').classList.toggle('hidden', gtiz_legend.view_mode !== 'histogram');
    // the menu height changed: fit the scrollbar to it
    let contents = scale_switch.closest('.card-form-contents');
    if (contents) {
      gtiz_context.scrolly.updateNode(contents);
    }
  }
}

/**
 * Get the length of a histogram bar as a fraction of the largest group
 *
 * @param {Number} samples Samples of the group
 * @param {Number} max Samples of the largest group, "Others" excluded
 * @returns {Number} Fraction of the maximum length, above 1 for an "Others" larger than every group
 */
gtiz_legend.getHistogramRatio = function(samples, max) {
  if (!max) {
    return 1;
  }
  if (gtiz_legend.histogram_scale === 'log') {
    return Math.log(1 + samples) / Math.log(1 + max);
  }
  return samples / max;
}

/**
 * Set the width of the histogram bars of the legend
 *
 * Each bar holds its samples in `data-samples-izsam`. "Others" sums the groups
 * not listed, so it does not set the scale: when larger than the largest group
 * its bar is capped at the maximum width (its count is in the label). The minimum width
 * of the smallest groups is set in css.
 *
 * @param {DOM Node} container Node holding the legend rows, the legend card by default
 * @returns {undefined}
 */
gtiz_legend.updateHistogramBars = function(container) {
  let root = container ? container : document.querySelector('.card-legend');
  if (!root) {
    return;
  }
  let bars = Array.from(root.querySelectorAll('.card-legend-item-bar'));
  let groups = bars.filter(bar => !bar.hasAttribute('data-others-izsam')).map(bar => parseInt(bar.getAttribute('data-samples-izsam')));
  let max = groups.length > 0 ? Math.max(...groups) : 0;
  bars.forEach(bar => {
    let ratio = gtiz_legend.getHistogramRatio(parseInt(bar.getAttribute('data-samples-izsam')), max);
    // width depends on the data, so it is an inline style as it has always been
    bar.style.width = (Math.min(ratio, 1) * gtiz_legend.histogram_max_width) + '%';
  });
}

/**
 * Change the scale of the histogram bars
 *
 * @param {String} value `log` or `linear`
 * @returns {undefined}
 */
gtiz_legend.toggleHistogramScale = function(value) {
  gtiz_legend.histogram_scale = value;
  gtiz_legend.updateHistogramBars();
}

/**
 * Order alphabetically the legend and apply a gradient color scheme
 * 
 */
gtiz_legend.quickGradient = function() {
  let data_category = gtiz_legend.getDataCategory();
  let category = gtiz_tree.tree.display_category;
  let group_order_value = data_category == 'numeric' ? 'size-asc' : 'alphabetic-asc';
  let gradient = 'gradient_cool';
  let gradient_select = document.querySelector('#legend-menu-color-scheme');
  if (gradient_select) {
    gradient_select.value = 'gradient_cool';
  }
  let order_select = document.querySelector('#legend-menu-group-order');
  if (order_select) {
    order_select.value = group_order_value;
  }
  gtiz_legend.changeGroupOrder(group_order_value, category, false);
  gtiz_legend.changeColorScheme(gradient, category, false);
  gtiz_tree.tree.changeCategory(category);
}

/**
 * Node selection in qualitative mode
 * 
 * @param {Object} obj Object containing information about legend, category and item clicked
 * @param {Object} tree The tree object
 */
gtiz_legend.nodeSelection = function(obj, tree) {
  if (!tree) {
    tree = gtiz_tree.tree;
  }
  // Retrieve an array of all values in `tree.metadata`
  let metadata = Object.values(tree.metadata);
  let node_ids = {};
  if (obj) {
    let category = obj.category ? obj.category : tree.display_category;
    let item = obj.current_target;
    let group = obj.real ? obj.real : item.getAttribute('data-real-group-izsam');
    // Filter the metadata values based on the condition `d[category] === group`
    let filtered = metadata.filter(function(d) {
      return d[category] === group;
    });
    let codes = filtered.map(function(item) {
      return item.__Node;
    });
    if (item.classList.contains('selected')) {
      gtiz_tree.tree.selectNodesByIds(codes);
    } else {
      gtiz_tree.tree.unselectNodesByIds(codes);
    }
  } else {
    let category = tree.display_category;
    let items = document.querySelectorAll('.card-legend .list-row');
    items.forEach(item => {
      let group = item.getAttribute('data-real-group-izsam');
      // Filter the metadata values based on the condition `d[category] === group`
      let filtered = metadata.filter(function(d) {
        return d[category] === group;
      });
      // Iterate over the filtered metadata values and update `node_ids` object
      filtered.forEach(function(d) {
        node_ids[d.__Node] = item.classList.contains('selected');
      });
    });
    let unseleceted = Object.keys(node_ids).filter(function(d) {  return !node_ids[d]; });
    let selected = Object.keys(node_ids).filter(function(d) {  return node_ids[d]; });
    if (selected.length > 0) {
      gtiz_tree.tree.selectNodesByIds(selected);
    }
    if (unseleceted.length > 0) {
      gtiz_tree.tree.unselectNodesByIds(unseleceted);
    }
  }
}

/**
 * Node selection in visual mode
 * 
 * @param {Object} obj Object containing information about legend, category and item clicked
 * @param {Object} tree The tree object
 */
gtiz_legend.highlightSelection = function () {
  let groups = [];
  let colors = [];
  let values = [];
  let items = document.querySelectorAll('.card-legend .list-row');
  items.forEach(item => {
    if (item.classList.contains('selected')) {
      let color = item.getAttribute('data-group-colour-izsam');
      let value = item.getAttribute('data-real-group-izsam');
      let group = {
        value : value,
        color : color
      };
      groups.push(group);
      colors.push(color);
      values.push(value);
    }
  });
  // Canvas migration: the visual selection (highlight mode, also driven by the
  // video) no longer mutates per-node SVG <path> elements (they no longer
  // exist). Instead we set a highlight state on the tree model that the canvas
  // renderer reads: a map of selected group value -> colour, plus a per-node
  // "is any wedge selected" flag used to keep/fade the connecting links.
  gtiz_legend.applyVisualHighlight(groups);
  gtiz_map.alterMarkers(colors);
}

/**
 * Build the tree highlight state from the selected legend groups and request a
 * canvas redraw. A node is "visible" when at least one of its pie wedges belongs
 * to a selected group; the renderer draws only those wedges and keeps the links
 * between two visible nodes solid (others are faded).
 *
 * @param {Array} groups Selected groups as {value, color} objects
 */
/**
 * Build the index `group value -> [node refs whose pie has a wedge of that group]`
 * with a single pass over the nodes, and reset every node highlight counter. The
 * index lets applyVisualHighlight update only the nodes of the groups that
 * actually changed, instead of rescanning all nodes on every call (the cost that
 * made the video struggle with many legend items). Invalidated (set to null)
 * whenever the pie composition changes (changeCategory) or the visual selection
 * is reset, and rebuilt lazily on the next applyVisualHighlight.
 */
gtiz_legend.buildHighlightIndex = function () {
  let tree = gtiz_tree.tree;
  let index = {};
  if (tree) {
    let nodes = tree.force_nodes;
    for (let i = 0; i < nodes.length; i++) {
      let n = nodes[i];
      n._hl_count = 0;
      n._hl_visible = false;
      let pie = n._pie;
      if (pie) {
        let seen = null;
        for (let w = 0; w < pie.length; w++) {
          let type = pie[w].data.type;
          if (type === undefined || type === null) {
            continue;
          }
          // dedupe: a node must appear at most once per group, otherwise its
          // counter would drift when the group is toggled.
          if (seen === null) {
            seen = {};
          }
          if (seen[type]) {
            continue;
          }
          seen[type] = true;
          (index[type] || (index[type] = [])).push(n);
        }
      }
    }
    gtiz_legend._hl_index_category = tree.display_category;
    gtiz_legend._hl_index_count = nodes.length;
  }
  gtiz_legend._hl_group_nodes = index;
};

gtiz_legend.applyVisualHighlight = function (groups) {
  let tree = gtiz_tree.tree;
  if (!tree) {
    return;
  }
  // Visual selection is always active while in this mode: with no groups
  // selected the types map is empty, so every wedge is hidden (matching the old
  // SVG behaviour where switching to visual selection hid all nodes until the
  // user/video selected groups). The highlight is cleared (nodes shown again)
  // only by resetVisualSelection, e.g. when leaving visual selection mode.
  let nodes = tree.force_nodes;
  let category = tree.display_category;
  // (Re)build the group -> nodes index when missing or stale (fresh start,
  // category change or different node set). A rebuild zeroes every node counter,
  // so the previously applied set must be treated as empty in that case.
  let rebuilt = false;
  if (!gtiz_legend._hl_group_nodes ||
      gtiz_legend._hl_index_category !== category ||
      gtiz_legend._hl_index_count !== nodes.length) {
    gtiz_legend.buildHighlightIndex();
    rebuilt = true;
  }
  let index = gtiz_legend._hl_group_nodes;
  let prev = (rebuilt || !tree._highlight || !tree._highlight.types) ? {} : tree._highlight.types;
  let types = {};
  (groups || []).forEach(g => { types[g.value] = g.color; });
  // Incremental diff: only the nodes of the groups added/removed since the last
  // call change state, so we touch just those instead of every node per frame.
  for (let value in prev) {
    if (!(value in types)) {
      let arr = index[value];
      if (arr) {
        for (let k = 0; k < arr.length; k++) {
          let n = arr[k];
          n._hl_count = (n._hl_count || 0) - 1;
          if (n._hl_count <= 0) {
            n._hl_count = 0;
            n._hl_visible = false;
          }
        }
      }
    }
  }
  for (let value in types) {
    if (!(value in prev)) {
      let arr = index[value];
      if (arr) {
        for (let k = 0; k < arr.length; k++) {
          let n = arr[k];
          n._hl_count = (n._hl_count || 0) + 1;
          n._hl_visible = true;
        }
      }
    }
  }
  tree._highlight = { types: types };
  tree.requestRedraw();
}

/**
 * Select all legend items
 * 
 */
gtiz_legend.selectAll = function () {
  let selection_mode = gtiz_legend.selection_mode;
  let items = document.querySelectorAll('.card-legend .list-row');
  items.forEach(item => {
    item.classList.add('selected');
    let check = item.querySelector('.list-check');
    let icon = check.querySelector('i');
    icon.setAttribute('class', 'tabler tabler-circle-check');
  });
  if (selection_mode == 'qualitative') {
    gtiz_legend.nodeSelection();
  } else {
    gtiz_legend.highlightSelection();
  }
}

/**
 * Unselect all legend items
 * 
 */
gtiz_legend.unselectAll = function () {
  let selection_mode = gtiz_legend.selection_mode;
  let items = document.querySelectorAll('.card-legend .list-row');
  items.forEach(item => {
    item.classList.remove('selected');
    let check = item.querySelector('.list-check');
    let icon = check.querySelector('i');
    icon.setAttribute('class', 'tabler tabler-circle');
  });
  if (selection_mode == 'qualitative') {
    gtiz_legend.nodeSelection();
  } else {
    gtiz_legend.highlightSelection();
  }
}

/**
 * Invert selection of legend items
 * 
 */
gtiz_legend.invertSelection = function () {
  let selection_mode = gtiz_legend.selection_mode;
  let items = document.querySelectorAll('.card-legend .list-row');
  items.forEach(item => {
    let check = item.querySelector('.list-check');
    let icon = check.querySelector('i');
    if (item.classList.contains('selected')) {
      item.classList.remove('selected');
      icon.setAttribute('class', 'tabler tabler-circle');
    } else {
      item.classList.add('selected');
      icon.setAttribute('class', 'tabler tabler-circle-check');
    }
  });
  if (selection_mode == 'qualitative') {
    gtiz_legend.nodeSelection();
  } else {
    gtiz_legend.highlightSelection();
  }
}

/**
 * Set UI for selection mode toggle on init
 * @param {String} value `qualitative` || `visual`
 * 
 */
gtiz_legend.setVisualSelectionToggle = function (value) {
  let menu = gtiz_legend.context_menu.find(el => el.id == 'legend-menu-selection-mode');
  menu.selected = gtiz_legend.selection_mode;
}

/**
 * Reset selection when in `visual` selection mode
 * 
 */
gtiz_legend.resetVisualSelection = function () {
  let items = document.querySelectorAll('.card-legend .list-row');
  items.forEach(item => {
    item.classList.remove('selected');
    let check = item.querySelector('.list-check');
    let icon = check.querySelector('i');
    icon.setAttribute('class', 'tabler tabler-circle');
  });
  // Canvas migration: clearing the highlight state makes the renderer fall back
  // to the normal category colouring (matching the old reset, where unselected
  // nodes returned to their category colours and links to solid black).
  let tree = gtiz_tree.tree;
  if (tree) {
    tree._highlight = null;
    tree.requestRedraw();
  }
  // force the highlight index (and node counters) to be rebuilt on next use
  gtiz_legend._hl_group_nodes = null;
  gtiz_tree.filtered_nodes = [];
  gtiz_map.defineMarkers();
}

/**
 * Reset selection when in `qualitative` selection mode.
 *
 * While the legend is filtered by the selection only the rows are unmarked: the
 * selection that filters the legend stays (e.g. on a change of category).
 *
 */
gtiz_legend.resetQualitativeSelection = function() {
  let items = document.querySelectorAll('.card-legend .list-row');
  items.forEach(item => {
    item.classList.remove('selected');
    let check = item.querySelector('.list-check');
    let icon = check.querySelector('i');
    icon.setAttribute('class', 'tabler tabler-circle');
  });
  if (gtiz_legend.selection_filter) {
    return;
  }
  // gtiz_tree.tree.clearSelection();
  gtiz_tree.tree._updateSelectionStatus('clear');
}

/**
 * Toggle selection mode
 * 
 * @param {String} value `qualitative` || `visual`
 */
gtiz_legend.toggleSelectionMode = function(value) {
  if (gtiz_legend.selection_mode == 'visual') {
    gtiz_legend.resetVisualSelection();
  } else {
    gtiz_legend.resetQualitativeSelection();
  }
  gtiz_legend.selection_mode = value;
  let menu = gtiz_legend.context_menu.find(el => el.id == 'legend-menu-selection-mode');
  menu.selected = value;
  if (gtiz_legend.selection_mode == 'visual') {
    gtiz_legend.highlightSelection();
  }
}

/**
 * Set selection mode
 * 
 */
gtiz_legend.setSelection = function() {
  if (gtiz_legend.selection_map) {
    let selection_mode = gtiz_legend.selection_mode;
    let items = document.querySelectorAll('.card-legend .list-row');
    gtiz_legend.selection_map.forEach((selected, index) => {
      if (selected) {
        let item = items[index];
        item.classList.add('selected');
        let check = item.querySelector('.list-check');
        let icon = check.querySelector('i');
        icon.setAttribute('class', 'tabler tabler-circle-check');
      }
    });
    if (selection_mode == 'qualitative') {
      gtiz_legend.nodeSelection();
    } else {
      gtiz_legend.highlightSelection();
    }
  }
}

/**
 * Get selection map
 * 
 */
gtiz_legend.getSelectionMap = function() {
  let selection = [];
  let items = document.querySelectorAll('.card-legend .list-row');
  items.forEach(item => {
    if (item.classList.contains('selected')) {
      selection.push(true);
    } else {
      selection.push(false);
    }
  });
  return selection;
}

/**
 * Key of a metadata value as listed by the legend: numeric categories list
 * numbers (`05` and `5` are the same group), the others the text
 *
 * @param {String|Number} value Metadata value
 * @param {Boolean} numeric True when the category is not `character`
 * @returns {String} The key
 */
gtiz_legend.getValueKey = function(value, numeric) {
  if (numeric && isNumber(value)) {
    return String(parseFloat(value));
  }
  return String(value);
}

/**
 * Count the values of a category among the samples of some nodes
 *
 * @param {Object} tree The tree object
 * @param {Array} node_ids Ids of the nodes, every node of the tree when missing
 * @param {String} category Metadata column
 * @returns {Object} `{counts: {key: samples}, missing: samples without value, samples, nodes}`
 */
gtiz_legend.countValues = function(tree, node_ids, category) {
  let info = tree.metadata_info[category] || {};
  let numeric = info.coltype && info.coltype != 'character';
  let result = { counts : {}, missing : 0, samples : 0, nodes : 0 };
  let nodes = node_ids ? node_ids : tree.force_nodes.map(node => node.id);
  result.nodes = nodes.length;
  nodes.forEach(node_id => {
    tree._getIDsForNode(node_id).forEach(id => {
      let row = tree.metadata[id];
      // nodes without samples (e.g. hypothetical ones) have no metadata
      if (!row) {
        return;
      }
      result.samples++;
      let value = row[category];
      if (!(value || value === 0)) {
        result.missing++;
        return;
      }
      let key = gtiz_legend.getValueKey(value, numeric);
      result.counts[key] = (result.counts[key] || 0) + 1;
    });
  });
  return result;
}

/**
 * Rows of the legend filtered by the selected nodes, called by `updateLegend`
 * (base_tree.js) with the groups of the whole legend
 *
 * The values keep the colours and the order of the whole legend; the values
 * grouped in "Others" (or below the minimum group size) are listed one by one
 * with the colour of "Others", the samples without value in a last row. Each
 * row shows `selected/total` samples.
 *
 * @param {Object} tree The tree object
 * @param {Array} ordered_groups Groups of the whole legend as `[value, samples, colour, ...]`
 * @returns {Object|null} `{rows, title, summary}`, null when the legend is not filtered
 */
gtiz_legend.getSelectionFilterRows = function(tree, ordered_groups) {
  if (!gtiz_legend.selection_filter) {
    return null;
  }
  let node_ids = tree.getSelectedNodeIDs();
  if (node_ids.length == 0) {
    return null;
  }
  let category = tree.display_category;
  let selection = gtiz_legend.countValues(tree, node_ids, category);
  let whole = gtiz_legend.countValues(tree, null, category);
  let others_colour = tree.default_colour;
  let rows = [];
  let listed = {};
  let addRow = (label, real_group, samples, total, colour) => {
    rows.push({
      group : label + '  [' + samples + '/' + total + ']',
      group_colour : colour,
      real_group : real_group,
      samples : samples
    });
  };
  ordered_groups.forEach(group => {
    let key = String(group[0]);
    let samples = selection.counts[key];
    if (!samples || listed[key]) {
      return;
    }
    listed[key] = true;
    // the total is the one of the whole legend
    addRow(group[0], group[0], samples, group[1], group[2] ? group[2] : others_colour);
  });
  // values not listed one by one in the whole legend, largest first
  Object.keys(selection.counts).filter(key => !listed[key]).sort((a, b) => {
    return selection.counts[b] - selection.counts[a];
  }).forEach(key => {
    addRow(key, key, selection.counts[key], whole.counts[key] || selection.counts[key], others_colour);
  });
  if (selection.missing > 0) {
    // `missing` is the type of the pie wedges of the samples without value
    let colour = tree.category_colours['missing'] ? tree.category_colours['missing'] : others_colour;
    addRow(gtiz_locales.current.missing_value, 'missing', selection.missing, whole.missing, colour);
  }
  let summary = gtiz_locales.current.selection_summary.replace('{0}', selection.samples).replace('{1}', selection.nodes);
  return {
    rows : rows,
    title : gtiz_locales.current.legend_filtered_by_selection,
    summary : summary
  };
}

/**
 * Show or hide the box telling that the legend is filtered by the selection
 *
 * @param {Object|null} filter Result of `getSelectionFilterRows`, null to hide the box
 * @returns {undefined}
 */
gtiz_legend.setFilterIndicator = function(filter) {
  let box = document.querySelector('.card-legend .card-legend-filter');
  if (!box) {
    return;
  }
  if (!filter) {
    box.classList.add('hidden');
    return;
  }
  box.querySelector('.card-legend-filter-title').textContent = filter.title;
  box.querySelector('.card-legend-filter-summary').textContent = filter.summary;
  let close = box.querySelector('.card-legend-filter-close');
  close.setAttribute('title', gtiz_locales.current.show_whole_legend);
  close.setAttribute('aria-label', gtiz_locales.current.show_whole_legend);
  box.classList.remove('hidden');
}

/**
 * Rebuild only the legend, without recomputing the tree, keeping the rows that
 * were selected (when still listed) and, in `visual` mode, their highlight
 *
 * @returns {undefined}
 */
gtiz_legend.redrawLegend = function() {
  let tree = gtiz_tree.tree;
  if (!tree || !tree.display_category || !tree.legend_groups) {
    return;
  }
  let selected = Array.from(document.querySelectorAll('.card-legend .list-row.selected')).map(item => {
    return item.getAttribute('data-real-group-izsam');
  });
  tree.updateLegend(tree.display_category, tree.legend_groups);
  document.querySelectorAll('.card-legend .list-row').forEach(item => {
    if (selected.includes(item.getAttribute('data-real-group-izsam'))) {
      gtiz_legend.setItemSelectedDom(item, true);
    }
  });
  if (gtiz_legend.selection_mode == 'visual') {
    gtiz_legend.highlightSelection();
  }
}

/**
 * Filter the legend by the selected nodes
 *
 * @returns {undefined}
 */
gtiz_legend.filterBySelection = function() {
  let tree = gtiz_tree.tree;
  if (!tree || tree.getSelectedNodeIDs().length == 0) {
    return;
  }
  gtiz_legend.selection_filter = true;
  gtiz_legend.redrawLegend();
}

/**
 * Remove the filter by selection: the whole legend is shown again, the
 * selection stays
 *
 * @returns {undefined}
 */
gtiz_legend.clearSelectionFilter = function() {
  if (!gtiz_legend.selection_filter) {
    return;
  }
  gtiz_legend.selection_filter = false;
  gtiz_legend.redrawLegend();
}

/**
 * Follow the selection of tree and map while the legend is filtered: the legend
 * is rebuilt, the filter is removed when the selection is empty
 *
 * @returns {undefined}
 */
gtiz_legend.refreshSelectionFilter = function() {
  let tree = gtiz_tree.tree;
  if (!gtiz_legend.selection_filter || !tree) {
    return;
  }
  if (tree.getSelectedNodeIDs().length == 0) {
    gtiz_legend.clearSelectionFilter();
  } else {
    gtiz_legend.redrawLegend();
  }
}

/**
 * Download the legend alone (the filtered one when the filter is on) as png or svg
 *
 * The svg of the legend (`#legend-svg`) may sit in a hidden box, where it
 * cannot be measured: a copy is measured in a box rendered off screen.
 *
 * @param {String} format `png` or `svg`
 * @returns {undefined}
 */
gtiz_legend.downloadLegend = function(format) {
  let legend_svg = document.getElementById('legend-svg');
  if (!legend_svg) {
    return;
  }
  let box = document.createElement('div');
  box.setAttribute('class', 'legend-export-measure');
  let copy = legend_svg.cloneNode(true);
  copy.removeAttribute('id');
  box.append(copy);
  document.body.append(box);
  let bbox = copy.getBBox();
  box.remove();
  let margin = 10;
  let width = Math.ceil(bbox.x + bbox.width + margin);
  let height = Math.ceil(bbox.y + bbox.height + margin);
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
    '<rect width="100%" height="100%" fill="#ffffff"/>' + legend_svg.innerHTML + '</svg>';
  let name = 'spread-legend' + Date.now() + '.' + format;
  if (format === 'svg') {
    gtiz_file_handler.saveSvg(svg, name);
  } else {
    // the theme font is embedded, a rasterised svg does not see the fonts of the page
    gtiz_file_handler.getEmbeddedFontCss().then(function(font_css) {
      let text = font_css ? svg.replace(/(<svg[^>]*>)/, function(open) {
        return open + '<style>' + font_css + '</style>';
      }) : svg;
      // three times the size of the legend, sharp enough to be printed
      gtiz_file_handler.saveSvgAsPng(text, width * 3, name);
    });
  }
}

// the close icon of the filter box brings back the whole legend
document.querySelector('.card-legend .card-legend-filter-close').addEventListener('click', function() {
  gtiz_legend.clearSelectionFilter();
});

/**
 * Set legend title
 *
 * Here we add an event listener to the select input in order to change the category color. When metadata are not loaded, the select input is empty and we populate it with the available categories.
 * 
 * **Please Note:** when metadata are loaded, we use the `gtiz_tree.addMetadataOptions` event to populate the select input with the available categories.
 * 
 */
gtiz_legend.setTitle = function() {
  let title = document.querySelector('#legend-title-menu-color-by');
  if (title) {
    title.addEventListener('change', function(e) {
			let value = e.target.value;
			gtiz_legend.changeCategoryColor(value);
		});
    if (title.options.length === 0) {
      let values = gtiz_legend.getColorByOptions();
      values.forEach(value => {
        let option = document.createElement('option');
        option.value = value.value;
        option.text = value.label;
        title.add(option);
      });
      let default_value = gtiz_legend.getColorByDefaultValue();
      title.value = default_value;
    }
  }
}

gtiz_legend.init = function() {
  gtiz_legend.toggleViewMode(gtiz_legend.view_mode);
  gtiz_legend.setVisualSelectionToggle(gtiz_legend.selection_mode);
  let order = gtiz_legend.group_order.type + '-' + gtiz_legend.group_order.sort;
  let category = gtiz_tree.tree.display_category;
  if (gtiz_legend.initialized) {
    gtiz_legend.changeGroupOrder(order, category, true);
  } else {
    gtiz_legend.changeGroupOrder(order, category, false);
  }
  gtiz_legend.changeGroupOrder(order, category, false);
  gtiz_legend.setSelection();
  gtiz_legend.setTitle();
  gtiz_legend.initialized = true;
}

/*
*
* Round trigger of the video player in the legend header: it switches the player
* through the legend menu item, so macros record it as any other control
*
*/
gtiz_legend.player_trigger = document.querySelector('.card-legend-player-trigger');
if (gtiz_legend.player_trigger) {
  gtiz_legend.player_trigger.setAttribute('title', gtiz_locales.current.video);
  let switchPlayer = function() {
    let item = gtiz_legend.context_menu.find(el => el.id == 'legend-menu-player');
    item.function(gtiz_layout.video == 'on' ? 'off' : 'on');
  };
  gtiz_legend.player_trigger.addEventListener('click', switchPlayer);
  gtiz_legend.player_trigger.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      switchPlayer();
    }
  });
}

/*
*
* Legend card header, as the assistant one: an accordion opened and closed by its
* trigger and by its title, and a handle that detaches the card from its column
* (gtiz_drag.makeDetachable). Detached, it floats over the main area and docks
* again at the top of the column, above the assistant.
*
*/

/**
 * Open or close the legend card (accordion)
 *
 * @returns {undefined}
 */
gtiz_legend.toggleCard = function() {
  let card = document.querySelector('.card-legend');
  if (!card) {
    return;
  }
  card.classList.toggle('expanded');
  // open again: the list gets its height and its scrollbar back
  if (card.classList.contains('expanded')) {
    requestAnimationFrame(() => gtiz_layout.setLegendHeight());
  }
}

/**
 * Bind the header of the legend card: accordion and detachable card
 *
 * Called once the page is loaded, when gtiz_drag (js/drag.js, loaded after this
 * file) is available.
 *
 * @returns {undefined}
 */
gtiz_legend.initCard = function() {
  let card = document.querySelector('.card-legend');
  if (!card) {
    return;
  }
  let expand = card.querySelector(':scope > .card-expand-trigger');
  let title = card.querySelector(':scope > .card-title');
  if (expand) {
    expand.addEventListener('click', gtiz_legend.toggleCard);
  }
  if (title) {
    // only its text opens and closes the card: the empty space of the header drags it (gtiz_drag.grab)
    title.addEventListener('click', (event) => {
      if (typeof gtiz_drag !== 'undefined' && gtiz_drag.isHeaderSpace(card, event.target)) {
        return;
      }
      gtiz_legend.toggleCard();
    });
  }
  if (typeof gtiz_drag !== 'undefined' && gtiz_drag.makeDetachable) {
    gtiz_drag.makeDetachable(card, {
      column : document.querySelector('.main > .legend'),
      container : document.querySelector('section.main'),
      // the legend stays above the assistant in the column
      first : true,
      // the css closes the column when no card is left in it
      onChange : (floating) => gtiz_layout.body.classList.toggle('legend-floating', floating),
      onDrop : () => gtiz_layout.setLegendHeight()
    });
  }
}

document.addEventListener('DOMContentLoaded', gtiz_legend.initCard);
