/**
 * Created by anton on 18.02.17.
 */
"use strict";
var Session = function (id, options) {
    var self = this;
    var timeoutTime = 3 * 60;
    var timeoutTimer = null;

    this.id = id;
    this.fileList = {
        id: 0
    };
    this.taskList = {
        id: 0
    };

    var refreshTimeout = function () {
        clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(function () {
            delete options.sessionIdMap[id];
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

    this.setFileList = function (fileList) {
        var hasChanges = setChanges(this.fileList, fileList);
        if (hasChanges) {
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
};

module.exports = Session;