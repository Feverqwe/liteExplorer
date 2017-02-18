/**
 * Created by anton on 18.02.17.
 */
"use strict";
var Session = function (id, options) {
    var self = this;
    this.id = id;
    this.fileList = {
        id: 0
    };
    this.taskList = {
        id: 0
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

    this.setFileList = function (fileList) {
        var hasChanges = setChanges(this.fileList, fileList);
        if (hasChanges) {
            options.pulling.change(id);
        }
    };
    this.setTaskList = function (taskList) {
        var hasChanges = setChanges(this.taskList, taskList);
        if (hasChanges) {
            options.pulling.change(id);
        }
    };
};

module.exports = Session;