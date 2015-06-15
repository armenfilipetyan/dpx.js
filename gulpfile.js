
/*
 * Gulp Build File
 */

'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var notify = require('gulp-notify');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var del = require('del');
var bundle_version = require('./package.json').version;
var bundle_name = require('./package.json').name;

// Default 
gulp.task('default', ['dpx', 'dpx-fe']);

// Build nodejs dpx module
gulp.task('dpx', function() {
    return gulp.src('./lib/dpx.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('./build/dpxjs-' + bundle_version ))
        .pipe(notify({ message: bundle_name + ' ' + bundle_version + ' build complete' }));
});

// Build dpx frontend library
gulp.task('dpx-fe', function() {
    return gulp.src('./lib/dpx-fe.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('./build/dpx-fe-' + bundle_version ))
        .pipe(notify({ message: bundle_name + ' ' + bundle_version + ' build complete' }));
});

// Remove the build folder
gulp.task('clean', function() { 
    return del(['build'] );  
});
