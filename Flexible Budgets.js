var START_DATE = new Date('April 1, 2014');
var END_DATE = new Date('May 1, 2014');
var TOTAL_BUDGET = 500;
var CAMPAIGN_NAME = 'Special Promotion';

function main() {
  testBudgetStrategy(calculateBudgetEvenly, 10, 500);
//  setNewBudget(calculateBudgetEvenly, CAMPAIGN_NAME, TOTAL_BUDGET,
//      START_DATE, END_DATE);
}

function setNewBudget(budgetFunction, campaignName, totalBudget, start, end) {
  var today = new Date();
  if (today < start) {
    Logger.log('Not ready to set budget yet');
    return;
  }
  var campaign = AdWordsApp.campaigns().
      withCondition('CampaignName = "' + campaignName + '"').
      get().
      next();
  var costSoFar = campaign.getStatsFor(dateToString(start), dateToString(end)).
      getCost();
  var daysSoFar = datediff(start, today);
  var totalDays = datediff(start, end);
  var newBudget = budgetFunction(costSoFar, totalBudget, daysSoFar, totalDays);
  campaign.setBudget(newBudget);
}

function calculateBudgetEvenly(costSoFar, totalBudget, daysSoFar, totalDays) {
  var daysRemaining = totalDays - daysSoFar;
  var budgetRemaining = totalBudget - costSoFar;
  if (daysRemaining <= 0) {
    return budgetRemaining;
  } else {
    return budgetRemaining / daysRemaining;
  }
}

function calculateBudgetWeighted(costSoFar, totalBudget, daysSoFar,
    totalDays) {
  var daysRemaining = totalDays - daysSoFar;
  var budgetRemaining = totalBudget - costSoFar;
  if (daysRemaining <= 0) {
    return budgetRemaining;
  } else {
    return budgetRemaining / (2 * daysRemaining - 1);
  }
}

function testBudgetStrategy(budgetFunc, totalDays, totalBudget) {
  var daysSoFar = 0;
  var costSoFar = 0;
  while (daysSoFar <= totalDays + 2) {
    var newBudget = budgetFunc(costSoFar, totalBudget, daysSoFar, totalDays);
    Logger.log('Day %s of %s, new budget %s, cost so far %s', daysSoFar + 1,
        totalDays, newBudget, costSoFar);
    costSoFar += newBudget;
    daysSoFar += 1;
  }
}

/**
 * Returns number of days between two dates, rounded up to nearest whole day.
 */
function datediff(from, to) {
  var millisPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((to - from) / millisPerDay);
}

function dateToString(date) {
  return date.getFullYear() + zeroPad(date.getMonth() + 1) +
      zeroPad(date.getDate());
}

function zeroPad(n) {
  if (n < 10) {
    return '0' + n;
  } else {
    return '' + n;
  }
}