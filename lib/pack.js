'use strict';

var octo = require('@octopusdeploy/octopackjs');
var gutil = require('gulp-util');
var through = require('through2');
var log = require('plugin-log');

var PLUGIN_NAME = 'gulp-octo.pack';

module.exports = function (type, options) {
  var files = [];
  var firstFile;
  if(typeof type === 'object') {
    options = type;
    type = 'targz';
  }

  var pack = octo.pack(type || 'targz', options);

  function pushPackToStream(objStream, cb) {

    if (!Object.keys(files).length) {
      cb(new gutil.PluginError(PLUGIN_NAME, 'No files were found to add to package'));
      return;
    }

    pack.toStream(function (err, data) {
      objStream.push(new gutil.File({
        cwd: firstFile.cwd,
        base: firstFile.base,
        path: data.name,
        contents: data.stream
      }));

      log('Packed \'' + log.colors.cyan(data.name) + '\' with ' + log.colors.magenta(Object.keys(files).length + ' files'));
      cb();
    });
  }

  function appendFilesToPack() {
    Object.keys(files)
        .sort()
        .map(function(f) {
          return files[f];
        })
        .filter(function(file) {
          return !(file.isDirectory() || file.isNull());
        })
        .forEach(function (file) {
          pack.append(file.relative.replace(/\\/g, '/'), file.contents, {
              mode: file.stat && file.stat.mode,
              date: file.stat && file.stat.mtime ? file.stat.mtime : null
          });
        });
  }

  return through.obj(
    function (file, enc, cb) {
      if (file.relative !== '') {
        if (firstFile === undefined) {
          firstFile = file;
        }
        files[file.relative] = file;
      }
      cb();
    },
    function (cb) {
      appendFilesToPack();
      pushPackToStream(this, cb);
    });
};