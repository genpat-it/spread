let gtiz_context = {};
gtiz_context.cfg = [];
gtiz_context.menus = ['tree', 'zooms', 'legend', 'metadata', 'map'];
gtiz_context.body = document.querySelector('body');
gtiz_context.triggers = document.querySelectorAll('.card-context-menu-trigger');
gtiz_context.graph_div = document.querySelector('#graph-div');
gtiz_context.legend_div = document.querySelector('.card-legend');
gtiz_context.metadata_div = document.querySelector('.card-metadata');
gtiz_context.legend_div = document.querySelector('.card-legend');
gtiz_context.map_div = document.querySelector('.map-container');
gtiz_context.legendToggleSelectionMode = function (value) {
  gtiz_legend.toggleSelectionMode(value);
}

gtiz_context.css_vars = gtiz_utils.getAllCssVariables();
gtiz_context.scrolly_options = {
  position: 'absolute',
  opacity: 0.8,
  containerColor: gtiz_context.css_vars['--secondary-light'],
  barColor: gtiz_context.css_vars['--secondary-dark'],
  radius: 1,
  scaleY : 0.8,
  side : 'left',
  offset : -1.3,
  width : 0.3,
  unit : 'rem',
};
gtiz_context.scrolly = new Scrolly(gtiz_context.scrolly_options);

/**
 * Build the context menu contents based on the user request
 * 
 * @param {String} type 'legend' || 'tree' || 'metadata' based on the available context menus 
 * @returns DOM node containing the UI contents
 */
gtiz_context.getMenu = function(type) {
  let form = document.createElement('div');
  form.setAttribute('class', 'card-form');
  let contents = document.createElement('div');
  contents.setAttribute('class', 'card-form-contents');
  form.append(contents);
  let cfg;
  switch (type) {
    case 'legend':
      cfg = gtiz_legend.context_menu;
      break;
    case 'tree':
      cfg = gtiz_tree.context_menu;
      break;
    case 'zooms':
      cfg = gtiz_zooms.context_menu;
      break;
    case 'metadata':
      cfg = gtiz_metadata.context_menu;
      break;
    case 'map':
      cfg = gtiz_map.context_menu;
      break;
    default:
      console.log(`Sorry, we are out of ${type}.`);
  }
  cfg.forEach(item => {
    if (gtiz_app.cfg.read_only && item.hide_in_read_only) {
      return;
    }
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
      contents.append(container);
    }
    if (item.type == 'abutton') {
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
      contents.append(box);
    }
    if (item.type == 'abutton_optioned') {
      let box = document.createElement('div'); 
      box.setAttribute('class', 'button-box button-box-optioned');
      if (item.id) {
        box.setAttribute('id', item.id);
      }
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
        item.function(e);
      });
      box.append(a);
      
      let select = document.createElement('select');
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
      box.append(select);

      contents.append(box);
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
      contents.append(box);
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
      contents.append(box);
    }
    if (item.type == 'separator') {
      let hr = document.createElement('hr');
      contents.append(hr);
    }
  });

  return form;
}

gtiz_context.closeContextMenu = function(type, card) {
  let gtiz_context_node = document.querySelector('.context-menu');
  if (gtiz_context_node) {
    if (!type) {
      let cls = gtiz_context_node.getAttribute('class');
      gtiz_context.menus.forEach(menu => {
        if (cls.includes(menu)) {
          type = menu;
        }
      });
    }
    gtiz_context_node.remove();
    let specific_cls = 'show-context-menu-' + type;
    gtiz_context.body.classList.remove('show-context-menu');
    gtiz_context.body.classList.remove(specific_cls);
    if (!card) {
      card = document.querySelector('.card-component.card-' + type);
    }
    card.style.removeProperty('transform');
    card.style.removeProperty('z-index');
    let container = card.parentNode;
    if (type == 'tree' || type == 'zooms') {
      container.style.removeProperty('right');
      container.style.removeProperty('z-index');
      container.style.removeProperty('width');
    }
    if (type == 'metadata') {
      container.style.cssText = '';
    }
    if (type == 'map') {
      container.style.removeProperty('right');
      container.style.removeProperty('transform');
      container.style.removeProperty('z-index');
      container.style.removeProperty('width');
    }
  }
}

/**
 * Build the menu UI relative to the type requested by the user
 * 
 * @param {String} type 'legend' || 'tree' || 'metadata' based on the available context menus
 * @param {DOM Node} relation Card related to context menu
 * @returns a DOM Node containing UI elements relative to the type
 */
gtiz_context.buildMenuUi = function(type, relation) {
  let card = document.createElement('div');
  card.setAttribute('class', 'card card-context-menu expanded');
  let tools = document.createElement('div');
  tools.setAttribute('class', 'card-context-tools');
  let close = document.createElement('div');
  close.setAttribute('class', 'card-close-trigger');
  close.innerHTML = '<i class="iconic iconic-close-circle"></i>';
  close.addEventListener('click', (e) => {
    gtiz_context.closeContextMenu(type, relation);
  });
  tools.append(close);
  card.append(tools);
  let title = document.createElement('h3');
  title.setAttribute('class', 'card-title');
  if (type == 'legend') {
    title.innerHTML = gtiz_locales.current.legend_tools;
  }
  if (type == 'metadata') {
    title.innerHTML = gtiz_locales.current.metadata_tools;
  }
  if (type == 'tree') {
    title.innerHTML = gtiz_locales.current.tree_tools;
  }
  if (type == 'zooms') {
    title.innerHTML = gtiz_locales.current.zooms_tools;
  }
  if (type == 'map') {
    title.innerHTML = gtiz_locales.current.map_tools;
    let help = document.createElement('div');
    help.setAttribute('class', 'help-trigger');
    help.innerHTML = '<i class="iconic iconic-help-circle"></i>';
    help.addEventListener('click', (e) => {
      gtiz_help.getHelp(type);
    });
    tools.append(help);
  }
  card.append(title);
  let menu = gtiz_context.getMenu(type);
  card.append(menu);
  
  return card;
}

/**
 * Build and show context menu relative to clicked trigger
 * 
 * @param {String} type 'legend' || 'tree' || 'metadata' ... based on the available context menus
 * @param {String} component 'legend' || 'tree' || 'metadata' ... based on the related component
 * @param {Node} trigger DOM node clicked
 * 
 */
gtiz_context.showMenu = function(type, component, trigger) {
  let card = trigger.closest('.card-component');
  let parent = card.parentNode;
  let parent_cls = parent.getAttribute('class');
  gtiz_context.closeContextMenu(type, card);

  let cls_controller = gtiz_context.body.getAttribute('class');
  let card_style = getComputedStyle(card);
  let margin = parseInt(card_style.marginRight.replace(/\D/g, ""));
  let width = card.offsetWidth;
  let rect = card.getBoundingClientRect();
  let x = rect.left;
  let y = rect.top;
  let left = x;
  let top = y;
  let translate_value = -(width + margin)/10 + 'rem';
  if (type == 'tree' || type == 'zooms') {
    if (!parent_cls.includes('expanded')) {
      if (!cls_controller.includes('-l')) {
        width = 320;
        translate_value = 0;
        if (gtiz_context.body.classList.contains('dashboard-grapetree-m') || gtiz_context.body.classList.contains('dashboard-grapetree-mt') || gtiz_context.body.classList.contains('dashboard-grapetree-m-mt')) {
          left = x + card.offsetWidth + margin;
        } else {
          left = x + card.offsetWidth + margin - width;
        }
      } else {
        let legend_width = document.querySelector('.card-legend').offsetWidth;
        width = legend_width;
        translate_value = 0;
        left = x + card.offsetWidth + margin;
      }
    } else {
      width = 320;
      translate_value = width;
      left = x + card.offsetWidth + margin - width;
    }
  }
  if (type == 'metadata') {
    if (!parent_cls.includes('expanded')) {
      if (!cls_controller.includes('-l')) {
        width = 320;
        translate_value = 0;
        left = x + card.offsetWidth + margin - width;
      } else {
        let legend_width = document.querySelector('.card-legend').offsetWidth;
        width = legend_width;
        translate_value = 0;
        left = x + card.offsetWidth + margin;
      }
    } else {
      width = 320;
      translate_value = width;
      left = x + card.offsetWidth + margin - width;
    }
  }
  if (type == 'map') {
    if (!parent_cls.includes('expanded')) {
      if (!cls_controller.includes('-l')) {
        width = 320;
        translate_value = 0;
        left = x + card.offsetWidth + margin - width;
      } else {
        let legend_width = document.querySelector('.card-legend').offsetWidth;
        width = legend_width;
        translate_value = 0;
        left = x + card.offsetWidth + margin;
      }
    } else {
      width = 320;
      translate_value = width;
      left = x + card.offsetWidth + margin - width;
    }
  }

  let menu_node = document.createElement('div');
  let cls = 'context-menu context-menu-' + type;
  menu_node.setAttribute('class', cls);
  menu_node.setAttribute('data-component', component);
  menu_node.style.position = 'fixed';
  menu_node.style.top = top/10 + 'rem';
  menu_node.style.left = left/10 + 'rem';
  menu_node.style.bottom = 0;
  menu_node.style.zIndex = 9998;
  menu_node.style.width = width/10 + 'rem';
  menu_node.style.opacity = 0;
  menu_node.addEventListener('click', (e) => {
    if (e.target == menu_node) {
      gtiz_context.closeContextMenu(type, card);
    }
  });
  let menu_content = gtiz_context.buildMenuUi(type, card);
  menu_node.append(menu_content);

  // card style
  card.style.transform = `translateX(${translate_value})`;
  if (component == 'legend') {
    card.style.zIndex = 9999;
  }
  if (component == 'tree') {
    let tree_container = document.querySelector('.tree');
    tree_container.style.zIndex = 9999;
    if (parent_cls.includes('expanded')) {
      parent.style.right = (margin/2 + width)/10 + 'rem';
    } else {
      if (!cls_controller.includes('-l') && !gtiz_context.body.classList.contains('dashboard-grapetree-m') && !gtiz_context.body.classList.contains('dashboard-grapetree-mt') && !gtiz_context.body.classList.contains('dashboard-grapetree-m-mt')) {
        tree_container.style.width = 'auto';
        tree_container.style.right = (margin/2 + width)/10 + 'rem';
      }
    }
  }
  if (component == 'metadata') {
    let metadata_container = document.querySelector('.metadata');
    parent.style.zIndex = 9999;
    if (parent_cls.includes('expanded')) {
      parent.style.right = (margin/2 + width)/10 + 'rem';
    } else {
      if (!cls_controller.includes('-l')) {
        metadata_container.style.transform = 'translateX(-' + (width/10) + 'rem)';
      }
    }
  }
  if (component == 'map') {
    let map_container = document.querySelector('.map');
    map_container.style.zIndex = 9999;
    if (parent_cls.includes('expanded')) {
      parent.style.right = (margin/2 + width)/10 + 'rem';
    } else {
      if (!cls_controller.includes('-l')) {
        map_container.style.transform = 'translateX(-' + (width/10) + 'rem)';
      }
    }
  }

  let specific_cls = 'show-context-menu-' + type;
  gtiz_context.body.classList.add('show-context-menu');
  gtiz_context.body.classList.add(specific_cls);
  gtiz_context.body.append(menu_node);

  let menu_form = menu_content.querySelector('.card-form');
  let menu_form_contents = menu_content.querySelector('.card-form-contents');
  let menu_form_top = menu_form.offsetTop;

  if (component == 'legend') {
    let height = menu_node.offsetHeight - parseInt(getComputedStyle(menu_content).paddingTop) -
    parseInt(getComputedStyle(menu_content).paddingBottom);
    menu_content.style.maxHeight = height/10 + 'rem';
    menu_form.style.maxHeight = (height - menu_form_top)/10 + 'rem';
  } else {
    let component_card = document.querySelector('.card-' + component);
    let component_height = component_card.offsetHeight;
    let component_margin_top = parseInt(getComputedStyle(component_card).marginTop.replace(/\D/g, ""));
    let component_margin_bottom = parseInt(getComputedStyle(component_card).marginBottom.replace(/\D/g, ""));
    let component_full_height = component_height + component_margin_top + component_margin_bottom;
    

    let height = component_full_height - 
      parseInt(getComputedStyle(menu_content).paddingTop) -
      parseInt(getComputedStyle(menu_content).paddingBottom);
    menu_content.style.maxHeight = height/10 + 'rem';
    menu_form.style.maxHeight = (height - menu_form_top)/10 + 'rem';
  }

  setTimeout(() => {
    menu_node.style.opacity = 1;
    gtiz_context.scrolly.initNode(menu_form_contents);
  }, 0);
}

/**
 * Update context menu position on window resize event
 * 
 * @param {DOM Node} menu Context menu to update
 * @param {String} type Relative card of context menu
 */
gtiz_context.updateContextPosition = function(menu, type) {
  
  let body_cls = gtiz_context.body.getAttribute('class');
  let component = document.querySelector('.card-' + type);
  let parent = component.parentNode;
  let parent_cls = parent.getAttribute('class');
  let card_context = menu.querySelector('.card-context-menu');
  let card_form = card_context.querySelector('.card-form');
  let card_form_contents = card_context.querySelector('.card-form-contents');
  let card_form_top = card_form.offsetTop;
  let component_style = getComputedStyle(component);
  let menu_w = parseInt(menu.style.width.replace(/\D/g, ""));
  let margin_r = parseInt(component_style.marginRight.replace(/\D/g, ""));
  let width = component.offsetWidth;
  let rect = component.getBoundingClientRect();
  let x = rect.left;
  let y = rect.top;
  let left = x;
  let top = y;

  // update position
  menu.style.left = (left + width + margin_r)/10 + 'rem';
  menu.style.top  = (top)/10 + 'rem';
  if (type == 'legend') {
    let translate = -(width + margin_r)/10 + 'rem';
    component.style.transform = `translateX(${translate})`;
  }
  // update width
  if (!parent_cls.includes('expanded') && body_cls.includes('-l')) {
    let legend = document.querySelector('.legend-container');
    // get legend margin left and right
    let legend_width = legend.offsetWidth;
    menu_w = legend_width;
  }
  menu.style.width = menu_w/10 + 'rem';

  // update height
  if (type == 'legend') {
    let height = menu.offsetHeight - parseInt(getComputedStyle(card_context).paddingTop) - parseInt(getComputedStyle(card_context).paddingBottom);
    card_context.style.maxHeight = height/10 + 'rem';
    card_form.style.maxHeight = (height - card_form_top)/10 + 'rem';
  } else {
    let component_height = component.offsetHeight;
    let component_margin_top = parseInt(getComputedStyle(component).marginTop.replace(/\D/g, ""));
    let component_margin_bottom = parseInt(getComputedStyle(component).marginBottom.replace(/\D/g, ""));
    let component_full_height = component_height + component_margin_top + component_margin_bottom;

    let height = component_full_height - parseInt(getComputedStyle(card_context).paddingTop) - parseInt(getComputedStyle(card_context).paddingBottom);
    card_context.style.maxHeight = height/10 + 'rem';
    card_form.style.maxHeight = (height - card_form_top)/10 + 'rem';
  }

  // update scrolly
  gtiz_context.scrolly.updateNode(card_form_contents);
}

gtiz_context.triggers.forEach(function(trigger) {
  trigger.addEventListener('click', function(e) {
    let type = trigger.getAttribute('data-menu-type');
    let card = trigger.closest('.card-component');
    let component = trigger.getAttribute('data-menu-component');
    let menu = document.querySelector('.context-menu-' + type);
    if (menu) {
      gtiz_context.closeContextMenu(type, card);
    } else {
      gtiz_context.showMenu(type, component, trigger);
    }
  });
});

gtiz_context.graph_div.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  let type = 'tree';
  let component = 'tree';
  let trigger = document.querySelector('.card-tree .card-context-menu-trigger');
  gtiz_context.showMenu(type, component, trigger);
});

gtiz_context.legend_div.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  let type = 'legend';
  let component = 'legend';
  let trigger = gtiz_context.legend_div.querySelector('.card-context-menu-trigger');
  gtiz_context.showMenu(type, component, trigger);
});

gtiz_context.metadata_div.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  let type = 'metadata';
  let component = 'metadata';
  let trigger = gtiz_context.metadata_div.querySelector('.card-context-menu-trigger');
  gtiz_context.showMenu(type, component, trigger);
});

gtiz_context.map_div.addEventListener("contextmenu", (e) => {
  let cls = gtiz_context.map_div.getAttribute('class');
  if (cls.includes('map-initialized')) {
    e.preventDefault();
    let type = 'map';
    let component = 'map';
    let trigger = gtiz_context.map_div.querySelector('.card-context-menu-trigger');
    gtiz_context.showMenu(type, component, trigger);
  }
});

window.addEventListener("resize", function() {
  let menu = document.querySelector('.context-menu');
  if (menu) {
    let component = menu.getAttribute('data-component');
    let type;
    gtiz_context.menus.forEach(menu => {
      if (component.includes(menu)) {
        type = menu;
      }
    });
    if (type) {
      setTimeout(() => {
        gtiz_context.updateContextPosition(menu, type);   
      }, 800);
    }
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    let menu = document.querySelector('.context-menu');
    if (menu) {
      let component = menu.getAttribute('data-component');
      let type;
      gtiz_context.menus.forEach(menu => {
        if (component.includes(menu)) {
          type = menu;
        }
      });
      if (type) {
        gtiz_context.closeContextMenu(type);
      }
    }
  }
});