var Utils = {};

Utils.average = function (array) {
    var sum = 0;
    for (var i in array) {
        sum = sum + array[i];
    }
    return sum/array.length;
}

module.exports = Utils;
