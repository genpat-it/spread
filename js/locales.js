let gtiz_locales = {};

gtiz_locales.user_lang = undefined;

/*
*
* Language explicitly requested by url through the `lang` parameter. It is the
* switch of the metadata localization: localized metadata files are looked up
* only when the user asked for a language, never on browser language detection.
*
*/
gtiz_locales.url_lang = undefined;

gtiz_locales.languages = [];

gtiz_locales.current = {};

gtiz_locales.body = document.querySelector('body');
gtiz_locales.change_language_label = document.querySelector('.tool-lang .tool-label');
gtiz_locales.change_language_trigger = document.querySelector('.tool-lang .tool-trigger');
gtiz_locales.close_modal_trigger = document.querySelector('.modal-close');

gtiz_locales.getActiveLanguageCode = function() {
  let languages = gtiz_locales.languages;
  let language = languages.find(element => element.active);
  let code = language ? language.code : 'en';
  return code;
}

gtiz_locales.getActiveLanguageTerms = function() {
  let languages = gtiz_locales.languages;
  let language = languages.find(element => element.active);
  let code = language ? language.code : 'en';
  let terms = { ...gtiz_languages[code]};
  Object.keys(terms).forEach(key => {
    terms[key] = terms[key];
  });
  return terms;
}

/*
*
* Metadata localization
*
* Metadata can be provided in localized variants named `filename_[lang].tsv`
* and placed beside the default file. A localized file translates both column
* headers and values, so the technical columns other components look up by name
* (map coordinates, zooms category) must be declared to stay resolvable: by the
* deployment in `app.json` under `metadata_localization.technical_columns`, or
* by the dataset in a `filename_[lang].json` mapping file placed beside the
* localized metadata, which has precedence. Columns not declared anywhere are
* considered not translatable and must keep their expected header.
*
* The whole feature is switched by `metadata_localization.enabled` in `app.json`:
* when off, or when the block is missing, no localized file is looked up and no
* declaration is read, so the application behaves as it did before the feature.
*
*/

/**
 * Get the `metadata_localization` block of `app.json`
 *
 * @returns Object of the block, empty when missing
 */
gtiz_locales.getMetadataLocalizationCfg = function() {
  // app.json is fetched by gtiz_app.init(), later than this file is parsed, so we read the config lazily
  let cfg = typeof gtiz_app !== 'undefined' && gtiz_app.cfg ? gtiz_app.cfg.metadata_localization : undefined;
  return cfg && typeof cfg === 'object' ? cfg : {};
}

/**
 * Tell whether the metadata localization is enabled by `app.json`
 *
 * @returns true/false
 */
gtiz_locales.isMetadataLocalizationEnabled = function() {
  return gtiz_locales.getMetadataLocalizationCfg().enabled === true;
}

/**
 * Get the technical columns declared by `app.json`, empty when the feature is off
 *
 * @returns Object of declarations by canonical column key
 */
gtiz_locales.getTechnicalColumnsCfg = function() {
  if (!gtiz_locales.isMetadataLocalizationEnabled()) {
    return {};
  }
  let columns = gtiz_locales.getMetadataLocalizationCfg().technical_columns;
  return columns && typeof columns === 'object' ? columns : {};
}

/**
 * Get the normalized code of the language explicitly requested by url
 *
 * @returns String of the language code, `undefined` when no `lang` parameter is in the url
 */
gtiz_locales.getUrlLanguageCode = function() {
  if (!gtiz_locales.url_lang) {
    return undefined;
  }
  // the normalized code of the active language, so `?lang=it-IT` gives `it` and an
  // unsupported language falls back the way the ui does
  return gtiz_locales.getActiveLanguageCode();
}

/**
 * Get the language code to use when looking up localized metadata files
 *
 * @returns String of the language code, `undefined` when localized metadata must not be used
 */
gtiz_locales.getMetadataLanguageCode = function() {
  if (!gtiz_locales.isMetadataLocalizationEnabled()) {
    return undefined;
  }
  return gtiz_locales.getUrlLanguageCode();
}

/**
 * Get the technical column name declared in `app.json` for the active language
 *
 * @param {String} key Canonical column key, e.g. `latitude`
 * @returns String of the declared name, `undefined` when the column is not declared
 */
gtiz_locales.getDeclaredTechnicalColumnName = function(key) {
  // a mapping file placed beside the localized metadata declares the names of that
  // dataset, so it has precedence over the defaults of the deployment
  let mapping = typeof gtiz_file_handler !== 'undefined' ? gtiz_file_handler.metadata_mapping : undefined;
  if (mapping && mapping.columns && typeof mapping.columns[key] === 'string' && mapping.columns[key] !== '') {
    return mapping.columns[key];
  }
  let column = gtiz_locales.getTechnicalColumnsCfg()[key];
  if (!column) {
    return undefined;
  }
  let code = gtiz_locales.getActiveLanguageCode();
  return column[code] ? column[code] : column['default'];
}

/**
 * Get the translation declared in `app.json` for a value of a technical column
 *
 * Some values are identifiers, like the samples of interest marker held by the
 * `category` column. A localized file may translate them only when the
 * translation is declared under the `values` entry of the column.
 *
 * @param {String} key Canonical column key, e.g. `category`
 * @param {String} value Canonical value, e.g. `sample of interest`
 * @returns String of the declared value, `undefined` when it is not declared
 */
gtiz_locales.getDeclaredTechnicalValue = function(key, value) {
  // same precedence as the columns: the mapping file of the dataset first
  let mapping = typeof gtiz_file_handler !== 'undefined' ? gtiz_file_handler.metadata_mapping : undefined;
  let mapped = mapping && mapping.values && mapping.values[key] ? mapping.values[key][value] : undefined;
  if (typeof mapped === 'string' && mapped !== '') {
    return mapped;
  }
  let column = gtiz_locales.getTechnicalColumnsCfg()[key];
  let declared = column && column.values ? column.values[value] : undefined;
  if (!declared) {
    return undefined;
  }
  let code = gtiz_locales.getActiveLanguageCode();
  return declared[code] ? declared[code] : declared['default'];
}

/**
 * Get the value standing for a canonical value of a technical column
 *
 * Same resolution order as `getTechnicalColumnName`: the values already resolved
 * for the metadata in memory, then the `app.json` declarations, then the
 * canonical value. A value is accepted only when it is really present in the
 * column.
 *
 * @param {String} key Canonical column key, e.g. `category`
 * @param {String} value Canonical value, e.g. `sample of interest`
 * @param {Array} values Distinct values of the column in the loaded metadata
 * @returns String of the value to use
 */
gtiz_locales.getTechnicalValue = function(key, value, values) {
  let candidates = [];
  let resolved = typeof gtiz_file_handler !== 'undefined' ? gtiz_file_handler.technical_values : undefined;
  if (resolved && resolved[key] && resolved[key][value]) {
    candidates.push(resolved[key][value]);
  }
  let declared = gtiz_locales.getDeclaredTechnicalValue(key, value);
  if (declared) {
    candidates.push(declared);
  }
  candidates.push(value);
  if (!values || values.length === 0) {
    return candidates[0];
  }
  let match = candidates.find(candidate => values.includes(candidate));
  return match ? match : value;
}

/**
 * Get the header name standing for a canonical technical metadata column
 *
 * Resolution order: the names already resolved for the metadata in memory (also
 * restored from a complete json, whose author may have a different `app.json`),
 * then the `app.json` declarations for the active language, then the canonical
 * key itself. A name is accepted only when it is really present in the headers.
 *
 * @param {String} key Canonical column key, e.g. `latitude`
 * @param {Array || Object} headers Column headers of the loaded metadata, as an array or as a hash of titles
 * @returns String of the column name to use
 */
gtiz_locales.getTechnicalColumnName = function(key, headers) {
  let candidates = [];
  let resolved = typeof gtiz_file_handler !== 'undefined' ? gtiz_file_handler.technical_columns : undefined;
  if (resolved && resolved[key]) {
    candidates.push(resolved[key]);
  }
  let declared = gtiz_locales.getDeclaredTechnicalColumnName(key);
  if (declared) {
    candidates.push(declared);
  }
  candidates.push(key);
  let list = Array.isArray(headers) ? headers : Object.keys(headers ? headers : {});
  if (list.length === 0) {
    return candidates[0];
  }
  let match = candidates.find(name => list.includes(name));
  return match ? match : key;
}

/**
 * Align the `lang` url parameter with the language of the loaded data
 *
 * We use `history.replaceState` on purpose: changing language by url means a
 * page reload, which would throw away data loaded by drag and drop.
 *
 * @param {String} lang Language code to write in the url
 */
gtiz_locales.syncUrlLanguage = function(lang) {
  if (!lang || !window.history || !window.history.replaceState) {
    return;
  }
  let url = new URL(window.location.href);
  if (url.searchParams.get('lang') === lang) {
    return;
  }
  url.searchParams.set('lang', lang);
  window.history.replaceState({}, '', url.toString());
  gtiz_locales.url_lang = lang;
  // `changeLanguage()` compares the requested code with `user_lang`, so a stale
  // browser value would make it refuse a legitimate change after a json load
  gtiz_locales.user_lang = lang;
}

/**
 * Translate page UI with gtiz_locales terms
 * 
 * @param {DOM Node} container A DOM node containing elements to translate
 */
gtiz_locales.translate = function (container) {
  let languages = gtiz_locales.languages;
  let language = languages.find(element => element.active);
  let code = language ? language.code : 'en';
  let terms = gtiz_languages[code];
  gtiz_locales.change_language_label.innerHTML = code;
  let nodes = !container ? document.querySelectorAll('[data-i18n-key]') : container.querySelectorAll('[data-i18n-key]');
  if (nodes && nodes.length > 0) {
    nodes.forEach(element => {
      let key = element.getAttribute("data-i18n-key");
      let translation = key ? terms[key] : undefined;
      if (translation) {
        // an accessible name, e.g. of a search field labelled only by its placeholder
        if (element.hasAttribute('aria-label')) {
          let text = document.createElement('textarea');
          text.innerHTML = translation;
          element.setAttribute('aria-label', text.value);
        }
        if (element.hasAttribute('placeholder')) {
          element.setAttribute('placeholder', translation);
        } else {
          element.innerHTML = translation;
        }
      }
    });
  }
}

gtiz_locales.setLanguagesCfg = function(lang) {

  gtiz_locales.languages = Object.keys(gtiz_languages).map(code => ({
    code: code,
    description: gtiz_languages[code]['_description'] || code,
    active: false
  }));
  
  if (gtiz_locales.languages.length === 0) {
    console.warn('No languages found in gtiz_languages object.');
    gtiz_locales.languages = [{
      code: 'en',
      description: 'English',
      active: true
    }];
    return;
  }

  gtiz_locales.languages.forEach(obj => {
    if (lang.includes(obj.code)) {
      obj.active = true;
    } else {
      obj.active = false;
    }
  });
}

gtiz_locales.setLanguage = function(lang) {
  gtiz_locales.setLanguagesCfg(lang);
  gtiz_locales.translate();
}

/**
 * Change the ui language by reloading the page with the `lang` parameter
 *
 * Choosing the language already in use is a no-op, except when `lang` is not in
 * the url and the metadata localization is on: the parameter is what triggers
 * the lookup of the localized metadata, so the user must be able to pin the
 * current language in the url to get them, and to share a link that carries it.
 *
 * @param {String} lang Language code chosen by the user
 * @returns true when a reload has been requested, false otherwise
 */
gtiz_locales.changeLanguage = function(lang) {
  if (!lang) {
    return false;
  }
  // compare normalized codes, `user_lang` may be a browser value such as `en-US`
  let same = lang === gtiz_locales.getActiveLanguageCode();
  let pin = !gtiz_locales.url_lang && gtiz_locales.isMetadataLocalizationEnabled();
  if (same && !pin) {
    return false;
  }
  let url = new URL(window.location.href);
  let params = new URLSearchParams(url.search);
  params.set('lang', lang);
  window.location.href = '?' + params.toString();
  return true;
}

/*
*
* Language panel, opened from the language trigger of the toolbar as the panels of
* the macros and of the search (section `.languages`, body class `show-languages`,
* closed with its icon or with Esc). The select shows the language in use and each
* language with its code; choosing another one reloads the page with `lang`.
*
*/
gtiz_locales.panel_close = document.querySelector('.languages-close');

/**
 * Build the contents of the language panel in the language in use
 *
 * @returns {undefined}
 */
gtiz_locales.buildLanguagesPanel = function() {
  let body = document.querySelector('.languages-body');
  if (!body) {
    return;
  }
  body.replaceChildren();
  let code = gtiz_locales.getActiveLanguageCode();
  let terms = gtiz_languages[code];
  // select of the languages, as the selects of the modals
  let select_box = document.createElement('div');
  select_box.setAttribute('class', 'select-box');
  let label = document.createElement('div');
  label.setAttribute('class', 'form-label');
  let icon = document.createElement('i');
  icon.setAttribute('class', 'tabler tabler-world');
  label.append(icon, document.createTextNode(' ' + terms.select_language));
  let select = document.createElement('select');
  select.setAttribute('id', 'languages-select');
  select.setAttribute('aria-label', terms.select_language);
  gtiz_locales.languages.forEach(element => {
    let option = document.createElement('option');
    option.setAttribute('value', element.code);
    option.textContent = element.description + ' - ' + element.code;
    option.selected = element.code === code;
    select.append(option);
  });
  select.addEventListener('change', function(event) {
    gtiz_locales.changeLanguage(event.target.value);
  });
  select_box.append(label, select);
  body.append(select_box);
  // the page reloads: say it below the select, as the outcomes of the panels
  let feedback = document.createElement('div');
  feedback.setAttribute('class', 'languages-feedback');
  feedback.innerHTML = terms.change_language_alert;
  body.append(feedback);
};

/**
 * Open the language panel
 *
 * @returns {undefined}
 */
gtiz_locales.showLanguages = function() {
  if (gtiz_locales.body.classList.contains('show-languages')) {
    return;
  }
  gtiz_locales.buildLanguagesPanel();
  gtiz_locales.body.classList.add('show-languages');
  // focus once the panel has slid in, as the search field of the other panels
  setTimeout(() => {
    let select = document.getElementById('languages-select');
    if (select) {
      select.focus();
    }
  }, 600);
};

/**
 * Close the language panel
 *
 * @returns {undefined}
 */
gtiz_locales.closeLanguages = function() {
  gtiz_locales.body.classList.remove('show-languages');
};

/**
 * Open or close the language panel
 *
 * @returns {undefined}
 */
gtiz_locales.toggleLanguages = function() {
  if (gtiz_locales.body.classList.contains('show-languages')) {
    gtiz_locales.closeLanguages();
  } else {
    gtiz_locales.showLanguages();
  }
};

gtiz_locales.change_language_trigger.addEventListener('click', function(e) {
  gtiz_locales.toggleLanguages();
});

if (gtiz_locales.panel_close) {
  gtiz_locales.panel_close.addEventListener('click', function(e) {
    gtiz_locales.closeLanguages();
  });
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && gtiz_locales.body.classList.contains('show-languages')) {
    gtiz_locales.closeLanguages();
  }
});

gtiz_locales.init = function() {
  if (!gtiz_locales.user_lang) {
    let params = new URLSearchParams(document.location.search);
    let lang = params.get('lang');
    if (lang) {
      gtiz_locales.user_lang = lang;
      // only an explicit request enables the lookup of localized metadata files
      gtiz_locales.url_lang = lang;
    } else {
      let nav_lang = navigator.language || navigator.userLanguage;
      gtiz_locales.user_lang = nav_lang ? nav_lang : 'en-EN';
    }
    gtiz_locales.setLanguage(gtiz_locales.user_lang);
    gtiz_locales.current = gtiz_locales.getActiveLanguageTerms();
  }
}

gtiz_locales.init();
