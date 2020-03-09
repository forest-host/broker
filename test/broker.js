
import { Broker } from '../src/index.js'
import { assert } from 'chai';
import { CampaignState } from '@forest.host/etcd3';

const create_broker = value => {
  let config = {
    queue: 'default',
    timeout: 1,
    verbosity: 0,
  };
  if(value) { config.campaign = { value } }

  return new Broker(config);
}

const broker0 = create_broker();
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
