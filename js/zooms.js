let gtiz_zooms = {};

// Configuration object to check zooms in metadata header columns
gtiz_zooms.cfg = {
  metadata_prefix_MST: 'MST-',
  metadata_sample_name: undefined
};

gtiz_zooms.category = 'category';
gtiz_zooms.soi = 'sample of interest';
gtiz_zooms.thresholds_params = [];
gtiz_zooms.zooms_prefix = 'Reportree';
gtiz_zooms.thresholds = [];
gtiz_zooms.msts = [];

gtiz_zooms.samples_by_mst_cluster = undefined;
gtiz_zooms.clusters_by_sample_mst = undefined;
gtiz_zooms.clusters_by_category_mst = undefined;

gtiz_zooms.zooms_types = ['cluster', 'closest'];
gtiz_zooms.clusters = {};
gtiz_zooms.zooms = {};
gtiz_zooms.filtered_zooms = {};

gtiz_zooms.selected_zoom_type = undefined;
gtiz_zooms.filtered_selected_zoom_type = undefined;
gtiz_zooms.selected_category = undefined;
gtiz_zooms.filtered_selected_category = undefined;
gtiz_zooms.selected_tree = undefined;
gtiz_zooms.filtered_selected_tree = undefined;
gtiz_zooms.selection_alerts = 'show'
gtiz_zooms.apply_settings = 'apply';

gtiz_zooms.tree_node = document.querySelector('.tree-container');

gtiz_zooms.context_menu = [{
  type : 'select',
  id : 'zooms-menu-zoom-type',
  label : () => {
    return gtiz_locales.current.select_zoom_type;
  },
  icon : '',
  options : () => {
    let values = gtiz_zooms.getZoomTypeOptions();
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_zooms.getZoomTypeOptionsDefaultValue();
    return value;
  },
  function : (value) => {
    gtiz_zooms.changeZoomTypeOption(value);
  }
}, {
  type : 'select',
  id : 'zooms-menu-category',
  label : () => {
    let value = gtiz_zooms.getCategoryOptionsLabel();
    return value;
  },
  icon : '',
  options : () => {
    let values = gtiz_zooms.getCategoryOptions();
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_zooms.getCategoryOptionsDefaultValue();
    return value;
  },
  function : (value) => {
    gtiz_zooms.changeCategoryOption(value);
  }
}, {
  type : 'select',
  id : 'zooms-menu-zoomed-tree',
  label : () => {
    let value = gtiz_zooms.getZoomedTreeOptionsLabel();
    return value;
  },
  icon : '',
  options : () => {
    let values = gtiz_zooms.getZoomedTreeOptions();
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_zooms.getZoomedTreeOptionsDefaultValue();
    return value;
  },
  function : (value) => {
    gtiz_zooms.changeZoomedTreeOption(value);
  }
}, {
  type : 'separator'
}, {
  type : 'toggle',
  id : 'zooms-menu-selection-alerts',
  options : [{
      label : gtiz_locales.current.show_selection_alerts,
      value : 'show',
      icon : 'iconic-eye'
    }, {
      label : gtiz_locales.current.hide_selection_alerts,
      value : 'hide',
      icon : 'iconic-eye-off'
  }],
  selected : () => {
    return  gtiz_zooms.selection_alerts;
  },
  function : (value) => {
    gtiz_zooms.toggleSelectionAlerts(value);
  }
}, {
  type : 'button',
  id : 'zooms-menu-select-nodes',
  label : () => {
    return gtiz_locales.current.select_involved_nodes;
  },
  icon : 'iconic-check-circle',
  function : () => {
    gtiz_zooms.selectInvolvedNodes();
  }
}, {
  type : 'button',
  id : 'zooms-menu-clean-selection',
  label : () => {
    return gtiz_locales.current.clean_selection;
  },
  icon : 'iconic-minus-circle',
  function : () => {
    gtiz_tree.tree.clearSelection();
  }
},
{
  type : 'separator'
}, 
{
  type : 'toggle',
  id : 'zooms-menu-current-settings',
  options : [{
        label : gtiz_locales.current.use_current_settings,
        value : 'apply',
        icon : 'iconic-settings-sliders'
      }, {
        label : gtiz_locales.current.do_not_use_current_settings,
        value : 'not-apply',
        icon : 'iconic-ban'
    }],
    selected : () => {
      return  gtiz_zooms.apply_settings;
    },
    function : (value) => {
      gtiz_zooms.toggleCurrentSettings(value);
    }
}, {
  type : 'button',
  id : 'zooms-menu-load-zoomed-tree',
  label : () => {
    return gtiz_locales.current.load_cluster;
  },
  icon : 'iconic-monitor',
  function : () => {
    gtiz_zooms.loadZoomedTree();
  }
}, {
  type : 'button',
  id : 'zooms-menu-open-zoomed-tree',
  label : () => {
    return gtiz_locales.current.load_cluster_in_new_tab;
  },
  icon : 'iconic-share',
  function : () => {
    gtiz_zooms.loadZoomedTreeInNewTab();
  }
}];

gtiz_zooms.filtered_context_menu = [{
  type : 'select',
  id : 'zooms-filtered-menu-zoom-type',
  label : () => {
    return gtiz_locales.current.select_zoom_type;
  },
  icon : '',
  options : () => {
    let values = gtiz_zooms.getZoomTypeOptions(true);
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_zooms.getZoomTypeOptionsDefaultValue(true);
    return value;
  },
  function : (value) => {
    gtiz_zooms.changeZoomTypeOption(value, true);
  }
}, {
  type : 'select',
  id : 'zooms-filtered-menu-category',
  label : () => {
    let value = gtiz_zooms.getCategoryOptionsLabel(true);
    return value;
  },
  icon : '',
  options : () => {
    let values = gtiz_zooms.getCategoryOptions(true);
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_zooms.getCategoryOptionsDefaultValue(true);
    return value;
  },
  function : (value) => {
    gtiz_zooms.changeCategoryOption(value, true);
  }
}, {
  type : 'select',
  id : 'zooms-filtered-menu-zoomed-tree',
  label : () => {
    let value = gtiz_zooms.getZoomedTreeOptionsLabel(true);
    return value;
  },
  icon : '',
  options : () => {
    let values = gtiz_zooms.getZoomedTreeOptions(true);
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_zooms.getZoomedTreeOptionsDefaultValue(true);
    return value;
  },
  function : (value) => {
    gtiz_zooms.changeZoomedTreeOption(value, true);
  }
}, {
  type : 'separator'
}, 
{
  type : 'toggle',
  id : 'zooms-menu-current-settings',
  options : [{
        label : gtiz_locales.current.use_current_settings,
        value : 'apply',
        icon : 'iconic-settings-sliders'
      }, {
        label : gtiz_locales.current.do_not_use_current_settings,
        value : 'not-apply',
        icon : 'iconic-ban'
    }],
    selected : () => {
      return  gtiz_zooms.apply_settings;
    },
    function : (value) => {
      gtiz_zooms.toggleCurrentSettings(value);
    }
}, {
  type : 'button',
  id : 'zooms-menu-load-zoomed-tree',
  label : () => {
    return gtiz_locales.current.load_cluster;
  },
  icon : 'iconic-monitor',
  function : () => {
    gtiz_zooms.loadZoomedTree(true);
  }
}, {
  type : 'button',
  id : 'zooms-menu-open-zoomed-tree',
  label : () => {
    return gtiz_locales.current.load_cluster_in_new_tab;
  },
  icon : 'iconic-share',
  function : () => {
    gtiz_zooms.loadZoomedTreeInNewTab(true);
  }
}];

gtiz_zooms.toggleSelectionAlerts = function(value) {
  gtiz_zooms.selection_alerts = value;
  if (value == 'show') {
    gtiz_zooms.checkZooms();
  } else {
    gtiz_zooms.closeSelectionNotifier();
  }
}

gtiz_zooms.toggleCurrentSettings = function(value) {
  gtiz_zooms.apply_settings = value;
}

gtiz_zooms.setBackButton = function() {
  let button = document.querySelector('#back-to-full-tree');
  if (button) {
    button.remove();
  } else {
    let container = document.querySelector('.tree-container .card-context-tools');
    button = document.createElement('div');
    button.setAttribute('id', 'back-to-full-tree');
    button.setAttribute('class', 'card-context-trigger card-context-utility-trigger');
    let label = document.createElement('span');
    label.innerHTML = gtiz_locales.current.back_to_full_tree;
    let icon = document.createElement('i');
    icon.setAttribute('class', 'iconic iconic-refresh');
    button.append(icon);
    button.append(label);
    button.addEventListener('click', (e) => {
      let tree = gtiz_tree.full_tree_backup;
      if (Object.keys(tree).length > 0) {
        let l_action = 'add';
        let l_components = ['tree', 'map', 'legend'];
        gtiz_layout.uiLoadingManager(l_components, l_action);
        let text = JSON.stringify(tree);
        let json = true;
        gtiz_file_handler.loadTreeText(text, json);
        gtiz_zooms.setBackButton();
        gtiz_tree.full_tree_backup = {};
      }
    });
    container.prepend(button);
  }
}

gtiz_zooms.loadZoomedTreeInNewTab = function(filtered) {
  // get url with no parameters
  // Create a URL object based on the current location
  let current_url = new URL(window.location.href);
  // Build the base URL without query parameters
  let pathname = current_url.pathname.endsWith('/') ? current_url.pathname.slice(0, -1) : current_url.pathname;
  let domain = current_url.origin + pathname;
  // get base path from tree pat
  let base_path = gtiz_file_handler.getBasePath();
  let prefix = gtiz_zooms.zooms_prefix + '_';
  let threshold = filtered ? gtiz_zooms.filtered_selected_category : gtiz_zooms.selected_category;
  let cluster = filtered ? gtiz_zooms.filtered_selected_tree : gtiz_zooms.selected_tree;
  let zoom = threshold + '_' + cluster;
  // build path
  let path = base_path + '/' + prefix + zoom + '/';

  let tree = 'tree=' + path + zoom + '.nwk';
  let metadata = 'metadata=' + path + zoom + '_metadata_w_partitions.tsv';
  let geo = 'geo=' + gtiz_file_handler.params.geo;
  let url = domain + '?' + tree + '&' + metadata;
  if (geo) {
    url += '&' + geo;
  }
  
  let current_settings = gtiz_tree.getCompleteGrapeTreeSettings();
  current_settings = JSON.stringify(current_settings)
  let use_settings = gtiz_zooms.apply_settings;
  // In the opening window
  let newWindow = window.open(url, '_blank');
  
  newWindow.onload = function() {
    newWindow.postMessage({ settings : {tree_backup : current_settings, apply : use_settings}}, domain);
  };
}

gtiz_zooms.loadZoomedTree = function(filtered) {

  // close context menu
  let card = document.querySelector('.tree-container');
  let type = 'zooms';
  gtiz_context.closeContextMenu(type, card);

  gtiz_modal.closeAllComponentsNotifiers();

  if (Object.keys(gtiz_tree.full_tree_backup).length == 0) {
    // save current full tree
    let current_tree = gtiz_tree.getCompleteGrapeTreeObject();
    if (current_tree) {
      gtiz_tree.full_tree_backup = { ...current_tree };
    }
  }
  
  // set tree loader
  let components = ['tree', 'legend'];
	let action = 'add';
	gtiz_layout.uiLoadingManager(components, action);

  // get base path from tree pat
  let base_path = gtiz_file_handler.getBasePath();
  let prefix = gtiz_zooms.zooms_prefix + '_';
  let threshold = filtered ? gtiz_zooms.filtered_selected_category : gtiz_zooms.selected_category;
  let cluster = filtered ? gtiz_zooms.filtered_selected_tree : gtiz_zooms.selected_tree;
  let zoom = threshold + '_' + cluster;
  // build path
  let path = base_path + '/' + prefix + zoom + '/';

  let tree = path + zoom + '.nwk';
  let metadata = path + zoom + '_metadata_w_partitions.tsv';

  if (tree) {
		gtiz_file_handler.getData(tree).then((obj) => {
			if (obj.error) {
				let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
				let html = gtiz_locales.current.missing_net_tree_alert;
				if (obj.status) {
					if (obj.status == 403) {
						title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops_forbidden_http;
						let protocol = window.location.protocol;
						let hostname = window.location.host;
						let url = protocol + '//' + hostname;
						html = gtiz_locales.current.forbidden_net_tree_alert.replace('{0}', url).replace('{1}', url);
					}
					if (obj.status == 404) {
						title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops_not_found_http;
						html = gtiz_locales.current.not_found_net_tree_alert;
					}
				}
				let contents = [];
				let content = document.createElement('p');
				content.innerHTML = html;
				contents.push(content);
				let feedback = '<p>' + obj.text + '</p>';
				let f_type = 'info';
				gtiz_modal.buildNotifier(title, contents, feedback, f_type);

        gtiz_zooms.setBackButton();

			} else {
				let is_valid = gtiz_file_handler.isValidJSON(obj.text);
				if (is_valid) {
					gtiz_file_handler.tree_data = JSON.parse(obj.text);
					data = gtiz_file_handler.tree_data;
				} else {
					data = {};
					if (obj.text.substring(0,6) === "#NEXUS"){
						data['nexus'] = obj.text;
					} else {
						data['nwk'] = obj.text;
					}
					let layout_select = document.querySelector("#layout-select");
					data['layout_algorithm'] = layout_select ? layout_select.value : '';
				}			
        
        gtiz_tree.loadMSTree(data, is_valid);
				
        if (gtiz_tree.tree) {

          gtiz_zooms.setBackButton();

          if (metadata) {
						gtiz_file_handler.getData(metadata).then((obj) => {
							if (obj.error) {
								let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
								let html = gtiz_locales.current.missing_net_tsv_alert;
								if (obj.status) {
									if (obj.status == 403) {
										title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops_forbidden_http;
										let protocol = window.location.protocol;
										let hostname = window.location.host;
										let url = protocol + '//' + hostname;
										html = gtiz_locales.current.forbidden_net_metadata_alert.replace('{0}', url).replace('{1}', url);
									}
									if (obj.status == 404) {
										title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops_not_found_http;
										html = gtiz_locales.current.not_found_net_metadata_alert;
									}
								}
								let contents = [];
								let content = document.createElement('p');
								content.innerHTML = html;
								contents.push(content);
								let feedback = '<p>' + obj.text + '</p>';
								let f_type = 'info';
								gtiz_modal.buildNotifier(title, contents, feedback, f_type);
								let components = ['tree', 'legend'];
								let action = 'remove';
								gtiz_layout.uiLoadingManager(components, action);
                gtiz_tree.applySettings(gtiz_tree.full_tree_backup, gtiz_zooms.apply_settings, false, 'current');
                gtiz_tree.checkBestLinkDistanceUtil();
                gtiz_map.init();
							} else {
								gtiz_file_handler.loadMetadataText(obj.text);
                gtiz_tree.applySettings(gtiz_tree.full_tree_backup, gtiz_zooms.apply_settings, true, 'current');
                gtiz_tree.checkBestLinkDistanceUtil();
                gtiz_map.init();
							}
						}).catch((err) => {
							console.log(err);
							let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
							let contents = [];
							let content = document.createElement('p');
							content.innerHTML = gtiz_locales.current.metadata_file_generic_problem;
							contents.push(content);
							let feedback = '<p>' + err + '</p>';
							let f_type = 'info';
							gtiz_modal.buildNotifier(title, contents, feedback, f_type);
							let components = ['tree', 'legend'];
							let action = 'remove';
							gtiz_layout.uiLoadingManager(components, action);
              gtiz_tree.applySettings(gtiz_tree.full_tree_backup, gtiz_zooms.apply_settings, false, 'current');
              gtiz_tree.checkBestLinkDistanceUtil();
              gtiz_map.init();
						});
					} else {
						let components = ['tree', 'legend'];
						let action = 'remove';
						gtiz_layout.uiLoadingManager(components, action);
            gtiz_tree.applySettings(gtiz_tree.full_tree_backup, gtiz_zooms.apply_settings, false, 'current');
            gtiz_tree.checkBestLinkDistanceUtil();
            gtiz_map.init();
					}
				}
			}
		}).catch((err) => {
			console.log(err);
			let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
			let contents = [];
			let content = document.createElement('p');
			content.innerHTML = gtiz_locales.current.missing_net_tree_alert;
			contents.push(content);
			let feedback = '<p>' + err + '</p>';
			let f_type = 'info';
			gtiz_modal.buildNotifier(title, contents, feedback, f_type);
		});
	}
};

gtiz_zooms.selectInvolvedNodes = function() {
  let type = gtiz_zooms.selected_zoom_type;
  let selected = gtiz_zooms.selected_category;
  let cluster = gtiz_zooms.selected_tree;
  let codes = [];
  if (type == "cluster") {
    let metadata = gtiz_tree.tree.metadata;
    codes = Object.keys(metadata).filter(key => {
      return metadata[key][selected] === cluster;
    });
  } else if (type == 'closest') {
    codes = [selected];
  }
  if (codes.length > 0) {
    gtiz_tree.tree.selectNodesByIds(codes);
  } else {
    let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
    let contents = [];
    let content = document.createElement('p');
    content.innerHTML = gtiz_locales.current.zooms_clusters_generic_problem;
    contents.push(content);
    let feedback = '<p>' + gtiz_locales.current.select_involved_nodes_empty_feedback + '</p>';
    let f_type = 'info';
    gtiz_modal.buildNotifier(title, contents, feedback, f_type);
  }
}

gtiz_zooms.setSelectedZoomedTree = function(value, filtered) {
  if (filtered) {
    gtiz_zooms.filtered_selected_tree = value ? value : undefined;
  } else {
    gtiz_zooms.selected_tree = value ? value : undefined;
  }
}

gtiz_zooms.changeZoomedTreeOption = function(value, filtered) {
  gtiz_zooms.setSelectedZoomedTree(value, filtered);
}

gtiz_zooms.getZoomedTreeOptionsDefaultValue = function(filtered) {
  let type = filtered ? gtiz_zooms.filtered_selected_zoom_type : gtiz_zooms.selected_zoom_type;
  let category = filtered ? gtiz_zooms.filtered_selected_category : gtiz_zooms.selected_category;
  let trees = filtered ? gtiz_zooms.filtered_zooms[type][category] : gtiz_zooms.zooms[type][category];
  gtiz_zooms.setSelectedZoomedTree(trees[0], filtered);
  return trees[0];
}

gtiz_zooms.getZoomedTreeOptions = function(filtered) {
  let type = filtered ? gtiz_zooms.filtered_selected_zoom_type : gtiz_zooms.selected_zoom_type;
  let category = filtered ? gtiz_zooms.filtered_selected_category : gtiz_zooms.selected_category;
  let trees = filtered ? gtiz_zooms.filtered_zooms[type][category] : gtiz_zooms.zooms[type][category];
  let options = [];
  trees.forEach(tree => {
    let obj = {
      label : tree,
      value : tree
    }
    options.push(obj);
  });
  return options;
}

gtiz_zooms.getZoomedTreeOptionsLabel = function(filtered) {
  let type = filtered ? gtiz_zooms.filtered_selected_zoom_type : gtiz_zooms.selected_zoom_type;
  let label = '';
  switch (type) {
    case 'cluster':
      label = gtiz_locales.current.select_cluster;
      break;
    case 'closest':
      label = gtiz_locales.current.select_closest;
      break;
    default:
      label = gtiz_locales.current.select;
      break;
  }
  return label;
}

gtiz_zooms.setSelectedCategory = function(value, filtered) {
  if (filtered) {
    gtiz_zooms.filtered_selected_category = value ? value : undefined;
  } else {
    gtiz_zooms.selected_category = value ? value : undefined;
  }
}

gtiz_zooms.changeCategoryOption = function(value, filtered) {
  gtiz_zooms.setSelectedCategory(value, filtered);
  let type = filtered ? gtiz_zooms.filtered_selected_zoom_type : gtiz_zooms.selected_zoom_type;
  let selector = filtered ? '#zooms-filtered-menu-zoomed-tree' : '#zooms-menu-zoomed-tree';
  let select = document.querySelector(selector);
  let box = select.parentNode;
  let label = box.querySelector('.form-label');
  label.innerHTML = gtiz_zooms.getZoomedTreeOptionsLabel();
  select.innerHTML = '';
  let trees = filtered ? gtiz_zooms.filtered_zooms[type][value] : gtiz_zooms.zooms[type][value];
  trees.forEach(tree => {
    let option = new Option(tree, tree);
    select.add(option);
  });
  gtiz_zooms.setSelectedZoomedTree(trees[0], filtered);
  select.value = trees[0];
}

gtiz_zooms.getCategoryOptionsDefaultValue = function(filtered) {
  let type = filtered ? gtiz_zooms.filtered_selected_zoom_type : gtiz_zooms.selected_zoom_type;
  let category = filtered ? Object.keys(gtiz_zooms.filtered_zooms[type]) : Object.keys(gtiz_zooms.zooms[type]);
  gtiz_zooms.setSelectedCategory(category[0], filtered);
  return category[0];
}

gtiz_zooms.getCategoryOptions = function(filtered) {
  let type = filtered ? gtiz_zooms.filtered_selected_zoom_type : gtiz_zooms.selected_zoom_type;
  let category = filtered ? Object.keys(gtiz_zooms.filtered_zooms[type]) : Object.keys(gtiz_zooms.zooms[type]);
  let options = [];
  category.forEach(threshold => {
    let obj = {
      label : threshold,
      value : threshold
    }
    options.push(obj);
  });
  return options;
}

gtiz_zooms.getCategoryOptionsLabel = function(filtered) {
  let type = filtered ? gtiz_zooms.filtered_selected_zoom_type : gtiz_zooms.selected_zoom_type;
  let label = '';
  switch (type) {
    case 'cluster':
      label = gtiz_locales.current.select_threshold;
      break;
    case 'closest':
      label = gtiz_locales.current.select_sample;
      break;
    default:
      label = gtiz_locales.current.select;
      break;
  }
  return label;
}

gtiz_zooms.setSelectedZoomType = function(value, filtered) {
  if (filtered) {
    gtiz_zooms.filtered_selected_zoom_type = value ? value : undefined;
  } else {
    gtiz_zooms.selected_zoom_type = value ? value : undefined;
  }
}

gtiz_zooms.changeZoomTypeOption = function(value, filtered) {
  gtiz_zooms.setSelectedZoomType(value, filtered);
  let type = filtered ? gtiz_zooms.filtered_selected_zoom_type : gtiz_zooms.selected_zoom_type;
  let selector = filtered ? '#zooms-filtered-menu-category' : '#zooms-menu-category';
  let select = document.querySelector(selector);
  let box = select.parentNode;
  let label = box.querySelector('.form-label');
  label.innerHTML = gtiz_zooms.getCategoryOptionsLabel();
  select.innerHTML = '';
  let categories = filtered ? Object.keys(gtiz_zooms.filtered_zooms[type]) : Object.keys(gtiz_zooms.zooms[type]);
  categories.forEach(tree => {
    let option = new Option(tree, tree);
    select.add(option);
  });
  gtiz_zooms.setSelectedZoomedTree(categories[0], filtered);
  // Create a new 'change' event
  let event = new Event('change', {
    bubbles: true, // This event bubbles up through the DOM
    cancelable: true, // This event can be cancelled
  });
  select.value = categories[0];
  // Dispatch the event to trigger all 'change' event listeners
  select.dispatchEvent(event);
}

gtiz_zooms.getZoomTypeOptionsDefaultValue = function(filtered) {
  let types = filtered ? Object.keys(gtiz_zooms.filtered_zooms) : Object.keys(gtiz_zooms.zooms);
  gtiz_zooms.setSelectedZoomType(types[0], filtered);
  return types[0];
}

gtiz_zooms.getZoomTypeOptions = function(filtered) {
  let types = gtiz_zooms.zooms_types;
  let options = [];
  types.forEach(type => {
    let obj = {};
    switch (type) {
      case 'cluster':
        obj.label = gtiz_locales.current.cluster;
        break;
      case 'closest':
        obj.label = gtiz_locales.current.closest;
        break;
    }
    obj.value = type;
    if (filtered) {
      if (gtiz_zooms.filtered_zooms[type]) {
        options.push(obj);
      }
    } else {
      if (gtiz_zooms.zooms[type]) {
        options.push(obj);
      }
    }
  });
  return options;
}

gtiz_zooms.getFilteredZoomsMenu = function() {
  let form = document.createElement('div');
  form.setAttribute('class', 'card-form notfier-form');
  let cfg = gtiz_zooms.filtered_context_menu;
  cfg.forEach(item => {
    if (item.type == 'toggle') {
      let container = document.createElement('div');
      container.setAttribute('class', 'tools');
      let box = document.createElement('div'); 
      box.setAttribute('class', 'toggle-box');
      box.setAttribute('data-selection', item.options[0].value);
      box.setAttribute('id', item.id);
      let label = document.createElement('div');
      label.setAttribute('class', 'label');
      let toggle = document.createElement('div');
      toggle.setAttribute('class', 'toggle');
      let selected;
      if (typeof item.selected === 'string') {
        selected = item.selected;
      } else {
        if (typeof item.selected === 'function')
        selected = item.selected();
      }
      item.options.forEach((option, index) => {
        if (option.value == selected) {
          box.setAttribute('data-selection', option.value);
          if (typeof option.label === 'string') {
            label.innerHTML = ' ' + option.label;
          } else {
            if (typeof option.label === 'function') {
              let label_text = option.label();
              label.innerHTML = ' ' + label_text;
            }
          }
          if (index === 0) {
            toggle.classList.add('toggled-first-option');
          } else {
            toggle.classList.add('toggled-second-option');
          }
        }
        let node = document.createElement('div');
        node.setAttribute('class', 'toggle-option');
        let icon = option.icon != '' ? '<i class="iconic ' + option.icon + '"></i> ' : '';
        node.innerHTML = icon;
        toggle.append(node);
      });
      box.append(toggle);
      box.append(label);
      box.addEventListener('click', (e) => {
        toggle.classList.toggle('toggled-first-option');
        toggle.classList.toggle('toggled-second-option');
        let value = box.getAttribute('data-selection');
        if (value === item.options[0].value) {
          box.setAttribute('data-selection', item.options[1].value);
          if (typeof item.options[1].label === 'string') {
            label.innerHTML = ' ' + item.options[1].label;
          } else {
            if (typeof item.options[1].label === 'function') {
              let label_text = item.options[1].label();
              label.innerHTML = ' ' + label_text;
            }
          }
          item.function(item.options[1].value);
        } else {
          box.setAttribute('data-selection', item.options[0].value);
          if (typeof item.options[0].label === 'string') {
            label.innerHTML = ' ' + item.options[0].label;
          } else {
            if (typeof item.options[0].label === 'function') {
              let label_text = item.options[0].label();
              label.innerHTML = ' ' + label_text;
            }
          }
          item.function(item.options[0].value);
        }
      });
      container.append(box);
      form.append(container);
    }
    if (item.type == 'button') {
      let box = document.createElement('div'); 
      box.setAttribute('class', 'button-box');
      let a = document.createElement('a');
      a.setAttribute('class', 'card-action');
      let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
      if (typeof item.label === 'string') {
        a.innerHTML = icon + item.label;
      } else {
        if (typeof item.label === 'function') {
          let label_text = item.label();
          a.innerHTML = icon + label_text;
        }
      }
      a.addEventListener('click', (e) => {
        item.function();
      });
      box.append(a);
      form.append(box);
    }
    if (item.type == 'select') {
      let box = document.createElement('div'); 
      box.setAttribute('class', 'select-box');
      if (item.label) {
        let label = document.createElement('div');
        label.setAttribute('class', 'form-label');
        let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
        if (typeof item.label === 'string') {
          label.innerHTML = icon + item.label;
        } else {
          if (typeof item.label === 'function') {
            let label_text = item.label();
            label.innerHTML = icon + label_text;
          }
        }
        box.append(label);
      }
      let select = document.createElement('select');
      if (item.id) {
        select.setAttribute('id', item.id);
      }
      if (Array.isArray(item.options)) {
        let options = item.options;
        options.forEach(el => {
          let option = document.createElement('option');
          option.setAttribute('value', el.value);
          if (typeof el.label === 'string') {
            option.innerHTML = el.label;
          } else {
            if (typeof el.label === 'function') {
              let label_text = el.label();
              option.innerHTML = label_text;
            }
          }
          select.append(option);
        });
      } else {
        if (typeof item.options === 'function') {
          let options = item.options();
          options.forEach(el => {
            let option = document.createElement('option');
            option.setAttribute('value', el.value);
            option.innerHTML = el.label;
            select.append(option);
          });
        }
      }
      if (item.default) {
        select.value = item.default;
      } else {
        if (typeof item.get_default === 'function') {
          let value = item.get_default();
          select.value = value;
        }
      }
      select.addEventListener('change', (e) => {
        item.function(select.value);
      });
      box.append(select);
      form.append(box);
    }
    if (item.type == 'number') {
      let box = document.createElement('div');
      box.setAttribute('class', 'input-box input-box-number');
      if (item.label) {
        let label = document.createElement('div');
        label.setAttribute('class', 'form-label');
        let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
        if (typeof item.label === 'string') {
          label.innerHTML = icon + item.label;
        } else {
          if (typeof item.label === 'function') {
            let label_text = item.label();
            label.innerHTML = icon + label_text;
          }
        }
        box.append(label);
      }
      let input = document.createElement('input');
      input.setAttribute('type', 'number');
      if (item.id) {
        input.setAttribute('id', item.id);
      }
      if (item.min) {
        input.setAttribute('min', item.min);
      }
      if (item.max) {
        input.setAttribute('max', item.max);
      }
      if (item.default) {
        input.value = item.default;
      } else {
        if (typeof item.get_default === 'function') {
          let value = item.get_default();
          input.value = value;
        }
      }
      let events = ['change'];
      events.forEach((event) => {
        input.addEventListener(event, (e) => {
          let value = input.value;
          item.function(value);
        });
      });
      box.append(input);
      form.append(box);
    }
    if (item.type == 'separator') {
      let hr = document.createElement('hr');
      form.append(hr);
    }
  });

  return form;
}

/**
 * Build form for the filtered by node selection zooms
 * 
 * @param {String} id DOM node id selector, the div where form should be built
 */
gtiz_zooms.buildFilterdZoomsSelection = function(id) {
  let zooms = gtiz_zooms.filtered_zooms;
  if (gtiz_utils.isObjectNotEmpty(zooms)) {
    // remove from container all element but not the close button
    let container = document.querySelector('#' + id);
    let children = container.querySelectorAll('div');
    children.forEach(child => {
      if (!child.classList.contains('notifier-close')) {
        child.remove();
      }
    });
    // get menu
    let menu = gtiz_zooms.getFilteredZoomsMenu();
    container.append(menu);
  }
}

gtiz_zooms.closeSelectionNotifier = function() {
  let component = document.querySelector('.tree-container');
  let notifier = component.querySelector('.component-notifier');
  let contents = notifier ? document.querySelector('#selection-message-notifier') : null;
  if (contents) {
    gtiz_modal.closeComponentNotifier(component, notifier, contents);
  }
}

gtiz_zooms.showSelectionNotifier = function() {
  if (gtiz_zooms.selection_alerts == 'show') {
    let component = 'tree';
    let title = '<i class="iconic iconic-sun"></i> ' + gtiz_locales.current.zooms_available_for_selected_nodes;
    let id = 'selection-message-notifier';
    let contents = [];
    let content = document.createElement('p');
    content.innerHTML = gtiz_locales.current.zooms_available_for_selected_nodes_message;
    contents.push(content);
    let actions = [];
    let link = document.createElement('a');
    link.innerHTML = '<i class="iconic iconic-zoom-in"></i> ' + gtiz_locales.current.see_available_zooms;
    link.addEventListener('click', function (e) {
      gtiz_zooms.buildFilterdZoomsSelection(id);
    });
    actions.push(link);
    let feedback = '<p>' + gtiz_locales.current.zooms_available_for_selected_nodes_info + '</p>';
    let f_type = 'info';
    gtiz_modal.buildComponentNotifier(component, id, title, contents, actions, feedback, f_type);
  }
}

gtiz_zooms.showZoomsAvailableNotifier = function() {
  let component = 'tree';
  let title = '<i class="iconic iconic-information"></i> ' + gtiz_locales.current.zooms_found;
  let id = 'zooms-found-notifier';
  let contents = [];
  let content = document.createElement('p');
  content.innerHTML = gtiz_locales.current.zooms_found_message;
  contents.push(content);
  let actions = [];
  let link = document.createElement('a');
  link.innerHTML = '<i class="iconic iconic-zoom-in"></i> ' + gtiz_locales.current.see_available_zooms;
  link.addEventListener('click', function (e) {
    let trigger = document.querySelector('[data-menu-type="zooms"]');
    gtiz_context.showMenu('zooms', 'tree', trigger);
    let component = document.querySelector('.tree-container');
    let notifier = component.querySelector('.component-notifier');
    let contents = notifier ? notifier.querySelector('#'+ id) : undefined;
    if (contents) {
      gtiz_modal.closeComponentNotifier(component, notifier,contents);
    }
  });
  actions.push(link);
  let feedback = '<p>' + gtiz_locales.current.zooms_found_info + '</p>';
  let f_type = 'info';
  gtiz_modal.buildComponentNotifier(component, id, title, contents, actions, feedback, f_type);
}

/**
 * Check if a zoom exist for selected legend item
 * 
 * @param {Object} nodes Selected category
 */
gtiz_zooms.checkZooms = function(nodes) {
  if (gtiz_utils.isObjectNotEmpty(gtiz_zooms.zooms)) {
    if (!nodes) {
      nodes = gtiz_tree.tree.getAllSelectedNodesIDs();
    }
    let ids = Object.values(nodes).flat();
    let types = Object.keys(gtiz_zooms.zooms);
    let msts = [];
    let samples = [];
    types.forEach(type => {
      switch (type) {
        case 'cluster':
          msts = Object.keys(gtiz_zooms.zooms[type]);
          break;
        case 'closest':
          samples = Object.keys(gtiz_zooms.zooms[type]);
          break;
      }
    });
    if (ids.length > 0) {
      ids.forEach(id => {
        if (gtiz_zooms.zooms['closest']) {
          if (gtiz_zooms.zooms['closest'][id]) {
            if (!gtiz_zooms.filtered_zooms['closest']) {
              gtiz_zooms.filtered_zooms['closest'] = {};
            }
            gtiz_zooms.filtered_zooms['closest'][id] = gtiz_zooms.zooms['closest'][id];
          }
        }
        if (gtiz_zooms.zooms['cluster']) {
          msts.forEach(mst => {
            if (gtiz_tree.tree.metadata[id] && gtiz_tree.tree.metadata[id][mst]) {
              let cluster = gtiz_tree.tree.metadata[id][mst];
              if (!gtiz_zooms.filtered_zooms['cluster']) {
                gtiz_zooms.filtered_zooms['cluster'] = {};
              }
              if (!gtiz_zooms.filtered_zooms['cluster'][mst]) {
                gtiz_zooms.filtered_zooms['cluster'][mst] = [];
              }
              if (gtiz_zooms.zooms['cluster'][mst].includes(cluster) && !gtiz_zooms.filtered_zooms['cluster'][mst].includes(cluster)) {
                gtiz_zooms.filtered_zooms['cluster'][mst].push(cluster);
              }
            }
          });
        }
      });
      if (gtiz_utils.isObjectNotEmpty(gtiz_zooms.filtered_zooms)) {
        gtiz_zooms.closeSelectionNotifier();
        gtiz_zooms.showSelectionNotifier();
      } else {
        gtiz_zooms.closeSelectionNotifier();
      }
    } else {
      gtiz_zooms.closeSelectionNotifier();
    }
  }
}

/**
 * Set UI tools to hold zooms
 * 
 */
gtiz_zooms.setAvailableZooms = function() {
  if (gtiz_utils.isObjectNotEmpty(gtiz_zooms.zooms)) {
    gtiz_zooms.tree_node.classList.add('zoom-available');
    gtiz_zooms.showZoomsAvailableNotifier();
  } else {
    let thresholds = gtiz_zooms.thresholds_params;
    if (thresholds && thresholds.length > 0 && thresholds[0] != 'all') {
      gtiz_zooms.thresholds = gtiz_zooms.msts.reduce((acc, item) => {
        let number = parseInt(item.split('-')[1].split('x')[0]);
        if (thresholds.includes(number)) {
          acc.push(item);
        }
        return acc;
      }, []);
    } else {
      gtiz_zooms.thresholds = gtiz_zooms.msts;
    }

    let ccm = gtiz_zooms.clusters_by_category_mst;
    let soi = gtiz_zooms.soi;
    if (typeof ccm === 'object' && ccm !== null && soi != '') {
      gtiz_zooms.clusters = ccm[soi];
    } else {
      let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
      let contents = [];
      let content = document.createElement('p');
      content.innerHTML = gtiz_locales.current.zooms_clusters_generic_problem;
      contents.push(content);
      let feedback_text = gtiz_locales.current.clusters_by_category_and_mst_not_found.replace('{0}', gtiz_zooms.category + ', ' + gtiz_zooms.soi + ', ' + gtiz_zooms.thresholds.join(' '));
      let feedback = '<p>' + feedback_text + '</p>';
      let f_type = 'info';
      gtiz_modal.buildNotifier(title, contents, feedback, f_type);
    }
    if (gtiz_utils.isObjectNotEmpty(gtiz_zooms.clusters)) {
      Object.keys(gtiz_zooms.clusters).forEach(key => {
        gtiz_zooms.thresholds.forEach(threshold => {
          if (key == threshold) {
            gtiz_zooms.zooms['cluster'] = {};
            gtiz_zooms.zooms['cluster'][key] = gtiz_zooms.clusters[key];
          }
        });
      });
      if (gtiz_utils.isObjectNotEmpty(gtiz_zooms.zooms)) {
        gtiz_zooms.tree_node.classList.add('zoom-available');
        gtiz_zooms.showZoomsAvailableNotifier();
      }
    }
  }
}

/**
 * Build zooms objects
 * 
 */
gtiz_zooms.buildZoomsObjects = function() {
  
  let uri = gtiz_file_handler.params.metadata ? gtiz_file_handler.params.metadata : undefined;
  let metadata = gtiz_tree.tree.metadata ? gtiz_tree.tree.metadata : undefined;
  let zooms_finder_options = {};
  if (metadata) {
    zooms_finder_options = {
      categoryColumnName: gtiz_zooms.category,
      metadata: gtiz_tree.tree.metadata,
      prefixMSTColumnName: gtiz_zooms.cfg.metadata_prefix_MST,
      sampleColumnName:  gtiz_zooms.cfg.metadata_sample_name
    }
  } else {
    if (uri) {
      zooms_finder_options = {
        categoryColumnName: gtiz_zooms.category,
        metadataURI: uri,
        prefixMSTColumnName: gtiz_zooms.cfg.metadata_prefix_MST,
        sampleColumnName:  gtiz_zooms.cfg.metadata_sample_name
      }
    }
  }

  gtiz_zooms.zoomsFinder = zoomsFinder(zooms_finder_options, function (MSTs, samplesByMSTAndCluster, clustersBySampleAndMST, clustersByCategoryAndMST) {
      gtiz_zooms.msts = MSTs;
      gtiz_zooms.samples_by_mst_cluster = samplesByMSTAndCluster;
      gtiz_zooms.clusters_by_sample_mst = clustersBySampleAndMST;
      gtiz_zooms.clusters_by_category_mst = clustersByCategoryAndMST;

      if (gtiz_zooms.msts && gtiz_zooms.msts.length > 0) {
          gtiz_zooms.setAvailableZooms();
      } else {
        let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
        let contents = [];
        let content = document.createElement('p');
        content.innerHTML = gtiz_locales.current.zooms_clusters_generic_problem;
        contents.push(content);
        let feedback = '<p>' + gtiz_locales.current.thresholds_not_found_in_metadata + '</p>';
        let f_type = 'info';
        gtiz_modal.buildNotifier(title, contents, feedback, f_type);
      }

  }, function(err) {
      console.log(err);
      let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
      let contents = [];
      let content = document.createElement('p');
      content.innerHTML = gtiz_locales.current.zooms_clusters_generic_problem;
      contents.push(content);
      let feedback = '<p>' + err + '</p>';
      let f_type = 'info';
      gtiz_modal.buildNotifier(title, contents, feedback, f_type);
  });

}

gtiz_zooms.init = function() {
  
  // reset actions
  gtiz_zooms.tree_node.classList.remove('zoom-available');

  // get and set columns name for samples
  if (gtiz_file_handler.samples_column) {
    gtiz_zooms.cfg.metadata_sample_name = gtiz_file_handler.samples_column;
  } else {
    gtiz_zooms.cfg.metadata_sample_name = 'ID';
  }

  // get and set prefix, default `Reportree`
  if ('zooms_prefix' in gtiz_file_handler.params) {
    gtiz_zooms.zooms_prefix = gtiz_file_handler.params.zooms_prefix;
  } else {
    let name = gtiz_file_handler.params.tree.split('/').pop();
    let prefix = name.split('.')[0];
    if (prefix) {
      gtiz_zooms.zooms_prefix = prefix;
    }
  }

  if ('zooms' in gtiz_file_handler.params) {
    let zooms = gtiz_file_handler.params.zooms;
    let parts = zooms.includes('@') ? zooms.split('@') : undefined;
    let categories = parts ? parts[0].split(',') : undefined;
    let thresholds = parts ? gtiz_utils.extractNumbersAndRanges(parts[1]) : undefined;
    
    if (categories) {
      // metadata column to take into consideration
      gtiz_zooms.category = categories[0] ? categories[0] : 'category';
      // sample of interest used to generate clusters
      gtiz_zooms.soi = categories[1] ? categories[1] : 'sample of interest';
    } else {
      // metadata column to take into consideration
      gtiz_zooms.category = 'category';
      // sample of interest used to generate clusters
      gtiz_zooms.soi = 'sample of interest';
    }

    if (thresholds && thresholds.length > 0) {
      gtiz_zooms.thresholds_params = thresholds;
    }

    gtiz_zooms.buildZoomsObjects();

  } else {

    if ('zooms_list' in gtiz_file_handler.params) {
      
      let zooms = gtiz_file_handler.params.zooms_list;
      let parts = zooms.includes('@') ? zooms.split('@') : undefined;
      let categories = parts ? parts[0].split(',') : undefined;
      let base_path = gtiz_file_handler.getBasePath();
      let file = parts ? parts[1] : zooms;
      let path = base_path + '/' + file;

      if (categories) {
        // metadata column to take into consideration
        gtiz_zooms.category = categories[0] ? categories[0] : 'category';
        // sample of interest used to generate clusters
        gtiz_zooms.soi = categories[1] ? categories[1] : 'sample of interest';
      } else {
        // metadata column to take into consideration
        gtiz_zooms.category = 'category';
        // sample of interest used to generate clusters
        gtiz_zooms.soi = 'sample of interest';
      }

      gtiz_file_handler.getData(path).then((obj) => {
        if (obj.error) {
          let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
          let html = gtiz_locales.current.missing_net_zooms_alert;
          if (obj.status) {
            if (obj.status == 403) {
              title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops_forbidden_http;
              let protocol = window.location.protocol;
              let hostname = window.location.host;
              let url = protocol + '//' + hostname;
              html = gtiz_locales.current.forbidden_net_tree_alert.replace('{0}', url).replace('{1}', url);
            }
            if (obj.status == 404) {
              title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops_not_found_http;
              html = gtiz_locales.current.not_found_net_zooms_alert;
            }
            let contents = [];
            let content = document.createElement('p');
            content.innerHTML = html;
            contents.push(content);
            let feedback = '<p>' + obj.text + '</p>';
            let f_type = 'info';
            gtiz_modal.buildNotifier(title, contents, feedback, f_type);
          }
        } else {
          let contents = obj.text;
          // If zooms.txt is empty, we are considering it not an error.
          if (contents == '') {
            return;
          }
          let prefix = gtiz_zooms.zooms_prefix + '_';
          let list = contents.split(/\r?\n/); // \n or \r\n if generated by windows
          // Remove empty string from list
          list = list.filter(element => element !== "");
          // Remove prefix from list
          list = list.map(element => element.replace(prefix, ''));
          let metadata_info = gtiz_tree.tree.metadata_info;
          let metadata = gtiz_tree.tree.metadata;
          let samples = Object.values(metadata).filter(item => item[gtiz_zooms.category] == gtiz_zooms.soi).map(item => item[gtiz_zooms.cfg.metadata_sample_name]);
          let extracted = list.map(element => {
            let parts = element.split('_');
            let part = parts[0];
            if (metadata_info[part] && part.includes(gtiz_zooms.cfg.metadata_prefix_MST)) {
              return {
                type: 'cluster',
                threshold: part,
                cluster: element.replace(part + '_', '')
              };
            } else {
              for (let sample of samples) {
                if (element.includes(sample)) {
                  return {
                    type: 'closest',
                    sample: sample,
                    closest: element.replace(sample + '_', '')
                  };
                }
              }
            }
            return null; // Return null or some default value if no conditions are met
          });
          let aggregated = extracted.reduce((acc, item) => {
            if (item.type == 'cluster') {
              if (!acc[item.type]) {
                acc[item.type] = {};
              }
              if (!acc[item.type][item.threshold]) {
                acc[item.type][item.threshold] = [];
              }
              acc[item.type][item.threshold].push(item.cluster);
            } else if (item.type == 'closest') {
              if (!acc[item.type]) {
                acc[item.type] = {};
              }
              if (!acc[item.type][item.sample]) {
                acc[item.type][item.sample] = [];
              }
              acc[item.type][item.sample].push(item.closest);
            }
            return acc; // This is crucial, as it passes the accumulator to the next iteration
          }, {}); // Initial value of the accumulator
          gtiz_zooms.zooms = aggregated;
          gtiz_zooms.setAvailableZooms();
        }
      }).catch((err) => {
        console.log(err);
      });
    }
  }

  // to be used when json will integrate zooms inside
  /* if (gtiz_utils.isObjectNotEmpty(gtiz_zooms.zooms)) { 
    gtiz_zooms.buildZoomsObjects();
  } else {
    // here code to fine zoom in parameters
  }*/
}