<?php

namespace Drupal\wk_domain\TwigExtension;

/**
 * Class DomainTwigExtension.
 */
class DomainTwigExtension extends \Twig_Extension {

    public function getFunctions() {
        return [
            new \Twig_SimpleFunction('google_analitycs_id', [$this, 'getGoogleAnalitycsID']),
            new \Twig_SimpleFunction('domain_user', [$this, 'getDomainUser']),
            new \Twig_SimpleFunction('domain_host', [$this, 'getActiveDomainHost']),
            new \Twig_SimpleFunction('disqus_name', [$this, 'getDisqusName'])
        ];
    }

    public function getGoogleAnalitycsID() {
        $activeDomain = \Drupal::service('domain.negotiator')
            ->getActiveDomain();

        $webPropertyIds = [
            'enzo.weknowinc.com' => getenv('WEB_PROPERTY_ID_ENZO'),
            'jmolivas.weknowinc.com' => getenv('WEB_PROPERTY_ID_JMOLIVAS')
        ];

        if(!array_key_exists($activeDomain->getHostname(), $webPropertyIds)){
            return null;
        }

        return $webPropertyIds[$activeDomain->getHostname()];
   }

   public function getActiveDomainHost() {
        $activeDomain = \Drupal::service('domain.negotiator')
            ->getActiveDomain();

        return $activeDomain->getHostname();
    }


    public function getDomainUser() {
        $activeDomain = \Drupal::service('domain.negotiator')
            ->getActiveDomain();

        $domain_id = str_replace('.', '_', $activeDomain->getHostname());

        $userId = (int)\Drupal::database()->query(
            'SELECT entity_id FROM {user__field_domain_access} WHERE field_domain_access_target_id = :domain_id and entity_id > 1',
            [ ':domain_id' => $domain_id ]
        )->fetchField();

        $userStorage = \Drupal::entityTypeManager()->getStorage('user');

        return $userStorage->load($userId);
    }

    public function getDisqusName() {
        $activeDomain = \Drupal::service('domain.negotiator')
            ->getActiveDomain();

        $shortnames = ['enzo.weknowinc.com' => 'enzolutions', 'jmolivas.weknowinc.com' =>  'jmolivas'];

        if(!array_key_exists($activeDomain->getHostname(), $shortnames)){
            return null;
        }

        return $shortnames[$activeDomain->getHostname()];
    }

    /**
     * {@inheritdoc}
     */
    public function getName() {
        return 'wk_domain.twig.extension';
    }

}
