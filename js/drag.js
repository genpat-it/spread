let gtiz_drag = {};

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
    if (event.target.classList.contains('not-draggable') || event.target.parentElement.classList.contains('not-draggable')) {
      return;
    }
    // get marign left and right of the element
    let style = window.getComputedStyle(draggable);
    let marginLeft = parseInt(style.marginLeft);
    let marginRight = parseInt(style.marginRight);
    gtiz_drag.start_offset_left = draggable.getBoundingClientRect().left - marginLeft - marginRight;
    gtiz_drag.start_offset_top = draggable.offsetTop;
    gtiz_drag.start_x = event.pageX;
    gtiz_drag.start_y = event.pageY;
    gtiz_drag.relative_x = event.pageX - gtiz_drag.start_offset_left;
    gtiz_drag.relative_y = event.pageY - gtiz_drag.start_offset_top;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };  
});