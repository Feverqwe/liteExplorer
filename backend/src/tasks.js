/**
 * Created by Anton on 13.02.2017.
 */
var debug = require('debug')('tasks');
var path = require('path');
var utils = require('./utils');

var Tasks = function () {
    var self = this;
    var id = 0;
    var taskList = [];

    var removeTask = function (task) {
        var pos = taskList.indexOf(task);
        if (pos !== -1) {
            taskList.splice(pos, 1);
        }
        return Promise.resolve();
    };

    this.remove = {
        create: function (req) {
            var webDirPath = utils.safePath(req.query.path);
            var files = JSON.parse(req.query.files);
            taskList.push({
                type: 'remove',
                id: ++id,
                path: path.posix.join(options.config.fs.rootName, webDirPath),
                files: files,
                buttons: ['continue', 'cancel']
            });
        },
        continue: function (task, req) {
            task.buttons.splice(0);
            var webDirPath = utils.safePath(task.fromPath);
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            return utils.validateFiles(localDirPath, task.files).then(function () {
                return Promise.all(task.files.map(function (name) {
                    var localPath = path.join(localDirPath, name);
                    var result = {name: name};
                    return utils.fsRemove(localPath).then(function () {
                        result.success = true;
                    }, function (err) {
                        result.success = false;
                        result.message = err.message;
                    }).then(function () {
                        return result;
                    });
                })).then(function (result) {
                    task.result = result;
                    task.buttons.push('close');
                });
            });
        },
        cancel: removeTask,
        close: removeTask
    };
    this.copy = {
        create: function (req) {
            var webDirPath = utils.safePath(req.query.path);
            var files = JSON.parse(req.query.files);
            taskList.push({
                type: 'copy',
                id: ++id,
                fromPath: path.posix.join(options.config.fs.rootName, webDirPath),
                files: files,
                buttons: ['paste', 'cancel']
            });
        },
        paste: function (task, req) {
            var webDirFromPath = utils.safePath(task.fromPath);
            var webDirToPath = utils.safePath(req.query.path);
            var localDirFromPath = path.join(options.config.fs.root, webDirFromPath);
            var localDirToPath = path.join(options.config.fs.root, webDirToPath);
            return utils.validateFiles(localDirFromPath, task.files).then(function () {
                return utils.fsStat(localDirToPath).then(function () {
                    task.buttons.splice(0);
                    task.toPath = path.posix.join(options.config.fs.rootName, webDirToPath);
                    return Promise.all(task.files.map(function (name) {
                        var localFromPath = path.join(localDirFromPath, name);
                        var localToPath = path.join(localDirToPath, name);
                        var result = {name: name};
                        return utils.fsCopy(localFromPath, localToPath).then(function () {
                            result.success = true;
                        }, function (err) {
                            result.success = false;
                            result.message = err.message;
                        }).then(function () {
                            return result;
                        });
                    })).then(function (result) {
                        task.result = result;
                        task.buttons.push('close');
                    });
                });
            });
        },
        cancel: removeTask,
        close: removeTask
    };
    this.cut = {
        create: function (req) {
            var webDirPath = utils.safePath(req.query.path);
            var files = JSON.parse(req.query.files);
            taskList.push({
                type: 'cut',
                id: ++id,
                fromPath: path.posix.join(options.config.fs.rootName, webDirPath),
                files: files,
                buttons: ['paste', 'cancel']
            });
        },
        paste: function (task, req) {
            var webDirFromPath = utils.safePath(task.fromPath);
            var webDirToPath = utils.safePath(req.query.path);
            var localDirFromPath = path.join(options.config.fs.root, webDirFromPath);
            var localDirToPath = path.join(options.config.fs.root, webDirToPath);
            return utils.validateFiles(localDirFromPath, task.files).then(function () {
                return utils.fsStat(localDirToPath).then(function () {
                    task.buttons.splice(0);
                    task.toPath = path.posix.join(options.config.fs.rootName, webDirToPath);
                    Promise.all(task.files.map(function (name) {
                        var localFromPath = path.join(localDirFromPath, name);
                        var localToPath = path.join(localDirToPath, name);
                        var result = {name: name};
                        return utils.fsMove(localFromPath, localToPath).then(function () {
                            result.success = true;
                        }, function (err) {
                            result.success = false;
                            result.message = err.message;
                        }).then(function () {
                            return result;
                        });
                    })).then(function (result) {
                        task.result = result;
                        task.buttons.push('close');
                    });
                });
            });
        },
        cancel: removeTask,
        close: removeTask
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

        return Promise.resolve();
    };
};

module.exports = Tasks;