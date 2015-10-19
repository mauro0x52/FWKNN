var childProcess = require('child_process');
var fs = require('fs');
var configuration = require('./src/configuration.js');

var config = configuration.load(process.argv[2]);
var responses = new Array(config.seasons.length);
var workers = config.seasons.length;

var start = function () {
    createFolder();
    for (var i in config.seasons) {
        forkit(i);
    }
}

var createFolder = function () {
    if (!fs.existsSync(config.data.resultsFolder)) fs.mkdirSync(config.data.resultsFolder);
}

var saveResults = function (responses) {
    var str = 'Attribute';
    var attributes = fs.readFileSync(config.data.weatherHeaders);
    attributes = attributes.toString().split('\n');
    for (var i in config.seasons) {
        str += ',Season (' + config.seasons[i].join(' ') + ')';
    }
    str += ',Average\n';
    
    str += 'Accuracy';
    strLine = '';
    var average = 0;
    for (var i in responses) {
        average += responses[i].report.error;
        strLine += ',' + (1 - responses[i].report.error);
    }
    average = 1 - (average/responses.length);
    strLine += ',' + average + '\n';
    str += strLine;
    
    for (var a = 1; a < attributes.length; a++) {
        if (attributes[a]) {
            str += attributes[a];
            for (var i in responses) {
                var index = responses[i].report.attributes.indexOf(a);
                if (index > -1) {
                    str += ','+responses[i].report.rangeWeights[index];
                } else {
                    str += ',';
                }
            }
            str += ',\n';
        }
    }
    
    fs.writeFileSync(config.data.resultsFolder + '/report.csv', str, 'utf8');
    console.log(str);
    
    var results = [];
        
    for (var r in responses) {
        for (var i in responses[r].report.results) {
            results.push([responses[r].report.data[i][0], responses[r].report.target[i], responses[r].report.results[i]]);
        }
    }
    
    results.sort(function (a,b) {
        if (a[0] > b[0]) return 1;
        if (a[0] < b[0]) return -1;
        else return 0;
    });
    
    var csv = '#Date,Measured,Prediction\n';
    
    for (var i in results) {
            csv += results[i].join(',') + '\n';
    }
    
    fs.writeFileSync(config.data.resultsFolder + '/results.csv', csv, 'utf8');
    
    
    var str = '#';
    for (var a = 1; a < attributes.length; a++) {
        if (attributes[a]) {
            str += attributes[a] + ',';
        }
    }
    str = str.substring(0, str.length - 1);
    str += '\n';
    
    for (var i in responses) {
        var strLine = '';
        for (var a = 0; a < attributes.length; a++) {
            var index = responses[i].report.attributes.indexOf(a);
            if (index > -1) {
                strLine += responses[i].report.weights[index] + ',';
            } else {
                strLine += '0,';
            }
        }
        strLine = strLine.substring(0, strLine.length - 1);
        str += strLine + '\n';
    }
    fs.writeFileSync(config.data.resultsFolder + '/weights.csv', str, 'utf8');
    
}

var forkit = function (i) {
    var worker = childProcess.fork('./processes/fwknn.js', { stdout : 'pipe', silent : 'true' });
    
    worker.stdout.on('data', function (data) {
        process.stdout.write(data.toString());
    });
    
    worker.on('message', function (m) {
        workers--;
        responses[i] = m;
        if (workers == 0) {
            saveResults(responses);
        }
    });
        
    worker.send({
        config : config,
        segment : i
    });
}

start();
