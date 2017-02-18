/**
 * Created by Anton on 15.02.2017.
 */
var debug = require('debug')('app:pulling');

var Pulling = function () {
    var keyValue = {};
    var requestList = [];
    var emptyData = {
        success: true
    };
    var onRemove = function () {
        clearTimeout(this.timeout);
        var pos = requestList.indexOf(this);
        if (pos !== -1) {
            requestList.splice(pos, 1);
        }
    };
    var onSend = function (data) {
        this.remove();
        this.res.json(data);
    };

    var push = function () {
        requestList.slice(0).forEach(function (request) {
            var hasChanges = false;
            var result = {success: true};
            Object.keys(keyValue).forEach(function (key) {
                if (request.req.query[key]) {
                    var info = JSON.parse(request.req.query[key]);
                    var value = keyValue[key];
                    if (info.id !== value.id) {
                        hasChanges = true;
                        result[key] = value;
                    }
                }
            });
            if (hasChanges) {
                request.send(result);
            }
        });
    };

    this.onRequest = function (session, req, res) {
        var item = {
            req: req,
            res: res,
            send: onSend,
            remove: onRemove,
            timeout: setTimeout(function () {
                item.send(emptyData);
            }, 60 * 1000)
        };
        requestList.push(item);

        push();
    };
    this.set = function (key, value) {
        keyValue[key] = value;
        push();
    };
};
module.exports = Pulling;