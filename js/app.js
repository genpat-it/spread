let gtiz_app = {};

/*
*
* Resolved with the configuration of app.json once it has been read (undefined
* when it cannot be read): the modules that depend on it, as the assistant, wait
* for it
*
*/
gtiz_app.ready = new Promise(resolve => {
  gtiz_app.resolveReady = resolve;
});

gtiz_app.loadFooter = function(path, target) {
  fetch(path)
    .then(response => response.text())
    .then(data => {
      if (!data) return;
      let node = document.querySelector(target);
      node.innerHTML = data;
      
      gtiz_locales.translate(node);
    });
}

gtiz_app.loadHeader = function(path, target, name, title, logo) {
  fetch(path)
    .then(response => response.text())
    .then(data => {
      if (!data) return;
      let node = document.querySelector(target);
      if (title) {
        data = data.replace('{app title}', title);
      }
      if (logo) {
        let src = 'themes/' + name + '/' + logo;
        data = data.replace('{app logo}', src);
      }
      node.innerHTML = data;
    });
}

gtiz_app.setCopyright = function(copyright) {
  let copyright_node = document.querySelector('.copyright');
  let year = new Date().getFullYear();
  copyright_node.innerHTML = copyright.replace('{__YEAR__}', '<span class="copyright-year">' + year + '</span>');
}

/**
 * Set theme for the app based on the active theme in app.json
 * 
 * @param {Object} theme Active theme object form app.json 
 */
gtiz_app.setTheme = function(theme) {
  let languages = gtiz_locales.languages;
  let language = languages.find(element => element.active);
  let code = language ? language.code : 'en';
  let name = theme.name ? theme.name : 'default';
  let logo = theme.logo;
  let title;
  if (theme.title) {
    title = theme.title[code] ? theme.title[code] : theme.title['default'];
  }
  let favicon = theme.favicon;
  let modules = theme.modules;
  let header = modules ? modules.header : undefined;
  let footer = modules ? modules.footer : undefined;
  let vars = theme.vars;
  let dark_vars = theme.dark_vars;

  if (title) {
    document.title = title;
  } else {
    document.title = 'SPREAD';
  }

  if (favicon) {
    let favicon_node = document.querySelector('link[rel="shortcut icon"]');
    favicon_node.href = 'themes/' + name + '/' + favicon;
  }

  if (vars) {
    let stylesheet = document.querySelector('link[rel="stylesheet"][href*="vars"]:not([data-theme-dark-vars])');
    stylesheet.href = 'themes/' + name + '/' + vars;
  }

  // dark mode: only for a theme that declares its dark variables, otherwise
  // always light and no button (see js/theme.js)
  let dark_stylesheet = document.querySelector('link[data-theme-dark-vars]');
  if (dark_stylesheet) {
    if (dark_vars) {
      dark_stylesheet.href = 'themes/' + name + '/' + dark_vars;
      dark_stylesheet.disabled = false;
    } else {
      dark_stylesheet.disabled = true;
    }
  }
  if (typeof gtiz_theme !== 'undefined') {
    gtiz_theme.setAvailable(Boolean(dark_vars));
  }
  
  if (header) {
    if (header.css) {
      let stylesheet = document.querySelector('link[rel="stylesheet"][href*="header"]');
      stylesheet.href = 'themes/' + name + '/' + header.css;
    }
    if (header.html) {
      let path = 'themes/' + name + '/' + header.html;
      gtiz_app.loadHeader(path, '.platform-heading', name, title, logo);
    }
  }

  if (footer) {
    if (footer.css) {
      let stylesheet = document.querySelector('link[rel="stylesheet"][href*="footer"]');
      stylesheet.href = 'themes/' + name + '/' + footer.css;
    }
    if (footer.html) {
      let path = 'themes/' + name + '/' + footer.html;
      gtiz_app.loadFooter(path, '.footer-content');
    }
  }

};

gtiz_app.init = function() {
  let path = 'app.json';
  
  // always checked with the server (a 304 when unchanged): a configuration
  // changed after a deploy, e.g. the assistant turned on, applies at once
  fetch(path, { cache: 'no-cache' })
    .then(response => response.text())
    .then(data => {
      let json = JSON.parse(data);
      if (json && json.themes && json.themes.length > 0) {
        let theme = json.themes.find(element => element.active === true);
        if (theme && Object.keys(theme).length > 0 ) {
          gtiz_app.setTheme(theme);
        }
        let copyright = json.copyright;
        if (copyright) {
          gtiz_app.setCopyright(copyright);
        }
      }
      gtiz_app.cfg = JSON.parse(data);
      gtiz_app.resolveReady(gtiz_app.cfg);
      gtiz_file_handler.init();
    })
    .catch(err => {
      console.error(err);
      // the modules waiting for the configuration go on without it
      gtiz_app.resolveReady(undefined);
    });
};

gtiz_app.init();