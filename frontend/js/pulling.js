/**
 * Created by Anton on 14.02.2017.
 */
"use strict";
define([
    './utils',
    './notification'
], function (utils, notification) {
    var Pulling = function (ee, fileList, taskList, options) {
        var tabIsActive = false;

        var waitResponse = false;
        var pull = function () {
            if (waitResponse) return;
            waitResponse = true;

            utils.request({
                url: './api?' + utils.param({
                    action: 'pull',
                    sessionId: options.sessionId,
                    fileList: JSON.stringify(fileList.getInfo()),
                    taskList: JSON.stringify(taskList.getInfo())
                }),
                json: true
            }, function (err, response) {
                waitResponse = false;

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
                } else {
                    notification('pull error!', err);
                }

                tabIsActive && setTimeout(function () {
                    tabIsActive && pull();
                }, (err ? 1 : 0) * 1000);
            });
        };

        var onTabActivityChange = function () {
            tabIsActive && pull();
        };

        var onMouseMove = function () {
            document.removeEventListener('mousemove', onMouseMove);
            if (!tabIsActive) {
                tabIsActive = true;
                onTabActivityChange();
            }
        };
        document.addEventListener('mousemove', onMouseMove);

        window.addEventListener('focus', function () {
            if (!tabIsActive) {
                tabIsActive = true;
                onTabActivityChange();
            }
        });
        window.addEventListener('blur', function () {
            if (tabIsActive) {
                tabIsActive = false;
                onTabActivityChange();
            }
        });

        this.pull = pull;
    };
    return Pulling;
});