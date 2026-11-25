let gtiz_xlsx = {};

/*
*
* Minimal writer and reader of Excel workbooks (.xlsx, Office Open XML), built
* on the zip helpers of the project (js/zip.js), with no external library. It
* covers the metadata table: a single sheet of texts.
*
* - `gtiz_xlsx.build(header, rows)` writes every cell as text, with the Text
*   format on every column, so the values typed later in a spreadsheet stay
*   text too (no `2008.0` -> `2008`, no lost leading zeros, no automatic dates).
* - `gtiz_xlsx.toTsv(blob)` reads the first sheet and returns it as a tab
*   separated text, the format the metadata loader expects. Merged cells stop
*   the reading: SPREAD does not guess what an area spanning several cells means.
*
* Reading errors carry a `code`: `unreadable` (not an xlsx file, e.g. a password
* protected one or a missing sheet) or `merged` (merged cells). Writing errors
* carry `too_large` when the table exceeds the limits of Excel.
*
*/

/*
*
* Media type, limits of Excel and namespaces
*
*/
gtiz_xlsx.mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
gtiz_xlsx.limits = { rows : 1048576, columns : 16384, cell : 32767 };
gtiz_xlsx.ns = {
  main : 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
  rel : 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  package_rel : 'http://schemas.openxmlformats.org/package/2006/relationships'
};
gtiz_xlsx.sheet_name = 'metadata';

/*
*
* Column widths of the written sheet, in characters
*
*/
gtiz_xlsx.min_width = 8;
gtiz_xlsx.max_width = 60;

/*
*
* Built-in number formats of dates and times (ECMA-376, 18.8.30), the custom
* ones are recognised by their format code
*
*/
gtiz_xlsx.date_formats = [14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58];

/**
 * Tell an xlsx file by its name (a query string or a fragment is ignored)
 *
 * @param {String} name File name or path
 * @returns {Boolean} True for `.xlsx`
 */
gtiz_xlsx.isXlsx = function(name) {
  return /\.xlsx$/i.test(String(name || '').split(/[?#]/)[0]);
}

/**
 * Tell an old binary Excel file (Excel 97-2003) by its name
 *
 * @param {String} name File name or path
 * @returns {Boolean} True for `.xls`
 */
gtiz_xlsx.isXls = function(name) {
  return /\.xls$/i.test(String(name || '').split(/[?#]/)[0]);
}

/**
 * Build an error with a code, see the top of this file
 *
 * @param {String} code `unreadable`, `merged` or `too_large`
 * @param {String} message Technical message for the console
 * @returns {Error} Error with `code`
 */
gtiz_xlsx.error = function(code, message) {
  let error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Escape a text for xml, dropping the characters xml does not allow
 *
 * @param {String} text Text
 * @returns {String} Escaped text
 */
gtiz_xlsx.escape = function(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Letters of a column from its index
 *
 * @param {Number} index Column index, 0 for `A`
 * @returns {String} Column letters, e.g. `A`, `Z`, `AA`
 */
gtiz_xlsx.columnName = function(index) {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    let rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

/**
 * Index of a column from a cell reference
 *
 * @param {String} ref Cell reference, e.g. `C7` (or just the letters)
 * @returns {Number} Column index, 0 for `A`, -1 when the reference has no letters
 */
gtiz_xlsx.columnIndex = function(ref) {
  let letters = String(ref || '').toUpperCase().match(/^[A-Z]+/);
  if (!letters) {
    return -1;
  }
  let index = 0;
  for (let char of letters[0]) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}

/*
*
* Writer
*
*/

/**
 * Build an xlsx workbook with one sheet of texts
 *
 * The header is bold and frozen, with the filters of Excel; every column of the
 * sheet has the Text format, also the empty ones on the right, where the user
 * may add columns.
 *
 * @param {Array} header Column names
 * @param {Array} rows Rows, each an array of values in the order of the header
 * @param {Object} options `{ title }` for the properties of the workbook (optional)
 * @returns {Promise<Blob>} The .xlsx file
 */
gtiz_xlsx.build = async function(header, rows, options) {
  let columns = header.length;
  if (columns === 0 || columns > gtiz_xlsx.limits.columns || rows.length + 1 > gtiz_xlsx.limits.rows) {
    throw gtiz_xlsx.error('too_large', 'Table size not allowed by Excel: ' + (rows.length + 1) + ' rows, ' + columns + ' columns');
  }
  let strings = { index : new Map(), list : [], count : 0 };
  let widths = header.map(name => String(name).length);
  let sheet_rows = [];
  [header].concat(rows).forEach((row, r) => {
    // style 2 is bold text (header), style 1 text
    let style = r === 0 ? 2 : 1;
    let cells = [];
    for (let c = 0; c < columns; c++) {
      let value = row[c] === undefined || row[c] === null ? '' : String(row[c]);
      if (value === '') {
        continue;
      }
      if (value.length > gtiz_xlsx.limits.cell) {
        throw gtiz_xlsx.error('too_large', 'Cell ' + gtiz_xlsx.columnName(c) + (r + 1) + ' longer than ' + gtiz_xlsx.limits.cell + ' characters');
      }
      widths[c] = Math.max(widths[c], value.length);
      cells.push('<c r="' + gtiz_xlsx.columnName(c) + (r + 1) + '" s="' + style + '" t="s"><v>' + gtiz_xlsx.sharedString(strings, value) + '</v></c>');
    }
    sheet_rows.push('<row r="' + (r + 1) + '">' + cells.join('') + '</row>');
  });
  let last_column = gtiz_xlsx.columnName(columns - 1);
  let range = 'A1:' + last_column + (rows.length + 1);
  let cols = widths.map((width, c) => {
    let size = Math.min(Math.max(width + 2, gtiz_xlsx.min_width), gtiz_xlsx.max_width);
    return '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + size + '" style="1" customWidth="1"/>';
  });
  // the Text format also on the columns the user may add
  if (columns < gtiz_xlsx.limits.columns) {
    cols.push('<col min="' + (columns + 1) + '" max="' + gtiz_xlsx.limits.columns + '" width="' + gtiz_xlsx.min_width + '" style="1"/>');
  }
  let sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="' + gtiz_xlsx.ns.main + '" xmlns:r="' + gtiz_xlsx.ns.rel + '">' +
    '<dimension ref="' + range + '"/>' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    '<cols>' + cols.join('') + '</cols>' +
    '<sheetData>' + sheet_rows.join('') + '</sheetData>' +
    '<autoFilter ref="' + range + '"/>' +
    '</worksheet>';
  let shared = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<sst xmlns="' + gtiz_xlsx.ns.main + '" count="' + strings.count + '" uniqueCount="' + strings.list.length + '">' +
    strings.list.map(value => '<si><t xml:space="preserve">' + gtiz_xlsx.escape(value) + '</t></si>').join('') +
    '</sst>';
  let workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="' + gtiz_xlsx.ns.main + '" xmlns:r="' + gtiz_xlsx.ns.rel + '">' +
    '<bookViews><workbookView activeTab="0"/></bookViews>' +
    '<sheets><sheet name="' + gtiz_xlsx.sheet_name + '" sheetId="1" r:id="rId1"/></sheets>' +
    // Excel keeps the range of the filters in this hidden name
    '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">' +
    gtiz_xlsx.sheet_name + '!$A$1:$' + last_column + '$' + (rows.length + 1) + '</definedName></definedNames>' +
    '</workbook>';
  let workbook_relations = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="' + gtiz_xlsx.ns.package_rel + '">' +
    '<Relationship Id="rId1" Type="' + gtiz_xlsx.ns.rel + '/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="' + gtiz_xlsx.ns.rel + '/styles" Target="styles.xml"/>' +
    '<Relationship Id="rId3" Type="' + gtiz_xlsx.ns.rel + '/sharedStrings" Target="sharedStrings.xml"/>' +
    '</Relationships>';
  let types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '</Types>';
  let package_relations = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="' + gtiz_xlsx.ns.package_rel + '">' +
    '<Relationship Id="rId1" Type="' + gtiz_xlsx.ns.rel + '/officeDocument" Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '</Relationships>';
  let now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  let core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
    'xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<dc:title>' + gtiz_xlsx.escape(options && options.title ? options.title : '') + '</dc:title><dc:creator>SPREAD</dc:creator>' +
    '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
    '</cp:coreProperties>';
  let entries = [
    { name : '[Content_Types].xml', text : types },
    { name : '_rels/.rels', text : package_relations },
    { name : 'docProps/core.xml', text : core },
    { name : 'xl/workbook.xml', text : workbook },
    { name : 'xl/_rels/workbook.xml.rels', text : workbook_relations },
    { name : 'xl/styles.xml', text : gtiz_xlsx.stylesXml() },
    { name : 'xl/sharedStrings.xml', text : shared },
    { name : 'xl/worksheets/sheet1.xml', text : sheet }
  ];
  let zip = await gtiz_zip.write(entries);
  return new Blob([zip], { type : gtiz_xlsx.mime });
}

/**
 * Index of a text in the shared strings, added when new
 *
 * The metadata repeat the same values a lot: each one is stored once.
 *
 * @param {Object} strings `{ index: Map, list: Array, count: Number }`
 * @param {String} value Text of the cell
 * @returns {Number} Index of the text
 */
gtiz_xlsx.sharedString = function(strings, value) {
  strings.count++;
  let index = strings.index.get(value);
  if (index === undefined) {
    index = strings.list.length;
    strings.index.set(value, index);
    strings.list.push(value);
  }
  return index;
}

/**
 * Styles of the written workbook
 *
 * Cell style 0 is the default one, 1 is Text (number format 49), 2 is bold Text
 * for the header.
 *
 * @returns {String} Xml of `xl/styles.xml`
 */
gtiz_xlsx.stylesXml = function() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="' + gtiz_xlsx.ns.main + '">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';
}

/*
*
* Reader
*
*/

/**
 * Elements of a parsed xml by local name, whatever their prefix
 *
 * @param {Node} node Document or element
 * @param {String} name Local name, e.g. `c`
 * @returns {Array} Elements
 */
gtiz_xlsx.elements = function(node, name) {
  return Array.from(node.getElementsByTagNameNS('*', name));
}

/**
 * Child elements of an element by local name
 *
 * @param {Element} node Parent element
 * @param {String} name Local name
 * @returns {Array} Direct children with that name
 */
gtiz_xlsx.children = function(node, name) {
  return Array.from(node.children).filter(child => child.localName === name);
}

/**
 * Parse an xml part of the workbook
 *
 * @param {Object} files Map of the archive, see `gtiz_zip.read`
 * @param {String} path Path of the part inside the archive
 * @param {Boolean} required True when a missing part makes the file unreadable
 * @returns {Promise<Document|undefined>} Parsed document, undefined when missing and not required
 */
gtiz_xlsx.parsePart = async function(files, path, required) {
  let file = files[path];
  if (!file) {
    if (required) {
      throw gtiz_xlsx.error('unreadable', 'Missing part of the workbook: ' + path);
    }
    return undefined;
  }
  let xml = new DOMParser().parseFromString(await file.text(), 'application/xml');
  if (xml.getElementsByTagName('parsererror').length > 0) {
    throw gtiz_xlsx.error('unreadable', 'Malformed part of the workbook: ' + path);
  }
  return xml;
}

/**
 * Resolve the target of a relationship to a path inside the archive
 *
 * @param {String} base Folder of the part holding the relationship, e.g. `xl/`
 * @param {String} target Target of the relationship, relative or absolute
 * @returns {String} Path inside the archive
 */
gtiz_xlsx.resolvePath = function(base, target) {
  let parts = (target.startsWith('/') ? target.substring(1) : base + target).split('/');
  let path = [];
  parts.forEach(part => {
    if (part === '..') {
      path.pop();
    } else if (part !== '.' && part !== '') {
      path.push(part);
    }
  });
  return path.join('/');
}

/**
 * Relationships of a part, by id and by type
 *
 * @param {Object} files Map of the archive
 * @param {String} rels_path Path of the `.rels` part
 * @param {String} base Folder the targets are relative to
 * @returns {Promise<Array>} Relationships `{ id, type, path }`
 */
gtiz_xlsx.relationships = async function(files, rels_path, base) {
  let xml = await gtiz_xlsx.parsePart(files, rels_path, false);
  if (!xml) {
    return [];
  }
  return gtiz_xlsx.elements(xml, 'Relationship').map(rel => ({
    id : rel.getAttribute('Id'),
    type : rel.getAttribute('Type') || '',
    path : gtiz_xlsx.resolvePath(base, rel.getAttribute('Target') || '')
  }));
}

/**
 * Text of a shared or inline string, rich text runs included
 *
 * Phonetic guides (`rPh`) are not part of the text.
 *
 * @param {Element} node `si` or `is` element
 * @returns {String} Text
 */
gtiz_xlsx.stringText = function(node) {
  return gtiz_xlsx.elements(node, 't')
    .filter(t => !t.parentElement || t.parentElement.localName !== 'rPh')
    .map(t => t.textContent)
    .join('');
}

/**
 * Tell if a number format shows a date or a time
 *
 * @param {Number} id Number format id
 * @param {String} code Format code of a custom format (optional)
 * @returns {Boolean} True for dates and times
 */
gtiz_xlsx.isDateFormat = function(id, code) {
  if (gtiz_xlsx.date_formats.includes(id)) {
    return true;
  }
  if (!code) {
    return false;
  }
  // texts in quotes, escaped characters and bracketed parts (colours, locales) are not tokens
  let tokens = code
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[(?!h+\]|m+\]|s+\])[^\]]*\]/gi, '')
    .toLowerCase();
  if (tokens.includes('general')) {
    return false;
  }
  return /[dmyhs]/.test(tokens);
}

/**
 * Text of a number as a spreadsheet shows it, without floating point noise
 *
 * Excel works with 15 significant digits: `0.30000000000000004` is `0.3`.
 *
 * @param {String} value Stored value
 * @returns {String} Number as text, the stored value when it is not a number
 */
gtiz_xlsx.formatNumber = function(value) {
  let number = Number(value);
  if (value === '' || !isFinite(number)) {
    return value;
  }
  return String(parseFloat(number.toPrecision(15)));
}

/**
 * Text of a date or time stored as a serial number
 *
 * Dates become `yyyy-mm-dd`, with ` hh:mm:ss` only when they have a time; a time
 * without date becomes `hh:mm:ss`. Excel counts the days from 1900 (with the
 * nonexistent 29 February 1900 of Lotus 1-2-3) or, with `date1904`, from 1904.
 *
 * @param {String} value Stored value
 * @param {Boolean} date1904 True for the 1904 date system
 * @returns {String} Date as text, the number when it is not a valid date
 */
gtiz_xlsx.formatDate = function(value, date1904) {
  let serial = Number(value);
  if (value === '' || !isFinite(serial) || serial < 0) {
    return gtiz_xlsx.formatNumber(value);
  }
  let pad = (n) => String(n).padStart(2, '0');
  let days = Math.floor(serial);
  let seconds = Math.round((serial - days) * 86400);
  if (seconds === 86400) {
    days++;
    seconds = 0;
  }
  let time = pad(Math.floor(seconds / 3600)) + ':' + pad(Math.floor(seconds % 3600 / 60)) + ':' + pad(seconds % 60);
  if (days === 0 && !date1904) {
    return time;
  }
  let date;
  if (!date1904 && days === 60) {
    date = '1900-02-29';
  } else {
    // days from 1970-01-01: 25569 in the 1900 system (after 28 February 1900), 24107 in the 1904 one
    let offset = date1904 ? 24107 : (days < 60 ? 25568 : 25569);
    let day = new Date((days - offset) * 86400000);
    date = day.getUTCFullYear() + '-' + pad(day.getUTCMonth() + 1) + '-' + pad(day.getUTCDate());
  }
  return seconds > 0 ? date + ' ' + time : date;
}

/**
 * Read the first sheet of an xlsx workbook
 *
 * Cells are read by their reference, the omitted ones are empty. Every value
 * becomes text: shared and inline strings, booleans (`TRUE`/`FALSE`), errors
 * (e.g. `#N/A`), numbers without floating point noise, dates as `yyyy-mm-dd`,
 * the last calculated value of formulas. Tabs and line breaks inside a cell
 * become a space, they would break the tab separated text.
 *
 * @param {Blob} blob The .xlsx file
 * @returns {Promise<Object>} `{ sheet, rows, notices }`: name of the sheet read,
 * rows as arrays of texts (empty rows dropped, all as long as the longest one),
 * notices `{ code, sheet }` with `code` `more_sheets` or `formulas_without_values`
 */
gtiz_xlsx.read = async function(blob) {
  let files;
  try {
    files = await gtiz_zip.read(blob);
  } catch (error) {
    throw gtiz_xlsx.error('unreadable', error.message);
  }
  let notices = [];
  // workbook: from the package relationships, xl/workbook.xml by default
  let package_rels = await gtiz_xlsx.relationships(files, '_rels/.rels', '');
  let office = package_rels.find(rel => rel.type.endsWith('/officeDocument'));
  let workbook_path = office ? office.path : 'xl/workbook.xml';
  let workbook_base = workbook_path.substring(0, workbook_path.lastIndexOf('/') + 1);
  let workbook_rels_path = workbook_base + '_rels/' + workbook_path.substring(workbook_base.length) + '.rels';
  let workbook = await gtiz_xlsx.parsePart(files, workbook_path, true);
  let workbook_rels = await gtiz_xlsx.relationships(files, workbook_rels_path, workbook_base);
  let properties = gtiz_xlsx.elements(workbook, 'workbookPr')[0];
  let date1904 = properties ? ['1', 'true'].includes(properties.getAttribute('date1904')) : false;
  // first sheet in the order of the tabs
  let sheets = gtiz_xlsx.elements(workbook, 'sheet');
  if (sheets.length === 0) {
    throw gtiz_xlsx.error('unreadable', 'The workbook has no sheets');
  }
  let first = sheets[0];
  let sheet_name = first.getAttribute('name') || '';
  // r:id, in the transitional or in the strict namespace of the relationships
  let id_attribute = Array.from(first.attributes).find(attribute => attribute.localName === 'id' && attribute.namespaceURI);
  let sheet_id = id_attribute ? id_attribute.value : undefined;
  let sheet_rel = workbook_rels.find(rel => rel.id === sheet_id);
  if (!sheet_rel) {
    throw gtiz_xlsx.error('unreadable', 'Missing relationship of the first sheet');
  }
  if (sheets.length > 1) {
    notices.push({ code : 'more_sheets', sheet : sheet_name });
  }
  // shared strings and number formats of the cell styles
  let shared_rel = workbook_rels.find(rel => rel.type.endsWith('/sharedStrings'));
  let shared_xml = shared_rel ? await gtiz_xlsx.parsePart(files, shared_rel.path, false) : undefined;
  let shared = shared_xml ? gtiz_xlsx.elements(shared_xml, 'si').map(si => gtiz_xlsx.stringText(si)) : [];
  let styles_rel = workbook_rels.find(rel => rel.type.endsWith('/styles'));
  let styles_xml = styles_rel ? await gtiz_xlsx.parsePart(files, styles_rel.path, false) : undefined;
  let date_styles = [];
  if (styles_xml) {
    let codes = {};
    gtiz_xlsx.elements(styles_xml, 'numFmt').forEach(format => {
      codes[format.getAttribute('numFmtId')] = format.getAttribute('formatCode');
    });
    let cell_xfs = gtiz_xlsx.elements(styles_xml, 'cellXfs')[0];
    if (cell_xfs) {
      date_styles = gtiz_xlsx.children(cell_xfs, 'xf').map(xf => {
        let id = parseInt(xf.getAttribute('numFmtId') || '0', 10);
        return gtiz_xlsx.isDateFormat(id, codes[id]);
      });
    }
  }
  let sheet = await gtiz_xlsx.parsePart(files, sheet_rel.path, true);
  // merged cells: SPREAD does not guess what an area spanning several cells means
  if (gtiz_xlsx.elements(sheet, 'mergeCell').length > 0) {
    throw gtiz_xlsx.error('merged', 'The first sheet has merged cells');
  }
  let rows = [];
  let width = 0;
  let formulas_without_values = false;
  let row_index = -1;
  gtiz_xlsx.elements(sheet, 'row').forEach(row => {
    let r = parseInt(row.getAttribute('r'), 10);
    row_index = isNaN(r) ? row_index + 1 : r - 1;
    let values = [];
    let column = -1;
    gtiz_xlsx.children(row, 'c').forEach(cell => {
      let ref_column = gtiz_xlsx.columnIndex(cell.getAttribute('r'));
      column = ref_column >= 0 ? ref_column : column + 1;
      let type = cell.getAttribute('t') || 'n';
      let v = gtiz_xlsx.children(cell, 'v')[0];
      let raw = v ? v.textContent : '';
      let value = '';
      if (type === 's') {
        value = raw === '' ? '' : (shared[parseInt(raw, 10)] || '');
      } else if (type === 'inlineStr') {
        let is = gtiz_xlsx.children(cell, 'is')[0];
        value = is ? gtiz_xlsx.stringText(is) : '';
      } else if (type === 'b') {
        value = raw === '' ? '' : (raw === '1' || raw === 'true' ? 'TRUE' : 'FALSE');
      } else if (type === 'str' || type === 'e' || type === 'd') {
        value = raw;
      } else {
        let style = parseInt(cell.getAttribute('s') || '0', 10);
        value = date_styles[style] ? gtiz_xlsx.formatDate(raw, date1904) : gtiz_xlsx.formatNumber(raw);
      }
      if (!v && gtiz_xlsx.children(cell, 'f').length > 0 && type !== 'inlineStr') {
        formulas_without_values = true;
      }
      values[column] = value.replace(/[\t\r\n]+/g, ' ');
    });
    // rows without any text are dropped, like the empty lines of a tsv
    let filled = values.some(value => value !== undefined && value.trim() !== '');
    if (filled) {
      let last = values.length - 1;
      while (last >= 0 && (values[last] === undefined || values[last] === '')) {
        last--;
      }
      width = Math.max(width, last + 1);
      rows.push(values);
    }
  });
  if (formulas_without_values) {
    notices.push({ code : 'formulas_without_values', sheet : sheet_name });
  }
  // every row as long as the longest one: the omitted cells are empty
  rows = rows.map(values => {
    let full = [];
    for (let c = 0; c < width; c++) {
      full.push(values[c] === undefined ? '' : values[c]);
    }
    return full;
  });
  return { sheet : sheet_name, rows : rows, notices : notices };
}

/**
 * Read the first sheet of an xlsx workbook as tab separated text
 *
 * The first row is the header. The text goes to the metadata loader like the
 * contents of a .tsv file.
 *
 * @param {Blob} blob The .xlsx file
 * @returns {Promise<Object>} `{ text, sheet, notices }`, see `gtiz_xlsx.read`
 */
gtiz_xlsx.toTsv = async function(blob) {
  let data = await gtiz_xlsx.read(blob);
  if (data.rows.length === 0) {
    throw gtiz_xlsx.error('unreadable', 'The first sheet is empty');
  }
  let text = data.rows.map(row => row.join('\t')).join('\n') + '\n';
  return { text : text, sheet : data.sheet, notices : data.notices };
}

/**
 * Split a tab separated text into header and rows, e.g. the text exported by
 * the metadata grid, to write it as xlsx
 *
 * @param {String} text Tab separated text, first line as header
 * @returns {Object} `{ header, rows }`
 */
gtiz_xlsx.splitTsv = function(text) {
  let lines = String(text || '').split(/\r\n|\r|\n/g);
  // the last line break leaves an empty line
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  let header = lines.length > 0 ? lines[0].split('\t') : [];
  let rows = lines.slice(1).map(line => line.split('\t'));
  return { header : header, rows : rows };
}
