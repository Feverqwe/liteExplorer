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

    var defaultSort = JSON.stringify({type: 'mtime', reverse: false});

    var config = {};
    try {
        config = JSON.parse(localStorage.config);
    } catch(e){}

    if (!config.sort) {
        config.sort = JSON.parse(defaultSort);
    }

    if (!config.sortFolder) {
        config.sortFolder = {};
    }

    var currentPath = null;

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
            var linkClassList = ['file__link'];
            var iconClassList = ['file__icon', 'icon'];
            if (file.isDirectory) {
                href = '#/' + href;
                iconClassList.push('icon-folder');
                target = '_self';
                linkClassList.push('link-directory');
            } else {
                ext = file.ext.replace('.', '');
                iconClassList.push('icon-file', 'icon-' + ext);
                target = '_blank';
            }
            var selectBox = dom.el('input', {
                class: 'file__select',
                type: 'checkbox',
                on: ['change', function (e) {
                    if (this.checked) {
                        node.classList.add('selected');
                    } else {
                        node.classList.remove('selected');
                    }
                }]
            });
            var node = dom.el('div', {
                class: 'file',
                append: [
                    dom.el('div', {
                        class: iconClassList,
                        append: [
                            selectBox
                        ],
                        on: ['click', function (e) {
                            if (e.target !== selectBox) {
                                selectBox.checked = !selectBox.checked;
                                selectBox.dispatchEvent(new CustomEvent('change'));
                            }
                        }]
                    }),
                    dom.el('a', {
                        class: linkClassList,
                        target: target,
                        href: href,
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

        var sortInsertList = function(tableBody, sortedList) {
            var nodeList = [].slice.call(tableBody.childNodes);
            var insertItems = [];
            var insertPosition = null;
            var nodes = null;
            var child = null;

            for (var i = 0, listItem; listItem = sortedList[i]; i++) {
                if (nodeList[i] === listItem.node) {
                    continue;
                }
                insertPosition = i;

                nodes = document.createDocumentFragment();
                while ((listItem = sortedList[i]) && listItem.node !== nodeList[i]) {
                    var pos = nodeList.indexOf(listItem.node, i);
                    if (pos !== -1) {
                        nodeList.splice(pos, 1);
                    }
                    nodeList.splice(i, 0, listItem.node);

                    nodes.appendChild(listItem.node);
                    i++;
                }

                insertItems.push([insertPosition, nodes]);
            }

            for (var n = 0, node; node = insertItems[n]; n++) {
                child = tableBody.childNodes[node[0]];
                if (child !== undefined) {
                    tableBody.insertBefore(node[1], child);
                } else {
                    tableBody.appendChild(node[1]);
                }
            }
        };

        var sortItemObjList = function (itemObjList) {
            var sortObj = config.sortFolder[currentPath] || config.sort;

            var type = sortObj.type;
            var reverse = sortObj.reverse;

            var sortFn = function (aa, bb) {
                var a = aa.file;
                var b = bb.file;
                var r = a[type] > b[type];
                if (reverse) {
                    r = !r;
                }
                return r ? 1 : -1;
            };

            var dirs = [];
            var files = [];

            itemObjList.slice(0).sort(sortFn).forEach(function (itemObj) {
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

            return dirs.concat(files);
        };

        var setFiles = function (files) {
            tableNode.textContent = '';
            itemObjList.splice(0);

            files.forEach(function (file) {
                var itemObj = getFile(file);
                itemObjList.push(itemObj);
            });

            sortInsertList(tableNode, sortItemObjList(itemObjList));
        };

        ee.on('loadingFileList', function () {
            tableNode.textContent = '';
            itemObjList.splice(0);
        });

        ee.on('setFileList', function (response) {
            currentPath = response.path;
            setFiles(response.files);
        });

        ee.on('changeSort', function (type, path) {
            var sortObj;
            if (path) {
                sortObj = config.sortFolder[path];
                if (!sortObj) {
                    Object.keys(config.sortFolder).slice(50).forEach(function (path) {
                        delete config.sortFolder[path];
                    });
                    sortObj = config.sortFolder[path] = JSON.parse(defaultSort);
                }
            } else {
                sortObj = config.sort;
            }

            if (sortObj.type === type) {
                sortObj.reverse = !sortObj.reverse;
            } else {
                sortObj.type = type;
            }

            localStorage.config = JSON.stringify(config);

            sortInsertList(tableNode, sortItemObjList(itemObjList));
        });

        return tableNode;
    };

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
            var sortObj;
            if (config.sortFolder[currentPath]) {
                sortObj = config.sortFolder[currentPath];
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
                                var folder = currentPath;
                                if (globalNode.checked) {
                                    folder = null;
                                    delete config.sortFolder[currentPath];
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