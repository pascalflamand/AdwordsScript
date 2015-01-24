/************************************
 * Generic Script Runner
 * Version 1.0
 * Created By: Russ Savage
 * FreeAdWordsScripts.com
 ***********************************/
function main() {
  //See http://goo.gl/KvINmD for an example spreadsheet.
  var scriptConfigId = '0AvbIELGS8y0QdFZWRi1aTGVkbVpDai1pTE82M29wSnc';
  var sheet = SpreadsheetApp.openById(scriptConfigId).getActiveSheet();
  var data = sheet.getRange('A:C').getValues();
  for(var i in data) {
    if(i == 0) { continue; }
    var [description, location, classname] = data[i];
    if(!location) { continue; }
    Logger.log('Running "'+description+'" from location: '+location);
    var scriptFile = getFile(location);
    var scriptText = scriptFile.getBlob().getDataAsString();
    eval(scriptText);
    var script = eval('new '+classname+'();');
    script.main();
  }
}
  
//This function gets the file from GDrive
function getFile(loc) {
  var locArray = loc.split('/');
  var folder = getFolder(loc);
  if(folder.getFilesByName(locArray[locArray.length-1]).hasNext()) {
    return folder.getFilesByName(locArray[locArray.length-1]).next();
  } else {
    return null;
  }
}
  
//This function finds the folder for the file and creates folders if needed
function getFolder(folderPath) {
  var folder = DriveApp.getRootFolder();
  if(folderPath) {
    var pathArray = folderPath.split('/');
    for(var i in pathArray) {
      if(i == pathArray.length - 1) { break; }
      var folderName = pathArray[i];
      if(folder.getFoldersByName(folderName).hasNext()) {
        folder = folder.getFoldersByName(folderName).next();
      }
    }
  }
  return folder;
}