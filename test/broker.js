
import { Etcd3 } from '@forest.host/etcd3';
import { Broker } from '../src/index.js'
import { assert } from 'chai';
import { CampaignState } from '@forest.host/etcd3';

const etcd3 = new Etcd3({ hosts: 'http://127.0.0.1:2379' });

const create_broker = value => {
  let config = {
    queue: 'default',
    timeout: 1,
    verbosity: 0,
  };
  if(value) { config.campaign = { value } }

  return new Broker(config);
}

const broker0 = create_broker('self');
const broker1 = create_broker('other');

describe('Broker', () => {
  describe('attach()', () => {
    before(() => broker0.attach());
    after(() => broker0.detach());

    it('Starts campaigning', () => {
      assert.equal(broker0.election.isLeading(), true);
    });

    it('Recampaigns on resignation', async () => {
      await broker0.election.resign();

      await broker0.election.waitForCampaignState(CampaignState.Leading);

      assert.equal(broker0.election.isLeading(), true);
    })

    it('Does not recampaign multiple times on multiple resignation triggers', async () => {
      await broker1.attach();

      await Promise.all([
        // Catch to prevent errors bubbling up, could be we've removed the lease from etcd before all events trigger
        broker0.election.resign().catch(() => {}),
        broker0.election.resign().catch(() => {}),
        broker0.election.resign().catch(() => {}),
      ])

      await broker1.election.waitForCampaignState(CampaignState.Leading);

      assert.equal(broker0.election.isLeading(), false);
      assert.equal(broker1.election.isLeading(), true);

      let strings = await etcd3.getAll().prefix('election').strings();
      assert.deepEqual(Object.values(strings), ['other', 'self']);

      // Clean up
      await broker1.detach();
    })

    it('Retries campaigning on no connection');
  })

  describe('detach()', () => {
    before(() => broker0.attach());

    it('Stops campaigning', async () => {
      await broker0.detach();

      assert.equal(broker0.election.isIdle(), true);
    })
  })

  describe('is_leader()', () => {
    before(async () => {
      await broker0.attach();
      await broker1.attach();
    });
    after(async () => {
      await broker0.detach();
      await broker1.detach();
    });

    it('Returns wether broker is leader', () => {
      assert.equal(broker0.is_leader(), true);
      assert.equal(broker1.is_leader(), false);
    })
  })
}) 
