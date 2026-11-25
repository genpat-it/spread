let gtiz_drag = {};

/**
 * Makes an element freely draggable within its offset parent using vanilla
 * JavaScript (replacement for jQuery UI `.draggable()`). The element is moved
 * by updating its `left`/`top` style properties.
 *
 * @param {Element} el - The element to make draggable.
 * @param {Object} [options] - Options.
 * @param {string} [options.cancel] - CSS selector; pointer down on a matching
 *   descendant will not start a drag.
 */
gtiz_drag.makeFreeDraggable = function(el, options) {
  options = options || {};
  el.addEventListener('mousedown', function(event) {
    if (event.button !== 0) return;
    if (options.cancel && event.target.closest(options.cancel)) return;
    event.preventDefault();
    let rect = el.getBoundingClientRect();
    let parent = el.offsetParent || document.body;
    let parentRect = parent.getBoundingClientRect();
    let startLeft = rect.left - parentRect.left;
    let startTop = rect.top - parentRect.top;
    let startX = event.pageX;
    let startY = event.pageY;
    // switch positioning to left/top so the element can move freely
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = startLeft + 'px';
    el.style.top = startTop + 'px';
    let onMouseMove = function(e) {
      el.style.left = (startLeft + e.pageX - startX) + 'px';
      el.style.top = (startTop + e.pageY - startY) + 'px';
    };
    let onMouseUp = function() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
};

gtiz_drag.start_mouse_x = 0;
gtiz_drag.start_mouse_y = 0;
gtiz_drag.start_offset_left = 0;
gtiz_drag.start_offset_top = 0;
gtiz_drag.relative_x = 0;
gtiz_drag.relative_y = 0;

// DOM elements
gtiz_drag.body = document.querySelector('body');
gtiz_drag.main_section = document.querySelector('section.main');
gtiz_drag.draggables = document.querySelectorAll('.draggable');
gtiz_drag.target = document.querySelector('.target');
gtiz_drag.target_area = document.querySelector('.target-area');

/**
 * Checks if a target element is empty. An element is considered empty if it has no draggable elements that are not dragged, or if it has one draggable element that is currently being dragged.
 *
 * @param {Element} target - The target element to check.
 * @return {boolean} True if the target element is empty, false otherwise.
 */
gtiz_drag.isEmpty = function(target) {
  const draggable = target.querySelectorAll('.draggable:not(.dragged)');
  return draggable.length === 0 || (draggable.length === 1 && draggable[0].classList.contains('dragging'));
};

/**
 * Checks if a draggable element is over a target element. This is determined by comparing the bounding rectangles of the two elements.
 *
 * @param {Element} draggable - The draggable element.
 * @param {Element} target - The target element.
 * @return {boolean} True if the draggable element is over the target element, false otherwise.
 */
gtiz_drag.isOver = function(draggable, target) {
  let draggableRect = draggable.getBoundingClientRect();
  let targetRect = target.getBoundingClientRect();

  return !(draggableRect.right < targetRect.left || 
           draggableRect.left > targetRect.right || 
           draggableRect.bottom < targetRect.top || 
           draggableRect.top > targetRect.bottom);
}

/**
 * Moves a draggable element to a specified position. The position is specified by the pageX and pageY parameters, which represent the X and Y coordinates of the mouse pointer. The draggable element's style.left and style.top properties are updated to move the element to the new position.
 *
 * @param {Element} draggable - The draggable element.
 * @param {number} pageX - The X coordinate of the mouse pointer.
 * @param {number} pageY - The Y coordinate of the mouse pointer.
 */
gtiz_drag.moveAt = function(draggable, pageX, pageY) {
  draggable.style.left = pageX - gtiz_drag.relative_x + 'px';
  draggable.style.top = pageY - gtiz_drag.relative_y + 'px';
}

/**
 * Handles the mousemove event for a draggable element. This function moves the draggable element, checks if it's over the target element, and updates the target element's classes accordingly.
 *
 * @param {Element} draggable - The draggable element.
 * @param {Event} event - The mousemove event.
 */
gtiz_drag.onMouseMove = function(draggable, event) {
  draggable.classList.add('dragging');
  draggable.classList.remove('dragged');
  draggable.style.position = 'absolute';
  draggable.style.zIndex = 1000;
  gtiz_drag.moveAt(draggable, event.pageX, event.pageY);
  if (gtiz_drag.isOver(draggable, gtiz_drag.target)) {
    gtiz_drag.target.classList.add('drag-over');
  } else {
    gtiz_drag.target.classList.remove('drag-over');
  }
  if (gtiz_drag.isEmpty(gtiz_drag.target)) {
    gtiz_drag.target.classList.add('target-empty');
  }
}

/*
*
* Where a card or a panel is taken: by its handle (the grip in the tools of its
* header) or by the empty space of its header, the title outside its text (the
* text is in its children). The text keeps its click: it opens and closes the
* legend and the assistant cards (see gtiz_drag.isHeaderSpace in their
* handlers).
*
*/

/**
 * Tells if an element is the empty space of the header of a card or panel: its
 * title itself, not the text inside it
 *
 * @param {Element} box The card, or the box of a panel that moves
 * @param {Element} target The element under the pointer
 * @returns {Boolean} True on the empty space of the header of the box
 */
gtiz_drag.isHeaderSpace = function(box, target) {
  return target.classList.contains('card-title') && target.parentElement === box;
};

/**
 * Starts the drag of a card from a press on its handle or on the empty space
 * of its header
 *
 * @param {Element} card The card
 * @param {MouseEvent} event The mousedown event on the card
 * @param {Function} start Called with the mousedown event to start the drag
 * @returns {Boolean} True when the press is on the handle or on the empty space
 */
gtiz_drag.grab = function(card, event, start) {
  if (event.button !== 0) {
    return false;
  }
  if (event.target.closest('.card-drag-handle') || gtiz_drag.isHeaderSpace(card, event.target)) {
    start(event);
    return true;
  }
  return false;
};

/**
 * This code sets up drag and drop functionality for a set of elements.
 *
 * @param {Array} gtiz_drag.draggables - The array of elements that can be dragged.
 */
gtiz_drag.draggables.forEach(draggable => {
  let onMouseMove = function(event) {
    gtiz_drag.body.classList.add('no-select');
    gtiz_drag.onMouseMove(draggable, event);
  };
  let onMouseUp = function(event) {
    gtiz_drag.body.classList.remove('no-select');
    if (gtiz_drag.isOver(draggable, gtiz_drag.target) || gtiz_drag.isOver(draggable, gtiz_drag.target_area)) {
      draggable.classList.remove('dragging');
      draggable.classList.remove('dragged');
      draggable.setAttribute('style', '');
      gtiz_drag.target.classList.remove('drag-over');
    } else {
      draggable.classList.remove('dragging');
      draggable.classList.add('dragged');
      let reset = draggable.querySelector('.reset-draggable');
      if (reset) {
        reset.addEventListener('click', function() {
          draggable.classList.remove('dragged');
          draggable.setAttribute('style', '');
          if (gtiz_drag.isEmpty(gtiz_drag.target)) {
            gtiz_drag.target.classList.add('target-empty');
          } else {
            gtiz_drag.target.classList.remove('target-empty');
          }
          gtiz_layout.setViewHeight(300);
        });
      }
    }
    if (gtiz_drag.isEmpty(gtiz_drag.target)) {
      gtiz_drag.target.classList.add('target-empty');
    } else {
      gtiz_drag.target.classList.remove('target-empty');
    }
    gtiz_layout.setViewHeight(300);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  draggable.onmousedown = function(event) {
    // a card is taken by its handle or by the empty space of its header (gtiz_drag.grab)
    gtiz_drag.grab(draggable, event, function(start) {
      // get marign left and right of the element
      let style = window.getComputedStyle(draggable);
      let marginLeft = parseInt(style.marginLeft);
      let marginRight = parseInt(style.marginRight);
      gtiz_drag.start_offset_left = draggable.getBoundingClientRect().left - marginLeft - marginRight;
      gtiz_drag.start_offset_top = draggable.offsetTop;
      gtiz_drag.start_x = start.pageX;
      gtiz_drag.start_y = start.pageY;
      gtiz_drag.relative_x = start.pageX - gtiz_drag.start_offset_left;
      gtiz_drag.relative_y = start.pageY - gtiz_drag.start_offset_top;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  };
});

/**
 * Makes a card of a column detachable, taken by its handle (the grip in the
 * tools of its header) or by the empty space of its header (see gtiz_drag.grab): dragged out of its
 * column it floats over the container
 * (it moves there, so it stays visible when the column closes) and shows its
 * close trigger (`.reset-draggable`); dropped over its column (or, with the
 * column closed, over its place on the right of the container) or closed with
 * that trigger, it docks again at the end of the column (at its start with
 * `first`, e.g. the legend above the assistant). A click on the handle that does
 * not move the card leaves it where it is.
 *
 * @param {Element} card The card
 * @param {Object} options { column: home column, container: where the card
 *   floats, first: dock at the start of the column, onChange(floating): after
 *   the card floats or docks, onDrop(): at the end of every drag }
 * @returns {undefined}
 */
gtiz_drag.makeDetachable = function(card, options) {
  let column = options.column;
  let container = options.container;
  let handle = card.querySelector('.card-drag-handle');
  let reset = card.querySelector('.reset-draggable');
  if (!handle || !column || !container) {
    return;
  }
  let changed = function(floating) {
    if (options.onChange) {
      options.onChange(floating);
    }
  };
  // drop area of the column, shown while the card is over it: as the one of the
  // settings column, with the same icon in the middle
  if (!column.querySelector(':scope > .detach-drop-area')) {
    let area = document.createElement('div');
    area.setAttribute('class', 'detach-drop-area');
    let tip = document.createElement('div');
    tip.setAttribute('class', 'target-tip');
    let icon = document.createElement('i');
    icon.setAttribute('class', 'tabler tabler-picture-in-picture');
    tip.append(icon);
    area.append(tip);
    column.append(area);
  }
  // where the card docks: the column, or its place on the right of the
  // container when the column is closed
  let dockZone = function() {
    let rect = column.getBoundingClientRect();
    if (rect.width > 0) {
      return rect;
    }
    let box = container.getBoundingClientRect();
    return { left : box.right - card.offsetWidth, right : box.right, top : box.top, bottom : box.bottom };
  };
  // the card is over its dock when its centre is inside it
  let overDock = function() {
    let rect = card.getBoundingClientRect();
    let zone = dockZone();
    let x = rect.left + rect.width / 2;
    let y = rect.top + Math.min(rect.height, 60) / 2;
    return x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom;
  };
  let dock = function() {
    card.classList.remove('dragging');
    card.classList.remove('dragged');
    card.removeAttribute('style');
    column.classList.remove('drag-over');
    // the order of the column does not depend on the order of docking
    if (options.first) {
      column.prepend(card);
    } else {
      column.append(card);
    }
    changed(false);
    if (options.onDrop) {
      options.onDrop();
    }
  };
  // taken by its handle or by the empty space of its header (gtiz_drag.grab)
  card.addEventListener('mousedown', function(down) {
    gtiz_drag.grab(card, down, drag);
  });
  function drag(event) {
    event.preventDefault();
    let rect = card.getBoundingClientRect();
    let docked = card.parentElement !== container;
    if (docked) {
      container.append(card);
    }
    card.classList.add('dragging');
    card.classList.remove('dragged');
    // the position is the only inline style: it follows the pointer
    let box = container.getBoundingClientRect();
    let startLeft = rect.left - box.left;
    let startTop = rect.top - box.top;
    let startX = event.pageX;
    let startY = event.pageY;
    card.style.left = startLeft + 'px';
    card.style.top = startTop + 'px';
    if (docked) {
      changed(true);
    }
    gtiz_drag.body.classList.add('no-select');
    let onMouseMove = function(e) {
      card.style.left = (startLeft + e.pageX - startX) + 'px';
      card.style.top = (startTop + e.pageY - startY) + 'px';
      column.classList.toggle('drag-over', overDock());
    };
    let onMouseUp = function() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      gtiz_drag.body.classList.remove('no-select');
      if (overDock()) {
        dock();
        return;
      }
      card.classList.remove('dragging');
      card.classList.add('dragged');
      column.classList.remove('drag-over');
      if (options.onDrop) {
        options.onDrop();
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  if (reset) {
    reset.addEventListener('click', dock);
  }
};

/**
 * Makes a panel of the top bar (e.g. macros, notes) draggable by its handle and
 * by the empty space of its header (the title outside its text). It
 * opens modal in the top right corner, as before; once dragged (a move of more
 * than a few pixels, a click does nothing) it is no more modal: the veil goes
 * away and the page is usable around it. It stays inside the window and, when
 * the panel closes, it goes back to the top right corner, modal.
 *
 * @param {Element} panel The section of the panel
 * @param {Object} options { contents: the box that moves, handle: the grip,
 *   showClass: class of the body while the panel is open, onFloat(): after it
 *   is no more modal (its height may change: e.g. to update its scrollbar) }
 * @returns {undefined}
 */
gtiz_drag.makePanelDraggable = function(panel, options) {
  let contents = options.contents;
  let handle = options.handle;
  if (!panel || !contents || !handle) {
    return;
  }
  let reset = function() {
    panel.classList.remove('panel-floating');
    contents.style.removeProperty('left');
    contents.style.removeProperty('top');
    contents.style.removeProperty('right');
  };
  // taken by its handle or by the empty space of its header, the title outside
  // its text (gtiz_drag.isHeaderSpace)
  contents.addEventListener('mousedown', function(event) {
    if (event.button !== 0) {
      return;
    }
    if (!handle.contains(event.target) && !gtiz_drag.isHeaderSpace(contents, event.target)) {
      return;
    }
    event.preventDefault();
    let rect = contents.getBoundingClientRect();
    let startX = event.clientX;
    let startY = event.clientY;
    let moved = false;
    gtiz_drag.body.classList.add('no-select');
    let onMouseMove = function(e) {
      let dx = e.clientX - startX;
      let dy = e.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) {
        return;
      }
      if (!moved) {
        moved = true;
        let floating = panel.classList.contains('panel-floating');
        panel.classList.add('panel-floating');
        contents.style.right = 'auto';
        if (!floating && options.onFloat) {
          requestAnimationFrame(options.onFloat);
        }
      }
      // the position is the only inline style: it follows the pointer, inside the window
      let left = Math.min(Math.max(0, rect.left + dx), window.innerWidth - rect.width);
      let top = Math.min(Math.max(0, rect.top + dy), window.innerHeight - Math.min(rect.height, 60));
      contents.style.left = left + 'px';
      contents.style.top = top + 'px';
    };
    let onMouseUp = function() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      gtiz_drag.body.classList.remove('no-select');
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  // closed: at the next opening it is again in the top right corner, modal
  new MutationObserver(function() {
    if (!document.body.classList.contains(options.showClass) && panel.classList.contains('panel-floating')) {
      reset();
    }
  }).observe(document.body, { attributes : true, attributeFilter : ['class'] });
};

// the macros and notes panels, dragged by their handle; detached they are lower
// (at most 70% of the window), so their scrollbar is updated
let panelScrolls = {
  macros : () => gtiz_macros.scrolly.updateNode(document.querySelector('.macros-form')),
  notes : () => gtiz_notes.updateScroll()
};
['macros', 'notes'].forEach(name => {
  let panel = document.querySelector('section.' + name);
  if (panel) {
    gtiz_drag.makePanelDraggable(panel, {
      contents : panel.querySelector('.' + name + '-contents'),
      handle : panel.querySelector('.' + name + '-drag-handle'),
      showClass : 'show-' + name,
      onFloat : panelScrolls[name]
    });
  }
});
