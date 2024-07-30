let gtiz_modal = {};

gtiz_modal.body = document.querySelector('body');
gtiz_modal.close_modal_trigger = document.querySelector('.modal-close');

gtiz_modal.css_vars = gtiz_utils.getAllCssVariables();
gtiz_modal.scrolly_options = {
  position: 'absolute',
  opacity: 0.8,
  containerColor: gtiz_modal.css_vars['--secondary-light'],
  barColor: gtiz_modal.css_vars['--secondary-dark'],
  radius: 1,
  scaleY : 0.8,
  side : 'left',
  offset : -1,
  width : 0.3,
  unit : 'rem',
};
gtiz_modal.scrolly = new Scrolly(gtiz_modal.scrolly_options);

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
    notifier.remove();
    component.classList.remove('show-component-notifier');
  }
}

/**
 * Close notifier and clean contents
 * 
 * @param {DOM node} notifier
 * 
 */
gtiz_modal.closeNotifier = function(notifier, contents) {
  contents.remove();
  let n_contents = document.querySelectorAll('.notifier-contents');
  if (!n_contents || n_contents.length == 0) {
    notifier.remove();
    gtiz_locales.body.classList.remove("show-notifier");
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
 */
gtiz_modal.buildComponentNotifier = function(component, id, title, contents, actions, feedback, f_type) {
  let selector ='.' + component + '-container';
  let context = document.querySelector(selector);
  let notifier = document.querySelector('.notifier');
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
  close.innerHTML = '<i class="iconic iconic-close-circle"></i>';
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
  notifier.append(n_contents);
  context.classList.add('show-component-notifier');
};

/**
 * Build notifier
 * 
 * @param {String} title Modal title
 * @param {Array} contents Array of html modal contents
 * @param {DOM Node} feedback System feedback for users
 * @param {String} f_type Feedback type to assign as class `info` | to be defined
 */
gtiz_modal.buildNotifier = function(title, contents, feedback, f_type) {
  let notifier = document.querySelector('.notifier');
  if (!notifier) {
    notifier = document.createElement('div');
    notifier.setAttribute('class', 'notifier');
    gtiz_modal.body.append(notifier);
  }
  let n_contents = document.createElement('div');
  n_contents.setAttribute('class', 'notifier-contents');
  let close = document.createElement('div');
  close.setAttribute('class', 'notifier-close');
  close.innerHTML = '<i class="iconic iconic-close-circle"></i>';
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
  notifier.append(n_contents);
  gtiz_modal.body.classList.add('show-notifier');
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
  }, 300);
});