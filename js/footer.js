let gtiz_footer = {};

gtiz_footer.css_vars = gtiz_utils.getAllCssVariables();
gtiz_footer.scrolly_options = {
  position: 'absolute',
  containerColor: gtiz_footer.css_vars['--light'],
  barColor: gtiz_footer.css_vars['--secondary-ultra-light'],
  radius: 1,
  scaleY : 0.8,
  offset: 1,
  side : 'left',
  width : 0.3,
  unit : 'rem',
};
gtiz_footer.scrolly = new Scrolly(gtiz_footer.scrolly_options);

/**
 * Manage footer view.
 * 
 */
gtiz_footer.showFooter = function() {
  let footer = document.querySelector('footer');
  let footer_wrapper = footer.querySelector('.footer-contents-wrapper');
  let trigger_help = document.querySelector('.toogle-trigger-img-help');
  let trigger_close = document.querySelector('.toogle-trigger-img-close');
  footer.classList.toggle('show');
  gtiz_footer.scrolly.initNode(footer_wrapper);
  trigger_help.classList.toggle('hidden');
  trigger_close.classList.toggle('hidden');
}

window.addEventListener("resize", function() {
  setTimeout(() => {
    let node = document.querySelector('.footer-contents-wrapper');
    if (node) {
      gtiz_footer.scrolly.updateNode(node);
    }
  }, 300);
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    let footer = document.querySelector('footer');
    if (footer.classList.contains('show')) {
      gtiz_footer.showFooter();
    }
  }
});