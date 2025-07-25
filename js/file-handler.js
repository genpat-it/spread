let gtiz_file_handler = {};
gtiz_file_handler.tsv_metadata = undefined;
gtiz_file_handler.expected_params = ['tree', 'metadata', 'geo', 'zooms_list', 'zooms', 'zooms_prefix', 'latitude', 'longitude', 'lang'];
gtiz_file_handler.files_to_load = [];
gtiz_file_handler.save_options = [
	{
		type : 'abutton',
		id : 'file-handler-save-json',
		label : gtiz_locales.current.save_as_complete_json + ' (.json)',
		icon : 'iconic-file',
		function : () => {
			gtiz_file_handler.saveGrapeTreeAsJson();
		}
	}, {
		type : 'abutton',
		id : 'file-handler-export-nwk',
		label : gtiz_locales.current.export_newick + ' (.nwk)',
		icon : 'iconic-file-text',
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
		icon : 'iconic-file-text',
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
		icon : 'iconic-pin',
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
		icon : 'iconic-file',
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
	let title = '<i class="iconic iconic-information"></i> ' + gtiz_locales.current.please_note;
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
};

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
	if( msg === 'Error') {
		console.log(gtiz_locales.current.malformed_metadata_file_msg);
		let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
		let contents = [];
		let content = document.createElement('p');
		content.innerHTML = gtiz_locales.current.malformed_metadata_file_msg;
		contents.push(content);
		gtiz_modal.buildNotifier(title, contents);
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
		let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
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
		let delimiter = (lines[0].indexOf(",") >= 0 ? "," : "\t");
		let header = lines[0].split(delimiter);
		lines.forEach(line => {
			let map = {};
			let arr = line.split(delimiter);
			for (var col in arr){
				map[header[col]] = arr[col];
			}
			return_data.push(map);
		});
		gtiz_file_handler.tsv_metadata = text;
		gtiz_file_handler.parseMetadata("OK", return_data, header);
	} catch(error){
		gtiz_file_handler.parseMetadata("Error", error.message);
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
				let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
				let html = gtiz_locales.current.missing_net_tree_alert;
				if (obj.status) {
					if (obj.status == 403) {
						title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops_forbidden_http;
						let protocol = window.location.protocol;
						let hostname = window.location.host;
						let url = protocol + '//' + hostname;
						html = gtiz_locales.current.forbidden_net_tree_alert.replace('{0}', url).replace('{1}', url);
					}
					if (obj.status == 404) {
						title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops_not_found_http;
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
								let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
								let html = gtiz_locales.current.missing_net_tsv_alert;
								if (obj.status) {
									if (obj.status == 403) {
										title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops_forbidden_http;
										let protocol = window.location.protocol;
										let hostname = window.location.host;
										let url = protocol + '//' + hostname;
										html = gtiz_locales.current.forbidden_net_metadata_alert.replace('{0}', url).replace('{1}', url);
									}
									if (obj.status == 404) {
										title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops_not_found_http;
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
								gtiz_tree.checkBestLinkDistanceUtil();
								if (gtiz_utils.isObjectNotEmpty(gtiz_utils.postMessage)) {
									let settings_obj = JSON.parse(gtiz_utils.postMessage.settings.tree_backup);
									let apply = gtiz_utils.postMessage.settings.apply;
									gtiz_tree.applySettings(settings_obj, apply, false);
								}
								gtiz_map.init();
							} else {
								gtiz_file_handler.loadMetadataText(obj.text);
								gtiz_zooms.init();
								gtiz_tree.checkBestLinkDistanceUtil();
								if (gtiz_utils.isObjectNotEmpty(gtiz_utils.postMessage)) {
									let settings_obj = JSON.parse(gtiz_utils.postMessage.settings.tree_backup);
									let apply = gtiz_utils.postMessage.settings.apply;
									gtiz_tree.applySettings(settings_obj, apply, true);
								}
								gtiz_map.init();
							}
						}).catch((err) => {
							console.log(err);
							let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
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
							gtiz_tree.checkBestLinkDistanceUtil();
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
						gtiz_tree.checkBestLinkDistanceUtil();
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
			let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
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
	let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
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
			gtiz_tree.checkBestLinkDistanceUtil();
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
		let title = '<i class="iconic iconic-warning-triangle"></i> ' + gtiz_locales.current.oops;
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