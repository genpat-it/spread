let gtiz_modal = {};

gtiz_modal.body = document.querySelector('body');
gtiz_modal.close_modal_trigger = document.querySelector('.modal-close');

gtiz_modal.css_vars = gtiz_utils.getAllCssVariables();
gtiz_modal.scrolly_options = {
  position: 'absolute',
  opacity: 0.8,
  containerColor: 'var(--secondary-light)',
  barColor: 'var(--secondary-dark)',
  radius: 1,
  scaleY : 0.8,
  side : 'right',
  offset : -1,
  width : 0.3,
  unit : 'rem',
  // new Scrolly: content measured with scrollHeight, bar draggable
  contentHeightMode : 'scroll',
  draggable : true,
};
gtiz_modal.scrolly = new Scrolly(gtiz_modal.scrolly_options);

/*
*
* Scrolly of the general notifications: same look of the modal one, bar on the
* right, in the space between the cards and the window edge
*
*/
gtiz_modal.notifier_scrolly = new Scrolly({ ...gtiz_modal.scrolly_options, side : 'right', offset : 1 });

/*
*
* The general notifier is a direct child of the body; the component notifiers
* (`.component-notifier`) live inside their component and must never be mixed with it
*
*/
gtiz_modal.notifier_selector = 'body > .notifier:not(.component-notifier)';

/**
 * Build the general notifier: the cards live in `.notifier-list > .notifier-cards`,
 * the box that scrolls when they are taller than the window, the "close all"
 * button stays outside, always visible below them
 *
 * @returns {DOM Node} The general notifier, appended to the body
 */
gtiz_modal.createNotifier = function() {
  let notifier = document.createElement('div');
  notifier.setAttribute('class', 'notifier');
  let list = document.createElement('div');
  list.setAttribute('class', 'notifier-list');
  let cards = document.createElement('div');
  cards.setAttribute('class', 'notifier-cards');
  list.append(cards);
  notifier.append(list);
  gtiz_modal.body.append(notifier);
  return notifier;
}

/**
 * Fit the general notifications to the window: Scrolly is switched on when the
 * cards are taller than the space left, off otherwise
 *
 * The notifications are anchored to the bottom: the distance from the bottom is
 * kept, instead of the distance from the top kept by `updateNode`. Scrolly moves
 * the bar on the scroll event of the new position.
 *
 * @param {DOM Node} notifier The general notifier
 * @param {Boolean} to_bottom True to show the last card (a new notification), false to keep the current position
 * @returns {undefined}
 */
gtiz_modal.updateNotifierScroll = function(notifier, to_bottom) {
  let cards = notifier.querySelector('.notifier-cards');
  if (!cards) {
    return;
  }
  // distance from the bottom, kept when the cards are closed or the window resized
  let from_bottom = cards.scrollHeight - cards.clientHeight - cards.scrollTop;
  gtiz_modal.notifier_scrolly.updateNode(cards);
  let max_scroll = cards.scrollHeight - cards.clientHeight;
  cards.scrollTop = to_bottom ? max_scroll : Math.max(max_scroll - from_bottom, 0);
}

/**
 * Get the general notifier
 *
 * @returns {DOM Node|null} The general notifier, null when no general notification is open
 */
gtiz_modal.getNotifier = function() {
  return document.querySelector(gtiz_modal.notifier_selector);
}

/**
 * Get the signature of a notification, used to recognize duplicates
 *
 * The signature is the visible text of the card, block by block (title, body and
 * feedback) so that texts of different blocks never merge: icons have no text,
 * so they are ignored.
 *
 * @param {DOM Node} n_contents The `.notifier-contents` card
 * @returns {String} The text of each block with collapsed white spaces, joined by ` | `
 */
gtiz_modal.getNotifierSignature = function(n_contents) {
  return Array.from(n_contents.children)
    .map(block => block.textContent.replace(/\s+/g, ' ').trim())
    .filter(text => text.length > 0)
    .join(' | ');
}

/**
 * Show the "close all" button at the bottom of the general notifier when it holds
 * at least two notifications, remove it otherwise
 *
 * @param {DOM Node} notifier The general notifier
 * @returns {undefined}
 */
gtiz_modal.updateCloseAllNotifiers = function(notifier) {
  let box = notifier.querySelector('.notifier-close-all');
  let cards = notifier.querySelectorAll('.notifier-contents');
  if (cards.length < 2) {
    if (box) {
      box.remove();
    }
    return;
  }
  if (!box) {
    box = document.createElement('div');
    box.setAttribute('class', 'notifier-close-all');
    let button = document.createElement('button');
    button.setAttribute('class', 'secondary');
    button.setAttribute('type', 'button');
    let icon = document.createElement('i');
    icon.setAttribute('class', 'tabler tabler-circle-x');
    button.append(icon, ' ' + gtiz_locales.current.close_all_notifications);
    button.addEventListener('click', () => {
      gtiz_modal.closeAllNotifiers();
    });
    box.append(button);
  }
  // the button always follows the last notification
  notifier.append(box);
}

/**
 * Close every general notification
 *
 * @returns {undefined}
 */
gtiz_modal.closeAllNotifiers = function() {
  let notifier = gtiz_modal.getNotifier();
  if (notifier) {
    notifier.remove();
  }
  gtiz_modal.body.classList.remove('show-notifier');
}

/**
 * Close the last opened general notification, used by the Escape key
 *
 * @returns {undefined}
 */
gtiz_modal.closeLastNotifier = function() {
  let notifier = gtiz_modal.getNotifier();
  if (!notifier) {
    return;
  }
  let cards = notifier.querySelectorAll('.notifier-contents');
  if (cards.length > 0) {
    gtiz_modal.closeNotifier(notifier, cards[cards.length - 1]);
  }
}

/**
 * Close all notifiers and clean contents
 * 
 */
gtiz_modal.closeAllComponentsNotifiers = function() {
  let notifiers = document.querySelectorAll('.component-notifier');
  notifiers.forEach(notifier => {
    notifier.remove();
  });
  let components = document.querySelectorAll('.show-component-notifier');
  components.forEach(component => {
    component.classList.remove('show-component-notifier');
  });
}

/**
 * Close notifier and clean contents
 * 
 * @param {DOM node} component `.tree-container`, `map-container` ... (tested only for tree)
 * @param {DOM node} notifier
 * @param {DOM node} contents
 * 
 */
gtiz_modal.closeComponentNotifier = function(component, notifier, contents) {
  if (contents) {
    contents.remove();
  }
  let n_contents = component.querySelectorAll('.notifier-contents');
  if (!n_contents || n_contents.length == 0) {
    if (!notifier) {
      notifier = component.querySelector('.component-notifier');
    }
    if (notifier) {
      notifier.remove();
    }
    component.classList.remove('show-component-notifier');
  }
}

/**
 * Close a general notification and clean contents
 *
 * @param {DOM node} notifier The general notifier
 * @param {DOM node} contents The `.notifier-contents` card to close
 * @returns {undefined}
 */
gtiz_modal.closeNotifier = function(notifier, contents) {
  contents.remove();
  // only the cards of the general notifier count, the component ones stay open on their own
  let n_contents = notifier.querySelectorAll('.notifier-contents');
  if (!n_contents || n_contents.length == 0) {
    notifier.remove();
    gtiz_locales.body.classList.remove("show-notifier");
  } else {
    gtiz_modal.updateCloseAllNotifiers(notifier);
    gtiz_modal.updateNotifierScroll(notifier, false);
  }
}

/**
 * Build notifier
 * 
 * @param {String} component `tree`, `map` ... (tested only for tree)
 * @param {String} id Notifier contents id
 * @param {String} title Notifier title
 * @param {Array} contents Array of html contents
 * @param {Array} actions Array of html contents like button or toggles
 * @param {DOM Node} feedback System feedback for users
 * @param {String} f_type Feedback type to assign as class `info` | to be defined
 * @returns {undefined}
 *
 * A card with the same `id` already open in the component is replaced, so the
 * card always shows the current state (e.g. the zooms of the current selection).
 */
gtiz_modal.buildComponentNotifier = function(component, id, title, contents, actions, feedback, f_type) {
  let selector ='.' + component + '-container';
  let context = document.querySelector(selector);
  // only the notifier of this component, never the general one
  let notifier = context.querySelector('.component-notifier');
  if (!notifier) {
    notifier = document.createElement('div');
    notifier.setAttribute('class', 'notifier component-notifier');
    context.append(notifier);
  }
  let n_contents = document.createElement('div');
  n_contents.setAttribute('class', 'notifier-contents');
  if (id) {
    n_contents.setAttribute('id', id);
  }
  let close = document.createElement('div');
  close.setAttribute('class', 'notifier-close');
  close.innerHTML = '<i class="tabler tabler-circle-x"></i>';
  close.addEventListener('click', () => {
    gtiz_modal.closeComponentNotifier(context, notifier, n_contents);
  });
  n_contents.append(close);
  if (title) {
    let n_header = document.createElement('div');
    n_header.setAttribute('class', 'notifier-header');
    n_header.innerHTML = '<h3>' + title + '</h3>';
    n_contents.append(n_header);
  }
  if (contents && contents.length > 0) {
    let n_body = document.createElement('div');
    n_body.setAttribute('class', 'notifier-body');
    contents.forEach(content => {
      n_body.append(content);
    });
    n_contents.append(n_body);
  }
  if (actions && actions.length > 0) {
    let n_actions = document.createElement('div');
    n_actions.setAttribute('class', 'notifier-actions');
    actions.forEach(action => {
      n_actions.append(action);
    });
    n_contents.append(n_actions);
  }
  if (feedback) {
    let n_feedback = document.createElement('div');
    n_feedback.setAttribute('class', 'notifier-feedback');
    n_feedback.innerHTML = feedback;
    if (f_type) {
      n_feedback.classList.add(f_type); 
    }
    n_contents.append(n_feedback);
  }
  if (id) {
    let previous = Array.from(notifier.querySelectorAll('.notifier-contents')).find(card => card.id === id);
    if (previous) {
      previous.remove();
    }
  }
  notifier.append(n_contents);
  context.classList.add('show-component-notifier');
};

/**
 * Build notifier
 * 
 * @param {String} title Modal title
 * @param {Array} contents Array of html modal contents
 * @param {DOM Node} feedback System feedback for users
 * @param {String} f_type Feedback type to assign as class `info` || `warning` || to be defined
 * @returns {undefined}
 *
 * An open card with the same text is replaced by the new one, placed at the bottom
 * as the most recent: the same notification is never shown twice.
 */
gtiz_modal.buildNotifier = function(title, contents, feedback, f_type) {
  // only the general notifier, never the one of a component
  let notifier = gtiz_modal.getNotifier();
  if (!notifier) {
    notifier = gtiz_modal.createNotifier();
  }
  let n_contents = document.createElement('div');
  n_contents.setAttribute('class', 'notifier-contents');
  let close = document.createElement('div');
  close.setAttribute('class', 'notifier-close');
  close.innerHTML = '<i class="tabler tabler-circle-x"></i>';
  close.addEventListener('click', () => {
    gtiz_modal.closeNotifier(notifier, n_contents);
  });
  n_contents.append(close);
  if (title) {
    let n_header = document.createElement('div');
    n_header.setAttribute('class', 'notifier-header');
    n_header.innerHTML = '<h3>' + title + '</h3>';
    n_contents.append(n_header);
  }
  if (contents && contents.length > 0) {
    let n_body = document.createElement('div');
    n_body.setAttribute('class', 'notifier-body');
    contents.forEach(content => {
      n_body.append(content);
    });
    n_contents.append(n_body);
  }
  if (feedback) {
    let n_feedback = document.createElement('div');
    n_feedback.setAttribute('class', 'notifier-feedback');
    n_feedback.innerHTML = feedback;
    if (f_type) {
      n_feedback.classList.add(f_type); 
    }
    n_contents.append(n_feedback);
  }
  // drop an open duplicate, the new card takes its place at the bottom
  let signature = gtiz_modal.getNotifierSignature(n_contents);
  n_contents.dataset.signature = signature;
  let duplicate = Array.from(notifier.querySelectorAll('.notifier-contents')).find(card => card.dataset.signature === signature);
  if (duplicate) {
    duplicate.remove();
  }
  notifier.querySelector('.notifier-cards').append(n_contents);
  gtiz_modal.updateCloseAllNotifiers(notifier);
  gtiz_modal.body.classList.add('show-notifier');
  // the new card is the last one: scroll to it when the cards do not fit the window
  gtiz_modal.updateNotifierScroll(notifier, true);
};

/**
 * Build modal
 * 
 * @param {String} title Modal title
 * @param {Array} contents Array of html modal contents
 * @param {DOM Node} feedback System feedback for users
 * @param {String} f_type Feedback type to assign as class `info` | `warning`
 */
gtiz_modal.buildModal = function(title, contents, feedback, f_type) {
  let modal = document.querySelector('.modal');
  if (title) {
    let m_header = modal.querySelector('.modal-header');
    m_header.innerHTML = '<h3>' + title + '</h3>';
  }
  if (contents.length > 0) {
    let m_body = modal.querySelector('.modal-body');
    let m_contents = document.createElement('div');
    m_contents.setAttribute('class', 'modal-body-contents');
    contents.forEach(content => {
      m_contents.append(content);
    });
    m_body.append(m_contents);
    gtiz_modal.scrolly.initNode(m_contents);
  }
  if (feedback) {
    let m_feedback = modal.querySelector('.modal-feedback');
    m_feedback.innerHTML = feedback;
    if (f_type) {
      m_feedback.classList.add(f_type); 
    }
    m_feedback.classList.add('show');
  }
  gtiz_modal.body.classList.add('show-modal');
};

/**
 * 
 * Colse modal and clean contents
 * 
 */
gtiz_modal.closeModal = function () {
  gtiz_locales.body.classList.toggle("show-modal");
  let modal = document.querySelector('.modal');
  modal.setAttribute('class', 'modal');
  let m_header = document.querySelector('.modal-header');
  let m_body = document.querySelector('.modal-body');
  let m_feedback = document.querySelector('.modal-feedback');
  m_feedback.setAttribute('class', 'modal-feedback');
  m_header.innerHTML = "";
  m_body.innerHTML = "";
  m_feedback.innerHTML = "";
}

gtiz_modal.close_modal_trigger.addEventListener('click', function(e) {
  gtiz_modal.closeModal();
});

window.addEventListener("resize", function() {
  setTimeout(() => {
    let node = document.querySelector('.modal-body-contents');
    if (node) {
      gtiz_modal.scrolly.updateNode(node);
    }
    // the general notifications follow the new window height
    let notifier = gtiz_modal.getNotifier();
    if (notifier) {
      gtiz_modal.updateNotifierScroll(notifier, false);
    }
  }, 300);
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (gtiz_locales.body.classList.contains('show-modal')) {
      gtiz_modal.closeModal();
    } else {
      // one general notification at a time, the last opened first
      gtiz_modal.closeLastNotifier();
    }
  }
});
