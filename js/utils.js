let gtiz_utils = {};

gtiz_utils.postMessage = undefined;

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

window.addEventListener('message', (event) => {
  let url = new URL(window.location.href);
  let pathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
  let domain = url.origin + pathname;

  if (event.origin === domain) {
    gtiz_utils.postMessage = event.data;
  }
});