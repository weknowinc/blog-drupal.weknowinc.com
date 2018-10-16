---
layout: post
title: How to use Drupal 8 state in Cron to resume a process.
description: "Explanation about Drupal::State to create a Cron implementation with option to resume the execution"
categories: [articles]
tags: [PHP, Drupal]
draft: false
---
Usually Cron could be used to execute tasks who require a lot of processing, is normal to execute this tasks over a list of items.

The problem with this requirements is maybe there is not enough with one cron time execution to process the whole elements in our list of items to process. So we have to save the status of our execution to continue the next time the cron is executed.

We can do that with <a href="https://api.drupal.org/api/drupal/core%21modules%21system%21core.api.php/group/queue/8" target="_blank">Queue Operations</a>, but this solution is complex to implement(maybe just for me) so I will propose a simple option to implement the resume feature.

#Working with our list of items to process.

Lets imagine we store our list of items in and array, and the normal option to process and array is using a <a href="http://php.net/manual/en/control-structures.foreach.php" target="_blank">foreach</a>.

Well we can't use a foreach in our resume because this function starts his execution with a reset of the internal array pointer to the first element of the array and that is not good for our resume process.

So I have to use a different solution to do that, let me show you my first implementation

```
foreach ( $array as $array_key => $array_value ) {
}
```

Instead of that I decide to use a simple while with some changes to simulate the array key assignation in a variable as you can see in the following snippet.

```
while (list($array_key, $array_value) = each($array)) {
}
```

#Store last state

With the problem about array pointer resolved we need store the last correct pointer processed by cron, to store that I use a new feature of Drupal 8 <a href="https://api.drupal.org/api/drupal/core!lib!Drupal.php/function/Drupal%3A%3Astate/8" target="_blank">Drupal::state()</a>.

Drupal:state store temporary and not critical information, this information is not be migrated between environments in a eventual migration to production.

Let me show you how to use in combination with while loops

```
while (list($array_key, $array_value) = each($array)) {

  // --- INSERT LONG OPERATIONS HERE --

  // Set last bank process to continue after this bank
  \Drupal::state()->set('last_key', $array_key);
}

// Delete last bank if all were processed
\Drupal::state()->delete('last_key');
```

If the hook_cron is interrupted at least we will know in the last index executed without problems, because is stored in state variable **last_key**

If we don't get any interruption we must delete the state variable.

#Set array pointer

First I need to create a custom function named **_array_set_pointer_by_key** to set the array pointer to any arbitrary position, let me show the implementation.

```
function _array_set_pointer_by_key(&$array, $key)
{
    reset($array);
    while($index=key($array))
    {
        if($index==$key)
            break;

        next($array);
    }
}
```

The function above works with any kind of array keys.

Now we need to validate if we have to resume the execution of **hook_cron** in some position of our array of list of items, using again the **Drupal::State** to get the information as you can see in the following piece of code.

```
$last_key = \Drupal::state()->get($last_bank_variable, null);

if ($last_key) {
  // Set pointer to last key to process
  _array_set_pointer_by_key($array, $last_key);

  // Set array to next valid bank to process
  next($array);
}
```

After reset the array we use the <a href="http://php.net/manual/en/function.next.php" target="_blank">next</a> function to move the pointer to next position where we want to resume.

I hope you find this blog entry useful.



