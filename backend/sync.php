<?php
// Main API synchronization gateway for cPanel MySQL database
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// Helper function to extract GPS coordinates
function get_gps_coords($item) {
    if (isset($item['gpsCoordinates']) && is_array($item['gpsCoordinates'])) {
        return [
            'lat' => isset($item['gpsCoordinates']['latitude']) ? (float)$item['gpsCoordinates']['latitude'] : null,
            'lng' => isset($item['gpsCoordinates']['longitude']) ? (float)$item['gpsCoordinates']['longitude'] : null
        ];
    }
    return ['lat' => null, 'lng' => null];
}

// 1. Process Updates (POST or PUT)
if ($method === 'POST' || $method === 'PUT') {
    $raw_input = file_get_contents('php://input');
    $input = json_decode($raw_input, true);

    if ($input) {
        try {
            $pdo->beginTransaction();

            // 1.1 Sync settings
            if (isset($input['settings']) && is_array($input['settings'])) {
                $settings = $input['settings'];
                
                // Update settings fields
                $set_clauses = [];
                $params = [];
                if (isset($settings['staffQRToken'])) {
                    $set_clauses[] = "`staff_qr_token` = ?";
                    $params[] = $settings['staffQRToken'];
                }
                if (isset($settings['adminPassword'])) {
                    $set_clauses[] = "`admin_password` = ?";
                    $params[] = $settings['adminPassword'];
                }
                if (isset($settings['visitorAdminPassword'])) {
                    $set_clauses[] = "`visitor_admin_password` = ?";
                    $params[] = $settings['visitorAdminPassword'];
                }
                
                if (!empty($set_clauses)) {
                    $sql = "UPDATE `office_settings` SET " . implode(", ", $set_clauses) . " WHERE `id` = 1";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                }

                // Update Offices
                if (isset($settings['offices']) && is_array($settings['offices'])) {
                    $stmt = $pdo->prepare("INSERT INTO `offices` (`id`, `name`, `latitude`, `longitude`, `radius_meters`) 
                        VALUES (:id, :name, :lat, :lng, :rad) 
                        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `latitude` = VALUES(`latitude`), `longitude` = VALUES(`longitude`), `radius_meters` = VALUES(`radius_meters`)");
                    
                    foreach ($settings['offices'] as $office) {
                        $stmt->execute([
                            ':id' => $office['id'],
                            ':name' => $office['name'],
                            ':lat' => (float)$office['latitude'],
                            ':lng' => (float)$office['longitude'],
                            ':rad' => (int)$office['radiusMeters']
                        ]);
                    }
                }
            }

            // 1.2 Sync Staff
            if (isset($input['staff']) && is_array($input['staff'])) {
                $stmt = $pdo->prepare("INSERT INTO `staff_members` (`id`, `name`, `email`, `phone`, `position`, `profile_picture`, `password`, `is_deleted`) 
                    VALUES (:id, :name, :email, :phone, :pos, :pic, :pwd, 0) 
                    ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `email` = VALUES(`email`), `phone` = VALUES(`phone`), `position` = VALUES(`position`), `profile_picture` = VALUES(`profile_picture`), `password` = VALUES(`password`), `is_deleted` = 0");
                
                foreach ($input['staff'] as $member) {
                    $stmt->execute([
                        ':id' => $member['id'],
                        ':name' => $member['name'],
                        ':email' => $member['email'],
                        ':phone' => $member['phone'],
                        ':pos' => $member['position'],
                        ':pic' => isset($member['profilePicture']) ? $member['profilePicture'] : null,
                        ':pwd' => isset($member['password']) ? $member['password'] : 'password123'
                    ]);
                }
            }

            // 1.3 Sync Deleted Staff (Soft Delete in DB)
            if (isset($input['deletedStaff']) && is_array($input['deletedStaff'])) {
                $stmt = $pdo->prepare("UPDATE `staff_members` SET `is_deleted` = 1 WHERE `id` = ?");
                foreach ($input['deletedStaff'] as $id) {
                    $stmt->execute([$id]);
                }
            }

            // 1.4 Sync Attendance Records
            if (isset($input['attendance']) && is_array($input['attendance'])) {
                $stmt = $pdo->prepare("INSERT INTO `attendance_records` (`id`, `staff_name`, `employee_id`, `email`, `check_in_time`, `check_out_time`, `date`, `latitude`, `longitude`, `device_info`, `status`) 
                    VALUES (:id, :name, :emp_id, :email, :in_time, :out_time, :date, :lat, :lng, :device, :status) 
                    ON DUPLICATE KEY UPDATE `staff_name` = VALUES(`staff_name`), `employee_id` = VALUES(`employee_id`), `email` = VALUES(`email`), `check_in_time` = VALUES(`check_in_time`), `check_out_time` = VALUES(`check_out_time`), `date` = VALUES(`date`), `latitude` = VALUES(`latitude`), `longitude` = VALUES(`longitude`), `device_info` = VALUES(`device_info`), `status` = VALUES(`status`)");
                
                foreach ($input['attendance'] as $record) {
                    $coords = get_gps_coords($record);
                    $stmt->execute([
                        ':id' => $record['id'],
                        ':name' => $record['staffName'],
                        ':emp_id' => $record['employeeId'],
                        ':email' => $record['email'],
                        ':in_time' => isset($record['checkInTime']) ? $record['checkInTime'] : null,
                        ':out_time' => isset($record['checkOutTime']) ? $record['checkOutTime'] : null,
                        ':date' => $record['date'],
                        ':lat' => $coords['lat'],
                        ':lng' => $coords['lng'],
                        ':device' => isset($record['deviceInfo']) ? $record['deviceInfo'] : null,
                        ':status' => $record['status']
                    ]);
                }
            }

            // 1.5 Sync Visitors
            if (isset($input['visitors']) && is_array($input['visitors'])) {
                $stmt = $pdo->prepare("INSERT INTO `visitor_records` (`id`, `visitor_name`, `phone`, `email`, `company`, `reason_for_visit`, `host_employee`, `check_in_time`, `check_out_time`, `latitude`, `longitude`, `status`) 
                    VALUES (:id, :name, :phone, :email, :comp, :reason, :host, :in_time, :out_time, :lat, :lng, :status) 
                    ON DUPLICATE KEY UPDATE `visitor_name` = VALUES(`visitor_name`), `phone` = VALUES(`phone`), `email` = VALUES(`email`), `company` = VALUES(`company`), `reason_for_visit` = VALUES(`reason_for_visit`), `host_employee` = VALUES(`host_employee`), `check_in_time` = VALUES(`check_in_time`), `check_out_time` = VALUES(`check_out_time`), `latitude` = VALUES(`latitude`), `longitude` = VALUES(`longitude`), `status` = VALUES(`status`)");
                
                foreach ($input['visitors'] as $visitor) {
                    $coords = get_gps_coords($visitor);
                    $stmt->execute([
                        ':id' => $visitor['id'],
                        ':name' => $visitor['visitorName'],
                        ':phone' => $visitor['phone'],
                        ':email' => isset($visitor['email']) ? $visitor['email'] : null,
                        ':comp' => isset($visitor['company']) ? $visitor['company'] : null,
                        ':reason' => $visitor['reasonForVisit'],
                        ':host' => $visitor['hostEmployee'],
                        ':in_time' => $visitor['checkInTime'],
                        ':out_time' => isset($visitor['checkOutTime']) ? $visitor['checkOutTime'] : null,
                        ':lat' => $coords['lat'],
                        ':lng' => $coords['lng'],
                        ':status' => $visitor['status']
                    ]);
                }
            }

            // 1.6 Sync Audit Logs
            if (isset($input['audit']) && is_array($input['audit'])) {
                $stmt = $pdo->prepare("INSERT INTO `audit_logs` (`id`, `timestamp`, `action_type`, `user_email`, `details`, `latitude`, `longitude`, `device_info`) 
                    VALUES (:id, :time, :type, :email, :details, :lat, :lng, :device) 
                    ON DUPLICATE KEY UPDATE `timestamp` = VALUES(`timestamp`), `action_type` = VALUES(`action_type`), `user_email` = VALUES(`user_email`), `details` = VALUES(`details`), `latitude` = VALUES(`latitude`), `longitude` = VALUES(`longitude`), `device_info` = VALUES(`device_info`)");
                
                foreach ($input['audit'] as $log) {
                    $coords = get_gps_coords($log);
                    $stmt->execute([
                        ':id' => $log['id'],
                        ':time' => $log['timestamp'],
                        ':type' => $log['actionType'],
                        ':email' => $log['userEmail'],
                        ':details' => $log['details'],
                        ':lat' => $coords['lat'],
                        ':lng' => $coords['lng'],
                        ':device' => isset($log['deviceInfo']) ? $log['deviceInfo'] : null
                    ]);
                }
            }

            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Sync failed: ' . $e->getMessage()
            ]);
            exit;
        }
    }
}

// 2. Fetch Complete State
try {
    // 2.1 Fetch Settings
    $settings_stmt = $pdo->query("SELECT `staff_qr_token` AS `staffQRToken`, `admin_password` AS `adminPassword`, `visitor_admin_password` AS `visitorAdminPassword` FROM `office_settings` WHERE `id` = 1");
    $settings = $settings_stmt->fetch();
    if (!$settings) {
        $settings = [
            'staffQRToken' => 'TEN80_STAFF_TOKEN_2026',
            'adminPassword' => 'admin123',
            'visitorAdminPassword' => 'visitor123'
        ];
    }

    // Fetch Offices
    $offices_stmt = $pdo->query("SELECT `id`, `name`, `latitude`, `longitude`, `radius_meters` AS `radiusMeters` FROM `offices`");
    $offices = $offices_stmt->fetchAll();
    // Convert floats
    foreach ($offices as &$o) {
        $o['latitude'] = (float)$o['latitude'];
        $o['longitude'] = (float)$o['longitude'];
        $o['radiusMeters'] = (int)$o['radiusMeters'];
    }
    $settings['offices'] = $offices;

    // 2.2 Fetch Staff
    $staff_stmt = $pdo->query("SELECT `id`, `name`, `email`, `phone`, `position`, `profile_picture` AS `profilePicture`, `password` FROM `staff_members` WHERE `is_deleted` = 0");
    $staff = $staff_stmt->fetchAll();

    // 2.3 Fetch Deleted Staff IDs
    $del_staff_stmt = $pdo->query("SELECT `id` FROM `staff_members` WHERE `is_deleted` = 1");
    $deleted_staff = $del_staff_stmt->fetchAll(PDO::FETCH_COLUMN);

    // 2.4 Fetch Attendance
    $attendance_stmt = $pdo->query("SELECT `id`, `staff_name` AS `staffName`, `employee_id` AS `employeeId`, `email`, `check_in_time` AS `checkInTime`, `check_out_time` AS `checkOutTime`, `date`, `latitude`, `longitude`, `device_info` AS `deviceInfo`, `status` FROM `attendance_records`");
    $attendance = $attendance_stmt->fetchAll();
    foreach ($attendance as &$att) {
        $att['gpsCoordinates'] = ($att['latitude'] !== null && $att['longitude'] !== null) 
            ? ['latitude' => (float)$att['latitude'], 'longitude' => (float)$att['longitude']] 
            : null;
        unset($att['latitude']);
        unset($att['longitude']);
    }

    // 2.5 Fetch Visitors
    $visitors_stmt = $pdo->query("SELECT `id`, `visitor_name` AS `visitorName`, `phone`, `email`, `company`, `reason_for_visit` AS `reasonForVisit`, `host_employee` AS `hostEmployee`, `check_in_time` AS `checkInTime`, `check_out_time` AS `checkOutTime`, `latitude`, `longitude`, `status` FROM `visitor_records`");
    $visitors = $visitors_stmt->fetchAll();
    foreach ($visitors as &$vis) {
        $vis['gpsCoordinates'] = ($vis['latitude'] !== null && $vis['longitude'] !== null) 
            ? ['latitude' => (float)$vis['latitude'], 'longitude' => (float)$vis['longitude']] 
            : null;
        unset($vis['latitude']);
        unset($vis['longitude']);
    }

    // 2.6 Fetch Audits
    $audit_stmt = $pdo->query("SELECT `id`, `timestamp`, `action_type` AS `actionType`, `user_email` AS `userEmail`, `details`, `latitude`, `longitude`, `device_info` AS `deviceInfo` FROM `audit_logs` ORDER BY `timestamp` DESC");
    $audit = $audit_stmt->fetchAll();
    foreach ($audit as &$aud) {
        $aud['gpsCoordinates'] = ($aud['latitude'] !== null && $aud['longitude'] !== null) 
            ? ['latitude' => (float)$aud['latitude'], 'longitude' => (float)$aud['longitude']] 
            : null;
        unset($aud['latitude']);
        unset($aud['longitude']);
    }

    echo json_encode([
        'settings' => $settings,
        'staff' => $staff,
        'deletedStaff' => $deleted_staff,
        'attendance' => $attendance,
        'visitors' => $visitors,
        'audit' => $audit
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to retrieve state: ' . $e->getMessage()
    ]);
    exit;
}
