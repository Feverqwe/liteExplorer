/**
 * Created by anton on 18.02.17.
 */
"use strict";
var debug = require('debug')('app:session');
var FsWatcher = require('./fsWatcher');

var Session = function (id, options) {
    var self = this;
    var timeoutTime = 3 * 60;
    var timeoutTimer = null;
    var destroyed = false;

    var fsWatcher = new FsWatcher(options, self);
    this.id = id;
    this.fileList = {
        id: 0,
        path: '',
        files: null
    };
    this.taskList = {
        id: 0,
        tasks: null
    };

    var refreshTimeout = function () {
        if (destroyed) return;

        clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(function () {
            self.destroy();
        }, timeoutTime * 1000);
    };

    var setChanges = function (oldObj, newObj) {
        var hasChanges = false;
        var newValue, oldValue;
        for (var key in newObj) {
            newValue = JSON.stringify(newObj[key]);
            oldValue = JSON.stringify(oldObj[key]);
            if (newValue !== oldValue) {
                hasChanges = true;
                oldObj[key] = JSON.parse(newValue);
            }
        }
        if (hasChanges) {
            oldObj.id++;
        }
        return hasChanges;
    };

    var pullChangeTimeout = null;
    var pullChange = function () {
        clearTimeout(pullChangeTimeout);
        pullChangeTimeout = setTimeout(function () {
            options.pulling.change(id);
        }, 50);
    };

    this.setFileList = function (fileList, byWatcher) {
        var hasChanges = setChanges(this.fileList, fileList);
        if (hasChanges) {
            !byWatcher && fsWatcher.init(fileList);
            pullChange();
        }
    };
    this.setTaskList = function (taskList) {
        var hasChanges = setChanges(this.taskList, taskList);
        if (hasChanges) {
            pullChange();
        }
    };
    this.onConnection = function () {
        refreshTimeout();
    };
    this.destroy = function () {
        destroyed = true;
        delete options.sessionIdMap[id];
        fsWatcher.destroy();
    };
};

module.exports = Session;