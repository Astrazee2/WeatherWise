-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: weatherwise
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ai_forecast`
--

DROP TABLE IF EXISTS `ai_forecast`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_forecast` (
  `forecastID` int NOT NULL AUTO_INCREMENT,
  `productID` int NOT NULL,
  `weatherID` int NOT NULL,
  `predictedDemand` decimal(10,2) DEFAULT NULL,
  `confidenceLvl` decimal(5,2) DEFAULT NULL,
  `forecastDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `timeframe` varchar(45) NOT NULL,
  PRIMARY KEY (`forecastID`),
  UNIQUE KEY `forecastID_UNIQUE` (`forecastID`),
  KEY `productID_idx` (`productID`),
  KEY `weatherID_idx` (`weatherID`),
  CONSTRAINT `Report_productID` FOREIGN KEY (`productID`) REFERENCES `inventory_old` (`productID`),
  CONSTRAINT `Report_weatherID` FOREIGN KEY (`weatherID`) REFERENCES `weatherdata` (`weatherID`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_forecast`
--

LOCK TABLES `ai_forecast` WRITE;
/*!40000 ALTER TABLE `ai_forecast` DISABLE KEYS */;
INSERT INTO `ai_forecast` VALUES (1,1,2,8.53,95.00,'2025-10-25 10:38:36','daily'),(2,1,1,8.72,95.00,'2025-10-25 10:38:36','daily'),(3,1,3,8.53,95.00,'2025-10-25 10:38:36','daily'),(4,1,4,8.56,95.00,'2025-10-25 11:30:12','daily'),(5,1,5,8.56,95.00,'2025-10-25 11:30:13','daily'),(6,1,6,8.43,95.00,'2025-10-28 08:27:47','daily'),(7,1,7,8.43,95.00,'2025-10-28 08:27:47','daily'),(8,1,8,8.43,95.00,'2025-10-28 08:27:47','daily'),(9,1,9,8.43,95.00,'2025-10-28 08:27:47','daily'),(10,1,10,8.43,95.00,'2025-10-28 08:27:47','daily'),(11,1,11,8.43,95.00,'2025-10-28 08:27:47','daily');
/*!40000 ALTER TABLE `ai_forecast` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert`
--

DROP TABLE IF EXISTS `alert`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert` (
  `alertID` int NOT NULL AUTO_INCREMENT,
  `userID` int NOT NULL,
  `alertType` varchar(45) NOT NULL,
  `message` varchar(45) NOT NULL,
  `dateCreated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `alertStatus` varchar(45) NOT NULL,
  PRIMARY KEY (`alertID`),
  UNIQUE KEY `alertID_UNIQUE` (`alertID`),
  KEY `Alert_userID_idx` (`userID`),
  CONSTRAINT `Alert_userID` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert`
--

LOCK TABLES `alert` WRITE;
/*!40000 ALTER TABLE `alert` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `inventoryID` int NOT NULL AUTO_INCREMENT,
  `productID` int NOT NULL,
  `supplierID` int NOT NULL,
  `prodName` varchar(45) NOT NULL,
  `category` varchar(45) NOT NULL,
  `quantity` int NOT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `minThreshold` int NOT NULL,
  `maxThreshold` int NOT NULL,
  `lastUpdated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`inventoryID`),
  UNIQUE KEY `productID` (`productID`),
  KEY `fk_supplier_idx` (`supplierID`),
  CONSTRAINT `fk_supplier_inventory` FOREIGN KEY (`supplierID`) REFERENCES `supplier` (`supplierID`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES (2,1,1,'Pringles','Snacks',500,'pcs',100,500,'2025-10-29 03:54:22'),(3,3,1,'Doritos','Snacks',501,'pcs',200,400,'2025-10-28 09:23:03'),(4,4,1,'Apples','Fruits',500,'kg',100,200,'2025-10-28 11:28:23'),(5,2,1,'Lays','Snacks',1,'pcs',1,1,'2025-10-28 09:23:03'),(8,5,1,'Orange Juice','Beverages',4,'bottles',5,6,'2025-10-29 04:19:50'),(9,6,1,'Water Juice','Meat',45,'g',66,78,'2025-10-29 04:22:49'),(10,7,1,'ewan','Snacks',0,'pcs',1,4,'2025-10-29 04:25:24');
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report`
--

DROP TABLE IF EXISTS `report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report` (
  `reportID` int NOT NULL AUTO_INCREMENT,
  `userID` int NOT NULL,
  `reportType` varchar(45) NOT NULL,
  `dateCreated` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reportID`),
  UNIQUE KEY `idReport_UNIQUE` (`reportID`),
  KEY `userID_idx` (`userID`),
  CONSTRAINT `Report_userID` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report`
--

LOCK TABLES `report` WRITE;
/*!40000 ALTER TABLE `report` DISABLE KEYS */;
/*!40000 ALTER TABLE `report` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `roleID` int NOT NULL AUTO_INCREMENT,
  `roleName` enum('admin','owner','staff','supplier') NOT NULL,
  PRIMARY KEY (`roleID`),
  UNIQUE KEY `roleID_UNIQUE` (`roleID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scheduling`
--

DROP TABLE IF EXISTS `scheduling`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling` (
  `scheduleID` int NOT NULL AUTO_INCREMENT,
  `productID` int NOT NULL,
  `supplierID` int NOT NULL,
  `orderQuantity` int NOT NULL,
  `buyingPrice` decimal(10,2) DEFAULT NULL,
  `deliveryDate` date NOT NULL,
  `schedStatus` enum('On the way','Delivered','Returned') DEFAULT 'On the way',
  `createdDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `inventoryID` int DEFAULT NULL,
  PRIMARY KEY (`scheduleID`),
  KEY `productID_idx` (`productID`),
  KEY `supplierID_idx` (`supplierID`),
  KEY `Sched_inventoryID` (`inventoryID`),
  CONSTRAINT `Sched_supplierID` FOREIGN KEY (`supplierID`) REFERENCES `supplier` (`supplierID`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scheduling`
--

LOCK TABLES `scheduling` WRITE;
/*!40000 ALTER TABLE `scheduling` DISABLE KEYS */;
INSERT INTO `scheduling` VALUES (1,1,1,500,10000.00,'2025-12-12','Delivered','2025-10-14 05:14:53',NULL),(3,2,1,5000,21000.00,'2025-12-12','Delivered','2025-10-19 11:29:55',NULL),(5,1,1,21,9001.00,'2025-10-28','Returned','2025-10-27 10:04:52',NULL),(7,1,1,21,0.01,'2025-10-29','Returned','2025-10-28 06:23:21',NULL),(12,1,1,1,1.02,'2025-10-31','On the way','2025-10-29 04:21:23',NULL),(13,3,1,1,1.00,'2025-11-07','On the way','2025-10-29 06:01:25',NULL);
/*!40000 ALTER TABLE `scheduling` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier`
--

DROP TABLE IF EXISTS `supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier` (
  `supplierID` int NOT NULL AUTO_INCREMENT,
  `supplierName` varchar(45) NOT NULL,
  `contactPerson` varchar(45) DEFAULT NULL,
  `email` varchar(45) NOT NULL,
  `phone` varchar(45) NOT NULL,
  `address` varchar(45) NOT NULL,
  PRIMARY KEY (`supplierID`),
  UNIQUE KEY `supplierID_UNIQUE` (`supplierID`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier`
--

LOCK TABLES `supplier` WRITE;
/*!40000 ALTER TABLE `supplier` DISABLE KEYS */;
INSERT INTO `supplier` VALUES (1,'supplier','sino','aisuyda@eail.com','987391273','here'),(6,'mcdonalds','ronalds','ronald@mcdonalds.com','555777','mcdo'),(7,'Marc','dave','91837@aasd.com','198271392','asdasds'),(9,'juan','daves','asdda@dasd','23132','there'),(10,'juan','dave','marcdaveconstantino123@yahoo.com','231321','1');
/*!40000 ALTER TABLE `supplier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `userID` int NOT NULL AUTO_INCREMENT,
  `firstName` varchar(45) NOT NULL,
  `lastName` varchar(45) NOT NULL,
  `email` varchar(45) NOT NULL,
  `userPassword` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `userStatus` enum('active','inactive','pending') NOT NULL DEFAULT 'pending',
  `roleID` int NOT NULL,
  `verification_code` varchar(6) DEFAULT NULL,
  PRIMARY KEY (`userID`),
  UNIQUE KEY `userID_UNIQUE` (`userID`),
  UNIQUE KEY `email_UNIQUE` (`email`),
  KEY `roleID_idx` (`roleID`),
  CONSTRAINT `roleID` FOREIGN KEY (`roleID`) REFERENCES `roles` (`roleID`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (15,'ano','aasuhfskdg','marcdaveconstantino123@yahoo.com','scrypt:32768:8:1$6sYSNlEeSdVxemr7$e2e163f13dcce1567da4369501d0cb8556622976636fdd5bdcf3f26ef0a19a95005e42f223f2bb647f9a7fd4c5e73727682f576bd7cecca685213fcf866b4323','2025-10-14 05:46:24','active',1,NULL),(16,'first','second','marcdaveconstantino123@gmail.com','scrypt:32768:8:1$vPoGFD5q7bvJNL0r$0eb166d5e36980b7f2bb07094b3c94606ec56975751d16274db1e3e2c2760e2f892f3fb92f8b67e9cf1d7b515a3b4aaf5beb54981daa1182632cdffeff976e42','2025-10-14 06:36:11','active',1,NULL),(17,'bbg','honeybunchsugarplum','syrenealpapara@gmail.com','scrypt:32768:8:1$echIwvWr823IO147$b9721d47e20fd397d032d9bf3412dfea0dbf3a76acc9757873918f8320b99e5abf2ad477218894e1b789ab6967c5c90e54ad9b50d36ee3ce132e6c657e36d49b','2025-10-16 07:54:05','active',1,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `weatherdata`
--

DROP TABLE IF EXISTS `weatherdata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weatherdata` (
  `weatherID` int NOT NULL AUTO_INCREMENT,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `location` varchar(45) NOT NULL,
  `temperature` varchar(45) DEFAULT NULL,
  `humidity` varchar(45) DEFAULT NULL,
  `condition` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`weatherID`),
  UNIQUE KEY `weatherID_UNIQUE` (`weatherID`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `weatherdata`
--

LOCK TABLES `weatherdata` WRITE;
/*!40000 ALTER TABLE `weatherdata` DISABLE KEYS */;
INSERT INTO `weatherdata` VALUES (1,'2025-10-25 10:38:36','philippines','28.86 °C','71%','Clouds'),(2,'2025-10-25 10:38:36','Manila','29.57 °C','82%','Rain'),(3,'2025-10-25 10:38:36','Manila','29.57 °C','82%','Rain'),(4,'2025-10-25 11:30:12','Manila','28.98 °C','83%','Clouds'),(5,'2025-10-25 11:30:13','Manila','28.98 °C','83%','Clouds'),(6,'2025-10-28 08:27:47','Manila','31.14 °C','80%','Clouds'),(7,'2025-10-28 08:27:47','Manila','31.14 °C','80%','Clouds'),(8,'2025-10-28 08:27:47','Manila','31.14 °C','80%','Clouds'),(9,'2025-10-28 08:27:47','Manila','31.14 °C','80%','Clouds'),(10,'2025-10-28 08:27:47','Manila','31.14 °C','80%','Clouds'),(11,'2025-10-28 08:27:47','Manila','31.14 °C','80%','Clouds');
/*!40000 ALTER TABLE `weatherdata` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-29 14:05:41
