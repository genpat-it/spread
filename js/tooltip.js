let gtiz_tooltip = {};

gtiz_tooltip.cfg = {
  position : 'tl', // tl (top-left), tr, tc, bl (bottom-left), br, bc
  offset : 10, // offset Y from the cursor, should be positive
  backgroundColor : 'rgba(0, 0, 0, 0.8)',
  padding : '0.8rem',
  borderRadius : '1.3rem',
  zIndex : 9999,
  wordBreak : 'keep-all',
  whiteSpace : 'nowrap',
  fontSize : '1.3rem',
  color : 'rgba(255, 255, 255, 0.9)',
  boxShadow : '0px 0px 34px 0px rgba(0,0,0,0.08)'
}

/**
 * Uitility to check if an element is elipsed
 * 
 */
gtiz_tooltip.isEllipsed = function(element) {
  // Check if the element has the CSS property text-overflow: ellipsis
  const style = window.getComputedStyle(element);
  const hasEllipsis = style.textOverflow === 'ellipsis';
  // Check if the content is larger than the container
  const isContentOverflowing = element.scrollWidth > element.clientWidth;
  return hasEllipsis && isContentOverflowing;
}

gtiz_tooltip.add = function(node, cfg, contents) {
  if (!node) {
    return;
  }
  let options = Object.assign({}, gtiz_tooltip.cfg, cfg);

  node.addEventListener('mouseover', function(e) {

    if (gtiz_tooltip.isEllipsed(node)) {
      let tooltip = document.createElement('div');
      tooltip.setAttribute('id', 'gtiz-tooltip');
      tooltip.style.position = 'fixed';
      tooltip.style.backgroundColor = options.backgroundColor;
      tooltip.style.padding = options.padding;
      tooltip.style.borderRadius = options.borderRadius;
      tooltip.style.zIndex = options.zIndex;
      tooltip.style.wordBreak = options.wordBreak;
      tooltip.style.whiteSpace = options.whiteSpace;
      tooltip.style.fontSize = options.fontSize;
      tooltip.style.color = options.color;
      tooltip.style.boxShadow = options.boxShadow;
      tooltip.innerHTML = contents ? contents : node.innerHTML;
      document.body.appendChild(tooltip);

      node.addEventListener('mousemove', function(e) {
        let tooltipWidth = tooltip.clientWidth;
        let tooltipHeight = tooltip.clientHeight;
        let viewportWidth = window.innerWidth;
        let viewportHeight = window.innerHeight;
        
        let offset = options.offset < 0 ? 0 : options.offset;
        let left = e.clientX;
        let top = e.clientY;
          
        switch (options.position) {
          case 'tl':
            top = top - tooltipHeight - offset;
            left = left - tooltipWidth;
            break;
          case 'tr':
            top = top - tooltipHeight - offset;
            left = left + tooltipWidth;
            break;
          case 'tc':
            top = top - tooltipHeight - offset;
            left = left - tooltipWidth / 2;
            break;
          case 'bl':
            top = top + tooltipHeight + offset;
            left = left - tooltipWidth;
            break;
          case 'br':
            top = top + tooltipHeight + offset;
            left = left + tooltipWidth;
            break;
          case 'bc':
            top = top + tooltipHeight + offset;
            left = left - tooltipWidth / 2;
            break;
        }
  
        if (left < 0) {
          left = 0;
        }
        if (left + tooltipWidth > viewportWidth) {
          left = viewportWidth - tooltipWidth;
        }
        if (top < 0) {
          top = 0;
        }
        if (top + tooltipHeight > viewportHeight) {
          top = viewportHeight - tooltipHeight;
        }
  
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
      });
    }

    node.addEventListener('mouseout', function() {
      let tooltip = document.getElementById('gtiz-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    });

  });
}