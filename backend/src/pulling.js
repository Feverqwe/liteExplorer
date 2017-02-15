/**
 * Created by Anton on 15.02.2017.
 */
var debug = require('debug')('app:pulling');

var Pulling = function () {
    var waitList = [];
    var emptyData = {
        success: true
    };
    var onRemove = function () {
        clearTimeout(this.timeout);
        var pos = waitList.indexOf(this);
        if (pos !== -1) {
            waitList.splice(pos, 1);
        }
    };
    var onSend = function (data) {
        this.remove();
        this.res.json(data);
    };
    this.onRequest = function (req, res) {
        var item = {
            req: req,
            res: res,
            send: onSend,
            remove: onRemove,
            timeout: setTimeout(function () {
                item.send(emptyData);
            }, 60 * 1000)
        };
        waitList.push(item);
    };
};
module.exports = Pulling;