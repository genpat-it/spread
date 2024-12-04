let gtiz_settings = {};

gtiz_settings.cfg = [{
  card: 'node-style',
  expanded: true,
  visible: true,
  menu: [{
    type : 'select',
    id : 'tree-metadata-select',
    label : gtiz_locales.current.color_by,
    icon : '',
    options : () => {
      let options = gtiz_tree.getMetadataSelectOptions();
      return options;
    },
    default : undefined,
    get_default : () => {
      let value = gtiz_tree.getMetadataSelectValue();
      return value;
    },
    function : (value) => {
      gtiz_tree.setMetadata(value);
    }
  }, {
    type : 'separator'
  }, {
    type : 'toggle',
    id : 'tree-show-node-labels',
    options : [{
      label : gtiz_locales.current.show_labels,
      value : 'shown',
      icon : 'iconic-eye'
    }, {
        label : gtiz_locales.current.hide_labels,
        value : 'hidden',
        icon : 'iconic-eye-off'
      }],
    selected : () => {
      return  gtiz_tree.show_node_labels;
    },
    function : (value) => {
      gtiz_tree.toggleShowNodeLabels(value);
    }
  }, {
    type : 'select',
    id : 'tree-node-label-text',
    label : gtiz_locales.current.labels,
    icon : '',
    options : () => {
      let options = gtiz_tree.getMetadataSelectOptions();
      return options;
    },
    default : undefined,
    get_default : () => {
      let value = gtiz_tree.getNodeLabelSelectValue();
      return value;
    },
    function : (value) => {
      gtiz_tree.setNodeLabelMetadata(value);
    }
  }, {
    type : 'slider',
    id : 'tree-node-label-font-size-slider',
    label : gtiz_locales.current.font_size,
    related : 'tree-node-label-font-size',
    min : 5,
    max : 55,
    default : undefined,
    get_default : () => {
      return gtiz_tree.node_label_font_size;
    },
    function : (value) => {
      gtiz_tree.setNodeLabelFontSize(value);
    }
  }, {
    type : 'number',
    id : 'tree-node-label-font-size',
    label : null,
    icon : '',
    min : 5,
    max : 55,
    slider : 'tree-node-label-font-size-slider',
    default : undefined,
    get_default : () => {
      return gtiz_tree.node_label_font_size;
    },
    function : (value) => {
      gtiz_tree.setNodeLabelFontSize(value);
    }
  }, {
    type : 'search',
    id : 'tree-highlight-labels',
    label : gtiz_locales.current.highlight_labels,
    icon : '',
    placeholder : gtiz_locales.current.label_to_highlight,
    default : undefined,
    get_default : () => {
      return gtiz_tree.label_to_highlight;
    },
    function : (value) => {
      gtiz_tree.highlightLabels(value);
    }
  }, {
    type : 'separator'
  },{
    type : 'toggle',
    id : 'tree-show-individual-segments',
    options : [{
        label : gtiz_locales.current.individual_segments,
        value : 'shown',
        icon : 'iconic-eye'
    }, {
      label : gtiz_locales.current.individual_segments,
      value : 'hidden',
      icon : 'iconic-eye-off'
    }],
    selected : () => {
      return  gtiz_tree.individual_segments;
    },
    function : (value) => {
      gtiz_tree.toggleIndividualSegments(value);
    }
  }]
}, {
  card : 'node-size',
  expanded : false,
  visible : true,
  menu : [{
    type : 'slider',
    id : 'tree-node-radius-size-slider',
    label : gtiz_locales.current.radius_size,
    related : 'tree-node-radius-size',
    min : 20,
    max : 500,
    default : undefined,
    get_default : () => {
      return gtiz_tree.node_radius_size;
    },
    function : (value) => {
      gtiz_tree.setNodeRadiusSize(value);
    }
  }, {
    type : 'number',
    id : 'tree-node-radius-size',
    label : null,
    icon : '',
    min : 20,
    max : 500,
    slider : 'tree-node-radius-size-slider',
    default : undefined,
    get_default : () => {
      return gtiz_tree.node_radius_size;
    },
    function : (value) => {
      gtiz_tree.setNodeRadiusSize(value);
    }
  }, {
    type : 'slider',
    id : 'tree-node-kurtosis-slider',
    label : gtiz_locales.current.kurtosis,
    related : 'tree-node-kurtosis',
    min : 30,
    max : 150,
    default : undefined,
    get_default : () => {
      return gtiz_tree.node_kurtosis;
    },
    function : (value) => {
      gtiz_tree.setNodeKurtosis(value);
    }
  }, {
    type : 'number',
    id : 'tree-node-kurtosis',
    label : null,
    icon : '',
    min : 30,
    max : 150,
    slider : 'tree-node-kurtosis-slider',
    default : undefined,
    get_default : () => {
      return gtiz_tree.node_kurtosis;
    },
    function : (value) => {
      gtiz_tree.setNodeKurtosis(value);
    }
  },]
}, {
  card : 'branch-style',
  expanded : false,
  visible : true,
  menu : [{
    type : 'toggle',
    id : 'tree-show-branch-labels',
    options : [{
      label : gtiz_locales.current.show_labels,
      value : 'shown',
      icon : 'iconic-eye'
    }, {
      label : gtiz_locales.current.hide_labels,
      value : 'hidden',
      icon : 'iconic-eye-off'
    }],
    selected : () => {
      return  gtiz_tree.show_branch_labels;
    },
    function : (value) => {
      gtiz_tree.toggleShowBranchLabels(value);
    }
  }, {
    type : 'slider',
    id : 'tree-branch-label-font-size-slider',
    label : gtiz_locales.current.font_size,
    related : 'tree-branch-label-font-size',
    min : 5,
    max : 55,
    default : undefined,
    get_default : () => {
      return gtiz_tree.branch_label_font_size;
    },
    function : (value) => {
      gtiz_tree.setBranchLabelFontSize(value);
    }
  }, {
    type : 'number',
    id : 'tree-branch-label-font-size',
    label : null,
    icon : '',
    min : 5,
    max : 55,
    slider : 'tree-branch-label-font-size-slider',
    default : undefined,
    get_default : () => {
      return gtiz_tree.branch_label_font_size;
    },
    function : (value) => {
      gtiz_tree.setBranchLabelFontSize(value);
    }
  }, {
    type : 'separator'
  }, {
    type : 'slider',
    id : 'tree-branch-scaling-slider',
    label : gtiz_locales.current.scaling,
    related : 'tree-branch-scaling',
    min : 5,
    max : 200,
    default : undefined,
    get_default : () => {
      return gtiz_tree.branch_scaling;
    },
    function : (value) => {
      gtiz_tree.setBranchScaling(value);
    }
  }, {
    type : 'number',
    id : 'tree-branch-scaling',
    label : null,
    icon : '',
    min : 5,
    max : 200,
    slider : 'tree-branch-scaling-slider',
    default : undefined,
    get_default : () => {
      return gtiz_tree.branch_scaling;
    },
    function : (value) => {
      gtiz_tree.setBranchScaling(value);
    }
  }, {
    type : 'slider',
    id : 'tree-collapse-branches-slider',
    label : gtiz_locales.current.collapse_branches,
    related : 'tree-collapse-branches',
    min : 0,
    max : undefined,
    get_max : () => {
      return gtiz_tree.tree.max_link_distance;
    },
    step: '1e-6',
    default : undefined,
    get_default : () => {
      return gtiz_tree.tree.node_collapsed_value;
    },
    function : (value) => {
      gtiz_tree.collapseBranches(value);
    }
  }, {
    type : 'number',
    id : 'tree-collapse-branches',
    label : null,
    icon : '',
    min : 0,
    max : undefined,
    get_max : () => {
      return gtiz_tree.tree.max_link_distance;
    },
    step: '1e-6',
    slider : 'tree-collapse-branches-slider',
    default : undefined,
    get_default : () => {
      return gtiz_tree.tree.node_collapsed_value;
    },
    function : (value) => {
      gtiz_tree.collapseBranches(value);
    }
  }, {
    type : 'separator'
  }, {
    type : 'toggle',
    id : 'tree-branch-toggle-log-scale',
    options : [{
      label : gtiz_locales.current.log_scale,
      value : 'active',
      icon : 'iconic-check-circle'
    }, {
      label : gtiz_locales.current.log_scale,
      value : 'not-active',
      icon : 'iconic-ban'
    }],
    selected : () => {
      return  gtiz_tree.branch_log_scale;
    },
    function : (value) => {
      gtiz_tree.toggleBranchLogScale(value);
    }
  }]
}, {
  card: 'branch-cutoffs',
  expanded : false,
  visible : true,
  menu : [{
    type : 'number',
    id : 'tree-branch-length',
    label : gtiz_locales.current.for_branches_longer_than,
    icon : '',
    min : 0,
    max : undefined,
    get_max : () => {
      return gtiz_tree.tree.max_link_distance;
    },
    step: undefined,
    get_step : () => {
      return Math.max(1e-6, (gtiz_tree.tree.max_link_distance/1000.0).toPrecision(1));
    },
    default : undefined,
    get_default : () => {
      return gtiz_tree.tree.node_collapsed_value;
    },
    function : (value) => {
      gtiz_tree.setBranchLength(value);
    }
  }, {
    type : 'radio',
    id : 'tree-branch-length-method',
    options : [{
      label : gtiz_locales.current.display,
      value : 'display'
    }, {
      label : gtiz_locales.current.hide,
      value : 'hide'
    }, {
      label : gtiz_locales.current.shorten,
      value : 'cap'
    }],
    selected : () => {
       return gtiz_tree.branch_cutoffs_method; 
    },
    function : (value) => {
      gtiz_tree.setBranchLengthMethod(value);
    }
  }]
}, {
  card: 'rendering',
  expanded: false,
  visible: true,
  menu: [{
    type : 'toggle',
    id : 'tree-rendering-toggle',
    options : [{
        label : gtiz_locales.current.static,
        value : 'static',
        icon : 'iconic-code'
      }, {
        label : gtiz_locales.current.dynamic,
        value : 'dynamic',
        icon : 'iconic-video'
    }],
    selected : () => {
      return  gtiz_tree.rendering_mode;
    },
    function : (value) => {
      gtiz_tree.toggleRenderingMode(value);
    }
  }, {
    type : 'separator'
  }, {
    type : 'radio',
    id : 'tree-rendering-dynamic-selected-only',
    hidden : true,
    options : [{
      label : gtiz_locales.current.selected_only,
      value : 'selected_only'
    }, {
      label : gtiz_locales.current.all,
      value : 'all'
    }],
    selected : () => {
       return gtiz_tree.rendering_dynamic_selected_only; 
    },
    function : (value) => {
      gtiz_tree.setRenderingDynamicSelecion(value);
    }
  }, {
    type : 'radio',
    id : 'tree-rendering-static-real-branch-length',
    options : [{
      label : gtiz_locales.current.unreal_branch_length,
      value : 'unreal'
    }, {
      label : gtiz_locales.current.real_branch_length,
      value : 'real'
    }],
    selected : () => {
       return gtiz_tree.rendering_static_real_branch_length; 
    },
    function : (value) => {
      gtiz_tree.setRenderingStaticSelecion(value);
    }
  }]
}];

gtiz_settings.body = document.querySelector('body');
gtiz_settings.container = document.querySelector('.settings');
gtiz_settings.cards = document.querySelectorAll('.settings .card');
gtiz_settings.exp_triggers = document.querySelectorAll('.card-expandable .card-expand-trigger');
gtiz_settings.card_titles = document.querySelectorAll('.card-expandable .card-title');
gtiz_settings.load_grapetree_btns = document.querySelectorAll('.load-grapetree');

gtiz_settings.expandCard = function(e) {
  let trigger;
  let target = e.target;
  if(e.target !== e.currentTarget) {
    trigger = target.parentNode;
  } else {
    trigger = target;
  }
  let trigger_parent = trigger.closest(".card");
  let card_classes = trigger_parent.getAttribute('class');

  if (trigger_parent.classList.contains('dragged')) {
    trigger_parent.classList.toggle('expanded');
    let cfg = gtiz_settings.cfg.find(setting => card_classes.includes(setting.card));
    if (cfg.expanded) {
      cfg.expanded = false;
    } else {
      cfg.expanded = true;
    }
  } else {
    if (trigger_parent.classList.contains("expanded")) {
      trigger_parent.classList.remove("expanded");
      let cfg = gtiz_settings.cfg.find(setting => card_classes.includes(setting.card));
      cfg.expanded = false;
    } else {
      let cards = gtiz_settings.container.querySelectorAll('.expanded');
      cards.forEach(card => {
        if (!card.classList.contains('dragged')) {
          card.classList.remove('expanded');
          let cfg = gtiz_settings.cfg.find(setting => card.getAttribute('class').includes(setting.card));
          cfg.expanded = false;
        }
      });
      trigger_parent.classList.add("expanded");
      let cfg = gtiz_settings.cfg.find(setting => card_classes.includes(setting.card));
      cfg.expanded = true;
    }
  }
  let styles = window.getComputedStyle(trigger_parent);
  let duration = styles.getPropertyValue("transition-duration");
  let delay = styles.getPropertyValue("transition-delay");
  duration = parseFloat(duration);
  delay = parseFloat(delay);
  let time = (duration + delay) * 1000;
  gtiz_layout.setViewHeight(time);
}

/**
 * 
 * Colse modal and clean contents
 * 
 */
gtiz_settings.closeModal = function () {
  gtiz_settings.body.classList.toggle("show-modal");
  let m_header = document.querySelector('.modal-header');
  let m_body = document.querySelector('.modal-body');
  let m_feedback = document.querySelector('.modal-feedback');
  m_header.innerHTML = "";
  m_body.innerHTML = "";
  m_feedback.innerHTML = "";
}

gtiz_settings.load_grapetree_btns.forEach(btn => {
  btn.addEventListener('click', function(e) {
    let mode = 'load';
    gtiz_tree.openFileHandlerModal(mode);
  });
});

gtiz_settings.exp_triggers.forEach(function (item) {
  item.addEventListener('click', gtiz_settings.expandCard, false);
});

gtiz_settings.buildForm = function(form, menu) {
  if (form && menu) {
    form.innerHTML = '';
    menu.forEach(item => {
      if (item.type == 'toggle') {
        let container = document.createElement('div');
        container.setAttribute('class', 'tools');
        let box = document.createElement('div'); 
        box.setAttribute('class', 'toggle-box not-draggable');
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
            label.innerHTML = ' ' + option.label;
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
            label.innerHTML = ' ' + item.options[1].label;
            item.function(item.options[1].value);
          } else {
            box.setAttribute('data-selection', item.options[0].value);
            label.innerHTML = ' ' + item.options[0].label;
            item.function(item.options[0].value);
          }
        });
        container.append(box);
        form.append(container);
      }
      if (item.type == 'select') {
        let box = document.createElement('div'); 
        box.setAttribute('class', 'select-box not-draggable');
        if (item.label) {
          let label = document.createElement('div');
          label.setAttribute('class', 'form-label');
          let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
          label.innerHTML = icon + item.label;
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
            option.innerHTML = el.label;
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
      if (item.type == 'abutton') {
        let box = document.createElement('div'); 
        box.setAttribute('class', 'button-box not-draggable');
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
      if (item.type == 'slider') {
        let box = document.createElement('div');
        box.setAttribute('class', 'slider-box not-draggable');
        if (item.label) {
          let label = document.createElement('div');
          label.setAttribute('class', 'form-label');
          label.innerHTML = item.label;
          box.append(label);
        }
        // let slider = document.createElement('div');
        // <input type="range" min="1" max="100" value="50" class="slider" id="myRange">
        let slider = document.createElement('input');
        slider.setAttribute('type', 'range');
        if (item.min) {
          slider.setAttribute('min', item.min);
        } else {
          if (typeof item.get_min === 'function') {
            let value = item.get_min();
            slider.setAttribute('min', value);
          } else {
            slider.setAttribute('min', '0');
          }
        }
        if (item.max) {
          slider.setAttribute('max', item.max);
        } else {
          if (typeof item.get_max === 'function') {
            let value = item.get_max();
            slider.setAttribute('max', value);
          } else {
            slider.setAttribute('max', '100');
          }
        }
        if (item.step) {
          slider.setAttribute('step', item.step);
        } else {
          if (typeof item.get_step === 'function') {
            let value = item.get_step();
            slider.setAttribute('step', value);
          } else {
            slider.setAttribute('step', '1');
          }
        }
        if (item.default) {
          slider.setAttribute('value', item.default);
        } else {
          if (typeof item.get_default === 'function') {
            let value = item.get_default();
            slider.setAttribute('value', value);
          }
        }
        slider.setAttribute('class', 'slider');
        if (item.id) {
          slider.setAttribute('id', item.id);
        }
        slider.addEventListener('input', (e) => {
          let value = slider.value;
          item.function(value);
          if (item.related) {
            let related = document.querySelector('#' + item.related);
            related.value = value;
          }
        });
        box.append(slider);
        box.append(slider);
        form.append(box);
      }
      if (item.type == 'number') {
        let box = document.createElement('div');
        box.setAttribute('class', 'input-box input-box-number not-draggable');
        if (item.label) {
          let label = document.createElement('div');
          label.setAttribute('class', 'form-label');
          let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
          label.innerHTML = icon + item.label;
          box.append(label);
        }
        let input = document.createElement('input');
        input.setAttribute('type', 'number');
        if (item.id) {
          input.setAttribute('id', item.id);
        }
        if (item.min || item.min === 0) {
          input.setAttribute('min', item.min);
        } else {
          if (typeof item.get_min === 'function') {
            let value = item.get_min();
            input.setAttribute('min', value);
          }
        }
        if (item.max) {
          input.setAttribute('max', item.max);
        } else {
          if (typeof item.get_max === 'function') {
            let value = item.get_max();
            input.setAttribute('max', value);
          }
        }
        if (item.step) {
          input.setAttribute('step', item.step);
        } else {
          if (typeof item.get_step === 'function') {
            let value = item.get_step();
            input.setAttribute('step', value);
          } else {
            input.setAttribute('step', '1');
          }
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
            if (item.slider) {
              let slider = document.querySelector('#' + item.slider);
              slider.value = value;
            }
          });
        });
        box.append(input);
        form.append(box);
      }
      if (item.type == 'search') {
        let box = document.createElement('div');
        box.setAttribute('class', 'search-box not-draggable');
        if (item.label) {
          let label = document.createElement('div');
          label.setAttribute('class', 'form-label');
          let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
          label.innerHTML = icon + item.label;
          box.append(label);
        }
        let input = document.createElement('input');
        input.setAttribute('type', 'search');
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
      if (item.type == 'radio') {
        let box = document.createElement('div');
        box.setAttribute('class', 'list-box not-draggable');
        if (item.hidden) {
          box.setAttribute('style', 'display: none;');
        }
        if (item.id) {
          box.setAttribute('id', item.id);
        }
        if (item.label) {
          let label = document.createElement('div');
          label.setAttribute('class', 'form-label');
          let icon = item.icon != '' ? '<i class="iconic ' + item.icon + '"></i> ' : '';
          label.innerHTML = icon + item.label;
          box.append(label);
        }
        let options;
        if (Array.isArray(item.options)) {
          options = item.options;
        } else {
          if (typeof item.options === 'function') {
            options = item.options();
          }
        }
        let selected;
        if (typeof item.selected === 'string') {
          selected = item.selected;
        } else {
          if (typeof item.selected === 'function') {
            selected = item.selected();
          }
        }
        if (options) {
          options.forEach(option => {
            let row = document.createElement('div');
            row.setAttribute('class', 'list-row');
            row.setAttribute('data-value', option.value);
            let icon = document.createElement('div');
            icon.setAttribute('class', 'list-check');
            icon.innerHTML = '<i class="iconic iconic-check-circle-empty"></i>';
            row.append(icon);
            let label = document.createElement('div');
            label.setAttribute('class', 'list-value');
            label.innerHTML = option.label;
            row.append(label);
            if (option.value == selected) {
              row.classList.add('selected');
              icon.innerHTML = '<i class="iconic iconic-check-circle"></i>';
            }
            row.addEventListener('click', (e) => {
              let rows = box.querySelectorAll('.list-row');
              rows.forEach(el => {
                el.classList.remove('selected');
                let check = el.querySelector('.list-check');
                check.innerHTML = '<i class="iconic iconic-check-circle-empty"></i>';
              });
              let value = row.getAttribute('data-value');
              row.classList.add('selected');
              icon.innerHTML = '<i class="iconic iconic-check-circle"></i>';
              item.function(value);
            });
            box.append(row);
          });
        }
        form.append(box);
      }
      if (item.type == 'separator') {
        let hr = document.createElement('hr');
        form.append(hr);
      }
    });
  }
}

gtiz_settings.buildCard = function(card, cfg) {
  if (card && cfg) {
    let expanded = cfg.expanded;
    let visible = cfg.visible;
    let message = cfg.message;
    if (expanded) {
      card.classList.add('expanded');
    } else {
      card.classList.remove('expanded');
    }
    if (!visible) {
      card.classList.add('hidden');
    } else {
      card.classList.remove('hidden');
    }
    if (message) {
      card.classList.add('message');
      let message_node = card.querySelector('.card-message');
      message_node.innerHTML = cfg.message_contents;
    } else {
      card.classList.remove('message');
      let message_node = card.querySelector('.card-message');
      message_node.innerHTML = '';
    }
    let form = card.querySelector('.card-form');
    let menu = cfg.menu ? cfg.menu : undefined;
    gtiz_settings.buildForm(form, menu);
  }
  
};

/**
 * Set the view based on the configuration object.
 * 
 * @param {Array} obj Settings configuration object
 */
gtiz_settings.setView = function(obj) {
  let cards = [...gtiz_settings.cards];
  cards.forEach(card => {
    let cls = card.getAttribute('class');
    let cfg_opt = obj.find(element => cls.includes(element.card));
    gtiz_settings.buildCard(card, cfg_opt);
  });
};

gtiz_settings.setMapCard = function() {
  let geoJSON = gtiz_map.geojson;
  if (geoJSON) {
    let map_settings = gtiz_settings.cfg.find(cfg => cfg.card === 'map');
    map_settings.expanded = true;
    map_settings.visible = true;
    map_settings.message = false;
  } else if ('geo' in gtiz_file_handler.params) {
    let map_settings = gtiz_settings.cfg.find(cfg => cfg.card === 'map');
    map_settings.expanded = true;
    map_settings.visible = true;
    map_settings.message = false;
  } else {
    let map_settings = gtiz_settings.cfg.find(cfg => cfg.card === 'map');
    map_settings.expanded = false;
    map_settings.visible = false;
    map_settings.message = true;
    let message_node = document.querySelector('.card-map .card-message');
    message_node.innerHTML = gtiz_locales.current.no_geo_info_message;
  }
}

gtiz_settings.init = function() {
  gtiz_settings.setView(gtiz_settings.cfg);
};