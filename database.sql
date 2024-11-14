CREATE TABLE Table_Users
(
    id         VARCHAR(36) PRIMARY KEY,
    username   VARCHAR(50)         NOT NULL,
    oauth      BOOLEAN             NOT NULL DEFAULT 0,
    oauthId    VARCHAR(255),
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255)        NOT NULL,
    created_at TIMESTAMP                    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Table_OAuth
(
    id                 VARCHAR(36) PRIMARY KEY,
    user_id            VARCHAR(36)  NOT NULL,
    access_token       TEXT         NOT NULL,
    refresh_token      TEXT         NOT NULL,
    provider           VARCHAR(50)  NOT NULL,
    provider_id        VARCHAR(255) NOT NULL,
    access_expired_at  TIMESTAMP    NOT NULL,
    refresh_expired_at TIMESTAMP    NOT NULL,
    access_created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logined_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Table_Users (id) ON DELETE CASCADE
);

CREATE TABLE DIARY_Daily_Data
(
    user_id varchar(36) NOT NULL,
    date VARCHAR(20) NOT NULL,
    feel INTEGER NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Table_Users (id) ON DELETE CASCADE
)