/**
 * Created by Anton on 11.02.2017.
 */
"use strict";
require([
    './lib/EventEmitter.min.js',
    './lib/filesize.min.js',
    './js/dom',
    './js/utils',
    './js/dialog',
    './js/pageController'
], function (EventEmitter, filesize, dom, utils, Dialog, PageController) {
    var ee = new EventEmitter();

    var config = {};
    try {
        config = JSON.parse(localStorage.config);
    } catch(e){}

    if (!config.sort) {
        config.sort = {type: 'date', reverse: false};
    }

    (function () {
        var loadPath = function (path) {
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

    var getTable = function () {
        var tableNode = dom.el('div', {
            class: 'table'
        });

        var itemObjList = [];

        var getFile = function (file) {
            var ext = '';
            var date = utils.getDateStr(file.mtime);
            var size = filesize(file.size || 0);
            var href = file.path;
            var target = '';
            var classList = ['file__icon', 'icon'];
            if (file.isDirectory) {
                href = '#/' + href;
                classList.push('icon-folder');
                target = '_self';
            } else {
                ext = file.ext.replace('.', '');
                classList.push('icon-file', 'icon-' + ext);
                target = '_blank';
            }
            var node = dom.el('a', {
                class: 'file',
                target: target,
                href: href,
                append: [
                    dom.el('div', {
                        class: classList
                    }),
                    dom.el('div', {
                        class: 'second-row',
                        append: [
                            dom.el('div', {
                                class: 'file__name',
                                text: file.name
                            }),
                            dom.el('div', {
                                class: 'file__info',
                                text: [size, date].join(' ')
                            })
                        ]
                    })
                ]
            });

            return {
                node: node,
                file: file
            };
        };

        var sort = function () {
            var type = config.sort.type;
            var reverse = config.sort.reverse;

            var sortKey = '';
            if (type === 'size') {
                sortKey = 'size';
            } else
            if (type === 'name') {
                sortKey = 'name';
            } else {
                sortKey = 'mtime';
            }

            var dirs = [];
            var files = [];

            var sortFn = function (aa, bb) {
                var a = aa.file;
                var b = bb.file;
                var r = a[sortKey] > b[sortKey];
                if (reverse) {
                    r = !r;
                }
                return r ? 1 : -1;
            };

            itemObjList.sort(sortFn).forEach(function (itemObj) {
                if (itemObj.file.isDirectory) {
                    if (itemObj.file.name === '..') {
                        dirs.unshift(itemObj);
                    } else {
                        dirs.push(itemObj);
                    }
                } else {
                    files.push(itemObj);
                }
            });

            itemObjList.splice(0);
            itemObjList.push.apply(itemObjList, dirs);
            itemObjList.push.apply(itemObjList, files);
        };

        var setFiles = function (files) {
            tableNode.textContent = '';
            itemObjList.splice(0);

            files.forEach(function (file) {
                var itemObj = getFile(file);
                itemObjList.push(itemObj);
            });

            sort();

            itemObjList.forEach(function (itemObj) {
                tableNode.appendChild(itemObj.node);
            });
        };

        ee.on('setFileList', function (response) {
            setFiles(response.files);
        });

        ee.on('sort', function (type) {
            if (config.sort.type === type) {
                config.sort.reverse = !config.sort.reverse;
            } else {
                config.sort.type = type;
                config.sort.reverse = false;
            }

            localStorage.config = JSON.stringify(config);

            sort();

            itemObjList.forEach(function (itemObj) {
                tableNode.appendChild(itemObj.node);
            });
        });

        return tableNode;
    };

    var getHead = function () {
        var node = dom.el('div', {
            class: 'head',
            append: [
                dom.el('a', {
                    href: '#sort',
                    class: ['btn', 'btn-sort'],
                    on: ['click', function (e) {
                        e.preventDefault();
                        var dialog = new Dialog();
                        dom.el(dialog.body, {
                            class: ['dialog-select_sort'],
                            append: [
                                dom.el('a', {
                                    data: {
                                        type: 'date'
                                    },
                                    href: '#date',
                                    text: 'Date'
                                }),
                                dom.el('a', {
                                    data: {
                                        type: 'name'
                                    },
                                    href: '#name',
                                    text: 'Name'
                                }),
                                dom.el('a', {
                                    data: {
                                        type: 'size'
                                    },
                                    href: '#size',
                                    text: 'Size'
                                })
                            ],
                            on: ['click', function (e) {
                                e.preventDefault();
                                dialog.destroy();
                                var type = e.target.dataset.type;
                                if (type) {
                                    ee.trigger('sort', [type]);
                                }
                            }]
                        });
                        dialog.show();
                    }]
                })
            ]
        });


        return node;
    };

    var explorerNode = document.querySelector('.explorer');
    explorerNode.appendChild(getHead());
    explorerNode.appendChild(getTable());

    pageController.applyUrl();
});