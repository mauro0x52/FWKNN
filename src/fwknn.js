var fs = require('fs');
var Knn = require('./knn.js');

/**
 * Shuffle two arrays
 */
var shuffle = function (X, Y) {
    var newX = [];
    var newY = [];
    
    var Xcopy = [].concat(X);
    var Ycopy = [].concat(Y);
    
    var steps = 9;
    var iterations = 0;
    
    while (Xcopy.length) {
        var elementX = Xcopy.splice(steps * iterations, 1);
        var elementY = Ycopy.splice(steps * iterations, 1);

        newX.push(elementX[0]);      
        newY.push(elementY[0]);    
        
        iterations++;
        if (steps * iterations >= Xcopy.length) {
            steps--;
            iterations = 0;
        }
    }
 
    return { X : newX, Y : newY };
}

/**
 * Pre selection
 */
 
var preSelect = function (data) {
    var selectedAttributes = [];
    var attributesList = [];
    var weight = [];
        
    for (var i in data.data[0]) {
        weight.push(0);
    }
            
    for (var i in config.input) {
        if (config.input[i] instanceof Array) {
            var best = {found : false};
            for (var j in config.input[i]) {
                weightCopy = [].concat(weight);
                if (config.input[i][j] instanceof Array) {
                    for (var k in config.input[i][j]) {
                        weightCopy[config.input[i][j][k]] = 1;
                    }
                } else {
                    weightCopy[config.input[i][j]] = 1;
                }
                var model = Knn();
                model.k = config.algorithm.k;
                model.maxDistance = config.algorithm.maxDistance;
                model.weights = weightCopy;
                var train = model.train(data);
                if (best.found == false || train.report.relativeMse < best.error) {
                    best = {
                        found : true,
                        index : config.input[i][j],
                        error : train.report.relativeMse
                    }
                }
                console.log('Index ' + (config.input[i][j] instanceof Array ? config.input[i][j].join(', ') : config.input[i][j]) + ' mse: ' + train.report.relativeMse);
            }
                if (best.index instanceof Array) {
                    for (var k in best.index) {
                        selectedAttributes.push({ index : best.index[k], error : best.error});
                        attributesList.push(best.index[k]);
                    }
                } else {
                    selectedAttributes.push({ index : best.index, error : best.error});
                    attributesList.push(best.index);
                }
        } else {
            weightCopy = [].concat(weight);
            weightCopy[config.input[i]] = 1;
            var model = Knn();
            model.k = config.algorithm.k;
            model.maxDistance = config.algorithm.maxDistance;
            model.weights = weightCopy;
            var train = model.train(data);
            selectedAttributes.push({ index : config.input[i], error : train.report.relativeMse});
            attributesList.push(config.input[i]);
            console.log('Index ' + config.input[i] + ' mse: ' + train.report.relativeMse);
        }
    }
    
    selectedAttributes.sort(function (a, b) {
        if (a.error < b.error) return -1;
        if (a.error > b.error) return 1;
        return 0;
    });
    
    attributesList.sort(function (a, b) {
        if (Number(a) < Number(b)) return -1;
        if (Number(a) > Number(b)) return 1;
        return 0;
    });
    
    console.log();
    console.log('Getting statistics');
    
    for (var i in selectedAttributes) {
        var max = -Infinity;
        var min = Infinity;
        for (var j in data.data) {
            if (data.data[j][selectedAttributes[i].index] > max) max = data.data[j][selectedAttributes[i].index];
            if (data.data[j][selectedAttributes[i].index] < min) min = data.data[j][selectedAttributes[i].index];
        }
        selectedAttributes[i].max = max;
        selectedAttributes[i].min = min;
        selectedAttributes[i].avg = (max + min) / 2;
        selectedAttributes[i].range = max - min;
    }
    
    for (var i in selectedAttributes) {
        if (selectedAttributes[i].range == 0) {
            attributesList.splice(attributesList.indexOf(selectedAttributes[i].index), 1);
            selectedAttributes.splice(i, 1);
            i--;
        }
    }
 
    return { selectedAttributes : selectedAttributes, attributesList : attributesList };
}
 

/**
 * Run the Feature Weighting KNN
 */

var runFwknn = function (X, Y, cb) {        
    var shuffled = shuffle(X, Y);
    var shuffledData = { data : shuffled.X, results : shuffled.Y, dimension : shuffled.X[0].length };    

    var preSelection = preSelect(shuffledData);
    
    var attributesList = preSelection.attributesList;
    var selectedAttributes = preSelection.selectedAttributes;
    
    console.log('Filtering attributes');
    
    var newX = [];
    var dataNewX = [];
            
    for (var i in shuffledData.data) {
        x = [];
        dataX = [];
        for (var j in attributesList) {
            x.push(shuffledData.data[i][attributesList[j]]);
            dataX.push(shuffledData.data[i][attributesList[j]]);
        }
        newX.push(x);
        dataNewX.push(dataX);
    }
    
    
    shuffledData.data = newX;
    var weight = [];
            
    for (var i in selectedAttributes) {
        selectedAttributes[i].newIndex = attributesList.indexOf(selectedAttributes[i].index);
        weight.push(config.algorithm.startWeight);
    }
     
    console.log('Running iterations');
    
    var minWeight = config.algorithm.minWeight;
    var best = { value : 0, error : { relativeMean :  Infinity } };

    for (var round = 0; round < config.algorithm.iterations; round++) {
        console.log();
        console.log('Iteration ', round);
        console.log(attributesList.join(' '));
        for (var attribute in selectedAttributes) {
            var i = selectedAttributes[attribute].newIndex;
            var attributeBestWeight = { value : 0, error : { relativeMean :  Infinity } }
            if (round == 0) {
                var wLow = 0;
                var wHigh = 1;
                var wIterate = 0.1;
            } else {
                var wLow = Math.max(0, weight[i] - 1/Math.pow(config.algorithm.decay, round - 1));
                var wHigh = Math.min(1, weight[i] + 1/Math.pow(config.algorithm.decay, round - 1));
                var wIterate = 0.1/Math.pow(config.algorithm.decay, round - 1);
            }
            
            for (var w = wLow; w <= wHigh; w = Math.min(1, w + wIterate)) {
                weight[i] = w < minWeight ? 0 : w;
                
                var model = Knn();
                model.k = config.algorithm.k;
                model.maxDistance = config.algorithm.maxDistance;
                model.weights = weight;
                var train = model.train(shuffledData);
                
                if (train.report.relativeMean < attributeBestWeight.error.relativeMean) {
                    attributeBestWeight = { value : w, error : train.report, results : train.results };
                    if (attributeBestWeight.error.relativeMean < best.error.relativeMean) best = {  weight : [].concat(weight), error : attributeBestWeight.error, recent : true };
                }
                var wstr = '';
                for (var wi in weight) { 
                    wstr += weight[wi].toFixed(config.algorithm.showDecimals) + ' ';
                }
                console.log(wstr, train.report.relativeMean, best.recent ? ' *' : '');
                best.recent = false;
                if (w == 1) break;
            }
            weight[i] = attributeBestWeight.value;
        }
        
        weight = best.weight;
            
        console.log();
        console.log('Round ' + round + ' best:');
        var wstr = '';
        for (var wi in weight) { 
            wstr += weight[wi].toFixed(config.algorithm.showDecimals) + ' ';
        }
        console.log(wstr, best.error.relativeMean);
        
        console.log();
        console.log('Round ' + round + ' best normalized:');
        var nwstr = '';
        var rangeWeights = [];
        for (var wi in weight) {
            for (var ws in selectedAttributes) {
                if (selectedAttributes[ws].newIndex == wi) {
                    rangeWeights.push(weight[wi] * selectedAttributes[ws].range); 
                    break;
                }
            }
        }
        var maxRangeWeights = Math.max.apply(null, rangeWeights);
        for (var wi in weight) {
            rangeWeights[wi] = rangeWeights[wi]/maxRangeWeights;
            nwstr += rangeWeights[wi].toFixed(config.algorithm.showDecimals) + ' ';
        }
        console.log(nwstr);
    } 
    
    cb({
        attributes : attributesList,
        error: best.error.relativeMean,
        weights : weight,
        rangeWeights : rangeWeights,
        data : shuffled.X,
        target : shuffled.Y,
        results : train.results
    });
};

module.exports = runFwknn;
