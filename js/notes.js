let gtiz_notes = {};

/*
*
* Notes of the session (plan in docs/notes-plan.md): one ordered list of notes,
* each with a title, a text in a reduced Markdown and, optionally, the samples it
* is about and the image of a view. The list belongs to the session: it travels
* with the complete json and is exported as a notes file, as Markdown or as a
* Word report. The panel follows the macros panel (js/macros.js) in structure,
* classes and behaviour, and reuses its helpers for the fields and the warnings
* of the modals.
*
*/
gtiz_notes.notes = [];
gtiz_notes.show_marks = true;
// notes shown in the panel: all (null), the ones of a node of the tree
// ({ type : 'node', node }) or the general ones, without samples ({ type : 'general' })
gtiz_notes.filter = null;
// true when the notes changed after the last save of the session
gtiz_notes.dirty = false;
// set before a reload of the same session (zoom, back to the full tree, original
// tree, undo of a macro): the notes in memory are kept instead of the loaded ones
gtiz_notes.keep_session = false;
gtiz_notes.image_width = 1600;
gtiz_notes.limits = { title : 120, text : 20000, samples : 100000, image : 20000000 };

gtiz_notes.css_vars = gtiz_utils.getAllCssVariables();
gtiz_notes.scrolly_options = {
  opacity: 0.8,
  containerColor: 'var(--secondary-light)',
  barColor: 'var(--secondary-dark)',
  radius: 1,
  scaleY : 0.95,
  side : 'right',
  width : 0.3,
  unit : 'rem',
  // content measured with scrollHeight, bar draggable, as the other panels
  contentHeightMode : 'scroll',
  draggable : true,
};
gtiz_notes.scrolly = new Scrolly(gtiz_notes.scrolly_options);
// list of the samples in the modal of a note: the bar runs on the right edge of its
// dashed box, as the bar of the node shape card inside its box
// text of a note in its modal: the textarea scrolls by itself, so the bar follows
// the textarea (its own track and overflow) and stays inside its right edge
// scale 1: Scrolly drags on the unscaled track, a scaled one makes the bar lag behind
// the pointer
gtiz_notes.textarea_scrolly = new Scrolly({ ...gtiz_notes.scrolly_options, position : 'absolute', scaleY : 1, offset : 0.8, preserveNodeMaxHeight : true, verticalTrackMode : 'node', overflowCheckMode : 'self' });
// texts of the cards, scrolled in their boxes in the same way; the bar runs outside
// the box, on its right in the padding of the card, as tall as the text
gtiz_notes.text_scrolly = new Scrolly({ ...gtiz_notes.scrolly_options, position : 'absolute', scaleY : 1, offset : -0.8, preserveNodeMaxHeight : true });

gtiz_notes.panel_node = document.querySelector('.notes');
gtiz_notes.trigger = document.querySelector('.tool-notes');
gtiz_notes.close_node = document.querySelector('.notes-close');
gtiz_notes.input = document.getElementById('search-notes');
// trigger of the tree card shown when there are notes on the session
gtiz_notes.general_trigger = document.querySelector('.tree-notes-trigger');

/*
*
* Model: reading, writing and the session
*
*/

/**
 * New id of a note
 *
 * @returns {String} Id
 */
gtiz_notes.newId = function() {
  return 'n-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
};

/**
 * A note as read from the session or from a file, checked: a title, a text,
 * samples as texts and an image only as png data. Texts stay texts, never html.
 *
 * @param {Object} data Note read
 * @returns {Object|null} Note, or null when it is not valid
 */
gtiz_notes.normalizeNote = function(data) {
  if (!data || typeof data !== 'object' || typeof data.title !== 'string' || !data.title.trim()) {
    return null;
  }
  let limits = gtiz_notes.limits;
  let note = {
    id : typeof data.id === 'string' && data.id ? data.id.slice(0, 60) : gtiz_notes.newId(),
    title : data.title.trim().slice(0, limits.title),
    text : typeof data.text === 'string' ? data.text.slice(0, limits.text) : '',
    samples : Array.isArray(data.samples) ? [...new Set(data.samples.filter(id => typeof id === 'string' || typeof id === 'number').map(id => String(id)))].slice(0, limits.samples) : [],
    created : typeof data.created === 'string' ? data.created : new Date().toISOString(),
    updated : typeof data.updated === 'string' ? data.updated : undefined
  };
  let image = data.image;
  if (image && typeof image === 'object' && typeof image.src === 'string' && image.src.startsWith('data:image/png;base64,') && image.src.length <= limits.image) {
    note.image = {
      src : image.src,
      width : Number(image.width) > 0 ? Number(image.width) : 0,
      height : Number(image.height) > 0 ? Number(image.height) : 0,
      caption : typeof image.caption === 'string' ? image.caption.slice(0, 200) : ''
    };
  }
  return note;
};

/**
 * A note as stored in the session and in the files
 *
 * @param {Object} note Note
 * @returns {Object} Plain data
 */
gtiz_notes.serializeNote = function(note) {
  let data = { id : note.id, title : note.title, text : note.text, samples : note.samples, created : note.created };
  if (note.updated) {
    data.updated = note.updated;
  }
  if (note.image) {
    data.image = note.image;
  }
  return data;
};

/**
 * The notes for the complete json, or undefined when there are none
 *
 * @returns {Object|undefined} {version, show_marks, notes}
 */
gtiz_notes.getSessionData = function() {
  if (!gtiz_notes.notes.length) {
    return undefined;
  }
  return { version : 1, show_marks : gtiz_notes.show_marks, notes : gtiz_notes.notes.map(note => gtiz_notes.serializeNote(note)) };
};

/**
 * Notes of a tree being loaded: they replace the ones in memory, unless the same
 * session is being reloaded (see `keep_session`).
 *
 * @param {Object} data `gtiz_notes` of the complete json, undefined for a new tree
 * @returns {undefined}
 */
gtiz_notes.loadSession = function(data) {
  if (gtiz_notes.keep_session) {
    gtiz_notes.keep_session = false;
  } else {
    let list = data && Array.isArray(data.notes) ? data.notes : [];
    gtiz_notes.notes = list.map(note => gtiz_notes.normalizeNote(note)).filter(Boolean);
    gtiz_notes.show_marks = !(data && data.show_marks === false);
    gtiz_notes.dirty = false;
  }
  gtiz_notes.updateTree();
  gtiz_notes.refreshPanel();
};

/**
 * The notes changed: the tree and the panel show it, and leaving the page asks first
 *
 * @returns {undefined}
 */
gtiz_notes.changed = function() {
  gtiz_notes.dirty = true;
  gtiz_notes.updateTree();
  gtiz_notes.refreshPanel();
};

/**
 * The session has been saved with its notes
 *
 * @returns {undefined}
 */
gtiz_notes.saved = function() {
  gtiz_notes.dirty = false;
};

/**
 * Tell the tree which samples have notes, for the marks on the nodes
 *
 * @returns {undefined}
 */
gtiz_notes.updateTree = function() {
  let tree = gtiz_tree.tree;
  if (!tree) {
    return;
  }
  let samples = new Set();
  gtiz_notes.notes.forEach(note => note.samples.forEach(id => samples.add(id)));
  tree.note_samples = samples;
  tree.show_note_marks = gtiz_notes.show_marks;
  if (tree.renderer) {
    tree.renderer.requestRedraw();
  }
  gtiz_notes.updateGeneralTrigger();
  gtiz_notes.bindMarks(tree);
};

/**
 * Notes about the whole session, without samples
 *
 * @returns {Array} Notes
 */
gtiz_notes.generalNotes = function() {
  return gtiz_notes.notes.filter(note => !note.samples.length);
};

/**
 * Trigger of the tree card for the notes on the session: shown only when there
 * are some, it tells how many and opens the panel on them
 *
 * @returns {undefined}
 */
gtiz_notes.updateGeneralTrigger = function() {
  let trigger = gtiz_notes.general_trigger;
  if (!trigger) {
    return;
  }
  let count = gtiz_notes.generalNotes().length;
  trigger.hidden = count === 0;
  let text = gtiz_macros.plainText(count === 1 ? gtiz_locales.current.notes_general_count_one : gtiz_locales.current.notes_general_count).replace('{0}', count);
  trigger.setAttribute('title', text);
  trigger.setAttribute('aria-label', text);
};

/**
 * Node whose note mark is under a pointer event, null otherwise
 *
 * @param {Object} tree Tree
 * @param {Event} event Pointer event
 * @returns {Object|null} Node
 */
gtiz_notes.markUnderEvent = function(tree, event) {
  if (!tree.renderer || !tree.renderer.pickNoteMark || !gtiz_notes.show_marks) {
    return null;
  }
  let point = tree._pointerData(event);
  return tree.renderer.pickNoteMark(point[0], point[1]);
};

/**
 * The marks of the notes on the tree open the panel on the notes of their node:
 * the press on a mark does not reach the tree (no selection, no pan), the
 * pointer over a mark is a hand. Bound once for each tree
 *
 * @param {Object} tree Tree
 * @returns {undefined}
 */
gtiz_notes.bindMarks = function(tree) {
  if (!tree.svg || tree.notes_marks_bound) {
    return;
  }
  tree.notes_marks_bound = true;
  let svg = tree.svg.node();
  svg.addEventListener('mousedown', event => {
    if (gtiz_notes.markUnderEvent(tree, event)) {
      event.stopPropagation();
    }
  }, true);
  svg.addEventListener('click', event => {
    let node = gtiz_notes.markUnderEvent(tree, event);
    if (node) {
      event.stopPropagation();
      gtiz_notes.showFiltered({ type : 'node', node : node });
    }
  }, true);
  svg.addEventListener('mousemove', event => {
    svg.classList.toggle('note-mark-over', !!gtiz_notes.markUnderEvent(tree, event));
  });
};

/**
 * Show or hide the marks of the notes on the tree
 *
 * @param {Boolean} show True to show them
 * @returns {undefined}
 */
gtiz_notes.setMarksVisibility = function(show) {
  gtiz_notes.show_marks = !!show;
  gtiz_notes.updateTree();
};

/**
 * Samples of a node of the tree (a node may group several samples)
 *
 * @param {Object} node Force node
 * @returns {Array} Sample ids
 */
gtiz_notes.nodeSamples = function(node) {
  let tree = gtiz_tree.tree;
  let grouped = tree && tree.grouped_nodes ? tree.grouped_nodes[node.id] : null;
  return grouped && grouped.length ? grouped : [node.id];
};

/**
 * Notes about a node of the tree
 *
 * @param {Object} node Force node
 * @returns {Array} Notes
 */
gtiz_notes.nodeNotes = function(node) {
  if (!node || !gtiz_notes.notes.length) {
    return [];
  }
  let samples = gtiz_notes.nodeSamples(node);
  return gtiz_notes.notes.filter(note => note.samples.some(id => samples.includes(id)));
};

/**
 * Titles of the notes of a node, for its tooltip (escaped), empty without notes
 *
 * @param {Object} node Force node
 * @returns {String} Html
 */
gtiz_notes.tooltipHtml = function(node) {
  let notes = gtiz_notes.nodeNotes(node);
  if (!notes.length || !gtiz_notes.show_marks) {
    return '';
  }
  return '<div class="tree-node-tooltip-notes"><i class="tabler tabler-notes"></i> ' + notes.map(note => gtiz_macros.escapeHtml(note.title)).join(', ') + '</div>';
};

/**
 * Samples of a note missing in the tree loaded
 *
 * @param {Object} note Note
 * @returns {Number} Count
 */
gtiz_notes.missingSamples = function(note) {
  let tree = gtiz_tree.tree;
  if (!tree || !tree.node_map) {
    return 0;
  }
  return note.samples.filter(id => !tree.node_map[id]).length;
};

/**
 * Samples of the nodes selected in the tree
 *
 * @returns {Array} Sample ids
 */
gtiz_notes.selectedSamples = function() {
  let tree = gtiz_tree.tree;
  if (!tree) {
    return [];
  }
  let samples = [];
  tree.getSelectedNodeIDs().forEach(id => {
    let node = tree.node_map[id];
    (node ? gtiz_notes.nodeSamples(node) : [id]).forEach(sample => samples.push(String(sample)));
  });
  return [...new Set(samples)];
};

/**
 * Select the nodes of a note, replacing the selection, and bring them into view
 *
 * @param {Object} note Note
 * @returns {undefined}
 */
gtiz_notes.selectNoteNodes = function(note) {
  let tree = gtiz_tree.tree;
  let present = tree ? note.samples.filter(id => tree.node_map[id]) : [];
  if (!present.length) {
    return;
  }
  tree.replaceSelectionByIds(present);
  tree.zoomToNodes(present);
  // the modal panel covers the tree: close it to show the nodes; a panel dragged
  // aside (no more modal, see gtiz_drag.makePanelDraggable) stays open
  if (!gtiz_notes.panel_node.classList.contains('panel-floating')) {
    gtiz_notes.closeNotes();
  }
};

/**
 * Add a note to the list (at the end) or change it
 *
 * @param {Object} data {title, text, samples, image}
 * @param {Object} note Note to change (optional)
 * @returns {Object} The note
 */
gtiz_notes.saveNote = function(data, note) {
  if (note) {
    note.title = data.title.trim().slice(0, gtiz_notes.limits.title);
    note.text = data.text.slice(0, gtiz_notes.limits.text);
    note.samples = data.samples;
    note.image = data.image || undefined;
    note.updated = new Date().toISOString();
  } else {
    note = gtiz_notes.normalizeNote(data);
    gtiz_notes.notes.push(note);
  }
  gtiz_notes.changed();
  return note;
};

/**
 * Move a note up or down in the list (the order of the report)
 *
 * @param {Object} note Note
 * @param {Number} step -1 up, 1 down
 * @returns {undefined}
 */
gtiz_notes.moveNote = function(note, step) {
  let list = gtiz_notes.notes;
  let index = list.indexOf(note);
  let target = index + step;
  if (index < 0 || target < 0 || target >= list.length) {
    return;
  }
  list.splice(index, 1);
  list.splice(target, 0, note);
  gtiz_notes.changed();
};

/*
*
* Reduced Markdown: paragraphs (blank lines), line breaks, headings (#, ##, ###),
* bulleted (- or *) and numbered (1.) lists, **bold**, *italic* or _italic_ and
* [links](https://...). The same blocks feed the card of the panel and the Word
* report; the Markdown export keeps the text as it is.
*
*/

/**
 * Runs of a line of text: plain, bold, italic and links (http and https only)
 *
 * @param {String} text Line
 * @param {Object} style Inherited style {bold, italic}
 * @returns {Array} Runs {text, bold, italic, href}
 */
gtiz_notes.parseInline = function(text, style) {
  style = style || {};
  let runs = [];
  let patterns = [
    { type : 'link', regex : /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/ },
    { type : 'bold', regex : /\*\*(.+?)\*\*/ },
    { type : 'italic', regex : /\*(.+?)\*|(?:^|(?<=\W))_(.+?)_(?=\W|$)/ }
  ];
  let rest = text;
  while (rest) {
    // the first match in the text wins
    let first = null;
    patterns.forEach(pattern => {
      let match = pattern.regex.exec(rest);
      if (match && (!first || match.index < first.match.index)) {
        first = { type : pattern.type, match : match };
      }
    });
    if (!first) {
      runs.push({ text : rest, bold : style.bold, italic : style.italic, href : style.href });
      break;
    }
    if (first.match.index > 0) {
      runs.push({ text : rest.slice(0, first.match.index), bold : style.bold, italic : style.italic, href : style.href });
    }
    let inner = first.match[1] !== undefined ? first.match[1] : first.match[2];
    if (first.type === 'link') {
      runs.push(...gtiz_notes.parseInline(inner, { bold : style.bold, italic : style.italic, href : first.match[2] }));
    } else if (first.type === 'bold') {
      runs.push(...gtiz_notes.parseInline(inner, { bold : true, italic : style.italic, href : style.href }));
    } else {
      runs.push(...gtiz_notes.parseInline(inner, { bold : style.bold, italic : true, href : style.href }));
    }
    rest = rest.slice(first.match.index + first.match[0].length);
  }
  return runs;
};

/**
 * Blocks of a text: headings, paragraphs (with their line breaks) and lists
 *
 * @param {String} text Text of a note
 * @returns {Array} Blocks {type: 'heading'|'paragraph'|'list', level, ordered, runs, items}
 */
gtiz_notes.parse = function(text) {
  let blocks = [];
  let paragraph = null;
  let list = null;
  let close = () => {
    paragraph = null;
    list = null;
  };
  String(text || '').replace(/\r\n?/g, '\n').split('\n').forEach(line => {
    let trimmed = line.trim();
    if (!trimmed) {
      close();
      return;
    }
    let heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      close();
      blocks.push({ type : 'heading', level : heading[1].length, runs : gtiz_notes.parseInline(heading[2]) });
      return;
    }
    let bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    let number = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || number) {
      let ordered = !!number;
      if (!list || list.ordered !== ordered) {
        paragraph = null;
        list = { type : 'list', ordered : ordered, items : [] };
        blocks.push(list);
      }
      list.items.push(gtiz_notes.parseInline((bullet || number)[1]));
      return;
    }
    list = null;
    if (paragraph) {
      paragraph.runs.push({ br : true }, ...gtiz_notes.parseInline(trimmed));
    } else {
      paragraph = { type : 'paragraph', runs : gtiz_notes.parseInline(trimmed) };
      blocks.push(paragraph);
    }
  });
  return blocks;
};

/**
 * Nodes of a list of runs, built with createElement (texts of the users never
 * become html)
 *
 * @param {Array} runs Runs
 * @returns {DocumentFragment} Nodes
 */
gtiz_notes.renderRuns = function(runs) {
  let fragment = document.createDocumentFragment();
  runs.forEach(run => {
    if (run.br) {
      fragment.append(document.createElement('br'));
      return;
    }
    let node = document.createTextNode(run.text);
    if (run.italic) {
      let em = document.createElement('em');
      em.append(node);
      node = em;
    }
    if (run.bold) {
      let strong = document.createElement('strong');
      strong.append(node);
      node = strong;
    }
    if (run.href) {
      let a = document.createElement('a');
      a.setAttribute('href', run.href);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      a.append(node);
      node = a;
    }
    fragment.append(node);
  });
  return fragment;
};

/**
 * Formatted text of a note
 *
 * @param {String} text Text in reduced Markdown
 * @returns {DocumentFragment} Nodes
 */
gtiz_notes.renderText = function(text) {
  let fragment = document.createDocumentFragment();
  gtiz_notes.parse(text).forEach(block => {
    let node;
    if (block.type === 'heading') {
      // the title of the card is an h3: the headings of the text come below it
      node = document.createElement('h' + (block.level + 3));
      node.append(gtiz_notes.renderRuns(block.runs));
    } else if (block.type === 'list') {
      node = document.createElement(block.ordered ? 'ol' : 'ul');
      block.items.forEach(runs => {
        let li = document.createElement('li');
        li.append(gtiz_notes.renderRuns(runs));
        node.append(li);
      });
    } else {
      node = document.createElement('p');
      node.append(gtiz_notes.renderRuns(block.runs));
    }
    fragment.append(node);
  });
  return fragment;
};

/*
*
* Image of the view: the PNG export of the tree (current zoom and pan) with the
* legend beside it, at a fixed width
*
*/

/**
 * Take the image of the current view
 *
 * @returns {Promise<Object|null>} {src, width, height, caption}, null without a tree
 */
gtiz_notes.captureView = async function() {
  let tree = gtiz_tree.tree;
  if (!tree || !tree.renderer) {
    return null;
  }
  let canvas = await tree.exportImageCanvas(gtiz_notes.image_width);
  let category = tree.display_category && tree.display_category !== 'nothing' ? tree.display_category : '';
  return {
    src : canvas.toDataURL('image/png'),
    width : canvas.width,
    height : canvas.height,
    caption : category ? gtiz_macros.plainText(gtiz_locales.current.note_image_caption).replace('{0}', category) : ''
  };
};

/**
 * Bytes of a png data url
 *
 * @param {String} src Data url
 * @returns {Uint8Array} Bytes
 */
gtiz_notes.imageBytes = function(src) {
  let binary = atob(src.slice(src.indexOf(',') + 1));
  let bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

/*
*
* Modal of a note: title, text, samples and image, as the save modal of the macros
*
*/

/**
 * Count of samples as a text, singular for one
 *
 * @param {Number} count Count
 * @returns {String} Text
 */
gtiz_notes.samplesCount = function(count) {
  if (count === 1) {
    return gtiz_macros.plainText(gtiz_locales.current.note_samples_count_one);
  }
  return gtiz_macros.plainText(gtiz_locales.current.note_samples_count).replace('{0}', count);
};

/**
 * Copy button of a box, as the one of the box of the missing zooms: the icon
 * turns into a check for a moment when the text has been copied
 *
 * @param {String} key Locale key of its title
 * @param {Function} text Function giving the text to copy
 * @returns {Element} Button
 */
gtiz_notes.buildCopyButton = function(key, text) {
  let copy = document.createElement('button');
  copy.setAttribute('class', 'modal-export-copy');
  copy.setAttribute('type', 'button');
  let title = gtiz_macros.plainText(gtiz_locales.current[key]);
  copy.setAttribute('title', title);
  copy.setAttribute('aria-label', title);
  let icon = document.createElement('i');
  icon.setAttribute('class', 'tabler tabler-copy');
  copy.append(icon);
  copy.addEventListener('click', async () => {
    let copied = await gtiz_file_handler.copyToClipboard(text());
    if (copied) {
      icon.setAttribute('class', 'tabler tabler-check');
      copy.classList.add('copied');
      setTimeout(() => {
        icon.setAttribute('class', 'tabler tabler-copy');
        copy.classList.remove('copied');
      }, 1500);
    }
  });
  return copy;
};

/**
 * Text of a note in its card: formatted, in a box as the one of the samples in the
 * modal (solid border here), scrolled when long
 *
 * @param {Object} note Note
 * @returns {Element} Box
 */
gtiz_notes.buildTextBox = function(note) {
  let box = document.createElement('div');
  box.setAttribute('class', 'modal-export-missing note-text-box');
  let text = document.createElement('div');
  text.setAttribute('class', 'modal-export-missing-list notes-result-description');
  text.append(gtiz_notes.renderText(note.text));
  box.append(text);
  return box;
};

/**
 * Copy of a note (title and text as written) as a round tool of the card, on the
 * right of its title; the icon turns into a check for a moment when copied
 *
 * @param {Object} note Note
 * @returns {Element} Tool
 */
gtiz_notes.buildCopyTool = function(note) {
  let copy = gtiz_notes.buildTrigger('notes-result-tool note-copy', 'tabler-copy', async () => {
    let text = note.text.trim() ? note.title + '\n\n' + note.text : note.title;
    let copied = await gtiz_file_handler.copyToClipboard(text);
    if (copied) {
      let icon = copy.querySelector('i');
      icon.setAttribute('class', 'tabler tabler-check');
      setTimeout(() => icon.setAttribute('class', 'tabler tabler-copy'), 1500);
    }
  });
  let copy_text = gtiz_macros.plainText(gtiz_locales.current.note_copy_text);
  copy.setAttribute('title', copy_text);
  copy.setAttribute('aria-label', copy_text);
  return copy;
};

/**
 * Preview of the samples of a note in its modal: the first ones, separated by
 * commas; the css shows three lines, with an ellipsis when they are more (the copy
 * button beside the label gives them all)
 *
 * @param {Array} samples Sample ids
 * @returns {String} Text
 */
gtiz_notes.samplesPreview = function(samples) {
  return samples.slice(0, 40).join(', ');
};

/**
 * Button of the modal with an icon and a text, as the buttons of the modals
 *
 * @param {String} icon Tabler icon
 * @param {String} key Locale key of the text
 * @param {String} cls Class (optional)
 * @param {Function} action Click
 * @returns {Element} Button
 */
gtiz_notes.buildButton = function(icon, key, cls, action) {
  let button = document.createElement('button');
  if (cls) {
    button.setAttribute('class', cls);
  }
  let i = document.createElement('i');
  i.setAttribute('class', 'tabler ' + icon);
  button.append(i, document.createTextNode(' ' + gtiz_macros.plainText(gtiz_locales.current[key])));
  button.addEventListener('click', action);
  return button;
};

/**
 * Scrolly on the textarea of the text: the bar is updated when the text changes,
 * when the textarea grows on focus (after its css transition) or shrinks, and when
 * the user resizes it
 *
 * @param {Element} textarea Textarea of the text
 * @returns {undefined}
 */
gtiz_notes.bindTextareaScroll = function(textarea) {
  let update = () => {
    if (textarea.isConnected && textarea.offsetParent) {
      gtiz_notes.textarea_scrolly.updateNode(textarea);
    }
  };
  textarea.addEventListener('input', update);
  textarea.addEventListener('transitionend', update);
  if (window.ResizeObserver) {
    new ResizeObserver(update).observe(textarea);
  }
  // the modal is shown after a short delay
  setTimeout(update, 350);
};

/**
 * Link action of the modal (icon and text), as the options of the save modal
 * (`a.modal-action`); red for the actions that remove something
 *
 * @param {String} icon Tabler icon
 * @param {String} key Locale key of the text
 * @param {Boolean} danger True for a removal
 * @param {Function} action Click and Enter
 * @returns {Element} Link
 */
gtiz_notes.buildAction = function(icon, key, danger, action) {
  let a = document.createElement('a');
  a.setAttribute('class', 'modal-action' + (danger ? ' modal-action-danger' : ''));
  a.setAttribute('role', 'button');
  a.setAttribute('tabindex', '0');
  let i = document.createElement('i');
  i.setAttribute('class', 'tabler ' + icon);
  a.append(i, document.createTextNode(' ' + gtiz_macros.plainText(gtiz_locales.current[key])));
  a.addEventListener('click', action);
  a.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  });
  return a;
};

/**
 * Open the modal of a new note or of a note to change
 *
 * @param {Object} note Note to change (optional)
 * @param {Array} samples Samples of a new note (optional)
 * @returns {undefined}
 */
gtiz_notes.openNoteModal = function(note, samples) {
  let state = {
    samples : note ? [...note.samples] : (samples || []),
    image : note && note.image ? { ...note.image } : undefined
  };
  let form = document.createElement('div');
  form.setAttribute('class', 'modal-form note-save-form');
  let title = document.createElement('input');
  title.setAttribute('type', 'text');
  title.setAttribute('maxlength', String(gtiz_notes.limits.title));
  title.setAttribute('aria-required', 'true');
  let text = document.createElement('textarea');
  text.setAttribute('maxlength', String(gtiz_notes.limits.text));
  // low while empty and not focused (see css), as the textareas of the macros
  text.setAttribute('placeholder', ' ');
  if (note) {
    title.value = note.title;
    text.value = note.text;
  }
  let title_box = gtiz_macros.buildField('note_title', title, true);
  title.addEventListener('input', () => {
    title_box.classList.remove('input-box-error');
    gtiz_macros.hideModalWarning();
  });
  // how to format the text, as the note on the library in the macros modal
  let hint = document.createElement('p');
  hint.setAttribute('class', 'note-hint');
  hint.innerHTML = '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.note_text_hint;
  form.append(title_box, gtiz_macros.buildField('note_text', text, false), hint);

  // samples: the ones of the note, or none (a note on the whole session)
  let samples_box = document.createElement('div');
  samples_box.setAttribute('class', 'list-box note-samples-box');
  let samples_label = document.createElement('div');
  samples_label.setAttribute('class', 'form-label');
  samples_label.setAttribute('id', 'note-samples-label');
  samples_label.innerHTML = gtiz_locales.current.note_samples;
  let samples_text = document.createElement('p');
  samples_text.setAttribute('class', 'note-box-text');
  let samples_actions = document.createElement('div');
  samples_actions.setAttribute('class', 'button-box note-box-actions');
  samples_box.append(samples_label, samples_text, samples_actions);
  let label_text = gtiz_macros.plainText(gtiz_locales.current.note_samples);
  let render_samples = () => {
    samples_actions.replaceChildren();
    samples_label.replaceChildren(document.createTextNode(label_text));
    if (state.samples.length) {
      // samples of the note: the count in the label with, beside it, a small button
      // that copies them all (separated by commas), a preview of the first ones and
      // the removal (the only action on them)
      let samples = state.samples;
      let copy = gtiz_notes.buildCopyButton('copy_list', () => samples.join(', '));
      copy.classList.add('note-label-copy');
      // the samples missing in the tree are counted in the label: the preview is cut
      let missing = gtiz_notes.missingSamples({ samples : samples });
      let count = samples.length + (missing ? ' · ' + gtiz_macros.plainText(gtiz_locales.current.note_samples_missing).replace('{0}', missing) : '');
      samples_label.replaceChildren(document.createTextNode(label_text + ' (' + count + ')'), copy);
      samples_text.textContent = gtiz_notes.samplesPreview(samples);
      samples_actions.append(gtiz_notes.buildAction('tabler-trash', 'note_remove_samples', true, () => {
        state.samples = [];
        render_samples();
      }));
    } else {
      // no samples: with a selection in the tree the note can take its samples
      let selected = gtiz_notes.selectedSamples();
      if (selected.length) {
        let key = selected.length === 1 ? 'note_samples_selection_one' : 'note_samples_selection';
        samples_text.textContent = gtiz_macros.plainText(gtiz_locales.current[key]).replace('{0}', selected.length);
        samples_actions.append(gtiz_notes.buildAction('tabler-click', 'note_use_selection', false, () => {
          state.samples = selected;
          render_samples();
        }));
      } else {
        samples_text.textContent = gtiz_macros.plainText(gtiz_locales.current.note_samples_none);
      }
    }
    samples_actions.hidden = !samples_actions.children.length;
  };
  render_samples();

  // image of the view
  let image_box = document.createElement('div');
  image_box.setAttribute('class', 'list-box note-image-box');
  let image_label = document.createElement('div');
  image_label.setAttribute('class', 'form-label');
  image_label.innerHTML = gtiz_locales.current.note_image;
  let image_contents = document.createElement('div');
  let image_actions = document.createElement('div');
  image_actions.setAttribute('class', 'button-box note-box-actions');
  image_box.append(image_label, image_contents, image_actions);
  let render_image = () => {
    image_contents.replaceChildren();
    if (state.image) {
      let img = document.createElement('img');
      img.setAttribute('class', 'note-image-preview');
      img.setAttribute('src', state.image.src);
      img.setAttribute('alt', state.image.caption || '');
      image_contents.append(img);
    }
    // without an image the label and the action say enough
    let busy = false;
    let capture = gtiz_notes.buildAction('tabler-camera', 'note_use_view', false, () => {
      if (busy) {
        return;
      }
      busy = true;
      gtiz_notes.captureView().then(image => {
        busy = false;
        if (image) {
          state.image = image;
          render_image();
          gtiz_modal.scrolly.updateNode(document.querySelector('.modal-body-contents'));
        }
      });
    });
    image_actions.replaceChildren(capture);
    if (state.image) {
      image_actions.append(gtiz_notes.buildAction('tabler-trash', 'note_remove_image', true, () => {
        state.image = undefined;
        render_image();
      }));
    }
  };
  render_image();
  form.append(samples_box, image_box);

  let actions = document.createElement('div');
  actions.setAttribute('class', 'modal-confirm-actions');
  let save = gtiz_notes.buildButton('tabler-device-floppy', 'save', '', () => {
    if (!title.value.trim()) {
      // the title may be scrolled out on short screens: bring it into view
      title_box.classList.add('input-box-error');
      gtiz_macros.showModalWarning(gtiz_locales.current.note_title_required);
      title_box.scrollIntoView({ block : 'center' });
      title.focus({ preventScroll : true });
      return;
    }
    gtiz_notes.saveNote({ title : title.value, text : text.value, samples : state.samples, image : state.image }, note);
    gtiz_modal.closeModal();
    // the panel shows the note saved
    gtiz_notes.showNotes();
  });
  let cancel = gtiz_notes.buildButton('tabler-circle-x', 'cancel', 'button-tertiary-outline', () => gtiz_modal.closeModal());
  actions.append(save, cancel);
  form.append(actions);
  gtiz_modal.buildModal(note ? gtiz_locales.current.note_edit : gtiz_locales.current.note_new_title, [form]);
  gtiz_notes.bindTextareaScroll(text);
  setTimeout(() => title.focus(), 300);
};

/**
 * New note on the nodes selected in the tree (menu of the tree, disabled while no
 * node is selected: without a selection nothing happens)
 *
 * @returns {undefined}
 */
gtiz_notes.addNoteFromSelection = function() {
  let samples = gtiz_notes.selectedSamples();
  if (!samples.length) {
    return;
  }
  gtiz_context.closeContextMenu('tree');
  gtiz_notes.openNoteModal(undefined, samples);
};

/**
 * Ask for confirmation, then delete a note
 *
 * @param {Object} note Note
 * @returns {undefined}
 */
gtiz_notes.confirmDeleteNote = function(note) {
  let text = document.createElement('p');
  text.innerHTML = gtiz_locales.current.note_delete_confirm.replace('{0}', gtiz_macros.escapeHtml(note.title));
  let actions = document.createElement('div');
  actions.setAttribute('class', 'modal-confirm-actions');
  let remove = gtiz_notes.buildButton('tabler-trash', 'delete', 'button-danger', () => {
    gtiz_notes.notes = gtiz_notes.notes.filter(other => other !== note);
    gtiz_notes.changed();
    gtiz_modal.closeModal();
  });
  let cancel = gtiz_notes.buildButton('tabler-circle-x', 'cancel', 'button-tertiary-outline', () => gtiz_modal.closeModal());
  actions.append(remove, cancel);
  gtiz_modal.buildModal(gtiz_locales.current.note_delete, [text, actions]);
};

/*
*
* Files of notes: { type: 'spread-notes', version: 1, notes: [...] }, exported
* from the panel (one note or all) and imported from its import and export area
* or by dropping the file on the tree. A complete json of SPREAD chosen in the
* panel gives its notes.
*
*/

/**
 * Name of an exported file
 *
 * @param {String} extension Extension without the dot
 * @returns {String} Name
 */
gtiz_notes.fileName = function(extension) {
  return 'spread_notes' + Date.now() + '.' + extension;
};

/**
 * Download notes as a file to import
 *
 * @param {Array} notes Notes
 * @returns {undefined}
 */
gtiz_notes.exportNotes = function(notes) {
  if (!notes.length) {
    return;
  }
  let text = JSON.stringify({ type : 'spread-notes', version : 1, notes : notes.map(note => gtiz_notes.serializeNote(note)) }, null, 2);
  gtiz_file_handler.saveTextAsFile(text, gtiz_notes.fileName('json'));
};

/**
 * Notes of a file: a notes file, or a complete json of SPREAD with its notes
 *
 * @param {String} text Contents of the file
 * @returns {Array|null} Notes, or null when the file is not a notes file
 */
gtiz_notes.readNotesFile = function(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return null;
  }
  if (data && data.type === 'spread-notes' && Array.isArray(data.notes)) {
    return data.notes;
  }
  if (data && data.gtiz_notes && Array.isArray(data.gtiz_notes.notes)) {
    return data.gtiz_notes.notes;
  }
  return null;
};

/**
 * Add notes read from a file at the end of the list; a note already there (same
 * id) is skipped
 *
 * @param {Array} list Notes read
 * @returns {Object} {imported, present, invalid}
 */
gtiz_notes.addNotes = function(list) {
  let outcome = { imported : 0, present : 0, invalid : 0 };
  (Array.isArray(list) ? list : []).forEach(data => {
    let note = gtiz_notes.normalizeNote(data);
    if (!note) {
      outcome.invalid++;
      return;
    }
    if (gtiz_notes.notes.some(other => other.id === note.id)) {
      outcome.present++;
      return;
    }
    gtiz_notes.notes.push(note);
    outcome.imported++;
  });
  if (outcome.imported > 0) {
    gtiz_notes.changed();
  }
  return outcome;
};

/**
 * Import a file of notes and say how it went below the import and export area,
 * which opens for it
 *
 * @param {File} file File chosen or dropped
 * @returns {undefined}
 */
gtiz_notes.importFile = function(file) {
  if (!file) {
    return;
  }
  file.text().then(text => {
    let list = gtiz_notes.readNotesFile(text);
    let lines = [];
    if (!list) {
      lines.push({ html : gtiz_locales.current.notes_import_error, warning : true });
    } else {
      let outcome = gtiz_notes.addNotes(list);
      gtiz_notes.refreshPanel();
      lines.push({ html : gtiz_locales.current.macro_import_summary.replace('{0}', outcome.imported).replace('{1}', outcome.present).replace('{2}', outcome.invalid), warning : false });
    }
    gtiz_notes.toggleTransferArea(true);
    gtiz_notes.showTransferFeedback(lines);
  });
};

/**
 * Choose a notes file to import
 *
 * @returns {undefined}
 */
gtiz_notes.chooseFile = function() {
  let input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', '.json,application/json');
  input.addEventListener('change', () => gtiz_notes.importFile(input.files[0]));
  input.click();
};

/**
 * Text of the samples of a note for the exports
 *
 * @param {Object} note Note
 * @returns {String} Text, empty for a general note
 */
gtiz_notes.samplesLine = function(note) {
  if (!note.samples.length) {
    return '';
  }
  return gtiz_macros.plainText(gtiz_locales.current.note_samples) + ': ' + note.samples.join(', ');
};

/**
 * Date of a note in the language in use
 *
 * @param {Object} note Note
 * @returns {String} Date
 */
gtiz_notes.noteDate = function(note) {
  let date = new Date(note.updated || note.created);
  return isNaN(date) ? '' : date.toLocaleDateString(gtiz_locales.getActiveLanguageCode());
};

/**
 * Export the notes as Markdown: a .md file, or a .zip with the images in
 * `images/` when some notes have one
 *
 * @returns {Promise<undefined>}
 */
gtiz_notes.exportMarkdown = async function() {
  let notes = gtiz_notes.notes;
  if (!notes.length) {
    return;
  }
  let lines = ['# ' + gtiz_macros.plainText(gtiz_locales.current.notes_report_title), '', new Date().toLocaleDateString(gtiz_locales.getActiveLanguageCode()), ''];
  let images = [];
  notes.forEach((note, index) => {
    lines.push('## ' + note.title, '');
    let samples = gtiz_notes.samplesLine(note);
    if (samples) {
      lines.push('_' + samples + '_', '');
    }
    if (note.text.trim()) {
      lines.push(note.text.trim(), '');
    }
    if (note.image) {
      let name = 'images/note-' + (index + 1) + '.png';
      images.push({ name : name, data : gtiz_notes.imageBytes(note.image.src) });
      lines.push('![' + (note.image.caption || note.title) + '](' + name + ')', '');
    }
  });
  let text = lines.join('\n');
  if (!images.length) {
    gtiz_file_handler.saveTextAsFile(text, gtiz_notes.fileName('md'));
    return;
  }
  let zip = await gtiz_zip.write([{ name : 'notes.md', text : text }, ...images]);
  gtiz_file_handler.saveBlobAsFile(zip, gtiz_notes.fileName('zip'));
};

/**
 * Blocks of the Word report: title, date, the current view with the legend, the
 * notes in their order (title, samples, text, image) and the table of the samples
 * with their notes
 *
 * @returns {Promise<Array>} Blocks for `gtiz_docx.build`
 */
gtiz_notes.reportBlocks = async function() {
  let t = (key) => gtiz_macros.plainText(gtiz_locales.current[key]);
  let lang = gtiz_locales.getActiveLanguageCode();
  let blocks = [
    { type : 'paragraph', style : 'Title', runs : [{ text : t('notes_report_title') }] },
    { type : 'paragraph', runs : [{ text : new Date().toLocaleDateString(lang) }] }
  ];
  // the view of the tree when the report is made
  let view = await gtiz_notes.captureView();
  if (view) {
    blocks.push({ type : 'heading', level : 1, runs : [{ text : t('notes_report_view') }] });
    blocks.push({ type : 'image', data : gtiz_notes.imageBytes(view.src), width : view.width, height : view.height });
    if (view.caption) {
      blocks.push({ type : 'paragraph', style : 'Caption', runs : [{ text : view.caption }] });
    }
  }
  blocks.push({ type : 'heading', level : 1, runs : [{ text : t('notes') }] });
  gtiz_notes.notes.forEach(note => {
    blocks.push({ type : 'heading', level : 2, runs : [{ text : note.title }] });
    let samples = gtiz_notes.samplesLine(note);
    if (samples) {
      blocks.push({ type : 'paragraph', runs : [{ text : samples, italic : true }] });
    }
    gtiz_notes.parse(note.text).forEach(block => {
      // the headings of a text come below the title of the note
      if (block.type === 'heading') {
        block.level = 3;
      }
      blocks.push(block);
    });
    if (note.image) {
      blocks.push({ type : 'image', data : gtiz_notes.imageBytes(note.image.src), width : note.image.width, height : note.image.height });
      if (note.image.caption) {
        blocks.push({ type : 'paragraph', style : 'Caption', runs : [{ text : note.image.caption }] });
      }
    }
  });
  // samples with their notes, in the order of the notes
  let rows = new Map();
  gtiz_notes.notes.forEach(note => note.samples.forEach(id => {
    if (!rows.has(id)) {
      rows.set(id, []);
    }
    rows.get(id).push(note.title);
  }));
  if (rows.size) {
    blocks.push({ type : 'heading', level : 1, runs : [{ text : t('notes_report_samples') }] });
    blocks.push({ type : 'table', header : [t('notes_report_sample'), t('notes')], rows : [...rows.entries()].map(([id, titles]) => [id, titles.join('; ')]) });
  }
  return blocks;
};

/**
 * Export the Word report of the notes
 *
 * @returns {Promise<undefined>}
 */
gtiz_notes.exportDocx = async function() {
  if (!gtiz_notes.notes.length) {
    return;
  }
  let blocks = await gtiz_notes.reportBlocks();
  let blob = await gtiz_docx.build(blocks, { title : gtiz_macros.plainText(gtiz_locales.current.notes_report_title) });
  gtiz_file_handler.saveBlobAsFile(blob, gtiz_notes.fileName('docx'));
};

/**
 * Run an export from the panel: errors are said below the import and export area
 *
 * @param {Function} action Export
 * @returns {undefined}
 */
gtiz_notes.runExport = function(action) {
  Promise.resolve().then(action).catch(error => {
    console.error(error);
    gtiz_notes.toggleTransferArea(true);
    gtiz_notes.showTransferFeedback([{ html : gtiz_locales.current.notes_export_error, warning : true }]);
  });
};

/*
*
* Panel, as the macros panel: search row with the import and export trigger and
* New, the import and export area, the cards of the notes
*
*/

/**
 * Outcome of an import or of an export below the import and export area
 *
 * @param {Array} lines Lines {html, warning}; empty to clear
 * @returns {undefined}
 */
gtiz_notes.showTransferFeedback = function(lines) {
  let feedback = gtiz_notes.panel_node.querySelector('.notes-transfer-feedback');
  if (!feedback) {
    return;
  }
  feedback.replaceChildren();
  lines.forEach(line => {
    let p = document.createElement('p');
    if (line.warning) {
      p.setAttribute('class', 'notes-transfer-warning');
    }
    p.innerHTML = '<i class="tabler ' + (line.warning ? 'tabler-alert-triangle' : 'tabler-info-circle') + '"></i> ' + line.html;
    feedback.append(p);
  });
  feedback.hidden = lines.length === 0;
  gtiz_notes.updateScroll();
};

/**
 * Card of the import and export area (icon and text), as the export card of the macros
 *
 * @param {String} tag Tag name
 * @param {String} cls Class
 * @param {String} icon Tabler icon
 * @param {Function} action Click and Enter
 * @returns {Element} Card
 */
gtiz_notes.buildTransferCard = function(tag, cls, icon, action) {
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

/**
 * Import and export area below the search row: the dashed drop area and the notes
 * file, then Markdown and the Word report; the exports only with notes
 *
 * @returns {Element} Area
 */
gtiz_notes.buildTransferArea = function() {
  let area = document.createElement('div');
  area.setAttribute('class', 'notes-transfer');
  area.hidden = true;
  let first = document.createElement('div');
  first.setAttribute('class', 'notes-transfer-cards');
  first.append(
    // the drop area is a label, to take the styles of the file inputs of the project
    gtiz_notes.buildTransferCard('label', 'input-file input-file-drag notes-transfer-drop', 'tabler-upload', () => gtiz_notes.chooseFile()),
    gtiz_notes.buildTransferCard('div', 'notes-transfer-export notes-export-json', 'tabler-download', () => gtiz_notes.exportNotes(gtiz_notes.notes))
  );
  let second = document.createElement('div');
  second.setAttribute('class', 'notes-transfer-cards notes-transfer-formats');
  second.append(
    gtiz_notes.buildTransferCard('div', 'notes-transfer-export notes-export-md', 'tabler-markdown', () => gtiz_notes.runExport(gtiz_notes.exportMarkdown)),
    gtiz_notes.buildTransferCard('div', 'notes-transfer-export notes-export-docx', 'tabler-file-word', () => gtiz_notes.runExport(gtiz_notes.exportDocx))
  );
  let feedback = document.createElement('div');
  feedback.setAttribute('class', 'notes-transfer-feedback');
  feedback.hidden = true;
  area.append(first, second, feedback);
  return area;
};

/**
 * Show or hide the import and export area
 *
 * @param {Boolean} show True to show, false to hide, undefined to toggle
 * @returns {undefined}
 */
gtiz_notes.toggleTransferArea = function(show) {
  let area = gtiz_notes.panel_node.querySelector('.notes-transfer');
  if (!area) {
    return;
  }
  area.hidden = show === undefined ? !area.hidden : !show;
  if (area.hidden) {
    gtiz_notes.showTransferFeedback([]);
  }
  gtiz_notes.updateTexts();
  gtiz_notes.updateScroll();
};

/**
 * A file can be dropped only on the drop area: it lights up while the file is over
 * it; anywhere else in the panel a dropped file is ignored
 *
 * @returns {undefined}
 */
gtiz_notes.bindDrop = function() {
  let has_files = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  let on_area = (e) => e.target && e.target.closest && e.target.closest('.notes-transfer-drop');
  let panel = gtiz_notes.panel_node;
  panel.addEventListener('dragover', (e) => {
    if (!has_files(e)) {
      return;
    }
    e.preventDefault();
    let area = on_area(e);
    e.dataTransfer.dropEffect = area ? 'copy' : 'none';
    panel.querySelectorAll('.notes-transfer-drop').forEach(node => node.classList.toggle('notes-transfer-dropping', node === area));
  });
  panel.addEventListener('dragleave', (e) => {
    let area = on_area(e);
    if (area && !area.contains(e.relatedTarget)) {
      area.classList.remove('notes-transfer-dropping');
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
    area.classList.remove('notes-transfer-dropping');
    gtiz_notes.importFile(e.dataTransfer.files[0]);
  });
};

/**
 * Round trigger of the search row or of a card, as the card tools
 *
 * @param {String} cls Class
 * @param {String} icon Tabler icon
 * @param {Function} action Click and Enter
 * @returns {Element} Trigger
 */
gtiz_notes.buildTrigger = function(cls, icon, action) {
  let trigger = document.createElement('div');
  trigger.setAttribute('class', 'card-context-trigger ' + cls);
  trigger.setAttribute('role', 'button');
  trigger.setAttribute('tabindex', '0');
  let i = document.createElement('i');
  i.setAttribute('class', 'tabler ' + icon);
  trigger.append(i);
  trigger.addEventListener('click', action);
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  });
  return trigger;
};

/**
 * Search row: the field, the import and export trigger and New with its text on
 * the right, as Rec in the macros panel
 *
 * @returns {undefined}
 */
gtiz_notes.buildSearchRow = function() {
  let header = gtiz_notes.panel_node.querySelector('.notes-header');
  let search = header ? header.querySelector('.search-box') : null;
  if (!search || header.querySelector('.notes-search-row')) {
    return;
  }
  let row = document.createElement('div');
  row.setAttribute('class', 'notes-search-row');
  search.replaceWith(row);
  let tools = document.createElement('div');
  tools.setAttribute('class', 'notes-search-tools');
  let transfer = gtiz_notes.buildTrigger('notes-transfer-trigger', 'tabler-file-import', () => gtiz_notes.toggleTransferArea());
  // a new note starts without samples: the modal offers the ones selected in the tree
  let add = gtiz_notes.buildTrigger('notes-new-trigger', 'tabler-plus', () => gtiz_notes.openNoteModal());
  let label = document.createElement('span');
  label.setAttribute('data-i18n-key', 'note_new');
  label.innerHTML = gtiz_locales.current.note_new;
  add.append(label);
  tools.append(transfer, add);
  row.append(search, tools);
  row.after(gtiz_notes.buildTransferArea());
  gtiz_notes.updateTexts();
};

/**
 * Texts of the triggers and of the import and export area in the language in use;
 * the exports are shown only with notes
 *
 * @returns {undefined}
 */
gtiz_notes.updateTexts = function() {
  let panel = gtiz_notes.panel_node;
  let set = (selector, key, label_key) => {
    let node = panel.querySelector(selector);
    if (!node) {
      return null;
    }
    let text = gtiz_macros.plainText(gtiz_locales.current[key]);
    node.setAttribute('title', text);
    node.setAttribute('aria-label', text);
    let span = node.querySelector('span');
    if (span && label_key) {
      span.innerHTML = gtiz_locales.current[label_key];
    }
    return node;
  };
  set('.notes-transfer-trigger', 'notes_tools');
  set('.notes-new-trigger', 'note_new_title');
  set('.notes-transfer-drop', 'macro_drop_here', 'macro_drop_here');
  let empty = gtiz_notes.notes.length === 0;
  [['.notes-export-json', 'notes_export_json', 'notes_export_json_short'],
   ['.notes-export-md', 'notes_export_md', 'notes_export_md_short'],
   ['.notes-export-docx', 'notes_export_docx', 'notes_export_docx_short']].forEach(([selector, key, label_key]) => {
    let node = set(selector, key, label_key);
    if (node) {
      node.hidden = empty;
    }
  });
  let formats = panel.querySelector('.notes-transfer-formats');
  if (formats) {
    formats.hidden = empty;
  }
};

/**
 * Round tools of a note at the top right of its card
 *
 * @param {Object} note Note
 * @param {Number} index Position in the list
 * @returns {Element} Tools
 */
gtiz_notes.buildNoteTools = function(note, index) {
  let tools = document.createElement('div');
  tools.setAttribute('class', 'notes-result-tools');
  let tool = (icon, key, action) => {
    let button = gtiz_notes.buildTrigger('notes-result-tool', icon, action);
    let text = gtiz_macros.plainText(gtiz_locales.current[key]);
    button.setAttribute('title', text);
    button.setAttribute('aria-label', text);
    return button;
  };
  if (note.samples.length && gtiz_notes.missingSamples(note) < note.samples.length) {
    tools.append(tool('tabler-focus-2', 'note_select_nodes', () => gtiz_notes.selectNoteNodes(note)));
  }
  if (index > 0) {
    tools.append(tool('tabler-arrow-up', 'note_move_up', () => gtiz_notes.moveNote(note, -1)));
  }
  if (index < gtiz_notes.notes.length - 1) {
    tools.append(tool('tabler-arrow-down', 'note_move_down', () => gtiz_notes.moveNote(note, 1)));
  }
  tools.append(
    tool('tabler-file-download', 'note_export', () => gtiz_notes.exportNotes([note])),
    tool('tabler-pencil', 'note_edit', () => gtiz_notes.openNoteModal(note)),
    tool('tabler-trash', 'note_delete', () => gtiz_notes.confirmDeleteNote(note))
  );
  return tools;
};

/**
 * Card of a note: labels of its samples, title, text, image and date
 *
 * @param {Object} note Note
 * @param {Number} index Position in the list
 * @param {String} keyword Keyword to highlight in the title (optional)
 * @returns {Element} Card
 */
gtiz_notes.buildNoteCard = function(note, index, keyword) {
  let card = document.createElement('div');
  card.setAttribute('class', 'notes-result notes-result-user');
  let tags = document.createElement('div');
  tags.setAttribute('class', 'notes-tags');
  let tag = (text, warning) => {
    let node = document.createElement('div');
    node.setAttribute('class', 'notes-tag' + (warning ? ' notes-tag-warning' : ''));
    node.textContent = text;
    tags.append(node);
  };
  if (note.samples.length) {
    tag(gtiz_notes.samplesCount(note.samples.length));
    let missing = gtiz_notes.missingSamples(note);
    if (missing) {
      tag(gtiz_macros.plainText(gtiz_locales.current.note_samples_missing).replace('{0}', missing), true);
    }
  } else {
    tag(gtiz_macros.plainText(gtiz_locales.current.note_general));
  }
  let title = document.createElement('h3');
  title.setAttribute('class', 'notes-result-title');
  title.innerHTML = gtiz_macros.escapeHtml(note.title);
  if (keyword) {
    title.innerHTML = gtiz_utils.highlightKeyword(title.innerHTML, keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }
  // title with the copy of the note on its right
  let heading = document.createElement('div');
  heading.setAttribute('class', 'notes-result-heading');
  heading.append(title, gtiz_notes.buildCopyTool(note));
  card.append(tags, heading);
  if (note.text.trim()) {
    card.append(gtiz_notes.buildTextBox(note));
  }
  if (note.image) {
    let img = document.createElement('img');
    img.setAttribute('class', 'notes-result-image');
    img.setAttribute('src', note.image.src);
    img.setAttribute('alt', note.image.caption || note.title);
    card.append(img);
  }
  let date = document.createElement('p');
  date.setAttribute('class', 'notes-result-date');
  date.textContent = gtiz_notes.noteDate(note);
  card.append(date, gtiz_notes.buildNoteTools(note, index));
  return card;
};

/**
 * Message of the panel in place of the cards, as the messages of the macros panel
 *
 * @param {String} html Message
 * @returns {Element} Message
 */
gtiz_notes.buildMessage = function(html) {
  let result = document.createElement('div');
  result.setAttribute('class', 'notes-result-message');
  let box = document.createElement('div');
  box.setAttribute('class', 'notes-message-box');
  let message = document.createElement('div');
  message.setAttribute('class', 'notes-message');
  message.innerHTML = '<i class="tabler tabler-info-circle"></i> ' + html;
  box.append(message);
  result.append(box);
  return result;
};

/**
 * Notes matching a keyword (from 3 characters) in the title, in the text or in the
 * id of a sample
 *
 * @param {String} keyword Keyword, lower case
 * @returns {Array} Notes
 */
gtiz_notes.search = function(keyword) {
  if (!keyword || keyword.length < 3) {
    return gtiz_notes.notes;
  }
  return gtiz_notes.notes.filter(note => note.title.toLowerCase().includes(keyword) ||
    note.text.toLowerCase().includes(keyword) ||
    note.samples.some(id => id.toLowerCase().includes(keyword)));
};

/**
 * Notes of the filter of the panel: all, the ones of a node or the general ones
 *
 * @returns {Array} Notes
 */
gtiz_notes.filteredNotes = function() {
  let filter = gtiz_notes.filter;
  if (!filter) {
    return gtiz_notes.notes;
  }
  return filter.type === 'node' ? gtiz_notes.nodeNotes(filter.node) : gtiz_notes.generalNotes();
};

/**
 * Box on top of the list telling the filter, as the one of the legend filtered
 * by the selection: the title and, on the right, the round button that shows
 * all the notes again
 *
 * @returns {Element} Box
 */
gtiz_notes.buildFilterBox = function() {
  let filter = gtiz_notes.filter;
  let box = document.createElement('div');
  box.setAttribute('class', 'notes-filter');
  let title = document.createElement('span');
  title.setAttribute('class', 'notes-filter-title');
  title.textContent = filter.type === 'node' ? gtiz_macros.plainText(gtiz_locales.current.notes_filter_node).replace('{0}', filter.node.id) : gtiz_macros.plainText(gtiz_locales.current.notes_filter_general);
  let close = document.createElement('a');
  close.setAttribute('class', 'notes-filter-close');
  let close_text = gtiz_macros.plainText(gtiz_locales.current.notes_filter_off);
  close.setAttribute('title', close_text);
  close.setAttribute('aria-label', close_text);
  let icon = document.createElement('i');
  icon.setAttribute('class', 'tabler tabler-filter-off');
  close.append(icon);
  close.addEventListener('click', () => {
    gtiz_notes.filter = null;
    gtiz_notes.refreshPanel();
  });
  box.append(title, close);
  return box;
};

/**
 * Open the panel on some notes: the ones of a node of the tree or the general
 * ones (a filter that the box on top of the list removes)
 *
 * @param {Object} filter { type : 'node', node } or { type : 'general' }
 * @returns {undefined}
 */
gtiz_notes.showFiltered = function(filter) {
  gtiz_notes.filter = filter;
  if (document.body.classList.contains('show-notes')) {
    gtiz_notes.refreshPanel();
  } else {
    gtiz_notes.showNotes();
  }
};

/**
 * Build the list of the panel
 *
 * @returns {undefined}
 */
gtiz_notes.buildUi = function() {
  gtiz_notes.updateTexts();
  let container = gtiz_notes.panel_node.querySelector('.notes-body');
  let results = container.querySelector('.notes-results');
  if (results) {
    results.replaceChildren();
  } else {
    results = document.createElement('div');
    results.setAttribute('class', 'notes-results');
    container.append(results);
  }
  if (!gtiz_tree.tree) {
    results.append(gtiz_notes.buildMessage(gtiz_locales.current.missing_tree_alert_notes));
  } else if (!gtiz_notes.notes.length) {
    // a hint on what to do, in the style of the feedback of the panel
    let empty = document.createElement('div');
    empty.setAttribute('class', 'notes-empty');
    let p = document.createElement('p');
    p.innerHTML = '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.notes_empty;
    empty.append(p);
    results.append(empty);
  } else {
    // the filter of a node or of the general notes, then the search within it
    let listed = gtiz_notes.filteredNotes();
    if (gtiz_notes.filter && !listed.length) {
      gtiz_notes.filter = null;
      listed = gtiz_notes.notes;
    }
    if (gtiz_notes.filter) {
      results.append(gtiz_notes.buildFilterBox());
    }
    let keyword = gtiz_notes.input.value.trim().toLowerCase();
    let found = gtiz_notes.search(keyword).filter(note => listed.includes(note));
    found.forEach(note => {
      results.append(gtiz_notes.buildNoteCard(note, gtiz_notes.notes.indexOf(note), keyword.length >= 3 ? keyword : ''));
    });
  }
  let scrolly_node = gtiz_notes.panel_node.querySelector('.notes-form');
  gtiz_notes.scrolly.initNode(scrolly_node);
  gtiz_notes.updateTextScroll();
};

/**
 * Create or update the scrollbars of the texts of the cards
 *
 * @returns {undefined}
 */
gtiz_notes.updateTextScroll = function() {
  gtiz_notes.panel_node.querySelectorAll('.note-text-box .notes-result-description').forEach(node => {
    if (node.offsetParent) {
      gtiz_notes.text_scrolly.updateNode(node);
    }
  });
};

/**
 * Update the scrollbar of the panel
 *
 * @returns {undefined}
 */
gtiz_notes.updateScroll = function() {
  let node = gtiz_notes.panel_node.querySelector('.notes-form');
  if (node && document.body.classList.contains('show-notes')) {
    gtiz_notes.scrolly.updateNode(node);
  }
};

/**
 * Rebuild the list of the panel when it is open, keeping the search
 *
 * @returns {undefined}
 */
gtiz_notes.refreshPanel = function() {
  if (!document.body.classList.contains('show-notes')) {
    return;
  }
  gtiz_notes.buildUi();
  gtiz_notes.updateScroll();
};

/**
 * Open the panel
 *
 * @returns {undefined}
 */
gtiz_notes.showNotes = function() {
  let body = document.body;
  if (body.classList.contains('show-notes')) {
    gtiz_notes.refreshPanel();
    return;
  }
  body.classList.add('show-notes');
  gtiz_notes.buildUi();
  if (gtiz_tree.tree) {
    setTimeout(() => gtiz_notes.input.focus(), 600);
  }
};

/**
 * Close the panel, clearing the search
 *
 * @returns {undefined}
 */
gtiz_notes.closeNotes = function() {
  let body = document.body;
  if (!body.classList.contains('show-notes')) {
    return;
  }
  gtiz_notes.input.value = '';
  gtiz_notes.filter = null;
  let results = gtiz_notes.panel_node.querySelector('.notes-results');
  if (results) {
    results.remove();
  }
  let scrolly = gtiz_notes.panel_node.querySelector('.notes-form.scrolly');
  if (scrolly) {
    gtiz_notes.scrolly.destroy(scrolly);
  }
  body.classList.remove('show-notes');
};

/**
 * Open or close the panel
 *
 * @returns {undefined}
 */
gtiz_notes.toggleNotes = function() {
  if (document.body.classList.contains('show-notes')) {
    gtiz_notes.closeNotes();
  } else {
    gtiz_notes.showNotes();
  }
};

gtiz_notes.input.addEventListener('input', () => gtiz_notes.refreshPanel());

// the trigger of the tree card opens the panel on the notes on the session
if (gtiz_notes.general_trigger) {
  gtiz_notes.general_trigger.addEventListener('click', () => gtiz_notes.showFiltered({ type : 'general' }));
  gtiz_notes.general_trigger.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      gtiz_notes.showFiltered({ type : 'general' });
    }
  });
}
gtiz_notes.close_node.addEventListener('click', () => gtiz_notes.closeNotes());
gtiz_notes.trigger.addEventListener('click', () => gtiz_notes.toggleNotes());

window.addEventListener('resize', () => {
  setTimeout(() => gtiz_notes.updateScroll(), 300);
});

// capture phase: the state is read before the modal closes itself on the same Esc,
// so a modal opened from the panel closes first and the panel stays open
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('show-notes') && !document.body.classList.contains('show-modal')) {
    gtiz_notes.closeNotes();
  }
}, true);

// notes not saved with the session: leaving the page asks first
window.addEventListener('beforeunload', (e) => {
  if (gtiz_notes.dirty && gtiz_notes.notes.length) {
    e.preventDefault();
    e.returnValue = '';
  }
});

gtiz_notes.buildSearchRow();
gtiz_notes.bindDrop();
