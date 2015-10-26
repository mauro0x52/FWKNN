var fs = require('fs');
var csvParse = require('csv-parse');

var DataManager = {};

/**
 * loads data from CSV
 */
DataManager.load = function (file, months, cb) {
    csvParse(fs.readFileSync(file, 'utf8'), { comment : '#', delimiter : ',', auto_parse : true }, function (error, data) {
        var i = 0;
        while (i < data.length) {
            var date = new Date(data[i][0] + ' 00:00:00');
            if (months && months.indexOf(date.getMonth() + 1) == -1) {
                data.splice(i, 1);
            } else {
                i++;
            }
        }
        cb(data);
    });
}

/**
 * normalize every attribute to fit values from 0 to 1
 */ 
DataManager.normalize = function (data, cb) {
    var min = Array();
    var max = Array();
    for (var j in data[0]) {
        min.push(Infinity);
        max.push(-Infinity);
    }
    for (var i in data) {
        for (var j = 1; j < data[i].length; j++) {
            if (data[i][j] > max[j]) max[j] = data[i][j];
            if (data[i][j] < min[j]) min[j] = data[i][j];
        }
    }
    DataManager.normalizePreDefined(data, { min : min, max : max }, function (data) {
        cb(data, { min : min, max : max }); 
    });
}

/**
 * normalize by pre-defined normalization params
 */
DataManager.normalizePreDefined = function (data, minmax, cb) {
    for (var i in data) {
        for (var j = 1; j < data[i].length; j++) {
            if (minmax.max[j] - minmax.min[j] != 0) {
                data[i][j] = (data[i][j] - minmax.min[j]) / (minmax.max[j] - minmax.min[j]);
            }
        }
    }
    
    cb(data);
}

/**
 * join weather and target to have the same dates
 */
DataManager.join = function (weather, target) {
    var wi = 0;
    var ti = 0;
    var wf = false;
    var tf = false;
    while (true) {
        if (wf || (!fs && weather[wi][0] > target[ti][0])) {
            target.splice(ti, 1);
        } else if (tf || (!wf && weather[wi][0] < target[ti][0]))  {
            weather.splice(wi, 1);
        } else {
            wi++;
            ti++;
        }
        if (wi == weather.length) wf = true;
        if (ti == target.length) tf = true;
        if (wf && tf) break;
    }
    return {weather : weather, target : target };
}


/**
 * Remove target date column
 */
DataManager.removeDates = function (target) {
    for (var i in target) {
        target[i] = target[i][1];
    }
    return target;
}

module.exports = DataManager;
