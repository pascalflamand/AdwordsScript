// Let's set some constants
var TIMEFRAME = "THIS_MONTH";
//if the campaign is not in the spreadsheet, the budget is reset
//to this value at the beginning of the month.
var DEFAULT_BUDGET = 100; 
var SPREADSHEET_URL = "Your Spread sheet URL ";
var LABEL = ""; //Fill in if you only want to operate on campaigns with this label
 
var SIG_FIGS = 1000; //this means round all calculations to 3 decimal places
var MONTHLY_BUDGET = 0; // we will set this later
 
function main() {
  MONTHLY_BUDGET = _pull_budget_data_from_spreadsheet();
  var tot_cost_mtd = _get_total_cost();
  var is_first_of_the_month = ((new Date()).getDate() == 1);
  is_first_of_the_month = (is_first_of_the_month && ((new Date()).getHours() == 0));
  Logger.log("Total cost: " + tot_cost_mtd + ", Monthly budget:" + MONTHLY_BUDGET);
   
  if(is_first_of_the_month) {
    _reset_budgets();
  } else {
    _adjust_campaign_budget(tot_cost_mtd);
  }
   
}
 
// Returns the total cost for the set TIMEFRAME
function _get_total_cost() {
  var camp_iter = (LABEL == "") ? AdWordsApp.campaigns().get() :
                                  AdWordsApp.campaigns()
                                    .withCondition("LabelNames CONTAINS_ANY ['"+LABEL+"']")
                                    .get();
   
  var tot_cost = 0;
  while(camp_iter.hasNext()) {
    tot_cost += camp_iter.next().getStatsFor(TIMEFRAME).getCost();
  }
  return tot_cost;
}
 
// Calculates run rate and adjusts campaign bids as needed.
function _adjust_campaign_budget(my_tot_cost) {
  var today = new Date();
  // Accounting for December
  var eom = (today.getMonth() == 11) ? new Date(today.getFullYear()+1,0,1) : 
                                       new Date(today.getFullYear(),today.getMonth()+1,1);
  var days_left = Math.round((eom-today)/1000/60/60/24);
  var days_spent = today.getDate();
  var run_rate = Math.round(my_tot_cost/days_spent*SIG_FIGS)/SIG_FIGS;
  var projected_total = my_tot_cost + (run_rate * days_left);
  var perc_over = Math.round(((MONTHLY_BUDGET-projected_total)/projected_total)*SIG_FIGS)/SIG_FIGS; 
  _change_spend(perc_over,my_tot_cost);
}
 
//Adjusts the budget for a given campaign based on percentage of total spend
//Note: if the cost of a campaign is $0 mtd, the budget is not changed.
function _change_spend(perc_to_change,my_tot_cost) {
  var camp_iter = (LABEL == '') ? AdWordsApp.campaigns()
                                    .withCondition("Status = ENABLED")
                                    .get() :
                                  AdWordsApp.campaigns()
                                    .withCondition("Status = ENABLED")
                                    .withCondition("LabelNames CONTAINS_ANY ['"+LABEL+"']")
                                    .get();
   
  while(camp_iter.hasNext()) {
    var camp = camp_iter.next();
    var camp_cost = camp.getStatsFor(TIMEFRAME).getCost();
    var perc_of_total = Math.round(camp_cost/my_tot_cost*SIG_FIGS)/SIG_FIGS;
    //If there is no cost for the campaign, let's not change it.
    var to_change = (perc_of_total) ? (perc_of_total*perc_to_change) : 0;
    camp.setBudget(camp.getBudget()*(1+to_change));
  }
}
 
// Resets the budget unevenly
function _reset_budgets() {
  var camp_budget_map = _pull_campaign_data_from_spreadsheet();
  var camp_iter = (LABEL == '') ? AdWordsApp.campaigns()
                                    .withCondition("Status = ENABLED")
                                    .get() :
                                  AdWordsApp.campaigns()
                                    .withCondition("Status = ENABLED")
                                    .withCondition("LabelNames CONTAINS_ANY ['"+LABEL+"']")
                                    .get();
  while(camp_iter.hasNext()) {
    var camp = camp_iter.next();
    if(camp_budget_map[camp.getName()]) {
      camp.setBudget(camp_budget_map[camp.getName()]/30.5);
    } else {
      camp.setBudget(DEFAULT_BUDGET);
    }
  }
}
 
function _pull_campaign_data_from_spreadsheet() {
  var spreadsheet = getSpreadsheet(SPREADSHEET_URL);
  var sheet = spreadsheet.getActiveSheet();
  var data = sheet.getRange("A:B").getValues();
  if(data[0][0] == "") {
    //This means this is the first run and we should populate the data.
    _populate_spreadsheet(sheet);
    data = sheet.getRange("A:B").getValues();
  }
  var campaign_budget_map = {};
  for(var i in data) {
    if(i == 0) { continue; } //ignore the header
    if(data[i][0] == "") { break; } //stop when there is no more data
    campaign_budget_map[data[i][0]] = parseFloat(data[i][1]);
  }
  return campaign_budget_map;
}
 
function _pull_budget_data_from_spreadsheet() {
  var spreadsheet = getSpreadsheet(SPREADSHEET_URL);
  var sheet = spreadsheet.getActiveSheet();
  var data = sheet.getRange("A:B").getValues();
  if(data[0][0] == "") {
    //This means this is the first run and we should populate the data.
    _populate_spreadsheet(sheet);
    data = sheet.getRange("A:B").getValues();
  }
  var tot_budget = 0;
  for(var i in data) {
    if(i == 0) { continue; } //ignore the header
    if(data[i][1] == "") { break; } //stop when there is no more data
    tot_budget += parseFloat(data[i][1]);
  }
  return tot_budget;
}
 
function _populate_spreadsheet(sheet) {
  sheet.clear();
  sheet.appendRow(['Campaign Name','Monthly Budget']);
  var camp_iter = (LABEL == '') ? AdWordsApp.campaigns()
                                    .withCondition("Status = ENABLED")
                                    .get() :
                                  AdWordsApp.campaigns()
                                    .withCondition("Status = ENABLED")
                                    .withCondition("LabelNames CONTAINS_ANY ['"+LABEL+"']")
                                    .get();
  while(camp_iter.hasNext()) {
    var camp = camp_iter.next();
    sheet.appendRow([camp.getName(),(camp.getBudget()*30.5)]);
  }
}
 
function getSpreadsheet(spreadsheetUrl) {
  var matches = new RegExp('key=([^&#]*)').exec(spreadsheetUrl);
  if (!matches || !matches[1]) {
    throw 'Invalid spreadsheet URL: ' + spreadsheetUrl;
  }
  var spreadsheetId = matches[1];
  return SpreadsheetApp.openById(spreadsheetId);
}
