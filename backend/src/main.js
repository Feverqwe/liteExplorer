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

var File = function (name, urlPath) {
    var self = this;
    self.name = name;
    self.ext = path.extname(name);
    self.path = urlPath;
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
 * @param {string} localDirPath
 * @returns {Promise}
 */
var readDir = function (localDirPath) {
    return new Promise(function (resolve, reject) {
        fs.readdir(localDirPath, function (err, files) {
            if (err) {
                reject(err);
            } else {
                if (localDirPath !== options.config.fs.root) {
                    files.push('..');
                }
                resolve(files);
            }
        });
    });
};

/**
 * @param {string} localPath
 * @returns {Promise} always true
 */
var stat = function (localPath) {
    return new Promise(function (resolve, reject) {
        fs.stat(localPath, function (err, stats) {
            if (err) {
                reject(err);
            } else {
                resolve(stats);
            }
        });
    });
};

/**
 * @param {string} localPath
 * @returns {Promise}
 */
var fsRemove = function (localPath) {
    return new Promise(function (resolve) {
        fs.remove(localPath, function (err) {
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

/**
 * @param {string} fromPath
 * @param {string} toPath
 * @returns {Promise}
 */
var fsCopy = function (fromPath, toPath) {
    return new Promise(function (resolve) {
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

/**
 * @param {string} fromPath
 * @param {string} toPath
 * @returns {Promise}
 */
var fsMove = function (fromPath, toPath) {
    return new Promise(function (resolve) {
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

/**
 * @param {string} localDirPath
 * @param {string[]} files
 * @returns {*}
 */
var validateFiles = function (localDirPath, files) {
    return readDir(localDirPath).then(function (localFiles) {
        var found = files.every(function (name) {
            return localFiles.indexOf(name) !== -1;
        });

        if (!found) {
            throw new Error('Some files is not found!');
        }
    });
};

var Tasks = function () {
    var self = this;
    var id = 0;
    var taskList = [];

    this.remove = {
        create: function (req) {
            var webDirPath = safePath(req.query.path);
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            var files = JSON.parse(req.query.files);
            return validateFiles(localDirPath, files).then(function () {
                taskList.push({
                    type: 'remove',
                    id: ++id,
                    path: webDirPath,
                    files: files,
                    buttons: ['continue', 'cancel']
                });
            });
        },
        continue: function (task, req) {
            task.inProgress = true;
            return Promise.all(task.files.map(function (name) {
                var localPath = path.join(options.config.fs.root, task.path, name);
                return fsRemove(localPath);
            })).then(function (result) {
                task.inProgress = false;
                task.result = result;
            });
        },
        cancel: function (task, req) {
            var pos = taskList.indexOf(task);
            if (pos !== -1) {
                taskList.splice(pos, 1);
            }
        }
    };
    this.copy = {
        create: function (req) {
            var webDirPath = safePath(req.query.path);
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            var files = JSON.parse(req.query.files);
            return validateFiles(localDirPath, files).then(function () {
                taskList.push({
                    type: 'copy',
                    id: ++id,
                    path: webDirPath,
                    files: files,
                    buttons: ['paste', 'cancel']
                });
            });
        },
        paste: function (task, req) {
            var webDirPath = safePath(req.query.path);
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            return stat(localDirPath).then(function () {
                task.inProgress = true;
                return Promise.all(task.files.map(function (name) {
                    var fromPath = path.join(options.config.fs.root, task.path, name);
                    var toPath = path.join(localDirPath, name);
                    return fsCopy(fromPath, toPath);
                })).then(function (result) {
                    task.inProgress = false;
                    task.result = result;
                });
            });
        },
        cancel: function (task, req) {
            var pos = taskList.indexOf(task);
            if (pos !== -1) {
                taskList.splice(pos, 1);
            }
        }
    };
    this.cut = {
        create: function (req) {
            var webDirPath = safePath(req.query.path);
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            var files = JSON.parse(req.query.files);
            return validateFiles(localDirPath, files).then(function () {
                taskList.push({
                    type: 'cut',
                    id: ++id,
                    path: webDirPath,
                    files: files,
                    buttons: ['paste', 'cancel']
                });
            });
        },
        paste: function (task, req) {
            var webDirPath = safePath(req.query.path);
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            return stat(localDirPath).then(function () {
                task.inProgress = true;
                Promise.all(task.files.map(function (name) {
                    var fromPath = path.join(options.config.fs.root, task.path, name);
                    var toPath = path.join(localDirPath, name);
                    return fsMove(fromPath, toPath);
                })).then(function (result) {
                    task.inProgress = false;
                    task.result = result;
                });
            });
        },
        cancel: function (task, req) {
            var pos = taskList.indexOf(task);
            if (pos !== -1) {
                taskList.splice(pos, 1);
            }
        }
    };

    this.getList = function () {
        return taskList;
    };
    this.onTask = function (req) {
        var taskId = parseInt(req.query.taskId);
        var button = req.query.button;

        var task = null;
        taskList.some(function (item) {
            if (item.id === taskId) {
                task = item;
                return true;
            }
        });
        if (!task) {
            throw new Error('Task is not found!');
        }

        var pos = task.buttons.indexOf(button);
        if (pos === -1) {
            throw new Error('Task button is not found!');
        }

        if (task.lock) {
            throw new Error('Task is locked!');
        }

        task.buttons.splice(pos, 1);
        task.lock = true;
        new Promise(function (resolve) {
            return resolve(self[task.type][button](task, req));
        }).catch(function (err) {
            debug('Task error!', task.type, err);
        }).then(function () {
            task.lock = false;
        });
    };
};

var tasks = new Tasks();

/**
 * @param {string} evalPath
 * @returns {string}
 */
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

var actions = {
    files: function (req) {
        var webDirPath = safePath(req.query.path);
        var localDirPath = path.join(options.config.fs.root, webDirPath);
        return readDir(localDirPath).then(function (files) {
            return Promise.all(files.map(function (name) {
                var webFilePath = path.posix.join(options.config.fs.rootName, webDirPath, name);
                var file = new File(name, webFilePath);
                var localFilePath = path.join(localDirPath, name);
                return stat(localFilePath).then(function (stats) {
                    file.setStats(stats);
                }, function (err) {
                    debug('getStats error', webFilePath, err);
                }).then(function () {
                    return file;
                });
            }));
        }, function (err) {
            debug('readDir', err);
            var webFilePath = path.posix.join(options.config.fs.rootName, safePath(req.query.path + '/..'));
            var file = new File('..', webFilePath);
            file.isDirectory = true;
            return [file];
        }).then(function (files) {
            return {
                success: true,
                files: files,
                path: path.posix.join(options.config.fs.rootName, webDirPath),
                taskList: tasks.getList()
            };
        });
    },
    newTask: function (req) {
        return tasks[req.query.type].create(req).then(function () {
            return {
                success: true,
                taskList: tasks.getList()
            };
        });
    },
    task: function (req) {
        return tasks.onTask(req).then(function () {
            return {
                success: true,
                taskList: tasks.getList()
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