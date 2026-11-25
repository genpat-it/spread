/* global gtiz_tree, gtiz_metadata, gtiz_legend, gtiz_map, gtiz_settings, gtiz_video, gtiz_layout, gtiz_zooms, gtiz_macros */

import { interpret, splitClauses, matchRows, valueFor, norm as normIntent, similar as similarIntent } from './assistant-intents.js?v=70';
import { buildIndex, matchExamples, proposal, isWeak } from './assistant-examples.js?v=70';

// This bridge derives its catalog from SPREAD's actual menu configuration and
// resolves requests with the deterministic parser in assistant-intents.js.
// Only catalog actions can run; no code is ever evaluated. It works offline.
const UNRESOLVED_KEY = 'spread-assistant-unresolved';
const UNRESOLVED_LIMIT = 500;
// The log of the requests not understood is off (2026-11-23): nothing is written
// in the browser storage. Kept in the code for a future anonymous feedback; set
// to true to write it again.
const UNRESOLVED_LOG = false;
// Keep factual product answers outside the generative path.  Update this
// alongside package.json when SPREAD publishes a new application release.
const SPREAD_VERSION = '1.0.0';
let actionRegistry = new Map();
let pendingActions = [];
let lastProposedActions = [];
// request being answered: its replies get the copy and retry actions
let currentRequest = null;
let requestCount = 0;

/**
 * A text of the assistant module of js/i18n (`assistant`) in the language in
 * use, English when missing, with the placeholders {0}, {1}… filled in order
 *
 * @param {String} path Dot path of the key inside the module, e.g. 'steps.select.add'
 * @param {...*} values Values of the placeholders
 * @returns {String} The text, the path itself when the key does not exist
 */
function say(path, ...values) {
  const code = typeof gtiz_locales !== 'undefined' ? gtiz_locales.getActiveLanguageCode() : 'en';
  const find = (terms) => path.split('.').reduce((node, key) => node?.[key], terms?.assistant);
  const raw = typeof gtiz_languages !== 'undefined' ? (find(gtiz_languages[code]) ?? find(gtiz_languages.en)) : undefined;
  if (typeof raw !== 'string') return path;
  // a single pass, so a value that contains "{1}" is never replaced again
  return raw.replace(/\{(\d+)\}/g, (match, index) => (values[index] !== undefined ? String(values[index]) : match));
}

function labelOf(item) {
  try {
    const label = typeof item.label === 'function' ? item.label() : item.label;
    if (label) return label;
    return (item.id || item.type).replace(/[-_]/g, ' ');
  }
  catch (_) { return item.id || item.type; }
}

function optionsOf(item) {
  try {
    const options = typeof item.options === 'function' ? item.options() : item.options;
    return Array.isArray(options) ? options.map((option) => ({
      value: option.value,
      label: typeof option.label === 'function' ? option.label() : (option.label || option.value)
    })) : [];
  } catch (_) { return []; }
}

function registerMenu(area, menu, invoke) {
  if (!Array.isArray(menu)) return;
  menu.forEach((item, index) => {
    if (item?.hide_in_read_only && gtiz_app.cfg.read_only) return;
    if (item && item.type !== 'separator') actionRegistry.set(`${area}:${index}`, { id: `${area}:${index}`, area, item, invoke });
  });
}

function registerVideoPlayer() {
  if (typeof gtiz_video === 'undefined' || !gtiz_tree.tree || !gtiz_video.getLegendRows().length) return;
  const video = gtiz_video;
  const speedSelector = document.querySelector('.slider-box-player select');
  if (!speedSelector || !video.slider || !video.play_trigger) return;
  const { min, max } = video.slider;
  const controls = [
    ['play', {
      type: 'abutton',
      label: 'Play timeline / Riproduci video / Lire la vidéo',
      function: () => {
        const status = video.cfg.status;
        if (status === 'playing') return;
        if (status === 'finished') video.pause();
        video.play({ currentTarget: video.play_trigger }, status === 'finished' ? 'init' : status);
      }
    }],
    ['pause', {
      type: 'abutton',
      label: 'Pause timeline / Metti in pausa il video / Mettre la vidéo en pause',
      function: () => {
        if (video.cfg.status === 'playing') video.pause();
      }
    }],
    ['speed', {
      type: 'select',
      label: 'Timeline playback speed / Velocità del video / Vitesse de lecture',
      options: video.cfg.speeds,
      function: (value) => {
        if (speedSelector.disabled) throw new Error(say('errors.timeline_speed_paused'));
        speedSelector.value = value;
        speedSelector.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }],
    ['seek', {
      type: 'number',
      label: 'Timeline position (%) / Posizione del video (%) / Position de lecture (%)',
      min: 0,
      max: 100,
      function: (percent) => {
        video.slider.dispatchEvent(new Event('mousedown', { bubbles: true }));
        video.fireSliderEvent(Math.round(Number(min) + (Number(max) - Number(min)) * percent / 100));
      }
    }]
  ];
  for (const [control, item] of controls) {
    const id = 'video-player:' + control;
    actionRegistry.set(id, { id, area: 'video', item });
  }
}

function registerMapViewport() {
  if (typeof gtiz_map === 'undefined' || !gtiz_map.initialized) return;
  const leaflet = window.map;
  if (!leaflet || typeof leaflet.getZoom !== 'function') return;
  const controls = [
    ['zoom', {
      type: 'number',
      label: 'Map zoom factor / Fattore di zoom della mappa / Facteur de zoom de la carte',
      min: 0.1,
      max: 10,
      function: (factor) => leaflet.setZoom(leaflet.getScaleZoom(factor), { animate: false })
    }],
    ['level', {
      type: 'number',
      label: 'Map zoom level / Livello di zoom della mappa / Niveau de zoom de la carte',
      min: leaflet.getMinZoom(),
      max: leaflet.getMaxZoom(),
      function: (level) => leaflet.setZoom(level, { animate: false })
    }],
    ['center', {
      type: 'assistant_map_coordinates',
      label: 'Center map at coordinates / Centra la mappa alle coordinate / Centrer la carte aux coordonnées',
      function: ({ latitude, longitude }) => leaflet.panTo([latitude, longitude], { animate: false })
    }]
  ];
  const markerBounds = window.pointLayer?.getBounds();
  if (markerBounds?.isValid()) controls.push(['fit', {
    type: 'abutton',
    label: 'Fit map to all markers / Inquadra tutti i marcatori / Afficher tous les marqueurs',
    function: () => leaflet.fitBounds(markerBounds, { padding: [21, 21], animate: false })
  }]);
  for (const [control, item] of controls) {
    const id = 'map-view:' + control;
    actionRegistry.set(id, { id, area: 'map', item });
  }
}

const T = (it, en, fr) => () => ({ it, en, fr }[(typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en'] || en);

function metadataRows() {
  const metadata = gtiz_tree?.tree?.metadata || {};
  return Object.entries(metadata)
    .filter(([key, row]) => row && key !== 'CMP' && key !== 'ID' && !key.includes('_hypo') && row.ID !== undefined && !String(row.ID).includes('_hypo'))
    .map(([, row]) => row);
}

function protectedColumns() {
  return ['ID', 'CMP', 'nothing', '__Node', typeof gtiz_file_handler !== 'undefined' ? gtiz_file_handler.samples_column : 'ID'].filter(Boolean);
}

function liveColumns() {
  return Object.keys(gtiz_tree?.tree?.metadata_info || {}).filter((column) => column !== 'nothing' && column !== '__Node');
}

// Replace `{ selected: true }` with the IDs selected right now.
function resolveWhere(where) {
  if (!where) return where;
  if (where.selected) return { ids: gtiz_tree.tree.getAllSelectedNodesIDs().map(String) };
  if (where.all) return { all: where.all.map(resolveWhere) };
  if (where.any) return { any: where.any.map(resolveWhere) };
  return where;
}

function matchingIds(where) {
  const ids = matchRows(metadataRows(), resolveWhere(where)).map((row) => String(row.ID));
  if (!ids.length) throw new Error(say('no_match'));
  return ids;
}

function checkWhere(where, columns) {
  if (!where) return;
  if (typeof where !== 'object' || Array.isArray(where)) throw new Error(say('errors.invalid_condition'));
  if (where.selected) return;
  if (where.all || where.any) {
    const list = where.all || where.any;
    if (!Array.isArray(list) || !list.length) throw new Error(say('errors.invalid_condition'));
    list.forEach((condition) => checkWhere(condition, columns));
    return;
  }
  if (where.ids) {
    if (!Array.isArray(where.ids) || !where.ids.length) throw new Error(say('errors.invalid_condition'));
    return;
  }
  if (!columns.includes(where.column)) throw new Error(say('errors.unknown_column', where.column));
  if (!['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'empty', 'notempty', 'in'].includes(where.op)) throw new Error(say('errors.invalid_operator'));
  if (where.op === 'in' && (!Array.isArray(where.value) || !where.value.length)) throw new Error(say('errors.invalid_condition'));
}

function checkCell(value, { name = false } = {}) {
  const text = String(value ?? '');
  if (/[\t\r\n]/.test(text)) throw new Error(say('errors.no_line_breaks'));
  // The metadata reader switches to comma-separated parsing when the header
  // contains a comma, so a column name must never contain one.
  if (name && (!text.trim() || /[,]/.test(text) || Object.hasOwn(Object.prototype, text) || text === 'prototype')) throw new Error(say('errors.invalid_column_name', text));
  return text;
}

function reloadMetadata(tsv, category) {
  gtiz_metadata.loadMetadata(tsv);
  if (category && gtiz_metadata.color_by_defined_category == 'color' && typeof gtiz_legend !== 'undefined') gtiz_legend.changeCategoryColor(category);
}

// Serialise the (already mutated) metadata object without changing it.
function serialiseMetadata(metadata) { return gtiz_metadata.updateMetadata('remove', metadata, [], []); }

function registerDataOperations(readOnly) {
  const operations = [
    ['metadata-add-column', T('Aggiungi colonna metadati', 'Add metadata column', 'Ajouter une colonne de métadonnées'), (value, virtual) => {
      const column = checkCell(value?.column, { name: true });
      if ([...liveColumns(), ...protectedColumns()].some((existing) => existing === column) && !virtual) throw new Error(say('errors.column_exists', column));
      checkWhere(value.where, [...liveColumns(), ...(virtual || [])]);
      return { column, value: checkCell(value.value), where: value.where, otherValue: checkCell(value.otherValue ?? '') };
    }, ({ column, value, where, otherValue }) => {
      const metadata = gtiz_tree.tree.metadata;
      const ids = where ? matchingIds(where) : [];
      reloadMetadata(gtiz_metadata.updateMetadata('add', metadata, ids, column, value, where ? (otherValue || '\u0000') : undefined).replace(/\u0000/g, ''), column);
    }],
    ['metadata-set', T('Imposta valori metadati', 'Set metadata values', 'Définir des valeurs de métadonnées'), (value, virtual) => {
      const columns = [...liveColumns(), ...(virtual || [])];
      if (!columns.includes(value?.column) || protectedColumns().includes(value.column)) throw new Error(say('errors.column_not_editable', value?.column));
      checkWhere(value.where, columns);
      return { column: value.column, value: checkCell(value.value), where: value.where };
    }, ({ column, value, where }) => {
      const metadata = gtiz_tree.tree.metadata;
      const ids = where ? matchingIds(where) : [];
      reloadMetadata(gtiz_metadata.updateMetadata('edit', metadata, ids, column, value), column);
    }],
    ['metadata-rename-column', T('Rinomina colonna metadati', 'Rename metadata column', 'Renommer une colonne de métadonnées'), (value, virtual) => {
      const columns = [...liveColumns(), ...(virtual || [])];
      if (!columns.includes(value?.from) || protectedColumns().includes(value.from)) throw new Error(say('errors.column_not_renamable', value?.from));
      const to = checkCell(value.to, { name: true });
      if (liveColumns().includes(to) || protectedColumns().includes(to)) throw new Error(say('errors.column_exists', to));
      return { from: value.from, to };
    }, ({ from, to }) => {
      const metadata = gtiz_tree.tree.metadata;
      for (const key of Object.keys(metadata)) {
        const row = metadata[key];
        if (!row || typeof row !== 'object' || !Object.hasOwn(row, from)) continue;
        metadata[key] = Object.fromEntries(Object.entries(row).map(([name, cell]) => [name === from ? to : name, cell]));
      }
      if (gtiz_tree.tree.display_category === from) gtiz_tree.tree.display_category = to;
      reloadMetadata(serialiseMetadata(metadata), to);
    }],
    ['metadata-delete-column', T('Elimina colonna metadati', 'Delete metadata column', 'Supprimer une colonne de métadonnées'), (value, virtual) => {
      const columns = [...liveColumns(), ...(virtual || [])];
      if (!columns.includes(value?.column) || protectedColumns().includes(value.column)) throw new Error(say('errors.column_not_deletable', value?.column));
      return { column: value.column };
    }, ({ column }) => {
      if (gtiz_tree.tree.display_category === column) gtiz_tree.tree.display_category = '';
      reloadMetadata(gtiz_metadata.updateMetadata('remove', gtiz_tree.tree.metadata, [], column));
    }],
    ['select', T('Seleziona campioni', 'Select samples', 'Sélectionner des échantillons'), (value, virtual) => {
      if (!['replace', 'add', 'remove', 'all', 'clear'].includes(value?.mode)) throw new Error(say('errors.invalid_selection_mode'));
      if (['replace', 'add', 'remove'].includes(value.mode)) {
        if (!value.where) throw new Error(say('errors.missing_condition'));
        checkWhere(value.where, [...liveColumns(), ...(virtual || [])]);
      }
      return { mode: value.mode, where: value.where };
    }, ({ mode, where }) => {
      const tree = gtiz_tree.tree;
      if (mode === 'all') return tree.selectAll();
      if (mode === 'clear') return tree.clearSelection();
      const ids = matchingIds(where);
      if (mode === 'replace') {
        tree.clearSelection();
        tree.selectNodesByIds(ids);
      } else if (mode === 'add') tree.selectNodesByIds(ids);
      else tree.unselectNodesByIds(ids);
    }]
  ];
  operations.push(['metadata-sort', T('Ordina tabella metadati', 'Sort metadata table', 'Trier le tableau de métadonnées'), (value) => {
    if (![...liveColumns(), 'ID'].includes(value?.column)) throw new Error(say('errors.unknown_column', value?.column));
    if (!['asc', 'desc'].includes(value.direction)) throw new Error(say('errors.invalid_direction'));
    return { column: value.column, direction: value.direction };
  }, ({ column, direction }) => {
    const toggle = document.querySelector('.quick-actions .toggle-box[data-view="metadata"]');
    if (toggle && toggle.getAttribute('data-selection') !== 'on') toggle.click();
    gtiz_metadata.options.columnApi.applyColumnState({ state: [{ colId: column, sort: direction }], defaultState: { sort: null } });
  }]);
  operations.push(['language', T('Cambia lingua (ricarica la pagina, le modifiche non salvate si perdono)', 'Change language (reloads the page; unsaved changes are lost)', 'Changer de langue (recharge la page ; les modifications non enregistrées sont perdues)'), (value) => {
    const codes = (typeof gtiz_locales !== 'undefined' ? gtiz_locales.languages.map((language) => language.code) : ['it', 'en', 'fr']);
    if (!codes.includes(value)) throw new Error(say('errors.unknown_language', value));
    return value;
  }, (code) => gtiz_locales.changeLanguage(code)]);
  for (const [name, label, check, run] of operations) {
    if (readOnly && !['select', 'metadata-sort', 'language'].includes(name)) continue;
    const id = `assistant:${name}`;
    actionRegistry.set(id, { id, area: name === 'select' ? 'tree' : 'metadata', item: { id: `assistant-${name}`, type: `assistant_${name.replace(/-/g, '_')}`, label, check, function: run } });
  }
}

// The node shape card is a grid built by js/node-shape.js, not a menu: register
// its operations as typed actions, with SPREAD's own labels (Geometry, Border,
// shape and border names) so they resolve in it/en/fr. Shapes and borders apply
// to the nodes selected when the step runs, so a plan can select first.
function registerNodeShape() {
  if (typeof D3MSTreeNodeStyles === 'undefined' || typeof gtiz_node_styles === 'undefined' || !gtiz_tree.tree || typeof gtiz_tree.setSelectedNodesStyle !== 'function') return;
  const styles = D3MSTreeNodeStyles;
  const options = (kind) => styles[kind].map((value) => ({ value, label: () => gtiz_locales.current[`${kind === 'shapes' ? 'shape' : 'border'}_${value}`] }));
  const kindOf = (value) => (styles.shapes.includes(value) ? 'shapes' : 'borders');
  const applyToSelected = (kind) => (value) => {
    if (!gtiz_tree.tree.getSelectedNodeIDs().length) throw new Error(stripTags(gtiz_locales.current.select_nodes_in_tree));
    gtiz_tree.setSelectedNodesStyle(kind, value);
  };
  const controls = [
    ['geometry', { id: 'node-shape-geometry', type: 'select', label: () => gtiz_locales.current.node_shapes, options: options('shapes'), function: applyToSelected('shapes') }],
    ['border', { id: 'node-shape-border', type: 'select', label: () => gtiz_locales.current.node_borders, options: options('borders'), function: applyToSelected('borders') }],
    ['select', {
      id: 'node-shape-select',
      type: 'select',
      label: T('Seleziona per stile', 'Select by style', 'Sélectionner par style'),
      options: [...options('shapes'), ...options('borders')],
      // replace the selection with the drawn nodes that have the value (the
      // button of the card also deselects them; a request always selects)
      function: (value) => {
        const kind = kindOf(value);
        const ids = gtiz_node_styles.getDrawnNodes().filter((node) => gtiz_node_styles.getValue(node, kind) === value).map((node) => node.id);
        if (!ids.length) throw new Error(say('no_match'));
        gtiz_tree.tree.replaceSelectionByIds(ids);
      }
    }],
    ['reset', { id: 'node-shape-reset', type: 'abutton', label: () => gtiz_locales.current.reset_nodes_style, function: () => gtiz_tree.resetNodesStyle() }]
  ];
  for (const [control, item] of controls) {
    const id = 'settings/node-shape:' + control;
    actionRegistry.set(id, { id, area: 'settings/node-shape', item });
  }
}

// The macros of the macros panel (js/macros.js), built-in and recorded by the user,
// one library shared with the panel: ids `macro:<user macro id>` or `macro:builtin-<n>`,
// stable when the list changes. A macro runs its steps with the macro engine; the
// plan waits for it (see confirm) and reports the skipped steps.
let lastMacroRun = null;

function macroId(macro) {
  return macro.user ? `macro:${macro.id}` : `macro:builtin-${gtiz_macros.macros.indexOf(macro)}`;
}

function macroTitle(macro) {
  return macro.user ? macro.title : stripTags(gtiz_macros.localized(macro.title));
}

function registerMacros() {
  if (typeof gtiz_macros === 'undefined' || typeof gtiz_macros.getAll !== 'function') return;
  gtiz_macros.getAll().forEach((macro) => {
    const id = macroId(macro);
    const item = {
      type: 'macro',
      label: () => macroTitle(macro),
      function: () => { lastMacroRun = gtiz_macros.run(macro.steps); }
    };
    actionRegistry.set(id, { id, area: 'macro', item, macro });
  });
}

// An action of the assistant as a step of the macros panel ({ area, id, value }):
// only the options of menus, settings cards and panels are steps; the typed
// operations of the assistant (selection by condition, metadata edits, node
// colour, zoom, map view, timeline player) and the macros themselves are not.
function macroStep(action) {
  const entry = actionRegistry.get(action.id);
  if (!entry || entry.area === 'macro' || String(entry.id).startsWith('assistant:') || ['map-view', 'video-player'].includes(String(entry.id).split(':')[0])) return null;
  const { area, item } = entry;
  let id = area === 'layout' ? item.type : item.id;
  if (!id || item.macro === false) return null;
  // a slider and its number box are one setting: the step names the box
  if (id.endsWith('-slider')) id = id.replace(/-slider$/, '');
  const step = { area, id };
  if (action.value !== undefined && action.value !== null && typeof action.value !== 'object') step.value = action.value;
  return step;
}

// Steps of a macro from actions of the assistant, with the actions left out.
function macroSteps(actions) {
  const steps = [];
  const kept = [];
  const skipped = [];
  actions.forEach((action) => {
    const step = macroStep(action);
    if (step) {
      steps.push(step);
      kept.push(action);
    } else skipped.push(action);
  });
  return { steps, kept, skipped };
}

function refreshRegistry() {
  actionRegistry = new Map();
  if (typeof gtiz_tree !== 'undefined') {
    registerMenu('tree', gtiz_tree.context_menu);
    // Tree viewport zoom is implemented by D3BaseTree rather than a settings
    // menu.  Register it as a first-class, bounded action so it has the same
    // validation and confirmation path as every menu option.
    if (gtiz_tree.tree && typeof gtiz_tree.tree.setScale === 'function') {
      const item = {
        id: 'assistant-tree-zoom',
        type: 'number',
        label: () => ({ it: 'Zoom albero (fattore)', en: 'Tree zoom (factor)', fr: 'Zoom de l’arbre (facteur)' }[(typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en']),
        min: 0.1,
        max: 10,
        function: (factor) => gtiz_tree.tree.setScale(Number(factor), true)
      };
      actionRegistry.set('assistant:tree-zoom', { id: 'assistant:tree-zoom', area: 'tree', item });
    }
    if (gtiz_tree.tree && typeof gtiz_tree.tree.setColour === 'function' && typeof gtiz_tree.tree.changeCategory === 'function') {
      const item = {
        id: 'assistant-node-colour',
        type: 'assistant_node_colour',
        label: () => ({ it: 'Imposta colore', en: 'Set colour', fr: 'Définir la couleur' }[(typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en']),
        function: ({ category, id, colour }) => {
          gtiz_tree.tree.setColour(category, id, colour);
          gtiz_tree.tree.changeCategory(category);
          if (typeof gtiz_legend !== 'undefined') {
            if (gtiz_legend.selection_mode === 'visual') {
              gtiz_legend.resetVisualSelection();
              gtiz_legend.highlightSelection();
            } else gtiz_legend.resetQualitativeSelection();
          }
        }
      };
      actionRegistry.set('assistant:node-colour', { id: 'assistant:node-colour', area: 'tree', item });
    }
  }
  if (typeof gtiz_metadata !== 'undefined') {
    registerMenu('metadata', gtiz_metadata.context_menu);
    registerMenu('metadata-card', gtiz_metadata.card_menu);
    // Updating an entire existing metadata column is a native metadata
    // operation, but it needs two fields (column and replacement value) and
    // therefore is not representable by the one-value context-menu schema.
    // Keep it typed and bounded instead of sending free-form code to SPREAD.
    if (!gtiz_app.cfg.read_only && gtiz_tree.tree && typeof gtiz_metadata.updateMetadata === 'function' && typeof gtiz_metadata.loadMetadata === 'function') {
      const item = {
        id: 'assistant-metadata-replace-all',
        type: 'assistant_metadata_replace_all',
        label: () => ({ it: 'Sostituisci tutti i valori di una colonna metadati', en: 'Replace all values in a metadata column', fr: 'Remplacer toutes les valeurs d’une colonne de métadonnées' }[(typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en']),
        function: ({ category, value }) => {
          const metadata = gtiz_tree.tree.metadata;
          const tsv = gtiz_metadata.updateMetadata('edit', metadata, [], category, value);
          gtiz_metadata.loadMetadata(tsv);
        }
      };
      actionRegistry.set('assistant:metadata-replace-all', { id: 'assistant:metadata-replace-all', area: 'metadata', item });
    }
    if (gtiz_tree.tree && typeof gtiz_metadata.updateMetadata === 'function') registerDataOperations(Boolean(gtiz_app.cfg.read_only));
  }
  if (typeof gtiz_legend !== 'undefined') registerMenu('legend', gtiz_legend.context_menu);
  if (typeof gtiz_map !== 'undefined') registerMenu('map', gtiz_map.context_menu);
  registerMapViewport();
  if (typeof gtiz_video !== 'undefined') registerMenu('video', gtiz_video.context_menu);
  registerVideoPlayer();
  if (typeof gtiz_zooms !== 'undefined') {
    registerMenu('zooms', gtiz_zooms.context_menu);
    registerMenu('zooms-filtered', gtiz_zooms.filtered_context_menu);
  }
  if (typeof gtiz_layout !== 'undefined') {
    // Layout state is deliberately coupled to the quick-action toggle DOM:
    // its click handler updates data-selection before rebuilding CSS classes.
    // Calling toggleView directly changes only the object and leaves panels
    // invisible, so the assistant must take the exact same route as the UI.
    registerMenu('layout', gtiz_layout.cfg, (item, value) => {
      const toggle = document.querySelector(`.quick-actions .toggle-box[data-view="${item.type}"]`);
      if (toggle && toggle.getAttribute('data-selection') !== value) toggle.click();
      else item.function(item.type, value);
    });
  }
  if (typeof gtiz_settings !== 'undefined') gtiz_settings.cfg.forEach((card) => registerMenu(`settings/${card.card}`, card.menu));
  registerNodeShape();
  registerFullScreen();
  registerTopbarPanels();
  registerMacros();
}

/**
 * The full screen of the whole page, a tool of the top bar (no more a toggle of
 * the components row): registered as an on/off action of its own, as the
 * button does (gtiz_layout.toggleFullScreen), only when the state changes
 *
 * @returns {undefined}
 */
function registerFullScreen() {
  if (typeof gtiz_layout === 'undefined' || typeof gtiz_layout.toggleFullScreen !== 'function') return;
  const label = () => gtiz_locales.current.fullscreen;
  const id = 'topbar:full-screen';
  actionRegistry.set(id, {
    id,
    area: 'topbar',
    item: {
      id: 'tool-fullscreen',
      type: 'toggle',
      label,
      options: [{ value: 'on', label }, { value: 'off', label }],
      selected: () => gtiz_layout.fullscreen,
      function: (value) => { if (value !== gtiz_layout.fullscreen) gtiz_layout.toggleFullScreen(); }
    }
  });
}

/**
 * The panels of the top bar (search functions, macros, notes, language, the
 * info of the footer) as on/off actions, and the recorder of the macros panel
 * (its Rec button) as an action: ids of their own, as the full screen, so the
 * order of the top bar does not matter
 *
 * @returns {undefined}
 */
function registerTopbarPanels() {
  const body = document.body;
  const texts = () => gtiz_locales.current;
  const panels = [];
  if (typeof gtiz_search !== 'undefined') {
    panels.push({ id: 'search', iid: 'tool-search', label: () => texts().search_functions, open: () => body.classList.contains('show-search-engine'), show: () => gtiz_search.toggleSearchEngine(), close: () => gtiz_search.toggleSearchEngine() });
  }
  if (typeof gtiz_macros !== 'undefined') {
    panels.push({ id: 'macros', iid: 'tool-macros', label: () => texts().macros, open: () => body.classList.contains('show-macros'), show: () => gtiz_macros.showMacros(), close: () => gtiz_macros.closeMacros() });
  }
  if (typeof gtiz_notes !== 'undefined') {
    panels.push({ id: 'notes', iid: 'tool-notes', label: () => texts().notes, open: () => body.classList.contains('show-notes'), show: () => gtiz_notes.showNotes(), close: () => gtiz_notes.closeNotes() });
  }
  if (typeof gtiz_locales.showLanguages === 'function') {
    panels.push({ id: 'language', iid: 'tool-lang', label: () => texts().change_language, open: () => body.classList.contains('show-languages'), show: () => gtiz_locales.showLanguages(), close: () => gtiz_locales.closeLanguages() });
  }
  if (typeof gtiz_footer !== 'undefined') {
    const footer = () => document.querySelector('footer');
    panels.push({ id: 'info', iid: 'tool-info', label: () => texts().help, open: () => !!footer()?.classList.contains('show'), show: () => gtiz_footer.showFooter(), close: () => gtiz_footer.showFooter() });
  }
  panels.forEach((panel) => {
    const id = `topbar:${panel.id}`;
    actionRegistry.set(id, {
      id,
      area: 'topbar',
      item: {
        id: panel.iid,
        type: 'toggle',
        label: panel.label,
        options: [{ value: 'on', label: panel.label }, { value: 'off', label: panel.label }],
        selected: () => (panel.open() ? 'on' : 'off'),
        // only when the state changes, as the buttons of the top bar do
        function: (value) => {
          if ((value === 'on') === panel.open()) return;
          if (value === 'on') panel.show();
          else panel.close();
        }
      }
    });
  });
  if (typeof gtiz_macros !== 'undefined' && typeof gtiz_macros.startRecording === 'function') {
    const id = 'topbar:macro-record';
    actionRegistry.set(id, {
      id,
      area: 'topbar',
      item: { id: 'tool-macro-record', type: 'abutton', label: () => texts().macro_record_title, function: () => gtiz_macros.startRecording() }
    });
  }
}

// Extra words people use for SPREAD options, in Italian, English and French.
// Keys are menu item ids, `opt:<first option value>` for id-less toggles,
// `layout:<panel>` for layout toggles, or the English label of a button.
const SYNONYMS = {
  'opt:show_tooltips': ['tooltip', 'tooltips', 'suggerimenti', 'info al passaggio', 'hover', 'popup', 'infobulles'],
  'opt:show_hypo': ['nodi ipotetici', 'ipotetici', 'hypothetical nodes', 'hypothetical', 'hypo', 'noeuds hypothetiques', 'hypothetiques'],
  'metadata-show-hypo': ['nodi ipotetici tabella', 'ipotetici', 'hypothetical', 'hypo', 'hypothetiques'],
  'metadata-selected-only': ['tabella solo selezionati', 'righe selezionate', 'only selected rows', 'selected rows', 'lignes selectionnees', 'filtra tabella'],
  'legend-menu-selection-mode': ['modalita selezione legenda', 'selection mode', 'mode de selection'],
  'legend-menu-view-mode': ['vista legenda', 'legend view', 'visualizzazione legenda', 'affichage legende'],
  'map-aggregation-toggle': ['aggregazione', 'aggrega', 'aggregation', 'aggregate', 'raggruppa marcatori', 'regroupement'],
  'map-delta-select': ['delta', 'precisione', 'precision', 'decimali', 'decimals', 'cifre', 'aggregazione geografica'],
  'map-reset-delta': ['ripristina delta', 'reset delta'],
  'map-marker-mode-toggle': ['marcatori', 'marker', 'markers', 'modalita marcatori', 'marker mode', 'marqueurs', 'visualizzazione mappa'],
  'map-point-min-radius': ['raggio minimo', 'min radius', 'minimum radius', 'rayon minimum', 'marcatori minimi'],
  'map-point-max-radius': ['raggio massimo', 'max radius', 'maximum radius', 'rayon maximum', 'marcatori massimi'],
  'map-reset-max-min-radius': ['ripristina raggio', 'reset radius'],
  'zooms-menu-selection-alerts': ['avvisi selezione', 'selection alerts', 'alert', 'avvisi', 'alertes'],
  'zooms-menu-current-settings': ['impostazioni correnti', 'current settings', 'impostazioni attuali', 'reglages actuels'],
  'layout:settings': ['impostazioni', 'settings', 'opzioni', 'parametri', 'parametres', 'reglages', 'pannello impostazioni'],
  'layout:map': ['mappa', 'map', 'carte', 'gis', 'cartina'],
  'layout:metadata': ['metadati', 'metadata', 'tabella', 'table', 'metadonnees', 'tableau', 'griglia'],
  'layout:legend': ['legenda', 'legend', 'legende'],
  'tool-fullscreen': ['schermo intero', 'tutto schermo', 'full screen', 'fullscreen', 'plein ecran'],
  // panels of the top bar and the recorder of the macros (registerTopbarPanels)
  'tool-search': ['cerca funzioni', 'cerca una funzione', 'ricerca funzioni', 'search functions', 'search a function', 'find a function', 'recherche de fonctions', 'chercher une fonction'],
  'tool-macros': ['macro', 'pannello macro', 'pannello delle macro', 'macros', 'macros panel', 'panneau des macros'],
  'tool-notes': ['note', 'pannello note', 'pannello delle note', 'annotazioni', 'notes', 'notes panel', 'annotations', 'panneau des notes'],
  'tool-lang': ['lingua', 'pannello lingua', 'cambia lingua', 'language', 'language panel', 'langue', 'changer de langue'],
  'tool-info': ['informazioni', 'info', 'crediti', 'contatti', 'information', 'credits', 'contacts', 'informations'],
  'tool-macro-record': ['registra macro', 'registra una macro', 'registratore', 'registrazione', 'avvia registrazione', 'inizia registrazione', 'rec', 'record macro', 'record a macro', 'recorder', 'start recording', 'enregistrer une macro', 'enregistreur', 'demarrer l enregistrement'],
  // the video player is an item of the legend menu (no longer a layout toggle)
  'legend-menu-player': ['video', 'timeline', 'linea temporale', 'timelapse', 'filmato', 'player'],
  'tree-metadata-select': ['colora per', 'color by', 'colour by', 'colorer par', 'colori per'],
  'legend-menu-color-by': ['colora per', 'color by', 'colour by', 'colorer par'],
  'tree-show-node-labels': ['etichette nodi', 'etichette dei nodi', 'node labels', 'labels', 'etichette', 'nomi dei nodi', 'etiquettes des noeuds', 'etiquettes'],
  'tree-node-label-text': ['testo etichette', 'label text', 'etichetta per', 'usa come etichetta', 'label by', 'etichette con', 'texte des etiquettes'],
  'tree-node-label-font-size': ['dimensione font etichette', 'font etichette nodi', 'grandezza testo etichette', 'dimensione testo nodi', 'node label font size', 'label size', 'taille police etiquettes'],
  'tree-highlight-labels': ['evidenzia etichetta', 'evidenzia', 'highlight', 'cerca', 'trova', 'search', 'find', 'surligner', 'chercher'],
  'tree-show-individual-segments': ['segmenti individuali', 'individual segments', 'segmenti', 'spicchi', 'pie segments', 'segments'],
  'tree-node-radius-size': ['nodi piu grandi', 'nodi piu piccoli', 'nodi grandi', 'nodi piccoli', 'bigger nodes', 'smaller nodes', 'larger nodes', 'dimensione nodi', 'grandezza nodi', 'raggio nodi', 'node size', 'node radius', 'nodes size', 'taille des noeuds', 'nodi'],
  'tree-node-kurtosis': ['curtosi', 'kurtosis', 'kurtosi', 'kurtose'],
  'tree-show-branch-labels': ['etichette rami', 'etichette dei rami', 'branch labels', 'distanze sui rami', 'etiquettes des branches'],
  'tree-branch-label-font-size': ['font etichette rami', 'dimensione testo rami', 'branch label font size', 'branch font', 'taille police branches'],
  'tree-branch-scaling': ['scala rami', 'scaling rami', 'lunghezza rami', 'branch scaling', 'branch length scale', 'allunga rami', 'echelle des branches', 'rami'],
  'tree-collapse-branches': ['collassa rami', 'collapse branches', 'collassa sotto', 'soglia collasso', 'raggruppa nodi entro', 'collapse threshold', 'replier les branches', 'collassa a distanza', 'collassa'],
  'tree-branch-toggle-log-scale': ['scala logaritmica', 'logaritmica', 'log scale', 'logarithmic', 'log', 'echelle logarithmique'],
  'tree-branch-length': ['taglia rami', 'rami piu lunghi di', 'cutoff', 'cut off', 'soglia rami lunghi', 'long branches', 'branches longues', 'rami lunghi'],
  'tree-branch-length-method': ['metodo rami lunghi', 'long branch method', 'rami lunghi', 'long branches', 'branches longues'],
  'tree-rendering-toggle': ['rendering', 'disegno', 'modalita rendering', 'layout albero', 'rendu', 'disposizione'],
  'tree-rendering-dynamic-selected-only': ['rendering dinamico solo selezionati', 'dynamic selected only', 'dinamico selezionati'],
  'tree-rendering-static-real-branch-length': ['lunghezza reale rami', 'real branch length', 'lunghezze reali', 'longueur reelle'],
  'legend-menu-maximum-group-number': ['numero massimo gruppi', 'massimo gruppi', 'max groups', 'maximum groups', 'nombre maximum de groupes'],
  'legend-menu-minimum-group-size': ['dimensione minima gruppo', 'minimum group size', 'min group size', 'taille minimale groupe'],
  'legend-menu-data-category': ['tipo dati', 'data type', 'categoria dati', 'type de donnees', 'tipo colonna'],
  'legend-menu-group-order': ['ordine gruppi', 'ordina gruppi', 'group order', 'sort groups', 'ordre des groupes', 'ordina legenda', 'ordina'],
  'legend-menu-color-scheme': ['schema colori', 'palette', 'colour scheme', 'color scheme', 'tavolozza', 'schema de couleurs', 'colori'],
  'legend-menu-quick-gradient': ['gradiente rapido', 'quick gradient', 'degrade rapide'],
  'legend-menu-select-all': ['seleziona tutti i gruppi', 'select all groups'],
  'legend-menu-invert-selection': ['inverti selezione', 'invert selection', 'inverser la selection'],
  'legend-menu-clean-selection': ['pulisci selezione legenda', 'clear legend selection'],
  'metadata-export-button': ['scarica tabella', 'download table', 'esporta tabella', 'export table', 'esporta metadati', 'scarica metadati', 'export metadata', 'download metadata', 'telecharger tableau', 'exporter tableau', 'exporter metadonnees', 'telecharger metadonnees'],
  'zooms-menu-zoom-type': ['tipo zoom', 'zoom type', 'reportree'],
  'zooms-menu-load-zoomed-tree': ['carica cluster', 'load cluster', 'apri cluster'],
  'zooms-menu-open-zoomed-tree': ['apri cluster in nuova scheda', 'new tab', 'nuova scheda', 'nouvel onglet'],
  'zooms-menu-select-nodes': ['seleziona nodi del cluster', 'select cluster nodes'],
  'Centre tree': ['centra albero', 'ricentra', 'recenter', 'center tree', 'fit tree', 'inquadra albero', 'centrer'],
  'Static redraw': ['ridisegna', 'redraw', 'aggiorna disegno', 'redessiner'],
  'Original tree': ['albero originale', 'ripristina albero', 'reset tree', 'original layout', 'arbre original'],
  'Select all': ['seleziona tutto', 'seleziona tutti', 'select all', 'tout selectionner'],
  'Deselect all': ['deseleziona tutto', 'deselect all', 'clear selection', 'pulisci selezione', 'tout deselectionner'],
  'Collapse selected nodes': ['collassa selezionati', 'collapse selected', 'comprimi selezionati', 'replier selectionnes'],
  'Expand selected nodes': ['espandi selezionati', 'expand selected', 'deplier selectionnes'],
  'Expand all': ['espandi tutto', 'espandi tutti', 'expand all', 'tout deplier'],
  'Hide selected nodes': ['nascondi selezionati', 'hide selected', 'masquer selectionnes', 'togli selezionati'],
  'Show selected subtrees': ['mostra solo selezionati', 'solo selezionati', 'isola selezionati', 'only selected', 'show only selected', 'sottoalberi'],
  'Show whole tree': ['mostra tutto albero', 'albero intero', 'albero completo', 'whole tree', 'full tree', 'mostra tutti i nodi', 'ripristina vista', 'arbre entier'],
  'Save SPREAD': ['salva', 'save', 'salva progetto', 'salva sessione', 'save session', 'esporta json', 'enregistrer'],
  'Load SPREAD': ['carica', 'load', 'carica progetto', 'load session', 'charger'],
  'Download image': ['scarica immagine', 'download image', 'esporta immagine', 'salva immagine', 'export image', 'screenshot', 'figura', 'telecharger image'],
  'Add metadata': ['finestra aggiungi metadati'],
  'Edit metadata': ['finestra modifica metadati'],
  'Delete metadata': ['finestra elimina metadati'],
  'Move to the first position': ['sposta in prima posizione', 'prima colonna', 'move first'],
  'Set as figure legend': ['imposta come legenda', 'figure legend', 'legenda figura'],
  'Resize columns': ['ridimensiona colonne', 'adatta colonne', 'resize columns', 'autosize'],
  // "cadre" is a known word, so typo tolerance does not turn it into "carré"
  'Fit map to all markers / Inquadra tutti i marcatori / Afficher tous les marqueurs': ['inquadra', 'cadre', 'cadrer', 'recadre'],
  // shape and border: "make the selected nodes triangles", "rendili triangoli"
  'node-shape-geometry': ['forma', 'forme', 'forma nodi', 'forma dei nodi', 'cambia forma', 'nodi selezionati', 'rendi', 'rendili', 'trasforma', 'trasformali', 'node shape', 'shape', 'shapes', 'change shape', 'selected nodes', 'forme des noeuds', 'changer la forme', 'noeuds selectionnes', 'transforme', 'geometria', 'geometry'],
  'node-shape-border': ['bordo', 'bordi', 'bordo nodi', 'bordo dei nodi', 'cambia bordo', 'contorno', 'contorno nodi', 'nodi selezionati', 'rendi', 'rendili', 'node border', 'border', 'borders', 'change border', 'outline', 'selected nodes', 'bordure', 'bordures', 'changer la bordure', 'contour', 'noeuds selectionnes'],
  // select by style: only selection words, so "forma triangolo" means the shape
  'node-shape-select': ['seleziona', 'seleziona i nodi', 'seleziona per stile', 'select', 'select the nodes', 'select by style', 'selectionner', 'selectionne', 'selectionner les noeuds', 'selectionner par style'],
  'node-shape-reset': ['ripristina forme', 'ripristina bordi', 'ripristina forme e bordi', 'reset shapes', 'reset borders', 'reset shapes and borders', 'retablir les formes', 'retablir les bordures']
};

// Synonyms for option values.
const OPTION_SYNONYMS = {
  on: ['apri', 'mostra', 'open', 'show'], off: ['chiudi', 'nascondi', 'close', 'hide', 'esci', 'exit', 'quitte'],
  piechart: ['torta', 'torte', 'grafico a torta', 'pie', 'pie chart', 'camembert', 'secteurs'],
  heatmap: ['heatmap', 'mappa di calore', 'calore', 'heat', 'densita', 'density', 'chaleur'],
  histogram: ['istogramma', 'histogram', 'histogramme', 'barre', 'bar'], list: ['lista', 'elenco', 'list', 'liste'],
  geographical: ['geografica', 'geografico', 'geographical', 'geographic', 'coordinate', 'geographique'], metadata: ['metadati', 'metadata', 'metadonnees'],
  qualitative: ['qualitativa', 'qualitativo', 'qualitative'], visual: ['visiva', 'visuale', 'visual', 'visuelle'],
  static: ['statico', 'statica', 'static', 'statique', 'fermo'], dynamic: ['dinamico', 'dinamica', 'dynamic', 'dynamique', 'force', 'animato'],
  display: ['mostra', 'visualizza', 'display', 'affiche', 'lascia'], hide: ['nascondi', 'hide', 'masque', 'togli'], cap: ['tronca', 'limita', 'cap', 'taglia', 'plafonne', 'accorcia'],
  real: ['reale', 'reali', 'real', 'reelle'], unreal: ['non reale', 'non reali', 'proporzionale', 'unreal', 'fittizia'],
  selected_only: ['solo selezionati', 'selected only', 'only selected', 'seulement selectionnes'], all: ['tutti', 'tutto', 'all', 'tous'],
  show_selected: ['solo selezionati', 'only selected', 'selected only', 'selezionate'], show_all: ['tutti', 'tutte', 'all', 'everything', 'toutes'],
  character: ['testo', 'categorico', 'categoriale', 'caratteri', 'character', 'text', 'categorical', 'texte', 'stringa'], numeric: ['numerico', 'numerici', 'numeric', 'number', 'numbers', 'numerique', 'numeri'],
  'size-desc': ['dimensione decrescente', 'piu grandi prima', 'size descending', 'largest first', 'decrescente', 'descending', 'grandezza'],
  'size-asc': ['dimensione crescente', 'piu piccoli prima', 'size ascending', 'smallest first', 'crescente', 'ascending'],
  'alphabetic-asc': ['per nome', 'by name', 'alphabetically', 'par nom', 'alfabetico', 'alfabetica', 'alfabeticamente', 'alphabetical', 'alphabetic', 'alphabetique', 'az'],
  'alphabetic-desc': ['alfabetico inverso', 'alfabetica inversa', 'reverse alphabetical', 'za', 'inverso'],
  category: ['categorico', 'categorie', 'category', 'categorical', 'categories'], gradient: ['gradiente', 'sfumatura', 'gradient', 'degrade'],
  gradient_cool: ['freddo', 'fredda', 'cool', 'froid'], gradient_rainbow: ['arcobaleno', 'rainbow', 'arc en ciel'],
  gradient_rainbow2: ['arcobaleno 2', 'rainbow 2'], gradient_rainbow3: ['arcobaleno 3', 'rainbow 3'],
  png: ['png', 'immagine raster'], svg: ['svg', 'vettoriale', 'vector'], csv: ['csv', 'virgole'], tsv: ['tsv', 'tabulazioni', 'tab'],
  // metadata table as an Excel workbook ("Download table", .xlsx); no "tableur":
  // with the tolerance to typos it matches "tableau" and takes the table requests
  xlsx: ['xlsx', 'excel', 'foglio di calcolo', 'foglio excel', 'spreadsheet'],
  show: ['mostra', 'show'], hide_: [], apply: ['applica', 'apply', 'mantieni', 'keep'], 'not-apply': ['non applicare', 'ignora', 'ignore', 'default'],
  // node shapes and borders (plurals: "make them triangles")
  circle: ['cerchi'], square: ['quadrati', 'squares', 'carres'],
  triangle: ['triangoli', 'triangles'], hexagon: ['esagoni', 'hexagons', 'hexagones'], octagon: ['ottagoni', 'octagons', 'octogones'],
  normal: ['semplice', 'continuo', 'plain', 'solid'], dashed: ['tratteggiati', 'trattini', 'dashes', 'tirets'], dotted: ['puntini', 'pointilles'],
  crown: ['corone', 'crowns', 'couronnes'], gear: ['ingranaggio', 'ruota dentata', 'cog', 'cogwheel', 'engrenages'], gear_round: ['ingranaggio arrotondato', 'rounded cog'],
  spikes: ['spina', 'punte', 'aculei', 'spike', 'epine'], wavy: ['ondulato', 'ondulata', 'onde', 'waves', 'wavy', 'vagues']
};

// Windows-1252 code points some i18n strings use as numeric entities (&#156; = œ).
const CP1252 = { 128: '€', 140: 'Œ', 156: 'œ', 145: '‘', 146: '’', 147: '“', 148: '”', 150: '–', 151: '—', 133: '…' };
function decodeEntities(text) {
  return String(text).replace(/&#(\d+);/g, (_, code) => CP1252[code] || String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function stripTags(text) { return decodeEntities(String(text ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }

// Index of SPREAD's i18n dictionaries: the plain text of every string and the
// keys that have it, in the order of the dictionaries and of their keys. Built
// once: scanning (and cleaning) every string of the dictionaries for each label
// rebuilt the catalog in about 0.35 s at every request.
let translationIndex = null;
const translationCache = new Map();

function translationKeys(label) {
  if (!translationIndex) {
    translationIndex = new Map();
    for (const dictionary of Object.values(gtiz_languages)) {
      for (const [key, value] of Object.entries(dictionary)) {
        if (typeof value !== 'string') continue;
        const text = stripTags(value);
        if (!translationIndex.has(text)) translationIndex.set(text, []);
        translationIndex.get(text).push(key);
      }
    }
  }
  return translationIndex.get(label) || [];
}

// Every translation of a UI string, using SPREAD's own i18n dictionaries
// (cached by label: the dictionaries do not change while the page is open).
function translations(text) {
  const label = stripTags(text);
  if (translationCache.has(label)) return translationCache.get(label);
  const out = new Set(label ? [label] : []);
  if (typeof gtiz_languages === 'undefined' || !label) return { all: [...out], english: label };
  let english = label;
  for (const key of translationKeys(label)) {
    for (const other of Object.values(gtiz_languages)) if (typeof other[key] === 'string') out.add(stripTags(other[key]));
    if (typeof gtiz_languages.en?.[key] === 'string') english = stripTags(gtiz_languages.en[key]);
  }
  const result = { all: [...out], english };
  translationCache.set(label, result);
  return result;
}

/*
*
* Stable key of a catalog entry for the example bank (js/assistant-examples.json).
* Catalog ids are menu positions and shift when a menu item is added, so the key
* uses the panel, the control id or English label and, for switches, the first
* option value (two tree toggles share one control id). List values are left
* out: column lists change with the loaded data.
*
*/
function entryKey(id, item, english, options) {
  const [panel, suffix] = String(id).split(':');
  const name = ['video-player', 'map-view'].includes(panel) ? suffix : (item.id || english || item.type || suffix);
  return `${panel}|${name}${item.type === 'toggle' && options.length ? `#${options[0].value}` : ''}`;
}

function catalogEntry(entry) {
  const { id, area, item } = entry;
  const options = optionsOf(item).map((option) => ({ value: option.value, label: option.label }));
  // Items without a real label get one from their id; that is noise, not a name.
  // Number boxes are unlabeled twins of a labeled slider: borrow its label.
  const labelItem = entry.labelItem || item;
  const hasLabel = Boolean(typeof labelItem.label === 'function' ? (() => { try { return labelItem.label(); } catch (_) { return ''; } })() : labelItem.label);
  const { all, english } = hasLabel ? translations(labelOf(labelItem)) : { all: [], english: '' };
  const terms = [...all];
  const keys = [item.id, labelItem.id, english, options.length ? `opt:${options[0].value}` : '', area === 'layout' ? `layout:${item.type}` : ''];
  keys.forEach((key) => { if (key && SYNONYMS[key]) terms.push(...SYNONYMS[key]); });
  const optionEntries = options.map((option) => ({
    value: option.value,
    terms: [String(option.value).replace(/[-_]/g, ' '), ...translations(option.label).all, ...(OPTION_SYNONYMS[option.value] || [])]
  }));
  // Layout toggles have no label: name them after their panel.
  if (!terms.length || terms.every((term) => !term)) terms.push(String(item.type || id).replace(/[-_]/g, ' '));
  const valueRequired = options.length > 0 || ['toggle', 'select', 'number', 'slider', 'search', 'radio', 'text', 'abutton_optioned'].includes(item.type);
  // a button with options (e.g. a download format) runs, as in its menu, with the
  // option preselected there when the request names none (see valueFor)
  const selected = item.type === 'abutton_optioned' && typeof item.selected === 'function' ? (() => { try { return item.selected(); } catch (_) { return undefined; } })() : undefined;
  const defaultValue = options.some((option) => String(option.value) === String(selected)) ? selected : undefined;
  return { id, key: entryKey(id, item, english, options), area, iid: item.id, type: item.type, label: hasLabel ? stripTags(labelOf(labelItem)) : '', terms: terms.filter(Boolean), options: optionEntries.map((option, index) => ({ ...option, label: stripTags(options[index].label) })), min: item.min, max: item.max, valueRequired, ...(defaultValue !== undefined ? { defaultValue } : {}) };
}

// Menus expose both a slider and a number box for the same setting; keep one.
function resolvableEntries() {
  const entries = [...actionRegistry.values()].filter((entry) => typeof entry.item.function === 'function' && !String(entry.id).startsWith('assistant:'));
  const byId = new Map(entries.filter((entry) => entry.item.id).map((entry) => [entry.item.id, entry]));
  return entries
    .filter((entry) => !(entry.item.id && entry.item.id.endsWith('-slider') && byId.has(entry.item.id.replace(/-slider$/, ''))))
    .map((entry) => {
      const slider = entry.item.id && byId.get(`${entry.item.id}-slider`);
      return slider ? { ...entry, labelItem: slider.item } : entry;
    });
}

function buildContext(base) {
  refreshRegistry();
  const tree = gtiz_tree?.tree;
  const rows = tree ? metadataRows() : [];
  const live = tree ? liveColumns() : [];
  const columns = base ? [...new Set([...base.columns.filter((column) => !base.removed?.has(column)), ...live.filter((column) => !base.removed?.has(column))])] : [...live];
  const cache = new Map();
  const ctx = {
    lang: (typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en',
    columns,
    protectedColumns: protectedColumns(),
    values: (column) => {
      if (!cache.has(column)) {
        const planned = base?.plannedValues?.[column];
        const set = new Set(planned ? planned.filter((value) => value !== '') : []);
        for (const row of rows) if (row[column] !== undefined && String(row[column]).trim() !== '') set.add(String(row[column]));
        cache.set(column, [...set]);
      }
      return cache.get(column);
    },
    ids: rows.map((row) => String(row.ID)),
    displayCategory: tree?.display_category || '',
    catalog: resolvableEntries().map(catalogEntry),
    has: (id) => actionRegistry.has(id),
    plannedValues: base?.plannedValues
  };
  return ctx;
}

// Steps applied in this session, for "record the last N steps as a macro".
let history = [];
let lastAppliedPlan = [];
// The user macros are the ones of the macros panel (js/macros.js, localStorage
// `spread-macros`): what the assistant saves shows in the panel and the other way round.
function userMacros() {
  return typeof gtiz_macros !== 'undefined' && Array.isArray(gtiz_macros.user_macros) ? gtiz_macros.user_macros : [];
}

function nativeMacros() {
  return typeof gtiz_macros !== 'undefined' && Array.isArray(gtiz_macros.macros) ? gtiz_macros.macros : [];
}

function findMacro(name) {
  const wanted = normIntent(name);
  const all = [...userMacros(), ...nativeMacros()].map((macro) => ({ macro, name: macroTitle(macro), own: Boolean(macro.user) }));
  if (!wanted && all.length === 1) return all[0];
  const index = /^\d+$/.test(wanted) ? Number(wanted) - 1 : -1;
  if (index >= 0 && index < all.length) return all[index];
  return all.find((entry) => normIntent(entry.name) === wanted) ||
    all.find((entry) => similarIntent(normIntent(entry.name), wanted)) ||
    all.find((entry) => wanted && normIntent(entry.name).includes(wanted));
}

// Save steps as a user macro: a macro of the user with the same name gets the new
// steps, the name of a built-in macro is refused.
function saveMacro(name, actions) {
  const { steps, kept, skipped } = macroSteps(actions);
  const skippedText = skipped.length ? `\n${say('macro_skipped', skipped.map((action) => describeAction(action)).join('; '))}` : '';
  if (!steps.length) return { message: `${say('macro_no_steps')}${skippedText}`, warning: true };
  const existing = userMacros().find((macro) => normIntent(macro.title) === normIntent(name));
  if (!existing && gtiz_macros.titleExists(name)) return { message: say('macro_title_taken', name), warning: true };
  if (existing) gtiz_macros.updateUserMacro(existing, { title: existing.title, description: existing.description, label: existing.label, steps });
  else gtiz_macros.addUserMacro({ title: name, description: '', label: '', steps });
  gtiz_macros.refreshPanel();
  const lines = kept.map((action, index) => `${index + 1}. ${describeAction(action)}`).join('\n');
  return { message: `${say('macro_saved', name, steps.length)}\n${lines}${skippedText}` };
}

function newMacroName() {
  let n = userMacros().length + 1;
  while (gtiz_macros.titleExists(`Macro ${n}`)) n++;
  return `Macro ${n}`;
}

// Handles a macro request.  Returns actions to plan, or a message.
function handleMacro(request) {
  if (request.op === 'list') {
    const own = userMacros();
    const native = nativeMacros();
    if (!own.length && !native.length) return { message: say('macro_none') };
    const lines = [...own.map((macro) => `• ${macro.title} (${macro.steps.length} ${say('macro_steps')})`), ...native.map((macro) => `• ${macroTitle(macro)} (${say('macro_native')})`)];
    return { message: `${say('macro_list')}:\n${lines.join('\n')}${own.length ? '' : `\n\n${say('macro_none')}`}` };
  }
  if (request.op === 'define') return saveMacro(request.name || newMacroName(), request.steps);
  if (request.op === 'record') {
    const steps = request.steps === 'last-plan' ? lastAppliedPlan : history.slice(-request.steps);
    if (!history.length) return { message: say('history_empty'), warning: true };
    if (request.steps !== 'last-plan' && request.steps > history.length) return { message: say('history_short', history.length), warning: true };
    return saveMacro(request.name || newMacroName(), steps);
  }
  if (request.op === 'rename') {
    const own = userMacros();
    const target = request.name ? findMacro(request.name) : (own.length ? { macro: own[0], name: own[0].title, own: true } : null);
    if (!target) return { message: say('macro_missing', request.name || ''), warning: true };
    if (!target.own) return { message: say('macro_built_in', target.name), warning: true };
    if (gtiz_macros.titleExists(request.to, target.macro)) return { message: say('macro_title_taken', request.to), warning: true };
    gtiz_macros.updateUserMacro(target.macro, { title: request.to, description: target.macro.description, label: target.macro.label, steps: target.macro.steps });
    gtiz_macros.refreshPanel();
    return { message: say('macro_renamed', target.name, request.to) };
  }
  const found = findMacro(request.name);
  if (!found) return { message: say('macro_missing', request.name || ''), warning: true };
  if (request.op === 'delete') {
    if (!found.own) return { message: say('macro_built_in', found.name), warning: true };
    gtiz_macros.user_macros = gtiz_macros.user_macros.filter((macro) => macro !== found.macro);
    gtiz_macros.dictionary = null;
    gtiz_macros.writeLibrary();
    gtiz_macros.refreshPanel();
    return { message: say('macro_deleted', found.name) };
  }
  return { actions: [{ id: macroId(found.macro) }] };
}

// ---------------------------------------------------------------------------
// Orientation: where an option lives in the interface, shown with the shared highlight.

const PLACES = {
  it: { topbar: 'barra in alto', settings: 'Impostazioni', tree: 'Albero', metadata: 'Metadati', legend: 'Legenda', map: 'Mappa', video: 'Video', zooms: 'Zoom ReporTree', menu: 'menu ⋮', header: 'intestazione della card', player: 'lettore', macros: 'Macro (▷▷)', search: 'Ricerca (lente)', notes: 'Note (blocco note)', language: 'Lingua (globo)', info: 'Informazioni (i)', assistant: 'Puoi chiederlo direttamente a me', where: 'Si trova in', type: 'Per farlo da qui scrivi', showing: 'Te lo mostro.' },
  en: { topbar: 'top bar', settings: 'Settings', tree: 'Tree', metadata: 'Metadata', legend: 'Legend', map: 'Map', video: 'Video', zooms: 'ReporTree zooms', menu: '⋮ menu', header: 'card header', player: 'player', macros: 'Macros (▷▷)', search: 'Search (magnifier)', notes: 'Notes (notepad)', language: 'Language (globe)', info: 'Information (i)', assistant: 'You can ask me directly', where: 'It is in', type: 'To do it from here, type', showing: 'Showing it now.' },
  fr: { topbar: 'barre du haut', settings: 'Paramètres', tree: 'Arbre', metadata: 'Métadonnées', legend: 'Légende', map: 'Carte', video: 'Vidéo', zooms: 'Zooms ReporTree', menu: 'menu ⋮', header: 'en-tête de la carte', player: 'lecteur', macros: 'Macros (▷▷)', search: 'Recherche (loupe)', notes: 'Notes (bloc-notes)', language: 'Langue (globe)', info: 'Informations (i)', assistant: 'Vous pouvez me le demander', where: 'Se trouve dans', type: 'Pour le faire d’ici, tapez', showing: 'Je vous le montre.' }
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function places() { return PLACES[(typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en'] || PLACES.en; }

function optionName(entry) {
  const item = entry.labelItem || entry.item;
  const hasLabel = typeof item.label === 'function' || Boolean(item.label);
  if (hasLabel) return stripTags(labelOf(item));
  const options = optionsOf(entry.item);
  if (options.length) {
    // Unlabelled switches and radios: name them by their choices.
    const labels = [...new Set(options.map((option) => stripTags(option.label)))];
    return labels.join(' / ');
  }
  const twin = entry.item.id && [...actionRegistry.values()].find((other) => other.item.id === `${entry.item.id}-slider`);
  return twin ? stripTags(labelOf(twin.item)) : String(entry.item.type || entry.id);
}

// Assistant-made controls carry "English / Italiano / Français" labels.
function englishPart(name) {
  const parts = String(name).split(' / ');
  if (parts.length < 3) return name;
  const lang = (typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en';
  return parts[{ en: 0, it: 1, fr: 2 }[lang] ?? 0];
}

async function openPanel(view) {
  const toggle = document.querySelector(`.quick-actions .toggle-box[data-view="${view}"]`);
  if (toggle && toggle.getAttribute('data-selection') !== 'on') {
    toggle.click();
    await sleep(900);
  }
}

function findByText(root, text) {
  const wanted = String(text).trim().toLowerCase();
  if (!root || !wanted) return null;
  const nodes = [...root.querySelectorAll('a, button, label, .label, .toggle-option, .list-value, .form-label, span, div')];
  const hit = nodes.find((node) => node.children.length < 4 && node.textContent.trim().toLowerCase() === wanted) ||
    nodes.find((node) => node.children.length < 4 && node.textContent.trim().toLowerCase().includes(wanted));
  return hit ? hit.closest('.toggle-box, .select-box, .slider-box, .input-box, .list-box, .search-box, .button-box, .button-box-optioned, a, li') || hit : null;
}

// Path in the interface plus a function that reveals the control.
function locationOf(id) {
  const t = places();
  if (id.startsWith('#tool-')) {
    const tool = id.slice(6);
    return { path: [t.topbar, t[tool]], reveal: async () => document.querySelector(`.tool-${tool === 'info' ? 'help' : tool}`) || document.querySelector(`.tool-${tool}`) };
  }
  const entry = actionRegistry.get(id);
  if (!entry) return null;
  const name = optionName(entry);
  const { area, item } = entry;
  if (area.startsWith('settings/')) {
    const card = area.slice(9);
    const cardNode = document.querySelector(`.card-settings[data-type="${card}"]`);
    const title = cardNode?.querySelector('.card-title')?.textContent.trim() || card.replace(/-/g, ' ');
    return {
      path: [t.settings, title, name],
      help: settingsHelp(card, name),
      reveal: async () => {
        await openPanel('settings');
        if (cardNode && !cardNode.classList.contains('expanded')) { cardNode.querySelector('.card-expand-trigger')?.click(); await sleep(600); }
        const control = (item.id && document.getElementById(`${item.id}-slider`)) || (item.id && document.getElementById(item.id));
        return control?.closest('.toggle-box, .select-box, .slider-box, .input-box, .list-box, .search-box') || control || cardNode;
      }
    };
  }
  if (area === 'topbar') return { path: [t.topbar, name], reveal: async () => document.querySelector(`.${item.id}`) };
  // the video player: a hidden item of the legend menu, switched by the round
  // trigger in the header of the legend card
  if (item.id === 'legend-menu-player') return { path: [t.legend, t.header, name], reveal: async () => { await openPanel('legend'); return document.querySelector('.card-legend-player-trigger'); } };
  if (area === 'layout') return { path: [t.topbar, stripTags(optionsOf(item)[0]?.label || item.type)], reveal: async () => document.querySelector(`.quick-actions .toggle-box[data-view="${item.type}"]`) };
  if (area === 'video') return { path: [t.video, t.player, englishPart(name)], reveal: async () => { await openPanel('legend'); gtiz_layout.setVideo('on'); return document.querySelector('.slider-box-player'); } };
  if (id.startsWith('map-view:')) return { path: [t.map, englishPart(name)], reveal: async () => { await openPanel('map'); return document.querySelector('.map-container'); } };
  if (area === 'macro') return { path: [t.topbar, t.macros, name], reveal: async () => document.querySelector('.tool-macros') };
  if (area === 'metadata-card') return { path: [t.metadata, t.header, name], reveal: async () => { await openPanel('metadata'); return findByText(document.querySelector('.card-metadata'), name); } };
  if (id.startsWith('assistant:')) return { path: [t.assistant] };
  const menuType = area.startsWith('zooms') ? 'zooms' : area;
  const panel = { tree: t.tree, metadata: t.metadata, legend: t.legend, map: t.map, zooms: t.zooms }[menuType] || menuType;
  const helpKey = { tree: 'tree-layout', map: 'map' }[menuType];
  return {
    path: [panel, t.menu, name],
    help: helpKey ? settingsHelp(helpKey, name) : '',
    reveal: async () => {
      if (['metadata', 'legend', 'map'].includes(menuType)) await openPanel(menuType);
      const trigger = document.querySelector(`.card-context-menu-trigger[data-menu-type="${menuType}"]`);
      if (!trigger) return null;
      // the menu exists only while open, and its trigger closes it: open it only when closed
      let menu = document.querySelector(`.context-menu-${menuType}`);
      if (!menu) {
        trigger.click();
        await sleep(400);
        menu = document.querySelector(`.context-menu-${menuType}`);
      }
      return (item.id && menu?.querySelector(`#${CSS.escape(item.id)}`)?.closest('.toggle-box, .select-box, .input-box, .button-box, .button-box-optioned')) || findByText(menu, name) || trigger;
    }
  };
}

// The matching line of SPREAD's own help for a settings card: the bullet whose
// bold title best matches the option name.
function settingsHelp(card, name, fallback = true) {
  if (typeof gtiz_languages === 'undefined') return '';
  const lang = (typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en';
  const key = card.replace(/-/g, '_');
  const raw = gtiz_languages[lang]?.helps?.[key]?.help || gtiz_languages.en?.helps?.[key]?.help || '';
  const items = [...raw.matchAll(/<li>(.*?)<\/li>/g)].map((match) => ({ title: normIntent(stripTags((match[1].match(/<strong>(.*?)<\/strong>/) || [])[1] || '')), text: stripTags(match[1]) }));
  const words = normIntent(name).split(' ').filter((word) => word.length > 2);
  let best = null;
  for (const item of items) {
    const title = item.title.split(' ');
    const overlap = words.filter((word) => title.some((part) => part === word || similarIntent(part, word) || (part.length > 4 && word.length > 4 && part.slice(0, 5) === word.slice(0, 5)))).length;
    const score = overlap / Math.max(words.length, title.length || 1);
    if (overlap && (!best || score > best.score)) best = { score, text: item.text };
  }
  return best ? best.text : '';
}

// Dim the page around the control and keep the ring on it while layout
// settles (cards expand, menus slide in), then fade after a few seconds.
/**
 * Show a control: the shared highlight of SPREAD (js/highlight.js), the same as
 * the search of the functions
 *
 * @param {Element} element The control
 * @returns {undefined}
 */
function spotlight(element) {
  if (typeof gtiz_highlight !== 'undefined') gtiz_highlight.show(element);
}

async function showLocation(id) {
  const location = locationOf(id);
  if (!location?.reveal) return;
  try { spotlight(await location.reveal()); } catch (_) { /* the panel changed meanwhile */ }
}

// A complete command for the option, so the suggestion works as typed.
function exampleFor(id, query) {
  const entry = actionRegistry.get(id);
  if (!entry || id.startsWith('assistant:')) return '';
  const { item } = entry;
  const options = optionsOf(item);
  if (['number', 'slider'].includes(item.type)) {
    const min = Number.isFinite(item.min) ? item.min : 0;
    const max = Number.isFinite(item.max) ? item.max : min + 10;
    return `${query} ${Math.round((min + max) / 2)}`;
  }
  if (options.length) {
    const labels = [...new Set(options.map((option) => stripTags(option.label)))];
    if (labels.length === 1) return query;
    return `${query} ${labels[Math.min(1, labels.length - 1)].toLowerCase()}`;
  }
  return query;
}

// true while a request to suggest is being checked (planFor may build another
// location message: no check inside a check)
let checkingExample = false;

/**
 * A request to suggest for an option ("Per farlo da qui scrivi"), only when it
 * works: checked with a dry run of the assistant, it must plan that option. The
 * words of the request first (but not a request that has just failed, e.g. one
 * the example bank answered with the place of the option), then its label.
 *
 * @param {String} id Catalog id of the option
 * @param {String} query Words of the request
 * @returns {String} The request to suggest, empty when none works
 */
function workingExample(id, query) {
  if (checkingExample) return '';
  const entry = actionRegistry.get(id);
  if (!entry) return '';
  const label = stripTags(labelOf(entry.item)).toLowerCase();
  const candidates = [...new Set([exampleFor(id, query), label && exampleFor(id, label)].filter(Boolean))];
  checkingExample = true;
  try {
    return candidates.find((candidate) => {
      try {
        const result = planFor(candidate);
        return !result.unresolved.length && result.plan.some((action) => action.id === id);
      } catch (_) { return false; }
    }) || '';
  } finally {
    checkingExample = false;
  }
}

function locationMessage(locate) {
  const t = places();
  const location = locationOf(locate.id);
  if (!location) return { message: say('invalid'), warning: true };
  const lines = [`${t.where}: ${location.path.join(' › ')}`];
  if (location.help) lines.push(location.help);
  if (location.reveal) lines.push(t.showing);
  // only a request that really works, never the one that has just failed
  const example = workingExample(locate.id, locate.query);
  if (example) lines.push(`${t.type}: “${example}”`);
  return { message: lines.join('\n'), reveal: locate.id };
}

// Read-only statistics on the loaded metadata (optionally filtered); the texts
// are in the `assistant.stats` module of js/i18n.

function statsMessage(stats) {
  let rows = metadataRows();
  if (stats.where) rows = matchRows(rows, resolveWhere(stats.where));
  if (!rows.length) return { message: say('stats.none'), warning: true };
  const scope = stats.where ? ` ${say('stats.among', describeWhere(stats.where), rows.length)}` : '';
  if (stats.kind === 'total') return { message: say('stats.total', rows.length) };
  if (stats.kind === 'columns') {
    const columns = liveColumns();
    return { message: say('stats.columns', columns.length, columns.join(', ')) };
  }
  const column = stats.column;
  const values = rows.map((row) => String(row[column] ?? '').trim());
  const present = values.filter(Boolean);
  const counts = new Map();
  present.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  const list = (limit) => ranked.slice(0, limit).map(([value, count]) => `• ${value}: ${count}`).join('\n') + (ranked.length > limit ? `\n${say('stats.more', ranked.length - limit)}` : '');
  const numeric = present.length && present.every((value) => !Number.isNaN(Number(value)));
  const sorted = [...present].sort((a, b) => (numeric ? Number(a) - Number(b) : a.localeCompare(b)));
  switch (stats.kind) {
    case 'distinct': return { message: `${say('stats.distinct', column, counts.size)}${scope}:\n${list(25)}` };
    case 'groups': return { message: `${say('stats.groups', column)}${scope}:\n${list(25)}` };
    case 'mode': return ranked.length ? { message: say('stats.mode', column, ranked[0][0], ranked[0][1], rows.length) + scope } : { message: say('stats.none'), warning: true };
    case 'max': return { message: say('stats.max', column, sorted[sorted.length - 1]) + scope };
    case 'min': return { message: say('stats.min', column, sorted[0]) + scope };
    case 'range': return { message: say('stats.range', column, sorted[0], sorted[sorted.length - 1]) + scope };
    case 'missing': return { message: say('stats.missing', column, values.length - present.length, values.length) + scope };
    default: return { message: say('invalid'), warning: true };
  }
}

/**
 * Reply with a list of samples, as the samples of a note: the count with a small
 * icon that copies all the IDs (separated by commas), glued to its last word so
 * that it never wraps alone, and below a preview of the IDs (the css shows three
 * lines, with an ellipsis when they are more)
 *
 * @param {String} label The count, e.g. "10 campioni con serovar Infantis"
 * @param {Array} ids IDs of the samples
 * @returns {DocumentFragment} Count and preview
 */
function samplesReply(label, ids) {
  const copy = cardTool('spread-assistant__samples-copy', 'tabler-copy', gtiz_locales.current.copy_list, async () => {
    const copied = typeof gtiz_file_handler !== 'undefined' && await gtiz_file_handler.copyToClipboard(ids.join(', '));
    if (!copied) return;
    const icon = copy.querySelector('i');
    icon.className = 'tabler tabler-check';
    copy.classList.add('copied');
    setTimeout(() => {
      icon.className = 'tabler tabler-copy';
      copy.classList.remove('copied');
    }, 1500);
  });
  const words = label.split(' ');
  const glue = element('span', 'spread-assistant__samples-glue', words.pop());
  glue.append(copy);
  const count = element('div', 'spread-assistant__samples-label', words.length ? `${words.join(' ')} ` : '');
  count.append(glue);
  const fragment = document.createDocumentFragment();
  fragment.append(count, element('div', 'spread-assistant__samples-preview', ids.join(', ')));
  return fragment;
}

function queryMessage(query) {
  const rows = matchRows(metadataRows(), resolveWhere(query.where));
  if (!rows.length) return { message: say('none'), warning: true, empty: true };
  const ids = rows.map((row) => String(row.ID));
  const shown = ids.slice(0, 40).join(', ') + (ids.length > 40 ? ', …' : '');
  // "10 campioni con serovar Infantis" and the IDs: the plain text (planFor, tests)
  // and, for the conversation, the count with the copy icon and the preview
  const label = say(rows.length === 1 ? 'steps.matching_one' : 'steps.matching', rows.length, describeWhere(query.where));
  return { message: `${label}:\n${shown}`, node: () => samplesReply(label, ids) };
}

function readUnresolved() {
  try { return JSON.parse(localStorage.getItem(UNRESOLVED_KEY) || '[]'); }
  catch (_) { return []; }
}

// Requests the assistant could not map are kept locally (never sent anywhere)
// so maintainers can see which ideas users had and extend the grammar.
function logUnresolved(request, reason) {
  if (!UNRESOLVED_LOG) return;
  try {
    const list = readUnresolved();
    list.push({ at: new Date().toISOString(), lang: (typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en', request, reason });
    localStorage.setItem(UNRESOLVED_KEY, JSON.stringify(list.slice(-UNRESOLVED_LIMIT)));
  } catch (_) { /* storage unavailable */ }
}

  // [action id, functional area, visible label, control type, allowed values | "$columns", min, max]
function normalizeTerms(value) {
  return String(value || '').toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function colourValues(tree, category) {
  if (!tree?.metadata || !Object.hasOwn(tree.metadata_info || {}, category)) return [];
  const column = tree.metadata_info[category];
  const values = new Set();
  for (const row of Object.values(tree.metadata)) {
    if (tree.node_map && !Object.hasOwn(tree.node_map, row.ID)) continue;
    const value = row[category];
    if (!value && value !== 0) continue;
    values.add(String(column?.coltype === 'numeric' && !Number.isNaN(Number(value)) ? Number.parseFloat(value) : value));
  }
  return [...values];
}

function namedColourCommand(request, tree) {
  const english = request.match(/^set the colou?r of (sample |group )?(.+?) to ([\w#]+)[.!]?$/i);
  const italian = request.match(/^(?:metti|imposta) (?:il )?colore ([\w#]+) (?:a|al|per) (.+?)[.!]?$/i);
  if (!english && !italian) return null;
  const target = (english ? english[2] : italian[2]).trim().toLowerCase();
  const colourName = (english ? english[3] : italian[1]).toLowerCase();
  const aliases = { nero: 'black', bianco: 'white', rosso: 'red', verde: 'green', blu: 'blue', giallo: 'yellow', grigio: 'gray', viola: 'purple', arancione: 'orange', rosa: 'pink' };
  const parsed = d3.color(Object.hasOwn(aliases, colourName) ? aliases[colourName] : colourName);
  if (!parsed || parsed.opacity !== 1) return {};
  const scope = english?.[1]?.trim().toLowerCase();
  const columns = Object.keys(tree?.metadata_info || {}).filter((category) =>
    category !== 'nothing' && (scope !== 'sample' || category === 'ID') && (scope !== 'group' || category !== 'ID'));
  const matches = columns.flatMap((category) => colourValues(tree, category)
    .filter((id) => id.toLowerCase() === target)
    .map((id) => ({ category, id, colour: parsed.formatHex() })));
  const active = matches.filter(({ category }) => category === tree.display_category);
  if (active.length === 1) return active[0];
  return matches.length === 1 ? matches[0] : {};
}

function validate(item, value, virtual) {
  if (typeof item.check === 'function') return item.check(value, virtual);
  if (item.type === 'assistant_map_coordinates') {
    const { latitude, longitude } = value || {};
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
        !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
      throw new Error(say('errors.invalid_coordinates'));
    }
    return { latitude, longitude };
  }
  if (item.type === 'assistant_node_colour') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(say('errors.colour_needs_target'));
    const tree = typeof gtiz_tree !== 'undefined' ? gtiz_tree.tree : undefined;
    const category = String(value.category ?? 'ID');
    const id = String(value.id || '');
    const colour = String(value.colour || '');
    if ([category, id].some((key) => Object.hasOwn(Object.prototype, key) || key === 'prototype') ||
        !colourValues(tree, category).includes(id)) throw new Error(say('errors.colour_value_missing'));
    if (!/^#[0-9a-f]{6}$/i.test(colour)) throw new Error(say('errors.colour_hex'));
    return { category, id, colour };
  }
  if (item.type === 'assistant_metadata_replace_all') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(say('errors.replace_needs_value'));
    const tree = typeof gtiz_tree !== 'undefined' ? gtiz_tree.tree : undefined;
    const columns = tree && tree.metadata_info ? Object.keys(tree.metadata_info) : [];
    const category = String(value.category || '');
    const replacement = String(value.value || '').trim();
    const protectedColumns = ['ID', 'CMP', 'nothing', '__Node', gtiz_file_handler.samples_column];
    if (!columns.includes(category) || protectedColumns.includes(category)) throw new Error(say('errors.column_not_editable', category));
    if (!replacement || /[\t\r\n]/.test(replacement)) throw new Error(say('errors.replacement_invalid'));
    return { category, value: replacement };
  }
  const needsValue = optionsOf(item).length > 0 || ['toggle', 'select', 'number', 'slider', 'search', 'radio', 'text', 'abutton_optioned'].includes(item.type);
  if (!needsValue) return undefined;
  if (value === undefined || value === null) throw new Error(say('errors.missing_value', labelOf(item)));
  if (item.type === 'number' || item.type === 'slider') {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(say('errors.not_a_number'));
    if (Number.isFinite(item.min) && number < item.min) throw new Error(say('errors.minimum', item.min));
    if (Number.isFinite(item.max) && number > item.max) throw new Error(say('errors.maximum', item.max));
    return number;
  }
  const options = optionsOf(item);
  if (options.length && !options.some((option) => String(option.value) === String(value))) throw new Error(say('errors.unexpected_value', labelOf(item)));
  return String(value);
}

function invokeOptioned(item, value) {
  const box = document.createElement('div');
  box.className = 'button-box-optioned';
  const select = document.createElement('select');
  optionsOf(item).forEach(({ value: optionValue, label }) => select.add(new Option(label, optionValue, false, String(optionValue) === String(value))));
  const button = document.createElement('button');
  box.append(select, button);
  document.body.append(box);
  try { item.function({ currentTarget: button }); } finally { box.remove(); }
}

// Keep SPREAD's visible controls in step with the value the assistant set:
// a number box and its twin slider, or a select.
function syncControls(item, value) {
  if (value === undefined || value === null || typeof value === 'object' || !item.id) return;
  for (const id of [item.id, item.slider, item.related].filter(Boolean)) {
    const control = document.getElementById(id);
    if (control && 'value' in control && ['INPUT', 'SELECT'].includes(control.tagName) && control.type !== 'checkbox') control.value = String(value);
  }
}

// Settings cards: operate the visible control exactly as a user would (set
// the value and fire the event SPREAD listens to), so SPREAD's own handler
// updates its state, the twin slider/number box and everything bound to it.
function viaControl(item, value) {
  if (!item.id) return false;
  const control = document.getElementById(item.id);
  if (!control || !control.isConnected) return false;
  const text = value === undefined || value === null ? '' : String(value);
  switch (item.type) {
    case 'number':
    case 'slider':
      if (control.tagName !== 'INPUT') return false;
      control.value = text;
      control.dispatchEvent(new Event(item.type === 'slider' ? 'input' : 'change', { bubbles: true }));
      return true;
    case 'select':
      if (control.tagName !== 'SELECT' || ![...control.options].some((option) => option.value === text)) return false;
      control.value = text;
      control.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    case 'toggle':
      if (!control.classList.contains('toggle-box')) return false;
      if (control.getAttribute('data-selection') !== text) control.click();
      return true;
    case 'radio': {
      const row = [...control.querySelectorAll('.list-row')].find((candidate) => candidate.getAttribute('data-value') === text);
      if (!row) return false;
      row.click();
      return true;
    }
    case 'search':
      if (control.tagName !== 'INPUT') return false;
      control.value = text;
      control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return true;
    default:
      return false;
  }
}

function execute(action) {
  refreshRegistry();
  const entry = actionRegistry.get(action.id);
  if (!entry) throw new Error(say('errors.action_unavailable'));
  const { item } = entry;
  if (typeof item.function !== 'function') throw new Error(say('errors.native_only', labelOf(item)));
  const value = validate(item, action.value);
  if (item.type === 'abutton_optioned') invokeOptioned(item, value);
  else if (entry.invoke) entry.invoke(item, value);
  else if (entry.area.startsWith('settings/') && viaControl(item, value)) { /* the UI's own handler ran */ }
  else if (value === undefined) item.function();
  else item.function(value);
  syncControls(item, value);
  return describeAction(action);
}

// A message of the conversation; the conversation scrolls to it (inside the
// card, never the page) and the pending plan, if any, stays after it. Outcomes
// (success, warning) open with a fixed header, icon and short title in line as
// the titles of the notifications, and the text (or a node, e.g. the list of
// the steps of a plan) on the line below.
function addMessage(panel, role, text, title) {
  const node = document.createElement('div');
  node.className = `spread-assistant__message spread-assistant__message--${role}${role === 'success' || role === 'warning' ? ' spread-assistant__message--assistant' : ''}`;
  if (role === 'success' || role === 'warning') {
    // a request not understood can be reported (see replyActions)
    if (title && title === say('not_understood')) node.dataset.notUnderstood = '';
    const header = element('div', 'spread-assistant__message-title');
    header.append(element('i', `tabler ${role === 'success' ? 'tabler-circle-check' : 'tabler-alert-triangle'}`), ` ${title || (role === 'success' ? say('done') : say('warning'))}`);
    node.append(header, text instanceof Node ? text : element('div', 'spread-assistant__message-text', text));
  } else if (text instanceof Node) node.append(text);
  else node.textContent = text;
  const messages = panel.querySelector('.spread-assistant__messages');
  const plan = messages.querySelector('.spread-assistant__plan');
  if (plan && !plan.hidden) plan.before(node);
  else messages.append(node);
  if (role !== 'user' && currentRequest) replyActions(panel, node, currentRequest);
  scrollToEnd(panel);
  return node;
}

/**
 * Copy and retry under the replies to a request, after its last reply (they
 * move down when the same request gets another reply, e.g. the plan applied)
 *
 * @param {Element} panel The assistant card
 * @param {Element} node The reply just added
 * @param {Object} request The request {id, text}
 * @returns {undefined}
 */
function replyActions(panel, node, request) {
  const messages = panel.querySelector('.spread-assistant__messages');
  node.dataset.request = request.id;
  messages.querySelectorAll(`.spread-assistant__reply-actions[data-request="${request.id}"]`).forEach((bar) => bar.remove());
  const bar = element('div', 'spread-assistant__reply-actions');
  bar.dataset.request = request.id;
  // copy: the texts of all the replies to the request
  const copyTool = cardTool('spread-assistant__reply-action', 'tabler-copy', say('copy'), async () => {
    const replies = [...messages.querySelectorAll(`.spread-assistant__message[data-request="${request.id}"]`)].map((reply) => reply.innerText);
    const copied = typeof gtiz_file_handler !== 'undefined' && await gtiz_file_handler.copyToClipboard(replies.join('\n\n'));
    if (!copied) return;
    const icon = copyTool.querySelector('i');
    icon.className = 'tabler tabler-check';
    copyTool.classList.add('copied');
    setTimeout(() => {
      icon.className = 'tabler tabler-copy';
      copyTool.classList.remove('copied');
    }, 1500);
  });
  // retry: the same request sent again, on the current state of the data
  const retryTool = cardTool('spread-assistant__reply-action', 'tabler-refresh', say('retry'), () => {
    const textarea = panel.querySelector('.spread-assistant__form textarea');
    textarea.value = request.text;
    panel.querySelector('.spread-assistant__form').requestSubmit();
  });
  bar.append(copyTool, retryTool);
  // report: only when the request was not understood, and only while REPORT_REQUESTS is on
  const replies = () => [...messages.querySelectorAll(`.spread-assistant__message[data-request="${request.id}"]`)];
  if (REPORT_REQUESTS && replies().some((reply) => reply.hasAttribute('data-not-understood'))) {
    bar.append(cardTool('spread-assistant__reply-action', 'tabler-message-report', say('report'), () => reportRequest(panel, request, replies())));
  }
  node.after(bar);
}

/*
*
* Report of the requests not understood (round button under the reply, request
* and reply copied for an email): turned off for the moment (2026-11-24), true
* puts it back
*
*/
const REPORT_REQUESTS = false;

/**
 * Report a request that was not understood: request and reply go to the
 * clipboard and a note of the assistant says where to send them, the email of
 * the footer of the theme or, without one, the contacts of the footer
 *
 * @param {Element} panel The assistant card
 * @param {Object} request The request {id, text}
 * @param {Array} replies The replies to the request (elements)
 * @returns {Promise<undefined>}
 */
async function reportRequest(panel, request, replies) {
  const report = [
    `${say('feedback_request')}: ${request.text}`,
    `${say('feedback_reply')}: ${replies.map((reply) => reply.innerText.replace(/\s+/g, ' ').trim()).join(' ')}`,
    `${typeof gtiz_locales !== 'undefined' ? gtiz_locales.getActiveLanguageCode() : 'en'} · SPREAD ${SPREAD_VERSION}${LOADED_BUILD ? ` · ${LOADED_BUILD}` : ''}`
  ].join('\n');
  const copied = typeof gtiz_file_handler !== 'undefined' && await gtiz_file_handler.copyToClipboard(report);
  if (!copied) return;
  // note of the assistant after the last reply, without actions of its own
  const note = element('div', 'spread-assistant__message spread-assistant__message--assistant');
  const mail = document.querySelector('.footer-content a[href^="mailto:"]');
  if (mail) {
    const address = mail.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
    const link = element('a', 'spread-assistant__mail', address);
    link.href = `mailto:${address}?subject=${encodeURIComponent(say('feedback_subject'))}`;
    note.append(`${say('feedback_mail')} `, link, '.');
  } else note.textContent = say('feedback_footer');
  const messages = panel.querySelector('.spread-assistant__messages');
  const plan = messages.querySelector('.spread-assistant__plan');
  if (plan && !plan.hidden) plan.before(note);
  else messages.append(note);
  scrollToEnd(panel);
}

function clearPlan(panel) {
  pendingActions = [];
  lastProposedActions = [];
  panel.querySelector('.spread-assistant__plan').hidden = true;
  updateScroll(panel);
}
// Words of the plan steps and of the conditions (`assistant.steps` in js/i18n),
// so that a plan reads as plain language ("Seleziona i campioni con serovar
// Typhimurium e ST ST19", "Apri Metadati", "Colora per source"); French actions
// in the imperative. Keys of the operators of a condition:
const STEP_OPS = { eq: 'eq', in: 'eq', ne: 'ne', gt: 'gt', gte: 'gte', lt: 'lt', lte: 'lte', contains: 'contains', empty: 'empty', notempty: 'not_empty' };
const DATE_OPS = ['gt', 'gte', 'lt', 'lte'];
const SELECT_MODES = ['replace', 'add', 'remove'];

/**
 * A list of values in words: "A, B o C"
 *
 * @param {Array} values Values
 * @param {String} last Word before the last value ("o", "or", "ou")
 * @returns {String} The list
 */
function listWords(values, last) {
  if (values.length < 2) return String(values[0] ?? '');
  return `${values.slice(0, -1).join(', ')} ${last} ${values[values.length - 1]}`;
}

/**
 * A condition in words: "serovar Typhimurium e ST ST19"
 *
 * @param {Object} where Condition
 * @returns {String} The condition
 */
function describeWhere(where) {
  if (!where) return '';
  if (where.selected) return say('steps.selected');
  if (where.ids) return say('steps.ids', where.ids.join(', '));
  if (where.all) return where.all.map(describeWhere).join(` ${say('steps.and')} `);
  if (where.any) return where.any.map(describeWhere).join(` ${say('steps.or')} `);
  const value = Array.isArray(where.value) ? listWords(where.value, say('steps.or')) : where.value;
  // comparisons with a date (ISO or a bare year) read as before / after
  if (/^\d{4}(-\d{2}){0,2}$/.test(String(where.value)) && DATE_OPS.includes(where.op)) return say(`steps.dates.${where.op}`, where.column, value);
  const op = STEP_OPS[where.op];
  return op ? say(`steps.${op}`, where.column, value) : `${where.column} ${where.op} ${value ?? ''}`.trim();
}

/**
 * The samples a value change applies to, in words (empty for all)
 *
 * @param {Object} where Condition
 * @returns {String} "per i campioni con …", "per i campioni selezionati" or ""
 */
function describeScope(where) {
  if (!where) return '';
  return where.selected ? say('steps.for_selected') : say('steps.for_where', describeWhere(where));
}

/**
 * An option with its value: "Dimensione nodi: 200", and without the colon when
 * the label ends with a preposition: "Colora per source"
 *
 * @param {String} label Label of the option
 * @param {*} value Value, as shown
 * @returns {String} The step
 */
function optionStep(label, value) {
  return /\s(per|by|par)$/i.test(label) ? `${label} ${value}` : `${label}: ${value}`;
}

// Readable name of a plan step for the options of menus, settings and panels:
// panels are opened or closed; a switch shows the option it turns on (its
// label, e.g. "Mostra etichette") or turns its only label on or off; selects
// and numbers show their label and value.
function readableStep(entry, value) {
  const item = entry.item;
  const hasLabel = typeof item.label === 'function' || Boolean(item.label);
  const options = optionsOf(item);
  const index = options.findIndex((candidate) => String(candidate.value) === String(value));
  const option = options[index];
  const optionLabel = option ? stripTags(option.label) : '';
  if (entry.area === 'layout') return value === 'off' ? say('steps.close', optionLabel || item.type) : say('steps.open', optionLabel || item.type);
  if (option) {
    const distinct = new Set(options.map((candidate) => stripTags(candidate.label))).size === options.length;
    if (item.type === 'toggle' || !hasLabel) {
      if (distinct) return optionLabel;
      // the first option of a switch is the one that turns it on
      return index === 0 ? say('steps.on', optionLabel) : say('steps.off', optionLabel);
    }
    return optionStep(stripTags(labelOf(item)), optionLabel);
  }
  if (!hasLabel) {
    const twin = item.id && [...actionRegistry.values()].find((other) => other.item.id === `${item.id}-slider`);
    if (twin) return optionStep(stripTags(labelOf(twin.item)), value);
  }
  return '';
}

// A plan step in plain language (also used for the steps done and failed)
function describeAction(action) {
  const entry = actionRegistry.get(action.id);
  if (action.id === 'assistant:language' && entry) return `${stripTags(labelOf(entry.item))}: ${action.value}`;
  const readable = entry && action.value !== undefined && typeof action.value !== 'object' && !String(action.id).startsWith('assistant:') ? readableStep(entry, action.value) : '';
  if (readable) return readable;
  const label = entry ? stripTags(labelOf(entry.item)) : action.id;
  const value = action.value;
  if (value === undefined) return label;
  if (value && typeof value === 'object') {
    switch (action.id) {
      case 'assistant:metadata-add-column': {
        // "Add the column c", "with value “v”", the samples, ", “o” for the others"
        const other = value.where && value.otherValue ? say('steps.add_column_others', value.otherValue) : '';
        return [say('steps.add_column', value.column), value.value ? say('steps.add_column_value', value.value) : '', describeScope(value.where)].filter(Boolean).join(' ') + other;
      }
      case 'assistant:metadata-set': return [say('steps.set_values', value.column, value.value), describeScope(value.where)].filter(Boolean).join(' ');
      case 'assistant:metadata-rename-column': return say('steps.rename', value.from, value.to);
      case 'assistant:metadata-delete-column': return say('steps.delete_column', value.column);
      case 'assistant:metadata-sort': return say(value.direction === 'desc' ? 'steps.sort_descending' : 'steps.sort_ascending', value.column);
      case 'assistant:metadata-replace-all': return say('steps.replace_all', value.category, value.value);
      case 'assistant:select':
        if (value.mode === 'all') return say('steps.select_all');
        if (value.mode === 'clear') return say('steps.select_clear');
        return say(`steps.select.${SELECT_MODES.includes(value.mode) ? value.mode : 'replace'}`, describeWhere(value.where));
      default: break;
    }
    const { category, id, colour, latitude, longitude } = value;
    if (latitude !== undefined) return `${label}: ${latitude}, ${longitude}`;
    if (id === undefined) return optionStep(label, `${category} ${value.value}`);
    // a sample (by ID) or a value of a column (e.g. highlight “red”)
    return say('steps.colour', !category || category === 'ID' ? id : `${category} “${id}”`, colour);
  }
  return optionStep(label, value);
}

const AUTO_KEY = 'spread-assistant-auto-apply';
function autoApply() { try { return localStorage.getItem(AUTO_KEY) === '1'; } catch (_) { return false; } }

function showPlan(panel, actions, { ask = false } = {}) {
  pendingActions = actions;
  lastProposedActions = actions.map((action) => ({ id: action.id, value: action.value }));
  panel.querySelector('.spread-assistant__plan-title').textContent = ask ? say('suggest_title') : say('plan');
  const list = panel.querySelector('.spread-assistant__plan ol');
  list.replaceChildren(...actions.map((action) => {
    const item = document.createElement('li');
    item.textContent = describeAction(action);
    return item;
  }));
  // the plan box goes after the last message of the conversation
  const plan = panel.querySelector('.spread-assistant__plan');
  panel.querySelector('.spread-assistant__messages').append(plan);
  plan.hidden = false;
  scrollToEnd(panel);
  // A language change reloads the page, so it always asks first.
  // Guesses from the example bank always wait for the user's confirmation.
  if (!ask && autoApply() && !actions.some((action) => action.id === 'assistant:language')) confirm(panel);
}

/**
 * The steps of a plan applied, one per line with the check icon in line before
 * the text; when a step fails, that step with the x icon and why, then the
 * steps not run, suspended, with the tilde and in a lighter colour
 *
 * @param {Array} done Steps applied, in words
 * @param {Object} [failed] The step that failed {action, error}
 * @param {Array} [skipped] Steps after the failed one, not run (actions)
 * @returns {Element} The list
 */
function stepsList(done, failed, skipped = []) {
  const list = element('ul', 'spread-assistant__steps');
  const row = (icon, text, cls) => {
    const item = element('li', cls);
    item.append(element('i', `tabler ${icon}`), element('span', '', text));
    return item;
  };
  done.forEach((text) => list.append(row('tabler-check', text)));
  if (failed) list.append(row('tabler-x', `${describeAction(failed.action)}: ${failed.error.message}`));
  skipped.forEach((action) => list.append(row('tabler-tilde', describeAction(action), 'spread-assistant__step--skipped')));
  return list;
}

/*
*
* "Undo" of the last plan applied, as "Undo macro" (js/macros.js): the session
* before and after the plan is kept; the round button under the replies to the
* request loads the one before, asking first when the session changed after the
* plan. Plans that change nothing (questions, counts, exports) have no undo. A
* plan applied clears the undo history of the tree (js/history.js).
*
*/
let planUndo = null;

/**
 * The session as a text, to keep it and to load it again
 *
 * @returns {String|null} The complete object of SPREAD, null without a tree
 */
function sessionText() {
  return typeof gtiz_tree !== 'undefined' && gtiz_tree.tree ? JSON.stringify(gtiz_tree.getCompleteGrapeTreeObject()) : null;
}

/**
 * Tell if two sessions differ in what a plan can change (positions, view and
 * notes left out, as for the macros)
 *
 * @param {String} first Session text
 * @param {String} second Session text
 * @returns {Boolean} True when they differ
 */
function sessionsDiffer(first, second) {
  if (!first || !second || typeof gtiz_macros === 'undefined') return false;
  return gtiz_macros.comparableSession(JSON.parse(first)) !== gtiz_macros.comparableSession(JSON.parse(second));
}

/**
 * Remove the undo of the previous plan: only the last one can be undone
 *
 * @param {Element} panel The assistant card
 * @returns {undefined}
 */
function dropPlanUndo(panel) {
  planUndo = null;
  panel.querySelectorAll('.spread-assistant__reply-action--undo').forEach((tool) => tool.remove());
}

/**
 * Keep the sessions of a plan just applied and add its undo under the replies
 * to the request
 *
 * @param {Element} panel The assistant card
 * @param {Object} request The request {id, text}
 * @param {String} before Session before the plan
 * @param {String} after Session after the plan
 * @returns {undefined}
 */
function setPlanUndo(panel, request, before, after) {
  dropPlanUndo(panel);
  if (!request) return;
  planUndo = { before, after };
  const bar = panel.querySelector(`.spread-assistant__reply-actions[data-request="${request.id}"]`);
  if (bar) bar.append(cardTool('spread-assistant__reply-action spread-assistant__reply-action--undo', 'tabler-arrow-back-up', say('undo_title'), () => undoPlan(panel)));
}

/**
 * Undo the last plan; when the session changed after it, ask first
 *
 * @param {Element} panel The assistant card
 * @returns {undefined}
 */
function undoPlan(panel) {
  if (!planUndo) return;
  if (!sessionsDiffer(sessionText(), planUndo.after)) {
    applyPlanUndo(panel);
    return;
  }
  const text = element('p', '', say('undo_confirm'));
  const actions = element('div', 'modal-confirm-actions');
  const undo = element('button', 'button-danger');
  undo.append(element('i', 'tabler tabler-arrow-back-up'), ` ${say('undo')}`);
  undo.addEventListener('click', () => {
    gtiz_modal.closeModal();
    applyPlanUndo(panel);
  });
  // the other choice only closes: nothing changes
  const close = element('button', 'button-tertiary-outline');
  close.append(element('i', 'tabler tabler-circle-x'), ` ${stripTags(gtiz_locales.current.close)}`);
  close.addEventListener('click', () => gtiz_modal.closeModal());
  actions.append(undo, close);
  gtiz_modal.buildModal(say('undo'), [text, actions]);
}

/**
 * Load the session as it was before the last plan
 *
 * @param {Element} panel The assistant card
 * @returns {Promise|undefined} Resolved when the tree is built
 */
function applyPlanUndo(panel) {
  if (!planUndo) return undefined;
  const { before } = planUndo;
  dropPlanUndo(panel);
  gtiz_layout.uiLoadingManager(['tree', 'map', 'metadata', 'legend'], 'add');
  gtiz_tree.current_metadata_file = null;
  // the notes are not part of what a plan changes: the ones in memory stay
  if (typeof gtiz_notes !== 'undefined') gtiz_notes.keep_session = true;
  return gtiz_file_handler.loadTreeText(before, true);
}

// Each step is validated against the state left by the previous one, so a
// plan can create a column and then colour by it.
async function confirm(panel) {
  const done = [];
  const applied = [];
  const steps = pendingActions.slice();
  const request = currentRequest;
  // the session before the plan, for its undo; meanwhile the undo history of the tree does not record
  const before = sessionText();
  const history_paused = typeof gtiz_history !== 'undefined';
  if (history_paused) gtiz_history.suspended++;
  // Apply and Cancel are links: they wait while the plan runs
  panel.classList.add('is-running');
  try {
    for (const [index, action] of steps.entries()) {
      try {
        lastMacroRun = null;
        done.push(execute(action));
        applied.push({ id: action.id, value: action.value });
        history.push({ id: action.id, value: action.value });
        history = history.slice(-200);
        lastAppliedPlan = applied.slice();
        // a macro runs its steps asynchronously: wait for it before the next step
        if (lastMacroRun) {
          const results = await lastMacroRun;
          const skipped = results.filter((result) => !result.ok);
          if (skipped.length) addMessage(panel, 'warning', skipped.map((result) => `${gtiz_macros.stepParts(result.step).text} (${stripTags(gtiz_locales.current[`macro_skip_${result.reason}`] || result.reason)})`).join('\n'), say('macro_run_skipped'));
        }
      } catch (error) {
        // one message: the steps done, the step that failed and why, the steps not run
        addMessage(panel, 'warning', stepsList(done, { action, error }, steps.slice(index + 1)), say('not_applied'));
        return;
      }
      // SPREAD propagates some changes asynchronously (e.g. tree selection to
      // the metadata grid): let them settle before the next step, as a user would.
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    addMessage(panel, 'success', stepsList(done));
    // layout changes go through the toggles: SPREAD's size observer resizes tree, map and legend
  } finally {
    panel.classList.remove('is-running');
    clearPlan(panel);
    if (history_paused) gtiz_history.suspended--;
    // a plan that changed the session can be undone; the history of the tree no longer applies
    const after = applied.length ? sessionText() : null;
    if (after && sessionsDiffer(before, after)) {
      if (history_paused) gtiz_history.clear();
      setPlanUndo(panel, request, before, after);
    }
  }
}

// Fixed phrasings for short, unambiguous requests (tree zoom, centre, panels,
// log scale, colour by).  They run before the generic catalog resolver so an
// appends a hallucinated tool call.  These are merged only for commands whose
// target and value are both present in the live SPREAD configuration.
function mandatoryActions(request, refresh = true) {
  // the registry is rebuilt unless the caller has just done it (dry runs of the examples)
  if (refresh) refreshRegistry();
  const normalizedRequest = normalizeTerms(request);
  const result = [];
  const tree = typeof gtiz_tree !== 'undefined' ? gtiz_tree.tree : undefined;
  const columns = tree && tree.metadata_info ? Object.keys(tree.metadata_info) : [];
  const refersOnlyToMap = /\b(map|mappa|carte)\b/.test(normalizedRequest) &&
    !/\b(tree|mst|albero|arbre)\b/.test(normalizedRequest);
  if (!refersOnlyToMap && /\b(zoom|zooma|zoomare|ingrandisci|ingrandire|riduci|ridurre)\b/.test(normalizedRequest)) {
    const entry = actionRegistry.get('assistant:tree-zoom');
    const amount = request.match(/\b(\d+(?:[,.]\d+)?)\s*(?:x|volte|times)?\b/i);
    if (entry && amount) {
      let factor = Number(amount[1].replace(',', '.'));
      if (/\b(riduci|ridurre|out|meno)\b/.test(normalizedRequest)) factor = 1 / factor;
      if (Number.isFinite(factor) && factor >= entry.item.min && factor <= entry.item.max) result.push({ id: entry.id, value: factor });
    }
  }
  if (!refersOnlyToMap && /\b(ricentra|ricentrare|centra|centrare|recenter|center|centre)\b/.test(normalizedRequest)) {
    const entry = [...actionRegistry.values()].find(({ item }) => /\b(centra|center|centre)\b/.test(normalizeTerms(labelOf(item))) && item.type === 'abutton');
    if (entry) result.push({ id: entry.id });
  }
  if (/\b(tutti|tutte|ogni|all|every|tous|toutes)\b/.test(normalizedRequest) && /\b(valori|values|valeurs)\b/.test(normalizedRequest) && /\b(colonna|column|colonne|metadati|metadata)\b/.test(normalizedRequest)) {
    const entry = actionRegistry.get('assistant:metadata-replace-all');
    const requestedColumn = request.match(/(?:in the (.+?) column to|nella colonna (.+?) tutti i valori a)/i);
    const column = columns.find((value) => normalizeTerms(value) === normalizeTerms(requestedColumn?.[1] || requestedColumn?.[2]));
    const replacement = request.match(/(?:\bcolumn to|\bvalori a)\s+(.+)$/i)?.[1].trim();
    if (entry && column && replacement) result.push({ id: entry.id, value: { category: column, value: replacement.replace(/^"([^"]*)"$/, '$1') } });
  }
  if (/\b(scala|scale)\b/.test(normalizedRequest) && /\b(logaritmica|logarithmic|logarithmique|log)\b/.test(normalizedRequest)) {
    const disable = /\b(togli|rimuovi|disattiva|leva|levare|senza|remove|disable|turn off|off|enleve|desactive)\b/.test(normalizedRequest);
    const entry = [...actionRegistry.values()].find(({ item }) => item.id === 'tree-branch-toggle-log-scale');
    if (entry) {
      result.push({ id: entry.id, value: disable ? 'not-active' : 'active' });
    }
  }
  if (/\b(colora|colore|color)\b/.test(normalizedRequest)) {
    const requestedColumn = normalizedRequest.match(/\b(?:per|by) (.+)$/)?.[1];
    const column = columns.find((value) => normalizeTerms(value) === requestedColumn) ||
      (requestedColumn === 'regione' ? columns.find((value) => normalizeTerms(value) === 'region') : undefined);
    const entry = [...actionRegistry.values()].find(({ item }) => {
      const values = optionsOf(item).map((option) => String(option.value));
      return normalizeTerms(labelOf(item)).includes('color') && values.some((value) => columns.includes(value));
    });
    if (entry && column) result.push({ id: entry.id, value: column });
  }
  if (/\b(apri|mostra|visualizza|open|show|chiudi|nascondi|close|hide|ferme)\b/.test(normalizedRequest)) {
    // the full screen of the page (a tool of the top bar), then the layout toggles
    // (the video is no more among them)
    const fullScreen = /\b(schermo intero|tutto schermo|full ?screen|plein ecran)\b/.test(normalizedRequest);
    const aliases = fullScreen ? {} : {
      mappa: 'map', metadati: 'metadata', impostazioni: 'settings', legenda: 'legend',
      map: 'map', metadata: 'metadata', settings: 'settings', legend: 'legend'
    };
    const target = Object.keys(aliases).find((word) => normalizedRequest.includes(word));
    if (target) {
      const entry = [...actionRegistry.values()].find(({ area, item }) => area === 'layout' && normalizeTerms(`${item.type} ${labelOf(item)}`).includes(aliases[target]));
      const close = /\b(chiudi|nascondi|close|hide|ferme)\b/.test(normalizedRequest);
      if (entry) result.push({ id: entry.id, value: close ? 'off' : 'on' });
    }
    if (fullScreen && actionRegistry.has('topbar:full-screen')) {
      const close = /\b(chiudi|esci|close|exit|ferme|quitte)\b/.test(normalizedRequest);
      result.push({ id: 'topbar:full-screen', value: close ? 'off' : 'on' });
    }
  }
  return result;
}

// Reply to "help": the titles of the sections are in `assistant.help_sections`
// of js/i18n, the examples stay here because they are requests the assistant
// must understand (French falls back to the English examples).
const HELP = {
  it: [
    ['filters', 'dammi i metadati dove regione è Abruzzo e source è food · quanti campioni ci sono nel 2026? · togli il filtro'],
    ['selection', 'seleziona i campioni con data dopo il 2026-01-10 · seleziona Lazio o Toscana · deseleziona tutto'],
    ['selection_action', 'nascondi i campioni di Teramo · collassa quelli del cluster A · mostra solo i campioni confermati'],
    ['colours', 'colora per sierotipo · colora di rosso la Toscana · seleziona Teramo e colorali di blu'],
    ['columns', 'aggiungi la colonna focolaio con valore sì per i selezionati · rinomina matrix in matrice · elimina la colonna note'],
    ['values', 'sostituisci Roma con Rieti nella colonna provincia · imposta outcome a confirmed dove cluster è A'],
    ['table', 'ordina la tabella per data decrescente · esporta la tabella in tsv'],
    ['tree_map', 'mostra le etichette dei nodi · scala logaritmica · dimensione nodi 200 · dezooma 2x · mappa di calore'],
    ['panels', 'apri la mappa · chiudi la legenda · riproduci il video · velocità del video 2x'],
    ['macros', 'registra gli ultimi 3 passaggi come macro Teramo · dammi la lista delle macro · esegui la macro Teramo'],
    ['language', 'cambia lingua in inglese (ricarica la pagina)']
  ],
  en: [
    ['filters', 'show me the metadata where region is Abruzzo and source is food · how many samples are from 2026? · clear the filter'],
    ['selection', 'select samples with date after 2026-01-10 · select Lazio or Toscana · deselect all'],
    ['selection_action', 'hide the samples from Teramo · collapse cluster A · show only confirmed samples'],
    ['colours', 'colour by serovar · make Toscana red · select Teramo and colour them blue'],
    ['columns', 'add a column named outbreak with value yes for the selected · rename column matrix to sample_matrix · delete the notes column'],
    ['values', 'replace Roma with Rieti in the province column · set outcome to confirmed where cluster is A'],
    ['table', 'sort the table by date descending · export the table as tsv'],
    ['tree_map', 'show node labels · log scale · node size 200 · zoom out 2x · heatmap'],
    ['panels', 'open the map · close the legend · play the timeline · timeline speed 2x'],
    ['macros', 'record the last 3 steps as macro Teramo · list the macros · run macro Teramo'],
    ['language', 'switch language to Italian (reloads the page)']
  ]
};

function helpReply(request) {
  const words = normalizeTerms(request);
  if (!/^(?:aiuto|help|aide|\?|cosa sai fare|che cosa sai fare|cosa puoi fare|cosa posso (?:fare|chiedere|scrivere)|comandi|esempi|what can you do|what can i (?:ask|do|say)|commands|examples|que sais tu faire|que peux tu faire|commandes|exemples)\b/.test(words)) return '';
  const lang = (typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en';
  const sections = HELP[lang] || HELP.en;
  return `${say('help')}\n${sections.map(([key, examples]) => `• ${say(`help_sections.${key}`)}: ${examples}`).join('\n')}`;
}

function factualReply(request) {
  const help = helpReply(request);
  if (help) return help;
  const normalizedRequest = normalizeTerms(request);
  if (/\b(versione|version|release)\b/.test(normalizedRequest) && /\b(spread|applicazione|application|app)\b/.test(normalizedRequest)) return say('version', SPREAD_VERSION);
  return '';
}

function videoCommand(request) {
  const words = normalizeTerms(request);
  if (/^(?:play|resume|riproduci|avvia|riprendi|lire) (?:the |il |la )?(?:video|timeline)$/.test(words)) return { id: 'video-player:play' };
  if (/^(?:pause|metti in pausa|pausa) (?:the |il |la )?(?:video|timeline)$/.test(words)) return { id: 'video-player:pause' };
  const speed = request.match(/^(?:set (?:the )?(?:video|timeline|playback) speed to|imposta (?:la )?velocità del video a) (\d+(?:[,.]\d+)?)\s*x[.!]?$/i);
  if (speed) return { id: 'video-player:speed', value: Number(speed[1].replace(',', '.')) };
  const seek = request.match(/^(?:seek (?:the )?(?:video|timeline) to|porta il video al) (\d+(?:[,.]\d+)?)\s*%[.!]?$/i);
  if (seek) return { id: 'video-player:seek', value: Number(seek[1].replace(',', '.')) };
  return null;
}

function mapCommand(request) {
  const words = normalizeTerms(request);
  if (/^(?:fit (?:the )?map to all markers|inquadra tutti i marcatori|ricentra (?:la )?mappa)$/.test(words)) return { id: 'map-view:fit' };
  const factor = request.match(/^(?:zoom(?:a)? (?:the |la )?(?:map|mappa)(?: by)?|zoom (in|out) on (?:the )?map) (\d+(?:[.,]\d+)?)\s*x[.!]?$/i);
  if (factor) {
    const value = Number(factor[2].replace(',', '.'));
    return { id: 'map-view:zoom', value: factor[1]?.toLowerCase() === 'out' ? 1 / value : value };
  }
  const level = request.match(/^(?:set (?:the )?map zoom (?:level )?to|imposta lo zoom della mappa a) (\d+(?:[.,]\d+)?)[.!]?$/i);
  if (level) return { id: 'map-view:level', value: Number(level[1].replace(',', '.')) };
  const coordinates = request.match(/^(?:cent(?:er|re) (?:the )?map (?:at|on)|centra (?:la )?mappa a) (-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)[.!]?$/i);
  return coordinates ? { id: 'map-view:center', value: { latitude: Number(coordinates[1]), longitude: Number(coordinates[2]) } } : null;
}

function directActions(request, refresh = true) {
  // the registry is rebuilt unless the caller has just done it (dry runs of the examples)
  if (refresh) refreshRegistry();
  const tree = typeof gtiz_tree !== 'undefined' ? gtiz_tree.tree : undefined;
  const colour = namedColourCommand(request, tree);
  if (colour) return colour.id ? [{ id: 'assistant:node-colour', value: colour }] : [];
  const action = videoCommand(request) || mapCommand(request);
  if (action) return [action];
  const words = normalizeTerms(request);
  const simpleZoom = /^zoom(?:a)? \d+(?:[.,]\d+)?\s*x[.!]?$/i.test(request);
  const simpleCenter = /^(?:recenter|ricentra|centra)(?: (?:the |il )?(?:mst|tree|albero))?$/.test(words);
  const simpleLayout = /^(?:open|close|show|hide|apri|chiudi|mostra|nascondi) (?:(?:the|la|il|i|le) )?(?:map|mappa|legend|legenda|settings|impostazioni|metadata|metadati|video|full screen|schermo intero)$/.test(words);
  const simpleMetadata = /^(?:set all values in the .+ column to|riscrivi nella colonna .+ tutti i valori a) .+$/i.test(request);
  const simpleLogScale = /^(?:attiva|disattiva|togli|rimuovi|abilita|imposta|metti|enable|disable|remove|turn on|turn off|set|devi levare|leva|levare) (?:(?:the|la) )?(?:scala logaritmica|logarithmic scale)$/.test(words);
  const colorColumn = words.match(/^(?:colora (?:l albero )?per|colou?r (?:the tree )?by) (.+)$/)?.[1];
  const simpleColorBy = Object.keys(tree?.metadata_info || {}).some((column) =>
    normalizeTerms(column) === colorColumn || (colorColumn === 'regione' && normalizeTerms(column) === 'region'));
  if (simpleZoom || simpleCenter || simpleLayout || simpleMetadata || simpleLogScale || simpleColorBy) {
    return mandatoryActions(request, refresh);
  }
  return null;
}

function validateProposedAction(action, virtual) {
  const item = actionRegistry.get(action.id)?.item;
  if (typeof item?.function !== 'function') return false;
  if (action.deferred) return true;
  try { validate(item, action.value, virtual); return true; }
  catch (_) { return false; }
}

function proposalError(action, virtual) {
  const item = actionRegistry.get(action.id)?.item;
  if (typeof item?.function !== 'function') return say('invalid');
  if (action.deferred) return '';
  try { validate(item, action.value, virtual); return ''; }
  catch (error) { return error.message; }
}

// Deterministic resolution of one clause.  Returns { actions } or { error }
// or null when nothing matched.
function resolveClause(request, search) {
  const ctx = buildContext(search.ctx);
  search.ctx = ctx;
  const virtual = ctx.columns.filter((column) => !liveColumns().includes(column));
  const accept = (actions) => {
    for (const action of actions) {
      const problem = proposalError(action, virtual);
      if (problem) return { error: problem };
    }
    return { actions };
  };
  const strict = videoCommand(request) || mapCommand(request);
  if (strict) return accept([strict]);
  const result = interpret(request, ctx, (clause) => directActions(clause));
  if (result?.error) return result;
  if (result?.macro) {
    const handled = handleMacro(result.macro);
    return handled.actions ? accept(handled.actions) : { note: handled };
  }
  if (result?.stats) return { note: statsMessage(result.stats) };
  if (result?.locate) return { note: locationMessage(result.locate) };
  if (result?.query) {
    const note = queryMessage(result.query);
    if (note.empty || !result.actions?.length) return { note };
    const accepted = accept(result.actions);
    return accepted.actions ? { ...accepted, note } : accepted;
  }
  if (result?.actions?.length) {
    // Planned schema changes are visible to the following clauses.
    for (const action of result.actions) {
      if (action.id === 'assistant:metadata-delete-column') (ctx.removed ||= new Set()).add(action.value.column);
      if (action.id === 'assistant:metadata-rename-column') (ctx.removed ||= new Set()).add(action.value.from);
    }
    // Keep where the answer came from: weak catalog guesses can be replaced by the example bank.
    const accepted = accept(result.actions);
    return accepted.actions ? { ...accepted, source: result.source, score: result.score, slot: result.slot } : accepted;
  }
  return null;
}

/*
*
* Example bank (js/assistant-examples.js): loaded the first time the parser is
* unsure, then indexed for the options of the live catalog.
*
*/
const exampleBank = { data: null, index: null, keys: '' };

/**
 * Index of the example bank for the current catalog.
 * @param {object[]} catalog live catalog entries
 * @returns {Promise<object|null>} the index, or null when the bank cannot be loaded
 */
async function exampleIndex(catalog) {
  if (!exampleBank.data) {
    try {
      const response = await fetch(new URL(`./assistant-examples.json?v=${LOADED_BUILD}`, import.meta.url));
      if (!response.ok) return null;
      exampleBank.data = await response.json();
    } catch (_) { return null; }
  }
  const keys = catalog.map((entry) => entry.key).sort().join('\n');
  if (exampleBank.keys !== keys) {
    exampleBank.index = buildIndex(exampleBank.data, new Set(catalog.map((entry) => entry.key)));
    exampleBank.keys = keys;
  }
  return exampleBank.index;
}

/**
 * The option the example bank proposes when the parser is unsure.
 * @param {string} request one clause
 * @param {object} ctx the context resolveClause used
 * @param {object|null} result the parser's answer
 * @returns {Promise<{entry: object, action: object|null, similarity: number}|null>}
 */
async function offerFromExamples(request, ctx, result) {
  if (!isWeak(result) || !ctx?.catalog) return null;
  const index = await exampleIndex(ctx.catalog);
  if (!index) return null;
  const offer = proposal({ result, matches: matchExamples(index, request), catalog: ctx.catalog, text: request, valueFor });
  if (offer?.action && proposalError(offer.action, [])) offer.action = null;
  return offer;
}

// Empty the conversation and any pending plan; keep the intro, the examples
// (shown again) and the plan box.
function clearChat(panel) {
  clearPlan(panel);
  currentRequest = null;
  const messages = panel.querySelector('.spread-assistant__messages');
  [...messages.children].forEach((node, index) => {
    if (index > 0 && !node.classList.contains('spread-assistant__plan')) node.remove();
  });
  // a clean chat starts with new examples
  renderExamples(panel, { rotate: true });
  messages.scrollTop = 0;
  updateScroll(panel);
}

async function runClauses(panel, clauses) {
  const search = { clauses, plan: [], unresolved: [] };
  let asked = false;
  for (const request of clauses) {
    const fact = factualReply(request);
    if (fact) {
      addMessage(panel, 'assistant', fact);
      continue;
    }
    let result;
    try { result = resolveClause(request, search); }
    catch (error) { result = { error: error.message }; }
    // When the parser is unsure, the closest examples may name the option.
    const offer = await offerFromExamples(request, search.ctx, result);
    if (offer) {
      logUnresolved(request, `proposed:${offer.entry.key}`);
      const prefix = clauses.length > 1 ? `“${request}” — ` : '';
      if (offer.action) {
        addMessage(panel, 'assistant', prefix + say('suggest', describeAction(offer.action)));
        search.plan.push(offer.action);
        asked = true;
      } else {
        const note = locationMessage({ id: offer.entry.id, query: request });
        addMessage(panel, 'assistant', `${prefix}${say('suggest_where')}\n${note.message}`);
        if (note.reveal) showLocation(note.reveal);
      }
      continue;
    }
    if (result?.note) addMessage(panel, result.note.warning ? 'warning' : 'assistant', result.note.node ? result.note.node() : result.note.message);
    if (result?.note?.reveal) showLocation(result.note.reveal);
    if (result?.actions) {
      search.plan.push(...result.actions);
      continue;
    }
    if (result?.note) continue;
    if (result?.error) {
      search.unresolved.push({ request, reply: result.error });
      continue;
    }
    logUnresolved(request, 'no-match');
    // the header says it was not understood: the text only suggests how to ask
    search.unresolved.push({ request, reply: null });
  }
  // the last message not understood ends with three examples, pertinent to the
  // requests not understood (column, value or operation) or in rotation
  const examples = search.unresolved.length ? pickExamples(search.unresolved.map(({ request }) => request).join(' ')) : [];
  search.unresolved.forEach(({ request, reply }, index) => {
    const last = index === search.unresolved.length - 1;
    // a request with no hook: how to ask, with the examples below (the generic
    // hint without data); an earlier one only quotes the request
    let text = reply;
    if (text === null) text = last ? say(examples.length ? 'hint_intro' : 'hint') : '';
    const line = clauses.length > 1 ? (text ? `“${request}” — ${text}` : `“${request}”`) : text;
    if (!last || !examples.length) return addMessage(panel, 'warning', line, say('not_understood'));
    const content = document.createDocumentFragment();
    content.append(element('div', 'spread-assistant__message-text', line), examplesBox(examples));
    addMessage(panel, 'warning', content, say('not_understood'));
  });
  if (search.plan.length) showPlan(panel, search.plan, { ask: asked });
}

// Dry run used by the panel and by tests: the plan for a message, unexecuted.
function planFor(message) {
  const search = { clauses: splitClauses(message), plan: [], unresolved: [] };
  for (const request of search.clauses) {
    let result;
    try { result = resolveClause(request, search); }
    catch (error) { result = { error: error.message }; }
    if (result?.note) (search.notes ||= []).push(result.note.message);
    if (result?.actions) search.plan.push(...result.actions);
    else if (!result?.note) search.unresolved.push({ request, reply: result?.error || 'no-match' });
  }
  return { notes: search.notes || [], clauses: search.clauses, plan: search.plan.map((action) => ({ id: action.id, value: action.value })), unresolved: search.unresolved, description: search.plan.map(describeAction) };
}

// Sent prompts, newest last; ↑/↓ in the input walk through them like a shell.
const PROMPTS_KEY = 'spread-assistant-prompts';
const PROMPTS_LIMIT = 100;
const promptCursor = { index: -1, draft: '' };

function readPrompts() {
  try { return JSON.parse(localStorage.getItem(PROMPTS_KEY) || '[]'); }
  catch (_) { return []; }
}

function rememberPrompt(message) {
  const prompts = readPrompts().filter((prompt) => prompt !== message);
  prompts.push(message);
  try { localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts.slice(-PROMPTS_LIMIT))); } catch (_) { /* storage unavailable */ }
  promptCursor.index = -1;
  promptCursor.draft = '';
}

// Returns true when the key was used to move through the history.
function browsePrompts(textarea, direction) {
  const prompts = readPrompts();
  if (!prompts.length) return false;
  const before = textarea.value.slice(0, textarea.selectionStart);
  const after = textarea.value.slice(textarea.selectionEnd);
  // In a multi-line prompt the arrows move the caret, except on the first/last line.
  if (direction < 0 && before.includes('\n')) return false;
  if (direction > 0 && after.includes('\n')) return false;
  if (direction > 0 && promptCursor.index === -1) return false;
  if (promptCursor.index === -1) {
    promptCursor.draft = textarea.value;
    promptCursor.index = prompts.length;
  }
  const next = Math.min(Math.max(promptCursor.index + direction, 0), prompts.length);
  if (next === promptCursor.index && direction < 0) return true;
  promptCursor.index = next;
  textarea.value = next === prompts.length ? promptCursor.draft : prompts[next];
  if (next === prompts.length) promptCursor.index = -1;
  const end = textarea.value.length;
  textarea.setSelectionRange(end, end);
  return true;
}

function submit(event, panel) {
  event.preventDefault();
  const input = event.currentTarget.querySelector('textarea');
  // Typographic quotes and apostrophes (macOS/iOS autocorrect) read as plain ones.
  const message = input.value.replace(/[’‘ʼ]/g, "'").trim();
  if (!message) return;
  if (/^(?:pulisci|svuota|cancella|azzera|clear|reset|empty|efface|vide)\s+(?:la\s+|the\s+|la\s+)?(?:chat|conversazione|conversation|cronologia della chat|messaggi|messages)\s*[.!]?$/i.test(message)) {
    input.value = '';
    rememberPrompt(message);
    clearChat(panel);
    return;
  }
  clearPlan(panel);
  // the examples (of the start and of the requests not understood) leave with a new request
  panel.querySelectorAll('.spread-assistant__examples').forEach((box) => box.remove());
  addMessage(panel, 'user', message);
  currentRequest = { id: ++requestCount, text: message };
  rememberPrompt(message);
  input.value = '';
  runClauses(panel, splitClauses(message));
}

// The deployed build is in js/assistant-version.json.  An open page polls it
// and tells the user to reload when a newer assistant has been published.
const LOADED_BUILD = new URL(import.meta.url).searchParams.get('v') || '';
function watchForUpdates(panel) {
  if (!LOADED_BUILD) return;
  const check = async () => {
    try {
      const response = await fetch(new URL('./assistant-version.json', import.meta.url), { cache: 'no-store' });
      if (!response.ok) return;
      const { build } = await response.json();
      if (build && String(build) !== LOADED_BUILD) {
        panel.querySelector('.spread-assistant__update').hidden = false;
      }
    } catch (_) { /* offline or file missing: ignore */ }
  };
  check();
  setInterval(check, 60000);
}

// Example prompts built from the loaded data, so they always make sense.
function exampleColumns() {
  const rows = gtiz_tree?.tree ? metadataRows() : [];
  const skip = new Set([...protectedColumns(), 'latitude', 'longitude', 'lat', 'lon', 'lng', 'x', 'y', ...Object.values({ it: 'evidenziati', en: 'highlight', fr: 'surbrillance' })]);
  const stats = liveColumns().filter((column) => !skip.has(column)).map((column) => {
    const values = rows.map((row) => String(row[column] ?? '').trim()).filter(Boolean);
    return { column, values, distinct: new Set(values).size, date: values.length > 0 && values.every((value) => /^\d{4}-\d{2}-\d{2}/.test(value)) };
  });
  return { rows, categorical: stats.filter((stat) => !stat.date && stat.distinct >= 2 && stat.distinct <= 15), date: stats.find((stat) => stat.date) };
}

// Requests built from the loaded data, in the language in use; they stay in the
// code (not in js/i18n) because the assistant must understand them as written.
// `op` groups them by operation, to show different ones and the pertinent ones.
const EXAMPLE_TEMPLATES = {
  it: { colour: (c) => `colora l'albero per ${c}`, filter: (a, x, b, y) => `dammi i metadati dove ${a} è ${x} e ${b} è ${y}`, hide: (c, x) => `seleziona i campioni con ${c} ${x} e nascondili`, after: (c, d) => `seleziona i campioni con ${c} dopo il ${d} e collassali`, sort: (c) => `ordina la tabella per ${c} decrescente`, count: (c, x) => `quanti campioni hanno ${c} ${x}?`, groups: (c) => `quanti campioni per ${c}?` },
  en: { colour: (c) => `colour the tree by ${c}`, filter: (a, x, b, y) => `show me the metadata where ${a} is ${x} and ${b} is ${y}`, hide: (c, x) => `select samples with ${c} ${x} and hide them`, after: (c, d) => `select samples with ${c} after ${d} and collapse them`, sort: (c) => `sort the table by ${c} descending`, count: (c, x) => `how many samples have ${c} ${x}?`, groups: (c) => `how many samples per ${c}?` },
  fr: { colour: (c) => `colorer l'arbre par ${c}`, filter: (a, x, b, y) => `montre les métadonnées où ${a} est ${x} et ${b} est ${y}`, hide: (c, x) => `sélectionne les échantillons avec ${c} ${x} et masque-les`, after: (c, d) => `sélectionne les échantillons avec ${c} après ${d}`, sort: (c) => `trie le tableau par ${c} décroissant`, count: (c, x) => `combien d'échantillons ont ${c} ${x} ?`, groups: (c) => `combien d'échantillons par ${c} ?` }
};
// Words of a request that point to an operation (normalized, all languages)
const EXAMPLE_OPS = {
  colour: ['colora', 'colori', 'colore', 'colour', 'color', 'colorer', 'colorie', 'couleur'],
  sort: ['ordina', 'ordinare', 'sort', 'order', 'trie', 'trier'],
  select: ['seleziona', 'select', 'selectionne', 'nascondi', 'hide', 'masque', 'collassa', 'collapse'],
  count: ['quanti', 'quante', 'conta', 'many', 'count', 'combien'],
  filter: ['dammi', 'mostra', 'filtra', 'show', 'filter', 'montre', 'filtre', 'dove', 'where']
};
const exampleCache = { key: '', pool: [] };
// examples shown last: the rotation avoids them when it can
let recentExamples = new Set();

/**
 * All the examples for the loaded data, each checked with the parser of the
 * assistant: only the ones it understands; cached until the data or the
 * language change
 *
 * @returns {Array} Examples {text, op, columns, values}
 */
function examplePool() {
  const lang = (typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en';
  const words = EXAMPLE_TEMPLATES[lang];
  const { rows, categorical, date } = exampleColumns();
  if (!words || !rows.length) return [];
  const key = `${lang}|${rows.length}|${liveColumns().join(',')}`;
  if (exampleCache.key === key) return exampleCache.pool;
  const candidates = [];
  const add = (text, op, columns, values = []) => candidates.push({ text, op, columns, values });
  // the most frequent values of each categorical column, at most six columns
  const columns = categorical.slice(0, 6).map((stat) => {
    const counts = new Map();
    stat.values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return { column: stat.column, values: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([value]) => value) };
  });
  columns.forEach(({ column, values }) => {
    add(words.colour(column), 'colour', [column]);
    add(words.groups(column), 'count', [column]);
    add(words.sort(column), 'sort', [column]);
    values.forEach((value) => {
      add(words.count(column, value), 'count', [column], [value]);
      add(words.hide(column, value), 'select', [column], [value]);
    });
  });
  // two columns with the values of a same row
  columns.forEach((first, index) => columns.slice(index + 1, index + 3).forEach((second) => {
    const row = rows.find((candidate) => candidate[first.column] && candidate[second.column]);
    if (row) add(words.filter(first.column, row[first.column], second.column, row[second.column]), 'filter', [first.column, second.column], [row[first.column], row[second.column]]);
  }));
  if (date) {
    const sortedDates = [...date.values].sort();
    add(words.after(date.column, sortedDates[Math.floor(sortedDates.length / 2)].slice(0, 10)), 'select', [date.column]);
    add(words.sort(date.column), 'sort', [date.column]);
  }
  // only the requests the assistant understands, as written: every clause gives
  // actions, a query or a statistic. The context (registry and catalog, the
  // costly part) is built once for all of them, not once per request as planFor
  const ctx = buildContext();
  const understood = (text) => splitClauses(text).every((clause) => {
    try {
      const result = interpret(clause, ctx, (request) => directActions(request, false));
      return Boolean(result && !result.error && (result.actions?.length || result.query || result.stats));
    } catch (_) { return false; }
  });
  const pool = candidates.filter((candidate) => understood(candidate.text));
  exampleCache.key = key;
  exampleCache.pool = pool;
  return pool;
}

/**
 * Three examples: the ones pertinent to a request first (same column, value or
 * operation), then the others in rotation, of different operations and not the
 * ones shown last when possible
 *
 * @param {String} [request] The request, or requests, not understood
 * @returns {Array} Texts of the examples
 */
function pickExamples(request = '') {
  const pool = examplePool();
  if (!pool.length) return [];
  const text = ` ${normIntent(request)} `;
  const has = (term) => {
    const word = normIntent(term);
    return word.length > 1 && text.includes(` ${word} `);
  };
  const ops = new Set(Object.entries(EXAMPLE_OPS).filter(([, terms]) => terms.some(has)).map(([op]) => op));
  const score = (example) => 3 * example.columns.filter(has).length + 3 * example.values.filter(has).length + (ops.has(example.op) ? 2 : 0);
  const ranked = pool
    .map((example) => ({ example, score: score(example), fresh: recentExamples.has(example.text) ? 0 : 1, random: Math.random() }))
    .sort((a, b) => b.score - a.score || b.fresh - a.fresh || a.random - b.random);
  // the pertinent ones first, even of the same operation (e.g. three sorts for
  // "ordina …"); then the rotation, with a first pass of different operations
  const chosen = ranked.filter((item) => item.score > 0).slice(0, 3).map((item) => item.example);
  const used = new Set(chosen.map((example) => example.op));
  [true, false].forEach((distinct) => ranked.forEach(({ example }) => {
    if (chosen.length === 3 || chosen.includes(example) || (distinct && used.has(example.op))) return;
    chosen.push(example);
    used.add(example.op);
  }));
  recentExamples = new Set(chosen.map((example) => example.text));
  return chosen.map((example) => example.text);
}

/**
 * Clickable examples (a click writes the request in the field); they leave
 * with the next request
 *
 * @param {Array} examples Texts of the examples
 * @returns {Element} The box of the examples
 */
function examplesBox(examples) {
  const box = element('div', 'spread-assistant__examples');
  box.append(...examples.map((example) => {
    const chip = element('button', 'spread-assistant__chip', example);
    chip.type = 'button';
    return chip;
  }));
  return box;
}

/**
 * Examples of the start, in the bubble of the intro, in rotation; only before
 * the first request (they leave with it and come back when the chat is cleared).
 * They change only with new data or language, or when asked (clear of the chat):
 * the classes of the page change often (layout, drag of a card) and the examples
 * shown must not rotate at each change
 *
 * @param {Element} panel The assistant card
 * @param {Object} [options] { rotate: new examples even with the same data }
 * @returns {undefined}
 */
function renderExamples(panel, { rotate = false } = {}) {
  const intro = panel.querySelector('.spread-assistant__intro');
  if (!intro || panel.querySelector('.spread-assistant__message--user')) return;
  // the pool of the loaded data (cached): its key says whether the data changed
  examplePool();
  const shown = intro.querySelector('.spread-assistant__examples');
  if (!rotate && shown && intro.dataset.examples === exampleCache.key) return;
  shown?.remove();
  const examples = pickExamples();
  intro.dataset.examples = exampleCache.key;
  if (examples.length) intro.append(examplesBox(examples));
  updateScroll(panel);
}

/*
*
* The panel is a card of SPREAD in the column of the legend, under the legend
* card: an accordion as the cards of the settings, open at every start, shown
* and hidden by its own toggle in the components row (`assistant` in
* gtiz_layout.cfg). Its conversation scrolls inside the card with Scrolly.
*
*/

// Scrolly of the conversation: the messages scroll by themselves inside the
// card, so the bar follows the node (its own track and overflow) and runs on its
// right, in the padding of the card, as the texts of the notes; 1rem out, so it
// stays clear of the tails of the user bubbles. Colours as css variables: the
// bar follows the light or dark mode
const messagesScrolly = typeof Scrolly === 'function' ? new Scrolly({
  opacity: 0.8,
  containerColor: 'var(--secondary-light)',
  barColor: 'var(--secondary-dark)',
  radius: 1,
  scaleY: 1,
  side: 'right',
  width: 0.3,
  unit: 'rem',
  position: 'absolute',
  offset: -1,
  contentHeightMode: 'scroll',
  draggable: true,
  preserveNodeMaxHeight: true,
  verticalTrackMode: 'node',
  overflowCheckMode: 'self'
}) : null;

/**
 * Update the Scrolly bar of the conversation after its contents or size change
 *
 * @param {Element} panel The assistant card
 * @returns {undefined}
 */
function updateScroll(panel) {
  const messages = panel && panel.querySelector('.spread-assistant__messages');
  if (!messagesScrolly || !messages || !messages.offsetHeight) return;
  messagesScrolly.updateNode(messages);
}

/**
 * Bring the conversation to its last message
 *
 * @param {Element} panel The assistant card
 * @returns {undefined}
 */
function scrollToEnd(panel) {
  const messages = panel.querySelector('.spread-assistant__messages');
  messages.scrollTop = messages.scrollHeight;
  updateScroll(panel);
}

/**
 * New element with its classes and, optionally, its text
 *
 * @param {String} tag Tag name
 * @param {String} cls Classes
 * @param {String} [text] Text content
 * @returns {Element} The element
 */
function element(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Clickable tool of the card: the help in the header (plain icon, as in the
 * settings cards) or a round trigger of the tools row (as in the notes panel)
 *
 * @param {String} cls Classes of the tool
 * @param {String} icon Tabler icon class
 * @param {String} title Tooltip and accessible name
 * @param {Function} action Click and keyboard action
 * @returns {Element} The tool
 */
function cardTool(cls, icon, title, action) {
  const tool = element('div', cls);
  tool.setAttribute('role', 'button');
  tool.setAttribute('tabindex', '0');
  tool.title = title;
  tool.setAttribute('aria-label', title);
  tool.append(element('i', `tabler ${icon}`));
  tool.addEventListener('click', action);
  tool.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  });
  return tool;
}

/**
 * Switch "Apply immediately" as the toggles of SPREAD's menus
 * (`.tools > .toggle-box`), remembered in the browser
 *
 * @param {String} label Text of the switch
 * @returns {Element} The `.tools` container of the switch
 */
function autoApplySwitch(label) {
  const tools = element('div', 'tools spread-assistant__auto');
  const box = element('div', 'toggle-box');
  const toggle = element('div', 'toggle');
  ['tabler-circle-check', 'tabler-ban'].forEach((icon) => {
    const option = element('div', 'toggle-option');
    option.append(element('i', `tabler ${icon}`));
    toggle.append(option);
  });
  const text = element('div', 'label', ` ${label}`);
  const show = (on) => {
    box.setAttribute('data-selection', on ? 'on' : 'off');
    toggle.classList.toggle('toggled-first-option', on);
    toggle.classList.toggle('toggled-second-option', !on);
  };
  show(autoApply());
  box.addEventListener('click', () => {
    const on = box.getAttribute('data-selection') !== 'on';
    show(on);
    try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch (_) { /* storage unavailable */ }
  });
  box.append(toggle, text);
  tools.append(box);
  return tools;
}

/**
 * Plan awaiting confirmation: a box of the conversation, moved after the last
 * message when a plan is shown; Apply and Cancel are links, as the actions of
 * the notes
 *
 * @returns {Element} The plan box, hidden
 */
function planBox() {
  const plan = element('div', 'spread-assistant__plan');
  plan.hidden = true;
  const box = element('div', 'spread-assistant__plan-box');
  const title = element('div', 'spread-assistant__plan-title');
  const list = element('ol');
  const actions = element('div', 'spread-assistant__actions');
  // links with their icon in line before the text
  const apply = element('a', 'spread-assistant__action');
  apply.append(element('i', 'tabler tabler-circle-check'), ` ${say('apply')}`);
  apply.setAttribute('data-assistant-confirm', '');
  const cancel = element('a', 'spread-assistant__action spread-assistant__action--cancel');
  cancel.append(element('i', 'tabler tabler-circle-x'), ` ${say('cancel')}`);
  cancel.setAttribute('data-assistant-cancel', '');
  actions.append(apply, cancel);
  box.append(title, list, actions);
  plan.append(box);
  return plan;
}

/**
 * Name of the assistant in the language in use (toggle, card title, help)
 *
 * @returns {String} The name
 */
function name() {
  return say('title');
}

/**
 * Register the help of the card (`helps.assistant` in js/i18n), opened by its
 * question mark as the help of the macros and notes panels
 *
 * @returns {undefined}
 */
function registerHelp() {
  if (typeof gtiz_help === 'undefined' || gtiz_help.settings.some((setting) => setting.card === 'assistant')) return;
  gtiz_help.settings.push({
    card: 'assistant',
    title: () => name(),
    contents: () => gtiz_locales.current.helps.assistant.help,
    // SPREAD only feature: no link to the EnteroBase documentation
    feedback: () => gtiz_locales.current.helps.feedback_wiki
  });
}

/**
 * Register the toggle of the assistant in the components row, on the right
 * after the legend one; the card is open at every start
 *
 * @returns {undefined}
 */
function registerToggle() {
  if (typeof gtiz_layout === 'undefined' || gtiz_layout.cfg.some((item) => item.type === 'assistant')) return;
  gtiz_layout.assistant = 'on';
  gtiz_layout.cfg.push({
    type: 'assistant',
    visible: false,
    cls: 'assistant-mode',
    cls_suffix: '',
    position: 'right',
    options: [{
      label: name(),
      value: 'on',
      icon: 'tabler-message-chatbot'
    }, {
      label: name(),
      value: 'off',
      icon: 'tabler-ban'
    }],
    selected: () => gtiz_layout.assistant,
    function: (type, value) => gtiz_layout.toggleView(type, value)
  });
  // the toolbar is built when a tree is loaded: rebuild it if it is already there
  if (typeof gtiz_tree !== 'undefined' && gtiz_tree.tree) gtiz_layout.init();
}

/**
 * Build the assistant card under the legend card and bind its controls
 *
 * @returns {undefined}
 */
function mount() {
  const column = document.querySelector('.main > .legend');
  if (!column) return;
  // draggable: taken by its handle it detaches from the column (see below)
  const panel = element('div', 'card card-expandable expanded card-assistant spread-assistant draggable');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', name());

  // header: accordion trigger, help (as the panels of macros and notes), title
  // with the alpha badge
  registerHelp();
  const expand = element('div', 'card-expand-trigger');
  expand.append(element('i', 'tabler tabler-circle-plus'), element('i', 'tabler tabler-circle-minus'));
  const tools = element('div', 'card-context-tools');
  // tools as in the settings cards: the handle to drag the card, the help and,
  // only while the card is detached, the trigger that docks it again
  const handle = element('div', 'card-drag-handle');
  handle.append(element('i', 'tabler tabler-grip-horizontal'));
  const dockTrigger = element('div', 'card-close-trigger reset-draggable');
  dockTrigger.append(element('i', 'tabler tabler-circle-x'));
  tools.append(handle, cardTool('help-trigger', 'tabler-help-circle', name(), () => gtiz_help.getHelp('assistant')), dockTrigger);
  const title = element('h3', 'card-title');
  const badge = element('span', 'spread-assistant__badge', 'alpha');
  badge.title = say('alpha');
  title.append(element('span', '', name()), badge);

  // body: tools row under the header (apply immediately, clear chat),
  // conversation (intro, examples, messages, plan), update notice, input and,
  // under it, a short note on privacy and on the alpha version
  const body = element('div', 'spread-assistant__body');
  const row = element('div', 'spread-assistant__tools');
  row.append(autoApplySwitch(say('auto_apply')), cardTool('card-context-trigger spread-assistant__clear', 'tabler-eraser', say('clear'), () => clearChat(panel)));
  const messages = element('div', 'spread-assistant__messages');
  const intro = element('div', 'spread-assistant__message spread-assistant__message--assistant spread-assistant__intro', say('intro'));
  messages.append(intro, planBox());
  const update = element('div', 'spread-assistant__update');
  update.hidden = true;
  const reload = element('a', 'spread-assistant__action', say('reload'));
  reload.setAttribute('data-assistant-reload', '');
  update.append(element('span', '', say('update')), reload);
  const form = element('form', 'spread-assistant__form');
  const textarea = element('textarea');
  // not required: an empty request is ignored by submit, without the tooltip of
  // the browser ("Fill in this field")
  textarea.rows = 1;
  textarea.placeholder = say('placeholder');
  textarea.setAttribute('aria-label', name());
  const send = element('button', 'spread-assistant__send');
  send.type = 'submit';
  send.title = say('send');
  send.setAttribute('aria-label', say('send'));
  send.append(element('i', 'tabler tabler-send'));
  form.append(textarea, send);
  const note = element('div', 'spread-assistant__note');
  const paragraph = element('p');
  paragraph.append(element('i', 'tabler tabler-info-circle'), ' ');
  // the parts between ** are in bold
  say('note').split('**').forEach((part, index) => paragraph.append(index % 2 ? element('strong', '', part) : part));
  note.append(paragraph);
  body.append(row, messages, update, form, note);
  panel.append(expand, tools, title, body);
  column.append(panel);

  // detachable: dragged by its handle out of the column it floats over the main
  // area (the column closes when the legend is off), dropped on the column or
  // closed with its trigger it docks again
  if (typeof gtiz_drag !== 'undefined' && gtiz_drag.makeDetachable) {
    gtiz_drag.makeDetachable(panel, {
      column,
      container: document.querySelector('section.main'),
      onChange: (floating) => {
        document.body.classList.toggle('assistant-floating', floating);
        // the legend takes the column left by the card, or gives back its part
        if (typeof gtiz_layout !== 'undefined' && gtiz_layout.setLegendHeight) requestAnimationFrame(() => gtiz_layout.setLegendHeight());
      },
      onDrop: () => updateScroll(panel)
    });
  }

  // accordion: the header opens and closes the card
  const toggleCard = () => {
    panel.classList.toggle('expanded');
    if (panel.classList.contains('expanded')) requestAnimationFrame(() => updateScroll(panel));
    // the legend above takes the space the card leaves, or gives it back: the size
    // observer of the layout (see below) measures its list at each frame of the change
  };
  if (typeof gtiz_layout !== 'undefined' && gtiz_layout.size_observer) gtiz_layout.size_observer.observe(panel);
  expand.addEventListener('click', toggleCard);
  // only the text of the title (name and badge) opens and closes the card: the
  // empty space of the header drags it (gtiz_drag.grab)
  title.addEventListener('click', (event) => {
    if (typeof gtiz_drag !== 'undefined' && gtiz_drag.isHeaderSpace(panel, event.target)) return;
    toggleCard();
  });

  // the field grows with its text; the send button inside it is active only
  // with something to send
  const autosize = () => {
    textarea.style.height = 'auto';
    // a hidden card has no size: the field keeps the height of its css
    textarea.style.height = textarea.scrollHeight ? `${Math.min(textarea.scrollHeight, 140)}px` : '';
    send.disabled = !textarea.value.trim();
  };
  form.addEventListener('submit', (event) => { submit(event, panel); autosize(); });
  textarea.addEventListener('input', autosize);
  autosize();
  // Enter sends, Shift+Enter starts a new line.
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
      autosize();
      return;
    }
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.isComposing) {
      if (browsePrompts(textarea, event.key === 'ArrowUp' ? -1 : 1)) {
        event.preventDefault();
        autosize();
      }
    }
  });
  // Typing after browsing starts a fresh draft from the recalled prompt.
  textarea.addEventListener('input', () => { promptCursor.index = -1; });
  messages.addEventListener('click', (event) => {
    const chip = event.target.closest('.spread-assistant__chip');
    if (!chip) return;
    textarea.value = chip.textContent;
    autosize();
    textarea.focus();
  });
  panel.querySelector('[data-assistant-confirm]').addEventListener('click', () => { if (!panel.classList.contains('is-running')) confirm(panel); });
  panel.querySelector('[data-assistant-cancel]').addEventListener('click', () => { if (!panel.classList.contains('is-running')) clearPlan(panel); });
  reload.addEventListener('click', () => window.location.reload());

  // the bar follows the size of the conversation. SPREAD rewrites the body
  // classes on every layout change, so the card is hidden for a moment and the
  // browser brings the conversation back to the top: its position is kept while
  // visible and given back when the card shows again or changes size; at the
  // end it stays at the end (the last message stays in view)
  let position = 0;
  let atEnd = true;
  messages.addEventListener('scroll', () => {
    if (!messages.offsetHeight) return;
    position = messages.scrollTop;
    atEnd = messages.scrollTop >= messages.scrollHeight - messages.clientHeight - 2;
  });
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      if (messages.offsetHeight) messages.scrollTop = atEnd ? messages.scrollHeight : position;
      updateScroll(panel);
    }).observe(messages);
  }
  // examples follow the loaded data: the layout is rebuilt (body classes) when a
  // tree is loaded, and each tree tells when its metadata change
  let hooked = null;
  const followData = () => {
    renderExamples(panel);
    const tree = typeof gtiz_tree !== 'undefined' ? gtiz_tree.tree : null;
    if (tree && tree !== hooked && typeof tree.addTreeChangedListener === 'function') {
      hooked = tree;
      tree.addTreeChangedListener((type) => { if (String(type).startsWith('metadata')) renderExamples(panel); });
    }
  };
  let frame = null;
  new MutationObserver(() => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = null; followData(); });
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  followData();
  registerToggle();
  watchForUpdates(panel);

  // Read-only development hook: it makes coverage of the generated catalog
  // testable without granting arbitrary command execution to page scripts.

  window.SPREAD_ASSISTANT = Object.freeze({
    context: () => { const ctx = buildContext(); return { columns: ctx.columns, catalog: ctx.catalog }; },
    plan: (message) => planFor(String(message)),
    lastPlan: () => lastProposedActions.map((action) => ({ ...action })),
    unresolved: () => readUnresolved(),
    // What the example bank would propose for each clause (tests, debugging).
    propose: async (message) => {
      const search = { clauses: splitClauses(message), plan: [], unresolved: [] };
      const out = [];
      for (const request of search.clauses) {
        let result;
        try { result = resolveClause(request, search); } catch (error) { result = { error: error.message }; }
        const offer = await offerFromExamples(request, search.ctx, result);
        out.push({ request, parser: result?.actions?.map((action) => ({ id: action.id, value: action.value })) || null, offer: offer && { id: offer.entry.id, key: offer.entry.key, action: offer.action, similarity: offer.similarity, description: offer.action ? describeAction(offer.action) : null } });
      }
      return out;
    },
    macros: () => userMacros().map((macro) => ({ name: macro.title, steps: macro.steps.map((step) => ({ ...step })) })),
    locate: (id) => { refreshRegistry(); const location = locationOf(id); return location ? { path: location.path, help: location.help || '' } : null; },
    history: () => history.map((step) => ({ ...step })),
    clearUnresolved: () => { try { localStorage.removeItem(UNRESOLVED_KEY); } catch (_) { /* ignore */ } }
  });
}

/**
 * Start the assistant only when app.json turns it on (`assistant.enabled`,
 * off when the block is missing): it waits for app.json to be read, so that the
 * card and its toggle never show up to disappear right after
 *
 * @returns {Promise<undefined>}
 */
async function start() {
  const cfg = typeof gtiz_app !== 'undefined' && gtiz_app.ready ? await gtiz_app.ready : undefined;
  if (cfg?.assistant?.enabled !== true) return;
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', mount);
  else mount();
}

start();
