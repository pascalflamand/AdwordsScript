var SPREADSHEET_URL = "[YOUR_URL]";

var spreadsheetAccess = new SpreadsheetAccess(SPREADSHEET_URL, "Rules");

var totalColumns;

function main() {
  spreadsheetAccess.spreadsheet.getRangeByName("account_id").setValue(AdWordsApp.currentAccount().getCustomerId());

  var columns = spreadsheetAccess.sheet.getRange(5, 2, 5, 100).getValues()[0];
  for (var i = 0; i < columns.length; i ++) {
    if (columns[i].length == 0 || columns[i] == 'Results') {
      totalColumns = i;
      break;
    }
  }
  if (columns[totalColumns] != 'Results') {
    spreadsheetAccess.sheet.getRange(5, totalColumns + 2, 1, 1).setValue("Results");
  }
  // clear the results column
  spreadsheetAccess.sheet.getRange(6, totalColumns + 2, 1000, 1).clear();

  var row = spreadsheetAccess.nextRow();

  while (row != null) {
    var argument;
    var stopLimit;
    try {
      argument = parseArgument(row);
      stopLimit = parseStopLimit(row);
    } catch (ex) {
      logError(ex);
      row = spreadsheetAccess.nextRow();
      continue;
    }
    var selector = AdWordsApp.keywords();
    for (var i = 3; i < totalColumns; i ++) {
      var header = columns[i];
      var value = row[i];
      if (!isNaN(parseFloat(value)) || value.length > 0) {
        if (header.indexOf("'") > 0) {
          value = value.replace(/\'/g,"\\'");
        } else if (header.indexOf("\"") > 0) {
          value = value.replace(/"/g,"\\\"");
        }
        var condition = header.replace('?', value);
        selector.withCondition(condition);
      }
    }
    selector.forDateRange(spreadsheetAccess.spreadsheet.getRangeByName("date_range").getValue());
    
    var keywords = selector.get();
    
    try {
      keywords.hasNext();
    } catch (ex) {
      logError(ex);
      row = spreadsheetAccess.nextRow();
      continue;
    }
    
    var fetched = 0;
    var changed = 0;
    
    while (keywords.hasNext()) {
      var keyword = keywords.next();
      var oldBid = keyword.getMaxCpc();
      var action = row[0];
      var newBid;

      fetched ++;
      if (action == 'Add') {
        newBid = addToBid(oldBid, argument, stopLimit);
      } else if (action == 'Multiply by') {
        newBid = multiplyBid(oldBid, argument, stopLimit);
      } else if (action == 'Set to First Page Cpc' || action == 'Set to Top of Page Cpc') {
        var newValue = action == 'Set to First Page Cpc' ? keyword.getFirstPageCpc() : keyword.getTopOfPageCpc();
        var isPositive = newValue > oldBid;
        newValue = applyStopLimit(newValue, stopLimit, isPositive);
      }
      if (newBid < 0) {
        newBid = 0.01;
      }
      newBid = newBid.toFixed(2);
      if (newBid != oldBid) {
        changed ++;
      }
      keyword.setMaxCpc(newBid);
    }
    logResult("Fetched " + fetched + "\nChanged " + changed);
    
    row = spreadsheetAccess.nextRow();
  }
  var now = new Date(Utilities.formatDate(new Date(), 
      AdWordsApp.currentAccount().getTimeZone(), "MMM dd,yyyy HH:mm:ss"));
  spreadsheetAccess.spreadsheet.getRangeByName('last_execution').setValue(now);
}

function addToBid(oldBid, argument, stopLimit) {
  return applyStopLimit(oldBid + argument, stopLimit, argument > 0);
}

function multiplyBid(oldBid, argument, stopLimit) {
  return applyStopLimit(oldBid * argument, stopLimit, argument > 1);
}

function applyStopLimit(newBid, stopLimit, isPositive) {
  if (stopLimit) {
    if (isPositive && newBid > stopLimit) {
      newBid = stopLimit;
    } else if (!isPositive && newBid < stopLimit) {
      newBid = stopLimit;
    }
  }
  return newBid;
}

function parseArgument(row) {
  if (row[1].length == 0 && (row[0] == 'Add' || row[0] == 'Multiply by')) {
    throw("\"Argument\" must be specified.");
  }
  var argument = parseFloat(row[1]);
  if (isNaN(argument)) {
    throw "Bad Argument: must be a number.";
  }
  return argument;
}
function parseStopLimit(row) {
  if (row[2].length == 0) {
    return null;
  }
  var limit = parseFloat(row[2]);
  if (isNaN(limit)) {
    throw "Bad Argument: must be a number.";
  }
  return limit;
}
function logError(error) {
  spreadsheetAccess.sheet.getRange(spreadsheetAccess.currentRow(), totalColumns + 2, 1, 1)
  .setValue(error)
  .setFontColor('#c00')
  .setFontSize(8)
  .setFontWeight('bold');
}
function logResult(result) {
  spreadsheetAccess.sheet.getRange(spreadsheetAccess.currentRow(), totalColumns + 2, 1, 1)
  .setValue(result)
  .setFontColor('#444')
  .setFontSize(8)
  .setFontWeight('normal');
}

function SpreadsheetAccess(spreadsheetUrl, sheetName) {
  this.spreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
  this.sheet = this.spreadsheet.getSheetByName(sheetName);
  this.cells = this.sheet.getRange(6, 2, this.sheet.getMaxRows(), this.sheet.getMaxColumns()).getValues();
  this.rowIndex = 0;
  
  this.nextRow = function() {
    for (; this.rowIndex < this.cells.length; this.rowIndex ++) {
      if (this.cells[this.rowIndex][0]) {
        return this.cells[this.rowIndex++];
      }
    }
    return null;
  }
  this.currentRow = function() {
    return this.rowIndex + 5;
  }
}
