/**
 * Created by Anton on 14.02.2017.
 */
"use strict";
define([
    './dom',
    './dialog'
], function (dom, Dialog) {
    var Head = function (ee, config, sendAction, fileList) {
        var self = this;

        var getNameDialog = function (name, callback) {
            var dialog = new Dialog();
            var saveNode;
            dom.el(dialog.body, {
                class: ['dialog-name'],
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

        var getSortDialog = function () {
            var map = {
                name: 'Name',
                size: 'Size',
                ext: 'Extension',
                atime: 'Access Time',
                mtime: 'Modified Time',
                ctime: 'Change Time',
                birthtime: 'Birth Time'
            };

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
            var sortObj = config.sortFolder[fileList.getPath()];
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
                                var folder = fileList.getPath();
                                if (globalNode.checked) {
                                    folder = null;
                                    delete config.sortFolder[fileList.getPath()];
                                }
                                fileList.changeSort(type, folder);
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

        var getRefreshBtn = function () {
            return dom.el('a', {
                href: '#refresh',
                class: ['btn', 'btn-refresh'],
                title: 'Refresh',
                on: ['click', function (e) {
                    e.preventDefault();
                    sendAction({
                        path: fileList.getPath(),
                        action: 'fileList'
                    }, function (err) {
                        if (err) {
                            throw err;
                        }
                    });
                }]
            });
        };

        var getSortBtn = function () {
            return dom.el('a', {
                href: '#sort',
                class: ['btn', 'btn-sort'],
                title: 'Sort',
                on: ['click', function (e) {
                    e.preventDefault();
                    getSortDialog();
                }]
            });
        };

        var getNewFolderBtn = function () {
            return dom.el('a', {
                href: '#newFolder',
                class: ['btn', 'icon-new-folder'],
                title: 'New folder',
                on: ['click', function (e) {
                    e.preventDefault();
                    getNameDialog('New folder', function (name) {
                        sendAction({
                            action: 'newFolder',
                            path: fileList.getPath(),
                            name: name
                        }, function (err) {
                            if (err) {
                                throw err;
                            }
                        });
                    });
                }]
            });
        };

        var getCopyBtn = function () {
            return dom.el('a', {
                href: '#copy',
                class: ['btn', 'icon-copy'],
                title: 'Copy',
                on: ['click', function (e) {
                    e.preventDefault();
                    var files = fileList.getSelectedFiles().map(function (file) {
                        return file.name
                    });
                    files.length && sendAction({
                        action: 'newTask',
                        type: 'copy',
                        path: fileList.getPath(),
                        files: JSON.stringify(files)
                    }, function (err) {
                        if (err) {
                            throw err;
                        }
                        fileList.resetSelect();
                    });
                }]
            });
        };

        var getRenameBtn = function () {
            return dom.el('a', {
                href: '#rename',
                class: ['btn', 'icon-rename'],
                title: 'Rename',
                on: ['click', function (e) {
                    e.preventDefault();
                    var files = fileList.getSelectedFiles().map(function (file) {
                        return file.name
                    });

                    files.length && getNameDialog(files[0], function (name) {
                        sendAction({
                            action: 'rename',
                            path: fileList.getPath(),
                            file: files[0],
                            name: name
                        }, function (err) {
                            if (err) {
                                throw err;
                            }
                            fileList.resetSelect();
                        });
                    });
                }]
            });
        };

        var getCutBtn = function () {
            return dom.el('a', {
                href: '#cut',
                class: ['btn', 'icon-cut'],
                title: 'Cut',
                on: ['click', function (e) {
                    e.preventDefault();
                    var files = fileList.getSelectedFiles().map(function (file) {
                        return file.name
                    });
                    files.length && sendAction({
                        action: 'newTask',
                        type: 'cut',
                        path: fileList.getPath(),
                        files: JSON.stringify(files)
                    }, function (err) {
                        if (err) {
                            throw err;
                        }
                        fileList.resetSelect();
                    });
                }]
            });
        };

        var getRemoveBtn = function () {
            return dom.el('a', {
                href: '#remove',
                class: ['btn', 'icon-remove'],
                title: 'Remove',
                on: ['click', function (e) {
                    e.preventDefault();
                    var files = fileList.getSelectedFiles().map(function (file) {
                        return file.name
                    });
                    files.length && sendAction({
                        action: 'newTask',
                        type: 'remove',
                        path: fileList.getPath(),
                        files: JSON.stringify(files)
                    }, function (err) {
                        if (err) {
                            throw err;
                        }
                        fileList.resetSelect();
                    });
                }]
            });
        };

        var panelNode = dom.el('div', {
            class: 'panel',
            append: [
                getRefreshBtn(),
                getSortBtn(),
                getNewFolderBtn(),
                getCopyBtn(),
                getRenameBtn(),
                getCutBtn(),
                getRemoveBtn()
            ]
        });

        var titleNode = dom.el('div', {
            class: 'title'
        });

        ee.on('setTitle', function (text) {
            titleNode.textContent = text;
        });

        this.node = dom.el('div', {
            class: 'head',
            append: [
                titleNode,
                panelNode
            ]
        });
    };
    return Head;
});