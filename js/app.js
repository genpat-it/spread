let gtiz_app = {};

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
    let stylesheet = document.querySelector('link[rel="stylesheet"][href*="vars"]');
    stylesheet.href = 'themes/' + name + '/' + vars;
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
  
  fetch(path)
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
      gtiz_file_handler.init();
    })
    .catch(err => {
      console.error(err);
    });
};

gtiz_app.init();