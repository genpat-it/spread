let gtiz_file_handler = {};
gtiz_file_handler.tsv_metadata = undefined;
/*
*
* Canonical key/header name pairs of the technical metadata columns resolved
* against the metadata in memory. It is empty when no localized file is in use.
*
*/
gtiz_file_handler.technical_columns = {};
/*
*
* Canonical value/translated value pairs of the identifier values held by the
* technical columns, e.g. `{ category : { 'sample of interest' : 'campione di interesse' } }`.
* Resolved against the metadata in memory, empty when nothing is translated.
*
*/
gtiz_file_handler.technical_values = {};
/*
*
* Column mapping declared by the dataset itself, read from the `filename_[lang].json`
* file placed beside the localized metadata: `{ columns : { latitude : 'Latitudine' },
* values : { category : { 'sample of interest' : 'campione di interesse' } } }`.
* It has precedence over the `app.json` defaults. Undefined when the file is not there.
*
*/
gtiz_file_handler.metadata_mapping = undefined;
/*
*
* Path of the metadata file the metadata in memory come from, kept for
* provenance and exported inside the complete json. Stored without query string,
* since the metadata can be served with a token appended and the path is exported.
*
*/
gtiz_file_handler.metadata_source = undefined;
/*
*
* True when the metadata in memory come from a localized file. It tells a
* translated dataset apart from a default one, which look the same once loaded.
*
*/
gtiz_file_handler.metadata_localized = false;
/*
*
* SPREAD package (zip or folder) the current tree was loaded from, `undefined`
* when the tree comes from url parameters or from single files. It holds
* `{ name, files }`, where `files` maps each relative path to an object exposing
* `text()`: files are read only when requested, e.g. when a zoom is opened.
*
*/
gtiz_file_handler.package = undefined;
/*
*
* Virtual base path of the files held by the active package: paths starting
* with it are served by `gtiz_file_handler.getData` from the package itself.
*
*/
gtiz_file_handler.package_base_path = 'package:';
/*
*
* True when the `tree` url parameter is a SPREAD session json holding zoom
* settings: its zooms keep the prefix, category and sample of interest saved in
* the json, not the ones guessed from the file name. Like the url parameters, it
* holds for the whole life of the page.
*
*/
gtiz_file_handler.url_session = false;
gtiz_file_handler.expected_params = ['tree', 'metadata', 'geo', 'zooms_list', 'zooms', 'zooms_prefix', 'latitude', 'longitude', 'lang'];
/*
*
* File set selected in the load modal, see `gtiz_file_handler.buildFileSet`
*
*/
gtiz_file_handler.files_to_load = undefined;
/*
*
* Options of the save modal, in two groups introduced by a `label` item:
* complete saves, holding the whole state of SPREAD, and the current data as
* separate files. `visible` hides an option when its data are not available.
*
*/
gtiz_file_handler.save_options = [
	{
		type : 'label',
		label : () => gtiz_locales.current.save_group_complete
	}, {
		type : 'abutton',
		id : 'file-handler-save-json',
		label : gtiz_locales.current.save_as_complete_json + ' (.json)',
		icon : 'tabler-braces',
		function : () => {
			gtiz_file_handler.saveGrapeTreeAsJson();
		}
	}, {
		type : 'abutton',
		id : 'file-handler-save-package-with-zooms',
		label : gtiz_locales.current.save_as_complete_package_with_zooms + ' (.zip)',
		icon : 'tabler-file-zip',
		// only on the full tree and when zooms are available
		visible : () => {
			return gtiz_utils.isObjectNotEmpty(gtiz_zooms.zooms) && Object.keys(gtiz_tree.full_tree_backup).length == 0;
		},
		function : () => {
			gtiz_file_handler.savePackageWithZooms();
		}
	}, {
		type : 'label',
		label : () => gtiz_locales.current.save_group_export
	}, {
		type : 'abutton',
		id : 'file-handler-export-nwk',
		label : gtiz_locales.current.export_newick + ' (.nwk)',
		icon : 'tabler-binary-tree',
		function : () => {
			let text = gtiz_tree.tree.getTreeAsNewick();
    	let timestamp =  Date.now();
    	let name = "spread_tree" + timestamp + ".nwk";
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
		icon : 'tabler-table',
		// only when the current tree has metadata: `gtiz_metadata.initialized` alone stays
		// true after loading a tree without metadata, with the grid of the previous dataset
		visible : () => {
			let info = gtiz_tree.tree && gtiz_tree.tree.metadata_info ? Object.keys(gtiz_tree.tree.metadata_info) : [];
			return gtiz_metadata.initialized && info.some(column => column !== 'nothing' && column !== 'ID');
		},
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
		// same table as the .tsv export, as an Excel workbook
		type : 'abutton',
		id : 'file-handler-export-metadata-xlsx',
		label : gtiz_locales.current.export_metadata + ' (.xlsx)',
		icon : 'tabler-table',
		visible : () => {
			let info = gtiz_tree.tree && gtiz_tree.tree.metadata_info ? Object.keys(gtiz_tree.tree.metadata_info) : [];
			return gtiz_metadata.initialized && info.some(column => column !== 'nothing' && column !== 'ID');
		},
		function : () => {
			let feedback = document.querySelector('.modal-feedback');
			if (gtiz_metadata.initialized) {
				gtiz_metadata.exportTable('xlsx');
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
		label : gtiz_locales.current.export_geoJson + ' (.geojson)',
		icon : 'tabler-map-pin',
		// only when geographic data are available
		visible : () => {
			return !!gtiz_map.geojson && gtiz_map.geojson !== '';
		},
		function : () => {
			let text = gtiz_map.geojson;
    	let timestamp =  Date.now();
    	let name = "spread_geo" + timestamp + ".geojson";
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
	}, {
		// notes of the session (js/notes.js), only when there are some
		type : 'label',
		label : () => gtiz_locales.current.notes,
		visible : () => {
			return gtiz_notes.notes.length > 0;
		}
	}, {
		type : 'abutton',
		id : 'file-handler-export-notes-md',
		label : gtiz_locales.current.notes_export_md,
		icon : 'tabler-markdown',
		visible : () => {
			return gtiz_notes.notes.length > 0;
		},
		function : () => {
			gtiz_file_handler.exportNotes(gtiz_notes.exportMarkdown);
		}
	}, {
		type : 'abutton',
		id : 'file-handler-export-notes-docx',
		label : gtiz_locales.current.notes_export_docx,
		icon : 'tabler-file-word',
		visible : () => {
			return gtiz_notes.notes.length > 0;
		},
		function : () => {
			gtiz_file_handler.exportNotes(gtiz_notes.exportDocx);
		}
	}
];

/**
 * Run an export of the notes from the save modal: a failure is said in the
 * feedback of the modal, as the other exports
 *
 * @param {Function} action Export of `gtiz_notes`, returning a promise
 * @returns {undefined}
 */
gtiz_file_handler.exportNotes = function(action) {
	let feedback = document.querySelector('.modal-feedback');
	feedback.innerHTML = '';
	feedback.classList.remove('show');
	action().catch((error) => {
		console.error(error);
		feedback.innerHTML = '<p>' + gtiz_locales.current.notes_export_error + '</p>';
		feedback.classList.add('show');
	});
}
gtiz_file_handler.load_options = [
	{
		type : 'file',
		id : 'm-upload-file',
		label : gtiz_locales.current.select_a_file,
		icon : 'tabler-file',
		// receives a file set, see `gtiz_file_handler.buildFileSet`
		listener : (value) => {
			gtiz_file_handler.modalSetFilesToLoad(value);
		},
		accept : '.json, .nwk, .tsv, .xlsx, .geojson, .zip',
		multiple : true,
		function : () => {
			gtiz_file_handler.modalLoadSelectedFiles();
		}
	}
];

gtiz_file_handler.drop_areas = document.querySelectorAll('.drop-area');

/**
 * Get base path from tree path
 *
 * When a SPREAD package is active its virtual base path wins over the url, so
 * zooms are read from the package even on a page opened with url parameters.
 *
 * @returns string of base path
 *
 */
gtiz_file_handler.getBasePath = function() {
	if (gtiz_file_handler.package) {
		return gtiz_file_handler.package_base_path;
	}
	let tree_path = gtiz_file_handler.params.tree;
  let last_index = tree_path.lastIndexOf('/');
	let base_path = tree_path.substring(0, last_index);
	return base_path;
}

/**
 * Remove query string and fragment from a path
 * 
 * Metadata can be served with a token appended, which must not leak into what we
 * store for provenance, show in notifiers or export inside the complete json.
 * 
 * @param {String} path Path possibly holding a query string or a fragment
 * @returns string of the bare path
 * 
 */
gtiz_file_handler.stripQueryString = function(path) {
	if (!path || typeof path !== 'string') {
		return path;
	}
	let separator_index = path.search(/[?#]/);
	return separator_index === -1 ? path : path.substring(0, separator_index);
}

/**
 * Replace the extension of a path, keeping any query string or fragment aside
 * 
 * @param {String} path Path of the file
 * @param {String} extension New extension, without dot
 * @returns string of the path with the new extension
 * 
 */
gtiz_file_handler.replaceExtension = function(path, extension) {
	if (!path || !extension) {
		return path;
	}
	let separator_index = path.search(/[?#]/);
	let base = separator_index === -1 ? path : path.substring(0, separator_index);
	let suffix = separator_index === -1 ? '' : path.substring(separator_index);
	let slash_index = base.lastIndexOf('/');
	let name = base.substring(slash_index + 1);
	let dot_index = name.lastIndexOf('.');
	let new_name = (dot_index === -1 ? name : name.substring(0, dot_index)) + '.' + extension;
	return base.substring(0, slash_index + 1) + new_name + suffix;
}

/**
 * Build the path of a localized metadata file by adding the language suffix
 * before the file extension, e.g. `metadata.tsv` -> `metadata_it.tsv`
 * 
 * @param {String} path Path of the default file
 * @param {String} lang Language code
 * @returns string of the localized path
 * 
 */
gtiz_file_handler.getLocalizedPath = function(path, lang) {
	if (!path || !lang) {
		return path;
	}
	// keep any query string or fragment aside: metadata can be served with a token appended
	let separator_index = path.search(/[?#]/);
	let base = separator_index === -1 ? path : path.substring(0, separator_index);
	let suffix = separator_index === -1 ? '' : path.substring(separator_index);
	let slash_index = base.lastIndexOf('/');
	let name = base.substring(slash_index + 1);
	let dot_index = name.lastIndexOf('.');
	let localized_name = dot_index === -1 ? name + '_' + lang : name.substring(0, dot_index) + '_' + lang + name.substring(dot_index);
	return base.substring(0, slash_index + 1) + localized_name + suffix;
}

/**
 * Control if a fetched content looks like a metadata table
 * 
 * A missing file can be served as a 200 response holding an error page, above
 * all when the download proxy is in use, so a status check is not enough to
 * tell a localized file apart from a missing one.
 * 
 * @param {String} text Fetched content
 * @returns true/false
 * 
 */
gtiz_file_handler.looksLikeMetadata = function(text) {
	if (!text || typeof text !== 'string') {
		return false;
	}
	let lines = text.split(/\r\n|\r|\n/g).filter(line => line.trim() !== '');
	if (lines.length < 2) {
		return false;
	}
	let header = lines[0];
	// an html error page is markup, a table never starts with a tag
	if (header.trim().charAt(0) === '<') {
		return false;
	}
	// metadata are tab separated: a header without tabs is not a metadata table
	return header.indexOf('\t') >= 0;
}

/**
 * Get the column mapping a dataset declares beside its localized metadata
 * 
 * By convention the mapping is a json with the same name as the localized tsv,
 * e.g. `metadata_it.json` beside `metadata_it.tsv`, holding a `columns` object of
 * canonical key/header pairs and an optional `values` object of canonical
 * value/translated value pairs by column key. A missing file is a normal
 * condition, the `app.json` defaults are used; a malformed one is ignored with a
 * notice, since the dataset author expects it to be read.
 * 
 * @param {String} tsv_path Path of the localized metadata file
 * @returns Object with `columns`, `values` and `path`, `undefined` when not available
 * 
 */
gtiz_file_handler.getMetadataMapping = async function(tsv_path) {
	let mapping_path = gtiz_file_handler.replaceExtension(tsv_path, 'json');
	if (mapping_path === tsv_path) {
		return undefined;
	}
	let obj = await gtiz_file_handler.getData(mapping_path);
	let bare_path = gtiz_file_handler.stripQueryString(mapping_path);
	if (obj.error) {
		console.log("(I18N) metadata mapping file not available: '" + bare_path + "', using app.json declarations");
		return undefined;
	}
	try {
		let json = JSON.parse(obj.text);
		if (!json || typeof json !== 'object' || Array.isArray(json)) {
			throw new Error('mapping must be a json object');
		}
		let mapping = {
			columns : json.columns && typeof json.columns === 'object' ? json.columns : {},
			values : json.values && typeof json.values === 'object' ? json.values : {},
			path : bare_path
		};
		console.log("(I18N) found metadata mapping file: '" + bare_path + "'");
		return mapping;
	} catch (error) {
		console.log("(I18N) malformed metadata mapping file: '" + bare_path + "', ignored");
		console.error(error);
		let title = '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.please_note;
		let contents = [];
		let content = document.createElement('p');
		content.innerHTML = gtiz_locales.current.localized_metadata_mapping_malformed_msg;
		contents.push(content);
		let feedback = '<p>' + bare_path + '</p>';
		let f_type = 'info';
		gtiz_modal.buildNotifier(title, contents, feedback, f_type);
		return undefined;
	}
}

/**
 * Read an Excel file of metadata as tab separated text
 *
 * The text goes to the metadata loader like the contents of a .tsv file, see
 * `gtiz_xlsx.toTsv`. A file that cannot be read is reported with a localized
 * message: merged cells have their own one.
 *
 * @param {Blob} blob The .xlsx file
 * @returns {Promise<Object>} `{ text, notices, error: false }` or `{ message, error: true }`
 */
gtiz_file_handler.readMetadataXlsx = async function(blob) {
	try {
		let data = await gtiz_xlsx.toTsv(blob);
		return { text : data.text, notices : data.notices, error : false };
	} catch (error) {
		console.error(error);
		let key = error.code === 'merged' ? 'xlsx_merged_cells_msg' : 'xlsx_unreadable_msg';
		return { message : gtiz_locales.current[key], error : true };
	}
}

/**
 * Show the notes about an Excel file read without errors (other sheets,
 * formulas without a calculated value)
 *
 * @param {Array} notices Notices of `gtiz_xlsx.read`, optional
 * @returns {undefined}
 */
gtiz_file_handler.showXlsxNotices = function(notices) {
	if (!Array.isArray(notices)) {
		return;
	}
	notices.forEach((notice) => {
		let message = notice.code === 'more_sheets'
			// the sheet name is written by the user: escaped, the notice is html
			? gtiz_locales.current.xlsx_more_sheets_msg.replace('{0}', gtiz_xlsx.escape(notice.sheet))
			: gtiz_locales.current.xlsx_formulas_without_values_msg;
		gtiz_file_handler.packageNotice(message, false);
	});
}

/**
 * Load a metadata file in Excel format, dropped or chosen by the user
 *
 * The file goes on as a .tsv one (`distributeFile`), so the same rules apply:
 * the loaded file replaces the metadata and sets the order of the grid columns.
 * Old binary Excel files (.xls) are not read.
 *
 * @param {Blob} blob The Excel file
 * @param {String} path Name or path of the file
 * @returns {Promise<undefined>}
 */
gtiz_file_handler.loadMetadataXlsx = async function(blob, path) {
	if (gtiz_xlsx.isXls(path)) {
		gtiz_file_handler.packageNotice(gtiz_locales.current.xls_not_supported_msg, true);
		return;
	}
	let data = await gtiz_file_handler.readMetadataXlsx(blob);
	if (data.error) {
		gtiz_file_handler.packageNotice(data.message, true);
		return;
	}
	gtiz_file_handler.distributeFile(data.text, path, { type : 'tsv' });
	gtiz_file_handler.showXlsxNotices(data.notices);
}

/**
 * Get the contents of a metadata file as tab separated text
 *
 * Like `gtiz_file_handler.getData`, with the Excel files read as text: an
 * `.xlsx` that cannot be read and an `.xls` are reported as errors, with the
 * localized message as `text`.
 *
 * @param {String} path Path of the metadata file
 * @returns {Promise<Object>} Object with `text`, `error`, `status` and, for Excel files, `notices`
 */
gtiz_file_handler.getMetadataData = async function(path) {
	if (gtiz_xlsx.isXls(path)) {
		return { text : gtiz_locales.current.xls_not_supported_msg, error : true };
	}
	if (!gtiz_xlsx.isXlsx(path)) {
		return gtiz_file_handler.getData(path);
	}
	let obj = await gtiz_file_handler.getData(path, { binary : true });
	if (obj.error) {
		return obj;
	}
	let data = await gtiz_file_handler.readMetadataXlsx(obj.blob);
	if (data.error) {
		return { text : data.message, error : true };
	}
	return { text : data.text, error : false, status : obj.status, notices : data.notices };
}

/**
 * Get metadata contents resolving the localized variant when it is available
 * 
 * When a language is explicitly requested by url we look for a
 * `filename_[lang].tsv` file placed beside the default one. A missing variant
 * is a normal condition, so we silently fall back to the default file. Excel
 * files (`.xlsx`, also `filename_[lang].xlsx`) are read as tab separated text.
 * 
 * @param {String} path Path of the default metadata file
 * @returns Object holding the fetched contents and the path they come from
 * 
 */
gtiz_file_handler.getMetadataText = async function(path) {
	let lang = gtiz_locales.getMetadataLanguageCode();
	if (lang) {
		let localized_path = gtiz_file_handler.getLocalizedPath(path, lang);
		if (localized_path !== path) {
			let localized = await gtiz_file_handler.getMetadataData(localized_path);
			if (!localized.error && gtiz_file_handler.looksLikeMetadata(localized.text)) {
				console.log("(I18N) found localized metadata file: '" + localized_path + "'");
				localized.path = localized_path;
				localized.default_path = path;
				localized.localized = true;
				// the dataset may declare its own column names beside the variant
				localized.mapping = await gtiz_file_handler.getMetadataMapping(localized_path);
				gtiz_file_handler.showXlsxNotices(localized.notices);
				return localized;
			}
			console.log("(I18N) localized metadata file not available: '" + localized_path + "', falling back to '" + path + "'");
		}
	}
	let obj = await gtiz_file_handler.getMetadataData(path);
	obj.path = path;
	obj.default_path = path;
	obj.localized = false;
	obj.mapping = undefined;
	gtiz_file_handler.showXlsxNotices(obj.notices);
	return obj;
}

/**
 * Reload metadata from the default file after a localized one failed to parse
 * 
 * Without this fallback the user would be left with no data at all because of a
 * broken translation, so we load the default file and explain what happened.
 * 
 * @param {Object} source Informations about the localized file as returned by `gtiz_file_handler.getMetadataText`
 * @param {Object} error Error raised while parsing the localized file
 * 
 */
gtiz_file_handler.localizedMetadataFallback = function(source, error) {
	console.log("(I18N) malformed localized metadata file: '" + source.path + "', falling back to '" + source.default_path + "'");
	gtiz_file_handler.getMetadataData(source.default_path).then((obj) => {
		if (obj.error) {
			gtiz_file_handler.parseMetadata("Malformed", error);
			return;
		}
		gtiz_file_handler.loadMetadataText(obj.text, { path : source.default_path, localized : false });
		gtiz_file_handler.showXlsxNotices(obj.notices);
		let title = '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.please_note;
		let contents = [];
		let content = document.createElement('p');
		content.innerHTML = gtiz_locales.current.localized_metadata_fallback_msg;
		contents.push(content);
		let feedback = '<p>' + gtiz_file_handler.stripQueryString(source.path) + '</p>';
		let f_type = 'info';
		gtiz_modal.buildNotifier(title, contents, feedback, f_type);
	}).catch((err) => {
		console.log(err);
		gtiz_file_handler.parseMetadata("Malformed", error);
	});
}

/**
 * Warn that a zoomed tree has no localized metadata while the full tree had them
 * 
 * The settings carried over from the full tree refer to translated column names,
 * which the default file of the zoom does not have, so colours, labels and legend
 * may not be applied. The fallback is silent everywhere else, but here the user
 * would otherwise see a mismatch with no explanation.
 * 
 * @param {Object} source Informations about the loaded file as returned by `gtiz_file_handler.getMetadataText`
 * 
 */
gtiz_file_handler.localizedZoomMissingNotice = function(source) {
	console.log("(I18N) the zoomed tree has no localized metadata file, loaded '" + source.path + "' while the full tree was localized");
	let title = '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.please_note;
	let contents = [];
	let content = document.createElement('p');
	content.innerHTML = gtiz_locales.current.localized_metadata_zoom_missing_msg;
	contents.push(content);
	let feedback = '<p>' + gtiz_file_handler.stripQueryString(source.path) + '</p>';
	let f_type = 'info';
	gtiz_modal.buildNotifier(title, contents, feedback, f_type);
}

/**
 * Resolve the technical metadata columns against the loaded headers
 * 
 * Other components look these columns up by name, so when a localized metadata
 * file translates them we need to know which header stands for which canonical
 * key. Only the columns declared in `app.json` are considered translatable, and
 * a translated name is stored only when it is really present in the headers.
 * 
 * @param {Array} headers Column headers of the loaded metadata
 * @returns Object of canonical key/header name pairs
 * 
 */
gtiz_file_handler.setTechnicalColumns = function(headers) {
	let previous = gtiz_file_handler.technical_columns ? gtiz_file_handler.technical_columns : {};
	let columns = {};
	gtiz_file_handler.technical_columns = columns;
	if (!headers) {
		return columns;
	}
	let list = Array.isArray(headers) ? headers : Object.keys(headers);
	// a resolution restored from a complete json may come from a different app.json,
	// so we keep it as long as its header is still there: the re-parse after a grid
	// edit must not lose it. An actual file load resets the state in loadMetadataText()
	Object.keys(previous).forEach(key => {
		if (list.includes(previous[key])) {
			columns[key] = previous[key];
		}
	});
	let cfg = gtiz_locales.getTechnicalColumnsCfg();
	// the mapping file of the dataset may declare columns app.json does not know
	let mapping = gtiz_file_handler.metadata_mapping;
	let keys = Object.keys(cfg);
	if (mapping && mapping.columns) {
		Object.keys(mapping.columns).forEach(key => {
			if (!keys.includes(key)) {
				keys.push(key);
			}
		});
	}
	keys.forEach(key => {
		if (columns[key]) {
			return;
		}
		let name = gtiz_locales.getDeclaredTechnicalColumnName(key);
		if (name && name !== key && list.includes(name)) {
			console.log("(I18N) technical column '" + key + "' resolved as '" + name + "'");
			columns[key] = name;
		}
	});
	return columns;
}

/**
 * Resolve the translated identifier values of the technical columns
 * 
 * The samples of interest marker of the `category` column is compared by value,
 * so a localized file may translate it only when the translation is declared in
 * `app.json` under the `values` entry of the column. As for the columns, a
 * translation is stored only when really present in the loaded metadata, and a
 * resolution restored from a complete json is kept while still valid.
 * 
 * @param {Object} meta Loaded metadata, hash of rows by sample name
 * @param {Array} headers Column headers of the loaded metadata
 * @returns Object of canonical value/translated value pairs by canonical column key
 * 
 */
gtiz_file_handler.setTechnicalValues = function(meta, headers) {
	let previous = gtiz_file_handler.technical_values ? gtiz_file_handler.technical_values : {};
	let values = {};
	gtiz_file_handler.technical_values = values;
	if (!meta) {
		return values;
	}
	let cfg = gtiz_locales.getTechnicalColumnsCfg();
	let mapping = gtiz_file_handler.metadata_mapping;
	let mapped = mapping && mapping.values ? mapping.values : {};
	// canonical values declared anywhere, by column key
	let declared = {};
	Object.keys(cfg).forEach(key => {
		if (cfg[key] && cfg[key].values) {
			declared[key] = Object.keys(cfg[key].values);
		}
	});
	Object.keys(mapped).forEach(key => {
		if (mapped[key] && typeof mapped[key] === 'object') {
			declared[key] = (declared[key] ? declared[key] : []).concat(Object.keys(mapped[key]).filter(value => !(declared[key] || []).includes(value)));
		}
	});
	Object.keys(declared).forEach(key => {
		let declared_values = declared[key];
		// the column itself may be translated, so we read it through its resolved name
		let column = gtiz_locales.getTechnicalColumnName(key, headers);
		let present = new Set();
		Object.keys(meta).forEach(id => {
			let value = meta[id][column];
			if (value !== undefined && value !== '') {
				present.add(value);
			}
		});
		if (present.size === 0) {
			return;
		}
		let list = Array.from(present);
		declared_values.forEach(value => {
			let kept = previous[key] && previous[key][value] && list.includes(previous[key][value]) ? previous[key][value] : undefined;
			let name = kept ? kept : gtiz_locales.getDeclaredTechnicalValue(key, value);
			if (name && name !== value && list.includes(name)) {
				console.log("(I18N) value '" + value + "' of '" + key + "' resolved as '" + name + "'");
				if (!values[key]) {
					values[key] = {};
				}
				values[key][value] = name;
			}
		});
	});
	return values;
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
			// a localized metadata file can translate the coordinates columns: the
			// resolution tries the translated name and falls back to the canonical one
			let name = gtiz_locales.getTechnicalColumnName(x, htitles);
			if (name in htitles) {
				console.log("(GEO) " + (name === x ? "fallback" : "localized") + ": found metadata field '" + name + "' as " + x);
				return name;
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
 * Control if a path points inside the active SPREAD package
 *
 * @param {String} path Path to check
 * @returns true/false
 *
 */
gtiz_file_handler.isPackagePath = function(path) {
	return typeof path === 'string' && path.startsWith(gtiz_file_handler.package_base_path + '/');
}

/**
 * Get contents of a file held by the active SPREAD package
 *
 * The returned object has the same shape as the one of `gtiz_file_handler.getData`,
 * a missing file is reported as a 404 so callers keep their usual handling.
 *
 * @param {String} path Virtual path, e.g. `package:/zooms.txt`
 * @param {Object} options `{ binary: true }` to get the bytes as `blob` instead of the text (optional)
 * @returns Object with `text` (or `blob`), `error` and `status`
 *
 */
gtiz_file_handler.getPackageData = async function(path, options) {
	let relative = gtiz_file_handler.stripQueryString(path).substring(gtiz_file_handler.package_base_path.length + 1);
	let pkg = gtiz_file_handler.package;
	let file = pkg ? pkg.files[relative] : undefined;
	if (!file) {
		return {
			text : gtiz_locales.current.fetch_error + " Status: 404. Url: " + "<span class=\"notifier-response-url\">" + relative + "</span>",
			error : true,
			status : 404
		};
	}
	try {
		// binary files, e.g. an xlsx: the bytes of the zip entry (or of the dropped file)
		if (options && options.binary) {
			let blob = file.data ? new Blob([await file.data()]) : new Blob([await file.text()]);
			return { blob : blob, error : false, status : 200 };
		}
		let text = await file.text();
		return { text : text, error : false, status : 200 };
	} catch (error) {
		console.error("Error:", error);
		return { text : "An error occurred: " + error.message, error : true };
	}
}

/**
 * Get contents from file to load
 *
 * Paths inside the active SPREAD package are read from the package itself.
 *
 * @param {String} url Path where to get contents
 * @param {Object} options `{ binary: true }` to get the bytes as `blob` instead of the text (optional)
 * @returns Content of the fetched file
 *
 */
gtiz_file_handler.getData = async function (url, options) {
	if (gtiz_file_handler.isPackagePath(url)) {
		return gtiz_file_handler.getPackageData(url, options);
	}
	let binary = options && options.binary ? true : false;
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
      // binary files, e.g. an xlsx, are returned as they are
      if (binary) {
        return { blob : await response.blob(), error : false, status : response.status };
      }
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
		// resolve the technical columns before any component looks them up by name
		gtiz_file_handler.setTechnicalColumns(header_index);
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
	// identifier values, like the samples of interest marker, may be translated too
	gtiz_file_handler.setTechnicalValues(meta, header_index);

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
			// a localized metadata file can translate the countries column, when declared in app.json
			column = gtiz_locales.getTechnicalColumnName(column, gtiz_tree.tree.metadata_info);
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
 * @param {Object} source Optional informations about the loaded file as returned by `gtiz_file_handler.getMetadataText`
 * 
 */
gtiz_file_handler.loadMetadataText = function(text, source) {
	let return_data = [];
	// only an actual file load carries a source: a re-parse of the data already in
	// memory, as after a grid edit, must keep the localization state untouched
	if (source) {
		gtiz_file_handler.metadata_source = gtiz_file_handler.stripQueryString(source.path);
		gtiz_file_handler.metadata_localized = source.localized ? true : false;
		// the previous resolutions belong to metadata no longer in memory
		gtiz_file_handler.technical_columns = {};
		gtiz_file_handler.technical_values = {};
		gtiz_file_handler.metadata_mapping = source.mapping ? source.mapping : undefined;
	}
	try {
		let lines = text.split(/\r\n|\r|\n/g);
		if (!lines.length || !lines[0] || !lines[0].trim()) {
			throw new Error('Metadata TSV is empty or missing a header row.');
		}
		// metadata are always tab separated: a comma is a valid character of a header or a value
		let delimiter = "\t";
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
		// a broken translation must not hide the dataset: retry with the default file
		if (source && source.localized && source.default_path) {
			gtiz_file_handler.localizedMetadataFallback(source, error);
			return;
		}
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
					// a SPREAD session saves its zoom settings, see gtiz_zooms.init()
					gtiz_file_handler.url_session = data.gtiz_zooms ? true : false;
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
						gtiz_file_handler.getMetadataText(metadata).then((obj) => {
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
								gtiz_file_handler.loadMetadataText(obj.text, obj);
								gtiz_zooms.init();
								if (gtiz_utils.isObjectNotEmpty(gtiz_utils.postMessage)) {
									let settings_obj = JSON.parse(gtiz_utils.postMessage.settings.tree_backup);
									let apply = gtiz_utils.postMessage.settings.apply;
									// the tab that opened this zoom worked on translated metadata, this zoom has none
									if (gtiz_utils.postMessage.settings.localized && !obj.localized) {
										gtiz_file_handler.localizedZoomMissingNotice(obj);
									}
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
						// a session json carries its metadata: its zooms can be activated without the metadata parameter
						if (gtiz_file_handler.url_session && gtiz_tree.tree.metadata) {
							gtiz_zooms.init();
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
		// single files, several files, folders and zip packages are all accepted
		gtiz_file_handler.collectDroppedFiles(event.dataTransfer).then(async (set) => {
			// a macros file (or a notes file) dropped on the tree goes to its panel
			if (await gtiz_file_handler.dropMacrosFile(set, div)) {
				return;
			}
			gtiz_file_handler.loadFileSet(set);
		}).catch((error) => {
			console.error(error);
			gtiz_file_handler.packageNotice(gtiz_locales.current.package_unreadable_msg, true);
		});
	});
}

/**
 * A file of macros (`type: 'spread-macros'`) dropped on the tree, with a tree loaded,
 * is imported in the macros panel, which opens to show the outcome, instead of being
 * loaded as a tree; a file of notes (`type: 'spread-notes'`) goes to the notes panel
 * in the same way. A complete json of SPREAD is still loaded as a tree.
 *
 * @param {Object} set Dropped files, as built by `gtiz_file_handler.collectDroppedFiles`
 * @param {Element} div Drop area
 * @returns {Promise<Boolean>} True when the file was a macros or a notes file and has been imported
 */
gtiz_file_handler.dropMacrosFile = async function(set, div) {
	if (!div || div.id !== 'graph-div' || !gtiz_tree.tree) {
		return false;
	}
	if (!set || set.files.length !== 1 || gtiz_file_handler.getFileExtension(set.files[0].path) !== 'json') {
		return false;
	}
	let data;
	try {
		data = JSON.parse(await set.files[0].file.text());
	} catch (error) {
		return false;
	}
	// a notes file goes to the notes panel, in the same way
	if (data && data.type === 'spread-notes' && typeof gtiz_notes !== 'undefined') {
		gtiz_notes.showNotes();
		gtiz_notes.importFile(set.files[0].file);
		return true;
	}
	if (!data || data.type !== 'spread-macros') {
		return false;
	}
	gtiz_macros.showMacros();
	gtiz_macros.importFile(set.files[0].file);
	return true;
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
 * The tree is built after a short delay, to let the loading dialog display: the
 * returned promise resolves when it is built, so metadata and geoJson of a
 * package can be loaded after it. Existing callers can ignore it.
 *
 * @param {Object} tree Object containing tree data coming from files upload
 * @param {Boolean} json if true data is to be considered as a complete json tree
 * @returns {Promise<undefined>} Resolved when the tree has been built
 *
 */
gtiz_file_handler.loadTreeText = function(tree, json) {
	let resolve_loaded;
	let loaded = new Promise(resolve => {
		resolve_loaded = resolve;
	});
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
	// resolve even when building the tree fails, so a package load does not hang
	try {
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
	} finally {
		resolve_loaded();
	}
	},500);
	return loaded;
};

/**
 * Load the contents of a single file according to its type
 *
 * @param {String} text File contents
 * @param {String} filename File name, its extension sets the type when no `type` option is given
 * @param {Object} options Optional `type` (`json`, `nwk`, `tsv`, `geojson`) overriding the
 * extension, e.g. for a geoJson saved as `.json`, and `label` shown in the header instead of the file name
 * @returns {Promise<undefined>} Resolved when a tree file has been built, at once for the other types
 */
gtiz_file_handler.distributeFile = function(text, filename, options) {
	let extension = options && options.type ? options.type : gtiz_file_handler.getFileExtension(filename);
	let label = options && options.label ? options.label : filename;
	let loaded = Promise.resolve();
	gtiz_tree.current_metadata_file = null;
	if (gtiz_map.initialized) {
    gtiz_map.resetMap();
  }
	if (extension === 'json') {
		let l_action = 'add';
		let l_components = ['tree', 'map', 'legend'];
		gtiz_layout.uiLoadingManager(l_components, l_action);
		let json = true;
		loaded = gtiz_file_handler.loadTreeText(text, json);
		let header_tag = document.querySelector('#headertag');
		header_tag.classList.add('show');
		header_tag.innerHTML = label;
	}
	if (extension === 'nwk') {
		let l_action = 'add';
		let l_components = ['tree'];
		gtiz_layout.uiLoadingManager(l_components, l_action);
		loaded = gtiz_file_handler.loadTreeText(text);
		let header_tag = document.querySelector('#headertag');
		header_tag.classList.add('show');
		header_tag.innerHTML = label;
	}
	if (extension === 'tsv') {
		if (gtiz_tree.tree) {
			let l_action = 'add';
			let l_components = ['tree', 'map', 'legend'];
			gtiz_layout.uiLoadingManager(l_components, l_action);
			gtiz_tree.current_metadata_file = text;
			// a metadata file loaded by the user sets the order of the grid columns:
			// the order chosen in the grid for the previous metadata does not apply
			gtiz_metadata.columns_order = [];
			gtiz_file_handler.loadMetadataText(text, { path : filename, localized : false });
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
	return loaded;
}

/*
*
* Files ignored when reading a package: metadata written by macOS when zipping
* or browsing a folder
*
*/
gtiz_file_handler.package_ignored_files = /(^|\/)(__MACOSX\/|\._|\.DS_Store$)/;

/**
 * Build a file set from a list of files
 *
 * A file set is `{ name, files }`, where `files` is an array of `{ path, file }`
 * and `path` is relative to the dropped folder (just the name for loose files).
 *
 * @param {FileList|Array} files Files from an input or a drop
 * @returns {Object} File set
 */
gtiz_file_handler.buildFileSet = function(files) {
	let list = Array.from(files).map(file => ({ path : file.name, file : file }));
	return {
		name : list.length === 1 ? list[0].path : undefined,
		files : list
	};
}

/**
 * Collect files and folders dropped on a drop area
 *
 * Entries must be read synchronously inside the drop event, they are not valid
 * afterwards; folders are then walked recursively.
 *
 * @param {DataTransfer} data_transfer `dataTransfer` of the drop event
 * @returns {Promise<Object>} File set, see `gtiz_file_handler.buildFileSet`
 */
gtiz_file_handler.collectDroppedFiles = function(data_transfer) {
	let items = data_transfer.items ? Array.from(data_transfer.items) : [];
	let entries = items
		.filter(item => item.kind === 'file' && typeof item.webkitGetAsEntry === 'function')
		.map(item => item.webkitGetAsEntry())
		.filter(entry => entry);
	if (entries.length === 0) {
		return Promise.resolve(gtiz_file_handler.buildFileSet(data_transfer.files));
	}
	// read every entry of a folder, browsers return them in batches
	let readEntries = (reader) => new Promise((resolve, reject) => reader.readEntries(resolve, reject));
	let getFile = (entry) => new Promise((resolve, reject) => entry.file(resolve, reject));
	let walk = async (entry, prefix, list) => {
		if (entry.isFile) {
			list.push({ path : prefix + entry.name, file : await getFile(entry) });
			return;
		}
		let reader = entry.createReader();
		let batch = await readEntries(reader);
		while (batch.length > 0) {
			for (let child of batch) {
				await walk(child, prefix + entry.name + '/', list);
			}
			batch = await readEntries(reader);
		}
	};
	return (async () => {
		let list = [];
		// a single dropped folder is the package root, its name is not part of the paths
		if (entries.length === 1 && entries[0].isDirectory) {
			let reader = entries[0].createReader();
			let batch = await readEntries(reader);
			while (batch.length > 0) {
				for (let child of batch) {
					await walk(child, '', list);
				}
				batch = await readEntries(reader);
			}
		} else {
			for (let entry of entries) {
				await walk(entry, '', list);
			}
		}
		return {
			name : entries.length === 1 ? entries[0].name : undefined,
			files : list
		};
	})();
}

/**
 * Show an informative notifier about a file set that cannot be loaded as it is
 *
 * @param {String} message Localized message
 * @param {Boolean} error True for problems that stopped the load, false for notes
 * @returns {undefined}
 */
gtiz_file_handler.packageNotice = function(message, error) {
	let title = error ? '<i class="tabler tabler-alert-triangle"></i> ' + gtiz_locales.current.oops : '<i class="tabler tabler-info-circle"></i> ' + gtiz_locales.current.please_note;
	let content = document.createElement('p');
	content.innerHTML = message;
	gtiz_modal.buildNotifier(title, [content], undefined, 'info');
}

/**
 * Control if a parsed json is a complete SPREAD (or GrapeTree) json
 *
 * @param {Object} obj Parsed json
 * @returns true/false
 */
gtiz_file_handler.isCompleteJson = function(obj) {
	return obj !== null && typeof obj === 'object' && !Array.isArray(obj) && ['nwk', 'nexus', 'newickTree', 'links'].some(key => key in obj);
}

/**
 * Load a file set: a single file, a zip, a folder or several files
 *
 * A single tree, metadata or geoJson file keeps the usual behaviour. Anything
 * else is read as a package, see `gtiz_file_handler.loadPackageFiles`.
 *
 * @param {Object} set File set, see `gtiz_file_handler.buildFileSet`
 * @returns {Promise<undefined>}
 */
gtiz_file_handler.loadFileSet = async function(set) {
	if (!set || set.files.length === 0) {
		return;
	}
	let first = set.files[0];
	let extension = gtiz_file_handler.getFileExtension(first.path);
	if (set.files.length === 1 && !first.path.includes('/') && extension !== 'zip') {
		// a new tree replaces the package the previous one was loaded from
		if (extension === 'json' || extension === 'nwk') {
			gtiz_file_handler.package = undefined;
		}
		// Excel metadata are binary: read as tab separated text, then loaded as a .tsv
		if (extension === 'xlsx' || extension === 'xls') {
			await gtiz_file_handler.loadMetadataXlsx(first.file, first.path);
			return;
		}
		let text = await first.file.text();
		gtiz_file_handler.distributeFile(text, first.path);
		return;
	}
	let files = {};
	let name = set.name;
	if (set.files.length === 1 && extension === 'zip') {
		try {
			files = await gtiz_zip.read(first.file);
		} catch (error) {
			console.error(error);
			gtiz_file_handler.packageNotice(gtiz_locales.current.package_unreadable_msg, true);
			return;
		}
		name = first.path.replace(/\.zip$/i, '');
	} else {
		set.files.forEach(item => {
			files[item.path] = {
				size : item.file.size,
				text : () => item.file.text(),
				data : async () => new Uint8Array(await item.file.arrayBuffer())
			};
		});
	}
	await gtiz_file_handler.loadPackageFiles(files, name);
}

/**
 * Load the files of a package (zip or folder) or of several dropped files
 *
 * Only the root of the package is considered; when the root holds no known file
 * and a single folder, that folder is used as root (e.g. a zip made by hand).
 * A complete SPREAD json wins over any other file and, when the package holds
 * a zooms list, it becomes the source of the zooms. Otherwise a `.nwk` tree is
 * loaded, followed by the optional metadata (`.tsv` or `.xlsx`, only one of
 * them) and geoJson.
 *
 * @param {Object} files Map of `path -> { text(), data() }` (`data()` gives the bytes)
 * @param {String} name Package name shown in the header, optional
 * @returns {Promise<undefined>}
 */
gtiz_file_handler.loadPackageFiles = async function(files, name) {
	let known = ['json', 'geojson', 'nwk', 'tsv', 'xlsx'];
	let paths = Object.keys(files).filter(path => !gtiz_file_handler.package_ignored_files.test(path));
	let isKnownRootFile = (path) => !path.includes('/') && known.includes(gtiz_file_handler.getFileExtension(path));
	// step into a single container folder
	while (paths.length > 0 && !paths.some(isKnownRootFile)) {
		let folders = new Set(paths.map(path => path.split('/')[0]));
		if (folders.size !== 1 || !paths.every(path => path.includes('/'))) {
			break;
		}
		let folder = [...folders][0];
		name = name ? name : folder;
		paths = paths.map(path => path.substring(folder.length + 1));
		let nested = {};
		Object.keys(files).forEach(path => {
			if (path.startsWith(folder + '/')) {
				nested[path.substring(folder.length + 1)] = files[path];
			}
		});
		files = nested;
	}
	let normalized = {};
	paths.forEach(path => {
		normalized[path] = files[path];
	});

	// sort root files by type, json files are told apart by their contents
	let found = { json : [], geojson : [], nwk : [], tsv : [], xlsx : [] };
	for (let path of paths.filter(isKnownRootFile)) {
		let extension = gtiz_file_handler.getFileExtension(path);
		if (extension === 'json') {
			let text = await normalized[path].text();
			let obj;
			try {
				obj = JSON.parse(text);
			} catch (error) {
				obj = undefined;
			}
			if (obj && obj.type === 'FeatureCollection') {
				found.geojson.push({ path : path, text : text });
			} else if (gtiz_file_handler.isCompleteJson(obj)) {
				found.json.push({ path : path, text : text });
			}
		} else {
			found[extension].push({ path : path });
		}
	}

	let ambiguous = (list) => list.length > 1 ? list.map(item => item.path) : [];
	if (found.json.length > 1) {
		gtiz_file_handler.packageNotice(gtiz_locales.current.package_ambiguous_files_msg.replace('{0}', ambiguous(found.json).join(', ')), true);
		return;
	}
	if (found.json.length === 1) {
		let json = found.json[0];
		// a package holding a zooms list becomes the source of the zooms of its json
		gtiz_file_handler.package = normalized[gtiz_zooms.package_zooms_list] ? { name : name, files : normalized } : undefined;
		gtiz_file_handler.distributeFile(json.text, json.path, { type : 'json', label : name ? name : json.path });
		if (found.nwk.length + found.tsv.length + found.xlsx.length + found.geojson.length > 0) {
			gtiz_file_handler.packageNotice(gtiz_locales.current.package_json_priority_msg, false);
		}
		return;
	}
	let metadata_files = found.tsv.concat(found.xlsx);
	let duplicated = [...ambiguous(found.nwk), ...ambiguous(metadata_files), ...ambiguous(found.geojson)];
	if (duplicated.length > 0) {
		gtiz_file_handler.packageNotice(gtiz_locales.current.package_ambiguous_files_msg.replace('{0}', duplicated.join(', ')), true);
		return;
	}
	if (found.nwk.length === 0) {
		gtiz_file_handler.packageNotice(gtiz_locales.current.package_no_tree_msg, true);
		return;
	}
	// simple tree: zooms are ignored, the package is not kept
	gtiz_file_handler.package = undefined;
	let tree = found.nwk[0];
	let tree_text = await normalized[tree.path].text();
	await gtiz_file_handler.distributeFile(tree_text, tree.path, { type : 'nwk', label : name ? name : tree.path });
	if (metadata_files.length === 1) {
		let metadata = metadata_files[0];
		if (gtiz_xlsx.isXlsx(metadata.path)) {
			// Excel metadata: the bytes of the entry, read as tab separated text
			let blob = new Blob([await normalized[metadata.path].data()]);
			await gtiz_file_handler.loadMetadataXlsx(blob, metadata.path);
		} else {
			gtiz_file_handler.distributeFile(await normalized[metadata.path].text(), metadata.path, { type : 'tsv' });
		}
	}
	if (found.geojson.length === 1) {
		let geo = found.geojson[0];
		let geo_text = geo.text !== undefined ? geo.text : await normalized[geo.path].text();
		gtiz_file_handler.distributeFile(geo_text, geo.path, { type : 'geojson' });
	}
}

/**
 * Manage dropped files (from input or from drag)
 *
 * @param {Array} files Array of files to load
 * @returns {Promise<undefined>}
 *
 */
gtiz_file_handler.filesDropped = function(files) {
	return gtiz_file_handler.loadFileSet(gtiz_file_handler.buildFileSet(files));
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
 * on screen. The image is ready once the SVG overlays load.
 *
 * @param {HTMLCanvasElement} treeCanvas The rendered tree (already at export scale)
 * @param {Object|null} scaleOverlay {svg, x, y, s} for the scale bar, or null
 * @param {SVGElement|null} legendSvg The legend SVG to place on the side, or null
 * @param {number} s Export scale factor (output px per on-screen px)
 * @returns {Promise<HTMLCanvasElement>} The composed image
 */
gtiz_file_handler.composeTreeWithLegend = function(treeCanvas, scaleOverlay, legendSvg, s) {
  // Horizontal gap between the tree and the legend panel.
  let gap = Math.round(20 * s);
  return Promise.all([
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
    return out;
  });
}

/**
 * Compose the export PNG (see `gtiz_file_handler.composeTreeWithLegend`) and
 * download it with the given name.
 *
 * @param {HTMLCanvasElement} treeCanvas The rendered tree (already at export scale)
 * @param {Object|null} scaleOverlay {svg, x, y, s} for the scale bar, or null
 * @param {SVGElement|null} legendSvg The legend SVG to place on the side, or null
 * @param {number} s Export scale factor (output px per on-screen px)
 * @param {String} filename Download file name
 */
gtiz_file_handler.saveTreeWithLegend = function(treeCanvas, scaleOverlay, legendSvg, s, filename) {
  gtiz_file_handler.composeTreeWithLegend(treeCanvas, scaleOverlay, legendSvg, s).then(function(out) {
    out.toBlob(function(blob) {
      gtiz_file_handler.saveBlobAsFile(blob, filename);
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
	gtiz_file_handler.saveBlobAsFile(blob, name);
}

/**
 * Save a blob as file.
 *
 * @param {Blob} blob Contents to save, e.g. a zip archive
 * @param {String} name Suggested name for the file
 * @returns {undefined}
 *
 */
gtiz_file_handler.saveBlobAsFile = function(blob, name) {
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
			// the notes are in the saved session now
			gtiz_notes.saved();
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

/*
*
* Export of the complete SPREAD package with zooms: above
* `package_zooms_confirm_threshold` zooms the user is asked to confirm, zoom
* files are downloaded `package_download_concurrency` at a time.
* `package_export` holds the state of the running export, `undefined` otherwise.
*
*/
gtiz_file_handler.package_zooms_confirm_threshold = 200;
gtiz_file_handler.package_download_concurrency = 6;
gtiz_file_handler.package_json_name = 'spread.json';
gtiz_file_handler.package_export = undefined;

/**
 * Show the export view in the save modal, in place of the format list
 * 
 * The view holds a status line (with the loader while loading), a progress
 * bar, an optional note and the action buttons. Closing the modal removes it, which the running
 * export takes as a cancel.
 * 
 * @returns {Object} View nodes `{ root, loader, text, progress, note, actions }`, `undefined` when no modal is open
 */
gtiz_file_handler.showPackageExportView = function() {
	let body = document.querySelector('.modal .modal-body-contents');
	if (!body) {
		return undefined;
	}
	// remove the format list, or the view of a previous export
	body.querySelectorAll(':scope > .modal-form, :scope > .modal-export').forEach(node => node.remove());
	let root = document.createElement('div');
	root.setAttribute('class', 'modal-export');
	// status line: the loader column is filled only while loading
	let status = document.createElement('div');
	status.setAttribute('class', 'modal-export-status');
	let loader = document.createElement('div');
	loader.setAttribute('class', 'modal-export-loader');
	let text = document.createElement('p');
	text.setAttribute('class', 'modal-export-text');
	status.append(loader, text);
	let progress = document.createElement('progress');
	progress.setAttribute('class', 'modal-export-progress');
	let note = document.createElement('p');
	note.setAttribute('class', 'modal-export-note');
	note.setAttribute('id', 'modal-export-note');
	let actions = document.createElement('div');
	actions.setAttribute('class', 'modal-export-actions');
	root.append(status, actions);
	body.append(root);
	return { root, loader, text, progress, note, actions };
}

/**
 * Update the export view
 * 
 * @param {Object} view View nodes, see `gtiz_file_handler.showPackageExportView`
 * @param {Object} options `state` (`loading`, `done`, `error` or `info`) sets the loader
 * beside the status line while loading, an inline icon before the text otherwise,
 * `text` the status line, `progress` the bar (`{ value, max }`, `true` for an
 * undetermined bar, nothing to hide it), `note` an optional second line, `details`
 * an optional DOM node shown under the note and `actions` the buttons, as built
 * by `gtiz_file_handler.buildExportButton`
 * @returns {undefined}
 */
gtiz_file_handler.setPackageExportView = function(view, options) {
	// the loader of the project while loading
	view.loader.innerHTML = '';
	if (options.state === 'loading') {
		view.loader.append(gtiz_loader.getLoader());
	}
	// otherwise an inline icon before the text, as in the notifiers and in the modal feedback
	let icons = { done : 'tabler-circle-check', error : 'tabler-alert-triangle', info : 'tabler-info-circle' };
	let icon = options.state === 'loading' ? '' : '<i class="tabler ' + (icons[options.state] || icons.info) + '"></i> ';
	view.text.innerHTML = icon + options.text;
	// errors are shown in red, as the warnings of the modal feedback
	view.text.classList.toggle('modal-export-text-error', options.state === 'error');
	// the progress bar sits between the status line and the actions
	if (options.progress) {
		if (options.progress === true) {
			view.progress.removeAttribute('value');
		} else {
			view.progress.setAttribute('max', options.progress.max);
			view.progress.setAttribute('value', options.progress.value);
		}
		view.root.insertBefore(view.progress, view.actions);
	} else {
		view.progress.remove();
	}
	if (options.note) {
		view.note.innerHTML = options.note;
		view.root.insertBefore(view.note, view.actions);
	} else {
		view.note.remove();
	}
	// with details the note becomes their label: further from the status line, close to the box
	view.note.classList.toggle('modal-export-label', !!options.details);
	if (view.details) {
		view.details.remove();
	}
	view.details = options.details;
	if (view.details) {
		view.root.insertBefore(view.details, view.actions);
	}
	view.actions.innerHTML = '';
	(options.actions || []).forEach(button => view.actions.append(button));
}

/**
 * Build a button of the export view
 * 
 * @param {String} html Button contents, already localized
 * @param {Boolean} secondary True for a secondary (outlined) button
 * @param {Function} callback Function called on click
 * @returns {DOM Node} The button
 */
gtiz_file_handler.buildExportButton = function(html, secondary, callback) {
	let button = document.createElement('button');
	if (secondary) {
		button.setAttribute('class', 'secondary');
	}
	button.innerHTML = html;
	button.addEventListener('click', callback);
	return button;
}

/**
 * Show again the format list in the save modal, removing the export view
 * 
 * @returns {undefined}
 */
gtiz_file_handler.showSaveFormats = function() {
	let body = document.querySelector('.modal .modal-body-contents');
	if (!body) {
		return;
	}
	body.querySelectorAll(':scope > .modal-export').forEach(node => node.remove());
	gtiz_tree.buildFileHandlerModalContents('save').forEach(node => body.append(node));
}

/**
 * Download the files of a single zoom for the package export
 *
 * The tree and the default metadata are required. When the full tree is
 * translated, the localized metadata variant and its column mapping are added
 * if available, so the zoom keeps the language once the package is loaded.
 *
 * @param {String} base_path Base path of the zooms, on the network or inside a package
 * @param {String} folder Zoom folder, `<prefix>_<zoom>`
 * @param {String} zoom Zoom name, `<threshold>_<cluster>` or `<sample>_<closest>`
 * @returns {Promise<Object>} `{ entries }` with the zip entries `{ name, text }`, or
 * `{ status }` when a required file is missing: the http status of the first failed
 * file (tree before metadata), `undefined` for a network error
 */
gtiz_file_handler.getZoomPackageEntries = async function(base_path, folder, zoom) {
	let path = base_path + '/' + folder + '/';
	let tree_name = zoom + '.nwk';
	let metadata_name = zoom + '_metadata_w_partitions.tsv';
	let [tree, metadata] = await Promise.all([
		gtiz_file_handler.getData(path + tree_name),
		gtiz_file_handler.getData(path + metadata_name)
	]);
	if (tree.error || metadata.error) {
		return { status : tree.error ? tree.status : metadata.status };
	}
	let entries = [
		{ name : folder + '/' + tree_name, text : tree.text },
		{ name : folder + '/' + metadata_name, text : metadata.text }
	];
	let lang = gtiz_locales.getMetadataLanguageCode();
	if (lang && gtiz_file_handler.metadata_localized) {
		let localized_name = gtiz_file_handler.getLocalizedPath(metadata_name, lang);
		let localized = await gtiz_file_handler.getData(path + localized_name);
		if (!localized.error && gtiz_file_handler.looksLikeMetadata(localized.text)) {
			entries.push({ name : folder + '/' + localized_name, text : localized.text });
			let mapping_name = gtiz_file_handler.replaceExtension(localized_name, 'json');
			let mapping = await gtiz_file_handler.getData(path + mapping_name);
			if (!mapping.error && gtiz_file_handler.isValidJSON(mapping.text)) {
				entries.push({ name : folder + '/' + mapping_name, text : mapping.text });
			}
		}
	}
	return { entries : entries };
}

/**
 * Get the localized reason why a zoom could not be downloaded
 * 
 * @param {Number} status Http status of the failed request, `undefined` for a network error
 * @returns {String} Localized reason
 */
gtiz_file_handler.getZoomMissingReason = function(status) {
	if (status === 404) {
		return gtiz_locales.current.zooms_export_reason_not_found;
	}
	if (status === 401 || status === 403) {
		return gtiz_locales.current.zooms_export_reason_forbidden;
	}
	if (status === undefined) {
		return gtiz_locales.current.zooms_export_reason_network;
	}
	return gtiz_locales.current.zooms_export_reason_other;
}

/**
 * Copy a text to the clipboard
 * 
 * The asynchronous clipboard api is available only in secure contexts (https or
 * localhost): elsewhere the text is copied through a temporary selection.
 * 
 * @param {String} text Text to copy
 * @returns {Promise<Boolean>} true when the text has been copied
 */
gtiz_file_handler.copyToClipboard = async function(text) {
	if (navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (error) {
			console.log(error);
		}
	}
	let area = document.createElement('textarea');
	area.value = text;
	area.setAttribute('readonly', '');
	area.setAttribute('class', 'clipboard-helper');
	document.body.append(area);
	area.select();
	let copied = false;
	try {
		copied = document.execCommand('copy');
	} catch (error) {
		console.log(error);
	}
	area.remove();
	return copied;
}

/**
 * Build the box listing the zooms not included in the package
 * 
 * Each row shows the zoom folder name, as in `zooms.txt` and on the server, and
 * the reason. The text is selectable and a button copies the whole list.
 * 
 * @param {Array} missing Array of `{ name, reason }`
 * @returns {DOM Node} The box
 */
gtiz_file_handler.buildMissingZoomsBox = function(missing) {
	let box = document.createElement('div');
	box.setAttribute('class', 'modal-export-missing');
	let copy = document.createElement('button');
	copy.setAttribute('class', 'modal-export-copy');
	copy.setAttribute('type', 'button');
	copy.setAttribute('title', gtiz_locales.current.copy_list);
	copy.setAttribute('aria-label', gtiz_locales.current.copy_list);
	let icon = document.createElement('i');
	icon.setAttribute('class', 'tabler tabler-copy');
	copy.append(icon);
	copy.addEventListener('click', async () => {
		let text = missing.map(item => item.name + '\t' + item.reason).join('\n');
		let copied = await gtiz_file_handler.copyToClipboard(text);
		if (copied) {
			// short confirmation on the icon itself
			icon.setAttribute('class', 'tabler tabler-check');
			copy.classList.add('copied');
			setTimeout(() => {
				icon.setAttribute('class', 'tabler tabler-copy');
				copy.classList.remove('copied');
			}, 1500);
		}
	});
	let list = document.createElement('div');
	list.setAttribute('class', 'modal-export-missing-list');
	// the note above the box is the label of the list
	list.setAttribute('aria-labelledby', 'modal-export-note');
	missing.forEach(item => {
		let row = document.createElement('div');
		row.setAttribute('class', 'modal-export-missing-item');
		let name = document.createElement('span');
		name.setAttribute('class', 'modal-export-missing-name');
		name.textContent = item.name;
		let reason = document.createElement('span');
		reason.setAttribute('class', 'modal-export-missing-reason');
		// middle dot separator, kept in the gray reason so the name stands out
		reason.textContent = '\u00B7 ' + item.reason;
		row.append(name, ' ', reason);
		list.append(row);
	});
	box.append(copy, list);
	return box;
}

/**
 * Save the complete SPREAD package: complete json, zooms list and zoom files in a zip
 * 
 * The save modal switches to an export view showing the download progress,
 * then the creation of the zip and the final state. Cancelling or closing the
 * modal stops the export. Zooms whose files cannot be downloaded are skipped
 * and listed in the final state, with the reason; when no zoom can be
 * downloaded no package is saved, since it would hold just the complete json.
 * 
 * @param {Boolean} confirmed True when the user already confirmed a large export
 * @returns {Promise<undefined>}
 */
gtiz_file_handler.savePackageWithZooms = async function(confirmed) {
	if (gtiz_file_handler.package_export) {
		return;
	}
	let view = gtiz_file_handler.showPackageExportView();
	if (!view) {
		return;
	}
	let back = () => gtiz_file_handler.buildExportButton('<i class="tabler tabler-arrow-left"></i> ' + gtiz_locales.current.back_to_formats, true, () => {
		gtiz_file_handler.showSaveFormats();
	});
	let zooms = gtiz_zooms.getZoomsNames();
	// json and zooms list plus at least two files per zoom
	let entries_count = zooms.length * 2 + 2;
	if (entries_count > gtiz_zip.max_entries) {
		gtiz_file_handler.setPackageExportView(view, {
			state : 'info',
			text : gtiz_locales.current.zooms_export_too_many_msg.replace('{0}', zooms.length),
			actions : [back()]
		});
		return;
	}
	if (!confirmed && zooms.length > gtiz_file_handler.package_zooms_confirm_threshold) {
		gtiz_file_handler.setPackageExportView(view, {
			state : 'info',
			text : gtiz_locales.current.zooms_export_confirm_msg.replace('{0}', zooms.length),
			actions : [
				gtiz_file_handler.buildExportButton('<i class="tabler tabler-check"></i> ' + gtiz_locales.current.zooms_export_continue, false, () => {
					gtiz_file_handler.savePackageWithZooms(true);
				}),
				gtiz_file_handler.buildExportButton('<i class="tabler tabler-x"></i> ' + gtiz_locales.current.zooms_export_cancel, true, () => {
					gtiz_file_handler.showSaveFormats();
				})
			]
		});
		return;
	}

	let state = { cancelled : false };
	gtiz_file_handler.package_export = state;
	try {
		let cancel = gtiz_file_handler.buildExportButton('<i class="tabler tabler-x"></i> ' + gtiz_locales.current.zooms_export_cancel, true, () => {
			state.cancelled = true;
		});
		let showProgress = (done) => {
			gtiz_file_handler.setPackageExportView(view, {
				state : 'loading',
				text : gtiz_locales.current.zooms_export_progress.replace('{0}', done).replace('{1}', zooms.length),
				progress : { value : done, max : zooms.length },
				actions : [cancel]
			});
		};
		showProgress(0);

		let base_path = gtiz_file_handler.getBasePath();
		let prefix = gtiz_zooms.zooms_prefix + '_';
		// results are stored by index so the archive keeps the order of the zooms list
		let results = new Array(zooms.length);
		let next = 0;
		let done = 0;
		let worker = async () => {
			while (next < zooms.length && !state.cancelled) {
				let index = next++;
				let zoom = zooms[index];
				results[index] = await gtiz_file_handler.getZoomPackageEntries(base_path, prefix + zoom, zoom);
				done++;
				// a closed modal removes the view: we take it as a cancel
				if (!view.root.isConnected) {
					state.cancelled = true;
				} else if (!state.cancelled) {
					// only the counter and the bar change, the buttons are kept
					view.text.innerHTML = gtiz_locales.current.zooms_export_progress.replace('{0}', done).replace('{1}', zooms.length);
					view.progress.setAttribute('value', done);
				}
			}
		};
		let workers = [];
		for (let i = 0; i < Math.min(gtiz_file_handler.package_download_concurrency, zooms.length); i++) {
			workers.push(worker());
		}
		await Promise.all(workers);
		if (state.cancelled) {
			if (view.root.isConnected) {
				gtiz_file_handler.showSaveFormats();
			}
			return;
		}

		let included = [];
		let entries = [];
		let missing = [];
		results.forEach((result, index) => {
			if (result.entries) {
				included.push(prefix + zooms[index]);
				entries.push(...result.entries);
			} else {
				// the folder name is the one found in zooms.txt and on the server
				missing.push({ name : prefix + zooms[index], reason : gtiz_file_handler.getZoomMissingReason(result.status) });
			}
		});
		let close = () => gtiz_file_handler.buildExportButton(gtiz_locales.current.close, false, () => {
			gtiz_modal.closeModal();
		});

		// no zoom downloaded: a package without zooms would be just the complete json, so nothing is saved
		if (included.length === 0) {
			let box = gtiz_file_handler.buildMissingZoomsBox(missing);
			gtiz_file_handler.setPackageExportView(view, {
				state : 'error',
				text : gtiz_locales.current.zooms_export_none_msg,
				note : gtiz_locales.current.zooms_export_missing_label,
				details : box,
				actions : [back(), close()]
			});
			return;
		}

		// creating the zip cannot be stopped, so the cancel button goes away
		gtiz_file_handler.setPackageExportView(view, {
			state : 'loading',
			text : gtiz_locales.current.zooms_export_zipping,
			progress : true
		});
		// let the view repaint before the serialization of the json, which blocks the page
		await new Promise(resolve => setTimeout(resolve, 50));

		let json = JSON.stringify(gtiz_tree.getCompleteGrapeTreeObject());
		entries.unshift(
			{ name : gtiz_file_handler.package_json_name, text : json },
			{ name : gtiz_zooms.package_zooms_list, text : included.join('\n') + '\n' }
		);
		let blob = await gtiz_zip.write(entries);
		gtiz_file_handler.saveBlobAsFile(blob, 'spread' + Date.now() + '.zip');
		// the notes are in the saved session now
		gtiz_notes.saved();

		let note = undefined;
		let details = undefined;
		if (missing.length > 0) {
			note = missing.length === 1 ? gtiz_locales.current.zooms_export_missing_one_msg : gtiz_locales.current.zooms_export_missing_msg.replace('{0}', missing.length);
			details = gtiz_file_handler.buildMissingZoomsBox(missing);
		}
		gtiz_file_handler.setPackageExportView(view, {
			state : 'done',
			text : gtiz_locales.current.zooms_export_done,
			note : note,
			details : details,
			actions : [back(), close()]
		});
	} catch (error) {
		console.error(error);
		gtiz_file_handler.setPackageExportView(view, {
			state : 'info',
			text : gtiz_locales.current.save_feedback_json,
			actions : [back()]
		});
	} finally {
		gtiz_file_handler.package_export = undefined;
	}
}

gtiz_file_handler.modalLoadSelectedFiles = function() {
	let set = gtiz_file_handler.files_to_load;
	if (set && set.files && set.files.length > 0) {
		gtiz_file_handler.loadFileSet(set);
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
 * Set the files to load from the modal
 *
 * @param {Object} set File set, see `gtiz_file_handler.buildFileSet`
 * @returns {undefined}
 *
 */
gtiz_file_handler.modalSetFilesToLoad = function(set) {
	gtiz_file_handler.files_to_load = set;
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
