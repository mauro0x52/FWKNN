var utils = require('./utils.js');
var calc = require('./calc.js');

var Knn = function (options) {
	options = options || {};
	
	var self = this;
	self.weightFunctionSigma = options['weightFunctionSigma'] || 10;
	self.weights = options['weights'] || null;
	self.data = options['data'] || [];
	self.results = options['results'] || [];
	self.k = options['k'] || 3;
	self.maxDistance = options['maxDistance'] || 0;
	self.folds = options['folds'] || 10;
	self.report = {};
	
	self.setData = function (data, append) {
		if (self.data.length > 0 && append) self.data.concat(data);
		else self.data = data;
	}
	
	self.setResults = function (results, append) {
		if (self.results.length > 0 && append) self.results.concat(results);
		else self.results = results;
	}
	
	var cloneArray = function (arr) {
		var clone = [];
		for (var i in arr) {
			if (Array.isArray(arr[i])) {
				var inside = [];
				for (var j in arr[i]) {
					inside.push(arr[i][j]);
				}
				clone.push(inside);
			} else {
				clone.push(arr[i]);
			}
		}
		return clone;
	}
    
	self.train = function (trainingSet) {
		var bkp = {
            data : cloneArray(trainingSet.data),
            results : cloneArray(trainingSet.results)
        }
		var dataLength = trainingSet.data.length;
		var foldLength = parseInt(trainingSet.data.length / self.folds);
		var validation = [];
        var validationResults = [];
		for (var i = 0; i < self.folds; i++) {
			var data = cloneArray(bkp.data);
			var results = cloneArray(bkp.results);
			var dataFold = data.splice(i * foldLength, foldLength);
			var resultsFold = results.splice(i * foldLength, foldLength);
			self.data = data;
			self.results = results;
			for (var j in dataFold) {
                var validationRow = {real : resultsFold[j], predicted : self.run(dataFold[j])};
				validation.push(validationRow);
                validationResults.push(validationRow.predicted);
			}
		}
		var sum = parseFloat(0);
		var sumsq = parseFloat(0);
		for (var i in validation) {
			var error = Math.abs(validation[i].real - validation[i].predicted);
			var sq = parseFloat(error * error);
			sum += error;
			sumsq += sq;
		}
        var averageResults = utils.average(trainingSet.results);
		self.report = {
            report : {    
                mse : sumsq/dataLength,
                std : Math.sqrt(sumsq/dataLength),
                mean : sum/dataLength,
                relativeMse : (sumsq/dataLength)/averageResults,
                relativeStd : Math.sqrt(sumsq/dataLength)/averageResults,
                relativeMean : (sum/dataLength)/averageResults,
                size : dataLength
            },
            results : validationResults
		};
		self.data = cloneArray(bkp.data);
		self.results = cloneArray(bkp.results);
		return self.report;
	}
	
	self.run = function (x) {
		var distances = [];
		var i;
		var avg = 0.0;
		var totalWeight = 0;
		var weight;
		var k = self.k == 0 ? self.data.length : self.k
		
		for (i = 0; i < self.data.length; i++) {
			distances.push({
				index : i,
				distance : self.getDistance(x, self.data[i])
			});
		}
		
		distances.sort(function(a, b) {return a.distance - b.distance;});
				
				
        var kFound = 0;
        var i = 0;
		while (i < distances.length && kFound < self.k) {
			if (self.maxDistance && distances[i].distance > self.maxDistance && kFound > 0) {
				break;
			}
			weight = self.getWeight(distances[i].distance);
            
            var results = self.results[distances[i].index];
            
            
            var foundEqual = 0;
            //if (aggregate) {
                // find equal distances
                for (var j = i + 1; j < distances.length; j++) {
                    if (distances[i].distance == distances[j].distance) {
                        results += self.results[distances[i].index];
                        foundEqual++;
                    } else {
                        break;
                    }
                }
                                            
                results = results / (j - i);
                if (foundEqual) { 
                    i = j;
                    weight = (1 + foundEqual) * weight;
                };
            //}
            
			avg += weight * results;
			totalWeight += weight;
            
            kFound++;
            i++;
		}
		if (totalWeight != 0) avg = avg/totalWeight;
		
		return avg;
	}
	
	self.getWeight = function (x) {
		return 	calc.gaussian(x,self.weightFunctionSigma);
	}
	
	self.getDistance = function (a,b) {
		if (self.weights) {
			return calc.weightedEuclidean(a,b,self.weights);
		}
		else {
			return calc.euclidean(a,b);
		}
	}
	
	return self;
}

module.exports = Knn;
