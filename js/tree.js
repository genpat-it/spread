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
gtiz_tree.link_elements_controller = 1000;
gtiz_tree.performance_choice_done = false;
gtiz_tree.png_width = 2400;

gtiz_tree.distance_cfg = {
  loopCount: 10000,
  svgCircleRadius: 400,
  performanceThresholds: {
    high: 30,
    medium: 70
  },
  scaleFactors: {
    high: 0.2,
    medium: 0.4,
    low: 0.8
  }
};

/**
 * Check browser performance and suggest a best link distance to collapse branches.
 * 
 * 
 */
gtiz_tree.checkBestLinkDistanceUtil = function() {
  let distance = gtiz_tree.tree.max_link_distance;
  let links = gtiz_tree.tree.link_elements[0].length;
  if (links > gtiz_tree.link_elements_controller && !gtiz_tree.performance_choice_done) {
    // Create an instance of LinkDistanceOptimizer
    let best_distance = gtiz_optimizer.getBestLinkDistance(distance, gtiz_tree.distance_cfg);
    best_distance = Math.floor(best_distance);
    if (best_distance != 0 && best_distance != gtiz_tree.node_collapsed_value) {
      let component = document.querySelector('.tree-container');
      let container = document.createElement('div');
      container.setAttribute('class', 'tree-card-message');
      container.setAttribute('id', 'tree-best-distance-advice');

      let body = document.createElement('div');
      body.setAttribute('class', 'tree-card-message-body');

      let icon = document.createElement('div');
      icon.setAttribute('class', 'icon');
      icon.innerHTML = '<i class="iconic iconic-warning-triangle"></i>'
      body.append(icon);

      let text = document.createElement('p');
      let message = gtiz_locales.current.possible_performance_issues_message;
      text.innerHTML = message.replace('{0}', best_distance);
      body.append(text);
      
      let actions = document.createElement('div');
      actions.setAttribute('class', 'tree-card-message-actions');
      
      let apply = document.createElement('button');
      apply.innerHTML = gtiz_locales.current.collapse_branches;
      apply.addEventListener('click', (e) => {
        gtiz_tree.collapseBranches(best_distance);
        gtiz_tree.performance_choice_done = true;
        gtiz_tree.tree.centerGraph();
        container.remove();
      });

      let ignore = document.createElement('button');
      ignore.setAttribute('class', 'secondary');
      ignore.innerHTML = gtiz_locales.current.im_fine_thanks;
      ignore.addEventListener('click', (e) => {
        gtiz_tree.performance_choice_done = true;
        container.remove();
      });
      
      actions.append(apply);
      actions.append(ignore);

      container.append(body);
      container.append(actions);

      component.append(container);
    }
  }
}

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

    if (metadata) {
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
        }, {
          type: 'video',
          value: bkp.gtiz_layout.video
        }, {
          type: 'fullscreen',
          value: bkp.gtiz_layout.fullscreen
      }];
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
        }, {
          type: 'video',
          value: 'on'
        }, {
          type: 'fullscreen',
          value: 'off'
      }];
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
      label_to_highlight : gtiz_tree.label_to_highlight,
      link_elements_controller : gtiz_tree.link_elements_controller
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
		group_order : gtiz_legend.group_order,
		selection_map : gtiz_legend.getSelectionMap()
	};
  obj.gtiz_metadata = {
		show_nodes : gtiz_metadata.show_nodes,
		show_hypothetical : gtiz_metadata.show_hypothetical
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
      label_to_highlight : gtiz_tree.label_to_highlight,
      link_elements_controller : gtiz_tree.link_elements_controller
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
		group_order : gtiz_legend.group_order,
		selection_map : gtiz_legend.getSelectionMap()
	};
  obj.gtiz_metadata = {
		show_nodes : gtiz_metadata.show_nodes,
		show_hypothetical : gtiz_metadata.show_hypothetical
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
      icon.setAttribute('class', 'iconic iconic-check-circle-empty');
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
}

gtiz_tree.toggleHypotetical = function(value) {
  gtiz_tree.show_hypothetical = value;
  gtiz_tree.tree.toggleHypotheticalNodes();
}

gtiz_tree.toggleNodeToolTipVisibility = function(value) {
  gtiz_tree.show_node_tooltips = value;
}

gtiz_tree.showToolTip = function(msg, e) {
  gtiz_tree.tree_node_tooltip = d3.select("body")
			.append("div")
			.attr("class", "tree-node-tooltip")
			.style("opacity", 0);
  if (!e) {
    e = d3.event;
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
  tree.addSegmentOverListener(function(d) {
    if (gtiz_tree.show_node_tooltips == 'show_tooltips') {
      let display = d.data.type;
      gtiz_tree.showToolTip(display+ '(' + d.data.value + ')');
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
  tree.addLinkOverListener(function(d) {
    // console.log("Length: " + d.value);
    if (gtiz_tree.show_node_tooltips == 'show_tooltips') {
      gtiz_tree.showToolTip("length:" + d.value);
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
    gtiz_legend.legend_colour_chooser.spectrum("set", data.colour);
    gtiz_legend.legend_colour_chooser.data({"value": data.value.split("  [")[0], "category":data.category});
    setTimeout(function(){gtiz_legend.legend_colour_chooser.spectrum("show");}, 50);
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
  if (gtiz_tree.tree) {
    gtiz_tree.tree.svg.remove();
    gtiz_tree.tree.legend_div[0].remove();
    gtiz_tree.tree.scale_div[0].remove();
    
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

  // control if data contains configurations
  let file_handler = data.gtiz_file_handler;
  let layout = data.gtiz_layout;
  let settings = data.gtiz_settings;
  let map = data.gtiz_map;
  let legend = data.gtiz_legend;
  let metadata = data.gtiz_metadata;
  let video = data.gtiz_video;
  let locales = data.gtiz_locales;
  let zooms = data.gtiz_zooms;
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
    gtiz_layout.video = layout.video;
  }
  if (settings) {
    if (settings.cfg) {
      gtiz_settings.cfg.forEach(setting => {
        let card = settings.cfg.find(element => element.card === setting.card);
        setting.expanded = card.expanded;
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
      gtiz_tree.link_elements_controller = settings.tree.link_elements_controller;
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
      cfg = gtiz_file_handler.save_options;
      let label = document.createElement('div');
      label.setAttribute('class', 'modal-label');
      contents.push(label);
      label.innerHTML = gtiz_locales.current.select_format_to_download;
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
    if (item.type == 'abutton') {
      let box = document.createElement('div'); 
      box.setAttribute('class', 'button-box');
      let a = document.createElement('a');
      a.setAttribute('class', 'modal-action');
      let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
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
        let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
        label.innerHTML = icon + item.label;
        box.append(label);
      }
      let label = document.createElement('label');
      label.setAttribute('for', 'm-upload-file');
      label.setAttribute('id', 'm-upload-file-label');
      label.setAttribute('class', 'input-file input-file-drag');
      label.innerHTML = '<i class="iconic iconic-upload"></i> ' + gtiz_locales.current.m_upload_file_label;
      label.addEventListener("drop", (ev) => {
        // Prevent default behavior (Prevent file from being opened)
        ev.stopPropagation();
        ev.preventDefault();
        let modal = document.querySelector('.modal');
        let feedback = modal.querySelector('.modal-feedback');
        feedback.innerHTML = '';
        let files = ev.dataTransfer.files;
        if (files.length === 1) {
          let file_name = files[0].name;
          label.innerHTML = '<i class="iconic iconic-file"></i> ' + file_name;
          item.listener(files);
        } else {
          feedback.classList.add('info');
          feedback.innerHTML = '<p><i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.dropped_files_alert + '</p>';
          feedback.classList.add('show');
        }
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
      let events = ['change'];
      events.forEach((event) => {
        input.addEventListener(event, (e) => {
          let path = e.target.value;
          let file_name = path.split("\\").pop();
          file_name = file_name.slice(0, 21);
          if (file_name) {
            label.innerHTML = '<i class="iconic iconic-file"></i> ' + file_name;
            item.listener(input.files);
          }
        });
      });
      box.append(input);
      let button_box = document.createElement('div');
      button_box.setAttribute('class', 'button-box');
      let button = document.createElement('button');
      button.setAttribute('class', 'secondary');
      button.innerHTML = '<i class="iconic iconic-upload"></i> ' + gtiz_locales.current.upload;
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

gtiz_tree.context_menu = [{
  type : 'toggle',
  id : 'tree-tooltip-toggle',
  options : [{
    label : () => {
      return gtiz_locales.current.show_tooltips;
    },
      value : 'show_tooltips',
      icon : 'iconic-eye'
    }, {
      label : () => {
        return gtiz_locales.current.show_tooltips;
      },
      value : 'hide_tooltips',
      icon : 'iconic-eye-off'
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
  label : () => {
    return gtiz_locales.current.centre_tree;
  },
  icon : 'iconic-target',
  function : () => {
    gtiz_tree.treeCenter();
  }
}, {
  type : 'abutton',
  label : () => {
    return gtiz_locales.current.static_redraw;
  },
  icon : 'iconic-edit',
  function : () => {
    gtiz_tree.treeStaticRedraw();
  }
}, {
  type : 'abutton',
  label : () => {
    return gtiz_locales.current.original_tree;
  },
  icon : 'iconic-monitor',
  function : () => {
    gtiz_context.closeContextMenu('tree');
    gtiz_tree.originalTree();
  }
}, {
  type : 'separator'
}, {
  type : 'toggle',
  id : 'tree-tooltip-toggle',
  options : [{
      label : () => {
        return gtiz_locales.current.show_hypothetical;
      },
      value : 'show_hypo',
      icon : 'iconic-eye'
    }, {
      label : () => {
        return gtiz_locales.current.show_hypothetical;
      },
      value : 'hide_hypo',
      icon : 'iconic-eye-off'
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
  label : () => {
    return gtiz_locales.current.select_all;
  },
  icon : 'iconic-check-circle',
  function : () => {
    gtiz_tree.tree.selectAll();
  }
}, {
  type : 'abutton',
  label : () => {
    return gtiz_locales.current.deselect_all;
  },
  icon : 'iconic-minus-circle',
  function : () => {
    gtiz_tree.tree.clearSelection();
  }
}, {
  type: 'separator'
}, {
  type : 'abutton',
  label : () => {
    return gtiz_locales.current.collapse_selected_nodes;
  },
  icon : 'iconic-minimize',
  function : () => {
    let selected = gtiz_tree.tree.getSelectedNodeIDs();
    gtiz_tree.tree.collapseSpecificNodes(selected);
  }
}, {
  type : 'abutton',
  label : () => {
    return gtiz_locales.current.expand_selected_nodes;
  },
  icon : 'iconic-maximize',
  function : () => {
    let selected = gtiz_tree.tree.getSelectedNodeIDs();
    gtiz_tree.tree.collapseSpecificNodes(selected, true);
  }
}, {
  type : 'abutton',
  label : () => {
    return gtiz_locales.current.expand_all;
  },
  icon : 'iconic-check-circle',
  function : () => {
    gtiz_tree.tree.manual_collapsing = {};
		gtiz_tree.tree.collapseNodes(0);
  }
}, {
  type : 'separator'
}, {
  type : 'abutton',
  label : () => {
    return gtiz_locales.current.hide_selected_nodes;
  },
  icon : 'iconic-eye-off',
  function : () => {
    let selected = gtiz_tree.tree.getSelectedNodeIDs();
    gtiz_tree.tree.delNodes(selected);
  }
}, {
  type : 'abutton',
  label : () => {
    return gtiz_locales.current.show_selected_subtrees;
  },
  icon : 'iconic-eye',
  function : () => {
    let selected = gtiz_tree.tree.getSelectedNodeIDs();
    gtiz_tree.tree.delOtherNodes(selected);
  }
}, {
  type : 'abutton',
  label : () => {
    return gtiz_locales.current.show_whole_tree;
  },
  icon : 'iconic-relation-graph',
  function : () => {
    gtiz_tree.tree.undeleteNodes();
  }
}, {
  type : 'separator',
  hide_in_read_only: true
}, {
  type : 'abutton',
  hide_in_read_only: true,
  label : () => {
    return gtiz_locales.current.save_spread
  },
  icon : 'iconic-folder',
  function : () => {
    let mode = 'save';
    gtiz_tree.openFileHandlerModal(mode);
  }
}, {
  type : 'abutton',
  hide_in_read_only: true,
  label : () => {
    return gtiz_locales.current.load_spread
  },
  icon : 'iconic-file-plus',
  function : () => {
    let mode = 'load';
    gtiz_tree.openFileHandlerModal(mode);
  }
}, {
  type : 'separator',
  hide_in_read_only: true
}, {
  type: 'abutton_optioned',
  hide_in_read_only: true,
  label: () => {
    return gtiz_locales.current.download_image;
  },
  icon : 'iconic-photo',
  options: [{
    label: '.svg',
    value: 'svg'
  }, {
    label: '.png',
    value: 'png'
  }],
  selected: () => {
    return 'svg';
  },
  function: (e) => {
    let buttuon = e.currentTarget;
    let box = buttuon.parentElement;
    let select = box.querySelector('select');
    let type = select ? select.value : 'svg';
    let text = gtiz_tree.tree.getSVG();
    let timestamp =  Date.now();
    let name = "spread" + timestamp + "." + type;
    let width = gtiz_tree.png_width ? gtiz_tree.png_width : 2400;
    switch (type) {
      case 'svg':
        gtiz_file_handler.saveTextAsFile(text, name);
        break;
      case 'png':
        gtiz_file_handler.saveSvgAsPng(text, width, name);
        break;
      default:
        gtiz_file_handler.saveTextAsFile(text, name);
        break;
    }
  }
}];

/**
 * Event for tree rotation
 * to be rewritten
 * 
 */
$("#rotation-icon").draggable({
  containment: ".dashboard-viewport",
  scroll: false,
  start: function(e) {
    // the_tree._dragStarted(the_tree.force_nodes[0], [$("#rotation-icon").position().left, $("#rotation-icon").position().top]);
    // USING e.clientX, e.clientY AS INITIAL PARAMETER MAKE THE ICON POSITION RELATIVE
    gtiz_tree.tree._dragStarted(gtiz_tree.tree.force_nodes[0], [e.clientX, e.clientY]);
  },
  drag: function(e) {
    gtiz_tree.tree._dragging(gtiz_tree.tree.force_nodes[0], [e.clientX, e.clientY]);
  },
  stop: function(e) {
    gtiz_tree.tree._dragEnded(gtiz_tree.tree.force_nodes[0], [e.clientX, e.clientY]);
  },
  revert: true,
  revertDuration: 10,
  helper: function() {
    return $("<div style='cursor:none'><label id='angle-text'></label></div>")
  },
});
$("#rotation-icon").on("drag", function(event, ui) {
  var x_dif = ui.helper.position().left - $("#rotation-icon").position().left;
  var y_dif = $("#rotation-icon").position().top - ui.helper.position().top;
  var angle = y_dif !== 0 ? Math.atan(x_dif / y_dif) / Math.PI * 180 : (x_dif === 0 ? 0 : (x_dif > 0 ? 90 : -90));
  if (y_dif < 0) {
    angle = 180 + angle;
  } else if (x_dif < 0) {
    angle = 360 + angle;
  }
  ui.helper.select('.angle-text').text(Math.round(angle) + '\xB0').css({
    'font-size': '1.3rem',
    'font-style': 'bold',
  });
});