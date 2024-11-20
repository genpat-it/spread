/*! *****************************************************************************

 Scrolly 1.0, a JS library for creating custom scrollbars
 
 (c) Alessandro De Luca @ Istituto Zooprofilattico Sperimentale dell'Abruzzo e del Molise "G. Caporale"
 
 This program is free software. You can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 
 This program is distributed in the hope that it will be useful, but without any warranty; without even the implied warranty of merchantability or fitness for a particular purpose. See the GNU General Public License for more details.

 ***************************************************************************** */

(function (global) {
  const Scrolly = function (options, callback, errorCallback) {
    const Scrolly = {};

    const destroy = function (node) {
      node.classList.remove('scrolly');
      node.setAttribute(Scrolly.options.selector, 'false');
      node.style.maxHeight = '';
      let parent = node.parentElement;
      let container = parent.querySelector('.scrolly-container');
      if (container) {
        parent.removeChild(container);
      }
    };

    const createScrolly = function (node) {
      let selector = node.getAttribute(Scrolly.options.selector);
      if (!selector) {
        node.setAttribute(Scrolly.options.selector, 'true');
      }
      let parent = node.parentElement;
      let nodeHeight = parseInt(node.clientHeight);
      let parentHeight = parseInt(parent.clientHeight);

      if (nodeHeight <= parentHeight) {
        return;
      }

      if (node.classList.contains('scrolly')) {
        return;
      }

      let parentZIndex = window.getComputedStyle(parent).getPropertyValue('z-index');
      let parentPaddingTop = parseInt(window.getComputedStyle(parent).getPropertyValue('padding-top'));
      let parentPaddingBottom = parseInt(window.getComputedStyle(parent).getPropertyValue('padding-bottom'));
      let parentMarginTop = parseInt(window.getComputedStyle(parent).getPropertyValue('margin-top'));
      let parentMarginBottom = parseInt(window.getComputedStyle(parent).getPropertyValue('margin-bottom'));

      let parentPaddings = parentPaddingTop + parentPaddingBottom;
      let parentMargins = parentMarginTop + parentMarginBottom;

      let nodePaddingTop = parseInt(window.getComputedStyle(node).getPropertyValue('padding-top'));
      let nodePaddingBottom = parseInt(window.getComputedStyle(node).getPropertyValue('padding-bottom'));
      let nodeMarginTop = parseInt(window.getComputedStyle(node).getPropertyValue('margin-top'));
      let nodeMarginBottom = parseInt(window.getComputedStyle(node).getPropertyValue('margin-bottom'));

      let nodePaddings = nodePaddingTop + nodePaddingBottom;
      let nodeMargins = nodeMarginTop + nodeMarginBottom;

      node.classList.add('scrolly');
      node.style.maxHeight = ((parentHeight - parentPaddings + parentMargins) - (nodePaddings + nodeMargins)) + 'px';

      let container = document.createElement('div');
      let containerHeight = (parentHeight - parentPaddings + parentMargins);
      container.classList.add('scrolly-container');
      container.style.backgroundColor = Scrolly.options.containerColor;
      container.style.width = Scrolly.options.width + Scrolly.options.unit;
      container.style.position = Scrolly.options.position;
      container.style.zIndex = parentZIndex ? parseInt(parentZIndex) + 1 : '1001';
      container.style.top = parentPaddingTop + 'px';
      let side = Scrolly.options.side;
      container.style[side] = Scrolly.options.offset + Scrolly.options.unit;
      container.style.height = containerHeight + 'px';
      container.style.transform = 'scaleY(' + Scrolly.options.scaleY + ')';
      container.style.borderRadius = Scrolly.options.radius + Scrolly.options.unit;

      let barHeight = parseInt((containerHeight * containerHeight) / nodeHeight) + 1; // +1 to cover the empty space at the bottom when we have non-integer values less than 0.5, rounded by parseInt()
      let bar = document.createElement('div');
      bar.classList.add('scrolly-bar');
      bar.style.backgroundColor = Scrolly.options.barColor;
      bar.style.width = '100%';
      bar.style.position = 'absolute';
      bar.style.top = 0;
      bar.style.right = 0;
      bar.style.height = barHeight + 'px';
      bar.style.borderRadius = Scrolly.options.radius + Scrolly.options.unit;

      container.appendChild(bar);
      parent.appendChild(container);

      node.addEventListener('scroll', function (event) {
        // get scroll position
        let scrollTop = parseInt(node.scrollTop);
        let scrollBarTop = ((scrollTop * barHeight) / containerHeight);
        bar.style.top = scrollBarTop + 'px';
      });
    }

    const updateNode = function (node) {
      node.style.maxHeight = '';
      let parent = node.parentElement;
      let nodeHeight = parseInt(node.clientHeight);
      let parentHeight = parseInt(parent.clientHeight);
      if (nodeHeight <= parentHeight) {
        destroy(node);
        return;
      }

      if (!node.classList.contains('scrolly')) {
        createScrolly(node);
      } else {
        node.setAttribute(Scrolly.options.selector, 'true');
        let parentPaddingTop = parseInt(window.getComputedStyle(parent).getPropertyValue('padding-top'));
        let parentPaddingBottom = parseInt(window.getComputedStyle(parent).getPropertyValue('padding-bottom'));
        let parentMarginTop = parseInt(window.getComputedStyle(parent).getPropertyValue('margin-top'));
        let parentMarginBottom = parseInt(window.getComputedStyle(parent).getPropertyValue('margin-bottom'));

        let parentPaddings = parentPaddingTop + parentPaddingBottom;
        let parentMargins = parentMarginTop + parentMarginBottom;

        let nodePaddingTop = parseInt(window.getComputedStyle(node).getPropertyValue('padding-top'));
        let nodePaddingBottom = parseInt(window.getComputedStyle(node).getPropertyValue('padding-bottom'));
        let nodeMarginTop = parseInt(window.getComputedStyle(node).getPropertyValue('margin-top'));
        let nodeMarginBottom = parseInt(window.getComputedStyle(node).getPropertyValue('margin-bottom'));

        let nodePaddings = nodePaddingTop + nodePaddingBottom;
        let nodeMargins = nodeMarginTop + nodeMarginBottom;

        node.style.maxHeight = ((parentHeight - parentPaddings + parentMargins) - (nodePaddings + nodeMargins)) + 'px';

        let container = parent.querySelector('.scrolly-container');
        let containerHeight = (parentHeight - parentPaddings + parentMargins);
        container.style.top = parentPaddingTop + 'px';
        container.style.height = containerHeight + 'px';

        let barHeight = parseInt((containerHeight * containerHeight) / nodeHeight) + 1 // +1 to cover the empty space at the bottom when we have non-integer values less than 0.5, rounded by parseInt()
        let bar = container.querySelector('.scrolly-bar');
        bar.style.height = barHeight + 'px';

        // update the scroll event listener
        node.removeEventListener('scroll', function (event) {
          let scrollTop = parseInt(node.scrollTop);
          let scrollBarTop = ((scrollTop * barHeight) / containerHeight);
          bar.style.top = scrollBarTop + 'px';
        });
        node.addEventListener('scroll', function (event) {
          let scrollTop = parseInt(node.scrollTop);
          let scrollBarTop = ((scrollTop * barHeight) / containerHeight);
          bar.style.top = scrollBarTop + 'px';
        });
      }
    };

    const updateNodes = function () {
      let selector = '[' + Scrolly.options.selector + ']';
      let nodes = document.querySelectorAll(selector);
      if (nodes.length) {
        for (let node of nodes) {
          updateNode(node);
        }
      }
    };

    const initNodes = function () {
      let selector = '[' + Scrolly.options.selector + ']';
      let nodes = document.querySelectorAll(selector);
      if (nodes.length) {
        for (let node of nodes) {
          createScrolly(node);
        }
      }
    };

    const initNode = function (node) {
      createScrolly(node);
    };

    Scrolly.options = {
      ...{
        selector: 'data-scrolly',
        position: 'fixed',
        opacity: 1,
        radius: 0,
        offset: 0,
        scaleY: 1,
        containerColor: '#f1f1f1',
        barColor: 'blue',
        width: '0.5',
        side: 'right', // 'left' or 'right
        unit: 'rem' // px or rem
      },
      ...options
    };

    Scrolly.initNodes = initNodes;
    Scrolly.initNode = initNode;
    Scrolly.destroy = destroy;
    Scrolly.updateNode = updateNode;
    Scrolly.updateNodes = updateNodes;

    return Scrolly;
  };

  global.Scrolly = Scrolly;
})(this);