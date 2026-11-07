<?php

declare(strict_types=1);

namespace App\Application\Port;

interface TransactionManager
{
    /**
     * Tout ou rien : les écritures faites dans $work sont validées ensemble, ou annulées.
     *
     * @template T
     *
     * @param \Closure(): T $work
     *
     * @return T
     */
    public function transactional(\Closure $work): mixed;
}
