# Add a language

1. Create a new language file in `js/i18n` folder by using `en.js` or `it.js` as template and translate values.
2. List it in `js/languages-builder.js`
3. Pack language files in `languages.js` 

## Pack language files

To pack files we use [**packjs**](https://www.npmjs.com/package/packjs) npm library:

```bash
npm install --save-dev packjs
```

Then from `js` folder:

```bash
  packjs i18n/languages-builder.js languages.js
```