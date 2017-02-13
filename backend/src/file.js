/**
 * Created by Anton on 13.02.2017.
 */
var path = require('path');

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
module.exports = File;