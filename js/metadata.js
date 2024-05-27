let gtiz_metadata = {};

gtiz_metadata.initialized = false;
gtiz_metadata.show_nodes = 'show_all';
gtiz_metadata.show_hypothetical = 'hide_hypo';
gtiz_metadata.selected_column = '';
gtiz_metadata.change_metadata_selected_only = 'all';
gtiz_metadata.color_by_defined_category = 'leave';

gtiz_metadata.metadata_node = document.querySelector(".metadata");
gtiz_metadata.metadata_container = document.querySelector(".metadata-container");
gtiz_metadata.grid_div = document.getElementById("metadata-grid");

/**
 * Card header menu definition.
 * 
 */
gtiz_metadata.card_menu = [{
  type: 'abutton',
  label: gtiz_locales.current.select_all,
  icon: 'iconic-check-circle',
  function: () => {
    gtiz_metadata.selectAll();
  }
}, {
  type: 'abutton',
  label: gtiz_locales.current.clean_selection,
  icon: 'iconic-minus-circle',
  function: () => {
    gtiz_metadata.deselectAll();
  }
}];

/**
 * Card context menu definition
 * 
 */
gtiz_metadata.context_menu = [{
  type: 'toggle',
  id: 'metadata-selected-only',
  options: [{
    label: () => {
      return gtiz_locales.current.selected_only;
    },
    value: 'show_selected',
    icon: 'iconic-eye'
  }, {
    label: () => {
      return gtiz_locales.current.selected_only;
    },
    value: 'show_all',
    icon: 'iconic-eye-off'
  }],
  selected: () => {
    return gtiz_metadata.show_nodes;
  },
  function: (value) => {
    gtiz_metadata.toggleShowSelected(value);
  }
}, {
  type: 'separator'
}, {
  type: 'abutton',
  label: () => {
    return gtiz_locales.current.add_metadata;
  },
  icon: 'iconic-file-plus',
  function: () => {
    gtiz_metadata.changeMetadata('add');
  }
}, {
  type: 'abutton',
  label: () => {
    return gtiz_locales.current.edit_metadata;
  },
  icon: 'iconic-edit',
  function: () => {
    gtiz_metadata.changeMetadata('edit');
  }
}, {
  type: 'separator'
}, {
  type: 'abutton',
  label: () => {
    return gtiz_locales.current.add_metadata_for_selection;
  },
  icon: 'iconic-file-plus',
  function: () => {
    let selected = true;
    gtiz_metadata.changeMetadata('add', selected);
  }
}, {
  type: 'abutton',
  label: () => {
    return gtiz_locales.current.edit_metadata_for_selection;
  },
  icon: 'iconic-edit',
  function: () => {
    let mode = 'edit';
    let selected = true;
    gtiz_metadata.changeMetadata(mode, selected);
  }
}, {
  type: 'separator'
}, /* {
  type: 'abutton',
  label: () => {
    return gtiz_locales.current.reset_to_initial_values;
  },
  icon: 'iconic-redo',
  function: () => {
    gtiz_metadata.resetGrid();
  }
}, {
  type: 'separator'
}, */ {
  type: 'select',
  id: 'metadata-menu-color-by',
  label: () => {
    return gtiz_locales.current.select_column;
  },
  icon: '',
  options: () => {
    let values = gtiz_metadata.getColorByOptions();
    return values;
  },
  default: undefined,
  get_default: () => {
    let value = gtiz_metadata.getColorByDefaultValue();
    return value;
  },
  function: (value) => {
    gtiz_metadata.changeCategoryColor(value);
  }
}, {
  type: 'abutton',
  label: () => {
    return gtiz_locales.current.move_to_first_position;
  },
  icon: 'iconic-arrow-left',
  function: () => {
    gtiz_metadata.moveColumn();
  }
}, {
  type: 'abutton',
  label: () => {
    return gtiz_locales.current.set_as_figure_legend;
  },
  icon: 'iconic-bookmark',
  function: () => {
    gtiz_metadata.setColumnsAsLegend();
  }
}, {
  type: 'separator'
}, {
  type: 'abutton',
  label: () => {
    return gtiz_locales.current.resize_columns;
  },
  icon: 'iconic-columns-vertical',
  function: () => {
    gtiz_metadata.options.columnApi.autoSizeAllColumns(false);
  }
}, {
  type: 'separator'
}, {
  type: 'toggle',
  id: 'metadata-show-hypo',
  options: [{
    label: () => {
      return gtiz_locales.current.show_hypothetical;
    },
    value: 'show_hypo',
    icon: 'iconic-eye'
  }, {
    label: () => {
      return gtiz_locales.current.show_hypothetical;
    },
    value: 'hide_hypo',
    icon: 'iconic-eye-off'
  }],
  selected: () => {
    return gtiz_metadata.show_hypothetical;
  },
  function: (value) => {
    gtiz_metadata.toggleShowHypotetical(value);
  }
}, {
  type: 'separator'
}, {
  type: 'abutton_optioned',
  id: 'metadata-export-button',
  label: () => {
    return gtiz_locales.current.download_table;
  },
  icon: 'iconic-download',
  options: [{
    label: '.csv',
    value: 'csv'
  }, {
    label: '.tsv',
    value: 'tsv'
  }],
  selected: () => {
    return 'csv';
  },
  function: (e) => {
    gtiz_metadata.exportTable(e);
  }
}];

/**
 * Modal form for change grid contents functions
 * 
 */

gtiz_metadata.modal_form = {
  'edit': {
    'all': [{
      type: 'select',
      id: 'metadata-modal-menu-color-by',
      label: () => {
        return gtiz_locales.current.select_column;
      },
      icon: '',
      options: () => {
        let values = gtiz_metadata.getColorByOptions();
        return values;
      },
      default: undefined,
      get_default: () => {
        let value = gtiz_metadata.getColorByDefaultValue();
        return value;
      },
      function: (value) => { }
    }, {
      type: 'text',
      id: 'metadata-modal-edit-text',
      label: gtiz_locales.current.define_metadata,
      icon: '',
      placeholder: gtiz_locales.current.define_metadata + '...',
      default: undefined,
      function: (value) => {
        gtiz_metadata.editMetadata(value);
      }
    }, {
      type: 'button',
      id: 'metadata-modal-edit-button',
      label: gtiz_locales.current.edit,
      icon: 'iconic-check',
      function: () => {
        gtiz_metadata.editMetadata();
      }
    }],
    'selected': [{
      type: 'select',
      id: 'metadata-modal-menu-color-by',
      label: () => {
        return gtiz_locales.current.select_column;
      },
      icon: '',
      options: () => {
        let values = gtiz_metadata.getColorByOptions();
        return values;
      },
      default: undefined,
      get_default: () => {
        let value = gtiz_metadata.getColorByDefaultValue();
        return value;
      },
      function: (value) => { }
    }, {
      type: 'text',
      id: 'metadata-modal-edit-text',
      label: gtiz_locales.current.define_metadata,
      icon: '',
      placeholder: gtiz_locales.current.define_metadata + '...',
      default: undefined,
      function: (value) => {
        let selected = true;
        gtiz_metadata.editMetadata(value, selected);
      }
    }, {
      type: 'button',
      id: 'metadata-modal-edit-button',
      label: gtiz_locales.current.edit,
      icon: 'iconic-check',
      function: () => {
        let value = undefined;
        let selected = true;
        gtiz_metadata.editMetadata(value, selected);
      }
    }]
  },
  'add': {
    'all': [{
      type: 'text',
      id: 'metadata-modal-add-category-text',
      label: gtiz_locales.current.define_column,
      icon: '',
      placeholder: gtiz_locales.current.define_column + '...',
      default: undefined,
      function: (value) => {
        gtiz_metadata.addMetadata();
      }
    }, {
      type: 'text',
      id: 'metadata-modal-add-values-text',
      label: gtiz_locales.current.define_a_default_value,
      icon: '',
      placeholder: gtiz_locales.current.define_a_default_value + '...',
      default: undefined,
      function: (value) => {
        gtiz_metadata.addMetadata();
      }
    }, {
      type : 'toggle',
      id : 'metadata-modal-color-by-category-toggle',
      options : [{
          label : () => {
            return gtiz_locales.current.color_by_defined_category;
          },
          value : 'color',
          icon : 'iconic-information'
        },
        {
          label : () => {
            return gtiz_locales.current.color_by_defined_category;
          },
          value : 'leave',
          icon : 'iconic-ban'
      }],
      selected : () => {
        return  gtiz_metadata.color_by_defined_category;
      },
      function : (value) => {
        gtiz_metadata.toggleColorByDefinedCategory(value);
      }
    }, {
      type: 'button',
      id: 'metadata-modal-add-button',
      label: 'Add',
      icon: 'iconic-file-plus',
      function: () => {
        gtiz_metadata.addMetadata();
      }
    }],
    'selected': [{
      type: 'text',
      id: 'metadata-modal-add-category-text',
      label: gtiz_locales.current.define_column,
      icon: '',
      placeholder: gtiz_locales.current.define_column + '...',
      default: undefined,
      function: (value) => {
        let selected = true;
        gtiz_metadata.addMetadata(selected);
      }
    }, {
      type: 'text',
      id: 'metadata-modal-add-values-text-unselected',
      label: gtiz_locales.current.define_a_value_for_unselected,
      icon: '',
      placeholder: gtiz_locales.current.define_for_unselected + '...',
      default: undefined,
      function: (value) => {
        let selected = true;
        gtiz_metadata.addMetadata(selected);
      }
    }, {
      type: 'text',
      id: 'metadata-modal-add-values-text-selected',
      label: gtiz_locales.current.define_a_value_for_selected,
      icon: '',
      placeholder: gtiz_locales.current.define_for_selected + '...',
      default: undefined,
      function: (value) => {
        let selected = true;
        gtiz_metadata.addMetadata(selected);
      }
    }, {
      type : 'toggle',
      id : 'metadata-modal-color-by-category-toggle',
      options : [{
          label : () => {
            return gtiz_locales.current.color_by_defined_category;
          },
          value : 'color',
          icon : 'iconic-target'
        },
        {
          label : () => {
            return gtiz_locales.current.not_color_by_defined_category;
          },
          value : 'leave',
          icon : 'iconic-ban'
      }],
      selected : () => {
        return  gtiz_metadata.color_by_defined_category;
      },
      function : (value) => {
        gtiz_metadata.toggleColorByDefinedCategory(value);
      }
    }, {
      type: 'button',
      id: 'metadata-modal-add-button',
      label: 'Add',
      icon: 'iconic-file-plus',
      function: () => {
        let selected = true;
        gtiz_metadata.addMetadata(selected);
      }
    }]
  }
};

/**
 * Avoid text selection when we perform a multiselection on checkboxes
 * 
 */
gtiz_metadata.grid_div.addEventListener('selectstart', function (event) {
  let target = event.target;
  if (target && target.nodeType !== 3) {
    let cls = target.getAttribute('class');
    let child = target.querySelector('.ag-checkbox-input-wrapper');
    if (cls.includes('ag-checkbox-input-wrapper')) {
      event.preventDefault();
    } else if (child) {
      event.preventDefault();
    }
  }
});

/**
 * Filter keys from object
 * 
 * @param {Object} obj 
 * @param {Array} exclude 
 * @returns 
 */
gtiz_metadata.filterKeys = function(obj, exclude) {
  let newObj = {};
  for (let key in obj) {
    if (!exclude.includes(key)) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}

/**
 * Create TSV row from object
 * 
 * @param {Object} obj 
 * @returns 
 */
gtiz_metadata.createTSVRow = function(obj) {
  return Object.values(obj).join('\t') + '\n';
}

/**
 * Should return true if external filter passes, otherwise false.
 * https://www.ag-grid.com/javascript-data-grid/filter-external/
 * 
 * @param {Object} node Row object
 * @returns Boolean
 */
gtiz_metadata.doesExternalFilterPass = function (node) {
  if (node) {
    if (gtiz_metadata.show_nodes == 'show_selected') {
      if (!node.isSelected()) {
        return false;
      }
    }
    if (gtiz_metadata.show_hypothetical == 'hide_hypo') {
      if (node.data.ID.includes('_hypo')) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Grid calls this method to know if an external filter is present. `isExternalFilterPresent` is called exactly once every time the grid senses a filter change. It should return true if external filtering is active or false otherwise.
 * 
 * If you return true, `doesExternalFilterPass` will be called while filtering, otherwise `doesExternalFilterPass` will not be called.
 * 
 * https://www.ag-grid.com/javascript-data-grid/filter-external/
 * 
 * @returns Boolean
 * 
 */
gtiz_metadata.isExternalFilterPresent = function () {
  if (gtiz_metadata.show_nodes !== 'show_all' || gtiz_metadata.show_hypothetical !== 'show_hypo') {
    return true;
  } else {
    return false;
  }
}

gtiz_metadata.toggleColorByDefinedCategory = function(value) {
  gtiz_metadata.color_by_defined_category = value;
}

/**
 * Update metadata with indicated values and return a tsv formatted string.
 * 
 * @param {Object} metadata Metadata object from tree
 * @param {Array} nodes Array of selected nodes to modify, if empty apply to all nodes
 * @param {String} category Metadata category to add/modify
 * @param {String} value Metadata value to set
 * @param {String} unselected Metadata value to set for unselected nodes, could not exist
 * @returns 
 */
gtiz_metadata.updateMetadata = function(metadata, nodes, category, value, unselected) {
  let tsv = '';
  let head = '';
  for (let key in metadata) {
    if (key === 'CMP' || key === 'ID' || key.includes('_hypo') || key === '') continue;
    if (nodes.length > 0) {
      let default_value = unselected === 'optional' || !unselected ? metadata[key][category] : unselected;
      metadata[key][category] = nodes.includes(metadata[key]['ID']) ? value : default_value;
    } else {
      metadata[key][category] = value;
    }
    let obj = gtiz_metadata.filterKeys(metadata[key], ['__Node', 'nothing']);
    if (head === '') {
      head = Object.keys(obj).join('\t') + '\n';
      tsv += head;
    }
    tsv += gtiz_metadata.createTSVRow(obj);
  }
  return tsv;
}

/**
 * Load metadata from string formatted as tsv.
 * 
 * @param {String} tsv 
 */
gtiz_metadata.loadMetadata = function (tsv) {
  if (gtiz_tree.tree) {
    let l_action = 'add';
    let l_components = ['tree', 'map', 'legend'];
    gtiz_layout.uiLoadingManager(l_components, l_action);
    gtiz_file_handler.loadMetadataText(tsv);
    gtiz_metadata.findNodes();
    gtiz_map.init();
  } else {
    let title = gtiz_locales.current.oops;
    let contents = [];
    let body = document.createElement('div');
    body.innerHTML = gtiz_locales.current.missing_tree_alert;
    contents.push(body);
    gtiz_modal.buildModal(title, contents);
    console.log(gtiz_locales.current.missing_tree_alert);
  }
}

/**
 * Add metadata columns and values
 * 
 * @param {Boolean} selected If true apply to selected nodes only
 */
gtiz_metadata.addMetadata = function (selected) {
  let metadata = gtiz_tree.tree.metadata;
  let category = document.getElementById('metadata-modal-add-category-text').value;
  let selected_value = selected ? document.getElementById('metadata-modal-add-values-text-selected').value : document.getElementById('metadata-modal-add-values-text').value;
  let unselected_value = selected ? document.getElementById('metadata-modal-add-values-text-unselected').value : 'optional';

  if (category && unselected_value && selected_value) {
    gtiz_modal.closeModal();
    let nodes = selected ? gtiz_tree.tree.getAllSelectedNodesIDs() : [];
    let tsv = gtiz_metadata.updateMetadata(metadata, nodes, category, selected_value, unselected_value);
    gtiz_metadata.loadMetadata(tsv);
    if (gtiz_metadata.color_by_defined_category == 'color') {
      gtiz_legend.changeCategoryColor(category);
    }
  } else {
    let feedback = document.querySelector('.modal-feedback');
    feedback.classList.add('warning');
    feedback.innerHTML = '<p><i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.all_fields_required_message + '</p>';
    feedback.classList.add('show');
  }
}

/**
 * Edit metadata function, called by modal form button.
 * 
 * @param {String} category Column to edit
 * @param {String} value Value to set for the given column and selected rows
 * @param {Boolean} selected If true apply to selected rows
 */
gtiz_metadata.editMetadata = function (value, selected) {
  if (!value) {
    value = document.getElementById('metadata-modal-edit-text').value;
  }
  let metadata = gtiz_tree.tree.metadata;
  let category = document.getElementById('metadata-modal-menu-color-by').value;

  if (category && value) {
    gtiz_modal.closeModal();
    let nodes = selected ? gtiz_tree.tree.getAllSelectedNodesIDs() : [];
    let tsv = gtiz_metadata.updateMetadata(metadata, nodes, category, value);
    gtiz_metadata.loadMetadata(tsv);
    if (gtiz_metadata.color_by_defined_category == 'color') {
      gtiz_legend.changeCategoryColor(category);
    }
  } else {
    let feedback = document.querySelector('.modal-feedback');
    feedback.classList.add('warning');
    feedback.innerHTML = '<p><i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.all_fields_required_message + '</p>';
    feedback.classList.add('show');
  }
}

/**
 * Build modal form contents for change grid functions.
 * 
 * @param {String} mode edit || add || remove 
 * @param {Array} selected Selected rows
 * @returns 
 */
gtiz_metadata.buildChangeMetadataModalContents = function (mode, selected) {
  let contents = [];

  let cfg = selected ? gtiz_metadata.modal_form[mode]['selected'] : gtiz_metadata.modal_form[mode]['all'];
  let form = document.createElement('div');
  form.setAttribute('class', 'modal-form');

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
    if (item.type == 'text') {
      let box = document.createElement('div');
      box.setAttribute('class', 'input-box input-box-text');
      if (item.label) {
        let label = document.createElement('div');
        label.setAttribute('class', 'form-label');
        let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
        label.innerHTML = icon + item.label;
        box.append(label);
      }
      let input = document.createElement('input');
      input.setAttribute('type', 'text');
      if (item.id) {
        input.setAttribute('id', item.id);
      }
      if (item.placeholder) {
        input.setAttribute('placeholder', item.placeholder);
      }
      if (item.default) {
        input.value = item.default;
      } else {
        if (typeof item.get_default === 'function') {
          let value = item.get_default();
          input.value = value;
        }
      }
      let events = ['keydown'];
      events.forEach((event) => {
        input.addEventListener(event, (e) => {
          if (e.key === "Enter") {
            let value = input.value;
            item.function(value);
          }
        });
      });
      box.append(input);
      form.append(box);
    }
    if (item.type == 'button') {
      let box = document.createElement('div');
      box.setAttribute('class', 'button-box');
      let button = document.createElement('button');
      button.setAttribute('class', 'secondary');
      let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
      button.innerHTML = icon + item.label;
      button.addEventListener('click', function (e) {
        item.function();
      });
      box.append(button);
      form.append(box);
    }
  });
  contents.push(form);

  return contents;
}

/**
 * Reset grid contents to initial values.
 */
/* gtiz_metadata.resetGrid = function () {
  gtiz_metadata.loadMetadata(gtiz_metadata.data_bkp);
} */

/**
 * Action to change grid contents, called by context menu.
 * 
 * @param {String} mode `edit`|| `add` || `remove`
 * @param {Boolean} selected If `true` we change only selected rows
 */
gtiz_metadata.changeMetadata = function (mode, selected) {
  let title;
  switch (mode) {
    case 'edit':
      title = gtiz_locales.current.edit_metadata;
      break;
    case 'add':
      title = gtiz_locales.current.add_metadata;
      break;
    default:
      break;
  }
  let contents = [];
  let feedback;
  let f_type;
  if (selected) {
    let nodes = gtiz_tree.tree.getAllSelectedNodesIDs();
    if (!nodes || nodes.length === 0) {
      let message = document.createElement('div');
      message.setAttribute('class', 'modal-message');
      message.innerHTML = '<p>' + gtiz_locales.current.oops + '</p>';
      contents.push(message);
      feedback = '<p><i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.no_item_selected + '</p>';
      f_type = 'warning';
    } else {
      contents = gtiz_metadata.buildChangeMetadataModalContents(mode, selected);
    }
  } else {
    contents = gtiz_metadata.buildChangeMetadataModalContents(mode);
  }
  gtiz_modal.buildModal(title, contents, feedback, f_type);
}

/**
 * Change grid filter to show/hide _hypo.
 * 
 * @param {String} value `show_hypo` || `hide_hypo`
 * 
 */
gtiz_metadata.toggleShowHypotetical = function (value) {
  gtiz_metadata.show_hypothetical = value;
  gtiz_metadata.options.api.onFilterChanged();
}

/**
 * Change grid filter for selected items.
 * 
 * @param {String} value `show_all` || `show_selected`
 * 
 */
gtiz_metadata.toggleShowSelected = function (value) {
  gtiz_metadata.show_nodes = value;
  gtiz_metadata.options.api.onFilterChanged();
}

/**
 * Call `tiz_legend.changeCategoryColor` to change figure legend.
 * 
 */
gtiz_metadata.setColumnsAsLegend = function () {
  let value = gtiz_metadata.selected_column;
  gtiz_legend.changeCategoryColor(value);
}

/**
 * Move selected columns in first position. Moves a column to `toIndex`. The column is first removed, then added at the `toIndex` location, thus index locations will change to the right of the column after the removal.
 * 
 * https://www.ag-grid.com/javascript-data-grid/column-moving/
 * 
 */
gtiz_metadata.moveColumn = function () {
  let column = gtiz_metadata.selected_column;
  let position = 1;
  gtiz_metadata.options.columnApi.moveColumn(column, position);
}

/**
 * Change color by category
 * 
 * @param {String} value Category
 */
gtiz_metadata.changeCategoryColor = function (value) {
  gtiz_metadata.selected_column = value;
}

/**
 * Get current active category to set color by form value in context menu
 * 
 * @returns category
 */
gtiz_metadata.getColorByDefaultValue = function () {
  let tree = gtiz_tree.tree;
  let category = tree.display_category;
  gtiz_metadata.selected_column = category;
  return category;
}

/**
 * Retreive the metadata category list to populate relative metadata context menu select input.
 * 
 * @returns colors An array of object with value and label of available catgories
 */
gtiz_metadata.getColorByOptions = function () {
  let tree = gtiz_tree.tree;
  let colors = Object.keys(tree.metadata_info)
    .sort()
    .map(function (category) {
      let label = tree.metadata_info[category]['label'];
      label = label.toLowerCase();
      label = label.charAt(0).toUpperCase() + label.slice(1) // same formula used to render legend title
      let ar = {
        value: category,
        label: label
      }
      return ar;
    });
  return colors;
}

/**
 * Export table
 * https://www.ag-grid.com/javascript-data-grid/csv-export/
 * 
 * We use same function by changing separator value and file name.
 * 
 * @param {event} e Event object
 */
gtiz_metadata.exportTable = function (e) {
  let buttuon = e.currentTarget;
  let box = buttuon.parentElement;
  let select = box.querySelector('select');
  let value = select ? select.value : 'csv';
  let separator = value == 'csv' ? ',' : '\t';
  let timestamp = Date.now();
  let name = "metadata" + timestamp + "." + value;
  let columns = gtiz_metadata.options.columnApi.getColumns();
  // we are removing first column dedicated to checkbox
  columns.shift();
  gtiz_metadata.options.api.exportDataAsCsv({
    columnKeys: columns,
    suppressQuotes: true,
    columnSeparator: separator,
    fileName: name
  });
}

/**
 * Select all event, we select directly on tree ad by reflection `tree.interceptor` set rows selection with `gtiz_metadata.findNodes`.
 * 
 */
gtiz_metadata.selectAllFilteredOnly = function () {
  gtiz_metadata.options.api.selectAllFiltered();
  let codes = [];
  gtiz_metadata.options.api.forEachNode(element => {
    if (element.isSelected()) {
      codes.push(element.data.ID);
    }
  });
  gtiz_tree.tree.selectNodesByIds(codes);
}

/**
 * Select all event, we select directly on tree ad by reflection `tree.interceptor` set rows selection with `gtiz_metadata.findNodes`.
 * 
 */
gtiz_metadata.deselectAllFilteredOnly = function () {
  let codes = [];
  gtiz_metadata.options.api.forEachNodeAfterFilter(node => {
    node.setSelected(false);
  });
  gtiz_metadata.options.api.forEachNode(element => {
    if (!element.isSelected() && !element.data.ID.includes('hypo')) {
      codes.push(element.data.ID);
    }
  });
  gtiz_tree.tree.unselectNodesByIds(codes);
}

/**
 * Select all event, we select directly on tree ad by reflection `tree.interceptor` set rows selection with `gtiz_metadata.findNodes`.
 * 
 */
gtiz_metadata.selectAll = function () {
  gtiz_tree.tree.selectAll();
}

/**
 * Deselect all event, we deselect directly on tree ad by reflection `tree.interceptor` set rows selection with `gtiz_metadata.findNodes`.
 * 
 */
gtiz_metadata.deselectAll = function () {
  gtiz_tree.tree.clearSelection();
}

/**
 * Called by tree.interceptor on tree selection change.
 * 
 * @param {Object} nodes Object containing information non selected nodes.
 * 
 */
gtiz_metadata.findNodes = function (nodes) {
  let components = ['metadata'];
  let action = 'add';
  gtiz_layout.uiLoadingManager(components, action);

  setTimeout(() => {
    if (!nodes) {
      nodes = gtiz_tree.tree.getAllSelectedNodesIDs();
    }
    let selected = new Set(Object.values(nodes).flat());
    if (gtiz_metadata.options.api) {
      gtiz_metadata.options.api.forEachNode(node => {
        if (selected.has(node.data.ID)) {
          if (!node.isSelected()) {
            node.setSelected(true);
          }
        } else {
          if (node.isSelected()) {
            node.setSelected(false);
          }
        }
      });
    }

    action = 'remove';
    gtiz_layout.uiLoadingManager(components, action);
    gtiz_metadata.options.columnApi.autoSizeAllColumns(false);
  }, 0);
}

/**
 * Build the ui for the metadata card based on `gtiz_metadata.card_menu`. In this case we build the header buttons of the card.
 * 
 */
gtiz_metadata.buildUi = function () {
  let form = gtiz_metadata.metadata_node.querySelector('.card-form');
  form.innerHTML = '';
  let menu = gtiz_metadata.card_menu;
  menu.forEach(item => {
    if (item.type == 'abutton') {
      let box = document.createElement('div');
      box.setAttribute('class', 'button-box');
      let a = document.createElement('a');
      a.setAttribute('class', 'card-action');
      let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
      a.innerHTML = icon + item.label;
      a.addEventListener('click', (e) => {
        item.function();
      });
      box.append(a);
      form.append(box);
    }
  });
}
/**
 * Options definition for ag-grid library
 * 
 */
gtiz_metadata.options = {
  // default col def properties get applied to all columns
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true
  },
  enableCellTextSelection: true,
  ensureDomOrder: true,
  rowSelection: 'multiple',
  suppressRowClickSelection: true,
  rowMultiSelectWithClick: true,
  animateRows: true, // have rows animate to new positions when sorted
  suppressColumnVirtualisation: true,
  suppressFieldDotNotation: true,
  isRowSelectable: (params) => {
    return !params.data.ID.includes('hypo');
  },
  onSelectionChanged: (event) => {
    if (event.source === 'api') {
      return;
    }
    if (event.source === 'checkboxSelected') {
      let nodes = gtiz_tree.tree.getAllSelectedNodesIDs();
      let selected = event.api.getSelectedNodes();
      let codes = [];
      selected.forEach(element => {
        codes.push(element.data.ID);
      });
      if (codes.length >= nodes.length) {
        gtiz_tree.tree.selectNodesByIds(codes);
      } else {
        let filtered = nodes.filter(item => !codes.includes(item));
        gtiz_tree.tree.unselectNodesByIds(filtered);
      }
    }
    if (event.source === 'uiSelectAllFiltered') {
      let selected = event.api.getSelectedNodes();
      if (selected.length == 0) {
        gtiz_metadata.deselectAllFilteredOnly();
      } else {
        gtiz_metadata.selectAllFilteredOnly();
      }
    }
  },
  isExternalFilterPresent: () => {
    let present = gtiz_metadata.isExternalFilterPresent();
    return present;
  },
  doesExternalFilterPass: (node) => {
    let filtered = gtiz_metadata.doesExternalFilterPass(node);
    return filtered;
  },
  onCellValueChanged: (event) => {
    let columns = gtiz_metadata.options.columnApi.getColumns();
    // we are removing first column dedicated to checkbox
    columns.shift();
    let tsv = gtiz_metadata.options.api.getDataAsCsv({
      columnKeys: columns,
      suppressQuotes: true,
      columnSeparator: '\t'
    });
    gtiz_metadata.loadMetadata(tsv);
  }
};

/**
 * Backup grid data to be restored after data changes.
 * 
 */
gtiz_metadata.backupGridData = function () {
  if (gtiz_metadata.data_bkp) {
    return;
  }
  let columns = gtiz_metadata.options.columnApi.getColumns();
  gtiz_metadata.data_bkp = gtiz_metadata.options.api.getDataAsCsv({
    columnKeys: columns,
    suppressQuotes: true,
    columnSeparator: '\t'
  });
}

/**
 * Set grid contents from metadata tree informations.
 * 
 */
gtiz_metadata.setGrid = function () {
  let fields = Object.keys(gtiz_tree.tree.metadata_info);
  let meta = gtiz_tree.tree.metadata;
  let columns = [];
  let check = {
    headerClass: 'check-header-cell',
    headerCheckboxSelection: true,
    headerCheckboxSelectionFilteredOnly: true,
    checkboxSelection: true,
    maxWidth: 50,
    filter: false,
    sortable: false,
    resizable: true,
    suppressAutoSize: true,
    lockPosition: true,
    showDisabledCheckboxes: true
  };
  columns.push(check);
  Object.keys(fields).forEach((key, index) => {
    if (fields[key] != 'nothing') {
      let obj = {};
      if (fields[key] == 'ID' || fields[key] == gtiz_file_handler.samples_column) {
        obj = {
          field: fields[key],
          headerName: fields[key]
        }
      } else {
        obj = {
          field: fields[key],
          headerName: fields[key],
          editable: true
        }
      }
      columns.push(obj);
    }
  });
  let contents = [];
  Object.keys(meta).forEach((key) => {
    let control = fields.find(el => el == key);
    // if (!key.includes('_hypo') && key != '') { // exclude _hypo by default
    if (key != '') {
      if (!control) {
        let obj = { ...meta[key] };
        if (obj.__Node) {
          delete obj.__Node;
        }
        contents.push(obj);
      }
    }
  });
  gtiz_metadata.options.api.setColumnDefs(columns);
  gtiz_metadata.options.api.setRowData(contents);
  gtiz_metadata.options.columnApi.autoSizeAllColumns(false);
}

/**
 * Metadata table initialization.
 * 
 */
gtiz_metadata.init = function () {
  gtiz_metadata.initialized = true;
  gtiz_metadata.metadata_container.classList.remove('metadata-not-initialized');
  if (gtiz_metadata.options.api) {
    gtiz_metadata.options.api.destroy();
  }
  new agGrid.Grid(gtiz_metadata.grid_div, gtiz_metadata.options);
  gtiz_metadata.setGrid();
  gtiz_metadata.backupGridData();
  gtiz_metadata.buildUi();
}