/* global gtiz_tree, gtiz_metadata, gtiz_legend, gtiz_map, gtiz_settings, gtiz_video, gtiz_layout, gtiz_zooms, gtiz_macros */

// This bridge derives its catalog from SPREAD's actual menu configuration.
// No arbitrary JavaScript received from the model is ever evaluated.
const DEFAULT_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const MODELS = [DEFAULT_MODEL, 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'];
// Keep factual product answers outside the generative path.  Update this
// alongside package.json when SPREAD publishes a new application release.
const SPREAD_VERSION = '1.0.0';
const COPY = {
  it: { language: 'italiano', title: 'Assistente locale', close: 'Chiudi', initial: 'Modello locale non caricato.', intro: 'Posso usare tutte le opzioni visibili di SPREAD. Il modello gira localmente nel browser; le azioni richiedono sempre conferma.', placeholder: 'Es. colora per Regione e apri la mappa', send: 'Invia', apply: 'Applica', cancel: 'Annulla', downloading: 'Scarico e inizializzo il modello locale…', ready: 'Modello locale pronto.', modelError: 'Errore del modello locale.', plan: 'Pronto ad applicare', done: 'Fatto', version: `SPREAD dichiara la versione ${SPREAD_VERSION}.`, invalid: 'Non sono riuscito a ricondurre la richiesta a un comando valido di SPREAD.', malformed: 'Il modello non ha prodotto un comando valido. Riprova con una richiesta più semplice.' },
  en: { language: 'English', title: 'Local assistant', close: 'Close', initial: 'Local model not loaded.', intro: 'I can use every visible SPREAD option. The model runs locally in the browser; actions always require confirmation.', placeholder: 'E.g. colour by Region and open the map', send: 'Send', apply: 'Apply', cancel: 'Cancel', downloading: 'Downloading and initializing the local model…', ready: 'Local model ready.', modelError: 'Local model error.', plan: 'Ready to apply', done: 'Done', version: `SPREAD declares version ${SPREAD_VERSION}.`, invalid: 'I could not map the request to a valid SPREAD command.', malformed: 'The model did not produce a valid command. Try a simpler request.' },
  fr: { language: 'français', title: 'Assistant local', close: 'Fermer', initial: 'Modèle local non chargé.', intro: 'Je peux utiliser toutes les options visibles de SPREAD. Le modèle fonctionne localement dans le navigateur ; les actions demandent toujours confirmation.', placeholder: 'Ex. colorer par Région et ouvrir la carte', send: 'Envoyer', apply: 'Appliquer', cancel: 'Annuler', downloading: 'Téléchargement et initialisation du modèle local…', ready: 'Modèle local prêt.', modelError: 'Erreur du modèle local.', plan: 'Prêt à appliquer', done: 'Terminé', version: `SPREAD déclare la version ${SPREAD_VERSION}.`, invalid: 'Je ne peux pas associer cette demande à une commande SPREAD valide.', malformed: 'Le modèle n’a pas produit de commande valide. Réessayez avec une demande plus simple.' }
};
let worker;
let workerReady = false;
let queuedMessages = [];
let actionRegistry = new Map();
let pendingActions = [];
let lastProposedActions = [];
let conversation = [];
let requestId = 0;
let catalogSearch;
const ACTIONS_PER_PAGE = 24;

function copy() {
  const code = typeof gtiz_locales !== 'undefined' ? gtiz_locales.getActiveLanguageCode() : 'en';
  return COPY[code] || COPY.en;
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
        if (speedSelector.disabled) throw new Error('Pause timeline playback before changing its speed.');
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
  if (typeof gtiz_macros !== 'undefined' && Array.isArray(gtiz_macros.macros)) {
    gtiz_macros.macros.forEach((macro, index) => {
      const item = {
        type: 'macro',
        label: () => {
          const language = typeof gtiz_macros.lang === 'string' ? gtiz_macros.lang : 'it';
          return typeof macro.title === 'object' ? (macro.title[language] || macro.title.it || macro.title.en) : macro.title;
        },
        function: () => gtiz_macros.run(macro.actions)
      };
      actionRegistry.set(`macro:${index}`, { id: `macro:${index}`, area: 'macro', item });
    });
  }
}

function describe(entry) {
  const { id, area, item } = entry;
  const result = { id, area, label: labelOf(item), type: item.type, executable: typeof item.function === 'function' };
  const options = optionsOf(item);
  if (options.length) result.options = options;
  if (Number.isFinite(item.min)) result.min = item.min;
  if (Number.isFinite(item.max)) result.max = item.max;
  if (options.length || ['toggle', 'select', 'number', 'slider', 'search', 'radio', 'text', 'abutton_optioned'].includes(item.type)) result.value_required = true;
  if (item.type === 'assistant_metadata_replace_all') {
    result.value_required = true;
    result.value_schema = { category: 'exact loaded metadata column', value: 'replacement text' };
  }
  if (item.type === 'assistant_node_colour') {
    result.value_required = true;
    result.value_schema = { category: 'exact loaded column', id: 'exact sample ID or group value', colour: 'CSS hex colour' };
  }
  return result;
}

function state() {
  const tree = typeof gtiz_tree !== 'undefined' ? gtiz_tree.tree : undefined;
  return {
    data_loaded: Boolean(tree),
    selected_nodes: tree && tree.getSelectedNodeIDs ? tree.getSelectedNodeIDs().length : 0,
    active_category: tree ? tree.display_category : null,
    metadata_columns: tree && tree.metadata_info ? Object.keys(tree.metadata_info) : [],
    available_actions: [...actionRegistry.values()].map(describe)
  };
}

// A 0.5B model commonly has a 4k-token context window.  The complete SPREAD
// catalog is intentionally retained, but represented as compact tuples rather
// than a repeated verbose JSON schema.  Tuple layout:
  // [action id, functional area, visible label, control type, allowed values | "$columns", min, max]
function normalizeTerms(value) {
  return String(value || '').toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function candidateEntries(request) {
  const query = normalizeTerms(request);
  const words = query.split(' ').filter((word) => word.length >= 3);
  if (!words.length) return [...actionRegistry.values()];
  const aliases = {
    apri: ['on', 'layout'], mostra: ['on', 'layout'], chiudi: ['off', 'layout'], nascondi: ['off', 'layout'],
    colora: ['colora', 'color', 'legend', 'node style'], colore: ['colora', 'color', 'legend', 'node style'], color: ['colora', 'color', 'legend', 'node style'],
    albero: ['tree', 'legend', 'node style'], ramo: ['branch'], nodo: ['node'], mappa: ['map'], metadati: ['metadata'],
    scarica: ['download', 'export'], esporta: ['download', 'export'], video: ['video'], schermo: ['full screen']
  };
  const scored = [...actionRegistry.values()].map((entry) => {
    const text = normalizeTerms(`${entry.area} ${entry.id} ${labelOf(entry.item)} ${optionsOf(entry.item).map((option) => option.label).join(' ')}`);
    let score = 0;
    words.forEach((word) => {
      if (text.includes(word)) score += 8;
      else if (word.length >= 5 && text.split(' ').some((term) => term.startsWith(word.slice(0, 5)) || word.startsWith(term.slice(0, 5)))) score += 4;
      (aliases[word] || []).forEach((alias) => { if (text.includes(alias)) score += 3; });
    });
    return { entry, score };
  });
  return scored.sort((left, right) => right.score - left.score).map(({ entry }) => entry);
}

function compactState(request) {
  refreshRegistry();
  const tree = typeof gtiz_tree !== 'undefined' ? gtiz_tree.tree : undefined;
  const columns = tree && tree.metadata_info ? Object.keys(tree.metadata_info) : [];
  const sameValues = (left, right) => left.length === right.length && left.every((value, index) => String(value) === String(right[index]));
  const actions = candidateEntries(request).map(({ id, area, item }) => {
    const values = optionsOf(item).map((option) => option.value);
    const tuple = [id, area, String(labelOf(item)), item.type];
    if (values.length) tuple.push(sameValues(values, columns) ? '$columns' : values);
    else if (Number.isFinite(item.min) || Number.isFinite(item.max)) tuple.push(null);
    if (Number.isFinite(item.min)) tuple.push(item.min);
    if (Number.isFinite(item.max)) tuple.push(item.max);
    if (item.type === 'assistant_metadata_replace_all') tuple.push('$columns + replacement text');
    if (item.type === 'assistant_node_colour') tuple.push('$columns + group value or sample ID + CSS hex colour');
    if (item.type === 'assistant_map_coordinates') tuple.push({ latitude: 'number [-90, 90]', longitude: 'number [-180, 180]' });
    return tuple;
  });
  return {
    loaded: Boolean(tree),
    selected: tree && tree.getSelectedNodeIDs ? tree.getSelectedNodeIDs().length : 0,
    category: tree ? tree.display_category : null,
    columns,
    actions
  };
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

function validate(item, value) {
  if (item.type === 'assistant_map_coordinates') {
    const { latitude, longitude } = value || {};
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
        !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
      throw new Error('Expected valid latitude and longitude in decimal degrees.');
    }
    return { latitude, longitude };
  }
  if (item.type === 'assistant_node_colour') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Servono ID del campione e colore.');
    const tree = typeof gtiz_tree !== 'undefined' ? gtiz_tree.tree : undefined;
    const category = String(value.category ?? 'ID');
    const id = String(value.id || '');
    const colour = String(value.colour || '');
    if ([category, id].some((key) => Object.hasOwn(Object.prototype, key) || key === 'prototype') ||
        !colourValues(tree, category).includes(id)) throw new Error('Il valore indicato non esiste nella categoria.');
    if (!/^#[0-9a-f]{6}$/i.test(colour)) throw new Error('Il colore deve essere espresso in esadecimale, per esempio #000000.');
    return { category, id, colour };
  }
  if (item.type === 'assistant_metadata_replace_all') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Servono colonna e valore di sostituzione.');
    const tree = typeof gtiz_tree !== 'undefined' ? gtiz_tree.tree : undefined;
    const columns = tree && tree.metadata_info ? Object.keys(tree.metadata_info) : [];
    const category = String(value.category || '');
    const replacement = String(value.value || '').trim();
    const protectedColumns = ['ID', 'CMP', 'nothing', '__Node', gtiz_file_handler.samples_column];
    if (!columns.includes(category) || protectedColumns.includes(category)) throw new Error('La colonna indicata non è modificabile.');
    if (!replacement || /[\t\r\n]/.test(replacement)) throw new Error('Serve un valore non vuoto, senza tabulazioni o ritorni a capo.');
    return { category, value: replacement };
  }
  const needsValue = optionsOf(item).length > 0 || ['toggle', 'select', 'number', 'slider', 'search', 'radio', 'text', 'abutton_optioned'].includes(item.type);
  if (!needsValue) return undefined;
  if (value === undefined || value === null) throw new Error(`Manca un valore per “${labelOf(item)}”.`);
  if (item.type === 'number' || item.type === 'slider') {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error('Il valore deve essere numerico.');
    if (Number.isFinite(item.min) && number < item.min) throw new Error(`Il minimo è ${item.min}.`);
    if (Number.isFinite(item.max) && number > item.max) throw new Error(`Il massimo è ${item.max}.`);
    return number;
  }
  const options = optionsOf(item);
  if (options.length && !options.some((option) => String(option.value) === String(value))) throw new Error(`Valore non previsto per “${labelOf(item)}”.`);
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

function execute(action) {
  const entry = actionRegistry.get(action.id);
  if (!entry) throw new Error('L’azione non è disponibile nella configurazione attuale.');
  const { item } = entry;
  if (typeof item.function !== 'function') throw new Error(`“${labelOf(item)}” richiede l’interfaccia nativa.`);
  const value = validate(item, action.value);
  if (item.type === 'abutton_optioned') invokeOptioned(item, value);
  else if (entry.invoke) entry.invoke(item, value);
  else if (value === undefined) item.function();
  else item.function(value);
  return labelOf(item);
}

function addMessage(panel, role, text) {
  const node = document.createElement('div');
  node.className = `spread-assistant__message spread-assistant__message--${role}`;
  node.textContent = text;
  panel.querySelector('.spread-assistant__messages').append(node);
  node.scrollIntoView({ block: 'end' });
}

function setStatus(panel, text) { panel.querySelector('.spread-assistant__status').textContent = text; }
function clearPlan(panel) { pendingActions = []; lastProposedActions = []; panel.querySelector('.spread-assistant__plan').hidden = true; }
function showPlan(panel, actions) {
  pendingActions = actions;
  lastProposedActions = actions.map((action) => ({ id: action.id, value: action.value }));
  panel.querySelector('.spread-assistant__plan p').textContent = `${copy().plan}: ${actions.map((action) => {
    const label = labelOf(actionRegistry.get(action.id).item);
    if (action.value === undefined) return label;
    if (action.value && typeof action.value === 'object') {
      const { category, id, colour, value, latitude, longitude } = action.value;
      if (latitude !== undefined) return `${label}: ${latitude}, ${longitude}`;
      return id === undefined ? `${label}: ${category} = ${value}` : `${label}: ${category || 'ID'} / ${id} = ${colour}`;
    }
    return `${label} = ${action.value}`;
  }).join(', ')}.`;
  panel.querySelector('.spread-assistant__plan').hidden = false;
}

function confirm(panel) {
  refreshRegistry();
  if (!pendingActions.every(validateProposedAction)) {
    addMessage(panel, 'assistant', copy().invalid);
    clearPlan(panel);
    return;
  }
  try { addMessage(panel, 'assistant', `${copy().done}: ${pendingActions.map(execute).join(', ')}.`); }
  catch (error) { addMessage(panel, 'assistant', `Non ho applicato l’azione: ${error.message}`); }
  clearPlan(panel);
}

function colorHint(request) {
  const normalizedRequest = normalizeTerms(request);
  if (!/\b(colora|colore|color)\b/.test(normalizedRequest)) return '';
  const tree = typeof gtiz_tree !== 'undefined' ? gtiz_tree.tree : undefined;
  const columns = tree && tree.metadata_info ? Object.keys(tree.metadata_info) : [];
  const colorAction = [...actionRegistry.values()].find(({ item }) => {
    const values = optionsOf(item).map((option) => String(option.value));
    return normalizeTerms(labelOf(item)).includes('color') && values.some((value) => columns.includes(value));
  });
  const column = columns.find((value) => normalizedRequest.includes(normalizeTerms(value)));
  if (!colorAction || !column) return '';
  return ` Vincolo per questa richiesta: non limitarti ad aprire legenda/impostazioni. Devi proporre {"id":"${colorAction.id}","value":"${column}"} per colorare usando la colonna ${column}.`;
}

function layoutHint(request) {
  const normalizedRequest = normalizeTerms(request);
  if (!/\b(apri|mostra|visualizza)\b/.test(normalizedRequest) || typeof gtiz_layout === 'undefined') return '';
  const aliases = { mappa: 'map', metadati: 'metadata', impostazioni: 'settings', legenda: 'legend', video: 'video', schermo: 'full screen' };
  const target = Object.keys(aliases).find((word) => normalizedRequest.includes(word));
  if (!target) return '';
  const desired = aliases[target];
  const entry = [...actionRegistry.values()].find(({ area, item }) => area === 'layout' && normalizeTerms(`${item.type} ${labelOf(item)}`).includes(desired));
  return entry ? ` Vincolo per questa richiesta: per aprire ${target} devi proporre {"id":"${entry.id}","value":"on"}.` : '';
}

// Guardrails for short, unambiguous requests.  The LLM remains the planner,
// but an exact UI label/column match must not be lost because a small model
// appends a hallucinated tool call.  These are merged only for commands whose
// target and value are both present in the live SPREAD configuration.
function mandatoryActions(request) {
  refreshRegistry();
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
    const aliases = {
      mappa: 'map', metadati: 'metadata', impostazioni: 'settings', legenda: 'legend',
      video: 'video', schermo: 'full screen', map: 'map', metadata: 'metadata',
      settings: 'settings', legend: 'legend', 'full screen': 'full screen'
    };
    const target = Object.keys(aliases).find((word) => normalizedRequest.includes(word));
    if (target) {
      const entry = [...actionRegistry.values()].find(({ area, item }) => area === 'layout' && normalizeTerms(`${item.type} ${labelOf(item)}`).includes(aliases[target]));
      const close = /\b(chiudi|nascondi|close|hide|ferme)\b/.test(normalizedRequest);
      if (entry) result.push({ id: entry.id, value: close ? 'off' : 'on' });
    }
  }
  return result;
}

function systemPrompt(request, page) {
  return `You are the local SPREAD assistant. Reply in ${copy().language}. Request: ${request}.${colorHint(request)}${layoutHint(request)} Never invent actions, values, columns, or results. Reply ONLY with JSON and no markdown: {"reply":"brief action explanation","actions":[{"id":"real id","value":"only when required"}]}. When the user asks to change SPREAD, include its matching tools in actions. For colouring tree/legend, use “Color by” in legend or settings/node-style and an exact listed data column as value, never an area name such as tree or legend. The catalog tuples are [id,area,label,type,values|min|max]; "$columns" means a data column. For assistant_metadata_replace_all the value must be {"category":"exact loaded column","value":"replacement text"}. For assistant_node_colour the value must be {"category":"exact loaded column","id":"exact group value or sample ID","colour":"#RRGGBB"}. This is one page of the action catalog. Propose only listed IDs and values. If this page has no matching action, return actions:[]. Every action is confirmed by the user.\n${JSON.stringify(page)}`;
}

function postChat(messages, request) {
  const job = { type: 'chat', messages, request, requestId };
  if (workerReady) worker.postMessage(job);
  else queuedMessages.push(job);
}

function sendCatalogPage(search) {
  const actions = search.state.actions.slice(search.offset, search.offset + ACTIONS_PER_PAGE);
  search.visibleIds = new Set(actions.map(([id]) => id));
  search.offset += actions.length;
  const page = { ...search.state, actions };
  postChat([{ role: 'system', content: systemPrompt(search.request, page) }, ...search.history], search.request);
}

function initWorker(panel) {
  if (worker) return;
  worker = new Worker(new URL('./assistant-worker.js?v=28', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') setStatus(panel, data.text || 'Caricamento modello…');
    if (data.type === 'ready') {
      workerReady = true;
      setStatus(panel, copy().ready);
      queuedMessages.splice(0).filter((job) => job.requestId === requestId).forEach((job) => worker.postMessage(job));
    }
    if (data.requestId != null && data.requestId !== requestId) return;
    if (data.type === 'error') {
      catalogSearch = undefined;
      if (!workerReady) {
        worker.terminate();
        worker = undefined;
        queuedMessages = [];
      }
      setStatus(panel, copy().modelError);
      addMessage(panel, 'assistant', data.message);
    }
    if (data.type === 'answer') handleAnswer(panel, data.content, data.request);
  };
  setStatus(panel, copy().downloading);
  worker.postMessage({ type: 'init', modelId: panel.querySelector('.spread-assistant__model').value || DEFAULT_MODEL });
}

function finishClause(panel, actions, reply) {
  const search = catalogSearch;
  search.plan.push(...actions);
  if (!actions.length) search.unresolved.push({ request: search.request, reply });
  startNextClause(panel);
}

function handleAnswer(panel, content, request) {
  const search = catalogSearch;
  if (!search || search.request !== request) return;
  let answer;
  try { answer = JSON.parse(content); }
  catch (_) { answer = null; }
  if (typeof answer?.reply === 'string' && answer.reply.trim() && !search.reply) search.reply = answer.reply;
  refreshRegistry();
  const actions = Array.isArray(answer?.actions) ? answer.actions.filter((action) => {
    if (!action || !search.visibleIds.has(action.id) || !actionRegistry.has(action.id)) return false;
    try {
      validate(actionRegistry.get(action.id).item, action.value);
      return true;
    } catch (_) {
      return false;
    }
  }) : [];
  if (!actions.length && search.offset < search.state.actions.length) {
    sendCatalogPage(search);
    return;
  }
  finishClause(panel, actions, search.reply || (answer ? copy().invalid : copy().malformed));
}

function factualReply(request) {
  const normalizedRequest = normalizeTerms(request);
  if (/\b(versione|version|release)\b/.test(normalizedRequest) && /\b(spread|applicazione|application|app)\b/.test(normalizedRequest)) return copy().version;
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

function directActions(request) {
  refreshRegistry();
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
    return mandatoryActions(request);
  }
  return null;
}

function validateProposedAction(action) {
  const item = actionRegistry.get(action.id)?.item;
  if (typeof item?.function !== 'function') return false;
  try { validate(item, action.value); return true; }
  catch (_) { return false; }
}

function startNextClause(panel) {
  const search = catalogSearch;
  while (search.clauses.length) {
    const request = search.clauses.shift();
    const fact = factualReply(request);
    if (fact) {
      addMessage(panel, 'assistant', fact);
      continue;
    }
    const actions = directActions(request);
    if (actions) {
      if (actions.length && actions.every(validateProposedAction)) search.plan.push(...actions);
      else search.unresolved.push({ request, reply: copy().invalid });
      continue;
    }
    search.request = request;
    search.state = compactState(request);
    search.history = [...conversation.slice(-6, -1), { role: 'user', content: request }];
    search.offset = 0;
    search.reply = '';
    initWorker(panel);
    sendCatalogPage(search);
    return;
  }
  catalogSearch = undefined;
  for (const { request, reply } of search.unresolved) {
    addMessage(panel, 'assistant', search.multiple ? `“${request}” — ${reply}` : reply);
  }
  if (search.plan.length) {
    refreshRegistry();
    if (search.plan.every(validateProposedAction)) showPlan(panel, search.plan);
    else addMessage(panel, 'assistant', copy().invalid);
  }
}

function submit(event, panel) {
  event.preventDefault();
  const input = event.currentTarget.querySelector('textarea');
  const message = input.value.trim();
  if (!message) return;
  clearPlan(panel);
  addMessage(panel, 'user', message);
  conversation.push({ role: 'user', content: message });
  requestId += 1;
  catalogSearch = undefined;
  input.value = '';
  const parts = message.split(/("[^"]*")/);
  const separator = /;|\n|\s+\b(?:and then|e poi|puis)\s+|\s+(?:and|e)\s+(?=(?:apri|chiudi|open|close|recenter|ricentra|colora|colou?r|zooma?|play|pause)\b)/i;
  const clauses = parts.map((part, index) => index % 2 ? [part] : part.split(separator))
    .reduce((joined, parts) => {
      joined[joined.length - 1] += parts[0];
      joined.push(...parts.slice(1));
      return joined;
    }, ['']).map((clause) => clause.trim()).filter(Boolean);
  catalogSearch = { clauses, multiple: clauses.length > 1, plan: [], unresolved: [] };
  startNextClause(panel);
}

function mount() {
  const text = copy();
  const launcher = document.createElement('button');
  launcher.className = 'spread-assistant-launcher';
  launcher.type = 'button';
  launcher.title = text.title;
  launcher.innerHTML = '<i class="tabler tabler-message-chatbot"></i>';
  // Do not use <aside>: SPREAD's global aside stylesheet intentionally keeps
  // every aside off-canvas until a separate layout mode is enabled.
  const panel = document.createElement('div');
  panel.className = 'spread-assistant';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', text.title);
  panel.hidden = true;
  panel.innerHTML = `<div class="spread-assistant__header"><h2>${text.title}</h2><select class="spread-assistant__model" aria-label="${text.title}">${MODELS.map((id) => `<option value="${id}">${id.replace('-q4f16_1-MLC', '')}</option>`).join('')}</select><button type="button" class="spread-assistant__close" aria-label="${text.close}">×</button></div><div class="spread-assistant__status">${text.initial}</div><div class="spread-assistant__messages"><div class="spread-assistant__message spread-assistant__message--assistant">${text.intro}</div></div><div class="spread-assistant__plan" hidden><p></p><div class="spread-assistant__actions"><button type="button" data-assistant-confirm>${text.apply}</button><button type="button" data-assistant-cancel>${text.cancel}</button></div></div><form class="spread-assistant__form"><textarea aria-label="${text.title}" placeholder="${text.placeholder}" required></textarea><button type="submit">${text.send}</button></form>`;
  document.body.append(launcher, panel);
  const openAssistant = (event) => {
    event.preventDefault();
    event.stopPropagation();
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => panel.querySelector('textarea').focus());
  };
  // Pointer-up handles touch/mouse interactions; click preserves keyboard
  // activation.  Stopping propagation prevents dashboard-wide handlers from
  // immediately consuming the same interaction.
  launcher.addEventListener('pointerup', openAssistant);
  launcher.addEventListener('click', openAssistant);
  panel.querySelector('.spread-assistant__close').addEventListener('click', () => {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
  });
  panel.querySelector('form').addEventListener('submit', (event) => submit(event, panel));
  panel.querySelector('[data-assistant-confirm]').addEventListener('click', () => confirm(panel));
  panel.querySelector('[data-assistant-cancel]').addEventListener('click', () => clearPlan(panel));
  // Read-only development hook: it makes coverage of the generated catalog
  // testable without granting arbitrary command execution to page scripts.
  window.SPREAD_ASSISTANT = Object.freeze({
    catalog: () => compactState(),
    lastPlan: () => lastProposedActions.map((action) => ({ ...action }))
  });
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', mount);
else mount();
