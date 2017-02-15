/**
 * Created by Anton on 13.02.2017.
 */
var path = require('path');
var fs = require('fs-extra');
var utils = {};

/**
 * @param {string} localDirPath
 * @returns {Promise}
 */
utils.fsReadDir = function (localDirPath) {
    return new Promise(function (resolve, reject) {
        fs.readdir(localDirPath, function (err, files) {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
};

/**
 * @param {string} localPath
 * @returns {Promise} always true
 */
utils.fsStat = function (localPath) {
    return new Promise(function (resolve, reject) {
        fs.stat(localPath, function (err, stats) {
            if (err) {
                reject(err);
            } else {
                resolve(stats);
            }
        });
    });
};

/**
 * @param {string} localPath
 * @returns {Promise}
 */
utils.fsRemove = function (localPath) {
    return new Promise(function (resolve, reject) {
        fs.remove(localPath, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

/**
 * @param {string} fromPath
 * @param {string} toPath
 * @returns {Promise}
 */
utils.fsCopy = function (fromPath, toPath) {
    return new Promise(function (resolve, reject) {
        fs.copy(fromPath, toPath, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

/**
 * @param {string} fromPath
 * @param {string} toPath
 * @returns {Promise}
 */
utils.fsMove = function (fromPath, toPath) {
    return new Promise(function (resolve, reject) {
        fs.move(fromPath, toPath, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

utils.fsEnsureDir = function (path) {
    return new Promise(function (resolve, reject) {
        fs.ensureDir(path, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

/**
 * @param {string} localDirPath
 * @param {string[]} files
 * @returns {*}
 */
utils.validateFiles = function (localDirPath, files) {
    return utils.fsReadDir(localDirPath).then(function (localFiles) {
        var found = files.every(function (name) {
            return localFiles.indexOf(name) !== -1;
        });

        if (!found) {
            throw new Error('Some files is not found!');
        }
    });
};

/**
 * @param {string} evalPath
 * @returns {string}
 */
utils.safePath = function (options, evalPath) {
    var rootName = options.config.fs.rootName;
    var pos = evalPath.indexOf(rootName);
    if (pos !== -1) {
        evalPath = evalPath.substr(pos + rootName.length)
    }
    var pathArr = [];
    var parts = path.posix.normalize(evalPath).split('/');
    while (parts.length) {
        var part = parts.shift();
        if (part === '.' || part === '') {
            continue;
        }
        if (part === '..') {
            pathArr.pop();
        } else {
            pathArr.push(part);
        }
    }
    return pathArr.join('/');
};

utils.clone = function (obj) {
    return JSON.parse(JSON.stringify({w:obj})).w;
};

module.exports = utils;