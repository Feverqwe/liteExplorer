/**
 * Created by Anton on 13.02.2017.
 */
"use strict";
define([
    '../lib/filesize.min.js',
    './dom',
    './utils'
], function (filesize, dom, utils) {
    var TackList = function (ee, sendAction, fileList) {
        var self = this;

        var tableNode = dom.el('div', {
            class: 'taskList'
        });

        var map = {
            copy: 'Copy',
            cut: 'Cut',
            paste: 'Paste',
            remove: 'Remove',
            cancel: 'Cancel',
            close: 'Close',
            continue: 'Continue'
        };

        var itemObjList = [];

        var actionNode = null;
        var getTask = function (task, index) {
            var itemObj = {};
            itemObj.task = task;

            var getTaskInfo = function (task) {
                if (task.type === 'remove') {
                    return dom.el('div', {
                        class: 'file_list',
                        append: task.files.map(function (file) {
                            return dom.el('div', {
                                class: 'item',
                                text: task.path + '/' + file
                            });
                        })
                    });
                } else
                if (task.type === 'copy' || task.type === 'cut') {
                    return dom.el('div', {
                        class: 'file_list',
                        append: task.files.map(function (file) {
                            return dom.el('div', {
                                class: 'item',
                                text: [task.fromPath, task.toPath || '[hear]'].join(' > ') + ' ' + file
                            });
                        })
                    });
                }
            };

            var node = dom.el('div', {
                class: 'task',
                data: {
                    index: index
                },
                append: [
                    dom.el('div', {
                        class: ['task__icon', 'icon-' + task.type]
                    }),
                    dom.el('div', {
                        class: 'task__name',
                        text: map[task.type]
                    }),
                    dom.el('div', {
                        class: 'task__info',
                        append: getTaskInfo(task)
                    }),
                    actionNode = dom.el(document.createDocumentFragment(), {
                        append: task.buttons.map(function (action) {
                            return dom.el('a', {
                                class: ['task__btn', 'btn-' + action],
                                href: '#' + action,
                                data: {
                                    action: action
                                },
                                text: map[action],
                                on: ['click', function (e) {
                                    e.preventDefault();
                                    var params = {
                                        action: 'task',
                                        taskId: task.id,
                                        button: action
                                    };
                                    if (action === 'paste') {
                                        params.path = fileList.getPath()
                                    }
                                    sendAction(params);
                                }]
                            })
                        })
                    })
                ]
            });

            itemObj.node = node;

            return itemObj;
        };

        var setTasks = function (tasks) {
            tableNode.textContent = '';
            itemObjList.splice(0);

            tasks.forEach(function (item, index) {
                var itemObj = getTask(item, index);
                itemObjList.push(itemObj);
            });

            itemObjList.forEach(function (item) {
                tableNode.appendChild(item.node);
            });
        };

        var id = null;
        this.setTaskList = function (taskList) {
            id = taskList.id;
            setTasks(taskList.tasks);
        };
        this.getInfo = function () {
            return {id: id};
        };
        this.node = tableNode;
    };
    return TackList;
});