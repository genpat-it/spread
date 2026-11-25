let gtiz_macros = {};

gtiz_macros.undo_counter = 0;
gtiz_macros.undo_versions = {};

gtiz_macros.css_vars = gtiz_utils.getAllCssVariables();
gtiz_macros.scrolly_options = {
  opacity: 0.8,
  containerColor: 'var(--secondary-light)',
  barColor: 'var(--secondary-dark)',
  radius: 1,
  scaleY : 0.95,
  side : 'right',
  width : 0.3,
  unit : 'rem',
  // new Scrolly: content measured with scrollHeight, bar draggable
  contentHeightMode : 'scroll',
  draggable : true,
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
    en : "Log scale at 10",
    it : "Scala logaritmica a 10",
    fr : "&#201;chelle logarithmique en base 10"
  },
  // steps name interface controls (see gtiz_macros.runStep), never code
  steps : [{
    area : 'settings/node-style',
    id : 'tree-show-node-labels',
    value : 'shown'
  }, {
    area : 'settings/branch-style',
    id : 'tree-show-branch-labels',
    value : 'shown'
  }, {
    area : 'settings/branch-cutoffs',
    id : 'tree-branch-length-method',
    value : 'hide'
  }, {
    area : 'settings/branch-cutoffs',
    id : 'tree-branch-length',
    value : 10
  }, {
    area : 'settings/branch-style',
    id : 'tree-branch-toggle-log-scale',
    value : 'active'
  }, {
    area : 'tree',
    id : 'tree-menu-centre-tree'
  }],
  description : {
    en : "Show node and link labels, set link cut-off to 10 and activate log scale",
    it : "Mostra le etichette di nodi e collegamenti, imposta un taglio di 10 per i collegamenti ed attiva la scala logaritmica",
    fr : "Il montre les étiquettes des n&#156;uds et des liens, définit un seuil de 10 pour les connexions et active l'échelle logarithmique"
  },
  tag : {
    code : 'tree_settings',
    label : {
      en : 'Tree settings',
      it : 'Impostazioni tree',
      fr : "Paramètres de l'arborescence"
    }
  },
  version : '1.0.0'
}, {
  type : 'macro',
  title : {
    en : "Preset space time",
    it : "Preset spazio tempo",
    fr : "Préréglage espace-temps"
  },
  steps : [{
    area : 'layout',
    id : 'map',
    value : 'on'
  }, {
    area : 'layout',
    id : 'legend',
    value : 'on'
  }, {
    area : 'legend',
    id : 'legend-menu-player',
    value : 'on'
  }, {
    area : 'legend',
    id : 'legend-menu-selection-mode',
    value : 'visual'
  }, {
    // skipped when the tree has no such column
    area : 'legend',
    id : 'legend-menu-color-by',
    value : 'dataprelievo'
  }, {
    area : 'legend',
    id : 'legend-menu-quick-gradient'
  }],
  description : {
    en : "Open map component, set legend selection to visual mode, change category to 'dataprelievo' if exists and finally run quick gradient function",
    it : "Apre il componente mappa, imposta la selezione della legenda in modalità visuale, cambia categoria in 'dataprelievo' se esiste ed infine lancia la funzione di gradazione rapida",
    fr : "Il ouvre le composant carte et définit la sélection de la légende en mode visuel; il change de catégorie vers 'dataprelievo' (si elle existe) et, enfin, il lance la fonction de gradation rapide"
  },
  tag : {
    code : 'spatio_temporal',
    label : {
      en : "Spatio-temporal",
      it : "Spazio-tempo",
      fr : "Espace-temps"
    }
  },
  version : '1.0.0'
}];

/**
 * Load tree object from undo object by version provided
 * 
 * @param {Number} version 
 * @returns {Promise|undefined} Resolved when the tree is built, when a version was loaded
 */
gtiz_macros.loadUndoObject = function(version) {
  let key = 'v' + version;
  if (gtiz_macros.undo_versions[key] && gtiz_macros.undo_versions.current != key) {
    let components = ['tree', 'map', 'metadata', 'legend'];
    let action = 'add';
    gtiz_layout.uiLoadingManager(components, action);
    gtiz_macros.undo_versions.current = key;
    let text = JSON.stringify(gtiz_macros.undo_versions[key]);
    gtiz_tree.current_metadata_file = null;
    // the notes are not part of what a macro changes: the ones in memory stay
    if (typeof gtiz_notes !== 'undefined') {
      gtiz_notes.keep_session = true;
    }
    return gtiz_file_handler.loadTreeText(text, true);
  } else {
    if (gtiz_macros.undo_versions.current === key) {
      console.log('Already at this version');
    }
    if (!gtiz_macros.undo_versions[key]) {
      console.log('No version found');
    }
  }
};

/**
 * Set current undo version
 * 
 * @param {Number} version 
 */
gtiz_macros.setCurrentUndoVersion = function(version) {
  gtiz_macros.undo_versions.current = 'v' + version;
};

/**
 * Set undo objects
 *
 */
gtiz_macros.setUndoObjects = function(version) {
  function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => deepCopy(item));
    }

    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = deepCopy(obj[key]);
      return acc;
    }, {});
  }
  let key = 'v' + version;
  gtiz_macros.undo_versions[key] = deepCopy(gtiz_tree.getCompleteGrapeTreeObject());
};

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

/*
*
* Macro engine. A step names an interface control and the value chosen,
* { area, id, value }, never code: `area` is a menu or a card (`tree`, `legend`,
* `map`, `metadata`, `metadata-card`, `zooms`, `zooms-filtered`, `video`,
* `layout`, `settings/<card>`), `id` the id of its item (the panel name for the
* layout toggles). A step runs the item as a click would, so a macro, even one
* imported from a file, cannot do anything the interface does not allow.
*
*/
gtiz_macros.step_delay = 150;
gtiz_macros.running = false;

/**
 * Menus and cards whose items the macro steps can name, by area.
 *
 * @returns {Object} Area -> array of menu items
 */
gtiz_macros.getMenus = function() {
  let menus = {};
  let add = (area, menu) => {
    if (Array.isArray(menu)) {
      menus[area] = menu;
    }
  };
  if (typeof gtiz_tree !== 'undefined') {
    add('tree', gtiz_tree.context_menu);
  }
  if (typeof gtiz_legend !== 'undefined') {
    add('legend', gtiz_legend.context_menu);
  }
  if (typeof gtiz_map !== 'undefined') {
    add('map', gtiz_map.context_menu);
  }
  if (typeof gtiz_metadata !== 'undefined') {
    add('metadata', gtiz_metadata.context_menu);
    add('metadata-card', gtiz_metadata.card_menu);
  }
  if (typeof gtiz_zooms !== 'undefined') {
    add('zooms', gtiz_zooms.context_menu);
    add('zooms-filtered', gtiz_zooms.filtered_context_menu);
  }
  if (typeof gtiz_video !== 'undefined') {
    add('video', gtiz_video.context_menu);
  }
  if (typeof gtiz_layout !== 'undefined') {
    add('layout', gtiz_layout.cfg);
  }
  if (typeof gtiz_settings !== 'undefined') {
    gtiz_settings.cfg.forEach(card => add('settings/' + card.card, card.menu));
  }
  // the node shape card is a grid, not a menu: js/node-shape.js describes its operations
  if (typeof gtiz_node_styles !== 'undefined') {
    add('settings/node-shape', gtiz_node_styles.macro_items);
  }
  return menus;
};

/**
 * Step written for a control that has moved: the video player was a layout
 * toggle and is now an item of the legend menu (2026-11-23), so macros saved
 * before still run.
 *
 * @param {Object} step Step {area, id, value}
 * @returns {Object} The same step, or a copy naming the control where it is now
 */
gtiz_macros.normalizeStep = function(step) {
  if (step && step.area === 'layout' && step.id === 'video') {
    return { ...step, area : 'legend', id : 'legend-menu-player' };
  }
  return step;
};

/**
 * Item named by a step, or undefined when the current configuration has none
 * (e.g. a read-only page or a separator).
 *
 * @param {Object} step Step {area, id, value}
 * @returns {Object|undefined} Menu item
 */
gtiz_macros.findItem = function(step) {
  step = gtiz_macros.normalizeStep(step);
  let menu = gtiz_macros.getMenus()[step.area];
  if (!menu || typeof step.id !== 'string') {
    return undefined;
  }
  let read_only = typeof gtiz_app !== 'undefined' && gtiz_app.cfg.read_only;
  return menu.find(item => {
    if (!item || item.type === 'separator' || (read_only && item.hide_in_read_only)) {
      return false;
    }
    // layout toggles have no id: they are named by their panel
    return step.area === 'layout' ? item.type === step.id : item.id === step.id;
  });
};

/**
 * Options of an item (array or function), as {value, label}.
 *
 * @param {Object} item Menu item
 * @returns {Array} Options
 */
gtiz_macros.getOptions = function(item) {
  let options = typeof item.options === 'function' ? item.options() : item.options;
  return Array.isArray(options) ? options : [];
};

/**
 * Value of a step checked against its item: one of the options, a number in
 * range, a text for a search box, nothing for a button.
 *
 * @param {Object} item Menu item
 * @param {*} value Value of the step
 * @returns {*} Value to apply
 * @throws {Error} With `reason` 'value' when the value is not valid
 */
gtiz_macros.checkValue = function(item, value) {
  let invalid = () => {
    let error = new Error('Invalid value');
    error.reason = 'value';
    return error;
  };
  let read = (fixed, getter) => {
    if (fixed !== undefined && fixed !== null && fixed !== '') {
      return Number(fixed);
    }
    return typeof getter === 'function' ? Number(getter()) : undefined;
  };
  if (item.type === 'abutton') {
    return undefined;
  }
  if (item.type === 'number' || item.type === 'slider') {
    let number = Number(value);
    let min = read(item.min, item.get_min);
    let max = read(item.max, item.get_max);
    if (value === undefined || value === null || value === '' || !Number.isFinite(number)) {
      throw invalid();
    }
    if ((Number.isFinite(min) && number < min) || (Number.isFinite(max) && number > max)) {
      throw invalid();
    }
    return number;
  }
  if (item.type === 'search') {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw invalid();
    }
    return String(value);
  }
  let options = gtiz_macros.getOptions(item);
  if (options.length > 0 || ['toggle', 'select', 'radio', 'abutton_optioned'].includes(item.type) || item.area === 'layout') {
    let found = options.find(option => String(option.value) === String(value));
    if (!found) {
      throw invalid();
    }
    return found.value;
  }
  return value;
};

/**
 * Run an item from a temporary copy of its control: the optioned buttons (e.g.
 * download image) read the chosen option from the select next to them.
 *
 * @param {Object} item Menu item
 * @param {String} value Chosen option
 * @returns {undefined}
 */
gtiz_macros.invokeOptioned = function(item, value) {
  let box = document.createElement('div');
  box.setAttribute('class', 'button-box-optioned');
  box.hidden = true;
  let select = document.createElement('select');
  gtiz_macros.getOptions(item).forEach(option => {
    select.add(new Option(String(option.value), option.value, false, String(option.value) === String(value)));
  });
  let button = document.createElement('a');
  box.append(select, button);
  document.body.append(box);
  try {
    item.function({ currentTarget : button });
  } finally {
    box.remove();
  }
};

/**
 * Settings cards: operate the visible control as a user would (set the value
 * and fire the event SPREAD listens to), so the card handler updates its state
 * and the controls bound to it (twin slider and number box).
 *
 * @param {Object} item Menu item
 * @param {*} value Value to apply
 * @returns {Boolean} True when a control was operated
 */
gtiz_macros.viaControl = function(item, value) {
  let control = item.id ? document.getElementById(item.id) : null;
  if (!control || !control.isConnected) {
    return false;
  }
  let text = value === undefined || value === null ? '' : String(value);
  switch (item.type) {
    case 'number':
    case 'slider':
      if (control.tagName !== 'INPUT') {
        return false;
      }
      control.value = text;
      control.dispatchEvent(new Event(item.type === 'slider' ? 'input' : 'change', { bubbles : true }));
      return true;
    case 'select':
      if (control.tagName !== 'SELECT' || ![...control.options].some(option => option.value === text)) {
        return false;
      }
      control.value = text;
      control.dispatchEvent(new Event('change', { bubbles : true }));
      return true;
    case 'toggle':
      if (!control.classList.contains('toggle-box')) {
        return false;
      }
      if (control.getAttribute('data-selection') !== text) {
        control.click();
      } else {
        // the control may show a stale state: apply the value anyway
        item.function(value);
      }
      return true;
    case 'radio': {
      let row = [...control.querySelectorAll('.list-row')].find(candidate => candidate.getAttribute('data-value') === text);
      if (!row) {
        return false;
      }
      row.click();
      return true;
    }
    case 'search':
      if (control.tagName !== 'INPUT') {
        return false;
      }
      control.value = text;
      control.dispatchEvent(new KeyboardEvent('keydown', { key : 'Enter', bubbles : true }));
      return true;
    default:
      return false;
  }
};

/**
 * Run one step through the same path as a click on its control.
 *
 * @param {Object} step Step {area, id, value}
 * @returns {Object} Result {step, ok, reason}: reason is 'unknown' (no such
 *   control here), 'excluded' (not allowed in macros), 'selection' (it needs
 *   selected nodes), 'value' (value not available, e.g. a missing column) or
 *   'failed' (the control raised an error)
 */
gtiz_macros.runStep = function(step) {
  let result = { step : step, ok : false };
  step = gtiz_macros.normalizeStep(step);
  let item = step && typeof step === 'object' ? gtiz_macros.findItem(step) : undefined;
  if (!item || typeof item.function !== 'function') {
    result.reason = 'unknown';
    return result;
  }
  if (item.macro === false) {
    result.reason = 'excluded';
    return result;
  }
  if (item.requires_selection && !(gtiz_tree.tree && gtiz_tree.tree.getSelectedNodeIDs().length > 0)) {
    result.reason = 'selection';
    return result;
  }
  let value;
  try {
    value = gtiz_macros.checkValue(step.area === 'layout' ? { ...item, area : 'layout' } : item, step.value);
  } catch (error) {
    result.reason = error.reason || 'value';
    return result;
  }
  try {
    if (step.area === 'layout') {
      // panels change through their toggle, which also rebuilds the layout
      gtiz_macros.simulateLayoutToggleClick([{ view : item.type, selection : value === 'on' }]);
    } else if (item.type === 'abutton_optioned') {
      gtiz_macros.invokeOptioned(item, value);
    } else if (step.area.startsWith('settings/') && gtiz_macros.viaControl(item, value)) {
      // the card handler ran
    } else if (value === undefined) {
      item.function();
    } else {
      item.function(value);
    }
    result.ok = true;
  } catch (error) {
    console.error('Macro step failed:', step, error);
    result.reason = 'failed';
  }
  return result;
};

/**
 * Run the steps of a macro one after the other, with a short pause between them
 * (some SPREAD changes propagate asynchronously). Steps that cannot run are
 * skipped. The tree before and after is kept for undo.
 *
 * @param {Array} steps Steps of the macro
 * @returns {Promise<Array>} Result of each step (see gtiz_macros.runStep)
 */
gtiz_macros.run = async function(steps) {
  if (gtiz_macros.running || !Array.isArray(steps)) {
    return [];
  }
  gtiz_macros.running = true;
  let results = [];
  let version = 0;
  try {
    gtiz_macros.setUndoObjects(version);
    for (let step of steps) {
      results.push(gtiz_macros.runStep(step));
      await new Promise(resolve => setTimeout(resolve, gtiz_macros.step_delay));
    }
    version++;
    gtiz_macros.setUndoObjects(version);
    gtiz_macros.setCurrentUndoVersion(version);
  } finally {
    gtiz_macros.running = false;
  }
  let skipped = results.filter(result => !result.ok);
  if (skipped.length > 0) {
    console.log('Macro steps skipped:', skipped.map(result => ({ step : result.step, reason : result.reason })));
  }
  return results;
};

/*
*
* Recording. While a recording is on and not paused, the functions of the menu
* and card items note a step { area, id, value } before running: the items are
* wrapped once (wrapMenus), so the places that call them do not change. Items
* with `macro: false` (file dialogs, metadata modals, loading another tree) are
* not recorded; items with `requires_selection` act on the nodes selected when
* the macro runs.
*
*/
gtiz_macros.recording = null;
gtiz_macros.user_macros = [];

/**
 * Wrap the function of every menu and card item with the recorder. Idempotent:
 * called at start up and again when a recording starts, for late menus.
 *
 * @returns {undefined}
 */
gtiz_macros.wrapMenus = function() {
  Object.entries(gtiz_macros.getMenus()).forEach(([area, menu]) => {
    menu.forEach(item => {
      if (!item || typeof item.function !== 'function' || item.macro_wrapped) {
        return;
      }
      let original = item.function;
      item.function = function(...args) {
        if (gtiz_macros.recording && !gtiz_macros.recording.paused && !gtiz_macros.running) {
          gtiz_macros.recordCall(area, item, args);
        }
        return original.apply(this, args);
      };
      item.macro_wrapped = true;
    });
  });
};

/**
 * Note the step of an item called while recording. Consecutive calls of the same
 * control keep only the last value (e.g. dragging a slider).
 *
 * @param {String} area Menu or card of the item
 * @param {Object} item Menu item
 * @param {Array} args Arguments of the call
 * @returns {undefined}
 */
gtiz_macros.recordCall = function(area, item, args) {
  if (item.macro === false) {
    return;
  }
  let id = area === 'layout' ? item.type : item.id;
  if (!id) {
    return;
  }
  let value;
  if (area === 'layout') {
    // layout toggles are called with (panel, value)
    value = args[1];
  } else if (item.type === 'abutton_optioned') {
    let target = args[0] && args[0].currentTarget;
    let box = target && target.closest ? target.closest('.button-box-optioned') : null;
    let select = box ? box.querySelector('select') : null;
    value = select ? select.value : undefined;
  } else if (item.type !== 'abutton') {
    value = args[0];
  }
  // a slider and its number box are one setting: record it with the box id
  let menu = gtiz_macros.getMenus()[area] || [];
  if (id.endsWith('-slider') && menu.some(other => other && other.id === id.replace(/-slider$/, ''))) {
    id = id.replace(/-slider$/, '');
  }
  if (item.type === 'number' || item.type === 'slider') {
    value = Number(value);
  }
  if (value !== undefined && (typeof value === 'object' || typeof value === 'function')) {
    value = undefined;
  }
  let step = { area : area, id : id };
  if (value !== undefined) {
    step.value = value;
  }
  let steps = gtiz_macros.recording.steps;
  let last = steps[steps.length - 1];
  if (last && last.area === step.area && last.id === step.id) {
    steps[steps.length - 1] = step;
  } else {
    steps.push(step);
  }
  gtiz_macros.updateRecorder();
};

/**
 * Start a recording: the panel closes and the recorder shows the steps.
 *
 * @returns {undefined}
 */
gtiz_macros.startRecording = function() {
  gtiz_macros.wrapMenus();
  gtiz_macros.recording = { steps : [], paused : false };
  gtiz_macros.closeMacros();
  gtiz_macros.updateRecorder();
};

/**
 * Pause the recording, or resume it: while paused nothing is noted.
 *
 * @returns {undefined}
 */
gtiz_macros.togglePause = function() {
  if (gtiz_macros.recording) {
    gtiz_macros.recording.paused = !gtiz_macros.recording.paused;
    gtiz_macros.updateRecorder();
  }
};

/**
 * Stop the recording and open the save modal, or say that nothing was recorded.
 *
 * @returns {undefined}
 */
gtiz_macros.stopRecording = function() {
  if (!gtiz_macros.recording) {
    return;
  }
  let steps = gtiz_macros.recording.steps;
  gtiz_macros.recording = null;
  gtiz_macros.updateRecorder();
  if (steps.length === 0) {
    let title = '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.please_note;
    let content = document.createElement('p');
    content.innerHTML = gtiz_locales.current.macro_no_steps;
    gtiz_modal.buildNotifier(title, [content]);
    return;
  }
  gtiz_macros.openSaveModal(steps);
};

/**
 * Drop the recording without saving.
 *
 * @returns {undefined}
 */
gtiz_macros.discardRecording = function() {
  gtiz_macros.recording = null;
  gtiz_macros.updateRecorder();
};

/**
 * Round icon button of the recorder.
 *
 * @param {String} cls Class of the button
 * @param {Function} action Click handler
 * @returns {Element} Button
 */
gtiz_macros.buildRecorderButton = function(cls, action) {
  let button = document.createElement('a');
  button.setAttribute('class', 'macro-recorder-action ' + cls);
  let icon = document.createElement('i');
  icon.setAttribute('class', 'tabler');
  button.append(icon);
  button.addEventListener('click', action);
  return button;
};

/**
 * Recorder shown in the quick actions bar while recording: status with the number
 * of steps, pause or resume, stop and discard. Hidden with the `hidden` attribute
 * (the body classes are rewritten by the layout).
 *
 * @returns {Element} Recorder
 */
gtiz_macros.buildRecorder = function() {
  let recorder = document.createElement('div');
  recorder.setAttribute('class', 'macro-recorder');
  recorder.hidden = true;
  let status = document.createElement('span');
  status.setAttribute('class', 'macro-recorder-status');
  let dot = document.createElement('i');
  dot.setAttribute('class', 'tabler tabler-player-record');
  let label = document.createElement('span');
  label.setAttribute('class', 'macro-recorder-label');
  let count = document.createElement('span');
  count.setAttribute('class', 'macro-recorder-count');
  status.append(dot, label, count);
  let actions = document.createElement('span');
  actions.setAttribute('class', 'macro-recorder-actions');
  actions.append(
    gtiz_macros.buildRecorderButton('macro-recorder-pause', () => gtiz_macros.togglePause()),
    gtiz_macros.buildRecorderButton('macro-recorder-stop', () => gtiz_macros.stopRecording()),
    gtiz_macros.buildRecorderButton('macro-recorder-discard', () => gtiz_macros.discardRecording())
  );
  recorder.append(status, actions);
  return recorder;
};

/**
 * Number of steps, singular or plural.
 *
 * @param {Number} count Number of steps
 * @returns {String} Text
 */
gtiz_macros.stepsCount = function(count) {
  let text = count === 1 ? gtiz_locales.current.macro_steps_count_one : gtiz_locales.current.macro_steps_count;
  return text.replace('{0}', count);
};

/**
 * Set icon, tooltip and accessible name of a recorder button.
 *
 * @param {Element} button Button
 * @param {String} icon Tabler icon class
 * @param {String} key Locale key of the tooltip
 * @returns {undefined}
 */
gtiz_macros.setRecorderButton = function(button, icon, key) {
  button.querySelector('i').setAttribute('class', 'tabler ' + icon);
  let text = gtiz_macros.plainText(gtiz_locales.current[key]);
  button.setAttribute('title', text);
  button.setAttribute('aria-label', text);
};

/**
 * Show or hide the recorder and update its texts.
 *
 * @returns {undefined}
 */
gtiz_macros.updateRecorder = function() {
  let recorder = document.querySelector('.macro-recorder');
  if (!recorder) {
    let bar = document.querySelector('.quick-actions .tools-right');
    if (!bar) {
      return;
    }
    recorder = gtiz_macros.buildRecorder();
    bar.prepend(recorder);
  }
  let recording = gtiz_macros.recording;
  recorder.hidden = !recording;
  if (!recording) {
    return;
  }
  recorder.classList.toggle('macro-recorder-paused', recording.paused);
  recorder.querySelector('.macro-recorder-label').innerHTML = recording.paused ? gtiz_locales.current.macro_paused : gtiz_locales.current.macro_recording;
  recorder.querySelector('.macro-recorder-count').innerHTML = ' · ' + gtiz_macros.stepsCount(recording.steps.length);
  gtiz_macros.setRecorderButton(recorder.querySelector('.macro-recorder-pause'), recording.paused ? 'tabler-player-play' : 'tabler-player-pause', recording.paused ? 'macro_resume_recording' : 'macro_pause_recording');
  gtiz_macros.setRecorderButton(recorder.querySelector('.macro-recorder-stop'), 'tabler-player-stop', 'macro_stop_recording');
  gtiz_macros.setRecorderButton(recorder.querySelector('.macro-recorder-discard'), 'tabler-trash', 'macro_discard_recording');
};

/**
 * Text of a localized string that may hold html entities (e.g. &#156;), for
 * attributes and text nodes.
 *
 * @param {String} html Localized string
 * @returns {String} Plain text
 */
gtiz_macros.plainText = function(html) {
  let node = document.createElement('textarea');
  node.innerHTML = html;
  return node.value;
};

/**
 * Escape a text typed by people before it is placed in html.
 *
 * @param {String} text Text
 * @returns {String} Escaped text
 */
gtiz_macros.escapeHtml = function(text) {
  let node = document.createElement('div');
  node.textContent = text === undefined || text === null ? '' : String(text);
  return node.innerHTML;
};

/**
 * Value of a text that may be a string, a function or an object by language.
 *
 * @param {*} value Text
 * @returns {String} Text in the current language
 */
gtiz_macros.localized = function(value) {
  if (typeof value === 'function') {
    return value();
  }
  if (value && typeof value === 'object') {
    return value[gtiz_macros.lang] ? value[gtiz_macros.lang] : value.en;
  }
  return typeof value === 'string' ? value : '';
};

/**
 * Tags of a macro, as html: the tag of a built-in macro, or the label typed for a
 * user macro (escaped), "My macros" when none.
 *
 * @param {Object} macro Macro
 * @returns {Array} Tags
 */
gtiz_macros.tagsHtml = function(macro) {
  if (macro.user) {
    return [macro.label ? gtiz_macros.escapeHtml(macro.label) : gtiz_locales.current.macro_my_macros];
  }
  return [macro.tag ? gtiz_macros.localized(macro.tag.label) : 'No tag provided'];
};

/**
 * All the macros of the panel: the user ones first, then the built-in ones.
 *
 * @returns {Array} Macros
 */
gtiz_macros.getAll = function() {
  return [...gtiz_macros.user_macros, ...gtiz_macros.macros];
};

/**
 * Readable parts of a step: menu or card, name of the option, value, and the
 * option icon when the labels of the options do not tell the values apart.
 *
 * @param {Object} step Step {area, id, value}
 * @returns {Object} {text, icon}
 */
gtiz_macros.stepParts = function(step) {
  let item = gtiz_macros.findItem(step);
  if (!item) {
    return { text : step.area + ' › ' + step.id };
  }
  let place;
  if (step.area.startsWith('settings/')) {
    let card = document.querySelector('.card-settings[data-type="' + step.area.slice(9) + '"] .card-title');
    place = card ? card.textContent.trim() : gtiz_macros.plainText(gtiz_locales.current.settings);
  } else {
    let keys = { tree : 'tree_tools', legend : 'legend_tools', map : 'map_tools', metadata : 'metadata_tools', 'metadata-card' : 'metadata_tools', zooms : 'zooms_tools', 'zooms-filtered' : 'zooms_tools' };
    place = keys[step.area] ? gtiz_macros.plainText(gtiz_locales.current[keys[step.area]]) : '';
  }
  // a number box has no label of its own: the one of its twin slider
  let labelled = item;
  if (!item.label && item.id) {
    let menu = gtiz_macros.getMenus()[step.area] || [];
    labelled = menu.find(other => other && other.id === item.id + '-slider') || item;
  }
  let name = labelled.label ? gtiz_macros.plainText(gtiz_macros.localized(labelled.label)) : '';
  let options = gtiz_macros.getOptions(item);
  let option = options.find(candidate => String(candidate.value) === String(step.value));
  let value_text = '';
  let icon;
  if (option) {
    let label = gtiz_macros.plainText(gtiz_macros.localized(option.label));
    let labels = new Set(options.map(candidate => gtiz_macros.plainText(gtiz_macros.localized(candidate.label))));
    if (labels.size === options.length) {
      // the option names the value: "Aggregate by metadata", "Map: on"
      value_text = name ? label : '';
      name = name || label;
    } else {
      // switches whose options share one label: the icon tells the value
      name = name || label;
      icon = option.icon;
    }
  } else if (step.value !== undefined) {
    value_text = String(step.value);
  }
  return { text : (place ? place + ' › ' : '') + name + (value_text ? ': ' + value_text : ''), icon : icon };
};

/**
 * Readable description of a step, for the save modal.
 *
 * @param {Object} step Step {area, id, value}
 * @returns {Element} Description
 */
gtiz_macros.describeStep = function(step) {
  let parts = gtiz_macros.stepParts(step);
  let node = document.createElement('span');
  node.setAttribute('class', 'macro-step-text');
  node.textContent = parts.text;
  if (parts.icon) {
    let icon = document.createElement('i');
    icon.setAttribute('class', 'tabler ' + parts.icon);
    node.append(' ', icon);
  }
  return node;
};

/**
 * Field of the save modal: label (with an asterisk when required) and control.
 *
 * @param {String} label_key Locale key of the label
 * @param {Element} control Input or textarea
 * @param {Boolean} required True for a required field
 * @returns {Element} Field
 */
gtiz_macros.buildField = function(label_key, control, required) {
  let box = document.createElement('div');
  box.setAttribute('class', 'input-box' + (control.tagName === 'INPUT' ? ' input-box-text' : ' input-box-textarea'));
  let label = document.createElement('div');
  label.setAttribute('class', 'form-label');
  label.innerHTML = gtiz_locales.current[label_key];
  if (required) {
    let mark = document.createElement('span');
    mark.setAttribute('class', 'form-required');
    mark.textContent = ' *';
    label.append(mark);
  }
  box.append(label, control);
  return box;
};

/**
 * Show a warning in the feedback of the modal, below its contents.
 *
 * @param {String} html Message, from the locales
 * @returns {undefined}
 */
gtiz_macros.showModalWarning = function(html) {
  let feedback = document.querySelector('.modal .modal-feedback');
  feedback.innerHTML = '<p><i class="tabler tabler-alert-triangle"></i> ' + html + '</p>';
  feedback.classList.add('show', 'warning');
};

/**
 * Hide the feedback of the modal.
 *
 * @returns {undefined}
 */
gtiz_macros.hideModalWarning = function() {
  let feedback = document.querySelector('.modal .modal-feedback');
  feedback.innerHTML = '';
  feedback.classList.remove('show', 'warning');
};

/**
 * True when another macro has the same title (case and spaces ignored): the user
 * ones but the one being edited, and the built-in ones in every language.
 *
 * @param {String} title Title typed
 * @param {Object} macro Macro being edited (optional)
 * @returns {Boolean} True when the title is taken
 */
gtiz_macros.titleExists = function(title, macro) {
  let key = (text) => gtiz_macros.plainText(String(text)).trim().toLowerCase().replace(/\s+/g, ' ');
  let wanted = key(title);
  let user = gtiz_macros.user_macros.some(other => other !== macro && key(other.title) === wanted);
  let built_in = gtiz_macros.macros.some(other => {
    let titles = other.title && typeof other.title === 'object' ? Object.values(other.title) : [gtiz_macros.localized(other.title)];
    return titles.some(text => key(text) === wanted);
  });
  return user || built_in;
};

/**
 * Labels in use for the suggestions: the most used first. With a text, the labels
 * holding one of its words; at most three, never the text itself.
 *
 * @param {String} text Text of the field
 * @returns {Array} Labels
 */
gtiz_macros.suggestLabels = function(text) {
  let counts = new Map();
  gtiz_macros.user_macros.forEach(macro => {
    if (macro.label) {
      counts.set(macro.label, (counts.get(macro.label) || 0) + 1);
    }
  });
  let typed = String(text || '').trim().toLowerCase();
  let words = typed.split(/\s+/).filter(Boolean);
  return [...counts.entries()]
    .filter(([label]) => label.toLowerCase() !== typed && (words.length === 0 || words.some(word => label.toLowerCase().includes(word))))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([label]) => label);
};

/**
 * Chips below the label field with the labels in use: the most used ones while the
 * field is empty, the ones matching the words typed after. A click fills the field.
 *
 * @param {Element} input Label field
 * @returns {Element} Chips
 */
gtiz_macros.buildLabelSuggestions = function(input) {
  let group = document.createElement('div');
  group.setAttribute('class', 'macro-label-suggestions');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', gtiz_macros.plainText(gtiz_locales.current.macro_label_suggestions));
  let render = () => {
    group.replaceChildren();
    let labels = input.readOnly ? [] : gtiz_macros.suggestLabels(input.value);
    group.hidden = labels.length === 0;
    labels.forEach(text => {
      let chip = document.createElement('div');
      chip.setAttribute('class', 'macros-tag macro-label-suggestion');
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.textContent = text;
      let pick = () => {
        input.value = text;
        render();
        input.focus();
      };
      chip.addEventListener('click', pick);
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      });
      group.append(chip);
    });
  };
  input.addEventListener('input', render);
  render();
  return group;
};

/**
 * Save modal: title (required), description, label and the recorded steps, which
 * can be removed one by one. With a macro of the user, the same modal edits it.
 *
 * @param {Array} steps Recorded steps, or the steps of the macro to edit
 * @param {Object} macro Macro of the user to edit (optional)
 * @returns {undefined}
 */
gtiz_macros.openSaveModal = function(steps, macro) {
  steps = [...steps];
  let form = document.createElement('div');
  form.setAttribute('class', 'modal-form macro-save-form');
  let title = document.createElement('input');
  title.setAttribute('type', 'text');
  title.setAttribute('maxlength', '120');
  title.setAttribute('aria-required', 'true');
  let description = document.createElement('textarea');
  description.setAttribute('maxlength', '1000');
  // low while empty and not focused (see css), as the textareas of the project
  description.setAttribute('placeholder', ' ');
  let label = document.createElement('input');
  label.setAttribute('type', 'text');
  label.setAttribute('maxlength', '60');
  label.setAttribute('placeholder', gtiz_macros.plainText(gtiz_locales.current.macro_my_macros));
  if (macro) {
    title.value = macro.title;
    description.value = macro.description || '';
    label.value = macro.label || '';
  }
  let title_box = gtiz_macros.buildField('macro_title', title, true);
  form.append(title_box, gtiz_macros.buildField('macro_description', description, false), gtiz_macros.buildField('macro_tag', label, false), gtiz_macros.buildLabelSuggestions(label));
  title.addEventListener('input', () => {
    title_box.classList.remove('input-box-error');
    gtiz_macros.hideModalWarning();
  });
  let steps_box = document.createElement('div');
  steps_box.setAttribute('class', 'list-box macro-steps-box');
  let steps_label = document.createElement('div');
  steps_label.setAttribute('class', 'form-label');
  steps_label.innerHTML = gtiz_locales.current.macro_steps;
  let list = document.createElement('ol');
  list.setAttribute('class', 'macro-steps');
  steps_box.append(steps_label, list);
  let render = () => {
    list.replaceChildren();
    steps.forEach((step, index) => {
      let row = document.createElement('li');
      row.setAttribute('class', 'macro-step');
      let text = document.createElement('div');
      text.setAttribute('class', 'macro-step-body');
      text.append(gtiz_macros.describeStep(step));
      let item = gtiz_macros.findItem(step);
      if (item && item.requires_selection) {
        let note = document.createElement('span');
        note.setAttribute('class', 'macro-step-note');
        note.innerHTML = gtiz_locales.current.macro_on_selection;
        text.append(note);
      }
      let remove = document.createElement('a');
      remove.setAttribute('class', 'macro-step-remove');
      remove.setAttribute('title', gtiz_macros.plainText(gtiz_locales.current.macro_remove_step));
      remove.setAttribute('aria-label', gtiz_macros.plainText(gtiz_locales.current.macro_remove_step));
      let remove_icon = document.createElement('i');
      remove_icon.setAttribute('class', 'tabler tabler-trash');
      remove.append(remove_icon);
      remove.addEventListener('click', () => {
        steps.splice(index, 1);
        render();
      });
      row.append(text, remove);
      list.append(row);
    });
  };
  render();
  let actions = document.createElement('div');
  actions.setAttribute('class', 'modal-confirm-actions');
  let save = document.createElement('button');
  let save_icon = document.createElement('i');
  save_icon.setAttribute('class', 'tabler tabler-device-floppy');
  save.append(save_icon, document.createTextNode(' ' + gtiz_macros.plainText(gtiz_locales.current.save)));
  save.addEventListener('click', () => {
    let text = title.value.trim();
    if (!text) {
      // the title may be scrolled out on short screens: bring it into view
      title_box.classList.add('input-box-error');
      gtiz_macros.showModalWarning(gtiz_locales.current.macro_title_required);
      title_box.scrollIntoView({ block : 'center' });
      title.focus({ preventScroll : true });
      return;
    }
    if (gtiz_macros.titleExists(text, macro)) {
      title_box.classList.add('input-box-error');
      gtiz_macros.showModalWarning(gtiz_locales.current.macro_title_exists);
      title_box.scrollIntoView({ block : 'center' });
      title.focus({ preventScroll : true });
      return;
    }
    if (steps.length === 0) {
      gtiz_macros.showModalWarning(gtiz_locales.current.macro_no_steps);
      return;
    }
    let data = {
      title : text,
      description : description.value.trim(),
      label : label.value,
      steps : steps
    };
    let saved = macro ? gtiz_macros.updateUserMacro(macro, data) : gtiz_macros.addUserMacro(data);
    gtiz_macros.refreshPanel();
    let message = macro ? gtiz_locales.current.macro_updated : gtiz_locales.current.macro_saved;
    gtiz_macros.finishModal(form, actions, message.replace('{0}', gtiz_macros.escapeHtml(saved.macro.title)), saved.stored);
  });
  let discard = document.createElement('button');
  discard.setAttribute('class', 'button-tertiary-outline');
  let discard_icon = document.createElement('i');
  discard_icon.setAttribute('class', 'tabler tabler-circle-x');
  discard.append(discard_icon, document.createTextNode(' ' + gtiz_macros.plainText(gtiz_locales.current.discard)));
  discard.addEventListener('click', () => gtiz_modal.closeModal());
  actions.append(save, discard);
  // the library is in the browser: say where the macro is kept and when it is lost
  let note = document.createElement('p');
  note.setAttribute('class', 'macro-storage-note');
  note.innerHTML = '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.macro_storage_note;
  form.append(steps_box, note, actions);
  gtiz_modal.buildModal(macro ? gtiz_locales.current.macro_edit : gtiz_locales.current.macro_save, [form]);
  setTimeout(() => title.focus(), 300);
};

/*
*
* Library of the user macros, kept in the localStorage of the browser under
* `spread-macros` as { version, macros }. What is read back is checked
* (normalizeUserMacro): only well formed macros and steps are kept.
*
*/
gtiz_macros.storage_key = 'spread-macros';

/**
 * A user macro as read from the storage (or from a file), checked: a title, steps
 * with an area, an id and a plain value. Texts are kept as texts, never as html.
 *
 * @param {Object} data Macro read
 * @returns {Object|null} Macro, or null when it is not valid
 */
gtiz_macros.normalizeUserMacro = function(data) {
  if (!data || typeof data !== 'object' || typeof data.title !== 'string' || !data.title.trim() || !Array.isArray(data.steps)) {
    return null;
  }
  let steps = data.steps.filter(step => {
    if (!step || typeof step !== 'object' || typeof step.area !== 'string' || typeof step.id !== 'string') {
      return false;
    }
    return step.value === undefined || ['string', 'number', 'boolean'].includes(typeof step.value);
  }).map(step => {
    let clean = { area : step.area, id : step.id };
    if (step.value !== undefined) {
      clean.value = step.value;
    }
    return clean;
  });
  if (steps.length === 0) {
    return null;
  }
  return {
    type : 'macro',
    user : true,
    id : typeof data.id === 'string' && data.id ? data.id : 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    title : data.title.trim().slice(0, 120),
    description : typeof data.description === 'string' ? data.description.slice(0, 1000) : '',
    // one label; `tags`, a list, came from the first library format
    label : (typeof data.label === 'string' ? data.label : (Array.isArray(data.tags) && typeof data.tags[0] === 'string' ? data.tags[0] : '')).trim().slice(0, 60),
    created : typeof data.created === 'string' ? data.created : new Date().toISOString(),
    updated : typeof data.updated === 'string' ? data.updated : undefined,
    steps : steps
  };
};

/**
 * Read the library of the browser. A missing, unreadable or blocked storage gives
 * an empty library.
 *
 * @returns {Array} User macros
 */
gtiz_macros.readLibrary = function() {
  try {
    let raw = window.localStorage.getItem(gtiz_macros.storage_key);
    let data = raw ? JSON.parse(raw) : null;
    let macros = data && Array.isArray(data.macros) ? data.macros : [];
    return macros.map(macro => gtiz_macros.normalizeUserMacro(macro)).filter(Boolean);
  } catch (error) {
    console.log('Macros library not readable:', error);
    return [];
  }
};

/**
 * Write the library to the browser.
 *
 * @returns {Boolean} False when the browser refused (blocked storage, quota)
 */
gtiz_macros.writeLibrary = function() {
  try {
    window.localStorage.setItem(gtiz_macros.storage_key, JSON.stringify({ version : 1, macros : gtiz_macros.user_macros.map(macro => gtiz_macros.serializeMacro(macro)) }));
    return true;
  } catch (error) {
    console.log('Macros library not saved:', error);
    return false;
  }
};

/**
 * A user macro as stored in the library, in the files and in the complete json.
 *
 * @param {Object} macro Macro of the library
 * @returns {Object} Plain data
 */
gtiz_macros.serializeMacro = function(macro) {
  let data = { id : macro.id, title : macro.title, description : macro.description, label : macro.label, created : macro.created, steps : macro.steps };
  if (macro.updated) {
    data.updated = macro.updated;
  }
  return data;
};

/*
*
* Files of macros: { type: 'spread-macros', version: 1, macros: [...] }, exported
* from the panel (one macro or all) and imported from its menu or by dropping the
* file on the panel. The complete json of SPREAD carries the same object under
* `gtiz_macros`, and its macros join the library when it is loaded.
*
*/

/**
 * Download macros as a file.
 *
 * @param {Array} macros User macros
 * @returns {undefined}
 */
gtiz_macros.exportMacros = function(macros) {
  if (!macros.length) {
    return;
  }
  let text = JSON.stringify({ type : 'spread-macros', version : 1, macros : macros.map(macro => gtiz_macros.serializeMacro(macro)) }, null, 2);
  gtiz_file_handler.saveTextAsFile(text, 'spread_macros' + Date.now() + '.json');
};

/**
 * Add macros read from a file or a session to the library. A macro already there
 * (same id) is skipped; one with the title of another macro gets a number.
 *
 * @param {Array} list Macros read
 * @returns {Object} {imported, present, invalid, stored}
 */
gtiz_macros.addMacros = function(list) {
  let outcome = { imported : 0, present : 0, invalid : 0, stored : true };
  (Array.isArray(list) ? list : []).forEach(data => {
    let macro = gtiz_macros.normalizeUserMacro(data);
    if (!macro) {
      outcome.invalid++;
      return;
    }
    if (gtiz_macros.user_macros.some(other => other.id === macro.id)) {
      outcome.present++;
      return;
    }
    let title = macro.title;
    for (let n = 2; gtiz_macros.titleExists(title); n++) {
      title = macro.title + ' (' + n + ')';
    }
    macro.title = title;
    gtiz_macros.user_macros.push(macro);
    outcome.imported++;
  });
  if (outcome.imported > 0) {
    gtiz_macros.dictionary = null;
    outcome.stored = gtiz_macros.writeLibrary();
  }
  return outcome;
};

/**
 * Macros of a file: a macros file, or a complete json of SPREAD with its macros.
 *
 * @param {String} text Contents of the file
 * @returns {Array|null} Macros, or null when the file is not a macros file
 */
gtiz_macros.readMacrosFile = function(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return null;
  }
  if (data && data.type === 'spread-macros' && Array.isArray(data.macros)) {
    return data.macros;
  }
  if (data && data.gtiz_macros && Array.isArray(data.gtiz_macros.macros)) {
    return data.gtiz_macros.macros;
  }
  return null;
};

/**
 * Import a file of macros and say how it went below the import and export area,
 * which opens for it (as the outcome of a run below its button).
 *
 * @param {File} file File chosen or dropped
 * @returns {undefined}
 */
gtiz_macros.importFile = function(file) {
  if (!file) {
    return;
  }
  file.text().then(text => {
    let list = gtiz_macros.readMacrosFile(text);
    let lines = [];
    if (!list) {
      lines.push({ html : gtiz_locales.current.macro_import_error, warning : true });
    } else {
      let outcome = gtiz_macros.addMacros(list);
      gtiz_macros.refreshPanel();
      lines.push({ html : gtiz_locales.current.macro_import_summary.replace('{0}', outcome.imported).replace('{1}', outcome.present).replace('{2}', outcome.invalid), warning : false });
      if (!outcome.stored) {
        lines.push({ html : gtiz_locales.current.macro_storage_error, warning : true });
      }
    }
    gtiz_macros.toggleTransferArea(true);
    gtiz_macros.showTransferFeedback(lines);
  });
};

/**
 * Outcome of an import below the import and export area: the summary in the text
 * colour with an info icon, the warnings in red.
 *
 * @param {Array} lines Lines {html, warning}; empty to clear
 * @returns {undefined}
 */
gtiz_macros.showTransferFeedback = function(lines) {
  let feedback = document.querySelector('.macros-transfer-feedback');
  if (!feedback) {
    return;
  }
  feedback.replaceChildren();
  lines.forEach(line => {
    let p = document.createElement('p');
    if (line.warning) {
      p.setAttribute('class', 'macros-transfer-warning');
    }
    p.innerHTML = '<i class="tabler ' + (line.warning ? 'tabler-alert-triangle' : 'tabler-info-circle') + '"></i> ' + line.html;
    feedback.append(p);
  });
  feedback.hidden = lines.length === 0;
  gtiz_macros.scrolly.updateNode(document.querySelector('.macros-form'));
};

/**
 * Choose a macros file to import.
 *
 * @returns {undefined}
 */
gtiz_macros.chooseFile = function() {
  let input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', '.json,application/json');
  input.addEventListener('change', () => gtiz_macros.importFile(input.files[0]));
  input.click();
};

/**
 * Macros of a complete json of SPREAD being loaded: the new ones join the library,
 * with a notice.
 *
 * @param {Object} data `gtiz_macros` of the json
 * @returns {undefined}
 */
gtiz_macros.importSession = function(data) {
  let outcome = gtiz_macros.addMacros(data && data.macros);
  if (outcome.imported === 0) {
    return;
  }
  let title = '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.please_note;
  let content = document.createElement('p');
  content.innerHTML = gtiz_locales.current.macro_session_added.replace('{0}', outcome.imported);
  if (outcome.stored) {
    gtiz_modal.buildNotifier(title, [content]);
  } else {
    gtiz_modal.buildNotifier(title, [content], '<p>' + gtiz_locales.current.macro_storage_error + '</p>', 'warning');
  }
};

/**
 * The user macros for the complete json of SPREAD, or undefined when there are none.
 *
 * @returns {Object|undefined} {version, macros}
 */
gtiz_macros.getSessionData = function() {
  if (!gtiz_macros.user_macros.length) {
    return undefined;
  }
  return { version : 1, macros : gtiz_macros.user_macros.map(macro => gtiz_macros.serializeMacro(macro)) };
};

/**
 * Import and export area below the search row: a dashed drop area, which also
 * opens the choice of a file, and, when there are user macros, an export button as
 * a card of the same height.
 *
 * @returns {Element} Area
 */
gtiz_macros.buildTransferArea = function() {
  let area = document.createElement('div');
  area.setAttribute('class', 'macros-transfer');
  area.hidden = true;
  // the drop area is a label, to take the styles of the file inputs of the project
  let button = (tag, cls, icon, action) => {
    let node = document.createElement(tag);
    node.setAttribute('class', cls);
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    let i = document.createElement('i');
    i.setAttribute('class', 'tabler ' + icon);
    let label = document.createElement('span');
    node.append(i, label);
    node.addEventListener('click', action);
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    });
    return node;
  };
  // the drop itself is handled by the panel (bindDrop): a file dropped here imports
  let cards = document.createElement('div');
  cards.setAttribute('class', 'macros-transfer-cards');
  let feedback = document.createElement('div');
  feedback.setAttribute('class', 'macros-transfer-feedback');
  feedback.hidden = true;
  area.append(cards, feedback);
  cards.append(
    button('label', 'input-file input-file-drag macros-transfer-drop', 'tabler-upload', () => gtiz_macros.chooseFile()),
    button('div', 'macros-transfer-export', 'tabler-download', () => gtiz_macros.exportMacros(gtiz_macros.user_macros))
  );
  return area;
};

/**
 * Show or hide the import and export area; export only with user macros.
 *
 * @param {Boolean} show True to show, false to hide, undefined to toggle
 * @returns {undefined}
 */
gtiz_macros.toggleTransferArea = function(show) {
  let area = document.querySelector('.macros-transfer');
  if (!area) {
    return;
  }
  area.hidden = show === undefined ? !area.hidden : !show;
  if (area.hidden) {
    gtiz_macros.showTransferFeedback([]);
  }
  gtiz_macros.updateRecordTrigger();
  gtiz_macros.scrolly.updateNode(document.querySelector('.macros-form'));
};

/**
 * A file can be dropped only on the drop area of the import and export area: it
 * lights up while the file is over it. Anywhere else in the panel and on its veil a
 * dropped file is ignored (the browser would otherwise open it in place of SPREAD).
 *
 * @returns {undefined}
 */
gtiz_macros.bindDrop = function() {
  let has_files = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  let on_area = (e) => e.target && e.target.closest && e.target.closest('.macros-transfer-drop');
  let panel = gtiz_macros.macros_node;
  panel.addEventListener('dragover', (e) => {
    if (!has_files(e)) {
      return;
    }
    e.preventDefault();
    let area = on_area(e);
    e.dataTransfer.dropEffect = area ? 'copy' : 'none';
    document.querySelectorAll('.macros-transfer-drop').forEach(node => node.classList.toggle('macros-transfer-dropping', node === area));
  });
  panel.addEventListener('dragleave', (e) => {
    let area = on_area(e);
    if (area && !area.contains(e.relatedTarget)) {
      area.classList.remove('macros-transfer-dropping');
    }
  });
  panel.addEventListener('drop', (e) => {
    if (!has_files(e)) {
      return;
    }
    e.preventDefault();
    let area = on_area(e);
    if (!area) {
      return;
    }
    area.classList.remove('macros-transfer-dropping');
    gtiz_macros.importFile(e.dataTransfer.files[0]);
  });
};

/**
 * Outcome of an operation of the library inside its modal: the fields become read
 * only, the buttons give way to Close (the user closes the modal) and the feedback
 * of the modal says what happened, or warns that the browser did not keep it.
 *
 * @param {Element} form Form of the modal, or null
 * @param {Element} actions Buttons of the modal
 * @param {String} message Html of the outcome (texts of the user escaped)
 * @param {Boolean} stored False when the browser refused the change
 * @returns {undefined}
 */
gtiz_macros.finishModal = function(form, actions, message, stored) {
  if (form) {
    form.querySelectorAll('input, textarea').forEach(field => {
      field.readOnly = true;
    });
    form.querySelectorAll('.macro-step-remove').forEach(button => button.remove());
    form.classList.add('macro-save-form-done');
  }
  let feedback = document.querySelector('.modal .modal-feedback');
  if (stored) {
    feedback.innerHTML = '<p><i class="tabler tabler-circle-check"></i> ' + message + '</p>';
    feedback.classList.remove('warning');
  } else {
    feedback.innerHTML = '<p><i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.macro_storage_error + '</p>';
    feedback.classList.add('warning');
  }
  feedback.classList.add('show');
  let close = document.createElement('button');
  let close_icon = document.createElement('i');
  close_icon.setAttribute('class', 'tabler tabler-circle-x');
  close.append(close_icon, document.createTextNode(' ' + gtiz_macros.plainText(gtiz_locales.current.close)));
  close.addEventListener('click', () => gtiz_modal.closeModal());
  actions.replaceChildren(close);
  close.focus();
};

/**
 * Add a macro recorded by the user to the library.
 *
 * @param {Object} data {title, description, label, steps}
 * @returns {Object} {macro, stored}
 */
gtiz_macros.addUserMacro = function(data) {
  let macro = gtiz_macros.normalizeUserMacro({
    title : data.title,
    description : data.description,
    label : data.label,
    steps : data.steps
  });
  gtiz_macros.user_macros.unshift(macro);
  // the search dictionary is built once: rebuild it with the new macro
  gtiz_macros.dictionary = null;
  return { macro : macro, stored : gtiz_macros.writeLibrary() };
};

/**
 * Change title, description, label and steps of a user macro.
 *
 * @param {Object} macro Macro of the library
 * @param {Object} data {title, description, label, steps}
 * @returns {Object} {macro, stored}
 */
gtiz_macros.updateUserMacro = function(macro, data) {
  macro.title = data.title;
  macro.description = data.description;
  macro.label = String(data.label || '').trim().slice(0, 60);
  macro.steps = data.steps;
  macro.updated = new Date().toISOString();
  gtiz_macros.dictionary = null;
  return { macro : macro, stored : gtiz_macros.writeLibrary() };
};

/**
 * Ask for confirmation, then delete a user macro from the library.
 *
 * @param {Object} macro Macro of the library
 * @returns {undefined}
 */
gtiz_macros.confirmDeleteMacro = function(macro) {
  let text = document.createElement('p');
  text.innerHTML = gtiz_locales.current.macro_delete_confirm.replace('{0}', gtiz_macros.escapeHtml(macro.title));
  let actions = document.createElement('div');
  actions.setAttribute('class', 'modal-confirm-actions');
  let remove = document.createElement('button');
  remove.setAttribute('class', 'button-danger');
  let remove_icon = document.createElement('i');
  remove_icon.setAttribute('class', 'tabler tabler-trash');
  remove.append(remove_icon, document.createTextNode(' ' + gtiz_macros.plainText(gtiz_locales.current.delete)));
  remove.addEventListener('click', () => {
    gtiz_macros.user_macros = gtiz_macros.user_macros.filter(other => other !== macro);
    gtiz_macros.dictionary = null;
    let stored = gtiz_macros.writeLibrary();
    gtiz_macros.refreshPanel();
    // the panel already shows the macro gone: say something only when the browser
    // did not keep the change
    if (stored) {
      gtiz_modal.closeModal();
      return;
    }
    text.hidden = true;
    gtiz_macros.finishModal(null, actions, '', stored);
  });
  let cancel = document.createElement('button');
  cancel.setAttribute('class', 'button-tertiary-outline');
  let cancel_icon = document.createElement('i');
  cancel_icon.setAttribute('class', 'tabler tabler-circle-x');
  cancel.append(cancel_icon, document.createTextNode(' ' + gtiz_macros.plainText(gtiz_locales.current.cancel)));
  cancel.addEventListener('click', () => gtiz_modal.closeModal());
  actions.append(remove, cancel);
  gtiz_modal.buildModal(gtiz_locales.current.macro_delete, [text, actions]);
};

/**
 * Edit and delete buttons of a user macro in the panel, round icon buttons as the
 * card tools.
 *
 * @param {Object} macro Macro of the library
 * @returns {Element} Buttons
 */
gtiz_macros.buildMacroTools = function(macro) {
  let tools = document.createElement('div');
  tools.setAttribute('class', 'macros-result-tools');
  let tool = (icon, key, action) => {
    let button = document.createElement('div');
    button.setAttribute('class', 'card-context-trigger macros-result-tool');
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    let text = gtiz_macros.plainText(gtiz_locales.current[key]);
    button.setAttribute('title', text);
    button.setAttribute('aria-label', text);
    let i = document.createElement('i');
    i.setAttribute('class', 'tabler ' + icon);
    button.append(i);
    button.addEventListener('click', action);
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    });
    return button;
  };
  tools.append(
    tool('tabler-file-download', 'macro_export', () => gtiz_macros.exportMacros([macro])),
    tool('tabler-pencil', 'macro_edit', () => gtiz_macros.openSaveModal(macro.steps, macro)),
    tool('tabler-trash', 'macro_delete', () => gtiz_macros.confirmDeleteMacro(macro))
  );
  return tools;
};

/**
 * Rebuild the list of the panel when it is open, keeping the current search.
 *
 * @returns {undefined}
 */
gtiz_macros.refreshPanel = function() {
  if (!document.body.classList.contains('show-macros')) {
    return;
  }
  gtiz_macros.search(gtiz_macros.input.value.toLowerCase());
};

/*
*
* Undo of the last run. The run keeps the session before and after it
* (setUndoObjects); undoing loads the one before. The Run button turns into "Undo
* macro" until another macro runs (which replaces the sessions kept). When the
* session changed after the run, undoing would drop those changes too: the user is
* asked first.
*
*/
gtiz_macros.undo_run = null;

/**
 * Run button of a card: Run, or Undo macro after the run of its macro.
 *
 * @param {Element} button Button of the card
 * @param {Object} item Macro of the card
 * @param {Boolean} undo True for the undo mode
 * @returns {undefined}
 */
gtiz_macros.setRunButton = function(button, item, undo) {
  button.dataset.mode = undo ? 'undo' : 'run';
  if (undo) {
    button.innerHTML = '<i class="tabler tabler-arrow-back-up"></i> ' + gtiz_locales.current.macro_undo;
    button.setAttribute('title', gtiz_macros.plainText(gtiz_locales.current.macro_undo_title));
  } else {
    let icon = item.icon ? item.icon : 'tabler-player-track-next';
    button.innerHTML = '<i class="tabler ' + icon + '"></i> ' + gtiz_locales.current.run;
    button.removeAttribute('title');
  }
};

/**
 * The undo is no longer possible: the button of the last run is Run again.
 *
 * @returns {undefined}
 */
gtiz_macros.resetUndo = function() {
  let last = gtiz_macros.undo_run;
  if (!last) {
    return;
  }
  gtiz_macros.undo_run = null;
  gtiz_macros.setRunButton(last.button, last.item, false);
};

/**
 * The session without what changes by itself (node positions, zoom and pan of the
 * view) and without the notes, kept by the undo, as a text to compare.
 *
 * @param {Object} session Complete object of SPREAD
 * @returns {String} Text
 */
gtiz_macros.comparableSession = function(session) {
  let copy = JSON.parse(JSON.stringify(session));
  if (copy.layout_data) {
    delete copy.layout_data.node_positions;
    delete copy.layout_data.scale;
    delete copy.layout_data.translate;
  }
  // the notes stay when a macro is undone: changing them is not a reason to ask
  delete copy.gtiz_notes;
  return JSON.stringify(copy);
};

/**
 * True when the session changed after the last run.
 *
 * @returns {Boolean} True when it changed
 */
gtiz_macros.changedAfterRun = function() {
  let after = gtiz_macros.undo_versions.v1;
  if (!after) {
    return false;
  }
  return gtiz_macros.comparableSession(gtiz_tree.getCompleteGrapeTreeObject()) !== gtiz_macros.comparableSession(after);
};

/**
 * Undo the last run; when the session changed after it, ask first.
 *
 * @returns {undefined}
 */
gtiz_macros.undoRun = function() {
  if (!gtiz_macros.undo_run) {
    return;
  }
  if (!gtiz_macros.changedAfterRun()) {
    gtiz_macros.applyUndo();
    return;
  }
  let text = document.createElement('p');
  text.innerHTML = gtiz_locales.current.macro_undo_confirm;
  let actions = document.createElement('div');
  actions.setAttribute('class', 'modal-confirm-actions');
  let undo = document.createElement('button');
  undo.setAttribute('class', 'button-danger');
  let undo_icon = document.createElement('i');
  undo_icon.setAttribute('class', 'tabler tabler-arrow-back-up');
  undo.append(undo_icon, document.createTextNode(' ' + gtiz_macros.plainText(gtiz_locales.current.macro_undo)));
  undo.addEventListener('click', () => {
    gtiz_modal.closeModal();
    gtiz_macros.applyUndo();
  });
  // the other choice only closes: nothing changes
  let close = document.createElement('button');
  close.setAttribute('class', 'button-tertiary-outline');
  let close_icon = document.createElement('i');
  close_icon.setAttribute('class', 'tabler tabler-circle-x');
  close.append(close_icon, document.createTextNode(' ' + gtiz_macros.plainText(gtiz_locales.current.close)));
  close.addEventListener('click', () => gtiz_modal.closeModal());
  actions.append(undo, close);
  gtiz_modal.buildModal(gtiz_locales.current.macro_undo, [text, actions]);
};

/**
 * Load the session as it was before the last run.
 *
 * @returns {undefined}
 */
gtiz_macros.applyUndo = function() {
  let last = gtiz_macros.undo_run;
  if (!last) {
    return;
  }
  gtiz_macros.resetUndo();
  let feedback = last.card.querySelector('.macros-result-feedback');
  if (feedback) {
    feedback.remove();
  }
  // loading the session rewrites the layout and closes the panel: open it again
  let loaded = gtiz_macros.loadUndoObject(0);
  if (loaded) {
    loaded.then(() => setTimeout(() => gtiz_macros.showMacros(), 300));
  }
};

/**
 * Outcome of a run below the Run button of its card, as the feedback of the modals:
 * the summary in the text colour, the skipped steps with their reason in red. The
 * panel stays open: the changes show in the components behind it.
 *
 * @param {Element} card Card of the macro in the panel
 * @param {Array} results Results of gtiz_macros.run
 * @returns {undefined}
 */
gtiz_macros.showRunFeedback = function(card, results) {
  // only the outcome of the last run: the older ones say nothing any more
  document.querySelectorAll('.macros-result-feedback').forEach(node => {
    if (!card.contains(node)) {
      node.remove();
    }
  });
  let feedback = card.querySelector('.macros-result-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.setAttribute('class', 'macros-result-feedback');
    card.append(feedback);
  }
  feedback.replaceChildren();
  let skipped = results.filter(result => !result.ok);
  let summary = document.createElement('p');
  let applied = results.length - skipped.length;
  let text = skipped.length > 0 ? gtiz_locales.current.macro_run_summary.replace('{0}', applied).replace('{1}', skipped.length) : gtiz_locales.current.macro_run_applied.replace('{0}', applied);
  summary.innerHTML = '<i class="tabler tabler-info-circle"></i> ' + text;
  feedback.append(summary);
  skipped.forEach(result => {
    let step = result.step && typeof result.step === 'object' ? result.step : { area : '?', id : String(result.step) };
    let line = document.createElement('p');
    line.setAttribute('class', 'macros-result-skipped');
    let reason = gtiz_locales.current['macro_skip_' + result.reason] || gtiz_macros.escapeHtml(result.reason);
    line.innerHTML = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_macros.escapeHtml(gtiz_macros.stepParts(step).text) + ': ' + reason;
    feedback.append(line);
  });
  gtiz_macros.scrolly.updateNode(document.querySelector('.macros-form'));
};

/**
 * Build the search engine UI
 * 
 * @param {Object} macros 
 * @param {String} keyword search keyword to highlight
 * @param {String} type search type 'all' || 'label' || 'title' || 'desc'
 */
gtiz_macros.buildUi = function(macros, keyword, type) {
  // the language is settled after this file is loaded (saved preference): read it
  // again, with the texts of the record trigger
  gtiz_macros.lang = gtiz_locales.getActiveLanguageCode();
  gtiz_macros.updateRecordTrigger();
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
        // one chip per tag; user macros hold texts typed by people: escaped, never read as html
        let tags = document.createElement('div');
        tags.setAttribute('class', 'macros-tags');
        gtiz_macros.tagsHtml(item).forEach(html => {
          let tag = document.createElement('div');
          tag.setAttribute('class', 'macros-tag');
          tag.innerHTML = html;
          if (keyword) {
            if (type === 'label' || type === 'all' || !type) {
              // Highlight tag
              tag.innerHTML = gtiz_utils.highlightKeyword(tag.innerHTML, keyword);
            }
          }
          tag.addEventListener('click', function(e) {
            let tag_text = tag.textContent;
            gtiz_macros.input.value = 'label: ' + tag_text;
            gtiz_macros.search('label: ' + tag_text.toLowerCase());
          });
          tags.append(tag);
        });
        result.append(tags);
        let title = document.createElement('h3');
        title.setAttribute('class', 'macros-result-title');
        if (item.title) {
          title.innerHTML = item.user ? gtiz_macros.escapeHtml(item.title) : gtiz_macros.localized(item.title);
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
          description.innerHTML = item.user ? gtiz_macros.escapeHtml(item.description) : gtiz_macros.localized(item.description);
        } else if (item.user) {
          // the description of a user macro is optional
          description.hidden = true;
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
        // the card of the last run keeps its undo when the list is built again
        let undoable = gtiz_macros.undo_run && gtiz_macros.undo_run.item === item;
        gtiz_macros.setRunButton(button, item, undoable);
        if (undoable) {
          gtiz_macros.undo_run.button = button;
          gtiz_macros.undo_run.card = result;
        }
        button.addEventListener('click', function(e) {
          // after a run the button undoes it (see setRunButton)
          if (button.dataset.mode === 'undo') {
            gtiz_macros.undoRun();
            return;
          }
          // the panel stays open: the outcome goes below the button
          if (gtiz_macros.running) {
            return;
          }
          gtiz_macros.resetUndo();
          button.classList.add('disabled');
          // lighter veil while running, so the changes show behind the panel
          gtiz_macros.macros_node.classList.add('macros-running');
          gtiz_macros.run(item.steps).then(results => {
            button.classList.remove('disabled');
            gtiz_macros.macros_node.classList.remove('macros-running');
            gtiz_macros.showRunFeedback(result, results);
            gtiz_macros.setRunButton(button, item, true);
            gtiz_macros.undo_run = { card : result, button : button, item : item };
          });
        });
        button_box.append(button);
        if (item.user) {
          // edit and delete at the top right of the card
          result.classList.add('macros-result-user');
          result.append(gtiz_macros.buildMacroTools(item));
        }
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
    message.innerHTML = '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.missing_tree_alert_macros;
    message_box.append(message);
  }
  container.append(results);
  let scrolly_node = document.querySelector('.macros-form');
  gtiz_macros.scrolly.initNode(scrolly_node);
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
      
      gtiz_macros.buildUi(gtiz_macros.getAll());
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
    gtiz_macros.buildUi(gtiz_macros.getAll());
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
        title = macro.title[gtiz_macros.lang] ? macro.title[gtiz_macros.lang] : macro.title.en;
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
        description = macro.description[gtiz_macros.lang] ? macro.description[gtiz_macros.lang] : macro.description.en;
        break;
      default:
        description = 'Unexpected types for description';
        break;
    }
  
    // Handle tag (user macros: the typed tag or "My macros")
    switch (macro.user ? 'user' : typeof macro.tag.label) {
      case 'user':
        tag = gtiz_macros.tagsHtml(macro).map(html => gtiz_macros.plainText(html)).join(', ');
        break;
      case 'string':
        tag = macro.tag.label;
        break;
      case 'function':
        tag = macro.tag.label();
        break;
      case 'object':
        tag = macro.tag.label[gtiz_macros.lang] ? macro.tag.label[gtiz_macros.lang] : macro.tag.label.en;
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
    case 'label':
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
    gtiz_macros.defineDictionary(gtiz_macros.getAll());
  }

  let type = 'all';

  // `label:` searches the labels (`tag:`, its former name, still works)
  if (keyword.startsWith('label:') || keyword.startsWith('tag:')) {
    type = 'label';
    keyword = keyword.replace(/^(label|tag):\s*/, '');
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

    let macros = gtiz_macros.getAll().filter(item => {
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
            value = item.title[gtiz_macros.lang] ? item.title[gtiz_macros.lang] : item.title.en;
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
    gtiz_macros.buildUi(gtiz_macros.getAll());
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

/**
 * Record trigger on the row of the search field, as the triggers of the cards
 * with a text ("Rec" on the right of the round icon). The menu of the panel (import,
 * export) joins it with the import of the macros.
 *
 * @returns {undefined}
 */
gtiz_macros.buildRecordButton = function() {
  let header = document.querySelector('.macros-header');
  let search = header ? header.querySelector('.search-box') : null;
  if (!search || header.querySelector('.macros-search-row')) {
    return;
  }
  let row = document.createElement('div');
  row.setAttribute('class', 'macros-search-row');
  search.replaceWith(row);
  let tools = document.createElement('div');
  tools.setAttribute('class', 'macros-search-tools');
  let trigger = document.createElement('div');
  trigger.setAttribute('class', 'card-context-trigger macros-rec-trigger');
  trigger.setAttribute('role', 'button');
  trigger.setAttribute('tabindex', '0');
  let icon = document.createElement('i');
  icon.setAttribute('class', 'tabler tabler-player-record');
  let label = document.createElement('span');
  label.setAttribute('data-i18n-key', 'macro_record');
  label.innerHTML = gtiz_locales.current.macro_record;
  trigger.append(icon, label);
  trigger.addEventListener('click', () => gtiz_macros.startRecording());
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      gtiz_macros.startRecording();
    }
  });
  let transfer_trigger = document.createElement('div');
  transfer_trigger.setAttribute('class', 'card-context-trigger macros-transfer-trigger');
  transfer_trigger.setAttribute('role', 'button');
  transfer_trigger.setAttribute('tabindex', '0');
  let transfer_icon = document.createElement('i');
  transfer_icon.setAttribute('class', 'tabler tabler-file-import');
  transfer_trigger.append(transfer_icon);
  transfer_trigger.addEventListener('click', () => gtiz_macros.toggleTransferArea());
  transfer_trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      gtiz_macros.toggleTransferArea();
    }
  });
  // import and export first, Rec on the right
  tools.append(transfer_trigger, trigger);
  row.append(search, tools);
  row.after(gtiz_macros.buildTransferArea());
  gtiz_macros.updateRecordTrigger();
};

/**
 * Tooltip and accessible name of the record trigger, in the current language.
 *
 * @returns {undefined}
 */
gtiz_macros.updateRecordTrigger = function() {
  let trigger = document.querySelector('.macros-rec-trigger');
  if (trigger) {
    let text = gtiz_macros.plainText(gtiz_locales.current.macro_record_title);
    trigger.setAttribute('title', text);
    trigger.setAttribute('aria-label', text);
  }
  let transfer_trigger = document.querySelector('.macros-transfer-trigger');
  if (transfer_trigger) {
    let text = gtiz_macros.plainText(gtiz_locales.current.macro_tools);
    transfer_trigger.setAttribute('title', text);
    transfer_trigger.setAttribute('aria-label', text);
  }
  // texts of the import and export area and of the drop hint, in the current language
  let drop = document.querySelector('.macros-transfer-drop span');
  if (drop) {
    drop.innerHTML = gtiz_locales.current.macro_drop_here;
  }
  let export_all = document.querySelector('.macros-transfer-export');
  if (export_all) {
    // export only with user macros, also after a save or a delete
    export_all.hidden = gtiz_macros.user_macros.length === 0;
    export_all.querySelector('span').innerHTML = gtiz_locales.current.macro_export_short;
    let text = gtiz_macros.plainText(gtiz_locales.current.macro_export_all);
    export_all.setAttribute('title', text);
    export_all.setAttribute('aria-label', text);
  }
};

gtiz_macros.user_macros = gtiz_macros.readLibrary();
// another tab of SPREAD changed the library: read it again
window.addEventListener('storage', (e) => {
  if (e.key === gtiz_macros.storage_key) {
    gtiz_macros.user_macros = gtiz_macros.readLibrary();
    gtiz_macros.dictionary = null;
    gtiz_macros.refreshPanel();
  }
});
gtiz_macros.buildRecordButton();
gtiz_macros.bindDrop();
gtiz_macros.wrapMenus();
gtiz_macros.updateRecorder();
