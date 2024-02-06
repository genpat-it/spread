gtiz_optimizer = {};

gtiz_optimizer.link_distance_options = {
  loopCount: 10000,
  svgCircleRadius: 400,
  performanceThresholds: {
    high: 30,
    medium: 70
  },
  scaleFactors: {
    high: 0.7,
    medium: 0.4,
    low: 0.2
  }
};

gtiz_optimizer.benchmarkSVGPerformance = function(options) {
  const svgNS = "http://www.w3.org/2000/svg";
  let svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "400");
  svg.setAttribute("height", "400");
  svg.style.position = "absolute"; // Position off-screen
  svg.style.left = "-9999px"; // Move it out of the viewport

  // Add multiple elements to the SVG
  for (let i = 0; i < options.elementCount; i++) {
    let circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", Math.random() * 400);
    circle.setAttribute("cy", Math.random() * 400);
    circle.setAttribute("r", Math.random() * 40);
    circle.setAttribute("fill", `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`);
    svg.appendChild(circle);
  }

  // Perform manipulations and check performance
  let startTime = performance.now();
  let timeTaken = 0;

  for (let i = 0; i < options.loopCount; i++) {
    svg.childNodes.forEach((node, index) => {
      node.setAttribute("r", 20 + Math.sin(startTime + index) * 10);
    });

    timeTaken = performance.now() - startTime;

    // Check if performance exceeds threshold
    if (timeTaken > options.performanceThresholds.medium) {
      break; // Exit early if threshold exceeded
    }
  }

  // Determine performance score
  if (timeTaken < options.performanceThresholds.high) {
    return 'high';
  } else if (timeTaken < options.performanceThresholds.medium) {
    return 'medium';
  } else {
    return 'low';
  }
}

gtiz_optimizer.benchmarkCPUPerformance = function(options) {
  let startTime = performance.now();
  let timeTaken;

  // Loop for benchmarking with periodic checks
  for (let i = 0; i < options.loopCount; i++) {
    Math.sqrt(i); // Sample operation for benchmarking

    // Check elapsed time at intervals
    if (i % 100000 === 0) { // Check every 100000 iterations, adjust as needed
      timeTaken = performance.now() - startTime;
      if (timeTaken > options.performanceThresholds.medium) {
        break; // Exit loop if timeTaken exceeds the medium threshold
      }
    }
  }

  // Determine performance score
  timeTaken = timeTaken || performance.now() - startTime; // Update timeTaken if not set
  if (timeTaken < options.performanceThresholds.high) {
    return 'high';
  } else if (timeTaken < options.performanceThresholds.medium) {
    return 'medium';
  } else {
    return 'low';
  }
}

gtiz_optimizer.scaleLinkDistance = function(maxDistance, performanceScore, options) {
  switch (performanceScore) {
    case 'high':
      return maxDistance * options.scaleFactors.high;
    case 'medium':
      return maxDistance * options.scaleFactors.medium;
    default:
      return maxDistance * options.scaleFactors.low;
  }
}

gtiz_optimizer.getScaleFactor = function (custom) {
  let default_options = gtiz_optimizer.link_distance_options;
  // Merge user options with default options
  let options = { ...default_options, ...custom };
  return options.scaleFactors[gtiz_optimizer.benchmarkSVGPerformance(opt)];
}

gtiz_optimizer.getBestLinkDistance = function (max_link_distance, custom = {}) {
  // Merge user options with default options
  let default_options = gtiz_optimizer.link_distance_options;
  let options = { ...default_options, ...custom };
  let performanceScore = gtiz_optimizer.benchmarkSVGPerformance(options);
  return gtiz_optimizer.scaleLinkDistance(max_link_distance, performanceScore, options);
}