var fs = require('fs');
var path = require('path');

var Configuration = {};

Configuration.load = function (filePath) {
    var configFile = filePath;
    if (!configFile) throw("You must choose a json model file");
    var configFileName = /([^/]*)\.json/g.exec(configFile)[1];
    var configFile = path.resolve(process.cwd(), configFile);
    var config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    
    config.fileName = configFileName;
    config.filePath = configFile;
    
    var weather = config.data.weather;
    var target = config.data.target;
    config.data.weather = path.resolve(process.cwd(), './data/weather/' + config.data.weather);
    config.data.weatherHeaders = path.resolve(process.cwd(), './data/weather/' + config.data.weatherHeaders);
    config.data.target = path.resolve(process.cwd(), './data/target/' + config.data.target);
    config.data.resultsFolder = path.resolve(process.cwd(), './data/results/' + config.data.resultsFolder);
    config.data.predictive = path.resolve(process.cwd(), './data/predictive/' + config.data.predictive);
    
    config.algorithm.startWeight = config.algorithm.startWeight ? config.algorithm.startWeight : 0.1;
    config.algorithm.minWeight = config.algorithm.minWeight ? config.algorithm.minWeight : 0;
    config.algorithm.decay = config.algorithm.decay ? config.algorithm.decay : 2
    
    config.debug = config.debug ? config.debug : 0;
    
    return config;
}

module.exports = Configuration;
