
import { extend } from '@forest.host/extend';
import { Etcd3 } from '@forest.host/etcd3';
import os from 'os';
import { ElectionError } from './errors.js';

export class Broker {
  constructor(config = {}) {
    // Mandatory config
    if( ! config.hasOwnProperty('queue')) {
      throw new Error("Mandatory config attribute 'queue' not set");
    }

    const defaults = {
      etcd: {
        hosts: "http://127.0.0.1:2379",
      },
      verbosity: 1,
      timeout: 3,
      campaign: {
        value: os.hostname(),
      },
    };

    this.config = extend(defaults, config);
    this.etcd = new Etcd3(this.config.etcd);

    // Create campaign
    this.election = this.etcd.election(this.config.queue, this.config.timeout);
  }

  // Join election / queue
  attach() {
    if( ! this.election.isIdle()) {
      throw new ElectionError('Broker already attached to queue');
    }

    // Keep handle of listener, as we need to cancel listener on detach
    this.listener = () => {
      if(this.config.verbosity > 0) {
        console.log('Resigned! Reattaching...')
      }

      return this.attach();
    };

    // When resigned, recampaign
    this.election.once('resigned', this.listener);
    return this.election.campaign(this.config.campaign.value);
  }

  detach() {
    if(this.election.isIdle()) {
      throw new ElectionError('Broker is not attached to queue');
    }

    this.election.off('resigned', this.listener);

    return this.election.resign();
  }

  is_leader() {
    return this.election.isLeading();
  }
}
