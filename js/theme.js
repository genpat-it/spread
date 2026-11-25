let gtiz_theme = {};

/*
*
* Light and dark mode. Loaded in the head, before the page is drawn, so a dark
* page never shows light first. The mode is the `data-theme` attribute of the
* html node (`light` or `dark`): the dark variables of the active theme
* (`dark_vars` in app.json, e.g. themes/default/css/vars-dark.css) apply to
* `:root[data-theme="dark"]`. Without a choice of the user the mode follows the
* system or the browser (`prefers-color-scheme`); the choice made with the
* button of the top bar is kept in the browser, and dropped when it matches the
* system again, so SPREAD goes back to following it. A theme without dark
* variables is always light and has no button. Every change dispatches
* `spread-theme-change` on the document, e.g. to redraw the tree.
*
*/
gtiz_theme.storage_key = 'spread-theme';
gtiz_theme.media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
// until app.json says otherwise the theme is taken as having a dark mode (the default one has it)
gtiz_theme.available = true;

/**
 * Mode asked by the system or the browser
 *
 * @returns {String} `dark` or `light`
 */
gtiz_theme.systemMode = function() {
  return gtiz_theme.media && gtiz_theme.media.matches ? 'dark' : 'light';
}

/**
 * Mode chosen by the user with the button, kept in the browser
 *
 * @returns {String|null} `dark`, `light` or null without a choice
 */
gtiz_theme.savedMode = function() {
  let value = null;
  try {
    value = localStorage.getItem(gtiz_theme.storage_key);
  } catch (error) {
    value = null;
  }
  return value === 'dark' || value === 'light' ? value : null;
}

/**
 * Mode to show: the choice of the user, otherwise the system one; always light
 * when the theme has no dark mode
 *
 * @returns {String} `dark` or `light`
 */
gtiz_theme.mode = function() {
  if (!gtiz_theme.available) {
    return 'light';
  }
  return gtiz_theme.savedMode() || gtiz_theme.systemMode();
}

/**
 * Tell if the page is in dark mode
 *
 * @returns {Boolean} True in dark mode
 */
gtiz_theme.isDark = function() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/**
 * Apply a mode to the page and to the button, and tell the components
 *
 * @param {String} mode `dark` or `light`
 * @returns {undefined}
 */
gtiz_theme.apply = function(mode) {
  let changed = document.documentElement.getAttribute('data-theme') !== mode;
  document.documentElement.setAttribute('data-theme', mode);
  gtiz_theme.updateTrigger();
  if (changed) {
    document.dispatchEvent(new CustomEvent('spread-theme-change', { detail : { mode : mode } }));
  }
}

/**
 * Switch between light and dark mode (button of the top bar)
 *
 * @returns {undefined}
 */
gtiz_theme.toggle = function() {
  let next = gtiz_theme.isDark() ? 'light' : 'dark';
  try {
    // the same mode as the system is no choice: SPREAD follows the system again
    if (next === gtiz_theme.systemMode()) {
      localStorage.removeItem(gtiz_theme.storage_key);
    } else {
      localStorage.setItem(gtiz_theme.storage_key, next);
    }
  } catch (error) {
    // storage not available (e.g. private browsing): the mode lasts for the page
  }
  gtiz_theme.apply(next);
}

/**
 * Show the button only when the theme has a dark mode, with the icon and the
 * title of the mode it switches to
 *
 * @returns {undefined}
 */
gtiz_theme.updateTrigger = function() {
  let tool = document.querySelector('.tool-theme');
  if (!tool) {
    return;
  }
  tool.classList.toggle('hidden', !gtiz_theme.available);
  let dark = gtiz_theme.isDark();
  let icon = tool.querySelector('i');
  if (icon) {
    icon.setAttribute('class', 'tabler ' + (dark ? 'tabler-sun' : 'tabler-moon'));
  }
  let texts = typeof gtiz_locales !== 'undefined' && gtiz_locales.current ? gtiz_locales.current : {};
  let title = dark ? texts.light_mode : texts.dark_mode;
  if (title) {
    tool.setAttribute('title', title);
  }
}

/**
 * Set whether the active theme has a dark mode, once app.json has been read
 * (gtiz_app.setTheme)
 *
 * @param {Boolean} available True when the theme declares `dark_vars`
 * @returns {undefined}
 */
gtiz_theme.setAvailable = function(available) {
  gtiz_theme.available = available;
  gtiz_theme.apply(gtiz_theme.mode());
}

// the mode before the page is drawn
document.documentElement.setAttribute('data-theme', gtiz_theme.mode());

// a change of the system or browser mode applies when the user made no choice
if (gtiz_theme.media) {
  gtiz_theme.media.addEventListener('change', function() {
    if (!gtiz_theme.savedMode()) {
      gtiz_theme.apply(gtiz_theme.mode());
    }
  });
}

// the button of the top bar, once the page is there
document.addEventListener('DOMContentLoaded', function() {
  let tool = document.querySelector('.tool-theme');
  if (tool) {
    tool.addEventListener('click', gtiz_theme.toggle);
  }
  gtiz_theme.updateTrigger();
});
