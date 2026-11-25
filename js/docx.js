let gtiz_docx = {};

/*
*
* Minimal writer of Word documents (.docx, Office Open XML), built on the zip
* writer of the project (js/zip.js), with no external library. It covers what
* the report of the notes needs: headings, paragraphs with bold, italic and
* links, bulleted and numbered lists, png images, captions and one table.
*
* A document is described by a list of blocks:
* - `{ type: 'heading', level: 1-3, runs }`
* - `{ type: 'paragraph', runs, style }` (`style` optional, e.g. 'Caption')
* - `{ type: 'list', ordered, items: [runs] }`
* - `{ type: 'image', data: Uint8Array, width, height }` (png, size in pixels)
* - `{ type: 'table', header: [String], rows: [[String]] }`
* where `runs` is a list of `{ text, bold, italic, href, br }` (`br` for a line break).
*
*/

/*
*
* Page: A4 with 2 cm margins (twips), width of the text in EMU for the images
*
*/
gtiz_docx.page = { width : 11906, height : 16838, margin : 1134 };
gtiz_docx.emu_per_twip = 635;
gtiz_docx.max_image_height_emu = 7920000; // 22 cm

gtiz_docx.namespaces = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

/**
 * Escape a text for xml, dropping the characters xml does not allow
 *
 * @param {String} text Text
 * @returns {String} Escaped text
 */
gtiz_docx.escape = function(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/[^\x09\x0A\x0D\x20-퟿-�\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Xml of the runs of a paragraph
 *
 * @param {Array} runs Runs `{ text, bold, italic, href, br }`
 * @param {Object} state Document state (relations of the links)
 * @returns {String} Xml
 */
gtiz_docx.runsXml = function(runs, state) {
  return (runs || []).map(run => {
    if (run.br) {
      return '<w:r><w:br/></w:r>';
    }
    let props = '';
    if (run.href) {
      props += '<w:rStyle w:val="Hyperlink"/>';
    }
    if (run.bold) {
      props += '<w:b/>';
    }
    if (run.italic) {
      props += '<w:i/>';
    }
    let xml = '<w:r>' + (props ? '<w:rPr>' + props + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + gtiz_docx.escape(run.text) + '</w:t></w:r>';
    if (run.href) {
      // links are relations of the document, opened outside of it
      let id = 'rIdLink' + (state.links.length + 1);
      state.links.push({ id : id, target : run.href });
      xml = '<w:hyperlink r:id="' + id + '">' + xml + '</w:hyperlink>';
    }
    return xml;
  }).join('');
};

/**
 * Xml of a paragraph
 *
 * @param {Array} runs Runs
 * @param {String} style Paragraph style (optional)
 * @param {Object} state Document state
 * @param {String} extra Extra paragraph properties (optional)
 * @returns {String} Xml
 */
gtiz_docx.paragraphXml = function(runs, style, state, extra) {
  let props = (style ? '<w:pStyle w:val="' + style + '"/>' : '') + (extra || '');
  return '<w:p>' + (props ? '<w:pPr>' + props + '</w:pPr>' : '') + gtiz_docx.runsXml(runs, state) + '</w:p>';
};

/**
 * Xml of an inline png image, fitted in the width of the text
 *
 * @param {Object} block `{ data, width, height }`
 * @param {Object} state Document state (images)
 * @returns {String} Xml
 */
gtiz_docx.imageXml = function(block, state) {
  let index = state.images.length + 1;
  let id = 'rIdImage' + index;
  state.images.push({ id : id, name : 'image' + index + '.png', data : block.data });
  let max_width = (gtiz_docx.page.width - 2 * gtiz_docx.page.margin) * gtiz_docx.emu_per_twip;
  let ratio = block.width > 0 ? block.height / block.width : 0.6;
  let cx = max_width;
  let cy = Math.round(cx * ratio);
  if (cy > gtiz_docx.max_image_height_emu) {
    cy = gtiz_docx.max_image_height_emu;
    cx = Math.round(cy / ratio);
  }
  return '<w:p><w:pPr><w:pStyle w:val="Figure"/></w:pPr><w:r><w:drawing>' +
    '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
    '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
    '<wp:docPr id="' + index + '" name="Image ' + index + '"/>' +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic><pic:nvPicPr><pic:cNvPr id="' + index + '" name="image' + index + '.png"/><pic:cNvPicPr/></pic:nvPicPr>' +
    '<pic:blipFill><a:blip r:embed="' + id + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>' +
    '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
};

/**
 * Xml of a table of texts, the first row as header
 *
 * @param {Object} block `{ header, rows }`
 * @param {Object} state Document state
 * @returns {String} Xml
 */
gtiz_docx.tableXml = function(block, state) {
  let columns = block.header.length;
  let width = gtiz_docx.page.width - 2 * gtiz_docx.page.margin;
  let column_width = Math.floor(width / columns);
  let cell = (text, bold) => '<w:tc><w:tcPr><w:tcW w:w="' + column_width + '" w:type="dxa"/></w:tcPr>' +
    gtiz_docx.paragraphXml([{ text : text, bold : bold }], 'TableText', state) + '</w:tc>';
  let grid = '<w:tblGrid>' + block.header.map(() => '<w:gridCol w:w="' + column_width + '"/>').join('') + '</w:tblGrid>';
  // the header row repeats on every page
  let header = '<w:tr><w:trPr><w:tblHeader/></w:trPr>' + block.header.map(text => cell(text, true)).join('') + '</w:tr>';
  let rows = block.rows.map(row => '<w:tr>' + row.map(text => cell(text, false)).join('') + '</w:tr>').join('');
  return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="' + width + '" w:type="dxa"/></w:tblPr>' + grid + header + rows + '</w:tbl>' +
    // Word wants a paragraph after a table
    '<w:p/>';
};

/**
 * Xml of the body of the document
 *
 * @param {Array} blocks Blocks of the document
 * @param {Object} state Document state, filled with links, images and lists
 * @returns {String} Xml of `word/document.xml`
 */
gtiz_docx.documentXml = function(blocks, state) {
  let body = blocks.map(block => {
    switch (block.type) {
      case 'heading':
        return gtiz_docx.paragraphXml(block.runs, 'Heading' + Math.min(Math.max(block.level || 1, 1), 3), state);
      case 'list': {
        // every list has its own numbering, so a numbered list starts from 1
        let num = state.lists.length + 1;
        state.lists.push({ id : num, ordered : !!block.ordered });
        let numbering = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + num + '"/></w:numPr>';
        return block.items.map(runs => gtiz_docx.paragraphXml(runs, 'ListParagraph', state, numbering)).join('');
      }
      case 'image':
        return gtiz_docx.imageXml(block, state);
      case 'table':
        return gtiz_docx.tableXml(block, state);
      default:
        return gtiz_docx.paragraphXml(block.runs, block.style, state);
    }
  }).join('');
  let page = gtiz_docx.page;
  let section = '<w:sectPr><w:pgSz w:w="' + page.width + '" w:h="' + page.height + '"/>' +
    '<w:pgMar w:top="' + page.margin + '" w:right="' + page.margin + '" w:bottom="' + page.margin + '" w:left="' + page.margin + '" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document ' + gtiz_docx.namespaces + '><w:body>' + body + section + '</w:body></w:document>';
};

/**
 * Xml of the styles: normal text, three headings, title, caption, figure, list,
 * link, table text and a table with borders
 *
 * @returns {String} Xml of `word/styles.xml`
 */
gtiz_docx.stylesXml = function() {
  let font = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>';
  let paragraph = (id, name, ppr, rpr) => '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
    '<w:pPr>' + ppr + '</w:pPr><w:rPr>' + rpr + '</w:rPr></w:style>';
  let heading = (level, size, before) => paragraph('Heading' + level, 'heading ' + level,
    '<w:keepNext/><w:spacing w:before="' + before + '" w:after="120"/><w:outlineLvl w:val="' + (level - 1) + '"/>',
    '<w:b/><w:color w:val="1F3864"/><w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/>');
  let border = '<w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>' +
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>' +
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr>' + font + '<w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    paragraph('Title', 'Title', '<w:spacing w:after="240"/>', '<w:b/><w:color w:val="1F3864"/><w:sz w:val="44"/><w:szCs w:val="44"/>') +
    heading(1, 32, 360) + heading(2, 26, 300) + heading(3, 22, 200) +
    paragraph('Caption', 'caption', '<w:spacing w:after="240"/>', '<w:i/><w:color w:val="595959"/><w:sz w:val="18"/><w:szCs w:val="18"/>') +
    paragraph('Figure', 'Figure', '<w:keepNext/><w:spacing w:after="60"/>', '') +
    paragraph('ListParagraph', 'List Paragraph', '<w:spacing w:after="60"/><w:ind w:left="720"/><w:contextualSpacing/>', '') +
    paragraph('TableText', 'Table Text', '<w:spacing w:before="40" w:after="40"/>', '<w:sz w:val="19"/><w:szCs w:val="19"/>') +
    '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>' +
    '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders>' + border + '</w:tblBorders>' +
    '<w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
    '</w:styles>';
};

/**
 * Xml of the numbering: a bulleted and a numbered definition, one instance per list
 *
 * @param {Array} lists Lists of the document `{ id, ordered }`
 * @returns {String} Xml of `word/numbering.xml`
 */
gtiz_docx.numberingXml = function(lists) {
  let level = (ordered) => '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="' + (ordered ? 'decimal' : 'bullet') + '"/>' +
    '<w:lvlText w:val="' + (ordered ? '%1.' : '•') + '"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>';
  let abstracts = '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>' + level(false) + '</w:abstractNum>' +
    '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/>' + level(true) + '</w:abstractNum>';
  let nums = lists.map(list => '<w:num w:numId="' + list.id + '"><w:abstractNumId w:val="' + (list.ordered ? 1 : 0) + '"/>' +
    '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + abstracts + nums + '</w:numbering>';
};

/**
 * Build a Word document
 *
 * @param {Array} blocks Blocks of the document (see the top of this file)
 * @param {Object} options `{ title }` for the properties of the document (optional)
 * @returns {Promise<Blob>} The .docx file
 */
gtiz_docx.build = async function(blocks, options) {
  let state = { links : [], images : [], lists : [] };
  let document_xml = gtiz_docx.documentXml(blocks, state);
  let relations = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
    state.images.map(image => '<Relationship Id="' + image.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + image.name + '"/>').join('') +
    state.links.map(link => '<Relationship Id="' + link.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + gtiz_docx.escape(link.target) + '" TargetMode="External"/>').join('') +
    '</Relationships>';
  let types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="png" ContentType="image/png"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '</Types>';
  let package_relations = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '</Relationships>';
  let now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  let core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
    'xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<dc:title>' + gtiz_docx.escape(options && options.title ? options.title : '') + '</dc:title><dc:creator>SPREAD</dc:creator>' +
    '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
    '</cp:coreProperties>';
  let entries = [
    { name : '[Content_Types].xml', text : types },
    { name : '_rels/.rels', text : package_relations },
    { name : 'docProps/core.xml', text : core },
    { name : 'word/document.xml', text : document_xml },
    { name : 'word/styles.xml', text : gtiz_docx.stylesXml() },
    { name : 'word/numbering.xml', text : gtiz_docx.numberingXml(state.lists) },
    { name : 'word/_rels/document.xml.rels', text : relations },
    ...state.images.map(image => ({ name : 'word/media/' + image.name, data : image.data }))
  ];
  let zip = await gtiz_zip.write(entries);
  return new Blob([zip], { type : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
};
