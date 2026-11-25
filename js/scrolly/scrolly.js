/*! *****************************************************************************

 Scrolly 1.0, a JS library for creating custom scrollbars
 
 (c) Alessandro De Luca @ Istituto Zooprofilattico Sperimentale dell'Abruzzo e del Molise "G. Caporale"
 
 This program is free software. You can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 
 This program is distributed in the hope that it will be useful, but without any warranty; without even the implied warranty of merchantability or fitness for a particular purpose. See the GNU General Public License for more details.

 ***************************************************************************** */

(function (global) {
  const Scrolly = function (options, callback, errorCallback) {
    const Scrolly = {};

    const getParentContentHeight = function (parent) {
      let parentPaddingTop = parseInt(window.getComputedStyle(parent).getPropertyValue('padding-top'));
      let parentPaddingBottom = parseInt(window.getComputedStyle(parent).getPropertyValue('padding-bottom'));
      let parentMarginTop = parseInt(window.getComputedStyle(parent).getPropertyValue('margin-top'));
      let parentMarginBottom = parseInt(window.getComputedStyle(parent).getPropertyValue('margin-bottom'));
      let parentPaddings = parentPaddingTop + parentPaddingBottom;
      let parentMargins = parentMarginTop + parentMarginBottom;
      return {
        height: (parseInt(parent.clientHeight) - parentPaddings + parentMargins),
        paddingTop: parentPaddingTop,
        paddings: parentPaddings,
        margins: parentMargins
      };
    };

    const getNodeOuterSpace = function (node) {
      let nodePaddingTop = parseInt(window.getComputedStyle(node).getPropertyValue('padding-top'));
      let nodePaddingBottom = parseInt(window.getComputedStyle(node).getPropertyValue('padding-bottom'));
      let nodeMarginTop = parseInt(window.getComputedStyle(node).getPropertyValue('margin-top'));
      let nodeMarginBottom = parseInt(window.getComputedStyle(node).getPropertyValue('margin-bottom'));
      return {
        paddings: nodePaddingTop + nodePaddingBottom,
        margins: nodeMarginTop + nodeMarginBottom
      };
    };

    const getContentHeight = function (node) {
      if (Scrolly.options.contentHeightMode === 'scroll') {
        return parseInt(node.scrollHeight);
      }
      return parseInt(node.clientHeight);
    };

    const getContentWidth = function (node) {
      if (Scrolly.options.contentHeightMode === 'scroll') {
        return parseInt(node.scrollWidth);
      }
      return parseInt(node.clientWidth);
    };

    const hasOverflow = function (node, parent) {
      if (Scrolly.options.direction === 'horizontal') {
        if (Scrolly.options.overflowCheckMode === 'self') {
          return node.scrollWidth > node.clientWidth;
        }
        return getContentWidth(node) > parseInt(parent.clientWidth);
      }
      if (Scrolly.options.overflowCheckMode === 'self') {
        return node.scrollHeight > node.clientHeight;
      }
      let nodeHeight = getContentHeight(node);
      let parentHeight = parseInt(parent.clientHeight);
      return nodeHeight > parentHeight;
    };

    const syncBarPosition = function (node) {
      let container = node._scrollyContainer || null;
      let bar = node._scrollyBar || null;
      if (!container || !bar) {
        return;
      }
      if (Scrolly.options.direction === 'horizontal') {
        let containerWidth = parseInt(container.clientWidth);
        let barWidth = parseInt(bar.clientWidth);
        let maxScrollX = node.scrollWidth - node.clientWidth;
        if (maxScrollX <= 0) {
          bar.style.left = '0px';
          return;
        }
        let scrollRatioX = node.scrollLeft / maxScrollX;
        let maxBarLeft = Math.max(containerWidth - barWidth, 0);
        bar.style.left = (scrollRatioX * maxBarLeft) + 'px';
        return;
      }
      let containerHeight = parseInt(container.clientHeight);
      let barHeight = parseInt(bar.clientHeight);
      let maxScroll = node.scrollHeight - node.clientHeight;
      if (maxScroll <= 0) {
        bar.style.top = '0px';
        return;
      }
      let scrollRatio = node.scrollTop / maxScroll;
      let maxBarTop = Math.max(containerHeight - barHeight, 0);
      bar.style.top = (scrollRatio * maxBarTop) + 'px';
    };

    const bindScrollHandler = function (node) {
      if (node._scrollyOnScroll) {
        node.removeEventListener('scroll', node._scrollyOnScroll);
      }
      node._scrollyOnScroll = function () {
        syncBarPosition(node);
      };
      node.addEventListener('scroll', node._scrollyOnScroll);
    };

    const bindDragHandler = function (node) {
      let container = node._scrollyContainer || null;
      let bar = node._scrollyBar || null;
      if (!container || !bar) {
        return;
      }

      if (node._scrollyDragCleanup) {
        node._scrollyDragCleanup();
        node._scrollyDragCleanup = null;
      }

      if (!Scrolly.options.draggable) {
        return;
      }

      const setCursorState = function (dragging) {
        let value = dragging ? 'grabbing' : 'grab';
        bar.style.cursor = value;
        container.style.cursor = value;
        document.body.style.cursor = dragging ? value : '';
      };

      const onMouseDown = function (event) {
        let startCoord = Scrolly.options.direction === 'horizontal' ? event.clientX : event.clientY;
        let startScroll = Scrolly.options.direction === 'horizontal' ? node.scrollLeft : node.scrollTop;

        const onMouseMove = function (moveEvent) {
          let currentCoord = Scrolly.options.direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
          let deltaCoord = currentCoord - startCoord;

          let trackSize = Scrolly.options.direction === 'horizontal' ? container.clientWidth : container.clientHeight;
          let barSize = Scrolly.options.direction === 'horizontal' ? bar.clientWidth : bar.clientHeight;
          let maxBarTravel = Math.max(trackSize - barSize, 0);

          let maxScroll = Scrolly.options.direction === 'horizontal'
            ? Math.max(node.scrollWidth - node.clientWidth, 0)
            : Math.max(node.scrollHeight - node.clientHeight, 0);

          if (maxBarTravel <= 0 || maxScroll <= 0) {
            return;
          }

          let scrollDelta = (deltaCoord / maxBarTravel) * maxScroll;
          let nextScroll = startScroll + scrollDelta;

          if (Scrolly.options.direction === 'horizontal') {
            node.scrollLeft = Math.min(Math.max(nextScroll, 0), maxScroll);
          } else {
            node.scrollTop = Math.min(Math.max(nextScroll, 0), maxScroll);
          }
        };

        const onMouseUp = function () {
          bar.classList.remove('scrolly-bar-dragging');
          setCursorState(false);
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        event.preventDefault();
        bar.classList.add('scrolly-bar-dragging');
        setCursorState(true);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      setCursorState(false);
      bar.addEventListener('mousedown', onMouseDown);
      node._scrollyDragCleanup = function () {
        setCursorState(false);
        bar.removeEventListener('mousedown', onMouseDown);
      };
    };

    const bindVisualStateHandler = function (node) {
      let bar = node._scrollyBar || null;
      if (!bar) {
        return;
      }

      if (node._scrollyVisualCleanup) {
        node._scrollyVisualCleanup();
        node._scrollyVisualCleanup = null;
      }

      const baseColor = Scrolly.options.barColor;
      const hoverColor = Scrolly.options.hoverBarColor || baseColor;
      const activeColor = Scrolly.options.activeBarColor || hoverColor;

      const onMouseEnter = function () {
        if (!bar.classList.contains('scrolly-bar-dragging')) {
          bar.style.backgroundColor = hoverColor;
        }
      };

      const onMouseLeave = function () {
        if (!bar.classList.contains('scrolly-bar-dragging')) {
          bar.style.backgroundColor = baseColor;
        }
      };

      const onMouseDown = function () {
        bar.style.backgroundColor = activeColor;
      };

      const onMouseUp = function () {
        if (bar.matches(':hover')) {
          bar.style.backgroundColor = hoverColor;
        } else {
          bar.style.backgroundColor = baseColor;
        }
      };

      bar.addEventListener('mouseenter', onMouseEnter);
      bar.addEventListener('mouseleave', onMouseLeave);
      bar.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mouseup', onMouseUp);

      node._scrollyVisualCleanup = function () {
        bar.removeEventListener('mouseenter', onMouseEnter);
        bar.removeEventListener('mouseleave', onMouseLeave);
        bar.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mouseup', onMouseUp);
      };
    };

    const destroy = function (node) {
      node.classList.remove('scrolly');
      node.classList.remove('scrolly-horizontal');
      node.classList.remove('scrolly-vertical');
      node.setAttribute(Scrolly.options.selector, 'false');
      if (!Scrolly.options.preserveNodeMaxHeight) {
        node.style.maxHeight = '';
      }
      if (node._scrollyOnScroll) {
        node.removeEventListener('scroll', node._scrollyOnScroll);
        node._scrollyOnScroll = null;
      }
      if (node._scrollyDragCleanup) {
        node._scrollyDragCleanup();
        node._scrollyDragCleanup = null;
      }
      if (node._scrollyVisualCleanup) {
        node._scrollyVisualCleanup();
        node._scrollyVisualCleanup = null;
      }
      let parent = node.parentElement;
      // only the bar of this node: a node may hold other scrolled nodes with their own bar
      let container = node._scrollyContainer || parent.querySelector(':scope > .scrolly-container');
      if (container) {
        parent.removeChild(container);
      }
      node._scrollyContainer = null;
      node._scrollyBar = null;
    };

    const createScrolly = function (node) {
      let selector = node.getAttribute(Scrolly.options.selector);
      if (!selector) {
        node.setAttribute(Scrolly.options.selector, 'true');
      }
      let parent = node.parentElement;
      if (!hasOverflow(node, parent)) {
        return;
      }

      if (node.classList.contains('scrolly')) {
        return;
      }

      let parentZIndex = window.getComputedStyle(parent).getPropertyValue('z-index');
      let parentZIndexNumber = parseInt(parentZIndex);
      let parentInfo = getParentContentHeight(parent);
      let nodeInfo = getNodeOuterSpace(node);

      node.classList.add('scrolly');
      node.classList.add('scrolly-' + Scrolly.options.direction);
      if (!Scrolly.options.preserveNodeMaxHeight) {
        node.style.maxHeight = (parentInfo.height - (nodeInfo.paddings + nodeInfo.margins)) + 'px';
      }

      let container = document.createElement('div');
      container.classList.add('scrolly-container');
      container.style.backgroundColor = Scrolly.options.containerColor;
      container.style.position = Scrolly.options.position;
      container.style.zIndex = !isNaN(parentZIndexNumber) ? parentZIndexNumber + 1 : '1001';
      container.style.borderRadius = Scrolly.options.radius + Scrolly.options.unit;
      if (Scrolly.options.visibilityMode === 'always') {
        container.classList.add('scrolly-visible');
      }

      let bar = document.createElement('div');
      bar.classList.add('scrolly-bar');
      bar.style.backgroundColor = Scrolly.options.barColor;
      bar.style.position = 'absolute';
      bar.style.borderRadius = Scrolly.options.radius + Scrolly.options.unit;
      if (Scrolly.options.direction === 'horizontal') {
        let parentPaddingLeft = parseInt(window.getComputedStyle(parent).getPropertyValue('padding-left')) || 0;
        let trackHeight = Scrolly.options.width + Scrolly.options.unit;
        let trackWidth = node.clientWidth;
        let contentWidth = getContentWidth(node);
        let barWidth = parseInt((trackWidth * trackWidth) / contentWidth) + 1;
        container.style.height = trackHeight;
        container.style.width = trackWidth + 'px';
        container.style.left = (node.offsetLeft + parentPaddingLeft) + 'px';
        container.style.bottom = Scrolly.options.offset + Scrolly.options.unit;
        container.style.transform = 'scaleX(' + (Scrolly.options.scaleX || 1) + ')';
        bar.style.height = '100%';
        bar.style.width = barWidth + 'px';
        bar.style.left = '0px';
        bar.style.top = '0px';
      } else {
        let useNodeTrack = Scrolly.options.verticalTrackMode === 'node';
        let containerHeight = useNodeTrack ? parseInt(node.clientHeight) : parentInfo.height;
        let nodeHeight = getContentHeight(node);
        let barHeight = parseInt((containerHeight * containerHeight) / nodeHeight) + 1; // +1 to cover the empty space at the bottom when we have non-integer values less than 0.5, rounded by parseInt()
        container.style.width = Scrolly.options.width + Scrolly.options.unit;
        container.style.top = useNodeTrack ? (parseInt(node.offsetTop) + 'px') : (parentInfo.paddingTop + 'px');
        let side = Scrolly.options.side;
        container.style[side] = Scrolly.options.offset + Scrolly.options.unit;
        container.style.height = containerHeight + 'px';
        container.style.transform = 'scaleY(' + Scrolly.options.scaleY + ')';
        bar.style.width = '100%';
        bar.style.top = 0;
        bar.style.right = 0;
        bar.style.height = barHeight + 'px';
      }

      container.appendChild(bar);
      parent.appendChild(container);
      node._scrollyContainer = container;
      node._scrollyBar = bar;

      bindScrollHandler(node);
      bindDragHandler(node);
      bindVisualStateHandler(node);
      syncBarPosition(node);
    }

    const updateNode = function (node) {
      // removing max-height for a moment brings the scroll to the top, keep the position
      let previousScrollTop = node.scrollTop;
      let previousScrollLeft = node.scrollLeft;
      if (!Scrolly.options.preserveNodeMaxHeight) {
        node.style.maxHeight = '';
      }
      let parent = node.parentElement;
      if (!hasOverflow(node, parent)) {
        destroy(node);
        return;
      }

      if (!node.classList.contains('scrolly')) {
        createScrolly(node);
      } else {
        node.setAttribute(Scrolly.options.selector, 'true');
        let parentInfo = getParentContentHeight(parent);
        let nodeInfo = getNodeOuterSpace(node);

        if (!Scrolly.options.preserveNodeMaxHeight) {
          node.style.maxHeight = (parentInfo.height - (nodeInfo.paddings + nodeInfo.margins)) + 'px';
        }

        // only the bar of this node, not the one of a scrolled node inside it
        let container = node._scrollyContainer || parent.querySelector(':scope > .scrolly-container');
        let bar = node._scrollyBar || container.querySelector('.scrolly-bar');
        if (Scrolly.options.direction === 'horizontal') {
          let parentPaddingLeft = parseInt(window.getComputedStyle(parent).getPropertyValue('padding-left')) || 0;
          let trackWidth = node.clientWidth;
          let contentWidth = getContentWidth(node);
          let barWidth = parseInt((trackWidth * trackWidth) / contentWidth) + 1;
          container.style.height = Scrolly.options.width + Scrolly.options.unit;
          container.style.width = trackWidth + 'px';
          container.style.left = (node.offsetLeft + parentPaddingLeft) + 'px';
          container.style.bottom = Scrolly.options.offset + Scrolly.options.unit;
          bar.style.width = barWidth + 'px';
          bar.style.height = '100%';
          bar.style.top = '0px';
        } else {
          let useNodeTrack = Scrolly.options.verticalTrackMode === 'node';
          let containerHeight = useNodeTrack ? parseInt(node.clientHeight) : parentInfo.height;
          container.style.top = useNodeTrack ? (parseInt(node.offsetTop) + 'px') : (parentInfo.paddingTop + 'px');
          container.style.height = containerHeight + 'px';
          let nodeHeight = getContentHeight(node);
          let barHeight = parseInt((containerHeight * containerHeight) / nodeHeight) + 1 // +1 to cover the empty space at the bottom when we have non-integer values less than 0.5, rounded by parseInt()
          bar.style.height = barHeight + 'px';
        }

        // back to the previous position, the browser clamps it to the new size
        node.scrollTop = previousScrollTop;
        node.scrollLeft = previousScrollLeft;

        bindScrollHandler(node);
        bindDragHandler(node);
        bindVisualStateHandler(node);
        syncBarPosition(node);
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
        unit: 'rem', // px or rem
        direction: 'vertical', // 'vertical' (backward compatible) | 'horizontal'
        contentHeightMode: 'client', // 'client' (backward compatible) | 'scroll'
        verticalTrackMode: 'parent', // 'parent' (backward compatible) | 'node'
        preserveNodeMaxHeight: false,
        overflowCheckMode: 'parent', // 'parent' (backward compatible) | 'self'
        visibilityMode: 'hover', // 'hover' (backward compatible) | 'always'
        scaleX: 1,
        draggable: false,
        hoverBarColor: null,
        activeBarColor: null
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
