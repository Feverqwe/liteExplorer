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
    './table'
], function (EventEmitter, dom, utils, Dialog, PageController, Table) {
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

    (function () {
        var loadPath = function (path) {
            ee.trigger('loadingFileList');
            utils.request({
                url: './api?' + utils.param({
                    path: path || ''
                }),
                json: true
            }, function (err, response) {
                if (!err && response.body.success) {
                    ee.trigger('setFileList', [response.body]);
                } else {
                    throw err;
                }
            });
        };

        ee.on('loadPath', loadPath);
    })();

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
            var title = document.title = getTitle();

            ee.trigger('loadPath', [self.get('path') || '']);

            var url = self.getUrl();

            history.replaceState(null, title, url);
        };
    })(pageController);

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
            var dialog = new Dialog();
            dom.el(dialog.body, {
                class: ['dialog-remove_files'],
                append: [
                    dom.el('div', {
                        append: table.getSelectedFiles().map(function (file) {
                            return dom.el('span', {
                                text: file.name
                            })
                        })
                    })
                ]
            });
            dialog.show();
        };

        var node = dom.el('div', {
            class: 'head',
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
                })
            ]
        });


        return node;
    };

    var explorerNode = document.querySelector('.explorer');
    explorerNode.appendChild(getHead());
    explorerNode.appendChild(table.node);

    pageController.applyUrl();
});