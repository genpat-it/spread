let gtiz_history = {};

/*
*
* Undo and redo of the changes to the tree: the items of the tree menu, of the
* settings cards (node shape card included) and of the legend that change how
* the tree looks, the node colours chosen in the legend and the nodes dragged on
* the tree. Map and metadata are not part of it; macros and assistant plans keep
* their own "Undo" and clear the history (as a new tree or new metadata do).
* Plan in docs/undo-plan.md.
*
* Every item declares how it is undone with `undo` in its configuration, as
* `macro` and `requires_selection`: `value` (default for the items with a value:
* the previous value is set again), `layout` (a value that moves the nodes, e.g.
* static or dynamic rendering, branch scaling: the value and then the node
* positions are set again), `styles` (node shapes and borders), `colours`
* (colours of the legend groups), `positions` (node positions), `structure` (the
* whole session, for collapsing and hiding nodes), `false` (not recorded, the
* default for buttons). The before state is kept when the change happens; the
* after state when it is undone, so redo always finds the state the undo left.
*
* Two round buttons in the tree card (undo, redo) say what they would undo or
* redo; Ctrl/Cmd+Z, Ctrl+Y and Ctrl/Cmd+Shift+Z do the same.
*
*/
gtiz_history.past = [];
gtiz_history.future = [];
gtiz_history.max_entries = 50;
// consecutive changes of the same control within this time are one entry (e.g. a slider)
gtiz_history.merge_ms = 1500;
// time left to SPREAD to lay the tree out again before the node positions are set back
gtiz_history.settle_ms = 300;
// true while an undo or a redo runs: the changes it makes are not recorded
gtiz_history.applying = false;
// above 0 while changes must not be recorded (e.g. an assistant plan)
gtiz_history.suspended = 0;
// above 0 inside a recorded call: the calls it makes are part of it
gtiz_history.depth = 0;
gtiz_history.undo_trigger = document.querySelector('.tree-history-undo');
gtiz_history.redo_trigger = document.querySelector('.tree-history-redo');

/**
 * Tell if a menu area is part of the history
 *
 * @param {String} area Area of the item (see gtiz_macros.getMenus)
 * @returns {Boolean} True for the tree menu, the legend menu and the settings cards
 */
gtiz_history.isTrackedArea = function(area) {
  return area === 'tree' || area === 'legend' || String(area).startsWith('settings/');
}

/**
 * Tell if a change happening now is recorded
 *
 * @returns {Boolean} True when a tree is loaded and no undo, redo, macro or plan is running
 */
gtiz_history.isTracking = function() {
  let macro_running = typeof gtiz_macros !== 'undefined' && gtiz_macros.running;
  return !gtiz_history.applying && gtiz_history.suspended === 0 && gtiz_history.depth === 0 &&
    !macro_running && typeof gtiz_tree !== 'undefined' && !!gtiz_tree.tree;
}

/**
 * How an item is undone
 *
 * @param {Object} item Menu item
 * @returns {String|Boolean} `value`, a scope name or false
 */
gtiz_history.modeOf = function(item) {
  if (item.undo !== undefined) {
    return item.undo;
  }
  if (item.macro === false || ['abutton', 'abutton_optioned', 'button'].includes(item.type)) {
    return false;
  }
  return 'value';
}

/**
 * Current value of an item: its selected option, otherwise the value its
 * control shows
 *
 * @param {Object} item Menu item
 * @returns {*} The value, undefined when the item does not tell it
 */
gtiz_history.currentValue = function(item) {
  try {
    if (typeof item.selected === 'function') {
      return item.selected();
    }
    if (item.selected !== undefined) {
      return item.selected;
    }
    if (typeof item.get_default === 'function') {
      return item.get_default();
    }
  } catch (error) {
    return undefined;
  }
  return undefined;
}

/**
 * Plain text of a label (labels may be functions and hold html)
 *
 * @param {String|Function} label Label
 * @returns {String} Text
 */
gtiz_history.textOf = function(label) {
  let text = typeof label === 'function' ? label() : label;
  let box = document.createElement('div');
  box.innerHTML = text === undefined || text === null ? '' : String(text);
  return box.textContent.trim();
}

/**
 * Text of a value of an item: the label of its option, or the value itself
 *
 * @param {Object} item Menu item
 * @param {*} value Value
 * @returns {String} Text, empty without a value
 */
gtiz_history.valueText = function(item, value) {
  if (value === undefined || value === null || typeof value === 'object') {
    return '';
  }
  let options = typeof item.options === 'function' ? item.options() : item.options;
  let option = Array.isArray(options) ? options.find(candidate => String(candidate.value) === String(value)) : undefined;
  return option && option.label ? gtiz_history.textOf(option.label) : String(value);
}

/**
 * Name of an item: its label; for a number box the label of its slider; for a
 * toggle or a radio without label the title of its settings card
 *
 * @param {String} area Area of the item
 * @param {Object} item Menu item
 * @returns {String} Name, empty when the item has none
 */
gtiz_history.itemName = function(area, item) {
  let label = gtiz_history.textOf(item.label);
  if (label) {
    return label;
  }
  let menu = (typeof gtiz_macros !== 'undefined' ? gtiz_macros.getMenus()[area] : null) || [];
  let slider = item.id ? menu.find(other => other && other.id === item.id + '-slider') : undefined;
  if (slider && slider.label) {
    return gtiz_history.textOf(slider.label);
  }
  let control = item.id ? document.getElementById(item.id) : null;
  let card = control ? control.closest('.card') : null;
  let title = card ? card.querySelector('.card-title') : null;
  return title ? title.textContent.trim() : '';
}

/**
 * Title of an entry: name of the item and, when given, the new value
 *
 * @param {String} area Area of the item
 * @param {Object} item Menu item
 * @param {*} value New value (optional)
 * @returns {String} Title, e.g. "Color by: Province"
 */
gtiz_history.entryLabel = function(area, item, value) {
  let name = gtiz_history.itemName(area, item);
  let text = gtiz_history.valueText(item, value);
  if (name && text) {
    return name + ': ' + text;
  }
  return name || text || item.id || '';
}

/**
 * Value an item is called with (as the macro recorder reads it)
 *
 * @param {Object} item Menu item
 * @param {Array} args Arguments of the call
 * @returns {*} The value, undefined for buttons
 */
gtiz_history.callValue = function(item, args) {
  let value = item.type === 'abutton' ? undefined : args[0];
  if (value !== undefined && (typeof value === 'object' || typeof value === 'function')) {
    return undefined;
  }
  if ((item.type === 'number' || item.type === 'slider') && value !== undefined) {
    return Number(value);
  }
  return value;
}

/**
 * Item the history acts on: a slider and its number box are one setting,
 * recorded with the box (as the macro recorder does)
 *
 * @param {String} area Area of the item
 * @param {Object} item Menu item
 * @returns {Object} `{ area, id, item }`
 */
gtiz_history.target = function(area, item) {
  let id = item.id;
  let menu = (typeof gtiz_macros !== 'undefined' ? gtiz_macros.getMenus()[area] : null) || [];
  if (id && id.endsWith('-slider')) {
    let box = menu.find(other => other && other.id === id.replace(/-slider$/, ''));
    if (box) {
      return { area : area, id : box.id, item : box };
    }
  }
  return { area : area, id : id, item : item };
}

/*
*
* Scopes: states captured before a change and given back by an undo
*
*/
gtiz_history.scopes = {
  // node shapes and borders, by sample id
  styles : {
    capture : () => JSON.stringify(gtiz_tree.tree.node_styles || { shapes : {}, borders : {} }),
    restore : (state) => {
      gtiz_tree.tree.setNodeStyles(JSON.parse(state));
      if (typeof gtiz_node_styles !== 'undefined') {
        gtiz_node_styles.refresh();
      }
    }
  },
  // colours of the groups of the shown category: scheme, order, groups and custom colours
  colours : {
    capture : () => {
      let tree = gtiz_tree.tree;
      let category = tree.display_category;
      return JSON.stringify({
        category : category,
        info : tree.metadata_info[category] || {},
        custom : tree.custom_colours[category] || null
      });
    },
    restore : (state) => {
      let tree = gtiz_tree.tree;
      let saved = JSON.parse(state);
      if (!tree.metadata_info[saved.category]) {
        return;
      }
      Object.assign(tree.metadata_info[saved.category], saved.info);
      if (saved.custom) {
        tree.custom_colours[saved.category] = saved.custom;
      } else {
        delete tree.custom_colours[saved.category];
      }
      tree.changeCategory(tree.display_category);
      gtiz_legend.setContextMenuForm(tree);
      if (gtiz_legend.selection_mode == 'visual') {
        gtiz_legend.resetVisualSelection();
        gtiz_legend.highlightSelection();
      } else {
        gtiz_legend.resetQualitativeSelection();
      }
    }
  },
  // positions of the nodes (static layout)
  positions : {
    capture : () => {
      let positions = {};
      gtiz_tree.tree.force_nodes.forEach(node => {
        positions[node.id] = [node.x, node.y, node.px, node.py, node.fixed];
      });
      return positions;
    },
    restore : (state) => {
      let tree = gtiz_tree.tree;
      tree.force_nodes.forEach(node => {
        let position = state[node.id];
        if (position) {
          node.x = position[0];
          node.y = position[1];
          node.px = position[2];
          node.py = position[3];
          node.fixed = position[4];
        }
      });
      if (tree.renderer) {
        tree.renderer.invalidateIndex();
        tree.renderer.requestRedraw();
      }
    }
  },
  // the whole session: collapsed, hidden and shown nodes change the tree itself
  structure : {
    capture : () => JSON.stringify(gtiz_tree.getCompleteGrapeTreeObject()),
    restore : (state) => {
      let components = ['tree', 'map', 'metadata', 'legend'];
      gtiz_layout.uiLoadingManager(components, 'add');
      gtiz_tree.current_metadata_file = null;
      // the notes are not part of what is undone: the ones in memory stay (as for macros)
      if (typeof gtiz_notes !== 'undefined') {
        gtiz_notes.keep_session = true;
      }
      return gtiz_file_handler.loadTreeText(state, true);
    },
    heavy : true
  }
};

/**
 * Add an entry: the future is dropped, the oldest entries go over the limit
 *
 * @param {Object} entry `{ key, label, undo(), redo(), heavy }`
 * @returns {undefined}
 */
gtiz_history.push = function(entry) {
  entry.time = Date.now();
  gtiz_history.past.push(entry);
  gtiz_history.future = [];
  while (gtiz_history.past.length > gtiz_history.max_entries) {
    gtiz_history.past.shift();
  }
  // whole sessions are heavy: at most 5 of them
  let heavy = gtiz_history.past.filter(candidate => candidate.heavy);
  if (heavy.length > 5) {
    gtiz_history.past.splice(gtiz_history.past.indexOf(heavy[0]), 1);
  }
  gtiz_history.updateTriggers();
}

/**
 * Wait for SPREAD to lay the tree out again after a setting changed
 *
 * @returns {Promise<undefined>}
 */
gtiz_history.settle = function() {
  return new Promise(resolve => setTimeout(resolve, gtiz_history.settle_ms));
}

/**
 * Record the change of a value: consecutive changes of the same control are one
 * entry, which keeps the first previous value. With the node positions (mode
 * `layout`) an undo sets the value and then puts the nodes back where they were,
 * so the tree is the one before the change, with its other changes (e.g. nodes
 * dragged, collapsed) untouched.
 *
 * @param {String} area Area of the item
 * @param {Object} item Menu item
 * @param {*} before Value before the change
 * @param {*} value New value
 * @param {Object} positions Node positions before the change (mode `layout`, optional)
 * @returns {undefined}
 */
gtiz_history.recordValue = function(area, item, before, value, positions) {
  let target = gtiz_history.target(area, item);
  let key = target.area + '|' + target.id;
  let label = gtiz_history.entryLabel(target.area, target.item, value);
  let last = gtiz_history.past[gtiz_history.past.length - 1];
  if (last && last.key === key && gtiz_history.future.length === 0 && Date.now() - last.time < gtiz_history.merge_ms) {
    last.label = label;
    last.time = Date.now();
    gtiz_history.updateTriggers();
    return;
  }
  if (before === undefined || String(before) === String(value)) {
    return;
  }
  let after;
  let after_positions;
  let scope = gtiz_history.scopes.positions;
  gtiz_history.push({
    key : key,
    label : label,
    undo : async () => {
      after = gtiz_history.currentValue(target.item);
      after_positions = positions ? scope.capture() : null;
      gtiz_macros.runStep({ area : target.area, id : target.id, value : before });
      if (positions) {
        await gtiz_history.settle();
        scope.restore(positions);
      }
    },
    redo : async () => {
      gtiz_macros.runStep({ area : target.area, id : target.id, value : after });
      if (after_positions) {
        await gtiz_history.settle();
        scope.restore(after_positions);
      }
    }
  });
}

/**
 * Record a change of a scope: the state before is the one given, the state
 * after is taken when the change is undone
 *
 * @param {String} name Scope name (see gtiz_history.scopes)
 * @param {*} before State before the change
 * @param {String} label Title of the entry
 * @returns {undefined}
 */
gtiz_history.recordScope = function(name, before, label) {
  let scope = gtiz_history.scopes[name];
  let after;
  gtiz_history.push({
    key : 'scope|' + name,
    label : label,
    heavy : !!scope.heavy,
    undo : () => {
      after = scope.capture();
      return scope.restore(before);
    },
    redo : () => scope.restore(after)
  });
}

/**
 * Wrap the function of an item: the state before is captured, the change is
 * recorded after the call
 *
 * @param {String} area Area of the item
 * @param {Object} item Menu item
 * @returns {undefined}
 */
gtiz_history.wrapItem = function(area, item) {
  if (!item || typeof item.function !== 'function' || item.history_wrapped) {
    return;
  }
  let original = item.function;
  item.function = function(...args) {
    let mode = gtiz_history.modeOf(item);
    if (!mode || !gtiz_history.isTracking()) {
      return original.apply(this, args);
    }
    let value = gtiz_history.callValue(item, args);
    // a button acting on the selection does nothing without one
    if (item.requires_selection && !(gtiz_tree.tree.getSelectedNodeIDs().length > 0)) {
      return original.apply(this, args);
    }
    let before;
    let positions;
    if (mode === 'value' || mode === 'layout') {
      before = gtiz_history.currentValue(gtiz_history.target(area, item).item);
      positions = mode === 'layout' ? gtiz_history.scopes.positions.capture() : undefined;
    } else if (gtiz_history.scopes[mode]) {
      before = gtiz_history.scopes[mode].capture();
    }
    let result;
    gtiz_history.depth++;
    try {
      result = original.apply(this, args);
    } finally {
      gtiz_history.depth--;
    }
    if (mode === 'value' || mode === 'layout') {
      gtiz_history.recordValue(area, item, before, value, positions);
    } else if (gtiz_history.scopes[mode]) {
      gtiz_history.recordScope(mode, before, gtiz_history.entryLabel(area, item, value));
    }
    return result;
  };
  item.history_wrapped = true;
}

/**
 * Wrap the items of the tree menu, of the legend menu and of the settings cards.
 * Idempotent: called at start up and when a tree is loaded (late menus).
 *
 * @returns {undefined}
 */
gtiz_history.wrapMenus = function() {
  if (typeof gtiz_macros === 'undefined') {
    return;
  }
  Object.entries(gtiz_macros.getMenus()).forEach(([area, menu]) => {
    if (gtiz_history.isTrackedArea(area)) {
      menu.forEach(item => gtiz_history.wrapItem(area, item));
    }
  });
}

/**
 * Run an undo or a redo: what it changes is not recorded; a whole session is
 * loaded again before the next change can be recorded
 *
 * @param {Function} action undo() or redo() of an entry
 * @returns {Promise<undefined>}
 */
gtiz_history.apply = async function(action) {
  gtiz_history.applying = true;
  try {
    await action();
  } catch (error) {
    console.error('History step failed:', error);
  } finally {
    gtiz_history.applying = false;
    gtiz_history.updateTriggers();
  }
}

/**
 * Undo the last change
 *
 * @returns {Promise<undefined>}
 */
gtiz_history.undo = async function() {
  if (gtiz_history.applying || gtiz_history.past.length === 0) {
    return;
  }
  let entry = gtiz_history.past.pop();
  gtiz_history.future.push(entry);
  await gtiz_history.apply(entry.undo);
}

/**
 * Redo the last undone change
 *
 * @returns {Promise<undefined>}
 */
gtiz_history.redo = async function() {
  if (gtiz_history.applying || gtiz_history.future.length === 0) {
    return;
  }
  let entry = gtiz_history.future.pop();
  gtiz_history.past.push(entry);
  await gtiz_history.apply(entry.redo);
}

/**
 * Empty the history: what it holds may no longer apply (a new tree, new
 * metadata, a macro or an assistant plan changed the session)
 *
 * @returns {undefined}
 */
gtiz_history.clear = function() {
  if (gtiz_history.applying) {
    return;
  }
  gtiz_history.past = [];
  gtiz_history.future = [];
  gtiz_history.updateTriggers();
}

/**
 * Show on the buttons of the tree card what they would undo or redo; disabled
 * when there is nothing
 *
 * @returns {undefined}
 */
gtiz_history.updateTriggers = function() {
  let texts = typeof gtiz_locales !== 'undefined' && gtiz_locales.current ? gtiz_locales.current : {};
  let set = (trigger, entry, key, empty_key) => {
    if (!trigger) {
      return;
    }
    let disabled = !entry || gtiz_history.applying;
    trigger.classList.toggle('is-disabled', disabled);
    trigger.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    let title = entry ? (texts[key] || '{0}').replace('{0}', entry.label) : (texts[empty_key] || '');
    trigger.setAttribute('title', title);
  };
  set(gtiz_history.undo_trigger, gtiz_history.past[gtiz_history.past.length - 1], 'history_undo', 'history_undo_empty');
  set(gtiz_history.redo_trigger, gtiz_history.future[gtiz_history.future.length - 1], 'history_redo', 'history_redo_empty');
}

/*
*
* Fields where the browser keeps its own undo: the ones where text is typed
* (text and search boxes, text areas, editable contents), the metadata grid and
* the assistant. Selects, sliders, number boxes, checkboxes and radios have no
* undo of their own: with the focus on them the shortcuts go to the history.
*
*/
gtiz_history.text_fields = 'input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="password"], textarea, [contenteditable="true"], .ag-root-wrapper, .card-assistant';

/**
 * Tell if a key press belongs to a text field, a modal or the assistant, where
 * the browser keeps its own undo
 *
 * @param {Event} event Key event
 * @returns {Boolean} True when the history must not handle it
 */
gtiz_history.isEditing = function(event) {
  let target = event.target;
  if (document.body.classList.contains('show-modal')) {
    return true;
  }
  if (!target || !target.closest) {
    return false;
  }
  return !!target.closest(gtiz_history.text_fields);
}

/*
*
* Changes outside the menus: the category chosen from any select (legend title,
* table), the colour of a legend group, the nodes dragged on the tree
*
*/

/**
 * Hook the changes that do not go through a menu item, and the events that
 * clear the history. Called once the page is loaded.
 *
 * @returns {undefined}
 */
gtiz_history.hookChanges = function() {
  // category of the colours, whatever chose it: recorded as the "Color by" of the node style card
  let changeCategoryColor = gtiz_legend.changeCategoryColor;
  gtiz_legend.changeCategoryColor = function(value) {
    let tracking = gtiz_history.isTracking();
    let before = tracking ? gtiz_tree.tree.display_category : undefined;
    let result = changeCategoryColor.apply(this, arguments);
    if (tracking) {
      let menu = gtiz_macros.getMenus()['settings/node-style'] || [];
      let item = menu.find(candidate => candidate && candidate.id === 'tree-metadata-select');
      if (item) {
        gtiz_history.recordValue('settings/node-style', item, before, value);
      }
    }
    return result;
  };

  // colour of a group from the legend: captured before the legend applies it (capture phase)
  let chooser = gtiz_legend.legend_colour_chooser;
  if (chooser) {
    chooser.addEventListener('change', function() {
      if (gtiz_history.isTracking()) {
        let label = gtiz_locales.current.color_scheme + ': ' + gtiz_locales.current.custom;
        gtiz_history.recordScope('colours', gtiz_history.scopes.colours.capture(), label);
      }
    }, true);
  }

  // nodes dragged on the tree in the static layout (in the dynamic one the simulation moves them)
  if (typeof D3MSTree !== 'undefined') {
    let dragStarted = D3MSTree.prototype._dragStarted;
    let dragEnded = D3MSTree.prototype._dragEnded;
    D3MSTree.prototype._dragStarted = function() {
      this._history_positions = this.fixed_mode && gtiz_history.isTracking() ? gtiz_history.scopes.positions.capture() : null;
      return dragStarted.apply(this, arguments);
    };
    D3MSTree.prototype._dragEnded = function() {
      let result = dragEnded.apply(this, arguments);
      let before = this._history_positions;
      this._history_positions = null;
      if (before && gtiz_history.isTracking()) {
        let after = gtiz_history.scopes.positions.capture();
        let moved = Object.keys(after).some(id => before[id] && (before[id][0] !== after[id][0] || before[id][1] !== after[id][1]));
        if (moved) {
          gtiz_history.recordScope('positions', before, gtiz_locales.current.history_node_positions);
        }
      }
      return result;
    };
  }

  // a new tree or new metadata: the history no longer applies
  let loadMSTree = gtiz_tree.loadMSTree;
  gtiz_tree.loadMSTree = function() {
    gtiz_history.clear();
    let result = loadMSTree.apply(this, arguments);
    // menus built with the tree are wrapped too
    gtiz_history.wrapMenus();
    return result;
  };
  let loadMetadataText = gtiz_file_handler.loadMetadataText;
  gtiz_file_handler.loadMetadataText = function() {
    gtiz_history.clear();
    return loadMetadataText.apply(this, arguments);
  };

  // a macro changes the session outside the history (it has its own "Undo macro")
  if (typeof gtiz_macros !== 'undefined' && typeof gtiz_macros.run === 'function') {
    let run = gtiz_macros.run;
    gtiz_macros.run = async function() {
      try {
        return await run.apply(this, arguments);
      } finally {
        gtiz_history.clear();
      }
    };
  }
}

/**
 * Bind the buttons of the tree card and the keyboard shortcuts
 *
 * @returns {undefined}
 */
gtiz_history.init = function() {
  gtiz_history.wrapMenus();
  gtiz_history.hookChanges();
  let bind = (trigger, action) => {
    if (!trigger) {
      return;
    }
    trigger.addEventListener('click', function() {
      if (!trigger.classList.contains('is-disabled')) {
        action();
      }
    });
    trigger.addEventListener('keydown', function(e) {
      if ((e.key === 'Enter' || e.key === ' ') && !trigger.classList.contains('is-disabled')) {
        e.preventDefault();
        action();
      }
    });
  };
  bind(gtiz_history.undo_trigger, gtiz_history.undo);
  bind(gtiz_history.redo_trigger, gtiz_history.redo);
  document.addEventListener('keydown', function(event) {
    let command = event.ctrlKey || event.metaKey;
    if (!command || event.altKey || gtiz_history.isEditing(event)) {
      return;
    }
    let key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      gtiz_history.undo();
    } else if ((key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey && !event.shiftKey)) {
      event.preventDefault();
      gtiz_history.redo();
    }
  });
  gtiz_history.updateTriggers();
}

document.addEventListener('DOMContentLoaded', gtiz_history.init);
