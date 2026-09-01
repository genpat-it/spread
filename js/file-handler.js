let gtiz_file_handler = {};
gtiz_file_handler.tsv_metadata = undefined;
gtiz_file_handler.expected_params = ['tree', 'metadata', 'geo', 'zooms_list', 'zooms', 'zooms_prefix', 'latitude', 'longitude', 'lang'];
gtiz_file_handler.files_to_load = [];
gtiz_file_handler.save_options = [
	{
		type : 'abutton',
		id : 'file-handler-save-json',
		label : gtiz_locales.current.save_as_complete_json + ' (.json)',
		icon : 'tabler-file',
		function : () => {
			gtiz_file_handler.saveGrapeTreeAsJson();
		}
	}, {
		type : 'abutton',
		id : 'file-handler-export-nwk',
		label : gtiz_locales.current.export_newick + ' (.nwk)',
		icon : 'tabler-file-text',
		function : () => {
			let text = gtiz_tree.tree.getTreeAsNewick();
    	let timestamp =  Date.now();
    	let name = "grapetree" + timestamp + ".nwk";
    	let feedback = document.querySelector('.modal-feedback');
			if (text) {
				gtiz_file_handler.saveTextAsFile(text, name);
				feedback.innerHTML = '';
				feedback.classList.remove('show');
			} else {
				feedback.innerHTML = '<p>' + gtiz_locales.current.save_feedback_newick + '</p>';
				feedback.classList.add('show');
			}
		}
	}, {
		type : 'abutton',
		id : 'file-handler-export-metadata',
		label : gtiz_locales.current.export_metadata + ' (.tsv)',
		icon : 'tabler-file-text',
		function : () => {
      let feedback = document.querySelector('.modal-feedback');
      if (gtiz_metadata.initialized) {
        let type = 'tsv';
        gtiz_metadata.exportTable(type);
        feedback.innerHTML = '';
				feedback.classList.remove('show');
      } else {
        feedback.innerHTML = '<p>' + gtiz_locales.current.save_feedback_metadata + '</p>';
				feedback.classList.add('show');
      }
		}
	}, {
		type : 'abutton',
		id : 'file-handler-export-geojson',
		label : gtiz_locales.current.export_geoJson + ' (.geoJson)',
		icon : 'tabler-map-pin',
		function : () => {
			let text = gtiz_map.geojson;
    	let timestamp =  Date.now();
    	let name = "geoJson" + timestamp + ".geojson";
			let feedback = document.querySelector('.modal-feedback');
			if (text) {
				gtiz_file_handler.saveTextAsFile(text, name);
				feedback.innerHTML = '';
				feedback.classList.remove('show');
			} else {
				feedback.innerHTML = '<p>' + gtiz_locales.current.save_feedback_geojson + '</p>';
				feedback.classList.add('show');
			}
		}
	}
];
gtiz_file_handler.load_options = [
	{
		type : 'file',
		id : 'm-upload-file',
		label : gtiz_locales.current.select_a_file,
		icon : 'tabler-file',
		listener : (value) => {
			gtiz_file_handler.modalSetFilesToLoad(value);
		},
		accept : '.json, .nwk, .tsv',
		function : () => {
			gtiz_file_handler.modalLoadSelectedFiles();
		}
	}
];

gtiz_file_handler.drop_areas = document.querySelectorAll('.drop-area');

/**
 * Get base path from tree path
 * 
 * @returns string of base path
 * 
 */
gtiz_file_handler.getBasePath = function() {
	let tree_path = gtiz_file_handler.params.tree;
  let last_index = tree_path.lastIndexOf('/');
	let base_path = tree_path.substring(0, last_index);
	return base_path;
}

/**
 * Get file extention from string
 * 
 * @param {String} filename File name string
 * @returns string of file extension in lowercase
 * 
 */
gtiz_file_handler.getFileExtension = function(filename) {
  const dot_index = filename.lastIndexOf('.');
  if (dot_index === -1) {
    // No extension found
    return '';
  }
  return filename.substring(dot_index + 1).toLowerCase();
}

/**
 * Control if a string is a Json
 * 
 * @param {String} str 
 * @returns true/false
 * 
 */
gtiz_file_handler.isValidJSON = function(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
}

gtiz_file_handler.commaAlert = function() {
	let title = '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.please_note;
	let contents = [];
	let content = document.createElement('p');
	content.innerHTML = gtiz_locales.current.lon_lat_comma_alert;
	contents.push(content);
	let feedback = '<p>' + gtiz_locales.current.lon_lat_comma_alert_feedback + '</p>';
	let f_type = 'info';
	gtiz_modal.buildNotifier(title, contents, feedback, f_type);
}

gtiz_file_handler.addLatLonToMetadata = function (metadata, countries, column) {
	// Normalize countries keys to lowercase with underscores
	let normalizedCountries = {};
	for (let key in countries) {
		if (countries.hasOwnProperty(key)) {
			normalizedCountries[key.toLowerCase().replace(/\s+/g, '_')] = countries[key];
		}
	}

	for (let key in metadata) {
		if (metadata.hasOwnProperty(key)) {
			let entry = metadata[key];
			let countryName = entry[column] ? entry[column].toLowerCase().replace(/\s+/g, '_') : null;
			if (normalizedCountries.hasOwnProperty(countryName)) {
				entry.latitude = normalizedCountries[countryName].latitude;
				entry.longitude = normalizedCountries[countryName].longitude;
			} else {
				console.log(`Country '${entry[column]}' not found in countries object`);
			}
		}
	}
}

/**
 * 
 * Meta2GeoJSON
 * 
 * Transform Meta Object in geoJSON points
 * 
 */

gtiz_file_handler.Meta2GeoJSON = {
	newGeoJson: function () {
		return {
			"features": [],
			"name": "geopoints",
			"type": "FeatureCollection",
			"id_dashboard": "grapetree-gis"
		};
	},
	newPoint: function (h) {
		return {
			"geometry": {
				"coordinates": [
					h.x,
					h.y
				],
				"type": "Point"
			},
			"type": "Feature",
			"properties": {
				"codice": h.id
			}
		};
	},

	addNewPoint: function (geoJson, h) { // id,x,y
		if (h == undefined || h.id == undefined || h.id.length == 0) {
			return;
		}
	
		// Ensure h.x and h.y are strings before using includes and replace
		if (h.x !== undefined && h.x !== null) {
			h.x = h.x.toString();
			if (h.x.includes(',')) {
				h.x = h.x.replace(',', '.');
				if (!this.lonCommaAlert) {
					this.lonCommaAlert = true;
				}
			}
		}
	
		if (h.y !== undefined && h.y !== null) {
			h.y = h.y.toString();
			if (h.y.includes(',')) {
				h.y = h.y.replace(',', '.');
				if (!this.latCommaAlert) {
					this.latCommaAlert = true;
				}
			}
		}
	
		h.x = Number.parseFloat(h.x);
		h.y = Number.parseFloat(h.y);
		if (Number.isNaN(h.x) || Number.isNaN(h.y)) {
			console.log('Meta2GeoJSON.addNewPoint: lat lon not a number. lon:' + h.x + ' lat:' + h.y);
			return;
		}
	
		geoJson.features.push(this.newPoint(h));
	},

	checkMeta4geo: function (htitles) { // htitles = hash Of Metadata Titles (CSV titles)
		if (!htitles) {
			console.log("(GEO) WARNING: fallback field NOT found in metadata: '" + x + "' as " + x);
			return '';
		}
		function chk(x, params, htitles) {
			if (x in params && params[x] in htitles) {
				console.log("(GEO) found metadata field '" + params[x] + "' as " + x);
				return params[x];
			}
			if (x in htitles) {
				console.log("(GEO) fallback: found metadata field '" + x + "' as " + x);
				return x;
			}
			if (x in params && !(params[x] in htitles)) {
				console.log("(GEO) WARNING: field NOT found in metadata: '" + params[x] + "' as " + x);
			}
			if (!(x in params) && !(x in htitles)) {
				console.log("(GEO) WARNING: fallback field NOT found in metadata: '" + x + "' as " + x);
			}
			return '';
		}

		let params = gtiz_file_handler.params;
		this.xName = chk("longitude", params, htitles);
		this.yName = chk("latitude", params, htitles);
		if (this.xName == '' || this.yName == '') {
			return false;
		}
		return true;
	},

	meta2GeoJsonLonLat: function (hashOfHash, lonName, latName) {
		let geoJson = this.newGeoJson();
		for (var id in hashOfHash) {
			var h = hashOfHash[id]; // r = record
			this.addNewPoint(geoJson, {
				id: id,
				x: h[lonName],
				y: h[latName]
			});
		}
		return geoJson;
	},

	meta2GeoJson: function (hashOfHash) {
		return this.meta2GeoJsonLonLat(hashOfHash, this.xName, this.yName);
	}
}

/**
 * Get contents from file to load
 * 
 * @param {String} url Path where to get contents
 * @returns Content of the fetched file
 * 
 */
gtiz_file_handler.getData = async function (url) {
	const usingProxy = typeof window['SPREAD'] !== 'undefined' && typeof window['SPREAD'].withProxy !== 'undefined';

 	try {
		const requestUrl = usingProxy ? `${window['SPREAD'].withProxy}/download/?url=${url}` : url;
		
		const response = await fetch(requestUrl, {
		method: "GET",
		headers: {
			"X-Requested-With": "XMLHttpRequest"
		}
    });

    if (response.ok) {
      const text = await response.text(); // Await here to get the text content
      let obj = {
        text: text, // Include the text content in the object
        error: false,
				status: response.status
      };
      return obj;
    } else {
			let text = gtiz_locales.current.fetch_error + " Status: " + response.status + ". Url: " + "<span class=\"notifier-response-url\">" + url + "</span>";
      let obj = {
        text: text,
        error: true,
				status: response.status
      };
      return obj;
    }
  } catch (error) {
    // Handle other errors, such as network issues
    console.error("Error:", error);
    let obj = {
      text: "An error occurred: " + error.message,
      error: true
    };
    return obj;
  }
}

/**
 * 
 * Rest call utility
 * 
 * @param {String} method "GET" || "POST"
 * @param {String} path url to rest service
 * @returns Return a promise with the call response as an object
 * 
 */
gtiz_file_handler.restCallUtil = function (method, path) {
  return new Promise(function(resolve, reject) {
      let xhr = new XMLHttpRequest();
      xhr.addEventListener("readystatechange", function () {
          if (this.readyState === 4) {
              let status = this.status;
              let obj = this.responseText;
              if (status >= 200 && status < 300) { // success
                  resolve(obj);
              } else { // failure
                  reject(obj);
              }
          }
      });
      xhr.open(method, path);
      xhr.setRequestHeader("Accept", "application/json");
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send();
  });
}

/**
 * Show drag and drop area if net files are not present or there is an error on tree generation files.
 * 
 */
gtiz_file_handler.initTreeDropArea = function() {
	let tree_node = document.querySelector('.tree-container');
	tree_node.classList.remove('tree-loading');
	gtiz_loader.removeLoader(tree_node);
	let body = document.querySelector('body');
	body.classList.add('tree-not-defined');
}

/**
 * Get params passed by url
 * 
 * @param {*} hashBased inherited form original file handler, not used
 * @returns 
 */
gtiz_file_handler.getJsonFromUrl = function(hashBased) {
	let params = {};
  let url = window.location.href ;
  let query_string = url.substring(url.indexOf('?') + 1);
  if (query_string) {
    function extractKnownParameters(url, paramList) {
      const result = {};
      let currentPos = 0;
      
      // Find the first occurrence of ? or & to start parsing
      const startPos = url.indexOf('?');
      if (startPos === -1) return result;
      
      currentPos = startPos + 1;
      
      while (currentPos < url.length) {
        // Find the next parameter from our list
        const nextParam = paramList.find(param => 
          url.substring(currentPos).startsWith(param + '=')
        );
        
        if (!nextParam) {
          // If no known parameter is found, move to next position
          currentPos++;
          continue;
        }
        
        // Move position past parameter name and equals sign
        currentPos += nextParam.length + 1;
        
        // Find the start of the next known parameter or end of string
        let nextParamPos = url.length;
        for (const param of paramList) {
          const pos = url.indexOf('&' + param + '=', currentPos);
          if (pos !== -1 && pos < nextParamPos) {
            nextParamPos = pos;
          }
        }
        
        // Extract the value
        const value = url.substring(currentPos, nextParamPos);
        result[nextParam] = value;
        
        // Move position to start of next parameter
        currentPos = nextParamPos + 1;
      }
      
      return result;
    }

    let expected_params = gtiz_file_handler.expected_params;
    let param_pairs = extractKnownParameters(url, expected_params);

    Object.entries(param_pairs).forEach(([key, value]) => {
		  let decoded_key = decodeURIComponent(key);
		  let decoded_value = decodeURIComponent(value || '');
      if (params.hasOwnProperty(decoded_key)) {
        // Handle duplicate keys by creating arrays
        if (Array.isArray(params[decoded_key])) {
          params[decoded_key].push(decoded_value);
        } else {
          params[decoded_key] = [params[decoded_key], decoded_value];
        }
      } else {
        params[decoded_key] = decoded_value;
      }
	  });
  }
  return params;
};

/**
 * Parse metadata
 * 
 * @param {String} msg Message
 * @param {Array} lines Array of object containing the key-value pairs lines of the tsv file
 * @param {String} header_index Column headers
 * 
 */
gtiz_file_handler.parseMetadata = function(msg, lines, header_index) {
	if (msg === 'Malformed' || msg === 'ApplyError') {
		let error = lines;
		let error_name = error && error.name ? error.name : 'Error';
		let error_message = error && error.message ? error.message : String(error);
		let feedback = '<p>' + error_name + ': ' + error_message + '</p>';
		let f_type = msg === 'Malformed' ? 'warning' : 'info';
		let message_key = msg === 'Malformed' ? 'malformed_metadata_file_msg' : 'metadata_application_error_msg';
		console.log(gtiz_locales.current[message_key]);
		let title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops;
		let contents = [];
		let content = document.createElement('p');
		content.innerHTML = gtiz_locales.current[message_key];
		contents.push(content);
		gtiz_modal.buildNotifier(title, contents, feedback, f_type);
		gtiz_layout.body.classList.remove('tree-not-defined');
		return;
	}
	
	// reset metadata
	gtiz_tree.tree.metadata = {};
  gtiz_tree.tree.metadata_info = {};
  gtiz_tree.tree.metadata_map = {};

	let meta = {};
	let id_name = '';
	let tree = gtiz_tree.tree;
	let category = tree.display_category ? tree.display_category : 'nothing';
	let options = {};
	if (header_index) {
		if (header_index.find(function(d) {return d == "ID"})) {
			id_name = 'ID';
		} else {
			id_name = header_index[0];
		}
		gtiz_file_handler.samples_column = id_name;
		if (category == 'nothing') {
			category = header_index.length > 1 ? header_index[1] : header_index[0];
		}
		for (let i in header_index) {
			let header = header_index[i];
			options[header] = header;
		}
	} else {
		console.log(gtiz_locales.current.header_index_warning);
		let title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops;
		let contents = [];
		let content = document.createElement('p');
		content.innerHTML = gtiz_locales.current.metadata_file_generic_problem;
		contents.push(content);
		let feedback = '<p>' + gtiz_locales.current.header_index_warning + '</p>';
		let f_type = 'warning';
		gtiz_modal.buildNotifier(title, contents, feedback, f_type);
	}
	if (lines && typeof lines == 'object') {
		lines.forEach((line) => {
			if (line && !(Object.keys(line).length === 1 && line[Object.keys(line)[0]] === "")) {
				meta[line[id_name]] = line;
			}
		});
	}

	gtiz_tree.tree.addMetadataOptions(options);	
	
	if (gtiz_utils.medatadata_select_nodes && gtiz_utils.medatadata_select_nodes.length > 0) {
		gtiz_utils.medatadata_select_nodes.forEach((node) => {
			let select = document.querySelector(node);
			if (select) {
				select.value = category;
				if (select.id == 'tree-node-label-text') {
					let value = gtiz_tree.node_label ? gtiz_tree.node_label : category;
					select.value = value;
				}
			}
		});
	}

	gtiz_tree.tree.addMetadata(meta);
	
	// to be changed in this way for parameters &x=title_name_longitute&y=title_name_latitudine
	if (gtiz_file_handler.Meta2GeoJSON.checkMeta4geo(options) ) { //options = hash of metadata titles
		let geoJ = gtiz_file_handler.Meta2GeoJSON.meta2GeoJson(meta);
		gtiz_map.setMetaGeoJSON(geoJ);
		if (gtiz_file_handler.Meta2GeoJSON.latCommaAlert || gtiz_file_handler.Meta2GeoJSON.lonCommaAlert) {
			gtiz_file_handler.commaAlert();
		}
	} else {
		let message = '(GEO)INFO: titles not found in metadata:' + gtiz_file_handler.Meta2GeoJSON.xName +', '+ gtiz_file_handler.Meta2GeoJSON.yName;
		console.log(message);
		// check if countries are defined
		if (gtiz_app.cfg.countries) {
			let column = gtiz_app.cfg.countries.column ? gtiz_app.cfg.countries.column : 'sampling country';
			let path = gtiz_app.cfg.countries.path ? gtiz_app.cfg.countries.path : 'datasets/countries/countries.json';
			// leave a message of what is happening
			let message = '(GEO)INFO: looking for countries in ' + column +' metadata column';
			console.log(message);
			// check if the countries column is present in the metadata
			if (gtiz_tree.tree.metadata_info[column]) {
				// get json from path
				gtiz_file_handler.getData(path).then((obj) => {
					if (obj.error) {
						console.log(obj.error);
						let message = '(GEO)WARNING: JSON not found at provided path: ' + path;
						console.log(message);
					} else {
						let countries = JSON.parse(obj.text);
						gtiz_file_handler.addLatLonToMetadata(meta, countries, column);
						let longitude = gtiz_app.cfg.countries.longitude ? gtiz_app.cfg.countries.longitude : 'longitude';
						let latitude = gtiz_app.cfg.countries.latitude ? gtiz_app.cfg.countries.latitude : 'latitude';
						let geoJ = gtiz_file_handler.Meta2GeoJSON.meta2GeoJsonLonLat(meta, longitude, latitude);
						gtiz_map.setMetaGeoJSON(geoJ);
						if (gtiz_file_handler.Meta2GeoJSON.latCommaAlert || gtiz_file_handler.Meta2GeoJSON.lonCommaAlert) {
							gtiz_file_handler.commaAlert();
						}
					}
				}).catch((err) => {
					console.log(err);
					let message = '(GEO)WARNING: problems on retreiving countries JSON on: ' + path;
					console.log(message);
				});
			} else {
				let message = '(GEO)WARNING: ' + column + ' column not defined in metadata. Please check the metadata file.';
				console.log(message);
			}
		} else {
			let message = '(GEO)INFO: countries column not provided';
			console.log(message);
		}
	}
	gtiz_tree.tree.changeCategory(category);
	gtiz_tree.tree.setNodeText(category);
  let components = ['tree', 'legend'];
	let action = 'remove';
	gtiz_layout.uiLoadingManager(components, action);
	// open legend component simulating legend click
	let legend_trigger = document.querySelector('[data-view="legend"]');
	if (legend_trigger) {
		let selection = legend_trigger.getAttribute('data-selection');
		if (selection == 'off') {
			legend_trigger.click();
		}
	}
	// to use original tree button we need gtiz_tree.tree_raw populated with an object containing also metadata, so we added the following line. Please find more in the README.md file under Dev notes paragraph
	gtiz_tree.tree_raw = gtiz_tree.tree.getTreeAsObject();
	gtiz_tree.saveOriginalTree(true);
	gtiz_metadata.init();
};

/**
 * Load metadata from tsv file
 * 
 * @param {String} text Content from .tsv file
 * 
 */
gtiz_file_handler.loadMetadataText = function(text) {
	let return_data = [];
	try {
		let lines = text.split(/\r\n|\r|\n/g);
		if (!lines.length || !lines[0] || !lines[0].trim()) {
			throw new Error('Metadata TSV is empty or missing a header row.');
		}
		let delimiter = (lines[0].indexOf(",") >= 0 ? "," : "\t");
		let header = lines[0].split(delimiter);
		lines.forEach((line, index) => {
			if (index > 0 && !line.trim()) {
				return;
			}
			let map = {};
			let arr = line.split(delimiter);
			if (arr.length !== header.length) {
				throw new Error('Metadata TSV row ' + (index + 1) + ' has ' + arr.length + ' columns, expected ' + header.length + '.');
			}
			for (var col in arr){
				map[header[col]] = arr[col];
			}
			return_data.push(map);
		});
		gtiz_file_handler.tsv_metadata = text;
		try {
			gtiz_file_handler.parseMetadata("OK", return_data, header);
		} catch (error) {
			console.error(error);
			gtiz_file_handler.parseMetadata("ApplyError", error);
		}
	} catch(error){
		console.error(error);
		gtiz_file_handler.parseMetadata("Malformed", error);
	}
};

/**
 * Load file
 * 
 */
gtiz_file_handler.loadNetFiles = function() {
	let params = gtiz_file_handler.getJsonFromUrl();
	// make params available globally
	gtiz_file_handler.params = params;
	let tree = null;
  let metadata = null;
	let geo = null;
	let zooms = null;
	for (let key in params) {
    if (params.hasOwnProperty(key)) {
      params[key] = params[key]
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('drive.google.com/open?', 'drive.google.com/uc?')
        .replace('/blob/', '/')
        .replace('github.com', 'raw.githubusercontent.com');
      if (key === 'tree') {
        tree = params[key];
      } else if (key === 'metadata') {
        metadata = params[key];
      } else if (key === 'geo') {
				geo = params[key];
			} else if (key === 'zooms') {
				zooms = params[key];
			}
    }
  }
	if (tree) {
		gtiz_file_handler.getData(tree).then((obj) => {
			if (obj.error) {
				gtiz_file_handler.initTreeDropArea();
				let title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops;
				let html = gtiz_locales.current.missing_net_tree_alert;
				if (obj.status) {
					if (obj.status == 403) {
						title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops_forbidden_http;
						let protocol = window.location.protocol;
						let hostname = window.location.host;
						let url = protocol + '//' + hostname;
						html = gtiz_locales.current.forbidden_net_tree_alert.replace('{0}', url).replace('{1}', url);
					}
					if (obj.status == 404) {
						title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops_not_found_http;
						html = gtiz_locales.current.not_found_net_tree_alert;
					}
				}
				let contents = [];
				let content = document.createElement('p');
				content.innerHTML = html;
				contents.push(content);
				let feedback = '<p>' + obj.text + '</p>';
				let f_type = 'info';
				gtiz_modal.buildNotifier(title, contents, feedback, f_type);
			} else {
				let is_valid = gtiz_file_handler.isValidJSON(obj.text);
				if (is_valid) {
					gtiz_file_handler.tree_data = JSON.parse(obj.text);
					data = gtiz_file_handler.tree_data;
				} else {
					data = {};
					if (obj.text.substring(0,6) === "#NEXUS"){
						data['nexus'] = obj.text;
					} else {
						data['nwk'] = obj.text;
					}
					let layout_select = document.querySelector("#layout-select");
					data['layout_algorithm'] = layout_select ? layout_select.value : '';
				}
				// gtiz_tree.tree_raw = data;
				// gtiz_tree.loadMSTree(tree_raw);
				// to use original tree button we need gtiz_tree.tree_raw populated with an object containing also metadata please find more in the README.md file under Dev notes paragraph
				gtiz_tree.loadMSTree(data);
				if (gtiz_tree.tree) {
					if (metadata) {
						gtiz_file_handler.getData(metadata).then((obj) => {
							if (obj.error) {
								let title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops;
								let html = gtiz_locales.current.missing_net_tsv_alert;
								if (obj.status) {
									if (obj.status == 403) {
										title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops_forbidden_http;
										let protocol = window.location.protocol;
										let hostname = window.location.host;
										let url = protocol + '//' + hostname;
										html = gtiz_locales.current.forbidden_net_metadata_alert.replace('{0}', url).replace('{1}', url);
									}
									if (obj.status == 404) {
										title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops_not_found_http;
										html = gtiz_locales.current.not_found_net_metadata_alert;
									}
								}
								let contents = [];
								let content = document.createElement('p');
								content.innerHTML = html;
								contents.push(content);
								let feedback = '<p>' + obj.text + '</p>';
								let f_type = 'info';
								gtiz_modal.buildNotifier(title, contents, feedback, f_type);
								let components = ['tree', 'legend'];
								let action = 'remove';
								gtiz_layout.uiLoadingManager(components, action);
								if (gtiz_utils.isObjectNotEmpty(gtiz_utils.postMessage)) {
									let settings_obj = JSON.parse(gtiz_utils.postMessage.settings.tree_backup);
									let apply = gtiz_utils.postMessage.settings.apply;
									gtiz_tree.applySettings(settings_obj, apply, false);
								}
								gtiz_map.init();
							} else {
								gtiz_file_handler.loadMetadataText(obj.text);
								gtiz_zooms.init();
								if (gtiz_utils.isObjectNotEmpty(gtiz_utils.postMessage)) {
									let settings_obj = JSON.parse(gtiz_utils.postMessage.settings.tree_backup);
									let apply = gtiz_utils.postMessage.settings.apply;
									gtiz_tree.applySettings(settings_obj, apply, true);
								}
								gtiz_map.init();
							}
						}).catch((err) => {
							console.log(err);
							let title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops;
							let contents = [];
							let content = document.createElement('p');
							content.innerHTML = gtiz_locales.current.metadata_file_generic_problem;
							contents.push(content);
							let feedback = '<p>' + err + '</p>';
							let f_type = 'info';
							gtiz_modal.buildNotifier(title, contents, feedback, f_type);
							let components = ['tree', 'legend'];
							let action = 'remove';
							gtiz_layout.uiLoadingManager(components, action);
							if (gtiz_utils.isObjectNotEmpty(gtiz_utils.postMessage)) {
								let settings_obj = JSON.parse(gtiz_utils.postMessage.settings.tree_backup);
								let apply = gtiz_utils.postMessage.settings.apply;
								gtiz_tree.applySettings(settings_obj, apply, false);
							}
							gtiz_map.init();
						});
					} else {
						let components = ['tree', 'legend'];
						let action = 'remove';
						gtiz_layout.uiLoadingManager(components, action);
						if (gtiz_utils.isObjectNotEmpty(gtiz_utils.postMessage)) {
							let settings_obj = JSON.parse(gtiz_utils.postMessage.settings.tree_backup);
							let apply = gtiz_utils.postMessage.settings.apply;
							gtiz_tree.applySettings(settings_obj, apply, false);
						}
						gtiz_map.init();
					}
				}
			}
		}).catch((err) => {
			console.log(err);
			gtiz_file_handler.initTreeDropArea();
			let title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops;
			let contents = [];
			let content = document.createElement('p');
			content.innerHTML = gtiz_locales.current.missing_net_tree_alert;
			contents.push(content);
			let feedback = '<p>' + err + '</p>';
			let f_type = 'info';
			gtiz_modal.buildNotifier(title, contents, feedback, f_type);
		});
	} else {
		gtiz_file_handler.initTreeDropArea();
		console.log('Tree not defined in url');
	}
}

gtiz_file_handler.dropFiles = function(div) {
	div.addEventListener("dragover", (event) => {
		event.preventDefault();
		event.stopPropagation();
	});
	div.addEventListener("dragenter", (event) => {
		event.preventDefault();
		event.stopPropagation();
	});
	div.addEventListener("drop", (event) => {
		event.stopPropagation();
    event.preventDefault();
    let files = event.dataTransfer.files;
		if (files.length === 1) {
			gtiz_file_handler.filesDropped(files);
		} else {
			let title = gtiz_locales.current.oops;
			let contents = [];
			let body = document.createElement('div');
			body.innerHTML = gtiz_locales.current.dropped_files_alert;
			contents.push(body);
			gtiz_modal.buildModal(title, contents);
		}
	});
}

gtiz_file_handler.loadFailed = function(msg) {
	// open modal to show loadFailed message
	console.log(gtiz_locales.current.load_failed + ': '+ msg);
	let title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops;
	let contents = [];
	let content = document.createElement('p');
	content.innerHTML = gtiz_locales.current.load_failed;
	contents.push(content);
	let feedback = '<p>' + msg + '</p>';
	let f_type = 'info';
	gtiz_modal.buildNotifier(title, contents, feedback, f_type);
}

/**
 * Load tree from uploaded file contents
 * 
 * @param {Object} tree Object containing tree data coming from files upload
 * @param {Boolean} json if true data is to be considered as a complete json tree
 * 
 */
gtiz_file_handler.loadTreeText = function(tree, json) {
	gtiz_tree.initiateLoading("Processing tree file");

	let metadata_select;
	let node_label_text;
	let metadata_map_select;
	let legend_select;
	
	if (gtiz_utils.medatadata_select_nodes && gtiz_utils.medatadata_select_nodes.length > 0) {
		gtiz_utils.medatadata_select_nodes.forEach((node) => {
			let select = document.querySelector(node);
			if (select) {
				select.innerHTML = '';
				if (select.id == 'tree-metadata-select') {
					metadata_select = select;
				}
				if (select.id == 'tree-node-label-text') {
					node_label_text = select;
				}
				if (select.id == 'metadata-map-select') {
					metadata_map_select = select;
				}
				if (select.id == 'legend-title-menu-color-by') {
					legend_select = select;
				}
			}
		});
	}

	// give time to dialog to display
	setTimeout(function(){
		try {
			data = JSON.parse(tree);
		} catch (e) {
			data = {};
			let layout_select = document.querySelector("#layout-select");
			if (tree.toUpperCase().startsWith('#NEXUS')) {
				data['nexus'] = tree;
				data['layout_algorithm'] = layout_select ? layout_select.value : '';
			}
			else{
				data['nwk']=tree;
				data['layout_algorithm'] = layout_select ? layout_select.value : '';
			}
		}
		gtiz_tree.tree_raw = data;
		gtiz_tree.loadMSTree(gtiz_tree.tree_raw);
		// we need to (re)set the category list for select box
		let metadata_options = data.metadata_options;
		if (metadata_options) {
			for (let i in metadata_options) {
				let cat = metadata_options[i].label;
				if (cat != "No Category") {
					if (metadata_select) {
						let option = document.createElement('option');
						option.setAttribute('value', cat);
						option.innerHTML = cat;
						metadata_select.append(option);
					}
					if (node_label_text) {
						let option = document.createElement('option');
						option.setAttribute('value', cat);
						option.innerHTML = cat;
						node_label_text.append(option);
					}	
					if (metadata_map_select) {
						let option = document.createElement('option');
						option.setAttribute('value', cat);
						option.innerHTML = cat;
						metadata_map_select.append(option);
					}
					if (legend_select) {
						let option = document.createElement('option');
						option.setAttribute('value', cat);
						option.innerHTML = cat;
						legend_select.append(option);
					}
				}
			}
			let l_action = 'remove';
			let l_components = ['tree', 'legend'];
			gtiz_layout.uiLoadingManager(l_components, l_action);
		} else {
			let l_action = 'remove';
			let l_components = ['tree', 'legend'];
			gtiz_layout.uiLoadingManager(l_components, l_action);
		}
		let category = data.initial_category;
		if (category) {
			if (metadata_select) {
				metadata_select.value = category;
			}
			if (node_label_text) {
				let value = gtiz_tree.node_label ? gtiz_tree.node_label : category;
				node_label_text.value = value;
			}
		}
		if (gtiz_tree.tree) {
			if (gtiz_tree.tree.metadata) {
				gtiz_zooms.init();
			}
			gtiz_map.init();
		}
	},500);
};

gtiz_file_handler.distributeFile = function(text, filename) {
	let extension = gtiz_file_handler.getFileExtension(filename);
	gtiz_tree.current_metadata_file = null;
	if (gtiz_map.initialized) {
    gtiz_map.resetMap();
  }
	if (extension === 'json') {
		let l_action = 'add';
		let l_components = ['tree', 'map', 'legend'];
		gtiz_layout.uiLoadingManager(l_components, l_action);
		let json = true;
		gtiz_file_handler.loadTreeText(text, json);
		let header_tag = document.querySelector('#headertag');
		header_tag.classList.add('show');
		header_tag.innerHTML = filename;
	}
	if (extension === 'nwk') {
		let l_action = 'add';
		let l_components = ['tree'];
		gtiz_layout.uiLoadingManager(l_components, l_action);
		gtiz_file_handler.loadTreeText(text);
		let header_tag = document.querySelector('#headertag');
		header_tag.classList.add('show');
		header_tag.innerHTML = filename;
	}
	if (extension === 'tsv') {
		if (gtiz_tree.tree) {
			let l_action = 'add';
			let l_components = ['tree', 'map', 'legend'];
			gtiz_layout.uiLoadingManager(l_components, l_action);
			gtiz_tree.current_metadata_file = text;
			gtiz_file_handler.loadMetadataText(text);
			gtiz_map.init();
		} else {
			let title = gtiz_locales.current.oops;
			let contents = [];
			let body = document.createElement('div');
			body.innerHTML = gtiz_locales.current.missing_tree_alert;
			contents.push(body);
			gtiz_modal.buildModal(title, contents);
			console.log(gtiz_locales.current.missing_tree_alert);
		}
	}
	if (extension == 'geojson') {
		if (gtiz_tree.tree) {
			let map_trigger = document.querySelector('[data-view="map"]');
			if (map_trigger) {
				let selection = map_trigger.getAttribute('data-selection');
				if (selection == 'off') {
					map_trigger.click();
				}
			}
			let l_action = 'add';
			let l_components = ['map'];
			gtiz_layout.uiLoadingManager(l_components, l_action);
			let geoJ = JSON.parse(text);
			gtiz_map.setGeoJSON(geoJ);
			gtiz_map.init();
		} else {
			let title = gtiz_locales.current.oops;
			let contents = [];
			let body = document.createElement('div');
			body.innerHTML = gtiz_locales.current.missing_tree_alert;
			contents.push(body);
			gtiz_modal.buildModal(title, contents);
			console.log(gtiz_locales.current.missing_tree_alert);
		}
	}
}

/**
 * Manage dropped files (from input or from drag)
 * 
 * @param {Array} files Array of files to load
 * 
 */
gtiz_file_handler.filesDropped = function(files) {
	Array.from(files).forEach(file => {
		let reader = new FileReader();
		reader.onload = (evt) => {
			let result = evt.target.result;
			let name = evt.target.filename;
			gtiz_file_handler.distributeFile(result, name);
		};
		reader.filename = file.name;
		reader.readAsText(file);
	});
}

gtiz_file_handler.saveSvgAsPng = function(svgText, width, filename) {
  // Create a temporary canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // Parse the SVG text and extract its dimensions
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;

  const originalWidth = parseFloat(svgElement.getAttribute('width'));
  const originalHeight = parseFloat(svgElement.getAttribute('height'));

  // Calculate the height to maintain the aspect ratio
  const height = (width / originalWidth) * originalHeight;

  // Set canvas dimensions
  canvas.width = width;
  canvas.height = height;

  // Create an image element to render the SVG
  const img = new Image();
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    // Draw the SVG onto the canvas
    context.drawImage(img, 0, 0, width, height);

    // Convert the canvas to a PNG blob and trigger the download
    canvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');

    // Clean up the object URL
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

/**
 * Canvas migration: build a <style> block that embeds the theme font (the CSS
 * `--font-family`) as base64 @font-face rules, so it can be injected into an SVG
 * before rasterising. An SVG rasterised from a blob: URL is rendered in an
 * isolated document and does NOT inherit the page's @font-face fonts, so without
 * this the legend/scale text would silently fall back to a generic sans-serif
 * instead of the CSS font. Theme-agnostic: it scans the loaded stylesheets for
 * the @font-face rules matching the active family. The result is cached.
 *
 * @returns {Promise<string>} the CSS text for a <style> block (may be empty)
 */
gtiz_file_handler._embeddedFontCss = null;
gtiz_file_handler.getEmbeddedFontCss = function() {
  if (gtiz_file_handler._embeddedFontCss !== null) {
    return Promise.resolve(gtiz_file_handler._embeddedFontCss);
  }
  let cssVars = gtiz_utils.getAllCssVariables();
  let famDecl = (cssVars && cssVars['--font-family']) || '';
  let primary = famDecl.split(',')[0].replace(/['"]/g, '').trim();
  if (!primary) {
    gtiz_file_handler._embeddedFontCss = '';
    return Promise.resolve('');
  }
  // Collect the upright (non-italic) @font-face rules for the active family,
  // keeping their weight — the legend uses normal text plus a bold title.
  let faces = [];
  for (let sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; }
    if (!rules) { continue; }
    for (let rule of rules) {
      if (rule.type !== CSSRule.FONT_FACE_RULE) { continue; }
      let fam = (rule.style.getPropertyValue('font-family') || '').replace(/['"]/g, '').trim();
      if (fam.toLowerCase() !== primary.toLowerCase()) { continue; }
      let fStyle = (rule.style.getPropertyValue('font-style') || 'normal').trim();
      if (fStyle.indexOf('italic') !== -1) { continue; }
      let weight = (rule.style.getPropertyValue('font-weight') || '400').trim();
      // The legend/scale text only use the normal (400) and bold (700) weights;
      // skip the others so the embedded font payload stays small.
      let wl = weight.toLowerCase();
      if (weight !== '400' && weight !== '700' && wl !== 'normal' && wl !== 'bold') { continue; }
      let src = rule.style.getPropertyValue('src') || '';
      let m = src.match(/url\(\s*['"]?([^'")]+\.woff2)['"]?\s*\)/i) ||
              src.match(/url\(\s*['"]?([^'")]+\.woff)['"]?\s*\)/i);
      if (!m) { continue; }
      let href = rule.parentStyleSheet ? rule.parentStyleSheet.href : window.location.href;
      let absUrl;
      try { absUrl = new URL(m[1], href).href; } catch (e) { absUrl = m[1]; }
      let format = /\.woff2$/i.test(m[1]) ? 'woff2' : 'woff';
      faces.push({ family: primary, weight: weight, url: absUrl, format: format });
    }
  }
  return Promise.all(faces.map(function(f) {
    return fetch(f.url).then(function(r) { return r.blob(); }).then(function(blob) {
      return new Promise(function(res) {
        let fr = new FileReader();
        fr.onload = function() {
          res('@font-face{font-family:"' + f.family + '";font-weight:' + f.weight +
              ';font-style:normal;src:url(' + fr.result + ') format("' + f.format + '");}');
        };
        fr.onerror = function() { res(''); };
        fr.readAsDataURL(blob);
      });
    }).catch(function() { return ''; });
  })).then(function(parts) {
    gtiz_file_handler._embeddedFontCss = parts.filter(Boolean).join('');
    return gtiz_file_handler._embeddedFontCss;
  });
};

/**
 * Canvas migration: rasterise an SVG element (legend, scale bar) into an Image.
 * Returns a promise resolving to {img, w, h} (native SVG size in px), or null on
 * error so the export can still complete without that piece.
 *
 * @param {SVGElement} svgEl The SVG element to rasterise (or null)
 * @returns {Promise<{img: HTMLImageElement, w: number, h: number}|null>}
 */
gtiz_file_handler.rasteriseSvg = function(svgEl) {
  return new Promise(function(resolve) {
    if (!svgEl) {
      resolve(null);
      return;
    }
    try {
      let w = parseFloat(svgEl.getAttribute('width')) || svgEl.getBoundingClientRect().width;
      let h = parseFloat(svgEl.getAttribute('height')) || svgEl.getBoundingClientRect().height;
      // The legend SVG is capped at 240px wide on screen and its height attribute
      // can be shorter than the real content (so labels overflow horizontally and
      // the lower items get clipped vertically in the export). For the raster we
      // size the SVG to its real content extent (getBBox) on both axes so the
      // whole legend is captured, then restore the original attributes so the
      // on-screen legend panel is left untouched.
      let originalWidthAttr = svgEl.getAttribute('width');
      let originalHeightAttr = svgEl.getAttribute('height');
      try {
        let bb = svgEl.getBBox();
        let contentW = Math.ceil(bb.x + bb.width + 8);
        let contentH = Math.ceil(bb.y + bb.height + 8);
        if (contentW > w) {
          w = contentW;
          svgEl.setAttribute('width', w);
        }
        if (contentH > h) {
          h = contentH;
          svgEl.setAttribute('height', h);
        }
      } catch (e) { /* getBBox unavailable (e.g. detached node) — keep attr sizes */ }
      let svgText = new XMLSerializer().serializeToString(svgEl);
      if (originalWidthAttr !== null) {
        svgEl.setAttribute('width', originalWidthAttr);
      }
      if (originalHeightAttr !== null) {
        svgEl.setAttribute('height', originalHeightAttr);
      }
      if (svgText.indexOf('xmlns') === -1) {
        svgText = svgText.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      // Embed the theme font so the rasterised text matches the CSS font instead
      // of falling back to a generic sans-serif (blob-loaded SVGs ignore the
      // page's @font-face). Then build the image from the serialised SVG.
      gtiz_file_handler.getEmbeddedFontCss().then(function(fontCss) {
        if (fontCss) {
          svgText = svgText.replace(/(<svg[^>]*>)/, function(open) {
            return open + '<style>' + fontCss + '</style>';
          });
        }
        let img = new Image();
        let url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
        img.onload = function() {
          URL.revokeObjectURL(url);
          resolve({ img: img, w: w, h: h });
        };
        img.onerror = function() {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    } catch (err) {
      resolve(null);
    }
  });
}

/**
 * Canvas migration: compose the export PNG with the tree viewport on the LEFT and
 * the legend in a panel on the RIGHT. The legend is placed beside the tree (not
 * overlaid), so it is always fully included regardless of the current zoom/pan
 * (overlaying it made the legend depend on zoom and could clip it). The scale
 * bar, when present, stays composited on top of the tree exactly where it shows
 * on screen. The download happens asynchronously once the SVG overlays load.
 *
 * @param {HTMLCanvasElement} treeCanvas The rendered tree (already at export scale)
 * @param {Object|null} scaleOverlay {svg, x, y, s} for the scale bar, or null
 * @param {SVGElement|null} legendSvg The legend SVG to place on the side, or null
 * @param {number} s Export scale factor (output px per on-screen px)
 * @param {String} filename Download file name
 */
gtiz_file_handler.saveTreeWithLegend = function(treeCanvas, scaleOverlay, legendSvg, s, filename) {
  // Horizontal gap between the tree and the legend panel.
  let gap = Math.round(20 * s);
  Promise.all([
    gtiz_file_handler.rasteriseSvg(scaleOverlay ? scaleOverlay.svg : null),
    gtiz_file_handler.rasteriseSvg(legendSvg)
  ]).then(function(results) {
    let scaleImg = results[0];
    let legendImg = results[1];
    let legendW = legendImg ? legendImg.w * s : 0;
    let legendH = legendImg ? legendImg.h * s : 0;

    let out = document.createElement('canvas');
    out.width = treeCanvas.width + (legendImg ? gap + Math.ceil(legendW) : 0);
    out.height = Math.max(treeCanvas.height, Math.ceil(legendH));
    let ctx = out.getContext('2d');
    // White background so the legend panel matches the tree export background.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, out.width, out.height);
    // Tree viewport on the left.
    ctx.drawImage(treeCanvas, 0, 0);
    // Scale bar composited on top of the tree, at its on-screen position.
    if (scaleImg) {
      ctx.drawImage(scaleImg.img, scaleOverlay.x, scaleOverlay.y, scaleImg.w * s, scaleImg.h * s);
    }
    // Legend panel to the right of the tree.
    if (legendImg) {
      ctx.drawImage(legendImg.img, treeCanvas.width + gap, 0, legendW, legendH);
    }

    out.toBlob(function(blob) {
      let link = document.createElement('a');
      let url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  });
}

/**
 * Save a vector SVG string as a downloadable .svg file. The theme font is
 * embedded (base64 @font-face) so the legend text keeps the CSS font when the
 * file is opened outside the app. Download happens once the font is ready.
 *
 * @param {String} svgText The full <svg>…</svg> markup
 * @param {String} filename Download file name (e.g. "spread123.svg")
 */
gtiz_file_handler.saveSvg = function(svgText, filename) {
  gtiz_file_handler.getEmbeddedFontCss().then(function(fontCss) {
    if (fontCss) {
      svgText = svgText.replace(/(<svg[^>]*>)/, function(open) {
        return open + '<style>' + fontCss + '</style>';
      });
    }
    let blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

/**
 * Save text as file.
 *
 * @param {String} text Text to save as file
 * @param {String} name Suggested name for the file
 *
 */
gtiz_file_handler.saveTextAsFile = function(text, name) {
	let blob = new Blob([text], { type: 'text/plain' });
  let url = URL.createObjectURL(blob);
	let link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


gtiz_file_handler.saveGrapeTreeAsJson = function() {
	let obj = gtiz_tree.getCompleteGrapeTreeObject();
	if (obj) {
		let text = JSON.stringify(obj);
		let timestamp =  Date.now();
		let name = "spread" + timestamp + ".json";
		let feedback = document.querySelector('.modal-feedback');
		if (text) {
			gtiz_file_handler.saveTextAsFile(text, name);
			feedback.innerHTML = '';
			feedback.classList.remove('show');
		} else {
			feedback.innerHTML = '<p>' + gtiz_locales.current.save_feedback_json + '</p>';
			feedback.classList.add('show');
		}
	} else {
		console.log(gtiz_locales.current.unable_to_get_spread);
		let title = '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops;
		let contents = [];
		let content = document.createElement('p');
		content.innerHTML = gtiz_locales.current.unable_to_get_spread;
		contents.push(content);
		gtiz_modal.buildNotifier(title, contents);
	}
}

gtiz_file_handler.modalLoadSelectedFiles = function() {
	let files = gtiz_file_handler.files_to_load;
	if (files.length > 0) {
		gtiz_file_handler.filesDropped(files);
		gtiz_settings.closeModal();
		let gtiz_context_node = document.querySelector('.context-menu');
		if (gtiz_context_node) {
			gtiz_context.closeContextMenu();
		}
	} else {
		let feedback_node = document.querySelector('.modal-feedback');
    feedback_node.classList.add('show');
    feedback_node.innerHTML = '<p>' + gtiz_locales.current.select_file_msg + '</p>';
	}
}

/**
 * Set file list to load
 * 
 * @param {Array} files 
 * 
 */
gtiz_file_handler.modalSetFilesToLoad = function(files) {
	gtiz_file_handler.files_to_load = files;
};


gtiz_file_handler.init = function() {
	gtiz_file_handler.drop_areas.forEach(drop_area => {
		gtiz_file_handler.dropFiles(drop_area);
	});
	let l_action = 'add';
	let l_components = ['tree', 'map', 'legend'];
	gtiz_layout.uiLoadingManager(l_components, l_action);	
	gtiz_tree.initiateLoading("Waiting for tree...");
	gtiz_file_handler.loadNetFiles();
};
