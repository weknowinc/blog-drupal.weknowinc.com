---
layout: post
title: "How to download remote files with Silex/Symfony and Drupal 8"
categories: [articles]
tags: [Guzzle,Silex,Symfony,Zip,Drupal]
---
As a new developer of Silex/Symfony, I found really excited some components available to use with [Silex](http://silex.sensiolabs.org/) and [Symfony](symfony.com). Today
I want to talk about [Guzzle](https://github.com/guzzle/guzzle) and [Zippy](https://github.com/alchemy-fr/Zippy), I am going to show you how to use both 
to download and handle remote zip/gz files in your application.

#Installing with composer.

Firstly, we need to add the dependency in our **composer.json** file as you can see in the following snippet.

```
{
    "require": {
        "guzzlehttp/guzzle": "~6.1.1",
        "alchemy/zippy": "0.2.*@dev"
    }
}
```

After include these new dependencies you must to run the composer update as you can see in the following bash sentence.

```
$ composer update
```

#Usage

With those new vendors, you only need to use the, as you can see in the following code.

```
<?php

use Alchemy\Zippy\Zippy;
use GuzzleHttp\Client;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Filesystem\Exception\IOExceptionInterface;
```

Now inside any method of your class is possible to request to create a client of Guzzle, in general terms Guzzle is like a 
headless browser.

```
$client =  new Client();

// Destination file to download the release
$destination = tempnam(sys_get_temp_dir(), 'file.') . "tar.gz";

// Get and save file
$client->get($remote_zip_file_path, ['save_to' => $destination]);

// Handle Zip file to extract in your system
$zippy = Zippy::load();
$archive = $zippy->open($destination);
$archive->extract('./');

try {
  $fs = new Filesystem();
  $fs->rename($remote_zip_file_name, './' . $new_folder_name);
} catch (IOExceptionInterface $e) {
  print 'Error renaming folder';
}
```

In the code above we are assuming we have the path to file and name and we want to rename the folder after extract, the code 
also could be improved include a try catch section for extract process.

As you can see is complex task like that normally is handle by CURL but as you can see Guzzle is more powerful and his implementation is easier to understand.

#Drupal usage.

Because now [Drupal](http://drupal.org) 8 include several Symfony components and other useful components, the code above could be rewrite 
using Drupal 8 wrapper, let me show you the implementation.

```
use Drupal\Core\Archiver\ArchiveTar;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Filesystem\Exception\IOExceptionInterface;

```

```
$client =  new Drupal::httpClient();

// Destination file to download the release
$destination = tempnam(sys_get_temp_dir(), 'file.') . "tar.gz";

// Get and save file
$client->get($remote_zip_file_path, ['save_to' => $destination]);

// Handle Zip file to extract in your system
$archiver = new ArchiveTar($destination, 'gz');
$archiver->extract('./');
fclose($destination . '.tar.gz');

try {
  $fs = new Filesystem();
  $fs->rename($remote_zip_file_name, './' . $new_folder_name);
} catch (IOExceptionInterface $e) {
  print 'Error renaming folder';
}
```

As you can see is similar and we don't have to modify the Drupal 8 composer.json file, to include components because they are
already included in Drupal 8 core.

If you want to check a complete implementation of this logic, you can check the source code of [Drupal Console](http://drupalconsole.com) project commands 
[module:download](https://github.com/hechoendrupal/DrupalConsole/blob/master/src/Command/Module/DownloadCommand.php) and [site:new](https://github.com/hechoendrupal/DrupalConsole/blob/master/src/Command/Site/NewCommand.php)

I hope you found this article useful.