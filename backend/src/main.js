/**
 * Created by Anton on 11.02.2017.
 */
var debug = require('debug')('main');
var express = require('express');
var ipfilter = require('express-ipfilter').IpFilter;
var morgan = require('morgan');
var compression = require('compression');
var fs = require('fs');
var path = require('path');

var options = {
    server: null,
    expressApp: null,
    config: {
        express: {
            port: 8080,
            host: '0.0.0.0'
        },
        fs: {
            root: path.posix.join(process.cwd(), '..', 'share'),
            rootName: 'share',
            ipFilter: [
                '127.0.0.1/24',
                '192.168.0.0/24'
            ]
        }
    }
};

options.expressApp = express();

morgan.token('remote-addr', function (req) {
    return req.get('X-Forwarded-For') || req.connection.remoteAddress;
});

options.expressApp.use(morgan('combined'));

options.expressApp.use(compression());

/**
 * @param {string} dirPath
 * @returns {Promise}
 */
var readDir = function (dirPath) {
    return new Promise(function (resolve, reject) {
        var localPath = path.posix.join(options.config.fs.root, dirPath);
        fs.readdir(localPath, function (err, files) {
            if (err) {
                reject(err);
            } else {
                if (localPath !== options.config.fs.root) {
                    files.push('..');
                }
                resolve(files);
            }
        });
    });
};

/**
 * @param {string} dirPath
 * @param {string[]} files
 * @returns {Promise} always true
 */
var stat = function (dirPath, files) {
    return Promise.all(files.map(function (name) {
        return new Promise(function (resolve) {
            var relPath = path.posix.join(dirPath, name);
            /**
             * @typedef {{}} stats,
             * @property {number} dev
             * @property {number} ino
             * @property {number} mode
             * @property {number} nlink
             * @property {number} uid
             * @property {number} gid
             * @property {number} rdev
             * @property {number} size
             * @property {number} blksize
             * @property {number} blocks
             * @property {Date} atime
             * @property {Date} mtime
             * @property {Date} ctime
             * @property {Date} birthtime,
             * @property {function} isFile
             * @property {function} isDirectory
             * @property {function} isBlockDevice
             * @property {function} isCharacterDevice
             * @property {function} isSymbolicLink
             * @property {function} isFIFO
             * @property {function} isSocket
             */
            fs.stat(path.posix.join(options.config.fs.root, relPath), function (err, /**stats*/stats) {
                var obj = {
                    name: name,
                    ext: path.posix.extname(name),
                    path: path.posix.join(options.config.fs.rootName, relPath)
                };
                if (!err) {
                    obj.isFile = stats.isFile();
                    obj.isDirectory = stats.isDirectory();
                    obj.isBlockDevice = stats.isBlockDevice();
                    obj.isCharacterDevice = stats.isCharacterDevice();
                    obj.isSymbolicLink = stats.isSymbolicLink();
                    obj.isFIFO = stats.isFIFO();
                    obj.isSocket = stats.isSocket();
                    obj.size = stats.size;
                    obj.atime = stats.atime.toISOString();
                    obj.mtime = stats.mtime.toISOString();
                    obj.ctime = stats.ctime.toISOString();
                    obj.birthtime = stats.birthtime.toISOString();
                }
                resolve(obj);
            });
        });
    }));
};

var safePath = function (evalPath) {
    var rootName = options.config.fs.rootName;
    var pos = evalPath.indexOf(rootName);
    if (pos !== -1) {
        evalPath = evalPath.substr(pos + rootName.length)
    }
    var pathArr = [];
    var parts = path.posix.normalize(evalPath).split('/');
    while (parts.length) {
        var part = parts.shift();
        if (part === '.' || part === '') {
            continue;
        }
        if (part === '..') {
            pathArr.pop();
        } else {
            pathArr.push(part);
        }
    }
    return pathArr.join('/');
};


options.expressApp.use('/fs/api', ipfilter(options.config.fs.ipFilter, {
    mode: 'allow',
    log: false,
    allowedHeaders: ['x-forwarded-for']
}));

options.expressApp.get('/fs/api', function (req, res) {
    var dirPath = safePath(req.query.path);
    readDir(dirPath).then(function (files) {
        return stat(dirPath, files).then(function (files) {
            res.json({
                success: true,
                files: files,
                path: path.posix.join(options.config.fs.rootName, dirPath)
            });
        });
    }).catch(function (err) {
        debug('getDir', err);
        res.status(500).json({success: false});
    });
});

options.expressApp.use(path.posix.join('/fs', options.config.fs.rootName), express.static(options.config.fs.root));
options.expressApp.use('/fs', express.static(path.join(__dirname + '/../../frontend')));

options.server = options.expressApp.listen(options.config.express.port, options.config.express.host, function () {
    var host = options.server.address().address;
    var port = options.server.address().port;

    debug('Listening at http://%s:%s', host, port);
});