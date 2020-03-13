
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

    if(this.config.verbosity > 0) {
      this.election.lease.on('lost', () => {
        console.log(`${this.config.campaign.value} lost lease`);
      });

      this.election
        .on('leading', () => console.log(`${this.config.campaign.value} is now leading the ${this.config.queue} queue`))
        .on('following', () => console.log(`${this.config.campaign.value} is now following the ${this.config.queue} queue`));
    }
  }

  // Join election / queue
  async attach() {
    if( ! this.election.isIdle()) {
      throw new ElectionError('Broker already attached to queue');
    }

    // Wait for campaig before attaching event listener, as listener can be triggered multiple times by multiple 'resigned' events
    try {
      await this.election.campaign(this.config.campaign.value);
    } catch(err) {
      const is_timed_out = err.message.indexOf('request timed out') != -1;

      // When attach request timed out, wait for a bit and retry
      if(is_timed_out) {
        if(this.config.verbosity > 0) {
          console.log(`${this.config.campaign.value} could not attach to queue due to time-out, retrying...`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.attach();
      } else {
        // Something is seriously wrong
        throw err;
      }
    }

    // Keep handle of listener, as we need to cancel listener on detach
    this.listener = () => {
      if(this.config.verbosity > 0) {
        console.log(`${this.config.campaign.value} somehow resigned! Reattaching...`);
      }

      return this.attach();
    };

    // When election resigned, re-attach as we should still be attached
    this.election.once('resigned', this.listener);
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
