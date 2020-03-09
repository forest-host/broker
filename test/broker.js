
import { Broker } from '../src/index.js'
import { assert } from 'chai';
import { CampaignState } from '@forest.host/etcd3';

const broker = new Broker({
  // Speed it up
  timeout: 1,
});

describe('Broker', () => {
  describe('attach()', () => {
    before(() => broker.attach());
    after(() => broker.detach());

    it('Starts campaigning', () => {
      assert.equal(broker.election.isLeading(), true);
    });

    it('Recampaigns on resignation', async () => {
      await broker.election.resign();

      await broker.election.waitForCampaignState(CampaignState.Leading);

      assert.equal(broker.election.isLeading(), true);
    })

    it('Retries campaigning on no connection');
  })

  describe('detach()', () => {
    before(() => broker.attach());

    it('Stops campaigning', async () => {
      await broker.detach();

      assert.equal(broker.election.isIdle(), true);
    })
  })
})
