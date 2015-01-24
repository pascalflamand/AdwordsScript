// List of phrases that indicate a keyword is part of your brand.
// In this example, we operate a fudge store named Elmer Fudge.
// Keywords with our brand name are "branded" keywords, those without "non-brand".
var BRAND_NAMES = ['eclectik','traiteur eclectik','eclectik traiteur','eclectik traiteur actualisé'];
// Set this to a your email address to get an email summary of new keywords to review.
var EMAIL_ADDRESS = 'pflamand@escaladeweb.com';

function main() {
  createLabels();

  labelBrandedKeywords();	

  checkPerformance();
}

function checkPerformance() {
  var lowBrandPerformers = labelLowPerformers(
      'brand-review',
      // 2% ctr
      0.02,
      // $1 (or account currency)
      1,
      // Only look at branded keywords
      'LabelNames CONTAINS_ANY ["brand-keyword"]');
  var lowNonBrandPerformers = labelLowPerformers(
      'brand-review',
      // 1% ctr
      0.01,
      // $2 (or account currency)
      2,
      // Only look non-branded keywords
      'LabelNames CONTAINS_NONE ["brand-keyword"]');

    // Send an email notifying that there are new keywords to review.
  if (EMAIL_ADDRESS && (lowBrandPerformers.length || lowNonBrandPerformers.length)) {
    var body = 'Branded keywords\n' + generateEmail(lowBrandPerformers) +
        'Non-Branded keywords\n' + generateEmail(lowNonBrandPerformers);
    MailApp.sendEmail(EMAIL_ADDRESS, "New keywords to review", body);
  }
}

/**
 * Labels keywords that have a low CTR and high CPC as a poor performer.
 *
 * @param {string} labelName Label to apply to poor performers.
 * @param {number} minCtr Minimum CTR we expect keywords to have.
 * @param {number} maxCpc Maximum average CPC.
 */
function labelLowPerformers(labelName, minCtr, maxCpc, labelCondition) {
  // Keep track of keywords that have had a label added this run.
  var newlyLabeled = [];
  var keywords = AdWordsApp.keywords().
      // Only want to look at keywords eligible to trigger ads.
      withCondition('CampaignStatus = ENABLED').
      withCondition('AdGroupStatus = ENABLED').
      withCondition('Status = ENABLED').
      // Filter out keywords above performance threadhold
      withCondition('Ctr < ' + minCtr).
      withCondition('AverageCpc > ' + maxCpc).
      withCondition(labelCondition).
      forDateRange('LAST_7_DAYS').
      get();
  while (keywords.hasNext()) {
    var keyword = keywords.next();
    // We should mark it for review depending on whether it's a branded keyword or not.
    var label = isBrand(keyword.getText()) ? 'brand-review' : 'non-brand-review';
    // Check if it already has the label.
    if (!hasLabel(keyword, label)) {
      keyword.applyLabel(label);
      // Track it as newly labeled.
      newlyLabeled.push(keyword);
    }
  }
  return newlyLabeled
}

function labelBrandedKeywords() {
  var keywords = AdWordsApp.keywords().get();
  while (keywords.hasNext()) {
    var keyword = keywords.next();
    if (isBrand(keyword.getText())) {
      keyword.applyLabel('brand-keyword');
    }
  }
}

// Needs to be run (only once) before working with this script.
function createLabels() {
  AdWordsApp.createLabel('brand-review', 'Branded keywords needing review', 'red');
  AdWordsApp.createLabel('non-brand-review', 'Branded keywords needing review', 'maroon');
  AdWordsApp.createLabel('brand-keyword', 'Keywords that are part of our brand', 'blue');
}

/**
 * Returns true if this string is consider to be a part of our brand, false otherwise.
 */
function isBrand(s) {
  if (!s) {
    return false;
  }
  for (var i = 0; i < BRAND_NAMES.length; i++) {
    if (s.toLowerCase().indexOf(BRAND_NAMES[i].toLowerCase()) != -1) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if this keyword already has this label applied.
 */
function hasLabel(keyword, label) {
  return keyword.labels().withCondition("Name = '" + label + "'").get().hasNext();
}

/**
 * Generate a message body for all keywords that have been added to a label for review.
 */
function generateEmail(keywords) {
  var lines = [];
  for(var i = 0; i < keywords.length; i++) {
    lines.push([keywords[i].getCampaign().getName(), keywords[i].getAdGroup().getName(), keywords[i].getText()].join(' > '));
  }
  return lines.join('\n');
}
}