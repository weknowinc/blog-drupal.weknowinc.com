---
layout: post
title: "How to execute an external PHP application inside Symfony/Drupal in a Sandbox"
categories: [articles]
tags: [Symfony,Drupal,PHP,Sandbox]
---
I know this could be a weird situation, but, believe or not sometimes is required execute an external application, maybe because that application doesn't have and API or just because you just need to execute that and get the results.


An easy thought could be just include the main file of that application, but maybe that is not possible because both applications could use similar namespaces or try to reload same libraries, for solve that is required to try to execute that application using a kind of **Sandbox**.

To accomplish that task, we can use the Symfony [Process](http://symfony.com/doc/current/components/process.html) Component.

Let me show you a small piece of code that could be included in your Symfony or Drupal 8 application.

```
use Symfony\Component\Process\PhpProcess;

$php_script = file_get_contents($php_file);

$phpProcess = new PhpProcess($php_script, $documentroot);
$phpProcess->run();
$output = $phpProcess->getOutput();
```

Firstly, we must read a PHP file path, defined in variable *$php_file* then using function *PhpProcess* execute that script using a specific DocumentRoot for our external application, that will avoid any issue of missing classes.

Secondly, the process is executed and finally we could get the output after our external application is completed, this process is synchronous.

Internally the Symfony component Process try to allocate the php-cli in your system to execute your application.

I hope you found this article useful.

