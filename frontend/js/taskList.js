/**
 * Created by Anton on 13.02.2017.
 */
define([
    '../lib/filesize.min.js',
    './dom',
    './utils'
], function (filesize, dom, utils) {
    var TackList = function (ee) {
        var self = this;

        this.node = dom.el('div', {
            class: 'taskList'
        });
    };
    return TackList;
});