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
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            var files = JSON.parse(req.query.files);
            return utils.validateFiles(localDirPath, files).then(function () {
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
            task.buttons.splice(0);
            return Promise.all(task.files.map(function (name) {
                var localPath = path.join(options.config.fs.root, task.path, name);
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
        },
        cancel: removeTask,
        close: removeTask
    };
    this.copy = {
        create: function (req) {
            var webDirPath = utils.safePath(req.query.path);
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            var files = JSON.parse(req.query.files);
            return utils.validateFiles(localDirPath, files).then(function () {
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
            var webDirPath = utils.safePath(req.query.path);
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            return utils.fsStat(localDirPath).then(function () {
                task.buttons.splice(0);
                return Promise.all(task.files.map(function (name) {
                    var fromPath = path.join(options.config.fs.root, task.path, name);
                    var toPath = path.join(localDirPath, name);
                    var result = {name: name};
                    return utils.fsCopy(fromPath, toPath).then(function () {
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
    this.cut = {
        create: function (req) {
            var webDirPath = utils.safePath(req.query.path);
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            var files = JSON.parse(req.query.files);
            return utils.validateFiles(localDirPath, files).then(function () {
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
            var webDirPath = utils.safePath(req.query.path);
            var localDirPath = path.join(options.config.fs.root, webDirPath);
            return utils.fsStat(localDirPath).then(function () {
                task.buttons.splice(0);
                Promise.all(task.files.map(function (name) {
                    var fromPath = path.join(options.config.fs.root, task.path, name);
                    var toPath = path.join(localDirPath, name);
                    var result = {name: name};
                    return utils.fsMove(fromPath, toPath).then(function () {
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