/* global gtiz_tree, gtiz_metadata, gtiz_legend, gtiz_map, gtiz_settings, gtiz_video, gtiz_layout, gtiz_zooms, gtiz_macros */

import { interpret, splitClauses, matchRows, norm as normIntent, similar as similarIntent } from './assistant-intents.js?v=12';

// This bridge derives its catalog from SPREAD's actual menu configuration and
// resolves requests with the deterministic parser in assistant-intents.js.
// Only catalog actions can run; no code is ever evaluated. It works offline.
const UNRESOLVED_KEY = 'spread-assistant-unresolved';
const UNRESOLVED_LIMIT = 500;
// Keep factual product answers outside the generative path.  Update this
// alongside package.json when SPREAD publishes a new application release.
const SPREAD_VERSION = '1.0.0';
const COPY = {
  it: { title: 'Assistente locale', close: 'Chiudi', intro: 'Descrivi cosa vuoi fare con albero, mappa e metadati: filtri, selezioni, colori, modifiche alle colonne, impostazioni. Ti mostro il piano e lo applico solo dopo la tua conferma. Tutto resta nel browser.', placeholder: 'Descrivi cosa vuoi fare…', send: 'Invia', apply: 'Applica', cancel: 'Annulla', plan: 'Pronto ad applicare', done: 'Fatto', version: `SPREAD dichiara la versione ${SPREAD_VERSION}.`, invalid: 'Non sono riuscito a ricondurre la richiesta a un comando valido di SPREAD.', status: 'Funziona nel browser · i dati non escono', count: (n) => `${n} campioni soddisfano la condizione`, autoApply: 'Applica subito, senza conferma', dock: 'Aggancia come pannello laterale', clear: 'Pulisci la chat', undock: 'Rendi flottante', update: 'È disponibile una nuova versione dell’assistente.', reload: 'Ricarica la pagina', help: 'Ecco cosa so fare:', none: 'Nessun campione soddisfa la condizione.', macroSaved: (name, n) => `Macro “${name}” salvata con ${n} passi.`, macroNone: 'Non ci sono ancora macro dell’assistente. Esegui qualche azione e poi scrivi “registra gli ultimi 3 passaggi come macro Nome”.', macroList: 'Macro disponibili', macroSteps: 'passi', macroNative: 'macro di SPREAD', macroMissing: (name) => `Non trovo la macro “${name}”.`, macroDeleted: (name) => `Macro “${name}” eliminata.`, macroRenamed: (from, to) => `Macro “${from}” rinominata in “${to}”.`, historyShort: (n) => `Ci sono solo ${n} passi eseguiti in questa sessione.`, historyEmpty: 'Non ho ancora eseguito nessun passo da registrare.', noMatch: 'Nessun campione soddisfa la condizione.', notApplied: 'Non ho applicato l’azione', hint: 'Prova a nominare l’operazione e la colonna, per esempio: “dammi i metadati dove regione è Abruzzo”, “ordina la tabella per data decrescente”, “sostituisci Roma con Rieti nella colonna provincia”, “colora per sierotipo”.' },
  en: { title: 'Local assistant', close: 'Close', intro: 'Describe what you want to do with the tree, map and metadata: filters, selections, colours, column edits, settings. I show the plan and apply it only after you confirm. Everything stays in the browser.', placeholder: 'Describe what you want to do…', send: 'Send', apply: 'Apply', cancel: 'Cancel', plan: 'Ready to apply', done: 'Done', version: `SPREAD declares version ${SPREAD_VERSION}.`, invalid: 'I could not map the request to a valid SPREAD command.', status: 'Runs in your browser · data stays local', count: (n) => `${n} samples match the condition`, autoApply: 'Apply immediately, without confirmation', dock: 'Dock as a side panel', clear: 'Clear the chat', undock: 'Make floating', update: 'A new version of the assistant is available.', reload: 'Reload the page', help: 'Here is what I can do:', none: 'No sample matches the condition.', macroSaved: (name, n) => `Macro “${name}” saved with ${n} steps.`, macroNone: 'There are no assistant macros yet. Run some actions, then type “record the last 3 steps as macro Name”.', macroList: 'Available macros', macroSteps: 'steps', macroNative: 'SPREAD macro', macroMissing: (name) => `Macro “${name}” not found.`, macroDeleted: (name) => `Macro “${name}” deleted.`, macroRenamed: (from, to) => `Macro “${from}” renamed to “${to}”.`, historyShort: (n) => `Only ${n} steps were run in this session.`, historyEmpty: 'No step has been run yet.', noMatch: 'No sample matches the condition.', notApplied: 'Action not applied', hint: 'Name the operation and the column, for example: “show me the metadata where region is Abruzzo”, “sort the table by date descending”, “replace Roma with Rieti in the province column”, “colour by serovar”.' },
  fr: { title: 'Assistant local', close: 'Fermer', intro: 'Décrivez ce que vous voulez faire avec l’arbre, la carte et les métadonnées : filtres, sélections, couleurs, colonnes, réglages. Je montre le plan et je l’applique après votre confirmation. Tout reste dans le navigateur.', placeholder: 'Décrivez ce que vous voulez faire…', send: 'Envoyer', apply: 'Appliquer', cancel: 'Annuler', plan: 'Prêt à appliquer', done: 'Terminé', version: `SPREAD déclare la version ${SPREAD_VERSION}.`, invalid: 'Je ne peux pas associer cette demande à une commande SPREAD valide.', status: 'Dans votre navigateur · les données restent locales', count: (n) => `${n} échantillons correspondent à la condition`, autoApply: 'Appliquer tout de suite, sans confirmation', dock: 'Ancrer en panneau latéral', clear: 'Effacer la conversation', undock: 'Rendre flottant', update: 'Une nouvelle version de l’assistant est disponible.', reload: 'Recharger la page', help: 'Voici ce que je sais faire :', none: 'Aucun échantillon ne correspond à la condition.', macroSaved: (name, n) => `Macro « ${name} » enregistrée avec ${n} étapes.`, macroNone: 'Aucune macro de l’assistant pour l’instant.', macroList: 'Macros disponibles', macroSteps: 'étapes', macroNative: 'macro SPREAD', macroMissing: (name) => `Macro « ${name} » introuvable.`, macroDeleted: (name) => `Macro « ${name} » supprimée.`, macroRenamed: (from, to) => `Macro « ${from} » renommée en « ${to} ».`, historyShort: (n) => `Seulement ${n} étapes exécutées dans cette session.`, historyEmpty: 'Aucune étape exécutée pour l’instant.', noMatch: 'Aucun échantillon ne correspond à la condition.', notApplied: 'Action non appliquée', hint: 'Nommez l’opération et la colonne, par exemple : « montre les métadonnées où région est Abruzzo », « trie le tableau par date décroissant ».' }
};
let actionRegistry = new Map();
let pendingActions = [];
let lastProposedActions = [];

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
  if (!ids.length) throw new Error(copy().noMatch);
  return ids;
}

function checkWhere(where, columns) {
  if (!where) return;
  if (typeof where !== 'object' || Array.isArray(where)) throw new Error('Invalid condition.');
  if (where.selected) return;
  if (where.all || where.any) {
    const list = where.all || where.any;
    if (!Array.isArray(list) || !list.length) throw new Error('Invalid condition.');
    list.forEach((condition) => checkWhere(condition, columns));
    return;
  }
  if (where.ids) {
    if (!Array.isArray(where.ids) || !where.ids.length) throw new Error('Invalid condition.');
    return;
  }
  if (!columns.includes(where.column)) throw new Error(`Unknown column “${where.column}”.`);
  if (!['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'empty', 'notempty', 'in'].includes(where.op)) throw new Error('Invalid operator.');
  if (where.op === 'in' && (!Array.isArray(where.value) || !where.value.length)) throw new Error('Invalid condition.');
}

function checkCell(value, { name = false } = {}) {
  const text = String(value ?? '');
  if (/[\t\r\n]/.test(text)) throw new Error('Values cannot contain tabs or line breaks.');
  // The metadata reader switches to comma-separated parsing when the header
  // contains a comma, so a column name must never contain one.
  if (name && (!text.trim() || /[,]/.test(text) || Object.hasOwn(Object.prototype, text) || text === 'prototype')) throw new Error(`Invalid column name “${text}”.`);
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
      if ([...liveColumns(), ...protectedColumns()].some((existing) => existing === column) && !virtual) throw new Error(`Column “${column}” already exists.`);
      checkWhere(value.where, [...liveColumns(), ...(virtual || [])]);
      return { column, value: checkCell(value.value), where: value.where, otherValue: checkCell(value.otherValue ?? '') };
    }, ({ column, value, where, otherValue }) => {
      const metadata = gtiz_tree.tree.metadata;
      const ids = where ? matchingIds(where) : [];
      reloadMetadata(gtiz_metadata.updateMetadata('add', metadata, ids, column, value, where ? (otherValue || '\u0000') : undefined).replace(/\u0000/g, ''), column);
    }],
    ['metadata-set', T('Imposta valori metadati', 'Set metadata values', 'Définir des valeurs de métadonnées'), (value, virtual) => {
      const columns = [...liveColumns(), ...(virtual || [])];
      if (!columns.includes(value?.column) || protectedColumns().includes(value.column)) throw new Error(`Column “${value?.column}” cannot be edited.`);
      checkWhere(value.where, columns);
      return { column: value.column, value: checkCell(value.value), where: value.where };
    }, ({ column, value, where }) => {
      const metadata = gtiz_tree.tree.metadata;
      const ids = where ? matchingIds(where) : [];
      reloadMetadata(gtiz_metadata.updateMetadata('edit', metadata, ids, column, value), column);
    }],
    ['metadata-rename-column', T('Rinomina colonna metadati', 'Rename metadata column', 'Renommer une colonne de métadonnées'), (value, virtual) => {
      const columns = [...liveColumns(), ...(virtual || [])];
      if (!columns.includes(value?.from) || protectedColumns().includes(value.from)) throw new Error(`Column “${value?.from}” cannot be renamed.`);
      const to = checkCell(value.to, { name: true });
      if (liveColumns().includes(to) || protectedColumns().includes(to)) throw new Error(`Column “${to}” already exists.`);
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
      if (!columns.includes(value?.column) || protectedColumns().includes(value.column)) throw new Error(`Column “${value?.column}” cannot be deleted.`);
      return { column: value.column };
    }, ({ column }) => {
      if (gtiz_tree.tree.display_category === column) gtiz_tree.tree.display_category = '';
      reloadMetadata(gtiz_metadata.updateMetadata('remove', gtiz_tree.tree.metadata, [], column));
    }],
    ['select', T('Seleziona campioni', 'Select samples', 'Sélectionner des échantillons'), (value, virtual) => {
      if (!['replace', 'add', 'remove', 'all', 'clear'].includes(value?.mode)) throw new Error('Invalid selection mode.');
      if (['replace', 'add', 'remove'].includes(value.mode)) {
        if (!value.where) throw new Error('Missing selection condition.');
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
    if (![...liveColumns(), 'ID'].includes(value?.column)) throw new Error(`Unknown column “${value?.column}”.`);
    if (!['asc', 'desc'].includes(value.direction)) throw new Error('Direction must be asc or desc.');
    return { column: value.column, direction: value.direction };
  }, ({ column, direction }) => {
    const toggle = document.querySelector('.quick-actions .toggle-box[data-view="metadata"]');
    if (toggle && toggle.getAttribute('data-selection') !== 'on') toggle.click();
    gtiz_metadata.options.columnApi.applyColumnState({ state: [{ colId: column, sort: direction }], defaultState: { sort: null } });
  }]);
  operations.push(['language', T('Cambia lingua (ricarica la pagina, le modifiche non salvate si perdono)', 'Change language (reloads the page; unsaved changes are lost)', 'Changer de langue (recharge la page ; les modifications non enregistrées sont perdues)'), (value) => {
    const codes = (typeof gtiz_locales !== 'undefined' ? gtiz_locales.languages.map((language) => language.code) : ['it', 'en', 'fr']);
    if (!codes.includes(value)) throw new Error(`Unknown language “${value}”.`);
    return value;
  }, (code) => gtiz_locales.changeLanguage(code)]);
  for (const [name, label, check, run] of operations) {
    if (readOnly && !['select', 'metadata-sort', 'language'].includes(name)) continue;
    const id = `assistant:${name}`;
    actionRegistry.set(id, { id, area: name === 'select' ? 'tree' : 'metadata', item: { id: `assistant-${name}`, type: `assistant_${name.replace(/-/g, '_')}`, label, check, function: run } });
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
  'layout:video': ['video', 'timeline', 'linea temporale', 'timelapse', 'filmato'],
  'layout:full-screen': ['schermo intero', 'full screen', 'fullscreen', 'tutto schermo', 'plein ecran'],
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
  'metadata-export-button': ['scarica tabella', 'download table', 'esporta tabella', 'export table', 'esporta metadati', 'scarica metadati', 'telecharger tableau'],
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
  'Resize columns': ['ridimensiona colonne', 'adatta colonne', 'resize columns', 'autosize']
};

// Synonyms for option values.
const OPTION_SYNONYMS = {
  on: ['apri', 'mostra', 'open', 'show'], off: ['chiudi', 'nascondi', 'close', 'hide'],
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
  show: ['mostra', 'show'], hide_: [], apply: ['applica', 'apply', 'mantieni', 'keep'], 'not-apply': ['non applicare', 'ignora', 'ignore', 'default']
};

// Windows-1252 code points some i18n strings use as numeric entities (&#156; = œ).
const CP1252 = { 128: '€', 140: 'Œ', 156: 'œ', 145: '‘', 146: '’', 147: '“', 148: '”', 150: '–', 151: '—', 133: '…' };
function decodeEntities(text) {
  return String(text).replace(/&#(\d+);/g, (_, code) => CP1252[code] || String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function stripTags(text) { return decodeEntities(String(text ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }

// Every translation of a UI string, using SPREAD's own i18n dictionaries.
function translations(text) {
  const label = stripTags(text);
  const out = new Set(label ? [label] : []);
  if (typeof gtiz_languages === 'undefined' || !label) return { all: [...out], english: label };
  let english = label;
  for (const dictionary of Object.values(gtiz_languages)) {
    for (const [key, value] of Object.entries(dictionary)) {
      if (typeof value !== 'string' || stripTags(value) !== label) continue;
      for (const other of Object.values(gtiz_languages)) if (typeof other[key] === 'string') out.add(stripTags(other[key]));
      if (typeof gtiz_languages.en?.[key] === 'string') english = stripTags(gtiz_languages.en[key]);
    }
  }
  return { all: [...out], english };
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
  return { id, area, iid: item.id, type: item.type, label: hasLabel ? stripTags(labelOf(labelItem)) : '', terms: terms.filter(Boolean), options: optionEntries.map((option, index) => ({ ...option, label: stripTags(options[index].label) })), min: item.min, max: item.max, valueRequired };
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
const MACROS_KEY = 'spread-assistant-macros';

function readMacros() {
  try { return JSON.parse(localStorage.getItem(MACROS_KEY) || '[]'); }
  catch (_) { return []; }
}

function writeMacros(macros) {
  try { localStorage.setItem(MACROS_KEY, JSON.stringify(macros)); } catch (_) { /* storage unavailable */ }
}

function nativeMacros() {
  return [...actionRegistry.values()].filter((entry) => entry.area === 'macro').map((entry) => ({ id: entry.id, name: stripTags(labelOf(entry.item)) }));
}

function findMacro(name) {
  const wanted = normIntent(name);
  const own = readMacros();
  const all = [...own.map((macro) => ({ ...macro, own: true })), ...nativeMacros()];
  if (!wanted && all.length === 1) return all[0];
  const index = /^\d+$/.test(wanted) ? Number(wanted) - 1 : -1;
  if (index >= 0 && index < all.length) return all[index];
  return all.find((macro) => normIntent(macro.name) === wanted) ||
    all.find((macro) => similarIntent(normIntent(macro.name), wanted)) ||
    all.find((macro) => wanted && normIntent(macro.name).includes(wanted));
}

// Handles a macro request.  Returns actions to plan, or a message.
function handleMacro(request) {
  const text = copy();
  if (request.op === 'list') {
    const own = readMacros();
    const native = nativeMacros();
    if (!own.length && !native.length) return { message: text.macroNone };
    const lines = [...own.map((macro) => `• ${macro.name} (${macro.steps.length} ${text.macroSteps})`), ...native.map((macro) => `• ${macro.name} (${text.macroNative})`)];
    return { message: `${text.macroList}:\n${lines.join('\n')}${own.length ? '' : `\n\n${text.macroNone}`}` };
  }
  if (request.op === 'define') {
    const macros = readMacros();
    const name = request.name || `Macro ${macros.length + 1}`;
    const kept = macros.filter((macro) => normIntent(macro.name) !== normIntent(name));
    kept.push({ name, steps: request.steps, created: new Date().toISOString() });
    writeMacros(kept);
    return { message: `${text.macroSaved(name, request.steps.length)}\n${request.steps.map((step, index) => `${index + 1}. ${describeAction(step)}`).join('\n')}` };
  }
  if (request.op === 'record') {
    const steps = request.steps === 'last-plan' ? lastAppliedPlan : history.slice(-request.steps);
    if (!history.length) return { message: text.historyEmpty, warning: true };
    if (request.steps !== 'last-plan' && request.steps > history.length) return { message: text.historyShort(history.length), warning: true };
    const macros = readMacros();
    const name = request.name || `Macro ${macros.length + 1}`;
    const kept = macros.filter((macro) => normIntent(macro.name) !== normIntent(name));
    kept.push({ name, steps: steps.map((step) => ({ id: step.id, value: step.value })), created: new Date().toISOString() });
    writeMacros(kept);
    return { message: `${text.macroSaved(name, steps.length)}\n${steps.map((step, index) => `${index + 1}. ${describeAction(step)}`).join('\n')}` };
  }
  if (request.op === 'rename') {
    const macros = readMacros();
    const target = request.name ? findMacro(request.name) : (macros.length ? { ...macros[macros.length - 1], own: true } : null);
    if (!target || !target.own) return { message: text.macroMissing(request.name || ''), warning: true };
    writeMacros(macros.map((macro) => (macro.name === target.name ? { ...macro, name: request.to } : macro)));
    return { message: text.macroRenamed(target.name, request.to) };
  }
  const macro = findMacro(request.name);
  if (!macro) return { message: text.macroMissing(request.name || ''), warning: true };
  if (request.op === 'delete') {
    if (!macro.own) return { message: text.macroMissing(request.name || ''), warning: true };
    writeMacros(readMacros().filter((entry) => entry.name !== macro.name));
    return { message: text.macroDeleted(macro.name) };
  }
  return { actions: macro.own ? macro.steps.map((step) => ({ ...step })) : [{ id: macro.id }] };
}

// Read-only statistics on the loaded metadata (optionally filtered).
const STATS_TEXT = {
  it: { total: (n) => `Ci sono ${n} campioni.`, columns: (list) => `Colonne (${list.length}): ${list.join(', ')}.`, distinct: (c, n) => `La colonna ${c} ha ${n} valori distinti`, groups: (c) => `Campioni per ${c}`, mode: (c, v, n, t) => `Il valore più frequente di ${c} è “${v}” (${n} su ${t} campioni).`, max: (c, v) => `Il valore massimo di ${c} è ${v}.`, min: (c, v) => `Il valore minimo di ${c} è ${v}.`, range: (c, a, b) => `${c} va da ${a} a ${b}.`, missing: (c, n, t) => `${n} campioni su ${t} non hanno un valore in ${c}.`, among: (w, n) => ` (tra ${n} campioni con ${w})`, none: 'Nessun campione soddisfa la condizione.', more: (n) => `… e altri ${n}` },
  en: { total: (n) => `There are ${n} samples.`, columns: (list) => `Columns (${list.length}): ${list.join(', ')}.`, distinct: (c, n) => `Column ${c} has ${n} distinct values`, groups: (c) => `Samples per ${c}`, mode: (c, v, n, t) => `The most frequent ${c} is “${v}” (${n} of ${t} samples).`, max: (c, v) => `The maximum ${c} is ${v}.`, min: (c, v) => `The minimum ${c} is ${v}.`, range: (c, a, b) => `${c} ranges from ${a} to ${b}.`, missing: (c, n, t) => `${n} of ${t} samples have no value in ${c}.`, among: (w, n) => ` (among ${n} samples with ${w})`, none: 'No sample matches the condition.', more: (n) => `… and ${n} more` },
  fr: { total: (n) => `Il y a ${n} échantillons.`, columns: (list) => `Colonnes (${list.length}) : ${list.join(', ')}.`, distinct: (c, n) => `La colonne ${c} a ${n} valeurs distinctes`, groups: (c) => `Échantillons par ${c}`, mode: (c, v, n, t) => `La valeur la plus fréquente de ${c} est « ${v} » (${n} sur ${t}).`, max: (c, v) => `Le maximum de ${c} est ${v}.`, min: (c, v) => `Le minimum de ${c} est ${v}.`, range: (c, a, b) => `${c} va de ${a} à ${b}.`, missing: (c, n, t) => `${n} échantillons sur ${t} n’ont pas de valeur dans ${c}.`, among: (w, n) => ` (parmi ${n} échantillons avec ${w})`, none: 'Aucun échantillon ne correspond à la condition.', more: (n) => `… et ${n} autres` }
};

function statsMessage(stats) {
  const lang = (typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en';
  const t = STATS_TEXT[lang] || STATS_TEXT.en;
  let rows = metadataRows();
  if (stats.where) rows = matchRows(rows, resolveWhere(stats.where));
  if (!rows.length) return { message: t.none, warning: true };
  const scope = stats.where ? t.among(describeWhere(stats.where), rows.length) : '';
  if (stats.kind === 'total') return { message: t.total(rows.length) };
  if (stats.kind === 'columns') return { message: t.columns(liveColumns()) };
  const column = stats.column;
  const values = rows.map((row) => String(row[column] ?? '').trim());
  const present = values.filter(Boolean);
  const counts = new Map();
  present.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  const list = (limit) => ranked.slice(0, limit).map(([value, count]) => `• ${value}: ${count}`).join('\n') + (ranked.length > limit ? `\n${t.more(ranked.length - limit)}` : '');
  const numeric = present.length && present.every((value) => !Number.isNaN(Number(value)));
  const sorted = [...present].sort((a, b) => (numeric ? Number(a) - Number(b) : a.localeCompare(b)));
  switch (stats.kind) {
    case 'distinct': return { message: `${t.distinct(column, counts.size)}${scope}:\n${list(25)}` };
    case 'groups': return { message: `${t.groups(column)}${scope}:\n${list(25)}` };
    case 'mode': return ranked.length ? { message: t.mode(column, ranked[0][0], ranked[0][1], rows.length) + scope } : { message: t.none, warning: true };
    case 'max': return { message: t.max(column, sorted[sorted.length - 1]) + scope };
    case 'min': return { message: t.min(column, sorted[0]) + scope };
    case 'range': return { message: t.range(column, sorted[0], sorted[sorted.length - 1]) + scope };
    case 'missing': return { message: t.missing(column, values.length - present.length, values.length) + scope };
    default: return { message: copy().invalid, warning: true };
  }
}

function queryMessage(query) {
  const rows = matchRows(metadataRows(), resolveWhere(query.where));
  if (!rows.length) return { message: copy().none, warning: true, empty: true };
  const ids = rows.map((row) => String(row.ID));
  const shown = ids.slice(0, 40).join(', ') + (ids.length > 40 ? ', …' : '');
  return { message: `${copy().count(rows.length)} [${describeWhere(query.where)}]:\n${shown}` };
}

function readUnresolved() {
  try { return JSON.parse(localStorage.getItem(UNRESOLVED_KEY) || '[]'); }
  catch (_) { return []; }
}

// Requests the assistant could not map are kept locally (never sent anywhere)
// so maintainers can see which ideas users had and extend the grammar.
function logUnresolved(request, reason) {
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
  if (!entry) throw new Error('L’azione non è disponibile nella configurazione attuale.');
  const { item } = entry;
  if (typeof item.function !== 'function') throw new Error(`“${labelOf(item)}” richiede l’interfaccia nativa.`);
  const value = validate(item, action.value);
  if (item.type === 'abutton_optioned') invokeOptioned(item, value);
  else if (entry.invoke) entry.invoke(item, value);
  else if (entry.area.startsWith('settings/') && viaControl(item, value)) { /* the UI's own handler ran */ }
  else if (value === undefined) item.function();
  else item.function(value);
  syncControls(item, value);
  return describeAction(action);
}

function addMessage(panel, role, text) {
  const node = document.createElement('div');
  node.className = `spread-assistant__message spread-assistant__message--${role}${role === 'success' || role === 'warning' ? ' spread-assistant__message--assistant' : ''}`;
  node.textContent = text;
  panel.querySelector('.spread-assistant__messages').append(node);
  node.scrollIntoView({ block: 'end' });
}

function clearPlan(panel) { pendingActions = []; lastProposedActions = []; panel.querySelector('.spread-assistant__plan').hidden = true; }
function describeWhere(where) {
  if (!where) return '';
  if (where.selected) return 'selected';
  if (where.ids) return `ID ∈ {${where.ids.join(', ')}}`;
  if (where.all) return where.all.map(describeWhere).join(' AND ');
  if (where.any) return `(${where.any.map(describeWhere).join(' OR ')})`;
  const symbols = { eq: '=', ne: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', contains: 'contains', empty: 'is empty', notempty: 'is not empty', in: '∈' };
  const value = Array.isArray(where.value) ? `{${where.value.join(', ')}}` : where.value === undefined ? '' : ` “${where.value}”`;
  return `${where.column} ${symbols[where.op] || where.op}${Array.isArray(where.value) ? ' ' + value : value}`;
}

// Readable name of a plan step, also for toggles that have no label of their
// own (their option label, e.g. "Mostra etichette", says what they do).
function readableLabel(entry, value) {
  const item = entry.item;
  const hasLabel = typeof item.label === 'function' || Boolean(item.label);
  const options = optionsOf(item);
  const option = options.find((candidate) => String(candidate.value) === String(value));
  if (entry.area === 'layout') return `${stripTags(option?.label || item.type)}: ${value}`;
  if (!hasLabel && option) {
    const labels = new Set(options.map((candidate) => stripTags(candidate.label)));
    return labels.size === options.length ? stripTags(option.label) : `${stripTags(option.label)}: ${value}`;
  }
  if (!hasLabel) {
    const twin = item.id && [...actionRegistry.values()].find((other) => other.item.id === `${item.id}-slider`);
    if (twin) return `${stripTags(labelOf(twin.item))} = ${value}`;
  }
  return '';
}

function describeAction(action) {
  const entry = actionRegistry.get(action.id);
  if (action.id === 'assistant:language' && entry) return `${stripTags(labelOf(entry.item))}: ${action.value}`;
  const readable = entry && action.value !== undefined && typeof action.value !== 'object' && !String(action.id).startsWith('assistant:') ? readableLabel(entry, action.value) : '';
  if (readable) return readable;
  const label = entry ? stripTags(labelOf(entry.item)) : action.id;
  const value = action.value;
  if (value === undefined) return label;
  if (value && typeof value === 'object') {
    const scope = value.where ? ` [${describeWhere(value.where)}]` : '';
    switch (action.id) {
      case 'assistant:metadata-add-column': return `${label}: ${value.column}${value.value !== '' ? ` = “${value.value}”` : ''}${scope}${value.where && value.otherValue ? `, else “${value.otherValue}”` : ''}`;
      case 'assistant:metadata-set': return `${label}: ${value.column} = “${value.value}”${scope}`;
      case 'assistant:metadata-rename-column': return `${label}: ${value.from} → ${value.to}`;
      case 'assistant:metadata-delete-column': return `${label}: ${value.column}`;
      case 'assistant:metadata-sort': return `${label}: ${value.column} ${value.direction === 'desc' ? '↓' : '↑'}`;
      case 'assistant:select': return `${label}: ${value.mode === 'all' || value.mode === 'clear' ? value.mode : `${value.mode} ${describeWhere(value.where)}`}`;
      default: break;
    }
    const { category, id, colour, latitude, longitude } = value;
    if (latitude !== undefined) return `${label}: ${latitude}, ${longitude}`;
    return id === undefined ? `${label}: ${category} = ${value.value}` : `${label}: ${category || 'ID'} / ${id} = ${colour}`;
  }
  return `${label} = ${value}`;
}

const AUTO_KEY = 'spread-assistant-auto-apply';
function autoApply() { try { return localStorage.getItem(AUTO_KEY) === '1'; } catch (_) { return false; } }

function showPlan(panel, actions) {
  pendingActions = actions;
  lastProposedActions = actions.map((action) => ({ id: action.id, value: action.value }));
  panel.querySelector('.spread-assistant__plan-title').textContent = copy().plan;
  const list = panel.querySelector('.spread-assistant__plan ol');
  list.replaceChildren(...actions.map((action) => {
    const item = document.createElement('li');
    item.textContent = describeAction(action);
    return item;
  }));
  panel.querySelector('.spread-assistant__plan').hidden = false;
  // A language change reloads the page, so it always asks first.
  if (autoApply() && !actions.some((action) => action.id === 'assistant:language')) confirm(panel);
}

// Each step is validated against the state left by the previous one, so a
// plan can create a column and then colour by it.
async function confirm(panel) {
  const done = [];
  const applied = [];
  const steps = pendingActions.slice();
  const buttons = panel.querySelectorAll('[data-assistant-confirm], [data-assistant-cancel]');
  buttons.forEach((button) => { button.disabled = true; });
  try {
    for (const action of steps) {
      try {
        done.push(execute(action));
        applied.push({ id: action.id, value: action.value });
        history.push({ id: action.id, value: action.value });
        history = history.slice(-200);
        lastAppliedPlan = applied.slice();
      } catch (error) {
        if (done.length) addMessage(panel, 'success', `${copy().done}: ${done.join(', ')}.`);
        addMessage(panel, 'warning', `${copy().notApplied} “${describeAction(action)}”: ${error.message}`);
        return;
      }
      // SPREAD propagates some changes asynchronously (e.g. tree selection to
      // the metadata grid): let them settle before the next step, as a user would.
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    addMessage(panel, 'success', `${copy().done}: ${done.join(', ')}.`);
    if (applied.some((action) => actionRegistry.get(action.id)?.area === 'layout')) relayout();
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
    clearPlan(panel);
  }
}

// Fixed phrasings for short, unambiguous requests (tree zoom, centre, panels,
// log scale, colour by).  They run before the generic catalog resolver so an
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

const HELP = {
  it: [
    ['Filtri e domande', 'dammi i metadati dove regione è Abruzzo e source è food · quanti campioni ci sono nel 2026? · togli il filtro'],
    ['Selezione', 'seleziona i campioni con data dopo il 2026-01-10 · seleziona Lazio o Toscana · deseleziona tutto'],
    ['Selezione + azione', 'nascondi i campioni di Teramo · collassa quelli del cluster A · mostra solo i campioni confermati'],
    ['Colori', 'colora per sierotipo · colora di rosso la Toscana · seleziona Teramo e colorali di blu'],
    ['Colonne', 'aggiungi la colonna focolaio con valore sì per i selezionati · rinomina matrix in matrice · elimina la colonna note'],
    ['Valori', 'sostituisci Roma con Rieti nella colonna provincia · imposta outcome a confirmed dove cluster è A'],
    ['Tabella', 'ordina la tabella per data decrescente · esporta la tabella in csv'],
    ['Albero e mappa', 'mostra le etichette dei nodi · scala logaritmica · dimensione nodi 200 · dezooma 2x · mappa di calore'],
    ['Pannelli e video', 'apri la mappa · chiudi la legenda · riproduci il video · velocità del video 2x'],
    ['Macro', 'registra gli ultimi 3 passaggi come macro Teramo · dammi la lista delle macro · esegui la macro Teramo'],
    ['Lingua', 'cambia lingua in inglese (ricarica la pagina)']
  ],
  en: [
    ['Filters and questions', 'show me the metadata where region is Abruzzo and source is food · how many samples are from 2026? · clear the filter'],
    ['Selection', 'select samples with date after 2026-01-10 · select Lazio or Toscana · deselect all'],
    ['Selection + action', 'hide the samples from Teramo · collapse cluster A · show only confirmed samples'],
    ['Colours', 'colour by serovar · make Toscana red · select Teramo and colour them blue'],
    ['Columns', 'add a column named outbreak with value yes for the selected · rename column matrix to sample_matrix · delete the notes column'],
    ['Values', 'replace Roma with Rieti in the province column · set outcome to confirmed where cluster is A'],
    ['Table', 'sort the table by date descending · export the table as csv'],
    ['Tree and map', 'show node labels · log scale · node size 200 · zoom out 2x · heatmap'],
    ['Panels and video', 'open the map · close the legend · play the timeline · timeline speed 2x'],
    ['Macros', 'record the last 3 steps as macro Teramo · list the macros · run macro Teramo'],
    ['Language', 'switch language to Italian (reloads the page)']
  ]
};

function helpReply(request) {
  const words = normalizeTerms(request);
  if (!/^(?:aiuto|help|aide|\?|cosa sai fare|che cosa sai fare|cosa puoi fare|cosa posso (?:fare|chiedere|scrivere)|comandi|esempi|what can you do|what can i (?:ask|do|say)|commands|examples|que sais tu faire|que peux tu faire|commandes|exemples)\b/.test(words)) return '';
  const lang = (typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en';
  const sections = HELP[lang] || HELP.en;
  return `${copy().help}\n${sections.map(([title, examples]) => `• ${title}: ${examples}`).join('\n')}`;
}

function factualReply(request) {
  const help = helpReply(request);
  if (help) return help;
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

function validateProposedAction(action, virtual) {
  const item = actionRegistry.get(action.id)?.item;
  if (typeof item?.function !== 'function') return false;
  if (action.deferred) return true;
  try { validate(item, action.value, virtual); return true; }
  catch (_) { return false; }
}

function proposalError(action, virtual) {
  const item = actionRegistry.get(action.id)?.item;
  if (typeof item?.function !== 'function') return copy().invalid;
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
    return accept(result.actions);
  }
  return null;
}

// Empty the conversation and any pending plan; keep the intro and examples.
function clearChat(panel) {
  clearPlan(panel);
  const messages = panel.querySelector('.spread-assistant__messages');
  [...messages.children].forEach((node, index) => { if (index > 0 && !node.classList.contains('spread-assistant__examples')) node.remove(); });
  renderExamples(panel);
  messages.scrollTop = 0;
}

function runClauses(panel, clauses) {
  const search = { clauses, plan: [], unresolved: [] };
  for (const request of clauses) {
    const fact = factualReply(request);
    if (fact) {
      addMessage(panel, 'assistant', fact);
      continue;
    }
    let result;
    try { result = resolveClause(request, search); }
    catch (error) { result = { error: error.message }; }
    if (result?.note) addMessage(panel, result.note.warning ? 'warning' : 'assistant', result.note.message);
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
    search.unresolved.push({ request, reply: `${copy().invalid} ${copy().hint}` });
  }
  for (const { request, reply } of search.unresolved) {
    addMessage(panel, 'warning', clauses.length > 1 ? `“${request}” — ${reply}` : reply);
  }
  if (search.plan.length) showPlan(panel, search.plan);
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
  const message = input.value.trim();
  if (!message) return;
  if (/^(?:pulisci|svuota|cancella|azzera|clear|reset|empty|efface|vide)\s+(?:la\s+|the\s+|la\s+)?(?:chat|conversazione|conversation|cronologia della chat|messaggi|messages)\s*[.!]?$/i.test(message)) {
    input.value = '';
    rememberPrompt(message);
    clearChat(panel);
    return;
  }
  clearPlan(panel);
  addMessage(panel, 'user', message);
  rememberPrompt(message);
  input.value = '';
  runClauses(panel, splitClauses(message));
}

// The deployed build is in js/assistant-version.json.  An open page polls it
// and tells the user to reload when a newer assistant has been published.
const LOADED_BUILD = new URL(import.meta.url).searchParams.get('v') || '';
function watchForUpdates(panel, launcher) {
  if (!LOADED_BUILD) return;
  const check = async () => {
    try {
      const response = await fetch(new URL('./assistant-version.json', import.meta.url), { cache: 'no-store' });
      if (!response.ok) return;
      const { build } = await response.json();
      if (build && String(build) !== LOADED_BUILD) {
        panel.querySelector('.spread-assistant__update').hidden = false;
        launcher.classList.add('has-update');
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

function renderExamples(panel) {
  const box = panel.querySelector('.spread-assistant__examples');
  if (!box || panel.querySelector('.spread-assistant__message--user')) return;
  const lang = (typeof gtiz_locales !== 'undefined' && gtiz_locales.getActiveLanguageCode()) || 'en';
  const { rows, categorical, date } = exampleColumns();
  const prompts = [];
  const [first, second] = categorical;
  const row = rows.find((candidate) => first && second && candidate[first.column] && candidate[second.column]);
  const words = {
    it: { title: 'Prova per esempio', colour: (c) => `colora l'albero per ${c}`, filter: (a, x, b, y) => `dammi i metadati dove ${a} è ${x} e ${b} è ${y}`, hide: (c, x) => `seleziona i campioni con ${c} ${x} e nascondili`, after: (c, d) => `seleziona i campioni con ${c} dopo il ${d} e collassali`, sort: (c) => `ordina la tabella per ${c} decrescente`, count: (c, x) => `quanti campioni hanno ${c} ${x}?`, export: 'esporta la tabella in csv', macro: 'registra gli ultimi 2 passaggi come macro' },
    en: { title: 'Try for example', colour: (c) => `colour the tree by ${c}`, filter: (a, x, b, y) => `show me the metadata where ${a} is ${x} and ${b} is ${y}`, hide: (c, x) => `select samples with ${c} ${x} and hide them`, after: (c, d) => `select samples with ${c} after ${d} and collapse them`, sort: (c) => `sort the table by ${c} descending`, count: (c, x) => `how many samples have ${c} ${x}?`, export: 'export the table as csv', macro: 'record the last 2 steps as a macro' },
    fr: { title: 'Essayez par exemple', colour: (c) => `colorer l'arbre par ${c}`, filter: (a, x, b, y) => `montre les métadonnées où ${a} est ${x} et ${b} est ${y}`, hide: (c, x) => `sélectionne les échantillons avec ${c} ${x} et masque-les`, after: (c, d) => `sélectionne les échantillons avec ${c} après ${d}`, sort: (c) => `trie le tableau par ${c} décroissant`, count: (c, x) => `combien d'échantillons ont ${c} ${x} ?`, export: 'exporte le tableau en csv', macro: 'enregistre les 2 dernières étapes comme macro' }
  }[lang] || null;
  if (!words) return;
  if (first) prompts.push(words.colour(first.column));
  if (row) prompts.push(words.filter(first.column, row[first.column], second.column, row[second.column]));
  if (date) {
    const sortedDates = [...date.values].sort();
    prompts.push(words.after(date.column, sortedDates[Math.floor(sortedDates.length / 2)].slice(0, 10)));
  } else if (second) prompts.push(words.hide(second.column, second.values[0]));
  if (first) prompts.push(words.count(first.column, first.values[0]));
  prompts.push(words.sort(date ? date.column : (first?.column || 'ID')));
  prompts.push(words.export);
  const escape = (value) => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  box.innerHTML = `<div class="spread-assistant__examples-title">${words.title}</div>${prompts.map((prompt) => `<button type="button" class="spread-assistant__chip">${escape(prompt)}</button>`).join('')}`;
}

// Floating panel: drag by the header, resize from the corner (CSS resize),
// remember geometry; double-click the header to reset it.
const GEOMETRY_KEY = 'spread-assistant-geometry';

function placePanel(panel, reset) {
  let geometry;
  try { geometry = reset ? null : JSON.parse(localStorage.getItem(GEOMETRY_KEY) || 'null'); } catch (_) { geometry = null; }
  const width = Math.min(geometry?.width || 380, window.innerWidth - 16);
  const height = Math.min(geometry?.height || Math.min(560, window.innerHeight - 48), window.innerHeight - 16);
  const left = Math.min(Math.max(8, geometry?.left ?? window.innerWidth - width - 24), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, geometry?.top ?? window.innerHeight - height - 24), window.innerHeight - height - 8);
  Object.assign(panel.style, { width: `${width}px`, height: `${height}px`, left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto' });
}

const DOCK_KEY = 'spread-assistant-docked';
const DOCK_WIDTH_KEY = 'spread-assistant-dock-width';
function isDocked() { try { return localStorage.getItem(DOCK_KEY) === '1'; } catch (_) { return false; } }

// Align the docked panel with SPREAD's card area (same top, bottom and right
// margin as the tree/metadata/legend cards), so it floats like one of them.
function alignDock() {
  const area = document.querySelector('.main.dashboard-viewport') || document.querySelector('main');
  const root = document.documentElement;
  if (!area) return;
  // The tree card is always visible: match its top and bottom edges exactly.
  const card = document.querySelector('.tree-container');
  const rect = (card && card.getBoundingClientRect().height > 0 ? card : area).getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(area).marginRight) || 15;
  root.style.setProperty('--spread-assistant-top', `${Math.max(8, Math.round(rect.top))}px`);
  root.style.setProperty('--spread-assistant-bottom', `${Math.max(8, Math.round(window.innerHeight - rect.bottom))}px`);
  root.style.setProperty('--spread-assistant-gap', `${Math.round(gap)}px`);
}

// Docked mode: a full-height side panel; SPREAD's dashboard shrinks to make room.
function setDocked(panel, docked) {
  const text = copy();
  const button = panel.querySelector('.spread-assistant__dock');
  panel.classList.toggle('is-docked', docked);
  document.documentElement.classList.toggle('spread-assistant-docked', docked && !panel.hidden);
  button.title = docked ? text.undock : text.dock;
  button.setAttribute('aria-label', button.title);
  button.querySelector('i').className = `tabler ${docked ? 'tabler-picture-in-picture' : 'tabler-layout-sidebar-right'}`;
  if (docked) {
    alignDock();
    let width = '';
    try { width = localStorage.getItem(DOCK_WIDTH_KEY) || ''; } catch (_) { /* ignore */ }
    document.documentElement.style.setProperty('--spread-assistant-width', width || '380px');
    Object.assign(panel.style, { left: '', top: '', width: '', height: '', right: '', bottom: '' });
  } else placePanel(panel);
  relayout();
}

// SPREAD redraws tree, map and table on window resize; give layout a frame first.
function relayout() {
  const resize = () => window.dispatchEvent(new Event('resize'));
  requestAnimationFrame(resize);
  // SPREAD's cards animate for 0.8 s; resize again once they have settled.
  setTimeout(resize, 400);
  setTimeout(() => {
    resize();
    setTimeout(() => { try { gtiz_tree?.tree?.resize?.(); gtiz_tree?.tree?.centerGraph?.(); } catch (_) { /* tree not ready */ } }, 120);
  }, 1000);
}

function saveGeometry(panel) {
  if (panel.hidden || panel.classList.contains('is-docked')) return;
  const rect = panel.getBoundingClientRect();
  try { localStorage.setItem(GEOMETRY_KEY, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) })); } catch (_) { /* ignore */ }
}

function makeFloating(panel) {
  const header = panel.querySelector('.spread-assistant__header');
  let drag;
  header.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, select') || panel.classList.contains('is-docked') || window.matchMedia('(max-width: 560px)').matches) return;
    const rect = panel.getBoundingClientRect();
    drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    header.setPointerCapture(event.pointerId);
    panel.classList.add('is-dragging');
  });
  header.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = panel.getBoundingClientRect();
    const left = Math.min(Math.max(8, event.clientX - drag.x), window.innerWidth - rect.width - 8);
    const top = Math.min(Math.max(8, event.clientY - drag.y), window.innerHeight - rect.height - 8);
    Object.assign(panel.style, { left: `${left}px`, top: `${top}px` });
  });
  const stop = () => {
    if (!drag) return;
    drag = undefined;
    panel.classList.remove('is-dragging');
    saveGeometry(panel);
  };
  header.addEventListener('pointerup', stop);
  header.addEventListener('pointercancel', stop);
  header.addEventListener('dblclick', (event) => {
    if (event.target.closest('button, select') || panel.classList.contains('is-docked')) return;
    try { localStorage.removeItem(GEOMETRY_KEY); } catch (_) { /* ignore */ }
    placePanel(panel, true);
  });
  if (typeof ResizeObserver === 'function') {
    let timer;
    new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(() => saveGeometry(panel), 250); }).observe(panel);
  }
  window.addEventListener('resize', () => {
    if (panel.hidden) return;
    if (panel.classList.contains('is-docked')) alignDock();
    else placePanel(panel);
  });
  panel.querySelector('.spread-assistant__dock').addEventListener('click', () => {
    const docked = !panel.classList.contains('is-docked');
    try { localStorage.setItem(DOCK_KEY, docked ? '1' : '0'); } catch (_) { /* ignore */ }
    setDocked(panel, docked);
  });
  // Docked: drag the left edge to change the width.
  const edge = panel.querySelector('.spread-assistant__edge');
  let resizing = false;
  edge.addEventListener('pointerdown', (event) => { resizing = true; edge.setPointerCapture(event.pointerId); panel.classList.add('is-dragging'); });
  edge.addEventListener('pointermove', (event) => {
    if (!resizing) return;
    const width = Math.min(Math.max(300, window.innerWidth - event.clientX), Math.round(window.innerWidth * 0.6));
    document.documentElement.style.setProperty('--spread-assistant-width', `${width}px`);
  });
  const stopResize = () => {
    if (!resizing) return;
    resizing = false;
    panel.classList.remove('is-dragging');
    try { localStorage.setItem(DOCK_WIDTH_KEY, getComputedStyle(document.documentElement).getPropertyValue('--spread-assistant-width').trim()); } catch (_) { /* ignore */ }
    relayout();
  };
  edge.addEventListener('pointerup', stopResize);
  edge.addEventListener('pointercancel', stopResize);
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
  const escape = (value) => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  panel.innerHTML = `
    <div class="spread-assistant__edge" aria-hidden="true"></div>
    <div class="spread-assistant__header">
      <span class="spread-assistant__avatar"><i class="tabler tabler-message-chatbot"></i></span>
      <div class="spread-assistant__heading"><h2>${text.title}</h2><div class="spread-assistant__status">${text.status}</div></div>
      <button type="button" class="spread-assistant__icon spread-assistant__clear" aria-label="${text.clear}" title="${text.clear}"><i class="tabler tabler-eraser"></i></button>
      <button type="button" class="spread-assistant__icon spread-assistant__dock" aria-label="${text.dock}" title="${text.dock}"><i class="tabler tabler-layout-sidebar-right"></i></button>
      <button type="button" class="spread-assistant__close" aria-label="${text.close}">×</button>
    </div>
    <div class="spread-assistant__messages">
      <div class="spread-assistant__message spread-assistant__message--assistant">${text.intro}</div>
      <div class="spread-assistant__examples"></div>
    </div>
    <div class="spread-assistant__plan" hidden><div class="spread-assistant__plan-box">
      <div class="spread-assistant__plan-title"></div>
      <ol></ol>
      <div class="spread-assistant__actions"><button type="button" class="button" data-assistant-confirm>${text.apply}</button><button type="button" class="button button-secondary" data-assistant-cancel>${text.cancel}</button></div>
    </div></div>
    <div class="spread-assistant__update" hidden><span>${text.update}</span><button type="button" class="button" data-assistant-reload>${text.reload}</button></div>
    <form class="spread-assistant__form"><textarea rows="1" aria-label="${text.title}" placeholder="${text.placeholder}" required></textarea><button type="submit" class="spread-assistant__send" aria-label="${text.send}" title="${text.send}"><i class="tabler tabler-send"></i></button></form>
    <label class="spread-assistant__auto"><input type="checkbox" data-assistant-auto> <span>${text.autoApply}</span></label>`;
  document.body.append(launcher, panel);
  const openAssistant = (event) => {
    event.preventDefault();
    event.stopPropagation();
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    renderExamples(panel);
    if (isDocked()) setDocked(panel, true);
    else placePanel(panel);
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
    if (document.documentElement.classList.contains('spread-assistant-docked')) {
      document.documentElement.classList.remove('spread-assistant-docked');
      relayout();
    }
  });
  panel.querySelector('form').addEventListener('submit', (event) => submit(event, panel));
  const textarea = panel.querySelector('textarea');
  const autosize = () => { textarea.style.height = 'auto'; textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`; };
  textarea.addEventListener('input', autosize);
  // Enter sends, Shift+Enter starts a new line.
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      panel.querySelector('form').requestSubmit();
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
  panel.querySelector('.spread-assistant__examples').addEventListener('click', (event) => {
    const chip = event.target.closest('.spread-assistant__chip');
    if (!chip) return;
    textarea.value = chip.textContent;
    autosize();
    textarea.focus();
  });
  makeFloating(panel);
  panel.querySelector('.spread-assistant__clear').addEventListener('click', () => clearChat(panel));
  const auto = panel.querySelector('[data-assistant-auto]');
  auto.checked = autoApply();
  auto.addEventListener('change', () => { try { localStorage.setItem(AUTO_KEY, auto.checked ? '1' : '0'); } catch (_) { /* ignore */ } });
  panel.querySelector('[data-assistant-reload]').addEventListener('click', () => window.location.reload());
  watchForUpdates(panel, launcher);
  panel.querySelector('[data-assistant-confirm]').addEventListener('click', () => confirm(panel));
  panel.querySelector('[data-assistant-cancel]').addEventListener('click', () => clearPlan(panel));
  // Read-only development hook: it makes coverage of the generated catalog
  // testable without granting arbitrary command execution to page scripts.

  window.SPREAD_ASSISTANT = Object.freeze({
    context: () => { const ctx = buildContext(); return { columns: ctx.columns, catalog: ctx.catalog }; },
    plan: (message) => planFor(String(message)),
    lastPlan: () => lastProposedActions.map((action) => ({ ...action })),
    unresolved: () => readUnresolved(),
    macros: () => readMacros(),
    history: () => history.map((step) => ({ ...step })),
    clearUnresolved: () => { try { localStorage.removeItem(UNRESOLVED_KEY); } catch (_) { /* ignore */ } }
  });
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', mount);
else mount();
