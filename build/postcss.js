const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const precss = require('precss');
const autoprefixer = require('autoprefixer');
const postcssImport = require('postcss-import');
const cssnano = require('cssnano');

const config = require('../postcss.config.json')
const inputFile = path.join(__dirname, '..', config.from)

function processCss() {
  return new Promise((resolve, reject) => {
    fs.readFile(inputFile, (err, css) => {
      if (err) {
        reject(err)
      }
      resolve(
        postcss([precss, autoprefixer, postcssImport, cssnano])
          .process(
            css,
            config
          )
          .then(result => result.css)
      )
    })
  })
}

// handle direct invokation
const [ , scriptName ] = process.argv
if (scriptName && new RegExp(__filename).exec(scriptName)) {
  processCss().then(css => console.log(css))
}

module.exports = processCss
