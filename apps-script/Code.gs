/**
 * Google Apps Script — รับไฟล์ base64 จาก Next.js แล้วเก็บลง Google Drive
 *
 * วิธี Deploy:
 * 1) เปิด https://script.google.com → New project
 * 2) วางโค้ดนี้ลงไป
 * 3) แก้ค่า DRIVE_FOLDER_ID และ SECRET ด้านล่าง
 * 4) Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5) ก๊อป URL ที่ได้มาใส่ใน .env => APPS_SCRIPT_UPLOAD_URL
 *    และรหัส SECRET ใน .env => APPS_SCRIPT_SECRET (ให้ตรงกับด้านล่าง)
 */

const DRIVE_FOLDER_ID = 'ใส่_FOLDER_ID_ของ_Google_Drive';
const SECRET = 'ใส่รหัสลับให้ตรงกับ APPS_SCRIPT_SECRET';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) {
      return _json({ error: 'Unauthorized' });
    }
    const filename = body.filename || ('repair-' + Date.now() + '.jpg');
    const mime = body.mimeType || 'image/jpeg';
    const bytes = Utilities.base64Decode(body.data);
    const blob = Utilities.newBlob(bytes, mime, filename);

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const file = folder.createFile(blob);
    // ตั้งสิทธิ์ให้ใครก็ดูได้ (LINE จะดึงรูปได้)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const id = file.getId();
    // ใช้ลิงก์รูปแบบ direct ที่ LINE/img tag ดึงได้
    const url = 'https://drive.google.com/uc?export=view&id=' + id;
    return _json({ url: url, id: id });
  } catch (err) {
    return _json({ error: String(err) });
  }
}

function doGet() {
  return _json({ ok: true, msg: 'Repair upload endpoint' });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
