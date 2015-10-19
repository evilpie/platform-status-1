import browserify from 'browserify';
import babelify from 'babelify';
import fs from 'fs';
import del from 'del';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import gulp from 'gulp';
import mocha from 'gulp-mocha';
import yargs from 'yargs';
import oghliner from 'oghliner';
import loadPlugins from 'gulp-load-plugins';
const plugins = loadPlugins({
  lazy: false,
});

import babelRegister from 'babel-core/register';
babelRegister();
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import browserSyncCreator from 'browser-sync';
const browserSync = browserSyncCreator.create();

import engine from './engine/index.js';

const testFilename = yargs.option('tf', { alias: 'testFilename', default: 'test/test*.js', type: 'string' }).argv.tf;

gulp.task('clean', (done) => {
  del(['./dist']).then(() => {
    done();
  });
});

gulp.task('lint', () => {
  return gulp
    .src(['./*.js', './engine/*.js', './src/*.js'])
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format());
});

gulp.task('test:mocha', ['build'], () => {
  return gulp.src(testFilename, {read: false})
    // gulp-mocha needs filepaths so you can't have any plugins before it
    .pipe(mocha({ ui: 'bdd', timeout: 1000 }));
});

gulp.task('test', ['lint', 'test:mocha']);

gulp.task('deploy', ['build'], () => {
  return oghliner.deploy({
    rootDir: 'dist',
  });
});

gulp.task('build:engine', () => {
  return engine().then((files) => {
    for (const filename of Object.keys(files)) {
      fs.writeFileSync('./dist/' + filename, files[filename]);
    }
  });
});

gulp.task('build:root', ['clean'], () => {
  return gulp
    .src('./src/*.*')
    .pipe(gulp.dest('./dist'));
});

gulp.task('build:js', () => {
  return browserify({
    entries: './src/js/index.js',
    debug: true,
  })
  .transform(babelify.configure())
  .bundle()
  .pipe(source('bundle.js'))
  .pipe(buffer())
  .pipe(plugins.sourcemaps.init({
    loadMaps: true,
  }))
  .pipe(plugins.sourcemaps.write('.'))
  .pipe(gulp.dest('./dist'));
});

gulp.task('build:css', () => {
  return gulp
    .src('./src/css/*.css')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.autoprefixer({
      browsers: ['last 2 versions'],
    }))
    .pipe(plugins.concat('bundle.css'))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('build', ['build:root', 'build:engine', 'build:js', 'build:css']);

gulp.task('watch', ['build'], () => {
  browserSync.init({
    open: false,
    server: {
      baseDir: './dist',
    },
  });
  gulp.watch(['./src/*.*'], ['build:root'], browserSync.reload);
  gulp.watch(['./src/css/*.css'], ['build:css'], browserSync.reload);
  gulp.watch(['./src/js/*.js'], ['build:js'], browserSync.reload);
  gulp.watch(['./engine/*.js', './features/*.md'], ['build:engine'], browserSync.reload);
});

gulp.task('default', ['build']);
