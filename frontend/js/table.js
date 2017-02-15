define([
    '../lib/filesize.min.js',
    './dom',
    './utils'
], function (filesize, dom, utils) {
    var Table = function (config, ee) {
        var self = this;

        var tableNode = dom.el('div', {
            class: 'table'
        });

        var itemObjList = [];

        var setSelect = function (state) {
            this.selected = state;
            this.selectNode.checked = state;
            if (state) {
                this.node.classList.add('selected');
            } else {
                this.node.classList.remove('selected');
            }
        };

        var getFile = function (file, index) {
            var itemObj = {};
            itemObj.file = file;
            itemObj.selected = false;
            itemObj.setSelect = setSelect;

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
            itemObj.selectNode = dom.el('input', {
                class: 'file__select',
                type: 'checkbox',
                on: ['change', function () {
                    itemObj.setSelect(this.checked);
                }]
            });
            var node = dom.el('div', {
                class: 'file',
                data: {
                    index: index
                },
                append: [
                    dom.el('div', {
                        class: iconClassList,
                        append: [
                            itemObj.selectNode
                        ],
                        on: ['click', function (e) {
                            if (e.target !== itemObj.selectNode) {
                                itemObj.setSelect(!itemObj.selectNode.checked);
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

            itemObj.node = node;

            return itemObj;
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
            var sortObj = config.sortFolder[self.path] || config.sort;

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

            files.forEach(function (file, index) {
                var itemObj = getFile(file, index);
                itemObjList.push(itemObj);
            });

            sortInsertList(tableNode, sortItemObjList(itemObjList));
        };

        this.path = null;
        this.loadingFileList = function () {
            tableNode.textContent = '';
            itemObjList.splice(0);
        };
        this.setFileList = function (fileList) {
            self.path = fileList.path;
            ee.trigger('setTitle', [self.path.split('/').slice(-1)[0]]);
            setFiles(fileList.files);
        };
        this.changeSort = function (type, path) {
            var sortObj;
            if (path) {
                sortObj = config.sortFolder[path];
                if (!sortObj) {
                    Object.keys(config.sortFolder).slice(50).forEach(function (path) {
                        delete config.sortFolder[path];
                    });
                    sortObj = config.sortFolder[path] = JSON.parse(JSON.stringify(config.defaultSort));
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
        };
        this.getSelectedFiles = function () {
            var files = [];
            itemObjList.forEach(function (itemObj) {
                if (itemObj.selected) {
                    files.push(itemObj.file);
                }
            });
            return files;
        };
        this.resetSelect = function () {
            itemObjList.forEach(function (itemObj) {
                if (itemObj.selected) {
                    itemObj.setSelect(false);
                }
            });
        };
        this.node = tableNode;
    };
    return Table;
});