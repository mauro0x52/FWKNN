var fs = require('fs');
var configuration = require('./src/configuration.js');
var dataManager = require('./src/data-manager.js');
var Knn = require('./src/knn.js');

var config = configuration.load(process.argv[2]);
var responses = config.seasons.length;
var predictions = [];

var start = function () {
    var predictiveData = fs.readFileSync(config.data.predictive);
    
    for (var s in config.seasons) {
        predictions.push([]);
    }
    
    for (var s in config.seasons) {
        runSeason(s);
    }
}

var runSeason = function (season) {
    dataManager.load(config.data.weather, config.seasons[season], function (weatherData) {
        dataManager.normalize(weatherData, function(weatherData, minmax) {
            dataManager.load(config.data.predictive, config.seasons[season], function (predictiveData) {
                dataManager.normalizePreDefined(predictiveData, minmax, function (predictiveData) {
                    dataManager.load(config.data.target, config.seasons[season], function (targetData) {
                        var joined = dataManager.join(weatherData, targetData);
                        joined.target = dataManager.removeDates(joined.target);
                        var weights = fs.readFileSync(config.data.resultsFolder + '/weights.csv').toString().split('\n')[Number(season)+1].split(',');
                        for (var i in weights) weights[i] = Number(weights[i]);
                        for (var j in predictiveData) {                    
                            var model = Knn();
                            model.data = joined.weather;
                            model.results = joined.target;
                            model.k = config.algorithm.k;
                            model.maxDistance = config.algorithm.maxDistance;
                            model.weights = weights;
                            var prediction = model.run(predictiveData[j]);
                            predictions[season].push([predictiveData[j][0], prediction]); 
                        }
                        responses--;
                        if (responses == 0) saveResults();
                    });
                });
            });
        });
    });
}

var saveResults = function () {
    var results = [];
    for (var i in predictions) {
        for (var j in predictions[i]) {
            results.push(predictions[i][j]);
        }
    }
    
    results.sort(function (a,b) {
        if (a[0] > b[0]) return 1;
        if (a[0] < b[0]) return -1;
        else return 0;
    });
    
    
    
    var csv = '#Date,Prediction\n';
    
    for (var i in results) {
        csv += results[i].join(',') + '\n';
    }
    
    fs.writeFileSync(config.data.resultsFolder + '/prediction.csv', csv, 'utf8');
}

start();
