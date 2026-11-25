let gtiz_highlight = {};

/*
*
* Highlight of a control, the same for the search of the functions and for the
* "show me" of the assistant: the page is dimmed around a hole on the row of the
* control (it follows the row while menus and cards settle), and the text of the
* control gets the highlight of the search (`.search-highlight`: shifted right,
* in --accent, with the pulsing dot inside its bounds). It leaves after a few
* seconds or at the first click or key.
*
*/
gtiz_highlight.duration = 5000;
gtiz_highlight.current = null;

// boxes of the controls of menus and settings: the row that the hole lights up
gtiz_highlight.row_selector = '.button-box, .toggle-box, .select-box, .slider-box, .input-box, .list-box, .search-box, .radio-box';

/**
 * The row of a control: its box in menus and settings, the control otherwise
 *
 * @param {Element} element The control
 * @returns {Element} The row
 */
gtiz_highlight.getRow = function(element) {
  return element.closest(gtiz_highlight.row_selector) || element;
};

/**
 * The text of the row that gets the highlight of the search: as the search did,
 * the first element with text and no children but an icon
 *
 * @param {Element} row The row of the control
 * @param {Element} element The control
 * @returns {Element|null} The text element, null when the row has no text
 */
gtiz_highlight.getText = function(row, element) {
  let isText = function(node) {
    let leaf = node.children.length === 0 || node.children[0].nodeName.toLowerCase() === 'i';
    return leaf && node.textContent.trim() !== '';
  };
  if (isText(element)) {
    return element;
  }
  return [row, ...row.querySelectorAll('*')].find(isText) || null;
};

/**
 * Bring the row into view: the scrolled boxes around it (e.g. the Scrolly of a
 * menu) and then the page, only as much as needed
 *
 * @param {Element} row The row of the control
 * @returns {undefined}
 */
gtiz_highlight.scrollIntoView = function(row) {
  let box = row.parentElement;
  while (box && box !== document.body) {
    let style = getComputedStyle(box);
    if (box.scrollHeight > box.clientHeight + 1 && /auto|scroll|hidden/.test(style.overflowY)) {
      let rowRect = row.getBoundingClientRect();
      let boxRect = box.getBoundingClientRect();
      if (rowRect.top < boxRect.top) {
        box.scrollTop -= boxRect.top - rowRect.top + 8;
      } else if (rowRect.bottom > boxRect.bottom) {
        box.scrollTop += rowRect.bottom - boxRect.bottom + 8;
      }
    }
    box = box.parentElement;
  }
  row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};

/**
 * Bounds of what the row shows: the union of its visible children (the box of a
 * row may have empty space above and below), the row itself without children.
 * A row of menus and settings keeps its own width; a single button (e.g. a
 * round trigger, whose circle is its icon) takes the bounds of what it shows
 * on both sides
 *
 * @param {Element} row The row of the control
 * @param {Boolean} box True for a row of menus and settings
 * @returns {Object} Left, top, right and bottom, in px of the viewport
 */
gtiz_highlight.getBounds = function(row, box) {
  let rects = [...row.children].map(child => child.getBoundingClientRect()).filter(rect => rect.width && rect.height);
  if (!rects.length) {
    rects = [row.getBoundingClientRect()];
  }
  let rowRect = row.getBoundingClientRect();
  return {
    left : box ? rowRect.left : Math.min(...rects.map(rect => rect.left)),
    right : box ? rowRect.right : Math.max(...rects.map(rect => rect.right)),
    top : Math.min(...rects.map(rect => rect.top)),
    bottom : Math.max(...rects.map(rect => rect.bottom))
  };
};

/**
 * Remove the highlight shown, if any
 *
 * @returns {undefined}
 */
gtiz_highlight.hide = function() {
  if (gtiz_highlight.current) {
    gtiz_highlight.current();
    gtiz_highlight.current = null;
  }
};

/**
 * Highlight a control: dim the page around its row, give its text the
 * highlight of the search, bring it into view; it leaves after a few seconds or
 * at the first click or key
 *
 * @param {Element} element The control to show
 * @param {Object} [options] { duration } in ms
 * @returns {undefined}
 */
gtiz_highlight.show = function(element, options) {
  gtiz_highlight.hide();
  if (!element) {
    return;
  }
  let duration = options && options.duration ? options.duration : gtiz_highlight.duration;
  let row = gtiz_highlight.getRow(element);
  let box = row.matches(gtiz_highlight.row_selector);
  let text = gtiz_highlight.getText(row, element);
  gtiz_highlight.scrollIntoView(row);
  if (text) {
    text.classList.add('search-highlight');
  }
  let hole = document.createElement('div');
  hole.setAttribute('class', 'highlight-hole');
  document.body.append(hole);
  let alive = true;
  // margins of the hole: wider on the sides of a row, the same all around a
  // single button (a circle around a round trigger)
  let side = box ? 8 : 6;
  // the hole follows the row while menus, cards and scrolled boxes settle; its
  // position is the only inline style, it depends on where the row is
  let follow = function() {
    if (!alive) {
      return;
    }
    let bounds = gtiz_highlight.getBounds(row, box);
    let visible = bounds.right > bounds.left && bounds.bottom > bounds.top;
    hole.hidden = !visible;
    hole.style.left = (bounds.left - side) + 'px';
    hole.style.top = (bounds.top - 6) + 'px';
    hole.style.width = (bounds.right - bounds.left + side * 2) + 'px';
    hole.style.height = (bounds.bottom - bounds.top + 12) + 'px';
    requestAnimationFrame(follow);
  };
  follow();
  let timer;
  let remove = function() {
    alive = false;
    clearTimeout(timer);
    hole.remove();
    if (text) {
      text.classList.remove('search-highlight');
    }
    window.removeEventListener('pointerdown', remove, true);
    window.removeEventListener('keydown', remove, true);
    if (gtiz_highlight.current === remove) {
      gtiz_highlight.current = null;
    }
  };
  timer = setTimeout(gtiz_highlight.hide, duration);
  window.addEventListener('pointerdown', remove, true);
  window.addEventListener('keydown', remove, true);
  gtiz_highlight.current = remove;
};
