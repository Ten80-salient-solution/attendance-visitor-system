# cPanel PHP/MySQL Backend Deployment Guide

This folder contains the backend files for your Attendance & Visitor System. Setting this up will transition your web application from using a public cloud JSON bucket (KVdb.io) to a secure, private MySQL database hosted on your own cPanel server.

---

## 🛠️ Step 1: Create the MySQL Database on cPanel

1. Log in to your **cPanel Dashboard**.
2. Scroll to the **Databases** section and open the **MySQL® Database Wizard**.
3. **Step 1: Create A Database** - Enter a database name (e.g., `attendance_db`) and click **Next Step**.
4. **Step 2: Create Database Users** - Enter a username (e.g., `attendance_user`) and a secure password. Keep these credentials handy. Click **Create User**.
5. **Step 3: Add User to the Database** - Check the box for **ALL PRIVILEGES** to grant the user permissions over the database, then click **Make Changes**.

---

## 📂 Step 2: Import the Database Schema

1. Go back to your **cPanel Dashboard** and open **phpMyAdmin**.
2. From the left sidebar, click on the database name you created in Step 1.
3. Click the **Import** tab in the top navigation bar.
4. Click **Choose File** and select the [schema.sql](file:///Users/ekeneanyaegbu/Documents/attendance-visitor-system/backend/schema.sql) file located in this folder.
5. Scroll down and click **Import** (or **Go**). This will create all 6 database tables and seed the default office locations.

---

## 📝 Step 3: Configure Database Credentials

1. Open the [db.php](file:///Users/ekeneanyaegbu/Documents/attendance-visitor-system/backend/db.php) file in this folder.
2. Edit the `$db_config` array values to match your cPanel MySQL details:
   ```php
   $db_config = [
       'host' => 'localhost',         // Usually 'localhost' on cPanel
       'dbname' => 'your_db_name',    // e.g., 'yourprefix_attendance_db'
       'user' => 'your_db_user',      // e.g., 'yourprefix_attendance_user'
       'password' => 'your_password',  // Password created in Step 1
       'charset' => 'utf8mb4'
   ];
   ```
3. Save the file.

---

## 🚀 Step 4: Upload Backend Files to cPanel

1. In **cPanel**, open the **File Manager**.
2. Navigate to your website's root directory (typically `public_html`).
3. Create a new folder named `api` (so the path is `/public_html/api`).
4. Upload the following files from this folder directly into the new `/api` directory:
   *   `db.php`
   *   `sync.php`
5. Test the setup by visiting `https://yourdomain.com/api/sync.php` in your web browser. You should see a JSON output showing the database structure with default offices (Lagos and Abuja).

---

## 🖥️ Step 5: Connect the React Frontend

You can configure the frontend to sync with your cPanel server using **either** of the following methods:

### Method A: Configure in the Admin Dashboard (Recommended)
1. Build and deploy your React app.
2. Log in to the **Admin Dashboard** of your attendance system.
3. Open the **Office Settings** tab.
4. Locate the **Database Sync API URL** input field.
5. Enter your cPanel API path: `https://yourdomain.com/api/sync.php`
6. Click **Save Configuration** (or let it autosave). The app will instantly switch its synchronization destination to your server!

### Method B: Environment Variable (Build-time)
If you deploy to Vercel, simply add the following environment variable to your project settings and trigger a rebuild:
*   **Name**: `VITE_API_URL`
*   **Value**: `https://yourdomain.com/api/sync.php`
