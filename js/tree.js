let gtiz_tree = {};
gtiz_tree.original_tree = {};
gtiz_tree.full_tree_backup = {};
gtiz_tree.filtered_nodes = [];
gtiz_tree.tree = null;
gtiz_tree.current_metadata_file = null;
gtiz_tree.metadata_grid = null;
gtiz_tree.tree_raw = undefined;
gtiz_tree.metadata_options = {};
gtiz_tree.change_counter = 0;
gtiz_tree.selectedNodeIDs = undefined;
// tree settings
gtiz_tree.show_node_tooltips = 'show_tooltips'; // or hide_tooltips
gtiz_tree.tree_node_tooltip = undefined;
gtiz_tree.show_hypothetical = 'show_hypo'; // or hide_hypo
gtiz_tree.rendering_mode = 'static'; // or dynamic
gtiz_tree.rendering_dynamic_selected_only = 'selected_only'; // or all
gtiz_tree.rendering_static_real_branch_length = 'real'; // or unreal
gtiz_tree.show_node_labels = 'hidden'; // or shown
gtiz_tree.node_label = undefined;
gtiz_tree.node_label_font_size = 12;
gtiz_tree.individual_segments = 'hidden';
gtiz_tree.node_radius_size = 100; // value has to be divided for 10 `tree.setNodeSize(gtiz_tree.node_radius_size / 10.);`
gtiz_tree.node_kurtosis = 100; // value has to be divided for 200 `tree.setRelativeNodeSize(gtiz_tree.node_kurtosis / 200.0);`
gtiz_tree.node_collapsed_value = 0;
gtiz_tree.show_branch_labels = 'shown'; // or hidden
gtiz_tree.branch_label_font_size = 18;
gtiz_tree.branch_scaling = 100;
gtiz_tree.branch_log_scale = 'not-active'; // or active
gtiz_tree.branch_cutoffs_method = 'display'; // or hide or cap
gtiz_tree.label_to_highlight = ''; // category text to highlight
gtiz_tree.png_width = 2400;

/**
 * Apply settings on originall tree.
 * 
 * @param {Object} obj Full tree object from which to take settings or full settings object to apply
 * @param {Boolean} apply If `true` apply settings
 * @param {Boolean} metadata If `true` consider apply also settings related to metadata
 * @param {String} page If `current` reset some settings to default, usefull when appllying settings to tree in current page
 */
gtiz_tree.applySettings = function(obj, apply, metadata, page) {

  if (apply == 'apply') {
    let bkp = obj;
    let tree = gtiz_tree.tree;
    // apply all settings
    let bkp_tree_settings = bkp.gtiz_settings.tree;
    gtiz_tree.setMetadata(bkp.layout_data.display_category);
    gtiz_tree.toggleShowNodeLabels(bkp_tree_settings.show_node_labels);
    gtiz_tree.setNodeLabelMetadata(bkp_tree_settings.node_label);
    gtiz_tree.setNodeLabelFontSize(bkp_tree_settings.node_label_font_size);
    // gtiz_tree.highlightLabels(gtiz_tree.label_to_highlight);
    gtiz_tree.toggleIndividualSegments(bkp_tree_settings.individual_segments);
    gtiz_tree.setNodeRadiusSize(bkp_tree_settings.node_radius_size);
    gtiz_tree.setNodeKurtosis(bkp_tree_settings.node_kurtosis);
    gtiz_tree.toggleShowBranchLabels(bkp_tree_settings.show_branch_labels);
    gtiz_tree.setBranchLabelFontSize(bkp_tree_settings.branch_label_font_size);
    gtiz_tree.setBranchScaling(bkp_tree_settings.branch_scaling);
    // gtiz_tree.collapseBranches(bkp_tree_settings.node_collapsed_value);
    gtiz_tree.toggleBranchLogScale(bkp_tree_settings.branch_log_scale);
    gtiz_tree.setBranchLength(bkp_tree_settings.node_collapsed_value);
    gtiz_tree.setBranchLengthMethod(bkp_tree_settings.branch_cutoffs_method);
    gtiz_tree.toggleRenderingMode(bkp_tree_settings.rendering_mode);
    gtiz_tree.setRenderingDynamicSelecion(bkp_tree_settings.rendering_dynamic_selected_only);
    gtiz_tree.setRenderingStaticSelecion(bkp_tree_settings.rendering_static_real_branch_length);
    // node shapes and borders, by sample id: a zoom shows them on its own samples
    if (bkp.layout_data && bkp.layout_data.nodes_links && bkp.layout_data.nodes_links.node_styles) {
      tree.setNodeStyles(bkp.layout_data.nodes_links.node_styles);
      gtiz_node_styles.refresh();
    }

    if (metadata) {
      // the metadata grid keeps the column order of the tree the settings come from
      if (bkp.gtiz_metadata) {
        gtiz_metadata.setColumnsOrder(bkp.gtiz_metadata.columns_order);
      }
      let bkp_category = bkp.layout_data.display_category;
      // set custom colors
      let bkp_custom_colors = bkp.layout_data.nodes_links.custom_colours;
      if (bkp_custom_colors) {
        Object.keys(bkp_custom_colors).forEach(cat => {
          let bkp_custom_colors_cat = bkp_custom_colors[cat];
          Object.keys(bkp_custom_colors_cat).forEach(color => {
            gtiz_tree.tree.setColour(cat, color, bkp_custom_colors_cat[color]);
          });
        });
        if (gtiz_legend.selection_mode == 'visual') {
          gtiz_legend.resetVisualSelection();
          gtiz_legend.highlightSelection();
        } else {
          gtiz_legend.resetQualitativeSelection();
        }
      }
      // set metadata
      let exists = tree.metadata_info[bkp_category];
      if (exists) {
        // set max group number
        let bkp_max_group_number = bkp.metadata_options[bkp_category].category_num;
        let max_group_number = tree.metadata_info[bkp_category].category_num;
        if (bkp_max_group_number && bkp_max_group_number != max_group_number) {
          // tree.metadata_info[bkp_category].category_num = bkp_max_group_number;
          gtiz_legend.changeMaxGroupNumber(bkp_max_group_number, bkp_category, false);
        }
        // set min group number
        let bkp_min_group_number = bkp.metadata_options[bkp_category].minnum;
        let min_group_number = tree.metadata_info[bkp_category].minnum;
        if (bkp_min_group_number && bkp_min_group_number != min_group_number) {
          // tree.metadata_info[bkp_category].minnum = bkp_min_group_number;
          gtiz_legend.changeMinGroupSize(bkp_min_group_number, bkp_category, false);
        }
        // set coltype
        let bkp_coltype = bkp.metadata_options[bkp_category].coltype;
        let coltype = tree.metadata_info[bkp_category].coltype;
        if (bkp_coltype && bkp_coltype != coltype) {
          // tree.metadata_info[bkp_category].coltype = bkp_coltype;
          gtiz_legend.changeDataCategory(bkp_coltype, bkp_category, false);
        }
        // set group order
        let bkp_group_order = bkp.gtiz_legend.group_order;
        let group_order = gtiz_legend.group_order;
        if (bkp_group_order && bkp_group_order != group_order) {
          let value = bkp_group_order.type + '-' + bkp_group_order.sort;
          gtiz_legend.changeGroupOrder(value, bkp_category, false);
        }
        // set color scheme 
        let bkp_colorscheme = bkp.metadata_options[bkp_category].colorscheme;
        let colorscheme = tree.metadata_info[bkp_category].colorscheme;
        if (bkp_colorscheme && bkp_colorscheme != colorscheme) {
          gtiz_legend.changeColorScheme(bkp_colorscheme, bkp_category, false);
        }
        tree.changeCategory(bkp_category);
      }
    }
    if (page != 'current') {
      // reset layout options
      let layout = [{
          type: 'settings',
          value: bkp.gtiz_layout.settings
        }, {
          type: 'map',
          value: bkp.gtiz_layout.map
        }, {
          type: 'legend',
          value: bkp.gtiz_layout.legend
        }, {
          type: 'metadata',
          value: bkp.gtiz_layout.metadata
      }];
      // the video player has no toggle: it is set directly (on when the session has no value)
      gtiz_layout.setVideo(bkp.gtiz_layout.video);
      layout.forEach(element => {
        let selector = '[data-view="' + element.type + '"]';
        let node = gtiz_layout.quick_actions_node.querySelector(selector);
        if (node) {
          let selection = node.getAttribute('data-selection');
          if (selection != element.value) {
            let event = new MouseEvent('click', {
              bubbles: true,     // Indicates whether the event bubbles up through the DOM or not
              cancelable: true,  // Indicates whether the event is cancelable
              view: window,      // Specifies the view (window) from which the event was generated
              // Additional properties for simulating specific types of clicks (e.g., with Ctrl key)
            });
            // Dispatch the event
            node.dispatchEvent(event);
          }
        }
      });
    }
  } else {
    if (page == 'current') {
      // reset layout options
      let layout = [{
          type: 'settings',
          value: 'off'
        }, {
          type: 'map',
          value: 'off'
        }, {
          type: 'legend',
          value: 'on'
        }, {
          type: 'metadata',
          value: 'off'
      }];
      gtiz_layout.setVideo('on');
      layout.forEach(element => {
        let selector = '[data-view="' + element.type + '"]';
        let node = gtiz_layout.quick_actions_node.querySelector(selector);
        if (node) {
          let selection = node.getAttribute('data-selection');
          if (selection != element.value) {
            let event = new MouseEvent('click', {
              bubbles: true,     // Indicates whether the event bubbles up through the DOM or not
              cancelable: true,  // Indicates whether the event is cancelable
              view: window,      // Specifies the view (window) from which the event was generated
              // Additional properties for simulating specific types of clicks (e.g., with Ctrl key)
            });
            // Dispatch the event
            node.dispatchEvent(event);
          }
        }
      });
    }
  }
}

/**
 * Get complete settinfs object
 * 
 * @returns Object
 */
gtiz_tree.getCompleteGrapeTreeSettings = function() {
  let obj = {};
  obj.gtiz_locales = {
		languages : gtiz_locales.languages
	};
  obj.gtiz_layout = {
		settings : gtiz_layout.settings,
		map : gtiz_layout.map,
		metadata : gtiz_layout.metadata,
		legend : gtiz_layout.legend,
		video : gtiz_layout.video
	};
  obj.gtiz_settings = {
		cfg : gtiz_settings.cfg,
		tree : {
			rendering_mode : gtiz_tree.rendering_mode,
			// angle of the tree from the layout loaded (the positions are saved rotated)
			tree_rotation : gtiz_tree.tree_rotation,
			rendering_dynamic_selected_only : gtiz_tree.rendering_dynamic_selected_only,
			rendering_static_real_branch_length : gtiz_tree.rendering_static_real_branch_length,
			show_node_labels : gtiz_tree.show_node_labels,
			node_label : gtiz_tree.node_label,
			node_label_font_size : gtiz_tree.node_label_font_size,
			individual_segments : gtiz_tree.individual_segments,
			node_radius_size : gtiz_tree.node_radius_size,
			node_kurtosis : gtiz_tree.node_kurtosis,
      node_collapsed_value : gtiz_tree.node_collapsed_value,
			show_branch_labels : gtiz_tree.show_branch_labels,
			branch_label_font_size : gtiz_tree.branch_label_font_size,
			branch_scaling : gtiz_tree.branch_scaling,
			branch_log_scale : gtiz_tree.branch_log_scale,
			branch_cutoffs_method : gtiz_tree.branch_cutoffs_method,
      label_to_highlight : gtiz_tree.label_to_highlight
		},
		map : {
			default_delta_type : gtiz_map.delta_type,
			default_delta : gtiz_map.delta,
			point_min_radius : gtiz_map.point_min_radius,
			point_max_radius : gtiz_map.point_max_radius,
			markers_type : gtiz_map.markers_type
		}
	};
  obj.gtiz_legend = {
		selection_mode : gtiz_legend.selection_mode,
		view_mode : gtiz_legend.view_mode,
		histogram_scale : gtiz_legend.histogram_scale,
		group_order : gtiz_legend.group_order,
		selection_map : gtiz_legend.getSelectionMap()
	};
  obj.gtiz_metadata = {
		show_nodes : gtiz_metadata.show_nodes,
		show_hypothetical : gtiz_metadata.show_hypothetical,
		columns_order : [...gtiz_metadata.columns_order]
	};
  obj.gtiz_video = {
		cfg : gtiz_video.cfg
	};
  let layout = gtiz_tree.tree.getLayout();
  obj.layout_data = {
    display_category : layout.display_category,
    nodes_links : layout.nodes_links,
  }
  obj.metadata_options = gtiz_tree.tree.getMetadataOptions();

  return obj;
}

/**
 * Get complete SPREAD object (tree, metadata, map, settings etc.)
 * 
 * @returns Object
 */
gtiz_tree.getCompleteGrapeTreeObject = function() {
  let obj = gtiz_tree.tree.getTreeAsObject();
  obj.gtiz_file_handler = {
    samples_column : gtiz_file_handler.samples_column
  };
  obj.gtiz_locales = {
		languages : gtiz_locales.languages
	};
  // the embedded metadata are the ones in memory, so a single language: we carry
  // the resolution of their technical columns along, otherwise reading this json
  // would depend on the app.json of whoever opens it
  obj.gtiz_metadata_localization = {
		lang : gtiz_locales.getActiveLanguageCode(),
		localized : gtiz_file_handler.metadata_localized,
		source : gtiz_file_handler.metadata_source,
		technical_columns : { ...gtiz_file_handler.technical_columns },
		technical_values : JSON.parse(JSON.stringify(gtiz_file_handler.technical_values))
	};
  if (gtiz_map.geojson && gtiz_map.geojson != '') {
		obj.gtiz_map = {
			geojson : gtiz_map.geojson
		};
	}
  obj.gtiz_layout = {
		settings : gtiz_layout.settings,
		map : gtiz_layout.map,
		metadata : gtiz_layout.metadata,
		legend : gtiz_layout.legend,
		video : gtiz_layout.video
	};
  obj.gtiz_settings = {
		cfg : gtiz_settings.cfg,
		tree : {
			rendering_mode : gtiz_tree.rendering_mode,
			// angle of the tree from the layout loaded (the positions are saved rotated)
			tree_rotation : gtiz_tree.tree_rotation,
			rendering_dynamic_selected_only : gtiz_tree.rendering_dynamic_selected_only,
			rendering_static_real_branch_length : gtiz_tree.rendering_static_real_branch_length,
			show_node_labels : gtiz_tree.show_node_labels,
			node_label : gtiz_tree.node_label,
			node_label_font_size : gtiz_tree.node_label_font_size,
			individual_segments : gtiz_tree.individual_segments,
			node_radius_size : gtiz_tree.node_radius_size,
			node_kurtosis : gtiz_tree.node_kurtosis,
      node_collapsed_value : gtiz_tree.node_collapsed_value,
			show_branch_labels : gtiz_tree.show_branch_labels,
			branch_label_font_size : gtiz_tree.branch_label_font_size,
			branch_scaling : gtiz_tree.branch_scaling,
			branch_log_scale : gtiz_tree.branch_log_scale,
			branch_cutoffs_method : gtiz_tree.branch_cutoffs_method,
      label_to_highlight : gtiz_tree.label_to_highlight
		},
		map : {
			default_delta_type : gtiz_map.delta_type,
			default_delta : gtiz_map.delta,
			point_min_radius : gtiz_map.point_min_radius,
			point_max_radius : gtiz_map.point_max_radius,
			markers_type : gtiz_map.markers_type
		}
	};
  obj.gtiz_legend = {
		selection_mode : gtiz_legend.selection_mode,
		view_mode : gtiz_legend.view_mode,
		histogram_scale : gtiz_legend.histogram_scale,
		group_order : gtiz_legend.group_order,
		selection_map : gtiz_legend.getSelectionMap()
	};
  obj.gtiz_metadata = {
		show_nodes : gtiz_metadata.show_nodes,
		show_hypothetical : gtiz_metadata.show_hypothetical,
		columns_order : [...gtiz_metadata.columns_order]
	};
  obj.gtiz_video = {
		cfg : gtiz_video.cfg
	};
  obj.gtiz_zooms = {
		cfg : gtiz_zooms.cfg,
		category : gtiz_zooms.category,
    soi : gtiz_zooms.soi,
    thresholds_params : gtiz_zooms.thresholds_params,
    zooms_prefix : gtiz_zooms.zooms_prefix,
    zooms : gtiz_zooms.zooms
	};
  // the macros recorded by the user travel with the session
  let macros = typeof gtiz_macros !== 'undefined' ? gtiz_macros.getSessionData() : undefined;
  if (macros) {
    obj.gtiz_macros = macros;
  }
  // the notes of the session (js/notes.js)
  let notes = typeof gtiz_notes !== 'undefined' ? gtiz_notes.getSessionData() : undefined;
  if (notes) {
    obj.gtiz_notes = notes;
  }

  return obj;
}

/**
 * Save initial(original) tree object to use it for reset tree
 * 
 * @param {Boolean} update If `true` update existing orignal tree object
 */
gtiz_tree.saveOriginalTree = function(update) {
  
  if (Object.keys(gtiz_tree.original_tree).length != 0 && !update) {
    return;
  }

  let obj = {...gtiz_tree.getCompleteGrapeTreeObject()};
  if (obj) {
    gtiz_tree.original_tree = obj;
  } else {
    console.log('Oops! I was unable to get complete tree as object and save it.');
  }
}

gtiz_tree.findNodes = function(nodes) {
  gtiz_map.findNodesInMap(nodes);
  if (gtiz_layout.metadata == 'on') {
    gtiz_metadata.findNodes(nodes);
  }
  gtiz_zooms.checkZooms(nodes);
  // a legend filtered by the selection follows it (selections of tree and map)
  gtiz_legend.refreshSelectionFilter();
}

/**
 * Core function to pass selection between tree, map and legend
 * 
 * @param {Object} tree Tree object 
 * @param {Function} callback Callback function
 * @returns
 *  
 */
gtiz_tree.tree_interceptor = (tree, callback) => {
  if (!tree) {
    console.error("tree not defined");
    return;
  }
  if (!callback || typeof callback !== 'function') {
    console.error("callback not defined");
    return;
  }
  tree.addNodesSelectedListener((tree) => {
    let groupedNodes = {};
    gtiz_tree.selectedNodeIDs = tree.getSelectedNodeIDs();
    for (selectedNodeID of gtiz_tree.selectedNodeIDs) {
      groupedNodes[selectedNodeID] = tree.grouped_nodes[selectedNodeID];
    }
    callback(groupedNodes);
  });
}

gtiz_tree.setBranchLength = function(value) {
  let max = parseFloat(value);
	if (!max) {
		max = gtiz_tree.tree.max_link_distance + 1;
	}
	let method = gtiz_tree.branch_cutoffs_method;
  if (method == 'hide') {
    gtiz_tree.tree.setMaxLinkLength(gtiz_tree.tree.max_link_distance + 1);
		gtiz_tree.tree.setHideLinkLength(max);
  } else if (method == 'cap') {
    gtiz_tree.tree.setHideLinkLength(gtiz_tree.tree.max_link_distance+1);
		gtiz_tree.tree.setMaxLinkLength(max);
  } else {
    gtiz_tree.tree.setMaxLinkLength(gtiz_tree.tree.max_link_distance + 1);
    gtiz_tree.tree.setHideLinkLength(gtiz_tree.tree.max_link_distance + 1);
  }
}

gtiz_tree.setBranchLengthMethod = function(value) {
  gtiz_tree.branch_cutoffs_method = value;
  let input = document.querySelector('#tree-branch-length');
  if (input) {
    let max = parseFloat(input.value);
    gtiz_tree.setBranchLength(max);
  }
}

gtiz_tree.toggleBranchLogScale = function(value) {
  gtiz_tree.branch_log_scale = value;
  if (gtiz_tree.branch_log_scale == 'active') {
    gtiz_tree.tree.setLogLinkScale(true);
  } else {
    gtiz_tree.tree.setLogLinkScale(false);
  }
}

gtiz_tree.collapseBranches = function(value) {
  let v = parseFloat(value);
  gtiz_tree.node_collapsed_value = v;
  gtiz_tree.tree.collapseNodes(v);
  if (gtiz_legend.selection_mode == 'visual') {
    gtiz_legend.resetVisualSelection();
    gtiz_legend.highlightSelection();
  }
}

gtiz_tree.setBranchScaling = function(value) {
  gtiz_tree.branch_scaling = parseInt(value);
  gtiz_tree.tree.setLinkLength(gtiz_tree.branch_scaling * 5.0);
}

gtiz_tree.setBranchLabelFontSize = function(value) {
  gtiz_tree.branch_label_font_size = parseInt(value);
  gtiz_tree.tree.setLinkFontSize(gtiz_tree.branch_label_font_size);
}

gtiz_tree.toggleShowBranchLabels = function(value) {
  gtiz_tree.show_branch_labels = value;
  if (gtiz_tree.show_branch_labels == 'shown') {
    gtiz_tree.tree.showLinkLabels(true);
  } else {
    gtiz_tree.tree.showLinkLabels(false);
  }
}

gtiz_tree.setNodeKurtosis = function(value) {
  gtiz_tree.node_kurtosis = parseInt(value);
  gtiz_tree.tree.setRelativeNodeSize(gtiz_tree.node_kurtosis / 200.0);
}

gtiz_tree.setNodeRadiusSize = function(value) {
  gtiz_tree.node_radius_size = parseInt(value);
  gtiz_tree.tree.setNodeSize(gtiz_tree.node_radius_size / 10.);
}

gtiz_tree.toggleIndividualSegments = function(value) {
  gtiz_tree.individual_segments = value;
  if (value == 'shown') {
    gtiz_tree.tree.showIndividualSegments(true);
  } else {
    gtiz_tree.tree.showIndividualSegments(false);
  }
  if (gtiz_legend.selection_mode == 'visual') {
    gtiz_legend.resetVisualSelection();
    gtiz_legend.highlightSelection();
  }
}

/**
 * Get selected value by using `display_category`
 * 
 * @returns 
 * 
 */
gtiz_tree.getNodeLabelSelectValue = function() {
  let category = gtiz_tree.tree.display_category;
  if (gtiz_tree.node_label) {
    category = gtiz_tree.node_label;
  }
  let value = category ? category : '';
  return value;
}

/**
 * Set label font size
 * 
 * @param {String} value
 * 
 */
gtiz_tree.setNodeLabelFontSize = function(value) {
  gtiz_tree.node_label_font_size = parseInt(value);
  gtiz_tree.tree.setNodeFontSize(gtiz_tree.node_label_font_size);
}

/**
 * Toggle nodes label visualization
 * 
 * @param {String} value 
 * 
 */
gtiz_tree.toggleShowNodeLabels = function(value) {
  gtiz_tree.show_node_labels = value;
  if (gtiz_tree.show_node_labels == 'shown') {
    gtiz_tree.tree.showNodeLabels(true);
  } else {
    gtiz_tree.tree.showNodeLabels(false);
  }
}

/**
 * Function to higlight label based on keywords
 * 
 * @param {String} value Value coming from input text 
 * @returns Exit from function if keywords ar not defined
 * 
 */
gtiz_tree.highlightLabels = function(value) {
  // clean legend selection
  let selection_mode = gtiz_legend.selection_mode;
  let items = document.querySelectorAll('.card-legend .list-row');
  if (items) {
    items.forEach(item => {
      item.classList.remove('selected');
      let check = item.querySelector('.list-check');
      let icon = check.querySelector('i');
      icon.setAttribute('class', 'tabler tabler-circle');
    });
  }
  
  if (selection_mode == 'qualitative') {
    gtiz_legend.nodeSelection();
  } else {
    gtiz_legend.highlightSelection();
  }
  let node_label = document.querySelector('#tree-node-label-text');
  let category = node_label.value;
  let keyword = value;
  gtiz_tree.label_to_highlight = keyword;
	if (!keyword) {
    gtiz_tree.tree.clearSelection();
		return;
	}
	let ids = gtiz_tree.tree.searchMetadata(keyword, category);
	gtiz_tree.tree.highlightNodes(ids);
}

gtiz_tree.setNodeLabelMetadata = function(value) {
  gtiz_tree.node_label = value;
  gtiz_tree.tree.setNodeText(value);
}

/**
 * Get selected value by using `display_category`
 * 
 * @returns 
 * 
 */
gtiz_tree.getMetadataSelectValue = function() {
  let category = gtiz_tree.tree.display_category;
  let value = category ? category : '';
  return value;
}

/**
 * Get metadata in order to return an array to build options for select box
 * 
 * @returns Array of object to build `<option>` tags
 * 
 */
gtiz_tree.getMetadataSelectOptions = function() {
  let tree = gtiz_tree.tree;
  let options = [];
  if (tree) {
    let metadata = tree.metadata_info;
    if (metadata) {
      options = Object.keys(metadata)
      .sort()
      .map(function(category) {
        let label = metadata[category]['label'];
        if (label) {
          label = label.toLowerCase();
          label = label.charAt(0).toUpperCase() + label.slice(1) // same formula used to render legend title
        }
        let ar = {
          value : category,
          label : label
        }
        return ar;
      });
    }
  }
  return options;
}

/**
 * 
 * Changes the category displayed. If no category is given then the node IDs will be displayed.
 * 
 * @param {String} value category to change
 * 
 */
gtiz_tree.setMetadata = function(value) {
  let category = value in gtiz_tree.tree.metadata_info ? value : Object.keys(gtiz_tree.tree.metadata_info)[0];
  gtiz_tree.tree.changeCategory(category);
  if (gtiz_legend.selection_mode == 'visual') {
    gtiz_legend.resetVisualSelection();
    gtiz_legend.highlightSelection();
  } else {
    gtiz_legend.resetQualitativeSelection();
  }
}

gtiz_tree.setRenderingStaticSelecion = function(value) {
  gtiz_tree.rendering_static_real_branch_length = value;
  if (gtiz_tree.rendering_mode == 'static') {
    if (value == 'real') {
      gtiz_tree.tree.fixAllNodes(true);
    } else {
      gtiz_tree.tree.fixAllNodes(false);
    }
  }
}

gtiz_tree.setRenderingDynamicSelecion = function(value) {
  gtiz_tree.rendering_dynamic_selected_only = value;
  if (gtiz_tree.rendering_mode == 'dynamic') {
    if (value == 'selceted_only') {
      gtiz_tree.tree.unfixSelectedNodes(false);
    } else {
      gtiz_tree.tree.unfixSelectedNodes(true);
    }
  }
};

gtiz_tree.toggleRenderingMode = function(value) {
  gtiz_tree.rendering_mode = value;
  let static_check = document.querySelector('#tree-rendering-static-real-branch-length');
  let dynamic_check = document.querySelector('#tree-rendering-dynamic-selected-only');
  if (value == 'dynamic') {
    if (dynamic_check) {
      dynamic_check.setAttribute('style', 'display: block;');
    }
    if (static_check) {
      static_check.setAttribute('style', 'display: none;');
    }
    if (gtiz_tree.rendering_dynamic_selected_only == 'selceted_only') {
      gtiz_tree.tree.unfixSelectedNodes(false);
    } else {
      gtiz_tree.tree.unfixSelectedNodes(true);
    }
  } else {
    if (dynamic_check) {
      dynamic_check.setAttribute('style', 'display: none;');
    }
    if (static_check) {
      static_check.setAttribute('style', 'display: block;');
    }
    if (gtiz_tree.rendering_static_real_branch_length == 'real') {
      gtiz_tree.tree.fixAllNodes(true);
    } else {
      gtiz_tree.tree.fixAllNodes(false);
    }
  }
  // the rotation works in the static layout only
  gtiz_tree.updateRotationControls();
}

gtiz_tree.toggleHypotetical = function(value) {
  gtiz_tree.show_hypothetical = value;
  gtiz_tree.tree.toggleHypotheticalNodes();
}

gtiz_tree.toggleNodeToolTipVisibility = function(value) {
  gtiz_tree.show_node_tooltips = value;
}

gtiz_tree.showToolTip = function(msg, e) {
  // Remove any existing tooltip first so we never leave an orphaned div behind
  // (each call appends a new element; only the last reference was tracked).
  gtiz_tree.hideToolTip();
  gtiz_tree.tree_node_tooltip = d3.select("body")
			.append("div")
			.attr("class", "tree-node-tooltip")
			.style("opacity", 0);
  if (!e) {
    // d3 v6+ removed the global d3.event; fall back to the browser's current event
    e = window.event;
  }
  gtiz_tree.tree_node_tooltip.style("z-index", 9999);
  gtiz_tree.tree_node_tooltip.transition()
    .duration(200)
    .style("opacity", .9);
  gtiz_tree.tree_node_tooltip.html(msg)
    .style("left", (e.pageX) + "px")
    .style("top", (e.pageY - 28) + "px")
    .style("height", "auto");
  // setTimeout(gtiz_tree.hideToolTip, 2000);
}

gtiz_tree.hideToolTip = function() {
  if (gtiz_tree.tree_node_tooltip) {
    gtiz_tree.tree_node_tooltip.remove();
  }
}

/**
 * Update all the select options. (No documentation provided)
 * 
 */
gtiz_tree.addMetadataOptions = function (data) {
  if (gtiz_utils.medatadata_select_nodes && gtiz_utils.medatadata_select_nodes.length > 0) {
    let options = gtiz_tree.getMetadataSelectOptions();

    gtiz_utils.medatadata_select_nodes.forEach((node) => {
      let select = document.querySelector(node);
      if (select) {
        select.innerHTML = '';
        options.forEach(el => {
          let option = document.createElement('option');
          option.setAttribute('value', el.value);
          option.innerHTML = el.label;
          select.append(option);
        });
      }
    });
  }
}

/**
 * On tree loaded functions. (No documentation provided)
 * 
 * @param {Object} tree Tree object
 */
gtiz_tree.treeLoaded = function(tree) {

  tree.centerGraph();
  tree.resize();
  let tree_time = gtiz_layout.getStyleTime(gtiz_layout.tree_node);
  gtiz_layout.resizeTree(tree_time);

  // gtiz_tree.metadata_grid = new D3MSMetadataTable(tree);
  // gtiz_tree.metadata_grid.updateMetadataTable();

  //update the dropdowns if new options added
  tree.addTreeChangedListener(function(type, data) {
    if (type === 'metadata_options_altered') {
      gtiz_tree.addMetadataOptions(data);
    } else if (type === 'nodes_collapased') {
      console.log('nodes_collapased: ');
      console.log(data);
    }
  });

  tree.addDisplayChangedListener(function(type, data) {
    if (type === 'category_changed') {
      
      if (gtiz_utils.medatadata_select_nodes && gtiz_utils.medatadata_select_nodes.length > 0) {
        gtiz_utils.medatadata_select_nodes.forEach((node) => {
          let select = document.querySelector(node);
          if (select) {
            if (select.id != 'tree-node-label-text') {
              select.value = data;
            }
          }
        });
      }
      if (gtiz_tree.change_counter > 0) {
        let video_status = gtiz_video.status;
        if (video_status && gtiz_video.status != 'init') {
          gtiz_video.reset();
        }
        // tree.clearSelection();
      }
      if (gtiz_map.geojson != '' && gtiz_layout.map == 'on') {
        gtiz_map.defineMarkers();
      }
      gtiz_tree.change_counter++;
    }
  });
  
  /**
   * 
   * Adds a listener to the node segment, which is called when the mouse is over the segment
   * 
   * A callback which is called when a segment is mouse overed The functions is supplied the segment e.g. addLinkOverListener(function(segment){...});
   * 
   */
  tree.addSegmentOverListener(function(d, event) {
    if (gtiz_tree.show_node_tooltips == 'show_tooltips') {
      let display = d.data.type;
      // the titles of the notes of the node follow its values
      let notes = typeof gtiz_notes !== 'undefined' ? gtiz_notes.tooltipHtml(tree._hover_node) : '';
      gtiz_tree.showToolTip(display+ '(' + d.data.value + ')' + notes, event);
    }
  });

  /**
   * 
   * Adds a listener to the node, which is called when the mouse leaves the link
   * 
   * A callback which is called when the mouse leaves the link The functions is supplied the link e.g. addLinkOverListener(function(link){...});
   * 
   */
  tree.addSegmentOutListener(function(d) {
    // console.log('Mouse leaved the node');
    gtiz_tree.hideToolTip();
  });

  /**
   * 
   * Adds a listener to the node, which is called when the mouse leaves the link
   * 
   * A callback which is called when the mouse leaves the link The functions is supplied the link e.g. addLinkOverListener(function(link){...});
   * 
   */
  tree.addLinkOverListener(function(d, event) {
    // console.log("Length: " + d.value);
    if (gtiz_tree.show_node_tooltips == 'show_tooltips') {
      gtiz_tree.showToolTip("length:" + d.value, event);
    }
  });

  /**
   * 
   * Adds a listener to the node, which is called when the mouse leaves the link
   * 
   * A callback which is called when the mouse leaves the link The functions is supplied the link e.g. addLinkOverListener(function(link){...});
   * 
   */
  tree.addLinkOutListener(function(d) {
    // console.log("Mouse leaves the link.");
    gtiz_tree.hideToolTip();
  });

  /**
   * 
   * Change color from legend.
   * 
   */
  tree.legendItemCircleClicked = function(data){
    var cc = gtiz_legend.legend_colour_chooser;
    cc.value = gtiz_utils.toHexColor(data.colour);
    cc.dataset.value = data.value.split("  [")[0];
    cc.dataset.category = data.category;
    // open the native color picker (must run within the user gesture)
    cc.click();
  };

  /**
   * Select an item in the legend, the function is declared in base_tree.js togheter with the listener, added during the legend build process
   * 
   * @param {Object} obj Object containing information about legend, category and clicked item
   * 
   */
  tree.legendItemClicked = function(obj) {
    let target = obj.target;
    if (!target.classList.contains('card-legend-item-circle')) {
      gtiz_legend.toggleItemSelection(obj, tree);
    }
    let video_status = gtiz_video.status;
    if (video_status && gtiz_video.status != 'init') {
      gtiz_video.reset();
    }
  };

  if (gtiz_utils.medatadata_select_nodes && gtiz_utils.medatadata_select_nodes.length > 0) {
    let options = gtiz_tree.getMetadataSelectOptions();

    gtiz_utils.medatadata_select_nodes.forEach((node) => {
      let select = document.querySelector(node);
      if (select) {
        select.innerHTML = '';
        options.forEach(el => {
          let option = document.createElement('option');
          option.setAttribute('value', el.value);
          option.innerHTML = el.label;
          select.append(option);
        });
  
        if (data['initial_category']) {
          if (select.id == 'tree-node-label-text') {
            let value = gtiz_tree.node_label ? gtiz_tree.node_label : data['initial_category'];
            select.value = value;
          } else {
            select.value = data['initial_category'];
          }
        } else {
          select.value = data['nothing'];
        }
  
      }
    });

  }

  if (data['layout_data'] && data['layout_data']['nodes_links']) {
    // setControlPanel(data['layout_data']['nodes_links'])
    console.log(data['layout_data']['nodes_links']);
  } else {
    // setControlPanel(default_control_panel_values);
    console.log('Default settings values');
  }

  if (gtiz_tree.current_metadata_file) {
    gtiz_file_handler.loadMetadataText(gtiz_tree.current_metadata_file);
  }

  // gtiz_tree.tree_interceptor(tree, (groupedNods) => console.log(groupedNods));
  gtiz_tree.tree_interceptor(tree, (groupedNods) => gtiz_tree.findNodes(groupedNods));
  // the node style cards follow the selection (hint, value shared by the selected nodes)
  tree.addNodesSelectedListener(() => gtiz_node_styles.refresh());
  // the menu items acting on the selection are enabled only with selected nodes
  tree.addNodesSelectedListener(() => gtiz_context.updateSelectionStates());
  gtiz_node_styles.refresh();

} //------------------------------- tree_loaded


/**
 * Tree loading status
 * 
 * @param {Object} tree Tree object
 * @param {String} msg Informative message about tree loading process status
 */
gtiz_tree.treeLoading = function(tree, msg) {
  if (msg === 'complete') {
    gtiz_tree.treeLoaded(tree);
  } else {
    console.log(msg);
  }
}

/**
 * Load tree process
 * 
 * @param {Object} data Object containing tree data coming from url parameters or files upload
 * @param {Boolean} json if true data is to be considered as a complete json tree
 *  
 */
gtiz_tree.loadMSTree = function(data, json) {
  gtiz_tree.metadata_options = {};
  // a new tree starts without the metadata of the previous one: the grid and the
  // samples column are set again when its metadata are loaded (or restored below
  // from a complete json)
  gtiz_metadata.reset();
  gtiz_file_handler.samples_column = undefined;
  // a new tree starts with the whole legend: its selection is empty
  gtiz_legend.selection_filter = false;
  gtiz_legend.setFilterIndicator(null);
  // order of the metadata columns: the one saved in a complete json, otherwise the
  // order of the metadata file (a zoom inherits it later, through applySettings)
  gtiz_metadata.columns_order = data.gtiz_metadata && Array.isArray(data.gtiz_metadata.columns_order) ? [...data.gtiz_metadata.columns_order] : [];
  if (gtiz_tree.tree) {
    gtiz_tree.tree.svg.remove();
    gtiz_tree.tree.legend_div.remove();
    gtiz_tree.tree.scale_div.remove();
    // Canvas migration: the tree mass is drawn on a <canvas> (base_tree.js
    // creates this.render_canvas). Remove it too, otherwise the old tree stays
    // painted under the newly loaded one (e.g. when loading a zoomed cluster).
    if (gtiz_tree.tree.render_canvas) {
      gtiz_tree.tree.render_canvas.remove();
    }
    
    if (gtiz_utils.medatadata_select_nodes && gtiz_utils.medatadata_select_nodes.length > 0) {
      gtiz_utils.medatadata_select_nodes.forEach((node) => {
        let select = document.querySelector(node);
        if (select) {
          select.innerHTML = '';
        }
      });
    }
  }
  gtiz_tree.tree = null;
  gtiz_tree.tree = new D3MSTree("graph-div", JSON.parse(JSON.stringify(data)), function(tree, msg) {
    gtiz_tree.treeLoading(tree, msg);
  });

  // a new tree starts unrotated; a complete session gives back its angle (below)
  gtiz_tree.tree_rotation = 0;

  // control if data contains configurations
  let file_handler = data.gtiz_file_handler;
  let layout = data.gtiz_layout;
  let settings = data.gtiz_settings;
  let map = data.gtiz_map;
  let legend = data.gtiz_legend;
  let metadata = data.gtiz_metadata;
  let video = data.gtiz_video;
  let locales = data.gtiz_locales;
  let localization = data.gtiz_metadata_localization;
  let zooms = data.gtiz_zooms;
  // the macros of the session join the library of the browser (the ones already
  // there are skipped)
  if (data.gtiz_macros && typeof gtiz_macros !== 'undefined') {
    gtiz_macros.importSession(data.gtiz_macros);
  }
  // the notes of the session replace the ones in memory, unless the same session
  // is being reloaded (zoom, original tree, undo of a macro)
  if (typeof gtiz_notes !== 'undefined') {
    gtiz_notes.loadSession(data.gtiz_notes);
  }
  if (file_handler) {
    gtiz_file_handler.samples_column = file_handler.samples_column;
  }
  if (map) {
    let geoJSON = map.geojson;
    if (geoJSON) {
      gtiz_map.setGeoJSON(geoJSON);
      // we need to call map definition points method due with the load JSON functions we don't call the loadMetadataText() as called by the loadNetFIles()
      // reset gtiz_map.load_count allow us to give an initial fitbounds on markers
      gtiz_map.load_count = 0;
    }
  }
  if (layout) {
    gtiz_layout.settings = layout.settings;
    if (!gtiz_map.geojson || gtiz_map.geojson == '') {
      gtiz_layout.map = 'off';
    } else {
      gtiz_layout.map = layout.map;
    }
    gtiz_layout.metadata = layout.metadata;
    gtiz_layout.legend = layout.legend;
    // a session without the value keeps the player on (setVideo also sets the icon of its trigger)
    gtiz_layout.setVideo(layout.video);
  }
  if (settings) {
    if (settings.cfg) {
      gtiz_settings.cfg.forEach(setting => {
        let card = settings.cfg.find(element => element.card === setting.card);
        // a session saved before a card existed (e.g. node-shape) keeps its default state
        if (card) {
          setting.expanded = card.expanded;
        }
      });
    }
    if (settings.tree) {
      gtiz_tree.rendering_mode = settings.tree.rendering_mode;
      gtiz_tree.rendering_dynamic_selected_only = settings.tree.rendering_dynamic_selected_only;
      gtiz_tree.rendering_static_real_branch_length = settings.tree.rendering_static_real_branch_length;
      gtiz_tree.show_node_labels = settings.tree.show_node_labels;
      gtiz_tree.node_label = settings.tree.node_label;
      gtiz_tree.node_label_font_size = settings.tree.node_label_font_size;
      gtiz_tree.individual_segments = settings.tree.individual_segments;
      gtiz_tree.node_radius_size = settings.tree.node_radius_size;
      gtiz_tree.node_kurtosis = settings.tree.node_kurtosis;
      gtiz_tree.node_collapsed_value = settings.tree.node_collapsed_value;
      gtiz_tree.show_branch_labels = settings.tree.show_branch_labels;
      gtiz_tree.branch_label_font_size = settings.tree.branch_label_font_size;
      gtiz_tree.branch_scaling = settings.tree.branch_scaling;
      gtiz_tree.branch_log_scale = settings.tree.branch_log_scale;
      gtiz_tree.branch_cutoffs_method = settings.tree.branch_cutoffs_method;
      gtiz_tree.label_to_highlight = settings.tree.label_to_highlight;
      gtiz_tree.tree_rotation = gtiz_tree.normalizeAngle(settings.tree.tree_rotation);
    }
    if (settings.map) {
      gtiz_map.default_delta_type = settings.map.default_delta_type;
      gtiz_map.default_delta = settings.map.default_delta;
      gtiz_map.point_min_radius = settings.map.point_min_radius;
      gtiz_map.point_max_radius = settings.map.point_max_radius;
      gtiz_map.markers_type = settings.map.markers_type;
    }
  }
  if (legend) {
    gtiz_legend.selection_mode = legend.selection_mode,
    gtiz_legend.view_mode = legend.view_mode,
    gtiz_legend.group_order = legend.group_order
    // sessions saved before the option have no scale and keep the default one
    if (legend.histogram_scale) {
      gtiz_legend.histogram_scale = legend.histogram_scale;
    }
    gtiz_legend.selection_map = legend.selection_map;
  }
  if (video) {
    gtiz_video.cfg = video.cfg;
  }
  if (locales) {
    gtiz_locales.languages = locales.languages;
    gtiz_locales.current = gtiz_locales.getActiveLanguageTerms();
    gtiz_locales.translate();
  }
  if (localization) {
    gtiz_file_handler.technical_columns = localization.technical_columns ? localization.technical_columns : {};
    gtiz_file_handler.technical_values = localization.technical_values ? localization.technical_values : {};
    gtiz_file_handler.metadata_localized = localization.localized ? true : false;
    gtiz_file_handler.metadata_source = localization.source;
    // align the url so the link stays shareable, without reloading the page. Only
    // for translated metadata: enabling the lookup of localized files for a
    // default dataset would mix translated and untranslated headers on zooms
    if (gtiz_file_handler.metadata_localized) {
      gtiz_locales.syncUrlLanguage(localization.lang);
    }
  }
  if (zooms) {
    gtiz_zooms.cfg = zooms.cfg,
    gtiz_zooms.category = zooms.category,
    gtiz_zooms.soi = zooms.soi,
    gtiz_zooms.thresholds_params = zooms.thresholds_params,
    gtiz_zooms.zooms_prefix = zooms.zooms_prefix,
    gtiz_zooms.zooms = zooms.zooms
  }
  if (metadata) {
    gtiz_metadata.init();
  }
  gtiz_legend.init();
  gtiz_video.init();
  gtiz_settings.init();
  gtiz_layout.init();
  gtiz_tree.saveOriginalTree();
}

gtiz_tree.treeStaticRedraw = function() {
  gtiz_tree.tree.refreshGraph();
}

gtiz_tree.treeCenter = function() {
  gtiz_tree.tree.centerGraph();
}

gtiz_tree.originalTree = function() {
  // improve with load json functions
  /* let tree = gtiz_tree.tree_raw;
  let geojson_obj = tree.geoJson;
  if (geojson_obj) {
    gtiz_map.setGeoJSON(geojson_obj);
  }
  let text = JSON.stringify(tree);
  gtiz_file_handler.loadTreeText(text); */
  let tree = gtiz_tree.original_tree;
  if (tree) {
    let text = JSON.stringify(tree);
    gtiz_tree.current_metadata_file = null;
    // the same session: the notes written meanwhile stay
    if (typeof gtiz_notes !== 'undefined') {
      gtiz_notes.keep_session = true;
    }
    gtiz_file_handler.loadTreeText(text, true);
  } else {
    console.log('Oops! Something went wrong.');
  }
}

/**
 * Initate tree loading
 * 
 * @param {String} msg Informative message about tree loading process
 * 
 */
gtiz_tree.initiateLoading = function(msg) {
  let tree_node = document.querySelector('#graph-div');
  if (tree_node) {
    tree_node.innerHTML = '';
  }

  if (gtiz_utils.medatadata_select_nodes && gtiz_utils.medatadata_select_nodes.length > 0) {
    gtiz_utils.medatadata_select_nodes.forEach((node) => {
      let select = document.querySelector(node);
      if (select) {
        select.innerHTML = '';
      }
    });
  }
  
  gtiz_tree.metadata_options = {};
  console.log(msg);
};

/**
 * Get the label shown in the load modal for the selected files
 *
 * A folder shows its name, loose files their names (up to the first three).
 *
 * @param {Object} set File set, see `gtiz_file_handler.buildFileSet`
 * @returns {String} Html label with icon
 */
gtiz_tree.getFileSetLabel = function(set) {
  let is_folder = set.files.some(item => item.path.includes('/')) || (set.files.length > 1 && set.name);
  let icon = is_folder ? 'tabler-folder' : (set.files.length > 1 ? 'tabler-files' : 'tabler-file');
  let text = set.name ? set.name : set.files.slice(0, 3).map(item => item.path).join(', ');
  if (!set.name && set.files.length > 3) {
    text += ' (+' + (set.files.length - 3) + ')';
  }
  // file names are user data: escape them before building the html label
  let span = document.createElement('span');
  span.textContent = text.slice(0, 60);
  return '<i class="tabler ' + icon + '"></i> ' + span.innerHTML;
}

/**
 * Build modal contents
 *
 * @param {String} mode `save` || `load`
 * 
 */
gtiz_tree.buildFileHandlerModalContents = function(mode) {
  let contents = [];
  let cfg;
  switch (mode) {
    case 'save':
      // group headings are part of the options, see `gtiz_file_handler.save_options`
      cfg = gtiz_file_handler.save_options;
      break;
    case 'load':
      cfg = gtiz_file_handler.load_options;
      break;
    default:
      console.log(`Sorry, we are out of ${mode}.`);
  }
  let form = document.createElement('div');
  form.setAttribute('class', 'modal-form');
  cfg.forEach(item => {
    // items can be shown only in some conditions, e.g. the export with zooms
    if (!gtiz_utils.isMenuItemVisible(item)) {
      return;
    }
    // heading of a group of options
    if (item.type == 'label') {
      let label = document.createElement('div');
      label.setAttribute('class', 'modal-label');
      label.innerHTML = typeof item.label === 'function' ? item.label() : item.label;
      form.append(label);
    }
    if (item.type == 'abutton') {
      let box = document.createElement('div'); 
      box.setAttribute('class', 'button-box');
      let a = document.createElement('a');
      a.setAttribute('class', 'modal-action');
      let icon = item.icon != '' ? '<i class="tabler ' + item.icon + '"></i> ' : '';
      a.innerHTML = icon + item.label;
      a.addEventListener('click', (e) => {
        item.function();
      });
      box.append(a);
      form.append(box);
    }
    if (item.type == 'file') {
      let box = document.createElement('div');
      box.setAttribute('class', 'input-box input-box input-box-file');
      if (item.label) {
        let label = document.createElement('div');
        label.setAttribute('class', 'form-label');
        let icon = item.icon != '' ? '<i class="tabler ' + item.icon + '"></i> ' : '';
        label.innerHTML = icon + item.label;
        box.append(label);
      }
      let label = document.createElement('label');
      label.setAttribute('for', 'm-upload-file');
      label.setAttribute('id', 'm-upload-file-label');
      label.setAttribute('class', 'input-file input-file-drag');
      label.innerHTML = '<i class="tabler tabler-upload"></i> ' + gtiz_locales.current.m_upload_file_label;
      label.addEventListener("drop", (ev) => {
        // Prevent default behavior (Prevent file from being opened)
        ev.stopPropagation();
        ev.preventDefault();
        let modal = document.querySelector('.modal');
        let feedback = modal.querySelector('.modal-feedback');
        feedback.innerHTML = '';
        // single files, several files, folders and zip packages are all accepted
        gtiz_file_handler.collectDroppedFiles(ev.dataTransfer).then((set) => {
          label.innerHTML = gtiz_tree.getFileSetLabel(set);
          item.listener(set);
        }).catch((error) => {
          console.error(error);
          feedback.classList.add('warning');
          feedback.innerHTML = '<p><i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.package_unreadable_msg + '</p>';
          feedback.classList.add('show');
        });
      });
      label.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
      label.addEventListener("dragenter", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
      box.append(label);
      let input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('name', 'file');
      if (item.id) {
        input.setAttribute('id', item.id);
      }
      if (item.accept) {
        input.setAttribute('accept', item.accept);
      }
      if (item.multiple) {
        input.setAttribute('multiple', '');
      }
      let events = ['change'];
      events.forEach((event) => {
        input.addEventListener(event, (e) => {
          if (input.files.length > 0) {
            let set = gtiz_file_handler.buildFileSet(input.files);
            label.innerHTML = gtiz_tree.getFileSetLabel(set);
            item.listener(set);
          }
        });
      });
      box.append(input);
      let button_box = document.createElement('div');
      button_box.setAttribute('class', 'button-box');
      let button = document.createElement('button');
      button.setAttribute('class', 'secondary');
      button.innerHTML = '<i class="tabler tabler-upload"></i> ' + gtiz_locales.current.upload;
      button.addEventListener('click', function(e) {
        item.function();
      });
      button_box.append(button);
      box.append(button_box);
      form.append(box);
    }
  });
  contents.push(form);
  return contents;
}

/**
 * Open the modal to handle saving/uploading operations
 * 
 * @param {String} mode `save` || `load`
 */
gtiz_tree.openFileHandlerModal = function(mode) {
	let title;
  let contents = gtiz_tree.buildFileHandlerModalContents(mode);
	switch (mode) {
		case 'save':
			title = gtiz_locales.current.save_spread;
			break;
		case 'load':
			title = gtiz_locales.current.load_spread;
			break;
		default:
			title = undefined;
			break;
	}
	gtiz_modal.buildModal(title, contents);
}

/**
 * Apply a shape or a border to the selected nodes (all their samples).
 * Nothing happens when no node is selected, as for the other actions on the
 * selection; the node style cards say so with their hint.
 *
 * @param {String} kind 'shapes' or 'borders'
 * @param {String} value Shape or border name
 * @returns {undefined}
 */
gtiz_tree.setSelectedNodesStyle = function(kind, value) {
  if (!value) {
    return;
  }
  let selected = gtiz_tree.tree.getSelectedNodeIDs();
  gtiz_tree.tree.setNodesStyle(selected, kind, value);
  // the open cards show the value now shared by the selection
  gtiz_node_styles.refresh();
}

/**
 * Bring every node of the tree back to the circle with the normal border
 * (a few nodes are reset choosing circle and normal in the node style card).
 *
 * @returns {undefined}
 */
gtiz_tree.resetNodesStyle = function() {
  gtiz_tree.tree.setNodeStyles(null);
  gtiz_node_styles.refresh();
}

/**
 * Ask for confirmation before resetting the shapes and borders of every node: the
 * reset cannot be undone.
 *
 * @returns {undefined}
 */
gtiz_tree.confirmResetNodesStyle = function() {
  let text = document.createElement('p');
  text.textContent = gtiz_locales.current.reset_nodes_style_confirm;
  let button_box = document.createElement('div');
  button_box.setAttribute('class', 'modal-confirm-actions');
  // icon before the text, as the other buttons of the modals
  let reset = document.createElement('button');
  let reset_icon = document.createElement('i');
  reset_icon.setAttribute('class', 'tabler tabler-restore');
  reset.append(reset_icon, document.createTextNode(' ' + gtiz_locales.current.reset));
  reset.addEventListener('click', () => {
    // through the item of the macros, so a recording notes it
    gtiz_node_styles.runItem('node-shape-reset');
    gtiz_modal.closeModal();
  });
  let cancel = document.createElement('button');
  cancel.setAttribute('class', 'button-tertiary-outline');
  let cancel_icon = document.createElement('i');
  cancel_icon.setAttribute('class', 'tabler tabler-circle-x');
  cancel.append(cancel_icon, document.createTextNode(' ' + gtiz_locales.current.cancel));
  cancel.addEventListener('click', () => {
    gtiz_modal.closeModal();
  });
  button_box.append(reset, cancel);
  gtiz_modal.buildModal(gtiz_locales.current.reset_nodes_style, [text, button_box]);
}

gtiz_tree.context_menu = [{
  type : 'toggle',
  id : 'tree-tooltip-toggle',
  options : [{
    label : () => {
      return gtiz_locales.current.show_tooltips;
    },
      value : 'show_tooltips',
      icon : 'tabler-eye'
    }, {
      label : () => {
        return gtiz_locales.current.show_tooltips;
      },
      value : 'hide_tooltips',
      icon : 'tabler-eye-off'
  }],
  selected : () => {
    return  gtiz_tree.show_node_tooltips;
  },
  function : (value) => {
    gtiz_tree.toggleNodeToolTipVisibility(value);
  }
}, {
  type : 'separator'
}, {
  type : 'abutton',
  id : 'tree-menu-centre-tree',
  label : () => {
    return gtiz_locales.current.centre_tree;
  },
  icon : 'tabler-target',
  function : () => {
    gtiz_tree.treeCenter();
  }
}, {
  type : 'abutton',
  id : 'tree-menu-static-redraw',
  // undo: the positions of the nodes before the redraw (js/history.js)
  undo : 'positions',
  label : () => {
    return gtiz_locales.current.static_redraw;
  },
  icon : 'tabler-pencil',
  function : () => {
    gtiz_tree.treeStaticRedraw();
  }
}, {
  type : 'abutton',
  id : 'tree-menu-original-tree',
  label : () => {
    return gtiz_locales.current.original_tree;
  },
  icon : 'tabler-device-desktop',
  function : () => {
    gtiz_context.closeContextMenu('tree');
    gtiz_tree.originalTree();
  }
}, {
  type : 'separator'
}, {
  type : 'toggle',
  id : 'tree-hypothetical-toggle',
  options : [{
      label : () => {
        return gtiz_locales.current.show_hypothetical;
      },
      value : 'show_hypo',
      icon : 'tabler-eye'
    }, {
      label : () => {
        return gtiz_locales.current.show_hypothetical;
      },
      value : 'hide_hypo',
      icon : 'tabler-eye-off'
  }],
  selected : () => {
    return  gtiz_tree.show_hypothetical;
  },
  function : (value) => {
    gtiz_tree.toggleHypotetical(value);
  }
}, {
  type : 'separator'
}, {
  type : 'abutton',
  id : 'tree-menu-select-all',
  label : () => {
    return gtiz_locales.current.select_all;
  },
  icon : 'tabler-circle-check',
  function : () => {
    gtiz_tree.tree.selectAll();
  }
}, {
  type : 'abutton',
  id : 'tree-menu-deselect-all',
  label : () => {
    return gtiz_locales.current.deselect_all;
  },
  icon : 'tabler-circle-minus',
  function : () => {
    gtiz_tree.tree.clearSelection();
  }
}, {
  type: 'separator'
}, {
  type : 'abutton',
  id : 'tree-menu-collapse-selected',
  // undo: the whole session, the tree changes (js/history.js)
  undo : 'structure',
  requires_selection : true,
  label : () => {
    return gtiz_locales.current.collapse_selected_nodes;
  },
  icon : 'tabler-arrows-minimize',
  function : () => {
    let selected = gtiz_tree.tree.getSelectedNodeIDs();
    gtiz_tree.tree.collapseSpecificNodes(selected);
  }
}, {
  type : 'abutton',
  id : 'tree-menu-expand-selected',
  // undo: the whole session, the tree changes (js/history.js)
  undo : 'structure',
  requires_selection : true,
  label : () => {
    return gtiz_locales.current.expand_selected_nodes;
  },
  icon : 'tabler-arrows-maximize',
  function : () => {
    let selected = gtiz_tree.tree.getSelectedNodeIDs();
    gtiz_tree.tree.collapseSpecificNodes(selected, true);
  }
}, {
  type : 'abutton',
  id : 'tree-menu-expand-all',
  // undo: the whole session, the tree changes (js/history.js)
  undo : 'structure',
  label : () => {
    return gtiz_locales.current.expand_all;
  },
  icon : 'tabler-circle-check',
  function : () => {
    gtiz_tree.tree.manual_collapsing = {};
		gtiz_tree.tree.collapseNodes(0);
  }
}, {
  type : 'separator'
}, {
  type : 'abutton',
  id : 'tree-menu-hide-selected',
  // undo: the whole session, the tree changes (js/history.js)
  undo : 'structure',
  requires_selection : true,
  label : () => {
    return gtiz_locales.current.hide_selected_nodes;
  },
  icon : 'tabler-eye-off',
  function : () => {
    let selected = gtiz_tree.tree.getSelectedNodeIDs();
    gtiz_tree.tree.delNodes(selected);
  }
}, {
  type : 'abutton',
  id : 'tree-menu-show-selected-subtrees',
  // undo: the whole session, the tree changes (js/history.js)
  undo : 'structure',
  requires_selection : true,
  label : () => {
    return gtiz_locales.current.show_selected_subtrees;
  },
  icon : 'tabler-eye',
  function : () => {
    let selected = gtiz_tree.tree.getSelectedNodeIDs();
    gtiz_tree.tree.delOtherNodes(selected);
  }
}, {
  type : 'abutton',
  id : 'tree-menu-show-whole-tree',
  // undo: the whole session, the tree changes (js/history.js)
  undo : 'structure',
  label : () => {
    return gtiz_locales.current.show_whole_tree;
  },
  icon : 'tabler-hierarchy',
  function : () => {
    gtiz_tree.tree.undeleteNodes();
  }
}, {
  type : 'separator'
}, {
  type : 'abutton',
  id : 'tree-menu-add-note',
  // notes are contents, not settings of the view: never in a macro
  macro : false,
  requires_selection : true,
  label : () => {
    return gtiz_locales.current.add_note_to_selected;
  },
  icon : 'tabler-notes',
  function : () => {
    gtiz_notes.addNoteFromSelection();
  }
}, {
  type : 'toggle',
  id : 'tree-menu-note-marks',
  options : [{
    label : () => {
      return gtiz_locales.current.notes_on_tree;
    },
    value : 'show',
    icon : 'tabler-eye'
  }, {
    label : () => {
      return gtiz_locales.current.notes_on_tree;
    },
    value : 'hide',
    icon : 'tabler-eye-off'
  }],
  selected : () => {
    return gtiz_notes.show_marks ? 'show' : 'hide';
  },
  function : (value) => {
    gtiz_notes.setMarksVisibility(value === 'show');
  }
}, {
  type : 'separator',
  hide_in_read_only: true
}, {
  type : 'abutton',
  id : 'tree-menu-save-spread',
  macro : false,
  hide_in_read_only: true,
  label : () => {
    return gtiz_locales.current.save_spread
  },
  icon : 'tabler-folder',
  function : () => {
    let mode = 'save';
    gtiz_tree.openFileHandlerModal(mode);
  }
}, {
  type : 'abutton',
  id : 'tree-menu-load-spread',
  macro : false,
  hide_in_read_only: true,
  label : () => {
    return gtiz_locales.current.load_spread
  },
  icon : 'tabler-file-plus',
  function : () => {
    let mode = 'load';
    gtiz_tree.openFileHandlerModal(mode);
  }
}, {
  type : 'separator',
  hide_in_read_only: true
}, {
  type: 'abutton_optioned',
  id: 'tree-menu-download-image',
  hide_in_read_only: true,
  label: () => {
    return gtiz_locales.current.download_image;
  },
  icon : 'tabler-photo',
  // Canvas migration: the tree is drawn on a <canvas>, so the PNG export is
  // rasterised from the canvas (current zoom/pan, only the visible portion).
  // The SVG export is rebuilt as vector from the tree model and always contains
  // the WHOLE tree (full extent), regardless of the current zoom.
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
    let timestamp =  Date.now();
    if (format === 'svg') {
      let name = "spread" + timestamp + ".svg";
      gtiz_tree.tree.exportSvg(name);
    } else {
      let name = "spread" + timestamp + ".png";
      let width = gtiz_tree.png_width ? gtiz_tree.png_width : 2400;
      gtiz_tree.tree.exportImage(width, name);
    }
  }
}];

/*
*
* Rotation of the tree, in the static layout: Alt (Option) + drag on the tree,
* Alt + left or right arrow with the pointer over the tree (steps of 15°), and
* the Rotation setting of the Rendering card (an absolute angle, from the layout
* loaded). The nodes turn around the centre of the tree; the angle is kept in
* the complete session. Every rotation is part of the undo history (js/history.js)
* as the Rotation setting, with the node positions.
*
*/
gtiz_tree.tree_rotation = 0;
gtiz_tree.rotation_step = 15;

/**
 * Angle in the 0-359 range
 *
 * @param {Number} angle Angle in degrees
 * @returns {Number} The same angle, from 0 to 359
 */
gtiz_tree.normalizeAngle = function(angle) {
  let value = Math.round(Number(angle) || 0) % 360;
  return value < 0 ? value + 360 : value;
}

/**
 * Tell if the tree can be rotated: a tree is loaded and the layout is static
 * (in the dynamic one the simulation moves the nodes)
 *
 * @returns {Boolean} True when it can be rotated
 */
gtiz_tree.canRotate = function() {
  return !!gtiz_tree.tree && gtiz_tree.rendering_mode !== 'dynamic';
}

/**
 * Rotate the tree by an angle around its centre
 *
 * @param {Number} degrees Angle in degrees, clockwise
 * @returns {undefined}
 */
gtiz_tree.rotateTreeBy = function(degrees) {
  let tree = gtiz_tree.tree;
  let delta = Number(degrees) || 0;
  if (!gtiz_tree.canRotate() || delta === 0 || !tree.force_nodes || tree.force_nodes.length === 0) {
    return;
  }
  // centre of the nodes, so the tree turns in place
  let min_x = Infinity, max_x = -Infinity, min_y = Infinity, max_y = -Infinity;
  tree.force_nodes.forEach(node => {
    min_x = Math.min(min_x, node.x);
    max_x = Math.max(max_x, node.x);
    min_y = Math.min(min_y, node.y);
    max_y = Math.max(max_y, node.y);
  });
  let cx = (min_x + max_x) / 2;
  let cy = (min_y + max_y) / 2;
  let radians = delta * Math.PI / 180;
  let cos = Math.cos(radians);
  let sin = Math.sin(radians);
  tree.force_nodes.forEach(node => {
    let dx = node.x - cx;
    let dy = node.y - cy;
    node.x = cx + dx * cos - dy * sin;
    node.y = cy + dx * sin + dy * cos;
    node.px = node.x;
    node.py = node.y;
  });
  if (tree.renderer) {
    tree.renderer.invalidateIndex();
    tree.renderer.requestRedraw();
  }
  gtiz_tree.tree_rotation = gtiz_tree.normalizeAngle(gtiz_tree.tree_rotation + delta);
  gtiz_tree.updateRotationControls();
}

/**
 * Rotate the tree to an angle (the Rotation setting)
 *
 * @param {Number} angle Angle in degrees, from the layout loaded
 * @returns {undefined}
 */
gtiz_tree.rotateTreeTo = function(angle) {
  let target = gtiz_tree.normalizeAngle(angle);
  let delta = target - gtiz_tree.tree_rotation;
  // the shortest way round
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }
  gtiz_tree.rotateTreeBy(delta);
}

/**
 * Show the angle in the Rotation setting and disable it in the dynamic layout
 *
 * @returns {undefined}
 */
gtiz_tree.updateRotationControls = function() {
  let disabled = !gtiz_tree.canRotate();
  ['tree-rotation-slider', 'tree-rotation'].forEach(id => {
    let input = document.getElementById(id);
    if (!input) {
      return;
    }
    input.value = gtiz_tree.tree_rotation;
    input.disabled = disabled;
    let box = input.closest('.slider-box, .input-box');
    if (box) {
      box.classList.toggle('disabled', disabled);
    }
  });
}

/**
 * Item of the Rotation setting, recorded in the undo history for the rotations
 * made on the tree
 *
 * @returns {Object|undefined} The number item of the Rendering card
 */
gtiz_tree.rotationItem = function() {
  let card = gtiz_settings.cfg.find(setting => setting.card === 'rendering');
  return card ? card.menu.find(item => item && item.id === 'tree-rotation') : undefined;
}

/**
 * Record a rotation made on the tree (drag, arrows) in the undo history
 *
 * @param {Number} before Angle before the rotation
 * @param {Object} positions Node positions before the rotation
 * @returns {undefined}
 */
gtiz_tree.recordRotation = function(before, positions) {
  let item = gtiz_tree.rotationItem();
  if (item && typeof gtiz_history !== 'undefined' && gtiz_history.isTracking()) {
    gtiz_history.recordValue('settings/rendering', item, before, gtiz_tree.tree_rotation, positions);
  }
}

/**
 * Capture the node positions for the undo history, when it records
 *
 * @returns {Object|null} Positions, null when the history does not record
 */
gtiz_tree.rotationPositions = function() {
  if (typeof gtiz_history === 'undefined' || !gtiz_history.isTracking()) {
    return null;
  }
  return gtiz_history.scopes.positions.capture();
}

/**
 * Alt + drag on the tree rotates it; Alt + left or right arrow, with the pointer
 * over the tree, rotates it by 15°
 *
 * @returns {undefined}
 */
gtiz_tree.initRotation = function() {
  let graph = document.getElementById('graph-div');
  let card = document.querySelector('.tree-container');
  if (!graph || !card) {
    return;
  }
  let over_tree = false;
  card.addEventListener('mouseenter', () => { over_tree = true; });
  card.addEventListener('mouseleave', () => { over_tree = false; });

  // drag: captured before the zoom and the node drag of the tree, which never see it
  graph.addEventListener('mousedown', function(e) {
    if (!e.altKey || e.button !== 0 || !gtiz_tree.canRotate()) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    let tree = gtiz_tree.tree;
    let rect = tree.svg.node().getBoundingClientRect();
    // centre of the tree on screen
    let min_x = Infinity, max_x = -Infinity, min_y = Infinity, max_y = -Infinity;
    tree.force_nodes.forEach(node => {
      min_x = Math.min(min_x, node.x);
      max_x = Math.max(max_x, node.x);
      min_y = Math.min(min_y, node.y);
      max_y = Math.max(max_y, node.y);
    });
    let centre_x = rect.left + tree.translate[0] + (min_x + max_x) / 2 * tree.scale;
    let centre_y = rect.top + tree.translate[1] + (min_y + max_y) / 2 * tree.scale;
    let pointer_angle = (ev) => Math.atan2(ev.clientY - centre_y, ev.clientX - centre_x) * 180 / Math.PI;
    let last = pointer_angle(e);
    let before = gtiz_tree.tree_rotation;
    let positions = gtiz_tree.rotationPositions();
    // the angle next to the cursor (only its position is set here, the rest is in dashboard.css)
    let helper = document.createElement('div');
    helper.setAttribute('class', 'tree-rotation-angle');
    let place = (ev) => {
      helper.style.left = (ev.clientX + 12) + 'px';
      helper.style.top = (ev.clientY + 12) + 'px';
      helper.textContent = gtiz_tree.tree_rotation + '\xB0';
    };
    place(e);
    document.body.append(helper);
    document.body.classList.add('no-select');
    let onMove = function(ev) {
      let current = pointer_angle(ev);
      let delta = current - last;
      if (delta > 180) {
        delta -= 360;
      } else if (delta < -180) {
        delta += 360;
      }
      // whole degrees, the rest is kept for the next move
      let step = Math.trunc(delta);
      if (step !== 0) {
        gtiz_tree.rotateTreeBy(step);
        last += step;
      }
      place(ev);
    };
    let onUp = function() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('no-select');
      helper.remove();
      if (positions && gtiz_tree.tree_rotation !== before) {
        gtiz_tree.recordRotation(before, positions);
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, true);

  // arrows: not in text fields, the browser keeps them there
  document.addEventListener('keydown', function(e) {
    if (!e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) {
      return;
    }
    if (!over_tree || !gtiz_tree.canRotate()) {
      return;
    }
    if (typeof gtiz_history !== 'undefined' && gtiz_history.isEditing(e)) {
      return;
    }
    e.preventDefault();
    let before = gtiz_tree.tree_rotation;
    let positions = gtiz_tree.rotationPositions();
    gtiz_tree.rotateTreeBy(e.key === 'ArrowRight' ? gtiz_tree.rotation_step : -gtiz_tree.rotation_step);
    if (positions) {
      gtiz_tree.recordRotation(before, positions);
    }
  });
}

/*
*
* Shortcuts of the tree: a box opened by the trigger at the bottom right of the
* tree card (the place of the old rotation icon), closed by its close trigger
* (top right), the trigger, Esc or a click elsewhere. Keys are written as on the platform (⌘ ⌥ ⇧ on a Mac).
*
*/

/**
 * Rows of the shortcuts box
 *
 * @returns {Array} Rows `{ keys: [String|Array], text: String }`; a key given as an
 * array lists alternatives (e.g. either arrow)
 */
gtiz_tree.shortcutRows = function() {
  let t = gtiz_locales.current;
  let mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  let command = mac ? '⌘' : 'Ctrl';
  let alt = mac ? '⌥' : 'Alt';
  let shift = mac ? '⇧' : t.shortcut_shift;
  let rows = [
    { keys : [t.shortcut_wheel], text : t.shortcut_zoom },
    { keys : [t.shortcut_drag], text : t.shortcut_pan },
    { keys : [t.shortcut_drag_node], text : t.shortcut_move_node },
    { keys : [shift, t.shortcut_drag], text : t.shortcut_select },
    { keys : [alt, t.shortcut_drag], text : t.shortcut_rotate },
    // the arrows are alternatives: either of them
    { keys : [alt, ['←', '→']], text : t.shortcut_rotate_step },
    { keys : [command, 'Z'], text : t.shortcut_undo },
    { keys : [command, shift, 'Z'], text : t.shortcut_redo }
  ];
  if (!mac) {
    rows.push({ keys : ['Ctrl', 'Y'], text : t.shortcut_redo });
  }
  return rows;
}

/**
 * Build the contents of the shortcuts box
 *
 * @param {Element} box The box
 * @param {Function} close Closes the box (its close trigger, top right)
 * @returns {undefined}
 */
gtiz_tree.buildShortcuts = function(box, close) {
  // close trigger as the one of the notifications of the card
  let close_trigger = document.createElement('div');
  close_trigger.setAttribute('class', 'notifier-close tree-shortcuts-close');
  close_trigger.setAttribute('role', 'button');
  close_trigger.setAttribute('tabindex', '0');
  close_trigger.setAttribute('title', gtiz_locales.current.close);
  let close_icon = document.createElement('i');
  close_icon.setAttribute('class', 'tabler tabler-circle-x');
  close_trigger.append(close_icon);
  close_trigger.addEventListener('click', close);
  close_trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      close();
    }
  });
  let title = document.createElement('div');
  title.setAttribute('class', 'tree-shortcuts-title');
  title.textContent = gtiz_locales.current.tree_shortcuts;
  // one row per shortcut: the action first, then its keys (right aligned in the css)
  let list = document.createElement('ul');
  list.setAttribute('class', 'tree-shortcuts-list');
  gtiz_tree.shortcutRows().forEach(row => {
    let item = document.createElement('li');
    item.setAttribute('class', 'tree-shortcuts-row');
    let keys = document.createElement('span');
    keys.setAttribute('class', 'tree-shortcuts-keys');
    row.keys.forEach((key, index) => {
      if (index > 0) {
        keys.append(' + ');
      }
      (Array.isArray(key) ? key : [key]).forEach((alternative, position) => {
        if (position > 0) {
          keys.append(' / ');
        }
        let kbd = document.createElement('kbd');
        kbd.textContent = alternative;
        keys.append(kbd);
      });
    });
    let text = document.createElement('span');
    text.setAttribute('class', 'tree-shortcuts-text');
    text.textContent = row.text;
    item.append(text, keys);
    list.append(item);
  });
  box.replaceChildren(close_trigger, title, list);
}

/**
 * Bind the trigger of the shortcuts box
 *
 * @returns {undefined}
 */
gtiz_tree.initShortcuts = function() {
  let trigger = document.querySelector('.tree-shortcuts-trigger');
  let box = document.querySelector('.tree-shortcuts');
  if (!trigger || !box) {
    return;
  }
  trigger.setAttribute('title', gtiz_locales.current.tree_shortcuts);
  let show = (open) => {
    if (open) {
      gtiz_tree.buildShortcuts(box, () => show(false));
    }
    box.hidden = !open;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  trigger.addEventListener('click', () => show(box.hidden));
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      show(box.hidden);
    }
  });
  document.addEventListener('click', (e) => {
    if (!box.hidden && !box.contains(e.target) && !trigger.contains(e.target)) {
      show(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !box.hidden) {
      show(false);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  gtiz_tree.initRotation();
  gtiz_tree.initShortcuts();
});
