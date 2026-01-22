# Import/Export Users Feature Guide

## Overview
The User Management page (Unit Head) now includes Import and Export functionality for managing users in bulk using Excel files.

## Location
- **URL:** `http://localhost:5000/unit-head/role-permission-management`
- **Access Level:** Unit Head only

---

## Export Users

### How to Use:
1. Navigate to User Management page
2. Click the **Export** button in the top-right header
3. An Excel file will be downloaded with name format: `unit_head_users_export_YYYY-MM-DD.xlsx`

### Exported Data Includes:
- Username
- Email
- Full Name
- Role
- Unit
- Company Name
- Status (Active/Inactive)
- Created Date
- Last Login

### Excel Features:
- Auto-sized columns for readability
- Professional formatting
- Date formatting
- Easy to open in Excel, Google Sheets, or LibreOffice

---

## Import Users

### How to Use:
1. Navigate to User Management page
2. Click the **Import** button in the top-right header
3. An import dialog will open with:
   - Import instructions
   - Available roles list
   - Template download button
   - File upload area

### Step-by-Step Import Process:

#### Step 1: Download Template
- Click "Download Template File" button
- A sample Excel file (`user_import_template.xlsx`) will be downloaded
- Contains 2 example rows showing the format

#### Step 2: Fill the Template
Open the template and fill in the following columns:

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| Username | ✅ Yes | Unique username | john.doe |
| Email | ✅ Yes | Valid email address | john.doe@example.com |
| Full Name | ⚠️ Optional | User's full name | John Doe |
| Role | ✅ Yes | Must match available roles | Unit Manager |
| Unit | ⚠️ Optional | Unit assignment | Unit A |
| Status | ⚠️ Optional | Active or Inactive | Active |

#### Step 3: Upload File
- Click "Choose File" or drag file to upload area
- Select your filled Excel file (.xlsx or .xls)
- System will automatically process and import users

### Available Roles:
- Unit Manager
- Sales
- Production
- Packing
- Dispatch
- Accounts

### Import Features:
- ✅ Automatic company assignment (uses Unit Head's company)
- ✅ Default password: `Welcome@123`
- ✅ Status defaults to Active if not specified
- ✅ Batch import multiple users at once
- ✅ Detailed error reporting
- ✅ Success/failure count

---

## Example Excel Format

### Template Structure:
```
| Username   | Email                 | Full Name  | Role         | Unit   | Status |
|------------|-----------------------|------------|--------------|--------|--------|
| john.doe   | john.doe@example.com  | John Doe   | Unit Manager | Unit A | Active |
| jane.smith | jane.smith@example.com| Jane Smith | Sales        | Unit A | Active |
```

---

## Import Rules & Validation

### Required Fields:
- **Username**: Cannot be empty, must be unique
- **Email**: Must be valid email format, must be unique
- **Role**: Must match one of the available roles exactly

### Optional Fields:
- **Full Name**: Defaults to username if not provided
- **Unit**: Can be empty
- **Status**: Defaults to "Active" if not provided or if value is anything other than "Inactive"

### Validation Errors:
Users with missing required fields will be skipped and logged in errors

---

## Success/Failure Messages

### During Import:
- ✅ "Successfully imported X users. Failed: Y"
- ❌ "Import failed. X users could not be imported."
- ℹ️ Detailed errors logged to browser console

### After Export:
- ✅ "Exported X users to Excel file"

---

## Troubleshooting

### Export Issues:

**Export button is disabled**
- No users to export - add users first

**File won't open**
- Ensure you have Excel, Google Sheets, or compatible software
- Try opening in different spreadsheet application

### Import Issues:

**"No data found in Excel file"**
- Excel file is empty
- Check that data starts from row 1 with headers

**"Skipped row: Missing required fields"**
- Check Username, Email, and Role columns are filled
- Ensure column names match exactly (case-insensitive)

**"Failed to import [username]"**
- Username or email already exists
- Invalid email format
- Role name doesn't match available roles
- Check console for detailed error

**Users imported but can't login**
- Default password is `Welcome@123`
- Check Status is set to "Active"
- Users should change password on first login

---

## Tips & Best Practices

### For Export:
- Export regularly as backup
- Use exported data as template for bulk imports
- Review data in Excel before sharing

### For Import:
- Always download and use the latest template
- Test with 1-2 users first before bulk import
- Keep a backup of your import file
- Use consistent naming conventions
- Double-check role names match exactly
- Review imported users after upload

### Security:
- Delete exported files after use (contains sensitive data)
- Don't share files with passwords
- Store templates in secure location
- Remind users to change default password

---

## Technical Details
- **Export Format**: Excel (.xlsx)
- **Import Format**: Excel (.xlsx, .xls)
- **Max File Size**: No frontend limit
- **Validation**: Client-side + server-side
- **Default Password**: Welcome@123
- **API Endpoint**: `/api/unit-head/unit-users`
- **Library Used**: xlsx (SheetJS)

---

## Support

For issues or questions:
1. Check browser console for detailed errors
2. Verify file format matches template
3. Ensure all required fields are filled
4. Contact system administrator if problems persist
