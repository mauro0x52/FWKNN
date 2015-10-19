var knn = require('../src/knn.js');

process.on('message', function (m) {
    //var model = knn();
    //model.k = m.k;
    //model.maxDistance = m.maxDistance;
    //model.weights = m.weight;
    //var train = model.train(m.data);
    process.exit();
})
