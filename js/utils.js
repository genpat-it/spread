let gtiz_utils = {};

gtiz_utils.postMessage = undefined;
gtiz_utils.medatadata_select_nodes = ['#tree-metadata-select', '#tree-node-label-text', '#legend-menu-color-by', '#metadata-menu-color-by', '#metadata-map-select', '#legend-title-menu-color-by'];
gtiz_utils.css_vars = {};


/**
 * Highlight keyword in text
 * 
 * @param {String} text text where find keyword to highlight
 * @param {String} keyword keyword to highlight
 */
gtiz_utils.highlightKeyword = function(text, keyword) {
  // Create a regex to match the whole word containing the keyword
  const wordRegex = new RegExp(`\\b\\w*${keyword}\\w*\\b`, 'gi');
  
  // Replace the whole word with a span
  return text.replace(wordRegex, (match) => {
    // Create a regex to match the keyword within the word
    const keywordRegex = new RegExp(`(${keyword})`, 'gi');
    
    // Replace the keyword with a span
    const highlightedKeyword = match.replace(keywordRegex, '<span class="highlight-keyword">$&</span>');
    
    // Wrap the whole word in a span
    return `<span class="highlight-word">${highlightedKeyword}</span>`;
  });
};

/**
 * Uitility to check if an object exist and it is not empty
 * 
 */
gtiz_utils.isObjectNotEmpty = function(obj) {
  // Check if the object exists and is not null or undefined
  // Then check if the object has any own properties
  return obj != null && typeof obj === 'object' && Object.keys(obj).length > 0;
}

/**
 * Measure an element's inner content size (width/height in px), working even
 * when the element — or one of its ancestors — is hidden via `display:none`.
 *
 * This mirrors the behaviour of the former jQuery `.width()` / `.height()`
 * getters, which temporarily force a layout to measure hidden elements. It is
 * needed because `#graph-div` is `display:none` while the tree is loading
 * (`.tree-loading` state), so reading `clientWidth`/`clientHeight` directly
 * would return `0` and propagate `NaN` into the layout math.
 *
 * @param {Element} el The element to measure
 * @returns {{width: number, height: number}} Inner size in pixels
 */
gtiz_utils.measureSize = function(el) {
  if (el.offsetWidth > 0 || el.offsetHeight > 0) {
    return { width: el.clientWidth, height: el.clientHeight };
  }
  // Element is not rendered (e.g. display:none): briefly force a measurable
  // layout, read the size, then restore the original inline styles.
  let style = el.style;
  let prev = { position: style.position, visibility: style.visibility, display: style.display };
  style.position = 'absolute';
  style.visibility = 'hidden';
  style.display = 'block';
  let size = { width: el.clientWidth, height: el.clientHeight };
  style.position = prev.position;
  style.visibility = prev.visibility;
  style.display = prev.display;
  return size;
}

/**
 * Normalize any valid CSS color string to a `#rrggbb` hex value, as required
 * by `<input type="color">`. Falls back to black when the color can not be
 * resolved.
 *
 * @param {String} color A CSS color (hex, rgb, named, ...)
 * @returns {String} The color as a lowercase `#rrggbb` string
 */
gtiz_utils.toHexColor = function(color) {
  if (!color) return '#000000';
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();
  let ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillStyle = color;
  let resolved = ctx.fillStyle;
  return /^#[0-9a-fA-F]{6}$/.test(resolved) ? resolved : '#000000';
}

/**
 * Utility to extract numbers for string and generate array
 * 
 * @param {String} input
 * @returns 
 */
gtiz_utils.extractNumbersFromString = function(input) {
  // Use a regular expression to find all sequences of digits
  const matches = input.match(/\d+/g);
  // Convert the matched strings to numbers
  const numbers = matches ? matches.map(Number) : [];
  return numbers;
}

/**
 * Utility to extract comma separated numbers and ranges separated by `-`
 * 
 * @param {String} input 
 * @returns 
 */
gtiz_utils.extractNumbersAndRanges = function(input) {
  // Split the input string by commas
  const parts = input.split(',');
  
  // Use a Set to ensure uniqueness
  const numberSet = new Set(parts.flatMap(part => {
    if (part.includes('-')) {
      // If the part is a range, split it by the hyphen to get start and end
      const [start, end] = part.split('-').map(Number);
      // Generate an array for the range and add each number to the Set
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    } else {
      // If the part is a single number, convert it to Number and return
      return Number(part);
    }
  }));

  // Convert the Set back to an array
  return Array.from(numberSet);
}

/**
 * Set the copy right year.
 * 
 */
gtiz_utils.setCopyRightYear = function() {
  let footer = document.querySelector('footer');
  if (footer) {
    let copyright = footer.querySelector('.copyright-year');
    if (copyright) {
      let year = new Date().getFullYear();
      copyright.innerHTML = year;
    }
  }
}

/**
 * Get all css variables of the document as an object
 */
gtiz_utils.getAllCssVariables = function() {
  if (gtiz_utils.isObjectNotEmpty(gtiz_utils.css_vars)) {
    return gtiz_utils.css_vars;
  }
  // Iterate through all stylesheets
  for (let stylesheet of document.styleSheets) {
    try {
      // Iterate through all rules within each stylesheet
      for (let rule of stylesheet.cssRules) {
        // Check if the rule is a CSSStyleRule and its selector is :root
        if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
          // Iterate through all CSS variables in the rule
          for (let property of rule.style) {
            if (property.startsWith('--')) {
              // Get the value of the CSS variable
              let value = rule.style.getPropertyValue(property).trim();
              // Store the variable and its value
              gtiz_utils.css_vars[property] = value;
            }
          }
        }
      }
    } catch (e) {
      // Catch and log any errors (e.g., CORS issues)
      console.error("Error accessing stylesheet: ", e);
    }
  }
  return gtiz_utils.css_vars;
};

window.addEventListener('message', (event) => {
  let url = new URL(window.location.href);
  let pathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
  let domain = url.origin + pathname;

  if (event.origin === domain) {
    gtiz_utils.postMessage = event.data;
  }
});

window.addEventListener('DOMContentLoaded', (event) => {
  gtiz_utils.setCopyRightYear();
});