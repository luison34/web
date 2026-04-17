/**
 * Your Bath Reno — Quiz Backend
 * 
 * This script receives quiz data from the HTML form
 * and saves it to two sheets: "Registros" and "Leads"
 *
 * SETUP:
 * 1. Create a Google Sheet with two tabs: "Registros" and "Leads"
 * 2. Paste this code in Extensions > Apps Script
 * 3. Deploy > New deployment > Web app > Anyone can access
 * 4. Copy the generated URL and paste it in the HTML file
 *
 * IMPORTANT: After updating this code, you must create a NEW deployment
 * (Deploy > New deployment), not just save. The old deployment URL
 * will keep running the old code.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ── Generate calculated fields (Toronto time, UTC-5) ──
    var now = new Date();
    var torontoOffset = -5; // Change to -4 during daylight saving (mid-March to early November)
    var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    var torontoTime = new Date(utc + (3600000 * torontoOffset));
    
    var timestamp = Utilities.formatDate(torontoTime, "GMT", "yyyy-MM-dd HH:mm:ss");
    var day = Utilities.formatDate(torontoTime, "GMT", "dd/MM/yyyy");
    var hour = torontoTime.getHours();
    
    // ── Determine which sheet to write to ──
    var sheetName = data.type === "lead" ? "Leads" : "Registros";
    var sheet = ss.getSheetByName(sheetName);
    
    // Create headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      var headers = [
        "timestamp",
        "day", 
        "hour",
        "ownership_status",
        "home_type",
        "bathroom_count",
        "renovation_count",
        "renovation_timeline",
        "bathroom_style",
        "renovation_type",
        "country",
        "zip_code",
        "score",
        "campaign",
        "medium",
        "region",
        "ad",
        "content_type"
      ];
      
      // Add name and phone columns only for Leads
      if (sheetName === "Leads") {
        headers.push("name");
        headers.push("phone");
      }
      
      sheet.appendRow(headers);
    }
    
    // ── Build row ──
    var row = [
      timestamp,
      day,
      hour,
      data.ownership_status || "",
      data.home_type || "",
      data.bathroom_count || "",
      data.renovation_count || "",
      data.renovation_timeline || "",
      data.bathroom_style || "",
      data.renovation_type || "",
      data.country || "",
      data.zip_code || "",
      data.score || 0,
      data.campaign || "",
      data.medium || "",
      data.region || "",
      data.ad || "",
      data.content_type || ""
    ];
    
    // Add name and phone only for Leads
    if (sheetName === "Leads") {
      row.push(data.name || "");
      row.push(data.phone || "");
    }
    
    sheet.appendRow(row);
    
    // ── Return success ──
    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", sheet: sheetName, timestamp: timestamp }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Required for CORS — handles preflight requests
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Quiz backend is running" }))
    .setMimeType(ContentService.MimeType.JSON);
}
