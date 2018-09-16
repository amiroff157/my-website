// Include Gulp.js and Plugins
const gulp = require('gulp');
const newer = require('gulp-newer');
const ftp = require('vinyl-ftp');
const minimist = require('minimist');
const htmlclean = require('gulp-htmlclean');
const imagemin = require('gulp-imagemin');
const sizediff = require('gulp-sizediff');
const preprocess = require('gulp-preprocess');
const sass = require('gulp-sass');
const pleeease = require('gulp-pleeease');
const stripdebug = require('gulp-strip-debug');
const terser = require('gulp-terser');
const concat = require('gulp-concat');
const browsersync = require('browser-sync');
const ncu = require('npm-check-updates');
const del = require('del');
const pkg = require('./package.json');

// Check Build Environment
let args = minimist(process.argv.slice(2));

// Files Locations
let source = 'source/';
let buildDir = 'build/';

let npm = {
    jquery: 'node_modules/jquery/dist/jquery.js',
    bootstrap: 'node_modules/bootstrap/dist/js/bootstrap.js',
    moment: 'node_modules/moment/moment.js',
    modernizr: 'source/js/modernizr.js'
};
let images = {
    src: source + 'images/**/*.*',
    bld: buildDir + 'images/'
};

let css = {
    src: source + 'scss/**/*.scss',
    watch: [source + 'scss/**/*'],
    bld: buildDir + 'css/',
    sassOpts: {
        outputStyle: 'nested',
        precision: 3,
        errLogToConsole: true
    },
    pleeeaseOpts: {
        out: 'main.min.css',
        autoprefixer: {
            browsers: ['last 2 versions', '> 2%']
        },
        rem: ['16px'],
        pseudoElements: true,
        mqpacker: true,
        minifier: args.prod
    }
};

let js = {
    src: source + 'js/main.js',
    bld: buildDir + 'js/',
};

let syncOpts = {
    server: {
        baseDir: buildDir,
        index: 'index.html'
    },
    open: false,
    notify: true
};

let html = {
    src: source + '*.html',
    watch: [source + '*.html'],
    bld: buildDir,
    context: {
        devBuild: !args.prod,
    }
};

// Cleanup Build Folder
gulp.task('cleanup', function () {
    del([
        buildDir + '*'
    ]);
});

// HTML Compression
gulp.task('html', function () {
    let page = gulp.src(html.src).pipe(preprocess({
        context: html.context
    }));
    if (args.prod) {
        page = page
            .pipe(sizediff.start())
            .pipe(htmlclean())
            .pipe(sizediff.stop({
                title: 'HTML Minification'
            }));
    }
    return page.pipe(gulp.dest(html.bld));
});

// Images Compression
gulp.task('images', function () {
    return gulp.src(images.src)
        .pipe(newer(images.bld))
        .pipe(sizediff.start())
        .pipe(imagemin())
        .pipe(sizediff.stop({
            title: 'Images Compression'
        }))
        .pipe(gulp.dest(images.bld));
});

// Build CSS Files
gulp.task('sass', function () {
    return gulp.src(css.src)
        .pipe(sizediff.start())
        .pipe(sass(css.sassOpts))
        .pipe(pleeease(css.pleeeaseOpts))
        .pipe(sizediff.stop({
            title: 'CSS Compression'
        }))
        .pipe(gulp.dest(css.bld));
});

// Build JavaScript
gulp.task('js', function () {
    if (!args.prod) {
        return gulp.src([npm.jquery,
            npm.modernizr,
            npm.bootstrap,
            npm.moment,
            js.src,
            'source/js/smooth-scroll.js',
            'source/js/back-to-top.js',
            'source/js/jquery-rss.js'
        ])
            .pipe(newer(js.bld))
            .pipe(concat('main.js'))
            .pipe(gulp.dest(js.bld));
    } else {
        del([
            buildDir + 'js/*'
        ]);
        return gulp.src([npm.jquery,
            npm.modernizr,
            npm.bootstrap,
            npm.moment,
            js.src,
            'source/js/smooth-scroll.js',
            'source/js/back-to-top.js',
            'source/js/jquery-rss.js'
        ])
            .pipe(concat('main.min.js'))
            .pipe(sizediff.start())
            .pipe(stripdebug())
            .pipe(terser())
            .pipe(sizediff.stop({
                title: 'JavaScript Compression'
            }))
            .pipe(gulp.dest(js.bld));
    }
});

// Browser Sync
gulp.task('browsersync', function () {
    browsersync(syncOpts);
});

gulp.task('deploy', function () {
    let remotePath = '/amiroffme/';
    let conn = ftp.create({
        host: 'ftp.amiroff.me',
        user: args.user,
        password: args.password
    });
    gulp.src(buildDir)
        .pipe(conn.dest(remotePath));
});

// Gulp build task
gulp.task('build', ['html', 'images', 'sass', 'js', 'browsersync'], function () {

    // Print Build Type
    console.log(pkg.name + ' "' + pkg.description + '" v' + pkg.version + ', ' + (args.prod ? 'production' : 'development') + ' build');

    // Check Dependencies Versions
    if (!args.prod) {
        ncu.run({
            packageFile: 'package.json'
        })
            .then((upgraded) => {
                if (Object.keys(upgraded).length === 0) {
                    console.log('All npm dependencies are up to date!');
                } else {
                    console.log('The following npm dependencies need updates "ncu -a":', upgraded);
                }
            });
    }

    // Watch HTML
    gulp.watch(html.watch, ['html', browsersync.reload]);

    // Watch Images
    gulp.watch(images.src, ['images', browsersync.reload]);

    // Watch Sass
    gulp.watch(css.watch, ['sass', browsersync.reload]);

    // Watch JavaScript
    gulp.watch(js.src, ['js', browsersync.reload]);

});
