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
                var body = response.body;
                if (body.files) {
                    ee.trigger('setFileList', [body]);
                }
                if (body.taskList) {
                    ee.trigger('setTaskList', [body]);
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

            sendAction({
                path: self.get('path') || '',
                action: 'files'
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

        var getNameDialog = function (name, callback) {
            var dialog = new Dialog();
            var saveNode;
            dom.el(dialog.body, {
                class: ['dialog-rename'],
                append: [
                    dom.el('span', {
                        class: 'dialog__label',
                        text: 'Name'
                    }),
                    dialog.addInput(dom.el('input', {
                        type: 'text',
                        name: 'name',
                        value: name,
                        on: ['keypress', function (e) {
                            if (e.keyCode === 13) {
                                saveNode.dispatchEvent(new MouseEvent('click', {cancelable: true}));
                            }
                        }]
                    })),
                    dom.el('div', {
                        class: 'dialog__button_box',
                        append: [
                            saveNode = dom.el('a', {
                                class: ['button', 'button-save'],
                                href: '#save',
                                text: 'Save',
                                on: ['click', function (e) {
                                    e.preventDefault();
                                    var values = dialog.getValues();

                                    callback(values.name);

                                    dialog.destroy();
                                }]
                            }),
                            dom.el('a', {
                                class: ['button', 'button-cancel'],
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
                            class: ['btn', 'icon-remove'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                var files = table.getSelectedFiles().map(function (file) {
                                    return file.name
                                });
                                files.length && sendAction({
                                    action: 'newTask',
                                    type: 'remove',
                                    path: table.path,
                                    files: JSON.stringify(files)
                                }, function (err, response) {
                                    if (err) {
                                        throw err;
                                    }
                                    table.resetSelect();
                                });
                            }]
                        }),
                        dom.el('a', {
                            href: '#copu',
                            class: ['btn', 'icon-copy'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                var files = table.getSelectedFiles().map(function (file) {
                                    return file.name
                                });
                                files.length && sendAction({
                                    action: 'newTask',
                                    type: 'copy',
                                    path: table.path,
                                    files: JSON.stringify(files)
                                }, function (err, response) {
                                    if (err) {
                                        throw err;
                                    }
                                    table.resetSelect();
                                });
                            }]
                        }),
                        dom.el('a', {
                            href: '#cut',
                            class: ['btn', 'icon-cut'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                var files = table.getSelectedFiles().map(function (file) {
                                    return file.name
                                });
                                files.length && sendAction({
                                    action: 'newTask',
                                    type: 'cut',
                                    path: table.path,
                                    files: JSON.stringify(files)
                                }, function (err, response) {
                                    if (err) {
                                        throw err;
                                    }
                                    table.resetSelect();
                                });
                            }]
                        }),
                        dom.el('a', {
                            href: '#rename',
                            class: ['btn', 'icon-rename'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                var files = table.getSelectedFiles().map(function (file) {
                                    return file.name
                                });

                                files.length && getNameDialog(files[0], function (name) {
                                    sendAction({
                                        action: 'rename',
                                        path: table.path,
                                        file: files[0],
                                        name: name
                                    }, function (err, response) {
                                        if (err) {
                                            throw err;
                                        }
                                        table.resetSelect();
                                    });
                                });
                            }]
                        }),
                        dom.el('a', {
                            href: '#newFolder',
                            class: ['btn', 'icon-new-folder'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                getNameDialog('New folder', function (name) {
                                    sendAction({
                                        action: 'newFolder',
                                        path: table.path,
                                        name: name
                                    }, function (err, response) {
                                        if (err) {
                                            throw err;
                                        }
                                    });
                                });
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
                                        throw err;
                                    }
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