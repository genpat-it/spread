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

gtiz_zooms.clusters = {};
gtiz_zooms.zooms = {};
gtiz_zooms.filtered_zooms = {};

gtiz_zooms.selected_threshold = undefined;
gtiz_zooms.filtered_selected_threshold = undefined;
gtiz_zooms.selected_cluster = undefined;
gtiz_zooms.filtered_selected_cluster = undefined;
gtiz_zooms.selection_alerts = 'show'
gtiz_zooms.apply_settings = 'apply';

gtiz_zooms.tree_node = document.querySelector('.tree-container');

gtiz_zooms.context_menu = [{
  type : 'select',
  id : 'zooms-menu-mst',
  label : () => {
    return gtiz_locales.current.select_threshold;
  },
  icon : '',
  options : () => {
    let values = gtiz_zooms.getMstOptions();
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_legend.getMstOptionsDefaultValue();
    return value;
  },
  function : (value) => {
    gtiz_legend.changeMstOption(value);
  }
}, {
  type : 'select',
  id : 'zooms-menu-clusters',
  label : () => {
    return gtiz_locales.current.select_cluster;
  },
  icon : '',
  options : () => {
    let values = gtiz_zooms.getClustersOptions();
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_zooms.getClustersOptionsDefaultValue();
    return value;
  },
  function : (value) => {
    gtiz_zooms.changeClusterOption(value);
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
  id : 'zooms-filtered-menu-mst',
  label : () => {
    return gtiz_locales.current.select_threshold;
  },
  icon : '',
  options : () => {
    let values = gtiz_zooms.getMstOptions(true);
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_legend.getMstOptionsDefaultValue(true);
    return value;
  },
  function : (value) => {
    gtiz_legend.changeMstOption(value, true);
  }
}, {
  type : 'select',
  id : 'zooms-filtered-menu-clusters',
  label : () => {
    return gtiz_locales.current.select_cluster;
  },
  icon : '',
  options : () => {
    let values = gtiz_zooms.getClustersOptions(true);
    return values;
  },
  default : undefined,
  get_default : () => {
    let value = gtiz_zooms.getClustersOptionsDefaultValue(true);
    return value;
  },
  function : (value) => {
    gtiz_zooms.changeClusterOption(value, true);
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
  let threshold = filtered ? gtiz_zooms.filtered_selected_threshold : gtiz_zooms.selected_threshold;
  let cluster = filtered ? gtiz_zooms.filtered_selected_cluster : gtiz_zooms.selected_cluster;
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
  let threshold = filtered ? gtiz_zooms.filtered_selected_threshold : gtiz_zooms.selected_threshold;
  let cluster = filtered ? gtiz_zooms.filtered_selected_cluster : gtiz_zooms.selected_cluster;
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
  let selected = gtiz_zooms.selected_threshold;
  let cluster = gtiz_zooms.selected_cluster;
  if (typeof gtiz_zooms.samples_by_mst_cluster && gtiz_zooms.samples_by_mst_cluster != null) {
    let threshold = gtiz_zooms.samples_by_mst_cluster[selected];
    if (threshold) {
      let codes = threshold[cluster];
      gtiz_tree.tree.selectNodesByIds(codes);
    } else {
      let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
      let contents = [];
      let content = document.createElement('p');
      content.innerHTML = gtiz_locales.current.zooms_clusters_generic_problem;
      contents.push(content);
      let feedback = '<p>' + gtiz_locales.current.selected_threshold_not_found_in_metadata + '</p>';
      let f_type = 'info';
      gtiz_modal.buildNotifier(title, contents, feedback, f_type);
    }
  } else {
    let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
    let contents = [];
    let content = document.createElement('p');
    content.innerHTML = gtiz_locales.current.zooms_clusters_generic_problem;
    contents.push(content);
    let feedback = '<p>' + gtiz_locales.current.samples_by_mst_and_cluster_not_found + '</p>';
    let f_type = 'info';
    gtiz_modal.buildNotifier(title, contents, feedback, f_type);
  }
}

gtiz_zooms.setSelectedCluster = function(value, filtered) {
  if (filtered) {
    gtiz_zooms.filtered_selected_cluster = value ? value : undefined;
  } else {
    gtiz_zooms.selected_cluster = value ? value : undefined;
  }
}

gtiz_zooms.changeClusterOption = function(value, filtered) {
  gtiz_zooms.setSelectedCluster(value, filtered);
}

gtiz_zooms.getClustersOptionsDefaultValue = function(filtered) {
  let threshold = filtered ? gtiz_zooms.filtered_selected_threshold : gtiz_zooms.selected_threshold;
  let clusters = filtered ? gtiz_zooms.filtered_zooms[threshold] : gtiz_zooms.zooms[threshold];
  gtiz_zooms.setSelectedCluster(clusters[0], filtered);
  return clusters[0];
}

gtiz_zooms.getClustersOptions = function(filtered) {
  let threshold = filtered ? gtiz_zooms.filtered_selected_threshold : gtiz_zooms.selected_threshold;
  let clusters = filtered ? gtiz_zooms.filtered_zooms[threshold] : gtiz_zooms.zooms[threshold];
  let options = [];
  clusters.forEach(threshold => {
    let obj = {
      label : threshold,
      value : threshold
    }
    options.push(obj);
  });
  return options;
}

gtiz_zooms.setSelectedMst = function(value, filtered) {
  if (filtered) {
    gtiz_zooms.filtered_selected_threshold = value ? value : undefined;
  } else {
    gtiz_zooms.selected_threshold = value ? value : undefined;
  }
}

gtiz_legend.changeMstOption = function(value, filtered) {
  gtiz_zooms.setSelectedMst(value, filtered);
  let selector = filtered ? '#zooms-filtered-menu-clusters' : '#zooms-menu-clusters';
  let select = document.querySelector(selector);
  select.innerHTML = '';
  let clusters = filtered ? gtiz_zooms.filtered_zooms[value] : gtiz_zooms.zooms[value];
  clusters.forEach(threshold => {
    let option = new Option(threshold, threshold);
    select.add(option);
  });
  gtiz_zooms.setSelectedCluster(clusters[0], filtered);
  select.value = clusters[0];
}

gtiz_legend.getMstOptionsDefaultValue = function(filtered) {
  let thresholds = filtered ? Object.keys(gtiz_zooms.filtered_zooms) : Object.keys(gtiz_zooms.zooms);
  gtiz_zooms.setSelectedMst(thresholds[0], filtered);
  return thresholds[0];
}

gtiz_zooms.getMstOptions = function(filtered) {
  let thresholds = filtered ? Object.keys(gtiz_zooms.filtered_zooms) : Object.keys(gtiz_zooms.zooms);
  let options = [];
  thresholds.forEach(threshold => {
    let obj = {
      label : threshold,
      value : threshold
    }
    options.push(obj);
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
  let title = '<i class="iconic iconic-information"></i> ' + gtiz_locales.current.zooms_found_for_clusters;
  let id = 'zooms-found-notifier';
  let contents = [];
  let content = document.createElement('p');
  content.innerHTML = gtiz_locales.current.zooms_found_for_clusters_message;
  contents.push(content);
  let actions = [];
  let link = document.createElement('a');
  link.innerHTML = '<i class="iconic iconic-zoom-in"></i> ' + gtiz_locales.current.see_clusters_zooms;
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
  let feedback = '<p>' + gtiz_locales.current.zooms_found_for_clusters_info + '</p>';
  let f_type = 'info';
  gtiz_modal.buildComponentNotifier(component, id, title, contents, actions, feedback, f_type);
}

/**
 * Check if a zoom exist for selected legend item
 * 
 * @param {Object} nodes Selected category
 */
gtiz_zooms.checkZooms = function(nodes) {

  function intersectClustersWithObject(clusters, obj) {
    let result = {};
    Object.keys(obj).forEach(key => {
        let intersection = obj[key].filter(cluster => clusters.includes(cluster));
        if (intersection.length > 0) {
          result[key] = intersection;
        }
    });
    return result;
  }

  if (gtiz_utils.isObjectNotEmpty(gtiz_zooms.zooms)) {
    if (!nodes) {
      nodes = gtiz_tree.tree.getAllSelectedNodesIDs();
    }
    let ids = Object.values(nodes).flat();
    let msts = gtiz_zooms.msts;
    let clusters = [];
    if (ids.length > 0 && msts.length > 0) {
      ids.forEach(id => {
        msts.forEach(mst => {
          let mst_clusters = gtiz_zooms.zooms[mst];
          if (mst_clusters && gtiz_zooms.clusters_by_sample_mst) {
            let sample = gtiz_zooms.clusters_by_sample_mst[id];
            if (sample) {
              let clusters_by_sample = sample[mst];
              if (clusters_by_sample) {
                /**
                 * Here we build an interception from the two arrays to check if a zoom is available for provided sample (id).
                 */
                let set = new Set(clusters_by_sample);
                let intersection = mst_clusters.filter(item => set.has(item));
                if (intersection && intersection.length > 0) {
                  clusters.push(...intersection);
                }
              }
            }
          }
        });
      });
      clusters = [...new Set(clusters)];
      gtiz_zooms.filtered_zooms = intersectClustersWithObject(clusters, gtiz_zooms.zooms);
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
            gtiz_zooms.zooms[key] = gtiz_zooms.clusters[key];
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

  if ('zooms' in gtiz_file_handler.params) {
    let zooms = gtiz_file_handler.params.zooms;
    let parts = zooms.includes('@') ? zooms.split('@') : undefined;
    let categories = parts ? parts[0].split(',') : undefined;
    let thresholds = parts ? gtiz_utils.extractNumbersAndRanges(parts[1]) : undefined;
    
    if (categories) {
      // metadata column to take into consideration
      gtiz_zooms.category = categories[0] ? categories[0] : 'category';
      // sample of interest used to generate clusters
      gtiz_zooms.soi = categories[1] ? categories[1].toLowerCase() : 'sample of interest';
    } else {
      // metadata column to take into consideration
      gtiz_zooms.category = 'category';
      // sample of interest used to generate clusters
      gtiz_zooms.soi = 'sample of interest';
    }

    if (thresholds && thresholds.length > 0) {
      gtiz_zooms.thresholds_params = thresholds;
    }

    let prefix = gtiz_file_handler.params.zooms_prefix;
    gtiz_zooms.zooms_prefix = prefix ? prefix : 'Reportree';

    if (gtiz_file_handler.samples_column) {
      gtiz_zooms.cfg.metadata_sample_name = gtiz_file_handler.samples_column;
    } else {
      gtiz_zooms.cfg.metadata_sample_name = 'ID';
    }

    gtiz_zooms.buildZoomsObjects();

  } else {

    if ('zooms_list' in gtiz_file_handler.params) {      
      let base_path = gtiz_file_handler.getBasePath();
      let file = gtiz_file_handler.params.zooms_list
      let path = base_path + '/' + file;
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
          let list = contents.split(/\r?\n/); // \n or \r\n if generated by windows
          let extracted = list.map(item => {
            let parts = item.split("_");
            // Assuming the first and second underscores always exist,
            // 'parts[1]' will be the string between the first and second underscore,
            // and 'parts.slice(2).join("_")' will reconstruct the string after the second underscore.
            return {
              prefix: parts[0],
              threshold: parts[1],
              cluster: parts.slice(2).join("_")
            };
          });
          let aggregated = extracted.reduce((acc, { threshold, cluster }) => {
            // If the key exists, push to its array, otherwise create a new array with the item
            if (acc[threshold]) {
              acc[threshold].push(cluster);
            } else {
              acc[threshold] = [cluster];
            }
            return acc;
          }, {});
          let prefix = gtiz_file_handler.params.zooms_prefix ? gtiz_file_handler.params.zooms_prefix : extracted[0].prefix;
          gtiz_zooms.zooms_prefix = prefix ? prefix : 'Reportree';
          gtiz_zooms.zooms = aggregated;

          if (gtiz_file_handler.samples_column) {
            gtiz_zooms.cfg.metadata_sample_name = gtiz_file_handler.samples_column;
          } else {
            gtiz_zooms.cfg.metadata_sample_name = 'ID';
          }
          
          gtiz_zooms.buildZoomsObjects();
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