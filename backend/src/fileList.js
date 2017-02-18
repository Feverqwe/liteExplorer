/**
 * Created by Anton on 15.02.2017.
 */
"use strict";
var debug = require('debug')('app:fileList');
var path = require('path');
var utils = require('./utils');

var File = function (name, urlPath) {
    var self = this;
    self.name = name;
    self.ext = '';
    self.path = urlPath;
    self.isFile = false;
    self.isDirectory = false;
    self.isBlockDevice = false;
    self.isCharacterDevice = false;
    self.isSymbolicLink = false;
    self.isFIFO = false;
    self.isSocket = false;
    self.size = 0;
    self.atime = self.mtime = self.ctime = self.birthtime = (new Date(0)).toISOString();
    /**
     * @typedef {{}} stats,
     * @property {number} dev
     * @property {number} ino
     * @property {number} mode
     * @property {number} nlink
     * @property {number} uid
     * @property {number} gid
     * @property {number} rdev
     * @property {number} size
     * @property {number} blksize
     * @property {number} blocks
     * @property {Date} atime
     * @property {Date} mtime
     * @property {Date} ctime
     * @property {Date} birthtime,
     * @property {function} isFile
     * @property {function} isDirectory
     * @property {function} isBlockDevice
     * @property {function} isCharacterDevice
     * @property {function} isSymbolicLink
     * @property {function} isFIFO
     * @property {function} isSocket
     */
    self.setStats = function (/**stats*/stats) {
        self.isFile = stats.isFile();
        self.isDirectory = stats.isDirectory();
        self.isBlockDevice = stats.isBlockDevice();
        self.isCharacterDevice = stats.isCharacterDevice();
        self.isSymbolicLink = stats.isSymbolicLink();
        self.isFIFO = stats.isFIFO();
        self.isSocket = stats.isSocket();
        self.size = stats.size;
        self.atime = stats.atime.toISOString();
        self.mtime = stats.mtime.toISOString();
        self.ctime = stats.ctime.toISOString();
        self.birthtime = stats.birthtime.toISOString();

        if (self.isFile) {
            self.ext = path.extname(self.name);
        }
    };
};

var FileList = function (options) {
    this.getList = function (req) {
        var webDirPath = utils.safePath(options, req.query.path);
        var localDirPath = path.join(options.config.fs.root, webDirPath);
        return utils.fsReadDir(localDirPath).then(function (files) {
            if (localDirPath !== options.config.fs.root) {
                files.push('..');
            }
            return Promise.all(files.map(function (name) {
                var webFilePath = path.posix.join(options.config.fs.rootName, webDirPath, name);
                var file = new File(name, webFilePath);
                var localFilePath = path.join(localDirPath, name);
                return utils.fsStat(localFilePath).then(function (stats) {
                    file.setStats(stats);
                }, function (err) {
                    debug('getStats error', webFilePath, err);
                }).then(function () {
                    return file;
                });
            }));
        }, function (err) {
            debug('fsReadDir', err);
            var webFilePath = path.posix.join(options.config.fs.rootName, utils.safePath(options, req.query.path + '/..'));
            var file = new File('..', webFilePath);
            file.isDirectory = true;
            return [file];
        }).then(function (files) {
            var _path = path.posix.join(options.config.fs.rootName, webDirPath);
            return {
                files: files,
                path: _path
            }
        });
    };
};
module.exports = FileList;