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
    './notification'
], function (EventEmitter, dom, utils, Dialog, PageController, Table, TaskList, notification) {
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
                callback(null, response.body);
            } else {
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

            sendAction({
                path: self.get('path') || '',
                action: 'files'
            }, function (err, response) {
                if (err) {
                    notification('getFiles error!', err);
                    throw err;
                }

                ee.trigger('setFileList', [response]);

                var url = self.getUrl();
                var title = document.title = getTitle();

                history.replaceState(null, title, url);
            });
        };
    })(pageController);


    var taskList = new TaskList(ee);

    var table = new Table(config, ee);

    var getHead = function () {
        var map = {
            name: 'Name',
            size: 'Size',
            ext: 'Extension',
            atime: 'Access Time',
            mtime: 'Modified Time',
            ctime: 'Change Time',
            birthtime: 'Birth Time'
        };

        var getSortDialog = function () {
            var dialog = new Dialog();
            var globalNode = dom.el('input', {
                type: 'radio',
                name: 'folder-type',
                value: 'global'
            });
            var localNode = dom.el('input', {
                type: 'radio',
                name: 'folder-type',
                value: 'local'
            });
            var sortObj = config.sortFolder[table.path];
            if (sortObj) {
                localNode.checked = true;
            } else {
                sortObj = config.sort;
                globalNode.checked = true;
            }
            dom.el(dialog.body, {
                class: ['dialog-select_sort'],
                append: [
                    dom.el('div', {
                        append: Object.keys(map).map(function (type) {
                            var classList = [];
                            if (sortObj.type === type) {
                                classList.push('selected');
                                if (sortObj.reverse) {
                                    classList.push('reverse');
                                }
                            }
                            return dom.el('a', {
                                class: classList,
                                data: {
                                    type: type
                                },
                                href: '#' + type,
                                text: map[type]
                            })
                        }),
                        on: ['click', function (e) {
                            e.preventDefault();
                            dialog.destroy();
                            var type = e.target.dataset.type;
                            if (type) {
                                var folder = table.path;
                                if (globalNode.checked) {
                                    folder = null;
                                    delete config.sortFolder[table.path];
                                }
                                ee.trigger('changeSort', [type, folder]);
                            }
                        }]
                    }),
                    dom.el('div', {
                        class: 'radio-wrapper',
                        append: [
                            dom.el('label', {
                                append: [
                                    globalNode,
                                    'Global'
                                ]
                            }),
                            dom.el('label', {
                                append: [
                                    localNode,
                                    'Local'
                                ]
                            })
                        ]
                    })
                ]
            });
            dialog.show();
        };

        var getRemoveDialog = function () {
            var files = table.getSelectedFiles();
            if (!files.length) {
                return;
            }
            var dialog = new Dialog();
            dom.el(dialog.body, {
                class: ['dialog-remove_files'],
                append: [
                    dom.el('span', {
                        class: 'dialog__label',
                        text: 'Remove files?'
                    }),
                    dom.el('div', {
                        class: 'dialog__items',
                        append: files.map(function (file) {
                            return dom.el('div', {
                                class: ['item'],
                                text: file.name
                            })
                        })
                    }),
                    dom.el('div', {
                        class: ['dialog__button_box'],
                        append: [
                            dom.el('a', {
                                class: ['button'],
                                href: '#add',
                                text: 'Remove',
                                on: ['click', function (e) {
                                    e.preventDefault();
                                    sendAction({
                                        path: table.path,
                                        files: JSON.stringify(files.map(function (file) {
                                            return file.name;
                                        })),
                                        action: 'newTask',
                                        type: 'remove'
                                    }, function (err) {
                                        if (err) {
                                            notification('removeFiles error!', err);
                                            throw err;
                                        }
                                        dialog.destroy();
                                    });
                                }]
                            }),
                            dom.el('a', {
                                class: ['button'],
                                href: '#cancel',
                                text: 'Cancel',
                                on: ['click', function (e) {
                                    e.preventDefault();
                                    dialog.destroy();
                                }]
                            })
                        ]
                    })
                ]
            });
            dialog.show();
        };

        var titleNode;

        ee.on('setTitle', function (text) {
            titleNode.textContent = text;
        });

        var node = dom.el('div', {
            class: 'head',
            append: [
                titleNode = dom.el('div', {
                    class: 'title'
                }),
                dom.el('div', {
                    class: 'panel',
                    append: [
                        dom.el('a', {
                            href: '#sort',
                            class: ['btn', 'btn-sort'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                getSortDialog();
                            }]
                        }),
                        dom.el('a', {
                            href: '#remove',
                            class: ['btn', 'btn-remove'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                getRemoveDialog();
                            }]
                        }),
                        dom.el('a', {
                            href: '#copu',
                            class: ['btn', 'btn-copy'],
                            on: ['click', function (e) {
                                e.preventDefault();

                            }]
                        }),
                        dom.el('a', {
                            href: '#cut',
                            class: ['btn', 'btn-cut'],
                            on: ['click', function (e) {
                                e.preventDefault();

                            }]
                        }),
                        dom.el('a', {
                            href: '#refresh',
                            class: ['btn', 'btn-refresh'],
                            on: ['click', function (e) {
                                e.preventDefault();

                                sendAction({
                                    path: table.path,
                                    action: 'files'
                                }, function (err, response) {
                                    if (err) {
                                        notification('getFiles error!', err);
                                        throw err;
                                    }

                                    ee.trigger('setFileList', [response]);
                                });
                            }]
                        })
                    ]
                })
            ]
        });


        return node;
    };

    var explorerNode = document.querySelector('.explorer');
    explorerNode.appendChild(getHead());
    explorerNode.appendChild(taskList.node);
    explorerNode.appendChild(table.node);

    pageController.applyUrl();
});