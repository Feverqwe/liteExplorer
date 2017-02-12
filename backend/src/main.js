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
            root: path.posix.normalize(path.join(process.cwd(), '../share')),
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

var File = function (name, relPath) {
    var self = this;
    self.name = name;
    self.ext = path.posix.extname(name);
    self.path = path.posix.join(options.config.fs.rootName, relPath);
    self.isFile = false;
    self.isDirectory = false;
    self.isBlockDevice = false;
    self.isCharacterDevice = false;
    self.isSymbolicLink = false;
    self.isFIFO = false;
    self.isSocket = false;
    self.size = 0;
    self.atime = self.mtime = self.ctime = self.birthtime = (new Date(0)).toISOString();
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
    self.setStats = function (/**stats*/stats) {
        self.isFile = stats.isFile();
        self.isDirectory = stats.isDirectory();
        self.isBlockDevice = stats.isBlockDevice();
        self.isCharacterDevice = stats.isCharacterDevice();
        self.isSymbolicLink = stats.isSymbolicLink();
        self.isFIFO = stats.isFIFO();
        self.isSocket = stats.isSocket();
        self.size = stats.size;
        self.atime = stats.atime.toISOString();
        self.mtime = stats.mtime.toISOString();
        self.ctime = stats.ctime.toISOString();
        self.birthtime = stats.birthtime.toISOString();
    };
};

/**
 * @param {string} dirPath
 * @param {string} name
 * @returns {Promise} always true
 */
var stat = function (dirPath, name) {
    return new Promise(function (resolve) {
        var relPath = path.posix.join(dirPath, name);
        fs.stat(path.posix.join(options.config.fs.root, relPath), function (err, stats) {
            var file = new File(name, relPath);
            if (!err) {
                file.setStats(stats);
            }
            resolve(file);
        });
    });
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

var daemons = [];
var sessions = [];

options.expressApp.get('/fs/api', function (req, res) {
    var dirPath = safePath(req.query.path);
    readDir(dirPath).then(function (files) {
        return Promise.all(files.map(function (name) {
            return stat(dirPath, name);
        }));
    }, function (err) {
        debug('readDir', err);
        var file = new File('..', safePath(req.query.path + '/..'));
        file.isDirectory = true;
        return [file];
    }).then(function (files) {
        res.json({
            success: true,
            files: files,
            path: path.posix.join(options.config.fs.rootName, dirPath)
        });
    }).catch(function (err) {
        debug('getApi', err);
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