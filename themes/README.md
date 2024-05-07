# Use themes

SPREAD allows you to customize some elements of its appearance such as colors, fonts, header elements (logo and title), and footer content.

## Quick start

Clone the `themes/default`, folder and name the new folder with your theme name, for example `themes/mytheme`.

Edit the `app.json` file in the application root by adding (or modifying) the object related to your new theme:

```json
{
  "themes" : [{
    "active" : false,
    "name" : "default",
    "author" : "Alessandro De Luca, IZSAM G. Caporale",
    "title" : {
      "it" : "SPREAD",
      "en" : "SPREAD"
    },
    "favicon" : "img/logo.ico",
    "vars" : "css/vars.css",
    "modules" : {
      "header" : {
        "css" : "css/header.css",
        "html" : "html/header.html"
      },
      "footer" : {
        "css" : "css/footer.css",
        "html" : "html/footer.html"
      }
    },
    "version" : "1.0.0"
  }, {
    "active" : true,
    "name" : "mytheme",
    "author" : "",
    "title" : {
      "it" : "Mio titolo, SPREAD",
      "en" : "My title, SPREAD"
    },
    "favicon" : "img/logo.ico",
    "vars" : "css/vars.css",
    "modules" : {
      "header" : {
        "css" : "css/header.css",
        "html" : "html/header.html"
      },
      "footer" : {
        "css" : "css/footer.css",
        "html" : "html/footer.html"
      }
    },
    "version" : "Version number"
  }],
  "copyright" : "&copy; {__YEAR__} IZSAM G. Caporale"
}
```

As you can see, the theme name must match the folder name in `themes/mytheme`. It is also necessary to set the `active` property to `true` for the theme you want to use.

> It is not necessary to keep other objects inside the `themes` section of `app.json`, but if you do keep them, it is important that they have the `active` key with the value `false`. However, it is important to keep the `themes/default` folder as this is used by SPREAD as a fallback.

Start customizing your SPREAD!

## Customize SPREAD

To customize the appearance of SPREAD, you can do it in two ways: by editing the files in `themes/default` or by making a copy of the folder and overriding the elements you want to customize. Then, you will need to modify a configuration object located inside the `app.json` file.

Let's refer to the configuration object and look in detail at the elements that make up a SPREAD theme:

```json
"themes" : [{
    "active" : true,
    "name" : "mythemename",
    "author" : "Alessandro De Luca, IZSAM G. Caporale",
    "logo" : "img/logo.svg",
    "title" : {
      "it" : "SPREAD",
      "en" : "SPREAD"
    },
    "favicon" : "img/logo.ico",
    "vars" : "css/vars.css",
    "modules" : {
      "header" : {
        "css" : "css/header.css",
        "html" : "html/header.html"
      },
      "footer" : {
        "css" : "css/footer.css",
        "html" : "html/footer.html"
      }
    },
    "version" : "1.0.0"
  }]
```

The `active` key must be set to `true` to indicate to SPREAD which is the active theme. It is not necessary to keep other objects within `themes` of `app.json`, but if you do keep them, it is important that these have the `active` key with a value of `false`. In any case, the application considers the first element with the `active` key equal to `true` as the active theme. Meanwhile, it is important to keep the `themes/default` folder because this is used by SPREAD as a fallback.

The value of the `name` key **must** correspond to the name of the relative theme folder present in `themes/`.

### Logo

The value of the `logo` key defines the path relative to the theme for the logo to be used in the top bar of the UI.

### Title

The `title` value defines the title present in the UI's top bar, currently localizations for Italian and English are managed and reflect the languages currently available (if you want to add a new language, please refer to the [Available Languages and Translations](https://github.com/genpat-it/spread/wiki/5.-Available-Languages-and-Translations) section of this wiki).

### Favicon

The `favicon` value is used to define the path relative to the theme for the favorite icon.

### Color Palette and Fonts

The `vars` value, if present, defines the relative path for the CSS file that manages the general colors and fonts of the application.

> If you decide to overwrite this file, it's important not to delete the defined variables, but only edit their value where necessary.

### Header and Footer

At the moment, it is possible to customize some elements present in the `header` and `footer`, both in terms of content through the `html` modules and their appearance through the related `css`. The values correspond to the relative paths to the theme for the files to use.

**Header**

The `header` module allows you to define the HTML to be inserted inside the div with the `.platform-heading` class of the `index.html` file, the default theme uses the following code:

```html
<div class="platoform-logo">
  <img src="{app logo}" alt="Logo">
</div>
<div class="platform-title">
  <h1>{app title}</h1>
</div>
```

`{app logo}` and `{app title}` are placeholders for the values defined in `app.json` for the `logo` and `title` keys.

In the `app.json` configuration file, it is also possible to replace/modify the CSS file that defines the style of the UI's header.

**Footer**

The `footer` module allows you to define the HTML to be inserted inside the div with the `.footer-content` class of the `index.html` file.

The footer is visible by clicking on the 'i' icon at the top right of the top bar. The default theme defines some useful and support links together with the logo of the National Reference Center for Genome Sequencing of the Experimental Zooprophylactic Institute, within which SPREAD is developed and used.

As with the header, it is possible to use a custom style for the module.

> **Note** Through the `app.json` file, it is possible to modify information related to `copyright`, the placeholder `{__YEAR__}` will be automatically replaced by a JavaScript function present in `js/app.js`