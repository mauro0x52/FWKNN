var fwknn = require('../src/fwknn.js');
var dataManager = require('../src/data-manager.js');

process.on('message', function (m) {
    config = m.config;
    var segment = m.segment;
    
    dataManager.load(config.data.weather, config.seasons[segment], function (weatherData) {
        dataManager.load(config.data.target, config.seasons[segment], function (targetData) {
            var joined = dataManager.join(weatherData, targetData);
            joined.target = dataManager.removeDates(joined.target);
            fwknn(joined.weather, joined.target, function (report) {
                process.send({ report : report });
                process.exit();
            });
        });
    });
})
