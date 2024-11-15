create table refreshs
(
    id      varchar(36)  not null,
    token   varchar(255) not null
        primary key,
    expired timestamp    not null
);

create table users
(
    id         varchar(36)                            not null
        primary key,
    username   varchar(50)                            not null,
    nickname   varchar(50)                            not null,
    oauth      tinyint(1) default 0                   not null,
    oauthId    varchar(255)                           null,
    email      varchar(255)                           not null,
    password   varchar(255)                           not null,
    created_at timestamp  default current_timestamp() null,
    cash       int        default 0                   null,
    constraint email
        unique (email)
);

create table diary
(
    user_id varchar(36) not null,
    date    varchar(20) not null,
    feel    int         not null,
    weather int         not null,
    title   text        not null,
    content text        not null,
    constraint diary_ibfk_1
        foreign key (user_id) references users (id)
            on delete cascade
);

create index user_id
    on diary (user_id);

create table oauth
(
    id                 varchar(36)                           not null
        primary key,
    user_id            varchar(36)                           not null,
    access_token       text                                  not null,
    refresh_token      text                                  not null,
    provider           varchar(50)                           not null,
    provider_id        varchar(255)                          not null,
    access_expired_at  timestamp                             not null,
    refresh_expired_at timestamp                             not null,
    access_created_at  timestamp default current_timestamp() null,
    logined_at         timestamp default current_timestamp() null,
    constraint oauth_ibfk_1
        foreign key (user_id) references users (id)
            on delete cascade
);

create index user_id
    on oauth (user_id);

