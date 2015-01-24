/******************************************
* Keep Your Campaigns In Budget
* Version 1.1
* ChangeLog v1.1 
*   - cleaned up code
*   - added ability for any dates
* Created By: Russ Savage
* FreeAdWordsScripts.com
******************************************/
// Let's set some constants
var MONTHLY_BUDGET = 5000.00;
 
//If you want to work with a monthly budget, leave START_DATE and END_DATE blank.
var TIMEFRAME = "THIS_MONTH";
//But if you want to work with a specific timeframe, fill these in.
//Use the format yyyyMMdd, so for Jan 12th, 2014, you would put 20140112.
var START_DATE = '';
var END_DATE = '';
  
//Set this to true if you want to adjust budgets or
//keep set to false if you want to just pause all the campaigns
//when you hit your budget
var ADJUST_BUDGETS = false;
var DECIMAL_PLACES = 3;
  
function main() {
  var totalCostMTD = getTotalCost();
  var isFirstOfTheMonth = ((new Date()).getDate() == 1);
  if(START_DATE && END_DATE) {
    var today = new Date();
    today.setHours(0,0,0,0);
    var startDate = new Date(START_DATE.substring(0,4),
                             parseFloat(START_DATE.substring(4,6))-1,
                             START_DATE.substring(6,8));
    isFirstOfTheMonth = (startDate.getTime() == today.getTime());
  }
  //if you run this script more than once per day, uncomment the next line
  //isFirstOfTheMonth = (isFirstOfTheMonth && ((new Date()).getHour() == 0));
  Logger.log("Total cost: " + totalCostMTD + 
           ", Monthly budget:" + MONTHLY_BUDGET +
           ", isFirstOfTheMonth: "+isFirstOfTheMonth);
    
  if(ADJUST_BUDGETS) {
    if(isFirstOfTheMonth) {
      resetBudgets();
    } else {
      adjustCampaignBudget(totalCostMTD);
    }
  } else {
    if(totalCostMTD >= MONTHLY_BUDGET) {
      //If we have hit the limit, pause all ads
      enableOrDisableCampaigns(true);
    } else {
      // let's check if it's the first day of the month
      if((new Date()).getDate() == 1) {
        //enable all the campaigns
        enableOrDisableCampaigns(false);
      }
    }
  }
}
  
// Returns the total cost for the set TIMEFRAME
function getTotalCost() {
  var campIter = AdWordsApp.campaigns().get();
    
  var totalCost = 0;
  while(campIter.hasNext()) {
    if(START_DATE && END_DATE) {
      totalCost += campIter.next().getStatsFor(START_DATE,END_DATE).getCost();
    } else {
      totalCost += campIter.next().getStatsFor(TIMEFRAME).getCost();
    }
  }
  return totalCost;
}
  
// Enables or Disables All Campaigns In Account
function enableOrDisableCampaigns(shouldDisable) {
  var campIter = AdWordsApp.campaigns().get();
  while(campIter.hasNext()) { 
    if(shouldDisable) { 
      campIter.next().pause(); 
    } else { 
      campIter.next().enable(); 
    }
  }
}
  
// Calculates run rate and adjusts campaign bids as needed.
function adjustCampaignBudget(myTotalCost) {
  var today = new Date();
  // Accounting for December
  var eom;
  if(START_DATE && END_DATE) {
    eom = new Date(END_DATE.substring(0,4),
                   parseFloat(END_DATE.substring(4,2))-1,
                   END_DATE.substring(6,2));
  } else {
    eom = (today.getMonth() == 11) ? new Date(today.getFullYear()+1,0,1) : 
                                     new Date(today.getFullYear(),today.getMonth()+1,1);
  }
  var daysLeft = Math.round((eom-today)/1000/60/60/24);
  var daysSpent;
  if(START_DATE && END_DATE) {
    var startDate = new Date(START_DATE.substring(0,4),
                             parseFloat(START_DATE.substring(4,2))-1,
                             START_DATE.substring(6,2));
    daysSpent = Math.round((today-startDate)/1000/60/60/24);
  } else {
    daysSpent = today.getDate();
  }
  var runRate = round(myTotalCost/daysSpent);
  var projectedTotal = myTotalCost + (runRate * daysLeft);
  var percOver = round((MONTHLY_BUDGET-projectedTotal)/projectedTotal);
    
  changeSpend(percOver,myTotalCost);
}
  
//Adjusts the budget for a given campaign based on percentage of total spend
//Note: if the cost of a campaign is $0 mtd, the budget is not changed.
function changeSpend(percToChange,myTotalCost) {
  var campIter = AdWordsApp.campaigns().withCondition("Status = ENABLED").get();
    
  while(campIter.hasNext()) {
    var camp = campIter.next();
    var campCost = (START_DATE && END_DATE) ? camp.getStatsFor(START_DATE,END_DATE).getCost()
                                            : camp.getStatsFor(TIMEFRAME).getCost();
    var percOfTotal = round(campCost/myTotalCost);
    //If there is no cost for the campaign, let's not change it.
    var toChange = (percOfTotal) ? (percOfTotal*percToChange) : 0;
    camp.setBudget(camp.getBudget()*(1+toChange));
  }
}
  
// Resets the budget evenly across all campaigns
function resetBudgets() {
  Logger.log('Resetting budgets at the first of the period.');
  var campIter = AdWordsApp.campaigns().withCondition("Status = ENABLED").get();
  var campCount = 0;
  while(campIter.hasNext()) {
    campCount++;
    campIter.next();
  }
  campIter = AdWordsApp.campaigns().withCondition("Status = ENABLED").get();
  while(campIter.hasNext()) {
    campIter.next().setBudget(MONTHLY_BUDGET/campCount);
  }
}
 
// A helper function to make rounding a little easier
function round(value) {
  var decimals = Math.pow(10,DECIMAL_PLACES);
  return Math.round(value*decimals)/decimals;
}