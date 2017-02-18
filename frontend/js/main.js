/**
 * Created by Anton on 11.02.2017.
 */
"use strict";
define([
    '../lib/EventEmitter.min.js',
    './dom',
    './utils',
    './dialog',
    './pageController',
    './fileList',
    './taskList',
    './notification',
    './head',
    './pulling'
], function (EventEmitter, dom, utils, Dialog, PageController, FileList, TaskList, notification, Head, Pulling) {
    var ee = new EventEmitter();

    var options = {
        sessionId: Math.random() * 100000 + '_' + parseInt(Date.now() / 1000)
    };

    var config = {};
    try {
        config = JSON.parse(localStorage.config);
    } catch(e){}

    if (!config.defaultSort) {
        config.defaultSort = {type: 'mtime', reverse: false};
    }

    if (!config.sort) {
        config.sort = JSON.parse(JSON.stringify(config.defaultSort));
    }

    if (!config.sortFolder) {
        config.sortFolder = {};
    }

    var sendAction = function (params, callback) {
        params.sessionId = options.sessionId;
        return utils.request({
            url: './api?' + utils.param(params),
            json: true
        }, function (err, response) {
            if (!err && !response.body.success) {
                err = new Error(response.body.message);
            }
            if (!err) {
                var body = response.body;
                if (body.fileList) {
                    fileList.setFileList(body.fileList);
                }
                if (body.taskList) {
                    taskList.setTaskList(body.taskList);
                }
                callback(null, body);
            } else {
                notification('sendAction error!', err);
                callback(err);
            }
        });
    };

    var pageController = new PageController();
    (function (pageController) {
        var getTitle = function () {
            var title;
            var path = pageController.get('path');
            if (typeof path === 'string') {
                title = JSON.stringify(path) + ' :: liteExplorer';
            } else {
                title = 'liteExplorer';
            }
            return title;
        };
        pageController.applyUrl = function () {
            var self = pageController;

            fileList.loadingFileList();

            sendAction({
                path: self.get('path') || '',
                action: 'fileList'
            }, function (err) {
                if (err) {
                    throw err;
                }

                var url = self.getUrl();
                var title = document.title = getTitle();

                history.replaceState(null, title, url);
            });
        };
    })(pageController);


    var fileList = new FileList(config, ee);
    var taskList = new TaskList(ee, sendAction, fileList);
    var head = new Head(ee, config, sendAction, fileList);
    var pulling = new Pulling(ee, fileList, taskList, options);

    var explorerNode = document.querySelector('.explorer');
    explorerNode.appendChild(head.node);
    explorerNode.appendChild(taskList.node);
    explorerNode.appendChild(fileList.node);

    pageController.applyUrl();
});