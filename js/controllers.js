'use strict';

/* Controllers */

angular.module('qcmffvl.controllers', [])

.controller('MainCtrl', function($scope, API, $route, $http, $location, $timeout, dialogs) {
    $scope.main = {
        category: {
            options: [ "Parapente" ],
            checked: "Parapente"
        },
        level: {
            options: [ "Brevet Initial", "Brevet de Pilote", "Brevet de Pilote Confirmé"],
            checked: "Brevet de Pilote"
        },
        nbquestions: {
        	options: [ "10", "30", "60", "90", "toutes les" ],
        	checked: "30"
        },
        displayLimit: 10000,
        checkAnswers: false,
        score: {
            total: 0,
            nb: 0,
            percentage: 0,
            user: 0
        },
    }
    $scope.main.search  = {
    	num_niveau: $scope.main.level.options.indexOf($scope.main.level.checked)
    }
    $scope.main.limit = $scope.main.nbquestions.checked;
    $scope.reloadQCM = false;
    $scope.loading = true;

    // store qcm in $parent to allow for offline usage
    if (!$scope.qcm) {
        //console.log("loading JSON");
        $http.get('/json/qcm2014-1.json')
        .success(function(data, status, headers, config){
            $scope.qcm = API.newQCM(data);
            // $scope.addMoreQuestions();
        })
        .error(function() {
            var dlg = dialogs.error('Erreur','Impossible de charger le JSON');
            dlg.result();
        });
    }


    $scope.reload = function() {
        var dlg = dialogs.confirm('Confirmation','Composer un nouveau questionnaire (ceci effacera vos réponses) ?');
        dlg.result.then(function(btn){
        	$scope.reloadQCM = true;
        },function(btn){
            //cancel
        });
    }

    $scope.scoreClass = function(score) {
        if (score.percentage >= 75) {
            return "good-score";
        } else {
            return "bad-score";
        }
    }
    $scope.resetQCMDisplay = function() {
		$location.path('/qcm')
  		$('html').trigger('click');
		$scope.loading = true;
		$scope.navCollapsed = true;
		$scope.main.displayLimit = 0;
		$timeout(function() {
			$scope.main.displayLimit = 10000;
		}, 0);
    }

    $scope.$watch("reloadQCM", function(newval, oldval) {
    	if (newval) {
    		$timeout(function() {
    			$scope.reloadQCM = false;
    			$scope.resetQCMDisplay();
		    	$scope.qcm = API.newQCM($scope.qcm);
		        $location.path("qcm");
		        $route.reload();
    		},500);
	    }
    })

    $scope.$watch('main.nbquestions.checked', function(newval, oldval) {
        if (newval != oldval) {
        	$timeout(function() {
        		$scope.resetQCMDisplay();
        		var limit = $scope.main.nbquestions.checked;
        		if (limit === "toutes les") {
        			limit = 10000;
        		}
        		$scope.main.limit = limit;
        	},100);
        }
    })

    $scope.$watch('main.level.checked', function(newval, oldval) {
        if (newval != oldval) {
        	$timeout(function() {
        		$scope.resetQCMDisplay();
        		$scope.main.search.num_niveau = $scope.main.level.options.indexOf($scope.main.level.checked);
        	},100);
        }
    });
})

.controller('QCMCtrl', function($scope, $filter, $timeout, API, filterFilter) {
    $scope.main.checkAnswers = false;
    $scope.questions = [];
    $scope.$parent.resetQCMDisplay();

    $scope.toggleCheck = function(answer) {
        if ($scope.$parent.navCollapsed && !$scope.main.checkAnswers) {
            answer.checked = !answer.checked;
        }
    }

	$scope.collapseNav = function() {
		$scope.$parent.navCollapsed = true;
	}

    $scope.getPoints = function(question) {
        var total = 0;
        for (var i = 0; i < question.ans.length; i++) {
            if (question.ans[i].checked) {
                total += parseInt(question.ans[i].pts);
            }
        }
        if (total < 0) {
            total = 0;
        }
        return total;
    }

    $scope.getScore = function() {
        var arr = filterFilter($scope.qcm, $scope.main.search);
        arr = $filter('limitTo')(arr, $scope.main.limit)
        var score = { user: 0, nb: 0, percentage: 0 };
        for(var i = 0; i < arr.length; i++){
            var question = arr[i];
            score.user += $scope.getPoints(question);
        }
        score.nb = i;
        score.total = i*6;
        if (score.total > 0) {
            score.percentage = Math.round(score.user / score.total * 100);
        }
        return score;
    }

    // $scope.addMoreQuestions = function() {
    //     var limit = $scope.limit;
    //     var arr = filterFilter($scope.qcm, $scope.search);
    //     arr = $filter('limitTo')(arr, limit);

    //     var size = $scope.questions.length;
    //     var loadable = limit - size;
    //     if(loadable > 5) { loadable = 5 }
    //     for (var i=size; i<size+loadable; i++) {
    //         $scope.questions.push(arr[i]);
    //     }
    // }
    $scope.successQuestion = function(question) {
        return ($scope.main.checkAnswers && $scope.getPoints(question) === 6);
    }

    $scope.failedQuestion = function(question) {
        return ($scope.main.checkAnswers && !$scope.successQuestion(question));
    }

    $scope.goodAnswer = function(answer) {
        return ($scope.main.checkAnswers && answer.pts > 0);
    }

    $scope.badAnswer = function(answer) {
        return ($scope.main.checkAnswers && answer.pts < 0);
    }

    $scope.updateScore = function() {
        if ($scope.main.checkAnswers) {
            $scope.main.score = $scope.getScore();
        }
    }

    $scope.$watch('main.checkAnswers', function() {
        $scope.updateScore();
    })

})

.controller('SelfTestCtrl', function($scope, API) {
    $scope.$parent.loading = false;
	$scope.selftest = [];
	$scope.selftest.numitems   = 300;
	$scope.selftest.numruns    = 10000;
	$scope.selftest.showperrun = 30;

	$scope.selftest.qcm = [];
	for(var i = 1; i <= $scope.selftest.numitems; i++) {
		var obj = { question : i , ans : "x", shown : 0 };
		$scope.selftest.qcm.push(obj);
	}
//	console.log($scope.selftest.qcm);
	for(var i = 1; i <= $scope.selftest.numruns; i++){
//		console.log("run " + i );
		$scope.selftest.qcm = API.newQCM($scope.selftest.qcm);
//		console.log($scope.selftest.qcm);
		for(var j = 0; j < $scope.main.nbquestions.checked ; j++){
			$scope.selftest.qcm[j].shown++;
		}
	}
	for(var i = 0; i < $scope.selftest.numitems; i++) {
		$scope.selftest.qcm[i].percent = (($scope.selftest.qcm[i].shown / $scope.selftest.numruns) * 100).toFixed(2);;
	}

})

.controller('AboutCtrl', function($scope) {
    $scope.$parent.navCollapsed = true;
    $scope.$parent.loading = false;

    document.body.scrollTop = document.documentElement.scrollTop = 0;
});
