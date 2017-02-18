/**
 * Created by Anton on 18.02.2017.
 */
"use strict";
var debug = require('debug')('app:fsWatcher');

var FsWatcher = function (options, session) {
    var updateInterval = 1;
    var path = '';
    var lastFileListJson = '';
    var timer = null;
    var destroyed = false;

    var initTimer = function () {
        if (destroyed) return;

        clearTimeout(timer);
        timer = setTimeout(function () {
            if (!options.pulling.isConnected(session.id)) {
                return initTimer();
            }

            options.fileList.getList(path).then(function (fileList) {
                var fileListJson = JSON.stringify(fileList.files);
                if (fileListJson !== lastFileListJson) {
                    lastFileListJson = fileListJson;
                    session.setFileList(fileList, true);
                }
                initTimer();
            }).catch(function (err) {
                debug('getList error!', err);
            });
        }, updateInterval * 1000);
    };

    this.init = function (fileList) {
        path = fileList.path;
        lastFileListJson = JSON.stringify(fileList);
        initTimer();
    };
    this.destroy = function () {
        destroyed = true;
        clearTimeout(timer);
        timer = null;
    };
};

module.exports = FsWatcher;