let gtiz_help = {};

gtiz_help.info_triggers = document.querySelectorAll('.help-trigger');

gtiz_help.settings = [{
  card: 'tree-layout',
  title: () => {
    return gtiz_locales.current.tree_layout;
  },
  contents: () => {
    return gtiz_locales.current.helps.tree_layout.help;
  },
  feedback: () => {
    return gtiz_locales.current.helps.feedback;
  }
}, {
  card: 'node-style',
  title: () => {
    return gtiz_locales.current.node_style;
  },
  contents: () => {
    return gtiz_locales.current.helps.node_style.help;
  },
  feedback: () => {
    return gtiz_locales.current.helps.feedback;
  }
}, {
  card: 'node-size',
  title: () => {
    return gtiz_locales.current.node_size;
  },
  contents: () => {
    return gtiz_locales.current.helps.node_size.help;
  },
  feedback: () => {
    return gtiz_locales.current.helps.feedback;
  }
}, {
  card: 'rendering',
  title: () => {
    return gtiz_locales.current.rendering;
  },
  contents: () => {
    return gtiz_locales.current.helps.rendering.help;
  },
  feedback: () => {
    return gtiz_locales.current.helps.feedback;
  }
}, {
  card: 'branch-style',
  title: () => {
    return gtiz_locales.current.branch_style;
  },
  contents: () => {
    return gtiz_locales.current.helps.branch_style.help;
  },
  feedback: () => {
    return gtiz_locales.current.helps.feedback;
  }
}, {
  card: 'branch-cutoffs',
  title: () => {
    return gtiz_locales.current.branch_cutoffs;
  },
  contents: () => {
    return gtiz_locales.current.helps.branch_cutoffs.help;
  },
  feedback: () => {
    return gtiz_locales.current.helps.feedback;
  }
}, {
  card: 'map',
  title: () => {
    return gtiz_locales.current.map;
  },
  contents: () => {
    return gtiz_locales.current.helps.map.help;
  },
  feedback: () => {
    return gtiz_locales.current.helps.feedback;
  }
}];

gtiz_help.getHelp = function(type) {
  let help = gtiz_help.settings.find(setting => setting.card == type);
  if (help) {
    let title = help.title();
    let html_string = help.contents();
    let parser = new DOMParser();
    let html = parser.parseFromString(html_string, 'text/html');
    let contents = Array.from(html.body.childNodes);
    let feedback = help.feedback();
    let f_type = 'info';
    gtiz_modal.buildModal(title, contents, feedback, f_type);
  }
}

gtiz_help.info_triggers.forEach(trigger => {
  trigger.addEventListener('click', function(e) {
    let target = e.currentTarget;
    let help = trigger.closest('.help');
    let type = help.getAttribute('data-type');
    gtiz_help.getHelp(type);
  })
});