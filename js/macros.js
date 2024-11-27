let gtiz_macros = {};

gtiz_macros.css_vars = gtiz_utils.getAllCssVariables();
gtiz_macros.scrolly_options = {
  opacity: 0.8,
  containerColor: gtiz_macros.css_vars['--secondary-light'],
  barColor: gtiz_macros.css_vars['--secondary-dark'],
  radius: 1,
  scaleY : 0.95,
  side : 'left',
  width : 0.3,
  unit : 'rem',
};
gtiz_macros.scrolly = new Scrolly(gtiz_macros.scrolly_options);

gtiz_macros.macros_node = document.querySelector('.macros');
gtiz_macros.trigger = document.querySelector('.tool-macros');
gtiz_macros.macros_close = document.querySelector('.macros-close');
gtiz_macros.contents_node = document.querySelector('.macros-contents');
gtiz_macros.input = document.getElementById('search-macros');

gtiz_macros.lang = gtiz_locales.getActiveLanguageCode();

gtiz_macros.macros = [{
  type : 'macro',
  title : {
    en : 'Log scale at 10',
    it : 'Scala logaritmica a 10'
  },
  actions : [{
    name : 'gtiz_tree.tree.showNodeLabels',
    args : [true]
  }, {
    name : 'gtiz_tree.toggleShowBranchLabels',
    args : ['shown']
  }, {
    name : 'gtiz_tree.setBranchLengthMethod',
    args : ['hide']
  }, {
    name : 'gtiz_tree.setBranchLength',
    args : [10]
  }, {
    name : 'gtiz_tree.tree.setLogLinkScale',
    args : [true]
  }, {
    name : 'gtiz_tree.tree.centerGraph',
    args : []
  }],
  description : {
    en : 'Show node and link labels, set link cut-off to 10 and activate log scale',
    it : 'Mostra le etichette di nodi e collegamenti, imposta un taglio di 10 per i collegamenti ed attiva la scala logaritmica',
  },
  tag : {
    code : 'tree_settings',
    label : {
      en : 'Tree settings',
      it : 'Impostazioni tree'
    }
  },
  version : '1.0.0'
}, {
  type : 'macro',
  title : {
    en : 'Preset space time',
    it : 'Preset spazio tempo'
  },
  actions : [{
    name: 'gtiz_macros.simulateLayoutToggleClick',
    args: [[{
        'view': 'map',
        'selection': true
      }, {
        'view': 'legend',
        'selection': true
      }, {
        'view': 'video',
        'selection': true
      }]]
  }, {
    name: 'gtiz_legend.toggleSelectionMode',
    args: ['visual']
  }, {
    name: 'gtiz_legend.changeCategoryColor',
    args: ['dataprelievo']
  }, {
    name: 'gtiz_legend.quickGradient',
    args: []
  }],
  description : {
    en : 'Open map component, set legend selection to visual mode, change category to \'dataprelievo\' if exists and finally run quick gradient function',
    it : 'Apre il componente mappa, imposta la selezione della legenda in modalità visuale, cambia categoria in \'dataprelievo\' se esiste ed infine lancia la funzione di gradazione rapida',
  },
  tag : {
    code : 'spatio_temporal',
    label : {
      en : 'Spatio-temporal',
      it : 'Spazio-tempo'
    }
  },
  version : '1.0.0'
}];

/**
 * Simulate layout toggle click based on components
 * 
 * @param {*} components 
 */
gtiz_macros.simulateLayoutToggleClick = function(components) {
  let toggles = document.querySelectorAll('.quick-actions .toggle-box');
  components.forEach((component) => {
    let toggle = Array.from(toggles).find((toggle) => {
      return toggle.getAttribute('data-view') === component.view;
    });
    if (toggle) {
      let selection = toggle.getAttribute('data-selection');
      if (selection === 'off' && component.selection) {
        toggle.click();
      }
      if (selection === 'on' && !component.selection) {
        toggle.click();
      }
    }
  });
};

/**
 * Run the list of actions defined in the macro
 * 
 * @param {Object} actions
 */
gtiz_macros.run = function(actions) {
  actions.forEach((action) => {
    try {
      // Construct the function call as a string
      let fnCall = `${action.name}(${action.args.map(arg => JSON.stringify(arg)).join(', ')})`;
      // Use eval to execute the function call
      eval(fnCall);
    } catch (error) {
      console.error('Error executing function:', action.name, error);
    }
  });
};

/**
 * Build the search engine UI
 * 
 * @param {Object} macros 
 * @param {String} keyword search keyword to highlight
 * @param {String} type search type 'all' || 'tag' || 'title' || 'desc'
 */
gtiz_macros.buildUi = function(macros, keyword, type) {
  let container = document.querySelector('.macros-body');
  let results = container.querySelector('.macros-results');
  if (results) {
    results.innerHTML = '';
  } else {
    results = document.createElement('div');
    results.classList.add('macros-results');
    container.append(results);
  }
  if (macros) {
    let header = document.querySelector('.macros-header');
    header.style.display = 'block';
    macros.forEach((item, index) => {
      let result = document.createElement('div');
      result.setAttribute('class', 'macros-result');
      results.append(result);
      if (item.type === 'macro') {
        let tag = document.createElement('div');
        tag.setAttribute('class', 'macros-tag');
        if (item.tag) {
          switch (typeof item.tag.label) {
            case 'string':
              tag.innerHTML = item.tag.label;
              break;
            case 'function':
              tag.innerHTML = item.tag.label();
              break;
            case 'object':
              let lang = gtiz_macros.lang;
              tag.innerHTML = item.tag.label[lang];
              break;
            default:
              tag.innerHTML = 'Unexpected types for tag';
              break;
          }
        } else {
          tag.innerHTML = 'No tag provided';
        }
        if (keyword) {
          if (type === 'tag' || type === 'all' || !type) {
            // Highlight tag
            tag.innerHTML = gtiz_utils.highlightKeyword(tag.innerHTML, keyword);
          }
        }
        tag.addEventListener('click', function(e) {
          // remove all span.highlight-word and span.highlight-keyword form tag.innerHTML
          tag.innerHTML = tag.innerHTML.replace(/<span class="highlight-word">|<\/span>|<span class="highlight-keyword">|<\/span>/g, '');
          gtiz_macros.input.value = 'tag: ' + tag.innerHTML;
          gtiz_macros.search('tag: ' + tag.innerHTML);
        });
        result.append(tag);
        let title = document.createElement('h3');
        title.setAttribute('class', 'macros-result-title');
        if (item.title) {
          switch (typeof item.title) {
            case 'string':
              title.innerHTML = item.title;
              break;
            case 'function':
              title.innerHTML = item.title();
              break;
            case 'object':
              let lang = gtiz_macros.lang;
              title.innerHTML = item.title[lang];
              break;
            default:
              title.innerHTML = 'Unexpected types for title';
              break;
          }
        } else {
          title.innerHTML = 'No title provided';
        }
        if (keyword) {
          if (type === 'title' || type === 'all' || !type) {
            // Highlight title
            title.innerHTML = gtiz_utils.highlightKeyword(title.innerHTML, keyword);
          }
        }
        result.append(title);
        let description = document.createElement('p');
        description.setAttribute('class', 'macros-result-description');
        if (item.description) {
          switch (typeof item.description) {
            case 'string':
              description.innerHTML = item.description;
              break;
            case 'function':
              description.innerHTML = item.description();
              break;
            case 'object':
              let lang = gtiz_macros.lang;
              description.innerHTML = item.description[lang];
              break;
            default:
              description.innerHTML = 'Unexpected types for description';
              break;
          }
        } else {
          description.innerHTML = 'No description provided';
        }
        if (keyword) {
          if (type === 'desc' || type === 'all' || !type) {
            description.innerHTML = gtiz_utils.highlightKeyword(description.innerHTML, keyword);
          }
        }
        result.append(description);
        let form = document.createElement('div');
        form.setAttribute('class', 'macros-result-form');
        result.append(form);
        let button_box = document.createElement('div');
        button_box.setAttribute('class', 'button-box');
        form.append(button_box);
        let button = document.createElement('a');
        button.setAttribute('class', 'button secondary macros-action');
        let icon = item.icon ? item.icon : 'iconic-fast-forward';
        button.innerHTML = '<i class="iconic ' + icon + '"></i> ' + gtiz_locales.current.run;
        button.addEventListener('click', function(e) {
          gtiz_macros.run(item.actions);
          gtiz_macros.closeMacros();
        });
        button_box.append(button);
      }
    });
  } else {
    let header = document.querySelector('.macros-header');
    header.style.display = 'none';
    let result = results.querySelector('.macros-result-message');
    if (!result) {
      result = document.createElement('div');
      result.setAttribute('class', 'macros-result-message');
      results.append(result);
    }
    let message_box = document.createElement('div');
    message_box.setAttribute('class', 'macros-message-box');
    result.append(message_box);
    let message = document.createElement('div');
    message.setAttribute('class', 'macros-message');
    let icon = 'iconic-information';
    message.innerHTML = gtiz_locales.current.missing_tree_alert_macros;
    message_box.append(message);
  }
  container.append(results);
  let scrolly_node = document.querySelector('.macros-form');
  gtiz_search.scrolly.initNode(scrolly_node);
};

/**
 * Toggle search engine
 * 
 */
gtiz_macros.toggleMacros = function() {
  let body = document.querySelector('body');
  body.classList.toggle('show-macros');
  if (body.classList.contains('show-macros')) {
    if (body.classList.contains('tree-not-defined')) {
      gtiz_macros.buildUi();
    } else {
      setTimeout(function() {
        gtiz_macros.input.focus();
      }, 600);
      
      gtiz_macros.buildUi(gtiz_macros.macros);
    }
  } else {
    gtiz_macros.input.value = '';
    let results = document.querySelector('.macros-results');
    let scrolly = document.querySelector('.macros-form.scrolly');
    if (results) {
      results.remove();
    }
    if (scrolly) {
      gtiz_macros.scrolly.destroy(scrolly);
    };
  }
};

/**
 * Show macros
 * 
 */
gtiz_macros.showMacros = function() {
  let body = document.querySelector('body');
  if (body.classList.contains('show-macros')) {
    return;
  }
  if (body.classList.contains('tree-not-defined')) {
    gtiz_macros.buildUi();
  } else {
    gtiz_macros.buildUi(gtiz_macros.macros);
  }
  body.classList.add('show-macros');
};

/**
 * Close macros
 * 
 */
gtiz_macros.closeMacros = function() {
  let body = document.querySelector('body');
  if (body.classList.contains('show-macros')) {
    gtiz_macros.input.value = '';
    let results = document.querySelector('.macros-results');
    if (results) {
      results.remove();
    }
    let scrolly = document.querySelector('.macros-form.scrolly');
    if (scrolly) {
      gtiz_macros.scrolly.destroy(scrolly);
    };
    body.classList.remove('show-macros');
  }
};


gtiz_macros.defineDictionary = function(macros) {
  gtiz_macros.dictionary = macros.map(macro => {
    let title, description, tag;
  
    // Handle title
    switch (typeof macro.title) {
      case 'string':
        title = macro.title;
        break;
      case 'function':
        title = macro.title();
        break;
      case 'object':
        title = macro.title[gtiz_macros.lang];
        break;
      default:
        title = 'Unexpected types for title';
        break;
    }
  
    // Handle description
    switch (typeof macro.description) {
      case 'string':
        description = macro.description;
        break;
      case 'function':
        description = macro.description();
        break;
      case 'object':
        description = macro.description[gtiz_macros.lang];
        break;
      default:
        description = 'Unexpected types for description';
        break;
    }
  
    // Handle tag
    switch (typeof macro.tag.label) {
      case 'string':
        tag = macro.tag.label;
        break;
      case 'function':
        tag = macro.tag.label();
        break;
      case 'object':
        tag = macro.tag.label[gtiz_macros.lang];
        break;
      default:
        tag = 'Unexpected types for tag';
        break;
    }
  
    return {
      title: title,
      description: description,
      tag: tag
    };
  });
};

/**
 * Get matching labels from a provided dictionary
 * 
 * @param {Object} dictionary 
 * @param {String} keyword 
 * @returns 
 */
gtiz_macros.getMatchingLabels = function(dictionary, keyword, type) {
  keyword = keyword.toLowerCase();

  // Define the filter function based on the type
  let filterFunction;
  switch (type) {
    case 'tag':
      filterFunction = macro => macro.tag.toLowerCase().includes(keyword);
      break;
    case 'title':
      filterFunction = macro => macro.title.toLowerCase().includes(keyword);
      break;
    case 'desc':
      filterFunction = macro => macro.description.toLowerCase().includes(keyword);
      break;
    default:
      filterFunction = macro => (
        macro.title.toLowerCase().includes(keyword) ||
        macro.description.toLowerCase().includes(keyword) ||
        macro.tag.toLowerCase().includes(keyword)
      );
      break;
  }

  // Apply the filter function and map to labels
  return dictionary
    .filter(filterFunction)
    .map(macro => macro.title);
};

/**
 * Search for macros
 * 
 * @param {String} keyword 
 */
gtiz_macros.search = function(keyword) {
  if (!gtiz_macros.dictionary) {
    gtiz_macros.defineDictionary(gtiz_macros.macros);
  }

  let type = 'all';

  if (keyword.startsWith('tag:')) {
    type = 'tag';
    keyword = keyword.replace(/^tag:\s*/, '');
  }

  if (keyword.startsWith('title:')) {
    type = 'title';
    keyword = keyword.replace(/^title:\s*/, '');
  }

  if (keyword.startsWith('desc:') || keyword.startsWith('description:')) {
    type = 'desc';
    if (keyword.startsWith('desc:')) {
      keyword = keyword.replace(/^desc:\s*/, '');
    }
    if (keyword.startsWith('description:')) {
      keyword = keyword.replace(/^description:\s*/, '');
    }
  }

  if (keyword.length >= 3) {
    let match = gtiz_macros.getMatchingLabels(gtiz_macros.dictionary, keyword, type);

    let macros = gtiz_macros.macros.filter(item => {
      if (item.title) {
        let value;
        switch (typeof item.title) {
          case 'string':
            value = item.title;
            break;
          case 'function':
            value = item.title();
            break;
          case 'object':
            value = item.title[gtiz_macros.lang];
            break;
          default:
            value = '';
            break;
        }
        return match.includes(value);
      }
    });

    gtiz_macros.buildUi(macros, keyword, type);
    
    let scrolly_node = document.querySelector('.macros-form');
    gtiz_macros.scrolly.updateNode(scrolly_node);
  } else {
    gtiz_macros.buildUi(gtiz_macros.macros);
  }
};

gtiz_macros.input.addEventListener('input', function(e) {
  let keyword = e.target.value.toLowerCase();
  gtiz_macros.search(keyword);
});

gtiz_macros.macros_close.addEventListener('click', function() {
  gtiz_macros.closeMacros();
});

gtiz_macros.trigger.addEventListener('click', function() {
  gtiz_macros.toggleMacros();
});

window.addEventListener("resize", function() {
  setTimeout(() => {
    let node = document.querySelector('.macros-form');
    if (node) {
      gtiz_macros.scrolly.updateNode(node);
    }
  }, 300);
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (gtiz_locales.body.classList.contains('show-macros')) {
      gtiz_macros.closeMacros();
    }
  }
});