
'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var watch = require('gulp-watch');
var browserify = require('browserify');
var watchify = require('watchify');
var _ = require('lodash');
var source = require('vinyl-source-stream');
var runSequence = require('run-sequence');
var ghPages = require('gulp-gh-pages');


// TODO: Split tasks into individual files


gulp.task('default', ['test', 'watch']);

gulp.task('test', function(){
	runSequence('clean', 'run-tests');
});

gulp.task('build', ['lint', 'copy', 'browserify']);



var sources = ['app/**/*.js', 'test/**/*.js', 'gulpfile.js'];
var isDev = false;


gulp.task('clean', function(callback){
	del(['dist'], callback);
});


gulp.task('run-tests', ['build', 'build-tests'], function() {
    return gulp.src('dist/test/test.js')
    	.pipe(plugins.mocha({reporter: 'spec'}));
});


gulp.task('lint', function() {
	return gulp.src(sources)
			.pipe(plugins.jshint('.jshintrc'))
				.pipe(plugins.jshint.reporter('default'));
});


gulp.task('copy', function() {
	return gulp.src('app/index.html')
		.pipe(gulp.dest('dist'));
});


gulp.task('browserify', function() {
	return runBrowserify({
		isDev : isDev,
		src: './app/assets/js/index.js',
		bundle: 'app.js',
		dest: 'dist/js'
	});
});


gulp.task('build-tests', function() {
	return runBrowserify({
		isDev : isDev,
		src: './test/test.js',
		bundle: 'test.js',
		dest: 'dist/test'
	});
});


gulp.task('watch', function() {
	isDev = true;

	watch(['app/**', 'test/**', 'gulpfile.js'], function() {
		gulp.start('run-tests');
	});
});

 
gulp.task('deploy', function() {
  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});



function runBrowserify(config)
{
	var setup = {
		entries: config.src
	};

	if (config.isDev)
	{
		_.extend(setup, watchify.args, { debug: true });
	}

	var b = browserify(setup);
	b.transform('jstify', {
		engine: 'lodash'
	});

	if (config.isDev)
	{
		b = watchify(b);
      	b.on('update', bundle);
      	b.on('log', gutil.log);
	}

	function bundle()
	{
		return b
			.bundle()
			.on('error', gutil.log.bind(gutil, 'Browserify Error'))
				.pipe(source(config.bundle))
					.pipe(gulp.dest(config.dest));
	}

	return bundle();
}

