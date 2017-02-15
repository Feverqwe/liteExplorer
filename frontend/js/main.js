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
    './table',
    './taskList',
    './notification',
    './head',
    './pulling'
], function (EventEmitter, dom, utils, Dialog, PageController, Table, TaskList, notification, Head, Pulling) {
    var ee = new EventEmitter();

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
                    table.setFileList(body.fileList);
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

            table.loadingFileList();

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


    var table = new Table(config, ee);

    var taskList = new TaskList(ee, sendAction, table);

    var head = new Head(ee, config, sendAction, table);

    var pulling = new Pulling(ee, table, taskList);

    var explorerNode = document.querySelector('.explorer');
    explorerNode.appendChild(head.node);
    explorerNode.appendChild(taskList.node);
    explorerNode.appendChild(table.node);

    pageController.applyUrl();
});