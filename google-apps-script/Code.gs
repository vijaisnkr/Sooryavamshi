/**
 * Sooryavamshi Solar Projects LLP - Google Apps Script Lead Sync Web App
 * 
 * Automatically receives new site assessment requests from Supabase Database Webhook
 * and appends them to Google Sheet: "Sooryavamshi Solar Site Assessment Leads"
 * Worksheet Tab: "Site Assessment Leads"
 * 
 * Secret Property: WEBHOOK_SECRET = suryavamshi_sec_2026_x9k2m7
 */

var DEFAULT_SECRET = "suryavamshi_sec_2026_x9k2m7";
var SHEET_NAME = "Site Assessment Leads";

/**
 * Setup helper: Initializes worksheet headers and formatting in 1-click.
 * Run this function in the Apps Script Editor to format your Google Sheet.
 */
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  var headers = [
    "Supabase ID",
    "Date",
    "Full Name",
    "Phone Number",
    "Email",
    "PIN Code",
    "City / Location",
    "Monthly Consumption (kWh)",
    "Estimated Solar Capacity (kW)",
    "KSEB Consumer Number",
    "Rooftop Details",
    "Preferred Contact Time",
    "Status",
    "Source",
    "Rooftop Photo Path"
  ];
  
  // Set headers in Row 1 (Cols A to O)
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#073B6B");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);
  
  // Auto-fit column widths reasonably
  sheet.setColumnWidth(1, 280); // Supabase ID
  sheet.setColumnWidth(2, 160); // Date
  sheet.setColumnWidth(3, 180); // Full Name
  sheet.setColumnWidth(4, 140); // Phone
  sheet.setColumnWidth(5, 180); // Email
  sheet.setColumnWidth(6, 100); // PIN Code
  sheet.setColumnWidth(7, 160); // City / Location
  sheet.setColumnWidth(8, 160); // Monthly Consumption
  sheet.setColumnWidth(9, 180); // Estimated Capacity
  sheet.setColumnWidth(10, 160); // KSEB Number
  sheet.setColumnWidth(11, 220); // Rooftop Details
  sheet.setColumnWidth(12, 160); // Preferred Contact Time
  sheet.setColumnWidth(13, 120); // Status
  sheet.setColumnWidth(14, 110); // Source
  sheet.setColumnWidth(15, 200); // Rooftop Photo Path

  Logger.log("Worksheet tab '" + SHEET_NAME + "' setup completed successfully.");
}

/**
 * Handles HTTP GET requests (Web App deployment check)
 */
function doGet(e) {
  return createJsonResponse(true, "Sooryavamshi Solar Webhook Service is active", 200, {
    service: "Supabase to Google Sheets Lead Integration",
    status: "online",
    timestamp: new Date().toISOString()
  });
}

/**
 * Handles HTTP POST webhooks from Supabase
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 10 seconds for concurrent requests
  try {
    lock.waitLock(10000);
  } catch (err) {
    return createJsonResponse(false, "Server busy, lock timeout", 503);
  }

  try {
    // 1. Verify Secret Property
    var scriptProperties = PropertiesService.getScriptProperties();
    var expectedSecret = scriptProperties.getProperty("WEBHOOK_SECRET") || DEFAULT_SECRET;
    
    var incomingSecret = "";
    if (e && e.parameter && e.parameter.secret) {
      incomingSecret = e.parameter.secret;
    } else if (e && e.parameter && e.parameter.WEBHOOK_SECRET) {
      incomingSecret = e.parameter.WEBHOOK_SECRET;
    }
    
    // 2. Parse Incoming JSON Payload
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse(false, "Empty POST body", 400);
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse(false, "Invalid JSON payload", 400);
    }

    if (!incomingSecret && payload.secret) {
      incomingSecret = payload.secret;
    }

    // Authentication verification (if secret is passed, enforce validation)
    if (incomingSecret && incomingSecret !== expectedSecret) {
      return createJsonResponse(false, "Unauthorized: Invalid Webhook Secret", 401);
    }

    // Extract record details (Supabase Webhook sends { type, table, record: {...} })
    var record = payload.record || payload;
    if (!record || (!record.id && !record.phone_number && !record.full_name)) {
      return createJsonResponse(false, "Invalid record payload", 400);
    }

    // 3. Open Spreadsheet & Worksheet Tab
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      setupSheet();
      sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    }

    var supabaseId = String(record.id || "");

    // 4. Deduplication Check (Check Col A for matching Supabase ID)
    if (supabaseId) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < existingIds.length; i++) {
          if (String(existingIds[i][0]).trim() === supabaseId.trim()) {
            Logger.log("Duplicate record skipped for ID: " + supabaseId);
            return createJsonResponse(true, "Duplicate record skipped", 200, { id: supabaseId, skipped: true });
          }
        }
      }
    }

    // 5. Format & Sanitize Field Values for Columns A to O
    var formattedDate = record.created_at ? 
      new Date(record.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : 
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    var fullName = record.full_name || "";
    var phoneNumber = record.phone_number ? "'" + String(record.phone_number) : ""; // Lead single quote to preserve string
    var email = record.email || "";
    var pinCode = record.pin_code ? "'" + String(record.pin_code) : "";
    var cityLocation = record.city_location || "";
    var monthlyConsumption = (record.monthly_consumption !== null && record.monthly_consumption !== undefined) ? record.monthly_consumption : "";
    var estimatedSolarCapacity = (record.estimated_solar_capacity !== null && record.estimated_solar_capacity !== undefined) ? record.estimated_solar_capacity : "";
    var ksebConsumerNumber = record.kseb_consumer_number ? "'" + String(record.kseb_consumer_number) : "";
    var rooftopDetails = record.rooftop_details || "";
    var preferredContactTime = record.preferred_contact_time || "";
    var status = record.status || "New";
    var source = record.source || "Website";
    var rooftopPhotoPath = record.rooftop_photo_path || "";

    // 6. Construct Row Array (Col A to Col O)
    var newRow = [
      supabaseId,             // Col A: Supabase ID
      formattedDate,          // Col B: Date
      fullName,               // Col C: Full Name
      phoneNumber,            // Col D: Phone Number
      email,                  // Col E: Email
      pinCode,                // Col F: PIN Code
      cityLocation,           // Col G: City / Location
      monthlyConsumption,     // Col H: Monthly Consumption (kWh)
      estimatedSolarCapacity, // Col I: Estimated Solar Capacity (kW)
      ksebConsumerNumber,     // Col J: KSEB Consumer Number
      rooftopDetails,         // Col K: Rooftop Details
      preferredContactTime,   // Col L: Preferred Contact Time
      status,                 // Col M: Status
      source,                 // Col N: Source
      rooftopPhotoPath        // Col O: Rooftop Photo Path
    ];

    sheet.appendRow(newRow);

    var targetRow = sheet.getLastRow();
    sheet.getRange(targetRow, 1, 1, newRow.length).setVerticalAlignment("middle");

    Logger.log("Successfully added lead for " + fullName + " (ID: " + supabaseId + ") at Row " + targetRow);

    return createJsonResponse(true, "Lead synced successfully", 200, {
      id: supabaseId,
      name: fullName,
      row: targetRow
    });

  } catch (err) {
    Logger.log("Error in doPost: " + err.toString());
    return createJsonResponse(false, "Internal script error: " + err.toString(), 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Utility function to create JSON Output
 */
function createJsonResponse(success, message, statusCode, data) {
  var res = {
    success: success,
    status: statusCode,
    message: message,
    timestamp: new Date().toISOString()
  };
  if (data) {
    res.data = data;
  }
  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}
