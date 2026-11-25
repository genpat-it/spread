let gtiz_zip = {};

/*
*
* Minimal zip writer/reader built on the browser native `CompressionStream` and
* `DecompressionStream` (deflate-raw). It covers what SPREAD packages need:
* text and binary files (e.g. the images of a notes export or of a docx), deflate
* (method 8) or stored (method 0) entries, UTF-8 names.
* Zip64 and encrypted archives are not supported and raise an error.
*
*/

/*
*
* Zip record signatures and limits of the standard (non Zip64) format
*
*/
gtiz_zip.signatures = {
  local : 0x04034b50,
  central : 0x02014b50,
  end : 0x06054b50
};
gtiz_zip.max_entries = 0xFFFF;
gtiz_zip.max_size = 0xFFFFFFFF;

/*
*
* CRC32 lookup table, built once on first use
*
*/
gtiz_zip.crc_table = undefined;

/**
 * Compute the CRC32 checksum required by the zip format
 *
 * @param {Uint8Array} data Bytes to checksum
 * @returns {Number} Unsigned 32 bit checksum
 */
gtiz_zip.crc32 = function(data) {
  if (!gtiz_zip.crc_table) {
    gtiz_zip.crc_table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      }
      gtiz_zip.crc_table[n] = c >>> 0;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = gtiz_zip.crc_table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Pipe bytes through a native compression or decompression stream
 *
 * @param {Uint8Array} data Input bytes
 * @param {CompressionStream|DecompressionStream} stream Transform stream to use
 * @returns {Promise<Uint8Array>} Transformed bytes
 */
gtiz_zip.transform = async function(data, stream) {
  let response = new Response(new Blob([data]).stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Convert a date to the MS-DOS time and date fields used by zip headers
 *
 * @param {Date} date Date to convert
 * @returns {Object} `{ time, date }` as 16 bit numbers
 */
gtiz_zip.toDosDateTime = function(date) {
  return {
    time : (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date : ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

/**
 * Build a zip archive from a list of text or binary entries
 *
 * @param {Array} entries Array of `{ name, text }` or `{ name, data }`, `name` is the
 * path inside the archive, `data` the bytes (`Uint8Array`) of a binary file
 * @returns {Promise<Blob>} The zip archive
 */
gtiz_zip.write = async function(entries) {
  if (entries.length > gtiz_zip.max_entries) {
    throw new Error('Too many entries for a standard zip: ' + entries.length);
  }
  let encoder = new TextEncoder();
  let stamp = gtiz_zip.toDosDateTime(new Date());
  let parts = [];
  let central = [];
  let offset = 0;
  for (let entry of entries) {
    let name = encoder.encode(entry.name);
    // binary files are stored as they are, texts as UTF-8
    let raw = entry.data instanceof Uint8Array ? entry.data : encoder.encode(entry.text);
    let compressed = await gtiz_zip.transform(raw, new CompressionStream('deflate-raw'));
    let crc = gtiz_zip.crc32(raw);
    if (offset + compressed.length > gtiz_zip.max_size || raw.length > gtiz_zip.max_size) {
      throw new Error('Archive too large for a standard zip');
    }
    // local file header
    let local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, gtiz_zip.signatures.local, true);
    local.setUint16(4, 20, true); // version needed to extract
    local.setUint16(6, 0x0800, true); // flags: UTF-8 names
    local.setUint16(8, 8, true); // method: deflate
    local.setUint16(10, stamp.time, true);
    local.setUint16(12, stamp.date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, compressed.length, true);
    local.setUint32(22, raw.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true); // extra field length
    parts.push(local.buffer, name, compressed);
    // matching central directory record
    let record = new DataView(new ArrayBuffer(46));
    record.setUint32(0, gtiz_zip.signatures.central, true);
    record.setUint16(4, 20, true); // version made by
    record.setUint16(6, 20, true); // version needed to extract
    record.setUint16(8, 0x0800, true);
    record.setUint16(10, 8, true);
    record.setUint16(12, stamp.time, true);
    record.setUint16(14, stamp.date, true);
    record.setUint32(16, crc, true);
    record.setUint32(20, compressed.length, true);
    record.setUint32(24, raw.length, true);
    record.setUint16(28, name.length, true);
    record.setUint32(42, offset, true); // local header offset, other fields stay 0
    central.push(record.buffer, name);
    offset += 30 + name.length + compressed.length;
  }
  let central_size = central.reduce((sum, part) => sum + part.byteLength, 0);
  // end of central directory record
  let end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, gtiz_zip.signatures.end, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, central_size, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type : 'application/zip' });
}

/**
 * Read the index of a zip archive
 *
 * Only the central directory is read here: each file is extracted and inflated
 * when its `text()` (decoded as UTF-8) or `data()` (bytes) method is called, so
 * large archives do not fill the memory.
 *
 * @param {Blob} blob Zip archive (a `File` works as well)
 * @returns {Promise<Object>} Map of `path -> { size, text(), data() }`, directories excluded
 */
gtiz_zip.read = async function(blob) {
  // the end record sits in the last 22 bytes plus an optional comment (max 65535)
  let tail_start = Math.max(0, blob.size - 22 - 0xFFFF);
  let tail = new DataView(await blob.slice(tail_start).arrayBuffer());
  let end_pos = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === gtiz_zip.signatures.end) {
      end_pos = i;
      break;
    }
  }
  if (end_pos === -1) {
    throw new Error('Not a zip archive');
  }
  let count = tail.getUint16(end_pos + 10, true);
  let central_size = tail.getUint32(end_pos + 12, true);
  let central_offset = tail.getUint32(end_pos + 16, true);
  if (count === 0xFFFF || central_size === 0xFFFFFFFF || central_offset === 0xFFFFFFFF) {
    throw new Error('Zip64 archives are not supported');
  }
  let central = new DataView(await blob.slice(central_offset, central_offset + central_size).arrayBuffer());
  let decoder = new TextDecoder('utf-8');
  let files = {};
  let pos = 0;
  for (let i = 0; i < count; i++) {
    if (central.getUint32(pos, true) !== gtiz_zip.signatures.central) {
      throw new Error('Corrupted zip central directory');
    }
    let flags = central.getUint16(pos + 8, true);
    let method = central.getUint16(pos + 10, true);
    let compressed_size = central.getUint32(pos + 20, true);
    let size = central.getUint32(pos + 24, true);
    let name_length = central.getUint16(pos + 28, true);
    let extra_length = central.getUint16(pos + 30, true);
    let comment_length = central.getUint16(pos + 32, true);
    let local_offset = central.getUint32(pos + 42, true);
    // names are read as UTF-8 even without the flag, as macOS Finder writes them
    let name = decoder.decode(new Uint8Array(central.buffer, pos + 46, name_length));
    pos += 46 + name_length + extra_length + comment_length;
    if (name.endsWith('/')) {
      continue;
    }
    if (flags & 0x0001) {
      throw new Error('Encrypted zip archives are not supported');
    }
    if (method !== 0 && method !== 8) {
      throw new Error('Unsupported zip compression method: ' + method);
    }
    files[name] = {
      size : size,
      text : () => gtiz_zip.extract(blob, local_offset, compressed_size, method),
      // bytes of a binary file, e.g. an xlsx inside a package
      data : () => gtiz_zip.extractData(blob, local_offset, compressed_size, method)
    };
  }
  return files;
}

/**
 * Extract and decode a single file of a zip archive
 *
 * @param {Blob} blob Zip archive
 * @param {Number} local_offset Offset of the file local header
 * @param {Number} compressed_size Size of the stored data
 * @param {Number} method Compression method, 0 (stored) or 8 (deflate)
 * @returns {Promise<String>} File contents as text
 */
gtiz_zip.extract = async function(blob, local_offset, compressed_size, method) {
  let data = await gtiz_zip.extractData(blob, local_offset, compressed_size, method);
  return new TextDecoder('utf-8').decode(data);
}

/**
 * Extract a single file of a zip archive as bytes
 *
 * @param {Blob} blob Zip archive
 * @param {Number} local_offset Offset of the file local header
 * @param {Number} compressed_size Size of the stored data
 * @param {Number} method Compression method, 0 (stored) or 8 (deflate)
 * @returns {Promise<Uint8Array>} File contents
 */
gtiz_zip.extractData = async function(blob, local_offset, compressed_size, method) {
  let header = new DataView(await blob.slice(local_offset, local_offset + 30).arrayBuffer());
  if (header.getUint32(0, true) !== gtiz_zip.signatures.local) {
    throw new Error('Corrupted zip local header');
  }
  // local name and extra fields may differ from the central ones, so we read them here
  let start = local_offset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  let data = new Uint8Array(await blob.slice(start, start + compressed_size).arrayBuffer());
  if (method === 8) {
    data = await gtiz_zip.transform(data, new DecompressionStream('deflate-raw'));
  }
  return data;
}
