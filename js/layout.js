let gtiz_layout = {};

gtiz_layout.settings = 'off';
gtiz_layout.map = 'off';
gtiz_layout.legend = 'off';
gtiz_layout.metadata = 'off';
gtiz_layout.video = 'on';
gtiz_layout.fullscreen = 'off';

gtiz_layout.cfg = [{
  type: 'settings',
  visible: false,
  cls : '',
  cls_suffix: '-s',
  position: 'left',
  options : [{
      label : gtiz_locales.current.settings,
      value : 'on',
      icon : 'tabler-settings'
    }, {
      label : gtiz_locales.current.settings,
      value : 'off',
      icon : 'tabler-ban'
  }],
  selected : () => {
    return  gtiz_layout.settings;
  },
  function : (type, value) => {
    gtiz_layout.toggleView(type, value);
  }
}, {
  type: 'map',
  visible: false,
  cls : '',
  cls_suffix: '-m',
  position: 'left',
  options : [{
      label : gtiz_locales.current.map,
      value : 'on',
      icon : 'tabler-map-pin'
    }, {
      label : gtiz_locales.current.map,
      value : 'off',
      icon : 'tabler-ban'
  }],
  selected : () => {
    return  gtiz_layout.map;
  },
  function : (type, value) => {
    gtiz_layout.toggleView(type, value);
  }
}, {
  type: 'metadata',
  visible: false,
  cls : '',
  cls_suffix: '-mt',
  position: 'left',
  options : [{
      label : gtiz_locales.current.metadata,
      value : 'on',
      icon : 'tabler-layout-rows'
    }, {
      label : gtiz_locales.current.metadata,
      value : 'off',
      icon : 'tabler-ban'
  }],
  selected : () => {
    return  gtiz_layout.metadata;
  },
  function : (type, value) => {
    gtiz_layout.toggleView(type, value);
  }
}, {
  // on the right, where its column opens; `legend-mode` tells the css whether the
  // column also holds the legend card or only the assistant one
  type: 'legend',
  visible: false,
  cls : 'legend-mode',
  cls_suffix: '-l',
  position: 'right',
  options : [{
      label : gtiz_locales.current.legend,
      value : 'on',
      icon : 'tabler-color-swatch'
    }, {
      label : gtiz_locales.current.legend,
      value : 'off',
      icon : 'tabler-ban'
  }],
  selected : () => {
    return  gtiz_layout.legend;
  },
  function : (type, value) => {
    gtiz_layout.toggleView(type, value);
  }
}];

/*
*
* The video player is part of the legend card (it walks through the legend
* values): it is shown from the legend menu, not from these toggles. The full
* screen is a tool of the header toolbar.
*
*/

gtiz_layout.body = document.querySelector('body');
gtiz_layout.main_node = document.querySelector('main');
gtiz_layout.quick_actions_node = gtiz_layout.main_node.querySelector('.quick-actions');
gtiz_layout.main_section = document.querySelector('.main');
gtiz_layout.settings_node = document.querySelector('.settings');
gtiz_layout.tree_node = document.querySelector('.tree');
gtiz_layout.map_node = document.querySelector('.map');
gtiz_layout.legend_node = document.querySelector('.legend');
gtiz_layout.view_triggers = document.querySelectorAll('[data-view-trigger]');
gtiz_layout.fullscreen_trigger = document.querySelector('.tool-fullscreen');
gtiz_layout.expand_triggers = document.querySelectorAll('.card-context-expand-trigger');

gtiz_layout.css_vars = gtiz_utils.getAllCssVariables();
gtiz_layout.scrolly_options = {
  position: 'absolute',
  opacity: 0.8,
  containerColor: 'var(--secondary-light)',
  barColor: 'var(--secondary-dark)',
  radius: 1,
  scaleY : 0.9,
  side : 'right',
  offset : -1.3,
  width : 0.3,
  unit : 'rem',
  // new Scrolly: content measured with scrollHeight, bar draggable
  contentHeightMode : 'scroll',
  draggable : true,
};
gtiz_layout.scrolly = new Scrolly(gtiz_layout.scrolly_options);

gtiz_layout.getStyleTime = function(node) {
  let styles = window.getComputedStyle(node);
  let duration = styles.getPropertyValue("transition-duration");
  let delay = styles.getPropertyValue("transition-delay");
  duration = parseFloat(duration);
  delay = parseFloat(delay);
  let time = (duration + delay) * 1000;
  return time;
}

/**
 * Expand component view.
 * 
 * @param {String} component data-component attribute value, it identifies the component to expand 
 * @param {Node} trigger DOM node clicked
 */
gtiz_layout.expandComponent = function(component, trigger) {
  let card = trigger.closest('.card-component');
  let node = document.querySelector('.' + component);
  let cls = component + '-expanded';

  let gtiz_context_node = document.querySelector('.context-menu');
	if (gtiz_context_node) {
		gtiz_context.closeContextMenu(component, card);
	}

  node.classList.toggle(cls);
  
  if (node.classList.contains(cls)) {
    trigger.innerHTML = '<i class="tabler tabler-minimize"></i>';
  } else {
    trigger.innerHTML = '<i class="tabler tabler-maximize"></i>';
  }

  // the map keeps the view of the user, the size observer resizes it
  if (component == 'map') {
    if (gtiz_map.initialized) {
      gtiz_layout.resizeMap();
    }
  }
  if (component == 'tree') {
    gtiz_layout.resizeTree();
  }

}

/**
 * Manage loading Ui for tree component
 * 
 * @param {Array} component ['tree', 'map', 'legend', 'meetadata'] 
 * @param {String} action 'add' || 'remove'
 * 
 */
gtiz_layout.uiLoadingManager = function(components, action) {
  if (components) {
    components.forEach(component => {
      let selector = '.' + component + '-container';
      let node = document.querySelector(selector);
      let cls = component + '-loading';

      if (component == 'tree') {
        let body = document.querySelector('body');
		    body.classList.remove('tree-not-defined');
      }

      if (action == 'add') {
        node.classList.add(cls);
        gtiz_loader.addLoader(node);
      } else {
        node.classList.remove(cls);
        gtiz_loader.removeLoader(node);
      }
    });
  }
}

/**
 * Fit the scrollbar of the legend list to the space of the legend card.
 *
 * The height of the card comes from css (flex column with the video player, see
 * `.legend` in dashboard.css): here only the custom scrollbar of the list is
 * created, updated or removed. Called when the legend is rebuilt, when the
 * assistant card leaves or joins the column, and by the size observer when the
 * legend column, the legend card or the assistant card changes size.
 *
 * @returns {undefined}
 */
gtiz_layout.setLegendHeight = function() {
  let legend_card = document.querySelector('.card-legend');
  let legend_list = legend_card ? legend_card.querySelector('.card-form .list-box') : null;
  // a hidden legend (toggle off) has no size: it is measured when shown (setView)
  if (!legend_list || legend_card.offsetHeight === 0) {
    return;
  }
  // updateNode measures the list without its max height, so it also removes the scrollbar when it fits
  gtiz_layout.scrolly.updateNode(legend_list);
  gtiz_layout.fitLegendScrollbar(legend_list);
}

/**
 * Fit the legend scrollbar to the rows that scroll.
 *
 * "Others" is sticky at the bottom of the list (see dashboard.css): it is part of
 * the scrolled box but never moves. Scrolly sizes the track on the whole box and
 * the bar on the whole content, "Others" included: here the track goes from the
 * first row to the top of "Others", shrunk by the scaleY of the instance like the
 * other scrollbars, and the bar measures only the rows that scroll. The bar position and the drag keep working, they use the size of
 * the track and the scroll range of the list, which do not change.
 *
 * @param {Node} legend_list `.list-box` of the legend card
 * @returns {undefined}
 */
gtiz_layout.fitLegendScrollbar = function(legend_list) {
  let container = legend_list.parentElement.querySelector(':scope > .scrolly-container');
  // no scrollbar: the list fits the card
  if (!container) {
    return;
  }
  let bar = container.querySelector('.scrolly-bar');
  let others = legend_list.querySelector('.list-row[data-real-group-izsam="Others"]');
  let others_height = others ? others.offsetHeight : 0;
  let padding_top = parseFloat(window.getComputedStyle(legend_list).paddingTop) || 0;
  let rows_height = legend_list.clientHeight - others_height;
  let content_height = legend_list.scrollHeight - others_height;
  if (rows_height <= 0 || content_height <= 0) {
    return;
  }
  // track on the visible rows, from the first one to the line of "Others", scaled around their center
  let track_height = rows_height - padding_top;
  container.style.top = (legend_list.offsetTop + padding_top) + 'px';
  container.style.height = track_height + 'px';
  container.style.transform = 'scaleY(' + gtiz_layout.scrolly_options.scaleY + ')';
  // bar as long as the share of the rows in view
  if (bar) {
    bar.style.height = Math.round(track_height * rows_height / content_height) + 'px';
  }
  // place the bar again on the new track
  legend_list.dispatchEvent(new Event('scroll'));
}

/**
 * Set view height after layout changes in order to allow map and tree boxes to fit the entire page.
 * 
 * @param {Number} time Time definition for setTimeout based on css transition deleay and duration
 */
gtiz_layout.setViewHeight = function(time) {
  let delay = time ? time : 0;
  setTimeout(() => {
    let viewport_h = window.innerHeight;
    let settings_h = gtiz_layout.settings_node.offsetHeight;
    let offset = gtiz_layout.main_section.offsetTop;
    let control = viewport_h - offset;
    if (settings_h > control) {
      gtiz_layout.main_section.style.height = settings_h + 'px';
    } else {
      gtiz_layout.main_section.setAttribute('style', '');
    }
  }, delay);
}

/**
 * Resize the map after layout changes, keeping the view of the user: the map is
 * fitted to its points only when they are loaded or the map is opened (gtiz_map.init).
 *
 * @param {Number} time Time definition for setTimeout based on css transition deleay and duration
 */
gtiz_layout.resizeMap = function (time) {
  let delay = time ? time : 0;
  setTimeout(() => {
    if (gtiz_map.initialized) {
      map.invalidateSize();
      /**
       * Set min zoom to avoid empty space around world edges
       *
       */
      let width = gtiz_map.map_container.clientWidth;
      let height = gtiz_map.map_container.clientHeight;
      let min_zoom = Math.ceil(Math.log2(Math.max(width, height) / 256));
      map.setMinZoom(min_zoom);
    }
  }, delay);
}

/**
 * Resize the tree after layout changes, and center it while the user has not
 * zoomed or panned it (see `user_moved` in base_tree.js).
 *
 * @param {Number} time Time definition for setTimeout based on css transition deleay and duration
 */
gtiz_layout.resizeTree = function (time) {
  let delay = time ? time : 0;
  setTimeout(() => {
    if (gtiz_tree.tree) {
      gtiz_tree.tree.resize();
      if (!gtiz_tree.tree.user_moved) {
        gtiz_tree.tree.centerGraph();
      }
    }
    let graph_div = document.querySelector('#graph-div');
    if (!graph_div.classList.contains('show')) {
      graph_div.classList.add('show');
    }
  }, delay);
}

/*
*
* Size observer: tree, map and legend are resized when their container really
* changes size, whatever the cause (window, panels, settings, full screen, end of a
* loading, font size), instead of guessing the time of css transitions. The
* changes of one frame are applied together in the next one.
*
*/
gtiz_layout.resize_targets = new Set();
gtiz_layout.resize_frame = null;

/**
 * Apply the size changes collected by the size observer
 *
 * @returns {undefined}
 */
gtiz_layout.applySizeChanges = function() {
  gtiz_layout.resize_frame = null;
  let targets = [...gtiz_layout.resize_targets];
  gtiz_layout.resize_targets.clear();
  targets.forEach(target => {
    // hidden components (display none, loading) have no size: they are resized when shown
    if (target.offsetWidth === 0 || target.offsetHeight === 0) {
      return;
    }
    // the assistant card under the legend gives or takes its space (collapsed,
    // opened, docked): the list of the legend is measured again at each frame
    if (target === gtiz_layout.legend_node || target.classList.contains('card-legend') || target.classList.contains('card-assistant')) {
      gtiz_layout.setLegendHeight();
    } else if (target.id === 'graph-div') {
      gtiz_layout.resizeTree();
    } else if (target.classList.contains('map-container')) {
      gtiz_layout.resizeMap();
    }
  });
}

gtiz_layout.size_observer = new ResizeObserver(entries => {
  entries.forEach(entry => gtiz_layout.resize_targets.add(entry.target));
  if (!gtiz_layout.resize_frame) {
    gtiz_layout.resize_frame = requestAnimationFrame(gtiz_layout.applySizeChanges);
  }
});

/**
 * Start observing the size of tree, map and legend containers
 *
 * @returns {undefined}
 */
gtiz_layout.observeSizes = function() {
  // the legend column follows the page, the legend card its contents (e.g. the end of a loading);
  // map.js is loaded later, so its container is taken from the page
  let nodes = [
    gtiz_layout.legend_node,
    document.querySelector('.card-legend'),
    document.getElementById('graph-div'),
    document.querySelector('.map-container')
  ];
  nodes.forEach(node => {
    if (node) {
      gtiz_layout.size_observer.observe(node);
    }
  });
}

/**
 * Set the view based on the configuration object.
 *
 * @param {Array} obj Layout configuration object
 * @param {String} changed Component just switched on or off (e.g. `map`), undefined when the whole layout is set
 */
gtiz_layout.setView = function(obj, changed) {
  // the macros and notes panels open stay open when the layout is set again,
  // e.g. by a macro that opens the map or by the undo of a run
  let open_panels = ['show-macros', 'show-notes'].filter(cls => gtiz_layout.body.classList.contains(cls));
  if (gtiz_layout.body.classList.contains('show-notifier')) {
    gtiz_layout.body.setAttribute('class', 'show-notifier dashboard dashboard-grapetree');
  } else if (gtiz_layout.body.classList.contains('show-modal')) {
    gtiz_layout.body.setAttribute('class', 'show-modal dashboard dashboard-grapetree');
  } else if (gtiz_layout.body.classList.contains('show-search-engine')) {
    gtiz_layout.body.setAttribute('class', 'show-search-engine dashboard dashboard-grapetree');
  } else {
    gtiz_layout.body.setAttribute('class', 'dashboard dashboard-grapetree');
  }
  open_panels.forEach(cls => gtiz_layout.body.classList.add(cls));
  if (!gtiz_tree.tree) {
    gtiz_layout.body.classList.add('tree-not-defined');
  }
  let trigger_nodes = gtiz_layout.quick_actions_node.querySelectorAll('[data-view]');
  let triggers = [...trigger_nodes];
  let cls = 'dashboard-grapetree';
  let additional_cls = [];
  triggers.forEach(trigger => {
    let view = trigger.getAttribute('data-view');
    let selection = trigger.getAttribute('data-selection');
    if (selection == 'on') {
      let obj = gtiz_layout.cfg.find(element => element.type == view);
      if (obj.cls_suffix && obj.cls_suffix != '') {
        cls += obj.cls_suffix;
      }
      if (obj.cls && obj.cls != '') {
        additional_cls.push(obj.cls);
      }
    }
  });
  // the video player has no toggle here: its state comes from the legend menu
  if (gtiz_layout.video == 'on') {
    additional_cls.push('video-mode');
  }
  // a card detached from its column (gtiz_drag.makeDetachable) floats over the
  // main area: the assistant and legend ones tell the css that their column may close
  if (document.querySelector('.main > .card-assistant')) {
    additional_cls.push('assistant-floating');
  }
  if (document.querySelector('.main > .card-legend')) {
    additional_cls.push('legend-floating');
  }
  gtiz_layout.body.classList.add(cls);
  if (additional_cls.length > 0) {
    additional_cls.forEach(element => {
      gtiz_layout.body.classList.add(element);
    });
  }
  gtiz_layout.setViewHeight();
  if (gtiz_layout.legend == 'on') {
    gtiz_layout.setLegendHeight();
  }
  if (gtiz_layout.settings == 'on') {
    gtiz_layout.settings_node.classList.add('settings-on');
    gtiz_settings.init();
  }
  if (gtiz_layout.settings == 'off') {
    gtiz_layout.settings_node.classList.remove('settings-on');
  }
  // the map is rebuilt and fitted to its points only when it is opened, the other
  // layout changes keep its view (the size observer resizes it)
  if (changed === 'map' && gtiz_layout.map == 'on' && gtiz_map.initialized) {
    gtiz_map.init();
    gtiz_layout.resizeMap();
  }
  // columns and selection of the grid are refreshed when the metadata panel is
  // opened or the whole layout is set, not when another panel is switched
  if ((!changed || changed === 'metadata') && gtiz_layout.metadata == 'on' && gtiz_metadata.initialized) {
    // Show the loader before the (synchronous) column auto-size + selection
    // sync so the user gets immediate feedback on first open; defer the heavy
    // work one frame so the spinner actually paints. findNodes removes the
    // loader when it finishes.
    gtiz_layout.uiLoadingManager(['metadata'], 'add');
    requestAnimationFrame(() => {
      gtiz_metadata.options.columnApi.autoSizeAllColumns(false);
      gtiz_metadata.findNodes();
    });
  }
  gtiz_layout.resizeTree();

};

gtiz_layout.buildToolsUi = function(obj) {
  let left_node = gtiz_layout.quick_actions_node.querySelector('.tools-left');
  let right_node = gtiz_layout.quick_actions_node.querySelector('.tools-right');
  left_node.innerHTML = '';
  right_node.innerHTML = '';
  obj.forEach(item => {
    if (item.visible) {
      let box = document.createElement('div'); 
      box.setAttribute('class', 'toggle-box');
      box.setAttribute('data-selection', item.options[0].value);
      box.setAttribute('data-view', item.type);
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
        let icon = option.icon != '' ? '<i class="tabler ' + option.icon + '"></i> ' : '';
        node.innerHTML = icon;
        toggle.append(node);
      });
      box.addEventListener('click', (e) => {
        toggle.classList.toggle('toggled-first-option');
        toggle.classList.toggle('toggled-second-option');
        let value = box.getAttribute('data-selection');
        if (value === item.options[0].value) {
          let value = item.options[1].value;
          let type = item.type;
          box.setAttribute('data-selection', value);
          label.innerHTML = ' ' + item.options[1].label;
          item.function(type, value);
        } else {
          let value = item.options[0].value;
          let type = item.type;
          box.setAttribute('data-selection', value);
          label.innerHTML = ' ' + item.options[0].label;
          item.function(type, value);
        }
      });
      if (item.position === 'left') {
        box.append(toggle);
        box.append(label);
        left_node.append(box);
      } else if (item.position === 'right') {
        box.append(label);
        box.append(toggle);
        right_node.append(box);
      }
    }
  });
  gtiz_layout.setView(obj);
}

/**
 * Enter or leave the full screen, from the tool of the header toolbar. The
 * whole page goes full screen, so the toolbar (and the tool to leave it) stays
 * visible.
 *
 * @returns {undefined}
 */
gtiz_layout.toggleFullScreen = function() {
  let isFullscreen = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  let page = document.documentElement;
  if (isFullscreen) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { // Chrome, Safari, Opera
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // Internet Explorer and Edge
      document.msExitFullscreen();
    }
  } else {
    if (page.requestFullscreen) {
      page.requestFullscreen();
    } else if (page.mozRequestFullScreen) { // Firefox
      page.mozRequestFullScreen();
    } else if (page.webkitRequestFullscreen) { // Chrome, Safari, Opera
      page.webkitRequestFullscreen();
    } else if (page.msRequestFullscreen) { // Internet Explorer and Edge
      page.msRequestFullscreen();
    }
  }
}

/**
 * Icon of the full screen tool: maximize to enter, minimize to leave
 *
 * @returns {undefined}
 */
gtiz_layout.updateFullScreenTrigger = function() {
  if (!gtiz_layout.fullscreen_trigger) {
    return;
  }
  let icon = gtiz_layout.fullscreen_trigger.querySelector('i');
  icon.setAttribute('class', gtiz_layout.fullscreen == 'on' ? 'tabler tabler-minimize' : 'tabler tabler-maximize');
}

/**
 * Show or hide the video player of the legend card, and set the icon of its
 * trigger in the legend header: video when shown, video-off when hidden
 *
 * @param {String} value 'on' || 'off'
 * @returns {undefined}
 */
gtiz_layout.setVideo = function(value) {
  gtiz_layout.video = value === 'off' ? 'off' : 'on';
  gtiz_layout.body.classList.toggle('video-mode', gtiz_layout.video == 'on');
  let icon = document.querySelector('.card-legend-player-trigger i');
  if (icon) {
    icon.setAttribute('class', gtiz_layout.video == 'on' ? 'tabler tabler-video' : 'tabler tabler-video-off');
  }
}

gtiz_layout.toggleMetadata = function(type, value) {
  gtiz_layout.metadata = value;
}

/**
 * Toggle the component visibility
 * 
 * @param {String} type Component type (legend, map etc.) 
 * @param {*} value on || off
 * 
 */
gtiz_layout.toggleView = function(type, value) {
  gtiz_layout[type] = value;
  gtiz_layout.setView(gtiz_layout.cfg, type);
};

gtiz_layout.init = function() {
  if (gtiz_tree.tree) {
    gtiz_layout.cfg.forEach(item => {
      item.visible = true;
    });
  }
  gtiz_layout.buildToolsUi(gtiz_layout.cfg);
}

gtiz_layout.expand_triggers.forEach(function(trigger) {
  trigger.addEventListener('click', function(e) {
    let component = trigger.getAttribute('data-component');
    gtiz_layout.expandComponent(component, trigger);
  });
});

if (gtiz_layout.fullscreen_trigger) {
  gtiz_layout.fullscreen_trigger.addEventListener('click', gtiz_layout.toggleFullScreen);
}

// the state follows the browser, also when the full screen is left with Esc
document.addEventListener("fullscreenchange", function(e) {
  gtiz_layout.fullscreen = document.fullscreenElement ? 'on' : 'off';
  gtiz_layout.updateFullScreenTrigger();
});

/*
*
* Minimum size: below an iPad mini in landscape (1024 × 768) a notification
* suggests a larger window, without blocking anything. The height is checked on
* the page (innerHeight), so 120px are left to the bars of the browser of such
* a screen. Shown once per session: closed, it comes back only after a reload.
*
*/
gtiz_layout.min_size = { width : 1024, height : 768, browser_bars : 120 };
gtiz_layout.small_window_notified = false;

/**
 * Show the minimum size notification when the window is smaller, once
 *
 * @returns {undefined}
 */
gtiz_layout.checkMinimumSize = function() {
  let min = gtiz_layout.min_size;
  if (gtiz_layout.small_window_notified) {
    return;
  }
  if (window.innerWidth >= min.width && window.innerHeight >= min.height - min.browser_bars) {
    return;
  }
  gtiz_layout.small_window_notified = true;
  let title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.small_window_title;
  let content = document.createElement('p');
  content.innerHTML = gtiz_locales.current.small_window_message.replace('{0}', min.width).replace('{1}', min.height);
  gtiz_modal.buildNotifier(title, [content], undefined, 'warning');
}

// tree, map and legend follow the window through the size observer; the size of
// the window is checked again after the resize settles
gtiz_layout.min_size_timer = null;
window.addEventListener("resize", function() {
  gtiz_layout.setViewHeight(800);
  clearTimeout(gtiz_layout.min_size_timer);
  gtiz_layout.min_size_timer = setTimeout(gtiz_layout.checkMinimumSize, 800);
});

gtiz_layout.observeSizes();

// the size of the window is checked once the page is loaded
window.addEventListener('load', gtiz_layout.checkMinimumSize);
