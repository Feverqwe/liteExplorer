/**
 * Created by Anton on 11.02.2017.
 */
var debug = require('debug')('main');
var express = require('express');
var ipfilter = require('express-ipfilter').IpFilter;
var morgan = require('morgan');
var compression = require('compression');
var fs = require('fs-extra');
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
            root: path.normalize(path.join(__dirname, '/../../share')),
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
        var localPath = path.join(options.config.fs.root, dirPath);
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
    self.ext = path.extname(name);
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
 * @returns {Promise} always true
 */
var stat = function (relPath) {
    return new Promise(function (resolve, reject) {
        fs.stat(path.join(options.config.fs.root, relPath), function (err, stats) {
            if (err) {
                reject(err);
            } else {
                resolve(stats);
            }
        });
    });
};

var remove = function (dirPath, name) {
    return new Promise(function (resolve) {
        var relPath = path.posix.join(dirPath, name);
        fs.remove(path.join(options.config.fs.root, relPath), function (err) {
            var result = {};
            result.name = name;
            result.success = !err;
            if (err) {
                result.message = err.message;
            }
            resolve(result);
        });
    });
};

var copy = function (dirPath, name, toDirPath) {
    return new Promise(function (resolve) {
        var fromPath = path.join(options.config.fs.root, path.posix.join(dirPath, name));
        var toPath = path.join(options.config.fs.root, path.posix.join(toDirPath, name));
        fs.copy(fromPath, toPath, function (err) {
            var result = {};
            result.name = name;
            result.success = !err;
            if (err) {
                result.message = err.message;
            }
            resolve(result);
        });
    });
};

var move = function (dirPath, name, toDirPath) {
    return new Promise(function (resolve) {
        var fromPath = path.join(options.config.fs.root, path.posix.join(dirPath, name));
        var toPath = path.join(options.config.fs.root, path.posix.join(toDirPath, name));
        fs.move(fromPath, toPath, function (err) {
            var result = {};
            result.name = name;
            result.success = !err;
            if (err) {
                result.message = err.message;
            }
            resolve(result);
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

var taskList = [];

var tasks = {
    copy: function (task, req) {
        if (req.query.button === 'paste') {
            var dirPath = safePath(req.query.path);
            return stat(dirPath).then(function () {
                task.inProgress = true;
                Promise.all(task.files.map(function (name) {
                    return copy(task.path, name, dirPath);
                })).then(function (result) {
                    task.inProgress = false;
                    task.result = result;
                });
            });
        }
    },
    cut: function (task, req) {
        if (req.query.button === 'paste') {
            var dirPath = safePath(req.query.path);
            return stat(dirPath).then(function () {
                task.inProgress = true;
                Promise.all(task.files.map(function (name) {
                    return move(task.path, name, dirPath);
                })).then(function (result) {
                    task.inProgress = false;
                    task.result = result;
                });
            });
        }
    },
    remove: function (task, req) {
        if (req.query.button === 'continue') {
            task.inProgress = true;
            Promise.all(task.files.map(function (name) {
                return remove(task.path, name);
            })).then(function (result) {
                task.inProgress = false;
                task.result = result;
            });
        }
    }
};

var actions = {
    files: function (req) {
        var dirPath = safePath(req.query.path);
        return readDir(dirPath).then(function (files) {
            return Promise.all(files.map(function (name) {
                var relPath = path.posix.join(dirPath, name);
                var file = new File(name, relPath);
                return stat(relPath).then(function (stats) {
                    file.setStats(stats);
                }, function (err) {
                    debug('getStats error', relPath, err);
                }).then(function () {
                    resolve(file);
                });
            }));
        }, function (err) {
            debug('readDir', err);
            var file = new File('..', safePath(req.query.path + '/..'));
            file.isDirectory = true;
            return [file];
        }).then(function (files) {
            return {
                success: true,
                files: files,
                path: path.posix.join(options.config.fs.rootName, dirPath)
            };
        });
    },
    remove: function (req) {
        var dirPath = safePath(req.query.path);
        var files = JSON.parse(req.query.files);
        return readDir(dirPath).then(function (localFiles) {
            var found = files.every(function (name) {
                return localFiles.indexOf(name) !== -1;
            });

            if (!found) {
                throw new Error('Some files is not found!');
            }

            taskList.push({
                action: 'remove',
                path: dirPath,
                files: files,
                buttons: ['continue', 'cancel']
            });

            return {
                success: true,
                taskList: taskList
            };
        });
    },
    copy: function (req) {
        var dirPath = safePath(req.query.path);
        var files = JSON.parse(req.query.files);
        return readDir(dirPath).then(function (localFiles) {
            var found = files.every(function (name) {
                return localFiles.indexOf(name) !== -1;
            });

            if (!found) {
                throw new Error('Some files is not found!');
            }

            taskList.push({
                action: 'copy',
                path: dirPath,
                files: files,
                buttons: ['paste', 'cancel']
            });

            return {
                success: true,
                taskList: taskList
            };
        });
    },
    cut: function (req) {
        var dirPath = safePath(req.query.path);
        var files = JSON.parse(req.query.files);
        return readDir(dirPath).then(function (localFiles) {
            var found = files.every(function (name) {
                return localFiles.indexOf(name) !== -1;
            });

            if (!found) {
                throw new Error('Some files is not found!');
            }

            taskList.push({
                action: 'cut',
                path: dirPath,
                files: files,
                buttons: ['paste', 'cancel']
            });

            return {
                success: true,
                taskList: taskList
            };
        });
    },
    task: function (req) {
        var taskIndex = parseInt(req.query.taskIndex);
        var button = req.query.button;
        var task = taskList[taskIndex];
        if (!task) {
            throw new Error('Task is not found!');
        }

        var pos = task.buttons.indexOf(button);
        if (pos === -1) {
            throw new Error('Task button is not found!');
        }

        task.buttons.splice(pos, 1);
        return new Promise(function (resolve) {
            return resolve(tasks[task.action](task, req));
        }).catch(function (err) {
            task.buttons.splice(pos, 0, button);
            throw err;
        }).then(function () {
            return {
                success: true,
                taskList: taskList
            };
        });
    }
};

options.expressApp.get('/fs/api', function (req, res) {
    new Promise(function (resolve) {
        return resolve(actions[req.query.action](req));
    }).then(function (data) {
        res.json(data);
    }).catch(function (err) {
        debug('getApi', err);
        res.status(500).json({success: false, message: err.message});
    });
});

options.expressApp.use(path.posix.join('/fs', options.config.fs.rootName), express.static(options.config.fs.root));
options.expressApp.use('/fs', express.static(path.join(__dirname + '/../../frontend')));

options.server = options.expressApp.listen(options.config.express.port, options.config.express.host, function () {
    var host = options.server.address().address;
    var port = options.server.address().port;

    debug('Listening at http://%s:%s', host, port);
});