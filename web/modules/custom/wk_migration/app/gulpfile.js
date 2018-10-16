const gulp = require('gulp');
const markdownToJSON = require('gulp-markdown-to-json');
const marked = require('marked');
const gutil = require('gulp-util');
var jsoncombine = require('gulp-jsoncombine');
var merge = require('gulp-merge-json');
var concat_json = require("gulp-combine-json");
var concat = require('gulp-concat');
var append = require('gulp-append');
var jeditor = require("gulp-json-editor");
var debug = require('gulp-debug');
var path = require('path');
var tap = require('gulp-tap');
var rewriteImagePath = require('gulp-rewrite-image-path');

// Default options for Marked.
marked.setOptions({
  pedantic: true,
  smartypants: true
});

/**
 * Default Gulp task.
 */
gulp.task('default', () => {
  gulp.src('./data/**/*.md')
  .pipe(gutil.buffer())
  .pipe(markdownToJSON(marked, 'posts.json', (data, file) => {
    // Get file name without extension.
    var fileName = path.basename(file.path, '.md');
    var pathAlias = getPathAliasPosts(fileName);
    var publishDate = getDate(fileName);
    data.body = replaceDefaultPaths(data.body);
    data.path = pathAlias;
    data.published = publishDate;
    // Validate Post Status.
    data.status = (data.draft) ? false : true;
    // Remove empty elements from tags.
    data.tags = data.tags.filter(function(e){return e});
    // Implode array to stings.
    // data.categories = data.categories.join(", ");
    // data.tags = data.tags.join(", ");
    return data;
  }))
  .pipe(jeditor({
  }))
  .pipe(gulp.dest('./data/json/new'))
});

/*
 * Add replaceAll to string.
 */
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

/**
 * Get Path Alias for Posts from filename.
 * @param  String fileName Name of File
 * @return String pathAlias.
 */
function getPathAliasPosts(fileName) {
  // Get path sections.
  var pathDate = fileName.substr(0, 11);
  var pathTitle = fileName.substr(11);
  // Replace all (-) with (/)
  pathDate = pathDate.replace(/-/g, '/');
  var pathAlias = '/articles/' + pathDate + pathTitle;
  // return Path Alias.
  return pathAlias;
}

/**
 * Get Date from file name.
 * @param  String fileName Name of File.
 * @return Integer publishTimeDate.
 */
function getDate(fileName) {
  // Get date.
  var publishDate = fileName.substr(0, 10);
  publishDate = publishDate.split("-");

  publishDate = publishDate[1]+"/"+publishDate[2]+"/"+publishDate[0];
  // Set date timestamp (in seconds).
  var publishTimeDate = (new Date(publishDate).getTime()) / 1000;
  return publishTimeDate;
}

/**
 * Replace All links and image paths.
 * @param  String body Body text.
 * @return String  NewBody Body fixed links.
 */
function replaceDefaultPaths(body) {
  // New body.
  var newBody = body;
  // Replace path images.
  newBody = newBody.replaceAll('{{ site.url }}\/assets\/img\/', '/sites/default/files/enzo_post_images/');
  newBody = newBody.replaceAll('{{site.url}}\/assets\/img\/', '/sites/default/files/enzo_post_images/');
  newBody = newBody.replaceAll('{{site.url }}\/assets\/img\/', '/sites/default/files/enzo_post_images/');

  //Replace Urls links.
  newBody = newBody.replaceAll('{{ site.url }}', '');
  newBody = newBody.replaceAll('{{site.url}}', '');
  newBody = newBody.replaceAll('{{site.url }}', '');
  newBody = newBody.replaceAll('http://enzolutions.com', '');

  return newBody;
}

//
// gulp.task('markdown', () => {
//   gulp.src('./data/**/*.md')
//     .pipe(markdownToJSON(marked))
//     // .pipe(jeditor({
//     //   'name': debug()
//     // }))
//     // .pipe(tap(function (file,t) {
//     //   console.log(path.basename(file.path));
//     //   // .pipe(jeditor({
//     //   //   'name': debug()
//     //   // }))
//     // }))
//     .pipe(gulp.dest('./data/json/new'))
// });
//
// //
// // gulp.task('default', function () {
// //     return gulp.src('./data/json/**/*.json')
// //         .pipe(append('./data/json/all/appended-file.json', {json: true}));
// // });
//
//
//
// gulp.task('jsonconcat', function () {
//   return gulp.src('./data/json/**/*.json')
//     .pipe(jsoncombine('all-posts.json', function(data){
//       return new Buffer(JSON.stringify(data));
//     }))
//     .pipe(gulp.dest('data/json/all'));
// });
//
// gulp.task('concat_json', function () {
//   return gulp.src('./data/json/posts/*.json')
//   .pipe(concat_json("combined.js"))
//   .pipe(gulp.dest("./data/json/all"));
// });
//
// gulp.task('jsonconcat2', function () {
//   return gulp.src('./data/json/posts/*.json')
//     .pipe(merge({
//       startObj: { someKey: 'defaultValue' },
//       mergeArrays: false,
//       }))
//     .pipe(gulp.dest('./data/json/all'));
// });
