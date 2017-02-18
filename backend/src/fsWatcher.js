/**
 * Created by Anton on 18.02.2017.
 */
"use strict";
var debug = require('debug')('app:fsWatcher');

var FsWatcher = function (options) {
    var updateInterval = 1;
    var timer = null;

    var onTimer = function () {
        var sessionIdMap = options.sessionIdMap;
        var hasListeners = false;
        var pathPromiseMap = {};
        Object.keys(sessionIdMap).forEach(function (id) {
            hasListeners = true;

            var session = sessionIdMap[id];
            if (options.pulling.isConnected(id)) {
                var path = session.fileList.path;
                var promise = pathPromiseMap[path];
                if (!promise) {
                    promise = pathPromiseMap[path] = options.fileList.getList(path);
                }

                promise.then(function (fileList) {
                    session.setFileList(fileList, true);
                });
            }
        });
        return hasListeners;
    };
    var startTimer = function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
            timer = null;
            if (onTimer()) {
                startTimer();
            }
        }, updateInterval * 1000);
    };

    this.runTimer = function () {
        if (timer === null) {
            startTimer();
        }
    };
};

module.exports = FsWatcher;