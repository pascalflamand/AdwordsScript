/***************************************************
* Store Search Query Perf Report in Google Doc
* Version 1.1
* CHangelog v1.1 - Removed apiVersion, Updated formatting
* Created By: Russ Savage
* FreeAdWordsScripts.com
****************************************************/
var DATE_RANGE = 'LAST_7_DAYS';
var IGNORE_EXACT = true;
var TO = ["email_1@my_company.com","email_2@my_company.com"];
var SPREADSHEET_URL = "your spreadsheet url goes here";  
 
function main() {
  var columns = ['AccountDescriptiveName',
                 'CampaignName',
                 'AdGroupName',
                 'KeywordTextMatchingQuery',
                 'MatchType',
                 'Query',
                 'Device',
                 'Impressions',
                 'Clicks',
                 'AverageCpc',
                 'Cost',
                 'Ctr',
                 'Conversions',
                 'CostPerConversion',
                 'ConversionRate'
                 ];
  var columnsStr = columns.join(',') + " ";
    
  var sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getActiveSheet();
  sheet.clear();
  sheet.appendRow(columns);
    
  var reportIter = AdWordsApp.report(
    'SELECT ' + columnsStr +
    'FROM SEARCH_QUERY_PERFORMANCE_REPORT ' +
    'DURING ' + DATE_RANGE, {
      includeZeroImpressions: false
    }).rows();
    
  while(reportIter.hasNext()) {
    var row = reportIter.next();
    if(IGNORE_EXACT && row['MatchType'].indexOf('exact') >= 0) { continue; }
    var rowArray = [];
    for(var i in columns) {
      rowArray.push(row[columns[i]]);
    }
    sheet.appendRow(rowArray); 
  }
    
  for(var i in TO) {
    MailApp.sendEmail(TO[i], "Search Query Report Ready", SPREADSHEET_URL);
  }
}