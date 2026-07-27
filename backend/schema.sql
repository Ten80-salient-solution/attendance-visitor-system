-- MySQL Database Schema for Attendance & Visitor System
-- To be imported in phpMyAdmin or executed directly in MySQL

CREATE TABLE IF NOT EXISTS `office_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_qr_token` varchar(255) NOT NULL DEFAULT 'TEN80_STAFF_TOKEN_2026',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default office settings if none exist
INSERT INTO `office_settings` (`id`, `staff_qr_token`) 
SELECT 1, 'TEN80_STAFF_TOKEN_2026' 
FROM DUAL 
WHERE NOT EXISTS (SELECT 1 FROM `office_settings` WHERE `id` = 1);

CREATE TABLE IF NOT EXISTS `offices` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `radius_meters` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default offices if empty
INSERT INTO `offices` (`id`, `name`, `latitude`, `longitude`, `radius_meters`) VALUES
('off-1', 'Lagos Head Office', 6.5244, 3.3792, 100),
('off-2', 'Abuja Branch Office', 9.0765, 7.3986, 100)
ON DUPLICATE KEY UPDATE `id`=`id`;

CREATE TABLE IF NOT EXISTS `staff_members` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `position` varchar(255) NOT NULL,
  `profile_picture` mediumtext DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` varchar(100) NOT NULL,
  `staff_name` varchar(255) NOT NULL,
  `employee_id` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `check_in_time` varchar(100) DEFAULT NULL,
  `check_out_time` varchar(100) DEFAULT NULL,
  `date` varchar(50) NOT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `device_info` text DEFAULT NULL,
  `status` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_date` (`date`),
  KEY `idx_employee` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `visitor_records` (
  `id` varchar(100) NOT NULL,
  `visitor_name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `reason_for_visit` varchar(255) NOT NULL,
  `host_employee` varchar(255) NOT NULL,
  `check_in_time` varchar(100) NOT NULL,
  `check_out_time` varchar(100) DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `status` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` varchar(100) NOT NULL,
  `timestamp` varchar(100) NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `user_email` varchar(255) NOT NULL,
  `details` text NOT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `device_info` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
