DROP DATABASE IF EXISTS auction_DB;
CREATE DATABASE auction_DB;
USE auction_DB;

-- users: login + names

CREATE TABLE users (
  user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,   
  first_name    VARCHAR(60)  NOT NULL,
  last_name     VARCHAR(60)  NOT NULL,
  phone         VARCHAR(40),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- user_addresses: one or more addresses per user 

CREATE TABLE user_addresses (
  address_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  street       VARCHAR(120) NOT NULL,
  street_no    VARCHAR(20)  NOT NULL,
  city         VARCHAR(80)  NOT NULL,
  country      VARCHAR(80)  NOT NULL,
  postal_code  VARCHAR(20)  NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- items: what is being sold

CREATE TABLE items (
  item_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id        INT UNSIGNED NOT NULL,
  title            VARCHAR(160) NOT NULL,
  description      TEXT,
  condition_code   ENUM('NEW','USED','REFURB') NOT NULL DEFAULT 'USED',
  cover_image_url  VARCHAR(400),
  ship_cost_std    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ship_cost_exp    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ship_days        INT NOT NULL DEFAULT 5,
  starting_price    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  current_price     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  minimum_price     DECIMAL(10,2) NULL,
  auction_type      ENUM('FORWARD','DUTCH') NOT NULL DEFAULT 'FORWARD',
  status            ENUM('SCHEDULED','ACTIVE','ENDED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  end_time          DATETIME NULL,
  current_winner_id INT UNSIGNED NULL,
  payment_status     VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
  payment_time       DATETIME NULL,
  category         VARCHAR(80) NULL,
  keywords         TEXT NULL,
  quantity         INT NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_seller FOREIGN KEY (seller_id) REFERENCES users(user_id)
);

-- auctions: both FORWARD and DUTCH

CREATE TABLE auctions (
  auction_id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id                INT UNSIGNED NOT NULL,
  type                   ENUM('FORWARD','DUTCH') NOT NULL,
  state                  ENUM('SCHEDULED','ACTIVE','ENDED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  start_time             DATETIME NOT NULL,
  end_time               DATETIME NULL,              -- FORWARD only
  starting_price         DECIMAL(10,2) NOT NULL,
  min_increment          DECIMAL(10,2) NULL,         -- FORWARD only
  dutch_drop_every_sec   INT NULL,                   -- DUTCH only
  dutch_drop_step        DECIMAL(10,2) NULL,         -- DUTCH only
  dutch_floor_price      DECIMAL(10,2) NULL,         -- DUTCH only
  reserve_price          DECIMAL(10,2) NULL,         -- optional for FORWARD
  CONSTRAINT fk_auc_item FOREIGN KEY (item_id) REFERENCES items(item_id)
);

-- bids: used for FORWARD auctions

CREATE TABLE bids (
  bid_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id    INT UNSIGNED NOT NULL,
  bidder_id  INT UNSIGNED NOT NULL,
  amount     DECIMAL(10,2) NOT NULL,
  bid_time   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bids_item   FOREIGN KEY (item_id)   REFERENCES items(item_id),
  CONSTRAINT fk_bids_bidder FOREIGN KEY (bidder_id) REFERENCES users(user_id)
);

-- dutch_accepts: a single accept ends the dutch auction

CREATE TABLE dutch_accepts (
  accept_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  auction_id      INT UNSIGNED NOT NULL UNIQUE,
  buyer_id        INT UNSIGNED NOT NULL,
  price_at_accept DECIMAL(10,2) NOT NULL,
  accept_time     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_da_auc   FOREIGN KEY (auction_id) REFERENCES auctions(auction_id),
  CONSTRAINT fk_da_buyer FOREIGN KEY (buyer_id)   REFERENCES users(user_id)
);

-- orders: created after a win/accept

CREATE TABLE orders (
  order_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  auction_id      INT UNSIGNED NOT NULL UNIQUE,
  buyer_id        INT UNSIGNED NOT NULL,
  shipping_method ENUM('STANDARD','EXPEDITED') NOT NULL DEFAULT 'STANDARD',
  shipping_cost   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal        DECIMAL(10,2) NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  status          ENUM('PENDING','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- address information for payment
  ship_name        VARCHAR(120) NULL,
  ship_street      VARCHAR(120) NULL,
  ship_street_no   VARCHAR(20)  NULL,
  ship_city        VARCHAR(80)  NULL,
  ship_country     VARCHAR(80)  NULL,
  ship_postal_code VARCHAR(20)  NULL,
  CONSTRAINT fk_ord_auc   FOREIGN KEY (auction_id) REFERENCES auctions(auction_id),
  CONSTRAINT fk_ord_buyer FOREIGN KEY (buyer_id)   REFERENCES users(user_id)
);

-- payments: simple tracking

CREATE TABLE payments (
  payment_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL UNIQUE,
  provider   VARCHAR(40) NOT NULL,
  amount     DECIMAL(10,2) NOT NULL,
  status     ENUM('INITIATED','SUCCEEDED','FAILED') NOT NULL DEFAULT 'INITIATED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  card_last4 CHAR(4),
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- DEMO DATA--

-- demo users
INSERT INTO users(username,email,password_hash,first_name,last_name,phone) VALUES
 ('armaan','armaan@yorku.ca','pass123','Armaan','Aulakh','4166223445'),
 ('matthew','matthew@yorku.ca','pass213','Matthew','P','6478769876');

-- primary address for each demo user
INSERT INTO user_addresses(user_id, street, street_no, city, country, postal_code) VALUES
 (1,'Yonge St','123','Toronto','Canada','M5H 2N2'),
 (2,'Keele St','4700','Toronto','Canada','M3J 1P3');

-- items seeded with auction fields filled so front end can show real prices
INSERT INTO items(
  seller_id,title,description,condition_code,cover_image_url,
  ship_cost_std,ship_cost_exp,ship_days,
  starting_price,current_price,minimum_price,
  auction_type,status,end_time,
  category,keywords,quantity
) VALUES
 (1,'Vintage Camera','1960s rangefinder','USED','https://picsum.photos/seed/cam/600/400',
  15,30,5,
  100.00,120.00,NULL,
  'FORWARD','ACTIVE', DATE_ADD(NOW(), INTERVAL 10 MINUTE),
  'Electronics','camera, vintage, film',1),

 (1,'Rare Sneakers','Deadstock size 10','NEW','https://picsum.photos/seed/shoe/600/400',
  20,38,7,
  200.00,200.00,NULL,
  'FORWARD','ACTIVE', DATE_ADD(NOW(), INTERVAL 7 MINUTE),
  'Fashion','shoes, sneakers, rare',1),

 (2,'Gaming GPU','High-end, like new','USED','https://picsum.photos/seed/gpu/600/400',
  25,45,3,
  899.00,899.00,649.00,
  'DUTCH','ACTIVE', NULL,
  'Computers','gpu, graphics card, gaming',1);

--  matching rows in auctions table (for completeness)
INSERT INTO auctions(item_id,type,state,start_time,end_time,starting_price,min_increment,reserve_price) VALUES
 (1,'FORWARD','ACTIVE', NOW(), DATE_ADD(NOW(), INTERVAL 10 MINUTE),100,5,120),
 (2,'FORWARD','ACTIVE', NOW(), DATE_ADD(NOW(), INTERVAL 7 MINUTE),200,10,NULL);

INSERT INTO auctions(item_id,type,state,start_time,starting_price,dutch_drop_every_sec,dutch_drop_step,dutch_floor_price) VALUES
 (3,'DUTCH','ACTIVE', NOW(), 899, 30, 50, 649);

-- initial bids (forward auctions)
INSERT INTO bids(item_id, bidder_id, amount) VALUES
 (1,2,110.00),
 (1,1,120.00);