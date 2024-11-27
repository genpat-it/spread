let gtiz_search = {};

gtiz_search.tree = [...gtiz_tree.context_menu];
gtiz_search.tree.forEach(item => {
  item.hierarchy = 'tree';
  item.category = 'tree';
});
gtiz_search.rendering = gtiz_settings.cfg.find(item => item.card === 'rendering').menu;
gtiz_search.rendering.forEach(item => {
  item.hierarchy = 'settings/rendering';
  item.category = 'rendering';
});
gtiz_search.node_style = gtiz_settings.cfg.find(item => item.card === 'node-style').menu;
gtiz_search.node_style.forEach(item => {
  item.hierarchy = 'settings/node-style';
  item.category = 'node-style';
});
gtiz_search.node_size = gtiz_settings.cfg.find(item => item.card === 'node-size').menu;
gtiz_search.node_size.forEach(item => {
  item.hierarchy = 'settings/node-size';
  item.category = 'node-size';
});
gtiz_search.branch_style = gtiz_settings.cfg.find(item => item.card === 'branch-style').menu;
gtiz_search.branch_style.forEach(item => {
  item.hierarchy = 'settings/branch-style';
  item.category = 'branch-style';
});
gtiz_search.branch_cutoffs = gtiz_settings.cfg.find(item => item.card === 'branch-cutoffs').menu;
gtiz_search.branch_cutoffs.forEach(item => {
  item.hierarchy = 'settings/branch-cutoffs';
  item.category = 'branch-cutoffs';
});
gtiz_search.legend = [...gtiz_legend.context_menu];
gtiz_search.legend.forEach(item => {
  item.hierarchy = 'legend';
  item.category = 'legend';
});
gtiz_search.map = [...gtiz_map.context_menu];
gtiz_search.map.forEach(item => {
  item.hierarchy = 'map';
  item.category = 'map';
});
gtiz_search.metadata = [...gtiz_metadata.context_menu];
gtiz_search.metadata.forEach(item => {
  item.hierarchy = 'metadata';
  item.category = 'metadata';
});

gtiz_search.obj = [...gtiz_search.tree, ...gtiz_search.rendering, ...gtiz_search.node_style, ...gtiz_search.node_size, ...gtiz_search.branch_style, ...gtiz_search.branch_cutoffs, ...gtiz_search.legend, ...gtiz_search.map, ...gtiz_search.metadata];

gtiz_search.css_vars = gtiz_utils.getAllCssVariables();
gtiz_search.scrolly_options = {
  opacity: 0.8,
  containerColor: gtiz_search.css_vars['--secondary-light'],
  barColor: gtiz_search.css_vars['--secondary-dark'],
  radius: 1,
  scaleY : 0.95,
  side : 'left',
  width : 0.3,
  unit : 'rem',
};
gtiz_search.scrolly = new Scrolly(gtiz_search.scrolly_options);

gtiz_search.engine_node = document.querySelector('.search-engine');
gtiz_search.trigger = document.querySelector('.tool-search');
gtiz_search.input = document.getElementById('search-functions');
gtiz_search.engine_close = document.querySelector('.search-engine-close');
gtiz_search.engine_contents_node = document.querySelector('.search-engine-contents');

/**
 * Function node to highlight after search
 * 
 * @param {DOM Node} node 
 */
gtiz_search.highlight = function(node) {
  node.classList.add('search-highlight');
  setTimeout(function() {
    node.classList.remove('search-highlight');
  }, 4000);
};

/**
 * Function to find the node and highlight it
 * 
 * @param {*} item 
 */
gtiz_search.findFunction = function(item) {
  if (item.hierarchy.includes('settings')) {
    gtiz_settings.cfg.forEach(card => {
      if (card.card === item.category) {
        card.expanded = true;
      } else {
        card.expanded = false;
      }
    });
    let toggle = document.querySelector('.toggle-box[data-view="settings"]');
    let cards = document.querySelectorAll('.settings .card-expandable');
    let card = document.querySelector('.card-' + item.category);
    if (toggle) {
      // check if toggle has data-selection attribute set to off
      let selection = toggle.getAttribute('data-selection');
      if (selection === 'off') {
        toggle.click();
      } else {
        cards.forEach(card => {
          if (card.classList.contains('expanded')) {
            let trigger = card.querySelector('.card-expand-trigger');
            trigger.click();
          }
        });
        if (card) {
          let trigger = card.querySelector('.card-expand-trigger');
          trigger.click();
        }
      }
      if (card) {
        let nodes = card.querySelectorAll('*');
        nodes.forEach(node => {
          if ((node.children.length === 0 || node.children[0].nodeName.toLocaleLowerCase() === 'i') && node.innerHTML.includes(item.label)) {
            gtiz_search.highlight(node);
          }
        });
      }
    }
  } else {
    let toggle = document.querySelector('.toggle-box[data-view="' + item.category + '"]');
    let trigger = document.querySelector('[data-menu-type="' + item.category + '"]');
    if (toggle) {
      // check if toggle has data-selection attribute set to off
      let selection = toggle.getAttribute('data-selection');
      if (selection === 'off') {
        toggle.click();
      }
    }
    if (trigger) {
      trigger.click();
      let menu = document.querySelector('.context-menu-' + item.category);
      if (menu) {
        let nodes = menu.querySelectorAll('*');
        nodes.forEach(node => {
          if ((node.children.length === 0 || node.children[0].nodeName.toLocaleLowerCase() === 'i') && node.innerHTML.includes(item.label)) {
            gtiz_search.highlight(node);
          }
        });
      }
    }
  }
};

/**
 * Get menu items from the object
 * 
 * @param {Oject} obj 
 * @returns 
 */
gtiz_search.getMenu = function(obj) {
  let menu = [];
  obj.forEach(item => {
    if (item.type !== 'separator') {
      if (item.type === 'toggle') {
        item.options.forEach(option => {
          if (!option.label) {
            return;
          }
          let obj = {
            hierarchy : item.hierarchy ? item.hierarchy : undefined,
            category : item.category ? item.category : undefined,
            id : item.id ? item.id : undefined,
            label : typeof option.label === 'function' ? option.label() : option.label,
            icon : option.icon ? option.icon : undefined
          };
          if (!menu.some(menuItem => menuItem.label === obj.label)) {
            menu.push(obj);
          }
        });
      } else if (item.type === 'select') {
        if (!item.label) {
          return;
        }
        let obj = {
          hierarchy : item.hierarchy ? item.hierarchy : undefined,
          category : item.category ? item.category : undefined,
          id : item.id ? item.id : undefined,
          label : typeof item.label === 'function' ? item.label() : item.label,
          icon : 'iconic-cursor'
        };
        menu.push(obj);
      } else if (item.type === 'number') {
        if (!item.label) {
          return;
        }
        let obj = {
          hierarchy : item.hierarchy ? item.hierarchy : undefined,
          category : item.category ? item.category : undefined,
          id : item.id ? item.id : undefined,
          label : typeof item.label === 'function' ? item.label() : item.label,
          icon : 'iconic-keyboard'
        };
        menu.push(obj);
      } else if (item.type === 'search') {
        if (!item.label) {
          return;
        }
        let obj = {
          hierarchy : item.hierarchy ? item.hierarchy : undefined,
          category : item.category ? item.category : undefined,
          id : item.id ? item.id : undefined,
          label : typeof item.label === 'function' ? item.label() : item.label,
          icon : 'iconic-search'
        };
        menu.push(obj);
      } else if (item.type === 'radio') {
        item.options.forEach(option => {
          if (!option.label) {
            return;
          }
          let obj = {
            hierarchy : item.hierarchy ? item.hierarchy : undefined,
            category : item.category ? item.category : undefined,
            id : item.id ? item.id : undefined,
            label : typeof option.label === 'function' ? option.label() : option.label,
            icon : 'iconic-check-circle'
          };
          menu.push(obj);
        });
      } else {
        if (!item.label) {
          return;
        }
        let obj = {
          hierarchy : item.hierarchy ? item.hierarchy : 'Other',
          category : item.category ? item.category : 'Other',
          id : item.id ? item.id : undefined,
          label : typeof item.label === 'function' ? item.label() : item.label,
          icon : item.icon ? item.icon : 'iconic-cursor'
        };
        menu.push(obj);
      }
    }
  });
  return menu;
};

/**
 * Build the search engine UI
 * 
 * @param {Object} menu 
 * @param {String} keyword search keyword to highlight
 */
gtiz_search.buildUi = function(menu, keyword) {
  let container = document.querySelector('.search-engine-body');
  let results = container.querySelector('.search-results');
  if (results) {
    results.innerHTML = '';
  } else {
    results = document.createElement('div');
    results.classList.add('search-results');
    container.append(results);
  }
  if (menu) {
    let header = document.querySelector('.search-engine-header');
    header.style.display = 'block';
    menu.forEach((item, index) => {
      let result = results.querySelector('.search-result-' + item.category);
      if (!result) {
        result = document.createElement('div');
        result.setAttribute('class', 'search-result search-result-' + item.category);
        results.append(result);
      }
      let title = results.querySelector('.search-result-title-' + item.category);
      if (!title) {
        title = document.createElement('h3');
        title.setAttribute('class', 'search-result-title search-result-title-' + item.category);
        result.append(title);
        switch (item.category) {
          case 'tree':
            title.innerHTML = gtiz_locales.current.tree_tools;
            break;
          case 'rendering':
              title.innerHTML = gtiz_locales.current.rendering;
              break;
          case 'node-style':
            title.innerHTML = gtiz_locales.current.node_style;
            break;
          case 'node-size':
            title.innerHTML = gtiz_locales.current.node_size;
            break;
          case 'branch-style':
            title.innerHTML = gtiz_locales.current.branch_style;
            break;
          case 'branch-cutoffs':
            title.innerHTML = gtiz_locales.current.branch_cutoffs;
            break;
          case 'legend':
            title.innerHTML = gtiz_locales.current.legend_tools;
            break;
          case 'map':
            title.innerHTML = gtiz_locales.current.map_tools;
            break;
          case 'metadata':
            title.innerHTML = gtiz_locales.current.metadata_tools;
            break;
        }
      }
      let form = results.querySelector('.search-result-form-' + item.category);
      if (!form) {
        form = document.createElement('div');
        form.setAttribute('class', 'search-result-form search-result-form-' + item.category);
        result.append(form);
      }
      let button_box = document.createElement('div');
      button_box.setAttribute('class', 'button-box');
      form.append(button_box);
      let button = document.createElement('a');
      button.setAttribute('class', 'search-action');
      let icon = item.icon ? item.icon : 'iconic-arrow-right';
      if (keyword) {
        button.innerHTML = '<i class="iconic ' + icon + '"></i> ' + gtiz_utils.highlightKeyword(item.label, keyword);
      } else {
        button.innerHTML = '<i class="iconic ' + icon + '"></i> ' + item.label;
      }
      button.addEventListener('click', function(e) {
        gtiz_search.findFunction(item);
        gtiz_search.toggleSearchEngine();
      });
      button_box.append(button);
    });
  } else {
    let header = document.querySelector('.search-engine-header');
    header.style.display = 'none';
    let result = results.querySelector('.search-result-message');
    if (!result) {
      result = document.createElement('div');
      result.setAttribute('class', 'search-result-message');
      results.append(result);
    }
    let message_box = document.createElement('div');
    message_box.setAttribute('class', 'search-message-box');
    result.append(message_box);
    let message = document.createElement('div');
    message.setAttribute('class', 'search-message');
    let icon = 'iconic-information';
    message.innerHTML = gtiz_locales.current.missing_tree_alert_search_engine;
    message_box.append(message);
  }
  container.append(results);
  let scrolly_node = document.querySelector('.search-engine-form');
  gtiz_search.scrolly.initNode(scrolly_node);
};

/**
 * Toggle search engine
 * 
 */
gtiz_search.toggleSearchEngine = function() {
  let body = document.querySelector('body');
  body.classList.toggle('show-search-engine');
  if (body.classList.contains('show-search-engine')) {
    if (body.classList.contains('tree-not-defined')) {
      gtiz_search.buildUi();
    } else {
      setTimeout(function() {
        gtiz_search.input.focus();
      }, 600);
      let menu = gtiz_search.getMenu(gtiz_search.obj);
      gtiz_search.buildUi(menu);
    }
  } else {
    gtiz_search.input.value = '';
    let results = document.querySelector('.search-results');
    let scrolly = document.querySelector('.search-engine-form.scrolly');
    if (results) {
      results.remove();
    }
    if (scrolly) {
      gtiz_search.scrolly.destroy(scrolly);
    };
  }
};

gtiz_search.search = function(keyword) {
  if (keyword.length >= 3) {
    let matching_keys = Object.entries(gtiz_locales.current).filter(function([key, value]) {
      if (typeof value === 'string') {
        let target = value.toLowerCase();
        return target.includes(keyword);
      }
    }).map(([key, value]) => value);

    let is_label_present = gtiz_search.obj.filter(item => {
      if (item.type === 'toggle') {
        if (item.options && item.options.length > 0) {
          let labels = [];
          item.options.forEach(option => {
            if (typeof option.label === 'function') {
              labels.push(option.label());
            } else {
              labels.push(option.label);
            }
          });
          return labels.some(label => matching_keys.includes(label));
        }
      } else if (item.type === 'separator') {
        return false;
      } else {
        if (item.label) {
          if (typeof item.label === 'function') {
            return matching_keys.includes(item.label());
          } else {
            return matching_keys.includes(item.label);
          } 
        }
      }
    });
    let menu = gtiz_search.getMenu(is_label_present);
    gtiz_search.buildUi(menu, keyword);
    let scrolly_node = document.querySelector('.search-engine-form');
    gtiz_search.scrolly.updateNode(scrolly_node);
  } else {
    let menu = gtiz_search.getMenu(gtiz_search.obj);
    gtiz_search.buildUi(menu);
  }
};

gtiz_search.input.addEventListener('input', function(e) {
  let keyword = e.target.value.toLowerCase();
  gtiz_search.search(keyword);
});

gtiz_search.engine_close.addEventListener('click', function() {
  gtiz_search.toggleSearchEngine();
});

gtiz_search.trigger.addEventListener('click', function() {
  gtiz_search.toggleSearchEngine();
});

window.addEventListener("resize", function() {
  setTimeout(() => {
    let node = document.querySelector('.search-engine-form');
    if (node) {
      gtiz_search.scrolly.updateNode(node);
    }
  }, 300);
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (gtiz_locales.body.classList.contains('show-search-engine')) {
      gtiz_search.toggleSearchEngine();
    }
  }
});