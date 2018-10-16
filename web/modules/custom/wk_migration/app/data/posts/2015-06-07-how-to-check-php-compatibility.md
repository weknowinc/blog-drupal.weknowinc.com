---
layout: post
title: "How to check php compatibility"
categories: [articles]
tags: [PHP, Code,Sniffer]
---
Sometimes do you receive the scary mission of validate if your [PHP](http://www.php.net) project will continue working if we upgrade or
downgrade the PHP version used in production server.

As you can imagine this is really complex task, because you have determine what pieces of code must to be changed in
order to continue working under new server conditions and any omission could be and would be a huge responsibility above
your shoulders.

Therefore, what you can do? trust in your good judge about code compatibility sounds like a bad approach and indeed it's 
a terrible approach even though if you really believe do you know really well the application.

Fortunately, there are some open source project to enable you to do this check automatically and today I will talk more 
specifically about the project [PHPCompatibility](https://github.com/wimg/PHPCompatibility).
  
#Install PHP CodeSniffer

It's possible install PHP CodeSniffer using PEAR, but I would recommend use composer instead of.

Is necessary inform to you system where PHP CodeSniffer binary **phpcs** could found after install with composer using 
the following command.

```
export PATH=~/.composer/vendor/bin:$PATH
```

After that we must execute composer to install PHP CodeSniffer using the following command.

```
composer global require "squizlabs/php_codesniffer=2.*"
```

To check the installation was success we could check running this command. This command will list the installed coding standards.

```
$ phpcs -i
The installed coding standards are MySource, PEAR, PHPCS, PSR1, PSR2, Squiz and Zend
```

Those code standards are located at **~/.composer/vendor/squizlabs/php_codesniffer/CodeSniffer/Standards**

#Installing PHPCompatibility code standard.

To download PHPCompatibility code standard we have to follow these instructions.

```
$ ~/.composer/vendor/squizlabs/php_codesniffer/CodeSniffer/Standards
$ git clone https://github.com/wimg/PHPCompatibility.git
```

Using **phpcs -i** we can double check the new code standard is available to be used.

```
$ phpcs -i
The installed coding standards are MySource, PEAR, PHPCompatibility, PHPCS, PSR1, PSR2, Squiz and Zend
```

#Checking compatibility

Firstly, you have to define if you a report including errors or warnings or both, in my case I want to exclude warning 
just to focus in fatal error of php I could get after a PHP upgrade in my production server using the following configuration 
for **phpcs**.

```
phpcs --config-set error_severity 1
phpcs --config-set warning_severity 0
```
## Executive report

If you want to show to your superior an executive report about how will be an upgrade/downgrade of PHP version in your
 application, you can get an overview report using the following command.
 
```
$ phpcs --report=source --standard=PHPCompatibility --extensions=php,inc,module,install --runtime-set testVersion 5.5 -pvs .
```

The command about analyze all files with extension .php, .inc, .module and .install because and I want to analyze a [Drupal](http://drupal.org) 
project, moreover, I want to check the compatibility of this project with PHP 5.5 showing the progress of this analysis.

This command will generate an output similar to following list.

```
PHP CODE SNIFFER VIOLATION SOURCE SUMMARY
----------------------------------------------------------------------
SOURCE                                                           COUNT
----------------------------------------------------------------------
PHPCompatibility.PHP.RemovedExtensions                           365
PHPCompatibility.PHP.DeprecatedNewReference                      153
PHPCompatibility.PHP.ForbiddenNamesAsInvokedFunctions            6
PHPCompatibility.PHP.DeprecatedFunctions                         3
----------------------------------------------------------------------
A TOTAL OF 527 SNIFF VIOLATIONS WERE FOUND IN 4 SOURCES
----------------------------------------------------------------------

Time: 3 mins, 46.3 secs; Memory: 185.25Mb
```

## Detailed report

To evaluate the statement of work to be prepared for the PHP version change, we can get a detail report in a file using 
this command.

```
phpcs --standard=PHPCompatibility --extensions=php,inc,module,install --report-full=/Users/enzo/Desktop/CS-report.txt --runtime-set testVersion 5.5 -pvs .
```

The command above will produce an output similar to this.

```
FILE: /Users/enzo/drupal/includes/common.inc
----------------------------------------------------------------------
FOUND 1 ERROR AFFECTING 1 LINE
----------------------------------------------------------------------
 1797 | ERROR | 'clone' is a reserved keyword introduced in PHP version
      |       | 5.0 and cannot be invoked as a function (T_CLONE)
      |       | (PHPCompatibility.PHP.ForbiddenNamesAsInvokedFunctions)
----------------------------------------------------------------------
```

I hope you found this post useful.