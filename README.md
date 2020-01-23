# Enzo website 2020
This is a Drupal distribution project


## Project dependencies
Git is used as version control system.
- [git](https://git-scm.com/downloads)

For local setup we standardize on docker to manage local insfrastructure as code and isolate from the local machine.
- [docker](https://www.docker.com/products/docker-desktop)
- The docker definition was done on the [docker-compose.yml](docker-compose.yml)
- In order to properly use docker you need to use a `.env`. Please read `Project setup` section

Ahoy is the used tool to standardize the definition of custom shell commands that will be executed against the containers.
- [ahoy](https://github.com/ahoy-cli/ahoy)
- The custom command definition was done on the [.ahoy.yml](.ahoy.yml)

## SSH and SCP website server access

Example drupal-staging
```
ssh -i ~/.ssh/devoops/id_rsa deploy@drupal-staging.weknowinc.com
```
SCP / download files
```
scp -i ~/.ssh/devoops/id_rsa deploy@enzo-drupal.weknowinc.com:/home/deploy/2019-backup/enzo-files-backup.tar.gz .
```

## Project Setup

### Fork and Clone repo at github

# Fork project
```
https://github.com/weknowinc/blog-drupal.weknowinc.com
```

# Copy .env file
```
cp .env.dist .env
```

# Add hostname entries in your /etc/hosts file for Drupal site
```
127.0.0.1    enzo-drupal.weknowinc.develop
```

## Start the project


### Start from a database backup

#### Get a Database backup

Please contact the site administrators via email to ops@weknowinc.com, they will provide you a fresh database backup of the site.

#### Start the containers

According the `mysql` image on dockerhub:

>
>When a container is started for the first time, a new database with the specified name will be created and initialized with the provided configuration variables. Furthermore, it will execute files with extensions .sh, .sql and .sql.gz that are found in /docker-entrypoint-initdb.d. Files will be executed in alphabetical order. You can easily populate your mysql services by mounting a SQL dump into that directory and provide custom images with contributed data. SQL files will be imported by default to the database specified by the MYSQL_DATABASE variable.
>

For this docker setup the `docker-entrypoint-initdb.d.` is mounted on a directory called `mariadb-init-enzo` that means that you can start the project with a fresh DB backup once is located in the `mariadb-init-enzo` folder on the root of the project

```
$ mv DB_Backup/weKnow.sql mariadb-init-enzo/.
```

After this now you're able to start the containers

```
$ ahoy up
```

**NOTE:** If the site is already instaled and there is a need to wipe all the data of the current DB instance (this step destroy the current data in the contanier volume).

```
$ ahoy destroy

# and start the containers once again

$ ahoy up
```

#### Install project dependencies with composer

The containers are now ready to work but there is not dependecies installed (e.g core files, contrib modules, themes or profiles) we need use `composer` via `ahoy` to install all the dependencies

```
$ ahoy composer install
```


#### Import configurations

The project provides a chain command to import the new configurations from your local environment with `drupalconsole` via `ahoy`

```
$ ahoy drupal build
```

Now the dependencies are installed and the new configurations imported, do you need proceed with the theme setup section.

## Using Drupal Console for development

When I have a multi-site I have to point the commands to the installation/domain of each site:

```
ahoy drupal ulu 1 --uri=enzo-drupal.weknowinc.develop
```
```
ahoy drupal cr --uri=enzo-drupal.weknowinc.develop
```

## Theme setup
The theme of this project uses [particle version 9.x](https://github.com/phase2/particle/tree/release/9.x) and since this part of the site doesn't take advantage of `docker-compose` have to follow the [instructions](https://github.com/phase2/particle/tree/release/9.x#quickstart) of the particle theme and running on our host machine, **for this reason we dont provide `ahoy` commands to work with it**


```
# Go to the theme folder
cd web/themes/custom/weknowinc_theme

# Initial setup
npm install
npm run setup

# Start up patternlab watcher (development mode)
npm start

# Compile assets for Drupal (production build)
npm run compile
```

Now the site is ready with the theme assets compiled

## Using Composer
This is a composer project base and we are going to us composer to manage dependencies.
```
# Add a new dependency
ahoy composer require drupal/MODULE_NAME

# Update a dependency
ahoy composer update drupal/MODULE_NAME

# Remove a dependency
ahoy composer remove drupal/MODULE_NAME
```

### Apply patches
Apply patches has to be done has a drupal composer project does, but running `composer` with `ahoy` like is mentioned above
```
"extra": {
    "patches": {
        "drupal/paragraphs": {
            "Patch description": /path/to/file.patch"
        }
    }
}
```

## Accessing the project

Visit [http://weknowinc.local](http://weknowinc.local) in your browser.

If this doesn't work check the `ports` configuration for `traefik` service in `/docker-compose.yml` file.


## Export Configuration
This projects takes advanate of Drupal Configuration Management and these are the suggested commands to manage configuration between different stages.

```
# Using default drupal config system
ahoy drupal config:export --no-interaction

```

## Stop containers and cleanup

In case you need stop the containers you can use `ahoy`

```
ahoy stop
```

In case you not longer need the container of this project or just need start over and clean all data you can use `ahoy`

```
ahoy destroy

```
**NOTE:** This step destroy the current data in the contanier volume

## Troubleshooting on local setup

### Overlaping on used ports

Sometimes your host machine can use the same ports that the local orchestation of `docker-compose`

```
Bind for 0.0.0.0:80 failed: port is already allocated
```

To fix this problem we recommend that the mentioned port is not used by other application/service on your host machine a usefull snippet to allocate this process and kill it to start the containers

```
# run the command to see which proccess is using the port
lsof -i :80 or sudo lsof -i :80 in macOS

COMMAND   PID     USER   FD   TYPE   DEVICE SIZE NODE NAME
apache2 10437     root    3u  IPv6 22890556       TCP *:www (LISTEN)
apache2 10438 www-data    3u  IPv6 22890556       TCP *:www (LISTEN)
apache2 10439 www-data    3u  IPv6 22890556       TCP *:www (LISTEN)
```

in this example the apache service is taking this port, and you can stop this service with the command

```
# OSX
sudo apachectl stop
# Linux
sudo systemctl stop apache2.service
```

or maybe you can directly kill the process

```
kill -9 $(lsof -t -i:8080)
```

some tools for development environments can use an strategy to restore this services if they are not stopped correctly, in this case you have to use the method defined by the vendor of the tool for example:

* [Lando](https://docs.devwithlando.io/cli/poweroff.html)
* [pigmy (lagoon)](https://docs.amazee.io/local_docker_development/pygmy.html)
